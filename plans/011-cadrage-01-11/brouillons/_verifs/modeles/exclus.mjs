// Liste des exclusions du cerveau sous vault/ (chemins et raisons seulement).
import fs from 'node:fs'
const I = JSON.parse(fs.readFileSync('C:/Users/benja/Documents/cerveau/data/index.json', 'utf8'))
const ex = (I.exclus || []).filter((e) => /^vault\//.test(e.chemin || e.f || ''))
const parRaison = {}
for (const e of ex) { const r = e.raison || '?'; (parRaison[r] ??= []).push(e.chemin || e.f) }
for (const [r, l] of Object.entries(parRaison)) console.log(r, '→', l.length, l.filter((c) => /Prospection/.test(c)))
