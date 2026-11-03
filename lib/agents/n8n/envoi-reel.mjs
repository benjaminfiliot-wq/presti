// Le palier « réel » des agents n8n (tâche 036-038, Benj le 03/11 au soir : « règle ça ») : SOURCE UNIQUE du code des nœuds qui servent le
// réel dans n8n d'Oracle. Recopié octet pour octet ; scripts/reel-qa.mjs exécute ces codes (faux `$`) et compare les exports rapatriés.
//
//   • presti-cerveau (596OC5mL2aMBq6SD) : « Aiguiller » sert aussi le palier `reel` (les chefs restent en simulation : leur porte d'envoi ne
//     s'ouvre jamais) ; « Préparer les cartes de l'ombre » écrit aussi les cartes du réel, avec BLOC_CARTES_REEL :
//       - Studio, ou tout type que l'offre ne permet pas : carte « à valider », rien ne part sans le clic « Valider » (envoi « au_clic ») ;
//       - Signature, type permis par l'offre (même table que peut(), lib/plans.ts) : la carte part seule après 10 minutes (envoi « pilote »),
//         annulable d'un clic « Refuser » ; l'impayé exige en plus l'opt-in de l'artisan (relances_impayes_reglages.actif) ;
//       - jamais un devis, un prix estimé ni un paiement : ces types ne sont pas ENVOYABLES, ils restent une carte que l'artisan fait dans l'app.
//   • presti-dep-envoi (créé par 036-038) : toutes les minutes, relit les comptes dont « tous » ET le département sont au réel, prend les
//     cartes à faire partir (cliquées, ou pilotes échus), décide (CODE_DECIDER), RÉCLAME chaque carte par une transition atomique, puis
//     appelle lib-envoyer-courriel et note le résultat sur la carte (« Fait : … »).
//   • lib-envoyer-courriel (créé par 036-038) : le canal, l'identifiant n8n « Resend (Presti) » (Header Auth). CODE_CONTROLER refuse toute
//     enveloppe hors marque blanche, sans mention d'IA, sans opposition, sans clé d'idempotence ; la clé part en en-tête Idempotency-Key.
//
// Garanties, et où elles vivent :
//   - jamais deux envois pour un même fait : la carte est réclamée (statut attendu → executee, une seule requête conditionnelle) AVANT
//     l'envoi, et Resend reçoit Idempotency-Key = « reel:<compte>:<clé de la carte> » (un rejeu rend le même envoi, jamais un second) ;
//     côté app, lib/agents/n8n/garde-reel.ts tait le même type pour le même compte (/api/leads, cron des relances, tour des impayés) ;
//   - jamais sans accord : Studio = statut en_cours, que SEUL le clic « Valider » pose (app/api/assistant/agents/route.ts) ; Signature =
//     pilote échu, type permis, offre relue au moment d'envoyer ;
//   - marque blanche : expéditeur « <nom de l'artisan> <contact@prestiapp.fr> », Reply-To = l'adresse de l'artisan, aucun « Presti » ;
//   - mention d'IA et opposition (STOP, désinscription) dans chaque message, opposition lue avant chaque envoi.

export const SUPABASE = 'https://gorcdvmueakcncsmrouo.supabase.co'
export const IDENTIFIANT_SUPABASE = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
export const IDENTIFIANT_RESEND = { id: '26cc3331017df2d6', name: 'Resend (Presti)' }
export const EXPEDITEUR = 'contact@prestiapp.fr'
export const DELAI_PILOTE_MIN = 10
export const PLAFOND_PILOTE_JOUR = 20

