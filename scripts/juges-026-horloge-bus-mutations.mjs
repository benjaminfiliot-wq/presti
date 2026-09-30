#!/usr/bin/env node
// scripts/juges-026-horloge-bus-mutations.mjs — fiche 026-091 : contre-vérifier les dix juges du domaine horloge et bus.
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Pour chacun des dix juges, ce script :
//   1. copie le dépôt utile (app, lib, scripts, supabase, docs, .github, gabarits-pubs, .orchestre/brouillons-ecosysteme et les
//      fichiers de la racine ; node_modules et public en jonctions, jamais .git) sous .orchestre/travail/026-091/copie/ ;
//   2. lance le juge sur la copie intacte : le TÉMOIN, code 0 exigé (les juges SQL en --sans-essai : une copie mutée n'a pas
//      d'essai à elle, la faute doit être vue par la lecture statique) ;
//   3. applique UNE mutation (un remplacement de texte exact, `avant` présent une seule fois), lance le juge sur la copie
//      mutée : code ≠ 0 exigé, avec LA ligne « FAIL <critère> — … » du critère attendu et le bilan qui le nomme ; puis
//      rétablit le fichier tel qu'il était.
// Le dépôt en place n'est jamais touché : les juges ne sont pas modifiés, ni les doublures, ni les jeux d'essai. Rien n'est
// écrit hors de .orchestre/travail/026-091/ et de .orchestre/preuves/026-091/.
//
// Si une mutation passe (ou si un témoin échoue), le script ne corrige RIEN : il l'écrit en tête du rapport et sort en code 1 ;
// Claude Code rouvre la fiche du juge (point 4 de la fiche).
//
// Sorties : .orchestre/preuves/026-091/mutations.md (une ligne par mutation : ce qui est cassé, critère attendu, extrait réel)
//           .orchestre/preuves/026-091/mutations.json (le rapport machine du méta-juge : juge, commande, fichier, avant, apres,
//           critere, extrait, duree_s).
// Usage : node scripts/juges-026-horloge-bus-mutations.mjs [--seul=<texte>] [--sans-ts]
//   --seul=<texte>  ne joue que les mutations dont le juge, le critère ou le nom contient le texte (mise au point ; le rapport
//                   n'est alors pas celui de la fiche et le code de sortie est 3 même si tout passe)
//   --sans-ts       saute les six juges TypeScript (chacun relance `npm run typecheck`), idem code 3
//   --sans-budget   ne s'arrête pas à 18 min 30 (mesure de la durée réelle de la série complète ; le rapport reste celui de la fiche)
// Code 0 : tous les témoins passent et chaque mutation échoue sur son critère. 1 : sinon (dont le budget de temps). 2 : appel
// invalide ou préalable manquant.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const FICHE = '026-091'
const NOM = 'juges-026-horloge-bus-mutations'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const JOURNAUX = path.join(TRAVAIL, 'journaux')
const DEBUT = Date.now()
// Le méta-juge tue le script à 50 min (décision du chef du 29/09 : la série complète dure 43 min, six juges relançant `npm run typecheck`) :
// on s'arrête avant, en le disant, plutôt que d'être tué sans rapport.
const BUDGET_S = 48 * 60 // --sans-budget (mesure de la durée réelle) : plus d'arrêt, le méta-juge tuera le script à 50 min
const DOSSIERS_COPIE = ['app', 'lib', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const JONCTIONS = ['node_modules', 'public']
const RE_CRITERE = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/

const versSlash = (p) => String(p).split(path.sep).join('/')
const court = (t, n = 200) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const ABS = (rel) => versSlash(path.join(RACINE, rel))

// ── Options ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const opts = { seul: null, sansTs: false, sansBudget: false }
for (const a of process.argv.slice(2)) {
  let m
  if ((m = /^--seul=(.+)$/.exec(a))) opts.seul = m[1]
  else if (a === '--sans-ts') opts.sansTs = true
  else if (a === '--sans-budget') opts.sansBudget = true
  else { console.error(`✗ ${NOM} : argument inattendu : ${a}`); process.exit(2) }
}
const PARTIEL = !!(opts.seul || opts.sansTs)

// ── Les dix juges ────────────────────────────────────────────────────────────────────────────────────────────────────────
// `args` : ce qui suit le nom du juge ; --racine={racine} est ajouté à la fin. `ts` : le juge relance `npm run typecheck`.
const JUGES = [
  { id: 'ops0096', juge: 'scripts/ops-sql-qa.mjs', args: '--migration=0096 --sans-essai' },
  { id: 'ops0097', juge: 'scripts/ops-sql-qa.mjs', args: '--migration=0097 --sans-essai' },
  { id: 'ops0098', juge: 'scripts/ops-sql-qa.mjs', args: '--migration=0098 --sans-essai' },
  { id: 'prospection', juge: 'scripts/prospection-sql-qa.mjs', args: '--sans-essai' },
  { id: 'argent', juge: 'scripts/argent-sql-qa.mjs', args: '--sans-essai' },
  { id: 'horloge-sql', juge: 'scripts/horloge-sql-qa.mjs', args: '--sans-essai' },
  { id: 'garde', juge: 'scripts/agents-garde-qa.mjs', args: '', ts: true },
  { id: 'routes', juge: 'scripts/agents-routes-qa.mjs', args: '', ts: true },
  { id: 'pause', juge: 'scripts/pause-qa.mjs', args: '', ts: true },
  { id: 'file-argent', juge: 'scripts/file-argent-qa.mjs', args: '', ts: true },
  { id: 'veilleur', juge: 'scripts/veilleur-qa.mjs', args: '', ts: true },
  { id: 'tic', juge: 'scripts/tic-qa.mjs', args: '', ts: true },
]

// ── Les mutations ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Une mutation = un remplacement de texte exact (`avant` une seule fois dans `fichier`). Les fichiers sont lus en LF dans ce
// tableau ; le moteur les convertit à la fin de ligne du fichier. `deriver(texte)` rend { avant, apres } quand la faute est un
// déplacement de blocs : `avant` est alors la région contiguë entière.
const M0096 = 'supabase/migrations/0096_ops_socle.sql', M0097 = 'supabase/migrations/0097_ops_identite.sql', M0098 = 'supabase/migrations/0098_ops_taches.sql'
const M0099 = 'supabase/migrations/0099_ops_garde_envois.sql', M0100 = 'supabase/migrations/0100_ops_file_argent.sql', M0101 = 'supabase/migrations/0101_ops_horloge.sql'
const GARDE = 'lib/agents/garde.ts', BUS = 'lib/agents/bus.ts', PAUSE = 'lib/agents/pause.ts', ROUTE_PAUSE = 'app/api/controle/pause/route.ts', DOC_PAUSE = 'docs/agents/pause-generale.md'
const VEILLEUR = 'lib/agents/veilleur.ts', FILE_ARGENT = 'lib/agents/fileArgent.ts', TIC = 'app/api/agents/tic/route.ts'
const R_TACHES = 'app/api/agents/taches/route.ts', R_DECISIONS = 'app/api/agents/decisions/route.ts', R_ETAT = 'app/api/agents/etat/route.ts'

/** Déplace le bloc [a, b[ juste avant le repère `avantRepere` : rend { avant, apres } sur la région contiguë. */
function deplacer(t, { debutBloc, finBloc, ancreDestination }) {
  const a = t.indexOf(debutBloc), b = t.indexOf(finBloc, a + 1), d = t.indexOf(ancreDestination, b)
  if (a < 0 || b < 0 || d < 0) throw new Error(`repères de déplacement introuvables (${debutBloc.trim().slice(0, 30)}…)`)
  const bloc = t.slice(a, b), milieu = t.slice(b, d)
  return { avant: bloc + milieu, apres: milieu + bloc }
}

/** Échange deux blocs voisins [a, b[ et [b, c[ : rend { avant, apres } sur la région contiguë [a, c[. */
function echanger(t, repereA, repereB, repereC) {
  const a = t.indexOf(repereA), b = t.indexOf(repereB, a + 1), c = t.indexOf(repereC, b + 1)
  if (a < 0 || b < 0 || c < 0) throw new Error(`repères d'échange introuvables (${repereA.trim().slice(0, 30)}…)`)
  return { avant: t.slice(a, c), apres: t.slice(b, c) + t.slice(a, b) }
}

/** Toutes les mentions de 'Europe/Paris' de la fonction passent en 'UTC' : région contiguë de la première à la dernière. */
function toutEnUtc(t, debutFonction) {
  const f = t.indexOf(debutFonction)
  if (f < 0) throw new Error(`fonction introuvable : ${debutFonction}`)
  const fin = t.indexOf('\ncreate or replace function', f + 1)
  const corps = t.slice(f, fin < 0 ? t.length : fin)
  const a = corps.indexOf("'Europe/Paris'"), b = corps.lastIndexOf("'Europe/Paris'")
  if (a < 0) throw new Error('mentions de Europe/Paris introuvables')
  const debut = f + corps.lastIndexOf('\n', a) + 1, finR = f + corps.indexOf('\n', b)
  const region = t.slice(debut, finR)
  return { avant: region, apres: region.replaceAll("'Europe/Paris'", "'UTC'") }
}

const MUTATIONS = [
  // ── ops-sql-qa 0096 ────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'ops0096', crit: 'OS-3', nom: 'profondeur de 3 à 4', fichier: M0096, avant: 'check (profondeur between 0 and 3)', apres: 'check (profondeur between 0 and 4)' },
  { id: 'ops0096', crit: 'OS-4', nom: 'grant select sur toutes les tables du schéma ops', fichier: M0096, avant: '-- ── Les commentaires', apres: 'grant select on all tables in schema ops to service_role;\n\n-- ── Les commentaires' },
  { id: 'ops0096', crit: 'OS-1', nom: 'une create policy ajoutée', fichier: M0096, avant: '-- ── Les commentaires', apres: 'create policy lecture_agents on ops.agents for select using (true);\n\n-- ── Les commentaires' },
  { id: 'ops0096', crit: 'OS-5', nom: "graine ('instagram', '*') à 10 par jour", fichier: M0096, avant: "values ('instagram', '*', 0, 0),", apres: "values ('instagram', '*', 10, 0)," },
  { id: 'ops0096', crit: 'OS-3', nom: "déclencheur d'ajout seul retiré", fichier: M0096, avant: 'create trigger evenements_ajout_seul\n  before update or delete on ops.evenements\n  for each row execute function ops.evenements_ajout_seul();\n', apres: '' },
  // ── ops-sql-qa 0097 ────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'ops0097', crit: 'OI-3', nom: 'security definer retiré de ops_agent_par_jeton', fichier: M0097, avant: 'language sql\nstable\nsecurity definer\nset search_path = ops, public, pg_temp\nas $$\n  select a.nom, a.capacites', apres: 'language sql\nstable\nset search_path = ops, public, pg_temp\nas $$\n  select a.nom, a.capacites' },
  { id: 'ops0097', crit: 'OI-3', nom: 'grant execute à anon sur ops_agent_par_jeton', fichier: M0097, avant: 'grant execute on function public.ops_agent_par_jeton(text) to service_role;\n', apres: 'grant execute on function public.ops_agent_par_jeton(text) to service_role;\ngrant execute on function public.ops_agent_par_jeton(text) to anon;\n' },
  { id: 'ops0097', crit: 'OI-4', nom: "événement retiré de ops_agent_pause", fichier: M0097, avant: "  insert into ops.evenements (agent, type, objet, resume)\n  values (p_nom, case when p_pause then 'agent_pause' else 'agent_reprise' end, 'agent:' || p_nom,\n          left(case when p_pause then 'mis en pause' else 'reprise' end || coalesce(' : ' || p_motif, ''), 200));\n", apres: '' },
  { id: 'ops0097', crit: 'OI-4', nom: 'empreinte concaténée dans le résumé de poser_jeton', fichier: M0097, avant: "'jeton d''accès posé (son empreinte ne se journalise jamais)');", apres: "'jeton d''accès posé ' || p_hash);" },
  { id: 'ops0097', crit: 'OI-4', nom: "ops_evenements_lire rend aussi les événements du lecteur", fichier: M0097, avant: '   where e.id > coalesce(p_apres, 0)\n     and e.agent <> p_agent\n', apres: '   where e.id > coalesce(p_apres, 0)\n' },
  // ── ops-sql-qa 0098 ────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'ops0098', crit: 'OT-4', nom: 'skip locked retiré de ops_tache_prendre', fichier: M0098, avant: '   limit 1\n     for update skip locked;\n  if v_id is null then', apres: '   limit 1;\n  if v_id is null then' },
  { id: 'ops0098', crit: 'OT-4', nom: 'bail de 3 heures', fichier: M0098, avant: "bail_jusqua = now() + interval '30 minutes', maj_le = now()", apres: "bail_jusqua = now() + interval '3 hours', maj_le = now()" },
  { id: 'ops0098', crit: 'OT-4', nom: 'recherche de la clé déplacée après le quota', fichier: M0098, deriver: (t) => deplacer(t, { debutBloc: '  -- 3. une clé déjà connue', finBloc: "  -- 4. l'origine", ancreDestination: '  -- une seule tâche ouverte par objet' }) },
  { id: 'ops0098', crit: 'OT-4', nom: 'ops_decision_trancher sans contrôle is_founder', fichier: M0098, avant: 'if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then', apres: 'if p_auteur is null then' },
  { id: 'ops0098', crit: 'OT-4', nom: 'ops_decisions_tranchees sans le filtre creee_par', fichier: M0098, avant: "     where d.creee_par = p_agent\n       and d.statut in ('tranchee', 'defaut_applique')", apres: "     where d.statut in ('tranchee', 'defaut_applique')" },
  // ── prospection-sql-qa (0099) ──────────────────────────────────────────────────────────────────────────────────────────
  { id: 'prospection', crit: 'PG-4', nom: 'branche ops:quota_absent remplacée par un passage', fichier: M0099, avant: "    if not found then\n      raise exception using message = 'ops:quota_absent', errcode = 'P0001';\n    end if;", apres: '    if not found then\n      null;\n    end if;' },
  { id: 'prospection', crit: 'PG-4', nom: 'pg_advisory_xact_lock du canal retiré', fichier: M0099, avant: "  perform pg_advisory_xact_lock(hashtext('ops:quota:' || new.canal));\n", apres: '' },
  { id: 'prospection', crit: 'PG-2', nom: 'fonction ops_opposition_retirer ajoutée', fichier: M0099, avant: 'create or replace function public.ops_garde_etat()', apres: "create or replace function public.ops_opposition_retirer(p_id uuid)\nreturns void\nlanguage sql\nsecurity definer\nset search_path = ops, public, pg_temp\nas $$ delete from ops.opposition where id = p_id $$;\n\ncreate or replace function public.ops_garde_etat()" },
  { id: 'prospection', crit: 'PG-4', nom: 'le jour des compteurs de garde_envois calculé en UTC partout', fichier: M0099, deriver: (t) => toutEnUtc(t, 'create or replace function ops.garde_envois()') },
  { id: 'prospection', crit: 'PG-4', nom: 'le jour du plafond (bornes v_debut et v_fin) calculé en UTC', fichier: M0099, avant: "    v_debut := v_jour::timestamp at time zone 'Europe/Paris';\n    v_fin := (v_jour + 1)::timestamp at time zone 'Europe/Paris';", apres: "    v_debut := v_jour::timestamp at time zone 'UTC';\n    v_fin := (v_jour + 1)::timestamp at time zone 'UTC';" },
  { id: 'prospection', crit: 'PG-4', nom: "branche envoye qui lève ops:opposition au lieu d'écrire envoi_hors_regle", fichier: M0099, avant: "    if v_hors is not null then\n      begin\n        perform public.ops_evenement_ajouter('systeme', 'envoi_hors_regle',", apres: "    if v_hors is not null then\n      raise exception using message = 'ops:opposition', errcode = 'P0001';\n      begin\n        perform public.ops_evenement_ajouter('systeme', 'envoi_hors_regle'," },
  { id: 'prospection', crit: 'PG-4', nom: 'lien_maquette soumis à la règle des 90 jours', fichier: M0099, avant: "  if new.type = 'premier_contact' then\n    -- 90 jours sans recontact", apres: "  if new.type in ('premier_contact', 'lien_maquette') then\n    -- 90 jours sans recontact" },
  { id: 'prospection', crit: 'PG-4', nom: 'lien_maquette compté dans le plafond du jour', fichier: M0099, avant: "     or new.type in ('premier_contact', 'relance') then", apres: "     or new.type in ('premier_contact', 'relance', 'lien_maquette') then" },
  // ── argent-sql-qa (0100) ───────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'argent', crit: 'FA-4', nom: 'pgmq.send appelé même quand la clé existe', fichier: M0100, avant: '  if not found then\n    return null;\n  end if;\n  v_msg_id := pgmq.send(', apres: '  v_msg_id := pgmq.send(' },
  { id: 'argent', crit: 'FA-4', nom: "archive au-delà de 3 lectures retirée", fichier: M0100, avant: "    if m.read_ct > 3 then\n      perform pgmq.archive('argent', m.msg_id);\n      update ops.argent_messages set abandonne_le = now() where ops.argent_messages.cle = v_cle;\n      insert into ops.evenements (agent, type, objet, resume)\n      values ('systeme', 'argent_abandonne', 'argent:' || v_cle, left('message abandonné après ' || m.read_ct || ' lecture(s) : ' || v_cle, 200));\n      continue;\n    end if;\n", apres: '' },
  { id: 'argent', crit: 'FA-1', nom: 'grant execute à authenticated sur ops_argent_lire', fichier: M0100, avant: 'grant execute on function public.ops_argent_lire(integer, integer) to service_role;', apres: 'grant execute on function public.ops_argent_lire(integer, integer) to service_role, authenticated;' },
  // ── horloge-sql-qa (0101) ──────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'horloge-sql', crit: 'HS-2', nom: 'timeout_milliseconds retiré', fichier: M0101, avant: "headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),\n    timeout_milliseconds := 30000", apres: "headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)" },
  { id: 'horloge-sql', crit: 'HS-2', nom: 'URL du tic en http://', fichier: M0101, avant: "url := 'https://prestiapp.fr/api/agents/tic',", apres: "url := 'http://prestiapp.fr/api/agents/tic'," },
  { id: 'horloge-sql', crit: 'HS-1', nom: 'secret factice de 40 signes écrit en dur', fichier: M0101, avant: "  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';", apres: "  v_secret := 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0';" },
  { id: 'horloge-sql', crit: 'HS-4', nom: 'ops_horloge_etat rend decrypted_secret', fichier: M0101, avant: "'secret_present', exists (select 1 from vault.decrypted_secrets where name = 'cron_secret'),", apres: "'secret_present', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')," },
  // ── agents-garde-qa ────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'garde', crit: 'AG-3', nom: 'débit en panne qui laisse passer', fichier: GARDE, avant: "if (error) { console.error('[agents] consommer_limite :', error.message); return null }", apres: "if (error) { console.error('[agents] consommer_limite :', error.message); return true }" },
  { id: 'garde', crit: 'AG-2', nom: 'jeton inconnu rendu avec un autre corps que jeton absent', fichier: GARDE, avant: 'ligne.nom !== nomDuJeton(jeton)) return refusSansJeton(req)', apres: "ligne.nom !== nomDuJeton(jeton)) return { status: 401, code: 'jeton', error: 'Jeton d’agent inconnu.' }" },
  { id: 'garde', crit: 'AG-6', nom: 'jeton affiché deux fois par agents-jeton.mjs', fichier: 'scripts/agents-jeton.mjs', avant: '\\n${jeton}\\nÀ poser dans le coffre', apres: '\\n${jeton}\\n${jeton}\\nÀ poser dans le coffre' },
  // ── agents-routes-qa ───────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'routes', crit: 'AR-5', nom: 'p_agent lu dans le corps', fichier: R_TACHES, avant: 'ops_tache_creer({ p_agent: agent.nom, p_type', apres: "ops_tache_creer({ p_agent: typeof corps.agent === 'string' ? corps.agent : agent.nom, p_type" },
  { id: 'routes', crit: 'AR-8', nom: 'ops_decision_trancher cité par une route du bus', fichier: R_DECISIONS, avant: "import { ops_decision_creer, ops_decisions_tranchees } from '@/lib/agents/bus'", apres: "import { ops_decision_creer, ops_decision_trancher, ops_decisions_tranchees } from '@/lib/agents/bus'" },
  { id: 'routes', crit: 'AR-13', nom: "GET decisions?tranchees=1 qui lit agent dans la requête", fichier: R_DECISIONS, avant: 'ops_decisions_tranchees({ p_agent: agent.nom, p_depuis: depuis })', apres: "ops_decisions_tranchees({ p_agent: url.searchParams.get('agent') ?? agent.nom, p_depuis: depuis })" },
  { id: 'routes', crit: 'AR-2', nom: 'le 404 du drapeau retiré de la route etat', fichier: R_ETAT, avant: "  if (!actif('busAgents')) return erreur(404, 'introuvable')\n", apres: '' },
  { id: 'routes', crit: 'AR-7', nom: 'texte brut de Postgres rendu dans un 500', fichier: BUS, avant: '  return GENERIQUE\n}', apres: "  return { ok: false, code: message, status: 500 }\n}" },
  // ── pause-qa ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'pause', crit: 'PA-1', nom: 'pauseGenerale() inactive quand la base est en panne', fichier: PAUSE, avant: "if (!r.ok) return { active: true, source: 'panne' }", apres: "if (!r.ok) return { active: false, source: 'panne' }" },
  { id: 'pause', crit: 'PA-2', nom: "ops_interrupteur_poser appelé avant le journal", fichier: ROUTE_PAUSE, deriver: (t) => echanger(t, '  const journal = await journaliser(', '  const r = await ops_interrupteur_poser(', '  return NextResponse.json({ ok: true, pause') },
  { id: 'pause', crit: 'PA-5', nom: 'la voie Vercel sans le mot redéploiement', fichier: DOC_PAUSE, avant: 'puis un redéploiement :', apres: 'puis un nouveau déploiement :' },
  { id: 'pause', crit: 'PA-10', nom: 'le doc remet « collez cette ligne dans le SQL Editor » comme geste de Benj', fichier: DOC_PAUSE, avant: "Benj n'écrit ni n'exécute aucun SQL.", apres: 'Benj colle cette ligne dans le SQL Editor.' },
  // ── file-argent-qa ─────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'file-argent', crit: 'AF-2', nom: 'ops_argent_fait appelé même quand le gestionnaire échoue', fichier: FILE_ARGENT, avant: 'await sousDelai(gestionnaire(message.charge ?? {}), reste)', apres: 'await sousDelai(gestionnaire(message.charge ?? {}), reste).catch(() => ({}))' },
  { id: 'file-argent', crit: 'AF-3', nom: 'budget ignoré', fichier: FILE_ARGENT, avant: '      if (reste <= 0) break lecture\n', apres: '' },
  { id: 'file-argent', crit: 'AF-5', nom: 'un update sur sites_commandes ajouté', fichier: FILE_ARGENT, avant: "    if (envoi.error) throw new Error('mise en file de la commande impossible')\n", apres: "    if (envoi.error) throw new Error('mise en file de la commande impossible')\n    await supabaseAdmin.from('sites_commandes').update({ etat: 'payee' }).eq('id', commande.id)\n" },
  // ── veilleur-qa ────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'veilleur', crit: 'VA-3', nom: 'plafond de 3 notifications retiré', fichier: VEILLEUR, avant: 'if (creneau && Number(etat?.notifications_jour ?? 0) < 3) {', apres: 'if (creneau) {' },
  { id: 'veilleur', crit: 'VA-4', nom: "créneau du digest calculé en UTC", fichier: VEILLEUR, avant: "const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })", apres: "const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })" },
  { id: 'veilleur', crit: 'VA-5', nom: 'le coupe-circuit met aussi systeme en pause', fichier: VEILLEUR, avant: "const epargne = (a: Agent) => ['a0', 'systeme'].includes(a.nom) ||", apres: "const epargne = (a: Agent) => ['a0'].includes(a.nom) ||" },
  { id: 'veilleur', crit: 'VA-2', nom: 'un agent en_pause signalé muet', fichier: VEILLEUR, avant: "|| !a.battement_le || a.en_pause || pause.active) continue", apres: '|| !a.battement_le || pause.active) continue' },
  { id: 'veilleur', crit: 'VA-4', nom: 'une adresse e-mail de prospect dans le digest', fichier: VEILLEUR, avant: "  L.push('', `Pause générale : ${x.pause ? 'ACTIVE' : 'non'}`)", apres: "  L.push('', 'Dernier contact : marie.dupont@exemple.fr')\n  L.push('', `Pause générale : ${x.pause ? 'ACTIVE' : 'non'}`)" },
  // ── tic-qa ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'tic', crit: 'TC-2', nom: "contrôle de CRON_SECRET qui accepte l'absence de variable", fichier: TIC, avant: "if (!secret || auth !== `Bearer ${secret}`) return", apres: "if (secret && auth !== `Bearer ${secret}`) return" },
  { id: 'tic', crit: 'TC-3', nom: 'enregistrerPassage avant la file de l’argent', fichier: TIC, avant: "  if (reste() <= 0) etapes.argent = { statut: 'saute', raison: 'budget' }\n", apres: "  await enregistrerPassage('tic', { etapes, dureeMs: 0, pause }, true)\n  if (reste() <= 0) etapes.argent = { statut: 'saute', raison: 'budget' }\n" },
  { id: 'tic', crit: 'TC-4', nom: 'une étape (le balayage) qui propage son erreur', fichier: TIC, avant: "    await balayerCommandesPayees()\n    etapes.balayage = { statut: 'ok' }\n  } catch {\n    etapes.balayage = { statut: 'echec' }\n    reussi = false\n  }", apres: "    await balayerCommandesPayees()\n    etapes.balayage = { statut: 'ok' }\n  } catch (e) {\n    etapes.balayage = { statut: 'echec' }\n    throw e\n  }" },
  { id: 'tic', crit: 'TC-8', nom: "le texte d'erreur de l'étape argent dans la réponse", fichier: TIC, avant: "  } catch {\n    etapes.argent = { statut: 'echec' }\n    reussi = false\n  }", apres: "  } catch (e) {\n    etapes.argent = { statut: 'echec', raison: String(e instanceof Error ? e.message : e) as 'budget' }\n    reussi = false\n  }" },
]
// ── La copie ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function git(args) {
  const r = spawnSync('git', ['-C', RACINE, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 })
  return r.status === 0 ? r.stdout : null
}
function retirerJonctions(dir) {
  const restent = []
  const parcourir = (d) => {
    let noms
    try { noms = fs.readdirSync(d) } catch { return }
    for (const n of noms) {
      const p = path.join(d, n)
      let st
      try { st = fs.lstatSync(p) } catch { continue }
      if (st.isSymbolicLink()) {
        try { fs.unlinkSync(p) } catch { /* vérifié ci-dessous */ }
        let encore = true
        try { fs.lstatSync(p) } catch { encore = false }
        if (encore) restent.push(p)
      } else if (st.isDirectory()) parcourir(p)
    }
  }
  if (fs.existsSync(dir)) parcourir(dir)
  return restent
}
/** Supprime la copie : jonctions d'abord (unlink), suppression récursive seulement s'il n'en reste aucune. */
function supprimerCopie() {
  if (!fs.existsSync(COPIE)) return
  const r = path.relative(TRAVAIL, COPIE)
  if (!r || r.startsWith('..') || path.isAbsolute(r)) throw new Error('suppression refusée hors de .orchestre/travail/026-091')
  const restent = retirerJonctions(COPIE)
  if (restent.length) throw new Error(`jonction non retirée : ${restent.map(versSlash).join(', ')}`)
  fs.rmSync(COPIE, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
function copier() {
  supprimerCopie()
  const liste = (git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...DOSSIERS_COPIE.filter((d) => fs.existsSync(path.join(RACINE, d)))]) || '').split('\0').filter(Boolean)
  let n = 0
  for (const rel of [...liste, ...FICHIERS_RACINE.filter((f) => fs.existsSync(path.join(RACINE, f)))]) {
    const s = path.join(RACINE, rel)
    let st
    try { st = fs.lstatSync(s) } catch { continue }
    if (!st.isFile()) continue
    const d = path.join(COPIE, rel)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(s, d)
    n++
  }
  for (const j of JONCTIONS) if (fs.existsSync(path.join(RACINE, j))) fs.symlinkSync(path.join(RACINE, j), path.join(COPIE, j), 'junction')
  return n
}

