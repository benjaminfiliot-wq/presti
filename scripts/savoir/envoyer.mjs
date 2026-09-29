#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseDistante = '/srv/presti-savoir/depot'
const bourrage = (n) => Buffer.alloc((512 - n % 512) % 512)
function octal(b, position, largeur, n) { b.write(`${n.toString(8).padStart(largeur - 1, '0')}\0`, position, largeur, 'latin1') }
function entete(nom, taille, type = '0') {
  const b = Buffer.alloc(512)
  Buffer.from(nom).copy(b, 0, 0, 100)
  octal(b, 100, 8, 0o644); octal(b, 108, 8, 0); octal(b, 116, 8, 0)
  octal(b, 124, 12, taille); octal(b, 136, 12, Math.floor(Date.now() / 1000))
  b.write(type, 156, 1, 'latin1'); b.write('ustar\0', 257, 6, 'latin1'); b.write('00', 263, 2, 'latin1')
  b.fill(0x20, 148, 156)
  let somme = 0; for (const v of b) somme += v
  b.write(`${somme.toString(8).padStart(6, '0')}\0 `, 148, 8, 'latin1')
  return b
}
function pax(nom) {
  const corps = ` path=${nom}\n`
  let taille = Buffer.byteLength(corps) + 1
  while (true) { const nouvelle = Buffer.byteLength(corps) + String(taille).length; if (nouvelle === taille) break; taille = nouvelle }
  return Buffer.from(`${taille}${corps}`)
}
function archiver(dossier) {
  const fichiers = []
  const parcourir = (base, relatif) => {
    for (const entree of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
      if (entree.isSymbolicLink()) throw new Error('lien symbolique dans l’export')
      const nom = relatif ? `${relatif}/${entree.name}` : entree.name
      if (entree.isDirectory()) parcourir(path.join(base, entree.name), nom)
      else if (entree.isFile()) fichiers.push({ nom, donnees: fs.readFileSync(path.join(base, entree.name)) })
    }
  }
  parcourir(dossier, '')
  const blocs = []
  for (const fichier of fichiers) {
    const long = Buffer.byteLength(fichier.nom) > 100 || /[^\x20-\x7e]/.test(fichier.nom)
    if (long) { const x = pax(fichier.nom); blocs.push(entete('PaxHeaders/entree', x.length, 'x'), x, bourrage(x.length)) }
    blocs.push(entete(long ? 'fichiers/pax' : fichier.nom, fichier.donnees.length), fichier.donnees, bourrage(fichier.donnees.length))
  }
  blocs.push(Buffer.alloc(1024))
  return Buffer.concat(blocs)
}
function options() {
  const o = { export: 'C:/Users/benja/AppData/Local/presti-savoir/export', reglages: path.join(depot, 'docs/savoir/reglages.json'), sec: false }
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--export=')) o.export = a.slice(9)
    else if (a.startsWith('--sortie=')) o.export = a.slice(9)
    else if (a.startsWith('--reglages=')) o.reglages = a.slice(11)
    else if (a === '--a-sec') o.sec = true
    else throw new Error(`argument inconnu : ${a}`)
  }
  return o
}
function hote() {
  if (process.env.PRESTI_USINE) return process.env.PRESTI_USINE
  const texte = fs.readFileSync(path.join(depot, 'scripts/usine.mjs'), 'utf8')
  return /const HOTE = process\.env\.PRESTI_USINE \|\| '([^']+)'/.exec(texte)?.[1] || 'usine@88.96.53.3'
}
function envoyer() {
  const o = options()
  if (!JSON.parse(fs.readFileSync(o.reglages, 'utf8')).interrupteurs.envoi.actif) { console.log('envoi éteint'); return 0 }
  const maison = process.env.USERPROFILE || process.env.HOME || os.homedir()
  const horodatage = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const commandes = []
  for (const compartiment of ['general', 'prospects']) {
    const cible = `${baseDistante}/${compartiment}-${horodatage}`
    const distant = `umask 007 && cat > ${cible}.tar.part && mv ${cible}.tar.part ${cible}.tar && touch ${cible}.pret`
    const args = ['-i', path.join(maison, '.ssh/presti-usine'), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hote(), distant]
    commandes.push({ compartiment, args })
  }
  if (o.sec) { for (const c of commandes) console.log(`ssh ${c.args.join(' ')}`); return 0 }
  const marque = path.join(o.export, 'envoi.json')
  if (fs.existsSync(marque)) fs.unlinkSync(marque)
  for (const c of commandes) {
    const archive = archiver(path.join(o.export, c.compartiment))
    const r = spawnSync(process.env.PRESTI_SSH_BIN || 'ssh', c.args, { input: archive, maxBuffer: 1024 * 1024, windowsHide: true })
    if (r.error || r.status !== 0) { console.error('usine injoignable'); return 5 }
  }
  fs.writeFileSync(marque, JSON.stringify({ envoye_le: new Date().toISOString() }))
  console.log('envoi terminé')
  return 0
}
try { process.exitCode = envoyer() } catch (e) { console.error(e.message); process.exitCode = 1 }
