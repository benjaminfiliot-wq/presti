// La sonde de 026-194 : le processus à part où le code du pont s'exécute (celle de 026-038, scripts/fixtures/026-horloge-bus/
// doublures/sonde.mjs, avec le contrat du bus enrichi des fonctions du pont : station_pause_par_agent, station_consigne_par_agent,
// pilotage_attention_sources, pilotage_evenements). Lancée par commun.mjs lancerSonde(), sans aucun secret :
//   1. démarre le faux PostgREST (scripts/lib/faux-postgrest.mjs) sur 127.0.0.1 ;
//   2. pose NEXT_PUBLIC_SUPABASE_URL sur lui AVANT tout import du code jugé (lib/supabaseAdmin.ts le lit à l'import) ;
//   3. appelle SONDES[nom](ctx) exporté par le juge ;
//   4. écrit { nonce, resultat } dans le fichier de sortie.
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
try {
  const { demarrer } = await import('../../../lib/faux-postgrest.mjs')
  const { contratPont } = await import('../commun.mjs')
  fp = await demarrer({ contrat: contratPont(), reponses: {}, tables: {}, compteur: () => ++J.seq })
  process.env.NEXT_PUBLIC_SUPABASE_URL = fp.url
} catch (e) { ecrire({ exception: `faux PostgREST : ${premiere(e)}` }) }

const racine = cfg.racine
const importer = (rel) => import(pathToFileURL(path.join(racine, rel)).href)
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
  resultat = await f({ fp, J, importer, racine, params: cfg.params, lireReponse })
} catch (e) { if (fp) await fp.arreter().catch(() => {}); ecrire({ exception: premiere(e) }) }
if (fp) await fp.arreter().catch(() => {})
ecrire({ resultat })
