// 036-014 — le code des nœuds Code des trois gabarits outillés (devis, suivi, facturation). RÈGLES DE L'ÉCRITURE (le juge les lit sur l'arbre syntaxique) :
//   • aucun opérateur arithmétique (+ - * / % **, ++, --) : un montant n'est jamais calculé ici, il est LU (centimes entiers ou texte rendus par la base ou
//     le code de l'application) ; les textes se composent par `.concat()` et `.join()`, jamais par `+` ;
//   • aucun module, aucun réseau, aucun environnement (R19 du juge commun) ;
//   • une valeur absente vaut « ne rien faire » (côté sûr).
export const COMPTE = '00000000-0000-4000-8000-0000000000e1' // Exemple. Un gabarit n'a pas de compte : la copie du client y pose celui de l'artisan.
const LIRE = "const rows = (nom) => $(nom).all().map((i) => i.json).filter((j) => j && typeof j === 'object' && Object.keys(j).length > 0);"

// ════════════════════════════ DEVIS ════════════════════════════
export const DEVIS = {
  'Préparer': String.raw`// Exemple. Gabarit sans compte : l'organisation_id (le compte de l'artisan) est posé dans la copie du client, jamais saisi ici.
return [{ json: { organisation_id: '${COMPTE}', departement: 'devis' } }];`,

  'Constituer le dossier': String.raw`// Un seul dossier par passage. Interrupteurs fermés, lecture absente, clé déjà faite : rien (côté sûr). Simulation par défaut : seul « simulation: false » la lève.
${LIRE}
const cfg = rows('Relire la configuration')[0];
if (!cfg || cfg.interrupteur_general !== true || cfg.interrupteur_departement !== true) return [];
const simulation = cfg.simulation !== false;
const deja = Array.isArray(cfg.cles_existantes) ? cfg.cles_existantes : [];
const demande = rows('Lire les demandes à chiffrer').find((d) => d.lead_id && d.qualifiee === true && !deja.includes('devis:'.concat(d.lead_id)));
if (!demande) return [];
return [{ json: {
  organisation_id: $('Préparer').first().json.organisation_id,
  cle: 'devis:'.concat(demande.lead_id),
  simulation,
  lead_id: demande.lead_id,
  devis_id: demande.devis_id ?? null,
  escalade: demande.escalade !== false,
  resume_demande: String(demande.resume_demande ?? '').slice(0, 1500),
  enseigne: String(cfg.enseigne ?? '').slice(0, 70),
  offre: cfg.offre ?? null,
  capacites: Array.isArray(cfg.capacites) ? cfg.capacites : [],
  pilote: cfg.pilote && typeof cfg.pilote === 'object' ? cfg.pilote : {},
  parties_depuis_24h: cfg.parties_depuis_24h ?? null,
  plafond_jour: cfg.plafond_jour ?? null,
  boite: cfg.boite === 'outlook' ? 'outlook' : 'gmail',
  stockage: cfg.stockage === 'onedrive' ? 'onedrive' : 'drive',
  signature_electronique: ['yousign', 'docusign'].includes(cfg.signature_electronique) ? cfg.signature_electronique : 'aucune',
  annulation_ecoulee: demande.delai_annulation_ecoule === true,
  tarifs: rows('Lire les tarifs'),
  reperes: rows('Lire les repères de prix'),
  enregistrement_modele: simulation ? (demande.enregistrement_modele ?? null) : null,
  lectures_simulees: { configuration: [cfg], devis: rows('Lire les devis prêts'), lignes: rows('Lire les lignes des devis') },
} }];`,

  'Modèle enregistré (simulation)': String.raw`// Exemple. Sortie de modèle ENREGISTRÉE le 03/11/2026, jamais un appel : en simulation le modèle n'est pas appelé (OUTILLAGE.md O4).
// Un essai peut fournir la sienne dans la demande (enregistrement_modele), honorée seulement quand la simulation est vraie.
const ENREGISTRE = { resume: 'Exemple. Pose de la porte et finitions.', lignes: [{ designation: 'Exemple. Pose', quantite: 1, unite: 'forfait', reference_tarif: 'REF-POSE', motif: 'Exemple.' }] };
return [{ json: { output: $input.first().json.enregistrement_modele ?? ENREGISTRE } }];`,

  'Revalider les lignes': String.raw`// R18 : la sortie du modèle repasse le schéma, hors schéma = rejet. Le MODÈLE rédige des libellés et des quantités, JAMAIS un prix : le prix de chaque ligne
// est LU dans les tarifs de l'artisan (entier en centimes, rendu par la base) ; sans tarif sourcé la ligne est « estimée » et n'a pas de prix.
// Aucun montant n'est calculé ici : ni somme, ni produit, ni conversion. Le total vient du chef presti-dep-devis, qui le lit dans la base.
const dossier = $('Constituer le dossier').first().json;
const brut = $input.first().json.output;
const CLES = ['designation', 'quantite', 'unite', 'reference_tarif', 'motif'];
const SOURCE_OK = /^(vos tarifs|tarif de l.artisan|prix donn[ée] par l.artisan)/i;
const rejet = (m) => { throw new Error('hors schéma : '.concat(m)); };
if (!brut || typeof brut !== 'object' || Array.isArray(brut)) rejet('sortie');
for (const k of Object.keys(brut)) if (!['resume', 'lignes'].includes(k)) rejet('clé '.concat(k));
if (!Array.isArray(brut.lignes) || brut.lignes.length < 1 || brut.lignes.length > 40) rejet('lignes');
const parReference = new Map(dossier.tarifs.map((t) => [t.reference, t]));
const lignes = brut.lignes.map((l, rang) => {
  if (!l || typeof l !== 'object' || Array.isArray(l)) rejet('ligne');
  for (const k of Object.keys(l)) if (!CLES.includes(k)) rejet('clé de ligne '.concat(k));
  if (typeof l.designation !== 'string' || l.designation.trim() === '' || l.designation.length > 120) rejet('désignation');
  if (typeof l.quantite !== 'number' || !Number.isFinite(l.quantite) || l.quantite <= 0 || l.quantite > 100000) rejet('quantité');
  const tarif = typeof l.reference_tarif === 'string' ? parReference.get(l.reference_tarif) : undefined;
  const prix = tarif && Number.isInteger(tarif.prix_unitaire_ht_centimes) && tarif.prix_unitaire_ht_centimes > 0 ? tarif.prix_unitaire_ht_centimes : null;
  const source = tarif && typeof tarif.source_prix === 'string' ? tarif.source_prix.trim() : '';
  const sourcee = prix !== null && SOURCE_OK.test(source);
  // Un prix pratiqué sur un ancien chantier est un REPÈRE cité (B9), LU dans la base : il ne rend jamais une ligne sourcée.
  const repere = typeof l.reference_tarif === 'string' ? dossier.reperes.find((r) => r.reference === l.reference_tarif) : undefined;
  return { rang, designation: l.designation.trim(), quantite: l.quantite, unite: String(l.unite ?? ''), reference_tarif: tarif ? tarif.reference : null,
    prix_unitaire_ht_centimes: sourcee ? prix : null, source_prix: sourcee ? source : null, statut_prix: sourcee ? 'source' : 'estime',
    repere: sourcee || !repere ? null : { affiche: repere.repere_affiche, chantier_le: repere.repere_chantier_le } };
});
return [{ json: { cle: dossier.cle, lignes, tous_prix_sources: lignes.every((l) => l.statut_prix === 'source') } }];`,

  "Préparer l'appel du chef": String.raw`// L'enveloppe@1 du chef presti-dep-devis : il lit les montants dans la base (ou, en simulation, dans les lectures que ce gabarit a faites) et rend le total
// déjà écrit par le code de l'application. Un devis que l'application n'a pas encore chiffré (devis_id nul) n'est pas confié au chef : carte « à chiffrer ».
const dossier = $('Constituer le dossier').first().json;
const evenement = { id: dossier.lead_id, artisan_id: dossier.organisation_id, type: 'devis_a_preparer', cle: dossier.cle,
  donnees: { lead_id: dossier.lead_id, devis_id: dossier.devis_id, qualifiee: true, escalade: dossier.escalade } };
return [{ json: {
  contrat: 'presti-dep-devis@1',
  organisation_id: dossier.organisation_id,
  simulation: dossier.simulation,
  cle_idempotence: 'dep:'.concat(dossier.cle),
  trace: { execution_parent: 'gabarit-artisan-devis', declencheur: 'gabarit-artisan-devis', tentative: 0 },
  config: dossier.simulation ? { lectures_simulees: dossier.lectures_simulees } : {},
  donnees: { evenements: dossier.devis_id ? [evenement] : [] },
} }];`,

  'Décider de la voie': String.raw`// Copie de la règle du pilote (lib/pilote/regles.ts, decisionPilote pour envoi_devis) : l'envoi seul exige Signature, pilote actif, type activé, aucune
// escalade, TOUTES les lignes sourcées (par le chef ET par la revalidation), plafond non atteint, délai d'annulation écoulé. Sinon : brouillon (Studio) ou carte.
// Le total affiché est celui du chef, recopié tel quel. Une réponse du chef absente ou en erreur : carte (côté sûr).
const dossier = $('Constituer le dossier').first().json;
const revalide = $('Revalider les lignes').first().json;
const chef = $input.first().json;
const resultat = chef && chef.resultat && typeof chef.resultat === 'object' ? chef.resultat : {};
const pret = Array.isArray(resultat.devis_prets) ? resultat.devis_prets.find((p) => p.devis_id === dossier.devis_id) : undefined;
const peut = (c) => dossier.capacites.includes(c);
const pilote = dossier.pilote;
const type_actif = pilote.drapeau === true && pilote.actif === true && Boolean(pilote.types) && pilote.types.envoi_devis === true;
let voie = 'carte';
let motif = 'a_chiffrer';
if (dossier.devis_id && pret) {
  if (dossier.escalade) { voie = 'carte'; motif = 'escalade'; }
  else if (!peut('assistant.pilote')) { voie = 'brouillon'; motif = 'studio'; }
  else if (!type_actif) { voie = 'brouillon'; motif = 'type_inactif'; }
  else if (pret.tous_prix_sources !== true || revalide.tous_prix_sources !== true) { voie = 'carte'; motif = 'prix_non_source'; }
  else if (!(dossier.parties_depuis_24h < dossier.plafond_jour)) { voie = 'carte'; motif = 'plafond'; }
  else if (dossier.annulation_ecoulee !== true) { voie = 'carte'; motif = 'annulation_en_cours'; }
  else { voie = 'envoi'; motif = 'prix_sources'; }
}
const numero = pret ? pret.numero : null;
const total = pret ? pret.total_ttc_affiche : null;
return [{ json: {
  cle: dossier.cle, simulation: dossier.simulation, voie, motif, devis_id: dossier.devis_id, lead_id: dossier.lead_id, organisation_id: dossier.organisation_id,
  boite: dossier.boite, stockage: dossier.stockage, signature_electronique: dossier.signature_electronique, enseigne: dossier.enseigne,
  numero, total_affiche: total,
  texte_mail: ['Bonjour,', '', 'Veuillez trouver ci-joint votre devis ', numero, ', d’un montant total de ', total, '.'].join(''),
} }];`,

  'Effets prévus': String.raw`// Branche « simulation » : rien n'est lu, écrit ni envoyé ; ce qui serait fait part au journal. Les montants et textes sont ceux du chef, recopiés.
const d = $input.first().json;
const prevus = [];
if (d.voie === 'envoi' || d.voie === 'brouillon') {
  prevus.push('pdf_'.concat(d.stockage));
  prevus.push(d.voie === 'envoi' ? 'envoi_'.concat(d.boite) : 'brouillon_'.concat(d.boite));
  if (d.voie === 'envoi' && d.signature_electronique !== 'aucune') prevus.push('signature_'.concat(d.signature_electronique));
}
prevus.push('registre');
return [{ json: { cle: d.cle, simulation: true, voie: d.voie, motif: d.motif, numero: d.numero, total_affiche: d.total_affiche, effets_prevus: prevus, effets_faits: [] } }];`,

  'Bilan': String.raw`// Branche réelle : ce qui a été fait, d'après les nœuds exécutés.
const d = $('Décider de la voie').first().json;
return [{ json: { cle: d.cle, simulation: false, voie: d.voie, motif: d.motif, numero: d.numero, effets_faits: [d.voie] } }];`,
}

