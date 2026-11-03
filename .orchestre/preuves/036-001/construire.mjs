// 036-001 — fabrique du sommet du système de chaque artisan (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-001 du § 4) :
//   presti-cerveau (parent multi-comptes : il lit, il route, il journalise ; aucun calcul métier, aucun montant, aucun modèle),
//   presti-dep-accueil (le premier département : la demande avance comme un dossier) et ses spécialistes neufs lib-trier-demande (règles
//   d'abord, copie figée des mots d'escalade du pilote) et lib-lire-photo (modèle épinglé : la photo est décrite, jamais chiffrée),
//   les six autres chefs presti-dep-* en squelette (« non_branche »), et le banc presti-banc-cerveau (40 demandes fictives, deux comptes).
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (« Exemple. » devant tout nom).
// Les lib-* existants (035-003 à 035-005) sont APPELÉS, jamais réécrits ; le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003.
//   node .orchestre/preuves/036-001/construire.mjs <dossier> [--ids=<json>]   → les programmes SDK (collés tels quels dans n8n)
//   node .orchestre/preuves/036-001/construire.mjs --contrats                 → plans/011-cadrage-01-11/p6-signature/contrats/*.json
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import * as F4 from '../035-004/construire.mjs'
import * as F5 from '../035-005/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const LIBS = { // relevés dans les exports de 035-003 à 035-005 (search_workflows, 03/11/2026)
  'lib-qualifier-lead': 'uvGWZR8fHnXURRV6', 'lib-decider': 'hckqX1tQjIommtTH', 'lib-journaliser': 'NQg0KDXIa5hhzAvq',
  'lib-battement': 'XwjyA6PFjzlI2vpd', 'lib-porte-conformite': '8c8vkUeSkfgB5FAM', 'lib-executer': 'ADX5mPWqIvq1LGs6',
}
export const DEPS = ['accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction']
export const LOTS_SQUELETTE = { devis: '036-005', suivi: '036-004', facturation: '036-005', apres: '036-006', operations: '036-008', direction: '036-007' }
// La table de routage du Cerveau (type d'événement → département) : une liste fermée ; un type absent va à la sortie de secours (journal).
export const ROUTES = { demande_recue: 'accueil', devis_a_preparer: 'devis', relance_due: 'suivi', facture_a_emettre: 'facturation', impaye_echu: 'facturation',
  chantier_termine: 'apres', rendez_vous_a_poser: 'operations', page_du_matin: 'direction' }
export const VERSION_CONTRATS = '1.0.0'

// ─── La copie figée du code (lib/pilote/regles.ts, lib/mentionAssistant.ts, lib/models.ts), comparée au code par le juge ───────────
export function lireCopie() {
  const k = F5.lireCode()
  const src = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  const re = (nom) => { const m = new RegExp(`^const ${nom} = \\/(.+)\\/([gimsuy]*)$`, 'm').exec(src); if (!m) throw new Error(`${nom} introuvable`); return { source: m[1], flags: m[2] } }
  return { MOTS_ESCALADE_TOUJOURS: k.MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS: k.MOTS_ESCALADE_ENTIERS, FAUSSE_URGENCE: re('FAUSSE_URGENCE'),
    PERTE_D_EAU: re('PERTE_D_EAU'), APPAREIL_PERD: re('APPAREIL_PERD'), NOMS_NEUTRES: re('NOMS_NEUTRES'), MENTION: k.MENTION, MODELE: k.MODELE_STANDARD }
}

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ─────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const BOOL = { type: 'boolean' }
const BOOL_LU = { type: ['boolean', 'null'] }
const HHMM = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const mots = { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 60 } }
const cles = { type: 'array', maxItems: 1000, items: { type: 'string', maxLength: 80 } }
const QUALIF = F4.SCHEMAS['lib-qualifier-lead']
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']
const CONFIG_ACCUEIL = objet({
  nom_artisan: { type: 'string', minLength: 1, maxLength: 70 }, offre: { enum: OFFRES }, mode_reponse: { enum: ['manuelle', 'assistee', 'auto'] },
  capacites: { type: 'array', maxItems: 60, items: { type: 'string', pattern: '^[a-z_.]{2,40}$' } },
  pilote: objet({ drapeau: BOOL, actif: BOOL, types: { type: 'object' } }), parties_depuis_24h: { type: 'integer', minimum: 0 },
  interrupteur_general: BOOL, interrupteur_departement: BOOL, mots_escalade_artisan: mots, fournisseurs: mots,
  horaires: objet({ jours_permis: { type: 'array', maxItems: 7, items: { type: 'integer', minimum: 1, maximum: 7 } }, heures_permises: objet({ debut: HHMM, fin: HHMM }) }),
  plafond_jour: { type: 'integer', minimum: 0, maximum: 20 },
  qualification: objet({ grille: QUALIF.config.properties.grille, seuils: QUALIF.config.properties.seuils, delais_cibles_min: QUALIF.config.properties.delais_cibles_min }),
})
const DEMANDE = objet({
  id: UUID, canal: { enum: ['page_p', 'email', 'telegram'] }, recu_le: DATE, message: { type: ['string', 'null'], maxLength: 4000 },
  champs: QUALIF.donnees.properties.champs, empreinte_contact: { type: ['string', 'null'], pattern: '^[0-9a-f]{64}$' }, client_existant: BOOL, honeypot: BOOL,
  photo: { type: ['object', 'null'], additionalProperties: false, required: ['ref', 'type_mime'], properties: { ref: { type: 'string', pattern: '^[A-Za-z0-9._-]{1,80}$' }, type_mime: { enum: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] } } },
  proposition: { type: ['object', 'null'], additionalProperties: false, required: ['canal', 'objet', 'texte', 'outil'], properties: { canal: { enum: ['email', 'sms'] }, objet: { type: ['string', 'null'], maxLength: 120 }, texte: { type: 'string', minLength: 1, maxLength: 1700 }, outil: { type: 'string', pattern: '^[a-z_]{2,60}$' } } },
  destinataire: objet({ opposition: BOOL_LU, consentement_sms: BOOL_LU }),
}, ['id', 'canal', 'recu_le', 'message', 'champs', 'empreinte_contact', 'client_existant', 'honeypot', 'photo', 'proposition', 'destinataire'])
export const SCHEMAS = {
  'presti-dep-accueil': { sans_contact: false, config: CONFIG_ACCUEIL,
    donnees: objet({ demandes: { type: 'array', maxItems: 50, items: DEMANDE }, empreintes_connues: QUALIF.config.properties.empreintes_connues, cles_existantes: cles, maintenant: DATE }) },
  'lib-trier-demande': { sans_contact: true, config: objet({ mots_escalade_artisan: mots }),
    donnees: objet({ demande_id: UUID, texte: { type: ['string', 'null'], maxLength: 4000 }, liens: { type: 'integer', minimum: 0, maximum: 1000 }, honeypot: BOOL, client_existant: BOOL, urgence_declaree: BOOL }) },
  'lib-lire-photo': { sans_contact: true, config: objet({}, []),
    donnees: objet({ demande_id: UUID, photo: DEMANDE.properties.photo }) },
}
for (const d of DEPS.slice(1)) SCHEMAS[`presti-dep-${d}`] = { sans_contact: false, config: { type: 'object' }, donnees: objet({ evenements: { type: 'array', maxItems: 200, items: { type: 'object' } } }) }
export const CLASSES = ['urgence', 'peut_attendre', 'curieux', 'spam', 'client_existant']
export const SCHEMA_PHOTO = { type: 'object', additionalProperties: false, required: ['description', 'elements', 'confiance', 'chiffrage'], properties: {
  description: { type: 'string', minLength: 1, maxLength: 400 }, elements: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 60 } },
  confiance: { type: 'string', enum: ['faible', 'moyenne', 'bonne'] }, chiffrage: { type: 'null' } } }
// Ce que le Cerveau lit (la vue étroite que prépare 036-002 ; en simulation, données épinglées) et ce qu'il envoie à un chef.
export const COMPTE = objet({ artisan_id: UUID, palier: { enum: ['simulation', 'ombre', 'reel'] }, offre: { enum: OFFRES },
  interrupteurs: objet({ general: BOOL, departements: objet(Object.fromEntries(DEPS.map((d) => [d, BOOL]))) }),
  accueil: { type: 'object', description: 'presti-dep-accueil@1 config, moins interrupteur_general et interrupteur_departement (posés par le Cerveau depuis interrupteurs)' },
  empreintes_connues: QUALIF.config.properties.empreintes_connues, cles_existantes: cles })
export const EVENEMENT = objet({ id: UUID, artisan_id: UUID, type: { enum: Object.keys(ROUTES) }, cle: { type: 'string', minLength: 1, maxLength: 60, pattern: '^[A-Za-z0-9_:.-]+$' },
  demande: DEMANDE, donnees: { type: 'object' } }, ['id', 'artisan_id', 'type', 'cle'])
