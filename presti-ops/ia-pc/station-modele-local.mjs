// station-modele-local.mjs — le « modèle » de la station StarNet, sans IA, sans quota (06/10/2026 au soir).
//
// POURQUOI : StarNet n'affiche un agent « WORKING » que pendant une course de modèle. Le pont (starnet-pont.mjs) lançait ces courses vers
// freellmapi (gratuit, partagé) : à force, freellmapi répondait « rate_limit » et la station restait figée à « 0 working ». Or ces courses
// n'ont besoin d'aucune intelligence : (1) refléter un fait RÉEL du journal du bus (le texte est déjà écrit), (2) poser un widget avec des
// arguments DÉJÀ calculés. Ce serveur OpenAI-compatible (127.0.0.1:3002/v1) fait exactement ça, de façon déterministe :
//   · consigne « Appelle une seule fois l'outil widget.set avec EXACTEMENT ces arguments JSON… » → un appel d'outil avec ces arguments, puis « ok » ;
//   · tout autre message → la ligne du fait réel (le texte entre « » de la consigne), déroulée mot à mot sur ~30 s pour que la station montre
//     l'agent au travail pendant ce temps. Aucun texte inventé : on ne renvoie que ce que la consigne contient.
import http from 'node:http'

const PORT = Number(process.env.STATION_MODELE_PORT || 3002)
const DUREE_MS = Number(process.env.STATION_DUREE_MS || 30_000)

function dernierUtilisateur(messages) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user') return String(typeof messages[i].content === 'string' ? messages[i].content : (messages[i].content || []).map((c) => c.text || '').join(' '))
  return ''
}
function ligneDuFait(texte) {
  const resume = /résumé « ([^»]+) »|resume « ([^»]+) »/i.exec(texte)
  const type = /type « ([^»]+) »/i.exec(texte)
  if (resume) return `${type ? `${type[1]} : ` : ''}${resume[1] || resume[2]}`.slice(0, 220)
  const tous = [...texte.matchAll(/« ([^»]{3,200}) »/g)].map((m) => m[1])
  return (tous[0] || 'travail en cours').slice(0, 220)
}
function nomOutilWidget(tools) {
  for (const t of tools || []) { const n = t?.function?.name || t?.name; if (n && /widget/i.test(n) && /set/i.test(n)) return n }
  return 'widget.set'
}
const ident = () => `station-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

http.createServer(async (req, res) => {
  const morceaux = []
  for await (const c of req) morceaux.push(c)
  if (req.method === 'GET' && /\/v1\/models/.test(req.url)) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: [{ id: 'auto', object: 'model' }, { id: 'station', object: 'model' }] })); return }
  if (!(req.method === 'POST' && /\/v1\/chat\/completions/.test(req.url))) { res.writeHead(404); res.end(); return }
  let corps = {}
  try { corps = JSON.parse(Buffer.concat(morceaux).toString('utf8')) } catch { /* corps vide */ }
  const messages = Array.isArray(corps.messages) ? corps.messages : []
  const texte = dernierUtilisateur(messages)
  const outilDejaRendu = messages.some((m) => m?.role === 'tool')
  const id = ident(), modele = corps.model || 'station', cree = Math.floor(Date.now() / 1000)
  // 1. le widget : un seul appel d'outil avec les arguments exacts, puis « ok »
  const w = /widget\.set avec EXACTEMENT ces arguments JSON[^\n]*\n(\{[\s\S]*\})\s*$/.exec(texte)
  if (w && !outilDejaRendu) {
    let args = null
    try { args = JSON.parse(w[1]) } catch { args = null }
    if (args) {
      const appel = { id: `appel-${id}`, type: 'function', function: { name: nomOutilWidget(corps.tools), arguments: JSON.stringify(args) } }
      if (corps.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
        res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: cree, model: modele, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, ...appel }] }, finish_reason: null }] })}\n\n`)
        res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: cree, model: modele, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] })}\n\n`)
        res.end('data: [DONE]\n\n')
      } else {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ id, object: 'chat.completion', created: cree, model: modele, choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [appel] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }))
      }
      return
    }
  }
  // 2. le reflet d'un fait réel : la ligne du fait, déroulée sur DUREE_MS (l'agent est « WORKING » pendant ce temps)
  const ligne = outilDejaRendu ? 'ok' : `Je viens de travailler — ${ligneDuFait(texte)}`
  const mots = ligne.split(' ')
  if (corps.stream) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    const pas = outilDejaRendu ? 0 : Math.floor(DUREE_MS / Math.max(1, mots.length))
    for (let i = 0; i < mots.length; i++) {
      res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: cree, model: modele, choices: [{ index: 0, delta: { ...(i === 0 ? { role: 'assistant' } : {}), content: (i ? ' ' : '') + mots[i] }, finish_reason: null }] })}\n\n`)
      if (pas) await pause(pas)
      if (res.destroyed) return
    }
    res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: cree, model: modele, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`)
    res.end('data: [DONE]\n\n')
  } else {
    if (!outilDejaRendu) await pause(DUREE_MS)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id, object: 'chat.completion', created: cree, model: modele, choices: [{ index: 0, message: { role: 'assistant', content: ligne }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }))
  }
}).listen(PORT, '127.0.0.1', () => console.log(`station-modele-local : 127.0.0.1:${PORT}/v1 (déterministe, sans IA)`))
