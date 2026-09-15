// scripts/eclate-rendu-qa.mjs — le juge de la tâche 021-04 : le rendu Blender de la marche éclatée, « Anatomie d'une marche »
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.4 A et §6.4 OB-1 à OB-8). Il lit les sorties de
// .orchestre/preuves/021-04/ ; il ne lance pas Blender.
//   OB-1 fichiers et eclate.json : assemble.avif, eclate.avif, les quatre calques, eclate.json ; 4 pièces exactement (limon,
//        marche, contremarche, vis) ; fractions dans [0 ; 1] ; 5 étiquettes aux textes du cahier ; cote « 40 mm » ;
//   OB-2 calques avec canal alpha et au moins 1 % de pixels transparents ; assemble.avif et eclate.avif en 1400 × 1050 ;
//   OB-3 poids total des AVIF ≤ 60 000 octets (plafond rouvert pour un tronçon de trois marches, decisions.md) ;
//   OB-4 composite des calques (chaque calque dans sa boîte, décalé de son vecteur, dans l'ordre) contre eclate.avif : part des
//        pixels écartés de plus de 24 niveaux ≤ 1 % ;
//   OB-5 aire opaque (alpha > 128) de chaque pièce ≥ 0,2 % du cadre ; le calque des vis ≥ 0,4 % ;
//   OB-6 déterminisme : rendus-bis/ (second lancement) contre rendus/ : écart moyen < 0,006 par fichier ;
//   OB-7 rapport.md ≥ 800 caractères, avec la commande Blender, la version 5.2, la graine, des médianes L*a*b* et la qualité AVIF ;
//   OB-8 le site n'est pas touché : heros-escalier-1600.avif identique au dépôt ; aucun fichier de rendu non suivi sous public/ ;
//   OB-9 teinte du chêne : ΔE00 ≤ 10 entre la médiane L*a*b* des pixels opaques de calque-marche.avif et celle de deux zones
//        de marches brunes de heros-escalier-1600.avif (zones regardées par Claude Code le 15/09 : 33,3 / 17,0 / 39,1).
//
// Usage : node scripts/eclate-rendu-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argDossier = process.argv.find((a) => a.startsWith('--dossier='))
const P = argDossier ? path.resolve(argDossier.slice('--dossier='.length)) : path.join(R, '.orchestre', 'preuves', '021-04')
const REN = path.join(P, 'rendus'), BIS = path.join(P, 'rendus-bis')
const L = 1400, H = 1050
const echecs = [], faits = []
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ rendu de la marche éclatée : FAIL — ${echecs.join(' ; ')}` : '✓ rendu de la marche éclatée : PASS — fichiers et JSON conformes, calques justes, légers, reproductibles, site intact')
  process.exitCode = echecs.length ? 1 : 0
}

const FICHIERS = ['assemble.avif', 'eclate.avif', 'calque-limon.avif', 'calque-marche.avif', 'calque-contremarche.avif', 'calque-vis.avif', 'eclate.json']
for (const f of FICHIERS) if (taille(path.join(REN, f)) <= 0) echecs.push(`OB-1 : rendus/${f} absent ou vide`)
let j = null
try { j = JSON.parse(fs.readFileSync(path.join(REN, 'eclate.json'), 'utf8')) } catch (e) { echecs.push(`OB-1 : eclate.json illisible (${e.message})`) }
const frac = (v) => typeof v === 'number' && v >= 0 && v <= 1
if (j) {
  if (!j.cadre || j.cadre.largeur !== L || j.cadre.hauteur !== H) echecs.push(`OB-1 : cadre ${JSON.stringify(j.cadre)}, 1400 × 1050 attendu`)
  const noms = (j.pieces || []).map((p) => p.nom).sort()
  if (JSON.stringify(noms) !== JSON.stringify(['contremarche', 'limon', 'marche', 'vis'])) echecs.push(`OB-1 : pièces ${noms.join(', ') || 'aucune'}, attendu limon, marche, contremarche, vis`)
  for (const p of j.pieces || []) {
    if (![p.x, p.y, p.l, p.h].every(frac)) echecs.push(`OB-1 : boîte de ${p.nom} hors de [0 ; 1]`)
    if (!Array.isArray(p.vecteur) || p.vecteur.length !== 2 || !p.vecteur.every((v) => typeof v === 'number' && Math.abs(v) <= 1)) echecs.push(`OB-1 : vecteur de ${p.nom} invalide`)
    if (!Number.isInteger(p.ordre)) echecs.push(`OB-1 : ordre de ${p.nom} non entier`)
    if (!FICHIERS.includes(p.fichier)) echecs.push(`OB-1 : fichier de ${p.nom} inattendu (${p.fichier})`)
  }
  const TEXTES = ['Contremarche', 'Entailles', 'Limon à la française', 'Marche en chêne, 40 mm', 'Vis']
  const textes = (j.etiquettes || []).map((e) => e.texte).sort()
  if (JSON.stringify(textes) !== JSON.stringify(TEXTES)) echecs.push(`OB-1 : étiquettes ${textes.join(' | ') || 'aucune'}, attendu ${TEXTES.join(' | ')}`)
  for (const e of j.etiquettes || []) if (!frac(e.x) || !frac(e.y)) echecs.push(`OB-1 : point de l'étiquette « ${e.texte} » hors de [0 ; 1]`)
  if (!j.cote || j.cote.texte !== '40 mm' || ![j.cote.x1, j.cote.y1, j.cote.x2, j.cote.y2].every(frac)) echecs.push('OB-1 : cote « 40 mm » absente ou hors de [0 ; 1]')
}
if (echecs.length) { fin(); process.exit(1) }

