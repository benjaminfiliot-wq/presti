// 035-004 — fabrique de la chaîne « de la capture à la décision » : le code des nœuds et le code SDK n8n de lib-capturer-lead,
// lib-qualifier-lead, lib-decider et de leur banc lib-banc-metier. Hors ligne : aucun réseau, aucune base, aucune donnée réelle.
// Le gabarit « Contrat » (codeEntree, codeSortie) et le SHA-256 écrit à la main sont ceux du socle 035-003, réutilisés tels quels.
// La copie figée des listes du pilote est relue ICI dans le vrai code (lib/pilote/regles.ts, lib/plans.ts) puis figée dans le nœud :
// le juge scripts/lib-metier-n8n-qa.mjs la recompare au code à chaque passage.
//   node .orchestre/preuves/035-004/construire.mjs [/tmp/lib-metier] [--erreur=<id>] [--appelants=<id>] [--ids=<json>]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie, reglagesEnfant } from '../035-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')

// Le SHA-256 du socle, repris à l'identique depuis la fabrique de 035-003 (aucun module dans un nœud Code : R19).
const SHA256 = readFileSync(path.join(ICI, '../035-003/construire.mjs'), 'utf8').match(/const SHA256 = String\.raw`([\s\S]*?)`\n/)[1]
const CLE = "const cleDe = (brute, type) => brute.length <= 80 ? brute : 'h:' + type.slice(0, 24) + ':' + sha256(brute).slice(0, 48);"

// ─── La copie figée des listes du pilote, lue dans le code (Amendement B1 : la liste du code, PLUS les gestes de p5:226) ───────────
export function lireCodePilote() {
  const prog = `const r = await import(${JSON.stringify(path.join(RACINE, 'lib/pilote/regles.ts'))});
const p = await import(${JSON.stringify(path.join(RACINE, 'lib/plans.ts'))});
process.stdout.write(JSON.stringify({ TYPES_PILOTE: r.TYPES_PILOTE, OUTIL_TYPE: r.OUTIL_TYPE, OUTILS_EXECUTABLES_PILOTE: r.OUTILS_EXECUTABLES_PILOTE,
  OUTILS_JAMAIS_AUTO: r.OUTILS_JAMAIS_AUTO, PLAFOND_AUTO_JOUR: r.PLAFOND_AUTO_JOUR, DELAI_ANNULATION_MIN: r.DELAI_ANNULATION_MIN,
  PLANS_PILOTE: Object.keys(p.PLANS).filter((x) => p.peut(x, 'assistant.pilote')).sort() }));`
  const sortie = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8' })
  const code = JSON.parse(sortie)
  // SOURCE_OK n'est pas exporté : on lit son texte dans le fichier (lib/pilote/regles.ts, « const SOURCE_OK = /…/i »).
  code.SOURCE_PRIX = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8').match(/const SOURCE_OK = \/(.+)\/i\n/)[1]
  return code
}
// Les gestes de p5:226 qui ne sont pas des outils du code (Amendement B1, premiere-reponse.md:1016-1020). « Supprimer » et « déclarer »
// valent aussi par préfixe. Parler sur un sujet d'escalade : le drapeau `constat.escalade`. Inventer un créneau, un délai, un fournisseur
// ou un prix : la porte (lib-porte-conformite, 035-005), qui lit le message ; lib-decider n'en voit aucun.
export const GESTES_P5_226 = ['envoyer_devis', 'envoi_devis', 'modifier_prix_sans_source', 'encaisser', 'toucher_moyen_paiement',
  'declarer_urssaf', 'declarer_impots', 'supprimer_donnees', 'passer_appel', 'prendre_appel', 'prendre_rendez_vous']

