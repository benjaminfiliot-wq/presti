// TYPES DE DEVIS ET DE FACTURES (demande du fondateur du 21/10/2026 : entreprises tous corps d'état, chantiers longs).
// Drapeaux `devisLots` et `facturesSituation` (lib/flags.ts), migration 0176. Module PUR : ni base, ni réseau — rejoué au centime
// près par scripts/types-devis-factures-qa.mjs. La base (lib/factureDepuisDevis.ts) lit, ce module calcule, la base revérifie
// (déclencheur factures_situation_verifier, 0176) : trois serrures pour une règle d'argent.
//
// DEVIS PAR LOTS — chaque ligne porte un `lot` (texte court). Le lot ne touche à AUCUN montant : il regroupe des lignes pour la
// lecture (titre + sous-total HT brut, avant remise). Les totaux du devis restent ceux de computeTotals (lib/devisTotals.ts) sur
// les mêmes lignes : un devis par lots et le même devis « simple » ont les mêmes totaux, au centime.
//
// SITUATION DE TRAVAUX — facture intermédiaire d'un devis signé. L'artisan donne l'avancement CUMULÉ à date, global (%) ou lot par
// lot. Montant de la situation = cumul à date × marché − tout ce qui est déjà facturé sur le devis (situations précédentes et
// acomptes, non annulés par un avoir). Présentation (celle d'une situation du bâtiment) : les travaux cumulés à date en lignes
// positives, puis une ligne négative par facture antérieure (quantité −1 et prix positif, comme la facture de solde : la norme
// EN 16931 refuse un prix net négatif, BR-27, pas une quantité négative). Le total de la pièce est donc ce qui reste à payer.
//
// Exactitude :
//  • le marché est réparti en « seaux » (taux de TVA, et lot en mode par lots) en CENTIMES ENTIERS, par la méthode du plus fort
//    reste : la somme des seaux est exactement le total HT du devis. À 100 %, la somme des factures du devis égale donc le
//    marché HT au centime (situation à 100 %, ou facture de solde) ;
//  • le cumul d'un seau est round(base × pct) : il ne décroît jamais quand le pourcentage croît, donc le cumul global non plus.
//
// Garde-fous (doublés en base) : cumul ≤ 100 % (global et par lot) ; avancement qui ne recule pas (global, par lot, et en montant) ;
// jamais plus que le marché ; rien à facturer → refus ; une facture complète ou de solde existe → plus de situation.
//
// RETENUE DE GARANTIE (loi n° 71-584, 5 % au plus) : PAS faite. La retenir sur le « net à payer » sans la suivre ensuite fausserait
// trois choses qui lisent `total_ttc` : les relances d'impayés (elles réclameraient la retenue avant l'échéance d'un an), le
// « payée » qui compte tout le TTC comme encaissé (lib/crm/argent.ts, « Mes chiffres ») et le Factur-X (EN 16931 n'a pas de champ
// pour une retenue qui n'est ni une remise ni un acompte). Il faut d'abord un état « retenue à libérer » (réception + 1 an, ou
// caution bancaire) : c'est un chantier à part.
import { computeTotals } from './devisTotals.ts'
import { couperTexte, type LigneNorm } from './lignes.ts'

export const TYPES_DEVIS = ['simple', 'lots'] as const
export type TypeDevis = (typeof TYPES_DEVIS)[number]
export const TYPES_FACTURE = ['standard', 'acompte', 'situation', 'solde'] as const
export type TypeFacture = (typeof TYPES_FACTURE)[number]
/** Libellés montrés à l'artisan (écran du devis, assistant). */
export const LIBELLES_FACTURE: Record<TypeFacture, string> = {
  standard: 'Facture', acompte: 'Facture d’acompte', situation: 'Situation de travaux', solde: 'Facture de solde',
}
/** Longueur maximale d'un nom de lot (contrainte de 0176). */
export const LOT_MAX = 80
/** Le lot des lignes sans lot, dans un devis par lots. */
export const HORS_LOT = 'Hors lot'

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : 0
}
/** 70.5 → « 70,5 » ; 5.5 → « 5,5 ». */
export const pctTexte = (n: number): string => String(round2(n)).replace('.', ',')
const dateFr = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '')

