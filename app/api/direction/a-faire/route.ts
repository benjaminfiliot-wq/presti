import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { sourcer } from '@/lib/direction/fraicheur'
import { echecsRecents } from '@/lib/direction/stripe'
import { CRONS_ATTENDUS } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/direction/a-faire — la file des actions qui attendent Benj (prompt v10 §2.1). Chaque ligne porte SON
// action (route, méthode, corps, re-confirmation ou non) — jamais un lien vers un autre outil.
// J1 : paiements échoués (Stripe), alertes non acquittées, tâches planifiées en retard ou en échec.
// J3 (emails > 24 h) et J4 (obligations, factures fournisseurs) s'ajoutent ici — pas avant d'exister.
export type Action = { libelle: string; route: string; methode: 'POST' | 'DELETE' | 'GET'; corps?: Record<string, unknown>; reconfirmation: boolean; portee?: string; externe?: string | null }
export type Ligne = { id: string; type: 'paiement' | 'alerte' | 'cron'; gravite: 'info' | 'attention' | 'critique'; libelle: string; detail: string; a: string; source: string; action: Action }

const alertesOuvertes = () => sourcer('afaire:alertes', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('alertes').select('id, motif, gravite, sujet, corps, cree_le').is('acquittee_le', null).order('cree_le', { ascending: false }).limit(30)
  if (error) throw new Error(error.message)
  return data ?? []
}, 15_000)

const cronsEnRetard = () => sourcer('afaire:crons', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi, detail')
  if (error) throw new Error(error.message)
  return CRONS_ATTENDUS.map((c) => {
    const p = (data ?? []).find((x) => x.nom === c.nom)
    const age = p ? (Date.now() - new Date(p.dernier_passage).getTime()) / 3_600_000 : null
    return { nom: c.nom, dernier: p?.dernier_passage ?? null, reussi: p?.reussi ?? null, detail: (p as { detail?: string } | undefined)?.detail ?? null, enRetard: age === null || age > c.maxHeures }
  }).filter((x) => x.enRetard || x.reussi === false)
}, 30_000)

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const [echecs, alertes, crons] = await Promise.all([echecsRecents(), alertesOuvertes(), cronsEnRetard()])
  const lignes: Ligne[] = []
  for (const e of echecs.valeur ?? []) lignes.push({
    id: `paiement:${e.id}`, type: 'paiement', gravite: 'critique', libelle: `Paiement échoué${e.client ? ` — ${e.client}` : ''}`,
    detail: `${e.montant.toFixed(2).replace('.', ',')} € · ${e.tentatives} tentative${e.tentatives > 1 ? 's' : ''}`, a: e.depuis, source: 'stripe',
    action: { libelle: 'Voir la facture', route: `/api/direction/paiements/${e.id}`, methode: 'GET', reconfirmation: false, externe: e.lien },
  })
  for (const a of alertes.valeur ?? []) lignes.push({
    id: `alerte:${a.id}`, type: 'alerte', gravite: (a.gravite as Ligne['gravite']) ?? 'attention', libelle: a.sujet, detail: (a.corps ?? '').split('\n')[0].slice(0, 160), a: a.cree_le, source: 'supabase',
    action: { libelle: 'Acquitter', route: `/api/direction/alertes/${a.id}/acquitter`, methode: 'POST', reconfirmation: false },
  })
  for (const c of crons.valeur ?? []) lignes.push({
    id: `cron:${c.nom}`, type: 'cron', gravite: c.reussi === false ? 'critique' : 'attention', libelle: `Tâche « ${c.nom} » ${c.reussi === false ? 'en échec' : 'muette'}`,
    detail: c.dernier ? `dernier passage ${new Date(c.dernier).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}${c.detail ? ` · ${c.detail}` : ''}` : 'aucun passage enregistré', a: c.dernier ?? new Date().toISOString(), source: 'supabase',
    // J1 : informatif (le détail est dans le bandeau d'état) ; le relancement à la main arrive avec l'onglet Santé (J5)
    action: { libelle: 'Détail', route: '/api/direction/etat', methode: 'GET', reconfirmation: false },
  })
  const ordre = { critique: 0, attention: 1, info: 2 }
  lignes.sort((x, y) => ordre[x.gravite] - ordre[y.gravite] || y.a.localeCompare(x.a))
  const sources = { stripe: { a: echecs.a, erreur: echecs.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur } }
  return NextResponse.json({ lignes, sources, role: f.role, a: new Date().toISOString() })
}
