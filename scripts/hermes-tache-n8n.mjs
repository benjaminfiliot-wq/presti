#!/usr/bin/env node
// Client PC de la file des tâches de Hermes tenue par n8n sur Oracle (phase 1.4, 01/11/2026 ; rendu robuste le 02/11/2026 après
// l'audit B de la file, douze constats rejoués par le banc hors ligne scripts/hermes-file-banc.mjs). Le montage :
//   n8n (Oracle) tient la file (table de données « taches_hermes ») et la remplit — revue hebdomadaire du réseau neuronal, puis
//   toute tâche d'un autre workflow ; Orca, toutes les heures, lance --precheck ; s'il rend 0, le répartiteur
//   (scripts/lancer-hermes-file.mjs) ouvre UN Hermes, avec un identifiant de passage dans sa consigne ; Hermes prend la tâche
//   (--prendre --passage=…), l'exécute selon son brief, puis la rend (--fini) ; n8n poste alors une ligne dans Slack #presti-auto.
// n8n n'écoute que 127.0.0.1 sur Oracle ; le PC le joint par le tunnel permanent 127.0.0.1:5679 (tâche « Tunnel n8n Oracle »).
// Aucun secret ici. Webhooks (workflow n8n « Hermes — file des tâches », tâches 031-002, 031-005, 031-006, 031-007) :
//   POST /webhook/hermes-tache-ajouter  {tache, brief, origine}             → 201 {id}
//   GET  /webhook/hermes-tache?mode=peek|prendre                           → 200 {id, tache, brief} ou 204 si la file est vide
//   POST /webhook/hermes-tache-faite    {id, statut: fait|bloque, resume, executant}  → 200 {ok, slack: envoye|echec} ; 404 id
//                                                                            inconnu ; 409 ligne pas « en_cours » (031-007) ; la
//                                                                            ligne Slack nomme l'exécutant (Hermes ou Claude Code)
//   POST /webhook/hermes-tache-panne    {id, motif, executant}             → 200 {ok, slack} : ligne a_faire ou en_cours passée
//                                                                            « bloque » et ligne d'alerte dans #presti-auto
//                                                                            (031-016) ; 404 id inconnu ; 409 ligne déjà close
// Chaque appel porte l'en-tête x-presti-jeton (031-005) : sans lui, ou avec un faux, n8n répond 401. Toute alerte part PAR n8n
// (règle n8n-first, .claude/rules/architecture-outils.md) : ce client n'envoie jamais rien à Slack lui-même.
//
// Codes de sortie : 0 = oui ou fait ; 1 = non (file vide, tâche déjà portée, refus) ; 2 = PANNE (n8n injoignable, jeton refusé
// ou illisible, réponse inattendue), message « PANNE : … » sur stderr, jamais confondue avec une file vide (audit B, constat 6).
//   node scripts/hermes-tache-n8n.mjs --precheck [--a-blanc]   0 si Orca doit lancer un agent, 1 sinon, 2 en panne ;
//                                       --a-blanc ne fait que lire (aucun appel n8n hors peek, aucun fichier, aucun onglet) et
//                                       dit l'exécutant (EXECUTANT hermes|claude|aucun) ; hors --a-blanc, l'exécutant est noté
//                                       avec la réservation du passage (--reserver=<passage>) dans onglets-hermes.json
//   node scripts/hermes-tache-n8n.mjs --prendre [--passage=<id>] [--executant=hermes|claude]   TACHE <id> / tache / brief, ou
//                                       FILE VIDE, FILE OCCUPEE, AUTRE EXECUTANT (tâche réservée à l'autre) ou REFUS ; l'exécutant
//                                       vient de la réservation du passage (onglets-hermes.json), --executant doit lui être égal ;
//                                       sans passage : hermes, et seulement une tâche que personne ne porte (031-016, D et A)
//   node scripts/hermes-tache-n8n.mjs --fini <id> [--bloque] --resume "<une ligne>"   (« fait » sur revue-reseau-neuronal : le
//                                       vérificateur de la revue tourne d'abord et doit rendre 0 ; --forcer n'existe plus)
//   node scripts/hermes-tache-n8n.mjs --ajouter <tache> --brief <chemin> [--origine <qui>]
//   node scripts/hermes-tache-n8n.mjs --test             aller-retour avec une tâche d'essai, sur la VRAIE file (031-002, 031-006)
//   node scripts/hermes-tache-n8n.mjs --verifier-jeton   401 sans jeton ou avec un faux, réponse avec le bon (031-005)
//   node scripts/hermes-tache-n8n.mjs --verifier-409     « faite » refuse une ligne qui n'est pas en cours (031-007), VRAIE file
// État du PC dans ~/.presti (PRESTI_DOSSIER_ETAT au banc : ~/.presti n'est alors ni lu ni écrit) :
//   tache-en-cours.json  la tâche prise et pas encore rendue {id, tache, brief, pris_le, maj_le, passage, tentatives}
//                        (+ orpheline : prise sans Hermes ; incertaine : réponse de « prendre » perdue ; fin_en_attente : réponse
//                        de « faite » perdue, rejouée par le precheck au lieu de relancer la tâche)
//   file-n8n-etat.json   ce qu'a vu le dernier precheck {verifie_le, etat: vide|tache|en_cours|panne, detail}
//   onglets-hermes.json  les onglets (Hermes ou Claude Code) que le répartiteur a lancés [{handle, passage, lance_le, executant,
//                        tache}] : la réservation du passage, dont le client tire l'exécutant
//   lancements-taches.json  le registre du répartiteur : par id de tâche, les lancements sans prise {sans_prise, dernier_le,
//                        executant} ; à LANCEMENTS_MAX, plus aucune relance : la tâche passe en panne par n8n (031-016, défaut C)
//   alertes-file.log     une ligne par panne ou anomalie (abandon, fichier écarté, fin refusée, course…)
//   file-n8n.verrou      une seule commande à la fois touche la file depuis ce PC (precheck, prise, écart, fin, essais)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'

const CE_FICHIER = fileURLToPath(import.meta.url)
export const RACINE = path.resolve(path.dirname(CE_FICHIER), '..')
const args = process.argv.slice(2)
const val = (nom) => {
  const egal = args.find((a) => a.startsWith(`${nom}=`))
  if (egal) return egal.slice(nom.length + 1)
  const i = args.indexOf(nom)
  return i >= 0 ? args[i + 1] : undefined
}

const MINUTE = 60_000
export const ABANDON_MS = 90 * MINUTE // une tâche sans compte rendu depuis 90 min est tenue pour figée
export const TENTATIVES_MAX = 2 // figée après deux reprises : rendue « bloque » (constat 2)
export const LANCEMENT_RECENT_MS = 15 * MINUTE // un Hermes lancé depuis moins de 15 min est encore en train de prendre sa tâche
export const VIE_ONGLET_MS = 6 * 60 * MINUTE // un onglet de Hermes ouvert depuis plus de 6 h est fermé
// 031-016 (audit 031-012, défaut C) : un agent lancé qui ne prend jamais sa tâche (limite d'usage, session expirée, invite sans
// réponse, plantage) était relancé chaque heure, jusqu'à six à la fois sur ce PC de 8 Go. Après LANCEMENTS_MAX lancements sans
// prise, plus aucune relance : la ligne passe « bloque » par le webhook panne de n8n (ligne Slack #presti-auto) et la file passe à
// la tâche suivante. Chaque relance ferme d'abord l'onglet du lancement précédent de la même tâche : un seul agent à la fois.
export const LANCEMENTS_MAX = 2
const MOTIF_PANNE = (n) => `panne : ${n} lancements sans prise de la tâche (agent lancé qui ne la prend pas)`
const BUDGET_PRECHECK_MS = 22_000 // Orca coupe le precheck à 30 s (orca automations show : precheck.timeoutSeconds = 30), démarrage de node compris
const DELAI_APPEL_MS = 20_000
const MOTIF_HORS_LISTE = 'refus : tâche hors de la liste blanche locale (scripts/hermes-tache-n8n.mjs), jamais exécutée'
const MOTIF_ABANDON = 'abandon : 2 passages sans compte rendu'

