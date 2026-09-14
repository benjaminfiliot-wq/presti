// scripts/photos-lot-qa.mjs — le juge de la tâche 018-06 : un lot de NOUVELLES photos pour la démo Lestraque, en réserve.
// Pourquoi : après la vague 2, l'escalier revient quatre fois sur l'accueil et la cuisine trois fois, et deux des quatre
// « ouvrages finis » sont faibles (penderie vide, boiserie). Il faut d'autres ouvrages, sans rien brancher encore.
// Contrôles, sur les bases qui ne figuraient pas dans .orchestre/preuves/018-06/avant-bases.json :
//   1. au moins 4 nouvelles bases, chacune décrite dans .orchestre/preuves/018-06/proposition.json avec un sujet d'ouvrage
//      fini (pas d'outil) et une légende courte ;
//   2. licence CC0, domaine public ou CC BY — jamais SA (la démo est filmée pour la vidéo de la landing) ;
//   3. original d'au moins 2400 px de large, fichiers 480/1600 en WebP et 1600/2400 en AVIF présents et non vides ;
//   4. source = page d'un fichier Wikimedia Commons, auteur et titre renseignés, retouche signalée (modifiee) ;
//   5. usage = « reserve » : aucune page ne doit les afficher avant le branchement (et generer.mjs ne lit pas cette valeur) ;
//   6. provenance prouvée par scripts/photos-provenance.mjs lestraque (API Commons + empreinte perceptuelle) ;
//   7. étalonnage cohérent : chaque nouvelle photo à ±6 de la médiane du b* moyen (Lab) des photos en place, et au plus
//      8 d'écart entre les nouvelles (les photos en place ont déjà leur propre écart, que la tâche ne peut pas corriger) ;
//   8. aucun doublon : empreinte dHash à au moins 10 bits de toute autre photo du site ;
//   9. une planche de choix non vide (.orchestre/preuves/018-06/planche.jpg), pour que Claude Code regarde avant de brancher.
//
// Usage : node scripts/photos-lot-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = path.join(R, 'public', 'sites-demo', 'lestraque')
const PREUVES = path.join(R, '.orchestre', 'preuves', '018-06')
const echecs = []
const SUJETS = ['escalier', 'bibliotheque', 'dressing', 'cuisine', 'porte', 'parquet', 'agencement', 'meuble', 'placard', 'verriere', 'terrasse', 'bardage', 'fenetre', 'table', 'banc', 'etagere']

const lireJson = (f, defaut) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return defaut } }
const avant = lireJson(path.join(PREUVES, 'avant-bases.json'), null)
if (!avant) { console.log('✗ lot de photos : FAIL — avant-bases.json absent (photographie de départ)'); process.exit(1) }
const attributions = lireJson(path.join(SITE, 'attributions.json'), [])
const parBase = new Map()
for (const e of attributions) { if (!parBase.has(e.base)) parBase.set(e.base, []); parBase.get(e.base).push(e) }
const nouvelles = [...parBase.keys()].filter((b) => !avant.bases.includes(b))
const proposition = lireJson(path.join(PREUVES, 'proposition.json'), null)

if (nouvelles.length < 4) echecs.push(`${nouvelles.length} nouvelle(s) base(s) dans attributions.json, au moins 4 attendues`)
if (!Array.isArray(proposition)) echecs.push('proposition.json absent ou pas un tableau [{ base, sujet, legende }]')

// Les photos en réserve ne doivent être ni affichées ni créditées par les pages générées. On le vérifie sur les pages
// elles-mêmes : chercher le mot « reserve » dans generer.mjs était faux, puisque depuis le 14/09/2026 le générateur le lit
// précisément pour les écarter (usage !== 'reserve').
const pagesHtml = []
const parcourir = (d) => { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory() && x.name !== 'images') parcourir(p); else if (x.name.endsWith('.html')) pagesHtml.push(p) } }
parcourir(SITE)
for (const base of nouvelles) {
  const e = parBase.get(base)[0]
  const fuites = pagesHtml.filter((p) => { const t = fs.readFileSync(p, 'utf8'); return t.includes(`images/${base}-`) || (e.auteur && t.includes(e.auteur) && !attributions.some((a) => a.usage !== 'reserve' && a.auteur === e.auteur)) })
  if (fuites.length) echecs.push(`« ${base} » est en réserve mais apparaît dans ${fuites.map((p) => path.relative(SITE, p)).join(', ')} (image ou crédit)`)
}

