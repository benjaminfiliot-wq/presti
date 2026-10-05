// starnet-construire-station-v4.mjs — la station Presti en 5 VRAIS ÉTAGES, chaque salle COMPOSÉE (05/10/2026).
//   Un étage = un bandeau-couloir nommé tout en haut (« ETAGE 4 - PRODUCTION »), puis 4 salles SÉPARÉES (2 cases de vide entre elles, chacune sa coque, son sol, son anneau de couleur)
//   accrochées au bandeau ; 4 cases de vide entre deux étages, traversées par un ascenseur. De haut en bas : Pont de commande, Production, Envois et média, Finance et produit, Infrastructure.
//   Dans chaque salle : rangée du fond (équipement), pièce maîtresse au centre sur un tapis, ligne de production Inbox > Bay > Outbox au milieu pour les salles de flux, rangée des bureaux
//   des agents au sud, plantes aux coins. Les règles de montage de StarNet (objet mural, objet de surface) sont chargées depuis son catalogue : un objet invalide est refusé comme dans l'éditeur.
// Même méthode que les versions précédentes : le modèle du monde de StarNet charge et valide, jamais de pose forcée ; sauvegarde avant ; POST /api/save ; connectivité par calcul de chemin.
// Usage : node starnet-construire-station-v4.mjs [--a-sec]
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

// ── catalogue : tailles et règles de montage ────────────────────────────────────────────────────────────
const cat = vm.runInNewContext(fs.readFileSync(path.join(APP, 'prop-catalog-data.js'), 'utf8').replace("'use strict';", '').replace('const PropCatalogData', 'var PropCatalogData') + ';PropCatalogData')
const TAILLE = {}, REGLE = {}
for (const liste of Object.values(cat)) if (Array.isArray(liste)) for (const e of liste) if (e && e.id && e.footprint && e.face === 's' && !TAILLE[e.id]) {
  TAILLE[e.id] = [e.footprint.w, e.footprint.h]
  REGLE[e.id] = { mount: e.requiredMount || null, stack: !!e.optionalStack, surface: e.placement === 'surface' && e.requiredMount === 'surface', flat: !!e.flat }
}
WM.setPropRules((t) => REGLE[t] || null)
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

