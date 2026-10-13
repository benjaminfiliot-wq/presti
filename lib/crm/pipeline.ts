// CRM — le pipeline : Demande → Devis envoyé → Signé → Chantier → À facturer → Payé. Module pur (le seul import est un
// autre module pur) : des lignes en entrée, des colonnes en sortie ; rejoué par scripts/crm-qa.mjs.
//
// La colonne d'un dossier se DÉDUIT des vrais statuts — jamais d'un champ « étape » que quelqu'un aurait oublié de mettre
// à jour :
//   • un devis refusé ou expiré, une demande classée « perdu » : hors pipeline (« classé ») ;
//   • devis signé (`accepte`) :
//       – factures (émises ou payées, hors annulées et avoirs) couvrant tout le devis ET toutes réglées → Payé ;
//       – factures couvrant tout le devis, pas toutes réglées → À facturer (facturé, règlement attendu) ;
//       – sinon, chantier terminé → À facturer ; chantier existant (hors annulé) → Chantier ; sinon → Signé.
//     Une facture d'ACOMPTE ne couvre pas le devis : le dossier reste en Chantier (ou Signé) tant que le solde n'est pas
//     facturé. « Couvrir » se compare au centime, en entiers ;
//   • devis envoyé → Devis envoyé ; brouillon → Demande ;
//   • une demande sans aucun devis → Demande (ou Signé si l'artisan l'a marquée gagnée) ;
//   • un chantier sans devis (petit dépannage) : terminé → À facturer, annulé → classé, sinon → Chantier.
//
// Le déplacement MANUEL (POST /api/crm/pipeline) est journalisé (crm_journal, champ 'etape') avec la colonne que les vrais
// statuts donnaient à cet instant. Il ne vaut que tant que ces statuts n'ont pas bougé : dès que la colonne déduite change
// (devis signé, facture payée…), la réalité reprend la main. Jamais l'inverse : un geste à la main ne masque pas un
// paiement arrivé depuis.
//
// Recette du 12/10 : deux devis BROUILLONS pour le même client (la v1 puis la v2 d'un même chiffrage) faisaient deux cartes
// et la colonne Demande additionnait les deux montants. Les brouillons d'un même client (même demande, sinon même e-mail,
// sinon même nom) ne font plus qu'UNE carte : le plus récent, qui dit combien de brouillons plus anciens il cache. Un devis
// ENVOYÉ, lui, compte toujours pour lui-même.
import { facturesComptees, type FacturePresti } from '../comptaTableau.ts'
import { cleEmail, cleNom } from './clients.ts'

export const ETAPES = ['demande', 'devis_envoye', 'signe', 'chantier', 'a_facturer', 'paye'] as const
export type Etape = (typeof ETAPES)[number]
export type EtapeOuClasse = Etape | 'classe'
export const LIBELLES_ETAPES: Record<EtapeOuClasse, string> = {
  demande: 'Demande', devis_envoye: 'Devis envoyé', signe: 'Signé', chantier: 'Chantier', a_facturer: 'À facturer / encaisser', paye: 'Payé', classe: 'Classé',
}

export type Nombre = number | string | null | undefined
export type LeadP = { id: string; artisan_id?: string | null; statut?: string | null; nom_prospect?: string | null; type_chantier?: string | null; created_at?: string | null }
export type DevisP = {
  id: string; artisan_id?: string | null; lead_id?: string | null; statut?: string | null; numero?: string | null; objet?: string | null
  client_nom?: string | null; client_email?: string | null; total_ttc?: Nombre; created_at?: string | null; envoye_le?: string | null; accepte_le?: string | null
}
export type FactureP = FacturePresti
export type ChantierP = { id: string; artisan_id?: string | null; devis_id?: string | null; statut?: string | null; titre?: string | null; client_nom?: string | null; cree_le?: string | null }
export type DeplacementP = { objet: string; objet_id: string; vers?: string | null; etape_derivee?: string | null; cree_le?: string | null }

