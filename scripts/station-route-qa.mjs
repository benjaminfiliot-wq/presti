// scripts/station-route-qa.mjs — le juge des routes de la station (fiches 026-092 et 026-178), écrit en 026-067 par Claude
// Code AVANT les routes qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/station-route-qa.mjs --partie=lecture|reunion|salles2
//        [--racine=<d>] [--base=<commit>] [--temoin] [--harnais] [--statique]
//
//   --partie=lecture   critères SV-1 à SV-22 de 026-092 : GET /api/controle/station, lib/pilotage/station.ts ;
//   --partie=reunion   critères RA-1 à RA-5 de 026-092 : POST /api/agents/reunion, GET /api/agents/reunion/chiffres ;
//   --partie=salles2   critères SL-1 à SL-9 de 026-178 : les lecteurs des vues de salle restantes (lib/pilotage/salles/).
//
// Trois façons de juger, dans cet ordre :
//   1. la lecture des sources (toute racine) ;
//   2. les DOUBLURES (toute racine, processus enfant, aucun réseau) : chaque route est exécutée par ts-loader, ses imports
//      redirigés vers s/doublures-station.mjs (next/server, lib/flags, lib/direction/garde, lib/controle/droits,
//      lib/agents/garde, lib/agents/pause, lib/supabaseAdmin, lib/direction/tresorerie, lib/direction/stripe,
//      lib/controle/lectures/**), sur la base d'essai de s/ (base-essai.mjs), horloge figée ; chaque réponse passe
//      s/contrat-vues.mjs. Les réussites des routes du Chef ne s'éprouvent qu'ici : AUCUNE réunion n'est jamais ouverte
//      pour de vrai. SV-15 et SV-16 importent `trier` et `DOMAINE_DE` dans un second enfant, SANS aucune doublure ;
//   3. le VIVANT (racine réelle seulement, sans --racine, --temoin ni --statique ; PC seulement) : l'arbre réel (drapeaux
//      baissés : 404), puis la copie où ce juge seul lève `pilotage` (et `busAgents` pour la réunion) — aides
//      copieAvecDrapeau, serveurCopie, avecComptes de b/commun.mjs (026-066) —, un compte fondateur et un compte artisan
//      d'essai supprimés dans un finally (code 1 si le ménage échoue), et `npm run typecheck`. Lit alors .env.local de la
//      vraie racine, sans rien afficher. N'envoie à la copie aucune requête qui réussirait une écriture.
//   --racine=<d>  juge l'arbre <d> (référence, témoin, sabotage) : 1 et 2 seulement, jamais de serveur ni de réseau.
//   --base=<c>    le commit auquel SV-11 compare scripts/fermeture-e2e.mjs (défaut HEAD), et sur lequel --temoin se pose.
//   --temoin      pose le témoin du lot s (s/temoin/) sur app/, lib/ et les fichiers de tête du commit --base, le juge
//                 (1 et 2), puis prouve le HARNAIS sans réseau (<préfixe>-HARNAIS) : la copie se fait, `pilotage` (et
//                 `busAgents`) levés dans la copie seulement, lib/flags.ts réel inchangé (sha256).
//   --harnais     --temoin, puis le harnais VIVANT (PC seulement, jamais sous le piège réseau de la preuve) : serveur de la
//                 copie, compte fondateur d'essai → 200 sur /api/controle/chiffres de la copie, compte relu absent.
//
// 026-178 fait passer une salle de « arrive avec sa fiche » à sa forme : --partie=lecture accepte les deux états (une salle
// dont le lecteur lib/pilotage/salles/<clé>.ts existe doit rendre sa forme ; sinon « arrive avec sa fiche », sans appel à la
// base), si bien qu'elle reste verte après 026-178. Le contrat de chaque vue est celui de s/contrat-vues.mjs.
// Sortie « ✅ ID … » / « ❌ ID … », puis « station-route-qa --partie=<p> : PASS|FAIL ». Code 0, 1, ou 2 (appel invalide).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, sansCommentaires, importsDe, lancerAsync, premiereLigne, court, gelerProfond } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase, lireBase, copieAvecDrapeau, serveurCopie, avecComptes, corpsDeFonction, premiereInstruction, sha256, lf } from './fixtures/026-pilotage/b/commun.mjs'
import { S as DS, jeuS, arbreTemoinS, CROCHET, urlDossier, canon, egal, lireRacine, CLES_SALLES, CLES_SALLE_ATTENDUES, SANS_LECTEUR, ARRIVE, MANQUE_RESERVEE } from './fixtures/026-pilotage/s/commun.mjs'
import { validerVue, DOMAINES_ATTENDUS, ARGENT_DIRECT, CLIENTS_DIRECT, estHors } from './fixtures/026-pilotage/s/contrat-vues.mjs'

