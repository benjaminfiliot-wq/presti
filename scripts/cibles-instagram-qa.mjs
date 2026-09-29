#!/usr/bin/env node
// Juge de la tâche 022-01 — les prochaines cibles Instagram (SaaS/Prospection/cibles-instagram-2026-09-15.json).
//
// Il juge la FORME et l'exclusion. L'existence réelle de chaque compte, sa bio et son bouton « Contacter » sont vérifiés
// ensuite par Claude Code dans le Chrome connecté de Benj, jamais sur la parole de l'agent : un vérificateur qui croit
// l'agent est satisfait par une liste inventée (mémoire « le juge capture lui-même »).
//
// Usage (depuis la racine de presti) : node scripts/cibles-instagram-qa.mjs
import fs from 'node:fs'

const FICHIER = '../SaaS/Prospection/cibles-instagram-2026-09-15.json'
const EXCLUS = '../SaaS/Prospection/deja-contactes-instagram.txt'
const DEPARTEMENTS = new Set(['16', '17', '79', '85'])
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const fin = () => { console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`); process.exit(ko === 0 ? 0 : 1) }

const exclus = new Set()
const nomsExclus = []
for (const l of fs.readFileSync(EXCLUS, 'utf8').split(/\r?\n/)) {
  const s = l.trim()
  if (!s || s.startsWith('#')) continue
  if (s.startsWith('nom:')) nomsExclus.push(s.slice(4).trim().toLowerCase())
  else exclus.add(s.toLowerCase())
}
const metiers = new Set([...fs.readFileSync('plans/accroches-par-metier.md', 'utf8').matchAll(/^\| \*\*([^*]+)\*\* \|/gm)].map((m) => m[1].trim()))

let donnees
try { donnees = JSON.parse(fs.readFileSync(FICHIER, 'utf8')) } catch (e) { T('le fichier existe et se lit en JSON', false, e.message); fin() }
const cibles = Array.isArray(donnees?.cibles) ? donnees.cibles : []
T('« cibles » : au moins 25 comptes', cibles.length >= 25, String(cibles.length))
T('« methode » dit comment ils ont été trouvés (40 caractères au moins)', typeof donnees?.methode === 'string' && donnees.methode.trim().length >= 40)

const vus = new Set()
const pb = { forme: [], doublons: [], exclus: [], metier: [], zone: [], bio: [], source: [], pourquoi: [] }
for (const c of cibles) {
  const h = String(c?.handle ?? '').trim().replace(/^@/, '').toLowerCase()
  if (!/^[a-z0-9._]{2,30}$/.test(h)) { pb.forme.push(String(c?.handle)); continue }
  if (vus.has(h)) pb.doublons.push(h)
  vus.add(h)
  const nom = String(c?.nom_affiche ?? '').toLowerCase()
  if (exclus.has(h) || nomsExclus.some((n) => n && nom.includes(n))) pb.exclus.push(h)
  if (!metiers.has(String(c?.metier ?? '').trim())) pb.metier.push(`${h} : ${c?.metier}`)
  if (!DEPARTEMENTS.has(String(c?.departement ?? '')) || !String(c?.ville ?? '').trim()) pb.zone.push(`${h} : ${c?.departement}/${c?.ville}`)
  const bio = String(c?.bio_extrait ?? '').trim()
  if (bio.length < 10 || bio.length > 300) pb.bio.push(`${h} : ${bio.length}`)
  if (!/^https:\/\/\S+$/.test(String(c?.source_url ?? ''))) pb.source.push(h)
  const p = String(c?.pourquoi ?? '').trim()
  if (p.length < 15 || p.length > 300) pb.pourquoi.push(h)
}
T('chaque handle est un identifiant Instagram valide', pb.forme.length === 0, pb.forme.join(', '))
T('aucun doublon', pb.doublons.length === 0, pb.doublons.join(', '))
T('aucun compte déjà contacté, en réserve ou écarté', pb.exclus.length === 0, pb.exclus.join(', '))
T('métier écrit exactement comme dans plans/accroches-par-metier.md', pb.metier.length === 0, pb.metier.join(' · '))
T('ville renseignée et département 16, 17, 79 ou 85', pb.zone.length === 0, pb.zone.join(' · '))
T('extrait de bio de 10 à 300 caractères', pb.bio.length === 0, pb.bio.join(' · '))
T('source_url en https', pb.source.length === 0, pb.source.join(', '))
T('« pourquoi » en une phrase (15 à 300 caractères)', pb.pourquoi.length === 0, pb.pourquoi.join(', '))
const parMetier = {}
for (const c of cibles) parMetier[c?.metier] = (parMetier[c?.metier] ?? 0) + 1
T('au moins six métiers différents', Object.keys(parMetier).length >= 6, JSON.stringify(parMetier))
T('pas plus de sept comptes pour un même métier', Object.values(parMetier).every((n) => n <= 7), JSON.stringify(parMetier))
fin()
