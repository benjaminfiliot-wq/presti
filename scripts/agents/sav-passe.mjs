#!/usr/bin/env node
// scripts/agents/sav-passe.mjs — le SAV, côté usine : UNE passe (fiche 026-245, mise en service 026-251).
//
//   node scripts/agents/sav-passe.mjs --une-passe        (lancé par presti-sav.service, toutes les 15 min, sous le compte agents)
//
// Ce que fait une passe, dans l'ordre, et rien d'autre :
//   1. lit le travail du SAV (GET /api/usine/sav/travail) avec le jeton de l'agent `sav` : la route bat pour lui, règle elle-même
//      ce que le code règle seul (aucun client rattaché, remboursement, litige, demande sensible : une carte pour Benj ou rien),
//      et ne rend que les messages qu'un modèle doit lire ;
//   2. pour chacun de ces messages, demande à la route de dépôt (POST /api/usine/sav/brouillon) de décider : elle dépose un
//      brouillon fait d'un gabarit APPROUVÉ, ou une carte « Attention » pour Benj (aucun gabarit approuvé : c'est le cas
//      aujourd'hui, la liste APPROUVES_SAV est vide). Aucune lecture de modèle n'est branchée ici (MOTEUR_DE n'a pas d'entrée
//      `sav`, décision réservée à Claude Code) : la route replie sur le gabarit, donc sur Benj, jamais sur un texte inventé ;
//   3. pose UN événement de passe (POST /api/agents/evenements, type `sav_passe`), des nombres seulement.
//
// « Rien à traiter » est un résultat normal : aucun client payant, aucun message à lire → une lecture, un événement, code 0.
//
// Ce que cette passe ne fait JAMAIS : écrire à un client, à un prospect ou à qui que ce soit (aucune route d'envoi n'est
// appelée, aucun module d'envoi n'est importé : le seul portier est Benj, par la file de brouillons du Poste) ; lire le coffre
// (le jeton et PRESTI_URL arrivent par l'environnement, posés par scripts/usine/avec-coffre.mjs : le coffre partagé porte
// d'autres jetons, sa lecture directe est refusée, leçon de l'atelier du 05/10) ; afficher un texte de message, un nom, une
// adresse ou le jeton (la sortie ne porte que des nombres).
//
// Codes : 0 passe faite (même sans travail, même en pause) ; 1 route en défaut ; 2 usage ; 3 jeton ou PRESTI_URL absent ou invalide.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const TYPE_EVENEMENT = 'sav_passe'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOT_MAX = 20
const DELAI_MS = 20_000
const compte = (n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0)

/** La base du bus : https, sans identifiant ni chemin ; http seulement vers la boucle locale (les jeux d'essai). */
export function baseValide(brute) {
  let u
  try { u = new URL(String(brute ?? '')) } catch { return null }
  if (u.username || u.password || u.pathname !== '/' || u.search || u.hash) return null
  const boucle = u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]'
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && boucle)) return null
  return u.origin
}

/**
 * Une passe. `appeler(methode, chemin, corps)` rend { statut, json } (statut 0 : réseau en défaut) ; le monde est injecté
 * (le jeu d'essai y met un faux bus). Rend { etat, lus, reglees, deposes, erreurs }, etat : 'faite' | 'pause' | 'panne'.
 */
export async function passeSav(appeler) {
  const travail = await appeler('GET', '/api/usine/sav/travail')
  if (travail.statut === 423) return { etat: 'pause', lus: 0, reglees: 0, deposes: 0, erreurs: 0 }
  if (travail.statut !== 200 || !travail.json || typeof travail.json !== 'object') return { etat: 'panne', code: travail.statut, lus: 0, reglees: 0, deposes: 0, erreurs: 0 }
  if (travail.json.pause === true) return { etat: 'pause', lus: 0, reglees: 0, deposes: 0, erreurs: 0 }
  const messages = Array.isArray(travail.json.messages) ? travail.json.messages.slice(0, LOT_MAX) : []
  const reglees = compte(travail.json.reglees_en_code)
  let erreurs = compte(travail.json.erreurs)
  let deposes = 0
  for (const m of messages) {
    const id = m && typeof m === 'object' ? m.id : null
    if (typeof id !== 'string' || !UUID.test(id)) { erreurs += 1; continue }
    // Seul l'identifiant repart : le texte du client reste où il est, et aucune lecture de modèle n'accompagne la demande.
    const r = await appeler('POST', '/api/usine/sav/brouillon', { message_id: id })
    if (r.statut === 423) return { etat: 'pause', lus: messages.length, reglees, deposes, erreurs }
    if (r.statut === 200 && r.json?.ok === true) deposes += 1
    else erreurs += 1
  }
  return { etat: 'faite', lus: messages.length, reglees, deposes, erreurs }
}

function appelDe(base, jeton) {
  return async (methode, chemin, corps) => {
    try {
      const r = await fetch(`${base}${chemin}`, {
        method: methode,
        headers: { authorization: `Bearer ${jeton}`, ...(corps !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: corps !== undefined ? JSON.stringify(corps) : undefined,
        signal: AbortSignal.timeout(DELAI_MS),
      })
      let json = null
      try { json = await r.json() } catch { json = null }
      return { statut: r.status, json }
    } catch { return { statut: 0, json: null } }
  }
}

async function principal() {
  const argv = process.argv.slice(2)
  if (argv.length !== 1 || argv[0] !== '--une-passe') { console.error('usage : sav-passe.mjs --une-passe'); return 2 }
  const base = baseValide(process.env.PRESTI_URL)
  const jeton = process.env.PRESTI_JETON_SAV
  if (!base || !jeton) { console.error('sav : PRESTI_URL (https) et PRESTI_JETON_SAV attendus dans l\'environnement (avec-coffre.mjs) ; rien n\'est lancé'); return 3 }
  const appeler = appelDe(base, jeton)
  const r = await passeSav(appeler)
  if (r.etat === 'panne') { console.error(`sav : la route de travail répond ${r.code || 'rien'} : passe impossible`); return 1 }
  if (r.etat === 'pause') { console.log('sav : en pause, rien à faire'); return 0 }
  const resume = `passe : ${r.lus} à lire, ${r.reglees} réglés en code, ${r.deposes} déposés pour Benj, ${r.erreurs} erreur(s)`
  const e = await appeler('POST', '/api/agents/evenements', { type: TYPE_EVENEMENT, resume })
  console.log(`sav : ${r.lus} message(s) à lire, ${r.reglees} réglé(s) en code, ${r.deposes} déposé(s) pour Benj, ${r.erreurs} erreur(s)${r.lus + r.reglees === 0 ? ' — rien à traiter' : ''}`)
  if (e.statut === 423) return 0
  if (e.statut < 200 || e.statut >= 300) { console.error(`sav : l'événement de passe est refusé (${e.statut || 'réseau'})`); return 1 }
  return r.erreurs > 0 && r.deposes === 0 && r.lus > 0 ? 1 : 0
}

// process.exitCode, jamais process.exit : sur Node 24 (Windows), un exit juste après un fetch plante libuv (async.c:94).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await principal()
