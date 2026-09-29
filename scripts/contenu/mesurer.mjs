#!/usr/bin/env node
// scripts/contenu/mesurer.mjs — C10 (fiche 026-213) : le petit CLI du Mesureur. La logique vit dans lib/contenu/mesure.ts (testée
// par contenu-qa --partie=mesure) ; ce fichier ne fait que lire un JSON local et écrire un JSON sur la sortie standard.
// AUCUN appel réseau, aucun secret, aucune base : les insights Graph passent par un client injecté par l'appelant (R6, jeton
// Meta non levé). TikTok : seul un relevé manuel signé par Benj entre ici ; aucune lecture scriptée de la console du réseau.
// Import sans effet de bord : le CLI ne s'exécute que lancé directement. Fin par process.exitCode (jamais process.exit : Node 24 Windows).
//
// Usage (depuis la racine du dépôt) :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/contenu/mesurer.mjs --plan=<posts.json> [--maintenant=<ISO>]
//        posts.json = [{ id, canal, publie_le }]            → pour chaque post, les échéances échues / en attente
//   … --releve=<releve.json>     releve.json = { postId, echeance, valeurs:{vues,…}, signePar, le }   → lignes contenu_mesures
//   … --attribuer=<entree.json>  entree.json = { evenements:[{id,le}], posts:[{id,ligne,canal,publie_le}], fenetreH }  → estimation par ligne
// Codes : 0 fait ; 1 entrée refusée (motif sur la sortie) ; 2 usage.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export const ECHEANCES = Object.freeze(['H+1', 'H+24', 'J+7'])

function options(argv) {
  const o = {}
  for (const a of argv) {
    const m = /^--([a-z-]+)=(.*)$/.exec(a)
    if (m) o[m[1]] = m[2]
    else o._inconnue = a
  }
  return o
}

function lireJson(chemin) {
  return JSON.parse(fs.readFileSync(chemin, 'utf8'))
}

export async function executer(argv, sortie = (v) => console.log(JSON.stringify(v, null, 2))) {
  const o = options(argv)
  if (o._inconnue || !(o.plan || o.releve || o.attribuer)) {
    console.error('usage : mesurer.mjs --plan=<posts.json> | --releve=<releve.json> | --attribuer=<entree.json> [--maintenant=<ISO>]')
    return 2
  }
  const mesure = await import('@/lib/contenu/mesure')
  try {
    if (o.plan) {
      const t = o.maintenant ? Date.parse(o.maintenant) : Date.now()
      if (!Number.isFinite(t)) { sortie({ ok: false, motif: '--maintenant illisible' }); return 1 }
      const posts = lireJson(o.plan)
      sortie({ ok: true, plan: posts.map((p) => ({ id: p.id, echeances: mesure.planMesures(p.publie_le, t) })) })
      return 0
    }
    if (o.releve) {
      const r = mesure.ligneReleveManuelTikTok(lireJson(o.releve))
      sortie(r)
      return r.ok ? 0 : 1
    }
    const e = lireJson(o.attribuer)
    const r = mesure.attribuerALaLigne(e.evenements, e.posts, e.fenetreH)
    if ('ok' in r && r.ok === false) { sortie(r); return 1 }
    sortie({ ok: true, ...r, libelles: r.parLigne.map((a) => mesure.libelleAttribution(a)) })
    return 0
  } catch (err) {
    sortie({ ok: false, motif: `entrée illisible : ${String(err?.message || err).slice(0, 160)}` })
    return 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  executer(process.argv.slice(2)).then((code) => { process.exitCode = code })
}