for (const base of nouvelles) {
  const e = parBase.get(base)[0]
  const ou = `« ${base} »`
  if (/\bSA\b|BY-SA/i.test(e.licence || '')) echecs.push(`${ou} : licence ${e.licence} interdite (pas de SA)`)
  if (!/^(CC0|CC0 1\.0|domaine public|public domain|CC BY \d\.\d)$/i.test(String(e.licence || '').trim())) echecs.push(`${ou} : licence « ${e.licence} » hors liste (CC0, domaine public, CC BY)`)
  if (!(e.largeur_source >= 2400)) echecs.push(`${ou} : original de ${e.largeur_source} px, au moins 2400 attendus`)
  if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(e.source || '')) echecs.push(`${ou} : source attendue sur une page de fichier Wikimedia Commons`)
  if (!e.auteur || !e.titre_commons) echecs.push(`${ou} : auteur ou titre Commons manquant`)
  if (!e.modifiee) echecs.push(`${ou} : retouche non signalée (champ modifiee)`)
  for (const x of parBase.get(base)) if (x.usage !== 'reserve') { echecs.push(`${ou} : usage « ${x.usage} », attendu « reserve »`); break }
  for (const f of [`${base}-480.webp`, `${base}-1600.webp`, `${base}-1600.avif`, `${base}-2400.avif`]) {
    const p = path.join(SITE, 'images', f)
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) echecs.push(`${ou} : images/${f} absent ou vide`)
  }
  if (Array.isArray(proposition)) {
    const p = proposition.find((x) => x && x.base === base)
    if (!p) echecs.push(`${ou} : absente de proposition.json`)
    else {
      if (!SUJETS.includes(p.sujet)) echecs.push(`${ou} : sujet « ${p.sujet} » hors liste (${SUJETS.join(', ')})`)
      if (typeof p.legende !== 'string' || p.legende.length < 5 || p.legende.length > 70) echecs.push(`${ou} : légende de 5 à 70 caractères attendue`)
    }
  }
}
if (Array.isArray(proposition)) {
  const ouvrages = proposition.filter((p) => p && nouvelles.includes(p.base) && SUJETS.includes(p.sujet))
  if (new Set(ouvrages.map((p) => p.sujet)).size < 3) echecs.push('proposition.json : au moins trois sujets d\'ouvrages différents attendus (pas quatre escaliers)')
}

// 6. provenance
const prov = spawnSync(process.execPath, [path.join(R, 'scripts', 'photos-provenance.mjs'), 'lestraque'], { cwd: R, encoding: 'utf8', timeout: 10 * 60_000 })
if (prov.status !== 0) echecs.push(`photos-provenance.mjs lestraque : code ${prov.status} — ${`${prov.stdout || ''}${prov.stderr || ''}`.trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`)

