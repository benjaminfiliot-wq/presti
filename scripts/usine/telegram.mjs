#!/usr/bin/env node
// scripts/usine/telegram.mjs — le service du pont Telegram, sur l'usine (fiche 026-195).
//
//   node scripts/usine/avec-coffre.mjs TELEGRAM_BOT_TOKEN PRESTI_JETON_TELEGRAM TELEGRAM_CHAT_ID TELEGRAM_CODE_APPAIRAGE -- \
//        node scripts/usine/telegram.mjs [--service] [--une-passe] [--base=<url>] [--telegram=<url>] [--etat=<fichier>]
//
// Ce que fait ce service, et rien d'autre :
//   · il INTERROGE Telegram (getUpdates, long polling) : il n'ouvre aucun port et n'écoute rien ; l'usine reste fermée ;
//   · il ne traite que les messages de la conversation de Benj (TELEGRAM_CHAT_ID) ; la liste des commandes est fermée :
//     /etat, /pause <motif>, /chef <texte>. Il n'existe aucune commande de reprise : la pause se lève à la station ;
//   · toutes les 60 s il relève /api/agents/telegram/sortie et envoie chaque message au téléphone (texte brut) ;
//   · toutes les 5 min il bat au bus (/api/agents/battement) ;
//   · il ne lit jamais un jeton ailleurs que dans l'environnement et n'en écrit jamais dans un journal, un argv ou etat.json ;
//   · aucune donnée de prospect ne passe ici : la route de sortie ne rend que des textes déjà masqués.
//
// Appairage (TELEGRAM_CHAT_ID = aucun) : seul un message exactement « /start <code> » est écouté, où <code> est
// TELEGRAM_CODE_APPAIRAGE, et seulement pendant les 10 min qui suivent le démarrage ; il écrit UNE ligne « appairage : chat <id> »,
// répond « appairé : Claude Code termine », puis n'écoute plus aucun /start. Tout le reste est ignoré sans réponse ni trace.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// ── Constantes ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SORTIE_MS = 60_000
const BATTEMENT_MS = 5 * 60_000
const FENETRE_APPAIRAGE_MS = 10 * 60_000
const LIMITE_COMMANDES = 20
const FENETRE_COMMANDES_MS = 60 * 60_000
const LONG_POLLING_S = 30
const MAX_TEXTE = 4096
const MAX_PAGES_SORTIE = 5
const ATTENTE_MIN_MS = 10_000
const ATTENTE_MAX_MS = 60_000
const CONSIGNE_MIN = 3
const CONSIGNE_MAX = 200
const ETAT_DEFAUT = '/home/agents/travail/telegram/etat.json'
const AIDE = 'Commandes : /etat (l\'état de l\'équipage), /pause <motif> (coupe tout ; la reprise se fait à la station, jamais depuis ici), /chef <texte> (une consigne au Chef, 3 à 200 signes).'

// ── Arguments et environnement ─────────────────────────────────────────────────────────────────────────────────────
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3)
const drapeau = (nom) => process.argv.includes(`--${nom}`)
const UNE_PASSE = drapeau('une-passe')
const BASE = (arg('base') ?? 'https://prestiapp.fr').replace(/\/+$/, '')
const TELEGRAM = (arg('telegram') ?? 'https://api.telegram.org').replace(/\/+$/, '')
const FICHIER_ETAT = path.resolve(arg('etat') ?? ETAT_DEFAUT)
const JETON_BOT = process.env.TELEGRAM_BOT_TOKEN ?? ''
const JETON_AGENT = process.env.PRESTI_JETON_TELEGRAM ?? ''
const CHAT_ENV = (process.env.TELEGRAM_CHAT_ID ?? '').trim()
const CODE_ENV = (process.env.TELEGRAM_CODE_APPAIRAGE ?? '').trim()
const CHAT = /^-?\d{1,20}$/.test(CHAT_ENV) ? CHAT_ENV : null // « aucun », vide ou illisible : pas de conversation appairée
const CODE_VALIDE = CODE_ENV.length >= 8 && !['epuise', 'aucun'].includes(CODE_ENV)

