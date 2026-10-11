// starnet-capacites.mjs — donne à chaque agent le MATÉRIEL de son métier et sa couleur de service (05/10/2026).
// Dans StarNet, un agent n'a une capacité (WEB, FICHIERS, TERMINAL, IMAGES, OUTILS EN DIRECT…) que s'il est assigné à l'objet qui la porte, dans sa salle : un objet non assigné est du décor mort.
// Ce script lit la station enregistrée, assigne (ou pose, dans la salle de l'agent) les objets de capacité de chaque agent, lie le connecteur « presti » au portail de MATT, colore chaque agent par service
// (violet = production, magenta = envois et média, turquoise = veille et prospection, cobalt = infrastructure et sécurité, or = argent), puis réécrit par POST /api/save. Sauvegarde avant. Usage : node starnet-capacites.mjs [--a-sec]
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
const idDe = (r) => r?.id ?? r?.prop?.id ?? r?.propId

// matériel par agent : types d'objets de capacité à lui assigner (web = comms_dish/uplink, fichiers = shelf/safe/vault/rack, terminal = workbench, images = studio, outils en direct = connector_portal)
const MATERIEL = {
  agent: ['connector_portal', 'war_intelcab', 'comms_dish'], recenseur: ['comms_dish', 'shelf'], vigie_meta: ['comms_uplink', 'shelf'], douleurs: ['shelf', 'comms_dish'], juge_faits: ['shelf', 'comms_dish'],
  redacteur: ['shelf', 'comms_uplink'], redacteur_site: ['workbench', 'shelf'], qualite_sites: ['comms_dish', 'shelf'], atelier_maquettes: ['studio', 'workbench'], standardiste: ['comms_uplink', 'shelf'], repondeur: ['comms_uplink', 'shelf'],
  studio: ['studio', 'shelf'], crieur: ['comms_beacon', 'studio'], contenu: ['shelf', 'comms_dish'], facteur: ['comms_uplink', 'shelf'], facteur_usine: ['comms_uplink'], livreur: ['comms_uplink', 'workbench'], livreur_usine: ['comms_uplink', 'workbench'],
  sav: ['comms_uplink', 'shelf'], tresorier: ['safe', 'vault'], experience: ['shelf', 'comms_dish'], garde: ['war_intelcab', 'shelf'], vigile: ['war_intelcab', 'safe'], usine: ['rack', 'core'], systeme: ['rack', 'gigs_servercart'], a0: ['rack', 'shelf'], pont: ['workbench', 'comms_uplink'], pont_telegram: ['comms_uplink'],
}
const COULEUR = { violet: '#a779ff', magenta: '#ff6fd0', turquoise: '#2fe0d0', cobalt: '#5fa0ff', or: '#ffd34a' }
const SERVICE = { agent: 'violet', recenseur: 'turquoise', vigie_meta: 'turquoise', douleurs: 'turquoise', juge_faits: 'turquoise', contenu: 'violet', redacteur: 'violet', redacteur_site: 'violet', qualite_sites: 'violet', atelier_maquettes: 'violet', standardiste: 'violet', repondeur: 'violet',
  studio: 'magenta', crieur: 'magenta', facteur: 'magenta', facteur_usine: 'magenta', livreur: 'magenta', livreur_usine: 'magenta', sav: 'magenta', tresorier: 'or', experience: 'or', garde: 'cobalt', vigile: 'cobalt', usine: 'cobalt', systeme: 'cobalt', a0: 'cobalt', pont: 'cobalt', pont_telegram: 'cobalt' }

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
fs.mkdirSync(path.join(ICI, 'sauvegardes-starnet'), { recursive: true })
fs.writeFileSync(path.join(ICI, 'sauvegardes-starnet', `save-agent-avant-capacites-${Date.now()}.json`), JSON.stringify(brut))
const M = WM.deserialize(structuredClone(enveloppe.station))
const rapport = { assignes: 0, poses: 0, manques: [], portail: false }
const salleDe = (ag) => { const p = M.props().find((q) => q.agentId === ag && (q.t === 'desk' || q.t === 'bay')); return p ? M.roomAt(p.x, p.y) : null }
for (const [ag, types] of Object.entries(MATERIEL)) {
  const roomId = salleDe(ag); if (!roomId) { rapport.manques.push(`${ag} : salle introuvable`); continue }
  const r = M.roomById(roomId).rects[0]
  for (const t of types) {
    if (M.props().some((p) => p.t === t && p.agentId === ag)) continue
    const libre = M.props().find((p) => p.t === t && !p.agentId && M.roomAt(p.x, p.y) === roomId)
    if (libre) { M.assignPropAgent(libre.id, ag); rapport.assignes++; continue }
    const [w, h] = TAILLE[t] || [1, 1]
    let ok = false
    for (let y = r.y1 + 1; y <= r.y2 - h && !ok; y++) for (let x = r.x1 + 1; x <= r.x2 - w && !ok; x++) { const res = M.addProp({ t, x, y, w, h }); if (res?.ok !== false) { M.assignPropAgent(idDe(res), ag); ok = true; rapport.poses++ } }
    if (!ok) rapport.manques.push(`${ag} : ${t} sans place`)
  }
}
const portail = M.props().find((p) => p.t === 'connector_portal' && p.agentId === 'agent')
if (portail && typeof M.bindConnector === 'function') { const b = M.bindConnector(portail.id, 'presti'); rapport.portail = b?.ok !== false }
const doc = M.serialize()
const capacites = {}; for (const p of doc.props) if (p.agentId && p.t !== 'desk' && p.t !== 'bay') (capacites[p.agentId] ??= []).push(p.t)
console.log(JSON.stringify({ rapport, agentsAvecMateriel: Object.keys(capacites).length }))
if (process.argv.includes('--a-sec')) process.exit(0)
enveloppe.station = doc
for (const a of enveloppe.agents || []) if (SERVICE[a.id]) a.color = COULEUR[SERVICE[a.id]]
if (enveloppe.agent) enveloppe.agent.color = COULEUR.violet
enveloppe.updatedAt = Date.now()
const rep = await fetch(`http://127.0.0.1:${s.port}/api/save`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify(enveloppe) })
console.log('POST /api/save :', rep.status, (await rep.text()).slice(0, 160))