export const PAGE = objet({ artisan_id: UUID, page: { type: 'integer', minimum: 0 }, suivante: { type: ['integer', 'null'] }, evenements: { type: 'array', maxItems: 50, items: EVENEMENT } })
export const INTERRUPTEUR = objet({ interrupteur_general: BOOL, organisation_systeme: UUID, passage: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{4}$' }, maintenant: DATE })
const lecture = (table, quoi) => `GET ${table}?select=${quoi}`
export const LECTURES = {
  "Lire l'interrupteur général (simulation : épinglé)": { requete: lecture('systeme_reglages', 'interrupteur_general,organisation_systeme,passage,maintenant') + '&artisan_id=is.null&limit=1', schema: 'interrupteur' },
  'Lire les comptes (simulation : épinglé)': { requete: lecture('departements_reglages', 'artisan_id,palier,offre,interrupteurs,accueil,empreintes_connues,cles_existantes') + '&artisan_id=in.(<comptes en palier>)&limit=200', schema: 'compte' },
  'Lire les événements non traités, page par page (simulation : épinglé)': { requete: lecture('evenements_a_traiter', 'id,artisan_id,type,cle,demande,donnees') + '&artisan_id=eq.<compte>&traite_le=is.null&order=survenu_le.asc&limit=50&offset=<page>', schema: 'page' },
}
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-001', source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-001 et § 3',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute requête filtre sur artisan_id (« Supabase account » passe outre la RLS).' }
  return {
    'cerveau.json': { ...base, titre: 'presti-cerveau@1 — ce que le Cerveau lit, et comment il route', routes: ROUTES, departements: DEPS,
      lectures: LECTURES, interrupteur: INTERRUPTEUR, compte: COMPTE, page: PAGE, evenement: EVENEMENT,
      envoi_vers_un_chef: { contrat: 'presti-dep-<departement>@1', enveloppe: 'enveloppe@1 (035-003) : contrat, organisation_id = artisan_id, simulation (vrai en simulation), cle_idempotence, trace, config, donnees' },
      sauts: { palier_non_branche: 'palier ombre ou reel : non branché dans ce lot', interrupteur_coupe: 'interrupteur général du compte ou du département fermé' },
      rejets: ['compte_inconnu', 'autre_compte', 'type_sans_departement', 'doublon', 'evenement_hors_forme'] },
    'accueil.json': { ...base, titre: 'presti-dep-accueil@1 — le département Accueil et réponse', entree: { config: SCHEMAS['presti-dep-accueil'].config, donnees: SCHEMAS['presti-dep-accueil'].donnees },
      specialistes: { 'lib-trier-demande@1': { config: SCHEMAS['lib-trier-demande'].config, donnees: SCHEMAS['lib-trier-demande'].donnees, classes: CLASSES },
        'lib-lire-photo@1': { config: SCHEMAS['lib-lire-photo'].config, donnees: SCHEMAS['lib-lire-photo'].donnees, sortie_modele: SCHEMA_PHOTO } },
      sortie: { statut: ['ok', 'rien_a_faire', 'rejete', 'erreur'], resultat: ['demandes_recues', 'classes', 'spam', 'escalades', 'questions', 'decisions', 'cartes', 'pilote', 'brouillons_demandes', 'refus_porte', 'deja_faits', 'photos'] },
      studio_signature: { studio: 'carte (À valider) ; brouillon demandé à 036-003 si aucune proposition', signature: "file du pilote reponse_prospect seulement si mode « auto » servi (capacité plateforme.ia.auto), pilote actif et type activé ; sinon carte",
        escalade: 'carte « à traiter à la main », rien ne part chez le client', spam: 'journal seulement' } },
  }
}

// ─── Le code des nœuds ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// lib-trier-demande : règles d'abord (C10) ; aucune IA. La lecture de l'escalade est celle du pilote (sujetEscalade, lib/pilote/regles.ts),
// recopiée telle quelle avec ses listes et ses motifs : la copie est comparée au code, et ses décisions aussi, par le juge.
export const REPERE = '// ─── Copie figée de lib/pilote/regles.ts (MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS et motifs de sujetEscalade), comparée au code par scripts/cerveau-accueil-n8n-qa.mjs ───'
export const codeTrier = (k) => String.raw`// lib-trier-demande (036-001 ; C10 « règles d'abord » ; A13) : chaque demande reçoit UNE classe, dans cet ordre (exclusives, fiche triage) :
// spam (piège rempli, 3 liens ou plus, vocabulaire de démarchage) > urgence (urgence déclarée ou sujet d'urgence) > client_existant > curieux
// > peut_attendre. L'escalade est lue À PART, comme le pilote la lit (sujetEscalade) : un sujet d'escalade renvoie toujours à l'artisan.
// Aucun modèle, aucun montant ; le texte reçu est déjà masqué (coordonnées) par le chef.
` + REPERE + `
const COPIE = ${J({ MOTS_ESCALADE_TOUJOURS: k.MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS: k.MOTS_ESCALADE_ENTIERS, FAUSSE_URGENCE: k.FAUSSE_URGENCE, PERTE_D_EAU: k.PERTE_D_EAU, APPAREIL_PERD: k.APPAREIL_PERD, NOMS_NEUTRES: k.NOMS_NEUTRES })};
// ─── fin de la copie figée ───
` + String.raw`const sansAccents = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const enMots = (s) => ' ' + sansAccents(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const R = (n) => new RegExp(COPIE[n].source, COPIE[n].flags);
const FAUSSE_URGENCE = R('FAUSSE_URGENCE'), PERTE_D_EAU = R('PERTE_D_EAU'), APPAREIL_PERD = R('APPAREIL_PERD'), NOMS_NEUTRES = R('NOMS_NEUTRES');
const TOUJOURS = COPIE.MOTS_ESCALADE_TOUJOURS.map((m) => [m, enMots(m).trim()]);
const ENTIERS = COPIE.MOTS_ESCALADE_ENTIERS.map((m) => [m, enMots(m).trim()]);
function sujetEscalade(messages, motsArtisan) {
  const artisan = (Array.isArray(motsArtisan) ? motsArtisan : []).filter((m) => typeof m === 'string').map((m) => [m, sansAccents(m).trim()]).filter((x) => x[1] !== '');
  for (const brut of messages) {
    if (typeof brut !== 'string' || !brut.trim()) continue;
    const mots = enMots(brut).replace(NOMS_NEUTRES, ' ').replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ');
    for (const [m, k] of TOUJOURS) if (k && mots.includes(' ' + k)) return m;
    for (const [m, k] of ENTIERS) if (k && mots.includes(' ' + k + ' ')) return m;
    if (PERTE_D_EAU.test(mots)) return 'perte d’eau';
    if (APPAREIL_PERD.test(mots)) return 'perte d’eau';
    if (mots.includes(' ca sent ')) return 'ça sent';
    const texte = sansAccents(brut).replace(NOMS_NEUTRES, ' ');
    for (const [m, k] of artisan) if (texte.includes(k)) return m;
  }
  return null;
}
const SPAM = / (casino|crypto|bitcoin|viagra|backlinks?|referencement naturel|seo|pret rapide|gagnez|cliquez ici|offre exclusive) /;
const CURIEUX = / (simple question|juste savoir|par curiosite|renseignement|a titre indicatif|ordre de grandeur|combien coute|combien ca coute) /;
const URGENT = /urgen|press|vite|fui|fuy|fuite|inond|eau|gaz|feu|incendi|danger|electrocut|monoxyde|odeur|ca sent|explos|etincel|chauffage/;
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, d = e.donnees, t = d.texte || '';
    const mot = sujetEscalade([t], e.config.mots_escalade_artisan);
    const m = enMots(t), motifs = [];
    let classe = 'peut_attendre';
    if (d.honeypot === true) { classe = 'spam'; motifs.push('piege_rempli'); }
    else if (d.liens >= 3) { classe = 'spam'; motifs.push('liens_multiples'); }
    else if (SPAM.test(m)) { classe = 'spam'; motifs.push('vocabulaire_demarchage'); }
    else if (d.urgence_declaree === true || (mot && URGENT.test(sansAccents(mot)))) { classe = 'urgence'; motifs.push(d.urgence_declaree === true ? 'urgence_declaree' : 'sujet_urgent'); }
    else if (d.client_existant === true) { classe = 'client_existant'; motifs.push('contact_deja_client'); }
    else if (CURIEUX.test(m) || !t.trim()) { classe = 'curieux'; motifs.push(t.trim() ? 'simple_renseignement' : 'message_vide'); }
    else motifs.push('demande_ordinaire');
    if (mot) motifs.push('escalade');
    const resultat = { demande_id: d.demande_id, classe: classe, escalade: !!mot, mot: mot, motifs: motifs };
    return { json: { ...j, statut: 'ok', resultat: resultat, effets_prevus: [],
      journal: [{ evenement: 'tri', agent: 'lib-trier-demande', objet_ref: d.demande_id, decision: ('classe ' + classe + (mot ? ', escalade (« ' + mot + ' »)' : '')).slice(0, 200), simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['tri : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`

// lib-lire-photo : la photo jointe est DÉCRITE par le modèle (épinglé tant que la mesure n'est pas faite), jamais chiffrée.
export const PROMPT_PHOTO = `Tu décris, pour un artisan du bâtiment, la photo qu'un client a jointe à sa demande. Tu dis ce qu'on voit (pièce, matériau, état, élément concerné), en une ou deux phrases sobres. Tu ne chiffres JAMAIS rien : aucun prix, aucun montant, aucun coût, aucune durée de travaux, aucune quantité à commander. Si la photo est floue ou hors sujet, dis-le et mets la confiance à « faible ». Réponds uniquement dans le format demandé ; « chiffrage » vaut toujours null.`
export const CODE_PHOTO_DEMANDE = String.raw`// lib-lire-photo : une demande au modèle par photo (la référence seule, jamais le nom du client ni son message).
return $input.all().map((item) => { const e = item.json.enveloppe; return { json: { enveloppe: e, action_cle: e.cle_idempotence, demande: 'Décris la photo jointe à la demande (référence ' + e.donnees.photo.ref + ', ' + e.donnees.photo.type_mime + ').' } }; });`
export const codeRevaliderPhoto = (k) => String.raw`// lib-lire-photo, revalidation (FM:312-313) : la sortie du modèle est revalidée ICI contre son schéma ; hors schéma, ou si elle CHIFFRE
// quoi que ce soit (prix, montant, coût, durée, quantité), rien ne sort : statut « erreur », aucune description. Le modèle reste épinglé.
const MODELE = ${J(k.MODELE)};
const SCHEMA = ${J(SCHEMA_PHOTO)};
` + String.raw`const CHIFFRE = /\d[\d\s.,]*\s?(€|eur\b|euros?\b|ht\b|ttc\b|h\b|heures?\b|jours?\b|semaines?\b|m2\b|m²|metres?\b|mètres?\b)|\b(prix|tarifs?|co[uû]ts?|co[uû]tera|devis|chiffrage|estimation|budget|montant)\b/i;
const PREPARES = $('Préparer la demande au modèle').all().map((x) => x.json);
function horsSchema(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return 'sortie absente';
  for (const k of Object.keys(o)) if (!SCHEMA.properties[k]) return 'champ hors schéma : ' + k;
  for (const k of SCHEMA.required) if (!(k in o)) return 'champ manquant : ' + k;
  if (typeof o.description !== 'string' || !o.description.trim() || o.description.length > 400) return 'description invalide';
  if (!Array.isArray(o.elements) || o.elements.length > 8 || o.elements.some((x) => typeof x !== 'string' || x.length > 60)) return 'éléments invalides';
  if (!SCHEMA.properties.confiance.enum.includes(o.confiance)) return 'confiance hors liste';
  if (o.chiffrage !== null) return 'chiffrage interdit';
  if ([o.description].concat(o.elements).some((t) => CHIFFRE.test(t))) return 'la photo est chiffrée : interdit';
  return null;
}
return $input.all().map((item, i) => {
  const p = PREPARES[i] || {}, e = p.enveloppe || {}, o = item.json && item.json.output;
  const faute = horsSchema(o);
  const base = { conforme: true, enveloppe: e };
  if (faute) return { json: { ...base, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['photo : ' + faute],
    journal: [{ evenement: 'photo_rejetee', agent: 'lib-lire-photo', objet_ref: e.donnees ? e.donnees.demande_id : null, decision: ('sortie du modèle refusée : ' + faute).slice(0, 200), modele: MODELE, jetons_entree: null, jetons_sortie: null, cout_eur: null, simulation: e.simulation !== false }] } };
  return { json: { ...base, statut: 'ok', resultat: { demande_id: e.donnees.demande_id, description: o.description.trim(), elements: o.elements, confiance: o.confiance, modele: MODELE, epingle: true }, effets_prevus: [],
    journal: [{ evenement: 'photo_decrite', agent: 'lib-lire-photo', objet_ref: e.donnees.demande_id, decision: 'photo décrite (confiance ' + o.confiance + '), jamais chiffrée ; modèle épinglé', modele: MODELE, jetons_entree: null, jetons_sortie: null, cout_eur: null, simulation: e.simulation !== false }] } };
});`

// presti-dep-accueil : plusieurs enveloppes (une par compte) par appel ; tout est relié par l'identifiant de la demande (clés préfixées).
const COMMUN = String.raw`const ENVS = $("Contrat d'entrée").all().map((x) => x.json).filter((x) => x.conforme === true).map((x) => x.enveloppe);
const DOSSIERS = []; const PAR_ID = {};
for (const e of ENVS) for (const d of e.donnees.demandes) if (!PAR_ID[d.id]) { PAR_ID[d.id] = { e: e, d: d }; DOSSIERS.push(PAR_ID[d.id]); }
const env = (e, contrat, cle, config, donnees) => ({ contrat: contrat, organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: String(cle).slice(0, 80), trace: { execution_parent: String(e.trace.execution_parent), declencheur: 'presti-dep-accueil', tentative: e.trace.tentative }, config: config, donnees: donnees });
const sorties = (nom) => { const n = $(nom); return n.isExecuted ? n.all().map((x) => x.json) : []; };
const parCle = (nom, contrat) => { const m = {}; for (const s of sorties(nom)) if (s && s.contrat === contrat && typeof s.cle_idempotence === 'string') m[s.cle_idempotence] = s; return m; };
const bon = (s) => !!(s && s.statut === 'ok' && s.resultat);
const auto = (e) => e.config.mode_reponse === 'auto' && e.config.capacites.includes('plateforme.ia.auto');
const VIDE = [{ json: { vide: true } }];
`
export const ACCUEIL = {
  'Préparer le tri': String.raw`// Accueil (A11, A13) : chaque demande devient un dossier. 1. Le tri (lib-trier-demande, règles d'abord). Les coordonnées du message sont
// MASQUÉES avant de sortir du chef : le trieur ne voit jamais une adresse ni un numéro.
` + COMMUN + String.raw`const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const TEL = /(\+33|0033|\b0)\s?[1-9]([ .-]?\d{2}){4}\b/g;
const LIEN = /https?:\/\/|www\./gi;
const s = DOSSIERS.map(({ e, d }) => { const brut = typeof d.message === 'string' ? d.message : '';
  return { json: env(e, 'lib-trier-demande@1', 'tri:' + d.id, { mots_escalade_artisan: e.config.mots_escalade_artisan }, { demande_id: d.id, texte: brut.replace(MAIL, '[coordonnée]').replace(TEL, '[coordonnée]') || null, liens: (brut.match(LIEN) || []).length, honeypot: d.honeypot === true, client_existant: d.client_existant === true, urgence_declaree: !!(d.champs && d.champs.urgence === 'urgent') }) }; });
return s.length ? s : VIDE;`,
  'Préparer la lecture des photos': String.raw`// Accueil : 2. la photo jointe est décrite (lib-lire-photo, modèle épinglé), jamais chiffrée. Pas pour un spam.
` + COMMUN + String.raw`const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1');
const s = DOSSIERS.filter(({ e, d }) => d.photo && !(bon(tri['tri:' + d.id]) && tri['tri:' + d.id].resultat.classe === 'spam')).map(({ e, d }) => ({ json: env(e, 'lib-lire-photo@1', 'photo:' + d.id, {}, { demande_id: d.id, photo: d.photo }) }));
return s.length ? s : VIDE;`,
  'Préparer la qualification': String.raw`// Accueil : 3. la qualification (lib-qualifier-lead, grille du compte, aucun modèle). Un spam s'arrête ici (journal seulement). Un tri en
// échec n'écarte rien : la demande continue, et sera traitée comme une escalade (côté sûr).
` + COMMUN + String.raw`const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1');
const s = [];
for (const { e, d } of DOSSIERS) { const t = tri['tri:' + d.id]; if (bon(t) && t.resultat.classe === 'spam') continue;
  s.push({ json: env(e, 'lib-qualifier-lead@1', 'q:' + d.id, { grille: e.config.qualification.grille, seuils: e.config.qualification.seuils, delais_cibles_min: e.config.qualification.delais_cibles_min, empreintes_connues: e.donnees.empreintes_connues }, { lead_id: d.id, evenement_id: d.id, empreinte_contact: d.empreinte_contact, champs: d.champs }) }); }
return s.length ? s : VIDE;`,
  'Préparer la décision': String.raw`// Accueil : 4. la décision (lib-decider) : carte, pilote ou rien. Le niveau 3 (part seul) n'est demandé que si le mode « auto » est SERVI,
// comme modeEffectif (lib/plateformeConfig.ts:202-203) : mode choisi « auto » ET capacité plateforme.ia.auto de l'offre (lue en base, jamais
// un nom d'offre en dur). lib-decider vérifie ensuite l'offre, le drapeau, le pilote, le type activé, le plafond et l'escalade.
` + COMMUN + String.raw`const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1');
const s = [];
for (const q of sorties('Appeler lib-qualifier-lead')) { if (!q || q.contrat !== 'lib-qualifier-lead@1' || !bon(q)) continue; const x = PAR_ID[q.cle_idempotence.slice(2)]; if (!x) continue;
  const { e, d } = x, t = tri['tri:' + d.id];
  s.push({ json: env(e, 'lib-decider@1', 'd:' + d.id, { autonomie: { niveau_max: auto(e) ? 3 : 2, niveau_defaut: 2, niveaux: {} }, plan: e.config.offre, pilote: e.config.pilote, parties_depuis_24h: e.config.parties_depuis_24h },
    { objet_type: 'demande', objet_id: d.id, constat: { outil: d.proposition ? d.proposition.outil : 'valider_reponse_proposee', etape: 'premiere-reponse', escalade: bon(t) ? t.resultat.escalade : true } }) }); }
return s.length ? s : VIDE;`,
  'Préparer la porte': String.raw`// Accueil : 5. la porte de conformité (lib-porte-conformite, veto) avant TOUT effet. Trois cas :
//   - escalade (ou tri en échec) : une carte INTERNE « à traiter à la main » pour l'artisan ; rien ne part chez le client ;
//   - une réponse proposée existe : elle passe la porte, en carte (Studio, ou Signature hors pilote) ou vers le pilote (Signature, « auto »),
//     avec la mention d'IA posée par le code quand elle part sans relecture (copie figée de lib/mentionAssistant.ts) ;
//   - aucune proposition : rien à contrôler ; le brouillon est demandé (036-003), au résultat.
` + COMMUN + String.raw`const MENTION = COPIE.MENTION;
const avecMention = (texte, nom) => { const m = MENTION + (nom ? ' de ' + String(nom).replace(/[\r\n]+/g, ' ').trim().slice(0, 70) : '') + '.'; const c = String(texte).trimEnd(); return c.endsWith(m) ? c : c + '\n\n—\n' + m; };
const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1');
const s = [];
for (const r of sorties('Appeler lib-decider')) { if (!r || r.contrat !== 'lib-decider@1' || !bon(r) || r.resultat.action === 'rien') continue; const x = PAR_ID[r.cle_idempotence.slice(2)]; if (!x) continue;
  const { e, d } = x, t = tri['tri:' + d.id], esc = !bon(t) || t.resultat.escalade === true;
  const config = { jamais_auto: [], regles_metier: { fournisseurs: e.config.fournisseurs, mots_escalade_artisan: e.config.mots_escalade_artisan, jours_permis: e.config.horaires.jours_permis, heures_permises: e.config.horaires.heures_permises }, plafond_jour: e.config.plafond_jour };
  const commun = { maintenant: e.donnees.maintenant, compteurs: { envoyes_aujourdhui: e.config.parties_depuis_24h } };
  if (esc) { s.push({ json: env(e, 'lib-porte-conformite@1', 'p:' + d.id, config, Object.assign({ action: { type_action: 'demande_a_traiter', outil: 'traiter_a_la_main', prix_sources: true, cible: 'carte', sans_relecture: false }, message: null, destinataire: { opposition: false, consentement_sms: null, escalade: false } }, commun)) }); continue; }
  if (!d.proposition) continue;
  const cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte';
  s.push({ json: env(e, 'lib-porte-conformite@1', 'p:' + d.id, config, Object.assign({ action: { type_action: r.resultat.type_action, outil: d.proposition.outil, prix_sources: true, cible: cible, sans_relecture: cible === 'pilote' },
    message: { canal: d.proposition.canal, objet: d.proposition.objet, texte: cible === 'pilote' ? avecMention(d.proposition.texte, e.config.nom_artisan) : d.proposition.texte },
    destinataire: { opposition: d.destinataire.opposition, consentement_sms: d.destinataire.consentement_sms, escalade: false } }, commun)) }); }
return s.length ? s : VIDE;`,
  "Préparer l'exécution": String.raw`// Accueil : 6. SEUL ce que la porte laisse passer va à lib-executer, qui relit les interrupteurs juste avant l'effet et les clés déjà en base
// (cles_existantes : le même dossier rejoué ne refait rien). La clé de l'action est celle de lib-decider : un dossier, une seule action.
` + COMMUN + String.raw`const porte = parCle('Préparer la porte', 'lib-porte-conformite@1');
const dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const p of sorties('Appeler lib-porte-conformite')) { if (!p || p.contrat !== 'lib-porte-conformite@1' || !p.resultat || p.resultat.verdict !== 'passe') continue;
  const id = p.cle_idempotence.slice(2), x = PAR_ID[id], q = porte['p:' + id], r = dec['d:' + id]; if (!x || !q || !bon(r)) continue;
  const { e, d } = x, a = q.donnees.action, m = q.donnees.message;
  const charge = { type_action: a.type_action, objet_type: 'demande', objet_id: d.id }; if (m) { charge.canal = m.canal; charge.brouillon = { objet: m.objet, texte: m.texte }; }
  s.push({ json: env(e, 'lib-executer@1', r.resultat.cle_idempotence, { niveau_max: auto(e) ? 3 : 2 }, { verdict: 'passe', cible: p.resultat.cible, cle_idempotence: r.resultat.cle_idempotence, charge: charge,
    interrupteurs: { general: e.config.interrupteur_general, agent: e.config.interrupteur_departement }, cles_existantes: e.donnees.cles_existantes }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': String.raw`// Accueil : 7. le journal (lib-journaliser), une enveloppe par compte : des identifiants et des décisions, jamais un nom, un contact ni un texte.
` + COMMUN + String.raw`const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1'), ph = parCle('Appeler lib-lire-photo', 'lib-lire-photo@1'), q = parCle('Appeler lib-qualifier-lead', 'lib-qualifier-lead@1');
const dec = parCle('Appeler lib-decider', 'lib-decider@1'), po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1');
const s = [];
for (const e of ENVS) { const L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-dep-accueil', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: e.simulation });
  for (const d of e.donnees.demandes) { const t = tri['tri:' + d.id], r = dec['d:' + d.id];
    if (!t) ligne('tri_absent', d.id, 'demande non triée : traitée comme une escalade'); else if (!bon(t)) ligne('tri_en_echec', d.id, 'tri en échec : traitée comme une escalade');
    else ligne('tri', d.id, 'classe ' + t.resultat.classe + (t.resultat.escalade ? ', escalade' : ''));
    if (ph['photo:' + d.id]) ligne(bon(ph['photo:' + d.id]) ? 'photo_decrite' : 'photo_rejetee', d.id, bon(ph['photo:' + d.id]) ? 'photo décrite, jamais chiffrée' : 'sortie du modèle refusée');
    if (q['q:' + d.id] && bon(q['q:' + d.id])) ligne('qualification', d.id, 'priorité ' + q['q:' + d.id].resultat.priorite + (q['q:' + d.id].resultat.doublon ? ', doublon' : ''));
    if (r && bon(r)) ligne('decision', d.id, r.resultat.action + ' (' + r.resultat.motif + ')');
    if (po['p:' + d.id] && po['p:' + d.id].resultat) ligne(po['p:' + d.id].resultat.verdict === 'passe' ? 'porte_passe' : 'porte_refuse', d.id, po['p:' + d.id].resultat.verdict + (po['p:' + d.id].resultat.motifs.length ? ' (' + po['p:' + d.id].resultat.motifs.join(', ') + ')' : ''));
    if (r && bon(r) && ex[r.resultat.cle_idempotence] && ex[r.resultat.cle_idempotence].resultat) { const x = ex[r.resultat.cle_idempotence].resultat; ligne(x.deja_fait ? 'deja_traite' : 'action_prevue', d.id, x.deja_fait ? 'déjà fait : rien de refait' : (x.motif || 'prévue (simulation)')); } }
  s.push({ json: env(e, 'lib-journaliser@1', 'j:' + e.cle_idempotence, {}, { entrees: L.slice(0, 200) }) }); }
return s.length ? s : VIDE;`,
  'Assembler': String.raw`// Accueil : la sortie, une par compte. Les effets prévus viennent de lib-executer (la carte ou la ligne du pilote), de lib-qualifier-lead
// (la note) et du journal ; la décision de lib-decider n'est PAS un second effet (elle est réalisée par lib-executer). Rien n'est fait.
` + COMMUN + String.raw`const QUESTIONS = [['type_chantier', 'Quel type de travaux souhaitez-vous faire ?'], ['delai_souhaite', 'Pour quand souhaitez-vous les travaux ?'], ['surface_m2', 'Quelle surface est concernée, environ ?'], ['budget_tranche', 'Avez-vous une enveloppe en tête ?']];
const tri = parCle('Appeler lib-trier-demande', 'lib-trier-demande@1'), ph = parCle('Appeler lib-lire-photo', 'lib-lire-photo@1'), q = parCle('Appeler lib-qualifier-lead', 'lib-qualifier-lead@1');
const dec = parCle('Appeler lib-decider', 'lib-decider@1'), po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1'), jr = parCle('Appeler lib-journaliser', 'lib-journaliser@1');
const APPELS = ['Appeler lib-trier-demande', 'Appeler lib-lire-photo', 'Appeler lib-qualifier-lead', 'Appeler lib-decider', 'Appeler lib-porte-conformite', 'Appeler lib-executer', 'Appeler lib-journaliser'];
const communes = [];
for (const nom of APPELS) for (const s of sorties(nom)) if (!s || typeof s.contrat !== 'string') communes.push(nom + ' : appel en échec');
return ENVS.map((e) => {
  const erreurs = communes.slice(), effets = [];
  const r0 = { demandes_recues: e.donnees.demandes.length, classes: {}, spam: [], escalades: [], questions: [], decisions: [], cartes: [], pilote: [], brouillons_demandes: [], refus_porte: [], deja_faits: [], photos: [] };
  const vus = new Set();
  for (const d of e.donnees.demandes) { if (vus.has(d.id)) continue; vus.add(d.id);
    const t = tri['tri:' + d.id], qq = q['q:' + d.id], r = dec['d:' + d.id], p = po['p:' + d.id], f = ph['photo:' + d.id];
    for (const s of [t, qq, r, p, f]) if (s && (s.statut === 'erreur' || s.statut === 'rejete')) erreurs.push(s.contrat + ' : ' + s.statut + (s.erreurs && s.erreurs[0] ? ' (' + String(s.erreurs[0]).slice(0, 100) + ')' : ''));
    const classe = bon(t) ? t.resultat.classe : null; if (classe) r0.classes[classe] = (r0.classes[classe] || 0) + 1;
    if (classe === 'spam') { r0.spam.push(d.id); continue; }
    if (!bon(t) || t.resultat.escalade) r0.escalades.push({ demande_id: d.id, mot: bon(t) ? t.resultat.mot : null });
    if (f) r0.photos.push({ demande_id: d.id, statut: f.statut, description: bon(f) ? f.resultat.description : null });
    if (bon(qq)) { if (Array.isArray(qq.effets_prevus)) for (const x of qq.effets_prevus) effets.push(x);
      const manque = QUESTIONS.find(([k]) => d.champs[k] === undefined || d.champs[k] === null || d.champs[k] === ''); if (manque) r0.questions.push({ demande_id: d.id, question: manque[1] }); }
    if (!bon(r)) continue;
    r0.decisions.push({ demande_id: d.id, action: r.resultat.action, motif: r.resultat.motif });
    if (p && p.resultat && p.resultat.verdict !== 'passe') r0.refus_porte.push({ demande_id: d.id, motifs: p.resultat.motifs, repli: p.resultat.repli });
    const x = ex[r.resultat.cle_idempotence];
    if (x && x.resultat) { if (Array.isArray(x.effets_prevus)) for (const y of x.effets_prevus) effets.push(y);
      if (x.resultat.deja_fait) r0.deja_faits.push(r.resultat.cle_idempotence); else if (x.statut === 'ok' && x.resultat.prevu) (p && p.resultat.cible === 'pilote' ? r0.pilote : r0.cartes).push(r.resultat.cle_idempotence);
      if (x.statut !== 'ok' && !x.resultat.deja_fait) erreurs.push('lib-executer : ' + (x.resultat.motif || x.statut)); }
    if (!p && !d.proposition && r.resultat.action !== 'rien' && bon(t) && !t.resultat.escalade) { r0.brouillons_demandes.push(d.id);
      effets.push({ effet: 'demander_brouillon', organisation_id: e.organisation_id, cle: 'brouillon:' + d.id, objet_type: 'demande', objet_id: d.id, pour: '036-003' }); } }
  const j = jr['j:' + e.cle_idempotence]; if (j && Array.isArray(j.effets_prevus)) for (const y of j.effets_prevus) effets.push(y);
  const statut = erreurs.length ? 'erreur' : e.donnees.demandes.length ? 'ok' : 'rien_a_faire';
  return { json: { enveloppe: e, statut: statut, resultat: r0, effets_prevus: effets.slice(0, 1000), effets_faits: [], journal: j && Array.isArray(j.journal) ? j.journal : [], erreurs: erreurs.slice(0, 20) } };
});`,
}
// Les étapes du chef : [nœud qui prépare, nœud « rien à … ? », lib appelée, où va « rien » (null = au journal)].
export const ETAPES = [
  ['Préparer le tri', 'Rien à trier ?', 'lib-trier-demande', null],
  ['Préparer la lecture des photos', 'Aucune photo ?', 'lib-lire-photo', 'Préparer la qualification'],
  ['Préparer la qualification', 'Rien à qualifier ?', 'lib-qualifier-lead', null],
  ['Préparer la décision', 'Rien à décider ?', 'lib-decider', null],
  ['Préparer la porte', 'Rien à contrôler ?', 'lib-porte-conformite', null],
  ["Préparer l'exécution", 'Rien à exécuter ?', 'lib-executer', null],
]
export const codeSquelette = (d) => String.raw`// presti-dep-${d} (036-001) : SQUELETTE. Le département n'est pas branché ; le lot ${LOTS_SQUELETTE[d]} le remplit. Un seul retour, « non_branche » :
// rien n'est lu, écrit, envoyé ni calculé.
return $input.all().map((x) => ({ json: { enveloppe: x.json.enveloppe, statut: 'rien_a_faire', resultat: { etat: 'non_branche', departement: '${d}', lot: '${LOTS_SQUELETTE[d]}', evenements_recus: x.json.enveloppe.donnees.evenements.length }, effets_prevus: [], effets_faits: [],
  journal: [{ evenement: 'non_branche', agent: 'presti-dep-${d}', objet_ref: null, decision: 'département en squelette : rien n’est fait (${LOTS_SQUELETTE[d]})', simulation: x.json.enveloppe.simulation !== false }], erreurs: [] } }));`

// ─── Le Cerveau : il LIT (épinglé en simulation), il ROUTE, il JOURNALISE. Aucun calcul métier, aucun montant, aucun modèle (p6:357-359) ──
const LIT = String.raw`const G = $("Lire l'interrupteur général (simulation : épinglé)").first().json;
const trace = { execution_parent: 'presti-cerveau:' + G.passage, declencheur: 'presti-cerveau', tentative: 0 };
const sorties = (nom, b) => { const n = $(nom); return n.isExecuted ? n.all(b || 0).map((x) => x.json) : []; };
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const DEPS = ${J(DEPS)};
`
export const CERVEAU = {
  'Aiguiller': String.raw`// Cerveau : AIGUILLER, sans rien calculer. Pour chaque page lue (une par compte, page par page), chaque événement :
//   - doit appartenir au compte de sa page (artisan_id identique) : sinon rejet « autre_compte » (multi-tenant strict ; la lecture filtre déjà) ;
//   - va au département de son type (table fermée) ; un type inconnu est rejeté au journal ;
//   - n'est routé qu'une fois par passage (clé compte + clé de l'événement) : le doublon est rejeté.
// Un compte n'est servi que s'il est en palier « simulation » (ombre et réel ne sont pas branchés ici) et si son interrupteur général ET
// celui du département sont ouverts (fail-closed : absent = fermé). Une enveloppe par (compte, département), sa configuration telle que lue.
` + LIT + String.raw`const ROUTES = ${J(ROUTES)};
const OFFRES = ${J(OFFRES)};
const comptes = $('Lire les comptes (simulation : épinglé)').all().map((x) => x.json);
const parCompte = {}; for (const c of comptes) if (c && typeof c.artisan_id === 'string') parCompte[c.artisan_id] = c;
const lots = {}, ordre = [], vus = new Set(), rejets = [], sautes = [];
for (const { json: p } of $input.all()) { const c = parCompte[p.artisan_id];
  for (const ev of (Array.isArray(p.evenements) ? p.evenements : [])) {
    const ref = ev && typeof ev.id === 'string' ? ev.id : null;
    if (!c) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'compte_inconnu' }); continue; }
    if (!ev || ev.artisan_id !== p.artisan_id) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'autre_compte' }); continue; }
    if (typeof ev.cle !== 'string' || !ref) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'evenement_hors_forme' }); continue; }
    const dep = ROUTES[ev.type]; if (!dep) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'type_sans_departement' }); continue; }
    const cle = p.artisan_id + ':' + ev.cle; if (vus.has(cle)) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'doublon' }); continue; } vus.add(cle);
    const k = p.artisan_id + '|' + dep; if (!lots[k]) { lots[k] = { c: c, dep: dep, evs: [] }; ordre.push(k); } lots[k].evs.push(ev); } }