// LISTE BLANCHE LOCALE (audit 031-003 du 01/11, constat critique 1). Depuis 031-005, les webhooks (quatre depuis 031-016) exigent le jeton de la
// file ; cette liste reste la seconde barrière : un programme qui détient le jeton peut déposer une tâche, mais seul le NOM de la
// tâche choisit ICI son brief, et le chemin « brief » venu de n8n est ignoré. Une tâche hors de cette liste n'est jamais exécutée :
// elle est rendue « bloque ». Ajouter une tâche = une ligne ici, relue par Claude Code et versionnée (audit B, constat 12).
// Le même nom choisit aussi l'exécutant (031-013) : n8n ne peut donc jamais envoyer une tâche à un autre agent que celui prévu.
// 031-013 (02/11) : chaque entrée dit aussi QUI l'exécute, et c'est ici seulement (jamais n8n) : « hermes » (par défaut) ou
// « claude » (Claude Code, lancé lui aussi par Orca). Un nom d'exécutant inconnu rend la tâche non permise (fermé par défaut).
const EXECUTANTS = ['hermes', 'claude']
const BRIEFS = {
  'revue-reseau-neuronal': { brief: 'plans/011-cadrage-01-11/briefs/revue-hebdo-reseau-neuronal.md', executant: 'hermes' },
  // petite tâche d'essai de la chaîne entière, déposée à la main (01/11)
  'essai-boucle': { brief: 'plans/011-cadrage-01-11/briefs/essai-boucle.md', executant: 'hermes' },
  // 02/11 (contrôle croisé du chantier 1, vidéo metakaihos) : chaque soir, la santé du réseau recopiée en tête de wiki/hot.md
  'sante-reseau': { brief: 'plans/011-cadrage-01-11/briefs/sante-reseau.md', executant: 'hermes' },
  // 02/11 (031-013, vidéo metakaihos) : la relecture hebdomadaire des notes « à revoir » revient à Claude Code, jamais à Hermes
  'revoir-notes': { brief: 'plans/011-cadrage-01-11/briefs/revoir-notes.md', executant: 'claude' },
  // 02/11 au soir (prompt 5, sources ; annexe 2 : les fiches de lecture de vidéos sont du volume pour Hermes) : les vidéos de
  // @restructureai, transcrites sur Oracle ; Claude Code écrit ensuite « ce qui s'applique à Presti »
  'fiches-videos-restructureai': { brief: 'plans/011-cadrage-01-11/briefs/fiches-videos-restructureai.md', executant: 'hermes' },
  // 02/11 au soir : le jeu de données fictif de la démo Entreprise (prompt 5, tâche 035-006), Hermes sur l'hôte d'agents Oracle.
  'p5-jeu-donnees-batidemo': { brief: 'plans/011-cadrage-01-11/briefs/p5-jeu-donnees-batidemo.md', executant: 'hermes' },
  // 03/11 vers 14 h (prompt 6, outillage, tâche 036-017 ; Benj : « utilise Hermes et Orca avec l'API pour aider et aller plus vite ») :
  // une fiche connecteur par outil de OUTILLAGE.md, depuis la documentation officielle ; Claude Code tranche ensuite les portées et la voie O3
  'p6-fiches-connecteurs': { brief: 'plans/011-cadrage-01-11/briefs/p6-fiches-connecteurs.md', executant: 'hermes' },
  // 03/11 vers 16 h 30 (Benj : « les SMS, tu le fais » ; dépôt public-apis donné) : comparatif des SMS gratuits pour la France, sans envoi
  'p6-sms-gratuit': { brief: 'plans/011-cadrage-01-11/briefs/p6-sms-gratuit.md', executant: 'hermes' },
}
const TAILLE_MAX_BRIEF = 50_000
const DOSSIER_BRIEFS = path.resolve(RACINE, 'plans', '011-cadrage-01-11', 'briefs')
function estSous(fichier, dossier) {
  const rel = path.relative(dossier, fichier)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}
export function executantDe(tache) {
  if (typeof tache !== 'string' || !Object.hasOwn(BRIEFS, tache)) return null
  const e = BRIEFS[tache].executant ?? 'hermes'
  return EXECUTANTS.includes(e) ? e : null
}
export function briefPermis(tache) {
  if (!executantDe(tache)) return null
  const abs = path.resolve(RACINE, BRIEFS[tache].brief)
  if (!estSous(abs, DOSSIER_BRIEFS)) return null
  try {
    if (!estSous(fs.realpathSync.native(abs), fs.realpathSync.native(DOSSIER_BRIEFS))) return null
    if (fs.statSync(abs).size > TAILLE_MAX_BRIEF) return null
  } catch { return null }
  return abs
}

// ── Banc et dossier d'état ────────────────────────────────────────────────────────────────────────────────────────────────
// PRESTI_DOSSIER_ETAT (banc) remplace ~/.presti en entier, jeton compris. Au banc seulement : PRESTI_ORCA_JS (faux orca, un
// script node), PRESTI_GARDE_CONTENU (autre garde), PRESTI_NETTOYAGE_SYNCHRONE=1 (le precheck attend son nettoyage).
const BANC = process.env.PRESTI_DOSSIER_ETAT ? path.resolve(process.env.PRESTI_DOSSIER_ETAT) : null
export const MODE_BANC = Boolean(BANC)
export const DOSSIER_ETAT = BANC || path.join(os.homedir(), '.presti')
export const FICHIERS = {
  enCours: path.join(DOSSIER_ETAT, 'tache-en-cours.json'),
  rejete: path.join(DOSSIER_ETAT, 'tache-en-cours.rejete.json'),
  etat: path.join(DOSSIER_ETAT, 'file-n8n-etat.json'),
  onglets: path.join(DOSSIER_ETAT, 'onglets-hermes.json'),
  alertes: path.join(DOSSIER_ETAT, 'alertes-file.log'),
  verrou: path.join(DOSSIER_ETAT, 'file-n8n.verrou'),
  verrouNettoyage: path.join(DOSSIER_ETAT, 'nettoyage-onglets.verrou'),
  verrouRepartiteur: path.join(DOSSIER_ETAT, 'repartiteur.verrou'),
  lancements: path.join(DOSSIER_ETAT, 'lancements-taches.json'),
}

// ── Pannes, et rien d'extérieur ni de secret dans une sortie ──────────────────────────────────────────────────────────────
export class Panne extends Error {
  constructor(message, statut = null) { super(message); this.name = 'Panne'; this.statut = statut }
}
const aTaire = new Set() // le jeton lu et les lignes de son fichier : jamais imprimés, même dans une erreur (constat 9)
export function taire(texte) {
  let t = String(texte ?? '')
  for (const s of aTaire) t = t.split(s).join('[jeton]')
  return t
}
const dire = (texte) => console.log(taire(texte))
const signaler = (texte) => console.error(taire(texte))
const nomSur = (s) => (typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(s) ? s : '(nom illisible)')
function motifPanne(e) {
  if (e instanceof Panne) return e.message
  const quoi = `${e?.name || 'Error'}${typeof e?.code === 'string' ? ` ${e.code}` : ''}`
  return `erreur interne (${quoi} : ${String(e?.message || '').replace(/\s+/g, ' ').slice(0, 160)})`
}

// ── Jeton des webhooks (031-005) ─────────────────────────────────────────────────────────────────────────────────────────
// Un fichier du PC hors dépôt, lisible par le seul compte de Benj ; n8n ne garde que son empreinte SHA-256 et répond 401 sans
// lui. Hors d'AppData : Hermes lancé par Orca voit un AppData redirigé (01/11). Il protège du navigateur, d'Oracle et des autres
// comptes, PAS des programmes du compte de Benj (audit B, constat 8) : c'est le contrôle d'état côté n8n (031-007) qui borne ce
// qu'un tel programme peut faire. Format vérifié à la lecture, valeur jamais affichée ; PRESTI_FILE_JETON_FICHIER n'est suivie que
// sous ~/.presti (ou le dossier d'état du banc).
const FORMAT_JETON = /^[A-Za-z0-9_-]{32,128}$/
let jetonLu = null
function fichierJeton() {
  const choisi = process.env.PRESTI_FILE_JETON_FICHIER
  if (!choisi) return path.join(DOSSIER_ETAT, 'file-n8n.jeton')
  const reel = (p) => { try { return fs.realpathSync.native(p) } catch { return path.resolve(p) } }
  const f = path.resolve(choisi)
  if (![path.join(os.homedir(), '.presti'), DOSSIER_ETAT].some((d) => estSous(reel(f), reel(d)))) {
    throw new Panne('jeton de la file illisible : PRESTI_FILE_JETON_FICHIER doit désigner un fichier sous ~/.presti (emplacement refusé)')
  }
  return f
}
export function lireJeton() {
  if (jetonLu) return jetonLu
  let brut
  try { brut = fs.readFileSync(fichierJeton(), 'utf8') } catch (e) {
    if (e instanceof Panne) throw e
    throw new Panne(`jeton de la file illisible (${/^[A-Z]{2,20}$/.test(e?.code || '') ? e.code : 'lecture impossible'})`)
  }
  for (const morceau of [brut.trim(), ...brut.split(/\r?\n/).map((l) => l.trim())]) if (morceau.length >= 12) aTaire.add(morceau)
  const j = brut.trim()
  if (!FORMAT_JETON.test(j)) throw new Panne('jeton de la file illisible : format inattendu (une seule ligne base64url de 32 à 128 signes attendue)')
  jetonLu = j
  return j
}
// La file ne se joint que par le tunnel : http://127.0.0.1 ou http://localhost (constat 9 : PRESTI_N8N_BASE envoyait le jeton
// n'importe où).
export function baseN8n() {
  const brut = process.env.PRESTI_N8N_BASE || 'http://127.0.0.1:5679/webhook'
  let u
  try { u = new URL(brut) } catch { throw new Panne('PRESTI_N8N_BASE illisible') }
  if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(u.hostname) || u.username || u.password || u.search || u.hash) {
    throw new Panne('PRESTI_N8N_BASE refusé : la file ne se joint que par http://127.0.0.1 ou http://localhost (le tunnel)')
  }
  return u.href.replace(/\/+$/, '')
}

