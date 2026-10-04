// Doublures de `scripts/studio/garde.mjs` (le VRAI garde est lancé en dessous : sa décision de code 3 est celle du dépôt) et de
// `scripts/studio/monter.mjs` (usine-pubs-qa). Le garde consigne l'état du vault au moment où il est appelé : le juge y lit que le vault était déjà
// rempli (accord, page datée, photo, préalables) et que RIEN d'autre n'avait encore été lancé.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { lireConfig, noter, existeNonVide, lireJson, ecrire, MP4, sha256, option } from './commun.mjs'

const [, , cfgChemin, nom, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)

function arbre(racine) {
  const sortie = []
  const marche = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) marche(p); else sortie.push({ chemin: path.relative(racine, p).split(path.sep).join('/'), taille: fs.statSync(p).size, sha256: sha256(fs.readFileSync(p)) }) } }
  try { marche(racine) } catch { /* vault absent */ }
  return sortie
}

if (nom === 'garde') {
  const vault = option(argv, '--vault') ? path.resolve(option(argv, '--vault')) : null
  const avant = vault ? arbre(vault) : []
  const r = spawnSync(process.execPath, [path.join(cfg.depot, 'scripts', 'studio', 'garde.mjs'), ...argv], { encoding: 'utf8', timeout: 60_000 })
  noter(cfg, 'garde', { argv, vault, vault_avant: avant, code: r.status, sortie: (r.stdout || '').trim().slice(0, 300), erreur: (r.stderr || '').trim().slice(0, 300) })
  process.stdout.write(r.stdout || '')
  process.stderr.write(r.stderr || '')
  process.exitCode = r.status ?? 1
} else {
  // monter.mjs <échantillon> : exige script.json, voix.mp3 et ../produit.jpg ; écrit sortie/echantillon.mp4
  const dossier = argv.find((a) => !a.startsWith('--')) ? path.resolve(argv.find((a) => !a.startsWith('--'))) : null
  const script = dossier ? lireJson(path.join(dossier, 'script.json')) : null
  const voix = dossier ? path.join(dossier, 'voix.mp3') : ''
  const produit = dossier ? path.join(path.dirname(dossier), 'produit.jpg') : ''
  noter(cfg, 'monter', { argv, dossier, script, voix_taille: existeNonVide(voix) ? fs.statSync(voix).size : 0, produit_sha: existeNonVide(produit) ? sha256(fs.readFileSync(produit)) : null })
  const refus = (m) => { console.error(`✗ monter.mjs : ${m}`); process.exitCode = 1 }
  if (!dossier || !script) refus('script.json absent ou illisible')
  else if (typeof script.marque !== 'string' || !script.marque.trim()) refus('script.json sans marque')
  else if (!Array.isArray(script.lignes) || !script.lignes.length || script.lignes.some((l) => typeof l !== 'string' || !l.trim())) refus('script.json : lignes vides ou absentes')
  else if (script.presentateur_virtuel === true) refus('presentateur_virtuel: true refusé')
  else if (!existeNonVide(voix)) refus('voix.mp3 absente ou vide')
  else if (!existeNonVide(produit)) refus('produit.jpg absent ou vide')
  else if (cfg.mode?.monter === 'echec') refus('échec demandé par le juge')
  else { ecrire(path.join(dossier, 'sortie', 'echantillon.mp4'), MP4(`echantillon-${script.marque}`, 6144)); console.log('monté'); process.exitCode = 0 }
}
