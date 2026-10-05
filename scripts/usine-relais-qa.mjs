#!/usr/bin/env node
// scripts/usine-relais-qa.mjs — banc d'essai du relais de fournisseur et de l'entraide de `usine.mjs tourner` (27/09/2026).
//
// Chaque cas monte une tâche JETABLE dans un dossier temporaire, comme `lancer` le fait sur l'usine (config.json, arbre/ avec
// la fiche en .orchestre/file/, le prompt, et la doublure du vérificateur en arbre/scripts/orchestre.mjs), copie la cible
// (scripts/usine.mjs) en tache/usine.mjs et lance `node usine.mjs tourner <tache>` avec :
//   PRESTI_CODEX_BIN   = scripts/fixtures/usine-relais/faux-codex.mjs   (le faux Codex : quotas, bruit, question…)
//   PRESTI_CONSEIL_BIN = scripts/fixtures/usine-relais/faux-conseil.mjs (le faux conseil.mjs : ok, plante, lent, long…)
//   HOME / USERPROFILE = un faux domicile : ~/.config/presti/freellmapi.key y porte une clé FACTICE (jamais la vraie)
// Les doublures notent chaque appel dans banc.jsonl ; le banc juge le code de sortie, le fichier `code`, etat.json,
// codex.log, conseil-<tour>.md et ces appels.
//
// Ce qu'il prouve : quota ChatGPT → Ollama Cloud (fournisseur ol, gpt-oss:120b-cloud) ; Ollama Cloud à bout → freellmapi
// (fl, gpt-oss-120b — devstral-2/mistral-large-3 n'ont pas de clé sur freellmapi —, clé passée par FL_KEY) ; un fournisseur libre inerte (aucune commande lancée) est rejoué sur le suivant ; tout épuisé → code 3 ; fiche de prospects
// → aucun relais et code 3 ; tour rouge → conseil appelé (--prive pour des prospects) et réinjecté au tour suivant ;
// PASS ou QUESTION → pas de conseil ; conseil qui plante ou dépasse 90 s → le tour continue ; conseil coupé à 4 000 signes ;
// une sortie de commande qui parle de quota n'est pas un quota ; la clé factice n'apparaît dans aucun journal.
// Contre-vérification du 27/09 : e-mail d'une personne, « Sirene », « SIRENs/SIRETs », « 0033 6 … », « +33 (0)6 … » = fiche de
// prospects (et les adresses techniques n'en font pas une) ; une ligne de quota ne compte que tout en bas de la sortie
// propre de Codex (ni plus haut, ni dans son dernier message), Codex sorti en erreur et pas tué par le délai ; la garde
// d'entrée de boucle seule arrête Ollama Cloud sur une fiche devenue « prospects » ; la borne du conseil plafonne à 90 s.
//
// Usage :
//   node scripts/usine-relais-qa.mjs                      → tous les cas sur scripts/usine.mjs (≈ 2 min : la borne de 90 s est réelle)
//   node scripts/usine-relais-qa.mjs --rapide             → borne du conseiller ramenée à 4 s (PRESTI_CONSEIL_DELAI_MS)
//   node scripts/usine-relais-qa.mjs --mutants            → puis chaque capacité retirée sur une COPIE : le banc doit rougir
//   node scripts/usine-relais-qa.mjs --cible=<fichier>    → juge un autre usine.mjs (une copie mutilée, par exemple)
//   options : --seul=cas1,cas2  --garder (laisse les dossiers temporaires)  --paralleles=4
// Code : 0 tout vert (et, avec --mutants, chaque mutant rougit) ; 1 sinon.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIX = path.join(RACINE, 'scripts', 'fixtures', 'usine-relais')
const args = process.argv.slice(2)
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : null }
const CIBLE = path.resolve(option('cible') || path.join(RACINE, 'scripts', 'usine.mjs'))
const RAPIDE = !!option('rapide')
const GARDER = !!option('garder')
const PARALLELES = Math.max(1, Number(option('paralleles')) || 4)
const SEUL = option('seul') ? option('seul').split(',').map((s) => s.trim()) : null
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'usine-relais-qa-'))

const ID = '099-banc-relais'
const CLE_FACTICE = 'cle-factice-du-banc-7f3a9c'
const BORNE_S = RAPIDE ? 4 : 90
// Les deux fournisseurs de secours, sous la forme exacte de presti-ops/veille/lancer-codex-tache.sh (lignes 11-12).
const MODELE_FL = 'gemini-3-flash-preview' // le modèle du fournisseur fl (usine.mjs, FL_MODELE pour en imposer un autre)
const OL_CONFIG = 'model_providers.ol={name="ollama",base_url="http://127.0.0.1:11434/v1",wire_api="responses"}'
const FL_CONFIG = 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}'
const TITRE = "## Conseil d'une autre IA (à vérifier, pas à suivre aveuglément)"
const MARQUEUR = 'MARQUEUR-CONSEIL-BANC'

// ── la fiche du banc ─────────────────────────────────────────────────────────────────────────────────────────
function texteFiche({ perimetre = 'scripts/banc-relais.mjs', entete = '', texte = '' } = {}) {
  return `---\nid: ${ID}\nexecutant: usine\nperimetre: [${perimetre}]\n${entete ? entete + '\n' : ''}verifier: node scripts/banc-juge.mjs\n---\n` +
    `# ${ID} — fiche du banc d'essai du relais\n\nAjouter la ligne « total » à la fin de ${perimetre}. La vue téléphone du site n'est pas concernée.\n${texte ? '\n' + texte + '\n' : ''}`
}

// ── un cas : une tâche jetable, un tourneur, ses traces ─────────────────────────────────────────────────────────
async function lancerCas(cas, cible) {
  const racine = fs.mkdtempSync(path.join(TMP, `${cas.nom}-`))
  const tache = path.join(racine, 'tache')
  const arbre = path.join(tache, 'arbre')
  const home = path.join(racine, 'home')
  // Les dossiers de l'orchestre, comme dans le vrai dépôt (tourner renomme en-cours/ → fait/, refuse/ → en-cours/).
  for (const d of ['.orchestre/file', '.orchestre/en-cours', '.orchestre/fait', '.orchestre/refuse', '.orchestre/travail/usine', 'scripts']) fs.mkdirSync(path.join(arbre, d), { recursive: true })
  fs.writeFileSync(path.join(arbre, '.orchestre', 'file', `${ID}.md`), texteFiche(cas.fiche))
  fs.writeFileSync(path.join(arbre, '.orchestre', 'travail', 'usine', `${ID}.prompt.md`), `# Prompt du banc pour ${ID}\n\nPrends la fiche et fais-la.\n`)
  fs.copyFileSync(path.join(FIX, 'faux-verificateur.mjs'), path.join(arbre, 'scripts', 'orchestre.mjs'))
  fs.copyFileSync(cible, path.join(tache, 'usine.mjs'))
  fs.writeFileSync(path.join(tache, 'config.json'), JSON.stringify({ id: ID, agent: 'usine-codex-banc', modele: 'gpt-6-sol', effort: 'medium', minutes: cas.minutes ?? 2, tours: cas.tours ?? 3, ...cas.config }))
  fs.mkdirSync(path.join(home, '.config', 'presti'), { recursive: true })
  if (cas.cle !== false) fs.writeFileSync(path.join(home, '.config', 'presti', 'freellmapi.key'), `${CLE_FACTICE}\n`)
  const journal = path.join(racine, 'banc.jsonl')
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(FL_KEY|PRESTI_|BANC_|ANTHROPIC_|DISABLE_AUTOUPDATER)/.test(k)))
  Object.assign(env, {
    HOME: home, USERPROFILE: home,
    PRESTI_CODEX_BIN: path.join(FIX, 'faux-codex.mjs'),
    PRESTI_CLAUDE_BIN: path.join(FIX, 'faux-claude.mjs'),
    PRESTI_CONSEIL_BIN: path.join(FIX, 'faux-conseil.mjs'),
    BANC_JOURNAL: journal,
    BANC_CLE_A_GUETTER: CLE_FACTICE,
    ...(RAPIDE ? { PRESTI_CONSEIL_DELAI_MS: String(BORNE_S * 1000) } : {}),
    ...cas.env,
  })
  const delai = (cas.delaiS ?? 60) * 1000
  const debut = Date.now()
  const res = await new Promise((resoudre) => {
    let sortie = ''
    const enfant = spawn(process.execPath, [path.join(tache, 'usine.mjs'), 'tourner', tache], { cwd: racine, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    enfant.stdout.on('data', (b) => { sortie += b }); enfant.stderr.on('data', (b) => { sortie += b })
    let depasse = false
    const minuteur = setTimeout(() => { depasse = true; try { enfant.kill('SIGKILL') } catch { /* mort */ } }, delai)
    enfant.on('close', (code) => { clearTimeout(minuteur); resoudre({ code: depasse ? null : code, depasse, sortie }) })
    enfant.on('error', (e) => { clearTimeout(minuteur); resoudre({ code: null, depasse: false, sortie: String(e.message) }) })
  })
  res.duree = Date.now() - debut
  const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
  res.ev = (lire(journal) || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { qui: 'illisible', l } } })
  // Un tourneur tué par le banc laisse ses enfants détachés : on les arrête par leur PID (noté par les doublures), jamais par nom.
  if (res.depasse) for (const e of res.ev) if (e.pid) { try { process.kill(e.pid) } catch { /* déjà mort */ } }
  res.codeFichier = (lire(path.join(tache, 'code')) || '').trim()
  try { res.etat = JSON.parse(lire(path.join(tache, 'etat.json'))) } catch { res.etat = null }
  res.log = lire(path.join(tache, 'codex.log')) || ''
  res.conseils = Object.fromEntries(fs.readdirSync(tache).filter((f) => /^conseil-\d+\.md$/.test(f)).map((f) => [f, lire(path.join(tache, f))]))
  res.codex = res.ev.filter((e) => e.qui === 'codex' || e.qui === 'claude') // Claude aussi : mêmes champs (fournisseur, modele, instruction, flKey)
  res.dernier = lire(path.join(tache, 'dernier-message.md'))
  res.verifs = res.ev.filter((e) => e.qui === 'verificateur')
  res.conseilAppels = res.ev.filter((e) => e.qui === 'conseil' && e.etape === 'debut')
  res.racine = racine
  res.tache = tache
  return res
}

