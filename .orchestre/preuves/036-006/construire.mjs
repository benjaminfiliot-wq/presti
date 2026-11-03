// 036-006 — fabrique du département « Après-chantier et réputation » (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-006 du § 4,
// décisions 3 et 4 du § 5) : presti-dep-apres (le chef, déjà posé en squelette par 036-001, COMPLÉTÉ sur place pour garder son identifiant),
// lib-avis-lire (le lecteur d'avis, épinglé), lib-avis-repondre (le rédacteur et le « bureau d'approbation » : toujours une carte) et le banc
// presti-banc-apres. Reprend le bloc « Review Response » de la vidéo du 02/11 (fiches-videos-restructureai.md:363-368) : lecteur, rédacteur,
// « Approval Desk » avant « Reply Poster » — le « Reply Poster » n'est PAS construit : l'API des avis n'est pas accordée (décision 3).
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (aucune adresse ni numéro : les contrats sont « sans contact »).
// Mode A (comme 035-003 à 036-003) : tout est INACTIF, en simulation, sans identifiant ; les lectures sont ÉPINGLÉES et les écritures partent dans
// `effets_prevus`, jamais faites. Le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003.
//   node .orchestre/preuves/036-006/construire.mjs <dossier> [--ids=<json>]   → les programmes SDK (collés tels quels dans n8n) et les opérations du chef
//   node .orchestre/preuves/036-006/construire.mjs --contrats                 → plans/011-cadrage-01-11/p6-signature/contrats/apres.json
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie, CODE_BILAN } from '../035-003/construire.mjs'
import { reglagesEnfant } from '../036-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const CERVEAU = '596OC5mL2aMBq6SD' // presti-cerveau (036-001)
export const ID_CHEF = 'L3GOS7euxi60jCZN' // presti-dep-apres (036-001), complété sur place
export const ENFANTS = ['lib-avis-lire', 'lib-avis-repondre']
export const CHEF = 'presti-dep-apres'
export const BANC = 'presti-banc-apres'
export const VERSION_CONTRATS = '1.0.0'
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const JOUR = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const JOUR_N = { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const DATE_N = { type: ['string', 'null'], format: 'date-time' }
const BOOL = { type: 'boolean' }
const BOOL_LU = { type: ['boolean', 'null'] }
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const mots = { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 60 } }
const REF = { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,64}$' }
const CLE = { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_:.-]+$' }
const AVIS = objet({ ref: REF, artisan_id: UUID, source: { enum: ['colle', 'google'] }, auteur: { type: ['string', 'null'], maxLength: 70 }, note: { type: 'integer', minimum: 1, maximum: 5 },
  texte: { type: 'string', maxLength: 2000 }, date: DATE_N, client_connu: BOOL_LU })
const AVIS_LU = objet({ cle: CLE, ref: REF, source: { enum: ['colle', 'google'] }, auteur: { type: ['string', 'null'], maxLength: 70 }, note: { type: 'integer', minimum: 1, maximum: 5 },
  sentiment: { enum: ['negatif', 'positif'] }, motifs: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 60 } }, suspect: BOOL,
  motifs_suspicion: { type: 'array', maxItems: 4, items: { enum: ['client_inconnu', 'doublon_texte', 'rafale'] } }, texte: { type: 'string', maxLength: 2000 }, date: DATE_N })
const CONTACT = objet({ email_connu: BOOL, sms_consenti: BOOL_LU, opposition: BOOL_LU, stop: BOOL_LU, litige_en_cours: BOOL_LU, a_ecrit_depuis_fin: BOOL, ecrit_aujourdhui: BOOL })
const CHANTIER = objet({ id: UUID, artisan_id: UUID, titre: { type: ['string', 'null'], maxLength: 120 }, statut: { type: 'string', maxLength: 20 }, date_fin_reelle: JOUR_N,
  client_nom: { type: ['string', 'null'], maxLength: 70 }, textes: { type: 'array', maxItems: 10, items: { type: ['string', 'null'], maxLength: 200 } }, contact: CONTACT })
const REGLAGES = objet({ avis: BOOL, entretien: BOOL, actif_depuis: JOUR_N, texte_avis: { type: ['string', 'null'], maxLength: 1500 }, texte_entretien: { type: ['string', 'null'], maxLength: 1500 } })
const ARTISAN = objet({ nom: { type: 'string', maxLength: 70 } })
const CAPACITES = { type: 'array', maxItems: 60, items: { type: 'string', pattern: '^[a-z_.]{2,40}$' } }
const CONFORMITE = objet({ verdict: { enum: ['accepte', 'refuse', 'illisible'] } })
const DEJA = (nom) => ({ type: 'array', maxItems: 5000, items: objet({ artisan_id: UUID, cle: CLE }) })
export const SCHEMAS = {
  'lib-avis-lire': { sans_contact: true,
    config: objet({ interrupteur_general: BOOL, interrupteur_departement: BOOL, mots_escalade_artisan: mots }),
    donnees: objet({ avis: { type: 'array', maxItems: 100, items: AVIS }, deja_vus: DEJA('vus'), maintenant: DATE }) },
  'lib-avis-repondre': { sans_contact: true,
    config: objet({ offre: { enum: OFFRES }, interrupteur_general: BOOL, interrupteur_departement: BOOL, artisan: ARTISAN }),
    donnees: objet({ avis: AVIS_LU, artisan_id: UUID, brouillon: { type: ['object', 'null'], additionalProperties: false, required: ['texte', 'modele'], properties: { texte: { type: 'string', minLength: 1, maxLength: 1700 }, modele: { enum: ['claude-haiku-5-5'] } } },
      conformite: CONFORMITE, deja_cartes: DEJA('cartes'), maintenant: DATE }) },
  'presti-dep-apres': { sans_contact: true,
    // Le Cerveau (036-001) n'envoie aujourd'hui que { evenements } et une config vide : tout le reste est facultatif, et sans config le chef se tait (fail-closed).
    config: objet({ offre: { enum: OFFRES }, capacites: CAPACITES, interrupteur_general: BOOL, interrupteur_departement: BOOL, artisan: ARTISAN, reglages: REGLAGES, mots_escalade_artisan: mots }, []),
    donnees: objet({ evenements: { type: 'array', maxItems: 200, items: { type: 'object' } }, chantiers: { type: 'array', maxItems: 300, items: CHANTIER }, cles_existantes: { type: 'array', maxItems: 3000, items: { type: 'string', maxLength: 80 } },
      deja_demandes_aujourdhui: { type: 'integer', minimum: 0, maximum: 1000 }, jour: JOUR, maintenant: DATE, avis: { type: 'array', maxItems: 100, items: AVIS }, avis_deja_vus: DEJA('vus'),
      brouillons_avis: { type: 'array', maxItems: 100, items: objet({ ref: REF, texte: { type: 'string', minLength: 1, maxLength: 1700 }, modele: { enum: ['claude-haiku-5-5'] } }) },
      conformites_avis: { type: 'array', maxItems: 100, items: objet({ ref: REF, verdict: CONFORMITE.properties.verdict }) }, cartes_avis_existantes: DEJA('cartes') }, ['evenements']) },
}
export const EFFETS = {
  'lib-avis-lire': ['noter_evenement'],
  'lib-avis-repondre': ['preparer_carte', 'noter_evenement'],
  'presti-dep-apres': ['preparer_carte_lot', 'preparer_carte', 'noter_evenement'],
}
// Les effets permis au chef : une liste fermée (« Reply Poster » absent ; aucun effet d'envoi, de publication ni de paiement).
export const EFFETS_PERMIS = ['preparer_carte_lot', 'preparer_carte', 'noter_evenement']
export const MOTIFS_EXCLUSION = ['oppose', 'stop', 'consentement_illisible', 'litige', 'litige_illisible', 'deja_ecrit_aujourdhui', 'aucun_canal_consenti', 'texte_refuse']
export const MOTS_LITIGE = ['litige', 'avocat', 'plainte', 'tribunal', 'arnaque', 'escroc', 'mise en demeure', 'rembours', 'malfaçon', 'vice caché', 'dgccrf', 'justice', 'huissier', 'menaç', 'préjudice', 'dédommag', 'indemni', 'conteste']
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-006',
    source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-006 du § 4 et décisions 3 et 4 du § 5 ; lib/apresChantier.ts ; lib/apresChantierTour.ts ; lib/pilote/regles.ts ; lib/sms/',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Contrats « sans contact » : aucune adresse e-mail ni aucun numéro n’entre dans ces workflows (le canal est un drapeau ; le lien sms: est assemblé par l’application). Toute ligne lue porte artisan_id et doit être celle du compte (« Supabase account » passe outre la RLS).' }
  return { 'apres.json': { ...base, titre: 'presti-dep-apres@1 — le département Après-chantier et réputation',
    chef: { workflow: CHEF, id_n8n: ID_CHEF, appele_par: 'presti-cerveau (événement chantier_termine, 036-001) ; presti-banc-apres',
      entree: { config: SCHEMAS[CHEF].config, donnees: SCHEMAS[CHEF].donnees },
      ce_que_le_cerveau_doit_ajouter: 'Le Cerveau (036-001) n’envoie aujourd’hui que { evenements } et une config vide : le chef se tait (motif config_absente). Au lot 036-012, ses constructeurs CONFIG.apres et DONNEES.apres doivent lire (vues étroites, filtre artisan_id) : offre, capacités, interrupteurs, réglages de crm_apres_chantier, chantiers terminés (sans coordonnées : seulement les drapeaux de consentement), clés des rappels déjà posés, avis collés ou lus.',
      sortie: { statut: ['ok', 'rien_a_faire', 'rejete', 'refuse', 'erreur'], resultat: ['departement', 'demandes_avis', 'entretiens', 'avis', 'cartes', 'parti_seul', 'propositions'] },
      effets_prevus: EFFETS[CHEF], effets_interdits: ['tout envoi', 'toute publication', 'tout paiement', 'toute écriture sur la fiche Google'],
      exclusions_de_lot: MOTIFS_EXCLUSION, consentement: { email: 'canal consenti si l’adresse est connue du client (drapeau email_connu) et sans opposition ni STOP', sms_lien: 'seulement si sms_consenti est vrai (décision 4) ; lien sms: ouvert d’un geste par l’artisan (lib/sms/lien.ts:10)', illisible: 'une opposition ou un STOP illisible (null) vaut exclusion' } },
    enfants: Object.fromEntries(ENFANTS.map((n) => [`${n}@1`, { config: SCHEMAS[n].config, donnees: SCHEMAS[n].donnees, effets_prevus: EFFETS[n] }])),
    sentiment: { negatif: 'note de 3 ou moins, OU un mot de litige (copie figée d’une partie de MOTS_ESCALADE_TOUJOURS, comparée au code), OU un mot de l’artisan', positif: 'le reste' },
    faux_avis: { signaux: ['client_inconnu', 'doublon_texte', 'rafale'], regle: 'Un avis suspect est SIGNALÉ à l’artisan, jamais accusé : carte « avis suspect », pas de brouillon, l’artisan décide de le signaler à Google lui-même.' },
    avis_et_publication: { negatif: 'toujours une carte, quelle que soit l’offre, le mode ou le pilote', positif: 'une carte aussi, tant que Benj n’a pas accepté le type (hors de la liste fermée OUTIL_TYPE)', publication: 'apres_clic_artisan, toujours' },
    studio_signature: { studio: 'carte de lot et cartes de réponse (À valider)', signature: 'identique : demander_avis n’est pas exécutable par le pilote (lib/pilote/regles.ts:70) ; aucune réponse à un avis ne part seule' } } }
}

