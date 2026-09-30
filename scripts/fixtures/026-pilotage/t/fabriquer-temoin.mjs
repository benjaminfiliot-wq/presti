// scripts/fixtures/026-pilotage/t/fabriquer-temoin.mjs — refabrique ce que le témoin du lot t DÉRIVE d'ailleurs (fiche 026-171) :
//   · les thèmes station et vaisseau minimaux mais conformes (temoin/public/station/themes/<clé>/ : theme.json, licence.json,
//     atlas.png, fond.webp), tirés du thème d'essai de 026-170 (k/themes/essai) et de son bloc portrait (le bureau transposé) ;
//   · les thèmes pièges (themes-pieges/<dossier>/), pieges.json et empreintes-feuilles.json (la feuille brute synthétique) ;
//   · les trois fichiers de la référence que 026-176 retouche (temoin/lib/flags.ts, temoin/scripts/fermeture-e2e.mjs) et
//     docs/ecommerce/LISEZMOI.md, à la ligne près (les lignes sont dans outils.mjs LIGNES_ECOMMERCE, une seule source).
//
//   node scripts/fixtures/026-pilotage/t/fabriquer-temoin.mjs [--sortie=<dossier sous .orchestre/travail/>]
//   --sortie : écrit la même arborescence ailleurs (le contrôle JA-3 la compare octet pour octet à ce qui est dans le dépôt).
//
// Déterministe (le bruit est pseudo-aléatoire à graine fixe) : deux passages rendent les mêmes octets. À relancer après toute
// retouche de outils.mjs ou du thème d'essai ; le contrôle JA-3 (controles.mjs) vérifie que le témoin est à jour. Ne touche à
// aucun module (lib/pilotage/*.ts.temoin est écrit à la main). N'écrit que sous t/. Lit git en lecture seule.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { T, R, themeEssai, avecPortrait, copie, png, bruit, sha256, LIGNES_ECOMMERCE } from './outils.mjs'
import { git, exigerSousTravail } from '../a/commun.mjs'

const ARG = process.argv.slice(2).find((a) => a.startsWith('--sortie='))?.slice(9)
const OUT = ARG ? exigerSousTravail(path.resolve(R, ARG)) : T

const REFERENCE = '1c87006aa35a152cb918ab368225e1976a1328da'
const ecrire = (f, contenu) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu) }
const j = (x) => JSON.stringify(x)
/** theme.json compact : un objet par ligne dans chaque liste (les sabotages de lot.mjs visent une ligne, unique). */
function ecrireTheme(t) {
  const liste = (a, pad) => `[\n${a.map((x) => `${pad}${j(x)}`).join(',\n')}\n${pad.slice(1)}]`
  const vue = (v, pad) => `{"grille": ${j(v.grille)}, "emplacements": ${liste(v.emplacements, `${pad} `)}, "coursives": {"noeuds": ${liste(v.coursives.noeuds, `${pad}  `)}, "aretes": ${liste(v.coursives.aretes, `${pad}  `)}}}`
  const lignes = [
    '{', ` "cle": ${j(t.cle)},`, ` "nom": ${j(t.nom)},`, ` "version": ${t.version},`, ` "grille": ${j(t.grille)},`, ` "mise_en_page": ${j(t.mise_en_page)},`, ` "palette": ${j(t.palette)},`,
    ` "emplacements": ${liste(t.emplacements, '  ')},`,
    ` "coursives": {"noeuds": ${liste(t.coursives.noeuds, '   ')}, "aretes": ${liste(t.coursives.aretes, '   ')}},`,
    ` "tapis": {"trace": ${liste(t.tapis.trace, '   ')}, "etapes": ${liste(t.tapis.etapes, '   ')}},`,
    ` "defauts": ${liste(t.defauts, '  ')},`, ` "avatars": ${liste(t.avatars, '  ')},`, ` "nuit": ${t.nuit},`,
  ]
  if (t.portrait) lignes.push(` "portrait": ${vue(t.portrait, ' ')}`)
  else lignes[lignes.length - 1] = lignes.at(-1).replace(/,$/, '')
  lignes.push('}')
  return `${lignes.join('\n')}\n`
}

