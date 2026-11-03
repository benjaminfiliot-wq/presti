// presti-relances : la DÉCISION des relances de conversation (J+2, J+5, J+10), refaite depuis app/api/cron/relances/route.ts:58-203 et
// lib/relancesRegistre.ts : pour chaque relance due, dans l'ordre de l'ancien passage — lead clos, main prise, offre sans plateforme, compte
// suspendu ou en pause, un seul contact par passage, registre commun de 3 jours, sujet d'escalade, compte de démonstration, puis Studio
// (préparée « à valider ») ou Signature (part seule). Code pur : rien n'est envoyé, rien n'est écrit, aucun modèle n'est appelé.
// Les listes de mots, les expressions et les offres viennent de lib/pilote/regles.ts, lib/plans.ts et lib/plateformeConfig.ts par generer.mjs
// (jamais retapées) ; copie figée contrôlée par scripts/relances-n8n-qa.mjs, qui rejoue la VRAIE route sur des cas fictifs.
const MOTS_TOUJOURS = @@MOTS_TOUJOURS@@;
const MOTS_ENTIERS = @@MOTS_ENTIERS@@;
@@REGEX@@
const OFFRES = @@OFFRES@@;
const ESCALADE_DEFAUT = @@ESCALADE_DEFAUT@@;
const MAX_PAR_PASSAGE = 100;
const MAX_ENVOIS = 80;
const MESSAGES_RELUS = 10;
const DELAI_REGISTRE_MS = 3 * 86400000;
const ADRESSE_SURE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const passage = $('Passage').first().json.passage;
const maintenant = Date.parse(passage);
const lire = (nom) => $(nom).all().map((i) => i.json).filter((x) => x && typeof x === 'object');
const texte = (v) => (typeof v === 'string' ? v : '');
const offre = (plan) => (typeof plan === 'string' && Object.prototype.hasOwnProperty.call(OFFRES, plan) ? OFFRES[plan] : OFFRES['*']);
const sansAccents = (s) => texte(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const enMots = (s) => ' ' + sansAccents(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const RACINES_TOUJOURS = MOTS_TOUJOURS.map((m) => [m, enMots(m).trim()]);
const RACINES_ENTIERES = MOTS_ENTIERS.map((m) => [m, enMots(m).trim()]);
// lib/pilote/regles.ts : sujetEscalade (les sujets qu'aucun réglage ne retire, puis les mots de l'artisan).
const sujetEscalade = (messages, motsArtisan) => {
  const artisan = (Array.isArray(motsArtisan) ? motsArtisan : []).filter((m) => typeof m === 'string').map((m) => [m, sansAccents(m).trim()]).filter(([, k]) => k !== '');
  for (const brut of messages) {
    if (typeof brut !== 'string' || !brut.trim()) continue;
    const mots = enMots(brut).replace(NOMS_NEUTRES, ' ').replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ');
    for (const [m, k] of RACINES_TOUJOURS) if (k && mots.includes(' ' + k)) return m;
    for (const [m, k] of RACINES_ENTIERES) if (k && mots.includes(' ' + k + ' ')) return m;
    if (PERTE_D_EAU.test(mots)) return 'perte d’eau';
    if (APPAREIL_PERD.test(mots)) return 'perte d’eau';
    if (mots.includes(' ca sent ')) return 'ça sent';
    const brutSansNoms = sansAccents(brut).replace(NOMS_NEUTRES, ' ');
    for (const [m, k] of artisan) if (brutSansNoms.includes(k)) return m;
  }
  return null;
};
const par = (liste, cle) => { const o = {}; liste.forEach((x) => { if (typeof x[cle] === 'string') (o[x[cle]] = o[x[cle]] || []).push(x); }); return o; };
const dues = lire('Lire relances dues').filter((r) => typeof r.id === 'string' && typeof r.lead_id === 'string' && typeof r.planifiee_le === 'string' && Date.parse(r.planifiee_le) <= maintenant)
  .sort((a, b) => Date.parse(a.planifiee_le) - Date.parse(b.planifiee_le) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, MAX_PAR_PASSAGE);
const leads = {}; lire('Lire demandes').forEach((l) => { if (typeof l.id === 'string') leads[l.id] = l; });
const comptes = {}; lire('Lire comptes').forEach((c) => { if (typeof c.id === 'string') comptes[c.id] = c; });
const reglages = {}; lire('Lire reglages').forEach((r) => { if (typeof r.artisan_id === 'string') reglages[r.artisan_id] = r; });
const suspendus = new Set(lire('Lire suspensions').map((s) => s.artisan_id).filter((x) => typeof x === 'string'));
const entrants = par(lire('Lire messages entrants'), 'lead_id');
const devisDe = par(lire('Lire devis'), 'lead_id');
const facturesDe = par(lire('Lire factures'), 'devis_id');
const actionsDe = par(lire('Lire actions assistant'), 'objet_id');
const rappelsDe = par(lire('Lire rappels CRM'), 'devis_id');
const impayesDe = par(lire('Lire relances impayes'), 'facture_id');
const exclusions = lire('Lire exclusions').filter((e) => typeof e.artisan_id === 'string');
// lib/relancesRegistre.ts : le dossier d'une conversation (ses devis, leurs factures) a-t-il été relancé par un AUTRE chemin depuis moins de
// 3 jours ? (sauf « conversation » : les relances de conversation gardent leur calendrier). Une date illisible compte comme récente.
const registreRecent = (lead) => {
  const devis = (devisDe[lead.id] || []).filter((d) => d.artisan_id === lead.artisan_id);
  const devisIds = devis.map((d) => d.id);
  const factureIds = devisIds.flatMap((id) => (facturesDe[id] || []).filter((f) => f.artisan_id === lead.artisan_id).map((f) => f.id));
  const traces = [
    ...[...devisIds, ...factureIds].flatMap((id) => (actionsDe[id] || []).map((a) => a.maj_le)),
    ...devisIds.flatMap((id) => (rappelsDe[id] || []).map((r) => r.envoye_le)),
    ...factureIds.flatMap((id) => (impayesDe[id] || []).map((r) => r.envoyee_le)),
  ];
  return traces.some((le) => { const t = Date.parse(String(le)); return !Number.isFinite(t) || maintenant - t < DELAI_REGISTRE_MS; });
};
// « Ne plus relancer ce client » (migration 0185) : une exclusion en cours sur la conversation, ou sur un client de ses devis.
const exclu = (lead) => {
  const clients = new Set((devisDe[lead.id] || []).filter((d) => d.artisan_id === lead.artisan_id).map((d) => d.client_id).filter((c) => typeof c === 'string'));
  return exclusions.some((e) => e.artisan_id === lead.artisan_id && ((typeof e.lead_id === 'string' && e.lead_id === lead.id) || (typeof e.client_id === 'string' && clients.has(e.client_id))));
};
// lib/relances.ts : sujetDuFil — les 10 derniers messages ENTRANTS et la demande d'origine, avec les mots de l'artisan.
const sujetDuFil = (lead) => {
  const reg = reglages[lead.artisan_id];
  const mots = reg && Object.prototype.hasOwnProperty.call(reg, 'escalade_mots') ? reg.escalade_mots : ESCALADE_DEFAUT;
  const derniers = (entrants[lead.id] || []).slice().sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)).slice(0, MESSAGES_RELUS).map((m) => m.contenu);
  return sujetEscalade([...derniers, lead.message ?? null], mots);
};
const actif = (prefs) => !prefs || typeof prefs !== 'object' || prefs.proposition !== false;
const sortie = [];
const contactes = new Set();
let envois = 0;
let plafond = false;
const rendre = (r, effet, decision, motif, extra) => sortie.push({ json: { courrier: 'decision', relance_id: r.id, lead_id: r.lead_id, rang: r.rang ?? 1, effet, decision, motif, mot: null, envoi: null, avis: null, simulation: true, ...extra } });
for (const r of dues) {
  // Plafond du jour atteint plus haut : l'ancien passage s'arrête (break), le reste de la liste reste dû.
  if (plafond) { rendre(r, 'reste_due', 'reste_due', 'plafond'); continue; }
  const lead = leads[r.lead_id];
  if (!lead) { rendre(r, 'annulee', 'annulee', 'lead_absent'); continue; }
  if (lead.statut !== 'repondu') { rendre(r, 'annulee', 'annulee', 'lead_clos'); continue; }
  if (lead.prise_en_main === true) { rendre(r, 'annulee', 'annulee', 'prise_en_main'); continue; }
  const artisan = comptes[lead.artisan_id];
  if (!artisan) { rendre(r, 'annulee', 'annulee', 'compte_absent'); continue; }
  if (!offre(artisan.is_founder ? 'business' : artisan.plan).plateforme) { rendre(r, 'annulee', 'annulee', 'sans_plateforme'); continue; }
  if (exclu(lead)) { rendre(r, 'annulee', 'annulee', 'exclu'); continue; }
  if (suspendus.has(lead.artisan_id)) { rendre(r, 'reste_due', 'reste_due', 'suspendu'); continue; }
  if (artisan.leads_pause === true) { rendre(r, 'reste_due', 'reste_due', 'pause_artisan'); continue; }
  if (contactes.has(lead.id)) { rendre(r, 'reste_due', 'reste_due', 'un_seul_par_passage'); continue; }
  if (registreRecent(lead)) { rendre(r, 'reste_due', 'reste_due', 'registre_recent'); continue; }
  const sujet = sujetDuFil(lead);
  if (sujet) { rendre(r, 'annulee', 'annulee', 'escalade', { mot: sujet }); continue; }
  if (artisan.is_founder) { rendre(r, 'annulee', 'annulee', 'fondateur'); continue; }
  if (!offre(artisan.plan).relances_auto) {
    // Studio : la relance est PRÉPARÉE (messages.etat = 'proposition'), l'artisan est prévenu ; elle part au clic, jamais seule.
    contactes.add(lead.id);
    let avis;
    const dest = texte(artisan.email).trim();
    if (!dest) avis = 'sans_email';
    else if (!actif(artisan.notifications)) avis = 'desactive';
    else if (/\.invalid$/i.test(dest)) avis = 'adresse_de_test';
    else if (!ADRESSE_SURE.test(dest)) avis = 'adresse_atypique';
    else if (envois >= MAX_ENVOIS) avis = 'plafond';
    else { envois++; avis = 'proposition'; }
    rendre(r, 'prise', 'prepare', 'studio', { avis });
    continue;
  }
  // Signature : la relance part seule, avec la mention d'IA (courriers.js), seulement si le contact est une adresse e-mail.
  const contact = texte(lead.contact);
  let envoi;
  if (!contact.includes('@')) envoi = contact ? 'pas_un_courriel' : 'sans_coordonnees';
  else if (/\.invalid$/i.test(contact.trim())) { envoi = 'adresse_de_test'; contactes.add(lead.id); }
  else if (!ADRESSE_SURE.test(contact.trim())) { rendre(r, 'reste_due', 'reste_due', 'adresse_atypique'); continue; }
  else if (envois >= MAX_ENVOIS) { plafond = true; rendre(r, 'reste_due', 'reste_due', 'plafond'); continue; }
  else { envois++; envoi = 'a_envoyer'; contactes.add(lead.id); }
  rendre(r, 'prise', 'part_seul', 'signature', { envoi });
}
return sortie;
