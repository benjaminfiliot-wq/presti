// 036-007 — fabrique du département Direction (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-007 du § 4) :
// presti-dep-direction (le chef : page du matin, rapport du lundi, diagnostic « où perdez-vous de l'argent ? », aiguillage de l'alerte et du coût),
// lib-alerte-liste (l'agent Alerte, LISTE FERMÉE), lib-cout-ia (le compteur de coût IA par compte et par jour) et le banc presti-banc-direction.
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (« Exemple. » devant tout nom, aucune adresse).
// Mode A (comme 035-003 à 035-005, 036-001 et 036-003) : tout est INACTIF, en simulation, sans identifiant ; les lectures sont ÉPINGLÉES (passées par
// l'appelant) et les écritures partent dans `effets_prevus`, jamais faites. Le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003.
// Le code compte, le modèle ne compte rien (lib/assistant/briefing.ts:1-9) : ni la page, ni le rapport, ni l'alerte, ni le coût n'appellent de modèle.
//   node .orchestre/preuves/036-007/construire.mjs <dossier> [--erreur=<id>] [--ids=<json>]   → les programmes SDK (collés tels quels dans n8n)
//   node .orchestre/preuves/036-007/construire.mjs --contrats                                   → plans/011-cadrage-01-11/p6-signature/contrats/direction.json
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie, CODE_BILAN } from '../035-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const CERVEAU = '596OC5mL2aMBq6SD' // presti-cerveau (036-001) : seul appelant du chef avec le banc
export const CHEF = 'presti-dep-direction'
export const BANC = 'presti-banc-direction'
export const ENFANTS = ['lib-alerte-liste', 'lib-cout-ia']
export const VERSION_CONTRATS = '1.0.0'
export const DEPARTEMENTS = ['tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction'] // 0193 : check des tables couts_ia_*, competences
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']

// ─── Les listes fermées (copiées du plan, comparées par le juge à des listes écrites indépendamment) ──────────────────────────────────
// A8 (p6:109-110, reel du 25/09) : la LISTE FERMÉE des événements qui réveillent quelqu'un, chacun avec son responsable. Rien d'autre ne réveille l'artisan.
export const LISTE_ALERTES = {
  demande_de_prix_ferme: 'artisan', client_mecontent: 'artisan', litige: 'artisan', message_urgent_tard: 'artisan',
  impaye_au_dessus_du_seuil: 'artisan', workflow_en_panne: 'benj', cout_qui_derive: 'benj',
}
// lib-rapport-hebdo (035-005) : la liste fermée de ses comptes ; aucun indicateur de gain.
export const KPI_RAPPORT = ['actions_preparees', 'relances_preparees', 'fait_seul', 'en_attente', 'echecs', 'refus_porte']
export const MOTS_DE_GAIN = '(gain|économi|gagn|rentab|bénéfic|retour sur invest)'

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ─────────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const DATE_N = { type: ['string', 'null'], format: 'date-time' }
const JOUR = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const JOUR_N = { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const BOOL = { type: 'boolean' }
const INT = (min, max) => ({ type: 'integer', minimum: min, maximum: max })
const INT_N = (min, max) => ({ type: ['integer', 'null'], minimum: min, maximum: max })
const TXT = (max) => ({ type: 'string', maxLength: max })
const TXT_N = (max) => ({ type: ['string', 'null'], maxLength: max })
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const tableau = (items, max) => ({ type: 'array', maxItems: max, items })
const CLE = { type: 'string', minLength: 1, maxLength: 40, pattern: '^[A-Za-z0-9_:.-]+$' }
const CLE80 = { type: 'string', minLength: 1, maxLength: 80 }

const EVENEMENT_ALERTE = objet({ artisan_id: UUID, type: { type: 'string', maxLength: 40, pattern: '^[a-z_]+$' }, cle: CLE, survenu_le: DATE,
  faits: objet({ prix_ferme: BOOL, mecontent: BOOL, litige: BOOL, urgent: BOOL, montant_centimes: INT(0, 1e9), workflow: { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' },
    total_centimes: INT(0, 1e11), base_centimes: INT(0, 1e11) }, []) })
const APPEL = objet({ artisan_id: UUID, cle: { type: 'string', minLength: 3, maxLength: 120, pattern: '^[A-Za-z0-9_:.-]+$' }, departement: { enum: DEPARTEMENTS },
  modele: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{1,79}$' }, externe: BOOL, jetons_entree: INT(0, 1e7), jetons_sortie: INT(0, 1e7),
  cout_eur: { type: ['number', 'null'], minimum: 0, maximum: 100000 }, source_tarif: TXT_N(120), survenu_le: DATE })
const CUMUL = objet({ artisan_id: UUID, jour: JOUR, departement: { enum: DEPARTEMENTS }, modele: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{1,79}$' }, externe: BOOL,
  appels: INT(0, 1e7), cout_millicentimes: INT(0, 1e11) })
const PRECEDENT = objet({ artisan_id: UUID, jour: JOUR, cout_millicentimes: INT(0, 1e11) })
const BLOC_COUT = objet({ jour: JOUR, appels: tableau(APPEL, 500), cumul_du_jour: tableau(CUMUL, 200), jours_precedents: tableau(PRECEDENT, 100), cles_connues: tableau({ type: 'string', maxLength: 120 }, 5000),
  cles_deja_alertees: tableau({ type: 'string', maxLength: 80 }, 1000) }, ['jour', 'appels', 'cumul_du_jour', 'jours_precedents', 'cles_connues'])
const BLOC_ALERTE = objet({ evenements: tableau(EVENEMENT_ALERTE, 100), cles_deja_alertees: tableau({ type: 'string', maxLength: 80 }, 1000), alertes_envoyees_aujourdhui: INT(0, 1000) })
const SOURCE = objet({ lue: BOOL, le: JOUR })
const BLOC_MATIN = objet({
  sources: objet({ impayes: SOURCE, devis: SOURCE, demandes: SOURCE, cartes: SOURCE }),
  impayes: tableau(objet({ artisan_id: UUID, id: UUID, numero: TXT_N(40), total_ttc: { type: 'number', minimum: 0, maximum: 1e7 }, date_echeance: JOUR_N }), 200),
  devis: tableau(objet({ artisan_id: UUID, id: UUID, numero: TXT_N(40), total_ttc: { type: 'number', minimum: 0, maximum: 1e7 }, envoye_le: DATE_N }), 200),
  demandes: tableau(objet({ artisan_id: UUID, id: UUID, urgent: BOOL }), 200),
  stock: tableau(objet({ artisan_id: UUID, id: UUID, article: TXT_N(80), reste: { type: ['number', 'null'] } }), 50),
  exclus: tableau({ type: 'string', maxLength: 60 }, 200),
  cartes: tableau(objet({ artisan_id: UUID, cle: CLE80, type_action: { type: 'string', pattern: '^[a-z_]{2,60}$' }, objet: TXT(60), titre: TXT(120), apercu: TXT(300), montant_centimes: INT_N(0, 1e10), preparee_le: DATE }), 50),
  cles_existantes: tableau({ type: 'string', maxLength: 80 }, 1000),
}, ['sources', 'impayes', 'devis', 'demandes', 'cartes'])
const BLOC_LUNDI = objet({ du: JOUR, au: JOUR, lu_le: JOUR, kpis: tableau({ type: 'string', pattern: '^[a-z_]{2,60}$' }, 20), bases_de_depart: { type: 'object' },
  actions: tableau(objet({ type_action: { type: 'string', pattern: '^[a-z_]{2,60}$' }, etat: { enum: ['fait_seul', 'en_attente', 'echec', 'refuse_porte', 'deja_traite'] }, le: DATE }), 5000),
  devis_signes: tableau(objet({ artisan_id: UUID, id: UUID, montant_centimes: INT(0, 1e10), signe_le: DATE }), 500),
  relances: tableau(objet({ artisan_id: UUID, devis_id: UUID, le: DATE }), 2000),
  encaissements: tableau(objet({ artisan_id: UUID, id: UUID, montant_centimes: INT(0, 1e10), paye_le: DATE }), 2000),
  impayes_en_cours: objet({ lue: BOOL, nombre: INT(0, 1e6), montant_centimes: INT(0, 1e11) }),
  lues: objet({ encaissements: BOOL, devis_signes: BOOL, relances: BOOL, journal: BOOL }) })
const BLOC_DIAGNOSTIC = objet({ lu_le: JOUR, periode_jours: INT(1, 365), depuis: JOUR_N,
  demandes: { type: ['object', 'null'], additionalProperties: false, required: ['recues', 'sans_reponse', 'delai_median_min'], properties: { recues: INT(0, 1e6), sans_reponse: INT(0, 1e6), delai_median_min: INT_N(0, 1e6) } },
  devis: { type: ['object', 'null'], additionalProperties: false, required: ['envoyes', 'signes', 'non_signes_nombre', 'non_signes_centimes'], properties: { envoyes: INT(0, 1e6), signes: INT(0, 1e6), non_signes_nombre: INT(0, 1e6), non_signes_centimes: INT(0, 1e11) } } })
const CONFIG_CHEF = objet({ offre: { enum: OFFRES }, interrupteur_general: BOOL, interrupteur_departement: BOOL, seuil_impaye_centimes: INT(0, 1e9), plafond_alertes_jour: INT(1, 10),
  plafond_cout_jour_centimes: INT(1, 1e8), seuil_derive_pct: INT(10, 1000), jours_base_min: INT(1, 14), plancher_derive_centimes: INT(0, 1e6) }, [])
export const GENRES = ['matin', 'lundi', 'diagnostic', 'alerte', 'cout']
export const SCHEMAS = {
  [CHEF]: { sans_contact: false, config: CONFIG_CHEF,
    // `evenements` : la forme que le Cerveau (036-001) envoie déjà ; `genre` et les blocs de lecture sont facultatifs (un genre absent se déduit d'un événement page_du_matin ;
    // un bloc absent vaut « lecture absente » : rien n'est affirmé).
    donnees: objet({ evenements: tableau({ type: 'object' }, 200), genre: { enum: GENRES }, maintenant: DATE, matin: BLOC_MATIN, lundi: BLOC_LUNDI, diagnostic: BLOC_DIAGNOSTIC, alerte: BLOC_ALERTE, cout: BLOC_COUT }, ['evenements']) },
  'lib-alerte-liste': { sans_contact: true,
    config: objet({ interrupteur_general: BOOL, interrupteur_departement: BOOL, seuil_impaye_centimes: INT(0, 1e9), plafond_alertes_jour: INT(1, 10) }),
    donnees: objet({ evenements: tableau(EVENEMENT_ALERTE, 100), cles_deja_alertees: tableau({ type: 'string', maxLength: 80 }, 1000), alertes_envoyees_aujourdhui: INT(0, 1000), maintenant: DATE }) },
  'lib-cout-ia': { sans_contact: true,
    config: objet({ interrupteur_general: BOOL, interrupteur_departement: BOOL, plafond_jour_centimes: INT(1, 1e8), seuil_derive_pct: INT(10, 1000), jours_base_min: INT(1, 14), plancher_derive_centimes: INT(0, 1e6) }),
    donnees: objet({ jour: JOUR, maintenant: DATE, appels: tableau(APPEL, 500), cumul_du_jour: tableau(CUMUL, 200), jours_precedents: tableau(PRECEDENT, 100), cles_connues: tableau({ type: 'string', maxLength: 120 }, 5000) }) },
}
export const EFFETS = {
  [CHEF]: ['deposer_page', 'deposer_rapport', 'deposer_diagnostic', 'appeler', 'noter_evenement', '(effets de lib-alerte-liste)', '(effets de lib-cout-ia)'],
  'lib-alerte-liste': ['envoyer_push', 'alerter', 'noter_evenement'],
  'lib-cout-ia': ['ecrire_appel_cout', 'noter_evenement'],
}
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-007',
    source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-007 du § 4 ; lib/assistant/briefing.ts ; supabase/migrations/0193_systeme_agents.sql (couts_ia_appels, couts_ia_jour, competences)',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute ligne lue porte artisan_id et doit être celle du compte (« Supabase account » passe outre la RLS). Les écritures ne sont jamais faites ici : elles partent dans effets_prevus.' }
  return { 'direction.json': { ...base, titre: 'presti-dep-direction@1 — le département Direction (page du matin, rapport du lundi, diagnostic, alerte à liste fermée, coût IA)',
    chef: { workflow: CHEF, config: SCHEMAS[CHEF].config, donnees: SCHEMAS[CHEF].donnees, effets_prevus: EFFETS[CHEF],
      genres: { matin: 'page du matin : l’argent d’abord (impayés, devis à signer, demandes sans réponse), trois priorités, et elle se TERMINE par des cartes à valider',
        lundi: 'rapport du lundi : chaque chiffre avec sa source et sa date ; une relance n’est créditée que si elle précède la signature (A10) ; aucun chiffre de gain',
        diagnostic: '« où perdez-vous de l’argent ? » : calculé sur les données, sinon « pas encore de données », jamais estimé (A16)',
        alerte: 'aiguille vers lib-alerte-liste (liste fermée A8)', cout: 'aiguille vers lib-cout-ia, puis vers lib-alerte-liste si le coût dérive ou atteint le plafond' },
      declencheurs_voulus: { matin: 'événement page_du_matin, 7 h 30 Paris (route déjà connue du Cerveau)', lundi: 'événement rapport_du_lundi, 8 h Paris (route à ajouter au Cerveau)',
        diagnostic: 'événement diagnostic_a_faire, premier écran d’un nouveau compte (route à ajouter)', alerte: 'événement d’interruption alerte_a_evaluer (route à ajouter)', cout: 'événement cout_ia_du_jour (route à ajouter)' } },
    enfants: Object.fromEntries(ENFANTS.map((n) => [`${n}@1`, { config: SCHEMAS[n].config, donnees: SCHEMAS[n].donnees, effets_prevus: EFFETS[n] }])),
    liste_fermee_alertes: { regle: 'Seuls ces types peuvent réveiller quelqu’un ; tout autre type est ignoré et compté. Un artisan n’est réveillé que par un type dont il est le responsable, hors des heures calmes (21 h-7 h Paris) sauf message urgent tard, dans la limite du plafond du jour ; le reste va à la page du matin.',
      types: LISTE_ALERTES, canaux: { artisan: 'push (lib/push.ts:105, envoyerPushArtisan) — prévu, jamais fait', benj: 'lib-alerter@1 (categorie workflow_en_panne ou cout_qui_derive)' } },
    cout_ia: { tables: 'couts_ia_appels (une ligne par appel, clé unique) et couts_ia_jour (cumul par compte, jour de Paris, département, modèle) — migration 0193, écrite et non appliquée',
      regle: 'Le coût est calculé par le code (jetons × tarif daté, en millièmes de centime) ; un appel sans tarif daté est compté mais son coût reste inconnu (jamais zéro inventé) ; la part envoyée à un modèle externe est comptée à part.' },
    lectures_reelles_prevues: { regle: 'Au « go » de Benj, derrière la porte « simulation », select= limité, filtre artisan_id sur chaque requête, jamais un nom, un e-mail ni un texte de client (R7).',
      requetes: { impayes: 'GET /rest/v1/factures?select=id,artisan_id,numero,total_ttc,date_echeance,statut&artisan_id=eq.<compte>', devis: 'GET /rest/v1/devis?select=id,artisan_id,numero,total_ttc,envoye_le,statut&artisan_id=eq.<compte>&statut=eq.envoye',
        demandes: 'GET /rest/v1/leads?select=id,artisan_id,statut,urgence&artisan_id=eq.<compte>', cartes: 'GET /rest/v1/opportunites?select=… (0185)&organisation_id=eq.<compte>',
        cout: 'GET /rest/v1/couts_ia_jour?select=…&artisan_id=eq.<compte>&jour=eq.<jour>' } } } }
}