// ── les contrôles communs ─────────────────────────────────────────────────────────────────────────────────────
const court = (s, n = 120) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t }
function fin(r, D, code, verdict) {
  if (r.depasse) { D.push(`le tourneur n'a pas fini dans le délai du banc (${Math.round(r.duree / 1000)} s)`); return }
  if (r.code !== code) D.push(`code de sortie ${r.code} (${code} attendu) — ${court(r.etat?.ligne || r.sortie, 160)}`)
  if (r.codeFichier !== String(code)) D.push(`fichier code : « ${r.codeFichier} » (${code} attendu)`)
  if (r.etat?.verdict !== verdict) D.push(`etat.json verdict ${r.etat?.verdict} (${verdict} attendu)`)
  if (!r.etat?.fin) D.push('etat.json sans heure de fin')
  if (!r.log.includes(`=== fin du tourneur : ${verdict} (code ${code})`)) D.push(`codex.log sans « fin du tourneur : ${verdict} (code ${code}) »`)
}
const fournisseurs = (r) => r.codex.map((c) => c.fournisseur).join(' → ') || '(aucun appel)'
function appels(r, D, attendus) {
  const vus = r.codex.map((c) => c.fournisseur)
  if (vus.join(',') !== attendus.join(',')) D.push(`appels de Codex : ${fournisseurs(r)} (${attendus.join(' → ')} attendu)`)
}
const aConfig = (c, x) => (c?.configs || []).includes(x)
function pasDeConseil(r, D) {
  if (r.conseilAppels.length) D.push(`conseil appelé ${r.conseilAppels.length} fois (jamais attendu ici)`)
  if (Object.keys(r.conseils).length) D.push(`fichier(s) ${Object.keys(r.conseils).join(', ')} écrit(s) (aucun attendu)`)
  if (r.codex.some((c) => c.instruction.includes(TITRE))) D.push('une instruction de Codex porte un conseil (aucun attendu)')
}
function conseilReinjecte(r, D, { tourSuivant = 2 } = {}) {
  const c = r.codex[tourSuivant - 1]
  if (!c) { D.push(`pas de tour ${tourSuivant} de Codex pour recevoir le conseil`); return }
  if (!c.instruction.includes(TITRE)) D.push(`instruction du tour ${tourSuivant} sans le titre « ${TITRE.replace(/^## /, '')} »`)
  if (!c.instruction.includes(MARQUEUR)) D.push(`instruction du tour ${tourSuivant} sans le conseil (${MARQUEUR} absent)`)
  if (r.codex[0]?.instruction.includes(TITRE)) D.push('le tour 1 portait déjà un conseil')
}
function bascule(r, D, attendues, fournisseurFinal, modeleFinal) {
  const b = r.etat?.bascules || []
  const vues = b.map((x) => `${x.de}→${x.vers}`).join(', ')
  if (vues !== attendues.join(', ')) D.push(`etat.json bascules : [${vues}] ([${attendues.join(', ')}] attendu)`)
  if (r.etat?.fournisseur !== fournisseurFinal) D.push(`etat.json fournisseur « ${r.etat?.fournisseur} » (« ${fournisseurFinal} » attendu)`)
  if (modeleFinal && r.etat?.modeleServi !== modeleFinal) D.push(`etat.json modeleServi « ${r.etat?.modeleServi} » (« ${modeleFinal} » attendu)`)
  for (const a of attendues) {
    const [de, vers] = a.split('→')
    if (!new RegExp(`bascule de fournisseur, tour \\d+ : ${de} → ${vers}\\b`).test(r.log)) D.push(`codex.log sans la bascule « ${de} → ${vers} »`)
  }
}

// ── Claude Code exécutant : les contrôles communs ───────────────────────────────────────────────────────────────
const CLAUDE = { fournisseur: 'claude' } // config.json : le départ explicite de `lancer --fournisseur=claude`
const CLE_API_FACTICE = 'sk-' + 'ant-factice-du-banc-5e1d' // dans l'environnement du tourneur : Claude ne doit PAS la recevoir (abonnement seulement)
// Les arguments de `claude -p` : jamais de contournement des permissions, aucun outil d'écriture « nu » (hors du dossier courant),
// rien d'écrit sur git, les secrets de l'usine illisibles, l'abonnement seul (ni clé d'API ni FL_KEY).
function claudeSain(r, D) {
  const c = r.codex.find((x) => x.fournisseur === 'claude')
  if (!c) { D.push('aucun appel de Claude'); return }
  const a = c.argv
  const v = (d) => a[a.indexOf(d) + 1]
  if (a[0] !== '-p' || a[1] !== c.instruction) D.push("l'instruction ne suit pas -p")
  if (v('--model') !== 'sonnet') D.push(`--model ${v('--model')} (sonnet attendu)`)
  if (v('--permission-mode') !== 'acceptEdits') D.push(`--permission-mode ${v('--permission-mode')} (acceptEdits attendu)`)
  if (v('--permission-prompts') !== 'none') D.push(`--permission-prompts ${v('--permission-prompts')} (none attendu : personne ne répond)`)
  if (!a.includes('--safe-mode')) D.push('--safe-mode absent (CLAUDE.md et hooks du dépôt chargés)')
  if (v('--output-format') !== 'stream-json' || !a.includes('--verbose')) D.push('--output-format stream-json --verbose absents (journal muet)')
  if (a.some((x) => /^--(?:allow-)?dangerously/.test(x)) || /bypassPermissions/.test(v('--permission-mode') || '')) D.push('contournement des permissions (--dangerously-skip-permissions / bypassPermissions)')
  for (const o of ['Bash(node:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(npx tsc:*)', 'Bash(npx tsx:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(cp:*)', 'Bash(mv:*)', 'Bash(rm:*)', 'Bash(mkdir:*)', 'Bash(sha256sum:*)', 'Bash(grep:*)', 'Bash(sed:*)', 'Bash(awk:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)', 'Bash(diff:*)', 'Bash(sort:*)', 'Bash(find:*)', 'Bash(date:*)', 'Bash(echo:*)', 'Bash(bash:*)', 'Bash(timeout:*)']) if (!c.autorises.includes(o)) D.push(`outil ${o} absent de --allowedTools`)
  for (const o of c.autorises) {
    if (/^(?:Read|Edit|Write|MultiEdit|NotebookEdit)\b/.test(o)) D.push(`outil « nu » ${o} autorisé : il écrit ou lit hors du dossier courant (acceptEdits suffit dans l'arbre)`)
    if (/^Bash\(git (?:push|commit|reset|clean|checkout|restore|stash|rebase|merge)\b/.test(o) || o === 'Bash(git:*)') D.push(`écriture git autorisée : ${o}`)
  }
  for (const o of ['Bash(git push:*)', 'Bash(git commit:*)', 'Bash(git reset:*)']) if (!c.interdits.includes(o)) D.push(`${o} absent de --disallowedTools`)
  for (const d of ['.claude', '.codex', '.config/presti', '.ssh']) if (!c.interdits.some((x) => x.startsWith('Read(//') && x.includes(`/${d}/`))) D.push(`lecture de ~/${d} non interdite (--disallowedTools)`)
  if (path.resolve(c.cwd).toLowerCase() !== path.resolve(r.tache, 'arbre').toLowerCase()) D.push(`Claude lancé dans ${c.cwd} (l'arbre jetable ${path.join(r.tache, 'arbre')} attendu)`)
  if (c.cleApi !== null) D.push("ANTHROPIC_API_KEY passée à Claude (l'abonnement seul, jamais facturé au jeton)")
  if (c.jetonAnthropic !== null) D.push('ANTHROPIC_AUTH_TOKEN passé à Claude')
  if (c.flKey !== null) D.push('FL_KEY (clé freellmapi) passée à Claude')
  if (c.autoMaj !== '1') D.push('DISABLE_AUTOUPDATER=1 absent : Claude pourrait se mettre à jour en plein tour')
}
// Quota de l'abonnement Claude épuisé : code 3, un seul appel, aucun relais (ni gratuit ni autre), le vérificateur n'est pas lancé.
function claudeQuota(r, D) {
  fin(r, D, 3, 'QUOTA'); appels(r, D, ['claude']); bascule(r, D, [], 'claude', 'sonnet')
  if (!/quota de l'abonnement Claude épuisé/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« quota de l'abonnement Claude épuisé » attendu)`)
  if (!/aucun relais depuis Claude/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » ne dit pas qu'aucun relais ne part de Claude`)
  if (r.verifs.length) D.push(`vérificateur lancé ${r.verifs.length} fois alors que Claude n'a pas travaillé`)
}

