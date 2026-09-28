#!/usr/bin/env node
// scripts/juges-026-revue-chantier-preuve.mjs — la preuve de 026-121 : les juges de la revue du lundi (revue-qa) et du
// chantier (chantier-qa) sont écrits AVANT ce qu'ils jugent, rouges aujourd'hui, verts sur un code conforme.
//
//   node scripts/juges-026-revue-chantier-preuve.mjs
//
// Sort en code 0 seulement si :
//   P-1  sur l'arbre actuel, tant que la fiche 026-146 n'a rien livré, revue-qa et chantier-qa sortent en code ≠ 0
//        avec RV-1 et CT-1 en premier échec (scripts/chef/revue-donnees.mjs et chantier.mjs n'existent pas) ;
//   P-2  les critères de consigne passent sur l'arbre actuel : RV-4 et RV-6 (revue-hebdo.md, GABARIT.md, le juge du
//        document), CT-5 et CT-7 (chantier.md, indépendance du chantier et du cycle du chef, correction du 27/09) ;
//   P-3  les fixtures disent vrai : attendu.json et attendu-2026-39.json se parsent et portent leurs clés ; le juge
//        proposé de la fiche conforme sort en code ≠ 0 avec une ligne FAIL à identifiant de critère, celui de la fiche
//        « juge vert » en code 0, celui du plantage en code ≠ 0 sans identifiant, celui « PASS puis code 1 » en code ≠ 0
//        avec des identifiants mais sans aucune ligne en échec ; chaque fixture de fiche conforme passe `orchestre valider` ;
//   P-4  chaque juge se prouve (--preuve-echecs) : rouge sur l'arbre de référence avec RV-1 / CT-1 en premier, vert
//        sur le témoin (implémentation de référence), chaque sabotage attrapé par le critère qu'il vise.
// Elle écrit .orchestre/preuves/026-121/echecs-attendus.md (jamais vide), même en cas d'échec.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { conformes, variantes, JUGES as JUGES_PROPOSES } from './fixtures/026/chantier/fiches.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-121')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'juges-026-revue-chantier', `${process.pid}-${crypto.randomBytes(3).toString('hex')}`)
const REVUE = path.join(ICI, 'revue-qa.mjs')
const CHANTIER = path.join(ICI, 'chantier-qa.mjs')
const ENV_SYSTEME = ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'SYSTEMDRIVE', 'LANG', 'TZ']
const CRITERE_RE = /\b[A-Z]{2,5}-\d+\b/
const ECHEC_RE = /(^|[^A-Za-z])(FAIL|ÉCHEC|ECHEC)([^A-Za-z]|$)|✗/

const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
const lire = (p) => fs.readFileSync(p, 'utf8')
const court = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const cellule = (s) => court(s, 160).replace(/\|/g, '\\|')
function environnement() {
  const env = {}
  for (const k of Object.keys(process.env)) if (ENV_SYSTEME.includes(k.toUpperCase())) env[k] = process.env[k]
  return { ...env, FORCE_COLOR: '0' }
}
function lancer(args, { cwd = DEPOT, delai = 600_000 } = {}) {
  return new Promise((resoudre) => {
    const t0 = Date.now()
    const enfant = spawn(process.execPath, args, { cwd, env: environnement(), windowsHide: true })
    let stdout = '', stderr = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { stdout += d })
    enfant.stderr.on('data', (d) => { stderr += d })
    const minuterie = setTimeout(() => {
      expire = true
      try { if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(enfant.pid, 'SIGKILL') } catch { /* déjà mort */ }
    }, delai)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), stdout, stderr, expire, duree_s: Math.round((Date.now() - t0) / 1000) }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, stdout, stderr: `${stderr}\n${e.message}`, expire, duree_s: 0 }) })
  })
}
const verdicts = (s) => s.split(/\r?\n/).map((l) => /^(PASS|FAIL) ((?:RV|CT)-\d+)\b(.*)$/.exec(l)).filter(Boolean).map((m) => ({ verdict: m[1], critere: m[2], texte: m[0] }))
const rapportDe = (s) => { const l = s.split(/\r?\n/).find((x) => x.startsWith('RAPPORT ')); try { return l ? JSON.parse(l.slice(8)) : null } catch { return null } }
const decrire = (r) => `code ${r.code}${r.expire ? ' (délai dépassé)' : ''} : ${court((r.stdout + '\n' + r.stderr).trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' / '), 200)}`

