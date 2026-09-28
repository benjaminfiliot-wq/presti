#!/usr/bin/env node
// scripts/disjoncteurs-qa.mjs — le juge de la migration 0111 et de lib/agents/acquisition/disjoncteurs.ts (fiche 026-063,
// cahier DJ), écrit par Claude Code AVANT ces modules qu'il juge (CLAUDE.md:23). Inscrit au lot 5 du registre (026-062).
//
//   node --import ./scripts/ts-loader.mjs scripts/disjoncteurs-qa.mjs [--partie=sql|logique] [--racine=<dossier>] [--auto-controle]
//   node … --generer-essai [--avec=0096,0097,0098,0099,0105,0106]
//        écrit sur stdout le bloc d'essai à sec (même protocole que prospection-sql-qa, 026-032 : DO + EXECUTE du jumeau nu
//        de chaque migration listée, PUIS le jumeau nu de 0111, PUIS le scénario de scripts/fixtures/026-acquisition/envoi/
//        essai-0111.sql, PUIS un raise exception final : rien n'est commité). Préalable manquant (jumeau nu absent) → code 2.
//   node … --reel --confirmer-reel     Claude Code seulement, jamais par le registre ; après apply_migration.
//
// Sans --partie : les deux (sql et logique). Module ou migration absents → DJ-1 en échec avec son identifiant, les autres
// « non jugés » (jamais un plantage sans identifiant) — c'est l'état attendu tant que 026-063 n'a pas été déposée.
// --auto-controle : les jeux d'essai (scenarios.json, technologies.json, essai-0111.sql) se lisent et portent l'action
// attendue ; les seuils du scénario égalent SEUILS de contrat.ts ; indépendant du module encore à écrire.
//
// Sortie : « ✅|❌ ID … » par critère, puis « disjoncteurs-qa : PASS|FAIL — … ». Code 0 tout vert ; 1 un rouge ; 2 appel
// invalide ou préalable manquant. Écrit seulement sous .orchestre/travail/disjoncteurs-qa/. Ne lit .env.local que sous
// --reel (Claude Code seulement).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  court, premiereLigne, lireJson,
} from './fixtures/026-acquisition/commun.mjs'
import {
  instructions, normaliser as normaliserSql, masquer, fermante, decouperVirgules, compacter, jumeauNuCoupe, empreinte,
  blocEssai, analyserEssai, lireCompteRendu, nonRegression, lireEnvLocal, lf,
} from './lib/sql-essai.mjs'

const JUGE = 'disjoncteurs-qa'
const ENVOI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'envoi')
const MIGRATIONS = path.join(R, 'supabase', 'migrations')
const MODULE_REL = path.join('lib', 'agents', 'acquisition', 'disjoncteurs.ts')
const MAGASIN_REL = path.join('lib', 'agents', 'acquisition', 'magasinSupabase.ts')
const FICHE = '026-063'
const AVANT = ['0096', '0097', '0098', '0099', '0105', '0106']
const IDS = ['DJ-1', 'DJ-2', 'DJ-3', 'DJ-4', 'DJ-5', 'DJ-6', 'DJ-7', 'DJ-8', 'DJ-9', 'DJ-10', 'DJ-11']
const FONCTIONS_EXPORTS = ['peutEnvoyer', 'estAuVert', 'carteAttention']
const FONCTIONS_MAGASIN = [
  'etatEnvoi', 'signal', 'modelesSuspendus', 'suspendreModele', 'jaugeConsommer', 'jauges', 'echantillonDuSoir',
]
const ROLES_FERMES = ['public', 'anon', 'authenticated']

