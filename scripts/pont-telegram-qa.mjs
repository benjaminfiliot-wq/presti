#!/usr/bin/env node
// scripts/pont-telegram-qa.mjs — le juge du pont Telegram (fiche 026-194, écrit par Claude Code AVANT la production 026-195).
//
//   node scripts/pont-telegram-qa.mjs [--racine=<dossier>] [--partie=routes,usine] [--temoin] [--reel] [--preuve-echecs]
//
//   --partie=routes  PT-1 à PT-7 : lib/agents/telegram.ts et les deux routes, exécutées dans un processus enfant (ts-loader) sur
//                    des doublures et un faux PostgREST (scripts/fixtures/026-transverse/parties/routes.mjs) ;
//   --partie=usine   PT-8 à PT-17 (PT-16 et PT-17 : correction du 27/09, un seul envoi et jeton absent du conteneur d'OpenClaw) : le service scripts/usine/telegram.mjs lancé contre un FAUX Telegram et un FAUX Presti sur 127.0.0.1
//                    (parties/usine.mjs), l'unité systemd (PT-13) et le document (PT-14, ci-dessous) ;
//   --temoin         non-régression seulement tant que 026-195 n'est pas dans fait/ (package.json et lock identiques à HEAD,
//                    typecheck vert) ; une fois livrée, le juge tourne pour de vrai ;
//   --reel           PT-R (026-196) : l'usine et la production, en lecture ; jamais de /pause en production ;
//   --preuve-echecs  sur un arbre témoin VIDE (aucun fichier du pont ; l'arbre courant les contient depuis 026-195) : code ≠ 0 avec PT-1 en
//                    échec en premier, puis --temoin en code 0 ; écrit sa section d'echecs-attendus.md (026-194).
// Sortie : `PASS|FAIL|SAUTE <critère> — …`, puis « pont-telegram-qa : PASS|FAIL — … ». Code 0 (tout vert), 1 (un critère en échec),
// 2 (appel invalide, préalable manquant). N'écrit que sous .orchestre/travail/ et .orchestre/preuves/026-194/ ; aucun réseau hors
// 127.0.0.1 sans --reel ; aucun jeton réel (les jetons sont tirés au hasard à chaque passage).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { creerRapport } from './lib/sql-essai.mjs'
import { R, TRAVAIL, existe, lire, lireSi, court, lireOptions, analyserIni, lancer, ficheLivree, ecrireSectionEchecs, nonRegression } from './fixtures/026-transverse/commun.mjs'

