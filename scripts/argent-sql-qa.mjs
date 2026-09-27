#!/usr/bin/env node
// scripts/argent-sql-qa.mjs — le juge SQL de la migration 0100 (la file durable de l'argent, Supabase Queues / pgmq, fiche
// 026-036) ; écrit par Claude Code (fiche 026-032) AVANT la migration qu'il juge, que son exécutant ne peut pas modifier.
//
// Sans connexion directe à la base (refusée depuis le 14/09), il juge en trois temps : la lecture statique de la migration, de
// ses jumeaux et de son contrôle contre scripts/fixtures/026-horloge-bus/contrat-ops.json (la table ops.argent_messages et les
// cinq fonctions ops_argent_*) ; l'essai à sec qu'il génère (--generer-essai) et dont il relit le compte rendu
// (.orchestre/preuves/026-036/essai-a-sec.txt, scénario scripts/fixtures/026-horloge-bus/essais/0100.sql) ; --reel après
// l'application par Claude Code.
//
// Critères (cahier FA de 026-036) : FA-1 fichier, liste permise et ordre · FA-2 table et fonctions du contrat · FA-3 sécurité ·
// FA-4 lecture des corps · FA-5 jumeaux et contrôle · FA-6 essai à sec · FA-7 non-régression (0088 inchangée) · FA-8 --reel.
//
// Usage :
//   node scripts/argent-sql-qa.mjs [--racine=<dossier>] [--sans-essai]
//   node scripts/argent-sql-qa.mjs --temoin                     les seuls critères de non-régression (FA-7, part de FA-6)
//   node scripts/argent-sql-qa.mjs --generer-essai [--avec=0096,0097,0098,0099] [--racine=<dossier>]
//   node scripts/argent-sql-qa.mjs --reel                       PostgREST, clé essai_e2e:<aléa>, ménage dans un finally
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide ou préalable manquant. N'écrit que sous .orchestre/travail/argent-sql-qa/.
// N'affiche aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  R, MARQUE_CONTROLE, instructions, normaliser, codeSeul, seParse, segments, masquer, fermante, decouperVirgules, compacter,
  serrer, jumeauNuCoupe, empreinte, blocEssai, analyserEssai, clesScenario, lireCompteRendu, nonRegression, creerRapport,
  lireEnvLocal, dossierTravail, court, lf, JUMEAU_EXEMPLE,
} from './lib/sql-essai.mjs'
import { lireOptionsOuQuitter } from './fixtures/025/commun.mjs'

const NOM = 'argent-sql-qa'
const NUM = '0100'
const CONTRAT_F = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const CONTRAT = JSON.parse(fs.readFileSync(path.join(R, CONTRAT_F), 'utf8'))
const M = {
  fiche: '026-036',
  fichier: 'supabase/migrations/0100_ops_file_argent.sql',
  jumeau: 'supabase/migrations/_A_COLLER_sql_editor_0100.sql',
  nu: 'supabase/migrations/_A_COLLER_sql_editor_0100_NU.sql',
  controle: 'supabase/controles/0100_ops_file_argent.sql',
  essai_a_sec: '.orchestre/preuves/026-036/essai-a-sec.txt',
  scenario: 'scripts/fixtures/026-horloge-bus/essais/0100.sql',
  apres: "select to_regclass('ops.argent_messages') is null as rien_ne_reste",
  commande: 'supabase/migrations/0088_site_commande.sql',
}
const AVANT = ['0096', '0097', '0098', '0099']
const IDS = { fichier: 'FA-1', contrat: 'FA-2', securite: 'FA-3', corps: 'FA-4', jumeaux: 'FA-5', essai: 'FA-6', nr: 'FA-7', reel: 'FA-8' }
const ROLES_FERMES = ['public', 'anon', 'authenticated', 'service_role']
const TABLE = CONTRAT.tables.argent_messages
const FONCTIONS = Object.entries(CONTRAT.fonctions).filter(([, f]) => f.migration === NUM)
const CLES_FA6 = [
  'envoyer_rend_un_msg_id', 'msg_id_note', 'second_envoi_rend_null', 'un_seul_message_en_file',
  'lire_30s_rend_le_message', 'lire_30s_lectures_1', 'relu_aussitot_rien',
  'set_vt_0_relu_meme_msg_id', 'relu_lectures_2',
  'fait_rend_true', 'fait_le_pose', 'fait_second_rend_false', 'fait_plus_en_file',
  'trois_lectures_rendues', 'quatrieme_lecture_non_rendue', 'quatrieme_lecture_archive', 'abandonne_le_pose', 'evenement_argent_abandonne',
  'type_inconnu_type_argent', 'vt_2s_refuse', 'vt_3601_refuse', 'n_zero_lit_un_message',
  'etat_cinq_cles', 'essai_effacer_efface',
  'anon_refuse_cinq_fonctions', 'authenticated_refuse_cinq_fonctions', 'anon_refuse_pgmq', 'authenticated_refuse_pgmq',
  'anon_sans_usage_pgmq', 'authenticated_sans_usage_pgmq',
]

