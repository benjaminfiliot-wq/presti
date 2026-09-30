// scripts/fixtures/026-garde/pause/doublures.mjs — les doublures du juge garde-pause-qa : aucune route ne touche le réseau, la base
// ni un modèle. Un crochet de résolution (module.register) redirige les imports `@/…` choisis vers des modules générés qui
// lisent l'état partagé globalThis.__GP ; le reste du code (la route, lib/email.ts, lib/agents/pause.ts…) est celui de la racine jugée.
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { sansCommentaires, importsDe, listerFichiers } from './commun.mjs'

// ── Le crochet ────────────────────────────────────────────────────────────────────────────────────────────────────────
const CROCHET = String.raw`
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
let D = { racine: '', doubles: {} }
export async function initialize(d) { D = d }
const fichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const module_ = (spec) => {
  const noms = D.doubles[spec] ?? []
  const src = noms.map((n) => 'export const ' + n + ' = globalThis.__GP.exporter(' + JSON.stringify(spec) + ', ' + JSON.stringify(n) + ')').join('\n') + '\nexport default globalThis.__GP.exporter(' + JSON.stringify(spec) + ', "default")\n'
  return { url: 'data:text/javascript,' + encodeURIComponent(src), shortCircuit: true, format: 'module' }
}
export async function resolve(spec, ctx, next) {
  const cle = spec.startsWith('@/') ? spec.slice(2).replace(/\.(ts|tsx)$/, '') : spec
  if (Object.prototype.hasOwnProperty.call(D.doubles, cle) || Object.prototype.hasOwnProperty.call(D.doubles, spec)) return module_(Object.prototype.hasOwnProperty.call(D.doubles, cle) ? cle : spec)
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), D.racine).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
    for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (fichier(c)) return next(c, ctx)
  }
  return next(s, ctx)
}`