// ── Appels à n8n ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let ECHEANCE = Infinity // fin du budget de la commande en cours (performance.now())
function motifReseau(e) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'délai dépassé'
  const code = e?.cause?.code || e?.code
  return typeof code === 'string' && /^[A-Z_]{2,40}$/.test(code) ? code : 'réseau'
}
// options.jeton : '' (aucun) ou une valeur fausse, pour le seul mode --verifier-jeton. Le message d'une erreur de fetch n'est
// jamais repris (il recopiait la valeur d'un en-tête refusé : constat 9) ; une redirection n'est jamais suivie (le jeton partirait
// avec elle).
export async function appel(methode, chemin, corps, options = {}) {
  const base = baseN8n()
  const j = Object.hasOwn(options, 'jeton') ? options.jeton : lireJeton()
  const reste = ECHEANCE - performance.now()
  if (reste < 1500) throw new Panne('délai épuisé avant la réponse de n8n')
  const delai = Math.max(1000, Math.min(options.delaiMs ?? DELAI_APPEL_MS, reste - 500))
  let r
  try {
    r = await fetch(`${base}/${chemin}`, {
      method: methode,
      headers: { ...(j ? { 'x-presti-jeton': j } : {}), ...(corps ? { 'content-type': 'application/json' } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(delai),
    })
  } catch (e) { throw new Panne(`n8n injoignable (${motifReseau(e)})`) }
  let texte = ''
  try { texte = await r.text() } catch (e) { throw new Panne(`réponse de n8n coupée (${motifReseau(e)})`) }
  let json = null
  try { json = texte ? JSON.parse(texte) : null } catch {}
  return { statut: r.status, json, texte }
}
function panneDeStatut(s, quoi) {
  if (s === 401) return new Panne(`jeton refusé par n8n (401, ${quoi})`, s)
  if (s >= 500) return new Panne(`n8n en erreur (${s}, ${quoi})`, s)
  return new Panne(`réponse inattendue de n8n (${s}, ${quoi})`, s)
}
export function idValide(v) {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return String(v)
  if (typeof v === 'string' && /^\d{1,15}$/.test(v)) return v
  return null
}
function tacheRecue(j) {
  const id = idValide(j?.id)
  if (!id || typeof j.tache !== 'string' || !j.tache || j.tache.length > 200) return null
  return { id, tache: j.tache }
}
// peek ou prendre : la tâche, ou null sur 204 SEULEMENT ; tout autre statut est une panne (constat 6)
async function lire(mode) {
  const r = await appel('GET', `hermes-tache?mode=${mode}`)
  if (r.statut === 204) return null
  if (r.statut === 200) {
    const t = tacheRecue(r.json)
    if (!t) throw new Panne(`réponse de n8n illisible (${mode} : 200 sans identifiant numérique ni tâche)`, 200)
    return t
  }
  throw panneDeStatut(r.statut, mode)
}
// executant (031-016, défaut H) : tiré du NOM de la tâche (liste blanche locale), pour que la ligne Slack de n8n nomme l'exécutant réel
async function rendre(id, statut, resume, tache = null) {
  const r = await appel('POST', 'hermes-tache-faite', { id, statut, resume, executant: executantDe(tache) ?? 'hermes' })
  if (r.statut === 200) return { etat: 'rendue', code: 200, slack: r.json?.slack === 'envoye' ? 'envoyé' : r.json?.slack === 'echec' ? 'échec' : null }
  if (r.statut === 404) return { etat: 'inconnue', code: 404 }
  if (r.statut === 409) return { etat: 'refusee', code: 409 }
  if (r.statut === 400) return { etat: 'invalide', code: 400 }
  throw panneDeStatut(r.statut, 'faite')
}

// ── Fichiers d'état : écriture atomique, verrou ──────────────────────────────────────────────────────────────────────────
const PASSAGEUX = ['EPERM', 'EBUSY', 'EACCES'] // Windows : un antivirus ou un lecteur tient le fichier un instant
function dormirSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) }
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))
export function lireJson(fichier) {
  for (let i = 0; ; i++) {
    try { return { existe: true, valeur: JSON.parse(fs.readFileSync(fichier, 'utf8')) } } catch (e) {
      if (e?.code === 'ENOENT') return { existe: false }
      if (PASSAGEUX.includes(e?.code) && i < 8) { dormirSync(25 * (i + 1)); continue }
      return { existe: true, illisible: true }
    }
  }
}
export function ecrireJson(fichier, valeur) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  const tmp = `${fichier}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(valeur, null, 1)}\n`)
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, fichier); return } catch (e) {
      if (PASSAGEUX.includes(e?.code) && i < 8) { dormirSync(25 * (i + 1)); continue }
      try { fs.rmSync(tmp, { force: true }) } catch {}
      throw e
    }
  }
}
function effacer(fichier) {
  for (let i = 0; ; i++) {
    try { fs.rmSync(fichier, { force: true }); return } catch (e) {
      if (PASSAGEUX.includes(e?.code) && i < 8) { dormirSync(25 * (i + 1)); continue }
      throw e
    }
  }
}
function pidVivant(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true } catch (e) { return e?.code === 'EPERM' }
}
function verrouPerime(fichier, dureeMs) {
  let brut, mtime
  try { brut = fs.readFileSync(fichier, 'utf8'); mtime = fs.statSync(fichier).mtimeMs } catch (e) { return false }
  let c = null
  try { c = JSON.parse(brut) } catch {}
  if (!c || !Number.isFinite(c.le)) return Date.now() - mtime > MINUTE // en cours d'écriture, ou abîmé depuis longtemps
  return Date.now() - c.le > dureeMs || !pidVivant(c.pid)
}
// Une seule commande à la fois : un fichier créé en exclusif ('wx'), repris s'il est périmé (porteur mort, ou plus de dureeMs).
export async function avecVerrou(fichier, { attenteMs, dureeMs = 10 * MINUTE }, fn) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  const moi = { pid: process.pid, le: Date.now(), cle: crypto.randomUUID() }
  const fin = performance.now() + attenteMs
  for (;;) {
    try { fs.writeFileSync(fichier, JSON.stringify(moi), { flag: 'wx' }); break } catch (e) {
      if (e?.code !== 'EEXIST' && !PASSAGEUX.includes(e?.code)) throw e
      if (e?.code === 'EEXIST' && verrouPerime(fichier, dureeMs)) {
        const cote = `${fichier}.${moi.cle}.perime`
        try { fs.renameSync(fichier, cote); fs.rmSync(cote, { force: true }) } catch {}
        continue
      }
      if (performance.now() >= fin) return { occupe: true }
      await dormir(80 + Math.random() * 120)
    }
  }
  try { return { occupe: false, valeur: await fn() } } finally {
    try { if (JSON.parse(fs.readFileSync(fichier, 'utf8')).cle === moi.cle) fs.rmSync(fichier, { force: true }) } catch {}
  }
}
export function noterAlerte(texte) {
  try {
    fs.mkdirSync(DOSSIER_ETAT, { recursive: true })
    fs.appendFileSync(FICHIERS.alertes, `${new Date(Date.now()).toISOString()} ${taire(texte).replace(/\s+/g, ' ').slice(0, 300)}\n`)
  } catch {}
}
export function noterEtat(etat, detail) {
  try { ecrireJson(FICHIERS.etat, { verifie_le: new Date(Date.now()).toISOString(), etat, detail: taire(detail).slice(0, 200) }) } catch {}
}

// ── Registre des lancements par tâche (031-016, défaut C) ────────────────────────────────────────────────────────────────
// Écrit sous le verrou de la file : par le precheck qui réserve un lancement (+1), par la prise (remis à 0). Un fichier illisible
// est noté et repart de zéro : au pire deux lancements de plus avant la panne, jamais une relance sans fin.
function lireLancements(alerter = true) {
  const l = lireJson(FICHIERS.lancements)
  if (!l.existe) return {}
  if (l.illisible || !l.valeur || typeof l.valeur !== 'object' || Array.isArray(l.valeur)) {
    if (alerter) noterAlerte('REGISTRE DES LANCEMENTS ILLISIBLE : repart de zéro')
    return {}
  }
  return l.valeur
}
function ecrireLancements(r) {
  const ids = Object.keys(r).filter((id) => idValide(id)).sort((a, b) => (r[b]?.dernier_le ?? 0) - (r[a]?.dernier_le ?? 0)).slice(0, 50)
  ecrireJson(FICHIERS.lancements, Object.fromEntries(ids.map((id) => [id, r[id]])))
}
export function lancementsSansPrise(id, alerter = true) {
  const n = lireLancements(alerter)[id]?.sans_prise
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}
function noterLancement(id, executant) {
  const r = lireLancements()
  r[id] = { sans_prise: lancementsSansPrise(id) + 1, dernier_le: Date.now(), executant: executant ?? null }
  ecrireLancements(r)
}
function noterPrise(id) {
  try {
    const r = lireLancements()
    if (!r[id]) return
    r[id] = { ...r[id], sans_prise: 0, pris_le: Date.now() }
    ecrireLancements(r)
  } catch {}
}
// Le webhook panne de n8n passe la ligne « bloque » et poste la ligne d'alerte dans #presti-auto (règle n8n-first : jamais d'envoi
// codé ici). Rend l'état comme rendre().
async function signalerPanne(id, tache, motif) {
  const r = await appel('POST', 'hermes-tache-panne', { id, motif, executant: executantDe(tache) ?? 'hermes' })
  if (r.statut === 200) return { etat: 'rendue', code: 200, slack: r.json?.slack === 'envoye' ? 'envoyé' : r.json?.slack === 'echec' ? 'échec' : null }
  const etats = { 404: 'inconnue', 409: 'refusee', 400: 'invalide' }
  if (Object.hasOwn(etats, r.statut)) return { etat: etats[r.statut], code: r.statut }
  throw panneDeStatut(r.statut, 'panne')
}

