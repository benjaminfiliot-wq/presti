// starnet-construire-station.mjs — construit la station Presti dans StarNet (05/10/2026), à partir du plan : 20 salles, chaînes de production (Inbox > Bay > Outbox) par flux réel,
// objets thématiques (trésorerie, revenus, pubs, e-commerce, salle des machines…), sols néon (indigo / violet / cobalt, hexagones).
// Rien n'est supprimé, sauf le bureau d'un agent qui passe sur une « bay » de chaîne (il garde son identité, il change de poste).
// Méthode : le modèle du monde de StarNet lui-même (frontend/app/worldmodel.js) charge le document de la station, applique les changements avec les MÊMES règles de pose que l'éditeur
// (un objet qui ne peut pas être posé est refusé, jamais forcé), puis le document est réécrit par POST /api/save (la sauvegarde d'avant est faite avant : sauvegardes-starnet/).
// Fermer toute autre fenêtre StarNet avant de lancer ; « Reload current station » après.      Usage : node starnet-construire-station.mjs [--a-sec]
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const APP = path.join(process.env.LOCALAPPDATA, 'StarNet', 'frontend', 'app')
const require = createRequire(import.meta.url)
const WM = require(path.join(APP, 'worldmodel.js'))
const A_SEC = process.argv.includes('--a-sec')

// tailles (en cases) de chaque type d'objet, lues dans le catalogue de StarNet
const cat = vm.runInNewContext(fs.readFileSync(path.join(APP, 'prop-catalog-data.js'), 'utf8').replace("'use strict';", '').replace('const PropCatalogData', 'var PropCatalogData') + ';PropCatalogData')
const TAILLE = {}
for (const liste of Object.values(cat)) if (Array.isArray(liste)) for (const e of liste) if (e && e.id && e.footprint && !TAILLE[e.id]) TAILLE[e.id] = [e.footprint.w, e.footprint.h]

async function sidecar() {
  const sortie = execSync('powershell -NoProfile -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -eq \'127.0.0.1\' -and $_.LocalPort -gt 1024 } | Select-Object -ExpandProperty LocalPort"', { encoding: 'utf8' })
  for (const port of sortie.split(/\s+/).filter(Boolean).map(Number)) {
    try {
      const html = await (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) })).text()
      const jeton = /__STARNET_API_TOKEN__\s*=\s*"([^"]+)"/.exec(html)?.[1]
      if (jeton && /<title>STARNET<\/title>/i.test(html)) return { port, jeton }
    } catch { /* suivant */ }
  }
  throw new Error('StarNet fermé')
}

