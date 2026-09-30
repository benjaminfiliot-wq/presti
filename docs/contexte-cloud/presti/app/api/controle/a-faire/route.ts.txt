import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { sourcer, euros } from '@/lib/direction/fraicheur'
import { echecsRecents } from '@/lib/direction/stripe'
import { CRONS_ATTENDUS } from '@/lib/alertes'
import { erreursFabrication, type Brouillon } from '@/lib/siteCommande'
import { heuresOuvreesEntre } from '@/lib/siteLivraison'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/a-faire — la file des actions qui attendent Benj (prompt v10 §2.1). Une ligne porte SON
// action quand elle en a une — jamais un lien vers un autre outil, jamais un bouton vers une route qui n'existe
// pas encore (revue du 07/09 : la relance d'un paiement arrive avec l'onglet Clients, au J2).
// J1 : paiements échoués (Stripe), alertes non acquittées, tâches planifiées en retard ou en échec.
// J3 (emails > 24 h) et J4 (obligations, factures fournisseurs) s'ajoutent ici — pas avant d'exister.
//
// Aucun cache sur nos propres tables : une alerte acquittée doit disparaître au rafraîchissement suivant.
// `methode: 'GET'` veut dire OUVRIR, pas exécuter : l'écran suit le lien au lieu de poster. C'est le
// seul geste sensé devant une facture impayée — la relance se décide en la regardant, pas en cliquant.
export type Action = { libelle: string; route: string; methode: 'POST' | 'DELETE' | 'GET'; corps?: Record<string, unknown>; reconfirmation: boolean; portee?: string }
export type Ligne = { id: string; type: 'paiement' | 'alerte' | 'cron' | 'commande'; libelleType: string; gravite: 'info' | 'attention' | 'critique'; libelle: string; detail: string; a: string; source: string; action?: Action }

const LIBELLES_TYPE = { paiement: 'Paiement', alerte: 'Alerte', cron: 'Tâche', commande: 'Site' } as const
/** Le nom des tâches planifiées, en français — pas leur identifiant technique. */
const NOMS_CRON: Record<string, string> = { relances: 'Relances de devis', 'canaux-relever': 'Relève des boîtes email', alertes: 'Ronde des alertes', 'purges-rgpd': 'Purges RGPD', tic: 'Horloge des agents', livraison: 'Livraison des sites' }

