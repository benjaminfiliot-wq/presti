// scripts/pilotage-sql-qa.mjs — le juge des quatre migrations du Pilotage (fiche 026-066, écrit par Claude Code).
//
//   node scripts/pilotage-sql-qa.mjs --migration=lecture|echanges|station|reglages [--racine=<d>] [--base=<commit>]
//        [--essai=<compte rendu>] [--temoin] [--generer-essai [--avec=0096,0097,…]] [--reel]
//
// Une migration, un cahier (critères de la fiche jugée) :
//   lecture  → 026-076, *_pilotage_lecture.sql, critères SQ ;   echanges → 026-079, *_pilotage_echanges.sql, critères SE ;
//   station  → 026-088, *_pilotage_station.sql, critères SS ;   reglages → 026-175, *_station_reglages.sql, critères SR.
// Le fichier se trouve par son nom, jamais par son numéro (provisoire). Méthode du domaine horloge-bus (026-009) : lecture
// statique, essai à sec GÉNÉRÉ par ce juge (--generer-essai : un seul énoncé do $essai_026$ … raise exception 'ESSAI_A_SEC
// % %' que Claude Code exécute par execute_sql ; le message est recopié dans .orchestre/preuves/<fiche>/essai-a-sec.txt,
// ou dans le fichier de --essai, relatif à la racine), puis --reel après l'application par Claude Code.
//
//   --racine=<d>   juge l'arbre <d> (référence de la preuve, témoin posé sur la référence, sabotage) : statique seulement.
//   --base=<c>     le commit auquel la non-régression compare les migrations, jumeaux et contrôles existants (défaut HEAD).
//   --temoin       juge le témoin du lot b (scripts/fixtures/026-pilotage/b/temoin/) posé sur les fichiers supabase/ du
//                  commit --base, sous .orchestre/travail/pilotage-sql-qa/temoin-arbre/ : la preuve que le juge sait être vert.
//   --reel         (après l'application) appelle les fonctions par PostgREST avec la clé de service puis la clé anonyme ; lit
//                  .env.local sans rien afficher. N'écrit rien de durable : pilotage_code_publier republie l'état d'avant
//                  dans un finally ; les écritures de la station et des réglages ne sont appelées qu'avec des arguments
//                  refusés d'avance (auteur non fondateur, texte vide, aucune vente, version périmée).
// Sortie : « ✅ ID … » ou « ❌ ID … » par critère, puis « pilotage-sql-qa --migration=<m> : PASS|FAIL ». Code 0, 1, ou 2
// (appel invalide). N'écrit que sous .orchestre/travail/pilotage-sql-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { R, court, premiereLigne, lireOptions, creerSortie, exigerSousTravail, git, shaBlob } from './fixtures/026-pilotage/a/commun.mjs'
import {
  instructions, normaliser, segments, masquer, fermante, decouperVirgules, compacter, serrer, codeSeul, jumeauNuCoupe, empreinte,
  blocEssai, analyserEssai, clesScenario, lireCompteRendu, lireEnvLocal, MARQUE_CONTROLE, lf,
} from './lib/sql-essai.mjs'
import { commitBase, lireBase, arbreTemoin, TRAVAIL } from './fixtures/026-pilotage/b/commun.mjs'
import { SCENARIOS, APRES } from './fixtures/026-pilotage/b/scenarios-sql.mjs'

const JUGE = 'pilotage-sql-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['migration', 'generer-essai', 'avec', 'reel', 'essai', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const MIG = o.valeurs.migration
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!['lecture', 'echanges', 'station', 'reglages'].includes(MIG)) refuser('--migration=lecture|echanges|station|reglages attendu')
const REEL = o.drapeaux.has('reel'), GENERER = o.drapeaux.has('generer-essai')
if (o.temoin && (REEL || o.valeurs.racine)) refuser('--temoin ne se combine ni avec --racine, ni avec --reel')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }

// ── Les contrats (sections « Contrat » des fiches jugées) ───────────────────────────────────────────────────────────────
const LISTE_LECTURE = {
  pilotage_decisions: ['p_limite integer', 'id uuid, question text, contexte text, options jsonb, option_defaut text, montant_cents integer, portee text, echeance timestamptz, cree_le timestamptz, creee_par text'],
  pilotage_decision: ['p_id uuid', 'id uuid, question text, contexte text, options jsonb, option_defaut text, montant_cents integer, portee text, echeance timestamptz, cree_le timestamptz, creee_par text'],
  pilotage_decisions_par_cles: ['p_cles text[]', 'cle text, question text, statut text, choix text, tranchee_le timestamptz'],
  pilotage_agents: ['', 'nom text, libelle text, capacites text[], en_pause boolean, pause_motif text, battement_le timestamptz, periode_minutes integer, prochain_le timestamptz, disjoncteur_ouvert_le timestamptz, dernier_type text, dernier_resume text, dernier_le timestamptz, cout_mois_eur numeric, modele text, fournisseur text, modele_le timestamptz'],
  pilotage_couts_agents: ['p_depuis timestamptz', 'agent text, montant_eur numeric, appels integer'],
  pilotage_couts_taches: ['p_depuis timestamptz, p_limite integer', 'tache_id uuid, type text, agent text, montant_eur numeric, le timestamptz'],
  pilotage_couts_modeles: ['p_debut timestamptz', 'fournisseur text, modele text, appels integer, eur numeric'],
  pilotage_chef: ['', 'modele text, cycles_jour integer, dernier_cycle_le timestamptz, prochain_le timestamptz'],
  pilotage_evenements: ['p_apres bigint, p_limite integer, p_agent text, p_types text[]', 'id bigint, le timestamptz, agent text, type text, objet text, resume text'],
  pilotage_attention_sources: ['', 'cle text, nombre integer, plus_ancien timestamptz'],
  pilotage_taches_agent: ['p_nom text, p_limite integer', 'id uuid, type text, statut text, objet text, derniere_erreur text, preuve_presente boolean, maj_le timestamptz'],
  pilotage_code_publier: ['p_etat jsonb', 'text'],
  pilotage_code_lire: ['', 'etat jsonb, publie_le timestamptz'],
}
const LISTE_ECHANGES = {
  pilotage_envois_du_jour: ['', 'id uuid, canal text, technologie text, type text, statut text, envoyeur text, metier text, commune text, variante text, froid boolean, verdicts jsonb, prepare_le timestamptz, envoye_le timestamptz'],
  pilotage_compteurs_du_jour: ['', 'canal text, palier text, plafond integer, utilises integer, plaintes_7j integer, avis_abus integer, stop_100 integer, echecs_affilee integer, reponses_positives integer'],
  pilotage_compteurs_technologies: ['', 'technologie text, envois_jour integer, echecs_affilee integer, etat text, pause_motif text, envois_300 integer, reponses_300 integer'],
  pilotage_entonnoir: ['p_depuis timestamptz', 'id uuid, canal text, variante text, froid boolean, envoye_le timestamptz, repondu boolean, oui boolean, appel boolean, vente boolean'],
  pilotage_bilan_date: ['', 'bilan_le date, verdict text, prolonge_jusqua date'],
  pilotage_bilan: ['p_n integer', 'id uuid, envoye_le timestamptz, oui boolean, vente boolean'],
  pilotage_appels: ['p_limite integer', 'id uuid, source text, prospect text, telephone text, contexte text, creneau timestamptz, recu_le timestamptz'],
  pilotage_etat_envoi: ['', 'palier text, envoi_froid boolean, epreuve_passee boolean, epreuve_le timestamptz, mesure_a_sec boolean, notice_verifiee_le timestamptz, technologies_pause text[], modeles_suspendus text[]'],
  pilotage_reponses_du_jour: ['', 'classe text, nombre integer'],
  pilotage_tapis: ['p_depuis timestamptz', 'etape text, nombre integer'],
  pilotage_recettes_agents: ['p_depuis timestamptz', 'jour date, source text, commandes integer, montant_cents bigint, en_ligne integer'],
  pilotage_atelier: ['p_depuis timestamptz', 'id uuid, metier text, commune text, statut text, video boolean, verdict text, le timestamptz'],
  pilotage_reponses_recentes: ['p_limite integer', 'id uuid, recu_le timestamptz, classe text, texte_recu text, reponse_envoyee text'],
}
const LISTE_STATION = {
  station_consigne_transmettre: ['p_texte text, p_auteur uuid, p_agent text default null', 'bigint'],
  station_reunion_ouvrir: ['p_agent text', 'uuid'],
  station_reunion_clore: ['p_id uuid, p_agent text, p_lignes text[], p_objectif jsonb, p_idees text[]', 'boolean'],
  station_reunion_abandonner: ['p_id uuid, p_agent text, p_motif text', 'boolean'],
  station_reunions_echues_abandonner: ['', 'integer'],
  station_experience_lancer: ['p_nom text, p_budget_eur numeric, p_auteur uuid', 'uuid'],
  station_experience_arreter: ['p_id uuid, p_auteur uuid, p_motif text', 'boolean'],
  station_experiences_echues_arreter: ['', 'integer'],
  station_pause_par_agent: ['p_agent text, p_motif text', 'boolean'],
  station_consigne_par_agent: ['p_agent text, p_texte text, p_agent_cible text default \'chef\'', 'bigint'],
  station_reunion_chiffres: ['', 'jsonb'],
  station_reunion_lire: ['p_limite integer', 'id uuid, jour date, ouverte_le timestamptz, close_le timestamptz, statut text, motif text, lignes text[], objectif jsonb, idees text[]'],
  station_objectif_actif: ['', 'libelle text, mesure text, cible integer, fixe_le timestamptz'],
  station_experience_etat: ['', 'aucune_vente boolean, id uuid, nom text, budget_eur numeric, debut_le timestamptz, fin_prevue_le timestamptz, jour integer, gains_eur numeric, depense_eur numeric, statut text'],
}
const LISTE_REGLAGES = {
  station_reglages_lire: ['', 'version integer, reglages jsonb, modifie_par uuid, modifie_le timestamptz'],
  station_reglages_ecrire: ['p_reglages jsonb, p_auteur uuid, p_version integer', 'integer'],
  pilotage_radar: ['', 'jsonb'],
  pilotage_prospects_departements: ['', 'departement text, trouves integer, contactes integer, oui integer'],
  pilotage_activite_salles: ['p_depuis timestamptz', 'salle text, minutes integer'],
}
const SALLES = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
const CLES_REGLAGES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage']
const MIGRATIONS = {
  lecture: { p: 'SQ', fiche: '026-076', suffixe: 'pilotage_lecture', apres: 99, fonctions: LISTE_LECTURE, prefixe: 'pilotage_', ecrivains: ['pilotage_code_publier'], tables: ['ops.code_etat'] },
  echanges: { p: 'SE', fiche: '026-079', suffixe: 'pilotage_echanges', apresFichier: 'acquisition_echanges', fonctions: LISTE_ECHANGES, prefixe: 'pilotage_', ecrivains: [], tables: [] },
  station: { p: 'SS', fiche: '026-088', suffixe: 'pilotage_station', apresFichier: 'pilotage_echanges', fonctions: LISTE_STATION, prefixe: 'station_', ecrivains: Object.keys(LISTE_STATION).slice(0, 10), tables: ['ops.reunions', 'ops.experiences'] },
  reglages: { p: 'SR', fiche: '026-175', suffixe: 'station_reglages', apresFichier: 'pilotage_station', fonctions: LISTE_REGLAGES, prefixe: null, ecrivains: ['station_reglages_ecrire'], tables: ['ops.station_reglages', 'ops.station_reglages_historique'] },
}
const M = MIGRATIONS[MIG]
const ORDRE = {
  lecture: ['SQ-1', 'SQ-2', 'SQ-3', 'SQ-4', 'SQ-5', 'SQ-6', 'SQ-7', 'SQ-8', 'SQ-9', 'SQ-10'],
  echanges: ['SE-1', 'SE-2', 'SE-3', 'SE-4', 'SE-5', 'SE-6', 'SE-7', 'SE-8', 'SE-9', 'SE-10', 'SE-12'],
  station: ['SS-1', 'SS-2', 'SS-3', 'SS-4', 'SS-5', 'SS-6', 'SS-7', 'SS-8', 'SS-9', 'SS-10', 'SS-11', 'SS-13', 'SS-14', 'SS-15'],
  reglages: ['SR-1', 'SR-2', 'SR-3', 'SR-4', 'SR-5', 'SR-6', 'SR-7', 'SR-8', 'SR-9'],
}[MIG]
const REELS = { lecture: 'SQ-11', echanges: 'SE-11', station: 'SS-12', reglages: 'SR-10' }