// ─── Les nœuds Code ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUES = {
  // Les lignes que le juge mute (un mutant = une ligne retirée ou changée) : elles doivent exister à l'identique, sinon le juge le dit.
  isolation_lire: "if (d.avis.some((a) => a.artisan_id !== org) || d.deja_vus.some((x) => x.artisan_id !== org)) {",
  isolation_repondre: "if (d.artisan_id !== org) {",
  deja_vu: "if (vus.has(cle)) { ignores.deja_vu++; continue; }",
  negatif: "const litige = litigeDe(a.texte, c.mots_escalade_artisan); const negatif = a.note <= 3 || litige !== null;",
  suspicion: "const suspect = motifsSuspicion.length > 0;",
  client_inconnu: "if (a.client_connu === false) motifsSuspicion.push('client_inconnu');",
  publication: "publication: 'apres_clic_artisan'",
  marque: "if (/presti/i.test(t)) return 'marque';",
  stop: "if (ct.stop === true) return { motif: 'stop' };",
  opposition: "if (ct.opposition === true) return { motif: 'oppose' };",
  litige: "if (ct.litige_en_cours === true) return { motif: 'litige' };",
  consentement: "return { motif: 'aucun_canal_consenti' };",
  illisible: "if (ct.opposition === null || ct.stop === null) return { motif: 'consentement_illisible' };",
  plafond_jour: "const reste = Math.max(0, MAX_PAR_COMPTE_JOUR - (d.deja_demandes_aujourdhui || 0));",
  capacite_crm: "const crm = Array.isArray(c.capacites) && c.capacites.includes('crm');",
  isolation_chef: "if (chantiers.some((x) => x.artisan_id !== org) || avis.some((x) => x.artisan_id !== org)) {",
  rappel: "const dues = props.filter((p) => p.echeance <= jour);",
  effets_permis: "const permis = ['preparer_carte_lot', 'preparer_carte', 'noter_evenement'];",
}
const AIDES_TEXTE = String.raw`const sansAccents = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const enMots = (s) => ' ' + sansAccents(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';`
const LIEN = String.raw`const LIEN = /https?:\/\/|www\.|(?<![@\w.-])[a-z0-9-]+\.(?:fr|com|net|org|io|app|eu|be|ch)\b/i;`

