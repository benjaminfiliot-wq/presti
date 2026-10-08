// bin/executant.mjs — un second exécutant quand Antigravity est à sec (ses quotas tombent en minutes dès que deux
// agents tournent). Codex (application OpenAI Codex), piloté sans les mains, avec le MÊME contrat de tâche que
// bin/antigravity.mjs (le prompt est importé de là : une seule source). Vendorisé dans <projet>/scripts/executant.mjs
// par `orchestre.mjs maj`, comme bin/orchestre.mjs — généraliste : aucun chemin propre à un projet particulier ici,
// tout vient de .orchestre/orchestre.json (racine, vault, source, projet).
//
// Usage :
//   node scripts/executant.mjs sonde [--moteur=codex]                        → l'authentification tient ? (une question, une réponse)
//   node scripts/executant.mjs lancer <agent> --tache=<id> [--moteur=codex] [--model=…] [--effort=medium] [--boucle=3] [--duo]
//   node scripts/executant.mjs pas <agent> --tache=<id> <message…>          → un pas de plus (duo) : l'histoire est dans le fichier de prompt
//   node scripts/executant.mjs etat                                          → les lancements et leurs journaux
// Première fois (une seule, dans un terminal) : rien à faire. L'application Codex est connectée par ChatGPT ; le
// binaire vit dans %LOCALAPPDATA%/OpenAI/Codex/bin/<version>/codex.exe (le plus récent est pris). Il est lancé en
// « exec » dans un bac à sable limité au dépôt (-s workspace-write, réseau autorisé, vault du projet en plus quand
// il est configuré), jamais avec le « danger-full-access » que ~/.codex/config.toml règle pour l'application.
// Les journaux vont dans .orchestre/travail/executant/ ; le registre « un agent, une tâche » est le même (.orchestre/agents.jsonl).
// Gemini CLI et Qwen Code, exécutants fantômes, ont été retirés le 28/09/2026 (026-107).
// Quota épuisé (026-115) : la tâche retourne en file/, l'échéance va dans .orchestre/quotas.json, `lancer` (code 3) et
// `prochaine --agent=codex-…` (code 2) refusent jusque-là ; quotaActif(moteur) est exporté pour qui veut la lire.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PROMPT } from './antigravity.mjs'
import { executerHaiku } from './haiku-agent.mjs'
// Sans conversation persistante, le duo (plans/duo-antigravity.md) se joue en pas successifs : « pas » rejoue le fichier de prompt.
const PROMPT_DUO = (agent, tache) => PROMPT(agent, tache) + '\nMode duo : fais seulement le pas 1 — lis la tâche, lance sa commande verifier UNE fois (--statique si c’est site-qa), note les lignes ÉCHEC — puis rends compte en trois lignes et arrête-toi : Claude Code dicte le pas suivant.'

// La racine du projet : le dossier qui contient .orchestre/, en remontant depuis le répertoire courant, sinon depuis
// ce fichier — comme bin/orchestre.mjs. Sans .orchestre/ trouvable (ex. ce fichier copié seul, sans le projet), on
// retombe sur l'hypothèse habituelle « ce fichier vit dans <racine>/scripts/ ».
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
const TRAVAIL = path.join(ORCH, 'travail', 'executant')
const AGENTS = path.join(ORCH, 'agents.jsonl')
const QUOTAS = path.join(ORCH, 'quotas.json')
const MOTEURS = {
  // Modèle par défaut gpt-6-sol (« workhorse model for coding and everyday work »). Tâches légères et répétitives
  // (tri, relances, veille) : --model=gpt-6-luna (« fast and affordable ») ; très gros chantier : --model=gpt-6-astra.
  codex: { paquet: null, modele: 'gpt-6-sol', cle: null, auth: /not logged in|please log ?in|codex login|401 Unauthorized|403 Forbidden/i },
  'codex-gratuit': { paquet: null, modele: 'gpt-oss:120b-cloud', cle: null, auth: /401 Unauthorized|403 Forbidden/i },
  antigravity: { paquet: null, modele: 'flash', cle: null, auth: /RESOURCE_EXHAUSTED|quota/i },
  haiku: { paquet: null, modele: 'claude-haiku-5-5', cle: null, auth: /authentication_error/i },
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

// La clé « source » de .orchestre/orchestre.json (le dépôt orchestre) : quand elle existe sur disque, Codex y reçoit
// aussi l'accès en écriture (026-098 — avant ça, seul le vault s'ajoutait à RACINE dans le bac à sable).
function configSource() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ORCH, 'orchestre.json'), 'utf8'))
    if (cfg.source) { const s = path.resolve(RACINE, cfg.source); if (fs.existsSync(s)) return s }
  } catch { /* pas de config, ou source absente/introuvable : on n'ajoute rien */ }
  return null
}

