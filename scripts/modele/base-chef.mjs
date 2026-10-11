#!/usr/bin/env node
// scripts/modele/base-chef.mjs — étape 1 du modèle maison (docs/agents/modele-maison.md) : la BASE de comparaison, avant tout entraînement.
//
// Question posée : un petit modèle NON affiné, avec le prompt court (scripts/modele/prompt-chef.mjs) et une sortie JSON contrainte par un schéma, écrit-il un plan valide du Chef
// en moins de 300 s, sur l'Ollama de l'usine (4 cœurs ARM, sans GPU) ? On mesure, une entrée réelle à la fois : durée totale, jetons d'entrée, jetons/s en génération,
// plan valide selon validerPlan (et selon la règle des consignes du fil), nombre de tâches, nombre de tâches UTILES (celles que le filtre d'aujourd'hui laisse créer).
//
// Le script tourne sur le PC : chaque appel passe par ssh (gardien@usine) et un `curl` vers 127.0.0.1:11434 de l'usine, le corps de la requête passant par l'entrée standard.
// Rien n'est installé ni modifié sur l'usine ; ne PAS lancer pendant un cycle du Chef (H:05 à H:20, heure UTC) ni quand un autre agent charge Ollama.
//
// Usage : node scripts/modele/base-chef.mjs [--modele=qwen3:4b-instruct-2507-q4_K_M] [--n=5] [--format=schema|json] [--ctx=8192] [--predict=1500] [--timeout=330]
//                                          [--rangs=0,2,3] (rangs des entrées légères du corpus, au lieu de n entrées réparties) [--corpus=<jsonl>] [--sonde] [--ssh=gardien@88.96.53.3] [--cle=<clé ssh>] [--etiquette=<texte>]
//   --sonde : un seul appel minuscule, pour vérifier que Ollama accepte le schéma (aucune mesure).
//   Écrit chaque mesure dans .orchestre/travail/modele-maison/mesures-base.jsonl.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { RACINE, validerPlan, filtrerTaches, idsDe } from '../chef/commun.mjs'
import { schemaPlan, systemeCourt, messageUtilisateur } from './prompt-chef.mjs'

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'modele-maison')
const sec = (ns) => (typeof ns === 'number' ? ns / 1e9 : null)
const arrondi = (x, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d)))

/** Appelle Ollama de l'usine par ssh + curl. Rend { reponse, mur_s, erreur }. */
export function appelerOllama(corps, { ssh, cle, timeoutS }) {
  const t0 = Date.now()
  const r = spawnSync('ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=20', ssh,
    `curl -s --max-time ${timeoutS} -H 'content-type: application/json' --data-binary @- http://127.0.0.1:11434/api/chat`],
  { input: JSON.stringify(corps), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: (timeoutS + 30) * 1000 })
  const mur_s = (Date.now() - t0) / 1000
  if (r.error) return { reponse: null, mur_s, erreur: `ssh : ${r.error.code || r.error.message}` }
  let reponse = null
  try { reponse = JSON.parse(r.stdout) } catch { return { reponse: null, mur_s, erreur: `réponse illisible (code ${r.status}) : ${String(r.stdout).slice(0, 200)}` } }
  return { reponse, mur_s, erreur: reponse?.error ? `Ollama : ${String(reponse.error).slice(0, 300)}` : null }
}

/** L'état de l'usine juste avant un appel : charge moyenne sur 1 min (/proc/loadavg) et modèles chargés par Ollama. Une charge élevée avant l'appel fausse la mesure : elle est consignée avec elle. */
export function etatUsine({ ssh, cle }) {
  const r = spawnSync('ssh', ['-i', cle, '-o', 'BatchMode=yes', ssh, "cut -d' ' -f1 /proc/loadavg; curl -s --max-time 5 http://127.0.0.1:11434/api/ps"], { encoding: 'utf8', timeout: 30_000 })
  const [charge, ...reste] = String(r.stdout || '').split('\n')
  let modeles = []
  try { modeles = (JSON.parse(reste.join('\n')).models || []).map((m) => m.name) } catch { /* illisible */ }
  return { charge1: Number(charge) || null, modeles }
}

