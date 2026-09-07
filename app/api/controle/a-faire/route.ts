import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { sourcer, euros } from '@/lib/direction/fraicheur'
import { echecsRecents } from '@/lib/direction/stripe'
import { CRONS_ATTENDUS } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/a-faire — la file des actions qui attendent Benj (prompt v10 §2.1). Une ligne porte SON
// action quand elle en a une — jamais un lien vers un autre outil, jamais un bouton vers une route qui n'existe
// pas encore (revue du 07/09 : la relance d'un paiement arrive avec l'onglet Clients, au J2).
// J1 : paiements échoués (Stripe), alertes non acquittées, tâches planifiées en retard ou en échec.
// J3 (emails > 24 h) et J4 (obligations, factures fournisseurs) s'ajoutent ici — pas avant d'exister.
//
// Aucun cache sur nos propres tables : une alerte acquittée doit disparaître au rafraîchissement suivant.
export type Action = { libelle: string; route: string; methode: 'POST' | 'DELETE'; corps?: Record<string, unknown>; reconfirmation: boolean; portee?: string }
export type Ligne = { id: string; type: 'paiement' | 'alerte' | 'cron'; libelleType: string; gravite: 'info' | 'attention' | 'critique'; libelle: string; detail: string; a: string; source: string; action?: Action }

const LIBELLES_TYPE = { paiement: 'Paiement', alerte: 'Alerte', cron: 'Tâche' } as const
/** Le nom des tâches planifiées, en français — pas leur identifiant technique. */
const NOMS_CRON: Record<string, string> = { relances: 'Relances de devis', 'canaux-relever': 'Relève des boîtes email', alertes: 'Ronde des alertes', 'purges-rgpd': 'Purges RGPD' }

const alertesOuvertes = () => sourcer('afaire:alertes', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('alertes').select('id, motif, gravite, sujet, corps, cree_le').is('acquittee_le', null).order('cree_le', { ascending: false }).limit(30)
  if (error) throw new Error(error.message)
  return data ?? []
})

const cronsEnRetard = () => sourcer('afaire:crons', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi, detail')
  if (error) throw new Error(error.message)
  return CRONS_ATTENDUS.map((c) => {
    const p = (data ?? []).find((x) => x.nom === c.nom)
    const age = p ? (Date.now() - new Date(p.dernier_passage).getTime()) / 3_600_000 : null
    return { nom: c.nom, dernier: p?.dernier_passage ?? null, reussi: p?.reussi ?? null, detail: (p as { detail?: string } | undefined)?.detail ?? null, enRetard: age === null || age > c.maxHeures }
  }).filter((x) => x.enRetard || x.reussi === false)
})

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'sante', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const [echecs, alertes, crons] = await Promise.all([echecsRecents(), alertesOuvertes(), cronsEnRetard()])
  const lignes: Ligne[] = []
  for (const e of echecs.valeur ?? []) lignes.push({
    id: `paiement:${e.id}`, type: 'paiement', libelleType: LIBELLES_TYPE.paiement, gravite: 'critique',
    libelle: `Paiement échoué${e.client ? ` — ${e.client}` : ''}`,
    detail: `${euros(e.montant)} · ${e.tentatives} tentative${e.tentatives > 1 ? 's' : ''}`, a: e.depuis, source: 'stripe',
  })
  for (const a of alertes.valeur ?? []) lignes.push({
    id: `alerte:${a.id}`, type: 'alerte', libelleType: LIBELLES_TYPE.alerte, gravite: (a.gravite as Ligne['gravite']) ?? 'attention',
    libelle: a.sujet, detail: (a.corps ?? '').split('\n')[0].slice(0, 160), a: a.cree_le, source: 'supabase',
    action: { libelle: 'Acquitter', route: `/api/controle/alertes/${a.id}/acquitter`, methode: 'POST', reconfirmation: false },
  })
  for (const c of crons.valeur ?? []) lignes.push({
    id: `cron:${c.nom}`, type: 'cron', libelleType: LIBELLES_TYPE.cron, gravite: c.reussi === false ? 'critique' : 'attention',
    libelle: `${NOMS_CRON[c.nom] ?? c.nom} : ${c.reussi === false ? 'en échec' : 'aucun passage récent'}`,
    detail: c.dernier ? `dernier passage ${new Date(c.dernier).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}${c.detail ? ` · ${c.detail}` : ''}` : 'aucun passage enregistré',
    a: c.dernier ?? new Date().toISOString(), source: 'supabase',
  })
  const ordre = { critique: 0, attention: 1, info: 2 }
  lignes.sort((x, y) => ordre[x.gravite] - ordre[y.gravite] || y.a.localeCompare(x.a))
  const sources = { stripe: { a: echecs.a, erreur: echecs.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur } }
  return NextResponse.json({ lignes, sources, role: f.role, a: new Date().toISOString() })
}
