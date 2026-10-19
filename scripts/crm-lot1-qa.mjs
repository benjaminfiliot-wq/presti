#!/usr/bin/env node
// scripts/crm-lot1-qa.mjs — juge du LOT 1 des améliorations du CRM (plan plans/crm-idees-twenty-1810.md, n°3 et n°2) :
// la FRISE d'étapes en pastilles et la colonne d'INDICATEURS du chantier, plus « Demander l'acompte ».
//
//  A. ARGENT (lib/crm/argent.ts) : facturé, encaissé, acompte (une facture complète qui recopie le % du devis n'est PAS un
//     acompte), avoirs écartés, reste à facturer, reste à encaisser ; la décision « Demander l'acompte ».
//  B. FRISE (lib/crm/pipeline.ts, frise) : chaque cas écrit à la main (demande seule, brouillon, envoyé, signé, acompte émis
//     puis réglé, facturé, payé, refusé, demande perdue, petit chantier sans devis, déplacement manuel) et le geste proposé.
//  C. « DEUX CHIFFRES, UN ÉCRAN » sur 300 comptes tirés au hasard : la frise de chaque carte dit la même chose que sa colonne ;
//     la tuile « À encaisser » = la somme des colonnes (+ classés) ; le « facturé non réglé » des dossiers = les impayés de
//     Mes chiffres (lib/comptaTableau.ts) rattachés à un devis ; le panneau de l'atelier et la fiche chantier, mêmes indicateurs.
//  D. INDICATEURS (lib/crm/chantier.ts, indicateurs) : matière sortie au dernier prix vu, sorties sans prix, marge sur
//     matériaux ESTIMÉE (null sans devis HT ou sans sortie chiffrée, « partielle » si des prix manquent).
//  E. ÉCRANS : rendu serveur de la frise (7 pastilles, une étape courante, phrase des lecteurs d'écran), libellés obligatoires
//     (« estimée », « main-d'œuvre non comptée »), exemple cohérent, route /api/crm/acompte gardée.
//  L. EN VRAI (seulement avec TEST_BASE=http://localhost:<port>, un serveur local de l'application) : deux comptes de test
//     Signature et un Studio (@presti-test.invalid, aucun e-mail ne part vers ce domaine), données semées par la clé de service,
//     sessions attestées comme le font les autres suites ; GET de la fiche et de la vue, POST /api/crm/acompte (offre, corps,
//     autre compte, double demande), facture d'acompte réglée ; NETTOYAGE dans un finally (purger_compte_test) puis contrôle.
//
// Usage : [TEST_BASE=http://localhost:3217] node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot1-qa.mjs
// Codes : 0 vert · 1 rouge
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// Les montants s'écrivent en français : « 1 000 € » avec une espace fine insécable ; les tests comparent sur des espaces simples.
const sp = (s) => String(s ?? '').replace(/[  ]/g, ' ')
const AC = { acompte_pct: 30, objet: 'Acompte 30 % — travaux' }
// La facture de SOLDE telle que lib/factureDepuisDevis.ts l'émet depuis le 18/10 (C3 corrigé) : pas de pourcentage, objet « Solde — … ».
const SOLDE = { acompte_pct: 0, objet: 'Solde — travaux' }

const Ar = await imp('lib/crm/argent.ts')
const P = await imp('lib/crm/pipeline.ts')
const C = await imp('lib/crm/chantier.ts')
const { calculerTableauCrm } = await imp('lib/crm/tableau.ts')
const { construireVue, construireFicheChantier } = await imp('lib/crm/vue.ts')
const { calculerCompta, facturesComptees } = await imp('lib/comptaTableau.ts')

const A = 'art-A'
const etats = (f) => f.pastilles.map((p) => p.etat).join(',')
const dv = (id, statut, ttc, extra = {}) => ({ id, artisan_id: A, statut, total_ttc: ttc, numero: `D-${id}`, objet: `Objet ${id}`, client_nom: `Client ${id}`, created_at: '2026-09-01T09:00:00Z', envoye_le: statut !== 'brouillon' ? '2026-09-02T09:00:00Z' : null, accepte_le: statut === 'accepte' ? '2026-09-05T09:00:00Z' : null, ...extra })
const fa = (id, devis_id, statut, ttc, extra = {}) => ({ id, artisan_id: A, devis_id, statut, total_ttc: ttc, date_emission: '2026-09-10', avoir_de: null, ...extra })
const ch = (id, devis_id, statut, extra = {}) => ({ id, artisan_id: A, devis_id, statut, titre: `Chantier ${id}`, cree_le: '2026-09-06T09:00:00Z', date_debut: '2026-09-08', ...extra })
const ld = (id, statut) => ({ id, artisan_id: A, statut, nom_prospect: `Prospect ${id}`, created_at: '2026-08-30T09:00:00Z' })