const DONNEES = { accueil: (c, evs) => ({ demandes: evs.map((ev) => ev.demande), empreintes_connues: c.empreintes_connues, cles_existantes: c.cles_existantes, maintenant: G.maintenant }) };
const CONFIG = { accueil: (c) => Object.assign({}, c.accueil, { interrupteur_general: c.interrupteurs.general, interrupteur_departement: c.interrupteurs.departements.accueil }) };
const s = [];
for (const k of ordre) { const { c, dep, evs } = lots[k];
  const i = c.interrupteurs && typeof c.interrupteurs === 'object' ? c.interrupteurs : {};
  if (c.palier !== 'simulation') { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: 'palier_non_branche' }); continue; }
  if (i.general !== true || !i.departements || i.departements[dep] !== true || !OFFRES.includes(c.offre)) { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: 'interrupteur_coupe' }); continue; }
  s.push({ json: { contrat: 'presti-dep-' + dep + '@1', organisation_id: c.artisan_id, simulation: true, cle_idempotence: 'dep:' + dep + ':' + c.artisan_id.slice(24) + ':' + G.passage, trace: trace,
    config: CONFIG[dep] ? CONFIG[dep](c) : {}, donnees: DONNEES[dep] ? DONNEES[dep](c, evs) : { evenements: evs } } }); }