// ── Les deux thèmes du témoin ────────────────────────────────────────────────────────────────────────────────────────────
const essai = avecPortrait(themeEssai())
const PALETTES = {
  station: { '--mc-fond': '#750C9C', '--mc-sol': '#3A2A48', '--mc-mur': '#7A5A8C', '--mc-coursive': '#241A30', '--mc-porte': '#E0C8E8', '--mc-plaque': '#B08CC0', '--mc-ecran': '#0A2A2A', '--mc-texte': '#F0E8F4', '--mc-accent': '#C949BA', '--mc-alerte': '#E04040' },
  vaisseau: { '--mc-fond': '#0B1230', '--mc-sol': '#1B2A4A', '--mc-mur': '#4A5C8A', '--mc-coursive': '#101A38', '--mc-porte': '#A8D8F0', '--mc-plaque': '#6C8CC0', '--mc-ecran': '#062A32', '--mc-texte': '#E4F0FA', '--mc-accent': '#2EC4D6', '--mc-alerte': '#E85A5A' },
}
const NOMS = { station: 'Station de test', vaisseau: 'Vaisseau de test' }
const PACKS = [
  { dossier: '05-zwonky-spacers', titre: 'Spacers', auteur: 'zwonky', adresse: 'https://opengameart.org/content/spacers', licence: 'CC0', date: '2026-09-25' },
  { dossier: '04-rottingpixels-scifi-tileset', titre: '2D Sci-Fi Platformer Tileset [16x16]', auteur: 'Rotting Pixels', adresse: 'https://opengameart.org/content/2d-sci-fi-platformer-tileset-16x16', licence: 'CC0', date: '2026-09-25' },
]
const themeDe = (cle) => { const t = copie(essai); t.cle = cle; t.nom = NOMS[cle]; t.mise_en_page = cle === 'station' ? 'colonnes' : 'flottante'; t.palette = PALETTES[cle]; return t }
const licenceDe = (packs) => `{"packs": [\n${packs.map((p) => ` ${j(p)}`).join(',\n')}\n]}\n`
/** L'atlas composite du témoin : 96 × 48, des « tuiles » de 8 px tirées de la palette du thème (pas une feuille de pack). */
function atlasDe(cle) {
  const couleurs = Object.values(PALETTES[cle]).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])
  const a = bruit(cle === 'station' ? 11 : 22)
  const tuiles = Array.from({ length: 12 * 6 }, () => couleurs[Math.floor(a() * couleurs.length)])
  return png(96, 48, (x, y) => { const c = tuiles[Math.floor(y / 8) * 12 + Math.floor(x / 8)]; return [c[0], c[1], c[2], 255] })
}
const fondDe = (cle) => sharp({ create: { width: 320, height: 180, channels: 3, background: PALETTES[cle]['--mc-fond'] } }).webp({ quality: 60 }).toBuffer()
const bruitPng = (graine, l, h) => { const a = bruit(graine); return png(l, h, () => [Math.floor(a() * 256), Math.floor(a() * 256), Math.floor(a() * 256), 255]) }
const bruitWebp = async (graine, l, h) => { const a = bruit(graine); const b = Buffer.alloc(l * h * 3); for (let i = 0; i < b.length; i++) b[i] = Math.floor(a() * 256); return sharp(b, { raw: { width: l, height: h, channels: 3 } }).webp({ lossless: true }).toBuffer() }

const themes = {}
for (const cle of ['station', 'vaisseau']) {
  const t = themeDe(cle)
  themes[cle] = { theme: t, json: ecrireTheme(t), licence: licenceDe(PACKS), atlas: atlasDe(cle), fond: await fondDe(cle) }
  const dest = path.join(OUT, 'temoin', 'public', 'station', 'themes', cle)
  ecrire(`${dest}/theme.json.temoin`, themes[cle].json); ecrire(`${dest}/licence.json.temoin`, themes[cle].licence)
  ecrire(`${dest}/atlas.png.temoin`, themes[cle].atlas); ecrire(`${dest}/fond.webp.temoin`, themes[cle].fond)
  console.log(`✅ témoin : thème ${cle} (${themes[cle].json.length} o de theme.json, atlas ${themes[cle].atlas.length} o, fond ${themes[cle].fond.length} o)`)
}

