// Banc hors ligne de 036-034 : rejoue le VRAI code des nœuds « Préparer les cartes de l’ombre » et « Préparer les marques » de
// presti-cerveau (lu dans un export du workflow) sur la VRAIE sortie du chef presti-dep-accueil (exécution 1253 de presti-banc-cerveau,
// données fictives « Exemple. »), dans la situation de l'essai réel du 03/11 : un compte en palier « ombre », UNE demande composée par
// le Cerveau, donc SANS proposition (« Composer les pages » pose proposition: null).
// Usage : node banc-cartes-ombre.mjs <export-du-workflow.json> [--ecriture-en-echec [--ancien]]
// Sortie : le nombre de cartes que le Cerveau POSTerait, la ligne exacte (sans donnée personnelle) et les événements qu'il marquerait.
// Code de sortie : 0 si la demande sans proposition donne exactement une carte d'agent conforme à 0194, 1 sinon (la panne de l'essai).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const exportWf = process.argv[2];
if (!exportWf) { console.error('usage : node banc-cartes-ombre.mjs <export.json> [--ecriture-en-echec]'); process.exit(2); }
const ecritureEnEchec = process.argv.includes('--ecriture-en-echec');
const ancien = process.argv.includes('--ancien'); // l'événement est survenu il y a 30 minutes (rejeu épuisé)
const wf = JSON.parse(readFileSync(exportWf, 'utf8'));
const code = (nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error('nœud absent : ' + nom); return n.parameters.jsCode; };

// Le compte fictif du banc (Studio), un événement fictif, la demande a011 du banc (aucune proposition, demande ordinaire).
const COMPTE = '00000000-0000-4000-8000-0000000000a1';
const DEMANDE = '00000000-0000-4000-8000-a00000000011';
const EVENEMENT = '00000000-0000-4000-8000-e00000000011';
const chef = JSON.parse(readFileSync(join(ici, 'chef-accueil-1253.sortie.json'), 'utf8'))[0];
// La sortie du chef pour CETTE seule demande (l'essai n'en avait qu'une) : on garde les effets qui la visent.
const vise = (e) => [e.objet_id, e.lead_id, e.corps && e.corps.objet_id].includes(DEMANDE);
const sortieChef = Object.assign({}, chef, { effets_prevus: chef.effets_prevus.filter(vise) });

const passage = '2026-11-03T2004';
const aiguiller = [
  { contrat: 'presti-dep-accueil@1', organisation_id: COMPTE, simulation: true, cle_idempotence: 'dep:accueil:' + COMPTE.slice(24) + ':' + passage },
  { contrat: 'aucun', rejets: [], sautes: [], routes_ids: { [COMPTE + '|accueil']: { artisan_id: COMPTE, departement: 'accueil', palier: 'ombre', ids: [EVENEMENT],
    objets: [{ id: EVENEMENT, type: 'demande_recue', objet_id: DEMANDE }] } } },
];
const items = (l) => l.map((json) => ({ json }));
const sorties = {
  'Aiguiller': [items(aiguiller)],
  'Appeler presti-dep-accueil': [items([Object.assign({}, sortieChef, { cle_idempotence: aiguiller[0].cle_idempotence })]), []],
  'Lire les événements non traités': [items([{ id: EVENEMENT, artisan_id: COMPTE, type: 'demande_recue', objet_type: 'lead', objet_id: DEMANDE, cle: 'demande_recue:' + DEMANDE,
    survenu_le: new Date(Date.now() - (ancien ? 30 : 1) * 60000).toISOString() }])],
};
const noeud = (nom, extra) => {
  if (extra && extra[nom]) return extra[nom];
  const s = sorties[nom];
  return { isExecuted: !!s, all: (b) => (s ? s[b || 0] || [] : []), first: () => (s ? (s[0] || [])[0] : undefined) };
};
const jouer = (nom, entree, extra) => new Function('$', '$input', code(nom))((n) => noeud(n, extra), { all: () => entree, first: () => entree[0] });

const cartes = jouer('Préparer les cartes de l’ombre', [])[0].json.lignes;
console.log('effets du chef pour la demande :', sortieChef.effets_prevus.map((e) => e.effet).join(', '));
console.log('cartes que le Cerveau POSTerait :', cartes.length);
for (const l of cartes) console.log(JSON.stringify(l));

// Contrôles de 0194 (contrainte assistant_actions_agent, déclencheur de naissance) et de 0157, sur chaque ligne.
const CLE = /^[A-Za-z0-9_:.-]+$/;
const DEPS = ['accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction'];
const defauts = [];
for (const l of cartes) {
  if (l.origine !== 'agent' || l.mode !== 'confirmation' || !l.expire_le || l.statut !== 'en_attente') defauts.push('origine/mode/échéance/statut');
  if (!DEPS.includes(l.departement)) defauts.push('departement');
  if (typeof l.motif !== 'string' || l.motif.trim().length < 1 || l.motif.length > 300) defauts.push('motif');
  if (!Array.isArray(l.sources) || l.sources.length < 1 || l.sources.length > 40) defauts.push('sources');
  if (typeof l.cle !== 'string' || l.cle.length < 3 || l.cle.length > 120 || !CLE.test(l.cle)) defauts.push('cle');
  if ((l.objet_type === null) !== (l.objet_id === null)) defauts.push('objet');
  if (!l.titre || l.titre.length > 200 || !l.outil || l.outil.length > 60 || l.tour !== 1) defauts.push('titre/outil/tour');
  if (l.artisan_id !== COMPTE) defauts.push('artisan_id (multi-tenant)');
  if (/@|\+33|0[67]\s?\d{2}/.test(JSON.stringify(l))) defauts.push('donnée de contact');
}
const cles = new Set(cartes.map((l) => Object.keys(l).sort().join(',')));
if (cles.size > 1) defauts.push('lignes de formes différentes (PostgREST en lot exige les mêmes clés)');

// La marque « traité » : avec une écriture réussie, l'événement est marqué ; avec une écriture en échec, il ne doit PAS l'être.
const ecriture = ecritureEnEchec ? [{ json: { error: { message: 'Bad request - please check your parameters', code: '400' } } }] : [{ json: {} }];
const extra = { 'Écrire les cartes (ombre)': { isExecuted: cartes.length > 0, all: () => (cartes.length ? ecriture : []), first: () => ecriture[0] },
  'Des cartes à écrire ?': { isExecuted: true, all: () => [], first: () => undefined } };
const marques = jouer('Préparer les marques', [], extra).map((x) => x.json);
const marque = marques.some((m) => Array.isArray(m.p_ids) && m.p_ids.includes(EVENEMENT));
console.log('événement marqué « traité » :', marque, ecritureEnEchec ? '(écriture de la carte en échec, événement ' + (ancien ? 'ancien : 30 min' : 'récent : 1 min') + ')' : '(écriture réussie)');

let ok = cartes.length === 1 && defauts.length === 0;
if (ecritureEnEchec && !ancien && marque) { defauts.push('événement récent marqué alors que la carte n’a pas été écrite (perdu en silence)'); ok = false; }
if (ecritureEnEchec && ancien && !marque) { defauts.push('événement ancien jamais marqué : rejeu sans fin (le chef tournerait chaque minute)'); ok = false; }
if (!ecritureEnEchec && cartes.length === 1 && !marque) { defauts.push('événement non marqué après une écriture réussie'); ok = false; }
if (defauts.length) console.log('défauts :', [...new Set(defauts)].join(' ; '));
console.log(ok ? 'VERT : une carte d’agent conforme pour la demande sans proposition' : 'ROUGE');
process.exit(ok ? 0 : 1);