if (rejets.length || sautes.length || !s.length) s.push({ json: { contrat: 'aucun', rejets: rejets, sautes: sautes } });
return s;`,
  'Journal : rejeté ou sauté': `// Cerveau : la sortie de secours du routage. Rien n'est perdu en silence : rejet et saut partent au journal du passage.\nreturn $input.all().map((x) => ({ json: { contrat: 'aucun', rejets: x.json.rejets || [], sautes: x.json.sautes || [] } }));`,
  'Préparer le journal': String.raw`// Cerveau : le journal du passage (lib-journaliser), UNE enveloppe par compte lu : chaque département appelé et son statut, chaque saut,
// chaque rejet. Des identifiants et des statuts seulement : aucun nom, aucun contact, aucun texte de client.
` + LIT + String.raw`const comptes = $('Lire les comptes (simulation : épinglé)').all().map((x) => x.json).filter((c) => c && typeof c.artisan_id === 'string');
const secours = sorties('Journal : rejeté ou sauté')[0] || { rejets: [], sautes: [] };
const s = [];
for (const c of comptes) { const L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-cerveau', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: true });
  for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
    const a = r.ok.filter((x) => x.cle_idempotence.includes(c.artisan_id.slice(24))); if (a.length) ligne('departement_appele', 'presti-dep-' + dep, 'statut ' + a.map((x) => x.statut).join(', '));
    if (r.ko.length) ligne('departement_en_echec', 'presti-dep-' + dep, 'sortie d’erreur : le département n’a pas répondu'); }
  for (const x of secours.sautes) if (x.artisan_id === c.artisan_id) ligne('departement_saute', 'presti-dep-' + x.departement, x.motif);
  for (const x of secours.rejets) if (x.artisan_id === c.artisan_id) ligne('evenement_rejete', x.id, x.motif);
  if (!L.length) ligne('passage_sans_evenement', null, 'rien à router pour ce compte');
  s.push({ json: { contrat: 'lib-journaliser@1', organisation_id: c.artisan_id, simulation: true, cle_idempotence: 'jc:' + c.artisan_id.slice(24) + ':' + G.passage, trace: trace, config: {}, donnees: { entrees: L.slice(0, 200) } } }); }
return s.length ? s : [{ json: { vide: true } }];`,
  'Préparer le battement': `// Cerveau : le battement du passage (lib-battement), que le contrôle des 26 h surveille. L'heure vient de la lecture, jamais d'un calcul.\n` + LIT + String.raw`return [{ json: { contrat: 'lib-battement@1', organisation_id: G.organisation_systeme, simulation: true, cle_idempotence: 'bat:cerveau:' + G.passage, trace: trace, config: {}, donnees: { workflow: 'presti-cerveau', passe_le: G.maintenant, operation: 'battre' } } }];`,
  'Bilan du passage': String.raw`// Cerveau : le bilan agrégé du passage, sans donnée personnelle : où il s'est arrêté, ce qui a été routé où, les statuts, les effets
// prévus et faits (toujours zéro fait en simulation). Des comptes, aucun calcul métier.
const passe = (nom) => $(nom).isExecuted;
const sorties = (nom, b) => passe(nom) ? $(nom).all(b || 0).map((x) => x.json) : [];
const issue = (nom) => { if (!passe(nom)) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = sorties(nom, 0), b = sorties(nom, 1); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
if (!passe('Lire les comptes (simulation : épinglé)')) return [{ json: { arret: 'interrupteur_general_coupe', routes: {}, statuts: {}, effets_prevus: 0, effets_faits: 0 } }];
const routes = {}, statuts = {};
let prevus = 0, faits = 0;
for (const x of sorties('Aiguiller')) if (x.contrat !== 'aucun') { const dep = x.contrat.split('@')[0].split('-')[2]; routes[dep] = (routes[dep] || 0) + (x.donnees.demandes || x.donnees.evenements || []).length; }
for (const dep of ${J(DEPS)}) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  statuts[dep] = r.ko.length ? 'echec' : r.ok.map((x) => x.statut).join(',');
  for (const x of r.ok) { if (Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (Array.isArray(x.effets_faits)) faits += x.effets_faits.length; } }
for (const nom of ['Appeler lib-journaliser', 'Appeler lib-battement']) for (const x of sorties(nom)) { if (x && Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (x && Array.isArray(x.effets_faits)) faits += x.effets_faits.length; }
const secours = sorties('Journal : rejeté ou sauté')[0] || { rejets: [], sautes: [] };
return [{ json: { arret: null, simulation: true, comptes: sorties('Lire les comptes (simulation : épinglé)').length, routes: routes, statuts: statuts, sautes: secours.sautes, rejets: secours.rejets.map((x) => x.motif), effets_prevus: prevus, effets_faits: faits } }];`,
}

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, gauche, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(nom.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 30) || 'si')}, leftValue: ${J('={{ ' + gauche + ' }}')}, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET = () => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', notes: "Simulation : aucun effet réel n'est branché. Hors simulation, le travail s'arrête ici, avant tout appel.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (tâche 036-001). Rien n'a été lu, écrit ni envoyé." } } })`
const APPEL = (nom, id, notes, onError = 'continueRegularOutput') => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, notes: ${J(notes)}, onError: ${J(onError)}, parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
const NOOP = (nom, notes) => `node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: ${J(nom)}, notes: ${J(notes)}, parameters: {} } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true, errorWorkflow: ERREUR }
export const reglagesEnfant = (appelants) => ({ ...REGLAGES, callerPolicy: 'workflowsFromAList', callerIds: appelants })
export const reglagesRacine = (t = 300) => ({ ...REGLAGES, executionTimeout: t, callerPolicy: 'none' })
const TETE = (contrat, schema, declencheur = 'Appelé par le Cerveau') => [
  `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: ${J(declencheur)}, parameters: { inputSource: 'passthrough' } } });`,
  `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, schema), `contrat: ${contrat}`)};`,
  `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
  `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat))};`]