const NOM = 'pont-telegram-qa'
const CE = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), ['racine', 'partie', 'temoin', 'reel', 'preuve-echecs'])
const refuser = (m) => { console.log(`${NOM} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length) refuser(`option(s) inconnue(s) : ${o.inconnues.join(' ')}`)
const PARTIES = (o.valeurs.partie ?? 'routes,usine').split(',').map((x) => x.trim()).filter(Boolean)
for (const p of PARTIES) if (!['routes', 'usine'].includes(p)) refuser(`--partie=routes|usine attendu, reçu « ${p} »`)
const RACINE = o.valeurs.racine ? path.resolve(o.valeurs.racine) : R
if (!fs.existsSync(RACINE) || !fs.statSync(RACINE).isDirectory()) refuser(`--racine : ${RACINE} n'est pas un dossier`)

const FICHIERS = ['lib/agents/telegram.ts', 'app/api/agents/telegram/sortie/route.ts', 'app/api/agents/telegram/entree/route.ts', 'scripts/usine/telegram.mjs', 'scripts/usine/systemd/presti-telegram.service', 'docs/agents/telegram.md']
const IDS_ROUTES = ['PT-2', 'PT-3', 'PT-4', 'PT-5', 'PT-6', 'PT-7']
const IDS_USINE = ['PT-8', 'PT-9', 'PT-10', 'PT-11', 'PT-12', 'PT-13', 'PT-14', 'PT-15', 'PT-16', 'PT-17']
const ids = ['PT-1', ...(PARTIES.includes('routes') ? IDS_ROUTES : []), ...(PARTIES.includes('usine') ? IDS_USINE : []), ...(o.drapeaux.has('reel') ? ['PT-R'] : [])]

// ── PT-1 : les six fichiers, non vides ───────────────────────────────────────────────────────────────────────────────
function pt1(s) {
  const e = []
  for (const f of FICHIERS) {
    const p = path.join(RACINE, f)
    if (!existe(p)) e.push(`${f} absent`)
    else if (fs.statSync(p).size === 0) e.push(`${f} : 0 octet`)
  }
  if (e.length) s.echoue('PT-1', e.join(' ; '))
  else s.passe('PT-1', `les six fichiers du pont existent et ne sont pas vides`)
}

// ── PT-13 : l'unité systemd, par un analyseur INI ───────────────────────────────────────────────────────────────────
const EXEC_ATTENDU = '/usr/bin/node scripts/usine/avec-coffre.mjs TELEGRAM_BOT_TOKEN PRESTI_JETON_TELEGRAM TELEGRAM_CHAT_ID TELEGRAM_CODE_APPAIRAGE -- /usr/bin/node scripts/usine/telegram.mjs --service --base=https://prestiapp.fr'
function tailleMemoire(v) { const m = /^(\d+(?:\.\d+)?)\s*([KMGT]?)$/i.exec(String(v).trim()); if (!m) return NaN; return Number(m[1]) * ({ '': 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 })[m[2].toUpperCase()] }
function pt13(s) {
  const texte = lireSi(path.join(RACINE, 'scripts/usine/systemd/presti-telegram.service'))
  if (texte === null) { s.echoue('PT-13', 'scripts/usine/systemd/presti-telegram.service absent'); return }
  const u = analyserIni(texte), e = [...u.erreurs.map((x) => `INI : ${x}`)]
  const un = (cle) => u.valeurs('Service', cle)
  if (un('User').join() !== 'agents') e.push(`User=${un('User').join() || '(absent)'} : agents attendu`)
  if (un('Restart').join() !== 'always') e.push(`Restart=${un('Restart').join() || '(absent)'} : always attendu`)
  const rs = Number(String(un('RestartSec')[0] ?? '').replace(/s$/, ''))
  if (!(rs >= 30)) e.push(`RestartSec=${un('RestartSec').join() || '(absent)'} : 30 s au moins attendu`)
  const mm = tailleMemoire(un('MemoryMax')[0])
  if (!(mm <= 256 * 1024 ** 2)) e.push(`MemoryMax=${un('MemoryMax').join() || '(absent)'} : 256M au plus attendu`)
  if (Object.values(u.sections).flat().some(([k]) => k === 'EnvironmentFile')) e.push('EnvironmentFile= présent : aucun attendu (les secrets viennent du coffre)')
  const ex = un('ExecStart')
  if (ex.length !== 1 || ex[0] !== EXEC_ATTENDU) e.push(`ExecStart : « ${court(ex.join(' | ') || '(absent)', 120)} », exactement « ${court(EXEC_ATTENDU, 60)}… » attendu`)
  if (/(TELEGRAM_BOT_TOKEN|PRESTI_JETON_TELEGRAM)=/.test(texte) || /\d{6,12}:[A-Za-z0-9_-]{30,}/.test(texte)) e.push('une valeur de jeton semble écrite dans l’unité')
  if (e.length) s.echoue('PT-13', e.join(' ; ')); else s.passe('PT-13', 'User=agents, Restart=always, RestartSec ≥ 30, MemoryMax ≤ 256M, aucun EnvironmentFile, ExecStart exact avec les quatre valeurs du coffre')
}

// ── PT-14 : le document ─────────────────────────────────────────────────────────────────────────────────────────────
function pt14(s) {
  const t = lireSi(path.join(RACINE, 'docs/agents/telegram.md'))
  if (t === null) { s.echoue('PT-14', 'docs/agents/telegram.md absent'); return }
  const e = [], b = t.toLowerCase()
  for (const c of ['/pause', '/etat', '/chef']) if (!t.includes(c)) e.push(`commande ${c} non documentée`)
  if (!/ne l[eè]ve jamais la pause|ne peut jamais (la )?lever|jamais.{0,40}(lever|reprise)|reprise se fait [àa] la station/.test(b)) e.push('« ne lève jamais la pause » absent')
  if (!/aucune donn[ée]e de prospect/.test(b)) e.push('« aucune donnée de prospect » absent')
  if (!/(cr[ée]er le bot|botfather)/.test(b) || !/(terminal)/.test(b) || !/\/start/.test(t)) e.push('gestes de Benj incomplets (créer le bot, déposer les jetons dans son terminal, /start)')
  if (/\d{6,12}:[A-Za-z0-9_-]{30,}|\beyJ[A-Za-z0-9_-]{10,}|\bsk-[A-Za-z0-9_-]{10,}/.test(t)) e.push('une chaîne au format d’un jeton figure dans le document')
  if (e.length) s.echoue('PT-14', e.join(' ; ')); else s.passe('PT-14', 'trois commandes, « ne lève jamais la pause », « aucune donnée de prospect », gestes de Benj, aucune valeur de jeton')
}

// ── --reel (026-196) ────────────────────────────────────────────────────────────────────────────────────────────────
async function ptR(s) {
  const cle = path.join(process.env.HOME ?? '', '.ssh', 'presti-usine')
  if (!existe(cle)) { s.echoue('PT-R', 'préalable : ~/.ssh/presti-usine absent (poste seulement)'); return }
  const hote = process.env.PRESTI_USINE ?? 'usine@88.96.53.3'
  const e = []
  const a = lancer('ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', hote, 'systemctl is-active presti-telegram'], { timeout: 30_000 })
  if (a.stdout.trim() !== 'active') e.push(`systemctl is-active presti-telegram : « ${court(a.stdout || a.stderr || a.erreur, 60)} », active attendu`)
  try { const r = await fetch('https://prestiapp.fr/api/agents/telegram/sortie'); if (r.status !== 401) e.push(`GET sortie sans jeton : ${r.status}, 401 attendu`) } catch (x) { e.push(`GET sortie injoignable : ${court(x.message, 80)}`) }
  const preuve = lireSi(path.join(RACINE, '.orchestre/preuves/026-196/telephone.md')) ?? ''
  if (!/\/etat[\s\S]{0,200}re[cç]ue/i.test(preuve)) e.push('réponse à /etat « reçue » (dite par Benj, datée) absente de .orchestre/preuves/026-196/telephone.md')
  if (!/digest/i.test(preuve)) e.push('alerte d’essai « digest » non notée dans .orchestre/preuves/026-196/telephone.md')
  if (/\/pause\s+\S+[\s\S]{0,80}production/i.test(preuve)) e.push('un /pause en production est noté : jamais')
  if (e.length) s.echoue('PT-R', e.join(' ; ')); else s.passe('PT-R', 'service actif, sortie protégée (401), /etat et alerte digest constatés par Benj, aucun /pause en production')
}

// ── Le jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger() {
  const s = creerRapport(NOM, ids, { entete: `${NOM} (fiche 026-194) — racine ${RACINE}${o.drapeaux.has('temoin') ? ' — témoin' : ''}` })
  const fabrication = o.drapeaux.has('temoin') && !ficheLivree('026-195')
  if (fabrication) {
    for (const id of ids) if (id !== 'PT-R') s.saute(id, 'témoin : critère de fabrication, sauté tant que 026-195 n’est pas dans fait/ (sa propre PASS le prouvera)')
    const n = nonRegression({ racine: RACINE })
    s.note(n.ok ? 'non-régression : package.json et package-lock.json identiques à HEAD, npm run typecheck vert' : `non-régression en échec : ${n.echecs.join(' ; ')}`)
    if (!n.ok) s.echoue('PT-1', `non-régression : ${n.echecs.join(' ; ')}`)
    return s.fin()
  }
  pt1(s)
  const fichiersOk = !s.enEchec('PT-1')
  const dependant = (liste, raison) => { for (const id of liste) s.echoue(id, raison) }
  if (PARTIES.includes('routes')) {
    if (!fichiersOk) dependant(IDS_ROUTES, 'non jugé : PT-1 en échec (fichiers du pont absents)')
    else { const m = await import(pathToFileURL(path.join(R, 'scripts/fixtures/026-transverse/parties/routes.mjs')).href); await m.jouer({ racine: RACINE, s, R, travail: path.join(TRAVAIL, NOM) }) }
  }
  if (PARTIES.includes('usine')) {
    if (!fichiersOk) dependant(IDS_USINE, 'non jugé : PT-1 en échec (fichiers du pont absents)')
    else {
      const m = await import(pathToFileURL(path.join(R, 'scripts/fixtures/026-transverse/parties/usine.mjs')).href)
      await m.jouer({ racine: RACINE, s, R, travail: path.join(TRAVAIL, NOM) })
      pt13(s); pt14(s)
    }
  }
  if (o.drapeaux.has('reel')) await ptR(s)
  return s.fin()
}