// ── La tâche en cours sur ce PC ──────────────────────────────────────────────────────────────────────────────────────────
// Une prise a un seul porteur (constat 1) : le passage du Hermes qui l'a prise. L'identifiant est vérifié (chiffres seulement :
// un id forgé n'injecte plus de ligne dans ce que lit Hermes, constat 4). L'ancien format {id, tache, pris_le} reste lu (tâche
// prise avant la mise à jour du 02/11) : passage inconnu, aucune reprise comptée.
const PASSAGE = /^[A-Za-z0-9-]{8,64}$/
export const HANDLE = /^term_[A-Za-z0-9_-]{1,80}$/
function lireEnCours() {
  const l = lireJson(FICHIERS.enCours)
  if (!l.existe) return { tache: null }
  const b = l.valeur
  if (l.illisible || !b || typeof b !== 'object' || Array.isArray(b)) return { invalide: 'fichier de reprise illisible' }
  const id = idValide(b.id)
  if (!id) return { invalide: 'identifiant de tâche non numérique dans le fichier de reprise' }
  if (typeof b.tache !== 'string' || !b.tache) return { invalide: `tâche absente du fichier de reprise (id ${id})` }
  const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const pris_le = nombre(b.pris_le) ?? nombre(b.maj_le)
  const maj_le = nombre(b.maj_le) ?? pris_le
  if (pris_le === null) return { invalide: `date absente du fichier de reprise (id ${id})` }
  if (b.passage != null && !(typeof b.passage === 'string' && PASSAGE.test(b.passage))) return { invalide: `passage illisible dans le fichier de reprise (id ${id})` }
  let fin = null
  if (b.fin_en_attente != null) {
    const f = b.fin_en_attente
    if (!f || !['fait', 'bloque'].includes(f.statut) || typeof f.resume !== 'string' || f.resume.length > 300) return { invalide: `fin en attente illisible (id ${id})` }
    fin = { statut: f.statut, resume: f.resume, le: nombre(f.le) ?? maj_le }
  }
  return {
    tache: {
      id, tache: b.tache, pris_le, maj_le, passage: b.passage ?? null,
      tentatives: Number.isSafeInteger(b.tentatives) && b.tentatives >= 0 ? b.tentatives : 0,
      orpheline: b.orpheline === true, incertaine: b.incertaine === true, fin_en_attente: fin,
    },
  }
}
function noterEnCours(t) {
  ecrireJson(FICHIERS.enCours, {
    id: t.id, tache: t.tache, brief: briefPermis(t.tache), pris_le: t.pris_le, maj_le: t.maj_le, passage: t.passage ?? null,
    tentatives: t.tentatives ?? 0,
    ...(t.orpheline ? { orpheline: true } : {}), ...(t.incertaine ? { incertaine: true } : {}),
    ...(t.fin_en_attente ? { fin_en_attente: t.fin_en_attente } : {}),
  })
}
const nouvelle = (r, passage) => ({ id: r.id, tache: r.tache, pris_le: Date.now(), maj_le: Date.now(), passage: passage ?? null, tentatives: 0 })
function mettreDeCote(raison) {
  try { fs.renameSync(FICHIERS.enCours, FICHIERS.rejete) } catch { try { effacer(FICHIERS.enCours) } catch {} }
  noterAlerte(`FICHIER DE REPRISE ÉCARTÉ : ${raison} (copie : tache-en-cours.rejete.json)`)
}
// Un fichier qui dit « en cours » une tâche que n8n propose encore en tête de file ne dit pas vrai (fichier forgé, ou table
// recréée) : il est écarté, rien n'est rendu en son nom (constat 4). La vraie barrière est côté n8n : 409 (031-007).
async function coherente(t) {
  const tete = await lire('peek')
  if (tete && tete.id === t.id) { mettreDeCote(`la tâche ${t.id} attend encore en file chez n8n : le fichier de reprise ne dit pas vrai`); return false }
  return true
}
// Réponse de « prendre » perdue (constat 3a) : la prise est notée AVANT l'appel ; ensuite, si n8n propose encore cette tâche en
// tête, la prise n'a pas eu lieu ; sinon, elle a eu lieu et la tâche est à nous.
async function resoudreIncertaine(t) {
  const tete = await lire('peek')
  if (tete && tete.id === t.id) { effacer(FICHIERS.enCours); return null }
  const sure = { ...t, incertaine: false, maj_le: Date.now() }
  noterEnCours(sure)
  noterAlerte(`PRISE RETROUVÉE : tâche ${t.id} (${t.tache}) prise malgré une réponse de n8n perdue`)
  return sure
}
// Réponse de « faite » perdue (constat 2) : la fin est rejouée telle quelle, la tâche n'est jamais refaite.
async function rejouerFin(t) {
  if (!(await coherente(t))) return
  const res = await rendre(t.id, t.fin_en_attente.statut, t.fin_en_attente.resume, t.tache)
  effacer(FICHIERS.enCours)
  noterAlerte(`FIN REJOUÉE : tâche ${t.id} (${t.tache}) « ${t.fin_en_attente.statut} », n8n répond ${res.code}`)
}
async function abandonner(t) {
  const res = await rendre(t.id, 'bloque', MOTIF_ABANDON, t.tache)
  effacer(FICHIERS.enCours)
  noterAlerte(`ABANDON : tâche ${t.id} (${t.tache}) rendue « bloque » après ${t.tentatives + 1} passages sans compte rendu (n8n : ${res.code})`)
}
async function ecarter(r) {
  const res = await rendre(r.id, 'bloque', MOTIF_HORS_LISTE)
  noterAlerte(`ÉCARTÉE : tâche ${r.id} « ${nomSur(r.tache)} » hors de la liste blanche, rendue « bloque » (n8n : ${res.code})`)
}
// Lit la tâche locale et règle ce qui peut l'être sans Hermes : fichier invalide ou hors liste écarté, fin perdue rejouée, prise
// incertaine résolue. Rend la tâche encore à porter, ou null.
async function tacheLocale() {
  const lu = lireEnCours()
  if (lu.invalide) { mettreDeCote(lu.invalide); return null }
  let t = lu.tache
  if (!t) return null
  if (!briefPermis(t.tache)) { mettreDeCote(`tâche ${t.id} « ${nomSur(t.tache)} » hors de la liste blanche locale`); return null }
  if (t.fin_en_attente) { await rejouerFin(t); return null }
  if (t.incertaine) t = await resoudreIncertaine(t)
  return t
}

// ── Onglets de Hermes lancés par le répartiteur (constat 7) ──────────────────────────────────────────────────────────────
export function lireOnglets() {
  const l = lireJson(FICHIERS.onglets)
  if (!l.existe || l.illisible || !Array.isArray(l.valeur)) return []
  return l.valeur.filter((e) => e && typeof e === 'object' && (e.handle === null || (typeof e.handle === 'string' && HANDLE.test(e.handle))) &&
    typeof e.passage === 'string' && PASSAGE.test(e.passage) && Number.isFinite(e.lance_le)).slice(-50)
}
function lancementRecent(onglets, t) {
  const maintenant = Date.now()
  return onglets.some((e) => maintenant - e.lance_le < LANCEMENT_RECENT_MS && (!t || e.passage !== t.passage))
}
function cheminOrca() {
  if (process.env.ORCA_CLI_COMMAND) return process.env.ORCA_CLI_COMMAND
  const nom = process.platform === 'win32' ? 'orca.exe' : 'orca'
  for (const d of (process.env.PATH || '').split(path.delimiter)) {
    if (!d || !path.isAbsolute(d)) continue
    try { if (fs.statSync(path.join(d, nom)).isFile()) return path.join(d, nom) } catch {}
  }
  return nom
}
// orca sans shell ; au banc, le faux orca de PRESTI_ORCA_JS, ou rien (jamais le vrai)
export function orca(argsOrca, { timeoutMs = 60_000, cwd } = {}) {
  const options = { encoding: 'utf8', timeout: timeoutMs, cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 }
  if (MODE_BANC) {
    const faux = process.env.PRESTI_ORCA_JS
    if (!faux) { const e = new Error('orca désactivé au banc (PRESTI_ORCA_JS absent)'); e.code = 'ORCA_BANC'; throw e }
    return execFileSync(process.execPath, [faux, ...argsOrca], options)
  }
  return execFileSync(cheminOrca(), argsOrca, options)
}
function listerTerminaux() {
  const j = JSON.parse(orca(['terminal', 'list', '--limit', '500', '--json'], { timeoutMs: 120_000 }))
  const liste = j?.result?.terminals
  if (!Array.isArray(liste)) throw new Error('réponse d’orca illisible')
  const parHandle = new Map()
  for (const t of liste) if (t && typeof t.handle === 'string') parHandle.set(t.handle, { titre: typeof t.title === 'string' ? t.title : '' })
  return { parHandle, complet: j.result.truncated !== true }
}
function fermerOnglet(handle) {
  try { orca(['terminal', 'close', '--terminal', handle, '--json'], { timeoutMs: 60_000 }); return true } catch { return false }
}
// Ne ferme QUE des onglets notés dans onglets-hermes.json : fini (titre qui commence par « ✓ »), demandé (passage figé), ou ouvert
// depuis plus de 6 h. Un onglet disparu est oublié. orca peut mettre 50 s à répondre (mesuré le 02/11, RAM basse) : ce nettoyage
// tourne dans un processus détaché, hors du budget de 30 s du precheck, et réécrit la liste par fusion sous le verrou de la file.
async function nettoyerOnglets(demandes) {
  await avecVerrou(FICHIERS.verrouNettoyage, { attenteMs: 90_000 }, async () => {
    const liste = lireOnglets()
    if (!liste.length) return
    const maintenant = Date.now()
    const fermes = new Set()
    const disparus = new Set()
    if (liste.some((e) => e.handle)) {
      let terminaux = null
      try { terminaux = listerTerminaux() } catch {}
      for (const e of liste) {
        if (!e.handle) continue
        const t = terminaux?.parHandle.get(e.handle)
        if (terminaux?.complet && !t) { disparus.add(e.handle); continue }
        const fini = Boolean(t) && /^\s*✓/u.test(t.titre)
        if ((fini || demandes.includes(e.handle) || maintenant - e.lance_le > VIE_ONGLET_MS) && fermerOnglet(e.handle)) fermes.add(e.handle)
      }
    }
    await avecVerrou(FICHIERS.verrou, { attenteMs: 30_000 }, () => {
      const actuelle = lireOnglets()
      const garde = actuelle.filter((e) => {
        if (!e.handle) return maintenant - e.lance_le < LANCEMENT_RECENT_MS // lancement resté sans réponse d'orca : oublié après 15 min
        if (fermes.has(e.handle) || disparus.has(e.handle)) return false
        return maintenant - e.lance_le < VIE_ONGLET_MS + 60 * MINUTE // fermeture impossible depuis une heure : oublié
      })
      if (garde.length !== actuelle.length) ecrireJson(FICHIERS.onglets, garde)
    })
  })
}
async function lancerNettoyage(demandes) {
  if (!lireOnglets().length) return // rien de noté : aucun appel à orca
  const a = [CE_FICHIER, '--nettoyer-onglets', ...demandes.filter((h) => HANDLE.test(h)).map((h) => `--fermer=${h}`)]
  try {
    if (MODE_BANC && process.env.PRESTI_NETTOYAGE_SYNCHRONE === '1') {
      await new Promise((ok) => { const c = spawn(process.execPath, a, { stdio: 'ignore', windowsHide: true, cwd: RACINE }); c.on('exit', ok); c.on('error', ok) })
      return
    }
    // stdio ignoré : Orca, qui lit la sortie du precheck, n'attend pas ce processus
    const c = spawn(process.execPath, a, { detached: true, stdio: 'ignore', windowsHide: true, cwd: RACINE })
    c.on('error', () => {})
    c.unref()
  } catch {}
}