// ── les cas ───────────────────────────────────────────────────────────────────────────────────────────────────
const PROSPECTS = [
  ['prospect-entete', { entete: 'donnees: prospects' }],
  ['prospect-mot', { texte: 'Page de suivi de la prospection des couvreurs.' }],
  ['prospect-siren', { texte: 'Croiser les entreprises par SIREN.' }],
  ['prospect-demarchage', { texte: 'Importer la liste de démarchage des plombiers.' }],
  ['prospect-telephone', { texte: 'Garder les téléphones des gérants dans la table.' }],
  ['prospect-numero', { texte: 'Rappeler Mme Exemple au 06 12 34 56 78 avant vendredi.' }],
  // Contre-vérification du 27/09 : ces quatre formes passaient (servies par Ollama Cloud puis freellmapi).
  ['prospect-email', { texte: 'Relancer jean.dupont@orange.fr avant vendredi.' }],
  ['prospect-sirene', { texte: "Importer les artisans depuis l'API Sirene de l'INSEE." }],
  ['prospect-sirens', { texte: 'Croiser la liste des SIRENs importés.' }],
  ['prospect-sirets', { texte: 'Dédoublonner les SIRETs.' }],
  ['prospect-0033', { texte: 'Rappeler le gérant au 0033 6 12 34 56 78.' }],
  ['prospect-plus33', { texte: "Joindre l'artisan au +33 (0)6 12 34 56 78." }],
]
// La ligne de quota telle que Codex l'écrit (codex.log de 026-105), et celle d'Ollama Cloud / freellmapi.
const LIGNE_QUOTA_CHATGPT = 'ERROR: You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 4:13 PM.'
const LIGNE_429 = 'ERROR: exceeded retry limit, last status: 429 Too Many Requests, request id: recopie'
// Aucune bascule, un seul fournisseur servi jusqu'au PASS.
const sansBascule = (r, D, attendus, fournisseurFinal) => { fin(r, D, 0, 'PASS'); appels(r, D, attendus); bascule(r, D, attendus.length > 1 ? ['chatgpt→ol'] : [], fournisseurFinal) }
const CAS = [
  {
    nom: 'quota-ol', env: { BANC_EPUISES: 'chatgpt', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol'])
      const [c1, c2] = r.codex
      if (c1 && c1.modele !== 'gpt-6-sol') D.push(`1er appel sur -m ${c1.modele} (gpt-6-sol attendu, celui de config.json)`)
      if (c2 && !(aConfig(c2, OL_CONFIG) && aConfig(c2, 'model_provider=ol'))) D.push(`appel Ollama Cloud sans « -c ${OL_CONFIG} -c model_provider=ol » (vu : ${court(c2.configs.join(' | '), 200)})`)
      if (c2 && c2.modele !== 'gpt-oss:120b-cloud') D.push(`Ollama Cloud sur -m ${c2.modele} (gpt-oss:120b-cloud attendu)`)
      if (c2 && c2.flKey !== null) D.push('la clé freellmapi (FL_KEY) passée à Ollama Cloud')
      if (c2 && !/Reprise sur un autre modele/.test(c2.instruction)) D.push('le tour rejoué sur Ollama Cloud ne dit pas qu\'il reprend après un quota')
      bascule(r, D, ['chatgpt→ol'], 'ol', 'gpt-oss:120b-cloud')
      if (r.etat?.prospects) D.push(`fiche prise pour une fiche de prospects (${r.etat.prospects}) : « la vue téléphone du site » n'en est pas une`)
      pasDeConseil(r, D)
    },
  },
  {
    nom: 'ol-fl-code', env: { BANC_EPUISES: 'chatgpt,ol', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol', 'fl'])
      const c3 = r.codex[2]
      if (c3 && !(aConfig(c3, FL_CONFIG) && aConfig(c3, 'model_provider=fl'))) D.push(`appel freellmapi sans « -c ${FL_CONFIG} -c model_provider=fl »`)
      if (c3 && c3.modele !== MODELE_FL) D.push(`freellmapi sur -m ${c3.modele} pour une fiche de code (${MODELE_FL} attendu)`)
      if (c3 && c3.flKey !== CLE_FACTICE) D.push(`freellmapi lancé sans la clé de ~/.config/presti/freellmapi.key dans FL_KEY (vu : ${c3.flKey === null ? 'absente' : 'autre valeur'})`)
      bascule(r, D, ['chatgpt→ol', 'ol→fl'], 'fl', MODELE_FL)
    },
  },
  {
    nom: 'ol-fl-texte', fiche: { perimetre: 'docs/banc-relais.md' }, env: { BANC_EPUISES: 'chatgpt,ol', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol', 'fl'])
      if (r.codex[2] && r.codex[2].modele !== MODELE_FL) D.push(`freellmapi sur -m ${r.codex[2].modele} pour une fiche sans code (${MODELE_FL} attendu)`)
      bascule(r, D, ['chatgpt→ol', 'ol→fl'], 'fl', MODELE_FL)
    },
  },
  {
    // 29/09 : Ollama Cloud écrit l'appel d'outil en texte (code 0, aucune commande) : le tour est rejoué sur freellmapi.
    nom: 'ol-inerte', env: { BANC_EPUISES: 'chatgpt', BANC_INERTE: 'ol', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol', 'fl'])
      bascule(r, D, ['chatgpt→ol', 'ol→fl'], 'fl', MODELE_FL)
      if (!/inerte/.test(r.log)) D.push('codex.log sans « inerte » : la bascule ne dit pas pourquoi')
    },
  },
  {
    // 29/09 : le seul NOM d'un script « prospection » (026-091) ne fait pas une fiche de prospects ; un .md, lui, en fait une.
    nom: 'nom-de-script', fiche: { perimetre: 'scripts/prospection-sql-qa.mjs, scripts/juges-026-preuve.mjs' }, env: { BANC_EPUISES: 'chatgpt', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol'); if (r.etat?.prospects) D.push(`fiche prise pour une fiche de prospects (${r.etat.prospects}) : un nom de script n'est pas une donnée`) },
  },
  {
    nom: 'tout-epuise', env: { BANC_EPUISES: 'chatgpt,ol,fl,fm', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['chatgpt', 'ol', 'fl', 'fm'])
      if (!/tous les fournisseurs épuisés/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« tous les fournisseurs épuisés » attendu)`)
      if (r.verifs.length) D.push(`vérificateur lancé ${r.verifs.length} fois alors qu'aucun fournisseur n'a travaillé`)
      bascule(r, D, ['chatgpt→ol', 'ol→fl', 'fl→fm'], 'fm')
    },
  },
  {
    nom: 'fl-sans-cle', cle: false, env: { BANC_EPUISES: 'chatgpt,ol', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['chatgpt', 'ol'])
      if (!/freellmapi sauté : clé absente/.test(r.log)) D.push('codex.log ne dit pas que freellmapi est sauté faute de clé')
    },
  },
  ...PROSPECTS.map(([nom, fiche]) => ({
    nom, fiche, env: { BANC_EPUISES: 'chatgpt,ol', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['chatgpt'])
      if (r.codex.some((c) => c.fournisseur !== 'chatgpt')) D.push('une fiche de prospects servie par une IA gratuite ou :cloud')
      if (!r.etat?.prospects) D.push('etat.json prospects vide : la fiche de prospects n\'a pas été reconnue')
      if (r.etat?.fournisseur !== 'chatgpt' || (r.etat?.bascules || []).length) D.push(`etat.json fournisseur ${r.etat?.fournisseur}, ${(r.etat?.bascules || []).length} bascule(s) : aucune attendue`)
      if (!/prospects/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » ne dit pas que la fiche touche des prospects`)
    },
  })),
  {
    // La fiche ne parle pas de prospects au départ ; Codex y ajoute une colonne SIREN au tour 1 ; le tour 2 tombe sur un quota.
    nom: 'prospect-en-route', env: { BANC_EPUISES: 'chatgpt@2', BANC_ECRIT_PROSPECT: '1', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['chatgpt', 'chatgpt'])
      if (!r.etat?.prospects) D.push('etat.json prospects vide : la fiche devenue « prospects » en cours de route n\'a pas été relue')
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour 1 rouge')
      else {
        if (!c.prive) D.push('conseil public (sans --prive) pour une fiche devenue « prospects »')
        if (c.flKey !== null) D.push('clé freellmapi passée au conseil privé')
      }
    },
  },
  {
    nom: 'fail-conseil', env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      if (r.conseilAppels.length !== 1) D.push(`conseil appelé ${r.conseilAppels.length} fois (1 attendu : après le seul tour rouge)`)
      const c = r.conseilAppels[0]
      if (c) {
        for (const a of ['verdict', 'journal', 'consigne']) if (!c.argv.some((x) => x.startsWith(`--${a}=`))) D.push(`conseil lancé sans --${a}=`)
        if (c.prive) D.push('conseil en --prive pour une fiche sans prospects')
        if (!/FAIL — critère BANC-2/.test(c.verdictLu || '')) D.push(`--verdict ne contient pas la sortie du vérificateur (lu : « ${court(c.verdictLu, 80)} »)`)
        if (!(c.journalSignes > 0) || !/codex/.test(c.journalDebut || '') ) D.push(`--journal ne contient pas la fin de codex.log (${c.journalSignes} signes)`)
        if (!c.consigneExiste || !String(c.consigne).endsWith(`${ID}.md`)) D.push(`--consigne ne désigne pas la fiche (${c.consigne})`)
        if (c.flKey !== CLE_FACTICE) D.push('conseil public lancé sans FL_KEY (freellmapi ne répondrait pas)')
        const v1 = r.verifs[0]; const c2 = r.codex[1]
        if (v1 && c.t < v1.t) D.push('conseil lancé avant le vérificateur')
        if (c2 && c.t > c2.t) D.push('conseil lancé après le tour suivant')
      }
      const f = r.conseils['conseil-1.md']
      if (!f) D.push('conseil-1.md absent du dossier de la tâche')
      else if (!f.includes(MARQUEUR)) D.push('conseil-1.md sans la réponse du conseiller')
      conseilReinjecte(r, D)
      if ((r.etat?.conseils || []).map((x) => x.tour).join(',') !== '1') D.push(`etat.json conseils [${(r.etat?.conseils || []).map((x) => x.tour)}] ([1] attendu)`)
      if (!/conseil d'une autre IA, tour 1/.test(r.log)) D.push('codex.log ne note pas le conseil du tour 1')
    },
  },
  {
    nom: 'fail-conseil-prive', fiche: { entete: 'donnees: prospects' }, env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour rouge')
      else {
        if (!c.argv.includes('--prive')) D.push('conseil sans --prive pour une fiche de prospects')
        if (c.flKey !== null) D.push('clé freellmapi passée au conseil d\'une fiche de prospects')
      }
      conseilReinjecte(r, D)
    },
  },
  {
    nom: 'pass-sans-conseil', env: { BANC_VERDICTS: 'PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) { fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt']); pasDeConseil(r, D); if (r.verifs.length !== 2) D.push(`${r.verifs.length} appel(s) du vérificateur (2 attendus : en-cours puis fait)`) },
  },
  {
    nom: 'question-sans-conseil', env: { BANC_QUESTION: '1', BANC_VERDICTS: 'FAIL', BANC_CONSEIL: 'ok' },
    juger(r, D) { fin(r, D, 7, 'QUESTION'); pasDeConseil(r, D) },
  },
  {
    // 29/09 : un modèle LIBRE qui pose une question de complaisance est renvoyé au travail (2 fois au plus), ChatGPT garde sa question.
    nom: 'question-libre-ecartee', env: { BANC_EPUISES: 'chatgpt', BANC_QUESTION_UNE_FOIS: '1', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol', 'ol'])
      if (!/question écartée \(voie libre, 1\/2/.test(r.log)) D.push('codex.log sans « question écartée (voie libre, 1/2 »')
      if (r.codex[2] && !/Ne pose plus de question/.test(r.codex[2].instruction)) D.push('le tour suivant ne dit pas au modèle libre de décider seul')
    },
  },
  {
    nom: 'question-libre-persistante', tours: 3, env: { BANC_EPUISES: 'chatgpt', BANC_QUESTION: '1', BANC_VERDICTS: 'FAIL' },
    juger(r, D) { fin(r, D, 7, 'QUESTION'); appels(r, D, ['chatgpt', 'ol', 'ol', 'ol']) },
  },
  {
    nom: 'non-prise', env: { BANC_NE_PREND_PAS: '1', BANC_VERDICTS: 'FAIL', BANC_CONSEIL: 'ok' },
    juger(r, D) { fin(r, D, 4, 'NON_PRISE'); pasDeConseil(r, D) },
  },
  {
    nom: 'fail-final', tours: 1, env: { BANC_VERDICTS: 'FAIL', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 1, 'FAIL'); appels(r, D, ['chatgpt'])
      if (r.conseilAppels.length !== 1) D.push(`conseil appelé ${r.conseilAppels.length} fois après le dernier tour rouge (1 attendu)`)
      if (!r.conseils['conseil-1.md']) D.push('conseil-1.md absent après le dernier tour rouge')
    },
  },
  {
    nom: 'conseil-plante', env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'plante' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      if (r.conseilAppels.length !== 1) D.push(`conseil appelé ${r.conseilAppels.length} fois (1 attendu)`)
      if (Object.keys(r.conseils).length) D.push('un conseil-<tour>.md écrit alors que le conseiller a planté')
      if (r.codex[1]?.instruction.includes(TITRE)) D.push('un conseil injecté alors que le conseiller a planté')
      if (!/conseil du tour 1 : aucun \(code 1/.test(r.log)) D.push('codex.log ne dit pas que le conseil du tour 1 a échoué (code 1)')
    },
  },
  {
    nom: 'conseil-aucune', env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'aucune' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      if (Object.keys(r.conseils).length || r.codex[1]?.instruction.includes(TITRE)) D.push('« aucune IA relectrice disponible » pris pour un conseil')
    },
  },
  {
    nom: 'conseil-lent', delaiS: BORNE_S + 60, env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'lent' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      const c = r.conseilAppels[0]
      if (!c) { D.push('conseil jamais appelé'); return }
      if (r.ev.some((e) => e.etape === 'fini-malgre-la-borne')) D.push('le conseiller lent est allé au bout (pas tué)')
      let vivant = false
      try { process.kill(c.pid, 0); vivant = true } catch { /* mort : attendu */ }
      if (vivant) D.push(`le conseiller lent (pid ${c.pid}) vit encore après la fin du tourneur`)
      const c2 = r.codex[1]
      if (c2) {
        const ecart = (c2.t - c.t) / 1000
        if (ecart < BORNE_S - 2 || ecart > BORNE_S + 12) D.push(`le tour suivant est parti ${ecart.toFixed(1)} s après le début du conseil (borne de ${BORNE_S} s attendue)`)
      }
      if (!new RegExp(`délai de ${BORNE_S} s dépassé`).test(r.log)) D.push(`codex.log ne dit pas « délai de ${BORNE_S} s dépassé »`)
      if (Object.keys(r.conseils).length || c2?.instruction.includes(TITRE)) D.push('un conseil gardé alors que le conseiller a dépassé la borne')
    },
  },
  {
    nom: 'conseil-long', env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'long' },
    juger(r, D) {
      fin(r, D, 0, 'PASS')
      const f = r.conseils['conseil-1.md']
      if (!f) { D.push('conseil-1.md absent'); return }
      const corps = f.replace(/^# [^\n]*\n\n/, '').trim()
      if ([...corps].length > 4000) D.push(`conseil-1.md : ${[...corps].length} signes (4 000 au plus)`)
      if (f.includes('FIN-JAMAIS-VUE')) D.push('la fin d\'un conseil de 10 000 signes a été gardée')
      const i = r.codex[1]?.instruction.indexOf(TITRE)
      if (i >= 0) { const injecte = r.codex[1].instruction.slice(i + TITRE.length).trim(); if ([...injecte].length > 4000) D.push(`conseil injecté de ${[...injecte].length} signes (4 000 au plus)`) } else D.push('conseil long non injecté')
      if (r.etat?.conseils?.[0]?.signes !== 4000) D.push(`etat.json conseils[0].signes = ${r.etat?.conseils?.[0]?.signes} (4000 attendu)`)
    },
  },
  {
    // Codex recopie des sorties de commande qui parlent de 429, d'Unauthorized, de usage limit : ce ne sont pas des quotas.
    nom: 'bruit-ol', env: { BANC_EPUISES: 'chatgpt', BANC_BRUIT: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol']); bascule(r, D, ['chatgpt→ol'], 'ol') },
  },
  {
    // Codex servi par freellmapi affiche FL_KEY (un `env`) : la clé est dans codex.log, mais pas dans ce qui part au conseiller.
    nom: 'cle-masquee', cleDansLog: true, env: { BANC_EPUISES: 'chatgpt,ol', BANC_FUITE: '1', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'ol', 'fl', 'fl'])
      if (!r.log.includes(CLE_FACTICE)) D.push("la doublure n'a pas mis la clé dans codex.log : le cas ne prouve rien")
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour rouge')
      else {
        if (c.cleVue) D.push('la clé freellmapi part chez le conseiller (verdict ou fin de codex.log)')
        if (!c.journalMasque) D.push('la fin de codex.log transmise ne porte pas « [clé freellmapi retirée] »')
      }
    },
  },
  {
    nom: 'bruit-chatgpt', env: { BANC_BRUIT: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt']); bascule(r, D, [], 'chatgpt') },
  },
  // ── contre-vérification du 27/09 ──
  {
    // Une fiche de prospects par la seule adresse e-mail d'une personne : le conseil reste privé (Qwen3 local), sans FL_KEY.
    nom: 'prospect-email-conseil', fiche: { texte: 'Relancer jean.dupont@orange.fr avant vendredi.' }, env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour rouge')
      else {
        if (!c.prive) D.push("conseil PUBLIC (freellmapi) pour une fiche portant l'e-mail d'une personne")
        if (c.flKey !== null) D.push("clé freellmapi passée au conseil d'une fiche de prospects")
      }
    },
  },
  {
    // Des adresses qui ne désignent personne (Presti, test, IP, version, git, noreply, image @2x) : pas une fiche de prospects.
    nom: 'adresses-techniques',
    fiche: { texte: 'Écrire depuis contact@prestiapp.fr ; comptes eleve@presti-test.invalid ; ssh usine@88.96.53.3 ; npx codex@0.156.1 ; git@github.com:benj/presti.git ; noreply@anthropic.com ; logo@2x.png.' },
    env: { BANC_EPUISES: 'chatgpt', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol'); if (r.etat?.prospects) D.push(`fiche prise pour une fiche de prospects (${r.etat.prospects}) : aucune de ces adresses n'est celle d'une personne`) },
  },
  {
    // Garde d'entrée de boucle : la fiche devient « prospects » pendant un tour servi par Ollama Cloud ; au tour suivant,
    // Ollama Cloud ne doit plus la servir (code 3), et le conseil entre les deux est privé.
    nom: 'prospect-apres-bascule', env: { BANC_EPUISES: 'chatgpt', BANC_ECRIT_PROSPECT: '1', BANC_ECRIT_PROSPECT_PAR: 'ol', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['chatgpt', 'ol'])
      if (r.codex.filter((c) => c.fournisseur === 'ol').length > 1) D.push('Ollama Cloud rappelé sur une fiche devenue « prospects »')
      if (!/relais arrêté : la fiche touche des données de prospects/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« relais arrêté : … prospects » attendu)`)
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour 1 rouge')
      else if (!c.prive || c.flKey !== null) D.push('conseil public (ou avec FL_KEY) alors que la fiche est devenue « prospects »')
    },
  },
  {
    // Une ligne de quota ChatGPT recopiée TOUT EN BAS (cat d'un vieux codex.log), Codex sorti en 0 : pas un quota.
    nom: 'quota-cite-fin-code0', env: { BANC_LIGNES_FIN: `${LIGNE_QUOTA_CHATGPT}|||${LIGNE_QUOTA_CHATGPT}`, BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt'], 'chatgpt') },
  },
  {
    // Même chose sur Ollama Cloud : une ligne « ERROR: … 429 » recopiée tout en bas, Codex sorti en 0 → pas de bascule ol → fl.
    nom: 'ol-cite-fin-code0', env: { BANC_EPUISES: 'chatgpt', BANC_LIGNES_FIN: LIGNE_429, BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol') },
  },
  {
    // Une ligne de quota ChatGPT en colonne 0 PLUS HAUT dans la sortie, Codex sorti en 1 : seule la fin de sa sortie compte.
    nom: 'quota-cite-milieu-code1', env: { BANC_LIGNES: LIGNE_QUOTA_CHATGPT, BANC_CODE_chatgpt: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt'], 'chatgpt') },
  },
  {
    // Ollama Cloud sort en 1 après avoir recopié (plus haut) une ligne « ERROR: … 429 » en colonne 0 : pas de bascule ol → fl.
    nom: 'ol-cat-log-code1', env: { BANC_EPUISES: 'chatgpt', BANC_LIGNES: LIGNE_429, BANC_CODE_ol: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol') },
  },
  {
    // Le bruit (429, Unauthorized, usage limit) plus haut, Ollama Cloud sorti en 1 : toute ligne ne vaut pas ligne d'erreur.
    nom: 'bruit-ol-code1', env: { BANC_EPUISES: 'chatgpt', BANC_BRUIT: '1', BANC_CODE_ol: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol') },
  },
  {
    // Le bruit TOUT EN BAS (« error: expected 429 », indenté « error: 'Unauthorized' … 429 »), sorti en 1 : ni minuscule
    // ni indenté ne vaut « ERROR: » en colonne 0.
    nom: 'bruit-fin-ol-code1', env: { BANC_EPUISES: 'chatgpt', BANC_BRUIT: 'fin', BANC_CODE_ol: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt', 'ol'], 'ol') },
  },
  {
    // Le dernier message (rédigé par le modèle) finit par la ligne de quota ; Codex le réimprime à la fin et sort en 1.
    nom: 'quota-dans-dernier-message', env: { BANC_DERNIER: LIGNE_QUOTA_CHATGPT, BANC_CODE_chatgpt: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { sansBascule(r, D, ['chatgpt'], 'chatgpt') },
  },
  {
    // Ollama Cloud tué par le délai du tourneur (6 s) juste après une ligne « ERROR: … 429 » recopiée : pas un quota.
    nom: 'ol-tue-delai', minutes: 0.1, env: { BANC_EPUISES: 'chatgpt', BANC_LIGNES_FIN: LIGNE_429, BANC_DORT_ol: '60', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      sansBascule(r, D, ['chatgpt', 'ol'], 'ol')
      if (!/délai de 0\.1 min dépassé/.test(r.log)) D.push("codex.log ne dit pas que Codex a été arrêté au délai : le cas ne prouve rien")
    },
  },
  {
    // PRESTI_CONSEIL_DELAI_MS au-dessus de 90 000 : la borne reste 90 s (il peut la raccourcir, jamais l'allonger).
    nom: 'conseil-borne-plafond', delaiS: 90 + 60, env: { PRESTI_CONSEIL_DELAI_MS: '600000', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'lent' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['chatgpt', 'chatgpt'])
      const c = r.conseilAppels[0]; const c2 = r.codex[1]
      if (!c) { D.push('conseil jamais appelé'); return }
      if (c2) { const ecart = (c2.t - c.t) / 1000; if (ecart < 88 || ecart > 102) D.push(`le tour suivant est parti ${ecart.toFixed(1)} s après le début du conseil (borne de 90 s attendue)`) }
      if (!/délai de 90 s dépassé/.test(r.log)) D.push('codex.log ne dit pas « délai de 90 s dépassé »')
    },
  },
  // ── Claude Code exécutant (05/10/2026, quota ChatGPT épuisé jusqu'au 9/10) : usine.mjs lancer --fournisseur=claude ──
  // Départ explicite sur Claude (config.json « fournisseur: claude »), aucun relais ; un abonnement PAYANT : une fiche de prospects
  // part chez lui (contrairement à ol/fl/fm). La doublure (faux-claude.mjs) émet le flux stream-json réel de `claude -p`.
  {
    nom: 'claude-pass', config: CLAUDE, env: { BANC_VERDICTS: 'PASS', ANTHROPIC_API_KEY: CLE_API_FACTICE },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['claude']); bascule(r, D, [], 'claude', 'sonnet'); claudeSain(r, D); pasDeConseil(r, D)
      if (r.etat?.prospects) D.push(`fiche prise pour une fiche de prospects (${r.etat.prospects})`)
      if (r.verifs.length !== 2) D.push(`${r.verifs.length} appel(s) du vérificateur (2 attendus : en-cours puis fait)`)
      for (const [motif, dit] of [[/départ sur abonnement Claude/, 'le départ sur Claude (sans relais)'], [/claude sonnet par abonnement Claude/, "l'en-tête du tour de Claude"], [/exec\nsed -n 1,5p banc-travail\.txt/, 'la commande Bash lancée par Claude'], [/↳ refusé ou en erreur : Permission to use Bash has been denied/, 'la commande refusée par les permissions'], [/résultat : success, 3 tour\(s\)/, 'le résultat final'], [/dernier message de Claude/, 'le dernier message']]) if (!motif.test(r.log)) D.push(`codex.log ne montre pas ${dit}`)
      if (!new RegExp(`${ID} : PRÊT`).test(r.dernier || '')) D.push(`dernier-message.md sans « ${ID} : PRÊT » (lu : « ${court(r.dernier, 80)} »)`)
    },
  },
  {
    nom: 'claude-quota', config: CLAUDE, env: { BANC_CLAUDE: 'quota', BANC_VERDICTS: 'PASS' },
    juger(r, D) { claudeQuota(r, D) },
  },
  {
    // Seul le texte du résultat dit la limite (aucun rate_limit_event « rejected »).
    nom: 'claude-quota-texte', config: CLAUDE, env: { BANC_CLAUDE: 'quota-texte', BANC_VERDICTS: 'PASS' },
    juger(r, D) { claudeQuota(r, D) },
  },
  {
    // Pas de résultat : les dernières lignes de sa sortie d'erreur disent « usage limit reached » (forme historique).
    nom: 'claude-quota-sans-resultat', config: CLAUDE, env: { BANC_CLAUDE: 'sans-resultat', BANC_CLAUDE_STDERR: 'Claude AI usage limit reached|1791201600', BANC_VERDICTS: 'PASS' },
    juger(r, D) { claudeQuota(r, D) },
  },
  {
    nom: 'claude-quota-prospects', config: CLAUDE, fiche: { entete: 'donnees: prospects' }, env: { BANC_CLAUDE: 'quota', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      claudeQuota(r, D)
      if (!r.etat?.prospects) D.push("etat.json prospects vide : la fiche de prospects n'a pas été reconnue")
      if (/pas de relais : la fiche touche/.test(r.etat?.ligne || '')) D.push('le refus de relais « prospects » masque le vrai motif (aucun relais depuis Claude)')
    },
  },
  {
    nom: 'claude-auth', config: CLAUDE, env: { BANC_CLAUDE: 'auth', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 6, 'AUTH'); appels(r, D, ['claude'])
      if (!/claude n'est pas connecté sur l'usine/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« claude n'est pas connecté sur l'usine » attendu)`)
      if (r.verifs.length) D.push("vérificateur lancé alors que Claude n'est pas connecté")
    },
  },
  {
    // Les vraies questions de Claude restent des QUESTION (code 7) : jamais écartées comme celles des modèles libres.
    nom: 'claude-question', config: CLAUDE, env: { BANC_QUESTION: '1', BANC_VERDICTS: 'FAIL', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 7, 'QUESTION'); appels(r, D, ['claude']); pasDeConseil(r, D)
      if (!/Claude a posé une question/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« Claude a posé une question » attendu)`)
      if (/question écartée/.test(r.log)) D.push("une question de Claude écartée comme celle d'un modèle libre")
    },
  },
  {
    // Une fiche de prospects PART chez Claude (abonnement payant) ; l'entraide, elle, reste privée (Qwen3 local, sans FL_KEY).
    nom: 'claude-prospects', config: CLAUDE, fiche: { entete: 'donnees: prospects' }, env: { BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['claude', 'claude']); bascule(r, D, [], 'claude', 'sonnet')
      if (!r.etat?.prospects) D.push("etat.json prospects vide : la fiche de prospects n'a pas été reconnue")
      const c = r.conseilAppels[0]
      if (!c) D.push('pas de conseil après le tour rouge')
      else if (!c.argv.includes('--prive') || c.flKey !== null) D.push('conseil public (ou avec FL_KEY) pour une fiche de prospects servie par Claude')
    },
  },
  {
    nom: 'claude-prospect-en-route', config: CLAUDE, env: { BANC_ECRIT_PROSPECT: '1', BANC_VERDICTS: 'FAIL,PASS', BANC_CONSEIL: 'ok' },
    juger(r, D) {
      fin(r, D, 0, 'PASS'); appels(r, D, ['claude', 'claude'])
      if (!r.etat?.prospects) D.push("etat.json prospects vide : la fiche devenue « prospects » en cours de route n'a pas été relue")
      if (r.conseilAppels[0] && !r.conseilAppels[0].prive) D.push('conseil public pour une fiche devenue « prospects »')
    },
  },
  {
    // Le message final parle de quota, Claude sort en 0 : ce n'est pas un quota.
    nom: 'claude-cite-code0', config: CLAUDE, env: { BANC_CLAUDE_CITE: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { fin(r, D, 0, 'PASS'); appels(r, D, ['claude']); bascule(r, D, [], 'claude') },
  },
  {
    // Panne d'API ordinaire (code 1, « API Error: 500 ») après avoir cité un quota : ni quota ni connexion perdue.
    nom: 'claude-cite-code1', config: CLAUDE, env: { BANC_CLAUDE_CITE_CODE1: '1', BANC_VERDICTS: 'PASS' },
    juger(r, D) { fin(r, D, 0, 'PASS'); appels(r, D, ['claude']); bascule(r, D, [], 'claude') },
  },
  {
    // Sans résultat, une sortie d'erreur ordinaire n'est ni un quota ni une connexion perdue : la fiche n'est pas prise (4).
    nom: 'claude-sans-resultat-bruit', config: CLAUDE, env: { BANC_CLAUDE: 'sans-resultat', BANC_CLAUDE_STDERR: 'claude: erreur inattendue (EPIPE)', BANC_VERDICTS: 'PASS' },
    juger(r, D) { fin(r, D, 4, 'NON_PRISE'); appels(r, D, ['claude']); bascule(r, D, [], 'claude') },
  },
  {
    // Claude tué par le délai du tourneur (6 s) juste après avoir écrit sa limite : pas un quota.
    nom: 'claude-tue-delai', config: CLAUDE, minutes: 0.1, env: { BANC_CLAUDE: 'quota', BANC_DORT_claude: '60', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 4, 'NON_PRISE'); appels(r, D, ['claude'])
      if (!/délai de 0\.1 min dépassé/.test(r.log)) D.push("codex.log ne dit pas que Claude a été arrêté au délai : le cas ne prouve rien")
    },
  },
  {
    // Aucun relais ne MÈNE à Claude : départ sur Ollama Cloud, tout à bout → code 3, et Claude n'est jamais appelé.
    nom: 'relais-jamais-claude', config: { fournisseur: 'ol' }, env: { BANC_EPUISES: 'ol,fl,fm', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA'); appels(r, D, ['ol', 'fl', 'fm'])
      if (r.codex.some((c) => c.fournisseur === 'claude')) D.push('un relais a mené à Claude')
      if (!/tous les fournisseurs épuisés/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« tous les fournisseurs épuisés » attendu)`)
      if (/Claude/.test(r.etat?.ligne || '')) D.push('la liste des fournisseurs épuisés nomme Claude (hors relais)')
    },
  },
  {
    // Même chose depuis ChatGPT : tout est épuisé, jamais de Claude.
    nom: 'chatgpt-jamais-claude', env: { BANC_EPUISES: 'chatgpt,ol,fl,fm', BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA')
      if (r.codex.some((c) => c.fournisseur === 'claude')) D.push('un relais a mené à Claude')
    },
  },
  {
    // La règle des prospects reste entière pour les IA gratuites : départ explicite sur ol avec une fiche de prospects → refus (3).
    nom: 'ol-prospects-reste-refuse', config: { fournisseur: 'ol' }, fiche: { entete: 'donnees: prospects' }, env: { BANC_VERDICTS: 'PASS' },
    juger(r, D) {
      fin(r, D, 3, 'QUOTA')
      if (r.codex.length) D.push('une fiche de prospects servie par une IA gratuite ou :cloud')
      if (!/voie libre refusée : la fiche touche des données de prospects/.test(r.etat?.ligne || '')) D.push(`etat.json ligne « ${court(r.etat?.ligne)} » (« voie libre refusée … prospects » attendu)`)
    },
  },
]

// ── les mutants : chaque capacité retirée sur une COPIE de la cible ; le banc doit rougir ────────────────────────────
const MUTANTS = [
  { nom: 'relais retiré', cas: ['quota-ol', 'ol-fl-code'], r: [["if (!basculer(tour, epuise)) finir(3,", 'if (true) finir(3,']] },
  { nom: 'pas de passage Ollama Cloud → freellmapi', cas: ['ol-fl-code'], r: [['if (j >= FOURNISSEURS.length) return null', 'if (j >= 2) return null']] },
  { nom: 'épuisement total non vu (pas de code 3)', cas: ['tout-epuise'], r: [['if (!epuise) break', 'if (!epuise || iFournisseur === FOURNISSEURS.length - 2) break']] },
  { nom: 'fournisseur servi absent de etat.json', cas: ['quota-ol'], r: [['poser({ fournisseur: vers.nom, modeleServi: modele })', 'poser({ modeleServi: modele })']] },
  { nom: 'bascule absente de codex.log', cas: ['quota-ol'], r: [['noter(`=== ${maintenant()} bascule de fournisseur', 'void (`=== ${maintenant()} bascule de fournisseur']] },
  { nom: 'détection des prospects retirée', cas: ['prospect-entete', 'prospect-siren'], r: [['const motifProspects = (texte) => { const t = String(texte).replace(NOM_DE_CODE, \' \'); return MOTIFS_PROSPECTS.find((m) => m.re.test(t))?.nom || null }', 'const motifProspects = (texte) => null']] },
  { nom: 'inertie non vue (Ollama Cloud rejoué en boucle)', cas: ['ol-inerte'], r: [["if (r.code === 0 && !r.tue && fr.nom !== 'chatgpt'", "if (false && !r.tue && fr.nom !== 'chatgpt'"]] },
  { nom: 'question de complaisance du modèle libre non écartée', cas: ['question-libre-ecartee'], r: [["&& questionsEcartees < 2 && tour < cfg.tours) {", '&& false) {']] },
  { nom: 'noms de scripts comptés comme prospects', cas: ['nom-de-script'], r: [['const t = String(texte).replace(NOM_DE_CODE, \' \')', 'const t = String(texte)']] },
  { nom: 'relais sans garde « prospects »', cas: ['prospect-entete'], r: [['if (toucheProspects()) finir(3, \'QUOTA\', `${epuise} ; pas de relais', 'if (false) finir(3, \'QUOTA\', `${epuise} ; pas de relais'], ["if (!payant(fr) && toucheProspects()) finir(3,", 'if (false) finir(3,']] },
  { nom: 'détection d\'épuisement lâche (toute ligne, code ignoré)', cas: ['bruit-ol'], r: [['const LIGNE_ERREUR_CODEX = /^(?:ERROR:|■)/', 'const LIGNE_ERREUR_CODEX = /^/'], ['if (r.code === 0 || r.tue) return null', 'if (false) return null']] },
  // ── contre-vérification du 27/09 : chaque trou trouvé, rouvert sur une copie ──
  { nom: 'c3 : toute ligne vaut ligne d\'erreur (code gardé)', cas: ['bruit-ol-code1', 'ol-cat-log-code1'], r: [['const LIGNE_ERREUR_CODEX = /^(?:ERROR:|■)/', 'const LIGNE_ERREUR_CODEX = /^/']] },
  { nom: 'c4 : ligne d\'erreur indentée ou minuscule (code gardé)', cas: ['bruit-fin-ol-code1'], r: [['const LIGNE_ERREUR_CODEX = /^(?:ERROR:|■)/', 'const LIGNE_ERREUR_CODEX = /^\\s*(?:ERROR:?|error:|■)/i']] },
  { nom: 'toute la sortie lue, pas seulement sa fin', cas: ['quota-cite-milieu-code1', 'ol-cat-log-code1'], tous: true, r: [['return lignes.slice(k).filter((l) => l.trim())', 'return lignes.filter((l) => l.trim())']] },
  { nom: 'code de sortie ignoré (Codex sorti en 0)', cas: ['quota-cite-fin-code0', 'ol-cite-fin-code0'], tous: true, r: [['if (r.code === 0 || r.tue) return null', 'if (r.tue) return null']] },
  { nom: 'Codex tué au délai pris pour un quota', cas: ['ol-tue-delai'], r: [['if (r.code === 0 || r.tue) return null', 'if (r.code === 0) return null']] },
  { nom: 'dernier message du modèle lu comme sortie de Codex', cas: ['quota-dans-dernier-message'], r: [['if (m && t.endsWith(m)) t = t.slice(0, -m.length).trimEnd()', '']] },
  { nom: 'a2 : garde d\'entrée de boucle seule retirée', cas: ['prospect-apres-bascule'], r: [["if (!payant(fr) && toucheProspects()) finir(3,", 'if (false) finir(3,']] },
  { nom: 'd3 : plafond de 90 s retiré (Math.min)', cas: ['conseil-borne-plafond'], r: [['const DELAI_CONSEIL_MS = Math.min(90_000, Number(process.env.PRESTI_CONSEIL_DELAI_MS) || 90_000)', 'const DELAI_CONSEIL_MS = (Number(process.env.PRESTI_CONSEIL_DELAI_MS) || 90_000)']] },
  { nom: 'motif e-mail retiré', cas: ['prospect-email', 'prospect-email-conseil'], tous: true, r: [["  { nom: 'e-mail d’une personne', re: { test: (t) => adressesDePersonnes(t).length > 0 } },\n", '']] },
  { nom: 'exemptions d\'e-mail retirées', cas: ['adresses-techniques'], r: [['.filter((a) => !adresseSansPersonne(a))', '']] },
  { nom: 'motif SIREN retiré', cas: ['prospect-siren', 'prospect-sirene', 'prospect-sirens', 'prospect-sirets'], tous: true, r: [["  { nom: 'SIREN / SIRET / Sirene', re: /\\bsir[eè]n(?:e|s)?\\b|\\bsirets?\\b/i },\n", '']] },
  { nom: 'SIREN d\'avant (ni Sirene ni pluriels)', cas: ['prospect-sirene', 'prospect-sirens', 'prospect-sirets'], tous: true, r: [['/\\bsir[eè]n(?:e|s)?\\b|\\bsirets?\\b/i', '/\\bsir[eè]n\\b|\\bsiret\\b/i']] },
  { nom: 'motif téléphone international retiré (0033, +33 (0))', cas: ['prospect-0033', 'prospect-plus33'], tous: true, r: [["  { nom: 'numéro de téléphone international (+33 / 0033)', re: /(?:\\+|00)33[\\s.]?(?:\\(0\\)[\\s.]?)?[1-9](?:[\\s.-]?\\d{2}){4}/ },\n", '']] },
  { nom: 'conseil jamais demandé', cas: ['fail-conseil'], r: [['if (v && !v.pass) conseilSuite = await demanderConseil(tour, v)', 'if (false) conseilSuite = null']] },
  { nom: 'conseil non réinjecté', cas: ['fail-conseil'], r: [['if (conseilSuite) instruction +=', 'if (false) instruction +=']] },
  { nom: 'conseil aussi après un PASS', cas: ['pass-sans-conseil'], r: [["if (final.pass) finir(0, 'PASS', final.ligne)", "if (final.pass) { await demanderConseil(tour, final); finir(0, 'PASS', final.ligne) }"]] },
  { nom: 'entraide privée perdue (--prive)', cas: ['fail-conseil-prive'], r: [["...(prive ? ['--prive'] : [])", '...[]']] },
  { nom: 'clé freellmapi non masquée pour le conseiller', cas: ['cle-masquee'], r: [["const masquer = (t) => (cle ? t.split(cle).join('[clé freellmapi retirée]') : t)", 'const masquer = (t) => t']] },
  { nom: 'échec du conseil qui casse le tour', cas: ['conseil-plante'], r: [['if (v && !v.pass) conseilSuite = await demanderConseil(tour, v)', "if (v && !v.pass) { conseilSuite = await demanderConseil(tour, v); if (!conseilSuite) throw new Error('conseil absent') }"]] },
  { nom: 'pas de borne de 90 s', cas: ['conseil-lent'], r: [['const DELAI_CONSEIL_MS = Math.min(90_000, Number(process.env.PRESTI_CONSEIL_DELAI_MS) || 90_000)', 'const DELAI_CONSEIL_MS = 10 * 60_000']] },
  { nom: 'pas de coupe à 4 000 signes', cas: ['conseil-long'], r: [['const MAX_CONSEIL = 4000', 'const MAX_CONSEIL = 400_000']] },
  // ── Claude Code exécutant (05/10/2026) : chaque garde retirée sur une copie ──
  { nom: 'claude : prospects refusés par erreur (départ explicite)', cas: ['claude-prospects', 'claude-quota-prospects'], tous: true, r: [['if (!payant(FOURNISSEURS[i]) && toucheProspects()) finir(3,', 'if (toucheProspects()) finir(3,']] },
  { nom: "claude : prospects refusés par la garde d'entrée de boucle", cas: ['claude-prospect-en-route'], r: [['if (!payant(fr) && toucheProspects()) finir(3,', "if (fr.nom !== 'chatgpt' && toucheProspects()) finir(3,"]] },
  { nom: 'claude : relais mené vers Claude (horsRelais non sauté)', cas: ['tout-epuise', 'relais-jamais-claude', 'chatgpt-jamais-claude'], tous: true, r: [['(FOURNISSEURS[j].horsRelais || (FOURNISSEURS[j].cle && !lireCleFL()))', '((FOURNISSEURS[j].cle && !lireCleFL()))']] },
  { nom: 'claude : --dangerously-skip-permissions ajouté', cas: ['claude-pass'], r: [["'--permission-prompts', 'none', '--safe-mode',", "'--permission-prompts', 'none', '--safe-mode', '--dangerously-skip-permissions',"]] },
  { nom: 'claude : Edit/Write/Read « nus » autorisés', cas: ['claude-pass'], r: [["const CLAUDE_AUTORISES = BASH('node',", "const CLAUDE_AUTORISES = ['Edit', 'Write', 'Read'].concat(BASH('node',"], ["'find', 'date', 'echo', 'printf', 'pwd', 'bash', 'timeout')", "'find', 'date', 'echo', 'printf', 'pwd', 'bash', 'timeout'))"]] },
  { nom: 'claude : git push non interdit', cas: ['claude-pass'], r: [["...BASH('git push', 'git commit',", "...BASH('git commit',"]] },
  { nom: 'claude : --safe-mode retiré (CLAUDE.md et hooks du dépôt chargés)', cas: ['claude-pass'], r: [["'--permission-prompts', 'none', '--safe-mode',", "'--permission-prompts', 'none',"]] },
  { nom: 'claude : --permission-prompts none retiré', cas: ['claude-pass'], r: [["'--permission-prompts', 'none', ", '']] },
  { nom: "claude : clé d'API non retirée de l'environnement", cas: ['claude-pass'], r: [["for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'FL_KEY']) delete env[k]", 'for (const k of []) delete env[k]']] },
  { nom: 'claude : DISABLE_AUTOUPDATER retiré', cas: ['claude-pass'], r: [["{ ...process.env, DISABLE_AUTOUPDATER: '1' }", '{ ...process.env }']] },
  { nom: 'claude : dernier message non écrit dans dernier-message.md', cas: ['claude-pass'], r: [['try { fs.writeFileSync(dernier, message) }', 'try { void 0 }']] },
  { nom: 'claude : connexion perdue non vue (AUTH)', cas: ['claude-auth'], r: [['if (fr.claude && claudeAuthPerdue(r)) finir(6,', 'if (false) finir(6,']] },
  { nom: 'claude : quota sans le garde « aucun relais depuis Claude »', cas: ['claude-quota', 'claude-quota-texte', 'claude-quota-sans-resultat', 'claude-quota-prospects'], tous: true, r: [["      if (fr.claude) finir(3, 'QUOTA', `${epuise} ; aucun relais depuis Claude : la fiche attend (ni IA gratuite ni :cloud)`)\n", '']] },
  { nom: "claude : question traitée comme celle d'un modèle libre (écartée)", cas: ['claude-question'], r: [['&& !payant(FOURNISSEURS[iFournisseur]) && questionsEcartees < 2', "&& FOURNISSEURS[iFournisseur].nom !== 'chatgpt' && questionsEcartees < 2"]] },
  { nom: 'claude : quota ignoré (texte de limite non reconnu)', cas: ['claude-quota-texte', 'claude-quota-sans-resultat'], tous: true, r: [['const CLAUDE_A_BOUT = /usage limit|limit reached|hit your (?:\\w+ )?limit|rate.?limit|credit balance|out of (?:extra )?usage|resets? (?:at )?\\d/i', 'const CLAUDE_A_BOUT = /^$/']] },
  { nom: 'claude : code de sortie ignoré (message final qui cite un quota)', cas: ['claude-cite-code0'], r: [["if (r.tue || r.code === 0) return ''", "if (r.tue) return ''"], ['if (r.tue || r.code === 0) return null\n  const rej', 'if (r.tue) return null\n  const rej']] },
  { nom: "claude : texte cité dans le flux pris pour l'erreur (résultat ignoré)", cas: ['claude-cite-code1'], r: [["if (res) return String(res.result ?? '')", "if (false) return ''"]] },
  { nom: 'claude : arrêt au délai pris pour un quota', cas: ['claude-tue-delai'], r: [["if (r.tue || r.code === 0) return ''", "if (r.code === 0) return ''"], ['if (r.tue || r.code === 0) return null\n  const rej', 'if (r.code === 0) return null\n  const rej']] },
]

// ── exécution ─────────────────────────────────────────────────────────────────────────────────────────────────
async function enParallele(taches, n) {
  const res = new Array(taches.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, taches.length) }, async () => { while (i < taches.length) { const k = i++; res[k] = await taches[k]() } }))
  return res
}
async function jugerCible(cible, liste, { bavard = true } = {}) {
  // Les plus longs d'abord (la borne réelle de 90 s), pour que le reste tourne pendant ce temps.
  const ordre = [...liste].sort((a, b) => (b.delaiS ?? 60) - (a.delaiS ?? 60))
  const resultats = await enParallele(ordre.map((cas) => async () => {
    const r = await lancerCas(cas, cible)
    const D = []
    try { cas.juger(r, D) } catch (e) { D.push(`le juge du cas a levé : ${e.message}`) }
    // Aucune trace de la clé : ni journal, ni état, ni conseil, ni sortie du tourneur.
    for (const [nom, t] of [...(cas.cleDansLog ? [] : [['codex.log', r.log]]), ['etat.json', JSON.stringify(r.etat)], ['sortie du tourneur', r.sortie], ...Object.entries(r.conseils)]) if (String(t).includes(CLE_FACTICE)) D.push(`la clé freellmapi apparaît dans ${nom}`)
    if (bavard) console.log(`${D.length ? '✗' : '✓'} ${cas.nom.padEnd(22)} code ${String(r.code).padEnd(4)} ${fournisseurs(r).padEnd(26)} conseil×${r.conseilAppels.length} · ${(r.duree / 1000).toFixed(1)} s${D.length ? '\n    - ' + D.join('\n    - ') + `\n    (dossier : ${r.tache})` : ''}`)
    return { cas: cas.nom, D, r }
  }), PARALLELES)
  return resultats
}

