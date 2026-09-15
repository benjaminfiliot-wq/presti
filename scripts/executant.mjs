// scripts/executant.mjs — un second exécutant quand Antigravity est à sec (ses quotas tombent en minutes dès que deux
// agents tournent, 13-14/09). Codex (application OpenAI Codex, compte ChatGPT de Benj), Gemini CLI (clé d'API) ou Qwen Code, pilotés sans les
// mains, avec le MÊME contrat de tâche que scripts/antigravity.mjs (le prompt est importé de là : une seule source).
//
// Usage :
//   node scripts/executant.mjs sonde [--moteur=codex|gemini|qwen]           → l'authentification tient ? (une question, une réponse)
//   node scripts/executant.mjs lancer <agent> --tache=<id> [--moteur=codex|gemini|qwen] [--model=…] [--effort=medium] [--boucle=3] [--duo]
//   node scripts/executant.mjs pas <agent> --tache=<id> <message…>          → un pas de plus (duo) : l'histoire est dans le fichier de prompt
//   node scripts/executant.mjs etat                                          → les lancements et leurs journaux
// Première fois (une seule, par Benj, dans un terminal) :
//   Gemini : GEMINI_API_KEY=… dans .env.local (clé gratuite, aistudio.google.com). « Login with Google » ne marche plus : le
//            14/09/2026, Google a refusé l'offre gratuite à ce client (IneligibleTierError UNSUPPORTED_CLIENT, « migrate to
//            the Antigravity suite ») après une connexion pourtant réussie — Gemini gratuit passe désormais par Antigravity.
//   Codex  : rien à faire. L'application Codex est connectée au compte ChatGPT de Benj (14/09/2026) ; le binaire vit dans
//            %LOCALAPPDATA%/OpenAI/Codex/bin/<version>/codex.exe (le plus récent est pris). Il est lancé en « exec » dans un bac
//            à sable limité au dépôt (-s workspace-write, réseau autorisé, vault SaaS en plus), jamais avec le « danger-full-access »
//            que ~/.codex/config.toml règle pour l'application. Moteur par défaut depuis le 14/09/2026.
//   Qwen   : `npx @qwen-code/qwen-code` → /auth → « Qwen OAuth » (gratuit)
// Les journaux vont dans .orchestre/travail/executant/ ; le registre « un agent, une tâche » est le même (.orchestre/agents.jsonl).
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PROMPT } from './antigravity.mjs'
// Sans conversation persistante, le duo (plans/duo-antigravity.md) se joue en pas successifs : « pas » rejoue le fichier de prompt.
const PROMPT_DUO = (agent, tache) => PROMPT(agent, tache) + '\nMode duo : fais seulement le pas 1 — lis la tâche, lance sa commande verifier UNE fois (--statique si c’est site-qa), note les lignes ÉCHEC — puis rends compte en trois lignes et arrête-toi : Claude Code dicte le pas suivant.'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCH = path.join(RACINE, '.orchestre')
const TRAVAIL = path.join(ORCH, 'travail', 'executant')
const AGENTS = path.join(ORCH, 'agents.jsonl')
const MOTEURS = {
  // Modèle par défaut gpt-5.6-sol (« reliable agentic workhorse for everyday tasks ») : consigne de Benj du 14/09/2026 —
  // « 5.6 au lieu de 6 est déjà très bien, à part si c'est des gros travaux » ; gros chantier : --model=gpt-6-astra.
  codex: { paquet: null, modele: 'gpt-5.6-sol', cle: null, auth: /not logged in|please log ?in|codex login|401 Unauthorized|403 Forbidden/i },
  gemini: { paquet: '@google/gemini-cli', modele: 'gemini-2.5-pro', cle: 'GEMINI_API_KEY', auth: /auth method|GEMINI_API_KEY|login|unauthenticated|IneligibleTier|no longer supported|401|403/i },
  qwen: { paquet: '@qwen-code/qwen-code', modele: null, cle: null, auth: /auth|login|unauthenticated|401|403/i },
}
const args = process.argv.slice(2)
const commande = args[0]
const positionnels = args.slice(1).filter((a) => !a.startsWith('--'))
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : defaut }
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const horodatage = () => maintenant().replace(/[:T]/g, '-').replace('Z', '')
fs.mkdirSync(TRAVAIL, { recursive: true })