// ── --precheck ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// (1) le nettoyage des onglets notés est demandé à chaque passage, même file vide ou en panne ; (2) une tâche portée depuis
// moins de 90 min, ou un Hermes lancé depuis moins de 15 min : 1, aucun second Hermes ; figée : abandonnée après deux reprises,
// sinon l'onglet du passage figé est fermé et 0 ; (3) la file : 204 → 1, tâche permise → 0, tâche hors liste écartée après
// vérification de ce qui a été pris ; panne → 2.
async function decider() {
  const aFermer = []
  // 031-013 : un « 0 » dit aussi quel exécutant lancer, tiré du NOM de la tâche (liste blanche locale), jamais de n8n
  // 031-016 : et pour quelle tâche (id), compté dans le registre des lancements par la réservation
  const issue = (code, etat, detail, tache, id = null) => ({ code, etat, detail, aFermer, executant: code === 0 ? executantDe(tache) : null, id: code === 0 ? id : null })
  const onglets = lireOnglets()
  const porteurs = (t) => onglets.filter((e) => e.handle && t.passage && e.passage === t.passage).map((e) => e.handle)
  // 031-016 (C) : les onglets lancés pour cette tâche ; fermés avant toute relance (un seul agent à la fois) et à la panne
  const lancesPour = (id) => onglets.filter((e) => e.handle && e.tache === id).map((e) => e.handle)
  // 031-016 (C) : true, la tâche peut encore être lancée ; false, elle vient de passer en panne par n8n et la file passe à la
  // suivante. Une panne que n8n ne pose pas (webhook absent, 404) est une PANNE du precheck : rien n'est relancé.
  const lancable = async (id, tache) => {
    const n = lancementsSansPrise(id)
    aFermer.push(...lancesPour(id))
    if (n < LANCEMENTS_MAX) return true
    const res = await signalerPanne(id, tache, MOTIF_PANNE(n))
    if (res.etat !== 'rendue' && res.etat !== 'refusee') {
      noterAlerte(`PANNE DE TÂCHE NON POSÉE : tâche ${id} (${tache}) lancée ${n} fois sans prise ; n8n répond ${res.code} au webhook panne`)
      throw new Panne(`tâche ${id} (${tache}) en panne après ${n} lancements sans prise, mais n8n refuse le webhook panne (${res.code}) : rien n'est relancé`)
    }
    if (lireEnCours().tache?.id === id) effacer(FICHIERS.enCours)
    noterAlerte(`PANNE DE TÂCHE : tâche ${id} (${tache}) lancée ${n} fois sans prise ; rendue « bloque » par n8n (${res.code}${res.slack ? `, Slack : ${res.slack}` : ''}) ; la file passe à la suivante`)
    return false
  }
  let t = await tacheLocale()
  if (t && t.orpheline) { // prise par un precheck ou un essai, sans porteur : il faut lui lancer son exécutant
    if (lancementRecent(onglets, t)) return issue(1, 'en_cours', `tâche ${t.id} (${t.tache}) sans porteur : un agent vient d'être lancé pour elle`)
    if (await coherente(t) && await lancable(t.id, t.tache)) return issue(0, 'tache', `tâche ${t.id} (${t.tache}) prise sans porteur : un agent doit la porter`, t.tache, t.id)
    t = null
  }
  if (t) {
    const age = Date.now() - t.maj_le
    if (age < ABANDON_MS) return issue(1, 'en_cours', `tâche ${t.id} (${t.tache}) en cours depuis ${Math.max(0, Math.round(age / MINUTE))} min, ${t.tentatives} reprise(s)`)
    // figée : 90 minutes sans compte rendu (le peek de coherente dit aussi si n8n répond, avant de relancer qui que ce soit)
    if (!(await coherente(t))) t = null
    else if (t.tentatives >= TENTATIVES_MAX) { await abandonner(t); aFermer.push(...porteurs(t)); t = null }
    else if (lancementRecent(onglets, t)) return issue(1, 'en_cours', `tâche ${t.id} (${t.tache}) figée : un Hermes vient d'être lancé pour la reprendre`)
    else {
      aFermer.push(...porteurs(t))
      if (await lancable(t.id, t.tache)) return issue(0, 'tache', `tâche ${t.id} (${t.tache}) sans compte rendu depuis ${Math.round(age / MINUTE)} min : un nouvel agent la reprend`, t.tache, t.id)
      t = null
    }
  }
  if (lancementRecent(onglets, null)) return issue(1, 'en_cours', "un Hermes vient d'être lancé et n'a pas encore pris sa tâche")
  for (let i = 0; i < 5; i++) {
    const p = await lire('peek')
    if (!p) return issue(1, 'vide', 'file vide')
    if (briefPermis(p.tache)) {
      if (await lancable(p.id, p.tache)) return issue(0, 'tache', `tâche ${p.id} (${p.tache}) en file`, p.tache, p.id)
      continue // en panne (031-016) : la ligne est « bloque », la file passe à la tâche suivante
    }
    const r = await lire('prendre')
    if (!r) return issue(1, 'vide', 'file vide')
    if (briefPermis(r.tache)) { // la course a donné une tâche PERMISE (constat 5) : gardée pour son exécutant, jamais bloquée
      noterEnCours({ ...nouvelle(r, null), orpheline: true })
      noterAlerte(`COURSE : la tâche ${r.id} (${r.tache}) est arrivée à la place de la tâche ${p.id} hors liste ; gardée pour son exécutant`)
      if (await lancable(r.id, r.tache)) return issue(0, 'tache', `tâche ${r.id} (${r.tache}) prise pendant un écart : un agent doit la porter`, r.tache, r.id)
      continue
    }
    await ecarter(r) // hors liste : celle vue au peek, ou une autre hors liste ; le motif est vrai dans les deux cas
  }
  return issue(1, 'vide', 'cinq tâches hors liste écartées ; la suite au prochain passage')
}
async function deciderABlanc() {
  const issue = (code, etat, detail, tache) => ({ code, etat, detail, executant: code === 0 ? executantDe(tache) : null })
  const onglets = lireOnglets()
  // 031-016 (C) : à blanc, rien n'est écrit ni appelé ; on dit seulement que la tâche passerait en panne
  const enPanne = (id) => {
    const n = lancementsSansPrise(id, false)
    return n >= LANCEMENTS_MAX ? issue(1, 'en_cours', `tâche ${id} lancée ${n} fois sans prise : le precheck la mettrait en panne (webhook n8n) et passerait à la suivante`) : null
  }
  const lu = lireEnCours()
  if (lu.invalide) return issue(1, 'en_cours', `fichier de reprise invalide (${lu.invalide}) : le precheck le mettrait de côté`)
  const t = lu.tache
  if (t) {
    if (!briefPermis(t.tache)) return issue(1, 'en_cours', `tâche ${t.id} hors liste dans le fichier de reprise : le precheck la mettrait de côté`)
    if (t.fin_en_attente) return issue(1, 'en_cours', `fin de la tâche ${t.id} en attente : le precheck la rejouerait`)
    if (t.incertaine) return issue(1, 'en_cours', `prise de la tâche ${t.id} incertaine : le precheck la résoudrait`)
    const age = Date.now() - t.maj_le
    if (t.orpheline) return lancementRecent(onglets, t) ? issue(1, 'en_cours', `tâche ${t.id} sans porteur, un agent vient d'être lancé`) : enPanne(t.id) ?? issue(0, 'tache', `tâche ${t.id} sans porteur : lancerait son exécutant`, t.tache)
    if (age < ABANDON_MS) return issue(1, 'en_cours', `tâche ${t.id} (${t.tache}) en cours depuis ${Math.max(0, Math.round(age / MINUTE))} min`)
    if (t.tentatives >= TENTATIVES_MAX) return issue(1, 'en_cours', `tâche ${t.id} figée après ${t.tentatives} reprises : le precheck l'abandonnerait`)
    return enPanne(t.id) ?? issue(0, 'tache', `tâche ${t.id} figée : lancerait son exécutant pour la reprendre`, t.tache)
  }
  if (lancementRecent(onglets, null)) return issue(1, 'en_cours', "un agent vient d'être lancé")
  const p = await lire('peek')
  if (!p) return issue(1, 'vide', 'file vide')
  if (briefPermis(p.tache)) return enPanne(p.id) ?? issue(0, 'tache', `tâche ${p.id} (${p.tache}) en file : lancerait son exécutant`, p.tache)
  return issue(1, 'vide', `tâche ${p.id} hors liste en tête : le precheck l'écarterait`)
}
async function commandePrecheck() {
  ECHEANCE = performance.now() + BUDGET_PRECHECK_MS
  if (args.includes('--a-blanc')) {
    let issue
    try { issue = await deciderABlanc() } catch (e) { issue = { code: 2, etat: 'panne', detail: motifPanne(e) } }
    dire(`ETAT ${issue.etat}\nEXECUTANT ${issue.executant ?? 'aucun'}\nA BLANC : ${issue.detail}`)
    if (issue.code === 2) signaler(`PANNE : ${issue.detail}`)
    return issue.code
  }
  // --reserver=<passage> (le répartiteur) : un « 0 » note aussitôt, sous le même verrou, le lancement à venir ; un second
  // répartiteur ou un passage manuel voit alors « un Hermes vient d'être lancé » : la décision et la réservation sont d'un seul
  // tenant (constat 1).
  const reserve = val('--reserver')
  let issue
  try {
    const r = await avecVerrou(FICHIERS.verrou, { attenteMs: 5000 }, async () => {
      const d = await decider()
      if (d.code === 0 && reserve && PASSAGE.test(reserve)) {
        const liste = lireOnglets().filter((e) => e.passage !== reserve)
        liste.push({ handle: null, passage: reserve, lance_le: Date.now(), executant: d.executant, tache: d.id }) // l'exécutant à lancer et sa tâche, notés sous le même verrou que la décision
        ecrireJson(FICHIERS.onglets, liste.slice(-50))
        if (d.id) noterLancement(d.id, d.executant) // 031-016 (C) : le lancement compte pour sa tâche, sous le même verrou
      }
      return d
    })
    issue = r.occupe ? { code: 1, etat: 'en_cours', detail: 'un autre processus tient la file (verrou) : rien à lancer cette fois', aFermer: [] } : r.valeur
  } catch (e) { issue = { code: 2, etat: 'panne', detail: motifPanne(e), aFermer: [] } }
  noterEtat(issue.etat, issue.detail)
  if (issue.code === 2) { signaler(`PANNE : ${issue.detail}`); noterAlerte(`PANNE : ${issue.detail}`) }
  await lancerNettoyage(issue.aFermer)
  return issue.code
}

