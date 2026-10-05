// starnet-construire-station-v2.mjs — station Presti en 5 « étages » (bandes) de salles agrandies (05/10/2026), pour la cohérence et l'espace :
//   Étage 1  PONT DE COMMANDEMENT : Commandement, Salle de réunion, Radar, Observatoire
//   Étage 2  PRODUCTION           : Standard, Rédaction, Atelier des maquettes, Usine à sites
//   Étage 3  ENVOIS & MÉDIA       : Salle des envois, Studio pubs, Tour du Crieur, Audience
//   Étage 4  FINANCE & PRODUIT    : Recettes, Trésorerie, Salle expérience, Presti
//   Étage 5  INFRASTRUCTURE       : Salle des machines, Chantier du code, Sécurité, Salle de repos
// Chaque agent garde sa salle d'origine (lue dans la sauvegarde d'avant) ; les flux de production sont des chaînes Inbox > Bay > Outbox sur tapis, avec les agents sur les bays.
// Même méthode que la v1 : le modèle du monde de StarNet charge/valide, jamais de pose forcée ; sauvegarde avant ; POST /api/save. Connectivité vérifiée par le calcul de chemin du modèle.
// Usage : node starnet-construire-station-v2.mjs [--a-sec] [--depuis=<fichier de sauvegarde d'origine>]
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const APP = path.join(process.env.LOCALAPPDATA, 'StarNet', 'frontend', 'app')
const require = createRequire(import.meta.url)
const WM = require(path.join(APP, 'worldmodel.js'))
const A_SEC = process.argv.includes('--a-sec')
const ICI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SAUV = path.join(ICI, 'sauvegardes-starnet')

const cat = vm.runInNewContext(fs.readFileSync(path.join(APP, 'prop-catalog-data.js'), 'utf8').replace("'use strict';", '').replace('const PropCatalogData', 'var PropCatalogData') + ';PropCatalogData')
const TAILLE = {}
for (const liste of Object.values(cat)) if (Array.isArray(liste)) for (const e of liste) if (e && e.id && e.footprint && !TAILLE[e.id]) TAILLE[e.id] = [e.footprint.w, e.footprint.h]
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
const idDe = (res) => res?.id ?? res?.prop?.id ?? res?.propId

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

