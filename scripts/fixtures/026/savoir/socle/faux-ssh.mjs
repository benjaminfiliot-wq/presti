#!/usr/bin/env node
// Faux ssh du juge savoir-socle-qa (026-229), désigné par PRESTI_SSH_BIN (sous Windows par un lanceur .exe que le juge
// fabrique : un spawn sans shell ne lance ni un .mjs ni un .cmd). Il n'exécute JAMAIS rien et ne contacte personne.
// Pour chaque appel, dans le dossier FAUX_SSH_JOURNAL :
//   appel-<horodatage>-<pid>.argv.json   { argv, le, mode, via }
//   appel-<horodatage>-<pid>.stdin       son entrée standard, octet pour octet
// puis, selon FAUX_SSH_MODE : enregistrer (code 0, défaut) ou echec (« Connection timed out », code 255).
import fs from 'node:fs'
import path from 'node:path'

const journal = process.env.FAUX_SSH_JOURNAL
const mode = process.env.FAUX_SSH_MODE || 'enregistrer'
if (!journal) { process.stderr.write('faux ssh : FAUX_SSH_JOURNAL absent (le juge le pose)\n'); process.exit(97) }

function lireEntree(delaiMs) {
  return new Promise((resoudre) => {
    const morceaux = []
    let fini = false
    const finir = () => { if (fini) return; fini = true; clearTimeout(minuterie); resoudre(Buffer.concat(morceaux)) }
    const minuterie = setTimeout(finir, delaiMs)
    try {
      process.stdin.on('data', (d) => morceaux.push(Buffer.isBuffer(d) ? d : Buffer.from(d)))
      process.stdin.on('end', finir)
      process.stdin.on('error', finir)
      process.stdin.resume()
    } catch { finir() }
  })
}

const entree = await lireEntree(15000)
fs.mkdirSync(journal, { recursive: true })
const base = path.join(journal, `appel-${String(Date.now()).padStart(15, '0')}-${process.pid}`)
fs.writeFileSync(`${base}.argv.json`, JSON.stringify({ argv: process.argv.slice(2), le: new Date().toISOString(), mode, via: process.env.FAUX_SSH_VIA || null }, null, 1))
fs.writeFileSync(`${base}.stdin`, entree)
if (mode === 'echec') { process.stderr.write('ssh: connect to host usine-essai.invalid port 22: Connection timed out\n'); process.exit(255) }
// reponses : FAUX_SSH_REPONSES désigne un JSON [{ contient, sortie, code }] ; la première entrée dont `contient` figure
// dans l'argv joint répond (pour éprouver la lecture de --reel sans usine). Aucune : sortie vide, code 0.
if (mode === 'reponses') {
  const argv = process.argv.slice(2).join(' ')
  const r = JSON.parse(fs.readFileSync(process.env.FAUX_SSH_REPONSES, 'utf8')).find((x) => argv.includes(x.contient))
  if (r?.sortie) process.stdout.write(r.sortie)
  process.exit(r?.code ?? 0)
}
process.exit(0)