/** Juge une sortie de modèle comme le fait le Chef : JSON lisible, validerPlan, puis la règle des consignes du fil. Rend { valide, ecarts, plan, taches, utiles }. */
export function jugerSortie(texte, cycle, entree, maintenant = new Date()) {
  let plan
  try { plan = JSON.parse(texte) } catch (e) { return { valide: false, ecarts: [`JSON illisible (${String(e.message).slice(0, 80)})`], plan: null, taches: 0, utiles: 0 } }
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return { valide: false, ecarts: ['JSON : objet attendu'], plan: null, taches: 0, utiles: 0 }
  const ecarts = validerPlan(plan, cycle, maintenant)
  // La règle de fil.mjs verifier : une ligne de consignes_lues par consigne du bloc consignes_benj, ni plus ni moins.
  const bloc = /<consignes_benj>\s*([\s\S]*?)\s*<\/consignes_benj>/.exec(entree)?.[1]
  let attendus = new Set()
  try { attendus = new Set(idsDe((JSON.parse(bloc) || []).map((c) => c?.id))) } catch { /* pas de bloc lisible : aucune consigne attendue */ }
  const lignes = Array.isArray(plan.consignes_lues) ? plan.consignes_lues : []
  const cites = new Set(lignes.map((l) => l?.id))
  for (const id of attendus) if (!cites.has(id)) ecarts.push(`consigne ${id} sans ligne dans consignes_lues`)
  for (const id of cites) if (!attendus.has(id)) ecarts.push(`consignes_lues cite une consigne inconnue (${id})`)
  const taches = Array.isArray(plan.taches) ? plan.taches.length : 0
  return { valide: ecarts.length === 0, ecarts, plan, taches, utiles: ecarts.length ? 0 : filtrerTaches(plan).gardees.length }
}

