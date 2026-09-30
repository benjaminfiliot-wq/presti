#!/usr/bin/env node
// juge-maquettes-27.mjs — juge des maquettes de site pour les 30 meilleurs prospects de la liste du 27/09 (écrit AVANT la production).
// Depuis ~/veille : node juges/juge-maquettes-27.mjs → 0 PASS, 1 FAIL. Juge la substance : bonne entreprise, bon métier, vraies captures.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'maquettes-2026-09-27')
const manques = []
const liste = existsSync(join(R, 'prospection', 'liste-2026-09-27.csv')) ? readFileSync(join(R, 'prospection', 'liste-2026-09-27.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(';')) : []
const parSiren = new Map(liste.map((l) => [l[0], l]))
let man = []
try { man = JSON.parse(readFileSync(join(D, 'manifeste.json'), 'utf8')) } catch { manques.push('maquettes-2026-09-27/manifeste.json absent ou JSON invalide') }
if (man.length < 30) manques.push(`${man.length} maquette(s) dans le manifeste (30 attendues)`)
const taille = (p) => (existsSync(p) ? statSync(p).size : 0)
const img = (dos, base) => ['png', 'jpg', 'jpeg', 'webp'].map((e) => join(dos, `${base}.${e}`)).find((p) => existsSync(p))
const METIERS = { menuisier: /menuis/i, 'électricien': /[ée]lectri/i, plombier: /plomb/i, chauffagiste: /chauff/i, 'maçon': /ma[çc]onn/i, carreleur: /carrel/i, peintre: /peintu|peintre/i, couvreur: /couvr|toitur/i, isolation: /isol/i, paysagiste: /paysag|jardin/i }
const vus = new Set()
for (const m of man) {
  const tag = `${m.dossier || '?'} (${m.siren || '?'})`
  const l = parSiren.get(String(m.siren || ''))
  if (!l) { manques.push(`${tag} : SIREN absent de liste-2026-09-27.csv`); continue }
  if (vus.has(m.siren)) manques.push(`${tag} : SIREN en double`); vus.add(m.siren)
  if ((l[7] || '').trim() === 'oui') manques.push(`${tag} : l'entreprise a déjà un site (cible = sans site ou inconnu)`)
  const dos = join(D, m.dossier || '')
  const html = existsSync(join(dos, 'index.html')) ? readFileSync(join(dos, 'index.html'), 'utf8') : ''
  if (!html) { manques.push(`${tag} : index.html absent`); continue }
  const nom = (l[1] || '').trim(); const commune = (l[3] || '').trim(); const metier = (l[2] || '').trim().toLowerCase()
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (nom && !norm(html).includes(norm(nom).split(' ').slice(0, 2).join(' '))) manques.push(`${tag} : le nom « ${nom} » n'apparaît pas dans la page`)
  if (commune && !norm(html).includes(norm(commune).split(' ')[0])) manques.push(`${tag} : la commune « ${commune} » n'apparaît pas`)
  const re = Object.entries(METIERS).find(([k]) => metier.includes(k.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 5)) || metier.includes(k.slice(0, 5)))
  if (re && !re[1].test(html)) manques.push(`${tag} : la page ne parle pas du métier « ${metier} »`)
  if (/\b\d(?:[.,]\d)?\s*\/\s*5\b|★{3,}|\b\d{2,4}\s+avis\b/i.test(html)) manques.push(`${tag} : note ou nombre d'avis affiché (inventé) — interdit`)
  if (!/maquette/i.test(html)) manques.push(`${tag} : la mention « maquette » (exemple non contractuel) manque`)
  const b = img(dos, 'capture-bureau'); const t = img(dos, 'capture-telephone')
  if (!b || taille(b) < 30000) manques.push(`${tag} : capture-bureau absente ou < 30 Ko`)
  if (!t || taille(t) < 20000) manques.push(`${tag} : capture-telephone absente ou < 20 Ko`)
}
if (!existsSync(join(D, 'LISEZMOI.md')) || readFileSync(join(D, 'LISEZMOI.md'), 'utf8').length < 800) manques.push('maquettes-2026-09-27/LISEZMOI.md absent ou < 800 caractères (ordre d\'appel, modèle par métier, limites)')
if (manques.length) { console.log(`juge-maquettes-27 : FAIL — ${manques.length} manque(s)`); for (const x of manques.slice(0, 40)) console.log('  - ' + x); process.exit(1) }
console.log(`juge-maquettes-27 : PASS — ${man.length} maquettes (bonne entreprise, bon métier, captures réelles, mention maquette, aucun avis inventé)`)