// ── le plan : [nom, genre, x1, y1, x2, y2, sol, matériau, coque] ; contiguës (pas d'écart) comme dans l'original
const BANDES = [
  { y1: 0, y2: 11, salles: [
    ['Commandement', 'bridge', 0, 22, 'cobalt', 'flightdeck', 'indigo'], ['SALLE DE RÉUNION', 'hab', 23, 36, 'indigo', 'parquet', 'violet'],
    ['RADAR', 'lab', 37, 50, 'teal', 'maggrid', 'cobalt'], ['OBSERVATOIRE', 'lab', 51, 64, 'teal', 'flightdeck', 'cobalt'] ] },
  { y1: 12, y2: 23, salles: [
    ['STANDARD', 'factory', 0, 13, 'cobalt', 'hex', 'indigo'], ['RÉDACTION', 'factory', 14, 31, 'violet', 'hex', 'indigo'],
    ['ATELIER DES MAQUETTES', 'factory', 32, 47, 'orchid', 'hex', 'violet'], ['USINE À SITES', 'factory', 48, 64, 'violet', 'hex', 'indigo'] ] },
  { y1: 24, y2: 35, salles: [
    ['SALLE DES ENVOIS', 'factory', 0, 17, 'indigo', 'hex', 'violet'], ['STUDIO PUBS', 'factory', 18, 33, 'violet', 'hex', 'orchid'],
    ['TOUR DU CRIEUR', 'hab', 34, 49, 'orchid', 'flightdeck', 'violet'], ['AUDIENCE', 'hab', 50, 64, 'indigo', 'hex', 'violet'] ] },
  { y1: 36, y2: 47, salles: [
    ['RECETTES', 'lab', 0, 15, 'indigo', 'maggrid', 'violet'], ['TRÉSORERIE', 'lab', 16, 31, 'cobalt', 'maggrid', 'indigo'],
    ['SALLE EXPÉRIENCE', 'lab', 32, 47, 'teal', 'hex', 'cobalt'], ['PRESTI', 'hab', 48, 64, 'violet', 'terrazzo', 'orchid'] ] },
  { y1: 48, y2: 59, salles: [
    ['SALLE DES MACHINES', 'storage', 0, 21, 'indigo', 'maggrid', 'cobalt'], ['CHANTIER DU CODE', 'factory', 22, 37, 'cobalt', 'hex', 'indigo'],
    ['SÉCURITÉ', 'storage', 38, 51, 'onyx', 'plate', 'cobalt'], ['SALLE DE REPOS', 'quarters', 52, 64, 'orchid', 'terrazzo', 'violet'] ] },
]
// contenu des salles : chaîne (agents sur les bays), agents « bureau » (d'après l'original), objets
const SALLES = {
  'COMMANDEMENT': { objets: ['bigscreen', 'holotable', 'wartable', 'bridge_consolebank', 'chartwall', 'ticker', 'missionboard', 'trophycase', 'comms_dish', 'war_intelcab', 'gigs_servercart', 'workbench', 'studio', 'plant', 'plant', 'rug_large'] },
  'SALLE DE REUNION': { objets: ['longtable', 'whiteboard', 'bigscreen', 'plant', 'coffee', 'plant'] },
  'RADAR': { objets: ['comms_dish', 'war_threatcore', 'screens', 'research_trendpillar', 'holotable', 'plant'] },
  'OBSERVATOIRE': { objets: ['telescope', 'research_papers', 'holotable', 'research_corelens', 'bookshelf', 'plant'] },
  'STANDARD': { chaine: { label: 'STANDARD', agents: ['standardiste'] }, objets: ['commswall', 'comms_inbox', 'plant', 'plant'] },
  'REDACTION': { chaine: { label: 'REDACTION', agents: ['redacteur', 'juge_faits'] }, objets: ['bookshelf', 'desklamp', 'plant', 'plant'] },
  'ATELIER DES MAQUETTES': { chaine: { label: 'MAQUETTES', agents: ['atelier_maquettes'] }, objets: ['easel', 'fabricator', 'plant'] },
  'USINE A SITES': { chaine: { label: 'SITES', agents: ['redacteur_site', 'qualite_sites'] }, objets: ['fabricator', 'vat', 'gigs_partsbin', 'plant'] },
  'SALLE DES ENVOIS': { chaine: { label: 'ENVOIS', agents: ['facteur'] }, objets: ['pub_mailpod', 'pub_outboundchute', 'plant'] },
  'STUDIO PUBS': { chaine: { label: 'PUBS', agents: ['studio'] }, objets: ['camerarig', 'easel', 'djbooth', 'plant'] },
  'TOUR DU CRIEUR': { objets: ['pub_publishpress', 'comms_beacon', 'camerarig', 'speaker', 'plant'] },
  'AUDIENCE': { objets: ['bigscreen', 'chartwall', 'screens', 'plant'] },
  'RECETTES': { objets: ['chartwall', 'treasury_pnl_holo', 'ticker', 'treasury_coinsorter', 'goldcrate', 'plant'] },
  'TRESORERIE': { objets: ['treasury_coinsorter', 'treasury_token_furnace', 'treasury_pnl_holo', 'vault', 'safe'] },
  'SALLE EXPERIENCE': { objets: ['whiteboard', 'missionboard', 'holotable', 'tank', 'plant'] },
  'PRESTI': { objets: ['trophycase', 'holopet', 'monstera', 'rug', 'sidetable', 'plant'] },
  'SALLE DES MACHINES': { objets: ['rack', 'rack', 'rack', 'core', 'gigs_servercart', 'bridge_relaystack', 'cablerun'] },
  'CHANTIER DU CODE': { objets: ['workbench', 'pixelrig', 'industrial_toolcaddy', 'industrial_supplycart', 'crt_pile'] },
  'SECURITE': { objets: ['safe', 'vault', 'airlock', 'war_intelcab', 'weaponrack'] },
  'SALLE DE REPOS': { objets: ['couch', 'bar', 'jukebox', 'coffee', 'plant', 'pinball', 'rug', 'arcade'] },
}
const SANS_BLOC = new Set(['plant', 'rug', 'rug_large', 'cablerun', 'desklamp', 'coffee', 'monstera', 'terrarium'])

