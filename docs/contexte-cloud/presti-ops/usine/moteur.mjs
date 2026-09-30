#!/usr/bin/env node
// presti-ops/usine/moteur.mjs — moteur de production de la série 026, SANS Claude (27/09/2026 ; juges croisés le 28/09).
// Toutes les 5 min : repère les fiches prêtes (dépendances en fait/), les dépose, les lance, rapatrie, vérifie, commite et
// pousse les PASS de production. Rien de destructif : un rouge est retiré (git apply -R, patch gardé), la fiche reste en
// en-cours/ ou refuse/ et est signalée dans le journal.
//
// Qui fait quoi (décision de Benj du 28/09, « juges croisés » : aucune IA ne juge son propre travail ; la règle est dans
// scripts/usine-repartition.mjs, lue à chaque tour dans l'INDEX de la série) :
//   - production « codex… »       → Codex sur l'usine (usine.mjs lancer), MAX à la fois ; Codex plein → voie libre (usine.mjs
//                                    lancer --fournisseur=<LIBRE>, Ollama Cloud puis freellmapi), MAX_LIBRE à la fois, jamais
//                                    pour une fiche de prospects (usine.mjs refuse net ; le moteur ne la repropose plus) ;
//   - production « antigravity »  → Gemini sur le PC (scripts/antigravity.mjs lancer ag-<id> --tache=<id> --model=pro), MAX_AG à
//                                    la fois ; fiche passée en fait/ → `orchestre.mjs verifier <id>` sur le PC → commit si PASS ;
//   - ChatGPT éteint (--retour-chatgpt, 29/09) : une fiche de PRODUCTION « codex » hors prospection va D'ABORD chez Gemini (même voie que
//     « antigravity », mêmes suivi et vérification finale par verifier-final.mjs, MAX_AG) ; Gemini plein, Antigravity injoignable ou
//     quota Gemini épuisé → la voie libre (ol puis fl), comme avant. Les fiches de prospection restent en attente (Claude les prend).
//   - juge de fiches toutes codex → rédaction croisée par Gemini (même file MAX_AG) ; juge de fiches toutes antigravity, ou
//     migration → rédaction croisée par Codex sur l'usine (usine.mjs lancer --croise, dans MAX). Une rédaction croisée n'est
//     JAMAIS commitée : la fiche reste en en-cours/, le moteur écrit .orchestre/a-relire/<id>.md et « ✍ … à relire par Claude » ;
//   - toute autre fiche claude-code (mise en service, recette, épreuve…) n'est jamais lancée.
// Avant chaque commit : chemins de la fiche seulement, index vérifié, et garde des imports (garde-imports.mjs).
// Moins de Claude (28/09, Benj) — le moteur règle seul les cas répétitifs :
//   - question « juge vivant sur le PC » (Codex n'attend que NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//     NEXT_PUBLIC_SUPABASE_ANON_KEY ou .env.local, et propose le PC) : patch appliqué (git apply --check d'abord), question rangée
//     dans preuves/<id>/ avec « réponse automatique : option PC », fiche en fait/, verifier sur le PC, commit si PASS, sinon le
//     patch est rendu (git apply -R). Vu trois fois le 28/09 (068, 074 ; 049 était une autre question) ;
//   - toute autre question → .orchestre/a-decider/<id>.md (la question, les chemins du patch) et « ❓ » au journal ;
//   - fichiers exclusifs (lib/flags.ts) : une seule fiche à la fois les touche ; tant que l'une est en en-cours/ ou que le
//     fichier porte une modification non commitée, les autres attendent (28/09 : la ligne pilotage de 068, pas encore commitée,
//     a fait rougir PP-9 de 118).
// Usage (depuis le dépôt presti) : node ../presti-ops/usine/moteur.mjs [--max=4] [--max-libre=3] [--max-ag=3] [--libre=ol|fl]
//   [--heures=16] [--tours=N] [--pause=300] [--sans-deploiement]   ·   arrêt : créer ../presti-ops/usine/moteur.stop
// --tours et --pause servent au banc d'essai (juges-croises-qa.mjs) : un tour, sans attente, dans un dépôt jetable.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { verifierImports, ligneManque } from './garde-imports.mjs'
import { headPousse } from './head-pousse.mjs'

const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const MAX = Number(ARGS.max || 4)
const MAX_LIBRE = Number(ARGS['max-libre'] ?? 3)
const MAX_AG = Number(ARGS['max-ag'] ?? 3)
const LIBRE = ['ol', 'fl'].includes(ARGS.libre) ? ARGS.libre : 'ol' // Ollama Cloud d'abord : le relais peut encore passer à freellmapi
// Retour de ChatGPT (29/09/2026) : le quota de l'abonnement est épuisé jusqu'au 3/10 à 18 h. Avec --retour-chatgpt=<date ISO>, TOUTE
// production Codex part sur la voie libre (Ollama Cloud puis freellmapi : usine.mjs lancer --fournisseur=<LIBRE>, jamais l'abonnement) tant
// que la date n'est pas passée ; ensuite le moteur redevient normal tout seul (Codex sur l'abonnement d'abord, voie libre en débordement).
// Sans l'option : comportement d'avant. Une fiche de prospects (refusée par usine.mjs) et une rédaction croisée (ChatGPT seulement) attendent
// la date. --chatgpt-tout-de-suite annule l'option (l'abonnement est revenu plus tôt).
const RETOUR_CHATGPT = ARGS['retour-chatgpt'] && !('chatgpt-tout-de-suite' in ARGS) ? Date.parse(ARGS['retour-chatgpt']) : null
if (ARGS['retour-chatgpt'] && Number.isNaN(RETOUR_CHATGPT)) throw new Error(`--retour-chatgpt=${ARGS['retour-chatgpt']} : date ISO attendue (2026-10-03T18:00:00+02:00)`)
const QUOTA_GEMINI = /quota|RESOURCE_EXHAUSTED|\b429\b|rate.?limit|too many requests|capacity/i // erreur de quota rendue par Gemini/Antigravity
const chatgptEteint = () => RETOUR_CHATGPT !== null && Date.now() < RETOUR_CHATGPT
const TOURS = ARGS.tours ? Number(ARGS.tours) : Infinity
const PAUSE_S = ARGS.pause !== undefined ? Number(ARGS.pause) : 300
const FIN = Date.now() + Number(ARGS.heures || 16) * 3600e3
const OPS = path.resolve('../presti-ops/usine')
const ETAT = path.join(OPS, 'moteur-etat.json')
const JOURNAL = path.join(OPS, 'moteur.log')
const STOP = path.join(OPS, 'moteur.stop')
const B = '.orchestre/brouillons-ecosysteme/026'
const ORCH = '.orchestre'
const R = await import(pathToFileURL(path.resolve('scripts/usine-repartition.mjs')).href)
const LIBELLE_LIBRE = { ol: 'Ollama Cloud, gpt-oss:120b-cloud', fl: 'freellmapi, gpt-oss-120b' }
// Les demandes de Benj (29/09/2026, migration 0117) : la logique vit dans le dépôt (scripts/demandes-ecosysteme.mjs), absent = rien à faire.
const DEM = await import(pathToFileURL(path.resolve('scripts/demandes-ecosysteme.mjs')).href).catch(() => null)
const estDemande = (id) => !!DEM && DEM.estFicheDemande(id)

