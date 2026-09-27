#!/usr/bin/env node
// scripts/juges-026-horloge-bus-preuve.mjs — la preuve des juges du domaine horloge-bus de la série 026, écrite par Claude Code
// (fiche 026-009). GÉNÉRIQUE pour les lots 01 à 04 (point 5 de 026-009) : tout ce qui est propre à un lot est DÉCLARÉ dans
// scripts/fixtures/026-horloge-bus/preuve-NN.json ; ce script n'en porte que le catalogue des contrôles et le plancher.
//
// preuve-NN.json :
//   { lot, fiche, reference: "<sha>", absents_de_la_reference: [préfixes], archive: [chemins extraits de la référence],
//     juges: [{ commande: "node scripts/<juge>.mjs …", echec_attendu: "<id>", reel?: true }],
//     criteres: { "JP-1": [{ type: "<contrôle>", …paramètres }], "JP-2": [...], … } }
//
// Le catalogue (un critère JP-n porte un ou plusieurs contrôles ; chacun sait échouer : son autotest, sur des témoins et des
// sabotages, passe AVANT qu'il juge — un contrôle qui ne sait plus distinguer le vrai du faux rend son critère rouge) :
//   echec-sur-reference  la référence (git archive des chemins `archive`, sous .orchestre/travail/, rien dans .git) ne contient
//                        aucun préfixe de `absents_de_la_reference` ; chaque juge, avec --racine=<référence>, sort en code ≠ 0 et
//                        ≠ 2, sans trace de pile, avec LA ligne « FAIL <echec_attendu> — … » (une seule pour cet id, jamais
//                        la ligne d'un autre critère qui le cite) et le bilan « … : FAIL — ids » qui le nomme.
//   temoin               chaque juge, avec --temoin sur l'état actuel, sort en code 0 avec le bilan « … : PASS ».
//   reel-sans-secret     chaque juge marqué `reel: true`, lancé en --reel réseau coupé (--import) et clés remplacées par des
//                        canaris, sort en code 1 ou 2, sans trace de pile, sans qu'aucune clé-canari paraisse.
//   bloc-essai           { cas: [{ commande, jumeaux: [n…], seulement_dans_exists?: [mots] }] } : `<commande> --generer-essai
//                        --racine=<exemple>` sur des jumeaux d'exemple rend un seul énoncé `do $essai_026$ … $essai_026$;`,
//                        jumeaux passés tels quels à execute dans l'ordre, fini par le raise ESSAI_A_SEC et l'empreinte du
//                        dernier, sans commit, rollback, grant, drop schema ni vault. hors des chaînes (tokenizer de
//                        sql-nu.mjs, ET analyserEssai) ; un mot de `seulement_dans_exists` n'est permis que dans exists (…).
//                        Défauts plantés vus par les deux lectures ; blocEssai refuse un jumeau ou scénario étiqueté.
//   reutilise            { fichier|fichiers, module, noms, appeles?, identite? } : le fichier importe ces noms tels quels de ce
//                        module, ne les redéfinit pas, n'en recopie ni le texte ni le code (valeurs lues dans un processus à
//                        part), appelle ceux de `appeles` ; `identite` : ce qu'il réexporte est LE MÊME objet.
//   compte-rendu         { scenario } : lireCompteRendu de sql-essai.mjs accepte un compte rendu conforme et refuse, chacun
//                        pour sa raison, 0 octet, sans APRES, APRES à false, autre empreinte, clé manquante, clé à false.
//   contrat-fiches       { contrat, migrations } : chaque fonction du contrat est définie, mêmes paramètres, dans la section
//                        « Contrat » de sa fiche, et réciproquement ; tables, colonnes, codes ops: et clés d'essai aussi.
//   faux-postgrest       { module, fonction, renommer: { <param>: <faux nom> } } : la preuve démarre ELLE-MÊME le faux
//                        PostgREST (demarrer({ contrat, reponses }) du module, dans un processus à part) et fait les appels :
//                        conforme au contrat → 2xx ; le paramètre renommé → 400 ; chaque appel consigné ; arreter() ferme.
//   reseau-piege         { permis: [hôtes] } ou { interdits: [hôtes] } : chaque juge (référence et témoin) tourne avec un
//                        piège chargé par NODE_OPTIONS=--import dans lui et ses enfants ; le piège doit s'y être chargé et
//                        n'avoir noté aucune tentative vers un hôte refusé.
//   horloge-simulee      { module, cas: [{ figer, paris }], avancer_ms } : figer(iso) puis l'heure de Paris lue par Intl,
//                        Date.now(), new Date(), performance.now(), et avancer(ms) qui les fait tous gagner ms.
//   motifs               { chemins, absents?: [regex], presents?: [{ motif, min?, max? }] } : sur des fichiers qui existent et
//                        ne sont pas vides.
//   immobile             rien n'a bougé hors .orchestre/travail/ et .orchestre/preuves/ pendant la preuve (git status
//                        --porcelain et empreintes, avant/après ; tenue de l'orchestre et périmètres des AUTRES fiches de
//                        en-cours/ écartés). Jugé en dernier, quel que soit son rang.
//
// Le plancher (LOTS, plus bas) : le cahier de chaque fiche de lot, que preuve-NN.json — écrit par l'exécutant du lot — ne peut
// pas affaiblir : fiche, critères attendus en échec, référence de preuve-01.json pour les lots 02 à 04, contrôles exigés par
// critère et leurs paramètres minimaux (lot 03 : faux-postgrest sur ops_tache_creer, p_agent renommé agent ; réseau limité à
// 127.0.0.1). Un manque rend le critère rouge. Changer un cahier, c'est changer ce plancher (Claude Code seulement).
//
// Écrit .orchestre/preuves/<fiche du lot>/echecs-attendus.md (une ligne par juge : critère attendu en échec sur la référence,
// extrait réel, verdict du témoin ; puis les contrôles) et les sorties complètes dans .orchestre/preuves/<fiche>/sorties/.
// Usage :
//   node scripts/juges-026-horloge-bus-preuve.mjs --lot=01|02|03|04
//   node scripts/juges-026-horloge-bus-preuve.mjs --autotest
//        chaque contrôle du catalogue sur ses témoins (scripts/fixtures/026-horloge-bus/temoins/) et ses sabotages, le
//        plancher sur des preuve-NN.json synthétiques (dont un lot 03 conforme), le piège réseau sur deux juges synthétiques ;
//        écrit .orchestre/preuves/026-009/controles-autotest.md.
// Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel ou preuve-NN.json est invalide. Aucun appel réseau.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'
import {
  R, JUMEAU_EXEMPLE, blocEssai, analyserEssai, lireCompteRendu, empreinte, jumeauNuCoupe, clesScenario, creerRapport, lf, court,
} from './lib/sql-essai.mjs'

const NOM = 'juges-026-horloge-bus-preuve'
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-horloge-bus')
const BANCS = path.join(FIXTURES, 'bancs')
const TEMOINS = path.join(FIXTURES, 'temoins')
const CONTRAT_OPS = path.join(FIXTURES, 'contrat-ops.json')
const TRAVAIL = path.join(R, '.orchestre', 'travail', 'juges-026-horloge-bus')
const TRACE = /^\s+at\s.+:\d+:\d+\)?\s*$/m
const DELAI_MS = 5 * 60_000
const ETAT_ORCHESTRE = ['.orchestre/digest.md', '.orchestre/verdicts.jsonl', '.orchestre/agents.jsonl', '.orchestre/contexte.md']
const FILES_ORCHESTRE = ['file', 'en-cours', 'fait', 'refuse']
const LIEUX_FICHES = ['file', 'en-cours', 'fait']
const RE_COMMANDE = /^node scripts\/[\w./-]+\.mjs(?: --[a-z][\w-]*(?:=\S+)?)*$/
const RE_ID_JUGE = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/
const RE_CHEMIN = /^(?![/\\])(?![A-Za-z]:)(?!.*(?:^|\/)\.\.(?:\/|$))[\w.@/-]+$/
const RE_HOTE = /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$|^::1$/i
const versSlash = (p) => String(p).split(path.sep).join('/')
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sous = (parent, enfant) => { const r = path.relative(path.resolve(parent), path.resolve(enfant)); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const cellule = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
const numero = (id) => Number(/^JP-(\d+)$/.exec(id)?.[1] ?? 1e9)
const trierIds = (ids) => [...new Set(ids)].sort((a, b) => numero(a) - numero(b) || a.localeCompare(b))

// ── Le plancher : le cahier de chaque fiche de lot ───────────────────────────────────────────────────────────────────────
const aCas = (c, figer, paris) => (c.cas || []).some((k) => k.figer === figer && k.paris === paris)
const LOTS = {
  '01': {
    fiche: '026-009', echecs: ['OS-1', 'OI-1', 'OT-1'],
    criteres: { 'JP-1': ['echec-sur-reference'], 'JP-2': ['temoin', 'reel-sans-secret'], 'JP-3': ['bloc-essai', 'reutilise'], 'JP-4': ['compte-rendu'], 'JP-5': ['contrat-fiches'], 'JP-6': ['immobile'] },
    exige: [
      ['JP-3', 'bloc-essai', (c) => ['0096', '0097', '0098'].every((n) => c.cas.some((k) => k.jumeaux.at(-1) === n)), 'un cas --generer-essai jugé pour 0096, 0097 et 0098'],
      ['JP-3', 'reutilise', (c) => fichiersReutilise(c).includes('scripts/lib/sql-essai.mjs') && c.module === '../sql-nu.mjs' && ['sansCommentaires', 'MARQUE_CONTROLE'].every((n) => c.noms.includes(n)), 'sql-essai.mjs réutilise sansCommentaires et MARQUE_CONTROLE de ../sql-nu.mjs'],
      ['JP-5', 'contrat-fiches', (c) => ['0096', '0097', '0098'].every((n) => c.migrations.includes(n)), 'les clés d\'essai de 0096, 0097 et 0098'],
    ],
  },
  '02': {
    fiche: '026-032', echecs: ['PG-1', 'FA-1', 'HS-1'],
    criteres: { 'JP-1': ['echec-sur-reference', 'motifs'], 'JP-2': ['temoin'], 'JP-3': ['bloc-essai'], 'JP-4': ['compte-rendu', 'reutilise'], 'JP-5': ['immobile'] },
    exige: [
      ['JP-1', 'motifs', (c) => c.chemins.includes('scripts/fixtures/026-horloge-bus/essais/0099.sql') && (c.absents || []).some((a) => /boite_/.test(a)) && (c.absents || []).some((a) => /email/.test(a)), 'essais/0099.sql sans boite_ ni le canal email'],
      ['JP-3', 'bloc-essai', (c) => ['0099', '0100', '0101'].every((n) => c.cas.some((k) => k.jumeaux.at(-1) === n)) && c.cas.some((k) => k.jumeaux.at(-1) === '0101' && (k.seulement_dans_exists || []).includes('decrypted_secret')), 'un cas pour 0099, 0100 et 0101, et decrypted_secret seulement dans exists (…) pour 0101'],
      ['JP-4', 'reutilise', (c) => fichiersReutilise(c).length >= 3 && c.module === './lib/sql-essai.mjs' && c.noms.includes('lireCompteRendu'), 'chacun des trois juges importe lireCompteRendu de ./lib/sql-essai.mjs'],
    ],
  },
  '03': {
    fiche: '026-038', echecs: ['AG-1', 'AR-1', 'PA-1'],
    criteres: { 'JP-1': ['echec-sur-reference'], 'JP-2': ['temoin'], 'JP-3': ['faux-postgrest'], 'JP-4': ['reseau-piege'], 'JP-5': ['immobile'] },
    exige: [
      ['JP-3', 'faux-postgrest', (c) => c.fonction === 'ops_tache_creer' && c.renommer.p_agent === 'agent', 'ops_tache_creer refusée quand elle envoie agent au lieu de p_agent'],
      ['JP-4', 'reseau-piege', (c) => Array.isArray(c.permis) && c.permis.length > 0 && c.permis.every((h) => ['127.0.0.1', 'localhost', '::1'].includes(h)), 'aucun hôte permis hors de 127.0.0.1 (localhost, ::1)'],
    ],
  },
  '04': {
    fiche: '026-045', echecs: ['AF-1', 'VA-1', 'TC-1', 'E24-0'],
    criteres: { 'JP-1': ['echec-sur-reference'], 'JP-2': ['temoin'], 'JP-3': ['horloge-simulee'], 'JP-4': ['reseau-piege'], 'JP-5': ['immobile'], 'JP-6': ['motifs'] },
    exige: [
      ['JP-3', 'horloge-simulee', (c) => aCas(c, '2026-10-24T05:30:00Z', '07:30') && aCas(c, '2026-10-25T06:30:00Z', '07:30') && c.avancer_ms === 300000, '24/10/2026 05:30 UTC et 25/10/2026 06:30 UTC lus 07:30 à Paris ; avancer(300000)'],
      ['JP-4', 'reseau-piege', (c) => (c.interdits || []).includes('api.resend.com') || (Array.isArray(c.permis) && !c.permis.includes('api.resend.com')), 'api.resend.com piégé'],
      ['JP-6', 'motifs', (c) => c.chemins.some((p) => p.startsWith('scripts/fixtures/026-horloge-bus/veilleur')) && ['boite', 'sequenceur', 'liste_noire', 'arret_email'].every((m) => (c.absents || []).includes(m)), 'veilleur/ sans boite, sequenceur, liste_noire ni arret_email'],
    ],
  },
}

// ── Lancer un processus ──────────────────────────────────────────────────────────────────────────────────────────────────
function lancer(argv, delaiMs = DELAI_MS, env = {}) {
  return new Promise((resoudre) => {
    const t0 = Date.now()
    const enfant = spawn(process.execPath, argv, { cwd: R, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...env } })
    let sortie = '', stdout = '', stderr = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d; stdout += d })
    enfant.stderr.on('data', (d) => { sortie += d; stderr += d })
    const minuterie = setTimeout(() => { expire = true; try { spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) } catch { /* pas de taskkill */ } try { enfant.kill('SIGKILL') } catch { /* déjà mort */ } }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : code, sortie, stdout, stderr, expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, stdout, stderr, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}
