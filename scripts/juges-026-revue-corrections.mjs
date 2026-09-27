#!/usr/bin/env node
// scripts/juges-026-revue-corrections.mjs — juge de la tâche 000-revue-026 (27/09/2026) : appliquer la relecture de complétude
// (reprise-cloud/docs/revue-fiches-2026-09-26.md) aux brouillons de la série 026. Écrit AVANT la production. 0 = PASS, 1 = FAIL.
// Juge la substance : chaque fiche citée non faite porte une correction datée et sourcée ; les fiches faites ne bougent pas et
// sont listées en reprises ; les nouvelles fiches sont exécutables (même barre que 000-marketing-026) ; la couverture reste verte.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync, execFileSync } from 'node:child_process'
import { join } from 'node:path'

const B = '.orchestre/brouillons-ecosysteme/026'
const manques = []
const revue = readFileSync('reprise-cloud/docs/revue-fiches-2026-09-26.md', 'utf8')
const sec = (t, n) => (t.split(new RegExp(`^## ${n}.*$`, 'm'))[1] || '').split(/^## /m)[0]
const cites = [...new Set((sec(revue, 'Fiches à corriger').match(/026-\d{3}/g) || []))]
const faites = new Set(readdirSync('.orchestre/fait').map((f) => f.replace(/\.md$/, '')))
const aCorriger = cites.filter((id) => !faites.has(id) && existsSync(join(B, `${id}.md`)))
const reprises = cites.filter((id) => faites.has(id))

for (const id of aCorriger) {
  const t = readFileSync(join(B, `${id}.md`), 'utf8')
  const c = sec(t, 'Correction du 27/09')
  if (!c) { manques.push(`${id} : pas de section « ## Correction du 27/09 »`); continue }
  if (c.length < 250) manques.push(`${id} : correction de ${c.length} caractères (< 250)`)
  if (!/revue-fiches-2026-09-26\.md|decisions-benj|ecosysteme-presti\.md|\d{2}\/09/.test(c)) manques.push(`${id} : correction sans source (revue, décision ou date)`)
}
// Les fiches faites ne se corrigent pas par leur brouillon : elles restent intactes et vont dans les reprises.
for (const id of reprises) {
  const f = join(B, `${id}.md`)
  if (existsSync(f)) {
    const diff = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', f])
    if (diff.status !== 0) manques.push(`${id} est FAITE : son brouillon ne doit pas bouger (mettre la reprise dans reprises-2026-09-27.md)`)
  }
}
const rep = existsSync(join(B, 'reprises-2026-09-27.md')) ? readFileSync(join(B, 'reprises-2026-09-27.md'), 'utf8') : ''
for (const id of reprises) if (!rep.includes(id)) manques.push(`reprises-2026-09-27.md : la fiche faite ${id} n'y est pas (défaut, source, correction proposée)`)

// Nouvelles fiches (décisions sans fiche) : 026-220 et suivantes, exécutables.
const nouvelles = readdirSync(B).filter((f) => /^026-2\d\d\.md$/.test(f) && Number(f.slice(4, 7)) >= 220).sort()
if (nouvelles.length < 7) manques.push(`${nouvelles.length} nouvelle(s) fiche(s) 026-220+ (7 attendues : OpenClaw, Cursor, Firecrawl, Fish Audio, jalon du 27/09, douleurs mensuelles, expérience)`)
const index = readFileSync(join(B, 'INDEX.md'), 'utf8')
const liste = (t, cle) => { const m = t.match(new RegExp(`^${cle}:\\s*\\[(.*)\\]`, 'm')); return m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [] }
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')
const tous = nouvelles.map((f) => readFileSync(join(B, f), 'utf8')).join('\n')
for (const mot of ['OpenClaw', 'Cursor', 'Firecrawl', 'Fish Audio']) if (!new RegExp(mot, 'i').test(tous)) manques.push(`aucune nouvelle fiche ne traite ${mot}`)
if (nouvelles.length && !/abonnement Claude/i.test(tous)) manques.push('la fiche OpenClaw doit interdire l\'abonnement Claude (modèles gratuits seulement, conteneur isolé)')
for (const f of nouvelles) {
  const id = f.replace('.md', ''); const t = readFileSync(join(B, f), 'utf8')
  const v = spawnSync(process.execPath, ['scripts/orchestre.mjs', 'valider', join(B, f)], { encoding: 'utf8' })
  if (v.status !== 0) manques.push(`${id} : refusée par orchestre valider`)
  if (!new RegExp(`^\\| ${id} \\|`, 'm').test(index)) manques.push(`${id} : pas de ligne dans l'INDEX`)
  if (t.length < 4000) manques.push(`${id} : ${t.length} caractères (< 4000)`)
  if (/Se conformer strictement aux sp[ée]cifications/i.test(t)) manques.push(`${id} : consigne générique`)
  if ((sec(t, "Ce qu'il faut faire").match(/^\s*\d+[.)]\s+\S/gm) || []).length < 5) manques.push(`${id} : < 5 étapes numérotées`)
  if ((sec(t, "C'est fini quand").match(/^\s*(?:[-*]|\d+[.)])\s+\S/gm) || []).length < 3) manques.push(`${id} : < 3 critères de fin`)
  for (const p of liste(t, 'perimetre')) for (const g of liste(t, 'interdit')) if (globRe(g).test(p.replace(/\/\*\*$/, '/x'))) manques.push(`${id} : « ${p} » dans perimetre ET interdit`)
}
if (!/Ce que la relecture de complétude du 27\/09 a changé/.test(index)) manques.push('INDEX : section « Ce que la relecture de complétude du 27/09 a changé » absente')
const cov = spawnSync(process.execPath, ['scripts/juges-026-preuve.mjs', '--couverture'], { encoding: 'utf8' })
if (cov.status !== 0) manques.push(`couverture 026-001 en échec : ${(cov.stdout || '').split('\n').filter((l) => /FAIL|✗/.test(l)).slice(0, 3).join(' | ')}`)

if (manques.length) { console.log(`juges-026-revue-corrections : FAIL — ${manques.length} manque(s)`); for (const m of manques.slice(0, 40)) console.log('  - ' + m); process.exit(1) }
console.log(`juges-026-revue-corrections : PASS — ${aCorriger.length} brouillons corrigés, ${reprises.length} reprises listées, ${nouvelles.length} nouvelles fiches, couverture verte`)
