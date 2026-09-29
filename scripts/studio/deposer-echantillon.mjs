#!/usr/bin/env node
// scripts/studio/deposer-echantillon.mjs — dépose l'échantillon vidéo d'une marque dans le bucket privé `packs-pubs`
// puis tranche la décision `studio_echantillon` en `depose` (fiche 026-166). Repli du poste : la route de dépôt de
// l'usine (026-200) fait la même chose, MP4 de 3 Mo au plus, après un `pub-qa` vert.
//
// Usage : node scripts/studio/deposer-echantillon.mjs --marque=<cle> --echantillon=<dossier> [--decision=<uuid>]
//   --marque       la clé de la marque (minuscules, chiffres, tirets, soulignés) : le dépôt va sous studio/<cle>/
//   --echantillon  le dossier echantillon-N/ (avec sortie/echantillon.mp4)
//   --decision     l'identifiant de la décision ouverte ; sans lui, la seule décision d'échantillon ouverte du bus
//
// Ordre, et rien d'autre : 1. `node scripts/pub-qa.mjs <dossier>` — rouge : code 1, AUCUN accès réseau ; 2. sortie/echantillon.mp4
// de plus de 3 Mo : code 1 (le Gmail le joint au message), aucun accès réseau ; 3. la décision ouverte : aucune (ou plusieurs
// sans --decision) : code 2, rien déposé ; 4. dépôt sous studio/<cle>/echantillon-<N>.mp4 (`video/mp4`, N = le premier libre) ;
// 5. ops_decision_trancher(<id>, 'depose', <id du fondateur>) — Claude Code agit dans la séance que cette décision a ouverte
// (pour le premier échantillon, après le regard de Benj, 026-155).
//
// Env : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY, dans l'environnement ou le .env.local du dépôt ; jamais affichés.
// Codes : 0 déposé et décision tranchée · 1 échantillon refusé, ou dépôt/décision en échec · 2 usage, configuration absente,
// ou aucune décision ouverte.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BUCKET = 'packs-pubs'
const TAILLE_MAX = 3 * 1024 * 1024
const USAGE = 'Usage : node scripts/studio/deposer-echantillon.mjs --marque=<cle> --echantillon=<dossier> [--decision=<uuid>]'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const sortir = (code, message) => { if (message) (code === 0 ? console.log : console.error)(message); process.exitCode = code }

function options(argv) {
  const o = {}
  for (const a of argv) {
    const m = /^--(marque|echantillon|decision)=(.*)$/.exec(a)
    if (!m) return null
    o[m[1]] = m[2]
  }
  return o
}

async function principal() {
  const o = options(process.argv.slice(2))
  if (!o || !o.marque || !o.echantillon || !/^[a-z0-9_-]{1,80}$/.test(o.marque) || (o.decision && !UUID.test(o.decision))) return sortir(2, USAGE)
  const dossier = path.resolve(o.echantillon)

  // 1. Le juge d'abord : rouge, on s'arrête avant tout accès réseau.
  const qa = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'pub-qa.mjs'), dossier], { cwd: RACINE, encoding: 'utf8', timeout: 5 * 60_000 })
  if (qa.status !== 0) return sortir(1, `✗ pub-qa n'est pas vert sur cet échantillon (code ${qa.status ?? 'délai dépassé'}) : rien n'est déposé.`)

  // 2. Le fichier : présent et de 3 Mo au plus.
  const video = path.join(dossier, 'sortie', 'echantillon.mp4')
  if (!fs.existsSync(video)) return sortir(1, '✗ sortie/echantillon.mp4 absent : rien n\'est déposé.')
  const taille = fs.statSync(video).size
  if (taille > TAILLE_MAX) return sortir(1, `✗ sortie/echantillon.mp4 fait ${(taille / 1048576).toFixed(1)} Mo (3 Mo au plus, le Gmail le joint au message) : rien n'est déposé.`)
  if (taille === 0) return sortir(1, '✗ sortie/echantillon.mp4 est vide : rien n\'est déposé.')

  // 3. La configuration, lue une fois, jamais affichée.
  const envLocal = path.join(RACINE, '.env.local')
  for (const l of fs.existsSync(envLocal) ? fs.readFileSync(envLocal, 'utf8').split(/\r?\n/) : []) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !cle) return sortir(2, '✗ configuration absente : l\'adresse de la base ou la clé de service manque (environnement ou .env.local).')
  const { createClient } = await import('@supabase/supabase-js')
  const base = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })

  // 4. La décision ouverte : sans elle, rien n'est déposé.
  let decisionId = o.decision || ''
  if (!decisionId) {
    const { data, error } = await base.rpc('ops_etat').abortSignal(AbortSignal.timeout(20_000))
    if (error) return sortir(1, `✗ état du bus illisible : ${error.message}`)
    const ouvertes = (Array.isArray(data?.decisions_ouvertes) ? data.decisions_ouvertes : []).filter((d) => /échantillon/i.test(String(d?.question || '')))
    if (ouvertes.length === 0) return sortir(2, '✗ aucune décision studio_echantillon ouverte : rien n\'est déposé.')
    if (ouvertes.length > 1) return sortir(2, `✗ ${ouvertes.length} décisions d'échantillon ouvertes : précisez --decision=<uuid>. Rien n'est déposé.`)
    decisionId = String(ouvertes[0].id)
  }
  const { data: fondateurs, error: eFond } = await base.from('artisans').select('id').eq('is_founder', true).order('id').limit(1)
  if (eFond || !fondateurs?.length) return sortir(1, '✗ aucun fondateur lisible : la décision ne peut pas être tranchée. Rien n\'est déposé.')

  // 5. Le dépôt : le premier numéro libre.
  const prefixe = `studio/${o.marque}`
  const { data: existants, error: eListe } = await base.storage.from(BUCKET).list(prefixe, { limit: 1000 })
  if (eListe) return sortir(1, `✗ liste du bucket impossible : ${eListe.message}`)
  const pris = (existants || []).map((f) => /^echantillon-(\d+)\.mp4$/.exec(f.name)).filter(Boolean).map((m) => Number(m[1]))
  const n = pris.length ? Math.max(...pris) + 1 : 1
  const chemin = `${prefixe}/echantillon-${n}.mp4`
  const { error: eDepot } = await base.storage.from(BUCKET).upload(chemin, fs.readFileSync(video), { contentType: 'video/mp4', upsert: false })
  if (eDepot) return sortir(1, `✗ dépôt impossible : ${eDepot.message}`)

  // 6. La décision, tranchée en `depose`.
  const { error: eTranche } = await base.rpc('ops_decision_trancher', { p_id: decisionId, p_choix: 'depose', p_auteur: fondateurs[0].id }).abortSignal(AbortSignal.timeout(20_000))
  if (eTranche) return sortir(1, `✗ échantillon déposé sous ${BUCKET}/${chemin}, mais la décision n'a pas pu être tranchée : ${eTranche.message}`)
  return sortir(0, `✓ échantillon déposé sous ${BUCKET}/${chemin}, décision ${decisionId} tranchée en « depose ».`)
}

await principal()
