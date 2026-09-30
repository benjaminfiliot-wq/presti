// scripts/fixtures/026-pilotage/s/lot.mjs — la fiche du lot s (026-067), lue par scripts/juges-026-pilotage-preuve.mjs --lot=s.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien.
//
// Référence : la même que les lots a et b (4041ec9) ; elle ne porte ni lib/pilotage/, ni la route de la station, ni les routes
// de la réunion, ni scripts/chef/reunion.mjs. Premier critère attendu en échec sur elle : SM-1 (modules absents), SV-1 (route
// et station.ts absents), RA-1 (routes de la réunion absentes), SL-1 (lecteurs de salle absents), RU-1 (script absent) —
// chacun statique : aucun serveur n'est lancé.
// Les juges de route reçoivent --base=<référence> : SV-11 compare scripts/fermeture-e2e.mjs à la référence, sur laquelle le
// témoin est posé ; --temoin se pose aussi sur elle.
//
// Témoin (./temoin) : l'IMPLÉMENTATION DE RÉFÉRENCE écrite par Claude Code pour ce lot, qui n'est aucun module livré :
//   - les sept modules purs de 026-070 (lib/pilotage/barre, equipage, attention, fil, tapis, missions, experience) et ce
//     qu'ils importent, absent de la référence : lib/pilotage/agents, envois, entonnoir, code (de HEAD, tels quels) et une
//     table MOTEUR_DE (lib/agents/moteurs.ts, au contrat de 026-041) ;
//   - lib/pilotage/station.ts, la route GET /api/controle/station et les deux routes de la réunion (026-092), dans l'état
//     complété par 026-178 (lib/pilotage/salles/ : un lecteur par salle et NATURE_DE) ; lib/agents/pause.ts minimal (026-044),
//     lib/flags.ts et scripts/fermeture-e2e.mjs de la référence avec leurs seuls ajouts ;
//   - scripts/chef/reunion.mjs et docs/agents/reunion.md (026-103).
// Les réponses conformes de s/ (vue-direct.json, salle-*.json…) sont celles de ce témoin sur la base d'essai ; le contrôle JA-3
// les repasse au contrat.
export const fiche = '026-067'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const temoin = './temoin'
export const absents = ['lib/pilotage/', 'app/api/controle/station/', 'app/api/agents/reunion/', 'scripts/chef/reunion.mjs']
const BASE = `--base=${reference}`
const P = 'lib/pilotage', ST = `${P}/station.ts`, SA = `${P}/salles`
const RTE = 'app/api/controle/station/route.ts', REU = 'app/api/agents/reunion/route.ts', CHI = 'app/api/agents/reunion/chiffres/route.ts'
const SCR = 'scripts/chef/reunion.mjs', DOC = 'docs/agents/reunion.md'
export const juges = [
  {
    commande: 'scripts/station-logique-qa.mjs', arguments: ['--partie=modules', BASE], loader: true, attendu: 'SM-1', criteresMin: 25,
    sabotages: [
      { nom: 'nuit-a-21h', fichier: `${P}/barre.ts`, avant: 'return h >= HEURES_NUIT.debut || h < HEURES_NUIT.fin', apres: 'return h > HEURES_NUIT.debut || h < HEURES_NUIT.fin', tue: 'BA-4' },
      { nom: 'pause-a-son-poste', fichier: `${P}/equipage.ts`, avant: "if (a.etat === 'pause') out[a.nom] = { salle: 'repos', motif: 'pause' }", apres: "if (a.etat === 'pause') out[a.nom] = { salle, motif: 'pause' }", tue: 'EQ-3' },
      { nom: 'notice-jaune', fichier: `${P}/attention.ts`, avant: 'notice_perimee: R,', apres: 'notice_perimee: J,', tue: 'AT-2' },
      { nom: 'rdv-oublie', fichier: `${P}/attention.ts`, avant: "${rdv ? `, dont ${s(rdv, 'rendez-vous réservé', 'rendez-vous réservés')}` : ''}", apres: '', tue: 'AT-4' },
      { nom: 'civilite-visible', fichier: `${P}/fil.ts`, avant: "t = t.replace(RE_CIVILITE, '[nom]')", apres: 't = t.trim()', tue: 'FI-1' },
      { nom: 'minuit-sans-remise', fichier: `${P}/tapis.ts`, avant: 'if (d < 0) return { remiseAZero: true }', apres: 'if (d < 0) continue', tue: 'TA-1' },
      { nom: 'xp-des-oui', fichier: `${P}/missions.ts`, avant: 'niveau: niveau(m.encaisse_eur),', apres: 'niveau: niveau(nombre(m.encaisse_eur) + nombre(m.oui)),', tue: 'MI-1' },
      { nom: 'arret-par-benjamin', fichier: `${P}/experience.ts`, avant: "'Arrêtée par Benj.'", apres: "'Arrêtée par Benjamin.'", tue: 'XP-1' },
      { nom: 'barre-retiree', fichier: `${P}/barre.ts`, retirer: true, tue: 'SM-1' },
    ],
  },
  {
    commande: 'scripts/station-route-qa.mjs', arguments: ['--partie=lecture', BASE], loader: true, attendu: 'SV-1', criteresMin: 20,
    sabotages: [
      { nom: 'parametre-rpc-faux', fichier: ST, avant: "c.rpc('pilotage_couts_modeles', { p_debut: c.depuisMinuit })", apres: "c.rpc('pilotage_couts_modeles', { p_depuis: c.depuisMinuit })", tue: 'SV-23' },
      { nom: 'fonction-rpc-inventee', fichier: ST, avant: "async function derniereReunion(c: Contexte) { return premiere(await c.rpc('station_reunion_lire', { p_limite: 1 })) }", apres: "async function derniereReunion(c: Contexte) { void c.rpc('pilotage_fonction_inventee', { p_x: 1 }); return premiere(await c.rpc('station_reunion_lire', { p_limite: 1 })) }", tue: 'SV-23' },
      { nom: 'crons-tries', fichier: ST, avant: 'const crons = lignesDe(pc.data).map(', apres: 'const crons = lignesDe(pc.data).sort(() => 0).map(', tue: 'SV-5' },
      { nom: 'alertes-sujet', fichier: ST, avant: ".from('alertes').select('motif, cree_le')", apres: ".from('alertes').select('motif, cree_le, sujet')", tue: 'SV-6' },
      { nom: 'fil-sans-apres', fichier: ST, avant: "c.rpc('pilotage_evenements', { p_apres: apres, p_limite: 100, p_agent: agent, p_types: null })", apres: "c.rpc('pilotage_evenements', { p_apres: null, p_limite: 100, p_agent: agent, p_types: null })", tue: 'SV-10' },
      { nom: 'apercu-une-heure', fichier: ST, avant: 'createSignedUrl(chemin, DUREE_LIEN_APERCU_S)', apres: 'createSignedUrl(chemin, 3600)', tue: 'SV-19' },
      { nom: 'commandes-sous-sante', fichier: ST, avant: "'direct.barre.commandes_mois': 'comptabilite'", apres: "'direct.barre.commandes_mois': 'sante'", tue: 'SV-16' },
      { nom: 'ecommerce-a-venir', fichier: ST, avant: "source: 'reservee'", apres: "source: 'a_venir'", tue: 'SV-18' },
      { nom: 'version-huit', fichier: ST, avant: 'deps.version.slice(0, 7)', apres: 'deps.version.slice(0, 8)', tue: 'SV-17' },
      { nom: 'route-retiree', fichier: RTE, retirer: true, tue: 'SV-1' },
    ],
  },
  {
    commande: 'scripts/station-route-qa.mjs', arguments: ['--partie=reunion', BASE], loader: true, attendu: 'RA-1', criteresMin: 5,
    sabotages: [
      { nom: 'agent-du-corps', fichier: REU, avant: "supabaseAdmin.rpc('station_reunion_ouvrir', { p_agent: a.nom })", apres: "supabaseAdmin.rpc('station_reunion_ouvrir', { p_agent: String(corps.agent ?? a.nom) })", tue: 'RA-2' },
      { nom: 'six-lignes', fichier: REU, avant: 'lignes.length <= 5', apres: 'lignes.length <= 6', tue: 'RA-3' },
      { nom: 'pause-503', fichier: REU, avant: "refus('Pause générale : pas de réunion.', 409, 'pause')", apres: "refus('Pause générale : pas de réunion.', 503, 'pause')", tue: 'RA-3' },
      { nom: 'chiffres-pour-tous', fichier: CHI, avant: "if (a.nom !== 'chef') return NextResponse.json({ error: 'Réservé au Chef.' }, { status: 403 })", apres: '', tue: 'RA-3' },
      { nom: 'abandon-journalise', fichier: REU, avant: "if (corps.action === 'abandonner' && seules(corps, ['action', 'id', 'motif'])) {", apres: "if (corps.action === 'abandonner' && seules(corps, ['action', 'id', 'motif'])) { await supabaseAdmin.from('app_errors').select('id')", tue: 'RA-5' },
      { nom: 'reunion-retiree', fichier: REU, retirer: true, tue: 'RA-1' },
    ],
  },
  {
    commande: 'scripts/station-route-qa.mjs', arguments: ['--partie=salles2', BASE], loader: true, attendu: 'SL-1', criteresMin: 8,
    sabotages: [
      { nom: 'tickets-contenu', fichier: `${SA}/presti.ts`, avant: '({ nombre: Number((await c.deps.lectures.ticketsOuverts())?.nombre ?? 0) })', apres: '((await c.deps.lectures.ticketsOuverts()) as { nombre: number })', tue: 'SL-6' },
      { nom: 'departements-nominatifs', fichier: `${SA}/observatoire.ts`, avant: 'oui: Number(x.oui ?? 0) }))', apres: 'oui: Number(x.oui ?? 0), nom_entreprise: x.nom_entreprise ?? null }))', tue: 'SL-5' },
      { nom: 'activite-depuis-maintenant', fichier: `${SA}/index.ts`, avant: '{ p_depuis: c.depuisMinuit }', apres: '{ p_depuis: c.maintenant.toISOString() }', tue: 'SL-4' },
      { nom: 'sante-a-venir', fichier: ST, avant: "sante: await env('direct.barre.sante', () => deps.lectures.santeService()),", apres: 'sante: aVenir(),', tue: 'SL-3' },
      { nom: 'audience-sous-sante', fichier: ST, avant: "'salle.audience': 'audience'", apres: "'salle.audience': 'sante'", tue: 'SL-2' },
      { nom: 'radar-retire', fichier: `${SA}/radar.ts`, retirer: true, tue: 'SL-1' },
    ],
  },
  {
    commande: 'scripts/station-reunion-qa.mjs', arguments: [BASE], loader: false, attendu: 'RU-1', criteresMin: 9,
    sabotages: [
      { nom: 'jeton-au-modele', fichier: SCR, avant: "const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k !== o['jeton-env'] && v !== jeton))", apres: 'const env = { ...process.env }', tue: 'RU-8' },
      { nom: 'sans-abandon', fichier: SCR, avant: "await appel('POST', '/api/agents/reunion', { action: 'abandonner', id, motif }); break", apres: 'void motif; break', tue: 'RU-3' },
      { nom: 'pause-en-erreur', fichier: SCR, avant: "console.log('reunion : pause générale : pas de réunion'); return 0", apres: "console.log('reunion : pause générale : pas de réunion'); return 1", tue: 'RU-5' },
      { nom: 'a-sec-qui-ouvre', fichier: SCR, avant: 'if (!o.sec) {', apres: 'if (true) {', tue: 'RU-7' },
      { nom: 'engage-cents', fichier: SCR, avant: 'cle: i.cle_idempotence })', apres: 'cle: i.cle_idempotence, engage_cents: 0 })', tue: 'RU-2' },
      // Le modèle seul tué au délai (ni /T, ni groupe) : son petit-enfant bat encore.
      { nom: 'modele-seul-tue', fichier: SCR, avant: "setTimeout(() => { tuerArbre(e.pid); ok('delai') }", apres: "setTimeout(() => { e.kill('SIGKILL'); ok('delai') }", tue: 'RU-4' },
      { nom: 'chiffres-ignores', fichier: SCR, avant: 'if (c.status !== 200) throw new Error(`chiffres : ${c.status}`)', apres: 'if (c.status !== 200 && false) throw new Error(`chiffres : ${c.status}`)', tue: 'RU-6' },
      { nom: 'prealable-en-erreur', fichier: SCR, avant: '${quoi} introuvable (${f})`); return 3 }', apres: '${quoi} introuvable (${f})`); return 1 }', tue: 'RU-9' },
      { nom: 'doc-sans-heure', fichier: DOC, avant: 'Chaque jour à 18 h', apres: 'Chaque jour en fin de journée', tue: 'RU-10' },
      { nom: 'script-retire', fichier: SCR, retirer: true, tue: 'RU-1' },
    ],
  },
]
export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeux' },
  { id: 'JA-4', module: './controles.mjs', fonction: 'controleSecrets' },
]