// ─── lib-capturer-lead ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Colonnes lues : celles que 0189 accorde à n8n_lecture sur leads (supabase/migrations/0189_role_lecture_n8n.sql), sauf prise_en_main*,
// lu_le et updated_at, plus deux colonnes À NAÎTRE au « go » (question 27) : contact_empreinte (générée en base) et etat_capture.
export const COLONNES_LEADS = ['id', 'artisan_id', 'statut', 'canal', 'origine', 'urgence', 'type_chantier', 'created_at', 'contact_empreinte', 'etat_capture']
const CODE_CAPTURER = String.raw`// lib-capturer-lead (PR § 5.5 ; FM:819 ; fiches-depots.md:669) : les nouvelles demandes, SANS JAMAIS LIRE LE CONTACT.
// Ni nom, ni adresse, ni téléphone, ni message : la lecture prévue ne demande que les colonnes permises (0189), et « a-t-il un moyen de
// contact ? » se lit sur l'empreinte calculée en base (contact_empreinte, colonne générée à naître, question 27), jamais sur le contact.
// Mode A : les lignes que rendrait cette lecture sont épinglées (donnees.lignes) ; la lecture et la réclamation (a_traiter → en_cours,
// mise à jour conditionnelle) partent dans effets_prevus. Aucune URL donnée par un prospect n'est appelée : il n'y a aucun nœud HTTP, et
// un champ qui porte une adresse web est ôté de l'événement.
// v1 : une organisation = un compte (plan du chantier 4, § 10) ; le filtre organisation porte donc sur artisan_id.
const COLONNES = ${JSON.stringify(COLONNES_LEADS)};
const CHAMPS = ['canal', 'origine', 'urgence', 'type_chantier'];
const WEB = /(https?:|www\.|\/\/|[a-z0-9-]+\.(fr|com|net|org|eu|io|be|info)\b)/i;
const vus = new Set();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, c = e.config, d = e.donnees, org = e.organisation_id;
    if (c.source !== 'leads') {
      return { json: { ...j, statut: 'refuse', resultat: { evenements: [], reclames: 0, ecartes: [], restants: 0, urls_ignorees: 0 }, effets_prevus: [],
        erreurs: ['source demandes : la table demandes_demo (0190) n’a pas de colonne d’organisation ; elle est lue par presti-demande-demo (L19), pas par ce gabarit'],
        journal: [{ evenement: 'capture_refusee', agent: 'lib-capturer-lead', objet_ref: null, decision: 'source demandes refusée : aucune colonne d’organisation', simulation: e.simulation }] } };
    }
    const depuis = d.depuis ? Date.parse(d.depuis) : -Infinity;
    const lignes = (Array.isArray(d.lignes) ? d.lignes : []).filter((l) => Date.parse(l.created_at) >= depuis)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const ecartes = [], retenus = [];
    for (const l of lignes) {
      let motif = null;
      if (l.artisan_id !== org) motif = 'autre_organisation';
      else if (vus.has(org + '|' + l.id)) motif = 'doublon';
      else if (l.etat_capture !== 'a_traiter') motif = 'deja_reclame';
      else if (typeof l.contact_empreinte !== 'string') motif = 'sans_contact';
      if (motif !== 'autre_organisation') vus.add(org + '|' + l.id);
      if (motif) { ecartes.push({ id: motif === 'autre_organisation' ? null : l.id, motif: motif }); continue; }
      retenus.push(l);
    }
    const pris = retenus.slice(0, c.lot_max);
    let urls = 0;
    const evenements = pris.map((l) => {
      const champs = {};
      for (const k of CHAMPS) {
        const v = l[k];
        if (v === null || v === undefined) continue;
        if (typeof v === 'string' && WEB.test(v)) { urls++; continue; }
        champs[k] = v;
      }
      return { id: l.id, type: 'demande_recue', recu_le: new Date(Date.parse(l.created_at)).toISOString(), champs: champs, empreinte_contact: l.contact_empreinte };
    });
    const ids = pris.map((l) => l.id);
    const effets = [{ effet: 'lire_demandes', table: 'leads', requete: 'GET /rest/v1/leads?select=' + COLONNES.join(',') + '&artisan_id=eq.' + org +
      '&etat_capture=eq.a_traiter&contact_empreinte=not.is.null' + (d.depuis ? '&created_at=gte.' + d.depuis : '') + '&order=created_at.asc,id.asc&limit=' + c.lot_max }];
    if (ids.length) effets.push({ effet: 'reclamer', table: 'leads', ids: ids, requete: 'PATCH /rest/v1/leads?artisan_id=eq.' + org + '&etat_capture=eq.a_traiter&id=in.(' + ids.join(',') + ')', corps: { etat_capture: 'en_cours' } });
    const journal = [{ evenement: 'capture', agent: 'lib-capturer-lead', objet_ref: null, decision: pris.length + ' demande(s) à réclamer, ' + ecartes.length + ' écartée(s), ' + (retenus.length - pris.length) + ' pour le passage suivant', simulation: e.simulation }];
    for (const x of ecartes.slice(0, 150)) journal.push({ evenement: 'capture_ecartee', agent: 'lib-capturer-lead', objet_ref: x.id, decision: 'écartée : ' + x.motif, simulation: e.simulation });
    return { json: { ...j, statut: pris.length ? 'ok' : 'rien_a_faire',
      resultat: { evenements: evenements, reclames: ids.length, ecartes: ecartes, restants: retenus.length - pris.length, urls_ignorees: urls },
      effets_prevus: effets, journal: journal, erreurs: urls ? [urls + ' champ(s) porteur(s) d’une adresse web ôté(s), jamais appelés'] : [] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, erreurs: ['capture : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`

// ─── lib-qualifier-lead ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Les critères discriminants (Code pénal, art. 225-1, à relire par un juriste ; p5:189 « noter sur un critère discriminant »), refusés
// dès la grille, en plus de la liste fermée des champs permis.
export const CHAMPS_PERMIS = { canal: 'texte', origine: 'texte', urgence: 'texte', type_chantier: 'texte', taille: 'texte', activite: 'texte',
  budget_tranche: 'texte', delai_souhaite: 'texte', surface_m2: 'nombre', photo_jointe: 'booleen', dans_zone: 'booleen', recu_hors_horaires: 'booleen' }
export const DISCRIMINANTS = ['age', 'sexe', 'genre', 'origine_ethnique', 'ethnie', 'nationalite', 'religion', 'handicap', 'sante', 'etat_de_sante',
  'orientation_sexuelle', 'identite_de_genre', 'situation_familiale', 'situation_de_famille', 'grossesse', 'nom', 'prenom', 'patronyme', 'apparence',
  'opinion_politique', 'opinions', 'syndicat', 'activite_syndicale', 'langue', 'lieu_de_residence', 'residence', 'code_postal', 'quartier', 'adresse',
  'domiciliation_bancaire', 'vulnerabilite_economique', 'moeurs', 'caracteristiques_genetiques', 'perte_autonomie']
