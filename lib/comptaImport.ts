// lib/comptaImport.ts — la comptabilité « tableaux de bord » (tâche 028-002).
//
// L'artisan dépose un tableur en désordre (export CSV de ses factures, dépenses, relevés). Ce module :
//   1. lit le texte (séparateur « ; », « , » ou tabulation détecté, guillemets gérés) ;
//   2. reconnaît les colonnes même mal nommées (« Nom Client », « Montant TTC », « Statut »…) ;
//   3. nettoie : dates en trois formats (et les dates Excel), montants « 1 234,50 € », doublons exacts,
//      lignes illisibles rejetées AVEC leur raison ;
//   4. produit les tableaux de bord : recettes, dépenses, bénéfice, impayés, dépenses par catégorie,
//      sources des clients, meilleurs clients, chiffres par mois, et un export CSV.
//
// Pur : aucun import, aucun réseau, aucune base, aucun fichier écrit. Il est importé par la page
// (app/controle/compta-tableaux) et par scripts/compta-video-qa.mjs (juge).
//
// Montants : entiers en centimes. Dates : « AAAA-MM-JJ », calendrier civil, sans fuseau.
// Franchise en base (art. 293 B du CGI) : Presti ne facture pas de TVA. La colonne TVA, si le fichier
// en a une, n'entre dans aucun total : elle n'est pas un montant dû.

export type Sens = 'recette' | 'depense'
export type ChampCanonique = 'date' | 'libelle' | 'tiers' | 'montant' | 'sens' | 'categorie' | 'statut' | 'source'
export type Statut = 'paye' | 'impaye' | 'non_renseigne'

export type Ligne = {
  ligne: number
  date: string
  libelle: string
  tiers: string
  sens: Sens
  /** Valeur absolue, en centimes. Un montant négatif est rejeté, jamais retourné. */
  montant: number
  categorie: string
  statut: Statut
  source: string
}
export type Rejet = { ligne: number; raison: string }
export type Colonne = { entete: string; champ: ChampCanonique | null }
export type Rapport = {
  /** Null si le fichier est exploitable. Sinon, la raison (pas de colonne date ou montant). */
  erreur: string | null
  colonnes: Colonne[]
  lignes: Ligne[]
  rejets: Rejet[]
  doublons: number
  lignesLues: number
  /** Vrai si le fichier n'a pas de colonne « sens » : le sens par défaut a été appliqué. */
  sensImpose: boolean
}
export type Options = { sensParDefaut?: Sens; colonnes?: Partial<Record<number, ChampCanonique | null>> }

export type Tableaux = {
  periode: { debut: string | null; fin: string | null }
  nombre: number
  recettes: number
  depenses: number
  benefice: number
  /** Bénéfice / recettes, en pour cent, une décimale. Null sans recette. */
  marge: number | null
  impayes: { nombre: number; montant: number }
  nonRenseigne: number
  depensesParCategorie: { categorie: string; montant: number; part: number | null }[]
  sourcesClients: { source: string; nombre: number; montant: number }[]
  meilleursClients: { tiers: string; montant: number }[]
  parMois: { mois: string; recettes: number; depenses: number; benefice: number }[]
  tva: { collectee: number; mention: string }
}

const MENTION_TVA = 'Franchise en base (art. 293 B du CGI) : aucune TVA facturée, rien à déduire. La colonne TVA d’un fichier n’entre dans aucun total.'

// Les noms de colonnes qu'un artisan écrit réellement. Comparés sans accents ni casse.
const SYNONYMES: Record<ChampCanonique, string[]> = {
  date: ['date', 'date facture', 'date de facture', 'date operation', 'jour', 'date paiement', 'date de paiement', 'date echeance'],
  libelle: ['libelle', 'description', 'objet', 'produit', 'prestation', 'designation', 'intitule', 'detail'],
  tiers: ['client', 'nom client', 'nom', 'fournisseur', 'tiers', 'beneficiaire', 'nom du client', 'nom fournisseur'],
  montant: ['montant', 'montant ttc', 'ttc', 'total', 'total ttc', 'montant euros', 'somme', 'prix', 'montant eur'],
  sens: ['sens', 'type', 'nature', 'flux', 'mouvement'],
  categorie: ['categorie', 'rubrique', 'famille', 'poste'],
  statut: ['statut', 'etat', 'paye', 'reglement', 'situation'],
  source: ['source', 'canal', 'origine', 'provenance', 'source prospect', 'lead source', 'comment nous a trouve'],
}

