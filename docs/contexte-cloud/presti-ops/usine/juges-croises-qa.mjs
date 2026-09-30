#!/usr/bin/env node
// presti-ops/usine/juges-croises-qa.mjs — banc d'essai SANS RÉSEAU des juges croisés (décision de Benj du 28/09/2026 : aucune IA
// ne juge son propre travail), de la voie libre, d'Antigravity sur le PC et de la garde des imports.
//
// Ce qu'il prouve, chaque partie dans un dossier temporaire (jamais le vrai dépôt, jamais l'usine, jamais Antigravity) :
//   A. la répartition (scripts/usine-repartition.mjs) sur un INDEX d'essai : quelle fiche va où ;
//   B. l'admission de `usine.mjs lancer` : --fournisseur refusé net pour une fiche de prospects (rien n'est pris), --croise
//      refusé hors des deux cas (migration, juge de fiches antigravity), la consigne croisée mot pour mot ;
//   C. `usine.mjs tourner` : la voie libre commence au fournisseur demandé, et jamais pour une fiche de prospects
//      (doublures de scripts/fixtures/usine-relais/) ;
//   D. le moteur, trois tours dans un dépôt git jetable avec des doublures de usine.mjs, antigravity.mjs et orchestre.mjs :
//      Codex plein → voie libre, prospects → jamais de voie libre, Gemini pour antigravity, les rédactions croisées lancées au
//      bon endroit et JAMAIS commitées (fiche en en-cours/, .orchestre/a-relire/<id>.md, « ✍ … à relire par Claude »), même
//      quand l'état du moteur a perdu leur marque ; la garde des imports (un import hors de git refuse le commit, un import
//      suivi le laisse passer) ; un rouge de Gemini retiré du PC ;
//   V. (29/09) les vérifications lourdes SUR L'USINE : verifier-usine.mjs, verifier-final.mjs, head-pousse.mjs, et le moteur (Gemini jugé par verifier-final, typecheck
//      sur l'usine avec une nouvelle chance quand HEAD n'est pas poussé, PC en repli seulement) ;
//   E. commit-fiche.sh dans un dépôt jetable (PRESTI_RACINE) : même garde des imports ;
//   F. garde-imports.mjs en direct (analyse des imports, résolution) ;
//   G. le moteur seul sur les cas répétitifs, avec les trois vraies questions de Codex du 28/09 : « juge vivant sur le PC »
//      (068 : réponse automatique, PASS, commit ; 074 : FAIL du PC, patch rendu), toute autre question (049, une autre clé)
//      → .orchestre/a-decider/ et « ❓ » ; lib/flags.ts exclusif (une fiche à la fois, et pas tant qu'il est modifié non commité).
// Usage : node juges-croises-qa.mjs [--mutants[=V,D] [--paralleles=3]] [--garder] [--seul=A,B,…] [--cible-<moteur|usine|repartition|garde|commitFiche>=<fichier>]
//   --mutants : chaque capacité retirée sur une COPIE (moteur, usine, répartition) ; le banc doit rougir. Long (plusieurs minutes
//   par mutant de D ou G sur le PC) : à lancer en tâche de fond.
// Code : 0 tout vert (et chaque mutant rougit) ; 1 sinon. Fin de script par process.exitCode (Node 24 sous Windows).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const PRESTI = path.resolve(ICI, '..', '..', 'presti')
const FIX_RELAIS = path.join(PRESTI, 'scripts', 'fixtures', 'usine-relais')
const args = process.argv.slice(2)
const option = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); if (a) return a.slice(n.length + 3); return args.includes(`--${n}`) ? 'oui' : null }
const SEUL = option('seul') ? option('seul').split(',') : null
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'juges-croises-qa-'))
const BASH = ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe'].find((b) => fs.existsSync(b)) || 'bash'
const CIBLES = {
  usine: path.join(PRESTI, 'scripts', 'usine.mjs'),
  repartition: path.join(PRESTI, 'scripts', 'usine-repartition.mjs'),
  moteur: path.join(ICI, 'moteur.mjs'),
  garde: path.join(ICI, 'garde-imports.mjs'),
  commitFiche: path.join(ICI, 'commit-fiche.sh'),
  verifierUsine: path.join(ICI, 'verifier-usine.mjs'),
  verifierFinal: path.join(ICI, 'verifier-final.mjs'),
  headPousse: path.join(ICI, 'head-pousse.mjs'),
  demandes: path.join(PRESTI, 'scripts', 'demandes-ecosysteme.mjs'),
}
for (const k of Object.keys(CIBLES)) if (option(`cible-${k}`)) CIBLES[k] = path.resolve(option(`cible-${k}`)) // les mutants : une copie à juger
const CONSIGNE = 'Rédaction croisée (décision de Benj du 28/09) : tu rédiges ; Claude Code relira, attaquera par sabotages et commitera ; pour une migration, rien n\'est appliqué'

const ecrire = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t) }
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t }
const gitIn = (d, ...a) => spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=banc', '-c', 'user.email=[EMAIL_MASQUE]', '-c', 'commit.gpgsign=false', ...a], { cwd: d, encoding: 'utf8' })

// ── l'INDEX d'essai et ses fiches ───────────────────────────────────────────────────────────────────────────────
// Colonnes du vrai INDEX : | Id | Objet | Exécutant | Juge (`verifier`, écrit en) | Dépend de | PC éteint | Gestes de Benj |
const LIGNES = [
  ['026-920', 'Migration 0999 : table d\'essai', 'claude-code', '`scripts/sql-qa.mjs --migration=0999` (026-913)', 'supabase/migrations/0999_essai.sql, supabase/controles/0999_essai.sql'],
  ['026-905', 'Import des entreprises par SIREN', 'codex', '`scripts/e-qa.mjs` (026-910)', 'lib/import-e.ts', 'Croiser les entreprises par SIREN.'],
  ['026-901', 'Route A', 'codex', '`scripts/a-qa.mjs` (026-910)', 'lib/route-a.ts, lib/aide-a.ts'],
  ['026-902', 'Route B', 'codex (usine)', '`scripts/b-qa.mjs` (026-910)', 'lib/route-b.ts'],
  ['026-911', 'Juges des écrans C et D', 'claude-code', '`scripts/juges-911.mjs --preuve-echecs` (elle-même)', 'scripts/juges-911.mjs'],
  ['026-903', 'Écran C', 'antigravity', '`scripts/c-qa.mjs` (026-911)', 'lib/ecran-c.ts'],
  ['026-910', 'Juges des routes A et B', 'claude-code', '`scripts/juges-910.mjs` (elle-même)', 'scripts/juges-910.mjs'],
  ['026-904', 'Écran D', 'antigravity', '`scripts/d-qa.mjs --partie=x` (026-911, sauf méta-juge)', 'lib/ecran-d.ts'],
  ['026-907', 'Écran G', 'antigravity', '`scripts/g-qa.mjs` (026-912)', 'lib/ecran-g.ts'],
  ['026-906', 'Route F', 'codex', '`scripts/f-qa.mjs` (026-912)', 'lib/route-f.ts'],
  ['026-912', 'Juges mêlés (codex et antigravity)', 'claude-code', '`scripts/juges-912.mjs` (elle-même)', 'scripts/juges-912.mjs'],
  ['026-913', 'Juge des migrations', 'claude-code', '`scripts/juges-913.mjs --preuve-echecs` (elle-même)', 'scripts/juges-913.mjs'],
  ['026-914', 'Juge sans fiche', 'claude-code', '`scripts/juges-914.mjs` (elle-même)', 'scripts/juges-914.mjs'],
  ['026-921', 'Mise en service du banc', 'claude-code', '`scripts/x-qa.mjs --reel` (026-913)', 'docs/x.md'],
  ['026-922', 'Recette réelle du banc', 'claude-code', '`scripts/y-qa.mjs --reel` (026-913)', 'docs/y.md'],
  ['026-923', 'Épreuve des 24 h sans le poste', 'claude-code', '`scripts/z-qa.mjs --reel --fenetre=24` (026-913)', 'docs/z.md'],
  ['026-924', 'Juges lot B (juge écrit par un autre juge)', 'claude-code', '`scripts/juges-lt.mjs --lot=B` (026-913)', 'scripts/juges-lt.mjs'],
  ['026-930', 'Suite de la route A', 'codex', '`scripts/a-qa.mjs` (026-910)', 'lib/route-a2.ts', '', '026-901'],
]
const ATTENDU = {
  '026-920': ['codex', 'migration', true], '026-905': ['codex', 'production', false], '026-901': ['codex', 'production', false],
  '026-902': ['codex', 'production', false], '026-911': ['codex', 'juge', true], '026-903': ['antigravity', 'production', false],
  '026-910': ['antigravity', 'juge', true], '026-904': ['antigravity', 'production', false], '026-907': ['antigravity', 'production', false],
  '026-906': ['codex', 'production', false], '026-912': [null, 'juge', false], '026-913': [null, 'juge', false], '026-914': [null, 'juge', false],
  '026-921': [null, 'autre', false], '026-922': [null, 'autre', false], '026-923': [null, 'autre', false], '026-924': [null, 'autre', false],
  '026-930': ['codex', 'production', false],
}
const indexDe = (lignes) => [
  '# Série 026 — index d\'essai du banc des juges croisés', '',
  '| Id | Objet | Exécutant | Juge (`verifier`, écrit en) | Dépend de | PC éteint | Gestes de Benj |',
  '|---|---|---|---|---|---|---|',
  ...lignes.map(([id, objet, ex, juge, , , deps]) => `| ${id} | ${objet} | ${ex} | ${juge} | ${deps || '—'} | non | — |`),
  '', '| 026-910 (0094) | 026-910 (0096) |', '',
].join('\n')
const INDEX = indexDe(LIGNES)
const ficheDe = ([id, objet, ex, juge, per, texte]) => `---\nid: ${id}\ntype: feature\nobjectif: ${objet} (fiche du banc)\nperimetre: [${per}, .orchestre/preuves/${id}/**]\ninterdit: [app/**]\nverifier: node ${juge.match(/`([^`]+)`/)[1]}\nbudget: { fichiers: 3, minutes: 5 }\npreuve: sortie de verifier\nexecutant: ${ex.split(' ')[0]}\n---\n\n# ${id} — ${objet}\n\n${texte || 'Fiche du banc d\'essai des juges croisés.'}\n`

// ── les résultats ───────────────────────────────────────────────────────────────────────────────────────────────
function nouveauJuge() {
  const res = []
  const ok = (partie, nom, cond, detail = '') => { res.push({ partie, nom, ok: !!cond, detail }); return !!cond }
  return { res, ok }
}

// ── A. la répartition ──────────────────────────────────────────────────────────────────────────────────────────
async function partieA(J, cibles) {
  const R = await import(`${pathToFileURL(cibles.repartition).href}?${Date.now()}`)
  const lignes = R.lireIndex(INDEX)
  J.ok('A', 'l\'INDEX d\'essai se lit (18 fiches, la table de correspondance écartée)', lignes.length === LIGNES.length, `${lignes.length} lignes`)
  for (const [id, [voie, type, croise]] of Object.entries(ATTENDU)) {
    const l = lignes.find((x) => x.id === id)
    const c = l ? R.classer(l, lignes) : null
    J.ok('A', `${id} → ${voie || 'personne (Claude)'} · ${type}${croise ? ' · croisée' : ''}`, c && c.voie === voie && c.type === type && c.croise === croise, c ? `vu : ${c.voie} · ${c.type} · ${c.croise ? 'croisée' : 'non croisée'} — ${c.raison}` : 'ligne absente')
  }
  const adm = (id) => R.admettreCroise(id, INDEX)
  J.ok('A', 'admettreCroise : migration 026-920 admise', adm('026-920').ok && adm('026-920').type === 'migration')
  J.ok('A', 'admettreCroise : juge de fiches antigravity 026-911 admis', adm('026-911').ok && adm('026-911').type === 'juge')
  for (const id of ['026-910', '026-912', '026-913', '026-914', '026-921', '026-922', '026-923', '026-924', '026-901', '026-999']) J.ok('A', `admettreCroise : ${id} refusée`, !adm(id).ok, adm(id).raison)
  J.ok('A', 'la consigne croisée est mot pour mot celle de la décision', R.CONSIGNE_CROISEE === CONSIGNE)
}

