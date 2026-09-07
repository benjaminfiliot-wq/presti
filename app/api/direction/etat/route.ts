import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { sourcer, type Sourcee } from '@/lib/direction/fraicheur'
import { joignable } from '@/lib/direction/stripe'
import { coutIADuMois, CRONS_ATTENDUS } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/direction/etat — le bandeau d'état (prompt v10 §2.1) : service OK / dégradé / incident.
// Chaque contrôle est sourcé et daté ; un contrôle qui ne peut pas être fait le dit (« non mesuré »), il ne
// compte pas comme vert.
export type Niveau = 'ok' | 'degrade' | 'incident'
export type Controle = { cle: string; libelle: string; etat: 'ok' | 'warn' | 'crit' | 'info'; detail: string; source: Sourcee<unknown>['source']; a: string; cache: boolean; manque?: string }

const sonde = (url: string) => sourcer(`etat:${url}`, 'app', async () => {
  const debut = Date.now()
  const r = await fetch(url, { cache: 'no-store', headers: { 'user-agent': 'presti-direction' }, signal: AbortSignal.timeout(8000) })
  return { status: r.status, ms: Date.now() - debut }
}, 30_000)

const domaineResend = () => sourcer('etat:resend', 'resend', async () => {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY absente')
  const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`Resend ${r.status}`)
  const j = (await r.json()) as { data?: { name: string; status: string }[] }
  const d = (j.data || []).find((x) => x.name === 'prestiapp.fr')
  return { statut: d?.status ?? 'absent' }
}, 60_000)

const crons = () => sourcer('etat:crons', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi')
  if (error) throw new Error(error.message)
  return CRONS_ATTENDUS.map((c) => {
    const p = (data ?? []).find((x) => x.nom === c.nom)
    const age = p ? (Date.now() - new Date(p.dernier_passage).getTime()) / 3_600_000 : null
    return { nom: c.nom, dernier: p?.dernier_passage ?? null, reussi: p?.reussi ?? null, enRetard: age === null || age > c.maxHeures }
  })
})

const ia = () => sourcer('etat:ia', 'anthropic', async () => {
  const c = await coutIADuMois()
  if (!c) return null
  if (c.erreur) throw new Error(c.erreur)
  const budget = Number(process.env.BUDGET_IA_MENSUEL_EUR)
  const taux = Number(process.env.TAUX_USD_EUR) || 0.92
  return { euros: Math.round(c.usd * taux * 100) / 100, budget: Number.isFinite(budget) && budget > 0 ? budget : null }
}, 5 * 60_000)

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  // La sonde suit le déploiement qui la sert : une préversion mesurait la production, et le disait « en ligne ».
  const origine = new URL(req.url).origin
  const [site, connexion, st, resend, cr, cout] = await Promise.all([sonde(`${origine}/`), sonde(`${origine}/login`), joignable(), domaineResend(), crons(), ia()])
  const controles: Controle[] = []
  const ajouter = (cle: string, libelle: string, s: Sourcee<unknown>, juger: (v: never) => { etat: Controle['etat']; detail: string }) => {
    if (s.manque) { controles.push({ cle, libelle, etat: 'info', detail: 'non mesuré', manque: s.manque, source: s.source, a: s.a, cache: s.cache }); return }
    if (s.erreur || s.valeur === null) { controles.push({ cle, libelle, etat: 'crit', detail: s.erreur ?? 'sans réponse', source: s.source, a: s.a, cache: s.cache }); return }
    const j = juger(s.valeur as never)
    controles.push({ cle, libelle, etat: j.etat, detail: j.detail, source: s.source, a: s.a, cache: s.cache })
  }
  ajouter('site', 'Site public', site, (v: { status: number; ms: number }) => ({ etat: v.status === 200 ? 'ok' : 'crit', detail: `HTTP ${v.status} en ${v.ms} ms` }))
  ajouter('connexion', 'Page de connexion', connexion, (v: { status: number; ms: number }) => ({ etat: v.status === 200 ? 'ok' : 'crit', detail: `HTTP ${v.status} en ${v.ms} ms` }))
  ajouter('stripe', 'Stripe', st, (v: { disponible: number; livemode: boolean }) => ({ etat: 'ok', detail: `joignable · solde disponible ${v.disponible.toFixed(2).replace('.', ',')} € · ${v.livemode ? 'réel' : 'test'}` }))
  ajouter('resend', 'Emails (Resend)', resend, (v: { statut: string }) => ({ etat: v.statut === 'verified' ? 'ok' : 'warn', detail: `domaine prestiapp.fr : ${v.statut}` }))
  ajouter('crons', 'Tâches planifiées', cr, (v: { nom: string; dernier: string | null; reussi: boolean | null; enRetard: boolean }[]) => {
    const retard = v.filter((x) => x.enRetard || x.reussi === false)
    return { etat: retard.length === 0 ? 'ok' : retard.length >= 2 ? 'crit' : 'warn', detail: retard.length ? `en retard ou en échec : ${retard.map((x) => x.nom).join(', ')}` : `${v.length} tâches passées à l’heure` }
  })
  if (cout.valeur === null && !cout.erreur) controles.push({ cle: 'ia', libelle: 'Budget IA', etat: 'info', detail: 'non mesuré', manque: 'clé Anthropic Admin absente', source: 'anthropic', a: cout.a, cache: false })
  else ajouter('ia', 'Budget IA', cout, (v: { euros: number; budget: number | null }) => ({ etat: v.budget ? (v.euros / v.budget >= 0.9 ? 'crit' : v.euros / v.budget >= 0.7 ? 'warn' : 'ok') : 'ok', detail: v.budget ? `${v.euros.toFixed(2).replace('.', ',')} € sur ${v.budget} €` : `${v.euros.toFixed(2).replace('.', ',')} € ce mois (aucun budget posé)` }))
  const niveau: Niveau = controles.some((c) => c.etat === 'crit' && ['site', 'connexion', 'stripe'].includes(c.cle)) ? 'incident' : controles.some((c) => c.etat === 'crit' || c.etat === 'warn') ? 'degrade' : 'ok'
  return NextResponse.json({ niveau, controles, role: f.role, a: new Date().toISOString() })
}