const PORTE = `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché dans ce lot.")};\nconst arret = ${ARRET()};`
const NOTE = (texte) => `const note = sticky(${J(texte)}, [appele, entree, conforme], { color: 4 });`
const IMPORTS = (plus = '') => `import { workflow, node, trigger, ifElse, sticky${plus} } from '@n8n/workflow-sdk';`

export const codeLib = (nom, k) => nom === 'lib-trier-demande' ? { 'Trier par règles': codeTrier(k) } : { 'Préparer la demande au modèle': CODE_PHOTO_DEMANDE, 'Revalider la sortie du modèle': codeRevaliderPhoto(k) }
export function sdkLib(nom, k, appelants) {
  const contrat = `${nom}@1`, l = [IMPORTS(nom === 'lib-lire-photo' ? ', languageModel, outputParser' : ''), ...TETE(contrat, SCHEMAS[nom], 'Appelé par un chef'), PORTE]
  const fiche = nom === 'lib-trier-demande'
    ? "Trieur de l'Accueil (C10, A13) : une classe par demande (urgence, peut attendre, curieux, spam, client existant) par des RÈGLES, et l'escalade lue comme le pilote (copie figée de MOTS_ESCALADE_TOUJOURS et MOTS_ESCALADE_ENTIERS, lib/pilote/regles.ts:137 et :174). Aucun modèle."
    : "Lecteur de photo de l'Accueil (A13) : la photo jointe est DÉCRITE, jamais chiffrée. Modèle ÉPINGLÉ (aucun identifiant ; jamais appelé avant la mesure) ; sortie revalidée, tout chiffre refusé."
  l.push(NOTE(`## ${nom} (036-001)\n${fiche}\nContrat ${contrat} (enveloppe@1, gabarit « Contrat » de 035-003). Appelé par presti-dep-accueil.\nINACTIF, jamais publié, en simulation. Juge : scripts/cerveau-accueil-n8n-qa.mjs`))
  const reg = J(reglagesEnfant(appelants))
  if (nom === 'lib-trier-demande') {
    l.push(`const logique = ${CODE_('Trier par règles', codeTrier(k))};`)
    l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${reg} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))\n  .add(note);`)
  } else {
    l.push(`const prep = ${CODE_('Préparer la demande au modèle', CODE_PHOTO_DEMANDE)};`)
    l.push(`const modele = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.6, config: { name: 'Claude Haiku 5.5 (sans identifiant)', notes: ${J("Le palier Standard du produit (lib/models.ts). AUCUN identifiant : il sera posé par Benj après la mesure. D'ici là, « Décrire la photo » est épinglé et ce modèle n'est jamais appelé.")}, parameters: { model: { __rl: true, mode: 'id', value: ${J(k.MODELE)} }, options: { maxTokensToSample: 300, temperature: 0 } } } });`)
    l.push(`const parseur = outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { name: 'Sortie structurée (JSON Schema)', parameters: { schemaType: 'manual', inputSchema: ${J(J(SCHEMA_PHOTO, null, 2))}, autoFix: false } } });`)
    l.push(`const decrire = node({ type: '@n8n/n8n-nodes-langchain.agent', version: 3.1, config: { name: 'Décrire la photo (modèle épinglé)', notes: ${J("modele: epingle\nÉpinglé jusqu'à la mesure : chaque essai porte la sortie du modèle en données épinglées. Aucun outil. Prompt écrit par Claude Code (036-001).")}, parameters: { promptType: 'define', text: '={{ $json.demande }}', hasOutputParser: true, options: { systemMessage: ${J(PROMPT_PHOTO)}, maxIterations: 1, passthroughBinaryImages: false } }, subnodes: { model: modele, outputParser: parseur } } });`)
    l.push(`const revalider = ${CODE_('Revalider la sortie du modèle', codeRevaliderPhoto(k))};`)
    l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${reg} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(prep.to(decrire.to(revalider.to(sortie)))).onFalse(arret)).onFalse(sortie))\n  .add(note);`)
  }
  return l.join('\n') + '\n'
}
export const codeAccueil = (k) => Object.fromEntries(Object.entries(ACCUEIL).map(([n, js]) => [n, js.replace('const MENTION = COPIE.MENTION;', `const MENTION = ${J(k.MENTION)};`)]))
export function sdkAccueil(k, ids, appelants) {
  const c = codeAccueil(k), contrat = 'presti-dep-accueil@1'
  const l = [IMPORTS(), ...TETE(contrat, SCHEMAS['presti-dep-accueil']), PORTE]
  const NOTES = { 'lib-trier-demande': 'Le trieur (036-001).', 'lib-lire-photo': 'Le lecteur de photo, modèle épinglé (036-001).', 'lib-qualifier-lead': 'Le qualificateur (035-004), appelé tel quel.', 'lib-decider': 'Carte, pilote ou rien (035-004), appelé tel quel.', 'lib-porte-conformite': 'Le veto (035-005), appelé tel quel.', 'lib-executer': "Relit les interrupteurs et les clés juste avant l'effet (035-005), appelé tel quel." }
  ETAPES.forEach(([prep, si, lib], i) => {
    l.push(`const prep${i} = ${CODE_(prep, c[prep])};`, `const si${i} = ${IF_(si, '$json.vide === true', 'Vrai : rien à faire à cette étape. Faux : on appelle le spécialiste.')};`)
    l.push(`const appel${i} = ${APPEL(`Appeler ${lib}`, ids[lib], `${NOTES[lib]} En simulation, sa sortie est épinglée dans l'essai du chef tant que ${lib} n'a pas presti-dep-accueil dans ses callerIds (session principale).`)};`)
  })
  l.push(`const journal = ${CODE_('Préparer le journal', c['Préparer le journal'])};`)
  l.push(`const appelJournal = ${APPEL('Appeler lib-journaliser', ids['lib-journaliser'], 'Le journal (035-003), une enveloppe par compte.')};`)
  l.push(`const assembler = ${CODE_('Assembler', c.Assembler)};`)
  l.push(NOTE("## presti-dep-accueil (036-001)\nDépartement 1, Accueil et réponse (A11, A13) : la demande avance comme un dossier. Tri (règles) → photo (modèle épinglé) → qualification → décision → porte de conformité → exécution (carte ou pilote) → journal.\nStudio : carte, brouillon demandé à 036-003. Signature : file du pilote reponse_prospect seulement si mode « auto » servi et type activé. Escalade : carte « à la main ». Spam : journal.\nContrat presti-dep-accueil@1 (plans/011-cadrage-01-11/p6-signature/contrats/accueil.json). INACTIF, jamais publié, en simulation. Juge : scripts/cerveau-accueil-n8n-qa.mjs"))
  // La chaîne, de la dernière étape à la première ; « Aucune photo ? » vrai va à la qualification, les autres « rien » au journal.
  let suite = 'journal'
  for (let i = ETAPES.length - 1; i >= 0; i--) {
    const siRien = ETAPES[i][3] ? `prep${i + 1}` : 'journal'
    const corps = `prep${i}.to(si${i}.onTrue(${i === 1 ? '__QUALIF__' : siRien}).onFalse(appel${i}.to(${suite})))`
    suite = corps
  }
  // Le saut « aucune photo » rejoint le nœud de la qualification déjà déclaré (prep2), sans le redéclarer.
  suite = suite.replace('__QUALIF__', 'prep2')
  l.push(`export default workflow('presti-dep-accueil', 'presti-dep-accueil', { settings: ${J(reglagesEnfant(appelants))} })
  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(${suite}).onFalse(arret)).onFalse(sortie))
  .add(journal).to(appelJournal).to(assembler).to(sortie)
  .add(note);`)
  return l.join('\n') + '\n'
}
export function sdkSquelette(d, appelants) {
  const contrat = `presti-dep-${d}@1`
  return [IMPORTS(), ...TETE(contrat, SCHEMAS[`presti-dep-${d}`]), `const rien = ${CODE_('Non branché', codeSquelette(d))};`,
    NOTE(`## presti-dep-${d} (036-001)\nSQUELETTE : déclencheur, Contrat, un seul retour « non_branche ». Le lot ${LOTS_SQUELETTE[d]} le remplit (premiere-reponse.md § 3.2).\nINACTIF, jamais publié. Juge : scripts/cerveau-accueil-n8n-qa.mjs`),
    `export default workflow(${J(`presti-dep-${d}`)}, ${J(`presti-dep-${d}`)}, { settings: ${J(reglagesEnfant(appelants))} })\n  .add(appele).to(entree).to(conforme.onTrue(rien.to(sortie)).onFalse(sortie))\n  .add(note);`].join('\n') + '\n'
}
const NOTE_LECTURE = (nom) => `requete: ${LECTURES[nom].requete}\nSimulation : un emplacement, sa sortie est ÉPINGLÉE dans chaque essai (données fictives « Exemple. »). Non épinglé, il ne rend rien d'utile et le passage s'arrête sans effet (fail-closed). Réel : cette lecture HTTP, select= limité, filtre artisan_id (vue étroite de 036-002, au « go » de Benj).`
export function sdkCerveau(ids) {
  const P = CERVEAU, L = Object.keys(LECTURES)
  const l = [`import { workflow, node, trigger, ifElse, switchCase, merge, sticky } from '@n8n/workflow-sdk';`,
    `const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Toutes les minutes', parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } } });`,
    `const inter = ${NOOP(L[0], NOTE_LECTURE(L[0]))};`,
    `const siInter = ${IF_('Interrupteur général ouvert ?', '$json.interrupteur_general === true', "Faux (coupé, absent ou illisible) : le passage s'arrête, rien n'est appelé.")};`,
    `const comptes = ${NOOP(L[1], NOTE_LECTURE(L[1]))};`,
    `const pages = ${NOOP(L[2], NOTE_LECTURE(L[2]))};`,
    `const aiguiller = ${CODE_('Aiguiller', P.Aiguiller)};`,
    `const routeur = switchCase({ version: 3.2, config: { name: 'Router par département', notes: 'Switch sur le contrat de l\\'enveloppe (un département par sortie), avec une sortie de secours vers le journal (fiche triage).', parameters: { rules: { values: ${J(DEPS.map((d) => ({ outputKey: d, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.contrat }}', operator: { type: 'string', operation: 'equals' }, rightValue: `presti-dep-${d}@1` }], combinator: 'and' } })), null, 1)} }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'secours' } } } });`]
  DEPS.forEach((d) => l.push(`const appel_${d} = ${APPEL(`Appeler presti-dep-${d}`, ids[`presti-dep-${d}`], `Chef du département ${d}. « Continue (using error output) » : un département en panne ne fait pas échouer le Cerveau.`, 'continueErrorOutput')};`))
  l.push(`const secours = ${CODE_('Journal : rejeté ou sauté', P['Journal : rejeté ou sauté'])};`,
    `const reunir = merge({ version: 3.2, config: { name: 'Réunir les sorties', parameters: { mode: 'append', numberInputs: ${DEPS.length + 1} } } });`,
    `const prepJournal = ${CODE_('Préparer le journal', P['Préparer le journal'])};`,
    `const siJournal = ${IF_('Aucun compte lu ?', '$json.vide === true')};`,
    `const appelJournal = ${APPEL('Appeler lib-journaliser', ids['lib-journaliser'], 'Journal du passage, une enveloppe par compte (035-003). Épinglé en simulation tant que presti-cerveau n\'est pas dans ses callerIds.')};`,
    `const prepBatt = ${CODE_('Préparer le battement', P['Préparer le battement'])};`,
    `const appelBatt = ${APPEL('Appeler lib-battement', ids['lib-battement'], 'Battement du Cerveau (035-003). Épinglé en simulation.')};`,
    `const bilan = ${CODE_('Bilan du passage', P['Bilan du passage'])};`,
    `const note = sticky(${J("## presti-cerveau (036-001)\nLe sommet du système de chaque artisan (p6:69, A1), multi-comptes : il LIT (épinglé en simulation), il ROUTE vers les sept chefs presti-dep-*, il journalise. Aucun calcul métier, aucun montant, aucun modèle (p6:357-359).\nToutes les minutes : interrupteur général → comptes (offre, interrupteurs, palier) → événements non traités page par page (filtre artisan_id) → aiguillage (multi-tenant, doublons, palier, interrupteurs) → départements (sortie de secours) → journal → battement → bilan.\nContrat : plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json. INACTIF, jamais publié, en simulation. Juge : scripts/cerveau-accueil-n8n-qa.mjs")}, [horloge, inter, siInter], { color: 4 });`)
  const cas = DEPS.map((d, i) => `    .onCase(${i}, appel_${d}.to(reunir.input(${i})))`).join('\n')
  l.push(`export default workflow('presti-cerveau', 'presti-cerveau', { settings: ${J(reglagesRacine(300))} })
  .add(horloge).to(inter).to(siInter.onTrue(comptes.to(pages).to(aiguiller).to(routeur
${cas}
    .onCase(${DEPS.length}, secours.to(reunir.input(${DEPS.length}))))).onFalse(bilan))
${DEPS.map((d, i) => `  .add(appel_${d}.onError(reunir.input(${i})))`).join('\n')}
  .add(reunir).to(prepJournal).to(siJournal.onTrue(prepBatt).onFalse(appelJournal.to(prepBatt)))
  .add(prepBatt).to(appelBatt).to(bilan)
  .add(note);`)
  return l.join('\n') + '\n'
}

