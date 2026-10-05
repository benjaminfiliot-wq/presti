import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ERREUR = (code, message) => Object.assign(new Error(message), { code })
const limite = (f, n) => fs.existsSync(f) && fs.statSync(f).size > 0 && fs.statSync(f).size <= n
const empreinte = (octets) => crypto.createHash('sha256').update(octets).digest('hex')

function jpegValide(octets) {
  if (octets.length < 300 || octets[0] !== 0xff || octets[1] !== 0xd8 || octets[2] !== 0xff || octets.at(-2) !== 0xff || octets.at(-1) !== 0xd9) return false
  let sof = false
  let donnees = null
  for (let i = 2; i < octets.length - 9;) {
    if (octets[i] !== 0xff) { i++; continue }
    const marque = octets[i + 1]
    const longueur = octets.readUInt16BE(i + 2)
    if (longueur < 2) return false
    if (marque === 0xda) { donnees = octets.subarray(i + 2 + longueur, octets.length - 2); break }
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marque)) sof = true
    i += 2 + longueur
  }
  if (!sof || !donnees || donnees.length < 200) return false
  // Une capture « vide » garde sa structure JPEG : seules les DONNÉES compressées (après l'en-tête du scan) la trahissent, les
  // tables de l'en-tête ne comptent pas. Les captures réelles de l'Atelier portent les 256 valeurs, aucune au-delà de 16 %.
  const compte = new Array(256).fill(0)
  for (const o of donnees) compte[o]++
  return compte.filter(Boolean).length >= 64 && Math.max(...compte) / donnees.length <= 0.5
}
function tailleDossier(dossier) {
  let total = 0
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const nom = path.join(dossier, entree.name)
    total += entree.isDirectory() ? tailleDossier(nom) : entree.isFile() ? fs.statSync(nom).size : 0
  }
  return total
}
function dossierPermis(dossier) {
  const absolu = path.resolve(dossier)
  const relatif = path.relative(RACINE, absolu)
  if (absolu === RACINE || (relatif && !relatif.startsWith('..') && !path.isAbsolute(relatif) && !relatif.startsWith(`.orchestre${path.sep}travail${path.sep}`))) throw ERREUR(2, 'dossier de sortie interdit')
  if (absolu.split(path.sep).includes('public')) throw ERREUR(2, 'dossier public interdit')
}
function horodatage(horloge) {
  const valeur = horloge?.maintenant?.() ?? Date.now()
  const d = new Date(valeur)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/** Les dossiers de fabrication de plus de 3 jours disparaissent : les fichiers sont dans le stockage. Seulement ceux qui portent maquette.json. */
function menage(dossierSortie) {
  if (!fs.existsSync(dossierSortie)) return
  for (const entree of fs.readdirSync(dossierSortie, { withFileTypes: true })) {
    if (!entree.isDirectory() || !/^[a-z0-9_-]{1,80}$/i.test(entree.name)) continue
    const dossier = path.join(dossierSortie, entree.name)
    try {
      if (fs.existsSync(path.join(dossier, 'maquette.json')) && Date.now() - fs.statSync(dossier).mtimeMs > 3 * 86_400_000) fs.rmSync(dossier, { recursive: true, force: true })
    } catch { /* il restera pour le prochain passage */ }
  }
}

export async function passeAtelier({ magasin, executer, horloge, dossierSortie }) {
  dossierPermis(dossierSortie)
  menage(path.resolve(dossierSortie))
  const travail = await magasin.travail()
  if (travail?.pause) return { fabriques: 0, refuses: 0, liens: 0 }
  let fabriques = 0, refuses = 0, liens = 0
  for (const prospect of travail.a_fabriquer ?? []) {
    if (!/^[a-z0-9_-]{1,80}$/i.test(prospect.cle) || !/^[a-z0-9_-]{1,80}$/i.test(prospect.metier)) { refuses++; continue }
    if (!fs.existsSync(path.join(RACINE, 'maquettes', 'modeles', prospect.metier))) { refuses++; continue }
    const dossier = path.join(path.resolve(dossierSortie), prospect.cle)
    fs.rmSync(dossier, { recursive: true, force: true })
    fs.mkdirSync(dossier, { recursive: true })
    const source = prospect.fait ? { fait: prospect.fait.extrait, source: prospect.fait.url, repere: prospect.fait.id, releve_le: prospect.fait.lu_le } : { fait: `Maquette demandée par l'entreprise le ${horodatage(horloge)}`, source: 'demande', repere: 'entrant', releve_le: new Date(horloge?.maintenant?.() ?? Date.now()).toISOString() }
    const json = path.join(dossier, 'maquette.json')
    fs.writeFileSync(json, JSON.stringify({ entreprise: prospect.entreprise, metier: prospect.metier, ville: prospect.ville, communes: prospect.communes, modele: prospect.metier, source_fait: source }))
    const site = path.join(dossier, 'site')
    const video = path.join(dossier, 'video.mp4')
    try {
      for (const args of [
        [path.join(RACINE, 'public/sites-demo/generer.mjs'), `--maquette=${json}`, `--sortie=${site}`],
        [path.join(RACINE, 'scripts/maquette-capturer.mjs'), site],
        [path.join(RACINE, 'scripts/agents/maquette-video.mjs'), site, `--sortie=${video}`],
      ]) {
        const r = executer(process.execPath, args, { cwd: RACINE, encoding: 'utf8', timeout: 180_000, shell: false })
        if (r.status !== 0) throw ERREUR(1, 'lanceur')
      }
      const fichiers = { 'capture-telephone.jpg': path.join(site, 'capture-telephone.jpg'), 'capture-ordinateur.jpg': path.join(site, 'capture-bureau.jpg'), 'video.mp4': video }
      // Tout se juge sur le disque AVANT le premier dépôt : un fichier refusé ne laisse rien dans le stockage.
      const octetsDe = {}, empreintes = {}
      for (const [nom, fichier] of Object.entries(fichiers)) {
        if (!limite(fichier, nom === 'video.mp4' ? 3 * 1024 ** 2 : 1024 ** 2)) throw ERREUR(1, 'taille')
        const octets = fs.readFileSync(fichier)
        if (nom === 'video.mp4' ? octets.toString('ascii', 4, 8) !== 'ftyp' : !jpegValide(octets)) throw ERREUR(1, 'format')
        empreintes[nom] = empreinte(octets)
        octetsDe[nom] = octets
      }
      if (tailleDossier(dossier) > 6 * 1024 ** 2) throw ERREUR(1, 'dossier')
      const objets = {}
      for (const [nom, octets] of Object.entries(octetsDe)) objets[nom] = await magasin.deposer(prospect.prospect_id, nom, octets)
      await magasin.maquettePrete(prospect.prospect_id, objets, empreintes)
      fabriques++
    } catch { refuses++ }
  }
  for (const id of travail.liens_a_creer ?? []) { try { const r = await magasin.demanderLien(id); if (r?.ok) liens++ } catch { /* prochain passage */ } }
  console.log(`atelier : ${fabriques} fabriquées, ${refuses} refusées, ${liens} liens`)
  return { fabriques, refuses, liens }
}

function coffre() {
  // Lancé par l'unité systemd (avec-coffre.mjs NOM -- …), l'atelier reçoit déjà son jeton et PRESTI_URL en variables : le coffre partagé de l'usine porte maintenant d'autres jetons (chef, facteur, studio…), que sa lecture directe refuse (« coffre refusé », code 3 à chaque passage le 05/10).
  if (process.env.PRESTI_URL && process.env.PRESTI_JETON_ATELIER) return { PRESTI_URL: process.env.PRESTI_URL, PRESTI_JETON_ATELIER: process.env.PRESTI_JETON_ATELIER }
  const fichier = path.join(os.homedir(), '.config/presti/agents.env')
  if (!fs.existsSync(fichier)) throw ERREUR(3, 'coffre absent')
  const lignes = fs.readFileSync(fichier, 'utf8').split(/\r?\n/).filter((x) => x.trim() && !x.trim().startsWith('#'))
  const valeurs = {}
  for (const ligne of lignes) {
    const m = /^([A-Z_]+)=(.*)$/.exec(ligne)
    if (!m || !['PRESTI_URL', 'PRESTI_JETON_ATELIER'].includes(m[1]) || /sb_secret_|SUPABASE_SERVICE_ROLE_KEY|STRIPE|ANTHROPIC_API_KEY/i.test(ligne)) throw ERREUR(3, 'coffre refusé')
    valeurs[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  if (!valeurs.PRESTI_URL || !valeurs.PRESTI_JETON_ATELIER) throw ERREUR(3, 'coffre incomplet')
  return valeurs
}
/** Un verrou par fichier : deux passes ne fabriquent jamais la même maquette. Périmé après 2 h (une passe qui a planté). */
function prendreVerrou(dossier) {
  fs.mkdirSync(dossier, { recursive: true })
  const fichier = path.join(dossier, '.passe.verrou')
  try { if (Date.now() - fs.statSync(fichier).mtimeMs > 2 * 3600_000) fs.rmSync(fichier, { force: true }) } catch { /* pas de verrou */ }
  let fd
  try { fd = fs.openSync(fichier, 'wx') } catch { return null }
  fs.closeSync(fd)
  return () => { try { fs.rmSync(fichier, { force: true }) } catch { /* sans importance */ } }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let liberer = null
  try {
    const valeurs = coffre()
    const { magasinUsine } = await import('../../lib/agents/acquisition/magasinUsine.ts')
    const dossierSortie = path.join(os.homedir(), 'atelier/maquettes')
    liberer = prendreVerrou(dossierSortie)
    if (!liberer) console.log('atelier : une passe est déjà en cours')
    else await passeAtelier({ magasin: magasinUsine(valeurs.PRESTI_URL, valeurs.PRESTI_JETON_ATELIER), executer: spawnSync, horloge: { maintenant: () => Date.now() }, dossierSortie })
  } catch (e) { console.error('atelier : arrêt'); process.exitCode = e?.code === 3 ? 3 : e?.code === 2 ? 2 : 1 }
  finally { liberer?.() }
}
