#!/usr/bin/env node
// TÉMOIN (026-229) de scripts/savoir/envoyer.mjs, jugé par SVS-7 : dépose l'export (general puis prospects) dans le
// dépôt de l'usine par ssh, sous l'interrupteur `envoi` de docs/savoir/reglages.json. Rien d'interpolé dans la commande
// distante hors du compartiment et de l'horodatage ; l'archive part sur l'entrée standard.
//
//   node scripts/savoir/envoyer.mjs --export=<dossier> [--reglages=<reglages.json>] [--a-sec]
// Codes : 0 envoyé (ou éteint, ou à sec) ; 1 export incomplet ; 2 usage ; 5 ssh en échec ou usine injoignable.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Arret } from './exporter.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')
const REGLAGES_DEFAUT = path.join(DEPOT, 'docs', 'savoir', 'reglages.json')
const DEPOT_DISTANT = '/srv/presti-savoir/depot'
const COMPARTIMENTS = ['general', 'prospects']

export const commandeDistante = (nom) => `umask 007 && cat > ${DEPOT_DISTANT}/${nom}.tar.part && mv ${DEPOT_DISTANT}/${nom}.tar.part ${DEPOT_DISTANT}/${nom}.tar && touch ${DEPOT_DISTANT}/${nom}.pret`
const horodatage = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

function octal(b, off, len, v) { b.write(`${v.toString(8).padStart(len - 1, '0')}\u0000`, off, len, 'latin1') }
function entete(nom, taille, type) {
  const b = Buffer.alloc(512)
  Buffer.from(nom, 'utf8').copy(b, 0, 0, 100)
  octal(b, 100, 8, 0o640); octal(b, 108, 8, 0); octal(b, 116, 8, 0); octal(b, 124, 12, taille); octal(b, 136, 12, Math.floor(Date.now() / 1000))
  b.write(type, 156, 1, 'latin1')
  b.write('ustar\u0000', 257, 6, 'latin1'); b.write('00', 263, 2, 'latin1')
  b.fill(0x20, 148, 156)
  let s = 0
  for (const x of b) s += x
  b.write(`${s.toString(8).padStart(6, '0')}\u0000 `, 148, 8, 'latin1')
  return b
}
const bourrage = (n) => Buffer.alloc((512 - (n % 512)) % 512)
function enregistrementPax(cle, valeur) {
  const corps = ` ${cle}=${valeur}\n`
  const n = Buffer.byteLength(corps)
  let L = n + String(n).length
  if (String(L).length !== String(n).length) L = n + String(L).length
  return Buffer.from(`${L}${corps}`)
}
function fichiersDe(dossier) {
  const out = []
  const rec = (d, r) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const rr = r ? `${r}/${e.name}` : e.name
      if (e.isDirectory()) rec(path.join(d, e.name), rr)
      else if (e.isFile()) out.push(rr)
    }
  }
  rec(dossier, '')
  return out
}
/** Une archive ustar (POSIX) du compartiment : fichiers réguliers seulement, pax `path` pour un nom long ou non ASCII. */
export function archiver(dossier) {
  const blocs = []
  for (const nom of fichiersDe(dossier)) {
    const donnees = fs.readFileSync(path.join(dossier, ...nom.split('/')))
    const long = Buffer.byteLength(nom) > 100 || /[^\x20-\x7e]/.test(nom)
    if (long) { const pax = enregistrementPax('path', nom); blocs.push(entete('PaxHeaders/entree', pax.length, 'x'), pax, bourrage(pax.length)) }
    blocs.push(entete(long ? 'fichiers/pax' : nom, donnees.length, '0'), donnees, bourrage(donnees.length))
  }
  blocs.push(Buffer.alloc(1024))
  return Buffer.concat(blocs)
}

export function envoyer({ exportDir, reglages = REGLAGES_DEFAUT, aSec = false }) {
  if (!exportDir) throw new Arret(2, 'usage : --export=<dossier> attendu')
  const R = JSON.parse(fs.readFileSync(reglages, 'utf8'))
  if (R.interrupteurs?.envoi?.actif !== true) return { code: 0, message: 'envoi éteint (interrupteur envoi de docs/savoir/reglages.json) : rien n’est parti' }
  const hote = process.env.PRESTI_USINE || 'usine@88.96.53.3'
  if (!/^usine@[A-Za-z0-9.-]+$/.test(hote)) throw new Arret(2, `hôte refusé : ${hote} (usine@<hôte> attendu)`)
  for (const c of COMPARTIMENTS) if (!fs.existsSync(path.join(exportDir, c, 'manifeste.json'))) throw new Arret(1, `export incomplet : ${c}/manifeste.json absent`)
  const h = horodatage()
  const archives = COMPARTIMENTS.map((c) => ({ c, nom: `${c}-${h}`, tar: archiver(path.join(exportDir, c)) }))
  if (aSec) return { code: 0, message: `à sec : ${archives.map((a) => `${a.nom}.tar (${a.tar.length} octets)`).join(', ')} → ${hote}:${DEPOT_DISTANT} — rien n’est parti` }
  const cle = path.join(os.homedir(), '.ssh', 'presti-usine')
  const ssh = process.env.PRESTI_SSH_BIN || 'ssh'
  if (!process.env.PRESTI_SSH_BIN && !fs.existsSync(cle)) throw new Arret(5, `usine injoignable : clé ${cle} absente`)
  const marque = path.join(exportDir, 'envoi.json')
  fs.rmSync(marque, { force: true })
  for (const a of archives) {
    const r = spawnSync(ssh, ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hote, commandeDistante(a.nom)], { input: a.tar, timeout: 600000, maxBuffer: 16 * 1024 * 1024, windowsHide: true })
    if (r.status !== 0) throw new Arret(5, `envoi ${a.c} échoué (ssh ${r.status ?? r.error?.code ?? '?'}) : rien n’est marqué envoyé`)
  }
  fs.writeFileSync(marque, `${JSON.stringify({ envoye_le: new Date().toISOString(), archives: archives.map((a) => `${a.nom}.tar`) }, null, 2)}\n`)
  return { code: 0, message: `envoyé : ${archives.map((a) => a.nom).join(', ')} → ${hote}` }
}

function options(argv) {
  const o = {}
  for (const a of argv) {
    if (a === '--a-sec') o.aSec = true
    else if (a.startsWith('--export=') && a.length > 9) o.exportDir = path.resolve(a.slice(9))
    else if (a.startsWith('--reglages=') && a.length > 11) o.reglages = path.resolve(a.slice(11))
    else throw new Arret(2, `argument inconnu : ${a} (usage : --export=<dossier> [--reglages=<fichier>] [--a-sec])`)
  }
  return o
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const r = envoyer(options(process.argv.slice(2))); console.log(r.message); process.exitCode = r.code }
  catch (e) { console.error(`✗ envoi : ${e.message}`); process.exitCode = e instanceof Arret ? e.code : 1 }
}