// 7 et 8. étalonnage et doublons, sur les vignettes 480 de toutes les bases (hors portrait)
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
async function mesurer(base) {
  const p = path.join(SITE, 'images', `${base}-480.webp`)
  if (!fs.existsSync(p)) return null
  const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let somme = 0, n = 0
  for (let i = 0; i < data.length; i += info.channels * 4) {
    const r = lin(data[i]), g = lin(data[i + 1]), b = lin(data[i + 2])
    const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
    const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
    somme += 200 * (f(Y) - f(Z)); n++
  }
  const petit = await sharp(p).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let bits = ''
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += petit[y * 9 + x] < petit[y * 9 + x + 1] ? '1' : '0'
  return { bMoyen: somme / n, empreinte: bits }
}
const mesures = {}
for (const base of [...parBase.keys()].filter((b) => !/-portrait$/.test(b))) {
  const m = await mesurer(base)
  if (m) mesures[base] = m
}
// Les photos déjà en place ont leur propre écart (13,3 mesuré le 14/09/2026 avant la tâche) et la tâche n'a pas le droit
// de les retoucher : la règle porte donc sur les NOUVELLES photos — chacune à ±6 de la médiane des existantes, et ≤ 8
// d'écart entre elles.
const existantes = Object.entries(mesures).filter(([b]) => !nouvelles.includes(b)).map(([, m]) => m.bMoyen).sort((a, b) => a - b)
const mediane = existantes.length ? existantes[Math.floor(existantes.length / 2)] : null
const bNouvelles = nouvelles.filter((b) => mesures[b]).map((b) => [b, mesures[b].bMoyen])
console.log(`b* moyen — existantes : ${Object.entries(mesures).filter(([b]) => !nouvelles.includes(b)).map(([b, m]) => `${b} ${m.bMoyen.toFixed(1)}`).join(', ')} (médiane ${mediane === null ? '—' : mediane.toFixed(1)}) ; nouvelles : ${bNouvelles.map(([b, v]) => `${b} ${v.toFixed(1)}`).join(', ') || '—'}`)
if (mediane !== null) for (const [b, v] of bNouvelles) if (Math.abs(v - mediane) > 6) echecs.push(`étalonnage : « ${b} » à b* ${v.toFixed(1)}, trop loin de la médiane des photos en place (${mediane.toFixed(1)} ± 6)`)
if (bNouvelles.length > 1) {
  const vals = bNouvelles.map(([, v]) => v)
  const ecart = Math.max(...vals) - Math.min(...vals)
  if (ecart > 8) echecs.push(`étalonnage : écart de b* ${ecart.toFixed(1)} entre les nouvelles photos (≤ 8 attendu)`)
}
const distance = (a, b) => [...a].filter((c, i) => c !== b[i]).length
for (const base of nouvelles) {
  if (!mesures[base]) continue
  for (const [autre, m] of Object.entries(mesures)) {
    if (autre === base) continue
    const d = distance(mesures[base].empreinte, m.empreinte)
    if (d < 10) echecs.push(`« ${base} » ressemble trop à « ${autre} » (dHash à ${d} bits) : doublon probable`)
  }
}

// 10. les photos en place n'ont pas bougé : mêmes empreintes de fichiers et mêmes entrées d'attribution qu'au relevé pris
// avant la tâche (avant-empreintes.json, 14/09/2026 vers 21 h 57). L'outil de mesure dit que leur écart d'étalonnage est
// trop grand : ce n'est pas à cette tâche de les retoucher — la démo en refonte les affiche.
const empreintesAvant = lireJson(path.join(PREUVES, 'avant-empreintes.json'), null)
if (!empreintesAvant) echecs.push('avant-empreintes.json absent (relevé de départ des images en place)')
else {
  const { createHash } = await import('node:crypto')
  const sha1 = (buf) => createHash('sha1').update(buf).digest('hex')
  const touchees = []
  for (const [f, h] of Object.entries(empreintesAvant.fichiers)) {
    const p = path.join(SITE, 'images', f)
    if (!fs.existsSync(p)) touchees.push(`${f} supprimé`)
    else if (sha1(fs.readFileSync(p)) !== h) touchees.push(`${f} modifié`)
  }
  if (touchees.length) echecs.push(`photos en place retouchées ou supprimées (interdit) : ${touchees.slice(0, 8).join(', ')}${touchees.length > 8 ? ` … (${touchees.length})` : ''}`)
  const entreesAvant = attributions.filter((e) => avant.bases.includes(e.base))
  if (sha1(JSON.stringify(entreesAvant)) !== empreintesAvant.attributions) echecs.push('entrées d\'attribution des photos en place modifiées (interdit : ne toucher qu\'aux nouvelles entrées)')
}

// 9. planche
const planche = path.join(PREUVES, 'planche.jpg')
if (!fs.existsSync(planche) || fs.statSync(planche).size < 50_000) echecs.push('planche.jpg absente ou trop légère (< 50 Ko)')

console.log(echecs.length ? `✗ lot de photos : FAIL — ${echecs.join(' ; ')}` : `✓ lot de photos : PASS — ${nouvelles.length} nouvelles photos en réserve (${nouvelles.join(', ')}), licences sans SA, provenance prouvée, étalonnage et doublons vérifiés`)
process.exitCode = echecs.length ? 1 : 0