// ── Les pièges ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const PIEGES = OUT + '/themes-pieges'
fs.rmSync(PIEGES, { recursive: true, force: true })
const base = themes.station
const feuille = bruitPng(7, 96, 96) // la « feuille brute » synthétique d'un pack : le jeu déclare son empreinte comme celle d'un fichier du lot A
const defs = []
async function piege(dossier, critere, raison, { theme = base.theme, licence = base.licence, atlas = base.atlas, fond = base.fond, extra = {}, sansLicence = false, sansFond = false } = {}) {
  const d = path.join(PIEGES, dossier)
  ecrire(`${d}/theme.json`, ecrireTheme(theme))
  if (!sansLicence) ecrire(`${d}/licence.json`, licence)
  ecrire(`${d}/atlas.png`, atlas)
  if (!sansFond) ecrire(`${d}/${extra.nomFond ?? 'fond.webp'}`, fond)
  for (const [f, c] of Object.entries(extra.fichiers ?? {})) ecrire(`${d}/${f}`, c)
  defs.push({ dossier, critere, raison })
}
const avec = (f) => { const t = copie(base.theme); f(t); return t }
await piege('sans-licence', 'TH-10', 'licence\\.json absent', { sansLicence: true })
await piege('atlas-800-ko', 'TH-9', '(?:7\\d\\d|8\\d\\d) Kio', { atlas: bruitPng(9, 484, 484) })
await piege('feuille-brute-de-pack', 'TH-10', 'feuille brute', { atlas: feuille })
await piege('reservee-avec-un-poste', 'TH-7', 'réservé.*poste|poste', { theme: avec((t) => { t.emplacements.find((e) => e.reservee).poste = { x: 416, y: 152 } }) })
await piege('reservee-en-deux-exemplaires', 'TH-7', 'réservé', { theme: avec((t) => { t.emplacements.find((e) => e.cle === 'repos').reservee = true }) })
await piege('sans-portrait', 'TH-7', 'portrait', { theme: avec((t) => { delete t.portrait }) })
await piege('vingt-emplacements-seulement', 'TH-7', '20 emplacements|emplacements, 21', { theme: avec((t) => { t.emplacements.pop() }) })
await piege('hors-du-lot-a', 'TH-10', 'hors du lot A', { licence: licenceDe([{ ...PACKS[0], dossier: '11-pack-achete' }]) })
await piege('licence-non-cc0', 'TH-10', 'CC0', { licence: licenceDe([{ ...PACKS[0], licence: 'CC-BY 4.0' }]) })
await piege('licence-sans-auteur', 'TH-10', 'auteur', { licence: licenceDe([{ ...PACKS[0], auteur: '' }]) })
await piege('licence-sans-date', 'TH-10', 'date', { licence: licenceDe([{ dossier: PACKS[0].dossier, titre: PACKS[0].titre, auteur: PACKS[0].auteur, adresse: PACKS[0].adresse, licence: 'CC0' }]) })
await piege('adresse-http-dans-le-theme', 'TH-12', 'adresse', { theme: avec((t) => { t.nom = 'https://exemple.invalid/x' }) })
await piege('starnet-dans-le-nom', 'TH-12', 'starnet', { theme: avec((t) => { t.nom = 'Station StarNet' }) })
await piege('champ-de-code', 'TH-12', 'champ de code|onclick', { theme: avec((t) => { t.emplacements[1].onclick = 'x()' }) })
await piege('fichier-executable', 'TH-12', 'ni json ni image', { extra: { fichiers: { 'theme.js': "export default {}\n" } } })
await piege('sans-fond', 'TH-9', 'fond', { sansFond: true })
const fondLourd = await bruitWebp(5, 360, 360)
if (fondLourd.length <= 200 * 1024) throw new Error(`le fond lourd ne pèse que ${fondLourd.length} o (200 Kio dépassés attendus)`)
await piege('fond-trop-lourd', 'TH-9', 'fond.*Kio', { fond: fondLourd })
ecrire(`${PIEGES}/pieges.json`, `${JSON.stringify({ _: 'Jeu d\'essai de station-themes-qa (TH-11, 026-171) : chaque dossier est un thème abîmé, refusé par le critère `critere` avec une raison qui satisfait `raison` (expression régulière, insensible à la casse). Écrit par t/fabriquer-temoin.mjs.', pieges: defs }, null, 1)}\n`)
ecrire(`${PIEGES}/empreintes-feuilles.json`, `${JSON.stringify({ _: 'Empreintes (taille:sha256) de feuilles SYNTHÉTIQUES tenues pour des feuilles brutes de packs du lot A : la feuille du piège « feuille-brute-de-pack ». Jamais une empreinte réelle.', '05-zwonky-spacers/fichiers/feuille-synthetique.png': `${feuille.length}:${sha256(feuille)}` }, null, 1)}\n`)
console.log(`✅ ${defs.length} thèmes pièges écrits`)

// ── Les fichiers de la référence que 026-176 retouche ─────────────────────────────────────────────────────────────────────
const depuisReference = (rel) => { const r = git(['show', `${REFERENCE}:${rel}`]); if (r.code !== 0) throw new Error(`${rel} illisible à ${REFERENCE.slice(0, 7)} : ${r.stderr}`); return r.stdout }
const inserer = (rel, avant, ajout) => {
  const src = depuisReference(rel)
  if (src.split(avant).length !== 2) throw new Error(`${rel} : « ${avant} » absent (ou en double) à ${REFERENCE.slice(0, 7)}`)
  const f = `${OUT}/temoin/${rel}.temoin`
  // Un autre sous-agent (B) ajoute ses routes dans la ligne `pilotage` de ce témoin : un fichier qui porte déjà nos lignes est gardé tel quel.
  if (!ARG && fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(ajout)) { console.log(`✅ ${rel} : témoin déjà à jour, conservé`); return }
  ecrire(f, src.replace(avant, () => ajout + avant))
  console.log(`✅ ${rel} dérivé de ${REFERENCE.slice(0, 7)}`)
}
inserer('lib/flags.ts', '} as const', `${LIGNES_ECOMMERCE.drapeauCommentaire}\n${LIGNES_ECOMMERCE.drapeau}\n`)
inserer('scripts/fermeture-e2e.mjs', "    'inventaireOcr':", `${LIGNES_ECOMMERCE.carte}\n`)
ecrire(`${OUT}/temoin/docs/ecommerce/LISEZMOI.md.temoin`, LIGNES_ECOMMERCE.doc)
void R