export type Preuve =
  | 'devis_refuse' | 'demande_perdue' | 'paye' | 'facture_impayee' | 'chantier_termine' | 'chantier' | 'devis_signe'
  | 'devis_envoye' | 'devis_brouillon' | 'demande' | 'demande_gagnee' | 'chantier_annule'

export const LIBELLES_PREUVE: Record<Preuve, string> = {
  devis_refuse: 'devis refusé ou expiré', demande_perdue: 'demande classée sans suite', paye: 'factures réglées',
  facture_impayee: 'facturé, règlement attendu', chantier_termine: 'chantier terminé, pas encore facturé', chantier: 'chantier ouvert',
  devis_signe: 'devis signé', devis_envoye: 'devis envoyé', devis_brouillon: 'devis en brouillon', demande: 'demande reçue',
  demande_gagnee: 'demande marquée gagnée', chantier_annule: 'chantier annulé',
}

export type Carte = {
  /** « devis:<id> », « lead:<id> » ou « chantier:<id> ». */
  cle: string
  objet: 'devis' | 'lead' | 'chantier'
  id: string
  titre: string
  client: string | null
  /** Montant du devis en centimes ; null sans devis. */
  montant: number | null
  etapeDerivee: EtapeOuClasse
  etape: EtapeOuClasse
  manuel: boolean
  preuve: Preuve
  devisId: string | null
  leadId: string | null
  chantierId: string | null
  /** Le dernier fait daté du dossier (ISO) ; sert au tri dans la colonne. */
  depuis: string | null
  /** Brouillons plus anciens du même client, cachés derrière cette carte (comptés une seule fois). */
  autresBrouillons: number
}

export type Colonne = { etape: Etape; libelle: string; cartes: Carte[]; montant: number }
export type Pipeline = { colonnes: Colonne[]; classes: number; vide: boolean }

const centimes = (v: Nombre): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : null)
const duMien = <T extends { artisan_id?: string | null }>(l: readonly T[] | null | undefined, a: string): T[] =>
  a ? (Array.isArray(l) ? l : []).filter((x) => !!x && x.artisan_id === a) : []

/** La colonne d'un devis signé, d'après ses factures et son chantier. */
export function etapeDevisSigne(totalTtc: Nombre, factures: readonly FactureP[], chantier: ChantierP | null): { etape: EtapeOuClasse; preuve: Preuve } {
  const du = centimes(totalTtc)
  let facture = 0, regle = 0
  for (const f of factures) { const c = centimes(f.total_ttc); facture += c; if (f.statut === 'payee') regle += c }
  const couvre = du > 0 && facture >= du
  if (couvre && regle >= du) return { etape: 'paye', preuve: 'paye' }
  if (couvre) return { etape: 'a_facturer', preuve: 'facture_impayee' }
  if (chantier && chantier.statut === 'termine') return { etape: 'a_facturer', preuve: 'chantier_termine' }
  if (chantier && chantier.statut !== 'annule') return { etape: 'chantier', preuve: 'chantier' }
  return { etape: 'signe', preuve: 'devis_signe' }
}

export function etapeDevis(d: DevisP, lead: LeadP | null, factures: readonly FactureP[], chantier: ChantierP | null): { etape: EtapeOuClasse; preuve: Preuve } {
  const s = (d.statut ?? 'brouillon').toLowerCase()
  if (s === 'refuse' || s === 'expire') return { etape: 'classe', preuve: 'devis_refuse' }
  if (s === 'accepte') return etapeDevisSigne(d.total_ttc, factures, chantier)
  if (s === 'envoye') return { etape: 'devis_envoye', preuve: 'devis_envoye' }
  if ((lead?.statut ?? '') === 'perdu') return { etape: 'classe', preuve: 'demande_perdue' }
  return { etape: 'demande', preuve: 'devis_brouillon' }
}

