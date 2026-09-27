// La sonde des juges des droits du bus (026-038) : le processus à part où le code jugé s'exécute. Lancée par
// commun.mjs lancerSonde(), avec --experimental-strip-types et --import crochet.mjs, sans aucun secret :
//   1. démarre le faux PostgREST (scripts/lib/faux-postgrest.mjs) sur 127.0.0.1, contrat-ops.json + consommer_limite ;
//   2. pose NEXT_PUBLIC_SUPABASE_URL sur lui AVANT tout import du code jugé (lib/supabaseAdmin.ts le lit à l'import) ;
//   3. appelle SONDES[nom](ctx) exporté par le juge, qui importe le code de la racine et joue ses cas ;
//   4. écrit { nonce, resultat } dans le fichier de sortie. Le jeton est lu, puis ôté de la configuration en mémoire.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const { nonce, sortie } = cfg
delete cfg.nonce
const ecrire = (o) => { fs.writeFileSync(sortie, JSON.stringify({ nonce, ...o })); process.exit(0) }
const premiere = (e) => String((e && (e.stack || e.message)) || e).split('\n').slice(0, 3).join(' | ').slice(0, 600)

const J = (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
let fp = null
// --reel : aucun faux serveur, le code parle à la vraie base (clés passées par le juge dans l'environnement, jamais affichées)
if (!cfg.params?.reel) try {
  const { demarrer } = await import('../../../lib/faux-postgrest.mjs')
  const { lireContrat } = await import('./commun.mjs')
  fp = await demarrer({ contrat: lireContrat(), reponses: {}, compteur: () => ++J.seq })
  process.env.NEXT_PUBLIC_SUPABASE_URL = fp.url
} catch (e) { ecrire({ exception: `faux PostgREST : ${premiere(e)}` }) }

const racine = cfg.racine
const importer = (rel) => import(pathToFileURL(path.join(racine, rel)).href)
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
/** Les appels consignés depuis le rang `n` (ceux d'une étape), sous une forme lisible. */
const depuis = (n) => fp.appels.slice(n).map((a) => ({ fonction: a.fonction ?? null, table: a.table ?? null, methode: a.methode, params: a.params, statut: a.statut, faute: a.faute ?? null, rang: a.rang }))
/** Rejoue une réponse : { status, texte, json } (le corps lu une fois). */
async function lireReponse(r) {
  if (!r || typeof r.status !== 'number') return { status: null, texte: '', json: null, pasUneReponse: true }
  const texte = await r.text().catch(() => '')
  let json = null
  try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
  return { status: r.status, texte, json }
}

let resultat
try {
  const juge = await import(pathToFileURL(cfg.juge).href)
  const f = juge.SONDES?.[cfg.nom]
  if (typeof f !== 'function') throw new Error(`sonde inconnue : ${cfg.nom}`)
  resultat = await f({ fp, J, importer, racine, params: cfg.params, attendre, depuis, lireReponse })
} catch (e) { if (fp) await fp.arreter().catch(() => {}); ecrire({ exception: premiere(e) }) }
if (fp) await fp.arreter().catch(() => {})
ecrire({ resultat })
