// Tableau de bord de gestion de l'artisan — le CALCUL, rien d'autre.
//
// Module pur : des lignes en entrée, des indicateurs en sortie. Aucun import (donc aucun accès réseau,
// aucune base, aucune horloge cachée : « maintenant » est un paramètre), aucune modification des
// lignes reçues. La page (`app/chiffres/page.tsx`) lit ses données sous RLS et ne fait QUE les passer
// ici ; `scripts/tableau-de-bord-qa.mjs` rejoue ce module sur un jeu de données dont les résultats ont
// été écrits à la main.
//
// Règles de lecture — chacune est une décision, pas un détail :
//
//  • Presti est en franchise en base de TVA (art. 293 B du CGI) : le module ne lit JAMAIS `total_tva`
//    ni `total_ht`. Un seul montant par pièce, `total_ttc` (ce que le client règle ; en franchise,
//    c'est aussi le hors taxe). Aucune sortie ne porte le mot TVA, HT ou TTC.
//  • « Facturé » = factures émises ou payées, rangées par `date_emission`. Les brouillons n'en font
//    pas partie. Une facture ANNULÉE et l'AVOIR qui l'annule (montant négatif, `avoir_de` renseigné)
//    sont exclus tous les deux : ils s'annulent exactement, et ne les compter ni l'un ni l'autre
//    évite de retirer deux fois la même somme. L'effet : une facture annulée disparaît du mois où elle
//    avait été émise (et non du mois de l'avoir). Un avoir est toujours total dans Presti
//    (`app/api/factures/[id]/avoir/route.ts`) ; si un jour un avoir partiel existe, ce choix est à revoir.
//  • « Encaissé » = factures au statut `payee`, émises cette année. La base ne garde pas la date du
//    règlement : « encaissé ce mois » serait inventé, on ne l'affiche donc pas.
//  • « En retard » = facture émise, non payée, dont l'échéance est STRICTEMENT passée (le jour de
//    l'échéance, elle est encore à l'heure). Sans échéance, elle est « en attente » : on ne peut pas
//    dire qu'elle est en retard.
//  • Jours et mois comptés en heure de Paris : une demande reçue le 30 à 23 h 30 UTC est du 1er (Paris).
//  • Division par zéro : jamais un faux 0 % ni NaN — `null`, que l'écran affiche « — ».
//  • Chaque ligne doit porter l'`artisan_id` demandé : une ligne d'un autre artisan (ou sans
//    `artisan_id`) est écartée ici, EN PLUS du filtre de la requête et de la RLS. Ceinture et bretelles :
//    un fondateur voit les lignes de tous sous RLS (migration 0006, `founders_all_factures`).

export type Nombre = number | string | null | undefined

export type LigneFacture = {
  id?: string | null
  artisan_id?: string | null
  statut?: string | null
  date_emission?: string | null
  date_echeance?: string | null
  total_ttc?: Nombre
  devis_id?: string | null
  avoir_de?: string | null
}

export type LigneDevis = {
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
  lead_id?: string | null
  validite_jours?: Nombre
}

export type LigneDemande = {
  id?: string | null
  artisan_id?: string | null
  canal?: string | null
  statut?: string | null
  created_at?: string | null
  type_chantier?: string | null
  /** La commune lue dans le message à l'arrivée (0133, lib/ville.ts) ; null si le message n'en nomme aucune. */
  ville?: string | null
}

export type Entrees = {
  artisanId: string
  factures: LigneFacture[]
  devis: LigneDevis[]
  demandes: LigneDemande[]
  maintenant: Date
}

export type Compte = { libelle: string; nb: number; part: number }

export type MoisChiffre = { cle: string; libelle: string; ca: number; demandes: number }

export type DevisARelancer = { id: string; numero: string | null; client: string | null; montant: number; jours: number }