export const CODE_LIRE = String.raw`// lib-avis-lire (036-006 ; A18, décision 3) : le lecteur d'avis. Mode A : l'avis est COLLÉ (ou transféré) par l'artisan, ou serait lu sur la fiche
// Google quand l'accès à l'API sera accordé (nœud Google Business Profile, review : getAll — décrit dans connecteurs/fiche-google.md, JAMAIS posé ici).
// Il CLASSE, il ne répond pas : négatif (note de 3 ou moins, mot de litige) ou positif ; il SIGNALE un avis suspect (client inconnu, texte copié,
// rafale) sans jamais l'accuser ; chaque avis n'entre qu'UNE fois (clé de compte). Aucun modèle, aucun secret, aucune donnée de contact.
// Copie figée d'une partie de MOTS_ESCALADE_TOUJOURS (lib/pilote/regles.ts), comparée au code par scripts/apres-reputation-n8n-qa.mjs.
const MOTS_LITIGE = ` + J(MOTS_LITIGE) + String.raw`;
` + AIDES_TEXTE + String.raw`
const LITIGE = MOTS_LITIGE.map((m) => [m, enMots(m).trim()]);
function litigeDe(texte, motsArtisan) {
  const mots = enMots(texte);
  for (const [m, k] of LITIGE) if (k && mots.includes(' ' + k)) return m;
  const nu = sansAccents(texte);
  for (const m of Array.isArray(motsArtisan) ? motsArtisan : []) { const k = sansAccents(m).trim(); if (typeof m === 'string' && k && nu.includes(k)) return m; }
  return null;
}
const DEUX_HEURES = 2 * 3600000;
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'lib-avis-lire', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    ` + MARQUES.isolation_lire + String.raw`
      return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['autre_compte : un avis ou une ligne lue n’est pas celle de ce compte'],
        journal: [ligne('lecture_refusee', null, 'autre_compte : rien n’est classé')] };
    }
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) {
      return { ...j, statut: 'rien_a_faire', resultat: { avis: [], a_repondre: false, silence: true, ignores: { deja_vu: 0, doublon: 0 }, negatifs: 0, suspects: 0 }, effets_prevus: [], journal: [ligne('lecture_silencieuse', null, 'interrupteur coupé : le département se tait')] };
    }
    const vus = new Set(d.deja_vus.map((x) => x.cle));
    const ignores = { deja_vu: 0, doublon: 0 };
    const retenus = [], dans = new Set();
    for (const a of d.avis) {
      const cle = 'av:' + a.source.slice(0, 3) + ':' + a.ref;
      ` + MARQUES.deja_vu + String.raw`
      if (dans.has(cle)) { ignores.doublon++; continue; }
      dans.add(cle);
      retenus.push({ a: a, cle: cle });
    }
    const normalises = retenus.map((x) => enMots(x.a.texte).trim());
    const classes = [], effets = [], journal = [];
    retenus.forEach((x, i) => {
      const a = x.a;
      const ligneAvis = { cle: x.cle, ref: a.ref, source: a.source, auteur: a.auteur, note: a.note, texte: a.texte, date: a.date };
      ` + MARQUES.negatif + String.raw`
      const motifs = [];
      if (a.note <= 3) motifs.push('note_basse');
      if (litige !== null) motifs.push('litige:' + litige);
      const motifsSuspicion = [];
      ` + MARQUES.client_inconnu + String.raw`
      if (normalises[i].length >= 15 && normalises.some((t, k) => k !== i && t === normalises[i])) motifsSuspicion.push('doublon_texte');
      if (a.date && retenus.filter((y) => y.a.date && y.a.note === a.note && Math.abs(Date.parse(y.a.date) - Date.parse(a.date)) <= DEUX_HEURES).length >= 3) motifsSuspicion.push('rafale');
      ` + MARQUES.suspicion + String.raw`
      classes.push({ cle: ligneAvis.cle, ref: ligneAvis.ref, source: ligneAvis.source, auteur: ligneAvis.auteur, note: ligneAvis.note, sentiment: negatif ? 'negatif' : 'positif', motifs: motifs, suspect: suspect, motifs_suspicion: motifsSuspicion, texte: ligneAvis.texte, date: ligneAvis.date });
      effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'avis_recu', cle: x.cle, faits: { source: a.source, note: a.note, sentiment: negatif ? 'negatif' : 'positif', suspect: suspect } });
      journal.push(ligne('avis_classe', x.cle, (negatif ? 'négatif' : 'positif') + (suspect ? ', suspect (' + motifsSuspicion.join(', ') + ')' : '') + ' : rien n’est publié'));
    });
    classes.sort((p, q) => (q.sentiment === 'negatif') - (p.sentiment === 'negatif'));
    const negatifs = classes.filter((x) => x.sentiment === 'negatif').length, suspects = classes.filter((x) => x.suspect).length;
    journal.unshift(ligne('lecture_avis', null, classes.length + ' avis classé(s), ' + negatifs + ' négatif(s), ' + suspects + ' suspect(s), ' + ignores.deja_vu + ' déjà vu(s)'));
    return { ...j, statut: classes.length ? 'ok' : 'rien_a_faire', resultat: { avis: classes, a_repondre: classes.length > 0, silence: false, ignores: ignores, negatifs: negatifs, suspects: suspects }, effets_prevus: effets, journal: journal.slice(0, 200) };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, erreurs: ['lecture des avis : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_REPONDRE = String.raw`// lib-avis-repondre (036-006 ; A18, décision 3) : le rédacteur ET le « bureau d'approbation » (Approval Desk) avant le « Reply Poster », qui n'existe pas ici.