/** Un banc de scripts/fixtures/026-horloge-bus/bancs/ : processus à part, dernière ligne « RESULTAT <jeton> {json} ». */
async function banc(fichier, env, delaiMs = 30_000) {
  const jeton = crypto.randomBytes(9).toString('hex')
  const x = await lancer([path.join(BANCS, fichier)], delaiMs, { ...env, BANC_NONCE: jeton })
  const derniere = x.stdout.split(/\r?\n/).filter(Boolean).at(-1) || ''
  const pre = `RESULTAT ${jeton} `
  if (x.expire) return { erreur: `banc ${fichier} : délai dépassé` }
  if (x.code !== 0 || !derniere.startsWith(pre)) return { erreur: `banc ${fichier} : code ${x.code}, aucun résultat (« ${court(x.sortie.split(/\r?\n/).filter(Boolean).at(-1), 100)} »)` }
  try { return { r: JSON.parse(derniere.slice(pre.length)) } } catch { return { erreur: `banc ${fichier} : résultat illisible` } }
}
const argvDe = (commande) => commande.trim().split(/\s+/).slice(1)
const nomDe = (commande) => { const a = argvDe(commande); return `${path.basename(a[0], '.mjs')}${a.slice(1).map((x) => `_${x.replace(/^--/, '').replace(/[^a-z0-9]+/gi, '-')}`).join('')}` }

