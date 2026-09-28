// TÉMOIN (026-229) de lib/savoir/index.ts, jugé par SVS-9 : un index plein texte BM25 en TypeScript pur, sans
// dépendance, déterministe octet pour octet. Contrat exact : scripts/fixtures/026/savoir/socle/questions.json.

export const CLASSES = ['public', 'interne', 'prospects'] as const
export type Classe = (typeof CLASSES)[number]
export interface DocumentSavoir { chemin: string; classe: Classe; texte: string }
export interface Passage { debut: number; fin: number; texte: string }
export interface Resultat { chemin: string; classe: Classe; debut: number; fin: number; score: number; texte: string }
interface PassageIndexe { chemin: string; classe: Classe; debut: number; fin: number; longueur: number; texte: string }
interface IndexSerialise { version: 1; k1: number; b: number; n: number; moyenne: number; passages: PassageIndexe[]; termes: Record<string, Array<[number, number]>> }

const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'au', 'aux', 'en', 'pour', 'par', 'sur', 'dans', 'avec', 'sans',
  'ce', 'ces', 'cet', 'cette', 'qui', 'que', 'qu', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'est', 'sont', 'etre', 'ete',
  'se', 'sa', 'son', 'ses', 'leur', 'leurs', 'il', 'elle', 'ils', 'elles', 'on', 'nous', 'vous', 'je', 'tu', 'ne', 'pas', 'plus',
  'lui', 'me', 'te', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'nos', 'votre', 'vos', 'the', 'of', 'and', 'to', 'in', 'is', 'it',
])
const MAX_PASSAGE = 1200
const K1 = 1.2
const B = 0.75
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function normaliser(texte: string): string[] {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !MOTS_VIDES.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t.length > 3 && t.endsWith('x') ? t.slice(0, -1) : t))
}

/** Passages de lignes entières (1 200 signes au plus) ; une ligne plus longue est coupée en morceaux sur elle-même. */
export function decouper(texte: string, max: number = MAX_PASSAGE): Passage[] {
  const lignes = texte.split('\n')
  const passages: Passage[] = []
  let debut = 0
  let fin = 0
  let taille = 0
  const fermer = (): void => {
    if (!debut) return
    let f = fin
    while (f > debut && lignes[f - 1].trim() === '') f--
    passages.push({ debut, fin: f, texte: lignes.slice(debut - 1, f).join('\n') })
    debut = 0
    fin = 0
    taille = 0
  }
  for (let i = 1; i <= lignes.length; i++) {
    const l = lignes[i - 1]
    if (l.length > max) {
      fermer()
      for (let k = 0; k < l.length; k += max) passages.push({ debut: i, fin: i, texte: l.slice(k, k + max) })
      continue
    }
    if (!debut) {
      if (l.trim() === '') continue
      debut = i
      fin = i
      taille = l.length
      continue
    }
    if (taille + 1 + l.length > max) {
      fermer()
      if (l.trim() === '') continue
      debut = i
      fin = i
      taille = l.length
      continue
    }
    fin = i
    taille += 1 + l.length
  }
  fermer()
  return passages
}

export function construireIndex(documents: readonly DocumentSavoir[]): string {
  const tries = [...documents].sort((a, b) => compare(a.chemin, b.chemin) || compare(a.texte, b.texte))
  const passages: PassageIndexe[] = []
  const postings = new Map<string, Array<[number, number]>>()
  for (const d of tries) {
    if (!(CLASSES as readonly string[]).includes(d.classe)) throw new Error(`classe inconnue : ${d.classe}`)
    for (const p of decouper(d.texte)) {
      const jetons = normaliser(p.texte)
      const i = passages.length
      passages.push({ chemin: d.chemin, classe: d.classe, debut: p.debut, fin: p.fin, longueur: jetons.length, texte: p.texte })
      const tf = new Map<string, number>()
      for (const t of jetons) tf.set(t, (tf.get(t) ?? 0) + 1)
      for (const [t, n] of tf) {
        const liste = postings.get(t)
        if (liste) liste.push([i, n])
        else postings.set(t, [[i, n]])
      }
    }
  }
  const termes: Record<string, Array<[number, number]>> = {}
  for (const t of [...postings.keys()].sort(compare)) termes[t] = postings.get(t) ?? []
  const total = passages.reduce((s, p) => s + p.longueur, 0)
  const index: IndexSerialise = { version: 1, k1: K1, b: B, n: passages.length, moyenne: passages.length ? total / passages.length : 0, passages, termes }
  return JSON.stringify(index)
}

export function chercherIndex(index: string, question: string, options: { classes?: readonly string[]; limite?: number } = {}): Resultat[] {
  const I = JSON.parse(index) as IndexSerialise
  const scores = new Map<number, number>()
  for (const t of new Set(normaliser(question))) {
    if (!Object.hasOwn(I.termes, t)) continue
    const liste = I.termes[t]
    const idf = Math.log(1 + (I.n - liste.length + 0.5) / (liste.length + 0.5))
    for (const [i, tf] of liste) {
      const p = I.passages[i]
      if (options.classes && !options.classes.includes(p.classe)) continue
      const s = (idf * tf * (I.k1 + 1)) / (tf + I.k1 * (1 - I.b + (I.b * p.longueur) / (I.moyenne || 1)))
      scores.set(i, (scores.get(i) ?? 0) + s)
    }
  }
  return [...scores]
    .map(([i, score]): Resultat => { const p = I.passages[i]; return { chemin: p.chemin, classe: p.classe, debut: p.debut, fin: p.fin, score, texte: p.texte } })
    .sort((a, b) => b.score - a.score || compare(a.chemin, b.chemin) || a.debut - b.debut)
    .slice(0, options.limite ?? 10)
}

const REGLES: ReadonlyArray<{ re: RegExp; par: string; luhn: boolean }> = [
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, par: '[adresse]', luhn: false },
  { re: /(?<!\d)(?:\+33[\s.]?|0)[1-9](?:[\s.]?\d{2}){4}(?!\d)/g, par: '[numéro]', luhn: false },
  { re: /(?<!\d)\d{3}[ . ]?\d{3}[ . ]?\d{3}(?:[ . ]?\d{5})?(?!\d)/g, par: '[siren]', luhn: true },
]
function luhn(chiffres: string): boolean {
  let t = 0
  for (let i = 0; i < chiffres.length; i++) {
    let d = Number(chiffres[chiffres.length - 1 - i])
    if (i % 2) { d *= 2; if (d > 9) d -= 9 }
    t += d
  }
  return chiffres.length > 0 && t % 10 === 0
}
/** Les règles de docs/savoir/sources.json (adresse, numéro, SIREN/SIRET valide selon Luhn), dans cet ordre. */
export function caviarder(texte: string): { texte: string; caviardages: number } {
  let n = 0
  let t = texte
  for (const r of REGLES) {
    t = t.replace(r.re, (m) => {
      if (r.luhn && !luhn(m.replace(/\D/g, ''))) return m
      n++
      return r.par
    })
  }
  return { texte: t, caviardages: n }
}

/** Fusion par rang réciproque : score = somme de 1 / (k + rang), rang à partir de 1 ; un id compté une fois par liste. */
export function fusionnerScores(listes: ReadonlyArray<ReadonlyArray<{ id: string }>>, k: number = 60): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>()
  for (const liste of listes) {
    const vus = new Set<string>()
    liste.forEach((e, rang) => {
      if (vus.has(e.id)) return
      vus.add(e.id)
      scores.set(e.id, (scores.get(e.id) ?? 0) + 1 / (k + rang + 1))
    })
  }
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || compare(a.id, b.id))
}
