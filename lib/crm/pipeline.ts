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
import { facturesComptees, jourParis } from '../comptaTableau.ts'
import { cleEmail, cleNom } from './clients.ts'
import { argentDossier, estAcompte, type FactureArgent } from './argent.ts'

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
  acompte_pct?: Nombre; date_emission?: string | null
}
export type FactureP = FactureArgent
export type ChantierP = {
  id: string; artisan_id?: string | null; devis_id?: string | null; statut?: string | null; titre?: string | null; client_nom?: string | null; cree_le?: string | null
  date_debut?: string | null; date_fin_reelle?: string | null
}
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
  /** Les sept pastilles du dossier (frise), calculées des mêmes statuts que la colonne. */
  frise: Frise
  /** Reste à encaisser sur ce dossier, en centimes (lib/crm/argent.ts) ; 0 sans devis. */
  aEncaisser: number
  /** Le prochain rappel ouvert du dossier (crm_rappels), posé par lib/crm/vue.ts ; absent sans rappel. */
  rappel?: { echeance: string; heure: string | null; type: string; retard: number }
}

export type Colonne = {
  etape: Etape; libelle: string; cartes: Carte[]; montant: number
  /** Somme des restes à encaisser des cartes de la colonne (lib/crm/argent.ts). */
  aEncaisser: number
}
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
  // Un centime d'écart par facture est toléré : l'arrondi de la TVA ligne à ligne (facture d'acompte puis de solde) peut laisser
  // la somme à 0,01 € du devis, et le dossier resterait « à facturer 0,01 € » pour toujours (même règle : lib/crm/argent.ts).
  const tol = factures.length
  const couvre = du > 0 && facture >= du - tol
  if (couvre && regle >= du - tol) return { etape: 'paye', preuve: 'paye' }
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
  const pousser = (c: Omit<Carte, 'etape' | 'manuel' | 'autresBrouillons' | 'frise' | 'aEncaisser'>, f: EntreeFrise) => {
    const manuel = c.etapeDerivee === 'classe' ? null : deplacementEnVigueur(c.objet, c.id, c.etapeDerivee, deplacements)
    const estManuel = manuel !== null && manuel !== c.etapeDerivee
    sortie.push({
      ...c, etape: manuel ?? c.etapeDerivee, manuel: estManuel, autresBrouillons: 0,
      frise: frise({ ...f, manuel: estManuel ? manuel : null }),
      aEncaisser: f.devis ? argentDossier(f.devis, f.factures).resteAEncaisser : 0,
    })
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
    }, { lead, devis: d, factures, chantier })
  }
  for (const l of leads) {
    if (leadsAvecDevis.has(l.id)) continue
    const { etape, preuve } = etapeDemandeSeule(l)
    pousser({
      cle: `lead:${l.id}`, objet: 'lead', id: l.id,
      titre: texte(l.type_chantier) ?? 'Demande', client: texte(l.nom_prospect),
      montant: null, etapeDerivee: etape, preuve, devisId: null, leadId: l.id, chantierId: null, depuis: l.created_at ?? null,
    }, { lead: l, devis: null, factures: [], chantier: null })
  }
  for (const c of chantiers) {
    if (c.devis_id && devis.some((d) => d.id === c.devis_id)) continue // déjà porté par la carte de son devis
    const { etape, preuve } = etapeChantierSeul(c)
    pousser({
      cle: `chantier:${c.id}`, objet: 'chantier', id: c.id, titre: texte(c.titre) ?? 'Chantier', client: texte(c.client_nom),
      montant: null, etapeDerivee: etape, preuve, devisId: null, leadId: null, chantierId: c.id, depuis: c.cree_le ?? null,
    }, { lead: null, devis: null, factures: [], chantier: c })
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
    return { etape, libelle: LIBELLES_ETAPES[etape], cartes: cs, montant: cs.reduce((s, c) => s + (c.montant ?? 0), 0), aEncaisser: cs.reduce((s, c) => s + c.aEncaisser, 0) }
  })
  return { colonnes, classes: toutes.filter((c) => c.etape === 'classe').length, vide: toutes.length === 0 }
}