const log = (m) => { const l = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} ${m}`; console.log(l); fs.appendFileSync(JOURNAL, l + '\n') }
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', timeout: opts.timeout || 20 * 60e3, maxBuffer: 64e6 })
const node = (args, opts) => run(process.execPath, args, opts)
const sortieDe = (r) => `${r.stdout || ''}${r.stderr || ''}`
const derniere = (r) => sortieDe(r).trim().split('\n').pop()
const git = (...a) => run('git', a)
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
function lireEtat() {
  const e = lireJson(ETAT) || {}
  // Un état d'avant le 28/09 n'a que enCours, faits et rouges : les tables des nouvelles voies partent vides.
  for (const k of ['enCours', 'libre', 'ag', 'croises', 'sansLibre', 'nonPrises', 'attente', 'geminiEcarte']) e[k] ||= {}
  for (const k of ['faits', 'rouges', 'aRelire', 'aDecider']) e[k] ||= []
  return e
}
const ecrireEtat = (e) => fs.writeFileSync(ETAT, JSON.stringify(e, null, 2))
const titre = (r) => String(r.titre || '').slice(0, 60)

function lignesIndex() {
  return R.lireIndex(fs.readFileSync(path.join(B, 'INDEX.md'), 'utf8')).filter((l) => /^026-\d{3}$/.test(l.id))
}
// Ids à 2 ou 3 chiffres : les dépendances vers la série 025 (025-05, 025-06…) s'écrivent à 2 chiffres. Avec \d{3} seul,
// 17 fiches 026 (dont 026-042) ne pouvaient jamais devenir prêtes (27/09).
const dans = (d) => new Set(fs.existsSync(path.join(ORCH, d)) ? fs.readdirSync(path.join(ORCH, d)).filter((f) => /^0\d\d-\d{2,3}\.md$/.test(f)).map((f) => f.replace(/\.md$/, '')) : [])
const ouEst = (id) => ['en-cours', 'fait', 'refuse', 'file'].find((d) => fs.existsSync(path.join(ORCH, d, `${id}.md`))) || null

// Prêtes : dépendances en fait/, ni faites, ni prises, et une voie (usine-repartition.mjs : codex ou antigravity ; null = Claude).
function prets() {
  const fait = dans('fait'); const pris = new Set([...dans('en-cours'), ...dans('refuse')]) // file/ reste prenable : une fiche déposée dont le lancement a échoué doit être relancée
  const lignes = lignesIndex()
  return lignes.filter((r) => !fait.has(r.id) && !pris.has(r.id) && r.deps.every((d) => fait.has(d)))
    .map((r) => ({ ...r, c: R.classer(r, lignes) })).filter((r) => r.c.voie)
}

function perimetre(fiche) {
  const t = fs.readFileSync(fiche, 'utf8'); const m = t.match(/^perimetre:\s*\[(.*)\]/m)
  return m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '').replace(/\/\*\*.*$/, '')).filter((p) => p && fs.existsSync(p)) : []
}
// L'exécutant écrit dans l'en-tête de la fiche, où qu'elle soit : une fiche claude-code n'est jamais commitée par le moteur.
function executantFiche(id) {
  const f = [...['fait', 'en-cours', 'refuse', 'file'].map((d) => path.join(ORCH, d, `${id}.md`)), path.join(B, `${id}.md`)].find((x) => fs.existsSync(x))
  return f ? ((fs.readFileSync(f, 'utf8').match(/^executant:\s*(\S+)/m) || [])[1] || null) : null
}

// Verrou git orphelin (27/09 : trois fois, jusqu'à 2 h sans commit possible) : un processus tué en tenant .git/index.lock le
// laisse derrière lui. Le plus long détenteur légitime est un commit et son crochet (typecheck + suite, 2 à 3 min) : au-delà
// de 8 min, personne ne le tient plus.
function balayerVerrou() {
  const v = '.git/index.lock'
  try {
    const age = (Date.now() - fs.statSync(v).mtimeMs) / 1000
    if (age > 480) { fs.rmSync(v); log(`· verrou git orphelin retiré (${Math.round(age / 60)} min)`) }
  } catch { /* pas de verrou */ }
}

function commiterEtPousser(msg, chemins) {
  balayerVerrou()
  const id = msg.split(' ')[0]
  // Un `git add` refusé (verrou index.lock orphelin, 27/09 : 2 h sans aucun commit) laissait l'index vide, et « rien à
  // commiter » passait pour un succès : le journal disait « commitée et poussée » pour des fiches jamais commitées.
  const refus = [...chemins, ...['.orchestre/digest.md', '.orchestre/verdicts.jsonl'].filter((x) => git('diff', '--quiet', '--', x).status)]
    .map((c) => ({ c, r: git('add', '--', c) })).filter((x) => x.r.status && !/did not match any files/.test(x.r.stderr || ''))
  if (refus.length) { log(`✗ git add refusé (${refus.length}) : ${(refus[0].r.stderr || '').trim().split('\n')[0].slice(0, 160)}`); git('reset', '-q'); return false }
  // Garde de l'index : rien du périmètre ne reste non suivi ou modifié hors index (27/09 : fixtures annoncées, jamais parties).
  const restes = chemins.filter((c) => fs.existsSync(c)).flatMap((c) => [...git('ls-files', '--others', '--exclude-standard', '--', c).stdout.split('\n'), ...git('diff', '--name-only', '--', c).stdout.split('\n')]).filter(Boolean)
  if (restes.length) { log(`✗ index incomplet (${restes.length}), rien n'est commité : ${restes.slice(0, 3).join(', ')}`); git('reset', '-q'); return false }
  // Seulement NOS chemins (27/09 : un « git commit » nu a emporté la réparation de 026-005 que la session indexait).
  const nos = [...chemins, '.orchestre/digest.md', '.orchestre/verdicts.jsonl'].filter((c) => fs.existsSync(c) || git('ls-files', '--error-unmatch', '--', c).status === 0)
  // Garde des imports (28/09 : 026-077 importait lib/agents/acquisition/vigieMeta.ts, présent sur le PC mais hors de git ; le
  // typecheck du PC était vert, le build Vercel a cassé de 14:07 à 14:40) : chaque import « @/ » ou relatif du code commité vise
  // un fichier de HEAD ou de ce commit.
  const garde = verifierImports({ racine: process.cwd(), pathspecs: nos })
  if (garde.erreur || garde.manques.length) {
    if (garde.erreur) log(`✗ ${id} : garde des imports impossible (${garde.erreur}), rien n'est commité`)
    for (const m of garde.manques.slice(0, 5)) log(ligneManque(id, m))
    git('reset', '-q'); return false
  }
  if (!git('diff', '--cached', '--quiet', '--', ...nos).status) { log(`· ${msg.split(' ')[0]} : rien de neuf à commiter (déjà dans HEAD)`); return true }
  const c = git('commit', '-q', '-m', `${msg}\n\nCo-Authored-By: Claude Opus 5.5 <[EMAIL_MASQUE]>`, '--', ...nos)
  if (c.status) { log(`✗ commit refusé : ${(c.stdout + c.stderr).split('\n').filter((l) => /❌|error|fatal|refus/i.test(l)).slice(0, 2).join(' | ')}`); git('reset', '-q'); return false }
  const p = git('push', '-q', 'origin', 'main')
  if (p.status) { log(`✗ push refusé : ${(p.stderr || '').slice(0, 200)}`); return false }
  return true
}

function deposer(r) {
  const src = path.join(B, `${r.id}.md`); const dst = path.join(ORCH, 'file', `${r.id}.md`)
  const v = node(['scripts/orchestre.mjs', 'valider', src])
  if (v.status) { log(`✗ ${r.id} refusée par valider : ${sortieDe(v).trim().split('\n').pop()}`); return false }
  fs.copyFileSync(src, dst)
  return commiterEtPousser(`${r.id} déposée en file/ par le moteur (dépendances faites)`, [dst])
}

// Le typecheck tourne SUR L'USINE d'abord (4 cœurs, 24 Go ; le PC, saturé, y met 15 min). Le PC ne le fait qu'en repli, quand l'usine ne peut vraiment pas
// juger : paquet refusé, package.json/lock modifié, ssh coupé, délai. Un HEAD du PC pas encore poussé (commit d'une autre session en vol : crochet 2-3 min, puis
// push) n'est PAS une raison : l'usine part d'origin/main, on attend qu'il y soit (29/09 : deux commits en vol ont suffi à envoyer le typecheck sur le PC).
function typecheckUsine() {
  const h = headPousse({ cwd: process.cwd(), maxS: 240 })
  if (!h.ok) log(`· typecheck : HEAD ${h.tete} toujours pas poussé après ${h.attenteS} s : l'usine va probablement refuser`)
  return node(['scripts/usine.mjs', 'executer', '--nom=typecheck-moteur', '--delai=15', '--', 'npm', 'run', 'typecheck'], { timeout: 20 * 60e3 })
}
function typesVerts() {
  let r = typecheckUsine()
  if (r.status === 0) return true
  // « inconnu de GitHub » : encore une chance, une seule, le temps que le push en vol arrive.
  if (r.status === 125 && /inconnu de GitHub|pousse d.abord/.test(sortieDe(r))) { log("· typecheck de l'usine : HEAD pas encore poussé → j'attends et je retente sur l'usine"); r = typecheckUsine(); if (r.status === 0) return true }
  // 3, 124, 125 : l'usine n'a PAS jugé (paquet refusé par son contrôle, bac occupé, délai, ssh coupé). Le 27/09, un juge en
  // cours d'écriture par une autre ligne faisait refuser tout paquet : 026-028, verte, est partie en refuse/ pour rien.
  // Ce n'est pas un rouge : le PC, qui porte le patch, vérifie les types lui-même.
  if ([3, 124, 125, null].includes(r.status)) {
    log(`· typecheck de l'usine non rendu (code ${r.status} : ${sortieDe(r).split('\n').filter((l) => /✗/.test(l)).slice(0, 1).join('') || 'sans motif'}) → typecheck sur le PC (repli)`)
    return node(['node_modules/typescript/bin/tsc', '--noEmit'], { timeout: 15 * 60e3 }).status === 0
  }
  return false
}

