// scripts/fixtures/026-pilotage/t/extraction/cas.mjs — les cas de poste-extraction-qa (fiche 026-171, partie B, écrite par Claude
// Code) : les requêtes jouées, dans le même ordre, sur la référence puis sur l'état jugé, avec le même compte simulé et les mêmes
// doublures. Un cas : { nom, route, chemin, compte, drapeaux?, pannes?, messages?, surcharges?, fetch?, stripe?, coutIA?, cwd?, saturee? }.
//   compte : fondateur (rôle direction) · lecture (fondateur en lecture seule) · partenaire · sans_jeton (401) · artisan (403)
//   « __erreur » : une valeur { __erreur: '…' } devient une exception dans la doublure.
export const ROUTES = ['barre', 'etat', 'audience', 'securite/bans', 'clients', 'cerveaux']
const B = '/api/controle'
const ETAT_OK = { niveau: 'ok', controles: [{ cle: 'site', etat: 'ok', libelle: 'Site public' }, { cle: 'stripe', etat: 'ok', libelle: 'Stripe' }] }
const ETAT_DEGRADE = { niveau: 'degrade', controles: [{ cle: 'site', etat: 'ok', libelle: 'Site public' }, { cle: 'resend', etat: 'warn', libelle: 'Emails (Resend)' }, { cle: 'crons', etat: 'crit', libelle: 'Tâches planifiées' }, { cle: 'ia', etat: 'warn', libelle: 'Facture Anthropic' }] }
const IA = { usd: 40, parEspace: null }