const CODE_QUALIFIER = String.raw`// lib-qualifier-lead (PR § 5.5 et fiche « Qualification », § 5.3) : la note selon la GRILLE ÉCRITE AVEC LE CLIENT, la priorité, le délai
// cible et le doublon. Aucun modèle (question 15) : une note d'intérêt se calcule par le code (fiches-videos-restructureai.md:181).
// Le doublon se lit sur l'empreinte du contact calculée en base (question 27), jamais sur le contact : ni nom, ni adresse, ni téléphone.
// Rien n'est deviné : un champ absent ne rapporte aucun point, et une grille dont plus de la moitié du poids manque met la demande « à revoir ».
// Un critère discriminant, ou hors de la liste fermée des champs, fait refuser la grille entière. Le résultat est revalidé contre
// le schéma « resultat » du contrat, version 1, avant tout effet : hors schéma, aucune note ne change. Mode A : la note part dans effets_prevus.
// Mode A : les empreintes déjà en base viennent de config.empreintes_connues (lues par l'appelant, épinglées).
` + SHA256 + '\n' + CLE + String.raw`
const CHAMPS_PERMIS = ${JSON.stringify(CHAMPS_PERMIS)};
const DISCRIMINANTS = ${JSON.stringify(DISCRIMINANTS)};
const CRITERE = /^([a-z][a-z0-9_]{0,39})(?:(=|>=|<=)(.{1,40}))?$/;
const PRIORITES = ['haute', 'normale', 'a_revoir'];
function horsSchema(r) {
  const e = [];
  if (!Number.isInteger(r.note) || r.note < 0 || r.note > 100) e.push('note');
  if (typeof r.categorie !== 'string' || !r.categorie || r.categorie.length > 60) e.push('categorie');
  if (!PRIORITES.includes(r.priorite)) e.push('priorite');
  if (!Number.isInteger(r.delai_cible_min) || r.delai_cible_min < 0) e.push('delai_cible_min');
  if (typeof r.raison !== 'string' || r.raison.length > 200) e.push('raison');
  if (typeof r.doublon !== 'boolean') e.push('doublon');
  return e;
}
const vues = new Map();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, c = e.config, d = e.donnees, org = e.organisation_id;
    const refus = [], criteres = [];
    for (const g of c.grille) {
      const m = CRITERE.exec(g.critere), champ = m ? m[1] : '';
      if (DISCRIMINANTS.some((x) => champ === x || champ.startsWith(x + '_') || champ.endsWith('_' + x))) refus.push('critère discriminant refusé : ' + champ);
      else if (!m || !Object.prototype.hasOwnProperty.call(CHAMPS_PERMIS, champ)) refus.push('critère hors de la liste des champs permis : ' + (champ || 'illisible'));
      else criteres.push({ champ: champ, op: m[2] || '', val: m[3], poids: g.poids });
    }
    if (c.seuils.haute < c.seuils.normale) refus.push('seuils incohérents : haute sous normale');
    if (refus.length) return { json: { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: refus.slice(0, 20),
      journal: [{ evenement: 'grille_refusee', agent: 'lib-qualifier-lead', objet_ref: d.lead_id, decision: 'grille refusée : ' + refus[0].slice(0, 160), simulation: e.simulation }] } };
    let total = 0, gagne = 0, manque = 0;
    const touches = [], absents = [];
    for (const k of criteres) {
      total += k.poids;
      const v = d.champs[k.champ];
      if (v === undefined || v === null || v === '') { manque += k.poids; absents.push(k.champ); continue; }
      const ok = k.op === '' ? v === true : k.op === '=' ? String(v) === k.val : k.op === '>=' ? Number(v) >= Number(k.val) : Number(v) <= Number(k.val);
      if (ok) { gagne += k.poids; touches.push(k.champ + (k.op ? k.op + k.val : '') + ' (' + k.poids + ')'); }
    }
    const note = Math.round((100 * gagne) / total);
    let doublonDe = null;
    if (typeof d.empreinte_contact === 'string') {
      const connu = (Array.isArray(c.empreintes_connues) ? c.empreintes_connues : []).find((x) => x.empreinte === d.empreinte_contact && x.lead_id !== d.lead_id);
      if (connu) doublonDe = connu.lead_id;
      else {
        const k = org + '|' + d.empreinte_contact, v = vues.get(k);
        if (v && v !== d.lead_id) doublonDe = v; else vues.set(k, d.lead_id);
      }
    }
    const incomplet = manque * 2 > total;
    const priorite = doublonDe || incomplet ? 'a_revoir' : note >= c.seuils.haute ? 'haute' : note >= c.seuils.normale ? 'normale' : 'a_revoir';
    const raison = ('note ' + note + '/100' + (touches.length ? ' : ' + touches.join(', ') : '') + (absents.length ? ' ; inconnu : ' + absents.join(', ') : '') +
      (doublonDe ? ' ; même contact qu’une demande déjà reçue' : '') + (incomplet ? ' ; grille trop incomplète pour trancher' : '')).slice(0, 200);
    const resultat = { note: note, categorie: String(d.champs.type_chantier || d.champs.activite || 'non renseignée').slice(0, 60), priorite: priorite,
      delai_cible_min: c.delais_cibles_min[priorite], raison: raison, doublon: Boolean(doublonDe), doublon_de: doublonDe, lead_id: d.lead_id };
    const fautes = horsSchema(resultat);
    if (fautes.length) return { json: { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['résultat hors schéma (' + fautes.join(', ') + ') : aucune note ne change'],
      journal: [{ evenement: 'qualification_hors_schema', agent: 'lib-qualifier-lead', objet_ref: d.lead_id, decision: 'résultat hors schéma : rien écrit', simulation: e.simulation }] } };
    const cle = cleDe(org + ':qualification:' + d.lead_id + ':' + (d.evenement_id || d.lead_id), 'qualification');
    return { json: { ...j, statut: 'ok', resultat: resultat,
      effets_prevus: [{ effet: 'ecrire_note', organisation_id: org, lead_id: d.lead_id, cle: cle, note: note, priorite: priorite, categorie: resultat.categorie, doublon: resultat.doublon }],
      journal: [{ evenement: 'qualification', agent: 'lib-qualifier-lead', objet_ref: d.lead_id, decision: ('priorité ' + priorite + ', ' + raison).slice(0, 200), simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['qualification : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`

