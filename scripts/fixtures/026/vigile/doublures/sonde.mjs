// La sonde de vigile-qa (026-248) : le processus à part où le code jugé s'exécute (jamais le processus du juge). Lancée
// par le juge avec --experimental-strip-types et --import crochet.mjs, sans aucun secret :
//   1. si la configuration le demande, démarre le faux PostgREST (scripts/lib/faux-postgrest.mjs, réutilisé sans
//      modification) sur contrat-ops.json + consommer_limite + vigile_conseiller et vigile_agents (0115), et pose
//      NEXT_PUBLIC_SUPABASE_URL sur lui AVANT tout import du code jugé ;
//   2. si la configuration porte une horloge, fige Date (new Date() et Date.now()) à cet instant ;
//   3. appelle SONDES[nom](ctx) exporté par le juge, qui importe le code de la racine et rend ses OBSERVATIONS brutes
//      (le juge les compare lui-même à ses attendus, dans son propre processus) ;
//   4. écrit { nonce, resultat } dans le fichier de sortie.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const { nonce, sortie } = cfg
delete cfg.nonce
const ecrire = (o) => { fs.writeFileSync(sortie, JSON.stringify({ nonce, ...o })); process.exit(0) }
const premiere = (e) => String((e && (e.stack || e.message)) || e).split('\n').slice(0, 4).join(' | ').slice(0, 900)

globalThis.__VIGILE_QA__ = { drapeaux: {}, sources: {}, appels: [] }
let fp = null
try {
  if (cfg.postgrest) {
    const { demarrer } = await import(pathToFileURL(path.join(cfg.repo, 'scripts', 'lib', 'faux-postgrest.mjs')).href)
    const c = JSON.parse(fs.readFileSync(path.join(cfg.repo, 'scripts', 'fixtures', '026-horloge-bus', 'contrat-ops.json'), 'utf8'))
    const fonctions = { ...c.fonctions, consommer_limite: { params: [['p_cle', 'text'], ['p_max', 'integer'], ['p_fenetre_s', 'integer']] } }
    if (cfg.postgrest.conseiller !== false) fonctions.vigile_conseiller = { params: [], migration: '0115' }
    if (cfg.postgrest.agents !== false) fonctions.vigile_agents = { params: [], migration: '0115' }
    fp = await demarrer({ contrat: { ...c, fonctions }, reponses: {} })
    process.env.NEXT_PUBLIC_SUPABASE_URL = fp.url
  }
  if (cfg.horloge) {
    const T = Date.parse(cfg.horloge)
    const Reelle = Date
    class DateFigee extends Reelle { constructor(...a) { if (a.length) super(...a); else super(T) } static now() { return T } }
    globalThis.Date = DateFigee
  }
} catch (e) { if (fp) await fp.arreter().catch(() => {}); ecrire({ exception: `préparation de la sonde : ${premiere(e)}` }) }

const racine = cfg.racine
const importer = (rel) => import(pathToFileURL(path.join(racine, rel)).href)
async function lireReponse(r) {
  if (!r || typeof r.status !== 'number') return { status: null, texte: '', json: null, pasUneReponse: true }
  const texte = await r.text().catch(() => '')
  let json = null
  try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
  return { status: r.status, texte, json, entetes: Object.fromEntries(r.headers ?? []) }
}

let resultat
try {
  const juge = await import(pathToFileURL(cfg.juge).href)
  const f = juge.SONDES?.[cfg.nom]
  if (typeof f !== 'function') throw new Error(`sonde inconnue : ${cfg.nom}`)
  resultat = await f({ fp, racine, repo: cfg.repo, importer, params: cfg.params ?? {}, lireReponse, V: globalThis.__VIGILE_QA__ })
} catch (e) { if (fp) await fp.arreter().catch(() => {}); ecrire({ exception: premiere(e) }) }
if (fp) await fp.arreter().catch(() => {})
ecrire({ resultat })