// ════════════════════════════ SUIVI ════════════════════════════
export const SUIVI = {
  'Préparer': String.raw`// Exemple. Gabarit sans compte : l'organisation_id est posé dans la copie du client, jamais saisi ici.
return [{ json: { organisation_id: '${COMPTE}', departement: 'suivi' } }];`,

  'Constituer la relance due': String.raw`// STOP, opposition, main reprise, exclu, client sensible, dossier clos : rien ne part. Une valeur ABSENTE vaut « ne pas relancer » (côté sûr : seules les valeurs
// « faux » écrites par la base laissent passer). Un seul dossier par passage, le devis avant la conversation (comme lib-controler-conflit).
${LIRE}
const cfg = rows('Relire la configuration')[0];
if (!cfg || cfg.interrupteur_general !== true || cfg.interrupteur_departement !== true) return [];
const simulation = cfg.simulation !== false;
const deja = Array.isArray(cfg.cles_existantes) ? cfg.cles_existantes : [];
const OUVERTS = ['envoye', 'repondu', 'nouveau'];
const sure = (r) => r.stop === false && r.opposition === false && r.main_prise === false && r.exclu === false && r.sensible === false && OUVERTS.includes(r.statut);
const paliers = (r) => (r.objet_type === 'devis' ? cfg.paliers_devis_jours : cfg.paliers_conversation_jours);
const rangDe = (r) => (Array.isArray(r.paliers_envoyes) ? r.paliers_envoyes.length : 99);
const cleDe = (r) => ['relance', r.objet_type, r.objet_id, String(rangDe(r))].join(':');
const due = (r) => { const p = paliers(r); return Array.isArray(p) && rangDe(r) < p.length && r.jours_depuis_dernier >= p[rangDe(r)] && !deja.includes(cleDe(r)); };
const dues = rows('Lire les relances dues').filter((r) => sure(r) && due(r));
const r = dues.find((x) => x.objet_type === 'devis') ?? dues[0];
if (!r) return [];
return [{ json: {
  organisation_id: $('Préparer').first().json.organisation_id, cle: cleDe(r), simulation,
  objet_type: r.objet_type, objet_id: r.objet_id, dossier_id: r.dossier_id, statut: r.statut, canal: r.canal, rang: rangDe(r),
  main_prise: r.main_prise, exclu: r.exclu, carte: r.carte ?? null, ecartee_le: r.ecartee_le ?? null, stop: r.stop, historique: r.historique ?? { ok: false },
  mots_escalade_artisan: Array.isArray(cfg.mots_escalade_artisan) ? cfg.mots_escalade_artisan : [], maintenant: cfg.maintenant,
  enseigne: String(cfg.enseigne ?? '').slice(0, 70), offre: cfg.offre ?? null, capacites: Array.isArray(cfg.capacites) ? cfg.capacites : [],
  pilote: cfg.pilote && typeof cfg.pilote === 'object' ? cfg.pilote : {}, parties_depuis_24h: cfg.parties_depuis_24h ?? null, plafond_jour: cfg.plafond_jour ?? null,
  boite: cfg.boite === 'outlook' ? 'outlook' : 'gmail', sms_api: cfg.sms_api === 'twilio' ? 'twilio' : 'aucune', expediteur: cfg.expediteur ?? null,
  annulation_ecoulee: r.delai_annulation_ecoule === true,
  enregistrement_modele: simulation ? (r.enregistrement_modele ?? null) : null,
} }];`,

  "Préparer l'appel du contrôleur": String.raw`// L'enveloppe@1 de lib-controler-conflit (A20) : dossier clos, client en discussion, main reprise, exclu, client sensible, déjà en cours, déjà relancé.
// Aucun texte de client n'est lu par n8n : le tableau des messages entrants reste vide (une lecture manquante vaut « rien », côté sûr).
const d = $input.first().json;
return [{ json: {
  contrat: 'lib-controler-conflit@1', organisation_id: d.organisation_id, simulation: d.simulation, cle_idempotence: 'conflit:'.concat(d.cle),
  trace: { execution_parent: 'gabarit-artisan-suivi', declencheur: 'gabarit-artisan-suivi', tentative: 0 },
  config: { mots_escalade_artisan: d.mots_escalade_artisan },
  donnees: { objet_type: d.objet_type, objet_id: d.objet_id, dossier_id: d.dossier_id, statut: d.statut, main_prise: d.main_prise, exclu: d.exclu, carte: d.carte,
    ecartee_le: d.ecartee_le, historique: d.historique, stop: d.stop, messages_entrants: [], maintenant: d.maintenant },
} }];`,

  'Modèle enregistré (simulation)': String.raw`// Exemple. Sortie de modèle ENREGISTRÉE le 03/11/2026, jamais un appel. Un essai peut fournir la sienne (enregistrement_modele), honorée en simulation seulement.
const ENREGISTRE = { objet: 'Exemple. Un petit mot sur votre devis', texte: 'Exemple. Bonjour, je reviens vers vous au sujet de votre demande. Avez-vous eu le temps d’y réfléchir ? Je reste disponible pour en parler.' };
const dossier = $('Constituer la relance due').first().json;
return [{ json: { output: dossier.enregistrement_modele ?? ENREGISTRE } }];`,

  'Revalider le message': String.raw`// R18 : schéma strict, hors schéma = rejet. La relance d'un devis ou d'une conversation ne porte AUCUN montant ni lien (les montants se disent dans le devis, pas dans le message) ;
// un texte qui en contient est rejeté, jamais corrigé.
const dossier = $('Constituer la relance due').first().json;
const brut = $input.first().json.output;
const rejet = (m) => { throw new Error('hors schéma : '.concat(m)); };
if (!brut || typeof brut !== 'object' || Array.isArray(brut)) rejet('sortie');
for (const k of Object.keys(brut)) if (!['objet', 'texte'].includes(k)) rejet('clé '.concat(k));
if (typeof brut.texte !== 'string' || brut.texte.trim().length < 20 || brut.texte.length > 600) rejet('texte');
if (typeof brut.objet !== 'string' || brut.objet.trim() === '' || brut.objet.length > 120) rejet('objet');
if (/[€$£]|\d\s*(€|eur|euros)\b|https?:|www\./i.test(brut.texte) || /[{}]/.test(brut.texte)) rejet('montant, lien ou variable dans le message');
return [{ json: { cle: dossier.cle, objet: brut.objet.trim(), texte: brut.texte.trim() } }];`,

  'Décider de la voie': String.raw`// Studio prépare (carte, relance à valider), Signature envoie seul : conversation si « relances.auto » ; devis si le pilote est actif et le type « relance_devis » activé
// (lib/pilote/regles.ts, decisionPilote) ; plafond du jour ; délai d'annulation écoulé. Le canal d'origine décide de la route d'envoi.
const dossier = $('Constituer la relance due').first().json;
const message = $input.first().json;
const peut = (c) => dossier.capacites.includes(c);
const pilote = dossier.pilote;
const type_actif = pilote.drapeau === true && pilote.actif === true && Boolean(pilote.types) && pilote.types.relance_devis === true;
const autorise = dossier.objet_type === 'devis' ? peut('assistant.pilote') && type_actif : peut('relances.auto');
let voie = 'carte';
let motif = 'studio';
if (autorise) {
  if (!(dossier.parties_depuis_24h < dossier.plafond_jour)) { voie = 'carte'; motif = 'plafond'; }
  else if (dossier.annulation_ecoulee !== true) { voie = 'carte'; motif = 'annulation_en_cours'; }
  else { voie = 'envoi'; motif = 'envoi_seul'; }
}
const canal = dossier.canal;
let route = 'sms_prepare';
if (canal === 'email') route = dossier.boite;
else if (['smtp', 'whatsapp', 'telegram'].includes(canal)) route = canal;
else if (canal === 'sms') route = dossier.sms_api === 'twilio' ? 'twilio' : 'sms_prepare';
return [{ json: {
  cle: dossier.cle, simulation: dossier.simulation, voie, motif, route, objet_type: dossier.objet_type, objet_id: dossier.objet_id, dossier_id: dossier.dossier_id,
  organisation_id: dossier.organisation_id, enseigne: dossier.enseigne, objet: message.objet, texte: message.texte, expediteur: dossier.expediteur, rang: dossier.rang,
} }];`,

  'Effets prévus': String.raw`// Branche « simulation » : rien n'est lu, écrit ni envoyé ; ce qui serait fait part au journal.
const d = $input.first().json;
const prevus = [];
if (d.voie === 'envoi') { prevus.push('envoi_'.concat(d.route)); prevus.push('registre'); prevus.push('conversation'); }
else prevus.push('carte');
return [{ json: { cle: d.cle, simulation: true, voie: d.voie, motif: d.motif, route: d.route, effets_prevus: prevus, effets_faits: [] } }];`,

  'SMS préparé': String.raw`// Pas d'API SMS choisie : le SMS est PRÉPARÉ, l'artisan l'ouvre d'un geste sur son téléphone (lib/sms/lien.ts:10). STOP obligatoire, ni lien ni montant.
const d = $('Décider de la voie').first().json;
const dest = $('Lire le destinataire').first().json;
const texte = [d.texte, 'Message rédigé et envoyé automatiquement par l’assistant de '.concat(d.enseigne, '.'), 'Répondez STOP pour ne plus être relancé.'].join(' ');
return [{ json: { cle: d.cle, sms_prepare: true, lien: 'sms:'.concat(String(dest.client_telephone ?? ''), '?body=', encodeURIComponent(texte)) } }];`,
}