// ── --prendre [--passage=<id>] ───────────────────────────────────────────────────────────────────────────────────────────
function afficherTache(t, note) {
  noterPrise(t.id) // 031-016 (C) : prise, la tâche ne compte plus de lancement sans prise
  // le brief vient de la liste blanche locale, jamais du champ « brief » de n8n ; l'id n'a que des chiffres
  dire(`TACHE ${t.id}\ntache : ${t.tache}\nbrief : ${briefPermis(t.tache)}${note ? `\n(${note})` : ''}`)
  return 0
}
// 031-013, revu par 031-016 (audit 031-012, défaut A) : « demande » est l'exécutant TIRÉ DE LA RÉSERVATION du passage
// (onglets-hermes.json, notée par le precheck du répartiteur sous le verrou de la file), jamais du seul --executant ; sans passage,
// c'est « hermes ». Une tâche réservée à l'autre n'est ni montrée ni prise ; si une course en a quand même fait prendre une, elle
// est gardée sans porteur pour le prochain precheck, qui lancera son vrai exécutant. C'est une serrure de bonne foi sur un même
// compte : elle arrête un agent qui suit sa consigne ou se trompe de commande, pas un programme du compte de Benj qui réécrirait
// onglets-hermes.json (la vraie barrière reste côté n8n : 409, et la liste blanche locale).
function autreExecutant(demande, tache) {
  dire(`AUTRE EXECUTANT : la tâche en tête est réservée à ${executantDe(tache)} ; rien n'est pris par ${demande}`)
  return 1
}
async function prendre(passage, demande) {
  let t = await tacheLocale()
  if (t && executantDe(t.tache) !== demande) return autreExecutant(demande, t.tache)
  if (t && passage && t.passage === passage) return afficherTache(t, 'reprise : même passage, la sortie précédente s’est perdue')
  if (t) {
    const age = Date.now() - t.maj_le
    if (!(await coherente(t))) t = null
    else if (age < ABANDON_MS) {
      // 031-016 (défaut D) : portée par un passage connu, elle n'est rendue qu'à lui, même à un appel SANS passage
      if (t.passage && !t.orpheline && passage !== t.passage) {
        dire(`FILE OCCUPEE : la tâche ${t.id} est portée par un autre passage depuis ${Math.max(0, Math.round(age / MINUTE))} min ; rien n'est pris`)
        return 1
      }
      // sans porteur connu (prise par le precheck, sans passage, ancien format) : la même tâche
      if (passage && (!t.passage || t.orpheline)) { t = { ...t, passage, orpheline: false, maj_le: Date.now() }; noterEnCours(t) }
      return afficherTache(t, 'reprise : tâche déjà prise sur ce PC et pas encore rendue')
    } else if (t.tentatives >= TENTATIVES_MAX) { await abandonner(t); t = null }
    else {
      t = { ...t, passage: passage ?? null, orpheline: false, maj_le: Date.now(), tentatives: t.tentatives + 1 }
      noterEnCours(t)
      return afficherTache(t, `reprise n°${t.tentatives} : le passage précédent n'a pas rendu la tâche en 90 min`)
    }
  }
  for (let i = 0; i < 5; i++) {
    const p = await lire('peek')
    if (!p) { dire('FILE VIDE'); return 1 }
    if (briefPermis(p.tache) && executantDe(p.tache) !== demande) return autreExecutant(demande, p.tache) // rien n'est pris
    if (!briefPermis(p.tache)) {
      const r = await lire('prendre')
      if (!r) { dire('FILE VIDE'); return 1 }
      if (briefPermis(r.tache) && executantDe(r.tache) !== demande) { noterEnCours({ ...nouvelle(r, null), orpheline: true }); return autreExecutant(demande, r.tache) }
      if (briefPermis(r.tache)) { const n = nouvelle(r, passage); noterEnCours(n); return afficherTache(n) }
      await ecarter(r)
      continue
    }
    noterEnCours({ ...nouvelle(p, passage), incertaine: true }) // AVANT l'appel : une réponse perdue ne perd plus la tâche
    let r
    try { r = await lire('prendre') } catch (e) {
      if (e instanceof Panne && e.statut === 401) effacer(FICHIERS.enCours) // refusé à l'entrée : rien n'a été pris
      throw e
    }
    if (!r) { effacer(FICHIERS.enCours); dire('FILE VIDE'); return 1 }
    if (!briefPermis(r.tache)) { effacer(FICHIERS.enCours); await ecarter(r); continue }
    if (executantDe(r.tache) !== demande) { noterEnCours({ ...nouvelle(r, null), orpheline: true }); return autreExecutant(demande, r.tache) }
    const n = nouvelle(r, passage)
    noterEnCours(n) // AVANT d'afficher : une sortie perdue ne perd plus la tâche
    return afficherTache(n)
  }
  dire('FILE VIDE (cinq tâches hors liste écartées ; la suite au prochain passage)')
  return 1
}
// 031-016 (A) : l'exécutant d'une prise. Avec un passage : celui de sa réservation (une entrée sans exécutant date d'avant 031-013,
// quand seul Hermes était lancé), ou null si le passage n'est pas réservé (refus). Sans passage : « hermes » (Hermes ouvert à la
// main, qui ne reçoit qu'une tâche que personne ne porte, défaut D).
function executantReserve(passage) {
  if (passage === null) return 'hermes'
  const e = lireOnglets().find((x) => x.passage === passage)
  if (!e) return null
  return e.executant == null ? 'hermes' : EXECUTANTS.includes(e.executant) ? e.executant : null
}
async function commandePrendre() {
  const brut = val('--passage')
  if (brut !== undefined && !PASSAGE.test(brut)) { dire('REFUS : --passage illisible (8 à 64 lettres, chiffres ou tirets)'); return 1 }
  const executant = val('--executant')
  if (executant !== undefined && !EXECUTANTS.includes(executant)) { dire('REFUS : --executant attend hermes ou claude'); return 1 }
  ECHEANCE = performance.now() + 90_000
  const r = await avecVerrou(FICHIERS.verrou, { attenteMs: 30_000 }, () => {
    const reserve = executantReserve(brut ?? null)
    if (!reserve) { dire("REFUS : ce passage n'a pas été réservé par le répartiteur (onglets-hermes.json) ; rien n'est pris"); return 1 }
    if (executant !== undefined && executant !== reserve) { dire(`REFUS : --executant=${executant} ne correspond pas à la réservation du passage (${reserve}) ; rien n'est pris`); return 1 }
    return prendre(brut ?? null, reserve)
  })
  if (r.occupe) throw new Panne('la file est tenue par un autre processus depuis 30 s (verrou) : relancer la même commande')
  return r.valeur
}

