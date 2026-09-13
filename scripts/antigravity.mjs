// scripts/antigravity.mjs — le pilote d'Antigravity depuis Claude Code (prompt v15 §1 : « tu penses, il produit »).
//
// Antigravity (l'IDE) doit être ouvert sur l'espace de travail presti + SaaS : son serveur local (language_server.exe)
// expose une API d'agents — `agentapi new-conversation`, `send-message`, `get-conversation-metadata` — protégée par un
// jeton CSRF qu'on lit dans la ligne de commande du processus. Rien n'est stocké : jeton, port et projet sont
// redécouverts à chaque appel. Le suivi se lit sur disque : ~/.gemini/antigravity/brain/<conversation>/…/transcript.jsonl.
//
// Usage :
//   node scripts/antigravity.mjs etat                                l'état de chaque agent lancé (et des tâches)
//   node scripts/antigravity.mjs lancer <agent> [--tache=<id>] [--model=pro|flash|flash_lite]
//   node scripts/antigravity.mjs flotte [--n=6] [--model=pro]          un agent par tâche de file/ (périmètres disjoints), n au plus
//   node scripts/antigravity.mjs repondre <id> <n> [ligne]             pose <id>.reponse.md ET le dit dans la conversation de l'agent
//   node scripts/antigravity.mjs dire <agent> <message>                envoie un message à l'agent (relance, précision)
// Codes : 0 ok ; 1 Antigravity injoignable ou refus ; 2 usage.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCH = path.join(RACINE, '.orchestre')
const AGENTS = path.join(ORCH, 'agents.jsonl')
const LS = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'antigravity', 'resources', 'bin', 'language_server.exe')
const GEMINI = path.join(os.homedir(), '.gemini')
const MODELES = ['pro', 'flash', 'flash_lite']

const args = process.argv.slice(2)
const commande = args[0]
const positionnels = args.slice(1).filter((a) => !a.startsWith('--'))
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut }
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