const commandesEnAttente = () => sourcer('afaire:commandes', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('sites_commandes')
    .select('id, artisan_id, etat, paye_le, genere_le, valide_le, en_ligne_le, search_console_le, domaine_mode, domaine, metier, communes, matiere')
    .in('etat', ['payee', 'generee', 'validee', 'en_ligne']).limit(500)
  if (error) throw new Error(error.message)
  return data ?? []
})

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
  const [echecs, alertes, crons, commandes] = await Promise.all([echecsRecents(), alertesOuvertes(), cronsEnRetard(), commandesEnAttente()])
  const lignes: Ligne[] = []
  for (const e of echecs.valeur ?? []) lignes.push({
    id: `paiement:${e.id}`, type: 'paiement', libelleType: LIBELLES_TYPE.paiement, gravite: 'critique',
    libelle: `Paiement échoué${e.client ? ` — ${e.client}` : ''}`,
    detail: `${euros(e.montant)} · ${e.tentatives} tentative${e.tentatives > 1 ? 's' : ''}`, a: e.depuis, source: 'stripe',
    // Le geste utile devant un paiement échoué, c'est d'ouvrir la fiche du client : de là partent la
    // relance, le changement d'offre et le message. Une ligne sans geste ne descend jamais.
    // La facture hébergée par Stripe porte tout : le montant, les tentatives, le moyen de paiement
    // et le bouton de relance. C'est là qu'on va, plutôt que de recoder une relance à moitié.
    action: { libelle: e.lien ? 'Ouvrir la facture' : 'Voir les clients', route: e.lien ?? '/controle?onglet=clients', methode: 'GET', reconfirmation: false },
  })
  for (const a of alertes.valeur ?? []) lignes.push({
    id: `alerte:${a.id}`, type: 'alerte', libelleType: LIBELLES_TYPE.alerte, gravite: (a.gravite as Ligne['gravite']) ?? 'attention',
    libelle: a.sujet, detail: (a.corps ?? '').split('\n')[0].slice(0, 160), a: a.cree_le, source: 'supabase',
    action: { libelle: 'Acquitter', route: `/api/controle/alertes/${a.id}/acquitter`, methode: 'POST', reconfirmation: false },
  })
  // Le détail d'un passage est un objet : le coller dans une phrase donnait « · [object Object] »
  // à l'écran (constaté le 07/09). On le met en forme, en gardant ce qui parle et rien d'autre.
  const detailLisible = (d: unknown): string => {
    if (d == null) return ''
    if (typeof d === 'string') return d
    if (typeof d !== 'object') return String(d)
    const paires = Object.entries(d as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== '' && v !== 0 && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}`)
    return paires.join(' · ').slice(0, 200)
  }
  for (const c of crons.valeur ?? []) {
    const detail = detailLisible(c.detail)
    lignes.push({
      id: `cron:${c.nom}`, type: 'cron', libelleType: LIBELLES_TYPE.cron, gravite: c.reussi === false ? 'critique' : 'attention',
      libelle: `${NOMS_CRON[c.nom] ?? c.nom} : ${c.reussi === false ? 'en échec' : 'aucun passage récent'}`,
      detail: c.dernier ? `dernier passage ${new Date(c.dernier).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}${detail ? ` · ${detail}` : ''}` : 'aucun passage enregistré',
      a: c.dernier ?? new Date().toISOString(), source: 'supabase',
      // Devant une tâche en échec, le geste est de la relancer. Le secret de cron reste au serveur :
      // c'est un secret de machine à machine, il n'a rien à faire dans un navigateur.
      action: { libelle: 'Relancer', route: `/api/controle/crons/${c.nom}/relancer`, methode: 'POST', reconfirmation: false },
    })
  }
  const idsArtisans = [...new Set((commandes.valeur ?? []).map((c) => c.artisan_id).filter(Boolean))] as string[]
  const { data: artisans } = idsArtisans.length
    ? await supabaseAdmin.from('artisans').select('id, nom').in('id', idsArtisans)
    : { data: [] }
  const noms = new Map((artisans ?? []).map((a) => [a.id, a.nom]))
  const maintenant = new Date()
  for (const c of commandes.valeur ?? []) {
    const origine = c.etat === 'payee' ? c.paye_le : c.etat === 'generee' ? c.genere_le : c.etat === 'validee' ? c.valide_le : c.en_ligne_le
    if (!origine) continue
    const heures = heuresOuvreesEntre(new Date(origine), maintenant)
    let libelle: string
    let detail = noms.get(c.artisan_id ?? '') ?? 'Artisan'
    let route = '/controle?onglet=sites'
    if (c.etat === 'payee') {
      if (heures <= 24) continue
      if (erreursFabrication(c as unknown as Brouillon).length) {
        libelle = 'Appeler l’artisan : dossier incomplet'
        route = c.artisan_id ? `/controle?onglet=clients&client=${c.artisan_id}` : '/controle?onglet=clients'
      } else {
        libelle = 'Générer le site'
        detail += ` · node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs ${c.id}`
      }
    } else if (c.etat === 'generee') libelle = 'Relire et mettre en ligne'
    else if (c.etat === 'validee') libelle = 'Mettre en ligne'
    else {
      if (c.search_console_le || (Date.now() - new Date(c.en_ligne_le).getTime()) < 86_400_000) continue
      libelle = 'Soumettre le plan du site à la Search Console'
    }
    lignes.push({ id: `commande:${c.id}`, type: 'commande', libelleType: LIBELLES_TYPE.commande,
      gravite: c.valide_le && heuresOuvreesEntre(new Date(c.valide_le), maintenant) > 48 ? 'critique' : 'attention',
      libelle, detail, a: origine, source: 'supabase',
      action: { libelle: 'Ouvrir', route, methode: 'GET', reconfirmation: false } })
  }
  const ordre = { critique: 0, attention: 1, info: 2 }
  lignes.sort((x, y) => ordre[x.gravite] - ordre[y.gravite] || y.a.localeCompare(x.a))
  const sources = { stripe: { a: echecs.a, erreur: echecs.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur }, commandes: { a: commandes.a, erreur: commandes.erreur } }
  return NextResponse.json({ lignes, sources, role: f.role, a: new Date().toISOString() })
}
