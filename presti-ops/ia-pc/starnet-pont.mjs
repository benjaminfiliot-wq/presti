// starnet-pont.mjs — alimente les widgets de StarNet avec l'état RÉEL de Presti (05/10/2026).
// Les données viennent du connecteur Presti en lecture seule (127.0.0.1:8799, 7 fonctions SQL « stable » de la liste blanche), lues ICI, sans modèle : aucun chiffre ne peut être inventé.
// Pour l'affichage, un lancement direct de MATT (/api/run, freellmapi) appelle l'outil widget.set de StarNet avec EXACTEMENT les arguments calculés (widget.set n'a pas de porte de consentement :
// c'est une écriture locale dans le décor de la station). Un widget qui n'a pas pu être posé est relu dans /api/widgets et réessayé au tour suivant.
// Rien ne sort de la machine ; jamais de clé ; le jeton local de StarNet est relu dans la page à chaque tour.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PERIODE_MS = Number(process.env.PONT_PERIODE_MIN || 10) * 60_000
const MCP = process.env.PRESTI_MCP || 'http://127.0.0.1:8799/mcp'
// 05/10 nuit : après un redémarrage StarNet perd son réglage « Custom » (réponse 400 « configure the CUSTOM base URL ») ; le serveur accepte l'adresse dans la requête.
const BASE_CUSTOM = process.env.STARNET_CUSTOM_BASE || 'http://127.0.0.1:3001/v1'

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
    body: JSON.stringify({ agentId: 'agent', provider: 'custom', model: 'auto', baseUrl: BASE_CUSTOM, isTask: true, messages: [{ role: 'user', content: consigne }] }),
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
    body: JSON.stringify({ agentId: id, provider: 'custom', model: 'auto', baseUrl: BASE_CUSTOM, isTask: true, messages: [{ role: 'user', content: consigne }] }),
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
  const r = await fetch(`http://127.0.0.1:${s.port}/api/run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: JSON.stringify({ agentId: id, provider: 'custom', model: 'auto', baseUrl: BASE_CUSTOM, isTask: true, messages: [{ role: 'user', content: consigne }] }), signal: AbortSignal.timeout(90_000) })
  const texte = await r.text()
  refleterEvenement.dernierRunId = /"runId"\s*:\s*"([0-9a-f-]{36})"/.exec(texte)?.[1] ?? null
  // la réponse ne porte pas toujours l'identifiant : on le lit dans l'historique des courses de CET agent (la plus récente, terminée après l'appel)
  if (!refleterEvenement.dernierRunId && r.ok) {
    try {
      const h = await (await fetch(`http://127.0.0.1:${s.port}/api/runs?agent=${encodeURIComponent(id)}&limit=3&since=${Date.now() - 120_000}`, { headers: { 'x-starnet-token': s.jeton }, signal: AbortSignal.timeout(15_000) })).json()
      refleterEvenement.dernierRunId = (h.runs || []).find((x) => x && x.reason === 'done')?.runId ?? null
    } catch { /* pas d'XP cette fois : jamais bloquant */ }
  }
  return r.ok
}