const rapport = { salles: 0, chaines: 0, bureaux: 0, objets: 0, refuses: [], injoignables: [] }

function construire(origine) {
  const ancien = WM.deserialize(structuredClone(origine))
  const agentsParSalle = {}
  for (const p of ancien.props()) if (p.agentId && p.t === 'desk') (agentsParSalle[norm(ancien.roomById(ancien.roomAt(p.x, p.y))?.name)] ??= []).push(p.agentId)
  const vide = { schema: 'starnet.station', version: origine.version, _nid: 1, meta: { ...origine.meta, spawnRoomId: null, trunkRoomId: null }, rooms: {}, order: [], props: [], belts: {}, edges: [] }
  let M = WM.deserialize(vide)
  const ids = {}
  for (const bande of BANDES) for (const [nom, genre, x1, x2, sol, mat, coque] of bande.salles) {
    const res = M.addRoom({ name: nom, kind: genre, rect: { x1, y1: bande.y1, x2, y2: bande.y2 }, floorStyle: sol, floorMat: mat })
    if (res?.ok === false) { rapport.refuses.push(`salle ${nom} : ${res.error || res.code || 'refusée'}`); continue }
    ids[norm(nom)] = res.id
    M.setWalls(res.id, { style: coque }); M.setHull(res.id, { style: coque }); rapport.salles++
  }
  if (ids['COMMANDEMENT']) { M.doc().meta.spawnRoomId = ids['COMMANDEMENT']; M.doc().meta.trunkRoomId = ids['COMMANDEMENT'] }

  for (const [cle, plan] of Object.entries(SALLES)) {
    const roomId = ids[cle]; if (!roomId) continue
    const r = M.roomById(roomId).rects[0]
    // 1. chaîne Inbox > Bay… > Outbox, au bas de la salle
    if (plan.chaine) {
      const n = plan.chaine.agents.length
      let pose = false
      for (let y = r.y2 - 2; y >= r.y1 + 1 && !pose; y--) for (let x = r.x1 + 1; x <= r.x2 && !pose; x++) {
        const T = WM.deserialize(M.serialize()); let cx = x, ok = true
        const poser = (t, extra = {}) => { const res = T.addProp({ t, x: cx, y, w: 2, h: 2, ...extra }); if (res?.ok === false) ok = false; cx += 2; return res }
        const tapis = () => { const b = T.setBelt(cx, y + 1, 'E'); if (b?.ok === false) ok = false; cx += 1 }
        const entree = poser('intake'); const bays = []
        for (let k = 0; k < n && ok; k++) { tapis(); bays.push(poser('bay', { role: 'GENERALIST' })) }
        if (ok) { tapis(); poser('outbox') }
        if (!ok) continue
        bays.forEach((b, k) => { const pid = idDe(b); if (pid) T.assignPropAgent(pid, plan.chaine.agents[k]) })
        const eid = idDe(entree); if (eid) T.setPropLabel(eid, plan.chaine.label)
        M = T; pose = true; rapport.chaines++
      }
      if (!pose) rapport.refuses.push(`chaîne ${plan.chaine.label} : pas de place dans ${cle}`)
    }
    // 2. bureaux des agents de la salle qui ne sont pas sur une bay
    const surBay = new Set(plan.chaine?.agents || [])
    for (const ag of (agentsParSalle[cle] || []).filter((a) => !surBay.has(a))) {
      let ok = false
      for (let y = r.y1 + 1; y <= r.y2 - 1 && !ok; y++) for (let x = r.x1 + 1; x <= r.x2 - 1 && !ok; x++) {
        const res = M.addProp({ t: 'desk', x, y, w: 2, h: 1 })
        if (res?.ok !== false) { M.assignPropAgent(idDe(res), ag); ok = true; rapport.bureaux++ }
      }
      if (!ok) rapport.refuses.push(`bureau ${ag} : pas de place dans ${cle}`)
    }
    // 3. objets thématiques
    for (const t of plan.objets || []) {
      const [w, h] = TAILLE[t] || [1, 1]
      let place = false
      for (let y = r.y1; y <= r.y2 - h + 1 && !place; y++) for (let x = r.x1; x <= r.x2 - w + 1 && !place; x++) {
        const res = M.addProp({ t, x, y, w, h, ...(SANS_BLOC.has(t) ? { block: false } : {}) })
        if (res?.ok !== false) { place = true; rapport.objets++ }
      }
      if (!place) rapport.refuses.push(`${t} : pas de place dans ${cle}`)
    }
  }
  // agents encore sans poste (salle absente de l'original) : poste auto dans la salle de départ
  for (const aid of [...new Set(ancien.props().filter((p) => p.agentId).map((p) => p.agentId))]) { if (M.props().some((p) => p.agentId === aid)) continue; const w = M.ensureWorkstation(aid); if (w?.ok === false) rapport.refuses.push(`poste ${aid} : ${w.error || 'refusé'}`) }

  // connectivité : chaque salle doit être atteignable depuis le Commandement
  const g = M.projectGeometry()
  const centre = (z) => { const rr = g.allRects.find((q) => q.z === z); return rr ? [Math.floor((rr.x1 + rr.x2) / 2), Math.floor((rr.y1 + rr.y2) / 2)] : null }
  const dep = centre(ids['COMMANDEMENT'])
  for (const [cle, id] of Object.entries(ids)) { const c = centre(id); if (!c || !dep) continue; const chemin = g.path(dep[0], dep[1], c[0], c[1]); if (chemin === null) rapport.injoignables.push(cle) }
  return M
}