// ── Options ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['generer-essai', 'avec', 'sans-essai'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
const GENERER = o.drapeau('generer-essai'), SANS_ESSAI = o.drapeau('sans-essai'), AVEC = o.liste('avec')
if (o.valeur('generer-essai') !== undefined || o.valeur('sans-essai') !== undefined) refuser('--generer-essai et --sans-essai ne prennent pas de valeur')
if (o.drapeau('avec')) refuser('--avec= attend une valeur')
if (GENERER && (o.temoin || o.reel || SANS_ESSAI)) refuser('--generer-essai se lance sans --temoin, --reel ni --sans-essai')
if (AVEC.length && !GENERER) refuser('--avec= ne sert qu\'avec --generer-essai')
if (SANS_ESSAI && (o.temoin || o.reel)) refuser('--sans-essai ne se combine ni avec --temoin ni avec --reel')
for (const a of AVEC) if (!AVANT.includes(a)) refuser(`--avec=${a} : ${AVANT.join(', ')} attendues (les migrations d'avant ${NUM})`)
if (new Set(AVEC).size !== AVEC.length) refuser('--avec= : une migration en double')
if (CONTRAT.migrations?.[NUM]?.fiche !== M.fiche || !TABLE || FONCTIONS.length !== 5) refuser(`${CONTRAT_F} ne donne plus ${NUM} (table et 5 fonctions) à ${M.fiche} : le juge doit être relu`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const listeTxt = (a, n = 6) => `${a.slice(0, n).join(', ')}${a.length > n ? ` (et ${a.length - n} autre(s))` : ''}`
const nuDe = (n) => CONTRAT.migrations[n]?.nu || `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`

// ── Lecture des fonctions et des tables ──────────────────────────────────────────────────────────────────────────────
const SYN = { int: 'integer', int4: 'integer', integer: 'integer', int8: 'bigint', bigint: 'bigint', bool: 'boolean', boolean: 'boolean',
  timestamptz: 'timestamptz', text: 'text', uuid: 'uuid', jsonb: 'jsonb', numeric: 'numeric', void: 'void', trigger: 'trigger' }
function typeCanon(t) {
  const x = String(t).toLowerCase().replace(/\s+/g, '')
  if (x === 'timestampwithtimezone') return 'timestamptz'
  const m = /^([a-z_][a-z0-9_.]*)(\(.*\))?(\[\])?$/.exec(x)
  return m ? `${SYN[m[1]] || m[1]}${m[2] || ''}${m[3] || ''}` : x
}
const typeEnTete = (def) => (/^(timestamp with time zone|double precision|[a-z_][a-z0-9_.]*(?:\(\d+(?:, ?\d+)?\))?(?:\[\])?)/.exec(def.trim()) || [''])[0]
function parserParam(p) {
  const n = normaliser(p).replace(/^(in|out|inout|variadic) /, '').split(/ default | = /)[0]
  const nom = n.split(' ')[0].replace(/"/g, '')
  return [nom, typeCanon(typeEnTete(n.slice(nom.length + 1)))]
}
/** « table(a t, …) » ou un type, sous une forme canonique comparable. */
function rendCanon(t) {
  const n = normaliser(t).trim()
  if (/^table\(/.test(n)) return `table(${decouperVirgules(n.slice(6, fermante(n, 5))).map((x) => { const [a, ...b] = x.split(' '); return `${a} ${typeCanon(typeEnTete(b.join(' ')))}` }).join(', ')})`
  return typeCanon(n)
}
function parserFonction(ins) {
  const m = /^create (or replace )?function ([a-z_]+)\.([a-z0-9_]+)\(/.exec(ins.n)
  if (!m) return null
  const t = ins.t, mm = masquer(t)
  const i = mm.indexOf('('), j = fermante(mm, i)
  const base = { schema: m[2], nom: m[3], cle: m[2] === 'public' ? m[3] : `${m[2]}.${m[3]}` }
  if (j < 0) return { ...base, erreur: 'paramètres non refermés' }
  const params = decouperVirgules(t.slice(i + 1, j)).filter(Boolean).map(parserParam)
  let pos = 0, corps = null, d0 = -1, d1 = -1
  for (const s of segments(t)) {
    if (s.type === 'dollar' && pos > j && corps === null) { corps = s.corps; d0 = pos; d1 = pos + s.texte.length }
    pos += s.texte.length
  }
  if (corps === null) return { ...base, params, erreur: 'corps $…$ introuvable' }
  const entete = normaliser(`${t.slice(j + 1, d0)}$$${t.slice(d1)}`)
  const r = / ?returns (.*)$/.exec(entete)
  let rend = null
  if (r) rend = /^table\(/.test(r[1]) ? rendCanon(r[1].slice(0, fermante(r[1], 5) + 1)) : rendCanon(r[1].split(/ (?:language|as|security|set|stable|immutable|volatile|strict|leakproof|parallel|cost|rows|called)\b/)[0])
  const sp = /set search_path (?:=|to) ([^ ,]+(?:, [^ ,]+)*)/.exec(entete)
  return { ...base, params, rend, corps, entete, definer: /\bsecurity definer\b/.test(entete), searchPath: sp ? sp[1].split(', ').map((x) => x.replace(/^['"]|['"]$/g, '')) : null }
}
/** create table ops.argent_messages ( … ) → { colonnes: Map(nom → { n, c }), contraintes: [normalisées], c, sr }. */
function parserTable(t) {
  const m = masquer(t)
  const i = m.indexOf('('), j = i < 0 ? -1 : fermante(m, i)
  if (j < 0) return null
  const colonnes = new Map(), contraintes = []
  for (const it of decouperVirgules(t.slice(i + 1, j))) {
    const n = normaliser(it)
    if (/^(constraint|check|unique|primary key|foreign key|exclude)\b/.test(n)) { contraintes.push(n); continue }
    const nom = n.split(' ')[0].replace(/"/g, '')
    colonnes.set(nom, { n: n.slice(nom.length + 1), c: compacter(it.slice(it.indexOf(nom) + nom.length)) })
  }
  return { colonnes, contraintes, c: compacter(t), sr: serrer(t) }
}
/** La définition d'une colonne sans ses check(…) : un « is not null » de contrainte n'est pas un « not null » de colonne. */
function horsCheck(n) {
  let out = n
  for (let g = 0; g < 20; g++) { const i = out.search(/\bcheck ?\(/); if (i < 0) break; const a = out.indexOf('(', i), k = fermante(masquer(out), a); if (k < 0) break; out = out.slice(0, i) + out.slice(k + 1) }
  return out
}
const sansCast = (v) => v.replace(/::[a-z_]+(\[\])?(\(\d+(,\d+)?\))?/g, '')
function defautDe(c) {
  const i = c.indexOf('default')
  if (i < 0) return null
  const reste = c.slice(i + 7)
  const m = /notnull|null|check\(|references|primarykey|unique|constraint|generated|$/.exec(reste)
  return sansCast(reste.slice(0, m.index)).replace(/^\((.*)\)$/, '$1')
}
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) }))
function rolesApres(n, mot) {
  const i = n.lastIndexOf(` ${mot} `)
  if (i < 0) return []
  return n.slice(i + mot.length + 2).split(',').map((x) => x.trim().replace(/\s+(cascade|restrict)$/, '').replace(/"/g, '')).filter(Boolean)
}
/** Une règle de contrainte du contrat (longueur, liste, taille_json) retrouvée dans la table (formes compacte et serrée). */
function regleOk(regle, c, sr) {
  if (regle.longueur) {
    const [col, a, b] = regle.longueur
    return ['char_length', 'length'].some((f) => { const E = `${f}(${col})`; return c.includes(`${E}between${a}and${b}`) || (c.includes(`${E}>=${a}`) && new RegExp(`${E.replace(/[()]/g, '\\$&')}<=${b}(?!\\d)`).test(c)) })
  }
  if (regle.liste) {
    const [col, vals] = regle.liste
    return [...sr.matchAll(new RegExp(`(?<![\\w.])${col} in\\(([^)]*)\\)`, 'g'))].some((m) => m[1].split(',').map((v) => v.trim().replace(/^'|'$/g, '')).sort().join(',') === [...vals].sort().join(','))
  }
  if (regle.taille_json) { const [col, n] = regle.taille_json; return new RegExp(`(pg_column_size\\(${col}\\)|octet_length\\(${col}::text\\))<=${n}(?!\\d)`).test(c) }
  throw new Error(`règle inconnue : ${JSON.stringify(regle)}`)
}

// ── Les critères communs ────────────────────────────────────────────────────────────────────────────────────────────────
const lancerNode = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 64 << 20 })
function jugerJumeaux(s, id, texteM) {
  const J = lireSi(ch(M.jumeau)), N = lireSi(ch(M.nu)), C = lireSi(ch(M.controle))
  if (J === null || N === null) { s.echoue(id, `jumeau(x) absent(s) : ${[J === null && M.jumeau, N === null && M.nu].filter(Boolean).join(', ')}`); return }
  if (!J || !N) { s.echoue(id, `jumeau(x) de 0 octet : ${[!J && M.jumeau, !N && M.nu].filter(Boolean).join(', ')}`); return }
  for (const [nom, x] of [[M.jumeau, J], [M.nu, N]]) { const p = seParse(x); if (!p.ok) s.echoue(id, `${nom} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`) }
  let fJ = ch(M.jumeau)
  if (J.includes(MARQUE_CONTROLE)) { fJ = path.join(dossierTravail(NOM), 'jumeau-coupe.sql'); fs.writeFileSync(fJ, J.split(MARQUE_CONTROLE)[0]) }
  const v = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), '--verifier', ch(M.fichier), fJ])
  if (v.status !== 0) s.echoue(id, `sql-nu.mjs --verifier ${M.fichier} ${M.jumeau} en code ${v.status} : ${court(`${v.stdout}${v.stderr}`, 200)}`)
  if (!N.includes(MARQUE_CONTROLE)) s.echoue(id, `${M.nu} ne porte pas la marque du contrôle (sql-nu.mjs --controle ${M.controle})`)
  else if (C !== null && N.split(MARQUE_CONTROLE)[1].trim() !== lf(C).trim()) s.echoue(id, `ce qui suit la marque dans ${M.nu} n'est pas exactement ${M.controle}`)
  if (C) {
    const dest = path.join(dossierTravail(NOM), path.basename(M.nu))
    const g = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), ch(M.fichier), aff(dest), '--controle', ch(M.controle)])
    if (g.status !== 0) s.echoue(id, `sql-nu.mjs ne régénère pas le nu (code ${g.status}) : ${court(`${g.stdout}${g.stderr}`, 160)}`)
    else {
      const A = lf(fs.readFileSync(dest, 'utf8')).split('\n'), B = N.split('\n')
      if (!/^-{28} .*coller ce fichier EN ENTIER\./.test(B[0] || '')) s.echoue(id, `${M.nu} ne commence pas par l'en-tête de sql-nu.mjs`)
      const k = A.findIndex((l, x) => x > 0 && l !== B[x])
      if (k > 0 || A.length !== B.length) s.echoue(id, `${M.nu} ne sort pas de sql-nu.mjs : diverge à la ligne ${k > 0 ? k + 1 : Math.min(A.length, B.length) + 1}`)
    }
  } else s.echoue(id, `${M.controle} ${C === null ? 'absent' : 'vide'} : le nu ne peut pas être régénéré`)
  // sql-nu.mjs ôte aussi les commentaires et les lignes vides DANS les corps $tag$ : on compare sans eux, blancs repliés
  const forme = (x) => normaliser(sansCommentairesSql(x)).replace(/\s+/g, ' ')
  const a = instructions(texteM).map(forme), b = instructions(jumeauNuCoupe(ch(M.nu))).map(forme)
  const k = a.findIndex((x, i) => x !== b[i])
  if (k >= 0 || a.length !== b.length) s.echoue(id, `la migration a ${a.length} instruction(s), le nu coupé ${b.length} ; première différence à l'instruction ${(k >= 0 ? k : Math.min(a.length, b.length)) + 1}`)
}
function jugerControleLecture(s, id) {
  const C = lireSi(ch(M.controle))
  if (!C) { s.echoue(id, `contrôle ${C === null ? 'absent' : 'vide'} : ${M.controle}`); return null }
  const ins = lireInstructions(C)
  if (!ins.length) s.echoue(id, `${M.controle} ne porte aucune instruction`)
  for (const x of ins) if (!/^(select|with)\b/.test(x.n)) s.echoue(id, `${M.controle} : instruction qui n'est pas une lecture : « ${court(x.n, 90)} »`)
  const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum|comment)\b/.exec(codeSeul(C))
  if (verbe) s.echoue(id, `${M.controle} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
  if (!C.includes("'oui'")) s.echoue(id, `${M.controle} ne rend aucune ligne « oui »`)
  return compacter(C)
}
function lireScenario(s, id) {
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) { s.echoue(id, `scénario ${sc === null ? 'absent' : 'vide'} : ${M.scenario}`); return null }
  const p = seParse(sc)
  if (!p.ok) s.echoue(id, `${M.scenario} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`)
  const cles = clesScenario(sc)
  const perdues = CLES_FA6.filter((c) => !cles.includes(c))
  if (perdues.length) s.echoue(id, `${M.scenario} a perdu ${perdues.length} clé(s) du cahier FA-6 : ${listeTxt(perdues)}`)
  return { sc, cles }
}
function jugerEssai(s, id) {
  if (SANS_ESSAI) { s.saute(id, '--sans-essai (mutations) : une copie mutée n\'a pas d\'essai à elle'); return }
  const x = lireScenario(s, id)
  if (!x) return
  const N = lireSi(ch(M.nu))
  if (!N) { s.echoue(id, `jumeau nu ${N === null ? 'absent' : 'vide'} (${M.nu}) : l'empreinte de l'essai ne se calcule pas`); return }
  const e = empreinte(jumeauNuCoupe(ch(M.nu)))
  const cr = lireCompteRendu(ch(M.essai_a_sec), { empreinte: e, cles: x.cles })
  if (!cr.ok) for (const r of cr.raisons) s.echoue(id, `${M.essai_a_sec} : ${r}`)
  if (!s.enEchec(id)) s.passe(id, `essai à sec du jumeau ${e.slice(0, 12)}… : ${x.cles.length} clés à true, APRES rien_ne_reste=true`)
}
function jugerNonRegression(s, id) {
  const r = nonRegression(racine, { exclus: [M.fichier, M.jumeau, M.nu, M.controle] })
  if (r.ok) s.passe(id, r.resume)
  else for (const x of r.echecs) s.echoue(id, x)
  // 0088 (la commande de site) inchangée : relue contre HEAD, que la racine soit le dépôt ou une copie
  const h = spawnSync('git', ['show', `HEAD:${M.commande}`], { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 16 << 20 })
  const ici = lireSi(ch(M.commande))
  if (h.status !== 0) s.echoue(id, `${M.commande} introuvable dans HEAD : la comparaison ne prouverait rien`)
  else if (ici === null || lf(h.stdout) !== ici) s.echoue(id, `${M.commande} ${ici === null ? 'absente' : 'modifiée'} : 0100 ne touche pas à la commande de site`)
  else s.passe(id, `${M.commande} identique à HEAD`)
}

// ── FA-1 à FA-5 : la lecture de 0100 ─────────────────────────────────────────────────────────────────────────────────────
const GENRES = [
  ['extension', /^create extension if not exists pgmq(?: with schema pgmq)?(?: cascade)?$/],
  ['file', /^(?:do |select pgmq\.create\('argent'\) where not exists)/],
  ['table', /^create table if not exists ops\.argent_messages\(/],
  ['rls', /^alter table (?:if exists )?(?:only )?ops\.argent_messages enable row level security$/],
  ['revoke_table', /^revoke all(?: privileges)? on (?:table )?ops\.argent_messages from /],
  ['revoke_pgmq', /^revoke all(?: privileges)? on schema pgmq from /],
  ['fonction', /^create or replace function public\.ops_argent_[a-z0-9_]+\(/],
  ['revoke', /^revoke (?:all|execute)(?: privileges)? on function public\.(ops_argent_[a-z0-9_]+)\b/],
  ['grant', /^grant execute on function public\.(ops_argent_[a-z0-9_]+)\b/],
  ['commentaire', /^comment on (table|column|function) /],
]
function juger0100(s, texteM) {
  const ins = lireInstructions(texteM)
  const genres = ins.map((x) => { for (const [g, re] of GENRES) { const m = re.exec(x.n); if (m) return { ...x, g, m } } return { ...x, g: null } })
  // FA-1 — fichier, liste permise, ordre
  if (!ins.length) s.echoue(IDS.fichier, `${M.fichier} ne porte aucune instruction`)
  for (const x of genres) if (!x.g) s.echoue(IDS.fichier, `instruction hors de la liste du point 1 : « ${court(x.n, 100)} »`)
  const files = genres.filter((x) => x.g === 'file')
  for (const x of files) if (!(x.c.includes("pgmq.create('argent')") && /pgmq\.list_queues\(\)|pgmq\.meta(?!s)/.test(x.c))) s.echoue(IDS.fichier, `« ${court(x.n, 80)} » : un seul bloc permis, la création gardée de la file argent (pgmq.create('argent') si pgmq.list_queues() ne la contient pas)`)
  if (files.length !== 1) s.echoue(IDS.fichier, `${files.length} création(s) de la file argent, une seule attendue (gardée)`)
  const cs = codeSeul(texteM)
  const brut = sansCommentairesSql(texteM).toLowerCase()
  if (/pgmq_public/.test(brut)) s.echoue(IDS.fichier, 'pgmq_public nommé : « Expose Queues via PostgREST » ne s\'active pas, on passe par nos fonctions')
  for (const x of genres.filter((y) => y.g === 'grant')) if (rolesApres(x.n, 'to').some((ro) => ['anon', 'authenticated', 'public'].includes(ro))) s.echoue(IDS.fichier, `grant à anon, authenticated ou public : « ${court(x.n, 80)} »`)
  if (/\bgrant\b[^;]*\bto\b[^;]*\b(anon|authenticated)\b/.test(cs)) s.echoue(IDS.fichier, 'un grant à anon ou authenticated')
  const premier = (g) => genres.findIndex((x) => x.g === g)
  const ordre = [['extension', 'create extension if not exists pgmq'], ['file', 'la création gardée de la file'], ['table', 'la table'], ['revoke_pgmq', 'revoke all on schema pgmq'], ['fonction', 'les fonctions']]
  for (const [g, quoi] of ordre) if (premier(g) < 0) s.echoue(IDS.fichier, `${quoi} : absent`)
  for (let k = 1; k < ordre.length; k++) { const a = premier(ordre[k - 1][0]), b = premier(ordre[k][0]); if (a >= 0 && b >= 0 && a > b) s.echoue(IDS.fichier, `ordre du point 1 : ${ordre[k - 1][1]} vient après ${ordre[k][1]}`) }
  const rp = genres.find((x) => x.g === 'revoke_pgmq')
  if (rp && !['anon', 'authenticated'].every((ro) => rolesApres(rp.n, 'from').includes(ro))) s.echoue(IDS.fichier, 'revoke all on schema pgmq from anon, authenticated incomplet')
  if (!s.enEchec(IDS.fichier)) s.passe(IDS.fichier, `${ins.length} instructions dans l'ordre du point 1 (extension, file gardée, table, schéma pgmq fermé, fonctions) ; ni pgmq_public ni grant à anon ou authenticated`)

  // FA-2 — la table et les fonctions du contrat
  const tIns = genres.find((x) => x.g === 'table')
  const T = tIns ? parserTable(tIns.t) : null
  if (!T) s.echoue(IDS.contrat, 'ops.argent_messages : create table absent ou illisible')
  else {
    const pkT = T.contraintes.map((c) => /^(?:constraint [a-z0-9_]+ )?primary key\((.*)\)$/.exec(c)).filter(Boolean).flatMap((m) => m[1].split(', '))
    for (const col of TABLE.colonnes) {
      const D = T.colonnes.get(col.nom)
      const ou = `ops.argent_messages.${col.nom}`
      if (!D) { s.echoue(IDS.contrat, `${ou} absente (contrat : ${court(col.texte, 70)})`); continue }
      const type = typeEnTete(D.n)
      if (typeCanon(type) !== typeCanon(col.type)) s.echoue(IDS.contrat, `${ou} : type « ${type || '?'} », contrat « ${col.type} »`)
      const Dn = horsCheck(D.n)
      if (col.pk && !(/\bprimary key\b/.test(Dn) || (pkT.length === 1 && pkT[0] === col.nom))) s.echoue(IDS.contrat, `${ou} n'est pas la clé primaire`)
      if (col.not_null && !/\bnot null\b/.test(Dn) && !col.pk) s.echoue(IDS.contrat, `${ou} n'est pas « not null »`)
      if (col.defaut !== undefined) { const d = defautDe(D.c); if (d === null || d !== sansCast(compacter(col.defaut))) s.echoue(IDS.contrat, `${ou} : défaut « ${d ?? 'aucun'} », contrat « ${col.defaut} »`) }
    }
    for (const c of T.colonnes.keys()) if (!TABLE.colonnes.some((x) => x.nom === c)) s.note(`${IDS.contrat} : colonne en plus du contrat (signalée, sans échec) : ops.argent_messages.${c}`)
    for (const k of TABLE.contraintes) if (!k.regles.every((rg) => regleOk(rg, T.c, T.sr))) s.echoue(IDS.contrat, `ops.argent_messages : contrainte du contrat introuvable — ${k.texte}`)
  }
  const fonctions = genres.filter((x) => x.g === 'fonction').map(parserFonction)
  const parCle = new Map()
  for (const f of fonctions) parCle.set(f.cle, [...(parCle.get(f.cle) || []), f])
  for (const [cle, l] of parCle) {
    if (l.length > 1) s.echoue(IDS.contrat, `${cle} créée ${l.length} fois`)
    if (!CONTRAT.fonctions[cle] || CONTRAT.fonctions[cle].migration !== NUM) s.echoue(IDS.contrat, `${cle} hors contrat de ${NUM}`)
  }
  const F = (cle) => parCle.get(cle)?.[0] || null
  for (const [cle, spec] of FONCTIONS) {
    const f = F(cle)
    if (!f) { s.echoue(IDS.contrat, `public.${cle} absente (contrat : ${court(spec.contrat, 80)})`); continue }
    if (f.erreur) { s.echoue(IDS.contrat, `public.${cle} : ${f.erreur}`); continue }
    const att = spec.params.map(([n, t]) => [n, typeCanon(t)])
    if (JSON.stringify(f.params) !== JSON.stringify(att)) s.echoue(IDS.contrat, `public.${cle} : paramètres (${f.params.map((p) => p.join(' ')).join(', ')}), contrat (${att.map((p) => p.join(' ')).join(', ')})`)
    if (f.rend !== rendCanon(spec.rend)) s.echoue(IDS.contrat, `public.${cle} rend « ${f.rend ?? '?'} », contrat « ${rendCanon(spec.rend)} »`)
  }
  if (!s.enEchec(IDS.contrat)) s.passe(IDS.contrat, `ops.argent_messages : ${TABLE.colonnes.length} colonnes et ${TABLE.contraintes.length} contraintes du contrat (types commande_payee et essai_e2e, exactement) ; les 5 fonctions : paramètres et types rendus conformes, aucune autre`)

  // FA-3 — sécurité
  const revokes = genres.filter((x) => x.g === 'revoke'), grants = genres.filter((x) => x.g === 'grant')
  for (const [cle, spec] of FONCTIONS) {
    const f = F(cle)
    if (!f || f.erreur) { s.echoue(IDS.securite, `public.${cle} : non jugée (absente)`); continue }
    if (!f.definer) s.echoue(IDS.securite, `public.${cle} n'est pas security definer`)
    const sp = spec.search_path || CONTRAT.regles_fonctions.search_path
    if (!f.searchPath || f.searchPath.join(', ') !== sp) s.echoue(IDS.securite, `public.${cle} : search_path ${f.searchPath ? f.searchPath.join(', ') : 'absent'}, attendu « ${sp} » (pgmq dedans, pg_temp en dernier)`)
    if (!revokes.some((x) => x.m[1] === cle && ['public', 'anon', 'authenticated'].every((ro) => rolesApres(x.n, 'from').includes(ro)))) s.echoue(IDS.securite, `public.${cle} : revoke … from public, anon, authenticated absent ou incomplet`)
    if (!grants.some((x) => x.m[1] === cle && rolesApres(x.n, 'to').includes('service_role'))) s.echoue(IDS.securite, `public.${cle} : grant execute … to service_role absent`)
  }
  for (const x of grants) if (rolesApres(x.n, 'to').some((ro) => ro !== 'service_role')) s.echoue(IDS.securite, `grant à ${rolesApres(x.n, 'to').filter((ro) => ro !== 'service_role').join(', ')} : « ${court(x.n, 80)} »`)
  if (!genres.some((x) => x.g === 'rls')) s.echoue(IDS.securite, 'ops.argent_messages sans « enable row level security »')
  if (!genres.some((x) => x.g === 'revoke_table' && ROLES_FERMES.every((ro) => rolesApres(x.n, 'from').includes(ro)))) s.echoue(IDS.securite, `ops.argent_messages : revoke all … from ${ROLES_FERMES.join(', ')} absent ou incomplet (fermée comme en 0096)`)
  if (/\bcreate policy\b/.test(cs)) s.echoue(IDS.securite, 'create policy : la table reste fermée, sans politique')
  if (!s.enEchec(IDS.securite)) s.passe(IDS.securite, `5 fonctions security definer, search_path « ${CONTRAT.fonctions.ops_argent_envoyer.search_path} », service_role seul ; table en RLS sans politique, révoquée aux quatre rôles`)

  // FA-4 — lecture des corps
  const corps = (cle) => { const f = F(cle); return f && !f.erreur ? compacter(f.corps) : null }
  const exiger = (cle, ok, quoi) => { const c = corps(cle); if (c === null) s.echoue(IDS.corps, `${cle} : absente, corps non lu`); else if (!ok(c)) s.echoue(IDS.corps, `${cle} : ${quoi}`) }
  exiger('ops_argent_envoyer', (c) => c.includes("'ops:type_argent'") && /raise[^;]*'ops:type_argent'/.test(c), 'un type hors liste ne lève pas ops:type_argent')
  exiger('ops_argent_envoyer', (c) => {
    const i = c.indexOf('onconflict(cle)donothing'), k = c.indexOf("pgmq.send('argent'")
    if (i < 0 || k < i) return false
    return /found|row_count/.test(c.slice(i, k)) // forme compacte : « if not found then » s'y lit « ifnotfoundthen »
  }, "pgmq.send('argent', …) n'est pas appelé seulement quand l'insertion a eu lieu (on conflict (cle) do nothing, puis found ou row_count, puis send)")
  exiger('ops_argent_envoyer', (c) => { const k = c.indexOf("pgmq.send('argent'"); return k >= 0 && /updateops\.argent_messagessetmsg_id=/.test(c.slice(k)) }, "msg_id n'est pas noté après pgmq.send")
  exiger('ops_argent_lire', (c) => /raise[^;]*'ops:vt'/.test(c) && (c.includes('p_vt_sbetween5and3600') || c.includes('p_vt_snotbetween5and3600') || (/p_vt_s<5(?!\d)/.test(c) && /p_vt_s>3600(?!\d)/.test(c))), 'p_vt_s hors 5-3600 ne lève pas ops:vt')
  exiger('ops_argent_lire', (c) => /least\(greatest\([^;]*p_n[^;]*,1\),10\)|greatest\(least\([^;]*p_n[^;]*,10\),1\)|p_nbetween1and10/.test(c), 'p_n n\'est pas borné à 1-10 (least(greatest(p_n, 1), 10))')
  exiger('ops_argent_lire', (c) => c.includes("pgmq.read('argent'") && /pgmq\.archive\('argent'/.test(c) && /read_ct>3(?!\d)|read_ct>=4(?!\d)/.test(c), "sans pgmq.read('argent'), sans l'archivage au-delà de 3 lectures (read_ct > 3)")
  exiger('ops_argent_lire', (c) => c.includes("'argent_abandonne'") && /ops_evenement_ajouter\(|insertintoops\.evenements/.test(c) && c.includes('abandonne_le'), "l'abandon ne pose pas abandonne_le ou n'écrit pas l'événement argent_abandonne")
  exiger('ops_argent_lire', (c) => /pgmq\.delete\('argent'/.test(c) && c.includes('fait_le'), 'un message déjà fait n\'est pas supprimé (pgmq.delete) sans être rendu')
  exiger('ops_argent_fait', (c) => { const i = c.search(/fait_le=/), k = c.indexOf("pgmq.delete('argent'"); return i >= 0 && k > i }, 'la marque (fait_le) ne vient pas avant pgmq.delete')
  exiger('ops_argent_etat', (c) => ['en_file', 'plus_vieux_s', 'abandonnes_24h', 'faits_24h', 'non_faits_plus_de_15_min'].every((k) => c.includes(`'${k}'`)) && c.includes('pgmq.metrics('), 'ne rend pas en_file, plus_vieux_s (pgmq.metrics), abandonnes_24h, faits_24h et non_faits_plus_de_15_min')
  exiger('ops_argent_essai_effacer', (c) => /'essai_e2e:%'|'essai\\_e2e:%'/.test(c) && /deletefromops\.argent_messages/.test(c), "n'efface pas les seules lignes essai_e2e:…")
  if (!s.enEchec(IDS.corps)) s.passe(IDS.corps, 'envoi seulement après une insertion réelle, msg_id noté ; lecture bornée (5-3600 s, 1-10), archivage au-delà de 3 lectures avec abandonne_le et argent_abandonne ; marque avant suppression ; état et ménage d\'essai conformes')

  // FA-5 — jumeaux et contrôle
  jugerJumeaux(s, IDS.jumeaux, texteM)
  const cC = jugerControleLecture(s, IDS.jumeaux)
  if (cC !== null) {
    const points = [
      ["l'extension est présente", ['pg_extension', "'pgmq'"]],
      ['la file argent existe', ["'argent'"]],
      ['la table a la RLS', ['relrowsecurity', 'argent_messages']],
      ['les 5 fonctions sont sécurisées', ['prosecdef', 'proconfig', 'has_function_privilege', ...FONCTIONS.map(([k]) => k)]],
      ["has_schema_privilege('anon', 'pgmq', 'usage') est faux", ["has_schema_privilege('anon','pgmq','usage')"]],
    ]
    for (const [quoi, tous] of points) { const m = tous.filter((x) => !cC.includes(compacter(x))); if (m.length) s.echoue(IDS.jumeaux, `${M.controle} ne couvre pas : ${quoi} (manque ${m.join(', ')})`) }
    if (!/pgmq\.list_queues\(\)|pgmq\.meta(?!s)/.test(cC)) s.echoue(IDS.jumeaux, `${M.controle} ne lit pas la file (pgmq.list_queues() ou pgmq.meta)`)
  }
  if (!s.enEchec(IDS.jumeaux)) s.passe(IDS.jumeaux, `jumeaux équivalents ; ${M.controle} en lecture seule : extension, file argent, RLS, 5 fonctions sécurisées, usage de pgmq refusé à anon`)
}
/** Le texte sans ses commentaires, y compris ceux des corps $tag$. */
function sansCommentairesSql(t, prof = 0) {
  return segments(lf(t)).filter((x) => x.type !== 'commentaire').map((x) => (x.type === 'dollar' && x.ferme && prof < 4 ? `$${x.tag}$${sansCommentairesSql(x.corps, prof + 1)}$${x.tag}$` : x.texte)).join('')
}

// ── Le jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const ids = [...new Set(Object.values(IDS))]
  const s = creerRapport(NOM, ids, { entete: `${NOM} ${NUM} (${M.fiche}) — racine ${aff(racine)}${o.temoin ? ' — témoin : critères de non-régression' : ''}${SANS_ESSAI ? ' — sans essai' : ''}` })
  s.saute(IDS.reel, '--reel seulement, après l\'application par Claude Code')
  if (o.temoin) {
    for (const id of ids) if (![IDS.nr, IDS.essai, IDS.reel].includes(id)) s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${M.fiche}`)
    jugerNonRegression(s, IDS.nr)
    const x = lireScenario(s, IDS.essai)
    if (x) {
      let bloc = null
      try { bloc = blocEssai({ nus: [JUMEAU_EXEMPLE], scenario: x.sc, empreinte: empreinte(JUMEAU_EXEMPLE) }) } catch (e) { s.echoue(IDS.essai, `--generer-essai sur le jumeau d'exemple : ${e.message}`) }
      if (bloc) {
        const a = analyserEssai(bloc, { nus: [JUMEAU_EXEMPLE] })
        if (!a.ok) s.echoue(IDS.essai, `bloc d'essai généré sur le jumeau d'exemple invalide : ${a.raisons.slice(0, 3).join(' ; ')}`)
        else if (!s.enEchec(IDS.essai)) s.passe(IDS.essai, `témoin : ${M.scenario} se parse (${x.cles.length} clés, dont les ${CLES_FA6.length} du cahier FA-6) ; --generer-essai sur le jumeau d'exemple rend 1 énoncé, ${a.octets} octets`)
      }
    }
    return s.fin()
  }
  const texteM = lireSi(ch(M.fichier))
  if (!texteM) {
    s.echoue(IDS.fichier, texteM === null ? `migration absente : ${M.fichier} (racine ${aff(racine)})` : `migration vide (0 octet) : ${M.fichier}`)
    for (const id of ids) if (![IDS.fichier, IDS.nr, IDS.reel].includes(id)) s.echoue(id, `non jugé : la migration manque (${IDS.fichier})`)
  } else {
    juger0100(s, texteM)
    jugerEssai(s, IDS.essai)
  }
  jugerNonRegression(s, IDS.nr)
  return s.fin()
}

// ── --generer-essai ─────────────────────────────────────────────────────────────────────────────────────────────────────
function genererEssai() {
  const nus = []
  for (const a of [...AVEC].sort()) {
    const f = ch(nuDe(a))
    if (!lireSi(f)) refuser(`préalable manquant : jumeau nu de ${a} absent ou vide (${nuDe(a)})`)
    nus.push(jumeauNuCoupe(f))
  }
  const fN = ch(M.nu)
  if (!lireSi(fN)) refuser(`préalable manquant : jumeau nu de ${NUM} absent ou vide (${M.nu}, racine ${aff(racine)})`)
  const nu = jumeauNuCoupe(fN)
  nus.push(nu)
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) refuser(`scénario absent ou vide : ${M.scenario}`)
  let bloc
  try { bloc = blocEssai({ nus, scenario: sc, empreinte: empreinte(nu) }) } catch (e) { console.error(`✗ ${NOM} : ${e.message}`); process.exit(1) }
  const a = analyserEssai(bloc, { nus })
  if (!a.ok) { console.error(`✗ ${NOM} : bloc d'essai invalide — ${a.raisons.join(' ; ')}`); process.exit(1) }
  process.stdout.write(bloc)
  console.error(`-- ${NOM} : essai à sec de ${NUM}${AVEC.length ? ` (précédé de ${[...AVEC].sort().join(', ')})` : ''}, empreinte ${empreinte(nu).slice(0, 12)}… ; après l'exécution : ${M.apres} → « APRES rien_ne_reste=<valeur> » dans ${M.essai_a_sec}. Si create extension est refusé, le noter tel quel et poser la question à Benj.`)
  process.exit(0)
}

// ── --reel ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Jamais process.exit() après un fetch (Windows : libuv tombe si l'on ferme pendant que les sockets se referment).
class Prealable extends Error {}
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms) })
async function reel() {
  const id = IDS.reel
  lireEnvLocal(R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const cles = { anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY }
  const manque = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !cles.anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !cles.service && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
  if (manque.length) throw new Prealable(`${manque.join(', ')} absent(s) de .env.local`)
  if (!lireSi(ch(M.fichier))) throw new Prealable(`${M.fichier} absent du dépôt`)
  async function rpc(fn, corps, cle) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(20_000) })
      const t = await res.text()
      let j = null
      try { j = JSON.parse(t) } catch { j = null }
      return { status: res.status, ok: res.ok, j }
    } catch { return { status: 0, ok: false, j: null } }
  }
  const code = (x) => `${x.status}${x.j && typeof x.j === 'object' && x.j.code ? ` ${x.j.code}` : ''}`
  const et = await rpc('ops_argent_etat', {}, cles.service)
  if (et.status === 0) throw new Prealable('PostgREST injoignable')
  if (et.status === 404 && et.j?.code === 'PGRST202') throw new Prealable(`ops_argent_etat inconnue de PostgREST : 0100 n'est pas appliquée (${code(et)})`)
  // Une lecture de la file touche TOUS les messages visibles : on ne lit jamais une file où attend un message réel.
  if (et.ok && et.j && Number(et.j.en_file) > 0) throw new Prealable(`la file argent contient ${Number(et.j.en_file)} message(s) : --reel attend qu'elle soit vide pour ne toucher à aucun message réel`)
  const s = creerRapport(NOM, [id], { entete: `${NOM} ${NUM} (${M.fiche}) — --reel` })
  s.verdict(id, et.ok, `ops_argent_etat() avec la clé de service (${code(et)})`, `ops_argent_etat() refusée (${code(et)})`)
  const cle = `essai_e2e:${crypto.randomBytes(4).toString('hex')}`
  const lire = async () => { const x = await rpc('ops_argent_lire', { p_vt_s: 5, p_n: 10 }, cles.service); return { x, l: Array.isArray(x.j) ? x.j.filter((m) => m && m.cle === cle) : null } }
  try {
    const e = await rpc('ops_argent_envoyer', { p_type: 'essai_e2e', p_cle: cle, p_charge: {}, p_delai_s: 0 }, cles.service)
    const msg = typeof e.j === 'number' ? e.j : null
    s.verdict(id, e.ok && msg !== null, 'envoyer : un msg_id', `envoyer : ${code(e)}`)
    const l1 = await lire()
    s.verdict(id, l1.l?.length === 1 && l1.l[0].msg_id === msg && Number(l1.l[0].lectures) === 1, 'lire (délai 5 s) : le message, lectures = 1, sans fait', `lire : ${code(l1.x)}, ${l1.l ? l1.l.length : '?'} message(s) de la clé`)
    await dormir(6000)
    const l2 = await lire()
    s.verdict(id, l2.l?.length === 1 && l2.l[0].msg_id === msg && Number(l2.l[0].lectures) === 2, '6 s plus tard : même msg_id, lectures = 2', `relecture : ${code(l2.x)}, ${l2.l ? `${l2.l.length} message(s), lectures ${l2.l.map((m) => m.lectures).join(',')}` : '?'}`)
    const f1 = await rpc('ops_argent_fait', { p_msg_id: msg, p_cle: cle, p_resultat: {} }, cles.service)
    s.verdict(id, f1.ok && f1.j === true, 'fait : true', `fait : ${code(f1)}`)
    const f2 = await rpc('ops_argent_fait', { p_msg_id: msg, p_cle: cle, p_resultat: {} }, cles.service)
    s.verdict(id, f2.ok && f2.j === false, 'fait, second appel : false', `fait, second appel : ${code(f2)}`)
    const l3 = await lire()
    s.verdict(id, l3.x.ok && l3.l?.length === 0, 'dernière lecture : rien', `dernière lecture : ${code(l3.x)}, ${l3.l ? l3.l.length : '?'} message(s)`)
    const a = await rpc('ops_argent_etat', {}, cles.anon)
    s.verdict(id, !a.ok && a.status !== 0, `ops_argent_etat refusée avec la clé anonyme (${code(a)})`, `ops_argent_etat ${a.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anonyme (${code(a)})`)
  } catch (err) {
    s.echoue(id, `exception : ${court(err.message, 120)}`)
  } finally {
    const m = await rpc('ops_argent_essai_effacer', {}, cles.service)
    s.verdict(id, m.ok, `ménage : ops_argent_essai_effacer() (${typeof m.j === 'number' ? m.j : '?'} ligne(s))`, `ménage : ops_argent_essai_effacer() refusé (${code(m)}) — la clé ${cle} reste en base`)
  }
  return s.fin()
}

// ── Aiguillage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
if (GENERER) genererEssai()
else if (o.reel) {
  try { process.exitCode = await reel() } catch (e) {
    if (!(e instanceof Prealable)) { console.log(`${NOM} ${NUM} --reel : ERREUR — ${court(e.message, 160)}`); process.exitCode = 1 }
    else { console.log(`${NOM} ${NUM} --reel : PRÉALABLE MANQUANT — ${e.message}`); process.exitCode = 2 }
  }
}
else process.exit(juger())
