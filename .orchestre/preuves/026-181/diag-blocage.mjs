// Diagnostic sur COPIE (le bac de l'usine, jamais le depot) : quand une marche n'avance plus depuis 6 s, dit pourquoi
// (boucle de Phaser, visibilite de la page, files du personnage). Lance par diag-blocage.sh avant station-claw3d-qa.
import fs from 'node:fs'
const f = 'scripts/fixtures/026-pilotage/k/juge-rendu.mjs'
let s = fs.readFileSync(f, 'utf8')
const a = '    miroir = await lireMiroir(P.page).catch(() => miroir)'
if (!s.includes(a)) throw new Error('motif absent')
const ajout = `
    if (Date.now() - depuis > 6000 && !P.__diag) {
      P.__diag = true
      const d = await P.page.evaluate(() => {
        const g = globalThis.__stationGame
        const sc = g && g.scene && g.scene.getScene ? g.scene.getScene('station-pixel-scene') : null
        const persos = sc ? [...sc.persos.values()].filter((p) => p.chemin.length || p.file.length || p.vidage).map((p) => p.acteur.nom + ':chemin=' + p.chemin.length + ',file=' + p.file.length + ',vidage=' + p.vidage) : null
        return JSON.stringify({ running: g && g.loop && g.loop.running, fps: g && g.loop && g.loop.actualFps, visible: document.visibilityState, hidden: document.hidden, calme: sc && sc.calme, persos, j: window.__j.length })
      }).catch((e) => 'erreur ' + e.message)
      console.error('[blocage] ' + new Date().toISOString().slice(11, 19) + ' sans progres depuis ' + ((Date.now() - depuis) / 1000).toFixed(1) + ' s : ' + d)
    }`
s = s.replace(a, a + ajout)
fs.writeFileSync(f, s)