// ── le plan ───────────────────────────────────────────────────────────────────────────────────────────────
// sol : [style, matériau] ; coque : couleur des murs et de la coque ; objets : types posés là où ils tiennent ; chaine : agents sur les bays, dans l'ordre
const PLAN = {
  'COMMANDEMENT': { sol: ['cobalt', 'flightdeck'], coque: 'indigo', objets: ['bigscreen', 'holotable', 'wartable', 'bridge_consolebank', 'chartwall', 'ticker', 'missionboard', 'trophycase', 'plant', 'plant', 'rug_large'] },
  'SALLE DE REUNION': { sol: ['indigo', 'parquet'], coque: 'violet', objets: ['longtable', 'whiteboard', 'bigscreen', 'plant', 'coffee'] },
  'RADAR': { sol: ['teal', 'maggrid'], coque: 'cobalt', objets: ['comms_dish', 'war_threatcore', 'screens', 'research_trendpillar', 'holotable'] },
  'REDACTION': { sol: ['violet', 'hex'], coque: 'indigo', chaine: { label: 'REDACTION', agents: ['redacteur', 'juge_faits'] }, objets: ['bookshelf', 'desklamp', 'plant'] },
  'SALLE DES ENVOIS': { sol: ['indigo', 'hex'], coque: 'violet', chaine: { label: 'ENVOIS', agents: ['facteur'] }, objets: ['pub_mailpod', 'pub_outboundchute', 'plant'] },
  'STANDARD': { sol: ['cobalt', 'hex'], coque: 'indigo', chaine: { label: 'STANDARD', agents: ['standardiste'] }, objets: ['commswall', 'comms_inbox', 'plant'] },
  'ATELIER DES MAQUETTES': { sol: ['orchid', 'hex'], coque: 'violet', chaine: { label: 'MAQUETTES', agents: ['atelier_maquettes'] }, objets: ['easel', 'fabricator', 'plant'] },
  'USINE A SITES': { sol: ['violet', 'hex'], coque: 'indigo', chaine: { label: 'SITES', agents: ['redacteur_site', 'qualite_sites'] }, objets: ['fabricator', 'vat', 'gigs_partsbin'] },
  'RECETTES': { sol: ['indigo', 'maggrid'], coque: 'violet', objets: ['chartwall', 'treasury_pnl_holo', 'ticker', 'treasury_coinsorter', 'goldcrate'] },
  'TRESORERIE': { sol: ['cobalt', 'maggrid'], coque: 'indigo', objets: ['treasury_coinsorter', 'treasury_token_furnace', 'treasury_pnl_holo', 'vault', 'safe'] },
  'TOUR DU CRIEUR': { sol: ['orchid', 'flightdeck'], coque: 'violet', objets: ['pub_publishpress', 'comms_beacon', 'camerarig', 'speaker', 'plant'] },
  'STUDIO PUBS': { sol: ['violet', 'hex'], coque: 'orchid', chaine: { label: 'PUBS', agents: ['studio'] }, objets: ['camerarig', 'easel', 'djbooth', 'plant'] },
  'SALLE EXPERIENCE': { sol: ['teal', 'hex'], coque: 'cobalt', objets: ['whiteboard', 'missionboard', 'holotable', 'tank', 'plant'] },
  'SALLE DES MACHINES': { sol: ['indigo', 'maggrid'], coque: 'cobalt', objets: ['rack', 'rack', 'core', 'gigs_servercart', 'bridge_relaystack', 'cablerun'] },
  'CHANTIER DU CODE': { sol: ['cobalt', 'hex'], coque: 'indigo', objets: ['workbench', 'pixelrig', 'industrial_toolcaddy', 'industrial_supplycart', 'crt_pile'] },
  'AUDIENCE': { sol: ['indigo', 'hex'], coque: 'violet', objets: ['bigscreen', 'chartwall', 'screens', 'plant'] },
  'SECURITE': { sol: ['onyx', 'plate'], coque: 'cobalt', objets: ['safe', 'vault', 'airlock', 'war_intelcab', 'weaponrack'] },
  'PRESTI': { sol: ['violet', 'terrazzo'], coque: 'orchid', objets: ['trophycase', 'holopet', 'monstera', 'rug', 'sidetable'] },
  'OBSERVATOIRE': { sol: ['teal', 'flightdeck'], coque: 'cobalt', objets: ['telescope', 'research_papers', 'holotable', 'research_corelens'] },
  'SALLE DE REPOS': { sol: ['orchid', 'terrazzo'], coque: 'violet', objets: ['couch', 'bar', 'jukebox', 'coffee', 'plant', 'pinball', 'rug'] },
}
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
const idDe = (res) => res?.id ?? res?.prop?.id ?? res?.propId

const rapport = { salles: 0, chaines: 0, objets: 0, refuses: [], agentsSurBay: [] }