// ── La racine jugée ──────────────────────────────────────────────────────────────────────────────────────────────────────
let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  try { TEMOIN = arbreTemoin(JUGE, { base: BASE, chemins: ['supabase'] }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const DM = path.join(RAC, 'supabase', 'migrations'), DC = path.join(RAC, 'supabase', 'controles')
const listerMig = () => (fs.existsSync(DM) ? fs.readdirSync(DM) : [])
const numero = (f) => Number(/^(\d+)_/.exec(f)?.[1] ?? NaN)
const trouver = (suffixe) => listerMig().filter((f) => new RegExp(`^0\\d+_${suffixe}\\.sql$`).test(f))

// ── Analyse d'une migration ──────────────────────────────────────────────────────────────────────────────────────────────
const TYPES = [[/^(int|int4|integer)$/, 'integer'], [/^(int8|bigint)$/, 'bigint'], [/^(bool|boolean)$/, 'boolean'], [/^(timestamptz|timestamp with time zone)$/, 'timestamptz'], [/^numeric(\(.*\))?$/, 'numeric'], [/^(text|varchar(\(.*\))?|character varying(\(.*\))?)$/, 'text']]
function normType(t) {
  let x = String(t).toLowerCase().replace(/\s+/g, ' ').replace(/^(public|pg_catalog)\./, '').trim()
  const tab = x.endsWith('[]')
  if (tab) x = x.slice(0, -2).trim()
  for (const [re, v] of TYPES) if (re.test(x)) { x = v; break }
  return tab ? `${x}[]` : x
}
const lireListe = (s) => (s ? s.split(/,\s*(?=\w+ )/).map((x) => { const m = /^(\w+) (.+?)(?: default (.+))?$/.exec(x.trim()); return { nom: m[1], type: normType(m[2]), defaut: m[3] ?? null } }) : [])
function lireParametre(t) {
  const n = normaliser(t)
  const m = /^(?:(in|out|inout) )?(\w+) (.+?)(?:(?: default |\s*=\s*)(.+))?$/.exec(n)
  return m ? { nom: m[2], type: normType(m[3]), defaut: m[4] ? m[4].trim() : null } : { nom: n, type: '?', defaut: null }
}
function lireFonction(st) {
  const mq = masquer(st)
  const i = mq.indexOf('('), j = fermante(mq, i)
  const tete = normaliser(st.slice(0, i))
  const nomQ = /function ([\w.]+)$/.exec(tete)?.[1] ?? '?'
  const [schema, nom] = nomQ.includes('.') ? nomQ.split('.') : [null, nomQ]
  const params = decouperVirgules(st.slice(i + 1, j)).filter(Boolean).map(lireParametre)
  const apres = st.slice(j + 1)
  const segs = segments(apres)
  const corpsSeg = segs.find((s) => s.type === 'dollar')
  const corps = corpsSeg ? corpsSeg.corps : ''
  const horsCorps = segs.filter((s) => s !== corpsSeg).map((s) => s.texte).join(' ')
  const attributs = normaliser(horsCorps)
  let colonnes = null, rend = null
  const mt = /^\s*returns\s+(setof\s+)?table\s*\(/i.exec(apres)
  if (mt) {
    const ma = masquer(apres), k = ma.indexOf('(', mt.index), l = fermante(ma, k)
    colonnes = decouperVirgules(apres.slice(k + 1, l)).map((c) => { const m = /^(\w+)\s+([\s\S]+)$/.exec(normaliser(c)); return m ? { nom: m[1], type: normType(m[2]) } : { nom: c, type: '?' } })
  } else {
    const mr = /^returns (setof )?(.+?)(?= language | as | security | stable| volatile| immutable| set | strict| called | parallel | cost |$)/.exec(attributs)
    rend = mr ? normType(mr[2]) : null
  }
  return { nom, schema, params, colonnes, rend, corps, attributs, texte: st }
}
function analyser(texte) {
  const ins = instructions(texte)
  const A = { ins, fonctions: new Map(), doublons: [], droits: [], tables: new Map(), rls: new Set(), revoqueTables: new Map(), politiques: [], extensions: [], drops: [], grantsAutres: [], index: [], inserts: [], cron: [], comments: 0, inconnues: [] }
  ins.forEach((st, rang) => {
    const n = normaliser(st)
    let m
    if (/^create (or replace )?function /.test(n)) { const f = lireFonction(st); f.rang = rang; if (A.fonctions.has(f.nom)) A.doublons.push(f.nom); A.fonctions.set(f.nom, f) }
    else if ((m = /^(revoke|grant) ([\w, ]+?) on function ([\w.]+)\(([^)]*)\) (from|to) (.+)$/.exec(n))) {
      const nom = m[3].replace(/^public\./, '')
      const sig = m[4].trim() ? m[4].split(',').map((x) => { const t = x.trim().split(' '); return normType(t.length > 1 && /^p_/.test(t[0]) ? t.slice(1).join(' ') : t.join(' ')) }) : []
      A.droits.push({ verbe: m[1], quoi: m[2].trim(), nom, schema: m[3].includes('.') ? m[3].split('.')[0] : null, sig, roles: m[6].split(',').map((x) => x.trim()), rang })
      if (m[1] === 'grant' && m[6].split(',').map((x) => x.trim()).some((r) => r !== 'service_role')) A.grantsAutres.push(n)
    } else if ((m = /^create table if not exists ([\w.]+)\(/.exec(n))) A.tables.set(m[1], { texte: st, norm: n, rang })
    else if ((m = /^alter table (?:only )?([\w.]+) enable row level security$/.exec(n))) A.rls.add(m[1])
    else if ((m = /^revoke all(?: privileges)? on (?:table )?([\w., ]+?) from (.+)$/.exec(n))) { for (const t of m[1].split(',').map((x) => x.trim())) A.revoqueTables.set(t, m[2].split(',').map((x) => x.trim())) }
    else if (/^create policy\b/.test(n)) A.politiques.push(n)
    else if (/^create extension\b/.test(n)) A.extensions.push(n)
    else if (/^drop\b/.test(n)) A.drops.push(n)
    else if (/^grant\b/.test(n)) A.grantsAutres.push(n)
    else if (/^create (unique )?index /.test(n)) A.index.push({ texte: st, norm: n })
    else if (/^insert into ops\.agents\b/.test(n)) A.inserts.push({ texte: st, norm: n })
    else if (/^select cron\.(un)?schedule\(/.test(n) || (/^do \$/.test(n) && /cron\.unschedule/.test(n))) A.cron.push(n)
    else if (/^comment on /.test(n)) A.comments++
    else A.inconnues.push(court(n, 90))
  })
  return A
}
const compacterCorps = (f) => compacter(f?.corps ?? '')
const serrerCorps = (f) => serrer(f?.corps ?? '')

// ── Les fichiers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let S = null
const P = (n) => `${M.p}-${n}`
const candidats = trouver(M.suffixe)
const FICHIER = candidats.length === 1 ? candidats[0] : null
const N = FICHIER ? /^(\d+)_/.exec(FICHIER)[1] : null
const CHEMINS = FICHIER ? {
  migration: path.join(DM, FICHIER), jumeau: path.join(DM, `_A_COLLER_sql_editor_${N}.sql`), nu: path.join(DM, `_A_COLLER_sql_editor_${N}_NU.sql`),
  controle: path.join(DC, `${N}_${M.suffixe}.sql`),
} : null
const TEXTE = FICHIER ? lf(fs.readFileSync(CHEMINS.migration, 'utf8')) : ''
const A = FICHIER ? analyser(TEXTE) : null
const F = (nom) => A?.fonctions.get(nom) ?? null
const NOMS = Object.keys(M.fonctions)
const LECTEURS = NOMS.filter((n) => !M.ecrivains.includes(n))

// ── --generer-essai ──────────────────────────────────────────────────────────────────────────────────────────────────────
if (GENERER) {
  if (!FICHIER || !fs.existsSync(CHEMINS.nu)) { console.log(`❌ ${P(1)} jumeau nu de *_${M.suffixe}.sql introuvable : rien à essayer`); process.exit(1) }
  const avec = (o.valeurs.avec ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const nus = []
  for (const n of avec) {
    if (!/^\d{4}$/.test(n)) refuser(`--avec : « ${n} » n'est pas un numéro de migration à quatre chiffres`)
    const f = path.join(DM, `_A_COLLER_sql_editor_${n}_NU.sql`)
    if (!fs.existsSync(f)) refuser(`--avec=${n} : ${path.relative(RAC, f)} introuvable`)
    nus.push(jumeauNuCoupe(f))
  }
  const courant = jumeauNuCoupe(CHEMINS.nu)
  nus.push(courant)
  const bloc = blocEssai({ nus, scenario: SCENARIOS[MIG], empreinte: empreinte(courant) })
  const a = analyserEssai(bloc, { nus })
  if (!a.ok) { console.error(`${JUGE} : bloc d'essai refusé — ${a.raisons.join(' ; ')}`); process.exit(1) }
  const dest = exigerSousTravail(path.join(TRAVAIL, JUGE, `essai-${MIG}.sql`))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, bloc)
  process.stdout.write(bloc)
  console.error(`-- ${a.octets} octets, ${a.charges} jumeau(x) ; écrit aussi dans ${path.relative(R, dest)}. Après l'essai : ${APRES[MIG]}`)
  process.exit(0)
}

S = creerSortie(`${JUGE} --migration=${MIG}`, [...ORDRE, ...(REEL ? [REELS[MIG]] : [])], `${JUGE} --migration=${MIG} (fiche ${M.fiche}) — racine ${RAC}${TEMOIN ? ` — témoin du lot b posé sur supabase/ de ${BASE.slice(0, 7)}` : ''} — base ${BASE.slice(0, 7)}${o.valeurs.racine || TEMOIN ? ' — lecture statique et compte rendu (--reel jamais sur une racine)' : ''}`)

// ── Critères communs ─────────────────────────────────────────────────────────────────────────────────────────────────────
const PERMIS = [
  /^create table if not exists ops\.\w+\(/, /^create (unique )?index (if not exists )?\w+ on ops\.\w+/, /^alter table (only )?ops\.\w+ enable row level security$/,
  /^revoke all( privileges)? on (table )?ops\.[\w., ]+ from /, /^revoke all( privileges)? on function public\.\w+\(/, /^grant execute on function public\.\w+\([^)]*\) to service_role$/,
  /^create or replace function public\.\w+\(/, /^comment on (table|function|column) /,
]
const PERMIS_STATION = [/^insert into ops\.agents\b/, /^select cron\.(un)?schedule\(/, /^do \$\w*\$/]
function critereFichier() {
  const e = []
  if (candidats.length !== 1) { S.juger(P(1), [candidats.length ? `${candidats.length} fichiers *_${M.suffixe}.sql (${candidats.join(', ')}), un seul attendu` : `supabase/migrations/0*_${M.suffixe}.sql absent`], ''); return false }
  if (!TEXTE.trim()) e.push(`${FICHIER} vide`)
  const n = Number(N)
  if (M.apres && !(n > M.apres)) e.push(`numéro ${N} : il doit dépasser 00${M.apres} (migrations du bus 0096 à 0099)`)
  if (M.apresFichier) for (const f of trouver(M.apresFichier)) if (!(n > numero(f))) e.push(`numéro ${N} : il doit dépasser celui de ${f}`)
  if (A.politiques.length) e.push(`create policy interdit (${A.politiques.length})`)
  if (A.extensions.length) e.push('create extension interdit')
  if (A.drops.length) e.push(`drop interdit : ${court(A.drops[0], 80)}`)
  if (A.grantsAutres.length) e.push(`grant à un autre rôle que service_role : ${court(A.grantsAutres[0], 90)}`)
  const permis = MIG === 'station' ? [...PERMIS, ...PERMIS_STATION] : PERMIS
  const hors = A.ins.map((st) => normaliser(st)).filter((n2) => !permis.some((re) => re.test(n2)))
  if (hors.length) e.push(`instruction(s) hors du point 1 : ${hors.slice(0, 2).map((h) => `« ${court(h, 70)} »`).join(', ')}`)
  if (MIG === 'station') for (const c of A.cron) if (/\bdrop\b/.test(c) && !/cron\.unschedule/.test(c)) e.push('drop hors cron.unschedule')
  if (MIG === 'echanges' && /pilotage_lot_du_jour/.test(compacter(TEXTE))) e.push('pilotage_lot_du_jour cité')
  S.juger(P(1), e, `${FICHIER} (${A.ins.length} instructions, toutes permises : tables fermées, fonctions, droits, commentaires${MIG === 'station' ? ', graine et passages pg_cron' : ''})`)
  return !e.length
}
function critereSignatures(id, { interdits = [] } = {}) {
  const e = []
  for (const [nom, [params, ret]] of Object.entries(M.fonctions)) {
    const f = F(nom)
    if (!f) { e.push(`${nom} absente`); continue }
    if (f.schema !== 'public') e.push(`${nom} : schéma ${f.schema ?? 'implicite'}, public. attendu`)
    const attendus = lireListe(params)
    const vus = f.params.map((p) => `${p.nom} ${p.type}${p.defaut !== null ? ` default ${p.defaut}` : ''}`).join(', ')
    const voulu = attendus.map((p) => `${p.nom} ${p.type}${p.defaut !== null ? ` default ${p.defaut}` : ''}`).join(', ')
    if (vus !== voulu) e.push(`${nom}(${vus}) : (${voulu}) attendu`)
    if (ret.includes(' ')) {
      const cols = lireListe(ret).map((c) => `${c.nom} ${c.type}`).join(', ')
      const vu = f.colonnes ? f.colonnes.map((c) => `${c.nom} ${c.type}`).join(', ') : `returns ${f.rend}`
      if (vu !== cols) e.push(`${nom} rend table(${vu}), table(${cols}) attendu`)
    } else if (f.colonnes || f.rend !== normType(ret)) e.push(`${nom} rend ${f.colonnes ? 'une table' : f.rend}, ${ret} attendu`)
  }
  const autres = [...A.fonctions.keys()].filter((n) => !NOMS.includes(n) && (M.prefixe ? n.startsWith(M.prefixe) : true))
  if (autres.length) e.push(`fonction(s) hors contrat : ${autres.join(', ')}`)
  if (A.doublons.length) e.push(`fonction(s) définie(s) deux fois : ${A.doublons.join(', ')}`)
  for (const x of interdits) if (compacter(TEXTE).includes(x.toLowerCase())) e.push(`${x} présent`)
  S.juger(id, e, `les ${NOMS.length} fonctions du contrat, paramètres et colonnes dans l'ordre, types compatibles ; aucune autre${interdits.length ? ` ; ni ${interdits.join(', ni ')}` : ''}`)
}
function critereSecurite(id, { toutesStables = false } = {}) {
  const e = []
  for (const nom of NOMS) {
    const f = F(nom)
    if (!f) { e.push(`${nom} absente`); continue }
    if (!/\bsecurity definer\b/.test(f.attributs)) e.push(`${nom} sans security definer`)
    if (!/\bset search_path (=|to) ops, public, pg_temp\b/.test(f.attributs)) e.push(`${nom} : search_path « ops, public, pg_temp » absent (pg_temp en dernier)`)
    if (toutesStables && !/\bstable\b/.test(f.attributs)) e.push(`${nom} n'est pas stable`)
    const sig = f.params.map((p) => p.type).join(',')
    const droits = A.droits.filter((d) => d.nom === nom && d.sig.join(',') === sig)
    const rev = droits.find((d) => d.verbe === 'revoke' && ['public', 'anon', 'authenticated'].every((r) => d.roles.includes(r)))
    const gr = droits.find((d) => d.verbe === 'grant' && /execute/.test(d.quoi) && d.roles.length === 1 && d.roles[0] === 'service_role')
    if (!rev) e.push(`${nom}(${sig}) : « revoke all … from public, anon, authenticated » absent`)
    else if (rev.rang < f.rang) e.push(`${nom} : le revoke précède la fonction`)
    if (!gr) e.push(`${nom}(${sig}) : « grant execute … to service_role » absent`)
    else if (gr.rang < f.rang) e.push(`${nom} : le grant précède la fonction`)
    if (droits.some((d) => d.verbe === 'grant' && d.roles.some((r) => r !== 'service_role'))) e.push(`${nom} : exécution accordée à un autre rôle que service_role`)
  }
  for (const t of M.tables) {
    if (!A.tables.has(t)) { e.push(`${t} absente (create table if not exists)`); continue }
    if (!A.rls.has(t)) e.push(`${t} sans enable row level security`)
    const rv = A.revoqueTables.get(t)
    if (!rv || !['public', 'anon', 'authenticated', 'service_role'].every((r) => rv.includes(r))) e.push(`${t} : revoke all des quatre rôles (public, anon, authenticated, service_role) absent`)
  }
  if (A.politiques.length) e.push('une politique existe')
  S.juger(id, e, `${NOMS.length} fonctions security definer, search_path ops, public, pg_temp, revoke des trois rôles puis grant execute à service_role seul${toutesStables ? ', toutes stable' : ''}${M.tables.length ? ` ; ${M.tables.join(', ')} sous RLS, revoke des quatre rôles, aucune politique` : ''}`)
}
const RE_ECRIT = /\b(insert|update|delete)\b/
function critereLectureSeule(id, noms, { appelsInterdits = /\bops_\w+\s*\(/ } = {}) {
  const e = []
  for (const nom of noms) {
    const f = F(nom)
    if (!f) { e.push(`${nom} absente`); continue }
    if (!/\bstable\b/.test(f.attributs)) e.push(`${nom} n'est pas stable`)
    const code = codeSeul(f.corps)
    if (RE_ECRIT.test(code)) e.push(`${nom} écrit (${RE_ECRIT.exec(code)[1]})`)
    const ap = appelsInterdits.exec(code)
    if (ap) e.push(`${nom} appelle ${court(ap[0], 40)}`)
  }
  S.juger(id, e, `${noms.length} lectures stable, sans insert, update ni delete, sans appel à une fonction qui écrit`)
}
/** regles : [nom de fonction | '*', expression sur la forme compacte (ou serrée si { serre: true }), libellé, { absent }] */
function critereMotifs(id, regles, detail) {
  const e = []
  for (const [nom, re, quoi, opts = {}] of regles) {
    const cibles = nom === '*' ? [...A.fonctions.values()] : [F(nom)]
    if (cibles.some((f) => !f)) { e.push(`${nom} absente`); continue }
    const vu = nom === '*' ? cibles.some((f) => re.test(opts.serre ? serrerCorps(f) : compacterCorps(f))) : re.test(opts.serre ? serrerCorps(cibles[0]) : compacterCorps(cibles[0]))
    if (opts.absent ? vu : !vu) e.push(`${nom === '*' ? 'une fonction' : nom} : ${quoi}`)
  }
  S.juger(id, e, detail)
}
const RE_COL_PERSO = /^(email\w*|tel\w*|siren|instagram|page_meta|nom_affiche|destinataire|entreprise)$/
// Les mots nominatifs se cherchent SEGMENT PAR SEGMENT (contre-vérification du 27/09, SR-7) : en JavaScript `\b` ne coupe pas
// sur `_`, donc /\bnom\b/ ne voyait ni `nom_affiche` ni `prenom_contact`. Chaque identifiant hors chaînes ET chaque clé lue
// dans un jsonb (`->'…'`, `->>'…'`, que le retrait des chaînes effaçait) est encadré de `_` puis comparé à `_mot_` :
// `p.nom_affiche`, `adresse_facturation`, `p.faits->>'nom_entreprise'` sont vus ; `nombre`, `contactes` ne le sont pas.
const MOTS_NOMINATIFS = ['nom', 'prenom', 'email', 'mail', 'telephone', 'tel', 'entreprise', 'raison_sociale', 'domaine', 'siren', 'siret', 'adresse', 'page_meta', 'instagram', 'destinataire']
function motsNominatifs(sql) {
  const cles = [...sql.matchAll(/->>?\s*'((?:[^']|'')*)'/g)].map((m) => m[1])
  const idents = sql.replace(/'(?:[^']|'')*'/g, ' ').match(/[a-z_][a-z0-9_]*/gi) ?? []
  const vus = new Set()
  for (const x of [...idents, ...cles]) {
    const t = `_${x.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_`
    if (MOTS_NOMINATIFS.some((m) => t.includes(`_${m}_`))) vus.add(x)
  }
  return [...vus]
}
function critereDonnees(id, { noms = NOMS, tablesInterdites = ['prospects', 'envois', 'reponses'], colonnesEnPlus = [], texteInterdit = false } = {}) {
  const e = []
  for (const nom of noms) {
    const f = F(nom)
    if (!f) { e.push(`${nom} absente`); continue }
    const s = serrer(codeSeul(f.corps).replace(/''/g, ' '))
    for (const t of tablesInterdites) if (new RegExp(`\\b(from|join) (ops\\.)?${t}\\b`).test(s)) e.push(`${nom} lit ops.${t}`)
    for (const c of f.colonnes ?? []) if (RE_COL_PERSO.test(c.nom) || colonnesEnPlus.includes(c.nom) || (texteInterdit && /^texte/.test(c.nom))) e.push(`${nom} rend la colonne ${c.nom}`)
    if (texteInterdit && /\b(destinataire|entreprise|texte)\b/.test(s)) e.push(`${nom} sélectionne ${/\b(destinataire|entreprise|texte)\b/.exec(s)[1]}`)
  }
  return e
}
function critereJumeaux(id, { couverture }) {
  const e = []
  const rel = (f) => path.relative(RAC, f).split(path.sep).join('/')
  for (const f of [CHEMINS.jumeau, CHEMINS.nu, CHEMINS.controle]) if (!fs.existsSync(f)) e.push(`${rel(f)} absent`)
  if (!e.length) {
    // Le nu porte le contrôle en pied (après MARQUE_CONTROLE) : sql-nu --verifier compare le nu COUPÉ à la marque.
    const coupe = exigerSousTravail(path.join(TRAVAIL, JUGE, `nu-coupe-${MIG}.sql`))
    fs.mkdirSync(path.dirname(coupe), { recursive: true })
    fs.writeFileSync(coupe, jumeauNuCoupe(CHEMINS.nu))
    for (const [f, nom] of [[CHEMINS.jumeau, path.basename(CHEMINS.jumeau)], [coupe, `${path.basename(CHEMINS.nu)} coupé à la marque`]]) {
      const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'sql-nu.mjs'), '--verifier', CHEMINS.migration, f], { cwd: R, encoding: 'utf8', timeout: 60_000, windowsHide: true })
      if (r.status !== 0) e.push(`sql-nu --verifier ${nom} : ${court((r.stdout || r.stderr).replace(/\S*[\\/]/g, ''), 140)}`)
    }
    const nu = lf(fs.readFileSync(CHEMINS.nu, 'utf8'))
    const [avant, ...apres] = nu.split(MARQUE_CONTROLE)
    const a = instructions(TEXTE).map(normaliser), b = instructions(avant).map(normaliser)
    if (a.length !== b.length || a.some((x, k) => x !== b[k])) e.push(`le nu coupé à la marque ne porte pas les mêmes instructions que ${FICHIER} (découpage du juge : ${b.length} contre ${a.length})`)
    const controle = lf(fs.readFileSync(CHEMINS.controle, 'utf8')).trim()
    if (apres.length !== 1) e.push(`MARQUE_CONTROLE figure ${apres.length} fois dans le nu, une attendue`)
    else if (apres[0].trim() !== controle) e.push('ce qui suit MARQUE_CONTROLE dans le nu n’est pas exactement le contrôle')
    const ic = instructions(controle)
    if (!ic.length) e.push('contrôle vide')
    for (const st of ic) if (!/^(select|with)\b/.test(normaliser(st))) e.push(`contrôle : instruction qui n'est pas une lecture « ${court(normaliser(st), 60)} »`)
    const cs = codeSeul(controle)
    const ecrit = /\b(insert|update|delete|create|alter|drop|grant|revoke|truncate|call|perform|copy|do|set)\b/.exec(cs)
    if (ecrit) e.push(`contrôle : « ${ecrit[1]} » hors des chaînes`)
    const bas = controle.toLowerCase()
    const manque = couverture.filter((x) => !(Array.isArray(x) ? x.some((y) => bas.includes(y)) : bas.includes(x)))
    if (manque.length) e.push(`le contrôle ne couvre pas : ${manque.map((x) => (Array.isArray(x) ? x.join(' ou ') : x)).join(', ')}`)
  }
  S.juger(id, e, `jumeaux _A_COLLER_sql_editor_${N}.sql et _NU.sql équivalents (sql-nu --verifier et découpage du juge), le contrôle exactement après la marque, en lecture seule, qui couvre le point 3`)
}
const CR_DEFAUT = () => path.join(RAC, '.orchestre', 'preuves', M.fiche, 'essai-a-sec.txt')
function critereEssai(id, { filtre = () => true, libelle = 'scénario' } = {}) {
  const e = []
  const f = o.valeurs.essai ? path.resolve(RAC, o.valeurs.essai) : CR_DEFAUT()
  if (!fs.existsSync(CHEMINS.nu)) { S.juger(id, [`jumeau nu absent : empreinte impossible`], ''); return }
  const toutes = clesScenario(SCENARIOS[MIG])
  const cles = toutes.filter(filtre)
  if (!cles.length) e.push('aucune clé dans le scénario du juge')
  const c = lireCompteRendu(f, { empreinte: empreinte(jumeauNuCoupe(CHEMINS.nu)), cles })
  e.push(...c.raisons)
  S.juger(id, e, `${path.relative(RAC, f).split(path.sep).join('/')} : ESSAI_A_SEC à l'empreinte du nu courant, APRES rien_ne_reste=true, ${cles.length} clé(s) du ${libelle} à true`)
}
function critereNonRegression(id) {
  const e = []
  const propres = new Set(Object.values(CHEMINS ?? {}).map((f) => path.relative(RAC, f).split(path.sep).join('/')))
  let n = 0
  // Un seul ls-tree : l'empreinte de blob de chaque fichier (fins de ligne ramenées à LF) se compare à celle du commit ; le
  // contenu du commit n'est relu (git show) que si elles diffèrent, pour trancher une différence de fins de ligne.
  const t = git(['ls-tree', '-r', '--full-tree', BASE, '--', 'supabase/migrations', 'supabase/controles'])
  if (t.code !== 0) e.push(`git ls-tree ${BASE.slice(0, 7)} : ${court(t.stderr)}`)
  for (const l of t.stdout.split(/\r?\n/).filter(Boolean)) {
    const m = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(l)
    if (!m) continue
    const rel = m[2]
    if (propres.has(rel)) continue
    n++
    const f = path.join(RAC, rel)
    if (!fs.existsSync(f)) { e.push(`${rel} supprimé`); continue }
    const ici = lf(fs.readFileSync(f, 'utf8'))
    if (shaBlob(Buffer.from(ici, 'utf8')) !== m[1] && lf(lireBase(BASE, rel) ?? '') !== ici) e.push(`${rel} modifié`)
  }
  if (!n && !e.length) e.push(`aucun fichier sous supabase/ dans ${BASE.slice(0, 7)} : la comparaison ne prouverait rien`)
  const j = spawnSync(process.execPath, [path.join(R, 'scripts', 'migrations-jumelles-e2e.mjs')], { cwd: RAC, encoding: 'utf8', timeout: 180_000, maxBuffer: 64 << 20, windowsHide: true })
  const bilan = (j.stdout || '').split('\n').map((l) => l.trim()).filter((l) => /réussis, \d+ échoués/.test(l)).at(-1) || ''
  if (j.status !== 0) e.push(`migrations-jumelles-e2e.mjs en code ${j.status} : ${court((j.stdout || '').split('\n').find((l) => l.includes('❌')) || j.stderr || bilan, 140)}`)
  S.juger(id, e.length > 6 ? [...e.slice(0, 5), `… (${e.length} défauts)`] : e, `${n} migrations, jumeaux et contrôles de ${BASE.slice(0, 7)} présents et inchangés ; migrations-jumelles-e2e.mjs vert (${court(bilan.replace(/^✅\s*/, ''), 50)})`)
}

// ── Les cahiers ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const borne = (min, max) => new RegExp(`greatest\\(${min},least\\(.*${max}\\)|least\\(greatest\\(${min},.*\\),${max}\\)|least\\(.*,${max}\\).*greatest\\(${min},|greatest\\(${min},.*least\\(.*${max}`)
const couvertureBase = (tables) => [...NOMS, 'prosecdef', ['proconfig', 'search_path'], 'anon', 'authenticated', 'service_role', ...tables, ...(tables.length ? [['relrowsecurity', 'row level'], 'pg_policies'] : [])]
function cahierLecture() {
  critereSignatures('SQ-2')
  critereSecurite('SQ-3')
  critereLectureSeule('SQ-4', LECTEURS)
  critereMotifs('SQ-5', [
    ['pilotage_decisions', /statut='ouverte'/, "filtre statut = 'ouverte' absent"],
    ['pilotage_decisions', /orderbycoalesce\((\w+\.)?montant_cents,0\)desc(nullslast)?,(\w+\.)?echeance(asc)?(nullslast)?,(\w+\.)?cree_le/, 'tri montant (nul = 0) décroissant, échéance, création absent'],
    ['pilotage_decisions', borne(1, 100), 'limite bornée à 1-100 absente'],
    ['pilotage_agents', /date_trunc\('month',[^;]*attimezone'europe\/paris'/, "mois de Paris (date_trunc('month', … at time zone 'Europe/Paris')) absent"],
    ['pilotage_couts_modeles', /greatest\(p_debut,now\(\)-interval'400days'\)/, "p_debut borné à 400 jours (greatest(p_debut, now() - interval '400 days')) absent"],
    ['pilotage_couts_agents', /greatest\(p_depuis,now\(\)-interval'400days'\)/, 'p_depuis borné à 400 jours absent'],
    ['pilotage_evenements', /type<>'battement'/, "exclusion de type <> 'battement' absente"],
    ['pilotage_evenements', borne(1, 200), 'limite bornée à 200 absente'],
    ['pilotage_couts_taches', borne(1, 50), 'limite bornée à 50 absente'],
    ['pilotage_taches_agent', borne(1, 30), 'limite bornée à 30 absente'],
    ['pilotage_decisions_par_cles', /cardinality\(p_cles\)>20|p_cles\[1:20\]/, '20 clés au plus absent'],
  ], 'décisions ouvertes triées (montant nul compté 0, échéance, création), bornes 100 / 200 / 50 / 30 / 20 clés, mois de Paris, 400 jours')
  const code = A.tables.get('ops.code_etat'), pub = F('pilotage_code_publier')
  const e6 = []
  if (!code) e6.push('ops.code_etat absente')
  else {
    const c = compacter(code.texte)
    if (!/check\(id=1\)/.test(c)) e6.push('ops.code_etat sans check (id = 1)')
    if (!/idsmallintprimarykeydefault1/.test(c)) e6.push('ops.code_etat : id smallint primary key default 1 attendu')
    if (!/etatjsonbnotnull/.test(c)) e6.push('ops.code_etat : etat jsonb not null attendu')
  }
  if (!pub) e6.push('pilotage_code_publier absente')
  else {
    const c = compacterCorps(pub)
    if (!/jsonb_typeof\(p_etat\)(<>'object'|is(distinct|not)|='object')/.test(c) || !c.includes("'forme'")) e6.push("« forme » pour un non-objet (jsonb_typeof) absent")
    if (!/octet_length\(p_etat::text\)>20000/.test(c) || !c.includes("'trop_gros'")) e6.push('« trop_gros » au-delà de 20 000 octets (octet_length(p_etat::text) > 20000) absent')
    if (!/onconflict\(id\)doupdate/.test(c)) e6.push('remplacement de la ligne 1 (on conflict (id) do update) absent')
    if (!c.includes("'ok'")) e6.push('« ok » absent')
  }
  S.juger('SQ-6', e6, 'ops.code_etat : check (id = 1) ; pilotage_code_publier : forme, trop_gros au-delà de 20 000 octets, on conflict (id) do update, ok')
  const e7 = critereDonnees('SQ-7', { colonnesEnPlus: [] })
  for (const c of F('pilotage_taches_agent')?.colonnes ?? []) if (['preuve_url', 'charge'].includes(c.nom)) e7.push(`pilotage_taches_agent rend ${c.nom}`)
  S.juger('SQ-7', e7, 'aucune lecture de ops.prospects, ops.envois ni ops.reponses ; aucune colonne e-mail, téléphone, siren, instagram, page_meta, nom_affiche, destinataire ni entreprise ; ni preuve_url ni charge')
  critereJumeaux('SQ-8', { couverture: couvertureBase(['code_etat']) })
  critereEssai('SQ-9')
  critereNonRegression('SQ-10')
}
function cahierEchanges() {
  critereSignatures('SE-2', { interdits: ['pilotage_lot_du_jour', 'ops.pilotage_commande_du_prospect', 'pilotage_compteurs_boites', 'pilotage_jalon_date', 'pilotage_jalon('] })
  critereSecurite('SE-3', { toutesStables: true })
  critereLectureSeule('SE-4', NOMS, { appelsInterdits: /\b(acq_envoi_marquer|acq_envoi_preparer|acq_reponse_relayer|acq_reponse_classer|ops_(?!interrupteur\b)\w+)\s*\(/ })
  critereMotifs('SE-5', [
    ['pilotage_compteurs_du_jour', /acq_plafond_du_jour\(/, 'acq_plafond_du_jour( absent'],
    ['pilotage_compteurs_du_jour', /acq_envois_du_jour\(/, 'acq_envois_du_jour( absent'],
    ['pilotage_compteurs_du_jour', /count\(|from(ops\.)?envois\b/, 'recompte les envois (count( ou from ops.envois)', { absent: true }],
    ['pilotage_compteurs_technologies', /\b(from|join) (ops\.)?envois\b/, 'recompte les envois d’une technologie', { absent: true, serre: true }],
  ], 'un seul compteur : acq_plafond_du_jour et acq_envois_du_jour, aucun recompte des envois')
  const bornes = [
    ['pilotage_envois_du_jour', /limit(least\(\d+,)?300\b|limit300/, 'limite 300 absente'],
    ['pilotage_appels', borne(1, 20), 'limite bornée à 1-20 absente'],
    ['pilotage_bilan', borne(1, 200), 'p_n borné à 1-200 absent'],
    ['pilotage_atelier', /limit30\b/, 'limite 30 absente'],
    ['pilotage_reponses_recentes', borne(1, 10), 'limite bornée à 1-10 absente'],
    ['pilotage_entonnoir', /greatest\(p_depuis,now\(\)-interval'31days'\)/, 'pas au-delà de 31 jours'],
    ['pilotage_recettes_agents', /greatest\(p_depuis,now\(\)-interval'400days'\)/, 'pas au-delà de 400 jours'],
    ['pilotage_appels', /traitee_le/, 'cite traitee_le', { absent: true }],
    ['*', /matiere->>'siren'/, "matiere->>'siren' présent", { absent: true }],
    ['*', /2026-10-12|2026-11-02|2026-10-23|2026-11-05/, 'date littérale de bilan ou de jalon', { absent: true }],
    ['pilotage_entonnoir', /ops\.acq_commande_du_prospect\(/, 'vente sans ops.acq_commande_du_prospect('],
    ['pilotage_bilan', /ops\.acq_commande_du_prospect\(/, 'vente sans ops.acq_commande_du_prospect('],
    ['pilotage_tapis', /ops\.acq_commande_du_prospect\(/, 'paye / en_ligne sans ops.acq_commande_du_prospect('],
    ['pilotage_recettes_agents', /ops\.acq_commande_du_prospect\(/, 'agents sans ops.acq_commande_du_prospect('],
  ]
  const e6 = []
  const appels = F('pilotage_appels')
  if (appels && (compacterCorps(appels).match(/appel_rendu_leisnull/g) ?? []).length < 2) e6.push('pilotage_appels : appel_rendu_le is null sur ses DEUX sources attendu')
  for (const f of A.fonctions.values()) { const s = serrerCorps(f); if (/sites_commandes/.test(s) && /\bdomaine\b/.test(s)) e6.push(`${f.nom} compare domaine et sites_commandes`) }
  critereMotifs('SE-6', bornes, 'bornes 300 / 1-20 / 1-200 / 30 / 1-10, 31 et 400 jours ; appel_rendu_le is null sur les deux sources, jamais traitee_le ; ventes par ops.acq_commande_du_prospect ; aucune date littérale')
  if (e6.length) S.echoue('SE-6', e6.join(' ; '))
  const e7 = critereDonnees('SE-7', { noms: ['pilotage_envois_du_jour', 'pilotage_tapis', 'pilotage_recettes_agents', 'pilotage_atelier', 'pilotage_reponses_du_jour', 'pilotage_compteurs_du_jour', 'pilotage_compteurs_technologies'], tablesInterdites: [], texteInterdit: true })
  const rr = F('pilotage_reponses_recentes')
  for (const f of A.fonctions.values()) if (f !== rr && (f.colonnes ?? []).some((c) => /^texte|^reponse_envoyee$/.test(c.nom))) e7.push(`${f.nom} rend du texte`)
  S.juger('SE-7', e7, 'aucune donnée personnelle hors de sa place : seule pilotage_reponses_recentes rend du texte (texte_recu, reponse_envoyee)')
  critereJumeaux('SE-8', { couverture: couvertureBase([]) })
  critereEssai('SE-9')
  critereNonRegression('SE-10')
  const e12 = []
  const tete = TEXTE.split('\n').slice(0, 40).filter((l) => l.trim().startsWith('--')).join('\n')
  if (!/0111/.test(tete)) e12.push("l'en-tête ne dit pas que la migration s'applique après 0111")
  const sa = serrerCorps(appels)
  if (!/from ops\.rendez_vous\b/.test(sa)) e12.push('pilotage_appels sans from ops.rendez_vous')
  if (!/statut ?= ?'reserve'/.test(sa)) e12.push("pilotage_appels sans statut = 'reserve'")
  const sources = (f) => [...serrerCorps(f).matchAll(/\b(?:from|join) ([\w.]+)/g)].map((m) => m[1]).filter((t) => !/^(lateral|unnest|jsonb_\w+|generate_series)$/.test(t))
  const bd = F('pilotage_bilan_date')
  if (!bd) e12.push('pilotage_bilan_date absente')
  else { const s = sources(bd); if (!s.includes('ops.etat_envoi') || s.some((t) => t !== 'ops.etat_envoi')) e12.push(`pilotage_bilan_date lit ${s.join(', ') || 'rien'} : ops.etat_envoi seul attendu`) }
  const ee = F('pilotage_etat_envoi')
  if (!ee) e12.push('pilotage_etat_envoi absente')
  else {
    if (!/acq_etat_envoi\(\)/.test(compacterCorps(ee))) e12.push('pilotage_etat_envoi n’appelle pas acq_etat_envoi()')
    // la clé JSON 'technologies' que rend acq_etat_envoi() n'est pas une lecture de la table : entre apostrophes, elle ne compte pas ; une jointure, une virgule ou un sous-select sur la table, si
    if (sources(ee).some((t) => /^(ops\.)?(technologies|interrupteurs)$/.test(t)) || /(?<![\w'])(ops\.)?(technologies|interrupteurs)(?![\w'])/.test(serrerCorps(ee))) e12.push('pilotage_etat_envoi lit ops.technologies ou ops.interrupteurs elle-même')
  }
  if ((F('pilotage_bilan')?.params.length ?? 0) !== 1) e12.push('pilotage_bilan n’a pas exactement un paramètre')
  const code = compacter(TEXTE)
  for (const mot of ['boite', 'jalon']) if (code.includes(mot)) e12.push(`le texte (commentaires ôtés) contient « ${mot} »`)
  S.juger('SE-12', e12, "après 0111 (en-tête) ; pilotage_appels lit ops.rendez_vous (statut = 'reserve') ; pilotage_bilan_date ne lit que ops.etat_envoi ; pilotage_etat_envoi déplie acq_etat_envoi() ; ni boite ni jalon")
}
function listeSql(v) {
  const t = String(v ?? '').trim().replace(/::text\[\]$/, '')
  let m = /^'\{(.*)\}'$/.exec(t)
  if (m) return m[1].split(',').map((x) => x.trim().replace(/^"|"$/g, '')).filter(Boolean)
  m = /^array\[(.*)\]$/i.exec(t)
  if (m) return decouperVirgules(m[1]).map((x) => x.replace(/^'|'$/g, '')).filter(Boolean)
  return null
}
function cahierStation() {
  const e2 = []
  const reu = A.tables.get('ops.reunions'), exp = A.tables.get('ops.experiences')
  if (!reu) e2.push('ops.reunions absente')
  else {
    const c = compacter(reu.texte)
    if (!/check\(statutin\('ouverte','close','abandonnee'\)\)/.test(c)) e2.push("ops.reunions : check (statut in ('ouverte','close','abandonnee')) absent")
    if (!/check\(\(statut='ouverte'\)=\(close_leisnull\)\)/.test(c)) e2.push("ops.reunions : check ((statut = 'ouverte') = (close_le is null)) absent")
    if (!/check\(statut<>'close'orlignesisnotnull\)/.test(c)) e2.push("ops.reunions : check (statut <> 'close' or lignes is not null) absent")
    if (!/pg_column_size\(chiffres\)<=8192/.test(c)) e2.push('ops.reunions : chiffres ≤ 8 Ko absent')
    if (!/partextnotnulldefault'chef'referencesops\.agents\(nom\)ondeletecascade/.test(c)) e2.push("ops.reunions : par … references ops.agents(nom) on delete cascade absent")
  }
  if (!exp) e2.push('ops.experiences absente')
  else {
    const c = compacter(exp.texte)
    if (!/budget_eurnumeric\(8,2\)notnulldefault0check\(budget_eur=0\)/.test(c)) e2.push('ops.experiences : budget_eur numeric(8,2) not null default 0 check (budget_eur = 0) absent')
    if (!/check\(gains_eur>=0\)/.test(c) || !/check\(depense_eur>=0\)/.test(c)) e2.push('ops.experiences : bornes de gains ou de dépense absentes')
    if (!/check\(statutin\('en_cours','arretee','arretee_auto','gagnante'\)\)/.test(c)) e2.push('ops.experiences : check des statuts absent')
    if (!/check\(fin_prevue_le=debut_le\+interval'30days'\)/.test(c)) e2.push("ops.experiences : check (fin_prevue_le = debut_le + interval '30 days') absent")
  }
  const idx = A.index.map((x) => compacter(x.texte))
  if (!idx.some((c) => /^createuniqueindex.*onops\.reunions\(jour\)wherestatutin\('ouverte','close'\)$/.test(c))) e2.push("index unique partiel (jour) where statut in ('ouverte','close') absent")
  if (!idx.some((c) => /^createuniqueindex.*onops\.experiences\(\(true\)\)wherestatut='en_cours'$/.test(c))) e2.push("index unique partiel ((true)) where statut = 'en_cours' absent")
  if (e2.length) S.echoue('SS-2', e2.join(' ; '))
  critereSignatures('SS-2')
  critereSecurite('SS-3')
  critereLectureSeule('SS-4', ['station_reunion_chiffres', 'station_reunion_lire', 'station_objectif_actif', 'station_experience_etat'], { appelsInterdits: /\b(ops_\w+|station_(?!reunion_chiffres)\w+)\s*\(/ })
  critereMotifs('SS-5', [
    ...['station_consigne_transmettre', 'station_experience_lancer', 'station_experience_arreter'].flatMap((n) => [[n, /is_founder/, 'is_founder de p_auteur non lu'], [n, /'ops:auteur'/, 'ops:auteur non levé']]),
    ...['station_reunion_ouvrir', 'station_reunion_clore', 'station_reunion_abandonner'].flatMap((n) => [[n, /p_agent<>'chef'|p_agent='chef'|p_agentisdistinctfrom'chef'/, "p_agent comparé à 'chef' absent"], [n, n === 'station_reunion_abandonner' ? /'ops:agent'|returnfalse/ : /'ops:agent'/, 'ops:agent non levé']]),
    ...['station_pause_par_agent', 'station_consigne_par_agent'].flatMap((n) => [[n, /capacites/, 'capacité de p_agent non lue dans ops.agents'], [n, /'ops:agent'/, 'ops:agent non levé']]),
    ['*', /p_est_fondateur|p_fondateur/, 'un argument « est fondateur » passé par l’appelant', { absent: true }],
  ], 'fondateur lu dans artisans.is_founder (ops:auteur), chef comparé (ops:agent), capacités lues dans ops.agents pour le pont')
  critereMotifs('SS-6', [
    ['station_consigne_transmettre', /char_length\(.*\)(not)?between3and200|char_length\(.*\)<3.*>200/, 'texte de 3 à 200 signes absent'],
    ['station_consigne_transmettre', /(>=20|>19)(?!\d)/, 'quota de 20 par jour absent'],
    ['station_consigne_transmettre', /attimezone'europe\/paris'/, 'jour de Paris absent'],
    ['station_reunion_clore', /cardinality\(p_lignes\)(not)?between1and5|cardinality\(p_lignes\)>5/, '1 à 5 lignes absent'],
    ['station_reunion_clore', /140/, '140 signes au plus absent'],
    ['station_reunion_clore', /'@'|%@%/, 'refus de @ absent'],
    ['station_reunion_clore', /\[0-9\]\{9\}|\\d\{9\}/, 'refus de 9 chiffres de suite absent'],
    ['station_reunion_clore', /http/, 'refus de http absent'],
    ['station_reunion_clore', /cardinality\(p_idees\)>3/, '3 idées au plus absent'],
    ['station_reunion_clore', /\^chef:\\d\{4\}-\\d\{2\}-\\d\{2\}:idee-\[a-z0-9-\]\{3,75\}\$/, 'format chef:<date>:idee-… absent'],
    ['station_reunion_clore', /creee_par='chef'/, "idées créées par 'chef' absent"],
    ['station_reunion_clore', /'encaisse_eur','oui','contacts_froids','sites_en_ligne'/, 'mesures de l’objectif en liste fermée absentes'],
    ['station_reunion_ouvrir', /interval'30min(ute)?s?'/, '30 min avant l’abandon absent'],
    ['station_reunions_echues_abandonner', /interval'30min(ute)?s?'/, '30 min avant l’abandon absent'],
    ['station_experience_lancer', /statut<>'brouillon'/, "commande hors brouillon absente"],
    ['station_experience_lancer', /'ops:aucune_vente'/, 'ops:aucune_vente absent'],
    ['station_experience_etat', /least\(.*30\)/, 'jour borné à 30 absent'],
  ], 'consignes de 3 à 200 signes, 20 par jour de Paris ; 1 à 5 lignes de 140 signes, ni @, ni 9 chiffres, ni http ; 3 idées de chef ; mesures fermées ; 30 min ; aucune vente ; jour ≤ 30')
  const e7 = critereDonnees('SS-7', { colonnesEnPlus: ['texte'] })
  for (const f of A.fonctions.values()) {
    const s = serrerCorps(f)
    if (/\bresume\b/.test(s) && !/insert into (ops\.)?evenements|ops_evenement_ajouter/.test(s)) e7.push(`${f.nom} lit resume d'ops.evenements`)
  }
  const ch = F('station_reunion_chiffres')
  if (ch && /\bresume\b|\btexte\b|\bmotif\b/.test(serrerCorps(ch))) e7.push('station_reunion_chiffres émet un texte libre (resume, texte ou motif)')
  S.juger('SS-7', e7, 'aucune lecture de prospects, envois, réponses ; resume seulement écrit ; aucune colonne e-mail, téléphone, destinataire, entreprise ni texte ; chiffres sans texte libre')
  const ev = (n, types) => types.map((t) => [n, new RegExp(`'${t}'`), `événement ${t} non écrit`])
  critereMotifs('SS-8', [
    ...ev('station_consigne_transmettre', ['consigne']), ...ev('station_reunion_ouvrir', ['reunion_ouverte']), ...ev('station_reunion_clore', ['reunion_compte_rendu', 'reunion_close']),
    ...ev('station_reunion_abandonner', ['reunion_abandonnee']), ...ev('station_reunions_echues_abandonner', ['reunion_abandonnee']), ...ev('station_experience_lancer', ['experience_lancee']),
    ...ev('station_experience_arreter', ['experience_arretee']), ...ev('station_pause_par_agent', ['interrupteur']), ...ev('station_consigne_par_agent', ['consigne']),
    ...Object.keys(LISTE_STATION).slice(0, 10).map((n) => [n, /insertinto(ops\.)?evenements|ops_evenement_ajouter\(/, 'aucune insertion d’événement dans son corps']),
  ], 'chaque écriture insère son événement dans son propre corps')
  critereJumeaux('SS-9', { couverture: [...couvertureBase(['reunions', 'experiences']), 'cron.job', 'pont_telegram'] })
  critereEssai('SS-10', { filtre: (k) => !k.startsWith('ss15_') })
  critereNonRegression('SS-11')
  const ct = F('station_consigne_transmettre')
  const e13 = []
  if (!ct) e13.push('station_consigne_transmettre absente')
  else {
    const p = ct.params.find((x) => x.nom === 'p_agent')
    if (!p || p.type !== 'text' || p.defaut !== 'null') e13.push('paramètre p_agent text default null absent')
    const c = compacterCorps(ct)
    if (!c.includes("'fondateur'")) e13.push("objet 'fondateur' pour tout l'équipage absent")
    if (!/'agent:'\|\|p_agent/.test(c)) e13.push("objet 'agent:' || p_agent absent")
    if (!c.includes("'ops:agent_inconnu'")) e13.push('ops:agent_inconnu absent')
  }
  S.juger('SS-13', e13, "p_agent text default null ; objet 'fondateur' ou 'agent:<nom>' ; ops:agent_inconnu")
  const e14 = []
  const pa = F('station_pause_par_agent')
  if (pa) {
    const c = compacterCorps(pa)
    if (/actif=false|actif:=false|setactif=p_/.test(c)) e14.push('station_pause_par_agent affecte false (ou un paramètre) à actif')
    const upd = [...serrer(pa.corps).matchAll(/update (ops\.)?interrupteurs\b[^;]*/g)].map((m) => m[0])
    if (!upd.length) e14.push('station_pause_par_agent ne pose pas la pause')
    for (const u of upd) if (!/where nom ?= ?'pause_generale'/.test(u)) e14.push('une mise à jour d’interrupteurs hors pause_generale')
  } else e14.push('station_pause_par_agent absente')
  for (const n of ['station_consigne_transmettre', 'station_consigne_par_agent']) { const c = compacterCorps(F(n)); if (!/type='consigne'/.test(c) || !/attimezone'europe\/paris'/.test(c) || !/(>=20|>19)(?!\d)/.test(c)) e14.push(`${n} ne compte pas le quota commun (événements consigne du jour de Paris, 20)`) }
  const g = A.inserts.find((x) => /'pont_telegram'/.test(x.norm))
  if (!g) e14.push('graine pont_telegram absente')
  else {
    const mq = masquer(g.texte), i = mq.indexOf('('), j = fermante(mq, i)
    const cols = decouperVirgules(g.texte.slice(i + 1, j)).map((x) => normaliser(x))
    const k = mq.toLowerCase().indexOf('values'), i2 = mq.indexOf('(', k), j2 = fermante(mq, i2)
    const vals = decouperVirgules(g.texte.slice(i2 + 1, j2)).map((x) => x.trim())
    const v = Object.fromEntries(cols.map((c, n) => [c, vals[n]]))
    const cap = listeSql(v.capacites), ty = listeSql(v.types_crees ?? "'{}'"), tb = listeSql(v.tables_ecrites)
    if (!cap || cap.length !== 3 || !['notifier', 'pause', 'consigne'].every((x) => cap.includes(x))) e14.push(`capacités ${v.capacites} : exactement {notifier,pause,consigne} attendu`)
    if (!ty || ty.length) e14.push('pont_telegram crée des types')
    if (!tb || tb.length !== 1 || tb[0] !== 'evenements') e14.push('pont_telegram : tables_ecrites {evenements} seule attendue')
    if (String(v.plafond_euros_jour ?? '').trim() !== '0') e14.push('pont_telegram : plafond_euros_jour 0 attendu')
    if (!/on conflict/.test(g.norm)) e14.push('graine sans on conflict')
  }
  S.juger('SS-14', e14, "la pause n'est jamais levée et ne touche que pause_generale ; quota commun des consignes ; graine pont_telegram {notifier,pause,consigne}, sans type, evenements seule, plafond 0")
  critereEssai('SS-15', { filtre: (k) => k.startsWith('ss15_'), libelle: 'scénario du pont (ss15_)' })
}
function cahierReglages() {
  const sr = A.tables.get('ops.station_reglages'), hi = A.tables.get('ops.station_reglages_historique')
  const e2 = []
  if (!sr) e2.push('ops.station_reglages absente')
  else {
    const c = compacter(sr.texte)
    if (!/(cle|id)smallintprimarykeydefault1check\((cle|id)=1\)/.test(c)) e2.push('une seule ligne : clé constante 1 (primary key default 1 check (… = 1)) absente')
    for (const col of ['versionintegernotnull', 'reglagesjsonbnotnull', 'modifie_paruuid', 'modifie_letimestamptznotnull']) if (!c.includes(col)) e2.push(`colonne ${col} absente`)
  }
  S.juger('SR-2', e2, 'ops.station_reglages : une seule ligne (clé constante 1), version, reglages jsonb, modifie_par, modifie_le')
  const e3 = []
  if (!hi) e3.push('ops.station_reglages_historique absente')
  else { const c = compacter(hi.texte); for (const col of ['versioninteger', 'reglagesjsonb', 'auteuruuid', 'letimestamptz']) if (!c.includes(col)) e3.push(`historique : colonne ${col} absente`) }
  const ec = F('station_reglages_ecrire')
  const c3 = compacterCorps(ec)
  if (!/insertinto(ops\.)?station_reglages_historique/.test(c3)) e3.push('station_reglages_ecrire n’écrit pas l’historique')
  if (!/deletefrom(ops\.)?station_reglages_historique/.test(c3) || !/offset50|limit50|>50/.test(c3)) e3.push('purge des versions au-delà des 50 dernières absente')
  S.juger('SR-3', e3, "l'historique garde version, reglages, auteur, le ; purge au-delà des 50 dernières dans station_reglages_ecrire")
  critereSignatures('SR-4')
  critereSecurite('SR-4')
  const e5 = []
  if (!ec) e5.push('station_reglages_ecrire absente')
  else {
    const c = c3
    if (!c.includes("'ops:version_perimee'")) e5.push('ops:version_perimee absent')
    if (!c.includes("'ops:cle_inconnue'")) e5.push('ops:cle_inconnue absent')
    const liste = [...(ec.corps.matchAll(/'([a-z_]+)'/g))].map((m) => m[1]).filter((x) => CLES_REGLAGES.includes(x) || /^(theme|mise_en_page|nuit|equipage|salles|couleurs|affichage)$/.test(x))
    if (!CLES_REGLAGES.every((k) => liste.includes(k))) e5.push(`liste fermée des clés incomplète : ${CLES_REGLAGES.filter((k) => !liste.includes(k)).join(', ')}`)
    if (!c.includes("'ops:trop_gros'") || !/65536|64\*1024/.test(c)) e5.push('ops:trop_gros au-delà de 64 Ko absent')
    if (!c.includes("'ops:auteur'") || !c.includes('is_founder')) e5.push('fondateur (is_founder, ops:auteur) absent')
    if (!/jsonb_object_keys\(p_reglages\)/.test(c)) e5.push('clés de premier niveau non parcourues (jsonb_object_keys)')
  }
  S.juger('SR-5', e5, 'version périmée → ops:version_perimee ; clé hors de la liste fermée → ops:cle_inconnue ; plus de 64 Ko → ops:trop_gros ; fondateur')
  const e6 = []
  const ra = F('pilotage_radar')
  if (!ra) e6.push('pilotage_radar absente')
  else {
    const s = serrerCorps(ra)
    if (!/interval ?'12 hours?'|interval ?'12h'/.test(s)) e6.push('12 heures absentes')
    const nominatifs6 = motsNominatifs(s)
    if (nominatifs6.length) e6.push(`pilotage_radar lit une colonne nominative (${nominatifs6.join(', ')})`)
    if (!/date_trunc\('hour'/.test(s)) e6.push('requêtes par heure (date_trunc(\'hour\', …)) absentes')
    if (!/\bstable\b/.test(ra.attributs)) e6.push('pilotage_radar n’est pas stable')
  }
  S.juger('SR-6', e6, 'pilotage_radar : annonceurs du jour agrégés, requêtes Meta par heure sur 12 h, aucun nom de personne')
  const e7 = []
  const pd = F('pilotage_prospects_departements')
  if (!pd) e7.push('pilotage_prospects_departements absente')
  else {
    const s = serrerCorps(pd)
    if (!/group by/.test(s)) e7.push('pas de regroupement (group by)')
    const nominatifs7 = motsNominatifs(s)
    if (nominatifs7.length) e7.push(`lit une colonne nominative (${nominatifs7.join(', ')})`)
    if ((pd.colonnes ?? []).some((c) => RE_COL_PERSO.test(c.nom) || /nom|adresse/.test(c.nom))) e7.push('rend une colonne nominative')
  }
  S.juger('SR-7', e7, 'par département : trouvés, contactés, oui, agrégés ; jamais un nom, une entreprise ni une adresse')
  const e8 = []
  const as = F('pilotage_activite_salles')
  if (!as) e8.push('pilotage_activite_salles absente')
  else {
    const vues = new Set([...as.corps.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).filter((x) => SALLES.includes(x) || x === 'ecommerce'))
    if (vues.has('ecommerce') || /ecommerce/.test(as.corps)) e8.push('ecommerce cité')
    const manquent = SALLES.filter((x) => !vues.has(x))
    if (manquent.length) e8.push(`clés de SALLES absentes de la liste fermée : ${manquent.join(', ')}`)
    if (!/evenements/.test(serrerCorps(as))) e8.push('temps actif non calculé sur les événements')
  }
  S.juger('SR-8', e8, 'temps actif du jour par salle, calculé sur les événements, pour les vingt clés de SALLES seulement (jamais ecommerce)')
  critereEssai('SR-9')
  critereJumeaux('SR-1', { couverture: couvertureBase(['station_reglages', 'station_reglages_historique']) })
  critereNonRegression('SR-1')
}

// ── --reel : les fonctions appliquées, appelées par PostgREST ────────────────────────────────────────────────────────────
const NON_FONDATEUR = '00000000-0000-4000-8000-000000000000'
async function reel() {
  const id = REELS[MIG]
  if (o.valeurs.racine || TEMOIN) { S.echoue(id, '--reel se lance sur la racine réelle seulement'); return }
  lireEnvLocal(R)
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SB || !SVC || !ANON) { S.echoue(id, '.env.local sans NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY'); return }
  const appel = async (cle, nom, corps = {}) => {
    const r = await fetch(`${SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
    const t = await r.text()
    let j = null; try { j = JSON.parse(t) } catch { /* texte */ }
    return { status: r.status, j, t }
  }
  const e = [], vus = []
  const lectureOk = async (nom, corps, test = (j) => j !== null) => { const r = await appel(SVC, nom, corps); if (r.status !== 200 || !test(r.j)) e.push(`${nom} : ${r.status} ${court(r.t, 100)}`); else vus.push(nom); return r.j }
  const refusAnon = async (nom, corps) => { const r = await appel(ANON, nom, corps); if (!(r.status === 401 || r.status === 403 || r.j?.code === '42501')) e.push(`${nom} avec la clé anonyme : ${r.status}, refus attendu`) }
  const refusService = async (nom, corps, code) => { const r = await appel(SVC, nom, corps); if (r.status < 400 || !String(r.t).includes(code)) e.push(`${nom} : ${r.status} ${court(r.t, 90)}, refus ${code} attendu`) }
  const minuit = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString()
  try {
    if (MIG === 'lecture') {
      await lectureOk('pilotage_decisions', { p_limite: 5 }, Array.isArray)
      const ag = await lectureOk('pilotage_agents', {}, Array.isArray)
      const noms = new Set((ag ?? []).map((x) => x.nom))
      for (const n of ['systeme', 'a0', 'recenseur', 'standardiste', 'chef', 'livreur']) if (!noms.has(n)) e.push(`pilotage_agents() sans ${n}`)
      await lectureOk('pilotage_chef', {}, Array.isArray)
      await lectureOk('pilotage_couts_modeles', { p_debut: new Date(Date.now() - 86_400_000).toISOString() }, Array.isArray)
      await lectureOk('pilotage_attention_sources', {}, Array.isArray)
      await lectureOk('pilotage_evenements', { p_apres: null, p_limite: 10, p_agent: null, p_types: null }, Array.isArray)
      const avant = await lectureOk('pilotage_code_lire', {}, Array.isArray)
      for (const [n, c] of [['pilotage_decisions', { p_limite: 5 }], ['pilotage_agents', {}], ['pilotage_chef', {}], ['pilotage_code_lire', {}], ['pilotage_attention_sources', {}]]) await refusAnon(n, c)
      if (Array.isArray(avant) && avant.length) {
        const precedent = avant[0].etat
        try {
          const essai = { essai_pilotage_sql_qa: new Date().toISOString() }
          const p = await appel(SVC, 'pilotage_code_publier', { p_etat: essai })
          const l = await appel(SVC, 'pilotage_code_lire', {})
          if (p.j !== 'ok' || JSON.stringify(l.j?.[0]?.etat) !== JSON.stringify(essai)) e.push('pilotage_code_publier puis pilotage_code_lire : l’état d’essai n’est pas relu à l’identique')
        } finally { const b = await appel(SVC, 'pilotage_code_publier', { p_etat: precedent }); if (b.j !== 'ok') e.push('l’état d’avant n’a pas été republié') }
      } else vus.push('pilotage_code_publier non appelée : aucun état publié avant (rien ne doit rester)')
    } else if (MIG === 'echanges') {
      const corps = { pilotage_entonnoir: { p_depuis: minuit }, pilotage_bilan: { p_n: 100 }, pilotage_appels: { p_limite: 5 }, pilotage_tapis: { p_depuis: minuit }, pilotage_recettes_agents: { p_depuis: minuit }, pilotage_atelier: { p_depuis: minuit }, pilotage_reponses_recentes: { p_limite: 3 } }
      for (const n of NOMS) await lectureOk(n, corps[n] ?? {}, Array.isArray)
      const bd = await appel(SVC, 'pilotage_bilan_date', {}); if (!Array.isArray(bd.j) || bd.j.length !== 1) e.push('pilotage_bilan_date() ne rend pas une ligne')
      const cj = await appel(SVC, 'pilotage_compteurs_du_jour', {}); const canaux = new Set((cj.j ?? []).map((x) => x.canal))
      if (!canaux.has('formulaire_site') || !canaux.has('email_sollicite') || canaux.has('email')) e.push(`pilotage_compteurs_du_jour : canaux ${[...canaux].join(', ')}`)
      const tp = await appel(SVC, 'pilotage_tapis', { p_depuis: minuit }); if ((tp.j ?? []).length !== 10) e.push('pilotage_tapis ne rend pas dix lignes')
      for (const n of NOMS) await refusAnon(n, corps[n] ?? {})
    } else if (MIG === 'station') {
      const lireEvts = async () => { const r = await appel(SVC, 'pilotage_evenements', { p_apres: null, p_limite: 200, p_agent: null, p_types: ['consigne', 'reunion_ouverte', 'reunion_close', 'reunion_compte_rendu', 'reunion_abandonnee', 'experience_lancee', 'experience_arretee'] }); return Array.isArray(r.j) ? Math.max(0, ...r.j.map((x) => Number(x.id))) : null }
      const avant = await lireEvts()
      for (const [n, c] of [['station_reunion_chiffres', {}], ['station_reunion_lire', { p_limite: 3 }], ['station_objectif_actif', {}]]) await lectureOk(n, c)
      const et = await appel(SVC, 'station_experience_etat', {}); if (!Array.isArray(et.j) || et.j.length !== 1) e.push('station_experience_etat() ne rend pas une ligne'); else vus.push('station_experience_etat')
      // Refus seulement : des arguments refusés d'avance, jamais une consigne, une réunion ni une expérience réelles.
      await refusService('station_consigne_transmettre', { p_texte: '', p_auteur: NON_FONDATEUR, p_agent: null }, 'ops:auteur')
      await refusService('station_reunion_ouvrir', { p_agent: 'pont' }, 'ops:agent')
      await refusService('station_experience_lancer', { p_nom: 'essai refusé', p_budget_eur: 0, p_auteur: NON_FONDATEUR }, 'ops:auteur')
      await refusService('station_pause_par_agent', { p_agent: 'essai_sans_capacite', p_motif: 'essai' }, 'ops:agent')
      for (const n of NOMS) await refusAnon(n, {})
      const apres = await lireEvts()
      if (avant === null || apres === null || apres !== avant) e.push(`événements consigne, reunion_* ou experience_* écrits pendant le passage (${avant} → ${apres})`)
      vus.push('cron.job : lu par Claude Code dans le contrôle de la migration (execute_sql), pas par l’API')
    } else {
      const lu = await lectureOk('station_reglages_lire', {}, (j) => Array.isArray(j) && j.length === 1)
      await lectureOk('pilotage_radar', {})
      await lectureOk('pilotage_prospects_departements', {}, Array.isArray)
      await lectureOk('pilotage_activite_salles', { p_depuis: minuit }, Array.isArray)
      const version = Number(lu?.[0]?.version ?? 0)
      await refusService('station_reglages_ecrire', { p_reglages: {}, p_auteur: NON_FONDATEUR, p_version: version + 1000 }, 'ops:')
      for (const n of NOMS) await refusAnon(n, n === 'station_reglages_ecrire' ? { p_reglages: {}, p_auteur: NON_FONDATEUR, p_version: version + 1000 } : n === 'pilotage_activite_salles' ? { p_depuis: minuit } : {})
    }
  } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
  S.juger(id, e, `clé de service : ${vus.join(', ')} ; clé anonyme refusée partout ; rien d'écrit de durable`)
}

// ── Déroulé ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (critereFichier()) {
  try {
    if (MIG === 'lecture') cahierLecture()
    else if (MIG === 'echanges') cahierEchanges()
    else if (MIG === 'station') cahierStation()
    else cahierReglages()
  } catch (err) { S.echoue(ORDRE[1], `interrompu : ${premiereLigne(err)}`) }
  if (REEL) await reel()
} else S.nonJuges(ORDRE.slice(1).concat(REEL ? [REELS[MIG]] : []), `${P(1)} en échec : aucun fichier à lire`)
process.exit(S.finir())