// ═══════════════════════ A. Argent ═══════════════════════
{
  const d = dv('D1', 'accepte', 1000, { acompte_pct: 30 })
  T('A1 la facture d’acompte (objet « Acompte 30 % — … », le seul chemin qui en crée) est un acompte', Ar.estAcompte({ ...AC, total_ttc: 300 }, 100000))
  T('A2 la facture COMPLÈTE ou de SOLDE d’un devis à acompte (le % recopié, l’objet du devis) n’est PAS un acompte, quel que soit son montant', !Ar.estAcompte({ acompte_pct: 30, objet: 'Salle de bain', total_ttc: 1000 }, 100000) && !Ar.estAcompte({ acompte_pct: 30, objet: 'Salle de bain', total_ttc: 700 }, 100000))
  T('A3 sans pourcentage, jamais un acompte ; sans objet lu, le montant tranche (≈ 30 % du devis)', !Ar.estAcompte({ acompte_pct: 0, objet: 'Acompte', total_ttc: 300 }, 100000) && Ar.estAcompte({ acompte_pct: 30, total_ttc: 300 }, 100000) && !Ar.estAcompte({ acompte_pct: 30, total_ttc: 700 }, 100000))
  const a1 = Ar.argentDossier(d, [fa('F1', 'D1', 'payee', 300, AC), fa('F2', 'D1', 'emise', 700, SOLDE)])
  T('A4 acompte réglé + solde émis : facturé 1 000 €, encaissé 300 €, reste 700 € dont 700 € facturés non réglés, couvre',
    a1.facture === 100000 && a1.encaisse === 30000 && a1.resteAEncaisser === 70000 && a1.factureNonRegle === 70000 && a1.resteAFacturer === 0 && a1.couvre && a1.acompte.recu === 30000 && a1.acompte.factures === 1, JSON.stringify(a1))
  const a2 = Ar.argentDossier(d, [fa('F3', 'D1', 'emise', 1000), fa('F4', 'D1', 'emise', -1000, { avoir_de: 'F3' }), fa('F5', 'D1', 'brouillon', 1000), fa('F6', 'D1', 'annulee', 1000)])
  T('A5 une facture et son avoir s’annulent ; brouillon et annulée ne comptent pas : rien de facturé, tout reste à encaisser', a2.facture === 0 && a2.nbFactures === 0 && a2.resteAEncaisser === 100000 && a2.resteAFacturer === 100000 && !a2.couvre, JSON.stringify(a2))
  const a3 = Ar.argentDossier(dv('D2', 'envoye', 500), [])
  T('A6 devis non signé : rien n’est dû (reste 0), pas de reste à facturer', a3.resteAEncaisser === 0 && a3.resteAFacturer === null && !a3.signe)
  const a4 = Ar.argentDossier(dv('D3', 'accepte', 1000), [fa('F7', 'D3', 'payee', 1200)])
  T('A7 facturé plus que le devis (supplément) : le dû suit la facture, rien ne reste', a4.resteAEncaisser === 0 && a4.couvre)
  T('A8 sans devis : zéro partout, montant du devis null', egal([Ar.argentDossier(null, []).devis, Ar.argentDossier(null, []).facture], [null, 0]))
  T('A9 montants en virgule et en texte lus au centime (« 1234,56 »)', Ar.argentDossier(dv('D4', 'accepte', '1234,56'), []).devis === 123456)
  // Audit de cohérence C3 : la facture du solde reprenait le devis entier sans déduire l'acompte (130 % facturés).
  const c3 = Ar.argentDossier(d, [fa('F1', 'D1', 'payee', 300, AC), fa('F2', 'D1', 'emise', 1000, { acompte_pct: 30, objet: 'Salle de bain' })])
  T('A15 (C3) acompte payé + « solde » au montant entier : l’acompte n’est compté qu’une fois (facturé 1 000 €, reste 700 €) et c’est signalé', c3.acompteDouble === 30000 && c3.facture === 100000 && c3.resteAEncaisser === 70000 && c3.couvre, JSON.stringify(c3))
  const c3b = Ar.argentDossier(d, [fa('F1', 'D1', 'payee', 300, AC), fa('F2', 'D1', 'payee', 1000, { acompte_pct: 30, objet: 'Salle de bain' })])
  T('A16 (C3) les deux réglées : encaissé 1 000 €, rien ne reste (jamais 1 300 €)', c3b.encaisse === 100000 && c3b.resteAEncaisser === 0, JSON.stringify(c3b))
  T('A17 cas normal (solde = devis − acompte) : aucun signal', Ar.argentDossier(d, [fa('F1', 'D1', 'payee', 300, AC), fa('F2', 'D1', 'emise', 700, SOLDE)]).acompteDouble === 0)
  // Arrondi de la TVA : acompte et solde peuvent laisser la somme à un centime du devis.
  const arr = Ar.argentDossier(dv('D1', 'accepte', 1000, { acompte_pct: 30 }), [fa('F1', 'D1', 'payee', 333.33, AC), fa('F2', 'D1', 'payee', 666.66, SOLDE)])
  T('A18 un centime d’écart par facture (arrondi de TVA) : couvert, réglé, rien ne reste (jamais « 0,01 € à facturer »)', arr.couvre && arr.regle && arr.resteAEncaisser === 0 && arr.resteAFacturer === 0, JSON.stringify(arr))
  const P2 = P.etapeDevisSigne(1000, [fa('F1', 'D1', 'payee', 333.33, AC), fa('F2', 'D1', 'payee', 666.66, SOLDE)], null)
  T('A19 la colonne du pipeline suit la même tolérance : Payé', P2.etape === 'paye')
  // Décision « Demander l'acompte »
  T('A10 acompte : devis introuvable → 404', Ar.decisionAcompte(null, []).statut === 404)
  T('A11 acompte : devis non signé → 409', Ar.decisionAcompte(dv('x', 'envoye', 1000, { acompte_pct: 30 }), []).statut === 409)
  T('A12 acompte : aucun % prévu (0 ou 100) → 409', Ar.decisionAcompte(dv('x', 'accepte', 1000, { acompte_pct: 0 }), []).statut === 409 && Ar.decisionAcompte(dv('x', 'accepte', 1000, { acompte_pct: 100 }), []).statut === 409)
  T('A13 acompte : une facture déjà comptée (acompte ou totale) → 409 (jamais deux fois)', Ar.decisionAcompte(dv('x', 'accepte', 1000, { acompte_pct: 30 }), [fa('F', 'x', 'emise', 300, AC)]).statut === 409)
  const ok = Ar.decisionAcompte(dv('x', 'accepte', 1000, { acompte_pct: 30 }), [fa('F', 'x', 'emise', 1000), fa('G', 'x', 'emise', -1000, { avoir_de: 'F' })])
  T('A14 acompte : une facture annulée par un avoir ne bloque pas ; 30 % de 1 000 € = 300 €', ok.ok && ok.pct === 30 && ok.montant === 30000, JSON.stringify(ok))
}

