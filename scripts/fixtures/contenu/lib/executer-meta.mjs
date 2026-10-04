// scripts/fixtures/contenu/lib/executer-meta.mjs — enfant DÉDIÉ à `lib/contenu/metaPublier.ts` (partie « meta »,
// fiche 026-204). `publierMeta(variante, ctx, reseau, deps)` prend un `reseau` fait de DEUX fonctions
// (creerConteneur, publier) : un objet que executer.mjs (générique, config JSON) ne peut pas transporter, une
// fonction ne se sérialise pas. `reseauScenario` ('ok' | 'erreur-conteneur' | 'erreur-publier') choisit ICI, DANS
// L'ENFANT, quel faux `reseau` construire ; les deux appels sont comptés et rendus (`appelsReseau`) pour que le
// juge vérifie l'idempotence (MP-4 : un post déjà publié ne relance aucun appel) sans jamais parler à un vrai Graph.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { installerPause } from './pause.mjs'

const [, , cfgPath] = process.argv
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const pause=installerPause(cfg)
const sortie = { nonce: cfg.nonce, erreurImport: null, exception: null, valeur: null, appelsReseau: { creerConteneur: 0, publier: 0 } }
function ecrire() { fs.writeFileSync(cfg.sortie, JSON.stringify(sortie)) }

function resoudre(racineEff, moduleRel) {
  const base = path.join(racineEff, moduleRel)
  for (const ext of ['', '.ts', '.tsx', '.mjs', '.js']) {
    const p = base + ext
    try { if (fs.statSync(p).isFile()) return p } catch { /* candidat suivant */ }
  }
  return null
}

function reseauPour(scenario) {
  return {
    async creerConteneur() {
      sortie.appelsReseau.creerConteneur++
      if(scenario==='pause-apres-conteneur')pause.active=true
      if (scenario === 'erreur-conteneur') return { erreur: 'conteneur refusé (essai)', status: 400 }
      return { id: 'conteneur-essai-1' }
    },
    async publier() {
      sortie.appelsReseau.publier++
      if (scenario === 'erreur-publier') return { erreur: 'publication refusée (essai)', status: 500 }
      return { url: 'https://exemple.invalid/publication-essai' }
    },
  }
}

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
  const deps = { env, coutEuros: 'coutEuros' in cfg ? cfg.coutEuros : 0, opposition: cfg.opposition===true, enregistrerCout: async () => ({ ok: true }), verifierPlafond: async () => true, maintenant: () => Date.now(), attendre: async () => {} }

  try {
    sortie.valeur = await fn(cfg.variante, cfg.ctx, reseauPour(cfg.reseauScenario || 'ok'), deps)
  } catch (e) {
    sortie.exception = String(e?.stack || e?.message || e).slice(0, 2000)
  }
  ecrire()
}
main()
