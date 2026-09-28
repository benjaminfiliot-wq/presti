#!/usr/bin/env node
// scripts/agents-jeton.mjs — crée le jeton d'un agent du bus et n'en garde que l'empreinte (fiche 026-040).
//
// Usage : node scripts/agents-jeton.mjs <nom> [--rotation] [--sortie=tube]
//   <nom>           un agent DÉJÀ enregistré par sa migration (systeme et a0 de 0096, les agents de 0105, un essai_e2e_…) :
//                   le script n'enregistre jamais un agent, c'est la migration qui fixe ses types, ses tables et son débit.
//   --rotation      remplace le jeton en place ; l'ancien ne vaut plus rien dès la pose du nouveau. (Toute pose remplace :
//                   la base ne dit pas si l'agent avait déjà un jeton. L'option le dit à qui lit.)
//   --sortie=tube   la forme que lance `usine-coffre.mjs poser-jeton-agent` (026-050) : la sortie standard porte le jeton
//                   seul, suivi d'un retour à la ligne, sans rien autour ; refus en code 2, avant toute écriture en base,
//                   si la sortie standard est un terminal (un jeton ne s'écrit pas sur un écran par ce chemin).
//
// Le jeton : `pa_<nom>_<32 octets de crypto.randomBytes en base64url>`, les règles de lib/agents/jetons.ts (ce script n'importe
// pas le .ts : il doit tourner sous `node` nu). En base, seulement son sha256 hexadécimal, par `ops_agent_poser_jeton` (0097).
// Le jeton ne passe jamais par un argument ni par un fichier : il est tiré ici et n'existe que sur la sortie standard.
//
// Env : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY, lus dans l'environnement ou dans le .env.local du dépôt,
// dont rien n'est jamais affiché. Aucun fichier écrit.
// Codes : 0 jeton posé ; 1 agent inconnu ou pose refusée ; 2 usage, configuration absente, ou --sortie=tube vers un terminal.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// La configuration d'abord, lue une fois et jamais affichée ; l'environnement l'emporte sur .env.local.
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_LOCAL = path.join(RACINE, '.env.local')
for (const l of fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/) : []) {
  const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const USAGE = 'Usage : node scripts/agents-jeton.mjs <nom> [--rotation] [--sortie=tube]'
const args = process.argv.slice(2)
const noms = args.filter((a) => !a.startsWith('--'))
const inconnues = args.filter((a) => a.startsWith('--') && a !== '--rotation' && a !== '--sortie=tube')
const tube = args.includes('--sortie=tube')
const rotation = args.includes('--rotation')
if (noms.length !== 1 || !/^[a-z0-9_]{2,40}$/.test(noms[0]) || inconnues.length) {
  console.error(USAGE);
  process.exit(2)
}
if (tube && process.stdout.isTTY) {
  console.error('✗ --sortie=tube : la sortie standard est un terminal ; rien n’est créé (branchez-la sur un autre programme).');
  process.exit(2)
}
if (!URL_BASE || !CLE_SERVICE) {
  console.error('✗ configuration absente : l’adresse de la base ou la clé de service manque (environnement ou .env.local).');
  process.exit(2)
}

const nom = noms[0]
const jeton = `pa_${nom}_${crypto.randomBytes(32).toString('base64url')}`
const empreinte = crypto.createHash('sha256').update(jeton, 'utf8').digest('hex')

const base = createClient(URL_BASE, CLE_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const { error } = await base.rpc('ops_agent_poser_jeton', { p_nom: nom, p_hash: empreinte }).abortSignal(AbortSignal.timeout(20_000))
if (error) {
  const code = /^ops:([a-z0-9_]+)/.exec(String(error.message ?? '').trim())?.[1]
  if (code === 'agent_inconnu') console.error(`✗ agent inconnu : ${nom} (le script n’enregistre jamais un agent : c’est sa migration qui le fait)`);
  else console.error(`✗ jeton non posé (${code ? `ops:${code}` : String(error.code || 'base injoignable')}) : rien n’a changé pour ${nom}`);
  process.exit(1)
}

// Une seule écriture, et la sortie seulement quand elle est partie (un tube se vide après coup). Un lecteur parti avant
// (tube fermé) rend 1 : l'empreinte est posée mais personne n'a le jeton ; usine-coffre n'envoie alors rien, et on relance.
const texte = tube
  ? `${jeton}\n`
  : `Jeton de l’agent ${nom}${rotation ? ' (rotation : l’ancien ne vaut plus rien)' : ''} :\n${jeton}\nÀ poser dans le coffre de l’agent ; il ne sera plus jamais affiché.\n`
// 28/09 : plus de process.exit() ici. Sous Windows (Node 24), sortir pendant que le client de la base referme sa connexion
// faisait échouer une assertion de libuv (async.c:94, code 3221226505) APRÈS la pose de l'empreinte : le jeton était perdu.
// Le code de sortie est posé, et le processus se termine de lui-même quand tout est refermé.
process.stdout.on('error', () => { process.exitCode = 1 })
process.stdout.write(texte, (err) => { process.exitCode = err ? 1 : 0 })