// ── Découverte : processus, jeton, port, projet ────────────────────────────────────────────────────────────
function ps(script) { return execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 20000 }).trim() }
function contexte() {
  if (!fs.existsSync(LS)) throw new Error(`Antigravity n'est pas installé ici (${LS})`)
  const ligne = ps(`(Get-CimInstance Win32_Process -Filter "name='language_server.exe'" | Select-Object -First 1) | ForEach-Object { $_.ProcessId.ToString() + '|' + $_.CommandLine }`)
  if (!ligne) throw new Error("Antigravity n'est pas ouvert (aucun language_server.exe) : ouvre-le sur presti + SaaS")
  const [pid, ...reste] = ligne.split('|')
  const jeton = (reste.join('|').match(/--csrf_token[ =]+(\S+)/) || [])[1]
  if (!jeton) throw new Error('jeton CSRF introuvable dans la ligne de commande du serveur')
  const ports = ps(`Get-NetTCPConnection -OwningProcess ${pid} -State Listen | Select-Object -ExpandProperty LocalPort`).split(/\s+/).filter(Boolean)
  let projet = null
  const dossierProjets = path.join(GEMINI, 'config', 'projects')
  for (const f of fs.existsSync(dossierProjets) ? fs.readdirSync(dossierProjets) : []) {
    if (!f.endsWith('.json')) continue
    const texte = fs.readFileSync(path.join(dossierProjets, f), 'utf8')
    if (/Documents(\/|%2F|\\\\)presti/i.test(texte) || /Documents(\/|%2F|\\\\)SaaS/i.test(texte)) { projet = f.replace(/\.json$/, ''); break }
  }
  if (!projet) throw new Error("aucun projet Antigravity ne pointe sur presti : ouvre l'espace de travail presti + SaaS dans Antigravity")
  for (const port of ports) {
    const env = { ...process.env, ANTIGRAVITY_CSRF_TOKEN: jeton, ANTIGRAVITY_LS_ADDRESS: `127.0.0.1:${port}`, ANTIGRAVITY_PROJECT_ID: projet }
    try {
      const r = execFileSync(LS, ['agentapi', 'get-conversation-metadata', 'sonde'], { env, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] })
      if (/trajectory not found/.test(r)) return { env, port, projet }
    } catch (e) { if (/trajectory not found/.test(String(e.stdout || '') + String(e.stderr || ''))) return { env, port, projet } }
  }
  throw new Error(`aucun port du serveur (${ports.join(', ')}) ne répond avec ce jeton`)
}
function api(ctx, ...a) {
  let sortie = ''
  try { sortie = execFileSync(LS, ['agentapi', ...a], { env: ctx.env, encoding: 'utf8', timeout: 90000, cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (e) { sortie = String(e.stdout || '') || String(e.stderr || '') }
  try { return JSON.parse(sortie) } catch { return { error: sortie.slice(0, 300) } }
}

// ── Le registre des agents lancés ─────────────────────────────────────────────────────────────────────────
const agents = () => fs.existsSync(AGENTS) ? fs.readFileSync(AGENTS, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
const enregistrer = (a) => fs.appendFileSync(AGENTS, JSON.stringify(a) + '\n')
function transcript(conversationId) {
  const f = path.join(GEMINI, 'antigravity', 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl')
  if (!fs.existsSync(f)) return []
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}
const texteDe = (c) => typeof c === 'string' ? c : (c && typeof c === 'object' ? String(c.text ?? c.content ?? c.message ?? '') : '')
const etatDe = (t) => {
  if (!t.length) return { etat: 'démarre', quand: '', dernier: '' }
  const d = t[t.length - 1]
  const contenu = texteDe(d.content).trim()
  // Un agent qui a fini ou qui pose une question termine sur une réponse TEXTUELLE ; une réponse vide ou un GENERIC
  // (sortie d'outil) = il travaille. La fin se reconnaît à la ligne « <id> : PASS|FAIL » demandée par le prompt.
  const idle = d.type === 'PLANNER_RESPONSE' && contenu.length > 0
  const dernierTexte = [...t].reverse().map((x) => texteDe(x.content).trim()).find((x) => x) || ''
  return { etat: idle ? (/\b\d{3}-[\w-]+ : (PASS|FAIL)/.test(contenu) ? 'terminé' : 'en attente (a parlé)') : 'travaille', quand: d.created_at || '', dernier: dernierTexte.replace(/\s+/g, ' ').slice(0, 110) }
}

// ── Le prompt d'un exécutant : la boucle, une tâche, une conversation ────────────────────────────────────
const PROMPT = (agent, tache) => `Tu es un exécutant du système .orchestre/ du dépôt presti (dossier C:/Users/benja/Documents/presti de cet espace de travail). Lis d'abord presti/AGENTS.md (court), puis presti/.orchestre/contexte.md, puis SaaS/CLAUDE.md et SaaS/Produit/Carte-du-code.md. N'explore rien d'autre avant d'avoir ta tâche.
Ensuite, dans le dossier presti :
1. Lance \`node scripts/orchestre.mjs prochaine --agent=${agent}${tache ? ` --tache=${tache}` : ''}\` : la tâche s'affiche en entier, avec ce qu'il faut faire à la fin. Code de sortie 2 = rien à faire : dis-le en une ligne et arrête-toi.
2. Fais exactement ce que dit la tâche, dans son \`perimetre\` seulement. \`interdit\` reste intact, même pour aider. Le \`budget\` est une limite.
3. Dépose tes preuves dans .orchestre/preuves/<id>/. Lance \`node scripts/orchestre.mjs verifier <id>\` autant de fois que nécessaire. Quand c'est vert : déplace le fichier de .orchestre/en-cours/ vers .orchestre/fait/ et relance \`verifier <id>\` — c'est ce verdict-là qui compte.
4. Bloqué ? Écris .orchestre/en-cours/<id>.question.md avec deux ou trois options numérotées, puis ATTENDS : la réponse arrive dans <id>.reponse.md ET dans cette conversation. Ne contourne jamais une règle ou un vérificateur pour finir.
5. Termine par une seule ligne : \`<id> : PASS|FAIL — <ligne du verdict>\`. Une seule tâche par conversation : ne prends pas la suivante.
Règles : français ; zéro donnée réelle (comptes @presti-test.invalid, supprimés après) ; une fonctionnalité non finie n'apparaît pas ; aucun chiffre non sourcé ; aucun secret dans un fichier versionné ; tu ne modifies ni scripts/orchestre.mjs, ni scripts/antigravity.mjs, ni les vérificateurs, ni plans/cerveau-site.md.`

// ── Commandes ────────────────────────────────────────────────────────────────────────────────────────────
function lancer(ctx, agent, tache, modele) {
  if (!MODELES.includes(modele)) { console.error(`modèle : ${MODELES.join(' | ')}`); process.exit(2) }
  const r = api(ctx, 'new-conversation', `--model=${modele}`, `--title=${tache ? tache + ' · ' : ''}${agent}`, PROMPT(agent, tache))
  const id = r?.response?.newConversation?.conversationId
  if (!id) { console.error(`✗ lancement refusé : ${JSON.stringify(r).slice(0, 300)}`); process.exit(1) }
  enregistrer({ agent, tache: tache || null, modele, conversationId: id, date: maintenant() })
  console.log(`✓ ${agent}${tache ? ' → ' + tache : ''} lancé (${modele}) · conversation ${id}`)
  return id
}
function flotte(ctx, n, modele) {
  const file = fs.existsSync(path.join(ORCH, 'file')) ? fs.readdirSync(path.join(ORCH, 'file')).filter((f) => f.endsWith('.md')).sort() : []
  const dejaVisees = new Set(agents().map((a) => a.tache).filter(Boolean))
  const prefixe = (g) => String(g).split(/[*?{]/)[0]
  const perimetres = []
  const lancees = []
  for (const f of file) {
    const id = f.replace(/\.md$/, '')
    if (dejaVisees.has(id)) continue
    const m = fs.readFileSync(path.join(ORCH, 'file', f), 'utf8').match(/^perimetre:\s*\[(.*)\]/m)
    const per = (m ? m[1].split(',') : []).map((x) => prefixe(x.trim()))
    if (per.some((p) => perimetres.some((q) => p.startsWith(q) || q.startsWith(p)))) { console.log(`  ${id} : chevauche une tâche déjà lancée, attendra`); continue }
    perimetres.push(...per)
    lancer(ctx, `ag-${id.replace(/^0+/, '').replace(/-/g, '')}`, id, modele)
    lancees.push(id)
    if (lancees.length >= n) break
  }
  console.log(`${lancees.length} agent(s) lancé(s)${lancees.length ? ' : ' + lancees.join(', ') : ''}`)
}
function etat() {
  const liste = agents()
  if (!liste.length) { console.log('aucun agent lancé (scripts/antigravity.mjs lancer | flotte)'); return }
  const ou = (id) => { for (const d of ['en-cours', 'fait', 'refuse', 'file']) { if (fs.existsSync(path.join(ORCH, d, `${id}.md`))) return d } return '?' }
  const questions = fs.existsSync(path.join(ORCH, 'en-cours')) ? fs.readdirSync(path.join(ORCH, 'en-cours')).filter((f) => f.endsWith('.question.md') && !fs.existsSync(path.join(ORCH, 'en-cours', f.replace(/\.question\.md$/, '.reponse.md')))) : []
  console.log(`agent     tâche    où        état                  dernier mot`)
  for (const a of liste) {
    const e = etatDe(transcript(a.conversationId))
    const q = a.tache && questions.includes(`${a.tache}.question.md`) ? ' ⚠ QUESTION' : ''
    console.log(`${a.agent.padEnd(9)} ${(a.tache || '—').padEnd(8)} ${(a.tache ? ou(a.tache) : '—').padEnd(9)} ${(e.etat + q).padEnd(21)} ${e.dernier}`)
  }
  if (questions.length) console.log(`\n⚠ ${questions.length} question(s) : ${questions.map((q) => q.replace(/\.question\.md$/, '')).join(', ')} → node scripts/antigravity.mjs repondre <id> <n> [ligne]`)
}
function repondre(ctx, id, choix, ligne) {
  if (!id || !/^\d+$/.test(String(choix))) { console.error('repondre <id> <n> [ligne]'); process.exit(2) }
  execFileSync(process.execPath, ['scripts/orchestre.mjs', 'repondre', id, String(choix), ...(ligne ? [ligne] : [])], { cwd: RACINE, stdio: 'inherit' })
  const a = agents().reverse().find((x) => x.tache === id)
  if (!a) { console.log(`  (aucune conversation connue pour ${id} : la réponse est dans le fichier seulement)`); return }
  const r = api(ctx, 'send-message', a.conversationId, `Réponse à ta question sur ${id} : option ${choix}${ligne ? ' — ' + ligne : ''}. Le fichier .orchestre/en-cours/${id}.reponse.md est posé. Continue la tâche.`)
  console.log(r?.error ? `  ✗ message non délivré : ${r.error}` : `  ✓ dit à ${a.agent} (${a.conversationId.slice(0, 8)})`)
}
function dire(ctx, agent, message) {
  const a = agents().reverse().find((x) => x.agent === agent || x.conversationId.startsWith(agent))
  if (!a) { console.error(`agent inconnu : ${agent}`); process.exit(2) }
  const r = api(ctx, 'send-message', a.conversationId, message)
  console.log(r?.error ? `✗ ${r.error}` : `✓ dit à ${a.agent}`)
}

// Le quota Gemini du compte s'épuise (RESOURCE_EXHAUSTED 429, le 13/09 après douze agents pro) : la sonde lance une
// conversation minuscule sans l'enregistrer et dit si Antigravity répond encore — code 0 si oui, 1 si le flux est coupé.
async function sonde(ctx, modele) {
  const r = api(ctx, 'new-conversation', `--model=${modele}`, '--title=orchestre : sonde de quota', 'Réponds uniquement par le mot OK, sans ouvrir ni modifier aucun fichier.')
  const id = r?.response?.newConversation?.conversationId
  if (!id) { console.log(`✗ sonde : ${JSON.stringify(r).slice(0, 200)}`); return 1 }
  for (let i = 0; i < 12; i++) {
    await new Promise((res) => setTimeout(res, 5000))
    const t = transcript(id)
    if (t.some((l) => l.type === 'ERROR_MESSAGE')) { console.log(`✗ sonde ${modele} : flux coupé (quota)`); return 1 }
    if (t.some((l) => l.type === 'PLANNER_RESPONSE' && texteDe(l.content).trim())) { console.log(`✓ sonde ${modele} : Antigravity répond`); return 0 }
  }
  console.log(`? sonde ${modele} : pas de réponse en 60 s`); return 1
}

try {
  switch (commande) {
    case 'etat': etat(); break
    case 'sonde': process.exit(await sonde(contexte(), option('model', 'flash_lite'))); break
    case 'lancer': { if (!positionnels[0]) { console.error('lancer <agent> [--tache=<id>] [--model=pro]'); process.exit(2) } lancer(contexte(), positionnels[0], option('tache'), option('model', 'pro')); break }
    case 'flotte': flotte(contexte(), Number(option('n', '6')) || 6, option('model', 'pro')); break
    case 'repondre': repondre(contexte(), positionnels[0], positionnels[1], positionnels.slice(2).join(' ')); break
    case 'dire': { if (positionnels.length < 2) { console.error('dire <agent> <message>'); process.exit(2) } dire(contexte(), positionnels[0], positionnels.slice(1).join(' ')); break }
    default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(8, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(commande ? 2 : 0)
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1) }
