// scripts/vault-journal-v18-qa.mjs — le juge de la tâche 019-03 (journal v18 et vault). Même principe que
// scripts/vault-journal-qa.mjs (journal v17) : il ne juge pas le style, il vérifie que ce qui est écrit est VRAI par rapport
// aux traces machine. Pourquoi : le 14/09/2026, des heures du journal v16 avaient été inventées ; et le 15/09, deux choses
// annoncées « faites » ne l'étaient pas (Codex coupé avec la session, moment signature arrêté sans cahier des charges).
//   1. Les fichiers existent : plans/journal-v18.md, ../SaaS/Récap-Projet.md, ../SaaS/Produit/Orchestre.md.
//   2. Tout identifiant de commit cité (7 à 40 caractères hexadécimaux entre accents graves ou après « commit ») existe dans
//      le dépôt presti ou dans le dépôt orchestre.
//   3. Toute heure écrite « HH h MM » dans le journal correspond, à 3 minutes près, à un commit du 14/09/2026 ou d'après (heure
//      de Paris) ou à un verdict de .orchestre/verdicts.jsonl, sauf si la ligne dit « vers » (instant sans horodatage).
//   4. Les faits indispensables sont présents : dans le journal, dans le récap et dans la note Orchestre.
//   5. Aucune affirmation interdite dans le journal ni dans l'entrée v18 du récap : la démo n'est pas « au niveau MotionSites »,
//      pas « validée par Benj », et le moment signature n'est ni livré, ni en ligne, ni terminé.
//   6. Le journal v17 n'est pas réécrit (identique au commit).
//
// Usage : node scripts/vault-journal-v18-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCHESTRE = path.resolve(R, '..', 'orchestre')
const JOURNAL = path.join(R, 'plans', 'journal-v18.md')
const RECAP = path.resolve(R, '..', 'SaaS', 'Récap-Projet.md')
const NOTE = path.resolve(R, '..', 'SaaS', 'Produit', 'Orchestre.md')
const echecs = []

const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { echecs.push(`${path.relative(path.resolve(R, '..'), f)} absent`); return '' } }
const journal = lire(JOURNAL), recap = lire(RECAP), note = lire(NOTE)
if (journal && journal.trim().length < 1500) echecs.push(`journal-v18 : ${journal.trim().length} caractères, trop court pour une journée de travail (au moins 1 500)`)

// 2. commits cités
const git = (depot, args) => spawnSync('git', ['-C', depot, ...args], { encoding: 'utf8' })
const existe = (h) => [R, ORCHESTRE].some((d) => git(d, ['cat-file', '-t', h]).stdout.trim() === 'commit')
for (const [nom, texte] of [['journal-v18', journal], ['Récap-Projet', recap], ['Orchestre', note]]) {
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
    if (!traces.some((x) => Math.abs(x - t) <= 3)) echecs.push(`journal-v18 : « ${m[0]} » ne correspond à aucun commit ni verdict (à 3 min près) — écrire « vers » si c'est une estimation : ${ligne.trim().slice(0, 120)}`)
  }
}

// 4. faits indispensables
const exiger = (nom, texte, faits) => { for (const [libelle, motif] of faits) if (!motif.test(texte)) echecs.push(`${nom} : fait manquant — ${libelle}`) }
exiger('journal-v18', journal, [
  ['le commit de la vague 2 (12bf5d6)', /12bf5d6/],
  ['le réétalonnage du héros refusé à l\'œil malgré son PASS (018-08)', /018-08/],
  ['la photo du héros autorisée dans la vidéo par Benj (« la photo est bien »)', /la photo est bien/i],
  ['le commit de la vague 3 (e78b6c2)', /e78b6c2/],
  ['le résultat de la grille à l\'aveugle : 4,08 à égalité avec stellar-launch', /4,08[\s\S]{0,200}stellar-launch|stellar-launch[\s\S]{0,200}4,08/i],
  ['les critères faibles à l\'aveugle, dont C2 à 2,7', /C2[\s\S]{0,80}2,7/],
  ['la vidéo de la landing refaite (68caef1) et la cause : l\'horloge de l\'enregistrement Playwright', /68caef1[\s\S]{0,600}horloge|horloge[\s\S]{0,600}68caef1/i],
  ['la barre retenue en ligne (2e225af) et ses deux tâches 019-01 et 019-02', /2e225af/],
  ['les verdicts 019-01 et 019-02', /019-01[\s\S]*019-02/],
  ['le trou d\'environ 1 500 px sans appel visible, trouvé sur les captures malgré le PASS', /1[  ]?500 px/],
  ['le juge d\'usage accordé à la barre retenue (9ee9483)', /9ee9483/],
  ['le lancement de Codex coupé avec la session puis relancé', /coup[ée][\s\S]{0,160}(session|relanc)|relanc[\s\S]{0,160}coup[ée]/i],
  ['le moment signature pas encore livré (prototypes, cahier des charges)', /moment signature/i],
])
exiger('Récap-Projet', recap, [
  ['une entrée v18 datée du 15/09/2026', /v18[\s\S]{0,200}(15\/09|2026-09-15)|(15\/09|2026-09-15)[\s\S]{0,200}v18/i],
  ['le lien vers le journal v18', /journal-v18/],
  ['le résultat à l\'aveugle (4,08)', /4,08/],
])
exiger('Orchestre', note, [
  ['un lancement d\'exécutant lié à la session qui l\'a lancé, et la reprise (liberer puis relancer)', /liberer|libérer/i],
  ['un juge qui échantillonne tout le parcours (relais contrôlé tous les 150 px)', /150 px/],
])

// 5. affirmations interdites : le journal, et l'entrée v18 du récap
function entreeV18(texte) {
  const debut = texte.search(/\*\*v18\b|\bv18 —/i)
  if (debut < 0) return ''
  const suite = texte.slice(debut + 3).search(/\n- \*\*v(19|2\d)\b|\n- \*\*v17\b|\n#{1,3} /)
  return suite < 0 ? texte.slice(debut) : texte.slice(debut, debut + 3 + suite)
}
for (const [nom, texte] of [['journal-v18', journal], ['Récap-Projet (entrée v18)', entreeV18(recap)]]) {
  if (/au niveau (de )?MotionSites(?! ?\?)/i.test(texte) && !/pas (encore )?au niveau|loin|n'est pas au niveau/i.test(texte)) echecs.push(`${nom} : « au niveau MotionSites » affirmé`)
  if (/valid[ée]e? par Benj/i.test(texte)) echecs.push(`${nom} : « validée par Benj » — Benj ne l'a pas validée`)
  if (/moment signature[^.\n]{0,80}\b(livr[ée]|en ligne|termin[ée]|d[ée]ploy[ée])/i.test(texte) && !/moment signature[^.\n]{0,80}\b(pas|non|ni)\b[^.\n]{0,40}(livr|en ligne|termin|d[ée]ploy)/i.test(texte)) echecs.push(`${nom} : le moment signature est dit livré, en ligne ou terminé — il ne l'est pas`)
}

// 6. le journal v17 n'est pas réécrit
const v17 = git(R, ['diff', '--quiet', 'HEAD', '--', 'plans/journal-v17.md'])
if (v17.status !== 0) echecs.push('plans/journal-v17.md a été modifié : le journal d\'une version passée ne se réécrit pas')

console.log(echecs.length ? `✗ journal v18 et vault : FAIL — ${echecs.join(' ; ')}` : '✓ journal v18 et vault : PASS — commits et heures vérifiés, faits présents, aucune affirmation interdite, journal v17 intact')
process.exitCode = echecs.length ? 1 : 0
