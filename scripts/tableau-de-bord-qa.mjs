#!/usr/bin/env node
// scripts/tableau-de-bord-qa.mjs — juge du tableau de bord de gestion de l'artisan (/chiffres, 06/10/2026).
//
// Sans réseau, sans compte, sans base : il rejoue le module de calcul (lib/tableau-de-bord/calculer.ts) sur un jeu de
// données dont CHAQUE résultat attendu est écrit ici à la main (et recompté dans les commentaires), puis il RENDS
// l'écran (app/chiffres/Tableau.tsx, transpilé puis passé à react-dom/server) pour lire ce que l'artisan verrait.
// Il teste la SUBSTANCE — valeurs, cas limites, isolation, absence de TVA dans le HTML réel — pas l'existence d'un fichier.
//
// Ce qu'il NE prouve PAS : que la page lit la vraie base sous une vraie session (aucun compte n'est créé) ; il vérifie
// seulement, sur le texte de la page, qu'elle filtre chaque requête sur le compte, n'écrit rien et n'affiche pas de zéros
// quand une requête échoue. La lecture réelle se constate dans le navigateur, connecté.
//
// Usage : node scripts/tableau-de-bord-qa.mjs [--preuve-echecs] [--racine=<dossier>]
//   --preuve-echecs : joue le témoin puis chaque sabotage sur une copie ; chacun doit rendre rouge le critère visé.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const PREUVE = process.argv.includes('--preuve-echecs')
for (const a of process.argv.slice(2)) if (a !== '--preuve-echecs' && !a.startsWith('--racine=')) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const RACINE = path.resolve(process.argv.find((a) => a.startsWith('--racine='))?.slice(9) || DEPOT)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tdb-qa-'))
// Les modules transpilés doivent trouver react / react-dom : on les range sous node_modules/.cache du dépôt.
const CACHE = path.join(DEPOT, 'node_modules', '.cache', `tableau-de-bord-qa-${process.pid}`)
const require = createRequire(import.meta.url)

// Le module est un .ts nu (aucun package « type ») : Node avertit à chaque import, ce qui noie la sortie du juge.
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.error(w) })