// ─── lib-decider ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const REPERE_COPIE = '// ─── Copie figée des listes du pilote (lib/pilote/regles.ts, lib/plans.ts), comparée au code par scripts/lib-metier-n8n-qa.mjs ───'
const codeDecider = (copie) => String.raw`// lib-decider (PR § 5.5 ; FM § 3.2 « Décision » ; P3:540-548, les trois niveaux) : carte, pilote ou rien ; le niveau, le motif, la clé.
//   1 = propose (rien n'est préparé : une ligne au journal) ; 2 = prépare, l'artisan valide (une carte) ; 3 = fait seul sous limites (le pilote,
//   10 min pour annuler). Aucun modèle ; le montant est calculé ICI par le code, jamais par un modèle (p5:217).
// Le niveau 3 n'existe que si TOUT le permet : config.autonomie.niveau_max à 3 (2 au plus en mode A, question 1), une offre qui a
// « assistant.pilote » (Studio jamais), le drapeau, pilote_reglages.actif et le type actif (lus par l'appelant dans pilote_reglages, 0174:24,
// jamais une seconde copie), des prix sourcés, le plafond du jour, aucun sujet d'escalade, et un geste hors de la liste « jamais en
// automatique » du kit = la liste du code PLUS les gestes de p5:226 (Amendement B1). Tout le reste devient une carte : liste fermée, côté sûr.
// Une lecture absente vaut refus : sans pilote_reglages ou sans le compte du jour, rien ne part seul.
` + SHA256 + '\n' + CLE + '\n' + REPERE_COPIE + `
const COPIE_PILOTE = ${JSON.stringify(copie)};
const GESTES_P5_226 = ${JSON.stringify(GESTES_P5_226)};
` + String.raw`// ─── fin de la copie figée ───
const JAMAIS_KIT = new Set([...COPIE_PILOTE.OUTILS_JAMAIS_AUTO, ...GESTES_P5_226]);
const jamais = (outil, type) => JAMAIS_KIT.has(outil) || JAMAIS_KIT.has(type) || /^(supprimer|declarer|encaisser|rembourser|payer)_/.test(outil);
const typePilote = (outil) => COPIE_PILOTE.OUTILS_JAMAIS_AUTO.includes(outil) || !COPIE_PILOTE.OUTILS_EXECUTABLES_PILOTE.includes(outil) ? null
  : (Object.prototype.hasOwnProperty.call(COPIE_PILOTE.OUTIL_TYPE, outil) ? COPIE_PILOTE.OUTIL_TYPE[outil] : null);
const SOURCE = new RegExp(COPIE_PILOTE.SOURCE_PRIX, 'i');
const ligneSourcee = (l) => Number.isFinite(Number(l.prix_unitaire_ht_centimes)) && Number(l.prix_unitaire_ht_centimes) > 0 && typeof l.source_prix === 'string' && l.source_prix.trim() !== '' && SOURCE.test(l.source_prix.trim());
const LIBELLES = { pilote: 'part seul après ' + COPIE_PILOTE.DELAI_ANNULATION_MIN + ' min pour annuler', niveau_1_propose: 'niveau 1 : proposé au journal, rien préparé',
  niveau_max: 'niveau 3 non permis par la configuration (2 au plus en mode A)', jamais_auto: 'geste jamais automatique (liste du code)', geste_p5_226: 'geste jamais automatique (p5:226)',
  escalade: 'sujet d’escalade : à la main', drapeau: 'pilote fermé (drapeau) ou réglages non lus', type_non_pilotable: 'outil hors de la liste fermée du pilote', offre: 'offre sans pilote automatique',
  inactif: 'pilote coupé', type_inactif: 'pilote non activé pour ce type', prix_non_source: 'prix estimé ou à chiffrer', plafond: 'plafond de ' + COPIE_PILOTE.PLAFOND_AUTO_JOUR + ' envois automatiques par jour atteint',
  plafond_inconnu: 'compte du jour non lu : rien ne part seul', deja_decide: 'même objet, même étape : déjà décidé' };
const comptes = new Map(), cles = new Set();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, c = e.config, d = e.donnees, k = d.constat, org = e.organisation_id, a = c.autonomie;
    const outil = k.outil, type = typePilote(outil), typeAction = type || outil;
    const niveauMax = a.niveau_max;
    const voulu = a.niveaux && Object.prototype.hasOwnProperty.call(a.niveaux, typeAction) ? (a.niveaux[typeAction] === 1 ? 1 : 2) : (a.niveau_defaut === 1 ? 1 : 2);
    const niveauDemande = Math.min(voulu, niveauMax);
    let montant = null;
    if (Array.isArray(k.lignes)) {
      const ok = k.lignes.length > 0 && k.lignes.every((l) => Number.isInteger(l.prix_unitaire_ht_centimes) && Number.isFinite(Number(l.quantite)));
      montant = ok ? k.lignes.reduce((s, l) => s + Math.round(Number(l.quantite) * l.prix_unitaire_ht_centimes), 0) : null;
    } else if (Number.isInteger(k.montant_centimes_base)) montant = k.montant_centimes_base;
    const cle = cleDe(org + ':decision:' + d.objet_type + ':' + d.objet_id + ':' + (k.etape || 'unique'), 'decision');
    let action = 'carte', niveau = 2, motif = null;
    if (cles.has(cle)) { action = 'rien'; niveau = 1; motif = 'deja_decide'; }
    else if (niveauDemande === 1) { action = 'rien'; niveau = 1; motif = 'niveau_1_propose'; }
    else {
      const pil = c.pilote && typeof c.pilote === 'object' ? c.pilote : null;
      const n = comptes.has(org) ? comptes.get(org) : (Number.isInteger(c.parties_depuis_24h) ? c.parties_depuis_24h : null);
      if (jamais(outil, typeAction)) motif = COPIE_PILOTE.OUTILS_JAMAIS_AUTO.includes(outil) ? 'jamais_auto' : 'geste_p5_226';
      else if (k.escalade !== false) motif = 'escalade';
      else if (!pil || pil.drapeau !== true) motif = 'drapeau';
      else if (!type) motif = 'type_non_pilotable';
      else if (!COPIE_PILOTE.PLANS_PILOTE.includes(c.plan)) motif = 'offre';
      else if (pil.actif !== true) motif = 'inactif';
      else if (!pil.types || pil.types[type] !== true) motif = 'type_inactif';
      else if (type === 'envoi_devis' && !(Array.isArray(k.lignes) && k.lignes.length && k.lignes.every(ligneSourcee))) motif = 'prix_non_source';
      else if (n === null) motif = 'plafond_inconnu';
      else if (n >= COPIE_PILOTE.PLAFOND_AUTO_JOUR) motif = 'plafond';
      else if (niveauMax < 3) motif = 'niveau_max';
      else { action = 'pilote'; niveau = 3; motif = 'pilote'; comptes.set(org, n + 1); }
    }
    cles.add(cle);
    const resultat = { action: action, type_action: typeAction, niveau: niveau, motif: motif, cle_idempotence: cle, montant_centimes: montant, objet_id: d.objet_id };
    const effets = action === 'carte' ? [{ effet: 'ecrire_carte', organisation_id: org, cle: cle, objet_type: d.objet_type, objet_id: d.objet_id, type_action: typeAction, outil: outil, montant_centimes: montant }]
      : action === 'pilote' ? [{ effet: 'mettre_en_file_pilote', organisation_id: org, cle: cle, objet_type: d.objet_type, objet_id: d.objet_id, type: type, outil: outil, montant_centimes: montant, annulable_min: COPIE_PILOTE.DELAI_ANNULATION_MIN }] : [];
    return { json: { ...j, statut: motif === 'deja_decide' ? 'rien_a_faire' : 'ok', resultat: resultat, effets_prevus: effets,
      journal: [{ evenement: 'decision', agent: 'lib-decider', objet_ref: d.objet_id, decision: (action + ' (niveau ' + niveau + ') : ' + LIBELLES[motif]).slice(0, 200), simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['décision : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`

