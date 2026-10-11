// Moteur payant commun au relais du Chef et au preneur. Aucun secret ni texte de réponse dans les traces.
import fs from 'node:fs'
import path from 'node:path'
import { compacterEntree } from '../modele/chef-leger-entree.mjs'

export const MODELE_HAIKU = 'claude-haiku-5-5'
export const TARIF_ENTREE = 0.10 / 1_000_000
export const TARIF_SORTIE = 0.50 / 1_000_000
const RESERVATION_USD = 0.02 // couvre au plus 100 k jetons d'entrée et 20 k de sortie au tarif normal

export function cleAnthropic() {
  if (process.env.PRESTI_HAIKU_CLE?.trim()) return process.env.PRESTI_HAIKU_CLE.trim()
  const fichier = process.env.PRESTI_HAIKU_CLE_FICHIER || path.resolve('../presti-secrets/anthropic-ecosysteme.txt')
  try { return fs.readFileSync(fichier, 'utf8').trim() || null } catch { return null }
}

export function plafondUsd() {
  const n = Number(process.env.PRESTI_HAIKU_PLAFOND_USD ?? '1')
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function coutUsd(entree, sortie) {
  if (!Number.isSafeInteger(entree) || entree < 0 || !Number.isSafeInteger(sortie) || sortie < 0) return null
  return entree * TARIF_ENTREE + sortie * TARIF_SORTIE
}

// Taille en octets plus stricte que le seuil de 100 k jetons. L'entrée d'état est d'abord compactée.
export function compacterMessages(systeme, utilisateur) {
  let u = String(utilisateur ?? '')
  u = u.replace(/<fichier nom="([^"]*entree[^"]*)">\n([\s\S]*?)\n<\/fichier>/g, (bloc, nom, texte) => {
    try { return `<fichier nom="${nom}">\n${compacterEntree(texte)}\n</fichier>` } catch { return bloc }
  })
  const s = String(systeme ?? '')
  const limite = 85_000 - Buffer.byteLength(s, 'utf8')
  if (limite < 2_000) return null
  if (Buffer.byteLength(u, 'utf8') > limite) {
    const debut = Buffer.from(u, 'utf8').subarray(0, Math.floor(limite * 0.7)).toString('utf8')
    const fin = Buffer.from(u, 'utf8').subarray(-Math.floor(limite * 0.25)).toString('utf8')
    u = `${debut}\n[état intermédiaire omis pour le plafond de contexte]\n${fin}`
  }
  return { systeme: s, utilisateur: u }
}

function fichierCompteur() { return process.env.PRESTI_HAIKU_COMPTEUR || null }
function modifierCompteur(operation) {
  const fichier = fichierCompteur()
  if (!fichier) return false
  const verrou = `${fichier}.lock`
  let fd
  try {
    fs.mkdirSync(path.dirname(fichier), { recursive: true, mode: 0o700 })
    fd = fs.openSync(verrou, 'wx', 0o600)
    const jour = new Date().toISOString().slice(0, 10)
    let etat = { jour, depense: 0, reserve: 0 }
    try { const lu = JSON.parse(fs.readFileSync(fichier, 'utf8')); if (lu.jour === jour && Number.isFinite(lu.depense) && Number.isFinite(lu.reserve)) etat = lu } catch { /* nouveau jour */ }
    const resultat = operation(etat)
    if (resultat === false) return false
    const temporaire = `${fichier}.${process.pid}.tmp`
    fs.writeFileSync(temporaire, JSON.stringify(etat), { mode: 0o600 })
    fs.renameSync(temporaire, fichier)
    return resultat
  } catch { return false } // compteur indisponible : aucun appel payant
  finally { if (fd !== undefined) { fs.closeSync(fd); try { fs.unlinkSync(verrou) } catch { /* verrou conservé : repli sûr */ } } }
}

export function reserverDepense() {
  return modifierCompteur((etat) => {
    if (etat.depense + etat.reserve + RESERVATION_USD > plafondUsd() + 1e-9) return false
    etat.reserve += RESERVATION_USD
    return true
  })
}

export function solderDepense(cout) {
  return modifierCompteur((etat) => {
    etat.reserve = Math.max(0, etat.reserve - RESERVATION_USD)
    // Une réponse sans usage ne peut pas être chiffrée : garde la réservation comme dépense.
    etat.depense += cout === null ? RESERVATION_USD : Math.max(0, cout)
    return true
  })
}

async function journaliserEvenement(agent, entree, sortie, cout, fetchFn) {
  const jeton = process.env[agent === 'preneur' ? 'PRESTI_JETON_PRENEUR' : 'PRESTI_JETON_CHEF']
  if (!jeton) return false
  try {
    const base = process.env.PRESTI_HAIKU_BUS_BASE || 'https://prestiapp.fr'
    const u = new URL('/api/agents/evenements', base)
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && u.hostname === '127.0.0.1')) return false
    const r = await fetchFn(u, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'cout_modele', objet: 'claude_haiku', resume: `claude-haiku-5-5 : ${entree} jetons entrée, ${sortie} jetons sortie, ${cout.toFixed(8)} USD` }), signal: AbortSignal.timeout(10_000) })
    return r.ok
  } catch { return false }
}

/** Rend un résultat borné et assaini ; la réponse HTTP d'erreur n'est jamais journalisée. */
export async function appelerHaiku({ systeme, utilisateur, maxTokens = 4096, signal, fetchFn = fetch, cle = cleAnthropic(), agent = null, fetchJournal = fetch }) {
  if (!cle) return { ok: false, raison: 'cle_absente' }
  const entree = compacterMessages(systeme, utilisateur)
  if (!entree) return { ok: false, raison: 'entree_trop_longue' }
  if (!reserverDepense()) return { ok: false, raison: 'plafond' }
  let cout = null
  try {
    const r = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELE_HAIKU, max_tokens: Math.min(maxTokens, 6000), thinking: { type: 'disabled' }, system: entree.systeme, messages: [{ role: 'user', content: entree.utilisateur }] }),
    })
    if (!r.ok) { cout = 0; return { ok: false, raison: r.status === 429 ? 'quota' : r.status === 404 ? 'modele_inexistant' : r.status === 401 ? 'non_autorise' : 'indisponible' } }
    const j = await r.json()
    cout = coutUsd(j?.usage?.input_tokens, j?.usage?.output_tokens)
    if (cout === null || cout > RESERVATION_USD) return { ok: false, raison: 'usage_invalide' }
    const texte = Array.isArray(j.content) ? j.content.filter((b) => b?.type === 'text').map((b) => b.text).join('') : ''
    if (agent) await journaliserEvenement(agent, j.usage.input_tokens, j.usage.output_tokens, cout, fetchJournal)
    if (!texte.trim()) return { ok: false, raison: 'sortie_vide', entree: j.usage.input_tokens, sortie: j.usage.output_tokens, cout }
    return { ok: true, texte, entree: j.usage.input_tokens, sortie: j.usage.output_tokens, cout }
  } catch { return { ok: false, raison: signal?.aborted ? 'delai' : 'indisponible' } }
  finally { solderDepense(cout) }
}