function construire(docInitial) {
  let M = WM.deserialize(structuredClone(docInitial))
  const noms = M.rooms().map((r) => r.id)
  for (const roomId of noms) {
    const piece = M.roomById(roomId)
    const plan = Object.entries(PLAN).find(([nom]) => nom === norm(piece.name))?.[1]
    if (!plan) { rapport.refuses.push(`salle sans plan : ${piece.name}`); continue }
    const r = piece.rects[0]
    M.setDeck(roomId, { style: plan.sol[0], mat: plan.sol[1] })
    M.setWalls(roomId, { style: plan.coque })
    M.setHull(roomId, { style: plan.coque })
    rapport.salles++

    // chaîne de production : Inbox > (Bay >)… Outbox, essayée sur une copie puis adoptée si tout se pose
    if (plan.chaine) {
      const n = plan.chaine.agents.length
      let pose = false
      for (let y = r.y2 - 2; y >= r.y1 && !pose; y--) {
        for (let x = r.x1; x <= r.x2 && !pose; x++) {
          const T = WM.deserialize(M.serialize())
          for (const ag of plan.chaine.agents) { const vieux = T.props().find((p) => p.t === 'desk' && p.agentId === ag); if (vieux) T.removeProp(vieux.id) } // la bay remplace le bureau : sa place est libre pour l'essai
          let cx = x, ok = true
          const poser = (t, extra = {}) => { const res = T.addProp({ t, x: cx, y, w: 2, h: 2, ...extra }); if (res?.ok === false) ok = false; cx += 2; return res }
          const tapis = () => { const b = T.setBelt(cx, y + 1, 'E'); if (b?.ok === false) ok = false; cx += 1 }
          const entree = poser('intake'); const bays = []
          for (let k = 0; k < n && ok; k++) { tapis(); bays.push(poser('bay', { role: 'GENERALIST' })) }
          if (ok) { tapis(); poser('outbox') }
          if (!ok) continue
          bays.forEach((b, k) => { const pid = idDe(b); if (pid) T.assignPropAgent(pid, plan.chaine.agents[k]) })
          const eid = idDe(entree); if (eid) T.setPropLabel(eid, plan.chaine.label)
          M = T; pose = true; rapport.chaines++; rapport.agentsSurBay.push(...plan.chaine.agents)
        }
      }
      if (!pose) rapport.refuses.push(`chaîne ${plan.chaine.label} : pas de place dans ${piece.name}`)
    }

    // objets thématiques : première place libre dans la salle
    for (const t of plan.objets || []) {
      const [w, h] = TAILLE[t] || [1, 1]
      let place = false
      for (let y = r.y1; y <= r.y2 - h + 1 && !place; y++) for (let x = r.x1; x <= r.x2 - w + 1 && !place; x++) {
        const res = M.addProp({ t, x, y, w, h, ...(['plant', 'rug', 'rug_large', 'cablerun', 'desklamp', 'coffee'].includes(t) ? { block: false } : {}) })
        if (res?.ok !== false) { place = true; rapport.objets++ }
      }
      if (!place) rapport.refuses.push(`${t} : pas de place dans ${piece.name}`)
    }
  }
  return M
}

const s = await sidecar()
const brut = await (await fetch(`http://127.0.0.1:${s.port}/api/save?agent=agent`, { headers: { 'x-starnet-token': s.jeton } })).json()
const enveloppe = brut.save
if (!enveloppe?.station) throw new Error('pas de station dans la sauvegarde')
const dossier = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'sauvegardes-starnet')
fs.mkdirSync(dossier, { recursive: true })
fs.writeFileSync(path.join(dossier, `save-agent-avant-construction-${Date.now()}.json`), JSON.stringify(brut))
const M = construire(enveloppe.station)
const doc = M.serialize()
console.log(JSON.stringify({ avant: { salles: Object.keys(enveloppe.station.rooms).length, objets: enveloppe.station.props.length, tapis: Object.keys(enveloppe.station.belts || {}).length }, apres: { salles: Object.keys(doc.rooms).length, objets: doc.props.length, tapis: Object.keys(doc.belts || {}).length }, rapport }, null, 1))
if (A_SEC) process.exit(0)
enveloppe.station = doc
enveloppe.updatedAt = Date.now()
const rep = await fetch(`http://127.0.0.1:${s.port}/api/save`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify(enveloppe) })
console.log('POST /api/save :', rep.status, (await rep.text()).slice(0, 200))
