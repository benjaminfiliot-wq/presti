// lib/pilotage/theme.ts — le format de theme.json de la station et son validateur (fiche 026-173).
// Module PUR : aucune dépendance serveur, le même code valide au serveur (route des réglages, chargeur du thème) et à l'écran.
// Le schéma suivi est scripts/fixtures/026-pilotage/k/theme.schema.json (fiche 026-170), recopié ici en données car un module
// de lib/pilotage/ n'importe rien d'ailleurs. Rien ne porte de code ni d'adresse : chaque objet refuse tout champ inconnu.

/** La liste fermée des thèmes livrés (le thème d'essai `essai` n'existe que dans le juge ; le schéma, lui, l'accepte). */
export const CLES_THEME = ['station', 'vaisseau'] as const

/** Les 21 clés d'emplacement : les vingt salles et l'emplacement réservé E-commerce. */
export const CLES_EMPLACEMENT = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos', 'ecommerce'] as const
export const JETONS_PALETTE = ['--mc-fond', '--mc-sol', '--mc-mur', '--mc-coursive', '--mc-porte', '--mc-plaque', '--mc-ecran', '--mc-texte', '--mc-accent', '--mc-alerte'] as const
export const ETAPES_TAPIS = ['trouve', 'verifie', 'maquette', 'contacte', 'repondu', 'oui', 'en_ligne', 'paye'] as const

export type Point = { x: number; y: number }
export type Grille = { largeur: number; hauteur: number; pas: number }
export type Palette = {
  '--mc-fond': string; '--mc-sol': string; '--mc-mur': string; '--mc-coursive': string; '--mc-porte': string
  '--mc-plaque': string; '--mc-ecran': string; '--mc-texte': string; '--mc-accent': string; '--mc-alerte': string
}
export type Forme = { type: 'rectangle' | 'polygone'; x?: number; y?: number; l?: number; h?: number; points?: number[][] }
export type Emplacement = {
  cle: string
  forme: Forme
  porte: Point
  poste: Point | null
  plaque: { x: number; y: number; texte: string }
  teinte: string
  reservee: boolean
}
export type Noeud = { id: string; x: number; y: number; type: 'coursive' | 'ascenseur' | 'sas' }
export type Arete = { de: string; a: string; largeur: number }
export type Coursives = { noeuds: Noeud[]; aretes: Arete[] }
export type Tapis = { trace: Point[]; etapes: { cle: string; x: number; y: number }[] }
export type Portrait = { grille: Grille; emplacements: Emplacement[]; coursives: Coursives }
export type Theme = {
  cle: string
  nom: string
  version: number
  grille: Grille
  mise_en_page: 'colonnes' | 'flottante'
  palette: Palette
  emplacements: Emplacement[]
  coursives: Coursives
  tapis: Tapis
  defauts: { salle: string; emplacement: string }[]
  avatars: { cle: string; couleur: string }[]
  nuit: boolean
  portrait?: Portrait
}
export type VerdictTheme = { ok: true; theme: Theme } | { ok: false; raisons: string[] }

