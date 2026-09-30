#!/usr/bin/env node
// scripts/usine-coffre.mjs — le coffre des agents de l'usine, manié depuis le poste (fiche 026-050).
//
// Usage (dans son propre terminal : une valeur ne se colle jamais dans une conversation) :
//   node scripts/usine-coffre.mjs poser <NOM> [--depuis-env=<VAR>]
//        la valeur vient de la variable <VAR> du poste avec --depuis-env ; sinon d'une saisie masquée si l'entrée standard
//        est un terminal ; sinon de l'entrée standard (une ligne)
//   node scripts/usine-coffre.mjs retirer <NOM>
//   node scripts/usine-coffre.mjs noms              → les noms du coffre, jamais une valeur
//   node scripts/usine-coffre.mjs etat              → mode=<octal> proprietaire=<compte> noms=<n>
//   node scripts/usine-coffre.mjs poser-jeton-agent <agent> [--nom=<NOM>] [--copie-windows=<VAR>]
//        crée le jeton de l'agent (node scripts/agents-jeton.mjs <agent> --sortie=tube, fiche 026-040), le pose au coffre
//        sous <NOM> (défaut PRESTI_JETON_<AGENT>) sans jamais l'afficher ; avec --copie-windows, le pose aussi en variable
//        d'environnement utilisateur Windows <VAR> (powershell, la valeur sur son entrée standard)
// Codes : 0 fait ; 1 échec de l'usine ou de la copie Windows ; 2 usage, nom ou valeur refusés (rien n'est envoyé) ;
//   5 usine injoignable ; poser-jeton-agent rend tel quel le code d'agents-jeton.mjs en échec.
//
// Les règles (liste fermée des noms, formes de valeur) sont celles de scripts/usine/coffre-regles.mjs, appliquées AVANT
// tout ssh ; l'assistant presti-coffre les rejoue sur l'usine. Une valeur ne passe jamais en argument (l'argv d'un
// processus se lit, ici par le Gestionnaire des tâches, là-bas par ps) : elle voyage une fois sur l'entrée standard de ssh,
// suivie d'un retour à la ligne, jusqu'à `sudo -n -u agents /usr/local/bin/presti-coffre poser <NOM>`. Elle n'est jamais
// imprimée, jamais écrite dans un fichier, et un argument inattendu n'est jamais répété (ce pourrait être une valeur).
// ssh : PRESTI_SSH_BIN pour les essais, sinon ssh ; hôte PRESTI_USINE, sinon usine@88.96.53.3 ; clé ~/.ssh/presti-usine.
// Les enfants partent par spawn sans shell (mémoire spawn-windows-shell-ffmpeg).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validerNom, validerValeur } from './usine/coffre-regles.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE = path.join(os.homedir(), '.ssh', 'presti-usine')
const SSH_BIN = process.env.PRESTI_SSH_BIN || 'ssh'
const SSH = ['-i', CLE, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20']
const ASSISTANT = 'sudo -n -u agents /usr/local/bin/presti-coffre'
const NOM_VAR = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const NOM_AGENT = /^[a-z][a-z0-9_]{1,40}$/
const USAGE = 'usage : node scripts/usine-coffre.mjs poser <NOM> [--depuis-env=<VAR>] | retirer <NOM> | noms | etat | poser-jeton-agent <agent> [--nom=<NOM>] [--copie-windows=<VAR>]'

class Arret extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const usage = (pourquoi) => new Arret(2, `${pourquoi}\n  ${USAGE}`)

// ── ssh ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Lance l'assistant sur l'usine ; `entree` (une valeur) part sur l'entrée standard de ssh, jamais dans l'argv. */
function assistant(sousCommande, entree = null) {
  if (!process.env.PRESTI_SSH_BIN && !fs.existsSync(CLE)) throw new Arret(5, `usine injoignable : clé ${CLE} absente`)
  return new Promise((resoudre) => {
    const enfant = spawn(SSH_BIN, [...SSH, HOTE, `${ASSISTANT} ${sousCommande}`], { stdio: [entree === null ? 'ignore' : 'pipe', 'inherit', 'inherit'], windowsHide: true })
    enfant.on('error', () => resoudre(255))
    enfant.on('close', (code) => resoudre(code ?? 255))
    if (entree !== null) {
      enfant.stdin.on('error', () => { /* ssh sorti avant d'avoir tout lu : son code le dira */ })
      enfant.stdin.end(`${entree}\n`)
    }
  })
}
function codeUsine(code) {
  if (code === 255) throw new Arret(5, `usine injoignable (${HOTE}) : l'IP est éphémère, PRESTI_USINE=usine@<ip> si l'instance a été recréée`)
  if (code !== 0) throw new Arret(code === 2 ? 2 : 1, `l'assistant du coffre a répondu ${code} (voir son message ci-dessus)`)
}

// ── la valeur ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Saisie masquée au terminal : rien n'est renvoyé à l'écran. */
function saisieMasquee(invite) {
  return new Promise((resoudre, rejeter) => {
    const e = process.stdin
    process.stderr.write(invite)
    e.setRawMode(true)
    e.setEncoding('utf8')
    e.resume()
    let v = ''
    const finir = (suite) => { e.setRawMode(false); e.pause(); e.removeListener('data', lire); process.stderr.write('\n'); suite() }
    const lire = (morceau) => {
      for (const c of morceau) {
        if (c === '\r' || c === '\n' || c === '\u0004') return finir(() => resoudre(v))
        if (c === '\u0003') return finir(() => rejeter(new Arret(130, 'saisie interrompue : rien n\'est envoyé')))
        if (c === '\u007f' || c === '\b') { v = v.slice(0, -1); continue }
        v += c
      }
    }
    e.on('data', lire)
  })
}
/** Une ligne de l'entrée standard (non interactive) : la fin de ligne ôtée ; un reste non blanc est un refus. */
async function ligneEntree() {
  const morceaux = []
  for await (const m of process.stdin) morceaux.push(Buffer.isBuffer(m) ? m : Buffer.from(m))
  const texte = Buffer.concat(morceaux).toString('utf8')
  const i = texte.indexOf('\n')
  const ligne = (i < 0 ? texte : texte.slice(0, i)).replace(/\r$/, '')
  if (i >= 0 && texte.slice(i + 1).trim() !== '') throw new Arret(2, 'plus d\'une ligne sur l\'entrée standard : rien n\'est envoyé')
  return ligne
}
function exigerValeur(nom, valeur) {
  const v = validerValeur(nom, valeur)
  if (!v.ok) throw new Arret(2, `${nom} refusé : ${v.raison} ; rien n'est envoyé`)
}

// ── les sous-commandes ──────────────────────────────────────────────────────────────────────────────────────────────
async function poser(nom, depuisEnv) {
  let valeur
  if (depuisEnv !== undefined) {
    valeur = process.env[depuisEnv]
    if (valeur === undefined) throw new Arret(2, `la variable ${depuisEnv} n'est pas posée sur le poste : rien n'est envoyé`)
  } else if (process.stdin.isTTY) {
    valeur = await saisieMasquee(`valeur de ${nom} (masquée, Entrée pour finir) : `)
  } else {
    valeur = await ligneEntree()
  }
  exigerValeur(nom, valeur)
  codeUsine(await assistant(`poser ${nom}`, valeur))
}

/** Le jeton d'un agent, lu sur la sortie d'agents-jeton.mjs : jamais affiché, jamais écrit, jamais en argument. */
function jetonAgent(agent) {
  return new Promise((resoudre, rejeter) => {
    const enfant = spawn(process.execPath, [path.join(RACINE, 'scripts', 'agents-jeton.mjs'), agent, '--sortie=tube'], { cwd: RACINE, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true })
    const morceaux = []
    enfant.stdout.on('data', (d) => morceaux.push(d))
    enfant.on('error', () => rejeter(new Arret(1, 'agents-jeton.mjs ne se lance pas : rien n\'est envoyé')))
    enfant.on('close', (code) => {
      if (code !== 0) return rejeter(new Arret(code ?? 1, `agents-jeton.mjs a rendu ${code ?? 'un signal'} : rien n'est envoyé`))
      const texte = Buffer.concat(morceaux).toString('utf8').replace(/\r?\n$/, '')
      morceaux.length = 0
      if (/[\r\n]/.test(texte)) return rejeter(new Arret(2, 'agents-jeton.mjs a rendu plus d\'une ligne : rien n\'est envoyé'))
      resoudre(texte)
    })
  })
}
function copieWindows(variable, jeton) {
  return new Promise((resoudre) => {
    const commande = `[Environment]::SetEnvironmentVariable('${variable}', [Console]::In.ReadLine(), 'User')`
    const enfant = spawn('powershell', ['-NoProfile', '-Command', commande], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true })
    enfant.on('error', () => resoudre(1))
    enfant.on('close', (code) => resoudre(code ?? 1))
    enfant.stdin.on('error', () => { /* powershell sorti avant d'avoir lu : son code le dira */ })
    enfant.stdin.end(`${jeton}\n`)
  })
}
async function poserJetonAgent(agent, nom, copie) {
  const jeton = await jetonAgent(agent)
  exigerValeur(nom, jeton)
  codeUsine(await assistant(`poser ${nom}`, jeton))
  if (copie !== undefined && (await copieWindows(copie, jeton)) !== 0) throw new Arret(1, `${nom} : jeton posé au coffre, mais la copie Windows ${copie} a échoué`)
  console.log(`${nom} : jeton posé, jamais affiché${copie !== undefined ? ` (coffre de l'usine et variable utilisateur Windows ${copie})` : ''}`)
}

// ── la grammaire : tout ce qui n'y est pas est un refus, avant tout ssh ─────────────────────────────────────────────
function options(liste, permises) {
  const o = {}
  for (const a of liste) {
    const m = /^--([a-z-]+)=(.*)$/.exec(a)
    if (!m || !permises.includes(m[1]) || m[1] in o) throw usage('argument inattendu (non répété : ce pourrait être une valeur)')
    o[m[1]] = m[2]
  }
  return o
}
function exigerNom(nom) {
  const v = validerNom(nom)
  if (!v.ok) throw usage(`nom refusé : ${v.raison}`)
}

async function principal() {
  const [commande, premier, ...reste] = process.argv.slice(2)
  const positionnel = (x) => x !== undefined && !x.startsWith('--')
  switch (commande) {
    case 'poser': {
      if (!positionnel(premier)) throw usage('poser : le nom manque')
      exigerNom(premier)
      const o = options(reste, ['depuis-env'])
      if (o['depuis-env'] !== undefined && !NOM_VAR.test(o['depuis-env'])) throw usage('--depuis-env : nom de variable illisible')
      return poser(premier, o['depuis-env'])
    }
    case 'retirer': {
      if (!positionnel(premier) || reste.length) throw usage('retirer : un nom, rien d\'autre')
      exigerNom(premier)
      return codeUsine(await assistant(`retirer ${premier}`))
    }
    case 'noms':
    case 'etat': {
      if (premier !== undefined) throw usage(`${commande} : aucun argument`)
      return codeUsine(await assistant(commande))
    }
    case 'poser-jeton-agent': {
      if (!positionnel(premier) || !NOM_AGENT.test(premier)) throw usage('poser-jeton-agent : le nom de l\'agent manque ou est illisible ([a-z][a-z0-9_]*)')
      const o = options(reste, ['nom', 'copie-windows'])
      const nom = o.nom ?? `PRESTI_JETON_${premier.toUpperCase()}`
      exigerNom(nom)
      if (o['copie-windows'] !== undefined && !NOM_VAR.test(o['copie-windows'])) throw usage('--copie-windows : nom de variable illisible')
      return poserJetonAgent(premier, nom, o['copie-windows'])
    }
    default:
      throw usage(commande === undefined ? 'sous-commande manquante' : 'sous-commande inconnue')
  }
}

principal().then(() => process.exit(0), (e) => {
  if (e instanceof Arret) {
    console.error(`✗ usine-coffre : ${e.message}`)
    process.exit(e.code)
  }
  console.error(`✗ usine-coffre : erreur inattendue (${e && e.code ? e.code : 'sans code'})`)
  process.exit(1)
})