// Tout avis, négatif, positif ou suspect, devient UNE CARTE « À valider » : rien n'est publié, quelle que soit l'offre (Studio, Signature), le mode ou le pilote.
// Un avis négatif est toujours à l'artisan ; un avis positif aussi tant que Benj n'a pas accepté ce type (hors de la liste fermée OUTIL_TYPE, lib/pilote/regles.ts).
// Le brouillon vient d'un modèle ÉPINGLÉ (jamais appelé) ; il est revalidé ici : ni « Presti », ni lien, ni montant, ni promesse, ni le nom du client.
// Un brouillon refusé, ou une porte de conformité qui n'a pas accepté, laisse la carte SANS brouillon : l'artisan écrit lui-même.
` + AIDES_TEXTE + '\n' + LIEN + String.raw`
const PROMESSE = /rembours|dedommag|indemn|geste commercial|compensation|garantie a vie/;
function verifierBrouillon(texte, avis) {
  const t = String(texte).trim();
  if (t.length < 20) return 'trop_court';
  if (t.length > 900) return 'trop_long';
  ` + MARQUES.marque + String.raw`
  if (LIEN.test(t)) return 'lien';
  if (/\d\s*(€|eur\b|euros?\b)|€/i.test(t)) return 'montant';
  if (PROMESSE.test(sansAccents(t))) return 'promesse';
  if (avis.auteur && sansAccents(avis.auteur).trim().length >= 3 && sansAccents(t).includes(sansAccents(avis.auteur).trim())) return 'nom_du_client';
  return null;
}
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const a = d.avis;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'lib-avis-repondre', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    ` + MARQUES.isolation_repondre + String.raw`
      return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['autre_compte : l’avis n’est pas celui de ce compte'], journal: [ligne('reponse_refusee', a.cle, 'autre_compte')] };
    }
    if (d.deja_cartes.some((x) => x.artisan_id !== org)) return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['autre_compte : une carte lue n’est pas celle de ce compte'], journal: [ligne('reponse_refusee', a.cle, 'autre_compte')] };
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { carte: false, motif: 'interrupteur' }, effets_prevus: [], journal: [ligne('reponse_saute', a.cle, 'interrupteur coupé : le département se tait')] };
    const cle = 'ra:' + a.cle.slice(3);
    if (d.deja_cartes.some((x) => x.cle === cle)) return { ...j, statut: 'rien_a_faire', resultat: { carte: false, motif: 'deja_cartee' }, effets_prevus: [], journal: [ligne('reponse_saute', cle, 'carte déjà posée : rien à refaire')] };
    const pourquoi = a.suspect ? 'avis_suspect' : a.sentiment === 'negatif' ? 'avis_negatif' : 'positif_type_non_accepte';
    let brouillon = null, motifBrouillon = null;
    if (a.suspect) motifBrouillon = 'avis_suspect';
    else if (d.brouillon === null) motifBrouillon = 'aucun_brouillon';
    else if (d.conformite.verdict !== 'accepte') motifBrouillon = 'conformite';
    else { motifBrouillon = verifierBrouillon(d.brouillon.texte, a); if (motifBrouillon === null) brouillon = d.brouillon.texte.trim(); }
    const effets = [
      { effet: 'preparer_carte', organisation_id: org, cle: cle, type: 'reponse_avis', pourquoi: pourquoi, avis_cle: a.cle, note: a.note, sentiment: a.sentiment, suspect: a.suspect,
        motifs: a.motifs.concat(a.motifs_suspicion), brouillon: brouillon, motif_brouillon: motifBrouillon, ` + MARQUES.publication + String.raw`, priorite: a.sentiment === 'negatif' ? 'haute' : 'normale',
        si_suspect: a.suspect ? 'a_signaler_a_google_par_l_artisan' : null },
      { effet: 'noter_evenement', organisation_id: org, type: 'carte_reponse_avis', cle: cle, faits: { sentiment: a.sentiment, suspect: a.suspect, brouillon: brouillon !== null } },
    ];
    return { ...j, statut: 'ok', resultat: { carte: true, pourquoi: pourquoi, brouillon: brouillon !== null, motif_brouillon: motifBrouillon, offre: c.offre, part_seul: false, cle: cle }, effets_prevus: effets,
      journal: [ligne('carte_reponse_avis', cle, pourquoi + (brouillon !== null ? ', brouillon revalidé' : ', sans brouillon (' + motifBrouillon + ')') + ' : à valider par l’artisan, rien n’est publié')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, erreurs: ['réponse à un avis : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

// Le chef — quatre nœuds Code : A (les demandes d'avis et les rappels), B (prépare la lecture), C (prépare les réponses), E (assemble).
const NOM_A = "Demandes d'avis et rappels d'entretien"
const NOM_LIRE = 'Appeler lib-avis-lire'
const NOM_REP = 'Appeler lib-avis-repondre'
export const CHEF_CODE = {
  [NOM_A]: String.raw`// presti-dep-apres (036-006 ; A18, B8, décision 4) : la demande d'avis par un canal CONSENTI, et le rappel d'entretien PROPOSÉ. Rien ne part : une carte de lot
// (qui reçoit, qui est exclu et pourquoi) et des cartes d'entretien (la date proposée), toutes « À valider », en Studio comme en Signature (demander_avis n'est pas
// exécutable par le pilote : lib/pilote/regles.ts:70). Le calcul des propositions est REFAIT depuis lib/apresChantier.ts (propositions), comparé au code par le juge.
// Consentement (fail-closed) : opposition, STOP, litige en cours, ou lecture illisible (null) = exclu ; e-mail connu du client, ou SMS consenti (lien sms: ouvert
// d'un geste par l'artisan, lib/sms/lien.ts:10). Les contrats sont sans contact : le chef ne voit que des drapeaux, jamais une adresse ni un numéro.
const DELAI_AVIS_JOURS = 2, RATTRAPAGE_JOURS = 14, PREAVIS_JOURS = 15, ENTRETIEN_ANS_MAX = 3, MAX_PAR_COMPTE_JOUR = 10, MAX_POSES_PAR_PASSAGE = 20;
const EQUIPEMENTS = [
  { nom: 'chaudière', mois: 12, motif: /chaudi[eè]re/i },
  { nom: 'pompe à chaleur', mois: 24, motif: /pompe\s+[àa]\s+chaleur|\bPAC\b/ },
  { nom: 'conduit de fumée', mois: 12, motif: /ramonage|po[êe]le|chemin[ée]e|insert\b|conduit de fum/i },
];
const TEXTE_DEFAUT = {
  avis: 'Bonjour {client},\n\nMerci de nous avoir fait confiance pour « {chantier} ». Votre avis sur notre fiche en ligne, quel qu’il soit, nous intéresse et aide les prochains clients à se décider.\n\nPour toute question sur le chantier, répondez simplement à ce message.\n\n{artisan}',
  entretien: 'Bonjour {client},\n\nNous sommes intervenus chez vous pour « {chantier} ». L’entretien de votre {equipement} arrive bientôt : voulez-vous que nous convenions d’une date ? Répondez simplement à ce message.\n\n{artisan}',
};
const VARIABLES = ['client', 'chantier', 'artisan', 'equipement'];
` + LIEN + String.raw`
function erreurTexte(t) {
  const s = String(t).trim();
  if (s.length < 20 || s.length > 1500) return 'longueur';
  if (LIEN.test(s)) return 'lien';
  for (const m of s.matchAll(/\{([^{}]*)\}/g)) if (!VARIABLES.includes(m[1])) return 'variable';
  if (/[{}]/.test(s.replace(/\{[a-z]+\}/g, ''))) return 'accolades';
  return null;
}
const remplir = (modele, v) => modele.replace(/\{([a-z]+)\}/g, (m, k) => (VARIABLES.includes(k) ? v[k] : m));
const jourMs = (j) => Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10));
const ajouterJours = (j, n) => new Date(jourMs(j) + n * 86400000).toISOString().slice(0, 10);
function ajouterMois(j, n) {
  const a = +j.slice(0, 4), m = +j.slice(5, 7) - 1 + n, dd = +j.slice(8, 10);
  const an = a + Math.floor(m / 12), mo = ((m % 12) + 12) % 12;
  const dernier = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(an, mo, Math.min(dd, dernier))).toISOString().slice(0, 10);
}
function equipementDe(textes) {
  const s = textes.filter(Boolean).join(' \n ');
  const eq = EQUIPEMENTS.find((x) => x.motif.test(s));
  return eq ? { nom: eq.nom, mois: eq.mois } : null;
}
const finDe = (ch) => (ch.statut === 'termine' && ch.date_fin_reelle && /^\d{4}-\d{2}-\d{2}$/.test(String(ch.date_fin_reelle).slice(0, 10)) ? String(ch.date_fin_reelle).slice(0, 10) : null);
function propositionsDe(chantiers, reglages, existantes, jour) {
  if (!reglages.avis && !reglages.entretien) return [];
  const activation = String(reglages.actif_depuis || '').slice(0, 10) || jour;
  const out = [];
  for (const ch of chantiers) {
    const fin = finDe(ch);
    if (!fin || fin > jour) continue;
    if (reglages.avis && fin >= ajouterJours(activation, -RATTRAPAGE_JOURS)) {
      const cle = 'avis:' + ch.id;
      if (!existantes.has(cle)) { const due = ajouterJours(fin, DELAI_AVIS_JOURS); out.push({ cle: cle, chantier: ch, fin: fin, type: 'demande_avis', echeance: due > jour ? due : jour }); }
    }
    const eq = reglages.entretien ? equipementDe([ch.titre].concat(ch.textes || [])) : null;
    if (eq && fin >= ajouterMois(jour, -12 * ENTRETIEN_ANS_MAX)) {
      let n = 1;
      while (ajouterJours(ajouterMois(fin, n * eq.mois), -PREAVIS_JOURS) < jour && n < 100) n++;
      const cle = 'entretien:' + ch.id + ':' + n;
      if (!existantes.has(cle) && ![...existantes].some((k) => k.startsWith('entretien:' + ch.id + ':') && Number(k.split(':')[2]) >= n)) {
        out.push({ cle: cle, chantier: ch, fin: fin, type: 'entretien', n: n, eq: eq, echeance: ajouterJours(ajouterMois(fin, n * eq.mois), -PREAVIS_JOURS) });
      }
    }
  }
  return out;
}
function consentement(ct) {
  ` + MARQUES.opposition + String.raw`
  ` + MARQUES.stop + String.raw`
  ` + MARQUES.illisible + String.raw`
  ` + MARQUES.litige + String.raw`
  if (ct.litige_en_cours === null) return { motif: 'litige_illisible' };
  if (ct.ecrit_aujourdhui === true) return { motif: 'deja_ecrit_aujourdhui' };
  if (ct.email_connu === true) return { canal: 'email' };
  if (ct.sms_consenti === true) return { canal: 'sms_lien' };
  ` + MARQUES.consentement + String.raw`
}
// Le SMS préparé (étape 0, gratuite) : mêmes règles de texte que lib/sms/encodage.ts (STOP, GSM-7 pur, un segment, ni lien, ni montant, ni menace) — comparées au code par le juge.
const GSM_BASE = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const MENACES = /(huissier|contentieux|poursuite|mise en demeure|recouvrement|tribunal|justice|saisie|p[ée]nalit[ée]|majoration|derni[eè]re chance|sans r[ée]ponse de votre part|urgent|sous 24|avocat|plainte)/i;
function refusSms(t) {
  if (typeof t !== 'string' || t.trim() === '') return 'vide';
  if (!/(^|[^A-Za-z0-9])stop($|[^A-Za-z0-9])/i.test(t)) return 'stop_absent';
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(fr|com|net|org|io|app|me|ly|co|eu|info|biz)\b|\bbit\.ly\b)/i.test(t)) return 'lien';
  if (/(\d\s*(€|eur\b|euros?\b)|€\s*\d|€)/i.test(t)) return 'montant';
  if (MENACES.test(t)) return 'menace';
  if (!Array.from(t).every((x) => GSM_BASE.includes(x))) return 'non_gsm7';
  if (Array.from(t).length > 160) return 'trop_long';
  return null;
}
function texteSms(genre, v) {
  const qui = v.client === 'Madame, Monsieur' ? 'Bonjour' : 'Bonjour ' + v.client;
  return genre === 'avis'
    ? qui + ', merci de votre confiance. Votre avis nous aiderait : repondez-nous ici. ' + v.artisan + '. STOP pour ne plus recevoir'
    : qui + ", l'entretien de votre " + v.equipement + ' approche : une date ? Repondez-nous ici. ' + v.artisan + '. STOP pour ne plus recevoir';
}
function traiter(j) {
  const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
  const journal = [], effets = [];
  const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'presti-dep-apres', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
  const etat = (arret, statut) => ({ ...j, apres: { arret: arret, statut: statut, effets: effets, journal: journal, propositions: [], stats: { dues_avis: 0, destinataires: 0, exclus: {}, reportes: 0, entretiens_dus: 0, entretiens_cartes: 0, entretiens_exclus: {} } } });
  const chantiers = d.chantiers || [], avis = d.avis || [];
  ` + MARQUES.isolation_chef + String.raw`
    journal.push(ligne('departement_refuse', null, 'autre_compte : un chantier ou un avis lu n’est pas celui de ce compte, rien n’est traité'));
    return etat('autre_compte', 'refuse');
  }
  if (c.interrupteur_general === undefined || c.interrupteur_departement === undefined) { journal.push(ligne('departement_silencieux', null, 'config absente : le Cerveau n’a pas encore transmis la configuration, le département se tait')); return etat('config_absente', 'rien_a_faire'); }
  if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) { journal.push(ligne('departement_silencieux', null, 'interrupteur coupé : le département se tait')); return etat('interrupteur', 'rien_a_faire'); }
  if (!d.maintenant || !d.jour) { journal.push(ligne('departement_silencieux', null, 'horloge absente : rien n’est calculé')); return etat('horloge_absente', 'rien_a_faire'); }
  const jour = d.jour;
  ` + MARQUES.capacite_crm + String.raw`
  const reglages = c.reglages || { avis: false, entretien: false, actif_depuis: null, texte_avis: null, texte_entretien: null };
  const nomArtisan = (c.artisan && c.artisan.nom) || '';
  const existantes = new Set(d.cles_existantes || []);
  const etatSortie = etat(null, 'rien_a_faire');
  const stats = etatSortie.apres.stats;
  if (!crm || (!reglages.avis && !reglages.entretien)) {
    journal.push(ligne('apres_chantier_saute', null, !crm ? 'l’offre ne porte pas le CRM : ni demande d’avis ni rappel d’entretien (comme le passage quotidien)' : 'réglages désactivés : rien n’est proposé (désactivé par défaut)'));
    return etatSortie;
  }
  const props = propositionsDe(chantiers, reglages, existantes, jour).sort((p, q) => p.echeance.localeCompare(q.echeance)).slice(0, MAX_POSES_PAR_PASSAGE);
  etatSortie.apres.propositions = props.map((p) => ({ cle: p.cle, chantier_id: p.chantier.id, type: p.type, echeance: p.echeance }));
  ` + MARQUES.rappel + String.raw`
  const texteChoisi = (genre) => { const propre = (genre === 'avis' ? reglages.texte_avis : reglages.texte_entretien) || ''; return propre.trim() && erreurTexte(propre) === null ? propre.trim() : TEXTE_DEFAUT[genre]; };
  const variables = (ch, eq) => ({ client: (ch.client_nom && ch.client_nom.trim()) || 'Madame, Monsieur', chantier: (ch.titre && ch.titre.trim()) || 'votre chantier', artisan: nomArtisan, equipement: eq ? eq.nom : 'installation' });
  function contenu(genre, ch, eq, canal) {
    const v = variables(ch, eq);
    const t = canal === 'sms_lien' ? texteSms(genre, v) : remplir(texteChoisi(genre), v);
    const refus = canal === 'sms_lien' ? refusSms(t) : (erreurTexte(t) || (LIEN.test(t) ? 'lien' : null));
    return refus ? { refus: refus } : { texte: t };
  }
  // 1 — la demande d'avis : un lot, avec ses exclus.
  const destinataires = [], exclus = [];
  ` + MARQUES.plafond_jour + String.raw`
  let reportes = 0;
  if (reglages.avis) {
    for (const p of dues.filter((x) => x.type === 'demande_avis')) {
      stats.dues_avis++;
      const ct = consentement(p.chantier.contact);
      if (ct.motif) { exclus.push({ chantier_id: p.chantier.id, motif: ct.motif }); stats.exclus[ct.motif] = (stats.exclus[ct.motif] || 0) + 1; continue; }
      const t = contenu('avis', p.chantier, null, ct.canal);
      if (t.refus) { exclus.push({ chantier_id: p.chantier.id, motif: 'texte_refuse' }); stats.exclus.texte_refuse = (stats.exclus.texte_refuse || 0) + 1; continue; }
      if (destinataires.length >= reste) { reportes++; continue; }
      destinataires.push({ chantier_id: p.chantier.id, cle: p.cle, canal: ct.canal, texte: t.texte, echeance: p.echeance, a_ecrit_depuis_fin: p.chantier.contact.a_ecrit_depuis_fin });
    }
    stats.destinataires = destinataires.length; stats.reportes = reportes;
    if (destinataires.length) effets.push({ effet: 'preparer_carte_lot', organisation_id: org, cle: 'lot-avis:' + jour, type: 'demande_avis_lot', destinataires: destinataires, exclus: exclus, reportes: reportes, part_seul: false, publication: 'apres_clic_artisan', pied: 'PIED_APRES' });
    if (destinataires.length || exclus.length) journal.push(ligne('lot_demande_avis', 'lot-avis:' + jour, destinataires.length + ' destinataire(s), ' + exclus.length + ' exclu(s), ' + reportes + ' reporté(s) à demain : ' + (destinataires.length ? 'carte de lot à valider, rien ne part' : 'aucun destinataire, pas de carte')));
  }
  // 2 — le rappel d'entretien : la date est proposée, jamais envoyée seule.
  if (reglages.entretien) {
    for (const p of dues.filter((x) => x.type === 'entretien')) {
      stats.entretiens_dus++;
      const ct = consentement(p.chantier.contact);
      if (ct.motif) { stats.entretiens_exclus[ct.motif] = (stats.entretiens_exclus[ct.motif] || 0) + 1; journal.push(ligne('entretien_exclu', p.chantier.id, ct.motif)); continue; }
      const t = contenu('entretien', p.chantier, p.eq, ct.canal);
      if (t.refus) { stats.entretiens_exclus.texte_refuse = (stats.entretiens_exclus.texte_refuse || 0) + 1; continue; }
      stats.entretiens_cartes++;
      effets.push({ effet: 'preparer_carte', organisation_id: org, cle: p.cle, type: 'rappel_entretien', chantier_id: p.chantier.id, equipement: p.eq.nom, date_proposee: ajouterMois(p.fin, p.n * p.eq.mois), canal: ct.canal, texte: t.texte, part_seul: false, publication: 'apres_clic_artisan', pied: 'PIED_APRES' });
      journal.push(ligne('rappel_entretien', p.cle, 'date proposée ' + ajouterMois(p.fin, p.n * p.eq.mois) + ' (' + p.eq.nom + ') : carte à valider, jamais envoyée seule'));
    }
  }
  etatSortie.apres.statut = effets.length ? 'ok' : 'rien_a_faire';
  return etatSortie;
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`,
  'Préparer la lecture des avis': String.raw`// presti-dep-apres → lib-avis-lire@1 : une enveloppe. Les avis lus ne dépendent que de l'offre (capacité « assistant », Studio et Signature) et des interrupteurs ;
// quand le département se tait, la liste envoyée est vide et l'enfant le redit.
const A = $input.first().json;
const e = A.enveloppe, c = e.config, d = e.donnees, org = e.organisation_id;
const peut = Array.isArray(c.capacites) && c.capacites.includes('assistant');
const lecture = !A.apres.arret && peut;
return [{ json: { contrat: 'lib-avis-lire@1', organisation_id: org, simulation: true, cle_idempotence: ('lire:' + (d.jour || 'inconnu') + ':' + org.slice(0, 8)).slice(0, 80),
  trace: { execution_parent: 'presti-dep-apres:' + (d.jour || 'inconnu'), declencheur: 'presti-dep-apres', tentative: 0 },
  config: { interrupteur_general: c.interrupteur_general === true && !A.apres.arret, interrupteur_departement: c.interrupteur_departement === true && peut, mots_escalade_artisan: c.mots_escalade_artisan || [] },
  donnees: { avis: lecture ? (d.avis || []) : [], deja_vus: d.avis_deja_vus || [], maintenant: d.maintenant || '2026-01-01T00:00:00.000Z' } } }];`,
  'Préparer les réponses aux avis': String.raw`// presti-dep-apres → lib-avis-repondre@1 : une enveloppe par avis classé. Le brouillon vient du modèle ÉPINGLÉ (donnees.brouillons_avis, jamais appelé ici) ;
// le verdict de la porte de conformité (donnees.conformites_avis) manquant vaut « illisible » : une lecture en erreur vaut refus.
const A = $("Demandes d'avis et rappels d'entretien").first().json;
const e = A.enveloppe, c = e.config, d = e.donnees, org = e.organisation_id;
const lu = $input.first().json;
const avis = lu && lu.contrat === 'lib-avis-lire@1' && lu.resultat && Array.isArray(lu.resultat.avis) ? lu.resultat.avis : [];
return avis.map((a) => {
  const br = (d.brouillons_avis || []).find((x) => x.ref === a.ref);
  const cf = (d.conformites_avis || []).find((x) => x.ref === a.ref);
  return { json: { contrat: 'lib-avis-repondre@1', organisation_id: org, simulation: true, cle_idempotence: ('repondre:' + a.cle).slice(0, 80),
    trace: { execution_parent: 'presti-dep-apres:' + (d.jour || 'inconnu'), declencheur: 'presti-dep-apres', tentative: 0 },
    config: { offre: c.offre || 'essai', interrupteur_general: c.interrupteur_general === true, interrupteur_departement: c.interrupteur_departement === true, artisan: { nom: (c.artisan && c.artisan.nom) || '' } },
    donnees: { avis: a, artisan_id: org, brouillon: br ? { texte: br.texte, modele: br.modele } : null, conformite: { verdict: cf ? cf.verdict : 'illisible' }, deja_cartes: d.cartes_avis_existantes || [], maintenant: d.maintenant } } };
});`,
  'Assembler le département': String.raw`// presti-dep-apres : l'assemblage. Il reprend l'état du chef (demandes d'avis, rappels), la lecture des avis et les cartes de réponse, et rend UN seul
// résultat au Cerveau. Garde finale : un effet hors de la liste fermée (aucun envoi, aucune publication, aucun paiement) fait refuser tout le département.
const A = $("Demandes d'avis et rappels d'entretien").first().json;
const e = A.enveloppe, sim = e.simulation === true;
const lire = $("Appeler lib-avis-lire").isExecuted ? $("Appeler lib-avis-lire").first().json : null;
const reps = $("Appeler lib-avis-repondre").isExecuted ? $("Appeler lib-avis-repondre").all().map((x) => x.json) : [];
` + MARQUES.effets_permis + String.raw`
const erreurs = [], journal = A.apres.journal.slice(), effets = A.apres.effets.slice();
const enfant = (s, nom) => { if (!s || typeof s.statut !== 'string') { erreurs.push(nom + ' : appel en erreur'); return; } if (s.statut === 'rejete' || s.statut === 'erreur') erreurs.push(nom + ' : ' + s.statut); for (const f of Array.isArray(s.effets_prevus) ? s.effets_prevus : []) effets.push(f); for (const l of Array.isArray(s.journal) ? s.journal : []) journal.push(l); };
let negatifs = 0, suspects = 0, cartesAvis = 0, recus = 0;
if (lire) { enfant(lire, 'lib-avis-lire'); if (lire.resultat) { negatifs = lire.resultat.negatifs || 0; suspects = lire.resultat.suspects || 0; recus = lire.resultat.avis.length; } }
for (const r of reps) { enfant(r, 'lib-avis-repondre'); if (r && r.resultat && r.resultat.carte === true) cartesAvis++; }
if (effets.some((f) => !permis.includes(f.effet) || (f.effet !== 'noter_evenement' && f.publication !== 'apres_clic_artisan'))) {
  return [{ json: { enveloppe: e, statut: 'refuse', resultat: null, effets_prevus: [], effets_faits: [], erreurs: ['effet interdit : seules des cartes à valider sont permises'], journal: journal.concat([{ evenement: 'departement_refuse', agent: 'presti-dep-apres', objet_ref: null, decision: 'effet hors de la liste fermée : rien n’est prévu', simulation: sim }]).slice(0, 200) } }];
}
const cartes = effets.filter((f) => f.effet === 'preparer_carte' || f.effet === 'preparer_carte_lot').length;
const statut = A.apres.arret === 'autre_compte' ? 'refuse' : erreurs.length ? 'erreur' : effets.length ? 'ok' : 'rien_a_faire';
const st = A.apres.stats;
return [{ json: { enveloppe: e, statut: statut,
  resultat: statut === 'erreur' || statut === 'refuse' ? null : { departement: 'apres', arret: A.apres.arret, evenements_recus: ((e.donnees.evenements) || []).length, propositions: A.apres.propositions,
    demandes_avis: { dues: st.dues_avis, destinataires: st.destinataires, exclus: st.exclus, reportes: st.reportes }, entretiens: { dus: st.entretiens_dus, cartes: st.entretiens_cartes, exclus: st.entretiens_exclus },
    avis: { recus: recus, negatifs: negatifs, suspects: suspects, cartes: cartesAvis }, cartes: cartes, parti_seul: 0 },
  effets_prevus: statut === 'erreur' || statut === 'refuse' ? [] : effets, effets_faits: [], erreurs: A.apres.arret === 'autre_compte' ? ['autre_compte : un chantier ou un avis n’est pas celui de ce compte'] : erreurs, journal: journal.slice(0, 200) } }];`,
}

// ─── Les fixtures (fictives : « Exemple. » devant tout nom, aucune adresse, aucun numéro) — la source des essais, du banc et du juge ───────────────────────
export const ORG = '00000000-0000-4000-8000-000000000801'
export const ORG2 = '00000000-0000-4000-8000-000000000802'
export const MAINTENANT = '2026-11-03T10:05:00.000Z'
export const JOUR_FICTIF = '2026-11-03'
export const ARTISAN_FICTIF = { nom: 'Exemple. Bati-Demo' }
const u = (n) => `00000000-0000-4000-8000-0000000008${String(n).padStart(2, '0')}`
export const enveloppe = (contrat, donnees, config, org = ORG, cle = 'exemple:essai:apres') => ({ contrat, organisation_id: org, simulation: true, cle_idempotence: cle,
  trace: { execution_parent: 'Exemple. essai : après-chantier', declencheur: 'essai', tentative: 0 }, config, donnees })
export const avisFictif = (ref, note, texte, over = {}) => ({ ref, artisan_id: ORG, source: 'colle', auteur: 'Exemple. Client', note, texte, date: '2026-11-03T08:00:00.000Z', client_connu: true, ...over })
export const AVIS_MELES = [
  avisFictif('a1', 5, 'Travail soigné et chantier propre, je recommande cet artisan sans hésiter.', { auteur: 'Exemple. Marie' }),
  avisFictif('a2', 2, 'Le chantier a pris du retard et personne ne m’a prévenu, je suis déçu.', { auteur: 'Exemple. Paul' }),
  avisFictif('a3', 5, 'Bon travail mais une vraie arnaque sur le prix final, je vais porter plainte.', { auteur: 'Exemple. Luc' }),
  avisFictif('a4', 1, 'Nul, ne faites pas confiance à cette entreprise du tout.', { auteur: 'Exemple. Anonyme', client_connu: false }),
  avisFictif('a5', 5, 'Excellent service, rapide et efficace, merci beaucoup à toute l’équipe.', { auteur: 'Exemple. Zoé', date: '2026-11-02T09:00:00.000Z' }),
  avisFictif('a6', 5, 'Excellent service, rapide et efficace, merci beaucoup à toute l’équipe.', { auteur: 'Exemple. Zack', date: '2026-11-02T18:00:00.000Z' }),
  avisFictif('a7', 4, 'Très bien, quelques retouches à prévoir mais l’équipe est revenue vite.', { auteur: 'Exemple. Inès' }),
]
export const lireFictif = (avis = AVIS_MELES, over = {}) => enveloppe('lib-avis-lire@1', { avis, deja_vus: [], maintenant: MAINTENANT, ...(over.donnees || {}) },
  { interrupteur_general: true, interrupteur_departement: true, mots_escalade_artisan: [], ...(over.config || {}) }, over.org || ORG, over.cle || 'exemple:essai:lire')
export const avisLu = (over = {}) => ({ cle: 'av:col:a2', ref: 'a2', source: 'colle', auteur: 'Exemple. Paul', note: 2, sentiment: 'negatif', motifs: ['note_basse'], suspect: false, motifs_suspicion: [],
  texte: 'Le chantier a pris du retard et personne ne m’a prévenu, je suis déçu.', date: '2026-11-03T08:00:00.000Z', ...over })
export const BROUILLON_NEGATIF = { texte: 'Bonjour, merci d’avoir pris le temps de nous écrire. Nous sommes désolés de ce retard et de ce manque d’information. Nous restons à votre écoute pour en parler directement.', modele: 'claude-haiku-5-5' }
export const BROUILLON_POSITIF = { texte: 'Merci beaucoup pour ce retour : toute l’équipe sera heureuse de le lire. À très bientôt pour un prochain chantier.', modele: 'claude-haiku-5-5' }
export const repondreFictif = (over = {}) => enveloppe('lib-avis-repondre@1', { avis: avisLu(), artisan_id: ORG, brouillon: BROUILLON_NEGATIF, conformite: { verdict: 'accepte' }, deja_cartes: [], maintenant: MAINTENANT, ...(over.donnees || {}) },
  { offre: 'signature', interrupteur_general: true, interrupteur_departement: true, artisan: ARTISAN_FICTIF, ...(over.config || {}) }, over.org || ORG, over.cle || 'exemple:essai:repondre')
const contactOk = { email_connu: true, sms_consenti: false, opposition: false, stop: false, litige_en_cours: false, a_ecrit_depuis_fin: false, ecrit_aujourdhui: false }
export const chantierFictif = (n, fin, over = {}) => ({ id: u(n), artisan_id: ORG, titre: 'Exemple. Rénovation de la salle de bains', statut: 'termine', date_fin_reelle: fin, client_nom: 'Exemple. Client ' + n, textes: [], contact: { ...contactOk, ...(over.contact || {}) }, ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'contact')) })
export const CHANTIERS = [
  chantierFictif(10, '2026-10-30', { client_nom: 'Exemple. Marie' }),                                                  // e-mail connu : destinataire (e-mail)
  chantierFictif(11, '2026-10-31', { client_nom: 'Exemple. Luc', contact: { email_connu: false, sms_consenti: true } }), // SMS consenti : destinataire (lien sms:)
  chantierFictif(12, '2026-10-29', { contact: { opposition: true } }),                                                  // opposé : exclu
  chantierFictif(13, '2026-10-28', { contact: { stop: true } }),                                                        // STOP : exclu
  chantierFictif(14, '2026-10-27', { contact: { litige_en_cours: true } }),                                             // litige : exclu
  chantierFictif(15, '2026-10-26', { contact: { email_connu: false, sms_consenti: false } }),                           // aucun canal consenti : exclu
  chantierFictif(16, '2026-11-02'),                                                                                     // fini hier : l'avis n'est pas encore dû
  chantierFictif(17, '2025-11-18', { titre: 'Exemple. Remplacement de la chaudière', client_nom: 'Exemple. Inès' }),    // entretien : date proposée 2026-11-18
  chantierFictif(18, '2025-11-18', { titre: 'Exemple. Remplacement de la chaudière', contact: { opposition: true } }),   // entretien d'un client opposé : exclu
  chantierFictif(19, '2026-10-25', { contact: { opposition: null } }),                                                  // opposition illisible : exclu (fail-closed)
]
export const configChef = (over = {}) => ({ offre: 'signature', capacites: ['assistant', 'crm', 'assistant.pilote'], interrupteur_general: true, interrupteur_departement: true, artisan: ARTISAN_FICTIF,
  reglages: { avis: true, entretien: true, actif_depuis: '2026-10-20', texte_avis: null, texte_entretien: null }, mots_escalade_artisan: [], ...over })
export const donneesChef = (over = {}) => ({ evenements: [], chantiers: CHANTIERS, cles_existantes: [], deja_demandes_aujourdhui: 0, jour: JOUR_FICTIF, maintenant: MAINTENANT, avis: AVIS_MELES, avis_deja_vus: [],
  brouillons_avis: [{ ref: 'a2', ...BROUILLON_NEGATIF }, { ref: 'a1', ...BROUILLON_POSITIF }], conformites_avis: [{ ref: 'a2', verdict: 'accepte' }, { ref: 'a1', verdict: 'accepte' }], cartes_avis_existantes: [], ...over })
export const chefFictif = (over = {}) => enveloppe('presti-dep-apres@1', donneesChef(over.donnees), configChef(over.config), over.org || ORG, over.cle || 'exemple:essai:chef')

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(champ.replace(/\W/g, '-'))}, leftValue: expr(${J('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${pos ? `position: ${J(pos)}, ` : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${J(pos)}, notes: "Mode A : l'effet réel (cartes, base) n'est pas branché. Il le sera au « go » de Benj, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 036-006). Rien n'a été écrit ni envoyé." } } })`
const REGLAGES_WF = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true }
const FICHES = {
  'lib-avis-lire': "Lecteur d'avis (A18) : l'avis est collé par l'artisan (ou lu sur la fiche Google quand l'accès sera accordé). Il classe négatif ou positif (note de 3 ou moins, mots de litige), signale un avis suspect (client inconnu, texte copié, rafale) sans l'accuser, et ne laisse entrer chaque avis qu'une fois. Il ne répond à rien.",
  'lib-avis-repondre': "Rédacteur et bureau d'approbation (A18) : tout avis devient une CARTE « À valider ». Rien n'est publié, quelle que soit l'offre. Le brouillon (modèle épinglé) est revalidé : ni Presti, ni lien, ni montant, ni promesse, ni le nom du client. Le « Reply Poster » n'existe pas ici.",
}
const NOTE_ENFANT = (nom) => `const note = sticky(${J(`## ${nom} (036-006)\n${FICHES[nom]}\nContrat ${nom}@1 (enveloppe@1, gabarit « Contrat » de 035-003, contrat sans contact). Appelé par presti-dep-apres et par presti-banc-apres.\nINACTIF, jamais publié, en simulation (mode A) : aucun identifiant, aucun nœud réseau ; les écritures partent dans effets_prevus.\nJuge : scripts/apres-reputation-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });`
const IMPORTS = "import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';"
const TETE = (contrat, schema, declencheur) => [
  `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: ${J(declencheur)}, position: [0, 0], parameters: { inputSource: 'passthrough' } } });`,
  `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, schema), `contrat: ${contrat}`, [240, 0])};`,
  `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
  `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [1480, 0])};`]
const PORTE = `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`
const NOMS_LOGIQUE = { 'lib-avis-lire': 'Classer les avis', 'lib-avis-repondre': 'Préparer la carte de réponse' }
const CODES = { 'lib-avis-lire': CODE_LIRE, 'lib-avis-repondre': CODE_REPONDRE }
export { NOMS_LOGIQUE, CODES, NOM_A, NOM_LIRE, NOM_REP }
export const reglagesChef = () => ({ ...REGLAGES_WF, errorWorkflow: ERREUR, callerPolicy: 'workflowsFromAList', callerIds: `${CERVEAU},__BANC__` })
export function sdkEnfant(nom, appelants) {
  const contrat = `${nom}@1`
  const l = [IMPORTS, ...TETE(contrat, SCHEMAS[nom], 'Appelé par presti-dep-apres'), PORTE, `const logique = ${CODE_(NOMS_LOGIQUE[nom], CODES[nom], null, [480, 0])};`, NOTE_ENFANT(nom), `const arret = ${ARRET([1240, 120])};`]
  l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(reglagesEnfant(ERREUR, appelants))} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))\n  .add(note);`)
  return l.join('\n') + '\n'
}