// ── B. l'admission de usine.mjs lancer (à sec ou refus, sans réseau) ────────────────────────────────────────────────
function bacUsine(cibles) {
  const d = fs.mkdtempSync(path.join(TMP, 'B-'))
  ecrire(path.join(d, 'scripts', 'usine.mjs'), fs.readFileSync(cibles.usine, 'utf8'))
  ecrire(path.join(d, 'scripts', 'usine-repartition.mjs'), fs.readFileSync(cibles.repartition, 'utf8'))
  ecrire(path.join(d, 'scripts', 'orchestre.mjs'), "const [c] = process.argv.slice(2); if (c === 'valider') { console.log('✓ valide (doublure)'); process.exitCode = 0 } else { console.error('doublure : ' + c + ' interdit ici'); process.exitCode = 9 }\n")
  ecrire(path.join(d, '.orchestre', 'brouillons-ecosysteme', '026', 'INDEX.md'), INDEX)
  for (const l of LIGNES) ecrire(path.join(d, '.orchestre', 'file', `${l[0]}.md`), ficheDe(l))
  for (const x of ['en-cours', 'fait', 'refuse']) fs.mkdirSync(path.join(d, '.orchestre', x), { recursive: true })
  return d
}
function partieB(J, cibles) {
  const d = bacUsine(cibles)
  const lancer = (...a) => { const r = spawnSync(process.execPath, [path.join(d, 'scripts', 'usine.mjs'), 'lancer', ...a], { cwd: d, encoding: 'utf8', timeout: 60_000, env: { ...process.env, PRESTI_USINE: '[EMAIL_MASQUE]' } }); return { code: r.status, s: `${r.stdout || ''}${r.stderr || ''}` } }
  const intact = (id) => fs.existsSync(path.join(d, '.orchestre', 'file', `${id}.md`)) && !fs.existsSync(path.join(d, '.orchestre', 'agents.jsonl'))
  let r = lancer('026-901', '--fournisseur=fl', '--a-sec')
  J.ok('B', '--fournisseur=fl --a-sec sur une fiche sans prospects : admise', r.code === 0 && /admise sur la voie libre/.test(r.s), `code ${r.code} : ${court(r.s)}`)
  for (const f of ['ol', 'fl']) {
    r = lancer('026-905', `--fournisseur=${f}`)
    J.ok('B', `--fournisseur=${f} sur une fiche de prospects : refus net, rien n'est pris`, r.code === 1 && /touche des données de prospects/.test(r.s) && /SIREN/.test(r.s) && intact('026-905'), `code ${r.code} : ${court(r.s)}`)
  }
  r = lancer('026-901', '--fournisseur=zz', '--a-sec')
  J.ok('B', '--fournisseur inconnu : usage (code 2)', r.code === 2, `code ${r.code}`)
  r = lancer('026-920', '--croise', '--a-sec')
  J.ok('B', '--croise sur une migration : admise, consigne mot pour mot', r.code === 0 && /rédaction croisée \(migration\)/.test(r.s) && r.s.includes(CONSIGNE) && /tu ne l'appliques jamais/.test(r.s), `code ${r.code} : ${court(r.s, 300)}`)
  r = lancer('026-911', '--croise', '--a-sec')
  J.ok('B', '--croise sur un juge de fiches antigravity : admis', r.code === 0 && /rédaction croisée \(juge\)/.test(r.s) && r.s.includes(CONSIGNE), `code ${r.code} : ${court(r.s)}`)
  for (const [id, pourquoi] of [['026-910', 'juge de fiches Codex (c\'est Gemini qui le rédige)'], ['026-912', 'juge de fiches mêlées'], ['026-913', 'juge de fiches claude-code'], ['026-914', 'juge sans fiche'], ['026-921', 'mise en service'], ['026-922', 'recette'], ['026-923', 'épreuve']]) {
    r = lancer(id, '--croise', '--a-sec')
    J.ok('B', `--croise refusé : ${id}, ${pourquoi}`, r.code === 1 && /--croise refusé/.test(r.s) && intact(id), `code ${r.code} : ${court(r.s)}`)
  }
  r = lancer('026-920', '--a-sec')
  J.ok('B', 'fiche claude-code sans --croise : toujours réservée', r.code === 1 && /réservée à claude-code/.test(r.s), `code ${r.code}`)
  r = lancer('026-901', '--croise', '--a-sec')
  J.ok('B', '--croise sur une fiche codex : refusé', r.code === 1 && /réservé aux fiches claude-code/.test(r.s), `code ${r.code}`)
  r = lancer('026-920', '--croise', '--fournisseur=ol', '--a-sec')
  J.ok('B', '--croise avec --fournisseur : refusé (une rédaction croisée reste sur l\'abonnement)', r.code === 2, `code ${r.code}`)
}

// ── C. tourner : la voie libre commence au fournisseur demandé ───────────────────────────────────────────────────
function partieC(J, cibles) {
  const ID = '099-banc-libre'
  const cas = [
    { nom: 'fl', fournisseur: 'fl', texte: '', env: {}, attendu: { code: 0, appels: ['fl'], modele: 'gpt-oss-120b' } },
    { nom: 'ol-puis-fl', fournisseur: 'ol', texte: '', env: { BANC_EPUISES: 'ol' }, attendu: { code: 0, appels: ['ol', 'fl'] } },
    { nom: 'prospects', fournisseur: 'ol', texte: 'Dédoublonner les SIRETs des prospects.', env: {}, attendu: { code: 3, appels: [], ligne: /voie libre refusée/ } },
    { nom: 'fl-sans-cle', fournisseur: 'fl', texte: '', env: {}, cle: false, attendu: { code: 3, appels: [], ligne: /clé absente/ } },
  ]
  for (const c of cas) {
    const racine = fs.mkdtempSync(path.join(TMP, `C-${c.nom}-`))
    const tache = path.join(racine, 'tache'); const arbre = path.join(tache, 'arbre'); const home = path.join(racine, 'home')
    for (const x of ['.orchestre/file', '.orchestre/en-cours', '.orchestre/fait', '.orchestre/refuse', '.orchestre/travail/usine', 'scripts']) fs.mkdirSync(path.join(arbre, x), { recursive: true })
    ecrire(path.join(arbre, '.orchestre', 'file', `${ID}.md`), `---\nid: ${ID}\nexecutant: codex\nperimetre: [scripts/banc-libre.mjs]\nverifier: node scripts/banc-juge.mjs\n---\n# ${ID}\n\nAjouter une ligne.${c.texte ? ' ' + c.texte : ''}\n`)
    ecrire(path.join(arbre, '.orchestre', 'travail', 'usine', `${ID}.prompt.md`), 'Prends la fiche et fais-la.\n')
    fs.copyFileSync(path.join(FIX_RELAIS, 'faux-verificateur.mjs'), path.join(arbre, 'scripts', 'orchestre.mjs'))
    fs.copyFileSync(cibles.usine, path.join(tache, 'usine.mjs'))
    ecrire(path.join(tache, 'config.json'), JSON.stringify({ id: ID, agent: 'usine-codex-banc', modele: 'gpt-6-sol', effort: 'medium', minutes: 2, tours: 1, fournisseur: c.fournisseur, croise: null }))
    if (c.cle !== false) ecrire(path.join(home, '.config', 'presti', 'freellmapi.key'), 'cle-factice-du-banc-libre-4b2\n')
    else fs.mkdirSync(home, { recursive: true })
    const journal = path.join(racine, 'banc.jsonl')
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(FL_KEY|PRESTI_|BANC_)/.test(k)))
    Object.assign(env, { HOME: home, USERPROFILE: home, PRESTI_CODEX_BIN: path.join(FIX_RELAIS, 'faux-codex.mjs'), PRESTI_CONSEIL_BIN: path.join(FIX_RELAIS, 'faux-conseil.mjs'), BANC_JOURNAL: journal, BANC_VERDICTS: 'PASS', ...c.env })
    const r = spawnSync(process.execPath, [path.join(tache, 'usine.mjs'), 'tourner', tache], { cwd: racine, env, encoding: 'utf8', timeout: 90_000 })
    const ev = (lire(journal) || '').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.qui === 'codex')
    let etat = null; try { etat = JSON.parse(lire(path.join(tache, 'etat.json'))) } catch { /* rien */ }
    const appels = ev.map((x) => x.fournisseur)
    const D = []
    if (r.status !== c.attendu.code) D.push(`code ${r.status} (${c.attendu.code} attendu) — ${court(etat?.ligne || r.stdout + r.stderr)}`)
    if (appels.join(',') !== c.attendu.appels.join(',')) D.push(`appels de Codex [${appels}] ([${c.attendu.appels}] attendu)`)
    if (appels.includes('chatgpt')) D.push('l\'abonnement ChatGPT a servi une fiche de la voie libre')
    if (c.attendu.modele && ev[0]?.modele !== c.attendu.modele) D.push(`modèle ${ev[0]?.modele} (${c.attendu.modele} attendu)`)
    if (c.attendu.ligne && !c.attendu.ligne.test(etat?.ligne || '')) D.push(`etat.json ligne « ${court(etat?.ligne)} »`)
    if (c.attendu.code === 0 && !/voie libre : le relais commence à/.test(lire(path.join(tache, 'codex.log')) || '')) D.push('codex.log ne dit pas où commence le relais')
    J.ok('C', `tourner --fournisseur=${c.fournisseur} : ${c.nom}`, !D.length, D.join(' ; '))
  }
}