const JUGE = 'station-route-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const DOUBLURES = path.join(DS, 'doublures-station.mjs')
const MARQUE = `@@${JUGE}@@ `
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'base', 'statique', 'harnais', 'enfant'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const PARTIE = o.valeurs.partie
if (!['lecture', 'reunion', 'salles2'].includes(PARTIE)) refuser(`--partie=lecture|reunion|salles2 attendue (reçu : ${PARTIE ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!process.execArgv.some((a) => /ts-loader/.test(a))) await import(pathToFileURL(LOADER).href)

const ROUTE = 'app/api/controle/station/route.ts', STATION = 'lib/pilotage/station.ts', FLAGS = 'lib/flags.ts', CARTE = 'scripts/fermeture-e2e.mjs'

// Lève un drapeau dans le TEXTE d'une copie de lib/flags.ts : exactement une déclaration littérale « nom: true|false, » (le drapeau
// peut déjà être levé sur main : busAgents l'est depuis le 29/09) ; rend le texte avec « nom: true, », ou null si zéro ou plusieurs.
function lever(texte, nom) {
  const re = new RegExp(`^([ \\t]*)${nom}:\\s*(?:true|false),`, 'gm')
  if ((texte.match(re) ?? []).length !== 1) return null
  return texte.replace(re, (_m, marge) => `${marge}${nom}: true,`)
}
const REUNION = 'app/api/agents/reunion/route.ts', CHIFFRES = 'app/api/agents/reunion/chiffres/route.ts'
const LECTEURS = ['commandement', 'radar', 'crieur', 'studio', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
const RPC_LECTURE = ['pilotage_chef', 'pilotage_agents', 'pilotage_evenements', 'station_reunion_lire', 'pilotage_compteurs_du_jour', 'pilotage_compteurs_technologies', 'pilotage_etat_envoi', 'station_experience_etat', 'pilotage_attention_sources', 'pilotage_appels', 'pilotage_envois_du_jour', 'pilotage_code_lire', 'station_objectif_actif', 'pilotage_bilan_date', 'pilotage_recettes_agents', 'pilotage_bilan', 'pilotage_tapis', 'pilotage_couts_agents', 'pilotage_couts_taches', 'pilotage_couts_modeles', 'pilotage_atelier', 'pilotage_reponses_du_jour', 'pilotage_reponses_recentes', 'pilotage_entonnoir', 'pilotage_decisions_par_cles', 'pilotage_taches_agent', 'pilotage_radar', 'pilotage_prospects_departements', 'pilotage_activite_salles']
const RPC_REUNION = ['station_reunion_ouvrir', 'station_reunion_clore', 'station_reunion_abandonner', 'station_reunion_chiffres']
const TABLES = ['alertes', 'sites_commandes', 'achats', 'passages_cron', 'app_errors', 'crieur_posts', 'packs_pubs']
const COLONNES_INTERDITES = ['email', 'tel', 'telephone', 'nom', 'sujet', 'corps', 'texte', 'message', 'destinataire', 'entreprise']
// passages_cron (0057) : `nom` est le nom du cron, sa clé primaire, jamais celui d'une personne.
const COLONNES_PERMISES = { passages_cron: ['nom'] }
const ECRITURES = ['station_consigne_transmettre', 'station_reunion_ouvrir', 'station_reunion_clore', 'station_reunion_abandonner', 'station_experience_lancer', 'station_experience_arreter']
const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const RE_TEL = /(?:\+33\s?|\b0)[1-9](?:[ .-]?\d{2}){4}\b/
const F = { uid: '90000000-0000-4000-8000-00000000f001', email: null, role: 'direction', roleInterne: 'fondateur', iat: 0, ip: '127.0.0.1' }
const UUID_R = '90000000-0000-4000-8000-000000000501'
const VERDICTS = jeuS('verdicts.json').verdicts
const M_ISO = jeuS('base-essai.json').maintenant
const url = (q) => `http://127.0.0.1/api/controle/station?${q}`

// ═══ Les enfants : les routes sur leurs doublures, et `trier` sans doublure ═══════════════════════════════════════════
/** Horloge figée : `new Date()` et `Date.now()` rendent l'instant voulu, le reste de Date est intact. */
function figer(iso) {
  const Vraie = globalThis.__DateVraie ??= Date
  const t = Vraie.parse(iso)
  class DateFigee extends Vraie { constructor(...a) { if (a.length === 0) super(t); else super(...a) } static now() { return t } }
  globalThis.Date = DateFigee
}
async function enfantDoublures(RAC, partie) {
  const res = { criteres: {}, details: {} }
  globalThis.fetch = async (u) => { throw new Error(`réseau interdit dans ${JUGE} (enfant) : ${u}`) }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const f = console[k]; console[k] = (...a) => { if (k === 'log' && String(a[0]).startsWith(MARQUE)) f(...a) } }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: {
    racine: urlDossier(RAC), depot: urlDossier(R), doublures: pathToFileURL(DOUBLURES).href,
    doubles: { 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/controle/droits': 'droits', 'lib/agents/garde': 'agents-garde', 'lib/agents/pause': 'pause', 'lib/supabaseAdmin': 'supabase', 'lib/direction/tresorerie': 'tresorerie', 'lib/direction/stripe': 'stripe' },
    prefixes: { 'lib/controle/lectures': 'lectures' }, paquets: { 'next/server': 'next' },
  } })
  const D = await import(`${pathToFileURL(DOUBLURES).href}?m=juge`)
  const E = D.etat
  const { baseEssai } = await import(pathToFileURL(path.join(DS, 'base-essai.mjs')).href)
  const importer = async (rel) => { try { return await import(pathToFileURL(path.join(RAC, rel)).href) } catch (e) { return { __erreur: premiereLigne(e) } } }
  const critere = async (id, f) => { const e = []; let d = ''; try { d = (await f(e)) ?? '' } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } (res.criteres[id] ??= []).push(...e); if (d) res.details[id] = d }
  const configurer = (x = {}) => {
    const b = baseEssai({ pannes: x.pannes ?? [], surcharges: x.surcharges ?? {} })
    E.appels.length = 0
    E.config = { drapeaux: { pilotage: true, busAgents: true, ...(x.drapeaux ?? {}) }, fondateur: F, refusGarde: x.refusGarde ?? null, refusDomaine: null, verdict: x.verdict ?? null, jetons: { 'jeton-chef-essai': 'chef', 'jeton-pont-essai': 'pont', 'jeton-standard-essai': 'standardiste' }, pause: x.pause ?? { active: false, source: 'base' }, pausePanne: !!x.pausePanne, rpc: x.rpc ?? b.rpc, table: b.table, lectures: b.lectures, mrr: x.mrr }
  }
  const lireJson = async (r) => { const t = await r.text(); try { return { t, j: JSON.parse(t) } } catch { return { t, j: null } } }

  if (partie === 'lecture' || partie === 'salles2') {
    const M = await importer(ROUTE)
    const GET = M.GET
    const salles2 = fs.existsSync(path.join(RAC, 'lib', 'pilotage', 'salles'))
    const lecteurPresent = (cle) => fs.existsSync(path.join(RAC, 'lib', 'pilotage', 'salles', `${cle}.ts`))
    const jouer = async (q, x = {}) => {
      if (typeof GET !== 'function') throw new Error(`${ROUTE} : ${M.__erreur ?? 'pas de GET'}`)
      figer(x.maintenant ?? M_ISO)
      configurer(x)
      const r = await GET(new Request(url(q)))
      const { t, j } = await lireJson(r)
      const appels = E.appels.map((a) => ({ ...a }))
      return { status: r.status, j, t, appels, rpc: appels.filter((a) => a.f === 'rpc'), from: appels.filter((a) => a.f === 'from') }
    }
    const ch = (j, chemin) => chemin.split('.').slice(1).reduce((x, k) => (x && typeof x === 'object' ? ('valeur' in x && x.valeur && typeof x.valeur === 'object' && !(k in x) ? x.valeur[k] : x[k]) : undefined), j)
    const V = (j) => j?.valeur
    const eq = (rel) => import(pathToFileURL(path.join(RAC, 'lib', 'pilotage', rel)).href)
    const toutes = [['direct', 'vue=direct', {}], ['fil', 'vue=fil', {}], ['fil', 'vue=fil&apres=41', {}], ...CLES_SALLE_ATTENDUES.map((s) => ['salle', `vue=salle&salle=${s}`, { salle: s }]), ...['chef', 'repondeur', 'facteur'].map((n) => ['agent', `vue=agent&nom=${n}`, { nom: n }])]

    if (partie === 'lecture') {
      await critere('SV-2', async (e) => {
        const a = await jouer('vue=direct', { drapeaux: { pilotage: false } })
        if (a.status !== 404) e.push(`drapeau baissé → ${a.status}, 404 attendu`)
        if (a.appels.some((x) => x.f !== 'actif')) e.push(`drapeau baissé : ${a.appels.filter((x) => x.f !== 'actif').map((x) => x.f).join(', ')} appelé(s) avant le 404 (aucune identité ne doit être lue)`)
        if (a.appels[0]?.f !== 'actif' || a.appels[0]?.drapeau !== 'pilotage') e.push('le premier appel n’est pas actif(\'pilotage\')')
        return 'doublures : drapeau baissé → 404 avant toute identité (l’arbre réel se juge sur la racine réelle)'
      })
      await critere('SV-3', async (e) => {
        const cas = [
          ['sans jeton', 'vue=direct', { refusGarde: { error: 'Jeton absent.', status: 401 } }, 401],
          ['compte artisan', 'vue=direct', { refusGarde: { error: 'Réservé aux fondateurs.', status: 403 } }, 403],
          ['vue=inconnue', 'vue=inconnue', {}, 400], ['salle=inconnue', 'vue=salle&salle=inconnue', {}, 400], ['nom=Pas-Valide', 'vue=agent&nom=Pas-Valide', {}, 400],
        ]
        for (const [quoi, q, x, st] of cas) { const r = await jouer(q, x); if (r.status !== st) e.push(`${quoi} → ${r.status}, ${st} attendu`) }
        const s = await jouer('vue=salle&salle=inconnue'); if (s.j?.error !== 'Salle inconnue.') e.push(`salle inconnue : « ${s.j?.error} », « Salle inconnue. » attendu`)
        const r = await jouer('vue=salle&salle=radar')
        if (r.status !== 200) e.push(`salle=radar → ${r.status}, 200 attendu`)
        else if (!lecteurPresent('radar') && !(r.j?.valeur === null && r.j?.manque === ARRIVE)) e.push(`salle=radar sans lecteur : valeur ${JSON.stringify(r.j?.valeur)?.slice(0, 40)}, manque « ${r.j?.manque} » ; null et « ${ARRIVE} » attendus`)
        return 'doublures : 401 sans jeton, 403 artisan, 400 vue, salle et nom inconnus (« Salle inconnue. »), salle=radar → 200'
      })
      await critere('SV-4', async (e) => {
        for (const [vue, q, x] of toutes) {
          const r = await jouer(q)
          if (r.status !== 200) { e.push(`${q} → ${r.status}${r.status >= 500 ? ' (500 interdit)' : ''}`); continue }
          const d = validerVue(r.j, { vue, ...x })
          if (d.length) e.push(`${q} hors contrat : ${d.slice(0, 2).join(' ; ')}`)
          if (vue === 'direct') for (const k of ['barre', 'equipage', 'attention', 'commandement', 'tapis', 'bandeau', 'carte']) { const s = r.j?.valeur?.[k]; if (s?.valeur === null && !(s.erreur || s.manque)) e.push(`direct.${k} nulle sans erreur ni manque`) }
        }
        return `doublures : ${toutes.length} vues (direct, fil, les 20 salles et ecommerce, trois fiches d’agent) → 200 au contrat de s/contrat-vues.mjs, jamais 500`
      })
      await critere('SV-7', async (e) => {
        for (const [vue, q, x] of toutes) {
          const r = await jouer(q)
          const permis = (vue === 'salle' && x.salle === 'standard') || (vue === 'agent' && x.nom === 'repondeur')
          if (permis) continue
          if (RE_EMAIL.test(r.t)) e.push(`${q} : une adresse e-mail dans la réponse`)
          if (RE_TEL.test(r.t)) e.push(`${q} : un numéro de téléphone dans la réponse`)
        }
        const st = await jouer('vue=salle&salle=standard')
        if (!/jean\.temoin@exemple\.invalid/.test(st.t)) e.push('salle=standard ne porte pas le texte exact des réponses (fondateurs)')
        return 'doublures : aucune adresse e-mail ni aucun numéro hors de salle=standard et agent&nom=repondeur, qui portent le texte exact'
      })
      await critere('SV-8', async (e) => {
        const a = await jouer('vue=direct', { pannes: ['pilotage_agents'] })
        const v = a.j?.valeur ?? {}
        if (a.status !== 200) e.push(`pilotage_agents en panne → ${a.status}`)
        if (!(v.equipage?.valeur === null && v.equipage?.erreur)) e.push(`pilotage_agents en panne : direct.equipage ${JSON.stringify(v.equipage)?.slice(0, 60)}, valeur nulle avec erreur attendue`)
        for (const k of ['barre', 'attention', 'commandement', 'tapis', 'bandeau', 'carte']) if (v[k]?.valeur === null || v[k]?.valeur === undefined) e.push(`pilotage_agents en panne : direct.${k} vidé (${v[k]?.erreur ?? 'sans valeur'})`)
        const b = await jouer('vue=direct', { pannes: ['*'], pausePanne: true })
        const w = b.j?.valeur ?? {}
        if (b.status !== 200) e.push(`tout en panne → ${b.status}, 200 attendu`)
        const errs = ['barre', 'equipage', 'attention', 'commandement', 'tapis', 'bandeau', 'carte'].filter((k) => w[k]?.valeur === null && String(w[k]?.erreur ?? '').trim())
        if (errs.length !== 7) e.push(`tout en panne : ${errs.length} sous-partie(s) en erreur (${errs.join(', ')}), sept attendues`)
        return 'doublures : pilotage_agents en panne → seule direct.equipage porte l’erreur ; tout en panne → 200 et sept erreurs'
      })
      await critere('SV-10', async (e) => {
        const a = await jouer('vue=fil&apres=41')
        const ev = a.rpc.find((x) => x.nom === 'pilotage_evenements')
        if (ev?.args?.p_apres !== 41) e.push(`vue=fil&apres=41 : pilotage_evenements appelé avec p_apres = ${JSON.stringify(ev?.args?.p_apres)}, 41 attendu`)
        const ids = (a.j?.valeur?.bulles ?? []).map((b) => b.id)
        const recus = baseEssai().rpc('pilotage_evenements', { p_apres: 41, p_limite: 100, p_agent: null, p_types: null }).map((x) => x.id)
        if (a.j?.valeur?.dernier_id !== Math.max(...recus)) e.push(`dernier_id ${a.j?.valeur?.dernier_id}, ${Math.max(...recus)} (le plus grand id reçu) attendu`)
        if (ids.some((x) => x <= 41)) e.push('une bulle d’id ≤ 41')
        const b = await jouer('vue=salle&salle=tresorerie', { maintenant: '2026-10-31T23:30:00Z' })
        const ab = (b.j?.valeur?.abonnements ?? []).map((x) => x.date_facture)
        if (canon(ab) !== canon(['2026-11-01'])) e.push(`le 01/11 à 00 h 30 de Paris (31/10 23:30 UTC) : achats ${JSON.stringify(ab)}, ceux de novembre seulement (["2026-11-01"]) attendus`)
        const c = await jouer('vue=salle&salle=tresorerie')
        const ac = (c.j?.valeur?.abonnements ?? []).map((x) => x.date_facture).sort()
        if (canon(ac) !== canon(['2026-10-01', '2026-10-15'])) e.push(`le 23/10 : achats ${JSON.stringify(ac)}, ceux d’octobre attendus`)
        return 'doublures : p_apres = 41 transmis, dernier_id = le plus grand id reçu ; achats du mois de Paris, juste autour de minuit UTC'
      })
      await critere('SV-12', async (e) => {
        const st = await jouer('vue=salle&salle=standard')
        if (!st.rpc.some((x) => x.nom === 'pilotage_reponses_du_jour')) e.push('salle=standard n’appelle pas pilotage_reponses_du_jour')
        const rr = st.rpc.find((x) => x.nom === 'pilotage_reponses_recentes')
        if (rr?.args?.p_limite !== 10) e.push(`pilotage_reponses_recentes appelé avec p_limite = ${JSON.stringify(rr?.args?.p_limite)}, 10 attendu`)
        const { entonnoir } = await eq('entonnoir.ts')
        const B = jeuS('base-essai.json')
        const red = await jouer('vue=salle&salle=redaction')
        if (!egal(red.j?.valeur?.variantes, entonnoir(B.rpc.pilotage_entonnoir, new Date(M_ISO)).j30.parVariante)) e.push('salle=redaction : variantes ≠ entonnoir(…).j30.parVariante')
        if (!egal(red.j?.valeur?.modeles_suspendus, B.rpc.pilotage_etat_envoi.modeles_suspendus)) e.push('salle=redaction : modèles suspendus ≠ pilotage_etat_envoi')
        const ma = await jouer('vue=salle&salle=machines')
        const noms = (ma.j?.valeur?.crons ?? []).map((x) => x.nom).sort()
        if (canon(noms) !== canon([...new Set(B.tables.passages_cron.map((x) => x.nom))].sort())) e.push(`salle=machines : crons ${JSON.stringify(noms)}, un par nom de passages_cron attendu`)
        const relances = (ma.j?.valeur?.crons ?? []).find((x) => x.nom === 'relances')
        if (relances && relances.ok !== true) e.push('salle=machines : relances n’est pas le dernier passage (réussi)')
        const mes = B.evenements_usine.filter((x) => x.type === 'usine_mesure').sort((a, b) => b.id - a.id)[0]
        if (ma.j?.valeur?.usine?.valeur?.mesure !== mes.resume) e.push(`salle=machines : usine ${JSON.stringify(ma.j?.valeur?.usine)?.slice(0, 80)}, la dernière usine_mesure attendue`)
        const sans = await jouer('vue=salle&salle=machines', { surcharges: { evenements: jeuS('evenements.json').evenements } })
        if (!(sans.j?.valeur?.usine?.valeur === null && sans.j?.valeur?.usine?.manque)) e.push('salle=machines sans mesure : usine doit être nulle avec manque')
        const en = await jouer('vue=salle&salle=envois')
        const g = B.rpc.pilotage_etat_envoi
        const gg = en.j?.valeur?.gestes ?? {}
        for (const k of ['envoi_froid', 'epreuve_passee', 'epreuve_le', 'mesure_a_sec', 'notice_verifiee_le', 'technologies_pause', 'modeles_suspendus']) if (!egal(gg[k], g[k])) e.push(`salle=envois : gestes.${k} = ${JSON.stringify(gg[k])}, ${JSON.stringify(g[k])} (pilotage_etat_envoi) attendu`)
        if ((gg.technologies_pause ?? []).some((t) => /boite|@/.test(t))) e.push('technologies_pause porte autre chose qu’un nom de technologie')
        return 'doublures : standard (p_limite 10), rédaction (variantes d’entonnoir, modèles suspendus), machines (un cron par nom, dernière mesure ou manque), envois (gestes = pilotage_etat_envoi)'
      })
      await critere('SV-13', async (e) => {
        const a = await jouer('vue=direct', { surcharges: { rpc: { pilotage_bilan_date: { bilan_le: null } } } })
        const m = [...(a.j?.valeur?.commandement?.valeur?.missions ?? []), ...(a.j?.valeur?.commandement?.valeur?.argent?.valeur?.missions ?? [])].find((x) => x.cle === 'contacts_froids')
        if (!/bilan non daté/.test(m?.libelle ?? '')) e.push(`bilan_le nul : mission « ${m?.libelle} », « bilan non daté (formulaire fermé) » attendu`)
        const b = await jouer('vue=direct')
        const m2 = (b.j?.valeur?.commandement?.valeur?.missions ?? []).find((x) => x.cle === 'contacts_froids')
        if (!/bilan du 02\/11/.test(m2?.libelle ?? '')) e.push(`bilan_le 2026-11-02 : mission « ${m2?.libelle} », « bilan du 02/11 » attendu`)
        const c = await jouer('vue=salle&salle=envois', { surcharges: { rpc: { pilotage_envois_du_jour: [], pilotage_compteurs_du_jour: [{ canal: 'formulaire_site', palier: null, plafond: 0, utilises: 0 }] } } })
        const phrase = "Aucun envoi à froid : le canal formulaire s'ouvre au plus tôt le 12/10, après la mesure à sec, l'épreuve de bout en bout et l'ouverture par Benj."
        if (c.j?.valeur?.vide !== phrase) e.push(`salle=envois sans envoi froid : vide « ${c.j?.valeur?.vide} », la phrase exacte de 026-015 attendue`)
        if (/parBoite|boites_pause/.test(c.t)) e.push('salle=envois porte parBoite ou boites_pause')
        return 'doublures : bilan non daté si la date est nulle, « bilan du 02/11 » sinon ; salle=envois : la phrase vide exacte, ni parBoite ni boites_pause'
      })
      await critere('SV-14', async (e) => {
        // Sans alerte ouverte : les rouges du veilleur rempliraient les sept places avant l'orange des appels.
        const a = await jouer('vue=direct', { surcharges: { tables: { alertes: [] } } })
        const c = (a.j?.valeur?.attention?.valeur?.cartes ?? []).filter((x) => x.cle === 'appel')
        if (c.length !== 1 || c[0].nombre !== 2 || c[0].couleur !== 'orange') e.push(`une réservation et une réponse : ${JSON.stringify(c)}, une carte appel orange de nombre 2 attendue`)
        const t = a.j?.valeur?.attention?.valeur?.total ?? 0
        if (t < 1) e.push('aucune carte Attention')
        return 'doublures : une réservation (source rdv) et une réponse « appel » → une carte appel orange de nombre 2'
      })
      await critere('SV-16', async (e) => {
        const a = await jouer('vue=direct', { verdict: VERDICTS.sante_sans_comptabilite })
        for (const c of [...ARGENT_DIRECT, ...CLIENTS_DIRECT]) if (!(c === 'direct.carte.paliers.commandement' && ch(a.j, c) === null) && !estHors(ch(a.j, c))) e.push(`route, « santé sans comptabilité » : ${c} = ${JSON.stringify(ch(a.j, c))?.slice(0, 50)}, « hors périmètre » attendu`)
        for (const k of ['barre', 'equipage', 'attention', 'commandement', 'tapis', 'carte']) if (estHors(a.j?.valeur?.[k])) e.push(`route, « santé sans comptabilité » : direct.${k} entière refusée`)
        const d = validerVue(a.j, { vue: 'direct', verdict: VERDICTS.sante_sans_comptabilite })
        if (d.length) e.push(`route, « santé sans comptabilité » : hors contrat (${d.slice(0, 2).join(' ; ')})`)
        const b = await jouer('vue=direct', { verdict: VERDICTS.sante_et_clients_sans_comptabilite })
        if (estHors(ch(b.j, 'direct.barre.sites_en_ligne')) || !estHors(ch(b.j, 'direct.barre.commandes_mois'))) e.push('route, « santé et clients sans comptabilité » : sites_en_ligne servi et commandes_mois refusé attendus')
        const f = await jouer('vue=salle&salle=tresorerie', { verdict: VERDICTS.sante_sans_comptabilite })
        if (!(f.j?.valeur === null && f.j?.nonMesure === true && f.j?.raison === 'hors périmètre')) e.push(`route : salle=tresorerie sous « santé sans comptabilité » → ${court(f.t, 80)}, « hors périmètre » attendu`)
        if (!a.appels.some((x) => x.f === 'peutFaire')) e.push('la route n’a consulté aucun verdict (peutFaire)')
        return 'route : « santé sans comptabilité » → chaque sous-partie d’argent et de clients hors périmètre, le reste servi ; « santé et clients » → SITES EN LIGNE servi, COMMANDES refusé'
      })
      await critere('SV-17', async (e) => {
        const sha = '0123456789abcdef0123'
        process.env.VERCEL_GIT_COMMIT_SHA = sha
        const a = await jouer('vue=direct')
        delete process.env.VERCEL_GIT_COMMIT_SHA
        const b = await jouer('vue=direct')
        if (ch(a.j, 'direct.barre.version')?.valeur !== sha.slice(0, 7)) e.push(`version avec VERCEL_GIT_COMMIT_SHA : ${JSON.stringify(ch(a.j, 'direct.barre.version')?.valeur)}, « ${sha.slice(0, 7)} » attendue`)
        if (ch(b.j, 'direct.barre.version')?.valeur !== 'dev') e.push(`version sans la variable : ${JSON.stringify(ch(b.j, 'direct.barre.version')?.valeur)}, « dev » attendue`)
        const B = jeuS('base-essai.json'), m = Date.parse(M_ISO)
        const erreurs = B.tables.app_errors.filter((x) => Date.parse(x.created_at) >= m - 24 * 3_600_000).length
        if (ch(b.j, 'direct.barre.erreurs')?.valeur !== erreurs) e.push(`erreurs = ${JSON.stringify(ch(b.j, 'direct.barre.erreurs')?.valeur)}, ${erreurs} (app_errors des 24 dernières heures) attendu`)
        if (ch(b.j, 'direct.barre.commandes_mois')?.valeur !== 3) e.push(`commandes_mois = ${JSON.stringify(ch(b.j, 'direct.barre.commandes_mois')?.valeur)}, 3 (commandes du mois de Paris, hors brouillon) attendu`)
        if (!b.appels.some((x) => x.f === 'ventesSites')) e.push('commandes_mois ne passe pas par ventesSites (la fonction de ventes_sites, 026-055)')
        if (ch(b.j, 'direct.barre.sites_en_ligne')?.valeur !== 1) e.push(`sites_en_ligne = ${JSON.stringify(ch(b.j, 'direct.barre.sites_en_ligne')?.valeur)}, 1 attendu`)
        const sante = ch(b.j, 'direct.barre.sante')
        if (!salles2 && !(sante?.valeur === null && sante?.manque === ARRIVE)) e.push(`sante avant 026-178 : ${JSON.stringify(sante)?.slice(0, 60)}, manque « ${ARRIVE} » attendu`)
        return `doublures : version « ${sha.slice(0, 7)} » ou « dev », erreurs des 24 h, commandes du mois par ventesSites, sites en ligne${salles2 ? ' (santé : SL-3)' : ', santé « arrive avec sa fiche »'}`
      })
      await critere('SV-18', async (e) => {
        const r = await jouer('vue=salle&salle=ecommerce')
        if (r.status !== 200 || r.j?.valeur !== null || r.j?.source !== 'reservee' || r.j?.manque !== MANQUE_RESERVEE) e.push(`salle=ecommerce → ${r.status} ${court(r.t, 100)} ; 200 { valeur: null, source: 'reservee', manque: '${MANQUE_RESERVEE}' } attendu`)
        if (r.rpc.length || r.from.length) e.push(`salle=ecommerce : ${r.rpc.length} rpc( et ${r.from.length} .from( (aucun attendu)`)
        let sans = 0
        for (const s of SANS_LECTEUR) {
          if (lecteurPresent(s)) continue
          sans++
          const x = await jouer(`vue=salle&salle=${s}`)
          if (x.status !== 200 || x.j?.valeur !== null || x.j?.manque !== ARRIVE) e.push(`salle=${s} sans lecteur → ${x.status} ${court(x.t, 80)} ; manque « ${ARRIVE} » attendu`)
          if (x.rpc.length || x.from.length) e.push(`salle=${s} sans lecteur : ${x.rpc.length} rpc( et ${x.from.length} .from( (aucun attendu)`)
        }
        return `doublures : ecommerce réservée sans appel à la base ; ${sans} salle(s) sans lecteur → « ${ARRIVE} » sans appel ; ${SANS_LECTEUR.length - sans} avec leur lecteur (026-178, jugées par SV-4 et --partie=salles2)`
      })
      await critere('SV-19', async (e) => {
        let n = 0
        for (const s of ['usine', 'atelier']) {
          const r = await jouer(`vue=salle&salle=${s}`)
          const signes = r.appels.filter((x) => x.f === 'createSignedUrl')
          if (r.appels.some((x) => x.f === 'getPublicUrl')) e.push(`salle=${s} : getPublicUrl appelé`)
          if (/\/object\/public\//.test(r.t)) e.push(`salle=${s} : une adresse publique de bucket`)
          for (const x of signes) if (!(x.secondes > 0 && x.secondes <= 600)) e.push(`salle=${s} : lien signé de ${x.secondes} s (600 au plus)`)
          const liste = s === 'usine' ? r.j?.valeur?.commandes : r.j?.valeur?.maquettes
          const avec = (liste ?? []).filter((x) => x.apercu)
          n += avec.length
          if (!avec.length) e.push(`salle=${s} : aucun aperçu signé`)
          for (const x of avec) if (!signes.some((y) => x.apercu.includes(y.chemin))) e.push(`salle=${s} : aperçu « ${court(x.apercu, 60)} » qui ne vient pas de createSignedUrl`)
        }
        return `doublures : ${n} aperçus, chacun de createSignedUrl(…, ≤ 600 s) du bucket privé ; aucune adresse publique`
      })
      await critere('SV-20', async (e) => {
        const B = jeuS('base-essai.json')
        const r = await jouer('vue=salle&salle=machines')
        const ia = r.j?.valeur?.ia?.valeur
        const f = (ia?.fournisseurs ?? []).map((x) => x.objet).sort()
        if (canon(f) !== canon(['ia:codex', 'ia:gemini'])) e.push(`ia.fournisseurs : ${JSON.stringify(f)}, un par objet (ia:codex, ia:gemini) attendu`)
        const gem = (ia?.fournisseurs ?? []).find((x) => x.objet === 'ia:gemini')
        if (gem?.resume !== 'Gemini : 55 % du quota du jour') e.push(`ia:gemini : « ${gem?.resume} », le dernier ia_quota attendu`)
        const bas = ia?.bascules ?? []
        if (bas.length > 20 || !bas.length) e.push(`ia.bascules : ${bas.length}, 1 à 20 attendues`)
        if (bas.some((x) => Date.parse(x.le) < Date.parse(M_ISO) - 24 * 3_600_000)) e.push('ia.bascules : une bascule de plus de 24 h')
        const somme = B.rpc.pilotage_couts_modeles.reduce((s, x) => s + x.eur, 0)
        if (ia?.cout_jour_eur !== somme) e.push(`ia.cout_jour_eur = ${ia?.cout_jour_eur}, ${somme} (la somme de pilotage_couts_modeles) attendu`)
        const vieux = await jouer('vue=salle&salle=machines', { surcharges: { evenements: [...jeuS('evenements.json').evenements, ...B.evenements_usine.map((x) => ({ ...x, le: new Date(Date.parse(x.le) - 3 * 3_600_000).toISOString() }))] } })
        const v = vieux.j?.valeur?.ia
        if (!(v?.valeur === null && v?.manque === 'mesure des IA gratuites absente')) e.push(`aucun événement de moins de 2 h : ia ${JSON.stringify(v)?.slice(0, 60)}, null avec « mesure des IA gratuites absente » attendu`)
        const t = await jouer('vue=salle&salle=tresorerie')
        if (t.j?.valeur && 'credit' in t.j.valeur) e.push('salle=tresorerie porte encore « credit »')
        if (t.j?.valeur?.total_modeles_eur !== somme) e.push(`total_modeles_eur = ${t.j?.valeur?.total_modeles_eur}, ${somme} attendu`)
        return 'doublures : dernier ia_quota par objet, 20 bascules au plus sur 24 h, coût du jour = la somme servie, « mesure des IA gratuites absente » sans événement récent ; trésorerie : modeles et total, plus de credit'
      })
      await critere('SV-21', async (e) => {
        const { modeleAffiche } = await eq('equipage.ts')
        const A = jeuS('agents.json').agents
        const r = await jouer('vue=direct')
        const cartes = r.j?.valeur?.equipage?.valeur?.agents ?? []
        if (!cartes.length) e.push('direct.equipage sans agents')
        for (const c of cartes) { const l = A.find((x) => x.nom === c.nom); if (!egal(c.modele, modeleAffiche(l, new Date(M_ISO)))) { e.push(`${c.nom} : modele ${JSON.stringify(c.modele)} ≠ modeleAffiche de sa ligne`); break } }
        const inc = cartes.find((c) => c.nom === 'agent_temoin_inconnu')
        if (inc && inc.modele?.texte !== 'sans IA') e.push(`agent sans ligne de coût ni MOTEUR_DE : « ${inc.modele?.texte} », « sans IA » attendu`)
        const f = await jouer('vue=agent&nom=facteur')
        if (!egal(f.j?.valeur?.modele, modeleAffiche(A.find((x) => x.nom === 'facteur'), new Date(M_ISO)))) e.push(`fiche agent facteur : modele ${JSON.stringify(f.j?.valeur?.modele)} ≠ modeleAffiche`)
        return 'doublures : chaque carte et la fiche d’agent portent modeleAffiche de leur ligne ; « sans IA » pour un agent sans ligne ni MOTEUR_DE'
      })
      await critere('SV-22', async (e) => {
        const { etatExperience } = await eq('experience.ts')
        const B = jeuS('base-essai.json')
        const r = await jouer('vue=direct')
        const carte = r.j?.valeur?.carte?.valeur ?? {}
        for (const k of ['lignes', 'experience', 'paliers', 'nuit', 'egaliseur', 'departements']) { const x = carte[k]; if (!x || typeof x !== 'object' || !('valeur' in x) || !(x.source || x.nonMesure)) e.push(`direct.carte.${k} n’est pas une enveloppe`) }
        const sites = carte.lignes?.valeur?.sites?.valeur?.etapes ?? []
        const attendu = {}; for (const s of B.tables.sites_commandes) if (s.etat !== 'brouillon') attendu[s.etat] = (attendu[s.etat] ?? 0) + 1
        for (const x of sites) if (x.jour !== (attendu[x.cle] ?? 0) || (x.source === 'absente') !== !(x.cle in attendu)) e.push(`lignes.sites.${x.cle} : ${x.jour} (${x.source}), ${attendu[x.cle] ?? 0} attendu`)
        if (!sites.length) e.push('lignes.sites sans étapes')
        if (!salles2) {
          for (const l of ['contenu', 'packs']) for (const x of carte.lignes?.valeur?.[l]?.valeur?.etapes ?? []) if (x.source !== 'absente' || x.jour !== 0) e.push(`lignes.${l}.${x.cle} : ${x.jour} (${x.source}), absente attendue avant 026-178`)
          for (const k of ['egaliseur', 'departements']) if (carte[k]?.manque !== ARRIVE) e.push(`carte.${k} : manque « ${carte[k]?.manque} », « ${ARRIVE} » attendu avant 026-178`)
        }
        if (!egal(carte.experience?.valeur, etatExperience(B.rpc.station_experience_etat, new Date(M_ISO)))) e.push('carte.experience ≠ etatExperience de la doublure')
        const soir = await jouer('vue=direct', { maintenant: '2026-10-23T18:00:00Z' }), matin = await jouer('vue=direct', { maintenant: '2026-10-23T05:00:00Z' })
        if (soir.j?.valeur?.carte?.valeur?.nuit?.valeur !== true || matin.j?.valeur?.carte?.valeur?.nuit?.valeur !== false) e.push(`nuit : ${soir.j?.valeur?.carte?.valeur?.nuit?.valeur} à 20 h 00 et ${matin.j?.valeur?.carte?.valeur?.nuit?.valeur} à 7 h 00 de Paris ; vrai puis faux attendus`)
        const h = await jouer('vue=direct', { verdict: VERDICTS.sante_sans_comptabilite })
        const hc = h.j?.valeur?.carte?.valeur ?? {}
        if (!estHors(hc.lignes?.valeur?.packs) || !estHors(hc.experience)) e.push('« santé sans comptabilité » : lignes.packs et experience doivent être hors périmètre')
        for (const k of ['paliers', 'nuit', 'egaliseur', 'departements']) if (estHors(hc[k])) e.push(`« santé sans comptabilité » : carte.${k} refusée à tort`)
        if (estHors(hc.lignes?.valeur?.contenu)) e.push('« santé sans comptabilité » : lignes.contenu refusée à tort')
        return 'doublures : six enveloppes ; lignes.sites = le compte par état ; experience = etatExperience ; nuit vraie à 20 h, fausse à 7 h ; packs et experience hors périmètre sans comptabilité, le reste servi'
      })
    }

    if (partie === 'salles2') {
      const MIN_PARIS = '2026-10-22T22:00:00.000Z'
      const vues = {}
      for (const s of [...LECTEURS, 'ecommerce', 'tresorerie']) vues[s] = await jouer(`vue=salle&salle=${s}`)
      const direct = await jouer('vue=direct')
      await critere('SL-2', async (e) => {
        const DOM = { commandement: 'sante', radar: 'sante', crieur: 'sante', studio: 'sante', chantier: 'sante', audience: 'audience', securite: 'securite', presti: 'clients', observatoire: 'sante', repos: 'sante' }
        for (const [s, d] of Object.entries(DOM)) {
          const ok = vues[s]
          if (ok.status !== 200 || ok.j?.valeur === null) { e.push(`salle=${s} → ${ok.status} ${court(ok.t, 80)}, sa forme attendue`); continue }
          const refuse = await jouer(`vue=salle&salle=${s}`, { verdict: Object.fromEntries(Object.keys(VERDICTS.fondateur).map((k) => [k, k !== d])) })
          if (!(refuse.j?.valeur === null && refuse.j?.raison === 'hors périmètre')) e.push(`salle=${s} sans le domaine ${d} : ${court(refuse.t, 80)}, « hors périmètre » attendu`)
          const d2 = validerVue(ok.j, { vue: 'salle', salle: s }); if (d2.length) e.push(`salle=${s} hors contrat : ${d2.slice(0, 2).join(' ; ')}`)
        }
        const sansArgent = { ...VERDICTS.fondateur, comptabilite: false, support: false }
        const p = await jouer('vue=salle&salle=presti', { verdict: sansArgent })
        if (!estHors(p.j?.valeur?.mrr) || !estHors(p.j?.valeur?.tickets) || estHors(p.j)) e.push('salle=presti sans comptabilité ni support : mrr et tickets hors périmètre, le reste servi, attendus')
        for (const [s, k] of [['commandement', 'argent'], ['studio', 'montants']]) { const x = await jouer(`vue=salle&salle=${s}`, { verdict: sansArgent }); if (!estHors(x.j?.valeur?.[k])) e.push(`salle=${s} sans comptabilité : ${k} doit être hors périmètre`) }
        const f = (s) => vues[s].appels.map((x) => x.f)
        for (const [s, fns] of [['audience', ['audience']], ['securite', ['bans']], ['presti', ['clients', 'cerveaux', 'ticketsOuverts', 'mrr']]]) for (const fn of fns) if (!f(s).includes(fn)) e.push(`salle=${s} n’appelle pas ${fn}() (026-174) : une requête recopiée ?`)
        if (!f('radar').includes('rpc') || !vues.radar.rpc.some((x) => x.nom === 'pilotage_radar')) e.push('salle=radar n’appelle pas pilotage_radar()')
        if (!vues.observatoire.rpc.some((x) => x.nom === 'pilotage_prospects_departements')) e.push('salle=observatoire n’appelle pas pilotage_prospects_departements()')
        return 'doublures : chaque salle servie sous son domaine (audience, sécurité, clients, santé), hors périmètre sans lui ; MRR et tickets de Presti, argent du Commandement, montants du Studio refusés sans comptabilité ; lectures de 026-174 et 026-175 appelées'
      })
      await critere('SL-3', async (e) => {
        const s = ch(direct.j, 'direct.barre.sante')
        if (!egal(s?.valeur, jeuS('base-essai.json').lectures.santeService)) e.push(`direct.barre.sante = ${JSON.stringify(s)?.slice(0, 80)}, la sortie de santeService() attendue`)
        if (!direct.appels.some((x) => x.f === 'santeService')) e.push('santeService() n’est pas appelée')
        const p = await jouer('vue=direct', { pannes: ['lecture:santeService'] })
        const sp = ch(p.j, 'direct.barre.sante')
        if (!(sp?.valeur === null && sp?.erreur) || p.j?.valeur?.barre?.valeur === null) e.push('santeService en panne : seule la sous-partie sante porte l’erreur')
        return 'doublures : direct.barre.sante = santeService() (026-174) ; en panne, seule la sous-partie tombe'
      })
      await critere('SL-4', async (e) => {
        const act = Object.fromEntries(jeuS('activite-salles.json').activite.map((x) => [x.salle, x.minutes]))
        for (const s of LECTEURS) {
          const a = vues[s].j?.valeur?.active_auj
          if (a?.valeur?.minutes !== (act[s] ?? 0)) e.push(`salle=${s} : active_auj ${JSON.stringify(a)?.slice(0, 50)}, ${act[s] ?? 0} min attendues`)
          const r = vues[s].rpc.find((x) => x.nom === 'pilotage_activite_salles')
          if (r?.args?.p_depuis !== MIN_PARIS) e.push(`salle=${s} : pilotage_activite_salles(p_depuis ${JSON.stringify(r?.args?.p_depuis)}), minuit à Paris (${MIN_PARIS}) attendu`)
        }
        return `doublures : ACTIVE AUJ. de chaque salle = pilotage_activite_salles(${MIN_PARIS})`
      })
      await critere('SL-5', async (e) => {
        const pieges = [...jeuS('departements.json').pieges, ...jeuS('tickets.json').pieges, 'Toitures Témoin', 'Menuiserie Témoin', 'Maçonnerie Témoin', 'Plomberie Témoin', 'abonne.temoin@exemple.invalid', 'Jean Témoin']
        for (const [s, r] of Object.entries(vues)) for (const p of pieges) if (r.t.includes(p)) e.push(`salle=${s} porte « ${p} »`)
        for (const p of pieges) if (direct.t.includes(p)) e.push(`direct porte « ${p} »`)
        for (const d of vues.observatoire.j?.valeur?.departements ?? []) { const k = Object.keys(d).sort().join(','); if (k !== 'contactes,departement,oui,trouves') { e.push(`observatoire : colonnes ${k}, agrégées seulement attendues`); break } }
        const dep = ch(direct.j, 'direct.carte.departements')?.valeur ?? []
        for (const d of dep) if (Object.keys(d).length !== 4) { e.push('carte.departements : une ligne nominative'); break }
        return 'doublures : aucun nom de personne ni d’entreprise (pièges de departements.json, tickets.json, sites_commandes, audience) ; l’Observatoire et la carte agrégés par département'
      })
      await critere('SL-6', async (e) => {
        const t = vues.presti.j?.valeur?.tickets
        if (!egal(t?.valeur, { nombre: 3 })) e.push(`salle=presti : tickets ${JSON.stringify(t)?.slice(0, 80)}, { nombre: 3 } seul attendu`)
        for (const p of jeuS('tickets.json').pieges) if (vues.presti.t.includes(p)) e.push(`salle=presti porte le contenu d’un ticket (« ${p} »)`)
        return 'doublures : un nombre de tickets ({ nombre: 3 }), jamais un contenu'
      })
      await critere('SL-7', async (e) => {
        const r = vues.ecommerce
        if (r.j?.valeur !== null || r.j?.source !== 'reservee' || r.j?.manque !== MANQUE_RESERVEE || r.rpc.length || r.from.length) e.push(`salle=ecommerce : ${court(r.t, 100)} (${r.rpc.length} rpc, ${r.from.length} from) ; la réponse réservée, sans appel, attendue`)
        return 'doublures : ecommerce reste la réponse réservée, sans appel à la base'
      })
      await critere('SL-8', async (e) => {
        for (const s of CLES_SALLES) { const r = s in vues ? vues[s] : await jouer(`vue=salle&salle=${s}`); if (r.j?.manque === ARRIVE || r.j?.valeur === null) e.push(`salle=${s} rend encore ${r.j?.manque ? `« ${r.j.manque} »` : 'une valeur nulle'}`) }
        for (const c of ['direct.barre.sante', 'direct.carte.egaliseur', 'direct.carte.departements']) if (ch(direct.j, c)?.manque === ARRIVE) e.push(`${c} rend encore « ${ARRIVE} »`)
        if (vues.tresorerie.j?.valeur?.parNature?.manque === ARRIVE) e.push('salle=tresorerie : parNature rend encore « arrive avec sa fiche »')
        return 'doublures : plus aucune des 20 salles, ni la santé de la barre, ni l’égaliseur, ni les départements, ni la répartition par nature ne rend « arrive avec sa fiche »'
      })
      await critere('SL-9', async (e) => {
        const B = jeuS('base-essai.json')
        const c = direct.j?.valeur?.carte?.valeur ?? {}
        if (!egal(c.egaliseur?.valeur, B.rpc.pilotage_radar.egaliseur)) e.push(`carte.egaliseur ${JSON.stringify(c.egaliseur?.valeur)}, les 12 valeurs de pilotage_radar() attendues`)
        const dep = jeuS('departements.json').departements.map((d) => ({ departement: d.departement, trouves: d.trouves, contactes: d.contactes, oui: d.oui }))
        if (!egal(c.departements?.valeur, dep)) e.push('carte.departements ≠ les lignes agrégées de pilotage_prospects_departements()')
        const et = (l, k) => (c.lignes?.valeur?.[l]?.valeur?.etapes ?? []).find((x) => x.cle === k)
        if (et('contenu', 'programmee')?.jour !== 1 || et('contenu', 'publiee')?.jour !== 1 || et('contenu', 'idee')?.source !== 'absente') e.push(`lignes.contenu : ${JSON.stringify(c.lignes?.valeur?.contenu?.valeur?.etapes?.map((x) => [x.cle, x.jour, x.source]))} ; programmee 1, publiee 1, idee absente attendus (crieur_posts)`)
        if (et('packs', 'paye')?.jour !== 1 || et('packs', 'livre')?.jour !== 1 || et('packs', 'dossier')?.source !== 'absente') e.push(`lignes.packs : ${JSON.stringify(c.lignes?.valeur?.packs?.valeur?.etapes?.map((x) => [x.cle, x.jour, x.source]))} ; paye 1, livre 1, dossier absente attendus (packs_pubs)`)
        const h = await jouer('vue=direct', { verdict: VERDICTS.sante_sans_comptabilite })
        if (!estHors(h.j?.valeur?.carte?.valeur?.lignes?.valeur?.packs)) e.push('lignes.packs non refusée sans comptabilité')
        return 'doublures : égaliseur de 12 h de pilotage_radar(), départements agrégés, lignes contenu (crieur_posts) et packs (packs_pubs), une étape sans source absente ; packs hors périmètre sans comptabilité'
      })
    }
    // Les appels de toutes les vues, pour la lecture des tables (SV-6) et des écritures (SV-9).
    await critere(partie === 'lecture' ? 'SV-6' : 'SL-2', async (e) => {
      const vus = new Set()
      for (const [, q] of toutes) {
        const r = await jouer(q)
        for (const x of r.rpc) { vus.add(x.nom); if (!RPC_LECTURE.includes(x.nom)) e.push(`${q} : rpc('${x.nom}') hors de la liste fermée des lectures`) }
        for (const x of r.from) {
          if (!TABLES.includes(x.table)) e.push(`${q} : .from('${x.table}') hors des tables permises`)
          const cols = typeof x.q.colonnes === 'string' ? x.q.colonnes.split(',').map((c) => c.trim()) : []
          if (!cols.length || cols.includes('*')) e.push(`${q} : .from('${x.table}') sans liste de colonnes explicite`)
          const mauvaises = cols.filter((c) => COLONNES_INTERDITES.includes(c) && !(COLONNES_PERMISES[x.table] ?? []).includes(c))
          if (mauvaises.length) e.push(`${q} : .from('${x.table}') lit ${mauvaises.join(', ')}`)
          if (x.table === 'alertes' && cols.some((c) => !['motif', 'gravite', 'cree_le', 'id'].includes(c))) e.push(`alertes : colonnes ${cols.join(', ')} (motif, gravite, cree_le seulement)`)
        }
        for (const x of r.appels) if (['schema', 'insert', 'update', 'delete', 'upsert'].includes(x.f)) e.push(`${q} : ${x.f}( appelé`)
      }
      return `doublures : ${vus.size} fonctions lues, toutes de la liste fermée ; tables permises, colonnes explicites, ni e-mail, ni téléphone, ni nom, ni sujet, ni corps`
    })
  }

  if (partie === 'reunion') {
    const MR = await importer(REUNION), MC = await importer(CHIFFRES)
    const jouer = async (mod, meth, { jeton, corps, drapeaux, rpc } = {}) => {
      const f = mod?.[meth]
      if (typeof f !== 'function') throw new Error(`${mod === MR ? REUNION : CHIFFRES} : ${mod?.__erreur ?? `pas de ${meth}`}`)
      figer(M_ISO)
      configurer({ drapeaux, rpc: rpc ?? ((nom) => (nom === 'station_reunion_ouvrir' ? UUID_R : nom === 'station_reunion_chiffres' ? jeuS('chiffres-reunion.json').chiffres : true)) })
      const h = { 'content-type': 'application/json', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) }
      const r = await f(new Request(`http://127.0.0.1/api/agents/reunion${mod === MC ? '/chiffres' : ''}`, { method: meth, headers: h, body: corps === undefined ? undefined : JSON.stringify(corps) }))
      const { t, j } = await lireJson(r)
      const appels = E.appels.map((a) => ({ ...a }))
      return { status: r.status, j, t, appels, rpc: appels.filter((a) => a.f === 'rpc') }
    }
    const CLORE = (x = {}) => ({ action: 'clore', id: UUID_R, lignes: ['12 formulaires soumis hier', 'Deux réponses'], objectif: { libelle: 'Dix formulaires par jour', mesure: 'contacts_froids', cible: 100 }, idees: ['chef:2026-10-23:idee-relance-couvreurs'], ...x })
    await critere('RA-1', async (e) => {
      for (const [mod, meth] of [[MR, 'POST'], [MC, 'GET']]) for (const d of [{ busAgents: false, pilotage: true }, { busAgents: true, pilotage: false }]) {
        const r = await jouer(mod, meth, { jeton: 'jeton-chef-essai', corps: meth === 'POST' ? { action: 'ouvrir' } : undefined, drapeaux: d })
        if (r.status !== 404) e.push(`${meth} drapeaux ${JSON.stringify(d)} → ${r.status}, 404 attendu`)
        if (r.appels.some((x) => x.f === 'authAgent' || x.f === 'rpc')) e.push(`${meth} drapeaux ${JSON.stringify(d)} : authAgent ou rpc appelé avant le 404`)
      }
      return 'doublures : un drapeau baissé (busAgents ou pilotage) → 404 avant authAgent'
    })
    await critere('RA-2', async (e) => {
      for (const corps of [{ action: 'ouvrir', p_agent: 'chef' }, { action: 'ouvrir', agent: 'chef' }]) {
        const r = await jouer(MR, 'POST', { jeton: 'jeton-pont-essai', corps })
        if (r.status !== 403 || r.rpc.length) e.push(`jeton de pont, corps ${JSON.stringify(corps)} → ${r.status} et ${r.rpc.length} rpc(, 403 sans rpc attendu`)
      }
      const r = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps: { action: 'ouvrir' } })
      if (r.rpc[0]?.args?.p_agent !== 'chef') e.push(`p_agent ${JSON.stringify(r.rpc[0]?.args?.p_agent)}, « chef » (de l’authentification) attendu`)
      return 'doublures : le jeton de pont avec p_agent ou agent « chef » dans le corps → 403 ; p_agent vient de l’authentification'
    })
    await critere('RA-3', async (e) => {
      for (const [mod, meth] of [[MR, 'POST'], [MC, 'GET']]) for (const j of ['jeton-pont-essai', 'jeton-standard-essai']) {
        const r = await jouer(mod, meth, { jeton: j, corps: meth === 'POST' ? { action: 'ouvrir' } : undefined })
        if (r.status !== 403 || r.rpc.length) e.push(`${meth} avec ${j} → ${r.status} (${r.rpc.length} rpc), 403 sans rpc attendu`)
      }
      const o1 = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps: { action: 'ouvrir' } })
      if (o1.status !== 200 || o1.j?.id !== UUID_R || o1.rpc.length !== 1 || o1.rpc[0].nom !== 'station_reunion_ouvrir' || !egal(o1.rpc[0].args, { p_agent: 'chef' })) e.push(`ouvrir : ${o1.status} ${court(o1.t, 60)}, rpc ${JSON.stringify(o1.rpc.map((x) => [x.nom, x.args]))} ; 200 { id } et un station_reunion_ouvrir { p_agent: 'chef' } attendus`)
      const lignes6 = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => `Ligne ${x}`)
      for (const [quoi, corps] of [['6 lignes', CLORE({ lignes: lignes6 })], ['une ligne de 141 signes', CLORE({ lignes: ['x'.repeat(141)] })], ['4 idées', CLORE({ idees: ['chef:2026-10-23:idee-a', 'chef:2026-10-23:idee-b', 'chef:2026-10-23:idee-c', 'chef:2026-10-23:idee-d'] })], ['id hors UUID', CLORE({ id: 'pas-un-uuid' })]]) {
        const r = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps })
        if (r.status !== 400 || r.rpc.length) e.push(`clore à ${quoi} → ${r.status} et ${r.rpc.length} rpc(, 400 sans rpc attendu`)
      }
      const cl = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps: CLORE() })
      if (cl.status !== 200 || cl.rpc.length !== 1 || cl.rpc[0].nom !== 'station_reunion_clore' || cl.rpc[0].args.p_agent !== 'chef') e.push(`clore conforme : ${cl.status}, ${JSON.stringify(cl.rpc.map((x) => x.nom))}`)
      const ab = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps: { action: 'abandonner', id: UUID_R, motif: 'plan_refuse' } })
      if (ab.status !== 200 || ab.rpc[0]?.nom !== 'station_reunion_abandonner') e.push(`abandonner : ${ab.status}, ${JSON.stringify(ab.rpc.map((x) => x.nom))}`)
      const ERR = [['ouvrir', 'ops:agent', 403], ['ouvrir', 'ops:pause', 409], ['ouvrir', 'ops:deja_ouverte', 409], ['ouvrir', 'ops:deja_tenue', 409], ['clore', 'ops:reunion', 404], ['clore', 'ops:lignes', 400], ['clore', 'ops:objectif', 400], ['clore', 'ops:idees', 400], ['clore', 'autre panne', 503]]
      for (const [action, msg, st] of ERR) {
        const r = await jouer(MR, 'POST', { jeton: 'jeton-chef-essai', corps: action === 'ouvrir' ? { action } : CLORE(), rpc: () => new Error(msg) })
        if (r.status !== st) e.push(`${action}, erreur ${msg} → ${r.status}, ${st} attendu`)
        if (msg === 'ops:pause' && r.j?.code !== 'pause') e.push(`ops:pause → code ${JSON.stringify(r.j?.code)}, « pause » attendu`)
      }
      const c = await jouer(MC, 'GET', { jeton: 'jeton-chef-essai' })
      if (c.status !== 200 || c.rpc.length !== 1 || c.rpc[0].nom !== 'station_reunion_chiffres' || !egal(c.j?.chiffres, jeuS('chiffres-reunion.json').chiffres)) e.push(`chiffres : ${c.status}, ${JSON.stringify(c.rpc.map((x) => x.nom))}, ${court(c.t, 60)} ; 200 { chiffres } et un seul station_reunion_chiffres attendus`)
      const c2 = await jouer(MC, 'GET', { jeton: 'jeton-chef-essai', rpc: () => new Error('panne') })
      if (c2.status !== 503) e.push(`chiffres en panne → ${c2.status}, 503 attendu`)
      return 'doublures : pont et standardiste → 403 ; ouvrir → un station_reunion_ouvrir { p_agent: chef } et { id } ; 6 lignes, 141 signes, 4 idées → 400 sans rpc ; codes d’erreur traduits ; chiffres → un station_reunion_chiffres'
    })
    await critere('RA-4', async (e) => {
      for (const [mod, meth] of [[MR, 'POST'], [MC, 'GET']]) {
        const a = await jouer(mod, meth, { corps: meth === 'POST' ? { action: 'ouvrir' } : undefined })
        if (a.status !== 401) e.push(`${meth} sans jeton → ${a.status}, 401 attendu`)
        const b = await jouer(mod, meth, { jeton: 'jeton-invente', corps: meth === 'POST' ? { action: 'ouvrir' } : undefined })
        if (![401, 403].includes(b.status)) e.push(`${meth} jeton inventé → ${b.status}, 401 ou 403 attendu`)
        if (a.rpc.length || b.rpc.length) e.push(`${meth} sans jeton valide : rpc( appelé`)
      }
      return 'doublures : sans jeton → 401, jeton inventé → 401 ou 403, jamais 500, aucun rpc('
    })
  }
  console.log(MARQUE + JSON.stringify(res))
}