/** Les types qu'un agent peut faire partir, la capacité de l'offre qui permet de les envoyer SEULS (lib/plans.ts : peut()), leur destinataire. */
export const ENVOYABLES = {
  reponse_prospect: { departement: 'accueil', capacite: 'plateforme.ia.auto', destinataire: 'lead', type_message: 'reponse_auto' },
  relance_prospect: { departement: 'suivi', capacite: 'relances.auto', destinataire: 'lead', type_message: 'relance' },
  relance_impaye: { departement: 'facturation', capacite: 'factures.relances.auto', destinataire: 'facture', opt_in: true },
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// presti-cerveau — les trois retouches du palier réel (appliquées par appliquerReelAuCerveau, vérifiées par le juge sur l'export).

/** « Lire les interrupteurs généraux » : le palier réel est lu, comme la simulation et l'ombre. */
export const LECTURE_INTERRUPTEURS_REEL = 'in.(simulation,ombre,reel)'

/** Le bloc inséré dans « Préparer les cartes de l'ombre » : il décide, pour une carte du palier réel, si elle part au clic ou par le pilote. */
export const BLOC_CARTES_REEL = String.raw`// 036-038 — le palier RÉEL. Une carte du réel naît « à valider » comme en ombre (0194 : jamais autrement). Elle porte entrees.palier = 'reel'
// et entrees.envoi : « au_clic » (Studio, ou tout type que l'offre n'envoie pas seule : rien ne part sans le clic « Valider ») ou « pilote »
// (Signature, type permis par peut(), texte prêt, impayé seulement avec l'opt-in : part seule après 10 minutes, « Refuser » l'annule).
// Seuls ENVOYABLES partent un jour (par presti-dep-envoi) ; un devis, un prix ou un paiement reste une carte que l'artisan fait dans l'app.
const ENVOYABLES = { reponse_prospect: 'plateforme.ia.auto', relance_prospect: 'relances.auto', relance_impaye: 'factures.relances.auto' };
const DELAI_PILOTE_MS = 10 * 60000;
const comptesReel = {}; for (const c of $('Composer les comptes').all().map((x) => x.json)) if (c && typeof c.artisan_id === 'string') comptesReel[c.artisan_id] = c;
const optInImpaye = (artisan) => { const env = aig.find((x) => x && x.organisation_id === artisan && typeof x.contrat === 'string' && x.contrat.indexOf('presti-dep-facturation') === 0);
  const conf = env && env.config && env.config.lectures_simulees && Array.isArray(env.config.lectures_simulees.configuration) ? env.config.lectures_simulees.configuration[0] : null;
  return !!(conf && conf.relances_impayes && conf.relances_impayes.actif === true); };
const envoiReel = (lot, outil, e, brouillon) => {
  const c = comptesReel[lot.artisan_id] || {}; const capacites = (c.accueil && Array.isArray(c.accueil.capacites)) ? c.accueil.capacites : [];
  const capacite = ENVOYABLES[outil];
  const texte = !!(brouillon && typeof brouillon.texte === 'string' && brouillon.texte.trim().length >= 20);
  const permis = c.offre === 'signature' && !!capacite && capacites.indexOf(capacite) >= 0 && (outil !== 'relance_impaye' || optInImpaye(lot.artisan_id));
  // Un jour férié (calendrier.api.gouv.fr, lu par Aiguiller) : la relance ou l'impayé ne part pas seul, la carte attend le clic.
  const ferieBloque = PARTENT.indexOf(lot.departement) >= 0 && !!ferie;
  const pilote = permis && texte && !ferieBloque && e.escalade !== true && (e.effet === 'ecrire_carte' || e.effet === 'mettre_en_file_pilote');
  return pilote ? { envoi: 'pilote', pilote: { envoyer_apres: new Date(Date.now() + DELAI_PILOTE_MS).toISOString(), capacite: capacite, opt_in: outil === 'relance_impaye' ? true : null } }
    : { envoi: 'au_clic', pilote: null, motif_clic: !capacite ? 'type_jamais_seul' : c.offre !== 'signature' ? 'offre_studio' : !permis ? 'non_permis' : !texte ? 'texte_a_rediger' : ferieBloque ? 'jour_ferie' : 'decision_du_chef' };
};
const MOTIF_REEL = { pilote: ' ; palier réel : partira seule dans 10 minutes (« Refuser » l’annule)', au_clic: ' ; palier réel : rien ne part sans votre clic « Valider »' };
// ── fin du bloc 036-038`

/**
 * Applique les retouches du réel au code de « Préparer les cartes de l'ombre » (celui que 036-036 a laissé dans le brouillon n8n), sans
 * toucher au reste. Lève si une ancre manque : on ne pose jamais une retouche à l'aveugle.
 */
export function appliquerReelAuxCartes(code) {
  const remplacer = (avant, apres) => { if (!code.includes(avant)) throw new Error('ancre absente : ' + avant.slice(0, 60)); code = code.replace(avant, apres) }
  if (code.includes('036-038 — le palier RÉEL')) return code
  remplacer("const lignes = [], vues = new Set(), objetsVus = new Set();", "const lignes = [], vues = new Set(), objetsVus = new Set();\n" + BLOC_CARTES_REEL)
  remplacer("if (!lot || lot.palier !== 'ombre') continue;", "if (!lot || (lot.palier !== 'ombre' && lot.palier !== 'reel')) continue;")
  remplacer("{ fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':ombre' },", "{ fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':' + lot.palier },")
  remplacer("      let suffixe = '';", "      const reel = lot.palier === 'reel' ? envoiReel(lot, outil, e, brouillon) : null;\n      let suffixe = '';")
  remplacer("entrees: { type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id || null, effet: e.effet },",
    "entrees: Object.assign({ type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id || null, effet: e.effet }, reel ? { palier: 'reel', envoi: reel.envoi, pilote: reel.pilote, motif_clic: reel.motif_clic || null } : {}),")
  remplacer("' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : e.effet === 'demander_brouillon' ? ' ; la réponse reste à rédiger (au réel, un brouillon serait préparé)' : '')",
    "(reel ? MOTIF_REEL[reel.envoi] + (e.effet === 'demander_brouillon' ? ' ; la réponse reste à rédiger' : '') : ' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : e.effet === 'demander_brouillon' ? ' ; la réponse reste à rédiger (au réel, un brouillon serait préparé)' : ''))")
  return code
}

/** Les retouches d'« Aiguiller » : le palier réel est servi ; les chefs reçoivent TOUJOURS simulation: true (aucune porte d'envoi de chef). */
export function appliquerReelAAiguiller(code) {
  const remplacer = (avant, apres) => { if (!code.includes(avant)) throw new Error('ancre absente : ' + avant.slice(0, 60)); code = code.replace(avant, apres) }
  if (code.includes("const SERVIS = ['simulation', 'ombre', 'reel'];")) return code
  remplacer("const SERVIS = ['simulation', 'ombre'];", "// 036-038 : le réel est servi comme l'ombre (le chef prépare, simulation: true) ; seule la carte du réel peut partir, par presti-dep-envoi.\nconst SERVIS = ['simulation', 'ombre', 'reel'];")
  return code
}

/** Les retouches de « Préparer les marques » : une carte du réel non écrite (écriture en échec) est rejouée comme une carte de l'ombre. */
export function appliquerReelAuxMarques(code) {
  const avant = "const garder = (l, id) => !(ecritureKo && l.palier === 'ombre' && aRejouer(id));"
  if (code.includes("(l.palier === 'ombre' || l.palier === 'reel')")) return code
  if (!code.includes(avant)) throw new Error('ancre absente : marques')
  return code.replace(avant, "const garder = (l, id) => !(ecritureKo && (l.palier === 'ombre' || l.palier === 'reel') && aRejouer(id));")
}

/** Les retouches d'« Interrupteur général » : un compte dont « tous » est au réel est un compte ouvert. */
export function appliquerReelAInterrupteur(code) {
  const avant = "(l.palier === 'simulation' || l.palier === 'ombre')"
  if (code.includes("l.palier === 'reel'")) return code
  if (!code.includes(avant)) throw new Error('ancre absente : interrupteur')
  return code.replace(avant, "(l.palier === 'simulation' || l.palier === 'ombre' || l.palier === 'reel')")
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// presti-dep-envoi — les nœuds Code.

/** « Comptes au réel » : par compte, les départements dont « tous » ET le département sont au réel et en marche (le plus prudent des deux). */
export const CODE_COMPTES_REEL = String.raw`// presti-dep-envoi (036-038) : un département n'est au réel que si « tous » ET lui sont au palier reel, en marche (0193 : le plus prudent des
// deux). Lecture en erreur ou hors forme : aucun compte (rien ne part ; l'app garde la main, lib/agents/n8n/garde-reel.ts lit la même règle).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const lignes = $('Lire les départements au réel').all().map((x) => x.json);
const erreur = lignes.some((l) => !l || l.error);
const parCompte = {};
if (!erreur) for (const l of lignes) { if (!l || !UUID.test(String(l.artisan_id)) || l.palier !== 'reel' || l.en_marche !== true) continue; (parCompte[l.artisan_id] = parCompte[l.artisan_id] || []).push(l.departement); }
const comptes = {};
for (const a of Object.keys(parCompte).sort().slice(0, 100)) { const d = parCompte[a]; if (d.indexOf('tous') < 0) continue; const deps = d.filter((x) => x !== 'tous'); if (deps.length) comptes[a] = deps.sort(); }
const t = Date.now();
return [{ json: { comptes: comptes, ids: Object.keys(comptes), maintenant: new Date(t).toISOString(), depuis_24h: new Date(t - 86400000).toISOString(), lecture: erreur ? 'erreur' : 'ok' } }];`

/**
 * « Décider les envois » : pour chaque carte lue, envoyer, la noter (écartée), ou la laisser. Code pur ; les lectures sont celles des nœuds
 * nommés. Une lecture commune en erreur (pause, oppositions, réponses des clients) : RIEN ne part ce passage (fail-closed, la carte reste).
 */
export const CODE_DECIDER = String.raw`// presti-dep-envoi (036-038) : la décision d'envoi, carte par carte. Rien ne part si un contrôle manque ; chaque refus est dit sur la carte.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const ENVOYABLES = { reponse_prospect: { departement: 'accueil', capacite: 'plateforme.ia.auto', destinataire: 'lead', type_message: 'reponse_auto' },
  relance_prospect: { departement: 'suivi', capacite: 'relances.auto', destinataire: 'lead', type_message: 'relance' },
  relance_impaye: { departement: 'facturation', capacite: 'factures.relances.auto', destinataire: 'facture', opt_in: true } };
// La même table que lib/plans.ts (peut) et « Composer les comptes » du Cerveau : l'offre est RELUE au moment d'envoyer.
const OFFRE = { studio: 'studio', signature: 'signature', business: 'signature', entreprise: 'signature' };
const CAPACITES = { studio: ['canaux.email', 'relances', 'factures.relances', 'assistant'], signature: ['canaux.email', 'relances', 'factures.relances', 'assistant', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'] };
const PLAFOND_PILOTE_JOUR = 20;
const OPPOSITION = /(^|[^a-z])(stop|desinscri|désinscri|unsubscribe)|ne (plus|pas) (me )?(contacter|recontacter|écrire|ecrire|relancer|recevoir)/i;
const SIMULE = /^\s*exemple\.|\[simulation\]|simulation\s*:\s*true/i;
const G = $('Comptes au réel').first().json;
const lus = (nom) => { const n = $(nom); if (!n.isExecuted) return { ok: false, lignes: [] }; const a = n.all().map((x) => x.json); return { ok: !a.some((x) => x && x.error), lignes: a.filter((x) => x && !x.error && Object.keys(x).length) }; };
const pause = (() => { const n = $('Lire la pause générale'); if (!n.isExecuted) return null; const j = n.first().json || {}; if (j.error) return null; const v = j.data !== undefined ? String(j.data).trim() : j.ops_interrupteur !== undefined ? String(j.ops_interrupteur) : '';
  return v === 'false' ? false : v === 'true' ? true : null; })();
const cartes = lus('Lire les cartes à envoyer'), artisans = lus('Lire les comptes'), leads = lus('Lire les destinataires'), factures = lus('Lire les factures');
const reponses = lus('Lire les réponses des clients'), oppositions = lus('Lire les oppositions'), impayes = lus('Lire les réglages d’impayés'), jour = lus('Lire les envois du jour');
const communs = pause === false && reponses.ok && oppositions.ok && impayes.ok && jour.ok && artisans.ok && leads.ok && factures.ok;
const par = (r, k) => { const m = {}; for (const x of r.lignes) if (typeof x[k] === 'string') m[x[k]] = x; return m; };
const A = par(artisans, 'id'), L = par(leads, 'id'), F = par(factures, 'id'), OPT = par(impayes, 'artisan_id');
const opp = new Set(oppositions.lignes.map((x) => x.artisan_id + ':' + x.empreinte));
const stopDe = {}; for (const m of reponses.lignes) if (typeof m.lead_id === 'string' && typeof m.contenu === 'string' && OPPOSITION.test(m.contenu)) stopDe[m.lead_id] = true;
const envoyesJour = {}; for (const x of jour.lignes) if (typeof x.artisan_id === 'string') envoyesJour[x.artisan_id] = (envoyesJour[x.artisan_id] || 0) + 1;
// SHA-256 en JS pur (le module crypto est refusé aux nœuds Code) : l'empreinte d'adresse de lib/crm/apresOpposition.ts, 32 premiers hex.
const sha256 = (s) => { const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b = Array.from(unescape(encodeURIComponent(s)), (c) => c.charCodeAt(0)); const n = b.length; b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  const hi = Math.floor(n / 0x20000000), lo = (n * 8) >>> 0; b.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; const r = (x, k) => (x >>> k) | (x << (32 - k)); const w = new Array(64);
  for (let i = 0; i < b.length; i += 64) { for (let t = 0; t < 16; t++) w[t] = (b[i + 4 * t] << 24) | (b[i + 4 * t + 1] << 16) | (b[i + 4 * t + 2] << 8) | b[i + 4 * t + 3];
    for (let t = 16; t < 64; t++) { const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) { const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0; hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
    h = [h[0] + a, h[1] + bb, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map((x) => x | 0); }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join(''); };
const empreinte = (email) => sha256(String(email).trim().toLowerCase()).slice(0, 32);
const nomPropre = (v) => { const s = String(v || '').replace(/[\r\n<>"]/g, '').trim().slice(0, 70); return s && !/presti/i.test(s) ? s : 'Votre artisan'; };
const SUJETS = { reponse_prospect: (n) => 'Votre demande — ' + n, relance_prospect: (n) => 'Suite à votre demande — ' + n, relance_impaye: (n, f) => 'Facture ' + (f && f.numero ? String(f.numero).slice(0, 30) + ' ' : '') + '— ' + n };
const mention = (nom, envoi) => envoi === 'pilote' ? 'Message rédigé et envoyé automatiquement par l’assistant de ' + nom + '.' : 'Message préparé par l’assistant de ' + nom + ', relu et validé par ' + nom + '.';
const opposition = (nom) => 'Vous ne souhaitez plus recevoir de message de ' + nom + ' ? Répondez simplement « STOP » à cet e-mail (désinscription immédiate).';
const sorties = [];
const noter = (c, statut_attendu, patch, motif) => sorties.push({ json: { genre: 'noter', carte_id: c.id, artisan_id: c.artisan_id, statut_attendu: statut_attendu, patch: Object.assign({ maj_le: G.maintenant }, patch), motif: motif } });
const enPlus = {};
for (const c of cartes.lignes) {
  if (!c || !UUID.test(String(c.id)) || !UUID.test(String(c.artisan_id))) continue;
  const e = c.entrees && typeof c.entrees === 'object' ? c.entrees : {}; const type = ENVOYABLES[c.outil];
  // Seules les cartes d'agent du palier réel, d'un type envoyable, d'un compte et d'un département ENCORE au réel (le retour arrière arrête tout).
  if (c.origine !== 'agent' || e.palier !== 'reel' || !type || c.departement !== type.departement) continue;
  if (!G.comptes[c.artisan_id] || G.comptes[c.artisan_id].indexOf(type.departement) < 0) continue;
  // Le moyen : le clic « Valider » (statut en_cours, posé par la boîte seule) ou le pilote (en_attente, échu, offre et type permis).
  const clic = c.statut === 'en_cours';
  const pilote = c.statut === 'en_attente' && e.envoi === 'pilote' && e.pilote && typeof e.pilote.envoyer_apres === 'string' && Date.parse(e.pilote.envoyer_apres) <= Date.parse(G.maintenant);
  if (!clic && !pilote) continue;
  if (c.expire_le && Date.parse(c.expire_le) <= Date.parse(G.maintenant)) continue;
  if (!communs) continue; // pause générale posée ou dans le doute, lecture commune en erreur : rien ne part, la carte attend
  const a = A[c.artisan_id];
  if (!a || a.est_demo === true || a.suppression_demandee_le || a.leads_pause === true) continue;
  const offre = OFFRE[String(a.plan || '').toLowerCase()];
  const ecarter = (motif, texte) => clic ? noter(c, 'en_cours', { statut: 'echec', resultat_resume: ('Rien n’est parti : ' + texte).slice(0, 300) }, motif)
    : noter(c, 'en_attente', { entrees: Object.assign({}, e, { envoi: 'au_clic', pilote: null, motif_clic: motif }) }, motif);
  if (pilote) {
    if (offre !== 'signature' || CAPACITES.signature.indexOf(type.capacite) < 0) { ecarter('offre', 'l’offre n’envoie pas ce message seule.'); continue; }
    if (type.opt_in && !(OPT[c.artisan_id] && OPT[c.artisan_id].actif === true)) { ecarter('opt_in', 'les relances d’impayés automatiques ne sont pas activées.'); continue; }
    if ((envoyesJour[c.artisan_id] || 0) + (enPlus[c.artisan_id] || 0) >= PLAFOND_PILOTE_JOUR) continue; // plafond du jour : la carte attend demain
  } else if (!offre) continue;
  const b = c.apercu && c.apercu.brouillon && typeof c.apercu.brouillon === 'object' ? c.apercu.brouillon : null;
  const corps = b && typeof b.texte === 'string' ? b.texte.trim() : '';
  if (corps.length < 20) { ecarter('texte_a_rediger', 'la réponse est encore à rédiger : écrivez-la depuis Messages.'); continue; }
  if (SIMULE.test(corps)) { ecarter('texte_simule', 'le texte vient d’un essai, pas d’une vraie rédaction.'); continue; }
  if (/presti/i.test(corps) || /presti/i.test(String(b.objet || ''))) { ecarter('marque', 'le texte nomme l’outil au lieu de votre entreprise.'); continue; }
  let to = null, leadId = null, f = null;
  if (type.destinataire === 'lead') { const l = L[e.objet_id]; if (!l || l.artisan_id !== c.artisan_id) { ecarter('destinataire', 'la demande est introuvable.'); continue; }
    if (l.prise_en_main === true) { ecarter('prise_en_main', 'vous avez pris la main sur cette conversation.'); continue; }
    if (c.outil === 'relance_prospect' && l.statut !== 'repondu') { ecarter('statut', 'la demande n’attend plus de relance.'); continue; }
    to = typeof l.contact === 'string' ? l.contact.trim() : ''; leadId = l.id; }
  else { f = F[e.objet_id]; if (!f || f.artisan_id !== c.artisan_id) { ecarter('destinataire', 'la facture est introuvable.'); continue; }
    if (['payee', 'annulee', 'brouillon', 'avoir'].indexOf(String(f.statut)) >= 0) { ecarter('statut', 'la facture n’est plus impayée.'); continue; }
    to = typeof f.client_email === 'string' ? f.client_email.trim() : ''; }
  if (!EMAIL.test(to)) { ecarter('sans_email', 'le client n’a pas d’adresse e-mail.'); continue; }
  if ((leadId && stopDe[leadId]) || opp.has(c.artisan_id + ':' + empreinte(to))) { ecarter('opposition', 'le client a demandé à ne plus recevoir de message (STOP).'); continue; }
  const replyTo = typeof a.email === 'string' && EMAIL.test(a.email.trim()) ? a.email.trim() : null;
  if (!replyTo) { ecarter('sans_reply_to', 'votre adresse de réponse manque : le client ne pourrait pas vous répondre.'); continue; }
  const nom = nomPropre(a.nom);
  const envoi = pilote ? 'pilote' : 'clic';
  enPlus[c.artisan_id] = (enPlus[c.artisan_id] || 0) + (pilote ? 1 : 0);
  sorties.push({ json: { genre: 'envoi', carte_id: c.id, artisan_id: c.artisan_id, outil: c.outil, envoi: envoi, statut_attendu: clic ? 'en_cours' : 'en_attente',
    envoyer_apres: pilote ? e.pilote.envoyer_apres : null, lead_id: leadId, type_message: type.type_message || null, corps: corps.slice(0, 4000),
    enveloppe: { cle_idempotence: 'reel:' + c.artisan_id.slice(24) + ':' + String(c.cle).slice(0, 120), de_nom: nom, de_adresse: 'contact@prestiapp.fr', reply_to: replyTo, a: to,
      sujet: (typeof b.objet === 'string' && b.objet.trim() ? b.objet.trim().slice(0, 120) : SUJETS[c.outil](nom, f)).replace(/[\r\n]+/g, ' '),
      texte: corps.slice(0, 4000) + '\n\n—\n' + mention(nom, pilote ? 'pilote' : 'clic') + '\n' + opposition(nom), essai: false } } });
}
return sorties.length ? sorties : [{ json: { genre: 'rien' } }];`

/** « Garder les réclamées » : seules les cartes que la réclamation atomique a rendues (statut executee, même compte) partent. */
export const CODE_RECLAMEES = String.raw`// presti-dep-envoi (036-038) : la réclamation (PATCH conditionnel, Prefer return=representation) ne rend la carte qu'à UN passage ; un second
// passage, un double clic, un « Refuser » arrivé avant : aucune ligne, donc aucun envoi. On joint par identifiant, jamais par rang.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const prises = new Set($('Réclamer la carte').all().map((x) => x.json).filter((r) => r && !r.error && UUID.test(String(r.id)) && r.statut === 'executee').map((r) => r.artisan_id + ':' + r.id));
const s = $('Décider les envois').all().map((x) => x.json).filter((d) => d && d.genre === 'envoi' && prises.has(d.artisan_id + ':' + d.carte_id)).map((d) => ({ json: Object.assign({}, d.enveloppe, { carte_id: d.carte_id, artisan_id: d.artisan_id }) }));
return s.length ? s : [{ json: { vide: true } }];`

/** « Préparer les résultats » : la ligne « Fait : … » (ou l'échec) de chaque carte envoyée, et la trace dans le fil de la conversation. */
export const CODE_RESULTATS = String.raw`// presti-dep-envoi (036-038) : le résultat de chaque envoi, noté sur SA carte (jointure par identifiant). Envoi refusé : la carte passe en
// échec avec la raison (jamais « fait » à tort) ; la clé d'idempotence reste, un rejeu manuel ne renverrait pas un message déjà parti.
const decisions = {}; for (const d of $('Décider les envois').all().map((x) => x.json)) if (d && d.genre === 'envoi') decisions[d.carte_id] = d;
const LIB = { reponse_prospect: 'réponse envoyée par e-mail', relance_prospect: 'relance envoyée par e-mail', relance_impaye: 'relance d’impayé envoyée par e-mail' };
const s = [];
for (const r of $('Envoyer (lib-envoyer-courriel)').all().map((x) => x.json)) { const d = r && decisions[r.carte_id]; if (!d) continue;
  const ok = r.ok === true && typeof r.envoi_id === 'string';
  s.push({ json: { carte_id: d.carte_id, artisan_id: d.artisan_id, ok: ok, lead_id: ok ? d.lead_id : null, type_message: d.type_message, corps: d.corps,
    patch: ok ? { resultat_resume: ('Fait : ' + LIB[d.outil] + (d.envoi === 'pilote' ? ' (partie seule après 10 minutes)' : ' (après votre validation)') + '.').slice(0, 300), maj_le: new Date().toISOString() }
      : { statut: 'echec', resultat_resume: ('Rien n’est parti : ' + String(r.erreur || 'envoi refusé').slice(0, 200)).slice(0, 300), maj_le: new Date().toISOString() } } }); }
return s.length ? s : [{ json: { vide: true } }];`

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// lib-envoyer-courriel — le canal.

/** « Contrôler l'enveloppe » : la dernière porte avant Resend. Une enveloppe hors règle n'est jamais envoyée. */
export const CODE_CONTROLER = String.raw`// lib-envoyer-courriel (036-038) : la dernière porte avant Resend (identifiant n8n « Resend (Presti) »). Refuse, sans rien envoyer :
// une clé d'idempotence absente ; un expéditeur hors prestiapp.fr ou un nom qui dit « Presti » (marque blanche) ; un Reply-To absent ;
// la mention d'IA absente ; l'opposition (STOP, désinscription) absente du pied ; « Presti » dans l'objet ou le texte ; en essai, toute
// adresse autre que delivered@resend.dev.
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const e = $input.first().json || {};
const raisons = [];
if (typeof e.cle_idempotence !== 'string' || !/^[A-Za-z0-9_:.-]{8,200}$/.test(e.cle_idempotence)) raisons.push('cle_idempotence');
if (e.de_adresse !== 'contact@prestiapp.fr') raisons.push('expediteur');
const nom = String(e.de_nom || '').replace(/[\r\n<>"]/g, '').trim().slice(0, 70);
if (!nom || /presti/i.test(nom)) raisons.push('marque_blanche');
if (!EMAIL.test(String(e.reply_to || '')) || /@prestiapp\.fr$/i.test(String(e.reply_to))) raisons.push('reply_to');
if (!EMAIL.test(String(e.a || ''))) raisons.push('destinataire');
if (e.essai === true && String(e.a).toLowerCase() !== 'delivered@resend.dev') raisons.push('essai_hors_resend');
const texte = String(e.texte || ''), sujet = String(e.sujet || '').replace(/[\r\n]+/g, ' ').slice(0, 150);
if (/presti/i.test(texte) || /presti/i.test(sujet)) raisons.push('marque_blanche');
if (!/l’assistant de /.test(texte)) raisons.push('mention_ia');
if (!/« STOP »/.test(texte) || !/désinscription/.test(texte)) raisons.push('opposition');
if (texte.trim().length < 40 || !sujet.trim()) raisons.push('texte');
const ok = raisons.length === 0;
return [{ json: { ok: ok, raisons: [...new Set(raisons)], carte_id: e.carte_id || null, essai: e.essai === true, cle_idempotence: e.cle_idempotence || null,
  corps: ok ? { from: nom + ' <contact@prestiapp.fr>', to: [String(e.a)], reply_to: String(e.reply_to), subject: sujet, text: texte,
    headers: { 'List-Unsubscribe': '<mailto:' + String(e.reply_to) + '?subject=STOP>' } } : null } }];`

/** « Rendre le résultat » : ce que l'appelant lit (aucun texte, aucune adresse : l'identifiant d'envoi de Resend ou l'erreur). */
export const CODE_RENDRE = String.raw`// lib-envoyer-courriel (036-038) : rend { ok, envoi_id, erreur, carte_id } à l'appelant, sans l'adresse ni le texte.
const c = $('Contrôler l’enveloppe').first().json;
if (!c.ok) return [{ json: { ok: false, envoi_id: null, erreur: 'enveloppe refusée : ' + c.raisons.join(', '), carte_id: c.carte_id, cle_idempotence: c.cle_idempotence } }];
const r = $input.first().json || {};
const id = typeof r.id === 'string' ? r.id : null;
const err = r.error ? (typeof r.error === 'string' ? r.error : (r.error.message || JSON.stringify(r.error))) : null;
return [{ json: { ok: !!id && !err, envoi_id: id, erreur: id ? null : String(err || 'réponse de Resend sans identifiant').slice(0, 200), carte_id: c.carte_id, cle_idempotence: c.cle_idempotence } }];`

/** Les écritures de presti-dep-envoi : chacune filtrée par compte ET par l'état attendu (transition atomique). */
export const ECRITURES_ENVOI = {
  'Réclamer la carte': { methode: 'PATCH', url: "={{ '" + SUPABASE + "/rest/v1/assistant_actions?id=eq.' + $json.carte_id + '&artisan_id=eq.' + $json.artisan_id + '&origine=eq.agent&statut=eq.' + $json.statut_attendu + ($json.envoi === 'pilote' ? '&entrees->pilote->>envoyer_apres=lte.' + encodeURIComponent($json.envoyer_apres) : '') }}", prefer: 'return=representation' },
  'Noter la carte écartée': { methode: 'PATCH', url: "={{ '" + SUPABASE + "/rest/v1/assistant_actions?id=eq.' + $json.carte_id + '&artisan_id=eq.' + $json.artisan_id + '&origine=eq.agent&statut=eq.' + $json.statut_attendu }}", prefer: 'return=minimal' },
  'Noter le résultat': { methode: 'PATCH', url: "={{ '" + SUPABASE + "/rest/v1/assistant_actions?id=eq.' + $json.carte_id + '&artisan_id=eq.' + $json.artisan_id + '&origine=eq.agent&statut=eq.executee' }}", prefer: 'return=minimal' },
  'Tracer dans la conversation': { methode: 'POST', url: SUPABASE + '/rest/v1/messages', prefer: 'return=minimal' },
}
