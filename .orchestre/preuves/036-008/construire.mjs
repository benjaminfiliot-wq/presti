// 036-008 — fabrique du département Opérations (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-008 du § 4) :
// presti-dep-operations (le chef : créneaux libres LUS dans l'agenda, rendez-vous posé APRÈS un clic, rappel de la veille, gardien du stock, import contrôlé),
// lib-agenda-creneaux (l'agenda lu, épinglé), lib-synchroniser-outil (l'export lu, aperçu, écriture seulement après validation) et le banc presti-banc-operations.
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (« Exemple. » devant tout nom, aucune adresse).
// Mode A (comme 035-003 à 035-005 et 036-001 à 036-007) : tout est INACTIF, en simulation, sans identifiant ; les lectures (agenda, stock, export) sont ÉPINGLÉES
// (passées par l'appelant) et les écritures partent dans `effets_prevus`, jamais faites. Le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003.
// Le code compte, le modèle ne compte rien : ni un créneau, ni un montant, ni une quantité n'est produit par un modèle ; aucun nœud de modèle ici.
//   node .orchestre/preuves/036-008/construire.mjs <dossier> [--erreur=<id>] [--ids=<json>]   → les programmes SDK (collés tels quels dans n8n)
//   node .orchestre/preuves/036-008/construire.mjs --contrats                                   → plans/011-cadrage-01-11/p6-signature/contrats/operations.json
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie, CODE_BILAN } from '../035-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const CERVEAU = '596OC5mL2aMBq6SD' // presti-cerveau (036-001) : seul appelant du chef avec le banc
export const CHEF = 'presti-dep-operations'
export const CHEF_ID = '74bDhTw6cEBzPORZ' // le squelette de 036-001 : rempli en place, son identifiant est conservé pour le Cerveau
export const BANC = 'presti-banc-operations'
export const ENFANTS = ['lib-agenda-creneaux', 'lib-synchroniser-outil']
export const VERSION_CONTRATS = '1.0.0'
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']
export const GENRES = ['creneaux', 'poser', 'rappel', 'stock', 'import']
export const OUTILS_AGENDA = ['google_agenda', 'outlook']
export const OUTILS_EXPORT = ['tableur', 'csv', 'crm_client', 'facturation_client', 'autre']
export const MAX_CRENEAUX = 3 // « au plus trois créneaux libres » (036-008)
export const MAX_PAR_JOUR = 2

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ─────────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const DATE_N = { type: ['string', 'null'], format: 'date-time' }
const JOUR = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const JOUR_N = { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const BOOL = { type: 'boolean' }
const HHMM = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }
const INT = (min, max) => ({ type: 'integer', minimum: min, maximum: max })
const INT_N = (min, max) => ({ type: ['integer', 'null'], minimum: min, maximum: max })
const NUM_N = { type: ['number', 'null'], minimum: 0, maximum: 1e9 }
const TXT = (max) => ({ type: 'string', maxLength: max })
const TXT_N = (max) => ({ type: ['string', 'null'], maxLength: max })
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const tableau = (items, max) => ({ type: 'array', maxItems: max, items })
const CLE80 = { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_:.#-]+$' }

const CRENEAU = objet({ debut: DATE, fin: DATE })
const OCCUPE = objet({ artisan_id: UUID, debut: DATE, fin: DATE }) // un bloc occupé : ni titre, ni invité, ni lieu (aucun texte libre de l'agenda ne passe)
const AGENDA = objet({ artisan_id: UUID, outil: { enum: OUTILS_AGENDA }, lue: BOOL, lu_le: DATE_N,
  couvre: { type: ['object', 'null'], additionalProperties: false, required: ['du', 'au'], properties: { du: JOUR, au: JOUR } }, occupe: tableau(OCCUPE, 500) })
const HORAIRES = objet({ jours_permis: { type: 'array', maxItems: 7, items: INT(1, 7) }, heures_permises: objet({ debut: HHMM, fin: HHMM }) })
const BLOC_CRENEAUX = objet({ fenetre: objet({ du: JOUR, au: JOUR }), agenda: AGENDA, deja_propose: tableau({ type: 'string', maxLength: 80 }, 200), rendez_vous_ref: CLE80 })
const BLOC_POSER = objet({
  carte: objet({ cle: CLE80, proposee_le: DATE, creneaux: tableau(CRENEAU, 3) }),
  validation: { type: ['object', 'null'], additionalProperties: false, required: ['valide_par', 'valide_le', 'creneau'], properties: { valide_par: { enum: ['artisan'] }, valide_le: DATE, creneau: CRENEAU } },
  agenda: AGENDA, cles_existantes: tableau({ type: 'string', maxLength: 80 }, 1000) })
const RDV = objet({ artisan_id: UUID, id: UUID, debut: DATE, canal: { enum: ['sms_lien', 'email', 'aucun'] }, consentement: BOOL, opposition: BOOL })
const BLOC_RAPPEL = objet({ rendez_vous: tableau(RDV, 200), cles_existantes: tableau({ type: 'string', maxLength: 80 }, 1000) })
const SOURCE_LUE = objet({ lue: BOOL, le: JOUR })
const BLOC_STOCK = objet({
  source: SOURCE_LUE,
  articles: tableau(objet({ artisan_id: UUID, id: UUID, nom: TXT(80), quantite: { type: 'number', minimum: 0, maximum: 1e9 }, seuil: { type: 'number', minimum: 0, maximum: 1e9 }, unite: TXT(20),
    fournisseur_id: { type: ['string', 'null'], format: 'uuid' }, qte_reappro: NUM_N }), 200),
  fournisseurs: tableau(objet({ artisan_id: UUID, id: UUID, nom: TXT(80), delai_jours: INT_N(0, 365) }), 100),
  prix: tableau(objet({ artisan_id: UUID, article_id: UUID, fournisseur_id: UUID, prix_ht_centimes: INT(0, 1e9), vu_le: JOUR, source: { enum: ['recherche_ia', 'saisie', 'facture'] } }), 500),
  commandes_ouvertes: tableau({ type: 'string', format: 'uuid' }, 200), cles_existantes: tableau({ type: 'string', maxLength: 80 }, 1000) })
const LIGNE_EXPORT = objet({ ref_externe: CLE80, jour: JOUR, libelle: TXT(80), montant_centimes: INT(0, 1e10), sens: { enum: ['entree', 'sortie'] },
  provenance: { enum: ['lu', 'declare'] }, lu_dans: TXT_N(60), lu_le: JOUR_N, declare_par: { enum: ['artisan'] } }, ['ref_externe', 'jour', 'libelle', 'montant_centimes', 'sens'])
const EXPORT = objet({ artisan_id: UUID, outil: { enum: OUTILS_EXPORT }, lu_le: DATE, pagination: objet({ pages_lues: INT(0, 100), derniere_page_vide: BOOL }), lignes: tableau(LIGNE_EXPORT, 500) })
const APERCU_VALIDE = { type: ['object', 'null'], additionalProperties: false, required: ['cle_apercu', 'empreinte', 'valide_par', 'valide_le'],
  properties: { cle_apercu: CLE80, empreinte: { type: 'string', pattern: '^[0-9a-f]{14}$' }, valide_par: { enum: ['artisan'] }, valide_le: DATE } }
const BLOC_IMPORT = objet({ phase: { enum: ['apercu', 'ecrire'] }, export: EXPORT, apercu_valide: APERCU_VALIDE, cles_connues: tableau({ type: 'string', maxLength: 80 }, 5000) })
const CONFIG_AGENDA = objet({ interrupteur_general: BOOL, interrupteur_departement: BOOL, max_creneaux: INT(1, MAX_CRENEAUX), duree_min: INT(15, 480), marge_min: INT(0, 1440), age_max_agenda_min: INT(1, 1440), horaires: HORAIRES })
const CONFIG_SYNC = objet({ interrupteur_general: BOOL, interrupteur_departement: BOOL, max_lignes: INT(1, 500), max_pages: INT(1, 20), cibles_signees: tableau({ enum: ['mes_chiffres'] }, 3) })
const CONFIG_CHEF = objet({ offre: { enum: OFFRES }, interrupteur_general: BOOL, interrupteur_departement: BOOL, nom_artisan: TXT(70),
  max_creneaux: INT(1, MAX_CRENEAUX), duree_min: INT(15, 480), marge_min: INT(0, 1440), age_max_agenda_min: INT(1, 1440), horaires: HORAIRES,
  pilote: objet({ drapeau: BOOL, actif: BOOL, types: { type: 'object' } }), max_lignes: INT(1, 500), max_pages: INT(1, 20), cibles_signees: tableau({ enum: ['mes_chiffres'] }, 3) }, [])
export const SCHEMAS = {
  [CHEF]: { sans_contact: false, config: CONFIG_CHEF,
    // `evenements` : la forme que le Cerveau (036-001) envoie déjà ; `genre` et les blocs de lecture sont facultatifs (un genre absent se déduit d'un événement connu ;
    // un bloc absent vaut « lecture absente » : rien n'est affirmé).
    donnees: objet({ evenements: tableau({ type: 'object' }, 200), genre: { enum: GENRES }, maintenant: DATE, creneaux: BLOC_CRENEAUX, poser: BLOC_POSER, rappel: BLOC_RAPPEL, stock: BLOC_STOCK, import: BLOC_IMPORT }, ['evenements']) },
  'lib-agenda-creneaux': { sans_contact: true, config: CONFIG_AGENDA,
    donnees: objet({ maintenant: DATE, fenetre: BLOC_CRENEAUX.properties.fenetre, agenda: AGENDA, deja_propose: BLOC_CRENEAUX.properties.deja_propose, rendez_vous_ref: CLE80 }) },
  'lib-synchroniser-outil': { sans_contact: true, config: CONFIG_SYNC,
    donnees: objet({ maintenant: DATE, phase: { enum: ['apercu', 'ecrire'] }, export: EXPORT, apercu_valide: APERCU_VALIDE, cles_connues: tableau({ type: 'string', maxLength: 80 }, 5000) }) },
}
export const EFFETS = {
  [CHEF]: ['preparer_carte', 'poser_rendez_vous', 'deposer_apercu', 'ecrire_ligne', 'noter_evenement', '(effets de lib-agenda-creneaux)', '(effets de lib-synchroniser-outil)'],
  'lib-agenda-creneaux': ['preparer_carte', 'noter_evenement'],
  'lib-synchroniser-outil': ['deposer_apercu', 'ecrire_ligne', 'noter_evenement'],
}
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-008',
    source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-008 du § 4 et décision 5 ; lib/pilote/regles.ts:53-63 ; lib/sms/plage.ts:7-8 ; app/api/inventaire/route.ts:70 ; app/api/demandes/import/route.ts (aperçu puis confirmation)',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute ligne lue porte artisan_id et doit être celle du compte (« Supabase account » passe outre la RLS). Les écritures ne sont jamais faites ici : elles partent dans effets_prevus.' }
  return { 'operations.json': { ...base, titre: 'presti-dep-operations@1 — le département Opérations (agenda lu, rendez-vous après un clic, rappel de la veille, gardien du stock, import contrôlé)',
    chef: { workflow: CHEF, config: SCHEMAS[CHEF].config, donnees: SCHEMAS[CHEF].donnees, effets_prevus: EFFETS[CHEF],
      genres: {
        creneaux: 'au plus trois créneaux libres, LUS dans l’agenda réel (jamais inventés) ; agenda illisible, trop ancien ou d’un autre compte = aucun créneau, et la carte le dit',
        poser: 'le rendez-vous se pose APRÈS le clic de l’artisan, en Studio comme en Signature (décision 5) ; sans clic, rien ; le créneau doit être l’un de ceux proposés et encore libre',
        rappel: 'rappel de la veille : une CARTE (jamais envoyée seule), canal consenti, STOP, plage d’envoi lundi-samedi 8 h-20 h Paris hors fériés (lib/sms/plage.ts:7-8)',
        stock: 'article sous son seuil (inventaire, app/api/inventaire/route.ts:70) : commande fournisseur PRÉPARÉE en carte, fournisseur de SA liste, montant calculé par le code ; jamais envoyée seule',
        import: 'import contrôlé d’un export (B10, C3) : lecture, aperçu, validation de l’artisan, puis écriture par clé ; chaque donnée porte « lu dans <outil> le <date> » ou « déclaré »' },
      declencheurs_voulus: { creneaux: 'événement rendez_vous_a_poser (route déjà connue du Cerveau)', poser: 'clic de l’artisan sur la carte (route à ajouter au Cerveau)', rappel: 'événement veille_de_rendez_vous, la veille à 17 h Paris (route à ajouter)',
        stock: 'événement stock_sous_le_seuil (route à ajouter)', import: 'demande d’import dans « Mes chiffres » (route à ajouter)' },
      type_pilote: 'aucun : « rendez-vous posé », « rappel de rendez-vous » et « commande fournisseur » n’entrent pas dans OUTIL_TYPE (lib/pilote/regles.ts:53-63) ; ils pourront y entrer après les tests de 036-008 et l’accord écrit de Benj' },
    enfants: Object.fromEntries(ENFANTS.map((n) => [`${n}@1`, { config: SCHEMAS[n].config, donnees: SCHEMAS[n].donnees, effets_prevus: EFFETS[n] }])),
    agenda: { regle: 'Un créneau vient de l’agenda lu, ou il n’existe pas. Chaque créneau porte « lu dans <outil> le <date> ». Le bloc occupé ne porte ni titre, ni invité, ni lieu.',
      lecture_voulue: 'nœud Google Calendar calendar.availability pour le client zéro, ou HTTP Request avec le jeton déchiffré à l’exécution pour les artisans (décision 1) — jamais posé ici (connecteurs/agenda.md)' },
    stock: { regle: 'Le seuil est celui de l’inventaire (seuil_alerte > 0 et quantité totale ≤ seuil). Le fournisseur vient de la liste de l’artisan ; la quantité est celle que l’artisan a posée (qte_reappro), sinon « à saisir » ; le montant est prix × quantité, calculé par le code, sinon absent. Jamais un prix deviné.' },
    import: { regle: 'phase « apercu » : lecture, lignes avec provenance, totaux calculés par le code, empreinte ; phase « ecrire » : seulement avec la validation de l’artisan sur CETTE empreinte, sur une cible de la liste signée (mes_chiffres), par clé (ref_externe), sans doublon.',
      colonne_prevue: 'colonne « source » des imports (C3) : migration à écrire par une tâche dont le périmètre contient supabase/** ; non écrite ici' } } }
}

