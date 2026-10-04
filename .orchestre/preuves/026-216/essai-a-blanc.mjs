// Essai à blanc du modèle de vue de 026-216 : personnes et dates fictives, aucun accès réseau ni base.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-216/essai-a-blanc.mjs
import assert from 'node:assert/strict'
import { construireSuivi, blocagesDe } from '../../../app/controle/contenu/suivi.ts'

const T0 = Date.parse('2026-10-01T10:00:00Z')
const MAINT = T0 + 30 * 3_600_000 // 30 h plus tard : H+1 et H+24 échues, J+7 en attente
const lignes = [
  { id: 'L1', libelle: 'Vidéo verticale', canaux: ['tiktok', 'instagram'], approuvee_le: '2026-09-30T08:00:00Z' },
  { id: 'L5', libelle: 'Texte visuel', canaux: ['instagram'], approuvee_le: null },
]
const base = { rendu_type: 'texte', affirmations: [], cree_le: '2026-10-01T08:00:00Z' }
const posts = [
  { ...base, id: 'p-publie', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'Un devis en 2 minutes', rendu_type: 'video', chiffres_neutres: true, preuve_publique: 'https://example.invalid/v/1', publie_le: '2026-10-01T10:00:00Z' },
  { ...base, id: 'p-sans-preuve', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'Sans preuve', chiffres_neutres: true, rendu_type: 'video', publie_le: '2026-10-01T10:00:00Z', preuve_publique: null },
  { ...base, id: 'p-attente', ligne_id: 'L1', canal: 'tiktok', statut: 'en_attente', texte: '<img src=x onerror=alert(1)>', rendu_type: 'video', chiffres_neutres: true, sous_titres: 'sous-titre incrusté' },
  { ...base, id: 'p-file', ligne_id: 'L1', canal: 'tiktok', statut: 'publiable', texte: 'Prêt', rendu_type: 'video', chiffres_neutres: true },
  { ...base, id: 'p-meta', ligne_id: 'L5', canal: 'instagram', statut: 'publiable', texte: 'Meta prête', chiffres_neutres: true },
  { ...base, id: 'p-refuse', ligne_id: 'L5', canal: 'facebook', statut: 'refuse', texte: 'Refusé', chiffres_neutres: true, motif_refus: 'accord refusé par Benj' },
  { ...base, id: 'p-chiffre-bas', ligne_id: 'L1', canal: 'tiktok', statut: 'brouillon', texte: 'Gagnez 40 % de temps', affirmations: [{ texte: 'Gagnez 40 % de temps', source_ref: 'etude:interne', verdict: 'refus', probabilite: 0.31, le: '2026-10-01' }] },
  { ...base, id: 'p-sans-source', ligne_id: 'L5', canal: 'instagram', statut: 'brouillon', texte: 'x', affirmations: [{ texte: '3 artisans sur 4', source_ref: '', verdict: 'pass', probabilite: 0.9, le: '2026-10-01' }] },
  { ...base, id: 'p-laya-panne', ligne_id: 'L5', canal: 'instagram', statut: 'brouillon', texte: 'x', affirmations: [{ texte: '12 clients', source_ref: 'base:presti', verdict: 'indisponible', probabilite: null, le: '2026-10-01' }] },
  { ...base, id: 'p-chiffre-nu', ligne_id: 'L5', canal: 'instagram', statut: 'brouillon', texte: 'Économisez 300 € par mois' },
  { ...base, id: 'p-ok', ligne_id: 'L5', canal: 'instagram', statut: 'brouillon', texte: 'x', affirmations: [{ texte: '10 devis', source_ref: 'base:presti', verdict: 'pass', probabilite: 0.8, le: '2026-10-01' }] },
]
const mesures = [
  { post_id: 'p-publie', echeance: 'H+1', metrique: 'vues', etat: 'mesure', valeur: 120, source: 'releve_main', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: '2026-10-01T11:00:00Z' },
  { post_id: 'p-publie', echeance: 'H+24', metrique: 'vues', etat: 'non_mesure', valeur: null, source: 'api_officielle', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: '2026-10-02T10:00:00Z' },
  { post_id: 'p-publie', echeance: 'H+24', metrique: 'ventes', etat: 'mesure', valeur: 1, source: 'base_presti', certitude: 'estimation', fenetre_attribution_h: 48, mesure_le: '2026-10-02T10:05:00Z' },
]
const ventes = [{ ligne: 'L1', total: 2, ambigus: 1, certitude: 'estimation', fenetre_attribution_h: 48 }]
const reco = [{ id: 'c1', statut: 'refaire', motif: 'vues élevées', signal: 'fort', scoreJev: { niveau: 4, distribution: {}, provenance: 'jev score --provider laya' } }]
const entree = { maintenantMs: MAINT, lignes, posts, mesures, ventes, recommandations: reco, jev: { disponible: true }, r6Ouvert: false }