// La clé « vault » de .orchestre/orchestre.json (le second dépôt du projet, ex. son cerveau Obsidian) : quand il
// existe sur disque, Codex y reçoit l'accès en écriture dans le bac à sable, en plus de RACINE.
function configVault() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ORCH, 'orchestre.json'), 'utf8'))
    if (cfg.vault) { const v = path.resolve(RACINE, cfg.vault); if (fs.existsSync(v)) return v }
  } catch { /* pas de config, ou vault absent/introuvable : on n'ajoute rien */ }
  return null
}

// Le binaire de l'application Codex : le dossier bin/<version>/ change à chaque mise à jour, on prend le plus récent.
// ORCHESTRE_CODEX_BIN (026-115) : le seuil des tests — un faux Codex ; un fichier .mjs est lancé par node.
function binaireCodex() {
  if (process.env.ORCHESTRE_CODEX_BIN) return process.env.ORCHESTRE_CODEX_BIN
  const base = path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin')
  const trouves = fs.existsSync(base) ? fs.readdirSync(base).map((d) => path.join(base, d, 'codex.exe')).filter((f) => fs.existsSync(f)) : []
  trouves.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return trouves[0] || 'codex'
}

// L'effort de raisonnement de Codex : « none » par défaut en exec (vu le 14/09/2026 sur gpt-6-astra), trop peu pour une tâche.
// --effort=none|minimal|low|medium|high|xhigh ; par défaut medium pour lancer et pas, rien de forcé pour la sonde.
function effortCodex() { const e = option('effort', commande === 'sonde' ? null : 'medium'); return e && /^(none|minimal|low|medium|high|xhigh)$/.test(e) ? e : null }

// L'argv de Codex, seule à être testée à blanc (--a-blanc) : mêmes bras-de-sable qu'en vrai (RACINE + vault du
// projet s'il existe + dépôt orchestre s'il existe), pour que la ligne affichée à blanc soit celle réellement lancée.
function argvCodex(dernier, modele, instruction) {
  const vault = configVault()
  const src = configSource()
  return ['exec', '-C', RACINE, ...(vault ? ['--add-dir', vault] : []), ...(src ? ['--add-dir', src] : []), '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true', '--color', 'never', '-o', dernier, ...(modele ? ['-m', modele] : []), ...(effortCodex() ? ['-c', 'model_reasoning_effort=' + effortCodex()] : []), instruction]
}