// ═══════════════════════ B. Frise ═══════════════════════
{
  const F = (lead, devis, factures, chantier) => P.frise({ lead, devis, factures, chantier })
  const f1 = F(ld('L1', 'nouveau'), null, [], null)
  T('B1 demande seule : Demande faite, le reste à venir (acompte hors sujet) ; geste « Créer le devis »', etats(f1) === 'fait,a_venir,a_venir,na,a_venir,a_venir,a_venir' && f1.prochaine?.libelle === 'Créer le devis' && f1.prochaine.href === '/devis/nouveau?lead=L1', etats(f1) + JSON.stringify(f1.prochaine))
  const f2 = F(ld('L1', 'repondu'), dv('D1', 'brouillon', 800, { lead_id: 'L1' }), [], null)
  T('B2 brouillon : Devis en cours ; geste « Ouvrir le brouillon »', etats(f2) === 'fait,en_cours,a_venir,na,a_venir,a_venir,a_venir' && f2.prochaine?.href === '/devis/D1', etats(f2))
  const f3 = F(null, dv('D1', 'envoye', 800), [], null)
  T('B3 devis envoyé sans demande : Demande hors sujet, Devis fait, Signé en cours (en attente)', etats(f3) === 'na,fait,en_cours,na,a_venir,a_venir,a_venir' && f3.pastilles[1].date === '2026-09-02', etats(f3))
  const f4 = F(null, dv('D1', 'accepte', 1000, { acompte_pct: 30 }), [], null)
  T('B4 signé, acompte de 30 % prévu : Acompte à venir ; le geste est « Demander l’acompte » (300 €, sur ce devis)', etats(f4) === 'na,fait,fait,a_venir,a_venir,a_venir,a_venir' && f4.prochaine?.acompte?.devisId === 'D1' && f4.prochaine.acompte.montant === 30000 && f4.prochaine.href === null, etats(f4) + JSON.stringify(f4.prochaine))
  const f5 = F(null, dv('D1', 'accepte', 1000, { acompte_pct: 30 }), [fa('F1', 'D1', 'emise', 300, AC)], ch('C1', 'D1', 'planifie'))
  T('B5 acompte émis non réglé, chantier planifié : Acompte en cours, Chantier en cours, Facturé en cours (300 € sur 1 000 €)', etats(f5) === 'na,fait,fait,en_cours,en_cours,en_cours,a_venir' && /300 € facturés sur 1 000 €/.test(sp(f5.pastilles[5].detail)), etats(f5) + f5.pastilles[5].detail)
  const f6 = F(null, dv('D1', 'accepte', 1000, { acompte_pct: 30 }), [fa('F1', 'D1', 'payee', 300, { ...AC, payee_le: '2026-09-12T10:00:00Z' })], ch('C1', 'D1', 'en_cours'))
  T('B6 acompte réglé, chantier en cours : Acompte fait (daté du règlement), Payé en cours (300 € encaissés sur 1 000 €)', etats(f6) === 'na,fait,fait,fait,en_cours,en_cours,en_cours' && f6.pastilles[3].date === '2026-09-12' && /300 € encaissés sur 1 000 €/.test(sp(f6.pastilles[6].detail)), etats(f6))
  const f7 = F(null, dv('D1', 'accepte', 1000, { acompte_pct: 30 }), [fa('F2', 'D1', 'emise', 1000, { acompte_pct: 30, objet: 'Salle de bain' })], ch('C1', 'D1', 'termine', { date_fin_reelle: '2026-09-20' }))
  T('B7 facture complète (le % recopié) sur chantier terminé : Acompte hors sujet (« facturé sans facture d’acompte »), Facturé fait, Payé à venir', etats(f7) === 'na,fait,fait,na,fait,fait,a_venir' && /sans facture d’acompte/.test(f7.pastilles[3].detail) && f7.prochaine?.etape === 'paye', etats(f7))
  const f8 = F(ld('L1', 'gagne'), dv('D1', 'accepte', 1000, { lead_id: 'L1' }), [fa('F2', 'D1', 'payee', 1000)], ch('C1', 'D1', 'termine'))
  T('B8 tout réglé : sept pastilles faites (acompte hors sujet), aucun geste', etats(f8) === 'fait,fait,fait,na,fait,fait,fait' && f8.prochaine === null, etats(f8))
  const f9 = F(null, dv('D1', 'refuse', 1000), [], null)
  T('B9 devis refusé : Signé arrêté, la suite ne s’applique plus, aucun geste', etats(f9) === 'na,fait,arrete,na,na,na,na' && f9.prochaine === null && f9.pastilles[2].detail === 'Devis refusé', etats(f9))
  const f10 = F(ld('L2', 'perdu'), null, [], null)
  T('B10 demande perdue : arrêtée au devis', etats(f10) === 'fait,arrete,na,na,na,na,na' && f10.prochaine === null, etats(f10))
  const f11 = F(null, null, [], ch('C9', null, 'en_cours'))
  T('B11 petit chantier sans devis : seul le chantier s’applique (sa facture n’y est pas reliée : on ne l’invente pas)', etats(f11) === 'na,na,na,na,en_cours,na,na' && /sans lien avec le chantier/.test(f11.pastilles[5].detail), etats(f11))
  const f12 = F(null, dv('D1', 'accepte', 1000), [], ch('C1', 'D1', 'annule'))
  T('B12 chantier annulé sur devis signé : Chantier arrêté, le dossier n’est pas classé (le devis reste signé)', etats(f12) === 'na,fait,fait,na,arrete,a_venir,a_venir', etats(f12))
  // Chaque pastille faite porte sa pièce (sur un écran qui existe) ; jamais de lien inventé.
  const ecrans = new Set(['/messages', '/factures'])
  const pieces = [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12].flatMap((f) => f.pastilles.map((p) => p.piece?.href)).filter(Boolean)
  T('B13 les pièces ouvrent des écrans qui existent (/devis/<id>, /crm/chantiers/<id>, /factures, /messages)', pieces.every((h) => ecrans.has(h) || /^\/devis\/[\w-]+$/.test(h) || /^\/crm\/chantiers\/[\w-]+$/.test(h)) && ['app/devis/[id]/page.tsx', 'app/crm/chantiers/[id]/page.tsx', 'app/factures/page.tsx', 'app/messages/page.tsx'].every((f) => fs.existsSync(path.join(RACINE, f))), pieces.join(' '))
  // Déplacement manuel : la carte garde la colonne choisie, la frise suit les vrais statuts et le dit.
  const cs = P.cartes({ artisanId: A, leads: [], devis: [dv('D1', 'envoye', 500)], factures: [], chantiers: [], deplacements: [{ artisan_id: A, objet: 'devis', objet_id: 'D1', vers: 'paye', etape_derivee: 'devis_envoye', cree_le: '2026-09-03T09:00:00Z' }] })
  T('B14 déplacée à la main vers Payé : la carte est en Payé, sa frise reste celle des vrais statuts et signale le geste', cs[0].etape === 'paye' && cs[0].manuel && cs[0].frise.manuel === 'paye' && etats(cs[0].frise) === etats(f3), JSON.stringify(cs[0].frise.manuel))
}

