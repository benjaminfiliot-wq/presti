// essais-218.mjs — cas de la fiche 026-218 que le juge (CO-1, CO-2) n'exerce pas : lecture d'ops.couts, jamais zéro inventé,
// totaux exacts en euros, un même battement rejoué, changement de modèle, freellmapi avec et sans détail de jetons, quota
// indisponible, fraîcheur, aucune fuite de texte du detail.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-218/essais-218.mjs
import * as C from '../../../lib/contenu/couts.ts'

let ko = 0
const attendu = (nom, cond, detail) => { if (!cond) ko++; console.log(`${cond ? 'OK ' : 'KO '} ${nom}${cond ? '' : ` — ${JSON.stringify(detail)}`}`) }
const t = Date.parse('2026-09-29T18:00:00Z')

{ const b = C.depuisLigneOps({ le: '2026-09-29T10:00:00Z', agent: 'contenu', fournisseur: 'claude', montant_eur: '0.0123', detail: { modele: 'claude-x', jetons_entree: 100, jetons_sortie: 20, texte: 'Jean Dupont 0612345678' } })
  attendu('depuisLigneOps : montant texte converti, jetons lus, texte du detail ignoré', b.montant === 0.0123 && b.jetons_entree === 100 && b.modele === 'claude-x' && !JSON.stringify(b).includes('Dupont'), b) }
{ const b = C.depuisLigneOps({ agent: 'contenu', fournisseur: 'claude', montant_eur: null, detail: {} }); const n = C.normaliserCout(b); attendu('ligne sans montant ni jetons : inconnue, pas zéro', n.connu === false && n.montant === null && n.jetons_connus === false, n) }
{ const b = C.depuisLigneOps({ agent: 'contenu', fournisseur: 'laya', montant_eur: 0, detail: { moteur: 'laya', mode: 'noul' } }); attendu('ligne Laya : moteur laya', b.moteur === 'laya', b) }

// totaux exacts
{ const lignes = [0.1, 0.2, 0.3].map((m, i) => ({ agent: 'a', moteur: 'claude', montant: m, le: `2026-09-29T0${i}:00:00Z`, modele: 'm1' }))
  const g = C.agregerParModele(lignes); attendu('0,1 + 0,2 + 0,3 = 0,6 exactement', g['a:claude'].connuEur === 0.6, g)
  const h = C.agregerParAgentEtModele(lignes); attendu('idem par agent et modèle', h[0].connuEur === 0.6, h) }
// doublon de battement
{ const l = { agent: 'usine', moteur: 'freellmapi', modele: 'gpt-oss-120b', montant: 0, jetons_entree: 10, jetons_sortie: 5, le: '2026-09-29T10:00:00Z', cle: C.cleBattement('usine', 'freellmapi', 'gpt-oss-120b', '2026-09-29T10') }
  const h = C.agregerParAgentEtModele([l, { ...l }, { ...l, le: '2026-09-29T10:00:05Z' }]); attendu('un même battement rejoué (même clé) : compté une fois', h[0].jetonsEntree === 10 && h[0].jetonsSortie === 5, h) }
// changement de modèle
{ const h = C.agregerParAgentEtModele([{ agent: 'contenu', moteur: 'claude', modele: 'm1', montant: 0.01, jetons_entree: 1, jetons_sortie: 1, le: '2026-09-29T01:00:00Z' }, { agent: 'contenu', moteur: 'claude', modele: 'm2', montant: 0.02, jetons_entree: 2, jetons_sortie: 2, le: '2026-09-29T02:00:00Z' }]); attendu('changement de modèle : deux lignes aux totaux exacts', h.length === 2 && h[0].connuEur === 0.01 && h[1].connuEur === 0.02, h) }
// jetons inconnus jamais zéro
{ const h = C.agregerParAgentEtModele([{ agent: 'contenu', moteur: 'claude', modele: 'm1', montant: 0.01, le: '2026-09-29T01:00:00Z' }]); attendu('jetons absents : comptés « inconnus », sommes à zéro sans prétendre les connaître', h[0].jetonsInconnus === 1 && h[0].jetonsEntree === 0, h) }
// Laya à part
{ const h = C.agregerParAgentEtModele([{ agent: 'contenu', moteur: 'laya', montant: 0, le: '2026-09-29T01:00:00Z' }, { agent: 'contenu', moteur: 'laya', montant: 0, le: '2026-09-29T02:00:00Z' }]); attendu('deux appels Laya : 2 appels, 0 € connu, 0 jeton, 0 inconnu', h[0].appelsLaya === 2 && h[0].connuEur === 0 && h[0].inconnu === 0 && h[0].jetonsInconnus === 0, h) }

// freellmapi
{ const r = C.lignesDepuisUsageFreellmapi({ data: [{ model: 'gpt-oss-120b', prompt_tokens: 100, completion_tokens: 40 }, { model: 'mistral-large-3' }, { rien: 1 }] }, { agent: 'usine', periodeIso: '2026-09-29T10', le: '2026-09-29T10:05:00Z' })
  attendu('freellmapi : 2 lignes, coût 0 €, jetons lus quand présents, inconnus sinon', r.length === 2 && r[0].montant === 0 && r[0].jetons_entree === 100 && r[1].jetons_entree === null && r[0].moteur === 'freellmapi', r) }
{ const r = C.lignesDepuisUsageFreellmapi('n\'importe quoi', { agent: 'usine', periodeIso: 'x', le: 'x' }); attendu('réponse freellmapi illisible : aucune ligne (jamais inventée)', r.length === 0, r) }

// fraîcheur, quota, manques
{ attendu('fraîcheur : frais / périmé / inconnu', C.etatFraicheur('2026-09-29T17:00:00Z', t).etat === 'frais' && C.etatFraicheur('2026-09-28T17:00:00Z', t).etat === 'perime' && C.etatFraicheur(null, t).etat === 'inconnu' && C.etatFraicheur('n\'importe quoi', t).etat === 'inconnu', null) }
{ const b = C.bilan([{ agent: 'contenu', moteur: 'claude', modele: 'm1', montant: 0.5, le: '2026-09-29T17:00:00Z' }, { agent: 'contenu', moteur: 'claude', modele: 'm1', le: '2026-09-29T17:30:00Z' }], [{ agent: 'usine', moteur: 'freellmapi', restant: null }, { agent: 'usine', moteur: 'ollama', restant: 42, unite: 'requêtes', le: '2026-09-29T17:00:00Z' }], t)
  attendu('bilan : consommation connue séparée du quota, manques dits, fraîcheur du plus récent', b.consommation[0].connuEur === 0.5 && b.consommation[0].inconnu === 1 && b.quotas[0].connu === false && b.quotas[1].connu === true && b.manquants.length >= 2 && b.fraicheur.etat === 'frais', b) }
console.log(ko === 0 ? 'essais-218 : PASS' : `essais-218 : ${ko} KO`)
process.exitCode = ko === 0 ? 0 : 1