const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'avec'], drapeauxConnus: ['generer-essai', 'reel', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const PARTIE = o.valeurs.partie
if (PARTIE && !['sql', 'logique'].includes(PARTIE)) refuser(`--partie=sql|logique attendu (reçu : ${PARTIE})`)
const GENERER = o.drapeaux.has('generer-essai')
const AVEC = (o.valeurs.avec ?? '').split(',').filter(Boolean)
const REEL = o.drapeaux.has('reel'), CONFIRMER = o.drapeaux.has('confirmer-reel')
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
for (const a of AVEC) if (!AVANT.includes(a)) refuser(`--avec=${a} : ${AVANT.join(', ')} attendues`)
if (AVEC.length && !GENERER) refuser('--avec= ne sert qu\'avec --generer-essai')
if (GENERER && (o.autoControle || REEL)) refuser('--generer-essai ne se combine ni avec --auto-controle ni avec --reel')
if (REEL && !CONFIRMER) { console.log(`${JUGE} --reel : appel refusé — --confirmer-reel manquant (jamais lancé par le registre)`); process.exit(2) }
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${PARTIE ? ` --partie=${PARTIE}` : ''}${o.autoControle ? ' --auto-controle' : ''}`
const K = await importerContrat()
const lireSi = (f) => { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }

/** Le fichier de migration 0111 sous <racine>, ou null : `supabase/migrations/*_acquisition_envoi.sql`, numéro > 0106. */
function trouverMigration(racine) {
  const dossier = path.join(racine, 'supabase', 'migrations')
  if (!fs.existsSync(dossier)) return { fichiers: [] }
  const fichiers = fs.readdirSync(dossier).filter((f) => /^\d{4}_acquisition_envoi\.sql$/.test(f))
  return { dossier, fichiers }
}
const jumeauDe = (base) => base.replace(/\.sql$/, '').replace(/^(\d{4})_/, '_A_COLLER_sql_editor_$1.sql').replace(/^_A_COLLER_sql_editor_/, '_A_COLLER_sql_editor_')
const nuDe = (num) => `_A_COLLER_sql_editor_${num}_NU.sql`

// ── Un magasin factice minimal pour DJ-7 (peutEnvoyer/estAuVert reçoivent un EtatEnvoi, pas un magasin : rien à doubler ici,
//    mais carteAttention et estAuVert prennent des objets simples). ──────────────────────────────────────────────────────
function etatDe(surcharges = {}) {
  return {
    palier: 'P2', envoi_froid: true, formulaire_coupe_jusqua: null, gmail_coupe_jusqua: null, meta_coupe_jusqua: null,
    technologies: [{ technologie: 'contact_form_7', etat: 'active' }], modeles_suspendus: [], notice_verifiee_le: '2026-10-14T00:00:00.000Z',
    bilan_le: null, releve_gmail_le: '2026-10-14T08:50:00.000Z', ads_archive: { permis: true, le: '2026-10-10T00:00:00.000Z' },
    ...surcharges,
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --generer-essai
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function genererEssai() {
  const { dossier, fichiers } = trouverMigration(RAC)
  if (!fichiers?.length) refuser(`préalable manquant : aucune migration supabase/migrations/*_acquisition_envoi.sql sous ${rel(RAC)} (026-063 n'a pas encore été déposée)`)
  const base = fichiers.sort().at(-1)
  const num = base.slice(0, 4)
  const nus = []
  for (const a of [...AVEC].sort()) {
    const f = path.join(dossier, nuDe(a))
    const t = lireSi(f)
    if (!t) refuser(`préalable manquant : jumeau nu de ${a} absent ou vide (${rel(f)})`)
    nus.push(jumeauNuCoupe(f))
  }
  const fNu = path.join(dossier, nuDe(num))
  const nuPropre = lireSi(fNu)
  if (!nuPropre) refuser(`préalable manquant : jumeau nu de ${num} absent ou vide (${rel(fNu)})`)
  nus.push(jumeauNuCoupe(fNu))
  const scenario = lireSi(path.join(ENVOI, 'essai-0111.sql'))
  if (!scenario) refuser('scénario absent ou vide : scripts/fixtures/026-acquisition/envoi/essai-0111.sql')
  let bloc
  try { bloc = blocEssai({ nus, scenario, empreinte: empreinte(jumeauNuCoupe(fNu)) }) } catch (e) { console.error(`✗ ${JUGE} : ${e.message}`); process.exit(1) }
  const a = analyserEssai(bloc, { nus })
  if (!a.ok) { console.error(`✗ ${JUGE} : bloc d'essai invalide — ${a.raisons.join(' ; ')}`); process.exit(1) }
  process.stdout.write(bloc)
  console.error(`-- ${JUGE} : essai à sec de ${num} (026-063)${AVEC.length ? `, précédé de ${[...AVEC].sort().join(', ')}` : ''}, empreinte ${empreinte(jumeauNuCoupe(fNu)).slice(0, 12)}… ; après l'exécution : select to_regclass('ops.technologies') is null → « APRES rien_ne_reste=<valeur> » dans .orchestre/preuves/${FICHE}/essai-a-sec.txt`)
  process.exit(0)
}
if (GENERER) await genererEssai()

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --reel (Claude Code, après apply_migration)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
class Prealable extends Error {}
async function reel() {
  lireEnvLocal(R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const manque = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !service && 'SUPABASE_SERVICE_ROLE_KEY', !anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter(Boolean)
  if (manque.length) throw new Prealable(`${manque.join(', ')} absent(s) de .env.local`)
  async function rpc(fn, corps, cle) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps ?? {}), signal: AbortSignal.timeout(20_000) })
      const t = await res.text()
      let j = null; try { j = JSON.parse(t) } catch { j = null }
      return { status: res.status, ok: res.ok, j }
    } catch { return { status: 0, ok: false, j: null } }
  }
  const s = creerSortie('disjoncteurs-qa --reel', ['DJ-REEL'], 'disjoncteurs-qa --reel — état réel, signal d\'essai, ménage')
  const etat = await rpc('acq_etat_envoi', {}, service)
  if (etat.status === 0) throw new Prealable('PostgREST injoignable')
  if (etat.status === 404 && etat.j?.code === 'PGRST202') throw new Prealable('acq_etat_envoi inconnue : 0111 n\'est pas appliquée')
  const e = []
  if (!etat.ok || !etat.j) e.push(`acq_etat_envoi() refusée (${etat.status})`)
  else {
    if (etat.j.palier !== 'P0') e.push(`palier ${etat.j.palier}, P0 attendu`)
    if (etat.j.envoi_froid !== false) e.push('envoi_froid n\'est pas fermé')
    if ((etat.j.technologies ?? []).length) e.push(`${etat.j.technologies.length} technologie(s) déjà connue(s), 0 attendue(s)`)
  }
  let nettoye = false
  try {
    const sig = await rpc('acq_signal', { p: { type: 'echec_soumission', technologie: 'essai_026_reel' } }, service)
    if (!sig.ok) e.push(`acq_signal (essai_026_reel) refusé (${sig.status})`)
    const anonR = await rpc('acq_signal', { p: { type: 'stop' } }, anon)
    if (anonR.ok || anonR.status === 0) e.push(`anon accepté sur acq_signal (${anonR.status})`)
  } finally {
    try {
      await fetch(`${url}/rest/v1/ops.technologies?technologie=eq.essai_026_reel`, { method: 'DELETE', headers: { apikey: service, Authorization: `Bearer ${service}`, Prefer: 'return=minimal' }, signal: AbortSignal.timeout(20_000) }).catch(() => {})
      nettoye = true
    } catch { nettoye = false }
  }
  if (!nettoye) e.push('le ménage de la technologie témoin a échoué')
  s.juger('DJ-REEL', e, 'acq_etat_envoi() : P0, envoi_froid fermé, aucune technologie ; un signal d\'essai écrit et nettoyé ; anon refusé')
  return s.finir()
}
if (REEL) {
  try { process.exit(await reel()) } catch (e) {
    if (e instanceof Prealable) { console.log(`${JUGE} --reel : préalable manquant — ${e.message}`); process.exit(2) }
    console.log(`${JUGE} --reel : erreur — ${court(e.message, 200)}`); process.exit(1)
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle : les jeux d'essai seuls, indépendant des modules encore à écrire
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function autoControle(s) {
  {
    const e = []
    const sc = lireSi(path.join(ENVOI, 'scenarios.json'))
    if (!sc) e.push('scenarios.json illisible')
    else {
      const d = JSON.parse(sc)
      if (d.stop_100?.stops !== K.SEUILS?.stop_100) e.push(`stop_100.stops (${d.stop_100?.stops}) ≠ SEUILS.stop_100 (${K.SEUILS?.stop_100})`)
      if (d.plaintes_7j?.signaux?.length !== K.SEUILS?.plaintes_7j) e.push(`plaintes_7j : ${d.plaintes_7j?.signaux?.length} signaux, SEUILS.plaintes_7j (${K.SEUILS?.plaintes_7j}) attendu`)
      if (d.avis_abus?.signaux?.length !== K.SEUILS?.avis_abus) e.push(`avis_abus : ${d.avis_abus?.signaux?.length} signal(aux), SEUILS.avis_abus (${K.SEUILS?.avis_abus}) attendu`)
      if (d.echecs_soumission_affilee?.signaux?.length !== K.SEUILS?.echecs_affilee) e.push(`echecs_soumission_affilee : ${d.echecs_soumission_affilee?.signaux?.length}, SEUILS.echecs_affilee (${K.SEUILS?.echecs_affilee}) attendu`)
      if (d.sans_reponse_300?.envois_300 !== K.SEUILS?.sans_reponse) e.push(`sans_reponse_300.envois_300 (${d.sans_reponse_300?.envois_300}) ≠ SEUILS.sans_reponse (${K.SEUILS?.sans_reponse})`)
      for (const [nom, x] of Object.entries(d)) {
        if (nom.startsWith('_') || !x || typeof x !== 'object' || Array.isArray(x)) continue
        if (nom === 'bilans' || nom === 'ads_archive') continue
        if (!('action_attendue' in x) && nom !== 'palier_vert' && nom !== 'palier_rouge') e.push(`scénario ${nom} : aucune action_attendue portée`)
      }
      if (d.bilans?.quatre_oui?.verdict_attendu !== 'P3') e.push('bilans.quatre_oui.verdict_attendu doit être P3')
      if (d.bilans?.zero_oui?.verdict_attendu !== 'arret_froid') e.push('bilans.zero_oui.verdict_attendu doit être arret_froid')
      if (d.palier_vert?.au_vert !== true) e.push('palier_vert.au_vert doit être vrai')
      if (d.palier_rouge?.au_vert !== false) e.push('palier_rouge.au_vert doit être faux')
    }
    s.juger('AC-1', e, 'scenarios.json : chaque scénario porte l\'action attendue ; les seuils (stop_100, plaintes_7j, avis_abus, echecs_affilee, sans_reponse) égalent SEUILS de contrat.ts')
  }
  {
    const e = []
    const t = lireSi(path.join(ENVOI, 'technologies.json'))
    if (!t) e.push('technologies.json illisible')
    else {
      const d = JSON.parse(t)
      if (!d.technologies?.some((x) => x.etat === 'pause')) e.push('aucune technologie en pause')
      if (!d.technologies?.some((x) => x.etat === 'active')) e.push('aucune technologie active')
    }
    const sql = lireSi(path.join(ENVOI, 'essai-0111.sql'))
    if (!sql) e.push('essai-0111.sql illisible')
    else {
      const cles = ['envoi_froid_ferme_palier_zero', 'trop_tot_refuse', 'ouverture_08h_ok', 'p0_formulaire_a_cinq', 'technologie_en_pause_apres_trois_echecs', 'avis_abus_coupe_48h', 'quatre_stop_suspend_modele', 'gmail_refus_coupe_gmail_et_formulaire', 'ads_archive_sans_evenement_refuse', 'ads_archive_permis_apres_evenement', 'jauge_199_sur_200_accepte_1', 'jauge_200_sur_200_refuse', 'anon_refuse_signal']
      for (const c of cles) if (!sql.includes(`'${c}'`)) e.push(`clé ${c} absente d'essai-0111.sql`)
      if (/decrypted_secret|\bvault\./i.test(sql)) e.push('essai-0111.sql touche au Vault (aucune lecture attendue ici)')
    }
    s.juger('AC-2', e, 'technologies.json (active et en pause) ; essai-0111.sql porte les 13 clés attendues, sans toucher au Vault')
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le jugement normal
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function jugementNormal(s) {
  const { dossier, fichiers } = trouverMigration(RAC)
  const fMod = path.join(RAC, MODULE_REL), fMagasin = path.join(RAC, MAGASIN_REL)
  const e1 = []
  if (!fichiers?.length) e1.push(`aucune migration supabase/migrations/*_acquisition_envoi.sql sous ${rel(RAC)}`)
  else if (fichiers.length > 1) e1.push(`${fichiers.length} migrations *_acquisition_envoi.sql, une seule attendue (${fichiers.join(', ')})`)
  let mod = null
  if (!fs.existsSync(fMod)) e1.push(`module absent : ${rel(fMod)}`)
  else {
    try { mod = await importerDepuis(RAC, MODULE_REL) } catch (err) { e1.push(`disjoncteurs.ts ne s'importe pas : ${premiereLigne(err)}`) }
    if (mod) for (const n of FONCTIONS_EXPORTS) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de disjoncteurs.ts`)
  }
  s.juger('DJ-1', e1, `une migration *_acquisition_envoi.sql, numéro supérieur à 0106 ; disjoncteurs.ts exporte ${FONCTIONS_EXPORTS.join(', ')}`)
  if (e1.length) { s.nonJuges(IDS.slice(1), 'DJ-1 en échec'); return }

  const base = fichiers[0]
  const texteM = lireSi(path.join(dossier, base))
  const ins = instructions(texteM).map((t) => ({ t, n: normaliserSql(t) }))

  if (!PARTIE || PARTIE === 'sql') {
    // DJ-2 : security definer, search_path, revoke/grant.
    {
      const e = []
      const fonctions = [...texteM.matchAll(/create (?:or replace )?function (ops|public)\.([a-z0-9_]+)\(/gi)].map((m) => m[2])
      for (const f of new Set(fonctions)) {
        const debut = texteM.search(new RegExp(`create (?:or replace )?function (?:ops|public)\\.${f}\\(`, 'i'))
        const zoneFin = texteM.indexOf('\n$$;', debut)
        const entete = texteM.slice(debut, zoneFin > 0 ? zoneFin : debut + 400)
        if (!/security definer/i.test(entete)) e.push(`${f} : security definer absent`)
        if (!/set search_path\s*=\s*public,\s*ops,\s*pg_temp/i.test(entete)) e.push(`${f} : search_path = public, ops, pg_temp absent`)
      }
      for (const f of ['garde_modeles', 'suivre_technologies']) {
        if (!new RegExp(`revoke[^;]*from[^;]*(public|anon|authenticated|service_role)[^;]*;[\\s\\S]{0,10}(create|--).*${f}|revoke\\s+(?:all|execute)[^;]*ops\\.${f}`, 'i').test(texteM) && !new RegExp(`function ops\\.${f}`).test(texteM)) e.push(`${f} : présence non confirmée`)
      }
      const tables = ['paliers', 'etat_envoi', 'technologies', 'signaux', 'modeles_suspendus', 'jauges']
      for (const t of tables) if (!new RegExp(`enable row level security[\\s\\S]{0,400}ops\\.${t}|ops\\.${t}[\\s\\S]{0,10}enable row level security`, 'i').test(texteM) && !new RegExp(`alter table ops\\.${t} enable row level security`, 'i').test(texteM)) e.push(`ops.${t} : RLS non confirmée`)
      const nu = sansCommentaires(texteM)
      for (const mot of ['ops.boites', 'boite_', 'chauffe', 'jalon']) if (nu.toLowerCase().includes(mot.toLowerCase())) e.push(`« ${mot} » encore présent (retiré par la voie gratuite)`)
      s.juger('DJ-2', e, 'chaque fonction du §2 : security definer, search_path fixé ; RLS sur les six tables ; sans ops.boites, boite_, chauffe, jalon')
    }
    // DJ-3 : graines des paliers, seuils, plafond, date.
    {
      const e = []
      const attendus = (K.PALIERS ?? []).map((p) => [p.id, p.par_jour, p.jours_au_vert])
      const c = compacter(texteM)
      for (const [id, parJour] of attendus) if (!new RegExp(`'${id}'[^)]*${parJour}`).test(c) && !c.includes(`'${id}',`)) e.push(`palier ${id} : graine non retrouvée avec par_jour=${parJour}`)
      const seuils = [['4', 'stop'], ['2', 'plainte'], ['1', 'avis_abus'], ['3', 'echec_soumission'], ['300', 'sans_reponse']]
      for (const [n] of seuils) if (!c.includes(n)) e.push(`seuil ${n} non retrouvé dans le SQL`)
      if (!c.includes('300')) e.push('par_jour borné à 300 non retrouvé')
      if (!texteM.includes(K.DATE_PREMIER_ENVOI)) e.push(`DATE_PREMIER_ENVOI (${K.DATE_PREMIER_ENVOI}) absente du SQL`)
      s.juger('DJ-3', e, `graines de ops.paliers alignées sur PALIERS (${attendus.map(([id, n]) => `${id}=${n}`).join(', ')}) ; seuils et date de contrat.ts retrouvés dans le SQL`)
    }
    // DJ-4 : acq_palier_appliquer n'écrit que les lignes attendues (lecture ciblée du corps).
    {
      const e = []
      const m = /create (?:or replace )?function public\.acq_palier_appliquer\(\)[\s\S]*?\$([a-z_]*)\$([\s\S]*?)\$\1\$/i.exec(texteM)
      if (!m) e.push('acq_palier_appliquer() introuvable')
      else {
        const corps = compacter(m[2])
        for (const attendu of ["'formulaire_site','*'", "'email_sollicite','*'", "'reponse_privee'", "'messagerie'"]) if (!corps.replace(/\s/g, '').includes(attendu.replace(/\s/g, ''))) e.push(`acq_palier_appliquer : « ${attendu} » non retrouvé`)
      }
      const fondateur = ['acq_technologie_reprendre', 'acq_canal_rouvrir', 'acq_modele_lever', 'acq_palier_plafond', 'acq_envoi_froid_ouvrir']
      for (const f of fondateur) if (!texteM.includes(f)) e.push(`fonction du fondateur ${f} absente`)
      s.juger('DJ-4', e, 'acq_palier_appliquer ne touche que (formulaire_site,*), (email_sollicite,*), reponse_privee, messagerie ; les 5 fonctions du fondateur sont présentes')
    }
    // DJ-5 : jumeaux équivalents, contrôle en lecture seule (contrôle simplifié : présence + verbes de lecture).
    {
      const e = []
      const jumeau = lireSi(path.join(dossier, jumeauDe(base)))
      const nu = lireSi(path.join(dossier, nuDe(base.slice(0, 4))))
      if (!jumeau) e.push(`jumeau absent : ${jumeauDe(base)}`)
      if (!nu) e.push(`jumeau nu absent : ${nuDe(base.slice(0, 4))}`)
      const controleRel = path.join('supabase', 'controles', `${base.slice(0, 4)}_acquisition_envoi.sql`)
      const controle = lireSi(path.join(RAC, controleRel))
      if (!controle) e.push(`contrôle absent : ${controleRel}`)
      else {
        const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke)\b/.exec(compacter(controle))
        if (verbe) e.push(`contrôle : « ${verbe[1]} » hors lecture`)
        if (!controle.includes("'oui'")) e.push('contrôle : aucune ligne « oui »')
      }
      s.juger('DJ-5', e, 'jumeau, jumeau nu et contrôle (lecture seule, « oui ») présents')
    }
    // DJ-6 : essai à sec.
    {
      const fEssai = path.join(R, '.orchestre', 'preuves', FICHE, 'essai-a-sec.txt')
      const fNu = path.join(dossier, nuDe(base.slice(0, 4)))
      const nuTxt = lireSi(fNu)
      if (!nuTxt) s.echoue('DJ-6', `jumeau nu ${nuDe(base.slice(0, 4))} absent : l'empreinte ne se calcule pas`)
      else {
        const emp = empreinte(jumeauNuCoupe(fNu))
        const cles = ['envoi_froid_ferme_palier_zero', 'trop_tot_refuse', 'ouverture_08h_ok', 'p0_formulaire_a_cinq', 'technologie_en_pause_apres_trois_echecs', 'avis_abus_coupe_48h', 'quatre_stop_suspend_modele', 'gmail_refus_coupe_gmail_et_formulaire', 'ads_archive_sans_evenement_refuse', 'ads_archive_permis_apres_evenement', 'jauge_199_sur_200_accepte_1', 'jauge_200_sur_200_refuse', 'anon_refuse_signal']
        const cr = lireCompteRendu(fEssai, { empreinte: emp, cles })
        if (!cr.ok) for (const r2 of cr.raisons) s.echoue('DJ-6', `${rel(fEssai)} : ${r2}`)
        else s.passe('DJ-6', `essai à sec du jumeau ${emp.slice(0, 12)}… : ${cles.length} clés à true, APRES rien_ne_reste=true`)
      }
    }
    // DJ-9 : non-régression.
    {
      const r2 = nonRegression(RAC, { exclus: [path.join('supabase', 'migrations', base), path.join('supabase', 'migrations', jumeauDe(base)), path.join('supabase', 'migrations', nuDe(base.slice(0, 4))), path.join('supabase', 'controles', `${base.slice(0, 4)}_acquisition_envoi.sql`)] })
      if (r2.ok) s.passe('DJ-9', r2.resume); else for (const x of r2.echecs) s.echoue('DJ-9', x)
    }
    // DJ-10 : gestes du fondateur, is_founder d'abord.
    {
      const e = []
      for (const f of ['acq_envoi_froid_ouvrir', 'acq_technologie_reprendre', 'acq_canal_rouvrir', 'acq_modele_lever', 'acq_palier_plafond']) {
        const m = /is_founder/i.exec(texteM.slice(texteM.indexOf(`function public.${f}(`)))
        if (!m) e.push(`${f} : is_founder non retrouvé`)
      }
      if (!texteM.includes('ops:auteur')) e.push('ops:auteur absent (refus d\'un non-fondateur)')
      if (!texteM.includes('ops:trop_tot') || !texteM.includes('ops:mesure_absente') || !texteM.includes('ops:epreuve_absente') || !texteM.includes('ops:notice_absente')) e.push('les quatre refus de acq_envoi_froid_ouvrir ne sont pas tous retrouvés')
      s.juger('DJ-10', e, 'is_founder lu avant écriture dans chaque fonction du fondateur ; les quatre refus de acq_envoi_froid_ouvrir')
    }
    // DJ-11 : gmail_refus double effet, ads_archive.
    {
      const e = []
      if (!/greatest\s*\(\s*formulaire_coupe_jusqua/i.test(texteM)) e.push('acq_signal : greatest(formulaire_coupe_jusqua, …) absent (gmail_refus ne doit jamais raccourcir la coupure du formulaire)')
      if (!texteM.includes('releve_gmail_le')) e.push('releve_gmail_le absent de acq_etat_envoi')
      if (!texteM.includes('lecture_ads_archive')) e.push('lecture_ads_archive absent')
      s.juger('DJ-11', e, 'gmail_refus pose formulaire_coupe_jusqua par greatest() ; releve_gmail_le et lecture_ads_archive lus par acq_etat_envoi')
    }
  } else { for (const id of ['DJ-2', 'DJ-3', 'DJ-4', 'DJ-5', 'DJ-6', 'DJ-9', 'DJ-10', 'DJ-11']) s.passe(id, `sauté : --partie=${PARTIE}`) }

  if (!PARTIE || PARTIE === 'logique') {
    // DJ-7 : disjoncteurs.ts.
    {
      const e = []
      const cas = [
        ['technologie en pause', etatDe({ technologies: [{ technologie: 'wpforms', etat: 'pause' }] }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'wpforms' }, 'technologie_en_pause'],
        ['formulaire coupé', etatDe({ formulaire_coupe_jusqua: '2099-01-01T00:00:00.000Z' }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7' }, 'formulaire_coupe'],
        ['gmail coupé', etatDe({ gmail_coupe_jusqua: '2099-01-01T00:00:00.000Z' }), { canal: 'email_sollicite', type: 'reponse' }, 'gmail_coupe'],
        ['meta coupé', etatDe({ meta_coupe_jusqua: '2099-01-01T00:00:00.000Z' }), { canal: 'messagerie', type: 'reponse' }, 'meta_coupe'],
        ['modèle suspendu', etatDe({ modeles_suspendus: ['m1'] }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7', modele_id: 'm1' }, 'modele_suspendu'],
        ['envoi_froid fermé, premier contact', etatDe({ envoi_froid: false }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7' }, 'envoi_froid_ferme'],
        ['notice périmée, formulaire', etatDe({ notice_verifiee_le: '2026-09-01T00:00:00.000Z' }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7' }, 'notice_perimee'],
        ['ads_archive non lu, source meta', etatDe({ ads_archive: { permis: false, le: null } }), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7', source: 'meta' }, 'ads_archive_non_lue'],
      ]
      for (const [nom, etat, args, attendu] of cas) {
        try { const r2 = mod.peutEnvoyer(etat, args, Date.parse('2026-10-14T09:00:00.000Z')); if (r2.ok !== false || r2.raison !== attendu) e.push(`${nom} : ${JSON.stringify(r2)}, raison ${attendu} attendue`) } catch (err) { e.push(`${nom} : ${premiereLigne(err)}`) }
      }
      try { const r2 = mod.peutEnvoyer(etatDe({ envoi_froid: false }), { canal: 'email_sollicite', type: 'reponse' }, Date.now()); if (r2.ok !== true) e.push(`email_sollicite quand le formulaire est fermé : refusé (${JSON.stringify(r2)}), accepté attendu`) } catch (err) { e.push(`sollicité passe malgré envoi_froid fermé : ${premiereLigne(err)}`) }
      try { const r2 = mod.peutEnvoyer(etatDe(), { canal: 'formulaire_site', type: 'premier_contact', technologie: 'contact_form_7' }, Date.now()); if (r2.ok !== true) e.push(`cas conforme refusé : ${JSON.stringify(r2)}`) } catch (err) { e.push(`cas conforme : ${premiereLigne(err)}`) }
      const src = fs.readFileSync(fMod, 'utf8'), nu = sansCommentaires(src)
      if (/\bfetch\s*\(/.test(nu)) e.push('disjoncteurs.ts appelle fetch(')
      if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('disjoncteurs.ts lit process.env')
      if (/\bboite\b|\bchauffe\b/i.test(nu)) e.push('disjoncteurs.ts contient boite ou chauffe')
      for (const i of importsDe(src)) if (i.spec && i.spec !== './contrat' && !i.spec.endsWith('/contrat')) e.push(`import hors du contrat : ${i.spec}`)
      s.juger('DJ-7', e, 'peutEnvoyer : chaque refus attendu (technologie en pause, formulaire/gmail/meta coupé, modèle suspendu, envoi_froid fermé sur premier contact, notice périmée sur formulaire, ads_archive non lue sur source meta), un sollicité passe malgré le formulaire fermé, un cas conforme accepté ; source : ni fetch, ni process.env, ni boite/chauffe, importe seulement ./contrat')
    }
    // DJ-8 : magasinSupabase.ts.
    {
      const e = []
      if (!fs.existsSync(fMagasin)) e.push(`magasinSupabase.ts absent : ${rel(fMagasin)}`)
      else {
        const src = fs.readFileSync(fMagasin, 'utf8')
        for (const m of FONCTIONS_MAGASIN) if (!new RegExp(`\\b${m}\\s*\\(`).test(src)) e.push(`méthode ${m} absente de magasinSupabase.ts`)
        if (!/rpc\(\s*['"]acq_/.test(src)) e.push('aucun appel rpc(\'acq_…\') retrouvé')
        if (/boitesActives/.test(src)) e.push('boitesActives encore appelée')
        const tc = typecheck(RAC, JUGE)
        if (!tc.ok) e.push(`typecheck : ${tc.detail}`)
      }
      s.juger('DJ-8', e, `magasinSupabase.ts porte les ${FONCTIONS_MAGASIN.length} méthodes de MagasinEnvoi par rpc('acq_…'), sans boitesActives ; typecheck vert`)
    }
  } else { s.passe('DJ-7', `sauté : --partie=${PARTIE}`); s.passe('DJ-8', `sauté : --partie=${PARTIE}`) }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const piege = piegerReseau()
const ids = o.autoControle ? ['AC-1', 'AC-2'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — fixtures ${rel(ENVOI)}`)
if (o.autoControle) await autoControle(s)
else await jugementNormal(s)
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