export type Indicateurs = {
  periode: { jour: string; mois: string; moisLibelle: string; moisPrecedentLibelle: string; annee: string }
  vide: boolean
  argent: {
    caMois: number
    caMoisPrecedent: number
    variationMois: number | null
    caAnnee: number
    encaisseAnnee: number
    enAttente: number
    nbEnAttente: number
    enRetard: number
    nbEnRetard: number
    retardMaxJours: number
  }
  mois: MoisChiffre[]
  devis: {
    envoyes: number
    acceptes: number
    tauxAcceptation: number | null
    delaiMoyenHeures: number | null
    nbDelais: number
  }
  aRelancer: { total: number; seuilJours: number; liste: DevisARelancer[] }
  demandes: { total: number; parCanal: Compte[] }
  chantiers: Compte[]
  villes: Compte[]
}

export const FENETRE_GRAPHIQUE = 6
export const FENETRE_ACTIVITE = 12
export const SEUIL_RELANCE_JOURS = 7
export const VALIDITE_PAR_DEFAUT_JOURS = 90
export const TOP = 5

const FUSEAU = 'Europe/Paris'
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const LIBELLES_CANAL: Record<string, string> = {
  formulaire: 'Formulaire',
  email: 'E-mail',
  site: 'Site',
  whatsapp: 'WhatsApp',
  telephone: 'Téléphone',
  autre: 'Autre',
}
const STATUTS_FACTURES_COMPTEES = ['emise', 'payee']
const STATUTS_DEVIS_ENVOYES = ['envoye', 'accepte', 'refuse', 'expire']

const formatJour = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Le jour calendaire (AAAA-MM-JJ) d'un instant, en heure de Paris. */
export function jourParis(d: Date): string {
  return formatJour.format(d)
}

/** Une date seule (`date_emission`) reste telle quelle ; un horodatage est ramené au jour de Paris. */
function jourDe(v: string | null | undefined): string | null {
  if (typeof v !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : jourParis(new Date(t))
}

const ecartJours = (a: string, b: string): number => Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86_400_000)

