#!/usr/bin/env node
// scripts/ops-acquisition-qa.mjs — le juge SQL de l'acquisition (fiche 026-037), écrit par Claude Code AVANT les migrations
// qu'il juge, qui ne peuvent pas le modifier : 0105 socle (026-060, cahier OA), 0106 échanges (026-061, cahier OB) et 0109
// planification pg_cron (026-136, cahier PG). Le SQL se lit sans ses commentaires par `sansCommentaires` de scripts/sql-nu.mjs
// (réutilisé, par scripts/lib/sql-essai.mjs et directement) ; le contrat (lib/agents/acquisition/contrat.ts du dépôt du juge)
// est la règle, jamais jugé ici.
//
//   node scripts/ops-acquisition-qa.mjs --migration=socle|echanges|planification [--racine=<dossier>]
//        la lecture statique (et, pour 0106, le compte rendu de l'essai à sec). Sur une racine qui n'est pas le dépôt (arbre
//        de référence, témoin), la non-régression, `npm run typecheck` et `vercel.json` ne se jugent pas : ils sont dits.
//   node scripts/ops-acquisition-qa.mjs --migration=… --reel --confirmer-reel
//        la lecture statique, PUIS le comportement réel par PostgREST (.env.local chargé sans rien afficher) : lancé par
//        Claude Code seulement, après l'application par le connecteur (apply_migration). Sans --confirmer-reel : code 2 (garde
//        contre un lancement par l'orchestre). Code 2 aussi si une clé manque ou si la migration n'est pas appliquée.
//        Lignes d'essai marquées « essai-026-acq-<horodatage> » ; ménage dans un finally, code 1 s'il échoue.
//   node scripts/ops-acquisition-qa.mjs --migration=… --auto-controle
//        le juge éprouvé sur lui-même : le témoin (scripts/fixtures/026-acquisition/cli/temoins/ops/, matérialisé sous
//        .orchestre/travail/ops-acquisition-qa/) rend chaque critère statique vert, et chaque sabotage rend ROUGE le critère
//        qu'il vise. Une ligne « AC-… » par épreuve ; code 0 seulement si toutes tiennent.
//
// Critères (une ligne « ✅|❌ ID … » chacun, puis « ops-acquisition-qa <migration> : PASS » ou « … : FAIL — ids ») :
//   socle         OA-1 … OA-13 de 026-060 ; en --reel, OA-R (la liste « --reel » de 026-060).
//   echanges      OB-1 … OB-24 de 026-061 (OB-15 : acq_oppositions_depuis n'existe plus). Les critères de comportement
//                 (OB-14, OB-16 à OB-24) = leur lecture du SQL ET leurs clés de l'essai à sec, relu dans
//                 .orchestre/preuves/026-061/essai-a-sec.json (ou .txt) : « ESSAI_A_SEC <empreinte du jumeau nu> {…} » et
//                 « APRES rien_ne_reste=true » (format de scripts/lib/sql-essai.mjs, lireCompteRendu) ; en --reel, OB-R.
//   planification PG-1 … PG-4 de 026-136 ; en --reel, PG-R (passages_cron de la dernière heure ; cron.job si exposé).
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide ou préalable manquant. N'écrit que sous
// .orchestre/travail/ops-acquisition-qa/. N'affiche aucun secret. Aucun appel réseau hors --reel.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, lireOptions, exigerSousTravail, sous, contient, normaliser as normaliserTexte } from './fixtures/026-acquisition/commun.mjs'
import {
  instructions, normaliser, codeSeul, compacter, serrer, masquer, fermante, decouperVirgules, segments, nonRegression,
  lireEnvLocal, jumeauNuCoupe, empreinte, lireCompteRendu, lf,
} from './lib/sql-essai.mjs'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'

const NOM = 'ops-acquisition-qa'
const HOTE = 'prestiapp.fr'
const URL_ESSAI = `https://${HOTE}/essai-formulaire/envoi`
const TEMOIN = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'cli', 'temoins', 'ops')
const K = await import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)

// ── Les chaînes refusées (026-037, JP-5) : le seul endroit du juge où ces mots s'écrivent ─────────────────────────────────
// chaînes refusées : début
const REFUS = Object.freeze({ mot: 'sequenceur', motAccent: 'séquenceur', parametre: 'p_sequenceur_id' })
// chaînes refusées : fin

// ── Le cahier, recopié des fiches ─────────────────────────────────────────────────────────────────────────────────────────
const IDS = {
  socle: Array.from({ length: 13 }, (_, i) => `OA-${i + 1}`),
  echanges: Array.from({ length: 24 }, (_, i) => `OB-${i + 1}`),
  planification: ['PG-1', 'PG-2', 'PG-3', 'PG-4'],
}
const SUFFIXE = { socle: 'acquisition_socle', echanges: 'acquisition_echanges', planification: 'acquisition_planification' }
// 026-060 §2 : les neuf fonctions d'origine et les quatre de la voie gratuite.
const FONCTIONS_SOCLE = ['acq_en_pause', 'acq_candidats_enregistrer', 'acq_reserver', 'acq_prospect_mettre_a_jour', 'acq_oppose', 'acq_opposer', 'acq_annonceurs_enregistrer', 'acq_evenement', 'acq_purger', 'acq_curseur_lire', 'acq_curseur_poser', 'acq_jeton_meta_poser', 'acq_jeton_meta']
// 026-061 §2 : chaque fonction publique de 0106 (le déclencheur ops.garde_fenetre_meta est jugé à part, OB-14).
const FONCTIONS_ECHANGES = [
  'acq_plafond_du_jour', 'acq_envois_du_jour', 'acq_historique_contacts',
  'acq_prospects_pour_premier_contact', 'acq_prospects_pour_relance', 'acq_prospects_pour_maquette', 'acq_prospects_oui',
  'acq_envois_perimer', 'acq_envoi_preparer', 'acq_envois_a_approuver', 'acq_envoi_approuver', 'acq_envoi_annuler', 'acq_envois_approuves',
  'acq_envoi_envoye', 'acq_formulaires_a_porter', 'acq_formulaire_echec', 'acq_envoi_echec',
  'acq_maquette_de', 'acq_maquettes_du_jour', 'acq_maquette_prete', 'acq_maquette_lien_creer', 'acq_maquette_par_jeton', 'acq_maquettes_a_purger', 'acq_maquette_purgee',
  'acq_reponse_recue', 'acq_reponses_a_traiter', 'acq_reponse_classer', 'acq_reponses_a_repondre', 'acq_reponse_repondue', 'acq_reponse_reclasser',
  'acq_reponses_reclassees', 'acq_reponse_actes_faits', 'acq_reponse_appel_rendu',
  'acq_conversation_enregistrer', 'acq_conversation', 'acq_meta_evenement_enregistrer', 'acq_meta_evenements_a_traiter', 'acq_meta_evenement_traite',
  'acq_rdv_lien_creer', 'acq_rdv_par_jeton', 'acq_rdv_creneaux_pris', 'acq_rdv_reserver', 'acq_rdv_appel_rendu',
  'acq_entrant_email_ajouter', 'acq_prospect_export', 'acq_effacement_demander', 'acq_echanges_purger', 'acq_preuves_a_garder', 'acq_decision_creer',
]
const FONCTIONS_DISPARUES = ['acq_reponse_relayer', 'acq_envoi_marquer', 'acq_oppositions_depuis']
// 026-060 §2 bis : la copie du juge (nom, libellé, capacités, types créés, tables écrites, période, quota, plafond €/jour).
const TOUS_TYPES = ['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']
const AGENTS = [
  ['vigie_meta', 'Vigie Meta (A7)', [], [], [], 1440, 0, 0],
  ['recenseur', 'Recenseur (A8)', [], [], [], 360, 0, 0],
  ['juge_faits', 'Juge des faits (J1)', [], [], [], 360, 0, 0],
  ['redacteur', 'Rédacteur du lot (A1)', [], [], [], 720, 0, 0],
  ['standardiste', 'Standardiste (A3)', [], [], [], 5, 0, 0],
  ['atelier_maquettes', 'Atelier des maquettes (A2)', [], [], [], 60, 0, 0],
  ['crieur', 'Crieur (A14)', [], [], [], 1440, 0, 0],
  ['chef', "Chef d'opérations (A10)", [], TOUS_TYPES, ['taches', 'decisions', 'evenements'], 60, 20, 0],
  ['pont', "Pont de l'orchestre", TOUS_TYPES, [], ['taches', 'evenements'], 10080, 0, 0],
  ['redacteur_site', 'Rédacteur des sites (A4, v2)', [], [], [], 10080, 0, 0],
  ['livreur', 'Livreur de sites (A4)', ['livraison'], [], [], 15, 0, 0],
  ['facteur', 'Facteur (envoi)', [], [], [], 15, 0, 0],
  ['facteur_usine', "Porteur du formulaire, sur l'usine", [], [], [], 15, 0, 0],
  ['repondeur', 'Répondeur (assistant IA)', [], [], [], 15, 0, 0],
  ['experience', 'Expérience isolée', [], [], [], 480, 0, 0],
]
const PARAMS_AGENT = ['p_nom', 'p_libelle', 'p_capacites', 'p_types_crees', 'p_tables', 'p_periode_minutes', 'p_debit_minute', 'p_quota_creations_jour', 'p_plafond_euros_jour']
// 026-136 §1 et §2 : les dix tâches HTTP et la tâche SQL.
const TACHES_HTTP = [
  ['acq-vigie-meta', '10 5-8 * * *', 'vigie-meta'], ['acq-recenseur', '*/10 5-19 * * *', 'recenseur'], ['acq-rge', '15 2 * * *', 'recenseur?passe=rge'],
  ['acq-juge-faits', '35 6-19 * * *', 'juge-faits'], ['acq-redacteur', '0 5,12 * * *', 'redacteur'], ['acq-standardiste', '*/5 * * * *', 'standardiste'],
  ['acq-maquettes-purge', '20 2 * * *', 'maquettes-purge'], ['acq-facteur', '*/15 * * * *', 'facteur'], ['acq-facteur-soir', '0 18,19 * * *', 'facteur?passe=soir'],
  ['acq-repondeur', '*/15 * * * *', 'repondeur'],
]
const TACHE_SQL = ['acq-purge-prospects', '40 2 * * *']
const NOMS_TACHES = [...TACHES_HTTP.map((t) => t[0]), TACHE_SQL[0]]
// Les clés de l'essai à sec de 0106 (026-061 point 4 et cahier OB) : une par assertion de comportement, préfixée par son critère.
const CLES_ESSAI = {
  'OB-14': ['ob14_messagerie_23h', 'ob14_messagerie_25h_refusee', 'ob14_privee_6j', 'ob14_privee_8j_refusee', 'ob14_privee_seconde_refusee'],
  'OB-16': ['ob16_prix_pose', 'ob16_rejoue_identique', 'ob16_reclassee_pas_a_repondre', 'ob16_apres_actes_a_repondre', 'ob16_ignorer', 'ob16_autre_agent_null', 'ob16_ouverte_null', 'ob16_options_7_acceptees', 'ob16_options_8_refusees', 'ob16_options_1_refusee', 'ob16_notre_dernier_envoi'],
  'OB-17': ['ob17_deux_entrants_rendus', 'ob17_froid_oui_rendu', 'ob17_maquette_prete_reste_oui', 'ob17_oui_rend_le_froid', 'ob17_froid_pairs_seulement', 'ob17_oui_rend_entrant', 'ob17_lien_prepare_entrant', 'ob17_entrants_comptes_a_part'],
  'OB-18': ['ob18_export_sans_jeton_verdict_texte', 'ob18_effacement_opposition_definitive', 'ob18_purge_7j', 'ob18_pas_purge_6j', 'ob18_opposition_gardee'],
  'OB-19': ['ob19_reference_double'],
  'OB-20': ['ob20_preuve_incomplete_refusee', 'ob20_preuve_complete_envoye'],
  'OB-21': ['ob21_pause', 'ob21_opposition', 'ob21_plafond', 'ob21_disjoints', 'ob21_sans_email', 'ob21_essai_avec_plafond', 'ob21_essai_sans_plafond', 'ob21_essai_autre_url', 'ob21_echec_non_definitif', 'ob21_echec_definitif'],
  'OB-22': ['ob22_source_refusee', 'ob22_ordre_rattachement', 'ob22_gmail_pas_domaine', 'ob22_hors_fil', 'ob22_accuse_sans_contact'],
  'OB-23': ['ob23_froid_pas_relance', 'ob23_lien_5j_une_fois'],
  'OB-24': ['ob24_repondu_garde', 'ob24_sans_reponse', 'ob24_efface', 'ob24_inconnu', 'ob24_borne_501'],
}
const TOUTES_CLES_ESSAI = Object.values(CLES_ESSAI).flat()
const ESSAI_0106 = ['.orchestre/preuves/026-061/essai-a-sec.json', '.orchestre/preuves/026-061/essai-a-sec.txt']

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (racine, rel) => { try { return lf(fs.readFileSync(path.join(racine, rel), 'utf8')) } catch { return null } }
const existe = (racine, rel) => fs.existsSync(path.join(racine, rel))
const liste = (a, n = 6) => (a.length > n ? `${a.slice(0, n).join(', ')} … (${a.length})` : a.join(', '))
const fichiersMigration = (racine, suffixe) => {
  let noms = []
  try { noms = fs.readdirSync(path.join(racine, 'supabase', 'migrations')) } catch { return [] }
  return noms.filter((n) => new RegExp(`^\\d{4}_${suffixe}\\.sql$`).test(n)).sort().map((n) => `supabase/migrations/${n}`)
}
const numero = (rel) => Number(/(\d{4})_/.exec(path.basename(rel))?.[1] ?? NaN)
const cheminsDe = (rel) => {
  const num = /(\d{4})_/.exec(path.basename(rel))[1]
  const base = path.basename(rel, '.sql')
  return { migration: rel, jumeau: `supabase/migrations/_A_COLLER_sql_editor_${num}.sql`, nu: `supabase/migrations/_A_COLLER_sql_editor_${num}_NU.sql`, controle: `supabase/controles/${base}.sql`, num }
}