async function enfantPur(RAC) {
  const res = { criteres: {}, details: {} }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const f = console[k]; console[k] = (...a) => { if (k === 'log' && String(a[0]).startsWith(MARQUE)) f(...a) } }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: urlDossier(RAC), depot: urlDossier(R), doublures: '', doubles: {}, prefixes: {}, paquets: {} } })
  const critere = async (id, f) => { const e = []; let d = ''; try { d = (await f(e)) ?? '' } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } (res.criteres[id] ??= []).push(...e); if (d) res.details[id] = d }
  let st = null
  try { st = await import(pathToFileURL(path.join(RAC, STATION)).href) } catch (err) { res.criteres['SV-15'] = [`${STATION} ne s’importe pas sans doublure : ${premiereLigne(err)}`]; res.criteres['SV-16'] = ['trier non importée']; console.log(MARQUE + JSON.stringify(res)); return }
  await critere('SV-15', async (e) => {
    const D = st.DOMAINE_DE
    if (!D || typeof D !== 'object') return e.push('DOMAINE_DE absent de station.ts (ou pas un objet)')
    for (const [k, d] of Object.entries(DOMAINES_ATTENDUS)) if (D[k] !== d) e.push(`DOMAINE_DE['${k}'] = ${JSON.stringify(D[k])}, ${d} attendu`)
    return `DOMAINE_DE importé : ${Object.keys(D).length} objets ; commandes, ventes (bandeau), étape PAYÉ, packs, recettes et trésorerie sous comptabilite ; SITES EN LIGNE, lignes.sites et l’Usine sous clients`
  })
  await critere('SV-16', async (e) => {
    if (typeof st.trier !== 'function') return e.push('trier absente de station.ts')
    const base = gelerProfond(jeuS('vue-direct.json').reponse)
    const avant = canon(base)
    const tout = st.trier(base, (d) => VERDICTS.fondateur[d] === true, 'direct')
    if (!egal(tout, base)) e.push('verdict fondateur : la réponse change')
    const ch = (x, c) => c.split('.').slice(1).reduce((y, k) => (y && typeof y === 'object' ? (y.valeur && typeof y.valeur === 'object' && !(k in y) ? y.valeur[k] : y[k]) : undefined), x)
    const s = st.trier(base, (d) => VERDICTS.sante_sans_comptabilite[d] === true, 'direct')
    for (const c of [...ARGENT_DIRECT, ...CLIENTS_DIRECT]) { const x = ch(s, c); if (c === 'direct.carte.paliers.commandement' && ch(base, c) === null && x === null) continue; if (!estHors(x)) e.push(`« santé sans comptabilité » : ${c} = ${JSON.stringify(x)?.slice(0, 40)}, { valeur: null, nonMesure: true, raison: 'hors périmètre' } attendu (jamais 0 ni [])`) }
    for (const c of Object.keys(DOMAINES_ATTENDUS).filter((k) => k.startsWith('direct.') && ![...ARGENT_DIRECT, ...CLIENTS_DIRECT].some((a) => k === a || k.startsWith(`${a}.`)))) {
      const x = ch(s, c), y = ch(base, c)
      if (y === undefined) continue
      if (estHors(x)) e.push(`« santé sans comptabilité » : ${c} refusée à tort`)
      else if (!y?.valeur || typeof y.valeur !== 'object' || Array.isArray(y.valeur)) { if (!egal(x, y)) e.push(`« santé sans comptabilité » : ${c} modifiée`) }
    }
    const c2 = st.trier(base, (d) => VERDICTS.sante_et_clients_sans_comptabilite[d] === true, 'direct')
    if (estHors(ch(c2, 'direct.barre.sites_en_ligne')) || !estHors(ch(c2, 'direct.barre.commandes_mois'))) e.push('« santé et clients sans comptabilité » : sites_en_ligne servi et commandes_mois refusé attendus')
    if (canon(base) !== avant) e.push('trier a modifié son entrée')
    const tete = st.trier({ valeur: { a: 1 }, source: 'supabase', a: '2026-10-23T10:00:00.000Z', cache: false }, () => false, 'salle.tresorerie')
    if (!(tete?.valeur === null && tete?.nonMesure === true && tete?.raison === 'hors périmètre')) e.push(`vue entière refusée : ${JSON.stringify(tete)}, « hors périmètre » attendu`)
    return 'trier importée sans aucune doublure, sur s/vue-direct.json : fondateur → intacte ; « santé sans comptabilité » → chaque sous-partie d’argent et de clients hors périmètre, le reste intact ; « santé et clients » → SITES EN LIGNE servi ; entrée non modifiée'
  })
  console.log(MARQUE + JSON.stringify(res))
}

