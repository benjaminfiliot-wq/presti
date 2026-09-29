// essais-214.mjs — cas de la fiche 026-214 que le juge (BO-1..BO-3) n'exerce pas : la combinaison signal déterministe + score Jev,
// la panne de Laya, le score seul qui ne tranche jamais, la comparaison de deux accroches (six publications minimum), les trois
// lignes du digest, la forme fermée du brief.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-214/essais-214.mjs
import { envJev } from '../../../scripts/fixtures/contenu/lib/commun.mjs'
import * as B from '../../../lib/contenu/boucle.ts'
import { nouveauBrief } from '../../../lib/contenu/brief.ts'

const jev = (niveau) => ({ env: envJev({ reponse: { niveau, distribution: { [niveau]: 1 } } }), enregistrerCout: async () => ({ ok: true }) })
const panne = { env: envJev({ indisponible: true }), enregistrerCout: async () => ({ ok: true }) }
const cand = (vues, fenetre = 'J+7') => ({ id: 'c1', texte: 'Contenu de test', provenance: 'campagne', mesures: [{ fenetre: 'H+1', disponible: true, valeur: 5 }, { fenetre, disponible: true, valeur: vues }] })
let ko = 0
const attendu = (nom, cond, detail) => { if (!cond) ko++; console.log(`${cond ? 'OK ' : 'KO '} ${nom}${cond ? '' : ` — ${JSON.stringify(detail)}`}`) }

{ const r = await B.recommander(cand(5000), jev(5)); attendu('vues élevées + score haut : refaire', r.statut === 'refaire' && r.scoreJev?.niveau === 5 && !('url' in r) && !('publie' in r), r) }
{ const r = await B.recommander(cand(5000), jev(1)); attendu('vues élevées mais score bas : seulement une tendance', r.statut === 'tendance', r) }
{ const r = await B.recommander(cand(50), jev(1)); attendu('vues faibles + score bas : suspendre', r.statut === 'suspendre', r) }
{ const r = await B.recommander(cand(50), jev(5)); attendu('vues faibles mais score haut : seulement une tendance', r.statut === 'tendance', r) }
{ const r = await B.recommander(cand(5000), panne); attendu('Laya en panne : le signal déterministe décide, la panne se voit (scoreJev null)', r.statut === 'refaire' && r.scoreJev === null && /indisponible/.test(r.motif), r) }
{ const r = await B.recommander(cand(500), jev(3)); attendu('vues intermédiaires : tendance', r.statut === 'tendance', r) }
{ const c = cand(0); c.mesures[1].valeur = null; const r = await B.recommander(c, jev(5)); attendu('vues inconnues + score 5 : le score seul ne fait jamais « refaire »', r.statut === 'tendance', r) }
{ const c = cand(0); c.mesures[1].valeur = null; const r = await B.recommander(c, panne); attendu('vues inconnues + Laya en panne : insuffisant', r.statut === 'insuffisant', r) }
{ const r = await B.recommander({ ...cand(5000), provenance: '' }, jev(5)); attendu('provenance absente : insuffisant', r.statut === 'insuffisant', r) }
{ const r = await B.recommander({ id: 'c', texte: 'x', provenance: 'p', mesures: [{ fenetre: 'H+1', disponible: true, valeur: 99999 }] }, jev(5)); attendu('H+1 seul, même énorme : insuffisant', r.statut === 'insuffisant', r) }
{ const r = await B.recommander(null, jev(5)); attendu('candidat absent : insuffisant, sans exception', r.statut === 'insuffisant', r) }

const acc = (id, vues, o = {}) => ({ id, ligne: 'L1', origine: 'approuvee', vues, ...o })
{ const r = B.comparerAccroches(acc('a', [900, 1000, 1100, 950, 1050, 1000]), acc('b', [400, 500, 450, 420, 480, 460])); attendu('six publications chacune, écart net : gagnant a, incertitude forte (petit échantillon)', r.ok && r.gagnant === 'a' && r.incertitude === 'forte', r) }
{ const r = B.comparerAccroches(acc('a', [1, 2, 3]), acc('b', [1, 2, 3, 4, 5, 6])); attendu('moins de six publications : refusé', r.ok === false, r) }
{ const r = B.comparerAccroches(acc('a', [1, 2, 3, 4, 5, 6], { origine: 'concurrent' }), acc('b', [1, 2, 3, 4, 5, 6])); attendu('accroche de concurrent : refusée', r.ok === false, r) }
{ const r = B.comparerAccroches(acc('a', [1, 2, 3, 4, 5, 6]), acc('b', [1, 2, 3, 4, 5, 6], { ligne: 'L2' })); attendu('lignes différentes : refusé', r.ok === false, r) }
{ const r = B.comparerAccroches(acc('a', [100, 101, 99, 100, 102, 98]), acc('b', [100, 100, 101, 99, 100, 101])); attendu('écart trop faible : pas de gagnant', r.ok && r.gagnant === null, r) }

{ const l = B.lignesDigest([{ id: 'a', statut: 'refaire' }, { id: 'b', statut: 'suspendre' }, { id: 'c', statut: 'tendance' }, { id: 'd', statut: 'tendance' }, { id: 'e', statut: 'insuffisant' }]); attendu('digest : exactement trois lignes', l.length === 3 && /Refaire : a/.test(l[0]) && /Suspendre : b/.test(l[1]) && /Tendance : c, d/.test(l[2]), l) }
{ const l = B.lignesDigest([]); attendu('digest vide : trois lignes « rien à signaler »', l.length === 3 && l.every((x) => /rien à signaler/.test(x)), l) }

{ const b = nouveauBrief('b1', 'L2', 'refaire c1', 'c1'); attendu('brief : proposition, restant = contrôle des promesses + accord de Benj, aucun champ de publication', b.statut === 'proposition' && b.restant.includes('accord_individuel_de_benj') && !('url' in b) && !('publie' in b), b) }
for (const args of [['b1', 'L9', 'm'], ['b1', 'L1', ' '], ['', 'L1', 'm'], ['b1', 'L1', 'm', 'a b']]) { let e = null; try { nouveauBrief(...args) } catch (x) { e = x } attendu(`brief invalide ${JSON.stringify(args)} : exception`, e instanceof TypeError, String(e)) }
console.log(ko === 0 ? 'essais-214 : PASS' : `essais-214 : ${ko} KO`)
process.exitCode = ko === 0 ? 0 : 1