// ── Journal : une ligne, jamais une valeur secrète ─────────────────────────────────────────────────────────────────
const SECRETS = [JETON_BOT, JETON_AGENT, CODE_ENV, CHAT_ENV, ...JETON_BOT.split(/[:-]/), ...JETON_AGENT.split(/[:-]/)].filter((s) => s && s.length >= 6)
function propre(texte) {
  let t = String(texte)
  for (const s of SECRETS) t = t.split(s).join('‹secret›')
  return t
}
const journal = (message) => console.log(`${new Date().toISOString()} telegram : ${propre(message)}`)
const cause = (e) => `${e?.name ?? 'erreur'}${e?.cause?.code ?? e?.code ? ` ${e.cause?.code ?? e.code}` : ''}`

const urlSure = (u) => /^https:\/\//.test(u) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(u)
if (!urlSure(BASE) || !urlSure(TELEGRAM)) { journal('adresse refusée : https (ou 127.0.0.1) seulement'); process.exit(2) }
if (!JETON_BOT || !JETON_AGENT) { journal('jetons absents de l\'environnement : le service ne démarre pas'); process.exit(2) }

// ── L'état (etat.json) : offset, curseurs de sortie, messages d'une relève déjà envoyés ───────────────────────────────
let etat = { offset: 0, apres_alerte: null, apres_evenement: null, envoyes: [] }
try {
  const lu = JSON.parse(fs.readFileSync(FICHIER_ETAT, 'utf8'))
  if (lu && typeof lu === 'object') etat = { ...etat, ...lu, envoyes: Array.isArray(lu.envoyes) ? lu.envoyes.map(String).slice(-100) : [] }
} catch { /* premier démarrage ou fichier illisible : on repart de zéro */ }
function sauver() {
  const tmp = `${FICHIER_ETAT}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(etat), { mode: 0o600 })
  fs.renameSync(tmp, FICHIER_ETAT)
}

// ── Un seul propriétaire : le verrou sur etat.json ─────────────────────────────────────────────────────────────────
const VERROU = `${FICHIER_ETAT}.lock`
const vivant = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e?.code === 'EPERM' } }
function prendreVerrou() {
  fs.mkdirSync(path.dirname(FICHIER_ETAT), { recursive: true })
  for (let essai = 0; essai < 2; essai++) {
    try {
      const fd = fs.openSync(VERROU, 'wx', 0o600)
      fs.writeSync(fd, String(process.pid)); fs.closeSync(fd)
      return true
    } catch (e) {
      if (e?.code !== 'EEXIST') throw e
      const pid = Number.parseInt(fs.readFileSync(VERROU, 'utf8'), 10)
      if (Number.isInteger(pid) && pid !== process.pid && vivant(pid)) return false
      try { fs.unlinkSync(VERROU) } catch { /* pris entre-temps */ }
    }
  }
  return false
}
function libererVerrou() { try { if (Number.parseInt(fs.readFileSync(VERROU, 'utf8'), 10) === process.pid) fs.unlinkSync(VERROU) } catch { /* déjà parti */ } }

// ── Les appels réseau ──────────────────────────────────────────────────────────────────────────────────────────────
async function appeler(url, { methode = 'GET', corps, entetes = {}, delai = 15_000 } = {}) {
  const r = await fetch(url, {
    method: methode,
    headers: { ...(corps === undefined ? {} : { 'content-type': 'application/json' }), ...entetes },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal: AbortSignal.timeout(delai),
  })
  let json = null
  try { json = await r.json() } catch { /* corps vide ou illisible */ }
  return { statut: r.status, json }
}
const presti = (chemin, options = {}) => appeler(`${BASE}${chemin}`, { ...options, entetes: { authorization: `Bearer ${JETON_AGENT}` } })
const telegram = (methode, corps, delai) => appeler(`${TELEGRAM}/bot${JETON_BOT}/${methode}`, { methode: 'POST', corps, delai })

/** Un message au téléphone : texte brut, sans aperçu de lien, 4 096 signes au plus. Rend true si Telegram l'a pris. */
async function envoyer(chat, texte) {
  let t = String(texte ?? '')
  if (t.length > MAX_TEXTE) t = t.slice(0, MAX_TEXTE).replace(/[\uD800-\uDBFF]$/, '')
  if (!t.trim()) return true
  try {
    const r = await telegram('sendMessage', { chat_id: chat, text: t, disable_web_page_preview: true }, 20_000)
    if (r.statut !== 200 || r.json?.ok !== true) { journal(`sendMessage refusé (statut ${r.statut})`); return false }
    return true
  } catch (e) { journal(`sendMessage impossible (${cause(e)})`); return false }
}

// ── Les commandes de Benj ──────────────────────────────────────────────────────────────────────────────────────────
const commandesRecentes = []
function quotaCommandes() {
  const maintenant = Date.now()
  while (commandesRecentes.length && maintenant - commandesRecentes[0] >= FENETRE_COMMANDES_MS) commandesRecentes.shift()
  if (commandesRecentes.length >= LIMITE_COMMANDES) return false
  commandesRecentes.push(maintenant)
  return true
}

function lireCommande(texte) {
  const m = /^\/([A-Za-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(String(texte ?? '').trim())
  if (!m) return null
  return { nom: m[1].toLowerCase(), reste: (m[2] ?? '').trim() }
}

const nombre = (x) => (Number.isInteger(x) && x >= 0 ? x : '?')
function dire(statut, json, succes) {
  if (statut >= 200 && statut < 300) return succes
  return `Échec (statut ${statut}${typeof json?.code === 'string' && /^[a-z0-9_:]{1,50}$/.test(json.code) ? `, ${json.code}` : ''}). Rien n'a été changé.`
}

