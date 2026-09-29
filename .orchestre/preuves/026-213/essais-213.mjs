// essais-213.mjs — cas de la fiche 026-213 que le juge contenu-qa n'isole pas : la règle « estimation » et la règle « source »
// SANS que la panne de Laya ne les masque (le juge appelle ces cas sans faux jev : ils sont refusés pour « Laya indisponible »),
// puis l'échéancier H+1/H+24/J+7, le relevé manuel signé, les insights (en attente / non mesuré), les visites et l'attribution.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-213/essais-213.mjs
import { envJev } from '../../../scripts/fixtures/contenu/lib/commun.mjs'
import * as M from '../../../lib/contenu/mesure.ts'

const deps = (p) => ({ env: envJev({ reponse: { p } }), attendre: async () => {}, enregistrerCout: async () => ({ ok: true }) })
let ko = 0
const attendu = (nom, cond, detail) => { if (!cond) ko++; console.log(`${cond ? 'OK ' : 'KO '} ${nom}${cond ? '' : ` — ${JSON.stringify(detail)}`}`) }

// règles isolées (Laya répond 0,9 : seule la règle propre peut refuser)
{ const v = await M.verdictFormulePublique('3 ventes attribuées à L1 cette semaine', 'mesure.md', true, deps(0.9)); attendu('vente attribuée SANS « estimation » (Laya 0,9) : refusée par la règle propre', v.ok === false && /estimation/.test(v.motif), v) }
{ const v = await M.verdictFormulePublique('3 ventes (estimation) attribuées à L1 cette semaine', 'mesure.md', true, deps(0.9)); attendu('vente attribuée avec « estimation » (Laya 0,9) : acceptée', v.ok === true, v) }
{ const v = await M.verdictFormulePublique('3 ventes (estimation) attribuées avec certitude à ce post', 'mesure.md', true, deps(0.9)); attendu('vente « certaine » même avec le mot estimation : refusée', v.ok === false, v) }
{ const v = await M.verdictFormulePublique('Délai moyen 24h', null, false, deps(0.9)); attendu('chiffre SANS source (Laya 0,9) : refusé par la règle propre', v.ok === false && /sans source/.test(v.motif), v) }
{ const v = await M.verdictFormulePublique('Délai moyen 24h', 'mesure.md', false, deps(0.1)); attendu('chiffre avec source, Laya 0,1 : refusé', v.ok === false && /score de vérité/.test(v.motif), v) }
{ const v = await M.verdictFormulePublique('Délai moyen 24h', 'mesure.md', false, { env: envJev({ indisponible: true }), enregistrerCout: async () => ({ ok: true }) }); attendu('Laya en panne : refusé', v.ok === false && /Laya indisponible/.test(v.motif), v) }
{ const v = await M.verdictFormulePublique('Notre méthode', null, false, deps(0.1)); attendu('libellé sans chiffre : accepté sans Laya', v.ok === true, v) }

// mesure jamais zéro
for (const brut of [{ erreur: true }, { valeur: null }, {}, { valeur: -3 }, { valeur: NaN }]) {
  const m = M.normaliserMesure({ ...brut, source: 'api_officielle', le: '2026-09-20' }); attendu(`normaliserMesure ${JSON.stringify(brut)} : non mesuré`, m.valeur === null && m.disponible === false && m.etat === 'non_mesure', m)
}
{ const m = M.normaliserMesure({ valeur: 0, source: 'api_officielle', le: '2026-09-20' }); attendu('un zéro LU reste un zéro mesuré', m.valeur === 0 && m.disponible === true, m) }

// échéancier
const pub = '2026-09-20T10:00:00Z'
{ const p = M.planMesures(pub, Date.parse('2026-09-20T10:30:00Z')); attendu('30 min après : tout en attente', p.every((x) => x.statut === 'en_attente'), p) }
{ const p = M.planMesures(pub, Date.parse('2026-09-21T10:00:00Z')); attendu('24 h après : H+1 et H+24 échues, J+7 attend', p[0].statut === 'echue' && p[1].statut === 'echue' && p[2].statut === 'en_attente', p) }
{ const p = M.planMesures('n\'importe quoi', Date.parse('2026-10-20T10:00:00Z')); attendu('date de publication illisible : jamais échue', p.every((x) => x.statut === 'en_attente'), p) }

