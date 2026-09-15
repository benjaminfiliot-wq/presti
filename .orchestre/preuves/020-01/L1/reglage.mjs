// reglage.mjs <nom…> — L1 : mesure de réglage d'une ou plusieurs variantes (sans carte graphique, 1088×800 et 1440×900),
// fusionnée dans variantes.json. « temoin » = page en ligne sans calque (pas une variante).
import fs from 'node:fs'
import { chromium, sharp, DOSSIER, bloc, ouvrir, etatPage, c2a, releve, contrasteCycle, ppcm } from './commun.mjs'
import { VARIANTES } from './variantes-def.mjs'

const noms = process.argv.slice(2)
const FICHIER = DOSSIER + 'variantes.json'
const res = { methode: 'reglage.mjs + commun.mjs ; page en ligne, chromium.launch() nu ; animations de la timeline du document figées image par image (currentTime = t ms depuis le chargement) ; C2-a PNG 2,5/5/8 s ; C2-b/C2-c relevé de 81 images JPEG 92 à 125 ms depuis 8 s ; R-12 au pas de 1 s sur ppcm(40 s, P) ; C6-a zone des marches à l’échelle', variantes: {} }
fs.mkdirSync(DOSSIER + 'variantes/', { recursive: true })
const nav = await chromium.launch()
for (const nom of noms) {
  const p = VARIANTES[nom]; if (p === undefined) throw new Error('variante inconnue ' + nom)
  const css = p ? bloc(p) : ''
  const r = { date: new Date().toISOString(), params: p, css, formats: {} }
  // à partir de V5, 1280×800 aussi (c'est là que V3 tombe sous 3,0) ; V1 à V4 : 1088×800 et 1440×900
  const formats = [{ width: 1088, height: 800 }, { width: 1440, height: 900 }]
  if (!['temoin', 'v1-rai-12s-fort', 'v2-deux-faisceaux-12s', 'v3-deux-faisceaux-10s-fort', 'v4-deux-faisceaux-8s'].includes(nom)) formats.splice(1, 0, { width: 1280, height: 800 })
  for (const vp of formats) {
    const cle = `${vp.width}x${vp.height}`, d0 = Date.now()
    const { ctx, page } = await ouvrir(nav, vp, css)
    const etat = await etatPage(page)
    const a = await c2a(page, vp)
    if (vp.width === 1088) for (const t of [2500, 5000]) await sharp(a.buffers[t]).jpeg({ quality: 88 }).toFile(DOSSIER + `variantes/${nom}-${cle}-t${t / 100}.jpg`)
    const b = await releve(page)
    // R-12 de réglage : ppcm(40 s, P) au pas de 1 s s'il tient en 120 s ; sinon le cycle de 40 s de la poussée au pas de 250 ms
    const cyc = ppcm(40000, (p ? p.P : 20) * 1000), pas = cyc <= 120000 ? 1000 : 250, duree = cyc <= 120000 ? cyc : 40000, instants = []; for (let t = 2000; t < 2000 + duree; t += pas) instants.push(t)
    const c = await contrasteCycle(page, instants)
    const etatFin = (await etatPage(page)).reliefEtat
    r.formats[cle] = { etat, reliefEtatFin: etatFin, C2a: a.C2a, C6a: a.C6a, C2bc: b, R12: { ...c, valeurs: undefined }, duree_s: Math.round((Date.now() - d0) / 1000) }
    console.log(nom, cle, JSON.stringify({ C2a: a.C2a, C6a: a.C6a, C2bc: b, R12min: c.p90min, R12a: c.p90minA_ms, sous3: c.sous3, relief: etat.reliefEtat, calque: etat.animationsCalque }))
    await ctx.close()
  }
  fs.writeFileSync(DOSSIER + `variantes/${nom}.json`, JSON.stringify(r, null, 1))
  const actuel = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : res
  actuel.variantes[nom] = r
  fs.writeFileSync(FICHIER, JSON.stringify(actuel, null, 1))
}
await nav.close()
