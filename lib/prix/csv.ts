// Import d'un tarif fournisseur en CSV (v4 §8/F2).
//
// Un artisan n'exporte pas un fichier propre : il reçoit un CSV de son fournisseur, ou
// l'export d'un tableur, avec des points-virgules, des virgules décimales, des colonnes
// nommées « Libellé » ou « Désignation article » ou « ARTICLE », des lignes d'en-tête
// parasites et des prix écrits « 12,50 € ». Un parseur strict rejetterait tout ça et
// l'artisan abandonnerait — donc celui-ci est délibérément tolérant, et dit ce qu'il a
// compris pour que l'artisan puisse vérifier avant d'enregistrer.

export type LigneTarif = {
  designation: string
  unite: string
  prix_ht: number
  tva_taux: number
  fournisseur: string | null
  reference: string | null
}

export type Lecture = {
  lignes: LigneTarif[]
  colonnes: Record<string, string | null> // ce qu'on a reconnu, pour le montrer à l'artisan
  ignorees: number
  total: number
}

const sansAccent = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Les intitulés qu'on sait reconnaître, du plus précis au plus général.
const SYNONYMES: Record<string, string[]> = {
  designation: ['designation', 'designation article', 'libelle', 'libelle article', 'article', 'produit', 'description', 'nom'],
  prix_ht: ['prix ht', 'prix unitaire ht', 'prix net ht', 'prix net', 'pu ht', 'prix unitaire', 'tarif ht', 'tarif', 'prix'],
  unite: ['unite', 'un', 'uv', 'unite de vente', 'conditionnement'],
  reference: ['reference', 'ref', 'ref fournisseur', 'code article', 'code', 'ean', 'gencod'],
  fournisseur: ['fournisseur', 'marque', 'fabricant', 'distributeur'],
  tva_taux: ['tva', 'taux tva', 'tva %'],
}

/** Détecte le séparateur : celui qui découpe le plus régulièrement les premières lignes. */
function separateur(texte: string): string {
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim()).slice(0, 12)
  let meilleur = ';', score = -1
  for (const sep of [';', ',', '\t', '|']) {
    const comptes = lignes.map((l) => l.split(sep).length)
    const moy = comptes.reduce((a, b) => a + b, 0) / (comptes.length || 1)
    if (moy < 2) continue
    // Régularité : un vrai séparateur donne le même nombre de colonnes partout.
    const ecart = comptes.reduce((a, c) => a + Math.abs(c - moy), 0) / (comptes.length || 1)
    const s = moy - ecart * 3
    if (s > score) { score = s; meilleur = sep }
  }
  return meilleur
}

/** Découpe une ligne CSV en respectant les guillemets (un libellé peut contenir le séparateur). */
function decouper(ligne: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', dansGuillemets = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') { cur += '"'; i++ }
      else dansGuillemets = !dansGuillemets
    } else if (c === sep && !dansGuillemets) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** « 1 234,50 € » → 1234.5 ; « 12.50 » → 12.5 ; « » → null. */
export function lirePrix(brut: string): number | null {
  let s = String(brut).replace(/[€\s ]/g, '').trim()
  if (!s) return null
  // Format français : la virgule est décimale, le point sépare les milliers.
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export function lireCsv(texte: string, defauts: { fournisseur?: string | null; tva?: number } = {}): Lecture {
  const brut = texte.replace(/^﻿/, '') // BOM des exports Excel
  const sep = separateur(brut)
  const lignes = brut.split(/\r?\n/).filter((l) => l.trim())
  if (!lignes.length) return { lignes: [], colonnes: {}, ignorees: 0, total: 0 }

  // L'en-tête n'est pas toujours la première ligne (logo, titre, ligne vide…) :
  // on prend la première ligne où l'on reconnaît à la fois un libellé et un prix.
  let iEntete = -1
  let map: Record<string, number> = {}
  for (let i = 0; i < Math.min(lignes.length, 15); i++) {
    const cells = decouper(lignes[i], sep).map(sansAccent)
    const essai: Record<string, number> = {}
    for (const [champ, noms] of Object.entries(SYNONYMES)) {
      const idx = cells.findIndex((c) => noms.includes(c))
      if (idx >= 0) essai[champ] = idx
    }
    if (essai.designation !== undefined && essai.prix_ht !== undefined) { iEntete = i; map = essai; break }
  }
  // Aucun en-tête reconnu : on suppose « libellé ; prix » sur les deux premières colonnes.
  if (iEntete < 0) { iEntete = -1; map = { designation: 0, prix_ht: 1 } }

  const entete = iEntete >= 0 ? decouper(lignes[iEntete], sep) : []
  const colonnes: Record<string, string | null> = {}
  for (const champ of Object.keys(SYNONYMES)) {
    colonnes[champ] = map[champ] !== undefined ? (entete[map[champ]] ?? `colonne ${map[champ] + 1}`) : null
  }

  const out: LigneTarif[] = []
  let ignorees = 0, total = 0
  for (let i = iEntete + 1; i < lignes.length; i++) {
    const cells = decouper(lignes[i], sep)
    const designation = (cells[map.designation] ?? '').trim().slice(0, 300)
    const prix = lirePrix(cells[map.prix_ht] ?? '')
    total++
    if (!designation || prix === null) { ignorees++; continue }
    const tvaBrute = map.tva_taux !== undefined ? Number(String(cells[map.tva_taux]).replace(',', '.').replace('%', '')) : NaN
    out.push({
      designation,
      unite: (map.unite !== undefined ? (cells[map.unite] || '').trim().slice(0, 16) : '') || 'u',
      prix_ht: prix,
      tva_taux: [0, 5.5, 10, 20].includes(tvaBrute) ? tvaBrute : (defauts.tva ?? 10),
      fournisseur: (map.fournisseur !== undefined ? (cells[map.fournisseur] || '').trim().slice(0, 120) : '') || defauts.fournisseur || null,
      reference: (map.reference !== undefined ? (cells[map.reference] || '').trim().slice(0, 80) : '') || null,
    })
  }
  return { lignes: out, colonnes, ignorees, total }
}
