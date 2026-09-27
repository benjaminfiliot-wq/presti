#!/usr/bin/env node
// scripts/prospection-sql-qa.mjs — le juge SQL de la migration 0099 (la garde des envois tenue par la base, fiche 026-034) ;
// écrit par Claude Code (fiche 026-032) AVANT la migration qu'il juge, que son exécutant ne peut pas modifier.
//
// Depuis le 14/09, la connexion directe à la base est refusée : le juge ne lance aucun SQL. Il juge en trois temps :
//   1. la lecture statique de la migration, de ses deux jumeaux et de son contrôle, contre le contrat machine
//      scripts/fixtures/026-horloge-bus/contrat-ops.json (fonctions, codes d'erreur) et le cahier PG de 026-034 ;
//   2. l'essai à sec, qu'il GÉNÈRE lui-même (--generer-essai) et dont il relit le compte rendu recopié par Claude Code dans
//      .orchestre/preuves/026-034/essai-a-sec.txt (empreinte du jumeau courant, APRES rien_ne_reste=true, chaque clé du
//      scénario scripts/fixtures/026-horloge-bus/essais/0099.sql à true) ;
//   3. --reel, après l'application par Claude Code (apply_migration) : ops_garde_etat() par PostgREST, sans rien insérer.
//
// Critères (cahier PG de 026-034 ; une ligne par critère, « PASS|FAIL|SAUTE <id> — … », puis « prospection-sql-qa : PASS »
// ou « … : FAIL — ids ») :
//   PG-1 fichier et liste permise · PG-2 fonctions du contrat, aucune qui retire une opposition ni n'écrit les interrupteurs ·
//   PG-3 sécurité · PG-4 lecture du corps de ops.garde_envois() (les dix-neuf codes de la voie gratuite, verrous, heure de
//   Paris, opposition active, branche « envoye » sans refus) · PG-5 jumeaux et contrôle · PG-6 essai à sec ·
//   PG-7 non-régression · PG-8 --reel.
//
// Usage :
//   node scripts/prospection-sql-qa.mjs [--racine=<dossier>] [--sans-essai]
//        le verdict. --sans-essai (mutations seulement : une copie mutée n'a pas d'essai à elle) note PG-6 « sauté ».
//   node scripts/prospection-sql-qa.mjs --temoin
//        les seuls critères de non-régression : PG-7, et la part de PG-6 qui ne dépend pas de la migration (le scénario se
//        parse, porte toutes les clés du cahier, ne nomme ni boîte ni le canal 'email', et --generer-essai rend un bloc valide
//        sur le jumeau d'exemple). Les critères de fabrication sont « sautés ».
//   node scripts/prospection-sql-qa.mjs --generer-essai [--avec=0096,0097,0098] [--racine=<dossier>]
//        le bloc `do $essai_026$ … $essai_026$;` sur la sortie standard (jumeaux de --avec d'abord, puis celui de 0099) ;
//        la requête « après » part sur la sortie d'erreur. Code 2 si un jumeau manque.
//   node scripts/prospection-sql-qa.mjs --reel
//        PostgREST (.env.local chargé sans rien afficher) ; code 2 si un préalable manque (clés absentes, 0099 pas appliquée).
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide ou préalable manquant. N'écrit que sous
// .orchestre/travail/prospection-sql-qa/. N'affiche aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  R, MARQUE_CONTROLE, instructions, normaliser, codeSeul, seParse, segments, masquer, fermante, decouperVirgules, compacter,
  serrer, jumeauNuCoupe, empreinte, blocEssai, analyserEssai, clesScenario, lireCompteRendu, nonRegression, creerRapport,
  lireEnvLocal, dossierTravail, court, lf, JUMEAU_EXEMPLE,
} from './lib/sql-essai.mjs'
import { lireOptionsOuQuitter } from './fixtures/025/commun.mjs'

const NOM = 'prospection-sql-qa'
const NUM = '0099'
const CONTRAT_F = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const CONTRAT = JSON.parse(fs.readFileSync(path.join(R, CONTRAT_F), 'utf8'))
const M = {
  fiche: '026-034',
  fichier: 'supabase/migrations/0099_ops_garde_envois.sql',
  jumeau: 'supabase/migrations/_A_COLLER_sql_editor_0099.sql',
  nu: 'supabase/migrations/_A_COLLER_sql_editor_0099_NU.sql',
  controle: 'supabase/controles/0099_ops_garde_envois.sql',
  essai_a_sec: '.orchestre/preuves/026-034/essai-a-sec.txt',
  scenario: 'scripts/fixtures/026-horloge-bus/essais/0099.sql',
  apres: "select to_regprocedure('public.ops_garde_etat()') is null as rien_ne_reste",
}
const AVANT = ['0096', '0097', '0098'] // les migrations que --avec peut placer avant 0099
const IDS = { fichier: 'PG-1', contrat: 'PG-2', securite: 'PG-3', corps: 'PG-4', jumeaux: 'PG-5', essai: 'PG-6', nr: 'PG-7', reel: 'PG-8' }
const ROLES_FERMES = ['public', 'anon', 'authenticated', 'service_role']

