// reglage.mjs <nom> '<params JSON>' — mesure rapide d'une variante de L2 en 1088×800 (format de la grille), sans carte graphique,
// animations positionnées image par image. Ajoute (ou remplace) l'entrée dans variantes.json. Nom « temoin-en-ligne » : sans bloc.
import fs from 'node:fs'
import { chromium, sharp, DIR, TRAVAIL, bloc, gris, ecart, ouvrir, positionner, etat, contraste, temoinTitre, c6a, sequence } from './outils.mjs'
const [nom, brut] = process.argv.slice(2)
const p = brut ? JSON.parse(brut) : null
const css = p ? bloc(p) : ''
const W = 1088, H = 800
const FICHIER = DIR + 'variantes.json'
const tout = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : {
  conditions: 'Page en ligne https://prestiapp.fr/sites-demo/lestraque/index.html, chromium.launch() sans drapeau (sans carte graphique), 1088×800, classe da--signature ajoutée et bloc injecté dans le navigateur de test seulement ; toutes les animations de DocumentTimeline en pause, currentTime = t (ms) ; captures PNG ; réduction grise 160 px (cdc-c2-variantes.mjs).',
  variantes: [],
}
const nav = await chromium.launch()
const r = { nom, date: new Date().toISOString(), params: p, css }
try {
  const { ctx, page } = await ouvrir(nav, W, H, css)
  await positionner(page, 5000)
  r.etat_t5000 = await etat(page)
  const bufs = {}
  // t = 0,6 s en dernier : revenir sous 1,6 s rallume le relais « Devis » de kit.js, qui laisserait un fantôme aux instants suivants
  for (const t of [2500, 5000, 8000]) {
    await positionner(page, t)
    bufs[t] = await page.screenshot({ type: 'png' })
    await sharp(bufs[t]).jpeg({ quality: 88 }).toFile(TRAVAIL + `var-${nom}-t${String(t / 100).padStart(2, '0')}.jpg`)
  }
  const g = {}; for (const t of [2500, 5000, 8000]) g[t] = await gris(bufs[t])
  const p1 = ecart(g[2500], g[5000]), p2 = ecart(g[5000], g[8000])
  r.C2a = { paire_2500_5000: p1, paire_5000_8000: p2, cible: 0.56, tenu: p1.part8 >= 0.56 && p2.part8 >= 0.56 }
  r.C6a = await c6a(bufs[2500], bufs[8000], W, H)
  // C2-b / C2-c : relevé de 10 s à 8 images/s à partir de 8 s (R-2)
  const seq = []
  for (let t = 8000; t <= 18000; t += 125) { await positionner(page, t); seq.push(await gris(await page.screenshot({ type: 'png' }))) }
  const s = sequence(seq, 125)
  r.C2b = { ...s, diffs: undefined, tenu: s.plusLongFige_s <= 0.8 || s.ecartMoyenParImage >= 0.02 }
  r.C2c = { ecartMaxPaire: s.ecartMaxPaire, pairesAuDessus0085: s.pairesAuDessus0085, tenu: s.pairesAuDessus0085 === 0 }
  r.diffsRelevé = s.diffs
  // R-12 rapide : 40 instants, pas de 1 s, t = 2 à 41 s (le cycle de 40 s de la poussée)
  const cs = []
  for (let k = 0; k < 40; k++) { await positionner(page, 2000 + 1000 * k); cs.push(await contraste(page)) }
  r.R12_rapide = { instants: 40, min: Math.min(...cs), max: Math.max(...cs), tenu: Math.min(...cs) >= 3 }
  if (p) {
    const tem = []
    for (let k = 0; k < 10; k++) { const t = 2000 + Math.round((2 * p.D * 1000 / 10) * k); await positionner(page, t); const b = await page.screenshot({ type: 'png' }); tem.push({ t, ...(await temoinTitre(page, b)) }) }
    r.temoinTitre = { instants: tem.length, pixelsModifiesSousTitreMax: Math.max(...tem.map((x) => x.pixelsModifiesSousTitre)), ecartMaxSousTitre: Math.max(...tem.map((x) => x.ecartMaxSousTitre)), partPixelsEclairesAuDessus_d8: tem.map((x) => x.partPixelsEclairesAuDessus_d8), hautTitre: tem[0].hautTitre }
  }
  await positionner(page, 600)
  await sharp(await page.screenshot({ type: 'png' })).jpeg({ quality: 88 }).toFile(TRAVAIL + `var-${nom}-t06.jpg`)
  await ctx.close()
} finally { await nav.close() }
// écriture : une copie par variante, puis fusion relue au dernier moment (plusieurs réglages peuvent tourner en parallèle)
fs.writeFileSync(TRAVAIL + `var-${nom}.json`, JSON.stringify(r, null, 1))
const frais = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : tout
frais.variantes = frais.variantes.filter((v) => v.nom !== nom).concat([r])
fs.writeFileSync(FICHIER, JSON.stringify(frais, null, 1))
const { css: _c, diffsRelevé: _d, ...court } = r
console.log(JSON.stringify(court, null, 1))
