#!/usr/bin/env node
// Doublure de `claude -p` pour scripts/usine-relais-qa.mjs (banc d'essai de l'exécutant Claude de scripts/usine.mjs tourner,
// 05/10/2026). Choisie par PRESTI_CLAUDE_BIN ; jamais présente sur l'usine. Aucun réseau, aucun modèle.
// Elle lit les arguments du vrai Claude Code (-p <instruction> en tête, --model, --permission-mode, --allowedTools et
// --disallowedTools variadiques en dernier), émet le flux --output-format stream-json réel (system/init, assistant/tool_use,
// user/tool_result, rate_limit_event, result) et note chaque appel dans BANC_JOURNAL (JSONL) : arguments, instruction, cwd,
// variables d'environnement qui ne doivent PAS lui parvenir (ANTHROPIC_API_KEY, FL_KEY) ou qui doivent (DISABLE_AUTOUPDATER).
// Réglages (variables d'environnement, posées par le banc) :
//   BANC_CLAUDE=quota        quota épuisé : rate_limit_event « rejected » puis résultat en erreur « You've hit your limit · resets 3pm », code 1.
//   BANC_CLAUDE=quota-texte  idem sans rate_limit_event (seul le texte du résultat dit la limite), code 1.
//   BANC_CLAUDE=auth         non connecté : résultat en erreur « Invalid API key · Please run /login », code 1.
//   BANC_CLAUDE=panne        panne ordinaire : résultat en erreur « API Error: 500 », code 1 (ni quota ni connexion perdue).
//   BANC_CLAUDE=sans-resultat  sort en code 1 sans événement « result » : seules ses dernières lignes (stderr) parlent.
//   BANC_CLAUDE_STDERR       texte écrit sur la sortie d'erreur (avec BANC_CLAUDE=sans-resultat).
//   BANC_CLAUDE_CITE=1       travaille normalement, code 0, mais son message final parle de quota (« usage limit reached · resets 3pm »).
//   BANC_CLAUDE_CITE_CODE1=1 comme BANC_CLAUDE_CITE mais sort en code 1 sur une panne ordinaire (« API Error: 500 ») : le texte cité n'est pas l'erreur.
//   BANC_QUESTION=1          pose une question (.orchestre/en-cours/<id>.question.md) au lieu de travailler.
//   BANC_NE_PREND_PAS=1      ne prend pas la fiche (elle reste en file/).
//   BANC_ECRIT_PROSPECT=1    en travaillant, ajoute à sa copie de la fiche une colonne SIREN de prospects.
//   BANC_DORT_claude         secondes d'attente avant de sortir (pour être tué par le délai du tourneur).
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const val = (drapeau) => { const i = argv.indexOf(drapeau); return i >= 0 ? argv[i + 1] : null }
// Les listes variadiques : tout ce qui suit le drapeau jusqu'au prochain drapeau « -- ».
const liste = (drapeau) => { const i = argv.indexOf(drapeau); if (i < 0) return []; const out = []; for (let k = i + 1; k < argv.length && !argv[k].startsWith('--'); k++) out.push(argv[k]); return out }
const instruction = val('-p') || ''
const arbre = process.cwd()
const id = (instruction.match(/travail\/usine\/([\w-]+)\.prompt\.md/) || [])[1] || 'inconnu'

const journal = process.env.BANC_JOURNAL
const noter = (o) => { if (journal) fs.appendFileSync(journal, JSON.stringify({ qui: 'claude', t: Date.now(), ...o }) + '\n') }
const appelsAvant = journal && fs.existsSync(journal)
  ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.qui === 'claude').length
  : 0
noter({
  fournisseur: 'claude', modele: val('--model'), configs: [], argv, instruction, cwd: arbre, rang: appelsAvant + 1, pid: process.pid,
  flKey: process.env.FL_KEY ?? null, cleApi: process.env.ANTHROPIC_API_KEY ?? null, jetonAnthropic: process.env.ANTHROPIC_AUTH_TOKEN ?? null,
  autoMaj: process.env.DISABLE_AUTOUPDATER ?? null, autorises: liste('--allowedTools'), interdits: liste('--disallowedTools'),
})

