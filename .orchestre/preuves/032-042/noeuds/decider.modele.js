// presti-reponse-seule : la DÉCISION de la réponse qui part seule, refaite depuis app/api/leads/route.ts:283-320 (pause, plafond par artisan,
// puis decisionReponse de lib/plateformeConfig.ts:216-229 : main prise, modeEffectif, mot d'escalade de l'artisan, sujets d'escalade de
// lib/pilote/regles.ts, limite de messages, plage horaire). Code pur : rien n'est envoyé, rien n'est écrit, aucun modèle n'est appelé.
// Les listes de mots et les expressions viennent de lib/pilote/regles.ts par exporter.mjs (jamais retapées) ; copie figée contrôlée par
// scripts/reponse-seule-n8n-qa.mjs, qui rejoue la vraie fonction sur un corpus de messages.
const MOTS_TOUJOURS = @@MOTS_TOUJOURS@@;
const MOTS_ENTIERS = @@MOTS_ENTIERS@@;
@@REGEX@@
const PLANS_AUTO = @@PLANS_AUTO@@;
const MAX_PAR_ARTISAN = 8;
const RAFALE_MS = 600000;
const DEFAUT = { mode_reponse: 'assistee', auto_24_7: true, auto_debut: null, auto_fin: null, escalade_mots: @@ESCALADE_DEFAUT@@, limite_messages: 8 };
const fen = $('Fenetre du passage').first().json;
const lire = (nom) => $(nom).all().map((i) => i.json).filter((x) => x && typeof x === 'object' && typeof x.id === 'string');
const ordre = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const texte = (v) => (typeof v === 'string' ? v : '');
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
// lib/plateformeConfig.ts : motEscalade, heureFrance, dansLaPlage.
const motEscalade = (cfg, message) => {
  const n = sansAccents(message);
  for (const m of cfg.escalade_mots || []) { const k = sansAccents(m); if (k && n.includes(k)) return m; }
  return null;
};
const heureFrance = (d) => {
  try { return parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(d), 10); } catch (e) { return d.getUTCHours(); }
};
const dansLaPlage = (cfg, maintenant) => {
  if (cfg.auto_24_7 !== false) return true;
  const d = cfg.auto_debut, f = cfg.auto_fin;
  if (d == null || f == null) return true;
  const h = heureFrance(maintenant);
  return d <= f ? h >= d && h < f : h >= d || h < f;
};
const comptes = {};
lire('Lire comptes').forEach((c) => { comptes[c.id] = c; });
const reglages = {};
$('Lire reglages').all().map((i) => i.json).filter((x) => x && typeof x.artisan_id === 'string').forEach((r) => { reglages[r.artisan_id] = r; });
const rafale = lire('Lire rafale').sort(ordre);
const sortie = [];
const rendre = (lead, decision, motif, extra) => sortie.push({ json: { courrier: 'decision', lead_id: lead.id, decision, motif, mot: null, simulation: true, ...extra } });
for (const lead of lire('Lire demandes').sort(ordre)) {
  if (!(lead.created_at >= fen.debut && lead.created_at < fen.fin)) continue;
  const artisan = comptes[lead.artisan_id];
  if (!artisan) { sortie.push({ json: { courrier: 'ignore', lead_id: lead.id, raison: 'compte introuvable', simulation: true } }); continue; }
  // app/api/leads/route.ts:285 : la pause de l'artisan passe avant tout.
  if (artisan.leads_pause === true) { rendre(lead, 'refus', 'pause'); continue; }
  // app/api/leads/route.ts:296 : au plus huit demandes par artisan et par fenêtre de dix minutes (les suivantes sont gardées, sans réponse).
  const dansLaRafale = rafale.filter((r) => r.artisan_id === lead.artisan_id && r.created_at <= lead.created_at && Date.parse(r.created_at) > Date.parse(lead.created_at) - RAFALE_MS);
  const rang = dansLaRafale.filter((r) => r.created_at < lead.created_at || (r.created_at === lead.created_at && r.id <= lead.id)).length;
  if (rang > MAX_PAR_ARTISAN) { rendre(lead, 'refus', 'throttle'); continue; }
  // lib/plateformeConfig.ts:216-229 (decisionReponse) ; nbReponsesIA vaut 0 pour un premier message (route :319), prise_en_main est faux.
  const cfg = { ...DEFAUT, ...(reglages[lead.artisan_id] || {}) };
  const message = texte(lead.message);
  const verrou = cfg.mode_reponse === 'auto' && !PLANS_AUTO.includes(artisan.plan);
  const mode = verrou ? 'assistee' : cfg.mode_reponse;
  if (mode === 'manuelle') { rendre(lead, 'refus', 'manuelle'); continue; }
  const mot = motEscalade(cfg, message);
  if (mot) { rendre(lead, 'escalade', 'escalade', { mot }); continue; }
  if (mode === 'assistee') { rendre(lead, 'attend_artisan', verrou ? 'verrou_offre' : 'assistee'); continue; }
  const sujet = sujetEscalade([message], cfg.escalade_mots);
  if (sujet) { rendre(lead, 'escalade', 'escalade', { mot: sujet }); continue; }
  if (0 >= (cfg.limite_messages == null ? 8 : cfg.limite_messages)) { rendre(lead, 'refus', 'limite'); continue; }
  if (!dansLaPlage(cfg, new Date(lead.created_at))) { rendre(lead, 'refus', 'horaire'); continue; }
  rendre(lead, 'part_seul', 'auto');
}
return sortie;