// ─── Les nœuds Code ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUES = { // les lignes que le juge mute : elles doivent exister à l'identique, sinon le juge le dit
  lue: "if (!ag.lue || ag.lu_le === null || ag.couvre === null)",
  age: "if (maintenant - lu > c.age_max_agenda_min * 60000)",
  occupe: "if (!libre(debut, fin, ag.occupe)) continue;",
  isolation_agenda: "if (ag.artisan_id !== org || ag.occupe.some((x) => x.artisan_id !== org))",
  max: "if (creneaux.length >= c.max_creneaux) break jours;",
  par_jour: "if ((parJour[jour] || 0) >= MAX_PAR_JOUR) continue;",
  clic: "if (!v || v.valide_par !== 'artisan')",
  creneau_propose: "if (!c0.creneaux.some((x) => Date.parse(x.debut) === dd && Date.parse(x.fin) === ff))",
  encore_libre: "if (!libre(dd, ff, a.occupe))",
  isolation_poser: "if (a.artisan_id !== org || a.occupe.some((x) => x.artisan_id !== org))",
  consentement: "if (!r.consentement) { sauts.sans_consentement++; continue; }",
  opposition: "if (r.opposition) { sauts.opposition++; continue; }",
  envoi: "const envoi = prochaineOuverture(maintenant);",
  seuil: "if (!(a.seuil > 0 && a.quantite <= a.seuil)) continue;",
  fournisseur: "const f = a.fournisseur_id === null ? null : fourn.get(a.fournisseur_id) || null;",
  montant: "const montant = prix && qte !== null ? Math.round(prix.prix_ht_centimes * qte) : null;",
  commande_ouverte: "if (ouvertes.has(a.id)) { sauts.commande_ouverte++; continue; }",
  isolation_stock: "if (lignes.some((x) => x.artisan_id !== org))",
  provenance: "if (!provenanceValide(l, jourMaintenant)) { rejetees.push({ ref: l.ref_externe, raison: 'sans_provenance' }); continue; }",
  validation_import: "if (!v || v.valide_par !== 'artisan' || v.empreinte !== emp)",
  isolation_export: "if (ex.artisan_id !== org)",
  doublon_export: "if (vus.has(l.ref_externe)) { rejetees.push({ ref: l.ref_externe, raison: 'doublon_dans_export' }); continue; }",
  cible: "if (!c.cibles_signees.includes('mes_chiffres'))",
  interrupteur: "if (!(c.interrupteur_general === true && c.interrupteur_departement === true))",
}
const AIDES = String.raw`const refuse = (j, sim, evenement, raison) => ({ ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: [raison], journal: [{ evenement: evenement, agent: AGENT, objet_ref: null, decision: raison.slice(0, 200), simulation: sim }] });
const PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
const parisParts = (ms) => { const p = {}; for (const x of PARIS.formatToParts(new Date(ms))) p[x.type] = x.value; return { annee: Number(p.year), mois: Number(p.month), jour: Number(p.day), heure: Number(p.hour) % 24, minute: Number(p.minute), sem: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1 }; };
const parisJour = (ms) => { const q = parisParts(ms); return String(q.annee) + '-' + String(q.mois).padStart(2, '0') + '-' + String(q.jour).padStart(2, '0'); };
const parisOffsetMs = (ms) => { const q = parisParts(ms); return Date.UTC(q.annee, q.mois - 1, q.jour, q.heure, q.minute) - Math.floor(ms / 60000) * 60000; };
const instantParis = (jour, min) => { const [a, m, d] = jour.split('-').map(Number); const mur = Date.UTC(a, m - 1, d, 0, min); const ms = mur - parisOffsetMs(mur); return mur - parisOffsetMs(ms); };
const JOURS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const heureFr = (ms) => { const q = parisParts(ms); return q.heure + ' h ' + String(q.minute).padStart(2, '0'); };
const texteInstant = (ms) => { const q = parisParts(ms); return JOURS_FR[q.sem - 1] + ' ' + q.jour + ' ' + MOIS_FR[q.mois - 1] + ' à ' + heureFr(ms); };
const jourFr = (iso) => { const [a, m, d] = iso.split('-').map(Number); return String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + a; };
const plusUnJour = (iso) => new Date(Date.parse(iso + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
`
const AGENDA_AIDES = String.raw`const chevauche = (d1, f1, d2, f2) => d1 < f2 && f1 > d2;
const libre = (debut, fin, occupe) => !occupe.some((o) => chevauche(debut, fin, Date.parse(o.debut), Date.parse(o.fin)));
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
`
const PLAGE_AIDES = String.raw`const paques = (an) => { const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1]; };
const cleMJ = (m, j) => String(m).padStart(2, '0') + '-' + String(j).padStart(2, '0');
const feries = (an) => { const [m, j] = paques(an); const dec = (n) => { const d = new Date(Date.UTC(an, m - 1, j + n)); return cleMJ(d.getUTCMonth() + 1, d.getUTCDate()); }; return new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25', dec(1), dec(39), dec(50)]); };
const plageOk = (ms) => { const q = parisParts(ms); return q.sem !== 7 && !feries(q.annee).has(cleMJ(q.mois, q.jour)) && q.heure >= 8 && q.heure < 20; };
const prochaineOuverture = (ms) => { let jour = parisJour(ms); for (let k = 0; k < 12; k++) { const t = instantParis(jour, 480); if (t >= ms && plageOk(t)) return t; if (plageOk(ms) && k === 0) return ms; jour = plusUnJour(jour); } return null; };
`
const TETE = (agent, ...plus) => "const AGENT = '" + agent + "';\n" + AIDES + plus.join('')

