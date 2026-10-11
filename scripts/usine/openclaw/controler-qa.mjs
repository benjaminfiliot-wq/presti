// scripts/usine/openclaw/controler-qa.mjs — fiche 026-221 : le banc d'essai du contrôle de l'installation RÉELLE d'OpenClaw.
//
// Le juge du dépôt (scripts/juges-026-completude-qa.mjs --partie=openclaw, OC-1 à OC-13) prouve les fonctions pures du lanceur.
// Il ne voit pas l'installation qui tourne : celle-ci se lit par `docker inspect openclaw` et se compare au profil par
// controlerInstallation / controlerModeles (lanceur.mjs). Ce banc prouve que ce contrôle sait être VERT sur l'installation relevée
// le 04/10/2026 (fixtures/inspect-openclaw-2026-10-04.json : noms de variables seulement, aucune valeur) et ROUGE sur chaque
// élargissement d'isolement qu'on pourrait y glisser — une mutation par faute, chacune doit rendre un écart qui la nomme.
//
//   node scripts/usine/openclaw/controler-qa.mjs         code 0 : témoin vert ET toutes les mutations prises ; 1 sinon
// Hors réseau, sans docker, sans ssh : lit la fixture et le module, rien d'autre.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const lanceur = await import(pathToFileURL(path.join(ICI, 'lanceur.mjs')).href + `?qa=${Date.now()}`)
const fixture = JSON.parse(fs.readFileSync(path.join(ICI, 'fixtures', 'inspect-openclaw-2026-10-04.json'), 'utf8'))
const brut = () => structuredClone(fixture)
const echecs = []
const verifier = (nom, ok, detail = '') => { if (!ok) echecs.push(`${nom}${detail ? ` — ${detail}` : ''}`); console.log(`${ok ? 'PASS' : 'FAIL'} ${nom}${!ok && detail ? ` — ${detail}` : ''}`) }

// ── le témoin : l'installation relevée est conforme ─────────────────────────────────────────────────────────────────────────────
const temoin = lanceur.controlerInstallation(brut())
verifier('témoin : l\'installation du 04/10 est conforme', temoin.ok, temoin.ecarts.join(' | '))
verifier('témoin : les écarts connus sont imprimés (jamais cachés)', temoin.ecarts_connus.length >= 4)
const red = lanceur.reduireInspect(brut())
verifier('réduction : aucune valeur de variable d\'environnement ne survit', !JSON.stringify(red).includes('valeur omise') && Array.isArray(red.env_noms) && red.env_noms.includes('HOME'))

