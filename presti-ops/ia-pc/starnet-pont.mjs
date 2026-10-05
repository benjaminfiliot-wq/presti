// starnet-pont.mjs — alimente les widgets de StarNet avec l'état RÉEL de Presti (05/10/2026).
// Les données viennent du connecteur Presti en lecture seule (127.0.0.1:8799, 7 fonctions SQL « stable » de la liste blanche), lues ICI, sans modèle : aucun chiffre ne peut être inventé.
// Pour l'affichage, un lancement direct de MATT (/api/run, freellmapi) appelle l'outil widget.set de StarNet avec EXACTEMENT les arguments calculés (widget.set n'a pas de porte de consentement :
// c'est une écriture locale dans le décor de la station). Un widget qui n'a pas pu être posé est relu dans /api/widgets et réessayé au tour suivant.
// Rien ne sort de la machine ; jamais de clé ; le jeton local de StarNet est relu dans la page à chaque tour.
import { execSync } from 'node:child_process'

const PERIODE_MS = Number(process.env.PONT_PERIODE_MIN || 10) * 60_000
const MCP = process.env.PRESTI_MCP || 'http://127.0.0.1:8799/mcp'

async function outil(nom) {
  const r = await fetch(MCP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: nom, arguments: {} } }), signal: AbortSignal.timeout(30_000) })
  const j = await r.json()
  return JSON.parse(j.result.content[0].text)
}

function composer({ equipe, attention, jauges, interr, sante, decisions }) {
  const tronque = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s))
  const actifs = equipe.par_etat?.actif ?? 0
  const total = equipe.total ?? 0
  const muets = equipe.par_etat?.muet ?? 0
  const attn = (attention.sources || []).filter((x) => x.nombre > 0)
  const nAttn = attn.reduce((a, x) => a + x.nombre, 0)
  const dernier = (equipe.agents || []).map((a) => a.dernier_evenement).filter(Boolean)
  const canaux = jauges.canaux || []
  const plafondTotal = canaux.reduce((a, c) => a + (c.plafond || 0), 0)
  const utilises = canaux.reduce((a, c) => a + (c.utilises || 0), 0)
  const w = []
  w.push({ id: 'equipe', label: 'AGENTS ACTIFS', value: `${actifs}/${total}`, sub: muets ? `${muets} muet(s)` : 'aucun muet', tone: muets ? 'warn' : 'ok', progress: total ? Math.round((actifs / total) * 100) : 0 })
  w.push({ id: 'attention', label: 'ATTENTION', value: String(nAttn), sub: nAttn ? 'à traiter' : 'rien pour toi', tone: nAttn ? 'warn' : 'ok', ...(nAttn ? { list: attn.map((x) => tronque(`${x.nombre} · ${x.cle.replaceAll('_', ' ')}`, 80)).slice(0, 5) } : {}) })
  w.push({ id: 'site', label: 'SITE EN LIGNE', value: sante.site?.ok ? `HTTP ${sante.site.http}` : 'HORS LIGNE', sub: sante.site?.duree_ms ? `${sante.site.duree_ms} ms` : '', tone: sante.site?.ok ? 'ok' : 'bad' })
  w.push({ id: 'envoi-froid', label: 'ENVOI À FROID', value: interr.envoi_froid ? 'OUVERT' : 'FERMÉ', sub: `palier ${interr.palier}`, tone: interr.envoi_froid ? 'warn' : 'ok' })
  w.push({ id: 'pause', label: 'PAUSE GÉNÉRALE', value: interr.pause_generale ? 'ACTIVE' : 'NON', sub: 'interrupteur', tone: interr.pause_generale ? 'bad' : 'ok' })
  w.push({ id: 'envois-jour', label: 'ENVOIS DU JOUR', value: `${utilises}/${plafondTotal}`, sub: 'tous canaux', tone: 'ok', progress: plafondTotal ? Math.round((utilises / plafondTotal) * 100) : 0 })
  w.push({ id: 'decisions', label: 'DÉCISIONS', value: String(decisions.nombre ?? 0), sub: 'à prendre par toi', tone: decisions.nombre ? 'warn' : 'ok' })
  w.push({ id: 'journal', label: 'DERNIERS ÉVÈNEMENTS', list: dernier.slice(0, 5).map((e) => tronque(typeof e === 'string' ? e : `${e.type ?? ''} ${e.resume ?? ''}`.trim(), 88)) })
  return w.filter((x) => x.value || (x.list && x.list.length))
}