// ── Lecture du SQL ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les instructions : { t (texte), n (normalisé, chaînes gardées), c (code seul, chaînes vidées) }. */
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: codeSeul(t) }))
function typeCanon(t) {
  return String(t).toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/^integer$|^int4$/, 'int').replace(/^bigint$|^int8$/, 'bigint').replace(/^boolean$|^bool$/, 'boolean')
    .replace(/^timestamp with time zone$/, 'timestamptz').replace(/^character varying.*$|^varchar.*$/, 'text')
}
/** Les fonctions créées : Map(nom → [{ schema, nom, params: [[nom, type]], rend, entete (code seul), corps, c (corps compact), s (corps serré) }]). */
function lireFonctions(ins) {
  const out = new Map()
  for (const x of ins) {
    const m = /^create (?:or replace )?function ([a-z_]+)\.([a-z0-9_]+)\(/.exec(x.n)
    if (!m) continue
    const t = x.t, mm = masquer(t)
    const i = mm.indexOf('('), j = i < 0 ? -1 : fermante(mm, i)
    const params = j > i ? decouperVirgules(t.slice(i + 1, j)).map((p) => normaliser(p).replace(/^(in|inout|variadic) /, '')).filter(Boolean).map((p) => {
      const sansDefaut = p.split(/ default | = /)[0]
      const nom = sansDefaut.split(' ')[0].replace(/"/g, '')
      return [nom, typeCanon(sansDefaut.slice(nom.length + 1))]
    }) : []
    let pos = 0, corps = ''
    for (const s of segments(t)) { if (!corps && s.type === 'dollar' && pos > j) corps = s.corps; pos += s.texte.length }
    const entete = x.c
    const rend = /\) returns (.+?) (?:language|as|security|set|stable|immutable|volatile|strict|leakproof|parallel|cost|rows|called)\b/.exec(entete)?.[1] ?? null
    const f = { schema: m[1], nom: m[2], params, rend, entete, corps, c: compacter(corps), s: serrer(corps) }
    if (!out.has(f.nom)) out.set(f.nom, [])
    out.get(f.nom).push(f)
  }
  return out
}
/** Les revoke et grant sur des fonctions : { revokes: Map(nom → Set rôles), grants: Map(nom → Set rôles) }. */
function lireDroits(ins) {
  const revokes = new Map(), grants = new Map()
  for (const x of ins) {
    const m = /^(revoke|grant) (.+?) on (?:function|functions|routine|routines) (.+) (from|to) ([a-z_, ]+?)(?: cascade| restrict| granted by .*)?$/.exec(x.n)
    if (!m || !/\b(all|execute)\b/.test(m[2])) continue
    const cible = m[1] === 'revoke' ? revokes : grants
    const roles = m[5].split(',').map((r) => r.trim()).filter(Boolean)
    for (const y of m[3].matchAll(/\b(?:public|ops)\.([a-z0-9_]+)/g)) {
      if (!cible.has(y[1])) cible.set(y[1], new Set())
      for (const r of roles) cible.get(y[1]).add(r)
    }
  }
  return { revokes, grants }
}
/** Le contrôle de sécurité d'une liste de fonctions (OA-2, OB-2). */
function securite(fonctions, droits, noms) {
  const e = []
  for (const n of noms) {
    const defs = fonctions.get(n)
    if (!defs) { e.push(`${n} absente`); continue }
    for (const f of defs) {
      if (f.schema !== 'public') e.push(`${n} créée dans ${f.schema}, public attendu`)
      if (!/\bsecurity definer\b/.test(f.entete)) e.push(`${n} sans security definer`)
      if (!/\bset search_path (=|to) /.test(f.entete)) e.push(`${n} sans search_path fixé`)
    }
    const rv = droits.revokes.get(n) ?? new Set()
    const manque = ['public', 'anon', 'authenticated'].filter((r) => !rv.has(r))
    if (manque.length) e.push(`${n} : pas de revoke à ${manque.join(', ')}`)
    const gr = [...(droits.grants.get(n) ?? [])]
    if (!gr.includes('service_role')) e.push(`${n} : pas de grant execute à service_role`)
    const autres = gr.filter((r) => r !== 'service_role')
    if (autres.length) e.push(`${n} : grant à ${autres.join(', ')} (service_role seul)`)
  }
  return e
}
/** Une valeur SQL littérale : chaîne, nombre, booléen, null, tableau (array[…] ou '{…}'). */
function valeurSql(texte) {
  let t = String(texte).trim()
  for (let k = 0; k < 3; k++) t = t.replace(/::[a-z_ ]+(\[\])?$/i, '').trim()
  if (/^null$/i.test(t)) return null
  if (/^(true|false)$/i.test(t)) return /^true$/i.test(t)
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  const a = /^array\s*\[([\s\S]*)\]$/i.exec(t)
  if (a) return a[1].trim() ? decouperVirgules(a[1]).map(valeurSql) : []
  const s = /^'([\s\S]*)'$/.exec(t)
  if (s) {
    const v = s[1].replace(/''/g, "'")
    const acc = /^\{([\s\S]*)\}$/.exec(v)
    return acc ? (acc[1].trim() ? acc[1].split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : []) : v
  }
  return { expression: t }
}
/** Les appels « nom(…) » d'un texte (hors définition et hors droits) : [[arguments bruts]]. */
function appels(texte, nom) {
  const out = []
  const mm = masquer(texte)
  const re = new RegExp(`\\b${nom}\\s*\\(`, 'gi')
  for (const m of mm.matchAll(re)) {
    const avant = mm.slice(Math.max(0, m.index - 40), m.index).toLowerCase()
    if (/function\s+(public\.|ops\.)?$/.test(avant)) continue
    const i = m.index + m[0].length - 1, j = fermante(mm, i)
    if (j < 0) continue
    out.push(decouperVirgules(texte.slice(i + 1, j)).map((x) => x.trim()))
  }
  return out
}
/** Les appels, y compris dans les blocs $…$ (un bloc DO, par exemple). */
function appelsProfonds(texte, nom) {
  const out = appels(texte, nom)
  for (const s of segments(texte)) if (s.type === 'dollar' && s.corps) out.push(...appelsProfonds(s.corps, nom))
  return out
}
/** Le texte SQL sans commentaires, corps compris (pour les appels faits dans un bloc DO). */
const sqlSansCommentaires = (sql) => sansCommentaires(lf(sql))
/** Les couples ('a','b') d'étapes écrits après un « values » dans une instruction qui parle de transitions. */
function couplesTransitions(ins, etapes) {
  const out = new Set()
  for (const x of ins) {
    if (!/transition/i.test(x.t)) continue
    const blocs = [x.t, ...segments(x.t).filter((s) => s.type === 'dollar').map((s) => s.corps)]
    for (const b of blocs) {
      for (const v of b.matchAll(/\bvalues\b([\s\S]*?)(?:;|\bon\s+conflict\b|\breturning\b|\)\s*as\b|$)/gi)) {
        for (const c of v[1].matchAll(/\(\s*'([a-z_]+)'\s*,\s*'([a-z_]+)'\s*\)/g)) if (etapes.has(c[1]) && etapes.has(c[2])) out.add(`${c[1]}>${c[2]}`)
      }
    }
  }
  return out
}
function lireControle(racine, rel) {
  const C = lire(racine, rel)
  if (C === null || !C.trim()) return { e: [`contrôle ${C === null ? 'absent' : 'vide'} : ${rel}`], C }
  const e = []
  const ins = lireInstructions(C)
  if (!ins.length) e.push(`${rel} ne porte aucune instruction`)
  for (const x of ins) if (!/^(select|with)\b/.test(x.n)) e.push(`${rel} : instruction qui n'est pas une lecture : « ${court(x.n, 80)} »`)
  const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum|comment)\b/.exec(codeSeul(C))
  if (verbe) e.push(`${rel} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
  if (!C.includes("'oui'")) e.push(`${rel} ne rend aucune ligne « oui »`)
  return { e, C }
}
function lancerNode(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 64 << 20, ...opts })
}
/** Les jumeaux (OA-3, OB-3, PG-4) : sql-nu.mjs --verifier accepte chacun face à la migration (le jumeau coupé à la marque). */
function jumeaux(racine, ch, travail) {
  const e = []
  for (const j of [ch.jumeau, ch.nu]) {
    const t = lire(racine, j)
    if (t === null || !t.trim()) { e.push(`${j} ${t === null ? 'absent' : 'vide'}`); continue }
    let cible = path.join(racine, j)
    if (t.includes(MARQUE_CONTROLE)) { cible = path.join(travail, `coupe-${path.basename(j)}`); fs.writeFileSync(cible, t.split(MARQUE_CONTROLE)[0]) }
    const v = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), '--verifier', path.join(racine, ch.migration), cible])
    if (v.status !== 0) e.push(`sql-nu.mjs --verifier ${ch.migration} ${j} : code ${v.status} — ${court(`${v.stdout}${v.stderr}`, 160)}`)
  }
  const N = lire(racine, ch.nu), C = lire(racine, ch.controle)
  if (N && !N.includes(MARQUE_CONTROLE)) e.push(`${ch.nu} ne porte pas le contrôle après la marque (sql-nu.mjs --controle ${ch.controle})`)
  else if (N && C && N.split(MARQUE_CONTROLE)[1].trim() !== C.trim()) e.push(`ce qui suit la marque dans ${ch.nu} n'est pas exactement ${ch.controle}`)
  return e
}
/** Le corps d'une méthode d'un objet TypeScript (« nom(…) { », « async nom(…) { », « nom: async (…) => { »). */
function corpsMethode(src, nom) {
  const res = []
  const re = new RegExp(`(?:^|[\\s,{;])(?:async\\s+)?${nom}\\s*(?:<[^>]*>)?\\s*\\(|(?:^|[\\s,{;])${nom}\\s*:\\s*(?:async\\s*)?(?:function\\s*)?\\(`, 'g')
  for (const m of src.matchAll(re)) {
    let i = src.indexOf('(', m.index + m[0].length - 1)
    let prof = 0, j = i
    for (; j < src.length; j++) { if (src[j] === '(') prof++; else if (src[j] === ')') { prof--; if (!prof) break } }
    const reste = src.slice(j + 1)
    const acc = /^\s*(?::[^={]+)?(?:=>)?\s*\{/.exec(reste)
    if (!acc) { const fl = /^\s*(?::[^=]+)?=>\s*/.exec(reste); if (fl) { const fin = reste.search(/,\s*\n\s*(?:async\s+)?[\w$]+\s*[:(]|\n\s*\}/); res.push(reste.slice(0, fin < 0 ? 400 : fin)) } continue }
    let k = j + 1 + acc[0].length - 1, p = 0, fin = k
    for (; fin < src.length; fin++) { const c = src[fin]; if (c === '{') p++; else if (c === '}') { p--; if (!p) break } }
    res.push(src.slice(k, fin + 1))
  }
  return res
}
/** Les méthodes d'une interface de contrat.ts. */
function methodesInterface(nom) {
  const src = fs.readFileSync(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts'), 'utf8')
  const m = new RegExp(`export interface ${nom}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(src)
  if (!m) throw new Error(`interface ${nom} introuvable dans contrat.ts`)
  return [...m[1].matchAll(/^\s{2}([a-zA-Z]\w*)\s*\(/gm)].map((x) => x[1])
}
/** OA-6 / OB-7 : chaque méthode appelle rpc avec le nom d'une fonction du SQL. */
function jugerMagasin(racine, interfaceNom, definies, exceptions = {}) {
  const e = []
  const src = lire(racine, 'lib/agents/acquisition/magasinSupabase.ts')
  if (src === null) return [`lib/agents/acquisition/magasinSupabase.ts absent`]
  const nu = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1')
  if (!/\.rpc\s*\(/.test(nu)) e.push('magasinSupabase.ts n\'appelle jamais .rpc(')
  for (const m of methodesInterface(interfaceNom)) {
    const corps = corpsMethode(nu, m)
    if (!corps.length) { e.push(`méthode ${m} absente`); continue }
    const noms = corps.flatMap((c) => [...c.matchAll(/['"`]((?:acq|ops)_[a-z0-9_]+)['"`]/g)].map((x) => x[1]))
    const motif = exceptions[m] ?? /^acq_/
    const bons = noms.filter((n) => motif.test(n) && definies.has(n))
    if (!bons.length) e.push(`${m} n'appelle aucune fonction ${motif.source.replace('^', '')}… définie par le SQL${noms.length ? ` (cite ${liste(noms, 3)})` : ''}`)
  }
  return e
}
/** Une section Markdown : du titre qui répond à `re` au titre suivant de même niveau ou plus haut. */
function sectionMarkdown(md, re) {
  const l = md.split('\n')
  const i = l.findIndex((x) => re.test(x))
  if (i < 0) return null
  const niv = /^(#+)/.exec(l[i])?.[1].length ?? 6
  let j = i + 1
  while (j < l.length && !(new RegExp(`^#{1,${niv}}\\s`).test(l[j]))) j++
  return l.slice(i, j).join('\n')
}

// ── Le rapport ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rapport(ids) {
  const res = new Map()
  const ajouter = (id, echecs, ok) => {
    const r = res.get(id) ?? { echecs: [], oks: [] }
    r.echecs.push(...echecs); if (ok) r.oks.push(ok)
    res.set(id, r)
  }
  return {
    ids, res,
    juger: (id, echecs, ok) => ajouter(id, echecs.filter(Boolean), ok),
    nonJuges: (raison) => { for (const id of ids) if (!res.has(id)) ajouter(id, [`non jugé : ${raison}`]) },
    rouge: (id) => !!res.get(id)?.echecs.length,
    lignes() {
      return ids.map((id) => {
        const r = res.get(id)
        if (!r) return { id, ok: false, t: `❌ ${id} non évalué` }
        const ok = !r.echecs.length
        const d = ok ? r.oks.join(' ; ') : r.echecs.slice(0, 6).join(' ; ') + (r.echecs.length > 6 ? ` ; … (${r.echecs.length} défauts)` : '')
        return { id, ok, t: `${ok ? '✅' : '❌'} ${id} ${String(d || (ok ? 'conforme' : 'en échec')).replace(/\s*\n\s*/g, ' · ')}` }
      })
    },
  }
}

// ── 0105 : le socle (026-060) ─────────────────────────────────────────────────────────────────────────────────────────────
function jugerSocle(racine, { temoin, travail }) {
  const r = rapport([...IDS.socle])
  const migs = fichiersMigration(racine, SUFFIXE.socle)
  if (migs.length !== 1) { r.juger('OA-1', [`${migs.length} fichier(s) supabase/migrations/*_acquisition_socle.sql, exactement 1 attendu${migs.length ? ` (${migs.join(', ')})` : ''}`]); r.nonJuges('migration du socle absente ou en double'); return r }
  const ch = cheminsDe(migs[0])
  const sql = lire(racine, ch.migration)
  const ins = lireInstructions(sql), F = lireFonctions(ins), D = lireDroits(ins), brut = sqlSansCommentaires(sql)
  // OA-1
  {
    const e = []
    const bus = Math.max(...fs.readdirSync(path.join(racine, 'supabase', 'migrations')).filter((n) => /^\d{4}_ops_[a-z_]+\.sql$/.test(n)).map(numero), -1)
    if (bus < 0) e.push('aucune migration ops du bus (*_ops_*.sql) dans la racine')
    else if (!(Number(ch.num) > bus)) e.push(`numéro ${ch.num} ≤ ${String(bus).padStart(4, '0')}, celui de la migration ops du bus`)
    let nr = 'témoin : la non-régression (git diff) ne se juge que sur le dépôt'
    if (!temoin) { const x = nonRegression(racine, { exclus: [ch.migration, ch.jumeau, ch.nu, ch.controle] }); e.push(...x.echecs); nr = x.resume }
    r.juger('OA-1', e, `${ch.migration}, seul, numéro ${ch.num} > ${String(bus).padStart(4, '0')} (bus) ; ${nr}`)
  }
  // OA-2
  r.juger('OA-2', securite(F, D, FONCTIONS_SOCLE), `les ${FONCTIONS_SOCLE.length} fonctions : security definer, search_path fixé, revoke à public, anon, authenticated, grant execute à service_role seul`)
  // OA-3
  r.juger('OA-3', jumeaux(racine, ch, travail), `${ch.jumeau} et ${ch.nu} acceptés par sql-nu.mjs --verifier ; le nu porte ${ch.controle} après la marque`)
  // OA-4
  {
    const etapes = new Set([...Object.keys(K.TRANSITIONS), ...Object.values(K.TRANSITIONS).flat()])
    const attendu = new Set(Object.entries(K.TRANSITIONS).flatMap(([a, bs]) => bs.map((b) => `${a}>${b}`)))
    const vu = couplesTransitions(ins, etapes)
    const manque = [...attendu].filter((x) => !vu.has(x)), trop = [...vu].filter((x) => !attendu.has(x))
    const e = []
    if (!vu.size) e.push('aucune table des transitions (values de couples d\'étapes dans une instruction « transition… ») dans le SQL')
    if (manque.length) e.push(`transitions de contrat.ts absentes du SQL : ${liste(manque)}`)
    if (trop.length) e.push(`transitions du SQL absentes de contrat.ts : ${liste(trop)}`)
    const mettre = F.get('acq_prospect_mettre_a_jour')?.[0]
    if (mettre && !/transition/.test(mettre.c)) e.push('acq_prospect_mettre_a_jour ne lit pas la table des transitions')
    r.juger('OA-4', e, `${vu.size} couples, égaux paire par paire à TRANSITIONS de contrat.ts, lus par acq_prospect_mettre_a_jour`)
  }
  // OA-5
  {
    const e = []
    for (const x of ins) {
      if (/\bdrop (table|column)\b/.test(x.c)) e.push(`« ${court(x.n, 70)} » (drop)`)
      if (/\balter column [a-z_"]+ (set data )?type\b/.test(x.c)) e.push(`« ${court(x.n, 70)} » (changement de type)`)
    }
    const avant = fs.readdirSync(path.join(racine, 'supabase', 'migrations')).filter((n) => /^\d{4}_[a-z0-9_]+\.sql$/.test(n) && numero(n) < Number(ch.num))
      .some((n) => /create table (if not exists )?ops\.prospects\b/.test(codeSeul(lire(racine, `supabase/migrations/${n}`) ?? '')))
    for (const x of ins) {
      if (/^create table (if not exists )?ops\.prospects\b/.test(x.c) && avant) e.push('ops.prospects recréée alors qu\'elle existait avant')
      if (/^alter table (if exists )?(only )?ops\.prospects\b/.test(x.c)) {
        const clauses = decouperVirgules(x.n.replace(/^alter table (if exists )?(only )?ops\.prospects /, ''))
        for (const c of clauses) if (!/^add column if not exists /.test(c.trim())) e.push(`ops.prospects touchée autrement que par add column if not exists : « ${court(c, 60)} »`)
      }
    }
    r.juger('OA-5', e, `aucun drop table, drop column ni changement de type ; ops.prospects (${avant ? 'créée avant' : 'absente avant'}) touchée seulement par add column if not exists`)
  }
  // OA-6
  {
    const e = jugerMagasin(racine, 'MagasinSocle', new Set(F.keys()))
    let tc = 'témoin : npm run typecheck ne se juge que sur le dépôt'
    if (!temoin && !e.length) { const t = typecheck(racine); if (!t.ok) e.push(t.detail); tc = t.detail }
    r.juger('OA-6', e, `magasinSupabase.ts : chaque méthode de MagasinSocle appelle une fonction acq_ du SQL ; ${tc}`)
  }
  // OA-7
  {
    const e = []
    const md = lire(racine, 'docs/registre-traitements.md')
    const s = md === null ? null : sectionMarkdown(md, /^#{1,6}\s*11\s*[.)]/)
    if (md === null) e.push('docs/registre-traitements.md absent')
    else if (!s) e.push('section « 11. » absente du registre')
    else {
      for (const m of ['3 ans', 'dernier contact émanant du prospect', 'diffusion partielle', 'opposition', '10 minutes', 'assistant IA', 'formulaire de contact', 'ADEME']) if (!contient(s, m)) e.push(`« ${m} » absent`)
      if (!contient(s, 'écrire STOP') && !contient(s, 'écrivez STOP')) e.push('ni « écrire STOP » ni « écrivez STOP »')
      for (const m of ['ADEME', "Recherche d'entreprises", "site de l'entreprise", 'bibliothèque publicitaire', 'la personne elle-même']) if (!contient(s, m)) e.push(`source « ${m} » absente`)
      const l = s.split('\n'), i = l.findIndex((x) => /sous-traitant/i.test(x))
      if (i < 0) e.push('aucune ligne « sous-traitants »')
      else {
        let j = i + 1
        while (j < l.length && l[j].trim() && !/^\s*[-*]\s|^\s*\|/.test(l[j]) && !/^#/.test(l[j])) j++
        const st = l.slice(i, j).join(' ')
        for (const m of ['OpenAI', 'Meta', 'Google', 'Oracle', 'GitHub']) if (!contient(st, m)) e.push(`sous-traitant « ${m} » absent de sa ligne`)
      }
      for (const m of ['adresses nominatives', 'désinscription', "outil d'envoi", 'fournisseur des boîtes']) if (contient(s, m)) e.push(`« ${m} » présent (refusé)`)
    }
    r.juger('OA-7', e, 'section 11 : 3 ans, dernier contact émanant du prospect, diffusion partielle, opposition, 10 minutes, assistant IA, formulaire de contact, ADEME, STOP, les cinq sources, OpenAI, Meta, Google, Oracle et GitHub en sous-traitants ; aucun mot refusé')
  }
  // OA-8
  const ctl = lireControle(racine, ch.controle)
  r.juger('OA-8', ctl.e, `${ch.controle} : des select seulement, ni insert, update, delete, drop, alter ni create ; des lignes « oui »`)
  // OA-9
  {
    const e = []
    const vus = new Map()
    for (const a of appelsProfonds(brut, 'ops_agent_enregistrer')) {
      const v = {}
      a.forEach((x, k) => { const nm = /^(p_[a-z_]+)\s*(?:=>|:=)\s*([\s\S]*)$/i.exec(x); if (nm) v[nm[1].toLowerCase()] = valeurSql(nm[2]); else v[PARAMS_AGENT[k]] = valeurSql(x) })
      const nom = v.p_nom
      if (typeof nom !== 'string') { e.push(`appel à ops_agent_enregistrer sans nom littéral (« ${court(a[0] ?? '', 40)} »)`); continue }
      vus.set(nom, (vus.get(nom) ?? []).concat([v]))
    }
    const tri = (x) => (Array.isArray(x) ? [...x].sort().join(',') : x === null ? '' : `?${JSON.stringify(x)}`)
    for (const [nom, , cap, types, tables, periode, quota, plafond] of AGENTS) {
      const l = vus.get(nom)
      if (!l) { e.push(`${nom} non semé`); continue }
      if (l.length !== 1) e.push(`${nom} semé ${l.length} fois (une attendue)`)
      const v = l[0]
      if (typeof v.p_libelle !== 'string' || !v.p_libelle.trim()) e.push(`${nom} : libellé vide`)
      for (const [cle, att, lib] of [['p_capacites', cap, 'capacités'], ['p_types_crees', types, 'types créés'], ['p_tables', tables, 'tables']]) if (tri(v[cle]) !== tri(att)) e.push(`${nom} : ${lib} ${JSON.stringify(v[cle])}, ${JSON.stringify(att)} attendu`)
      for (const [cle, att, lib] of [['p_periode_minutes', periode, 'période'], ['p_quota_creations_jour', quota, 'quota'], ['p_plafond_euros_jour', plafond, 'plafond'], ['p_debit_minute', 30, 'débit']]) if (v[cle] !== att) e.push(`${nom} : ${lib} ${JSON.stringify(v[cle])}, ${att} attendu`)
    }
    for (const nom of vus.keys()) if (!AGENTS.some((a) => a[0] === nom)) e.push(`${nom} semé, absent du tableau du §2 bis`)
    if (/\b(insert\s+into|update)\s+ops\.agents\b[^;]*\b(jeton_hash|en_pause|battement_le)\b/i.test(brut)) e.push('une écriture de ops.agents touche jeton_hash, en_pause ou battement_le')
    r.juger('OA-9', e, `ops_agent_enregistrer appelée une fois pour chacun des ${AGENTS.length} agents du tableau (facteur_usine compris), capacités, types, tables, période, quota, plafond et débit égaux à la copie du juge ; aucune graine n'écrit jeton_hash, en_pause ni battement_le`)
  }
  // OA-10
  {
    const e = []
    const f = F.get('acq_en_pause')?.[0]
    if (!f) e.push('acq_en_pause absente')
    else {
      if (!/ops_interrupteur\('pause_generale'\)/.test(f.c)) e.push('acq_en_pause n\'appelle pas ops_interrupteur(\'pause_generale\')')
      for (const m of ['en_pause', 'disjoncteur_ouvert_le', 'ops.agents']) if (!f.c.includes(m)) e.push(`acq_en_pause ne lit pas ${m}`)
    }
    if (/ops\.pause_generale/i.test(brut)) e.push('mention de ops.pause_generale')
    r.juger('OA-10', e, 'acq_en_pause : ops_interrupteur(\'pause_generale\'), en_pause et disjoncteur_ouvert_le de ops.agents ; aucune mention de ops.pause_generale')
  }
  // OA-11
  {
    const e = []
    const cand = F.get('acq_candidats_enregistrer')?.[0], opp = F.get('acq_opposer')?.[0], op = F.get('acq_oppose')?.[0], pur = F.get('acq_purger')?.[0]
    if (!cand || !opp || !op || !pur) e.push('acq_candidats_enregistrer, acq_opposer, acq_oppose ou acq_purger absente')
    else {
      const force = /froid/.test(cand.c) && (/(=|is)'entrant'\)?[^;']{0,40}false/.test(cand.c) || /(<>|!=)'entrant'/.test(cand.c))
      if (!force) e.push('acq_candidats_enregistrer ne force pas froid = false pour source = \'entrant\'')
      if (!opp.params.some(([n]) => n === 'p_expire_le')) e.push('acq_opposer sans p_expire_le')
      if (!/expire_le=null/.test(opp.c)) e.push('acq_opposer ne remet pas expire_le à null pour une définitive')
      if (!/donothing/.test(opp.c) && !/where[a-z_.]*expire_leisnotnull/.test(opp.c)) e.push('acq_opposer peut remplacer une définitive par une temporaire (ni do nothing, ni garde « expire_le is not null »)')
      if (!/etape='oppose'/.test(opp.c)) e.push('acq_opposer ne met aucun prospect à oppose')
      else if (!/p_expire_leisnull/.test(opp.c)) e.push('acq_opposer met à oppose sans garde « p_expire_le is null » (temporaire comprise)')
      if (!/expire_leisnullor[a-z_.]*expire_le>(now\(\)|current_timestamp|clock_timestamp\(\))|coalesce\([a-z_.]*expire_le,'infinity'(::timestamptz)?\)>(now\(\)|current_timestamp)/.test(op.c)) e.push('acq_oppose ne lit pas la seule opposition active (expire_le is null or expire_le > now())')
      if (!/coalesce\(([a-z_]+\.)?dernier_contact_recu,([a-z_]+\.)?cree_le\)/.test(pur.c)) e.push('acq_purger ne compte pas sur coalesce(dernier_contact_recu, cree_le)')
      if (/dernier_contact(?!_recu)/.test(pur.c)) e.push('acq_purger lit dernier_contact')
      if (!/'3years?'|'36mons?'|'1095days?'|3years/.test(pur.c)) e.push('acq_purger sans le délai de 3 ans')
    }
    r.juger('OA-11', e, 'entrant forcé chaud ; opposition temporaire sans remplacer une définitive ni changer l\'étape ; acq_oppose sur l\'active seule ; purge sur coalesce(dernier_contact_recu, cree_le) à 3 ans')
  }
  // OA-12
  {
    const e = []
    const add = ins.filter((x) => /^alter table (if exists )?(only )?ops\.prospects /.test(x.n)).flatMap((x) => decouperVirgules(x.n.replace(/^alter table (if exists )?(only )?ops\.prospects /, '')).map((c) => c.trim()))
    const col = (n) => add.find((c) => new RegExp(`^add column if not exists ${n} `).test(c))
    const cible = col('cible')
    if (!cible) e.push('ops.prospects ne gagne pas cible par add column if not exists')
    else {
      if (!/default 'artisan'/.test(cible)) e.push('cible sans défaut \'artisan\'')
      const chk = /check\s*\(cible in\(([^)]*)\)\)/.exec(cible)
      if (!chk || [...chk[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]).sort().join() !== 'artisan,marque') e.push('cible sans contrainte check (cible in (\'artisan\', \'marque\'))')
    }
    if (!col('formulaire')) e.push('ops.prospects ne gagne pas formulaire')
    if (!col('technologie')) e.push('ops.prospects ne gagne pas technologie')
    const cand = F.get('acq_candidats_enregistrer')?.[0]
    if (cand && !cand.c.includes("'ademe_rge'")) e.push('acq_candidats_enregistrer n\'accepte pas ademe_rge')
    if (!ins.some((x) => /^create table (if not exists )?ops\.curseurs\(/.test(x.c))) e.push('ops.curseurs non créée')
    if (!ins.some((x) => /^alter table (if exists )?(only )?ops\.curseurs enable row level security$/.test(x.c))) e.push('ops.curseurs sans RLS')
    if (ins.some((x) => /^create policy .* on ops\.curseurs\b/.test(x.c))) e.push('une politique sur ops.curseurs')
    if (ins.some((x) => /^grant .* on (table )?ops\.curseurs\b/.test(x.c))) e.push('un grant sur ops.curseurs')
    const poser = F.get('acq_jeton_meta_poser')?.[0], jeton = F.get('acq_jeton_meta')?.[0]
    if (!poser || !jeton) e.push('acq_jeton_meta_poser ou acq_jeton_meta absente')
    else {
      if (!/vault\.(create|update)_secret\(/.test(poser.c)) e.push('acq_jeton_meta_poser n\'appelle ni vault.create_secret ni vault.update_secret')
      if (!poser.c.includes("'meta_adlib_token'")) e.push('acq_jeton_meta_poser ne nomme pas meta_adlib_token')
      if (!/vault\.decrypted_secrets/.test(jeton.c)) e.push('acq_jeton_meta ne lit pas vault.decrypted_secrets')
      for (const f of [poser, jeton]) {
        for (const inst of f.s.split(';')) if (/\braise\b|evenement/.test(inst) && /\bp_jeton\b/.test(inst)) e.push(`${f.nom} : « ${court(inst, 60)} » cite p_jeton`)
      }
      for (const n of ['acq_jeton_meta_poser', 'acq_jeton_meta']) { const g = [...(D.grants.get(n) ?? [])]; if (g.join() !== 'service_role') e.push(`${n} exécutable par ${g.join(', ') || 'personne'} (service_role seul)`) }
    }
    if (ctl.C) {
      const reste = compacter(ctl.C).replace(/exists\(select1fromvault\.decrypted_secretswherename='meta_adlib_token'\)/g, '')
      if (/decrypted_secret/.test(reste)) e.push(`${ch.controle} lit vault.decrypted_secrets autrement que par exists (select 1 … where name = 'meta_adlib_token')`)
    }
    r.juger('OA-12', e, 'cible (défaut artisan, artisan ou marque), formulaire et technologie ajoutés ; ademe_rge accepté ; ops.curseurs fermée ; jeton Meta en coffre, service_role seul, jamais cité dans un raise ni un événement ; le contrôle ne lit pas le secret')
  }
  // OA-13
  {
    const e = []
    const md = lire(racine, 'docs/agents/analyse-interet-legitime.md')
    if (md === null) e.push('docs/agents/analyse-interet-legitime.md absent')
    else {
      for (const m of ['à approuver par Benj', 'intérêt poursuivi', 'nécessité', 'mise en balance']) if (!contient(md, m)) e.push(`« ${m} » absent`)
      const gf = new Map()
      for (const l of md.split('\n')) { const m = /^\s*(?:[-*]\s*)?(?:\|\s*)?(?:\*\*)?(\d{1,2})\s*(?:\*\*)?\s*[.)|—–-]/.exec(l); if (m) gf.set(Number(m[1]), (gf.get(Number(m[1])) ?? []).concat([l])) }
      for (let n = 1; n <= 20; n++) {
        const l = gf.get(n)
        if (!l) e.push(`garde-fou ${n} absent`)
        else if (!l.some((x) => /\b026-\d{3}\b/.test(x))) e.push(`garde-fou ${n} sans id de fiche 026-NNN`)
      }
      if ([...gf.keys()].some((n) => n > 20)) e.push(`garde-fou numéroté au-delà de 20 (${[...gf.keys()].filter((n) => n > 20).join(', ')})`)
    }
    r.juger('OA-13', e, 'à approuver par Benj, intérêt poursuivi, nécessité, mise en balance ; vingt garde-fous numérotés de 1 à 20, chacun avec un id 026-NNN')
  }
  return r
}

// ── 0106 : les échanges (026-061) ─────────────────────────────────────────────────────────────────────────────────────────
function jugerEchanges(racine, { temoin, travail }) {
  const r = rapport([...IDS.echanges])
  const migs = fichiersMigration(racine, SUFFIXE.echanges)
  if (migs.length !== 1) { r.juger('OB-1', [`${migs.length} fichier(s) supabase/migrations/*_acquisition_echanges.sql, exactement 1 attendu${migs.length ? ` (${migs.join(', ')})` : ''}`]); r.nonJuges('migration des échanges absente ou en double'); return r }
  const ch = cheminsDe(migs[0])
  const sql = lire(racine, ch.migration)
  const ins = lireInstructions(sql), F = lireFonctions(ins), D = lireDroits(ins), brut = sqlSansCommentaires(sql)
  const socle = fichiersMigration(racine, SUFFIXE.socle)
  const Fsocle = socle.length === 1 ? lireFonctions(lireInstructions(lire(racine, socle[0]))) : new Map()
  const corps = (n) => F.get(n)?.[0] ?? null
  const cols = (table) => ins.filter((x) => new RegExp(`^(create table (if not exists )?ops\\.${table}\\(|alter table (if exists )?(only )?ops\\.${table} )`).test(x.n)).map((x) => x.n).join(' ')
  // l'essai à sec : relu une fois, distribué aux critères de comportement
  const N = lire(racine, ch.nu)
  const essai = (() => {
    const f = ESSAI_0106.find((x) => existe(racine, x))
    if (!f) return { commun: [`essai à sec absent (${ESSAI_0106[0]}) : le comportement n'est pas prouvé`], res: {} }
    if (!N || !N.trim()) return { commun: ['jumeau nu absent : l\'empreinte de l\'essai ne se calcule pas'], res: {} }
    const e = empreinte(jumeauNuCoupe(path.join(racine, ch.nu)))
    const cr = lireCompteRendu(path.join(racine, f), { empreinte: e, cles: [] })
    const commun = cr.raisons.filter((x) => !/^clé\(s\) qui ne valent pas true/.test(x)).map((x) => `${f} : ${x}${/empreinte/.test(x) ? ` (attendue : ${e})` : ''}`)
    return { commun, res: cr.resultat ?? {}, fichier: f, e }
  })()
  const jugerEssai = (id) => {
    const cles = CLES_ESSAI[id]
    const e = [...essai.commun]
    if (!essai.commun.length) for (const k of cles) if (essai.res[k] !== true) e.push(`clé ${k} = ${JSON.stringify(essai.res[k] ?? 'absente')}`)
    return e
  }
  const essaiOk = (id) => `essai à sec (${essai.fichier ?? '—'}, empreinte ${String(essai.e ?? '').slice(0, 12)}…) : ${CLES_ESSAI[id].length} clé(s) à true`
  // OB-1
  {
    const e = []
    if (socle.length === 1 && !(numero(ch.migration) > numero(socle[0]))) e.push(`numéro ${ch.num} ≤ celui du socle (${socle[0]})`)
    if (socle.length !== 1) e.push('migration du socle absente : l\'ordre ne se juge pas')
    let nr = 'témoin : la non-régression (git diff) ne se juge que sur le dépôt'
    if (!temoin) { const x = nonRegression(racine, { exclus: [ch.migration, ch.jumeau, ch.nu, ch.controle] }); e.push(...x.echecs); nr = x.resume }
    r.juger('OB-1', e, `${ch.migration}, seul, après ${socle[0] ?? '—'} ; ${nr}`)
  }
  // OB-2
  r.juger('OB-2', securite(F, D, FONCTIONS_ECHANGES), `les ${FONCTIONS_ECHANGES.length} fonctions du §2 : security definer, search_path fixé, revoke à public, anon, authenticated, grant execute à service_role seul`)
  // OB-3
  { const c = lireControle(racine, ch.controle); r.juger('OB-3', [...jumeaux(racine, ch, travail), ...c.e], 'jumeaux acceptés par sql-nu.mjs --verifier ; contrôle en lecture seule') }
  // OB-4
  {
    const e = []
    const b = ins.filter((x) => /storage\.buckets/.test(x.n) && /'maquettes'/.test(x.n))
    if (!b.length) e.push('aucune instruction sur storage.buckets pour maquettes')
    const valeurs = {}
    for (const x of b) {
      const m = /^insert into storage\.buckets\s?\(([^)]*)\) values\s?\(([\s\S]*?)\)(?: on conflict|$)/.exec(x.n)
      if (m) { const c = m[1].split(',').map((y) => y.trim()); const v = decouperVirgules(m[2]); c.forEach((k, i) => { valeurs[k] = (valeurs[k] ?? []).concat([v[i]?.trim()]) }) }
      const set = /(?:do update set|^update storage\.buckets set) (.+?)(?: where .*)?$/.exec(x.n)
      if (set) for (const a of decouperVirgules(set[1])) { const [k, ...v] = a.split('='); const val = v.join('=').trim(); if (!/^excluded\./.test(val)) valeurs[k.trim()] = (valeurs[k.trim()] ?? []).concat([val]) }
    }
    const tous = (k, test, lib) => { const v = valeurs[k] ?? []; if (!v.length) e.push(`${k} non posé (${lib} attendu)`); else if (!v.every(test)) e.push(`${k} = ${v.join(' / ')}, ${lib} attendu`) }
    tous('public', (v) => /^false$/.test(v), 'false')
    tous('file_size_limit', (v) => v === '3145728', '3145728')
    tous('allowed_mime_types', (v) => { const a = valeurSql(v); return Array.isArray(a) && [...a].sort().join() === 'image/jpeg,video/mp4' }, "['image/jpeg','video/mp4']")
    for (const x of ins) if (/^create policy/.test(x.n) && /maquettes/.test(x.n)) e.push(`politique qui concerne maquettes : « ${court(x.n, 60)} »`)
    r.juger('OB-4', e, 'bucket maquettes : public = false, 3145728 octets, image/jpeg et video/mp4 exactement, aucune politique')
  }
  // OB-5
  {
    const e = []
    if (/(insert\s+into|update|delete\s+from)\s+ops\.quotas_canaux\b/i.test(brut)) e.push('0106 écrit ops.quotas_canaux')
    const f0096 = fs.readdirSync(path.join(racine, 'supabase', 'migrations')).find((n) => /^\d{4}_ops_socle\.sql$/.test(n))
    const s96 = f0096 ? lire(racine, `supabase/migrations/${f0096}`) : null
    if (!s96) e.push('migration ops du bus (*_ops_socle.sql) introuvable : les graines ne se comparent pas')
    else {
      const graines = {}
      for (const x of lireInstructions(s96)) {
        const m = /^insert into ops\.quotas_canaux\s?\(([^)]*)\) values([\s\S]*?)(?: on conflict.*)?$/.exec(x.n)
        if (!m) continue
        const c = m[1].split(',').map((y) => y.trim())
        for (const t of m[2].matchAll(/\(([^()]*)\)/g)) { const v = decouperVirgules(t[1]).map(valeurSql); const o = Object.fromEntries(c.map((k, i) => [k, v[i]])); if (o.envoyeur === '*') graines[o.canal] = o.plafond_jour }
      }
      for (const [canal, n] of Object.entries(K.PLAFONDS_DEFAUT)) if (graines[canal] !== n) e.push(`graine ${canal} = ${graines[canal]}, PLAFONDS_DEFAUT ${n}`)
    }
    r.juger('OB-5', [...new Set(e)], `0106 n'écrit pas ops.quotas_canaux ; les graines de ${f0096 ?? '0096'} égalent PLAFONDS_DEFAUT (${Object.keys(K.PLAFONDS_DEFAUT).length} canaux)`)
  }
  // OB-6
  {
    const e = []
    const t = brut.toLowerCase()
    for (const m of ['public.courriers', 'courriers', REFUS.mot, REFUS.motAccent]) if (t.includes(m)) e.push(`mention de ${m}`)
    const rep = cols('reponses')
    if (!/id_externe text not null unique|unique\s?\(id_externe\)/.test(rep) && !ins.some((x) => /^create unique index .* on ops\.reponses\s?\(id_externe\)/.test(x.n))) e.push('ops.reponses.id_externe non unique')
    const cr = compacter(ins.filter((x) => /ops\.reponses/.test(x.n)).map((x) => x.t).join(';'))
    if (!/check\(([^)]*)envoi_idisnotnullorconversation_idisnotnullorsource='courriel'/.test(cr)) e.push('ops.reponses sans la contrainte « envoi, conversation ou courriel »')
    const at = corps('acq_reponses_a_traiter')
    if (at) { const tables = [...at.s.matchAll(/\b(?:from|join) ([a-z_]+\.[a-z_]+|[a-z_]+)/g)].map((x) => x[1].replace(/^ops\./, '')).filter((x) => !['jsonb_array_elements', 'unnest', 'lateral'].includes(x)); const autres = tables.filter((x) => x !== 'reponses'); if (autres.length) e.push(`acq_reponses_a_traiter lit ${[...new Set(autres)].join(', ')}`) } else e.push('acq_reponses_a_traiter absente')
    for (const n of ['acq_reponse_relayer', 'acq_envoi_marquer']) if (F.has(n)) e.push(`${n} existe`)
    r.juger('OB-6', e, 'ni courriers ni séquenceur ; ops.reponses.id_externe unique, contrainte envoi/conversation/courriel ; acq_reponses_a_traiter ne lit que ops.reponses ; ni acq_reponse_relayer ni acq_envoi_marquer')
  }
  // OB-7
  {
    const toutes = new Set([...F.keys(), ...Fsocle.keys(), 'ops_decisions_tranchees'])
    const e = jugerMagasin(racine, 'MagasinEchanges', toutes, { decisionsTranchees: /^ops_/ })
    let tc = 'témoin : npm run typecheck ne se juge que sur le dépôt'
    if (!temoin && !e.length) { const t = typecheck(racine); if (!t.ok) e.push(t.detail); tc = t.detail }
    r.juger('OB-7', e, `magasinSupabase.ts : chaque méthode de MagasinEchanges appelle une fonction du SQL ; ${tc}`)
  }
  // OB-8
  {
    const e = []
    const env = cols('envois')
    if (!/add column if not exists texte text[^,]*char_length\(texte\)\s?<=\s?1500\b/.test(env)) e.push('ops.envois.texte sans 1 500 signes au plus')
    if (!/add column if not exists objet text[^,]*char_length\(objet\)\s?<=\s?120\b/.test(env)) e.push('ops.envois.objet sans 120 signes au plus')
    const p = corps('acq_envoi_preparer')
    if (!p) e.push('acq_envoi_preparer absente')
    else {
      const insert = /insertintoops\.envois\(([^)]*)\)/.exec(p.c)?.[1] ?? ''
      for (const c of ['texte', 'objet', 'empreinte_texte']) if (!insert.split(',').includes(c)) e.push(`acq_envoi_preparer n'insère pas ${c}`)
      if (!/digest\(/.test(p.c) || !/'sha256'/.test(p.c)) e.push('acq_envoi_preparer ne calcule pas le SHA-256 du texte (digest(…, \'sha256\'))')
    }
    r.juger('OB-8', e, 'texte (1 500) et objet (120) sur ops.envois, remplis par acq_envoi_preparer ; empreinte_texte comparée au SHA-256 du texte')
  }
  // OB-9
  {
    const e = []
    for (const [n, ecrit] of [['acq_envoi_preparer', 'insert into ops.envois'], ['acq_envoi_approuver', 'update ops.envois']]) {
      const f = corps(n)
      if (!f) { e.push(`${n} absente`); continue }
      const c = f.c, s = f.s
      const iExc = s.indexOf('exception when others then'), iEcrit = s.indexOf(ecrit), debuts = [...s.matchAll(/\bbegin\b/g)].map((m) => m.index)
      if (iExc < 0) e.push(`${n} sans sous-bloc « exception when others »`)
      else if (!(debuts.length >= 2 && iEcrit > debuts[1] && iEcrit < iExc)) e.push(`${n} : l'écriture (${ecrit}) n'est pas dans le sous-bloc qui rattrape`)
      if (!/sqlerrmlike'ops:%'/.test(c)) e.push(`${n} ne teste pas sqlerrm like 'ops:%'`)
      if (!/jsonb_build_object\('ok',false,'raison',/.test(c)) e.push(`${n} ne rend pas jsonb_build_object('ok', false, 'raison', …)`)
      if (!/\braise;/.test(c)) e.push(`${n} ne relève pas les autres exceptions (raise;)`)
    }
    const j = corps('acq_envois_du_jour')
    if (!j) e.push('acq_envois_du_jour absente')
    else for (const m of ["'envois'", "'nouveaux'", "'premier_contact'", "'saute'", "'perime'", "'annule'", "'formulaire_site'", 'europe/paris']) if (!j.c.toLowerCase().includes(m)) e.push(`acq_envois_du_jour sans ${m}`)
    r.juger('OB-9', e, 'acq_envoi_preparer et acq_envoi_approuver écrivent dans un sous-bloc when others / sqlerrm like \'ops:%\' / { ok: false, raison } / raise ; acq_envois_du_jour compte envois et nouveaux avec le filtre de 0099')
  }
  // OB-10
  {
    const e = []
    if (!/appel_rendu_le/.test(cols('reponses'))) e.push('ops.reponses sans appel_rendu_le')
    const f = corps('acq_reponse_appel_rendu')
    if (!f) e.push('acq_reponse_appel_rendu absente')
    else {
      const maj = [...f.s.matchAll(/\bupdate ([a-z_.]+) set (.+?)(?= where | returning |;|$)/g)]
      if (!maj.length) e.push('acq_reponse_appel_rendu n\'écrit rien')
      for (const m of maj) {
        if (m[1].replace(/^ops\./, '') !== 'reponses') e.push(`acq_reponse_appel_rendu écrit ${m[1]}`)
        const colonnes = decouperVirgules(m[2]).map((a) => a.split('=')[0].trim())
        if (colonnes.join() !== 'appel_rendu_le') e.push(`acq_reponse_appel_rendu écrit ${colonnes.join(', ')} (appel_rendu_le seul)`)
      }
      if (/insert into (?!(ops\.)?evenements\b)[a-z_.]+/.test(f.s)) e.push('acq_reponse_appel_rendu insère ailleurs que dans ops.evenements')
      if (!/classe='appel'/.test(f.c) || !/appel_rendu_leisnull/.test(f.c)) e.push('acq_reponse_appel_rendu sans la condition classe = \'appel\' and appel_rendu_le is null')
    }
    r.juger('OB-10', e, 'appel_rendu_le sur ops.reponses ; acq_reponse_appel_rendu n\'écrit que cette colonne (et l\'événement), sous classe = \'appel\' et appel_rendu_le nul')
  }
  // OB-11
  {
    const e = []
    const ecrit = (f, v) => [...f.s.matchAll(/\bupdate [a-z_.]+ set (.+?)(?= where | returning |;|$)/g)].some((m) => new RegExp(`(statut|etape) ?= ?'${v}'`).test(m[1])) || [...f.s.matchAll(/\binsert into ops\.(envois|prospects)\b([^;]*)/g)].some((m) => m[2].includes(`'${v}'`))
    for (const [n, defs] of F) for (const f of defs) {
      if (ecrit(f, 'approuve') && n !== 'acq_envoi_approuver') e.push(`${n} écrit 'approuve'`)
      if (ecrit(f, 'envoye') && n !== 'acq_envoi_envoye') e.push(`${n} écrit 'envoye'`)
    }
    const a = corps('acq_envoi_approuver')
    if (!a || !ecrit(a, 'approuve')) e.push('acq_envoi_approuver n\'écrit pas \'approuve\'')
    if (a && !/approuve_par_agent='facteur'/.test(a.c)) e.push('acq_envoi_approuver n\'écrit pas approuve_par_agent = \'facteur\'')
    r.juger('OB-11', e, 'seule acq_envoi_approuver écrit \'approuve\' (approuve_par_agent = \'facteur\') ; seule acq_envoi_envoye écrit \'envoye\'')
  }
  // OB-12
  {
    const e = []
    const rv = compacter(ins.filter((x) => /ops\.rendez_vous/.test(x.n)).map((x) => x.t).join(';'))
    if (!/createuniqueindex[a-z0-9_]*(ifnotexists)?[a-z0-9_]*onops\.rendez_vous\(creneau\)wherestatut='reserve'/.test(rv)) e.push('pas d\'index unique partiel (creneau) where statut = \'reserve\'')
    if (!/telephoneisnullortelephone~'\^\\\+\?\[0-9\]\{10,15\}\$'/.test(rv)) e.push('ops.rendez_vous sans la contrainte du téléphone')
    if (!/expire_le<=cree_le\+interval'21days'/.test(rv)) e.push('ops.rendez_vous sans expire_le <= cree_le + 21 jours')
    const pj = corps('acq_rdv_par_jeton')
    if (!pj) e.push('acq_rdv_par_jeton absente'); else if (/telephone/.test(pj.c)) e.push('acq_rdv_par_jeton cite telephone')
    const pu = corps('acq_echanges_purger')
    if (!pu) e.push('acq_echanges_purger absente'); else if (!/telephone=null/.test(pu.c) || !/'90days'/.test(pu.c)) e.push('acq_echanges_purger n\'efface pas le téléphone à 90 jours')
    r.juger('OB-12', e, 'rendez-vous : index unique partiel, téléphone contraint, 21 jours ; acq_rdv_par_jeton sans téléphone ; téléphone effacé à 90 jours')
  }
  // OB-13
  {
    const e = []
    const me = cols('meta_evenements')
    if (!/id_externe text not null unique/.test(me) && !/unique\s?\(id_externe\)/.test(me)) e.push('ops.meta_evenements.id_externe non unique')
    for (const n of ['acq_meta_evenement_enregistrer', 'acq_reponse_recue']) { const f = corps(n); if (!f) e.push(`${n} absente`); else if (!/onconflict\(id_externe\)donothing/.test(f.c)) e.push(`${n} sans on conflict (id_externe) do nothing`) }
    r.juger('OB-13', e, 'id_externe uniques ; les deux enregistrements font on conflict (id_externe) do nothing')
  }
  // OB-14
  {
    const e = []
    const g = F.get('garde_fenetre_meta')?.find((f) => f.schema === 'ops')
    if (!g) e.push('ops.garde_fenetre_meta() absente')
    else {
      if (!/returns trigger/.test(g.entete)) e.push('ops.garde_fenetre_meta ne rend pas trigger')
      for (const m of ["'messagerie'", "interval'24hours'", "'reponse_privee'", "interval'7days'", 'commentaire_id', 'ops:fenetre_fermee']) if (!g.c.includes(m)) e.push(`ops.garde_fenetre_meta sans ${m}`)
      const rv = D.revokes.get('garde_fenetre_meta') ?? new Set()
      if (!rv.has('public')) e.push('ops.garde_fenetre_meta : pas de revoke execute à public')
      if (D.grants.has('garde_fenetre_meta')) e.push('ops.garde_fenetre_meta : un grant')
    }
    if (!ins.some((x) => /^create (or replace )?trigger [a-z0-9_]+ before insert or update of statut on ops\.envois for each row execute (function|procedure) ops\.garde_fenetre_meta\(\)$/.test(x.n))) e.push('déclencheur « before insert or update of statut on ops.envois for each row » absent')
    if (!/add column if not exists commentaire_id/.test(cols('envois'))) e.push('ops.envois sans commentaire_id')
    e.push(...jugerEssai('OB-14'))
    r.juger('OB-14', e, `ops.garde_fenetre_meta (24 h, 7 jours, une réponse privée par commentaire, ops:fenetre_fermee) en déclencheur before insert or update of statut, sans droit ; ${essaiOk('OB-14')}`)
  }
  // OB-15
  r.juger('OB-15', F.has('acq_oppositions_depuis') ? ['acq_oppositions_depuis existe encore'] : [], 'aucune fonction acq_oppositions_depuis')
  // OB-16
  {
    const e = []
    const f = corps('acq_reponse_reclasser')
    if (!f) e.push('acq_reponse_reclasser absente')
    else for (const m of ["'tranchee'", "'standardiste'", "'acq:reponse:", 'classe_par', 'actes_le=null', 'reclassee_par_decision', "'ignoree'"]) if (!f.c.includes(m)) e.push(`acq_reponse_reclasser sans ${m}`)
    const d = corps('acq_decision_creer')
    if (!d) e.push('acq_decision_creer absente'); else { if (!/jsonb_array_length\(/.test(d.c) || !/\b2\b|between2and7/.test(d.s) || !/7/.test(d.c)) e.push('acq_decision_creer ne borne pas les options de 2 à 7'); if (!/'options'/.test(d.c)) e.push('acq_decision_creer ne rend pas la raison options') }
    const rr = corps('acq_reponses_a_repondre')
    if (!rr) e.push('acq_reponses_a_repondre absente'); else for (const m of ['notre_dernier_envoi_le', 'notre_dernier_envoi_type', 'actes_le']) if (!rr.c.includes(m)) e.push(`acq_reponses_a_repondre sans ${m}`)
    if (!/reclassee_par_decision/.test(cols('reponses'))) e.push('ops.reponses sans reclassee_par_decision')
    e.push(...jugerEssai('OB-16'))
    r.juger('OB-16', e, `acq_reponse_reclasser lit une décision tranchée du standardiste de clé acq:reponse:… ; options de 2 à 7 ; notre dernier envoi rendu ; ${essaiOk('OB-16')}`)
  }
  // OB-17
  {
    const e = []
    const m = corps('acq_prospects_pour_maquette')
    if (!m) e.push('acq_prospects_pour_maquette absente')
    else {
      if (m.params.map((p) => p.join(' ')).join(', ') !== 'p_limite int, p_froid boolean') e.push(`acq_prospects_pour_maquette(${m.params.map((p) => p.join(' ')).join(', ')}), (p_limite int, p_froid boolean) attendu`)
      for (const x of ["'entrant'", "'oui'", 'p_froid']) if (!m.c.includes(x)) e.push(`acq_prospects_pour_maquette sans ${x}`)
      if (!/%2|mod\(/.test(m.c)) e.push('acq_prospects_pour_maquette sans parité')
    }
    const o = corps('acq_prospects_oui')
    if (!o || !o.c.includes("'maquette_prete'") || !o.c.includes("'entrant'")) e.push('acq_prospects_oui ne rend pas l\'entrant à maquette prête')
    if (!corps('acq_maquettes_du_jour')?.c.includes('entrants_faites_aujourdhui')) e.push('acq_maquettes_du_jour ne compte pas entrants_faites_aujourdhui')
    if (!corps('acq_envoi_preparer')?.c.includes("'lien_prepare'")) e.push('acq_envoi_preparer ne fait pas passer à lien_prepare')
    e.push(...jugerEssai('OB-17'))
    r.juger('OB-17', e, `les demandes (entrants et froids à oui) sans parité, le froid préparé d'avance à empreinte paire ; entrants comptés à part ; ${essaiOk('OB-17')}`)
  }
  // OB-18
  {
    const e = []
    const x = corps('acq_prospect_export')
    if (!x) e.push('acq_prospect_export absente'); else for (const m of ['jeton', 'verdicts', 'texte']) if (new RegExp(`\\b${m}\\b`).test(x.s)) e.push(`acq_prospect_export cite ${m}`)
    const ef = corps('acq_effacement_demander')
    if (!ef) e.push('acq_effacement_demander absente'); else { if (!/effacement_demande_le/.test(ef.c)) e.push('acq_effacement_demander ne pose pas effacement_demande_le'); if (!/acq_opposer\(|insertintoops\.opposition/.test(ef.c)) e.push('acq_effacement_demander ne pose pas d\'opposition') }
    const pu = corps('acq_echanges_purger')
    if (!pu) e.push('acq_echanges_purger absente'); else { if (!/effacement_demande_le/.test(pu.c) || !/'7days'/.test(pu.c)) e.push('acq_echanges_purger n\'efface pas à 7 jours de la demande'); if (/deletefromops\.opposition/.test(pu.c)) e.push('acq_echanges_purger efface l\'opposition') }
    if (!/add column if not exists effacement_demande_le/.test(cols('prospects'))) e.push('ops.prospects sans effacement_demande_le')
    e.push(...jugerEssai('OB-18'))
    r.juger('OB-18', e, `export sans jeton, verdict ni texte ; effacement : opposition définitive, prospect effacé à 7 jours, opposition gardée ; ${essaiOk('OB-18')}`)
  }
  // OB-19
  {
    const e = []
    const env = cols('envois')
    for (const [c, t] of [['preuve', 'jsonb'], ['preuve_demande', 'jsonb'], ['technologie', 'text'], ['bail_porteur_jusqua', 'timestamptz']]) if (!new RegExp(`add column if not exists ${c} ${t}`).test(env)) e.push(`ops.envois sans ${c} ${t}`)
    if (!/add column if not exists reference text[^,]*unique/.test(env) || !env.includes("reference ~ '^[A-Z0-9]{6}$'")) e.push('ops.envois.reference sans unique et ^[A-Z0-9]{6}$')
    const p = corps('acq_envoi_preparer')
    if (!p || !/'reference'/.test(p.c)) e.push('acq_envoi_preparer ne rend pas la raison reference')
    e.push(...jugerEssai('OB-19'))
    r.juger('OB-19', e, `preuve, preuve_demande, reference (unique, 6 signes), technologie, bail_porteur_jusqua ; une référence en double → raison reference ; ${essaiOk('OB-19')}`)
  }
  // OB-20
  {
    const e = []
    const defs = F.get('acq_envoi_envoye') ?? []
    if (defs.length !== 1) e.push(`${defs.length} définition(s) d'acq_envoi_envoye, une attendue`)
    const f = defs[0]
    if (f && f.params.map((p) => p.join(' ')).join(', ') !== 'p_envoi uuid, p_preuve jsonb') e.push(`acq_envoi_envoye(${f.params.map((p) => p.join(' ')).join(', ')}), (p_envoi uuid, p_preuve jsonb) attendu`)
    for (const [n, ds] of F) for (const d of ds) if (d.params.some(([p]) => p === REFUS.parametre)) e.push(`${n} prend ${REFUS.parametre}`)
    if (f) for (const k of ['code_http', 'empreinte_texte', 'empreinte_avant', 'empreinte_apres', 'chemin_usine']) if (!f.c.includes(`'${k}'`)) e.push(`acq_envoi_envoye ne vérifie pas ${k}`)
    if (f && (!/preuve=p_preuve/.test(f.c) || !/'envoye'/.test(f.c))) e.push('acq_envoi_envoye ne pose pas preuve ni envoye')
    e.push(...jugerEssai('OB-20'))
    r.juger('OB-20', e, `acq_envoi_envoye(p_envoi uuid, p_preuve jsonb) seule, refuse une preuve incomplète ; aucune fonction à ${REFUS.parametre} ; ${essaiOk('OB-20')}`)
  }
  // OB-21
  {
    const e = []
    const f = corps('acq_formulaires_a_porter')
    if (!f) e.push('acq_formulaires_a_porter absente')
    else {
      if (f.params.map((p) => p.join(' ')).join(', ') !== 'p_limite int, p_bail_s int') e.push(`acq_formulaires_a_porter(${f.params.map((p) => p.join(' ')).join(', ')}), (p_limite int, p_bail_s int) attendu`)
      if (!/acq_en_pause\(|ops_interrupteur\('pause_generale'\)/.test(f.c)) e.push('acq_formulaires_a_porter ne lit pas la pause')
      if (!/forupdate(of[a-z_.]+)?skiplocked/.test(f.c)) e.push('acq_formulaires_a_porter sans for update skip locked')
      if (!/ops\.opposition|acq_oppose\(/.test(f.c)) e.push('acq_formulaires_a_porter ne lit pas l\'opposition')
      if (!/acq_plafond_du_jour\(|ops\.quotas_canaux/.test(f.c)) e.push('acq_formulaires_a_porter ne lit pas le plafond')
      if (!f.c.includes("'essai_e2e'") || !f.c.includes(`'${URL_ESSAI}'`)) e.push(`acq_formulaires_a_porter sans essai_e2e ou sans l'URL ${URL_ESSAI}`)
      if (!/bail_porteur_jusqua/.test(f.c)) e.push('acq_formulaires_a_porter sans bail_porteur_jusqua')
      const cles = [...f.c.matchAll(/jsonb_build_object\(([^;]*?)\)(?:order|from|,|\)|;|$)/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_]+)',/g)].map((y) => y[1])).filter((k) => k !== 'ok' && k !== 'raison')
      const permis = new Set(['id', 'texte', 'objet', 'reference', 'formulaire'])
      const hors = [...new Set(cles.filter((k) => !permis.has(k)))]
      if (hors.length) e.push(`acq_formulaires_a_porter rend ${hors.join(', ')} (id, texte, objet, reference, formulaire seulement)`)
      if (/destinataire|'email'/.test(f.c)) e.push('acq_formulaires_a_porter cite une adresse (destinataire ou email)')
    }
    const x = corps('acq_formulaire_echec')
    if (!x) e.push('acq_formulaire_echec absente')
    else {
      if (x.params.map((p) => p.join(' ')).join(', ') !== 'p_envoi uuid, p_raison text, p_definitif boolean') e.push(`acq_formulaire_echec(${x.params.map((p) => p.join(' ')).join(', ')}), (p_envoi uuid, p_raison text, p_definitif boolean) attendu`)
      for (const m of ['tentatives_envoi+1', 'derniere_erreur', "'annule'", "'eligible'", 'p_definitif']) if (!x.c.includes(m)) e.push(`acq_formulaire_echec sans ${m}`)
    }
    e.push(...jugerEssai('OB-21'))
    r.juger('OB-21', e, `acq_formulaires_a_porter (pause, opposition, plafond, skip locked, bail, essai_e2e vers ${URL_ESSAI} seulement, ni adresse) ; acq_formulaire_echec (tentatives, annulé si définitif) ; ${essaiOk('OB-21')}`)
  }
  // OB-22
  {
    const e = []
    const src = /source text[^,]*check\s?\(source in\(([^)]*)\)\)/.exec(cols('reponses'))
    if (!src || [...src[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort().join() !== 'courriel,essai,formulaire,meta') e.push('ops.reponses.source ne se limite pas à courriel, meta, formulaire, essai')
    const f = corps('acq_reponse_recue')
    if (!f) e.push('acq_reponse_recue absente')
    else {
      const pos = (re) => { const m = re.exec(f.c); return m ? m.index : -1 }
      const iRef = pos(/\.reference=/), iDom = pos(/\.domaine=/), iFil = pos(/\.id_externe=[^;]{0,60}en_reponse_a|en_reponse_a[^;]{0,60}=[a-z_]+\.id_externe/)
      if (!(iRef >= 0 && iDom > iRef && iFil > iDom)) e.push(`acq_reponse_recue ne rattache pas dans l'ordre référence, domaine, en_reponse_a (lectures aux positions ${iRef}, ${iDom}, ${iFil})`)
      for (const d of K.MESSAGERIES_GRATUITES.slice(0, 3)) if (!f.c.includes(`'${d}'`)) e.push(`acq_reponse_recue n'écarte pas ${d} (MESSAGERIES_GRATUITES)`)
      for (const m of ["'hors_fil'", 'accuse_site', 'dernier_contact_recu']) if (!f.c.includes(m)) e.push(`acq_reponse_recue sans ${m}`)
    }
    e.push(...jugerEssai('OB-22'))
    r.juger('OB-22', e, `source courriel/meta/formulaire/essai ; rattachement par référence, puis domaine (hors messageries gratuites), puis en_reponse_a ; hors_fil ; un accusé ne compte pas ; ${essaiOk('OB-22')}`)
  }
  // OB-23
  {
    const e = []
    const f = corps('acq_prospects_pour_relance')
    if (!f) e.push('acq_prospects_pour_relance absente')
    else {
      if (!f.c.includes("'lien_envoye'")) e.push('acq_prospects_pour_relance ne prend pas lien_envoye')
      if (/'envoye'/.test(f.c.replace(/'lien_envoye'/g, ''))) e.push('acq_prospects_pour_relance cite l\'étape envoye (le froid n\'est jamais relancé)')
      if (!/'4days'/.test(f.c)) e.push('acq_prospects_pour_relance sans les 4 jours')
    }
    e.push(...jugerEssai('OB-23'))
    r.juger('OB-23', e, `acq_prospects_pour_relance : lien_envoye depuis 4 jours seulement, jamais le froid ; ${essaiOk('OB-23')}`)
  }
  // OB-24
  {
    const e = []
    const f = corps('acq_preuves_a_garder')
    if (!f) e.push('acq_preuves_a_garder absente')
    else {
      if (f.params.map((p) => p.join(' ')).join(', ') !== 'p_envois uuid[]') e.push(`acq_preuves_a_garder(${f.params.map((p) => p.join(' ')).join(', ')}), (p_envois uuid[]) attendu`)
      if (!/^uuid\[\]$/.test(String(f.rend).trim())) e.push(`acq_preuves_a_garder rend ${f.rend}, uuid[] attendu`)
      if (!/\bstable\b/.test(f.entete)) e.push('acq_preuves_a_garder n\'est pas stable')
      if (!/ops:borne/.test(f.c) || !/500/.test(f.c)) e.push('acq_preuves_a_garder sans la borne de 500 (ops:borne)')
      for (const m of ['effacement_demande_le', "'3years'"]) if (!f.c.includes(m)) e.push(`acq_preuves_a_garder sans ${m}`)
      if (/\b(insert|update|delete)\b/.test(f.s)) e.push('acq_preuves_a_garder écrit')
    }
    e.push(...jugerEssai('OB-24'))
    r.juger('OB-24', e, `acq_preuves_a_garder(uuid[]) → uuid[], stable, 500 au plus, 3 ans depuis le dernier contact venu du prospect, hors effacement, sans écriture ; ${essaiOk('OB-24')}`)
  }
  return r
}

// ── 0109 : la planification (026-136) ─────────────────────────────────────────────────────────────────────────────────────
function jugerPlanification(racine, { temoin, travail }) {
  const r = rapport([...IDS.planification])
  const migs = fichiersMigration(racine, SUFFIXE.planification)
  if (migs.length !== 1) { r.juger('PG-1', [`${migs.length} fichier(s) supabase/migrations/*_acquisition_planification.sql, exactement 1 attendu${migs.length ? ` (${migs.join(', ')})` : ''}`]); r.nonJuges('migration de la planification absente ou en double'); return r }
  const ch = cheminsDe(migs[0])
  const sql = lire(racine, ch.migration)
  const brut = sqlSansCommentaires(sql)
  const taches = new Map()
  for (const a of appels(brut, 'cron\\.schedule')) {
    const v = a.map((x) => x.replace(/^[a-z_]+\s*:=\s*/i, ''))
    const nom = valeurSql(v[0]), cal = valeurSql(v[1])
    let cmd = v[2] ?? ''
    const dol = /^\$([a-z_]*)\$([\s\S]*)\$\1\$$/i.exec(cmd.trim())
    cmd = dol ? dol[2] : (typeof valeurSql(cmd) === 'string' ? valeurSql(cmd) : cmd)
    taches.set(nom, (taches.get(nom) ?? []).concat([{ cal, cmd }]))
  }
  // PG-1
  {
    const e = []
    for (const [nom, cal] of [...TACHES_HTTP, TACHE_SQL]) {
      const t = taches.get(nom)
      if (!t) e.push(`${nom} absente`)
      else { if (t.length > 1) e.push(`${nom} planifiée ${t.length} fois`); if (t[0].cal !== cal) e.push(`${nom} à « ${t[0].cal} », « ${cal} » attendu`) }
    }
    for (const nom of taches.keys()) if (!NOMS_TACHES.includes(nom)) e.push(`tâche en trop : ${nom}`)
    if (/acq-facteur-pause|passe=pause/.test(brut)) e.push('une tâche acq-facteur-pause ou ?passe=pause')
    const p = taches.get(TACHE_SQL[0])?.[0]
    if (p && (!/acq_purger\(\)/.test(p.cmd) || !/acq_echanges_purger\(\)/.test(p.cmd))) e.push(`${TACHE_SQL[0]} n'appelle pas acq_purger() et acq_echanges_purger()`)
    if (p && /net\.http_/.test(p.cmd)) e.push(`${TACHE_SQL[0]} fait un appel HTTP`)
    r.juger('PG-1', e, `${ch.migration} : les ${NOMS_TACHES.length} tâches et leurs calendriers, ni plus ni moins ; aucune passe pause ; la purge appelle acq_purger() et acq_echanges_purger()`)
  }
  // PG-2
  {
    const e = []
    for (const [nom, , route] of TACHES_HTTP) {
      const t = taches.get(nom)?.[0]
      if (!t) continue
      const url = /\burl\s*:=\s*'([^']*)'/.exec(t.cmd)?.[1] ?? /net\.http_(?:get|post)\(\s*'([^']*)'/.exec(t.cmd)?.[1]
      if (url !== `https://${HOTE}/api/cron/${route}`) e.push(`${nom} vise ${url ?? 'aucune URL littérale'}, https://${HOTE}/api/cron/${route} attendu`)
      if (!existe(racine, `app/api/cron/${route.split('?')[0]}/route.ts`)) e.push(`app/api/cron/${route.split('?')[0]}/route.ts absent`)
      const to = Number(/timeout_milliseconds\s*:=\s*(\d+)/.exec(t.cmd)?.[1] ?? NaN)
      if (!(to >= 55000)) e.push(`${nom} : timeout_milliseconds ${Number.isNaN(to) ? 'absent' : to}, 55 000 au moins`)
      if (!/vault\.decrypted_secrets/.test(t.cmd) || !/authorization/i.test(t.cmd)) e.push(`${nom} : l'en-tête n'est pas construit depuis vault.decrypted_secrets`)
    }
    for (const s of segments(brut).flatMap((x) => (x.type === 'dollar' ? segments(x.corps) : [x])).filter((x) => x.type === 'chaine')) {
      const v = s.texte.slice(1, -1)
      if (/^bearer \S/i.test(v)) e.push(`« Bearer » suivi d'un littéral (${v.length} signes)`)
      if (/^[A-Za-z0-9_\-+/=.]{21,}$/.test(v) && /[0-9]/.test(v) && /[A-Za-z]/.test(v) && !/^https?:/.test(v) && !/\./.test(v)) e.push(`chaîne de ${v.length} signes qui ressemble à un secret`)
    }
    r.juger('PG-2', e, `les ${TACHES_HTTP.length} tâches HTTP visent https://${HOTE}/api/cron/<route> (routes présentes), timeout ≥ 55 000 ms, jeton lu dans vault.decrypted_secrets ; aucun secret littéral`)
  }
  // PG-3
  {
    const e = []
    const rel = `supabase/controles/${path.basename(ch.migration, '.sql')}_annuler.sql`
    const t = lire(racine, rel)
    if (t === null || !t.trim()) e.push(`${rel} ${t === null ? 'absent' : 'vide'}`)
    else {
      const vus = []
      for (const x of lireInstructions(t)) {
        const m = /^select (.+)$/.exec(x.n)
        const items = m ? decouperVirgules(m[1]).map((y) => y.trim()) : [x.n]
        for (const it of items) { const u = /^cron\.unschedule\('([a-z0-9-]+)'\)$/.exec(it); if (u) vus.push(u[1]); else e.push(`instruction hors cron.unschedule : « ${court(it, 60)} »`) }
      }
      for (const n of NOMS_TACHES) if (!vus.includes(n)) e.push(`${n} non annulée`)
      for (const n of vus) if (!NOMS_TACHES.includes(n)) e.push(`annule ${n}, hors des onze`)
      if (vus.length !== new Set(vus).size) e.push('un nom annulé deux fois')
    }
    r.juger('PG-3', e, `${rel} : cron.unschedule des ${NOMS_TACHES.length} noms, et rien d'autre`)
  }
  // PG-4
  {
    const e = [...jumeaux(racine, ch, travail), ...lireControle(racine, ch.controle).e]
    let v = 'témoin : vercel.json ne se juge que sur le dépôt'
    if (!temoin) { const d = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'vercel.json'], { cwd: racine, windowsHide: true }); if (d.status !== 0) e.push('vercel.json a changé (git diff HEAD)'); v = 'vercel.json inchangé (git diff HEAD)' }
    r.juger('PG-4', e, `${v} ; jumeaux acceptés par sql-nu.mjs --verifier ; contrôle en lecture seule`)
  }
  return r
}

/** `npm run typecheck` (tsc --noEmit) sur la racine. */
function typecheck(racine) {
  const pkg = lire(racine, 'package.json')
  let script = null
  try { script = JSON.parse(pkg).scripts?.typecheck ?? null } catch { /* illisible */ }
  if (!script || !/^tsc\b/.test(script)) return { ok: false, detail: `script typecheck absent ou inattendu (« ${script} »)` }
  const tsc = path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tsc)) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  const info = exigerSousTravail(path.join(TRAVAIL, NOM, 'tsbuildinfo'))
  fs.mkdirSync(info, { recursive: true })
  const t0 = Date.now()
  const x = lancerNode([tsc, ...script.replace(/^tsc\s*/, '').split(/\s+/).filter(Boolean), '--pretty', 'false', '--incremental', '--tsBuildInfoFile', path.join(info, 'ops.tsbuildinfo')], { cwd: racine, timeout: 15 * 60_000 })
  const erreurs = (x.stdout || '').split(/\r?\n/).filter((l) => /error TS\d+/.test(l))
  if (x.status === 0) return { ok: true, detail: `npm run typecheck vert (${Math.round((Date.now() - t0) / 1000)} s)` }
  return { ok: false, detail: `npm run typecheck en code ${x.status} : ${erreurs.length} erreur(s) — ${court(erreurs.slice(0, 2).join(' | ') || x.stderr, 240)}` }
}

const JUGES = { socle: jugerSocle, echanges: jugerEchanges, planification: jugerPlanification }

// ── --reel ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Jamais process.exit() après un fetch (sous Windows, libuv tombe si le processus se ferme pendant que les sockets se
// referment) : process.exitCode, et on laisse finir.
class Prealable extends Error {}
// `fetchImpl`, si fourni (--auto-controle seulement, jamais --reel), remplace entièrement l'accès réseau et la lecture de
// .env.local : un banc hors réseau pour éprouver la logique de reel() sur OA-R/OB-R/PG-R sans toucher la base réelle.
async function reel(migration, r, { fetchImpl } = {}) {
  let url = '', cles
  if (fetchImpl) {
    cles = { anon: 'ANON_BANC', service: 'SERVICE_BANC' }
  } else {
    lireEnvLocal(R)
    url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    cles = { anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY }
    const manque = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !cles.anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !cles.service && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
    if (manque.length) throw new Prealable(`${manque.join(', ')} absent(s) de .env.local`)
  }
  const appel = async (chemin, cle, { methode = 'GET', corps, extra } = {}) => {
    if (fetchImpl) return fetchImpl(chemin, cle, { methode, corps, extra })
    try {
      const res = await fetch(`${url}${chemin}`, { method: methode, headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...extra }, body: corps === undefined ? undefined : JSON.stringify(corps), signal: AbortSignal.timeout(20_000) })
      const t = await res.text()
      let j = null
      try { j = JSON.parse(t) } catch { j = t }
      return { status: res.status, ok: res.ok, j }
    } catch (e) { return { status: 0, ok: false, j: { message: court(e.message, 120) } } }
  }
  const rpc = (fn, args, cle = cles.service) => appel(`/rest/v1/rpc/${fn}`, cle, { methode: 'POST', corps: args })
  const code = (x) => `${x.status}${x.j && typeof x.j === 'object' && x.j.code ? ` ${x.j.code}` : ''}${x.j && typeof x.j === 'object' && x.j.message ? ` ${court(x.j.message, 60)}` : ''}`
  const inconnue = (x) => x.status === 404 && x.j && x.j.code === 'PGRST202'
  const refus = (x) => !x.ok && x.status !== 0
  const id = { socle: 'OA-R', echanges: 'OB-R', planification: 'PG-R' }[migration]
  r.ids.push(id)
  const e = [], oks = []
  const verif = (ok, dOk, dKo) => { if (ok) oks.push(dOk); else e.push(dKo) }
  const marque = `essai-026-acq-${Date.now()}`
  if (migration === 'socle') {
    const sonde = await rpc('acq_en_pause', { p_agent: 'recenseur' })
    if (inconnue(sonde)) throw new Prealable(`acq_en_pause inconnue de PostgREST : 0105 n'est pas appliquée (${code(sonde)})`)
    const crees = []
    try {
      const et = await rpc('ops_etat', {})
      const agents = new Map((et.j?.agents ?? []).map((a) => [a.nom, a.periode_minutes]))
      const faux = AGENTS.filter(([n, , , , , p]) => agents.get(n) !== p).map(([n, , , , , p]) => `${n} (${agents.get(n) ?? 'absent'}, ${p} attendu)`)
      verif(et.ok && !faux.length, `ops_etat rend les ${AGENTS.length} agents avec leur période`, `ops_etat : ${et.ok ? faux.join(', ') : code(et)}`)
      verif(sonde.ok && sonde.j === false, 'acq_en_pause(\'recenseur\') = false', `acq_en_pause('recenseur') : ${code(sonde)} ${JSON.stringify(sonde.j)}`)
      const cp = await rpc('acq_curseur_poser', { p_nom: marque, p_valeur: 'x' })
      if (cp.ok) crees.push('curseur')
      const cl = await rpc('acq_curseur_lire', { p_nom: marque })
      verif(cp.ok && cl.ok && cl.j === 'x', 'acq_curseur_poser puis acq_curseur_lire rendent x', `curseur : ${code(cp)} / ${code(cl)} ${JSON.stringify(cl.j)}`)
      const ja = await rpc('acq_jeton_meta', {}, cles.anon)
      verif(refus(ja), `acq_jeton_meta refusée avec la clé anon (${code(ja)})`, `acq_jeton_meta ${ja.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anon`)
      const ra = await rpc('acq_reserver', { p_etape: 'candidat', p_limite: 1, p_bail_s: 1 }, cles.anon)
      verif(refus(ra), `acq_reserver refusée avec la clé anon (${code(ra)})`, `acq_reserver ${ra.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anon`)
      // des candidats d'essai : un entrant envoyé froid, deux froids pour la réservation, un pour l'opposition
      const dom = (k) => `${marque}-${k}.invalid`
      const cands = [
        { cle_dedup: `domaine:${dom('e')}`, domaine: dom('e'), source: 'entrant', froid: true, metier: 'plombier' },
        { cle_dedup: `domaine:${dom('a')}`, domaine: dom('a'), source: 'manuel', froid: true, metier: 'plombier' },
        { cle_dedup: `domaine:${dom('b')}`, domaine: dom('b'), source: 'manuel', froid: true, metier: 'plombier' },
      ]
      const ce = await rpc('acq_candidats_enregistrer', { p: cands })
      verif(ce.ok, 'acq_candidats_enregistrer (trois candidats d\'essai)', `acq_candidats_enregistrer : ${code(ce)}`)
      if (ce.ok) crees.push('candidats')
      const r1 = rpc('acq_reserver', { p_etape: 'candidat', p_limite: 50, p_bail_s: 30 }), r2 = rpc('acq_reserver', { p_etape: 'candidat', p_limite: 50, p_bail_s: 30 })
      const [a1, a2] = await Promise.all([r1, r2])
      const ids = (x) => (Array.isArray(x.j) ? x.j : x.j?.prospects ?? []).map((p) => p.id)
      const i1 = ids(a1), i2 = ids(a2)
      verif(a1.ok && a2.ok && !i1.some((x) => i2.includes(x)), `deux réservations simultanées disjointes (${i1.length} et ${i2.length})`, `réservations : ${code(a1)} / ${code(a2)}, ${i1.filter((x) => i2.includes(x)).length} en commun`)
      const mien = [...i1, ...i2]
      const rel = (x) => (Array.isArray(x.j) ? x.j : x.j?.prospects ?? []).find((p) => String(p.cle_dedup ?? p.domaine ?? '').includes(marque))
      const p1 = rel(a1) ?? rel(a2)
      if (p1) {
        const tr = await rpc('acq_prospect_mettre_a_jour', { p_id: p1.id, p_depuis: 'candidat', p_vers: 'lien_envoye', p_patch: {} })
        verif(tr.ok && tr.j === false, 'transition hors table (candidat → lien_envoye) → false', `transition hors table : ${code(tr)} ${JSON.stringify(tr.j)}`)
      } else e.push(`aucun candidat d'essai ${marque} parmi les réservés (${mien.length})`)
      const op = await rpc('acq_opposer', { p_cles: { domaine: dom('b') }, p_motif: 'essai', p_source: marque })
      if (op.ok) crees.push('opposition')
      const oo = await rpc('acq_oppose', { p_cles: { domaine: dom('b') } })
      verif(op.ok && oo.ok && oo.j === true, 'clé en opposition définitive → acq_oppose vrai', `opposition : ${code(op)} / ${code(oo)} ${JSON.stringify(oo.j)}`)
      const tp = await rpc('acq_opposer', { p_cles: { domaine: dom('a') }, p_motif: 'essai', p_source: marque, p_expire_le: new Date(Date.now() + 90 * 86400_000).toISOString() })
      const to = await rpc('acq_oppose', { p_cles: { domaine: dom('a') } })
      verif(tp.ok && to.ok && to.j === true, 'opposition temporaire à 90 jours → acq_oppose vrai', `opposition temporaire : ${code(tp)} / ${code(to)}`)
      for (let k = 0; k < 3; k++) await rpc('acq_reserver', { p_etape: 'candidat', p_limite: 50, p_bail_s: 0 })
      oks.push('trois réservations sans suite jouées (a_decider se lit dans le compte rendu de l\'essai à sec de 026-060)')
    } finally {
      // Ménage : aucune fonction d'effacement n'est ouverte à PostgREST (le schéma ops est fermé, c'est voulu) ; les lignes
      // d'essai sont neutralisées (étape rejete, curseur vidé) et la requête d'effacement est écrite pour le connecteur.
      const m = []
      if (crees.includes('curseur')) { const x = await rpc('acq_curseur_poser', { p_nom: marque, p_valeur: '' }); if (!x.ok) m.push(`curseur non vidé (${code(x)})`) }
      const sqlMenage = [
        `delete from ops.prospects where cle_dedup like 'domaine:${marque}-%';`,
        `delete from ops.opposition where cle_valeur like '${marque}-%' or source = '${marque}';`,
        `delete from ops.curseurs where nom = '${marque}';`,
      ].join('\n')
      const f = path.join(exigerSousTravail(path.join(TRAVAIL, NOM)), `menage-${marque}.sql`)
      fs.mkdirSync(path.dirname(f), { recursive: true })
      fs.writeFileSync(f, `-- ménage de ${NOM} --reel (${marque}) : à passer par execute_sql du connecteur\n${sqlMenage}\n`)
      if (m.length) e.push(`ménage : ${m.join(' ; ')}`)
      else oks.push(`ménage : curseur vidé ; effacement des lignes ${marque} écrit dans ${path.relative(R, f).split(path.sep).join('/')} (connecteur)`)
    }
  } else if (migration === 'echanges') {
    const sonde = await rpc('acq_preuves_a_garder', { p_envois: [crypto.randomUUID()] })
    if (inconnue(sonde)) throw new Prealable(`acq_preuves_a_garder inconnue de PostgREST : 0106 n'est pas appliquée (${code(sonde)})`)
    verif(sonde.ok && Array.isArray(sonde.j) && sonde.j.length === 0, 'acq_preuves_a_garder : un id inconnu n\'est pas rendu', `acq_preuves_a_garder(id inconnu) : ${code(sonde)} ${JSON.stringify(sonde.j)}`)
    const b = await rpc('acq_preuves_a_garder', { p_envois: Array.from({ length: 501 }, () => crypto.randomUUID()) })
    verif(!b.ok && /ops:borne/.test(JSON.stringify(b.j)), '501 ids → ops:borne', `501 ids : ${code(b)}`)
    for (const fn of ['acq_preuves_a_garder', 'acq_formulaires_a_porter', 'acq_envoi_preparer']) {
      const a = await rpc(fn, fn === 'acq_preuves_a_garder' ? { p_envois: [] } : fn === 'acq_formulaires_a_porter' ? { p_limite: 1, p_bail_s: 1 } : { p: {} }, cles.anon)
      verif(refus(a), `${fn} refusée avec la clé anon`, `${fn} ${a.status === 0 ? 'sans réponse' : 'acceptée'} avec la clé anon`)
    }
    const od = await rpc('acq_oppositions_depuis', { p_depuis: new Date().toISOString() })
    verif(inconnue(od), 'acq_oppositions_depuis inconnue (retirée)', `acq_oppositions_depuis : ${code(od)}`)
    const sq = await rpc('acq_envoi_envoye', { p_envoi: crypto.randomUUID(), [REFUS.parametre]: 'x', p_entetes: {} })
    verif(inconnue(sq), `acq_envoi_envoye(p_envoi, ${REFUS.parametre}, p_entetes) inconnue`, `ancienne forme d'acq_envoi_envoye : ${code(sq)}`)
    const opts = (n) => Array.from({ length: n }, (_, k) => ({ cle: `option_${'abcdefgh'[k]}`, libelle: `Option ${k + 1}`, recommandee: k === 0 }))
    for (const n of [8, 1]) {
      const d = await rpc('acq_decision_creer', { p: { agent: 'standardiste', cle_idempotence: `${marque}:${n}`, question: 'Essai ?', options: opts(n), defaut: 'option_a', type: 'lire' } })
      verif(d.ok && d.j && d.j.ok === false && d.j.raison === 'options', `acq_decision_creer à ${n} option(s) → { ok: false, raison: 'options' } sans écrire`, `acq_decision_creer à ${n} option(s) : ${code(d)} ${court(JSON.stringify(d.j), 80)}`)
    }
    for (const [fn, args] of [['acq_rdv_par_jeton', { p_jeton_hache: '0'.repeat(64) }], ['acq_maquette_par_jeton', { p_jeton_hache: '0'.repeat(64) }]]) {
      const x = await rpc(fn, args)
      verif(x.ok && x.j === null, `${fn}(inconnu) → null`, `${fn}(inconnu) : ${code(x)} ${JSON.stringify(x.j)}`)
    }
  } else {
    const noms = ['acq-standardiste', 'acq-recenseur', 'acq-facteur', 'acq-repondeur']
    const p = await appel(`/rest/v1/passages_cron?select=nom,dernier_passage,reussi&nom=in.(${noms.join(',')})`, cles.service)
    if (!p.ok) throw new Prealable(`passages_cron illisible (${code(p)})`)
    const lignes = new Map((p.j ?? []).map((x) => [x.nom, x]))
    for (const n of noms) {
      const l = lignes.get(n)
      const age = l ? (Date.now() - Date.parse(l.dernier_passage)) / 60_000 : Infinity
      verif(l && age <= 60 && l.reussi === true, `passages_cron ${n} réussi il y a ${Math.round(age)} min`, `passages_cron ${n} : ${l ? `${Math.round(age)} min, reussi=${l.reussi}` : 'absent'} (moins d'une heure et réussi attendus)`)
    }
    const j = await appel('/rest/v1/job?select=jobname,schedule,active', cles.service, { extra: { 'Accept-Profile': 'cron' } })
    if (j.ok && Array.isArray(j.j)) {
      const actives = new Map(j.j.filter((x) => x.active).map((x) => [x.jobname, x.schedule]))
      for (const [n, cal] of [...TACHES_HTTP, TACHE_SQL]) verif(actives.get(n) === cal, `cron.job ${n} active`, `cron.job ${n} : ${actives.has(n) ? actives.get(n) : 'absente ou inactive'}`)
    } else oks.push(`cron.job non exposé à PostgREST (${code(j)}) : les onze tâches se lisent par ${'supabase/controles/0109_acquisition_planification.sql'} au connecteur`)
  }
  r.juger(id, e, oks.join(' ; '))
}

// ── Le témoin et ses sabotages (--auto-controle) ──────────────────────────────────────────────────────────────────────────
const RACINE_AUTO = exigerSousTravail(path.join(TRAVAIL, NOM, 'auto'))
function materialiser(dest, migration, sabotage) {
  fs.rmSync(dest, { recursive: true, force: true })
  const copier = (src, d) => {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, e.name), t = path.join(d, e.name)
      if (e.isDirectory()) { fs.mkdirSync(t, { recursive: true }); copier(s, t); continue }
      const txt = fs.readFileSync(s, 'utf8')
        .replaceAll('{{BASE_PRESTI}}', `https://${HOTE}`).replaceAll('{{HOTE_PRESTI}}', HOTE).replaceAll('{{URL_ESSAI}}', URL_ESSAI)
        .replaceAll('{{GRATUITES_SQL}}', K.MESSAGERIES_GRATUITES.map((x) => `'${x}'`).join(', '))
      fs.mkdirSync(path.dirname(t), { recursive: true })
      fs.writeFileSync(t, txt)
    }
  }
  copier(TEMOIN, dest)
  for (const n of fs.readdirSync(path.join(R, 'supabase', 'migrations')).filter((x) => /^009[678]_ops_[a-z_]+\.sql$/.test(x))) fs.copyFileSync(path.join(R, 'supabase', 'migrations', n), path.join(dest, 'supabase', 'migrations', n))
  for (const [, , route] of TACHES_HTTP) { const f = path.join(dest, 'app', 'api', 'cron', route.split('?')[0], 'route.ts'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'export async function GET() { return new Response(null, { status: 401 }) }\n') }
  const appliquer = (phase) => {
    for (const s of [sabotage].flat().filter(Boolean).filter((x) => (x.phase ?? 'avant') === phase)) {
      const f = path.join(dest, s.fichier)
      if (s.supprimer) { fs.rmSync(f, { force: true }); continue }
      if (s.creer !== undefined) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s.creer); continue }
      const avant = fs.readFileSync(f, 'utf8')
      const apres = typeof s.remplacer === 'function' ? s.remplacer(avant) : avant.replace(s.avant, s.apres)
      if (apres === avant) throw new Error(`sabotage « ${s.nom ?? s.fichier} » : rien à remplacer dans ${s.fichier}`)
      fs.writeFileSync(f, apres)
    }
  }
  appliquer('avant')
  for (const n of fs.readdirSync(path.join(dest, 'supabase', 'migrations')).filter((x) => /^01(05|06|09)_acquisition_[a-z]+\.sql$/.test(x) && x.endsWith(`_${SUFFIXE[migration]}.sql`))) {
    const ch = cheminsDe(`supabase/migrations/${n}`)
    fs.copyFileSync(path.join(dest, ch.migration), path.join(dest, ch.jumeau))
    const g = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), path.join(dest, ch.migration), path.join(dest, ch.nu), '--controle', path.join(dest, ch.controle)])
    if (g.status !== 0) throw new Error(`sql-nu.mjs ne fabrique pas le nu du témoin ${n} : ${court(`${g.stdout}${g.stderr}`, 160)}`)
  }
  const ess = path.join(dest, ESSAI_0106[0])
  const ch6 = cheminsDe('supabase/migrations/0106_acquisition_echanges.sql')
  if (fs.existsSync(ess) && fs.existsSync(path.join(dest, ch6.nu))) {
    const e = empreinte(jumeauNuCoupe(path.join(dest, ch6.nu)))
    fs.writeFileSync(ess, fs.readFileSync(ess, 'utf8').replaceAll('{{EMPREINTE}}', e))
  }
  appliquer('apres')
}
const M1 = 'supabase/migrations/0105_acquisition_socle.sql', M2 = 'supabase/migrations/0106_acquisition_echanges.sql', M3 = 'supabase/migrations/0109_acquisition_planification.sql'
const MAG = 'lib/agents/acquisition/magasinSupabase.ts', REG = 'docs/registre-traitements.md', AIL = 'docs/agents/analyse-interet-legitime.md'
const C1 = 'supabase/controles/0105_acquisition_socle.sql', C3 = 'supabase/controles/0109_acquisition_planification.sql', AN = 'supabase/controles/0109_acquisition_planification_annuler.sql'
const essaiCle = (cle, v) => ({ fichier: ESSAI_0106[0], phase: 'apres', remplacer: (t) => t.replace(`"${cle}":true`, `"${cle}":${v}`) })
// Chaque sabotage : l'id AC-…, le critère qu'il doit rendre rouge, ce qu'il casse.
const SABOTAGES = {
  socle: [
    ['AC-OA-1A', 'OA-1', 'un second fichier *_acquisition_socle.sql', { fichier: 'supabase/migrations/0107_acquisition_socle.sql', creer: 'select 1;\n' }],
    ['AC-OA-1B', 'OA-1', 'numéro inférieur au bus (0095)', { fichier: M1, supprimer: true }, { fichier: 'supabase/migrations/0095_acquisition_socle.sql', creer: null }],
    ['AC-OA-2A', 'OA-2', 'acq_reserver sans security definer', { fichier: M1, remplacer: (t) => t.replace(/(function public\.acq_reserver[\s\S]*?)security definer\n/, '$1') }],
    ['AC-OA-2B', 'OA-2', 'acq_oppose sans revoke à anon', { fichier: M1, remplacer: (t) => t.replace(/(revoke all on function public\.acq_oppose\(jsonb\) from public), anon, authenticated;/, '$1, authenticated;') }],
    ['AC-OA-2C', 'OA-2', 'acq_purger exécutable par authenticated', { fichier: M1, remplacer: (t) => `${t}\ngrant execute on function public.acq_purger() to authenticated;\n` }],
    ['AC-OA-2D', 'OA-2', 'acq_evenement sans search_path', { fichier: M1, remplacer: (t) => t.replace(/(function public\.acq_evenement[\s\S]*?)set search_path = public, ops, pg_temp\n/, '$1') }],
    ['AC-OA-3', 'OA-3', 'jumeau nu qui a perdu une instruction', { fichier: 'supabase/migrations/_A_COLLER_sql_editor_0105_NU.sql', phase: 'apres', remplacer: (t) => t.replace(/create table if not exists ops\.annonceurs[\s\S]*?\);\n/, '') }],
    ['AC-OA-4A', 'OA-4', 'une transition de contrat.ts absente', { fichier: M1, remplacer: (t) => t.replace(/,\s*\('lien_envoye', 'oppose'\)/, '') }],
    ['AC-OA-4B', 'OA-4', 'une transition en trop (envoye → verifie)', { fichier: M1, remplacer: (t) => t.replace(/\('non', 'oppose'\)/, "('non', 'oppose'), ('envoye', 'verifie')") }],
    ['AC-OA-5A', 'OA-5', 'un changement de type sur ops.prospects', { fichier: M1, remplacer: (t) => t.replace(/(create table if not exists ops\.annonceurs)/, 'alter table ops.prospects alter column siren type varchar(9);\n$1') }],
    ['AC-OA-5B', 'OA-5', 'un drop table', { fichier: M1, remplacer: (t) => t.replace(/(create table if not exists ops\.annonceurs)/, 'drop table if exists ops.annonceurs;\n$1') }],
    ['AC-OA-6', 'OA-6', 'reserver sans rpc', { fichier: MAG, remplacer: (t) => t.replace("rpc('acq_reserver'", "rpc('reserver_prospects'") }],
    ['AC-OA-7A', 'OA-7', 'registre sans « 10 minutes »', { fichier: REG, remplacer: (t) => t.replace(/10 minutes/g, 'dix jours') }],
    ['AC-OA-7B', 'OA-7', 'registre qui dit « désinscription »', { fichier: REG, remplacer: (t) => t.replace('## 12.', '- lien de désinscription en pied de message\n\n## 12.') }],
    ['AC-OA-7C', 'OA-7', 'GitHub absent des sous-traitants', { fichier: REG, remplacer: (t) => t.replace(/, GitHub \(/, ', (') }],
    ['AC-OA-8', 'OA-8', 'un update dans le contrôle', { fichier: C1, remplacer: (t) => `${t}\nupdate ops.agents set en_pause = false where nom = 'recenseur';\n` }],
    ['AC-OA-9A', 'OA-9', 'la période du chef à 1440', { fichier: M1, remplacer: (t) => t.replace(/('chef', 'Chef d''opérations \(A10\)'[\s\S]*?), 60, 30, 20, 0\)/, '$1, 1440, 30, 20, 0)') }],
    ['AC-OA-9B', 'OA-9', 'facteur_usine non semé', { fichier: M1, remplacer: (t) => t.replace(/select public\.ops_agent_enregistrer\('facteur_usine'[^\n]*\n/, '') }],
    ['AC-OA-9C', 'OA-9', 'une graine écrit en_pause', { fichier: M1, remplacer: (t) => `${t}\nupdate ops.agents set en_pause = true where nom = 'experience';\n` }],
    ['AC-OA-10', 'OA-10', 'acq_en_pause lit ops.pause_generale', { fichier: M1, remplacer: (t) => t.replace("public.ops_interrupteur('pause_generale')", '(select actif from ops.pause_generale limit 1)') }],
    ['AC-OA-11A', 'OA-11', 'un entrant n\'est plus forcé chaud', { fichier: M1, remplacer: (t) => t.replace("when v_source = 'entrant' then false", "when v_source = 'x_entrant' then false") }],
    ['AC-OA-11B', 'OA-11', 'la purge compte sur dernier_contact', { fichier: M1, remplacer: (t) => t.replace('coalesce(p.dernier_contact_recu, p.cree_le)', 'coalesce(p.dernier_contact, p.cree_le)') }],
    ['AC-OA-11C', 'OA-11', 'une temporaire met le prospect à oppose', { fichier: M1, remplacer: (t) => t.replace('if p_expire_le is null then', 'if true then') }],
    ['AC-OA-12A', 'OA-12', 'ops.curseurs sans RLS', { fichier: M1, remplacer: (t) => t.replace('alter table ops.curseurs enable row level security;', '') }],
    ['AC-OA-12B', 'OA-12', 'un raise qui cite p_jeton', { fichier: M1, remplacer: (t) => t.replace(/(function public\.acq_jeton_meta_poser[\s\S]*?begin\n)/, "$1  raise notice 'jeton %', p_jeton;\n") }],
    ['AC-OA-12C', 'OA-12', 'le contrôle lit la valeur du secret', { fichier: C1, remplacer: (t) => `${t}\nselect decrypted_secret as quoi from vault.decrypted_secrets where name = 'meta_adlib_token';\n` }],
    ['AC-OA-13A', 'OA-13', 'le garde-fou 20 manque', { fichier: AIL, remplacer: (t) => t.replace(/\n20\. [^\n]*/, '') }],
    ['AC-OA-13B', 'OA-13', 'sans « mise en balance »', { fichier: AIL, remplacer: (t) => t.replace(/mise en balance/gi, 'pesée') }],
  ],
  echanges: [
    ['AC-OB-1', 'OB-1', 'numéro inférieur au socle', { fichier: M2, supprimer: true }, { fichier: 'supabase/migrations/0104_acquisition_echanges.sql', creer: null }],
    ['AC-OB-2A', 'OB-2', 'acq_envoi_approuver sans security definer', { fichier: M2, remplacer: (t) => t.replace(/(function public\.acq_envoi_approuver[\s\S]*?)security definer\n/, '$1') }],
    ['AC-OB-2B', 'OB-2', 'acq_rdv_reserver exécutable par anon', { fichier: M2, remplacer: (t) => `${t}\ngrant execute on function public.acq_rdv_reserver(text, timestamptz, text) to anon;\n` }],
    ['AC-OB-2C', 'OB-2', 'acq_preuves_a_garder absente', { fichier: M2, remplacer: (t) => t.replace(/acq_preuves_a_garder/g, 'acq_preuves_garder') }],
    ['AC-OB-3', 'OB-3', 'un delete dans le contrôle', { fichier: 'supabase/controles/0106_acquisition_echanges.sql', remplacer: (t) => `${t}\ndelete from ops.meta_evenements where false;\n` }],
    ['AC-OB-4A', 'OB-4', 'bucket public', { fichier: M2, remplacer: (t) => t.replace("'maquettes', 'maquettes', false", "'maquettes', 'maquettes', true") }],
    ['AC-OB-4B', 'OB-4', 'image/png permise', { fichier: M2, remplacer: (t) => t.replace("array['image/jpeg', 'video/mp4']", "array['image/jpeg', 'video/mp4', 'image/png']") }],
    ['AC-OB-4C', 'OB-4', 'une politique sur le bucket', { fichier: M2, remplacer: (t) => `${t}\ncreate policy maquettes_lecture on storage.objects for select to anon using (bucket_id = 'maquettes');\n` }],
    ['AC-OB-5', 'OB-5', '0106 sème un plafond', { fichier: M2, remplacer: (t) => `${t}\ninsert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 5, 5) on conflict do nothing;\n` }],
    ['AC-OB-6A', 'OB-6', 'une mention du mot refusé', { fichier: M2, remplacer: (t) => t.replace("check (source in ('courriel', 'meta', 'formulaire', 'essai'))", `check (source in ('courriel', 'meta', 'formulaire', 'essai', '${REFUS.mot}'))`) }],
    ['AC-OB-6B', 'OB-6', 'acq_reponses_a_traiter lit ops.envois', { fichier: M2, remplacer: (t) => t.replace(/(function public\.acq_reponses_a_traiter[\s\S]*?from ops\.reponses r)/, '$1 join ops.envois e on e.id = r.envoi_id') }],
    ['AC-OB-7', 'OB-7', 'formulairesAPorter sans rpc', { fichier: MAG, remplacer: (t) => t.replace("rpc('acq_formulaires_a_porter'", "rpc('formulaires'") }],
    ['AC-OB-8', 'OB-8', 'texte sans borne de 1 500', { fichier: M2, remplacer: (t) => t.replace('char_length(texte) <= 1500', 'char_length(texte) <= 15000') }],
    ['AC-OB-9A', 'OB-9', 'l\'écriture de acq_envoi_preparer hors du sous-bloc', { fichier: M2, remplacer: (t) => t.replace(/(function public\.acq_envoi_preparer[\s\S]*?)exception when others then/, '$1exception when unique_violation then') }],
    ['AC-OB-9B', 'OB-9', 'acq_envoi_approuver avale toute exception', { fichier: M2, remplacer: (t) => t.replace(/(function public\.acq_envoi_approuver[\s\S]*?)\n\s*raise;/, '$1') }],
    ['AC-OB-10', 'OB-10', 'acq_reponse_appel_rendu écrit aussi classe', { fichier: M2, remplacer: (t) => t.replace('set appel_rendu_le = now()', "set appel_rendu_le = now(), classe = 'appel'") }],
    ['AC-OB-11', 'OB-11', 'acq_envoi_annuler écrit envoye', { fichier: M2, remplacer: (t) => t.replace("set statut = 'annule'", "set statut = 'envoye'") }],
    ['AC-OB-12', 'OB-12', 'acq_rdv_par_jeton rend le téléphone', { fichier: M2, remplacer: (t) => t.replace("'metier', p.metier,", "'metier', p.metier, 'telephone', v.telephone,") }],
    ['AC-OB-13', 'OB-13', 'acq_meta_evenement_enregistrer sans on conflict', { fichier: M2, remplacer: (t) => t.replace(/(function public\.acq_meta_evenement_enregistrer[\s\S]*?)on conflict \(id_externe\) do nothing/, '$1') }],
    ['AC-OB-14A', 'OB-14', 'la fenêtre de Meta à 48 h', { fichier: M2, remplacer: (t) => t.replace("interval '24 hours'", "interval '48 hours'") }],
    ['AC-OB-14B', 'OB-14', 'essai à sec : 25 h passe', essaiCle('ob14_messagerie_25h_refusee', 'false')],
    ['AC-OB-15', 'OB-15', 'acq_oppositions_depuis revient', { fichier: M2, remplacer: (t) => `${t}\ncreate or replace function public.acq_oppositions_depuis(p_depuis timestamptz) returns setof text language sql stable security definer set search_path = public, ops, pg_temp as $$ select cle_valeur from ops.opposition where cree_le >= p_depuis $$;\n` }],
    ['AC-OB-16A', 'OB-16', 'acq_reponse_reclasser sans créateur standardiste', { fichier: M2, remplacer: (t) => t.replace("and d.creee_par = 'standardiste'", '') }],
    ['AC-OB-16B', 'OB-16', 'essai à sec : 8 options acceptées', essaiCle('ob16_options_8_refusees', 'false')],
    ['AC-OB-17', 'OB-17', 'essai à sec : un entrant exclu', essaiCle('ob17_deux_entrants_rendus', 'false')],
    ['AC-OB-18', 'OB-18', 'la purge efface l\'opposition', { fichier: M2, remplacer: (t) => t.replace('-- (l\'opposition reste)', 'delete from ops.opposition o where o.source = \'effacement\';') }],
    ['AC-OB-19', 'OB-19', 'reference sans unique', { fichier: M2, remplacer: (t) => t.replace('add column if not exists reference text unique', 'add column if not exists reference text') }],
    ['AC-OB-20A', 'OB-20', 'acq_envoi_envoye à l\'ancienne forme', { fichier: M2, remplacer: (t) => t.replace('acq_envoi_envoye(p_envoi uuid, p_preuve jsonb)', `acq_envoi_envoye(p_envoi uuid, p_preuve jsonb, ${REFUS.parametre} text default null)`) }],
    ['AC-OB-20B', 'OB-20', 'chemin_usine non vérifié', { fichier: M2, remplacer: (t) => t.replace(", 'chemin_usine']", ']') }],
    ['AC-OB-21A', 'OB-21', 'une adresse rendue au porteur', { fichier: M2, remplacer: (t) => t.replace("'formulaire', p.formulaire)", "'formulaire', p.formulaire, 'destinataire', e.destinataire)") }],
    ['AC-OB-21B', 'OB-21', 'sans skip locked', { fichier: M2, remplacer: (t) => t.replace('for update of e skip locked', 'for update of e') }],
    ['AC-OB-22', 'OB-22', 'gmail.com rattaché par son domaine', { fichier: M2, remplacer: (t) => t.replace(`not in (${K.MESSAGERIES_GRATUITES.map((x) => `'${x}'`).join(', ')})`, "not in ('exemple.invalid')") }],
    ['AC-OB-23', 'OB-23', 'le froid relancé', { fichier: M2, remplacer: (t) => t.replace("where p.etape = 'lien_envoye'", "where p.etape in ('lien_envoye', 'envoye')") }],
    ['AC-OB-24A', 'OB-24', 'sans la borne de 500', { fichier: M2, remplacer: (t) => t.replace("raise exception 'ops:borne'", "raise exception 'ops:trop'") }],
    ['AC-OB-24B', 'OB-24', 'essai à sec : empreinte d\'un autre texte', { fichier: ESSAI_0106[0], phase: 'apres', remplacer: (t) => t.replace(/ESSAI_A_SEC [0-9a-f]{64}/, `ESSAI_A_SEC ${'0'.repeat(64)}`) }],
    ['AC-OB-24C', 'OB-24', 'essai à sec : APRES rien_ne_reste=false', { fichier: ESSAI_0106[0], phase: 'apres', remplacer: (t) => t.replace('APRES rien_ne_reste=true', 'APRES rien_ne_reste=false') }],
  ],
  planification: [
    ['AC-PG-1A', 'PG-1', 'une tâche acq-facteur-pause', { fichier: M3, remplacer: (t) => t.replace("select cron.schedule('acq-repondeur'", `select cron.schedule('acq-facteur-pause', '* * * * *', $$ select net.http_get(url := 'https://${HOTE}/api/cron/facteur?passe=pause', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);\nselect cron.schedule('acq-repondeur'`) }],
    ['AC-PG-1B', 'PG-1', 'acq-recenseur toutes les heures', { fichier: M3, remplacer: (t) => t.replace("'*/10 5-19 * * *'", "'0 5-19 * * *'") }],
    ['AC-PG-1C', 'PG-1', 'la purge sans acq_echanges_purger', { fichier: M3, remplacer: (t) => t.replace(' select public.acq_echanges_purger();', '') }],
    ['AC-PG-2A', 'PG-2', 'un jeton littéral', { fichier: M3, remplacer: (t) => t.replace("'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')", `'Bearer ${'sb_' + 'essai0123456789abcdefXYZ'}'`) }],
    ['AC-PG-2B', 'PG-2', 'timeout de 5 s', { fichier: M3, remplacer: (t) => t.replace('timeout_milliseconds := 60000', 'timeout_milliseconds := 5000') }],
    ['AC-PG-2C', 'PG-2', 'route du Répondeur absente', { fichier: 'app/api/cron/repondeur/route.ts', supprimer: true }],
    ['AC-PG-3', 'PG-3', 'l\'annulation fait autre chose', { fichier: AN, remplacer: (t) => `${t}\ndelete from cron.job_run_details;\n` }],
    ['AC-PG-4', 'PG-4', 'jumeau nu divergent', { fichier: 'supabase/migrations/_A_COLLER_sql_editor_0109_NU.sql', phase: 'apres', remplacer: (t) => t.replace("'20 2 * * *'", "'25 2 * * *'") }],
  ],
}
// ── Le banc de --reel : un faux PostgREST en mémoire, pour éprouver reel() sur OA-R/OB-R/PG-R sans base ni réseau ──────────
// Un « sabotage » ici ne touche aucun fichier : c'est une réponse du banc rendue fausse pour un seul appel ciblé.
// Auto-cohérent : renvoie ce que reel() vient lui-même d'écrire (curseur, candidats), jamais une valeur du banc devinée à
// l'avance — reel() forge sa propre marque (horodatage) que le banc ne connaît pas d'avance.
function fauxSocle(sabotage) {
  const PERIODES = new Map(AGENTS.map(([n, , , , , p]) => [n, p]))
  let reservations = 0
  let curseurNom = null, curseurValeur = null
  let candidats = []
  return async (chemin, cle, { corps } = {}) => {
    const fn = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(chemin)?.[1]
    const anon = cle === 'ANON_BANC'
    if (fn === 'acq_en_pause') return { status: 200, ok: true, j: false }
    if (fn === 'ops_etat') return { status: 200, ok: true, j: { agents: [...PERIODES].map(([nom, periode_minutes]) => ({ nom, periode_minutes: sabotage === 'periode' && nom === 'chef' ? periode_minutes + 1 : periode_minutes })) } }
    if (fn === 'acq_curseur_poser') { curseurNom = corps?.p_nom; curseurValeur = corps?.p_valeur; return { status: 200, ok: true, j: true } }
    if (fn === 'acq_curseur_lire') return { status: 200, ok: true, j: corps?.p_nom === curseurNom ? curseurValeur : null }
    if (fn === 'acq_jeton_meta') return anon ? (sabotage === 'jeton_anon' ? { status: 200, ok: true, j: 'fuite' } : { status: 401, ok: false, j: { message: 'forbidden' } }) : { status: 200, ok: true, j: 'jeton' }
    if (fn === 'acq_candidats_enregistrer') { candidats = corps?.p ?? []; return { status: 200, ok: true, j: true } }
    if (fn === 'acq_reserver') {
      if (anon) return { status: 401, ok: false, j: { message: 'forbidden' } }
      if (corps?.p_bail_s === 30) { reservations++; return { status: 200, ok: true, j: reservations === 1 ? candidats.map((c, i) => ({ id: `p-${i}`, cle_dedup: c.cle_dedup, domaine: c.domaine })) : [] } }
      return { status: 200, ok: true, j: [] }
    }
    if (fn === 'acq_prospect_mettre_a_jour') return { status: 200, ok: true, j: false }
    if (fn === 'acq_opposer' || fn === 'acq_oppose') return { status: 200, ok: true, j: true }
    return { status: 404, ok: false, j: { message: `rpc inconnue du banc : ${fn}` } }
  }
}
function fauxEchanges(sabotage) {
  return async (chemin, cle, { corps } = {}) => {
    const fn = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(chemin)?.[1]
    const anon = cle === 'ANON_BANC'
    if (fn === 'acq_preuves_a_garder') {
      if (anon) return { status: 401, ok: false, j: { message: 'forbidden' } }
      const n = (corps?.p_envois ?? []).length
      if (n > 500) return sabotage === 'borne' ? { status: 200, ok: true, j: [] } : { status: 400, ok: false, j: { message: 'ops:borne' } }
      return { status: 200, ok: true, j: [] }
    }
    if (fn === 'acq_formulaires_a_porter' || fn === 'acq_envoi_preparer') return anon ? { status: 401, ok: false, j: { message: 'forbidden' } } : { status: 200, ok: true, j: [] }
    if (fn === 'acq_oppositions_depuis') return sabotage === 'oppositions' ? { status: 200, ok: true, j: [] } : { status: 404, ok: false, j: { code: 'PGRST202', message: 'not found' } }
    if (fn === 'acq_envoi_envoye') return { status: 404, ok: false, j: { code: 'PGRST202', message: 'not found' } }
    if (fn === 'acq_decision_creer') { const n = corps?.p?.options?.length; return { status: 200, ok: true, j: n === 8 || n === 1 ? { ok: false, raison: 'options' } : { ok: true } } }
    if (fn === 'acq_rdv_par_jeton' || fn === 'acq_maquette_par_jeton') return { status: 200, ok: true, j: null }
    return { status: 404, ok: false, j: { message: `rpc inconnue du banc : ${fn}` } }
  }
}
function fauxPlanification(sabotage) {
  return async (chemin) => {
    if (chemin.startsWith('/rest/v1/passages_cron')) {
      const noms = ['acq-standardiste', 'acq-recenseur', 'acq-facteur', 'acq-repondeur']
      return { status: 200, ok: true, j: noms.map((nom) => ({ nom, dernier_passage: new Date(Date.now() - (sabotage === 'age' && nom === 'acq-recenseur' ? 90 : 5) * 60_000).toISOString(), reussi: !(sabotage === 'reussi' && nom === 'acq-facteur') })) }
    }
    if (chemin.startsWith('/rest/v1/job')) return { status: 404, ok: false, j: { message: 'non exposé au banc' } }
    return { status: 404, ok: false, j: { message: 'chemin inconnu du banc' } }
  }
}
// Un témoin (réponses correctes) puis, par migration, des sabotages ciblés d'une seule réponse — chacun doit rougir OA-R,
// OB-R ou PG-R et seulement lui, sans toucher le disque ni le réseau (fetchImpl remplace tout accès réel dans reel()).
const SABOTAGES_REEL = {
  socle: [['AC-OAR-1', 'periode', 'ops_etat : la période du chef décalée d\'une minute'], ['AC-OAR-2', 'jeton_anon', 'acq_jeton_meta acceptée avec la clé anon']],
  echanges: [['AC-OBR-1', 'borne', '501 ids acceptés sans ops:borne'], ['AC-OBR-2', 'oppositions', 'acq_oppositions_depuis répond encore (retirée attendue)']],
  planification: [['AC-PGR-1', 'age', 'passages_cron acq-recenseur vieux de 90 min'], ['AC-PGR-2', 'reussi', 'passages_cron acq-facteur reussi=false']],
}
const FABRIQUES_REEL = { socle: (s) => fauxSocle(s), echanges: (s) => fauxEchanges(s), planification: (s) => fauxPlanification(s) }
const CRITERE_REEL = { socle: 'OA-R', echanges: 'OB-R', planification: 'PG-R' }
async function autoControleReel(migrations, noter) {
  for (const mig of migrations) {
    const id = CRITERE_REEL[mig]
    try {
      const r = rapport([])
      await reel(mig, r, { fetchImpl: FABRIQUES_REEL[mig](null) })
      const l = r.lignes().find((x) => x.id === id)
      noter(`AC-TEMOIN-${id.replace('-', '')}`, !!l?.ok, l ? (l.ok ? `banc hors réseau, réponses correctes : ${court(l.t, 160)}` : `${id} rouge à tort sur le banc correct : ${court(l.t, 200)}`) : `${id} non produit par reel()`)
    } catch (e) { noter(`AC-TEMOIN-${id.replace('-', '')}`, false, `témoin --reel (banc) non joué : ${premiereLigne(e)}`) }
    for (const [aid, sab, lib] of SABOTAGES_REEL[mig]) {
      try {
        const r = rapport([])
        await reel(mig, r, { fetchImpl: FABRIQUES_REEL[mig](sab) })
        const l = r.lignes().find((x) => x.id === id)
        noter(aid, !!l && !l.ok, l ? (!l.ok ? `sabotage « ${lib} » → ${court(l.t, 180)}` : `sabotage « ${lib} » NON repéré : ${id} reste vert`) : `${id} non produit par reel()`)
      } catch (e) { noter(aid, false, `sabotage « ${lib} » non joué : ${premiereLigne(e)}`) }
    }
  }
}
async function autoControle(migrations) {
  const lignes = []
  const noter = (id, ok, d) => lignes.push(`${ok ? '✅' : '❌'} ${id} ${d}`)
  for (const mig of migrations) {
    const dest = path.join(RACINE_AUTO, mig, 'temoin')
    try {
      materialiser(dest, mig, null)
      const r = JUGES[mig](dest, { temoin: true, travail: exigerSousTravail(path.join(RACINE_AUTO, mig)) })
      const l = r.lignes()
      const rouges = l.filter((x) => !x.ok)
      noter(`AC-TEMOIN-${mig.toUpperCase()}`, !rouges.length, rouges.length ? `le témoin est rouge : ${rouges.map((x) => court(x.t, 200)).join(' | ')}` : `le témoin (${path.relative(R, TEMOIN).split(path.sep).join('/')}) rend ${l.length} critère(s) vert(s) : ${l.map((x) => x.id).join(', ')}`)
    } catch (e) { noter(`AC-TEMOIN-${mig.toUpperCase()}`, false, `témoin non jugé : ${premiereLigne(e)}`) }
    for (const [id, critere, lib, ...sab] of SABOTAGES[mig]) {
      const d = path.join(RACINE_AUTO, mig, id)
      try {
        const s = sab.map((x) => (x.creer === null ? { ...x, creer: fs.readFileSync(path.join(TEMOIN, mig === 'socle' ? M1 : M2), 'utf8').replaceAll('{{BASE_PRESTI}}', `https://${HOTE}`).replaceAll('{{HOTE_PRESTI}}', HOTE).replaceAll('{{URL_ESSAI}}', URL_ESSAI).replaceAll('{{GRATUITES_SQL}}', K.MESSAGERIES_GRATUITES.map((y) => `'${y}'`).join(', ')) } : x))
        materialiser(d, mig, s)
        const r = JUGES[mig](d, { temoin: true, travail: exigerSousTravail(path.join(RACINE_AUTO, mig)) })
        const l = r.lignes().find((x) => x.id === critere)
        noter(id, l && !l.ok, l && !l.ok ? `sabotage « ${lib} » → ${court(l.t, 180)}` : `sabotage « ${lib} » NON repéré : ${l ? court(l.t, 120) : `${critere} absent`}`)
      } catch (e) { noter(id, false, `sabotage « ${lib} » non joué : ${premiereLigne(e)}`) }
      fs.rmSync(d, { recursive: true, force: true })
    }
  }
  await autoControleReel(migrations, noter)
  return lignes
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptions(process.argv.slice(2), { connues: ['migration'], drapeauxConnus: ['reel', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${NOM} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const MIG = o.valeurs.migration
if (MIG !== undefined && !JUGES[MIG]) refuser(`--migration=socle|echanges|planification attendu (reçu : ${MIG})`)
const REEL = o.drapeaux.has('reel')
if (REEL && !o.drapeaux.has('confirmer-reel')) refuser('--reel exige --confirmer-reel : le mode réel écrit en production et ne se lance que par Claude Code, jamais par l\'orchestre ni le registre')
if (!REEL && o.drapeaux.has('confirmer-reel')) refuser('--confirmer-reel sans --reel')
if (REEL && (o.autoControle || path.resolve(o.racine) !== path.resolve(R))) refuser('--reel se lance seul, sur la racine du dépôt')
if (o.autoControle) {
  console.log(`${NOM} --auto-controle — témoin et sabotages ${MIG ?? 'des trois migrations'}`)
  const l = await autoControle(MIG ? [MIG] : ['socle', 'echanges', 'planification'])
  for (const x of l) console.log(x)
  const rouges = l.filter((x) => x.startsWith('❌')).map((x) => x.split(' ')[1])
  console.log(rouges.length ? `${NOM} --auto-controle : FAIL — ${rouges.join(', ')}` : `${NOM} --auto-controle : PASS (${l.length} épreuves)`)
  process.exit(rouges.length ? 1 : 0)
}
if (!MIG) refuser('--migration=socle|echanges|planification attendu')
const racine = o.racine
if (!fs.existsSync(racine)) refuser(`racine introuvable : ${racine}`)
const temoin = path.resolve(racine) !== path.resolve(R)
const travail = exigerSousTravail(path.join(TRAVAIL, NOM, MIG))
fs.mkdirSync(travail, { recursive: true })
console.log(`${NOM} ${MIG} — racine ${path.relative(R, racine).split(path.sep).join('/') || '.'}${REEL ? ' — --reel' : ''}`)
const r = JUGES[MIG](racine, { temoin, travail })
if (REEL) {
  try { await reel(MIG, r) } catch (e) {
    if (e instanceof Prealable) { for (const x of r.lignes()) console.log(x.t); console.log(`${NOM} : préalable manquant — ${e.message}`); process.exitCode = 2 }
    else throw e
  }
}
if (process.exitCode !== 2) {
  const l = r.lignes()
  for (const x of l) console.log(x.t)
  const rouges = l.filter((x) => !x.ok).map((x) => x.id)
  console.log(rouges.length ? `${NOM} ${MIG} : FAIL — ${rouges.join(', ')}` : `${NOM} ${MIG} : PASS`)
  process.exitCode = rouges.length ? 1 : 0
}
