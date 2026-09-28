// scripts/fixtures/contenu/lib/executer-exports.mjs — enfant DÉDIÉ à la lecture d'exports CONSTANTS (pas une
// fonction à appeler : `OPTIONS_DECISION`, `DEFAUT`, `PORTEE` de lib/contenu/accord.ts par exemple). Importe le
// module désigné et rend, sous `valeur`, un objet { nomExport: valeur } pour chaque nom demandé — jamais un appel,
// jamais un effet de bord. Un nom absent du module rend `undefined` (le critère appelant le remarque lui-même).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [, , cfgPath] = process.argv
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const sortie = { nonce: cfg.nonce, erreurImport: null, exception: null, valeur: null }
function ecrire() { fs.writeFileSync(cfg.sortie, JSON.stringify(sortie)) }

function resoudre(racineEff, moduleRel) {
  const base = path.join(racineEff, moduleRel)
  for (const ext of ['', '.ts', '.tsx', '.mjs', '.js']) {
    const p = base + ext
    try { if (fs.statSync(p).isFile()) return p } catch { /* candidat suivant */ }
  }
  return null
}

async function main() {
  const fichier = resoudre(cfg.racineEff, cfg.moduleRel)
  if (!fichier) { sortie.erreurImport = `${cfg.moduleRel} introuvable sous ${cfg.racineEff}`; ecrire(); return }
  let mod
  try { mod = await import(pathToFileURL(fichier).href) } catch (e) { sortie.erreurImport = String(e?.stack || e?.message || e).slice(0, 2000); ecrire(); return }
  try {
    const valeur = {}
    for (const nom of cfg.noms || []) valeur[nom] = mod?.[nom]
    sortie.valeur = valeur
  } catch (e) {
    sortie.exception = String(e?.stack || e?.message || e).slice(0, 2000)
  }
  ecrire()
}
main()
