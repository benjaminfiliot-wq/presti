// Garde des outils obligatoires (règle de Benj du 01/11/2026) : avant toute écriture de fichier et toute commande Bash de
// Claude Code (crochet PreToolUse sur Write|Edit|MultiEdit|Bash, .claude/settings.json, délai 30 s), on vérifie que n8n,
// Hermes et Orca sont là. Si l'un manque, l'action est bloquée (code 2) et Claude doit s'arrêter et demander à Benj de le
// reconnecter. L'outil PowerShell n'est pas gardé : c'est la porte de secours pour relancer le tunnel ou Orca.
//
// Ce que « là » veut dire ici (mesures du 01/11, voir CLAUDE.md « Où chaque outil tourne ») :
// - n8n   : le n8n d'Oracle répond à travers le tunnel permanent 127.0.0.1:5679 (tâche « Tunnel n8n Oracle »), et le
//           connecteur MCP n8n-oracle est déclaré dans Claude Code (~/.claude.json, portée user).
// - Hermes: hermes.exe est installé et sa config déclare les MCP n8n-oracle et cerveau, sans repli vers un modèle gratuit.
// - Orca  : son moteur local répond (ws://127.0.0.1:<port> lu dans %APPDATA%/orca/orca-runtime.json, 6768 par défaut).
//
// Rapide exprès : `hermes --version` (18 s) et `orca --version` (22 s) mesurés le 01/11 rendraient chaque écriture
// inutilisable. Le résultat positif est gardé 10 minutes en cache. La santé de n8n se lit d'abord dans le témoin du gardien
// du tunnel ; à défaut, une sonde de 4 s à travers le tunnel, et 2 s pour la sonde locale d'Orca.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import net from 'node:net'
import http from 'node:http'
import { controlerConfigHermes } from './hooks/config-hermes.mjs'

const CACHE = join(tmpdir(), 'presti-outils-obligatoires.json')
const DUREE_CACHE_MS = 10 * 60_000
const DELAI_MS = 2000
const LOCALAPPDATA = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
const APPDATA = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
// 02/11 après-midi : le serveur Oracle héberge aussi des agents Claude Code (24 Go de mémoire, contre 8 au PC). Ils n'y
// partent que par le lanceur de la session principale (~/agents/lancer.sh, qui pose PRESTI_HOTE_AGENTS=oracle), après que la
// garde du PC a vu Hermes et Orca ; chaque agent s'affiche dans un onglet Orca du PC. Sur Oracle, n8n est local
// (127.0.0.1:5678) : c'est lui qu'on sonde. Hors de ce lanceur, ou hors de Linux, rien ne change : la garde bloque comme avant.
const HOTE_AGENTS_ORACLE = process.env.PRESTI_HOTE_AGENTS === 'oracle' && process.platform === 'linux'
const PORT_N8N_LOCAL = Number(process.env.PRESTI_N8N_PORT_LOCAL || 5678)

function lireCache() {
  try {
    const c = JSON.parse(readFileSync(CACHE, 'utf8'))
    return c.ok && Date.now() - c.le < DUREE_CACHE_MS ? c : null
  } catch { return null }
}

function sondeHttp(url, delai) {
  return new Promise((resolve) => {
    // Pas de connexion persistante : chaque sonde ferme son canal SSH aussitôt (agent: false, Connection: close).
    const req = http.get(url, { timeout: delai, agent: false, headers: { Connection: 'close' } }, (res) => { res.resume(); resolve(res.statusCode === 200) })
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.on('error', () => resolve(false))
  })
}

function sondeTcp(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port, timeout: DELAI_MS }, () => { s.end(); resolve(true) })
    s.on('timeout', () => { s.destroy(); resolve(false) })
    s.on('error', () => resolve(false))
  })
}