// ── D. le moteur dans un dépôt jetable ─────────────────────────────────────────────────────────────────────────
// Les doublures lisent BANC_DIR/banc.json (le scénario) et notent chaque appel dans BANC_DIR/appels.jsonl.
const DOUBLURE_COMMUNE = `import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const BANC = process.env.BANC_DIR
const sc = () => { try { return JSON.parse(fs.readFileSync(path.join(BANC, 'banc.json'), 'utf8')) } catch { return {} } }
const noter = (o) => fs.appendFileSync(path.join(BANC, 'appels.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\\n')
const O = '.orchestre'
const f = (d, id) => path.join(O, d, id + '.md')
const bouger = (id, de, vers) => { fs.mkdirSync(path.join(O, vers), { recursive: true }); fs.renameSync(f(de, id), f(vers, id)) }
const ecrireFichiers = (fichiers) => { for (const [p, t] of Object.entries(fichiers || {})) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t) } }
const args = process.argv.slice(2)
const opt = (n) => { const a = args.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : (args.includes('--' + n) ? 'oui' : null) }
const pos = args.filter((a) => !a.startsWith('--'))
`
const FAUX_ORCHESTRE = `${DOUBLURE_COMMUNE}
const [cmd, id0] = pos
noter({ qui: 'orchestre', args })
if (cmd === 'valider') { console.log('✓ valide'); process.exitCode = 0 }
else if (cmd === 'prochaine') {
  const id = opt('tache'); const agent = opt('agent')
  if (!fs.existsSync(f('file', id))) { console.log('Aucune tâche ' + id + ' dans file/'); process.exitCode = 2 }
  else { bouger(id, 'file', 'en-cours'); fs.writeFileSync(path.join(O, 'en-cours', id + '.lock'), 'agent: ' + agent + '\\ndepuis: banc\\nsha: banc\\n'); console.log('# Tâche ' + id + ' prise par ' + agent); process.exitCode = 0 }
} else if (cmd === 'liberer') { if (fs.existsSync(f('en-cours', id0))) bouger(id0, 'en-cours', 'file'); fs.rmSync(path.join(O, 'en-cours', id0 + '.lock'), { force: true }); process.exitCode = 0 }
else if (cmd === 'verifier') {
  const v = (sc().verdicts || {})[id0] || 'PASS'
  const ou = ['fait', 'en-cours'].find((d) => fs.existsSync(f(d, id0)))
  fs.appendFileSync(path.join(O, 'verdicts.jsonl'), JSON.stringify({ id: id0, verdict: v, ligne: v === 'PASS' ? '' : 'critère BANC rouge', date: new Date().toISOString(), dossier: ou }) + '\\n')
  if (ou === 'fait' && v === 'FAIL') bouger(id0, 'fait', 'refuse')
  if (ou === 'fait') for (const s of ['.lock', '.avant.txt']) fs.rmSync(path.join(O, 'en-cours', id0 + s), { force: true })
  console.log((v === 'PASS' ? '✓ ' : '✗ ') + id0 + ' : ' + v + (v === 'PASS' ? '' : ' — critère BANC rouge') + ' · 1s')
  process.exitCode = v === 'PASS' ? 0 : 1
} else { console.error('doublure orchestre : ' + cmd); process.exitCode = 2 }
`
const FAUX_USINE = `${DOUBLURE_COMMUNE}
const [cmd, id] = pos
noter({ qui: 'usine', args })
const s = sc()
if (cmd === 'lancer') {
  const texte = fs.existsSync(f('file', id)) ? fs.readFileSync(f('file', id), 'utf8') : ''
  const marqueurNettoye = path.join(BANC, 'nettoye-' + id)
  if (opt('a-sec')) {
    if (opt('fournisseur') && /SIREN/.test(texte)) { console.error('✗ ' + id + ' touche des données de prospects (SIREN / SIRET / Sirene) : --fournisseur=' + opt('fournisseur') + ' refusé'); process.exitCode = 1 }
    else if (!fs.existsSync(f('file', id))) { console.error('✗ ' + id + " n'est pas dans .orchestre/file/"); process.exitCode = 1 }
    else { console.log('✓ ' + id + ' admise — à sec : rien de pris ni d envoye'); process.exitCode = 0 }
  }
  else if ((s.dossierDeja || {})[id] && !fs.existsSync(marqueurNettoye)) { console.error('✗ l usine a déjà un dossier /home/usine/taches/' + id + ' : node scripts/usine.mjs recuperer ' + id + ', puis nettoyer ' + id); process.exitCode = 3 }
  else if (opt('fournisseur') && /SIREN/.test(texte)) { console.error('✗ ' + id + ' touche des données de prospects (SIREN / SIRET / Sirene) : --fournisseur=' + opt('fournisseur') + ' refusé'); process.exitCode = 1 }
  else if (!fs.existsSync(f('file', id))) { console.error('✗ ' + id + " n'est pas dans .orchestre/file/"); process.exitCode = 1 }
  else {
    const agent = 'usine-codex-' + id.slice(4)
    bouger(id, 'file', 'en-cours'); fs.writeFileSync(path.join(O, 'en-cours', id + '.lock'), 'agent: ' + agent + '\\ndepuis: banc\\nsha: banc\\n')
    const ici = path.join(O, 'travail', 'usine', id); fs.mkdirSync(ici, { recursive: true })
    fs.writeFileSync(path.join(ici, 'config.json'), JSON.stringify({ id, agent, croise: opt('croise') ? 'oui' : null, fournisseur: opt('fournisseur') }))
    console.log('✓ ' + agent + ' → ' + id + ' lancé'); process.exitCode = 0
  }
} else if (cmd === 'recuperer') {
  const c = (s.recuperer || {})[id] || 'encours'
  const ici = path.join(O, 'travail', 'usine', id); fs.mkdirSync(ici, { recursive: true })
  const fichiers = (s.fichiers || {})[id] || {}
  if (c === 'encours') { console.log('… ' + id + ' en cours'); process.exitCode = 4 }
  else if (c === 'rouge') { console.log('✗ ' + id + ' : FAIL — critère rouge (doublure)'); process.exitCode = 1 }
  else {
    ecrireFichiers(fichiers)
    fs.writeFileSync(path.join(ici, 'resultat.patch'), Object.keys(fichiers).map((p) => '+++ b/' + p).join('\\n') + '\\n')
    fs.writeFileSync(path.join(ici, 'rapatries.txt'), Object.keys(fichiers).map((p) => 'A\\t' + p).join('\\n') + '\\n')
    if (c === 'pass') { bouger(id, 'en-cours', 'fait'); console.log('✓ ' + id + ' : PASS sur le PC'); process.exitCode = 0 }
    else if (c === 'pass-reel') {
      const liste = Object.keys(fichiers)
      execFileSync('git', ['add', '-N', '--', ...liste])
      const p = execFileSync('git', ['diff', '--binary', '--', ...liste], { encoding: 'utf8' })
      execFileSync('git', ['reset', '-q', '--', ...liste])
      fs.writeFileSync(path.join(ici, 'resultat.patch'), p)
      bouger(id, 'en-cours', 'fait'); console.log('✓ ' + id + ' : PASS sur le PC'); process.exitCode = 0
    }
    else if (c === 'croise') { fs.writeFileSync(path.join(ici, 'verdict-pc.json'), JSON.stringify({ verdict: 'À RELIRE', croise: s.types[id], redacteur: 'usine-codex-' + id.slice(4), verdictUsine: 'PASS', ligneUsine: id + ' : PASS — juge statique (doublure)' })); console.log('✍ ' + id + ' : à relire'); process.exitCode = 0 }
    else if (c === 'croise-mais-fait') { bouger(id, 'en-cours', 'fait'); fs.writeFileSync(path.join(ici, 'verdict-pc.json'), JSON.stringify({ verdict: 'PASS', ligne: id + ' : PASS (doublure fautive)' })); console.log('✓ ' + id + ' : PASS'); process.exitCode = 0 }
    else if (c === 'question') {
      // Comme le vrai recuperer sur un QUESTION : un vrai patch git rapatrié mais NON appliqué, la question copiée en en-cours/.
      const liste = Object.keys(fichiers)
      execFileSync('git', ['add', '-N', '--', ...liste])
      const p = execFileSync('git', ['diff', '--binary', '--', ...liste], { encoding: 'utf8' })
      execFileSync('git', ['reset', '-q', '--', ...liste])
      for (const x of liste) fs.rmSync(x)
      fs.writeFileSync(path.join(ici, 'resultat.patch'), p)
      fs.writeFileSync(path.join(ici, 'rapatries.txt'), liste.map((x) => 'A\\t' + x).join('\\n') + '\\n')
      fs.writeFileSync(path.join(ici, 'question.md'), s.questions[id])
      fs.writeFileSync(path.join(O, 'en-cours', id + '.question.md'), s.questions[id])
      console.log("? Codex a posé une question : .orchestre/en-cours/" + id + ".question.md. Rien n'est appliqué.")
      process.exitCode = 1
    }
  }
} else if (cmd === 'executer') {
  const seq = s.executer || []; const nf = path.join(BANC, 'exec-n'); const n = fs.existsSync(nf) ? Number(fs.readFileSync(nf, 'utf8')) : 0; fs.writeFileSync(nf, String(n + 1))
  const rr = seq[n] || { code: 0 }; if (rr.erreur) console.error(rr.erreur); process.exitCode = rr.code
} else if (cmd === 'nettoyer') { fs.writeFileSync(path.join(BANC, 'nettoye-' + id), '1'); process.exitCode = 0 }
else { console.error('doublure usine : ' + cmd); process.exitCode = 2 }
`
const FAUX_ANTIGRAVITY = `${DOUBLURE_COMMUNE}
const [cmd, agent] = pos
noter({ qui: 'antigravity', args })
const s = sc()
if (cmd === 'lancer') {
  const id = opt('tache')
  // Quota Gemini épuisé (scénario agQuota) : le vrai lancer sort en erreur, rien n'est pris.
  if (s.agQuota) { console.error('✗ RESOURCE_EXHAUSTED (429) : quota Gemini épuisé'); process.exit(1) }
  // L'instantané de antigravity.mjs (index temporaire, commit rangé sous refs/instantanes/) : le point de départ d'un retrait.
  const idx = path.join(BANC, 'instantane-' + Date.now() + '.index')
  const g = (a) => execFileSync('git', a, { encoding: 'utf8', env: { ...process.env, GIT_INDEX_FILE: idx } }).trim()
  g(['read-tree', 'HEAD']); g(['add', '-A', '--', '.'])
  const commit = g(['-c', 'user.name=banc', '-c', 'user.email=[EMAIL_MASQUE]', 'commit-tree', g(['write-tree']), '-p', 'HEAD', '-m', 'instantané ' + agent])
  const ref = 'refs/instantanes/' + agent + '-' + Date.now(); g(['update-ref', ref, commit]); fs.rmSync(idx, { force: true })
  fs.appendFileSync(path.join(O, 'agents.jsonl'), JSON.stringify({ agent, tache: id, modele: opt('model'), conversationId: 'conv-' + id, instantane: ref }) + '\\n')
  if ((s.agPrend || {})[id] && fs.existsSync(f('file', id))) { bouger(id, 'file', 'en-cours'); fs.writeFileSync(path.join(O, 'en-cours', id + '.lock'), 'agent: ' + agent + '\\ndepuis: banc\\nsha: banc\\n') }
  console.log('✓ ' + agent + ' → ' + id + ' lancé (' + opt('model') + ') · conversation conv-' + id); process.exitCode = 0
} else if (cmd === 'dire') { console.log('✓ dit à ' + agent); process.exitCode = 0 }
else if (cmd === 'etat') {
  console.log('agent     tâche    où        état                  dernier mot')
  for (const [a, e] of Object.entries(s.agEtat || {})) console.log(a.padEnd(9) + ' ' + a.slice(3).padEnd(8) + ' ' + 'en-cours'.padEnd(9) + ' ' + e.padEnd(21) + ' ' + ((s.agDernier || {})[a.slice(3)] || 'dernier mot du banc'))
  process.exitCode = 0
} else { console.error('doublure antigravity : ' + cmd); process.exitCode = 2 }
`
function bacMoteur(cibles, { lignes = LIGNES, prefixe = 'D-', enCours = [['026-925', 'Migration 0998 : marque perdue', 'claude-code', '`scripts/sql-qa.mjs --migration=0998` (026-913)', 'supabase/migrations/0998_perdue.sql']] } = {}) {
  const d = fs.mkdtempSync(path.join(TMP, prefixe))
  const depot = path.join(d, 'presti'); const ops = path.join(d, 'presti-ops', 'usine'); const origine = path.join(d, 'origine.git')
  fs.mkdirSync(ops, { recursive: true })
  gitIn(d, 'init', '-q', '--bare', '-b', 'main', origine)
  gitIn(d, 'init', '-q', '-b', 'main', depot)
  ecrire(path.join(depot, '.gitignore'), '.orchestre/travail/\n')
  ecrire(path.join(depot, 'scripts', 'usine-repartition.mjs'), fs.readFileSync(cibles.repartition, 'utf8'))
  ecrire(path.join(depot, 'scripts', 'orchestre.mjs'), FAUX_ORCHESTRE)
  ecrire(path.join(depot, 'scripts', 'usine.mjs'), FAUX_USINE)
  ecrire(path.join(depot, 'scripts', 'antigravity.mjs'), FAUX_ANTIGRAVITY)
  ecrire(path.join(depot, 'lib', 'suivi.ts'), 'export const suivi = 1\n')
  ecrire(path.join(depot, 'lib', 'flags.ts'), 'export const drapeaux = {}\n')
  ecrire(path.join(depot, '.orchestre', 'brouillons-ecosysteme', '026', 'INDEX.md'), indexDe(lignes))
  for (const l of lignes) ecrire(path.join(depot, '.orchestre', 'brouillons-ecosysteme', '026', `${l[0]}.md`), ficheDe(l))
  // Hors scénario de l'INDEX (D) : 026-925, une migration claude-code dont l'état du moteur a perdu la marque « croisée ».
  // En G : les fiches dont Codex rend une question, déjà en en-cours/.
  for (const l of enCours) {
    ecrire(path.join(depot, '.orchestre', 'en-cours', `${l[0]}.md`), ficheDe(l))
    ecrire(path.join(depot, '.orchestre', 'en-cours', `${l[0]}.lock`), `agent: usine-codex-${l[0].slice(4)}\ndepuis: banc\nsha: banc\n`)
  }
  for (const x of ['file', 'fait', 'refuse', 'preuves']) ecrire(path.join(depot, '.orchestre', x, '.garde'), '')
  // Suivis dans le vrai dépôt : le moteur et commit-fiche.sh les joignent à chaque commit.
  ecrire(path.join(depot, '.orchestre', 'digest.md'), '# digest\n'); ecrire(path.join(depot, '.orchestre', 'verdicts.jsonl'), '')
  gitIn(depot, 'add', '-A'); gitIn(depot, 'commit', '-q', '-m', 'dépôt du banc')
  gitIn(depot, 'remote', 'add', 'origin', origine); gitIn(depot, 'push', '-q', 'origin', 'main')
  ecrire(path.join(ops, 'moteur-etat.json'), JSON.stringify({ enCours: Object.fromEntries(enCours.map((l) => [l[0], Date.now()])), faits: [], rouges: [] }))
  // Un fichier présent sur le PC mais hors de git, qu'une fiche de Gemini importera.
  ecrire(path.join(depot, 'lib', 'hors-git.ts'), 'export const horsGit = 1\n')
  return { d, depot, ops }
}
function tourMoteur(b, moteur, scenario, extra = [], env = {}) {
  ecrire(path.join(b.d, 'banc.json'), JSON.stringify(scenario))
  const avant = (lire(path.join(b.ops, 'moteur.log')) || '').length
  const r = spawnSync(process.execPath, [moteur, '--max=1', '--max-libre=1', '--max-ag=2', '--tours=1', '--pause=0', '--sans-deploiement', ...extra], { cwd: b.depot, encoding: 'utf8', timeout: 240_000, env: { ...process.env, BANC_DIR: b.d, ...env } })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`, journal: (lire(path.join(b.ops, 'moteur.log')) || '').slice(avant) }
}
const appelsDe = (b) => (lire(path.join(b.d, 'appels.jsonl')) || '').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const aLance = (b, qui, id, drapeau) => appelsDe(b).filter((a) => a.qui === qui && a.args[0] === 'lancer' && !a.args.includes('--a-sec') && a.args.some((x) => x === id || x === `--tache=${id}`) && (!drapeau || a.args.includes(drapeau)))
const etatMoteur = (b) => JSON.parse(lire(path.join(b.ops, 'moteur-etat.json')))
// HEAD (commité localement) : jamais --all, qui compterait les instantanés locaux d'Antigravity (refs/instantanes, jamais poussés).
const dansGit = (b, chemin) => gitIn(b.depot, 'log', 'HEAD', '--format=%h', '--', chemin).stdout.trim() !== ''
const dansOrigine = (b, chemin) => gitIn(b.depot, 'log', 'origin/main', '--format=%h', '--', chemin).stdout.trim() !== ''
const ou = (b, id) => ['en-cours', 'fait', 'refuse', 'file'].find((x) => fs.existsSync(path.join(b.depot, '.orchestre', x, `${id}.md`))) || null

function partieD(J, cibles) {
  const b = bacMoteur(cibles)
  const TYPES = { '026-920': 'migration', '026-911': 'juge' }
  // Tour 1 : les lancements. MAX=2 (dont une place tenue par 026-925), MAX_LIBRE=1, MAX_AG=2.
  let t = tourMoteur(b, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agPrend: { '026-903': true } }, ['--max=2'])
  J.ok('D', 'tour 1 : le moteur tourne et s\'arrête de lui-même', t.code === 0 && /moteur arrêté/.test(t.journal), `code ${t.code} : ${court(t.sortie, 300)}`)
  J.ok('D', 'migration 026-920 → Codex sur l\'usine en rédaction croisée (lancer --croise)', aLance(b, 'usine', '026-920', '--croise').length === 1 && /026-920 lancée sur l'usine en rédaction croisée \(migration\)/.test(t.journal), court(t.journal, 400))
  J.ok('D', 'Codex plein → 026-905 (prospects) essaie la voie libre, refusée, notée « attend Codex »', aLance(b, 'usine', '026-905', '--fournisseur=ol').length === 1 && /026-905 touche des données de prospects : pas de voie libre/.test(t.journal) && !!etatMoteur(b).sansLibre['026-905'])
  J.ok('D', 'Codex plein → 026-901 part sur la voie libre (--fournisseur=ol)', aLance(b, 'usine', '026-901', '--fournisseur=ol').length === 1 && !!etatMoteur(b).libre['026-901'] && /026-901 lancée sur la voie libre/.test(t.journal))
  J.ok('D', 'Codex et voie libre pleins → 026-902 attend', aLance(b, 'usine', '026-902').length === 0)
  J.ok('D', 'juge de fiches antigravity 026-911 : jamais sur la voie libre (attend Codex)', aLance(b, 'usine', '026-911').length === 0)
  J.ok('D', 'production antigravity 026-903 → Gemini sur le PC (lancer ag-026-903 --tache=026-903 --model=pro)', appelsDe(b).some((a) => a.qui === 'antigravity' && a.args.join(' ') === 'lancer ag-026-903 --tache=026-903 --model=pro'))
  const dire910 = appelsDe(b).find((a) => a.qui === 'antigravity' && a.args[0] === 'dire' && a.args[1] === 'ag-026-910')
  J.ok('D', 'juge de fiches Codex 026-910 → Gemini, pris par le moteur sous « claude-code », consigne croisée dite', aLance(b, 'antigravity', '026-910').length === 1 && appelsDe(b).some((a) => a.qui === 'orchestre' && a.args.join(' ') === 'prochaine --agent=claude-code --tache=026-910') && !!dire910 && dire910.args.slice(2).join(' ').includes(CONSIGNE), court(dire910?.args.slice(2).join(' ')))
  J.ok('D', 'le verrou de 026-910 nomme le vrai rédacteur (ag-026-910)', /^agent: ag-026-910$/m.test(lire(path.join(b.depot, '.orchestre', 'en-cours', '026-910.lock')) || ''))
  J.ok('D', 'MAX_AG=2 : 026-904 et 026-907 attendent', aLance(b, 'antigravity', '026-904').length === 0 && aLance(b, 'antigravity', '026-907').length === 0)
  const jamais = ['026-912', '026-913', '026-914', '026-921', '026-922', '026-923', '026-924', '026-930']
  J.ok('D', `jamais lancées : ${jamais.join(', ')} (Claude, autres types, dépendance non faite)`, jamais.every((id) => !appelsDe(b).some((a) => (a.qui === 'usine' || a.qui === 'antigravity') && a.args[0] === 'lancer' && a.args.some((x) => x === id || x === `--tache=${id}`))))
  const e1 = etatMoteur(b)
  J.ok('D', 'état après le tour 1 : enCours 920 (+925), libre 901, Gemini 903 et 910 (910 croisée), croisées 920', !!e1.enCours['026-920'] && !!e1.libre['026-901'] && !!e1.ag['026-903'] && e1.ag['026-910']?.croise === 'juge' && e1.croises['026-920']?.type === 'migration', court(JSON.stringify({ enCours: e1.enCours, libre: e1.libre, ag: Object.keys(e1.ag), croises: Object.keys(e1.croises) })))

  // Entre les tours : Gemini finit 026-903 (import d'un fichier hors de git) et 026-910 (déplacée en fait/ malgré la consigne).
  const D_ = b.depot
  fs.renameSync(path.join(D_, '.orchestre', 'en-cours', '026-903.md'), path.join(D_, '.orchestre', 'fait', '026-903.md'))
  ecrire(path.join(D_, 'lib', 'ecran-c.ts'), "import { horsGit } from '@/lib/hors-git'\nexport const c = horsGit\n")
  fs.renameSync(path.join(D_, '.orchestre', 'en-cours', '026-910.md'), path.join(D_, '.orchestre', 'fait', '026-910.md'))
  fs.rmSync(path.join(D_, '.orchestre', 'en-cours', '026-910.lock'))
  ecrire(path.join(D_, 'scripts', 'juges-910.mjs'), "import fs from 'node:fs'\nconsole.log('juge 910')\n")
  fs.appendFileSync(path.join(D_, '.orchestre', 'verdicts.jsonl'), JSON.stringify({ id: '026-910', verdict: 'PASS', ligne: '', date: new Date().toISOString() }) + '\n')
  const headAvant = gitIn(D_, 'rev-parse', 'HEAD').stdout.trim()
  // Tour 2 : les récupérations.
  t = tourMoteur(b, cibles.moteur, {
    types: TYPES,
    recuperer: { '026-920': 'croise', '026-901': 'pass', '026-925': 'croise-mais-fait' },
    fichiers: {
      '026-920': { 'supabase/migrations/0999_essai.sql': 'create table essai(id int);\n', 'supabase/controles/0999_essai.sql': 'select 1;\n' },
      '026-901': { 'lib/route-a.ts': "import { suivi } from '@/lib/suivi'\nimport { aide } from './aide-a'\nexport const a = suivi + aide\n", 'lib/aide-a.ts': 'export const aide = 2\n' },
      '026-925': { 'supabase/migrations/0998_perdue.sql': 'create table perdue(id int);\n' },
    },
    agEtat: { 'ag-026-903': 'terminé', 'ag-026-910': 'terminé' },
    agPrend: { '026-904': true },
  })
  J.ok('D', 'tour 2 : le moteur tourne', t.code === 0 && /moteur arrêté/.test(t.journal), court(t.sortie, 300))
  // Rédactions croisées : jamais commitées.
  for (const [id, chemin, qui] of [['026-920', 'supabase/migrations/0999_essai.sql', 'Codex sur l\'usine'], ['026-910', 'scripts/juges-910.mjs', 'Gemini'], ['026-925', 'supabase/migrations/0998_perdue.sql', 'Codex sur l\'usine']]) {
    const ar = lire(path.join(D_, '.orchestre', 'a-relire', `${id}.md`)) || ''
    J.ok('D', `${id} (rédaction croisée) : jamais commitée (ni localement, ni poussée)`, !dansGit(b, chemin) && !dansOrigine(b, chemin) && !dansGit(b, `.orchestre/fait/${id}.md`), `${chemin} dans git : ${dansGit(b, chemin)}`)
    J.ok('D', `${id} : fiche laissée en en-cours/, a-relire écrit (rédacteur, verifier, chemins), « ✍ … à relire par Claude »`, ou(b, id) === 'en-cours' && ar.includes(qui) && /Résultat du verifier/.test(ar) && ar.includes(chemin) && new RegExp(`✍ ${id} à relire par Claude`).test(t.journal), `fiche en ${ou(b, id)} ; a-relire ${ar ? 'écrit' : 'absent'} ; ${court(t.journal.split('\n').find((l) => l.includes(id)))}`)
  }
  J.ok('D', '026-910 : le verrou d\'origine reposé (ag-026-910)', /^agent: ag-026-910$/m.test(lire(path.join(D_, '.orchestre', 'en-cours', '026-910.lock')) || ''))
  J.ok('D', '026-920 : le rédacteur et le verdict de l\'usine sont dans a-relire', /usine-codex-920/.test(lire(path.join(D_, '.orchestre', 'a-relire', '026-920.md')) || '') && /verdict de l'usine PASS/.test(lire(path.join(D_, '.orchestre', 'a-relire', '026-920.md')) || ''))
  // Garde des imports : l'import suivi passe (026-901), l'import hors de git refuse (026-903).
  const log901 = gitIn(D_, 'log', '-1', '--format=%s', '--', 'lib/route-a.ts').stdout.trim()
  J.ok('D', 'garde des imports : 026-901 (import @/lib/suivi suivi, ./aide-a dans le même commit) commitée et poussée', dansOrigine(b, 'lib/route-a.ts') && dansGit(b, 'lib/aide-a.ts') && /026-901 : production par Codex sur la voie libre/.test(log901), log901 || court(t.journal, 300))
  J.ok('D', 'garde des imports : 026-903 importe lib/hors-git.ts (sur le PC, hors de git) → commit refusé, ligne exacte', !dansGit(b, 'lib/ecran-c.ts') && t.journal.includes('✗ 026-903 : import non commité lib/hors-git.ts (fichier présent sur le PC mais hors de git') && !etatMoteur(b).faits.includes('026-903'), court(t.journal.split('\n').filter((l) => l.includes('026-903')).join(' | '), 300))
  J.ok('D', 'garde des imports : l\'index est rendu propre après le refus', gitIn(D_, 'diff', '--cached', '--name-only').stdout.trim() === '')
  // Les places libérées : 905 (prospects) part sur Codex, 902 sur la voie libre, 904 et 907 chez Gemini.
  J.ok('D', 'Codex libéré → 026-905 (prospects) part sur Codex, sans --fournisseur', appelsDe(b).filter((a) => a.qui === 'usine' && a.args[0] === 'lancer' && a.args[1] === '026-905' && !a.args.some((x) => x.startsWith('--fournisseur'))).length === 1)
  J.ok('D', 'voie libre libérée → 026-902 part sur la voie libre', aLance(b, 'usine', '026-902', '--fournisseur=ol').length === 1)
  J.ok('D', 'Gemini libéré → 026-904 et 026-907 lancées', aLance(b, 'antigravity', '026-904').length === 1 && aLance(b, 'antigravity', '026-907').length === 1)
  J.ok('D', 'toujours pas de voie libre pour le juge croisé 026-911', aLance(b, 'usine', '026-911', '--fournisseur=ol').length === 0)
  J.ok('D', 'aucun commit de production pour les fiches croisées ni pour 026-903 depuis le tour 1', !gitIn(D_, 'log', `${headAvant}..HEAD`, '--format=%s').stdout.split('\n').some((s) => /^026-(920|910|925|903) : production/.test(s)))

  // Tour 3 : Gemini rend 026-904 rouge (le PC dit FAIL) → son travail retiré du PC ; 026-907 jamais prise → n'est plus relancée.
  fs.renameSync(path.join(D_, '.orchestre', 'en-cours', '026-904.md'), path.join(D_, '.orchestre', 'fait', '026-904.md'))
  ecrire(path.join(D_, 'lib', 'ecran-d.ts'), 'export const d = 4\n')
  t = tourMoteur(b, cibles.moteur, { types: TYPES, recuperer: { '026-905': 'encours', '026-902': 'encours' }, verdicts: { '026-904': 'FAIL' }, agEtat: { 'ag-026-904': 'terminé', 'ag-026-907': 'en attente (a parlé)' } })
  const patch904 = lire(path.join(D_, '.orchestre', 'travail', 'antigravity', '026-904', 'resultat.patch')) || ''
  J.ok('D', 'rouge de Gemini (026-904, FAIL du PC) : fiche en refuse/, travail retiré du PC, patch gardé', ou(b, '026-904') === 'refuse' && !fs.existsSync(path.join(D_, 'lib', 'ecran-d.ts')) && patch904.includes('lib/ecran-d.ts') && !dansGit(b, 'lib/ecran-d.ts'), `fiche en ${ou(b, '026-904')} ; ecran-d.ts ${fs.existsSync(path.join(D_, 'lib', 'ecran-d.ts')) ? 'encore là' : 'retiré'} ; ${court(t.journal.split('\n').filter((l) => l.includes('026-904')).join(' | '), 300)}`)
  J.ok('D', '026-907 jamais prise par Gemini : rouge « non prise », plus relancée', aLance(b, 'antigravity', '026-907').length === 1 && !!etatMoteur(b).nonPrises['026-907'] && /026-907 rouge \(Gemini\) : non prise/.test(t.journal))
  J.ok('D', 'le journal compte les voies et les fiches à relire', /voie libre \d\/1 · Gemini \d\/2 · à relire 3 · à décider \d/.test(t.journal), court(t.journal.split('\n').filter((l) => l.includes('· tour')).pop()))
}

// ── G. le moteur règle seul les cas répétitifs : questions « juge vivant sur le PC », a-decider, lib/flags.ts ─────────────
// Les trois questions de Codex du 28/09, mot pour mot (.orchestre/travail/usine/026-068, 026-074 et 026-049/question.md), plus
// une quatrième qui réclame une autre clé que les variables locales.
const QUESTIONS = {
  '026-950': '1. Fournir au vérificateur les trois variables de test `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` hors du dépôt, puis relancer la tâche et son juge vivant.\n2. Faire exécuter le juge vivant sur le PC disposant déjà de ces variables ; conserver ici la preuve statique et le typecheck verts.\n',
  '026-951': '1. Exécuter le vérificateur sur le PC avec `.env.local` : GE-8 exige `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; les autres critères sont verts ici.\n2. Reporter GE-8 jusqu\'à disponibilité d\'un environnement de test Supabase, sans transmettre de secret à l\'usine.\n',
  '026-952': 'TC-10 échoue sur `lib/flags.ts(99,73): error TS1010: \'*/\' expected`, hors du périmètre 026-049. Quelle suite donner ?\n\n1. Corriger `lib/flags.ts` dans sa tâche propriétaire, puis relancer 026-049.\n2. Étendre explicitement le périmètre de 026-049 à cette correction, puis me relancer.\n',
  '026-953': '1. Exécuter le vérificateur sur le PC : PP-3 exige `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY`.\n2. Reporter PP-3.\n',
}
const LIGNES_G = [
  ['026-950', 'Route Q1 (question de 068)', 'codex', '`scripts/q1-qa.mjs` (026-913)', 'lib/q1.ts'],
  ['026-951', 'Route Q2 (question de 074)', 'codex', '`scripts/q2-qa.mjs` (026-913)', 'lib/q2.ts'],
  ['026-952', 'Route Q3 (question de 049)', 'codex', '`scripts/q3-qa.mjs` (026-913)', 'lib/q3.ts'],
  ['026-953', 'Route Q4 (une autre clé)', 'codex', '`scripts/q4-qa.mjs` (026-913)', 'lib/q4.ts'],
  ['026-960', 'Drapeaux A', 'codex', '`scripts/da-qa.mjs` (026-913)', 'lib/flags.ts, lib/da.ts'],
  ['026-961', 'Drapeaux B', 'codex', '`scripts/db-qa.mjs` (026-913)', 'lib/flags.ts'],
  ['026-962', 'Écran E (lib/** entier)', 'antigravity', '`scripts/e-qa.mjs` (026-913)', 'lib/**'],
  ['026-963', 'Route R', 'codex', '`scripts/r-qa.mjs` (026-913)', 'lib/r.ts'],
  ['026-964', 'Écran S (Gemini arrêté)', 'antigravity', '`scripts/s-qa.mjs` (026-913)', 'lib/s.ts'],
]
function partieG(J, cibles) {
  const b = bacMoteur(cibles, { lignes: LIGNES_G, prefixe: 'G-', enCours: LIGNES_G.slice(0, 4) })
  const D_ = b.depot
  const lignesDe = (t, id) => t.split('\n').filter((l) => l.includes(id)).join(' | ')
  // 026-964 : un agent Gemini lancé il y a 3 h, arrêté en « en attente (a parlé) », sans question ni verdict final.
  ecrire(path.join(D_, '.orchestre', 'en-cours', '026-964.md'), ficheDe(LIGNES_G.at(-1)))
  ecrire(path.join(D_, '.orchestre', 'en-cours', '026-964.lock'), 'agent: ag-026-964\ndepuis: banc\nsha: banc\n')
  const e0 = etatMoteur(b); e0.ag = { '026-964': { depuis: Date.now() - 3 * 3600e3, agent: 'ag-026-964', croise: null, lock: null } }
  ecrire(path.join(b.ops, 'moteur-etat.json'), JSON.stringify(e0))
  // Tour 1 : les quatre questions rapatriées ; puis les lancements (MAX=3).
  let t = tourMoteur(b, cibles.moteur, {
    recuperer: { '026-950': 'question', '026-951': 'question', '026-952': 'question', '026-953': 'question' },
    questions: QUESTIONS,
    fichiers: { '026-950': { 'lib/q1.ts': "import { suivi } from '@/lib/suivi'\nexport const q1 = suivi\n" }, '026-951': { 'lib/q2.ts': 'export const q2 = 2\n' }, '026-952': { 'lib/q3.ts': 'export const q3 = 3\n' }, '026-953': { 'lib/q4.ts': 'export const q4 = 4\n' } },
    verdicts: { '026-951': 'FAIL' },
    agEtat: { 'ag-026-964': 'en attente (a parlé)' },
  }, ['--max=3', '--max-libre=0'])
  J.ok('G', 'tour 1 : le moteur tourne', t.code === 0 && /moteur arrêté/.test(t.journal), court(t.sortie, 300))
  J.ok('G', 'Gemini arrêté sans verdict depuis plus de 2 h (026-964) : place rendue, rouge au journal, fiche laissée en en-cours/', !etatMoteur(b).ag['026-964'] && /026-964 rouge \(Gemini\) : arrêté sans verdict depuis plus de 2 h/.test(t.journal) && ou(b, '026-964') === 'en-cours', court(lignesDe(t.journal, '026-964'), 300))
  const q950 = fs.readdirSync(path.join(D_, '.orchestre', 'preuves', '026-950')).find((f) => /^question-codex-\d\d-\d\d\.md$/.test(f))
  const msg950 = gitIn(D_, 'log', '-1', '--format=%s', '--', 'lib/q1.ts').stdout.trim()
  J.ok('G', 'question de 068 (juge vivant) : patch appliqué, question rangée avec « réponse automatique : option PC », fiche en fait/, verifier PASS, commitée et poussée',
    !!q950 && /réponse automatique : option PC \(option 2\)/.test(lire(path.join(D_, '.orchestre', 'preuves', '026-950', q950)) || '') && dansOrigine(b, 'lib/q1.ts') && dansGit(b, `.orchestre/preuves/026-950/${q950}`) && ou(b, '026-950') === 'fait' && !fs.existsSync(path.join(D_, '.orchestre', 'en-cours', '026-950.question.md')) && /026-950 : production par Codex sur l'usine \(juge vivant sur le PC, réponse automatique, PASS du PC/.test(msg950) && /026-950 : question « juge vivant sur le PC » → réponse automatique \(option 2\)/.test(t.journal),
    `${msg950 || 'aucun commit'} ; ${court(lignesDe(t.journal, '026-950'), 300)}`)
  const q951 = fs.readdirSync(path.join(D_, '.orchestre', 'preuves', '026-951')).find((f) => /^question-codex-/.test(f))
  J.ok('G', 'question de 074 (juge vivant) mais FAIL du PC : patch rendu (git apply -R), fiche en refuse/, rien de commité',
    !!q951 && /option PC \(option 1\)/.test(lire(path.join(D_, '.orchestre', 'preuves', '026-951', q951)) || '') && !fs.existsSync(path.join(D_, 'lib', 'q2.ts')) && ou(b, '026-951') === 'refuse' && !dansGit(b, 'lib/q2.ts') && /026-951 : patch rendu/.test(t.journal),
    court(lignesDe(t.journal, '026-951'), 300))
  for (const [id, quoi, extrait] of [['026-952', 'question de 049 (lib/flags.ts cassé)', 'TC-10 échoue'], ['026-953', 'une autre clé que les variables locales (STRIPE_SECRET_KEY)', 'STRIPE_SECRET_KEY']]) {
    const ad = lire(path.join(D_, '.orchestre', 'a-decider', `${id}.md`)) || ''
    J.ok('G', `${quoi} : pas de réponse automatique → a-decider (question + chemins du patch), « ❓ » au journal, rien d'appliqué`,
      ad.includes(extrait) && /resultat\.patch/.test(ad) && /lib\/q[34]\.ts/.test(ad) && new RegExp(`❓ ${id} : question de Codex`).test(t.journal) && !fs.existsSync(path.join(D_, 'lib', `q${id.slice(-1) === '2' ? 3 : 4}.ts`)) && ou(b, id) === 'en-cours' && fs.existsSync(path.join(D_, '.orchestre', 'en-cours', `${id}.question.md`)),
      `a-decider ${ad ? 'écrit' : 'absent'} ; ${court(lignesDe(t.journal, id), 300)}`)
  }
  J.ok('G', 'lib/flags.ts : 026-960 part, 026-961 attend (périmètre de 026-960), 026-962 (lib/**) attend aussi, 026-963 part',
    aLance(b, 'usine', '026-960').length === 1 && aLance(b, 'usine', '026-963').length === 1 && aLance(b, 'usine', '026-961').length === 0 && aLance(b, 'antigravity', '026-962').length === 0 && /026-961 attend : lib\/flags\.ts est déjà dans le périmètre de 026-960/.test(t.journal) && /026-962 attend : lib\/flags\.ts/.test(t.journal),
    court([lignesDe(t.journal, '026-961'), lignesDe(t.journal, '026-962')].join(' | '), 300))
  // Tour 2 : 026-960 est sortie d'en-cours/ (rouge), mais sa ligne de lib/flags.ts est restée sur le PC, non commitée.
  fs.renameSync(path.join(D_, '.orchestre', 'en-cours', '026-960.md'), path.join(D_, '.orchestre', 'refuse', '026-960.md'))
  fs.rmSync(path.join(D_, '.orchestre', 'en-cours', '026-960.lock'), { force: true })
  ecrire(path.join(D_, 'lib', 'flags.ts'), "export const drapeaux = { pilotage: true } // ligne de 026-960, pas encore commitée\n")
  t = tourMoteur(b, cibles.moteur, { recuperer: { '026-960': 'rouge', '026-963': 'encours' } }, ['--max=3', '--max-libre=0'])
  J.ok('G', 'lib/flags.ts modifié sur le PC et pas commité : 026-961 attend encore', aLance(b, 'usine', '026-961').length === 0 && /026-961 attend : lib\/flags\.ts porte une modification non commitée sur le PC/.test(t.journal), court(lignesDe(t.journal, '026-961'), 300))
  // Tour 3 : lib/flags.ts est propre (la ligne est retirée) → 026-961 part ; 026-962 attend désormais 026-961.
  gitIn(D_, 'checkout', '--', 'lib/flags.ts')
  t = tourMoteur(b, cibles.moteur, { recuperer: { '026-963': 'encours' } }, ['--max=3', '--max-libre=0'])
  J.ok('G', 'lib/flags.ts libre : 026-961 part, 026-962 attend 026-961', aLance(b, 'usine', '026-961').length === 1 && aLance(b, 'antigravity', '026-962').length === 0 && /026-962 attend : lib\/flags\.ts est déjà dans le périmètre de 026-961/.test(t.journal), court(lignesDe(t.journal, '026-96'), 300))
}

