// Les crochets de résolution enregistrés par crochet.mjs (026-038). Voir crochet.mjs.
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let RACINE = null, NEXT = null, REPO = null
const DOUBLURES = new Map()
const cle = (u) => {
  try {
    let p = fileURLToPath(u.split('?')[0]).split('\\').join('/').replace(/\.(tsx?|mjs|js)$/, '')
    if (process.platform === 'win32') p = p.toLowerCase()
    return p
  } catch { return null }
}
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
export async function initialize(d) {
  RACINE = d.racine; NEXT = d.next; REPO = d.repo
  for (const [n, url] of Object.entries(d.doublures || {})) DOUBLURES.set(cle(new URL(n, RACINE).href), url)
}
export async function resolve(spec, ctx, next) {
  if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT, shortCircuit: true }
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
    for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (!estFichier(c)) continue
      const d = DOUBLURES.get(cle(c))
      if (d && d !== ctx.parentURL) return { url: d, shortCircuit: true }
      return next(c, ctx)
    }
  }
  try { return await next(s, ctx) } catch (e) {
    if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && REPO) return next(s, { ...ctx, parentURL: REPO })
    throw e
  }
}
