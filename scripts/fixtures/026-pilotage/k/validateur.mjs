// scripts/fixtures/026-pilotage/k/validateur.mjs — le validateur de theme.json (fiche 026-170, écrit par le juge).
// Il n'y a pas d'ajv dans le dépôt : ce module implémente le SOUS-ENSEMBLE de JSON Schema que k/theme.schema.json déclare
// (type — une chaîne ou une liste —, required, enum, minimum, minItems, maxItems, pattern, properties, items,
// additionalProperties:false), puis les contraintes « hors schéma » que le schéma annonce dans sa description et que le juge
// doit vérifier lui-même : un et un seul emplacement réservé, sans poste ; les 21 clés d'emplacement une fois ; `defauts`
// couvre les 21 salles ; `avatars` contient « defaut » ; les extrémités des arêtes existent ; le tracé du tapis est continu
// (deux points consécutifs à une case au plus) et porte chaque étape ; aucune adresse distante dans aucun texte.
//
//   validerSchema(valeur, schema)          → [messages]   (vide = valide)
//   contraintesTheme(theme)                → [messages]
//   validerTheme(theme, schema)            → [messages]   (les deux)
//   grilleDuTheme(theme, vue)              → { largeur, hauteur, pas }   (vue = 'bureau' | 'portrait')
const typeDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)
const estType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeDe(v) === t)

export function validerSchema(valeur, schema, chemin = '$') {
  const e = []
  const types = schema.type === undefined ? null : Array.isArray(schema.type) ? schema.type : [schema.type]
  if (types && !types.some((t) => estType(valeur, t))) return [`${chemin} : type ${typeDe(valeur)}, ${types.join(' ou ')} attendu`]
  if (schema.enum && !schema.enum.includes(valeur)) e.push(`${chemin} : « ${String(valeur).slice(0, 40)} » hors de la liste (${schema.enum.slice(0, 4).join(', ')}…)`)
  if (typeof valeur === 'number' && schema.minimum !== undefined && valeur < schema.minimum) e.push(`${chemin} : ${valeur} < minimum ${schema.minimum}`)
  if (typeof valeur === 'string' && schema.pattern && !new RegExp(schema.pattern, 'u').test(valeur)) e.push(`${chemin} : « ${valeur.slice(0, 40)} » ne respecte pas ${schema.pattern.slice(0, 40)}`)
  if (Array.isArray(valeur)) {
    if (schema.minItems !== undefined && valeur.length < schema.minItems) e.push(`${chemin} : ${valeur.length} élément(s), ${schema.minItems} au moins`)
    if (schema.maxItems !== undefined && valeur.length > schema.maxItems) e.push(`${chemin} : ${valeur.length} élément(s), ${schema.maxItems} au plus`)
    if (schema.items) valeur.forEach((x, i) => e.push(...validerSchema(x, schema.items, `${chemin}[${i}]`)))
  }
  if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
    for (const k of schema.required ?? []) if (!(k in valeur)) e.push(`${chemin} : champ « ${k} » manquant`)
    const props = schema.properties ?? {}
    if (schema.additionalProperties === false) for (const k of Object.keys(valeur)) if (!(k in props)) e.push(`${chemin} : champ inconnu « ${k} » refusé`)
    for (const [k, sous] of Object.entries(props)) if (k in valeur) e.push(...validerSchema(valeur[k], sous, `${chemin}.${k}`))
  }
  return e
}

const RE_ADRESSE = /(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/
const chainesDe = (x, out = []) => { if (typeof x === 'string') out.push(x); else if (x && typeof x === 'object') for (const v of Object.values(x)) chainesDe(v, out); return out }

/** Les contraintes du schéma qui ne s'écrivent pas en JSON Schema simple, pour UNE vue (le bureau, ou `portrait`). */
function contraintesVue(nom, v, cles21) {
  const e = []
  const emp = Array.isArray(v.emplacements) ? v.emplacements : []
  const cles = emp.map((x) => x?.cle)
  for (const c of cles21) if (cles.filter((k) => k === c).length !== 1) e.push(`${nom} : l'emplacement « ${c} » doit figurer une fois (${cles.filter((k) => k === c).length})`)
  const reservees = emp.filter((x) => x?.reservee === true)
  if (reservees.length !== 1) e.push(`${nom} : ${reservees.length} emplacement(s) réservé(s), un et un seul attendu`)
  for (const r of reservees) if (r.poste !== null) e.push(`${nom} : l'emplacement réservé « ${r.cle} » porte un poste (il n'en a jamais)`)
  for (const x of emp) if (x?.reservee !== true && x?.poste === null) e.push(`${nom} : l'emplacement « ${x.cle} » n'est pas réservé et n'a pas de poste`)
  const noeuds = new Set((v.coursives?.noeuds ?? []).map((n) => n.id))
  for (const a of v.coursives?.aretes ?? []) for (const k of [a.de, a.a]) if (!noeuds.has(k)) e.push(`${nom} : arête vers un nœud inconnu « ${k} »`)
  return e
}

export function contraintesTheme(t) {
  const e = []
  if (!t || typeof t !== 'object') return ['theme : objet attendu']
  const cles21 = (Array.isArray(t.emplacements) ? t.emplacements : []).map((x) => x?.cle)
  const ATTENDUES = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos', 'ecommerce']
  void cles21
  e.push(...contraintesVue('bureau', t, ATTENDUES))
  if (t.portrait) e.push(...contraintesVue('portrait', t.portrait, ATTENDUES))
  const defauts = new Map((t.defauts ?? []).map((d) => [d?.salle, d?.emplacement]))
  for (const c of ATTENDUES) if (!defauts.has(c)) e.push(`defauts : la salle « ${c} » n'a pas d'emplacement par défaut`)
  if (!(t.avatars ?? []).some((a) => a?.cle === 'defaut')) e.push('avatars : la clé « defaut » manque')
  const pas = t.grille?.pas ?? 1
  const trace = t.tapis?.trace ?? []
  for (let i = 1; i < trace.length; i++) {
    const dx = Math.abs(trace[i].x - trace[i - 1].x), dy = Math.abs(trace[i].y - trace[i - 1].y)
    if (dx > pas || dy > pas || (dx === 0 && dy === 0)) { e.push(`tapis : le tracé saute entre les points ${i - 1} et ${i}`); break }
  }
  const surTrace = new Set(trace.map((p) => `${p.x},${p.y}`))
  for (const s of t.tapis?.etapes ?? []) if (!surTrace.has(`${s.x},${s.y}`)) e.push(`tapis : l'étape « ${s.cle} » n'est pas sur le tracé`)
  for (const s of chainesDe(t)) if (RE_ADRESSE.test(s) && !/^#[0-9A-Fa-f]{6}$/.test(s)) e.push(`adresse ou schéma distant dans un texte : « ${s.slice(0, 40)} »`)
  return e
}

export const validerTheme = (theme, schema) => [...validerSchema(theme, schema), ...contraintesTheme(theme)]
export const grilleDuTheme = (t, vue = 'bureau') => (vue === 'portrait' && t.portrait ? t.portrait.grille : t.grille)
