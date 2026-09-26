#!/usr/bin/env node
// scripts/juges-026-marketing-assemblage.mjs — juge de la tâche 000-marketing-026 (26/09/2026) : les 16 fiches marketing
// C01–C16 (SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md §3 et §4 bis) deviennent des brouillons de la série 026,
// avec Laya/Jev là où il sert (contrôle des chiffres, score), sans casser la couverture de 026-001.
// Écrit AVANT la production. Code 0 = PASS, 1 = FAIL (liste des manques).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const B = '.orchestre/brouillons-ecosysteme/026'
const manques = []
const index = readFileSync(join(B, 'INDEX.md'), 'utf8')
const nouvelles = readdirSync(B).filter((f) => /^026-(2\d\d)\.md$/.test(f) && Number(f.slice(4, 7)) >= 204).sort()
if (nouvelles.length < 8) manques.push(`seulement ${nouvelles.length} nouvelle(s) fiche(s) 026-204+ (C01–C16 attendues, regroupées au plus par deux)`)

const texte = Object.fromEntries(nouvelles.map((f) => [f, readFileSync(join(B, f), 'utf8')]))
for (let n = 1; n <= 16; n++) {
  const c = `C${String(n).padStart(2, '0')}`
  const porteuses = nouvelles.filter((f) => new RegExp(`\\b${c}\\b`).test(texte[f].split('\n---')[0] + (texte[f].match(/^# .*$/m) || [''])[0]))
  if (!porteuses.length) manques.push(`${c} : aucune fiche 026-204+ ne la porte dans son en-tête ou son titre`)
}
for (const f of nouvelles) {
  const id = f.replace('.md', '')
  const v = spawnSync(process.execPath, ['scripts/orchestre.mjs', 'valider', join(B, f)], { encoding: 'utf8' })
  if (v.status !== 0) manques.push(`${id} : refusée par orchestre valider — ${(v.stdout + v.stderr).trim().split('\n').pop()}`)
  if (!new RegExp(`^\\| ${id} \\|`, 'm').test(index)) manques.push(`${id} : pas de ligne dans le tableau de l'INDEX`)
  if (!/verifier:\s*\S/.test(texte[f])) manques.push(`${id} : pas de verifier`)
  if (/verifier:.*\bexit \$r\b/.test(texte[f])) manques.push(`${id} : verifier en « exit $r » (interdit, utiliser juges-en-serie)`)
}
// SUBSTANCE (ajouté le 26/09 après un premier rendu de 16 coquilles de 1,3 Ko qui passait la forme) : une fiche doit être
// exécutable par un exécutant sans contexte — étapes concrètes, critères de fin, périmètre cohérent, source citée.
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')
const liste = (t, cle) => { const m = t.match(new RegExp(`^${cle}:\\s*\\[(.*)\\]`, 'm')); return m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [] }
const section = (t, titre) => (t.split(new RegExp(`^## ${titre}.*$`, 'm'))[1] || '').split(/^## /m)[0]
const idsJuges = new Set(nouvelles.filter((f) => /^executant:\s*claude-code/m.test(texte[f])).map((f) => f.replace('.md', '')))
const perimJuges = nouvelles.filter((f) => idsJuges.has(f.replace('.md', ''))).flatMap((f) => liste(texte[f], 'perimetre'))
for (const f of nouvelles) {
  const id = f.replace('.md', ''); const t = texte[f]
  if (t.length < 4000) manques.push(`${id} : ${t.length} caractères (< 4000) — une fiche exécutable détaille le travail (voir 026-140 à 026-145)`)
  if (/Se conformer strictement aux sp[ée]cifications/i.test(t)) manques.push(`${id} : consigne générique « se conformer aux spécifications » au lieu d'étapes`)
  const etapes = (section(t, "Ce qu'il faut faire").match(/^\s*\d+[.)]\s+\S/gm) || []).length
  if (etapes < 5) manques.push(`${id} : ${etapes} étape(s) numérotée(s) dans « Ce qu'il faut faire » (≥ 5 concrètes)`)
  const fin = (section(t, "C'est fini quand").match(/^\s*(?:[-*]|\d+[.)])\s+\S/gm) || []).length
  if (fin < 3) manques.push(`${id} : ${fin} critère(s) dans « C'est fini quand » (≥ 3 vérifiables)`)
  const perim = liste(t, 'perimetre'); const interdit = liste(t, 'interdit')
  for (const p of perim) for (const g of interdit) if (globRe(g).test(p.replace(/\/\*\*$/, '/x'))) manques.push(`${id} : « ${p} » est à la fois dans perimetre et interdit (${g})`)
  if (!/Ecosysteme-Marketing-Reel-2026-09-25\.md[^\n]*(§|:\d+|section)/.test(t)) manques.push(`${id} : ne cite pas sa source précise (Ecosysteme-Marketing-Reel-2026-09-25.md, § ou ligne)`)
  if (!idsJuges.has(id)) {
    const script = ((t.match(/^verifier:.*?(scripts\/[\w./-]+\.mjs)/m) || [])[1]) || ''
    if (script && !existsSync(script) && !perimJuges.includes(script)) manques.push(`${id} : son verifier lance ${script}, qu'aucune fiche de juges (claude-code) nouvelle n'écrit`)
    const deps = ((t.match(/Dépend de[^\n]*/) || [''])[0].match(/026-\d{3}/g) || [])
    if (!deps.some((d) => idsJuges.has(d))) manques.push(`${id} : ne dépend d'aucune des nouvelles fiches de juges (les juges d'abord)`)
  }
}
const laya = nouvelles.filter((f) => /Laya|jev (noul|score|decide)/i.test(texte[f]))
if (nouvelles.length && !laya.length) manques.push('aucune fiche marketing ne branche Laya/Jev (contrôle des chiffres avant publication, score) : consigne de Benj')
const juges = nouvelles.filter((f) => /^executant:\s*claude-code/m.test(texte[f]))
if (nouvelles.length && !juges.length) manques.push('aucune fiche de juges (claude-code) parmi les nouvelles : les juges précèdent toujours la production')
if (!/Ce que l'assemblage marketing du 26\/09 a changé/.test(index)) manques.push('INDEX : section « Ce que l\'assemblage marketing du 26/09 a changé » absente')

const cov = spawnSync(process.execPath, ['scripts/juges-026-preuve.mjs', '--couverture'], { encoding: 'utf8' })
if (cov.status !== 0) manques.push(`couverture 026-001 en échec : ${(cov.stdout || '').split('\n').filter((l) => /FAIL|✗/.test(l)).slice(0, 3).join(' | ')}`)

if (manques.length) { console.log(`juges-026-marketing-assemblage : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log(`juges-026-marketing-assemblage : PASS — ${nouvelles.length} fiches (C01–C16 couvertes, ${juges.length} de juges, ${laya.length} avec Laya), couverture 026-001 verte`)
