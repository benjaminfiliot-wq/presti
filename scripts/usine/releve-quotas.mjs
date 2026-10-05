#!/usr/bin/env node
// scripts/usine/releve-quotas.mjs — alimente la Salle des machines de la station : un événement `ia_quota` par IA, signé de l'agent
// `usine` (jeton PRESTI_JETON_USINE, par avec-coffre). La station lit le DERNIER `ia_quota` de chaque objet `ia:<nom>`
// (lib/pilotage/station.ts, vue « machines ») : tant qu'aucun n'existe, elle écrit « mesure des IA gratuites absente ».
//
// Constat du 05/10/2026 (conformité E-17) : `ops.jauges` n'est pas la table des quotas d'IA (c'est celle des envois, 0111) ; le relevé
// des IA est celui de surveillance.mjs (releverIa), mais il ne produisait rien : freellmapi n'a pas de route `/api/usage` (404 mesuré
// à chaque passage), aucun fichier `quota-codex.json` n'est écrit par personne, et un événement refusé par le bus était marqué « posé ».
//
// Règle de vérité : on ne publie que ce qu'on SAIT.
//   · ce qui se sonde (freellmapi joignable ? Ollama local : combien de modèles ?) est sondé, et dit seulement ce que la sonde prouve ;
//   · ce qu'un fournisseur a annoncé (Codex épuisé jusqu'à telle date, Ollama Cloud à sec) vient de scripts/usine/quotas-declares.json,
//     daté, avec sa source ; une échéance passée devient « à revérifier », jamais « épuisé » ni « disponible » ;
//   · ce qu'aucune API ne donne (le pourcentage de la fenêtre de 5 h et de la semaine de Claude) est dit « non mesuré ».
// Aucun pourcentage n'est inventé. Aucun secret n'est lu ni écrit : seuls les noms des fournisseurs et des textes courts sortent.
//
// Un événement n'est posé que si son texte change depuis le dernier POST RÉUSSI (l'état local n'est écrit qu'après un 2xx : un bus
// qui refuse ne fait jamais croire que c'est posé). Rien n'écrit de battement : ce n'est pas un cycle de travail.
//
// Usage : node scripts/usine/releve-quotas.mjs [--base=https://prestiapp.fr] [--a-sec] [--journal=DOSSIER] [--declares=FICHIER]
//         [--freellmapi=http://127.0.0.1:3001] [--ollama=http://127.0.0.1:11434] [--maintenant=ISO]
//   --a-sec : imprime ce qui serait posé, n'appelle pas le bus, n'écrit pas l'état.
// Codes : 0 fait ; 1 au moins un POST refusé ; 2 usage (adresse refusée, jeton absent hors --a-sec).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const i = arg.indexOf('=')
  return i < 0 ? [arg.slice(2), true] : [arg.slice(2, i), arg.slice(i + 1)]
}))
const ICI = path.dirname(fileURLToPath(import.meta.url))
const base = options.base || 'https://prestiapp.fr'
const freellmapi = options.freellmapi || 'http://127.0.0.1:3001'
const ollama = options.ollama || 'http://127.0.0.1:11434'
const journal = options.journal || path.join(os.homedir(), 'travail', 'releve-quotas')
const fichierDeclares = options.declares || path.join(ICI, 'quotas-declares.json')
const aSec = options['a-sec'] === true
const maintenant = options.maintenant ? new Date(options.maintenant) : new Date()
const jeton = process.env.PRESTI_JETON_USINE
const JOUR = 86_400_000

function refuser(message) { process.stderr.write(`✗ releve-quotas : ${message}\n`); process.exitCode = 2 }
function adressePermise(adresse, localeSeulement) {
  try {
    const u = new URL(adresse)
    const locale = ['127.0.0.1', 'localhost'].includes(u.hostname)
    if (u.username || u.password || u.pathname.replace(/\//g, '')) return false
    return localeSeulement ? u.protocol === 'http:' && locale : u.protocol === 'https:' || (u.protocol === 'http:' && locale)
  } catch { return false }
}

const dateCourte = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'numeric' }).format(new Date(iso))
const lireJson = (f, defaut) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return defaut } }
const texte = (v, max = 60) => String(v ?? '').replace(/[^\p{L}\p{N} .,:;'’()/%+\-–]/gu, '').slice(0, max)
const valide = (iso) => typeof iso === 'string' && Number.isFinite(Date.parse(iso))

async function sonder(url, delaiMs = 2500) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(delaiMs) })
    return { ok: r.ok, statut: r.status, corps: r.ok ? await r.text().catch(() => '') : '' }
  } catch { return { ok: false, statut: 0, corps: '' } }
}

