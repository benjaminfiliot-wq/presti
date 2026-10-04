// Le crochet de résolution de la sonde des routes (026-199), sur le modèle de 026-038 (doublures/crochet-resolution.mjs) :
//   - `@/x` → <racine jugée>/x, et, si ce fichier n'y est pas, <dépôt>/x (la racine jugée d'un témoin ou d'un sabotage ne porte que
//     les fichiers jugés : bus.ts, supabaseAdmin.ts… sont ceux du dépôt) ; un relatif sans extension → .ts, .tsx, /index.ts (même repli) ;
//   - next/server → doublure ; lib/flags, lib/agents/garde, lib/agents/pause (par le chemin résolu, alias ou relatif) → doublures ;
//   - un paquet npm introuvable depuis la racine se résout depuis le node_modules du dépôt.
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let RACINE = null, DEPOT = null, NEXT = null
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
  RACINE = d.racine; DEPOT = d.depot; NEXT = d.next
  for (const [n, url] of Object.entries(d.doublures || {})) DOUBLURES.set(cle(new URL(n, d.depot).href), url)
}
function candidats(base) { return [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}/index.ts`] }
export async function resolve(spec, ctx, next) {
  if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT, shortCircuit: true }
  let s = spec
  let base = null
  if (s.startsWith('@/')) base = new URL(s.slice(2), RACINE).href
  else if (s.startsWith('.') || s.startsWith('file:')) base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
  if (base) {
    const essais = [base]
    // le repli : le même chemin sous le dépôt, quand la racine jugée ne porte pas le fichier
    if (base.startsWith(RACINE) && RACINE !== DEPOT) essais.push(new URL(base.slice(RACINE.length), DEPOT).href)
    for (const b of essais) for (const c of candidats(b)) {
      if (!estFichier(c)) continue
      const rel = cle(c)
      // une doublure se désigne par le chemin DU DÉPÔT : la racine jugée (copie) et le dépôt visent la même
      for (const [k, url] of DOUBLURES) {
        const sousRacine = cle(new URL(k.slice(cle(DEPOT).length + 1) , RACINE).href)
        if ((rel === k || rel === sousRacine) && url !== ctx.parentURL) return { url, shortCircuit: true }
      }
      return next(c, ctx)
    }
  }
  try { return await next(s, ctx) } catch (e) {
    if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && DEPOT) return next(s, { ...ctx, parentURL: new URL('package.json', DEPOT).href })
    throw e
  }
}