// La vérification FINALE d'une fiche (le PC rejuge après l'exécutant) : SUR L'USINE d'abord (verifier-usine.mjs, verdict « machine: usine »),
// sur le PC seulement pour les fiches à secrets (--reel, .env.local, service_role, Stripe…) ou si l'usine ne juge pas (verifier-final.mjs décide, 29/09).
// PRESTI_VERIFIER_PC=1 dans l'environnement du moteur : PC seul, comme avant. (La réponse automatique « juge vivant sur le PC » reste, elle, sur le PC.)
const verifierFinal = (id) => fs.existsSync(path.join(OPS, 'verifier-final.mjs'))
  ? node([path.join(OPS, 'verifier-final.mjs'), id], { timeout: 65 * 60e3 })
  : node(['scripts/orchestre.mjs', 'verifier', id], { timeout: 45 * 60e3 }) // outil absent : le PC, comme avant

// ── rédactions croisées : jamais commitées ─────────────────────────────────────────────────────────────────────
// La fiche revient en en-cours/ si le rédacteur l'a déplacée (c'est Claude qui la passera en fait/ après sa relecture) ; le
// verrou d'origine est reposé s'il a disparu (verifier depuis fait/ l'efface).
function remettreEnCours(id, lock) {
  for (const d of ['fait', 'refuse']) {
    const f = path.join(ORCH, d, `${id}.md`)
    if (fs.existsSync(f) && !fs.existsSync(path.join(ORCH, 'en-cours', `${id}.md`))) { fs.renameSync(f, path.join(ORCH, 'en-cours', `${id}.md`)); log(`· ${id} : ${d}/ → en-cours/ (rédaction croisée : Claude la passera en fait/ après relecture)`) }
  }
  const v = path.join(ORCH, 'en-cours', `${id}.lock`)
  if (lock && !fs.existsSync(v) && fs.existsSync(path.join(ORCH, 'en-cours', `${id}.md`))) fs.writeFileSync(v, lock)
}
// L'état git des chemins de la fiche (périmètre et preuves) : ce que le rédacteur a produit, non commité.
function cheminsProduits(id) {
  const f = path.join(ORCH, 'en-cours', `${id}.md`)
  const pers = fs.existsSync(f) ? R.prefixesPerimetre(fs.readFileSync(f, 'utf8')).map((p) => p.replace(/\/$/, '')) : []
  const s = git('status', '--porcelain', '-uall', '--', ...new Set([...pers, `.orchestre/preuves/${id}`]))
  return s.stdout.split('\n').map((l) => l.trimEnd()).filter(Boolean)
}
function dernierVerdict(id, depuis) {
  const f = path.join(ORCH, 'verdicts.jsonl')
  if (!fs.existsSync(f)) return null
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter((v) => v?.id === id && (!depuis || Date.parse(v.date) >= depuis - 60e3)).at(-1) || null
}
function ecrireARelire(e, id, { type, redacteur, verifier, chemins }) {
  const d = path.join(ORCH, 'a-relire'); fs.mkdirSync(d, { recursive: true })
  const f = path.join(d, `${id}.md`)
  const titreFiche = (lignesIndex().find((l) => l.id === id) || {}).titre || '?'
  fs.writeFileSync(f, [
    `# ${id} — à relire par Claude (rédaction croisée)`, '',
    `- **Fiche** : ${titreFiche} (${type}) — laissée en \`.orchestre/${ouEst(id) || '?'}/${id}.md\`.`,
    `- **Rédigée par** : ${redacteur}.`,
    `- **Résultat du verifier** : ${verifier}.`,
    `- **Chemins produits** (non commités, \`git status\` des chemins de la fiche) :`,
    ...(chemins.length ? chemins.map((c) => `  - \`${c}\``) : ['  - (aucun)']),
    `- **Décision** : juges croisés (Benj, 28/09) — aucune IA ne juge son propre travail ; le moteur ne commite jamais une rédaction croisée.`,
    `- **À faire par Claude** : relire, attaquer par sabotages, \`node scripts/orchestre.mjs verifier ${id}\`, puis passer la fiche en fait/ et commiter (\`presti-ops/usine/commit-fiche.sh ${id} "…"\`).${type === 'migration' ? ' Migration : rien n\'est appliqué ; l\'appliquer soi-même (connecteur), contrôle, essai réel annulé, zéro trace.' : ''}`,
    `- Écrit par le moteur le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (UTC).`, '',
  ].join('\n'))
  if (!e.aRelire.includes(id)) e.aRelire.push(id)
  log(`✍ ${id} à relire par Claude : rédaction croisée (${type}) par ${redacteur} — verifier : ${String(verifier).slice(0, 140)} → .orchestre/a-relire/${id}.md`)
}

