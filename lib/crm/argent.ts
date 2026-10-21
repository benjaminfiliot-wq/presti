// CRM — l'ARGENT d'un dossier : un devis et ses factures. Facturé, encaissé, acompte, reste à facturer, reste à encaisser.
// Module pur (un seul import, pur aussi) : rejoué par scripts/crm-qa.mjs. La frise (lib/crm/pipeline.ts), les indicateurs du
// chantier (lib/crm/chantier.ts), la colonne « à encaisser » du pipeline et la tuile du tableau de bord lisent TOUS ce calcul :
// une seule écriture (« deux chiffres, un écran »).
//
// Règles, alignées sur /chiffres (lib/comptaTableau.ts) :
//   • les factures qui comptent : émises ou payées, ni avoir, ni facture visée par un avoir (facturesComptees) ;
//   • « encaissé » = factures payées ; montants en CENTIMES entiers, TTC (ce que le client règle) ;
//   • une facture d'ACOMPTE : `acompte_pct` entre 0 et 100 exclus ET l'objet « Acompte … » que lui donne le seul chemin qui en
//     crée (lib/factureDepuisDevis.ts, `acomptePct` : « Acompte 30 % — … »). Le pourcentage seul ne suffit pas : la facture
//     COMPLÈTE (ou de SOLDE) d'un devis à acompte recopie le pourcentage du devis (`acompte_pct: acompte`). Sans objet lu, le
//     montant tranche : un acompte vaut le pourcentage du devis, à 1 % près ;
//   • « reste à encaisser » n'existe que pour un devis SIGNÉ : ce qui est dû (le devis, ou plus si l'artisan a facturé plus)
//     moins ce qui est encaissé. Pour un devis non signé, rien n'est dû : seules ses factures déjà émises comptent.
import { centimes, facturesComptees, type FacturePresti, type Nombre } from '../comptaTableau.ts'

export type FactureArgent = FacturePresti & { acompte_pct?: Nombre; objet?: string | null; type_facture?: string | null }

/**
 * Une SITUATION DE TRAVAUX (0176, drapeau `facturesSituation`) : son type, ou l'objet « Situation n° … » que lui donne le seul
 * chemin qui en crée (lib/factureDepuisDevis.ts). Ni acompte ni facture complète : elle compte dans le facturé comme toute
 * facture, et « Facturer » reste possible après elle (il émet le SOLDE, situations et acomptes déduits).
 */
export function estSituation(f: { type_facture?: string | null; objet?: string | null }): boolean {
  return f.type_facture === 'situation' || /^\s*situation n°/i.test(f.objet ?? '')
}

export type Argent = {
  /** TTC du devis, en centimes ; null sans devis. */
  devis: number | null
  signe: boolean
  /** Factures comptées (émises ou payées), TTC. */
  facture: number
  /** Factures payées, TTC. */
  encaisse: number
  /** Facturé mais pas encore réglé. */
  factureNonRegle: number
  /** Ce qui reste à facturer sur un devis signé ; null sinon. */
  resteAFacturer: number | null
  /** Ce qui reste à encaisser (devis signé : dû − encaissé ; sinon : facturé non réglé). Jamais négatif. */
  resteAEncaisser: number
  /** Les factures couvrent tout le devis (à un centime près par facture, arrondi de la TVA). */
  couvre: boolean
  /** … et tout est réglé (à un centime près par facture) : la colonne « Payé » du pipeline. */
  regle: boolean
  acompte: {
    /** Pourcentage prévu au devis (0 < pct < 100), sinon null. */
    pct: number | null
    /** Montant prévu au devis, en centimes ; null sans acompte prévu. */
    prevu: number | null
    /** Factures d'acompte comptées. */
    facture: number
    /** … dont payées. */
    recu: number
    /** Nombre de factures d'acompte comptées. */
    factures: number
  }
  /** Factures comptées. */
  nbFactures: number
  /**
   * L'acompte compté DEUX fois (audit de cohérence du 18/10, C3) : une facture « complète » reprend le total entier du devis alors
   * qu'une facture d'acompte est déjà comptée. Ici l'acompte n'est compté qu'une fois (facturé, encaissé, reste) et l'écran le
   * signale ; « Mes chiffres », lui, additionne les deux factures telles qu'émises. 0 dans le cas normal.
   */
  acompteDouble: number
}

const pctValide = (v: Nombre): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null
}

/** Une facture d'acompte : un pourcentage d'acompte ET l'objet « Acompte … » ; sans objet, le montant (voir l'en-tête). */
export function estAcompte(f: { acompte_pct?: Nombre; total_ttc?: Nombre; objet?: string | null }, devisTtc: number | null): boolean {
  const pct = pctValide(f.acompte_pct)
  if (pct === null) return false
  if (typeof f.objet === 'string' && f.objet.trim()) return /^\s*acompte\b/i.test(f.objet)
  if (devisTtc === null || devisTtc <= 0) return true
  const attendu = (devisTtc * pct) / 100
  return Math.abs(centimes(f.total_ttc) - attendu) <= Math.max(5, attendu / 100)
}

