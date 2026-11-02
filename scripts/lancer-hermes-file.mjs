#!/usr/bin/env node
// Répartiteur de la file n8n de Hermes (01/11/2026 ; rendu robuste le 02/11/2026 après l'audit B, constats 1, 2, 7 et 11).
// L'automatisation Orca horaire (precheck : node scripts/hermes-tache-n8n.mjs --precheck) lance ce script dans une courte session
// Claude Code ; il démarre Hermes par `orca agent launch`, qui ouvre un vrai onglet. Pourquoi pas directement : un passage
// d'automatisation Orca « fournisseur hermes » que l'interface n'a pas rattaché à un onglet est refermé dès qu'Orca le croit
// terminé, c'est-à-dire dès que Hermes est prêt, avant qu'il ait lu sa consigne (relevé du 01/11 : passages 2 à 5,
// terminalPaneKey vide, fermés à l'heure exacte du relevé de fin). `orca agent launch` a marché les deux fois ce soir-là.
// Hermes reste l'exécutant par défaut (règle de Benj), Orca le harnais ; depuis le 02/11 (031-013), les tâches réservées à Claude
// Code (liste blanche de hermes-tache-n8n.mjs : revoir-notes) lancent Claude Code par le même `orca agent launch`, même passage,
// même consigne de prise et de fin, même registre d'onglets. Ce script ne fait que lancer :
//  - un seul répartiteur à la fois (~/.presti/repartiteur.verrou), et il refait le precheck (« Run now » d'Orca le saute) ;
//  - un identifiant de passage (crypto.randomUUID) va dans la consigne de Hermes (--prendre --passage=…) : la tâche en cours ne
//    revient qu'à ce passage, tout autre Hermes reçoit FILE OCCUPEE (constat 1) ;
//  - l'onglet lancé est noté dans ~/.presti/onglets-hermes.json : d'abord sans handle, par le precheck lui-même (--reserver),
//    sous le verrou de la file et AVANT le lancement : un second répartiteur ou un passage manuel ne relance pas, et une réponse
//    d'orca perdue bloque toute relance pendant 15 min. Le precheck ferme ces onglets-là, et eux seuls (constat 7) ;
//  - une réponse d'orca perdue est rejouée avec --retry-launch <operationId>, jamais par un lancement neuf (aide d'orca) ;
//  - il n'imprime que des messages fixes : ni titre d'onglet, ni sortie d'orca, ni sortie du precheck, car la session qui le
//    lance est un agent en bypassPermissions (constat 11).
//   node scripts/lancer-hermes-file.mjs           lance Hermes si le precheck le dit (sinon ne fait rien)
//   node scripts/lancer-hermes-file.mjs --essai   dit ce qu'il lancerait, sans rien lancer ni rien écrire (precheck à blanc)
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'
import { RACINE, FICHIERS, avecVerrou, ecrireJson, lireJson, lireOnglets, orca, noterAlerte, noterEtat } from './hermes-tache-n8n.mjs'