/** Les noms importés (hors types) de chaque spécificateur doublé, dans toute la racine : le module généré les exporte. */
function nomsImportes(racine, specs) {
  const out = Object.fromEntries(specs.map((s) => [s, new Set()]))
  for (const d of ['app', 'lib']) {
    for (const f of listerFichiers(path.join(racine, d))) {
      if (!/\.(ts|tsx)$/.test(f)) continue
      const t = fs.readFileSync(path.join(racine, d, f), 'utf8')
      const s = sansCommentaires(t)
      for (const m of s.matchAll(/import\s+(?!type\b)([\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\3/g)) {
        const spec = m[4].startsWith('@/') ? m[4].slice(2) : m[4]
        if (!out[spec]) continue
        for (const p of m[2].split(',')) { const x = p.trim(); if (!x || /^type\s/.test(x)) continue; out[spec].add(x.split(/\s+as\s+/)[0].trim()) }
      }
      for (const m of s.matchAll(/(?:const|let)\s*\{([^}]*)\}\s*=\s*await\s+import\s*\(\s*(['"])([^'"]+)\2\s*\)/g)) {
        const spec = m[3].startsWith('@/') ? m[3].slice(2) : m[3]
        if (out[spec]) for (const p of m[1].split(',')) { const x = p.trim().split(':')[0].trim(); if (x) out[spec].add(x) }
      }
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]))
}

// ── Une base en mémoire : assez de PostgREST pour les routes jugées, et des pannes à la demande ─────────────────────────
class Requete {
  constructor(base, table) { this.b = base; this.table = table; this.op = 'select'; this.f = []; this.lim = null; this.un = null; this.opts = {}; this.charge = null; this.retour = false }
  select(_c, o) { if (this.op === 'select') this.opts = o ?? {}; else this.retour = true; return this }
  insert(v) { this.op = 'insert'; this.charge = v; return this }
  upsert(v) { this.op = 'insert'; this.charge = v; return this }
  update(v) { this.op = 'update'; this.charge = v; return this }
  delete() { this.op = 'delete'; return this }
  eq(c, v) { this.f.push([c, 'eq', v]); return this }
  neq(c, v) { this.f.push([c, 'neq', v]); return this }
  lte(c, v) { this.f.push([c, 'lte', v]); return this }
  gte(c, v) { this.f.push([c, 'gte', v]); return this }
  lt(c, v) { this.f.push([c, 'lt', v]); return this }
  gt(c, v) { this.f.push([c, 'gt', v]); return this }
  is(c, v) { this.f.push([c, 'is', v]); return this }
  in(c, v) { this.f.push([c, 'in', v]); return this }
  not(c, o, v) { this.f.push([c, `not-${o}`, v]); return this }
  order() { return this }
  limit(n) { this.lim = n; return this }
  maybeSingle() { this.un = 'maybe'; return this }
  single() { this.un = 'single'; return this }
  abortSignal() { return this }
  then(ok, ko) { return this.executer().then(ok, ko) }
  correspond(r) {
    return this.f.every(([c, o, v]) => {
      const x = r[c]
      if (o === 'eq') return x === v
      if (o === 'neq') return x !== v
      if (o === 'lte') return x <= v
      if (o === 'gte') return x >= v
      if (o === 'lt') return x < v
      if (o === 'gt') return x > v
      if (o === 'is') return v === null ? x === null || x === undefined : x === v
      if (o === 'in') return v.includes(x)
      if (o === 'not-is') return v === null ? x !== null && x !== undefined : x !== v
      return true
    })
  }
  async executer() {
    await new Promise((r) => setImmediate(r)) // un point d'entrelacement : deux passages simultanés se croisent ici
    const b = this.b, G = globalThis.__GP
    const rangs = b.journal.length
    const panne = b.pannes.find((p) => p.table === this.table && p.op === this.op && (!p.si || p.si(G)))
    const note = (extra) => G.noter({ f: 'from', table: this.table, op: this.op, filtres: this.f.map(([c, o, v]) => `${c} ${o} ${JSON.stringify(v)}`), lim: this.lim, ...extra })
    if (panne) { note({ panne: true }); return { data: null, error: { message: 'panne simulée', code: 'XX000' }, count: null } }
    const lignes = (b.t[this.table] ??= [])
    let data = null, count = null
    if (this.op === 'select') {
      let r = lignes.filter((x) => this.correspond(x))
      if (this.lim !== null) r = r.slice(0, this.lim)
      count = this.opts.count ? r.length : null
      data = this.opts.head ? null : r.map((x) => ({ ...x }))
    } else if (this.op === 'insert') {
      const a = (Array.isArray(this.charge) ? this.charge : [this.charge]).map((x, i) => ({ id: `${this.table}-n${lignes.length + i + 1}`, ...x }))
      lignes.push(...a)
      data = this.retour ? a.map((x) => ({ ...x })) : null
    } else if (this.op === 'update') {
      const r = lignes.filter((x) => this.correspond(x))
      for (const x of r) Object.assign(x, this.charge)
      data = this.retour ? r.map((x) => ({ ...x })) : null
    } else if (this.op === 'delete') {
      const r = lignes.filter((x) => this.correspond(x))
      b.t[this.table] = lignes.filter((x) => !r.includes(x))
    }
    note({ nb: Array.isArray(data) ? data.length : data === null ? 0 : 1 })
    void rangs
    if (this.un && Array.isArray(data)) data = data[0] ?? null
    if (this.un === 'single' && data === null) return { data: null, error: { message: 'aucune ligne', code: 'PGRST116' }, count }
    return { data, error: null, count }
  }
}
export class Base {
  constructor(tables = {}, pannes = []) { this.t = JSON.parse(JSON.stringify(tables)); this.pannes = pannes; this.journal = [] }
  from(table) { return new Requete(this, table) }
  async rpc(nom, args) { await new Promise((r) => setImmediate(r)); globalThis.__GP.noter({ f: 'rpc', nom, args }); const c = globalThis.__GP.rpc?.[nom]; return c ? c(args) : { data: null, error: null } }
}

// ── L'état partagé, les enregistreurs, l'installation ────────────────────────────────────────────────────────────────
/**
 * Installe les doublures dans CE processus (à appeler avant d'importer le code jugé).
 * @param {string} racine  la racine jugée
 * @param {string[]} doubles  spécificateurs sans `@/` (ex. 'lib/email', 'next/server')
 * @param {Record<string, unknown>} valeurs  exports non fonctions : clé « spec.nom » → valeur
 */
export function installer(racine, doubles, valeurs = {}) {
  const G = globalThis.__GP = {
    seq: 0, journal: [], etat: {}, comportements: {}, valeurs, rpc: {}, base: new Base(),
    noter(e) { const x = { seq: ++G.seq, ...e }; G.journal.push(x); return x },
    exporter(spec, nom) {
      const cle = `${spec}.${nom}`
      if (Object.prototype.hasOwnProperty.call(G.valeurs, cle)) return G.valeurs[cle]
      return (...args) => {
        G.noter({ f: 'appel', spec, nom, args: resume(args) })
        const c = G.comportements[cle]
        return typeof c === 'function' ? c(...args) : undefined
      }
    },
    appels: (spec, nom) => G.journal.filter((e) => e.f === 'appel' && e.spec === spec && e.nom === nom),
    vider() { G.journal.length = 0; G.seq = 0 },
  }
  const resume = (a) => { try { return JSON.parse(JSON.stringify(a)) } catch { return ['(non sérialisable)'] } }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: pathToFileURL(path.resolve(racine) + path.sep).href, doubles: nomsImportes(racine, doubles) } })
  return G
}
export const importerDepuis = (racine, rel) => import(pathToFileURL(path.join(racine, rel)).href)
/** Une Response de route en JSON lisible. */
export async function lire(r) { const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* pas du JSON */ } return { status: r.status, j, t } }
export { importsDe }
