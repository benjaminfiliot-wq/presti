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
//   Paris, opposition active, branche « envoye » refusée seulement sous pause ou accord tombé) · PG-5 jumeaux et contrôle · PG-6 essai à sec ·
//   PG-7 non-régression · PG-8 --reel.
//   Correction du 27/09 de 026-034 (juge d'abord : ces trois critères sont rouges sur le SQL d'avant) :
//   PG-9 l'accord individuel de Benj (R24 : statut attend_accord_benj, ops.accords_benj, ops.garde_accords(), approbation
//   qui consomme un accord) · PG-10 l'envoi figé dès l'attente (retouche après approbation, diag_g2) · PG-11 les dates posées
//   par la base, jamais par l'écrivain (prepare_le antidaté, diag_g1). Chacun lit le SQL ET exige ses clés d'essai à true.
//   Contre-vérification du 27/09 et décisions de Benj du 27/09 (juge d'abord, rouges sur le SQL d'avant) : PG-12 le plafond du
//   jour à la réanimation (toute entrée ou ré-entrée en prepare, attend_accord_benj ou approuve est datée par la base et compte
//   au jour où elle a lieu ; une insertion hors file passe les mêmes contrôles) · PG-13 le passage à envoye refusé sous pause
//   active ou accord tombé (échu, ou émis avant un mouvement de la pause) ; PG-10 fige aussi entetes, verdicts et
//   approuve_par_agent.
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
const IDS = { fichier: 'PG-1', contrat: 'PG-2', securite: 'PG-3', corps: 'PG-4', jumeaux: 'PG-5', essai: 'PG-6', nr: 'PG-7', reel: 'PG-8', accord: 'PG-9', fige: 'PG-10', dates: 'PG-11', reanimation: 'PG-12', envoye: 'PG-13' }
const ROLES_FERMES = ['public', 'anon', 'authenticated', 'service_role']

// Les dix-neuf codes de la voie gratuite du 25/09 (« Place dans la série » de 026-032, PG-4 de 026-034), exactement.
const CODES_VOIE_GRATUITE = ['pause_generale', 'opposition', 'confirmation_stop', 'rgpd_hors_demande', 'envoi_froid_ferme', '90_jours', 'relance_sans_contact', '3_messages', '72_heures', 'quota_absent', 'quota', 'quota_nouveaux', 'quota_reponses', 'verdicts', 'formulaire_deja', 'relance_formulaire', 'froid_email_interdit', 'preuve_demande_absente', 'relance_sollicitee']