/** Un nom de lot propre : sans caractère de contrôle, espaces resserrés, 80 caractères au plus ; null s'il est vide. */
export function normaliserLot(v: unknown): string | null {
  if (typeof v !== 'string') return null
  // Coupé par CARACTÈRE (couperTexte, audit argent du 21/10, M2) : `.slice(0, 80)` coupait un émoji en deux, et la moitié
  // restante faisait refuser le JSON entier — le devis perdait toutes ses lignes à l'enregistrement.
  const t = couperTexte(v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(), LOT_MAX).trim()
  return t || null
}

/** Le type de devis demandé dans un corps de requête : null = non précisé (on garde celui qui est enregistré). */
export function typeDevisDemande(v: unknown): TypeDevis | null {
  return v === 'simple' || v === 'lots' ? v : null
}

/** Le type de facture demandé : null = non précisé (chemin d'avant : facture complète, ou solde si des acomptes existent). */
export function typeFactureDemande(v: unknown): TypeFacture | null | 'inconnu' {
  if (v === undefined || v === null || v === '') return null
  return (TYPES_FACTURE as readonly unknown[]).includes(v) ? (v as TypeFacture) : 'inconnu'
}

// ── Devis par lots : le regroupement ─────────────────────────────────────────────────────────────────────────────────────────

export type LigneLot = { lot?: string | null; quantite: number | string; prix_unitaire_ht: number | string }
export type GroupeLot<L> = { lot: string | null; lignes: L[]; sousTotalHt: number }

/** Les lignes par lot, dans l'ordre de première apparition ; les lignes sans lot forment un groupe `lot: null`. Sous-total HT
 *  BRUT (avant remise globale), comme la colonne « Total HT » des lignes. */
export function grouperParLots<L extends LigneLot>(lignes: readonly L[]): GroupeLot<L>[] {
  const ordre: GroupeLot<L>[] = []
  const index = new Map<string, GroupeLot<L>>()
  for (const l of lignes) {
    const cle = normaliserLot(l.lot) ?? ''
    let g = index.get(cle)
    if (!g) { g = { lot: cle || null, lignes: [], sousTotalHt: 0 }; index.set(cle, g); ordre.push(g) }
    g.lignes.push(l)
  }
  for (const g of ordre) g.sousTotalHt = round2(g.lignes.reduce((s, l) => s + num(l.quantite) * num(l.prix_unitaire_ht), 0))
  return ordre
}

/** « Regrouper les lignes » de l'éditeur : chaque lot d'un seul tenant, dans l'ordre de première apparition (tri stable). */
export function regrouperLignes<L extends { lot?: string | null }>(lignes: readonly L[]): L[] {
  const ordre: string[] = []
  const par = new Map<string, L[]>()
  for (const l of lignes) {
    const cle = normaliserLot(l.lot) ?? ''
    if (!par.has(cle)) { par.set(cle, []); ordre.push(cle) }
    par.get(cle)!.push(l)
  }
  return ordre.flatMap((c) => par.get(c)!)
}

/** Les noms de lots d'un devis, dans l'ordre. */
export function lotsDe(lignes: readonly { lot?: string | null }[]): string[] {
  return [...new Set(lignes.map((l) => normaliserLot(l.lot)).filter((x): x is string => !!x))]
}

/** Métier « tous corps d'état » ou rénovation multi-lots : l'éditeur propose « par lots » par défaut pour un nouveau devis. */
export function metierParLots(metier: string | null | undefined): boolean {
  const n = ` ${String(metier ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()} `
  return /\b(tous corps|tce|multi ?services?|multiservices|renovation|entreprise generale|batiment)\b/.test(n)
}

// ── Le marché en seaux ────────────────────────────────────────────────────────────────────────────────────────────────────────

export type LigneMarche = { lot?: string | null; quantite: unknown; prix_unitaire_ht: unknown; tva_taux: unknown }
export type Seau = { lot: string | null; taux: number; centimes: number }