// ─── Les contrats (PR § 5.5 ; ajouts « mode A » notés dans resume.md) ───────────────────────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const EMPREINTE = { type: ['string', 'null'], pattern: '^[0-9a-f]{64}$' }
export const SCHEMAS = {
  'lib-capturer-lead': { sans_contact: true,
    config: { type: 'object', additionalProperties: false, required: ['source', 'lot_max'], properties: { source: { enum: ['demandes', 'leads'] }, lot_max: { type: 'integer', minimum: 1, maximum: 200 } } },
    donnees: { type: 'object', additionalProperties: false, properties: { depuis: DATE, lignes: { type: 'array', maxItems: 1000, items: {
      type: 'object', additionalProperties: false, required: ['id', 'artisan_id', 'statut', 'created_at', 'contact_empreinte', 'etat_capture'], properties: {
        id: UUID, artisan_id: UUID, statut: { type: 'string', maxLength: 30, pattern: '^[a-z_]+$' }, canal: { type: ['string', 'null'], maxLength: 30 },
        origine: { type: ['string', 'null'], maxLength: 30 }, urgence: { type: ['string', 'null'], maxLength: 20 }, type_chantier: { type: ['string', 'null'], maxLength: 60 },
        created_at: DATE, contact_empreinte: EMPREINTE, etat_capture: { enum: ['a_traiter', 'en_cours', 'traite'] } } } } } } },
  'lib-qualifier-lead': { sans_contact: true,
    config: { type: 'object', additionalProperties: false, required: ['grille', 'seuils', 'delais_cibles_min'], properties: {
      grille: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['critere', 'poids'], properties: { critere: { type: 'string', minLength: 1, maxLength: 84 }, poids: { type: 'integer', minimum: 0, maximum: 100 } } } },
      seuils: { type: 'object', additionalProperties: false, required: ['haute', 'normale'], properties: { haute: { type: 'integer', minimum: 0, maximum: 100 }, normale: { type: 'integer', minimum: 0, maximum: 100 } } },
      delais_cibles_min: { type: 'object', additionalProperties: false, required: ['haute', 'normale', 'a_revoir'], properties: { haute: { type: 'integer', minimum: 0, maximum: 10080 }, normale: { type: 'integer', minimum: 0, maximum: 10080 }, a_revoir: { type: 'integer', minimum: 0, maximum: 10080 } } },
      empreintes_connues: { type: 'array', maxItems: 1000, items: { type: 'object', additionalProperties: false, required: ['empreinte', 'lead_id'], properties: { empreinte: { type: 'string', pattern: '^[0-9a-f]{64}$' }, lead_id: UUID } } } } },
    donnees: { type: 'object', additionalProperties: false, required: ['lead_id', 'champs'], properties: { lead_id: UUID, evenement_id: UUID, empreinte_contact: EMPREINTE,
      champs: { type: 'object', additionalProperties: false, properties: {
        canal: { type: 'string', maxLength: 30, pattern: '^[a-z_]+$' }, origine: { type: 'string', maxLength: 30, pattern: '^[a-z0-9_]+$' }, urgence: { enum: ['urgent', 'normal'] },
        type_chantier: { type: 'string', maxLength: 60, pattern: '^[^/@:]+$' }, taille: { enum: ['1', '2 à 5', '6 à 20', 'plus de 20'] }, activite: { enum: ['Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre'] },
        budget_tranche: { type: 'string', maxLength: 30, pattern: '^[^/@:]+$' }, delai_souhaite: { type: 'string', maxLength: 30, pattern: '^[^/@:]+$' },
        surface_m2: { type: 'integer', minimum: 0, maximum: 100000 }, photo_jointe: { type: 'boolean' }, dans_zone: { type: 'boolean' }, recu_hors_horaires: { type: 'boolean' } } } } } },
  'lib-decider': { sans_contact: true,
    config: { type: 'object', additionalProperties: false, required: ['autonomie'], properties: {
      autonomie: { type: 'object', additionalProperties: false, required: ['niveau_max'], properties: { niveau_max: { type: 'integer', minimum: 1, maximum: 3 }, niveau_defaut: { enum: [1, 2] }, niveaux: { type: 'object' } } },
      plan: { type: ['string', 'null'], maxLength: 20 },
      pilote: { type: 'object', additionalProperties: false, required: ['drapeau', 'actif', 'types'], properties: { drapeau: { type: 'boolean' }, actif: { type: 'boolean' }, types: { type: 'object' } } },
      parties_depuis_24h: { type: 'integer', minimum: 0 } } },
    donnees: { type: 'object', additionalProperties: false, required: ['objet_type', 'objet_id', 'constat'], properties: {
      objet_type: { enum: ['demande', 'devis', 'facture', 'conversation', 'chantier'] }, objet_id: UUID,
      constat: { type: 'object', additionalProperties: false, required: ['outil'], properties: {
        outil: { type: 'string', minLength: 2, maxLength: 60, pattern: '^[a-z_]+$' }, etape: { type: 'string', minLength: 1, maxLength: 40, pattern: '^[A-Za-z0-9_.-]+$' },
        escalade: { type: 'boolean' }, montant_centimes_base: { type: ['integer', 'null'] },
        lignes: { type: 'array', maxItems: 200, items: { type: 'object', additionalProperties: false, required: ['prix_unitaire_ht_centimes', 'quantite'], properties: {
          prix_unitaire_ht_centimes: { type: ['integer', 'null'] }, quantite: { type: 'number', minimum: 0 }, source_prix: { type: ['string', 'null'], maxLength: 120 } } } } } } } } },
}
export const COUCHES = { 'lib-capturer-lead': 'capture', 'lib-qualifier-lead': 'qualification', 'lib-decider': 'decision' }
export const LOGIQUES = { 'lib-capturer-lead': 'Capturer sans lire le contact', 'lib-qualifier-lead': 'Noter selon la grille', 'lib-decider': 'Décider' }
export const ENFANTS = Object.keys(COUCHES)
export const codeLogique = (nom, copie) => nom === 'lib-capturer-lead' ? CODE_CAPTURER : nom === 'lib-qualifier-lead' ? CODE_QUALIFIER : codeDecider(copie)