async function sidecar() {
  const sortie = execSync('powershell -NoProfile -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -eq \'127.0.0.1\' -and $_.LocalPort -gt 1024 } | Select-Object -ExpandProperty LocalPort"', { encoding: 'utf8' })
  for (const port of sortie.split(/\s+/).filter(Boolean).map(Number)) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) })
      if (!r.ok) continue
      const html = await r.text()
      const jeton = /__STARNET_API_TOKEN__\s*=\s*"([^"]+)"/.exec(html)?.[1]
      if (jeton && /<title>STARNET<\/title>/i.test(html)) return { port, jeton }
    } catch { /* port suivant */ }
  }
  return null
}

async function poser(s, widget) {
  const consigne = `Appelle une seule fois l'outil widget.set avec EXACTEMENT ces arguments JSON, sans rien changer, puis reponds seulement : ok.\n${JSON.stringify(widget)}`
  const r = await fetch(`http://127.0.0.1:${s.port}/api/run`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton },
    body: JSON.stringify({ agentId: 'agent', provider: 'custom', model: 'auto', isTask: true, messages: [{ role: 'user', content: consigne }] }),
    signal: AbortSignal.timeout(120_000),
  })
  const t = await r.text()
  return /"name":"widget\.set"/.test(t) || /widget\.set/.test(t)
}

// Un passage court par agent Presti « actif » ou « muet » : l'agent StarNet du même nom reçoit son état RÉEL (lu dans la base) et en écrit une ligne ; pendant ce temps sa silhouette passe « WORKING » dans la station.
// Ce n'est pas le travail de l'agent de l'usine : c'est son reflet, alimenté uniquement par des faits lus ; aucun outil n'est donné au modèle.
const ID_STARNET = { chef: 'agent' }
async function refleter(s, a) {
  const id = ID_STARNET[a.nom] || a.nom
  const faits = [`etat : ${a.etat}`, a.battement_le ? `dernier battement : ${a.battement_le}` : null, a.prochain_le ? `prochain passage prevu : ${a.prochain_le}` : null, a.dernier_evenement ? `dernier evenement : ${typeof a.dernier_evenement === 'string' ? a.dernier_evenement : JSON.stringify(a.dernier_evenement).slice(0, 160)}` : null].filter(Boolean).join(' ; ')
  const consigne = `Etat reel de ton double dans l'usine Presti, releve a l'instant dans la base : ${faits}. Ecris UNE seule ligne courte en francais qui dit ou tu en es, en reprenant ces faits tels quels, sans rien inventer ni ajouter. N'appelle aucun outil.`
  const r = await fetch(`http://127.0.0.1:${s.port}/api/run`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton },
    body: JSON.stringify({ agentId: id, provider: 'custom', model: 'auto', isTask: true, messages: [{ role: 'user', content: consigne }] }),
    signal: AbortSignal.timeout(90_000),
  })
  await r.text()
  return r.ok
}