/**
 * Le marché HT réparti en seaux (taux de TVA ; lot × taux en mode par lots), en centimes entiers dont la somme est EXACTEMENT le
 * total HT du devis (computeTotals, remise comprise). Plus fort reste : chaque seau reçoit le plancher de sa part exacte, les
 * centimes manquants vont aux plus grandes parties fractionnaires (à égalité, au premier seau rencontré).
 */
export function repartirMarche(lignes: readonly LigneMarche[], remisePct: number, parLot: boolean): Seau[] {
  const r = Math.max(0, Math.min(100, Number(remisePct) || 0)) / 100
  const calc = lignes.map((l) => ({ quantite: num(l.quantite), prix_unitaire_ht: num(l.prix_unitaire_ht), tva_taux: Number(l.tva_taux) || 0 }))
  const cible = Math.round(computeTotals(calc, remisePct).total_ht * 100)
  const exacts = new Map<string, { lot: string | null; taux: number; v: number; rang: number }>()
  lignes.forEach((l, i) => {
    const lot = parLot ? (normaliserLot(l.lot) ?? HORS_LOT) : null
    const taux = calc[i].tva_taux
    const cle = `${lot ?? ''}|${taux}`
    const s = exacts.get(cle) ?? { lot, taux, v: 0, rang: exacts.size }
    s.v += calc[i].quantite * calc[i].prix_unitaire_ht * (1 - r) * 100
    exacts.set(cle, s)
  })
  const seaux = [...exacts.values()].map((s) => { const p = Math.floor(s.v + 1e-7); return { lot: s.lot, taux: s.taux, centimes: p, frac: s.v - p, rang: s.rang } })
  let reste = cible - seaux.reduce((a, s) => a + s.centimes, 0)
  const parFrac = [...seaux].sort((a, b) => b.frac - a.frac || a.rang - b.rang)
  for (let i = 0; reste > 0 && parFrac.length; i = (i + 1) % parFrac.length) { parFrac[i].centimes++; reste-- }
  // Le cas inverse (cible sous la somme des planchers) n'arrive que par une erreur de virgule flottante : borné pour ne jamais boucler.
  const parFracInverse = [...parFrac].reverse()
  for (let i = 0, garde = 0; reste < 0 && parFracInverse.length && garde < 10 * parFracInverse.length; i = (i + 1) % parFracInverse.length, garde++) {
    if (parFracInverse[i].centimes > 0) { parFracInverse[i].centimes--; reste++ }
  }
  return seaux.map(({ lot, taux, centimes }) => ({ lot, taux, centimes }))
}

// ── Les factures déjà émises sur le devis ─────────────────────────────────────────────────────────────────────────────────────

export type NatureAnterieure = 'acompte' | 'situation' | 'complete'
export type LigneAnterieure = { designation?: unknown; quantite?: unknown; prix_unitaire_ht?: unknown; tva_taux?: unknown }
export type FactureAnterieure = {
  id: string; numero: string; date: string | null; nature: NatureAnterieure
  situation_numero?: number | null
  avancement_pct?: number | null
  avancement_lots?: Record<string, number> | null
  cumul_ht?: number | null
  marche_ht?: number | null
  remise_pct?: number | null
  lignes: readonly LigneAnterieure[]
}

/**
 * La nature d'une facture d'un devis. Une SITUATION se reconnaît à son type (0176) ou à son objet (« Situation n° … », le seul
 * chemin qui en crée). Un ACOMPTE, comme avant 0176, à ses lignes : toutes « Acompte … » (lib/factureDepuisDevis.ts les écrit
 * ainsi) — ou à son type. Tout le reste est une facture complète (ou de solde).
 */
export function natureDe(f: { type_facture?: string | null; objet?: string | null }, lignes: readonly LigneAnterieure[]): NatureAnterieure {
  if (f.type_facture === 'situation' || /^\s*situation n°/i.test(f.objet ?? '')) return 'situation'
  if (f.type_facture === 'acompte') return 'acompte'
  if (f.type_facture === 'standard' || f.type_facture === 'solde') return 'complete'
  // Une facture SANS LIGNE (celles scellées vides avant 0178) n'est pas un acompte : `every` sur une liste vide répondait « vrai »
  // (audit argent du 21/10, M4). C'est une facture complète : elle bloque la suite tant qu'un avoir ne l'a pas annulée.
  return lignes.length > 0 && lignes.every((l) => /^Acompte /.test(String(l.designation ?? ''))) ? 'acompte' : 'complete'
}