export const CODE_AIGUILLER = String.raw`// presti-dep-operations · Aiguiller (036-008) : ne calcule rien. Il choisit UNE route parmi les cinq genres (creneaux, poser, rappel, stock, import) ;
// interrupteur général ou de département coupé (absent = coupé : fail-closed), genre absent ou inconnu : « stop », rien n'est appelé.
// Un événement connu du Cerveau sans genre explicite en donne un : rendez_vous_a_poser → creneaux, veille_de_rendez_vous → rappel, stock_sous_le_seuil → stock.
const GENRES = ['creneaux', 'poser', 'rappel', 'stock', 'import'];
const PAR_EVENEMENT = { rendez_vous_a_poser: 'creneaux', veille_de_rendez_vous: 'rappel', stock_sous_le_seuil: 'stock' };
return $input.all().map((item) => {
  const j = item.json;
  const e = j.enveloppe, c = e.config, d = e.donnees;
  const deduit = d.evenements.map((x) => (x && typeof x.type === 'string' && Object.prototype.hasOwnProperty.call(PAR_EVENEMENT, x.type) ? PAR_EVENEMENT[x.type] : null)).find((x) => x !== null);
  const genre = typeof d.genre === 'string' ? d.genre : (deduit || null);
  let route = 'stop', raison = null;
  if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) raison = 'interrupteur_coupe';
  else if (!GENRES.includes(genre)) raison = genre === null ? 'genre_absent' : 'genre_inconnu';
  else route = genre;
  return { json: { ...j, route: route, raison: raison, genre: genre, est_creneaux: route === 'creneaux', est_poser: route === 'poser', est_rappel: route === 'rappel', est_stock: route === 'stock', est_import: route === 'import' } };
});`

export const CODE_RIEN = String.raw`// presti-dep-operations · Rien à faire (036-008) : la route « stop ». Aucun effet, une ligne de journal qui dit pourquoi.
return $input.all().map((item) => {
  const j = item.json, e = j.enveloppe;
  return { json: { ...j, statut: 'rien_a_faire', resultat: { etat: j.raison || 'rien', genre: j.genre || null }, effets_prevus: [],
    journal: [{ evenement: 'operations_saute', agent: 'presti-dep-operations', objet_ref: null, decision: ('aucun travail : ' + (j.raison || 'rien')).slice(0, 200), simulation: e.simulation }] } };
});`

export const CODE_PREPARER_CRENEAUX = String.raw`// presti-dep-operations · Préparer les créneaux (036-008) : l'enveloppe de lib-agenda-creneaux@1, rien d'autre. Un bloc absent (lecture absente) donne une enveloppe
// à agenda ILLISIBLE : l'enfant répondra « aucun créneau », jamais un créneau supposé. Les réglages absents prennent des défauts écrits ici (60 min, marge 2 h, agenda lu depuis moins d'une heure).
return $input.all().map((item) => {
  const e = item.json.enveloppe, c = e.config, d = e.donnees;
  const jour = String(d.maintenant || '').slice(0, 10) || '1970-01-01';
  const b = d.creneaux || { fenetre: { du: jour, au: jour }, agenda: { artisan_id: e.organisation_id, outil: 'google_agenda', lue: false, lu_le: null, couvre: null, occupe: [] }, deja_propose: [], rendez_vous_ref: 'sans_lecture' };
  return { json: { contrat: 'lib-agenda-creneaux@1', organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: ('cr:' + e.cle_idempotence).slice(0, 80),
    trace: { execution_parent: ('presti-dep-operations:' + e.cle_idempotence).slice(0, 80), declencheur: 'presti-dep-operations', tentative: 0 },
    config: { interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, max_creneaux: Number.isInteger(c.max_creneaux) ? c.max_creneaux : 3,
      duree_min: Number.isInteger(c.duree_min) ? c.duree_min : 60, marge_min: Number.isInteger(c.marge_min) ? c.marge_min : 120, age_max_agenda_min: Number.isInteger(c.age_max_agenda_min) ? c.age_max_agenda_min : 60,
      horaires: c.horaires || { jours_permis: [1, 2, 3, 4, 5], heures_permises: { debut: '08:00', fin: '18:00' } } },
    donnees: { maintenant: d.maintenant || (jour + 'T00:00:00.000Z'), fenetre: b.fenetre, agenda: b.agenda, deja_propose: b.deja_propose, rendez_vous_ref: b.rendez_vous_ref } } };
});`

export const CODE_HABILLER_CRENEAUX = String.raw`// presti-dep-operations · Habiller les créneaux (036-008) : la sortie de lib-agenda-creneaux devient la sortie du chef. L'enveloppe d'origine garde la clé et la simulation.
const orig = $('Aiguiller').first().json.enveloppe;
const s = $input.first().json || {};
const ok = typeof s.contrat === 'string';
return [{ json: { enveloppe: { contrat: 'presti-dep-operations@1', simulation: orig.simulation, cle_idempotence: orig.cle_idempotence },
  statut: ok ? s.statut : 'erreur', resultat: ok && s.resultat ? { genre: 'creneaux', creneaux: s.resultat } : null,
  effets_prevus: ok && Array.isArray(s.effets_prevus) ? s.effets_prevus : [], journal: ok && Array.isArray(s.journal) ? s.journal : [],
  erreurs: ok && Array.isArray(s.erreurs) && s.erreurs.length ? s.erreurs : ok ? [] : ['l’enfant lib-agenda-creneaux n’a pas répondu'] } }];`

