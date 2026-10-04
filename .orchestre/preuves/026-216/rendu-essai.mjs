// Rendu statique des cinq panneaux (react-dom/server) sur les jeux de l'essai à blanc : état plein, vide, non servi, panne Laya.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-216/rendu-essai.mjs
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { pathToFileURL } from 'node:url'
import { construireSuivi } from '../../../app/controle/contenu/suivi.ts'

const racine = path.resolve(import.meta.dirname, '../../..')
const require = createRequire(path.join(racine, 'package.json'))
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')

const src = fs.readFileSync(path.join(racine, 'components/controle/contenu/SuiviContenu.tsx'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
const tmp = path.join(racine, '.orchestre/preuves/026-216/.SuiviContenu.tmp.mjs')
fs.writeFileSync(tmp, js)
const { default: Panneaux } = await import(pathToFileURL(tmp).href)
fs.rmSync(tmp)

const MAINT = Date.parse('2026-10-02T16:00:00Z')
const base = { rendu_type: 'texte', affirmations: [], cree_le: '2026-10-01T08:00:00Z', chiffres_neutres: true }
const posts = [
  { ...base, id: 'a', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'Un devis en 2 minutes', rendu_type: 'video', preuve_publique: 'https://example.invalid/v/1', publie_le: '2026-10-01T10:00:00Z' },
  { ...base, id: 'b', ligne_id: 'L1', canal: 'tiktok', statut: 'en_attente', texte: '<img src=x onerror=alert(1)>', rendu_type: 'video' },
  { ...base, id: 'c', ligne_id: 'L5', canal: 'instagram', statut: 'publiable', texte: 'Meta prête' },
  { ...base, id: 'd', ligne_id: 'L5', canal: 'facebook', statut: 'refuse', texte: 'x', motif_refus: 'accord refusé' },
  { ...base, id: 'e', ligne_id: 'L1', canal: 'tiktok', statut: 'brouillon', chiffres_neutres: false, texte: 'Gagnez 40 % de temps', affirmations: [{ texte: 'Gagnez 40 % de temps', source_ref: 'etude:interne', verdict: 'refus', probabilite: 0.31, le: '2026-10-01' }] },
]
const plein = {
  maintenantMs: MAINT, r6Ouvert: false, jev: { disponible: true },
  lignes: [{ id: 'L1', libelle: 'Vidéo verticale', canaux: ['tiktok'], approuvee_le: '2026-09-30T08:00:00Z' }, { id: 'L5', libelle: 'Texte visuel', canaux: ['instagram'], approuvee_le: null }],
  posts,
  mesures: [{ post_id: 'a', echeance: 'H+1', metrique: 'vues', etat: 'mesure', valeur: 1200, source: 'releve_main', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: '2026-10-01T11:00:00Z' }, { post_id: 'a', echeance: 'H+24', metrique: 'vues', etat: 'non_mesure', valeur: null, source: 'api_officielle', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: '2026-10-02T10:00:00Z' }],
  ventes: [{ ligne: 'L1', total: 1, ambigus: 0, certitude: 'estimation', fenetre_attribution_h: 48 }],
  recommandations: [{ id: 'c1', statut: 'tendance', motif: 'vues intermédiaires', signal: 'neutre', scoreJev: { niveau: 3, distribution: {}, provenance: 'jev score --provider laya' } }],
}
const rendre = (e) => renderToStaticMarkup(React.createElement(Panneaux, { suivi: e === null ? null : construireSuivi(e) }))
const htmlPlein = rendre(plein)
const htmlPanneLaya = rendre({ ...plein, jev: { disponible: false, erreur: 'jev absent' } })
const htmlVide = rendre({ maintenantMs: MAINT, r6Ouvert: false, jev: { disponible: true }, lignes: [], posts: [], mesures: [], ventes: [], recommandations: [] })
const htmlNonServi = rendre({ maintenantMs: MAINT, r6Ouvert: null, jev: null, lignes: null, posts: null, mesures: null, ventes: null, recommandations: null })
const htmlNull = rendre(null)

for (const k of ['crieur', 'audience', 'recettes', 'radar', 'studio']) assert.ok(htmlPlein.includes(`data-suivi-panneau="${k}"`), `panneau ${k}`)
assert.ok(htmlPlein.includes('data-blocage="e"') && htmlPlein.includes('Gagnez 40 % de temps'), 'carte de blocage avec le texte exact')
assert.ok(htmlPlein.includes('&lt;img src=x onerror=alert(1)&gt;') && !htmlPlein.includes('<img'), 'texte hostile échappé, aucun <img>')
assert.ok(htmlPlein.includes('data-attente-r6'), 'attente R6 dite')
assert.ok(htmlPlein.includes('non mesuré') && /1[s  ]200/.test(htmlPlein), 'non mesuré et nombre servi')
assert.ok(htmlPlein.includes('(estimation)') && htmlPlein.includes('48 h'), 'estimation et fenêtre')
assert.ok(htmlPlein.includes('score Laya 3/5'), 'score Laya avec provenance')
assert.ok(htmlPanneLaya.includes('Laya (jev) ne répond pas : jev absent') && !htmlPanneLaya.includes('score Laya 3/5'), 'panne Laya dite, aucun score')
assert.ok(htmlVide.includes('Aucune vidéo n’attend d’accord.'), 'état vide')
assert.ok(htmlNonServi.includes('n’est pas servi'), 'non servi dit')
assert.ok(htmlNull.includes('n’est pas servi'), 'null dit')
for (const [nom, h] of [['plein', htmlPlein], ['panne-laya', htmlPanneLaya], ['vide', htmlVide], ['non-servi', htmlNonServi]]) {
  assert.ok(!/<button|<a |href=/i.test(h), `${nom} : aucun bouton ni lien`)
  assert.ok(!/(Publier|Envoyer|Copier)/.test(h), `${nom} : aucun verbe d'envoi`)
}
fs.writeFileSync(path.join(racine, '.orchestre/preuves/026-216/rendu-plein.html'), `<!doctype html><meta charset="utf-8"><title>essai</title>${htmlPlein}`)
console.log(`✅ rendu : plein ${htmlPlein.length} o, panne Laya ${htmlPanneLaya.length} o, vide ${htmlVide.length} o, non servi ${htmlNonServi.length} o ; aucun bouton ni lien ; texte hostile échappé`)
