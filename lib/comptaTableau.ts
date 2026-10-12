// Le tableau de bord comptable de l'artisan (/chiffres, refonte du 12/10/2026) — le CALCUL, rien d'autre.
//
// Deux sources, un seul tableau, et chaque chiffre dit d'où il vient :
//  1. PRESTI LUI-MÊME, sans import : les factures, devis et demandes du compte, lus côté serveur par
//     GET /api/compta/tableau (filtrés sur la session). Le tableau est « à jour » par construction :
//     une facture émise ou payée change les chiffres au prochain affichage.
//  2. LES FICHIERS DE L'ARTISAN (Excel, CSV), rangés par l'assistant (lib/comptaAssistant.ts) et gardés
//     dans son navigateur : ils ajoutent surtout les DÉPENSES, que Presti ne connaît pas.
//
// Module pur : des lignes en entrée, des indicateurs en sortie. Aucun réseau, aucune base, aucune horloge
// cachée (« maintenant » est un paramètre), aucune écriture sur les lignes reçues. Il tourne dans le
// navigateur (la page), dans la tâche planifiée (lib/comptaAutomatisations.ts) et dans les tests
// (scripts/compta-tableau-qa.mjs).
//
// Règles de lecture, alignées sur lib/tableau-de-bord/calculer.ts (le test le vérifie) :
//  • Montants en CENTIMES entiers : on additionne des entiers, jamais des flottants.
//  • Un seul montant par pièce : `total_ttc`, ce que le client règle. Presti est en franchise en base de TVA
//    (art. 293 B du CGI) ; ce module ne lit jamais une colonne de taxe et n'affiche aucun régime fiscal.
//  • « Facturé » = factures émises ou payées, au mois de `date_emission`. Les brouillons n'en sont pas. Une
//    facture visée par un avoir et l'avoir lui-même sont exclus tous les deux (ils s'annulent exactement).
//  • « Encaissé » = factures payées. La date du règlement (`payee_le`, migration 0139) n'existe que pour les
//    factures payées après son application ; sans elle, l'encaissé est rangé au mois d'émission, et la vue
//    le dit (`encaisseAuMoisDeReglement`).
//  • Impayés = ce qui est dû AUJOURD'HUI, quelle que soit la période choisie : factures émises non payées,
//    lignes importées marquées impayées. Ancienneté : jours de retard après l'échéance (strictement passée).
//  • Bénéfice et marge seulement si des dépenses sont connues sur la période : sans dépense, ils seraient
//    égaux au chiffre d'affaires, ce qui est faux.
//  • Isolation : une ligne Presti qui ne porte pas l'`artisan_id` demandé est écartée ici, EN PLUS du filtre
//    de la route. Un fondateur voit tout sous RLS : sans ce filtre, son tableau additionnerait la base.
//  • Jours et mois en heure de Paris.
import type { Ligne } from './comptaImport.ts'

export type Nombre = number | string | null | undefined

export type FacturePresti = {
  id?: string | null
  artisan_id?: string | null
  numero?: string | null
  statut?: string | null
  date_emission?: string | null
  date_echeance?: string | null
  total_ttc?: Nombre
  devis_id?: string | null
  avoir_de?: string | null
  client_nom?: string | null
  client_id?: string | null
  /** Date du règlement (0139). Absente tant que la migration n'est pas appliquée et pour les factures payées avant. */
  payee_le?: string | null
}

export type DevisPresti = {
  id?: string | null
  artisan_id?: string | null
  numero?: string | null
  client_nom?: string | null
  statut?: string | null
  date_emission?: string | null
  total_ttc?: Nombre
  envoye_le?: string | null
  accepte_le?: string | null
  created_at?: string | null
  validite_jours?: Nombre
}

export type DemandePresti = {
  id?: string | null
  artisan_id?: string | null
  canal?: string | null
  created_at?: string | null
}