// Les opérations qui COMPLÈTENT presti-dep-apres sur place (update_workflow) : on garde l'identifiant, donc le Cerveau (036-001) l'appelle toujours.
const nodeIf = (nom, champ, pos, notes) => ({ name: nom, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos, ...(notes ? { notes } : {}), parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
  conditions: [{ id: champ.replace(/\W/g, '-'), leftValue: '={{ ' + champ + ' }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } })
const nodeCode = (nom, js, pos, notes) => ({ name: nom, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, ...(notes ? { notes } : {}), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: js } })
const nodeAppel = (nom, id, pos, notes) => ({ name: nom, type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: pos, notes, onError: 'continueRegularOutput',
  parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: id }, mode: 'once', options: { waitForSubWorkflow: true } } })
export const NOTE_CHEF = "## presti-dep-apres (036-001, complété par 036-006)\nLe département Après-chantier et réputation (A18, B8) : la demande d'avis par un canal CONSENTI (carte de lot avec ses exclus : opposés, STOP, litige), le rappel d'entretien PROPOSÉ (la date est dans « À valider »), la lecture des avis (lib-avis-lire) et la carte de réponse (lib-avis-repondre). Rien ne part, rien n'est publié, en Studio comme en Signature : un avis négatif est toujours à l'artisan.\nPartie du Cerveau : événement chantier_termine. Le Cerveau n'envoie pas encore la config ni les chantiers (lot 036-012) : sans eux, le chef se tait.\nINACTIF, jamais publié, en simulation (mode A), aucun identifiant. Contrat : plans/011-cadrage-01-11/p6-signature/contrats/apres.json. Juge : scripts/apres-reputation-n8n-qa.mjs"
export function operationsChef(ids) {
  const N = { A: NOM_A, B: 'Préparer la lecture des avis', C: 'Préparer les réponses aux avis', E: 'Assembler le département', si: 'Des avis à répondre ?' }
  const lien = (source, cible, sourceIndex = 0) => ({ type: 'addConnection', source, target: cible, sourceIndex })
  return [
    { type: 'updateNodeParameters', nodeName: "Contrat d'entrée", parameters: { jsCode: codeEntree(`${CHEF}@1`, SCHEMAS[CHEF]) } },
    { type: 'removeNode', nodeName: 'Non branché' },
    { type: 'addNode', node: nodeIf('Porte simulation', '$json.enveloppe.simulation', [480, 0], "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.") },
    { type: 'addNode', node: { name: 'Hors simulation : non branché', type: 'n8n-nodes-base.stopAndError', typeVersion: 1, position: [480, 160], notes: "Mode A : l'effet réel (cartes, base) n'est pas branché. Il le sera au « go » de Benj, derrière cette même porte.",
      parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 036-006). Rien n'a été écrit ni envoyé." } } },
    { type: 'addNode', node: nodeCode(N.A, CHEF_CODE[N.A], [720, 0]) },
    { type: 'addNode', node: nodeCode(N.B, CHEF_CODE[N.B], [960, 0]) },
    { type: 'addNode', node: nodeAppel(NOM_LIRE, ids['lib-avis-lire'], [1200, 0], 'Lecteur d’avis (036-006). Un échec ne fait pas échouer le département.') },
    { type: 'addNode', node: nodeIf(N.si, '$json.resultat?.a_repondre === true', [1440, 0], 'Faux (aucun avis, ou lecture en échec) : on passe directement à l’assemblage.') },
    { type: 'addNode', node: nodeCode(N.C, CHEF_CODE[N.C], [1680, -80]) },
    { type: 'addNode', node: nodeAppel(NOM_REP, ids['lib-avis-repondre'], [1920, -80], 'Rédacteur et bureau d’approbation (036-006) : une carte par avis, jamais de publication.') },
    { type: 'addNode', node: nodeCode(N.E, CHEF_CODE[N.E], [2160, 0]) },
    lien('Entrée conforme ?', 'Porte simulation', 0), lien('Porte simulation', N.A, 0), lien('Porte simulation', 'Hors simulation : non branché', 1),
    lien(N.A, N.B), lien(N.B, NOM_LIRE), lien(NOM_LIRE, N.si), lien(N.si, N.C, 0), lien(N.si, N.E, 1), lien(N.C, NOM_REP), lien(NOM_REP, N.E), lien(N.E, 'Contrat de sortie'),
    { type: 'updateNodeParameters', nodeName: 'Sticky Note 99d6a8fc', parameters: { content: NOTE_CHEF } },
    { type: 'setWorkflowSettings', settings: { callerPolicy: 'workflowsFromAList', callerIds: `${CERVEAU},${ids[BANC] || '__BANC__'}` } },
  ]
}

// ─── Le banc presti-banc-apres : cinq cas fictifs, seul appelant des trois workflows avec le Cerveau ─────────────────────────────────────────────
const CAS = (commentaire, o) => commentaire + '\nconst cas = ' + J(o) + ';\nreturn [JSON.parse(JSON.stringify(cas))].map((j) => ({ json: j }));'
export const CAS_BANC = [
  [ENFANTS[0], 'Cas : sept avis mêlés', CAS('// Exemple. Sept avis fictifs collés : un positif sûr, un négatif de 2 étoiles, un 5 étoiles avec une menace de plainte, un client inconnu, deux textes identiques, un 4 étoiles.', lireFictif(AVIS_MELES, { cle: 'exemple:banc:lire-meles' }))],
  [ENFANTS[1], 'Cas : avis négatif en Signature', CAS("// Exemple. Signature, 2 étoiles : même avec le pilote, c'est une carte, jamais une publication.", repondreFictif({ cle: 'exemple:banc:repondre-negatif' }))],
  [ENFANTS[1], 'Cas : avis positif en Studio', CAS('// Exemple. Studio, 5 étoiles : une carte avec son brouillon, le type n’est pas accepté par Benj.', repondreFictif({ config: { offre: 'studio' }, donnees: { avis: avisLu({ cle: 'av:col:a1', ref: 'a1', note: 5, sentiment: 'positif', motifs: [], auteur: 'Exemple. Marie', texte: AVIS_MELES[0].texte }), brouillon: BROUILLON_POSITIF }, cle: 'exemple:banc:repondre-positif' }))],
  [CHEF, 'Cas : département complet (Signature)', CAS('// Exemple. Dix chantiers (e-mail, SMS consenti, opposé, STOP, litige, aucun canal, pas encore dû, entretien, entretien opposé, opposition illisible) et sept avis.', chefFictif({ cle: 'exemple:banc:chef' }))],
  [CHEF, 'Cas : interrupteur du département coupé', CAS('// Exemple. Le département est coupé : il se tait.', chefFictif({ config: { interrupteur_departement: false }, donnees: { chantiers: [], avis: [], brouillons_avis: [], conformites_avis: [] }, cle: 'exemple:banc:chef-coupe' }))],
]
export function sdkBanc(ids) {
  const l = [IMPORTS.replace(', ifElse', '').replace(', expr', ''),
    "const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });"]
  CAS_BANC.forEach(([lib, nom, js], i) => {
    const y = (i - 2) * 160
    l.push(`const cas${i} = ${CODE_(nom, js, null, [260, y])};`)
    l.push(`const appel${i} = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J('Appeler ' + lib + ' (' + (i + 1) + ')')}, position: [520, ${y}], onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(ids[lib])} }, mode: 'once', options: { waitForSubWorkflow: true } } } });`)
  })
  l.push(`const bilan = ${CODE_('Bilan du banc', CODE_BILAN, null, [800, 0])};`)
  l.push(`const note = sticky(${J("## presti-banc-apres (036-006)\nBanc d'essai du département Après-chantier : cinq cas fictifs (« Exemple. »), le seul appelant permis des deux spécialistes et du chef avec le Cerveau.\nINACTIF, jamais publié, jamais planifié. Ne lit ni n'écrit rien en base, n'envoie rien, ne publie rien.\nJuge : scripts/apres-reputation-n8n-qa.mjs")}, [horloge, cas2], { color: 4 });`)
  l.push(`export default workflow(${J(BANC)}, ${J(BANC)}, { settings: ${J({ ...REGLAGES_WF, errorWorkflow: ERREUR, callerPolicy: 'none' })} })`)
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
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/apres'
    mkdirSync(dossier, { recursive: true })
    const ids = JSON.parse(arg('ids') || '{}')
    const appelants = arg('appelants') || ID_CHEF
    for (const nom of ENFANTS) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkEnfant(nom, appelants))
    writeFileSync(path.join(dossier, 'presti-dep-apres.operations.json'), J(operationsChef({ ...ids })))
    writeFileSync(path.join(dossier, 'presti-banc-apres.sdk.js'), sdkBanc(ids))
    console.log(`programmes écrits dans ${dossier} : ${[...ENFANTS, 'presti-dep-apres (opérations)', BANC].join(', ')}`)
  }
}