/** `aaaa-mm` décalé de n mois. */
function decalerMois(cle: string, n: number): string {
  const total = +cle.slice(0, 4) * 12 + (+cle.slice(5, 7) - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Un montant en centimes entiers : on additionne des entiers, pas des flottants. */
function centimes(v: Nombre): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

const euros = (c: number): number => c / 100

function texte(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t === '' ? null : t
}

function clePourRegrouper(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s'’-]+/g, ' ').trim()
}

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function classer(items: string[], limite: number): Compte[] {
  const groupes = new Map<string, { libelle: string; nb: number }>()
  for (const brut of items) {
    const t = texte(brut)
    if (!t) continue
    const k = clePourRegrouper(t)
    if (!k) continue
    const g = groupes.get(k)
    if (g) g.nb++
    else groupes.set(k, { libelle: t, nb: 1 })
  }
  const total = [...groupes.values()].reduce((s, g) => s + g.nb, 0)
  return [...groupes.values()]
    .sort((a, b) => b.nb - a.nb || (a.libelle < b.libelle ? -1 : a.libelle > b.libelle ? 1 : 0))
    .slice(0, limite)
    .map((g) => ({ libelle: g.libelle, nb: g.nb, part: total > 0 ? Math.round((g.nb / total) * 100) : 0 }))
}

function libelleCanal(brut: string | null | undefined): string {
  const t = texte(brut)
  if (!t) return LIBELLES_CANAL.autre
  const k = clePourRegrouper(t)
  return LIBELLES_CANAL[k] ?? majuscule(t)
}

const duMien = <T extends { artisan_id?: string | null }>(lignes: T[] | null | undefined, artisanId: string): T[] =>
  artisanId ? (Array.isArray(lignes) ? lignes : []).filter((l) => !!l && l.artisan_id === artisanId) : []

export function calculer(e: Entrees): Indicateurs {
  const aujourdhui = jourParis(e.maintenant)
  const moisCourant = aujourdhui.slice(0, 7)
  const moisPrecedent = decalerMois(moisCourant, -1)
  const annee = aujourdhui.slice(0, 4)
  const debutActivite = decalerMois(moisCourant, -(FENETRE_ACTIVITE - 1))
  const debutGraphique = decalerMois(moisCourant, -(FENETRE_GRAPHIQUE - 1))
  const dansFenetre = (cle: string | null, debut: string): boolean => cle !== null && cle >= debut && cle <= moisCourant

  const factures = duMien(e.factures, e.artisanId)
  const devis = duMien(e.devis, e.artisanId)
  const demandes = duMien(e.demandes, e.artisanId)

  // — Factures : ce qui compte, après retrait des brouillons, des annulées et des avoirs —
  const annulees = new Set<string>()
  for (const f of factures) if (f.avoir_de && typeof f.avoir_de === 'string') annulees.add(f.avoir_de)
  const comptees = factures.filter((f) => !f.avoir_de && !(f.id && annulees.has(f.id)) && STATUTS_FACTURES_COMPTEES.includes(f.statut ?? ''))

  const caParMois = new Map<string, number>()
  let caAnnee = 0
  let encaisseAnnee = 0
  let enAttente = 0, nbEnAttente = 0, enRetard = 0, nbEnRetard = 0, retardMax = 0
  for (const f of comptees) {
    const c = centimes(f.total_ttc)
    const jour = jourDe(f.date_emission)
    if (jour) {
      caParMois.set(jour.slice(0, 7), (caParMois.get(jour.slice(0, 7)) ?? 0) + c)
      if (jour.slice(0, 4) === annee) {
        caAnnee += c
        if (f.statut === 'payee') encaisseAnnee += c
      }
    }
    if (f.statut === 'emise') {
      const echeance = jourDe(f.date_echeance)
      if (echeance && echeance < aujourdhui) { enRetard += c; nbEnRetard++; retardMax = Math.max(retardMax, ecartJours(aujourdhui, echeance)) }
      else { enAttente += c; nbEnAttente++ }
    }
  }
  const caMois = caParMois.get(moisCourant) ?? 0
  const caMoisPrecedent = caParMois.get(moisPrecedent) ?? 0

  // — Demandes —
  const demandesDatees = demandes.map((d) => ({ d, jour: jourDe(d.created_at) })).filter((x): x is { d: LigneDemande; jour: string } => x.jour !== null)
  const demandesParMois = new Map<string, number>()
  const canaux: string[] = []
  const types: string[] = []
  // Les villes des DEMANDES (décision 2 de Benj, 06/10) : clients.ville restait vide, le bloc aussi. Même fenêtre que les types.
  const villes: string[] = []
  for (const { d, jour } of demandesDatees) {
    const m = jour.slice(0, 7)
    if (dansFenetre(m, debutGraphique)) {
      demandesParMois.set(m, (demandesParMois.get(m) ?? 0) + 1)
      canaux.push(libelleCanal(d.canal))
    }
    if (dansFenetre(m, debutActivite) && d.type_chantier) types.push(d.type_chantier)
    if (dansFenetre(m, debutActivite) && d.ville) villes.push(d.ville)
  }

  const mois: MoisChiffre[] = []
  for (let i = FENETRE_GRAPHIQUE - 1; i >= 0; i--) {
    const cle = decalerMois(moisCourant, -i)
    mois.push({ cle, libelle: MOIS_COURTS[+cle.slice(5, 7) - 1], ca: euros(caParMois.get(cle) ?? 0), demandes: demandesParMois.get(cle) ?? 0 })
  }

  // — Devis : envoyés (jamais un brouillon) sur les 12 derniers mois —
  const devisDatesDe = (d: LigneDevis): string | null => jourDe(d.date_emission) ?? jourDe(d.created_at)
  const devisEnvoyes = devis.filter((d) => STATUTS_DEVIS_ENVOYES.includes(d.statut ?? '') && dansFenetre(devisDatesDe(d)?.slice(0, 7) ?? null, debutActivite))
  const nbEnvoyes = devisEnvoyes.length
  const nbAcceptes = devisEnvoyes.filter((d) => d.statut === 'accepte').length

  // Délai demande → devis : le premier devis de chaque demande, mesuré jusqu'à l'envoi (à défaut,
  // jusqu'à la création). Un devis sans demande connue, ou « avant » la demande (horloges), est ignoré.
  const demandeParId = new Map<string, number>()
  for (const d of demandes) {
    const t = d.id && d.created_at ? Date.parse(d.created_at) : NaN
    if (d.id && !Number.isNaN(t)) demandeParId.set(d.id, t)
  }
  const plusCourtParDemande = new Map<string, number>()
  for (const d of devisEnvoyes) {
    if (!d.lead_id) continue
    const t0 = demandeParId.get(d.lead_id)
    const t1 = Date.parse(d.envoye_le ?? d.created_at ?? '')
    if (t0 === undefined || Number.isNaN(t1)) continue
    const heures = (t1 - t0) / 3_600_000
    if (heures < 0) continue
    const avant = plusCourtParDemande.get(d.lead_id)
    if (avant === undefined || heures < avant) plusCourtParDemande.set(d.lead_id, heures)
  }
  const delais = [...plusCourtParDemande.values()]
  const delaiMoyen = delais.length ? Math.round((delais.reduce((s, h) => s + h, 0) / delais.length) * 10) / 10 : null

  // — Devis envoyés restés sans réponse —
  const relances: DevisARelancer[] = []
  for (const d of devis) {
    if (d.statut !== 'envoye' || !d.id) continue
    const envoye = jourDe(d.envoye_le) ?? devisDatesDe(d)
    if (!envoye) continue
    const jours = ecartJours(aujourdhui, envoye)
    const validite = Number(d.validite_jours)
    const limite = Number.isFinite(validite) && validite > 0 ? validite : VALIDITE_PAR_DEFAUT_JOURS
    if (jours > SEUIL_RELANCE_JOURS && jours <= limite) relances.push({ id: d.id, numero: texte(d.numero), client: texte(d.client_nom), montant: euros(centimes(d.total_ttc)), jours })
  }
  relances.sort((a, b) => b.jours - a.jours || (a.id < b.id ? -1 : 1))

  const parCanal = classer(canaux, 50)
  const totalDemandes = canaux.length

  return {
    periode: {
      jour: aujourdhui,
      mois: moisCourant,
      moisLibelle: `${MOIS_LONGS[+moisCourant.slice(5, 7) - 1]} ${moisCourant.slice(0, 4)}`,
      moisPrecedentLibelle: `${MOIS_LONGS[+moisPrecedent.slice(5, 7) - 1]} ${moisPrecedent.slice(0, 4)}`,
      annee,
    },
    vide: factures.length === 0 && devis.length === 0 && demandes.length === 0,
    argent: {
      caMois: euros(caMois),
      caMoisPrecedent: euros(caMoisPrecedent),
      variationMois: caMoisPrecedent > 0 ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100) : null,
      caAnnee: euros(caAnnee),
      encaisseAnnee: euros(encaisseAnnee),
      enAttente: euros(enAttente),
      nbEnAttente,
      enRetard: euros(enRetard),
      nbEnRetard,
      retardMaxJours: retardMax,
    },
    mois,
    devis: {
      envoyes: nbEnvoyes,
      acceptes: nbAcceptes,
      tauxAcceptation: nbEnvoyes > 0 ? Math.round((nbAcceptes / nbEnvoyes) * 100) : null,
      delaiMoyenHeures: delaiMoyen,
      nbDelais: delais.length,
    },
    aRelancer: { total: relances.length, seuilJours: SEUIL_RELANCE_JOURS, liste: relances.slice(0, TOP) },
    demandes: { total: totalDemandes, parCanal },
    chantiers: classer(types, TOP),
    villes: classer(villes, TOP),
  }
}
