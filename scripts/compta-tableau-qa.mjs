#!/usr/bin/env node
// scripts/compta-tableau-qa.mjs — juge du tableau de bord comptable de l'artisan (/chiffres, refonte du 12/10/2026).
//
// Sans réseau de production, sans compte, sans base. Quatre parties :
//  A. le CALCUL (lib/comptaTableau.ts) rejoué sur un jeu de données dont chaque résultat attendu est écrit ici à la main,
//     au centime ; recoupé avec lib/tableau-de-bord/calculer.ts (« deux chiffres, un écran ») ; isolation entre comptes ;
//     les automatisations (lib/comptaAutomatisations.ts) et la question de colonne ambiguë (lib/comptaAssistant.ts).
//  B. le RENDU réel (app/chiffres/TableauCompta.tsx passé à react-dom/server) : l'état vide ne contient ni « exemple »,
//     ni donnée fictive, ni montant ; l'écran rempli affiche les bons chiffres et leur origine ; jamais de TVA.
//  C. le PARCOURS dans un Chromium isolé (Playwright, modules servis depuis le disque, aucun backend) : le « ? » ouvre
//     l'image marquée « Exemple » ; un dépôt est rangé seul, compté en aperçu, validé d'un clic ; la question de colonne
//     ambiguë ; Arrêter ; isolation des comptes dans le navigateur ; le chemin IA (route simulée) n'envoie aucun chiffre.
//  D. le CODE : la route lit seulement, filtre ses trois requêtes sur la session ; les drapeaux des automatisations sont
//     baissés ; plus aucune donnée d'exemple n'est importée par /chiffres.
//
// Ce qu'il NE prouve PAS : la lecture de la vraie base sous une vraie session (aucun compte n'est créé), ni l'envoi réel
// des e-mails (drapeaux baissés, migration 0139 non appliquée).
//
// Usage : node scripts/compta-tableau-qa.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.error(w) })