// ── Lancer un juge, sous délai, arbre tué au besoin ───────────────────────────────────────────────────────────────────────
function tuerArbre(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* déjà mort */ }
}
function lancer(commande, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd: COPIE, windowsHide: true, shell: true, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const prendre = (d) => { if (sortie.length < 8 * 1024 * 1024) sortie += d }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}
/** Les autres `node …-qa.mjs` de la machine : les juges qui simulent une horloge attendent qu'il n'y en ait plus (point 5). */
function autresJugesActifs() {
  if (process.platform !== 'win32') {
    const r = spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8', timeout: 30_000 })
    if (r.status !== 0) return []
    return r.stdout.split(/\r?\n/).flatMap((ligne) => {
      const m = /^\s*(\d+)\s+(.+)$/.exec(ligne)
      return m && Number(m[1]) !== process.pid && /(?:^|\s)(?:node|[^\s/]*\/node)\s+[^\n]*-qa\.mjs(?:\s|$)/.test(m[2]) ? [m[1]] : []
    })
  }
  const cmd = `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ProcessId -ne ${process.pid} -and $_.CommandLine -match '-qa\\.mjs(\\s|"|$)' } | ForEach-Object { $_.ProcessId }`
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', timeout: 30_000, windowsHide: true })
  return r.status === 0 ? r.stdout.split(/\s+/).filter(Boolean) : []
}
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const ecoule = () => (opts.sansBudget ? 0 : (Date.now() - DEBUT) / 1000)
const ecouleReel = () => (Date.now() - DEBUT) / 1000

