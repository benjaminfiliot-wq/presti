#!/usr/bin/env node
// scripts/score-douleur-passe.mjs — (re)note le score de douleur des prospects en file (07/10/2026, migrations 0135-0136).
//
//   node --import ./scripts/ts-loader.mjs scripts/score-douleur-passe.mjs [--limite=200] [--ecrire]
//
// Lit acq_prospects_a_noter (id, étape, domaine, faits, formulaire, envois sans réponse : jamais de nom ni de canal),
// calcule scoreDouleur (lib/agents/acquisition/scoreDouleur.ts) et, avec --ecrire seulement, pose le score par
// acq_score_douleur_poser (sans changer l'étape ni maj_le). Sans --ecrire : aperçu, rien n'est écrit.
// Les avis Google ne sont PAS lus (conditions de Google Maps : docs/agents/plaintes-par-theme.md) : le signal « avis »
// reste à zéro tant que Benj n'a pas ouvert une voie permise (API Places officielle).
// Sortie : des compteurs et la répartition des scores, jamais un domaine ni un nom. .env.local lu sans rien afficher.
// Codes : 0 fait · 2 appel invalide ou clé absente · 1 panne.
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(path.join(RACINE, 'scripts', 'ts-loader.mjs')).href)
const { scoreDouleur, detailStockable } = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'acquisition', 'scoreDouleur.ts')).href)

/** L'entrée du score à partir d'une ligne de acq_prospects_a_noter (exportée pour le juge). */
export function entreeDepuisLigne(l) {
  const faits = Array.isArray(l?.faits) ? l.faits : []
  return {
    domaine: l?.domaine ?? null,
    faits,
    formulaire: l?.formulaire && typeof l.formulaire === 'object' ? l.formulaire : null,
    // Le site a été lu s'il en reste un fait de lecture ou un formulaire ; sinon l'absence de formulaire ne prouve rien.
    site_lu: !!l?.formulaire || faits.some((f) => typeof f?.type === 'string' && f.type.startsWith('site_')),
    messages_sans_reponse: Number(l?.messages_sans_reponse) || 0,
  }
}

async function rpc(nom, corps) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(30_000),
  })
  if (!r.ok) throw new Error(`${nom} : HTTP ${r.status}`)
  return r.json()
}

async function principal() {
  const argv = process.argv.slice(2)
  const inconnues = argv.filter((a) => !/^--(ecrire|limite=\d+)$/.test(a))
  if (inconnues.length) { console.error(`usage : score-douleur-passe.mjs [--limite=N] [--ecrire] (inconnu : ${inconnues.join(' ')})`); return 2 }
  const ecrire = argv.includes('--ecrire')
  const limite = Number(argv.find((a) => a.startsWith('--limite='))?.split('=')[1] ?? 200)
  const { lireEnvLocal } = await import(pathToFileURL(path.join(RACINE, 'scripts', 'lib', 'sql-essai.mjs')).href)
  lireEnvLocal(RACINE)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('✗ clés Supabase absentes de .env.local'); return 2 }
  const lignes = await rpc('acq_prospects_a_noter', { p_limite: limite })
  const tranches = { '0': 0, '1-19': 0, '20-39': 0, '40-59': 0, '60+': 0 }
  const signaux = {}
  let ecrits = 0, inchanges = 0
  for (const l of lignes) {
    const s = scoreDouleur(entreeDepuisLigne(l))
    tranches[s.score === 0 ? '0' : s.score < 20 ? '1-19' : s.score < 40 ? '20-39' : s.score < 60 ? '40-59' : '60+']++
    for (const x of s.signaux) signaux[x.code] = (signaux[x.code] ?? 0) + 1
    if (!ecrire) continue
    if (l.score_douleur === s.score && l.score_douleur_le) { inchanges++; continue }
    if (await rpc('acq_score_douleur_poser', { p_id: l.id, p_score: s.score, p_detail: detailStockable(s) })) ecrits++
  }
  console.log(`✓ ${lignes.length} prospect(s) en file noté(s) ; ${ecrire ? `${ecrits} écrit(s), ${inchanges} inchangé(s)` : 'aperçu (rien écrit : --ecrire pour poser)'} ; scores ${JSON.stringify(tranches)} ; signaux ${JSON.stringify(signaux)}`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${String(e?.message || e).slice(0, 200)}`); process.exitCode = 1 })
}
