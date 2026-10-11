#!/usr/bin/env node
// scripts/modele/mesure-chef-leger.mjs — étape 3 du modèle maison « presti-chef-leger » : la mesure sur l'Ollama de l'usine (4 cœurs ARM, sans GPU).
//
// Question : le modèle affiné écrit-il un plan léger VALIDE en moins de 300 s, sur des entrées réelles qu'il n'a jamais vues ? Les entrées sont les cycles
// CYCLES_EPREUVE (donnees-chef-leger.mjs : jamais graines, le juge des données prouve qu'aucune n'a fui), compactées par la même fonction qu'à l'entraînement.
// Une entrée à la fois, appel DIFFUSÉ (stream) : couper le client arrête vraiment le calcul (une requête non diffusée continue après la coupure, vu le 06/10).
// Refuse de tourner pendant un cycle du Chef (H:05 à H:20 UTC) sauf --forcer. Rien n'est installé ni modifié sur l'usine par ce script.
//
// Usage : node scripts/modele/mesure-chef-leger.mjs [--modele=presti-chef-leger:1.5b] [--rangs=0,1,2,3,4] [--format=schema|json|aucun] [--timeout=420] [--ctx=4096]
//                                                   [--predict=1200] [--ssh=gardien@88.96.53.3] [--cle=<clé ssh>] [--etiquette=<texte>] [--forcer]
//   Écrit chaque mesure dans .orchestre/travail/modele-maison/chef-leger/mesures.jsonl et la sortie brute à côté.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { RACINE, filtrerTaches } from '../chef/commun.mjs'
import { schemaPlan } from './prompt-chef.mjs'
import { jugerSortie, etatUsine } from './base-chef.mjs'
import { SYSTEME_CHEF_LEGER, messageChefLeger } from './chef-leger-entree.mjs'
import { CYCLES_EPREUVE, DOSSIER_DEFAUT } from './donnees-chef-leger.mjs'

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'chef-leger')
const arrondi = (x, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d)))
const sec = (ns) => (typeof ns === 'number' ? ns / 1e9 : null)

/** Pendant un cycle du Chef (H:05 à H:20 UTC) ? */
export const pendantUnCycle = (d = new Date()) => d.getUTCMinutes() >= 5 && d.getUTCMinutes() <= 20