/**
 * Les lignes de DÉDUCTION des factures antérieures (facture de solde, situation). Un ACOMPTE garde exactement la rédaction et le
 * calcul d'avant 0176 (une ligne par ligne d'acompte, une par taux) ; une SITUATION est déduite par taux, de son montant net
 * (ses lignes positives moins ses propres déductions). Quantité −1, prix positif ; une part nulle n'écrit rien.
 */
export function lignesDeduction(anterieures: readonly FactureAnterieure[], franchise: boolean): LigneNorm[] {
  const out: LigneNorm[] = []
  for (const a of anterieures) {
    if (a.nature === 'acompte') {
      for (const l of a.lignes) {
        const taux = franchise ? 0 : Number(l.tva_taux) || 0
        const ht = Math.round(num(l.quantite) * num(l.prix_unitaire_ht) * 100) / 100
        if (ht > 0) out.push({ designation: `Déduction de l’acompte facturé ${a.numero}${a.date ? ` du ${dateFr(a.date)}` : ''}${a.lignes.length > 1 ? ` (TVA ${taux} %)` : ''}`, quantite: -1, unite: 'forfait', prix_unitaire_ht: ht, tva_taux: taux })
      }
    } else if (a.nature === 'situation') {
      const parTaux = new Map<number, number>()
      const r = Math.max(0, Math.min(100, Number(a.remise_pct) || 0)) / 100
      for (const l of a.lignes) {
        const taux = franchise ? 0 : Number(l.tva_taux) || 0
        parTaux.set(taux, (parTaux.get(taux) ?? 0) + num(l.quantite) * num(l.prix_unitaire_ht) * (1 - r))
      }
      for (const [taux, v] of parTaux) {
        const c = Math.round(v * 100)
        if (c === 0) continue
        const libelle = `${c > 0 ? 'Déduction' : 'Reprise'} de la situation n° ${a.situation_numero ?? '?'} ${a.numero}${a.date ? ` du ${dateFr(a.date)}` : ''}${parTaux.size > 1 ? ` (TVA ${pctTexte(taux)} %)` : ''}`
        out.push({ designation: libelle, quantite: c > 0 ? -1 : 1, unite: 'forfait', prix_unitaire_ht: Math.abs(c) / 100, tva_taux: taux })
      }
    }
  }
  return out
}

// ── La situation de travaux ───────────────────────────────────────────────────────────────────────────────────────────────────

export type AvancementDemande = { global?: unknown; lots?: Record<string, unknown> | null }
export type LigneFacturee = LigneNorm & { lot?: string }
export type DetailSituation = {
  mode: 'global' | 'lots'
  devis_numero: string
  marche_ht: number
  avancement_pct: number
  cumul_ht: number
  cumul_anterieur_ht: number
  cumul_anterieur_pct: number
  deja_facture_ht: number
  montant_ht: number
  lots?: { lot: string; marche_ht: number; pct: number; cumul_ht: number }[]
}
export type ResultatSituation =
  | {
    ok: true; numero: number; mode: 'global' | 'lots'
    avancementPct: number; avancementLots: Record<string, number> | null
    marcheHt: number; cumulHt: number; cumulAnterieurHt: number; cumulAnterieurPct: number; dejaFactureHt: number; montantHt: number
    lignes: LigneFacturee[]; totals: ReturnType<typeof computeTotals>; detail: DetailSituation
  }
  | { ok: false; status: 400 | 409 | 422 | 500; error: string }

/** Un pourcentage saisi (« 70 », « 70,5 », 70.5) arrondi à deux décimales ; null s'il n'est pas un nombre. */
export function lirePct(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null
  if (typeof v === 'string' && !v.trim()) return null
  const n = typeof v === 'number' ? v : Number(v.trim().replace(',', '.').replace(/\s*%$/, ''))
  return Number.isFinite(n) ? round2(n) : null
}