export type PeriodeId = 'mois' | 'trimestre' | 'annee' | '12mois' | 'tout'
export const PERIODES: readonly { id: PeriodeId; nom: string }[] = [
  { id: 'mois', nom: 'Ce mois' },
  { id: 'trimestre', nom: '3 derniers mois' },
  { id: 'annee', nom: 'Cette année' },
  { id: '12mois', nom: '12 derniers mois' },
  { id: 'tout', nom: 'Depuis le début' },
]
export const PERIODE_PAR_DEFAUT: PeriodeId = '12mois'

export type EntreesCompta = {
  artisanId: string
  factures: readonly FacturePresti[]
  devis: readonly DevisPresti[]
  demandes: readonly DemandePresti[]
  /** Lignes des fichiers de l'artisan, déjà rangées (validées ou en aperçu). */
  lignes: readonly Ligne[]
  periode: PeriodeId
  maintenant: Date
}

/** Un montant en centimes, découpé selon sa source. */
export type Origine = { presti: number; fichiers: number; total: number }

export type MoisCompta = { cle: string; libelle: string; dansPeriode: boolean; facturePresti: number; recettesFichiers: number; encaisse: number; depenses: number }

export type Impaye = {
  cle: string
  origine: 'presti' | 'fichier'
  /** Identifiant de la facture Presti ; « fichier » pour une ligne importée (la ligne ne garde pas le nom de son fichier). */
  ref: string
  client: string
  numero: string | null
  libelle: string
  montant: number
  emission: string
  echeance: string | null
  /** Jours de retard après l'échéance ; 0 si pas encore échue ou sans échéance. */
  joursRetard: number
  joursDepuisEmission: number
}

export type Compte = { libelle: string; nb: number; part: number }

export type VueCompta = {
  periode: { id: PeriodeId; nom: string; debut: string; fin: string; jour: string }
  /** Rien du tout : ni pièce Presti, ni ligne importée. L'écran montre alors l'état vide. */
  vide: boolean
  sources: { presti: boolean; fichiers: number }
  cartes: {
    facture: Origine
    encaisse: Origine
    /** Null : aucune dépense connue sur la période (Presti ne connaît pas les dépenses). */
    depenses: number | null
    benefice: number | null
    /** Bénéfice / chiffre d'affaires en pour cent, une décimale ; null sans dépense ou sans chiffre d'affaires. */
    marge: number | null
    impayes: Origine & { nombre: number }
    clients: number
  }
  encaisseAuMoisDeReglement: boolean
  mois: MoisCompta[]
  impayes: Impaye[]
  anciennete: { aEcheance: number; retard30: number; retard60: number; retardPlus: number }
  devis: { acceptes: { nombre: number; montant: number }; enAttente: { nombre: number; montant: number } }
  meilleursClients: { nom: string; montant: number; origine: 'presti' | 'fichiers' | 'les deux' }[]
  demandes: { total: number; parCanal: Compte[] }
}

const FUSEAU = 'Europe/Paris'
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const STATUTS_FACTURES_COMPTEES = ['emise', 'payee']
const VALIDITE_PAR_DEFAUT_JOURS = 90
const FENETRE_GRAPHIQUE_MIN = 6
const FENETRE_GRAPHIQUE_MAX = 24
const TOP = 5
// Le libellé d'un canal tel qu'il est ENREGISTRÉ sur la demande (leads.canal) : rien n'est deviné.
const LIBELLES_CANAL: Record<string, string> = {
  formulaire: 'Formulaire de votre page',
  email: 'E-mail',
  site: 'Site',
  plateforme: 'Plateforme',
  whatsapp: 'WhatsApp',
  telephone: 'Téléphone',
  autre: 'Non renseigné',
}

const formatJour = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })
export const jourParis = (d: Date): string => formatJour.format(d)

function jourDe(v: unknown): string | null {
  if (typeof v !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : jourParis(new Date(t))
}

const ecartJours = (a: string, b: string): number =>
  Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86_400_000)