// OB-2, OB-3, OB-5
let totalAvif = 0
for (const f of FICHIERS.filter((x) => x.endsWith('.avif'))) totalAvif += taille(path.join(REN, f))
faits.push(`poids total des AVIF : ${totalAvif} octets`)
if (totalAvif > 60000) echecs.push(`OB-3 : ${totalAvif} octets d'AVIF, 60 000 au plus`)
for (const f of ['assemble.avif', 'eclate.avif']) {
  const m = await sharp(path.join(REN, f)).metadata()
  if (m.width !== L || m.height !== H) echecs.push(`OB-2 : ${f} en ${m.width} × ${m.height}, 1400 × 1050 attendu`)
}
const calques = []
for (const p of [...j.pieces].sort((a, b) => a.ordre - b.ordre)) {
  const f = path.join(REN, p.fichier), m = await sharp(f).metadata()
  const bw = Math.max(1, Math.round(p.l * L)), bh = Math.max(1, Math.round(p.h * H))
  const { data } = await sharp(f).resize(bw, bh, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, opaque = 0
  for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) transparent++; if (data[i] > 128) opaque++ }
  if (!m.hasAlpha) echecs.push(`OB-2 : ${p.fichier} sans canal alpha`)
  else if (transparent / (bw * bh) < 0.01) echecs.push(`OB-2 : ${p.fichier} a ${(100 * transparent / (bw * bh)).toFixed(2)} % de pixels transparents, 1 % au moins`)
  const aire = opaque / (L * H), mini = p.nom === 'vis' ? 0.004 : 0.002
  faits.push(`${p.nom} : aire opaque ${(100 * aire).toFixed(2)} % du cadre`)
  if (aire < mini) echecs.push(`OB-5 : ${p.nom} couvre ${(100 * aire).toFixed(2)} % du cadre, ${(100 * mini).toFixed(1)} % au moins`)
  calques.push({ p, bw, bh, buf: await sharp(f).resize(bw, bh, { fit: 'fill' }).png().toBuffer() })
}

// OB-4 : composite des calques éclatés sur le fond d'eclate.avif
const verite = await sharp(path.join(REN, 'eclate.avif')).flatten({ background: '#000' }).resize(L, H).raw().toBuffer({ resolveWithObject: true })
const fond = { r: verite.data[0], g: verite.data[1], b: verite.data[2] }
const poses = []
for (const { p, bw, bh, buf } of calques) {
  // la part du calque éclaté qui tombe dans le cadre (sharp refuse un calque qui déborde)
  const lx = Math.round((p.x + p.vecteur[0]) * L), ly = Math.round((p.y + p.vecteur[1]) * H)
  const ix = Math.max(0, -lx), iy = Math.max(0, -ly), w = Math.min(bw - ix, L - Math.max(0, lx)), h = Math.min(bh - iy, H - Math.max(0, ly))
  if (w <= 0 || h <= 0) { echecs.push(`OB-4 : le calque ${p.nom} éclaté sort entièrement du cadre`); continue }
  poses.push({ input: await sharp(buf).extract({ left: ix, top: iy, width: w, height: h }).png().toBuffer(), left: Math.max(0, lx), top: Math.max(0, ly) })
}
const comp = await sharp({ create: { width: L, height: H, channels: 3, background: fond } }).composite(poses).removeAlpha().raw().toBuffer()
let ecartes = 0
for (let i = 0; i < comp.length; i += 3) if (Math.max(Math.abs(comp[i] - verite.data[i]), Math.abs(comp[i + 1] - verite.data[i + 1]), Math.abs(comp[i + 2] - verite.data[i + 2])) > 24) ecartes++
const partEcartes = ecartes / (L * H)
faits.push(`composite des calques contre eclate.avif : ${(100 * partEcartes).toFixed(2)} % de pixels écartés`)
if (partEcartes > 0.01) echecs.push(`OB-4 : ${(100 * partEcartes).toFixed(2)} % de pixels écartés entre le composite et eclate.avif, 1 % au plus`)

