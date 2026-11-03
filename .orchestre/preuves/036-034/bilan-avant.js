// Cerveau : le bilan agrégé du passage, sans donnée personnelle : où il s'est arrêté, ce qui a été routé où, les statuts, les effets
// prévus et faits (toujours zéro fait : la porte d'envoi reste fermée), les cartes de l'ombre écrites et les événements marqués.
const passe = (nom) => $(nom).isExecuted;
const sorties = (nom, b) => passe(nom) ? $(nom).all(b || 0).map((x) => x.json) : [];
const issue = (nom) => { if (!passe(nom)) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = sorties(nom, 0), b = sorties(nom, 1); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const G = sorties('Interrupteur général')[0] || {};
if (!passe('Composer les comptes')) return [{ json: { arret: G.lecture === 'erreur' ? 'lecture_impossible' : 'interrupteur_general_coupe', routes: {}, statuts: {}, effets_prevus: 0, effets_faits: 0, cartes_ecrites: 0, marques: 0 } }];
const routes = {}, statuts = {};
let prevus = 0, faits = 0;
for (const x of sorties('Aiguiller')) if (x.contrat !== 'aucun') { const dep = x.contrat.split('@')[0].split('-')[2]; routes[dep] = (routes[dep] || 0) + (x.donnees.demandes || x.donnees.evenements || []).length; }
for (const dep of ["accueil","devis","suivi","facturation","apres","operations","direction"]) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  statuts[dep] = r.ko.length ? 'echec' : r.ok.map((x) => x.statut).join(',');
  for (const x of r.ok) { if (Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (Array.isArray(x.effets_faits)) faits += x.effets_faits.length; } }
for (const nom of ['Appeler lib-journaliser', 'Appeler lib-battement']) for (const x of sorties(nom)) { if (x && Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (x && Array.isArray(x.effets_faits)) faits += x.effets_faits.length; }
const secours = sorties('Journal : rejeté ou sauté')[0] || { rejets: [], sautes: [] };
const cartes = (sorties('Préparer les cartes de l’ombre')[0] || { lignes: [] }).lignes.length;
const ecriture = passe('Écrire les cartes (ombre)') ? (sorties('Écrire les cartes (ombre)').some((x) => x && x.error) ? 'erreur' : 'ok') : 'aucune';
const marques = sorties('Préparer les marques').filter((x) => x && x.p_artisan).reduce((n, x) => n + x.p_ids.length, 0);
return [{ json: { arret: null, simulation: true, comptes: sorties('Composer les comptes').filter((c) => c && c.artisan_id).length, routes: routes, statuts: statuts, sautes: secours.sautes.map((x) => ({ departement: x.departement, motif: x.motif })), rejets: secours.rejets.map((x) => x.motif), effets_prevus: prevus, effets_faits: faits, cartes_ecrites: ecriture === 'ok' ? cartes : 0, ecriture_cartes: ecriture, marques: marques } }];