// ── --fini : le compte rendu ─────────────────────────────────────────────────────────────────────────────────────────────
// Il part dans n8n puis dans Slack #presti-auto. Garde du réseau neuronal (cerveau/src/garde-contenu.mjs) sur le texte ENTIER,
// PUIS coupe à 300 signes (couper d'abord laissait passer une adresse coupée en deux), balisage Slack neutralisé (constat 10).
// Garde introuvable : le compte rendu est retenu, avec un avertissement ; plus de repli muet.
async function chargerGarde() {
  const chemin = (MODE_BANC && process.env.PRESTI_GARDE_CONTENU) || path.join(path.dirname(RACINE), 'cerveau', 'src', 'garde-contenu.mjs')
  try {
    const m = await import(pathToFileURL(chemin).href)
    if (typeof m.premierInterdit !== 'function') return null
    return { premierInterdit: m.premierInterdit, masquer: typeof m.masquer === 'function' ? m.masquer : null }
  } catch { return null }
}
const ECHAP_SLACK = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
// <!channel>, <@U…>, <#C…>, <url|texte> ne passent plus (& < > échappés, règle de Slack) ; @channel, @here, @everyone non plus.
function couperPourSlack(t, max) {
  const s = t.replace(/@(channel|here|everyone)\b/giu, '＠$1')
  let coupe = ''
  let echappe = ''
  for (const c of s) { // par point de code : un émoji n'est jamais coupé en deux
    const e = ECHAP_SLACK[c] || c
    if (echappe.length + e.length > max) break
    coupe += c
    echappe += e
  }
  return { coupe, echappe }
}
// tout ce qui a la forme d'un jeton : la valeur du fichier du jeton, et toute suite base64url de 32 signes ou plus qui mêle
// majuscules, minuscules et chiffres
function masquerJetons(t) {
  for (const s of aTaire) t = t.split(s).join('[jeton masqué]')
  return t.replace(/[A-Za-z0-9_-]{32,}/g, (m) => (/[A-Z]/.test(m) && /[a-z]/.test(m) && /[0-9]/.test(m) ? '[jeton masqué]' : m))
}
const RETENU_GARDE = 'compte rendu retenu : garde du cerveau introuvable'
export function compteRendu(brut, garde) {
  if (!garde) return { texte: RETENU_GARDE, avertissement: 'garde du cerveau introuvable (cerveau/src/garde-contenu.mjs) : compte rendu retenu' }
  const ligne = (s) => String(s ?? '').normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/[\p{Cc}\s]+/gu, ' ').trim()
  let t = ligne(masquerJetons(ligne(brut)))
  for (let tour = 0; tour < 3; tour++) {
    if (garde.masquer) t = ligne(garde.masquer(t))
    const raison = garde.premierInterdit(t, 'résumé')
    if (raison && !garde.masquer) return { texte: 'compte rendu retenu : la garde du cerveau l’a refusé', avertissement: raison }
    if (raison) continue
    const { coupe, echappe } = couperPourSlack(t, 300)
    if (!garde.premierInterdit(coupe, 'résumé')) return { texte: echappe, avertissement: null }
    t = coupe // la coupe a fait apparaître un motif (un numéro que le signe suivant cachait) : on remasque
  }
  return { texte: 'compte rendu retenu : la garde du cerveau l’a refusé', avertissement: 'résumé refusé par la garde du cerveau, même masqué' }
}
// 031-016 (audit 031-012, défaut F) : la revue hebdomadaire ne se rend « fait » qu'après son vérificateur mécanique, lancé ICI et
// jamais laissé au choix de l'agent (Hermes a truqué la tâche 031-004). Dossier : .orchestre/preuves/revue-<jour de la prise, heure
// de Paris>, ou du jour s'il n'existe pas (le brief dit « date du jour »). Au banc seulement, PRESTI_VERIFICATEUR_REVUE le remplace.
const TACHE_REVUE = 'revue-reseau-neuronal'
const jourParis = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
function verifierRevue(t) {
  const script = (MODE_BANC && process.env.PRESTI_VERIFICATEUR_REVUE) || path.join(RACINE, 'scripts', 'verifier-revue-reseau-neuronal.mjs')
  const dossiers = [...new Set([jourParis(t.pris_le), jourParis(Date.now())])].map((j) => path.join(RACINE, '.orchestre', 'preuves', `revue-${j}`))
  const dossier = dossiers.find((d) => fs.existsSync(d)) ?? dossiers[0]
  try {
    execFileSync(process.execPath, [script, dossier], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120_000, windowsHide: true, cwd: RACINE })
    return { code: 0, dossier }
  } catch (e) { return { code: typeof e?.status === 'number' ? e.status : 'erreur', dossier } }
}
async function commandeFini() {
  const id = idValide(val('--fini'))
  if (!id) { dire('REFUS : --fini <id> attend un identifiant numérique'); return 1 }
  const statut = args.includes('--bloque') ? 'bloque' : 'fait'
  // 031-016 (audit 031-012, défaut B) : --forcer est RETIRÉ, pas seulement noté. Il ne servait qu'à clore une tâche que ce PC
  // n'avait pas prise ; une note dans alertes-file.log n'aurait rien empêché (n'importe quel appelant l'ajoutait). Une tâche portée
  // ailleurs se clôt par son porteur, par l'abandon de n8n (6 h) ou par sa panne (webhook panne). Un usage est refusé ET noté.
  if (args.includes('--forcer')) {
    noterAlerte(`--FORCER REFUSÉ : --fini ${id} demandé avec --forcer, option retirée (031-016) ; rien n'est rendu`)
    dire("REFUS : --forcer n'existe plus (audit 031-012, défaut B) : on ne rend que la tâche prise sur ce PC ; rien n'est rendu")
    return 1
  }
  lireJeton() // tôt : sa valeur sert aussi à la masquer dans le résumé ; illisible → PANNE
  const cr = compteRendu(val('--resume'), await chargerGarde())
  if (cr.avertissement) signaler(`avertissement : ${cr.avertissement}`)
  let revue = null // F : le vérificateur tourne avant le verrou (il peut durer), son verdict est revu sous le verrou
  const avant = lireEnCours().tache
  if (statut === 'fait' && avant && avant.id === id && avant.tache === TACHE_REVUE) {
    revue = verifierRevue(avant)
    if (revue.code !== 0) {
      const rel = path.relative(RACINE, revue.dossier).split(path.sep).join('/')
      noterAlerte(`REVUE REFUSÉE : « fait » demandé pour la tâche ${id}, le vérificateur rend ${revue.code} (${rel})`)
      dire(`REFUS : « fait » refusé pour la revue ${id} : node scripts/verifier-revue-reseau-neuronal.mjs ${rel} rend ${revue.code} ; corrige la revue et relance --fini, ou rends-la --bloque ; rien n'est rendu`)
      return 1
    }
  }
  ECHEANCE = performance.now() + 40_000
  const r = await avecVerrou(FICHIERS.verrou, { attenteMs: 30_000 }, async () => {
    const lu = lireEnCours()
    const t = lu.tache
    if (!t || t.id !== id) { // constat 4 : on ne rend que la tâche prise sur ce PC
      dire(`REFUS : ${t ? `la tâche en cours sur ce PC est ${t.id}, pas ${id}` : `aucune tâche en cours sur ce PC${lu.invalide ? ` (${lu.invalide})` : ''}`} ; rien n'est rendu`)
      return 1
    }
    const lien = Boolean(t && t.id === id)
    if (statut === 'fait' && lien && t.tache === TACHE_REVUE && revue?.code !== 0) { dire(`REFUS : la revue ${id} n'a pas passé son vérificateur ; relance --fini ; rien n'est rendu`); return 1 }
    if (lien) noterEnCours({ ...t, fin_en_attente: { statut, resume: cr.texte, le: Date.now() } }) // une réponse perdue sera rejouée
    const res = await rendre(id, statut, cr.texte, lien ? t.tache : null)
    if (res.etat === 'invalide') {
      if (lien) noterEnCours(t)
      noterAlerte(`FIN REFUSÉE : n8n répond 400 pour la tâche ${id}`)
      dire(`ÉCHEC : n8n a refusé la fin de la tâche ${id} (400) ; rien n'est rendu`)
      return 1
    }
    if (lien) effacer(FICHIERS.enCours)
    if (res.etat === 'rendue') { dire(`TACHE ${id} RENDUE${res.slack ? ` (Slack : ${res.slack})` : ''}`); return 0 }
    noterAlerte(`FIN NON RENDUE : tâche ${id}, n8n répond ${res.code}${lien ? ', fichier de reprise effacé' : ''}`)
    dire(res.etat === 'inconnue'
      ? `TACHE ${id} INCONNUE DE N8N (404) : rien n'est rendu${lien ? ', fichier de reprise effacé' : ''}`
      : `TACHE ${id} REFUSEE PAR N8N (409 : la ligne n'est pas en cours, déjà rendue ?)${lien ? ' ; fichier de reprise effacé' : ''}`)
    return 1
  })
  if (r.occupe) throw new Panne('la file est tenue par un autre processus depuis 30 s (verrou) : relancer la même commande')
  return r.valeur
}