// ── le plan ───────────────────────────────────────────────────────────────────────────────────────────────
const LARGEUR = 70, PAS = 18, HAUT = 12, ECART = 2
const ETAGES = [
  { nom: 'ETAGE 5 - PONT DE COMMANDE', coque: 'indigo', sol: 'cobalt', salles: [
    ['Commandement', 'bridge', 22, 'cobalt', 'flightdeck', 'indigo', 'violet'], ['SALLE DE RÉUNION', 'hab', 14, 'indigo', 'parquet', 'violet', 'orchid'],
    ['RADAR', 'lab', 14, 'teal', 'maggrid', 'cobalt', 'indigo'], ['OBSERVATOIRE', 'lab', 14, 'teal', 'flightdeck', 'cobalt', 'violet'] ] },
  { nom: 'ETAGE 4 - PRODUCTION', coque: 'violet', sol: 'violet', salles: [
    ['STANDARD', 'factory', 16, 'cobalt', 'hex', 'indigo', 'teal'], ['RÉDACTION', 'factory', 16, 'violet', 'hex', 'indigo', 'orchid'],
    ['ATELIER DES MAQUETTES', 'factory', 16, 'orchid', 'hex', 'violet', 'indigo'], ['USINE À SITES', 'factory', 16, 'violet', 'hex', 'indigo', 'teal'] ] },
  { nom: 'ETAGE 3 - ENVOIS ET MEDIA', coque: 'orchid', sol: 'orchid', salles: [
    ['SALLE DES ENVOIS', 'factory', 16, 'indigo', 'hex', 'violet', 'teal'], ['STUDIO PUBS', 'factory', 16, 'violet', 'hex', 'orchid', 'indigo'],
    ['TOUR DU CRIEUR', 'hab', 16, 'orchid', 'flightdeck', 'violet', 'teal'], ['AUDIENCE', 'hab', 16, 'indigo', 'hex', 'violet', 'orchid'] ] },
  { nom: 'ETAGE 2 - FINANCE ET PRODUIT', coque: 'teal', sol: 'teal', salles: [
    ['RECETTES', 'lab', 16, 'indigo', 'maggrid', 'violet', 'teal'], ['TRÉSORERIE', 'lab', 16, 'cobalt', 'maggrid', 'indigo', 'orchid'],
    ['SALLE EXPÉRIENCE', 'lab', 16, 'teal', 'hex', 'cobalt', 'violet'], ['PRESTI', 'hab', 16, 'violet', 'terrazzo', 'orchid', 'teal'] ] },
  { nom: 'ETAGE 1 - INFRASTRUCTURE', coque: 'cobalt', sol: 'onyx', salles: [
    ['SALLE DES MACHINES', 'storage', 18, 'indigo', 'maggrid', 'cobalt', 'teal'], ['CHANTIER DU CODE', 'factory', 16, 'cobalt', 'hex', 'indigo', 'violet'],
    ['SÉCURITÉ', 'storage', 16, 'onyx', 'plate', 'cobalt', 'violet'], ['SALLE DE REPOS', 'quarters', 14, 'orchid', 'terrazzo', 'violet', 'teal'] ] },
]
// composition d'une salle : mur = rangée du fond ; centre = pièce maîtresse (+ tapis) ; chaine = ligne de production ; coins = objets aux angles ; sud = décor rangée sud (les bureaux des agents y sont alignés)
const SALLES = {
  'COMMANDEMENT': { mur: ['bigscreen', 'chartwall', 'ticker', 'missionboard'], centre: ['holotable', 'wartable'], tapis: 'rug_large', coins: ['trophycase', 'plant', 'comms_dish', 'plant'], sud: ['workbench', 'studio', 'gigs_servercart', 'war_intelcab'] },
  'SALLE DE REUNION': { mur: ['whiteboard', 'bigscreen'], centre: ['longtable'], tapis: 'rug_large', coins: ['plant', 'plant', 'coffee', 'bookshelf'], sud: [] },
  'RADAR': { mur: ['screens', 'comms_dish', 'war_threatcore'], centre: ['holotable'], tapis: 'rug', coins: ['plant', 'research_trendpillar', 'plant', 'comms_uplink'], sud: [] },
  'OBSERVATOIRE': { mur: ['bookshelf', 'research_papers', 'bookshelf'], centre: ['telescope', 'holotable'], tapis: 'rug', coins: ['plant', 'research_corelens', 'plant', 'monstera'], sud: [] },
  'STANDARD': { chaine: { label: 'STANDARD', agents: ['standardiste'] }, mur: ['commswall', 'comms_inbox', 'screens'], centre: [], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'REDACTION': { chaine: { label: 'REDACTION', agents: ['redacteur', 'juge_faits'] }, mur: ['bookshelf', 'whiteboard', 'bookshelf'], centre: [], tapis: 'rug', coins: ['plant', 'desklamp', 'plant', 'plant'], sud: [] },
  'ATELIER DES MAQUETTES': { chaine: { label: 'MAQUETTES', agents: ['atelier_maquettes'] }, mur: ['easel', 'fabricator', 'easel'], centre: [], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'USINE A SITES': { chaine: { label: 'SITES', agents: ['redacteur_site', 'qualite_sites'] }, mur: ['fabricator', 'vat', 'fabricator'], centre: [], tapis: 'rug', coins: ['plant', 'gigs_partsbin', 'plant', 'plant'], sud: [] },
  'SALLE DES ENVOIS': { chaine: { label: 'ENVOIS', agents: ['facteur'] }, mur: ['pub_mailpod', 'pub_outboundchute', 'commswall'], centre: [], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'STUDIO PUBS': { chaine: { label: 'PUBS', agents: ['studio'] }, mur: ['easel', 'djbooth', 'easel'], centre: [], tapis: 'rug', coins: ['camerarig', 'plant', 'camerarig', 'plant'], sud: [] },
  'TOUR DU CRIEUR': { mur: ['pub_publishpress', 'comms_beacon', 'speaker'], centre: ['camerarig'], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'AUDIENCE': { mur: ['bigscreen', 'chartwall', 'screens'], centre: ['holotable'], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'RECETTES': { mur: ['chartwall', 'ticker', 'chartwall'], centre: ['treasury_pnl_holo', 'treasury_coinsorter'], tapis: 'rug_large', coins: ['goldcrate', 'plant', 'goldcrate', 'plant'], sud: [] },
  'TRESORERIE': { mur: ['vault', 'safe', 'vault'], centre: ['treasury_coinsorter', 'treasury_token_furnace'], tapis: 'rug_large', coins: ['treasury_pnl_holo', 'plant', 'goldcrate', 'plant'], sud: [] },
  'SALLE EXPERIENCE': { mur: ['whiteboard', 'missionboard', 'whiteboard'], centre: ['holotable', 'tank'], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'PRESTI': { mur: ['trophycase', 'bookshelf', 'trophycase'], centre: ['holopet'], tapis: 'rug_large', coins: ['monstera', 'plant', 'monstera', 'plant'], sud: ['sidetable', 'sidetable'] },
  'SALLE DES MACHINES': { mur: ['rack', 'rack', 'rack', 'rack'], centre: ['core', 'bridge_relaystack'], tapis: 'cablerun', coins: ['gigs_servercart', 'plant', 'gigs_servercart', 'plant'], sud: ['rack', 'rack'] },
  'CHANTIER DU CODE': { mur: ['industrial_toolcaddy', 'workbench', 'industrial_supplycart'], centre: ['pixelrig'], tapis: 'rug', coins: ['crt_pile', 'plant', 'crt_pile', 'plant'], sud: [] },
  'SECURITE': { mur: ['safe', 'vault', 'war_intelcab'], centre: ['airlock'], tapis: 'rug', coins: ['plant', 'plant', 'plant', 'plant'], sud: [] },
  'SALLE DE REPOS': { mur: ['jukebox', 'bar', 'arcade'], centre: ['couch', 'pinball'], tapis: 'rug_large', coins: ['plant', 'coffee', 'plant', 'plant'], sud: [] },
}
const SANS_BLOC = new Set(['plant', 'rug', 'rug_small', 'rug_large', 'cablerun', 'desklamp', 'coffee'])
const rapport = { etages: 0, salles: 0, chaines: 0, bureaux: 0, objets: 0, refuses: [], injoignables: [] }

function construire(origine) {
  const ancien = WM.deserialize(structuredClone(origine))
  const agentsParSalle = {}
  for (const p of ancien.props()) if (p.agentId && p.t === 'desk') (agentsParSalle[norm(ancien.roomById(ancien.roomAt(p.x, p.y))?.name)] ??= []).push(p.agentId)
  const agentsEnLigne = new Set(Object.values(SALLES).flatMap((s) => s.chaine?.agents || []))
  const vide = { schema: 'starnet.station', version: origine.version, _nid: 1, meta: { ...origine.meta, spawnRoomId: null, trunkRoomId: null }, rooms: {}, order: [], props: [], belts: {}, edges: [] }
  let M = WM.deserialize(vide)
  const ids = {}

  // 1. bandeaux, salles séparées, ascenseurs
  ETAGES.forEach((e, i) => {
    const y0 = i * PAS
    const b = M.addRoom({ name: e.nom, kind: 'corridor', rect: { x1: 0, y1: y0, x2: LARGEUR, y2: y0 + 1 }, floorStyle: e.sol })
    if (b?.ok === false) rapport.refuses.push(`bandeau ${e.nom} : ${b.error || b.code}`); else { M.setWalls(b.id, { style: e.coque }); M.setHull(b.id, { style: e.coque }); rapport.etages++ }
    let x = 0
    for (const [nom, genre, largeur, sol, mat, coque, accent] of e.salles) {
      const res = M.addRoom({ name: nom, kind: genre, rect: { x1: x, y1: y0 + 2, x2: x + largeur - 1, y2: y0 + 1 + HAUT }, floorStyle: sol, floorMat: mat })
      if (res?.ok === false) { rapport.refuses.push(`salle ${nom} : ${res.error || res.code}`); x += largeur + ECART; continue }
      ids[norm(nom)] = { id: res.id, accent }
      M.setWalls(res.id, { style: coque }); M.setHull(res.id, { style: coque }); rapport.salles++
      x += largeur + ECART
    }
    if (i < ETAGES.length - 1) {
      const a = M.addRoom({ name: `ASCENSEUR ${5 - i}-${4 - i}`, kind: 'corridor', rect: { x1: 34, y1: y0 + 2 + HAUT, x2: 36, y2: y0 + PAS - 1 }, floorStyle: 'amber' })
      if (a?.ok === false) rapport.refuses.push(`ascenseur ${i} : ${a.error || a.code}`)
    }
  })
  if (ids['COMMANDEMENT']) { M.doc().meta.spawnRoomId = ids['COMMANDEMENT'].id; M.doc().meta.trunkRoomId = ids['COMMANDEMENT'].id }

  const poser = (t, x, y, extra = {}) => {
    const [w, h] = TAILLE[t] || [1, 1]
    const res = M.addProp({ t, x, y, w, h, ...(SANS_BLOC.has(t) ? { block: false } : {}), ...extra })
    return res?.ok === false ? null : res
  }
  // essaie la case voulue puis ses voisines (rayon croissant) dans la salle
  const poserProche = (t, x, y, r) => {
    const [w, h] = TAILLE[t] || [1, 1]
    for (let d = 0; d <= 4; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue
      const xx = x + dx, yy = y + dy
      if (xx < r.x1 + 1 || yy < r.y1 + 1 || xx + w - 1 > r.x2 - 1 || yy + h - 1 > r.y2 - 1) continue
      const res = poser(t, xx, yy); if (res) return res
    }
    return null
  }
  // répartit des objets régulièrement sur une rangée
  const rangee = (types, r, y, nom) => {
    const larges = types.map((t) => (TAILLE[t] || [1, 1])[0])
    const interieur = r.x2 - r.x1 - 1, reste = interieur - larges.reduce((a, b) => a + b, 0)
    if (reste < 0) rapport.refuses.push(`rangée trop large dans ${nom}`)
    const jeu = Math.max(1, Math.floor(reste / (types.length + 1)))
    let x = r.x1 + 1 + Math.max(0, Math.floor((reste - jeu * (types.length + 1)) / 2)) + jeu
    types.forEach((t, k) => { if (poserProche(t, x, y, r)) rapport.objets++; else rapport.refuses.push(`${t} : pas de place dans ${nom}`); x += larges[k] + jeu })
  }

  // 2. composition de chaque salle
  for (const [cle, plan] of Object.entries(SALLES)) {
    const ref = ids[cle]; if (!ref) continue
    const piece = M.roomById(ref.id), r = piece.rects[0], cx = Math.floor((r.x1 + r.x2) / 2), cy = Math.floor((r.y1 + r.y2) / 2)
    // sol : anneau d'accent à 1 case des murs + tapis central de la couleur de la salle
    const anneau = []
    for (let x = r.x1; x <= r.x2; x++) for (let y = r.y1; y <= r.y2; y++) if (x === r.x1 + 1 || x === r.x2 - 1 || y === r.y1 + 1 || y === r.y2 - 1) if (x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2) anneau.push([x, y])
    M.paintTiles(ref.id, anneau, ref.accent)
    // rangée du fond (équipement contre le mur nord)
    rangee(plan.mur || [], r, r.y1 + 1, cle)
    // tapis central puis pièce maîtresse
    if (plan.tapis) poser(plan.tapis, cx - Math.floor((TAILLE[plan.tapis]?.[0] || 2) / 2), cy - 1)
    if (plan.centre?.length) rangee(plan.centre, r, cy - 1, cle)
    // ligne de production au milieu de la salle (Inbox > Bay… > Outbox, tapis roulant sur toute la largeur)
    if (plan.chaine) {
      const n = plan.chaine.agents.length
      const total = 2 + n * 3 + 3, depart = r.x1 + 1 + Math.max(0, Math.floor((r.x2 - r.x1 - 1 - total) / 2))
      let pose = false
      for (let dy = 0; dy <= 3 && !pose; dy++) for (const sgn of [0, 1, -1]) { // essaie autour de la ligne médiane
        const y = cy + (sgn === 0 ? 0 : sgn * dy)
        for (let dx = 0; dx <= 3 && !pose; dx++) {
          const T = WM.deserialize(M.serialize())
          T.__regles = true
          let xx = depart + dx, ok = true
          const p2 = (t, extra = {}) => { const res = T.addProp({ t, x: xx, y, w: 2, h: 2, ...extra }); if (res?.ok === false) ok = false; xx += 2; return res }
          const tapis = (len) => { for (let k = 0; k < len; k++) { const b = T.setBelt(xx, y + 1, 'E'); if (b?.ok === false) ok = false; xx += 1 } }
          const entree = p2('intake'); const bays = []
          for (let k = 0; k < n && ok; k++) { tapis(1 + (k === 0 ? 1 : 0)); bays.push(p2('bay', { role: 'GENERALIST' })) }
          if (ok) { tapis(2); p2('outbox') }
          if (!ok) continue
          bays.forEach((b, k) => { const pid = idDe(b); if (pid) T.assignPropAgent(pid, plan.chaine.agents[k]) })
          const eid = idDe(entree); if (eid) T.setPropLabel(eid, plan.chaine.label)
          M = T; pose = true; rapport.chaines++
        }
      }
      if (!pose) rapport.refuses.push(`chaîne ${plan.chaine.label} : pas de place dans ${cle}`)
    }
    // bureaux des agents (hors chaîne) alignés sur la rangée sud
    const bureaux = (agentsParSalle[cle] || []).filter((a) => !agentsEnLigne.has(a))
    bureaux.forEach((ag, k) => {
      const x = r.x1 + 2 + k * 3
      const res = poserProche('desk', x, r.y2 - 2, r)
      if (res) { M.assignPropAgent(idDe(res), ag); rapport.bureaux++ } else rapport.refuses.push(`bureau ${ag} : pas de place dans ${cle}`)
    })
    // décor sud puis coins
    if (plan.sud?.length) rangee(plan.sud, r, r.y2 - 3, cle)
    const coins = [[r.x1 + 1, r.y1 + 1], [r.x2 - 1, r.y1 + 1], [r.x1 + 1, r.y2 - 1], [r.x2 - 1, r.y2 - 1]]
    ;(plan.coins || []).forEach((t, k) => { const [x, y] = coins[k % 4]; if (poserProche(t, x - (k % 2 ? (TAILLE[t]?.[0] || 1) - 1 : 0), y - (k >= 2 ? (TAILLE[t]?.[1] || 1) - 1 : 0), r)) rapport.objets++ })
  }
  for (const aid of [...new Set(ancien.props().filter((p) => p.agentId).map((p) => p.agentId))]) { if (M.props().some((p) => p.agentId === aid)) continue; const w = M.ensureWorkstation(aid); if (w?.ok === false) rapport.refuses.push(`poste ${aid} : ${w.error || 'refusé'}`) }

  // connectivité : toute salle atteignable depuis le Commandement
  const g = M.projectGeometry()
  const centre = (z) => { // case praticable la plus proche du centre (le centre peut porter un objet)
    const rr = g.allRects.find((q) => q.z === z); if (!rr) return null
    const mx = Math.floor((rr.x1 + rr.x2) / 2), my = Math.floor((rr.y1 + rr.y2) / 2); let meilleur = null, dist = 1e9
    for (let y = rr.y1; y <= rr.y2; y++) for (let x = rr.x1; x <= rr.x2; x++) if (g.walkable(x, y)) { const d = Math.abs(x - mx) + Math.abs(y - my); if (d < dist) { dist = d; meilleur = [x, y] } }
    return meilleur }
  const dep = centre(ids['COMMANDEMENT']?.id)
  for (const [cle, ref] of Object.entries(ids)) { const c = centre(ref.id); if (!c || !dep) continue; if (g.path(dep[0], dep[1], c[0], c[1]) === null) rapport.injoignables.push(cle) }
  return M
}

const s = await sidecar()
const brut = await (await fetch(`http://127.0.0.1:${s.port}/api/save?agent=agent`, { headers: { 'x-starnet-token': s.jeton } })).json()
const origine = fs.readdirSync(SAUV).sort().map((f) => JSON.parse(fs.readFileSync(path.join(SAUV, f), 'utf8'))).find((j) => Object.keys(j.save.station.belts || {}).length === 0).save.station
const enveloppe = brut.save
fs.mkdirSync(SAUV, { recursive: true })
fs.writeFileSync(path.join(SAUV, `save-agent-avant-v4-${Date.now()}.json`), JSON.stringify(brut))
const M = construire(origine)
const doc = M.serialize()
const compte = {}; for (const p of doc.props) if (p.agentId) (compte[p.agentId] ??= []).push(p.t)
console.log(JSON.stringify({ apres: { salles: Object.keys(doc.rooms).length, objets: doc.props.length, tapis: Object.keys(doc.belts || {}).length, agentsPoses: Object.keys(compte).length, doublons: Object.entries(compte).filter(([, v]) => v.length > 1).map(([k]) => k) }, rapport }, null, 1))
if (A_SEC) process.exit(0)
enveloppe.station = doc
enveloppe.updatedAt = Date.now()
const rep = await fetch(`http://127.0.0.1:${s.port}/api/save`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify(enveloppe) })
console.log('POST /api/save :', rep.status, (await rep.text()).slice(0, 200))