// ─── Le code SDK (même squelette que 035-003) ─────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${JSON.stringify(nom)}, ${notes ? `notes: ${JSON.stringify(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${JSON.stringify(champ.replace(/\W/g, '-'))}, leftValue: expr(${JSON.stringify('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${JSON.stringify(nom)}, position: ${JSON.stringify(pos)}, ${notes ? `notes: ${JSON.stringify(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(js)} } } })`
const ARRET = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${JSON.stringify(pos)}, notes: "Mode A : l'effet réel (lecture, réclamation, écriture de la note, de la carte ou de la file du pilote) n'est pas branché. Il le sera au « go » de Benj, avec ses colonnes et tables, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 035-004). Rien n'a été lu, écrit ni envoyé." } } })`
const NOTES = {
  'lib-capturer-lead': 'Les nouvelles demandes (leads), sans jamais lire le contact : colonnes permises (0189) et empreinte du contact calculée en base (question 27).',
  'lib-qualifier-lead': 'La note selon la grille écrite avec le client, la priorité, le délai cible ; doublon sur l’empreinte du contact (question 27). Aucun modèle.',
  'lib-decider': 'Carte, pilote ou rien ; niveau 1 à 3 ; copie figée des listes du pilote (comparée au code) plus les gestes de p5:226 (Amendement B1).',
}
export function sdkEnfant(nom, reglages, copie) {
  const contrat = `${nom}@1`
  return `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';