/** LA ligne « FAIL <critère> — … » du critère (une seule, en début de ligne) et le bilan qui le nomme (règle du méta-juge). */
function ligneEnEchec(sortie, critere) {
  const L = String(sortie).split(/\r?\n/)
  const siennes = L.map((l) => ({ l, m: /^(PASS|FAIL|SAUTE) (\S+)(?: — |$)/.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const defauts = []
  let ligne = null
  if (!siennes.length) defauts.push(`aucune ligne « FAIL ${critere} — … »`)
  else if (siennes.length > 1) defauts.push(`${critere} rapporté ${siennes.length} fois`)
  else if (siennes[0].m[1] !== 'FAIL' || !siennes[0].l.startsWith(`FAIL ${critere} — `)) defauts.push(`${critere} rapporté ${siennes[0].m[1]} : « ${court(siennes[0].l, 80)} »`)
  else ligne = siennes[0].l
  const b = L.map((l) => /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (!b) defauts.push('aucun bilan « … : FAIL — ids »')
  else if (b[2] !== 'FAIL') defauts.push(`bilan ${b[2]}`)
  else if (!(b[3] || '').split(/,\s*/).map((x) => x.trim()).includes(critere)) defauts.push(`le bilan ne nomme pas ${critere}`)
  const rouges = L.map((l) => /^FAIL (\S+) — /.exec(l)).filter(Boolean).map((m) => m[1])
  return { ligne: defauts.length ? null : ligne, defauts, rouges }
}

// ── Le déroulé ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const temoins = new Map()   // id de juge → { code, duree, ok, raison }
const resultats = []        // une entrée par mutation jouée
const notes = []
let arret = null

const commandeDe = (j) => `node ${ABS(j.juge)} ${j.args ? `${j.args} ` : ''}--racine={racine}`.replace(/ +/g, ' ')
const lecteur = (rel) => path.join(COPIE, rel)

function appliquer(m) {
  const cible = lecteur(m.fichier)
  if (!fs.existsSync(cible)) throw new Error(`fichier à muter introuvable dans la copie : ${m.fichier}`)
  const brut = fs.readFileSync(cible, 'utf8')
  const crlf = brut.includes('\r\n')
  const lf = brut.replace(/\r\n/g, '\n')
  const dans = (s) => (crlf ? s.replace(/\n/g, '\r\n') : s)
  let avant = m.avant, apres = m.apres
  if (m.deriver) { const d = m.deriver(lf); avant = d.avant; apres = d.apres }
  avant = dans(avant); apres = dans(apres)
  const n = brut.split(avant).length - 1
  if (n !== 1) throw new Error(`« avant » présent ${n} fois dans ${m.fichier} (une seule attendue) : ${court(avant, 70)}`)
  const i = brut.indexOf(avant)
  fs.writeFileSync(cible, brut.slice(0, i) + apres + brut.slice(i + avant.length))
  return { brut, avant, apres }
}

async function jouerJuge(j) {
  const mutations = MUTATIONS.filter((m) => m.id === j.id && (!opts.seul || `${j.juge} ${m.crit} ${m.nom}`.toLowerCase().includes(opts.seul.toLowerCase())))
  if (!mutations.length) return
  const commande = commandeDe(j).replace('{racine}', versSlash(COPIE))
  const delai = (j.ts ? 9 : 3) * 60_000
  if (j.ts) {
    // Point 5 : aucun autre juge -qa ne doit tourner (ils se marchent sur l'horloge, sur la mémoire, sur tsc).
    const attendu = Date.now()
    let actifs = autresJugesActifs()
    while (actifs.length && Date.now() - attendu < 120_000) { dormir(5000); actifs = autresJugesActifs() }
    if (actifs.length) {
      arret = `${j.juge} : ${actifs.length} autre(s) processus node …-qa.mjs encore actif(s) après 2 min d'attente`
      return
    }
  }
  if (ecoule() > BUDGET_S - 60) { arret = arret || `budget de temps : ${j.juge} non joué (${Math.round(ecoule())} s écoulées sur ${Math.round(BUDGET_S)} s)`; return }
  // 1. le témoin
  let t = temoins.get(j.id)
  if (!t) {
    const x = await lancer(commande, delai)
    fs.mkdirSync(JOURNAUX, { recursive: true })
    ecrire(path.join(JOURNAUX, `temoin-${j.id}.log`), `$ ${commande}\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
    const bilan = x.sortie.split(/\r?\n/).filter(Boolean).at(-1) || ''
    t = { code: x.code, duree: x.duree, ok: x.code === 0, raison: x.code === 0 ? '' : `témoin en code ${x.code}${x.expire ? ' (délai dépassé)' : ''} : ${court(bilan, 160)}` }
    temoins.set(j.id, t)
    console.log(`  ${t.ok ? '·' : '✗'} témoin ${j.id} (${j.juge}) : code ${x.code} en ${x.duree.toFixed(1)} s${t.ok ? '' : ` — ${t.raison}`}`)
  }
  if (!t.ok) return
  // 2. les mutations, une à une, le fichier rétabli après chacune
  for (const m of mutations) {
    if (ecoule() > BUDGET_S - Math.max(30, t.duree * 1.3)) { arret = arret || `budget de temps : ${j.juge} / ${m.crit} « ${m.nom} » non joué (${Math.round(ecoule())} s écoulées sur ${Math.round(BUDGET_S)} s)`; break }
    const r = { m, j, commande: commandeJson(j), ok: false, raison: '', extrait: '', duree: 0, rouges: [], code: null, avant: '', apres: '' }
    let orig = null
    try {
      const a = appliquer(m)
      orig = a.brut
      r.avant = a.avant; r.apres = a.apres
      const x = await lancer(commande, delai)
      r.code = x.code; r.duree = x.duree
      ecrire(path.join(JOURNAUX, `mutation-${j.id}-${m.crit}-${resultats.length + 1}.log`), `$ ${commande}\n# ${m.fichier} : ${m.nom}\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
      const lu = ligneEnEchec(x.sortie, m.crit)
      r.rouges = [...new Set(lu.rouges)]
      if (x.expire) r.raison = `délai dépassé (${Math.round(delai / 1000)} s)`
      else if (x.code === 0) r.raison = 'code 0 : la mutation n’est pas attrapée'
      else if (!lu.ligne) r.raison = `code ${x.code}, ${m.crit} non attrapé : ${lu.defauts.join(' ; ')} (en échec : ${r.rouges.join(', ') || '—'})`
      else { r.ok = true; r.extrait = lu.ligne.trim() }
    } catch (e) {
      r.raison = `mutation non jouée : ${e.message}`
    } finally {
      if (orig !== null) fs.writeFileSync(lecteur(m.fichier), orig)
    }
    resultats.push(r)
    console.log(`  ${r.ok ? '·' : '✗'} ${j.id} ${m.crit} « ${m.nom} » — ${r.ok ? `code ${r.code}, ${r.duree.toFixed(1)} s` : r.raison}`)
  }
}
const commandeJson = (j) => commandeDe(j)

function ecrireRapports() {
  const bons = resultats.filter((r) => r.ok)
  const rates = resultats.filter((r) => !r.ok)
  const temoinsRouges = [...temoins.entries()].filter(([, t]) => !t.ok)
  const json = { mutations: bons.map((r) => ({
    juge: r.j.juge, commande: r.commande, fichier: r.m.fichier, avant: r.avant, apres: r.apres, critere: r.m.crit,
    extrait: r.extrait.slice(0, 400), duree_s: Math.round(r.duree * 10) / 10,
  })) }
  const L = [`# 026-091 — contre-vérification des juges de l'horloge et du bus`, '']
  const tete = []
  if (PARTIEL) tete.push(`Lancement partiel (${opts.seul ? `--seul=${opts.seul}` : ''}${opts.sansTs ? ' --sans-ts' : ''}) : ce n'est pas le rapport de la fiche.`)
  for (const [id, t] of temoinsRouges) tete.push(`TÉMOIN EN ÉCHEC (${id}) : ${t.raison}`)
  for (const r of rates) tete.push(`MUTATION NON PRISE : ${r.j.juge} ${r.m.crit} « ${r.m.nom} » — ${r.raison}`)
  if (arret) tete.push(`ARRÊT : ${arret}`)
  if (tete.length) { L.push('## À lire d’abord (le script sort en code 1, aucun juge n’a été corrigé)', '', ...tete.map((x) => `- ${x}`), '') }
  else L.push(`Tous les témoins passent (code 0) et les ${bons.length} mutations échouent sur leur critère. Aucun juge, doublure ni jeu d'essai n'a été modifié : chaque mutation vit dans une copie sous \`.orchestre/travail/${FICHE}/copie/\`, rétablie après chaque essai.`, '')
  L.push(`Généré par \`node scripts/${NOM}.mjs\` le ${new Date().toISOString()} en ${Math.round(ecouleReel())} s${ecouleReel() > 50 * 60 ? ` (au-delà des 50 minutes que le méta-juge accorde au script : voir la cause plus bas)` : ''}.`, '')
  if (notes.length) L.push(...notes.map((x) => `> ${x}`), '')
  L.push('## Témoins (copie intacte, code 0 attendu)', '', '| juge | commande | code | durée |', '|---|---|---|---|')
  for (const j of JUGES) { const t = temoins.get(j.id); if (t) L.push(`| \`${j.juge}\`${j.args ? ` ${j.args}` : ''} | \`${commandeDe(j)}\` | ${t.code} | ${t.duree.toFixed(1)} s |`) }
  L.push('', '## Mutations (une copie chacune, code ≠ 0 attendu avec le critère nommé)', '', '| juge | ce qui est cassé | fichier | critère attendu | code | autres critères en échec | extrait réel du verdict |', '|---|---|---|---|---|---|---|')
  const cel = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ')
  for (const r of resultats) {
    L.push(`| \`${r.j.juge}\` | ${cel(r.m.nom)} | \`${r.m.fichier}\` | ${r.m.crit} | ${r.code ?? '—'} | ${r.rouges.filter((c) => c !== r.m.crit).join(', ') || '—'} | ${r.ok ? `« ${cel(r.extrait)} »` : `**NON PRISE** : ${cel(r.raison)}`} |`)
  }
  L.push('', '## Notes', '',
    '- Les six juges SQL/texte se lancent en `--sans-essai` là où il existe (ops-sql-qa, prospection-sql-qa, argent-sql-qa, horloge-sql-qa) : la faute est vue par la lecture statique, jamais par l\'empreinte de l\'essai à sec (OS-8, OI-6, OT-6, PG-6, FA-6, HS-8 sautés).',
    '- La faute « route decisions/[id]/trancher ajoutée » (AR-8) s\'écrit ici comme un remplacement de texte exact : une route du bus qui cite `ops_decision_trancher`, ce que AR-8 lit dans tout `app/api/agents/**` ; un fichier ajouté ne se rejoue pas comme `avant` → `apres`.',
    '- Les mutations qui déplacent un bloc (clé après le quota, journal après l\'écriture) portent la région contiguë entière dans `avant` et `apres`.',
    '- `horloge-qa.mjs` (l\'épreuve des 24 h) n\'est pas muté : juge `--reel` seulement, exempté par CV-6 de 026-001.')
  if (!PARTIEL) { ecrire(path.join(PREUVES, 'mutations.md'), L.join('\n') + '\n'); ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify(json, null, 2) + '\n') }
  else ecrire(path.join(TRAVAIL, 'mutations-partiel.md'), L.join('\n') + '\n')
  return { bons: bons.length, rates: rates.length, temoinsRouges: temoinsRouges.length }
}

async function main() {
  console.log(`── ${NOM} : fiche ${FICHE}${PARTIEL ? ' (partiel)' : ''}`)
  for (const j of JUGES) if (!fs.existsSync(path.join(RACINE, j.juge))) { console.error(`✗ ${NOM} : juge introuvable : ${j.juge}`); return 2 }
  fs.mkdirSync(PREUVES, { recursive: true })
  const n = copier()
  console.log(`  copie : ${n} fichier(s) sous ${versSlash(path.relative(RACINE, COPIE))}, node_modules et public en jonctions`)
  try {
    for (const j of JUGES) {
      if (j.ts && opts.sansTs) continue
      await jouerJuge(j)
      if (arret) break
    }
  } finally {
    try { supprimerCopie() } catch (e) { notes.push(`copie non supprimée : ${e.message}`) }
  }
  const bilan = ecrireRapports()
  const ok = !arret && !bilan.rates && !bilan.temoinsRouges && resultats.length > 0
  console.log(`${NOM} : ${ok ? 'PASS' : 'FAIL'} — ${bilan.bons} mutation(s) attrapée(s), ${bilan.rates} non prise(s), ${bilan.temoinsRouges} témoin(s) en échec${arret ? ` ; ${arret}` : ''} ; ${Math.round(ecouleReel())} s`)
  return ok ? (PARTIEL ? 3 : 0) : 1
}
main().then((c) => { process.exitCode = c }, (e) => { console.error(`✗ ${NOM} : ${e.stack || e.message}`); process.exitCode = 1 })
