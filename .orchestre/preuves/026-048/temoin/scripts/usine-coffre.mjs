#!/usr/bin/env node
// TÉMOIN du juge usine-socle-qa (026-048) : usine-coffre minimal, écrit par Claude Code pour prouver que le juge sait passer
// au vert. Ce n'est PAS le livrable de 026-050.
//   poser <NOM> [--depuis-env=<VAR>] | retirer <NOM> | noms | etat | poser-jeton-agent <agent> [--nom=<NOM>] [--copie-windows=<VAR>]
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validerNom, validerValeur } from './usine/coffre-regles.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE = path.join(os.homedir(), '.ssh', 'presti-usine')
const refuser = (m) => { process.stderr.write(`usine-coffre : ${m}\n`); process.exit(2) }
const args = process.argv.slice(2)

function distant(sousCommande, entree) {
  return new Promise((resoudre) => {
    const e = spawn(process.env.PRESTI_SSH_BIN || 'ssh', ['-i', CLE, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOTE, `sudo -n -u agents /usr/local/bin/presti-coffre ${sousCommande}`], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true })
    e.on('error', () => resoudre(255))
    e.on('exit', (code) => resoudre(code ?? 1))
    e.stdin.on('error', () => {})
    e.stdin.end(entree ?? '')
  })
}
const finir = (code) => {
  if (code === 255) { process.stderr.write(`usine-coffre : usine injoignable (${HOTE})\n`); process.exit(5) }
  process.exit(code)
}
function lireEntree() {
  return new Promise((resoudre) => {
    const m = []
    process.stdin.on('data', (d) => m.push(d))
    process.stdin.on('end', () => resoudre(Buffer.concat(m).toString('utf8').split('\n')[0].replace(/\r$/, '')))
  })
}
function lancerCapte(fichier, argv, entree) {
  return new Promise((resoudre) => {
    const e = spawn(fichier, argv, { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true })
    const m = []
    e.stdout.on('data', (d) => m.push(d))
    e.on('error', () => resoudre({ code: 127, sortie: '' }))
    e.on('exit', (code) => resoudre({ code: code ?? 1, sortie: Buffer.concat(m).toString('utf8') }))
    e.stdin.on('error', () => {})
    e.stdin.end(entree ?? '')
  })
}

const [cmd, ...reste] = args
if (cmd === 'poser') {
  const [nom, ...opts] = reste
  if (!nom || opts.length > 1 || (opts.length && !/^--depuis-env=[A-Za-z_]\w*$/.test(opts[0]))) refuser('poser <NOM> [--depuis-env=<VAR>]')
  if (!validerNom(nom).ok) refuser('nom hors de la liste fermée')
  let valeur
  if (opts.length) valeur = process.env[opts[0].slice('--depuis-env='.length)]
  else if (process.stdin.isTTY) refuser('saisie masquée : non prise en charge par ce témoin')
  else valeur = await lireEntree()
  const v = validerValeur(nom, valeur ?? '')
  if (!v.ok) refuser(`valeur refusée : ${v.raison}`)
  finir(await distant(`poser ${nom}`, `${valeur}\n`))
} else if (cmd === 'retirer') {
  if (reste.length !== 1 || !validerNom(reste[0]).ok) refuser('retirer <NOM>')
  finir(await distant(`retirer ${reste[0]}`))
} else if (cmd === 'noms' || cmd === 'etat') {
  if (reste.length) refuser(`${cmd} ne prend aucun argument`)
  finir(await distant(cmd))
} else if (cmd === 'poser-jeton-agent') {
  const [agent, ...opts] = reste
  if (!agent || !/^[a-z_]{2,40}$/.test(agent)) refuser('poser-jeton-agent <agent>')
  let nom = `PRESTI_JETON_${agent.toUpperCase()}`
  let copie = null
  for (const o of opts) {
    if (/^--nom=[A-Z_]+$/.test(o)) nom = o.slice(6)
    else if (/^--copie-windows=[A-Z_][A-Z0-9_]*$/.test(o)) copie = o.slice(16)
    else refuser(`option inconnue : ${o}`)
  }
  if (!validerNom(nom).ok) refuser(`${nom} hors de la liste fermée`)
  const j = await lancerCapte(process.execPath, [path.join(ICI, 'agents-jeton.mjs'), agent, '--sortie=tube'])
  if (j.code !== 0) process.exit(j.code)
  const jeton = j.sortie.trim()
  if (!validerValeur(nom, jeton).ok) refuser('le jeton créé n\'a pas la forme permise')
  const code = await distant(`poser ${nom}`, `${jeton}\n`)
  if (code !== 0) finir(code)
  if (copie) {
    const p = await lancerCapte('powershell', ['-NoProfile', '-Command', `[Environment]::SetEnvironmentVariable('${copie}', [Console]::In.ReadLine(), 'User')`], `${jeton}\n`)
    if (p.code !== 0) { process.stderr.write('usine-coffre : copie Windows en échec\n'); process.exit(1) }
  }
  console.log(`${nom} : jeton posé, jamais affiché`)
} else refuser('sous-commande inconnue')