// ── les mutations : chacune doit produire un écart dont le texte la nomme ──────────────────────────────────────────────────────
const m = (nom, f, attendu) => {
  const x = brut()
  f(x[0])
  const r = lanceur.controlerInstallation(x)
  const vu = r.ecarts.find((e) => attendu.test(e))
  verifier(`mutation « ${nom} » prise`, !r.ok && !!vu, r.ok ? 'accepté (écart attendu)' : `écarts : ${r.ecarts.join(' | ').slice(0, 160)}`)
}
m('mode privilégié', (x) => { x.HostConfig.Privileged = true }, /privilégié/)
m('système de fichiers en écriture', (x) => { x.HostConfig.ReadonlyRootfs = false }, /écriture/)
m('capacité SYS_ADMIN ajoutée', (x) => { x.HostConfig.CapAdd = ['SYS_ADMIN'] }, /capacités ajoutées/)
m('cap-drop ALL retiré', (x) => { x.HostConfig.CapDrop = [] }, /cap-drop/)
m('no-new-privileges retiré', (x) => { x.HostConfig.SecurityOpt = [] }, /no-new-privileges/)
m('utilisateur root', (x) => { x.Config.User = 'root' }, /utilisateur/)
m('utilisateur absent (root par défaut)', (x) => { x.Config.User = '' }, /utilisateur/)
m('mémoire illimitée', (x) => { x.HostConfig.Memory = 0 }, /mémoire/)
m('processeurs illimités', (x) => { x.HostConfig.NanoCpus = 0 }, /processeurs/)
m('processus illimités', (x) => { x.HostConfig.PidsLimit = 0 }, /processus/)
m('réseau hôte', (x) => { x.HostConfig.NetworkMode = 'host' }, /réseau/)
m('réseau bridge par défaut', (x) => { x.HostConfig.NetworkMode = 'bridge' }, /réseau/)
m('port d\'administration sur 0.0.0.0', (x) => { x.HostConfig.PortBindings['18789/tcp'][0].HostIp = '0.0.0.0' }, /hors localhost/)
m('port supplémentaire publié', (x) => { x.HostConfig.PortBindings['22/tcp'] = [{ HostIp: '127.0.0.1', HostPort: '2222' }] }, /port publié non prévu/)
m('socket docker montée', (x) => { x.HostConfig.Binds.push('/var/run/docker.sock:/var/run/docker.sock:rw') }, /socket docker/)
m('coffre presti-secrets monté', (x) => { x.HostConfig.Binds.push('/home/ubuntu/presti-secrets:/coffre:ro') }, /montage hors liste/)
m('répertoire personnel monté', (x) => { x.HostConfig.Binds.push('/home/usine:/home/usine:rw') }, /montage hors liste/)
m('montage du dossier de secrets entier', (x) => { x.HostConfig.Binds = x.HostConfig.Binds.filter((b) => !/freellmapi\.key/.test(b)); x.HostConfig.Binds.push('/srv/openclaw/secrets:/run/secrets:ro') }, /montage hors liste|montage prévu absent/)
m('montage en écriture d\'un secret prévu en lecture seule', (x) => { x.HostConfig.Binds = x.HostConfig.Binds.map((b) => b.replace('gateway.token:/run/secrets/gateway.token:ro', 'gateway.token:/run/secrets/gateway.token:rw')) }, /montage hors liste/)
m('montage prévu retiré', (x) => { x.HostConfig.Binds = x.HostConfig.Binds.filter((b) => !/\/work:rw/.test(b)) }, /montage prévu absent/)
m('périphérique exposé', (x) => { x.HostConfig.Devices = [{ PathOnHost: '/dev/fuse', PathInContainer: '/dev/fuse', CgroupPermissions: 'rwm' }] }, /périphériques/)
m('espace de noms pid de l\'hôte', (x) => { x.HostConfig.PidMode = 'host' }, /espace de noms/)
m('jeton Claude dans l\'environnement', (x) => { x.Config.Env.push('CLAUDE_CODE_OAUTH_TOKEN=<valeur omise>') }, /Claude/)
m('clé Anthropic dans l\'environnement', (x) => { x.Config.Env.push('ANTHROPIC_API_KEY=<valeur omise>') }, /Claude|Anthropic|ANTHROPIC/)
m('clé freellmapi dans l\'environnement', (x) => { x.Config.Env.push('FREELLMAPI_KEY=<valeur omise>') }, /secret dans l'environnement/)
m('variable inconnue', (x) => { x.Config.Env.push('MA_VARIABLE=<valeur omise>') }, /hors des noms prévus/)
m('image différente', (x) => { x.Image = 'sha256:' + '0'.repeat(64) }, /image/)
m('redémarrage supprimé', (x) => { x.HostConfig.RestartPolicy = { Name: 'no' } }, /redémarrage/)

// ── les modèles servis (openclaw.json) ────────────────────────────────────────────────────────────────────────────────────────
const cfgModeles = {
  models: { providers: { ollama: { models: [{ id: 'gpt-oss:120b-cloud' }, { id: 'qwen3:8b-q4_K_M' }] }, freellmapi: { models: [{ id: 'gemini-3-flash-preview' }, { id: 'ministral-14b' }, { id: 'gpt-oss-120b' }] } } },
  agents: { defaults: { model: { primary: 'ollama/gpt-oss:120b-cloud', fallbacks: ['freellmapi/gemini-3-flash-preview', 'freellmapi/ministral-14b', 'freellmapi/gpt-oss-120b', 'ollama/qwen3:8b-q4_K_M'] }, heartbeat: { every: '0m' } } },
  plugins: { deny: ['anthropic', 'codex'] }, telemetry: { enabled: false },
  tools: { deny: ['group:runtime', 'group:messaging', 'group:nodes', 'group:automation', 'group:ui'] },
}
const mc = (nom, f, attendu) => {
  const x = structuredClone(cfgModeles); f(x)
  const r = lanceur.controlerModeles(x)
  verifier(`config : ${nom}`, !r.ok && r.ecarts.some((e) => attendu.test(e)), r.ok ? 'accepté (écart attendu)' : r.ecarts.join(' | ').slice(0, 160))
}
verifier('config : la configuration de référence est conforme', lanceur.controlerModeles(structuredClone(cfgModeles)).ok, lanceur.controlerModeles(structuredClone(cfgModeles)).ecarts.join(' | '))
mc('modèle Claude en repli', (x) => { x.agents.defaults.model.fallbacks.push('anthropic/claude-sonnet-4-5'); x.models.providers.anthropic = { models: [{ id: 'claude-sonnet-4-5' }] } }, /Claude interdit/)
mc('modèle utilisé non déclaré (voie inconnue)', (x) => { x.agents.defaults.model.fallbacks.push('freellmapi/llama-4-scout'); x.models.providers.freellmapi.models.push({ id: 'llama-4-scout' }) }, /absent de configuration\(\)\.modeles/)
mc('modèle utilisé absent du catalogue', (x) => { x.agents.defaults.model.primary = 'ollama/gpt-oss:20b' }, /absent/)
mc('greffon anthropic autorisé', (x) => { x.plugins.deny = ['codex'] }, /anthropic/)
mc('télémétrie active', (x) => { x.telemetry.enabled = true }, /telemetry/)
mc('battement de cœur actif', (x) => { x.agents.defaults.heartbeat.every = '30m' }, /heartbeat/)
mc('shell autorisé', (x) => { x.tools.deny = x.tools.deny.filter((g) => g !== 'group:runtime') }, /group:runtime/)

console.log(`\nverdict : ${echecs.length ? 'FAIL' : 'PASS'} — ${echecs.length ? echecs.length + ' contrôle(s) en échec' : 'témoin vert, toutes les mutations prises'}`)
process.exitCode = echecs.length ? 1 : 0