export const CODE_POSER = TETE('presti-dep-operations', AGENDA_AIDES) + String.raw`// presti-dep-operations · Poser le rendez-vous (036-008 ; décision 5 du plan) : le rendez-vous se pose APRÈS LE CLIC de l'artisan, en Studio comme en Signature, pilote actif ou non.
// Sans clic (validation absente, ou pas « artisan »), rien : le rendez-vous reste une carte. Avec un clic : le créneau doit être l'un de ceux qui ont été PROPOSÉS, et il doit
// être encore libre dans l'agenda RELU (illisible, trop ancien ou d'un autre compte : refus). Même alors, l'écriture est seulement PRÉVUE (poser_rendez_vous), jamais faite ici.
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const p = d.poser;
    if (!p || typeof d.maintenant !== 'string') return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'poser' }, effets_prevus: [], journal: [ligne('pose_sautee', null, 'ni la carte ni l’agenda n’ont été lus : rien n’est posé')] };
    const a = p.agenda, maintenant = Date.parse(d.maintenant), v = p.validation;
    if (a.artisan_id !== org || a.occupe.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'pose_refusee', 'autre_compte : l’agenda lu n’est pas celui de ce compte');
    if (!v || v.valide_par !== 'artisan') return { ...j, statut: 'refuse', resultat: { genre: 'poser', etat: 'sans_clic_artisan', pose: false }, effets_prevus: [], erreurs: ['sans_clic_artisan : un rendez-vous ne se pose qu’après le clic de l’artisan'],
      journal: [ligne('pose_refusee', p.carte.cle, 'pas de clic de l’artisan : le rendez-vous reste une carte (' + (c.offre || 'offre inconnue') + ')')] };
    const c0 = p.carte, dd = Date.parse(v.creneau.debut), ff = Date.parse(v.creneau.fin), clic = Date.parse(v.valide_le);
    if (!(clic >= Date.parse(c0.proposee_le) && clic <= maintenant)) return { ...j, statut: 'refuse', resultat: { genre: 'poser', etat: 'clic_incoherent', pose: false }, effets_prevus: [], erreurs: ['clic_incoherent : le clic précède la proposition ou suit le présent'], journal: [ligne('pose_refusee', c0.cle, 'clic incohérent')] };
    if (!c0.creneaux.some((x) => Date.parse(x.debut) === dd && Date.parse(x.fin) === ff)) return { ...j, statut: 'refuse', resultat: { genre: 'poser', etat: 'creneau_inconnu', pose: false }, effets_prevus: [], erreurs: ['creneau_inconnu : ce créneau n’a pas été proposé'], journal: [ligne('pose_refusee', c0.cle, 'créneau jamais proposé')] };
    const cle = ('rdv:' + c0.cle + ':' + v.creneau.debut.slice(0, 16)).slice(0, 80);
    if (p.cles_existantes.includes(cle)) return { ...j, statut: 'rien_a_faire', resultat: { genre: 'poser', etat: 'deja_pose', cle: cle }, effets_prevus: [], journal: [ligne('pose_sautee', cle, 'déjà posé : rien à refaire')] };
    const lu = a.lu_le === null ? NaN : Date.parse(a.lu_le);
    const age = (c.age_max_agenda_min || 60) * 60000;
    if (!a.lue || !(lu <= maintenant) || maintenant - lu > age || a.couvre === null || !(dd >= instantParis(a.couvre.du, 0) && ff <= instantParis(plusUnJour(a.couvre.au), 0))) return { ...j, statut: 'refuse', resultat: { genre: 'poser', etat: 'agenda_illisible', pose: false }, effets_prevus: [], erreurs: ['agenda_illisible : l’agenda relu avant la pose est illisible, trop ancien ou ne couvre pas ce créneau'], journal: [ligne('pose_refusee', c0.cle, 'agenda illisible au moment de poser')] };
    if (!libre(dd, ff, a.occupe)) return { ...j, statut: 'refuse', resultat: { genre: 'poser', etat: 'plus_libre', pose: false }, effets_prevus: [], erreurs: ['plus_libre : le créneau n’est plus libre dans l’agenda'], journal: [ligne('pose_refusee', c0.cle, 'créneau plus libre')] };
    return { ...j, statut: 'ok', resultat: { genre: 'poser', etat: 'pose_prevue', pose: false, creneau: { debut: v.creneau.debut, fin: v.creneau.fin, texte: texteInstant(dd) }, via: 'clic_artisan', source: 'lu dans ' + a.outil + ' le ' + jourFr(a.lu_le.slice(0, 10)) },
      effets_prevus: [
        { effet: 'poser_rendez_vous', organisation_id: org, cle: cle, outil: a.outil, debut: v.creneau.debut, fin: v.creneau.fin, via: 'clic_artisan', valide_le: v.valide_le },
        { effet: 'noter_evenement', organisation_id: org, type: 'rendez_vous_pose_prevu', cle: 'ev:' + cle, faits: { via: 'clic_artisan' } },
      ], journal: [ligne('rendez_vous', cle, 'pose prévue après le clic de l’artisan, créneau proposé et libre')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['pose : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_RAPPEL = TETE('presti-dep-operations', PLAGE_AIDES) + String.raw`// presti-dep-operations · Rappel de la veille (036-008) : pour chaque rendez-vous de DEMAIN (jour de Paris), une CARTE « rappel de rendez-vous » à valider, jamais un envoi.