// ═══════════════════════ C. Deux chiffres, un écran (300 comptes tirés au hasard) ═══════════════════════
{
  let graine = 1810
  const r = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648 }
  const pick = (l) => l[Math.floor(r() * l.length)]
  const mauvais = []
  let cartesVues = 0
  for (let k = 0; k < 300; k++) {
    const leads = [], devis = [], factures = [], chantiers = []
    const n = 1 + Math.floor(r() * 7)
    for (let i = 0; i < n; i++) {
      const lid = r() < 0.6 ? `L${k}-${i}` : null
      if (lid) leads.push(ld(lid, pick(['nouveau', 'repondu', 'gagne', 'perdu', 'en_discussion'])))
      if (r() < 0.15) continue // demande sans devis
      const st = pick(['brouillon', 'envoye', 'accepte', 'accepte', 'accepte', 'refuse', 'expire'])
      const ttc = (1 + Math.floor(r() * 90)) * 50
      const pct = r() < 0.4 ? pick([20, 30, 40]) : 0
      const did = `D${k}-${i}`
      devis.push(dv(did, st, ttc, { lead_id: lid, acompte_pct: pct }))
      if (st === 'accepte') {
        if (pct && r() < 0.6) factures.push(fa(`FA${k}-${i}`, did, r() < 0.5 ? 'payee' : 'emise', Math.round(ttc * pct) / 100, { acompte_pct: pct, objet: `Acompte ${pct} % — travaux` }))
        if (r() < 0.5) factures.push(fa(`FS${k}-${i}`, did, r() < 0.5 ? 'payee' : 'emise', factures.some((f) => f.devis_id === did) ? ttc - Math.round(ttc * pct) / 100 : ttc, factures.some((f) => f.devis_id === did) ? SOLDE : { acompte_pct: pct, objet: 'Travaux' }))
        if (r() < 0.1) { const f = factures.find((x) => x.devis_id === did); if (f) factures.push(fa(`AV${k}-${i}`, did, 'emise', -Number(f.total_ttc), { avoir_de: f.id })) }
        if (r() < 0.7) chantiers.push(ch(`C${k}-${i}`, did, pick(['a_planifier', 'planifie', 'en_cours', 'en_pause', 'termine', 'annule'])))
      }
    }
    if (r() < 0.3) chantiers.push(ch(`CS${k}`, null, pick(['en_cours', 'termine', 'annule'])))
    const e = { artisanId: A, leads, devis, factures, chantiers, deplacements: [] }
    const toutes = P.cartes(e)
    const pl = P.pipeline(e)
    for (const c of toutes) {
      cartesVues++
      const s = Object.fromEntries(c.frise.pastilles.map((p) => [p.etape, p.etat]))
      const ok = {
        paye: s.paye === 'fait',
        a_facturer: c.preuve === 'facture_impayee' ? s.facture === 'fait' && s.paye !== 'fait' : c.preuve === 'chantier_termine' ? s.chantier === 'fait' && s.facture !== 'fait' : false,
        chantier: s.chantier === 'en_cours' && s.facture !== 'fait',
        signe: s.signe === 'fait' && (s.chantier === 'a_venir' || s.chantier === 'arrete') && s.facture !== 'fait',
        devis_envoye: s.devis === 'fait' && s.signe === 'en_cours',
        demande: s.devis !== 'fait' && s.signe !== 'fait',
        classe: c.frise.pastilles.some((p) => p.etat === 'arrete') && c.frise.prochaine === null,
      }[c.etapeDerivee]
      // Sens inverse : une frise « payée » est forcément en colonne Payé.
      if (!ok || (s.paye === 'fait') !== (c.etapeDerivee === 'paye')) mauvais.push(`${c.cle} ${c.etapeDerivee}/${c.preuve} ⟂ ${etats(c.frise)}`)
    }
    const t = calculerTableauCrm({ artisanId: A, devis, factures, demandes: leads, chantiers, materiaux: [], maintenant: new Date('2026-10-18T10:00:00Z'), cartes: toutes })
    const colonnes = pl.colonnes.reduce((s, col) => s + col.aEncaisser, 0) + toutes.filter((c) => c.etape === 'classe').reduce((s, c) => s + c.aEncaisser, 0)
    if ((t.aEncaisser?.montant ?? 0) !== colonnes) mauvais.push(`compte ${k} : tuile ${t.aEncaisser?.montant} ≠ colonnes ${colonnes}`)
    // Le facturé non réglé des dossiers = les impayés de Mes chiffres rattachés à un devis (même règle de factures comptées).
    const nonRegle = devis.reduce((s, d) => s + Ar.argentDossier(d, factures.filter((f) => f.devis_id === d.id)).factureNonRegle, 0)
    const compta = calculerCompta({ artisanId: A, factures, devis, demandes: leads, lignes: [], periode: 'tout', maintenant: new Date('2026-10-18T10:00:00Z') })
    const idsDevis = new Set(factures.filter((f) => f.devis_id).map((f) => f.id))
    const impayesDevis = compta.impayes.filter((i) => idsDevis.has(i.ref)).reduce((s, i) => s + i.montant, 0)
    if (nonRegle !== impayesDevis) mauvais.push(`compte ${k} : facturé non réglé ${nonRegle} ≠ impayés ${impayesDevis}`)
  }
  T(`C1 sur 300 comptes (${cartesVues} dossiers) : la frise de chaque carte dit la même chose que sa colonne ; tuile « À encaisser » = colonnes ; facturé non réglé = impayés de Mes chiffres`, mauvais.length === 0 && cartesVues > 900, mauvais.slice(0, 5).join(' | '))
}

