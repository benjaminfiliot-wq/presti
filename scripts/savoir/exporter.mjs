#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chercherSecrets } from '../instantane-quotidien.mjs'

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const defautSources = path.join(depot, 'docs/savoir/sources.json')
const defautSortie = 'C:/Users/benja/AppData/Local/presti-savoir/export'
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const dans = (parent, enfant) => { const r = path.relative(parent, enfant); return r === '' || (r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r)) }
const poser = (p, b) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b) }

function glob(motif, chemin) {
  const points = motif.split('**').map((segment) => segment.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '[^/]*'))
  const re = points.join('.*')
  return new RegExp(`^${re}$`).test(chemin)
}
function repond(motif, racine, chemin, dossier = false) {
  let p = motif
  if (!p.startsWith('**/')) {
    const i = p.indexOf(':')
    if (i < 0 || p.slice(0, i) !== racine) return false
    p = p.slice(i + 1)
  }
  for (const candidat of p.startsWith('**/') ? [p, p.slice(3)] : [p]) {
    if (candidat.endsWith('/**') && (glob(candidat.slice(0, -3), chemin) || glob(candidat, chemin))) return true
    if (glob(candidat, chemin)) return true
  }
  return false
}
function exclu(contrat, racine, chemin) {
  const morceaux = chemin.split('/')
  for (let i = 1; i <= morceaux.length; i++) {
    const candidat = morceaux.slice(0, i).join('/')
    if (contrat.exclusions.some((m) => repond(m, racine, candidat, i < morceaux.length))) return true
  }
  return false
}
function luhn(texte) {
  const chiffres = texte.replace(/\D/g, '')
  let somme = 0
  for (let i = 0; i < chiffres.length; i++) { let n = Number(chiffres[chiffres.length - i - 1]); if (i % 2) { n *= 2; if (n > 9) n -= 9 } somme += n }
  return somme % 10 === 0
}
function caviarder(contrat, texte) {
  let compte = 0
  for (const regle of contrat.caviardage.regles) {
    texte = texte.replace(new RegExp(regle.regex, regle.flags || 'g'), (valeur) => {
      if (regle.luhn && !luhn(valeur)) return valeur
      compte++
      return regle.remplace_par
    })
  }
  return { texte, compte }
}
function options() {
  const o = { sources: defautSources, sortie: defautSortie, sec: false }
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--sources=')) o.sources = a.slice(10)
    else if (a.startsWith('--sortie=')) o.sortie = a.slice(9)
    else if (a === '--a-sec') o.sec = true
    else throw new Error(`argument inconnu : ${a}`)
  }
  o.sources = path.resolve(o.sources); o.sortie = path.resolve(o.sortie)
  return o
}
function sortiePermise(contrat, sortie) {
  for (const [nom, valeur] of Object.entries({ ...contrat.racines, depot })) {
    const racine = path.resolve(valeur)
    if (dans(sortie, racine)) return false
    if (dans(racine, sortie)) {
      const relative = path.relative(racine, sortie).split(path.sep).join('/')
      if (nom !== 'depot' && exclu(contrat, nom, relative)) continue
      if (nom === 'depot' && exclu(contrat, 'presti', relative)) continue
      return false
    }
  }
  return true
}

