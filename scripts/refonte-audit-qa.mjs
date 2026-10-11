#!/usr/bin/env node
// scripts/refonte-audit-qa.mjs — juge de la fiche 027-01 (audit de l'existant avant la refonte, 05/10/2026).
// Il teste la SUBSTANCE, jamais l'existence seule (mémoire « preuve vide = mensonge ») : taille réelle, signature PNG, dimensions,
// captures toutes différentes, défauts reliés à un fichier du dépôt qui existe vraiment.
// Usage : node scripts/refonte-audit-qa.mjs     (code 0 : PASS ; code 1 : critère rouge)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.join(RACINE, 'docs', 'refonte', 'audit')
const PAGES = ['accueil', 'faq', 'contact', 'connexion', 'essai-formulaire', 'outils']
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

const audit = path.join(DOSSIER, 'AUDIT.md')
const texte = fs.existsSync(audit) ? fs.readFileSync(audit, 'utf8') : ''
ok('AU-1 AUDIT.md existe et pèse au moins 4 000 signes', texte.length >= 4000, `${texte.length} signes`)
for (const [id, titre] of [['AU-2', 'Pages'], ['AU-3', 'Défauts'], ['AU-4', 'Opportunités'], ['AU-5', 'Priorités']]) {
  ok(`${id} section « ## ${titre} »`, new RegExp(`^##\\s+${titre}\\b`, 'mi').test(texte))
}

// Les défauts citent des fichiers du dépôt : au moins 12 références distinctes, toutes existantes.
const refs = [...new Set([...texte.matchAll(/`((?:app|lib|public|components)\/[A-Za-z0-9_\-./\[\]()]+?)(?::\d+)?`/g)].map((m) => m[1]))]
const absentes = refs.filter((r) => !fs.existsSync(path.join(RACINE, r.replace(/[*]+$/, ''))))
ok('AU-6 au moins 12 références distinctes à des fichiers du dépôt', refs.length >= 12, `${refs.length} trouvées`)
ok('AU-7 toutes les références pointent un fichier existant', absentes.length === 0, `inexistantes : ${absentes.slice(0, 5).join(', ')}`)

// Chaque priorité porte un chiffre mesuré (px, ms, %, Ko, s, score) : pas d'impression.
const sectionPrio = (/^##\s+Priorités\b([\s\S]*?)(?=^##\s|\s*$(?![\s\S]))/mi.exec(texte) ?? [])[1] ?? ''
const lignesPrio = sectionPrio.split(/\r?\n/).filter((l) => /^\s*(?:[-*]|\d+\.|\|)/.test(l) && !/^\s*\|[-\s|:]+\|\s*$/.test(l))
const mesurees = lignesPrio.filter((l) => /\d+\s?(?:px|ms|s\b|%|Ko|Mo|\/100)/.test(l))
ok('AU-8 au moins 6 priorités, dont au moins 5 portent une mesure chiffrée', lignesPrio.length >= 6 && mesurees.length >= 5, `${lignesPrio.length} priorités, ${mesurees.length} mesurées`)

// Captures : bureau (≥ 1 200 px de large) et mobile (390 px, ou 780 px en 2×, comme le rend scripts/capture-url.mjs), PNG réels, toutes différentes.
function ihdr(buf) {
  const sig = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return sig ? { largeur: buf.readUInt32BE(16), hauteur: buf.readUInt32BE(20) } : null
}
const empreintes = new Set()
let nbCaptures = 0
const ennuis = []
for (const p of PAGES) {
  for (const vue of ['bureau', 'mobile']) {
    const f = path.join(DOSSIER, 'captures', `${vue}-${p}.png`)
    if (!fs.existsSync(f)) { ennuis.push(`${vue}-${p} absente`); continue }
    const b = fs.readFileSync(f)
    const h = ihdr(b)
    if (b.length < 15000) ennuis.push(`${vue}-${p} : ${b.length} octets`)
    else if (!h) ennuis.push(`${vue}-${p} : pas un PNG`)
    else if (vue === 'bureau' && h.largeur < 1200) ennuis.push(`${vue}-${p} : ${h.largeur} px de large`)
    else if (vue === 'mobile' && (h.largeur > 800 || h.largeur < 300)) ennuis.push(`${vue}-${p} : ${h.largeur} px de large (390 ou 780 attendus)`)
    else { nbCaptures++; empreintes.add(crypto.createHash('sha256').update(b).digest('hex')) }
  }
}
ok(`AU-9 les ${PAGES.length * 2} captures (bureau et mobile) existent, ≥ 15 Ko, PNG, bonnes largeurs`, ennuis.length === 0, ennuis.slice(0, 4).join(' ; '))
ok('AU-10 aucune capture n\'est la copie d\'une autre', empreintes.size === nbCaptures && nbCaptures > 0, `${empreintes.size} empreintes pour ${nbCaptures} captures`)

console.log(rouges.length ? `refonte-audit-qa : ÉCHEC (${rouges.join(', ')})` : 'refonte-audit-qa : PASS (10 critères)')
process.exitCode = rouges.length ? 1 : 0