/** Les lignes à publier : [{ objet, resume }]. Pure hors sondes ; une IA sans fait connu n'a pas de ligne inventée. */
export async function relever({ declares, maintenant: t, freellmapi: adrFl, ollama: adrOl }) {
  const lignes = []
  const d = declares && typeof declares === 'object' ? declares : {}

  // Une IA annoncée : épuisée jusqu'à une échéance, ou épuisée sans échéance, ou sous abonnement sans mesure.
  for (const [nom, libelle] of [['codex', 'Codex'], ['ollama_cloud', 'Ollama Cloud']]) {
    const x = d[nom]
    if (!x || typeof x !== 'object') continue
    const vu = valide(x.vu) ? x.vu : null
    const source = texte(x.source, 50)
    const vuTexte = vu ? `vu le ${dateCourte(vu)}` : 'date de constat inconnue'
    if (x.etat === 'epuise' && valide(x.jusqua)) {
      if (Date.parse(x.jusqua) > t.getTime()) lignes.push({ objet: `ia:${nom}`, resume: `${libelle} · épuisé jusqu'au ${texte(x.jusqua_texte || dateCourte(x.jusqua), 30)} · ${vuTexte}${source ? ` · ${source}` : ''}` })
      else lignes.push({ objet: `ia:${nom}`, resume: `${libelle} · échéance annoncée (${texte(x.jusqua_texte || dateCourte(x.jusqua), 30)}) passée : à revérifier, non mesuré` })
    } else if (x.etat === 'epuise') {
      const ancien = vu && t.getTime() - Date.parse(vu) > JOUR
      lignes.push({ objet: `ia:${nom}`, resume: `${libelle} · quota gratuit épuisé, sans échéance annoncée · ${vuTexte}${ancien ? ' · non revérifié' : ''}` })
    }
  }
  const claude = d.claude
  if (claude && typeof claude === 'object' && claude.etat === 'abonnement') {
    lignes.push({ objet: 'ia:claude', resume: `Claude · abonnement, fenêtre de 5 h et semaine · pourcentage non mesuré (aucune API d'usage)${valide(claude.vu) ? ` · ${dateCourte(claude.vu)}` : ''}`.slice(0, 200) })
  }

  // Ce qui se sonde.
  const fl = await sonder(`${adrFl}/health`)
  lignes.push({ objet: 'ia:freellmapi', resume: fl.ok ? 'freellmapi · joignable · quota par fournisseur non mesuré (aucune route d\'usage publique)' : 'freellmapi · injoignable' })
  const ol = await sonder(`${adrOl}/api/tags`)
  let n = null
  if (ol.ok) { try { const m = JSON.parse(ol.corps)?.models; if (Array.isArray(m)) n = m.length } catch { /* corps illisible */ } }
  lignes.push({ objet: 'ia:ollama', resume: ol.ok ? `Ollama local · joignable${n === null ? '' : ` · ${n} modèle(s)`} · gratuit, sans quota` : 'Ollama local · injoignable' })
  return lignes.map((l) => ({ objet: l.objet, resume: l.resume.slice(0, 200) }))
}

async function poster(ligne) {
  try {
    const r = await fetch(`${base}/api/agents/evenements`, {
      method: 'POST',
      headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'ia_quota', objet: ligne.objet, resume: ligne.resume }),
      signal: AbortSignal.timeout(8000),
    })
    return r.ok ? { ok: true } : { ok: false, statut: r.status }
  } catch (e) { return { ok: false, statut: e?.cause?.code || e?.code || 'reseau' } }
}

async function principal() {
  if (!adressePermise(base, false)) return refuser('adresse du bus interdite')
  if (!adressePermise(freellmapi, true) || !adressePermise(ollama, true)) return refuser('freellmapi et Ollama doivent être sur la boucle locale')
  if (!aSec && !jeton) return refuser('PRESTI_JETON_USINE absent (lancer par avec-coffre.mjs)')
  const lignes = await relever({ declares: lireJson(fichierDeclares, {}), maintenant, freellmapi, ollama })
  const fEtat = path.join(journal, 'etat.json')
  const etat = lireJson(fEtat, {})
  let refus = 0, poses = 0, inchanges = 0
  for (const l of lignes) {
    if (etat[l.objet] === l.resume) { inchanges++; continue }
    if (aSec) { console.log(`à poser : ${l.objet} · ${l.resume}`); continue }
    const r = await poster(l)
    if (r.ok) { etat[l.objet] = l.resume; poses++; console.log(`posé : ${l.objet}`) }
    else { refus++; console.error(`✗ ${l.objet} refusé par le bus (${r.statut}) : sera retenté au prochain passage`) }
  }
  if (!aSec) {
    fs.mkdirSync(journal, { recursive: true })
    fs.writeFileSync(fEtat, JSON.stringify(etat))
  }
  console.log(`${aSec ? 'à sec' : 'fait'} : ${lignes.length} IA relevée(s), ${poses} posée(s), ${inchanges} inchangée(s), ${refus} refusée(s)`)
  process.exitCode = refus ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal()