async function verifierN8n() {
  // Le gardien du tunnel (presti-ops/usine/tunnel-n8n-oracle.ps1) sonde n8n toutes les 60 s et tient un témoin horodaté :
  // s'il a moins de 5 minutes, n8n est là, sans aucune requête réseau ici. Sinon, une seule sonde directe de 4 s. Le
  // 01/11, la première requête à froid à travers le tunnel a pris jusqu'à 7,5 s (PC à 600 Mo de mémoire libre) et le
  // crochet, limité à 10 s, bloquait à tort. Le soir du 01/11 (processeur à 85 %, trois sessions Hermes), le témoin avait
  // jusqu'à 132 s de retard et le lancement de node dépassait parfois 10 s : témoin toléré 5 min, crochet porté à 30 s.
  let frais = false
  try { frais = Date.now() - statSync(join(LOCALAPPDATA, 'presti-tunnel-n8n.ok')).mtimeMs < 5 * 60_000 } catch {}
  if (!frais && !(await sondeHttp('http://127.0.0.1:5679/healthz', 4000))) {
    return 'n8n Oracle injoignable par le tunnel 127.0.0.1:5679 (tâche planifiée « Tunnel n8n Oracle » arrêtée ou serveur coupé)'
  }
  try {
    const c = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'))
    if (!c.mcpServers || !c.mcpServers['n8n-oracle']) return 'connecteur MCP n8n-oracle absent de Claude Code (~/.claude.json)'
  } catch { return 'impossible de lire ~/.claude.json pour vérifier le connecteur n8n-oracle' }
  return null
}
// Sur l'hôte d'agents Oracle : n8n tourne sur la même machine, sans tunnel ni connecteur MCP à vérifier.
async function verifierN8nLocal() {
  return (await sondeHttp(`http://127.0.0.1:${PORT_N8N_LOCAL}/healthz`, 4000)) ? null : `n8n injoignable sur 127.0.0.1:${PORT_N8N_LOCAL} (serveur Oracle)`
}
// 02/11 (audit du chantier 1) : la configuration est lue pour de vrai (scripts/hooks/config-hermes.mjs, banc
// scripts/config-hermes-e2e.mjs) : modèle et replis, freellmapi hors du profil qui garde les MCP, outils n8n en lecture
// seule, plafonds, commandes interdites, profil petites-taches sans MCP, et les deux correctifs locaux de Hermes.
function verifierHermes() {
  const H = join(LOCALAPPDATA, 'hermes')
  const exe = join(H, 'bin', 'hermes.exe')
  if (!existsSync(exe)) return `Hermes absent (${exe})`
  const lire = (p) => { try { return readFileSync(p, 'utf8') } catch { return null } }
  const conf = lire(join(H, 'config.yaml'))
  if (!conf) return 'config.yaml de Hermes illisible'
  const HA = join(H, 'hermes-agent')
  const problemes = controlerConfigHermes({
    config: conf,
    petites: lire(join(H, 'profiles', 'petites-taches', 'config.yaml')),
    fichiers: { credentials: lire(join(HA, 'agent', 'anthropic_credentials.py')), tuiSource: lire(join(HA, 'ui-tui', 'src', 'app', 'createGatewayEventHandler.ts')), tuiDist: lire(join(HA, 'ui-tui', 'dist', 'entry.js')) },
  })
  return problemes.length ? problemes.join(' ; ') : null
}

async function verifierOrca() {
  let port = 6768
  try {
    const rt = readFileSync(join(APPDATA, 'orca', 'orca-runtime.json'), 'utf8')
    const m = rt.match(/ws:\/\/127\.0\.0\.1:(\d+)/)
    if (m) port = Number(m[1])
  } catch { return 'Orca ne tourne pas (orca-runtime.json absent) : lancer `orca open`' }
  if (!(await sondeTcp(port))) return `moteur d’Orca injoignable sur 127.0.0.1:${port} : lancer \`orca open\``
  return null
}

// Journal court de chaque passage (outil, issue, durée) : prouve que le crochet se déclenche, y compris sur les outils MCP
// (audit 031-003, constat 3B), et sert à diagnostiquer un dépassement de délai. Gardé sous 200 Ko.
// Limite connue et acceptée (constat 3A) : le cache est un fichier de l'utilisateur ; un programme qui tourne sous le même
// compte Windows peut le forger, comme il peut modifier .claude/settings.json lui-même. La garde protège contre l'oubli,
// pas contre un programme malveillant déjà installé sur le PC.
const JOURNAL = join(tmpdir(), 'presti-outils-obligatoires.log')
const debut = Date.now()
let outil = '?'
try {
  const brut = await new Promise((resolve) => { let s = ''; const t = setTimeout(() => resolve(s), 150); process.stdin.on('data', (d) => { s += d }); process.stdin.on('end', () => { clearTimeout(t); resolve(s) }); process.stdin.on('error', () => resolve(s)) })
  outil = String(JSON.parse(brut || '{}').tool_name || '?').slice(0, 80)
} catch {}
function noter(issue) {
  try {
    if (existsSync(JOURNAL) && statSync(JOURNAL).size > 200_000) writeFileSync(JOURNAL, '')
    writeFileSync(JOURNAL, `${new Date().toISOString()} ${outil} ${issue} ${Date.now() - debut} ms\n`, { flag: 'a' })
  } catch {}
}

if (lireCache()) noter('ok-cache')
else {
  const [n8n, orca] = HOTE_AGENTS_ORACLE ? [await verifierN8nLocal(), null] : await Promise.all([verifierN8n(), verifierOrca()])
  const hermes = HOTE_AGENTS_ORACLE ? null : verifierHermes()
  const manques = [n8n && `n8n : ${n8n}`, hermes && `Hermes : ${hermes}`, orca && `Orca : ${orca}`].filter(Boolean)
  if (manques.length) {
    try { writeFileSync(CACHE, JSON.stringify({ ok: false, le: Date.now(), manques })) } catch {}
    process.stderr.write(`Écriture bloquée — outils obligatoires indisponibles (règle de Benj du 01/11) :\n- ${manques.join('\n- ')}\nArrête-toi et demande à Benj de les reconnecter.\n`)
    noter(`BLOQUE ${manques.map((m) => m.split(' :')[0]).join(',')}`)
    process.exit(2)
  }
  try { writeFileSync(CACHE, JSON.stringify({ ok: true, le: Date.now() })) } catch {}
  noter('ok')
}
process.exit(0)