// ── La FRISE d'un dossier : sept pastilles, Demande · Devis envoyé · Signé · Acompte · Chantier · Facturé · Payé ───────────
// Calculée des MÊMES lignes et des mêmes règles que la colonne (etapeDevis, lib/crm/argent.ts) : jamais un champ « étape » à
// tenir à jour. Les étapes ne sont pas strictement à la suite (un chantier commence parfois avant que l'acompte soit réglé) :
// chacune dit son propre état. Le dossier « classé » (devis refusé ou expiré, demande perdue) s'arrête à l'étape où il a
// cessé ; les suivantes ne s'appliquent plus. scripts/crm-qa.mjs vérifie que la frise et la colonne disent la même chose.
export const ETAPES_FRISE = ['demande', 'devis', 'signe', 'acompte', 'chantier', 'facture', 'paye'] as const
export type EtapeFrise = (typeof ETAPES_FRISE)[number]
export const LIBELLES_FRISE: Record<EtapeFrise, string> = {
  demande: 'Demande', devis: 'Devis envoyé', signe: 'Signé', acompte: 'Acompte', chantier: 'Chantier', facture: 'Facturé', paye: 'Payé',
}
/** fait (vert) · en_cours (corail) · a_venir (gris) · na (ne s'applique pas à ce dossier) · arrete (le dossier s'est arrêté là). */
export type EtatPastille = 'fait' | 'en_cours' | 'a_venir' | 'na' | 'arrete'
export type Pastille = {
  etape: EtapeFrise; libelle: string; etat: EtatPastille
  /** Le jour du fait (AAAA-MM-JJ, Paris), s'il est connu. */
  date: string | null
  /** Ce que l'artisan lit au toucher (sans la date, que l'écran ajoute). */
  detail: string
  /** La pièce derrière la pastille, sur un écran qui existe. */
  piece: { libelle: string; href: string } | null
}
export type ActionFrise = { etape: EtapeFrise; libelle: string; href: string | null; acompte?: { devisId: string; pct: number; montant: number } }
export type Frise = {
  pastilles: Pastille[]
  /** Le geste possible sur la première étape qui n'est pas faite (null : rien à faire, ou dossier classé). */
  prochaine: ActionFrise | null
  /** Déplacé à la main dans le pipeline : la frise suit quand même les vrais statuts, et le dit. */
  manuel: Etape | null
}
export type EntreeFrise = {
  lead: LeadP | null
  devis: DevisP | null
  /** Les factures DU devis (les non comptées sont écartées ici). */
  factures: readonly FactureP[]
  chantier: ChantierP | null
  manuel?: Etape | null
}

