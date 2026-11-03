import { DEPS, codeRevalider, codeDossier } from './gen.mjs';
const d = DEPS.accueil;
const R = new Function('$json', '$', '$itemIndex', codeRevalider(d, 'accueil'));
const D = new Function('$json', '$', '$itemIndex', codeDossier(d, 'accueil'));
const origine = { enveloppe: { organisation_id: 'o1', simulation: true }, statut: 'ok', resultat: { cartes: ['d:a'], pilote: ['d:b', 'd:c'] },
  effets_prevus: [{ effet: 'ecrire_carte', corps: { cle: 'd:a', organisation_id: 'o1' } }, { effet: 'mettre_en_file_pilote', corps: { cle: 'd:b', organisation_id: 'o1' } }, { effet: 'mettre_en_file_pilote', corps: { cle: 'd:c', organisation_id: 'o1' } }], journal: [], erreurs: [] };
const prep = { isExecuted: true, all: () => [{ json: { organisation_id: 'o1', cle_idempotence: 'tri:x' } }, { json: { organisation_id: 'o2', cle_idempotence: 'tri:y' } }] };
const $ = (n) => n === 'Assembler' ? { item: { json: origine }, all: () => [] } : (n === 'Préparer le tri' ? prep : { isExecuted: false });
const dos = D(origine, $, 0).json; const ds = JSON.parse(dos.dossier_du_chef);
const cas = [
  ['retient d:b', { output: { avis: 'a_confirmer', note: 'Une relance paraît prématurée.', points_a_confirmer: [{ cle: 'd:b', motif: 'à vérifier' }, { cle: 'inventee', motif: 'x' }], specialistes_consultes: ['Spécialiste : trieur'] }, intermediateSteps: [{ action: { tool: 'Sp_cialiste_trieur', toolInput: { cle: 'tri:x' } }, observation: '[{"contrat":"lib-trier-demande@1","statut":"rejete","erreurs":["champ manquant : donnees"]}]' }] }],
  ['cité non appelé', { output: { avis: 'rien_a_signaler', note: 'ok', points_a_confirmer: [], specialistes_consultes: ['Spécialiste : trieur'] }, intermediateSteps: [] }],
  ['montant refusé', { output: { avis: 'a_confirmer', note: 'Le devis de 1 200 € est élevé.', points_a_confirmer: [{ cle: 'd:b', motif: 'x' }], specialistes_consultes: [] } }],
  ['agent en panne', { error: 'boom' }],
  ['spécialiste inconnu', { output: { avis: 'rien_a_signaler', note: 'ok', points_a_confirmer: [], specialistes_consultes: ['Hermes'] } }],
];
let ko = 0;
console.log('dossier : clés', JSON.stringify(ds.cles_des_specialistes), 'effets', ds.effets_prevus.length, 'dossier seul :', Object.keys(dos).join());
for (const [nom, j] of cas) { const o = R(j, $, 0).json; const n = o.resultat.note_du_chef;
  const eff = o.effets_prevus.map((x) => x.effet[0] + ':' + x.corps.cle).join(',');
  console.log(nom.padEnd(20), JSON.stringify(n.appels_specialistes), n.statut, n.raison || n.avis, 'retenus', JSON.stringify(n.pilotes_retenus), 'pilote', JSON.stringify(o.resultat.pilote), 'effets', eff, 'dossier retiré', !('dossier_du_chef' in o), 'journal', o.journal.length);
  if (nom === 'retient d:b' && !(n.pilotes_retenus.join() === 'd:b' && o.resultat.pilote.join() === 'd:c' && n.points_ecartes === 1 && eff === 'e:d:a,e:d:b,m:d:c')) ko++;
  if (nom !== 'retient d:b' && (n.statut !== 'indisponible' || o.resultat.pilote.length !== 2 || eff !== 'e:d:a,m:d:b,m:d:c')) ko++; }
if (origine.resultat.pilote.length !== 2 || origine.effets_prevus[1].effet !== 'mettre_en_file_pilote') { console.log('ORIGINE MUTÉE'); ko++; }
console.log(ko ? 'ROUGE ' + ko : 'VERT : 5 cas');
process.exit(ko ? 1 : 0);
