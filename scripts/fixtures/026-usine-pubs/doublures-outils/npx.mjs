// Doublure de `npx` (usine-pubs-qa) : `npx [--yes] hyperframes[@version] <args>` passe la main à la doublure de hyperframes ; tout autre paquet échoue
// (aucun paquet ne se télécharge jamais pendant l'essai). Sans hyperframes dans le PATH du bac, npx n'y est pas non plus.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lireConfig, noter } from './commun.mjs'

const [, , cfgChemin, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
const reste = argv.filter((a, i) => !(a.startsWith('-') && i < argv.findIndex((x) => !x.startsWith('-'))))
const paquet = reste[0] ?? ''
noter(cfg, 'npx', { argv, paquet })
if (/^hyperframes(@.+)?$/.test(paquet)) {
  const r = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'hyperframes.mjs'), cfgChemin, ...reste.slice(1)], { stdio: 'inherit' })
  process.exitCode = r.status ?? 1
} else { console.error(`npx : ${paquet || '(rien)'} : aucun paquet ne se télécharge pendant l'essai`); process.exitCode = 1 }
