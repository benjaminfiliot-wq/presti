// scripts/executant.mjs — un second exécutant quand Antigravity est à sec (ses quotas tombent en minutes dès que deux
// agents tournent, 13-14/09). Gemini CLI (compte Google, gratuit) ou Qwen Code (compte Qwen, gratuit), pilotés sans les
// mains, avec le MÊME contrat de tâche que scripts/antigravity.mjs (le prompt est importé de là : une seule source).
//
// Usage :
//   node scripts/executant.mjs sonde [--moteur=gemini|qwen]                 → l'authentification tient ? (une question, une réponse)
//   node scripts/executant.mjs lancer <agent> --tache=<id> [--moteur=gemini] [--model=gemini-2.5-pro] [--duo]
//   node scripts/executant.mjs pas <agent> --tache=<id> <message…>          → un pas de plus (duo) : l'histoire est dans le fichier de prompt
//   node scripts/executant.mjs etat                                          → les lancements et leurs journaux
// Première fois (une seule, par Benj, dans un terminal) :
//   Gemini : `npx @google/gemini-cli` → « Login with Google » (gratuit) ; ou GEMINI_API_KEY=… dans .env.local (clé gratuite, aistudio.google.com)
//   Qwen   : `npx @qwen-code/qwen-code` → /auth → « Qwen OAuth » (gratuit)
// Les journaux vont dans .orchestre/travail/executant/ ; le registre « un agent, une tâche » est le même (.orchestre/agents.jsonl).
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PROMPT } from './antigravity.mjs'
// Sans conversation persistante, le duo (plans/duo-antigravity.md) se joue en pas successifs : « pas » rejoue le fichier de prompt.
const PROMPT_DUO = (agent, tache) => PROMPT(agent, tache) + '\nMode duo : fais seulement le pas 1 — lis la tâche, lance sa commande verifier UNE fois (--statique si c’est site-qa), note les lignes ÉCHEC — puis rends compte en trois lignes et arrête-toi : Claude Code dicte le pas suivant.'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCH = path.join(RACINE, '.orchestre')
const TRAVAIL = path.join(ORCH, 'travail', 'executant')
const AGENTS = path.join(ORCH, 'agents.jsonl')
const MOTEURS = {
  gemini: { paquet: '@google/gemini-cli', modele: 'gemini-2.5-pro', cle: 'GEMINI_API_KEY', auth: /auth method|GEMINI_API_KEY|login|unauthenticated|401|403/i },
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

// Lance le CLI en mode sans les mains : -p (prompt) + --yolo (outils auto-approuvés), dans le dépôt. Le prompt long vit dans un
// fichier : on ne passe à la ligne de commande qu'une phrase sans guillemets (Windows + shell:true n'aiment ni les retours
// à la ligne ni les backticks).
function executer(moteur, instruction, modele, journal, delaiMs) {
  const m = MOTEURS[moteur]
  const argv = ['-y', m.paquet, '-p', `"${instruction.replace(/"/g, '')}"`, '--yolo']
  if (modele) argv.push('-m', modele)
  return new Promise((resolve) => {
    const debut = Date.now()
    const enfant = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', argv, { cwd: RACINE, env: env(moteur), shell: true, windowsHide: true })
    let sortie = ''
    const flux = fs.createWriteStream(journal, { flags: 'a' })
    flux.write(`\n=== ${maintenant()} ${moteur}${modele ? ' ' + modele : ''} : ${instruction}\n`)
    const lire = (b) => { const s = b.toString(); sortie += s; flux.write(s); process.stdout.write(s.length > 4000 ? s.slice(0, 4000) + '…' : s) }
    enfant.stdout.on('data', lire); enfant.stderr.on('data', lire)
    const minuteur = setTimeout(() => { flux.write(`\n[délai de ${Math.round(delaiMs / 60000)} min dépassé : arrêt]\n`); enfant.kill() }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuteur); flux.end(); resolve({ code, sortie, duree: Math.round((Date.now() - debut) / 1000), auth: m.auth.test(sortie) && code !== 0 }) })
  })
}

async function sonde(moteur) {
  const journal = path.join(TRAVAIL, `sonde-${moteur}-${horodatage()}.log`)
  const r = await executer(moteur, 'Réponds uniquement le mot OK, rien d autre.', option('model', MOTEURS[moteur].modele), journal, 120_000)
  if (r.auth) { console.log(`\n✗ ${moteur} : pas authentifié. ${moteur === 'gemini' ? 'Dans un terminal : npx @google/gemini-cli → Login with Google ; ou GEMINI_API_KEY dans .env.local.' : 'Dans un terminal : npx @qwen-code/qwen-code → /auth → Qwen OAuth.'}`); return 1 }
  const ok = r.code === 0 && /\bOK\b/.test(r.sortie)
  console.log(`\n${ok ? '✓' : '?'} ${moteur} : ${ok ? 'répond' : 'sortie inattendue'} en ${r.duree} s (code ${r.code}) · journal ${path.relative(RACINE, journal)}`)
  return ok ? 0 : 1
}

async function lancer(agent, tache, moteur, modele) {
  if (!tache) { console.error('lancer <agent> --tache=<id> est obligatoire ici : sans conversation persistante, un exécutant reçoit une tâche nommée'); process.exit(2) }
  const prompt = option('duo') ? PROMPT_DUO(agent, tache) : PROMPT(agent, tache)
  const fPrompt = path.join(TRAVAIL, `${tache}.prompt.md`)
  fs.writeFileSync(fPrompt, `# Tâche ${tache} — agent ${agent} — ${maintenant()}\n\n${prompt}\n`)
  const journal = path.join(TRAVAIL, `${tache}-${horodatage()}.log`)
  fs.appendFileSync(AGENTS, JSON.stringify({ agent, tache, modele: `${moteur}:${modele || 'défaut'}`, conversationId: `executant-${path.basename(journal, '.log')}`, date: maintenant() }) + '\n')
  console.log(`✓ ${agent} → ${tache} lancé (${moteur}${modele ? ' ' + modele : ''}) · prompt ${path.relative(RACINE, fPrompt)} · journal ${path.relative(RACINE, journal)}`)
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

const moteur = option('moteur', 'gemini')
if (!MOTEURS[moteur]) { console.error(`moteur inconnu : ${moteur} (gemini | qwen)`); process.exit(2) }
switch (commande) {
  case 'sonde': process.exit(await sonde(moteur))
  case 'lancer': if (!positionnels[0]) { console.error('lancer <agent> --tache=<id> [--moteur=gemini|qwen] [--model=…] [--duo]'); process.exit(2) } await lancer(positionnels[0], option('tache'), moteur, option('model', MOTEURS[moteur].modele)); break
  case 'pas': if (positionnels.length < 2) { console.error('pas <agent> --tache=<id> <message…>'); process.exit(2) } await pas(positionnels[0], option('tache'), positionnels.slice(1).join(' '), moteur, option('model', MOTEURS[moteur].modele)); break
  case 'etat': etat(); break
  default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(4, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
}