// Correction du 27/09 : les codes nouveaux (garde_envois, puis garde_accords), les sept statuts, les champs figés.
const CODES_ACCORD_ENVOIS = ['accord_absent', 'accord_perime', 'accord_rejoue', 'accord_different', 'envoi_fige']
const CODES_ACCORD_EMISSION = ['accord_auteur', 'accord_envoi', 'accord_fige', 'accord_perime']
const STATUTS = ['prepare', 'attend_accord_benj', 'approuve', 'envoye', 'saute', 'perime', 'annule']
// décision de Benj du 27/09 : entetes et verdicts figés comme les autres champs (et approuve_par_agent, qui porte les verdicts)
const CHAMPS_FIGES = ['canal', 'envoyeur', 'type', 'prospect_id', 'destinataire', 'empreinte_texte', 'entetes', 'verdicts', 'approuve_par_agent']
// décision de Benj du 27/09 : les deux seuls refus du passage à envoye
const REFUS_ENVOYE = ['pause_generale', 'accord_perime']
// Les clés d'essai de la correction du 27/09, par critère (elles entrent aussi dans PG-6).
const CLES_PG9 = [
  'attente_sans_verdicts_refusee', 'attente_verdicts_passe', 'approuve_sans_attente_refuse', 'accord_absent_refuse',
  'accord_valide_approuve', 'accord_consomme', 'accord_unique_par_envoi', 'accord_rejoue_refuse', 'accord_perime_refuse',
  'accord_pause_annule', 'accord_autre_destinataire_refuse', 'accord_autre_canal_refuse', 'accord_texte_modifie_refuse',
  'accord_different_refuse', 'accord_non_fondateur_refuse', 'accord_hors_attente_refuse', 'accord_fige_refuse',
  'accord_opposition_annule', 'accord_annule_hors_attente', 'envoye_sans_accord_signale', 'attente_compte_au_plafond',
]
const CLES_PG10 = [
  'retouche_destinataire_approuve_refusee', 'retouche_texte_approuve_refusee', 'retouche_canal_approuve_refusee',
  'retouche_type_approuve_refusee', 'retouche_prospect_approuve_refusee', 'retouche_envoyeur_approuve_refusee',
  'retouche_texte_attente_refusee', 'retouche_envoye_refusee', 'envoye_ne_revient_pas', 'approuve_champ_libre_passe',
  'retouche_prepare_passe',
  // décision de Benj du 27/09 (info_a3 de la contre-vérification)
  'retouche_entetes_approuve_refusee', 'retouche_verdicts_approuve_refusee', 'retouche_entetes_attente_refusee',
  'retouche_verdicts_attente_refusee', 'retouche_approuve_par_agent_attente_refusee',
]
// Contre-vérification du 27/09 (a4, a4c) : la réanimation et le plafond du jour.
const CLES_PG12 = [
  'reanimation_datee_par_la_base', 'reanimation_respecte_plafond', 'du_jour_compte_les_reanimes', 'insertion_saute_controlee',
  'insertion_saute_plafond_plein_refusee', 'attente_veille_compte_au_plafond', 'approbation_veille_compte_au_plafond',
]
// Décision de Benj du 27/09 (info_r1, info_r2) : pause active ou accord tombé bloquent le passage à envoye.
const CLES_PG13 = [
  'pause_envoye_refuse', 'pause_envoye_reste_approuve', 'envoye_insere_pause_refuse', 'envoye_accord_echu_refuse',
  'envoye_pause_levee_refuse', 'envoye_accord_valide_passe',
]
const CLES_PG11 = [
  'antidate_prepare_le_pose_par_la_base', 'antidate_ne_contourne_pas_plafond', 'antidate_puis_du_jour_refuse',
  'prepare_le_immuable', 'envoye_le_pose_par_la_base', 'accord_emis_le_pose_par_la_base',
]

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
  // pause générale (décision de Benj du 27/09 : le passage à envoye sous pause est refusé, voir CLES_PG13)
  'pause_refuse_prepare', 'pause_refuse_lien_maquette',
  'prepare_vers_envoye_evenement_hors_regle', 'hors_regle_sans_donnee_personnelle',
  // filet des réponses
  'reponses_trois_passent', 'reponse_quatrieme_quota_reponses', 'reponses_vingt_jour_passent', 'reponse_21e_quota_reponses', 'reponse_veille_non_comptee',
  // réponse RGPD
  'reponse_rgpd_trois_passent', 'reponse_rgpd_4e_refusee', 'reponse_rgpd_sans_demande_refusee',
  // ops_garde_etat et droits
  'garde_etat_declencheurs_actifs', 'garde_etat_interrupteurs', 'garde_etat_plafonds', 'garde_etat_du_jour', 'garde_etat_sans_donnee_prospect',
  'anon_refuse_garde_etat', 'authenticated_refuse_garde_etat',
  // correction du 27/09, contre-vérification et décisions de Benj du 27/09
  ...CLES_PG9, ...CLES_PG10, ...CLES_PG11, ...CLES_PG12, ...CLES_PG13,
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
/** Les valeurs d'une liste SQL serrée « 'a','b' » : ['a', 'b']. */
const listeSql = (x) => String(x).split(',').map((v) => v.trim().replace(/^'|'$/g, '')).filter(Boolean)
/** Les clés d'essai `cles` : portées par le scénario et à true dans le compte rendu de l'essai du jumeau courant. */
function exigerCles(s, id, cles) {
  if (SANS_ESSAI) { s.note(`${id} : --sans-essai, ses ${cles.length} clés d'essai ne sont pas lues`); return }
  const sc = lireSi(path.join(R, M.scenario))
  const dans = sc ? clesScenario(sc) : []
  const absentes = cles.filter((c) => !dans.includes(c))
  if (absentes.length) s.echoue(id, `${M.scenario} ne porte pas ${absentes.length} clé(s) : ${listeTxt(absentes)}`)
  const N = lireSi(ch(M.nu))
  if (!N) { s.echoue(id, `jumeau nu absent ou vide : l'essai ne se relit pas`); return }
  const cr = lireCompteRendu(ch(M.essai_a_sec), { empreinte: empreinte(jumeauNuCoupe(ch(M.nu))), cles })
  if (!cr.ok) for (const r of cr.raisons.slice(0, 2)) s.echoue(id, `essai à sec : ${r}`)
}
/** Chaque liste « statut in (…) » d'un corps serré qui compte prepare et approuve compte aussi attend_accord_benj. */
function listesSansAttente(corps) {
  return [...serrer(corps).matchAll(/\bstatut (?:not )?in\(([^)]*)\)/g)].map((x) => listeSql(x[1]))
    .filter((l) => l.includes('prepare') && l.includes('approuve') && !l.includes('attend_accord_benj'))
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
  ['drop_trigger', /^drop trigger if exists ([a-z0-9_]+) on ops\.(envois|opposition|accords_benj)$/],
  ['trigger', /^create (or replace )?trigger ([a-z0-9_]+) /],
  ['revoke', /^revoke (?:all|execute)(?: privileges)? on function (ops|public)\.([a-z0-9_]+)\b/],
  ['grant', /^grant execute on function (ops|public)\.([a-z0-9_]+)\b/],
  ['commentaire', /^comment on (function|trigger|table ops\.accords_benj|column ops\.accords_benj\.[a-z_]+) /],
  // correction du 27/09 (R24) : la contrainte de statut d'ops.envois, et la table des accords de Benj — rien d'autre
  ['statut_drop', /^alter table ops\.envois drop constraint if exists envois_statut_check$/],
  ['statut_add', /^alter table ops\.envois add constraint envois_statut_check check\(statut in\(([^)]*)\)\)$/],
  ['table_accords', /^create table if not exists ops\.accords_benj\(/],
  ['index_accords', /^create index if not exists [a-z0-9_]+ on ops\.accords_benj\(/],
  ['rls_accords', /^alter table ops\.accords_benj enable row level security$/],
  ['revoke_table', /^revoke all(?: privileges)? on (?:table )?ops\.accords_benj from /],
]
const DECL = {
  // correction du 27/09 (PG-10) : toute mise à jour, sans « of » ni « when » — une colonne oubliée dans la liste serait une porte
  'ops.garde_envois': /^create (?:or replace )?trigger ([a-z0-9_]+) before (?:insert or update|update or insert) on ops\.envois for each row execute (?:function|procedure) ops\.garde_envois\(\)$/,
  'ops.garde_accords': /^create (?:or replace )?trigger ([a-z0-9_]+) before (?:insert or update|update or insert) on ops\.accords_benj for each row execute (?:function|procedure) ops\.garde_accords\(\)$/,
  'ops.annuler_sur_opposition': /^create (?:or replace )?trigger ([a-z0-9_]+) after (?:insert or update of expire_le|update of expire_le or insert) on ops\.opposition for each row (?:when ?\(.*\) )?execute (?:function|procedure) ops\.annuler_sur_opposition\(\)$/,
}
function juger0099(s, texteM) {
  const ins = lireInstructions(texteM)
  const genres = ins.map((x) => { for (const [g, re] of GENRES) { const m = re.exec(x.n); if (m) return { ...x, g, m } } return { ...x, g: null } })
  // PG-1 — le fichier et la liste permise
  if (!ins.length) s.echoue(IDS.fichier, `${M.fichier} ne porte aucune instruction`)
  for (const x of genres) if (!x.g) s.echoue(IDS.fichier, `instruction hors de la liste du point 1 (fonctions, déclencheurs, droits, commentaires) : « ${court(x.n, 100)} »`)
  const cs = codeSeul(texteM)
  // hors de la liste permise (correction du 27/09 : ops.accords_benj et la contrainte de statut), aucune table ni colonne
  const csHors = cs.replace(/\bcreate table if not exists ops\.accords_benj\b/g, '').replace(/\balter table ops\.envois (?:drop|add) constraint (?:if exists )?envois_statut_check\b/g, '').replace(/\balter table ops\.accords_benj enable row level security\b/g, '')
  for (const [quoi, re] of [['create table', /\bcreate (unlogged |temp(?:orary)? )?table\b/], ['alter table', /\balter table\b/], ['drop table', /\bdrop table\b/], ['create extension', /\bcreate extension\b/], ['create policy', /\bcreate policy\b/], ['create schema', /\bcreate schema\b/], ['add column', /\badd column\b/], ['drop column', /\bdrop column\b/]]) {
    if (re.test(csHors)) s.echoue(IDS.fichier, `« ${quoi} » hors de la liste permise : 0099 ne crée que ops.accords_benj et ne touche que la contrainte envois_statut_check`)
  }
  if (genres.filter((x) => x.g === 'table_accords').length > 1) s.echoue(IDS.fichier, 'ops.accords_benj créée deux fois')
  if (!s.enEchec(IDS.fichier)) s.passe(IDS.fichier, `${ins.length} instructions : fonctions, déclencheurs (drop trigger if exists puis create trigger), droits, commentaires, et seulement la contrainte envois_statut_check et ops.accords_benj (correction du 27/09)`)

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
  for (const nom of ['garde_envois', 'annuler_sur_opposition', 'garde_accords']) {
    if (!revoque('ops', nom, ROLES_FERMES)) s.echoue(IDS.securite, `ops.${nom} : revoke … from ${ROLES_FERMES.join(', ')} absent ou incomplet (exécutable par aucun des quatre rôles)`)
    if (grants.some((x) => x.m[2] === nom)) s.echoue(IDS.securite, `ops.${nom} : un grant sur une fonction de déclencheur`)
  }
  for (const x of grants) if (rolesApres(x.n, 'to').some((ro) => ro !== 'service_role')) s.echoue(IDS.securite, `grant à ${rolesApres(x.n, 'to').filter((ro) => ro !== 'service_role').join(', ')} : « ${court(x.n, 80)} »`)
  if (/\bgrant\b/.test(cs.replace(/grant execute on function public\.ops_garde_etat(\(\))? to service_role/g, ''))) s.echoue(IDS.securite, 'un grant autre que « grant execute on function public.ops_garde_etat() to service_role »')
  if (!s.enEchec(IDS.securite)) s.passe(IDS.securite, `ops_garde_etat security definer, search_path « ${CONTRAT.fonctions.ops_garde_etat.search_path} », service_role seul ; les trois fonctions de déclencheur révoquées à ${ROLES_FERMES.join(', ')}, sans grant`)

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
    const entree = [...sr.matchAll(/new\.statut (?:not )?in\(([^)]*)\)/g)].map((x) => listeSql(x[1]))
    if (!entree.some((l) => ['prepare', 'attend_accord_benj', 'approuve'].every((v) => l.includes(v)) && !l.includes('envoye'))) s.echoue(IDS.corps, "la condition d'entrée ne porte pas sur new.statut in ('prepare','attend_accord_benj','approuve')")
    // chaque « if new.statut = 'envoye' then » (depuis le 27/09 il y en a plus d'un : la date d'envoi posée par la base) : aucun
    // ne lève d'autre exception que les deux refus décidés par Benj le 27/09 (pause active, accord tombé : PG-13), et l'un
    // d'eux écrit envoi_hors_regle
    const mes = [...g.corps.matchAll(/\bif\s+new\.statut\s*(?:=\s*'envoye'|in\s*\(\s*'envoye'\s*\))\s*then\b/gi)]
    if (!mes.length) s.echoue(IDS.corps, "branche « if new.statut = 'envoye' then » introuvable : le passage à envoye doit être consigné")
    else {
      let hors = false
      for (const me of mes) {
        const b = brancheSi(g.corps, me.index)
        if (!b) { s.echoue(IDS.corps, "branche « envoye » illisible (if … then … end if)"); continue }
        const brut = g.corps.slice(b[0], b[1])
        const nRaise = (masquer(brut).toLowerCase().match(/\braise\b(?!\s+(?:notice|warning|log|debug|info)\b)/g) || []).length
        const codesB = [...brut.matchAll(/\braise\b[^;]*?'ops:([a-z0-9_]+)'/gi)].map((x) => x[1])
        const autres = codesB.filter((k) => !REFUS_ENVOYE.includes(k))
        if (nRaise !== codesB.length || autres.length) s.echoue(IDS.corps, `une branche « envoye » lève ${autres.length ? autres.map((k) => `ops:${k}`).join(', ') : 'une exception sans code ops:'} : le passage à envoye n'est refusé que par ${REFUS_ENVOYE.map((k) => `ops:${k}`).join(' et ')} (décision du 27/09)`)
        if (brut.includes('envoi_hors_regle')) hors = true
      }
      if (!hors) s.echoue(IDS.corps, 'aucune branche « envoye » n\'écrit l\'événement envoi_hors_regle')
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
    // revue de 026-091 (29/09, décision du chef) : « Europe/Paris quelque part » ne suffit pas (une mutation qui ne change que
    // le jour du plafond restait verte). Aucun autre fuseau dans le corps ; v_jour, v_debut et v_fin (les bornes des compteurs
    // du jour) sont chacun calculés « at time zone 'Europe/Paris' », et existent.
    {
      for (const z of new Set([...g.corps.matchAll(/at\s+time\s+zone\s+'([^']*)'/gi)].map((x) => x[1]))) if (z !== 'Europe/Paris') s.echoue(IDS.corps, `un jour ou une borne se calcule « at time zone '${z}' » : seul 'Europe/Paris' est permis dans ops.garde_envois() (le jour des plafonds est le jour de Paris)`)
      for (const v of ['v_jour', 'v_debut', 'v_fin']) {
        const affect = [...g.corps.matchAll(new RegExp(`\\b${v}\\s*:=\\s*([^;]*);`, 'gi'))]
        if (!affect.length) s.echoue(IDS.corps, `${v} n'est jamais affecté dans ops.garde_envois() : le jour du plafond n'est pas calculé`)
        for (const a of affect) if (!/at\s+time\s+zone\s+'Europe\/Paris'/i.test(a[1])) s.echoue(IDS.corps, `${v} := ${court(a[1].replace(/\s+/g, ' '), 70)} : le jour du plafond doit se calculer « at time zone 'Europe/Paris' »`)
      }
    }
    // le plafond du jour ne compte que les premiers contacts et les relances (et, sur les canaux où tout message compte, tout
    // message) : chaque liste de types du bloc des plafonds est exactement ('premier_contact', 'relance'). lien_maquette, reponse,
    // confirmation_stop et reponse_rgpd sont des réponses dans un fil ouvert, jamais comptées au plafond (revue A2 du 24/09).
    {
      const iP = g.corps.search(/\bif\s+new\.canal\s+in\s*\(\s*'formulaire_site'/i)
      if (iP < 0) s.echoue(IDS.corps, "le bloc des plafonds du jour (« if new.canal in ('formulaire_site', … ) or new.type in (…) then ») est introuvable")
      else {
        const listes = [...g.corps.slice(iP).matchAll(/\b(?:new|e)\.type\s+in\s*\(([^)]*)\)/gi)].map((x) => listeSql(x[1]))
        const attendu = ['premier_contact', 'relance']
        if (listes.length < 3) s.echoue(IDS.corps, `${listes.length} liste(s) de types dans le bloc des plafonds ; attendu : l'entrée et les deux comptages (canal, puis canal et envoyeur)`)
        for (const l of listes) if ([...l].sort().join(',') !== [...attendu].sort().join(',')) s.echoue(IDS.corps, `le plafond du jour compte les types ${l.map((k) => `« ${k} »`).join(', ')} ; il ne compte exactement que ${attendu.map((k) => `« ${k} »`).join(', ')} (lien_maquette, reponse, confirmation_stop et reponse_rgpd sont des réponses dans un fil ouvert)`)
      }
    }
    if (!c.includes("envoyeur='*'")) s.echoue(IDS.corps, "la ligne (canal, '*') n'est pas lue : un canal sans plafond doit être fermé (ops:quota_absent)")
    if (!(c.includes('to_jsonb(new)') && c.includes('preuve_demande'))) s.echoue(IDS.corps, 'preuve_demande n\'est pas lue par to_jsonb(new) (0099 doit marcher avant 0106)')
    if (!/expire_le is null or [a-z_.]*expire_le>now\(\)|expire_le>now\(\) or [a-z_.]*expire_le is null|coalesce\([a-z_.]*expire_le,'infinity'(?:::timestamptz)?\)>now\(\)/.test(sr)) s.echoue(IDS.corps, "l'opposition lue n'est pas l'opposition active (expire_le is null or expire_le > now())")
    for (const [quoi, re] of [['90 jours', /'90days?'/], ['72 heures', /'72hours?'/], ['24 heures', /'24hours?'/], ['35 jours', /'35days?'/]]) if (!re.test(c)) s.echoue(IDS.corps, `l'intervalle de ${quoi} n'est pas écrit`)
    // la règle des 90 jours (ops:90_jours) ne vaut que pour le premier contact : lien_maquette, reponse, confirmation_stop
    // et reponse_rgpd sont des réponses dans un fil ouvert (commentaire de 0099 ; revue de 026-091, 29/09). Le
    // « if new.type … then » qui porte le raise doit exister et ne nommer que premier_contact.
    {
      const porteurs = [...g.corps.matchAll(/\bif\s+new\.type\s*(?:=\s*'[a-z_]+'|in\s*\([^)]*\))\s*then\b/gi)].filter((me) => { const b = brancheSi(g.corps, me.index); return b && /'ops:90_jours'/.test(g.corps.slice(b[0], b[1])) })
      if (!porteurs.length) s.echoue(IDS.corps, "ops:90_jours n'est levé sous aucun « if new.type … then » : la règle des 90 jours doit viser le premier contact seul")
      for (const me of porteurs) {
        const noms = [...me[0].matchAll(/'([a-z_]+)'/gi)].map((x) => x[1])
        if (noms.length !== 1 || noms[0] !== 'premier_contact') s.echoue(IDS.corps, `la règle des 90 jours (ops:90_jours) vise ${noms.map((k) => `« ${k} »`).join(', ')} : elle ne vaut que pour premier_contact (lien_maquette, reponse, confirmation_stop et reponse_rgpd sont des réponses dans un fil ouvert, sans 90 jours)`)
      }
    }
  }
  const brut = sansCommentairesSql(texteM)
  if (/boite_/i.test(brut)) s.echoue(IDS.corps, 'boite_ dans la migration : les règles par boîte sont retirées (voie gratuite du 25/09)')
  const canaux = valeursCanal(serrer(brut))
  if (canaux.includes('email') || /\('email',\s*'\*'/.test(brut)) s.echoue(IDS.corps, "le canal 'email' est nommé : il n'existe plus (voie gratuite du 25/09)")
  if (!s.enEchec(IDS.corps)) s.passe(IDS.corps, `déclencheurs du contrat, rejouables ; entrée sur prepare, attend_accord_benj et approuve ; branche envoye refusée seulement par ops:pause_generale et ops:accord_perime (décision du 27/09), avec envoi_hors_regle ; les ${CODES_VOIE_GRATUITE.length} codes levés ; verrous avant comptage ; heure de Paris ; ligne '*' ; preuve_demande par to_jsonb(new) ; opposition active ; ni boite_ ni canal 'email'`)

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
      // correction du 27/09
      ['la contrainte de statut porte attend_accord_benj', ['envois_statut_check', "attend_accord_benj"]],
      ["ops.accords_benj : RLS, aucun droit d'API", ['accords_benj', 'relrowsecurity', 'has_table_privilege']],
      ['le déclencheur garde_accords existe et est actif', ['garde_accords']],
      // contre-vérification et décisions du 27/09 : la base porte bien le corps corrigé
      ['ops.garde_envois porte la correction du 28/09 (entetes et verdicts figés, entrée datée, envoye refusé)', ['prosrc', 'new.entetes is distinct from old.entetes', 'new.verdicts is distinct from old.verdicts', "tg_op = ''update''", 'new.prepare_le := now()', 'ops:accord_perime']],
    ]
    for (const [quoi, tous] of points) { const m = tous.filter((x) => !cC.includes(compacter(x))); if (m.length) s.echoue(IDS.jumeaux, `${M.controle} ne couvre pas : ${quoi} (manque ${m.join(', ')})`) }
  }
  if (!s.enEchec(IDS.jumeaux)) s.passe(IDS.jumeaux, `jumeaux équivalents (sql-nu --verifier, nu régénéré à l'identique) ; ${M.controle} en lecture seule, couvre déclencheurs, plafonds, envoi_froid, ops_garde_etat, droits d'anon et authenticated, contrainte de statut et ops.accords_benj`)

  jugerCorrection(s, genres, F, cs)
}

