// Découverte + preuve du cycle Managed Agents (agent → env → session → résultat).
// Tâche triviale (Haiku) pour un coût minimal ; nettoyage en fin.
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const K = env.ANTHROPIC_API_KEY
const H = { 'x-api-key': K, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'managed-agents-2026-04-01', 'content-type': 'application/json' }
const api = async (p, o = {}) => { const r = await fetch('https://api.anthropic.com' + p, { ...o, headers: { ...H, ...(o.headers || {}) } }); const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }; return { status: r.status, j } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const a = await api('/v1/agents', { method: 'POST', body: JSON.stringify({ name: 'Presti-Probe', model: 'claude-haiku-4-5', system: 'Tu réponds en une phrase, puis tu termines. Pas d\'outils nécessaires.', tools: [{ type: 'agent_toolset_20260401' }] }) })
console.log('agent:', a.status, a.j.id)
const e = await api('/v1/environments', { method: 'POST', body: JSON.stringify({ name: 'presti-probe-env', config: { type: 'cloud', networking: { type: 'unrestricted' } } }) })
console.log('env  :', e.status, e.j.id)
const s = await api('/v1/sessions', { method: 'POST', body: JSON.stringify({ agent: a.j.id, environment_id: e.j.id, title: 'probe' }) })
console.log('sess :', s.status, s.j.id, '| status initial:', s.j.status)
const sid = s.j.id

// Envoi du message (on teste si le polling suffit sans stream ouvert)
const snd = await api(`/v1/sessions/${sid}/events`, { method: 'POST', body: JSON.stringify({ events: [{ type: 'user.message', content: [{ type: 'text', text: 'Dis simplement "coentreprise opérationnelle" puis termine.' }] }] }) })
console.log('send :', snd.status, typeof snd.j === 'object' ? JSON.stringify(snd.j).slice(0, 120) : snd.j)

// Polling du statut de session
let last = ''
for (let i = 0; i < 40; i++) {
  await sleep(3000)
  const st = await api(`/v1/sessions/${sid}`)
  const status = st.j.status || st.j.state || '?'
  if (status !== last) { console.log(`  [${i * 3}s] status:`, status); last = status }
  if (['idle', 'completed', 'ended', 'stopped'].includes(String(status))) break
  if (st.status >= 400) { console.log('  erreur poll:', st.status, JSON.stringify(st.j).slice(0, 160)); break }
}

// Lecture des events
const ev = await api(`/v1/sessions/${sid}/events`)
console.log('events GET:', ev.status)
const items = ev.j.data || ev.j.events || []
console.log('  nb events:', items.length)
for (const it of items.slice(-8)) {
  const txt = (it.content || []).map((b) => b.text).filter(Boolean).join(' ')
  console.log('   -', it.type, txt ? '· ' + txt.slice(0, 120) : (it.name ? '· tool:' + it.name : ''))
}

// Nettoyage
await api(`/v1/environments/${e.j.id}`, { method: 'DELETE' })
await api(`/v1/agents/${a.j.id}/archive`, { method: 'POST' })
console.log('nettoyé (env supprimé, agent archivé)')
