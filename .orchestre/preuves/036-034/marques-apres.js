// Cerveau (036-030) : la marque « traité » (evenements_marquer_traites, 0193 ; exécutable par service_role, 0194). Par compte : les
// événements routés vers un département qui a RÉPONDU, et ceux rejetés ou sautés (journalisés : rien n'est perdu en silence ; la demande
// elle-même reste dans l'app). Un département en échec n'est pas marqué : rejoué au passage suivant. 200 identifiants au plus par appel.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const aucun = $('Aiguiller').all().map((x) => x.json).find((x) => x && x.contrat === 'aucun') || { rejets: [], sautes: [], routes_ids: {} };
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const enEchec = new Set(); for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (r && r.ko.length) enEchec.add(dep); }
// 036-034 : une écriture des cartes en échec (contrainte 0194, droit, réseau : « Écrire les cartes (ombre) » continue sur erreur) ne
// marque pas un événement d'ombre RÉCENT (survenu il y a moins de REJEU_MIN minutes) : il est relu au passage suivant et réécrit sans
// doublon (clé unique, on_conflict). Avant, il était marqué « traité » et la carte perdue en silence. Le rejeu est BORNÉ : au-delà, il
// est marqué (une panne durable ne relance pas le chef et son modèle chaque minute) ; « Bilan du passage » lève alors une erreur, et
// l'exécution est gardée.
const REJEU_MIN = 10;
const ecr = $('Écrire les cartes (ombre)');
const ecritureKo = ecr.isExecuted && ecr.all().some((x) => !x || !x.json || x.json.error);
const lus = $('Lire les événements non traités');
const survenu = {}; if (lus.isExecuted) for (const x of lus.all()) if (x && x.json && typeof x.json.id === 'string') survenu[x.json.id] = Date.parse(x.json.survenu_le);
const aRejouer = (id) => { const t = survenu[id]; return Number.isFinite(t) && Date.now() - t < REJEU_MIN * 60000; };
const garder = (l, id) => !(ecritureKo && l.palier === 'ombre' && aRejouer(id));
const parCompte = {};
const ajouter = (a, id) => { if (typeof a === 'string' && UUID.test(a) && typeof id === 'string' && UUID.test(id)) (parCompte[a] = parCompte[a] || new Set()).add(id); };
for (const l of Object.values(aucun.routes_ids || {})) if (!enEchec.has(l.departement)) for (const id of l.ids) if (garder(l, id)) ajouter(l.artisan_id, id);
for (const x of aucun.rejets || []) if (x.motif !== 'autre_compte' && x.motif !== 'compte_inconnu') ajouter(x.artisan_id, x.id);
for (const x of aucun.sautes || []) for (const id of (x.ids || [])) ajouter(x.artisan_id, id);
const s = Object.keys(parCompte).sort().map((a) => ({ json: { p_artisan: a, p_ids: [...parCompte[a]].slice(0, 200) } }));
return s.length ? s : [{ json: { vide: true } }];