export function etapeDemandeSeule(l: LeadP): { etape: EtapeOuClasse; preuve: Preuve } {
  const s = (l.statut ?? 'nouveau').toLowerCase()
  if (s === 'perdu') return { etape: 'classe', preuve: 'demande_perdue' }
  if (s === 'gagne') return { etape: 'signe', preuve: 'demande_gagnee' }
  return { etape: 'demande', preuve: 'demande' }
}

export function etapeChantierSeul(c: ChantierP): { etape: EtapeOuClasse; preuve: Preuve } {
  if (c.statut === 'annule') return { etape: 'classe', preuve: 'chantier_annule' }
  if (c.statut === 'termine') return { etape: 'a_facturer', preuve: 'chantier_termine' }
  return { etape: 'chantier', preuve: 'chantier' }
}

/**
 * Le déplacement manuel en vigueur pour un dossier : le PLUS RÉCENT, seulement s'il a été fait quand les vrais statuts
 * donnaient déjà la colonne d'aujourd'hui. `deplacements` : déjà filtrés sur l'artisan (lignes du journal, champ 'etape').
 */
export function deplacementEnVigueur(objet: string, id: string, derivee: EtapeOuClasse, deplacements: readonly DeplacementP[]): Etape | null {
  let dernier: DeplacementP | null = null
  for (const m of deplacements) {
    if (m.objet !== objet || m.objet_id !== id) continue
    if (!dernier || String(m.cree_le ?? '') > String(dernier.cree_le ?? '')) dernier = m
  }
  if (!dernier || dernier.etape_derivee !== derivee) return null
  return (ETAPES as readonly string[]).includes(String(dernier.vers)) ? (dernier.vers as Etape) : null
}

export type EntreesPipeline = {
  artisanId: string
  leads: readonly LeadP[]
  devis: readonly DevisP[]
  factures: readonly FactureP[]
  chantiers: readonly ChantierP[]
  deplacements: readonly (DeplacementP & { artisan_id?: string | null })[]
}

