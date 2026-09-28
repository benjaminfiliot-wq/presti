// scripts/fixtures/026/entrant/crochet-resolution.mjs — le crochet de résolution du juge de la demande entrante
// (026-142), enregistré PROGRAMMATIQUEMENT par prospects-entrant-qa.mjs (par `module.register`), APRÈS le hook de
// scripts/ts-loader.mjs (déjà en place via `--import`, exigé par le `verifier` de 026-145.md). Les hooks
// s'enchaînent dans l'ordre inverse d'enregistrement : celui-ci passe en premier, et retombe sur ts-loader (next())
// pour tout ce qu'il ne double pas — l'alias `@/…` et les extensions `.ts` restent résolus par ts-loader.
//
//   next/server                    → une doublure minimale (NextResponse.json), sans dépendance à Next ;
//   @/lib/flags, @/lib/security,
//   @/lib/limites (alias ou relatif) → doublures.mjs (consigne chaque appel, scénario mutable) ;
//   tout le reste (dont
//   @/lib/agents/acquisition/entrant
//   et …/magasinSupabase)          → next(...) : le VRAI module (magasinSupabase parle au faux PostgREST par les
//                                    variables d'environnement NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY,
//                                    posées par le juge — jamais une doublure ici).
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let RACINE = null, DOUBLURE = null, NEXT = null

const NEXT_SERVER = [
  'export class NextResponse extends Response {',
  '  static json(corps, init = {}) { const h = new Headers(init.headers || {}); if (!h.has("content-type")) h.set("content-type", "application/json"); return new Response(JSON.stringify(corps), { status: init.status ?? 200, headers: h }) }',
  '}',
].join('\n')

export function initialize(d) {
  RACINE = d.racine // file:///…/presti/ (avec le séparateur final)
  DOUBLURE = d.doublure // file:///…/scripts/fixtures/026/entrant/doublures.mjs
  NEXT = `data:text/javascript,${encodeURIComponent(NEXT_SERVER)}`
}

const MODULES_DOUBLES = new Set(['lib/flags', 'lib/security', 'lib/limites'])
const cle = (u) => {
  try {
    let p = fileURLToPath(u.split('?')[0]).split('\\').join('/').replace(/\.(tsx?|mjs|js)$/, '')
    if (process.platform === 'win32') p = p.toLowerCase()
    const i = p.toLowerCase().lastIndexOf('/lib/')
    return i >= 0 ? p.slice(i + 1) : null
  } catch { return null }
}
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }

export async function resolve(spec, ctx, next) {
  if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT, shortCircuit: true }
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
    for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (!estFichier(c)) continue
      if (MODULES_DOUBLES.has(cle(c))) return { url: DOUBLURE, shortCircuit: true }
      return next(c, ctx)
    }
  }
  return next(s, ctx)
}
