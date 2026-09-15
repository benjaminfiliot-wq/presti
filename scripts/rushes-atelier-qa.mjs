// scripts/rushes-atelier-qa.mjs — le juge de la tâche 021-10 : les rushes d'atelier libres de droits, visionnés, pour que Benj
// choisisse sur pièces s'il veut une vraie vidéo d'atelier au bureau (cahier de la vague 5, .orchestre/preuves/021-00/
// cahier-vague-5.md, §4.1 option B, §6.7 RU-1 à RU-4 ; ref-video.md §2.1 et §2.2). Il lit .orchestre/preuves/021-10/ et les
// fichiers téléchargés sous .orchestre/travail/rushes-atelier/.
//   RU-1 rushes.json : 6 à 10 plans, pages distinctes sur la banque annoncée ; pour chacun titre, auteur, licence, citation de
//        la licence, durée, définition, sha256, visages, logos, lieu reconnaissable, outils électriques. Le fichier existe, son
//        sha256 est le bon, ffprobe confirme durée (±0,2 s) et définition, largeur ≥ 1 280 px ;
//   RU-2 licences ∈ {Pexels, Pixabay, Coverr, Mixkit Free, CC0}, cohérentes avec la banque ; aucune « Restricted » ;
//   RU-3 une planche de 8 images par plan : fichier présent, ≥ 800 px de large, pas uniforme (écart-type du gris ≥ 8) ;
//   RU-4 aucune copie d'un rush hors du dossier de travail : aucun fichier non suivi de public/ ou scripts/ n'a l'empreinte
//        d'un rush ;
//   RU-5 au moins 3 plans « mains seules » (ni visage, ni logo, ni lieu reconnaissable : la parade de ref-video.md §2.2), et
//        rapport.md ≥ 600 caractères qui nomme le plan recommandé.
//
// Usage : node scripts/rushes-atelier-qa.mjs [--dossier=<preuve>] [--travail=<dossier des rushes>]   (essais du juge)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const opt = (nom, defaut) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a ? path.resolve(a.slice(nom.length + 3)) : defaut }
const P = opt('dossier', path.join(R, '.orchestre', 'preuves', '021-10'))
const TR = opt('travail', path.join(R, '.orchestre', 'travail', 'rushes-atelier'))
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ rushes d'atelier : FAIL — ${echecs.join(' ; ')}` : '✓ rushes d\'atelier : PASS — plans vérifiés à la source, licences compatibles, planches réelles, rien dans le site, choix possibles en mains seules')
  process.exitCode = echecs.length ? 1 : 0
}
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')

let j = null
try { j = JSON.parse(fs.readFileSync(path.join(P, 'rushes.json'), 'utf8')) } catch (e) { echecs.push(`RU-1 : rushes.json illisible (${e.message})`) }
const plans = Array.isArray(j?.plans) ? j.plans : []
if (j && (plans.length < 6 || plans.length > 10)) echecs.push(`RU-1 : ${plans.length} plans, de 6 à 10 attendus`)
if (!plans.length) { fin(); process.exit(1) }