const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 260)}`); if (!cond) rouges.push(nom) }
const lire = (f) => fs.readFileSync(f, 'utf8')
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const aplatir = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/[\u202f\u00a0]/g, ' ').replace(/\s+/g, ' ').trim()
function toutNaN(v, chemin = '') { // NaN, Infinity ou undefined n'ont rien à faire dans un indicateur
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [`${chemin}=${v}`]
  if (v === undefined) return [`${chemin}=undefined`]
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => toutNaN(x, `${chemin}.${k}`))
  return []
}
function geler(v) { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const x of Object.values(v)) geler(x) } return v }
const copieProfonde = (v) => JSON.parse(JSON.stringify(v))

// ───────────────────────── Le jeu de données connu ─────────────────────────
// « Maintenant » : mardi 6 octobre 2026, 10 h UTC = 12 h à Paris.
// Mois courant 2026-10 · mois précédent 2026-09 · année 2026 · fenêtre d'activité 2025-11 → 2026-10 · graphique 2026-05 → 2026-10.
const MAINTENANT = new Date('2026-10-06T10:00:00Z')
const A = 'art-A', B = 'art-B'
// Chaque facture porte aussi total_tva et total_ht : Presti est en franchise, le module ne doit lire ni l'un ni l'autre.
const fac = (id, statut, emission, echeance, ttc, extra = {}) => ({ id, artisan_id: A, statut, date_emission: emission, date_echeance: echeance, total_ttc: ttc, total_tva: 200, total_ht: 800, devis_id: null, avoir_de: null, ...extra })
const FACTURES_A = [
  fac('f1', 'emise', '2026-10-02', '2026-11-01', 1000, { devis_id: 'd1' }), // CA octobre · en attente
  fac('f2', 'payee', '2026-10-03', '2026-10-20', 500.5),                    // CA octobre · encaissée · SANS devis
  fac('f3', 'emise', '2026-09-10', '2026-09-30', 2000),                     // CA septembre · en retard de 6 j
  fac('f4', 'payee', '2026-09-15', '2026-09-30', 800),                      // CA septembre · encaissée
  fac('f5', 'emise', '2026-08-01', '2026-08-31', 300),                      // CA août · en retard de 36 j
  fac('f6', 'emise', '2026-10-06', '2026-10-06', 100),                      // CA octobre · échéance AUJOURD'HUI : pas en retard
  fac('f7', 'emise', '2026-03-10', null, 400),                              // année seulement · sans échéance : en attente
  fac('f9', 'annulee', '2026-10-04', '2026-10-30', 700),                    // annulée …
  fac('a9', 'emise', '2026-10-05', '2026-10-05', -700, { avoir_de: 'f9' }), // … par cet avoir : ni l'un ni l'autre
  fac('f10', 'brouillon', '2026-10-01', null, 9999),                        // brouillon : jamais compté
  fac('f11', 'payee', '2025-12-20', '2026-01-20', 600),                     // année précédente
  fac('f12', 'emise', '2026-09-20', '2026-09-25', 250),                     // le statut n'a pas été posé, mais l'avoir existe : exclue
  fac('a12', 'emise', '2026-10-01', '2026-10-01', -250, { avoir_de: 'f12' }),
  fac('f13', 'annulee', '2026-10-01', '2026-10-15', 111),                   // annulée sans avoir : exclue par son statut
  fac('f14', 'emise', null, '2026-12-01', 77),                              // sans date d'émission : en attente, hors CA
]
const dev = (id, statut, emission, extra = {}) => ({ id, artisan_id: A, numero: `DEV-${id.slice(1)}`, client_nom: 'Client', statut, date_emission: emission, total_ttc: 100, total_tva: 20, envoye_le: null, accepte_le: null, created_at: `${emission}T09:00:00Z`, lead_id: null, validite_jours: 90, ...extra })
const DEVIS_A = [
  dev('d1', 'envoye', '2026-09-20', { envoye_le: '2026-09-20T08:00:00Z', lead_id: 'L1', client_nom: 'Mme Roux', total_ttc: 1500 }),
  dev('d2', 'accepte', '2026-09-25', { envoye_le: '2026-09-25T12:00:00Z', lead_id: 'L2' }),
  dev('d3', 'refuse', '2026-08-10', { lead_id: 'L3' }),                                        // jamais d'envoye_le : on retombe sur created_at
  dev('d4', 'envoye', '2026-10-01', { envoye_le: '2026-10-01T10:00:00Z' }),                    // 5 jours
  dev('d5', 'brouillon', '2026-10-02'),
  dev('d6', 'envoye', '2026-09-29', { envoye_le: '2026-09-29T09:00:00Z' }),                    // EXACTEMENT 7 jours : pas à relancer
  dev('d7', 'envoye', '2026-09-28', { envoye_le: '2026-09-28T09:00:00Z', client_nom: 'M. Petit', total_ttc: 300 }), // 8 jours : à relancer
  dev('d8', 'envoye', '2026-06-01', { validite_jours: 30 }),                                   // 127 j > 30 j de validité : périmé, pas à relancer
  dev('d9', 'accepte', '2025-10-15'),                                                          // hors des 12 mois
  dev('d10', 'expire', '2026-07-01'),
  dev('d11', 'envoye', '2026-09-21', { envoye_le: '2026-09-21T06:30:00Z', lead_id: 'L1', client_nom: 'Mme Roux', total_ttc: 1250 }), // 2e devis de L1
  dev('d12', 'accepte', '2026-10-04', { envoye_le: '2026-10-04T10:00:00Z', lead_id: 'L4' }),   // envoyé AVANT la demande L4 : délai négatif ignoré
  dev('d13', 'accepte', '2026-07-15', { lead_id: 'L-inconnu' }),                               // demande introuvable : ignoré pour le délai
]
// La ville est celle de la DEMANDE (0133, décision 2 de Benj du 06/10) : le bloc « Villes » ne lit plus clients.ville.
const dem = (id, creation, canal, type, ville) => ({ id, artisan_id: A, canal, statut: 'nouveau', created_at: creation, type_chantier: type, ville })
const DEMANDES_A = [
  dem('L1', '2026-09-20T06:30:00Z', 'formulaire', 'Plomberie', 'Lyon'),
  dem('L2', '2026-09-25T08:00:00Z', 'formulaire', 'plomberie ', 'lyon'),
  dem('L3', '2026-08-09T09:00:00Z', 'email', 'Électricité', 'Saint-Étienne'),
  dem('L4', '2026-10-05T10:00:00Z', 'site', 'electricite', 'saint etienne'),
  dem('L5', '2026-09-30T22:30:00Z', null, null, 'Paris'),          // 00 h 30 à Paris le 1er octobre : c'est OCTOBRE
  dem('L6', '2026-05-31T22:30:00Z', 'whatsapp', null, 'Nantes'),   // 00 h 30 à Paris le 1er juin : c'est JUIN
  dem('L7', '2026-04-30T21:59:00Z', 'formulaire', 'Maçonnerie', 'Lille'), // 23 h 59 à Paris le 30 avril : hors graphique, dans les 12 mois
  dem('L8', '2025-09-01T10:00:00Z', 'formulaire', 'Toiture', 'Marseille'),    // 13 mois : hors fenêtre (sa ville aussi)
  dem('L9', null, 'formulaire', 'Cave', 'Marseille'),                          // sans date : ignorée (sa ville aussi)
  dem('L10', '2026-10-06T08:00:00Z', 'Formulaire', 'Plomberie', 'Tours'),
]
// Des demandes sans ville utilisable (nulle, vide, blanche) : elles ne changent pas le bloc « Villes ».
const SANS_VILLE = [dem('V1', '2026-10-02T10:00:00Z', 'formulaire', null, null), dem('V2', '2026-10-02T11:00:00Z', 'formulaire', null, ''), dem('V3', '2026-10-02T12:00:00Z', 'formulaire', null, '  ')]

// Les lignes d'un autre artisan, et des lignes sans artisan : énormes, pour que la fuite se voie.
const AUTRUI = {
  factures: [fac('x1', 'emise', '2026-10-01', '2026-09-01', 100000, { artisan_id: B }), fac('x2', 'payee', '2026-10-01', null, 50000, { artisan_id: B }), fac('x3', 'emise', '2026-10-01', '2026-09-01', 77777, { artisan_id: undefined }), fac('x4', 'emise', '2026-10-01', '2026-09-01', 12345, { artisan_id: '' })],
  devis: [dev('x1', 'envoye', '2026-08-01', { artisan_id: B }), dev('x2', 'accepte', '2026-10-01', { artisan_id: B }), dev('x3', 'accepte', '2026-10-01', { artisan_id: null })],
  demandes: [dem('xL1', '2026-10-01T10:00:00Z', 'tiktok', 'Piscine', 'Marseille'), { ...dem('xL2', '2026-10-01T10:00:00Z', 'tiktok', 'Piscine', 'Marseille'), artisan_id: B }, { ...dem('xL3', '2026-10-01T10:00:00Z', 'tiktok', 'Piscine', 'Marseille'), artisan_id: '' }],
}
AUTRUI.demandes[0].artisan_id = undefined
// Des COPIES à chaque appel : un module qui trierait ou modifierait ses entrées ne doit pas fausser les critères suivants.
const frais = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const ENTREES = (extra = {}) => ({ artisanId: A, factures: frais(FACTURES_A), devis: frais(DEVIS_A), demandes: frais(DEMANDES_A), maintenant: MAINTENANT, ...extra })
const MELANGE = () => ({ artisanId: A, factures: frais([...FACTURES_A, ...AUTRUI.factures]), devis: frais([...DEVIS_A, ...AUTRUI.devis]), demandes: frais([...DEMANDES_A, ...AUTRUI.demandes]), maintenant: MAINTENANT })

async function charger(racine, n) {
  const fichier = path.join(racine, 'lib/tableau-de-bord/calculer.ts')
  // Un import dynamique par copie ; le paramètre évite le cache si la même copie est relue.
  return import(`${pathToFileURL(fichier).href}?v=${n}-${Date.now()}`)
}

let compteur = 0
async function rendre(racine, indicateurs, tronque = false) {
  const ts = require('typescript')
  const react = require('react')
  const serveur = require('react-dom/server')
  const dossier = path.join(CACHE, String(++compteur))
  fs.mkdirSync(dossier, { recursive: true })
  const source = lire(path.join(racine, 'app/chiffres/Tableau.tsx'))
  const sortie = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true }, fileName: 'Tableau.tsx' }).outputText
  const fichier = path.join(dossier, 'Tableau.mjs')
  fs.writeFileSync(fichier, sortie)
  const mod = await import(pathToFileURL(fichier).href)
  return serveur.renderToStaticMarkup(react.createElement(mod.default, { i: indicateurs, tronque }))
}

async function juger(racine, pref = '') {
  const lib = await charger(racine, pref)
  const calculer = lib.calculer
  const R = calculer(ENTREES())
  const a = R.argent

  // TB-1 : le chiffre d'affaires facturé — mois, mois précédent, année, variation
  ok('TB-1 CA facturé : octobre 1 600,50 · septembre 2 800 · 2026 : 5 100,50 · variation −43 % (brouillon, annulée, avoir, année précédente, sans date : hors CA)',
    a.caMois === 1600.5 && a.caMoisPrecedent === 2800 && a.caAnnee === 5100.5 && a.variationMois === -43,
    JSON.stringify([a.caMois, a.caMoisPrecedent, a.caAnnee, a.variationMois]))
  ok('TB-1 le graphique : mai→octobre = 0 · 0 · 0 · 300 · 2 800 · 1 600,50, libellés « mai juin juil. août sept. oct. »',
    egal(R.mois.map((m) => m.ca), [0, 0, 0, 300, 2800, 1600.5]) && egal(R.mois.map((m) => m.libelle), ['mai', 'juin', 'juil.', 'août', 'sept.', 'oct.']) && egal(R.mois.map((m) => m.cle), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']),
    JSON.stringify(R.mois))

  // TB-2 : l'avoir
  {
    const seul = calculer(ENTREES({ factures: [fac('f9', 'annulee', '2026-10-04', '2026-10-30', 700), fac('a9', 'emise', '2026-10-05', '2026-10-05', -700, { avoir_de: 'f9' })] }))
    const sansStatut = calculer(ENTREES({ factures: [fac('f12', 'emise', '2026-09-20', '2026-09-25', 250), fac('a12', 'emise', '2026-10-01', '2026-10-01', -250, { avoir_de: 'f12' })] }))
    ok('TB-2 une facture annulée et son avoir ne comptent NI dans le CA, NI dans l\'attente, NI dans le retard (le net n\'est pas −700)',
      seul.argent.caMois === 0 && seul.argent.caAnnee === 0 && seul.argent.enAttente === 0 && seul.argent.enRetard === 0 && seul.argent.nbEnRetard === 0, JSON.stringify(seul.argent))
    ok('TB-2 même si le statut « annulée » n\'a pas été posé, la facture visée par un avoir est exclue (pas de retard fantôme de 250 €)',
      sansStatut.argent.caAnnee === 0 && sansStatut.argent.enRetard === 0 && sansStatut.argent.nbEnRetard === 0, JSON.stringify(sansStatut.argent))
  }

  // TB-3 : facture sans devis, brouillon
  {
    const m = calculer(ENTREES({ factures: [fac('s1', 'emise', '2026-10-03', null, 321, { devis_id: null })] }))
    const b = calculer(ENTREES({ factures: [fac('b1', 'brouillon', '2026-10-03', null, 321)] }))
    ok('TB-3 une facture sans devis (devis_id vide) est comptée ; un brouillon ne l\'est pas', m.argent.caMois === 321 && b.argent.caMois === 0 && b.argent.enAttente === 0, JSON.stringify([m.argent.caMois, b.argent.caMois, b.argent.enAttente]))
  }

  // TB-4 : encaissé / en attente / en retard
  ok('TB-4 encaissé 2026 = 1 300,50 · en attente = 1 577 (4 factures, dont celle échue AUJOURD\'HUI, celle sans échéance et celle sans date) · en retard = 2 300 (2 factures, 36 j au plus)',
    a.encaisseAnnee === 1300.5 && a.enAttente === 1577 && a.nbEnAttente === 4 && a.enRetard === 2300 && a.nbEnRetard === 2 && a.retardMaxJours === 36,
    JSON.stringify(a))

  // TB-5 : division par zéro
  {
    const sansHier = calculer(ENTREES({ factures: [fac('z1', 'emise', '2026-10-03', null, 100)] }))
    const brouillons = calculer(ENTREES({ devis: [dev('z2', 'brouillon', '2026-10-02')], factures: [], demandes: [] }))
    ok('TB-5 devis : 11 envoyés, 3 acceptés, taux 27 % (d9 hors des 12 mois, le brouillon d5 jamais compté)', R.devis.envoyes === 11 && R.devis.acceptes === 3 && R.devis.tauxAcceptation === 27, JSON.stringify(R.devis))
    ok('TB-5 aucun devis envoyé : taux = null (pas 0 %, pas NaN) ; mois précédent à zéro : variation = null', brouillons.devis.envoyes === 0 && brouillons.devis.tauxAcceptation === null && sansHier.argent.caMois === 100 && sansHier.argent.caMoisPrecedent === 0 && sansHier.argent.variationMois === null, JSON.stringify([brouillons.devis, sansHier.argent.variationMois]))
  }

  // TB-6 : délai demande → devis
  {
    const seul = calculer(ENTREES({ devis: [dev('e1', 'envoye', '2026-09-20', { envoye_le: '2026-09-20T07:30:00Z', lead_id: 'L1' })], demandes: [DEMANDES_A[0]] }))
    ok('TB-6 délai moyen = 9,8 h sur 3 demandes : L1 1,5 h (son 2e devis, 24 h, est ignoré) · L2 4 h · L3 24 h (retombe sur created_at) ; délai négatif (L4), demande inconnue et devis sans demande ignorés',
      R.devis.delaiMoyenHeures === 9.8 && R.devis.nbDelais === 3, JSON.stringify(R.devis))
    ok('TB-6 une seule demande, un seul devis : délai = 1 h exactement', seul.devis.delaiMoyenHeures === 1 && seul.devis.nbDelais === 1, JSON.stringify(seul.devis))
  }

  // TB-7 : devis à relancer
  ok('TB-7 à relancer : d1 (16 j), d11 (15 j), d7 (8 j) — pas d6 (7 j pile), pas d4 (5 j), pas d8 (périmé : 127 j pour 30 j de validité), pas les devis acceptés/refusés/brouillons ; triés du plus ancien',
    R.aRelancer.total === 3 && egal(R.aRelancer.liste.map((d) => [d.id, d.jours]), [['d1', 16], ['d11', 15], ['d7', 8]]) && R.aRelancer.seuilJours === 7
      && R.aRelancer.liste[0].client === 'Mme Roux' && R.aRelancer.liste[0].numero === 'DEV-1' && R.aRelancer.liste[0].montant === 1500 && R.aRelancer.liste[2].montant === 300,
    JSON.stringify(R.aRelancer))

  // TB-8 : demandes par mois et par canal
  ok('TB-8 demandes par mois (mai→octobre, heure de Paris) = 0 · 1 · 0 · 1 · 2 · 3 : une demande du 30/09 à 22 h 30 UTC est d\'OCTOBRE, celle du 31/05 à 22 h 30 UTC est de JUIN, mois sans activité = 0',
    egal(R.mois.map((m) => m.demandes), [0, 1, 0, 1, 2, 3]) && R.demandes.total === 7, JSON.stringify(R.mois.map((m) => m.demandes)))
  ok('TB-8 par canal (6 mois) : Formulaire 3 (43 %), puis Autre, E-mail, Site, WhatsApp à 1 (14 %) — canal vide = « Autre », casse ignorée',
    egal(R.demandes.parCanal.map((c) => [c.libelle, c.nb, c.part]), [['Formulaire', 3, 43], ['Autre', 1, 14], ['E-mail', 1, 14], ['Site', 1, 14], ['WhatsApp', 1, 14]]), JSON.stringify(R.demandes.parCanal))

  // TB-9 : types de chantier et villes
  ok('TB-9 types de chantier (12 mois) : Plomberie 3 (50 %), Électricité 2 (33 %) — casse, accents et espaces regroupés —, Maçonnerie 1 (17 %) ; Toiture (13 mois) et la demande sans date exclues',
    egal(R.chantiers.map((c) => [c.libelle, c.nb, c.part]), [['Plomberie', 3, 50], ['Électricité', 2, 33], ['Maçonnerie', 1, 17]]), JSON.stringify(R.chantiers))
  ok('TB-9 villes des DEMANDES (12 mois) : Lyon 2 (25 %), Saint-Étienne 2 (25 %) — « lyon » et « saint etienne » regroupés —, puis Lille, Nantes, Paris à 1 (13 %) ; au plus 5 (Tours coupé) ; Marseille (13 mois, sans date) exclue',
    egal(R.villes.map((c) => [c.libelle, c.nb, c.part]), [['Lyon', 2, 25], ['Saint-Étienne', 2, 25], ['Lille', 1, 13], ['Nantes', 1, 13], ['Paris', 1, 13]]), JSON.stringify(R.villes))
  {
    const avecVides = calculer(ENTREES({ demandes: frais([...DEMANDES_A, ...SANS_VILLE]) }))
    ok('TB-9 villes nulles, vides ou blanches : ignorées (le bloc « Villes » est le même avec ou sans elles)', egal(avecVides.villes, R.villes), JSON.stringify(avecVides.villes))
  }

  // TB-10 : jeu vide et valeurs sales
  {
    const vide = calculer({ artisanId: A, factures: [], devis: [], demandes: [], maintenant: MAINTENANT })
    const sales = calculer(ENTREES({ factures: [fac('g1', 'emise', '2026-10-01', '2026-12-01', null), fac('g2', 'emise', '2026-10-01', '2026-12-01', 'abc'), fac('g3', 'emise', '2026-10-01', '2026-12-01', '250,5'), fac('g4', 'emise', '2026-10-01', '2026-12-01', '100'), fac('g5', 'emise', '2026-10-01', '2026-12-01', undefined)], devis: [], demandes: [] }))
    const passe = calculer(ENTREES({ factures: [fac('p1', 'emise', '2026-03-01', '2026-03-31', 500)], devis: [], demandes: [] }))
    ok('TB-10 aucune donnée : écran « vide », zéros, taux / variation / délai = null, listes vides, ni NaN ni undefined',
      vide.vide === true && vide.argent.caMois === 0 && vide.argent.caAnnee === 0 && vide.argent.variationMois === null && vide.devis.tauxAcceptation === null && vide.devis.delaiMoyenHeures === null && vide.aRelancer.total === 0 && vide.demandes.total === 0 && vide.chantiers.length === 0 && vide.villes.length === 0 && vide.mois.length === 6 && toutNaN(vide).length === 0,
      JSON.stringify([vide.vide, toutNaN(vide)]))
    ok('TB-10 montants sales (null, « abc », undefined, « 250,5 », « 100 ») : comptés pour 0, 0, 0, 250,50 et 100 — jamais NaN', sales.argent.caMois === 350.5 && toutNaN(sales).length === 0, JSON.stringify([sales.argent.caMois, toutNaN(sales)]))
    ok('TB-10 un mois sans activité (rien depuis mars) : CA du mois = 0, variation = null, mais le retard, lui, reste visible (500 € échus depuis 189 j)', passe.argent.caMois === 0 && passe.argent.variationMois === null && passe.argent.enRetard === 500 && passe.argent.retardMaxJours === 189 && toutNaN(passe).length === 0, JSON.stringify(passe.argent))
  }

  // TB-11 : isolation par artisan
  {
    const mel = calculer(MELANGE())
    const sansId = calculer({ ...MELANGE(), artisanId: '' })
    const autre = calculer({ ...MELANGE(), artisanId: B })
    ok('TB-11 isolation : les lignes d\'un autre artisan et les lignes sans artisan_id (100 000 €, 77 777 €…) ne changent AUCUN indicateur', egal(mel, R), JSON.stringify(mel.argent))
    ok('TB-11 isolation : pour l\'artisan B on ne voit que B (100 000 + 50 000 d\'octobre), jamais A ; sans identifiant, rien (échec fermé)',
      autre.argent.caMois === 150000 && autre.argent.caAnnee === 150000 && autre.chantiers.length === 1 && autre.chantiers[0].libelle === 'Piscine' && sansId.vide === true && sansId.argent.caAnnee === 0,
      JSON.stringify([autre.argent.caMois, autre.chantiers, sansId.vide]))
  }

  // TB-12 : pureté
  {
    const gelees = geler(copieProfonde(ENTREES({ maintenant: undefined })))
    let r1, r2, erreur = ''
    try { r1 = calculer({ ...gelees, maintenant: MAINTENANT }); r2 = calculer({ ...gelees, maintenant: MAINTENANT }) } catch (e) { erreur = String(e.message || e) }
    const code = sansCommentaires(lire(path.join(racine, 'lib/tableau-de-bord/calculer.ts')))
    const horloge = /Date\.now\s*\(|new Date\s*\(\s*\)|Math\.random|\bfetch\s*\(|\bprocess\.|\brequire\s*\(|localStorage|document\.|window\./.test(code)
    const importsValeur = [...code.matchAll(/^\s*import\s+(?!type\b)[^;\n]*$/gm)]
    ok('TB-12 module pur : rejoué sur des lignes GELÉES (aucune écriture possible), deux fois le même résultat, égal à celui des lignes non gelées',
      !erreur && egal(r1, r2) && egal(r1, R), erreur || 'résultats différents')
    ok('TB-12 aucune horloge cachée, aucun réseau, aucun import de valeur (le module ne dépend de rien)', !horloge && importsValeur.length === 0, JSON.stringify([horloge, importsValeur.map((m) => m[0])]))
  }

  // TB-13 : aucune TVA affichée — dans le HTML réellement rendu, et dans ce que le code lit
  {
    const html = await rendre(racine, R)
    const texte = aplatir(html)
    const interdit = /\bTVA\b|\bHT\b|\bTTC\b|\btaxe|hors taxe|toutes taxes/i
    const lecture = sansCommentaires(lire(path.join(racine, 'lib/tableau-de-bord/calculer.ts')) + '\n' + lire(path.join(racine, 'app/chiffres/Tableau.tsx')) + '\n' + lire(path.join(racine, 'app/chiffres/page.tsx')))
    ok('TB-13 le HTML rendu (texte et attributs d\'accessibilité) ne contient ni TVA, ni HT, ni TTC, ni « taxe » — alors que chaque ligne d\'entrée porte total_tva = 200', !interdit.test(html), html.match(interdit)?.[0])
    ok('TB-13 le code ne lit jamais total_tva ni total_ht (un seul montant : total_ttc, qui en franchise est le prix payé)', !/total_tva|total_ht|\btva\b/i.test(lecture), lecture.match(/total_tva|total_ht|\btva\b/i)?.[0])
    ok('TB-13 valeurs vues sur l\'écran : « 1 600,50 € », « −43 % », « 5 100,50 € », « dont 1 300,50 € encaissés », « 2 300 € », « 2 factures · jusqu’à 36 j de retard », « 27 % », « 9,8 h »',
      ['1 600,50 €', '−43 %', '5 100,50 €', 'dont 1 300,50 € encaissés', '2 300 €', '2 factures · jusqu’à 36 j de retard', '27 %', '9,8 h'].every((s) => texte.includes(s)),
      ['1 600,50 €', '−43 %', '5 100,50 €', 'dont 1 300,50 € encaissés', '2 300 €', '2 factures · jusqu’à 36 j de retard', '27 %', '9,8 h'].filter((s) => !texte.includes(s)).join(' | '))
    ok('TB-13 les devis à relancer s\'affichent avec leur lien vers /devis/<id>, leur client et leur ancienneté ; les canaux et les villes sont nommés',
      html.includes('href="/devis/d1"') && html.includes('href="/devis/d7"') && texte.includes('Mme Roux') && texte.includes('envoyé il y a 16 j') && texte.includes('Formulaire') && texte.includes('Saint-Étienne') && texte.includes('Électricité'),
      texte.slice(0, 200))
    const rendusPropres = [html, await rendre(racine, calculer({ artisanId: A, factures: [], devis: [], demandes: [], maintenant: MAINTENANT })), await rendre(racine, calculer(ENTREES({ factures: [fac('z', 'emise', '2026-10-01', null, 5)], devis: [], demandes: [] })))]
    ok('TB-13 l\'écran vide dit qu\'il est vide ; aucun rendu ne contient NaN, undefined, Infinity ni null', aplatir(rendusPropres[1]).includes('apparaîtront') && rendusPropres.every((h) => !/NaN|undefined|Infinity|\bnull\b/.test(h)), rendusPropres.map((h) => h.match(/NaN|undefined|Infinity|\bnull\b/)?.[0]).join(','))
  }

  // TB-14 : la page lit, filtre, n'écrit pas
  {
    const page = lire(path.join(racine, 'app/chiffres/page.tsx'))
    const code = sansCommentaires(page)
    const tables = ['factures', 'devis', 'leads']
    const filtrees = tables.filter((t) => new RegExp(`supabase\\.from\\('${t}'\\)\\.select\\('[^']*'\\)\\.eq\\('artisan_id', uid\\)`).test(code))
    const ecriture = code.match(/\.(insert|update|delete|upsert|rpc)\s*\(|supabaseAdmin|SERVICE_ROLE|service_role|createClient\s*\(/)
    const selects = [...code.matchAll(/\.select\('([^']*)'\)/g)].map((m) => m[1]).join(',')
    ok('TB-14 la page filtre CHACUNE de ses 3 requêtes (factures, devis, leads) sur .eq(\'artisan_id\', uid), l\'uid venant de la session', egal(filtrees, tables) && /const uid = data\.session\.user\.id/.test(code), `filtrées : ${filtrees.join(',')}`)
    const selectLeads = code.match(/supabase\.from\('leads'\)\.select\('([^']*)'\)/)?.[1] ?? ''
    ok('TB-14 les villes viennent des demandes : la requête des demandes lit `ville` (0133), et la page ne lit plus `clients`', selectLeads.split(/,\s*/).includes('ville') && !/from\('clients'\)/.test(code), selectLeads)
    ok('TB-14 la page ne fait que lire : ni insert/update/delete/upsert/rpc, ni clé de service, ni client privilégié ; elle ne sélectionne ni total_tva ni total_ht', !ecriture && !/total_tva|total_ht/.test(selects), ecriture?.[0] || selects)
    ok('TB-14 la page passe ses lignes à calculer() avec l\'identifiant de la session (le filtre est doublé dans le module)', /calculer\(\{ artisanId, factures/.test(code) && /setArtisanId\(uid\)/.test(code), 'appel à calculer introuvable')
  }

  // TB-15 : branché dans la navigation
  {
    const shell = lire(path.join(racine, 'app/AppShell.tsx'))
    const page = lire(path.join(racine, 'app/chiffres/page.tsx'))
    const robots = lire(path.join(racine, 'app/robots.ts'))
    const aide = lire(path.join(racine, 'lib/aide.ts'))
    const groupes = lire(path.join(racine, 'app/aide/page.tsx'))
    const entree = shell.match(/\{ key: '([^']+)', label: '([^']+)', href: '\/chiffres'/)
    ok('TB-15 la navigation de l\'espace connecté (AppShell, groupe Pilotage) a une entrée « Mes chiffres » vers /chiffres', !!entree && entree[2] === 'Mes chiffres' && shell.indexOf(entree[0]) > shell.indexOf("group: 'Pilotage'") && shell.indexOf(entree[0]) < shell.indexOf("group: 'Outils IA'"), entree?.[0])
    ok('TB-15 la page se déclare avec la clé de cette entrée (la bonne ligne du menu s\'allume) et passe par AppShell', !!entree && new RegExp(`<AppShell active="${entree[1]}"`).test(page) && /import AppShell from '@\/app\/AppShell'/.test(page), entree?.[1])
    ok('TB-15 la page existe et s\'exporte par défaut ; /chiffres est fermé aux robots', fs.existsSync(path.join(racine, 'app/chiffres/page.tsx')) && /export default function/.test(page) && /'\/chiffres'/.test(robots), 'robots.ts')
    ok('TB-15 le centre d\'aide a son article pour /chiffres, rangé dans un groupe', /id: 'chiffres',\s*page: '\/chiffres'/.test(aide) && /pages: \['\/chiffres'\]/.test(groupes), 'aide')
  }

  // TB-16 : mobile, mouvement, accessibilité, légèreté
  {
    const css = lire(path.join(racine, 'app/chiffres/chiffres.css'))
    const html = await rendre(racine, R)
    const svgs = [...html.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0])
    const pkg = JSON.parse(lire(path.join(racine, 'package.json')))
    const dependances = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    const lourdes = dependances.filter((d) => /^(chart\.js|react-chartjs-2|recharts|d3|d3-.*|victory.*|@nivo\/.*|apexcharts|react-apexcharts|echarts.*|highcharts.*|plotly.*|@visx\/.*)$/.test(d))
    const importsPage = [...lire(path.join(racine, 'app/chiffres/page.tsx')).matchAll(/^import .* from '([^']+)'/gm), ...lire(path.join(racine, 'app/chiffres/Tableau.tsx')).matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])
    const permis = (s) => s === 'react' || s === 'next/navigation' || s.startsWith('@/') || s.startsWith('./')
    ok('TB-16 les graphiques sont des SVG (au moins 3), chacun avec role="img" et un aria-label qui énonce les valeurs ; aucune bibliothèque de graphiques', svgs.length >= 3 && svgs.every((s) => /role="img"/.test(s) && /aria-label="[^"]{12,}/.test(s)) && lourdes.length === 0 && importsPage.every(permis), JSON.stringify([svgs.length, lourdes, importsPage.filter((s) => !permis(s))]))
    ok('TB-16 prefers-reduced-motion coupe l\'animation des barres, et elles sont visibles sans animation (animation « backwards », jamais d\'état initial caché)', /@media \(prefers-reduced-motion: reduce\)[^}]*\{[^}]*\.tdb-chart \.tdb-bar\s*\{\s*animation:\s*none/.test(css) && /animation:[^;]*backwards/.test(css) && !/\.tdb-bar\s*\{[^}]*opacity:\s*0[;\s}]/.test(css), 'css')
    ok('TB-16 rendu téléphone : une colonne sous 900 px, jetons du thème (aucune couleur en dur), pas de largeur fixe qui déborde, cibles ≥ 44 px sur les lignes à toucher',
      /@media \(max-width: 900px\)[\s\S]*\.tdb-grid \{ grid-template-columns: minmax\(0, 1fr\) \}/.test(css) && /@media \(max-width: 480px\)/.test(css) && !/#[0-9a-fA-F]{3,8}\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')) && /\.tdb-relances a \{[^}]*min-height: 52px/.test(css) && !/(?<![\w-])width:\s*\d{3,}px/.test(css),
      'css mobile')
  }

  // TB-17 : la vitrine (règle de la maison) — le document dit ce qu'il faudra y ajouter
  {
    const f = path.join(racine, 'docs/produit/tableau-de-bord-artisan.md')
    const doc = fs.existsSync(f) ? lire(f) : ''
    ok('TB-17 docs/produit/tableau-de-bord-artisan.md existe et dit ce qu\'il faudra ajouter à la vitrine : scène DemoSequence, capture réelle via scripts/demo-captures.mjs, franchise en base, la landing non touchée', /DemoSequence/.test(doc) && /demo-captures\.mjs/.test(doc) && /franchise/i.test(doc) && /\/chiffres/.test(doc) && doc.length > 1200, `${doc.length} caractères`)
  }

  // TB-18 : une panne n'est pas un zéro
  {
    const code = sansCommentaires(lire(path.join(racine, 'app/chiffres/page.tsx')))
    ok('TB-18 si une des 3 requêtes échoue, la page affiche une erreur et AUCUN total (jamais « 0 € » pour une panne) : toutes les erreurs testées avant setCharge, le message d\'erreur passe avant le tableau',
      /if \(f\.error \|\| d\.error \|\| l\.error\) \{ setErreur\(true\); return \}/.test(code) && code.indexOf('setErreur(true)') < code.indexOf('setCharge(') && code.indexOf('erreur ? (') < code.indexOf('<Tableau'),
      'gestion d\'erreur')
  }
}

// ───────────────────────── Les sabotages ─────────────────────────
const C = 'lib/tableau-de-bord/calculer.ts'
const T = 'app/chiffres/Tableau.tsx'
const P = 'app/chiffres/page.tsx'
const SABOTAGES = [
  ['TB-2', C, '!f.avoir_de && !(f.id && annulees.has(f.id))', '!(f.id && annulees.has(f.id))'],          // les avoirs comptent
  ['TB-2', C, "if (f.avoir_de && typeof f.avoir_de === 'string') annulees.add(f.avoir_de)", 'void 0'],          // la facture visée par un avoir reste comptée
  ['TB-3', C, "const STATUTS_FACTURES_COMPTEES = ['emise', 'payee']", "const STATUTS_FACTURES_COMPTEES = ['emise', 'payee', 'brouillon']"],
  ['TB-3', C, '!f.avoir_de && !(f.id && annulees.has(f.id))', '!f.avoir_de && !!f.devis_id && !(f.id && annulees.has(f.id))'], // seules les factures issues d'un devis
  ['TB-4', C, 'echeance && echeance < aujourdhui', 'echeance && echeance <= aujourdhui'],
  ['TB-4', C, "if (f.statut === 'payee') encaisseAnnee += c", "encaisseAnnee += c"],
  ['TB-5', C, 'caMoisPrecedent > 0 ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100) : null', 'caMoisPrecedent > 0 ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100) : 0'],
  ['TB-5', C, 'tauxAcceptation: nbEnvoyes > 0 ? Math.round((nbAcceptes / nbEnvoyes) * 100) : null', 'tauxAcceptation: Math.round((nbAcceptes / nbEnvoyes) * 100)'],
  ['TB-5', C, "STATUTS_DEVIS_ENVOYES = ['envoye', 'accepte', 'refuse', 'expire']", "STATUTS_DEVIS_ENVOYES = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire']"],
  ['TB-6', C, 'if (heures < 0) continue', ''],
  ['TB-6', C, 'if (avant === undefined || heures < avant) plusCourtParDemande.set(d.lead_id, heures)', 'plusCourtParDemande.set(d.lead_id, heures)'],
  ['TB-6', C, 'Date.parse(d.envoye_le ?? d.created_at ?? \'\')', 'Date.parse(d.created_at ?? \'\')'],
  ['TB-7', C, 'jours > SEUIL_RELANCE_JOURS && jours <= limite', 'jours >= SEUIL_RELANCE_JOURS && jours <= limite'],
  ['TB-7', C, 'jours > SEUIL_RELANCE_JOURS && jours <= limite', 'jours > SEUIL_RELANCE_JOURS'],
  ['TB-7', C, "if (d.statut !== 'envoye' || !d.id) continue", "if (d.statut === 'brouillon' || !d.id) continue"],
  ['TB-8', C, "const FUSEAU = 'Europe/Paris'", "const FUSEAU = 'UTC'"],
  ['TB-8', C, 'export const FENETRE_GRAPHIQUE = 6', 'export const FENETRE_GRAPHIQUE = 5'],
  ['TB-8', C, "if (!t) return LIBELLES_CANAL.autre", "if (!t) return 'Formulaire'"],
  ['TB-9', C, ".replace(/[\\u0300-\\u036f]/g, '')", ''],
  ['TB-9', C, 'export const TOP = 5', 'export const TOP = 6'],
  ['TB-9', C, '.toLowerCase().replace(/[\\s\'’-]+/g, \' \')', '.replace(/[\\s\'’-]+/g, \' \')'],
  ['TB-10', C, 'return Number.isFinite(n) ? Math.round(n * 100) : 0', 'return Math.round(n * 100)'],
  ['TB-11', C, 'l.artisan_id === artisanId', 'true'],
  ['TB-11', C, 'artisanId ? (Array.isArray', 'true ? (Array.isArray'],
  ['TB-12', C, 'const factures = duMien(e.factures, e.artisanId)', 'e.factures.reverse(); const factures = duMien(e.factures, e.artisanId)'],
  ['TB-12', C, 'const aujourdhui = jourParis(e.maintenant)', 'const aujourdhui = jourParis(new Date())'],
  ['TB-13', T, "<Panneau titre=\"Votre argent\">", "<Panneau titre=\"Votre argent TTC\">"],
  ['TB-13', C, 'const c = centimes(f.total_ttc)', 'const c = centimes(f.total_ttc) + centimes((f as { total_tva?: Nombre }).total_tva)'],
  ['TB-13', T, "<Kpi lab=\"Mois dernier\"", "<Kpi lab=\"Mois dernier HT\""],
  ['TB-14', P, ".select('id, artisan_id, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de').eq('artisan_id', uid)", ".select('id, artisan_id, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de')"],
  ['TB-14', P, ".select('id, artisan_id, canal, statut, created_at, type_chantier, ville').eq('artisan_id', uid)", ".select('id, artisan_id, canal, statut, created_at, type_chantier, ville')"],
  ['TB-14', P, "type_chantier, ville')", "type_chantier')"],
  ['TB-9', C, 'if (dansFenetre(m, debutActivite) && d.ville) villes.push(d.ville)', 'if (d.ville) villes.push(d.ville)'],
  ['TB-14', P, "import Tableau from './Tableau'", "import Tableau from './Tableau'\nimport { supabaseAdmin } from '@/lib/supabaseAdmin'"],
  ['TB-14', P, "const { data: prof } = await supabase.from('artisans').select('id').eq('id', uid).maybeSingle()", "await supabase.from('artisans').update({ aide_vues: [] }).eq('id', uid)\n      const { data: prof } = await supabase.from('artisans').select('id').eq('id', uid).maybeSingle()"],
  ['TB-15', 'app/AppShell.tsx', "href: '/chiffres'", "href: '/chiffre'"],
  ['TB-15', 'app/AppShell.tsx', "label: 'Mes chiffres'", "label: 'Gestion'"],
  ['TB-15', P, 'active="chiffres"', 'active="dashboard"'],
  ['TB-15', 'app/robots.ts', "'/chiffres', ", ''],
  ['TB-15', 'lib/aide.ts', "page: '/chiffres',", "page: '/chiffres-aide',"],
  ['TB-16', T, 'role="img" aria-label={`${nom} :', 'aria-label={`${nom} :'],
  ['TB-16', 'app/chiffres/chiffres.css', '@media (prefers-reduced-motion: reduce) {\n  .tdb-chart .tdb-bar { animation: none }', '@media (prefers-reduced-motion: reduce) {\n  .tdb-chart .tdb-barre { animation: none }'],
  ['TB-16', 'app/chiffres/chiffres.css', 'var(--ease-out, ease-out) backwards', 'var(--ease-out, ease-out)'],
  ['TB-16', 'app/chiffres/chiffres.css', '.tdb-grid { grid-template-columns: minmax(0, 1fr) }', '.tdb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) }'],
  ['TB-16', 'app/chiffres/chiffres.css', 'min-height: 52px', 'min-height: 30px'],
  ['TB-17', 'docs/produit/tableau-de-bord-artisan.md', 'DemoSequence', 'la démo'],
  ['TB-18', P, 'if (f.error || d.error || l.error) { setErreur(true); return }', ''],
  ['TB-18', P, 'if (f.error || d.error || l.error)', 'if (f.error || d.error)'],
]
const FICHIERS = [...new Set([C, T, P, 'app/chiffres/chiffres.css', 'app/AppShell.tsx', 'app/robots.ts', 'lib/aide.ts', 'app/aide/page.tsx', 'package.json', 'docs/produit/tableau-de-bord-artisan.md'])]
function copie(nom) {
  const d = path.join(TMP, nom)
  for (const f of FICHIERS) { if (!fs.existsSync(path.join(DEPOT, f))) continue; fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.copyFileSync(path.join(DEPOT, f), path.join(d, f)) }
  return d
}

async function principal() {
  if (!PREUVE) {
    await juger(RACINE, 'r')
    console.log(`\n${rouges.length ? '✗' : '✓'} tableau-de-bord-qa : ${rouges.length ? rouges.length + ' critère(s) rouge(s)' : 'tous les critères verts'}`)
    return rouges.length ? 1 : 0
  }
  console.log('## témoin'); await juger(copie('temoin'), 'temoin')
  let ko = rouges.length; const nTemoin = ko; rouges.length = 0
  console.log('\n## sabotages (chacun doit rendre rouge le critère visé)')
  let n = 0
  for (const [id, rel, avant, apres] of SABOTAGES) {
    n++
    const d = copie(`sab-${n}`), f = path.join(d, rel)
    const t = fs.existsSync(f) ? lire(f) : ''
    if (!t.includes(avant)) { console.log(`FAIL sabotage ${n} → ${id} : texte à saboter introuvable dans ${rel}`); ko++; continue }
    fs.writeFileSync(f, t.replace(avant, () => apres))
    const log = console.log; console.log = () => {}
    rouges.length = 0
    let plante = ''
    try { await juger(d, `s${n}`) } catch (e) { plante = String(e.message || e).split('\n')[0] } finally { console.log = log }
    // Un sabotage qui fait planter le juge compte comme attrapé SEULEMENT si le critère visé est celui d'une exécution du module (pureté) ou du rendu.
    const attrape = rouges.some((r) => r.startsWith(id)) || (!!plante && ['TB-12', 'TB-13'].includes(id))
    console.log(`${attrape ? 'PASS' : 'FAIL'} sabotage ${n} → ${id} ${attrape ? `rouge${plante ? ' (le juge a planté : ' + plante.slice(0, 60) + ')' : ''}` : 'RESTE VERT'} : ${rel}`)
    if (!attrape) ko++
  }
  console.log(`\n${ko ? '✗' : '✓'} tableau-de-bord-qa --preuve-echecs : témoin ${nTemoin ? nTemoin + ' rouge(s)' : 'vert'}, ${SABOTAGES.length} sabotage(s)${ko - nTemoin ? `, ${ko - nTemoin} non attrapé(s)` : ' tous attrapés'}`)
  return ko ? 1 : 0
}
try { process.exitCode = await principal() } finally { fs.rmSync(TMP, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }) }