/** « 2026-10-12 » depuis un jour ou un horodatage (jour de Paris) ; null sinon. */
export function jourDe(v: string | null | undefined): string | null {
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : jourParis(new Date(t))
}
const euroTxt = (c: number) => `${(c / 100).toLocaleString('fr-FR', Number.isInteger(c / 100) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const derniere = (l: (string | null | undefined)[]): string | null => l.map(jourDe).filter((x): x is string => !!x).sort().at(-1) ?? null
const LIBELLES_CHANTIER_OUVERT: Record<string, string> = { a_planifier: 'Chantier à planifier', planifie: 'Chantier planifié', en_cours: 'Chantier en cours', en_pause: 'Chantier en pause' }

export function frise(e: EntreeFrise): Frise {
  const { lead, devis, chantier } = e
  const comptees = devis ? (facturesComptees(e.factures) as FactureP[]) : []
  const a = argentDossier(devis, comptees)
  const ds = devis ? (devis.statut ?? 'brouillon').toLowerCase() : null
  const ls = (lead?.statut ?? '').toLowerCase()
  const envoye = ds === 'envoye' || ds === 'accepte' || ds === 'refuse' || ds === 'expire'
  const pDevis = devis ? { libelle: devis.numero ? `Devis ${devis.numero}` : 'Le devis', href: `/devis/${devis.id}` } : null
  const pChantier = chantier ? { libelle: 'La fiche du chantier', href: `/crm/chantiers/${chantier.id}` } : null
  const pFactures = { libelle: 'Les factures', href: '/factures' }
  const P = (etape: EtapeFrise, etat: EtatPastille, date: string | null | undefined, detail: string, piece: Pastille['piece'] = null): Pastille =>
    ({ etape, libelle: LIBELLES_FRISE[etape], etat, date: jourDe(date ?? null), detail, piece })

  const p: Pastille[] = []
  // 1. Demande
  p.push(lead ? P('demande', 'fait', lead.created_at, 'Demande reçue', { libelle: 'La conversation', href: '/messages' })
    : P('demande', 'na', null, devis ? 'Devis fait sans demande reçue' : 'Chantier ouvert sans demande reçue'))
  // 2. Devis envoyé
  let classe = false
  if (!devis) {
    if (chantier) p.push(P('devis', 'na', null, 'Petit chantier sans devis'))
    else if (ls === 'perdu') { p.push(P('devis', 'arrete', null, 'Demande classée sans suite')); classe = true }
    else if (ls === 'gagne') p.push(P('devis', 'na', null, 'Demande marquée gagnée, sans devis'))
    else p.push(P('devis', 'a_venir', null, 'Pas encore de devis'))
  } else if (envoye) p.push(P('devis', 'fait', devis.envoye_le ?? devis.date_emission ?? devis.created_at, 'Devis envoyé', pDevis))
  else if (ls === 'perdu') { p.push(P('devis', 'arrete', null, 'Demande classée sans suite', pDevis)); classe = true }
  else p.push(P('devis', 'en_cours', devis.created_at, 'Devis en brouillon, pas encore envoyé', pDevis))
  // 3. Signé
  if (classe) p.push(P('signe', 'na', null, 'Dossier classé'))
  else if (!devis) p.push(chantier ? P('signe', 'na', null, 'Petit chantier sans devis') : ls === 'gagne' ? P('signe', 'fait', null, 'Demande marquée gagnée') : P('signe', 'a_venir', null, 'Pas encore signé'))
  else if (ds === 'accepte') p.push(P('signe', 'fait', devis.accepte_le, 'Devis signé', pDevis))
  else if (ds === 'refuse' || ds === 'expire') { p.push(P('signe', 'arrete', null, ds === 'refuse' ? 'Devis refusé' : 'Devis expiré', pDevis)); classe = true }
  else if (ds === 'envoye') p.push(P('signe', 'en_cours', null, 'En attente de la réponse du client', pDevis))
  else p.push(P('signe', 'a_venir', null, 'Le devis n’est pas encore envoyé'))
  // 4. Acompte
  const acomptes = comptees.filter((f) => estAcompte(f, a.devis))
  if (classe) p.push(P('acompte', 'na', null, 'Dossier classé'))
  else if (!devis) p.push(P('acompte', 'na', null, 'Sans devis, pas d’acompte'))
  else if (a.acompte.factures > 0 && a.acompte.recu >= a.acompte.facture) p.push(P('acompte', 'fait', derniere(acomptes.map((f) => f.payee_le ?? f.date_emission)), `Acompte réglé : ${euroTxt(a.acompte.recu)}`, pFactures))
  else if (a.acompte.factures > 0) p.push(P('acompte', 'en_cours', derniere(acomptes.map((f) => f.date_emission)), `Facture d’acompte émise (${euroTxt(a.acompte.facture)}), règlement attendu`, pFactures))
  else if (a.acompte.pct === null) p.push(P('acompte', 'na', null, 'Pas d’acompte prévu au devis'))
  else if (a.facture > 0) p.push(P('acompte', 'na', null, 'Facturé sans facture d’acompte'))
  else p.push(P('acompte', 'a_venir', null, `Acompte de ${a.acompte.pct} % prévu au devis (${euroTxt(a.acompte.prevu ?? 0)}), pas encore demandé`, pDevis))
  // 5. Chantier
  if (classe) p.push(P('chantier', 'na', null, 'Dossier classé'))
  else if (!chantier) p.push(P('chantier', 'a_venir', null, ds === 'accepte' || ls === 'gagne' ? 'Signé : le chantier reste à créer' : 'Pas encore de chantier'))
  else if (chantier.statut === 'termine') p.push(P('chantier', 'fait', chantier.date_fin_reelle, 'Chantier terminé', pChantier))
  else if (chantier.statut === 'annule') p.push(P('chantier', 'arrete', null, 'Chantier annulé', pChantier))
  else p.push(P('chantier', 'en_cours', chantier.date_debut, LIBELLES_CHANTIER_OUVERT[chantier.statut ?? ''] ?? 'Chantier ouvert', pChantier))
  // 6. Facturé — 7. Payé (seulement les factures du devis : celles d'un chantier sans devis ne lui sont pas rattachées)
  const nonAcompte = comptees.filter((f) => !estAcompte(f, a.devis))
  if (classe) { p.push(P('facture', 'na', null, 'Dossier classé')); p.push(P('paye', 'na', null, 'Dossier classé')) }
  else if (!devis) {
    const sans = chantier ? 'Chantier sans devis : sa facture se fait depuis l’écran Factures, sans lien avec le chantier' : 'Pas encore de devis'
    p.push(P('facture', chantier ? 'na' : 'a_venir', null, sans)); p.push(P('paye', chantier ? 'na' : 'a_venir', null, sans))
  } else {
    const double = a.acompteDouble ? ` · attention : l’acompte (${euroTxt(a.acompteDouble)}) est aussi dans la facture du solde, à corriger par un avoir` : ''
    if (a.couvre) p.push(P('facture', 'fait', derniere((nonAcompte.length ? nonAcompte : comptees).map((f) => f.date_emission)), `Facturé : ${euroTxt(a.facture)}${double}`, pFactures))
    else if (a.facture > 0) p.push(P('facture', 'en_cours', derniere(comptees.map((f) => f.date_emission)), `${euroTxt(a.facture)} facturés sur ${euroTxt(a.devis ?? 0)}`, pFactures))
    else p.push(P('facture', 'a_venir', null, 'Rien de facturé'))
    if (a.regle) p.push(P('paye', 'fait', derniere(comptees.map((f) => f.payee_le)), 'Tout est réglé', pFactures))
    else if (a.encaisse > 0) p.push(P('paye', 'en_cours', derniere(comptees.filter((f) => f.statut === 'payee').map((f) => f.payee_le)), `${euroTxt(a.encaisse)} encaissés sur ${euroTxt(Math.max(a.devis ?? 0, a.facture))}`, pFactures))
    else p.push(P('paye', 'a_venir', null, a.facture > 0 ? 'Facturé, rien d’encaissé' : 'Rien d’encaissé'))
  }
  return { pastilles: p, prochaine: classe ? null : prochaineAction(p, e, a), manuel: e.manuel ?? null }
}

/** Le geste de la première étape qui n'est ni faite, ni hors sujet : il n'appelle qu'un écran ou un chemin qui existe. */
function prochaineAction(p: Pastille[], e: EntreeFrise, a: ReturnType<typeof argentDossier>): ActionFrise | null {
  const x = p.find((y) => y.etat === 'en_cours' || y.etat === 'a_venir')
  if (!x) return null
  const { lead, devis, chantier } = e
  const vers = (libelle: string, href: string | null): ActionFrise => ({ etape: x.etape, libelle, href })
  switch (x.etape) {
    case 'devis': return x.etat === 'a_venir' ? (lead ? vers('Créer le devis', `/devis/nouveau?lead=${lead.id}`) : null) : devis ? vers('Ouvrir le brouillon', `/devis/${devis.id}`) : null
    case 'signe': return devis ? vers(x.etat === 'en_cours' ? 'Voir le devis envoyé' : 'Envoyer le devis', `/devis/${devis.id}`) : null
    case 'acompte':
      if (x.etat === 'en_cours') return vers('Voir la facture d’acompte', '/factures')
      return devis && devis.statut === 'accepte' && a.acompte.pct !== null && a.acompte.prevu !== null
        ? { etape: 'acompte', libelle: 'Demander l’acompte', href: null, acompte: { devisId: devis.id, pct: a.acompte.pct, montant: a.acompte.prevu } }
        : devis ? vers('Voir le devis', `/devis/${devis.id}`) : null
    case 'chantier': return chantier ? vers('Ouvrir le chantier', `/crm/chantiers/${chantier.id}`) : vers('Créer le chantier', '/crm?vue=chantiers')
    case 'facture': return chantier ? vers('Facturer depuis le chantier', `/crm/chantiers/${chantier.id}`) : devis ? vers('Facturer depuis le devis', `/devis/${devis.id}`) : null
    case 'paye': return vers('Voir les factures', '/factures')
    default: return null
  }
}