// L'environnement : la clé Gemini lue dans .env.local si elle y est (jamais affichée), rien d'autre.
function env(moteur) {
  const e = { ...process.env }
  const m = MOTEURS[moteur]
  if (m.cle && !e[m.cle]) {
    try { const l = fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/).find((x) => x.startsWith(m.cle + '=')); if (l) e[m.cle] = l.slice(m.cle.length + 1).replace(/^"|"$/g, '') } catch { /* pas de .env.local */ }
  }
  return e
}

// Le binaire de l'application Codex : le dossier bin/<version>/ change à chaque mise à jour, on prend le plus récent.
function binaireCodex() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin')
  const trouves = fs.existsSync(base) ? fs.readdirSync(base).map((d) => path.join(base, d, 'codex.exe')).filter((f) => fs.existsSync(f)) : []
  trouves.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return trouves[0] || 'codex'
}

// L'effort de raisonnement de Codex : « none » par défaut en exec (vu le 14/09/2026 sur gpt-6-astra), trop peu pour une tâche.
// --effort=none|minimal|low|medium|high|xhigh ; par défaut medium pour lancer et pas, rien de forcé pour la sonde.
function effortCodex() { const e = option('effort', commande === 'sonde' ? null : 'medium'); return e && /^(none|minimal|low|medium|high|xhigh)$/.test(e) ? e : null }

// Lance le CLI en mode sans les mains : -p (prompt) + --yolo (outils auto-approuvés), dans le dépôt. Le prompt long vit dans un
// fichier : on ne passe à la ligne de commande qu'une phrase sans guillemets (Windows + shell:true n'aiment ni les retours
// à la ligne ni les backticks).
function executer(moteur, instruction, modele, journal, delaiMs) {
  const m = MOTEURS[moteur]
  const codex = moteur === 'codex'
  // Codex : binaire lancé sans shell (les arguments passent tels quels, retours à la ligne compris) ; son dernier message va
  // dans un fichier à côté du journal, relu à la fin pour y trouver la ligne de verdict.
  const dernier = journal.replace(/\.log$/, '') + '.dernier-message.md'
  const argv = codex
    ? ['exec', '-C', RACINE, '--add-dir', path.resolve(RACINE, '..', 'SaaS'), '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true', '--color', 'never', '-o', dernier, ...(modele ? ['-m', modele] : []), ...(effortCodex() ? ['-c', 'model_reasoning_effort=' + effortCodex()] : []), instruction]
    : ['-y', m.paquet, '-p', `"${instruction.replace(/"/g, '')}"`, '--yolo', ...(modele ? ['-m', modele] : [])]
  return new Promise((resolve) => {
    const debut = Date.now()
    const enfant = codex
      ? spawn(binaireCodex(), argv, { cwd: RACINE, env: env(moteur), windowsHide: true })
      : spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', argv, { cwd: RACINE, env: env(moteur), shell: true, windowsHide: true })
    if (codex) enfant.stdin.end()
    let sortie = ''
    const flux = fs.createWriteStream(journal, { flags: 'a' })
    flux.write(`\n=== ${maintenant()} ${moteur}${modele ? ' ' + modele : ''} : ${instruction}\n`)
    const lire = (b) => { const s = b.toString(); sortie += s; flux.write(s); process.stdout.write(s.length > 4000 ? s.slice(0, 4000) + '…' : s) }
    enfant.stdout.on('data', lire); enfant.stderr.on('data', lire)
    const minuteur = setTimeout(() => { flux.write(`\n[délai de ${Math.round(delaiMs / 60000)} min dépassé : arrêt]\n`); enfant.kill() }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuteur); if (codex && fs.existsSync(dernier)) { const d = fs.readFileSync(dernier, 'utf8'); sortie += '\n' + d; flux.write(`\n--- dernier message de Codex ---\n${d}\n`) } flux.end(); resolve({ code, sortie, duree: Math.round((Date.now() - debut) / 1000), auth: m.auth.test(sortie) && code !== 0 }) })
  })
}

