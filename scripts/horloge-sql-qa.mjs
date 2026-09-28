#!/usr/bin/env node
// scripts/horloge-sql-qa.mjs — le juge SQL de la migration 0101 (l'horloge 24 h/24 : pg_cron + pg_net + Supabase Vault, fiche
// 026-086) ; écrit par Claude Code (fiche 026-032) AVANT la migration qu'il juge, que son exécutant ne peut pas modifier.
//
// Sans connexion directe à la base, il juge en trois temps : la lecture statique de la migration, de ses jumeaux, de son
// contrôle et de docs/agents/horloge.md, contre scripts/fixtures/026-horloge-bus/contrat-ops.json et le cahier HS de 026-086 ;
// l'essai à sec qu'il génère (--generer-essai) et dont il relit le compte rendu (.orchestre/preuves/026-086/essai-a-sec.txt,
// scénario scripts/fixtures/026-horloge-bus/essais/0101.sql) ; --reel dix minutes après l'application par Claude Code.
// Deux faits du 24/09 le fixent : pg_net attend 2 s par défaut (timeout_milliseconds explicite exigé), et le jeton CRON_SECRET
// est lu dans Supabase Vault : aucune valeur de secret dans le dépôt, decrypted_secret seulement dans un exists (…) hors de
// ops_horloge_minute().
//
// Critères (cahier HS de 026-086) : HS-1 fichier, liste permise, aucun secret · HS-2 corps de ops_horloge_minute · HS-3 sécurité ·
// HS-4 ops_horloge_etat ne rend jamais le secret · HS-5 les deux cron.schedule · HS-6 jumeaux et contrôle · HS-7
// docs/agents/horloge.md · HS-8 essai à sec · HS-9 non-régression · HS-10 --reel.
//
// Usage :
//   node scripts/horloge-sql-qa.mjs [--racine=<dossier>] [--sans-essai]
//   node scripts/horloge-sql-qa.mjs --temoin                 les seuls critères de non-régression (HS-9, part de HS-8)
//   node scripts/horloge-sql-qa.mjs --generer-essai [--avec=0096,…,0100] [--racine=<dossier>]
//   node scripts/horloge-sql-qa.mjs --reel                   ops_horloge_etat(10) par PostgREST : des nombres et des codes HTTP
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide ou préalable manquant (fonction inconnue, réponse 404 du tic).
// N'écrit que sous .orchestre/travail/horloge-sql-qa/. N'affiche aucun secret, n'en lit aucun.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  R, MARQUE_CONTROLE, instructions, normaliser, codeSeul, seParse, segments, masquer, fermante, decouperVirgules, compacter,
  jumeauNuCoupe, empreinte, blocEssai, analyserEssai, clesScenario, lireCompteRendu, nonRegression, creerRapport,
  lireEnvLocal, dossierTravail, court, lf, JUMEAU_EXEMPLE,
} from './lib/sql-essai.mjs'
import { lireOptionsOuQuitter } from './fixtures/025/commun.mjs'