if (o.valeurs.enfant === 'doublures') { await enfantDoublures(o.racine, PARTIE); process.exit(0) }
if (o.valeurs.enfant === 'pur') { await enfantPur(o.racine); process.exit(0) }

// ═══ Le juge ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const HARNAIS = o.drapeaux.has('harnais')
if (HARNAIS) o.temoin = true
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
const VIVANT = !o.valeurs.racine && !o.temoin && !o.drapeaux.has('statique')
let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  try { TEMOIN = arbreTemoinS(JUGE, { base: BASE, chemins: ['app', 'lib', 'middleware.ts', 'proxy.ts', 'next.config.mjs', 'tsconfig.json', 'package.json', 'next-env.d.ts', CARTE] }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const PREFIXE = { lecture: 'SV', reunion: 'RA', salles2: 'SL' }[PARTIE]
const IDS = {
  lecture: ['SV-1', 'SV-2', 'SV-3', 'SV-4', 'SV-5', 'SV-6', 'SV-7', 'SV-8', 'SV-9', 'SV-10', 'SV-11', 'SV-12', 'SV-13', 'SV-14', 'SV-15', 'SV-16', 'SV-17', 'SV-18', 'SV-19', 'SV-20', 'SV-21', 'SV-22', 'SV-23'],
  reunion: ['RA-1', 'RA-2', 'RA-3', 'RA-4', 'RA-5'],
  salles2: ['SL-1', 'SL-2', 'SL-3', 'SL-4', 'SL-5', 'SL-6', 'SL-7', 'SL-8', 'SL-9'],
}[PARTIE]
if (o.temoin) IDS.push(`${PREFIXE}-HARNAIS`)
const NOM = `${JUGE} --partie=${PARTIE}`
const S = creerSortie(NOM, [...IDS], `${NOM} — racine ${RAC}${TEMOIN ? ` — témoin du lot s posé sur ${BASE.slice(0, 7)}` : ''} — base ${BASE.slice(0, 7)} — ${VIVANT ? 'sources, doublures, puis vivant (arbre réel, copie au drapeau levé, comptes d’essai, typecheck)' : 'sources et doublures (le vivant se juge sur la racine réelle)'}`)

// ── Les appels rpc contre le SQL réel (SV-23) : les doublures du juge ont leurs propres formes, elles ne voient pas une faute de nom
// de paramètre (p_agent au lieu de p_nom : la vue ne marche jamais en production et le juge reste vert). Le SQL fait foi : le dernier
// `create function public.<nom>(<paramètres>)` de supabase/migrations/ (dépôt réel, jamais la copie jugée).
function fonctionsSql() {
  const dir = path.join(R, 'supabase', 'migrations'), f = new Map()
  if (!fs.existsSync(dir)) return null
  for (const nom of fs.readdirSync(dir).filter((n) => /^\d{4}_.*\.sql$/.test(n) && !n.startsWith('_')).sort()) {
    const t = fs.readFileSync(path.join(dir, nom), 'utf8').replace(/--[^\n]*/g, '')
    for (const m of t.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(([^)]*)\)/gi)) {
      const params = m[2].split(',').map((x) => x.trim()).filter(Boolean).map((x) => ({ nom: /^(\w+)/.exec(x)?.[1], defaut: /\bdefault\b|=/i.test(x) }))
      f.set(m[1], { params, migration: nom })
    }
  }
  return f
}
/** Les appels `.rpc('nom', { cle: v, autre, … })` d'un code sans commentaires : { nom, cles } (cles = null si l'argument n'est pas un littéral). */
function appelsRpc(c) {
  const out = []
  for (const m of c.matchAll(/\.rpc\(\s*(['"`])(\w+)\1\s*(?:,\s*(\{)?)?/g)) {
    if (!m[3]) { out.push({ nom: m[2], cles: /,/.test(m[0]) ? null : [] }); continue }
    let prof = 0, i = m.index + m[0].length - 1, debut = i + 1, cles = [], cur = ''
    for (; i < c.length; i++) {
      const ch = c[i]
      if ('{[('.includes(ch)) prof++
      else if ('}])'.includes(ch)) { prof--; if (prof === 0) { cles.push(c.slice(debut, i)); break } }
      else if (ch === ',' && prof === 1) { cles.push(c.slice(debut, i)); debut = i + 1 }
    }
    const noms = cles.map((x) => x.trim()).filter(Boolean).map((x) => (/^\.\.\./.test(x) ? null : /^(\w+)\s*(?::|$)/.exec(x)?.[1] ?? null))
    out.push({ nom: m[2], cles: noms.includes(null) ? null : noms })
  }
  return out
}

const lireRac = (rel) => lireRacine(RAC, rel)
const code = (t) => (t === null ? null : sansCommentaires(t))
/** Le code sans commentaires ni chaînes (les chaînes deviennent "") : on y cherche des appels, pas des mots. */
const sansChaines = (t) => (t === null ? null : sansCommentaires(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""'))
function importsNommes(src) {
  const m = new Map()
  for (const x of sansCommentaires(src ?? '').matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) for (const n of x[1].split(',').map((y) => y.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)) m.set(n, x[2])
  return m
}
const exporte = (src, meth) => new RegExp(`export\\s+(?:async\\s+)?(?:function\\s+${meth}\\b|const\\s+${meth}\\b)`).test(code(src) ?? '')
async function lancerEnfant(mode) {
  const r = await lancerAsync(process.execPath, ['--import', './scripts/ts-loader.mjs', CE_SCRIPT, `--enfant=${mode}`, `--partie=${PARTIE}`, `--racine=${RAC}`], { cwd: R, timeout: 300_000 })
  const l = r.stdout.split(/\r?\n/).find((x) => x.startsWith(MARQUE))
  if (!l) return { erreur: `enfant ${mode} sans résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.stderr || r.stdout, 200)}` }
  try { return JSON.parse(l.slice(MARQUE.length)) } catch (e) { return { erreur: `résultat de l’enfant ${mode} illisible : ${premiereLigne(e)}` } }
}
const fusion = {}
const ajouter = (res, mode) => {
  if (res.erreur) { for (const id of IDS) (fusion[id] ??= { e: [], d: [] }).e.push(res.erreur); return }
  for (const [id, e] of Object.entries(res.criteres ?? {})) (fusion[id] ??= { e: [], d: [] }).e.push(...e)
  for (const [id, d] of Object.entries(res.details ?? {})) (fusion[id] ??= { e: [], d: [] }).d.push(`${mode} : ${d}`)
}
const statique = {}
const noter = (id, e, d) => { (statique[id] ??= { e: [], d: [] }).e.push(...e); if (d) statique[id].d.push(d) }
const LISTE_NOMBRES = new Set([0, 1, 2, 7, 10, 12, 15, 20, 24, 30, 50, 60, 100, 200, 400, 401, 403, 404, 409, 503, 600, 1000, 3600, 60000, 3600000, 86400000])
function nombresHorsListe(src) {
  // Les expressions régulières (après = ( , : ! & | ? { } ; ou return) ne sont pas des seuils.
  const c = (sansChaines(src) ?? '').replace(/([=(,:!&|?{};]|\breturn)\s*\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n])+\/[a-z]*/g, '$1 ""')
  const out = []
  for (const m of c.matchAll(/(?<![\w.$])(\d[\d_]*(?:\.\d+)?)(?![\w.])/g)) { const n = Number(m[1].replace(/_/g, '')); if (!LISTE_NOMBRES.has(n)) out.push(m[1]) }
  return [...new Set(out)]
}
const RPC_DE = (src) => [...(code(src) ?? '').matchAll(/\.rpc\(\s*['"`]([\w]+)['"`]/g)].map((m) => m[1])

// ── Le premier critère de chaque partie (statique) ──────────────────────────────────────────────────────────────────────
const SRC = { route: lireRac(ROUTE), station: lireRac(STATION), reunion: lireRac(REUNION), chiffres: lireRac(CHIFFRES) }
const lecteursSrc = Object.fromEntries([...LECTEURS, 'index', 'natures'].map((c) => [c, lireRac(`lib/pilotage/salles/${c}.ts`)]))
const SALLES2 = fs.existsSync(path.join(RAC, 'lib', 'pilotage', 'salles'))
if (PARTIE === 'lecture') {
  const e = []
  if (SRC.route === null) e.push(`${ROUTE} absent`)
  if (SRC.station === null) e.push(`${STATION} absent`)
  if (SRC.route !== null) {
    const corps = corpsDeFonction(SRC.route, 'GET')
    const p = premiereInstruction(corps)
    if (corps === null) e.push('GET introuvable (export async function GET)')
    else if (!/^if\s*\(\s*!\s*actif\(\s*['"]pilotage['"]\s*\)\s*\)\s*return\b.*\b404\b/.test(p + (corps.split('\n').slice(0, 3).join(' ')))) e.push(`première instruction du GET « ${court(p, 90)} » : if (!actif('pilotage')) return … 404 attendu`)
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) if (exporte(SRC.route, m)) e.push(`la route exporte ${m}`)
  }
  noter('SV-1', e, 'route et station.ts présents ; le GET commence par actif(\'pilotage\') → 404 ; ni POST, ni PUT, ni DELETE')
} else if (PARTIE === 'reunion') {
  const e = []
  for (const [rel, src, meth] of [[REUNION, SRC.reunion, 'POST'], [CHIFFRES, SRC.chiffres, 'GET']]) {
    if (src === null) { e.push(`${rel} absent`); continue }
    const corps = corpsDeFonction(src, meth)
    if (corps === null) { e.push(`${rel} : ${meth} introuvable`); continue }
    const lignes = sansCommentaires(corps).split('\n').map((l) => l.trim()).filter(Boolean)
    if (!/^if\s*\(.*actif\(\s*['"]busAgents['"]\s*\).*actif\(\s*['"]pilotage['"]\s*\).*\)\s*return\b.*\b404\b/.test(lignes[0] ?? '') && !/^if\s*\(.*actif\(\s*['"]pilotage['"]\s*\).*actif\(\s*['"]busAgents['"]\s*\).*\)\s*return\b.*\b404\b/.test(lignes[0] ?? '')) e.push(`${rel} : première instruction « ${court(lignes[0], 90)} » : if (!actif('busAgents') || !actif('pilotage')) return … 404 attendu`)
    if (!/\bauthAgent\(/.test(lignes[1] ?? '')) e.push(`${rel} : deuxième instruction « ${court(lignes[1], 60)} » : authAgent( attendu`)
  }
  noter('RA-1', e, 'les deux routes présentes ; première instruction : actif(\'busAgents\') et actif(\'pilotage\') → 404 ; puis authAgent(')
} else {
  const e = []
  if (!SALLES2) e.push('lib/pilotage/salles/ absent')
  else for (const c of [...LECTEURS, 'natures']) if (lecteursSrc[c] === null) e.push(`lib/pilotage/salles/${c}.ts absent`)
  if (SRC.station === null) e.push(`${STATION} absent`)
  noter('SL-1', e, `lib/pilotage/salles/ : un lecteur par salle (${LECTEURS.join(', ')}) et natures.ts`)
}
const premier = IDS[0]
if (statique[premier].e.length) {
  S.juger(premier, statique[premier].e, '')
  S.nonJuges(IDS, `${premier} en échec (fichiers absents ou fautifs)`)
  process.exit(S.finir())
}

// ── Les critères statiques des autres ─────────────────────────────────────────────────────────────────────────────────
const tousLecteurs = Object.values(lecteursSrc).filter((x) => x !== null)
if (PARTIE === 'lecture') {
  {
    const e = [], im = importsNommes(SRC.station)
    for (const n of ['barre', 'equipage', 'positions', 'cartesAttention', 'bulles', 'bandeau', 'tapis', 'commandement', 'etatExperience', 'envoisDesAgents', 'bilan', 'validerSnapshot', 'pauseGenerale']) if (!im.has(n)) e.push(`station.ts n’importe pas ${n}`)
    for (const [nom, src] of [['station.ts', SRC.station], ['route.ts', SRC.route]]) {
      const c = sansChaines(src)
      for (const [re, quoi] of [[/\.sort\(/, '.sort('], [/\.reduce\(/, '.reduce('], [/\bMath\./, 'Math.']]) if (re.test(c)) e.push(`${nom} contient ${quoi}`)
      const n = nombresHorsListe(src)
      if (n.length) e.push(`${nom} : seuil(s) numérique(s) ${n.join(', ')} hors des durées et limites permises`)
    }
    noter('SV-5', e, 'station.ts importe les treize fonctions des modules ; ni .sort(, ni .reduce(, ni Math., ni seuil numérique hors des durées et limites (20, 50, 100, 15, 10, 30) dans la route et station.ts')
  }
  {
    const e = []
    for (const [nom, src] of [['station.ts', SRC.station], ['route.ts', SRC.route], ...Object.entries(lecteursSrc).filter(([, s]) => s !== null).map(([k, s]) => [`salles/${k}.ts`, s])]) {
      for (const f of RPC_DE(src)) if (!RPC_LECTURE.includes(f)) e.push(`${nom} : rpc('${f}') hors de la liste fermée des lectures`)
      const c = code(src)
      if (/\.schema\(/.test(c)) e.push(`${nom} : .schema(`)
      if (/from\(\s*['"`]ops/.test(c)) e.push(`${nom} : from('ops…`)
      for (const m of c.matchAll(/\.from\(\s*['"`]([\w]+)['"`]\s*\)/g)) {
        if (!TABLES.includes(m[1])) e.push(`${nom} : .from('${m[1]}') hors des tables permises (${TABLES.join(', ')})`)
        const suite = c.slice(m.index + m[0].length, m.index + m[0].length + 200)
        const sel = /^\s*\.select\(\s*['"`]([^'"`]*)['"`]/.exec(suite)
        if (!sel) e.push(`${nom} : .from('${m[1]}') sans .select('colonnes') explicite`)
        else { const cols = sel[1].split(',').map((x) => x.trim()); const mv = cols.filter((x) => (COLONNES_INTERDITES.includes(x) && !(COLONNES_PERMISES[m[1]] ?? []).includes(x)) || x === '*'); if (mv.length) e.push(`${nom} : .from('${m[1]}') lit ${mv.join(', ')}`) }
      }
    }
    noter('SV-6', e, 'sources : ops lu par les seules fonctions pilotage_* et station_* de lecture ; tables permises avec colonnes explicites')
  }
  {
    const e = []
    for (const [nom, src] of [['station.ts', SRC.station], ['route.ts', SRC.route], ...Object.entries(lecteursSrc).filter(([, s]) => s !== null).map(([k, s]) => [`salles/${k}.ts`, s])]) {
      const c = code(src)
      for (const f of ECRITURES) if (c.includes(f)) e.push(`${nom} appelle ${f}`)
      if (/['"`]ops_\w+['"`]/.test(c)) e.push(`${nom} appelle une fonction ops_*`)
      for (const w of ['.insert(', '.update(', '.delete(', '.upsert(']) if (c.includes(w)) e.push(`${nom} : ${w}`)
    }
    noter('SV-9', e, 'lecture seule : aucune fonction d’écriture (consigne, réunion, expérience, ops_*), ni insert, update, delete')
  }
  {
    const e = []
    const carte = lireRac(CARTE)
    const ligne = (carte ?? '').split('\n').find((l) => /^\s*'pilotage'\s*:/.test(l)) ?? ''
    for (const f of [ROUTE, REUNION, CHIFFRES]) {
      if (!ligne.includes(`'${f}'`)) e.push(`la ligne 'pilotage' de ${CARTE} ne porte pas ${f}`)
      const s = lireRac(f)
      if (s === null) e.push(`${f} absent`)
      else if (!/actif\(\s*['"]pilotage['"]\s*\)/.test(code(s))) e.push(`${f} ne lit pas actif('pilotage')`)
    }
    const base = lireBase(BASE, CARTE)
    if (base !== null && carte !== null) {
      const a = lf(base).split('\n'), b = lf(carte).split('\n')
      const ajoutes = b.filter((l) => !a.includes(l)), retires = a.filter((l) => !b.includes(l))
      const horsLigne = [...ajoutes, ...retires].filter((l) => !/^\s*'pilotage'\s*:/.test(l))
      if (horsLigne.length) e.push(`${CARTE} diffère de ${BASE.slice(0, 7)} hors de la ligne 'pilotage' (${horsLigne.length} ligne(s), dont « ${court(horsLigne[0], 60)} »)`)
    }
    noter('SV-11', e, `la ligne 'pilotage' de ${CARTE} porte les trois routes, chacune lit actif('pilotage') ; le diff du fichier (contre ${BASE.slice(0, 7)}) se limite à cette ligne${VIVANT ? '' : ' ; typecheck : sur la racine réelle'}`)
  }
  {
    const e = [], c = SRC.station
    for (const x of ['2026-10-12', '2026-11-02', '2026-10-23', '2026-11-05', 'JALON', 'pilotage_jalon', 'pilotage_compteurs_boites']) if (c.includes(x)) e.push(`station.ts contient « ${x} »`)
    noter('SV-13', e, 'station.ts : aucune constante de date, ni JALON, ni pilotage_jalon, ni pilotage_compteurs_boites')
  }
  {
    const e = [], c = code(SRC.station)
    const i = c.indexOf('DOMAINE_DE')
    if (i < 0) e.push('DOMAINE_DE absent de station.ts')
    else {
      const debut = c.indexOf('{', i), fin = c.indexOf('})', debut)
      const cles = [...c.slice(debut, fin > 0 ? fin : undefined).matchAll(/['"]([\w.]+)['"]\s*:/g)].map((m) => m[1])
      const doublons = cles.filter((k, j) => cles.indexOf(k) !== j)
      if (doublons.length) e.push(`DOMAINE_DE : ${[...new Set(doublons)].join(', ')} y figure(nt) deux fois`)
    }
    noter('SV-15', e, 'DOMAINE_DE dans station.ts, aucun objet deux fois (source)')
  }
  {
    const e = []
    if (!/\btrier\(/.test(code(SRC.route))) e.push('la route n’appelle pas trier(')
    for (const i of importsDe(SRC.station)) if (!i.type && i.genre !== 'dynamique' && /supabaseAdmin|lib\/direction\/garde|lib\/controle\/droits|^next\//.test(i.spec ?? '')) e.push(`station.ts importe ${i.spec} : trier doit s’importer sans base, sans garde, sans droits`)
    noter('SV-16', e, 'la route appelle trier sur chaque réponse ; station.ts n’importe ni supabaseAdmin, ni la garde, ni les droits')
  }
  {
    const e = [], c = code(SRC.station)
    if (!/\.from\(\s*['"`]app_errors['"`]\s*\)[\s\S]{0,120}\.gte\(\s*['"`]created_at['"`]/.test(c)) e.push('erreurs : la requête de verifierErreurs (app_errors, created_at des 24 h) introuvable dans station.ts')
    const im = importsNommes(SRC.route)
    if (im.get('ventesSites') !== '@/lib/direction/tresorerie') e.push('commandes_mois : la route n’importe pas ventesSites de @/lib/direction/tresorerie (la fonction de ventes_sites, 026-055)')
    const layout = lireRac('app/controle/station/layout.tsx')
    if (layout !== null && /VERCEL_GIT_COMMIT_SHA|version/.test(code(layout))) e.push('app/controle/station/layout.tsx lit la version')
    noter('SV-17', e, 'erreurs par la requête de la ronde (app_errors, 24 h), commandes du mois par ventesSites, la version jamais dans le layout')
  }
  {
    const e = [], ch = []
    sansCommentaires(SRC.station, ch)
    const nomme = ch.map((x) => x.texte).find((t) => /gpt-|\bluna\b|llama|mistral|gemini|qwen|claude-|\bopus\b|sonnet|haiku/i.test(t))
    if (nomme) e.push(`station.ts écrit un nom de modèle (« ${court(nomme, 40)} »)`)
    noter('SV-21', e, 'aucun nom de modèle écrit dans station.ts')
  }
  {
    const e = []
    if (/cout_jour_eur\s*:\s*0\b/.test(code(SRC.station) + tousLecteurs.map(code).join('\n'))) e.push('cout_jour_eur écrit en dur à 0')
    noter('SV-20', e, 'cout_jour_eur jamais écrit en dur')
  }
  {
    const e = [], sql = fonctionsSql()
    if (sql === null) e.push('supabase/migrations/ introuvable dans le dépôt réel : le SQL ne peut pas être relu')
    else {
      const sources = [['lib/pilotage/station.ts', SRC.station], ['la route', SRC.route], ...Object.entries(lecteursSrc).filter(([, x]) => x !== null)]
      let appels = 0
      for (const [nom, src] of sources) for (const a of appelsRpc(code(src))) {
        appels++
        const def = sql.get(a.nom)
        if (!def) { e.push(`${nom} : rpc('${a.nom}') : aucune fonction de ce nom dans supabase/migrations/`); continue }
        if (a.cles === null) continue
        const permis = def.params.map((p) => p.nom)
        for (const k of a.cles) if (!permis.includes(k)) e.push(`${nom} : rpc('${a.nom}') passe « ${k} », le SQL (${def.migration}) nomme ${permis.length ? permis.join(', ') : 'aucun paramètre'}`)
        for (const p of def.params) if (!p.defaut && !a.cles.includes(p.nom)) e.push(`${nom} : rpc('${a.nom}') n'passe pas « ${p.nom} » (obligatoire dans ${def.migration})`)
      }
      if (!appels) e.push('aucun appel rpc trouvé dans les sources de la station : le critère ne jugerait rien')
    }
    noter('SV-23', e, 'chaque appel rpc des sources nomme une fonction du SQL réel et ses paramètres exacts (les obligatoires présents, aucun inconnu)')
  }
}
if (PARTIE === 'reunion') {
  {
    const e = []
    for (const [rel, src] of [[REUNION, SRC.reunion], [CHIFFRES, SRC.chiffres]]) {
      const c = code(src)
      const v = /(?:const|let)\s+(\w+)\s*=\s*await\s+authAgent\(/.exec(c)?.[1]
      if (!v) { e.push(`${rel} : le résultat d’authAgent n’est pas rangé dans une variable`); continue }
      for (const m of c.matchAll(/p_agent\s*:\s*([^,}\n]+)/g)) if (m[1].trim() !== `${v}.nom`) e.push(`${rel} : p_agent vaut « ${m[1].trim()} », ${v}.nom (l’authentification) attendu`)
      if (/corps\s*\.\s*(?:p_agent|agent)\b|\[\s*['"](?:p_agent|agent)['"]\s*\]/.test(c)) e.push(`${rel} : l’agent lu dans le corps`)
    }
    noter('RA-2', e, 'p_agent tiré du résultat d’authAgent, jamais du corps (source)')
  }
  {
    const e = []
    for (const [rel, src, seul] of [[REUNION, SRC.reunion, 'POST'], [CHIFFRES, SRC.chiffres, 'GET']]) {
      const c = code(src)
      for (const w of ['.from(', '.insert(', '.update(', '.delete(', '.schema(', '.upsert(']) if (c.includes(w)) e.push(`${rel} : ${w}`)
      for (const f of RPC_DE(src)) if (!RPC_REUNION.includes(f)) e.push(`${rel} : rpc('${f}') hors des trois fonctions station_reunion_* et de station_reunion_chiffres`)
      for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) if (m !== seul && exporte(src, m)) e.push(`${rel} exporte ${m}`)
    }
    noter('RA-5', e, 'aucune écriture hors des fonctions station_reunion_* ; la route des chiffres n’exporte que GET, celle de la réunion que POST')
  }
}
if (PARTIE === 'salles2') {
  {
    const e = []
    const lec = { audience: ['audience('], securite: ['bans('], presti: ['clients(', 'cerveaux(', 'ticketsOuverts('], radar: ['pilotage_radar'], observatoire: ['pilotage_prospects_departements'] }
    for (const [c, fns] of Object.entries(lec)) for (const f of fns) if (!(code(lecteursSrc[c]) ?? '').includes(f)) e.push(`salles/${c}.ts n’appelle pas ${f.replace('(', '()')}`)
    for (const c of ['audience', 'securite', 'presti']) if (/\.from\(\s*['"`](?!app_errors)/.test(code(lecteursSrc[c]) ?? '')) e.push(`salles/${c}.ts lit une table : une requête du Poste recopiée ?`)
    for (const [c, s] of Object.entries(lecteursSrc)) { if (s === null || c === 'natures') continue; const x = sansChaines(s); for (const [re, q] of [[/\.sort\(/, '.sort('], [/\.reduce\(/, '.reduce('], [/\bMath\./, 'Math.']]) if (re.test(x)) e.push(`salles/${c}.ts contient ${q}`) }
    noter('SL-2', e, 'sources : les lectures de 026-174 et 026-175 appelées, aucune requête recopiée, ni tri ni réduction dans les lecteurs')
  }
  noter('SL-3', /santeService\(/.test(code(SRC.station)) ? [] : ['station.ts n’appelle pas santeService() (026-174)'], 'station.ts appelle santeService()')
  noter('SL-4', /pilotage_activite_salles/.test(tousLecteurs.map(code).join('\n') + code(SRC.station)) ? [] : ['pilotage_activite_salles jamais appelée'], 'ACTIVE AUJ. par pilotage_activite_salles')
  noter('SL-6', /\.(?:sujet|message|corps|contenu)\b/.test(code(lecteursSrc.presti) ?? '') ? ['salles/presti.ts lit le contenu d’un ticket'] : [], 'salles/presti.ts ne lit que le nombre de tickets')
}

// ── Les enfants ───────────────────────────────────────────────────────────────────────────────────────────────────────
ajouter(await lancerEnfant('doublures'), 'doublures')
if (PARTIE === 'lecture') ajouter(await lancerEnfant('pur'), 'sans doublure')
for (const id of IDS) {
  if (id.endsWith('-HARNAIS')) continue
  const a = statique[id], b = fusion[id]
  if (!a && !b) { S.echoue(id, 'non évalué'); continue }
  S.juger(id, [...(a?.e ?? []), ...(b?.e ?? [])], [...(a?.d ?? []), ...(b?.d ?? [])].join(' ; '))
}

// ── <préfixe>-HARNAIS (--temoin) : le harnais prouvé sans réseau ──────────────────────────────────────────────────────
if (o.temoin) {
  const id = `${PREFIXE}-HARNAIS`
  const e = [], reel = path.join(R, FLAGS)
  const avant = sha256(fs.readFileSync(reel))
  try {
    const c = copieAvecDrapeau(RAC, { critere: id })
    if (!c.leveDansCopie) e.push('pilotage n’est pas levé dans la copie')
    if (!c.baisseDansReel) e.push('le drapeau a bougé dans la source')
    if (PARTIE === 'reunion') {
      const f = path.join(c.dest, FLAGS), t = fs.readFileSync(f, 'utf8')
      const levee = lever(t, 'busAgents')
      if (levee === null) e.push('une seule déclaration « busAgents: true|false, » attendue dans la copie de lib/flags.ts')
      else fs.writeFileSync(f, levee) // la source réelle n'est pas touchée : son sha256 est relu plus bas
    }
    for (const j of ['node_modules', 'public']) if (fs.existsSync(path.join(c.dest, j)) && !fs.lstatSync(path.join(c.dest, j)).isSymbolicLink()) e.push(`${j} n'est pas une jonction`)
    if (fs.existsSync(path.join(c.dest, '.env.local'))) e.push('.env.local dans la copie')
    for (const f of PARTIE === 'reunion' ? [REUNION, CHIFFRES] : [ROUTE]) if (!fs.existsSync(path.join(c.dest, f))) e.push(`${f} n’est pas dans la copie`)
    if (sha256(fs.readFileSync(reel)) !== avant) e.push('lib/flags.ts RÉEL a changé')
    S.juger(id, e, `copie ${path.relative(R, c.dest)} (${c.tete}, app/, lib/, jonctions, sans .env.local) : pilotage${PARTIE === 'reunion' ? ' et busAgents' : ''} levés dans la copie seulement ; lib/flags.ts réel inchangé (sha256 ${avant.slice(0, 12)}…). Serveur et comptes d’essai : --harnais, sur le PC, jamais sous le piège réseau de la preuve`)
  } catch (err) { S.echoue(id, `copie impossible : ${premiereLigne(err)}`) }
  if (HARNAIS) await harnaisVivant(id, avant)
}
async function harnaisVivant(id, avant) {
  const e = [], vu = []
  let srv = null
  try {
    const c = copieAvecDrapeau(RAC, { critere: id })
    srv = await serveurCopie(c.dest, { critere: id })
    vu.push(`serveur de la copie ${srv.base} (PID ${srv.pid}, jamais le port 3400)`)
    const { resultat, menage, erreur } = await avecComptes(['direction'], async ({ direction }) => {
      const r = await fetch(`${srv.base}/api/controle/chiffres`, { headers: { Authorization: `Bearer ${direction.jeton}` } })
      return { status: r.status }
    })
    if (erreur) throw erreur
    if (resultat.status !== 200) e.push(`GET /api/controle/chiffres de la copie avec le fondateur d'essai → ${resultat.status}, 200 attendu`)
    else vu.push('fondateur d’essai → 200 sur /api/controle/chiffres de la copie')
    if (!menage) e.push('le compte d’essai n’a pas disparu')
    else vu.push('compte créé puis supprimé, relu absent par la clé de service (auth et artisans)')
  } catch (err) { e.push(`harnais vivant : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter() }
  if (sha256(fs.readFileSync(path.join(R, FLAGS))) !== avant) e.push('lib/flags.ts RÉEL a changé')
  S.juger(id, e, `harnais vivant : ${vu.join(' ; ')} ; serveur arrêté par son PID ; lib/flags.ts réel inchangé`)
}

// ── Le vivant (racine réelle) ──────────────────────────────────────────────────────────────────────────────────────────
async function vivant() {
  const { serveur } = await import('./lib/capture.mjs')
  const chemins = PARTIE === 'reunion' ? [['/api/agents/reunion', 'POST'], ['/api/agents/reunion/chiffres', 'GET']] : [['/api/controle/station?vue=direct', 'GET']]
  let reel = null
  const id2 = PARTIE === 'reunion' ? 'RA-1' : PARTIE === 'lecture' ? 'SV-2' : 'SL-8'
  if (PARTIE !== 'salles2') {
    try {
      reel = await serveur(R)
      const e = []
      for (const [p, m] of chemins) { const r = await fetch(`${reel.base}${p}`, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'POST' ? '{}' : undefined }); if (r.status !== 404) e.push(`arbre réel : ${m} ${p} sans identité → ${r.status}, 404 attendu`) }
      S.juger(id2, e, `arbre réel (${reel.base}) : 404 sans identité`)
    } catch (err) { S.echoue(id2, `arbre réel injoignable : ${premiereLigne(err)}`) } finally { if (reel) await reel.arreter() }
  }
  let srv = null
  const idc = PARTIE === 'reunion' ? 'RA-4' : PARTIE === 'lecture' ? 'SV-3' : 'SL-8'
  try {
    const c = copieAvecDrapeau(R, { critere: idc })
    if (PARTIE === 'reunion') { const f = path.join(c.dest, FLAGS), t = fs.readFileSync(f, 'utf8'); const levee = lever(t, 'busAgents'); if (levee === null) throw Object.assign(new Error('une seule déclaration « busAgents: true|false, » attendue dans lib/flags.ts'), { critere: idc }); fs.writeFileSync(f, levee) }
    srv = await serveurCopie(c.dest, { critere: idc })
    const lire = async (q, jeton, init = {}) => { const r = await fetch(`${srv.base}${q}`, { ...init, headers: { ...(init.headers ?? {}), ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) } }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ } return { status: r.status, j, t } }
    if (PARTIE === 'reunion') {
      // Aucune requête qui réussirait : sans jeton, puis un jeton inventé.
      const e = []
      for (const [p, m] of chemins) {
        const a = await lire(p, null, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'POST' ? '{"action":"ouvrir"}' : undefined }); if (a.status !== 401) e.push(`copie : ${m} ${p} sans jeton → ${a.status}, 401 attendu`)
        const b = await lire(p, `jeton-invente-${Date.now()}`, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'POST' ? '{"action":"ouvrir"}' : undefined }); if (![401, 403].includes(b.status)) e.push(`copie : ${m} ${p} jeton inventé → ${b.status}, 401 ou 403 attendu`)
      }
      S.juger('RA-4', e, 'copie aux drapeaux levés : 401 sans jeton, 401 ou 403 avec un jeton inventé, jamais 500 ; aucune requête qui réussirait')
    } else {
      const { resultat, menage, erreur } = await avecComptes(['direction', 'artisan'], async ({ direction, artisan }) => {
        const e3 = [], e4 = [], e7 = [], e8 = []
        const st = (q) => `/api/controle/station?${q}`
        if (PARTIE === 'lecture') {
          const a = await lire(st('vue=direct')); if (a.status !== 401) e3.push(`sans jeton → ${a.status}, 401 attendu`)
          const b = await lire(st('vue=direct'), artisan.jeton); if (b.status !== 403) e3.push(`artisan → ${b.status}, 403 attendu`)
          for (const [q, s] of [['vue=inconnue', 400], ['vue=salle&salle=inconnue', 400], ['vue=agent&nom=Pas-Valide', 400]]) { const r = await lire(st(q), direction.jeton); if (r.status !== s) e3.push(`${q} → ${r.status}, ${s} attendu`) }
        }
        const vues = [['direct', 'vue=direct', {}], ['fil', 'vue=fil', {}], ...CLES_SALLE_ATTENDUES.map((s) => ['salle', `vue=salle&salle=${s}`, { salle: s }]), ['agent', 'vue=agent&nom=chef', { nom: 'chef' }]]
        for (const [vue, q, x] of vues) {
          const r = await lire(st(q), direction.jeton)
          if (r.status !== 200) { e4.push(`${q} → ${r.status}${r.status >= 500 ? ' (500 interdit)' : ''}`); continue }
          const d = validerVue(r.j, { vue, ...x }); if (d.length) e4.push(`${q} hors contrat : ${d[0]}`)
          if (PARTIE === 'salles2' && vue === 'salle' && r.j?.manque === ARRIVE) e8.push(`${q} rend encore « ${ARRIVE} »`)
          if (!(vue === 'salle' && x.salle === 'standard')) { if (RE_EMAIL.test(r.t)) e7.push(`${q} : une adresse e-mail`); if (RE_TEL.test(r.t)) e7.push(`${q} : un numéro de téléphone`) }
        }
        return { e3, e4, e7, e8 }
      })
      if (erreur) throw erreur
      const m = menage ? [] : ['ménage des comptes d’essai en échec : un compte n’a pas disparu']
      if (PARTIE === 'lecture') {
        S.juger('SV-3', [...resultat.e3, ...m], 'copie au drapeau levé : 401 sans jeton, 403 artisan, 400 vue, salle et nom inconnus ; comptes d’essai supprimés')
        S.juger('SV-4', resultat.e4, 'copie : chaque vue → 200 au contrat, jamais 500')
        S.juger('SV-7', resultat.e7, 'copie : ni e-mail ni téléphone hors de salle=standard')
      } else S.juger('SL-8', [...resultat.e4, ...resultat.e8, ...m], 'copie : chaque salle → 200 au contrat, aucune « arrive avec sa fiche »')
    }
  } catch (err) { S.echoue(err.critere ?? idc, `copie ou serveur : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter() }
  if (PARTIE === 'lecture') {
    const { typecheck } = await import('./fixtures/026-pilotage/a/commun.mjs')
    const t = typecheck(R, JUGE)
    S.juger('SV-11', t.ok ? [] : [t.detail], t.detail)
  }
}
if (VIVANT) await vivant()
process.exit(S.finir())
