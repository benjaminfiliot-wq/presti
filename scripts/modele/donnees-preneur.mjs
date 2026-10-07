#!/usr/bin/env node
// scripts/modele/donnees-preneur.mjs — les données d'entraînement du modèle maison « presti-preneur » (docs/agents/modele-maison-preneur.md), par distillation.
//
// Le contrat : ENTRÉE = exactement ce que le preneur de l'usine envoie à son modèle (construireConsigne de scripts/usine/preneur.mjs : sa consigne système et
// son message, passages du Savoir compris) ; SORTIE = la réponse idéale, écrite par un modèle FORT gratuit (freellmapi) à qui l'on ajoute, à lui seul, une
// consigne de qualité stricte (CONSIGNE_MAITRE), puis FILTRÉE par les gardes du preneur et les nôtres (preneur-gardes.mjs : aucun nombre absent des sources,
// aucune promesse non prouvée, français, résumé en première ligne, passages cités). La paire gardée porte la consigne du preneur, pas celle du maître :
// le petit modèle apprend à faire, avec le prompt de production, ce que le gros faisait avec des règles en plus.
//
// Aucune donnée de prospect ne part chez le modèle gratuit : chaque envoi passe d'abord fauteEntree (garde-prospects + motifs propres + noms des prospects
// connus) ; tout ce qui est envoyé est journalisé (envois.jsonl, local) pour que le juge le relise (scripts/modele-preneur-donnees-qa.mjs).
//
// Usage :
//   node scripts/modele/donnees-preneur.mjs                       construit les entrées, relit le cache, écrit donnees.jsonl (aucun appel réseau)
//   node scripts/modele/donnees-preneur.mjs --distiller [--max-envois=400] [--concurrence=2] [--modeles=gemini-3.8-flash,gpt-oss-120b]
//                                                                 appelle le maître pour les entrées sans réponse gardée (reprend où il s'est arrêté)
//   node scripts/modele/donnees-preneur.mjs --exporter-maitre     écrit les entrées sans réponse gardée pour le maître sur Kaggle (kaggle-preneur.mjs --maitre-*)
//   node scripts/modele/donnees-preneur.mjs --importer-maitre     verse ses réponses (maitre-kaggle/sortie/sorties.jsonl) dans le cache, puis refait les paires
//   code 0 : écrit ; code 1 : moins de 200 paires gardées ; code 3 : le maître est à bout (quota), relancer plus tard.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { construireConsigne, refuserTache } from '../usine/preneur.mjs'
import { hasard } from './donnees-chef-leger.mjs'
import { tachesEntrainement, EPREUVE } from './preneur-taches.mjs'
import { DEPOT, indexCorpus, fichiersCorpus, passagesLocaux, fauteEntree, fautesSortie, nomsProspects } from './preneur-gardes.mjs'

export const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'modele-maison', 'preneur')
export const F_DONNEES = path.join(TRAVAIL, 'donnees.jsonl')
export const F_CACHE = path.join(TRAVAIL, 'sorties-maitre.jsonl')
export const F_ENVOIS = path.join(TRAVAIL, 'envois.jsonl')
export const F_EPREUVE = path.join(TRAVAIL, 'epreuve.jsonl')
const COFFRE_FL = path.resolve(DEPOT, '..', 'presti-secrets', 'freellmapi.txt')
const BASE_FL = 'http://127.0.0.1:3001/v1'
export const MIN_PAIRES = 200
export const ESSAIS_MAX = 3
const ID_FIXE = '00000000-0000-4000-8000-000000000000'
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** La consigne de qualité donnée au seul maître (jamais dans les paires). */
export const CONSIGNE_MAITRE = [
  'EXIGENCES DE QUALITÉ (ta réponse est relue par un programme ; une seule faute la fait rejeter) :',
  '- Français correct, ton direct, phrases courtes. Aucune formule d’introduction ni de conclusion, aucune question au lecteur.',
  '- Première ligne : une phrase de résumé de 140 signes au plus, sans titre ni symbole Markdown. Ensuite le livrable lui-même, prêt à l’emploi, en Markdown simple. 1 600 signes au plus en tout.',
  '- CHIFFRES : n’écris AUCUN nombre (prix, pourcentage, délai, durée, quantité, note, ventes, vues, signes, minutage) qui ne figure pas tel quel dans la tâche ou dans les extraits. Pour un chiffre utile mais absent, écris « à mesurer ». Les nombres de 1 à 10 servent seulement à compter et à numéroter. Dans un script, découpe en « Plan 1, Plan 2… » sans minutage inventé.',
  '- PROMESSES : aucune promesse que les extraits ne prouvent pas : pas de « garanti » (sauf la garantie légale si un extrait la cite), « meilleur », « n°1 », « 100 % », « sans risque », « livraison rapide » ou « gratuite », « puissant », « ultra », « professionnel », « certifié ». Décris l’usage, pas une performance.',
  '- SOURCES : après chaque fait repris d’un extrait, mets son numéro entre crochets, par exemple [2]. N’utilise jamais de crochets numérotés sans extrait. Ce que les extraits ne disent pas : « à vérifier : quoi, et où le vérifier ».',
  '- Le livrable s’adresse à son vrai lecteur (acheteur, spectateur, artisan) : n’y mets jamais nos données internes (ventes mesurées, demande TikTok, marges, prix fournisseur) sauf si la tâche les demande.',
  '- Aucun nom de personne réelle, aucune coordonnée, aucune entreprise tierce nommée (Léa, personnage généré par IA, est permise).',
  '- Si la tâche exige une donnée du jour (prix en ligne, avis, commentaires, statistiques récentes, message reçu) ou le contenu d’un fichier ou d’un site qu’aucun extrait ne donne, réponds seulement par une ligne « IMPOSSIBLE : <la raison en une phrase> ». Sinon, fais le travail.',
].join('\n')