// ── les questions : réponse automatique « juge vivant sur le PC », sinon .orchestre/a-decider/ ─────────────────────────
function ecrireADecider(e, id, { qui, texte, patch, chemins, raison }) {
  const d = path.join(ORCH, 'a-decider'); fs.mkdirSync(d, { recursive: true })
  const titreFiche = (lignesIndex().find((l) => l.id === id) || {}).titre || '?'
  fs.writeFileSync(path.join(d, `${id}.md`), [
    `# ${id} — à décider par Claude (question)`, '',
    `- **Fiche** : ${titreFiche} — en \`.orchestre/${ouEst(id) || '?'}/${id}.md\`.`,
    `- **Posée par** : ${qui}.`,
    `- **Pourquoi le moteur ne répond pas seul** : ${raison || 'ce n\'est pas une question « juge vivant sur le PC » (variables locales seulement)'}.`,
    `- **Patch** : ${patch ? `\`${patch.split(path.sep).join('/')}\` (non appliqué)` : 'aucun (travail sur le PC, non commité)'} ; chemins :`,
    ...(chemins.length ? chemins.map((c) => `  - \`${c}\``) : ['  - (aucun)']),
    `- **Répondre** : ${/Gemini/.test(qui) ? `\`node scripts/antigravity.mjs repondre ${id} <n> [ligne]\`` : `\`node scripts/orchestre.mjs repondre ${id} <n>\`, puis \`orchestre.mjs liberer ${id}\`, \`usine.mjs nettoyer ${id} --forcer\` et relancer`}.`,
    '', '## La question', '', String(texte || '').trim(), '',
  ].join('\n'))
  if (!e.aDecider.includes(id)) e.aDecider.push(id)
  log(`❓ ${id} : question de ${qui} → .orchestre/a-decider/${id}.md`)
}
// « Juge vivant sur le PC » : la question ne réclame que les variables locales (celles de .env.local), aucune autre, ne signale
// aucune autre panne, et l'une de ses options fait tourner le verifier sur le PC. Rend le numéro de cette option, sinon null.
const VARIABLES_LOCALES = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
function optionJugeVivant(texte) {
  const t = String(texte || '')
  if (!VARIABLES_LOCALES.some((v) => t.includes(v)) && !/\.env\.local\b/.test(t)) return null
  if ([...t.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g)].some((m) => !VARIABLES_LOCALES.includes(m[0]))) return null
  if (/error TS\d|hors (?:du )?périmètre|échoue sur/i.test(t)) return null
  const m = t.match(/^\s*(\d+)[.)]\s[^\n]*\b(?:PC|poste)\b/m)
  return m ? Number(m[1]) : null
}
const rapatries = (id) => { const f = path.join(ORCH, 'travail', 'usine', id, 'rapatries.txt'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map((l) => l.replace('\t', ' ').trim()).filter(Boolean) : [] }
function rendrePatch(id, patch) {
  if (!fs.existsSync(patch) || !fs.statSync(patch).size) return
  const essai = run('git', ['apply', '-R', '--check', '--whitespace=nowarn', patch])
  if (!essai.status && !run('git', ['apply', '-R', '--whitespace=nowarn', patch]).status) log(`· ${id} : patch rendu (git apply -R), il attend dans ${patch.split(path.sep).join('/')}`)
  else log(`⚠ ${id} : le patch ne se retire pas proprement (${String(essai.stderr || '').trim().split('\n')[0]}) : laissé en place, à regarder`)
}
// Un PASS de Codex (fiche en fait/, patch appliqué) : typecheck si du TypeScript a bougé, puis commit et push (mêmes gardes).
function commiterPassUsine(e, id, patch, qui, suffixe = '') {
  const ts = fs.existsSync(patch) && /^\+\+\+ b\/.*\.tsx?$/m.test(fs.readFileSync(patch, 'utf8'))
  if (ts && !typesVerts()) {
    run('git', ['apply', '-R', patch]); fs.renameSync(path.join(ORCH, 'fait', `${id}.md`), path.join(ORCH, 'refuse', `${id}.md`))
    e.rouges.push({ id, raison: 'typecheck rouge', date: new Date().toISOString() }); log(`✗ ${id} : juge vert mais typecheck rouge → patch retiré, fiche en refuse/`)
    return
  }
  const ok = commiterEtPousser(`${id} : production par ${qui} (${suffixe}PASS du PC${ts ? ', typecheck vert' : ''}, moteur)`, [path.join(ORCH, 'fait', `${id}.md`), path.join(ORCH, 'preuves', id), ...perimetre(path.join(ORCH, 'fait', `${id}.md`))])
  if (ok) { e.faits.push(id); log(`✓ ${id} PASS${/voie libre/.test(qui) ? ' (voie libre)' : ''}${suffixe ? ' (juge vivant sur le PC)' : ''}, commitée et poussée`) }
}
function questionCodex(e, id, qui) {
  const ici = path.join(ORCH, 'travail', 'usine', id)
  const texte = fs.readFileSync(path.join(ici, 'question.md'), 'utf8')
  const patch = path.join(ici, 'resultat.patch')
  const option = optionJugeVivant(texte)
  if (!option) { ecrireADecider(e, id, { qui, texte, patch, chemins: rapatries(id) }); return }
  // 1. Le patch sur le PC, contrôlé d'abord.
  const taille = fs.existsSync(patch) ? fs.statSync(patch).size : 0
  if (taille) {
    const essai = run('git', ['apply', '--check', '--whitespace=nowarn', patch])
    const pose = essai.status ? essai : run('git', ['apply', '--whitespace=nowarn', patch])
    if (pose.status) { ecrireADecider(e, id, { qui, texte, patch, chemins: rapatries(id), raison: `question « juge vivant sur le PC », mais le patch ne s'applique pas (${String(pose.stderr || '').trim().split('\n')[0].slice(0, 160)})` }); return }
  }
  // 2. La question rangée dans les preuves, avec sa réponse.
  const jour = new Date().toISOString().slice(5, 10).split('-').reverse().join('-')
  const rangee = path.join(ORCH, 'preuves', id, `question-codex-${jour}.md`)
  fs.mkdirSync(path.dirname(rangee), { recursive: true })
  fs.writeFileSync(rangee, `${texte.trimEnd()}\n\n> réponse automatique : option PC (option ${option}) — le verifier tourne sur le PC, avec ses variables locales, jamais sur l'usine (moteur, ${new Date().toISOString().slice(0, 16)}).\n`)
  fs.rmSync(path.join(ORCH, 'en-cours', `${id}.question.md`), { force: true })
  // 3. La fiche en fait/, le verifier sur le PC.
  if (fs.existsSync(path.join(ORCH, 'en-cours', `${id}.md`))) fs.renameSync(path.join(ORCH, 'en-cours', `${id}.md`), path.join(ORCH, 'fait', `${id}.md`))
  const v = node(['scripts/orchestre.mjs', 'verifier', id], { timeout: 45 * 60e3 })
  const s = sortieDe(v)
  const ligne = ((s.match(new RegExp(`${id}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0] || s.trim().split('\n').pop() || '').slice(0, 200)
  const pass = v.status === 0 && new RegExp(`${id}\\s*:\\s*PASS`).test(s) && fs.existsSync(path.join(ORCH, 'fait', `${id}.md`))
  log(`· ${id} : question « juge vivant sur le PC » → réponse automatique (option ${option}), patch appliqué, verifier sur le PC : ${pass ? 'PASS' : ligne}`)
  // 4. PASS → commit ; sinon le patch est rendu, comme pour tout rouge.
  if (pass) commiterPassUsine(e, id, patch, qui, 'juge vivant sur le PC, réponse automatique, ')
  else { rendrePatch(id, patch); e.rouges.push({ id, raison: `juge vivant sur le PC : ${ligne}`, date: new Date().toISOString() }); log(`✗ ${id} rouge (juge vivant sur le PC) : ${ligne}`) }
  node(['scripts/usine.mjs', 'nettoyer', id, '--forcer'])
}
const questionRapatriee = (id, sortie) => fs.existsSync(path.join(ORCH, 'travail', 'usine', id, 'question.md')) && /a posé une question/.test(sortie)

// Fichiers exclusifs : une seule fiche à la fois les a dans son périmètre (lib/flags.ts, 28/09 : 068 et PP-9 de 118).
const EXCLUSIFS = ['lib/flags.ts']
function texteFicheDe(id) { const f = [path.join(ORCH, 'file', `${id}.md`), path.join(B, `${id}.md`)].find((x) => fs.existsSync(x)); return f ? fs.readFileSync(f, 'utf8') : '' }
function bloqueParExclusif(id) {
  const texte = texteFicheDe(id)
  for (const f of EXCLUSIFS) {
    if (!R.perimetreTouche(texte, f)) continue
    const tenant = [...dans('en-cours')].filter((x) => x !== id).find((x) => R.perimetreTouche(fs.readFileSync(path.join(ORCH, 'en-cours', `${x}.md`), 'utf8'), f))
    if (tenant) return `${f} est déjà dans le périmètre de ${tenant} (en cours)`
    if (git('status', '--porcelain', '--', f).stdout.trim()) return `${f} porte une modification non commitée sur le PC`
  }
  return null
}

// ── l'usine : Codex (MAX) et voie libre (MAX_LIBRE) ─────────────────────────────────────────────────────────────
function recupererUsine(e, id, table, voie) {
  const r = node(['scripts/usine.mjs', 'recuperer', id], { timeout: 30 * 60e3 })
  const sortie = sortieDe(r)
  if (r.status === 4) { if (Date.now() - table[id] > 3 * 3600e3) log(`⚠ ${id} tourne depuis plus de 3 h`); return }
  delete table[id]
  if (estDemande(id)) { finirDemandeUsine(e, id, r, sortie); return } // une demande de Benj : la branche, jamais main
  // Rédaction croisée (marquée au lancement, ou fiche claude-code quelle que soit la marque) : à relire, jamais commitée.
  if (e.croises[id] || executantFiche(id) === 'claude-code') {
    const x = e.croises[id] || {}
    delete e.croises[id]
    const v = lireJson(path.join(ORCH, 'travail', 'usine', id, 'verdict-pc.json'))
    if (!v) {
      // Jamais de réponse automatique pour une rédaction croisée (elle ne se commite pas) : la question va à Claude.
      if (questionRapatriee(id, sortie)) { ecrireADecider(e, id, { qui: `Codex sur l'usine (rédaction croisée ${x.type || ''})`.trim(), texte: fs.readFileSync(path.join(ORCH, 'travail', 'usine', id, 'question.md'), 'utf8'), patch: path.join(ORCH, 'travail', 'usine', id, 'resultat.patch'), chemins: rapatries(id), raison: 'rédaction croisée : jamais de réponse automatique' }); return }
      e.rouges.push({ id, raison: `rédaction croisée : ${sortie.split('\n').filter((l) => /✗|FAIL|QUESTION|QUOTA/.test(l)).slice(0, 2).join(' | ').slice(0, 260)}`, date: new Date().toISOString() })
      log(`✗ ${id} (rédaction croisée) rouge (code ${r.status}) : ${e.rouges.at(-1).raison} — rien n'est appliqué, fiche en ${ouEst(id) || '?'}/ : à reprendre par Claude`)
      return
    }
    remettreEnCours(id, x.lock)
    const rap = path.join(ORCH, 'travail', 'usine', id, 'rapatries.txt')
    const chemins = fs.existsSync(rap) ? fs.readFileSync(rap, 'utf8').split('\n').map((l) => l.replace('\t', ' ').trim()).filter(Boolean) : cheminsProduits(id)
    ecrireARelire(e, id, {
      type: v.croise || x.type || 'claude-code',
      redacteur: `Codex sur l'usine (${v.redacteur || 'usine-codex'})`,
      verifier: v.croise ? `verdict de l'usine ${v.verdictUsine || '?'}${v.ligneUsine ? ' — ' + v.ligneUsine : ''} (journal : .orchestre/travail/usine/${id}/verifier-usine.log)` : `${v.verdict}${v.ligne ? ' — ' + v.ligne : ''} (verdict du PC)`,
      chemins,
    })
    node(['scripts/usine.mjs', 'nettoyer', id])
    return
  }
  const qui = voie === 'libre' ? `Codex sur la voie libre (${LIBELLE_LIBRE[LIBRE]})` : 'Codex sur l\'usine'
  if (r.status === 0 && fs.existsSync(path.join(ORCH, 'fait', `${id}.md`))) {
    commiterPassUsine(e, id, path.join(ORCH, 'travail', 'usine', id, 'resultat.patch'), qui)
    node(['scripts/usine.mjs', 'nettoyer', id])
  } else if (questionRapatriee(id, sortie)) {
    questionCodex(e, id, qui)
  } else {
    e.rouges.push({ id, raison: sortie.split('\n').filter((l) => /✗|FAIL|QUESTION|QUOTA/.test(l)).slice(0, 2).join(' | ').slice(0, 300), date: new Date().toISOString() })
    log(`✗ ${id} rouge (code ${r.status}) : ${e.rouges.at(-1).raison}`)
  }
}
function lancerUsine(e, r, voie, apresNettoyage = false) {
  if (!fs.existsSync(path.join(ORCH, 'file', `${r.id}.md`)) && !deposer(r)) return
  const extra = r.c.croise ? ['--croise'] : voie === 'libre' ? [`--fournisseur=${LIBRE}`] : []
  const l = node(['scripts/usine.mjs', 'lancer', r.id, ...extra], { timeout: 10 * 60e3 })
  if (l.status === 0) {
    (voie === 'libre' ? e.libre : e.enCours)[r.id] = Date.now()
    if (r.c.croise) e.croises[r.id] = { type: r.c.type, depuis: Date.now(), lock: lireVerrou(r.id) }
    log(`→ ${r.id} lancée ${voie === 'libre' ? `sur la voie libre (${LIBELLE_LIBRE[LIBRE]})` : 'sur l\'usine'}${r.c.croise ? ` en rédaction croisée (${r.c.type})` : ''} (${titre(r)})`)
  } else if (voie === 'libre' && /données de prospects/.test(sortieDe(l))) {
    e.sansLibre[r.id] = new Date().toISOString()
    log(`· ${r.id} touche des données de prospects : pas de voie libre, elle attend Codex sur l'abonnement`)
  } else if (!apresNettoyage && l.status === 3 && /a déjà un dossier/.test(sortieDe(l))) {
    resoudreDossierExistant(e, r, voie)
  } else log(`✗ ${r.id} : lancer a échoué (code ${l.status}) : ${derniere(l)}`)
}
// Un dossier ~/taches/<id> déjà présent sur l'usine (lancer refusé, code 3 : « a déjà un dossier ») : un lancement précédent
// n'a jamais été nettoyé (typiquement une fiche libérée après un recuperer — ou une question répondue — sans le nettoyer qui
// suit d'ordinaire). Le moteur se dépanne seul plutôt que de rebuter la fiche à chaque tour. Si le résultat est déjà rapatrié
// (.orchestre/travail/usine/<id>/resultat.patch ou etat.json), rien à perdre à nettoyer et relancer tout de suite. Sinon, le
// rapatriement n'a jamais eu lieu : `recuperer` d'abord (le traitement existant absorbe un PASS/FAIL/QUESTION), puis
// nettoyer --forcer ; c'est le tour suivant (prets()) qui la relance si elle n'a pas été tranchée par le recuperer.
function resoudreDossierExistant(e, r, voie) {
  const ici = path.join(ORCH, 'travail', 'usine', r.id)
  const dejaRapatrie = fs.existsSync(path.join(ici, 'resultat.patch')) || fs.existsSync(path.join(ici, 'etat.json'))
  if (dejaRapatrie) {
    log(`· ${r.id} : dossier de l'usine déjà présent (lancer refusé, code 3), déjà rapatrié (resultat.patch/etat.json) → nettoyer --forcer puis relancer`)
    const n = node(['scripts/usine.mjs', 'nettoyer', r.id, '--forcer'], { timeout: 5 * 60e3 })
    if (n.status !== 0) { log(`✗ ${r.id} : nettoyer --forcer a échoué (code ${n.status}) : ${derniere(n)}`); return }
    lancerUsine(e, r, voie, true)
    return
  }
  log(`· ${r.id} : dossier de l'usine déjà présent (lancer refusé, code 3), jamais rapatrié → recuperer puis nettoyer --forcer (relance au tour suivant)`)
  recupererUsine(e, r.id, voie === 'libre' ? e.libre : e.enCours, voie)
  const n = node(['scripts/usine.mjs', 'nettoyer', r.id, '--forcer'], { timeout: 5 * 60e3 })
  if (n.status !== 0) log(`✗ ${r.id} : nettoyer --forcer a échoué (code ${n.status}) : ${derniere(n)}`)
}
const lireVerrou = (id) => { try { return fs.readFileSync(path.join(ORCH, 'en-cours', `${id}.lock`), 'utf8') } catch { return null } }

// ── Antigravity (Gemini) sur le PC : MAX_AG à la fois ──────────────────────────────────────────────────────────────
const CONSIGNE_GEMINI = (id) => `${R.CONSIGNE_CROISEE}. La tâche ${id} est une fiche claude-code, déjà prise pour toi (.orchestre/en-cours/${id}.md) : l'orchestre la refuserait à ton nom, ne relance donc pas prochaine (s'il t'a répondu « rien à faire », c'est pour cela). Lis la fiche et fais le travail, dans son périmètre ; lance node scripts/orchestre.mjs verifier ${id} autant que nécessaire, mais laisse la fiche en en-cours/ : c'est Claude Code qui la passera en fait/ après sa relecture. Termine par une seule ligne : ${id} : PASS|FAIL — <ligne du verdict>.`
// L'état de chaque agent, lu dans `antigravity.mjs etat` (agent, tâche, où, état, dernier mot) ; le dernier agent de ce nom l'emporte.
function etatsAntigravity() {
  const r = node(['scripts/antigravity.mjs', 'etat'], { timeout: 120e3 })
  const out = {}
  for (const l of String(r.stdout || '').split('\n')) {
    const m = l.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(démarre|travaille|terminé|en attente \(a parlé\))( ⚠ QUESTION)?\s*(.*)$/)
    if (m) out[m[1]] = { etat: m[4], question: !!m[5], dernier: m[6].trim() }
  }
  return out
}
// L'instantané que antigravity.mjs a pris avant de lancer l'agent (décision D3) : le point de départ de ce qu'il a écrit.
function instantaneDe(agent) {
  const f = path.join(ORCH, 'agents.jsonl')
  if (!fs.existsSync(f)) return null
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((a) => a?.agent === agent && a.instantane).at(-1)?.instantane || null
}
// Un rouge de Gemini est retiré du PC comme celui de Codex : le patch de ce qu'il a écrit dans le périmètre depuis son instantané,
// gardé dans .orchestre/travail/antigravity/<id>/resultat.patch, puis git apply -R. Les preuves restent (elles disent le rouge).
function retirerAg(id, a, fiche) {
  const ref = instantaneDe(a.agent)
  if (!ref || !fs.existsSync(fiche)) { log(`⚠ ${id} : pas d'instantané de ${a.agent}, fichiers laissés en place (à regarder)`); return }
  const pers = [...new Set(R.prefixesPerimetre(fs.readFileSync(fiche, 'utf8')).map((p) => p.replace(/\/$/, '')))].filter((p) => !p.startsWith('.orchestre/'))
  const dossier = path.join(ORCH, 'travail', 'antigravity', id); fs.mkdirSync(dossier, { recursive: true })
  const index = path.join(dossier, 'index.tmp'); const patch = path.join(dossier, 'resultat.patch')
  const env = { ...process.env, GIT_INDEX_FILE: path.resolve(index) }
  const g = (a2) => spawnSync('git', a2, { encoding: 'utf8', env, maxBuffer: 1 << 28 })
  try {
    if (g(['read-tree', ref]).status) { log(`⚠ ${id} : instantané ${ref} illisible, fichiers laissés en place`); return }
    for (const p of pers) g(['add', '-A', '--', p])
    const d = spawnSync('git', ['diff', '--cached', '--binary', ref, '--', ...pers], { env, maxBuffer: 1 << 28 })
    fs.writeFileSync(patch, d.stdout || '')
  } finally { fs.rmSync(index, { force: true }) }
  if (!fs.statSync(patch).size) { log(`· ${id} : rien d'écrit par ${a.agent} dans le périmètre depuis son instantané`); return }
  const essai = run('git', ['apply', '-R', '--check', '--whitespace=nowarn', patch])
  if (essai.status || run('git', ['apply', '-R', '--whitespace=nowarn', patch]).status) { log(`⚠ ${id} : le travail de ${a.agent} ne se retire pas proprement (${String(essai.stderr || '').trim().split('\n')[0]}) : laissé en place, patch dans ${patch}`); return }
  log(`· ${id} : travail de ${a.agent} retiré du PC (git apply -R), il attend dans ${patch.split(path.sep).join('/')}`)
}
function rougeAg(e, id, raison) {
  e.rouges.push({ id, raison, date: new Date().toISOString() })
  log(`✗ ${id} rouge (Gemini) : ${raison}`)
  if (estDemande(id)) finirDemande(e, id, 'echec', { cr: `Gemini n'a pas abouti : ${raison}` })
}
function verifierEtCommiterAg(e, id, a) {
  const v = verifierFinal(id)
  const s = sortieDe(v)
  const ligne = ((s.match(new RegExp(`${id}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0] || s.trim().split('\n').pop() || '').slice(0, 200)
  const fait = path.join(ORCH, 'fait', `${id}.md`)
  if (!(v.status === 0 && new RegExp(`${id}\\s*:\\s*PASS`).test(s) && fs.existsSync(fait))) {
    rougeAg(e, id, `verdict du PC : ${ligne}`)
    retirerAg(id, a, [fait, path.join(ORCH, 'refuse', `${id}.md`)].find((x) => fs.existsSync(x)) || fait)
    return
  }
  const pers = perimetre(fait)
  const ts = pers.length > 0 && git('status', '--porcelain', '-uall', '--', ...pers).stdout.split('\n').some((l) => /\.tsx?$/.test(l.trim()))
  if (ts && !typesVerts()) {
    fs.renameSync(fait, path.join(ORCH, 'refuse', `${id}.md`))
    rougeAg(e, id, 'juge vert mais typecheck rouge → fiche en refuse/')
    retirerAg(id, a, path.join(ORCH, 'refuse', `${id}.md`))
    return
  }
  const ok = commiterEtPousser(`${id} : production par Gemini (Antigravity sur le PC, PASS du PC${ts ? ', typecheck vert' : ''}, moteur)`, [fait, path.join(ORCH, 'preuves', id), ...pers])
  if (ok) { e.faits.push(id); log(`✓ ${id} PASS (Gemini), commitée et poussée`) }
}
function suivreAg(e, id, st) {
  const a = e.ag[id]
  const ou = ouEst(id)
  const q = path.join(ORCH, 'en-cours', `${id}.question.md`)
  const question = fs.existsSync(q) && !fs.existsSync(q.replace(/\.question\.md$/, '.reponse.md'))
  const lent = () => { if (Date.now() - a.depuis > 3 * 3600e3 && !a.lent) { a.lent = true; log(`⚠ ${id} (${a.agent}) travaille depuis plus de 3 h`) } }
  // Arrêté sans verdict final ni question depuis plus de 2 h (« en attente (a parlé) ») : sa place Gemini est rendue.
  const arrete = st?.etat === 'en attente (a parlé)' && !question && Date.now() - a.depuis > 2 * 3600e3
  // Une fiche claude-code n'est jamais commitée, même si l'état du moteur a perdu sa marque de rédaction croisée.
  const croise = a.croise || (executantFiche(id) === 'claude-code' ? 'claude-code' : null)
  if (croise) {
    if (!(st?.etat === 'terminé' || ou === 'fait' || ou === 'refuse' || arrete)) {
      if (question && !a.questionDite) { a.questionDite = true; ecrireADecider(e, id, { qui: `Gemini (${a.agent}, rédaction croisée)`, texte: fs.readFileSync(q, 'utf8'), chemins: cheminsProduits(id), raison: 'rédaction croisée : jamais de réponse automatique ; l\'agent attend la réponse' }) }
      lent(); return
    }
    delete e.ag[id]
    remettreEnCours(id, a.lock)
    const v = dernierVerdict(id, a.depuis)
    ecrireARelire(e, id, {
      type: croise, redacteur: `Gemini (Antigravity sur le PC, agent ${a.agent}, modèle pro)`,
      verifier: v ? `${v.verdict}${v.ligne ? ' — ' + v.ligne : ''} (verifier lancé par l'agent, verdicts.jsonl, ${v.date})` : `aucun verdict enregistré depuis le lancement ; dernier mot de l'agent : ${st?.dernier || '—'}`,
      chemins: cheminsProduits(id),
    })
    return
  }
  if (ou === 'fait') { delete e.ag[id]; if (estDemande(id)) verifierEtLivrerDemandeAg(e, id, a); else verifierEtCommiterAg(e, id, a); return }
  if (ou === 'refuse') { delete e.ag[id]; rougeAg(e, id, `rendue FAIL par l'agent (fiche en refuse/) : ${(dernierVerdict(id, a.depuis) || {}).ligne || st?.dernier || '—'}`); retirerAg(id, a, path.join(ORCH, 'refuse', `${id}.md`)); return }
  if (question) {
    delete e.ag[id]
    // Gemini travaille sur le PC, avec ses variables locales : une question « juge vivant » n'a pas lieu d'être, elle va à Claude.
    ecrireADecider(e, id, { qui: `Gemini (${a.agent})`, texte: fs.readFileSync(q, 'utf8'), chemins: cheminsProduits(id) })
    rougeAg(e, id, `question posée (→ .orchestre/a-decider/${id}.md) — fiche en en-cours/, le moteur ne la suit plus`)
    return
  }
  if (ou === 'en-cours' && st?.etat === 'terminé') { delete e.ag[id]; rougeAg(e, id, `fini sans PASS, fiche en en-cours/ : ${st.dernier || '—'}`); return }
  if (ou === 'en-cours' && arrete) { delete e.ag[id]; rougeAg(e, id, `arrêté sans verdict depuis plus de 2 h (« en attente »), fiche en en-cours/, place Gemini rendue : ${st.dernier || '—'}`); return }
  // Fiche codex confiée à Gemini (ChatGPT éteint) que Gemini n'a pas prise parce que son quota est épuisé : place rendue, plus de Gemini pendant
  // 30 min, et la fiche repart sur la voie libre (geminiEcarte : le moteur ne la reconfie pas à Gemini).
  if (a.deCodex && ou === 'file' && QUOTA_GEMINI.test(st?.dernier || '')) {
    delete e.ag[id]; e.agQuota = Date.now() + 30 * 60e3; e.geminiEcarte[id] = new Date().toISOString()
    log(`⚠ ${id} : quota Gemini épuisé chez ${a.agent} (${st.dernier.slice(0, 100)}) : la fiche part sur la voie libre, plus de lancement chez Gemini pendant 30 min`)
    return
  }
  if (ou === 'file' && ((st && /terminé|en attente/.test(st.etat)) || Date.now() - a.depuis > 30 * 60e3)) {
    delete e.ag[id]; e.nonPrises[id] = new Date().toISOString()
    rougeAg(e, id, `non prise par ${a.agent} (fiche restée en file/ : ${st?.dernier || 'aucun mot'}) — le moteur ne la relance plus, à regarder`)
    return
  }
  lent()
}
// Rend 'ok' (lancée), 'attente' (périmètre en conflit, déjà dit), 'quota' (Gemini à sec ou Antigravity injoignable : la voie libre peut
// prendre le relais), 'echec' (autre refus, ou fiche non déposée : elle attend).
function lancerAg(e, r) {
  const fiche = [path.join(ORCH, 'file', `${r.id}.md`), path.join(B, `${r.id}.md`)].find((x) => fs.existsSync(x))
  const per = fiche ? R.prefixesPerimetre(fs.readFileSync(fiche, 'utf8')) : []
  // orchestre.mjs prochaine refuse une fiche dont le périmètre chevauche une fiche en cours : l'agent répondrait « rien à faire »
  // et une conversation Gemini serait brûlée. Elle attend.
  const conflit = [...dans('en-cours')].find((x) => R.chevauchent(per, R.prefixesPerimetre(fs.readFileSync(path.join(ORCH, 'en-cours', `${x}.md`), 'utf8'))))
  if (conflit) { if (e.attente[r.id] !== conflit) { e.attente[r.id] = conflit; log(`· ${r.id} attend : son périmètre chevauche ${conflit} (en cours)`) } return 'attente' }
  delete e.attente[r.id]
  if (!fs.existsSync(path.join(ORCH, 'file', `${r.id}.md`)) && !deposer(r)) return 'echec'
  const agent = `ag-${r.id}`
  let lock = null
  if (r.c.croise) {
    const p = R.prendreCroisee(process.cwd(), r.id, agent)
    if (!p.ok) { log(`✗ ${r.id} : prise refusée pour la rédaction croisée : ${p.sortie.trim().split('\n').pop()}`); return 'echec' }
    lock = p.lock
  }
  const l = node(['scripts/antigravity.mjs', 'lancer', agent, `--tache=${r.id}`, '--model=pro'], { timeout: 5 * 60e3 })
  if (l.status !== 0) {
    if (r.c.croise) node(['scripts/orchestre.mjs', 'liberer', r.id])
    if (/n'est pas ouvert|pas installé|aucun projet|aucun port|jeton CSRF/.test(sortieDe(l))) { e.agPanne = Date.now() + 30 * 60e3; log(`✗ Antigravity injoignable (${derniere(l).slice(0, 160)}) : plus de lancement chez Gemini pendant 30 min`); return 'quota' }
    if (QUOTA_GEMINI.test(sortieDe(l))) { e.agQuota = Date.now() + 30 * 60e3; log(`✗ ${r.id} : quota Gemini épuisé (${derniere(l).slice(0, 160)}) : plus de lancement chez Gemini pendant 30 min`); return 'quota' }
    log(`✗ ${r.id} : lancement chez Gemini refusé (code ${l.status}) : ${derniere(l).slice(0, 200)}`)
    return 'echec'
  }
  if (r.c.croise) {
    const d = node(['scripts/antigravity.mjs', 'dire', agent, CONSIGNE_GEMINI(r.id)], { timeout: 3 * 60e3 })
    if (d.status !== 0 || !/✓/.test(d.stdout || '')) {
      node(['scripts/orchestre.mjs', 'liberer', r.id]); e.nonPrises[r.id] = new Date().toISOString()
      rougeAg(e, r.id, `consigne de rédaction croisée non délivrée à ${agent} (${derniere(d).slice(0, 120)}) : fiche rendue à file/, le moteur ne la relance plus`)
      return 'echec'
    }
  }
  e.ag[r.id] = { depuis: Date.now(), agent, croise: r.c.croise ? r.c.type : null, lock, ...(r.c.voie === 'codex' ? { deCodex: true } : {}) }
  log(`→ ${r.id} lancée chez Gemini (Antigravity sur le PC, ${agent}${r.c.croise ? `, rédaction croisée ${r.c.type}` : ''}${r.c.voie === 'codex' ? ', fiche codex, ChatGPT éteint' : ''}) (${titre(r)})`)
  return 'ok'
}
// Fiche de prospection ? (règle de Benj : jamais chez un modèle gratuit ; et tant que ChatGPT est éteint, jamais chez Gemini non plus : Claude la prend.)
// L'admission de usine.mjs (--a-sec : rien n'est pris ni envoyé) applique la MÊME détection que la voie libre.
// true = prospection, false = non, null = fiche non déposée (relance au tour suivant).
function prospection(e, r) {
  if (!fs.existsSync(path.join(ORCH, 'file', `${r.id}.md`)) && !deposer(r)) return null
  const a = node(['scripts/usine.mjs', 'lancer', r.id, `--fournisseur=${LIBRE}`, '--a-sec'], { timeout: 2 * 60e3 })
  if (a.status !== 0 && /données de prospects/.test(sortieDe(a))) {
    e.sansLibre[r.id] = new Date().toISOString()
    log(`· ${r.id} touche des données de prospects : pas de voie libre, elle attend Codex sur l'abonnement`)
    return true
  }
  return false
}

// ── les demandes de Benj (0117) : Poste → bus → fiche dem-<id8> → Gemini, puis voie libre → BRANCHE demandes/dem-<id8> ──────────────────
// Jamais de commit ni de push sur main pour une demande : la livraison passe par DEM.livrerBranche (index temporaire, refspec explicite),
// puis le travail est retiré du PC (git apply -R). Une demande qui touche des données de prospects (admission à sec d'usine.mjs) n'est
// confiée ni à Gemini ni à la voie libre : elle reste « recue » avec « attend Claude (données de prospects) ». Le texte de Benj n'est
// jamais exécuté par le moteur : il n'est que copié, dans un bloc « donnée » de la fiche.
const DEMANDES_CLI = 'scripts/demandes-ecosysteme.mjs'
const uneLigne = (t, n = 1900) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n)
function majDemande(x, statut, { branche, cr } = {}) {
  const args = [DEMANDES_CLI, 'maj', x.uuid, `--statut=${statut}`]
  if (branche) args.push(`--branche=${branche}`)
  if (cr) args.push(`--cr=${uneLigne(cr)}`)
  const r = node(args, { timeout: 90e3 })
  if (r.status) log(`⚠ demande ${x.uuid.slice(0, 8)} : mise à jour « ${statut} » refusée (code ${r.status}) : ${derniere(r).slice(0, 160)}`)
  if (r.status === 0 && statut === 'en_cours') x.enCours = true
  return r.status === 0
}
// Rend la demande finie au bus ; si le bus ne répond pas, le tour suivant réessaie (aRendre).
function finirDemande(e, id, statut, { branche, cr } = {}) {
  const x = (e.demandes || {})[id]
  if (!x) return
  x.etat = 'fini'; x.fini = statut
  if (statut === 'faite' && !x.enCours) majDemande(x, 'en_cours') // le bus n'accepte « faite » qu'après « en_cours »
  if (!majDemande(x, statut, { branche, cr })) x.aRendre = { statut, branche, cr }
  log(`${statut === 'faite' ? '✓' : '✗'} demande ${id} ${statut}${branche ? ` sur la branche ${branche}` : ''} : ${uneLigne(cr, 200)}`)
}
// Le travail livré : la branche par la plomberie git (main ne bouge pas), puis retiré du PC.
function livrerDemande(e, id, { patch, fichierPatch, qui }) {
  const x = e.demandes[id]
  const message = `${id} : demande de Benj traitée par ${qui} (PASS du PC : typecheck et garde de commit ; branche à relire, jamais main)\n\nCo-Authored-By: Claude Opus 5.5 <[EMAIL_MASQUE]>`
  const res = DEM.livrerBranche({ racine: process.cwd(), id: x.uuid, patch, message, suppl: [`.orchestre/fait/${id}.md`, `.orchestre/preuves/${id}`] })
  const propre = res.ok || ['interdit', 'patch', 'vide'].includes(res.code) ? DEM.retirerPatch(process.cwd(), fichierPatch) : false
  if (res.ok) finirDemande(e, id, 'faite', { branche: res.branche, cr: `Traitée par ${qui} : typecheck et garde de commit verts, ${res.fichiers.length} fichier(s) sur la branche ${res.branche}, à relire avant de fusionner.${propre ? '' : ' Le travail est aussi resté dans l\'arbre du PC (retrait non propre) : à regarder.'}` })
  else finirDemande(e, id, 'echec', { cr: `${res.raison}${res.code === 'push' ? '' : propre ? ' Le travail a été retiré du PC.' : ' Le travail est resté dans l\'arbre du PC : à regarder.'}` })
}
function finirDemandeUsine(e, id, r, sortie) {
  const patch = path.join(ORCH, 'travail', 'usine', id, 'resultat.patch')
  if (r.status === 0 && fs.existsSync(path.join(ORCH, 'fait', `${id}.md`))) livrerDemande(e, id, { patch: fs.existsSync(patch) ? fs.readFileSync(patch, 'utf8') : '', fichierPatch: patch, qui: 'la voie libre' })
  else if (questionRapatriee(id, sortie)) finirDemande(e, id, 'echec', { cr: `L'exécutant a posé une question et personne ne peut y répondre : ${uneLigne(fs.readFileSync(path.join(ORCH, 'travail', 'usine', id, 'question.md'), 'utf8'), 600)}` })
  else finirDemande(e, id, 'echec', { cr: `Voie libre : ${sortie.split('\n').filter((l) => /✗|FAIL|QUESTION|QUOTA/.test(l)).slice(0, 2).join(' | ') || `code ${r.status}`}` })
  node(['scripts/usine.mjs', 'nettoyer', id, '--forcer'])
}
function verifierEtLivrerDemandeAg(e, id, a) {
  const v = verifierFinal(id)
  const s = sortieDe(v)
  const ligne = ((s.match(new RegExp(`${id}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0] || s.trim().split('\n').pop() || '').slice(0, 200)
  const fait = path.join(ORCH, 'fait', `${id}.md`)
  if (!(v.status === 0 && new RegExp(`${id}\\s*:\\s*PASS`).test(s) && fs.existsSync(fait))) {
    retirerAg(id, a, [fait, path.join(ORCH, 'refuse', `${id}.md`)].find((x) => fs.existsSync(x)) || fait)
    rougeAg(e, id, `verdict du PC : ${ligne}`)
    return
  }
  const ref = instantaneDe(a.agent)
  const patch = ref ? DEM.patchDepuisInstantane({ racine: process.cwd(), ref }) : null
  if (patch === null) { finirDemande(e, id, 'echec', { cr: `Le juge est vert mais le travail de ${a.agent} ne se relit pas (pas d'instantané) : rien n'est livré.` }); return }
  const dossier = path.join(ORCH, 'travail', 'antigravity', id); fs.mkdirSync(dossier, { recursive: true })
  const fichierPatch = path.join(dossier, 'resultat.patch'); fs.writeFileSync(fichierPatch, patch)
  livrerDemande(e, id, { patch, fichierPatch, qui: 'Gemini (Antigravity)' })
}
// Lance une demande : Gemini d'abord, puis la voie libre (jamais l'abonnement Codex). true = lancée.
function lancerDemande(e, id, x, d) {
  const r = { id, titre: 'demande de Benj', c: { voie: 'antigravity', croise: false, type: 'production' } }
  if (!agEnPanneDemande(e) && Object.keys(e.ag).length < MAX_AG) {
    const v = lancerAg(e, r)
    if (v === 'ok') { x.etat = 'lancee'; x.voie = 'ag'; majDemande(x, 'en_cours', { cr: 'Confiée à Gemini (Antigravity sur le PC).' }); return true }
    if (v === 'attente') return false
  }
  if (Object.keys(e.libre).length < MAX_LIBRE) {
    lancerUsine(e, r, 'libre')
    if (e.libre[id]) { x.etat = 'lancee'; x.voie = 'libre'; majDemande(x, 'en_cours', { cr: `Confiée à la voie libre (${LIBELLE_LIBRE[LIBRE]}).` }); return true }
  }
  return false
}
const agEnPanneDemande = (e) => (e.agPanne && Date.now() < e.agPanne) || (e.agQuota && Date.now() < e.agQuota)
function demandesTour(e) {
  if (!DEM || !fs.existsSync(DEMANDES_CLI) || 'sans-demandes' in ARGS) return
  e.demandes ||= {}
  for (const x of Object.values(e.demandes)) if (x.aRendre && majDemande(x, x.aRendre.statut, x.aRendre)) delete x.aRendre
  const l = node([DEMANDES_CLI, 'recues'], { timeout: 90e3 })
  if (l.status) { if (!e.demandesMuet) log(`· demandes : le bus ne les rend pas (code ${l.status}) : ${derniere(l).slice(0, 140)}`); e.demandesMuet = true; return }
  e.demandesMuet = false
  let liste
  try { liste = JSON.parse(l.stdout) } catch { return }
  for (const d of liste) {
    let id; try { id = DEM.idFiche(d.id) } catch { continue }
    const x = (e.demandes[id] ||= { uuid: d.id, etat: 'nouvelle', vue: new Date().toISOString() })
    if (x.etat !== 'nouvelle' && x.etat !== 'place') continue // attend Claude, lancée ou finie : rien à refaire
    if (x.etat === 'nouvelle') log(`→ demande ${id} reçue de Benj (${uneLigne(d.texte, 80)})`)
    DEM.ecrireFiche(process.cwd(), d)
    // L'admission à sec d'usine.mjs : la même détection que la voie libre ; la fiche ne porte que les mots de Benj (les contraintes fixes n'y répondent pas).
    const a = node(['scripts/usine.mjs', 'lancer', id, `--fournisseur=${LIBRE}`, '--a-sec'], { timeout: 2 * 60e3 })
    if (a.status !== 0 && /données de prospects/.test(sortieDe(a))) {
      fs.rmSync(path.join(ORCH, 'file', `${id}.md`), { force: true })
      x.etat = 'claude'; majDemande(x, 'recue', { cr: 'attend Claude (données de prospects)' })
      log(`· demande ${id} touche des données de prospects : ni Gemini ni voie libre, elle attend Claude`)
      continue
    }
    if (a.status !== 0) { fs.rmSync(path.join(ORCH, 'file', `${id}.md`), { force: true }); finirDemande(e, id, 'echec', { cr: `Admission refusée : ${derniere(a).slice(0, 300)}` }); continue }
    if (!lancerDemande(e, id, x, d)) {
      if (x.etat === 'nouvelle') { x.etat = 'place'; majDemande(x, 'recue', { cr: 'Reçue, en attente d\'une place chez Gemini ou sur la voie libre (d\'autres fiches occupent le dépôt ou les exécutants).' }) }
    }
  }
}

function tour() {
  const e = lireEtat()
  // 1. Rapatrier ce qui tourne sur l'usine (Codex, puis voie libre).
  for (const id of Object.keys(e.enCours)) recupererUsine(e, id, e.enCours, 'codex')
  for (const id of Object.keys(e.libre)) recupererUsine(e, id, e.libre, 'libre')
  // 2. Suivre Gemini sur le PC.
  if (Object.keys(e.ag).length) { const etats = etatsAntigravity(); for (const id of Object.keys(e.ag)) suivreAg(e, id, etats[e.ag[id].agent]) }
  // 3. Lancer ce qui est prêt : Codex jusqu'à MAX, puis la voie libre jusqu'à MAX_LIBRE ; Gemini jusqu'à MAX_AG.
  const agEnPanne = () => (e.agPanne && Date.now() < e.agPanne) || (e.agQuota && Date.now() < e.agQuota)
  for (const r of prets()) {
    if (Object.prototype.hasOwnProperty.call(lireEtat().enCours, r.id) || e.enCours[r.id] || e.libre[r.id] || e.ag[r.id]) continue
    const exclusif = bloqueParExclusif(r.id)
    if (exclusif) { if (e.attente[r.id] !== exclusif) { e.attente[r.id] = exclusif; log(`· ${r.id} attend : ${exclusif}`) } continue }
    if (r.c.voie === 'codex' && chatgptEteint()) {
      // ChatGPT éteint : la voie libre seulement. Croisée ou prospects : elles attendent le retour de l'abonnement.
      if (r.c.croise) { if (e.attente[r.id] !== 'ChatGPT') { e.attente[r.id] = 'ChatGPT'; log(`· ${r.id} attend le retour de ChatGPT (${new Date(RETOUR_CHATGPT).toISOString().slice(0, 16)}Z) : rédaction croisée, abonnement seulement`) } }
      else if (e.sansLibre[r.id]) { /* prospection : elle attend (Claude, ou le retour de ChatGPT) */ }
      else {
        // Gemini d'abord ; complet, injoignable, quota épuisé ou fiche écartée → la voie libre.
        if (!agEnPanne() && !e.nonPrises[r.id] && !e.geminiEcarte[r.id] && Object.keys(e.ag).length < MAX_AG) {
          if (prospection(e, r) !== false) continue // prospection (elle attend) ou fiche non déposée (relance au tour suivant)
          if (lancerAg(e, r) !== 'quota') continue // lancée, ou attente / refus déjà dit : jamais les deux voies à la fois
        }
        if (Object.keys(e.libre).length < MAX_LIBRE) lancerUsine(e, r, 'libre')
      }
    } else if (r.c.voie === 'codex') {
      if (Object.keys(e.enCours).length < MAX) lancerUsine(e, r, 'codex')
      else if (!r.c.croise && !e.sansLibre[r.id] && Object.keys(e.libre).length < MAX_LIBRE) lancerUsine(e, r, 'libre')
    } else if (r.c.voie === 'antigravity' && !agEnPanne() && !e.nonPrises[r.id] && Object.keys(e.ag).length < MAX_AG) lancerAg(e, r)
  }
  try { demandesTour(e) } catch (err) { log(`✗ demandes : ${err.message}`) } // après les fiches de la série : elles gardent la priorité sur les places
  ecrireEtat(e)
  return e
}

// 28/09 : le moteur poussait sans regarder Vercel ; 026-035 a cassé le build à 01:09 et personne ne l'a vu avant 09:40.
// Toutes les 30 min (un tour sur six), l'état du dernier déploiement ; s'il est en ERROR, une ligne ⚠ et ALERTE-deploiement.txt.
function surveillerDeploiement() {
  const d = spawnSync(process.execPath, ['scripts/deploiement-etat.mjs'], { encoding: 'utf8', timeout: 90_000 })
  const der = String(d.stdout ?? '').trim().split(/\r?\n/).at(-1) ?? ''
  const alerte = path.join(path.dirname(JOURNAL), 'ALERTE-deploiement.txt')
  if (/✗/.test(der)) { log(`⚠ DÉPLOIEMENT : ${der.slice(0, 160)}`); fs.writeFileSync(alerte, `${new Date().toISOString()} ${der}\n`) }
  else if (/✓/.test(der) && fs.existsSync(alerte)) fs.renameSync(alerte, alerte.replace(/\.txt$/, '-levee.txt'))
}
let tours = 0
log(`moteur démarré : ${chatgptEteint() ? `ChatGPT ÉTEINT jusqu'au ${new Date(RETOUR_CHATGPT).toISOString().slice(0, 16)}Z (toute la production Codex sur la voie libre) ; ` : ''}${MAX} fiches Codex à la fois, ${MAX_LIBRE} sur la voie libre (${LIBELLE_LIBRE[LIBRE]}), ${MAX_AG} chez Gemini (Antigravity sur le PC) ; rédactions croisées jamais commitées ; arrêt au plus tard dans ${ARGS.heures || 16} h, ou par ${STOP}`)
while (Date.now() < FIN && !fs.existsSync(STOP) && tours < TOURS) {
  try {
    const e = tour()
    log(`· tour : ${Object.keys(e.enCours).length} en cours, ${e.faits.length} faites par le moteur, ${e.rouges.length} rouges, ${prets().length} prêtes en attente · voie libre ${Object.keys(e.libre).length}/${MAX_LIBRE} · Gemini ${Object.keys(e.ag).length}/${MAX_AG} · à relire ${e.aRelire.length} · à décider ${e.aDecider.length}`)
  } catch (err) { log(`✗ tour interrompu : ${err.message}`) }
  if (tours++ % 6 === 0 && !('sans-deploiement' in ARGS)) { try { surveillerDeploiement() } catch (err) { log(`✗ surveillance du déploiement : ${err.message}`) } }
  if (tours < TOURS && PAUSE_S > 0) spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${Math.round(PAUSE_S * 1000)})`])
}
log('moteur arrêté')
