// bin/antigravity.mjs — le pilote d'Antigravity depuis Claude Code (prompt v16 §1 : « tu penses, il produit »).
// Vendorisé dans <projet>/scripts/antigravity.mjs par `orchestre.mjs maj`, comme bin/orchestre.mjs : généraliste,
// aucun chemin propre à un projet particulier ici — racine, vault et nom du projet viennent de .orchestre/orchestre.json.
//
// Antigravity (l'IDE) doit être ouvert sur l'espace de travail du projet (et de son vault, s'il en a un) : son
// serveur local (language_server.exe) expose une API d'agents — `agentapi new-conversation`, `send-message`,
// `get-conversation-metadata` — protégée par un jeton CSRF qu'on lit dans la ligne de commande du processus. Rien
// n'est stocké : jeton, port et projet sont redécouverts à chaque appel. Le suivi se lit sur disque :
// ~/.gemini/antigravity/brain/<conversation>/…/transcript.jsonl.
//
// Usage :
//   node scripts/antigravity.mjs etat                                l'état de chaque agent lancé (et des tâches)
//   node scripts/antigravity.mjs lancer <agent> [--tache=<id>] [--model=pro|flash|flash_lite|opus|sonnet]
//   node scripts/antigravity.mjs flotte [--n=6] [--model=pro]          un agent par tâche de file/ (périmètres disjoints), n au plus
//   node scripts/antigravity.mjs repondre <id> <n> [ligne]             pose <id>.reponse.md ET le dit dans la conversation de l'agent
//   node scripts/antigravity.mjs dire <agent> <message>                envoie un message à l'agent (relance, précision)
// Codes : 0 ok ; 1 Antigravity injoignable ou refus ; 2 usage.
//
// --model=opus|sonnet (Claude, quand le quota Gemini est épuisé) : le binaire agentapi.exe ne connaît que
// pro|flash|flash_lite (validé côté CLI, avant même le réseau). Pour Claude on contourne agentapi.exe et on
// parle nous-mêmes en Connect-JSON au serveur local déjà utilisé par contexte()/api() :
//   1. GetCascadeModelConfigData relit le catalogue du jour (le numéro interne du modèle, ex. MODEL_PLACEHOLDER_M26
//      pour « Claude Opus 4.6 (Thinking) », change à chaque mise à jour d'Antigravity — jamais le coder en dur).
//   2. StartCascade (source CORTEX_TRAJECTORY_SOURCE_AGENT_API) crée la conversation, sans modèle.
//   3. SendUserCascadeMessage porte le modèle dans cascadeConfig.plannerConfig.requestedModel (le champ que lit
//      cortex/config/experiments.go:getResolvedModel — poser le modèle sur StartCascadeRequest ne suffit pas,
//      ça échoue avec « neither PlanModel nor RequestedModel specified »).
// Prouvé le 2026-09-13 : conversation 63a459df-abb7-4c38-a934-5ea95d3410a1, le modèle répond "Claude Opus 4.6 (Thinking)".
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// La racine du projet : le dossier qui contient .orchestre/, en remontant depuis le répertoire courant, sinon depuis
// ce fichier — comme bin/orchestre.mjs. Sans .orchestre/ trouvable (ex. ce fichier copié seul, sans le projet), on
// retombe sur l'hypothèse habituelle « ce fichier vit dans <racine>/scripts/ » : `instantane()` échoue alors
// naturellement sur un dossier sans dépôt git, ce qui est le comportement voulu (refus, rien de lancé).
function trouverRacine(depart) {
  let d = path.resolve(depart)
  for (;;) {
    if (fs.existsSync(path.join(d, '.orchestre')) && fs.statSync(path.join(d, '.orchestre')).isDirectory()) return d
    const parent = path.dirname(d)
    if (parent === d) return null
    d = parent
  }
}
const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = trouverRacine(process.cwd()) || trouverRacine(ICI) || path.resolve(ICI, '..')
const ORCH = path.join(RACINE, '.orchestre')
const AGENTS = path.join(ORCH, 'agents.jsonl')
// .orchestre/orchestre.json relu à chaque appel (jamais mis en cache) : projet, vault et carteVault en sortent.
function config() {
  try { return JSON.parse(fs.readFileSync(path.join(ORCH, 'orchestre.json'), 'utf8')) } catch { return {} }
}
function nomProjet() { return config().projet || path.basename(RACINE) }
function cheminVault() { const v = config().vault; if (!v) return null; const p = path.resolve(RACINE, v); return fs.existsSync(p) ? p : null }
const LS = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'antigravity', 'resources', 'bin', 'language_server.exe')
const GEMINI = path.join(os.homedir(), '.gemini')
const MODELES_GEMINI = ['pro', 'flash', 'flash_lite']
// Label exact du catalogue GetCascadeModelConfigData (celui affiché dans le sélecteur de modèle d'Antigravity).
const CATALOGUE_CLAUDE = { opus: 'Claude Opus 4.6 (Thinking)', sonnet: 'Claude Sonnet 4.6 (Thinking)' }
const MODELES = [...MODELES_GEMINI, ...Object.keys(CATALOGUE_CLAUDE)]