// ─── Les nœuds Code ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUES = { // les lignes que le juge mute : elles doivent exister à l'identique, sinon le juge le dit
  source_impayes: "source: 'factures émises et échues non payées, lues le ' + src.impayes.le",
  dernier_bloc: "dernier_bloc: 'cartes'",
  isolation_page: "if (lignes.some((x) => x.artisan_id !== org))",
  gain: "const GAIN = /(gain|économi|gagn|rentab|bénéfic|retour sur invest)/i;",
  avant_signature: "Date.parse(r.le) < Date.parse(x.signe_le)",
  pas_de_donnees: "if (!avecDemandes && !avecDevis) {",
  liste: "const LISTE = {",
  hors_liste: "if (!Object.prototype.hasOwnProperty.call(LISTE, ev.type)) { ignorees.hors_liste++;",
  calmes: "if (calmes && ev.type !== 'message_urgent_tard')",
  plafond_alertes: "if (prevus >= c.plafond_alertes_jour)",
  isolation_alerte: "if (d.evenements.some((x) => x.artisan_id !== org))",
  tarif: "const tarife = a.cout_eur !== null && a.source_tarif !== null && /\\d{4}-\\d{2}-\\d{2}/.test(a.source_tarif);",
  doublon_appel: "if (connues.has(a.cle) || vus.has(a.cle)) { doublons++; continue; }",
  externe: "if (g.externe) externe_centimes += cts;",
  isolation_cout: "if (d.appels.some((x) => x.artisan_id !== org)",
  plafond: "const plafond_atteint = total_centimes >= c.plafond_jour_centimes;",
  interrupteur: "if (!(c.interrupteur_general === true && c.interrupteur_departement === true))",
}
const AIDES = String.raw`const eurC = (c) => { const n = Math.round(c), a = Math.abs(n), ent = Math.floor(a / 100), ct = a % 100; return (n < 0 ? '-' : '') + String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (ct ? ',' + String(ct).padStart(2, '0') : '') + ' €'; };
const eurosCourt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
const parisJour = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.parse(iso)));
const parisHeure = (iso) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(new Date(Date.parse(iso))));
const joursEntre = (de, a) => Math.floor((Date.parse(a + 'T00:00:00Z') - Date.parse(String(de).slice(0, 10) + 'T00:00:00Z')) / 86400000);
const refuse = (j, sim, evenement, raison) => ({ ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: [raison], journal: [{ evenement: evenement, agent: AGENT, objet_ref: null, decision: raison.slice(0, 200), simulation: sim }] });
`
const TETE = (agent) => `const AGENT = '${agent}';\n` + AIDES

export const CODE_AIGUILLER = String.raw`// presti-dep-direction · Aiguiller (036-007) : ne calcule rien. Il choisit UNE route parmi les cinq genres (matin, lundi, diagnostic, alerte, cout) ;
// interrupteur général ou de département coupé (absent = coupé : fail-closed), genre absent ou inconnu, plafond de coût absent : « stop », rien n'est appelé.
// Un événement page_du_matin sans genre explicite vaut « matin » (la seule route que le Cerveau de 036-001 connaît déjà).
const GENRES = ['matin', 'lundi', 'diagnostic', 'alerte', 'cout'];
return $input.all().map((item) => {
  const j = item.json;
  const e = j.enveloppe, c = e.config, d = e.donnees;
  const genre = typeof d.genre === 'string' ? d.genre : (d.evenements.some((x) => x && x.type === 'page_du_matin') ? 'matin' : null);
  let route = 'stop', raison = null;
  if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) raison = 'interrupteur_coupe';
  else if (!GENRES.includes(genre)) raison = genre === null ? 'genre_absent' : 'genre_inconnu';
  else if (genre === 'cout' && !Number.isInteger(c.plafond_cout_jour_centimes)) raison = 'plafond_absent';
  else route = genre;
  return { json: { ...j, route: route, raison: raison, genre: genre, est_matin: route === 'matin', est_lundi: route === 'lundi', est_diagnostic: route === 'diagnostic', est_alerte: route === 'alerte', est_cout: route === 'cout' } };
});`

export const CODE_RIEN = String.raw`// presti-dep-direction · Rien à faire (036-007) : la route « stop ». Aucun effet, une ligne de journal qui dit pourquoi.
return $input.all().map((item) => {
  const j = item.json, e = j.enveloppe;
  return { json: { ...j, statut: 'rien_a_faire', resultat: { etat: j.raison || 'rien', genre: j.genre || null }, effets_prevus: [],
    journal: [{ evenement: 'direction_saute', agent: 'presti-dep-direction', objet_ref: null, decision: ('aucun travail : ' + (j.raison || 'rien')).slice(0, 200), simulation: e.simulation }] } };
});`

