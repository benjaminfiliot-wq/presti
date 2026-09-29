import { createHash } from 'node:crypto'

export const CLASSES = ['public', 'interne', 'prospects'] as const
export type Classe = typeof CLASSES[number]
export type Passage = { id: string; passage_id?: string; racine?: string; chemin: string; classe: Classe; debut: number; fin: number; texte: string }

const VIDES = new Set('le la les un une des de du et ou au aux en pour par sur dans avec sans ce ces cet cette qui que qu quoi quel quelle quels quelles est sont etre ete se sa son ses leur leurs il elle ils elles on nous vous je tu ne pas plus lui me te mon ma mes ton ta tes notre nos votre vos the of and to in is it'.split(' '))
export function normaliser(texte: string): string[] {
  return texte.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(x => x.length >= 2 && !VIDES.has(x)).map(x => x.length > 3 && (x.endsWith('x') || (x.endsWith('s') && !x.endsWith('ss'))) ? x.slice(0, -1) : x)
}
const empreinte = (s: string) => createHash('sha256').update(s).digest('hex')
export function decouper(cheminOuTexte: string, texteOuOptions?: string | { classe?: Classe; racine?: string }, options: { classe?: Classe; racine?: string } = {}): Passage[] {
  const chemin = typeof texteOuOptions === 'string' ? cheminOuTexte : ''
  const texte = typeof texteOuOptions === 'string' ? texteOuOptions : cheminOuTexte
  const opts = typeof texteOuOptions === 'string' ? options : (texteOuOptions || {})
  if (!texte) return []
  const lignes = texte.split('\n'), sortie: Passage[] = []
  const ajouter = (debut: number, fin: number, contenu: string) => {
    if (!contenu.trim()) return
    const id = empreinte(`${chemin}${debut}${contenu}`).slice(0, 16)
    sortie.push({ id, passage_id: id, chemin, racine: opts.racine, classe: opts.classe || 'interne', debut, fin, texte: contenu })
  }
  let debut = 0, bloc: string[] = []
  const vider = () => { if (bloc.length) ajouter(debut, debut + bloc.length - 1, bloc.join('\n')); bloc = [] }
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i]
    if (!ligne.trim()) { vider(); continue }
    if (/^#{1,6}\s/.test(ligne)) vider()
    if (ligne.length > 1200) {
      vider()
      for (let j = 0; j < ligne.length; j += 1200) ajouter(i + 1, i + 1, ligne.slice(j, j + 1200))
      continue
    }
    if (bloc.length && bloc.join('\n').length + 1 + ligne.length > 1200) vider()
    if (!bloc.length) debut = i + 1
    bloc.push(ligne)
  }
  vider()
  return sortie
}
export function construireIndex(passages: Array<Passage | { chemin: string; classe: Classe; texte: string; racine?: string }>): string {
  const documents = passages.flatMap(p => 'debut' in p ? [p as Passage] : decouper(p.chemin, p.texte, { classe: p.classe, racine: p.racine }))
  const uniques = new Map<string, Passage>()
  for (const p of documents) uniques.set(p.id || empreinte(`${p.chemin}${p.debut}${p.texte}`).slice(0, 16), p)
  const tries = [...uniques.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return JSON.stringify({ version: 1, passages: tries.map(p => ({ id: p.id, racine: p.racine ?? p.chemin.split(':')[0] ?? '', chemin: p.chemin, classe: p.classe, debut: p.debut, fin: p.fin, texte: p.texte, termes: normaliser(p.texte) })) })
}
export function chercherIndex(index: string, question: string, options: { k?: number; limite?: number; classes?: Classe[] } = {}) {
  const docs = (JSON.parse(index) as { passages: Array<Passage & { termes: string[] }> }).passages
  const termes = [...new Set(normaliser(question))]
  const N = docs.length, moyenne = docs.reduce((s, p) => s + p.termes.length, 0) / (N || 1)
  const df = new Map(termes.map(t => [t, docs.filter(p => p.termes.includes(t)).length]))
  return docs.filter(p => !options.classes || options.classes.includes(p.classe)).map(p => {
    const freq = new Map<string, number>()
    for (const t of p.termes) freq.set(t, (freq.get(t) || 0) + 1)
    const score = termes.reduce((s, t) => { const f = freq.get(t) || 0; return s + (f ? Math.log(1 + (N - (df.get(t) || 0) + .5) / ((df.get(t) || 0) + .5)) * f * 2.2 / (f + 1.2 * (.25 + .75 * p.termes.length / (moyenne || 1))) : 0) }, 0)
    return { passage_id: p.id, racine: p.racine, chemin: p.chemin, classe: p.classe, debut: p.debut, fin: p.fin, extrait: p.texte.slice(0, 600), texte: p.texte, score }
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score || a.passage_id.localeCompare(b.passage_id, 'en')).slice(0, options.k ?? options.limite ?? 20)
}
function luhn(valeur: string) { const ds = valeur.replace(/\D/g, ''); let somme = 0; for (let i = ds.length - 1, rang = 0; i >= 0; i--, rang++) { let n = Number(ds[i]); if (rang % 2) { n *= 2; if (n > 9) n -= 9 } somme += n } return somme % 10 === 0 }
export function caviarder(texte: string): { texte: string; caviardages: number } {
  let caviardages = 0
  for (const [motif, remplacement, verifie] of [
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[adresse]', false],
    [/(?<!\d)(?:\+33[\s.]?|0)[1-9](?:[\s.]?\d{2}){4}(?!\d)/g, '[numéro]', false],
    [/(?<!\d)\d{3}[ .\u00a0]?\d{3}[ .\u00a0]?\d{3}(?:[ .\u00a0]?\d{5})?(?!\d)/g, '[siren]', true],
  ] as const) texte = texte.replace(motif, v => { if (verifie && !luhn(v)) return v; caviardages++; return remplacement })
  return { texte, caviardages }
}
export function fusionnerScores(listes: Array<Array<{ id: string }>>, k = 60): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>()
  for (const liste of listes) liste.forEach((x, rang) => scores.set(x.id, (scores.get(x.id) || 0) + 1 / (k + rang + 1)))
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'))
}
