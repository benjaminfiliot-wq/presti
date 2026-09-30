// scripts/fixtures/026-transverse/routes-crochet.mjs — le crochet de résolution du juge du pont Telegram (fiche 026-194, Claude Code).
// Enregistré par l'enfant (routes-enfant.mjs) avec `register`, PAR-DESSUS scripts/ts-loader.mjs : `@/x` se résout sous la RACINE
// JUGÉE (et non sous le dépôt), et trois modules de la racine, plus `next/server`, partent vers routes-doublures.mjs (une instance
// par `?m=<nom>`, un état partagé par globalThis) :
//   next/server, @/lib/flags, @/lib/agents/garde, @/lib/agents/pause.
// Tout le reste est le VRAI code de la racine (lib/agents/telegram.ts, lib/pilotage/*, lib/agents/bus.ts, lib/supabaseAdmin.ts) :
// un paquet npm demandé depuis la racine se résout depuis le node_modules de la racine, à défaut depuis celui du dépôt.
// Modèle : CROCHET de scripts/fixtures/026-pilotage/s/commun.mjs (lu, pas importé : ce juge ne dépend d'aucun autre lot).
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export const urlDossier = (d) => pathToFileURL(path.resolve(d) + path.sep).href

export const CROCHET = String.raw`
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
let D = { racine: '', depot: '', doublures: '', doubles: {}, paquets: {} }
export async function initialize(d) { D = { ...D, ...d } }
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const double = (m) => ({ url: D.doublures + '?m=' + encodeURIComponent(m), shortCircuit: true, format: 'module' })
const bas = (u) => u.toLowerCase()
export async function resolve(spec, ctx, next) {
  if (D.paquets[spec]) return double(D.paquets[spec])
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), D.racine).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const brut = s.startsWith('file:') ? s.split('?')[0] : new URL(s, ctx.parentURL).href
    if (bas(brut).startsWith(bas(D.racine))) {
      const rel = decodeURIComponent(brut.slice(D.racine.length)).replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')
      if (D.doubles[rel]) return double(D.doubles[rel])
    }
    if (!s.startsWith('file:') || !s.includes('?')) for (const c of [brut, brut + '.ts', brut + '.tsx', brut + '/index.ts']) if (estFichier(c)) return next(c, ctx)
  }
  if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && ctx.parentURL && ctx.parentURL.startsWith('file:')) {
    // un paquet npm : d'abord depuis la racine jugée, sinon depuis le dépôt du juge
    try { return await next(s, { ...ctx, parentURL: D.racine + 'package.json' }) } catch (e) { if (!/ERR_MODULE_NOT_FOUND|Cannot find/.test(String(e && (e.code || e.message)))) throw e }
    return next(s, { ...ctx, parentURL: D.depot + 'package.json' })
  }
  return next(s, ctx)
}`

/** Enregistre le crochet : `doubles` = { '<chemin sans extension sous la racine>': '<nom d'instance>' }. */
export function enregistrer(register, { racine, depot, doublures, doubles, paquets }) {
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, {
    data: { racine: urlDossier(racine), depot: urlDossier(depot), doublures: pathToFileURL(doublures).href, doubles, paquets },
  })
}