const CLIENT = path.join(RACINE, 'scripts', 'hermes-tache-n8n.mjs')
// 031-013 (02/11) : deux exécutants, tous deux lancés par Orca (jamais sans Orca : architecture-outils.md). L'exécutant vient du
// NOM de la tâche en tête de file (liste blanche locale, lue par le precheck et noté avec la réservation du passage), jamais de
// n8n. Claude Code porte les relectures qui demandent un jugement (revoir-notes) : sa consigne ajoute --executant=claude à la
// prise ; le client tire l'exécutant de la réservation du passage et refuse un --executant qui la contredit (031-016, défaut A :
// serrure de bonne foi sur un même compte). Modèle : opus, « verdicts → opus » (CLAUDE.md, Modèles et effort ; 031-016, défaut H).
const MODELE_CLAUDE = 'claude-opus-5-5'
const EFFORT_CLAUDE = 'high'
const AGENTS = {
  hermes: { nom: 'HERMES', lancement: ['--agent', 'hermes'] },
  claude: { nom: 'CLAUDE CODE', lancement: ['--agent', 'claude', '--model', MODELE_CLAUDE, '--effort', EFFORT_CLAUDE] },
}
// Les commandes se lancent avec « < /dev/null » : sans cela, le terminal de Hermes affiche « stdin is not a tty » et la sortie se
// perd (01/11). Un second --prendre avec le MÊME passage rend la même tâche si la première sortie s'est perdue.
export function consigne(passage, executant = 'hermes') {
  if (executant === 'claude') return consigneClaude(passage)
  return "Une tâche t'attend dans la file n8n de Presti. Lance node scripts/hermes-tache-n8n.mjs --prendre " +
    `--passage=${passage} < /dev/null : il affiche TACHE <id>, la tâche et le chemin de son brief. S'il affiche FILE VIDE ou ` +
    "FILE OCCUPEE, arrête-toi là : il n'y a rien à faire. Si la sortie est vide ou commence par PANNE, relance exactement la " +
    'même commande (trois fois au plus, puis arrête-toi) : elle rend la même tâche. Lis ce brief en entier (chemin relatif à ' +
    'C:/Users/benja/Documents/presti) et exécute-le exactement, avec les outils MCP cerveau. Rends ensuite la tâche avec ' +
    'node scripts/hermes-tache-n8n.mjs --fini <id> --resume « une ligne » < /dev/null (ou --bloque) ; si elle affiche PANNE, ' +
    'relance la même commande (trois fois au plus). Aucune donnée de prospect ni de client : si le brief en demande, rends la ' +
    'tâche --bloque.'
}
function consigneClaude(passage) {
  return "Une tâche t'attend dans la file n8n de Presti ; elle est réservée à Claude Code. Commence par regles_pour du MCP cerveau " +
    '(« exécuter une tâche de la file n8n ») et applique ce qu’il rend. Lance ensuite node scripts/hermes-tache-n8n.mjs --prendre ' +
    `--passage=${passage} --executant=claude < /dev/null : il affiche TACHE <id>, la tâche et le chemin de son brief. S'il affiche ` +
    'FILE VIDE, FILE OCCUPEE ou AUTRE EXECUTANT, arrête-toi là : il n’y a rien à faire. Si la sortie est vide ou commence par PANNE, ' +
    'relance exactement la même commande (trois fois au plus, puis arrête-toi) : elle rend la même tâche. Lis ce brief en entier ' +
    '(chemin relatif à C:/Users/benja/Documents/presti) et exécute-le exactement, avec les outils MCP cerveau, en respectant ses ' +
    'interdits : ni commit, ni push, ni build, ni migration, aucun secret affiché ni lu (le fichier du jeton de la file ne s’ouvre pas). ' +
    'Rends ensuite la tâche avec node scripts/hermes-tache-n8n.mjs --fini <id> --resume « une ligne » < /dev/null (ou --bloque) ; ' +
    'si elle affiche PANNE, relance la même commande (trois fois au plus). Aucune donnée de prospect ni de client : si le brief en ' +
    'demande, rends la tâche --bloque.'
}
const MESSAGES = {
  vide: 'FILE VIDE : rien à lancer',
  en_cours: 'TACHE EN COURS : rien à lancer (un Hermes la porte déjà, ou vient d’être lancé)',
  panne: 'PANNE : la file n8n ne répond pas ; rien n’est lancé (détail dans ~/.presti/file-n8n-etat.json)',
}
// Le precheck tourne sans shell ; sa sortie n'est jamais recopiée. L'état vient de son fichier (ou, à blanc, de sa ligne
// « ETAT … »), ramené à un mot connu. Avec un passage, un « 0 » réserve le lancement sous le verrou de la file (--reserver).
function precheck(aBlanc, passage) {
  let code = 0
  let sortie = ''
  const options = aBlanc ? ['--a-blanc'] : [`--reserver=${passage}`]
  try {
    sortie = execFileSync(process.execPath, [CLIENT, '--precheck', ...options], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000, windowsHide: true })
  } catch (e) { code = typeof e.status === 'number' ? e.status : -1; sortie = String(e.stdout || '') }
  const brut = aBlanc ? sortie.match(/^ETAT (vide|tache|en_cours|panne)\s*$/m)?.[1] : lireJson(FICHIERS.etat).valeur?.etat
  // l'exécutant : à blanc, sa ligne « EXECUTANT … » ; sinon la réservation de CE passage, notée par le precheck sous le verrou
  const reservation = aBlanc ? null : lireOnglets().find((e) => e.passage === passage)
  const exec = aBlanc ? sortie.match(/^EXECUTANT (hermes|claude|aucun)\s*$/m)?.[1] : reservation?.executant
  const tache = typeof reservation?.tache === 'string' && /^\d{1,15}$/.test(reservation.tache) ? reservation.tache : null
  return { code, etat: ['vide', 'tache', 'en_cours', 'panne'].includes(brut) ? brut : null, executant: Object.hasOwn(AGENTS, exec) ? exec : null, tache }
}
// 031-016 (audit 031-012, défaut I) : chaque échec de lancement laisse une trace durable (alertes-file.log, file-n8n-etat.json
// « panne »), jamais un simple message. Le lancement manqué compte déjà pour sa tâche (réservé par le precheck) : au deuxième sans
// prise, le precheck suivant met la tâche en panne PAR n8n (webhook panne, ligne Slack #presti-auto). Aucun envoi d'ici.
function echec(message, tache) {
  noterAlerte(`ÉCHEC DU LANCEMENT${tache ? ` (tâche ${tache})` : ''} : ${message}`)
  noterEtat('panne', `échec du lancement${tache ? ` de la tâche ${tache}` : ''} : ${message}`)
  console.log(`ÉCHEC : ${message}`)
  return 1
}
const codeDe = (e) => (typeof e?.status === 'number' ? `code ${e.status}` : e?.code === 'ETIMEDOUT' ? 'délai dépassé' : e?.code === 'ENOENT' ? 'orca introuvable' : 'erreur')
async function noterOnglet(entree) {
  const r = await avecVerrou(FICHIERS.verrou, { attenteMs: 20_000 }, () => {
    const liste = lireOnglets().filter((e) => e.passage !== entree.passage)
    liste.push(entree)
    ecrireJson(FICHIERS.onglets, liste.slice(-50))
  })
  return !r.occupe
}
async function lancer() {
  const passage = crypto.randomUUID()
  const { code, etat, executant, tache } = precheck(false, passage) // un « 0 » a déjà noté ce passage, sans handle, sous le verrou de la file
  if (code === 1) { console.log(etat === 'en_cours' ? MESSAGES.en_cours : MESSAGES.vide); return 0 }
  if (code === 2) { console.log(MESSAGES.panne); return 2 }
  if (code !== 0) return echec(`le precheck a rendu le code ${code} ; rien n’est lancé`, null)
  const agent = executant ? AGENTS[executant] : null
  if (!agent) return echec('exécutant de la tâche inconnu ; rien n’est lancé, aucune relance avant 15 min', tache)
  const lance_le = Date.now()
  const base = ['agent', 'launch', ...agent.lancement, '--surface', 'terminal', '--prompt', consigne(passage, executant)]
  let sortie = null
  let motif = ''
  try { sortie = orca([...base, '--json'], { cwd: RACINE, timeoutMs: 180_000 }) } catch (e) {
    motif = codeDe(e)
    const operation = `${e?.stdout || ''}\n${e?.stderr || ''}`.match(/"?operationId"?\s*[:=]\s*"?([A-Za-z0-9_.:-]{6,100})/)?.[1]
    if (operation) {
      try { sortie = orca([...base, '--retry-launch', operation, '--json'], { cwd: RACINE, timeoutMs: 180_000 }) } catch (e2) { motif = `${motif}, rejeu : ${codeDe(e2)}` }
    }
  }
  if (sortie === null) return echec(`orca agent launch (${motif}) ; aucune relance avant 15 min`, tache)
  const handle = sortie.match(/"handle"\s*:\s*"(term_[A-Za-z0-9_-]{1,80})"/)?.[1]
  if (!handle || !/"paneKey"\s*:\s*"[^"\\]{1,200}"/.test(sortie)) return echec(`${agent.nom === 'HERMES' ? 'Hermes' : 'Claude Code'} lancé sans onglet rattaché ; aucune relance avant 15 min`, tache)
  const note = await noterOnglet({ handle, passage, lance_le, executant, tache }) // tache : l'onglet est fermé avant toute relance de sa tâche (031-016)
  console.log(`${agent.nom} LANCÉ : onglet rattaché (passage ${passage.slice(0, 8)})${note ? '' : ' ; onglet non noté (verrou de la file occupé) : il ne sera pas fermé par le precheck'}`)
  return 0
}
function essai() {
  const { code, etat, executant } = precheck(true)
  if (code === 0 && !executant) console.log('ESSAI : exécutant de la tâche inconnu ; rien ne serait lancé')
  else if (code === 0) console.log(`ESSAI : lancerait ${executant === 'claude' ? 'Claude Code' : 'Hermes'} par Orca (consigne de ${consigne(crypto.randomUUID(), executant).length} signes, passage tiré au lancement)`)
  else if (code === 1) console.log(`ESSAI : ${etat === 'en_cours' ? MESSAGES.en_cours : MESSAGES.vide}`)
  else if (code === 2) console.log('ESSAI : PANNE : la file n8n ne répond pas ; rien ne serait lancé')
  else console.log(`ESSAI : le precheck à blanc a rendu le code ${code}`)
  return code === 2 ? 2 : 0
}
async function principal() {
  if (process.argv.includes('--essai')) return essai()
  const r = await avecVerrou(FICHIERS.verrouRepartiteur, { attenteMs: 0, dureeMs: 10 * 60_000 }, () => lancer())
  if (r.occupe) { console.log('RÉPARTITEUR DÉJÀ EN COURS : rien à lancer'); return 0 }
  return r.valeur
}
principal().then((c) => { process.exitCode = c }, (e) => {
  console.log(`ÉCHEC : erreur interne du répartiteur (${e?.name || 'Error'}${typeof e?.code === 'string' ? ` ${e.code}` : ''})`)
  process.exitCode = 1
})