// ── Le schéma, en données (sous-ensemble de JSON Schema : type, required, enum, minimum, minItems, maxItems, pattern,
//    properties, items, additionalProperties:false), identique à celui de 026-170 ─────────────────────────────────────────
type Sch = {
  type?: string | string[]; enum?: readonly string[]; minimum?: number; minItems?: number; maxItems?: number; pattern?: string
  required?: readonly string[]; properties?: Record<string, Sch>; items?: Sch; additionalProperties?: boolean
}
const obj = (properties: Record<string, Sch>, required: readonly string[] = Object.keys(properties)): Sch => ({ type: 'object', required, additionalProperties: false, properties })
const tab = (items: Sch, minItems: number): Sch => ({ type: 'array', minItems, items })
const COULEUR: Sch = { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
const ENTIER: Sch = { type: 'integer', minimum: 0 }
const TEXTE: Sch = { type: 'string', pattern: '^(?!.*(?:[a-zA-Z][a-zA-Z0-9+.-]*:|//)).{1,60}$' }
const IDENT: Sch = { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,31}$' }
const CLE_EMPL: Sch = { type: 'string', enum: CLES_EMPLACEMENT }
const POINT: Sch = obj({ x: ENTIER, y: ENTIER })
const GRILLE: Sch = obj({ largeur: { type: 'integer', minimum: 16 }, hauteur: { type: 'integer', minimum: 16 }, pas: { type: 'integer', minimum: 1 } })
const EMPLACEMENT: Sch = obj({
  cle: CLE_EMPL,
  forme: obj({
    type: { type: 'string', enum: ['rectangle', 'polygone'] },
    x: ENTIER, y: ENTIER, l: { type: 'integer', minimum: 1 }, h: { type: 'integer', minimum: 1 },
    points: { type: 'array', minItems: 3, items: { type: 'array', minItems: 2, maxItems: 2, items: ENTIER } },
  }, ['type']),
  porte: POINT,
  poste: { ...POINT, type: ['object', 'null'] },
  plaque: obj({ x: ENTIER, y: ENTIER, texte: TEXTE }),
  teinte: COULEUR,
  reservee: { type: 'boolean' },
})
const COURSIVES: Sch = obj({
  noeuds: tab(obj({ id: IDENT, x: ENTIER, y: ENTIER, type: { type: 'string', enum: ['coursive', 'ascenseur', 'sas'] } }), 2),
  aretes: tab(obj({ de: IDENT, a: IDENT, largeur: { type: 'integer', minimum: 1 } }), 1),
})
const SCHEMA_THEME: Sch = obj({
  cle: { type: 'string', enum: ['station', 'vaisseau', 'essai'] },
  nom: TEXTE,
  version: { type: 'integer', minimum: 1 },
  grille: GRILLE,
  mise_en_page: { type: 'string', enum: ['colonnes', 'flottante'] },
  palette: obj({
    '--mc-fond': COULEUR, '--mc-sol': COULEUR, '--mc-mur': COULEUR, '--mc-coursive': COULEUR, '--mc-porte': COULEUR,
    '--mc-plaque': COULEUR, '--mc-ecran': COULEUR, '--mc-texte': COULEUR, '--mc-accent': COULEUR, '--mc-alerte': COULEUR,
  }),
  emplacements: tab(EMPLACEMENT, 21),
  coursives: COURSIVES,
  tapis: obj({
    trace: tab(POINT, 2),
    etapes: tab(obj({ cle: { type: 'string', enum: ETAPES_TAPIS }, x: ENTIER, y: ENTIER }), 1),
  }),
  defauts: tab(obj({ salle: CLE_EMPL, emplacement: CLE_EMPL }), 21),
  avatars: tab(obj({ cle: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,31}$' }, couleur: COULEUR }), 1),
  nuit: { type: 'boolean' },
  portrait: obj({ grille: GRILLE, emplacements: tab(EMPLACEMENT, 21), coursives: COURSIVES }),
}, ['cle', 'nom', 'version', 'grille', 'mise_en_page', 'palette', 'emplacements', 'coursives', 'tapis', 'defauts', 'avatars', 'nuit'])

const typeDe = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)
const estType = (v: unknown, t: string): boolean => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeDe(v) === t)
const aCle = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k)
const court = (v: unknown, n = 40): string => String(v).slice(0, n)

function verifierSchema(valeur: unknown, schema: Sch, chemin: string): string[] {
  const e: string[] = []
  const types = schema.type === undefined ? null : Array.isArray(schema.type) ? schema.type : [schema.type]
  if (types && !types.some(t => estType(valeur, t))) return [`${chemin} : type ${typeDe(valeur)}, ${types.join(' ou ')} attendu`]
  if (schema.enum && !schema.enum.includes(valeur as string)) e.push(`${chemin} : « ${court(valeur)} » hors de la liste (${schema.enum.slice(0, 4).join(', ')}…)`)
  if (typeof valeur === 'number' && schema.minimum !== undefined && valeur < schema.minimum) e.push(`${chemin} : ${valeur} est sous le minimum ${schema.minimum}`)
  if (typeof valeur === 'string' && schema.pattern && !new RegExp(schema.pattern, 'u').test(valeur)) e.push(`${chemin} : « ${court(valeur)} » ne respecte pas le motif attendu`)
  if (Array.isArray(valeur)) {
    if (schema.minItems !== undefined && valeur.length < schema.minItems) e.push(`${chemin} : ${valeur.length} élément(s), ${schema.minItems} au moins`)
    if (schema.maxItems !== undefined && valeur.length > schema.maxItems) e.push(`${chemin} : ${valeur.length} élément(s), ${schema.maxItems} au plus`)
    if (schema.items) valeur.forEach((x, i) => e.push(...verifierSchema(x, schema.items as Sch, `${chemin}[${i}]`)))
  }
  if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
    const o = valeur as Record<string, unknown>
    for (const k of schema.required ?? []) if (!aCle(o, k)) e.push(`${chemin} : champ « ${k} » manquant`)
    const props = schema.properties ?? {}
    if (schema.additionalProperties === false) for (const k of Object.keys(o)) if (!aCle(props, k)) e.push(`${chemin} : champ inconnu « ${court(k)} » refusé`)
    for (const [k, sous] of Object.entries(props)) if (aCle(o, k)) e.push(...verifierSchema(o[k], sous, `${chemin}.${k}`))
  }
  return e
}