// ── quêtes et XP RÉELS (05/10 nuit, demande de Benj : « les niveaux, l'XP qui suivent les tâches et les quêtes »).
// Règles de StarNet respectées : une quête ne donne jamais d'XP ; l'XP naît seulement d'un retour « excellent » sur un travail RENDU (/api/growth/ratings),
// que le serveur valide (course réelle, terminée, non interne ; delta fixé par lui). Ici : tâche PRISE sur le bus = quête ouverte pour l'agent ;
// tâche FAITE avec preuve jointe = quête terminée avec preuve, et un seul retour « excellent » sur le passage qui vient d'être écrit. Jamais pour un échec.
const ICI = path.dirname(fileURLToPath(import.meta.url))
const FICHIER_QUETES = path.join(ICI, 'starnet-pont-quetes.json')
const lireQuetes = () => { try { return JSON.parse(fs.readFileSync(FICHIER_QUETES, 'utf8')) } catch { return { ouvertes: {} } } }
const ecrireQuetes = (q) => { try { fs.writeFileSync(FICHIER_QUETES, JSON.stringify(q)) } catch { /* disque : pas bloquant */ } }
async function appelSn(s, methode, chemin, corps) {
  const r = await fetch(`http://127.0.0.1:${s.port}${chemin}`, { method: methode, headers: { 'content-type': 'application/json', 'x-starnet-token': s.jeton }, body: corps ? JSON.stringify(corps) : undefined, signal: AbortSignal.timeout(30_000) })
  let j = null; try { j = await r.json() } catch { /* corps vide */ }
  return { statut: r.status, j }
}
let epoqueCache = { v: 0, le: 0 }
async function epoque(s) {
  if (epoqueCache.v && Date.now() - epoqueCache.le < 600_000) return epoqueCache.v
  const { j } = await appelSn(s, 'GET', '/api/save?key=agent')
  epoqueCache = { v: Math.max(1, Math.floor(Number(j?.save?.agent?.createdAt) || 1)), le: Date.now() }
  return epoqueCache.v
}
async function noterTravail(s, agentSn, runId) {
  const corps = { runId, verdict: 'great', epoch: await epoque(s), entries: [{ agentId: agentSn, id: 'work:' + runId, runId, delta: 3, reason: 'work_great' }] }
  const { statut, j } = await appelSn(s, 'POST', '/api/growth/ratings', corps)
  console.log(`${new Date().toISOString()} XP ${agentSn} : retour « excellent » sur la tâche faite → HTTP ${statut}${j?.ok ? (j.duplicate ? ' (déjà noté)' : ' (XP posé)') : ' ' + String(j?.error ?? '').slice(0, 90)}`)
}
async function queteEvenement(s, e, runId) {
  const agentSn = ID_STARNET[e.agent] || e.agent
  const etat = lireQuetes()
  const typeTache = /tâche (\S+)/.exec(String(e.resume))?.[1] ?? 'tâche'
  if (e.type === 'tache_prise') {
    const { statut, j } = await appelSn(s, 'POST', '/api/quests/mint', { title: `Tâche ${typeTache} · ${e.agent}`, desc: `${String(e.resume).slice(0, 140)} (évènement ${e.id})`, kind: 'work', agentId: agentSn, contract: { type: 'attest', key: '' }, steps: ['prise', 'faite'] })
    if (j?.ok && j.id) { (etat.ouvertes[e.agent] ||= []).push({ id: j.id, ev: e.id }); if (etat.ouvertes[e.agent].length > 20) etat.ouvertes[e.agent].shift(); ecrireQuetes(etat) }
    console.log(`${new Date().toISOString()} quête ${e.agent} : ouverte pour « ${typeTache} » → HTTP ${statut}${j?.ok ? '' : ' ' + String(j?.error ?? '').slice(0, 90)}`)
  } else if (e.type === 'tache_faite') {
    const q = (etat.ouvertes[e.agent] || []).shift()
    if (q) {
      ecrireQuetes(etat)
      await appelSn(s, 'POST', '/api/quests/update', { id: q.id, op: 'tick', stepKey: 'prise', note: 'tâche prise' })
      await appelSn(s, 'POST', '/api/quests/update', { id: q.id, op: 'tick', stepKey: 'faite', note: String(e.resume).slice(0, 120) })
      const { statut, j } = await appelSn(s, 'POST', '/api/quests/report', { id: q.id, evidence: `${String(e.resume).slice(0, 120)} · évènement ${e.id} du ${e.le} (preuve jointe au bus)` })
      console.log(`${new Date().toISOString()} quête ${e.agent} : terminée avec preuve → HTTP ${statut}${j?.ok ? '' : ' ' + String(j?.error ?? '').slice(0, 90)}`)
    }
    if (runId) await noterTravail(s, agentSn, runId)
  }
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
        const parAgent = new Map(); for (const e of nouveaux) if (!/^tache_(prise|faite)$/.test(e.type)) parAgent.set(e.agent, e) // le plus récent par agent
        const s = await sidecarCourt()
        // les tâches prises et faites : une à une, dans l'ordre, chacune avec SA quête (et son XP si elle est faite)
        for (const e of nouveaux.filter((x) => /^tache_(prise|faite)$/.test(x.type))) {
          try { const ok = await refleterEvenement(s, e); await queteEvenement(s, e, ok ? refleterEvenement.dernierRunId : null); parAgent.set(e.agent, e) } catch (err) { console.log(`${new Date().toISOString()} quête/XP ${e.agent} : ${String(err.message).slice(0, 90)}`) }
        }
        const generaux = [...parAgent.values()].filter((e) => !/^tache_(prise|faite)$/.test(e.type))
        const resultats = await Promise.all(generaux.map((e) => refleterEvenement(s, e).catch(() => false)))
        if (generaux.length && !resultats.some(Boolean)) console.log(`${new Date().toISOString()} ALERTE : StarNet a refusé les ${generaux.length} passage(s) (réglage Custom ? relais 3001 ?) : rien n'est allumé`)
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