/** Toutes les cartes (classées comprises), une par dossier. */
export function cartes(e: EntreesPipeline): Carte[] {
  const leads = duMien(e.leads, e.artisanId)
  const devis = duMien(e.devis, e.artisanId)
  const chantiers = duMien(e.chantiers, e.artisanId)
  const deplacements = duMien(e.deplacements, e.artisanId)
  // Les factures qui comptent : ni brouillon, ni annulée, ni avoir (même règle que /chiffres, lib/comptaTableau.ts).
  const comptees = facturesComptees(duMien(e.factures, e.artisanId))
  const facturesParDevis = new Map<string, FactureP[]>()
  for (const f of comptees) if (f.devis_id) facturesParDevis.set(f.devis_id, [...(facturesParDevis.get(f.devis_id) ?? []), f])
  const chantierParDevis = new Map<string, ChantierP>()
  for (const c of chantiers) if (c.devis_id) chantierParDevis.set(c.devis_id, c)
  const leadParId = new Map(leads.map((l) => [l.id, l]))
  const leadsAvecDevis = new Set(devis.map((d) => d.lead_id).filter((x): x is string => !!x))

  const sortie: Carte[] = []
  const pousser = (c: Omit<Carte, 'etape' | 'manuel' | 'autresBrouillons'>) => {
    const manuel = c.etapeDerivee === 'classe' ? null : deplacementEnVigueur(c.objet, c.id, c.etapeDerivee, deplacements)
    sortie.push({ ...c, etape: manuel ?? c.etapeDerivee, manuel: manuel !== null && manuel !== c.etapeDerivee, autresBrouillons: 0 })
  }

  for (const d of devis) {
    const lead = d.lead_id ? leadParId.get(d.lead_id) ?? null : null
    const chantier = chantierParDevis.get(d.id) ?? null
    const factures = facturesParDevis.get(d.id) ?? []
    const { etape, preuve } = etapeDevis(d, lead, factures, chantier)
    const dates = [d.created_at, d.envoye_le, d.accepte_le, chantier?.cree_le, ...factures.map((f) => f.date_emission)].filter((x): x is string => typeof x === 'string')
    pousser({
      cle: `devis:${d.id}`, objet: 'devis', id: d.id,
      titre: texte(d.objet) ?? texte(chantier?.titre) ?? (texte(d.numero) ? `Devis ${texte(d.numero)}` : 'Devis sans objet'),
      client: texte(d.client_nom) ?? texte(lead?.nom_prospect),
      montant: centimes(d.total_ttc), etapeDerivee: etape, preuve,
      devisId: d.id, leadId: d.lead_id ?? null, chantierId: chantier?.id ?? null,
      depuis: dates.sort().at(-1) ?? null,
    })
  }
  for (const l of leads) {
    if (leadsAvecDevis.has(l.id)) continue
    const { etape, preuve } = etapeDemandeSeule(l)
    pousser({
      cle: `lead:${l.id}`, objet: 'lead', id: l.id,
      titre: texte(l.type_chantier) ?? 'Demande', client: texte(l.nom_prospect),
      montant: null, etapeDerivee: etape, preuve, devisId: null, leadId: l.id, chantierId: null, depuis: l.created_at ?? null,
    })
  }
  for (const c of chantiers) {
    if (c.devis_id && devis.some((d) => d.id === c.devis_id)) continue // déjà porté par la carte de son devis
    const { etape, preuve } = etapeChantierSeul(c)
    pousser({
      cle: `chantier:${c.id}`, objet: 'chantier', id: c.id, titre: texte(c.titre) ?? 'Chantier', client: texte(c.client_nom),
      montant: null, etapeDerivee: etape, preuve, devisId: null, leadId: null, chantierId: c.id, depuis: c.cree_le ?? null,
    })
  }
  return regrouperBrouillons(sortie, new Map(devis.map((d) => [d.id, d])))
}

/** Les brouillons d'un même client (en colonne Demande, non déplacés à la main) : une carte, la plus récente. */
function regrouperBrouillons(toutes: Carte[], devisParId: Map<string, DevisP>): Carte[] {
  const groupes = new Map<string, Carte[]>()
  for (const c of toutes) {
    if (c.objet !== 'devis' || c.preuve !== 'devis_brouillon' || c.etape !== 'demande' || c.manuel) continue
    const d = devisParId.get(c.id)
    const em = cleEmail(d?.client_email), nom = cleNom(c.client)
    const k = d?.lead_id ? `l:${d.lead_id}` : em ? `e:${em}` : nom ? `n:${nom}` : null
    if (k) groupes.set(k, [...(groupes.get(k) ?? []), c])
  }
  const caches = new Set<string>()
  for (const g of groupes.values()) {
    if (g.length < 2) continue
    const [recent, ...anciens] = [...g].sort((a, b) => String(b.depuis ?? '').localeCompare(String(a.depuis ?? '')) || b.cle.localeCompare(a.cle))
    recent.autresBrouillons = anciens.length
    for (const a of anciens) caches.add(a.cle)
  }
  return toutes.filter((c) => !caches.has(c.cle))
}

export function pipeline(e: EntreesPipeline): Pipeline {
  const toutes = cartes(e)
  const colonnes: Colonne[] = ETAPES.map((etape) => {
    const cs = toutes.filter((c) => c.etape === etape).sort((a, b) => String(b.depuis ?? '').localeCompare(String(a.depuis ?? '')) || a.cle.localeCompare(b.cle))
    return { etape, libelle: LIBELLES_ETAPES[etape], cartes: cs, montant: cs.reduce((s, c) => s + (c.montant ?? 0), 0) }
  })
  return { colonnes, classes: toutes.filter((c) => c.etape === 'classe').length, vide: toutes.length === 0 }
}