// ── H. le moteur règle seul un dossier déjà présent sur l'usine (lancer refusé, code 3) ────────────────────────────
const LIGNES_H = [
  ['026-970', 'Route H1 (déjà rapatrié)', 'codex', '`scripts/h1-qa.mjs` (026-913)', 'lib/h1.ts'],
  ['026-971', 'Route H2 (jamais rapatrié)', 'codex', '`scripts/h2-qa.mjs` (026-913)', 'lib/h2.ts'],
]
function partieH(J, cibles) {
  const b = bacMoteur(cibles, { lignes: LIGNES_H, prefixe: 'H-', enCours: [] })
  const D_ = b.depot
  const lignesDe = (t, id) => t.split('\n').filter((l) => l.includes(id)).join(' | ')
  const lance = (id) => appelsDe(b).filter((a) => a.qui === 'usine' && a.args[0] === 'lancer' && a.args[1] === id)
  const nettoie = (id) => appelsDe(b).filter((a) => a.qui === 'usine' && a.args[0] === 'nettoyer' && a.args[1] === id)
  const recup = (id) => appelsDe(b).filter((a) => a.qui === 'usine' && a.args[0] === 'recuperer' && a.args[1] === id)
  // 026-970 : le rapatriement a déjà eu lieu (resultat.patch présent) — une fiche libérée après un recuperer (ou une
  // question répondue) sans le nettoyer qui suit d'ordinaire : le dossier de l'usine traîne encore.
  ecrire(path.join(D_, '.orchestre', 'travail', 'usine', '026-970', 'resultat.patch'), '+++ b/lib/h1.ts\n')
  let t = tourMoteur(b, cibles.moteur, { dossierDeja: { '026-970': true, '026-971': true }, recuperer: { '026-971': 'rouge' } }, ['--max=2', '--max-libre=0'])
  J.ok('H', 'tour 1 : le moteur tourne', t.code === 0 && /moteur arrêté/.test(t.journal), court(t.sortie, 300))
  J.ok('H', '026-970 (déjà rapatrié) : dossier déjà là → nettoyer --forcer puis relance DANS LE MÊME TOUR, prise sur le PC',
    lance('026-970').length === 2 && nettoie('026-970').length === 1 && nettoie('026-970')[0].args.includes('--forcer') && !!etatMoteur(b).enCours['026-970'] && ou(b, '026-970') === 'en-cours',
    `lancers ${lance('026-970').length}, nettoyages ${nettoie('026-970').length}, enCours ${JSON.stringify(etatMoteur(b).enCours)}`)
  J.ok('H', '026-970 : une ligne de journal dédiée (dossier déjà présent, déjà rapatrié)',
    /026-970 : dossier de l'usine déjà présent.*déjà rapatrié.*nettoyer --forcer puis relancer/.test(t.journal), court(lignesDe(t.journal, '026-970'), 300))
  const lance971T1 = lance('026-971').length
  J.ok('H', "026-971 (jamais rapatrié) : dossier déjà là → recuperer (traitement existant, ici un rouge) puis nettoyer --forcer, PAS de relance dans ce tour",
    lance971T1 === 1 && recup('026-971').length === 1 && nettoie('026-971').length === 1 && nettoie('026-971')[0].args.includes('--forcer') && !etatMoteur(b).enCours['026-971'] && etatMoteur(b).rouges.some((x) => x.id === '026-971') && ou(b, '026-971') === 'file',
    `lancers ${lance971T1}, recuperer ${recup('026-971').length}, nettoyages ${nettoie('026-971').length}, où ${ou(b, '026-971')}`)
  J.ok('H', '026-971 : une ligne de journal dédiée (dossier déjà présent, jamais rapatrié)',
    /026-971 : dossier de l'usine déjà présent.*jamais rapatrié.*recuperer puis nettoyer --forcer/.test(t.journal), court(lignesDe(t.journal, '026-971'), 300))
  // Tour 2 : le dossier de 026-971 a été nettoyé (marqueur du banc) → elle repart normalement, sans plus jamais buter sur le code 3.
  t = tourMoteur(b, cibles.moteur, { dossierDeja: { '026-970': true, '026-971': true } }, ['--max=2', '--max-libre=0'])
  J.ok('H', '026-971 : relancée au tour suivant, prise normalement cette fois (dossier nettoyé, plus de code 3)',
    lance('026-971').length === lance971T1 + 1 && !!etatMoteur(b).enCours['026-971'] && ou(b, '026-971') === 'en-cours',
    `lancers ${lance('026-971').length} (${lance971T1} avant), enCours ${JSON.stringify(etatMoteur(b).enCours)}`)
}

// ── E. commit-fiche.sh et la garde des imports ─────────────────────────────────────────────────────────────────
function partieE(J, cibles) {
  const d = fs.mkdtempSync(path.join(TMP, 'E-'))
  const depot = path.join(d, 'presti'); const origine = path.join(d, 'origine.git')
  gitIn(d, 'init', '-q', '--bare', '-b', 'main', origine); gitIn(d, 'init', '-q', '-b', 'main', depot)
  ecrire(path.join(depot, 'lib', 'suivi.ts'), 'export const suivi = 1\n')
  ecrire(path.join(depot, '.orchestre', 'fait', '.garde'), '')
  ecrire(path.join(depot, '.orchestre', 'digest.md'), '# digest\n'); ecrire(path.join(depot, '.orchestre', 'verdicts.jsonl'), '')
  gitIn(depot, 'add', '-A'); gitIn(depot, 'commit', '-q', '-m', 'dépôt'); gitIn(depot, 'remote', 'add', 'origin', origine); gitIn(depot, 'push', '-q', 'origin', 'main')
  ecrire(path.join(depot, 'lib', 'hors-git.ts'), 'export const h = 1\n')
  const fiche = (id, per) => ecrire(path.join(depot, '.orchestre', 'fait', `${id}.md`), `---\nid: ${id}\nperimetre: [${per}]\nexecutant: codex\n---\n# ${id}\n`)
  fiche('026-940', 'lib/c.ts'); ecrire(path.join(depot, 'lib', 'c.ts'), "import { h } from '@/lib/hors-git'\nexport const c = h\n")
  const env = { ...process.env, PRESTI_RACINE: depot, GIT_AUTHOR_NAME: 'banc', GIT_AUTHOR_EMAIL: '[EMAIL_MASQUE]', GIT_COMMITTER_NAME: 'banc', GIT_COMMITTER_EMAIL: '[EMAIL_MASQUE]' }
  const avant = gitIn(depot, 'rev-parse', 'HEAD').stdout.trim()
  let r = spawnSync(BASH, [cibles.commitFiche, '026-940', 'essai refusé'], { cwd: depot, encoding: 'utf8', env, timeout: 120_000 })
  let s = `${r.stdout || ''}${r.stderr || ''}`
  J.ok('E', 'commit-fiche.sh : import vers un fichier hors de git → refus, ligne exacte, aucun commit, index propre', r.status === 1 && s.includes('✗ 026-940 : import non commité lib/hors-git.ts (fichier présent sur le PC mais hors de git') && gitIn(depot, 'rev-parse', 'HEAD').stdout.trim() === avant && gitIn(depot, 'diff', '--cached', '--name-only').stdout.trim() === '', `code ${r.status} : ${court(s, 300)}`)
  fs.rmSync(path.join(depot, '.orchestre', 'fait', '026-940.md')); fs.rmSync(path.join(depot, 'lib', 'c.ts'))
  fiche('026-941', 'lib/d.ts'); ecrire(path.join(depot, 'lib', 'd.ts'), "import { suivi } from '@/lib/suivi'\nimport * as s2 from './suivi'\nexport const d = suivi + Object.keys(s2).length\n")
  r = spawnSync(BASH, [cibles.commitFiche, '026-941', 'essai accepté'], { cwd: depot, encoding: 'utf8', env, timeout: 120_000 })
  s = `${r.stdout || ''}${r.stderr || ''}`
  J.ok('E', 'commit-fiche.sh : imports vers des fichiers suivis → commit et push', r.status === 0 && gitIn(depot, 'log', 'origin/main', '--format=%s', '-1').stdout.trim() === '026-941 : essai accepté', `code ${r.status} : ${court(s, 300)}`)
}

// ── F. garde-imports.mjs en direct ─────────────────────────────────────────────────────────────────────────────
async function partieF(J, cibles) {
  const G = await import(`${pathToFileURL(cibles.garde).href}?${Date.now()}`)
  const t = [
    "import a from '@/lib/a'", "import type { B } from './b'", "import {\n  c1,\n  c2,\n} from '../c'", "import './effet.css'", "export * from './reexport'",
    "export { e } from '@/lib/e'", "const f = await import('./dyn')", "const g = require('../req')", "import x from 'next/server'", '// import mort from \'./commentaire\'',
    '/* import aussi from \'./bloc\' */',
  ].join('\n')
  const vus = G.importsDe(t).sort()
  const attendus = ['../c', '../req', './b', './dyn', './effet.css', './reexport', '@/lib/a', '@/lib/e'].sort()
  J.ok('F', 'importsDe : @/, relatifs, type, multi-lignes, export from, import(), require ; ni paquets ni commentaires', vus.join(',') === attendus.join(','), vus.join(', '))
  const c = G.candidats('app/api/x/route.ts', './y.js')
  J.ok('F', 'candidats : « ./y.js » vise aussi y.ts, « @/lib/z » vise lib/z.ts puis lib/z/index.ts, et sortir du dépôt = null', c.includes('app/api/x/y.ts') && G.candidats('a.ts', '@/lib/z').indexOf('lib/z.ts') < G.candidats('a.ts', '@/lib/z').indexOf('lib/z/index.ts') && G.candidats('a.ts', '../../dehors') === null)
}

// ── les mutants ────────────────────────────────────────────────────────────────────────────────────────────────
const MUTANTS = [
  { nom: 'moteur : la vérification finale de Gemini repasse par l\'orchestre du PC (plus d\'usine d\'abord)', cible: 'moteur', parties: ['V'], r: [["const v = verifierFinal(id)", "const v = node(['scripts/orchestre.mjs', 'verifier', id], { timeout: 45 * 60e3 })"]] },
  { nom: 'moteur : typecheck, plus de nouvelle chance sur l\'usine quand HEAD n\'est pas poussé', cible: 'moteur', parties: ['V'], r: [["if (r.status === 125 && /inconnu de GitHub|pousse d.abord/.test(sortieDe(r))) {", "if (false) {"]] },
  { nom: 'moteur : typecheck, plus de repli sur le PC quand l\'usine ne juge pas', cible: 'moteur', parties: ['V'], r: [["if ([3, 124, 125, null].includes(r.status)) {", "if ([].includes(r.status)) {"]] },
  { nom: 'verifier-usine : les fiches à secrets partent quand même sur l\'usine', cible: 'verifierUsine', parties: ['V'], r: [["if (s1) return pc(", "if (false) return pc("]] },
  { nom: 'verifier-usine : un 124/125 de l\'usine devient un FAIL', cible: 'verifierUsine', parties: ['V'], r: [["if (!aucunFichier && (code === 124 || code === 125 || code === 3)) {", "if (false) {"]] },
  { nom: 'verifier-usine : un échec qui parle de fichiers absents du bac est un FAIL définitif', cible: 'verifierUsine', parties: ['V'], r: [["if (s3) return pc(", "if (false) return pc("]] },
  { nom: 'verifier-usine : une preuve de 0 octet passe', cible: 'verifierUsine', parties: ['V'], r: [["code === 0 && !vides.length && !violationDecisions ? 'PASS'", "code === 0 && !violationDecisions ? 'PASS'"]] },
  { nom: 'verifier-usine : « aucun fichier écrit » (commande verte) devient un échec', cible: 'verifierUsine', parties: ['V'], r: [["if (aucunFichier) code = 0", "if (false) code = 0"]] },
  { nom: 'verifier-usine : HEAD pas poussé, l\'usine est lancée quand même', cible: 'verifierUsine', parties: ['V'], r: [["if (!h.ok) return pc(", "if (false) return pc("]] },
  { nom: 'verifier-usine : la ligne de verdict n\'est plus marquée machine usine', cible: 'verifierUsine', parties: ['V'], r: [[", dossier, machine: 'usine' }) + '\\n')", ", dossier }) + '\\n')"]] },
  { nom: 'verifier-usine : le digest n\'est plus régénéré', cible: 'verifierUsine', parties: ['V'], r: [["  orch('digest')\n", "  void orch\n"]] },
  { nom: 'verifier-usine : un FAIL ne range plus la fiche en refuse/', cible: 'verifierUsine', parties: ['V'], r: [["if (verdict === 'FAIL') { fs.mkdirSync", "if (false) { fs.mkdirSync"]] },
  { nom: 'verifier-final : le PC d\'abord (plus d\'usine)', cible: 'verifierFinal', parties: ['V'], r: [["if (process.env.PRESTI_VERIFIER_PC !== '1' && fs.existsSync(usine)) {", "if (false) {"]] },
  { nom: 'verifier-final : un FAIL de l\'usine demande un second avis au PC', cible: 'verifierFinal', parties: ['V'], r: [["if (u.status === 0 || u.status === 1) {", "if (u.status === 0) {"]] },
  { nom: 'verifier-final : plus de repli sur le PC quand l\'usine ne juge pas', cible: 'verifierFinal', parties: ['V'], r: [["if (!jugee) {", "if (false) {"]] },
  { nom: 'moteur : une rédaction croisée de l\'usine suit le chemin des PASS', cible: 'moteur', parties: ['D'], r: [["if (e.croises[id] || executantFiche(id) === 'claude-code') {", 'if (false) {']] },
  { nom: 'moteur : la marque perdue n\'est plus rattrapée par l\'exécutant de la fiche', cible: 'moteur', parties: ['D'], r: [["if (e.croises[id] || executantFiche(id) === 'claude-code') {", 'if (e.croises[id]) {']] },
  { nom: 'moteur : garde des imports retirée', cible: 'moteur', parties: ['D'], r: [['if (garde.erreur || garde.manques.length) {', 'if (false) {']] },
  { nom: 'moteur : une rédaction croisée peut partir sur la voie libre', cible: 'moteur', parties: ['D'], r: [['else if (!r.c.croise && !e.sansLibre[r.id]', 'else if (!e.sansLibre[r.id]']] },
  { nom: 'moteur : pas de voie libre quand Codex est plein', cible: 'moteur', parties: ['D'], r: [["else if (!r.c.croise && !e.sansLibre[r.id] && Object.keys(e.libre).length < MAX_LIBRE) lancerUsine(e, r, 'libre')", 'else void 0']] },
  { nom: 'moteur : Gemini croisé sans consigne', cible: 'moteur', parties: ['D'], r: [["const d = node(['scripts/antigravity.mjs', 'dire', agent, CONSIGNE_GEMINI(r.id)], { timeout: 3 * 60e3 })", "const d = { status: 0, stdout: '✓' }"]] },
  { nom: 'moteur : la fiche croisée n\'est pas remise en en-cours/', cible: 'moteur', parties: ['D'], r: [["for (const d of ['fait', 'refuse']) {", 'for (const d of []) {']] },
  { nom: 'moteur : un rouge de Gemini reste sur le PC', cible: 'moteur', parties: ['D'], r: [["if (essai.status || run('git', ['apply', '-R', '--whitespace=nowarn', patch]).status)", 'if (true)']] },
  { nom: 'moteur : plus de réponse automatique « juge vivant sur le PC »', cible: 'moteur', parties: ['G'], r: [['const option = optionJugeVivant(texte)', 'const option = null']] },
  { nom: 'moteur : réponse automatique à toute question', cible: 'moteur', parties: ['G'], r: [['function optionJugeVivant(texte) {', 'function optionJugeVivant(texte) { return 1']] },
  { nom: 'moteur : une autre clé que les variables locales passe', cible: 'moteur', parties: ['G'], r: [['if ([...t.matchAll(/\\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\\b/g)].some((m) => !VARIABLES_LOCALES.includes(m[0]))) return null', '']] },
  { nom: 'moteur : juge vivant rouge, patch pas rendu', cible: 'moteur', parties: ['G'], r: [['else { rendrePatch(id, patch); e.rouges.push', 'else { e.rouges.push']] },
  { nom: 'moteur : pas d\'a-decider (la question reste muette)', cible: 'moteur', parties: ['G'], r: [["if (!option) { ecrireADecider(e, id, { qui, texte, patch, chemins: rapatries(id) }); return }", 'if (!option) return']] },
  { nom: 'moteur : un Gemini arrêté garde sa place indéfiniment', cible: 'moteur', parties: ['G'], r: [["if (ou === 'en-cours' && arrete) {", 'if (false) {']] },
  { nom: 'moteur : lib/flags.ts n\'est plus exclusif', cible: 'moteur', parties: ['G'], r: [['const exclusif = bloqueParExclusif(r.id)', 'const exclusif = null']] },
  { nom: 'moteur : lib/flags.ts non commité ignoré', cible: 'moteur', parties: ['G'], r: [["if (git('status', '--porcelain', '--', f).stdout.trim()) return", 'if (false) return']] },
  { nom: 'moteur : dossier déjà présent sur l\'usine (code 3) jamais résolu, reste bloqué', cible: 'moteur', parties: ['H'], r: [["} else if (!apresNettoyage && l.status === 3 && /a déjà un dossier/.test(sortieDe(l))) {\n    resoudreDossierExistant(e, r, voie)\n  }", '}']] },
  { nom: 'moteur : dossier déjà présent, jamais rapatrié quand même relancé dans le même tour (sans recuperer)', cible: 'moteur', parties: ['H'], r: [['if (dejaRapatrie) {', 'if (true) {']] },
  { nom: 'moteur : dossier déjà présent, jamais nettoyé après recuperer (orphelin permanent)', cible: 'moteur', parties: ['H'], r: [["  recupererUsine(e, r.id, voie === 'libre' ? e.libre : e.enCours, voie)\n  const n = node(['scripts/usine.mjs', 'nettoyer', r.id, '--forcer'], { timeout: 5 * 60e3 })\n  if (n.status !== 0) log", "  recupererUsine(e, r.id, voie === 'libre' ? e.libre : e.enCours, voie)\n  if (false) log"]] },
  { nom: 'usine : --fournisseur accepté pour une fiche de prospects', cible: 'usine', parties: ['B'], r: [['if (prospects) { console.error(`✗ ${id} touche des données de prospects', 'if (false) { console.error(`✗ ${id} touche des données de prospects']] },
  { nom: 'usine : --croise sans contrôle d\'admission', cible: 'usine', parties: ['B'], r: [['if (!a.ok) { console.error(`✗ ${id} : --croise refusé', 'if (false) { console.error(`✗ ${id} : --croise refusé']] },
  { nom: 'usine : le relais de la voie libre commence quand même à ChatGPT', cible: 'usine', parties: ['C'], r: [['    iFournisseur = i\n', '    void i\n']] },
  { nom: 'usine : la voie libre sert une fiche de prospects', cible: 'usine', parties: ['C'], r: [["if (toucheProspects()) finir(3, 'QUOTA', `voie libre refusée", "if (false) finir(3, 'QUOTA', `voie libre refusée"], ["if (fr.nom !== 'chatgpt' && toucheProspects()) finir(3,", 'if (false) finir(3,']] },
  { nom: 'moteur : une demande de Gemini est commitée sur main comme une fiche', cible: 'moteur', parties: ['M'], r: [['if (estDemande(id)) verifierEtLivrerDemandeAg(e, id, a); else verifierEtCommiterAg(e, id, a);', 'verifierEtCommiterAg(e, id, a);']] },
  { nom: 'moteur : une demande de prospects part chez une IA gratuite', cible: 'moteur', parties: ['M'], r: [["if (a.status !== 0 && /données de prospects/.test(sortieDe(a))) {\n      fs.rmSync", "if (false) {\n      fs.rmSync"]] },
  { nom: 'demandes : la branche est poussée sur main', cible: 'demandes', parties: ['M'], r: [['refs/heads/${branche}:refs/heads/${branche}', 'refs/heads/${branche}:refs/heads/main']] },
  { nom: 'demandes : la fiche ne porte plus « Jamais de migration »', cible: 'demandes', parties: ['M'], r: [["'Jamais de migration : rien dans supabase/", "'Migration permise : rien dans supabase/"]] },
  { nom: 'répartition : un juge de fiches Codex rédigé par Codex', cible: 'repartition', parties: ['A', 'D'], r: [["if (par.length === 1 && par[0] === 'codex') return { voie: 'antigravity'", "if (par.length === 1 && par[0] === 'codex') return { voie: 'codex'"]] },
  { nom: 'répartition : les fiches claude-code d\'autre type deviennent des juges', cible: 'repartition', parties: ['A'], r: [["export const estJuge = (l) => producteur(l.executant) === 'claude-code' && (l.elleMeme || /--preuve-echecs/.test(l.juge))", "export const estJuge = (l) => producteur(l.executant) === 'claude-code'"]] },
]

// K. ChatGPT éteint (29/09/2026, quota épuisé jusqu'au 3/10) : --retour-chatgpt=<date future> envoie TOUTE la production Codex sur la voie libre,
//    même quand la file Codex n'est pas pleine ; une rédaction croisée (abonnement seulement) attend ; les prospects restent refusés ; une date
//    passée redonne le comportement normal.
function partieK(J, cibles) {
  const b = bacMoteur(cibles)
  const TYPES = { '026-920': 'migration', '026-911': 'juge' }
  let t = tourMoteur(b, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agPrend: { '026-903': true } }, ['--max=4', '--max-ag=1', '--retour-chatgpt=2099-01-01T00:00:00Z'])
  J.ok('K', 'ChatGPT éteint : le moteur démarre et le dit', t.code === 0 && /ChatGPT ÉTEINT jusqu'au 2099-01-01T00:00Z/.test(t.journal), court(t.journal, 300))
  const lancers = appelsDe(b).filter((a) => a.qui === 'usine' && a.args[0] === 'lancer')
  J.ok('K', 'ChatGPT éteint, Gemini plein (--max-ag=1 : 026-901 y est) : 026-902 part sur la voie libre (--fournisseur=ol) alors que la file Codex (4) n\'est pas pleine', aLance(b, 'usine', '026-902', '--fournisseur=ol').length === 1 && !!etatMoteur(b).libre['026-902'] && aLance(b, 'antigravity', '026-902').length === 0)
  J.ok('K', 'ChatGPT éteint : AUCUN lancement sans --fournisseur (jamais l\'abonnement)', lancers.length > 0 && lancers.every((a) => a.args.some((x) => x.startsWith('--fournisseur='))), lancers.map((a) => a.args.join(' ')).join(' | '))
  J.ok('K', 'ChatGPT éteint : la rédaction croisée 026-920 attend (abonnement seulement)', aLance(b, 'usine', '026-920').length === 0 && /026-920 attend le retour de ChatGPT/.test(t.journal), court(t.journal, 300))
  J.ok('K', 'ChatGPT éteint : 026-905 (prospects) : admission à sec refusée, jamais lancée ni chez Gemini ni sur la voie libre, notée « attend Codex »', appelsDe(b).some((a) => a.qui === 'usine' && a.args.includes('--a-sec') && a.args.includes('026-905')) && aLance(b, 'usine', '026-905').length === 0 && aLance(b, 'antigravity', '026-905').length === 0 && /026-905 touche des données de prospects : pas de voie libre/.test(t.journal) && !!etatMoteur(b).sansLibre['026-905'], court(t.journal, 300))
  J.ok('K', 'ChatGPT éteint : Gemini d\'abord — 026-901 (codex, production) lancée chez Antigravity (lancer ag-026-901 --tache=026-901 --model=pro), marquée fiche codex', appelsDe(b).some((a) => a.qui === 'antigravity' && a.args.join(' ') === 'lancer ag-026-901 --tache=026-901 --model=pro') && aLance(b, 'usine', '026-901').length === 0 && etatMoteur(b).ag['026-901']?.deCodex === true && /026-901 lancée chez Gemini .*fiche codex, ChatGPT éteint/.test(t.journal), court(t.journal, 300))
  J.ok('K', 'ChatGPT éteint, Gemini plein : 026-903 (antigravity) attend, pas de voie libre pour elle', aLance(b, 'antigravity', '026-903').length === 0 && aLance(b, 'usine', '026-903').length === 0)
  // Date passée : le retour de ChatGPT, tout seul.
  const b2 = bacMoteur(cibles)
  const t2 = tourMoteur(b2, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agPrend: { '026-903': true } }, ['--max=4', '--retour-chatgpt=2020-01-01T00:00:00Z'])
  J.ok('K', 'date de retour passée : comportement normal (croisée 026-920 sur l\'usine, Codex sans --fournisseur, aucune fiche codex chez Gemini)', t2.code === 0 && aLance(b2, 'usine', '026-920', '--croise').length === 1 && ['026-905', '026-901'].every((id) => aLance(b2, 'usine', id).length === 1 && aLance(b2, 'usine', id, '--fournisseur=ol').length === 0 && aLance(b2, 'antigravity', id).length === 0) && !/ChatGPT ÉTEINT/.test(t2.journal), court(t2.journal, 300))
}

// L. ChatGPT éteint, répartition « Gemini d'abord » (29/09/2026) : les fiches de production codex hors prospection vont chez Gemini (MAX_AG),
//    puis, Gemini plein ou quota Gemini épuisé (au lancement, ou dit par l'agent sur une fiche qu'il n'a pas prise), sur la voie libre.
function partieL(J, cibles) {
  const ETEINT = ['--max=4', '--max-libre=4', '--retour-chatgpt=2099-01-01T00:00:00Z']
  const TYPES = { '026-920': 'migration', '026-911': 'juge' }
  // L1 : Gemini a de la place (901, 902, 906 ; 903 est une fiche antigravity, prise dans la même file MAX_AG).
  const b = bacMoteur(cibles)
  const t = tourMoteur(b, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agPrend: { '026-901': true } }, [...ETEINT, '--max-ag=3'])
  J.ok('L', 'Gemini a de la place (3) : 901 et 902 (production codex hors prospection) puis 903 (antigravity), dans l\'ordre de l\'INDEX, chez Gemini', ['026-901', '026-902', '026-903'].every((id) => aLance(b, 'antigravity', id).length === 1) && Object.keys(etatMoteur(b).ag).length === 3, court(JSON.stringify(Object.keys(etatMoteur(b).ag)) + t.journal, 300))
  J.ok('L', 'Gemini a de la place : rien sur la voie libre (ni sur l\'usine) pour ces trois fiches', ['026-901', '026-902', '026-903'].every((id) => aLance(b, 'usine', id).length === 0))
  J.ok('L', 'Gemini plein (3/3) : 026-906 (codex) part sur la voie libre (--fournisseur=ol), pas chez Gemini ; 904 et 907 (antigravity) attendent', aLance(b, 'usine', '026-906', '--fournisseur=ol').length === 1 && !!etatMoteur(b).libre['026-906'] && aLance(b, 'antigravity', '026-906').length === 0 && aLance(b, 'antigravity', '026-904').length === 0 && aLance(b, 'antigravity', '026-907').length === 0 && aLance(b, 'usine', '026-904').length === 0)
  J.ok('L', 'même lancement que les fiches antigravity : ag-<id>, --tache=<id>, --model=pro', ['026-901', '026-902'].every((id) => appelsDe(b).some((a) => a.qui === 'antigravity' && a.args.join(' ') === `lancer ag-${id} --tache=${id} --model=pro`)))
  J.ok('L', 'prospection (026-905) : ni Gemini ni voie libre, elle attend (Claude la prend)', aLance(b, 'antigravity', '026-905').length === 0 && aLance(b, 'usine', '026-905').length === 0 && !!etatMoteur(b).sansLibre['026-905'])
  J.ok('L', 'rédaction croisée : toujours attente de ChatGPT (jamais la voie libre ; migration 026-920)', aLance(b, 'usine', '026-920').length === 0 && /026-920 attend le retour de ChatGPT/.test(t.journal))
  // L2 : 901 (codex) passée en fait/ par Gemini : vérifiée par le PC, commitée « production par Gemini », comme une fiche antigravity.
  ecrire(path.join(b.depot, 'lib', 'route-a.ts'), 'import { suivi } from \'@/lib/suivi\'\nimport { aideA } from \'./aide-a\'\nexport const routeA = suivi + aideA\n'); ecrire(path.join(b.depot, 'lib', 'aide-a.ts'), 'export const aideA = 1\n')
  fs.renameSync(path.join(b.depot, '.orchestre', 'en-cours', '026-901.md'), path.join(b.depot, '.orchestre', 'fait', '026-901.md'))
  const t2 = tourMoteur(b, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agPrend: { '026-901': true } }, [...ETEINT, '--max-ag=3'])
  J.ok('L', '026-901 (codex) passée en fait/ par Gemini : vérifiée par le PC, commitée « production par Gemini » et poussée', /026-901 PASS \(Gemini\), commitée et poussée/.test(t2.journal) && /026-901 : production par Gemini/.test(gitIn(b.depot, 'log', 'origin/main', '--format=%s', '-3').stdout) && etatMoteur(b).faits.includes('026-901'), court(t2.journal, 400))
  // L3 : quota Gemini épuisé au lancement : essayé UNE fois, puis 30 min sans Gemini, tout sur la voie libre.
  const b3 = bacMoteur(cibles)
  const t3 = tourMoteur(b3, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' }, agQuota: true }, [...ETEINT, '--max-ag=4'])
  const e3 = etatMoteur(b3)
  J.ok('L', 'quota Gemini au lancement : essayé une seule fois (pas de martelage), noté au journal, plus de Gemini pendant 30 min', appelsDe(b3).filter((a) => a.qui === 'antigravity' && a.args[0] === 'lancer').length === 1 && /quota Gemini épuisé/.test(t3.journal) && e3.agQuota > Date.now(), court(t3.journal, 400))
  J.ok('L', 'quota Gemini : 901, 902 et 906 partent sur la voie libre (--fournisseur=ol), Gemini vide', ['026-901', '026-902', '026-906'].every((id) => aLance(b3, 'usine', id, '--fournisseur=ol').length === 1 && !!e3.libre[id]) && Object.keys(e3.ag).length === 0, court(JSON.stringify(e3.libre) + JSON.stringify(e3.ag)))
  J.ok('L', 'quota Gemini : la fiche antigravity 026-903 n\'a pas de voie libre, elle attend', aLance(b3, 'usine', '026-903').length === 0)
  J.ok('L', 'quota Gemini : la prospection reste en attente', aLance(b3, 'usine', '026-905').length === 0 && !!e3.sansLibre['026-905'])
  // L4 : Gemini a « pris » la fiche sans la prendre (elle reste en file/) et dit le quota : place rendue, fiche écartée de Gemini, voie libre.
  const b4 = bacMoteur(cibles)
  const sc4 = { types: TYPES, recuperer: { '026-925': 'encours' } }
  tourMoteur(b4, cibles.moteur, sc4, [...ETEINT, '--max-ag=1', '--max-libre=0'])
  J.ok('L', 'quota dit par l\'agent : 026-901 chez Gemini au tour 1', !!etatMoteur(b4).ag['026-901']?.deCodex)
  const t4 = tourMoteur(b4, cibles.moteur, { ...sc4, agEtat: { 'ag-026-901': 'travaille' }, agDernier: { '026-901': 'Error RESOURCE_EXHAUSTED 429 quota' } }, [...ETEINT, '--max-ag=1', '--max-libre=4'])
  const e4 = etatMoteur(b4)
  J.ok('L', 'quota dit par l\'agent sur une fiche restée en file/ : place rendue, journal, fiche écartée de Gemini, plus de Gemini 30 min', !e4.ag['026-901'] && /026-901 : quota Gemini épuisé chez ag-026-901/.test(t4.journal) && !!e4.geminiEcarte['026-901'] && e4.agQuota > Date.now(), court(t4.journal, 400))
  J.ok('L', 'quota dit par l\'agent : 026-901 repart sur la voie libre dans le même tour', aLance(b4, 'usine', '026-901', '--fournisseur=ol').length === 1 && !!e4.libre['026-901'], court(t4.journal, 400))
  // L5 : ChatGPT revenu (date passée) : Gemini n'est plus consulté pour les fiches codex.
  const b5 = bacMoteur(cibles)
  tourMoteur(b5, cibles.moteur, { types: TYPES, recuperer: { '026-925': 'encours' } }, ['--max=4', '--retour-chatgpt=2020-01-01T00:00:00Z', '--max-ag=6'])
  J.ok('L', 'ChatGPT de retour : les fiches codex repartent sur Codex (abonnement), Gemini ne garde que ses fiches antigravity', ['026-901', '026-902', '026-905'].every((id) => aLance(b5, 'antigravity', id).length === 0) && aLance(b5, 'usine', '026-901').length === 1 && aLance(b5, 'antigravity', '026-903').length === 1)
}