// ── --ajouter, --test, --verifier-jeton, --verifier-409, --nettoyer-onglets ──────────────────────────────────────────────
async function commandeAjouter() {
  const tache = val('--ajouter')
  if (typeof tache !== 'string' || !tache.trim() || tache.length > 120) { dire('REFUS : --ajouter <tache> (1 à 120 signes)'); return 1 }
  ECHEANCE = performance.now() + 30_000
  const r = await appel('POST', 'hermes-tache-ajouter', { tache, brief: val('--brief'), origine: val('--origine') || 'pc' })
  if (r.statut === 401 || r.statut >= 500) throw panneDeStatut(r.statut, 'ajouter')
  if (r.statut !== 201 && r.statut !== 200) { dire(`ÉCHEC : n8n a refusé l'ajout (${r.statut})`); return 1 }
  dire(`AJOUTEE ${idValide(r.json?.id) ?? '?'}`)
  return 0
}
// Les essais écrivent dans la VRAIE file : ils ne tournent que file vide et sans tâche en cours sur ce PC, sous le verrou.
async function surFileVide(nom, fn) {
  ECHEANCE = performance.now() + 120_000
  const r = await avecVerrou(FICHIERS.verrou, { attenteMs: 10_000 }, async () => {
    const lu = lireEnCours()
    if (lu.tache || lu.invalide) { dire(`ÉCHEC : une tâche est en cours sur ce PC (${lu.tache ? `tâche ${lu.tache.id}` : lu.invalide}) ; relancer ${nom} quand elle est rendue`); return 1 }
    const avant = await lire('peek')
    if (avant) { dire(`ÉCHEC : une vraie tâche attend (${nomSur(avant.tache)}) ; relancer ${nom} quand la file est vide`); return 1 }
    return fn()
  })
  if (r.occupe) throw new Panne('la file est tenue par un autre processus (verrou) : relancer plus tard')
  return r.valeur
}
const slackLu = (j) => (typeof j?.slack === 'string' && /^[a-z_]{1,20}$/.test(j.slack) ? j.slack : 'absent')
async function commandeTest() {
  return surFileVide('le test', async () => {
    const echecs = []
    const nom = `essai-031-002-${Date.now()}`
    const a = await appel('POST', 'hermes-tache-ajouter', { tache: nom, brief: 'aucun (essai)', origine: 'test' })
    if (![200, 201].includes(a.statut) || !idValide(a.json?.id)) echecs.push(`ajouter : ${a.statut}`)
    const p = await lire('peek')
    if (!p || p.tache !== nom) echecs.push(`peek : ${p ? 'une autre tâche' : '204'} (l'essai devait attendre seul)`)
    const p1 = await lire('peek')
    if (p1?.id !== p?.id) echecs.push('peek a pris la tâche : il ne doit rien changer')
    let r = await lire('prendre')
    if (r && r.tache !== nom) {
      // une vraie tâche est arrivée entre le premier peek et l'ajout (constat 3c) : ne jamais la perdre
      if (briefPermis(r.tache)) { noterEnCours({ ...nouvelle(r, null), orpheline: true }); echecs.push(`une vraie tâche (${r.id}, ${r.tache}) est arrivée pendant l'essai : prise par erreur, gardée sans porteur pour le prochain precheck`) }
      else { await ecarter(r); echecs.push(`une tâche hors liste (${r.id}) est arrivée pendant l'essai : rendue « bloque »`) }
      r = await lire('prendre')
    }
    if (!r || r.tache !== nom) echecs.push(`prendre : ${r ? 'une autre tâche' : '204'} (l'essai devait revenir)`)
    else {
      const encore = await lire('peek')
      if (encore && encore.id === r.id) echecs.push('une tâche prise est encore proposée')
      const f = await appel('POST', 'hermes-tache-faite', { id: r.id, statut: 'fait', resume: 'essai 031-002' })
      if (f.statut !== 200) echecs.push(`faite : ${f.statut}`)
      // Compte rendu Slack (#presti-auto, tâche 031-006, publiée le 02/11) : n8n doit renvoyer « slack »: « envoye ».
      else if (f.json?.slack !== 'envoye') echecs.push(`compte rendu Slack non envoyé (slack : ${slackLu(f.json)})`)
    }
    if (await lire('peek')) echecs.push("la file n'est pas revenue vide")
    dire(echecs.length ? `ÉCHEC\n- ${echecs.join('\n- ')}` : 'OK : ajouter → peek → prendre → faite, la file est revenue à son état')
    return echecs.length ? 1 : 0
  })
}
async function commandeVerifierJeton() {
  // Preuve du constat 1 de l'audit 031-003 : sans jeton ou avec un faux, les quatre webhooks (panne compris, 031-016) répondent 401 ; avec le bon, la file
  // répond. Rien n'est pris : l'essai d'ajout porte un nom hors liste blanche, écarté au prochain --precheck.
  ECHEANCE = performance.now() + 120_000
  const echecs = []
  const essai = { tache: `essai-jeton-${Date.now()}`, brief: 'aucun (essai)', origine: 'test-jeton' }
  for (const [nom, j] of [['sans jeton', ''], ['faux jeton', 'faux-jeton-de-test']]) {
    const a = await appel('POST', 'hermes-tache-ajouter', essai, { jeton: j })
    if (a.statut !== 401) echecs.push(`ajouter ${nom} : ${a.statut} au lieu de 401`)
    const p = await appel('GET', 'hermes-tache?mode=peek', undefined, { jeton: j })
    if (p.statut !== 401) echecs.push(`lecture ${nom} : ${p.statut} au lieu de 401`)
    const fz = await appel('POST', 'hermes-tache-faite', { id: '0', statut: 'bloque', resume: 'essai du jeton' }, { jeton: j })
    if (fz.statut !== 401) echecs.push(`faite ${nom} : ${fz.statut} au lieu de 401`)
    const pz = await appel('POST', 'hermes-tache-panne', { id: '0', motif: 'essai du jeton', executant: 'hermes' }, { jeton: j }) // 031-016
    if (pz.statut !== 401) echecs.push(`panne ${nom} : ${pz.statut} au lieu de 401`)
  }
  const bon = await appel('GET', 'hermes-tache?mode=peek')
  if (![200, 204].includes(bon.statut)) echecs.push(`lecture avec le jeton : ${bon.statut} au lieu de 200 ou 204`)
  dire(echecs.length ? `ÉCHEC\n- ${echecs.join('\n- ')}` : 'OK : sans jeton et avec un faux, 401 sur les quatre webhooks ; avec le jeton, la file répond')
  return echecs.length ? 1 : 0
}
async function commandeVerifier409() {
  // Preuve de 031-007 : « faite » refuse (409) une ligne a_faire, accepte la ligne prise, refuse de la rendre une seconde fois.
  return surFileVide('la vérification 409', async () => {
    const echecs = []
    const nom = `essai-031-007-${Date.now()}`
    const a = await appel('POST', 'hermes-tache-ajouter', { tache: nom, brief: 'aucun (essai)', origine: 'test-409' })
    const id = [200, 201].includes(a.statut) ? idValide(a.json?.id) : null
    if (!id) echecs.push(`ajouter : ${a.statut}`)
    else {
      const f1 = await appel('POST', 'hermes-tache-faite', { id, statut: 'bloque', resume: 'essai 031-007 : ligne a_faire' })
      if (f1.statut !== 409) echecs.push(`faite sur une ligne a_faire : ${f1.statut} au lieu de 409`)
      else {
        const r = await lire('prendre')
        if (!r || r.id !== id) echecs.push(`prendre : ${r ? 'une autre tâche' : '204'} (l'essai devait revenir)`)
        else {
          const f2 = await appel('POST', 'hermes-tache-faite', { id, statut: 'fait', resume: 'essai 031-007' })
          if (f2.statut !== 200) echecs.push(`faite sur la ligne prise : ${f2.statut} au lieu de 200`)
          const f3 = await appel('POST', 'hermes-tache-faite', { id, statut: 'fait', resume: 'essai 031-007 (rejeu)' })
          if (f3.statut !== 409) echecs.push(`seconde fin de la même ligne : ${f3.statut} au lieu de 409`)
        }
      }
    }
    if (await lire('peek')) echecs.push("la file n'est pas revenue vide")
    dire(echecs.length ? `ÉCHEC\n- ${echecs.join('\n- ')}` : 'OK : « faite » refuse une ligne a_faire et une seconde fin (409), accepte la ligne prise')
    return echecs.length ? 1 : 0
  })
}
async function commandeNettoyer() {
  await nettoyerOnglets(args.filter((a) => a.startsWith('--fermer=')).map((a) => a.slice('--fermer='.length)).filter((h) => HANDLE.test(h)))
  return 0
}

const COMMANDES = [
  ['--precheck', commandePrecheck], ['--prendre', commandePrendre], ['--fini', commandeFini], ['--ajouter', commandeAjouter],
  ['--test', commandeTest], ['--verifier-jeton', commandeVerifierJeton], ['--verifier-409', commandeVerifier409],
  ['--nettoyer-onglets', commandeNettoyer],
]
async function principal() {
  for (const [nom, f] of COMMANDES) if (args.includes(nom)) return f()
  dire('usage : --precheck [--a-blanc] | --prendre [--passage=<id>] [--executant=hermes|claude] | --fini <id> [--bloque] --resume "…" | --ajouter <tache> --brief <chemin> | --test | --verifier-jeton | --verifier-409')
  return 1
}
// importé par le répartiteur (lancer-hermes-file.mjs) : ne s'exécute que lancé directement
const estPrincipal = (() => {
  try {
    const a = fs.realpathSync.native(process.argv[1] || '')
    const b = fs.realpathSync.native(CE_FICHIER)
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
  } catch { return false }
})()
if (estPrincipal) principal().then((c) => { process.exitCode = c }, (e) => { signaler(`PANNE : ${motifPanne(e)}`); process.exitCode = 2 })