/** 450000 centimes → « 4 500,00 € » (espace des milliers). */
const eurTexte = (c: number) => `${(c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`

/**
 * Calcule une situation de travaux. `anterieures` : les factures COMPTÉES du devis (émises ou payées, ni avoir, ni visées par un
 * avoir), dans l'ordre d'émission. `numeroMax` : le plus grand numéro de situation jamais donné sur ce devis, annulées comprises
 * (le numéro suivant ne réutilise jamais celui d'une situation annulée).
 */
export function calculerSituation(p: {
  devisNumero: string
  remisePct: number
  lignesDevis: readonly LigneMarche[]
  franchise: boolean
  anterieures: readonly FactureAnterieure[]
  numeroMax: number
  avancement: AvancementDemande
}): ResultatSituation {
  const complete = p.anterieures.find((a) => a.nature === 'complete')
  if (complete) return { ok: false, status: 409, error: `Ce devis a déjà une facture complète ou de solde (${complete.numero}) : plus de situation possible. Pour reprendre la facturation par situations, émettez d’abord un avoir sur cette facture.` }
  if (!p.lignesDevis.length) return { ok: false, status: 409, error: 'Ce devis n’a aucune ligne : rien à facturer.' }

  const mode: 'global' | 'lots' = p.avancement.lots && typeof p.avancement.lots === 'object' ? 'lots' : 'global'
  const lotsDevis = [...new Set(p.lignesDevis.map((l) => normaliserLot(l.lot) ?? HORS_LOT))]
  if (mode === 'lots' && !p.lignesDevis.some((l) => normaliserLot(l.lot))) return { ok: false, status: 400, error: 'Ce devis n’est pas découpé en lots : saisissez un avancement global.' }

  const precedentes = p.anterieures.filter((a) => a.nature === 'situation')
  const modePrecedent = precedentes.length ? (precedentes.some((s) => s.avancement_lots && typeof s.avancement_lots === 'object') ? 'lots' : 'global') : null
  if (modePrecedent && modePrecedent !== mode) {
    return { ok: false, status: 409, error: `Les situations précédentes de ce devis sont saisies ${modePrecedent === 'lots' ? 'lot par lot' : 'en avancement global'} : gardez le même mode jusqu’au bout.` }
  }
  const derniere = precedentes.reduce<FactureAnterieure | null>((d, s) => (!d || (s.situation_numero ?? 0) > (d.situation_numero ?? 0) ? s : d), null)
  const pctPrecedent = precedentes.reduce((m, s) => Math.max(m, num(s.avancement_pct)), 0)
  const cumulPrecedent = precedentes.reduce((m, s) => Math.max(m, Math.round(num(s.cumul_ht) * 100)), 0)

  const seaux = repartirMarche(p.lignesDevis, p.remisePct, mode === 'lots')
  const marche = seaux.reduce((a, s) => a + s.centimes, 0)
  if (marche <= 0) return { ok: false, status: 409, error: 'Le marché de ce devis est nul : rien à facturer.' }
  const changee = precedentes.find((s) => s.marche_ht !== null && s.marche_ht !== undefined && Math.round(num(s.marche_ht) * 100) !== marche)
  if (changee) return { ok: false, status: 409, error: `Le montant du devis a changé depuis la situation n° ${changee.situation_numero ?? '?'} (${eurTexte(Math.round(num(changee.marche_ht) * 100))} HT, aujourd’hui ${eurTexte(marche)} HT) : les situations doivent porter sur le même marché. Revenez au devis signé, ou annulez les situations par un avoir.` }

  // Les pourcentages : global, ou un par lot (un lot non saisi garde son avancement précédent).
  let pctGlobal = 0
  let pctLots: Record<string, number> | null = null
  if (mode === 'global') {
    const v = lirePct(p.avancement.global)
    if (v === null) return { ok: false, status: 422, error: 'Avancement cumulé : un pourcentage est attendu (par exemple 70).' }
    if (v <= 0 || v > 100) return { ok: false, status: 422, error: `Avancement cumulé ${pctTexte(v)} % : il doit être compris entre 0 (exclu) et 100 %.` }
    if (v < pctPrecedent) return { ok: false, status: 409, error: `L’avancement ne peut pas reculer : la situation n° ${derniere?.situation_numero ?? '?'} était à ${pctTexte(pctPrecedent)} %, vous saisissez ${pctTexte(v)} %. L’avancement est CUMULÉ depuis le début du chantier.` }
    pctGlobal = v
  } else {
    const saisis = p.avancement.lots as Record<string, unknown>
    pctLots = {}
    // Un lot des situations précédentes qui n'existe plus sur le devis (renommé après une situation) : sans ce contrôle, son
    // avancement retombait à 0 et la base refusait avec un message obscur.
    const disparu = precedentes.flatMap((s) => Object.keys(s.avancement_lots ?? {})).find((lot) => !lotsDevis.includes(lot))
    if (disparu) return { ok: false, status: 409, error: `Le lot « ${disparu} » des situations précédentes n’existe plus sur le devis (renommé ?) : redonnez-lui son nom, ou annulez ces situations par un avoir.` }
    for (const cle of Object.keys(saisis)) {
      const lot = normaliserLot(cle) ?? HORS_LOT
      if (!lotsDevis.includes(lot)) return { ok: false, status: 400, error: `Lot inconnu sur ce devis : « ${lot} ».` }
    }
    for (const lot of lotsDevis) {
      const brut = Object.entries(saisis).find(([k]) => (normaliserLot(k) ?? HORS_LOT) === lot)?.[1]
      const avant = precedentes.reduce((m, s) => Math.max(m, num(s.avancement_lots?.[lot])), 0)
      // Non saisi (absent ou vide) : l'avancement précédent. Une saisie illisible (null, texte) est REFUSÉE, jamais prise pour « inchangé ».
      const v = brut === undefined || brut === '' ? avant : lirePct(brut)
      if (v === null) return { ok: false, status: 422, error: `Avancement du lot « ${lot} » : un pourcentage est attendu.` }
      if (v < 0 || v > 100) return { ok: false, status: 422, error: `Avancement du lot « ${lot} » : ${pctTexte(v)} %, il doit être compris entre 0 et 100 %.` }
      if (v < avant) return { ok: false, status: 409, error: `L’avancement du lot « ${lot} » ne peut pas reculer : il était à ${pctTexte(avant)} %, vous saisissez ${pctTexte(v)} %.` }
      pctLots[lot] = v
    }
    if (!Object.values(pctLots).some((v) => v > 0)) return { ok: false, status: 422, error: 'Aucun lot n’a avancé : saisissez au moins un avancement supérieur à 0 %.' }
  }

  // Le cumul à date, seau par seau : round(base × pct), en centimes.
  const cumulSeau = (s: Seau) => {
    const pct = mode === 'global' ? pctGlobal : (pctLots![s.lot ?? HORS_LOT] ?? 0)
    return Math.round((s.centimes * Math.round(pct * 100)) / 10000)
  }
  const cumuls = seaux.map((s) => ({ ...s, cumul: cumulSeau(s) }))
  const cumul = cumuls.reduce((a, s) => a + s.cumul, 0)
  if (cumul > marche) return { ok: false, status: 409, error: 'Le cumul dépasserait le montant du devis.' }
  if (cumul < cumulPrecedent) return { ok: false, status: 409, error: `Le cumul des travaux ne peut pas reculer : ${eurTexte(cumulPrecedent)} HT à la situation n° ${derniere?.situation_numero ?? '?'}, ${eurTexte(cumul)} HT aujourd’hui.` }
  const avancementPct = mode === 'global' ? pctGlobal : round2((cumul / marche) * 100)

  // Ce qui est déjà facturé : les situations précédentes, déduites par taux de leur montant net ; les ACOMPTES, imputés au
  // prorata du cumul de CHAQUE taux à date, jamais au-delà (audit argent du 21/10, M1 : déduits à leur propre ventilation, un
  // acompte faisait une TVA négative sur un taux que les travaux n'avaient pas encore atteint).
  const dedSituations = lignesDeduction(p.anterieures.filter((a) => a.nature === 'situation'), p.franchise)
  const acomptes = p.anterieures.filter((a) => a.nature === 'acompte')
  const totalAcomptes = acomptes.reduce((s, a) => s + a.lignes.reduce((t, l) => t + Math.round(num(l.quantite) * num(l.prix_unitaire_ht) * 100), 0), 0)
  const deja = totalAcomptes + dedSituations.reduce((a, l) => a + Math.round(-l.quantite * l.prix_unitaire_ht * 100), 0)
  const montant = cumul - deja
  if (montant <= 0) {
    return { ok: false, status: 409, error: `Rien à facturer : ${eurTexte(deja)} HT sont déjà facturés sur ce devis, pour ${eurTexte(cumul)} HT de travaux cumulés à ${pctTexte(avancementPct)} %.` }
  }
  const cumulParTaux = new Map<number, number>()
  for (const s of cumuls) cumulParTaux.set(s.taux, (cumulParTaux.get(s.taux) ?? 0) + s.cumul)
  const dedAcomptes: LigneFacturee[] = []
  if (totalAcomptes > 0) {
    // Plus fort reste, plafonné au cumul du taux (l'acompte total est inférieur au cumul : sinon « rien à facturer » plus haut).
    const parts = [...cumulParTaux.entries()].map(([taux, cr], rang) => { const exact = (totalAcomptes * cr) / cumul; const p0 = Math.floor(exact + 1e-9); return { taux, cr, part: p0, frac: exact - p0, rang } })
    let reste = totalAcomptes - parts.reduce((a, x) => a + x.part, 0)
    for (const x of [...parts].sort((a, b) => b.frac - a.frac || a.rang - b.rang)) { if (reste <= 0) break; if (x.part < x.cr) { x.part++; reste-- } }
    if (reste !== 0 || parts.some((x) => x.part > x.cr)) return { ok: false, status: 500, error: 'Écart de calcul sur l’imputation de l’acompte : rien n’a été émis.' }
    const refs = acomptes.map((a) => `${a.numero}${a.date ? ` du ${dateFr(a.date)}` : ''}`).join(', ')
    for (const x of parts) {
      if (x.part <= 0) continue
      dedAcomptes.push({ designation: `Déduction ${acomptes.length > 1 ? 'des acomptes facturés' : 'de l’acompte facturé'} ${refs}${parts.filter((y) => y.part > 0).length > 1 ? ` (TVA ${pctTexte(x.taux)} %)` : ''}`.slice(0, 300), quantite: -1, unite: 'forfait', prix_unitaire_ht: x.part / 100, tva_taux: x.taux })
    }
  }
  const deductions: LigneFacturee[] = [...dedAcomptes, ...dedSituations]
  if (deja + montant > marche) return { ok: false, status: 409, error: 'Cette situation ferait facturer plus que le devis.' }

  const tauxDuLot = new Map<string, Set<number>>()
  for (const s of cumuls) { const k = s.lot ?? ''; tauxDuLot.set(k, (tauxDuLot.get(k) ?? new Set()).add(s.taux)) }
  const plusieursTaux = new Set(cumuls.map((s) => s.taux)).size > 1
  const positives: LigneFacturee[] = cumuls.filter((s) => s.cumul > 0).map((s) => {
    const partTva = (mode === 'global' ? plusieursTaux : (tauxDuLot.get(s.lot ?? '')?.size ?? 0) > 1) ? ` (part soumise à TVA ${pctTexte(s.taux)} %)` : ''
    const designation = mode === 'global'
      ? `Travaux réalisés — devis ${p.devisNumero} : avancement cumulé ${pctTexte(pctGlobal)} % du marché${partTva}`
      : `${s.lot} : avancement cumulé ${pctTexte(pctLots![s.lot ?? HORS_LOT] ?? 0)} %${partTva}`
    return { designation: designation.slice(0, 300), quantite: 1, unite: 'forfait', prix_unitaire_ht: s.cumul / 100, tva_taux: s.taux, ...(mode === 'lots' && s.lot ? { lot: s.lot } : {}) }
  })
  const lignes: LigneFacturee[] = [...positives, ...deductions]
  const totals = computeTotals(lignes, 0)
  if (Math.round(totals.total_ht * 100) !== montant) return { ok: false, status: 500, error: 'Écart de calcul sur la situation : rien n’a été émis.' }

  const cumulAnterieurHt = derniere ? Math.round(num(derniere.cumul_ht) * 100) / 100 : 0
  const parLot = mode === 'lots'
    ? lotsDevis.map((lot) => {
      const ss = cumuls.filter((s) => (s.lot ?? HORS_LOT) === lot)
      return { lot, marche_ht: ss.reduce((a, s) => a + s.centimes, 0) / 100, pct: pctLots![lot] ?? 0, cumul_ht: ss.reduce((a, s) => a + s.cumul, 0) / 100 }
    })
    : undefined
  const detail: DetailSituation = {
    mode, devis_numero: p.devisNumero, marche_ht: marche / 100, avancement_pct: avancementPct, cumul_ht: cumul / 100,
    cumul_anterieur_ht: cumulAnterieurHt, cumul_anterieur_pct: derniere ? num(derniere.avancement_pct) : 0,
    deja_facture_ht: deja / 100, montant_ht: montant / 100, ...(parLot ? { lots: parLot } : {}),
  }
  return {
    ok: true, numero: Math.max(0, Math.floor(num(p.numeroMax))) + 1, mode,
    avancementPct, avancementLots: pctLots,
    marcheHt: marche / 100, cumulHt: cumul / 100, cumulAnterieurHt, cumulAnterieurPct: detail.cumul_anterieur_pct,
    dejaFactureHt: deja / 100, montantHt: montant / 100,
    lignes, totals, detail,
  }
}

