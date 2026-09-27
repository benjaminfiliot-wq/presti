// scripts/fixtures/026-pilotage/b/lot.mjs — la fiche du lot b (026-066), lue par scripts/juges-026-pilotage-preuve.mjs --lot=b.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien.
//
// Référence : la même que le lot a (4041ec9) ; elle ne porte ni app/api/controle/pilotage/ ni lib/pilotage/. Premier critère
// attendu en échec sur elle : SQ-1, SE-1, SS-1, SR-1 (migration absente), RL-1 (drapeau absent), GE-1 (routes absentes).
// Les juges reçoivent --base=<référence> : la non-régression des migrations (SQ-10…), le drapeau (RL-1) et le type Action
// du journal (GE-5) se comparent à la référence, sur laquelle le témoin est posé ; sans --base, ils comparent à HEAD.
//
// Témoin (./temoin) : l'IMPLÉMENTATION DE RÉFÉRENCE écrite par Claude Code pour ce lot, qui n'est aucun module livré :
//   - les quatre migrations (0107 lecture, 0108 échanges, 0112 station, 0113 réglages) avec leurs jumeaux et leurs contrôles,
//     et un compte rendu d'essai FACTICE par migration (scripts/fixtures/026-pilotage/b/essais/*.txt, posé seulement dans
//     l'arbre témoin, lu par --essai=…) : aucun essai n'a tourné, il prouve que le juge lit un compte rendu conforme et en
//     refuse un faux (sabotages « essai-… ») ;
//   - lib/flags.ts, scripts/fermeture-e2e.mjs et lib/direction/journal.ts de la référence avec leurs seuls ajouts ;
//   - la route de lecture et lib/pilotage/blocs.ts (026-068), les cinq routes d'écriture (026-074), lib/pilotage/equipage.ts
//     (la liste des noms de 026-070) et lib/pilotage/decisions.ts (le module de 026-014, tel que HEAD le porte).
// Ce que le témoin DÉRIVE (jumeaux, comptes rendus factices, trois fichiers existants) se refait par
// `node scripts/fixtures/026-pilotage/b/fabriquer-temoin.mjs` ; le contrôle JA-3 vérifie qu'il est à jour.
export const fiche = '026-066'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const temoin = './temoin'
export const absents = ['app/api/controle/pilotage/', 'lib/pilotage/']
const BASE = `--base=${reference}`
const ESSAI = (m) => `--essai=scripts/fixtures/026-pilotage/b/essais/${m}.txt`
const M = (n) => `supabase/migrations/${n}.sql`, E = (m) => `scripts/fixtures/026-pilotage/b/essais/${m}.txt`
const L = M('0107_pilotage_lecture'), EC = M('0108_pilotage_echanges'), ST = M('0112_pilotage_station'), RG = M('0113_station_reglages')
const RTE = 'app/api/controle/pilotage/route.ts', BLO = 'lib/pilotage/blocs.ts', FLG = 'lib/flags.ts'
const P = 'app/api/controle/pilotage'
const DEC = `${P}/decisions/[id]/route.ts`, APP = `${P}/appels/[id]/route.ts`, AGT = `${P}/agents/[nom]/route.ts`, CON = `${P}/consignes/route.ts`, GST = `${P}/gestes/route.ts`
export const juges = [
  {
    commande: 'scripts/pilotage-sql-qa.mjs', arguments: ['--migration=lecture', BASE, ESSAI('lecture')], loader: false, attendu: 'SQ-1', criteresMin: 10,
    sabotages: [
      { nom: 'borne-cent-vingt', fichier: L, avant: 'least(coalesce(p_limite, 20), 100))', apres: 'least(coalesce(p_limite, 20), 120))', tue: 'SQ-5' },
      { nom: 'search-path-inverse', fichier: L, avant: 'language plpgsql security definer set search_path = ops, public, pg_temp', apres: 'language plpgsql security definer set search_path = public, ops, pg_temp', tue: 'SQ-3' },
      { nom: 'lecture-qui-ecrit', fichier: L, avant: '   group by c.agent\n', apres: "   group by c.agent having public.ops_cout_ajouter('systeme', 'x', 0, '{}', null) is not null\n", tue: 'SQ-4' },
      { nom: 'prospects-lus', fichier: L, avant: "from ops.agents a where a.nom = 'chef')", apres: "from ops.agents a where a.nom = 'chef' and exists (select 1 from ops.prospects))", tue: 'SQ-7' },
      { nom: 'trop-gros-25000', fichier: L, avant: 'octet_length(p_etat::text) > 20000', apres: 'octet_length(p_etat::text) > 25000', tue: 'SQ-6' },
      { nom: 'controle-retouche', fichier: 'supabase/controles/0107_pilotage_lecture.sql', avant: "then 'oui' else 'NON (anormal)' end as resultat", apres: "then 'oui' else 'NON' end as resultat", tue: 'SQ-8' },
      { nom: 'essai-faux', fichier: E('lecture'), avant: '"decisions_ordre":true', apres: '"decisions_ordre":false', tue: 'SQ-9' },
      { nom: 'jumeau-diverge', fichier: M('_A_COLLER_sql_editor_0107'), avant: 'least(coalesce(p_limite, 20), 100))', apres: 'least(coalesce(p_limite, 20), 99))', tue: 'SQ-10' },
      { nom: 'migration-retiree', fichier: L, retirer: true, tue: 'SQ-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-sql-qa.mjs', arguments: ['--migration=echanges', BASE, ESSAI('echanges')], loader: false, attendu: 'SE-1', criteresMin: 11,
    sabotages: [
      { nom: 'compteur-recompte', fichier: EC, avant: 'public.acq_envois_du_jour(q.canal),', apres: '(select count(*)::integer from ops.envois e where e.canal = q.canal),', tue: 'SE-5' },
      { nom: 'appel-traitee', fichier: EC, avant: "where r.classe = 'appel' and r.appel_rendu_le is null", apres: "where r.classe = 'appel' and r.traitee_le is null", tue: 'SE-6' },
      { nom: 'bilan-250', fichier: EC, avant: 'least(coalesce(p_n, 100), 200))', apres: 'least(coalesce(p_n, 100), 250))', tue: 'SE-6' },
      { nom: 'etat-lit-technologies', fichier: EC, avant: 's.notice_verifiee_le, s.technologies_pause, s.modeles_suspendus', apres: "s.notice_verifiee_le, array(select t.technologie from ops.technologies t where t.etat = 'pause'), s.modeles_suspendus", tue: 'SE-12' },
      { nom: 'envois-destinataire', fichier: EC, avant: 'e.statut, e.envoyeur, p.metier', apres: 'e.statut, e.destinataire, p.metier', tue: 'SE-7' },
      { nom: 'essai-faux', fichier: E('echanges'), avant: '"envois_du_jour":true', apres: '"envois_du_jour":false', tue: 'SE-9' },
      { nom: 'migration-retiree', fichier: EC, retirer: true, tue: 'SE-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-sql-qa.mjs', arguments: ['--migration=station', BASE, ESSAI('station')], loader: false, attendu: 'SS-1', criteresMin: 14,
    sabotages: [
      { nom: 'pause-levee', fichier: ST, avant: 'update ops.interrupteurs set actif = true,', apres: 'update ops.interrupteurs set actif = false,', tue: 'SS-14' },
      { nom: 'arobase-permise', fichier: ST, avant: " or strpos(l, '@') > 0", apres: '', tue: 'SS-6' },
      { nom: 'objet-equipage', fichier: ST, avant: "then 'fondateur' else", apres: "then 'equipage' else", tue: 'SS-13' },
      { nom: 'pause-sans-capacite', fichier: ST, avant: "'pause' = any (g.capacites)", apres: "'pause' = 'pause'", tue: 'SS-5' },
      { nom: 'budget-non-nul', fichier: ST, avant: 'check (budget_eur = 0)', apres: 'check (budget_eur >= 0)', tue: 'SS-2' },
      { nom: 'arret-sans-evenement', fichier: ST, avant: "insert into ops.evenements (agent, type, objet, resume) values ('systeme', 'experience_arretee', p_id::text, 'Expérience arrêtée');", apres: '', tue: 'SS-8' },
      { nom: 'graine-capacite', fichier: ST, avant: "'{notifier,pause,consigne}'", apres: "'{notifier,pause,consigne,envoyer}'", tue: 'SS-14' },
      { nom: 'essai-pont-faux', fichier: E('station'), avant: '"ss15_pause_posee":true', apres: '"ss15_pause_posee":false', tue: 'SS-15' },
      { nom: 'migration-retiree', fichier: ST, retirer: true, tue: 'SS-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-sql-qa.mjs', arguments: ['--migration=reglages', BASE, ESSAI('reglages')], loader: false, attendu: 'SR-1', criteresMin: 9,
    sabotages: [
      { nom: 'cle-affichage-oubliee', fichier: RG, avant: "'couleurs', 'affichage')) then", apres: "'couleurs')) then", tue: 'SR-5' },
      { nom: 'historique-soixante', fichier: RG, avant: 'order by x.version desc limit 50)', apres: 'order by x.version desc limit 60)', tue: 'SR-3' },
      { nom: 'salle-ecommerce', fichier: RG, avant: "'observatoire', 'repos']) as s(salle)", apres: "'observatoire', 'repos', 'ecommerce']) as s(salle)", tue: 'SR-8' },
      { nom: 'deux-lignes', fichier: RG, avant: 'smallint primary key default 1 check (cle = 1),', apres: 'smallint primary key default 1,', tue: 'SR-2' },
      { nom: 'radar-nominatif', fichier: RG, avant: "select coalesce(p.metier, 'inconnue') as categorie", apres: "select coalesce(p.nom_affiche, 'inconnue') as categorie", tue: 'SR-6' },
      // SR-7 (contre-vérification du 27/09) : un identifiant snake_case (nom_affiche) et une clé jsonb (->>'nom_entreprise').
      // Un seul fichier touché, donc SR-1 s'allume aussi ; l'isolement (trois jumeaux identiques) est rejoué à part,
      // .orchestre/preuves/026-066/sr7-isolement.log.
      { nom: 'departements-nom-affiche', fichier: RG, avant: "select coalesce(p.faits->>'departement', 'inconnu')", apres: "select coalesce(p.nom_affiche, 'inconnu')", tue: 'SR-7' },
      { nom: 'departements-cle-nominative', fichier: RG, avant: "select coalesce(p.faits->>'departement', 'inconnu')", apres: "select coalesce(p.faits->>'nom_entreprise', 'inconnu')", tue: 'SR-7' },
      { nom: 'ecrire-invoker', fichier: RG, avant: 'language plpgsql security definer set search_path = ops, public, pg_temp', apres: 'language plpgsql security invoker set search_path = ops, public, pg_temp', tue: 'SR-4' },
      { nom: 'essai-faux', fichier: E('reglages'), avant: '"historique_cinquante":true', apres: '"historique_cinquante":false', tue: 'SR-9' },
      { nom: 'migration-retiree', fichier: RG, retirer: true, tue: 'SR-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-route-qa.mjs', arguments: [BASE], loader: true, attendu: 'RL-1', criteresMin: 6,
    sabotages: [
      { nom: 'drapeau-direction', fichier: RTE, avant: "if (!actif('pilotage')) return", apres: "if (!actif('direction')) return", tue: 'RL-2' },
      { nom: 'tri-local', fichier: BLO, avant: "cartesDecisions(await lignes<Decision>(supabaseAdmin.rpc('pilotage_decisions', { p_limite: 20 })), decision, maintenant)", apres: "cartesDecisions((await lignes<Decision>(supabaseAdmin.rpc('pilotage_decisions', { p_limite: 20 }))).sort(() => 0), decision, maintenant)", tue: 'RL-5' },
      { nom: 'ops-direct', fichier: BLO, avant: "supabaseAdmin.rpc('pilotage_code_lire')", apres: "supabaseAdmin.rpc('ops_etat')", tue: 'RL-6' },
      { nom: 'uuid-non-teste', fichier: RTE, avant: 'const decision = brute && UUID.test(brute) ? brute : undefined', apres: 'const decision = brute ?? undefined', tue: 'RL-8' },
      { nom: 'bloc-destinataire', fichier: BLO, avant: "'Des demandes sont incomplètes.' : null }", apres: "'Des demandes sont incomplètes.' : null, destinataire: null }", tue: 'RL-7' },
      { nom: 'autre-drapeau', fichier: FLG, avant: '  audience: true,', apres: '  audience: false,', tue: 'RL-1' },
      { nom: 'route-retiree', fichier: RTE, retirer: true, tue: 'RL-2' },
    ],
  },
  {
    commande: 'scripts/pilotage-gestes-qa.mjs', arguments: [BASE], loader: true, attendu: 'GE-1', criteresMin: 12,
    sabotages: [
      { nom: 'texte-au-journal', fichier: CON, avant: 'apres: { longueur: texte.length, agent }', apres: 'apres: { longueur: texte.length, agent, texte }', tue: 'GE-11' },
      { nom: 'reclasse-par-chef', fichier: DEC, avant: "p_par: 'benj'", apres: "p_par: 'chef'", tue: 'GE-14' },
      { nom: 'rdv-mauvaise-fonction', fichier: APP, avant: "? await supabaseAdmin.rpc('acq_rdv_appel_rendu', { p_id: id })", apres: "? await supabaseAdmin.rpc('acq_reponse_appel_rendu', { p_reponse: id })", tue: 'GE-12' },
      { nom: 'geste-sans-reconfirmation', fichier: GST, avant: "  const refus = await exigerReconfirmation(req, f.uid, 'securite')", apres: '  const refus = null as Response | null', tue: 'GE-13' },
      { nom: 'agent-salle', fichier: CON, avant: 'const NOMS = Object.keys(EQUIPAGE)', apres: "const NOMS = [...Object.keys(EQUIPAGE), 'radar']", tue: 'GE-15' },
      { nom: 'pause-conditionnelle', fichier: AGT, avant: "  const refus = await exigerReconfirmation(req, f.uid, 'securite')", apres: "  const refus = nom.startsWith('pause') ? await exigerReconfirmation(req, f.uid, 'securite') : null", tue: 'GE-3' },
      { nom: 'journal-sans-refus', fichier: AGT, avant: 'if (!journal) return refusJournal()', apres: "if (!journal) return NextResponse.json({ error: 'journal' }, { status: 503 })", tue: 'GE-5' },
      { nom: 'action-envoye', fichier: APP, avant: "apres: { action: 'appel_rendu', source }", apres: "apres: { action: 'envoye', source }", tue: 'GE-4' },
      { nom: 'reconfirmation-sans-portee', fichier: DEC, avant: '  if (portee) {', apres: '  {', tue: 'GE-2' },
      { nom: 'consignes-retiree', fichier: CON, retirer: true, tue: 'GE-1' },
    ],
  },
]
export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeux' },
  { id: 'JA-4', module: './controles.mjs', fonction: 'controleReel' },
  { id: 'JA-6', module: './controles.mjs', fonction: 'controleEnvois' },
]