const ko = []
const faits = { actuel: {}, consignes: {}, fixtures: [], preuves: {} }
const t0 = Date.now()
fs.mkdirSync(TRAVAIL, { recursive: true })

try {
  // ── P-1 : rouges sur l'arbre actuel ────────────────────────────────────────────────────────────────────────────────
  for (const [nom, juge, script, premierAttendu] of [['revue-qa', REVUE, 'scripts/chef/revue-donnees.mjs', 'RV-1'], ['chantier-qa', CHANTIER, 'scripts/chef/chantier.mjs', 'CT-1']]) {
    if (existe(path.join(DEPOT, ...script.split('/')))) {
      faits.actuel[nom] = { saute: `${script} existe déjà (026-146 livrée) : la rougeur se prouve sur l'arbre de référence (P-4)` }
      continue
    }
    const r = await lancer([juge])
    const v = verdicts(r.stdout)
    const premier = v.find((x) => x.verdict === 'FAIL')
    faits.actuel[nom] = { code: r.code, premier: premier?.critere || null, lignes: v.map((x) => x.texte), duree_s: r.duree_s }
    if (!r.stdout.trim()) ko.push(`P-1 ${nom} : sortie vide`)
    if (r.code === 0 || premier?.critere !== premierAttendu) ko.push(`P-1 ${nom} sur l'arbre actuel : ${decrire(r)} (attendu : code ≠ 0, ${premierAttendu} en premier échec)`)
  }

  // ── P-2 : les critères de consigne passent ─────────────────────────────────────────────────────────────────────────
  for (const [nom, juge, criteres] of [['revue-qa', REVUE, 'RV-4,RV-6'], ['chantier-qa', CHANTIER, 'CT-5,CT-7']]) {
    const r = await lancer([juge, `--critere=${criteres}`])
    const v = verdicts(r.stdout)
    faits.consignes[nom] = { code: r.code, lignes: r.stdout.split(/\r?\n/).filter((l) => /^(PASS|FAIL|  ✗)/.test(l)) }
    if (r.code !== 0 || v.length !== criteres.split(',').length || v.some((x) => x.verdict !== 'PASS')) ko.push(`P-2 ${nom} --critere=${criteres} : ${decrire(r)}`)
  }

  // ── P-3 : les fixtures disent vrai ────────────────────────────────────────────────────────────────────────────────
  const fixture = (quoi, ok, detail) => { faits.fixtures.push({ quoi, ok, detail }); if (!ok) ko.push(`P-3 ${quoi} : ${detail}`) }
  for (const [fichier, semaine] of [['attendu.json', '2026-38'], ['attendu-2026-39.json', '2026-39']]) {
    const quoi = `${fichier} se parse et porte ses clés (semaine ${semaine})`
    try {
      const a = JSON.parse(lire(path.join(ICI, 'fixtures', '026', 'revue', fichier)))
      const manque = ['semaine', 'du', 'au', 'executants', 'lignes_illisibles', 'fraicheur', 'argent', 'entonnoir'].filter((k) => !(k in a))
      fixture(quoi, !manque.length && a.semaine === semaine, manque.length ? `clés absentes : ${manque.join(', ')}` : `semaine ${a.semaine}, ${Object.keys(a.executants).length} exécutants`)
    } catch (e) { fixture(quoi, false, e.message) }
  }
  const nu = path.join(TRAVAIL, 'juges-nus')
  fs.mkdirSync(nu, { recursive: true })
  for (const [nom, attendu] of [['rouge', 'rouge'], ['vert', 'vert'], ['plante', 'plante'], ['pass-code1', 'pass-code1']]) {
    fs.copyFileSync(JUGES_PROPOSES[nom], path.join(nu, `${nom}.mjs`))
    const r = await lancer([`${nom}.mjs`], { cwd: nu, delai: 120_000 })
    const lignes = (r.stdout + '\n' + r.stderr).split(/\r?\n/)
    const ligneEchec = lignes.find((l) => ECHEC_RE.test(l) && CRITERE_RE.test(l))
    if (attendu === 'rouge') fixture('le juge proposé de la fiche conforme échoue sur un critère identifié', r.code !== 0 && Boolean(ligneEchec), `code ${r.code} ; ${ligneEchec ? `« ${court(ligneEchec, 120)} »` : 'aucune ligne FAIL à identifiant'}`)
    if (attendu === 'vert') fixture('le juge proposé de la fiche « juge vert » sort en code 0', r.code === 0, `code ${r.code}`)
    if (attendu === 'plante') fixture("le juge « plantage » échoue sans aucun identifiant de critère", r.code !== 0 && !lignes.some((l) => CRITERE_RE.test(l)), `code ${r.code} ; ${court(lignes.filter(Boolean).slice(-1)[0], 100)}`)
    if (attendu === 'pass-code1') fixture('le juge « PASS puis code 1 » sort en code ≠ 0 sans aucune ligne en échec', r.code !== 0 && lignes.some((l) => CRITERE_RE.test(l)) && !lignes.some((l) => ECHEC_RE.test(l)), `code ${r.code} ; ${lignes.filter((l) => CRITERE_RE.test(l)).length} ligne(s) à identifiant, ${lignes.filter((l) => ECHEC_RE.test(l)).length} en échec`)
  }
  const racine = path.join(TRAVAIL, 'valider')
  for (const d of ['file', 'en-cours', 'fait', 'refuse', 'propositions']) fs.mkdirSync(path.join(racine, '.orchestre', d), { recursive: true })
  fs.writeFileSync(path.join(racine, '.orchestre', 'orchestre.json'), lire(path.join(DEPOT, '.orchestre', 'orchestre.json')))
  const aValider = [...conformes(), variantes().find((v) => v.nom === 'entete-refuse')]
  for (const v of aValider) {
    const f = path.join(racine, '.orchestre', 'propositions', `${v.nom.replace(/[^a-z0-9]+/gi, '-')}.md`)
    fs.writeFileSync(f, v.texte)
    const r = await lancer([path.join(ICI, 'orchestre.mjs'), 'valider', f], { cwd: racine, delai: 120_000 })
    const attendu = v.attendu === 0
    fixture(`orchestre valider sur la fiche « ${v.nom} »${attendu ? '' : ' (témoin négatif)'}`, (r.code === 0) === attendu, court((r.stdout + r.stderr).split(f).join(path.basename(f)), 140))
  }

  // ── P-4 : chaque juge se prouve (témoin, référence, sabotages) ────────────────────────────────────────────────────
  const [pr, pc] = await Promise.all([lancer([REVUE, '--preuve-echecs'], { delai: 720_000 }), lancer([CHANTIER, '--preuve-echecs'], { delai: 720_000 })])
  for (const [nom, r, premier] of [['revue-qa', pr, 'RV-1'], ['chantier-qa', pc, 'CT-1']]) {
    const rapport = rapportDe(r.stdout)
    faits.preuves[nom] = { code: r.code, duree_s: r.duree_s, rapport, fin: r.stdout.split(/\r?\n/).filter((l) => /^[✓✗]/.test(l)) }
    if (r.code !== 0 || !rapport) ko.push(`P-4 ${nom} --preuve-echecs : ${decrire(r)}`)
    else {
      if (rapport.reference?.premier !== premier) ko.push(`P-4 ${nom} : premier échec de la référence ${rapport.reference?.premier}, attendu ${premier}`)
      if (rapport.temoin?.code !== 0) ko.push(`P-4 ${nom} : témoin en code ${rapport.temoin?.code}`)
      const rates = (rapport.sabotages || []).filter((s) => !s.attrape)
      if (!rapport.sabotages?.length || rates.length) ko.push(`P-4 ${nom} : sabotages non attrapés : ${rates.map((s) => s.nom).join(', ') || 'aucun sabotage'}`)
    }
  }
} catch (e) {
  ko.push(`la preuve a planté : ${e?.stack || e}`)
} finally {
  try { fs.rmSync(TRAVAIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); fs.rmdirSync(path.dirname(TRAVAIL)) } catch { /* tenu, ou un autre passage l'occupe */ }
}

