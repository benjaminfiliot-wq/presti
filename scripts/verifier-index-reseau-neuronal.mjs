#!/usr/bin/env node
// Vérificateur de la tâche 031-001 (phase 1.4 du réseau neuronal, 01/11/2026) : chaque note-index des dossiers numérotés du
// vault relie au moins 3 notes, tout lien [[…]] de son corps mène à une note existante et non écartée (même
// résolveur que l'outil relier_notes : cerveau/src/ecriture.mjs). On compte les notes distinctes.
//   node scripts/verifier-index-reseau-neuronal.mjs   → code 0 si tout passe, 1 sinon
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const VAULT = path.join(os.homedir(), 'Documents', 'SaaS')
const MIN = 3
const { resoudre, notesDuVault } = await import(pathToFileURL(path.join(os.homedir(), 'Documents', 'cerveau', 'src', 'ecriture.mjs')).href)
const notes = notesDuVault()
const index = notes.filter((r) => /^\d{2} /.test(r) && /\/Index - [^/]+\.md$/.test(r)).sort()
let echecs = 0
for (const rel of index) {
  const texte = fs.readFileSync(path.join(VAULT, ...rel.split('/')), 'utf8')
  // tout le corps compte (l'index des décisions relie ses ADR dans un tableau), l'en-tête non
  const section = texte.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  // dans un tableau, Obsidian écrit l'alias « [[note\|texte]] » : la barre oblique inverse n'appartient pas au nom
  const liens = [...section.matchAll(/\[\[([^\]|#]+?)\\?(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim())
  const fautes = []
  for (const l of liens) { try { resoudre(l, notes) } catch (e) { fautes.push(e.message) } }
  // une même note citée deux fois dans un index écrit à la main n'est pas une faute : on compte les notes distinctes
  const distincts = new Set(liens.map((l) => l.toLowerCase()))
  const ok = distincts.size >= MIN && !fautes.length
  if (!ok) echecs++
  console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${String(distincts.size).padStart(2)} notes  ${rel}${fautes.length ? ` — ${fautes.join(' ; ')}` : ''}`)
}
if (index.length < 20) { echecs++; console.log(`ÉCHEC : ${index.length} notes-index trouvées, 20 attendues`) }
console.log(`${index.length} notes-index, ${echecs} en échec (au moins ${MIN} liens chacune, tous résolus)`)
process.exitCode = echecs ? 1 : 0