// ═══════════════════════ D. Indicateurs ═══════════════════════
{
  const base = { devis: { id: 'D1', statut: 'accepte', total_ttc: 1100, total_ht: 1000 }, factures: [], taches: [{ faite: true }, { faite: false }], chantier: { statut: 'en_cours', date_fin_prevue: '2026-10-15' }, jour: '2026-10-18' }
  const i1 = C.indicateurs({ ...base, materiaux: [{ statut: 'sorti', quantite: 10, prix_vu_ht: 0.8 }, { statut: 'sorti', quantite: '2,5', prix_vu_ht: '12' }, { statut: 'reserve', quantite: 99, prix_vu_ht: 100 }] })
  T('D1 matière sortie : quantité × dernier prix vu HT (10 × 0,80 + 2,5 × 12 = 38 €) ; une réservation non sortie ne compte pas', i1.matiere.sortie === 3800 && i1.matiere.lignes === 2 && i1.matiere.sansPrix === 0, JSON.stringify(i1.matiere))
  T('D2 marge sur matériaux estimée : (1 000 − 38) / 1 000 = 96 %, 962 € HT', i1.marge?.pct === 96 && i1.marge.montant === 96200 && !i1.marge.partielle, JSON.stringify(i1.marge))
  T('D3 avancement et retard du même calcul que la fiche (1 sur 2, 3 jours)', i1.avancement.pct === 50 && i1.retard === 3 && i1.devisId === 'D1')
  const i2 = C.indicateurs({ ...base, materiaux: [] })
  T('D4 aucune sortie : marge « — » (sinon elle vaudrait 100 %, ce qui est faux)', i2.marge === null && i2.matiere.sortie === 0)
  const i3 = C.indicateurs({ ...base, materiaux: [{ statut: 'sorti', quantite: 1, prix_vu_ht: null }, { statut: 'sorti', quantite: 1, prix_vu_ht: 50 }] })
  T('D5 une sortie sans prix connu : non comptée, comptée à part, la marge est « partielle »', i3.matiere.sansPrix === 1 && i3.matiere.sortie === 5000 && i3.marge?.partielle === true)
  const i4 = C.indicateurs({ ...base, devis: null, materiaux: [{ statut: 'sorti', quantite: 1, prix_vu_ht: 50 }] })
  T('D6 sans devis : pas de marge, pas d’argent inventé', i4.marge === null && i4.argent.devis === null && i4.devisId === null)
  const i5 = C.indicateurs({ ...base, devis: { ...base.devis, total_ht: 0 }, materiaux: [{ statut: 'sorti', quantite: 1, prix_vu_ht: 50 }] })
  T('D7 devis HT à zéro : pas de marge (division évitée)', i5.marge === null)
}