const SESSION = '00000000-0000-4000-8000-0000000banc0'
const emit = (o) => console.log(JSON.stringify(o))
const assistant = (content) => emit({ type: 'assistant', message: { model: 'claude-sonnet-5-5', role: 'assistant', content }, session_id: SESSION })
const outil = (id_, contenu, erreur = false) => emit({ type: 'user', message: { role: 'user', content: [{ tool_use_id: id_, type: 'tool_result', content: contenu, is_error: erreur }] }, session_id: SESSION })
const resultat = (texte, erreur = false, extra = {}) => emit({ type: 'result', subtype: erreur ? 'error_during_execution' : 'success', is_error: erreur, num_turns: 3, duration_ms: 1234, total_cost_usd: 0.0123, session_id: SESSION, result: texte, ...extra })
const fin = (code) => {
  const dort = Number(process.env.BANC_DORT_claude) || 0
  if (dort) setTimeout(() => process.exit(code), dort * 1000)
  else process.exitCode = code
}

emit({ type: 'system', subtype: 'init', cwd: arbre, session_id: SESSION, model: val('--model'), tools: ['Bash', 'Read', 'Edit'] })
emit({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', resetsAt: 1791201600, rateLimitType: 'five_hour', utilization: 0.12 }, session_id: SESSION })

const mode = process.env.BANC_CLAUDE || ''
if (mode === 'quota' || mode === 'quota-texte') {
  if (mode === 'quota') emit({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1791201600, rateLimitType: 'five_hour', utilization: 1 }, session_id: SESSION })
  const t = "You've hit your limit · resets 3pm (Europe/Paris)"
  assistant([{ type: 'text', text: t }])
  resultat(t, true, { api_error_status: 429 })
  fin(1)
} else if (mode === 'auth') {
  const t = 'Invalid API key · Please run /login'
  assistant([{ type: 'text', text: t }])
  resultat(t, true, { api_error_status: 401 })
  fin(1)
} else if (mode === 'panne') {
  resultat('API Error: 500 {"type":"error","error":{"type":"api_error","message":"Internal server error"}}', true, { api_error_status: 500 })
  fin(1)
} else if (mode === 'sans-resultat') {
  process.stderr.write((process.env.BANC_CLAUDE_STDERR || 'claude: erreur inattendue') + '\n')
  fin(1)
} else {
  const orch = path.join(arbre, '.orchestre')
  const f = (d) => path.join(orch, d, `${id}.md`)
  if (process.env.BANC_QUESTION === '1') {
    fs.mkdirSync(path.join(orch, 'en-cours'), { recursive: true })
    if (fs.existsSync(f('file'))) fs.renameSync(f('file'), f('en-cours'))
    fs.writeFileSync(path.join(orch, 'en-cours', `${id}.question.md`), 'Question du banc : quelle colonne garder ?\n')
    assistant([{ type: 'text', text: `${id} : QUESTION posée` }])
    resultat(`${id} : QUESTION posée`)
    fin(0)
  } else {
    if (process.env.BANC_NE_PREND_PAS !== '1' && fs.existsSync(f('file'))) {
      fs.mkdirSync(path.join(orch, 'en-cours'), { recursive: true })
      fs.renameSync(f('file'), f('en-cours'))
    }
    if (process.env.BANC_ECRIT_PROSPECT === '1' && fs.existsSync(f('en-cours'))) {
      fs.appendFileSync(f('en-cours'), '\nNote de travail : la table gardera la colonne SIREN des prospects importés.\n')
    }
    assistant([{ type: 'text', text: `Je lis ${id}.prompt.md puis je travaille.` }, { type: 'tool_use', id: 'toolu_banc1', name: 'Bash', input: { command: 'sed -n 1,5p banc-travail.txt' } }])
    outil('toolu_banc1', '(rien)')
    assistant([{ type: 'tool_use', id: 'toolu_banc2', name: 'Bash', input: { command: 'git push origin main' } }])
    outil('toolu_banc2', 'Permission to use Bash has been denied: this command requires approval', true)
    fs.writeFileSync(path.join(arbre, 'banc-travail.txt'), `travail de claude, appel ${appelsAvant + 1}\n`, { flag: 'a' })
    const cite = process.env.BANC_CLAUDE_CITE === '1' || process.env.BANC_CLAUDE_CITE_CODE1 === '1'
    const message = `${id} : PRÊT — travail du banc (claude)${cite ? '\nNote : la fiche cite « usage limit reached · resets 3pm » et « rate limit », sans rapport avec mon quota.' : ''}`
    assistant([{ type: 'text', text: message }])
    // Une vraie panne d'API : le résultat en erreur ne porte que le texte de l'erreur ; la citation reste dans le message d'avant.
    if (process.env.BANC_CLAUDE_CITE_CODE1 === '1') { resultat('API Error: 500 internal server error', true, { api_error_status: 500 }); fin(1) } else { resultat(message); fin(0) }
  }
}
