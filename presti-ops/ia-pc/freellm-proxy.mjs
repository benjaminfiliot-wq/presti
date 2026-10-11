// freellm-proxy.mjs — petit relais local pour StarNet (05/10/2026).
// StarNet garde pour chaque agent le nom de modèle choisi à la création (ex. qwen3:4b-instruct-2507-q4_K_M) ; freellmapi, lui, refuse tout nom hors de son
// catalogue (« model_not_found ») et n'accepte que « auto » ou un modèle de sa liste. Ce relais écoute sur 127.0.0.1:3001 (là où StarNet pointe), remplace par « auto »
// tout nom de modèle inconnu de freellmapi, et transmet le reste tel quel (en-têtes, clé, flux SSE) vers 127.0.0.1:3101 (le tunnel ssh vers l'usine).
// L'en-tête Authorization de StarNet passe tel quel. 06/10 soir : StarNet PERD sa clé « Custom » à chaque redémarrage (« Invalid API key » : toutes les
// courses de la station échouaient en silence, « 0 working »). Quand la requête n'a pas de clé freellmapi, le relais met celle du fichier des secrets
// (lue une fois au démarrage, gardée en mémoire, jamais journalisée ni renvoyée).
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const CLE_SECOURS = (() => {
  try { return (fs.readFileSync(path.join(process.env.USERPROFILE || process.env.HOME || '', 'Documents', 'presti-secrets', 'freellmapi.txt'), 'utf8').match(/freellmapi-[A-Za-z0-9_-]{20,}/) || [])[0] || null } catch { return null }
})()
const autorisationDe = (h) => (/^Bearer freellmapi-/.test(String(h || '')) ? h : (CLE_SECOURS ? `Bearer ${CLE_SECOURS}` : h))

const ECOUTE = Number(process.env.FL_PROXY_PORT || 3001)
const CIBLE = { host: '127.0.0.1', port: Number(process.env.FL_CIBLE_PORT || 3101) }
let catalogue = new Set(['auto', 'fusion'])
let catalogueLe = 0

function appeler(opts, corps) {
  return new Promise((resolve, reject) => {
    const r = http.request({ ...CIBLE, ...opts }, resolve)
    r.on('error', reject)
    if (corps) r.write(corps)
    r.end()
  })
}

async function majCatalogue(autorisation) {
  if (Date.now() - catalogueLe < 10 * 60_000 || !autorisation) return
  try {
    const rep = await appeler({ path: '/v1/models', method: 'GET', headers: { authorization: autorisation } })
    let s = ''; for await (const c of rep) s += c
    const ids = JSON.parse(s).data?.map((m) => m.id) || []
    if (ids.length) { catalogue = new Set(ids); catalogueLe = Date.now() }
  } catch { /* on garde le catalogue connu */ }
}

http.createServer(async (req, res) => {
  const morceaux = []
  for await (const c of req) morceaux.push(c)
  let corps = Buffer.concat(morceaux)
  const entetes = { ...req.headers, host: `${CIBLE.host}:${CIBLE.port}` }
  const auth = autorisationDe(req.headers.authorization)
  if (auth) entetes.authorization = auth
  if (req.method === 'POST' && /\/v1\/(chat\/completions|responses|completions)/.test(req.url) && corps.length) {
    try {
      const j = JSON.parse(corps.toString('utf8'))
      await majCatalogue(auth)
      if (typeof j.model === 'string' && !catalogue.has(j.model)) { j.model = 'auto'; corps = Buffer.from(JSON.stringify(j)); }
      entetes['content-length'] = String(corps.length)
    } catch { /* corps non JSON : transmis tel quel */ }
  }
  try {
    const rep = await appeler({ path: req.url, method: req.method, headers: entetes }, corps.length ? corps : null)
    res.writeHead(rep.statusCode || 502, rep.headers)
    rep.pipe(res)
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'freellm-proxy : tunnel vers freellmapi injoignable', code: 'tunnel' } }))
  }
}).listen(ECOUTE, '127.0.0.1', () => console.log(`freellm-proxy : 127.0.0.1:${ECOUTE} -> 127.0.0.1:${CIBLE.port}`))
