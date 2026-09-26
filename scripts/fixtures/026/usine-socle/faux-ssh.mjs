#!/usr/bin/env node
// Faux ssh du juge du socle de l'usine (026-048), désigné par PRESTI_SSH_BIN (sous Windows, par un lanceur .exe que le
// juge fabrique : un `spawn` sans shell ne lance ni un .mjs ni un .cmd).
//
// Il n'exécute JAMAIS rien. Il consigne, pour chaque appel, dans le dossier FAUX_SSH_JOURNAL :
//   appel-<horodatage>-<pid>.argv.json   { argv, le, mode }   (son argv, rien d'autre : ni l'environnement ni l'entrée)
//   appel-<horodatage>-<pid>.stdin       son entrée standard, octet pour octet (fichier séparé)
// puis, selon FAUX_SSH_MODE :
//   enregistrer          code 0, sortie vide (défaut)
//   sortie=<fichier>     imprime le fichier sur la sortie standard, code 0
//   injoignable          « ssh: connect to host … port 22: Connection timed out » sur l'erreur, code 255
// L'entrée standard est lue jusqu'à sa fin, 5 s au plus : un appelant qui ne la ferme pas n'est pas bloqué.
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

const entree = await lireEntree(5000)
fs.mkdirSync(journal, { recursive: true })
const base = path.join(journal, `appel-${String(Date.now()).padStart(15, '0')}-${process.pid}`)
// `via` : le nom sous lequel le juge a posé cette doublure (PRESTI_SSH_BIN, ssh du PATH, scp, powershell…).
fs.writeFileSync(`${base}.argv.json`, JSON.stringify({ argv: process.argv.slice(2), le: new Date().toISOString(), mode, via: process.env.FAUX_SSH_VIA || null }, null, 1))
fs.writeFileSync(`${base}.stdin`, entree)

// Sortir seulement quand l'écriture est vidée (un tube est asynchrone sous Linux), sans attendre une entrée jamais fermée.
const sortir = (code) => { try { process.stdin.destroy() } catch { /* déjà fermée */ } process.exit(code) }
if (mode === 'injoignable') {
  const hote = process.argv.slice(2).find((a) => /@/.test(a)) || 'usine'
  process.stderr.write(`ssh: connect to host ${hote.split('@').pop()} port 22: Connection timed out\n`, () => sortir(255))
} else if (mode.startsWith('sortie=')) {
  process.stdout.write(fs.readFileSync(mode.slice('sortie='.length)), () => sortir(0))
} else if (mode === 'enregistrer') {
  sortir(0)
} else {
  process.stderr.write(`faux ssh : mode inconnu « ${mode} »\n`, () => sortir(98))
}