// insights
const post = { id: 'p1', canal: 'instagram', id_externe: 'IG-1', publie_le: pub }
{ const l = await M.mesurerInsights({ lireInsights: async () => { throw new Error('jamais') } }, post, 'H+24', Date.parse('2026-09-20T12:00:00Z')); attendu('avant échéance : en_attente, aucune lecture, valeur nulle', l.every((x) => x.etat === 'en_attente' && x.valeur === null), l[0]) }
{ const l = await M.mesurerInsights({ lireInsights: async () => ({ ok: true, valeurs: { vues: 120, j_aime: 0 } }) }, post, 'H+24', Date.parse('2026-09-22T12:00:00Z'))
  const v = l.find((x) => x.metrique === 'vues'), a = l.find((x) => x.metrique === 'j_aime'), p = l.find((x) => x.metrique === 'partages')
  attendu('lecture partielle : vues mesurées, zéro lu gardé, absent = non_mesure', v.etat === 'mesure' && v.valeur === 120 && a.etat === 'mesure' && a.valeur === 0 && p.etat === 'non_mesure' && p.valeur === null, { v, a, p }) }
{ const l = await M.mesurerInsights({ lireInsights: async () => ({ ok: false, erreur: '429', status: 429 }) }, post, 'H+24', Date.parse('2026-09-22T12:00:00Z')); attendu('API en erreur : non_mesure, jamais zéro', l.every((x) => x.etat === 'non_mesure' && x.valeur === null), l[0]) }
{ const l = await M.mesurerInsights(null, { ...post, canal: 'tiktok' }, 'H+24', Date.parse('2026-09-22T12:00:00Z')); attendu('TikTok sans relevé : non_mesure (relevé manuel attendu)', l.every((x) => x.etat === 'non_mesure' && x.source === 'releve_main'), l[0]) }

// relevé manuel TikTok
{ const r = M.ligneReleveManuelTikTok({ postId: 't1', echeance: 'H+24', valeurs: { vues: 50 }, signePar: 'quelquun', le: '2026-09-21T10:00:00Z' }); attendu('relevé TikTok non signé par Benj : refusé', r.ok === false, r) }
{ const r = M.ligneReleveManuelTikTok({ postId: 't1', echeance: 'H+24', valeurs: { vues: 50 }, signePar: 'Benj', le: '2026-09-21T10:00:00Z' }); attendu('relevé signé : vues mesurées, le reste non mesuré', r.ok && r.lignes.find((x) => x.metrique === 'vues').valeur === 50 && r.lignes.filter((x) => x.etat === 'non_mesure').length === 6, r) }

// cohérence source / métrique et fenêtre
{ const r = M.ligneMesure({ postId: 'p1', echeance: 'J+7', metrique: 'ventes', source: 'api_officielle', le: 'x', etat: 'mesure', valeur: 1, fenetreAttributionH: 48 }); attendu('ventes par une API de réseau : refusé', r.ok === false, r) }
{ const r = M.ligneMesure({ postId: 'p1', echeance: 'J+7', metrique: 'ventes', source: 'base_presti', le: '2026-09-27T00:00:00Z', etat: 'mesure', valeur: 1 }); attendu('ventes sans fenêtre : refusé', r.ok === false, r) }
{ const r = M.ligneMesure({ postId: 'p1', echeance: 'J+7', metrique: 'ventes', source: 'base_presti', le: '2026-09-27T00:00:00Z', etat: 'mesure', valeur: 1, fenetreAttributionH: 48 }); attendu('ventes avec fenêtre : estimation', r.ok && r.ligne.certitude === 'estimation' && r.ligne.fenetre_attribution_h === 48, r) }
{ const r = M.ligneMesure({ postId: 'p1', echeance: 'H+1', metrique: 'vues', source: 'api_officielle', le: 'x', etat: 'mesure', valeur: null }); attendu('valeur mesurée sans valeur : refusé (pas de zéro implicite)', r.ok === false, r) }

// visites et attribution
{ const c = M.compterVisites([{ source: 'tiktok', campagne: 'ligne-l1', le: 'x' }, { source: 'tiktok', campagne: 'ligne-l1', le: 'x' }, { source: 'tiktok', campagne: 'inventee', le: 'x' }], ['ligne-l1', 'ligne-l2']); attendu('visites par source et campagne, campagne inventée = inconnue', c['tiktok:ligne-l1'].visites === 2 && c['tiktok:inconnue'].visites === 1, c) }
const posts = [{ id: 'p1', ligne: 'L1', canal: 'instagram', publie_le: '2026-09-28T10:00:00Z' }, { id: 'p2', ligne: 'L2', canal: 'tiktok', publie_le: '2026-09-29T01:00:00Z' }]
{ const r = M.attribuerALaLigne([{ id: 'e1', le: '2026-09-29T09:00:00Z' }], posts, 48); attendu('deux posts candidats : estimation ambiguë, les deux candidats visibles', r.attributions[0].certitude === 'estimation' && r.attributions[0].ambigu === true && r.attributions[0].candidats.length === 2, r) }
{ const r = M.attribuerALaLigne([{ id: 'e1', le: '2026-10-29T09:00:00Z' }], posts, 48); attendu('aucun post dans la fenêtre : non attribuée', r.attributions[0].ligne === null && r.parLigne.length === 0, r) }
{ const r = M.attribuerALaLigne([], posts, 500); attendu('fenêtre invalide : refusé', r.ok === false, r) }
{ const r = M.attribuerALaLigne([{ id: 'e1', le: '2026-09-28T20:00:00Z' }], posts, 24); const l = M.libelleAttribution(r.parLigne[0]); const v = await M.verdictFormulePublique(l, 'mesure.md', true, deps(0.9)); attendu(`libellé d'attribution « ${l} » : passe la garde`, v.ok === true && /estimation/.test(l), { l, v }) }
console.log(ko === 0 ? 'essais-213 : PASS' : `essais-213 : ${ko} KO`)
process.exitCode = ko === 0 ? 0 : 1