// Le canal doit être consenti, sans opposition (STOP) ; le texte est fixe (jour, heure, nom de l'artisan, STOP), sans lien ni montant ni nom de client, au nom de l'artisan.
// L'heure d'envoi prévue respecte la plage d'envoi de lib/sms/plage.ts:7-8 (lundi-samedi, 8 h-20 h, Paris, hors fériés) : hors plage, elle est reportée à la prochaine ouverture.
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const r0 = d.rappel;
    if (!r0 || typeof d.maintenant !== 'string') return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'rappel' }, effets_prevus: [], journal: [ligne('rappel_saute', null, 'les rendez-vous n’ont pas été lus : rien n’est affirmé')] };
    if (r0.rendez_vous.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'rappel_refuse', 'autre_compte : un rendez-vous lu n’est pas celui de ce compte');
    const maintenant = Date.parse(d.maintenant), demain = plusUnJour(parisJour(maintenant));
    const nom = typeof c.nom_artisan === 'string' && c.nom_artisan.trim() ? c.nom_artisan.trim() : null;
    const sauts = { pas_demain: 0, sans_consentement: 0, opposition: 0, sans_canal: 0, deja_prepare: 0 };
    const cartes = [], effets = [], journal = [];
    const plageOkMaintenant = plageOk(maintenant);
    for (const r of r0.rendez_vous.slice().sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : (a.id < b.id ? -1 : 1)))) {
      const debut = Date.parse(r.debut);
      if (parisJour(debut) !== demain) { sauts.pas_demain++; continue; }
      if (r.opposition) { sauts.opposition++; continue; }
      if (!r.consentement) { sauts.sans_consentement++; continue; }
      if (r.canal === 'aucun') { sauts.sans_canal++; continue; }
      const cle = 'rv:' + r.id;
      if (r0.cles_existantes.includes(cle)) { sauts.deja_prepare++; continue; }
      const envoi = prochaineOuverture(maintenant);
      const texte = 'Bonjour, ceci est un rappel de votre rendez-vous demain à ' + heureFr(debut) + '. ' + (nom ? nom + '. ' : '') + 'Pour ne plus recevoir ces messages, répondez STOP.';
      const carte = { cle: cle, type_action: 'rappel_rendez_vous', statut: 'a_valider', canal: r.canal, rendez_vous: r.id, texte: texte, envoyer_a: envoi === null ? null : new Date(envoi).toISOString(),
        plage: { ok_maintenant: plageOkMaintenant, regle: 'lundi-samedi 8 h-20 h Paris, hors jours fériés (lib/sms/plage.ts:7-8)', reporte: envoi !== null && envoi !== maintenant } };
      cartes.push(carte);
      effets.push({ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'rappel_rendez_vous', statut: 'a_valider', canal: r.canal, texte: texte, envoyer_a: carte.envoyer_a, montant_centimes: null });
      journal.push(ligne('rappel', cle, 'carte de rappel préparée pour demain à ' + heureFr(debut) + (carte.plage.reporte ? ', envoi reporté à l’ouverture de la plage' : '')));
    }
    if (cartes.length) effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'rappels_prepares', cle: 'ev:rv:' + demain, faits: { cartes: cartes.length } });
    journal.unshift(ligne('rappel_bilan', 'rv:' + demain, cartes.length + ' carte(s), ' + sauts.sans_consentement + ' sans consentement, ' + sauts.opposition + ' opposition(s)'));
    return { ...j, statut: cartes.length ? 'ok' : 'rien_a_faire', resultat: { genre: 'rappel', jour: demain, cartes: cartes, sauts: sauts, envoi: 'jamais seul : une carte à valider (décision 5)' }, effets_prevus: effets, journal: journal.slice(0, 200) };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['rappel : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_STOCK = TETE('presti-dep-operations') + String.raw`// presti-dep-operations · Gardien du stock (036-008) : un article sous son seuil (seuil > 0 et quantité ≤ seuil : app/api/inventaire/route.ts:70) donne une CARTE
// « commande fournisseur » préparée, à valider. C'est de l'argent : jamais envoyée seule, en Studio comme en Signature. Le fournisseur vient de la liste de l'artisan
// (absent : « à choisir »), la quantité est celle que l'artisan a posée (sinon « à saisir »), le montant est prix × quantité, calculé ICI, sinon absent. Jamais un prix deviné.
const JOURS_REVERIFICATION = 30;
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const s = d.stock;
    if (!s || typeof d.maintenant !== 'string') return { ...j, statut: 'rien_a_faire', resultat: { etat: 'lecture_absente', genre: 'stock' }, effets_prevus: [], journal: [ligne('stock_saute', null, 'le stock n’a pas été lu : rien n’est affirmé')] };
    const lignes = [].concat(s.articles, s.fournisseurs, s.prix);
    if (lignes.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'stock_refuse', 'autre_compte : une ligne lue n’est pas celle de ce compte');
    if (!s.source.lue) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'stock_non_lu', genre: 'stock', texte: 'Stock non lu (lecture en erreur) : rien n’est affirmé' }, effets_prevus: [], journal: [ligne('stock_saute', null, 'lecture du stock en erreur')] };
    const jour = parisJour(Date.parse(d.maintenant));
    const fourn = new Map(s.fournisseurs.map((f) => [f.id, f])), ouvertes = new Set(s.commandes_ouvertes);
    const sauts = { au_dessus_du_seuil: 0, commande_ouverte: 0, deja_prepare: 0 };
    const cartes = [], effets = [], journal = [];
    for (const a of s.articles.slice().sort((x, y) => (x.id < y.id ? -1 : 1))) {
      if (!(a.seuil > 0 && a.quantite <= a.seuil)) continue;
      if (ouvertes.has(a.id)) { sauts.commande_ouverte++; continue; }
      const cle = 'cmd:' + a.id + ':' + jour;
      if (s.cles_existantes.includes(cle)) { sauts.deja_prepare++; continue; }
      const f = a.fournisseur_id === null ? null : fourn.get(a.fournisseur_id) || null;
      const qte = typeof a.qte_reappro === 'number' && a.qte_reappro > 0 ? a.qte_reappro : null;
      const prix = f ? s.prix.find((p) => p.article_id === a.id && p.fournisseur_id === f.id) || null : null;
      const montant = prix && qte !== null ? Math.round(prix.prix_ht_centimes * qte) : null;
      const age = prix ? Math.floor((Date.parse(jour + 'T00:00:00Z') - Date.parse(prix.vu_le + 'T00:00:00Z')) / 86400000) : null;
      const manque = [];
      if (!f) manque.push('fournisseur à choisir dans votre liste');
      if (qte === null) manque.push('quantité à saisir');
      if (f && !prix) manque.push('prix inconnu : aucun prix n’est deviné');
      const titre = 'Commander ' + a.nom + (f ? ' chez ' + f.nom : '');
      const carte = { cle: cle, type_action: 'commande_fournisseur', statut: 'a_valider', article: a.id, titre: titre, reste: a.quantite, seuil: a.seuil, unite: a.unite,
        fournisseur: f ? { id: f.id, nom: f.nom, delai_jours: f.delai_jours } : null, quantite: qte,
        prix: prix ? { ht_centimes: prix.prix_ht_centimes, vu_le: prix.vu_le, source: prix.source, a_reverifier: age > JOURS_REVERIFICATION } : null, montant_centimes: montant, a_completer: manque,
        envoi: 'jamais seul : une commande est de l’argent, elle attend le clic de l’artisan' };
      cartes.push(carte);
      effets.push({ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'commande_fournisseur', statut: 'a_valider', titre: titre, fournisseur_id: f ? f.id : null, quantite: qte, montant_centimes: montant, a_completer: manque });
      journal.push(ligne('stock_bas', cle, a.nom + ' : ' + a.quantite + ' pour un seuil de ' + a.seuil + ', commande préparée' + (manque.length ? ' (' + manque.length + ' à compléter)' : '')));
    }
    if (cartes.length) effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'commandes_preparees', cle: 'ev:cmd:' + jour, faits: { cartes: cartes.length } });
    journal.unshift(ligne('stock_bilan', 'cmd:' + jour, cartes.length + ' commande(s) préparée(s), ' + sauts.commande_ouverte + ' déjà ouverte(s)'));
    return { ...j, statut: cartes.length ? 'ok' : 'rien_a_faire', resultat: { genre: 'stock', jour: jour, source: 'stock lu le ' + jourFr(s.source.le), cartes: cartes, sauts: sauts }, effets_prevus: effets, journal: journal.slice(0, 200) };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['stock : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_PREPARER_IMPORT = String.raw`// presti-dep-operations · Préparer l'import (036-008) : l'enveloppe de lib-synchroniser-outil@1, rien d'autre. Un bloc absent donne une enveloppe sans lecture : l'enfant la refuse.
// Les plafonds ont des défauts écrits ici (200 lignes, 5 pages) ; la liste signée des cibles est « mes_chiffres » seulement, et elle est vide si le chef n'en a pas reçu.
return $input.all().map((item) => {
  const e = item.json.enveloppe, c = e.config, d = e.donnees;
  const b = d.import || { phase: 'apercu', export: { artisan_id: e.organisation_id, outil: 'autre', lu_le: d.maintenant || '1970-01-01T00:00:00.000Z', pagination: { pages_lues: 0, derniere_page_vide: true }, lignes: [] }, apercu_valide: null, cles_connues: [] };
  return { json: { contrat: 'lib-synchroniser-outil@1', organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: ('imp:' + e.cle_idempotence).slice(0, 80),
    trace: { execution_parent: ('presti-dep-operations:' + e.cle_idempotence).slice(0, 80), declencheur: 'presti-dep-operations', tentative: 0 },
    config: { interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, max_lignes: Number.isInteger(c.max_lignes) ? c.max_lignes : 200,
      max_pages: Number.isInteger(c.max_pages) ? c.max_pages : 5, cibles_signees: Array.isArray(c.cibles_signees) ? c.cibles_signees : [] },
    donnees: { maintenant: d.maintenant || (b.export.lu_le), phase: b.phase, export: b.export, apercu_valide: b.apercu_valide, cles_connues: b.cles_connues } } };
});`

export const CODE_HABILLER_IMPORT = String.raw`// presti-dep-operations · Habiller l'import (036-008) : la sortie de lib-synchroniser-outil devient la sortie du chef.
const orig = $('Aiguiller').first().json.enveloppe;
const s = $input.first().json || {};
const ok = typeof s.contrat === 'string';
return [{ json: { enveloppe: { contrat: 'presti-dep-operations@1', simulation: orig.simulation, cle_idempotence: orig.cle_idempotence },
  statut: ok ? s.statut : 'erreur', resultat: ok && s.resultat ? { genre: 'import', import: s.resultat } : null,
  effets_prevus: ok && Array.isArray(s.effets_prevus) ? s.effets_prevus : [], journal: ok && Array.isArray(s.journal) ? s.journal : [],
  erreurs: ok && Array.isArray(s.erreurs) && s.erreurs.length ? s.erreurs : ok ? [] : ['l’enfant lib-synchroniser-outil n’a pas répondu'] } }];`

export const CODE_AGENDA = TETE('lib-agenda-creneaux', AGENDA_AIDES) + String.raw`// lib-agenda-creneaux (036-008 ; B-agenda, décision 5) : les créneaux libres sont LUS dans l'agenda réel de l'artisan, jamais inventés. Un créneau vient de l'agenda lu, ou il n'existe pas.
// Au plus trois, au plus deux par jour, dans les horaires de l'artisan, au moins marge_min après maintenant, sans chevaucher un bloc occupé, dans la plage que la lecture couvre.
// Agenda illisible, ancien (age_max_agenda_min) ou d'un autre compte : AUCUN créneau, et la carte le dit. Chaque créneau porte « lu dans <outil> le <date> ».
// Le bloc occupé n'a ni titre, ni invité, ni lieu. Écritures : effets_prevus seulement (une carte « à valider » ; aucun rendez-vous n'est posé ici).
const MAX_PAR_JOUR = 2;
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const ag = d.agenda;
    if (ag.artisan_id !== org || ag.occupe.some((x) => x.artisan_id !== org)) return refuse(j, sim, 'agenda_refuse', 'autre_compte : l’agenda lu n’est pas celui de ce compte');
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'interrupteur_coupe', creneaux: [] }, effets_prevus: [], journal: [ligne('agenda_saute', null, 'interrupteur coupé : aucun créneau n’est cherché')] };
    const maintenant = Date.parse(d.maintenant);
    const cle = ('cr:' + d.rendez_vous_ref + ':' + d.maintenant.slice(0, 10)).slice(0, 80);
    const carteSans = (etat, texte) => ({ ...j, statut: 'ok', resultat: { etat: etat, creneaux: [], texte: texte, source: ag.lue && ag.lu_le ? 'lu dans ' + ag.outil + ' le ' + jourFr(ag.lu_le.slice(0, 10)) : 'agenda non lu' },
      effets_prevus: [{ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'proposer_creneaux', statut: 'a_valider', titre: 'Aucun créneau à proposer', texte: texte, creneaux: [], montant_centimes: null },
        { effet: 'noter_evenement', organisation_id: org, type: etat, cle: 'ev:' + cle, faits: { outil: ag.outil } }], journal: [ligne('creneaux', cle, etat + ' : aucun créneau proposé, la carte le dit')] });
    if (!ag.lue || ag.lu_le === null || ag.couvre === null) return carteSans('agenda_illisible', 'Votre agenda n’a pas pu être lu : aucun créneau n’est proposé. Reconnectez-le dans Connexions.');
    const lu = Date.parse(ag.lu_le);
    if (lu > maintenant) return carteSans('agenda_illisible', 'La lecture de votre agenda est datée du futur : aucun créneau n’est proposé.');
    if (maintenant - lu > c.age_max_agenda_min * 60000) return carteSans('agenda_trop_ancien', 'La lecture de votre agenda est trop ancienne : aucun créneau n’est proposé tant qu’elle n’est pas refaite.');
    if (Date.parse(d.fenetre.au + 'T12:00:00Z') - Date.parse(d.fenetre.du + 'T12:00:00Z') > 14 * 86400000) return refuse(j, sim, 'agenda_refuse', 'fenetre_trop_large : quatorze jours au plus');
    const source = 'lu dans ' + ag.outil + ' le ' + jourFr(ag.lu_le.slice(0, 10));
    const debutJ = c.horaires.heures_permises.debut, finJ = c.horaires.heures_permises.fin;
    const creneaux = [], parJour = {}, dejaP = new Set(d.deja_propose);
    const du = d.fenetre.du > ag.couvre.du ? d.fenetre.du : ag.couvre.du, au = d.fenetre.au < ag.couvre.au ? d.fenetre.au : ag.couvre.au;
    jours: for (let t = Date.parse(du + 'T12:00:00Z'); t <= Date.parse(au + 'T12:00:00Z'); t += 86400000) {
      const jour = new Date(t).toISOString().slice(0, 10);
      if (!c.horaires.jours_permis.includes(parisParts(instantParis(jour, 720)).sem)) continue;
      for (let m = minutes(debutJ); m + c.duree_min <= minutes(finJ); m += c.duree_min) {
        const debut = instantParis(jour, m), fin = instantParis(jour, m + c.duree_min);
        if (debut < maintenant + c.marge_min * 60000) continue;
        if (!libre(debut, fin, ag.occupe)) continue;
        const k = 'cr:' + new Date(debut).toISOString().slice(0, 16);
        if (dejaP.has(k)) continue;
        if ((parJour[jour] || 0) >= MAX_PAR_JOUR) continue;
        creneaux.push({ debut: new Date(debut).toISOString(), fin: new Date(fin).toISOString(), duree_min: c.duree_min, texte: texteInstant(debut), cle: k, source: source });
        parJour[jour] = (parJour[jour] || 0) + 1;
        if (creneaux.length >= c.max_creneaux) break jours;
      }
    }
    if (!creneaux.length) return carteSans('aucun_creneau_libre', 'Aucun créneau libre dans votre agenda sur cette période (' + source + ') : rien n’est proposé.');
    const texte = 'Créneaux libres dans votre agenda (' + source + ') : ' + creneaux.map((x) => x.texte).join(' ; ') + '. Rien n’est posé tant que vous n’avez pas validé.';
    return { ...j, statut: 'ok', resultat: { etat: 'creneaux', creneaux: creneaux, texte: texte, source: source },
      effets_prevus: [{ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'proposer_creneaux', statut: 'a_valider', titre: 'Proposer ' + creneaux.length + ' créneau' + (creneaux.length > 1 ? 'x' : '') + ' au client', texte: texte,
        creneaux: creneaux.map((x) => ({ debut: x.debut, fin: x.fin })), montant_centimes: null },
        { effet: 'noter_evenement', organisation_id: org, type: 'creneaux_proposes', cle: 'ev:' + cle, faits: { nombre: creneaux.length, outil: ag.outil } }],
      journal: [ligne('creneaux', cle, creneaux.length + ' créneau(x) lu(s) dans l’agenda, carte à valider')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['agenda : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_SYNC = TETE('lib-synchroniser-outil') + String.raw`// lib-synchroniser-outil (036-008 ; B10, C3 ; gabarit fiches-depots.md:680) : lit un export ÉPINGLÉ, rend un APERÇU, et n'écrit qu'APRÈS la validation de l'artisan sur cet aperçu.
// Deux phases : « apercu » (lecture, lignes avec provenance, totaux calculés ici, empreinte ; aucun effet d'écriture) puis « ecrire » (l'export est RELU, son empreinte doit être celle que
// l'artisan a validée, la cible doit être dans la liste signée « mes_chiffres » ; l'écriture se fait par clé, sans doublon). Chaque donnée porte « lu dans <outil> le <date> » ou « déclaré par l'artisan » :
// une ligne sans provenance est REJETÉE. Pagination bornée : au-delà du plafond, refus. Écritures : effets_prevus seulement.
const provenanceValide = (l, jourMax) => (l.provenance === 'lu' && typeof l.lu_dans === 'string' && l.lu_dans.trim() !== '' && typeof l.lu_le === 'string' && l.lu_le <= jourMax) || (l.provenance === 'declare' && l.declare_par === 'artisan');
const empreinte = (t) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < t.length; i++) { const ch = t.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0'); };
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: AGENT, objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const ex = d.export;
    if (ex.artisan_id !== org) return refuse(j, sim, 'import_refuse', 'autre_compte : l’export lu n’est pas celui de ce compte');
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { etat: 'interrupteur_coupe', phase: d.phase }, effets_prevus: [], journal: [ligne('import_saute', null, 'interrupteur coupé : rien n’est lu ni écrit')] };
    if (ex.pagination.pages_lues > c.max_pages) return refuse(j, sim, 'import_refuse', 'pagination_non_bornee : ' + ex.pagination.pages_lues + ' pages lues pour un plafond de ' + c.max_pages);
    if (ex.lignes.length > c.max_lignes) return refuse(j, sim, 'import_refuse', 'trop_de_lignes : ' + ex.lignes.length + ' lignes pour un plafond de ' + c.max_lignes);
    const jourMaintenant = d.maintenant.slice(0, 10), connues = new Set(d.cles_connues), vus = new Set();
    const aImporter = [], rejetees = [];
    let dejaImportees = 0;
    for (const l of ex.lignes) {
      if (vus.has(l.ref_externe)) { rejetees.push({ ref: l.ref_externe, raison: 'doublon_dans_export' }); continue; }
      vus.add(l.ref_externe);
      if (!provenanceValide(l, jourMaintenant)) { rejetees.push({ ref: l.ref_externe, raison: 'sans_provenance' }); continue; }
      if (connues.has('imp:' + l.ref_externe)) { dejaImportees++; continue; }
      aImporter.push({ ref_externe: l.ref_externe, jour: l.jour, libelle: l.libelle, montant_centimes: l.montant_centimes, sens: l.sens,
        provenance: l.provenance === 'lu' ? 'lu dans ' + l.lu_dans.trim() + ' le ' + jourFr(l.lu_le) : 'déclaré par l’artisan' });
    }
    const entrees = aImporter.filter((x) => x.sens === 'entree').reduce((s, x) => s + x.montant_centimes, 0), sorties = aImporter.filter((x) => x.sens === 'sortie').reduce((s, x) => s + x.montant_centimes, 0);
    const emp = empreinte(JSON.stringify(aImporter));
    const cleApercu = ('ap:' + emp).slice(0, 80);
    const source = 'lu dans ' + ex.outil + ' le ' + jourFr(ex.lu_le.slice(0, 10));
    const totaux = { lignes: aImporter.length, entrees_centimes: entrees, sorties_centimes: sorties, rejetees: rejetees.length, deja_importees: dejaImportees };
    if (d.phase === 'apercu') {
      return { ...j, statut: 'ok', resultat: { phase: 'apercu', outil: ex.outil, source: source, a_importer: aImporter, rejetees: rejetees, totaux: totaux, empreinte: emp, cle_apercu: cleApercu, ecriture: 'non faite : elle attend la validation de l’artisan sur cet aperçu' },
        effets_prevus: [{ effet: 'deposer_apercu', organisation_id: org, cle: cleApercu, destination: 'mes_chiffres_apercu', lignes: aImporter.length, empreinte: emp }],
        journal: [ligne('import_apercu', cleApercu, aImporter.length + ' ligne(s) à importer, ' + rejetees.length + ' rejetée(s), rien n’est écrit')] };
    }
    const v = d.apercu_valide;
    if (!v || v.valide_par !== 'artisan' || v.empreinte !== emp) return { ...j, statut: 'refuse', resultat: { phase: 'ecrire', etat: v ? 'apercu_different' : 'sans_apercu_valide', ecrit: false }, effets_prevus: [], erreurs: [v ? 'apercu_different : l’export a changé depuis l’aperçu validé' : 'sans_apercu_valide : rien ne s’écrit sans l’aperçu validé par l’artisan'],
      journal: [ligne('import_refuse', cleApercu, v ? 'l’aperçu validé n’est plus celui de l’export' : 'pas d’aperçu validé : rien n’est écrit')] };
    if (!(Date.parse(v.valide_le) <= Date.parse(d.maintenant))) return refuse(j, sim, 'import_refuse', 'validation_du_futur : la validation suit le présent');
    if (!c.cibles_signees.includes('mes_chiffres')) return { ...j, statut: 'refuse', resultat: { phase: 'ecrire', etat: 'cible_non_signee', ecrit: false }, effets_prevus: [], erreurs: ['cible_non_signee : l’écriture n’est permise que vers la liste signée (mes_chiffres)'], journal: [ligne('import_refuse', cleApercu, 'cible non signée')] };
    const effets = aImporter.map((x) => ({ effet: 'ecrire_ligne', organisation_id: org, cle: 'imp:' + x.ref_externe, cible: 'mes_chiffres', via: 'circuit « Mes chiffres » : lecture, aperçu validé, puis écriture',
      requete: 'POST /rest/v1/compta_lignes?on_conflict=artisan_id,cle', entetes: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      corps: { artisan_id: org, cle: 'imp:' + x.ref_externe, jour: x.jour, libelle: x.libelle, montant_centimes: x.montant_centimes, sens: x.sens, source: x.provenance } }));
    effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'import_ecrit_prevu', cle: 'ev:' + cleApercu, faits: { lignes: aImporter.length } });
    return { ...j, statut: aImporter.length ? 'ok' : 'rien_a_faire', resultat: { phase: 'ecrire', outil: ex.outil, source: source, ecrit: false, totaux: totaux, empreinte: emp, cle_apercu: cleApercu }, effets_prevus: effets,
      journal: [ligne('import_ecriture', cleApercu, aImporter.length + ' écriture(s) prévue(s) après la validation de l’artisan, par clé')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['import : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODES = { 'lib-agenda-creneaux': CODE_AGENDA, 'lib-synchroniser-outil': CODE_SYNC }
export const NOMS_LOGIQUE = { 'lib-agenda-creneaux': 'Chercher les créneaux libres', 'lib-synchroniser-outil': "Lire l'export et rendre l'aperçu" }
export const NOEUDS_CHEF = { 'Aiguiller': CODE_AIGUILLER, 'Rien à faire': CODE_RIEN, 'Préparer les créneaux': CODE_PREPARER_CRENEAUX, 'Habiller les créneaux': CODE_HABILLER_CRENEAUX,
  'Poser le rendez-vous': CODE_POSER, 'Rappel de la veille': CODE_RAPPEL, 'Gardien du stock': CODE_STOCK, "Préparer l'import": CODE_PREPARER_IMPORT, "Habiller l'import": CODE_HABILLER_IMPORT }

// ─── Les fixtures (fictives : « Exemple. » devant tout nom, aucune adresse) — la source des essais, du banc et du juge ─────────────────────
const U = (n) => `00000000-0000-4000-8000-000000000${n}`
export const ORG = U(901)
export const ORG2 = U(902)
export const MAINTENANT = '2026-11-03T08:00:00.000Z' // mardi 3 novembre 2026, 9 h à Paris (heure d'hiver : UTC+1)
export const enveloppe = (contrat, donnees, config, org = ORG, cle = 'exemple:essai:operations') => ({ contrat, organisation_id: org, simulation: true, cle_idempotence: cle,
  trace: { execution_parent: 'Exemple. essai : operations', declencheur: 'essai', tentative: 0 }, config, donnees })
export const HORAIRES_FICTIFS = { jours_permis: [1, 2, 3, 4, 5, 6], heures_permises: { debut: '08:00', fin: '18:00' } }
export const CONFIG_OUVERTE = { offre: 'signature', interrupteur_general: true, interrupteur_departement: true, nom_artisan: 'Exemple. Bâti-Démo', max_creneaux: 3, duree_min: 60, marge_min: 120, age_max_agenda_min: 60,
  horaires: HORAIRES_FICTIFS, pilote: { drapeau: true, actif: true, types: { reponse_prospect: true, relance_devis: true } }, max_lignes: 200, max_pages: 5, cibles_signees: ['mes_chiffres'] }
export const configAgenda = (over = {}) => ({ interrupteur_general: true, interrupteur_departement: true, max_creneaux: 3, duree_min: 60, marge_min: 120, age_max_agenda_min: 60, horaires: HORAIRES_FICTIFS, ...over })
export const configSync = (over = {}) => ({ interrupteur_general: true, interrupteur_departement: true, max_lignes: 200, max_pages: 5, cibles_signees: ['mes_chiffres'], ...over })
const occ = (debut, fin, org = ORG) => ({ artisan_id: org, debut, fin })
// Mardi 3/11 : 11 h-12 h 30 et 14 h-15 h (Paris) occupés ; mercredi 4/11 : toute la matinée (8 h-12 h) ; jeudi 5/11 : toute la journée.
export const BLOCS_OCCUPES = [occ('2026-11-03T10:00:00.000Z', '2026-11-03T11:30:00.000Z'), occ('2026-11-03T13:00:00.000Z', '2026-11-03T14:00:00.000Z'), occ('2026-11-04T07:00:00.000Z', '2026-11-04T11:00:00.000Z'), occ('2026-11-05T07:00:00.000Z', '2026-11-05T17:00:00.000Z')]
export const agendaFictif = (over = {}) => ({ artisan_id: ORG, outil: 'google_agenda', lue: true, lu_le: '2026-11-03T07:50:00.000Z', couvre: { du: '2026-11-03', au: '2026-11-09' }, occupe: BLOCS_OCCUPES, ...over })
export const creneauxFictifs = (over = {}) => ({ fenetre: { du: '2026-11-03', au: '2026-11-09' }, agenda: agendaFictif(), deja_propose: [], rendez_vous_ref: 'exemple:rdv:1', ...over })
export const donneesAgenda = (over = {}) => ({ maintenant: MAINTENANT, ...creneauxFictifs(), ...over })
// La carte proposée (créneaux pris dans le résultat attendu : mardi 13 h et 15 h, mercredi 12 h Paris) et le clic de l'artisan.
export const CRENEAUX_PROPOSES = [{ debut: '2026-11-03T12:00:00.000Z', fin: '2026-11-03T13:00:00.000Z' }, { debut: '2026-11-03T14:00:00.000Z', fin: '2026-11-03T15:00:00.000Z' }, { debut: '2026-11-04T11:00:00.000Z', fin: '2026-11-04T12:00:00.000Z' }]
export const poserFictif = (over = {}) => ({ carte: { cle: 'cr:exemple:rdv:1:2026-11-03', proposee_le: '2026-11-03T08:01:00.000Z', creneaux: CRENEAUX_PROPOSES },
  validation: { valide_par: 'artisan', valide_le: '2026-11-03T09:30:00.000Z', creneau: CRENEAUX_PROPOSES[1] }, agenda: agendaFictif({ lu_le: '2026-11-03T09:29:00.000Z' }), cles_existantes: [], ...over })
export const MAINTENANT_POSE = '2026-11-03T09:31:00.000Z'
export const MAINTENANT_VEILLE = '2026-11-03T16:00:00.000Z' // mardi 17 h à Paris
const rdv = (n, over = {}) => ({ artisan_id: ORG, id: U(910 + n), debut: '2026-11-04T13:30:00.000Z', canal: 'sms_lien', consentement: true, opposition: false, ...over })
export const rappelFictif = (over = {}) => ({ rendez_vous: [rdv(1), rdv(2, { debut: '2026-11-04T08:00:00.000Z', canal: 'email' }), rdv(3, { consentement: false }), rdv(4, { opposition: true }), rdv(5, { debut: '2026-11-06T08:00:00.000Z' }), rdv(6, { canal: 'aucun' })], cles_existantes: [], ...over })
export const stockFictif = (over = {}) => ({ source: { lue: true, le: '2026-11-03' },
  articles: [
    { artisan_id: ORG, id: U(921), nom: 'Exemple. joint 40 mm', quantite: 2, seuil: 5, unite: 'pièce', fournisseur_id: U(931), qte_reappro: 20 },
    { artisan_id: ORG, id: U(922), nom: 'Exemple. vis 4x40', quantite: 5, seuil: 5, unite: 'boîte', fournisseur_id: U(931), qte_reappro: null },
    { artisan_id: ORG, id: U(923), nom: 'Exemple. mastic', quantite: 1, seuil: 3, unite: 'tube', fournisseur_id: null, qte_reappro: 6 },
    { artisan_id: ORG, id: U(924), nom: 'Exemple. câble 2,5', quantite: 40, seuil: 10, unite: 'm', fournisseur_id: U(931), qte_reappro: 100 },
    { artisan_id: ORG, id: U(925), nom: 'Exemple. colle', quantite: 0, seuil: 2, unite: 'pot', fournisseur_id: U(931), qte_reappro: 4 },
    { artisan_id: ORG, id: U(926), nom: 'Exemple. sans seuil', quantite: 0, seuil: 0, unite: 'pièce', fournisseur_id: null, qte_reappro: null }],
  fournisseurs: [{ artisan_id: ORG, id: U(931), nom: 'Exemple. Négoce Dupont', delai_jours: 2 }],
  prix: [{ artisan_id: ORG, article_id: U(921), fournisseur_id: U(931), prix_ht_centimes: 185, vu_le: '2026-10-20', source: 'saisie' }, { artisan_id: ORG, article_id: U(922), fournisseur_id: U(931), prix_ht_centimes: 1290, vu_le: '2026-08-01', source: 'recherche_ia' }],
  commandes_ouvertes: [U(925)], cles_existantes: [], ...over })
const ligneExp = (n, over = {}) => ({ ref_externe: 'exemple-' + n, jour: '2026-10-' + String(10 + n).padStart(2, '0'), libelle: 'Exemple. ligne ' + n, montant_centimes: 10000 * n, sens: n % 2 ? 'sortie' : 'entree', provenance: 'lu', lu_dans: 'tableur du client', lu_le: '2026-11-02', ...over })
export const exportFictif = (over = {}) => ({ artisan_id: ORG, outil: 'tableur', lu_le: '2026-11-03T07:00:00.000Z', pagination: { pages_lues: 2, derniere_page_vide: true },
  lignes: [ligneExp(1), ligneExp(2), ligneExp(3, { provenance: 'declare', lu_dans: null, lu_le: null, declare_par: 'artisan' }), ligneExp(4, { provenance: undefined, lu_dans: undefined, lu_le: undefined }), ligneExp(5, { ref_externe: 'exemple-1' }),
    ligneExp(6, { lu_dans: '   ' }), ligneExp(7)], ...over })
export const donneesSync = (over = {}) => ({ maintenant: '2026-11-03T08:00:00.000Z', phase: 'apercu', export: exportFictif(), apercu_valide: null, cles_connues: ['imp:exemple-7'], ...over })
export const operations = (genre, bloc, over = {}) => enveloppe(`${CHEF}@1`, { evenements: [], genre, maintenant: over.maintenant || MAINTENANT, ...bloc }, over.config || CONFIG_OUVERTE, over.org || ORG, over.cle || `exemple:essai:${genre}`)
export const agendaEnfant = (donnees, config = configAgenda(), cle = 'exemple:essai:agenda') => enveloppe('lib-agenda-creneaux@1', donnees, config, ORG, cle)
export const syncEnfant = (donnees, config = configSync(), cle = 'exemple:essai:sync') => enveloppe('lib-synchroniser-outil@1', donnees, config, ORG, cle)

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(champ.replace(/\W/g, '-'))}, leftValue: expr(${J('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${pos ? `position: ${J(pos)}, ` : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET_ = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${J(pos)}, notes: "Mode A : l'effet réel (carte, agenda, base) n'est pas branché. Il le sera au « go » de Benj, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 036-008). Rien n'a été écrit ni envoyé." } } })`
const APPEL_ = (nom, id, notes) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, notes: ${J(notes)}, onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true }
export const reglagesAppele = (idErreur, appelants, t = 120) => ({ ...REGLAGES, executionTimeout: t, errorWorkflow: idErreur, ...(appelants ? { callerPolicy: 'workflowsFromAList', callerIds: appelants } : { callerPolicy: 'none' }) })
const IMPORTS = "import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';"
const FICHES = {
  'lib-agenda-creneaux': "Les créneaux libres sont LUS dans l'agenda réel de l'artisan (nœud Google Calendar calendar.availability ou HTTP Request avec jeton déchiffré : épinglé ici, aucun identifiant), jamais inventés : au plus trois, dans ses horaires, sans chevaucher un bloc occupé. Agenda illisible, ancien ou d'un autre compte : aucun créneau, et la carte le dit. Aucun rendez-vous posé ici.",
  'lib-synchroniser-outil': "Lit un export épinglé, rend un aperçu (provenance de chaque ligne, totaux calculés par le code, empreinte) ; n'écrit qu'après la validation de l'artisan sur cet aperçu, vers la liste signée (mes_chiffres), par clé. Pagination bornée. Aucune écriture faite ici.",
}
const NOTE_ENFANT = (nom) => `const note = sticky(${J(`## ${nom} (036-008)\n${FICHES[nom]}\nContrat ${nom}@1 (enveloppe@1, gabarit « Contrat » de 035-003). Appelé par ${CHEF} et par ${BANC}.\nINACTIF, jamais publié, en simulation (mode A) : les lectures sont passées par l'appelant, les écritures partent dans effets_prevus. Aucun identifiant.\nJuge : scripts/operations-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });`
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
    `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par le Cerveau', position: [0, 80], parameters: { inputSource: 'passthrough' } } });`,
    `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[CHEF]), `contrat: ${contrat}`, [224, 80])};`,
    `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
    `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [2600, 80])};`,
    `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`,
    `const arret = ${ARRET_([2400, 240])};`,
    `const aiguiller = ${N('Aiguiller', [480, 80])};`,
    `const siCreneaux = ${IF_('Créneaux ?', '$json.est_creneaux')};`, `const siPoser = ${IF_('Poser le rendez-vous ?', '$json.est_poser')};`, `const siRappel = ${IF_('Rappel de la veille ?', '$json.est_rappel')};`,
    `const siStock = ${IF_('Stock ?', '$json.est_stock')};`, `const siImport = ${IF_('Import ?', '$json.est_import', 'Faux : la route « stop » (interrupteur coupé, genre absent ou inconnu).')};`,
    `const prepCreneaux = ${N('Préparer les créneaux', [1000, -300])};`,
    `const appelAgenda = ${APPEL_('Appeler lib-agenda-creneaux', ids['lib-agenda-creneaux'], "L'agenda lu, épinglé (036-008). Un échec ne fait pas échouer le passage.")};`,
    `const habCreneaux = ${N('Habiller les créneaux', [1500, -300])};`,
    `const poser = ${N('Poser le rendez-vous', [1240, -150])};`, `const rappel = ${N('Rappel de la veille', [1480, 0])};`, `const stock = ${N('Gardien du stock', [1720, 150])};`,
    `const prepImport = ${N("Préparer l'import", [1700, 300])};`,
    `const appelSync = ${APPEL_('Appeler lib-synchroniser-outil', ids['lib-synchroniser-outil'], "L'export lu, aperçu puis écriture après validation (036-008). Un échec ne fait pas échouer le passage.")};`,
    `const habImport = ${N("Habiller l'import", [2160, 300])};`,
    `const rien = ${N('Rien à faire', [1720, 450])};`,
    `const note = sticky(${J("## presti-dep-operations (036-008)\nLe département Opérations : créneaux libres LUS dans l'agenda (jamais inventés), rendez-vous posé APRÈS le clic de l'artisan (Studio comme Signature), rappel de la veille (une carte, plage d'envoi), gardien du stock (commande fournisseur préparée, jamais envoyée seule), import contrôlé d'un export (aperçu, validation, écriture par clé).\nINACTIF, jamais publié, en simulation (mode A) : les lectures sont passées par l'appelant, les écritures partent dans effets_prevus. Aucun identifiant, aucun modèle.\nDéclencheurs voulus (Cerveau) : rendez_vous_a_poser, veille_de_rendez_vous, stock_sous_le_seuil.\nJuge : scripts/operations-n8n-qa.mjs")}, [appele], { color: 4 });`,
    `export default workflow(${J(CHEF)}, ${J(CHEF)}, { settings: ${J(reglages)} })
  .add(appele).to(entree).to(conforme.onTrue(aiguiller.to(siCreneaux.onTrue(prepCreneaux.to(appelAgenda).to(habCreneaux)).onFalse(siPoser.onTrue(poser.to(porte)).onFalse(siRappel.onTrue(rappel.to(porte)).onFalse(siStock.onTrue(stock.to(porte)).onFalse(siImport.onTrue(prepImport.to(appelSync).to(habImport)).onFalse(rien.to(porte)))))))).onFalse(sortie))
  .add(habCreneaux).to(porte.onTrue(sortie).onFalse(arret))
  .add(habImport).to(porte)
  .add(note);`]
  return l.join('\n') + '\n'
}

// ─── Le banc presti-banc-operations : dix cas fictifs, seul appelant des enfants avec le chef ──────────────────────────────────────────────
export const CAS_BANC = [
  [CHEF, 'Cas : rappel de la veille', '// Exemple. Six rendez-vous : deux de demain avec canal consenti, un sans consentement, une opposition, un autre jour, un sans canal.', operations('rappel', { rappel: rappelFictif() }, { cle: 'exemple:banc:rappel', maintenant: MAINTENANT_VEILLE })],
  [CHEF, 'Cas : stock sous le seuil', '// Exemple. Cinq articles : trois sous le seuil, dont une commande déjà ouverte ; une commande prête, une sans fournisseur, une sans quantité.', operations('stock', { stock: stockFictif() }, { cle: 'exemple:banc:stock' })],
  [CHEF, 'Cas : rendez-vous sans clic (Signature)', '// Exemple. Signature, pilote actif, aucune validation de l’artisan : le rendez-vous ne se pose pas.', operations('poser', { poser: poserFictif({ validation: null }) }, { cle: 'exemple:banc:poser-sans-clic', maintenant: MAINTENANT_POSE })],
  [CHEF, 'Cas : rendez-vous après le clic', '// Exemple. L’artisan a cliqué sur l’un des créneaux proposés, encore libre : la pose est PRÉVUE, jamais faite.', operations('poser', { poser: poserFictif() }, { cle: 'exemple:banc:poser-clic', maintenant: MAINTENANT_POSE })],
  [CHEF, 'Cas : interrupteur coupé', '// Exemple. Le département est coupé : rien n’est appelé.', { ...operations('rappel', {}, { cle: 'exemple:banc:coupe' }), config: { ...CONFIG_OUVERTE, interrupteur_departement: false } }],
  ['lib-agenda-creneaux', 'Cas : créneaux libres', '// Exemple. Mardi après-midi, mercredi après-midi : trois créneaux lus dans l’agenda, deux par jour au plus.', agendaEnfant(donneesAgenda(), configAgenda(), 'exemple:banc:creneaux')],
  ['lib-agenda-creneaux', 'Cas : agenda illisible', '// Exemple. La lecture a échoué : aucun créneau, et la carte le dit.', agendaEnfant(donneesAgenda({ agenda: agendaFictif({ lue: false, lu_le: null, couvre: null, occupe: [] }) }), configAgenda(), 'exemple:banc:agenda-illisible')],
  ['lib-agenda-creneaux', 'Cas : semaine pleine', '// Exemple. Tout est occupé : aucun créneau libre, rien d’inventé.', agendaEnfant(donneesAgenda({ agenda: agendaFictif({ occupe: [occ('2026-11-03T00:00:00.000Z', '2026-11-10T00:00:00.000Z')] }) }), configAgenda(), 'exemple:banc:semaine-pleine')],
  ['lib-synchroniser-outil', 'Cas : aperçu de l’import', '// Exemple. Sept lignes : deux lues, une déclarée, une sans provenance, un doublon, une provenance vide, une déjà importée.', syncEnfant(donneesSync(), configSync(), 'exemple:banc:apercu')],
  ['lib-synchroniser-outil', 'Cas : écriture sans aperçu validé', '// Exemple. Phase « ecrire » sans validation de l’artisan : rien ne s’écrit.', syncEnfant(donneesSync({ phase: 'ecrire' }), configSync(), 'exemple:banc:ecrire-sans-apercu')],
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
  l.push(`const note = sticky(${J("## presti-banc-operations (036-008)\nBanc d'essai des Opérations : dix cas fictifs (« Exemple. »), le seul appelant permis des enfants avec le chef.\nINACTIF, jamais publié, jamais planifié. Ne lit ni n'écrit rien en base, n'envoie rien, ne pose aucun rendez-vous.\nJuge : scripts/operations-n8n-qa.mjs")}, [horloge, cas4], { color: 4 });`)
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
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/operations'
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