const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 300)}`); if (!cond) rouges.push(nom) }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const aplatir = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const frais = (v) => JSON.parse(JSON.stringify(v))
function toutNaN(v, chemin = '') {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [`${chemin}=${v}`]
  if (v === undefined) return [`${chemin}=undefined`]
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => toutNaN(x, `${chemin}.${k}`))
  return []
}

const { calculerCompta } = await import(pathToFileURL(path.join(RACINE, 'lib/comptaTableau.ts')).href)
const { calculer } = await import(pathToFileURL(path.join(RACINE, 'lib/tableau-de-bord/calculer.ts')).href)
const auto = await import(pathToFileURL(path.join(RACINE, 'lib/comptaAutomatisations.ts')).href)

// ───────────────────────── Le jeu de données connu ─────────────────────────
// « Maintenant » : lundi 12 octobre 2026, 10 h UTC = 12 h à Paris. Fenêtre « 12 derniers mois » : 2025-11 → 2026-10.
const MAINTENANT = new Date('2026-10-12T10:00:00Z')
const A = 'art-A', B = 'art-B'
// Chaque facture porte aussi total_tva et total_ht : le calcul ne doit lire ni l'un ni l'autre.
const fac = (id, statut, emission, echeance, ttc, extra = {}) => ({ id, artisan_id: A, numero: `F-${id}`, statut, date_emission: emission, date_echeance: echeance, total_ttc: ttc, total_tva: 200, total_ht: 800, devis_id: null, avoir_de: null, client_nom: null, client_id: null, ...extra })
const FACTURES_A = [
  fac('f1', 'emise', '2026-10-02', '2026-10-30', '1000.50', { client_nom: 'Mme Roux', client_id: 'c1' }), // oct · impayée, pas encore échue
  fac('f2', 'payee', '2026-09-10', '2026-09-30', 2800, { client_nom: 'M. Petit' }),                      // sept · encaissée (sans date de règlement : au mois d'émission)
  fac('f3', 'emise', '2026-08-01', '2026-08-31', 300, { client_nom: 'Mme Roux', client_id: 'c1' }),     // août · 42 j de retard
  fac('f4', 'annulee', '2026-10-05', '2026-10-30', 700, { client_nom: 'Annulé' }),                        // annulée …
  fac('f5', 'emise', '2026-10-05', '2026-10-05', -700, { avoir_de: 'f4', client_nom: 'Annulé' }),         // … par cet avoir : ni l'un ni l'autre
  fac('f6', 'brouillon', '2026-10-06', null, 999, { client_nom: 'Brouillon' }),                           // brouillon : jamais
  fac('f7', 'payee', '2026-10-03', '2026-10-20', 600, { client_nom: 'SARL Bati', payee_le: '2026-10-04' }),// oct · encaissée le 4/10
  fac('f8', 'emise', '2025-12-15', '2026-01-14', 250, { client_nom: 'M. Petit' }),                        // déc. 2025 · 271 j de retard
  fac('f9', 'emise', '2026-10-10', null, 400),                                                            // oct · sans échéance, sans client
]
const LIGNES_A = [
  { ligne: 2, date: '2026-09-20', libelle: 'Dépannage', tiers: 'M. Petit', sens: 'recette', montant: 15025, categorie: 'Sans catégorie', statut: 'paye', source: 'cahier.csv' },
  { ligne: 3, date: '2026-10-01', libelle: 'Vente comptoir', tiers: 'Client Comptoir', sens: 'recette', montant: 8000, categorie: 'Sans catégorie', statut: 'impaye', source: 'cahier.csv' },
  { ligne: 4, date: '2026-10-03', libelle: 'Placo', tiers: 'Point P', sens: 'depense', montant: 42010, categorie: 'Matériaux et fournitures', statut: 'paye', source: 'releve.csv' },
  { ligne: 5, date: '2026-09-15', libelle: 'Gasoil', tiers: 'Station', sens: 'depense', montant: 6040, categorie: 'Carburant et déplacements', statut: 'paye', source: 'releve.csv' },
]
const dev = (id, statut, extra = {}) => ({ id, artisan_id: A, numero: `D-${id}`, client_nom: 'Client', statut, date_emission: '2026-01-01', total_ttc: 100, envoye_le: null, accepte_le: null, created_at: '2026-01-01T09:00:00Z', lead_id: null, validite_jours: 90, ...extra })
const DEVIS_A = [
  dev('d1', 'accepte', { accepte_le: '2026-10-05T09:00:00Z', total_ttc: 1200 }),
  dev('d2', 'accepte', { accepte_le: '2026-03-01T09:00:00Z', total_ttc: 500 }),
  dev('d3', 'envoye', { envoye_le: '2026-10-01T09:00:00Z', validite_jours: 30, total_ttc: 900 }),   // 11 j ≤ 30 : en attente
  dev('d4', 'envoye', { envoye_le: '2026-06-01T09:00:00Z', validite_jours: 30, total_ttc: 4000 }),  // 133 j > 30 : périmé
  dev('d5', 'brouillon', { total_ttc: 300 }),
]
const dem = (id, creation, canal) => ({ id, artisan_id: A, canal, statut: 'nouveau', created_at: creation, type_chantier: null, ville: null })
const DEMANDES_A = [
  dem('L1', '2026-10-01T08:00:00Z', 'formulaire'),
  dem('L2', '2026-09-30T22:30:00Z', 'email'),       // 00 h 30 à Paris le 1er octobre : OCTOBRE
  dem('L3', '2026-05-02T10:00:00Z', 'formulaire'),
  dem('L4', '2026-10-11T10:00:00Z', null),          // canal absent : « Non renseigné », jamais deviné
  dem('L5', '2025-09-01T10:00:00Z', 'Formulaire'),  // 13 mois : hors des 12 derniers mois
]
// Autrui : énorme, pour que la moindre fuite se voie.
const AUTRUI = {
  factures: [fac('x1', 'payee', '2026-10-01', null, 100000, { artisan_id: B, client_nom: 'Client de B' }), fac('x2', 'emise', '2026-10-01', '2026-09-01', 77777, { artisan_id: undefined }), fac('x3', 'emise', '2026-10-01', '2026-09-01', 12345, { artisan_id: '' })],
  devis: [dev('x1', 'accepte', { artisan_id: B, accepte_le: '2026-10-02T09:00:00Z', total_ttc: 50000 }), dev('x2', 'envoye', { artisan_id: null, envoye_le: '2026-10-02T09:00:00Z' })],
  demandes: [{ ...dem('xL1', '2026-10-01T10:00:00Z', 'tiktok'), artisan_id: B }, { ...dem('xL2', '2026-10-01T10:00:00Z', 'tiktok'), artisan_id: undefined }],
}
const ENTREES = (extra = {}) => ({ artisanId: A, factures: frais(FACTURES_A), devis: frais(DEVIS_A), demandes: frais(DEMANDES_A), lignes: frais(LIGNES_A), periode: '12mois', maintenant: MAINTENANT, ...extra })

// ───────────────────────── A. Le calcul ─────────────────────────
{
  const R = calculerCompta(ENTREES())
  const c = R.cartes
  // CA Presti 12 mois = f1 1 000,50 + f2 2 800 + f3 300 + f7 600 + f8 250 + f9 400 = 5 350,50 ; fichiers = 150,25 + 80 = 230,25.
  ok('CA-1 chiffre d’affaires 12 mois : Presti 535 050 c, fichiers 23 025 c, total 558 075 c (annulée, avoir, brouillon exclus)', egal(c.facture, { presti: 535050, fichiers: 23025, total: 558075 }), JSON.stringify(c.facture))
  // Encaissé : f2 2 800 (mois d'émission) + f7 600 (réglée le 4/10) ; fichiers : la ligne payée 150,25.
  ok('CA-2 encaissé : Presti 340 000 c, fichiers 15 025 c ; la date de règlement est lue quand elle existe', egal(c.encaisse, { presti: 340000, fichiers: 15025, total: 355025 }) && R.encaisseAuMoisDeReglement === true, JSON.stringify(c.encaisse))
  // Dépenses 420,10 + 60,40 = 480,50 ; bénéfice 5 580,75 − 480,50 = 5 100,25 ; marge 510 025 / 558 075 = 91,39 % → 91,4.
  ok('CA-3 dépenses 48 050 c, bénéfice 510 025 c, marge 91,4 %', c.depenses === 48050 && c.benefice === 510025 && c.marge === 91.4, JSON.stringify([c.depenses, c.benefice, c.marge]))
  // Impayés : f1 1 000,50 · f3 300 · f8 250 · f9 400 · ligne 80 = 2 030,50 ; ancienneté : 1 400,50 + 80 à échéance, 300 à 31-60 j, 250 à + 60 j.
  ok('CA-4 impayés à ce jour : 5 pièces, 203 050 c (Presti 195 050, fichiers 8 000)', egal({ ...c.impayes }, { presti: 195050, fichiers: 8000, total: 203050, nombre: 5 }), JSON.stringify(c.impayes))
  ok('CA-4 ancienneté : 148 050 c pas encore échus, 0 à 1-30 j, 30 000 à 31-60 j, 25 000 à plus de 60 j', egal(R.anciennete, { aEcheance: 148050, retard30: 0, retard60: 30000, retardPlus: 25000 }), JSON.stringify(R.anciennete))
  ok('CA-4 liste des impayés : du plus en retard (f8, 271 j ; f3, 42 j) au plus récent ; origine de chaque ligne',
    egal(R.impayes.map((i) => [i.ref, i.joursRetard, i.origine]), [['f8', 271, 'presti'], ['f3', 42, 'presti'], ['fichier', 0, 'fichier'], ['f1', 0, 'presti'], ['f9', 0, 'presti']]),
    JSON.stringify(R.impayes.map((i) => [i.ref, i.joursRetard, i.origine])))
  ok('CA-5 clients : 4 (Mme Roux, M. Petit, SARL Bati, Client Comptoir ; la facture sans client n’en invente pas) ; meilleurs clients au centime, origine dite',
    c.clients === 4 && egal(R.meilleursClients, [{ nom: 'M. Petit', montant: 320025, origine: 'les deux' }, { nom: 'Mme Roux', montant: 130050, origine: 'presti' }, { nom: 'SARL Bati', montant: 60000, origine: 'presti' }, { nom: 'Client Comptoir', montant: 8000, origine: 'fichiers' }]),
    JSON.stringify([c.clients, R.meilleursClients]))
  ok('CA-6 devis : 2 acceptés sur 12 mois (1 700 €), 1 en attente encore valable (900 €) ; brouillon et devis périmé exclus', egal(R.devis, { acceptes: { nombre: 2, montant: 170000 }, enAttente: { nombre: 1, montant: 90000 } }), JSON.stringify(R.devis))
  ok('CA-7 sources des demandes (12 mois) : Formulaire 2 (50 %), E-mail 1, Non renseigné 1 ; la demande de 13 mois exclue',
    R.demandes.total === 4 && egal(R.demandes.parCanal, [{ libelle: 'Formulaire de votre page', nb: 2, part: 50 }, { libelle: 'E-mail', nb: 1, part: 25 }, { libelle: 'Non renseigné', nb: 1, part: 25 }]),
    JSON.stringify(R.demandes))
  const oct = R.mois.find((m) => m.cle === '2026-10'), sept = R.mois.find((m) => m.cle === '2026-09')
  ok('CA-8 graphique : 12 mois (nov. 25 → oct. 26) ; octobre = Presti 200 050, fichiers 8 000, encaissé 60 000, dépenses 42 010 ; septembre = 280 000 · 15 025 · 295 025 · 6 040',
    R.mois.length === 12 && R.mois[0].cle === '2025-11' && egal([oct.facturePresti, oct.recettesFichiers, oct.encaisse, oct.depenses], [200050, 8000, 60000, 42010]) && egal([sept.facturePresti, sept.recettesFichiers, sept.encaisse, sept.depenses], [280000, 15025, 295025, 6040]) && R.mois.every((m) => m.dansPeriode),
    JSON.stringify(R.mois.map((m) => [m.cle, m.facturePresti, m.recettesFichiers, m.encaisse, m.depenses])))

  const M = calculerCompta(ENTREES({ periode: 'mois' }))
  ok('CA-9 « Ce mois » : CA Presti 200 050 c (f1 + f7 + f9), 1 devis accepté, 3 demandes (00 h 30 à Paris le 1er = octobre) ; les impayés ne dépendent pas de la période ; graphique de 6 mois, octobre seul en surbrillance',
    M.cartes.facture.presti === 200050 && M.devis.acceptes.nombre === 1 && M.demandes.total === 3 && M.cartes.impayes.total === 203050 && M.mois.length === 6 && M.mois.filter((m) => m.dansPeriode).map((m) => m.cle).join() === '2026-10',
    JSON.stringify([M.cartes.facture, M.devis.acceptes, M.demandes.total, M.mois.length]))
  const T = calculerCompta(ENTREES({ periode: 'tout' }))
  ok('CA-9 « Depuis le début » commence au premier mois connu (2025-09, la plus vieille demande) et compte ses 5 demandes', T.periode.debut === '2025-09' && T.demandes.total === 5 && T.cartes.facture.total === 558075, JSON.stringify([T.periode, T.demandes.total]))
  const Y = calculerCompta(ENTREES({ periode: 'annee', lignes: [] }))
  const I = calculer({ artisanId: A, factures: frais(FACTURES_A), devis: frais(DEVIS_A), demandes: frais(DEMANDES_A), maintenant: MAINTENANT })
  ok('CA-10 deux chiffres, un écran : sur l’année, le facturé, l’encaissé et le retard Presti sont ceux du calcul de gestion (calculer.ts), au centime',
    Y.cartes.facture.presti === Math.round(I.argent.caAnnee * 100) && Y.cartes.encaisse.presti === Math.round(I.argent.encaisseAnnee * 100) && Y.anciennete.retard30 + Y.anciennete.retard60 + Y.anciennete.retardPlus === Math.round(I.argent.enRetard * 100),
    JSON.stringify([Y.cartes.facture.presti, I.argent.caAnnee, Y.cartes.encaisse.presti, I.argent.encaisseAnnee]))

  const sansDep = calculerCompta(ENTREES({ lignes: LIGNES_A.filter((l) => l.sens === 'recette') }))
  ok('CA-11 sans dépense connue : dépenses, bénéfice et marge = null (jamais un bénéfice égal au chiffre d’affaires)', sansDep.cartes.depenses === null && sansDep.cartes.benefice === null && sansDep.cartes.marge === null, JSON.stringify(sansDep.cartes))
  const sales = calculerCompta({ artisanId: A, factures: [fac('s1', 'emise', '2026-10-01', null, 'abc'), fac('s2', 'payee', '2026-10-01', null, null), fac('s3', 'payee', '2026-10-01', null, '250,5'), fac('s4', 'emise', 'pas une date', null, 10)], devis: [], demandes: [], lignes: [{ ...LIGNES_A[0], montant: -5 }], periode: '12mois', maintenant: MAINTENANT })
  ok('CA-11 montants sales (« abc », null, « 250,5 », date illisible, montant négatif importé) : 0, 0, 25 050 c, hors période, 0 — ni NaN ni undefined', sales.cartes.facture.total === 25050 && toutNaN(sales).length === 0, JSON.stringify([sales.cartes.facture, toutNaN(sales)]))

  // Isolation
  const melange = calculerCompta({ ...ENTREES(), factures: frais([...FACTURES_A, ...AUTRUI.factures]), devis: frais([...DEVIS_A, ...AUTRUI.devis]), demandes: frais([...DEMANDES_A, ...AUTRUI.demandes]) })
  ok('ISO-1 les lignes d’un autre compte et les lignes sans compte (100 000 €, 77 777 €…) ne changent AUCUN indicateur', egal(melange, R), JSON.stringify(melange.cartes.facture))
  const pourB = calculerCompta({ artisanId: B, factures: frais([...FACTURES_A, ...AUTRUI.factures]), devis: frais([...DEVIS_A, ...AUTRUI.devis]), demandes: frais([...DEMANDES_A, ...AUTRUI.demandes]), lignes: [], periode: '12mois', maintenant: MAINTENANT })
  ok('ISO-2 pour le compte B : seulement B (10 000 000 c facturés, encaissés ; 1 devis ; 1 demande), jamais les clients de A', pourB.cartes.facture.total === 10000000 && pourB.cartes.encaisse.total === 10000000 && pourB.devis.acceptes.montant === 5000000 && pourB.demandes.total === 1 && egal(pourB.meilleursClients.map((m) => m.nom), ['Client de B']) && pourB.impayes.length === 0, JSON.stringify(pourB.cartes))
  const sansId = calculerCompta({ ...ENTREES(), artisanId: '', lignes: [] })
  ok('ISO-3 sans identifiant de compte : rien (échec fermé), l’écran est vide', sansId.vide === true && sansId.cartes.facture.total === 0, JSON.stringify(sansId.cartes.facture))
  const gele = (v) => { if (v && typeof v === 'object') { Object.freeze(v); Object.values(v).forEach(gele) } return v }
  let pur = true
  try { pur = egal(calculerCompta(gele(ENTREES())), R) } catch { pur = false }
  ok('PUR-1 module pur : rejoué sur des entrées GELÉES, même résultat (aucune écriture sur les lignes reçues)', pur)
  const src = sansCommentaires(lire('lib/comptaTableau.ts'))
  ok('PUR-2 aucune horloge cachée ni import de valeur ; aucune colonne de taxe lue', !/new Date\(\)|Date\.now\(/.test(src) && !/^import (?!type)/m.test(src) && !/total_tva|total_ht|\btva\b/i.test(src), src.match(/new Date\(\)|Date\.now\(|total_tva|total_ht/)?.[0])
  const vide = calculerCompta({ artisanId: A, factures: [], devis: [], demandes: [], lignes: [], periode: '12mois', maintenant: MAINTENANT })
  ok('VIDE-1 aucune donnée : vue « vide », tous les montants à 0 ou null, listes vides', vide.vide && vide.cartes.facture.total === 0 && vide.cartes.depenses === null && vide.impayes.length === 0 && toutNaN(vide).length === 0)
}

// Automatisations (pur)
{
  const deja = new Set()
  const s30 = auto.facturesASignaler({ artisanId: A, factures: frais([...FACTURES_A, ...AUTRUI.factures]), jours: 30, dejaSignalees: deja, maintenant: MAINTENANT })
  ok('AUTO-1 alerte à 30 j : f8 (271 j) et f3 (42 j) ; ni f1 (pas échue), ni f9 (2 j), ni la facture annulée, ni les pièces d’un autre compte', egal(s30.map((i) => i.ref), ['f8', 'f3']), JSON.stringify(s30.map((i) => i.ref)))
  const s30b = auto.facturesASignaler({ artisanId: A, factures: frais(FACTURES_A), jours: 30, dejaSignalees: new Set(['f8']), maintenant: MAINTENANT })
  const s1 = auto.facturesASignaler({ artisanId: A, factures: frais(FACTURES_A), jours: 1, dejaSignalees: deja, maintenant: MAINTENANT })
  ok('AUTO-1 une facture déjà signalée ne l’est plus ; à 1 j, la facture sans échéance compte depuis son émission (f9, 2 j)', egal(s30b.map((i) => i.ref), ['f3']) && egal(s1.map((i) => i.ref), ['f8', 'f3', 'f9']), JSON.stringify([s30b.map((i) => i.ref), s1.map((i) => i.ref)]))
  const m = auto.messageAlerte(s30)
  ok('AUTO-2 le message cite les vrais montants (550 € au total, 250 € et 300 €) et les retards, sans régime fiscal', m.sujet === '2 factures impayées à relancer' && /550 €/.test(m.texte.replace(/[  ]/g, ' ')) && /271 jours après l’échéance/.test(m.texte) && !/\bTVA\b|\bHT\b|\bTTC\b|293/.test(m.texte), m.texte.slice(0, 200))
  const j = auto.journalFacturesCsv(frais([...FACTURES_A, ...AUTRUI.factures, fac('inj', 'emise', '2026-10-11', null, 10, { client_nom: '=HYPERLINK("x")' })]), A, '2026-10')
  const lignes = j.csv.replace(/^﻿/, '').split('\r\n')
  ok('AUTO-3 export du mois pour le comptable : les 6 pièces d’octobre de A (avoir et facture annulée compris, brouillon exclu), triées par date, montant de l’avoir négatif',
    j.nombre === 6 && lignes.length === 7 && /"F-f5";"Avoir";"Annulé";"-700,00"/.test(j.csv) && /"F-f4";"Facture";"Annulé";"700,00";"Annulée"/.test(j.csv) && !/Brouillon|Client de B|77777|123,45/.test(j.csv) && /"1000,50"/.test(j.csv),
    lignes.join(' | ').slice(0, 300))
  ok('AUTO-3 une cellule qui commencerait par « = » est neutralisée (pas de formule exécutée dans Excel)', /"'=HYPERLINK/.test(j.csv))
  ok('AUTO-4 mois à exporter le 12/10 : septembre ; déjà parti : rien ; dernier envoi en août : septembre', auto.moisAExporter(MAINTENANT, null) === '2026-09' && auto.moisAExporter(MAINTENANT, '2026-09') === null && auto.moisAExporter(MAINTENANT, '2026-08') === '2026-09')
  const r = (x) => auto.lireReglages({ alerte_impayes: true, alerte_jours: 15, export_mensuel: false, export_email: '', ...x })
  ok('AUTO-5 réglages validés : délai hors 1-180 refusé, adresse invalide refusée, export sans adresse refusé, adresse normalisée',
    !r({ alerte_jours: 0 }).ok && !r({ alerte_jours: 181 }).ok && !r({ export_email: 'pas-une-adresse' }).ok && !r({ export_email: 'a@b.fr\nBcc: x@y.fr' }).ok && !r({ export_mensuel: true }).ok && r({ export_mensuel: true, export_email: ' Compta@Cabinet.FR ' }).reglages?.export_email === 'compta@cabinet.fr' && !auto.lireReglages(null).ok)
}

// Question de colonne ambiguë (moteur de l'assistant, transpilé comme le fait compta-classeur-qa)
{
  const sources = ['comptaImport', 'comptaArtisan', 'comptaAssistant'].map((nom) => ts.transpileModule(lire(`lib/${nom}.ts`).replace(/^import .*$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace(/^export /gm, '')).join('\n')
  const { colonnesAmbigues, planParRegles } = new Function(`${sources}\nreturn { colonnesAmbigues, planParRegles }`)()
  const f1 = { nom: 'ambigu.csv', sensParDefaut: 'recette', texte: 'Date;Date échéance;Client;Montant HT;Montant TTC\n01/10/2026;15/10/2026;Client B;100,00;100,00' }
  const f2 = { nom: 'simple.csv', sensParDefaut: 'recette', texte: 'Date;Client;Montant\n01/10/2026;Client B;100,00' }
  const f3 = { nom: 'releve.csv', sensParDefaut: 'depense', texte: 'Date;Libellé;Débit;Crédit\n01/10/2026;CB;10,00;' }
  const q = colonnesAmbigues([f1, f2, f3], planParRegles([f1, f2, f3]))
  ok('AMB-1 une question seulement pour les colonnes ambiguës : la date (Date / Date échéance) et le montant (Montant HT / TTC) de ambigu.csv ; aucune pour simple.csv ni pour un relevé Débit / Crédit',
    egal(q.map((x) => [x.nomFeuille, x.champ, x.candidates.map((c) => c.entete)]), [['ambigu.csv', 'date', ['Date', 'Date échéance']], ['ambigu.csv', 'montant', ['Montant HT', 'Montant TTC']]]) && q.every((x) => x.choisie !== null),
    JSON.stringify(q))
}

// ───────────────────────── B. Le rendu (react-dom/server) ─────────────────────────
const CACHE = path.join(RACINE, 'node_modules', '.cache', `compta-tableau-qa-${process.pid}`)
fs.mkdirSync(CACHE, { recursive: true })
function transpilerVers(rel, remplacer) {
  const sortie = ts.transpileModule(lire(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: path.basename(rel) }).outputText
  return sortie.replace(/(from\s+)(['"])([^'"]+)\2/g, (m, a, q, spec) => `${a}${q}${remplacer(spec)}${q}`)
}
let compteurRendu = 0
async function rendre(props) {
  const dossier = path.join(CACHE, `ssr-${++compteurRendu}`)
  fs.mkdirSync(dossier, { recursive: true })
  const versLib = (spec) => spec === '@/lib/comptaTableau' ? pathToFileURL(path.join(RACINE, 'lib/comptaTableau.ts')).href : spec === './Tableau' ? './Tableau.mjs' : spec
  fs.writeFileSync(path.join(dossier, 'Tableau.mjs'), transpilerVers('app/chiffres/Tableau.tsx', versLib))
  fs.writeFileSync(path.join(dossier, 'TableauCompta.mjs'), transpilerVers('app/chiffres/TableauCompta.tsx', versLib))
  const mod = await import(pathToFileURL(path.join(dossier, 'TableauCompta.mjs')).href)
  const { renderToStaticMarkup } = require('react-dom/server')
  const { createElement } = require('react')
  return renderToStaticMarkup(createElement(mod.default, props))
}
{
  const vueVide = calculerCompta({ artisanId: A, factures: [], devis: [], demandes: [], lignes: [], periode: '12mois', maintenant: MAINTENANT })
  const html = await rendre({ vue: vueVide, periode: '12mois' })
  const texte = aplatir(html)
  ok('VIDE-2 l’écran vide ne contient AUCUN texte « exemple », « fictif », « démo », aucun montant (€) ni aucun chiffre', !/exemple|fictif|fictive|démo|demo/i.test(html) && !/€/.test(texte) && !/\d/.test(texte), (html.match(/exemple|fictif|fictive|démo|demo/i)?.[0] ?? '') + ' ' + texte.slice(0, 160))
  ok('VIDE-2 il dit ce qui va apparaître et comment commencer, et propose le bouton « ? »', texte.includes('Il se remplira tout seul.') && texte.includes('Chiffre d’affaires et encaissé, mois par mois') && texte.includes('Sources de vos demandes') && texte.includes('déposez vos fichiers Excel ou CSV') && /data-compta-aide="/.test(html) && !/data-compta-aide-fenetre/.test(html), texte.slice(0, 300))

  const I = calculer({ artisanId: A, factures: frais(FACTURES_A), devis: frais(DEVIS_A), demandes: frais(DEMANDES_A), maintenant: MAINTENANT })
  const plein = await rendre({ vue: calculerCompta(ENTREES()), indicateurs: I, periode: '12mois', majLe: '12:00', apercu: 2 })
  const t = aplatir(plein)
  const attendus = ['5 580,75 €', 'Presti 5 350,50 € · fichiers 230,25 €', '3 550,25 €', '480,50 €', '5 100,25 €', 'marge 91,4 %', '2 030,50 €', '5 pièces · 550 € en retard', '271 j de retard (échéance 14/01/2026)', 'en attente depuis 11 j', 'Facture Presti', 'Vos fichiers', 'Formulaire de votre page', 'M. Petit', 'Presti et vos fichiers', 'Relié à Presti', 'lus à 12:00', 'Aperçu : 2 lignes de vos fichiers sont comptées']
  ok('REND-1 valeurs lues sur l’écran rempli, au centime, avec leur origine (Presti / fichiers) et l’ancienneté des impayés', attendus.every((s) => t.includes(s)), attendus.filter((s) => !t.includes(s)).join(' | '))
  ok('REND-2 ni TVA, ni HT, ni TTC, ni « taxe », ni « exemple » dans le HTML rendu (texte et attributs)', !/\bTVA\b|\bHT\b|\bTTC\b|\btaxe|exemple|fictif/i.test(plein), plein.match(/\bTVA\b|\bHT\b|\bTTC\b|\btaxe|exemple|fictif/i)?.[0])
  const svgs = [...plein.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0])
  ok('REND-3 graphiques en SVG (mois, ancienneté, anneau des sources), chacun role="img" avec ses valeurs dans aria-label ; aucun NaN / undefined', svgs.length >= 3 && svgs.every((s) => /role="img"/.test(s) && /aria-label="[^"]{20,}/.test(s)) && !/NaN|undefined|Infinity/.test(plein), String(svgs.length))
}

// ───────────────────────── C. Le parcours dans Chromium ─────────────────────────
{
  const { chromium } = require('playwright')
  const { zipSync, strToU8 } = require('fflate')
  const entete = (ref, valeur) => `<c r="${ref}" t="inlineStr"><is><t>${valeur}</t></is></c>`
  const classeur = () => zipSync({
    '[Content_Types].xml': strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8('<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="0"/><sheets><sheet name="Ventes" r:id="r1"/><sheet name="Achats" r:id="r2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Target="worksheets/sheet2.xml"/></Relationships>'),
    'xl/sharedStrings.xml': strToU8('<sst><si><t>Client A</t></si></sst>'),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData><row r="1">${entete('A1', 'Date')}${entete('B1', 'Client')}${entete('C1', 'Montant')}${entete('D1', 'Statut')}</row><row r="2"><c r="A2"><v>46096</v></c><c r="B2" t="s"><v>0</v></c><c r="C2"><f>100+20.5</f><v>120.5</v></c>${entete('D2', 'Impayé')}</row></sheetData></worksheet>`),
    'xl/worksheets/sheet2.xml': strToU8(`<worksheet><sheetData><row r="1">${entete('A1', 'Quand')}${entete('C1', 'Combien')}${entete('E1', 'Entreprise')}</row><row r="2">${entete('A2', '16/03/2026')}${entete('C2', '20,25 €')}${entete('E2', 'Fournisseur')}</row></sheetData></worksheet>`),
  })
  // Les modules sont servis depuis le disque, transpilés à la volée ; « react » est le vrai React, chargé une fois.
  const versUrl = (depuis, spec) => {
    if (spec === 'react') return '/m/react.js'
    if (spec === 'react/jsx-runtime') return '/m/jsx-runtime.js'
    if (spec.startsWith('@/')) return `/m/${spec.slice(2).replace(/\.tsx?$/, '')}.js`
    if (spec.startsWith('.')) return `/m/${path.posix.join(path.posix.dirname(depuis), spec).replace(/\.tsx?$/, '')}.js`
    throw new Error(`import non servi : ${spec} (depuis ${depuis})`)
  }
  const module = (rel) => {
    const fichier = ['.tsx', '.ts'].map((x) => rel + x).find((f) => fs.existsSync(path.join(RACINE, f)))
    if (!fichier) return null
    return ts.transpileModule(lire(fichier), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: path.basename(fichier) }).outputText
      .replace(/((?:from|import)\s+)(['"])([^'"]+)\2/g, (m, a, q, spec) => `${a}${q}${versUrl(rel, spec)}${q}`)
  }
  const REACT_SHIM = 'const R = globalThis.React; export default R; export const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment, createElement } = R;'
  const JSX_SHIM = 'const R = globalThis.React; const f = (t, p, k) => { const { children, ...reste } = p ?? {}; return children === undefined ? R.createElement(t, k === undefined ? reste : { ...reste, key: k }) : Array.isArray(children) ? R.createElement(t, k === undefined ? reste : { ...reste, key: k }, ...children) : R.createElement(t, k === undefined ? reste : { ...reste, key: k }, children) }; export const jsx = f, jsxs = f; export const Fragment = R.Fragment;'
  const presti = { factures: [fac('p1', 'emise', '2026-10-02', '2026-09-01', 500, { artisan_id: 'qa-p', client_nom: 'Mme Presti' })], devis: [], demandes: [dem('pL', '2026-10-01T08:00:00Z', 'formulaire')].map((d) => ({ ...d, artisan_id: 'qa-p' })) }
  const BANC = `import React from '/m/react.js'
import TableauCompta from '/m/app/chiffres/TableauCompta.js'
import ComptaArtisan from '/m/app/chiffres/ComptaArtisan.js'
import { calculerCompta } from '/m/lib/comptaTableau.js'
const PRESTI = ${JSON.stringify(presti)}
function Banc({ id, ia }) {
  const [imp, setImp] = React.useState({ artisanId: '', lignes: [], apercu: false, ajoutees: 0 })
  const lignes = imp.artisanId === id ? imp.lignes : []
  const [relance, setRelance] = React.useState(null)
  React.useEffect(() => setRelance(null), [id]) // le brouillon du banc lui-même (pas du produit) suit le compte
  const vue = React.useMemo(() => calculerCompta({ artisanId: id, factures: PRESTI.factures, devis: PRESTI.devis, demandes: PRESTI.demandes, lignes, periode: 'tout', maintenant: new Date('${MAINTENANT.toISOString()}') }), [id, lignes])
  // Ce que l'écran montre AVANT tout effet, au premier rendu d'un compte : jamais les chiffres du compte précédent.
  React.useLayoutEffect(() => { (globalThis.rendus ??= []).push({ id, texte: document.querySelector('[data-compta-tableau], [data-compta-vide]')?.textContent ?? '' }) }, [id])
  return React.createElement(React.Fragment, null,
    React.createElement(TableauCompta, { vue, periode: 'tout', onRelance: (i) => setRelance(i.client + ' · ' + i.montant), apercu: imp.artisanId === id && imp.apercu ? imp.ajoutees : 0 }),
    relance ? React.createElement('p', { 'data-relance': '' }, relance) : null,
    React.createElement(ComptaArtisan, { artisanId: id, onLignes: setImp, obtenirJeton: ia ? async () => 'jeton-factice' : undefined }))
}
globalThis.monter = (id, ia = false) => { globalThis.racine ??= globalThis.ReactClient.createRoot(document.getElementById('root')); globalThis.racine.render(React.createElement(Banc, { id, ia })) }
globalThis.pret = true
`
  const navigateur = await chromium.launch({ headless: true })
  try {
    const page = await navigateur.newPage()
    const erreurs = []
    page.on('pageerror', (e) => erreurs.push(String(e)))
    await page.route('http://compta.test/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><div id="root"></div>' })
      if (url.pathname === '/marque/aide/compta-etapes.svg') return route.fulfill({ contentType: 'image/svg+xml', body: lire('public/marque/aide/compta-etapes.svg') })
      if (url.pathname === '/m/react.js') return route.fulfill({ contentType: 'text/javascript', body: REACT_SHIM })
      if (url.pathname === '/m/jsx-runtime.js') return route.fulfill({ contentType: 'text/javascript', body: JSX_SHIM })
      if (url.pathname === '/m/banc.js') return route.fulfill({ contentType: 'text/javascript', body: BANC })
      if (url.pathname.startsWith('/m/')) {
        const corps = module(url.pathname.slice(3).replace(/\.js$/, ''))
        return corps === null ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'text/javascript', body: corps })
      }
      return route.continue()
    })
    await page.goto('http://compta.test/')
    const codes = {}
    for (const [nom, fichier] of Object.entries({ react: 'react/cjs/react.development.js', 'react-dom': 'react-dom/cjs/react-dom.development.js', scheduler: 'scheduler/cjs/scheduler.development.js', client: 'react-dom/cjs/react-dom-client.development.js' })) codes[nom] = fs.readFileSync(path.join(RACINE, 'node_modules', fichier), 'utf8')
    await page.evaluate((c) => {
      const cache = {}
      const req = (nom) => { if (!cache[nom]) { const m = { exports: {} }; cache[nom] = m; new Function('module', 'exports', 'require', 'process', c[nom])(m, m.exports, req, { env: { NODE_ENV: 'development' } }) } return cache[nom].exports }
      globalThis.React = req('react'); globalThis.ReactClient = req('client')
    }, codes)
    await page.addScriptTag({ type: 'module', url: '/m/banc.js' })
    await page.waitForFunction(() => globalThis.pret === true, null, { timeout: 15000 }).catch(() => {})
    assert.ok(await page.evaluate(() => globalThis.pret === true), `banc non chargé : ${erreurs.join(' | ')}`)

    // C1 — compte sans pièce Presti ni fichier : l'état vide, puis le « ? »
    await page.evaluate(() => globalThis.monter('qa-vide'))
    await page.locator('[data-compta-vide]').waitFor()
    const corpsVide = await page.locator('body').innerText()
    ok('UI-1 compte neuf : l’état vide s’affiche, sans « exemple » ni montant (€), et la zone de dépôt est là', !/exemple|fictif/i.test(corpsVide) && !/€/.test(corpsVide.replace(/5 Mo max/, '')) && await page.locator('[data-compta-fichier]').count() === 1, corpsVide.slice(0, 200))
    await page.locator('[data-compta-aide]').first().click()
    const fenetre = page.locator('[data-compta-aide-fenetre]')
    await fenetre.waitFor()
    const image = fenetre.locator('img')
    await page.waitForFunction(() => document.querySelector('[data-compta-aide-fenetre] img')?.complete)
    const naturel = await image.evaluate((i) => i.naturalWidth)
    ok('UI-2 le « ? » ouvre une fenêtre (role=dialog, aria-modal) avec l’image d’aide marquée « Exemple », qui se charge vraiment ; le focus va sur « Fermer »',
      /Exemple/.test(await fenetre.innerText()) && (await image.getAttribute('src')) === '/marque/aide/compta-etapes.svg' && naturel > 0 && /Exemple/.test(await image.getAttribute('alt')) && (await fenetre.getAttribute('role')) === 'dialog' && await page.evaluate(() => document.activeElement?.textContent) === 'Fermer',
      `naturalWidth=${naturel}`)
    await page.keyboard.press('Escape')
    await fenetre.waitFor({ state: 'detached' })
    ok('UI-2 Échap ferme la fenêtre et rend le focus au bouton « ? »', await page.evaluate(() => document.activeElement?.hasAttribute('data-compta-aide')))
    const svg = lire('public/marque/aide/compta-etapes.svg')
    ok('UI-2 l’image d’aide dit « EXEMPLE » en toutes lettres et ne contient aucun montant ni aucune date', /EXEMPLE/.test(svg) && !/€|\d+[,.]\d{2}\b|\d{2}\/\d{2}/.test(svg.replace(/<[^>]*>/g, ' ')), '')

    // C2 — un compte avec une facture Presti : le dépôt s'ajoute en aperçu, puis la validation
    await page.evaluate(() => globalThis.monter('qa-p'))
    await page.locator('[data-carte="facture"]').waitFor()
    ok('UI-3 compte relié : la facture Presti est comptée sans import (500 €), « Relié à Presti »', /500 €/.test((await page.locator('[data-carte="facture"]').innerText()).replace(/[  ]/g, ' ')) && /Relié à Presti/.test(await page.locator('[data-compta-relie]').innerText()))
    await page.locator('[data-compta-fichier]').setInputFiles([
      { name: 'test.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(classeur()) },
      { name: 'double.csv', mimeType: 'text/csv', buffer: Buffer.from('Client;Montant;Date;Statut\nClient A;120,50;15/03/2026;Impayé') },
    ])
    await page.getByRole('heading', { name: 'Rangement prêt : à valider', exact: true }).waitFor()
    const recit = await page.locator('[data-compta-agent]').innerText()
    const carte = async (k) => (await page.locator(`[data-carte="${k}"]`).innerText()).replace(/[  ]/g, ' ')
    ok('UI-4 l’assistant raconte les vraies étapes : fichiers et feuilles lus, colonnes reconnues, dates et montants normalisés, doublon retiré, feuille illisible mise de côté',
      /2 fichiers lus, 3 feuilles à comprendre/.test(recit) && /test\.xlsx · Ventes : date, client ou fournisseur, montant, statut/.test(recit) && /1 doublon retiré/.test(recit) && /test\.xlsx · Achats : mise de côté/.test(recit) && /1 ligne lue : dates et montants remis au même format/.test(recit) && /1 ligne ajoutée au tableau de bord en aperçu/.test(recit),
      recit.slice(0, 400))
    ok('UI-5 appliqué d’office : le tableau compte déjà la ligne (620,50 € = 500 € Presti + 120,50 € fichier), marquée « aperçu », RIEN n’est enregistré avant validation',
      /620,50 €/.test(await carte('facture')) && /Presti 500 € · fichiers 120,50 €/.test(await carte('facture')) && await page.getByText(/Aperçu : 1 ligne de vos fichiers est comptée/).count() === 1 && await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-p')) === null)
    await page.locator('[data-compta-detail] summary').click()
    await page.getByLabel('test.xlsx · Achats : Quand', { exact: true }).selectOption('date')
    await page.getByLabel('test.xlsx · Achats : Combien', { exact: true }).selectOption('montant')
    await page.getByLabel('test.xlsx · Achats : Entreprise', { exact: true }).selectOption('tiers')
    ok('UI-6 une feuille mal lue se corrige dans le détail : la dépense de 20,25 € apparaît, le bénéfice devient calculable', /20,25 €/.test(await carte('depenses')) && /600,25 €/.test(await carte('benefice')), await carte('benefice'))
    await page.locator('[data-compta-valider]').click()
    await page.getByText(/Validé : 2 lignes enregistrées/).waitFor()
    ok('UI-7 « Valider » d’un clic : 2 lignes enregistrées dans le navigateur, le bandeau « aperçu » disparaît, les chiffres restent', JSON.parse(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-p'))).length === 2 && await page.getByText(/Aperçu :/).count() === 0 && /620,50 €/.test(await carte('facture')))
    const impayeFichier = page.locator('[data-compta-impaye="fichier"]')
    await impayeFichier.getByRole('button', { name: 'Préparer la relance' }).click()
    ok('UI-8 l’impayé importé apparaît avec son origine et « Préparer la relance »', /Vos fichiers/.test(await impayeFichier.innerText()) && /Client A · 12050/.test(await page.locator('[data-relance]').innerText()))
    await page.locator('[data-compta-lignes] summary').click()
    const telechargement = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter les lignes pour le comptable', exact: true }).click()
    ok('UI-9 l’export des lignes pour le comptable se télécharge', (await telechargement).suggestedFilename() === 'comptabilite-journal-detaille.csv')

    // C3 — la question de colonne ambiguë, puis Annuler
    await page.locator('[data-compta-fichier]').setInputFiles({ name: 'ambigu.csv', mimeType: 'text/csv', buffer: Buffer.from('Date;Date échéance;Client;Montant HT;Montant TTC\n01/10/2026;15/10/2026;Client B;100,00;110,00') })
    await page.locator('[data-compta-questions]').waitFor()
    const questions = await page.locator('[data-compta-questions]').innerText()
    ok('UI-10 une question, et seulement pour les colonnes ambiguës : la date et le montant de ambigu.csv', /quelle colonne donne la date/.test(questions) && /quelle colonne donne le montant/.test(questions) && !/client ou le fournisseur/.test(questions), questions)
    const avant = await carte('facture')
    await page.getByLabel(/quelle colonne donne le montant/).selectOption({ label: 'Montant HT' })
    ok('UI-10 la réponse est appliquée aussitôt : l’assistant avait pris le TTC (730,50 €), l’artisan choisit le HT (720,50 €)', /730,50 €/.test(avant) && /720,50 €/.test(await carte('facture')), `${avant} → ${await carte('facture')}`)
    await page.locator('[data-compta-annuler]').click()
    ok('UI-11 « Annuler » : le tableau revient aux lignes validées, rien n’est enregistré', /620,50 €/.test(await carte('facture')) && JSON.parse(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-p'))).length === 2)

    // C4 — Arrêter pendant le travail
    await page.evaluate(() => { globalThis.textOriginal = File.prototype.text; File.prototype.text = function () { if (this.name === 'lent.csv') return new Promise((r) => { globalThis.finir = r }); return globalThis.textOriginal.call(this) } })
    await page.locator('[data-compta-fichier]').setInputFiles({ name: 'lent.csv', mimeType: 'text/csv', buffer: Buffer.from('Date;Montant\n15/03/2026;999,99') })
    await page.locator('[data-compta-arreter]').click()
    await page.evaluate(() => { globalThis.finir('Date;Montant\n15/03/2026;999,99'); File.prototype.text = globalThis.textOriginal })
    await page.waitForTimeout(200)
    ok('UI-12 « Arrêter » : « Arrêté : rien n’a été modifié », aucune ligne ajoutée même quand la lecture finit après', /Arrêté : rien n’a été modifié/.test(await page.locator('[data-compta-agent]').innerText()) && !/999,99/.test(await page.locator('body').innerText()) && JSON.parse(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-p'))).length === 2)

    // C5 — isolation des comptes dans le navigateur
    await page.evaluate(() => globalThis.monter('qa-b'))
    await page.locator('[data-compta-vide]').waitFor()
    const corpsB = (await page.locator('body').innerText()).replace(/[  ]/g, ' ')
    ok('ISO-4 compte B : écran vide, aucun chiffre de A (ni 120,50 ni 500), aucun journal d’assistant de A', !/120,50|500 €|Client A|Mme Presti/.test(corpsB) && await page.locator('[data-compta-agent]').count() === 0, `${corpsB.match(/.{0,60}(120,50|500 €|Client A|Mme Presti).{0,60}/)?.[0]} · agent=${await page.locator('[data-compta-agent]').count()}`)
    await page.evaluate(() => { localStorage.setItem('presti-compta-artisan:qa-c', JSON.stringify([{ date: 'illisible', montant: 120, sens: 'invalide' }])); globalThis.monter('qa-c') })
    await page.getByRole('status').filter({ hasText: 'illisibles' }).waitFor()
    ok('ISO-4 dès le premier rendu du compte B (avant tout effet), l’écran ne montre aucun chiffre de A', await page.evaluate(() => globalThis.rendus.filter((r) => r.id === 'qa-b').every((r) => !/120,50|620,50|500/.test(r.texte))) && await page.evaluate(() => globalThis.rendus.some((r) => r.id === 'qa-b')))
    ok('ISO-5 stockage corrompu du compte C : refusé avec un message, jamais compté', await page.locator('[data-compta-vide]').count() === 1)
    await page.evaluate(() => globalThis.monter('qa-p'))
    await page.locator('[data-carte="facture"]').waitFor()
    await page.evaluate(() => { File.prototype.text = function () { if (this.name === 'differe.csv') return new Promise((r) => { globalThis.terminer = r }); return globalThis.textOriginal.call(this) } })
    await page.locator('[data-compta-fichier]').setInputFiles({ name: 'differe.csv', mimeType: 'text/csv', buffer: Buffer.from('Date;Montant\n15/03/2026;888,88') })
    await page.waitForFunction(() => typeof globalThis.terminer === 'function')
    await page.evaluate(() => globalThis.monter('qa-d'))
    await page.locator('[data-compta-vide]').waitFor()
    await page.evaluate(() => { globalThis.terminer('Date;Montant\n15/03/2026;888,88'); File.prototype.text = globalThis.textOriginal })
    await page.waitForTimeout(250)
    ok('ISO-6 un dépôt lancé sur un compte puis abandonné (changement de compte) ne range rien dans le nouveau compte', await page.locator('[data-compta-agent]').count() === 0 && !/888,88/.test(await page.locator('body').innerText()) && await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-d')) === null)

    // C6 — le chemin IA (route simulée) : aucun chiffre en clair envoyé, catégorie appliquée ; quota plein refusé clairement
    let envoye = null
    await page.route('http://compta.test/api/compta/assistant', async (route) => {
      envoye = route.request().postDataJSON()
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, plan: { feuilles: [
        { role: 'donnees', ligneEntete: 0, colonnes: { date: 0, tiers: 1, montant: 2, statut: 3 }, montantSigne: false, sensParDefaut: 'recette', raison: 'Tes ventes.' },
        { role: 'donnees', ligneEntete: 0, colonnes: { date: 0, montant: 2, tiers: 4 }, montantSigne: false, sensParDefaut: 'depense', raison: 'Tes achats.' },
        { role: 'donnees', ligneEntete: 0, colonnes: { tiers: 0, montant: 1, date: 2, statut: 3 }, montantSigne: false, sensParDefaut: 'recette', raison: 'Doublon des ventes.' },
      ], categories: [{ valeur: 'Fournisseur', categorie: 'Matériaux et fournitures' }] } }) })
    })
    await page.evaluate(() => globalThis.monter('qa-ia', true))
    await page.locator('[data-compta-vide]').waitFor()
    await page.locator('[data-compta-fichier]').setInputFiles([
      { name: 'test.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(classeur()) },
      { name: 'double.csv', mimeType: 'text/csv', buffer: Buffer.from('Client;Montant;Date;Statut\nClient A;120,50;15/03/2026;Impayé') },
    ])
    await page.getByRole('heading', { name: 'Rangement prêt : à valider', exact: true }).waitFor()
    ok('UI-13 chemin IA : la feuille illisible pour les règles est comprise, la dépense de 20,25 € comptée ; ce qui part vers l’assistant ne porte AUCUN chiffre en clair',
      !!envoye && !/[0-8]/.test(JSON.stringify(envoye.echantillon.feuilles.map((f) => [f.apercu, f.valeurs]))) && /Structure de chaque feuille comprise/.test(await page.locator('[data-compta-agent]').innerText()) && /20,25 €/.test(await carte('depenses')))
    await page.evaluate(() => { globalThis.setItemInitial = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('Quota', 'QuotaExceededError') } })
    await page.locator('[data-compta-valider]').click()
    await page.getByRole('status').filter({ hasText: 'Enregistrement impossible' }).waitFor()
    ok('UI-14 navigateur plein : « Enregistrement impossible », rien d’enregistré, l’aperçu reste à valider', await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-ia')) === null && await page.locator('[data-compta-valider]').count() === 1)
    await page.evaluate(() => { Storage.prototype.setItem = globalThis.setItemInitial })
    await page.locator('[data-compta-valider]').click()
    await page.locator('[data-compta-lignes] summary').click()
    ok('UI-14 une fois la place revenue, la validation enregistre, et la catégorie donnée par l’assistant est dans le tableur', JSON.parse(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-ia'))).length === 2 && /Matériaux et fournitures/.test(await page.evaluate(() => localStorage.getItem('presti-compta-artisan:qa-ia'))))
    ok('UI-15 aucune erreur JavaScript pendant le parcours', erreurs.length === 0, erreurs.join(' | '))
  } finally { await navigateur.close() }
}

// ───────────────────────── D. Le code ─────────────────────────
{
  const route = sansCommentaires(lire('app/api/compta/tableau/route.ts'))
  const filtrees = ['factures', 'devis', 'leads'].filter((t) => new RegExp(`supabaseAdmin\\.from\\('${t}'\\)\\.select\\([^)]*\\)\\.eq\\('artisan_id', uid\\)`).test(route))
  ok('CODE-1 la route filtre CHACUNE de ses 3 lectures (factures, devis, leads) sur .eq(\'artisan_id\', uid), uid venant de authArtisan seulement', filtrees.length === 3 && /const session = await authArtisan\(req\)/.test(route) && /const uid = session\.uid/.test(route) && !/searchParams|req\.json|params/.test(route), filtrees.join(','))
  ok('CODE-1 la route ne fait que lire (ni insert/update/delete/upsert/rpc) et ne sélectionne ni taxe, ni e-mail, ni adresse du client', !/\.(insert|update|delete|upsert|rpc)\s*\(/.test(route) && !/total_tva|total_ht|client_email|client_adresse/.test(route))
  ok('CODE-2 une lecture en erreur rend 503 sans aucune donnée (jamais « 0 € » sur une panne), et la page affiche l’erreur avant tout tableau', /if \(f\.error \|\| d\.error \|\| l\.error\) \{[\s\S]*?status: 503/.test(route) && /erreur \? \(/.test(lire('app/chiffres/page.tsx')) && lire('app/chiffres/page.tsx').indexOf('erreur ? (') < lire('app/chiffres/page.tsx').indexOf('<TableauCompta'))
  const flags = lire('lib/flags.ts')
  ok('CODE-3 les automatisations non testées en vrai sont derrière des drapeaux BAISSÉS (comptaDateReglement, comptaAlerteImpayes, comptaExportMensuel)', /comptaDateReglement: false/.test(flags) && /comptaAlerteImpayes: false/.test(flags) && /comptaExportMensuel: false/.test(flags))
  const cron = sansCommentaires(lire('app/api/cron/relances/route.ts'))
  ok('CODE-3 la tâche quotidienne n’appelle les automatisations que drapeau levé et hors pause ; les réglages répondent 404 drapeaux baissés', /if \(!enPause && !interrompue && \(actif\('comptaAlerteImpayes'\) \|\| actif\('comptaExportMensuel'\)\)\)/.test(cron) && /if \(!ouverte\(\)\) return NextResponse\.json\(\{ error: 'Introuvable' \}, \{ status: 404 \}\)/.test(lire('app/api/compta/reglages/route.ts')))
  const chiffres = ['app/chiffres/page.tsx', 'app/chiffres/ComptaArtisan.tsx', 'app/chiffres/TableauCompta.tsx'].map(lire).join('\n')
  ok('CODE-4 /chiffres n’importe plus aucune donnée d’exemple (lib/compta-exemple, lib/tableau-de-bord/exemple, constante EXEMPLE)', !/compta-exemple|tableau-de-bord\/exemple|\bEXEMPLE\b|données fictives/.test(chiffres))
  const migration = lire('supabase/migrations/0139_compta_automatisations.sql')
  ok('CODE-5 la migration 0139 existe (écrite, non appliquée) : payee_le posée par déclencheur, compta_reglages sous RLS du propriétaire, compta_alertes_envoyees sans politique', /add column if not exists payee_le date/.test(migration) && /create trigger factures_payee_le/.test(migration) && /create policy compta_reglages_own/.test(migration) && /compta_alertes_envoyees enable row level security/.test(migration))
}

fs.rmSync(CACHE, { recursive: true, force: true })
console.log(`\n${rouges.length ? '✗' : '✓'} compta-tableau-qa : ${rouges.length ? rouges.length + ' critère(s) rouge(s) : ' + rouges.join(' · ') : 'tous les critères verts'}`)
process.exitCode = rouges.length ? 1 : 0