// ── --preuve-echecs ─────────────────────────────────────────────────────────────────────────────────────────────────
function preuveEchecs() {
  const sortie = (a) => { const r = lancer(process.execPath, [CE, ...a], { timeout: 900_000 }); return { ...r, texte: `${r.stdout}${r.stderr}` } }
  // L'arbre de référence des échecs est un arbre TÉMOIN VIDE (aucun fichier du pont), pas l'arbre courant : écrite avant 026-195, la preuve
  // jugeait l'arbre courant tant qu'il n'avait pas le pont ; depuis que 026-195 l'a livré, l'arbre courant LE CONTIENT et le juge y passe
  // PT-1 — comme il doit. Le juge est le même, l'attente est la même (code 1, « FAIL PT-1 » en premier) ; seule la source ne dépend plus de
  // l'avancement de la production. Le dossier est un frère de TRAVAIL/<juge> (que le juge efface à chaque passage).
  const vide = path.join(TRAVAIL, `${NOM}-arbre-vide`)
  fs.rmSync(vide, { recursive: true, force: true }); fs.mkdirSync(vide, { recursive: true })
  const ref = sortie(['--racine=' + vide])
  const premiere = ref.texte.split('\n').find((l) => /^(PASS|FAIL|SAUTE) PT-/.test(l)) ?? ''
  const e = []
  if (ref.code !== 1) e.push(`arbre témoin vide : code ${ref.code}, 1 attendu`)
  if (!premiere.startsWith('FAIL PT-1 ')) e.push(`arbre témoin vide : première ligne « ${court(premiere, 100)} », « FAIL PT-1 … » attendu`)
  const t = sortie(['--temoin'])
  if (t.code !== 0) e.push(`--temoin : code ${t.code} — ${court(t.texte.split('\n').filter((l) => /^FAIL|non-régression/.test(l)).join(' ; '), 200)}`)
  const lignes = ['## pont-telegram-qa', '', `Écrit par \`node scripts/pont-telegram-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}.`, '',
    '| Passage | Code | Extrait réel de la sortie |', '|---|---|---|',
    `| arbre témoin vide (aucun fichier du pont) | ${ref.code} | ${premiere.replace(/\|/g, '\\|')} |`,
    `| \`--temoin\` (non-régression) | ${t.code} | ${(t.texte.split('\n').find((l) => /^pont-telegram-qa : /.test(l)) ?? '').replace(/\|/g, '\\|')} |`]
  const f = ecrireSectionEchecs('pont-telegram-qa', lignes)
  for (const l of [premiere, ...t.texte.split('\n').filter((x) => /^pont-telegram-qa : /.test(x))]) if (l && !lire(f).includes(l.replace(/\|/g, '\\|'))) e.push(`l’extrait « ${court(l, 60)} » n’a pas été retrouvé dans ${path.relative(R, f)}`)
  console.log(`${NOM} --preuve-echecs`)
  console.log(`${e.length ? 'FAIL' : 'PASS'} PE-1 — ${e.length ? e.join(' ; ') : `arbre témoin vide : code ${ref.code}, « ${premiere} » ; --temoin : code ${t.code} ; section écrite dans ${path.relative(R, f)}`}`)
  console.log(`${NOM} --preuve-echecs : ${e.length ? 'FAIL — PE-1' : 'PASS'}`)
  return e.length ? 1 : 0
}
process.exitCode = o.drapeaux.has('preuve-echecs') ? preuveEchecs() : await juger()