// ── Les contraintes que le schéma ne dit pas en JSON Schema simple ───────────────────────────────────────────────────────
const RE_ADRESSE = /(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/
const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/
const chaines = (x: unknown, out: string[] = []): string[] => {
  if (typeof x === 'string') out.push(x)
  else if (x && typeof x === 'object') for (const v of Object.values(x)) chaines(v, out)
  return out
}
type Vue = { emplacements?: Emplacement[]; coursives?: Coursives }
function contraintesVue(nom: string, v: Vue): string[] {
  const e: string[] = []
  const emp = Array.isArray(v.emplacements) ? v.emplacements : []
  const cles = emp.map(x => x?.cle)
  for (const c of CLES_EMPLACEMENT) { const n = cles.filter(k => k === c).length; if (n !== 1) e.push(`${nom} : l'emplacement « ${c} » doit figurer une fois (${n})`) }
  const reservees = emp.filter(x => x?.reservee === true)
  if (reservees.length !== 1) e.push(`${nom} : ${reservees.length} emplacement(s) réservé(s), un et un seul attendu`)
  for (const r of reservees) if (r.poste !== null) e.push(`${nom} : l'emplacement réservé « ${r.cle} » porte un poste (il n'en a jamais)`)
  for (const x of emp) if (x?.reservee !== true && x?.poste === null) e.push(`${nom} : l'emplacement « ${x.cle} » n'est pas réservé et n'a pas de poste`)
  const noeuds = new Set((v.coursives?.noeuds ?? []).map(n => n.id))
  for (const a of v.coursives?.aretes ?? []) for (const k of [a.de, a.a]) if (!noeuds.has(k)) e.push(`${nom} : arête vers un nœud inconnu « ${court(k)} »`)
  return e
}
function contraintesTheme(t: any): string[] {
  const e: string[] = []
  if (!t || typeof t !== 'object') return ['theme : objet attendu']
  e.push(...contraintesVue('bureau', t))
  if (t.portrait) e.push(...contraintesVue('portrait', t.portrait))
  const defauts = new Map((Array.isArray(t.defauts) ? t.defauts : []).map((d: any) => [d?.salle, d?.emplacement]))
  for (const c of CLES_EMPLACEMENT) if (!defauts.has(c)) e.push(`defauts : la salle « ${c} » n'a pas d'emplacement par défaut`)
  if (!(Array.isArray(t.avatars) ? t.avatars : []).some((a: any) => a?.cle === 'defaut')) e.push('avatars : la clé « defaut » manque')
  const pas = t.grille?.pas ?? 1
  const trace: Point[] = Array.isArray(t.tapis?.trace) ? t.tapis.trace : []
  for (let i = 1; i < trace.length; i++) {
    const dx = Math.abs(trace[i].x - trace[i - 1].x), dy = Math.abs(trace[i].y - trace[i - 1].y)
    if (dx > pas || dy > pas || (dx === 0 && dy === 0)) { e.push(`tapis : le tracé saute entre les points ${i - 1} et ${i}`); break }
  }
  const surTrace = new Set(trace.map(p => `${p.x},${p.y}`))
  for (const s of Array.isArray(t.tapis?.etapes) ? t.tapis.etapes : []) if (!surTrace.has(`${s.x},${s.y}`)) e.push(`tapis : l'étape « ${court(s.cle)} » n'est pas sur le tracé`)
  for (const s of chaines(t)) if (RE_ADRESSE.test(s) && !RE_COULEUR.test(s)) e.push(`adresse ou schéma distant dans un texte : « ${court(s)} »`)
  return e
}

/**
 * Valide un theme.json lu. Ne jette jamais : toute entrée illisible est un refus avec ses raisons en français.
 * Accepte `cle: 'essai'` (le schéma le permet) ; seul le chargeur restreint à CLES_THEME.
 */
export function validerTheme(brut: unknown): VerdictTheme {
  let raisons: string[]
  try { raisons = [...verifierSchema(brut, SCHEMA_THEME, '$'), ...contraintesTheme(brut)] } catch (e) { raisons = [`theme illisible : ${court((e as Error)?.message ?? e, 80)}`] }
  return raisons.length ? { ok: false, raisons } : { ok: true, theme: brut as Theme }
}