async function sonde(moteur) {
  const journal = path.join(TRAVAIL, `sonde-${moteur}-${horodatage()}.log`)
  const r = await executer(moteur, 'Réponds uniquement le mot OK, rien d autre.', option('model', MOTEURS[moteur].modele), journal, 120_000)
  if (r.auth) { console.log(`\n✗ ${moteur} : pas authentifié. ${moteur === 'codex' ? 'Ouvrir l’application Codex et se connecter avec ChatGPT (codex login status doit répondre Logged in).' : moteur === 'gemini' ? 'Mettre GEMINI_API_KEY dans .env.local (aistudio.google.com) : la connexion Google est refusée par Google depuis le 14/09/2026 (UNSUPPORTED_CLIENT).' : 'Dans un terminal : npx @qwen-code/qwen-code → /auth → Qwen OAuth.'}`); return 1 }
  const ok = r.code === 0 && /\bOK\b/.test(r.sortie)
  console.log(`\n${ok ? '✓' : '?'} ${moteur} : ${ok ? 'répond' : 'sortie inattendue'} en ${r.duree} s (code ${r.code}) · journal ${path.relative(RACINE, journal)}`)
  return ok ? 0 : 1
}

// Codex sous Windows : son bac à sable refuse à Node de lancer des sous-processus (« spawn EPERM », vu le 14/09/2026 sur
// la tâche 018-01) — il peut lire, écrire et lancer `orchestre prochaine`, mais ni `verifier`, ni npm, ni Playwright. La
// boucle se fait donc ici : Codex écrit, le vérificateur tourne HORS du bac à sable juste après, et s'il échoue sa sortie
// est ajoutée au fichier de prompt avant de relancer Codex (--boucle=3 tours par défaut). Vert : la tâche passe dans fait/
// et le vérificateur est relancé — ce verdict-là compte, comme pour un agent Antigravity.
const SUPPLEMENT_CODEX = (tache) => `

Particularité de ton environnement (Codex sous Windows) : ton bac à sable refuse à Node de lancer des sous-processus (« spawn EPERM »). Tu peux lancer \`node scripts/orchestre.mjs prochaine …\`, lire, chercher et écrire dans les fichiers. Mais NE LANCE PAS \`node scripts/orchestre.mjs verifier\`, ni npm, npx, Playwright, ni aucun script qui démarre un autre programme : ils échoueraient et tu perdrais du temps. À la place, lis le script appelé par la ligne \`verifier\` de la tâche et écris le code qui satisfait chacun de ses contrôles. Ne déplace pas la tâche vers fait/ et n'écris pas de question pour ce blocage-là. Termine par une seule ligne : \`${tache} : PRÊT — <ce que tu as fait>\`. Claude Code lance le vérificateur hors bac à sable juste après toi ; s'il échoue, sa sortie est ajoutée à la fin de ce fichier et tu es relancé pour corriger.`

function verifierHorsBac(tache) {
  const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'verifier', tache], { cwd: RACINE, encoding: 'utf8', timeout: 45 * 60_000, windowsHide: true })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  return { pass: r.status === 0 && new RegExp(`${tache}\\s*:\\s*PASS`).test(sortie), sortie }
}

