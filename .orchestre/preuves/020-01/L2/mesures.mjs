// mesures.mjs <variante> <L> <H> — mesures de la variante retenue dans un format, sans carte graphique (chromium.launch() nu),
// animations positionnées : C2-a, C2-b, C2-c (§3.3), C6-a (§3.4), R-12 (§8.1, 80 instants du cycle de 40 s), témoin « masqué
// sous le titre », nature du geste (propriétés animées), état du relief. Le même relevé sans bloc (témoin en ligne) pour comparaison.
// Écrit travail/mesures-<L>x<H>.json.
import fs from 'node:fs'
import { chromium, TRAVAIL, bloc, gris, ecart, ouvrir, positionner, etat, contraste, temoinTitre, c6a, sequence } from './outils.mjs'
const [nom, L, H] = process.argv.slice(2); const W = +L, Hh = +H
const p = JSON.parse(fs.readFileSync(TRAVAIL + `var-${nom}.json`, 'utf8')).params
const css = bloc(p)
const res = { variante: nom, format: `${W}x${Hh}`, date: new Date().toISOString(), params: p }
const nav = await chromium.launch()
const debut = Date.now()
try {
  for (const [cle, feuille] of [['temoinEnLigne', ''], ['candidat', css]]) {
    const { ctx, page } = await ouvrir(nav, W, Hh, feuille)
    const r = {}
    await positionner(page, 5000)
    r.etat_t5000 = await etat(page)
    const bufs = {}
    for (const t of [2500, 5000, 8000]) { await positionner(page, t); bufs[t] = await page.screenshot({ type: 'png' }) }
    const g = {}; for (const t of [2500, 5000, 8000]) g[t] = await gris(bufs[t])
    const p1 = ecart(g[2500], g[5000]), p2 = ecart(g[5000], g[8000])
    r.C2a = { paire_2500_5000: p1, paire_5000_8000: p2, seuil: 0.56, tenu: p1.part8 >= 0.56 && p2.part8 >= 0.56 }
    r.C6a = await c6a(bufs[2500], bufs[8000], W, Hh)
    const seq = []
    for (let t = 8000; t <= 18000; t += 125) { await positionner(page, t); seq.push(await gris(await page.screenshot({ type: 'png' }))) }
    const s = sequence(seq, 125)
    r.C2b = { releve: 't = 8 à 18 s, pas de 125 ms (8 images/s), 81 images', ecartMoyenParImage: s.ecartMoyenParImage, plusLongFige_s: s.plusLongFige_s, finPlageFigee_t_ms: s.finPlageFigee_image === null ? null : 8000 + 125 * s.finPlageFigee_image, partPairesSous0006: s.partPairesSous0006, seuils: 'plage figée ≤ 0,8 s OU écart moyen ≥ 0,020', tenu: s.plusLongFige_s <= 0.8 || s.ecartMoyenParImage >= 0.02, diffsParPaire: s.diffs }
    r.C2c = { ecartMaxPaire: s.ecartMaxPaire, pairesAuDessus0085: s.pairesAuDessus0085, tenu: s.pairesAuDessus0085 === 0 }
    if (feuille) {
      const cs = []
      for (let k = 0; k < 80; k++) { const t = 2000 + 500 * k; await positionner(page, t); cs.push([t, await contraste(page)]) }
      const v = cs.map((x) => x[1])
      r.R12 = { instants: 't = 2 000 + 500·k ms, k = 0..79 (cycle de 40 s de la poussée ; 4 cycles de 10 s du calque)', min: Math.min(...v), max: Math.max(...v), instantDuMin_ms: cs[v.indexOf(Math.min(...v))][0], seuil: 3.0, tenu: Math.min(...v) >= 3.0, valeurs: cs }
      const tem = []
      for (let k = 0; k < 20; k++) { const t = 2000 + 500 * k; await positionner(page, t); const b = await page.screenshot({ type: 'png' }); tem.push({ t, ...(await temoinTitre(page, b)) }) }
      r.masqueSousTitre = { methode: 'capture avec calque contre capture calque en visibility:hidden, pixels y ≥ haut de .hero h1, 20 instants (t = 2 à 11,5 s, pas 500 ms : un cycle entier du calque)', hautTitre_px: tem[0].hautTitre, pixelsModifiesPlusDe2Niveaux_max: Math.max(...tem.map((x) => x.pixelsModifiesSousTitre)), ecartMax: Math.max(...tem.map((x) => x.ecartMaxSousTitre)), partDesPixelsAuDessusDuTitreModifiesPlusDe8: tem.map((x) => [x.t, x.partPixelsEclairesAuDessus_d8]) }
    } else {
      const cs = []
      for (let k = 0; k < 80; k += 4) { const t = 2000 + 500 * k; await positionner(page, t); cs.push(await contraste(page)) }
      r.R12_indicatif = { instants: '20 (pas de 2 s)', min: Math.min(...cs), max: Math.max(...cs) }
    }
    r.reliefApres_s = +((Date.now() - debut) / 1000).toFixed(1)
    r.relief = await page.evaluate(() => document.querySelector('.hero--plein').getAttribute('data-relief-etat'))
    res[cle] = r
    console.log(cle, JSON.stringify({ C2a: [r.C2a.paire_2500_5000.part8, r.C2a.paire_5000_8000.part8], C2b: [r.C2b.ecartMoyenParImage, r.C2b.plusLongFige_s], C2c: r.C2c.ecartMaxPaire, C6a: r.C6a.ecartMoyenPixel, R12: r.R12 ? [r.R12.min, r.R12.max] : r.R12_indicatif, masque: r.masqueSousTitre && [r.masqueSousTitre.pixelsModifiesPlusDe2Niveaux_max, r.masqueSousTitre.ecartMax], relief: r.relief }))
    await ctx.close()
  }
} finally { await nav.close() }
fs.writeFileSync(TRAVAIL + `mesures-${W}x${Hh}.json`, JSON.stringify(res, null, 1))