function choisir(corpus, rapport, n, rangsDemandes = null) {
  const legers = corpus.map((l, i) => ({ l, i })).filter(({ l }) => /Cycle : leger./.test(l.messages[1].content))
  const pas = (legers.length - 1) / Math.max(1, n - 1)
  const rangs = rangsDemandes ?? [...new Set(Array.from({ length: Math.min(n, legers.length) }, (_, k) => Math.round(k * pas)))]
  return rangs.map((r) => ({ ...legers[r], cycle: rapport?.gardes_liste?.[legers[r].i]?.cycle ?? null }))
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const modele = arg('modele', 'qwen3:4b-instruct-2507-q4_K_M')
  const n = Number(arg('n', 5))
  const format = arg('format', 'schema')
  const ctx = Number(arg('ctx', 8192))
  const predict = Number(arg('predict', 1500))
  const timeoutS = Number(arg('timeout', 330))
  const ssh = arg('ssh', 'gardien@88.96.53.3')
  const cle = arg('cle', path.join(os.homedir(), '.ssh', 'presti-usine-gardien'))
  const etiquette = arg('etiquette', '')
  const options = { num_ctx: ctx, temperature: 0.2, num_predict: predict }
  const forme = format === 'json' ? 'json' : schemaPlan('leger')
  if (arg('sonde', false)) {
    const corps = { model: modele, stream: false, think: false, format: forme, options: { ...options, num_predict: 30 }, messages: [{ role: 'user', content: 'Réponds par le plan JSON d\'un cycle léger vide.' }] }
    const { reponse, mur_s, erreur } = appelerOllama(corps, { ssh, cle, timeoutS })
    console.log(JSON.stringify({ mur_s: arrondi(mur_s), erreur, content: reponse?.message?.content?.slice(0, 200), load_s: arrondi(sec(reponse?.load_duration), 2) }))
    process.exitCode = erreur ? 1 : 0
  } else {
    const fCorpus = path.resolve(arg('corpus', path.join(TRAVAIL, 'corpus-chef-large.jsonl')))
    const fRapport = fCorpus.replace(/\.jsonl$/, '.rapport.json')
    if (!fs.existsSync(fCorpus)) { console.error(`✗ corpus absent : ${fCorpus} (node scripts/modele/corpus-chef.mjs --tolere-ecartees --sortie=… d'abord)`); process.exit(2) }
    const corpus = fs.readFileSync(fCorpus, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    let rapport = null
    try { rapport = JSON.parse(fs.readFileSync(fRapport, 'utf8')) } catch { /* sans rapport, pas de nom de cycle */ }
    const rangs = typeof arg('rangs', false) === 'string' ? arg('rangs').split(',').map(Number).filter((x) => Number.isInteger(x) && x >= 0) : null
    const choix = choisir(corpus, rapport, n, rangs).filter((x) => x.l)
    const sortie = path.join(TRAVAIL, 'mesures-base.jsonl')
    console.log(`modèle ${modele} · format ${format === 'json' ? 'json' : 'schéma'} · ctx ${ctx} · ${choix.length} entrée(s) léger(s) · délai ${timeoutS} s par appel`)
    const lignes = []
    for (const { l, i, cycle } of choix) {
      const entree = l.messages[1].content
      const date = /Date : (\d{4}-\d{2}-\d{2})/.exec(entree)?.[1] ?? ''
      const etat = entree.slice(entree.indexOf('\n\n') + 2)
      const corps = { model: modele, stream: false, think: false, format: forme, options, messages: [{ role: 'system', content: systemeCourt('leger') }, { role: 'user', content: messageUtilisateur('leger', date, etat) }] }
      const avant = etatUsine({ ssh, cle })
      const { reponse, mur_s, erreur } = appelerOllama(corps, { ssh, cle, timeoutS })
      const ref = jugerSortie(l.messages[2].content, 'leger', entree)
      const contenu = reponse?.message?.content ?? ''
      const j = contenu ? jugerSortie(contenu, 'leger', entree) : { valide: false, ecarts: [erreur || 'aucune sortie'], taches: 0, utiles: 0 }
      const ligne = {
        le: new Date().toISOString(), etiquette, modele, format: format === 'json' ? 'json' : 'schema', ctx, entree: i, cycle,
        mur_s: arrondi(mur_s), total_s: arrondi(sec(reponse?.total_duration)), charge_s: arrondi(sec(reponse?.load_duration), 2),
        jetons_entree: reponse?.prompt_eval_count ?? null, entree_s: arrondi(sec(reponse?.prompt_eval_duration)), entree_jps: arrondi(reponse?.prompt_eval_count / sec(reponse?.prompt_eval_duration)),
        jetons_sortie: reponse?.eval_count ?? null, sortie_s: arrondi(sec(reponse?.eval_duration)), sortie_jps: arrondi(reponse?.eval_count / sec(reponse?.eval_duration), 2),
        fin: reponse?.done_reason ?? null, erreur, valide: j.valide, ecarts: j.ecarts.length, premier_ecart: j.ecarts[0] ?? null, taches: j.taches, utiles: j.utiles,
        reference: { taches: ref.taches, utiles: ref.utiles, valide: ref.valide },
        sous_300_s: (mur_s ?? 1e9) < 300, charge_avant: avant.charge1, modeles_avant: avant.modeles,
      }
      lignes.push(ligne)
      fs.mkdirSync(TRAVAIL, { recursive: true })
      fs.appendFileSync(sortie, JSON.stringify(ligne) + '\n')
      if (contenu) fs.writeFileSync(path.join(TRAVAIL, `sortie-${modele.replace(/[^a-z0-9.]+/gi, '_')}-${format}-${i}.json`), contenu)
      console.log(`  entrée ${i}${cycle ? ` (${cycle.slice(5, 16)})` : ''} : ${ligne.mur_s} s (charge ${ligne.charge_s} s) · ${ligne.jetons_entree} jetons lus à ${ligne.entree_jps}/s · ${ligne.jetons_sortie} écrits à ${ligne.sortie_jps}/s · fin ${ligne.fin} · charge avant ${ligne.charge_avant} · ${ligne.valide ? 'VALIDE' : 'INVALIDE'}${ligne.valide ? '' : ` (${ligne.ecarts} écart(s) : ${String(ligne.premier_ecart).slice(0, 110)})`} · tâches ${ligne.taches}, utiles ${ligne.utiles} (référence ${ligne.reference.taches}/${ligne.reference.utiles})`)
    }
    const ok = lignes.filter((x) => x.valide).length
    console.log(`→ ${ok}/${lignes.length} plans valides · ${lignes.filter((x) => x.sous_300_s).length}/${lignes.length} sous 300 s · ${sortie}`)
  }
}