const BANQUES = { Pexels: { hote: /(^|\.)pexels\.com$/, licences: ['Pexels'] }, Pixabay: { hote: /(^|\.)pixabay\.com$/, licences: ['Pixabay'] }, Coverr: { hote: /(^|\.)coverr\.co$/, licences: ['Coverr'] }, Mixkit: { hote: /(^|\.)mixkit\.co$/, licences: ['Mixkit Free'] }, Commons: { hote: /^commons\.wikimedia\.org$/, licences: ['CC0'] } }
const texte = (v, n = 1) => typeof v === 'string' && v.trim().length >= n
const pages = new Set(), empreintes = new Set()
let mainsSeules = 0
for (const [i, p] of plans.entries()) {
  const nom = `plan ${i + 1}${texte(p.titre) ? ` « ${p.titre} »` : ''}`
  const b = BANQUES[p.banque]
  let hote = ''
  try { hote = new URL(p.page).hostname } catch {}
  if (!b) echecs.push(`RU-2 : ${nom} : banque « ${p.banque} » hors de Pexels, Pixabay, Coverr, Mixkit, Commons`)
  else {
    if (!b.hote.test(hote)) echecs.push(`RU-1 : ${nom} : la page ${p.page} n'est pas sur ${p.banque}`)
    if (!b.licences.includes(p.licence)) echecs.push(`RU-2 : ${nom} : licence « ${p.licence} » inattendue pour ${p.banque} (${b.licences.join(', ')})`)
  }
  if (pages.has(p.page)) echecs.push(`RU-1 : ${nom} : page en double`)
  pages.add(p.page)
  if (/restricted/i.test(JSON.stringify(p))) echecs.push(`RU-2 : ${nom} : mention « Restricted »`)
  for (const champ of ['titre', 'auteur', 'fichier', 'sha256', 'planche']) if (!texte(p[champ])) echecs.push(`RU-1 : ${nom} : champ ${champ} manquant`)
  if (!texte(p.citationLicence, 20)) echecs.push(`RU-1 : ${nom} : citation de la licence absente ou trop courte (relevée sur la page, le jour même)`)
  for (const champ of ['visages', 'logos', 'lieuReconnaissable', 'outilsElectriques']) if (typeof p[champ] !== 'boolean') echecs.push(`RU-1 : ${nom} : ${champ} doit valoir true ou false`)
  if (p.visages === false && p.logos === false && p.lieuReconnaissable === false) mainsSeules++
  // le fichier, à sa place, et ce qu'en dit ffprobe
  const f = path.resolve(TR, String(p.fichier || ''))
  if (!f.startsWith(TR + path.sep) || !fs.existsSync(f) || fs.statSync(f).size === 0) { echecs.push(`RU-1 : ${nom} : fichier ${p.fichier} absent de ${path.relative(R, TR)}`); continue }
  const h = sha(f)
  empreintes.add(h)
  if (h !== String(p.sha256).toLowerCase()) echecs.push(`RU-1 : ${nom} : sha256 déclaré différent du fichier`)
  const s = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }).stdout || '{}')
  const v = (s.streams || []).find((x) => x.codec_type === 'video')
  if (!v) { echecs.push(`RU-1 : ${nom} : pas de piste vidéo lisible`); continue }
  const duree = Number(s.format?.duration)
  if (!(Math.abs(duree - Number(p.duree)) <= 0.2)) echecs.push(`RU-1 : ${nom} : durée déclarée ${p.duree} s, ffprobe ${duree.toFixed(2)} s`)
  if (v.width !== p.largeur || v.height !== p.hauteur) echecs.push(`RU-1 : ${nom} : définition déclarée ${p.largeur} × ${p.hauteur}, ffprobe ${v.width} × ${v.height}`)
  if (v.width < 1280) echecs.push(`RU-1 : ${nom} : ${v.width} px de large, 1 280 au moins`)
  // RU-3
  const pl = path.join(P, String(p.planche || ''))
  if (!texte(p.planche) || !fs.existsSync(pl) || fs.statSync(pl).size === 0) { echecs.push(`RU-3 : ${nom} : planche ${p.planche} absente`); continue }
  const m = await sharp(pl).metadata(), st = await sharp(pl).greyscale().stats()
  if (m.width < 800) echecs.push(`RU-3 : ${nom} : planche de ${m.width} px de large, 800 au moins`)
  if (st.channels[0].stdev < 8) echecs.push(`RU-3 : ${nom} : planche uniforme (écart-type ${st.channels[0].stdev.toFixed(1)}) : une planche vide n'est pas une preuve`)
  faits.push(`${nom} : ${p.banque}, ${p.licence}, ${v.width} × ${v.height}, ${duree.toFixed(1)} s${p.visages === false && p.logos === false && p.lieuReconnaissable === false ? ', mains seules' : ''}`)
}

// RU-4
const nonSuivis = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'public', 'scripts'], { cwd: R, encoding: 'utf8' }).stdout.split('\n').filter((f) => /\.(mp4|webm|mov|m4v|mkv)$/i.test(f))
const copies = nonSuivis.filter((f) => empreintes.has(sha(path.join(R, f))))
if (copies.length) echecs.push(`RU-4 : rush recopié hors du dossier de travail : ${copies.join(', ')}`)

// RU-5
if (mainsSeules < 3) echecs.push(`RU-5 : ${mainsSeules} plan(s) en mains seules, 3 au moins`)
const rapport = fs.existsSync(path.join(P, 'rapport.md')) ? fs.readFileSync(path.join(P, 'rapport.md'), 'utf8') : ''
if (rapport.length < 600) echecs.push(`RU-5 : rapport.md de ${rapport.length} caractères, 600 au moins`)
if (!/recommand/i.test(rapport)) echecs.push('RU-5 : rapport.md ne nomme pas de plan recommandé')

fin()