const RECETTES = ['recette', 'vente', 'encaissement', 'entree', 'credit', 'produit', 'revenu', 'facture client']
const DEPENSES = ['depense', 'achat', 'sortie', 'charge', 'debit', 'fournisseur']

function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const SYN_NORM: Record<ChampCanonique, string[]> = Object.fromEntries(
  (Object.keys(SYNONYMES) as ChampCanonique[]).map((c) => [c, SYNONYMES[c].map(normaliser)]),
) as Record<ChampCanonique, string[]>

/** Lit le texte d'un CSV. Le séparateur est celui qui apparaît le plus dans la première ligne. */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^\uFEFF/, '')
  const premiere = t.split(/\r?\n/, 1)[0] ?? ''
  const compte = (c: string) => premiere.split(c).length - 1
  let sep = ';'
  for (const c of [',', '\t']) if (compte(c) > compte(sep)) sep = c

  const lignes: string[][] = []
  let ligne: string[] = []
  let cellule = ''
  let guillemets = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') { cellule += '"'; i++ } else guillemets = false
      } else cellule += c
    } else if (c === '"') guillemets = true
    else if (c === sep) { ligne.push(cellule); cellule = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(cellule); cellule = ''
      lignes.push(ligne); ligne = []
    } else cellule += c
  }
  if (cellule !== '' || ligne.length > 0) { ligne.push(cellule); lignes.push(ligne) }
  return lignes.filter((l) => l.some((c) => c.trim() !== ''))
}