// ── V. les VÉRIFICATIONS lourdes sur l'usine (29/09/2026, PC saturé) : verifier-usine.mjs, verifier-final.mjs, le moteur ─────────────────────────────
// Dépôt jetable (PRESTI_RACINE), doublures de usine.mjs (executer : le code, la sortie et les preuves d'un scénario) et de orchestre.mjs (digest, contexte,
// verifier). Prouve : le verdict de l'usine est écrit comme celui de l'orchestre (mêmes champs, plus "machine":"usine"), rien n'est écrit quand l'usine ne
// peut pas juger (secrets, 124/125, HEAD non poussé, échec qui parle de fichiers absents), la vérification finale passe par l'usine puis, seulement en
// repli, par le PC ; et le moteur : Gemini jugé par verifier-final, typecheck sur l'usine (une nouvelle chance quand HEAD n'est pas encore poussé, PC en repli seulement).
const DOUBLURE_USINE_V = `import fs from 'node:fs'
import path from 'node:path'
const BANC = process.env.BANC_DIR
const noter = (o) => fs.appendFileSync(path.join(BANC, 'appels.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\\n')
const args = process.argv.slice(2)
noter({ qui: 'usine', args })
const s = JSON.parse(fs.readFileSync(path.join(BANC, 'scen.json'), 'utf8'))
for (const [p, t] of Object.entries(s.ecrire || {})) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t) }
if (s.sortie) process.stdout.write(s.sortie + '\\n')
if (s.erreur) process.stderr.write(s.erreur + '\\n')
process.exitCode = s.code ?? 0
`
const DOUBLURE_ORCH_V = `import fs from 'node:fs'
import path from 'node:path'
const BANC = process.env.BANC_DIR
const [cmd, id] = process.argv.slice(2)
fs.appendFileSync(path.join(BANC, 'appels.jsonl'), JSON.stringify({ t: Date.now(), qui: 'orchestre', args: process.argv.slice(2) }) + '\\n')
if (cmd === 'verifier') {
  const ou = ['fait', 'en-cours'].find((d) => fs.existsSync(path.join('.orchestre', d, id + '.md')))
  fs.appendFileSync(path.join('.orchestre', 'verdicts.jsonl'), JSON.stringify({ id, verdict: 'PASS', ligne: '', code: 0, date: new Date().toISOString(), duree_s: 1, agent: '?', executant: 'codex', lignes: 0, dossier: ou }) + '\\n')
  console.log('✓ ' + id + ' : PASS · 1s · 0 ligne(s) produite(s)'); process.exitCode = 0
} else process.exitCode = 0
`
const FICHE_V = (id, verifier) => `---\nid: ${id}\ntype: feature\nobjectif: essai du banc V\nperimetre: [lib/v-${id}.ts, .orchestre/preuves/${id}/**]\ninterdit: [app/**]\nverifier: ${verifier}\nexecutant: codex\nbudget: { fichiers: 3, minutes: 10 }\npreuve: sortie de verifier\n---\n\n# ${id}\n`
function bacV({ pousse = true } = {}) {
  const d = fs.mkdtempSync(path.join(TMP, 'V-'))
  const depot = path.join(d, 'presti'); const origine = path.join(d, 'origine.git')
  gitIn(d, 'init', '-q', '--bare', '-b', 'main', origine); gitIn(d, 'init', '-q', '-b', 'main', depot)
  ecrire(path.join(depot, 'scripts', 'usine.mjs'), DOUBLURE_USINE_V)
  ecrire(path.join(depot, 'scripts', 'orchestre.mjs'), DOUBLURE_ORCH_V)
  ecrire(path.join(depot, 'scripts', 'lib', 'preuves.mjs'), fs.readFileSync(path.join(PRESTI, 'scripts', 'lib', 'preuves.mjs'), 'utf8'))
  ecrire(path.join(depot, '.orchestre', 'orchestre.json'), JSON.stringify({ projet: 'banc', executants: ['antigravity', 'codex', 'claude-code'], maxMinutes: 30 }))
  for (const x of ['file', 'fait', 'en-cours', 'refuse', 'preuves']) ecrire(path.join(depot, '.orchestre', x, '.garde'), '')
  ecrire(path.join(depot, '.orchestre', 'verdicts.jsonl'), '')
  gitIn(depot, 'add', '-A'); gitIn(depot, 'commit', '-q', '-m', 'dépôt du banc V')
  gitIn(depot, 'remote', 'add', 'origin', origine)
  if (pousse) gitIn(depot, 'push', '-q', 'origin', 'main')
  return { d, depot }
}
const poserFiche = (b, id, verifier, dossier = 'fait') => ecrire(path.join(b.depot, '.orchestre', dossier, `${id}.md`), FICHE_V(id, verifier))
function lancerV(b, script, id, scen, env = {}) {
  ecrire(path.join(b.d, 'scen.json'), JSON.stringify(scen))
  const r = spawnSync(process.execPath, [script, id], { cwd: b.depot, encoding: 'utf8', timeout: 180_000, env: { ...process.env, BANC_DIR: b.d, PRESTI_RACINE: b.depot, PRESTI_SANS_ATTENTE_HEAD: '1', ...env } })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` }
}
const verdictsV = (b) => (lire(path.join(b.depot, '.orchestre', 'verdicts.jsonl')) || '').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const ouV = (b, id) => ['en-cours', 'fait', 'refuse'].find((x) => fs.existsSync(path.join(b.depot, '.orchestre', x, `${id}.md`))) || null

function partieV(J, cibles) {
  const VU = cibles.verifierUsine; const VF = cibles.verifierFinal
  // 1. PASS : mêmes champs que l'orchestre + machine, digest régénéré par l'orchestre, arguments d'executer (bac, id, preuves, bash -c).
  let b = bacV(); poserFiche(b, '026-980', 'node scripts/v-qa.mjs --groupe=a'); ecrire(path.join(b.depot, '.orchestre', 'preuves', '026-980', 'avant.txt'), 'x')
  let r = lancerV(b, VU, '026-980', { code: 0, sortie: 'FAIL a-1 (ligne de la commande, elle-même)', ecrire: { '.orchestre/preuves/026-980/rapport.txt': 'un vrai contenu' } })
  let v = verdictsV(b).at(-1) || {}
  J.ok('V', 'usine PASS : code 0, « ✓ 026-980 : PASS … machine : usine », fiche laissée en fait/', r.code === 0 && /✓ 026-980 : PASS/.test(r.sortie) && ouV(b, '026-980') === 'fait', court(r.sortie, 300))
  J.ok('V', 'usine PASS : la ligne de verdict a les champs de l\'orchestre dans le même ordre + "machine":"usine"',
    Object.keys(v).join(',') === 'id,verdict,ligne,code,date,duree_s,agent,executant,lignes,dossier,machine' && v.verdict === 'PASS' && v.machine === 'usine' && v.code === 0 && v.executant === 'codex' && v.dossier === 'fait', JSON.stringify(v))
  const ap = appelsDe(b)
  const ex = ap.find((a) => a.qui === 'usine')?.args || []
  J.ok('V', 'usine PASS : executer --nom=verif-<id> --id=<id> --rapatrier=.orchestre/preuves/<id> -- bash -c <verifier>',
    ex[0] === 'executer' && ex.includes('--nom=verif-026-980') && ex.includes('--id=026-980') && ex.includes('--rapatrier=.orchestre/preuves/026-980') && ex.slice(-3).join(' ') === 'bash -c node scripts/v-qa.mjs --groupe=a' && /^--delai=10$/.test(ex.find((x) => x.startsWith('--delai=')) || ''), ex.join(' '))
  J.ok('V', 'usine PASS : le digest et le contexte sont régénérés par l\'orchestre (jamais écrits à la main)', ap.some((a) => a.qui === 'orchestre' && a.args[0] === 'digest') && ap.some((a) => a.qui === 'orchestre' && a.args[0] === 'contexte'))
  J.ok('V', 'usine PASS : verifier.log écrit (commande, code, « machine usine »)', /^\$ node scripts\/v-qa\.mjs --groupe=a\n# .* · code 0 · \d+s · machine usine/.test(lire(path.join(b.depot, '.orchestre', 'preuves', '026-980', 'verifier.log')) || ''))
  // 2. FAIL : ligne du verdict = celle de la commande, pas le bruit d'executer ; fiche fait/ → refuse/.
  b = bacV(); poserFiche(b, '026-981', 'node scripts/v-qa.mjs')
  r = lancerV(b, VU, '026-981', { code: 1, sortie: 'préambule', erreur: '· usine executer : commande finie en 3 s sur l’usine, code 1 (seule)\n✗ usine executer : bruit de mise en place\nFAIL V-7 — le critère est rouge', ecrire: { '.orchestre/preuves/026-981/rapport.txt': 'x' } })
  v = verdictsV(b).at(-1) || {}
  J.ok('V', 'usine FAIL : code 1, ligne « FAIL V-7 … » (pas le bruit d\'executer), fiche fait/ → refuse/, verdict machine usine', r.code === 1 && v.verdict === 'FAIL' && /^FAIL V-7 — le critère est rouge/.test(v.ligne) && ouV(b, '026-981') === 'refuse' && v.machine === 'usine', `${JSON.stringify(v)} ; où ${ouV(b, '026-981')}`)
  // 3. Secrets : jamais envoyés, rien n'est écrit, code 3.
  for (const [cmd, quoi] of [['node scripts/x-qa.mjs --reel --groupe=socle', '--reel'], ['node --env-file=.env.local scripts/x.mjs', '.env.local'], ['node scripts/stripe-qa.mjs', 'stripe'], ['node scripts/x.mjs --service_role', 'service_role']]) {
    b = bacV(); poserFiche(b, '026-982', cmd)
    r = lancerV(b, VU, '026-982', { code: 0 })
    J.ok('V', `secrets (${quoi}) : « à vérifier sur le PC », code 3, executer jamais lancé, aucun verdict, fiche intacte`, r.code === 3 && /à vérifier sur le PC/.test(r.sortie) && !appelsDe(b).some((a) => a.qui === 'usine') && verdictsV(b).length === 0 && ouV(b, '026-982') === 'fait', court(r.sortie, 200))
  }
  // 4. L'usine n'a pas jugé (125, 124) : rien n'est écrit, ce n'est PAS un FAIL.
  for (const code of [125, 124]) {
    b = bacV(); poserFiche(b, '026-983', 'node scripts/v-qa.mjs')
    r = lancerV(b, VU, '026-983', { code, erreur: '✗ usine executer : usine injoignable' })
    J.ok('V', `l'usine ne juge pas (executer ${code}) : code 3, aucun verdict, fiche intacte (pas de FAIL, pas de refuse/)`, r.code === 3 && verdictsV(b).length === 0 && ouV(b, '026-983') === 'fait', court(r.sortie, 200))
  }
  // 5. Un échec qui parle de fichiers absents du bac ou de secrets : le PC rejuge (un FAIL faux rangerait la fiche en refuse/).
  for (const msg of ['Error: ENOENT: no such file or directory, open .orchestre/travail/x.json', 'SUPABASE_URL manquante', 'lecture de .env.local impossible']) {
    b = bacV(); poserFiche(b, '026-984', 'node scripts/v-qa.mjs')
    r = lancerV(b, VU, '026-984', { code: 1, sortie: msg })
    J.ok('V', `échec « ${court(msg, 40)} » : code 3 (le PC rejuge), aucun verdict, fiche intacte`, r.code === 3 && verdictsV(b).length === 0 && ouV(b, '026-984') === 'fait', court(r.sortie, 200))
  }
  // 6. Preuve vide : FAIL, comme l'orchestre. Aucun fichier rapporté par executer (125 « preuve absente ») avec une commande verte : PASS, comme l'orchestre.
  b = bacV(); poserFiche(b, '026-985', 'node scripts/v-qa.mjs')
  r = lancerV(b, VU, '026-985', { code: 0, ecrire: { '.orchestre/preuves/026-985/capture.png': '' } })
  v = verdictsV(b).at(-1) || {}
  J.ok('V', 'preuve de 0 octet : FAIL « preuve vide : capture.png » (même règle que l\'orchestre)', r.code === 1 && v.verdict === 'FAIL' && /preuve vide : capture\.png/.test(v.ligne), JSON.stringify(v))
  b = bacV(); poserFiche(b, '026-986', 'node scripts/v-qa.mjs')
  r = lancerV(b, VU, '026-986', { code: 125, erreur: '✗ usine executer : --rapatrier=.orchestre/preuves/026-986 : aucun fichier écrit par la commande sous .orchestre/preuves/026-986' })
  v = verdictsV(b).at(-1) || {}
  J.ok('V', 'commande verte sans aucun fichier de preuve (executer 125 « aucun fichier écrit ») : PASS, comme l\'orchestre qui n\'exige pas de fichier', r.code === 0 && v.verdict === 'PASS' && v.code === 0, `${r.code} ${JSON.stringify(v)}`)
  // 7. HEAD du PC pas poussé : attendu (jamais poussé d'ici), puis « à vérifier sur le PC ». Poussé : l'usine juge.
  b = bacV({ pousse: false }); poserFiche(b, '026-987', 'node scripts/v-qa.mjs')
  r = lancerV(b, VU, '026-987', { code: 0 }, { PRESTI_SANS_ATTENTE_HEAD: '', PRESTI_ATTENTE_HEAD_S: '1' })
  J.ok('V', 'HEAD pas poussé : code 3 « toujours pas poussé », executer jamais lancé, aucun push fait d\'ici', r.code === 3 && /toujours pas poussé/.test(r.sortie) && !appelsDe(b).some((a) => a.qui === 'usine') && gitIn(b.depot, 'ls-remote', 'origin').stdout.trim() === '', court(r.sortie, 200))
  b = bacV({ pousse: true }); poserFiche(b, '026-988', 'node scripts/v-qa.mjs')
  r = lancerV(b, VU, '026-988', { code: 0, ecrire: { '.orchestre/preuves/026-988/r.txt': 'ok' } }, { PRESTI_SANS_ATTENTE_HEAD: '' })
  J.ok('V', 'HEAD poussé : l\'usine juge, sans attente', r.code === 0 && (verdictsV(b).at(-1) || {}).machine === 'usine', court(r.sortie, 200))
  // 8. verifier-final : l'usine d'abord ; le PC seulement en repli ou sur demande.
  b = bacV(); poserFiche(b, '026-989', 'node scripts/v-qa.mjs')
  r = lancerV(b, VF, '026-989', { code: 0, ecrire: { '.orchestre/preuves/026-989/r.txt': 'ok' } })
  J.ok('V', 'verifier-final : l\'usine juge (PASS machine usine), l\'orchestre du PC n\'est PAS appelé pour verifier', r.code === 0 && (verdictsV(b).at(-1) || {}).machine === 'usine' && !appelsDe(b).some((a) => a.qui === 'orchestre' && a.args[0] === 'verifier') && /✓ 026-989 : PASS/.test(r.sortie), court(r.sortie, 300))
  b = bacV(); poserFiche(b, '026-990', 'node scripts/x-qa.mjs --reel')
  r = lancerV(b, VF, '026-990', { code: 0 })
  J.ok('V', 'verifier-final : fiche à secrets (--reel) → repli sur le PC (orchestre verifier), PASS rendu tel quel, executer jamais lancé', r.code === 0 && appelsDe(b).some((a) => a.qui === 'orchestre' && a.args[0] === 'verifier') && !appelsDe(b).some((a) => a.qui === 'usine') && /✓ 026-990 : PASS/.test(r.sortie) && !(verdictsV(b).at(-1) || {}).machine, court(r.sortie, 300))
  b = bacV(); poserFiche(b, '026-991', 'node scripts/v-qa.mjs')
  r = lancerV(b, VF, '026-991', { code: 125, erreur: '✗ usine executer : usine injoignable' })
  J.ok('V', 'verifier-final : usine muette (125) → repli sur le PC, une seule ligne de verdict (celle du PC)', r.code === 0 && appelsDe(b).some((a) => a.qui === 'orchestre' && a.args[0] === 'verifier') && verdictsV(b).length === 1 && /l'usine ne juge pas/.test(r.sortie), court(r.sortie, 300))
  b = bacV(); poserFiche(b, '026-992', 'node scripts/v-qa.mjs')
  r = lancerV(b, VF, '026-992', { code: 0 }, { PRESTI_VERIFIER_PC: '1' })
  J.ok('V', 'verifier-final : PRESTI_VERIFIER_PC=1 → le PC seul', r.code === 0 && !appelsDe(b).some((a) => a.qui === 'usine') && appelsDe(b).some((a) => a.qui === 'orchestre' && a.args[0] === 'verifier'), court(r.sortie, 200))
  b = bacV(); poserFiche(b, '026-993', 'node scripts/v-qa.mjs')
  r = lancerV(b, VF, '026-993', { code: 1, sortie: 'FAIL Z-2 — rouge' })
  J.ok('V', 'verifier-final : FAIL de l\'usine rendu tel quel (code 1, pas de second avis du PC), fiche en refuse/', r.code === 1 && !appelsDe(b).some((a) => a.qui === 'orchestre' && a.args[0] === 'verifier') && ouV(b, '026-993') === 'refuse', court(r.sortie, 300))

  // 9. Le moteur : Gemini jugé par verifier-final (doublure dans presti-ops/usine du bac) ; typecheck sur l'usine.
  const m = bacMoteur(cibles, { prefixe: 'V-', lignes: LIGNES, enCours: [] })
  ecrire(path.join(m.ops, 'verifier-final.mjs'), `import fs from 'node:fs'\nimport path from 'node:path'\nimport { spawnSync } from 'node:child_process'\nfs.appendFileSync(path.join(process.env.BANC_DIR, 'appels.jsonl'), JSON.stringify({ qui: 'verifier-final', id: process.argv[2] }) + '\\n')\nconst r = spawnSync(process.execPath, ['scripts/orchestre.mjs', 'verifier', process.argv[2]], { encoding: 'utf8' })\nprocess.stdout.write(r.stdout || ''); process.exitCode = r.status ?? 1\n`)
  let t = tourMoteur(m, cibles.moteur, { types: {}, agPrend: { '026-903': true } }, ['--max=1', '--max-libre=0', '--max-ag=2'])
  const D_ = m.depot
  if (fs.existsSync(path.join(D_, '.orchestre', 'en-cours', '026-903.md'))) {
    fs.renameSync(path.join(D_, '.orchestre', 'en-cours', '026-903.md'), path.join(D_, '.orchestre', 'fait', '026-903.md'))
    ecrire(path.join(D_, 'lib', 'ecran-c.ts'), 'export const c = 3\n')
    ecrire(path.join(m.d, 'exec-n'), '0')
    t = tourMoteur(m, cibles.moteur, { types: {}, agEtat: { 'ag-026-903': 'terminé' }, executer: [{ code: 125, erreur: '✗ usine executer : le HEAD du PC (abc) est inconnu de GitHub : pousse d’abord' }, { code: 0 }] }, ['--max=1', '--max-libre=0', '--max-ag=2'])
    const vf = appelsDe(m).filter((a) => a.qui === 'verifier-final')
    const ex1 = appelsDe(m).filter((a) => a.qui === 'usine' && a.args[0] === 'executer' && a.args.includes('--nom=typecheck-moteur'))
    J.ok('V', 'moteur : la vérification finale de Gemini (026-903) passe par verifier-final, pas par l\'orchestre directement', vf.length === 1 && vf[0].id === '026-903', `${vf.length} appel(s) de verifier-final ; ${court(t.journal, 300)}`)
    J.ok('V', 'moteur : typecheck sur l\'usine ; « HEAD inconnu de GitHub » → une nouvelle chance sur l\'usine, le PC ne refait PAS le typecheck', ex1.length === 2 && !/typecheck sur le PC/.test(t.journal) && /026-903 PASS \(Gemini\), commitée et poussée/.test(t.journal), `${ex1.length} executer ; ${court(t.journal, 400)}`)
  } else J.ok('V', 'moteur : 026-903 prise par Gemini au tour 1', false, court(t.journal, 300))
  // Typecheck : un vrai refus de l'usine (paquet refusé, 125 sans « pousse d'abord ») → repli PC, une seule tentative sur l'usine.
  const m2 = bacMoteur(cibles, { prefixe: 'V2-', lignes: LIGNES, enCours: [] })
  tourMoteur(m2, cibles.moteur, { types: {}, agPrend: { '026-903': true } }, ['--max=1', '--max-libre=0', '--max-ag=2'])
  if (fs.existsSync(path.join(m2.depot, '.orchestre', 'en-cours', '026-903.md'))) {
    fs.renameSync(path.join(m2.depot, '.orchestre', 'en-cours', '026-903.md'), path.join(m2.depot, '.orchestre', 'fait', '026-903.md'))
    ecrire(path.join(m2.depot, 'lib', 'ecran-c.ts'), 'export const c = 3\n')
    const t2 = tourMoteur(m2, cibles.moteur, { types: {}, agEtat: { 'ag-026-903': 'terminé' }, executer: [{ code: 125, erreur: '✗ usine executer : contrôle du paquet, 1 problème(s)' }] }, ['--max=1', '--max-libre=0', '--max-ag=2'])
    const ex2 = appelsDe(m2).filter((a) => a.qui === 'usine' && a.args[0] === 'executer' && a.args.includes('--nom=typecheck-moteur'))
    J.ok('V', 'moteur : paquet refusé par l\'usine (125) → UNE tentative sur l\'usine puis typecheck du PC en repli (dit au journal)', ex2.length === 1 && /typecheck de l'usine non rendu \(code 125.*typecheck sur le PC \(repli\)/.test(t2.journal), `${ex2.length} executer ; ${court(t2.journal, 400)}`)
  } else J.ok('V', 'moteur : 026-903 prise par Gemini au tour 1 (bac 2)', false)
}

// ── M. les demandes de Benj (29/09/2026, migration 0117) : bus (doublé) → fiche dem-<id8> → Gemini puis voie libre → BRANCHE, jamais main ───────────
const FAUX_BUS = `import http from 'node:http'
import fs from 'node:fs'
const F = process.env.BUS_FILE
const lire = () => JSON.parse(fs.readFileSync(F, 'utf8'))
const ecrire = (s) => fs.writeFileSync(F, JSON.stringify(s, null, 1))
const suite = { recue: ['recue', 'en_cours', 'echec'], en_cours: ['en_cours', 'faite', 'echec'] }
const PREFIXE = '/api/agents/demandes'
const srv = http.createServer((req, res) => {
  const rep = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
  if (req.headers.authorization !== 'Bearer jeton-du-banc') return rep(401, { error: 'jeton' })
  const u = new URL(req.url, 'http://x')
  const s = lire()
  if (req.method === 'GET' && u.pathname === PREFIXE) return rep(200, { demandes: s.demandes.filter((d) => !u.searchParams.get('statut') || d.statut === u.searchParams.get('statut')) })
  if (req.method === 'PATCH' && u.pathname.startsWith(PREFIXE + '/')) {
    const id = u.pathname.slice(PREFIXE.length + 1)
    let brut = ''
    req.on('data', (c) => { brut += c })
    req.on('end', () => {
      const c = JSON.parse(brut); const d = s.demandes.find((x) => x.id === id)
      if (!d) return rep(404, { code: 'inconnue' })
      if (!(suite[d.statut] || []).includes(c.statut)) return rep(409, { code: 'statut' })
      if (c.branche && !c.branche.startsWith('demandes/dem-')) return rep(400, { code: 'branche' })
      d.statut = c.statut
      if (c.branche) d.branche = c.branche
      if (c.compte_rendu) d.compte_rendu = c.compte_rendu
      s.majs = [...(s.majs || []), { id, ...c }]
      ecrire(s)
      rep(200, { id, statut: d.statut })
    })
    return
  }
  rep(404, {})
})
srv.listen(0, '127.0.0.1', () => console.log('PORT ' + srv.address().port))
`
const D1 = '11111111-1111-4111-8111-111111111111', D2 = '22222222-2222-4222-8222-222222222222', D3 = '33333333-3333-4333-8333-333333333333', D4 = '44444444-4444-4444-8444-444444444444'
async function partieM(J, cibles) {
  const b = bacMoteur(cibles, { lignes: [], enCours: [] })
  ecrire(path.join(b.depot, 'scripts', 'demandes-ecosysteme.mjs'), fs.readFileSync(cibles.demandes, 'utf8'))
  gitIn(b.depot, 'add', '-A'); gitIn(b.depot, 'commit', '-q', '-m', 'module des demandes'); gitIn(b.depot, 'push', '-q', 'origin', 'main')
  const busFichier = path.join(b.d, 'bus.json')
  const demande = (id, texte) => ({ id, texte, statut: 'recue', branche: null, compte_rendu: null })
  ecrire(busFichier, JSON.stringify({ demandes: [demande(D1, "Ajoute un bouton « Copier le lien » sur la page d'un devis, comme celui des factures."), demande(D2, 'Importe les entreprises par SIREN et prépare la liste à appeler.'), demande(D3, 'Change la couleur du bouton principal du Poste.')] }))
  ecrire(path.join(b.d, 'faux-bus.mjs'), FAUX_BUS)
  const bus = spawn(process.execPath, [path.join(b.d, 'faux-bus.mjs')], { env: { ...process.env, BUS_FILE: busFichier }, windowsHide: true })
  const port = await new Promise((ok) => { let t = ''; bus.stdout.on('data', (c) => { t += c; const m = t.match(/PORT (\d+)/); if (m) ok(m[1]) }); setTimeout(() => ok(null), 15_000) })
  try {
    if (!port) { J.ok('M', 'le faux bus démarre', false); return }
    const env = { PRESTI_DEMANDES_BASE: `http://127.0.0.1:${port}`, PRESTI_JETON_DEMANDES: 'jeton-du-banc' }
    const bd = () => JSON.parse(fs.readFileSync(busFichier, 'utf8'))
    const dem = (id) => bd().demandes.find((x) => x.id === id)
    const teteAvant = gitIn(b.depot, 'rev-parse', 'HEAD').stdout.trim()
    const origineAvant = gitIn(b.depot, 'rev-parse', 'origin/main').stdout.trim()
    const branches = () => gitIn(b.depot, 'branch', '--list', 'demandes/*').stdout.split('\n').map((l) => l.replace('*', '').trim()).filter(Boolean)
    const dansBranche = (br, chemin) => gitIn(b.depot, 'ls-tree', '-r', '--name-only', br).stdout.split('\n').includes(chemin)
    const poussee = (br) => gitIn(b.depot, 'ls-remote', 'origin', `refs/heads/${br}`).stdout.trim() !== ''
    // Tour 1 : Gemini pour D1, D2 (prospects) attend Claude, la voie libre pour D3 (Gemini plein : --max-ag=1).
    let t = tourMoteur(b, cibles.moteur, { agPrend: { 'dem-11111111': true } }, ['--max=1', '--max-libre=1', '--max-ag=1'], env)
    J.ok('M', 'tour 1 : le moteur tourne', t.code === 0 && /moteur arrêté/.test(t.journal), court(t.sortie, 300))
    const fiche = lire(path.join(b.depot, '.orchestre', 'en-cours', 'dem-11111111.md')) || ''
    J.ok('M', 'D1 : la fiche dem-11111111 porte le texte de Benj tel quel dans un bloc « donnée »', fiche.includes("<donnee_demande>\nAjoute un bouton « Copier le lien » sur la page d'un devis, comme celui des factures.\n</donnee_demande>"), court(fiche, 200))
    J.ok('M', 'D1 : la fiche porte les contraintes fixes (migration, secret, drapeau, page publique, envoi, contact commercial, jamais sur main) et le juge fixe', ['Jamais de migration', 'Jamais de secret', 'Jamais de drapeau', 'Jamais de page publique', 'Aucun envoi', 'Aucune donnée de contact commercial', 'demandes/dem-11111111, jamais sur main', 'npm run typecheck', 'node scripts/garde-commit.mjs'].every((x) => fiche.includes(x)), court(fiche, 80))
    J.ok('M', "D1 → Gemini d'abord (lancer ag-dem-11111111 --tache=dem-11111111 --model=pro), passée en_cours au bus", appelsDe(b).some((a) => a.qui === 'antigravity' && a.args.join(' ') === 'lancer ag-dem-11111111 --tache=dem-11111111 --model=pro') && dem(D1).statut === 'en_cours', dem(D1).statut)
    J.ok('M', 'D2 (SIREN, admission à sec refusée) : ni Gemini ni voie libre, reste recue avec « attend Claude (données de prospects) », fiche retirée de file/', dem(D2).statut === 'recue' && dem(D2).compte_rendu === 'attend Claude (données de prospects)' && aLance(b, 'usine', 'dem-22222222').length === 0 && aLance(b, 'antigravity', 'dem-22222222').length === 0 && !fs.existsSync(path.join(b.depot, '.orchestre', 'file', 'dem-22222222.md')), JSON.stringify(dem(D2)))
    J.ok('M', "D3 : Gemini plein → la voie libre (lancer dem-33333333 --fournisseur=ol), jamais l'abonnement Codex ; en_cours au bus", aLance(b, 'usine', 'dem-33333333', '--fournisseur=ol').length === 1 && dem(D3).statut === 'en_cours', court(t.journal, 300))
    J.ok('M', "tour 1 : main n'a pas bougé (aucun commit, aucun push)", gitIn(b.depot, 'rev-parse', 'HEAD').stdout.trim() === teteAvant && gitIn(b.depot, 'rev-parse', 'origin/main').stdout.trim() === origineAvant)
    // Entre les tours : Gemini écrit lib/bouton-copier.ts (fiche en fait/), la voie libre rend un PASS avec un vrai patch, et une demande D4 arrive.
    fs.renameSync(path.join(b.depot, '.orchestre', 'en-cours', 'dem-11111111.md'), path.join(b.depot, '.orchestre', 'fait', 'dem-11111111.md'))
    ecrire(path.join(b.depot, 'lib', 'bouton-copier.ts'), 'export const copierLeLien = (u: string) => u\n')
    const d = bd(); d.demandes.push(demande(D4, 'Renomme le libellé du menu Sites en Commandes de site.')); ecrire(busFichier, JSON.stringify(d))
    t = tourMoteur(b, cibles.moteur, { agEtat: { 'ag-dem-11111111': 'terminé' }, agPrend: { 'dem-44444444': true }, recuperer: { 'dem-33333333': 'pass-reel' }, fichiers: { 'dem-33333333': { 'lib/couleur.ts': 'export const couleur = 1\n' } } }, ['--max=1', '--max-libre=1', '--max-ag=1'], env)
    J.ok('M', 'tour 2 : le moteur tourne', t.code === 0 && /moteur arrêté/.test(t.journal), court(t.sortie, 300))
    J.ok('M', 'D1 faite : branche demandes/dem-11111111 au bus, avec compte rendu', dem(D1).statut === 'faite' && dem(D1).branche === 'demandes/dem-11111111' && /à relire/.test(dem(D1).compte_rendu || ''), JSON.stringify(dem(D1)) + ' ' + court(t.journal, 300))
    J.ok('M', 'D1 : la branche existe, poussée, et porte lib/bouton-copier.ts et la fiche', dansBranche('demandes/dem-11111111', 'lib/bouton-copier.ts') && dansBranche('demandes/dem-11111111', '.orchestre/fait/dem-11111111.md') && poussee('demandes/dem-11111111'), branches().join(','))
    J.ok('M', "D1 : le travail est retiré de l'arbre du PC", !fs.existsSync(path.join(b.depot, 'lib', 'bouton-copier.ts')))
    J.ok('M', 'D3 (voie libre) faite : branche demandes/dem-33333333 avec lib/couleur.ts, poussée, travail retiré du PC', dem(D3).statut === 'faite' && dem(D3).branche === 'demandes/dem-33333333' && dansBranche('demandes/dem-33333333', 'lib/couleur.ts') && poussee('demandes/dem-33333333') && !fs.existsSync(path.join(b.depot, 'lib', 'couleur.ts')), JSON.stringify(dem(D3)))
    J.ok('M', "main n'a pas bougé : HEAD et origin/main identiques, aucun commit de demande, la branche part de HEAD", gitIn(b.depot, 'rev-parse', 'HEAD').stdout.trim() === teteAvant && gitIn(b.depot, 'rev-parse', 'origin/main').stdout.trim() === origineAvant && gitIn(b.depot, 'rev-parse', 'demandes/dem-11111111~1').stdout.trim() === teteAvant && !gitIn(b.depot, 'log', 'HEAD', '--format=%s').stdout.split('\n').some((x) => /^dem-/.test(x)), branches().join(','))
    J.ok('M', 'D4 : Gemini (place libérée) ; D2 reste sans lancement', appelsDe(b).some((a) => a.qui === 'antigravity' && a.args.join(' ') === 'lancer ag-dem-44444444 --tache=dem-44444444 --model=pro') && aLance(b, 'usine', 'dem-22222222').length === 0 && dem(D2).statut === 'recue')
    // Tour 3 : le PC dit FAIL pour D4 → echec au bus avec la cause, travail retiré.
    fs.renameSync(path.join(b.depot, '.orchestre', 'en-cours', 'dem-44444444.md'), path.join(b.depot, '.orchestre', 'fait', 'dem-44444444.md'))
    ecrire(path.join(b.depot, 'lib', 'menu.ts'), 'export const menu = 1\n')
    t = tourMoteur(b, cibles.moteur, { agEtat: { 'ag-dem-44444444': 'terminé' }, verdicts: { 'dem-44444444': 'FAIL' } }, ['--max=1', '--max-libre=1', '--max-ag=1'], env)
    J.ok('M', 'D4 rouge (FAIL du PC) : echec au bus avec la cause, aucune branche, travail retiré du PC', dem(D4).statut === 'echec' && /verdict du PC/.test(dem(D4).compte_rendu || '') && !branches().includes('demandes/dem-44444444') && !fs.existsSync(path.join(b.depot, 'lib', 'menu.ts')), JSON.stringify(dem(D4)) + ' ' + court(t.journal, 300))
    J.ok('M', 'aucun commit ni push sur main depuis le début ; le journal dit les demandes', gitIn(b.depot, 'rev-parse', 'origin/main').stdout.trim() === origineAvant && /demande dem-11111111 faite sur la branche demandes\/dem-11111111/.test(lire(path.join(b.ops, 'moteur.log')) || ''), court(lire(path.join(b.ops, 'moteur.log')), 200))
  } finally { bus.kill() }
}

const PARTIES = { V: partieV, A: partieA, K: partieK, L: partieL, B: partieB, C: partieC, D: partieD, E: partieE, F: partieF, G: partieG, H: partieH, M: partieM }
async function jouer(cibles, liste, bavard) {
  const J = nouveauJuge()
  for (const p of liste) {
    try { await PARTIES[p](J, cibles) } catch (e) { J.ok(p, `la partie ${p} a levé une exception`, false, court(e.stack, 400)) }
  }
  if (bavard) for (const x of J.res) console.log(`${x.ok ? '✓' : '✗'} [${x.partie}] ${x.nom}${!x.ok && x.detail ? `\n      ${x.detail}` : ''}`)
  return J.res
}

let rouge = false
for (const [n, f] of Object.entries(CIBLES)) {
  if (!fs.existsSync(f)) { console.log(`✗ cible absente : ${n} (${f})`); rouge = true; continue }
  if (f.endsWith('.mjs')) { const c = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); if (c.status) { console.log(`✗ node --check ${f} : ${court(c.stderr, 300)}`); rouge = true } }
}
const parties = SEUL || Object.keys(PARTIES)
const t0 = Date.now()
const res = await jouer(CIBLES, parties, true)
const rouges = res.filter((x) => !x.ok)
if (rouges.length) rouge = true
console.log(`${rouges.length ? '✗' : '✓'} ${res.length - rouges.length}/${res.length} contrôles verts en ${((Date.now() - t0) / 1000).toFixed(0)} s`)

