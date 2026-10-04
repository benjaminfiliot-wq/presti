// Résolution des imports TypeScript du projet pour les scripts Node (sans tsx ni build).
//
// Les modules de `lib/` s'importent entre eux avec l'alias `@/lib/...` et sans extension
// (`./plans`) : Next les résout, Node non. Ce hook, chargé avec `--import`, fait les deux :
//   • `@/x`  →  `<racine du projet>/x`
//   • un spécificateur relatif sans extension → on essaie `.ts`, `.tsx`, `/index.ts`.
// À utiliser avec `--experimental-strip-types` (Node ≥ 22.6) :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/mon-script.mjs
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const racine = pathToFileURL(path.resolve(process.cwd()) + path.sep).href
register(
  'data:text/javascript,' + encodeURIComponent(`
    import { statSync } from 'node:fs'
    import { fileURLToPath, pathToFileURL } from 'node:url'
    import path from 'node:path'
    const RACINE = ${JSON.stringify(racine)}
    function racineParent(url) {
      if (!url?.startsWith('file:')) return RACINE
      let dir = path.dirname(fileURLToPath(url))
      for (;;) {
        try {
          if (statSync(path.join(dir,'package.json')).isFile() && statSync(path.join(dir,'tsconfig.json')).isFile() && statSync(path.join(dir,'lib')).isDirectory() && statSync(path.join(dir,'app')).isDirectory()) return pathToFileURL(dir + path.sep).href
        } catch {}
        const parent = path.dirname(dir); if (parent === dir) return RACINE; dir = parent
      }
    }
    const candidats = (base) => [base, base + '.ts', base + '.tsx', base + '/index.ts']
    export async function resolve(spec, ctx, next) {
      let s = spec
      if (s.startsWith('@/')) s = new URL(s.slice(2), racineParent(ctx.parentURL)).href
      if (s.startsWith('.') || s.startsWith('file:')) {
        const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
        const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
        for (const c of candidats(base)) if (estFichier(c)) return next(c, ctx)
      }
      // Un paquet npm demandé depuis un fichier HORS du projet (ex. une copie de lib/ai.ts dans le
      // scratchpad pour l'éval « avant ») se résout depuis le node_modules du projet.
      if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && ctx.parentURL && !ctx.parentURL.startsWith(RACINE)) {
        return next(s, { ...ctx, parentURL: RACINE + 'package.json' })
      }
      return next(s, ctx)
    }
  `),
)