const s = await sidecar()
const brut = await (await fetch(`http://127.0.0.1:${s.port}/api/save?agent=agent`, { headers: { 'x-starnet-token': s.jeton } })).json()
const depuis = process.argv.find((a) => a.startsWith('--depuis='))?.slice(9)
const origine = depuis ? JSON.parse(fs.readFileSync(depuis, 'utf8')).save.station : fs.readdirSync(SAUV).sort().map((f) => path.join(SAUV, f)).map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).find((j) => Object.keys(j.save.station.belts || {}).length === 0).save.station
const enveloppe = brut.save
fs.mkdirSync(SAUV, { recursive: true })
fs.writeFileSync(path.join(SAUV, `save-agent-avant-v2-${Date.now()}.json`), JSON.stringify(brut))
const M = construire(origine)
const doc = M.serialize()
const compte = {}; for (const p of doc.props) if (p.agentId) (compte[p.agentId] ??= []).push(p.t + '@' + (M.roomById(M.roomAt(p.x, p.y))?.name)); console.log(JSON.stringify(Object.fromEntries(Object.entries(compte).filter(([, v]) => v.length > 1))))
console.log(JSON.stringify({ apres: { salles: Object.keys(doc.rooms).length, objets: doc.props.length, tapis: Object.keys(doc.belts || {}).length, agentsPoses: doc.props.filter((p) => p.agentId).length }, rapport }, null, 1))
if (A_SEC) process.exit(0)
enveloppe.station = doc
enveloppe.updatedAt = Date.now()
const rep = await fetch(`http://127.0.0.1:${s.port}/api/save`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify(enveloppe) })
console.log('POST /api/save :', rep.status, (await rep.text()).slice(0, 200))