/** Appel diffusé à l'Ollama de l'usine : rend { contenu, fin (dernière ligne, avec les durées), mur_s, erreur }. */
export function appelerDiffuse(corps, { ssh, cle, timeoutS }) {
  const t0 = Date.now()
  const r = spawnSync('ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=20', ssh,
    `curl -sN --max-time ${timeoutS} -H 'content-type: application/json' --data-binary @- http://127.0.0.1:11434/api/chat`],
  { input: JSON.stringify(corps), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: (timeoutS + 30) * 1000 })
  const mur_s = (Date.now() - t0) / 1000
  if (r.error) return { contenu: '', fin: null, mur_s, erreur: `ssh : ${r.error.code || r.error.message}` }
  let contenu = '', fin = null, erreur = null
  for (const l of String(r.stdout).split('\n')) {
    if (!l.trim()) continue
    let o
    try { o = JSON.parse(l) } catch { erreur = `ligne illisible : ${l.slice(0, 120)}`; continue }
    if (o.error) erreur = `Ollama : ${String(o.error).slice(0, 300)}`
    if (o.message?.content) contenu += o.message.content
    if (o.done) fin = o
  }
  if (!fin && !erreur) erreur = `flux coupé sans fin (curl ${r.status}, délai ${timeoutS} s ?)`
  return { contenu, fin, mur_s, erreur }
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const modele = arg('modele', 'presti-chef-leger:1.5b')
  const format = arg('format', 'schema')
  const timeoutS = Number(arg('timeout', 420))
  const ctx = Number(arg('ctx', 4096))
  const predict = Number(arg('predict', 1200))
  const ssh = arg('ssh', 'gardien@88.96.53.3')
  const cle = arg('cle', path.join(os.homedir(), '.ssh', 'presti-usine-gardien'))
  const etiquette = arg('etiquette', '')
  const dossier = path.resolve(arg('dossier', DOSSIER_DEFAUT))
  const rangs = typeof arg('rangs', false) === 'string' ? arg('rangs').split(',').map(Number) : CYCLES_EPREUVE.map((_, i) => i)
  const sortie = path.join(TRAVAIL, 'mesures.jsonl')
  fs.mkdirSync(TRAVAIL, { recursive: true })
  console.log(`modèle ${modele} · format ${format} · ctx ${ctx} · délai ${timeoutS} s · entrées ${rangs.join(',')}`)
  let valides = 0, sous300 = 0, faites = 0
  for (const i of rangs) {
    if (pendantUnCycle() && !arg('forcer', false)) { console.error(`✗ ${new Date().toISOString().slice(11, 16)} UTC : un cycle du Chef tourne (H:05 à H:20), arrêt avant l'entrée ${i}`); process.exitCode = 3; break }
    const nom = CYCLES_EPREUVE[i]
    const brut = fs.readFileSync(path.join(dossier, nom, 'entree.md'), 'utf8')
    const user = messageChefLeger(nom.slice(0, 10), brut)
    const corps = { model: modele, stream: true, think: false, options: { num_ctx: ctx, temperature: 0.2, num_predict: predict }, messages: [{ role: 'system', content: SYSTEME_CHEF_LEGER }, { role: 'user', content: user }] }
    if (format === 'schema') corps.format = schemaPlan('leger')
    else if (format === 'json') corps.format = 'json'
    if (/^qwen3/.test(modele)) corps.think = false
    else delete corps.think
    const avant = etatUsine({ ssh, cle })
    const { contenu, fin, mur_s, erreur } = appelerDiffuse(corps, { ssh, cle, timeoutS })
    const j = contenu ? jugerSortie(contenu, 'leger', user) : { valide: false, ecarts: [erreur || 'aucune sortie'], taches: 0, utiles: 0, plan: null }
    const ligne = {
      le: new Date().toISOString(), etiquette, modele, format, ctx, entree: i, cycle: nom,
      mur_s: arrondi(mur_s), total_s: arrondi(sec(fin?.total_duration)), charge_s: arrondi(sec(fin?.load_duration), 2),
      jetons_entree: fin?.prompt_eval_count ?? null, entree_s: arrondi(sec(fin?.prompt_eval_duration)), entree_jps: arrondi(fin?.prompt_eval_count / sec(fin?.prompt_eval_duration)),
      jetons_sortie: fin?.eval_count ?? null, sortie_s: arrondi(sec(fin?.eval_duration)), sortie_jps: arrondi(fin?.eval_count / sec(fin?.eval_duration), 2),
      fin: fin?.done_reason ?? null, erreur, valide: j.valide, ecarts: j.ecarts.length, premier_ecart: j.ecarts[0] ?? null, taches: j.taches,
      ecartees: j.plan && Array.isArray(j.plan.taches) ? filtrerTaches(j.plan).ecartees.length : null, utiles: j.utiles,
      sous_300_s: mur_s < 300, charge_avant: avant.charge1, modeles_avant: avant.modeles,
    }
    faites++; if (ligne.valide) valides++; if (ligne.valide && ligne.sous_300_s) sous300++
    fs.appendFileSync(sortie, JSON.stringify(ligne) + '\n')
    if (contenu) fs.writeFileSync(path.join(TRAVAIL, `sortie-${modele.replace(/[^a-z0-9.]+/gi, '_')}-${format}-${i}.json`), contenu)
    console.log(`  entrée ${i} (${nom.slice(5, 16)}) : ${ligne.mur_s} s au mur (chargement ${ligne.charge_s} s) · ${ligne.jetons_entree} jetons lus à ${ligne.entree_jps}/s · ${ligne.jetons_sortie} écrits à ${ligne.sortie_jps}/s · fin ${ligne.fin} · charge avant ${ligne.charge_avant} · ${ligne.valide ? 'VALIDE' : 'INVALIDE'}${ligne.valide ? '' : ` (${ligne.ecarts} écart(s) : ${String(ligne.premier_ecart).slice(0, 110)})`} · tâches ${ligne.taches}, écartées ${ligne.ecartees}`)
  }
  console.log(`→ ${valides}/${faites} plans valides · ${sous300}/${faites} valides ET sous 300 s · ${sortie}`)
}