// ── Lire la sortie d'un juge ─────────────────────────────────────────────────────────────────────────────────────────────
// La ligne DU critère, telle que creerRapport l'écrit : « PASS|FAIL|SAUTE <id> — … », en début de ligne. Jamais une ligne
// d'un autre critère qui le cite : « FAIL OS-2 — non jugé : la migration manque (OS-1) » ne dit rien d'OS-1 (défaut relevé
// par la contre-vérification du 26/09 : une recherche du jeton n'importe où laissait passer OS-1 déclaré PASS à tort).
const RE_LIGNE_CRITERE = /^(PASS|FAIL|SAUTE) (\S+)(?: — (.*))?$/
const RE_BILAN = /^(\S+) : (PASS|FAIL)(?: — (.*))?$/
const bilanDe = (sortie) => {
  const m = String(sortie).split(/\r?\n/).map((l) => RE_BILAN.exec(l)).filter(Boolean).at(-1)
  return m ? { verdict: m[2], rouges: m[3] ? m[3].split(/,\s*/).map((x) => x.trim()) : [] } : null
}
/** { ligne, defauts[] } : la ligne de rapport de `critere` en échec, et le bilan qui le nomme ; `defauts` vide si tout y est. */
function lireEchec(stdout, critere) {
  const lignes = String(stdout).split(/\r?\n/).map((l) => ({ l, m: RE_LIGNE_CRITERE.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const defauts = []
  let ligne = null
  if (!lignes.length) defauts.push(`aucune ligne « FAIL ${critere} — … » (la ligne de rapport du critère, forme de creerRapport, sur la sortie standard)`)
  else if (lignes.length > 1) defauts.push(`${critere} rapporté ${lignes.length} fois (${lignes.map((x) => x.m[1]).join(', ')}) : une ligne par critère attendue`)
  else if (lignes[0].m[1] !== 'FAIL') defauts.push(`${critere} rapporté ${lignes[0].m[1]} : « ${court(lignes[0].l, 90)} »`)
  else ligne = lignes[0].l
  const b = bilanDe(stdout)
  if (!b) defauts.push('aucun bilan « … : PASS|FAIL »')
  else if (b.verdict !== 'FAIL') defauts.push(`bilan ${b.verdict}`)
  else if (!b.rouges.includes(critere)) defauts.push(`le bilan « … : FAIL — ${court(b.rouges.join(', '), 60)} » ne nomme pas ${critere}`)
  return { ligne, defauts }
}
const S_ = (...l) => `${l.join('\n')}\n`
// Le premier cas est le sabotage de la contre-vérification du 26/09, mot pour mot.
const AUTOTEST_LECTURE = [
  ['critère PASS à tort, cité entre parenthèses par d\'autres critères en échec', 'OS-1', false, S_('ops-sql-qa 0096 (026-010) — racine x', 'PASS OS-1 — sabotage : migration déclarée présente à tort', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'FAIL OS-3 — non jugé : la migration manque (OS-1)', 'FAIL OS-9 — non-régression', 'SAUTE OS-10 — --reel seulement', 'ops-sql-qa : FAIL — OS-2, OS-3, OS-9')],
  ['critère voisin OS-10 en échec, OS-1 vert', 'OS-1', false, S_('PASS OS-1 — conforme', 'FAIL OS-10 — --reel', 'ops-sql-qa : FAIL — OS-10')],
  ['note indentée en échec, critère sauté', 'OS-1', false, S_('  · FAIL OS-1 — une note n\'est pas un rapport', 'SAUTE OS-1 — sauté', 'FAIL OS-2 — x', 'ops-sql-qa : FAIL — OS-2')],
  ['critère rapporté deux fois, PASS et FAIL', 'OS-1', false, S_('PASS OS-1 — conforme', 'FAIL OS-1 — migration absente', 'ops-sql-qa : FAIL — OS-1')],
  ['bilan qui ne nomme pas le critère', 'OS-1', false, S_('FAIL OS-1 — migration absente', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'ops-sql-qa : FAIL — OS-2')],
  ['bilan vert', 'OS-1', false, S_('FAIL OS-1 — migration absente', 'ops-sql-qa : PASS')],
  ['conforme', 'OS-1', true, S_('ops-sql-qa 0096 (026-010) — racine x', 'FAIL OS-1 — migration absente : supabase/migrations/0096_ops_socle.sql', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'SAUTE OS-10 — --reel seulement', 'ops-sql-qa : FAIL — OS-1, OS-2')],
]
/** La sortie réelle d'un juge, où la ligne du critère est réécrite en PASS et le critère ôté du bilan : le sabotage du 26/09. */
function saboterSortie(stdout, critere) {
  return String(stdout).split(/\r?\n/).map((l) => {
    const m = RE_LIGNE_CRITERE.exec(l)
    if (m && m[2] === critere) return `PASS ${critere} — sabotage de la preuve : déclaré vert à tort`
    const b = RE_BILAN.exec(l)
    if (b && b[2] === 'FAIL' && b[3]) { const r = b[3].split(/,\s*/).filter((x) => x.trim() !== critere); return r.length ? `${b[1]} : FAIL — ${r.join(', ')}` : `${b[1]} : PASS` }
    return l
  }).join('\n')
}
const citeAilleurs = (stdout, critere) => {
  const re = new RegExp(`(?<![A-Za-z0-9])${echapperRe(critere)}(?![A-Za-z0-9])`)
  return String(stdout).split(/\r?\n/).filter((l) => { const m = RE_LIGNE_CRITERE.exec(l); return m && m[1] === 'FAIL' && m[2] !== critere && re.test(l) }).length
}
/** Les défauts d'un passage en --temoin : code 0 et bilan « : PASS » exigés. */
function lireTemoin(x) {
  const d = []
  if (x.expire) d.push('délai dépassé')
  if (x.code !== 0) d.push(`code ${x.code}`)
  const b = bilanDe(x.stdout)
  if (!b) d.push('aucun bilan « … : PASS »')
  else if (b.verdict !== 'PASS') d.push(`bilan ${b.verdict}${b.rouges.length ? ` — ${court(b.rouges.join(', '), 60)}` : ''}`)
  return d
}
// --reel sans réseau ni secret : fetch coupé par un module chargé avant le juge, clés remplacées par des canaris.
const COUPE_RESEAU = `--import=data:text/javascript,${encodeURIComponent('globalThis.fetch = async () => { throw new TypeError("réseau coupé par la preuve 026-009") }')}`
const fuitesDe = (sortie, canaris) => ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => String(sortie).includes(canaris[k]))

// ── L'état du dépôt (immobile) ───────────────────────────────────────────────────────────────────────────────────────────
function git(args) {
  for (let essai = 0; essai < 4; essai++) {
    const r = spawnSync('git', args, { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
    if (r.status === 0) return r.stdout
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400)
  }
  return null
}
function perimetresAutres(fiche) {
  const d = path.join(R, '.orchestre', 'en-cours')
  const out = []
  for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) {
    if (!/^\d{3}-[\w-]+\.md$/.test(f) || /\.(question|reponse)\.md$/.test(f) || f === `${fiche}.md`) continue
    const m = /^perimetre:\s*\[(.*)\]\s*$/m.exec(fs.readFileSync(path.join(d, f), 'utf8'))
    if (m) for (const g of m[1].split(',')) { const p = g.trim().replace(/^["'`]|["'`]$/g, '').split(/[*?{]/)[0]; if (p) out.push(p) }
  }
  return out
}
function exclu(rel, autres) {
  if (rel.startsWith('.orchestre/travail/') || rel.startsWith('.orchestre/preuves/')) return true
  if (ETAT_ORCHESTRE.includes(rel) || FILES_ORCHESTRE.some((d) => rel.startsWith(`.orchestre/${d}/`))) return true
  return autres.some((p) => rel.startsWith(p))
}
function etat(fiche) {
  const autres = perimetresAutres(fiche)
  const st = git(['status', '--porcelain', '--untracked-files=all'])
  if (st === null) return { erreur: 'git status illisible' }
  const lignes = st.split(/\r?\n/).filter(Boolean).filter((l) => !l.slice(3).split(' -> ').map((c) => c.trim().replace(/^"|"$/g, '')).every((c) => exclu(c, autres))).sort()
  const empreintes = new Map()
  for (const l of lignes) for (const c of l.slice(3).split(' -> ').map((x) => x.trim().replace(/^"|"$/g, ''))) {
    if (exclu(c, autres)) continue
    let h = 'absent'
    try { const s = fs.statSync(path.join(R, c)); h = s.isFile() ? crypto.createHash('sha1').update(fs.readFileSync(path.join(R, c))).digest('hex') : 'dossier' } catch { /* supprimé */ }
    empreintes.set(c, h)
  }
  return { lignes, empreintes }
}
function differences(a, b) {
  if (a.erreur || b.erreur) return [a.erreur || b.erreur]
  const d = []
  const A = new Set(a.lignes), B = new Set(b.lignes)
  for (const l of B) if (!A.has(l)) d.push(`git status +« ${l} »`)
  for (const l of A) if (!B.has(l)) d.push(`git status −« ${l} »`)
  for (const [k, v] of a.empreintes) if (b.empreintes.has(k) && b.empreintes.get(k) !== v) d.push(`${k} modifié`)
  return d
}

// ── La référence : git archive, puis un lecteur de tar (aucun outil externe, aucun chemin hors du dossier) ───────────
function vider(dossier) {
  if (!sous(TRAVAIL, dossier)) throw new Error(`suppression refusée hors de ${versSlash(TRAVAIL)} : ${versSlash(dossier)}`)
  fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  fs.mkdirSync(dossier, { recursive: true })
}
function detar(buf, dest) {
  let off = 0, paxChemin = null, n = 0
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512)
    if (h.every((b) => b === 0)) break
    const champ = (a, l) => h.subarray(a, a + l).toString('utf8').replace(/\0[\s\S]*$/, '')
    let nom = champ(0, 100)
    const taille = parseInt(champ(124, 12).trim() || '0', 8)
    const type = String.fromCharCode(h[156] || 48)
    const prefixe = champ(345, 155)
    if (prefixe) nom = `${prefixe}/${nom}`
    const donnees = buf.subarray(off + 512, off + 512 + taille)
    off += 512 + Math.ceil(taille / 512) * 512
    if (type === 'g') continue
    if (type === 'x') { const m = /\d+ path=([^\n]*)\n/.exec(donnees.toString('utf8')); paxChemin = m ? m[1] : null; continue }
    if (paxChemin) { nom = paxChemin; paxChemin = null }
    const cible = path.join(dest, nom)
    if (!sous(dest, cible)) throw new Error(`chemin hors de la référence dans l'archive : ${nom}`)
    if (type === '5') fs.mkdirSync(cible, { recursive: true })
    else if (type === '0') { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.writeFileSync(cible, donnees); n++ }
  }
  return n
}
function extraireReference(sha, chemins) {
  const dest = path.join(TRAVAIL, 'reference')
  vider(dest)
  const presents = chemins.filter((c) => (git(['ls-tree', '--name-only', sha, '--', c.replace(/\/$/, '')]) || '').trim())
  const absents = chemins.filter((c) => !presents.includes(c))
  if (!presents.length) return { dest, fichiers: 0, presents, absents }
  const a = spawnSync('git', ['archive', '--format=tar', sha, '--', ...presents.map((c) => c.replace(/\/$/, ''))], { cwd: R, maxBuffer: 1 << 30, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  if (a.status !== 0) throw new Error(`git archive ${sha.slice(0, 12)} : ${court(a.stderr?.toString(), 160)}`)
  return { dest, fichiers: detar(a.stdout, dest), presents, absents }
}

// ── Lecture indépendante d'un bloc d'essai (bloc-essai) ──────────────────────────────────────────────────────────────────
const MOTS = [['commit', /\bcommit\b/g], ['rollback', /\brollback\b/g], ['grant', /\bgrant\b/g], ['drop schema', /\bdrop\s+schema\b/g], ['vault.', /\bvault\s*\./g]]
/** Pour chaque position du code (chaînes vidées), vrai si elle est dans une parenthèse ouverte par « exists ». */
function dansExists(code) {
  const out = new Array(code.length).fill(false)
  const pile = []
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '(') pile.push(/\bexists\s*$/.test(code.slice(Math.max(0, i - 24), i)))
    out[i] = pile.includes(true)
    if (code[i] === ')') pile.pop()
  }
  return out
}
function lireBloc(bloc, nus, e, seulementDansExists = []) {
  const raisons = []
  const t = lf(bloc)
  const T = '$essai_026$', TM = '$migration_026$'
  if (!t.startsWith(`do ${T}\n`)) raisons.push(`ne commence pas par « do ${T} »`)
  if (!/\nend \$essai_026\$;\n?$/.test(t)) raisons.push(`ne finit pas par « end ${T}; »`)
  const i1 = t.indexOf(T), i2 = t.lastIndexOf(T)
  if (t.split(T).length - 1 !== 2) { raisons.push(`${t.split(T).length - 1} étiquette(s) ${T}, deux attendues`); return raisons }
  const dehors = `${t.slice(0, i1)}${t.slice(i2 + T.length)}`.replace(/\s+/g, ' ').trim()
  if (dehors !== 'do ;') raisons.push(`hors du corps, « ${court(dehors, 60)} » au lieu de « do … ; » : plus d'un énoncé`)
  let corps = t.slice(i1 + T.length, i2)
  let pos = 0
  nus.forEach((nu, k) => {
    const motif = `execute ${TM}${lf(nu)}${TM};`
    const i = corps.indexOf(motif, pos)
    if (i < 0) { raisons.push(`jumeau ${k + 1} non passé tel quel à execute, dans l'ordre`); return }
    corps = `${corps.slice(0, i)}execute ${TM}${TM};${corps.slice(i + motif.length)}`
    pos = i
  })
  if (corps.split(TM).length - 1 !== 2 * nus.length) raisons.push(`étiquettes ${TM} en trop ou en moins`)
  const lu = sansCommentaires(corps.split(TM).join(' ')) // le tokenizer de sql-nu.mjs : commentaires ôtés, chaînes respectées
  if ((lu.match(/'/g) || []).length % 2) raisons.push('une chaîne n\'est pas refermée (apostrophes impaires, tokenizer de sql-nu.mjs)')
  const code = lu.replace(/'(?:[^']|'')*'/g, (m) => ' '.repeat(m.length)).toLowerCase()
  let par = 0
  for (const c of code) { if (c === '(') par++; else if (c === ')') par-- }
  if (par) raisons.push('parenthèses déséquilibrées')
  const exists = dansExists(code)
  const mots = [...MOTS, ...seulementDansExists.filter((m) => !MOTS.some(([n]) => n === m)).map((m) => [m, new RegExp(echapperRe(m.toLowerCase()), 'g')])]
  for (const [mot, re] of mots) {
    const permisDansExists = seulementDansExists.includes(mot)
    for (const m of code.matchAll(re)) {
      if (permisDansExists && exists[m.index]) continue
      raisons.push(`« ${mot} » hors des chaînes${permisDansExists ? ' et hors d\'un exists (…)' : ''}`)
      break
    }
  }
  if (!new RegExp(`raise exception 'ESSAI_A_SEC % %', '${e}', r::text;\\s*end\\s*$`).test(corps)) raisons.push(`ne se termine pas par « raise exception 'ESSAI_A_SEC % %', '<empreinte du jumeau jugé>', r::text; »`)
  return raisons
}
const avantRaise = (b, ajout) => b.replace(/\n {2}raise exception 'ESSAI_A_SEC/, `\n${ajout}\n  raise exception 'ESSAI_A_SEC`)
/** Les défauts plantés dans un bloc valide : chacun doit être vu par analyserEssai ET par lireBloc ; rend les ratés. */
function eprouverBloc(bloc, nus, e) {
  const rates = [], vus = []
  const plantes = [
    ['commit hors chaîne', avantRaise(bloc, '  commit;')],
    ['rollback hors chaîne', avantRaise(bloc, '  rollback;')],
    ['grant hors chaîne', avantRaise(bloc, '  grant select on ops.taches to anon;')],
    ['drop schema hors chaîne', avantRaise(bloc, '  drop schema ops cascade;')],
    ['vault. hors chaîne', avantRaise(bloc, '  perform vault.create_secret(\'x\');')],
    ['second énoncé', `${bloc}select 1;\n`],
    ['raise ôté', bloc.replace(/\n {2}raise exception 'ESSAI_A_SEC[^\n]*/, '')],
  ]
  for (const [quoi, b] of plantes) {
    const a = analyserEssai(b, { nus }), ind = lireBloc(b, nus, e)
    if (a.ok || !ind.length) rates.push(`défaut planté non vu (${quoi}) : analyserEssai ${a.ok ? 'l\'accepte' : 'le refuse'}, la preuve ${ind.length ? 'le refuse' : 'l\'accepte'}`)
    else vus.push(quoi)
  }
  const enChaine = avantRaise(bloc, "  perform 'commit ; rollback ; grant ; drop schema ; vault.x';")
  const a = analyserEssai(enChaine, { nus }), ind = lireBloc(enChaine, nus, e)
  if (!a.ok || ind.length) rates.push(`les mots interdits DANS une chaîne sont refusés à tort : ${[...a.raisons, ...ind].slice(0, 2).join(' ; ')}`)
  return { rates, vus }
}

// ── Réutilisation sans recopie (reutilise) ───────────────────────────────────────────────────────────────────────────────
function lireReutilise(src, { module, noms, appeles = [], valeurs = {} }) {
  const d = []
  const imp = [...src.matchAll(new RegExp(`^import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${echapperRe(module)}['"]`, 'gm'))].flatMap((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean))
  for (const n of noms) if (!imp.includes(n)) d.push(`${n} n'est pas importé tel quel de '${module}'`)
  const alt = noms.map(echapperRe).join('|')
  const redef = new RegExp(`\\b(?:function\\s*\\*?\\s*(?:${alt})\\b|(?:const|let|var|class)\\s+(?:${alt})\\b)|(?<![.\\w$])(?:${alt})\\s*=(?![=>])`).exec(src)
  if (redef) d.push(`redéfini : « ${court(redef[0], 50)} »`)
  const plat = (t) => String(t).replace(/\s+/g, ' ').trim()
  const srcPlat = plat(src)
  for (const [n, v] of Object.entries(valeurs)) {
    if (v.type === 'string' && v.texte && v.texte.length >= 12 && src.includes(v.texte)) d.push(`le texte de ${n} est recopié`)
    if (v.type === 'function' && v.texte) {
      const i = v.texte.indexOf('{')
      const corps = plat(i >= 0 ? v.texte.slice(i) : v.texte)
      if (corps.length >= 40 && srcPlat.includes(corps)) d.push(`le code de ${n} est recopié`)
    }
  }
  for (const n of appeles) if (!new RegExp(`\\b${echapperRe(n)}\\s*\\(`).test(src.replace(/^import[^\n]*$/gm, ''))) d.push(`${n} importé mais jamais appelé`)
  return d
}

// ── Les comptes rendus d'essai (compte-rendu) ────────────────────────────────────────────────────────────────────────────
/** Rend { defauts, bilan } : `lire` (lireCompteRendu) doit accepter le conforme et refuser chaque cas fabriqué pour sa raison. */
function jugerComptesRendus(lire, cles, dossier) {
  const e = empreinte(JUMEAU_EXEMPLE)
  const enveloppe = (emp, r, apres = 'APRES rien_ne_reste=true') => `${JSON.stringify({ error: { name: 'Error', message: `Failed to run sql query: ERROR:  P0001: ESSAI_A_SEC ${emp} ${JSON.stringify(r)}\nCONTEXT:  PL/pgSQL function inline_code_block line 900 at RAISE\n` } })}\n${apres ? `\n${apres}\n` : ''}`
  const tout = Object.fromEntries(cles.map((k) => [k, true]))
  const manquante = { ...tout }; delete manquante[cles[Math.min(3, cles.length - 1)]]
  const fausse = { ...tout, [cles[Math.min(5, cles.length - 1)]]: false }
  const cas = [
    ['bon', enveloppe(e, { ...tout, diag_exemple: 'texte libre' }), null],
    ['vide', '', /0 octet/],
    ['sans-apres', enveloppe(e, tout, ''), /APRES rien_ne_reste=true » absente/],
    ['apres-false', enveloppe(e, tout, 'APRES rien_ne_reste=false'), /laissé une trace/],
    ['autre-empreinte', enveloppe(empreinte(`${JUMEAU_EXEMPLE}-- autre texte\n`), tout), /empreinte .* ≠ celle du jumeau courant/],
    ['cle-manquante', enveloppe(e, manquante), new RegExp(`absente\\(s\\) : .*${echapperRe(cles[Math.min(3, cles.length - 1)])}`)],
    ['cle-fausse', enveloppe(e, fausse), new RegExp(`ne valent pas true : ${echapperRe(cles[Math.min(5, cles.length - 1)])}=false`)],
  ]
  const defauts = [], bilan = []
  for (const [nom, contenu, attendu] of cas) {
    const f = path.join(dossier, `${nom}.txt`)
    fs.writeFileSync(f, contenu)
    let r
    try { r = lire(f, { empreinte: e, cles }) } catch (err) { defauts.push(`${nom} : exception ${court(err.message, 60)}`); continue }
    if (attendu === null) { if (!r.ok) defauts.push(`compte rendu conforme refusé : ${r.raisons.join(' ; ')}`); else bilan.push(`${nom} accepté`) }
    else if (r.ok) defauts.push(`${nom} accepté : lireCompteRendu ne sait pas le refuser`)
    else if (!r.raisons.some((x) => attendu.test(x))) defauts.push(`${nom} refusé pour une autre raison : ${r.raisons.join(' ; ')}`)
    else bilan.push(`${nom} refusé (« ${court(r.raisons.find((x) => attendu.test(x)), 60)} »)`)
  }
  return { defauts, bilan }
}

// ── Le contrat contre les fiches (contrat-fiches) ────────────────────────────────────────────────────────────────────────
function lireFiche(id) {
  for (const d of LIEUX_FICHES) { const f = path.join(R, '.orchestre', d, `${id}.md`); if (fs.existsSync(f)) return { f, t: lf(fs.readFileSync(f, 'utf8')) } }
  const f = path.join(R, '.orchestre', 'brouillons-ecosysteme', '026', `${id}.md`)
  return fs.existsSync(f) ? { f, t: lf(fs.readFileSync(f, 'utf8')) } : null
}
function sectionContrat(t) {
  const L = t.split('\n'), i = L.findIndex((l) => /^## Contrat/.test(l))
  if (i < 0) return null
  let j = i + 1
  while (j < L.length && !/^## /.test(L[j])) j++
  return L.slice(i + 1, j).join('\n')
}
const typeCourt = (t) => ({ int: 'integer', int4: 'integer', bool: 'boolean' })[t.trim().toLowerCase()] || t.trim().toLowerCase()
function definitions(section) {
  const out = new Map()
  const re = /(?:^\| |\*\*(?:\d+\. )?)`(public\.|ops\.)?([a-z0-9_]+)\(([^`]*)\)`/gm
  for (const m of section.matchAll(re)) {
    const cle = m[1] === 'ops.' ? `ops.${m[2]}` : m[2]
    if (!cle.startsWith('ops_') && !cle.startsWith('ops.')) continue
    out.set(cle, m[3].trim() ? m[3].split(',').map((p) => { const [n, ...t] = p.trim().split(/\s+/); return [n, typeCourt(t.join(' '))] }) : [])
  }
  return out
}
/** Les sections Contrat des fiches nommées par le contrat : { sections, defauts }. */
function lireSections(contrat) {
  const fiches = [...new Set([...Object.values(contrat.fonctions).map((f) => f.fiche), ...Object.values(contrat.tables).map((t) => t.fiche)])].sort()
  const sections = new Map(), defauts = []
  for (const id of fiches) {
    const x = lireFiche(id)
    if (!x) { defauts.push(`fiche ${id} introuvable dans .orchestre/{file,en-cours,fait}/ ni dans brouillons-ecosysteme/026/`); continue }
    const sec = sectionContrat(x.t)
    if (!sec) { defauts.push(`${id} : pas de section « ## Contrat »`); continue }
    sections.set(id, { sec, defs: definitions(sec), ou: versSlash(path.relative(R, x.f)) })
  }
  return { sections, defauts }
}
/** Rend { defauts, nF } : le contrat contre les sections Contrat, et les clés d'essai contre les scénarios. */
function comparerContrat(contrat, sections, migrations, clesDe) {
  const d = []
  let nF = 0
  for (const [nom, f] of Object.entries(contrat.fonctions)) {
    const S = sections.get(f.fiche)
    if (!S) continue
    nF++
    const def = S.defs.get(nom)
    if (!def) { d.push(`${nom} (contrat, fiche ${f.fiche}) n'est pas définie dans la section Contrat de ${S.ou}`); continue }
    const att = f.params.map(([n, t]) => [n, typeCourt(t)])
    if (JSON.stringify(def) !== JSON.stringify(att)) d.push(`${nom} : paramètres au contrat (${att.map((p) => p.join(' ')).join(', ')}) ≠ fiche ${f.fiche} (${def.map((p) => p.join(' ')).join(', ')})`)
  }
  for (const [id, S] of sections) for (const nom of S.defs.keys()) {
    if (!contrat.fonctions[nom]) d.push(`${nom}, définie dans la section Contrat de ${id}, manque au contrat`)
    else if (contrat.fonctions[nom].fiche !== id) d.push(`${nom} : fiche ${contrat.fonctions[nom].fiche} au contrat, définie dans ${id}`)
  }
  for (const [t, spec] of Object.entries(contrat.tables)) {
    const S = sections.get(spec.fiche)
    if (S && !S.sec.includes(`ops.${t}`)) d.push(`table ops.${t} : la section Contrat de ${spec.fiche} ne la nomme pas`)
    if (S) for (const c of spec.colonnes) if (!S.sec.includes(c.texte)) d.push(`ops.${t}.${c.nom} : le texte recopié ne se retrouve pas mot pour mot dans ${spec.fiche}`)
  }
  for (const [code, ids] of Object.entries(contrat.erreurs)) if (!ids.some((id) => sections.get(id)?.sec.includes(code))) d.push(`${code} : écrit dans aucune des fiches ${ids.join(', ')}`)
  for (const n of migrations) {
    const m = contrat.migrations?.[n]
    if (!m) { d.push(`${n} : migration absente du contrat`); continue }
    const sc = clesDe(m.scenario)
    const att = m.cles_essai?.cles || []
    if (!att.length) d.push(`${n} : aucune clé d'essai au contrat`)
    if ([...sc].sort().join(',') !== [...att].sort().join(',')) d.push(`${n} : les clés du scénario (${sc.length}) et celles du contrat (${att.length}) diffèrent`)
  }
  return { defauts: d, nF }
}

// ── Les motifs (motifs) ──────────────────────────────────────────────────────────────────────────────────────────────────
function lireMotifs(fichiers, { absents = [], presents = [] }) {
  const d = []
  if (!fichiers.length) d.push('aucun fichier à lire : une absence ne se prouve pas sur rien')
  for (const f of fichiers) if (!f.texte.length) d.push(`${f.chemin} : 0 octet`)
  for (const a of absents) {
    const re = new RegExp(a, 'i')
    for (const f of fichiers) { const L = f.texte.split('\n'); const i = L.findIndex((l) => re.test(l)); if (i >= 0) d.push(`« ${a} » dans ${f.chemin}:${i + 1} (« ${court(L[i].trim(), 60)} »)`) }
  }
  for (const p of presents) {
    const re = new RegExp(p.motif, 'gi')
    const n = fichiers.reduce((k, f) => k + (f.texte.match(re) || []).length, 0)
    if ((p.min != null && n < p.min) || (p.max != null && n > p.max)) d.push(`« ${p.motif} » ${n} fois (attendu ${p.min ?? 0} à ${p.max ?? '∞'})`)
  }
  return d
}
function fichiersDe(chemins) {
  const out = [], manquants = []
  const parcourir = (abs) => {
    const s = fs.statSync(abs)
    if (s.isDirectory()) for (const e of fs.readdirSync(abs).sort()) parcourir(path.join(abs, e))
    else if (s.isFile()) out.push({ chemin: versSlash(path.relative(R, abs)), texte: s.size > 4 << 20 ? '(trop gros)' : lf(fs.readFileSync(abs, 'utf8')) })
  }
  for (const c of chemins) { const abs = path.join(R, c); if (!fs.existsSync(abs)) manquants.push(c); else parcourir(abs) }
  return { fichiers: out, manquants }
}

// ── Faux PostgREST, horloge simulée, piège réseau : les jugements, hors du processus de la preuve ────────────────────────
async function jugerFauxPostgrest(moduleAbs, c, sabotage = null) {
  const [[de, vers]] = Object.entries(c.renommer)
  const b = await banc('faux-postgrest.mjs', {
    BANC_MODULE: moduleAbs, BANC_MODULE_AFFICHE: versSlash(path.relative(R, moduleAbs)), BANC_CONTRAT: CONTRAT_OPS,
    BANC_FONCTION: c.fonction, BANC_DE: de, BANC_VERS: vers, ...(sabotage ? { BANC_SABOTAGE: sabotage } : {}),
  })
  if (b.erreur) return { defauts: [b.erreur] }
  return { defauts: Array.isArray(b.r.defauts) ? b.r.defauts : ['résultat sans liste de défauts'], r: b.r }
}
async function jugerHorloge(moduleAbs, c, sabotage = null) {
  const d = [], lus = []
  for (const k of c.cas) {
    const b = await banc('horloge-simulee.mjs', { BANC_MODULE: moduleAbs, BANC_FIGER: k.figer, BANC_AVANCER_MS: String(c.avancer_ms), TZ: 'UTC', ...(sabotage ? { TEMOIN_SABOTAGE: sabotage } : {}) })
    if (b.erreur) { d.push(b.erreur); continue }
    const r = b.r, t = Date.parse(k.figer), ms = c.avancer_ms
    if (r.erreur) { d.push(`${k.figer} : ${r.erreur}`); continue }
    lus.push(`${k.figer} → ${r.paris}`)
    if (r.paris !== k.paris) d.push(`figée à ${k.figer}, l'enfant lit ${r.paris} à Paris (${k.paris} attendu)`)
    if (Math.abs(r.now0 - t) > 1000) d.push(`figée à ${k.figer}, Date.now() vaut ${new Date(r.now0).toISOString()}`)
    if (Math.abs(r.ecartNew) > 1000) d.push(`new Date() ne suit pas Date.now() (écart ${r.ecartNew} ms)`)
    for (const [quoi, v] of [['Date.now()', r.dNow], ['new Date()', r.dNew], ['performance.now()', r.dPerf]]) {
      if (!(v >= ms - 1 && v <= ms + 1000)) d.push(`avancer(${ms}) : ${quoi} gagne ${Math.round(v)} ms`)
    }
  }
  return { defauts: [...new Set(d)], lus }
}
/** Le piège réseau sur un enfant synthétique : { defauts } si le piège ne note pas une tentative refusée, ou note une permise. */
async function eprouverPiege() {
  const d = []
  const dossier = path.join(TRAVAIL, 'piege-autotest')
  vider(dossier)
  const essai = async (nom, config, code, attendu) => {
    const j = path.join(dossier, `${nom}.txt`)
    const x = await lancer(['--input-type=module', '-e', code], 30_000, { NODE_OPTIONS: `--import="${pathToFileURL(path.join(BANCS, 'piege-reseau.mjs')).href}"`, PIEGE_JOURNAL: j, PIEGE_PERMIS: (config.permis || []).join(','), PIEGE_INTERDITS: (config.interdits || []).join(',') })
    const L = fs.existsSync(j) ? lf(fs.readFileSync(j, 'utf8')).split('\n').filter(Boolean) : []
    const charge = L.some((l) => l.startsWith('CHARGE ')), violations = L.filter((l) => l.startsWith('VIOLATION '))
    if (!charge) d.push(`${nom} : le piège ne s'est pas chargé dans l'enfant (code ${x.code}, « ${court(x.sortie, 80)} »)`)
    else if (attendu && violations.length < attendu) d.push(`${nom} : ${violations.length} tentative(s) notée(s), ${attendu} attendue(s) (${court(x.sortie, 80)})`)
    else if (!attendu && violations.length) d.push(`${nom} : tentative permise notée à tort : ${violations[0]}`)
  }
  // Tout part vers un hôte .invalid (jamais résolu) ou 127.0.0.1:9 : même un piège cassé n'enverrait rien dehors.
  const bavard = "const h='piege-026.invalid';const r=[];try{await fetch('http://'+h+'/x')}catch(e){r.push(e.message)};const http=await import('node:http');try{http.request({hostname:h,port:80}).on('error',()=>{}).end()}catch(e){r.push(e.message)};const net=await import('node:net');try{net.connect(80,h).on('error',()=>{})}catch(e){r.push(e.message)};console.log(r.length+' refus')"
  const sage = "try{await fetch('http://127.0.0.1:9/x')}catch(e){};const net=await import('node:net');try{net.connect(9,'127.0.0.1').on('error',()=>{})}catch(e){};console.log('fini')"
  await essai('permis-bavard', { permis: ['127.0.0.1'] }, bavard, 3)
  await essai('permis-sage', { permis: ['127.0.0.1'] }, sage, 0)
  await essai('interdits-bavard', { interdits: ['piege-026.invalid'] }, bavard, 3)
  await essai('interdits-sage', { interdits: ['piege-026.invalid'] }, sage, 0)
  return d
}

// ── Le contexte d'un passage ─────────────────────────────────────────────────────────────────────────────────────────────
function creerContexte({ P, fiche, s, juges, reference = null }) {
  const SORTIES = path.join(R, '.orchestre', 'preuves', fiche, 'sorties')
  const ctx = {
    P, fiche, s, juges,
    piege: null, // { permis } ou { interdits } quand un contrôle reseau-piege est déclaré : tous les passages du juge sont piégés
    runs: new Map(), autotests: new Map(), lignes: new Map(), refEtat: reference,
    journal: (nom, contenu) => ecrire(path.join(SORTIES, `${nom}.log`), contenu),
    ligne: (j) => { if (!ctx.lignes.has(j.commande)) ctx.lignes.set(j.commande, { juge: j.commande, attendu: j.echec_attendu }); return ctx.lignes.get(j.commande) },
    reference() {
      if (!ctx.refEtat) { try { ctx.refEtat = extraireReference(P.reference, P.archive) } catch (e) { ctx.refEtat = { erreur: e.message } } }
      return ctx.refEtat
    },
  }
  return ctx
}
/** Un passage du juge, sur la référence (--racine=) ou en --temoin, mémorisé : piégé si le lot déclare reseau-piege. */
function lancerJuge(ctx, j, mode) {
  const cle = `${j.commande}|${mode}`
  if (!ctx.runs.has(cle)) {
    ctx.runs.set(cle, (async () => {
      let extra
      if (mode === 'reference') { const ref = ctx.reference(); if (ref.erreur) return { indisponible: ref.erreur }; extra = [`--racine=${ref.dest}`] } else extra = ['--temoin']
      const env = {}
      let jp = null
      if (ctx.piege) {
        jp = path.join(TRAVAIL, 'piege', `${nomDe(j.commande)}-${mode}.txt`)
        fs.mkdirSync(path.dirname(jp), { recursive: true }); fs.rmSync(jp, { force: true })
        env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''}--import="${pathToFileURL(path.join(BANCS, 'piege-reseau.mjs')).href}"`
        env.PIEGE_JOURNAL = jp
        env.PIEGE_PERMIS = (ctx.piege.permis || []).join(','); env.PIEGE_INTERDITS = (ctx.piege.interdits || []).join(',')
      }
      const x = await lancer([...argvDe(j.commande), ...extra], DELAI_MS, env)
      x.piege = jp ? (fs.existsSync(jp) ? lf(fs.readFileSync(jp, 'utf8')).split('\n').filter(Boolean) : []) : null
      ctx.journal(`${nomDe(j.commande)}-${mode}`, `$ ${j.commande} ${extra.map((a) => versSlash(a)).join(' ')}${jp ? ' (réseau piégé)' : ''}\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
      return x
    })())
  }
  return ctx.runs.get(cle)
}

// ── Le catalogue ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const chaine = (v) => typeof v === 'string' && v.length > 0
const tableauDe = (v, f) => Array.isArray(v) && v.length > 0 && v.every(f)
const cheminSur = (v) => chaine(v) && RE_CHEMIN.test(v)
const fichiersReutilise = (c) => (c.fichiers !== undefined ? c.fichiers : [c.fichier])
const CATALOGUE = {
  'echec-sur-reference': {
    valider: () => null,
    autotest: async () => {
      const rates = []
      for (const [quoi, critere, attendu, sortie] of AUTOTEST_LECTURE) {
        const { defauts } = lireEchec(sortie, critere)
        if ((defauts.length === 0) !== attendu) rates.push(`${quoi} : ${attendu ? `refusée (${defauts.join(' ; ')})` : 'acceptée'}`)
      }
      return { defauts: rates, resume: `lecture des sorties : ${AUTOTEST_LECTURE.length - 1} sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme acceptée` }
    },
    async verifier(c, ctx, id) {
      const { P, s } = ctx
      const arbre = git(['ls-tree', '-r', '--name-only', P.reference])
      if (arbre === null) { s.echoue(id, `référence ${P.reference.slice(0, 12)} introuvable dans le dépôt`); return }
      const L = arbre.split('\n')
      const presents = P.absents_de_la_reference.filter((pref) => L.some((l) => l.startsWith(pref)))
      if (presents.length) s.echoue(id, `la référence contient déjà : ${presents.join(', ')} — ce n'est pas l'état d'avant les fiches jugées`)
      const ref = ctx.reference()
      if (ref.erreur) { s.echoue(id, ref.erreur); return }
      s.note(`référence extraite par git archive (${ref.presents.join(', ') || 'aucun chemin'}${ref.absents.length ? ` ; absents de la référence : ${ref.absents.join(', ')}` : ''}) : ${ref.fichiers} fichiers sous ${versSlash(path.relative(R, ref.dest))}`)
      for (const j of ctx.juges) {
        const x = await lancerJuge(ctx, j, 'reference')
        const r = ctx.ligne(j)
        r.codeRef = x.code
        const lu = lireEchec(x.stdout, j.echec_attendu)
        r.extrait = lu.ligne
        const defauts = []
        if (x.expire) defauts.push('délai dépassé')
        if (x.code === 0) defauts.push('code 0 sur la référence : le juge ne sait pas échouer')
        if (x.code === 2) defauts.push('code 2 (appel invalide ou préalable) au lieu d\'un échec jugé')
        if (TRACE.test(x.sortie)) defauts.push('trace de pile : un plantage n\'est pas un échec attendu')
        defauts.push(...lu.defauts)
        if (defauts.length) { s.echoue(id, `${j.commande} : ${defauts.join(' ; ')}`); continue }
        // l'autotest sur la sortie réelle : le même juge, le critère déclaré vert à tort, doit être vu
        const sabote = saboterSortie(x.stdout, j.echec_attendu)
        if (!lireEchec(sabote, j.echec_attendu).defauts.length) s.echoue(id, `${nomDe(j.commande)} : sur sa sortie réelle, ${j.echec_attendu} réécrit en PASS n'est pas vu par la lecture de la preuve`)
        else s.passe(id, `${nomDe(j.commande)} code ${x.code}, « ${court(r.extrait, 80)} » ; réécrit en PASS sur la sortie réelle (${citeAilleurs(sabote, j.echec_attendu)} ligne(s) d'autres critères le citent encore) : vu`)
      }
    },
  },
  temoin: {
    valider: () => null,
    autotest: async () => {
      const cas = [
        [{ code: 0, stdout: 'PASS XX-1 — a\nx-qa : PASS\n' }, true], [{ code: 0, stdout: 'FAIL XX-1 — a\nx-qa : FAIL — XX-1\n' }, false],
        [{ code: 0, stdout: 'rien\n' }, false], [{ code: 1, stdout: 'x-qa : PASS\n' }, false], [{ code: 0, expire: true, stdout: 'x-qa : PASS\n' }, false],
      ]
      const rates = cas.filter(([x, ok]) => (lireTemoin(x).length === 0) !== ok).map(([x, ok]) => `${ok ? 'témoin conforme refusé' : 'témoin fautif accepté'} (code ${x.code}${x.expire ? ', délai' : ''}, « ${court(x.stdout, 40)} »)`)
      return { defauts: rates, resume: 'code ≠ 0, bilan FAIL ou absent, délai : refusés ; code 0 + bilan PASS : accepté' }
    },
    async verifier(c, ctx, id) {
      for (const j of ctx.juges) {
        const x = await lancerJuge(ctx, j, 'temoin')
        const r = ctx.ligne(j)
        r.codeTemoin = x.code; r.bilanTemoin = bilanDe(x.stdout)?.verdict || null
        const d = lireTemoin(x)
        if (d.length) ctx.s.echoue(id, `${j.commande} --temoin : ${d.join(', ')} (${court(x.sortie.split(/\r?\n/).find((l) => /^FAIL /.test(l)) || x.sortie.split(/\r?\n/).filter(Boolean).at(-1), 120)})`)
        else ctx.s.passe(id, `${nomDe(j.commande)} --temoin code 0, bilan PASS`)
      }
    },
  },
  'reel-sans-secret': {
    valider: () => null,
    autotest: async () => {
      const d = []
      const x = await lancer([COUPE_RESEAU, '--input-type=module', '-e', "try { await fetch('http://127.0.0.1:9/x'); console.log('PASSE') } catch (e) { console.log('COUPE ' + e.message) }"], 30_000)
      if (!/COUPE réseau coupé par la preuve 026-009/.test(x.stdout)) d.push(`la coupure du réseau ne coupe pas fetch (« ${court(x.sortie, 80)} »)`)
      const can = { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'canari-anon-essai', SUPABASE_SERVICE_ROLE_KEY: 'canari-service-essai' }
      if (fuitesDe('clé canari-service-essai affichée', can).length !== 1) d.push('un canari affiché n\'est pas vu')
      if (fuitesDe('rien à voir', can).length) d.push('un canari est vu dans une sortie propre')
      return { defauts: d, resume: 'fetch coupé dans l\'enfant ; canari affiché vu, sortie propre acceptée' }
    },
    async verifier(c, ctx, id) {
      const reels = ctx.juges.filter((j) => j.reel)
      if (!reels.length) { ctx.s.echoue(id, 'aucun juge marqué « reel » : le contrôle ne juge rien'); return }
      for (const j of reels) {
        const alea = crypto.randomBytes(6).toString('hex')
        const canaris = { NEXT_PUBLIC_SUPABASE_URL: `canari-url-${alea}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: `canari-anon-${alea}`, SUPABASE_SERVICE_ROLE_KEY: `canari-service-${alea}` }
        const z = await lancer([COUPE_RESEAU, ...argvDe(j.commande), '--reel'], 60_000, canaris)
        const fuites = fuitesDe(z.sortie, canaris)
        // une sortie qui a laissé fuir une clé peut porter d'autres valeurs de .env.local : elle n'est pas recopiée
        ctx.journal(`${nomDe(j.commande)}-reel-canaris`, fuites.length ? `$ ${j.commande} --reel (réseau coupé, clés-canaris)\n# code ${z.code}\n\nSORTIE NON RECOPIÉE : ${fuites.join(', ')} y paraît\n` : `$ ${j.commande} --reel (réseau coupé, clés-canaris)\n# code ${z.code} · ${z.duree.toFixed(1)} s\n\n${z.sortie}`)
        const defauts = []
        if (z.expire) defauts.push('délai dépassé')
        if (![1, 2].includes(z.code)) defauts.push(`code ${z.code} sans réseau (1 ou 2 attendu)`)
        if (TRACE.test(z.sortie)) defauts.push('trace de pile')
        if (fuites.length) defauts.push(`clé affichée : ${fuites.join(', ')} (canari retrouvé dans la sortie)`)
        ctx.ligne(j).reel = defauts.length ? `FAIL : ${defauts.join(' ; ')}` : `code ${z.code}, aucune clé affichée`
        if (defauts.length) ctx.s.echoue(id, `${j.commande} --reel (réseau coupé, clés-canaris) : ${defauts.join(' ; ')}`)
        else ctx.s.passe(id, `${nomDe(j.commande)} --reel réseau coupé : code ${z.code}, aucune des deux clés-canaris dans la sortie (« ${court(z.sortie.split(/\r?\n/).filter(Boolean).at(-1), 70)} »)`)
      }
    },
  },
  'bloc-essai': {
    valider: (c) => (!tableauDe(c.cas, (k) => k && chaine(k.commande) && RE_COMMANDE.test(k.commande) && tableauDe(k.jumeaux, (n) => /^\d{4}$/.test(n)) && (k.seulement_dans_exists === undefined || tableauDe(k.seulement_dans_exists, chaine)))
      ? '« cas » : [{ commande: "node scripts/<juge>.mjs …", jumeaux: ["NNNN", …], seulement_dans_exists?: [mots] }] attendu' : null),
    autotest: async () => {
      const d = []
      const e = empreinte(JUMEAU_EXEMPLE)
      const sc = "  r := r || jsonb_build_object('essai_exemple', true);"
      let bloc
      try { bloc = blocEssai({ nus: [JUMEAU_EXEMPLE], scenario: sc, empreinte: e }) } catch (err) { return { defauts: [`blocEssai refuse le jumeau d'exemple : ${err.message}`], resume: '' } }
      if (!analyserEssai(bloc, { nus: [JUMEAU_EXEMPLE] }).ok || lireBloc(bloc, [JUMEAU_EXEMPLE], e).length) d.push(`bloc conforme refusé : ${lireBloc(bloc, [JUMEAU_EXEMPLE], e).join(' ; ')}`)
      const ep = eprouverBloc(bloc, [JUMEAU_EXEMPLE], e)
      d.push(...ep.rates)
      // exists (…) : un mot de seulement_dans_exists n'est permis que là
      const dedans = avantRaise(bloc, "  r := r || jsonb_build_object('secret_present', exists (select 1 from vault.decrypted_secrets where name = 'cron_secret'));")
      const dehors = avantRaise(bloc, '  perform (select count(*) from vault.decrypted_secrets);')
      const mots = ['vault.', 'decrypted_secret']
      if (lireBloc(dedans, [JUMEAU_EXEMPLE], e, mots).length) d.push(`decrypted_secret dans exists (…) refusé à tort : ${lireBloc(dedans, [JUMEAU_EXEMPLE], e, mots).join(' ; ')}`)
      if (!lireBloc(dehors, [JUMEAU_EXEMPLE], e, mots).length) d.push('decrypted_secret hors d\'un exists (…) accepté')
      if (!lireBloc(dedans, [JUMEAU_EXEMPLE], e).length) d.push('vault. dans exists (…) accepté alors qu\'aucun mot n\'y est permis')
      const refus = []
      for (const [quoi, x] of [['jumeau porteur de $essai_026$', { nus: ['select 1; -- $essai_026$'], scenario: 'null;', empreinte: e }], ['jumeau porteur de $migration_026$', { nus: ['select $migration_026$x$migration_026$;'], scenario: 'null;', empreinte: e }], ['scénario porteur de $essai_026$', { nus: [JUMEAU_EXEMPLE], scenario: 'perform 1; -- $essai_026$', empreinte: e }]]) {
        try { blocEssai(x); d.push(`blocEssai accepte un ${quoi}`) } catch { refus.push(quoi) }
      }
      return { defauts: d, resume: `défauts plantés vus par les deux lectures (${ep.vus.join(', ')}) ; mots interdits dans une chaîne acceptés ; decrypted_secret permis dans exists (…) seulement ; blocEssai refuse : ${refus.join(', ')}` }
    },
    async verifier(c, ctx, id) {
      const ex = path.join(TRAVAIL, 'exemple')
      vider(ex)
      const nuEx = {}
      for (const n of [...new Set(c.cas.flatMap((k) => k.jumeaux))]) {
        const base = `_A_COLLER_sql_editor_${n}_NU.sql`
        const f = path.join(ex, 'supabase', 'migrations', base)
        ecrire(f, `${'-'.repeat(28)} ${base} — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.\n${JUMEAU_EXEMPLE}\n${MARQUE_CONTROLE}\nselect 'exemple ${n}' as quoi, 'oui' as resultat;\n`)
        nuEx[n] = jumeauNuCoupe(f)
      }
      let valide = null
      for (const k of c.cas) {
        const argv = [...argvDe(k.commande), '--generer-essai', `--racine=${ex}`]
        const x = await lancer(argv, 60_000)
        ctx.journal(`generer-essai-${nomDe(k.commande)}`, `$ node ${argv.map(versSlash).join(' ')}\n# code ${x.code}\n\n${x.stdout}\n-- sortie d'erreur --\n${x.stderr}`)
        const nus = k.jumeaux.map((n) => nuEx[n])
        const e = empreinte(nuEx[k.jumeaux.at(-1)])
        if (x.code !== 0) { ctx.s.echoue(id, `${k.commande} --generer-essai en code ${x.code} : ${court(x.sortie, 140)}`); continue }
        const a = analyserEssai(x.stdout, { nus })
        const ind = lireBloc(x.stdout, nus, e, k.seulement_dans_exists || [])
        if (!a.ok) ctx.s.echoue(id, `${k.commande} --generer-essai : analyserEssai refuse — ${a.raisons.slice(0, 3).join(' ; ')}`)
        if (ind.length) ctx.s.echoue(id, `${k.commande} --generer-essai : la lecture de la preuve refuse — ${ind.slice(0, 3).join(' ; ')}`)
        if (a.ok && !ind.length) {
          ctx.s.passe(id, `${nomDe(k.commande)} : 1 énoncé, ${nus.length} jumeau(x), ${a.octets} octets`)
          if (!valide) valide = { bloc: x.stdout, nus, e, quoi: nomDe(k.commande) }
        }
      }
      // les deux lectures savent-elles échouer sur un bloc RÉEL du juge ? Chaque défaut planté doit être vu par l'une ET l'autre.
      if (!valide) { ctx.s.echoue(id, 'aucun bloc valide : les défauts plantés ne peuvent pas être éprouvés sur un bloc réel'); return }
      const ep = eprouverBloc(valide.bloc, valide.nus, valide.e)
      for (const r of ep.rates) ctx.s.echoue(id, `${valide.quoi} : ${r}`)
      if (!ep.rates.length) ctx.s.passe(id, `sur le bloc réel de ${valide.quoi}, défauts plantés vus par les deux lectures : ${ep.vus.join(', ')} ; mots interdits dans une chaîne acceptés`)
    },
  },
  reutilise: {
    valider: (c) => {
      if ((c.fichier === undefined) === (c.fichiers === undefined)) return 'exactement un de « fichier » et « fichiers »'
      if (!tableauDe(fichiersReutilise(c), cheminSur)) return '« fichier » ou « fichiers » : chemin(s) du dépôt attendu(s)'
      if (!chaine(c.module) || !/^\.\.?\//.test(c.module)) return '« module » : le chemin relatif tel qu\'écrit dans l\'import (./… ou ../…)'
      if (!tableauDe(c.noms, (n) => /^[A-Za-z_$][\w$]*$/.test(n))) return '« noms » : des identifiants'
      if (c.appeles !== undefined && !(Array.isArray(c.appeles) && c.appeles.every((n) => c.noms.includes(n)))) return '« appeles » : une partie de « noms »'
      if (c.identite !== undefined && typeof c.identite !== 'boolean') return '« identite » : true ou false'
      return null
    },
    autotest: async () => {
      const valeurs = {
        f: { type: 'function', texte: 'function f(sql) {\n  return String(sql).replace(/--[^\\n]*/g, "").replace(/\\s+/g, " ").trim()\n}' },
        M: { type: 'string', texte: '-- MARQUE DE CONTROLE D ESSAI : ne pas recopier' },
      }
      const spec = { module: '../m.mjs', noms: ['f', 'M'], appeles: ['f'], valeurs }
      const base = "import { f, M } from '../m.mjs'\nexport { M }\nconst x = f('a')\n"
      const cas = [
        ['conforme', base, true],
        ['import ôté', base.replace('{ f, M }', '{ f }'), false],
        ['redéfini', `${base}const M = 'autre'\n`, false],
        ['texte recopié', `${base}const y = '${valeurs.M.texte}'\n`, false],
        ['code recopié', `${base}const g = ${valeurs.f.texte.replace('function f', 'function g')}\n`, false],
        ['jamais appelé', base.replace("f('a')", 'f'), false],
      ]
      const rates = cas.filter(([, src, ok]) => (lireReutilise(src, spec).length === 0) !== ok).map(([quoi, , ok]) => `${quoi} : ${ok ? 'refusé' : 'accepté'}`)
      return { defauts: rates, resume: 'import ôté, redéfinition, texte ou code recopié, jamais appelé : refusés ; conforme accepté' }
    },
    async verifier(c, ctx, id) {
      const appeles = c.appeles || []
      for (const fichier of fichiersReutilise(c)) {
        const abs = path.join(R, fichier)
        if (!fs.existsSync(abs)) { ctx.s.echoue(id, `${fichier} introuvable`); continue }
        const src = lf(fs.readFileSync(abs, 'utf8'))
        const source = path.resolve(path.dirname(abs), c.module)
        const b = await banc('valeurs.mjs', { BANC_SOURCE: source, BANC_NOMS: c.noms.join(','), ...(c.identite ? { BANC_FICHIER: abs } : {}) })
        if (b.erreur || b.r.erreur) { ctx.s.echoue(id, `${fichier} : ${b.erreur || b.r.erreur}`); continue }
        const d = lireReutilise(src, { module: c.module, noms: c.noms, appeles, valeurs: b.r.valeurs })
        for (const n of c.noms) if (b.r.valeurs[n]?.type === 'undefined') d.push(`${n} n'est pas exporté par ${c.module}`)
        if (c.identite) for (const [n, meme] of Object.entries(b.r.identite)) if (!meme) d.push(`le ${n} exporté par ${fichier} n'est pas celui de ${c.module}`)
        if (d.length) ctx.s.echoue(id, `${fichier} : ${d.join(' ; ')}`)
        else ctx.s.passe(id, `${fichier} importe ${c.noms.join(' et ')} de ${c.module}${appeles.length ? `, appelle ${appeles.join(', ')}` : ''}, et ne les redéfinit ni ne les recopie${c.identite ? ' ; ce qu\'il réexporte est le même objet' : ''}`)
      }
    },
  },
  'compte-rendu': {
    valider: (c) => (cheminSur(c.scenario) ? null : '« scenario » : le chemin du scénario d\'essai dont les clés sont attendues'),
    autotest: async (c) => {
      const d = []
      const dossier = path.join(TRAVAIL, 'compte-rendu-autotest')
      vider(dossier)
      const cles = ['cle_a', 'cle_b', 'cle_c', 'cle_d', 'cle_e', 'cle_f']
      if (!jugerComptesRendus(() => ({ ok: true, raisons: [] }), cles, dossier).defauts.length) d.push('un lecteur qui accepte tout passe')
      if (!jugerComptesRendus(() => ({ ok: false, raisons: ['non'] }), cles, dossier).defauts.length) d.push('un lecteur qui refuse tout passe')
      return { defauts: d, resume: 'un lecteur qui accepte tout et un lecteur qui refuse tout sont pris' }
    },
    async verifier(c, ctx, id) {
      const d = path.join(TRAVAIL, 'compte-rendu')
      vider(d)
      const abs = path.join(R, c.scenario)
      if (!fs.existsSync(abs)) { ctx.s.echoue(id, `${c.scenario} introuvable`); return }
      const cles = clesScenario(fs.readFileSync(abs, 'utf8'))
      if (cles.length < 6) { ctx.s.echoue(id, `${c.scenario} : ${cles.length} clé(s), il en faut 6 pour fabriquer les cas`); return }
      const j = jugerComptesRendus(lireCompteRendu, cles, d)
      for (const x of j.defauts) ctx.s.echoue(id, x)
      if (!j.defauts.length) ctx.s.passe(id, j.bilan.join(' ; '))
    },
  },
  'contrat-fiches': {
    valider: (c) => (cheminSur(c.contrat) && tableauDe(c.migrations, (n) => /^\d{4}$/.test(n)) ? null : '« contrat » (chemin) et « migrations » (["NNNN", …]) attendus'),
    autotest: async (c) => {
      let contrat
      try { contrat = JSON.parse(fs.readFileSync(path.join(R, c.contrat), 'utf8')) } catch (e) { return { defauts: [`contrat illisible : ${e.message}`], resume: '' } }
      const { sections } = lireSections(contrat)
      const clesDe = (f) => clesScenario(fs.readFileSync(path.join(R, f), 'utf8'))
      const d = []
      const muter = (f) => { const x = structuredClone(contrat); f(x); return x }
      const [f0] = Object.entries(contrat.fonctions).filter(([, f]) => f.params.length && sections.has(f.fiche))
      const [t0] = Object.entries(contrat.tables).filter(([, t]) => sections.has(t.fiche) && t.colonnes?.length)
      const n0 = c.migrations[0]
      const mutations = [
        ['paramètre renommé', muter((x) => { x.fonctions[f0[0]].params[0][0] = `${x.fonctions[f0[0]].params[0][0]}_x` })],
        ['fonction fantôme', muter((x) => { x.fonctions.ops_fantome_026 = { ...x.fonctions[f0[0]] } })],
        ['colonne réécrite', muter((x) => { x.tables[t0[0]].colonnes[0].texte = `${x.tables[t0[0]].colonnes[0].texte} (réécrit)` })],
        ['code d\'erreur inventé', muter((x) => { x.erreurs['ops:fantome_026'] = [f0[1].fiche] })],
        ['clé d\'essai ôtée', muter((x) => { x.migrations[n0].cles_essai.cles = x.migrations[n0].cles_essai.cles.slice(1) })],
      ]
      const base = comparerContrat(contrat, sections, c.migrations, clesDe).defauts.length
      for (const [quoi, x] of mutations) if (comparerContrat(x, sections, c.migrations, clesDe).defauts.length <= base) d.push(`${quoi} : non vu`)
      return { defauts: d, resume: `${mutations.map(([q]) => q).join(', ')} : vus` }
    },
    async verifier(c, ctx, id) {
      let contrat
      try { contrat = JSON.parse(fs.readFileSync(path.join(R, c.contrat), 'utf8')) } catch (e) { ctx.s.echoue(id, `${c.contrat} illisible : ${e.message}`); return }
      const { sections, defauts } = lireSections(contrat)
      for (const x of defauts) ctx.s.echoue(id, x)
      const r = comparerContrat(contrat, sections, c.migrations, (f) => clesScenario(fs.readFileSync(path.join(R, f), 'utf8')))
      for (const x of r.defauts) ctx.s.echoue(id, x)
      if (!defauts.length && !r.defauts.length) ctx.s.passe(id, `${r.nF} fonctions, ${Object.keys(contrat.tables).length} tables et ${Object.keys(contrat.erreurs).length} codes retrouvés dans les sections Contrat de ${[...sections.keys()].join(', ')} ; clés d'essai de ${c.migrations.join(', ')} égales aux scénarios`)
    },
  },
  'faux-postgrest': {
    valider: (c) => {
      if (!cheminSur(c.module)) return '« module » : le chemin du faux PostgREST'
      if (!/^ops[._][a-z0-9_]+$/.test(c.fonction || '')) return '« fonction » : une fonction ops_* du contrat'
      if (!c.renommer || typeof c.renommer !== 'object' || Object.keys(c.renommer).length !== 1 || !Object.entries(c.renommer).every(([a, b]) => chaine(a) && chaine(b) && a !== b)) return '« renommer » : { "<paramètre du contrat>": "<faux nom>" }'
      return null
    },
    autotest: async (c) => {
      const d = []
      const temoin = path.join(TEMOINS, 'faux-postgrest.mjs')
      const vrai = await jugerFauxPostgrest(temoin, c)
      if (vrai.defauts.length) d.push(`témoin refusé : ${vrai.defauts.join(' ; ')}`)
      const pris = []
      for (const sab of ['laxiste', 'ferme', 'muet', 'immortel']) { const x = await jugerFauxPostgrest(temoin, c, sab); if (!x.defauts.length) d.push(`sabotage « ${sab} » accepté`); else pris.push(sab) }
      return { defauts: d, resume: `témoin accepté (${c.fonction} conforme → ${vrai.r?.conforme}, ${Object.keys(c.renommer)[0]} → ${Object.values(c.renommer)[0]} → ${vrai.r?.fautif}) ; sabotages pris : ${pris.join(', ')}` }
    },
    async verifier(c, ctx, id) {
      const abs = path.join(R, c.module)
      if (!fs.existsSync(abs)) { ctx.s.echoue(id, `${c.module} introuvable`); return }
      const x = await jugerFauxPostgrest(abs, c)
      const [[de, vers]] = Object.entries(c.renommer)
      if (x.defauts.length) ctx.s.echoue(id, `${c.module}, démarré par la preuve : ${x.defauts.join(' ; ')}`)
      else ctx.s.passe(id, `${c.module}, démarré par la preuve : ${c.fonction} conforme au contrat → HTTP ${x.r.conforme} ; ${de} renommé ${vers} → HTTP ${x.r.fautif} ; appels consignés ${x.r.appels.join(' → ')} ; arreter() ferme`)
    },
  },
  'reseau-piege': {
    valider: (c) => {
      const l = c.permis ?? c.interdits
      if ((c.permis === undefined) === (c.interdits === undefined)) return 'exactement une de « permis » et « interdits »'
      return tableauDe(l, (h) => chaine(h) && RE_HOTE.test(h)) ? null : 'une liste d\'hôtes'
    },
    autotest: async () => ({ defauts: await eprouverPiege(), resume: 'fetch, http.request et net.connect vers un hôte refusé notés et bloqués, en permis comme en interdits ; 127.0.0.1 laissé passer' }),
    async verifier(c, ctx, id) {
      for (const j of ctx.juges) for (const mode of ['reference', 'temoin']) {
        const x = await lancerJuge(ctx, j, mode)
        if (x.indisponible) { ctx.s.echoue(id, `${j.commande} (${mode}) : ${x.indisponible}`); continue }
        const L = x.piege || []
        const violations = L.filter((l) => l.startsWith('VIOLATION '))
        if (!L.some((l) => l.startsWith('CHARGE '))) ctx.s.echoue(id, `${j.commande} (${mode}) : le piège ne s'est pas chargé dans le juge`)
        else if (violations.length) ctx.s.echoue(id, `${j.commande} (${mode}) : ${violations.length} tentative(s) vers un hôte refusé — ${[...new Set(violations.map((v) => v.split(' ').slice(1, 3).join(' ')))].join(', ')}`)
        else ctx.s.passe(id, `${nomDe(j.commande)} (${mode}) : piège chargé dans ${L.filter((l) => l.startsWith('CHARGE ')).length} processus, aucune tentative`)
      }
    },
  },
  'horloge-simulee': {
    valider: (c) => {
      if (!cheminSur(c.module)) return '« module » : le chemin de l\'horloge simulée'
      if (!tableauDe(c.cas, (k) => k && Number.isFinite(Date.parse(k.figer)) && /Z$/.test(k.figer) && /^\d{2}:\d{2}$/.test(k.paris))) return '« cas » : [{ figer: "<ISO en UTC, Z>", paris: "HH:MM" }]'
      if (!Number.isInteger(c.avancer_ms) || c.avancer_ms <= 0) return '« avancer_ms » : un entier positif'
      return null
    },
    autotest: async (c) => {
      const d = []
      const temoin = path.join(TEMOINS, 'horloge-simulee.mjs')
      const vrai = await jugerHorloge(temoin, c)
      if (vrai.defauts.length) d.push(`témoin refusé : ${vrai.defauts.join(' ; ')}`)
      const pris = []
      for (const sab of ['figer', 'avancer', 'decale', 'fuseau']) { const x = await jugerHorloge(temoin, c, sab); if (!x.defauts.length) d.push(`sabotage « ${sab} » accepté`); else pris.push(sab) }
      return { defauts: d, resume: `témoin accepté (${vrai.lus.join(', ')}) ; sabotages pris : ${pris.join(', ')}` }
    },
    async verifier(c, ctx, id) {
      const abs = path.join(R, c.module)
      if (!fs.existsSync(abs)) { ctx.s.echoue(id, `${c.module} introuvable`); return }
      const x = await jugerHorloge(abs, c)
      if (x.defauts.length) ctx.s.echoue(id, `${c.module} : ${x.defauts.join(' ; ')}`)
      else ctx.s.passe(id, `${c.module} : ${x.lus.join(', ')} à Paris ; avancer(${c.avancer_ms}) suivi par Date.now(), new Date() et performance.now()`)
    },
  },
  motifs: {
    valider: (c) => {
      if (!tableauDe(c.chemins, cheminSur)) return '« chemins » : fichiers ou dossiers du dépôt'
      if (!(c.absents?.length || c.presents?.length)) return 'au moins un motif « absents » ou « presents »'
      try { for (const a of c.absents || []) new RegExp(a, 'i'); for (const p of c.presents || []) new RegExp(p.motif, 'gi') } catch (e) { return `motif illisible : ${e.message}` }
      return null
    },
    autotest: async () => {
      const f = (t) => [{ chemin: 'essai.json', texte: t }]
      const cas = [
        [f('{"agent":"veilleur","vercel_pro":1}'), { absents: ['boite'], presents: [{ motif: 'vercel_pro', min: 1, max: 1 }] }, true],
        [f('{"boite_03":1,"vercel_pro":1}'), { absents: ['boite'] }, false],
        [f('{"vercel_pro":1,"x":"vercel_pro"}'), { presents: [{ motif: 'vercel_pro', min: 1, max: 1 }] }, false],
        [f('{}'), { presents: [{ motif: 'vercel_pro', min: 1 }] }, false],
        [f(''), { absents: ['boite'] }, false],
        [[], { absents: ['boite'] }, false],
      ]
      const rates = cas.filter(([fi, sp, ok]) => (lireMotifs(fi, sp).length === 0) !== ok).map(([fi, , ok]) => `${ok ? 'conforme refusé' : 'fautif accepté'} (« ${court(fi[0]?.texte ?? 'aucun fichier', 40)} »)`)
      return { defauts: rates, resume: 'motif interdit présent, compte hors bornes, fichier vide, aucun fichier : refusés ; conforme accepté' }
    },
    async verifier(c, ctx, id) {
      const { fichiers, manquants } = fichiersDe(c.chemins)
      if (manquants.length) ctx.s.echoue(id, `introuvable(s) : ${manquants.join(', ')}`)
      const d = lireMotifs(fichiers, c)
      if (d.length) ctx.s.echoue(id, d.slice(0, 6).join(' ; '))
      else if (!manquants.length) ctx.s.passe(id, `${fichiers.length} fichier(s) sous ${c.chemins.join(', ')} : ${[...(c.absents || []).map((a) => `sans « ${a} »`), ...(c.presents || []).map((p) => `« ${p.motif} » ${p.min ?? 0} à ${p.max ?? '∞'} fois`)].join(', ')}`)
    },
  },
  immobile: {
    valider: () => null,
    autotest: async () => {
      const a = { lignes: [' M x'], empreintes: new Map([['x', 'h1']]) }
      const d = []
      if (differences(a, a).length) d.push('deux états égaux diffèrent')
      if (!differences(a, { lignes: [' M x', '?? y'], empreintes: new Map([['x', 'h1'], ['y', 'h2']]) }).length) d.push('un fichier apparu n\'est pas vu')
      if (!differences(a, { lignes: [' M x'], empreintes: new Map([['x', 'h2']]) }).length) d.push('un fichier modifié (même ligne de git status) n\'est pas vu')
      if (!differences(a, { lignes: [], empreintes: new Map() }).length) d.push('un fichier rétabli n\'est pas vu')
      return { defauts: d, resume: 'fichier apparu, modifié ou rétabli : vu ; états égaux : acceptés' }
    },
    async verifier(c, ctx, id) {
      const apres = etat(ctx.fiche)
      const d = differences(ctx.avant, apres)
      if (d.length) ctx.s.echoue(id, `${d.length} changement(s) hors .orchestre/travail/ et .orchestre/preuves/ : ${d.slice(0, 5).join(', ')}`)
      else ctx.s.passe(id, `git status --porcelain et empreintes de ${ctx.avant.empreintes.size} fichier(s) modifié(s) ou non suivi(s) identiques avant et après (tenue de l'orchestre et périmètres des autres fiches de en-cours/ écartés)`)
    },
  },
}

// ── preuve-NN.json : la forme (code 2), puis le plancher (critère rouge) ─────────────────────────────────────────────────
function lireForme(P, lot) {
  const e = []
  if (P.lot !== lot) e.push(`« lot » ${P.lot} ≠ ${lot}`)
  if (!/^026-\d{3}$/.test(P.fiche || '')) e.push('« fiche » : un id 026-NNN')
  if (!/^[0-9a-f]{40}$/.test(P.reference || '')) e.push('« reference » : un sha complet de 40 signes')
  if (!tableauDe(P.absents_de_la_reference, chaine)) e.push('« absents_de_la_reference » : des préfixes de chemins')
  if (!tableauDe(P.archive, cheminSur)) e.push('« archive » : les chemins extraits de la référence')
  if (!tableauDe(P.juges, (j) => j && typeof j === 'object')) e.push('« juges » vide')
  else for (const j of P.juges) {
    if (!chaine(j.commande) || !RE_COMMANDE.test(j.commande.trim())) e.push(`commande « ${j.commande} » : « node scripts/<juge>.mjs [--option[=valeur]]… » attendu`)
    else if (!fs.existsSync(path.join(R, argvDe(j.commande)[0]))) e.push(`commande « ${j.commande} » : ${argvDe(j.commande)[0]} introuvable`)
    if (!RE_ID_JUGE.test(j.echec_attendu || '')) e.push(`echec_attendu « ${j.echec_attendu} » mal formé`)
    if (j.reel !== undefined && typeof j.reel !== 'boolean') e.push(`« reel » de ${j.commande} : true ou false`)
  }
  if (!P.criteres || typeof P.criteres !== 'object' || Array.isArray(P.criteres)) e.push('« criteres » : { "JP-1": [contrôles], … }')
  else {
    const ids = Object.keys(P.criteres)
    if (!ids.every((id) => /^JP-[1-9]\d*$/.test(id))) e.push('les critères se nomment JP-1, JP-2, …')
    else if (trierIds(ids).some((id, i) => numero(id) !== i + 1)) e.push(`critères non contigus : ${trierIds(ids).join(', ')} (JP-1 à JP-${ids.length} attendus)`)
    for (const [id, cs] of Object.entries(P.criteres)) {
      if (!tableauDe(cs, (c) => c && typeof c === 'object')) { e.push(`${id} : une liste non vide de contrôles`); continue }
      for (const c of cs) {
        const T = CATALOGUE[c.type]
        if (!T) { e.push(`${id} : contrôle « ${c.type} » inconnu (catalogue : ${Object.keys(CATALOGUE).join(', ')})`); continue }
        const m = T.valider(c)
        if (m) e.push(`${id} ${c.type} : ${m}`)
      }
    }
  }
  return e
}
/** Le plancher : rend [[critère, message]] pour chaque exigence du cahier que preuve-NN.json ne tient pas. */
function lirePlancher(P, lot, p01) {
  const L = LOTS[lot], out = []
  const tous = Object.values(P.criteres).flat()
  const premier = Object.entries(L.criteres).find(([, t]) => t.includes('echec-sur-reference'))[0]
  if (P.fiche !== L.fiche) out.push([premier, `« fiche » ${P.fiche} ; le lot ${lot} est la fiche ${L.fiche}`])
  const eu = P.juges.map((j) => j.echec_attendu), att = L.echecs
  if ([...eu].sort().join(',') !== [...att].sort().join(',')) out.push([premier, `critères attendus en échec ${eu.join(', ')} ; le cahier de ${L.fiche} dit ${att.join(', ')}`])
  if (lot !== '01') {
    if (!p01) out.push([premier, 'preuve-01.json illisible : la référence des lots 02 à 04 ne peut pas être comparée'])
    else if (P.reference !== p01.reference) out.push([premier, `référence ${P.reference.slice(0, 12)} ≠ celle de preuve-01.json (${p01.reference.slice(0, 12)}) : les lots 02 à 04 relisent ce même sha`])
  }
  for (const [id, types] of Object.entries(L.criteres)) for (const t of types) if (!(P.criteres[id] || []).some((c) => c.type === t)) out.push([id, `preuve-${lot}.json ne déclare pas le contrôle « ${t} » que le cahier de ${L.fiche} exige pour ${id}`])
  for (const [id, t, ok, quoi] of L.exige) {
    const cs = (P.criteres[id] || []).filter((c) => c.type === t)
    if (cs.length && !cs.some((c) => { try { return ok(c) } catch { return false } })) out.push([id, `contrôle « ${t} » déclaré sans ce que le cahier de ${L.fiche} exige : ${quoi}`])
  }
  if (P.juges.some((j) => j.reel) && !tous.some((c) => c.type === 'reel-sans-secret')) out.push([premier, 'un juge est marqué « reel » sans contrôle reel-sans-secret déclaré'])
  const piege = tous.filter((c) => c.type === 'reseau-piege')
  if (piege.length > 1) out.push([premier, 'un seul contrôle reseau-piege par lot : il piège tous les passages des juges'])
  return out
}

// ── Principal : un lot ───────────────────────────────────────────────────────────────────────────────────────────────────
function refuser(m) { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
async function executerControle(c, ctx, id) {
  const T = CATALOGUE[c.type]
  const cle = `${c.type}${JSON.stringify(c)}`
  if (!ctx.autotests.has(cle)) ctx.autotests.set(cle, await T.autotest(c, ctx))
  const at = ctx.autotests.get(cle)
  if (at.defauts.length) ctx.s.echoue(id, `contrôle ${c.type} : son autotest ne tient pas (il ne sait plus distinguer le vrai du faux) — ${at.defauts.join(' ; ')}`)
  else ctx.s.passe(id, `[autotest ${c.type} : ${at.resume}]`)
  await T.verifier(c, ctx, id)
}
async function principalLot(LOT) {
  const fPreuve = path.join(FIXTURES, `preuve-${LOT}.json`)
  let P
  try { P = JSON.parse(fs.readFileSync(fPreuve, 'utf8')) } catch (e) { refuser(`${versSlash(path.relative(R, fPreuve))} illisible : ${e.message}`) }
  const forme = lireForme(P, LOT)
  if (forme.length) refuser(`preuve-${LOT}.json : ${forme.join(' ; ')}`)
  let p01 = null
  try { p01 = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'preuve-01.json'), 'utf8')) } catch { /* relevé par le plancher */ }
  const L = LOTS[LOT]
  const fiche = L.fiche // les preuves s'écrivent sous la fiche du cahier, jamais sous une autre
  const ids = trierIds([...Object.keys(L.criteres), ...Object.keys(P.criteres)])
  const s = creerRapport(NOM, ids, { entete: `${NOM} --lot=${LOT} (fiche ${fiche}) — référence ${P.reference.slice(0, 12)}` })
  const ctx = creerContexte({ P, fiche, s, juges: P.juges })
  ctx.avant = etat(fiche)
  for (const [id, m] of lirePlancher(P, LOT, p01)) s.echoue(id, `plancher : ${m}`)
  const piege = Object.values(P.criteres).flat().find((c) => c.type === 'reseau-piege')
  if (piege) ctx.piege = { permis: piege.permis, interdits: piege.interdits }
  const derniers = []
  for (const id of ids) for (const c of P.criteres[id] || []) {
    if (c.type === 'immobile') { derniers.push([id, c]); continue }
    await executerControle(c, ctx, id)
  }
  for (const [id, c] of derniers) await executerControle(c, ctx, id)

  const code = s.lignes().some((l) => l.startsWith('FAIL ')) ? 1 : 0
  const md = [`# ${fiche} — les juges du lot ${LOT} échouent sur la référence et passent en témoin`, '']
  md.push(`Écrit par \`node scripts/${NOM}.mjs --lot=${LOT}\` le ${new Date().toISOString()}. Référence : \`${P.reference}\` (extraite par \`git archive\` de ${P.archive.map((a) => `\`${a}\``).join(', ')}, sans rien écrire dans \`.git\`). Une ligne par juge : le critère attendu en échec sur la référence, l'extrait réel de la sortie (sa ligne en échec), le verdict du témoin. Les critères propres au lot sont déclarés dans \`scripts/fixtures/026-horloge-bus/preuve-${LOT}.json\` ; le plancher du cahier de ${fiche} est vérifié. Les sorties complètes sont dans \`sorties/\`.`, '')
  md.push('L\'extrait est LA ligne de rapport du critère attendu (« FAIL <id> — … »), jamais la ligne d\'un autre critère qui le cite.', '')
  md.push('| Juge | Code sur la référence | Critère attendu | Extrait réel de la sortie | Témoin | --reel, réseau coupé, clés-canaris |', '|---|---|---|---|---|---|')
  for (const j of P.juges) {
    const r = ctx.lignes.get(j.commande) || { juge: j.commande, attendu: j.echec_attendu }
    md.push(`| \`${cellule(r.juge)}\` | ${r.codeRef ?? '—'} | ${r.attendu} | ${cellule(r.extrait || '(aucune ligne « FAIL <id> — … » pour ce critère)')} | ${r.codeTemoin === undefined ? '—' : `code ${r.codeTemoin}, ${r.bilanTemoin || 'sans bilan'}`} | ${cellule(r.reel || 'non demandé')} |`)
  }
  md.push('', '## Contrôles de la preuve', '')
  for (const [id, cs] of Object.entries(P.criteres).sort(([a], [b]) => numero(a) - numero(b))) md.push(`- ${id} : ${cs.map((c) => `\`${c.type}\``).join(', ')}`)
  md.push('')
  for (const l of s.lignes()) { const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l); if (m) md.push(`- **${m[2]}** ${m[1]} — ${m[3]}`) }
  md.push('', `Verdict : **${code ? 'FAIL' : 'PASS'}**`, '')
  ecrire(path.join(R, '.orchestre', 'preuves', fiche, 'echecs-attendus.md'), md.join('\n'))
  process.exit(s.fin())
}

// ── Principal : l'autotest du catalogue ──────────────────────────────────────────────────────────────────────────────────
// Un lot 03 conforme, tel que 026-038 peut le déclarer (ses juges sont remplacés par un existant : seul le plancher est lu).
const LOT03_EXEMPLE = (p01) => ({
  lot: '03', fiche: '026-038', reference: p01.reference, absents_de_la_reference: ['lib/agents/garde.ts'], archive: ['supabase', 'lib', 'app', 'scripts'],
  juges: [
    { commande: 'node scripts/ops-sql-qa.mjs --migration=0096', echec_attendu: 'AG-1' },
    { commande: 'node scripts/ops-sql-qa.mjs --migration=0097', echec_attendu: 'AR-1' },
    { commande: 'node scripts/ops-sql-qa.mjs --migration=0098', echec_attendu: 'PA-1' },
  ],
  criteres: {
    'JP-1': [{ type: 'echec-sur-reference' }], 'JP-2': [{ type: 'temoin' }],
    'JP-3': [{ type: 'faux-postgrest', module: 'scripts/lib/faux-postgrest.mjs', fonction: 'ops_tache_creer', renommer: { p_agent: 'agent' } }],
    'JP-4': [{ type: 'reseau-piege', permis: ['127.0.0.1', 'localhost', '::1'] }], 'JP-5': [{ type: 'immobile' }],
  },
})
async function principalAutotest() {
  const types = Object.keys(CATALOGUE)
  const ids = [...types.map((t) => `AT-${t}`), 'AT-plancher', 'AT-piege-juges', 'AT-immobile-reel']
  const s = creerRapport(`${NOM} --autotest`, ids, { entete: `${NOM} --autotest — chaque contrôle sur ses témoins et ses sabotages` })
  const avant = etat('026-009')
  // Des paramètres représentatifs pour les contrôles qui en prennent : ceux du plancher des lots 01, 03 et 04.
  const exemples = {
    'bloc-essai': { type: 'bloc-essai', cas: [{ commande: 'node scripts/ops-sql-qa.mjs --migration=0096', jumeaux: ['0096'] }] },
    reutilise: { type: 'reutilise', fichiers: ['scripts/lib/sql-essai.mjs'], module: '../sql-nu.mjs', noms: ['sansCommentaires', 'MARQUE_CONTROLE'], appeles: ['sansCommentaires'] },
    'compte-rendu': { type: 'compte-rendu', scenario: 'scripts/fixtures/026-horloge-bus/essais/0096.sql' },
    'contrat-fiches': { type: 'contrat-fiches', contrat: 'scripts/fixtures/026-horloge-bus/contrat-ops.json', migrations: ['0096', '0097', '0098'] },
    'faux-postgrest': { type: 'faux-postgrest', module: 'scripts/fixtures/026-horloge-bus/temoins/faux-postgrest.mjs', fonction: 'ops_tache_creer', renommer: { p_agent: 'agent' } },
    'reseau-piege': { type: 'reseau-piege', permis: ['127.0.0.1'] },
    'horloge-simulee': { type: 'horloge-simulee', module: 'scripts/fixtures/026-horloge-bus/temoins/horloge-simulee.mjs', cas: [{ figer: '2026-10-24T05:30:00Z', paris: '07:30' }, { figer: '2026-10-25T06:30:00Z', paris: '07:30' }], avancer_ms: 300000 },
    motifs: { type: 'motifs', chemins: ['scripts/fixtures/026-horloge-bus/essais/0096.sql'], absents: ['boite_'] },
  }
  for (const t of types) {
    const c = exemples[t] || { type: t }
    const v = CATALOGUE[t].valider(c)
    if (v) { s.echoue(`AT-${t}`, `paramètres d'exemple refusés : ${v}`); continue }
    const at = await CATALOGUE[t].autotest(c, {})
    if (at.defauts.length) s.echoue(`AT-${t}`, at.defauts.join(' ; '))
    else s.passe(`AT-${t}`, at.resume)
  }
  // Le plancher : preuve-01.json réel et un lot 03 conforme passent ; chaque affaiblissement est pris.
  {
    const p01 = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'preuve-01.json'), 'utf8'))
    const d = [], pris = []
    const f01 = lireForme(structuredClone(p01), '01')
    if (f01.length) d.push(`preuve-01.json mal formé : ${f01.join(' ; ')}`)
    else if (lirePlancher(p01, '01', p01).length) d.push(`preuve-01.json refusé par son plancher : ${lirePlancher(p01, '01', p01).map((x) => x.join(' ')).join(' ; ')}`)
    const ex = LOT03_EXEMPLE(p01)
    const fEx = lireForme(structuredClone(ex), '03')
    if (fEx.length) d.push(`lot 03 d'exemple mal formé : ${fEx.join(' ; ')}`)
    else if (lirePlancher(ex, '03', p01).length) d.push(`lot 03 d'exemple refusé : ${lirePlancher(ex, '03', p01).map((x) => x.join(' ')).join(' ; ')}`)
    const affaiblis = [
      ['JP-3 ôté du lot 03', '03', (x) => { delete x.criteres['JP-3']; x.criteres['JP-3'] = x.criteres['JP-4']; x.criteres['JP-4'] = x.criteres['JP-5']; delete x.criteres['JP-5'] }],
      ['faux-postgrest sur une autre fonction', '03', (x) => { x.criteres['JP-3'][0].fonction = 'ops_tache_prendre' }],
      ['faux-postgrest sans renommer p_agent', '03', (x) => { x.criteres['JP-3'][0].renommer = { p_type: 'type' } }],
      ['réseau ouvert à tous', '03', (x) => { x.criteres['JP-4'][0].permis = ['127.0.0.1', 'exemple.fr'] }],
      ['critère attendu changé', '03', (x) => { x.juges[2].echec_attendu = 'PA-2' }],
      ['autre référence', '03', (x) => { x.reference = 'f'.repeat(40) }],
      ['autre fiche', '03', (x) => { x.fiche = '026-009' }],
      ['reel-sans-secret ôté du lot 01', '01', (x) => { x.criteres['JP-2'] = x.criteres['JP-2'].filter((c) => c.type !== 'reel-sans-secret') }],
      ['bloc-essai du lot 01 sans 0098', '01', (x) => { const c = x.criteres['JP-3'].find((k) => k.type === 'bloc-essai'); c.cas = c.cas.filter((k) => k.jumeaux.at(-1) !== '0098') }],
    ]
    for (const [quoi, lot, f] of affaiblis) {
      const x = structuredClone(lot === '01' ? p01 : ex)
      f(x)
      const forme = lireForme(x, lot)
      const plancher = forme.length ? [] : lirePlancher(x, lot, p01)
      if (!forme.length && !plancher.length) d.push(`${quoi} : accepté`)
      else pris.push(`${quoi} (${forme.length ? 'forme' : plancher[0][0]})`)
    }
    if (d.length) s.echoue('AT-plancher', d.join(' ; '))
    else s.passe('AT-plancher', `preuve-01.json et un lot 03 conforme acceptés ; affaiblissements pris : ${pris.join(', ')}`)
  }
  // Le piège réseau sur des juges : un juge sage passe, un juge qui appelle un hôte refusé est pris (par le chemin du lot).
  {
    const dossier = path.join(TRAVAIL, 'autotest')
    vider(dossier)
    const juge = (nom, corps) => { ecrire(path.join(dossier, `${nom}.mjs`), `${corps}\nconsole.log('PASS ZZ-1 — ${nom}')\nconsole.log('${nom} : PASS')\n`); return versSlash(path.relative(R, path.join(dossier, `${nom}.mjs`))) }
    const sage = juge('juge-sage', "try { await fetch('http://127.0.0.1:9/x') } catch {}")
    const bavard = juge('juge-bavard', "try { await fetch('http://piege-026.invalid/x') } catch {}")
    const d = []
    for (const [nom, rel, attendu] of [['sage', sage, true], ['bavard', bavard, false]]) {
      const sx = creerRapport('essai', ['ZZ'])
      const cx = creerContexte({ P: { reference: '0'.repeat(40), archive: [] }, fiche: '026-009', s: sx, juges: [{ commande: `node ${rel}`, echec_attendu: 'ZZ-1' }], reference: { dest: dossier, fichiers: 0, presents: [], absents: [] } })
      cx.journal = () => {}
      cx.piege = { permis: ['127.0.0.1', 'localhost', '::1'] }
      await CATALOGUE['reseau-piege'].verifier(cx.piege, cx, 'ZZ')
      const vert = !sx.enEchec('ZZ')
      if (vert !== attendu) d.push(`juge ${nom} : ${vert ? 'accepté' : `refusé (${sx.lignes()[0]})`}`)
    }
    if (d.length) s.echoue('AT-piege-juges', d.join(' ; '))
    else s.passe('AT-piege-juges', 'par le chemin des lots (NODE_OPTIONS, deux passages) : le juge sage passe, le juge qui appelle piege-026.invalid est pris')
  }
  const apres = etat('026-009')
  const dif = differences(avant, apres)
  if (dif.length) s.echoue('AT-immobile-reel', `${dif.length} changement(s) hors .orchestre/travail/ et .orchestre/preuves/ : ${dif.slice(0, 5).join(', ')}`)
  else s.passe('AT-immobile-reel', `rien n'a bougé hors .orchestre/travail/ et .orchestre/preuves/ (${avant.empreintes?.size ?? 0} fichier(s) suivis par empreinte)`)
  const md = ['# 026-009 — autotest du catalogue de la preuve horloge-bus', '',
    `Écrit par \`node scripts/${NOM}.mjs --autotest\` le ${new Date().toISOString()}. Chaque contrôle que \`preuve-NN.json\` peut déclarer est éprouvé sur ses témoins (\`scripts/fixtures/026-horloge-bus/temoins/\`) et ses sabotages : il doit accepter le témoin et prendre chaque sabotage. Le plancher des cahiers est éprouvé sur des \`preuve-NN.json\` affaiblis.`, '']
  for (const l of s.lignes()) { const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l); if (m) md.push(`- **${m[2]}** ${m[1]} — ${m[3]}`) }
  md.push('', '## Un lot 03 conforme (026-038 peut le déclarer ainsi)', '', '```json', JSON.stringify({ ...LOT03_EXEMPLE({ reference: '<la référence de preuve-01.json>' }), juges: '<agents-garde-qa AG-1, agents-routes-qa AR-1, pause-qa PA-1>' }, null, 2), '```', '')
  ecrire(path.join(R, '.orchestre', 'preuves', '026-009', 'controles-autotest.md'), md.join('\n'))
  process.exit(s.fin())
}

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--autotest') await principalAutotest()
else {
  const lotArg = args.find((a) => a.startsWith('--lot='))
  if (!lotArg || args.length !== 1) refuser('usage : --lot=01|02|03|04 ou --autotest (seule option)')
  const LOT = lotArg.slice(6)
  if (!LOTS[LOT]) refuser(`--lot=${LOT} : 01, 02, 03 ou 04 attendu`)
  await principalLot(LOT)
}