let rouge = false
const choisis = SEUL ? CAS.filter((c) => SEUL.includes(c.nom)) : CAS
if (SEUL && choisis.length !== SEUL.length) { console.error(`cas inconnu(s) : ${SEUL.filter((s) => !CAS.some((c) => c.nom === s)).join(', ')}`); process.exit(1) }
const chk = spawnSync(process.execPath, ['--check', CIBLE], { encoding: 'utf8' })
if (chk.status !== 0) { console.error(`✗ node --check ${CIBLE} : ${chk.stderr}`); process.exit(1) }
console.log(`usine-relais-qa : ${choisis.length} cas sur ${path.relative(RACINE, CIBLE) || CIBLE}${RAPIDE ? ' (--rapide : borne du conseil à 4 s)' : ' (borne réelle de 90 s)'}, ${PARALLELES} en parallèle`)
// La forme des fournisseurs de secours doit rester celle du lanceur de référence, quand il est là (hors dépôt).
const lanceur = path.join(RACINE, '..', 'presti-ops', 'veille', 'lancer-codex-tache.sh')
if (fs.existsSync(lanceur)) {
  const t = fs.readFileSync(lanceur, 'utf8')
  for (const [n, c] of [['ol', OL_CONFIG], ['fl', FL_CONFIG]]) if (!t.includes(c)) { console.log(`✗ ${n} : la forme attendue n'est plus celle de presti-ops/veille/lancer-codex-tache.sh`); rouge = true }
}
const t0 = Date.now()
const principaux = await jugerCible(CIBLE, choisis)
const rougesPrincipaux = principaux.filter((x) => x.D.length)
if (rougesPrincipaux.length) rouge = true
console.log(`${rougesPrincipaux.length ? '✗' : '✓'} ${principaux.length - rougesPrincipaux.length}/${principaux.length} cas verts en ${((Date.now() - t0) / 1000).toFixed(0)} s`)