async function commande(chat, c) {
  if (!quotaCommandes()) return envoyer(chat, `Trop de commandes : ${LIMITE_COMMANDES} par heure au plus. Réessayez plus tard.`)
  try {
    if (c.nom === 'etat') {
      const r = await presti('/api/agents/telegram/entree', { methode: 'POST', corps: { commande: 'etat' } })
      const j = r.json ?? {}
      return envoyer(chat, dire(r.statut, j, `État · pause générale : ${j.pause === true ? 'ACTIVE' : 'non'} · rouge ${nombre(j.rouge)} · orange ${nombre(j.orange)} · appels à rendre ${nombre(j.appels)} · agents en panne ${nombre(j.en_panne)}`))
    }
    if (c.nom === 'pause') {
      const r = await presti('/api/agents/telegram/entree', { methode: 'POST', corps: { commande: 'pause', motif: c.reste || 'sans motif' } })
      return envoyer(chat, dire(r.statut, r.json, 'Pause générale posée : plus rien ne sort. La reprise se fait à la station.'))
    }
    const r = await presti('/api/agents/telegram/entree', { methode: 'POST', corps: { commande: 'consigne', texte: c.reste } })
    return envoyer(chat, dire(r.statut, r.json, 'Consigne transmise au Chef.'))
  } catch (e) {
    journal(`commande ${c.nom} : Presti injoignable (${cause(e)})`)
    return envoyer(chat, 'Presti ne répond pas : la commande n\'a pas abouti. Réessayez dans un moment.')
  }
}

// ── L'appairage ────────────────────────────────────────────────────────────────────────────────────────────────────
const DEMARRE = Date.now()
let appaire = false
const egaux = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y) }
async function tenterAppairage(message) {
  if (CHAT !== null || appaire || !CODE_VALIDE) return
  if (Date.now() - DEMARRE > FENETRE_APPAIRAGE_MS) return
  if (message.chat?.type !== 'private' || typeof message.text !== 'string' || !message.text.startsWith('/start ')) return
  if (!egaux(message.text.slice('/start '.length), CODE_ENV)) return
  const id = String(message.chat.id)
  if (!/^-?\d{1,20}$/.test(id)) return
  appaire = true
  console.log(`${new Date().toISOString()} telegram : appairage : chat ${id}`)
  await envoyer(id, 'appairé : Claude Code termine')
}