export const CODE_PAGE = TETE('presti-dep-direction') + String.raw`// presti-dep-direction · Page du matin (036-007 ; A7, p6:109) : UNE page, l'argent d'abord (impayés, devis à signer, demandes sans réponse), trois priorités
// (lib/assistant/briefing.ts:111-152, copie figée de composerPriorites comparée au code par le juge), et elle SE TERMINE PAR DES CARTES à valider :
// jamais par une action. Le code compte, le modèle ne compte rien. Aucun nom de client (R7) : les textes sont ceux du code avec un client absent.
// Chaque chiffre porte sa source et sa date ; une lecture en erreur n'est jamais remplacée par un zéro. Écritures : effets_prevus seulement.
const NB_PRIORITES = 3;
const DEVIS_SANS_REPONSE_JOURS = 7;
const MAX_CARTES = 10;
function priorites(e, exclus) {
  const argent = [
    ...e.impayes.map((i) => ({ cle: 'impaye:' + i.id, objet: 'facture:' + i.id, famille: 'impaye', montant: i.montant, href: '/factures', texte: (i.client ?? 'Un client') + ' vous doit ' + eurosCourt(i.montant),
      detail: (i.numero ?? 'Facture') + ' · ' + i.jours_de_retard + ' jour' + (i.jours_de_retard > 1 ? 's' : '') + ' de retard' })),
    ...e.devis.map((d) => ({ cle: 'devis:' + d.id, objet: 'devis:' + d.id, famille: 'devis', montant: d.montant, href: '/devis/' + d.id, texte: 'Relancer ' + (d.client ?? 'ce client') + ' : ' + eurosCourt(d.montant) + ' en attente',
      detail: (d.numero ?? 'Devis') + ' · sans réponse depuis ' + d.jours + ' jours' })),
  ].sort((a, b) => (b.montant ?? 0) - (a.montant ?? 0) || (a.cle < b.cle ? -1 : 1));
  const demandes = [...e.demandes].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || (a.id < b.id ? -1 : 1))
    .map((l) => ({ cle: 'demande:' + l.id, objet: 'lead:' + l.id, famille: 'demande', montant: null, href: '/messages', texte: 'Répondre à ' + (l.nom ?? 'une nouvelle demande'), detail: l.urgent ? 'Demande urgente' : 'Demande en attente' }));
  const stock = (e.stock || []).map((a) => ({ cle: 'stock:' + a.id, objet: 'article:' + a.id, famille: 'stock', montant: null, href: '/inventaire', texte: (a.article ?? 'Un article') + ' : plus que ' + (a.reste ?? '?') + ' en stock', detail: 'Sous le seuil d’alerte' }));
  const toutes = [...argent, ...demandes, ...stock].filter((p) => !exclus.has(p.objet));
  return { priorites: toutes.slice(0, NB_PRIORITES), autres: Math.max(0, toutes.length - NB_PRIORITES) };
}
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const m = d.matin;
    if (!m || typeof d.maintenant !== 'string') return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'matin' }, effets_prevus: [], journal: [ligne('page_saute', null, 'lecture du point du jour absente : rien n’est affirmé')] };
    const lignes = [].concat(m.impayes, m.devis, m.demandes, m.stock || [], m.cartes);
    if (lignes.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'page_refusee', 'autre_compte : une ligne lue n’est pas celle de ce compte');
    const jour = parisJour(d.maintenant), cle = 'pm:' + jour, src = m.sources;
    if ((m.cles_existantes || []).includes(cle)) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'deja_deposee', genre: 'matin', jour: jour }, effets_prevus: [], journal: [ligne('page_saute', cle, 'page déjà déposée ce jour : rien à refaire')] };
    const impayes = src.impayes.lue ? m.impayes.filter((i) => i.date_echeance).map((i) => ({ id: i.id, numero: i.numero, montant: i.total_ttc, jours_de_retard: joursEntre(i.date_echeance, jour) })).filter((i) => i.jours_de_retard > 0) : [];
    const devis = src.devis.lue ? m.devis.filter((x) => x.envoye_le).map((x) => ({ id: x.id, numero: x.numero, montant: x.total_ttc, jours: joursEntre(x.envoye_le, jour) })).filter((x) => x.jours >= DEVIS_SANS_REPONSE_JOURS) : [];
    const demandes = src.demandes.lue ? m.demandes.map((l) => ({ id: l.id, urgent: l.urgent })) : [];
    const p = priorites({ impayes: impayes, devis: devis, demandes: demandes, stock: m.stock || [] }, new Set(m.exclus || []));
    const centimes = (liste) => liste.reduce((s, x) => s + Math.round(x.montant * 100), 0);
    const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
    const indispo = (id, libelle, nom) => ({ id: id, libelle: libelle, nombre: null, montant_centimes: null, texte: libelle + ' : non lus (lecture en erreur), rien n’est affirmé', source: nom + ' : lecture en erreur', date: jour, confiance: 'indisponible' });
    const cImp = centimes(impayes), cDev = centimes(devis);
    const argent = [
      src.impayes.lue ? { id: 'impayes', libelle: 'Impayés', nombre: impayes.length, montant_centimes: cImp, texte: impayes.length ? 'Impayés : ' + pluriel(impayes.length, 'facture') + ' échue' + (impayes.length > 1 ? 's' : '') + ', ' + eurC(cImp) : 'Impayés : aucune facture échue',
        source: 'factures émises et échues non payées, lues le ' + src.impayes.le, date: src.impayes.le, confiance: 'mesure' } : indispo('impayes', 'Impayés', 'factures'),
      src.devis.lue ? { id: 'devis_a_signer', libelle: 'Devis à signer', nombre: devis.length, montant_centimes: cDev, texte: devis.length ? 'Devis à signer : ' + devis.length + ' devis sans réponse depuis ' + DEVIS_SANS_REPONSE_JOURS + ' jours ou plus, ' + eurC(cDev) : 'Devis à signer : aucun sans réponse depuis ' + DEVIS_SANS_REPONSE_JOURS + ' jours',
        source: 'devis envoyés sans réponse, lus le ' + src.devis.le, date: src.devis.le, confiance: 'mesure' } : indispo('devis_a_signer', 'Devis à signer', 'devis'),
      src.demandes.lue ? { id: 'demandes_sans_reponse', libelle: 'Demandes sans réponse', nombre: demandes.length, montant_centimes: null, texte: demandes.length ? 'Demandes sans réponse : ' + demandes.length : 'Demandes sans réponse : aucune',
        source: 'demandes en attente de réponse, lues le ' + src.demandes.le, date: src.demandes.le, confiance: 'mesure' } : indispo('demandes_sans_reponse', 'Demandes sans réponse', 'demandes'),
    ];
    const cartes = src.cartes.lue ? m.cartes.slice(0, MAX_CARTES).map((k) => ({ cle: k.cle, type_action: k.type_action, objet: k.objet, titre: k.titre, apercu: k.apercu, montant_centimes: k.montant_centimes, preparee_le: k.preparee_le, statut: 'a_valider' })) : [];
    const blocs = [
      { type: 'argent', titre: 'L’argent d’abord', lignes: argent },
      { type: 'priorites', titre: 'Vos trois priorités', priorites: p.priorites, autres: p.autres },
      { type: 'cartes', titre: 'À valider', cartes: cartes, nombre: cartes.length, non_montrees: src.cartes.lue ? Math.max(0, m.cartes.length - MAX_CARTES) : 0,
        texte: !src.cartes.lue ? 'Cartes non lues (lecture en erreur) : rien n’est affirmé' : cartes.length ? pluriel(cartes.length, 'carte') + ' à valider d’un geste' : 'Rien à valider' },
    ];
    const rien = impayes.length === 0 && devis.length === 0 && demandes.length === 0 && cartes.length === 0 && Object.values(src).every((x) => x.lue);
    const page = { date: jour, titre: 'Votre point du jour', blocs: blocs, dernier_bloc: 'cartes', rien_a_signaler: rien };
    return { ...j, statut: 'ok', resultat: { genre: 'matin', jour: jour, page: page },
      effets_prevus: [
        { effet: 'deposer_page', organisation_id: org, cle: cle, destination: 'centre_de_commande', jour: jour },
        { effet: 'noter_evenement', organisation_id: org, type: 'page_du_matin_prete', cle: cle, faits: { priorites: p.priorites.length, cartes: cartes.length } },
      ],
      journal: [ligne('page_du_matin', cle, p.priorites.length + ' priorité(s), ' + cartes.length + ' carte(s), l’argent d’abord, fin sur les cartes')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['page : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_LUNDI = TETE('presti-dep-direction') + String.raw`// presti-dep-direction · Rapport du lundi (036-007 ; A9, A10, A17) : mesurer l'argent, pas l'activité. Chaque chiffre porte sa source, sa date et sa confiance.