function argvCodexGratuit(dernier, modele, instruction) {
  const base = process.env.PRESTI_CODEX_GRATUIT_URL
  if (!base || !/^https?:\/\//.test(base)) throw new Error('PRESTI_CODEX_GRATUIT_URL absent ou invalide')
  if (!process.env.PRESTI_CODEX_GRATUIT_CLE) throw new Error('clé du fournisseur gratuit absente du coffre')
  return [...argvCodex(dernier, modele, instruction).slice(0, -1),
    '-c', 'model_provider=presti_gratuit', '-c', 'model_providers.presti_gratuit.name="presti_gratuit"',
    '-c', `model_providers.presti_gratuit.base_url=${JSON.stringify(base)}`,
    '-c', 'model_providers.presti_gratuit.env_key=PRESTI_CODEX_GRATUIT_CLE',
    '-c', 'model_providers.presti_gratuit.wire_api=responses', instruction]
}

// Lance le CLI en mode sans les mains : -p (prompt) + --yolo (outils auto-approuvés), dans le dépôt. Le prompt long vit dans un
// fichier : on ne passe à la ligne de commande qu'une phrase sans guillemets (Windows + shell:true n'aiment ni les retours
// à la ligne ni les backticks).
function executer(moteur, instruction, modele, journal, delaiMs) {
  if (moteur === 'haiku') return executerHaiku({ racine: RACINE, instruction, journal, delaiMs })
  const m = MOTEURS[moteur]
  const codex = moteur === 'codex' || moteur === 'codex-gratuit'
  // Codex : binaire lancé sans shell (les arguments passent tels quels, retours à la ligne compris) ; son dernier message va
  // dans un fichier à côté du journal, relu à la fin pour y trouver la ligne de verdict.
  const dernier = journal.replace(/\.log$/, '') + '.dernier-message.md'
  const argv = codex
    ? (moteur === 'codex-gratuit' ? argvCodexGratuit(dernier, modele, instruction) : argvCodex(dernier, modele, instruction))
    : ['-y', m.paquet, '-p', `"${instruction.replace(/"/g, '')}"`, '--yolo', ...(modele ? ['-m', modele] : [])]
  return new Promise((resolve) => {
    const debut = Date.now()
    const bin = codex ? binaireCodex() : null
    const enfant = codex
      ? (/\.mjs$/i.test(bin) ? spawn(process.execPath, [bin, ...argv], { cwd: RACINE, env: env(moteur), windowsHide: true }) : spawn(bin, argv, { cwd: RACINE, env: env(moteur), windowsHide: true }))
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

// ── quota épuisé (026-115) ───────────────────────────────────────────────────────────────────────────
// Quand un moteur annonce son quota épuisé, on ne bloque plus la tâche : elle retourne en file/, l'échéance est
// notée dans .orchestre/quotas.json ({"codex": {"jusqua", "vu", "message"}}, fusionné, jamais écrasé), et ni
// `prochaine --agent=codex-…` (bin/orchestre.mjs, qui lit ce fichier sans importer celui-ci) ni `lancer` ne
// relancent Codex avant l'échéance. Choisir l'exécutant suivant reste le geste de Claude Code.
const MOIS_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
const PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const partiesParis = (ms) => Object.fromEntries(PARIS.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
// Le décalage de Paris à un instant : ce qu'il faut ajouter à l'UTC (en ms) pour lire l'heure de Paris.
function decalageParis(ms) { const p = partiesParis(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60_000) * 60_000 }
const isoSansMs = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
// « try again at Sep 30th, 2026 2:17 AM » : mois anglais, jour à suffixe, année, heure sur 12 h, à l'heure de Paris.
// Rend l'échéance en UTC ISO, ou null si le texte n'en porte pas de lisible (ou déjà passée : une échéance passée est une erreur de lecture).
function echeanceDepuis(texte) {
  const m = String(texte).match(/try again at\s+([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP])\.?M/i)
  if (!m) return null
  const mois = MOIS_EN[m[1].slice(0, 3).toLowerCase()]
  const h12 = Number(m[4])
  if (mois === undefined || h12 < 1 || h12 > 12) return null
  const naif = Date.UTC(Number(m[3]), mois, Number(m[2]), (h12 % 12) + (/p/i.test(m[6]) ? 12 : 0), Number(m[5]))
  if (new Date(naif).getUTCDate() !== Number(m[2])) return null // « Feb 31st » : le jour n'existe pas
  let ms = naif - decalageParis(naif)
  ms = naif - decalageParis(ms) // deuxième passe : l'heure d'été peut changer entre la première estimation et l'échéance
  return ms > Date.now() ? isoSansMs(ms) : null
}
function dateLisible(iso) { const p = partiesParis(Date.parse(iso)); return `${p.day}/${p.month}/${p.year} à ${p.hour}h${p.minute}` }
function lireQuotas() {
  try { const q = JSON.parse(fs.readFileSync(QUOTAS, 'utf8')); return q && typeof q === 'object' && !Array.isArray(q) ? q : {} } catch { return {} }
}
// { actif, jusqua } : l'échéance de quotas.json pour ce moteur, active tant qu'elle est à venir.
export function quotaActif(moteur) {
  const jusqua = lireQuotas()[moteur]?.jusqua
  const ms = Date.parse(jusqua)
  return Number.isFinite(ms) && ms > Date.now() ? { actif: true, jusqua } : { actif: false, jusqua: null }
}
// Sur « hit your usage limit » : échéance lue (sinon maintenant + 6 h), quotas.json fusionné, verdict QUOTA, et la tâche
// rendue à la file par le même chemin que `liberer`. Rend l'échéance en UTC ISO.
function noterQuota(moteur, agent, tache, sortie) {
  const debut = Math.max(sortie.search(/hit your usage limit/i), 0)
  const suite = sortie.slice(sortie.lastIndexOf('\n', debut) + 1) // depuis le début de la ligne du message
  const maintenantMs = Date.now()
  const jusqua = echeanceDepuis(suite.slice(0, 400)) || isoSansMs(maintenantMs + 6 * 3_600_000)
  const vu = isoSansMs(maintenantMs)
  const message = (suite.split(/\r?\n/)[0] || '').trim().slice(0, 160)
  if (fs.existsSync(QUOTAS)) { try { JSON.parse(fs.readFileSync(QUOTAS, 'utf8')) } catch { fs.copyFileSync(QUOTAS, QUOTAS.replace(/\.json$/, '.illisible.json')) } } // jamais écrasé
  const q = lireQuotas()
  q[moteur] = { jusqua, vu, message }
  const tmp = `${QUOTAS}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(q, null, 2) + '\n')
  fs.renameSync(tmp, QUOTAS)
  fs.appendFileSync(path.join(ORCH, 'verdicts.jsonl'), JSON.stringify({ id: tache, verdict: 'QUOTA', ligne: `${moteur} à sec jusqu'au ${dateLisible(jusqua)}`, code: null, date: vu, duree_s: 0, agent, executant: moteur, lignes: 0, dossier: 'en-cours' }) + '\n')
  if (fs.existsSync(path.join(ORCH, 'en-cours', `${tache}.md`))) {
    const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'liberer', tache], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
    if (r.status !== 0) console.log(`! ${tache} n'a pas pu être rendue à la file (${(r.stdout + r.stderr).trim().split('\n').pop()}) : node scripts/orchestre.mjs liberer ${tache}`)
  }
  return jusqua
}
// Codex vient de répondre : si c'est « hit your usage limit », on note le quota, on rend la tâche et on sort en code 3.
function signalerQuota(agent, tache, sortie, moteur = 'codex') {
  if (!/hit your usage limit|rate limit exceeded|quota exceeded|RESOURCE_EXHAUSTED/i.test(sortie)) return false
  const jusqua = noterQuota(moteur, agent, tache, sortie)
  console.log(`\n✗ ${moteur} : quota épuisé jusqu'au ${dateLisible(jusqua)}. ${tache} est rendue à la file.`)
  process.exitCode = 3
  return true
}
// Le refus en amont : rien n'est lancé tant que l'échéance n'est pas passée (code 3).
function refuserSiQuota(moteur, tache) {
  const q = quotaActif(moteur)
  if (!q.actif) return false
  console.log(`✗ ${moteur} à sec jusqu'au ${dateLisible(q.jusqua)} (.orchestre/quotas.json) : rien n'est lancé. Confie ${tache || 'la tâche'} à un autre exécutant : node scripts/antigravity.mjs lancer ag-<n> --tache=${tache || '<id>'}`)
  process.exitCode = 3
  return true
}

async function sonde(moteur) {
  const journal = path.join(TRAVAIL, `sonde-${moteur}-${horodatage()}.log`)
  const r = await executer(moteur, 'Réponds uniquement le mot OK, rien d autre.', option('model', MOTEURS[moteur].modele), journal, 120_000)
  if (r.auth) { console.log(`\n✗ ${moteur} : pas authentifié. Ouvrir l’application Codex et se connecter avec ChatGPT (codex login status doit répondre Logged in).`); return 1 }
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

async function boucleCodex(agent, tache, modele, fPrompt, journal, moteur = 'codex') {
  const tours = Math.max(1, Number(option('boucle', '3')) || 3)
  const minutes = Number(option('minutes', '40')) * 60_000
  const relPrompt = path.relative(RACINE, fPrompt).split(path.sep).join('/')
  for (let tour = 1; tour <= tours; tour++) {
    const instruction = tour === 1
      ? `Lis le fichier ${relPrompt} du depot et fais exactement ce qu il dit, du debut a la fin.`
      : `Relis le fichier ${relPrompt} du depot : sa derniere section contient le retour du verificateur lance hors bac a sable. Corrige ce qui echoue, dans le perimetre de la tache ${tache}, puis termine par la ligne ${tache} : PRÊT.`
    const r = await executer(moteur, instruction, modele, journal, minutes)
    if (r.auth) { console.log('\n✗ codex : pas authentifié (voir sonde)'); process.exit(1) }
    // Quota de l'abonnement ChatGPT épuisé (vu le 14/09/2026 à 22 h 16 : « You've hit your usage limit … try again at Sep 15th,
    // 2026 2:17 AM ») : les tours suivants échoueraient en une seconde chacun. On s'arrête, on note l'échéance dans
    // quotas.json et on rend la tâche à la file (026-115 : elle ne reste plus verrouillée, comme le 17/09).
    if (signalerQuota(agent, tache, r.sortie, moteur)) return
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
  // --a-blanc : affiche la ligne qui serait lancée (JSON {moteur, argv, cwd}), sans rien lancer ni rien écrire (ni
  // fichier de prompt, ni journal, ni agents.jsonl) — 026-098, pour que Codex (bac à sable) puisse s'y fier sans risque.
  if (option('a-blanc')) {
    const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
    const dernier = journal.replace(/\.log$/, '') + '.dernier-message.md'
    const argv = moteur === 'codex' || moteur === 'codex-gratuit'
      ? (moteur === 'codex-gratuit' ? argvCodexGratuit(dernier, modele, '<prompt de la tâche>') : argvCodex(dernier, modele, '<prompt de la tâche>'))
      : ['-y', MOTEURS[moteur].paquet, '-p', '"<prompt de la tâche>"', '--yolo', ...(modele ? ['-m', modele] : [])]
    console.log(JSON.stringify({ moteur, argv, cwd: RACINE }))
    process.exit(0)
  }
  if (refuserSiQuota(moteur, tache)) return
  if (moteur === 'antigravity') {
    const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'antigravity.mjs'), 'lancer', agent, `--tache=${tache}`, `--model=${modele || 'flash'}`], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
    process.stdout.write(r.stdout || '')
    if (r.status !== 0) throw new Error('Antigravity indisponible')
    return
  }
  const prompt = (option('duo') ? PROMPT_DUO(agent, tache) : PROMPT(agent, tache)) + (moteur === 'codex' && !option('duo') ? SUPPLEMENT_CODEX(tache) : '')
  const fPrompt = path.join(TRAVAIL, `${tache}.prompt.md`)
  fs.writeFileSync(fPrompt, `# Tâche ${tache} — agent ${agent} — ${maintenant()}\n\n${prompt}\n`)
  const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
  fs.appendFileSync(AGENTS, JSON.stringify({ agent, tache, modele: `${moteur}:${modele || 'défaut'}`, conversationId: `executant-${path.basename(journal, '.log')}`, date: maintenant() }) + '\n')
  console.log(`✓ ${agent} → ${tache} lancé (${moteur}${modele ? ' ' + modele : ''}) · prompt ${path.relative(RACINE, fPrompt)} · journal ${path.relative(RACINE, journal)}`)
  if ((moteur === 'codex' || moteur === 'codex-gratuit' || moteur === 'haiku') && !option('duo')) return boucleCodex(agent, tache, modele, fPrompt, journal, moteur)
  const r = await executer(moteur, `Lis le fichier ${path.relative(RACINE, fPrompt).split(path.sep).join('/')} du depot et fais exactement ce qu il dit, du debut a la fin.`, modele, journal, Number(option('minutes', '40')) * 60_000)
  if (r.auth) { console.log(`\n✗ ${moteur} : pas authentifié (voir sonde)`); process.exit(1) }
  if (moteur === 'codex' && signalerQuota(agent, tache, r.sortie)) return
  const verdict =(r.sortie.match(new RegExp(`${tache}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0]
  console.log(`\n${r.code === 0 ? '✓' : '✗'} fin en ${Math.round(r.duree / 60)} min (code ${r.code}) · ${verdict || 'pas de ligne de verdict : lire le journal et lancer verifier ' + tache}`)
  process.exit(r.code === 0 ? 0 : 1)
}

async function pas(agent, tache, message, moteur, modele) {
  if (refuserSiQuota(moteur, tache)) return
  const fPrompt = path.join(TRAVAIL, `${tache}.prompt.md`)
  if (!fs.existsSync(fPrompt)) { console.error(`pas de prompt pour ${tache} : lancer d'abord`); process.exit(2) }
  fs.appendFileSync(fPrompt, `\n\n## Pas suivant (${maintenant()})\n${message}\n`)
  const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
  const r = await executer(moteur, `Lis le fichier ${path.relative(RACINE, fPrompt).split(path.sep).join('/')} du depot : c est l histoire de ta tache ; execute seulement le dernier pas, puis reponds en une ligne.`, modele, journal, Number(option('minutes', '20')) * 60_000)
  if (moteur === 'codex' && signalerQuota(agent, tache, r.sortie)) return
  process.exit(r.code === 0 ? 0 : 1)
}

function etat() {
  const lignes = fs.existsSync(AGENTS) ? fs.readFileSync(AGENTS, 'utf8').split(/\r?\n/).filter((l) => l.includes('"executant-')).map((l) => JSON.parse(l)) : []
  if (!lignes.length) return console.log('aucun lancement par executant.mjs')
  for (const l of lignes.slice(-12)) { const j = path.join(TRAVAIL, l.conversationId.replace(/^executant-/, '') + '.log'); const taille = fs.existsSync(j) ? fs.statSync(j).size : 0; console.log(`${l.date}  ${l.agent.padEnd(14)} ${String(l.tache).padEnd(8)} ${l.modele.padEnd(22)} journal ${taille ? Math.round(taille / 1024) + ' Ko' : 'absent'}`) }
}

// Le CLI ne tourne que si ce fichier est lancé directement : bin/antigravity.mjs importe PROMPT sans rien lancer,
// et un projet qui importe scripts/executant.mjs (026-107, ORS-7) ne doit rien voir s'afficher ni s'exécuter.
const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const moteur = option('moteur', 'codex')
  if (!MOTEURS[moteur]) { console.error(`moteur inconnu : ${moteur} (codex)`); process.exit(2) }
  switch (commande) {
    case 'sonde': {
      if (moteur === 'antigravity') {
        const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'antigravity.mjs'), 'sonde', '--model=flash_lite'], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
        process.stdout.write(r.stdout || '')
        process.exitCode = r.status === 0 ? 0 : 1
      } else process.exitCode = await sonde(moteur)
      break
    }
    case 'lancer': if (!positionnels[0]) { console.error('lancer <agent> --tache=<id> [--moteur=codex] [--model=…] [--duo]'); process.exit(2) } await lancer(positionnels[0], option('tache'), moteur, option('model', MOTEURS[moteur].modele)); break
    case 'pas': if (positionnels.length < 2) { console.error('pas <agent> --tache=<id> <message…>'); process.exit(2) } await pas(positionnels[0], option('tache'), positionnels.slice(1).join(' '), moteur, option('model', MOTEURS[moteur].modele)); break
    case 'etat': etat(); break
    default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(4, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  }
}

export { binaireCodex } // quotaActif est exporté là où il est déclaré
