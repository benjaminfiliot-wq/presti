#!/usr/bin/env node
// Jeux de mesures de la surveillance (026-048, SV-4, SV-5, SV-8, SV-9) : une semaine de mesures minute par minute par jeu
// (20 h pour `incomplet`), générées de façon DÉTERMINISTE (graine fixe, générateur mulberry32), au format du journal de
// scripts/usine/surveillance.mjs : fichiers mesures-<AAAA-MM-JJ>.jsonl (jour de Paris), une ligne { le, cpu, mem, res }.
//
// Chaque série est bâtie pour que son 95e centile (rang le plus proche) tombe sur une valeur cible, tenue par un PLATEAU :
// les rangs de 93 % à 97 % valent exactement la cible. Le p95 ne bouge donc pas si la fenêtre de 7 jours gagne ou perd
// quelques minutes (borne incluse ou exclue, mesures ajoutées par les tours d'essai). Les p95 attendus sont écrits à côté,
// dans attendus.json ; le juge les recalcule avec son propre calcul de référence.
//
//   node generer.mjs <ok|approche|danger|incomplet> <dossier> [--fin=<ISO>]   écrit les fichiers (fin exclue, défaut ci-dessous)
//   import { JEUX, FIN_DEFAUT, genererJeu, ecrireJeu, jourParis } from './generer.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIN_DEFAUT = '2026-09-20T22:00:00.000Z' // lundi 21/09/2026 à 00:00, heure de Paris
const MINUTE = 60_000

// cible = p95 voulu ; [bas, haut] = bornes des autres valeurs ; graine = départ du générateur.
export const JEUX = {
  ok: { minutes: 7 * 1440, graine: 11, cpu: { cible: 41.0, bas: 0.5, haut: 95 }, mem: { cible: 18.5, bas: 5, haut: 60 }, res: { cible: 2.4, bas: 0, haut: 40 } },
  approche: { minutes: 7 * 1440, graine: 23, cpu: { cible: 29.6, bas: 0.5, haut: 95 }, mem: { cible: 24.3, bas: 5, haut: 60 }, res: { cible: 22.5, bas: 0, haut: 40 } },
  danger: { minutes: 7 * 1440, graine: 37, cpu: { cible: 21.4, bas: 0.5, haut: 95 }, mem: { cible: 19.8, bas: 5, haut: 60 }, res: { cible: 3.1, bas: 0, haut: 40 } },
  incomplet: { minutes: 20 * 60, graine: 41, cpu: { cible: 35.2, bas: 0.5, haut: 95 }, mem: { cible: 20.1, bas: 5, haut: 60 }, res: { cible: 1.8, bas: 0, haut: 40 } },
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const dixieme = (x) => Math.round(x * 10) / 10

function serie(n, { cible, bas, haut }, alea) {
  const debutPlateau = Math.floor(0.93 * n)
  const finPlateau = Math.min(n, Math.ceil(0.97 * n))
  const v = []
  for (let i = 0; i < n; i++) {
    if (i < debutPlateau) v.push(dixieme(bas + alea() * (cible - 0.1 - bas)))
    else if (i < finPlateau) v.push(cible)
    else v.push(dixieme(cible + 0.1 + alea() * (haut - cible - 0.1)))
  }
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [v[i], v[j]] = [v[j], v[i]] } // Fisher-Yates
  return v
}

/** Le jour de Paris (AAAA-MM-JJ) d'un instant. */
export function jourParis(t) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
}

/** Les lignes du jeu, la dernière une minute avant `fin`. */
export function genererJeu(nom, fin = FIN_DEFAUT) {
  const j = JEUX[nom]
  if (!j) throw new Error(`jeu inconnu : ${nom}`)
  const alea = mulberry32(j.graine)
  const cpu = serie(j.minutes, j.cpu, alea)
  const mem = serie(j.minutes, j.mem, alea)
  const res = serie(j.minutes, j.res, alea)
  const t0 = new Date(fin).getTime() - j.minutes * MINUTE
  const lignes = []
  for (let i = 0; i < j.minutes; i++) lignes.push({ le: new Date(t0 + i * MINUTE).toISOString().replace(/\.\d{3}Z$/, 'Z'), cpu: cpu[i], mem: mem[i], res: res[i] })
  return lignes
}

/** Écrit le jeu dans `dossier`, un fichier par jour de Paris ; rend les noms des fichiers écrits. */
export function ecrireJeu(nom, dossier, fin = FIN_DEFAUT) {
  fs.mkdirSync(dossier, { recursive: true })
  const parJour = new Map()
  for (const l of genererJeu(nom, fin)) {
    const f = `mesures-${jourParis(l.le)}.jsonl`
    if (!parJour.has(f)) parJour.set(f, [])
    parJour.get(f).push(JSON.stringify(l))
  }
  for (const [f, lignes] of parJour) fs.writeFileSync(path.join(dossier, f), `${lignes.join('\n')}\n`)
  return [...parJour.keys()]
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const [nom, dossier] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const fin = (process.argv.find((a) => a.startsWith('--fin=')) || '').slice(6) || FIN_DEFAUT
  if (!nom || !dossier) { console.error('usage : node generer.mjs <ok|approche|danger|incomplet> <dossier> [--fin=<ISO>]'); process.exit(2) }
  console.log(ecrireJeu(nom, dossier, fin).join('\n'))
}