/**
 * Le corpus FIGÉ : d'autres sessions écrivent dans docs/ ; sans copie figée, les passages changeraient d'un jour à l'autre, les entrées ne
 * correspondraient plus au cache du maître et le juge ne pourrait plus refaire les données. La première exécution copie les fichiers du corpus ici ;
 * `--refiger` la refait (les entrées changent alors : il faut redistiller).
 */
export const CORPUS_FIGE = path.join(TRAVAIL, 'corpus')
export function figerCorpus({ refaire = false } = {}) {
  if (fs.existsSync(CORPUS_FIGE) && !refaire) return
  for (const f of fichiersCorpus(DEPOT)) {
    fs.mkdirSync(path.dirname(path.join(CORPUS_FIGE, f)), { recursive: true })
    fs.copyFileSync(path.join(DEPOT, f), path.join(CORPUS_FIGE, f))
  }
}

/** Les entrées : une par tâche (avec passages du Savoir), plus une variante SANS Savoir pour une tâche sur quatre (le Savoir peut manquer en production). Pure. */
export function construireEntrees({ graine = 20261007, epreuve = false } = {}) {
  if (!fs.existsSync(CORPUS_FIGE)) throw new Error(`corpus figé absent (${CORPUS_FIGE}) : node scripts/modele/donnees-preneur.mjs le crée`)
  const { index } = indexCorpus(CORPUS_FIGE)
  const noms = nomsProspects()
  const h = hasard(graine)
  const taches = epreuve ? EPREUVE.map((t) => ({ ...t, origine: 'epreuve' })) : tachesEntrainement()
  const entrees = [], refusees = []
  for (const t of taches) {
    const variantes = epreuve ? [true] : (h.p(0.25) ? [true, false] : [true])
    for (const savoir of variantes) {
      const refus = refuserTache({ ...t, id: ID_FIXE })
      if (refus) { refusees.push({ id: t.id, motif: `refuserTache : ${refus}` }); continue }
      const passages = savoir ? passagesLocaux(index, t.objet, noms) : []
      const consigne = construireConsigne(t, passages)
      const faute = fauteEntree(`${consigne.systeme}\n${consigne.utilisateur}`, noms)
      if (faute) { refusees.push({ id: t.id, motif: `entrée : ${faute}` }); continue }
      entrees.push({ cle: sha(`${consigne.systeme}\n${consigne.utilisateur}`), id: `${t.id}${savoir ? '' : '-sans-savoir'}`, origine: t.origine, attendu: t.attendu, nPassages: passages.length, systeme: consigne.systeme, utilisateur: consigne.utilisateur })
    }
  }
  return { entrees, refusees }
}