/**
 * « Demander l'acompte » (POST /api/crm/acompte) : la facture d'acompte se crée seulement pour un devis SIGNÉ qui prévoit un
 * acompte (0 < pct < 100) et qui n'a encore AUCUNE facture comptée (ni acompte, ni facture complète) : sinon on facturerait
 * deux fois. Le chemin est celui de la facture d'acompte automatique (lib/factureDepuisDevis.ts, `acomptePct`).
 */
export function decisionAcompte(devis: { statut?: string | null; total_ttc?: Nombre; acompte_pct?: Nombre } | null, factures: readonly FactureArgent[]):
  { ok: true; pct: number; montant: number } | { ok: false; statut: 404 | 409; erreur: string } {
  if (!devis) return { ok: false, statut: 404, erreur: 'Devis introuvable.' }
  if (devis.statut !== 'accepte') return { ok: false, statut: 409, erreur: 'Le devis n’est pas signé : l’acompte se demande après la signature.' }
  const pct = pctValide(devis.acompte_pct)
  if (pct === null) return { ok: false, statut: 409, erreur: 'Ce devis ne prévoit pas d’acompte (réglez le pourcentage sur le devis).' }
  if (facturesComptees(factures).length) return { ok: false, statut: 409, erreur: 'Une facture existe déjà pour ce devis (acompte ou totale) : voyez l’écran Factures.' }
  return { ok: true, pct, montant: Math.round((centimes(devis.total_ttc) * pct) / 100) }
}

/**
 * L'argent d'un dossier. `factures` : celles du devis (n'importe lesquelles : les brouillons, annulées et avoirs sont écartés
 * ici). `devis` null : un chantier sans devis (dépannage) ou une demande seule — ses factures ne lui sont pas rattachées.
 */
export function argentDossier(devis: { statut?: string | null; total_ttc?: Nombre; acompte_pct?: Nombre } | null, factures: readonly FactureArgent[]): Argent {
  const du = devis ? centimes(devis.total_ttc) : null
  const signe = devis?.statut === 'accepte'
  const comptees = devis ? facturesComptees(factures) as FactureArgent[] : []
  let facture = 0, encaisse = 0, acFacture = 0, acRecu = 0, acNb = 0
  for (const f of comptees) {
    const c = centimes(f.total_ttc)
    facture += c
    if (f.statut === 'payee') encaisse += c
    if (estAcompte(f, du)) { acNb++; acFacture += c; if (f.statut === 'payee') acRecu += c }
  }
  // C3 : une facture non-acompte qui porte à elle seule tout le devis, à côté d'acomptes comptés = l'acompte facturé deux fois.
  const completes = du ? comptees.filter((f) => !estAcompte(f, du) && centimes(f.total_ttc) >= du) : []
  const acompteDouble = acNb > 0 && completes.length ? acFacture : 0
  if (acompteDouble) {
    facture -= acompteDouble
    // Le règlement de la facture complète couvre aussi l'acompte : on ne compte pas deux fois l'argent reçu.
    if (completes.some((f) => f.statut === 'payee') && acRecu > 0) encaisse -= Math.min(acRecu, acompteDouble)
  }
  const pct = devis ? pctValide(devis.acompte_pct) : null
  // Un centime d'écart toléré par facture comptée (arrondi de la TVA ligne à ligne entre acompte et solde) : même règle que la
  // colonne du pipeline (lib/crm/pipeline.ts, etapeDevisSigne), sinon un dossier resterait « à facturer 0,01 € ».
  const tol = comptees.length
  const couvre = !!du && du > 0 && facture >= du - tol
  const regle = couvre && encaisse >= (du ?? 0) - tol
  const sansCentimes = (v: number) => (v <= tol ? 0 : v)
  // Ce qui est dû : sur un devis signé, ce qui reste à facturer plus ce qui est facturé (un supplément facturé au-delà du devis
  // compte) ; sans signature, seulement ce qui est facturé.
  const dette = signe ? Math.max(du ?? 0, facture) : facture
  return {
    acompteDouble,
    devis: du, signe, facture, encaisse,
    factureNonRegle: Math.max(0, facture - encaisse),
    resteAFacturer: signe ? sansCentimes(Math.max(0, (du ?? 0) - facture)) : null,
    resteAEncaisser: regle ? 0 : sansCentimes(Math.max(0, dette - encaisse)),
    couvre, regle,
    acompte: { pct, prevu: pct !== null && du !== null ? Math.round((du * pct) / 100) : null, facture: acFacture, recu: acRecu, factures: acNb },
    nbFactures: comptees.length,
  }
}
