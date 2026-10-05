// starnet-ascenseurs.mjs — rend les ascenseurs de la station VISIBLES (05/10/2026) : sol rayé ambre/noir (rayures de sécurité), sas aux deux extrémités, plaque de danger au centre.
// Lit la station enregistrée, ne touche qu'aux couloirs nommés « ASCENSEUR … », réécrit par POST /api/save. Sauvegarde avant. Usage : node starnet-ascenseurs.mjs [--a-sec]
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const APP = path.join(process.env.LOCALAPPDATA, 'StarNet', 'frontend', 'app')
const require = createRequire(import.meta.url)
const WM = require(path.join(APP, 'worldmodel.js'))
const ICI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const cat = vm.runInNewContext(fs.readFileSync(path.join(APP, 'prop-catalog-data.js'), 'utf8').replace("'use strict';", '').replace('const PropCatalogData', 'var PropCatalogData') + ';PropCatalogData')
const TAILLE = {}, REGLE = {}
for (const l of Object.values(cat)) if (Array.isArray(l)) for (const e of l) if (e && e.id && e.footprint && e.face === 's' && !TAILLE[e.id]) { TAILLE[e.id] = [e.footprint.w, e.footprint.h]; REGLE[e.id] = { mount: e.requiredMount || null, stack: !!e.optionalStack, surface: e.placement === 'surface' && e.requiredMount === 'surface', flat: !!e.flat } }
WM.setPropRules((t) => REGLE[t] || null)

async function sidecar() {
  const sortie = execSync('powershell -NoProfile -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -eq \'127.0.0.1\' -and $_.LocalPort -gt 1024 } | Select-Object -ExpandProperty LocalPort"', { encoding: 'utf8' })
  for (const port of sortie.split(/\s+/).filter(Boolean).map(Number)) {
    try { const html = await (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) })).text(); const jeton = /__STARNET_API_TOKEN__\s*=\s*"([^"]+)"/.exec(html)?.[1]; if (jeton && /<title>STARNET<\/title>/i.test(html)) return { port, jeton } } catch { /* suivant */ }
  }
  throw new Error('StarNet fermé')
}
const s = await sidecar()
const brut = await (await fetch(`http://127.0.0.1:${s.port}/api/save?agent=agent`, { headers: { 'x-starnet-token': s.jeton } })).json()
const enveloppe = brut.save
fs.writeFileSync(path.join(ICI, 'sauvegardes-starnet', `save-agent-avant-ascenseurs-${Date.now()}.json`), JSON.stringify(brut))
const M = WM.deserialize(structuredClone(enveloppe.station))
const rapport = { ascenseurs: 0, sas: 0, plaques: 0 }
for (const piece of M.rooms().filter((r) => /^ASCENSEUR/.test(r.name))) {
  const r = piece.rects[0]
  const tuiles = []
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) if ((y - r.y1) % 2 === 0) tuiles.push([x, y])
  M.paintTiles(piece.id, tuiles, 'onyx'); rapport.ascenseurs++
  const poser = (t, x, y) => { const [w, h] = TAILLE[t] || [1, 1]; const res = M.addProp({ t, x, y, w, h, block: false }); return res?.ok !== false }
  for (const t of ['airlock']) {
    const [w, h] = TAILLE[t] || [1, 1]
    let ok = false
    for (let x = r.x1; x <= r.x2 - w + 1 && !ok; x++) ok = poser(t, x, r.y1)  // sas côté haut
    if (ok) rapport.sas++
  }
  const [pw, ph] = TAILLE.hazardpad || [1, 1]
  if (poser('hazardpad', r.x1 + Math.floor((r.x2 - r.x1 + 1 - pw) / 2), r.y1 + Math.floor((r.y2 - r.y1 + 1 - ph) / 2))) rapport.plaques++
}
console.log(JSON.stringify(rapport))
if (process.argv.includes('--a-sec')) process.exit(0)
enveloppe.station = M.serialize(); enveloppe.updatedAt = Date.now()
const rep = await fetch(`http://127.0.0.1:${s.port}/api/save`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify(enveloppe) })
console.log('POST /api/save :', rep.status, (await rep.text()).slice(0, 120))