export function decalerMois(cle: string, n: number): string {
  const total = +cle.slice(0, 4) * 12 + (+cle.slice(5, 7) - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const nbMois = (debut: string, fin: string): number => (+fin.slice(0, 4) * 12 + +fin.slice(5, 7)) - (+debut.slice(0, 4) * 12 + +debut.slice(5, 7)) + 1

/** Un montant en centimes entiers ; une valeur illisible compte pour 0, jamais NaN. */
export function centimes(v: Nombre): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

const texte = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t === '' ? null : t
}
const cleNom = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const duMien = <T extends { artisan_id?: string | null }>(lignes: readonly T[] | null | undefined, artisanId: string): T[] =>
  artisanId ? (Array.isArray(lignes) ? lignes : []).filter((l) => !!l && l.artisan_id === artisanId) : []

/** Les factures qui comptent : émises ou payées, ni avoir, ni facture visée par un avoir. */
export function facturesComptees(factures: readonly FacturePresti[]): FacturePresti[] {
  const annulees = new Set<string>()
  for (const f of factures) if (typeof f.avoir_de === 'string' && f.avoir_de) annulees.add(f.avoir_de)
  return factures.filter((f) => !f.avoir_de && !(f.id && annulees.has(f.id)) && STATUTS_FACTURES_COMPTEES.includes(f.statut ?? ''))
}

/** Le premier et le dernier mois (« AAAA-MM ») d'une période, pour un jour donné. */
export function bornesPeriode(periode: PeriodeId, jour: string, premierMoisConnu: string | null): { debut: string; fin: string } {
  const fin = jour.slice(0, 7)
  switch (periode) {
    case 'mois': return { debut: fin, fin }
    case 'trimestre': return { debut: decalerMois(fin, -2), fin }
    case 'annee': return { debut: `${fin.slice(0, 4)}-01`, fin }
    case '12mois': return { debut: decalerMois(fin, -11), fin }
    case 'tout': return { debut: premierMoisConnu && premierMoisConnu < fin ? premierMoisConnu : fin, fin }
  }
}

function libelleCanal(brut: unknown): string {
  const t = texte(brut)
  if (!t) return LIBELLES_CANAL.autre
  return LIBELLES_CANAL[cleNom(t)] ?? t.charAt(0).toUpperCase() + t.slice(1)
}

const vide = (): Origine => ({ presti: 0, fichiers: 0, total: 0 })
const ajouter = (o: Origine, source: 'presti' | 'fichiers', c: number) => { o[source] += c; o.total += c }

export function calculerCompta(e: EntreesCompta): VueCompta {
  const jour = jourParis(e.maintenant)
  const factures = duMien(e.factures, e.artisanId)
  const devis = duMien(e.devis, e.artisanId)
  const demandes = duMien(e.demandes, e.artisanId)
  const lignes = Array.isArray(e.lignes) ? e.lignes : []
  const comptees = facturesComptees(factures)

  // Le premier mois connu (pour « Depuis le début ») : pièces Presti comptées, lignes importées, demandes.
  const moisConnus = [
    ...comptees.map((f) => jourDe(f.date_emission)),
    ...lignes.map((l) => jourDe(l.date)),
    ...demandes.map((d) => jourDe(d.created_at)),
  ].filter((x): x is string => !!x).map((x) => x.slice(0, 7)).sort()
  const periodeId: PeriodeId = PERIODES.some((p) => p.id === e.periode) ? e.periode : PERIODE_PAR_DEFAUT
  const { debut, fin } = bornesPeriode(periodeId, jour, moisConnus[0] ?? null)
  const dansPeriode = (m: string | null | undefined): boolean => !!m && m >= debut && m <= fin

  // Le graphique : au moins 6 mois pour donner un contexte, au plus 24 ; la période y est en surbrillance.
  const largeur = Math.min(FENETRE_GRAPHIQUE_MAX, Math.max(FENETRE_GRAPHIQUE_MIN, nbMois(debut, fin)))
  const mois: MoisCompta[] = []
  for (let i = largeur - 1; i >= 0; i--) {
    const cle = decalerMois(fin, -i)
    mois.push({ cle, libelle: `${MOIS_COURTS[+cle.slice(5, 7) - 1]}${cle.slice(5, 7) === '01' || i === largeur - 1 ? ` ${cle.slice(2, 4)}` : ''}`, dansPeriode: dansPeriode(cle), facturePresti: 0, recettesFichiers: 0, encaisse: 0, depenses: 0 })
  }
  const parCle = new Map(mois.map((m) => [m.cle, m]))

  const facture = vide()
  const encaisse = vide()
  let depenses = 0
  let depensesConnues = false
  const clients = new Map<string, { nom: string; montant: number; presti: boolean; fichiers: boolean }>()
  const compterClient = (nom: string | null, id: string | null, montant: number, source: 'presti' | 'fichiers') => {
    const k = nom ? cleNom(nom) : id ? `id:${id}` : ''
    if (!k || k === 'sans nom') return
    const c = clients.get(k) ?? { nom: nom ?? 'Client sans nom', montant: 0, presti: false, fichiers: false }
    c.montant += montant
    c[source] = true
    clients.set(k, c)
  }
  let reglementDate = false

  // — Presti : factures —
  for (const f of comptees) {
    const c = centimes(f.total_ttc)
    const emission = jourDe(f.date_emission)
    const m = emission?.slice(0, 7)
    if (m && dansPeriode(m)) { ajouter(facture, 'presti', c); compterClient(texte(f.client_nom), texte(f.client_id), c, 'presti') }
    const ligneMois = m ? parCle.get(m) : undefined
    if (ligneMois) ligneMois.facturePresti += c
    if (f.statut === 'payee') {
      const regle = jourDe(f.payee_le)
      if (regle) reglementDate = true
      const mr = (regle ?? emission)?.slice(0, 7)
      if (mr && dansPeriode(mr)) ajouter(encaisse, 'presti', c)
      const lm = mr ? parCle.get(mr) : undefined
      if (lm) lm.encaisse += c
    }
  }

  // — Fichiers : recettes et dépenses —
  for (const l of lignes) {
    const m = jourDe(l.date)?.slice(0, 7)
    const c = Number.isSafeInteger(l.montant) && l.montant > 0 ? l.montant : 0
    const lm = m ? parCle.get(m) : undefined
    if (l.sens === 'recette') {
      if (dansPeriode(m)) {
        ajouter(facture, 'fichiers', c)
        if (l.statut === 'paye') ajouter(encaisse, 'fichiers', c)
        compterClient(texte(l.tiers), null, c, 'fichiers')
      }
      if (lm) { lm.recettesFichiers += c; if (l.statut === 'paye') lm.encaisse += c }
    } else {
      if (dansPeriode(m)) { depenses += c; depensesConnues = true }
      if (lm) lm.depenses += c
    }
  }

  // — Impayés : ce qui est dû aujourd'hui, toutes périodes confondues —
  const impayes: Impaye[] = []
  for (const f of comptees) {
    if (f.statut !== 'emise') continue
    const emission = jourDe(f.date_emission) ?? jour
    const echeance = jourDe(f.date_echeance)
    impayes.push({
      cle: `presti:${f.id ?? impayes.length}`, origine: 'presti', ref: f.id ?? '', client: texte(f.client_nom) ?? 'Client', numero: texte(f.numero),
      libelle: texte(f.numero) ? `Facture ${texte(f.numero)}` : 'Facture', montant: centimes(f.total_ttc), emission, echeance,
      joursRetard: echeance && echeance < jour ? ecartJours(jour, echeance) : 0, joursDepuisEmission: Math.max(0, ecartJours(jour, emission)),
    })
  }
  for (const l of lignes) {
    if (l.sens !== 'recette' || l.statut !== 'impaye') continue
    const emission = jourDe(l.date) ?? jour
    impayes.push({
      cle: `fichier:${l.date}:${l.montant}:${l.ligne}:${cleNom(l.tiers ?? '')}:${cleNom(l.libelle ?? '')}`, origine: 'fichier', ref: 'fichier', client: texte(l.tiers) ?? 'Sans nom', numero: null,
      libelle: texte(l.libelle) ?? 'Sans libellé', montant: Number.isSafeInteger(l.montant) && l.montant > 0 ? l.montant : 0, emission, echeance: null,
      joursRetard: 0, joursDepuisEmission: Math.max(0, ecartJours(jour, emission)),
    })
  }
  impayes.sort((a, b) => b.joursRetard - a.joursRetard || a.emission.localeCompare(b.emission) || a.cle.localeCompare(b.cle))
  const totalImpayes = vide()
  const anciennete = { aEcheance: 0, retard30: 0, retard60: 0, retardPlus: 0 }
  for (const i of impayes) {
    ajouter(totalImpayes, i.origine === 'presti' ? 'presti' : 'fichiers', i.montant)
    if (i.joursRetard <= 0) anciennete.aEcheance += i.montant
    else if (i.joursRetard <= 30) anciennete.retard30 += i.montant
    else if (i.joursRetard <= 60) anciennete.retard60 += i.montant
    else anciennete.retardPlus += i.montant
  }

  // — Devis : acceptés pendant la période, en attente aujourd'hui (envoyés, encore valables) —
  const acceptes = { nombre: 0, montant: 0 }
  const enAttente = { nombre: 0, montant: 0 }
  for (const d of devis) {
    if (d.statut === 'accepte') {
      const m = (jourDe(d.accepte_le) ?? jourDe(d.date_emission) ?? jourDe(d.created_at))?.slice(0, 7)
      if (dansPeriode(m)) { acceptes.nombre++; acceptes.montant += centimes(d.total_ttc) }
    } else if (d.statut === 'envoye') {
      const envoye = jourDe(d.envoye_le) ?? jourDe(d.date_emission) ?? jourDe(d.created_at)
      if (!envoye) continue
      const validite = Number(d.validite_jours)
      const limite = Number.isFinite(validite) && validite > 0 ? validite : VALIDITE_PAR_DEFAUT_JOURS
      if (ecartJours(jour, envoye) <= limite) { enAttente.nombre++; enAttente.montant += centimes(d.total_ttc) }
    }
  }

  // — Sources des demandes, d'après le canal enregistré —
  const canaux = new Map<string, number>()
  let totalDemandes = 0
  for (const d of demandes) {
    if (!dansPeriode(jourDe(d.created_at)?.slice(0, 7))) continue
    const l = libelleCanal(d.canal)
    canaux.set(l, (canaux.get(l) ?? 0) + 1)
    totalDemandes++
  }
  const parCanal: Compte[] = [...canaux.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([libelle, nb]) => ({ libelle, nb, part: totalDemandes ? Math.round((nb / totalDemandes) * 100) : 0 }))

  const benefice = depensesConnues ? facture.total - depenses : null
  const lignesDansPeriode = lignes.filter((l) => dansPeriode(jourDe(l.date)?.slice(0, 7))).length

  return {
    periode: { id: periodeId, nom: PERIODES.find((p) => p.id === periodeId)!.nom, debut, fin, jour },
    vide: factures.length === 0 && devis.length === 0 && demandes.length === 0 && lignes.length === 0,
    sources: { presti: factures.length + devis.length + demandes.length > 0, fichiers: lignesDansPeriode },
    cartes: {
      facture,
      encaisse,
      depenses: depensesConnues ? depenses : null,
      benefice,
      marge: benefice !== null && facture.total > 0 ? Math.round((benefice * 1000) / facture.total) / 10 : null,
      impayes: { ...totalImpayes, nombre: impayes.length },
      clients: clients.size,
    },
    encaisseAuMoisDeReglement: reglementDate,
    mois,
    impayes,
    anciennete,
    devis: { acceptes, enAttente },
    meilleursClients: [...clients.values()]
      .filter((c) => c.montant > 0)
      .sort((a, b) => b.montant - a.montant || a.nom.localeCompare(b.nom))
      .slice(0, TOP)
      .map((c) => ({ nom: c.nom, montant: c.montant, origine: c.presti && c.fichiers ? 'les deux' as const : c.presti ? 'presti' as const : 'fichiers' as const })),
    demandes: { total: totalDemandes, parCanal },
  }
}

/** « 1 240 € » ; avec des centimes : « 1 240,50 € ». Les montants sont en centimes. */
export function euros(c: number): string {
  const n = c / 100
  return `${n.toLocaleString('fr-FR', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