// Les dix-neuf codes de la voie gratuite du 25/09 (« Place dans la série » de 026-032, PG-4 de 026-034), exactement.
const CODES_VOIE_GRATUITE = ['pause_generale', 'opposition', 'confirmation_stop', 'rgpd_hors_demande', 'envoi_froid_ferme', '90_jours', 'relance_sans_contact', '3_messages', '72_heures', 'quota_absent', 'quota', 'quota_nouveaux', 'quota_reponses', 'verdicts', 'formulaire_deja', 'relance_formulaire', 'froid_email_interdit', 'preuve_demande_absente', 'relance_sollicitee']

// Les clés d'essai du cahier PG-6 : le scénario doit toutes les porter (il peut en porter d'autres, jamais moins).
const CLES_PG6 = [
  // envoi à froid fermé
  'froid_ferme_formulaire_refuse', 'froid_ferme_lien_maquette_email_passe', 'froid_ferme_essai_e2e_passe',
  // formulaire (voie gratuite)
  'formulaire_cinq_passent', 'formulaire_sixieme_refuse', 'formulaire_nouveaux_sixieme_quota_nouveaux', 'formulaire_deja_meme_siren',
  'formulaire_deja_meme_domaine', 'formulaire_relance_refusee', 'formulaire_autre_type_refuse',
  // Gmail sollicité
  'email_premier_contact_interdit', 'email_sans_preuve_refuse', 'email_preuve_autre_prospect_refusee', 'email_preuve_inconnue_refusee',
  'email_avec_preuve_passe', 'email_cinquante_passent', 'email_51e_quota',
  // relances
  'relance_sans_contact', 'relance_73h_passe', 'seconde_relance_sollicitee', 'relance_71h_refusee',
  'relance_moins_72h_dernier_envoi_sollicitee', 'relance_avant_oui_sollicitee', 'relance_trois_envois_3_messages',
  // autres plafonds
  'instagram_zero_refuse_premier_contact', 'quota_absent_refuse', 'palier_plein_lien_maquette_email_passe', 'palier_plein_reponse_email_passe',
  'email_hors_palier', 'messagerie_cent_passent', 'messagerie_101e_refuse', 'saute_libere_une_place', 'perime_libere_une_place',
  // verdicts
  'verdicts_sans_j2_refuse', 'verdicts_redacteur_refuse', 'verdicts_complets_acceptes', 'approuve_le_pose',
  'premier_contact_j1_sans_objet_refuse', 'lien_maquette_j1_sans_objet_accepte',
  // opposition
  'opposition_annule_prepare', 'opposition_epargne_confirmation_stop', 'opposition_refuse_nouvel_envoi', 'opposition_refuse_lien_maquette',
  'confirmation_stop_passe_une_fois', 'confirmation_stop_seconde_refusee', 'opposition_expiree_ne_refuse_plus', 'opposition_temporaire_active_refuse',
  // 90 jours
  'premier_contact_10_jours_refuse', 'premier_contact_91_jours_passe', 'lien_maquette_1_jour_passe',
  // pause générale
  'pause_refuse_prepare', 'pause_refuse_lien_maquette', 'pause_envoye_passe', 'pause_envoye_evenement_hors_regle',
  'prepare_vers_envoye_evenement_hors_regle', 'hors_regle_sans_donnee_personnelle',
  // filet des réponses
  'reponses_trois_passent', 'reponse_quatrieme_quota_reponses', 'reponses_vingt_jour_passent', 'reponse_21e_quota_reponses', 'reponse_veille_non_comptee',
  // réponse RGPD
  'reponse_rgpd_trois_passent', 'reponse_rgpd_4e_refusee', 'reponse_rgpd_sans_demande_refusee',
  // ops_garde_etat et droits
  'garde_etat_declencheurs_actifs', 'garde_etat_interrupteurs', 'garde_etat_plafonds', 'garde_etat_du_jour', 'garde_etat_sans_donnee_prospect',
  'anon_refuse_garde_etat', 'authenticated_refuse_garde_etat',
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
if (CONTRAT.migrations?.[NUM]?.fiche !== M.fiche) refuser(`${CONTRAT_F} ne donne pas ${NUM} à ${M.fiche} : le contrat a changé, le juge doit être relu`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const listeTxt = (a, n = 6) => `${a.slice(0, n).join(', ')}${a.length > n ? ` (et ${a.length - n} autre(s))` : ''}`
const nuDe = (n) => CONTRAT.migrations[n]?.nu || `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`

// ── Lecture des fonctions (paramètres, type rendu, en-tête, corps) ─────────────────────────────────────────────────────
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
/** { schema, nom, params, rend, corps, entete (normalisé, corps remplacé par $$), definer, searchPath } ou { erreur }. */
function parserFonction(ins) {
  const m = /^create (or replace )?function ([a-z_]+)\.([a-z0-9_]+)\(/.exec(ins.n)
  if (!m) return null
  const t = ins.t, mm = masquer(t)
  const i = mm.indexOf('('), j = fermante(mm, i)
  const base = { schema: m[2], nom: m[3], orReplace: !!m[1], cle: m[2] === 'public' ? m[3] : `${m[2]}.${m[3]}` }
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
  if (r) {
    const apres = r[1]
    if (/^table\(/.test(apres)) rend = apres.slice(0, fermante(apres, apres.indexOf('(')) + 1).replace(/\s+/g, ' ')
    else rend = typeCanon(apres.split(/ (?:language|as|security|set|stable|immutable|volatile|strict|leakproof|parallel|cost|rows|called)\b/)[0])
  }
  const sp = /set search_path (?:=|to) ([^ ,]+(?:, [^ ,]+)*)/.exec(entete)
  return { ...base, params, rend, corps, entete, definer: /\bsecurity definer\b/.test(entete), searchPath: sp ? sp[1].split(', ').map((x) => x.replace(/^['"]|['"]$/g, '')) : null }
}
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) }))
function rolesApres(n, mot) {
  const i = n.lastIndexOf(` ${mot} `)
  if (i < 0) return []
  return n.slice(i + mot.length + 2).split(',').map((x) => x.trim().replace(/\s+(cascade|restrict)$/, '').replace(/"/g, '')).filter(Boolean)
}
/** La branche d'un « if <cond> then … » ouverte à l'indice `i` du corps : [début, fin[ jusqu'au elsif, else ou end if du même niveau. */
function brancheSi(corps, i) {
  const m = masquer(corps).toLowerCase()
  const re = /\b(end\s+if|then|if|elsif|else)\b/g
  re.lastIndex = i
  let t = null
  for (let x = re.exec(m); x; x = re.exec(m)) if (x[1] === 'then') { t = x.index + 4; break }
  if (t === null) return null
  re.lastIndex = t
  let prof = 0
  for (let x = re.exec(m); x; x = re.exec(m)) {
    const k = x[1].replace(/\s+/g, ' ')
    if (k === 'if') prof++
    else if (k === 'end if') { if (prof === 0) return [t, x.index]; prof-- }
    else if ((k === 'elsif' || k === 'else') && prof === 0) return [t, x.index]
  }
  return null
}
/** Les valeurs de « canal » comparées ou listées dans un texte SERRÉ : canal='x', canal<>'x', canal in('x','y'). */
function valeursCanal(sr) {
  const out = []
  for (const x of sr.matchAll(/(?<![\w])(?:[a-z_]+\.)?canal ?(?:=|<>|!=) ?'([^']*)'/g)) out.push(x[1])
  for (const x of sr.matchAll(/(?<![\w])(?:[a-z_]+\.)?canal (?:not )?in\(([^)]*)\)/g)) out.push(...x[1].split(',').map((v) => v.trim().replace(/^'|'$/g, '')))
  return out
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
/** Le contrôle : lecture seule, « oui ». Rend sa forme compacte, ou null. */
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
/** Ce que le scénario doit être, avec ou sans migration : il se parse, porte les clés du cahier, ne nomme ni boîte ni 'email'. */
function lireScenario(s, id) {
  const sc = lireSi(path.join(R, M.scenario))
  if (!sc) { s.echoue(id, `scénario ${sc === null ? 'absent' : 'vide'} : ${M.scenario}`); return null }
  const p = seParse(sc)
  if (!p.ok) s.echoue(id, `${M.scenario} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`)
  const cles = clesScenario(sc)
  const perdues = CLES_PG6.filter((c) => !cles.includes(c))
  if (perdues.length) s.echoue(id, `${M.scenario} a perdu ${perdues.length} clé(s) du cahier PG-6 : ${listeTxt(perdues)}`)
  const brut = sansCommentairesSql(sc)
  if (/boite_/i.test(brut)) s.echoue(id, `${M.scenario} nomme une boîte boite_… : il n'y en a plus (voie gratuite du 25/09)`)
  if (/'email'/i.test(brut)) s.echoue(id, `${M.scenario} porte la valeur 'email' : le canal n'existe plus (voie gratuite du 25/09)`)
  return { sc, cles }
}
/** Le texte sans ses commentaires, y compris ceux des corps $tag$ (le tokenizer de sql-nu.mjs n'entre pas dans ces corps). */
function sansCommentairesSql(t, prof = 0) {
  return segments(lf(t)).filter((x) => x.type !== 'commentaire').map((x) => (x.type === 'dollar' && x.ferme && prof < 4 ? `$${x.tag}$${sansCommentairesSql(x.corps, prof + 1)}$${x.tag}$` : x.texte)).join('')
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

// ── PG-1 à PG-5 : la lecture de 0099 ─────────────────────────────────────────────────────────────────────────────────────
const FONCTIONS = Object.entries(CONTRAT.fonctions).filter(([, f]) => f.migration === NUM) // ops.garde_envois, ops.annuler_sur_opposition, ops_garde_etat
const GENRES = [
  ['fonction', /^create or replace function (ops|public)\.[a-z0-9_]+\(/],
  ['drop_trigger', /^drop trigger if exists ([a-z0-9_]+) on ops\.(envois|opposition)$/],
  ['trigger', /^create (or replace )?trigger ([a-z0-9_]+) /],
  ['revoke', /^revoke (?:all|execute)(?: privileges)? on function (ops|public)\.([a-z0-9_]+)\b/],
  ['grant', /^grant execute on function (ops|public)\.([a-z0-9_]+)\b/],
  ['commentaire', /^comment on (function|trigger) /],
]
const DECL = {
  'ops.garde_envois': /^create (?:or replace )?trigger ([a-z0-9_]+) before (?:insert or update of statut|update of statut or insert) on ops\.envois for each row (?:when ?\(.*\) )?execute (?:function|procedure) ops\.garde_envois\(\)$/,
  'ops.annuler_sur_opposition': /^create (?:or replace )?trigger ([a-z0-9_]+) after (?:insert or update of expire_le|update of expire_le or insert) on ops\.opposition for each row (?:when ?\(.*\) )?execute (?:function|procedure) ops\.annuler_sur_opposition\(\)$/,
}
function juger0099(s, texteM) {
  const ins = lireInstructions(texteM)
  const genres = ins.map((x) => { for (const [g, re] of GENRES) { const m = re.exec(x.n); if (m) return { ...x, g, m } } return { ...x, g: null } })
  // PG-1 — le fichier et la liste permise
  if (!ins.length) s.echoue(IDS.fichier, `${M.fichier} ne porte aucune instruction`)
  for (const x of genres) if (!x.g) s.echoue(IDS.fichier, `instruction hors de la liste du point 1 (fonctions, déclencheurs, droits, commentaires) : « ${court(x.n, 100)} »`)
  const cs = codeSeul(texteM)
  for (const [quoi, re] of [['create table', /\bcreate (unlogged )?table\b/], ['alter table', /\balter table\b/], ['drop table', /\bdrop table\b/], ['create extension', /\bcreate extension\b/], ['create policy', /\bcreate policy\b/], ['create schema', /\bcreate schema\b/]]) {
    if (re.test(cs)) s.echoue(IDS.fichier, `« ${quoi} » : 0099 ne crée aucune table et ne modifie aucune colonne`)
  }
  if (!s.enEchec(IDS.fichier)) s.passe(IDS.fichier, `${ins.length} instructions : les fonctions, leurs déclencheurs (drop trigger if exists puis create trigger), les droits et des commentaires ; aucune table, aucune colonne`)

  // PG-2 — les fonctions du contrat, et elles seules
  const fonctions = genres.filter((x) => x.g === 'fonction').map((x) => parserFonction(x))
  const parCle = new Map()
  for (const f of fonctions) parCle.set(f.cle, [...(parCle.get(f.cle) || []), f])
  for (const [cle, l] of parCle) {
    if (l.length > 1) s.echoue(IDS.contrat, `${cle} créée ${l.length} fois`)
    if (!CONTRAT.fonctions[cle] || CONTRAT.fonctions[cle].migration !== NUM) s.echoue(IDS.contrat, `${cle} hors contrat de ${NUM} : le contrat est la seule porte`)
    if (/opposition/.test(cle) && /retir/.test(cle)) s.echoue(IDS.contrat, `${cle} : une fonction qui retire une opposition est interdite`)
  }
  const F = (cle) => parCle.get(cle)?.[0] || null
  for (const [cle, spec] of FONCTIONS) {
    const f = F(cle)
    if (!f) { s.echoue(IDS.contrat, `${cle} absente (contrat : ${court(spec.contrat, 80)})`); continue }
    if (f.erreur) { s.echoue(IDS.contrat, `${cle} : ${f.erreur}`); continue }
    if (f.schema !== spec.schema) s.echoue(IDS.contrat, `${cle} dans le schéma ${f.schema}, contrat ${spec.schema}`)
    const att = spec.params.map(([n, t]) => [n, typeCanon(t)])
    if (JSON.stringify(f.params) !== JSON.stringify(att)) s.echoue(IDS.contrat, `${cle} : paramètres (${f.params.map((p) => p.join(' ')).join(', ')}), contrat (${att.map((p) => p.join(' ')).join(', ')})`)
    if (f.rend !== typeCanon(spec.rend)) s.echoue(IDS.contrat, `${cle} rend « ${f.rend ?? '?'} », contrat « ${spec.rend} »`)
  }
  for (const f of fonctions) {
    if (f.erreur) continue
    const c = compacter(f.corps)
    if (/\bdelete from ops\.opposition\b/.test(serrer(f.corps))) s.echoue(IDS.contrat, `${f.cle} efface dans ops.opposition : aucune fonction ne retire une opposition`)
    if (/(insertintoops\.interrupteurs|updateops\.interrupteurs|deletefromops\.interrupteurs|ops_interrupteur_poser\()/.test(c)) s.echoue(IDS.contrat, `${f.cle} écrit dans ops.interrupteurs : 0099 n'ouvre ni ne ferme rien`)
  }
  const etat = F('ops_garde_etat')
  if (etat && !etat.erreur) {
    const c = compacter(etat.corps)
    for (const k of CONTRAT.fonctions.ops_garde_etat.cles) if (!c.includes(`'${k}'`)) s.echoue(IDS.contrat, `ops_garde_etat ne rend pas la clé « ${k} »`)
    for (const k of ['envois', 'nouveaux']) if (!c.includes(`'${k}'`)) s.echoue(IDS.contrat, `ops_garde_etat : du_jour sans le compteur « ${k} »`)
    if (!c.includes('tgenabled')) s.echoue(IDS.contrat, 'ops_garde_etat ne lit pas pg_trigger.tgenabled')
    if (!c.includes("attimezone'europe/paris'")) s.echoue(IDS.contrat, 'ops_garde_etat : le jour des compteurs ne se calcule pas à l\'heure de Paris')
    if (/\bops\.prospects\b|destinataire/.test(serrer(etat.corps))) s.echoue(IDS.contrat, 'ops_garde_etat lit ops.prospects ou un destinataire : aucune donnée de prospect')
  }
  const annul = F('ops.annuler_sur_opposition')
  if (annul && !annul.erreur) {
    const c = compacter(annul.corps)
    if (!/statut='annule'/.test(c)) s.echoue(IDS.contrat, 'ops.annuler_sur_opposition ne passe aucun envoi en annule')
    if (!c.includes("'confirmation_stop'")) s.echoue(IDS.contrat, 'ops.annuler_sur_opposition n\'épargne pas la confirmation_stop')
    if (!(c.includes("'prepare'") && c.includes("'approuve'"))) s.echoue(IDS.contrat, 'ops.annuler_sur_opposition ne vise pas les envois prepare et approuve')
    if (/updateops\.prospects\b/.test(c)) s.echoue(IDS.contrat, 'ops.annuler_sur_opposition change le prospect : son étape appartient à la série acquisition (acq_opposer)')
  }
  if (!s.enEchec(IDS.contrat)) s.passe(IDS.contrat, `${FONCTIONS.length} fonctions du contrat (schéma, paramètres, type rendu), aucune autre ; ni retrait d'opposition ni écriture des interrupteurs ; ops_garde_etat rend ${CONTRAT.fonctions.ops_garde_etat.cles.join(', ')} sans donnée de prospect`)

  // PG-3 — sécurité
  if (etat && !etat.erreur) {
    if (!etat.definer) s.echoue(IDS.securite, 'ops_garde_etat n\'est pas security definer')
    const sp = CONTRAT.fonctions.ops_garde_etat.search_path || CONTRAT.regles_fonctions.search_path
    if (!etat.searchPath || etat.searchPath.join(', ') !== sp) s.echoue(IDS.securite, `ops_garde_etat : search_path ${etat.searchPath ? etat.searchPath.join(', ') : 'absent'}, attendu « ${sp} »`)
  } else s.echoue(IDS.securite, 'ops_garde_etat absente : non jugée')
  const revokes = genres.filter((x) => x.g === 'revoke'), grants = genres.filter((x) => x.g === 'grant')
  const revoque = (sch, nom, roles) => revokes.some((x) => x.m[1] === sch && x.m[2] === nom && roles.every((ro) => rolesApres(x.n, 'from').includes(ro)))
  if (!revoque('public', 'ops_garde_etat', ['public', 'anon', 'authenticated'])) s.echoue(IDS.securite, 'ops_garde_etat : revoke … from public, anon, authenticated absent ou incomplet')
  if (!grants.some((x) => x.m[2] === 'ops_garde_etat' && rolesApres(x.n, 'to').includes('service_role'))) s.echoue(IDS.securite, 'ops_garde_etat : grant execute … to service_role absent')
  for (const nom of ['garde_envois', 'annuler_sur_opposition']) {
    if (!revoque('ops', nom, ROLES_FERMES)) s.echoue(IDS.securite, `ops.${nom} : revoke … from ${ROLES_FERMES.join(', ')} absent ou incomplet (exécutable par aucun des quatre rôles)`)
    if (grants.some((x) => x.m[2] === nom)) s.echoue(IDS.securite, `ops.${nom} : un grant sur une fonction de déclencheur`)
  }
  for (const x of grants) if (rolesApres(x.n, 'to').some((ro) => ro !== 'service_role')) s.echoue(IDS.securite, `grant à ${rolesApres(x.n, 'to').filter((ro) => ro !== 'service_role').join(', ')} : « ${court(x.n, 80)} »`)
  if (/\bgrant\b/.test(cs.replace(/grant execute on function public\.ops_garde_etat(\(\))? to service_role/g, ''))) s.echoue(IDS.securite, 'un grant autre que « grant execute on function public.ops_garde_etat() to service_role »')
  if (!s.enEchec(IDS.securite)) s.passe(IDS.securite, `ops_garde_etat security definer, search_path « ${CONTRAT.fonctions.ops_garde_etat.search_path} », service_role seul ; les deux fonctions de déclencheur révoquées à ${ROLES_FERMES.join(', ')}, sans grant`)

  // PG-4 — les déclencheurs et le corps de ops.garde_envois()
  const drops = new Map()
  genres.forEach((x, i) => { if (x.g === 'drop_trigger') drops.set(x.m[1], i) })
  for (const [cle, re] of Object.entries(DECL)) {
    const k = genres.findIndex((x) => x.g === 'trigger' && re.test(x.n))
    if (k < 0) { s.echoue(IDS.corps, `déclencheur de ${cle} absent ou non conforme (contrat : ${CONTRAT.fonctions[cle].declencheur})`); continue }
    const x = genres[k], nomT = re.exec(x.n)[1]
    if (!/^create or replace trigger /.test(x.n) && !(drops.has(nomT) && drops.get(nomT) < k)) s.echoue(IDS.corps, `create trigger ${nomT} sans « drop trigger if exists ${nomT} » avant lui : la migration n'est pas rejouable`)
  }
  const g = F('ops.garde_envois')
  if (!g || g.erreur) s.echoue(IDS.corps, 'ops.garde_envois() absente : corps non lu')
  else {
    const c = compacter(g.corps), sr = serrer(g.corps)
    if (!/new\.statut (?:not )?in\('(?:prepare','approuve|approuve','prepare)'\)|new\.statut=any\(array\['(?:prepare','approuve|approuve','prepare)'\]\)/.test(sr)) s.echoue(IDS.corps, "la condition d'entrée ne porte pas sur new.statut in ('prepare','approuve')")
    const me = /new\.statut\s*(?:=\s*'envoye'|in\s*\(\s*'envoye'\s*\))/i.exec(g.corps)
    if (!me) s.echoue(IDS.corps, "branche « new.statut = 'envoye' » introuvable : le passage à envoye doit être consigné sans refus")
    else {
      const b = brancheSi(g.corps, me.index)
      if (!b) s.echoue(IDS.corps, "branche « envoye » illisible (if … then … end if)")
      else if (/\braise\b(?!\s+(?:notice|warning|log|debug|info)\b)/.test(masquer(g.corps.slice(b[0], b[1])).toLowerCase())) s.echoue(IDS.corps, 'la branche « envoye » lève une exception : le passage à envoye n\'est jamais refusé')
      else if (!g.corps.slice(b[0], b[1]).includes('envoi_hors_regle')) s.echoue(IDS.corps, 'la branche « envoye » n\'écrit pas l\'événement envoi_hors_regle')
    }
    const codes = [...new Set([...c.matchAll(/raise[^;]*?'ops:([a-z0-9_]+)'/g)].map((x) => x[1]))]
    const manquants = CODES_VOIE_GRATUITE.filter((k) => !codes.includes(k))
    if (manquants.length) s.echoue(IDS.corps, `code(s) jamais levé(s) par un raise : ${manquants.map((k) => `ops:${k}`).join(', ')}`)
    const autres = codes.filter((k) => !CODES_VOIE_GRATUITE.includes(k))
    if (autres.length) s.note(`${IDS.corps} : code(s) levé(s) en plus des dix-neuf (signalés, sans échec) : ${autres.map((k) => `ops:${k}`).join(', ')}`)
    for (const [code, verrou] of [['quota', "hashtext('ops:quota:'||new.canal)"], ['quota_nouveaux', "hashtext('ops:quota:'||new.canal)"], ['quota_reponses', "hashtext('ops:reponses:'||new.envoyeur)"], ['formulaire_deja', "hashtext('ops:formulaire:'||"]]) {
      const iv = c.indexOf(`pg_advisory_xact_lock(${verrou}`)
      const ir = c.search(new RegExp(`raise[^;]*?'ops:${code}'`))
      if (iv < 0) { s.echoue(IDS.corps, `verrou « pg_advisory_xact_lock(${verrou}…) » absent`); continue }
      if (ir < 0) continue
      const lecture = c.lastIndexOf('fromops.envois', ir)
      if (lecture >= 0 && lecture < iv) s.echoue(IDS.corps, `ops:${code} : le comptage dans ops.envois vient avant le verrou (${verrou}…)`)
    }
    if (!c.includes("attimezone'europe/paris'")) s.echoue(IDS.corps, "le jour ne se calcule pas « at time zone 'Europe/Paris' »")
    if (!c.includes("envoyeur='*'")) s.echoue(IDS.corps, "la ligne (canal, '*') n'est pas lue : un canal sans plafond doit être fermé (ops:quota_absent)")
    if (!(c.includes('to_jsonb(new)') && c.includes('preuve_demande'))) s.echoue(IDS.corps, 'preuve_demande n\'est pas lue par to_jsonb(new) (0099 doit marcher avant 0106)')
    if (!/expire_le is null or [a-z_.]*expire_le>now\(\)|expire_le>now\(\) or [a-z_.]*expire_le is null|coalesce\([a-z_.]*expire_le,'infinity'(?:::timestamptz)?\)>now\(\)/.test(sr)) s.echoue(IDS.corps, "l'opposition lue n'est pas l'opposition active (expire_le is null or expire_le > now())")
    for (const [quoi, re] of [['90 jours', /'90days?'/], ['72 heures', /'72hours?'/], ['24 heures', /'24hours?'/], ['35 jours', /'35days?'/]]) if (!re.test(c)) s.echoue(IDS.corps, `l'intervalle de ${quoi} n'est pas écrit`)
  }
  const brut = sansCommentairesSql(texteM)
  if (/boite_/i.test(brut)) s.echoue(IDS.corps, 'boite_ dans la migration : les règles par boîte sont retirées (voie gratuite du 25/09)')
  const canaux = valeursCanal(serrer(brut))
  if (canaux.includes('email') || /\('email',\s*'\*'/.test(brut)) s.echoue(IDS.corps, "le canal 'email' est nommé : il n'existe plus (voie gratuite du 25/09)")
  if (!s.enEchec(IDS.corps)) s.passe(IDS.corps, `déclencheurs du contrat, rejouables ; entrée sur prepare et approuve ; branche envoye sans refus, avec envoi_hors_regle ; les ${CODES_VOIE_GRATUITE.length} codes levés ; verrous avant comptage ; heure de Paris ; ligne '*' ; preuve_demande par to_jsonb(new) ; opposition active ; ni boite_ ni canal 'email'`)

  // PG-5 — jumeaux et contrôle
  jugerJumeaux(s, IDS.jumeaux, texteM)
  const cC = jugerControleLecture(s, IDS.jumeaux)
  if (cC !== null) {
    const points = [
      ['les deux déclencheurs existent et sont actifs', ['pg_trigger', 'tgenabled', 'garde_envois', 'annuler_sur_opposition']],
      ["(instagram, *), (facebook, *) et (formulaire_site, *) à 0, (email_sollicite, *) à 50", ['quotas_canaux', "'instagram'", "'facebook'", "'formulaire_site'", "'email_sollicite'", '50']],
      ['envoi_froid fermé', ['interrupteurs', "'envoi_froid'"]],
      ['ops_garde_etat sécurisée comme en 0097', ['ops_garde_etat', 'prosecdef', 'proconfig', 'search_path', 'has_function_privilege']],
      ["anon et authenticated n'exécutent rien de 0099", ["'anon'", "'authenticated'"]],
    ]
    for (const [quoi, tous] of points) { const m = tous.filter((x) => !cC.includes(compacter(x))); if (m.length) s.echoue(IDS.jumeaux, `${M.controle} ne couvre pas : ${quoi} (manque ${m.join(', ')})`) }
  }
  if (!s.enEchec(IDS.jumeaux)) s.passe(IDS.jumeaux, `jumeaux équivalents (sql-nu --verifier, nu régénéré à l'identique) ; ${M.controle} en lecture seule, couvre déclencheurs, plafonds, envoi_froid, ops_garde_etat et droits d'anon et authenticated`)
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
        else if (!s.enEchec(IDS.essai)) s.passe(IDS.essai, `témoin : ${M.scenario} se parse (${x.cles.length} clés, dont les ${CLES_PG6.length} du cahier PG-6), sans boite_ ni 'email' ; --generer-essai sur le jumeau d'exemple rend 1 énoncé, ${a.octets} octets`)
      }
    }
    return s.fin()
  }
  const texteM = lireSi(ch(M.fichier))
  if (!texteM) {
    s.echoue(IDS.fichier, texteM === null ? `migration absente : ${M.fichier} (racine ${aff(racine)})` : `migration vide (0 octet) : ${M.fichier}`)
    for (const id of ids) if (![IDS.fichier, IDS.nr, IDS.reel].includes(id)) s.echoue(id, `non jugé : la migration manque (${IDS.fichier})`)
  } else {
    juger0099(s, texteM)
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
// Jamais process.exit() après un fetch (Windows : libuv tombe si l'on ferme pendant que les sockets se referment).
class Prealable extends Error {}
const valeurBool = (v) => (typeof v === 'boolean' ? v : v === 'O' || v === 'A' || v === 'R' ? true : v === 'D' ? false : null)
/** L'état (booléen) associé à `nom` dans un objet { nom: bool } ou un tableau [{ nom, actif }] ; null si introuvable. */
function etatNomme(x, nom) {
  const champs = ['actif', 'active', 'enabled', 'tgenabled']
  const dans = (e) => { for (const k of champs) if (e && typeof e === 'object' && k in e) { const b = valeurBool(e[k]); if (b !== null) return b } return null }
  if (Array.isArray(x)) { for (const e of x) if (e && typeof e === 'object' && Object.values(e).some((v) => typeof v === 'string' && v.includes(nom))) { const b = dans(e); if (b !== null) return b } return null }
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (k.includes(nom)) { const b = valeurBool(v); if (b !== null) return b; const bb = dans(v); if (bb !== null) return bb }
  return null
}
function lignePlafond(x, canal) {
  const lignes = Array.isArray(x) ? x : x && typeof x === 'object' ? Object.entries(x).map(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? { canal: k, ...v } : null)).filter(Boolean) : []
  return lignes.find((l) => l && l.canal === canal && (l.envoyeur ?? '*') === '*') || null
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
  const e = await rpc('ops_garde_etat', {}, cles.service)
  if (e.status === 0) throw new Prealable('PostgREST injoignable')
  if (e.status === 404 && e.j?.code === 'PGRST202') throw new Prealable(`ops_garde_etat inconnue de PostgREST : 0099 n'est pas appliquée (${code(e)})`)
  const s = creerRapport(NOM, [id], { entete: `${NOM} ${NUM} (${M.fiche}) — --reel` })
  s.verdict(id, e.ok && e.j && typeof e.j === 'object', `ops_garde_etat() avec la clé de service (${code(e)})`, `ops_garde_etat() refusée avec la clé de service (${code(e)})`)
  if (e.ok && e.j && typeof e.j === 'object') {
    for (const k of CONTRAT.fonctions.ops_garde_etat.cles) s.verdict(id, k in e.j, `clé ${k} rendue`, `clé ${k} absente`)
    for (const nom of ['garde_envois', 'annuler_sur_opposition']) { const b = etatNomme(e.j.declencheurs, nom); s.verdict(id, b === true, `déclencheur ${nom} actif`, `déclencheur ${nom} : ${b === null ? 'introuvable' : 'inactif'}`) }
    for (const canal of ['instagram', 'facebook']) { const l = lignePlafond(e.j.plafonds, canal); s.verdict(id, !!l && Number(l.plafond_jour) === 0 && Number(l.plafond_nouveaux_jour ?? 0) === 0, `(${canal}, *) à 0`, `(${canal}, *) : ${l ? `${l.plafond_jour}/${l.plafond_nouveaux_jour}` : 'ligne absente'} (0/0 attendu)`) }
    const froid = etatNomme(e.j.interrupteurs, 'envoi_froid')
    s.verdict(id, froid === false, 'envoi_froid fermé', `envoi_froid : ${froid === null ? 'introuvable' : 'ouvert'} (fermé attendu avant l'ouverture par Benj)`)
  }
  const a = await rpc('ops_garde_etat', {}, cles.anon)
  s.verdict(id, !a.ok && a.status !== 0, `ops_garde_etat refusée avec la clé anonyme (${code(a)})`, `ops_garde_etat ${a.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anonyme (${code(a)})`)
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