const args = process.argv.slice(2)
const commande = args[0]
const positionnels = args.slice(1).filter((a) => !a.startsWith('--'))
// --nom=valeur, ou --nom tout seul (drapeau) : le 14/09, `--duo` sans « = » passait inaperçu et l'agent recevait le prompt ordinaire.
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : defaut }
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

// ── Découverte : processus, jeton, port, projet ────────────────────────────────────────────────────────────
function ps(script) { return execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 20000 }).trim() }
function contexte() {
  if (!fs.existsSync(LS)) throw new Error(`Antigravity n'est pas installé ici (${LS})`)
  const nom = nomProjet()
  const vault = cheminVault()
  const nomVault = vault ? path.basename(vault) : null
  const espace = nomVault ? `${nom} + ${nomVault}` : nom
  const ligne = ps(`(Get-CimInstance Win32_Process -Filter "name='language_server.exe'" | Select-Object -First 1) | ForEach-Object { $_.ProcessId.ToString() + '|' + $_.CommandLine }`)
  if (!ligne) throw new Error(`Antigravity n'est pas ouvert (aucun language_server.exe) : ouvre-le sur ${espace}`)
  const [pid, ...reste] = ligne.split('|')
  const jeton = (reste.join('|').match(/--csrf_token[ =]+(\S+)/) || [])[1]
  if (!jeton) throw new Error('jeton CSRF introuvable dans la ligne de commande du serveur')
  const ports = ps(`Get-NetTCPConnection -OwningProcess ${pid} -State Listen | Select-Object -ExpandProperty LocalPort`).split(/\s+/).filter(Boolean)
  let projet = null
  const dossierProjets = path.join(GEMINI, 'config', 'projects')
  const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const motifs = [nom, nomVault].filter(Boolean).map((n) => new RegExp(`[\\\\/]${echapper(n)}(["\\\\/]|%2F|$)`, 'i'))
  for (const f of fs.existsSync(dossierProjets) ? fs.readdirSync(dossierProjets) : []) {
    if (!f.endsWith('.json')) continue
    const texte = fs.readFileSync(path.join(dossierProjets, f), 'utf8')
    if (motifs.some((m) => m.test(texte))) { projet = f.replace(/\.json$/, ''); break }
  }
  if (!projet) throw new Error(`aucun projet Antigravity ne pointe sur ${nom} : ouvre l'espace de travail ${espace} dans Antigravity`)
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

// ── Connect-JSON brut (pour Claude) : même serveur local, même jeton, mais sans passer par agentapi.exe ──────
async function connectCall(ctx, methode, corps) {
  const r = await fetch(`http://${ctx.env.ANTIGRAVITY_LS_ADDRESS}/exa.language_server_pb.LanguageServerService/${methode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1', 'x-codeium-csrf-token': ctx.env.ANTIGRAVITY_CSRF_TOKEN },
    body: JSON.stringify(corps),
  })
  const texte = await r.text()
  let json = null
  try { json = JSON.parse(texte) } catch { /* pas du JSON : erreur brute, laissée dans texte */ }
  return { ok: r.ok, statut: r.status, texte, json }
}
async function catalogueModeles(ctx) {
  const r = await connectCall(ctx, 'GetCascadeModelConfigData', {})
  return (r.json?.clientModelConfigs || []).map((c) => ({ label: c.label, modelOrAlias: c.modelOrAlias, modelId: c.modelId }))
}
async function modeleOrAliasClaude(ctx, modele) {
  const voulu = CATALOGUE_CLAUDE[modele] || modele
  const liste = await catalogueModeles(ctx)
  const config = liste.find((c) => c.label === voulu) || liste.find((c) => c.label.toLowerCase().includes(String(voulu).toLowerCase()))
  if (!config) throw new Error(`« ${voulu} » absent du catalogue de modèles du jour (quota, ou modèle renommé/retiré). Catalogue : ${liste.map((c) => c.label).join(' · ')}`)
  return config.modelOrAlias
}
// StartCascade (sans modèle) + SendUserCascadeMessage (modèle posé dans cascadeConfig.plannerConfig.requestedModel).
async function lancerCascadeClaude(ctx, modele, prompt) {
  const requestedModel = await modeleOrAliasClaude(ctx, modele)
  const debut = await connectCall(ctx, 'StartCascade', { source: 'CORTEX_TRAJECTORY_SOURCE_AGENT_API' })
  const cascadeId = debut.json?.cascadeId
  if (!cascadeId) throw new Error(`StartCascade refusé : ${debut.texte.slice(0, 300)}`)
  const envoi = await connectCall(ctx, 'SendUserCascadeMessage', {
    cascadeId,
    items: [{ text: prompt }],
    cascadeConfig: { plannerConfig: { requestedModel } },
  })
  if (!envoi.ok) throw new Error(`SendUserCascadeMessage refusé (cascade ${cascadeId} créée mais vide) : ${envoi.texte.slice(0, 300)}`)
  return cascadeId
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
  return { etat: idle ? (/\b(?:\d{3}-[\w-]+|dem-[0-9a-f]{8}) : (PASS|FAIL)/.test(contenu) ? 'terminé' : 'en attente (a parlé)') : 'travaille', quand: d.created_at || '', dernier: dernierTexte.replace(/\s+/g, ' ').slice(0, 110) }
}

// ── Le prompt d'un exécutant : la boucle, une tâche, une conversation ────────────────────────────────────
const PROMPT = (agent, tache) => {
  const cfg = config()
  const nom = cfg.projet || path.basename(RACINE)
  const vault = cheminVault()
  const nomVault = vault ? path.basename(vault) : null
  const ligneVault = nomVault ? ` Lis aussi ${nomVault}/CLAUDE.md${cfg.carteVault ? ' et ' + nomVault + '/' + cfg.carteVault : ''}.` : ''
  return `Tu es un exécutant du système .orchestre/ du dépôt ${nom} (dossier de cet espace de travail). Lis d'abord AGENTS.md (court), puis .orchestre/contexte.md.${ligneVault} N'explore rien d'autre avant d'avoir ta tâche.
Ensuite, dans le dossier ${nom} :
1. Lance \`node scripts/orchestre.mjs prochaine --agent=${agent}${tache ? ` --tache=${tache}` : ''}\` : la tâche s'affiche en entier, avec ce qu'il faut faire à la fin. Code de sortie 2 = rien à faire : dis-le en une ligne et arrête-toi.
2. Fais exactement ce que dit la tâche, dans son \`perimetre\` seulement. \`interdit\` reste intact, même pour aider. Le \`budget\` est une limite.
3. Dépose tes preuves dans .orchestre/preuves/<id>/. Lance \`node scripts/orchestre.mjs verifier <id>\` autant de fois que nécessaire. Quand c'est vert : déplace le fichier de .orchestre/en-cours/ vers .orchestre/fait/ et relance \`verifier <id>\` — c'est ce verdict-là qui compte.
4. Bloqué ? Écris .orchestre/en-cours/<id>.question.md avec deux ou trois options numérotées, puis ATTENDS : la réponse arrive dans <id>.reponse.md ET dans cette conversation. Ne contourne jamais une règle ou un vérificateur pour finir.
5. Termine par une seule ligne : \`<id> : PASS|FAIL — <ligne du verdict>\`. Une seule tâche par conversation : ne prends pas la suivante.
Règles : français ; zéro donnée réelle (comptes de test jetables, supprimés après) ; une fonctionnalité non finie n'apparaît pas ; aucun chiffre non sourcé ; aucun secret dans un fichier versionné ; tu ne modifies ni scripts/orchestre.mjs, ni scripts/antigravity.mjs, ni scripts/executant.mjs, ni les vérificateurs, sauf si la tâche les met dans son périmètre.`
}

// ── Instantané avant chaque lancement (décision D3 de Benj, 24/09/2026) ─────────────────────────────────────
// Antigravity tourne avec un terminal hors bac à sable : c'est lui qui a lancé le « git restore » du 13/09 (trois jours de
// travail perdus). Avant chaque lancement, tout l'arbre de travail — fichiers modifiés ET non suivis, sauf ce qu'ignore
// .gitignore et les .exe — est figé dans un commit rangé sous refs/instantanes/, par un index temporaire : ni `main`, ni
// l'index réel, ni l'arbre de travail ne bougent. Rien n'est poussé. Pour récupérer un fichier :
//   git show refs/instantanes/<nom>:<chemin>     (liste : git for-each-ref refs/instantanes)
// Sans instantané, pas de lancement.
function instantane(nom) {
  const index = path.join(os.tmpdir(), `${nomProjet()}-instantane-${process.pid}-${Date.now()}.index`)
  const env = { ...process.env, GIT_INDEX_FILE: index }
  const git = (a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8', env, maxBuffer: 1 << 26 }).trim()
  try {
    git(['read-tree', 'HEAD'])
    git(['add', '-A', '--', '.', ':(exclude)*.exe'])
    const commit = git(['commit-tree', git(['write-tree']), '-p', 'HEAD', '-m', `instantané avant ${nom} (${maintenant()})`])
    const ref = `refs/instantanes/${nom}-${maintenant().replace(/:/g, '')}`
    git(['update-ref', ref, commit])
    return { ref, commit }
  } finally { fs.rmSync(index, { force: true }) }
}

// Le duo (plans/duo-antigravity.md) : l'agent prend sa tâche, la lit, et ATTEND les pas de Claude Code — un à la fois.
const PROMPT_DUO = (agent, tache, nom) => [
  `Tu travailles en duo avec Claude Code, qui dirige, dans le dépôt ${nom} (dossier de cet espace de travail). Règles : tu ne touches qu’au périmètre de ta tâche ; jamais git restore, git checkout <fichier>, git stash, git reset, git clean, ni de suppression hors périmètre ; zéro donnée réelle ; tu ne fabriques aucun fichier de preuve (police, photo, capture) — tu copies des sources réelles ou tu dis que tu ne trouves pas.`,
  'Maintenant : (1) lance « node scripts/orchestre.mjs prochaine --agent=' + agent + ' --tache=' + tache + ' » dans ' + nom + ' et lis la tâche affichée ; (2) lance la commande « verifier » de la tâche UNE fois (avec --statique si c’est site-qa) et note les lignes ÉCHEC ; (3) réponds seulement « prêt — N échecs au juge statique » suivi des lignes ÉCHEC, puis ATTENDS le pas 1. Tu ne fais rien d’autre tant que Claude Code ne t’a pas envoyé un pas. Chaque pas se termine par la commande qui le prouve ; tu me rends uniquement les lignes ÉCHEC restantes (ou « aucune »).',
].join('\n')

// ── Commandes ────────────────────────────────────────────────────────────────────────────────────────────
// L'instantané (décision D3) passe AVANT toute prise de contact avec Antigravity : sans dépôt git, on refuse et on
// ne lance rien, jamais un appel réseau au serveur local en premier (026-107, ORS-6).
async function lancer(agent, tache, modele) {
  let photo
  try { photo = instantane(`ag-${agent}`) } catch (e) { console.error(`✗ instantané impossible, lancement refusé : ${String(e.message).slice(0, 300)}`); process.exit(1) }
  console.log(`· instantané ${photo.ref} (${photo.commit.slice(0, 8)})`)
  const ctx = contexte()
  // Un palier Gemini (agentapi), un alias (opus, sonnet) ou n'importe quel libellé du catalogue (« Gemini 3.8 Flash (High) ») — voir `catalogue`.
  const prompt = option('duo') ? PROMPT_DUO(agent, tache, nomProjet()) : PROMPT(agent, tache)
  let id
  if (!MODELES_GEMINI.includes(modele)) {
    id = await lancerCascadeClaude(ctx, modele, prompt)
  } else {
    const r = api(ctx, 'new-conversation', `--model=${modele}`, `--title=${tache ? tache + ' · ' : ''}${agent}`, prompt)
    id = r?.response?.newConversation?.conversationId
    if (!id) { console.error(`✗ lancement refusé : ${JSON.stringify(r).slice(0, 300)}`); process.exit(1) }
  }
  enregistrer({ agent, tache: tache || null, modele, conversationId: id, date: maintenant(), instantane: photo.ref })
  console.log(`✓ ${agent}${tache ? ' → ' + tache : ''} lancé (${modele}) · conversation ${id}`)
  return id
}
async function flotte(n, modele) {
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
    await lancer(`ag-${id.replace(/^0+/, '').replace(/-/g, '')}`, id, modele)
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
  const promptSonde = 'Réponds uniquement par le mot OK, sans ouvrir ni modifier aucun fichier.'
  let id
  if (!MODELES_GEMINI.includes(modele)) {
    id = await lancerCascadeClaude(ctx, modele, promptSonde)
  } else {
    const r = api(ctx, 'new-conversation', `--model=${modele}`, '--title=orchestre : sonde de quota', promptSonde)
    id = r?.response?.newConversation?.conversationId
    if (!id) { console.log(`✗ sonde : ${JSON.stringify(r).slice(0, 200)}`); return 1 }
  }
  for (let i = 0; i < 12; i++) {
    await new Promise((res) => setTimeout(res, 5000))
    const t = transcript(id)
    if (t.some((l) => l.type === 'ERROR_MESSAGE')) { console.log(`✗ sonde ${modele} : flux coupé (quota)`); return 1 }
    if (t.some((l) => l.type === 'PLANNER_RESPONSE' && texteDe(l.content).trim())) { console.log(`✓ sonde ${modele} : Antigravity répond`); return 0 }
  }
  console.log(`? sonde ${modele} : pas de réponse en 60 s`); return 1
}

// Le CLI ne tourne que si ce fichier est lancé directement : scripts/executant.mjs importe PROMPT et instantane
// sans rien lancer, ni rien afficher (026-107, ORS-7 pour l'équivalent côté executant.mjs).
const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) try {
  switch (commande) {
    case 'etat': etat(); break
    case 'catalogue': { const liste = await catalogueModeles(contexte()); console.log(liste.map((c) => `${c.label}  →  ${JSON.stringify(c.modelOrAlias)}${c.modelId ? '  (' + c.modelId + ')' : ''}`).join('\n') || '(catalogue vide)'); break }
    case 'sonde': process.exit(await sonde(contexte(), option('model', 'flash_lite'))); break
    case 'lancer': { if (!positionnels[0]) { console.error('lancer <agent> [--tache=<id>] [--model=pro]'); process.exit(2) } await lancer(positionnels[0], option('tache'), option('model', 'pro')); break }
    case 'flotte': await flotte(Number(option('n', '6')) || 6, option('model', 'pro')); break
    case 'repondre': repondre(contexte(), positionnels[0], positionnels[1], positionnels.slice(2).join(' ')); break
    case 'dire': { if (positionnels.length < 2) { console.error('dire <agent> <message>'); process.exit(2) } dire(contexte(), positionnels[0], positionnels.slice(1).join(' ')); break }
    default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(8, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(commande ? 2 : 0)
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1) }

export { PROMPT, instantane }