// ── echecs-attendus.md ──────────────────────────────────────────────────────────────────────────────────────────────
const duree = Math.round((Date.now() - t0) / 1000)
const code = ko.length ? 1 : 0
const L = []
L.push('# 026-121 — échecs attendus des juges de la revue du lundi et du chantier', '')
L.push(`Écrit par \`scripts/juges-026-revue-chantier-preuve.mjs\` le ${new Date().toISOString()} (${duree} s). Code de sortie : ${code}.`, '')
if (ko.length) { L.push('## Échecs de la preuve', ''); for (const k of ko) L.push(`- ${k}`); L.push('') }
L.push('## Écarts de lecture (relus avant d\'écrire les juges)', '')
L.push("- **Forme de `revue.json`** : la fiche liste les champs sans fixer leur forme ; `attendu.json` la fixe (c'est le contrat de 026-146) : `executants` est un objet par exécutant (`executant`, sinon `agent`) ; `du` et `au` (lundi et dimanche, jours de Paris) s'ajoutent à `semaine` ; `lignes_illisibles` additionne les deux fichiers ; `fraicheur.etat` reprend `genere_le` de l'état. Une REFUSÉE n'est ni un PASS ni un FAIL ; la médiane part du PREMIER lancement jusqu'au PREMIER PASS depuis `fait/`.")
L.push("- **RV-2 : un jeton absent** donne aussi « non mesuré » en code 0 (la fiche cite le fichier absent et le 401 ; 026-146 ajoute l'erreur réseau) : une revue sans jeton se fait, et dit ce qui n'est pas mesuré. `lireJeton()` de `commun.mjs` lève une erreur de code 2 : `revue-donnees.mjs` doit l'attraper.")
L.push("- **RV-4 : ce qui n'est pas un nombre est une liste fermée** : une date valide (jour ≤ 31, mois ≤ 12), une heure HH:MM valide, une semaine AAAA-SS ou « semaine SS » (SS ≤ 53), un numéro de section ou de liste qui se suit, un identifiant qui commence par une lettre (`RV-1`, `gpt-6-sol`) ou de la forme NNN-NN(N) (`026-146`) ou NNN-mot-clé (`090-relances-devis`, la forme des ids du chantier), jamais suivi de « € », et l'adresse d'un lien. Le code en ligne, le code en bloc et les commentaires ne sont plus retirés en bloc : sans chiffre, ils n'ont rien à vérifier ; avec un chiffre, ils se vérifient. Un nombre abrégé (`12k`, `3 k€`, `1e3`) échoue toujours. Les décisions doivent être classées (du plus gros montant au plus petit), une section manquante échoue, et un montant en `_cents` des données peut s'écrire en euros.")
L.push("- **RV-6 (ajouté)** : la fiche ne nomme pas de critère pour `revue-hebdo.md` et `GABARIT.md` ; RV-6 les juge, comme CT-5 juge `chantier.md`.")
L.push("- **Zones protégées** : 026-146 dit « par préfixe littéral, comme `orchestre.mjs` » ; lu à la lettre, `scripts/*-qa.mjs` (préfixe `scripts/`) interdirait tout `scripts/` à Codex. Les fiches de CT-1 ne touchent chaque zone que par un chemin que les deux lectures couvrent ; le témoin compare un chemin littéral au motif, et deux motifs par préfixe.")
L.push("- **Réponse de `GET /api/agents/decisions?tranchees=1`** : la liste nue `[{ id, cle_idempotence, choix, tranchee_le }]` (026-042, AR-13) ; le faux serveur exige `tranchees=1` et un `depuis` de moins de 30 jours (400 sinon), comme la route. `deposer` doit donc passer un `depuis`.")
L.push("- **Correction du 27/09** : le chantier et la revue sont un travail distinct du cycle du chef (026-148) : Claude Code sur le poste, jeton de la copie de reprise. Jugé par CT-7 (aucun script de `scripts/chef/` ni de `scripts/usine/` ne lance `chantier.mjs` ou `revue-donnees.mjs` ; `chantier.md` le dit ; fixtures du chef et du chantier indépendantes) et par RV-6 (« distinct du cycle du chef »). Les deux autres points de la vérification (« une consigne produit un accusé et un compte rendu », « une tâche hors droits est refusée ») relèvent du chef (026-127/129, 026-105, `chef-qa`) ; côté chantier, la tâche hors droits est la fiche Codex sur une zone protégée (CT-1).")
{
  // Le budget se compte ici, jamais à la main (leçon « Décomptes dans la doc ») : le périmètre de la fiche, hors preuves.
  const budgetFiche = (() => { for (const d of ['fait', 'en-cours', 'file']) { try { const m = /budget:\s*\{\s*fichiers:\s*(\d+)/.exec(lire(path.join(DEPOT, '.orchestre', d, '026-121.md'))); if (m) return Number(m[1]) } catch { /* ailleurs */ } } return null })()
  const perimetre = ['docs/agents/revue-hebdo.md', 'docs/agents/chantier.md', 'docs/revues/GABARIT.md', 'scripts/revue-qa.mjs', 'scripts/chantier-qa.mjs', 'scripts/juges-026-revue-chantier-preuve.mjs']
  const parcourir = (rel) => { const abs = path.join(DEPOT, ...rel.split('/')); if (!existe(abs)) return []; return fs.statSync(abs).isDirectory() ? fs.readdirSync(abs).flatMap((n) => parcourir(`${rel}/${n}`)) : [rel] }
  const fichiers = [...perimetre.filter((f) => existe(path.join(DEPOT, ...f.split('/')))), ...parcourir('scripts/fixtures/026/revue'), ...parcourir('scripts/fixtures/026/chantier')]
  L.push(`- **Budget de fichiers (${budgetFiche ?? 'illisible'}) : dépassé, écart à acter par la session principale** : ${fichiers.length} fichiers hors preuves (compte fait par cette preuve). La fiche en énumère six, plus les fixtures ; s'y ajoutent les deux témoins, les quatre juges proposés d'essai et le second attendu (semaine 2026-39), exigés par la leçon du 26/09 (« vert sur un témoin, rouge sur chaque sabotage ») et par la contre-vérification du 27/09. L'orchestre ne contrôle que le format du budget ; relever le budget de la fiche, ou l'acter dans \`decisions.md\`, revient à la session principale (hors du périmètre de 026-121).`, '')
}
L.push('## Contre-vérification du 27/09 : ce qui a changé', '')
L.push("- **RV-1 (R1, R2)** : un second passage `--semaine=2026-39` sur les mêmes fixtures, égal à `attendu-2026-39.json` (du 21/09 au 27/09 ; antigravity 1 PASS, 1 réussite, 30 min ; qwen 1 FAIL ; codex 1 PASS en-cours, 0 réussite, médiane null). `verdicts.jsonl` porte un PASS en-cours de 099-10 avant son PASS depuis `fait/` (la médiane d'antigravity passe de 75 à 68 si l'on compte l'en-cours) et un PASS en-cours seul de 099-41 en semaine 39. Deux sabotages du témoin : « un PASS en-cours compté comme réussite » et « une sortie figée sur la semaine 38 ».")
L.push("- **RV-4** : l'extraction des nombres réécrite (liste fermée ci-dessus) ; une variante par forme qui passait à tort (`12k €`, `3 k€`, `1e3`, code en ligne, bloc de code, commentaire, `17/20`, date et heure invalides, `marge:9999 €`, `77.`, `100-200 €`, `3 h 45`, `45min`, semaine 77), et deux variantes qui doivent rester vertes (liste qui se suit ; dates, heures et semaines valides).")
L.push("- **CT-1 (C4)** : juge proposé d'essai `juges/pass-code1.mjs` (seulement des lignes `PASS RD-n`, puis code 1) et sa variante (attendu : 1) ; sabotage « un identifiant de critère suffit, sans ligne en échec ».")
L.push("- **CT-1 (C3)** : une variante sur zone protégée pour chaque exécutant non-Claude d'`orchestre.json` (antigravity sur `scripts/*-qa.mjs`, gemini-cli sur `supabase/**`, qwen sur `app/api/agents/**`), attendu 1 ; l'autotest exige une variante par exécutant et vérifie que chaque fiche de zone passe `orchestre valider` (le refus vient du garde, jamais de l'en-tête) ; sabotage « les zones protégées contrôlées pour codex seulement ».")
L.push("- **CT-4 (C5)** : le motif accepte n'importe quels arguments avant `push`, `commit` ou `merge` dans un `'git', [...]` ; sabotage « un git push lancé par spawn, derrière '-C', R » (code mort).")
L.push("- **Écarts restés à acter** : le budget de fichiers (ci-dessus) ; et, sur les trois cas de la correction du 27/09, « une consigne produit un accusé et un compte rendu » et « une tâche hors droits est refusée » côté chef relèvent de 026-127/129 et 026-105 (`chef-qa`) — côté chantier, seules la séparation (CT-7, RV-6) et la fiche d'un exécutant non-Claude sur zone protégée (CT-1) sont exercées. Répartition à faire acter par la session principale.", '')
L.push("## P-1 — l'arbre actuel", '')
for (const [nom, x] of Object.entries(faits.actuel)) {
  if (x.saute) { L.push(`- **${nom}** : ${x.saute}`); continue }
  L.push(`- **${nom}** : code ${x.code}, premier échec **${x.premier}** (${x.duree_s} s)`)
  for (const l of x.lignes) L.push(`  - \`${cellule(l)}\``)
}
L.push('', '## P-2 — les critères de consigne sur l\'arbre actuel', '')
for (const [nom, x] of Object.entries(faits.consignes)) { L.push(`- **${nom}** : code ${x.code}`); for (const l of x.lignes) L.push(`  - \`${cellule(l)}\``) }
L.push('', '## P-3 — les fixtures', '', '| vérification | verdict | détail |', '| --- | --- | --- |')
for (const f of faits.fixtures) L.push(`| ${cellule(f.quoi)} | ${f.ok ? 'PASS' : 'FAIL'} | ${cellule(f.detail)} |`)
for (const [nom, x] of Object.entries(faits.preuves)) {
  const r = x.rapport
  L.push('', `## P-4 — ${nom} --preuve-echecs (code ${x.code}, ${x.duree_s} s)`, '')
  if (!r) { L.push(`Rapport illisible. ${x.fin.map(cellule).join(' ; ')}`); continue }
  if (r.autotest) L.push(`- Autotest des fixtures : ${r.autotest.length ? r.autotest.map(cellule).join(' ; ') : 'PASS'}`)
  if (r.verite) L.push(`- Fixtures de CT-1 : ${r.verite.defauts.length ? r.verite.defauts.map(cellule).join(' ; ') : 'PASS'} (ligne du juge rouge : \`${cellule(r.verite.ligneRouge)}\`)`)
  L.push(`- Arbre de référence (sans le script jugé) : code ${r.reference?.code}, premier échec **${r.reference?.premier}**, rouges : ${(r.reference?.rouges || []).join(', ')}`)
  L.push(`- Témoin : code ${r.temoin?.code}, ${r.temoin?.verts} critère(s) vert(s) : ${(r.temoin?.lignes || []).join(', ')}`, '')
  L.push('| sabotage du témoin | critère visé | attrapé | ligne en échec |', '| --- | --- | --- | --- |')
  for (const s of r.sabotages || []) L.push(`| ${cellule(s.nom)} | ${s.critere} | ${s.attrape ? 'oui' : '**NON**'} | ${cellule(s.extrait)} |`)
}
L.push('')
fs.mkdirSync(PREUVES, { recursive: true })
fs.writeFileSync(path.join(PREUVES, 'echecs-attendus.md'), L.join('\n'))

for (const [nom, x] of Object.entries(faits.actuel)) console.log(x.saute ? `P-1 ${nom} : ${x.saute}` : `P-1 ${nom} sur l'arbre actuel : code ${x.code}, premier échec ${x.premier}`)
for (const [nom, x] of Object.entries(faits.consignes)) console.log(`P-2 ${nom} : ${x.lignes.join(' ; ')}`)
for (const f of faits.fixtures) console.log(`P-3 ${f.ok ? 'PASS' : 'FAIL'} ${f.quoi}`)
for (const [nom, x] of Object.entries(faits.preuves)) console.log(`P-4 ${nom} : ${x.fin.join(' ')}`)
if (ko.length) { for (const k of ko) console.log(`✗ ${k}`); console.log(`✗ 026-121 : ${ko.length} échec(s) — voir .orchestre/preuves/026-121/echecs-attendus.md (${duree} s)`) }
else console.log(`✓ 026-121 : juges rouges aujourd'hui (RV-1, CT-1), consignes vertes, fixtures justes, témoins verts, sabotages attrapés — echecs-attendus.md écrit (${duree} s)`)
process.exit(code)