const JOURS_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function bissextile(a: number): boolean { return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0 }
function dateValide(a: number, m: number, j: number): string | null {
  if (m < 1 || m > 12 || j < 1) return null
  const max = m === 2 && bissextile(a) ? 29 : JOURS_MOIS[m - 1]
  if (j > max) return null
  return `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

/** « 2026-03-15 », « 15/03/2026 », « 15-03-26 », ou un numéro de série Excel (46000). Null si illisible. */
export function lireDate(v: string): string | null {
  const s = v.trim()
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (r) return dateValide(Number(r[1]), Number(r[2]), Number(r[3]))
  r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/.exec(s)
  if (r) {
    const a = r[3].length === 2 ? 2000 + Number(r[3]) : Number(r[3])
    return dateValide(a, Number(r[2]), Number(r[1]))
  }
  if (/^\d{5}$/.test(s)) {
    const n = Number(s)
    if (n >= 20000 && n <= 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
      return dateValide(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }
  }
  return null
}

/** « 1 234,50 € », « 1.234,50 », « 350.5 », « 29 » → centimes. Négatif (« -50 », « (50) ») → négatif. Null si illisible. */
export function lireMontantCentimes(v: string): number | null {
  let s = v.trim().replace(/[€$£\u00a0\u202f\s]/g, '')
  if (s === '') return null
  let negatif = false
  if (/^\(.*\)$/.test(s)) { negatif = true; s = s.slice(1, -1) }
  if (s.startsWith('-')) { negatif = true; s = s.slice(1) }
  if (s.includes(',') && s.includes('.')) {
    // Le dernier séparateur est la virgule décimale ; l'autre sépare les milliers.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) {
    if ((s.match(/,/g) ?? []).length !== 1) return null
    s = s.replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const c = Math.round(Number(s) * 100)
  return negatif ? -c : c
}

export function lireSens(v: string): Sens | null {
  const n = normaliser(v)
  if (RECETTES.includes(n)) return 'recette'
  if (DEPENSES.includes(n)) return 'depense'
  return null
}

/**
 * Le statut d'une facture. « Non payé », « impayé », « à payer », « en attente » → impayé.
 * « Payé », « payée », « réglé », « encaissé », « oui » → payé. Le reste n'est pas deviné.
 */
export function lireStatut(v: string): Statut {
  const n = normaliser(v)
  if (n === '') return 'non_renseigne'
  if (/\bnon\b|\bimpay|\battente?\b|\ba payer\b|\bretard\b|\brelance\b|\ben cours\b|\bdu\b/.test(n)) return 'impaye'
  if (/\bpaye|\bpayee\b|\breglee?\b|\bencaisse|\boui\b|\bok\b|\bvrai\b/.test(n)) return 'paye'
  return 'non_renseigne'
}

function formatEnTete(entete: string): ChampCanonique | null {
  const n = normaliser(entete)
  for (const c of Object.keys(SYN_NORM) as ChampCanonique[]) if (SYN_NORM[c].includes(n)) return c
  return null
}

function majuscule(s: string): string { return s.length ? s[0].toUpperCase() + s.slice(1) : s }

/** Le cœur : un texte désordonné → lignes propres, rejets nommés, doublons comptés. */
export function nettoyerTableur(texte: string, options: Options = {}): Rapport {
  const vide = (erreur: string | null, colonnes: Colonne[] = []): Rapport => ({
    erreur, colonnes, lignes: [], rejets: [], doublons: 0, lignesLues: 0, sensImpose: false,
  })
  const tableau = lireCsv(texte)
  if (tableau.length === 0) return vide('Fichier vide.')

  const [entetes, ...donnees] = tableau
  const colonnes: Colonne[] = entetes.map((e, i) => ({
    entete: e.trim(),
    champ: options.colonnes && Object.prototype.hasOwnProperty.call(options.colonnes, i)
      ? options.colonnes[i] ?? null : formatEnTete(e),
  }))
  // Une seule colonne par champ : la première gagne, les suivantes sont listées mais ignorées.
  const index: Partial<Record<ChampCanonique, number>> = {}
  colonnes.forEach((c, i) => { if (c.champ && index[c.champ] === undefined) index[c.champ] = i })
  if (index.date === undefined || index.montant === undefined) {
    return vide('Colonne « date » ou « montant » introuvable : renommez-la, ou ajoutez-la.', colonnes)
  }
  const sensImpose = index.sens === undefined
  const sensDefaut: Sens = options.sensParDefaut ?? 'recette'

  const lignes: Ligne[] = []
  const rejets: Rejet[] = []
  const vues = new Set<string>()
  let doublons = 0
  const cellule = (r: string[], c: ChampCanonique): string => {
    const i = index[c]
    return i === undefined ? '' : (r[i] ?? '').trim()
  }

  donnees.forEach((r, k) => {
    const numero = k + 2 // ligne dans le fichier : l'en-tête est la ligne 1
    const date = lireDate(cellule(r, 'date'))
    if (!date) { rejets.push({ ligne: numero, raison: `date illisible : « ${cellule(r, 'date')} »` }); return }
    const cents = lireMontantCentimes(cellule(r, 'montant'))
    if (cents === null) { rejets.push({ ligne: numero, raison: `montant illisible : « ${cellule(r, 'montant')} »` }); return }
    if (cents < 0) { rejets.push({ ligne: numero, raison: 'montant négatif : un remboursement s’écrit dans une ligne à part' }); return }
    let sens: Sens = sensDefaut
    if (!sensImpose) {
      const s = lireSens(cellule(r, 'sens'))
      if (!s) { rejets.push({ ligne: numero, raison: `sens inconnu : « ${cellule(r, 'sens')} » (recette ou dépense)` }); return }
      sens = s
    }
    const tiers = cellule(r, 'tiers') || 'Sans nom'
    const libelle = cellule(r, 'libelle')
    const cle = [date, sens, cents, normaliser(tiers), normaliser(libelle)].join('|')
    if (vues.has(cle)) { doublons++; return }
    vues.add(cle)
    lignes.push({
      ligne: numero,
      date,
      libelle,
      tiers,
      sens,
      montant: cents,
      categorie: majuscule(cellule(r, 'categorie')) || 'Sans catégorie',
      statut: index.statut === undefined ? 'non_renseigne' : lireStatut(cellule(r, 'statut')),
      source: cellule(r, 'source') || 'Non renseignée',
    })
  })

  return { erreur: null, colonnes, lignes, rejets, doublons, lignesLues: donnees.length, sensImpose }
}

/** Les tableaux de bord, calculés à partir des seules lignes nettoyées. */
export function tableauxDeBord(lignes: readonly Ligne[]): Tableaux {
  const dates = lignes.map((l) => l.date).sort()
  let recettes = 0
  let depenses = 0
  let impayesN = 0
  let impayesM = 0
  let nonRenseigne = 0
  const categories = new Map<string, number>()
  const sources = new Map<string, { nombre: number; montant: number }>()
  const clients = new Map<string, number>()
  const mois = new Map<string, { recettes: number; depenses: number }>()

  for (const l of lignes) {
    const m = l.date.slice(0, 7)
    const entree = mois.get(m) ?? { recettes: 0, depenses: 0 }
    if (l.sens === 'recette') {
      recettes += l.montant
      entree.recettes += l.montant
      if (l.statut === 'impaye') { impayesN++; impayesM += l.montant }
      const s = sources.get(l.source) ?? { nombre: 0, montant: 0 }
      s.nombre++; s.montant += l.montant
      sources.set(l.source, s)
      clients.set(l.tiers, (clients.get(l.tiers) ?? 0) + l.montant)
    } else {
      depenses += l.montant
      entree.depenses += l.montant
      categories.set(l.categorie, (categories.get(l.categorie) ?? 0) + l.montant)
    }
    if (l.statut === 'non_renseigne') nonRenseigne++
    mois.set(m, entree)
  }

  const benefice = recettes - depenses
  return {
    periode: { debut: dates[0] ?? null, fin: dates[dates.length - 1] ?? null },
    nombre: lignes.length,
    recettes,
    depenses,
    benefice,
    marge: recettes > 0 ? Math.round((benefice * 1000) / recettes) / 10 : null,
    impayes: { nombre: impayesN, montant: impayesM },
    nonRenseigne,
    depensesParCategorie: [...categories.entries()]
      .map(([categorie, montant]) => ({ categorie, montant, part: depenses > 0 ? Math.round((montant * 1000) / depenses) / 10 : null }))
      .sort((a, b) => b.montant - a.montant),
    sourcesClients: [...sources.entries()].map(([source, s]) => ({ source, ...s })).sort((a, b) => b.montant - a.montant),
    meilleursClients: [...clients.entries()].map(([tiers, montant]) => ({ tiers, montant })).sort((a, b) => b.montant - a.montant).slice(0, 5),
    parMois: [...mois.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([m, v]) => ({ mois: m, recettes: v.recettes, depenses: v.depenses, benefice: v.recettes - v.depenses })),
    tva: { collectee: 0, mention: MENTION_TVA },
  }
}

/** Un montant en centimes, à la française : « 1 551,50 € ». */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/** L'export CSV des tableaux (séparateur « ; », décimale virgule). */
export function exporterCsv(t: Tableaux): string {
  const e = (c: number) => (c / 100).toFixed(2).replace('.', ',')
  const lignes = [
    'Indicateur;Valeur',
    `Période;${t.periode.debut ?? ''} au ${t.periode.fin ?? ''}`,
    `Recettes (€);${e(t.recettes)}`,
    `Dépenses (€);${e(t.depenses)}`,
    `Bénéfice (€);${e(t.benefice)}`,
    `Marge (%);${t.marge === null ? '' : String(t.marge).replace('.', ',')}`,
    `Factures impayées (nombre);${t.impayes.nombre}`,
    `Factures impayées (€);${e(t.impayes.montant)}`,
    `TVA collectée (€);${e(t.tva.collectee)}`,
    '',
    'Dépenses par catégorie;Montant (€)',
    ...t.depensesParCategorie.map((c) => `${c.categorie};${e(c.montant)}`),
    '',
    'Mois;Recettes (€);Dépenses (€);Bénéfice (€)',
    ...t.parMois.map((m) => `${m.mois};${e(m.recettes)};${e(m.depenses)};${e(m.benefice)}`),
  ]
  return lignes.join('\n') + '\n'
}