async function boucleCodex(agent, tache, modele, fPrompt, journal) {
  const tours = Math.max(1, Number(option('boucle', '3')) || 3)
  const minutes = Number(option('minutes', '40')) * 60_000
  const relPrompt = path.relative(RACINE, fPrompt).split(path.sep).join('/')
  for (let tour = 1; tour <= tours; tour++) {
    const instruction = tour === 1
      ? `Lis le fichier ${relPrompt} du depot et fais exactement ce qu il dit, du debut a la fin.`
      : `Relis le fichier ${relPrompt} du depot : sa derniere section contient le retour du verificateur lance hors bac a sable. Corrige ce qui echoue, dans le perimetre de la tache ${tache}, puis termine par la ligne ${tache} : PRÊT.`
    const r = await executer('codex', instruction, modele, journal, minutes)
    if (r.auth) { console.log('\n✗ codex : pas authentifié (voir sonde)'); process.exit(1) }
    // Quota de l'abonnement ChatGPT épuisé (vu le 14/09/2026 à 22 h 16 : « You've hit your usage limit … try again at Sep 15th,
    // 2026 2:17 AM ») : les tours suivants échoueraient en une seconde chacun. On s'arrête et on dit quand reprendre.
    const limite = r.sortie.match(/hit your usage limit[^\n]*?(try again at [^\n]+)?$/im)
    if (limite) {
      console.log(`\n✗ codex : quota de l'abonnement épuisé${limite[1] ? ' — ' + limite[1].trim() : ''}. La tâche ${tache} reste où elle est : node scripts/orchestre.mjs liberer ${tache} pour la confier à un autre exécutant.`)
      process.exit(3)
    }
    const enCours = path.join(ORCH, 'en-cours', `${tache}.md`)
    if (!fs.existsSync(enCours)) { console.log(`\n✗ tour ${tour} : ${tache} n'est pas dans en-cours/ (Codex ne l'a pas prise ?) · journal ${path.relative(RACINE, journal)}`); process.exit(1) }
    const v = verifierHorsBac(tache)
    fs.appendFileSync(journal, `\n=== vérificateur hors bac à sable, tour ${tour} (${maintenant()}) ===\n${v.sortie}\n`)
    console.log(`\n· tour ${tour} : vérificateur ${v.pass ? 'PASS' : 'FAIL'} — ${(v.sortie.trim().split('\n').pop() || '').slice(0, 200)}`)
    if (v.pass) {
      fs.renameSync(enCours, path.join(ORCH, 'fait', `${tache}.md`))
      const q = path.join(ORCH, 'en-cours', `${tache}.question.md`)
      if (fs.existsSync(q)) fs.renameSync(q, path.join(ORCH, 'fait', `${tache}.question.md`))
      const final = verifierHorsBac(tache)
      fs.appendFileSync(journal, `\n=== vérificateur final (fait/) ===\n${final.sortie}\n`)
      console.log(`${final.pass ? '✓' : '✗'} ${tache} : ${final.pass ? 'PASS' : 'FAIL'} au verdict final, en ${tour} tour(s) · journal ${path.relative(RACINE, journal)}`)
      process.exit(final.pass ? 0 : 1)
    }
    if (tour === tours) { console.log(`✗ ${tache} : FAIL après ${tours} tour(s) — la tâche reste dans en-cours/ · journal ${path.relative(RACINE, journal)}`); process.exit(1) }
    fs.appendFileSync(fPrompt, `\n\n## Retour du vérificateur, tour ${tour} (${maintenant()}, lancé hors bac à sable)\n\n\`\`\`\n${v.sortie.slice(-6000)}\n\`\`\`\n\nCorrige ce qui échoue, dans le périmètre, puis termine par « ${tache} : PRÊT — … ».\n`)
  }
}

