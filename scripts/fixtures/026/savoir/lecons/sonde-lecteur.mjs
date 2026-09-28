// scripts/fixtures/026/savoir/lecons/sonde-lecteur.mjs — sonde du branchement (SVL-9), fiche 026-234, Claude Code.
// Lancée par le juge : node --experimental-strip-types --import <ts-loader> --import <espion.mjs> <ce fichier> <config>,
// cwd = une COPIE de la racine jugée (le bac), ESPION_OUVERTURES = le dossier des leçons du bac. Pour chaque étape :
// pose l'interrupteur `lecons_dans_consignes` dans <bac>/docs/savoir/reglages.json, remplit (ou vide) <bac>/docs/savoir/
// lecons/, marque le journal de l'espion, crée le lecteur par lib/agents/llm.ts DU BAC (deps injectées : jamais
// process.env, jamais un vrai moteur), l'appelle, puis relève ce que les doublures ont REÇU : l'entrée standard du faux
// lanceur (Codex) ou le corps envoyé au faux freellmapi (deps.fetch). Écrit les résultats bruts dans config.sortie.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const out = { nonce: cfg.nonce, etapes: {}, erreurs: [] }
const marque = (e) => { if (typeof globalThis.__espionMarque === 'function') globalThis.__espionMarque(e) }

let LLM = null
try { LLM = await import(pathToFileURL(cfg.llm).href) } catch (e) { out.erreurImport = `import ${cfg.llm} : ${e?.message || e}` }

let journalCourant = ''
let corpsCourants = []
function lancer(commande, args = [], options = {}) {
  const estMjs = /\.mjs$/i.test(String(commande))
  const env = { ...(options?.env || {}), SYSTEMROOT: process.env.SYSTEMROOT || '', FAUX_LANCEUR_JOURNAL: journalCourant, FAUX_LANCEUR_SCENARIOS: '["propre"]', FAUX_LANCEUR_CONTENU: '{"classe":"oui"}' }
  return spawn(estMjs ? process.execPath : commande, estMjs ? [commande, ...(args || [])] : (args || []), { ...(options || {}), env, windowsHide: true })
}
async function fauxFetch(url, init = {}) {
  corpsCourants.push({ url: String(url), corps: typeof init.body === 'string' ? init.body : String(init.body ?? '') })
  return new Response(JSON.stringify({ choices: [{ message: { content: '{"classe":"oui"}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
}

function poserReglage(allume) {
  const r = JSON.parse(fs.readFileSync(cfg.reglages, 'utf8'))
  r.interrupteurs = r.interrupteurs || {}
  r.interrupteurs.lecons_dans_consignes = allume
    ? { actif: true, depuis: '2026-09-28', accord: 'essai du juge savoir-lecons-qa' }
    : { actif: false, depuis: null, accord: null }
  fs.writeFileSync(cfg.reglages, `${JSON.stringify(r, null, 2)}\n`)
}
function poserLecons(quoi) {
  fs.rmSync(cfg.dossierLecons, { recursive: true, force: true })
  fs.mkdirSync(cfg.dossierLecons, { recursive: true })
  if (quoi === 'essai') for (const [nom, contenu] of Object.entries(cfg.lecons)) fs.writeFileSync(path.join(cfg.dossierLecons, nom), contenu)
}

if (LLM) {
  for (const e of cfg.etapes) {
    const r = { entrees: [], corps: [], resultats: [] }
    out.etapes[e.nom] = r
    try {
      poserReglage(e.allume)
      poserLecons(e.lecons)
      journalCourant = path.join(cfg.travail, `lanceur-${e.nom}.json`)
      corpsCourants = []
      const env = { PATH: process.env.PATH || '', HOME: process.env.HOME || process.env.USERPROFILE || '', LANG: 'fr_FR.UTF-8' }
      if (e.moteur === 'codex') env.CODEX_LANCEUR = cfg.lanceur
      else env.FREELLMAPI_URL = 'http://127.0.0.1:9'
      const deps = { env, lancer, fetch: fauxFetch, enregistrerCout: async () => ({ ok: true }), attendre: async () => undefined }
      marque(`avant:${e.nom}`)
      const lecteur = LLM.creerLecteur(e.agent, {}, deps)
      marque(`cree:${e.nom}`)
      if (!lecteur) { r.nul = true; continue }
      for (let i = 0; i < (e.appels || 1); i++) {
        try { r.resultats.push({ ok: true, valeur: await lecteur(cfg.systeme, cfg.donnees) }) } catch (x) { r.resultats.push({ ok: false, erreur: String(x?.message || x) }) }
      }
      marque(`fin:${e.nom}`)
      try { r.entrees = JSON.parse(fs.readFileSync(journalCourant, 'utf8')).map((x) => x.entree) } catch { r.entrees = [] }
      r.corps = corpsCourants
    } catch (x) {
      out.erreurs.push(`${e.nom} : ${x?.message || x}`)
    }
  }
}
fs.writeFileSync(cfg.sortie, JSON.stringify(out))