if (option('mutants')) {
  console.log(`\nmutants : chaque capacité retirée sur une copie de ${path.basename(CIBLE)} (${MUTANTS.length}) ; chacun doit faire rougir le banc`)
  const source = fs.readFileSync(CIBLE, 'utf8')
  const bilan = await enParallele(MUTANTS.map((m, k) => async () => {
    let texte = source
    for (const [de, vers] of m.r) {
      if (!texte.includes(de)) return { m, etat: 'inapplicable', detail: `texte introuvable : « ${court(de, 90)} »` }
      texte = texte.split(de).join(vers)
    }
    const dossier = path.join(TMP, `mutant-${String(k + 1).padStart(2, '0')}`)
    fs.mkdirSync(dossier, { recursive: true })
    const copie = path.join(dossier, 'usine.mjs')
    fs.writeFileSync(copie, texte)
    const c = spawnSync(process.execPath, ['--check', copie], { encoding: 'utf8' })
    if (c.status !== 0) return { m, etat: 'invalide', detail: `la copie ne se charge pas : ${court(c.stderr, 160)}` }
    const res = await jugerCible(copie, CAS.filter((x) => m.cas.includes(x.nom)), { bavard: false })
    const vus = res.filter((x) => x.D.length)
    // tous : chacun des cas listés doit rougir (un par forme de la règle), pas seulement l'un d'eux.
    const verts = res.filter((x) => !x.D.length).map((x) => x.cas)
    if (m.tous && vus.length && verts.length) return { m, etat: 'vert', detail: `${verts.join(', ')} reste(nt) vert(s)` }
    return { m, etat: vus.length ? 'rouge' : 'vert', detail: vus.length ? `${vus.map((x) => x.cas).join(', ')} : ${court(vus[0].D[0], 150)}` : `${m.cas.join(', ')} restent verts` }
  }), 2)
  for (const b of bilan) {
    const ok = b.etat === 'rouge'
    if (!ok) rouge = true
    console.log(`${ok ? '✓' : '✗'} ${b.m.nom.padEnd(52)} → ${ok ? 'le banc rougit' : b.etat === 'vert' ? 'LE BANC RESTE VERT' : b.etat.toUpperCase()} — ${b.detail}`)
  }
}

if (!GARDER && !rouge) fs.rmSync(TMP, { recursive: true, force: true })
else console.log(`\ndossiers temporaires gardés : ${TMP}`)
console.log(`\nusine-relais-qa : ${rouge ? 'FAIL' : 'PASS'}`)
process.exit(rouge ? 1 : 0)