const s = construireSuivi(entree)
const ok = []
const verifie = (nom, f) => { f(); ok.push(nom); console.log('✅', nom) }

verifie('Crieur : les lignes, l’attente d’accord, la file TikTok, les refus et les publications sont séparés', () => {
  assert.equal(s.crieur.lignes.length, 2)
  assert.equal(s.crieur.lignes[0].publies, 2)
  assert.deepEqual(s.crieur.enAttente.map((p) => p.id), ['p-attente'])
  assert.deepEqual(s.crieur.fileTiktok.map((p) => p.id), ['p-file'])
  assert.deepEqual(s.crieur.refuses.map((p) => p.motif), ['accord refusé par Benj'])
  assert.equal(s.crieur.publications.length, 2)
})
verifie('R6 fermé : le post Meta prêt attend R6, il ne devient pas « publié »', () => {
  assert.deepEqual(s.crieur.attenteR6.map((p) => p.id), ['p-meta'])
  assert.equal(construireSuivi({ ...entree, r6Ouvert: true }).crieur.attenteR6.length, 0)
  assert.equal(construireSuivi({ ...entree, r6Ouvert: null }).crieur.attenteR6.length, 1, 'R6 inconnu = fermé')
})
verifie('Une publication sans preuve publique est dite sans preuve', () => {
  assert.equal(s.crieur.publications.find((p) => p.id === 'p-sans-preuve').preuveManquante, true)
  assert.equal(s.crieur.publications.find((p) => p.id === 'p-publie').preuveManquante, false)
})
verifie('Le texte servi reste tel quel (aucune interprétation)', () => {
  assert.equal(s.crieur.enAttente[0].texteExact, '<img src=x onerror=alert(1)>')
  assert.ok(s.crieur.enAttente[0].dit.includes('sous-titres : sous-titre incrusté'))
})
verifie('Audience : « non mesuré » et « en attente » ne sont jamais 0', () => {
  const a = s.audience.publications.find((p) => p.postId === 'p-publie')
  const h24 = a.echeances.find((x) => x.echeance === 'H+24')
  const vues = h24.cellules.find((c) => c.metrique === 'vues')
  assert.equal(vues.texte, 'non mesuré'); assert.equal(vues.disponible, false)
  const j7 = a.echeances.find((x) => x.echeance === 'J+7')
  assert.equal(j7.statut, 'en_attente'); assert.deepEqual(j7.cellules, [])
  const h1 = a.echeances.find((x) => x.echeance === 'H+1').cellules.find((c) => c.metrique === 'vues')
  assert.equal(h1.texte, '120'); assert.equal(h1.source, 'releve_main')
  for (const x of a.echeances) for (const c of x.cellules) assert.notEqual(c.texte, '0')
})
verifie('Audience : la vente est une estimation avec sa fenêtre', () => {
  const v = s.audience.publications[0].echeances.find((x) => x.echeance === 'H+24').cellules.find((c) => c.metrique === 'ventes')
  assert.equal(v.estimation, true); assert.equal(v.fenetreH, 48); assert.match(v.texte, /estimation/)
})
verifie('Recettes : la vente par ligne dit estimation et sa fenêtre', () => {
  assert.match(s.recettes.lignes[0].libelle, /estimation/); assert.match(s.recettes.lignes[0].libelle, /48 h/)
})
verifie('Blocages : <0,5, source absente, Laya indisponible, chiffre nu ; le bon post ne bloque pas', () => {
  const ids = s.blocages.map((b) => b.postId)
  for (const id of ['p-chiffre-bas', 'p-sans-source', 'p-laya-panne', 'p-chiffre-nu']) assert.ok(ids.includes(id), id)
  assert.ok(!ids.includes('p-ok')); assert.ok(!ids.includes('p-publie'))
  assert.equal(s.blocages.find((b) => b.postId === 'p-chiffre-bas').texteExact, 'Gagnez 40 % de temps')
  assert.match(s.blocages.find((b) => b.postId === 'p-sans-source').manque, /preuve manquante/)
  assert.match(s.blocages.find((b) => b.postId === 'p-laya-panne').manque, /Laya indisponible/)
  assert.match(s.blocages.find((b) => b.postId === 'p-chiffre-nu').manque, /preuve manquante/)
  const seuil = blocagesDe([{ ...base, id: 'x', ligne_id: 'L1', canal: 'tiktok', statut: 'brouillon', texte: 'a', affirmations: [{ texte: 'n 5', source_ref: 's1', verdict: 'pass', probabilite: 0.4999, le: '2026-10-01' }] }])
  assert.equal(seuil.length, 1)
  const egal = blocagesDe([{ ...base, id: 'y', ligne_id: 'L1', canal: 'tiktok', statut: 'brouillon', texte: 'a', affirmations: [{ texte: 'n 5', source_ref: 's1', verdict: 'pass', probabilite: 0.5, le: '2026-10-01' }] }])
  assert.equal(egal.length, 0)
})
verifie('Radar : le score vient de Laya, et la panne de Laya est dite, sans aucun score', () => {
  assert.equal(s.radar.candidats[0].niveau, 4); assert.equal(s.radar.candidats[0].provenance, 'jev score --provider laya')
  const panne = construireSuivi({ ...entree, jev: { disponible: false, erreur: 'jev absent' } })
  assert.equal(panne.radar.etat, 'panne'); assert.deepEqual(panne.radar.candidats, []); assert.match(panne.radar.message, /jev absent/)
  assert.equal(construireSuivi({ ...entree, jev: null }).radar.etat, 'panne')
})
verifie('Studio : la vidéo en attente d’accord est montrée avec tout ce qu’on verra', () => {
  assert.deepEqual(s.studio.enAttente.map((p) => p.id), ['p-attente'])
})
verifie('Témoins rouges : une source absente est « non servie », jamais vide ni zéro', () => {
  const vide = construireSuivi({ maintenantMs: MAINT, lignes: null, posts: null, mesures: null, ventes: null, recommandations: null, jev: { disponible: true }, r6Ouvert: false })
  assert.equal(vide.crieur.etat, 'non_servi'); assert.equal(vide.audience.etat, 'non_servi'); assert.equal(vide.recettes.etat, 'non_servi')
  assert.equal(vide.radar.etat, 'non_servi'); assert.equal(vide.studio.etat, 'non_servi'); assert.deepEqual(vide.blocages, [])
  const rien = construireSuivi({ maintenantMs: MAINT, lignes: [], posts: [], mesures: [], ventes: [], recommandations: [], jev: { disponible: true }, r6Ouvert: false })
  assert.equal(rien.crieur.etat, 'vide'); assert.equal(rien.audience.etat, 'vide'); assert.equal(rien.recettes.etat, 'vide'); assert.equal(rien.radar.etat, 'vide'); assert.equal(rien.studio.etat, 'vide')
})
verifie('Aucune donnée de prospect dans la sortie (e-mail, téléphone)', () => {
  const j = JSON.stringify(s)
  assert.ok(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(j.replace(/example\.invalid/g, '')), 'e-mail')
  assert.ok(!/\b0[1-9]([ .]?\d{2}){4}\b/.test(j), 'téléphone')
})
console.log(`\n${ok.length} contrôles verts`)
