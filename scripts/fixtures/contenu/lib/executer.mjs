// scripts/fixtures/contenu/lib/executer.mjs — l'enfant partagé de contenu-qa.mjs (fiche 026-204). Lancé avec
// `--import ts-loader.mjs`, `cwd = racineEff` (donc `@/lib/...` s'y résout, en particulier `@/lib/agents/llm` : le
// vrai module, déjà PASS). Importe le fichier désigné par `moduleRel` (chemin relatif à `racineEff`, sans extension :
// l'extension réelle — .ts, .mjs — est cherchée sur le disque ICI, jamais devinée par le loader pour un chemin déjà
// absolu), appelle `mod[fonction](...args, deps)` où `deps` est construit PAR CE fichier (jamais reçu par JSON : une
// fonction ne se sérialise pas) — `env` (réduit à PATH/HOME/LANG/TZ + `depsEnv` du config), `enregistrerCout` (une
// doublure qui consigne et rend toujours { ok: true }, jamais un vrai Supabase), `maintenant`/`attendre` (horloge
// réelle mais `attendre` ne fait pas de vraie pause : les critères de cette fiche ne testent pas des délais).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [, , cfgPath] = process.argv
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const sortie = { nonce: cfg.nonce, erreurImport: null, exception: null, valeur: null }

function resoudre(racineEff, moduleRel) {
  const base = path.join(racineEff, moduleRel)
  for (const ext of ['', '.ts', '.tsx', '.mjs', '.js']) {
    const p = base + ext
    try { if (fs.statSync(p).isFile()) return p } catch { /* candidat suivant */ }
  }
  return null
}

const appels = []
async function enregistrerCoutDoublure(agent, montant, detail) { appels.push({ agent, montant, detail }); return { ok: true } }

async function main() {
  const fichier = resoudre(cfg.racineEff, cfg.moduleRel)
  if (!fichier) { sortie.erreurImport = `${cfg.moduleRel} introuvable sous ${cfg.racineEff}`; ecrire(); return }
  let mod
  try { mod = await import(pathToFileURL(fichier).href) } catch (e) { sortie.erreurImport = String(e?.stack || e?.message || e).slice(0, 2000); ecrire(); return }
  const fn = mod?.[cfg.fonction]
  if (typeof fn !== 'function') { sortie.erreurImport = `${cfg.moduleRel} n'exporte pas de fonction « ${cfg.fonction} »`; ecrire(); return }

  const garder = ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'LANG', 'TZ']
  const env = {}
  for (const k of garder) if (process.env[k] !== undefined) env[k] = process.env[k]
  Object.assign(env, cfg.depsEnv || {})
  const deps = { env, enregistrerCout: enregistrerCoutDoublure, maintenant: () => Date.now(), attendre: async () => {} }

  try {
    sortie.valeur = await fn(...(cfg.args || []), deps)
  } catch (e) {
    sortie.exception = String(e?.stack || e?.message || e).slice(0, 2000)
  }
  sortie.appelsCout = appels
  ecrire()
}
function ecrire() { fs.writeFileSync(cfg.sortie, JSON.stringify(sortie)) }
main()
