#!/usr/bin/env node
// Vérifie le compte rendu puis publie les événements du chef dans le fil.
//   node scripts/chef/fil.mjs verifier <plan> --consignes=<consignes.json>     sans aucune requête
//   node scripts/chef/fil.mjs poster <plan> --modele=<modèle> [--base=…]        consigne_lue…, puis cycle_termine
// `poster` imprime en dernière ligne `{"evenements":[…]}` : les ids rendus, que cycle.mjs recopie dans cycles.jsonl.
import fs from 'node:fs'
import path from 'node:path'
import { TRAVAIL, Arret, option, positionnels, lireJeton, baseSure, appeler, lireJson, ecrireJson, idsDe, fautesDeTexte, principal } from './commun.mjs'

const lirePlan = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { throw new Arret(1, 'plan illisible') } }

function verifier(plan) {
  const fc = option('consignes')
  if (typeof fc !== 'string') throw new Arret(2, '--consignes=<consignes.json> manque')
  const attendus = new Set(idsDe(lireJson(fc, [])))
  const lignes = Array.isArray(plan.consignes_lues) ? plan.consignes_lues : []
  const cites = new Set(lignes.map((l) => l?.id))
  const f = []
  for (const id of attendus) if (!cites.has(id)) f.push(`consigne ${id} sans ligne dans consignes_lues`)
  for (const id of cites) if (!attendus.has(id)) f.push(`consignes_lues cite une consigne inconnue (${id})`)
  if (cites.size !== lignes.length) f.push('consignes_lues : un id en double')
  f.push(...fautesDeTexte([plan.compte_rendu, lignes]).map((x) => `compte_rendu ou consignes_lues : ${x}`))
  if (f.length) { console.error(`✗ plan refusé par le fil :\n  ${f.join('\n  ')}`); return 1 }
  console.log(`✓ fil : ${lignes.length} consigne(s) lue(s), compte rendu propre`)
  return 0
}

async function poster(plan) {
  const modele = option('modele')
  if (typeof modele !== 'string' || !/^[a-z0-9.-]{2,60}$/.test(modele)) throw new Arret(2, '--modele=<modèle> manque')
  // Le moteur de secours qui a rédigé le plan (relais de la file du chef, 05/10/2026) : dit dans le compte rendu de l'événement, jamais dans `objet`.
  const moteur = option('moteur')
  if (moteur !== undefined && (typeof moteur !== 'string' || !/^[a-z0-9_]{2,40}$/.test(moteur))) throw new Arret(2, '--moteur=<identifiant> illisible')
  const base = baseSure(option('base'))
  const jeton = lireJeton()
  const envois = [
    ...(plan.consignes_lues || []).map((l) => ({ type: 'consigne_lue', objet: `consigne:${l.id}`, resume: `${l.suite} · ${l.pourquoi}`.slice(0, 200) })),
    { type: 'cycle_termine', objet: modele, resume: `${moteur ? `Moteur de secours : ${moteur} · ` : ''}${plan.compte_rendu.join(' · ')}`.slice(0, 200) },
  ]
  const ids = []
  for (const corps of envois) {
    const r = await appeler(base, jeton, 'POST', '/api/agents/evenements', corps)
    if (r.statut === 429) { console.error('✗ quota du bus atteint (429) : fil arrêté'); console.log(JSON.stringify({ evenements: ids })); return 3 }
    if (r.statut !== 201 && r.statut !== 200) { console.error(`✗ événement ${corps.type} refusé (HTTP ${r.statut || r.erreur})`); console.log(JSON.stringify({ evenements: ids })); return 1 }
    // La route de production rend l'identifiant NU (ops_evenement_ajouter → un nombre) ; le faux bus du juge rend { id } : les deux se lisent (CH-R8 voyait « null »).
    ids.push(Number.isInteger(r.json) ? r.json : r.json?.id)
  }
  // Seulement après un poster réussi : le curseur avance, les consignes lues sont retenues (les 200 dernières).
  const provisoire = path.join(TRAVAIL, 'curseur-provisoire.json')
  if (fs.existsSync(provisoire)) fs.renameSync(provisoire, path.join(TRAVAIL, 'curseur-evenements.json'))
  const lues = idsDe(lireJson(path.join(TRAVAIL, 'consignes-lues.json'), []))
  const nouvelles = idsDe(lireJson(path.join(TRAVAIL, 'consignes.json'), (plan.consignes_lues || []).map((l) => l.id)))
  const toutes = [...lues.filter((id) => !nouvelles.includes(id)), ...nouvelles].slice(-200)
  ecrireJson(path.join(TRAVAIL, 'consignes-lues.json'), toutes)
  console.error(`✓ fil : ${ids.length} événement(s) posté(s)`)
  console.log(JSON.stringify({ evenements: ids }))
  return 0
}

principal(async () => {
  const [sous, fichier] = positionnels()
  if (!['verifier', 'poster'].includes(sous) || !fichier) throw new Arret(2, 'usage : fil.mjs verifier|poster <plan> …')
  const plan = lirePlan(fichier)
  return sous === 'verifier' ? verifier(plan) : poster(plan)
})
