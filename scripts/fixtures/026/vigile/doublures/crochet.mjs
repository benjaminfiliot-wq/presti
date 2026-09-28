// Crochet de résolution des sondes de vigile-qa (026-248), chargé par --import dans chaque processus enfant du juge :
//   - `@/x` → <VIGILE_RACINE>/x ; un chemin relatif sans extension → .ts, .tsx, /index.ts (comme scripts/ts-loader.mjs) ;
//   - next/server → la doublure partagée des juges du bus (scripts/fixtures/026-horloge-bus/doublures/next/server.mjs) ;
//   - lib/flags, lib/controle/lectures (et tout ce qu'il contient), lib/pilotage/salles/securite, lib/agents/moteurs et
//     lib/agents/llm → les doublures de ce dossier, MÊME si le vrai fichier n'existe pas encore (026-174, 026-178, 026-043) ;
//   - un paquet npm introuvable depuis la racine se résout depuis le node_modules du dépôt (VIGILE_REPO).
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const ici = path.dirname(fileURLToPath(import.meta.url))
const racine = process.env.VIGILE_RACINE
const repo = process.env.VIGILE_REPO || process.cwd()
if (racine) {
  const d = (n) => pathToFileURL(path.join(ici, n)).href
  const data = {
    racine: pathToFileURL(path.resolve(racine) + path.sep).href,
    repo: pathToFileURL(path.join(path.resolve(repo), 'package.json')).href,
    next: pathToFileURL(path.join(path.resolve(repo), 'scripts', 'fixtures', '026-horloge-bus', 'doublures', 'next', 'server.mjs')).href,
    win: process.platform === 'win32',
    doublures: [
      ['lib/flags', d('flags.mjs'), false],
      ['lib/controle/lectures', d('lectures.mjs'), true],
      ['lib/pilotage/salles/securite', d('lectures.mjs'), false],
      ['lib/agents/moteurs', d('llm.mjs'), false],
      ['lib/agents/llm', d('llm.mjs'), false],
    ],
  }
  const code = `
    import { statSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    let R = null, REPO = null, NEXT = null, WIN = false
    const D = []
    const cle = (u) => { try { let p = fileURLToPath(String(u).split('?')[0]).split('\\\\').join('/').replace(/\\.(tsx?|mjs|js)$/, '').replace(/\\/index$/, ''); return WIN ? p.toLowerCase() : p } catch { return null } }
    const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
    export async function initialize(d) {
      R = d.racine; REPO = d.repo; NEXT = d.next; WIN = d.win
      for (const [rel, url, prefixe] of d.doublures) D.push([cle(new URL(rel, R).href), url, prefixe])
    }
    export async function resolve(spec, ctx, next) {
      if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT, shortCircuit: true }
      let s = spec
      if (s.startsWith('@/')) s = new URL(s.slice(2), R).href
      if (s.startsWith('.') || s.startsWith('file:')) {
        const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
        const k = cle(base)
        for (const [c, url, prefixe] of D) if (k && (k === c || (prefixe && k.startsWith(c + '/'))) && url !== ctx.parentURL) return { url, shortCircuit: true }
        for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (estFichier(c)) return next(c, ctx)
      }
      try { return await next(s, ctx) } catch (e) {
        if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && REPO) return next(s, { ...ctx, parentURL: REPO })
        throw e
      }
    }
  `
  register(`data:text/javascript,${encodeURIComponent(code)}`, { data })
}