/** Lit le détail figé d'une situation (colonne `situation_detail`, 0176) ; null s'il est absent ou mal formé. */
export function lireDetailSituation(v: unknown): DetailSituation | null {
  if (!v || typeof v !== 'object') return null
  const d = v as Record<string, unknown>
  if (typeof d.devis_numero !== 'string' || typeof d.marche_ht !== 'number' || typeof d.cumul_ht !== 'number' || typeof d.montant_ht !== 'number') return null
  return {
    mode: d.mode === 'lots' ? 'lots' : 'global', devis_numero: d.devis_numero, marche_ht: d.marche_ht,
    avancement_pct: num(d.avancement_pct), cumul_ht: d.cumul_ht, cumul_anterieur_ht: num(d.cumul_anterieur_ht),
    cumul_anterieur_pct: num(d.cumul_anterieur_pct), deja_facture_ht: num(d.deja_facture_ht), montant_ht: d.montant_ht,
    ...(Array.isArray(d.lots) ? { lots: (d.lots as Record<string, unknown>[]).filter((x) => x && typeof x.lot === 'string').map((x) => ({ lot: String(x.lot), marche_ht: num(x.marche_ht), pct: num(x.pct), cumul_ht: num(x.cumul_ht) })) } : {}),
  }
}

/**
 * La note d'une situation de travaux dans le XML de facture électronique (BT-22) : les mêmes mentions que le PDF. Le lot, lui,
 * n'a pas de champ dans EN 16931 : il reste dans la désignation des lignes de la situation (« Lot 1 — Démolition : … »). Le type
 * de document reste 380 (facture) pour une situation comme pour un solde : UNTDID 1001 n'a pas de code « situation ».
 */
export function noteSituationFacturX(numero: number | null | undefined, d: DetailSituation): string {
  const e = (n: number) => `${n.toFixed(2)} EUR`
  return `Situation de travaux n° ${numero ?? '?'} — devis ${d.devis_numero}, marché ${e(d.marche_ht)} HT ; cumul antérieur ${e(d.cumul_anterieur_ht)} HT (${pctTexte(d.cumul_anterieur_pct)} %) ; cumul à date ${e(d.cumul_ht)} HT (${pctTexte(d.avancement_pct)} %) ; déjà facturé ${e(d.deja_facture_ht)} HT ; montant de cette situation ${e(d.montant_ht)} HT.`
}