// ── Les mises à jour de Telegram ───────────────────────────────────────────────────────────────────────────────────
async function traiter(update) {
  const id = Number(update?.update_id)
  if (!Number.isSafeInteger(id) || id < etat.offset) return // déjà acquitté (même rejoué) : jamais un second effet
  etat.offset = id + 1
  sauver() // l'acquittement d'abord : une commande ne s'exécute jamais deux fois
  const message = update.message
  if (!message || typeof message !== 'object') return
  if (CHAT === null) return tenterAppairage(message)
  if (String(message.chat?.id) !== CHAT) return // toute autre conversation : silence, aucune trace
  const c = lireCommande(message.text)
  if (!c || !['etat', 'pause', 'chef'].includes(c.nom)) return void (await envoyer(CHAT, AIDE))
  if (c.nom === 'chef' && (c.reste.length < CONSIGNE_MIN || c.reste.length > CONSIGNE_MAX)) return void (await envoyer(CHAT, `Consigne refusée : de ${CONSIGNE_MIN} à ${CONSIGNE_MAX} signes. Exemple : /chef fais le point ce soir`))
  await commande(CHAT, c)
}

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))
async function relever(timeout) {
  const corps = { timeout, allowed_updates: ['message'] }
  if (etat.offset > 0) corps.offset = etat.offset
  const r = await telegram('getUpdates', corps, (timeout + 15) * 1000)
  if (r.statut !== 200 || r.json?.ok !== true || !Array.isArray(r.json.result)) throw Object.assign(new Error('getUpdates'), { name: `statut ${r.statut}` })
  for (const u of r.json.result) await traiter(u)
}
async function boucleCommandes() {
  let attente = 0
  for (;;) {
    try { await relever(LONG_POLLING_S); attente = 0 } catch (e) {
      journal(`getUpdates impossible (${cause(e)})`)
      attente = Math.min(attente ? attente * 2 : ATTENTE_MIN_MS, ATTENTE_MAX_MS)
      await dormir(attente)
    }
  }
}

// ── La sortie : Presti vers le téléphone ───────────────────────────────────────────────────────────────────────────────
let sortieEnCours = false
async function releverSortie() {
  if (CHAT === null || sortieEnCours) return // sans conversation, personne à qui parler
  sortieEnCours = true
  try {
    for (let page = 0; page < MAX_PAGES_SORTIE; page++) {
      const q = new URLSearchParams()
      if (etat.apres_alerte !== null && etat.apres_alerte !== undefined) q.set('apres_alerte', String(etat.apres_alerte))
      if (etat.apres_evenement !== null && etat.apres_evenement !== undefined) q.set('apres_evenement', String(etat.apres_evenement))
      const r = await presti(`/api/agents/telegram/sortie${q.size ? `?${q}` : ''}`)
      if (r.statut !== 200 || !Array.isArray(r.json?.messages)) { journal(`sortie : Presti a répondu ${r.statut}`); return }
      const messages = r.json.messages
      for (const m of messages) {
        const cle = String(m?.id ?? '')
        if (!cle || etat.envoyes.includes(cle)) continue
        if (!(await envoyer(CHAT, m.texte))) return // Telegram refuse : les curseurs restent, la relève suivante reprend ici
        etat.envoyes = [...etat.envoyes, cle].slice(-100)
        sauver()
      }
      etat.apres_alerte = r.json.apres_alerte ?? etat.apres_alerte
      etat.apres_evenement = r.json.apres_evenement ?? etat.apres_evenement
      etat.envoyes = []
      sauver()
      if (messages.length < 20) return
    }
  } catch (e) { journal(`sortie impossible (${cause(e)})`) } finally { sortieEnCours = false }
}

async function battre() {
  try {
    const r = await presti('/api/agents/battement', { methode: 'POST' })
    if (r.statut !== 200) journal(`battement : Presti a répondu ${r.statut}`)
  } catch (e) { journal(`battement impossible (${cause(e)})`) }
}

// ── Démarrage ──────────────────────────────────────────────────────────────────────────────────────────────────────
if (!prendreVerrou()) { journal('un autre processus tient etat.json : celui-ci se retire'); process.exit(0) }
process.on('exit', libererVerrou)
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => process.exit(0))

if (UNE_PASSE) {
  try { await relever(0) } catch (e) { journal(`getUpdates impossible (${cause(e)})`) }
  await releverSortie()
  await battre()
  process.exit(0)
} else {
  journal(CHAT === null ? (CODE_VALIDE ? 'démarré, en attente d\'appairage (10 min)' : 'démarré sans conversation appairée : muet') : 'démarré')
  setInterval(() => { void releverSortie() }, SORTIE_MS)
  setInterval(() => { void battre() }, BATTEMENT_MS)
  await boucleCommandes()
}