const lireJsonl = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) } catch { return [] } }
const sansReflexion = (s) => String(s ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
/**
 * La seule retouche permise d'une réponse du maître, sans rien changer à son texte : sans <think>, et une première ligne trop longue coupée après sa
 * première phrase (si celle-ci fait 8 à 140 signes) ; le reste de la ligne passe au paragraphe suivant. Le juge refait la même retouche. Pure.
 */
export function mettreEnForme(sortie) {
  const t = sansReflexion(sortie)
  const lignes = t.split('\n')
  const i = lignes.findIndex((l) => l.trim())
  if (i < 0) return t
  const l = lignes[i]
  if ([...l.replace(/^[#>*\-\s]+/, '').trim()].length <= 140) return t
  const m = /^(.{8,140}?[.!?])\s+(\S[\s\S]*)$/u.exec(l)
  if (!m || [...m[1].replace(/^[#>*\-\s]+/, '').trim()].length > 140) return t
  lignes.splice(i, 1, m[1], '', m[2])
  return lignes.join('\n')
}

/** Les paires : pour chaque entrée, la première réponse du cache qui passe TOUTES les gardes (recalculées ici, jamais lues du cache). Pure. */
export function construirePaires(entrees, cache) {
  const noms = nomsProspects()
  const parCle = new Map()
  for (const c of cache) { if (!parCle.has(c.cle)) parCle.set(c.cle, []); parCle.get(c.cle).push(c) }
  const paires = [], rejets = {}, vus = new Set()
  let sansReponse = 0
  for (const e of entrees) {
    const essais = parCle.get(e.cle) || []
    if (!essais.length) { sansReponse++; continue }
    let gardee = null, derniere = null
    for (const c of essais) {
      const f = fautesSortie(e, mettreEnForme(c.sortie), { attendu: e.attendu, nPassages: e.nPassages, noms })
      if (!f.length) { gardee = c; break }
      derniere = f
    }
    if (!gardee) { const k = String(derniere[0]).replace(/ : .*/, ''); rejets[k] = (rejets[k] || 0) + 1; continue }
    if (vus.has(e.utilisateur)) continue
    vus.add(e.utilisateur)
    paires.push({ messages: [{ role: 'system', content: e.systeme }, { role: 'user', content: e.utilisateur }, { role: 'assistant', content: mettreEnForme(gardee.sortie) }], _meta: { id: e.id, origine: e.origine, attendu: e.attendu, modele: gardee.modele } })
  }
  return { paires, rejets, sansReponse }
}

// ── le maître (freellmapi) ─────────────────────────────────────────────────────────────────────────────────────────────
export function cleFL() {
  const k = fs.readFileSync(COFFRE_FL, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0].trim()
  if (!k) throw new Error('coffre freellmapi vide')
  return k
}
export async function appelerMaitre(modele, messages, cle) {
  let r
  try {
    r = await fetch(`${BASE_FL}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
      body: JSON.stringify({ model: modele, temperature: 0.4, max_tokens: 2500, messages }), signal: AbortSignal.timeout(180_000) })
  } catch (e) { return { erreur: `réseau : ${e.name}` } }
  let j = null
  try { j = await r.json() } catch { j = null }
  if (r.status === 429 || j?.error?.type === 'rate_limit_error') return { quota: true, jusqua: Number(j?.error?.retryAtMs) || Date.now() + 15 * 60_000 }
  if (!r.ok) return { erreur: `statut ${r.status} ${String(j?.error?.message ?? '').slice(0, 120)}` }
  const contenu = j?.choices?.[0]?.message?.content
  if (typeof contenu !== 'string' || !contenu.trim()) return { erreur: 'réponse vide' }
  return { sortie: sansReflexion(contenu), modeleReel: j.model || modele }
}

async function distiller(entrees, { maxEnvois, concurrence, modeles }) {
  const cle = cleFL()
  const noms = nomsProspects()
  const cache = lireJsonl(F_CACHE)
  const bonnes = new Set()
  const essais = new Map()
  for (const c of cache) { essais.set(c.cle, (essais.get(c.cle) || 0) + 1); const e = entrees.find((x) => x.cle === c.cle); if (e && !fautesSortie(e, mettreEnForme(c.sortie), { attendu: e.attendu, nPassages: e.nPassages, noms }).length) bonnes.add(c.cle) }
  // au plus ESSAIS_MAX essais par entrée (chacun reçoit la liste des fautes du précédent)
  const file = entrees.filter((e) => !bonnes.has(e.cle) && (essais.get(e.cle) || 0) < ESSAIS_MAX)
  const aBout = new Map()
  let envois = 0, gardees = 0, quota = false
  console.log(`à distiller : ${file.length} entrées (${bonnes.size} déjà gardées) · modèles ${modeles.join(', ')}`)
  const suivante = () => file.shift()
  async function ouvrier() {
    for (let e = suivante(); e; e = suivante()) {
      if (envois >= maxEnvois) return
      const precedents = cache.filter((c) => c.cle === e.cle)
      const retour = precedents.length ? fautesSortie(e, mettreEnForme(precedents.at(-1).sortie), { attendu: e.attendu, nPassages: e.nPassages, noms }) : []
      const systeme = `${e.systeme}\n\n${CONSIGNE_MAITRE}${retour.length ? `\n\nUNE RÉPONSE PRÉCÉDENTE A ÉTÉ REJETÉE POUR : ${retour.join(' ; ')}. Corrige ces points.` : ''}`
      const messages = [{ role: 'system', content: systeme }, { role: 'user', content: e.utilisateur }]
      // la garde d'entrée, une seconde fois, sur le texte exact qui part
      const faute = fauteEntree(`${systeme}\n${e.utilisateur}`, noms)
      if (faute) { console.log(`  ✗ ${e.id} : entrée refusée (${faute}), rien envoyé`); continue }
      let fait = false
      for (const m of modeles) {
        if ((aBout.get(m) || 0) > Date.now()) continue
        envois++
        fs.appendFileSync(F_ENVOIS, JSON.stringify({ le: new Date().toISOString(), cle: e.cle, id: e.id, modele: m, messages }) + '\n')
        const r = await appelerMaitre(m, messages, cle)
        if (r.quota) { aBout.set(m, r.jusqua); continue }
        if (r.erreur) { console.log(`  · ${e.id} : ${m} ${r.erreur}`); continue }
        const ligne = { le: new Date().toISOString(), cle: e.cle, id: e.id, modele: r.modeleReel, demande: m, essai: precedents.length + 1, sortie: r.sortie }
        cache.push(ligne)
        fs.appendFileSync(F_CACHE, JSON.stringify(ligne) + '\n')
        const f = fautesSortie(e, mettreEnForme(r.sortie), { attendu: e.attendu, nPassages: e.nPassages, noms })
        if (!f.length) gardees++
        else if (precedents.length + 1 < ESSAIS_MAX) file.push(e) // un second essai, avec les fautes
        console.log(`  ${f.length ? '✗' : '✓'} ${e.id} (${r.modeleReel}, essai ${precedents.length + 1})${f.length ? ` : ${f.slice(0, 2).join(' ; ').slice(0, 160)}` : ''}`)
        fait = true
        break
      }
      if (!fait && modeles.every((m) => (aBout.get(m) || 0) > Date.now())) {
        quota = true
        const t = Math.min(...modeles.map((m) => aBout.get(m)))
        console.log(`  ⏸ maître à bout jusqu'à ${new Date(t).toISOString().slice(11, 16)} UTC : arrêt (relancer --distiller ensuite)`)
        file.length = 0
        return
      }
    }
  }
  await Promise.all(Array.from({ length: concurrence }, ouvrier))
  console.log(`envois : ${envois} · nouvelles réponses gardées : ${gardees}`)
  return { quota }
}

// ── le maître sur Kaggle (quand freellmapi et Ollama Cloud sont à bout) ───────────────────────────────────────────────────
// Les entrées sans réponse gardée partent, avec la consigne du maître (et les fautes de la dernière réponse, s'il y en a une), dans un dataset PRIVÉ
// que lit scripts/modele/kaggle/preneur-maitre.py ; chacune repasse la garde d'entrée et est journalisée dans envois.jsonl comme un envoi au maître.
export const D_MAITRE = path.join(TRAVAIL, 'maitre-kaggle')
function exporterMaitre(entrees) {
  const noms = nomsProspects()
  const cache = lireJsonl(F_CACHE)
  const restantes = entrees.filter((e) => !cache.some((c) => c.cle === e.cle && !fautesSortie(e, mettreEnForme(c.sortie), { attendu: e.attendu, nPassages: e.nPassages, noms }).length))
  fs.mkdirSync(path.join(D_MAITRE, 'dataset'), { recursive: true })
  const lignes = []
  let refusees = 0
  for (const e of restantes) {
    const derniere = cache.filter((c) => c.cle === e.cle).at(-1)
    const retour = derniere ? fautesSortie(e, mettreEnForme(derniere.sortie), { attendu: e.attendu, nPassages: e.nPassages, noms }) : []
    const systeme = `${e.systeme}\n\n${CONSIGNE_MAITRE}${retour.length ? `\n\nUNE RÉPONSE PRÉCÉDENTE A ÉTÉ REJETÉE POUR : ${retour.join(' ; ')}. Corrige ces points.` : ''}`
    if (fauteEntree(`${systeme}\n${e.utilisateur}`, noms)) { refusees++; continue }
    const messages = [{ role: 'system', content: systeme }, { role: 'user', content: e.utilisateur }]
    lignes.push(JSON.stringify({ cle: e.cle, id: e.id, messages }))
    fs.appendFileSync(F_ENVOIS, JSON.stringify({ le: new Date().toISOString(), cle: e.cle, id: e.id, modele: 'kaggle:maitre', messages }) + '\n')
  }
  fs.writeFileSync(path.join(D_MAITRE, 'dataset', 'entrees-maitre.jsonl'), lignes.join('\n') + '\n')
  console.log(`maître Kaggle : ${lignes.length} entrées exportées (${refusees} refusées par la garde) → ${path.join(D_MAITRE, 'dataset')}`)
}
function importerMaitre() {
  const f = path.join(D_MAITRE, 'sortie', 'sorties.jsonl')
  const brut = fs.readFileSync(f, 'utf8')
  const empreinte = sha(brut)
  const deja = path.join(D_MAITRE, 'importes.txt')
  if (fs.existsSync(deja) && fs.readFileSync(deja, 'utf8').includes(empreinte)) { console.log('maître Kaggle : ces sorties sont déjà importées'); return }
  let n = 0
  for (const l of brut.split('\n').filter(Boolean)) {
    const o = JSON.parse(l)
    o.sorties.forEach((s, k) => {
      if (typeof s !== 'string' || !s.trim()) return
      fs.appendFileSync(F_CACHE, JSON.stringify({ le: new Date().toISOString(), cle: o.cle, id: o.id, modele: `kaggle:${o.modele}`, demande: 'kaggle', essai: k + 1, sortie: sansReflexion(s) }) + '\n')
      n++
    })
  }
  fs.appendFileSync(deja, `${empreinte}\n`)
  console.log(`maître Kaggle : ${n} réponses importées dans le cache`)
}

function ecrire(paires, entrees, refusees, rejets, sansReponse) {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  fs.writeFileSync(F_DONNEES, paires.map((p) => JSON.stringify({ messages: p.messages })).join('\n') + (paires.length ? '\n' : ''))
  const origines = {}, modeles = {}
  for (const p of paires) { origines[p._meta.origine] = (origines[p._meta.origine] || 0) + 1; modeles[p._meta.modele] = (modeles[p._meta.modele] || 0) + 1 }
  const meta = { le: new Date().toISOString(), entrees: entrees.length, entrees_refusees: refusees.length, paires: paires.length, sans_reponse: sansReponse, rejets, origines, modeles, impossibles: paires.filter((p) => p._meta.attendu === 'impossible').length, sans_savoir: paires.filter((p) => p._meta.id.endsWith('-sans-savoir')).length }
  fs.writeFileSync(`${F_DONNEES}.meta.json`, JSON.stringify(meta, null, 1) + '\n')
  return meta
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
  fs.mkdirSync(TRAVAIL, { recursive: true })
  figerCorpus({ refaire: !!arg('refiger', false) })
  const { entrees, refusees } = construireEntrees()
  const ep = construireEntrees({ epreuve: true })
  fs.writeFileSync(F_EPREUVE, ep.entrees.map((e) => JSON.stringify(e)).join('\n') + '\n')
  console.log(`entrées : ${entrees.length} (refusées avant envoi : ${refusees.length}${refusees.length ? ` — ${[...new Set(refusees.map((r) => r.motif))].join(' ; ')}` : ''}) · épreuve : ${ep.entrees.length}`)
  let code = 0
  if (arg('distiller', false)) {
    const r = await distiller(entrees, { maxEnvois: Number(arg('max-envois', 400)), concurrence: Number(arg('concurrence', 2)), modeles: String(arg('modeles', 'gemini-3.8-flash,nemotron-3-120b,llama-3.3-70b-fp8-fast,mistral-small-3.1-24b,gpt-oss-120b')).split(',') })
    if (r.quota) code = 3
  }
  if (arg('importer-maitre', false)) importerMaitre()
  if (arg('exporter-maitre', false)) exporterMaitre(entrees)
  const { paires, rejets, sansReponse } = construirePaires(entrees, lireJsonl(F_CACHE))
  const meta = ecrire(paires, entrees, refusees, rejets, sansReponse)
  console.log(`paires gardées : ${meta.paires} · sans réponse du maître : ${sansReponse} · rejetées : ${JSON.stringify(rejets)} · origines ${JSON.stringify(meta.origines)} · modèles ${JSON.stringify(meta.modeles)} · IMPOSSIBLE ${meta.impossibles} · sans Savoir ${meta.sans_savoir}`)
  console.log(`→ ${F_DONNEES}`)
  process.exitCode = code || (meta.paires < MIN_PAIRES ? 1 : 0)
}