const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par un parent', position: [0, 0], parameters: { inputSource: 'passthrough' } } });
const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[nom]), `contrat: ${contrat}`, [240, 0])};
const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};
const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', 'porte: simulation\nVrai : simulation, rien ne part. Faux : l\'effet réel, non branché en mode A.')};
const logique = ${CODE_(LOGIQUES[nom], codeLogique(nom, copie), null, [960, -80])};
const arret = ${ARRET([960, 80])};
const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [1240, 0])};
const note = sticky(${JSON.stringify(`## ${nom} (035-004)\n${NOTES[nom]}\nGabarit partagé, couche ${COUCHES[nom]}. Contrat ${contrat} (enveloppe@1), gabarit « Contrat » de 035-003.\nINACTIF, en simulation (mode A) : rien n'est lu ni écrit en base, rien n'est envoyé ; tout part dans effets_prevus.\nJuge : scripts/lib-metier-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });
export default workflow(${JSON.stringify(nom)}, ${JSON.stringify(nom)}, { settings: ${JSON.stringify(reglages)} })
  .add(appele)
  .to(entree)
  .to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))
  .add(note);
`
}

// ─── Le banc lib-banc-metier : la chaîne capture → qualification → décision sur « Exemple. Bâti-Démo » (035-006) ───────────────────
const ORG = '00000000-0000-4000-8000-000000000001'
export const empreinteDe = (org, contact) => createHash('sha256').update(org + '|' + String(contact).toLowerCase().replace(/[\s.-]/g, ''), 'utf8').digest('hex')
// Ce que rendrait la lecture prévue sur la table leads du jeu fictif : les seules colonnes permises, l'empreinte à la place du contact.
// Le jeu n'a ni urgence ni type_chantier (colonnes que l'app remplit) : on les tire ici, hors ligne, du jeu fictif, marqués « Exemple. ».
// etat_capture : « à traiter » pour les demandes au statut « nouveau » et pour deux cas limites (…0103 doublon, …0130 sans contact).
export function lignesBatiDemo() {
  const demandes = JSON.parse(readFileSync(path.join(ICI, '../035-006/exemple/demandes.json'), 'utf8'))
  const lignes = demandes.map((x) => {
    const m = /pour (?:une|un) ([a-zàâçéèêëîïôûùüÿ ]+?)\./i.exec(x.message)
    return { id: x.id, artisan_id: x.artisan_id, statut: x.statut, canal: x.canal, origine: null,
      urgence: x.cas_limite === 'escalade' ? 'urgent' : 'normal', type_chantier: m ? 'Exemple. ' + m[1].charAt(0).toUpperCase() + m[1].slice(1) : null,
      created_at: new Date(x.created_at).toISOString(), contact_empreinte: x.contact ? empreinteDe(ORG, x.contact) : null,
      etat_capture: x.statut === 'nouveau' || ['…0103', '…0130'].includes('…' + x.id.slice(-4)) ? 'a_traiter' : 'traite' }
  })
  const escalade = demandes.filter((x) => ['escalade', 'litige'].includes(x.cas_limite)).map((x) => x.id)
  return { lignes, escalade }
}
const ENV_BANC = (nom) => `const env = (donnees, config, n) => ({ contrat: '${nom}@1', organisation_id: '${ORG}', simulation: true, cle_idempotence: 'exemple:banc:${nom.slice(4)}:' + (n || 0), trace: { execution_parent: 'Exemple. banc métier', declencheur: 'banc', tentative: 0 }, config: config, donnees: donnees });\n`
export const GRILLE_EXEMPLE = [{ critere: 'urgence=urgent', poids: 40 }, { critere: 'canal=formulaire', poids: 25 }, { critere: 'canal=site', poids: 25 }, { critere: 'canal=telephone', poids: 15 }, { critere: 'canal=email', poids: 15 }]
export function casBanc(copie) {
  const tout = lignesBatiDemo(), escalade = tout.escalade
  // La lecture prévue ne rend que les lignes « à traiter » (filtre etat_capture) ; on y ajoute …0102, déjà traitée, pour prouver la garde.
  const lignes = tout.lignes.filter((l) => l.etat_capture === 'a_traiter' || l.id.endsWith('0102'))
  // La recherche prévue des empreintes ne rend que celles des demandes déjà traitées qui égalent une empreinte du lot (contact_empreinte=in.(…)).
  const dulot = new Set(lignes.filter((l) => l.etat_capture === 'a_traiter').map((l) => l.contact_empreinte))
  const connues = tout.lignes.filter((l) => l.etat_capture === 'traite' && dulot.has(l.contact_empreinte)).map((l) => ({ empreinte: l.contact_empreinte, lead_id: l.id }))
  const capture = `// Exemple. Bâti-Démo (035-006) : les demandes à traiter telles que les rendrait la lecture prévue (colonnes permises, empreinte du contact,\n// jamais le contact), plus …0102, déjà traitée, pour prouver la garde.\n${ENV_BANC('lib-capturer-lead')}const LIGNES = ${JSON.stringify(lignes)};\nreturn [{ json: env({ lignes: LIGNES }, { source: 'leads', lot_max: 200 }, 1) }];`
  const versQualif = `// Banc : chaque événement capturé devient une demande de qualification. Grille « Exemple. » ; les empreintes déjà en base (celles du lot seulement) viennent du jeu fictif.\n${ENV_BANC('lib-qualifier-lead')}const CONNUES = ${JSON.stringify(connues)};\nconst GRILLE = ${JSON.stringify(GRILLE_EXEMPLE)};\nconst sortie = [];\nfor (const { json: s } of $input.all()) for (const ev of ((s.resultat || {}).evenements || [])) sortie.push({ json: env({ lead_id: ev.id, evenement_id: ev.id, empreinte_contact: ev.empreinte_contact, champs: ev.champs }, { grille: GRILLE, seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 }, empreintes_connues: CONNUES }, sortie.length) });\nreturn sortie;`
  const versDecision = `// Banc : chaque demande qualifiée devient une décision « répondre au prospect ». L'escalade est ce que relira le pilote au départ\n// (sujetEscalade, lib/pilote/regles.ts), marquée ici pour les cas limites du jeu (litige, escalade). Mode A : niveau 2 au plus, pilote pourtant\n// réglé « actif » : la décision reste une carte.\n${ENV_BANC('lib-decider')}const ESCALADE = ${JSON.stringify(escalade)};\nconst sortie = [];\nfor (const { json: s } of $input.all()) { const r = s.resultat; if (!r) continue; sortie.push({ json: env({ objet_type: 'demande', objet_id: r.lead_id, constat: { outil: 'valider_reponse_proposee', etape: 'premiere-reponse', escalade: ESCALADE.includes(r.lead_id) } }, { autonomie: { niveau_max: 2, niveau_defaut: 2, niveaux: {} }, plan: 'entreprise', pilote: { drapeau: true, actif: true, types: { reponse_prospect: true } }, parties_depuis_24h: 0 }, sortie.length) }); }\nreturn sortie;`
  const jamaisKit = [...new Set([...copie.OUTILS_JAMAIS_AUTO, ...GESTES_P5_226])]
  const gestes = `// Exemple. Chaque geste « jamais en automatique » (liste du code PLUS p5:226), réglé en automatique partout, niveau 3 permis, offre Entreprise :\n// chacun doit rester une carte (p5:315). Puis la même relance de devis sous Studio (jamais le niveau 3) et sous Signature (niveau 3).\n${ENV_BANC('lib-decider')}const GESTES = ${JSON.stringify(jamaisKit)};\nconst TOUT = { autonomie: { niveau_max: 3, niveau_defaut: 2 }, pilote: { drapeau: true, actif: true, types: ${JSON.stringify(Object.fromEntries(copie.TYPES_PILOTE.map((t) => [t, true])))} }, parties_depuis_24h: 0 };\nconst objet = (i) => '00000000-0000-4000-8000-' + String(300 + i).padStart(12, '0');\nconst sortie = GESTES.map((g, i) => ({ json: env({ objet_type: 'devis', objet_id: objet(i), constat: { outil: g, etape: 'geste', escalade: false } }, { ...TOUT, plan: 'entreprise' }, i) }));\nsortie.push({ json: env({ objet_type: 'devis', objet_id: objet(90), constat: { outil: 'relancer_devis', etape: 'palier-1', escalade: false, lignes: [{ prix_unitaire_ht_centimes: 4100, quantite: 2, source_prix: 'vos tarifs' }] } }, { ...TOUT, plan: 'studio' }, 90) });\nsortie.push({ json: env({ objet_type: 'devis', objet_id: objet(91), constat: { outil: 'relancer_devis', etape: 'palier-1', escalade: false, lignes: [{ prix_unitaire_ht_centimes: 4100, quantite: 2, source_prix: 'vos tarifs' }] } }, { ...TOUT, plan: 'signature' }, 91) });\nreturn sortie;`
  return { capture, versQualif, versDecision, gestes }
}
export const CODE_BILAN = "// Bilan agrégé, sans donnée : par contrat, le nombre de sorties par statut ; par décision, le nombre par action. Défaut : un effet fait en\n// simulation, un appel en erreur, ou un « pilote » sur un geste jamais automatique ou hors Signature et Entreprise.\nconst bilan = {}, actions = {};\nlet defauts = 0;\nfor (const { json: s } of $input.all()) {\n  const c = typeof s.contrat === 'string' ? s.contrat : 'appel en erreur';\n  bilan[c] = bilan[c] || {};\n  const st = typeof s.statut === 'string' ? s.statut : 'erreur';\n  bilan[c][st] = (bilan[c][st] || 0) + 1;\n  if (!s.contrat || st === 'erreur' || (s.simulation === true && Array.isArray(s.effets_faits) && s.effets_faits.length)) defauts++;\n  if (c === 'lib-decider@1' && s.resultat) { const k = s.resultat.action + ':' + s.resultat.motif; actions[k] = (actions[k] || 0) + 1; if (s.resultat.action === 'pilote' && /^(jamais_auto|geste_p5_226)$/.test(s.resultat.motif)) defauts++; }\n}\nreturn [{ json: { bilan: bilan, decisions: actions, defauts: defauts } }];"
export function sdkBanc(ids, idErreur, copie) {
  const c = casBanc(copie)
  const n = (nom, js, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${JSON.stringify(nom)}, position: ${JSON.stringify(pos)}, parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(js)} } } })`
  const appel = (nom, lib, pos) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${JSON.stringify(nom)}, position: ${JSON.stringify(pos)}, onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${JSON.stringify(ids[lib])} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
  return `import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';
