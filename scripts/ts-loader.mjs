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
    import { fileURLToPath } from 'node:url'
    const RACINE = ${JSON.stringify(racine)}
    const candidats = (base) => [base, base + '.ts', base + '.tsx', base + '/index.ts']
    export async function resolve(spec, ctx, next) {
      let s = spec
      if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
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