async function tour() {
  const s = await sidecar()
  if (!s) { console.log(`${new Date().toISOString()} StarNet fermé : rien posé`); return }
  const donnees = {}
  for (const [cle, nom] of [['equipe', 'equipe_etat'], ['attention', 'attention'], ['jauges', 'jauges'], ['interr', 'interrupteurs'], ['sante', 'sante_production'], ['decisions', 'decisions_en_attente']]) donnees[cle] = await outil(nom)
  const widgets = composer(donnees)
  let ok = 0
  for (const w of widgets) { try { if (await poser(s, w)) ok++ } catch (e) { console.log(`  ${w.id} : ${String(e.message).slice(0, 80)}`) } }
  let refletes = 0
  const agents = (donnees.equipe.agents || []).filter((a) => a.etat === 'actif' || a.etat === 'muet')
  // par lots de 7 agents EN PARALLÈLE : la station s'allume par grappes (un tour dure environ une minute au lieu de dix) ; les 7 lots se suivent sans pause.
  for (let i = 0; i < agents.length; i += 7) {
    const lot = agents.slice(i, i + 7)
    const res = await Promise.all(lot.map((a) => refleter(s, a).catch((e) => { console.log(`  ${a.nom} : ${String(e.message).slice(0, 80)}`); return false })))
    refletes += res.filter(Boolean).length
  }
  console.log(`${new Date().toISOString()} agents reflétés : ${refletes}/${agents.length}`)
  const liste = await (await fetch(`http://127.0.0.1:${s.port}/api/widgets`, { headers: { 'x-starnet-token': s.jeton } })).json().catch(() => ({}))
  const presents = (liste.widgets || liste || []).filter?.((x) => x && !x.deleted).map((x) => x.id) ?? []
  console.log(`${new Date().toISOString()} widgets : ${ok}/${widgets.length} appels, présents [${presents.join(', ')}]`)
}

// ── activité RÉELLE : toutes les 15 s on lit le journal ; chaque nouvel évènement d'un agent allume SON double dans StarNet pendant son passage (« WORKING » = il vient réellement de travailler).
// Le double reçoit l'évènement tel qu'il est écrit en base (type, résumé) et en fait une ligne ; aucun outil, aucune écriture.
let dernierId = null, sidecarCache = null, sidecarLe = 0
async function sidecarCourt() { if (!sidecarCache || Date.now() - sidecarLe > 60_000) { sidecarCache = await sidecar(); sidecarLe = Date.now() } return sidecarCache }
async function refleterEvenement(s, e) {
  const id = ID_STARNET[e.agent] || e.agent
  const consigne = `Tu viens de travailler dans l'usine Presti. Evenement reel releve dans la base : type « ${e.type} », resume « ${String(e.resume).slice(0, 160)} », a ${e.le}. Ecris UNE ligne courte en francais qui dit ce que tu viens de faire, en reprenant ces faits tels quels, sans rien inventer. N'appelle aucun outil.`
  const r = await fetch(`http://127.0.0.1:${s.port}/api/run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify({ agentId: id, provider: 'custom', model: 'auto', isTask: true, messages: [{ role: 'user', content: consigne }] }), signal: AbortSignal.timeout(90_000) })
  await r.text(); return r.ok
}
async function suivre() {
  for (;;) {
    try {
      const j = await outilAvec('journal_recent', { limite: 30 })
      const liste = (j.evenements || []).slice().sort((a, b) => a.id - b.id)
      if (dernierId === null) dernierId = liste.length ? liste[liste.length - 1].id : 0
      const nouveaux = liste.filter((e) => e.id > dernierId)
      if (nouveaux.length) {
        dernierId = nouveaux[nouveaux.length - 1].id
        const parAgent = new Map(); for (const e of nouveaux) parAgent.set(e.agent, e) // le plus récent par agent
        const s = await sidecarCourt()
        await Promise.all([...parAgent.values()].map((e) => refleterEvenement(s, e).catch(() => false)))
        console.log(`${new Date().toISOString()} activité : ${parAgent.size} agent(s) allumé(s) [${[...parAgent.keys()].join(', ')}]`)
      }
    } catch (e) { sidecarCache = null }
    await new Promise((fin) => setTimeout(fin, 15_000))
  }
}
async function outilAvec(nom, args) {
  const r = await fetch(MCP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: nom, arguments: args } }), signal: AbortSignal.timeout(30_000) })
  return JSON.parse((await r.json()).result.content[0].text)
}
suivre()

for (;;) {
  try { await tour() } catch (e) { console.log(`${new Date().toISOString()} erreur : ${String(e.message).slice(0, 140)}`) }
  await new Promise((fin) => setTimeout(fin, PERIODE_MS))
}