if (option('mutants')) {
  // --mutants=V,D : seulement les mutants que ces parties jugent (les autres sont retirés de la liste).
  if (option('mutants') !== 'oui') { const p = option('mutants').split(','); for (let i = MUTANTS.length - 1; i >= 0; i--) if (!MUTANTS[i].parties.some((x) => p.includes(x))) MUTANTS.splice(i, 1) }
  // Chaque mutant tourne dans un processus à part (ce banc, --seul=<parties> --cible-<nom>=<copie>), N à la fois.
  const N = Math.max(1, Number(option('paralleles')) || 3)
  console.log(`\nmutants (${MUTANTS.length}, ${N} à la fois) : chaque capacité retirée sur une copie ; le banc doit rougir`)
  const bilans = new Array(MUTANTS.length)
  let suivant = 0
  const unMutant = async (k) => {
    const m = MUTANTS[k]
    let texte = fs.readFileSync(CIBLES[m.cible], 'utf8')
    for (const [de, vers] of m.r) { if (!texte.includes(de)) return { m, etat: 'INAPPLICABLE', detail: `texte introuvable : « ${court(de, 80)} »` }; texte = texte.split(de).join(vers) }
    const dossier = path.join(TMP, `mutant-${k + 1}`); fs.mkdirSync(dossier, { recursive: true })
    const copie = path.join(dossier, path.basename(CIBLES[m.cible]))
    fs.writeFileSync(copie, texte)
    for (const f of ['garde-imports.mjs', 'head-pousse.mjs', 'verifier-usine.mjs', 'verifier-final.mjs']) if (!fs.existsSync(path.join(dossier, f))) fs.copyFileSync(path.join(ICI, f), path.join(dossier, f))
    const r = await new Promise((resoudre) => {
      const enfant = spawn(process.execPath, [fileURLToPath(import.meta.url), `--seul=${m.parties.join(',')}`, `--cible-${m.cible}=${copie}`], { encoding: 'utf8', windowsHide: true })
      let s = ''
      enfant.stdout.on('data', (b) => { s += b }); enfant.stderr.on('data', (b) => { s += b })
      enfant.on('close', (code) => resoudre({ code, s }))
    })
    const premier = r.s.split('\n').find((l) => l.startsWith('✗ ['))
    return { m, etat: r.code === 1 && premier ? 'rouge' : r.code === 0 ? 'vert' : `code ${r.code}`, detail: premier ? premier.replace(/^✗ /, '') : court(r.s.split('\n').filter(Boolean).pop()) }
  }
  await Promise.all(Array.from({ length: Math.min(N, MUTANTS.length) }, async () => { while (suivant < MUTANTS.length) { const k = suivant++; bilans[k] = await unMutant(k) } }))
  for (const b of bilans) {
    const ok = b.etat === 'rouge'
    if (!ok) rouge = true
    console.log(`${ok ? '✓' : '✗'} ${b.m.nom.padEnd(72)} → ${ok ? `le banc rougit : ${court(b.detail, 90)}` : b.etat === 'vert' ? 'LE BANC RESTE VERT' : `${b.etat} — ${b.detail}`}`)
  }
}

if (!option('garder') && !rouge) fs.rmSync(TMP, { recursive: true, force: true })
else console.log(`\ndossiers temporaires gardés : ${TMP}`)
console.log(`\njuges-croises-qa : ${rouge ? 'FAIL' : 'PASS'}`)
process.exitCode = rouge ? 1 : 0