// Une relance n'est créditée que si elle PRÉCÈDE la signature du devis (A10) : une relance faite après la signature ne compte pas. Aucun chiffre de « gain » :
// les comptes d'actions passent par lib-rapport-hebdo (liste fermée, 035-005), dont la demande est préparée ici ; le chef ne calcule que des euros encaissés,
// signés et en cours, à partir des lignes lues. Un mot de gain dans une source ou une base fait REFUSER le rapport. Écritures : effets_prevus seulement.
const KPI = ['actions_preparees', 'relances_preparees', 'fait_seul', 'en_attente', 'echecs', 'refus_porte'];
const GAIN = /(gain|économi|gagn|rentab|bénéfic|retour sur invest)/i;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourLong = (iso) => { const [a, m, d] = iso.split('-').map(Number); return (d === 1 ? '1er' : String(d)) + ' ' + MOIS[m - 1] + ' ' + a; };
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const l = d.lundi;
    if (!l) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'lundi' }, effets_prevus: [], journal: [ligne('rapport_saute', null, 'lecture du rapport absente : rien n’est affirmé')] };
    if ([].concat(l.devis_signes, l.relances, l.encaissements).some((x) => x.artisan_id !== org)) return refuse(j, sim, 'rapport_refuse', 'autre_compte : une ligne lue n’est pas celle de ce compte');
    const refus = [];
    if (l.du > l.au) refus.push('période incohérente');
    for (const k of l.kpis) if (!KPI.includes(k)) refus.push('indicateur hors de la liste fermée (aucun chiffre de gain) : ' + k.slice(0, 40));
    for (const [k, b] of Object.entries(l.bases_de_depart)) {
      if (!KPI.includes(k)) refus.push('base de départ d’un indicateur hors liste : ' + k.slice(0, 40));
      if (!b || typeof b.source !== 'string' || !b.source.trim() || typeof b.date !== 'string' || !b.date.trim()) refus.push('chiffre sans source ou sans date : ' + k.slice(0, 40));
      else if (GAIN.test(b.source)) refus.push('chiffre de gain refusé : ' + k.slice(0, 40));
    }
    if (refus.length) return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: refus.slice(0, 20), journal: [ligne('rapport_refuse', null, 'rapport refusé : ' + refus[0])] };
    const cle = 'rl:' + l.du + ':' + l.au;
    const dans = (iso) => { const x = parisJour(iso); return x >= l.du && x <= l.au; };
    const periode = 'du ' + jourLong(l.du) + ' au ' + jourLong(l.au);
    const somme = (liste) => liste.reduce((s, x) => s + x.montant_centimes, 0);
    const indisponible = (id, libelle, nom) => ({ id: id, libelle: libelle, valeur: null, unite: 'eur', source: nom + ' : lecture en erreur', date: l.lu_le, confiance: 'indisponible' });
    const encaisses = l.encaissements.filter((x) => dans(x.paye_le));
    const signes = l.devis_signes.filter((x) => dans(x.signe_le));
    const apresRelance = signes.filter((x) => l.relances.some((r) => r.devis_id === x.id && Date.parse(r.le) < Date.parse(x.signe_le)));
    const indicateurs = [
      l.lues.encaissements ? { id: 'encaisse', libelle: 'Encaissé', valeur: somme(encaisses), unite: 'eur', nombre: encaisses.length, source: 'paiements enregistrés ' + periode + ', lus le ' + jourLong(l.lu_le), date: l.lu_le, confiance: 'mesure' } : indisponible('encaisse', 'Encaissé', 'paiements'),
      l.lues.devis_signes ? { id: 'devis_signes', libelle: 'Devis signés', valeur: somme(signes), unite: 'eur', nombre: signes.length, source: 'devis signés ' + periode + ', lus le ' + jourLong(l.lu_le), date: l.lu_le, confiance: 'mesure' } : indisponible('devis_signes', 'Devis signés', 'devis'),
      l.lues.devis_signes && l.lues.relances ? { id: 'signes_apres_relance', libelle: 'Devis signés après une relance antérieure', valeur: somme(apresRelance), unite: 'eur', nombre: apresRelance.length, source: 'devis signés ' + periode + ' dont une relance précède la signature, lus le ' + jourLong(l.lu_le), date: l.lu_le, confiance: 'mesure' } : indisponible('signes_apres_relance', 'Devis signés après une relance antérieure', 'relances'),
      l.impayes_en_cours.lue ? { id: 'impayes_en_cours', libelle: 'Impayés en cours', valeur: l.impayes_en_cours.montant_centimes, unite: 'eur', nombre: l.impayes_en_cours.nombre, source: 'factures émises non payées, lues le ' + jourLong(l.lu_le), date: l.lu_le, confiance: 'mesure' } : indisponible('impayes_en_cours', 'Impayés en cours', 'factures'),
    ];
    const lignes = ['Rapport de la semaine ' + periode].concat(indicateurs.map((x) => x.valeur === null ? x.libelle + ' : non lu (lecture en erreur), rien n’est affirmé'
      : x.libelle + ' : ' + eurC(x.valeur) + ' (' + x.nombre + ', ' + x.source + ')'));
    if (lignes.some((t) => GAIN.test(t))) return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['chiffre de gain refusé'], journal: [ligne('rapport_refuse', null, 'chiffre de gain refusé')] };
    const demande = { contrat: 'lib-rapport-hebdo@1', organisation_id: org, simulation: sim, cle_idempotence: cle, trace: { execution_parent: 'presti-dep-direction:' + cle, declencheur: 'presti-dep-direction', tentative: 0 },
      config: { periode: 'semaine', kpis: l.kpis, bases_de_depart: l.bases_de_depart }, donnees: { du: l.du, au: l.au, actions: l.actions } };
    return { ...j, statut: 'ok', resultat: { genre: 'lundi', periode: { du: l.du, au: l.au }, indicateurs: indicateurs, lignes: lignes, demande_rapport: demande },
      effets_prevus: [
        { effet: 'appeler', contrat: 'lib-rapport-hebdo@1', cle: cle, raison: 'les comptes d’actions viennent de la liste fermée de lib-rapport-hebdo' },
        { effet: 'deposer_rapport', organisation_id: org, cle: cle, destination: 'centre_de_commande' },
      ],
      journal: [ligne('rapport_du_lundi', cle, indicateurs.length + ' chiffre(s), chacun sourcé et daté, aucun chiffre de gain')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['rapport : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_DIAGNOSTIC = TETE('presti-dep-direction') + String.raw`// presti-dep-direction · Diagnostic (036-007 ; A16, p6:118) : « où perdez-vous de l'argent ? » — demandes sans réponse, devis non signés — calculé sur les
// données DU COMPTE, deux étages (la demande, puis la vente), sinon « pas encore de données ». JAMAIS estimé : aucun seuil inventé, aucun chiffre qui ne soit pas lu.
// Un bloc non lu (null) n'est pas remplacé par un zéro : il est dit « non disponible ». Écritures : effets_prevus seulement.
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const g = d.diagnostic;
    if (!g) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'diagnostic' }, effets_prevus: [], journal: [ligne('diagnostic_saute', null, 'lecture du diagnostic absente : rien n’est affirmé')] };
    const avecDemandes = g.demandes !== null && g.demandes.recues > 0;
    const avecDevis = g.devis !== null && g.devis.envoyes > 0;
    const cle = 'dg:' + g.lu_le;
    if (!avecDemandes && !avecDevis) {
      return { ...j, statut: 'ok', resultat: { genre: 'diagnostic', pas_de_donnees: true, titre: 'Où perdez-vous de l’argent ?', texte: 'Pas encore de données : le diagnostic se calcule dès que vos premières demandes et vos premiers devis sont enregistrés.', constats: [], etages: [], non_disponible: [] },
        effets_prevus: [{ effet: 'deposer_diagnostic', organisation_id: org, cle: cle, destination: 'centre_de_commande', pas_de_donnees: true }], journal: [ligne('diagnostic', cle, 'pas encore de données : aucun chiffre affiché, rien d’estimé')] };
    }
    const periode = 'les ' + g.periode_jours + ' derniers jours, lus le ' + g.lu_le;
    const constats = [], etages = [], nonDispo = [];
    if (g.devis !== null) {
      constats.push({ id: 'devis_non_signes', libelle: 'Devis envoyés et non signés', nombre: g.devis.non_signes_nombre, montant_centimes: g.devis.non_signes_centimes, unite: 'eur', source: 'devis envoyés sur ' + periode, date: g.lu_le, confiance: 'mesure' });
      etages.push({ etage: 'vente', texte: g.devis.envoyes + ' devis envoyé' + (g.devis.envoyes > 1 ? 's' : '') + ', ' + g.devis.signes + ' signé' + (g.devis.signes > 1 ? 's' : '') + ', ' + g.devis.non_signes_nombre + ' non signé' + (g.devis.non_signes_nombre > 1 ? 's' : '') + ' pour ' + eurC(g.devis.non_signes_centimes) });
    } else nonDispo.push('devis');
    if (g.demandes !== null) {
      constats.push({ id: 'demandes_sans_reponse', libelle: 'Demandes sans réponse', nombre: g.demandes.sans_reponse, sur: g.demandes.recues, montant_centimes: null, unite: 'nombre', source: 'demandes reçues sur ' + periode, date: g.lu_le, confiance: 'mesure' });
      etages.push({ etage: 'demande', texte: g.demandes.recues + ' demande' + (g.demandes.recues > 1 ? 's' : '') + ' reçue' + (g.demandes.recues > 1 ? 's' : '') + ', dont ' + g.demandes.sans_reponse + ' sans réponse' });
    } else nonDispo.push('demandes');
    const peu = (g.demandes ? g.demandes.recues : 0) + (g.devis ? g.devis.envoyes : 0) < 5;
    return { ...j, statut: 'ok', resultat: { genre: 'diagnostic', pas_de_donnees: false, titre: 'Où perdez-vous de l’argent ?', constats: constats, etages: etages, non_disponible: nonDispo, peu_de_donnees: peu,
      texte: peu ? 'Calculé sur très peu de données : ces chiffres sont des constats, pas une tendance.' : 'Constats calculés sur vos données, rien n’est estimé.' },
      effets_prevus: [{ effet: 'deposer_diagnostic', organisation_id: org, cle: cle, destination: 'centre_de_commande', pas_de_donnees: false }], journal: [ligne('diagnostic', cle, constats.length + ' constat(s) lu(s), rien d’estimé')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['diagnostic : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_PREPARER_ALERTE = String.raw`// presti-dep-direction · Préparer l'alerte (036-007) : l'enveloppe de lib-alerte-liste@1, rien d'autre. Seuil d'impayé absent = 0 = pas d'alerte d'impayé.
return $input.all().map((item) => {
  const e = item.json.enveloppe, c = e.config, d = e.donnees;
  const a = d.alerte || { evenements: [], cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0 };
  return { json: { contrat: 'lib-alerte-liste@1', organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: ('alerte:' + e.cle_idempotence).slice(0, 80),
    trace: { execution_parent: ('presti-dep-direction:' + e.cle_idempotence).slice(0, 80), declencheur: 'presti-dep-direction', tentative: 0 },
    config: { interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, seuil_impaye_centimes: Number.isInteger(c.seuil_impaye_centimes) ? c.seuil_impaye_centimes : 0, plafond_alertes_jour: Number.isInteger(c.plafond_alertes_jour) ? c.plafond_alertes_jour : 5 },
    donnees: { evenements: a.evenements, cles_deja_alertees: a.cles_deja_alertees, alertes_envoyees_aujourdhui: a.alertes_envoyees_aujourdhui, maintenant: d.maintenant } } };
});`

export const CODE_PREPARER_COUT = String.raw`// presti-dep-direction · Préparer le coût (036-007) : l'enveloppe de lib-cout-ia@1. Le plafond du jour est exigé par l'aiguilleur (« plafond_absent » sinon stop) :
// il n'est jamais inventé. Les autres réglages ont une valeur par défaut écrite ici : dérive à +50 %, trois jours de base au moins, plancher d'un euro.
return $input.all().map((item) => {
  const e = item.json.enveloppe, c = e.config, d = e.donnees;
  const k = d.cout || { jour: String(d.maintenant || '').slice(0, 10), appels: [], cumul_du_jour: [], jours_precedents: [], cles_connues: [] };
  return { json: { contrat: 'lib-cout-ia@1', organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: ('cout:' + e.cle_idempotence).slice(0, 80),
    trace: { execution_parent: ('presti-dep-direction:' + e.cle_idempotence).slice(0, 80), declencheur: 'presti-dep-direction', tentative: 0 },
    config: { interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, plafond_jour_centimes: c.plafond_cout_jour_centimes,
      seuil_derive_pct: Number.isInteger(c.seuil_derive_pct) ? c.seuil_derive_pct : 50, jours_base_min: Number.isInteger(c.jours_base_min) ? c.jours_base_min : 3, plancher_derive_centimes: Number.isInteger(c.plancher_derive_centimes) ? c.plancher_derive_centimes : 100 },
    donnees: { jour: k.jour, maintenant: d.maintenant, appels: k.appels, cumul_du_jour: k.cumul_du_jour, jours_precedents: k.jours_precedents, cles_connues: k.cles_connues } } };
});`

export const CODE_EVALUER_DERIVE = String.raw`// presti-dep-direction · Évaluer la dérive (036-007) : lib-cout-ia a compté ; s'il a levé une dérive ou le plafond, ses événements d'alerte sont envoyés à
// lib-alerte-liste (la LISTE FERMÉE : aucune alerte ne part ailleurs). Sinon rien n'est à alerter.
const orig = $('Aiguiller').first().json.enveloppe;
const s = $input.first().json || {};
const evs = s.resultat && Array.isArray(s.resultat.evenements_alerte) ? s.resultat.evenements_alerte : [];
if (s.contrat === 'lib-cout-ia@1' && s.statut === 'ok' && evs.length) {
  const c = orig.config, k = orig.donnees.cout || {};
  return [{ json: { a_alerter: true, alerte_enveloppe: { contrat: 'lib-alerte-liste@1', organisation_id: orig.organisation_id, simulation: orig.simulation, cle_idempotence: ('cout-alerte:' + orig.cle_idempotence).slice(0, 80),
    trace: { execution_parent: ('presti-dep-direction:' + orig.cle_idempotence).slice(0, 80), declencheur: 'presti-dep-direction', tentative: 0 },
    config: { interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, seuil_impaye_centimes: 0, plafond_alertes_jour: Number.isInteger(c.plafond_alertes_jour) ? c.plafond_alertes_jour : 5 },
    donnees: { evenements: evs, cles_deja_alertees: k.cles_deja_alertees || [], alertes_envoyees_aujourdhui: 0, maintenant: orig.donnees.maintenant } } } }];
}
return [{ json: { a_alerter: false, alerte_enveloppe: null } }];`

export const CODE_ENVELOPPER = String.raw`// presti-dep-direction · Envelopper l'alerte de coût (036-007) : l'enveloppe de lib-alerte-liste@1 devient l'entrée de l'appel, telle quelle.
return [{ json: $input.first().json.alerte_enveloppe }];`

export const CODE_HABILLER_ALERTE = String.raw`// presti-dep-direction · Habiller l'alerte (036-007) : la sortie de lib-alerte-liste devient la sortie du chef. L'enveloppe d'origine garde la clé et la simulation.
const orig = $('Aiguiller').first().json.enveloppe;
const s = $input.first().json || {};
const ok = typeof s.contrat === 'string';
return [{ json: { enveloppe: { contrat: 'presti-dep-direction@1', simulation: orig.simulation, cle_idempotence: orig.cle_idempotence },
  statut: ok ? s.statut : 'erreur', resultat: ok && s.resultat ? { genre: 'alerte', alerte: s.resultat } : null,
  effets_prevus: ok && Array.isArray(s.effets_prevus) ? s.effets_prevus : [], journal: ok && Array.isArray(s.journal) ? s.journal : [],
  erreurs: ok && Array.isArray(s.erreurs) && s.erreurs.length ? s.erreurs : ok ? [] : ['l’enfant lib-alerte-liste n’a pas répondu'] } }];`

export const CODE_HABILLER_COUT = String.raw`// presti-dep-direction · Habiller le coût (036-007) : la sortie de lib-cout-ia, plus celle de lib-alerte-liste quand une alerte a été évaluée.
const orig = $('Aiguiller').first().json.enveloppe;
const co = $('Appeler lib-cout-ia').first().json || {};
const s = $input.first().json || {};
const al = s.contrat === 'lib-alerte-liste@1' ? s : null;
const ok = typeof co.contrat === 'string';
const liste = (x) => (Array.isArray(x) ? x : []);
return [{ json: { enveloppe: { contrat: 'presti-dep-direction@1', simulation: orig.simulation, cle_idempotence: orig.cle_idempotence },
  statut: ok ? co.statut : 'erreur', resultat: ok && co.resultat ? { genre: 'cout', cout: co.resultat, alerte: al ? al.resultat : null } : null,
  effets_prevus: ok ? liste(co.effets_prevus).concat(al ? liste(al.effets_prevus) : []) : [], journal: ok ? liste(co.journal).concat(al ? liste(al.journal) : []).slice(0, 200) : [],
  erreurs: ok ? liste(co.erreurs) : ['l’enfant lib-cout-ia n’a pas répondu'] } }];`

export const CODE_ALERTE = TETE('lib-alerte-liste') + String.raw`// lib-alerte-liste (036-007 ; A8, p6:110, reel du 25/09) : l'agent Alerte à LISTE FERMÉE. Sept types seulement peuvent réveiller quelqu'un, chacun avec son responsable ;
// tout autre type est IGNORÉ et compté, jamais transmis. L'artisan n'est réveillé que par ce dont il est le responsable, jamais dans les heures calmes (21 h-7 h, Paris)
// sauf un message urgent reçu tard, dans la limite du plafond du jour ; le reste est reporté à la page du matin. Une alerte déjà envoyée (clé) ne repart pas.
// Le texte d'une alerte est fixe : aucun nom, aucune phrase de client. Envoi prévu par push (lib/push.ts:105, envoyerPushArtisan), JAMAIS fait ; Benj par lib-alerter@1.
const LISTE = {
  demande_de_prix_ferme: { responsable: 'artisan', titre: 'Un client demande un prix ferme', lien: '/messages' },
  client_mecontent: { responsable: 'artisan', titre: 'Un client est mécontent', lien: '/messages' },
  litige: { responsable: 'artisan', titre: 'Un litige est ouvert', lien: '/messages' },
  message_urgent_tard: { responsable: 'artisan', titre: 'Un message urgent est arrivé tard', lien: '/messages' },
  impaye_au_dessus_du_seuil: { responsable: 'artisan', titre: 'Un impayé dépasse votre seuil', lien: '/factures' },
  workflow_en_panne: { responsable: 'benj', categorie: 'workflow_en_panne' },
  cout_qui_derive: { responsable: 'benj', categorie: 'cout_qui_derive' },
};
function verifie(ev, c) {
  const f = ev.faits;
  switch (ev.type) {
    case 'demande_de_prix_ferme': return f.prix_ferme === true;
    case 'client_mecontent': return f.mecontent === true;
    case 'litige': return f.litige === true;
    case 'message_urgent_tard': { const h = parisHeure(ev.survenu_le); return f.urgent === true && (h >= 20 || h < 8); }
    case 'impaye_au_dessus_du_seuil': return c.seuil_impaye_centimes > 0 && Number.isInteger(f.montant_centimes) && f.montant_centimes >= c.seuil_impaye_centimes;
    case 'workflow_en_panne': return typeof f.workflow === 'string';
    case 'cout_qui_derive': return Number.isInteger(f.total_centimes);
    default: return false;
  }
}
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    if (d.evenements.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'alerte_refusee', 'autre_compte : un événement lu n’est pas celui de ce compte');
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'interrupteur_coupe', alertes: [], reportees_au_matin: [] }, effets_prevus: [], journal: [ligne('alerte_saute', null, 'interrupteur coupé : personne n’est réveillé')] };
    const calmes = (() => { const h = parisHeure(d.maintenant); return h >= 21 || h < 7; })();
    const ignorees = { hors_liste: 0, hors_condition: 0, deja_alertee: 0 };
    const horsListe = [], alertes = [], reportees = [], effets = [], journal = [], vus = new Set(), connues = new Set(d.cles_deja_alertees);
    let prevus = d.alertes_envoyees_aujourdhui;
    const evs = d.evenements.slice().sort((a, b) => (a.survenu_le < b.survenu_le ? -1 : a.survenu_le > b.survenu_le ? 1 : (a.cle < b.cle ? -1 : 1)));
    for (const ev of evs) {
      if (!Object.prototype.hasOwnProperty.call(LISTE, ev.type)) { ignorees.hors_liste++; if (horsListe.length < 10 && !horsListe.includes(ev.type)) horsListe.push(ev.type); continue; }
      const regle = LISTE[ev.type];
      if (!verifie(ev, c)) { ignorees.hors_condition++; continue; }
      const cle = (ev.type + ':' + ev.cle).slice(0, 80);
      if (connues.has(cle) || vus.has(cle)) { ignorees.deja_alertee++; continue; }
      vus.add(cle);
      if (regle.responsable === 'artisan') {
        if (calmes && ev.type !== 'message_urgent_tard') { reportees.push({ type: ev.type, cle: cle, motif: 'heures_calmes' }); continue; }
        if (prevus >= c.plafond_alertes_jour) { reportees.push({ type: ev.type, cle: cle, motif: 'plafond_du_jour' }); continue; }
        prevus++;
        const corps = ev.type === 'impaye_au_dessus_du_seuil' ? 'Un impayé dépasse ' + eurC(c.seuil_impaye_centimes) + '. Ouvrez la page du jour.' : 'Ouvrez la page du jour : une carte vous attend.';
        alertes.push({ type: ev.type, cle: cle, responsable: 'artisan', canal: 'push', texte: regle.titre, lien: regle.lien });
        effets.push({ effet: 'envoyer_push', organisation_id: org, cle: 'al:' + cle, via: 'lib/push.ts:105 envoyerPushArtisan', charge: { titre: regle.titre, corps: corps, lien: regle.lien } });
      } else {
        alertes.push({ type: ev.type, cle: cle, responsable: 'benj', canal: 'lib-alerter', texte: ev.type, lien: null });
        effets.push({ effet: 'alerter', contrat: 'lib-alerter@1', donnees: { categorie: regle.categorie, workflow: ev.faits.workflow || (ev.type === 'cout_qui_derive' ? 'lib-cout-ia' : 'presti-dep-direction'), lien_execution: null, destinataire_role: 'benj', survenue_le: ev.survenu_le } });
      }
      effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'alerte_prevue', cle: 'al:' + cle, faits: { type: ev.type, responsable: regle.responsable } });
      journal.push(ligne('alerte', cle, ev.type + ' → ' + regle.responsable));
    }
    journal.unshift(ligne('alerte_bilan', null, alertes.length + ' alerte(s), ' + reportees.length + ' reportée(s) à la page du matin, ' + ignorees.hors_liste + ' hors de la liste fermée'));
    return { ...j, statut: alertes.length ? 'ok' : 'rien_a_faire', resultat: { liste_fermee: Object.keys(LISTE), alertes: alertes, reportees_au_matin: reportees, ignorees: ignorees, types_hors_liste: horsListe, heures_calmes: calmes }, effets_prevus: effets, journal: journal.slice(0, 200) };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['alerte : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_COUT = TETE('lib-cout-ia') + String.raw`// lib-cout-ia (036-007 ; D3, A14, p6:116) : ce que coûte l'IA, PAR COMPTE ET PAR JOUR (jour de Paris), visible et plafonné. Il additionne ce que journalise lib-journaliser
// (couts_ia_appels, une ligne par appel, clé unique ; couts_ia_jour, le cumul — migration 0193, écrite et non appliquée). Le coût est calculé par le CODE : jetons × tarif daté,
// en millièmes de centime, déjà posé par le journal ; un appel SANS tarif daté est compté mais son coût reste inconnu (jamais un zéro ni un coût inventé). Le modèle n'en compte rien.
// La part envoyée à un modèle EXTERNE est comptée à part. Plafond du jour atteint ou dérive : un événement de la liste fermée (cout_qui_derive) est préparé pour lib-alerte-liste.
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    if (d.appels.some((x) => x.artisan_id !== org) || d.cumul_du_jour.some((x) => x.artisan_id !== org) || d.jours_precedents.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'cout_refuse', 'autre_compte : une ligne lue n’est pas celle de ce compte');
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'interrupteur_coupe', jour: d.jour }, effets_prevus: [], journal: [ligne('cout_saute', null, 'interrupteur coupé : rien n’est compté')] };
    const connues = new Set(d.cles_connues), vus = new Set();
    const groupes = new Map();
    const ajouter = (dep, modele, externe, appels, mc) => { const k = dep + '|' + modele + '|' + (externe ? 1 : 0); const g = groupes.get(k) || { departement: dep, modele: modele, externe: externe, appels: 0, mc: 0 }; g.appels += appels; g.mc += mc; groupes.set(k, g); };
    for (const r of d.cumul_du_jour) if (r.jour === d.jour) ajouter(r.departement, r.modele, r.externe, r.appels, r.cout_millicentimes);
    const effets = [];
    let doublons = 0, sansTarif = 0, nouveaux = 0;
    for (const a of d.appels.slice().sort((x, y) => (x.cle < y.cle ? -1 : 1))) {
      if (connues.has(a.cle) || vus.has(a.cle)) { doublons++; continue; }
      vus.add(a.cle);
      const tarife = a.cout_eur !== null && a.source_tarif !== null && /\d{4}-\d{2}-\d{2}/.test(a.source_tarif);
      const mc = tarife ? Math.round(a.cout_eur * 100000) : 0;
      if (!tarife) sansTarif++;
      ajouter(a.departement, a.modele, a.externe, 1, mc);
      nouveaux++;
      effets.push({ effet: 'ecrire_appel_cout', organisation_id: org, table: 'couts_ia_appels', requete: 'POST /rest/v1/couts_ia_appels?on_conflict=artisan_id,cle', entetes: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        corps: { artisan_id: org, cle: a.cle, departement: a.departement, modele: a.modele, externe: a.externe, jetons_entree: a.jetons_entree, jetons_sortie: a.jetons_sortie, cout_millicentimes: mc, survenu_le: a.survenu_le }, cout_connu: tarife });
    }
    let total_centimes = 0, externe_centimes = 0, appels = 0, appels_externes = 0;
    const par_departement = {}, par_modele = {};
    for (const g of groupes.values()) {
      const cts = Math.floor((g.mc + 999) / 1000);
      total_centimes += cts; appels += g.appels;
      if (g.externe) externe_centimes += cts;
      if (g.externe) appels_externes += g.appels;
      par_departement[g.departement] = (par_departement[g.departement] || 0) + cts;
      par_modele[g.modele] = (par_modele[g.modele] || 0) + cts;
    }
    const local_centimes = total_centimes - externe_centimes;
    const plafond_atteint = total_centimes >= c.plafond_jour_centimes;
    const reste_centimes = Math.max(0, c.plafond_jour_centimes - total_centimes);
    const parJour = new Map();
    for (const r of d.jours_precedents) if (r.jour !== d.jour) parJour.set(r.jour, (parJour.get(r.jour) || 0) + r.cout_millicentimes);
    const derniers = [...parJour.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    const base_insuffisante = derniers.length < c.jours_base_min;
    const base_centimes = base_insuffisante ? null : Math.round(derniers.reduce((s, x) => s + x[1], 0) / derniers.length / 1000);
    let derive = null;
    if (!base_insuffisante && total_centimes >= c.plancher_derive_centimes && total_centimes * 100 > base_centimes * (100 + c.seuil_derive_pct)) {
      derive = { total_centimes: total_centimes, base_centimes: base_centimes, pourcent: base_centimes > 0 ? Math.round((total_centimes / base_centimes - 1) * 100) : null, jours_de_base: derniers.length };
    }
    const evenements_alerte = [];
    const t = d.maintenant;
    if (derive) evenements_alerte.push({ artisan_id: org, type: 'cout_qui_derive', cle: 'derive:' + d.jour, survenu_le: t, faits: { total_centimes: total_centimes, base_centimes: base_centimes, workflow: 'lib-cout-ia' } });
    if (plafond_atteint) evenements_alerte.push({ artisan_id: org, type: 'cout_qui_derive', cle: 'plafond:' + d.jour, survenu_le: t, faits: { total_centimes: total_centimes, workflow: 'lib-cout-ia' } });
    if (plafond_atteint) effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'plafond_cout_atteint', cle: 'pc:' + d.jour, faits: { total_centimes: total_centimes, plafond_centimes: c.plafond_jour_centimes } });
    const source = 'couts_ia_jour et couts_ia_appels, jour de Paris ' + d.jour;
    const lignes = ['Coût IA du ' + d.jour + ' : ' + eurC(total_centimes) + ' pour ' + appels + ' appel' + (appels > 1 ? 's' : '') + ', dont ' + eurC(externe_centimes) + ' vers un modèle externe (' + appels_externes + ' appel' + (appels_externes > 1 ? 's' : '') + ')',
      'Plafond du jour : ' + eurC(c.plafond_jour_centimes) + (plafond_atteint ? ' — atteint : les actions qui appellent un modèle s’arrêtent jusqu’à demain' : ' — il reste ' + eurC(reste_centimes))];
    if (sansTarif) lignes.push(sansTarif + ' appel' + (sansTarif > 1 ? 's' : '') + ' sans tarif daté : compté' + (sansTarif > 1 ? 's' : '') + ', coût inconnu (jamais inventé)');
    return { ...j, statut: 'ok', resultat: { jour: d.jour, source: source, total_centimes: total_centimes, externe_centimes: externe_centimes, local_centimes: local_centimes, part_externe_pct: total_centimes > 0 ? Math.round(externe_centimes * 100 / total_centimes) : null,
      appels: appels, appels_externes: appels_externes, appels_nouveaux: nouveaux, appels_sans_tarif: sansTarif, doublons_ignores: doublons, par_departement: par_departement, par_modele: par_modele,
      plafond_jour_centimes: c.plafond_jour_centimes, plafond_atteint: plafond_atteint, reste_centimes: reste_centimes, base_centimes: base_centimes, base_insuffisante: base_insuffisante, derive: derive, evenements_alerte: evenements_alerte, lignes: lignes },
      effets_prevus: effets, journal: [ligne('cout_ia', 'cout:' + d.jour, eurC(total_centimes) + ', ' + nouveaux + ' appel(s) nouveau(x), plafond ' + (plafond_atteint ? 'atteint' : 'non atteint') + (derive ? ', dérive' : ''))] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['coût : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODES = { 'lib-alerte-liste': CODE_ALERTE, 'lib-cout-ia': CODE_COUT }
export const NOMS_LOGIQUE = { 'lib-alerte-liste': 'Évaluer la liste fermée', 'lib-cout-ia': 'Compter le coût du jour' }
export const NOEUDS_CHEF = { 'Aiguiller': CODE_AIGUILLER, 'Page du matin': CODE_PAGE, 'Rapport du lundi': CODE_LUNDI, 'Diagnostic': CODE_DIAGNOSTIC, 'Rien à faire': CODE_RIEN,
  "Préparer l'alerte": CODE_PREPARER_ALERTE, "Habiller l'alerte": CODE_HABILLER_ALERTE, 'Préparer le coût': CODE_PREPARER_COUT, 'Évaluer la dérive': CODE_EVALUER_DERIVE,
  "Envelopper l'alerte de coût": CODE_ENVELOPPER, 'Habiller le coût': CODE_HABILLER_COUT }

// ─── Les fixtures (fictives : « Exemple. » devant tout nom, aucune adresse) — la source des essais, du banc et du juge ─────────────────────
const U = (n) => `00000000-0000-4000-8000-000000000${n}`
export const ORG = U(801)
export const ORG2 = U(802)
export const MATIN = '2026-11-03T06:30:00.000Z' // 7 h 30 à Paris
export const LUNDI = '2026-11-02T07:00:00.000Z' // lundi, 8 h à Paris
export const enveloppe = (contrat, donnees, config, org = ORG, cle = 'exemple:essai:direction') => ({ contrat, organisation_id: org, simulation: true, cle_idempotence: cle,
  trace: { execution_parent: 'Exemple. essai : direction', declencheur: 'essai', tentative: 0 }, config, donnees })
export const CONFIG_OUVERTE = { offre: 'signature', interrupteur_general: true, interrupteur_departement: true, seuil_impaye_centimes: 100000, plafond_alertes_jour: 5, plafond_cout_jour_centimes: 100, seuil_derive_pct: 50, jours_base_min: 3, plancher_derive_centimes: 50 }
const LUE = (le = '2026-11-03') => ({ lue: true, le })
export const matinFictif = (over = {}) => ({
  sources: { impayes: LUE(), devis: LUE(), demandes: LUE(), cartes: LUE() },
  impayes: [{ artisan_id: ORG, id: U(811), numero: 'Exemple. F-001', total_ttc: 1840.5, date_echeance: '2026-10-20' }, { artisan_id: ORG, id: U(812), numero: 'Exemple. F-002', total_ttc: 620, date_echeance: '2026-09-30' },
    { artisan_id: ORG, id: U(813), numero: 'Exemple. F-003', total_ttc: 90, date_echeance: '2026-11-10' }],
  devis: [{ artisan_id: ORG, id: U(821), numero: 'Exemple. D-101', total_ttc: 5200, envoye_le: '2026-10-20T09:00:00.000Z' }, { artisan_id: ORG, id: U(822), numero: 'Exemple. D-102', total_ttc: 1300, envoye_le: '2026-10-30T09:00:00.000Z' },
    { artisan_id: ORG, id: U(823), numero: 'Exemple. D-103', total_ttc: 2750, envoye_le: '2026-10-24T09:00:00.000Z' }],
  demandes: [{ artisan_id: ORG, id: U(831), urgent: true }, { artisan_id: ORG, id: U(832), urgent: false }, { artisan_id: ORG, id: U(833), urgent: false }],
  stock: [{ artisan_id: ORG, id: U(841), article: 'Exemple. joint', reste: 2 }],
  exclus: ['lead:' + U(832)],
  cartes: [{ artisan_id: ORG, cle: 'relance_impaye:' + U(812), type_action: 'relance_impaye', objet: 'facture:' + U(812), titre: 'Relancer la facture Exemple. F-002', apercu: 'Exemple. Bonjour, un rappel pour la facture F-002.', montant_centimes: 62000, preparee_le: '2026-11-03T05:00:00.000Z' },
    { artisan_id: ORG, cle: 'relance_devis:' + U(821), type_action: 'relance_devis', objet: 'devis:' + U(821), titre: 'Relancer le devis Exemple. D-101', apercu: 'Exemple. Bonjour, avez-vous pu regarder le devis D-101 ?', montant_centimes: 520000, preparee_le: '2026-11-03T05:05:00.000Z' }],
  cles_existantes: [], ...over })
export const matinReduit = (over = {}) => ({ sources: { impayes: LUE(), devis: LUE(), demandes: LUE(), cartes: LUE() },
  impayes: [{ artisan_id: ORG, id: U(811), numero: 'Exemple. F-001', total_ttc: 1840.5, date_echeance: '2026-10-20' }], devis: [{ artisan_id: ORG, id: U(821), numero: 'Exemple. D-101', total_ttc: 5200, envoye_le: '2026-10-20T09:00:00.000Z' }],
  demandes: [{ artisan_id: ORG, id: U(831), urgent: true }], cartes: [], ...over })
export const lundiFictif = (over = {}) => ({ du: '2026-10-26', au: '2026-11-01', lu_le: '2026-11-02',
  kpis: ['actions_preparees', 'relances_preparees', 'fait_seul', 'en_attente', 'echecs'],
  bases_de_depart: { relances_preparees: { valeur: 2, source: 'Exemple. fiche de découverte, dit par le titulaire', date: '2026-10-01', confiance: 'declare' } },
  actions: [['relance_facture', 'fait_seul', '2026-10-27T09:00:00.000+01:00'], ['relance_facture', 'fait_seul', '2026-10-28T09:00:00.000+01:00'], ['reponse_prospect', 'fait_seul', '2026-10-29T10:00:00.000+01:00'],
    ['relance_devis', 'en_attente', '2026-10-29T11:00:00.000+01:00'], ['relance_devis', 'en_attente', '2026-10-30T09:00:00.000+01:00'], ['relance_facture', 'echec', '2026-10-31T10:00:00.000+01:00'],
    ['relance_devis', 'fait_seul', '2026-11-02T09:00:00.000+01:00']].map(([type_action, etat, le]) => ({ type_action, etat, le })),
  devis_signes: [{ artisan_id: ORG, id: U(821), montant_centimes: 480000, signe_le: '2026-10-29T10:00:00.000Z' }, { artisan_id: ORG, id: U(822), montant_centimes: 120000, signe_le: '2026-10-30T15:00:00.000Z' },
    { artisan_id: ORG, id: U(823), montant_centimes: 250000, signe_le: '2026-10-27T09:00:00.000Z' }, { artisan_id: ORG, id: U(824), montant_centimes: 99000, signe_le: '2026-10-20T09:00:00.000Z' }],
  relances: [{ artisan_id: ORG, devis_id: U(821), le: '2026-10-25T08:00:00.000Z' }, { artisan_id: ORG, devis_id: U(822), le: '2026-10-31T08:00:00.000Z' }],
  encaissements: [{ artisan_id: ORG, id: U(851), montant_centimes: 300000, paye_le: '2026-10-28T12:00:00.000Z' }, { artisan_id: ORG, id: U(852), montant_centimes: 150000, paye_le: '2026-11-01T12:00:00.000Z' },
    { artisan_id: ORG, id: U(853), montant_centimes: 90000, paye_le: '2026-10-20T12:00:00.000Z' }],
  impayes_en_cours: { lue: true, nombre: 2, montant_centimes: 246050 }, lues: { encaissements: true, devis_signes: true, relances: true, journal: true }, ...over })
export const diagnosticFictif = (over = {}) => ({ lu_le: '2026-11-03', periode_jours: 30, depuis: '2026-10-04',
  demandes: { recues: 14, sans_reponse: 3, delai_median_min: 42 }, devis: { envoyes: 9, signes: 4, non_signes_nombre: 5, non_signes_centimes: 1830000 }, ...over })
const evA = (type, cle, survenu_le, faits, org = ORG) => ({ artisan_id: org, type, cle, survenu_le, faits })
export const evenementsJour = () => [
  evA('demande_de_prix_ferme', 'e1', '2026-11-03T11:00:00.000Z', { prix_ferme: true }), evA('nouvelle_demande', 'e5', '2026-11-03T11:05:00.000Z', {}),
  evA('impaye_au_dessus_du_seuil', 'e6', '2026-11-03T10:00:00.000Z', { montant_centimes: 184050 }), evA('impaye_au_dessus_du_seuil', 'e7', '2026-11-03T10:10:00.000Z', { montant_centimes: 50000 }),
  evA('workflow_en_panne', 'e8', '2026-11-03T09:00:00.000Z', { workflow: 'presti-boite' }), evA('litige', 'e9', '2026-11-03T08:00:00.000Z', { litige: true }),
  evA('message_urgent_tard', 'e4', '2026-11-03T11:00:00.000Z', { urgent: true })]
export const evenementsNuit = () => [
  evA('client_mecontent', 'n2', '2026-11-03T21:50:00.000Z', { mecontent: true }), evA('message_urgent_tard', 'n3', '2026-11-03T21:15:00.000Z', { urgent: true }),
  evA('impaye_au_dessus_du_seuil', 'n10', '2026-11-03T21:20:00.000Z', { montant_centimes: 184050 })]
export const alerteFictive = (over = {}) => ({ evenements: evenementsJour(), cles_deja_alertees: ['litige:e9'], alertes_envoyees_aujourdhui: 0, ...over })
const JOUR_COUT = '2026-11-03'
const HAIKU = 'claude-haiku-5-5'
export const appel = (cle, over = {}) => ({ artisan_id: ORG, cle, departement: 'accueil', modele: HAIKU, externe: true, jetons_entree: 1200, jetons_sortie: 300, cout_eur: 0.0021, source_tarif: 'Exemple. tarif du modèle, relevé du 2026-11-01', survenu_le: '2026-11-03T08:00:00.000Z', ...over })
export const coutFictif = (over = {}) => ({ jour: JOUR_COUT,
  appels: [appel('exec-1001:n1'), appel('exec-1001:n2', { cout_eur: 0.0034, jetons_entree: 2000 }), appel('exec-1002:n1', { departement: 'direction', modele: 'qwen3-8b', externe: false, cout_eur: 0, source_tarif: 'Exemple. Oracle, aucun coût par appel, relevé du 2026-11-01' }),
    appel('exec-1003:n1', { cout_eur: null, source_tarif: null }), appel('exec-0999:n1')],
  cumul_du_jour: [{ artisan_id: ORG, jour: JOUR_COUT, departement: 'accueil', modele: HAIKU, externe: true, appels: 6, cout_millicentimes: 61000 }],
  jours_precedents: ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'].map((jour) => ({ artisan_id: ORG, jour, cout_millicentimes: 20000 })),
  cles_connues: ['exec-0999:n1'], ...over })
export const coutReduit = () => ({ jour: JOUR_COUT, appels: [appel('exec-2001:n1')], cumul_du_jour: [{ artisan_id: ORG, jour: JOUR_COUT, departement: 'accueil', modele: HAIKU, externe: true, appels: 6, cout_millicentimes: 61000 }], jours_precedents: [], cles_connues: [] })
export const configCout = (over = {}) => ({ interrupteur_general: true, interrupteur_departement: true, plafond_jour_centimes: 100, seuil_derive_pct: 50, jours_base_min: 3, plancher_derive_centimes: 50, ...over })
export const configAlerte = (over = {}) => ({ interrupteur_general: true, interrupteur_departement: true, seuil_impaye_centimes: 100000, plafond_alertes_jour: 5, ...over })
export const direction = (genre, bloc, over = {}) => enveloppe(`${CHEF}@1`, { evenements: [], genre, maintenant: genre === 'lundi' ? LUNDI : MATIN, ...bloc }, CONFIG_OUVERTE, over.org || ORG, over.cle || `exemple:essai:${genre}`)
export const alerteEnfant = (donnees, config = configAlerte(), cle = 'exemple:essai:alerte-liste') => enveloppe('lib-alerte-liste@1', donnees, config, ORG, cle)
export const coutEnfant = (donnees, config = configCout(), cle = 'exemple:essai:cout-ia') => enveloppe('lib-cout-ia@1', { maintenant: '2026-11-03T18:00:00.000Z', ...donnees }, config, ORG, cle)

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(champ.replace(/\W/g, '-'))}, leftValue: expr(${J('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${pos ? `position: ${J(pos)}, ` : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET_ = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${J(pos)}, notes: "Mode A : l'effet réel (push, base, rapport) n'est pas branché. Il le sera au « go » de Benj, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 036-007). Rien n'a été écrit ni envoyé." } } })`
const APPEL_ = (nom, id, notes) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, notes: ${J(notes)}, onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true }
export const reglagesAppele = (idErreur, appelants, t = 120) => ({ ...REGLAGES, executionTimeout: t, errorWorkflow: idErreur, ...(appelants ? { callerPolicy: 'workflowsFromAList', callerIds: appelants } : { callerPolicy: 'none' }) })
const IMPORTS = "import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';"
const FICHES = {
  'lib-alerte-liste': "L'agent Alerte (A8) à LISTE FERMÉE : sept types seulement peuvent réveiller quelqu'un, chacun avec son responsable (artisan ou Benj). Tout autre type est ignoré et compté. Heures calmes, plafond du jour, clé d'idempotence ; texte fixe sans donnée de client. Envoi prévu par push (lib/push.ts:105), jamais fait.",
  'lib-cout-ia': "Le compteur de coût IA (D3, A14) : par compte et par jour (jour de Paris), calculé par le code (jetons × tarif daté), plafond du jour, dérive, part envoyée à un modèle externe comptée à part ; un appel sans tarif daté est compté, son coût reste inconnu. Aucun modèle.",
}
const NOTE_ENFANT = (nom) => `const note = sticky(${J(`## ${nom} (036-007)\n${FICHES[nom]}\nContrat ${nom}@1 (enveloppe@1, gabarit « Contrat » de 035-003). Appelé par ${CHEF} et par ${BANC}.\nINACTIF, jamais publié, en simulation (mode A) : les lectures sont passées par l'appelant, les écritures partent dans effets_prevus. Aucun identifiant.\nJuge : scripts/direction-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });`
export function sdkEnfant(nom, reglages = reglagesAppele(ERREUR, null)) {
  const contrat = `${nom}@1`
  return [IMPORTS,
    `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par ${CHEF}', position: [0, 0], parameters: { inputSource: 'passthrough' } } });`,
    `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[nom]), `contrat: ${contrat}`, [240, 0])};`,
    `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
    `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [1480, 0])};`,
    `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`,
    `const logique = ${CODE_(NOMS_LOGIQUE[nom], CODES[nom], null, [480, 0])};`, NOTE_ENFANT(nom),
    `const arret = ${ARRET_([1240, 120])};`,
    `export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(reglages)} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))\n  .add(note);`].join('\n') + '\n'
}
export function sdkChef(ids, reglages = reglagesAppele(ERREUR, CERVEAU, 180)) {
  const contrat = `${CHEF}@1`
  const N = (cle, pos) => CODE_(cle, NOEUDS_CHEF[cle], null, pos)
  const l = [IMPORTS,
    `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par le Cerveau', position: [0, 0], parameters: { inputSource: 'passthrough' } } });`,
    `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[CHEF]), `contrat: ${contrat}`, [240, 0])};`,
    `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
    `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [2600, 0])};`,
    `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`,
    `const arret = ${ARRET_([2400, 160])};`,
    `const aiguiller = ${N('Aiguiller', [480, 0])};`,
    `const siMatin = ${IF_('Page du matin ?', '$json.est_matin')};`, `const siLundi = ${IF_('Rapport du lundi ?', '$json.est_lundi')};`, `const siDiag = ${IF_('Diagnostic ?', '$json.est_diagnostic')};`,
    `const siAlerte = ${IF_('Alerte ?', '$json.est_alerte')};`, `const siCout = ${IF_('Coût IA ?', '$json.est_cout', 'Faux : la route « stop » (interrupteur coupé, genre absent ou inconnu, plafond de coût absent).')};`,
    `const page = ${N('Page du matin', [1000, -300])};`, `const lundi = ${N('Rapport du lundi', [1240, -150])};`, `const diag = ${N('Diagnostic', [1480, 0])};`, `const rien = ${N('Rien à faire', [1720, 400])};`,
    `const prepAlerte = ${N("Préparer l'alerte", [1700, 150])};`,
    `const appelAlerte = ${APPEL_('Appeler lib-alerte-liste', ids['lib-alerte-liste'], "L'agent Alerte, liste fermée (036-007). Un échec ne fait pas échouer le passage.")};`,
    `const habAlerte = ${N("Habiller l'alerte", [2160, 150])};`,
    `const prepCout = ${N('Préparer le coût', [1700, 300])};`,
    `const appelCout = ${APPEL_('Appeler lib-cout-ia', ids['lib-cout-ia'], 'Le compteur de coût IA (036-007). Un échec ne fait pas échouer le passage.')};`,
    `const evalDerive = ${N('Évaluer la dérive', [1940, 300])};`, `const siDerive = ${IF_('Une alerte de coût à évaluer ?', '$json.a_alerter')};`,
    `const envCout = ${N("Envelopper l'alerte de coût", [2160, 300])};`,
    `const appelAlerteCout = ${APPEL_('Appeler lib-alerte-liste (coût)', ids['lib-alerte-liste'], 'Le coût qui dérive passe par la même liste fermée (036-007).')};`,
    `const habCout = ${N('Habiller le coût', [2400, 300])};`,
    `const note = sticky(${J("## presti-dep-direction (036-007)\nLe département Direction : page du matin (l'argent d'abord, elle se termine par des cartes), rapport du lundi (chaque chiffre sourcé et daté, aucun gain), diagnostic « où perdez-vous de l'argent ? » (jamais estimé), et l'aiguillage de l'alerte (liste fermée) et du coût IA. Le code compte, le modèle ne compte rien.\nINACTIF, jamais publié, en simulation (mode A) : les lectures sont passées par l'appelant, les écritures partent dans effets_prevus. Aucun identifiant, aucun modèle.\nDéclencheurs voulus (Cerveau) : 7 h 30 chaque jour, lundi 8 h, événement d'interruption.\nJuge : scripts/direction-n8n-qa.mjs")}, [appele], { color: 4 });`,
    `export default workflow(${J(CHEF)}, ${J(CHEF)}, { settings: ${J(reglages)} })
  .add(appele).to(entree).to(conforme.onTrue(aiguiller.to(siMatin.onTrue(page.to(porte)).onFalse(siLundi.onTrue(lundi.to(porte)).onFalse(siDiag.onTrue(diag.to(porte)).onFalse(siAlerte.onTrue(prepAlerte.to(appelAlerte).to(habAlerte).to(porte)).onFalse(siCout.onTrue(prepCout.to(appelCout).to(evalDerive).to(siDerive.onTrue(envCout.to(appelAlerteCout).to(habCout)).onFalse(habCout))).onFalse(rien.to(porte)))))))).onFalse(sortie))
  .add(habCout).to(porte.onTrue(sortie).onFalse(arret))
  .add(note);`]
  return l.join('\n') + '\n'
}

// ─── Le banc presti-banc-direction : dix cas fictifs, seul appelant des enfants avec le chef ───────────────────────────────────────────────
export const CAS_BANC = [
  [CHEF, 'Cas : page du matin', '// Exemple. Quatre impayés ou devis, trois demandes, deux cartes : l’argent d’abord, trois priorités, fin sur les cartes.', direction('matin', { matin: matinFictif() }, { cle: 'exemple:banc:matin' })],
  [CHEF, 'Cas : page sans lecture', '// Exemple. Les impayés n’ont pas pu être lus : la ligne est « non lue », jamais un zéro.', direction('matin', { matin: matinReduit({ sources: { impayes: { lue: false, le: '2026-11-03' }, devis: LUE(), demandes: LUE(), cartes: LUE() } }) }, { cle: 'exemple:banc:matin-sans-lecture' })],
  [CHEF, 'Cas : rapport du lundi', '// Exemple. Une relance précède une signature, une autre la suit : seule la première est créditée.', direction('lundi', { lundi: lundiFictif() }, { cle: 'exemple:banc:lundi' })],
  [CHEF, 'Cas : diagnostic sans données', '// Exemple. Un compte neuf : « pas encore de données », rien d’estimé.', direction('diagnostic', { diagnostic: diagnosticFictif({ demandes: null, devis: null, depuis: null }) }, { cle: 'exemple:banc:diagnostic-vide' })],
  [CHEF, 'Cas : diagnostic avec données', '// Exemple. Des demandes sans réponse et des devis non signés, lus.', direction('diagnostic', { diagnostic: diagnosticFictif() }, { cle: 'exemple:banc:diagnostic' })],
  ['lib-alerte-liste', 'Cas : alertes du jour', '// Exemple. Sept événements : trois alertes de la liste fermée, un type hors liste, un déjà alerté, deux sans condition remplie.', alerteEnfant({ evenements: evenementsJour(), cles_deja_alertees: ['litige:e9'], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T12:00:00.000Z' }, configAlerte(), 'exemple:banc:alertes-jour')],
  ['lib-cout-ia', 'Cas : coût qui dérive', '// Exemple. Le coût du jour dépasse de 50 % la moyenne des jours précédents : dérive levée, un appel sans tarif daté, un doublon ignoré.', coutEnfant(coutFictif(), configCout(), 'exemple:banc:cout-derive')],
  [CHEF, 'Cas : interrupteur coupé', '// Exemple. Le département est coupé : rien n’est appelé.', { ...direction('matin', {}, { cle: 'exemple:banc:coupe' }), config: { ...CONFIG_OUVERTE, interrupteur_departement: false } }],
  ['lib-cout-ia', 'Cas : plafond atteint', '// Exemple. Le plafond du jour est de 60 centimes : il est atteint.', coutEnfant(coutReduit(), configCout({ plafond_jour_centimes: 60 }), 'exemple:banc:plafond')],
  ['lib-alerte-liste', 'Cas : alertes de nuit', '// Exemple. 23 h 40 à Paris : seul le message urgent tard réveille ; le reste attend la page du matin.', alerteEnfant({ evenements: evenementsNuit(), cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T22:40:00.000Z' }, configAlerte(), 'exemple:banc:alertes-nuit')],
]
export function sdkBanc(ids, idErreur = ERREUR) {
  const l = [IMPORTS.replace(', ifElse', '').replace(', expr', ''),
    "const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });"]
  CAS_BANC.forEach(([cible, nom, commentaire, env], i) => {
    const y = (i - 4) * 160
    l.push(`const cas${i} = ${CODE_(nom, commentaire + '\nconst cas = ' + J(env) + ';\nreturn [cas].map((j) => ({ json: j }));', null, [260, y])};`)
    l.push(`const appel${i} = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J('Appeler ' + cible + ' (' + (i + 1) + ')')}, position: [520, ${y}], onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(ids[cible])} }, mode: 'once', options: { waitForSubWorkflow: true } } } });`)
  })
  l.push(`const bilan = ${CODE_('Bilan du banc', CODE_BILAN, null, [800, 0])};`)
  l.push(`const note = sticky(${J("## presti-banc-direction (036-007)\nBanc d'essai de la Direction : dix cas fictifs (« Exemple. »), le seul appelant permis des enfants avec le chef.\nINACTIF, jamais publié, jamais planifié. Ne lit ni n'écrit rien en base, n'envoie rien.\nJuge : scripts/direction-n8n-qa.mjs")}, [horloge, cas4], { color: 4 });`)
  l.push(`export default workflow(${J(BANC)}, ${J(BANC)}, { settings: ${J({ ...REGLAGES, executionTimeout: 180, errorWorkflow: idErreur, callerPolicy: 'none' })} })`)
  CAS_BANC.forEach((_, i) => l.push(`  .add(horloge).to(cas${i}).to(appel${i}).to(bilan)`))
  l.push('  .add(note);')
  return l.join('\n') + '\n'
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || null
  if (process.argv.includes('--contrats')) {
    const dossier = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats')
    mkdirSync(dossier, { recursive: true })
    for (const [nom, c] of Object.entries(contrats())) writeFileSync(path.join(dossier, nom), JSON.stringify(c, null, 2) + '\n')
    console.log('contrats écrits dans ' + dossier)
  } else {
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/direction'
    mkdirSync(dossier, { recursive: true })
    const ids = JSON.parse(arg('ids') || '{}')
    const erreur = arg('erreur') || ERREUR
    const appelants = JSON.parse(arg('appelants') || '{}')
    for (const nom of ENFANTS) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkEnfant(nom, reglagesAppele(erreur, appelants[nom] || null)))
    writeFileSync(path.join(dossier, `${CHEF}.sdk.js`), sdkChef(ids, reglagesAppele(erreur, appelants[CHEF] || CERVEAU, 180)))
    writeFileSync(path.join(dossier, `${BANC}.sdk.js`), sdkBanc(ids, erreur))
    console.log(`SDK écrits dans ${dossier} : ${[...ENFANTS, CHEF, BANC].join(', ')}`)
  }
}