const NOM = 'horloge-sql-qa'
const NUM = '0101'
const CONTRAT_F = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const CONTRAT = JSON.parse(fs.readFileSync(path.join(R, CONTRAT_F), 'utf8'))
const M = {
  fiche: '026-086',
  fichier: 'supabase/migrations/0101_ops_horloge.sql',
  jumeau: 'supabase/migrations/_A_COLLER_sql_editor_0101.sql',
  nu: 'supabase/migrations/_A_COLLER_sql_editor_0101_NU.sql',
  controle: 'supabase/controles/0101_ops_horloge.sql',
  doc: 'docs/agents/horloge.md',
  essai_a_sec: '.orchestre/preuves/026-086/essai-a-sec.txt',
  scenario: 'scripts/fixtures/026-horloge-bus/essais/0101.sql',
  apres: "select not exists (select 1 from cron.job where jobname = 'presti-agents-tic') as rien_ne_reste",
}
const AVANT = ['0096', '0097', '0098', '0099', '0100']
const IDS = { fichier: 'HS-1', minute: 'HS-2', securite: 'HS-3', etat: 'HS-4', cron: 'HS-5', jumeaux: 'HS-6', doc: 'HS-7', essai: 'HS-8', nr: 'HS-9', reel: 'HS-10' }
const ROLES_FERMES = ['public', 'anon', 'authenticated', 'service_role']
const URL_TIC = 'https://prestiapp.fr/api/agents/tic'
const PLANNINGS = [
  { nom: 'presti-agents-tic', planning: '* * * * *', commande: 'select public.ops_horloge_minute()' },
  { nom: 'presti-cron-menage', planning: '17 3 * * *', commande: "delete from cron.job_run_details where end_time < now() - interval '7 days'" },
]
const MESSAGE_401 = 'le secret du Vault ne correspond pas à CRON_SECRET de Vercel'
const FONCTIONS = Object.entries(CONTRAT.fonctions).filter(([, f]) => f.migration === NUM) // ops_horloge_minute, ops_horloge_etat
const CLES_HS8 = [
  'tache_tic_chaque_minute', 'tache_tic_active', 'tic_commande_minute', 'tache_menage_planifiee',
  'etat_sept_cles', 'etat_secret_present_booleen', 'secret_present_prealable',
  'minute_met_en_file_une_requete', 'requete_url_exacte', 'requete_timeout_30000', 'requete_authorization_presente', 'requete_methode_get',
  'simulation_sans_secret_nom_trouve', 'sans_secret_rend_null', 'sans_secret_aucune_requete', 'sans_secret_un_evenement', 'sans_secret_une_fois_par_heure',
  'anon_refuse_minute', 'anon_refuse_etat', 'authenticated_refuse_minute', 'authenticated_refuse_etat', 'service_role_refuse_minute',
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
if (CONTRAT.migrations?.[NUM]?.fiche !== M.fiche || FONCTIONS.length !== 2) refuser(`${CONTRAT_F} ne donne plus ${NUM} (2 fonctions) à ${M.fiche} : le juge doit être relu`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const listeTxt = (a, n = 6) => `${a.slice(0, n).join(', ')}${a.length > n ? ` (et ${a.length - n} autre(s))` : ''}`
const nuDe = (n) => CONTRAT.migrations[n]?.nu || `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`

// ── Lectures ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const SYN = { int: 'integer', int4: 'integer', integer: 'integer', int8: 'bigint', bigint: 'bigint', bool: 'boolean', boolean: 'boolean', jsonb: 'jsonb', text: 'text' }
function typeCanon(t) {
  const x = String(t).toLowerCase().replace(/\s+/g, '')
  const m = /^([a-z_][a-z0-9_.]*)(\(.*\))?(\[\])?$/.exec(x)
  return m ? `${SYN[m[1]] || m[1]}${m[2] || ''}${m[3] || ''}` : x
}
const typeEnTete = (def) => (/^(timestamp with time zone|double precision|[a-z_][a-z0-9_.]*(?:\(\d+(?:, ?\d+)?\))?(?:\[\])?)/.exec(def.trim()) || [''])[0]
function parserParam(p) {
  const n = normaliser(p).replace(/^(in|out|inout|variadic) /, '').split(/ default | = /)[0]
  const nom = n.split(' ')[0].replace(/"/g, '')
  return [nom, typeCanon(typeEnTete(n.slice(nom.length + 1)))]
}
function parserFonction(ins) {
  const m = /^create (or replace )?function ([a-z_]+)\.([a-z0-9_]+)\(/.exec(ins.n)
  if (!m) return null
  const t = ins.t, mm = masquer(t)
  const i = mm.indexOf('('), j = fermante(mm, i)
  const base = { schema: m[2], nom: m[3], cle: m[3] }
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
  const rend = r ? typeCanon(r[1].split(/ (?:language|as|security|set|stable|immutable|volatile|strict|leakproof|parallel|cost|rows|called)\b/)[0]) : null
  const sp = /set search_path (?:=|to) ([^ ,]+(?:, [^ ,]+)*)/.exec(entete)
  return { ...base, params, rend, corps, entete, definer: /\bsecurity definer\b/.test(entete), searchPath: sp ? sp[1].split(', ').map((x) => x.replace(/^['"]|['"]$/g, '')) : null }
}
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) }))
function rolesApres(n, mot) {
  const i = n.lastIndexOf(` ${mot} `)
  if (i < 0) return []
  return n.slice(i + mot.length + 2).split(',').map((x) => x.trim().replace(/\s+(cascade|restrict)$/, '').replace(/"/g, '')).filter(Boolean)
}
/** Le texte sans ses commentaires, y compris ceux des corps $tag$. */
function sansCommentairesSql(t, prof = 0) {
  return segments(lf(t)).filter((x) => x.type !== 'commentaire').map((x) => (x.type === 'dollar' && x.ferme && prof < 4 ? `$${x.tag}$${sansCommentairesSql(x.corps, prof + 1)}$${x.tag}$` : x.texte)).join('')
}
/**
 * Les occurrences de « decrypted_secret » HORS d'une parenthèse ouverte par « exists », lues par le tokenizer (chaînes et
 * commentaires masqués ; les corps $tag$ lus récursivement) : chacune est une lecture de la valeur du secret.
 */
function decryptedHorsExists(t, prof = 0) {
  const out = []
  let pos = 0
  for (const s of segments(lf(t))) {
    if (s.type === 'dollar' && s.ferme && prof < 4) out.push(...decryptedHorsExists(s.corps, prof + 1))
    pos += s.texte.length
  }
  const m = masquer(lf(t)).toLowerCase()
  const pile = []
  for (let i = 0; i < m.length; i++) {
    if (m[i] === '(') pile.push(/\bexists\s*$/.test(m.slice(Math.max(0, i - 24), i)))
    else if (m[i] === ')') pile.pop()
    else if (m.startsWith('decrypted_secret', i) && !/[a-z0-9_]/.test(m[i - 1] || '') && !pile.includes(true)) out.push(court(lf(t).slice(Math.max(0, i - 30), i + 40), 70))
  }
  return out
}
/** Une chaîne qui ressemble à un secret : 32 signes ou plus, lettres ET chiffres, au plus un « _ » ; ou « Bearer <jeton> ». */
function secretsDe(texte) {
  const d = []
  for (const m of String(texte).matchAll(/[A-Za-z0-9+/_=.-]{32,}/g)) {
    const x = m[0]
    if (/\d/.test(x) && /[A-Za-z]/.test(x) && (x.match(/_/g) || []).length <= 1 && !/^https?/i.test(x) && !/\.(md|mjs|sql|json|ts)$/.test(x)) d.push(`${x.slice(0, 4)}… (${x.length} signes)`)
  }
  for (const m of String(texte).matchAll(/Bearer\s+([A-Za-z0-9._~+/=-]{16,})/g)) d.push(`Bearer ${m[1].slice(0, 3)}…`)
  return d
}
function valeurLitterale(a) {
  const x = a.trim()
  let m = /^'([\s\S]*)'$/.exec(x)
  if (m) return m[1].replace(/''/g, "'")
  m = /^\$([A-Za-z_]*)\$([\s\S]*)\$\1\$$/.exec(x)
  return m ? m[2] : null
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
  const hors = decryptedHorsExists(C)
  if (hors.length) s.echoue(id, `${M.controle} lit decrypted_secret hors d'un exists (…) : « ${hors[0]} »`)
  return { c: compacter(C), brut: C }
}
/** Le scénario : il se parse, porte les clés du cahier HS-8, et ne lit jamais la valeur du secret (ni le Vault). */
function lireScenario(s, id) {
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) { s.echoue(id, `scénario ${sc === null ? 'absent' : 'vide'} : ${M.scenario}`); return null }
  const p = seParse(sc)
  if (!p.ok) s.echoue(id, `${M.scenario} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`)
  const cles = clesScenario(sc)
  const perdues = CLES_HS8.filter((c) => !cles.includes(c))
  if (perdues.length) s.echoue(id, `${M.scenario} a perdu ${perdues.length} clé(s) du cahier HS-8 : ${listeTxt(perdues)}`)
  const brut = sansCommentairesSql(sc).toLowerCase()
  // chaînes comprises : une lecture du secret cachée dans un execute '…' reste une lecture
  for (const x of brut.matchAll(/decrypted_secret/g)) if (!/exists\s*\(\s*select\s+1\s+from\s+vault\.decrypted_secrets\s+where\s+name\s*=\s*''?cron_secret''?\s*\)/.test(brut.slice(Math.max(0, x.index - 40), x.index + 80))) { s.echoue(id, `${M.scenario} lit decrypted_secret hors de « exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') »`); break }
  if (/create_secret|update_secret|vault\s*\.\s*secrets\b/.test(brut)) s.echoue(id, `${M.scenario} écrit ou lit le Vault (create_secret, update_secret ou vault.secrets)`)
  if (/http_request_queue[\s\S]{0,200}headers\s*->>?\s*'authorization'/.test(brut)) s.echoue(id, `${M.scenario} lit la valeur de l'en-tête Authorization : seule sa présence se vérifie`)
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
}

// ── HS-1 à HS-7 : la lecture de 0101 et de sa notice ─────────────────────────────────────────────────────────────────────
const GENRES = [
  ['extension', /^create extension if not exists (pg_cron|pg_net)(?: with schema (?:pg_catalog|extensions|cron|net))?(?: cascade)?$/],
  // Bloc gardé (026-086, relance du 28/09) : `create extension if not exists` tout court relance le
  // script de réinstallation interne de pg_cron même quand l'extension est déjà là, qui échoue en
  // 2BP01 (dependent privileges exist) sur cron.job. Ce bloc ne lance `create extension` (sans « if
  // not exists », donc sans ce script) QUE si pg_extension ne porte pas encore la ligne : sur une
  // base où l'extension existe déjà, `create extension` n'est jamais exécuté.
  ['extension_gardee', /^do \$\$ begin if not exists \(select 1 from pg_extension where extname = '(pg_cron|pg_net)'\) then create extension \1; end if; end \$\$$/],
  ['fonction', /^create or replace function public\.ops_horloge_[a-z0-9_]+\(/],
  ['revoke', /^revoke (?:all|execute)(?: privileges)? on function public\.(ops_horloge_[a-z0-9_]+)\b/],
  ['grant', /^grant execute on function public\.(ops_horloge_[a-z0-9_]+)\b/],
  ['schedule', /^select cron\.schedule\(/],
  ['commentaire', /^comment on function /],
]
function juger0101(s, texteM) {
  const ins = lireInstructions(texteM)
  const genres = ins.map((x) => { for (const [g, re] of GENRES) { const m = re.exec(x.n); if (m) return { ...x, g, m } } return { ...x, g: null } })
  // HS-1 — fichier, liste permise, aucun secret
  if (!ins.length) s.echoue(IDS.fichier, `${M.fichier} ne porte aucune instruction`)
  for (const x of genres) if (!x.g) s.echoue(IDS.fichier, `instruction hors de la liste du point 1 : « ${court(x.n, 100)} »`)
  const ext = new Set(genres.filter((x) => x.g === 'extension' || x.g === 'extension_gardee').map((x) => x.m[1]))
  for (const e of ['pg_cron', 'pg_net']) if (!ext.has(e)) s.echoue(IDS.fichier, `${e} absente : ni « create extension if not exists » ni le bloc gardé par pg_extension`)
  // Le bloc gardé est désormais la forme exigée (026-086) : la forme nue relance, sur ce projet, le
  // script de réinstallation interne de pg_cron même sans rien à faire, et échoue en 2BP01.
  const nue = genres.filter((x) => x.g === 'extension').map((x) => x.m[1])
  if (nue.length) s.echoue(IDS.fichier, `create extension if not exists ${nue.join(', ')} : forme nue interdite depuis la relance du 28/09 — utiliser le bloc gardé par pg_extension`)
  for (const [nom, texte] of [[M.fichier, texteM], [M.jumeau, lireSi(ch(M.jumeau))], [M.nu, lireSi(ch(M.nu))], [M.controle, lireSi(ch(M.controle))]]) {
    if (!texte) continue
    const sec = secretsDe(texte)
    if (sec.length) s.echoue(IDS.fichier, `${nom} porte une chaîne qui ressemble à un secret : ${sec.slice(0, 2).join(', ')}`)
  }
  const fonctions = genres.filter((x) => x.g === 'fonction').map(parserFonction)
  const parCle = new Map()
  for (const f of fonctions) parCle.set(f.cle, [...(parCle.get(f.cle) || []), f])
  const F = (cle) => parCle.get(cle)?.[0] || null
  const contrat = []
  for (const [cle, l] of parCle) {
    if (l.length > 1) contrat.push(`${cle} créée ${l.length} fois`)
    if (!CONTRAT.fonctions[cle] || CONTRAT.fonctions[cle].migration !== NUM) contrat.push(`${cle} hors contrat de ${NUM}`)
  }
  for (const [cle, spec] of FONCTIONS) {
    const f = F(cle)
    if (!f) { contrat.push(`public.${cle} absente`); continue }
    if (f.erreur) { contrat.push(`public.${cle} : ${f.erreur}`); continue }
    const att = spec.params.map(([n, t]) => [n, typeCanon(t)])
    if (JSON.stringify(f.params) !== JSON.stringify(att)) contrat.push(`public.${cle} : paramètres (${f.params.map((p) => p.join(' ')).join(', ')}), contrat (${att.map((p) => p.join(' ')).join(', ')})`)
    if (f.rend !== typeCanon(spec.rend)) contrat.push(`public.${cle} rend « ${f.rend ?? '?'} », contrat « ${spec.rend} »`)
  }

  for (const x of contrat.filter((y) => /hors contrat|fois/.test(y))) s.echoue(IDS.fichier, x)
  if (/create_secret/i.test(texteM)) s.echoue(IDS.fichier, 'vault.create_secret dans la migration : le secret se pose par l\'écran Vault du tableau de bord, jamais par SQL')
  if (!s.enEchec(IDS.fichier)) s.passe(IDS.fichier, `${ins.length} instructions : pg_cron et pg_net, les deux fonctions et leurs droits, les deux cron.schedule, des commentaires ; aucune chaîne qui ressemble à un secret`)

  // HS-2 — le corps de ops_horloge_minute
  for (const x of contrat.filter((y) => /public.ops_horloge_minute\b/.test(y))) s.echoue(IDS.minute, x)
  const mi = F('ops_horloge_minute')
  if (!mi || mi.erreur) s.echoue(IDS.minute, 'ops_horloge_minute() absente : corps non lu')
  else {
    const c = compacter(mi.corps)
    const iSecret = c.indexOf('decrypted_secret')
    for (const fn of ['ops_baux_expirer', 'ops_decisions_echues']) {
      const re = new RegExp(`begin(?:perform|select)?(?:public\\.)?${fn}\\(\\);exceptionwhen`)
      const m = re.exec(c)
      if (!m) s.echoue(IDS.minute, `${fn}() n'est pas appelée dans son propre bloc begin … exception when …`)
      else if (iSecret >= 0 && m.index > iSecret) s.echoue(IDS.minute, `${fn}() vient après la lecture du secret`)
    }
    if (iSecret < 0 || !c.includes('vault.decrypted_secrets')) s.echoue(IDS.minute, 'le secret n\'est pas lu dans vault.decrypted_secrets')
    if (!c.includes("name='cron_secret'")) s.echoue(IDS.minute, "le secret n'est pas lu par name = 'cron_secret'")
    const iGet = c.indexOf('net.http_get(')
    if (iGet < 0) s.echoue(IDS.minute, 'aucun appel net.http_get')
    const iNull = c.indexOf('returnnull', Math.max(0, iSecret))
    if (iNull < 0 || (iGet >= 0 && iNull > iGet) || /net\.http/.test(c.slice(iSecret, iNull))) s.echoue(IDS.minute, "l'absence du secret ne mène pas à « return null » avant tout appel HTTP")
    if (!c.includes("'horloge_sans_secret'") || !/'1hours?'|'60minutes'/.test(c)) s.echoue(IDS.minute, "sans secret : pas d'événement horloge_sans_secret limité à un par heure")
    const urls = [...mi.corps.matchAll(/'(https?:\/\/[^']*)'/g)].map((x) => x[1])
    if (!urls.includes(URL_TIC)) s.echoue(IDS.minute, `l'URL ne vaut pas exactement ${URL_TIC}`)
    for (const u of urls) if (u !== URL_TIC) s.echoue(IDS.minute, `une autre URL est appelée : ${u}`)
    const to = /timeout_milliseconds(?::=|=>)(\d+)/.exec(c)
    if (!to) s.echoue(IDS.minute, 'timeout_milliseconds n\'est pas explicite (pg_net attend 2 s par défaut)')
    else if (Number(to[1]) < 10000 || Number(to[1]) > 55000) s.echoue(IDS.minute, `timeout_milliseconds ${to[1]} hors de 10 000 à 55 000`)
    if (!c.includes("'authorization','bearer'||")) s.echoue(IDS.minute, "l'en-tête Authorization n'est pas construit par concaténation de 'Bearer '")
  }
  if (!s.enEchec(IDS.minute)) s.passe(IDS.minute, `baux et décisions d'abord, chacun dans son bloc begin … exception ; secret par name = 'cron_secret' ; sans secret : un événement par heure et return null, sans HTTP ; ${URL_TIC} ; timeout explicite ; Authorization par concaténation`)

  // HS-3 — sécurité
  const revokes = genres.filter((x) => x.g === 'revoke'), grants = genres.filter((x) => x.g === 'grant')
  for (const [cle, spec] of FONCTIONS) {
    const f = F(cle)
    if (!f || f.erreur) { s.echoue(IDS.securite, `public.${cle} : non jugée`); continue }
    if (!f.definer) s.echoue(IDS.securite, `public.${cle} n'est pas security definer`)
    const sp = spec.search_path || CONTRAT.regles_fonctions.search_path
    if (!f.searchPath || f.searchPath.join(', ') !== sp) s.echoue(IDS.securite, `public.${cle} : search_path ${f.searchPath ? f.searchPath.join(', ') : 'absent'}, attendu « ${sp} »`)
  }
  if (!revokes.some((x) => x.m[1] === 'ops_horloge_minute' && ROLES_FERMES.every((ro) => rolesApres(x.n, 'from').includes(ro)))) s.echoue(IDS.securite, `ops_horloge_minute : revoke … from ${ROLES_FERMES.join(', ')} absent ou incomplet (exécutable par personne)`)
  if (grants.some((x) => x.m[1] === 'ops_horloge_minute')) s.echoue(IDS.securite, 'ops_horloge_minute : un grant, alors qu\'elle n\'est à personne')
  if (!revokes.some((x) => x.m[1] === 'ops_horloge_etat' && ['public', 'anon', 'authenticated'].every((ro) => rolesApres(x.n, 'from').includes(ro)))) s.echoue(IDS.securite, 'ops_horloge_etat : revoke … from public, anon, authenticated absent ou incomplet')
  if (!grants.some((x) => x.m[1] === 'ops_horloge_etat' && rolesApres(x.n, 'to').includes('service_role'))) s.echoue(IDS.securite, 'ops_horloge_etat : grant execute … to service_role absent')
  for (const x of grants) if (rolesApres(x.n, 'to').some((ro) => ro !== 'service_role')) s.echoue(IDS.securite, `grant à ${rolesApres(x.n, 'to').filter((ro) => ro !== 'service_role').join(', ')} : « ${court(x.n, 80)} »`)
  if (!s.enEchec(IDS.securite)) s.passe(IDS.securite, `security definer et search_path « ${CONTRAT.regles_fonctions.search_path} » ; ops_horloge_minute révoquée aux quatre rôles, sans grant ; ops_horloge_etat à service_role seul`)

  // HS-4 — ops_horloge_etat ne rend jamais le secret
  const et = F('ops_horloge_etat')
  for (const x of contrat.filter((y) => /public.ops_horloge_etat\b/.test(y))) s.echoue(IDS.etat, x)
  if (!et || et.erreur) s.echoue(IDS.etat, 'ops_horloge_etat absente : corps non lu')
  else {
    const hors = decryptedHorsExists(et.corps)
    if (hors.length) s.echoue(IDS.etat, `decrypted_secret hors d'un exists (…) : « ${hors[0]} » — la valeur du secret pourrait entrer dans le jsonb`)
    const c = compacter(et.corps)
    for (const k of CONTRAT.fonctions.ops_horloge_etat.cles) if (!c.includes(`'${k}'`)) s.echoue(IDS.etat, `la clé « ${k} » n'est pas rendue`)
    if (!c.includes('cron.job_run_details')) s.echoue(IDS.etat, 'executions et trous ne sont pas lus dans cron.job_run_details')
    if (!c.includes('net._http_response')) s.echoue(IDS.etat, 'reponses n\'est pas lu dans net._http_response')
  }
  if (!s.enEchec(IDS.etat)) s.passe(IDS.etat, `decrypted_secret seulement dans exists (…) ; les ${CONTRAT.fonctions.ops_horloge_etat.cles.length} clés du contrat ; cron.job_run_details et net._http_response`)

  // HS-5 — les deux cron.schedule
  const sch = genres.filter((x) => x.g === 'schedule').map((x) => {
    const mm = masquer(x.t), i = mm.indexOf('(', mm.toLowerCase().indexOf('cron.schedule')), j = fermante(mm, i)
    return j < 0 ? null : decouperVirgules(x.t.slice(i + 1, j)).map(valeurLitterale)
  })
  if (sch.length !== PLANNINGS.length) s.echoue(IDS.cron, `${sch.length} cron.schedule, ${PLANNINGS.length} attendus`)
  for (const p of PLANNINGS) {
    const a = sch.find((x) => x && x[0] === p.nom)
    if (!a) { s.echoue(IDS.cron, `cron.schedule('${p.nom}', …) absent`); continue }
    if (a.length !== 3) s.echoue(IDS.cron, `${p.nom} : ${a.length} argument(s), 3 attendus (nom, planning, commande)`)
    if (a[1] !== p.planning) s.echoue(IDS.cron, `${p.nom} : planning « ${a[1]} », contrat « ${p.planning} »`)
    if (a[2] === null || normaliser(a[2]).replace(/;$/, '') !== normaliser(p.commande)) s.echoue(IDS.cron, `${p.nom} : commande « ${court(a[2], 80)} », contrat « ${p.commande} »`)
  }
  if (!s.enEchec(IDS.cron)) s.passe(IDS.cron, PLANNINGS.map((p) => `${p.nom} « ${p.planning} »`).join(' et ') + ', commandes du contrat')

  // HS-6 — jumeaux et contrôle
  jugerJumeaux(s, IDS.jumeaux, texteM)
  const C = jugerControleLecture(s, IDS.jumeaux)
  if (C) {
    const points = [
      ['les extensions sont présentes', ['pg_extension', "'pg_cron'", "'pg_net'"]],
      ['les deux tâches existent, actives, presti-agents-tic chaque minute', ['cron.job', "'presti-agents-tic'", "'presti-cron-menage'", 'active', "'*****'"]],
      ['secret_present', ['vault.decrypted_secrets', "'cron_secret'"]],
      ['les deux fonctions sont sécurisées', ['prosecdef', 'proconfig', 'has_function_privilege', 'ops_horloge_minute', 'ops_horloge_etat']],
      ["anon, authenticated et service_role n'exécutent pas ops_horloge_minute", ["'anon'", "'authenticated'", "'service_role'"]],
    ]
    for (const [quoi, tous] of points) { const m = tous.filter((x) => !C.c.includes(compacter(x))); if (m.length) s.echoue(IDS.jumeaux, `${M.controle} ne couvre pas : ${quoi} (manque ${m.join(', ')})`) }
  }
  if (!s.enEchec(IDS.jumeaux)) s.passe(IDS.jumeaux, `jumeaux équivalents ; ${M.controle} en lecture seule : extensions, deux tâches actives, secret_present par exists (…), fonctions sécurisées, droits des trois rôles`)

  // HS-7 — docs/agents/horloge.md
  const D = lireSi(ch(M.doc))
  if (!D) s.echoue(IDS.doc, `${M.doc} ${D === null ? 'absent' : 'vide'}`)
  else {
    const exige = [
      [/Vault/, 'la pose du secret par l\'écran Vault du tableau de bord'], [/cron_secret/, 'le nom cron_secret'],
      [/cron\.unschedule\('presti-agents-tic'\)/, "l'arrêt : select cron.unschedule('presti-agents-tic')"], [/execute_sql/, "l'arrêt et la lecture par Claude Code (execute_sql)"],
      [/ops_horloge_etat/, 'la lecture : ops_horloge_etat'], [/deux endroits/i, 'le rappel « changer aux deux endroits »'],
      [/CRON_SECRET/, 'CRON_SECRET'], [/Vercel/, 'Vercel'], [/401/, 'le 401 d\'un secret différent'],
    ]
    const Dn = D.replace(/\s+/g, ' ') // une phrase peut passer à la ligne
    for (const [re, quoi] of exige) if (!re.test(Dn)) s.echoue(IDS.doc, `${M.doc} ne dit pas ${quoi}`)
    for (const [re, quoi] of [[/vault\.create_secret/i, 'vault.create_secret'], [/SQL Editor/i, '« SQL Editor »'], [/coller/i, '« coller »']]) if (re.test(Dn)) s.echoue(IDS.doc, `${M.doc} contient ${quoi} : Benj n'exécute aucun SQL`)
    const sec = secretsDe(D)
    if (sec.length) s.echoue(IDS.doc, `${M.doc} porte une chaîne qui ressemble à un secret : ${sec.slice(0, 2).join(', ')}`)
  }
  if (!s.enEchec(IDS.doc)) s.passe(IDS.doc, `${M.doc} : pose par l'écran Vault (cron_secret), ni create_secret ni SQL Editor ni « coller » ; arrêt et lecture par Claude Code (execute_sql) ; changer aux deux endroits (401) ; aucune valeur de secret`)
}

// ── Le jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const ids = [...new Set(Object.values(IDS))]
  const s = creerRapport(NOM, ids, { entete: `${NOM} ${NUM} (${M.fiche}) — racine ${aff(racine)}${o.temoin ? ' — témoin : critères de non-régression' : ''}${SANS_ESSAI ? ' — sans essai' : ''}` })
  s.saute(IDS.reel, '--reel seulement, dix minutes après l\'application par Claude Code')
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
        else if (!s.enEchec(IDS.essai)) s.passe(IDS.essai, `témoin : ${M.scenario} se parse (${x.cles.length} clés, dont les ${CLES_HS8.length} du cahier HS-8), ne lit ni le secret ni le Vault ; --generer-essai sur le jumeau d'exemple rend 1 énoncé, ${a.octets} octets`)
      }
    }
    return s.fin()
  }
  const texteM = lireSi(ch(M.fichier))
  if (!texteM) {
    s.echoue(IDS.fichier, texteM === null ? `migration absente : ${M.fichier} (racine ${aff(racine)})` : `migration vide (0 octet) : ${M.fichier}`)
    for (const id of ids) if (![IDS.fichier, IDS.nr, IDS.reel].includes(id)) s.echoue(id, `non jugé : la migration manque (${IDS.fichier})`)
  } else {
    juger0101(s, texteM)
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
  console.error(`-- ${NOM} : essai à sec de ${NUM}${AVEC.length ? ` (précédé de ${[...AVEC].sort().join(', ')})` : ''}, empreinte ${empreinte(nu).slice(0, 12)}… ; après l'exécution : ${M.apres} → « APRES rien_ne_reste=<valeur> » dans ${M.essai_a_sec}`)
  process.exit(0)
}

// ── --reel ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Seulement des nombres et des codes HTTP. Jamais process.exit() après un fetch (Windows : libuv).
class Prealable extends Error {}
/** « reponses » (nombre de réponses par code HTTP) en Map(code → nombre), qu'il vienne en objet ou en tableau. */
function lireReponses(x) {
  const out = new Map()
  const ajouter = (code, n) => { const c = Number(code), k = Number(n); if (Number.isInteger(c) && Number.isFinite(k)) out.set(c, (out.get(c) || 0) + k) }
  if (Array.isArray(x)) for (const e of x) { if (e && typeof e === 'object') ajouter(e.code ?? e.status_code ?? e.statut ?? e.http, e.n ?? e.nombre ?? e.count ?? e.total) }
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) ajouter(k, v)
  return out
}
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
  const e = await rpc('ops_horloge_etat', { p_minutes: 10 }, cles.service)
  if (e.status === 0) throw new Prealable('PostgREST injoignable')
  if (e.status === 404 && e.j?.code === 'PGRST202') throw new Prealable(`ops_horloge_etat inconnue de PostgREST : 0101 n'est pas appliquée (${code(e)})`)
  const rep = e.ok && e.j && typeof e.j === 'object' ? lireReponses(e.j.reponses) : new Map()
  if (rep.get(404)) throw new Prealable(`le tic répond 404 (${rep.get(404)} fois en 10 min) : busAgents baissé ou route du tic non déployée`)
  const s = creerRapport(NOM, [id], { entete: `${NOM} ${NUM} (${M.fiche}) — --reel, ops_horloge_etat(10)` })
  s.verdict(id, e.ok && e.j && typeof e.j === 'object', `ops_horloge_etat(10) avec la clé de service (${code(e)})`, `ops_horloge_etat(10) refusée (${code(e)})`)
  if (e.ok && e.j && typeof e.j === 'object') {
    s.verdict(id, e.j.job_actif === true, 'job_actif', `job_actif : ${JSON.stringify(e.j.job_actif ?? null)}`)
    s.verdict(id, e.j.secret_present === true, 'secret_present', `secret_present : ${JSON.stringify(e.j.secret_present ?? null)} (le secret cron_secret se pose par l'écran Vault)`)
    const ok = Number(e.j.executions?.reussies)
    s.verdict(id, ok >= 8, `${ok} exécutions réussies en 10 min`, `${Number.isFinite(ok) ? ok : '?'} exécution(s) réussie(s) en 10 min (8 au moins)`)
    s.verdict(id, (rep.get(200) || 0) > 0, `${rep.get(200)} réponse(s) 200`, `aucune réponse 200 (codes : ${[...rep.keys()].join(', ') || 'aucun'})`)
    s.verdict(id, !rep.get(401), 'aucune réponse 401', `${rep.get(401)} réponse(s) 401 : ${MESSAGE_401}`)
  }
  const a = await rpc('ops_horloge_etat', { p_minutes: 10 }, cles.anon)
  s.verdict(id, !a.ok && a.status !== 0, `ops_horloge_etat refusée avec la clé anonyme (${code(a)})`, `ops_horloge_etat ${a.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anonyme (${code(a)})`)
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
