// TÉMOIN du juge routes-acquisition-qa (026-037) : la route de la vigie Meta telle que 026-077 la décrit. Jamais servie
// par Presti ; le juge l'exécute avec ses doublures pour prouver qu'il sait être vert (et chaque sabotage la casse).
import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerVigie } from '@/lib/agents/acquisition/vigieMeta'
import { recuperateurReseau } from '@/lib/agents/acquisition/recuperateur'
import { enregistrerPassage, envoyerAlertes } from '@/lib/alertes'
import { battement, echeanceAgent, evenementAjouter, evenementsLire } from '@/lib/agents/bus'
import { consommerLimite } from '@/lib/limites'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AGENT = 'vigie_meta'
const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

async function lireJeton(): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_jeton_meta')
    if (error) return null
    return (Array.isArray(data) ? data[0]?.jeton : data?.jeton) ?? null
  } catch { return null }
}

async function lireEcheance(jeton: string): Promise<void> {
  try {
    const deja = await evenementsLire({ p_agent: AGENT, p_type: 'echeance_lue', p_jour: jourParis() })
    if (deja.ok && Array.isArray(deja.data) && deja.data.length) return
    const u = new URL('https://graph.facebook.com/debug_token')
    u.searchParams.set('input_token', jeton)
    u.searchParams.set('access_token', jeton)
    const r = await fetch(u, { signal: AbortSignal.timeout(10_000) })
    if (!r.ok) return
    const j = await r.json()
    const exp = Number(j?.data?.expires_at ?? Number.NaN)
    if (!Number.isFinite(exp)) return
    await echeanceAgent({ p_nom: AGENT, p_expire_le: exp > 0 ? new Date(exp * 1000).toISOString() : null })
    await evenementAjouter({ p_agent: AGENT, p_type: 'echeance_lue', p_resume: exp > 0 ? 'échéance du jeton lue' : 'jeton sans expiration' })
  } catch { /* l'échéance déjà posée reste ; le veilleur prévient toujours à J-7 */ }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const p = await pauseGenerale()
  if (p.active) return NextResponse.json({ pause: true, source: p.source })
  if (await magasinSupabase.enPause(AGENT)) return NextResponse.json({ pause: true })
  const echeance = Date.now() + 45_000
  try {
    const jeton = await lireJeton()
    const budget = { prendre: () => consommerLimite('meta:ads_archive', 150, 3600) }
    const horloge = { maintenant: () => Date.now(), attendre: (ms: number) => new Promise((r) => setTimeout(r, ms)) }
    const artisan = await executerVigie({ jeton, cible: 'artisan', magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, budget })
    const marque = await executerVigie({ jeton, cible: 'marque', magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, budget })
    const etats = [artisan?.etat, marque?.etat]
    const bloquant = etats.find((e) => e === 'jeton_invalide' || e === 'en_attente_identite')
    if (bloquant) {
      await enregistrerPassage('acq-vigie-meta', { etat: bloquant }, false)
      await envoyerAlertes([{ motif: 'jeton_externe', a: 'entreprise', cle: `jeton_externe:meta:${jourParis()}`, sujet: 'Jeton Meta à renouveler', corps: 'Générer un nouveau jeton Meta, le coller dans presti-secrets/meta-bibliotheque-pubs.txt et dire « collé » : Claude Code le pose.' }])
      return NextResponse.json({ ok: false, etat: bloquant })
    }
    const bilan = { artisan: artisan?.etat ?? null, marque: marque?.etat ?? null, candidats: (artisan?.candidats ?? 0) + (marque?.candidats ?? 0), limite: etats.includes('limite') ? 1 : 0 }
    await enregistrerPassage('acq-vigie-meta', bilan, true)
    const b = await battement(AGENT)
    if (!b?.ok) console.error('[cron/vigie-meta] battement refusé')
    if (jeton) await lireEcheance(jeton)
    return NextResponse.json({ ok: true, bilan })
  } catch (e) {
    await enregistrerPassage('acq-vigie-meta', { erreur: String(e instanceof Error ? e.message : e).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