// ─── Le banc presti-banc-cerveau : 40 demandes fictives, deux comptes (« Exemple. » devant tout nom) ──────────────────────────────
export const MAINTENANT = '2026-11-07T21:42:00.000+01:00' // un samedi soir, heure de Paris : A11, répondre à toute heure
export const PASSAGE = '2026-11-07T2142'
export const COMPTE_A = '00000000-0000-4000-8000-0000000000a1' // Studio
export const COMPTE_B = '00000000-0000-4000-8000-0000000000b2' // Signature
export const ORG_SYSTEME = '00000000-0000-4000-8000-000000000000'
const ID = (c, i) => `00000000-0000-4000-8000-${c === 'A' ? 'a' : 'b'}${String(i).padStart(11, '0')}`
const GRILLE = F4.GRILLE_EXEMPLE
const CAPA = { studio: ['canaux.email', 'relances', 'factures.relances', 'assistant'], signature: ['canaux.email', 'relances', 'factures.relances', 'assistant', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'] }
export function configAccueil(compte) {
  const sig = compte === 'B'
  return { nom_artisan: sig ? 'Exemple. Menuiserie Berthier-Démo' : 'Exemple. Plomberie Arnal-Démo', offre: sig ? 'signature' : 'studio', mode_reponse: sig ? 'auto' : 'assistee', capacites: sig ? CAPA.signature : CAPA.studio,
    pilote: sig ? { drapeau: true, actif: true, types: { reponse_prospect: true } } : { drapeau: true, actif: false, types: {} }, parties_depuis_24h: sig ? 3 : 0,
    interrupteur_general: true, interrupteur_departement: true, mots_escalade_artisan: ['Exemple. mot sensible'], fournisseurs: [],
    horaires: { jours_permis: [1, 2, 3, 4, 5, 6, 7], heures_permises: { debut: '00:00', fin: '23:59' } }, plafond_jour: 20,
    qualification: { grille: GRILLE, seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 } } }
}
const emp = (c, n) => F4.empreinteDe(c === 'A' ? COMPTE_A : COMPTE_B, `exemple-contact-${n}`)
// Les cas : [compte, message, champs, options]. La « proposition » est la réponse que l'application a préparée (mode assistée ou auto) ;
// elle est fictive, sans prix, sans date, sans créneau.
const PROP = (texte, outil = 'valider_reponse_proposee') => ({ canal: 'email', objet: 'Exemple. Votre demande', texte: `Exemple. Bonjour, merci pour votre message. ${texte} Bien à vous.`, outil })
const CAS = [
  ['A', 'Exemple. Bonjour, je voudrais refaire la salle de bain complète, douche à l’italienne.', { canal: 'formulaire', type_chantier: 'Salle de bain', delai_souhaite: 'dans 3 mois' }, { prop: 'Nous revenons vers vous pour convenir d’une visite.' }],
  ['A', 'Exemple. Mon chauffe-eau fuit depuis ce matin, il y a de l’eau partout !', { canal: 'formulaire', urgence: 'urgent', type_chantier: 'Chauffe-eau' }, { soir: true, prop: 'Nous regardons votre demande.' }],
  ['A', 'Exemple. Je souhaite changer mon évier de cuisine.', { canal: 'site', type_chantier: 'Cuisine' }, { weekend: true, prop: 'Pouvez-vous nous dire quel modèle vous intéresse ?' }],
  ['A', 'Exemple. Gagnez des clients avec notre offre exclusive de référencement naturel, cliquez ici.', {}, { liens: 1 }],
  ['A', 'Exemple. Juste savoir, combien coute en général un remplacement de robinet ?', { canal: 'site' }, { prop: 'Nous pouvons passer voir votre installation pour vous répondre.' }],
  ['A', 'Exemple. Re-bonjour, c’est pour la suite du chantier de l’an dernier.', { canal: 'formulaire', type_chantier: 'Entretien' }, { client: true, prop: 'Ravi de vous relire, nous reprenons votre dossier.' }],
  ['A', 'Exemple. Je vais porter plainte, les travaux ont été mal faits et mon avocat vous écrira.', { canal: 'formulaire' }, { prop: 'Nous sommes désolés.' }],
  ['A', 'Exemple. Bonjour, une rénovation de WC, voici une photo.', { canal: 'formulaire', type_chantier: 'WC', photo_jointe: true }, { photo: 'exemple-wc-01.jpg', prop: 'Merci pour la photo, nous l’étudions.' }],
  ['A', 'Exemple. Bonjour, refaire la salle de bain complète, douche à l’italienne.', { canal: 'formulaire', type_chantier: 'Salle de bain' }, { empreinte: 1, prop: 'Nous revenons vers vous.' }],
  ['A', 'Exemple. Pose d’un radiateur dans la chambre, vous pouvez me rappeler au 06 00 00 00 00.', { canal: 'site', type_chantier: 'Chauffage' }, { prop: 'Nous vous recontactons.' }],
  ['A', 'Exemple. Création d’une salle d’eau dans les combles.', { canal: 'formulaire', type_chantier: 'Salle d’eau', surface_m2: 6 }, {}],
  ['A', 'Exemple. Ça sent le gaz près de la chaudière depuis hier soir.', { canal: 'formulaire', type_chantier: 'Chaudière' }, { soir: true, prop: 'Nous regardons.' }],
  ['A', 'Exemple. Remplacement de la baignoire par une douche.', { canal: 'site', type_chantier: 'Salle de bain', delai_souhaite: 'printemps' }, { weekend: true, prop: 'Nous pouvons en parler lors d’une visite.' }],
  ['A', '', {}, { piege: true }],
  ['A', 'Exemple. Installation d’un adoucisseur d’eau.', { canal: 'site', type_chantier: 'Adoucisseur' }, { prop: 'Le devis sera de 1 200 € TTC.' }],
  ['A', 'Exemple. Bonjour, pas d’urgence, quand vous pouvez : changer un mitigeur.', { canal: 'formulaire', type_chantier: 'Mitigeur' }, { prop: 'Nous revenons vers vous.' }],
  ['A', 'Exemple. Bonjour, je veux refaire la plomberie de la cuisine.', { canal: 'formulaire', type_chantier: 'Cuisine' }, { photo: 'exemple-cuisine-02.jpg', prop: 'Merci, nous étudions la photo.' }],
  ['A', 'Exemple. Mise aux normes d’un tableau de chauffage au sol.', { canal: 'formulaire', type_chantier: 'Plancher chauffant' }, { prop: 'Nous revenons vers vous.' }],
  ['A', 'Exemple. Le robinet refuit encore après votre passage.', { canal: 'formulaire', type_chantier: 'Robinet' }, { client: true, prop: 'Nous repassons voir.' }],
  ['A', 'Exemple. Bonjour, projet de salle de bain pour l’automne.', { canal: 'site', type_chantier: 'Salle de bain' }, { prop: 'Avec plaisir, parlons-en.' }],
  ['B', 'Exemple. Bonjour, je souhaite un dressing sur mesure dans la chambre.', { canal: 'formulaire', type_chantier: 'Dressing', delai_souhaite: 'dans 2 mois' }, { soir: true, prop: 'Nous serions ravis d’en parler avec vous.' }],
  ['B', 'Exemple. Une porte d’entrée en chêne à remplacer.', { canal: 'site', type_chantier: 'Porte d’entrée' }, { weekend: true, prop: 'Pouvez-vous nous dire les dimensions de la porte ?' }],
  ['B', 'Exemple. Mon parquet est gondolé après un dégât des eaux, l’assurance demande un devis.', { canal: 'formulaire', type_chantier: 'Parquet' }, { prop: 'Nous regardons cela.' }],
  ['B', 'Exemple. Fabrication d’une bibliothèque murale.', { canal: 'formulaire', type_chantier: 'Bibliothèque' }, { photo: 'exemple-mur-03.jpg', prop: 'Merci pour la photo du mur.' }],
  ['B', 'Exemple. Crypto : doublez vos gains en une semaine, voir www.exemple.invalid', {}, { liens: 1 }],
  ['B', 'Exemple. Bonjour, une simple question : vous faites les escaliers ?', { canal: 'site' }, { prop: 'Oui, nous réalisons des escaliers sur mesure.' }],
  ['B', 'Exemple. Suite à notre chantier, je voudrais une seconde fenêtre.', { canal: 'formulaire', type_chantier: 'Fenêtre' }, { client: true, prop: 'Avec plaisir, nous reprenons votre dossier.' }],
  ['B', 'Exemple. C’est urgent, la fenêtre ne ferme plus et il pleut dans le salon.', { canal: 'formulaire', urgence: 'urgent', type_chantier: 'Fenêtre' }, { soir: true, prop: 'Nous regardons.' }],
  ['B', 'Exemple. Une cuisine équipée en bois massif.', { canal: 'formulaire', type_chantier: 'Cuisine', surface_m2: 12 }, { weekend: true, prop: 'Nous serions ravis de vous aider.' }],
  ['B', 'Exemple. Je souhaite un placard sous l’escalier.', { canal: 'site', type_chantier: 'Placard' }, {}],
  ['B', 'Exemple. Je souhaite un dressing sur mesure dans la chambre.', { canal: 'formulaire', type_chantier: 'Dressing' }, { soir: true, empreinte: 21, prop: 'Nous revenons vers vous.' }],
  ['B', 'Exemple. Pose de plinthes dans le séjour.', { canal: 'formulaire', type_chantier: 'Plinthes' }, { prop: 'Pourriez-vous préciser la longueur ?' }],
  ['B', 'Exemple. Rénovation d’un escalier ancien.', { canal: 'site', type_chantier: 'Escalier' }, { prop: 'Votre escalier sera prêt le 12 décembre.' }],
  ['B', 'Exemple. Une terrasse en bois pour cet été.', { canal: 'formulaire', type_chantier: 'Terrasse', delai_souhaite: 'été' }, { prop: 'Nous serions ravis d’en parler.' }],
  ['B', 'Exemple. Facture à régler pour le chantier précédent, pouvez-vous la marquer payée ?', { canal: 'formulaire', type_chantier: 'Administratif' }, { client: true, prop: 'Nous regardons votre facture.', outil: 'marquer_facture_payee' }],
  ['B', 'Exemple. Je refuse de payer tant que la porte n’est pas reprise.', { canal: 'formulaire', type_chantier: 'Porte' }, { client: true, prop: 'Nous regardons.' }],
  ['B', 'Exemple. Meuble de salle de bain sur mesure.', { canal: 'site', type_chantier: 'Meuble' }, { weekend: true, prop: 'Nous serions ravis de vous aider.' }],
  ['B', 'Exemple. Lambris à poser au plafond.', { canal: 'formulaire', type_chantier: 'Lambris' }, { prop: 'Merci pour votre demande.' }],
  ['B', 'Exemple. Pose d’une verrière d’atelier.', { canal: 'formulaire', type_chantier: 'Verrière' }, { photo: 'exemple-verriere-04.jpg', prop: 'Merci pour la photo.' }],
  ['B', 'Exemple. Bonjour, une étagère pour le bureau.', { canal: 'site', type_chantier: 'Étagère' }, { prop: 'Avec plaisir.' }],
]
export function casBanc() {
  const n = { A: 0, B: 0 }
  const demandes = { A: [], B: [] }
  CAS.forEach(([c, message, champs, o], i) => {
    const k = ++n[c]
    const recu = o.soir ? '2026-11-06T21:10:00.000+01:00' : o.weekend ? '2026-11-07T15:30:00.000+01:00' : '2026-11-06T10:15:00.000+01:00'
    const ch = { ...champs }; if (o.soir) ch.recu_hors_horaires = true
    demandes[c].push({ id: ID(c, k), canal: 'page_p', recu_le: recu, message, champs: ch, empreinte_contact: emp(c, o.empreinte ?? i + 1), client_existant: !!o.client, honeypot: !!o.piege,
      photo: o.photo ? { ref: o.photo, type_mime: 'image/jpeg' } : null, proposition: o.prop ? PROP(o.prop, o.outil) : null, destinataire: { opposition: false, consentement_sms: null } })
    if (o.liens) demandes[c][demandes[c].length - 1].message += ' https://exemple.invalid/a https://exemple.invalid/b https://exemple.invalid/c'
  })
  return demandes
}
// La sortie épinglée du modèle de lib-lire-photo, par photo (jamais un chiffre).
export const SORTIES_PHOTO = {
  'exemple-wc-01.jpg': { description: 'Exemple. Un WC au sol ancien, carrelage clair, joints noircis au pied de la cuvette.', elements: ['WC au sol', 'carrelage', 'joints'], confiance: 'bonne', chiffrage: null },
  'exemple-cuisine-02.jpg': { description: 'Exemple. Un évier sous fenêtre, tuyaux apparents sous le meuble, traces d’humidité sur le fond.', elements: ['évier', 'tuyaux', 'meuble bas'], confiance: 'moyenne', chiffrage: null },
  'exemple-mur-03.jpg': { description: 'Exemple. Un mur droit en plâtre peint, une prise basse au milieu, parquet au sol.', elements: ['mur en plâtre', 'prise', 'parquet'], confiance: 'bonne', chiffrage: null },
  'exemple-verriere-04.jpg': { description: 'Exemple. Photo floue d’une cloison ; on devine une ouverture vers la cuisine.', elements: ['cloison'], confiance: 'faible', chiffrage: null },
}
export function enveloppesBanc() {
  const d = casBanc()
  const trace = { execution_parent: 'presti-banc-cerveau:' + PASSAGE, declencheur: 'presti-banc-cerveau', tentative: 0 }
  const E = (c) => ({ contrat: 'presti-dep-accueil@1', organisation_id: c === 'A' ? COMPTE_A : COMPTE_B, simulation: true, cle_idempotence: `dep:accueil:${(c === 'A' ? COMPTE_A : COMPTE_B).slice(24)}:${PASSAGE}`, trace,
    config: configAccueil(c), donnees: { demandes: d[c], empreintes_connues: [], cles_existantes: [], maintenant: MAINTENANT } })
  return [E('A'), E('B')]
}
export const NOEUDS_CAS = { A: 'Cas fictifs : compte Studio (20 demandes)', B: 'Cas fictifs : compte Signature (20 demandes)' }
export const codeBanc = (c) => String.raw`// presti-banc-cerveau (036-001) : 20 demandes FICTIVES du compte ${c === 'A' ? 'Studio' : 'Signature'} (« Exemple. » devant tout nom), un samedi soir :
// soir, week-end, escalade, doublon, spam, piège, photo, client existant, proposition avec un prix ou une date inventés${c === 'B' ? ', geste « jamais en automatique »' : ''}.
// Rien de réel ; aucune adresse ; le numéro de téléphone est fictif et masqué par le chef. Ce nœud ajoute l'enveloppe de son compte.
const ENVELOPPE = ${J(enveloppesBanc()[c === 'A' ? 0 : 1])};
return $input.all().filter((x) => x.json && x.json.contrat === 'presti-dep-accueil@1').concat([{ json: ENVELOPPE }]);`
export const CODE_BILAN_BANC = String.raw`// Banc : le bilan agrégé, sans donnée : par compte, le statut et les comptes de cartes, de lignes du pilote, d'escalades et de spam.
return [{ json: { comptes: $input.all().map((x) => x.json).map((s) => ({ statut: s.statut, erreurs: (s.erreurs || []).length, cartes: s.resultat ? s.resultat.cartes.length : null, pilote: s.resultat ? s.resultat.pilote.length : null, escalades: s.resultat ? s.resultat.escalades.length : null, spam: s.resultat ? s.resultat.spam.length : null })) } }];`
export function sdkBanc(idAccueil) {
  return [`import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';`,
    `const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais planifié : inactif)', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } } });`,
    `const casA = ${CODE_(NOEUDS_CAS.A, codeBanc('A'))};`,
    `const casB = ${CODE_(NOEUDS_CAS.B, codeBanc('B'))};`,
    `const appel = ${APPEL('Appeler presti-dep-accueil', idAccueil, "Le chef de l'Accueil, appelé pour de vrai : ses appels aux lib-* sont refusés tant que leurs callerIds ne le contiennent pas (politique d'appel, essai 443 de 035-007).")};`,
    `const bilan = ${CODE_('Bilan du banc', CODE_BILAN_BANC)};`,
    `const note = sticky(${J("## presti-banc-cerveau (036-001)\nBanc de l'Accueil : 40 demandes fictives, deux comptes. INACTIF, jamais publié, jamais planifié. Le juge hors ligne scripts/cerveau-accueil-n8n-qa.mjs rejoue ces 40 demandes sur les exports.")}, [horloge, casA, casB], { color: 4 });`,
    `export default workflow('presti-banc-cerveau', 'presti-banc-cerveau', { settings: ${J(reglagesRacine(300))} })\n  .add(horloge).to(casA).to(casB).to(appel).to(bilan)\n  .add(note);`].join('\n') + '\n'
}

// Les longues chaînes du SDK sont découpées en morceaux concaténés (« "…" + "…" ), lignes de 1 000 caractères au plus : le programme reste
// le même (validate_workflow l'accepte), il se relit et se recopie sans ligne tronquée. Le code des nœuds n'en est pas changé.
export const decouper = (sdk) => sdk.replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => { if (m.length <= 600) return m; const v = Array.from(JSON.parse(m)), p = []
  for (let i = 0; i < v.length; i += 400) p.push(J(v.slice(i, i + 400).join('')))
  return p.join(' +\n    ') })
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (x) => (process.argv.find((a) => a.startsWith(`--${x}=`)) || '').slice(x.length + 3) || null
  if (process.argv.includes('--contrats')) {
    const dir = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats'); mkdirSync(dir, { recursive: true })
    for (const [f, o] of Object.entries(contrats())) writeFileSync(path.join(dir, f), J(o, null, 2) + '\n')
    console.log('contrats écrits : ' + dir)
  } else {
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/cerveau'
    mkdirSync(dossier, { recursive: true })
    const ids = { ...LIBS, ...(arg('ids') ? JSON.parse(arg('ids')) : {}) }
    const k = lireCopie(), P = (n) => ids[n] || 'AposerXXXXXXXX'
    writeFileSync(path.join(dossier, 'lib-trier-demande.sdk.js'), sdkLib('lib-trier-demande', k, [P('presti-dep-accueil')].join(',')))
    writeFileSync(path.join(dossier, 'lib-lire-photo.sdk.js'), sdkLib('lib-lire-photo', k, [P('presti-dep-accueil')].join(',')))
    writeFileSync(path.join(dossier, 'presti-dep-accueil.sdk.js'), sdkAccueil(k, { ...ids, 'lib-trier-demande': P('lib-trier-demande'), 'lib-lire-photo': P('lib-lire-photo') }, [P('presti-cerveau'), P('presti-banc-cerveau')].join(',')))
    for (const d of DEPS.slice(1)) writeFileSync(path.join(dossier, `presti-dep-${d}.sdk.js`), sdkSquelette(d, P('presti-cerveau')))
    writeFileSync(path.join(dossier, 'presti-cerveau.sdk.js'), sdkCerveau(Object.fromEntries(DEPS.map((d) => [`presti-dep-${d}`, P(`presti-dep-${d}`)]).concat([['lib-journaliser', ids['lib-journaliser']], ['lib-battement', ids['lib-battement']]]))))
    writeFileSync(path.join(dossier, 'presti-banc-cerveau.sdk.js'), sdkBanc(P('presti-dep-accueil')))
    for (const f of readdirSync(dossier).filter((x) => x.endsWith('.sdk.js'))) writeFileSync(path.join(dossier, f), decouper(readFileSync(path.join(dossier, f), 'utf8')))
    console.log('SDK écrits dans ' + dossier)
  }
}