// OB-10 : rien de coupé par le cadre. Dans les deux vues, la boîte de chaque calque reste à 2 % au moins des bords (1er rendu,
// 15/09 : dans l'éclaté, deux vis et le haut du limon sortaient par le bord haut)
for (const p of j.pieces) {
  for (const [vue, dx, dy] of [['assemblée', 0, 0], ['éclatée', p.vecteur[0], p.vecteur[1]]]) {
    const x0 = p.x + dx, y0 = p.y + dy, x1 = x0 + p.l, y1 = y0 + p.h
    if (x0 < 0.02 || y0 < 0.02 || x1 > 0.98 || y1 > 0.98) echecs.push(`OB-10 : vue ${vue}, ${p.nom} touche ou dépasse le bord du cadre (boîte ${x0.toFixed(3)}–${x1.toFixed(3)} × ${y0.toFixed(3)}–${y1.toFixed(3)}, marge de 0,02 attendue)`)
  }
}
// OB-11 : pas de trou noir dans le bois. Pixels opaques quasi noirs (L* < 8) ≤ 1 % de chaque calque de bois (1er rendu : les
// entailles traversaient le limon de part en part et laissaient des triangles noirs)
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
for (const nom of ['limon', 'contremarche', 'marche']) {
  const { data } = await sharp(path.join(REN, `calque-${nom}.avif`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let opaques = 0, noirs = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 200) continue
    opaques++
    const Y = 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2])
    if (116 * (Y > 216 / 24389 ? Math.cbrt(Y) : (24389 / 27 * Y + 16) / 116) - 16 < 8) noirs++
  }
  const part = opaques ? noirs / opaques : 1
  faits.push(`${nom} : ${(100 * part).toFixed(2)} % de pixels quasi noirs`)
  if (part > 0.01) echecs.push(`OB-11 : ${nom} a ${(100 * part).toFixed(1)} % de pixels quasi noirs (trou, entaille traversante ou face non éclairée), 1 % au plus`)
}