// ════════════════════════════ FACTURATION ════════════════════════════
export const FACTURATION = {
  'Préparer': String.raw`// Exemple. Gabarit sans compte : l'organisation_id est posé dans la copie du client, jamais saisi ici.
return [{ json: { organisation_id: '${COMPTE}', departement: 'facturation' } }];`,

  'Constituer le dossier': String.raw`// Un seul dossier par passage, dans cet ordre : paiement lu dans Stripe, facture ÉMISE à envoyer, impayé échu, chantier terminé à facturer.
// Les montants sont LUS (centimes entiers et texte rendus par la base) et seulement COMPARÉS à ceux de Stripe, jamais calculés. Une valeur absente vaut « ne pas agir ».
${LIRE}
const cfg = rows('Relire la configuration')[0];
if (!cfg || cfg.interrupteur_general !== true || cfg.interrupteur_departement !== true) return [];
const simulation = cfg.simulation !== false;
const deja = Array.isArray(cfg.cles_existantes) ? cfg.cles_existantes : [];
const paiements = rows('Lire les paiements Stripe');
const factures = rows('Lire les factures');
const chantiers = rows('Lire les chantiers terminés');
const reglePayee = (f) => paiements.some((c) => c.paid === true && c.refunded !== true && c.metadata && c.metadata.facture_id === f.facture_id && c.amount === f.total_ttc_centimes);
const rangDe = (f) => (Array.isArray(f.paliers_envoyes) ? f.paliers_envoyes.length : 99);
const jours = cfg.relances_impayes && Array.isArray(cfg.relances_impayes.jours) ? cfg.relances_impayes.jours : [];
const optin = cfg.relances_impayes && cfg.relances_impayes.actif === true;
const cle = (type, f) => [type, f.facture_id ?? f.devis_id, type === 'relance_impaye' ? String(rangDe(f)) : ''].join(':');
const emises = factures.filter((f) => f.emise === true && f.statut === 'emise');
let kind = null;
let f = emises.find((x) => x.jours_retard > 0 && reglePayee(x) && !deja.includes(cle('paiement_lu', x)));
if (f) kind = 'paiement_lu';
if (!kind) { f = emises.find((x) => x.envoyee === false && x.stop === false && !deja.includes(cle('envoi_facture', x))); if (f) kind = 'envoi_facture'; }
if (!kind && optin) { f = emises.find((x) => x.jours_retard > 0 && !reglePayee(x) && x.stop === false && x.sensible === false && rangDe(x) < jours.length && x.jours_retard >= jours[rangDe(x)] && !deja.includes(cle('relance_impaye', x))); if (f) kind = 'relance_impaye'; }
if (!kind) { f = chantiers.find((x) => x.chantier_termine === true && x.deja_facturee === false && x.apercu_ok === true && !deja.includes(cle('facture_prete', x))); if (f) kind = 'facture_prete'; }
if (!kind) return [];
return [{ json: {
  organisation_id: $('Préparer').first().json.organisation_id, cle: cle(kind, f), simulation, kind, rediger: kind === 'relance_impaye',
  facture_id: f.facture_id ?? null, devis_id: f.devis_id ?? null, numero: f.numero ?? null, emise: f.emise ?? false, envoyee: f.envoyee ?? null, statut: f.statut ?? null,
  total_ttc_affiche: f.total_ttc_affiche ?? f.apercu_total_ttc_affiche ?? null, echeance_affichee: f.echeance_affichee ?? null, retard_affiche: f.retard_affiche ?? null,
  salutation: f.salutation ?? 'Madame, Monsieur', contestation: f.contestation ?? null, motif: f.motif ?? null, rang: rangDe(f), canal: f.canal ?? 'email',
  enseigne: String(cfg.enseigne ?? '').slice(0, 70), offre: cfg.offre ?? null, capacites: Array.isArray(cfg.capacites) ? cfg.capacites : [],
  pilote: cfg.pilote && typeof cfg.pilote === 'object' ? cfg.pilote : {}, parties_depuis_24h: cfg.parties_depuis_24h ?? null, plafond_jour: cfg.plafond_jour ?? null,
  boite: cfg.boite === 'outlook' ? 'outlook' : 'gmail', stockage: cfg.stockage === 'onedrive' ? 'onedrive' : 'drive', comptable: cfg.comptable === 'excel' ? 'excel' : 'sheets',
  annulation_ecoulee: f.delai_annulation_ecoule === true,
  enregistrement_modele: simulation ? (f.enregistrement_modele ?? null) : null,
} }];`,

  'Modèle enregistré (simulation)': String.raw`// Exemple. Sortie de modèle ENREGISTRÉE le 03/11/2026, jamais un appel. Les montants sont des variables que le CODE remplace : {montant}, {numero}, {echeance}, {retard}.
const ENREGISTRE = { objet: 'Exemple. Un rappel pour la facture {numero}', texte: 'Exemple. {client}, sauf erreur de ma part la facture {numero} de {montant}, échue le {echeance} ({retard}), reste à régler. Si le règlement est parti, ne tenez pas compte de ce message.' };
const dossier = $('Constituer le dossier').first().json;
return [{ json: { output: dossier.enregistrement_modele ?? ENREGISTRE } }];`,

  'Revalider le texte': String.raw`// R18 : schéma strict, hors schéma = rejet. Le MODÈLE n'écrit jamais un montant : il place des variables, que le CODE remplace par les valeurs LUES (texte rendu par la base).
// Un chiffre suivi d'un signe monétaire, un lien, ou une variable inconnue : rejet. Un dossier qui n'a pas de texte à rédiger passe tel quel.
const dossier = $('Constituer le dossier').first().json;
if (dossier.rediger !== true) return [{ json: { cle: dossier.cle, objet: null, texte: null } }];
const brut = $input.first().json.output;
const rejet = (m) => { throw new Error('hors schéma : '.concat(m)); };
if (!brut || typeof brut !== 'object' || Array.isArray(brut)) rejet('sortie');
for (const k of Object.keys(brut)) if (!['objet', 'texte'].includes(k)) rejet('clé '.concat(k));
if (typeof brut.texte !== 'string' || brut.texte.trim().length < 20 || brut.texte.length > 1500) rejet('texte');
if (typeof brut.objet !== 'string' || brut.objet.trim() === '' || brut.objet.length > 120) rejet('objet');
const VARIABLES = ['client', 'numero', 'montant', 'echeance', 'retard', 'artisan'];
const inconnues = (brut.texte.concat(' ', brut.objet).match(/\{[^}]*\}/g) ?? []).filter((v) => !VARIABLES.includes(v.replace(/[{}]/g, '')));
if (inconnues.length > 0) rejet('variable inconnue');
if (/[€$£]|\d\s*(€|eur|euros)\b|https?:|www\./i.test(brut.texte.concat(' ', brut.objet))) rejet('montant ou lien écrit par le modèle');
const valeurs = { client: dossier.salutation, numero: dossier.numero, montant: dossier.total_ttc_affiche, echeance: dossier.echeance_affichee, retard: dossier.retard_affiche, artisan: dossier.enseigne };
if (VARIABLES.some((v) => valeurs[v] === null || valeurs[v] === undefined)) rejet('valeur lue manquante');
const remplacer = (t) => { let out = t; for (const v of VARIABLES) out = out.replaceAll('{'.concat(v, '}'), String(valeurs[v])); return out; };
return [{ json: { cle: dossier.cle, objet: remplacer(brut.objet.trim()), texte: remplacer(brut.texte.trim()) } }];`,

  'Décider de la voie': String.raw`// Toujours une CARTE pour : la facture prête (creer_facture est dans OUTILS_JAMAIS_AUTO), le paiement lu dans Stripe (marquer payée est un clic de l'artisan), une contestation,
// un motif rangé autre que « oubli ». Une facture NON ÉMISE ne part jamais. L'envoi d'une facture émise et la relance d'impayé partent seuls en Signature, pilote actif,
// type activé (envoi_facture, relance_impaye), relance d'impayé ouverte par l'artisan (opt-in), plafond non atteint, délai d'annulation écoulé.
const d = $('Constituer le dossier').first().json;
const texte = $input.first().json;
const peut = (c) => d.capacites.includes(c);
const pilote = d.pilote;
const actif = (type) => pilote.drapeau === true && pilote.actif === true && Boolean(pilote.types) && pilote.types[type] === true;
let voie = 'carte';
let motif = d.kind;
if (d.kind === 'envoi_facture') {
  if (d.emise !== true) { voie = 'aucune'; motif = 'facture_non_emise'; }
  else if (peut('assistant.pilote') && actif('envoi_facture') && d.parties_depuis_24h < d.plafond_jour && d.annulation_ecoulee === true) { voie = 'envoi'; motif = 'envoi_facture'; }
  else motif = 'studio';
}
if (d.kind === 'relance_impaye') {
  const calme = d.contestation === false && (d.motif === null || d.motif === 'oubli');
  if (!calme) motif = 'a_relire';
  else if (peut('factures.relances.auto') && actif('relance_impaye') && d.parties_depuis_24h < d.plafond_jour && d.annulation_ecoulee === true) { voie = 'envoi'; motif = 'relance_impaye'; }
  else motif = 'studio';
}
const route = d.kind === 'relance_impaye' && d.canal === 'sms' ? 'sms_prepare' : d.boite;
return [{ json: {
  cle: d.cle, simulation: d.simulation, kind: d.kind, voie, motif, route, facture_id: d.facture_id, devis_id: d.devis_id, numero: d.numero, rang: d.rang, organisation_id: d.organisation_id,
  boite: d.boite, stockage: d.stockage, comptable: d.comptable, enseigne: d.enseigne, total_ttc_affiche: d.total_ttc_affiche, objet: texte.objet, texte: texte.texte,
  texte_mail: d.kind === 'envoi_facture' ? ['Bonjour,', '', 'Veuillez trouver ci-joint votre facture ', d.numero, ', d’un montant total de ', d.total_ttc_affiche, '.'].join('') : texte.texte,
} }];`,

  'Effets prévus': String.raw`// Branche « simulation » : rien n'est lu, écrit ni envoyé ; ce qui serait fait part au journal.
const d = $input.first().json;
const prevus = [];
if (d.voie === 'envoi' && d.kind === 'envoi_facture') { prevus.push('pdf_'.concat(d.stockage)); prevus.push('envoi_'.concat(d.boite)); prevus.push('export_'.concat(d.comptable)); prevus.push('registre'); }
else if (d.voie === 'envoi') { prevus.push(d.route === 'sms_prepare' ? 'sms_prepare' : 'envoi_'.concat(d.route)); prevus.push('registre'); }
else if (d.voie === 'carte') prevus.push('carte_'.concat(d.motif));
return [{ json: { cle: d.cle, simulation: true, kind: d.kind, voie: d.voie, motif: d.motif, effets_prevus: prevus, effets_faits: [] } }];`,

  'SMS préparé': String.raw`// Pas d'API SMS choisie : le SMS est PRÉPARÉ, l'artisan l'ouvre d'un geste sur son téléphone (lib/sms/lien.ts:10). STOP obligatoire, ni lien ni montant dans le texte du modèle.
const d = $('Décider de la voie').first().json;
const dest = $('Lire le destinataire').first().json;
const texte = [d.texte, 'Message rédigé et envoyé automatiquement par l’assistant de '.concat(d.enseigne, '.'), 'Répondez STOP pour ne plus être relancé.'].join(' ');
return [{ json: { cle: d.cle, sms_prepare: true, lien: 'sms:'.concat(String(dest.client_telephone ?? ''), '?body=', encodeURIComponent(texte)) } }];`,
}
