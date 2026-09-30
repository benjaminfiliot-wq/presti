import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { sourcer } from '@/lib/direction/fraicheur'
import { evenementsRecents } from '@/lib/direction/stripe'
import { planConf } from '@/lib/plans'
import { seulsLesVrais } from '@/lib/direction/perimetre'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/fil — les 20 derniers événements de l'entreprise (prompt v10 §2.1), fusionnés :
// journal de direction, nouveaux artisans (nom + offre, jamais l'email d'un prospect), Stripe, alertes, tâches.
export type Evenement = { id: string; type: 'journal' | 'artisan' | 'stripe' | 'alerte' | 'cron'; libelleType: string; a: string; libelle: string; detail: string | null; onglet: string | null; source: string }
const LIBELLES_TYPE = { journal: 'Direction', artisan: 'Artisan', stripe: 'Paiement', alerte: 'Alerte', cron: 'Tâche' } as const
const NOMS_CRON: Record<string, string> = { relances: 'Relances de devis', 'canaux-relever': 'Relève des boîtes email', alertes: 'Ronde des alertes', 'purges-rgpd': 'Purges RGPD' }

const LIBELLES_JOURNAL: Record<string, string> = {
  reconfirmation: 'Re-confirmation', ban_ip: 'IP bannie', deban_ip: 'IP débannie', alerte_acquittee: 'Alerte acquittée',
  reglage_modifie: 'Réglage modifié', role_modifie: 'Rôle modifié',
}

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'journal', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const [journal, artisans, stripe, alertes, crons] = await Promise.all([
    sourcer('fil:journal', 'supabase', async () => {
      // Même règle que le journal : le partenaire suit ses propres actions (v11 §5).
      let q = supabaseAdmin.from('journal_direction').select('id, action, acteur_email, cible_id, cree_le')
        .not('acteur_email', 'like', '[EMAIL_MASQUE]')
        .order('cree_le', { ascending: false }).limit(20)
      if (perimetre.borne) q = q.eq('acteur_id', f.uid)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data ?? []
    }),
    sourcer('fil:artisans', 'supabase', async () => {
      const { data, error } = await seulsLesVrais(supabaseAdmin.from('artisans').select('id, nom, metier, plan, created_at'))
        .order('created_at', { ascending: false }).limit(10)
      if (error) throw new Error(error.message)
      return data ?? []
    }),
    evenementsRecents(),
    sourcer('fil:alertes', 'supabase', async () => {
      const { data, error } = await supabaseAdmin.from('alertes').select('id, motif, sujet, gravite, cree_le, acquittee_le').order('cree_le', { ascending: false }).limit(10)
      if (error) throw new Error(error.message)
      return data ?? []
    }),
    sourcer('fil:crons', 'supabase', async () => {
      const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi')
      if (error) throw new Error(error.message)
      return data ?? []
    }),
  ])
  const ev: Evenement[] = []
  for (const j of journal.valeur ?? []) ev.push({ id: `j:${j.id}`, type: 'journal', libelleType: LIBELLES_TYPE.journal, a: j.cree_le, libelle: LIBELLES_JOURNAL[j.action] ?? j.action, detail: j.acteur_email ?? 'fondateur', onglet: 'journal', source: 'supabase' })
  for (const a of artisans.valeur ?? []) ev.push({ id: `a:${a.id}`, type: 'artisan', libelleType: LIBELLES_TYPE.artisan, a: a.created_at, libelle: `Nouvel artisan : ${a.nom || a.metier || 'sans nom'}`, detail: `${planConf(a.plan).label}${a.metier ? ` · ${a.metier}` : ''}`, onglet: null, source: 'supabase' })
  for (const s of stripe.valeur ?? []) ev.push({ id: `s:${s.id}`, type: 'stripe', libelleType: LIBELLES_TYPE.stripe, a: s.a, libelle: s.libelle, detail: s.objet, onglet: null, source: 'stripe' })
  for (const al of alertes.valeur ?? []) ev.push({ id: `al:${al.id}`, type: 'alerte', libelleType: LIBELLES_TYPE.alerte, a: al.cree_le, libelle: `Alerte : ${al.sujet}`, detail: al.acquittee_le ? 'acquittée' : al.gravite, onglet: null, source: 'supabase' })
  for (const c of crons.valeur ?? []) ev.push({ id: `c:${c.nom}`, type: 'cron', libelleType: LIBELLES_TYPE.cron, a: c.dernier_passage, libelle: `${NOMS_CRON[c.nom] ?? c.nom} : ${c.reussi ? 'passée' : 'en échec'}`, detail: null, onglet: null, source: 'supabase' })
  ev.sort((x, y) => y.a.localeCompare(x.a))
  const sources = { journal: { a: journal.a, erreur: journal.erreur }, artisans: { a: artisans.a, erreur: artisans.erreur }, stripe: { a: stripe.a, erreur: stripe.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur } }
  return NextResponse.json({ evenements: ev.slice(0, 20), sources, role: f.role, a: new Date().toISOString() })
}