async function lancer(agent, tache, moteur, modele) {
  if (!tache) { console.error('lancer <agent> --tache=<id> est obligatoire ici : sans conversation persistante, un exécutant reçoit une tâche nommée'); process.exit(2) }
  const prompt = (option('duo') ? PROMPT_DUO(agent, tache) : PROMPT(agent, tache)) + (moteur === 'codex' && !option('duo') ? SUPPLEMENT_CODEX(tache) : '')
  const fPrompt = path.join(TRAVAIL, `${tache}.prompt.md`)
  fs.writeFileSync(fPrompt, `# Tâche ${tache} — agent ${agent} — ${maintenant()}\n\n${prompt}\n`)
  const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
  fs.appendFileSync(AGENTS, JSON.stringify({ agent, tache, modele: `${moteur}:${modele || 'défaut'}`, conversationId: `executant-${path.basename(journal, '.log')}`, date: maintenant() }) + '\n')
  console.log(`✓ ${agent} → ${tache} lancé (${moteur}${modele ? ' ' + modele : ''}) · prompt ${path.relative(RACINE, fPrompt)} · journal ${path.relative(RACINE, journal)}`)
  if (moteur === 'codex' && !option('duo')) return boucleCodex(agent, tache, modele, fPrompt, journal)
  const r = await executer(moteur, `Lis le fichier ${path.relative(RACINE, fPrompt).split(path.sep).join('/')} du depot et fais exactement ce qu il dit, du debut a la fin.`, modele, journal, Number(option('minutes', '40')) * 60_000)
  if (r.auth) { console.log(`\n✗ ${moteur} : pas authentifié (voir sonde)`); process.exit(1) }
  const verdict = (r.sortie.match(new RegExp(`${tache}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0]
  console.log(`\n${r.code === 0 ? '✓' : '✗'} fin en ${Math.round(r.duree / 60)} min (code ${r.code}) · ${verdict || 'pas de ligne de verdict : lire le journal et lancer verifier ' + tache}`)
  process.exit(r.code === 0 ? 0 : 1)
}

async function pas(agent, tache, message, moteur, modele) {
  const fPrompt = path.join(TRAVAIL, `${tache}.prompt.md`)
  if (!fs.existsSync(fPrompt)) { console.error(`pas de prompt pour ${tache} : lancer d'abord`); process.exit(2) }
  fs.appendFileSync(fPrompt, `\n\n## Pas suivant (${maintenant()})\n${message}\n`)
  const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
  const r = await executer(moteur, `Lis le fichier ${path.relative(RACINE, fPrompt).split(path.sep).join('/')} du depot : c est l histoire de ta tache ; execute seulement le dernier pas, puis reponds en une ligne.`, modele, journal, Number(option('minutes', '20')) * 60_000)
  process.exit(r.code === 0 ? 0 : 1)
}

function etat() {
  const lignes = fs.existsSync(AGENTS) ? fs.readFileSync(AGENTS, 'utf8').split(/\r?\n/).filter((l) => l.includes('"executant-')).map((l) => JSON.parse(l)) : []
  if (!lignes.length) return console.log('aucun lancement par executant.mjs')
  for (const l of lignes.slice(-12)) { const j = path.join(TRAVAIL, l.conversationId.replace(/^executant-/, '') + '.log'); const taille = fs.existsSync(j) ? fs.statSync(j).size : 0; console.log(`${l.date}  ${l.agent.padEnd(14)} ${String(l.tache).padEnd(8)} ${l.modele.padEnd(22)} journal ${taille ? Math.round(taille / 1024) + ' Ko' : 'absent'}`) }
}

const moteur = option('moteur', 'codex')
if (!MOTEURS[moteur]) { console.error(`moteur inconnu : ${moteur} (codex | gemini | qwen)`); process.exit(2) }
switch (commande) {
  case 'sonde': process.exit(await sonde(moteur))
  case 'lancer': if (!positionnels[0]) { console.error('lancer <agent> --tache=<id> [--moteur=codex|gemini|qwen] [--model=…] [--duo]'); process.exit(2) } await lancer(positionnels[0], option('tache'), moteur, option('model', MOTEURS[moteur].modele)); break
  case 'pas': if (positionnels.length < 2) { console.error('pas <agent> --tache=<id> <message…>'); process.exit(2) } await pas(positionnels[0], option('tache'), positionnels.slice(1).join(' '), moteur, option('model', MOTEURS[moteur].modele)); break
  case 'etat': etat(); break
  default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(4, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
}