function exporter() {
  const o = options()
  const sourceBrute = fs.readFileSync(o.sources)
  const contrat = JSON.parse(sourceBrute)
  if (!sortiePermise(contrat, o.sortie)) { console.error('sortie interdite'); return 2 }
  const compteurs = Object.fromEntries(['general', 'prospects', 'reclasses', 'hors_liste', 'exclus', 'exclus_memoire', 'lignes_memoire_retirees', 'format_non_lu', 'trop_gros', 'secrets', 'caviardages', 'autres'].map((k) => [k, 0]))
  const date = new Date().toISOString()
  const manifestes = Object.fromEntries(['general', 'prospects'].map((c) => [c, { version: 1, compartiment: c, exporte_le: date, fichiers: [], non_lus: [] }]))
  const secrets = [], contenus = []
  const memoireExclue = new RegExp(contrat.exclusions_memoire.regex)
  let total = 0
  for (const [racine, dossier] of Object.entries(contrat.racines)) {
    const parcourir = (base, relatif) => {
      for (const entree of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
        const chemin = relatif ? `${relatif}/${entree.name}` : entree.name
        if (exclu(contrat, racine, chemin)) { compteurs.exclus++; continue }
        if (entree.isSymbolicLink()) { compteurs.autres++; continue }
        const absolu = path.join(base, entree.name)
        if (entree.isDirectory()) { parcourir(absolu, chemin); continue }
        if (!entree.isFile()) { compteurs.autres++; continue }
        if (racine === 'memoire' && entree.name !== 'MEMORY.md' && memoireExclue.test(entree.name)) { compteurs.exclus_memoire++; continue }
        const prospect = contrat.prospects.some((m) => repond(m, racine, chemin))
        const ligne = prospect ? null : contrat.sources.find((s) => repond(s.motif, racine, chemin))
        if (!prospect && !ligne) { compteurs.hors_liste++; continue }
        let classe = prospect ? 'prospects' : ligne.classe
        const compartimentInitial = classe === 'prospects' ? 'prospects' : 'general'
        let raison
        if (!contrat.formats.includes(path.extname(chemin).toLowerCase())) raison = 'format_non_lu'
        else if (fs.lstatSync(absolu).size > contrat.plafonds.octets_par_fichier) raison = 'trop_gros'
        if (raison) { compteurs[raison]++; manifestes[compartimentInitial].non_lus.push({ racine, chemin, raison }); continue }
        const brut = fs.readFileSync(absolu)
        let texte = brut.toString('utf8')
        const motifs = chercherSecrets(texte)
        if (motifs.length) { compteurs.secrets++; secrets.push({ racine, chemin, motifs }); continue }
        if (racine === 'memoire' && chemin === 'MEMORY.md') {
          const lignes = texte.split('\n')
          compteurs.lignes_memoire_retirees += lignes.filter((l) => memoireExclue.test(l)).length
          texte = lignes.filter((l) => !memoireExclue.test(l)).join('\n')
        }
        let donnees = brut, caviardages = 0, reclasse = false
        if (classe !== 'prospects') {
          const resultat = caviarder(contrat, texte)
          if (resultat.compte >= contrat.reclassement.coordonnees_min) { classe = 'prospects'; reclasse = true; compteurs.reclasses++ }
          else { donnees = Buffer.from(resultat.texte); caviardages = resultat.compte; compteurs.caviardages += caviardages }
        }
        const compartiment = classe === 'prospects' ? 'prospects' : 'general'
        compteurs[compartiment]++
        total += donnees.length
        manifestes[compartiment].fichiers.push({ racine, chemin, classe, sha256: sha256(donnees), octets: donnees.length, caviardages, reclasse })
        contenus.push({ compartiment, racine, chemin, donnees })
      }
    }
    if (fs.existsSync(dossier)) parcourir(dossier, '')
  }
  if (total > contrat.plafonds.octets_total || contenus.length > contrat.plafonds.fichiers) { console.error('plafond dépassé'); return 1 }
  manifestes.general.prospects_compte = manifestes.prospects.fichiers.length
  const rapport = { version: 1, exporte_le: date, compteurs, secrets }
  if (o.sec) { console.log(JSON.stringify(compteurs)); return 0 }
  const part = `${o.sortie}.part`
  if (fs.existsSync(part)) fs.rmSync(part, { recursive: true })
  for (const c of contenus) poser(path.join(part, c.compartiment, 'fichiers', c.racine, ...c.chemin.split('/')), c.donnees)
  for (const [c, manifeste] of Object.entries(manifestes)) poser(path.join(part, c, 'manifeste.json'), JSON.stringify(manifeste, null, 2))
  poser(path.join(part, 'rapport.json'), JSON.stringify(rapport, null, 2))
  if (fs.existsSync(o.sortie)) fs.rmSync(o.sortie, { recursive: true })
  fs.renameSync(part, o.sortie)
  console.log(JSON.stringify(compteurs))
  return 0
}
try { process.exitCode = exporter() } catch (e) { console.error(e.message); process.exitCode = 1 }