// ── PG-9 à PG-11 : la correction du 27/09 (juge d'abord : rouges sur le SQL d'avant) ───────────────────────────────────────
function jugerCorrection(s, genres, F, cs) {
  const g = F('ops.garde_envois'), a = F('ops.garde_accords')
  const cg = g && !g.erreur ? compacter(g.corps) : '', ca = a && !a.erreur ? compacter(a.corps) : ''
  const leve = (c, code) => new RegExp(`raise[^;]*?'ops:${code}'`).test(c)
  const avantRetour = (c, motif) => { const i = c.indexOf(motif), r = c.indexOf('returnnew;'); return i >= 0 && (r < 0 || i < r) }

  // PG-9 — l'accord individuel de Benj (R24)
  const id9 = IDS.accord
  const add = genres.find((x) => x.g === 'statut_add'), drop = genres.findIndex((x) => x.g === 'statut_drop')
  if (!add) s.echoue(id9, "aucun « alter table ops.envois add constraint envois_statut_check check (statut in (…)) » : le statut attend_accord_benj n'existe pas")
  else {
    const l = listeSql(add.m[1])
    if ([...l].sort().join(',') !== [...STATUTS].sort().join(',')) s.echoue(id9, `envois_statut_check liste ${l.join(', ')} ; attendu ${STATUTS.join(', ')}`)
    if (drop < 0 || drop > genres.indexOf(add)) s.echoue(id9, "« drop constraint if exists envois_statut_check » absent ou après l'ajout : la migration n'est pas rejouable")
  }
  const tab = genres.find((x) => x.g === 'table_accords')
  if (!tab) s.echoue(id9, 'ops.accords_benj absente : aucun accord ne peut se donner')
  else {
    const spec = CONTRAT.tables.accords_benj
    if (!spec) s.echoue(id9, `${CONTRAT_F} ne décrit pas ops.accords_benj`)
    else {
      for (const c of spec.colonnes) {
        const attendu = compacter(c.texte.replace(/`/g, '').replace(/\s*;\s*$/, ''))
        if (!tab.c.includes(attendu)) s.echoue(id9, `ops.accords_benj : colonne « ${c.texte.replace(/`/g, '').replace(/\s*;\s*$/, '')} » absente ou autre`)
      }
      for (const k of spec.contraintes || []) if (!tab.c.includes(compacter(k))) s.echoue(id9, `ops.accords_benj : contrainte « ${k} » absente`)
    }
    if (!genres.some((x) => x.g === 'rls_accords')) s.echoue(id9, 'ops.accords_benj sans row level security')
    const rv = genres.find((x) => x.g === 'revoke_table')
    if (!rv || !ROLES_FERMES.every((ro) => rolesApres(rv.n, 'from').includes(ro))) s.echoue(id9, `ops.accords_benj : revoke all … from ${ROLES_FERMES.join(', ')} absent ou incomplet`)
    if (/\bgrant\b[^;]*\baccords_benj\b/.test(cs)) s.echoue(id9, 'ops.accords_benj : un grant')
  }
  if (!a || a.erreur) s.echoue(id9, 'ops.garde_accords() absente : un accord ne serait ni daté par la base, ni réservé à un fondateur, ni lié à l\'envoi')
  else {
    if (!ca.includes('is_founder')) s.echoue(id9, 'ops.garde_accords() ne vérifie pas que donne_par est un fondateur (is_founder)')
    if (!ca.includes("'attend_accord_benj'")) s.echoue(id9, 'ops.garde_accords() ne lie pas l\'accord à un envoi en attend_accord_benj')
    for (const k of ['canal', 'destinataire', 'empreinte_texte']) if (!new RegExp(`new\\.${k}`).test(ca)) s.echoue(id9, `ops.garde_accords() ne compare pas new.${k} à l'envoi`)
    const m = CODES_ACCORD_EMISSION.filter((k) => !leve(ca, k))
    if (m.length) s.echoue(id9, `ops.garde_accords() ne lève pas : ${m.map((k) => `ops:${k}`).join(', ')}`)
  }
  if (!g || g.erreur) s.echoue(id9, 'ops.garde_envois() absente')
  else {
    const m = CODES_ACCORD_ENVOIS.filter((k) => k !== 'envoi_fige' && !leve(cg, k))
    if (m.length) s.echoue(id9, `ops.garde_envois() ne lève pas : ${m.map((k) => `ops:${k}`).join(', ')} (l'approbation n'exige pas l'accord de Benj)`)
    if (!/old\.statut(?:<>|isdistinctfrom)'attend_accord_benj'/.test(cg)) s.echoue(id9, "ops.garde_envois() n'exige pas old.statut = 'attend_accord_benj' pour entrer en approuve")
    if (!/updateops\.accords_benj[^;]*setutilise_le=now\(\)/.test(cg)) s.echoue(id9, "ops.garde_envois() ne consomme pas l'accord (update ops.accords_benj set utilise_le = now())")
    if (!/updateops\.accords_benj[^;]*setannule_le=now\(\)/.test(cg)) s.echoue(id9, "ops.garde_envois() n'annule jamais un accord (sortie d'attente, second accord)")
    if (!cg.includes('change_le')) s.echoue(id9, "ops.garde_envois() ne lit pas ops.interrupteurs.change_le : une pause n'annulerait pas l'accord")
    if (!g.corps.includes('sans accord de Benj')) s.echoue(id9, "la branche envoye ne signale pas « sans accord de Benj »")
  }
  for (const cle of ['ops.garde_envois', 'ops.annuler_sur_opposition', 'ops_garde_etat']) {
    const f = F(cle)
    if (!f || f.erreur) continue
    const l = listesSansAttente(f.corps)
    if (l.length) s.echoue(id9, `${cle} : ${l.length} liste(s) de statuts qui comptent prepare et approuve sans attend_accord_benj (${l[0].join(', ')}) : un envoi qui attend ne compterait pas`)
  }
  const etat = F('ops_garde_etat')
  if (etat && !etat.erreur && !etat.corps.includes('garde_accords')) s.echoue(id9, 'ops_garde_etat ne rend pas le déclencheur garde_accords')
  exigerCles(s, id9, CLES_PG9)
  if (!s.enEchec(id9)) s.passe(id9, `statut attend_accord_benj (${STATUTS.length} statuts) ; ops.accords_benj (colonnes du contrat, 24 h, RLS, aucun droit) ; garde_accords : fondateur, envoi en attente, même canal, destinataire et empreinte, figé ; approuve depuis l'attente seulement, accord consommé une fois ; ${CLES_PG9.length} clés d'essai à true`)

  // PG-10 — l'envoi figé dès l'attente (retouche après approbation, diag_g2)
  const id10 = IDS.fige
  const trig = genres.find((x) => x.g === 'trigger' && / on ops\.envois /.test(x.n) && /ops\.garde_envois\(\)/.test(x.n))
  if (!trig) s.echoue(id10, 'déclencheur de ops.garde_envois() absent')
  else if (/ update of /.test(trig.n) || / when ?\(/.test(trig.n)) s.echoue(id10, `« ${court(trig.n, 110)} » : le déclencheur n'écoute pas toute mise à jour (update of / when) — une retouche de canal, type, prospect_id, destinataire ou empreinte_texte après approbation passe sans contrôle`)
  if (g && !g.erreur) {
    if (!leve(cg, 'envoi_fige')) s.echoue(id10, "ops.garde_envois() ne lève pas ops:envoi_fige : rien n'interdit de retoucher un envoi approuvé")
    const sr = serrer(g.corps)
    const manque = CHAMPS_FIGES.filter((k) => !new RegExp(`new\\.${k} is distinct from old\\.${k}`).test(sr))
    if (manque.length) s.echoue(id10, `champ(s) jamais comparé(s) à old : ${manque.join(', ')}`)
    const fig = [...sr.matchAll(/old\.statut in\(([^)]*)\)/g)].map((x) => listeSql(x[1]))
    if (!fig.some((l) => ['attend_accord_benj', 'approuve', 'envoye'].every((v) => l.includes(v)))) s.echoue(id10, "l'envoi n'est pas figé en attend_accord_benj, approuve et envoye (old.statut in (…))")
    if (!avantRetour(cg, "'ops:envoi_fige'")) s.echoue(id10, 'le contrôle ops:envoi_fige vient après un « return new » : une retouche sans changement de statut lui échappe')
  }
  exigerCles(s, id10, CLES_PG10)
  if (!s.enEchec(id10)) s.passe(id10, `déclencheur sur toute mise à jour ; ${CHAMPS_FIGES.join(', ')} comparés à old dès attend_accord_benj, avant tout return ; ops:envoi_fige ; ${CLES_PG10.length} clés d'essai à true`)

  // PG-11 — les dates posées par la base (prepare_le antidaté, diag_g1)
  const id11 = IDS.dates
  if (g && !g.erreur) {
    for (const [motif, quoi] of [['new.prepare_le:=now()', 'new.prepare_le := now() à l\'insertion'], ['new.prepare_le:=old.prepare_le', 'new.prepare_le := old.prepare_le ensuite']]) {
      if (!cg.includes(motif)) s.echoue(id11, `ops.garde_envois() ne pose pas ${quoi} : la date du plafond vient de l'écrivain`)
      else if (!avantRetour(cg, motif)) s.echoue(id11, `${quoi} vient après un « return new »`)
    }
    if (!/new\.envoye_le:=[^;]*now\(\)/.test(cg)) s.echoue(id11, 'ops.garde_envois() ne pose pas envoye_le par now() : les 90 jours et les 72 h liraient la date de l\'écrivain')
    if (!/new\.approuve_le:=now\(\)/.test(cg)) s.echoue(id11, 'approuve_le n\'est pas posée par now()')
  } else s.echoue(id11, 'ops.garde_envois() absente')
  if (a && !a.erreur && !ca.includes('new.emis_le:=now()')) s.echoue(id11, 'ops.garde_accords() ne pose pas new.emis_le := now()')
  exigerCles(s, id11, CLES_PG11)
  if (!s.enEchec(id11)) s.passe(id11, `prepare_le := now() puis immuable, envoye_le et approuve_le par now(), emis_le par now(), avant tout return ; ${CLES_PG11.length} clés d'essai à true (diag_g1 rejoué : l'antidaté ne libère aucune place)`)

  // PG-12 — le plafond du jour à la réanimation (contre-vérification du 27/09, a4 et a4c)
  const id12 = IDS.reanimation
  if (g && !g.erreur) {
    // la sortie avant les contrôles ne vaut que pour une mise à jour : une insertion, quel que soit son statut, est jugée
    if (/ifnew\.statut<>'envoye'andnew\.statutnotin\(/.test(cg)) s.echoue(id12, "« if new.statut <> 'envoye' and new.statut not in (…) then return new » : une fiche insérée en saute, perime ou annule échappe à tout contrôle, puis se réanime")
    const sortie = /iftg_op='update'andnew\.statutnotin\(([^)]*)\)thenreturnnew;/.exec(cg)
    if (!sortie) s.echoue(id12, "aucune sortie « if tg_op = 'UPDATE' and new.statut not in (…) then return new » : l'insertion hors file n'est pas jugée comme les autres")
    else if ([...listeSql(sortie[1])].sort().join(',') !== ['approuve', 'attend_accord_benj', 'envoye', 'prepare'].join(',')) s.echoue(id12, `la sortie liste ${listeSql(sortie[1]).join(', ')} ; attendu prepare, attend_accord_benj, approuve, envoye`)
    // toute entrée ou ré-entrée (changement de statut) en prepare ou attend_accord_benj reprend la date de la base
    const i0 = cg.indexOf('new.prepare_le:=old.prepare_le;')
    const redate = i0 < 0 ? null : /ifnew\.statutin\(([^)]*)\)thennew\.prepare_le:=now\(\);/.exec(cg.slice(i0))
    if (!redate) s.echoue(id12, "aucun « if new.statut in (…) then new.prepare_le := now() » après « new.prepare_le := old.prepare_le » : une fiche réanimée garde la date de sa première préparation et ne compte pas au plafond du jour")
    else {
      const l = listeSql(redate[1])
      const manque = ['prepare', 'attend_accord_benj'].filter((v) => !l.includes(v))
      if (manque.length) s.echoue(id12, `la ré-entrée en ${manque.join(', ')} ne reprend pas la date de la base`)
      const iq = cg.indexOf("'ops:quota'"), ir = i0 + redate.index
      if (iq >= 0 && ir > iq) s.echoue(id12, 'la date de la ré-entrée est posée après le contrôle du plafond')
    }
  } else s.echoue(id12, 'ops.garde_envois() absente')
  exigerCles(s, id12, CLES_PG12)
  if (!s.enEchec(id12)) s.passe(id12, `insertion jugée quel que soit son statut ; toute entrée ou ré-entrée en prepare ou attend_accord_benj (et approuve si listée) datée par la base avant le plafond ; ${CLES_PG12.length} clés d'essai à true (a4 et a4c rejoués)`)

  // PG-13 — le passage à envoye refusé sous pause active ou accord tombé (décision de Benj du 27/09)
  const id13 = IDS.envoye
  if (g && !g.erreur) {
    const mes = [...g.corps.matchAll(/\bif\s+new\.statut\s*(?:=\s*'envoye'|in\s*\(\s*'envoye'\s*\))\s*then\b/gi)]
    const b = mes.map((me) => brancheSi(g.corps, me.index)).find((x) => x && g.corps.slice(x[0], x[1]).includes('envoi_hors_regle'))
    if (!b) s.echoue(id13, 'branche « envoye » qui écrit envoi_hors_regle introuvable')
    else {
      const cb = compacter(g.corps.slice(b[0], b[1]))
      for (const k of REFUS_ENVOYE) if (!leve(cb, k)) s.echoue(id13, `la branche « envoye » ne lève pas ops:${k}`)
      if (!cb.includes("public.ops_interrupteur('pause_generale')")) s.echoue(id13, "la branche « envoye » ne lit pas la pause par public.ops_interrupteur('pause_generale') (un interrupteur absent doit fermer)")
      const ie = cb.indexOf('ops_evenement_ajouter('), ip = cb.search(/raise[^;]*?'ops:pause_generale'/), ia = cb.search(/raise[^;]*?'ops:accord_perime'/)
      if (ie >= 0 && ((ip >= 0 && ip > ie) || (ia >= 0 && ia > ie))) s.echoue(id13, 'un refus de la branche « envoye » vient après l\'écriture de envoi_hors_regle')
      if (!/expire_le<=now\(\)/.test(cb) || !cb.includes('change_le') && !cb.includes('v_pause_le')) s.echoue(id13, "la branche « envoye » ne juge pas l'accord consommé (échu : expire_le <= now() ; tombé : émis avant le dernier mouvement de la pause)")
    }
  } else s.echoue(id13, 'ops.garde_envois() absente')
  exigerCles(s, id13, CLES_PG13)
  if (!s.enEchec(id13)) s.passe(id13, `branche « envoye » : ops:pause_generale (pause active, interrupteur absent compris) et ops:accord_perime (accord consommé échu ou tombé par la pause) avant tout signalement ; ${CLES_PG13.length} clés d'essai à true`)
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
    for (const nom of ['garde_envois', 'annuler_sur_opposition', 'garde_accords']) { const b = etatNomme(e.j.declencheurs, nom); s.verdict(id, b === true, `déclencheur ${nom} actif`, `déclencheur ${nom} : ${b === null ? 'introuvable' : 'inactif'}`) }
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
