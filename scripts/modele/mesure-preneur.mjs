#!/usr/bin/env node
// scripts/modele/mesure-preneur.mjs — la mesure du modèle maison « presti-preneur » sur l'Ollama de l'usine (4 cœurs ARM, sans GPU), copie de mesure-chef-leger.mjs.
//
// Question : sur des tâches de rédaction interne JAMAIS VUES (l'épreuve : EPREUVE de preneur-taches.mjs, 12 entrées, le juge des données prouve qu'aucune n'a
// fui), le modèle rend-il un texte conforme, vite, sans chiffre inventé ? L'appel est CELUI DU PRENEUR (scripts/usine/preneur.mjs : /api/chat diffusé, consigne
// système et message de construireConsigne, num_ctx 8192, température 0,3, num_predict 3500), une entrée à la fois, appel diffusé (couper le client arrête le calcul).
// Verdict par entrée : controlerSortie (le preneur publierait-il ?), nombresNonSources (la garde de production), puis toutes les gardes des données
// (fautesSortie : nombres stricts, promesses, français, résumé, citations, IMPOSSIBLE quand il le faut).
// Refuse de tourner pendant un cycle du Chef (H:05 à H:20 UTC) sauf --forcer. Rien n'est installé ni modifié sur l'usine par ce script.
//
// Usage : node scripts/modele/mesure-preneur.mjs [--modele=presti-preneur:1.5b] [--rangs=0,1,…] [--timeout=600] [--etiquette=<texte>] [--forcer]
//   Écrit chaque mesure dans .orchestre/travail/modele-maison/preneur/mesures.jsonl et la sortie brute à côté.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { controlerSortie, nombresNonSources } from '../usine/preneur.mjs'
import { etatUsine } from './base-chef.mjs'
import { appelerDiffuse, pendantUnCycle } from './mesure-chef-leger.mjs'
import { fautesSortie, nombresStricts, promessesNonProuvees } from './preneur-gardes.mjs'
import { TRAVAIL, F_EPREUVE } from './donnees-preneur.mjs'

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
const arrondi = (x, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d)))
const sec = (ns) => (typeof ns === 'number' ? ns / 1e9 : null)

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const modele = arg('modele', 'presti-preneur:1.5b')
  const timeoutS = Number(arg('timeout', 600))
  const ssh = arg('ssh', 'gardien@88.96.53.3')
  const cle = arg('cle', path.join(os.homedir(), '.ssh', 'presti-usine-gardien'))
  const etiquette = arg('etiquette', '')
  const epreuve = fs.readFileSync(F_EPREUVE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const rangs = typeof arg('rangs', false) === 'string' ? arg('rangs').split(',').map(Number) : epreuve.map((_, i) => i)
  const sortie = path.join(TRAVAIL, 'mesures.jsonl')
  console.log(`modèle ${modele} · délai ${timeoutS} s · entrées ${rangs.join(',')}`)
  let publiables = 0, conformes = 0, faites = 0, sansChiffre = 0
  for (const i of rangs) {
    if (pendantUnCycle() && !arg('forcer', false)) { console.error(`✗ ${new Date().toISOString().slice(11, 16)} UTC : un cycle du Chef tourne (H:05 à H:20), arrêt avant l'entrée ${i}`); process.exitCode = 3; break }
    const e = epreuve[i]
    const corps = { model: modele, stream: true, options: { num_ctx: 8192, temperature: 0.3, num_predict: 3500 }, messages: [{ role: 'system', content: e.systeme }, { role: 'user', content: e.utilisateur }] }
    if (/^qwen3/.test(modele)) corps.think = false
    const avant = etatUsine({ ssh, cle })
    const { contenu, fin, mur_s, erreur } = appelerDiffuse(corps, { ssh, cle, timeoutS })
    const consigne = { systeme: e.systeme, utilisateur: e.utilisateur }
    const sources = `${e.systeme}\n${e.utilisateur}`
    const texte = String(contenu).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const v = contenu ? controlerSortie(texte) : { ok: false, code: erreur || 'aucune sortie' }
    const fautes = contenu ? fautesSortie(consigne, texte, { attendu: e.attendu, nPassages: e.nPassages }) : [erreur || 'aucune sortie']
    const ligne = {
      le: new Date().toISOString(), etiquette, modele, entree: i, id: e.id, attendu: e.attendu, passages: e.nPassages,
      mur_s: arrondi(mur_s), charge_s: arrondi(sec(fin?.load_duration), 2),
      jetons_entree: fin?.prompt_eval_count ?? null, entree_jps: arrondi(fin?.prompt_eval_count / sec(fin?.prompt_eval_duration)),
      jetons_sortie: fin?.eval_count ?? null, sortie_jps: arrondi(fin?.eval_count / sec(fin?.eval_duration), 2), fin: fin?.done_reason ?? null, erreur,
      signes: [...texte].length,
      publiable: v.ok || (e.attendu === 'impossible' && /^IMPOSSIBLE\b/i.test(texte)), code_preneur: v.ok ? null : v.code,
      chiffres_non_sources: contenu ? nombresNonSources(texte, sources) : null, nombres_stricts: contenu ? nombresStricts(texte, sources) : null,
      promesses: contenu ? promessesNonProuvees(texte, sources) : null, fautes, conforme: fautes.length === 0, charge_avant: avant.charge1, modeles_avant: avant.modeles,
    }
    faites++
    if (ligne.publiable) publiables++
    if (ligne.conforme) conformes++
    if (contenu && !ligne.chiffres_non_sources.length && !ligne.nombres_stricts.length) sansChiffre++
    fs.appendFileSync(sortie, JSON.stringify(ligne) + '\n')
    if (contenu) fs.writeFileSync(path.join(TRAVAIL, `sortie-${modele.replace(/[^a-z0-9.]+/gi, '_')}-${i}.md`), contenu)
    console.log(`  ${i} ${e.id} : ${ligne.mur_s} s au mur (chargement ${ligne.charge_s} s) · ${ligne.jetons_entree} jetons lus à ${ligne.entree_jps}/s · ${ligne.jetons_sortie} écrits à ${ligne.sortie_jps}/s · ${ligne.signes} signes · ${ligne.publiable ? 'publiable' : `REFUSÉ (${ligne.code_preneur})`} · ${ligne.conforme ? 'CONFORME' : `${fautes.length} faute(s) : ${fautes.slice(0, 2).join(' ; ').slice(0, 150)}`}`)
  }
  console.log(`→ ${publiables}/${faites} publiables par le preneur · ${sansChiffre}/${faites} sans aucun chiffre hors sources · ${conformes}/${faites} conformes à toutes les gardes · ${sortie}`)
}