export const CAS = [
  // ── barre ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'barre · fondateur', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', fetch: { etat: { status: 200, json: ETAT_OK } }, coutIA: IA },
  { nom: 'barre · fondateur, service dégradé', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', fetch: { etat: { status: 200, json: ETAT_DEGRADE } }, coutIA: IA },
  { nom: 'barre · fondateur, état 500', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', fetch: { etat: { status: 500, json: {} } }, coutIA: IA },
  { nom: 'barre · fondateur, Stripe et Anthropic en panne', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', fetch: { etat: { status: 200, json: ETAT_OK } }, stripe: { mrr: { __erreur: 'Stripe injoignable' }, encaisse: { __erreur: 'Stripe injoignable' } }, coutIA: null },
  { nom: 'barre · fondateur, budget et espace posés', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', fetch: { etat: { status: 200, json: ETAT_OK } }, coutIA: { usd: 0, parEspace: { 'espace-essai': 0 } }, estimationCredits: { euros: 0.07 }, env: { ANTHROPIC_WORKSPACE_PRESTI: 'espace-essai', BUDGET_IA_MENSUEL_EUR: '50' } },
  { nom: 'barre · fondateur, messagerie fermée, alertes en panne', route: 'barre', chemin: `${B}/barre`, compte: 'fondateur', drapeaux: { messagerie: false }, pannes: ['table:alertes'], fetch: { etat: { status: 200, json: ETAT_OK } }, coutIA: IA },
  { nom: 'barre · fondateur en lecture', route: 'barre', chemin: `${B}/barre`, compte: 'lecture', fetch: { etat: { status: 200, json: ETAT_OK } }, coutIA: IA },
  { nom: 'barre · partenaire', route: 'barre', chemin: `${B}/barre`, compte: 'partenaire', fetch: { etat: { status: 200, json: ETAT_OK } }, coutIA: IA },
  { nom: 'barre · sans jeton', route: 'barre', chemin: `${B}/barre`, compte: 'sans_jeton' },
  // ── etat ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'etat · fondateur', route: 'etat', chemin: `${B}/etat`, compte: 'fondateur', coutIA: IA },
  { nom: 'etat · fondateur, crons en retard, Resend en attente', route: 'etat', chemin: `${B}/etat`, compte: 'fondateur', coutIA: { usd: 60, parEspace: null }, fetch: { resend: { status: 200, json: { data: [{ name: 'prestiapp.fr', status: 'pending' }] } } }, env: { BUDGET_IA_MENSUEL_EUR: '50' } },
  { nom: 'etat · fondateur, table des crons et sondes en panne', route: 'etat', chemin: `${B}/etat`, compte: 'fondateur', pannes: ['table:passages_cron'], fetch: { site: 503, login: 200, resend: { status: 500, json: {} } }, stripe: { joignable: { __erreur: 'Stripe injoignable' } }, coutIA: null },
  { nom: 'etat · fondateur, sonde qui coupe', route: 'etat', chemin: `${B}/etat`, compte: 'fondateur', fetch: { coupure: true }, coutIA: { __erreur: 'Anthropic Admin illisible' } },
  { nom: 'etat · partenaire', route: 'etat', chemin: `${B}/etat`, compte: 'partenaire' },
  { nom: 'etat · artisan', route: 'etat', chemin: `${B}/etat`, compte: 'artisan' },
  { nom: 'etat · sans jeton', route: 'etat', chemin: `${B}/etat`, compte: 'sans_jeton' },
  // ── audience ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'audience · fondateur', route: 'audience', chemin: `${B}/audience`, compte: 'fondateur' },
  { nom: 'audience · fondateur, historique', route: 'audience', chemin: `${B}/audience?historique=1`, compte: 'fondateur' },
  { nom: 'audience · fondateur, saturée', route: 'audience', chemin: `${B}/audience`, compte: 'fondateur', saturee: true },
  { nom: 'audience · drapeau baissé', route: 'audience', chemin: `${B}/audience`, compte: 'fondateur', drapeaux: { audience: false } },
  { nom: 'audience · tables absentes (0090)', route: 'audience', chemin: `${B}/audience`, compte: 'fondateur', pannes: ['rpc:audience_direct'], messages: { 'rpc:audience_direct': 'relation "public.audience_vues" does not exist' } },
  { nom: 'audience · autre panne de lecture', route: 'audience', chemin: `${B}/audience?historique=1`, compte: 'fondateur', pannes: ['rpc:audience_historique', 'table:artisans'] },
  { nom: 'audience · partenaire', route: 'audience', chemin: `${B}/audience`, compte: 'partenaire' },
  { nom: 'audience · sans jeton, drapeau baissé', route: 'audience', chemin: `${B}/audience`, compte: 'sans_jeton', drapeaux: { audience: false } },
  // ── securite/bans ──────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'bans · fondateur', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'fondateur' },
  { nom: 'bans · fondateur, aucun abus', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'fondateur', surcharges: { tables: { ip_abus: [] } } },
  { nom: 'bans · fondateur, abus en panne', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'fondateur', pannes: ['table:ip_abus'] },
  { nom: 'bans · fondateur, bans en panne', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'fondateur', pannes: ['table:ip_bans'] },
  { nom: 'bans · fondateur en lecture', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'lecture' },
  { nom: 'bans · partenaire', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'partenaire' },
  { nom: 'bans · sans jeton', route: 'securite/bans', chemin: `${B}/securite/bans`, compte: 'sans_jeton' },
  // ── clients ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'clients · fondateur', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur' },
  { nom: 'clients · fondateur, recherche', route: 'clients', chemin: `${B}/clients?q=%20DEUX%20`, compte: 'fondateur' },
  { nom: 'clients · fondateur, offre studio', route: 'clients', chemin: `${B}/clients?offre=studio`, compte: 'fondateur' },
  { nom: 'clients · fondateur, offre inconnue', route: 'clients', chemin: `${B}/clients?offre=inconnue&q=trois`, compte: 'fondateur' },
  { nom: 'clients · fondateur, apports fermés', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur', drapeaux: { apports: false } },
  { nom: 'clients · fondateur, apporteurs illisibles', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur', pannes: ['table:apporteurs'], messages: { 'table:apporteurs': 'permission denied for table apporteurs' } },
  { nom: 'clients · fondateur, registre et leads en panne', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur', pannes: ['table:registre_apports', 'table:leads'] },
  { nom: 'clients · fondateur, liste en panne', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur', pannes: ['table:artisans'] },
  { nom: 'clients · fondateur, aucun artisan', route: 'clients', chemin: `${B}/clients`, compte: 'fondateur', surcharges: { tables: { artisans: [] } } },
  { nom: 'clients · fondateur en lecture', route: 'clients', chemin: `${B}/clients`, compte: 'lecture' },
  { nom: 'clients · partenaire', route: 'clients', chemin: `${B}/clients`, compte: 'partenaire' },
  { nom: 'clients · artisan', route: 'clients', chemin: `${B}/clients`, compte: 'artisan' },
  { nom: 'clients · sans jeton', route: 'clients', chemin: `${B}/clients`, compte: 'sans_jeton' },
  // ── cerveaux ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  { nom: 'cerveaux · fondateur', route: 'cerveaux', chemin: `${B}/cerveaux`, compte: 'fondateur', cwd: 'avec' },
  { nom: 'cerveaux · fondateur, aucun dossier', route: 'cerveaux', chemin: `${B}/cerveaux`, compte: 'fondateur', cwd: 'vide' },
  { nom: 'cerveaux · partenaire', route: 'cerveaux', chemin: `${B}/cerveaux`, compte: 'partenaire', cwd: 'avec' },
  { nom: 'cerveaux · sans jeton', route: 'cerveaux', chemin: `${B}/cerveaux`, compte: 'sans_jeton', cwd: 'avec' },
]
