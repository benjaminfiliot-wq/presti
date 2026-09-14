// scripts/vault-journal-qa.mjs — le juge de la tâche 018-04 (journal v17 et vault). Il ne juge pas le style : il vérifie
// que ce qui est écrit est VRAI par rapport aux traces machine. Pourquoi : le 14/09/2026, des heures du journal v16 avaient
// été inventées (14 h 40 à 17 h 25, alors que les commits et les verdicts disaient 13 h 19 à 14 h 06).
//   1. Les fichiers existent : plans/journal-v17.md, ../SaaS/Récap-Projet.md, ../SaaS/Produit/Orchestre.md.
//   2. Tout identifiant de commit cité (7 à 40 caractères hexadécimaux entre accents graves ou après « commit ») existe dans
//      le dépôt presti ou dans le dépôt orchestre.
//   3. Toute heure écrite « HH h MM » dans le journal correspond, à 3 minutes près, à un commit du 14/09/2026 ou d'après (heure
//      de Paris) ou à un verdict de .orchestre/verdicts.jsonl, sauf si la ligne dit « vers » (instant sans horodatage).
//   4. Les faits indispensables sont présents : dans le journal, dans le récap et dans la note Orchestre.
//   5. Aucune affirmation interdite : la démo n'est pas déclarée « au niveau MotionSites » ni « validée par Benj ».
//
// Usage : node scripts/vault-journal-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCHESTRE = path.resolve(R, '..', 'orchestre')
const JOURNAL = path.join(R, 'plans', 'journal-v17.md')
const RECAP = path.resolve(R, '..', 'SaaS', 'Récap-Projet.md')
const NOTE = path.resolve(R, '..', 'SaaS', 'Produit', 'Orchestre.md')
const echecs = []

const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { echecs.push(`${path.relative(path.resolve(R, '..'), f)} absent`); return '' } }
const journal = lire(JOURNAL), recap = lire(RECAP), note = lire(NOTE)

// 2. commits cités
const git = (depot, args) => spawnSync('git', ['-C', depot, ...args], { encoding: 'utf8' })
const existe = (h) => [R, ORCHESTRE].some((d) => git(d, ['cat-file', '-t', h]).stdout.trim() === 'commit')
for (const [nom, texte] of [['journal-v17', journal], ['Récap-Projet', recap], ['Orchestre', note]]) {
  const cites = new Set([...texte.matchAll(/`([0-9a-f]{7,40})`|commit\s+([0-9a-f]{7,40})\b/gi)].map((m) => (m[1] || m[2]).toLowerCase()))
  for (const h of cites) if (!existe(h)) echecs.push(`${nom} : le commit ${h} n'existe ni dans presti ni dans orchestre`)
}

// 3. heures du journal
const paris = (d) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const traces = []
for (const d of [R, ORCHESTRE]) {
  const out = git(d, ['log', '--since=2026-09-14T00:00:00+02:00', '--format=%cI']).stdout.trim()
  for (const l of out.split('\n').filter(Boolean)) traces.push(minutes(paris(new Date(l))))
}
try {
  for (const l of fs.readFileSync(path.join(R, '.orchestre', 'verdicts.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const v = JSON.parse(l)
    if (v.date && v.date >= '2026-09-14') traces.push(minutes(paris(new Date(v.date))))
  }
} catch { /* pas de verdicts */ }
for (const ligne of journal.split(/\r?\n/)) {
  if (/\bvers\b/i.test(ligne)) continue
  for (const m of ligne.matchAll(/\b([01]?\d|2[0-3]) h (\d{2})\b/g)) {
    const t = Number(m[1]) * 60 + Number(m[2])
    if (!traces.some((x) => Math.abs(x - t) <= 3)) echecs.push(`journal-v17 : « ${m[0]} » ne correspond à aucun commit ni verdict (à 3 min près) — écrire « vers » si c'est une estimation : ${ligne.trim().slice(0, 120)}`)
  }
}

// 4. faits indispensables
const exiger = (nom, texte, faits) => { for (const [libelle, motif] of faits) if (!motif.test(texte)) echecs.push(`${nom} : fait manquant — ${libelle}`) }
exiger('journal-v17', journal, [
  ['la barre de Benj (« loin encore du résultat ») et la grille relevée au 3e quartile', /loin encore/i],
  ['le 3e quartile de la grille', /3e quartile|troisième quartile/i],
  ['le commit de la vague 1 (efda4a7)', /efda4a7/],
  ['la décision « un seul site » et les neuf démos gelées', /gel[ée]es?/i],
  ['Codex branché à l\'orchestre (c05f326)', /c05f326/],
  ['le piège spawn EPERM du bac à sable de Codex', /spawn EPERM/],
  ['les verdicts 018-01, 018-02 et 018-03', /018-01[\s\S]*018-02[\s\S]*018-03|018-03[\s\S]*018-02[\s\S]*018-01/],
  ['la connexion Google de Gemini CLI refusée (UNSUPPORTED_CLIENT)', /UNSUPPORTED_CLIENT/],
])
exiger('Récap-Projet', recap, [
  ['une entrée v17 datée du 14/09/2026', /v17[\s\S]{0,200}(14\/09|2026-09-14)|(14\/09|2026-09-14)[\s\S]{0,200}v17/i],
  ['Codex comme exécutant', /Codex/],
  ['le lien vers le journal v17', /journal-v17/],
])
exiger('Orchestre', note, [
  ['Codex dans la liste des exécutants', /codex/i],
  ['la boucle du vérificateur hors bac à sable', /hors (du )?bac à sable/i],
  ['le bac à sable workspace-write (jamais danger-full-access)', /workspace-write/],
])

// 5. affirmations interdites
for (const [nom, texte] of [['journal-v17', journal], ['Récap-Projet', recap]]) {
  if (/au niveau (de )?MotionSites(?! ?\?)/i.test(texte) && !/pas (encore )?au niveau|loin|n'est pas au niveau/i.test(texte)) echecs.push(`${nom} : « au niveau MotionSites » affirmé`)
  if (/valid[ée]e? par Benj/i.test(texte)) echecs.push(`${nom} : « validée par Benj » — Benj ne l'a pas validée`)
}

console.log(echecs.length ? `✗ journal et vault : FAIL — ${echecs.join(' ; ')}` : '✓ journal et vault : PASS — commits et heures vérifiés, faits présents, aucune affirmation interdite')
process.exitCode = echecs.length ? 1 : 0