// OB-9 : la teinte du chêne, contre les marches de la photo du héros
const versLab = (r, g, b) => {
  const Rl = lin(r), G = lin(g), B = lin(b)
  const X = (0.4124 * Rl + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * Rl + 0.7152 * G + 0.0722 * B, Z = (0.0193 * Rl + 0.1192 * G + 0.9505 * B) / 1.08883
  const t = (v) => (v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116)
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))]
}
const mediane = (v) => { const s = Float64Array.from(v).sort(); return s[Math.floor(s.length / 2)] }
const medianeLab = (pixels) => [0, 1, 2].map((k) => mediane(pixels.map((p) => p[k])))
// CIEDE2000 (Sharma, Wu et Dalal, 2005)
const de00 = ([L1, a1, b1], [L2, a2, b2]) => {
  const rad = Math.PI / 180, deg = 180 / Math.PI
  const Cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2)
  const teinte = (b, a) => { if (a === 0 && b === 0) return 0; const h = Math.atan2(b, a) * deg; return h < 0 ? h + 360 : h }
  const h1p = teinte(b1, a1p), h2p = teinte(b2, a2p)
  let dhp = 0
  if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360 }
  const dLp = L2 - L1, dCp = C2p - C1p, dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad)
  const Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2
  let hm = h1p + h2p
  if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hm += hm < 360 ? 360 : -360; hm /= 2 }
  const Tt = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * Tt
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 - Math.sin(2 * dTheta * rad) * Rc * (dCp / Sc) * (dHp / Sh))
}
const ZONES_MARCHES = [{ x: 0.62, y: 0.28, l: 0.24, h: 0.14 }, { x: 0.50, y: 0.60, l: 0.18, h: 0.10 }]
{
  const ph = await sharp(path.join(R, 'public', 'sites-demo', 'lestraque', 'images', 'heros-escalier-1600.avif')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixPhoto = []
  for (const z of ZONES_MARCHES) {
    const x0 = Math.round(z.x * ph.info.width), y0 = Math.round(z.y * ph.info.height), w = Math.round(z.l * ph.info.width), hz = Math.round(z.h * ph.info.height)
    for (let y = y0; y < y0 + hz; y++) for (let x = x0; x < x0 + w; x++) { const k = (y * ph.info.width + x) * 3; pixPhoto.push(versLab(ph.data[k], ph.data[k + 1], ph.data[k + 2])) }
  }
  const cm = await sharp(path.join(REN, 'calque-marche.avif')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixBois = []
  for (let i = 0; i < cm.data.length; i += 4) if (cm.data[i + 3] > 200) pixBois.push(versLab(cm.data[i], cm.data[i + 1], cm.data[i + 2]))
  if (!pixBois.length) echecs.push('OB-9 : calque-marche.avif sans pixel opaque')
  else {
    const labPhoto = medianeLab(pixPhoto), labBois = medianeLab(pixBois), e = de00(labBois, labPhoto)
    faits.push(`chêne : médiane L*a*b* du rendu ${labBois.map((v) => v.toFixed(1)).join(' / ')}, des marches de la photo ${labPhoto.map((v) => v.toFixed(1)).join(' / ')}, ΔE00 ${e.toFixed(1)}`)
    if (e > 10) echecs.push(`OB-9 : le bois rendu s'écarte du chêne de la photo (ΔE00 ${e.toFixed(1)}, 10 au plus)`)
  }
}

// OB-6 : déterminisme
for (const f of FICHIERS.filter((x) => x.endsWith('.avif'))) {
  if (taille(path.join(BIS, f)) <= 0) { echecs.push(`OB-6 : rendus-bis/${f} absent (second lancement)`); continue }
  const [a, b] = await Promise.all([REN, BIS].map((d) => sharp(path.join(d, f)).flatten({ background: '#000' }).resize(160, 120, { fit: 'fill' }).greyscale().raw().toBuffer()))
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  const e = s / a.length / 255
  if (e >= 0.006) echecs.push(`OB-6 : ${f} diffère entre les deux lancements (écart ${e.toFixed(4)}, moins de 0,006)`)
}

// OB-7 : rapport
const rapport = fs.existsSync(path.join(P, 'rapport.md')) ? fs.readFileSync(path.join(P, 'rapport.md'), 'utf8') : ''
if (rapport.length < 800) echecs.push(`OB-7 : rapport.md de ${rapport.length} caractères, 800 au moins`)
for (const [nom, motif] of [['la commande Blender (--background)', /--background/], ['la version 5.2', /5\.2/], ['la graine', /graine|seed/i], ['des médianes L*a*b*', /L\*|Lab/], ['la qualité AVIF employée', /qualit[ée][^\n]{0,40}avif|avif[^\n]{0,40}(qualit|quality)/i], ['la durée des rendus', /durée/i], ['un avis sur le rendu (section « Avis »)', /^#+.*avis/im]]) if (!motif.test(rapport)) echecs.push(`OB-7 : rapport.md sans ${nom}`)

// OB-8 : le site n'est pas touché. D'autres tâches écrivent dans public/ en même temps (021-01) : le juge vise ce que 021-04
// pourrait y laisser — la photo qu'il lit, et des fichiers de rendu
const PHOTO = 'public/sites-demo/lestraque/images/heros-escalier-1600.avif'
const git = (...a) => spawnSync('git', a, { cwd: R, encoding: 'utf8' }).stdout.trim()
if (git('hash-object', PHOTO) !== git('rev-parse', `HEAD:${PHOTO}`)) echecs.push(`OB-8 : ${PHOTO} diffère du dépôt : la photo se lit, elle ne s'écrit pas`)
// public/sites-demo/lestraque/eclate/ est la recopie faite par la tâche suivante (021-22), pas une écriture de 021-04
const intrus = git('ls-files', '--others', '--exclude-standard', '--', 'public').split('\n').filter((f) => /eclate|calque-|assemble|\.blend|\.py$/i.test(f) && !f.startsWith('public/sites-demo/lestraque/eclate/'))
if (intrus.length) echecs.push(`OB-8 : fichiers de rendu sous public/ : ${intrus.join(', ')}`)

fin()
