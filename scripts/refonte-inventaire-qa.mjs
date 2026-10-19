#!/usr/bin/env node
// scripts/refonte-inventaire-qa.mjs — « 0 information vérifiée perdue » (PROMPT-BENJ §6), vérifié sur le RENDU, pas sur le code.
//
// Entrée : le relevé de la landing ACTUELLE (presti-ops/refonte-1018/avant/landing-mesures.json, scripts/refonte-avant-landing.mjs
// sur la production du 18/10 : chaque bloc de texte de chaque section, et le pied). Sortie : pour chaque bloc, OÙ il se trouve
// dans la nouvelle architecture — la landing v2 (/), /offres, /comparatif, /faq — lus sur une prévisualisation, texte rendu.
// Un bloc absent de partout est un ROUGE, sauf s'il est dans la liste des retraits justifiés ci-dessous (chacun avec sa raison,
// et sa destination quand le texte a changé de forme). Le relevé complet va dans presti-ops/refonte-1018/apres/inventaire.json.
//
// Usage : TEST_BASE=https://<déploiement>.vercel.app VERCEL_SHARE=<jeton> node scripts/refonte-inventaire-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(BASE)) { console.error('TEST_BASE : un déploiement *.vercel.app'); process.exit(2) }
const OPS = path.resolve(process.cwd(), '..', 'presti-ops', 'refonte-1018')
const avant = JSON.parse(fs.readFileSync(path.join(OPS, 'avant', 'landing-mesures.json'), 'utf8')).pages['/@1440']

// Retraits JUSTIFIÉS : texte qui ne figure plus tel quel, avec la raison (INVENTAIRE-CONTENU.md). Motif → raison.
const RETRAITS = [
  [/^Prépare la réponse Chiffre le devis/, 'Bande de mots défilante (décor) : sa phrase lecteur d’écran est gardée telle quelle (inventaire 3.1-3.2)'],
  [/^Relance le client Range la compta/, 'idem, bande de mots'],
  [/^Votre lien sur Google, Facebook ou dans votre signature mail : chaque demande/, 'Chapeau long du héros, raccourci ; chacun de ses faits est dans une slide de « Comment ça marche » ou une ligne d’offre (inventaire 2.4)'],
  [/^Ce qui se passe, de 22 h 14 à 7 h 52\.$/, 'Titre de section fusionné avec « Comment ça marche » (inventaire 7.1)'],
  [/^Un client écrit le soir\. Le lendemain matin, vous lancez le devis/, 'Chapeau fusionné dans celui de « Comment ça marche » (inventaire 7.1)'],
  [/^Essayer$/, 'Bouton « Essayer » du bandeau d’essai retiré (3 boutons d’essai au plus) ; le texte du bandeau reste (inventaire 12.6)'],
  [/^Qui a quoi, ligne par ligne$/, 'Le tableau replié part sur /offres, déplié, sous ce titre (inventaire 12.8) — vérifié sur /offres'],
  [/^Presti et les autres logiciels de devis et factures\.$/, 'Titre du comparatif : sur /comparatif (inventaire 13.1)'],
  [/^Les mêmes critères pour tous, lus sur le site de chaque éditeur\. Les autres font/, 'Chapeau du comparatif : sur /comparatif (inventaire 13.1)'],
  [/^Voir ce que ça fait$/, 'Bouton secondaire du héros renommé « Voir comment ça marche » (même rôle, mène à #comment) (inventaire 2.6)'],
]
const norm = (t) => t.replace(/[’']/g, "'").replace(/ | /g, ' ').replace(/\s+/g, ' ').trim()
// Pour COMPARER : sans casse (le CSS met des titres en capitales, innerText les rend ainsi) et sans espaces (textContent recolle
// les cellules et les puces sans séparateur).
const cleDe = (t) => norm(t).toLowerCase().replace(/\s+/g, '')

const nav = await chromium.launch()
const textes = {}
try {
  const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage()
  if (process.env.VERCEL_SHARE) await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE)}`, { waitUntil: 'networkidle', timeout: 90_000 })
  for (const ch of ['/', '/offres', '/comparatif', '/faq']) {
    await page.goto(`${BASE}${ch}`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(600)
    // Tout le texte, y compris celui des panneaux d'onglets, des slides et des <details> fermés (textContent, pas innerText).
    textes[ch] = cleDe(await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true }); return document.body.textContent || '' }))
  }
} finally { await nav.close() }
// --prouver-rouge : sans la page /comparatif, les sources et mentions du comparatif doivent sortir « perdues ».
if (process.argv.includes('--prouver-rouge')) textes['/comparatif'] = ''

const blocs = []
for (const s of avant.sections) for (const b of s.blocs) blocs.push({ section: s.titre || s.classe, texte: b.texte })
for (const b of avant.piedBlocs) blocs.push({ section: 'pied', texte: b.texte })
let ok = 0, justifies = 0
const rouges = []
const releve = []
for (const b of blocs) {
  const t = norm(b.texte)
  if (t.length < 3) continue
  // Les blocs longs sont comparés sur leurs 120 premiers caractères (les cellules d'un tableau se recollent autrement).
  const cle = cleDe(t.length > 120 ? t.slice(0, 120) : t)
  const ou = Object.entries(textes).filter(([, tx]) => tx.includes(cle)).map(([ch]) => ch)
  if (ou.length) { ok++; releve.push({ ...b, ou }); continue }
  // Carte COMPOSITE (une carte de l'ancienne page qui recollait métier, demande et règle, ou numéro, heure, titre et texte) :
  // retrouvée si chacune de ses phrases l'est, une fois retirés le numéro d'ordre, l'heure et le libellé en capitales.
  const phrases = t.split(/(?<=[.?!])\s+/).map((x) => x.replace(/^0\d\s+/, '').replace(/^(\d{1,2} h \d{2}|Ensuite)\s+/, '').replace(/^[A-ZÉÈÀÇ-]{4,}(\s[A-ZÉÈÀÇ-]{2,})*\s+/, '').trim()).filter((x) => x.length >= 12)
  if (phrases.length > 1) {
    const lieux = phrases.map((x) => Object.entries(textes).filter(([, tx]) => tx.includes(cleDe(x.slice(0, 120)))).map(([ch]) => ch))
    if (lieux.every((l) => l.length)) { ok++; releve.push({ ...b, ou: [...new Set(lieux.flat())], composite: true }); continue }
  }
  const r = RETRAITS.find(([m]) => m.test(t))
  if (r) { justifies++; releve.push({ ...b, ou: [], justification: r[1] }); continue }
  rouges.push(b); releve.push({ ...b, ou: [] })
}
fs.writeFileSync(path.join(OPS, 'apres', 'inventaire.json'), JSON.stringify({ base: BASE, date: new Date().toISOString(), releve }, null, 1))
console.log(`${blocs.length} blocs relevés sur la landing actuelle : ${ok} retrouvés, ${justifies} retraits justifiés, ${rouges.length} PERDU(S)`)
for (const b of rouges) console.log(`FAIL perdu [${b.section}] ${b.texte.slice(0, 160)}`)
if (process.argv.includes('--prouver-rouge')) { console.log(rouges.length ? 'PASS le juge rougit sans /comparatif' : 'FAIL le juge ne rougit pas'); process.exitCode = rouges.length ? 0 : 1 } else process.exitCode = rouges.length ? 1 : 0