// ═══════════════════════ E. Écrans, exemple, route ═══════════════════════
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
{
  const ind = lire('app/crm/Indicateurs.tsx')
  T('E1 la marge dit toujours ce qu’elle est : « Marge sur matériaux, estimée », « main-d’œuvre non comptée », « partielle »', /Marge sur matériaux, estimée/.test(ind) && /main-d’œuvre non comptée/.test(ind) && /partielle/.test(ind) && /Au dernier prix vu/.test(ind))
  const fr = sansCommentaires(lire('app/crm/Frise.tsx'))
  T('E2 « Demander l’acompte » passe par appel() (bloqué en exemple), après confirmation, vers /api/crm/acompte', /if \(!confirm\(/.test(fr) && /appel<[^>]*>\('\/api\/crm\/acompte', \{ method: 'POST', body: \{ devis_id: action\.acompte\.devisId \} \}\)/.test(fr) && !/\bfetch\(/.test(fr))
  const route = sansCommentaires(lire('app/api/crm/acompte/route.ts'))
  T('E3 la route : gardeCrm en premier (offre Signature), corps fermé (devis_id seul), lecture filtrée sur la session, décision pure, un seul passage par devis et 15 s, chemin de facture existant',
    /const g = await gardeCrm\(req\)\n\s*if \('reponse' in g\) return g\.reponse/.test(route.replace(/\r\n/g, '\n')) && /champsPermis\(corps\.valeur, \['devis_id'\]\)/.test(route) && (route.match(/\.eq\('artisan_id', g\.uid\)/g) ?? []).length === 2 && /decisionAcompte\(/.test(route) && /consommerLimite\(`crm-acompte:\$\{g\.uid\}:\$\{devisId\}`, 1, 15\)/.test(route) && /creerFacture\(\{ artisanId: g\.uid, devisId, acomptePct: d\.pct \}\)/.test(route))
  T('E4 aucun e-mail : le chemin de facture ne contient aucun envoi', !/sendEmail|resend|envoyerEmail|from '@\/lib\/email'/i.test(sansCommentaires(lire('lib/factureDepuisDevis.ts'))))
  const css = sansCommentaires(lire('app/crm/crm.css'))
  const apres = css.includes('.crm-frise-cadre') ? css.slice(css.indexOf('.crm-frise-cadre')) : ''
  T('E5 CSS de la frise et des indicateurs : jetons seulement ; le mouvement seulement hors « réduire les animations »', !!apres && !/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|blue|purple|violet/i.test(apres) && !/transition|animation|@starting-style/.test(apres.split('@media (prefers-reduced-motion: no-preference)')[0]))
  // L'exemple : les mêmes calculs, cohérents d'un écran à l'autre.
  const E = await imp('lib/crm/exemple.ts')
  const carte4 = E.VUE_EXEMPLE.pipeline.colonnes.flatMap((c) => c.cartes).find((c) => c.titre === 'Réseau d’évacuation')
  T('E6 exemple : le réseau d’évacuation (signé, acompte de 30 % prévu, rien de facturé) propose « Demander l’acompte » (1 170 €)', carte4?.frise.prochaine?.acompte?.montant === 117000, JSON.stringify(carte4?.frise.prochaine))
  const fiche1 = E.ficheChantierExemple('00000000-0000-4000-8000-000000000001')
  T('E7 exemple : salle de bain — demande, devis, signé, acompte réglés ; chantier en cours ; 2 520 € facturés sur 8 400 €', etats(fiche1.frise) === 'fait,fait,fait,fait,en_cours,en_cours,en_cours' && fiche1.indicateurs.argent.encaisse === 252000 && fiche1.indicateurs.argent.resteAEncaisser === 588000, etats(fiche1.frise))
  const pareil = E.VUE_EXEMPLE.atelier.chantiers.every((c) => {
    const f = E.ficheChantierExemple(c.id)
    return f && egal({ ...c.indicateurs, avancement: null }, { ...f.indicateurs, avancement: null }) && egal(c.frise?.pastilles, f.frise.pastilles)
  })
  T('E8 exemple : le panneau de l’atelier et la fiche chantier montrent la même frise et les mêmes indicateurs (chaque chantier)', pareil)
  T('E9 exemple : matière sortie et marge estimée sur la salle de bain (mitigeur, siphons, raccords)', fiche1.indicateurs.matiere.sortie === 6900 && fiche1.indicateurs.marge?.pct === 99, JSON.stringify([fiche1.indicateurs.matiere, fiche1.indicateurs.marge]))
  const ch3 = E.ficheChantierExemple('00000000-0000-4000-8000-000000000003')
  T('E10 exemple : le chauffe-eau (groupe de sécurité sans prix vu) a une marge « partielle »', ch3.indicateurs.marge?.partielle === true && ch3.indicateurs.matiere.sansPrix === 1)
  const tdb = E.VUE_EXEMPLE.tableau.aEncaisser
  const col = E.VUE_EXEMPLE.pipeline.colonnes.reduce((s, c) => s + c.aEncaisser, 0)
  T('E11 exemple : la tuile « À encaisser » = la somme des colonnes du pipeline', tdb && tdb.montant === col && col > 0, `${tdb?.montant} / ${col}`)

  // Rendu serveur de la frise (react-dom/server, comme scripts/crm-qa.mjs H).
  const ts = require('typescript')
  const CACHE = path.join(RACINE, 'node_modules', '.cache', `crm-lot1-${process.pid}`)
  fs.mkdirSync(CACHE, { recursive: true })
  try {
    const transpiler = (rel, remplacer) => ts.transpileModule(lire(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: path.basename(rel) }).outputText
      .replace(/(from\s+)(['"])([^'"]+)\2/g, (m, a, q, spec) => `${a}${q}${remplacer(spec)}${q}`)
    fs.writeFileSync(path.join(CACHE, 'supabase.mjs'), "export const supabase = { auth: { getSession: async () => ({ data: { session: null } }) } }\n")
    fs.writeFileSync(path.join(CACHE, 'navigation.mjs'), 'export const useRouter = () => ({ replace() {}, push() {} })\n')
    const libs = (spec) => spec === '@/lib/supabaseClient' ? './supabase.mjs' : spec === 'next/navigation' ? './navigation.mjs' : spec.startsWith('@/lib/') ? pathToFileURL(path.join(RACINE, `${spec.slice(2)}.ts`)).href : spec === './client' ? './client.mjs' : spec === './mode' ? './mode.mjs' : spec
    for (const [f, src] of [['client.mjs', 'app/crm/client.ts'], ['mode.mjs', 'app/crm/mode.tsx'], ['Frise.mjs', 'app/crm/Frise.tsx'], ['Indicateurs.mjs', 'app/crm/Indicateurs.tsx']]) fs.writeFileSync(path.join(CACHE, f), transpiler(src, libs))
    const { renderToStaticMarkup } = require('react-dom/server')
    const { createElement } = require('react')
    const rendre = async (fichier, props) => renderToStaticMarkup(createElement((await import(pathToFileURL(path.join(CACHE, fichier)).href)).default, props))
    const f4 = P.frise({ lead: null, devis: dv('D1', 'accepte', 1000, { acompte_pct: 30 }), factures: [], chantier: null })
    const h = await rendre('Frise.mjs', { frise: f4 })
    T('E12 frise rendue : 7 pastilles en boutons, UNE étape courante (aria-current="step"), état lu par les lecteurs d’écran, geste « Demander l’acompte (30 %) »', (h.match(/<li /g) ?? []).length === 7 && (h.match(/aria-current="step"/g) ?? []).length === 1 && (h.match(/<button type="button" aria-expanded="false"/g) ?? []).length === 7 && /Acompte<\/span><span class="crm-sr"> : à venir/.test(h) && /Demander l’acompte \(30 %\)/.test(h), h.slice(0, 600))
    const hc = await rendre('Frise.mjs', { frise: f4, compacte: true })
    T('E13 mini-frise des cartes : sept points muets, une seule phrase pour les lecteurs d’écran', (hc.match(/<li /g) ?? []).length === 7 && /aria-label="Étapes du dossier\. Demande : ne s’applique pas, Devis envoyé : fait, Signé : fait, Acompte : à venir/.test(hc) && !/<button/.test(hc), hc.slice(0, 400))
    const hs = await rendre('Frise.mjs', { frise: f4, sansAction: true })
    T('E14 en démonstration publique, la frise n’offre aucun geste', !/Demander l’acompte/.test(hs))
    const hi = await rendre('Indicateurs.mjs', { ind: C.indicateurs({ devis: null, factures: [], materiaux: [], taches: [], chantier: { statut: 'en_cours', date_fin_prevue: null }, jour: '2026-10-18' }), chantierId: 'C1', dansLaFiche: true })
    T('E15 indicateurs d’un chantier sans devis : « — » partout où rien n’existe, aucun montant inventé', !/[1-9]\d* €/.test(hi.replace(/<[^>]+>/g, ' ')) && (hi.match(/>—</g) ?? []).length >= 5, hi.replace(/<[^>]+>/g, ' ').slice(0, 300))
  } finally { fs.rmSync(CACHE, { recursive: true, force: true }) }
}

// ═══════════════════════ L. En vrai : routes locales, base réelle, comptes de test ═══════════════════════
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) console.log('\n(L non joué : TEST_BASE absent — lancer un serveur local et poser TEST_BASE=http://localhost:<port>)')
else if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) T('L0 TEST_BASE doit être un serveur LOCAL', false, BASE)
else {
  for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  const { createClient } = await import('@supabase/supabase-js')
  const { verifierSessionTest } = await import(pathToFileURL(path.join(RACINE, 'scripts/lib/connexion-test.mjs')).href)
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const comptes = []
  // Mentions légales de test (reprises de scripts/facturation-e2e.mjs) : sans elles, aucune facture ne peut être émise.
  const LEGAL = { forme_juridique: 'EI', adresse: '12 rue des Lilas', code_postal: '44000', ville: 'Nantes', siret: '55203253400646', tel_public: '0240000000', email_public: 'contact@presti-test.invalid', assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-778812', assurance_activites: 'garantie décennale — plomberie', assurance_zone: 'France métropolitaine', zone_intervention: 'Loire-Atlantique', mediateur_nom: 'Médiateur de test', mediateur_url: 'https://mediateur.presti-test.invalid' }
  const creer = async (nom, plan) => {
    const slug = `lot1-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
    const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
    if (error) throw new Error(`compte ${nom} : ${error.message}`)
    comptes.push(u.user.id)
    const { error: ea } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Test lot 1 ${nom}`, metier: 'Plombier', slug, plan, ...LEGAL })
    if (ea) throw new Error(`fiche ${nom} : ${ea.message}`)
    const nav = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: s, error: es } = await nav.auth.signInWithPassword({ email, password: mdp })
    if (es) throw new Error(`connexion ${nom} : ${es.message}`)
    await verifierSessionTest(s.session.access_token)
    return { uid: u.user.id, jeton: s.session.access_token }
  }
  const http = async (c, chemin, init = {}) => {
    const r = await fetch(`${BASE}${chemin}`, { method: init.method ?? 'GET', headers: { Authorization: `Bearer ${c.jeton}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: init.body !== undefined ? JSON.stringify(init.body) : undefined })
    return { status: r.status, corps: await r.json().catch(() => null) }
  }
  try {
    console.log('\n── L. Trois comptes de test (Signature A et B, Studio S), données semées par la clé de service')
    const [CA, CB, CS] = [await creer('A', 'signature'), await creer('B', 'signature'), await creer('S', 'studio')]
    // Franchise de TVA (régime par défaut) : HT = TTC, une ligne de 1 200 €.
    const { data: d, error: ed } = await admin.from('devis').insert({ artisan_id: CA.uid, statut: 'accepte', numero: 'DEV-LOT1-1', objet: 'Salle d’eau test', client_nom: 'Client test lot 1', client_email: 'client@presti-test.invalid', total_ht: 1200, total_tva: 0, total_ttc: 1200, acompte_pct: 30, envoye_le: new Date(Date.now() - 6 * 864e5).toISOString(), accepte_le: new Date(Date.now() - 3 * 864e5).toISOString() }).select('id').single()
    if (ed) throw new Error(`devis : ${ed.message}`)
    await admin.from('devis_lignes').insert({ devis_id: d.id, ordre: 0, designation: 'Pose d’un receveur', quantite: 1, unite: 'u', prix_unitaire_ht: 1200, tva_taux: 0 })
    const { data: c, error: ec } = await admin.from('chantiers').insert({ artisan_id: CA.uid, devis_id: d.id, titre: 'Salle d’eau test', statut: 'en_cours', date_debut: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10) }).select('id').single()
    if (ec) throw new Error(`chantier : ${ec.message}`)
    const { data: m } = await admin.from('materiaux').insert({ artisan_id: CA.uid, nom: 'Receveur test', unite: 'u', prix_vu_ht: 12.5 }).select('id').single()
    const { error: er } = await admin.from('chantier_materiaux').insert({ artisan_id: CA.uid, chantier_id: c.id, materiau_id: m.id, quantite: 4, lieu: 'atelier', statut: 'sorti', sorti_le: new Date().toISOString() })
    if (er) throw new Error(`sortie : ${er.message}`)

    const f1 = await http(CA, `/api/crm/chantiers/${c.id}`)
    const s1 = f1.corps ? Object.fromEntries(f1.corps.frise.pastilles.map((p) => [p.etape, p.etat])) : {}
    T('L1 fiche chantier (vraie route) : frise signé / acompte à venir / chantier en cours ; geste « Demander l’acompte » 360 €', f1.status === 200 && s1.signe === 'fait' && s1.acompte === 'a_venir' && s1.chantier === 'en_cours' && f1.corps.frise.prochaine?.acompte?.montant === 36000, `${f1.status} ${JSON.stringify(s1)}`)
    T('L2 indicateurs (vraie route) : devis 1 200 €, matière sortie 4 × 12,50 € = 50 € HT, marge estimée 96 %', f1.corps?.indicateurs.argent.devis === 120000 && f1.corps.indicateurs.matiere.sortie === 5000 && f1.corps.indicateurs.marge?.pct === 96, JSON.stringify(f1.corps?.indicateurs.matiere))
    const v1 = await http(CA, '/api/crm/vue')
    const chA = v1.corps?.atelier.chantiers.find((x) => x.id === c.id)
    T('L3 vue (vraie route) : le panneau de l’atelier a les mêmes indicateurs que la fiche ; tuile « À encaisser » 1 200 €', v1.status === 200 && egal({ ...chA?.indicateurs, avancement: null }, { ...f1.corps?.indicateurs, avancement: null }) && v1.corps.tableau.aEncaisser?.montant === 120000, `${v1.status} ${JSON.stringify(v1.corps?.tableau.aEncaisser)}`)
    const s403 = await http(CS, '/api/crm/acompte', { method: 'POST', body: { devis_id: d.id } })
    T('L4 compte Studio : « Demander l’acompte » refusé (403, offre)', s403.status === 403 && s403.corps?.code === 'offre', JSON.stringify(s403))
    const bad = await http(CA, '/api/crm/acompte', { method: 'POST', body: { devis_id: 'x' } })
    const extra = await http(CA, '/api/crm/acompte', { method: 'POST', body: { devis_id: d.id, acompte_pct: 90 } })
    T('L5 corps refusé : identifiant mal formé (400), champ en trop (400) — le pourcentage vient du devis, jamais du navigateur', bad.status === 400 && extra.status === 400, `${bad.status} ${extra.status}`)
    const autre = await http(CB, '/api/crm/acompte', { method: 'POST', body: { devis_id: d.id } })
    T('L6 le compte B ne peut pas demander l’acompte d’un devis du compte A (404)', autre.status === 404, JSON.stringify(autre))
    const get = await http(CA, '/api/crm/acompte')
    T('L7 GET /api/crm/acompte : 405 après la garde', get.status === 405)
    const ok = await http(CA, '/api/crm/acompte', { method: 'POST', body: { devis_id: d.id } })
    const { data: fs1 } = await admin.from('factures').select('id, total_ttc, acompte_pct, statut').eq('devis_id', d.id)
    T('L8 « Demander l’acompte » : 201, UNE facture d’acompte de 360 € (30 %), émise', ok.status === 201 && /^FAC-/.test(ok.corps?.numero ?? '') && fs1?.length === 1 && Number(fs1[0].total_ttc) === 360 && fs1[0].statut === 'emise', `${ok.status} ${JSON.stringify(ok.corps)} ${JSON.stringify(fs1)}`)
    const deux = await http(CA, '/api/crm/acompte', { method: 'POST', body: { devis_id: d.id } })
    const { count: nf } = await admin.from('factures').select('id', { count: 'exact', head: true }).eq('devis_id', d.id)
    T('L9 une seconde demande est refusée (409) : toujours une seule facture', deux.status === 409 && nf === 1, `${deux.status} ${nf}`)
    const f2 = await http(CA, `/api/crm/chantiers/${c.id}`)
    const s2 = Object.fromEntries(f2.corps.frise.pastilles.map((p) => [p.etape, p.etat]))
    T('L10 la frise suit : Acompte en cours, Facturé en cours (360 € sur 1 200 €)', s2.acompte === 'en_cours' && s2.facture === 'en_cours' && f2.corps.indicateurs.argent.facture === 36000, JSON.stringify(s2))
    await admin.from('factures').update({ statut: 'payee' }).eq('id', fs1[0].id)
    const f3 = await http(CA, `/api/crm/chantiers/${c.id}`)
    const s3 = Object.fromEntries(f3.corps.frise.pastilles.map((p) => [p.etape, p.etat]))
    T('L11 acompte réglé : Acompte fait, encaissé 360 €, reste à encaisser 840 €', s3.acompte === 'fait' && f3.corps.indicateurs.argent.encaisse === 36000 && f3.corps.indicateurs.argent.resteAEncaisser === 84000, JSON.stringify([s3, f3.corps.indicateurs.argent.resteAEncaisser]))
  } catch (e) {
    T('L erreur inattendue', false, e.message)
  } finally {
    let restes = 0
    for (const id of comptes) {
      const { error } = await admin.rpc('purger_compte_test', { p_id: id })
      if (error) console.log(`  ⚠️ purge ${id} : ${error.message}`)
      for (const t of ['devis', 'factures', 'chantiers', 'materiaux', 'chantier_materiaux']) { const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', id); restes += count ?? 0 }
      const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', id); restes += count ?? 0
    }
    T(`L12 nettoyage : les ${comptes.length} comptes de test et toutes leurs lignes sont supprimés`, restes === 0, `${restes} ligne(s) restent`)
  }
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
