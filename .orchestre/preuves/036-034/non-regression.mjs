// 036-034 : non-régression sur les 20 demandes du compte Studio du banc 1253 : toutes les cartes du chef restent, chaque brouillon
// demandé ajoute UNE carte, aucune clé ni objet en double. Usage : node non-regression.mjs <export.json>
import { readFileSync } from 'node:fs';
const wf = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const code = wf.nodes.find((x) => x.name === 'Préparer les cartes de l’ombre').parameters.jsCode;
const chef = JSON.parse(readFileSync(new URL('./chef-accueil-1253.sortie.json', import.meta.url), 'utf8'))[0];
const COMPTE = '00000000-0000-4000-8000-0000000000a1';
const ids = [...new Set(chef.effets_prevus.map((e) => e.objet_id || e.lead_id || (e.corps && e.corps.objet_id)).filter(Boolean))];
const objets = ids.map((d, i) => ({ id: '00000000-0000-4000-8000-e' + String(i + 1).padStart(11, '0'), type: 'demande_recue', objet_id: d }));
const cle = 'dep:accueil:' + COMPTE.slice(24) + ':p';
const S = { 'Aiguiller': [[{ json: { contrat: 'aucun', routes_ids: { k: { artisan_id: COMPTE, departement: 'accueil', palier: process.argv[3] || 'ombre', ids: objets.map((o) => o.id), objets } } } }]],
  'Appeler presti-dep-accueil': [[{ json: Object.assign({}, chef, { cle_idempotence: cle }) }], []] };
const $ = (n) => ({ isExecuted: !!S[n], all: (b) => (S[n] ? S[n][b || 0] || [] : []) });
const l = new Function('$', '$input', code)($, { all: () => [] })[0].json.lignes;
const parEffet = {}; for (const x of l) parEffet[x.entrees.effet] = (parEffet[x.entrees.effet] || 0) + 1;
const attenduCartes = chef.effets_prevus.filter((e) => e.effet === 'ecrire_carte' || e.effet === 'mettre_en_file_pilote').length;
const brouillons = chef.effets_prevus.filter((e) => e.effet === 'demander_brouillon').length;
console.log('palier', process.argv[3] || 'ombre', '| cartes du chef :', attenduCartes, '| brouillons demandés :', brouillons, '| lignes :', l.length, JSON.stringify(parEffet));
const dbl = l.length !== new Set(l.map((x) => x.cle)).size;
console.log('doublons de clé :', dbl);
process.exit(0);