const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });
const cas = ${n('Cas : Bâti-Démo', c.capture, [240, -120])};
const capturer = ${appel('Appeler lib-capturer-lead', 'lib-capturer-lead', [480, -120])};
const versQualif = ${n('Vers la qualification', c.versQualif, [720, -120])};
const qualifier = ${appel('Appeler lib-qualifier-lead', 'lib-qualifier-lead', [960, -120])};
const versDecision = ${n('Vers la décision', c.versDecision, [1200, -120])};
const decider = ${appel('Appeler lib-decider', 'lib-decider', [1440, -120])};
const gestes = ${n('Cas : gestes jamais automatiques', c.gestes, [240, 120])};
const deciderGestes = ${appel('Appeler lib-decider (gestes)', 'lib-decider', [480, 120])};
const bilan = ${n('Bilan du banc', CODE_BILAN, [1680, 0])};
const note = sticky(${JSON.stringify("## lib-banc-metier (035-004)\nBanc de la chaîne capture → qualification → décision, sur « Exemple. Bâti-Démo » (035-006) : seul appelant permis de lib-capturer-lead, lib-qualifier-lead et lib-decider tant qu'aucun parent ent-* n'existe (035-007).\nINACTIF, jamais publié. Simulation partout. Ne lit ni n'écrit rien en base, n'envoie rien.")}, [horloge, cas], { color: 4 });
export default workflow('lib-banc-metier', 'lib-banc-metier', { settings: ${JSON.stringify({ executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveManualExecutions: true, errorWorkflow: idErreur, callerPolicy: 'none' })} })
  .add(horloge).to(cas).to(capturer).to(versQualif).to(qualifier).to(versDecision).to(decider).to(bilan)
  .add(horloge).to(gestes).to(deciderGestes).to(bilan)
  .add(note);
`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/lib-metier'
  mkdirSync(dossier, { recursive: true })
  const copie = lireCodePilote()
  const erreur = arg('erreur') || 'yekMM9ewk03F9y2q'
  for (const nom of ENFANTS) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkEnfant(nom, reglagesEnfant(erreur, arg('appelants')), copie))
  const ids = arg('ids') ? JSON.parse(arg('ids')) : null
  if (ids) writeFileSync(path.join(dossier, 'lib-banc-metier.sdk.js'), sdkBanc(ids, erreur, copie))
  console.log(`SDK écrits dans ${dossier} : ${ENFANTS.join(', ')}${ids ? ', lib-banc-metier' : ''} ; copie du pilote : ${copie.OUTILS_JAMAIS_AUTO.length} gestes jamais auto, ${copie.OUTILS_EXECUTABLES_PILOTE.length} pilotables, offres ${copie.PLANS_PILOTE.join('/')}`)
}
