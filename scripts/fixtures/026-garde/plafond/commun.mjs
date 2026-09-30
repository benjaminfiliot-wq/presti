// scripts/fixtures/026-garde/plafond/commun.mjs — les outils partagés du juge garde-plafond-qa et des contrôles de son lot
// (plafond de 0 € par agent, mécanisé ; écrit par Claude Code). Ils ne jugent rien seuls : lecture de fichiers d'une racine,
// lecture de SQL (commentaires ôtés, arguments d'un appel), jetons d'identifiants, inventaire des appels à un fournisseur.
// Aucune écriture, aucun réseau, aucun secret : tout se lit sous la racine jugée (le dépôt, ou l'arbre d'un témoin).
import fs from 'node:fs'
import path from 'node:path'
import { sansCommentaires } from '../../026-pilotage/a/commun.mjs'

export const posix = (p) => p.split(path.sep).join('/')
export const lireOuNull = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
export const existe = (f) => { try { fs.accessSync(f); return true } catch { return false } }
export const lireRel = (racine, rel) => lireOuNull(path.join(racine, rel))

// ── Parcours ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DOSSIERS_IGNORES = new Set(['node_modules', '.git', '.next', '.next-prod', '.vercel', '_to_delete', 'public', 'maquettes', 'android', 'ios', 'gabarits-pubs'])
/** Tous les fichiers (chemins relatifs, à la posix) sous `dossiers` de la racine ; `exclure(rel)` écarte un fichier ou un dossier. */
export function lister(racine, dossiers, exclure = () => false) {
  const out = []
  const marcher = (rel) => {
    let entrees
    try { entrees = fs.readdirSync(path.join(racine, rel), { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) { if (!DOSSIERS_IGNORES.has(e.name) && !exclure(r + '/')) marcher(r) }
      else if (e.isFile() && !exclure(r)) out.push(r)
    }
  }
  for (const d of dossiers) {
    const plein = path.join(racine, d)
    let st = null
    try { st = fs.statSync(plein) } catch { continue }
    if (st.isDirectory()) marcher(d); else if (!exclure(d)) out.push(d)
  }
  return out.sort()
}

// ── Ce que le juge ne lit pas : ses propres jeux d'essai, les autres juges, les travaux et les preuves ─────────────────────────
export const ESTCODE = /\.(?:ts|tsx|mjs|js|cjs)$/
export const EST_JUGE = (r) => /(?:^|\/)(?:[^/]*-qa|[^/]*-e2e|[^/]*-test|juges?-[^/]*)\.mjs$/.test(r) || r.startsWith('scripts/fixtures/') || r.startsWith('scripts/juges/')
export const HORS_TRAVAUX = (r) => /^\.orchestre\/(?:travail|preuves|scratch)\//.test(r)

// ── SQL ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le SQL sans ses commentaires (-- et /* *\/) ; les chaînes '…' (dont '' doublé) et les corps $$…$$ sont respectés. */
export function sqlSansCommentaires(src) {
  const s = String(src)
  let out = '', i = 0
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '-' && d === '-') { while (i < s.length && s[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const f = s.indexOf('*/', i + 2); i = f < 0 ? s.length : f + 2; out += ' '; continue }
    if (c === "'") {
      let j = i + 1
      while (j < s.length) { if (s[j] === "'" && s[j + 1] === "'") { j += 2; continue } if (s[j] === "'") break; j++ }
      out += s.slice(i, j + 1); i = j + 1; continue
    }
    out += c; i++
  }
  return out
}
/** « a, f(b, c), 'd,e' » → ['a', 'f(b, c)', "'d,e'"] : les virgules de premier niveau seulement. */
export function decouperArguments(s) {
  const out = []
  let prof = 0, cur = '', q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { cur += c; if (c === "'") { if (s[i + 1] === "'") { cur += s[++i] } else q = false } continue }
    if (c === "'") { q = true; cur += c; continue }
    if ('([{'.includes(c)) prof++
    if (')]}'.includes(c)) prof--
    if (c === ',' && prof === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
/** Le texte entre la parenthèse ouvrante à `debut` (incluse) et sa fermante ; null si elle ne ferme pas. */
export function entreParentheses(s, debut) {
  let prof = 0, q = false
  for (let i = debut; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === "'") { if (s[i + 1] === "'") i++; else q = false } continue }
    if (c === "'") { q = true; continue }
    if (c === '(') prof++
    if (c === ')') { prof--; if (prof === 0) return s.slice(debut + 1, i) }
  }
  return null
}
/** Les migrations (hors jumeaux _A_COLLER_*) dans l'ordre de leur nom : [{ rel, texte }], texte sans commentaires. */
export function migrations(racine) {
  return lister(racine, ['supabase/migrations'], (r) => !r.endsWith('/') && !/^supabase\/migrations\/\d{4}_[^/]+\.sql$/.test(r))
    .map((rel) => ({ rel, texte: sqlSansCommentaires(lireRel(racine, rel) ?? '') }))
}
/** Le corps (entre les $$) de la DERNIÈRE définition de public.<nom> dans les migrations, avec le fichier qui la porte. */
export function derniereFonction(racine, nom) {
  let trouve = null
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nom}\\s*\\(`, 'gi')
  for (const m of migrations(racine)) {
    let x
    re.lastIndex = 0
    while ((x = re.exec(m.texte))) {
      const d = m.texte.indexOf('$$', x.index)
      const f = d < 0 ? -1 : m.texte.indexOf('$$', d + 2)
      if (d >= 0 && f > d) trouve = { rel: m.rel, corps: m.texte.slice(d + 2, f), entete: m.texte.slice(x.index, d) }
    }
  }
  return trouve
}

// ── Jetons d'un identifiant (snake_case et camelCase) ───────────────────────────────────────────────────────────────────────
export const jetons = (id) => String(id).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const MOTS_BUDGET = new Set(['budget', 'budgets', 'plafond', 'plafonds', 'depense', 'depenses', 'enveloppe'])
const MOTS_ARGENT = new Set(['eur', 'euro', 'euros', 'usd', 'dollar', 'dollars'])
export const estBudgetArgent = (id) => { const j = jetons(id); return j.some((x) => MOTS_BUDGET.has(x)) && j.some((x) => MOTS_ARGENT.has(x)) }
export const estPlafond = (id) => jetons(id).some((x) => x === 'plafond' || x === 'plafonds')

/**
 * Les valeurs d'argent NON NULLES données à un identifiant de budget dans du code (commentaires ôtés) :
 * « ident: 5 », « ident = 5 », « ident ?? 5 », « ident || 5 ». → [{ ident, op, valeur, ligne }]
 */
export function budgetsNonNuls(texte) {
  const src = sansCommentaires(texte)
  const out = []
  const re = /([A-Za-z_][A-Za-z0-9_]*)["']?\s*(\?\?|\|\||(?<![=!<>])[:=](?!=))\s*["']?(\d+(?:[.,]\d+)?)\b/g
  let m
  while ((m = re.exec(src))) {
    const valeur = Number(m[3].replace(',', '.'))
    if (!(valeur > 0) || !estBudgetArgent(m[1])) continue
    out.push({ ident: m[1], op: m[2], valeur, ligne: src.slice(0, m.index).split('\n').length })
  }
  return out
}

// ── L'inventaire des appels à un fournisseur ─────────────────────────────────────────────────────────────────────────────────
/** Signatures lues dans le code (commentaires ôtés) : un hôte d'API, ou l'import du kit du fournisseur. */
export const FOURNISSEURS = [
  { id: 'anthropic', re: /api\.anthropic\.com|['"]@anthropic-ai\/sdk['"]/ },
  { id: 'openai', re: /api\.openai\.com|['"]openai['"]/ },
  { id: 'firecrawl', re: /api\.firecrawl\.dev/ },
  { id: 'perplexity', re: /api\.perplexity\.ai/ },
  { id: 'elevenlabs', re: /api\.elevenlabs\.io|elevenlabs\.io\/v1/ },
  { id: 'gemini', re: /generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/ },
  { id: 'groq', re: /api\.groq\.com/ },
  { id: 'publora', re: /api\.publora\.com/ },
  { id: 'resend', re: /api\.resend\.com|new Resend\(/ },
  { id: 'stripe', re: /api\.stripe\.com|new Stripe\(|from\s+['"]stripe['"]/ },
  { id: 'meta', re: /graph\.facebook\.com/ },
  { id: 'telegram', re: /api\.telegram\.org/ },
]
/** [{ fichier, fournisseur, position }] : une ligne par couple (fichier, fournisseur), sur les sources hors juges et jeux d'essai. */
export function inventaire(racine) {
  const fichiers = lister(racine, ['app', 'lib', 'components', 'scripts', 'proxy.ts'], (r) => EST_JUGE(r) || HORS_TRAVAUX(r) || (!r.endsWith('/') && !ESTCODE.test(r)))
  const out = []
  for (const fichier of fichiers) {
    const brut = lireRel(racine, fichier)
    if (brut === null) continue
    const src = sansCommentaires(brut)
    for (const f of FOURNISSEURS) {
      const m = f.re.exec(src)
      if (m) out.push({ fichier, fournisseur: f.id, position: m.index })
    }
  }
  return out
}
