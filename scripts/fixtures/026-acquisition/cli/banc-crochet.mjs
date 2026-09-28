// scripts/fixtures/026-acquisition/cli/banc-crochet.mjs — le crochet de résolution du banc de routes-acquisition-qa
// (fiche 026-037), écrit par Claude Code. Enregistré par le juge (module.register), il n'agit que sur un module importé
// par le banc : une route (ou un fichier de app/ qu'elle importe) chargée avec « ?banc=<n> » dans son URL.
//   · `next/server`               → une doublure minimale (NextResponse.json, NextRequest) : aucune dépendance à Next ;
//   · `@/lib/…` et `…/lib/…`      → une doublure générée qui exporte exactement les noms que la route importe, chacun
//                                    branché sur globalThis.__DBL (le juge) : chaque appel est consigné, la réponse vient
//                                    du scénario du juge ;
//   · lib/agents/acquisition/contrat → le VRAI contrat du dépôt du juge (des constantes, jamais une doublure) ;
//   · un paquet npm (imapflow…)   → une doublure, pour qu'aucune route ne touche le réseau ni une base ;
//   · `node:*`                    → inchangé.
// Aucune écriture, aucun réseau ; le crochet lit seulement le source de la route pour connaître les noms importés.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

let CONTRAT = null
export function initialize(d) { CONTRAT = d && d.contrat ? d.contrat : null }

const NEXT = [
  'export class NextResponse extends Response {',
  '  static json(corps, init = {}) { const h = new Headers(init.headers || {}); if (!h.has("content-type")) h.set("content-type", "application/json"); return new Response(JSON.stringify(corps), { status: init.status ?? 200, headers: h }) }',
  '  static redirect(u, s = 307) { return new Response(null, { status: s, headers: { location: String(u) } }) }',
  '  static next() { return new Response(null, { status: 200 }) }',
  '}',
  'export class NextRequest extends Request { get nextUrl() { return new URL(this.url) } }',
  'export function after(f) { try { if (typeof f === "function") f() } catch { /* ignoré */ } }',
].join('\n')

const banc = (u) => { const m = /[?&]banc=(\d+)/.exec(u || ''); return m ? m[1] : null }
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Les noms que `src` importe de `spec` (types exclus) ; `defaut` si un import par défaut. */
function nomsImportes(src, spec) {
  const noms = new Set()
  let defaut = false
  const re = new RegExp(`import\\s+(type\\s+)?([\\w$*{}\\s,]+?)\\s+from\\s*['"]${echapper(spec)}['"]`, 'g')
  for (const m of src.matchAll(re)) {
    if (m[1]) continue
    const clause = m[2].trim()
    const ns = /\*\s+as\s+([\w$]+)/.exec(clause)
    if (ns) { for (const u of src.matchAll(new RegExp(`\\b${ns[1]}\\.([\\w$]+)`, 'g'))) noms.add(u[1]); continue }
    const acc = /\{([^}]*)\}/.exec(clause)
    if (acc) for (const p of acc[1].split(',')) { const x = p.trim(); if (!x || /^type\s/.test(x)) continue; noms.add(x.split(/\s+as\s+/)[0].trim()) }
    const def = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim()
    if (def && /^[\w$]+$/.test(def)) defaut = true
  }
  return { noms: [...noms].filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && n !== 'default'), defaut }
}
function double(cle, { noms, defaut }) {
  const l = ['const D = globalThis.__DBL']
  for (const n of noms) l.push(`export const ${n} = D.fab(${JSON.stringify(cle)}, ${JSON.stringify(n)})`)
  if (defaut) l.push(`export default D.fab(${JSON.stringify(cle)}, "default")`)
  return l.join('\n')
}

export async function resolve(spec, ctx, next) {
  const b = banc(ctx.parentURL)
  if (!b || spec.startsWith('node:')) return next(spec, ctx)
  if (spec === 'next/server' || spec === 'next/server.js') return { url: `data:text/javascript,${encodeURIComponent(NEXT)}`, shortCircuit: true }
  const parent = fileURLToPath(ctx.parentURL.split('?')[0])
  let cle = null
  if (spec.startsWith('@/')) cle = spec.slice(2)
  else if (spec.startsWith('.')) {
    const abs = path.resolve(path.dirname(parent), spec).replace(/\\/g, '/')
    const i = abs.lastIndexOf('/lib/')
    if (i >= 0) cle = abs.slice(i + 1)
    else {
      const r = await next(spec, { ...ctx, parentURL: ctx.parentURL.split('?')[0] })
      return { ...r, url: `${r.url}${r.url.includes('?') ? '&' : '?'}banc=${b}` }
    }
  } else if (!spec.startsWith('file:') && !spec.startsWith('data:')) cle = `npm/${spec}`
  if (cle === null) return next(spec, ctx)
  cle = cle.replace(/\.(ts|tsx|mts|js|mjs)$/, '')
  if (cle === 'lib/agents/acquisition/contrat' && CONTRAT) return next(CONTRAT, { ...ctx, parentURL: ctx.parentURL.split('?')[0] })
  return { url: `data:text/javascript,${encodeURIComponent(double(cle, nomsImportes(readFileSync(parent, 'utf8'), spec)))}`, shortCircuit: true }
}
