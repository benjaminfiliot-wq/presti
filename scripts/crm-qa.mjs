#!/usr/bin/env node
// scripts/crm-qa.mjs — juge du CRM « atelier vivant », jalons J1 (API) et J2 (vues 2D), SANS base, SANS réseau, SANS compte.
//
//  A. VALIDATION (lib/crm/valider.ts) : champs inconnus, textes trop longs, dates inexistantes, identifiants, cibles.
//  B. ACCÈS (lib/crm/acces.ts + lib/plans.ts) : drapeau baissé → 404 AVANT la session ; session refusée → son statut ;
//     offre sans `crm` → 403 ; la capacité n'existe que sur Signature et Business.
//  C. PIPELINE (lib/crm/pipeline.ts) : chaque colonne déduite des vrais statuts (acompte, avoir, chantier, demande gagnée…),
//     déplacement manuel en vigueur puis périmé, lignes d'un autre compte ignorées. Résultats écrits ici à la main.
//  D. TÂCHES ET CHANTIER (lib/crm/chantier.ts) : génération depuis les lignes du devis (idempotente), avancement, retard,
//     boutons « Facturer » / « Notifier » (actifs seulement quand le chemin existant fait ce qu'ils annoncent).
//  E. TABLEAU DE BORD (lib/crm/tableau.ts) : chiffres écrits à la main ; « — » (null) sans donnée, vrai zéro avec ; les
//     chiffres partagés avec /chiffres sont ceux de lib/comptaTableau.ts (« deux chiffres, un écran »).
//  F. CLIENTS (lib/crm/clients.ts) : regroupement par lien, e-mail, téléphone, nom seul ; empreinte au lieu de l'adresse.
//  G. CODE : chaque route /api/crm/* passe par gardeCrm en première instruction ; chaque lecture/écriture par la clé de
//     service porte l'artisan de la session ; drapeau baissé partout (menu, page, Tarifs).
//  H. RENDU (react-dom/server) : tableau de bord vide = des « — », aucun chiffre ; rempli = les bons chiffres ; pipeline.
//  X. EXEMPLE (13/10) : l'atelier d'exemple couvre tout le CRM, ses vues sont cohérentes entre elles (calculées par
//     lib/crm/vue.ts comme un vrai compte), ses données sont fictives et AUCUNE écriture ne peut partir en mode exemple.
//  R. RGPD (audit du 12/10) : effacement d'une conversation dans le CRM, empreinte HMAC, durées et purges du CRM.
//
// Ce qu'il NE prouve PAS : la base réelle (voir scripts/crm-sql-qa.mjs pour la migration jouée dans un Postgres embarqué,
// et scripts/crm-e2e.mjs pour les routes contre une base de TEST).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-qa.mjs     Codes : 0 vert · 1 rouge
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const require = createRequire(import.meta.url)
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })

const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const V = await imp('lib/crm/valider.ts')
const { decisionAcces } = await imp('lib/crm/acces.ts')
const { peut, PLANS, GRILLE } = await imp('lib/plans.ts')
const P = await imp('lib/crm/pipeline.ts')
const C = await imp('lib/crm/chantier.ts')
const { calculerTableauCrm } = await imp('lib/crm/tableau.ts')
const { calculerCompta } = await imp('lib/comptaTableau.ts')
const { calculer } = await imp('lib/tableau-de-bord/calculer.ts')
const K = await imp('lib/crm/clients.ts')
// L'empreinte client est un HMAC à secret serveur (lib/crm/empreinte.ts) : un secret de test, posé AVANT le calcul.
process.env.PRESTI_SECRET_CRM = 'secret-de-test-crm-qa-'.padEnd(40, 'x')
const Em = await imp('lib/crm/empreinte.ts')
const idTest = (cle) => Em.empreinteClient(A_TEST, cle)

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
var A_TEST = 'art-A'

// ═══════════════════════ A. Validation ═══════════════════════
{
  const ok = V.validerCreationChantier({ titre: '  Salle de bain  ', date_debut: '2026-10-12', date_fin_prevue: '2026-10-20', equipe: [U(1), U(1).toUpperCase(), U(2)] })
  T('A1 création libre acceptée, titre nettoyé, équipe dédoublonnée', ok.ok && ok.valeur.titre === 'Salle de bain' && egal(ok.valeur.equipe, [U(1), U(2)]), JSON.stringify(ok))
  T('A2 champ inconnu refusé (pas ignoré)', !V.validerCreationChantier({ titre: 'x', artisan_id: U(9) }).ok)
  T('A3 sans titre ni devis : refusé', !V.validerCreationChantier({}).ok)
  T('A4 depuis un devis : le titre peut manquer', V.validerCreationChantier({ devis_id: U(3), generer_taches: true }).ok)
  T('A5 date inexistante refusée (31 février)', !V.validerCreationChantier({ titre: 'x', date_debut: '2026-02-31' }).ok)
  T('A6 fin prévue avant le début refusée', !V.validerCreationChantier({ titre: 'x', date_debut: '2026-10-12', date_fin_prevue: '2026-10-01' }).ok)
  T('A7 titre de 201 caractères refusé (pas tronqué)', !V.validerCreationChantier({ titre: 'é'.repeat(201) }).ok && V.validerCreationChantier({ titre: 'é'.repeat(200) }).ok)
  T('A8 statut inconnu refusé', !V.validerModificationChantier({ statut: 'fini' }).ok && V.validerModificationChantier({ statut: 'termine' }).ok)
  T('A9 le devis d’un chantier ne se change pas', !V.validerModificationChantier({ devis_id: U(4) }).ok)
  T('A10 modification vide refusée', !V.validerModificationChantier({}).ok)
  T('A11 identifiant mal formé refusé (injection)', !V.validerModificationChantier({ vehicule_id: "1' or '1'='1" }).ok)
  T('A12 caractère de contrôle refusé', !V.validerCreationChantier({ titre: 'abc\u0000def' }).ok)
  T('A13 équipe : 31 membres refusés', !V.validerCreationChantier({ titre: 'x', equipe: Array.from({ length: 31 }, (_, i) => U(i + 1)) }).ok)
  T('A14 tâche : libellé obligatoire ; « depuis_devis » seul', !V.validerCreationTache({}).ok && V.validerCreationTache({ depuis_devis: true }).ok && !V.validerCreationTache({ depuis_devis: true, libelle: 'x' }).ok)
  T('A15 tâche : ordre entier, quantité « 12,5 » lue 12.5', V.validerModificationTache({ quantite: '12,5' }).valeur?.quantite === 12.5 && !V.validerModificationTache({ ordre: 1.5 }).ok)
  T('A16 tâche : « faite » doit être un booléen', !V.validerModificationTache({ faite: 'oui' }).ok && V.validerModificationTache({ faite: true }).ok)
  const res = V.validerReservation({ materiau_id: U(5), quantite: '3' })
  T('A17 réservation : lieu par défaut « atelier », quantité > 0', res.ok && res.valeur.lieu === 'atelier' && res.valeur.quantite === 3 && !V.validerReservation({ materiau_id: U(5), quantite: 0 }).ok)
  T('A18 réservation : sortir = { action: "sortir" } seul ; le matériau ne se change pas', V.validerModificationReservation({ action: 'sortir' }).ok && !V.validerModificationReservation({ action: 'sortir', quantite: 2 }).ok && !V.validerModificationReservation({ materiau_id: U(6) }).ok)
  T('A19 véhicule : immatriculation mise en capitales ; nom obligatoire à la création', V.validerVehicule({ nom: 'C1', immatriculation: 'ab-123-cd' }, true).valeur?.immatriculation === 'AB-123-CD' && !V.validerVehicule({}, true).ok && V.validerVehicule({ actif: false }, false).ok)
  T('A20 membre : rôle de la liste, téléphone plausible', V.validerMembre({ nom: 'A', role: 'apprenti', telephone: '06 12 34 56 78' }, true).ok && !V.validerMembre({ nom: 'A', role: 'patron' }, true).ok && !V.validerMembre({ nom: 'A', telephone: '<script>' }, true).ok)
  const e = 'a'.repeat(64)
  T('A21 note : UNE cible exactement', V.validerCreationNote({ texte: 'x', client: e }).ok && !V.validerCreationNote({ texte: 'x' }).ok && !V.validerCreationNote({ texte: 'x', client: e, chantier_id: U(1) }).ok)
  T('A22 note : la cible client est une empreinte, jamais une adresse', !V.validerCreationNote({ texte: 'x', client: 'client@test.invalid' }).ok)
  T('A23 note : 4 001 caractères refusés', !V.validerCreationNote({ texte: 'x'.repeat(4001), lead_id: U(1) }).ok)
  T('A24 déplacement : colonne de la liste, objet connu', V.validerDeplacement({ objet: 'devis', id: U(1), vers: 'paye' }).ok && !V.validerDeplacement({ objet: 'devis', id: U(1), vers: 'classe' }).ok && !V.validerDeplacement({ objet: 'facture', id: U(1), vers: 'paye' }).ok)
  const corps = await V.lireCorps(new Request('http://x', { method: 'POST', body: 'x'.repeat(40_000) }))
  const casse = await V.lireCorps(new Request('http://x', { method: 'POST', body: '{"a":' }))
  T('A25 corps trop grand → 413 ; JSON cassé → 400', !corps.ok && corps.statut === 413 && !casse.ok && casse.statut === 400)
}

// ═══════════════════════ B. Accès ═══════════════════════
{
  const sOk = { ok: true }
  const sKo = { ok: false, statut: 401, erreur: 'Non authentifié' }
  const d404 = decisionAcces({ drapeau: false, session: sKo, plan: 'signature' })
  T('B1 drapeau baissé → 404, même sans session (rien n’est dit)', !d404.ok && d404.statut === 404 && d404.erreur === null)
  T('B2 drapeau baissé → 404 même pour un Signature connecté', decisionAcces({ drapeau: false, session: sOk, plan: 'signature' }).statut === 404)
  T('B3 session refusée → 401', decisionAcces({ drapeau: true, session: sKo, plan: null }).statut === 401)
  T('B4 suspendu → 403 et son code', egal(decisionAcces({ drapeau: true, session: { ok: false, statut: 403, erreur: 'suspendu', code: 'suspendu' }, plan: 'signature' }), { ok: false, statut: 403, erreur: 'suspendu', code: 'suspendu' }))
  for (const plan of ['gratuit', 'essentiel', 'studio', null, 'inconnu']) {
    const d = decisionAcces({ drapeau: true, session: sOk, plan })
    T(`B5 offre ${plan} → 403 « Disponible avec l’offre Signature »`, !d.ok && d.statut === 403 && d.code === 'offre' && /Signature/.test(d.erreur), JSON.stringify(d))
  }
  for (const plan of ['signature', 'business']) T(`B6 offre ${plan} → accès`, decisionAcces({ drapeau: true, session: sOk, plan }).ok)
  // 02/11 (chantier 4) : l'offre Entreprise sur mesure reprend Signature, CRM compris.
  T('B7 la capacité crm : Signature, Entreprise et Business seulement', Object.keys(PLANS).filter((p) => peut(p, 'crm')).sort().join(',') === 'business,entreprise,signature')
  // 13/10 soir — drapeau levé : la grille annonce le CRM, en Signature SEULEMENT (une ligne, Essentiel et Studio à « — »).
  T('B8 la grille Tarifs annonce le CRM en Signature seulement (lignes de la capacité crm, cellules calculées depuis PLANS)', (() => { const l = GRILLE.filter((x) => x.capacites.includes('crm')); return l.length >= 1 && l.every((x) => x.flag === 'crm' && Object.keys(x.cellules).sort().join() === 'signature,studio' && x.cellules.studio === false && x.cellules.signature === true) })())
}

// ═══════════════════════ C. Pipeline ═══════════════════════
const A = 'art-A', B = 'art-B'
const dv = (id, statut, ttc, extra = {}) => ({ id, artisan_id: A, statut, total_ttc: ttc, objet: `Objet ${id}`, client_nom: `Client ${id}`, created_at: '2026-06-01T09:00:00Z', ...extra })
const fa = (id, devis_id, statut, ttc, extra = {}) => ({ id, artisan_id: A, devis_id, statut, total_ttc: ttc, date_emission: '2026-09-15', avoir_de: null, ...extra })
const ch = (id, devis_id, statut, extra = {}) => ({ id, artisan_id: A, devis_id, statut, titre: `Chantier ${id}`, cree_le: '2026-09-01T09:00:00Z', ...extra })
const LEADS = [
  { id: 'L1', artisan_id: A, statut: 'nouveau', nom_prospect: 'Prospect 1', created_at: '2026-10-10T09:00:00Z' },
  { id: 'L2', artisan_id: A, statut: 'perdu', created_at: '2026-09-10T09:00:00Z' },
  { id: 'L3', artisan_id: A, statut: 'gagne', created_at: '2026-09-11T09:00:00Z' },
  { id: 'L4', artisan_id: A, statut: 'nouveau', created_at: '2026-10-01T09:00:00Z' },
  { id: 'LB', artisan_id: B, statut: 'nouveau', created_at: '2026-10-01T09:00:00Z' },
]
const DEVIS = [
  dv('D1', 'brouillon', 300, { lead_id: 'L4' }),
  dv('D2', 'envoye', 900, { envoye_le: '2026-10-01T09:00:00Z', validite_jours: 30 }),
  dv('D3', 'refuse', 400),
  dv('D4', 'accepte', 1000, { accepte_le: '2026-10-05T09:00:00Z' }),
  dv('D5', 'accepte', 2000, { accepte_le: '2026-09-20T09:00:00Z' }),
  dv('D6', 'accepte', 1500, { accepte_le: '2026-10-01T09:00:00Z' }),
  dv('D7', 'accepte', 800, { accepte_le: '2026-08-01T09:00:00Z' }),
  dv('D8', 'accepte', 1200, { accepte_le: '2026-08-01T09:00:00Z' }),
  dv('D9', 'accepte', 500, { accepte_le: '2026-08-01T09:00:00Z' }),
  dv('D10', 'accepte', 700, { accepte_le: '2026-08-01T09:00:00Z' }),
  { ...dv('DB', 'accepte', 99999, { accepte_le: '2026-10-05T09:00:00Z' }), artisan_id: B },
]
const FACTURES = [
  fa('F5', 'D5', 'payee', 600, { acompte_pct: 30 }),            // acompte : ne couvre pas le devis
  fa('F7', 'D7', 'emise', 800),                                  // tout facturé, pas réglé
  fa('F8a', 'D8', 'payee', 360), fa('F8b', 'D8', 'payee', '840.00'), // tout réglé, en deux fois
  fa('F9', 'D9', 'payee', 500), fa('F9b', 'D9', 'emise', -500, { avoir_de: 'F9' }), // annulée par avoir : ni l'une ni l'autre
  fa('F4brouillon', 'D4', 'brouillon', 1000),                    // un brouillon ne compte jamais
  { ...fa('FB', 'D4', 'payee', 1000), artisan_id: B },          // la facture d'un AUTRE compte sur un id de devis de A
]
const CHANTIERS = [
  ch('C5', 'D5', 'en_cours', { date_fin_prevue: '2026-10-10' }),
  ch('C6', 'D6', 'termine', { date_fin_prevue: '2026-09-01' }),
  ch('C10', 'D10', 'annule'),
  ch('C11', null, 'en_cours', { date_fin_prevue: '2026-10-12', client_nom: 'Client dépannage' }),
  ch('C12', null, 'termine'),
  ch('C13', null, 'annule'),
]
const DEPLACEMENTS = [
  { artisan_id: A, objet: 'devis', objet_id: 'D4', vers: 'demande', etape_derivee: 'signe', cree_le: '2026-10-06T09:00:00Z' },
  { artisan_id: A, objet: 'devis', objet_id: 'D4', vers: 'chantier', etape_derivee: 'signe', cree_le: '2026-10-07T09:00:00Z' }, // le plus récent gagne
  { artisan_id: A, objet: 'devis', objet_id: 'D2', vers: 'signe', etape_derivee: 'demande', cree_le: '2026-09-30T09:00:00Z' },  // périmé
  { artisan_id: B, objet: 'devis', objet_id: 'D7', vers: 'paye', etape_derivee: 'a_facturer', cree_le: '2026-10-08T09:00:00Z' }, // autre compte
]
const ENTREES = () => ({ artisanId: A, leads: LEADS, devis: DEVIS, factures: FACTURES, chantiers: CHANTIERS, deplacements: DEPLACEMENTS })
{
  const toutes = P.cartes(ENTREES())
  const par = Object.fromEntries(toutes.map((c) => [c.id, c]))
  const attendu = { L1: 'demande', L2: 'classe', L3: 'signe', D1: 'demande', D2: 'devis_envoye', D3: 'classe', D4: 'chantier', D5: 'chantier', D6: 'a_facturer', D7: 'a_facturer', D8: 'paye', D9: 'signe', D10: 'signe', C11: 'chantier', C12: 'a_facturer', C13: 'classe' }
  const ecarts = Object.entries(attendu).filter(([id, e]) => par[id]?.etape !== e).map(([id, e]) => `${id}: ${par[id]?.etape} ≠ ${e}`)
  T('C1 chaque dossier dans la colonne attendue (16 cas écrits à la main)', ecarts.length === 0 && toutes.length === 16, ecarts.join(' · ') + ` (${toutes.length} cartes)`)
  T('C2 une demande qui a un devis n’a pas de carte à elle (L4 → carte de D1)', !par.L4 && par.D1.leadId === 'L4')
  T('C3 un chantier lié à un devis n’a pas de carte à lui (C5 → carte de D5)', !par.C5 && par.D5.chantierId === 'C5')
  T('C4 rien d’un autre compte (ni demande, ni devis, ni sa facture sur D4, ni son déplacement de D7)', !par.LB && !par.DB && par.D4.etapeDerivee === 'signe' && par.D7.etape === 'a_facturer' && !par.D7.manuel)
  T('C5 acompte réglé ≠ payé : D5 reste en Chantier', par.D5.etapeDerivee === 'chantier' && par.D5.preuve === 'chantier')
  T('C6 facture + avoir : ni l’une ni l’autre (D9 Signé)', par.D9.etapeDerivee === 'signe' && par.D9.preuve === 'devis_signe')
  T('C7 réglé en deux fois, « 840.00 » en texte : Payé', par.D8.etape === 'paye' && par.D8.preuve === 'paye')
  T('C8 tout facturé, pas réglé : À facturer « facturé, règlement attendu »', par.D7.preuve === 'facture_impayee' && P.LIBELLES_PREUVE[par.D7.preuve] === 'facturé, règlement attendu')
  T('C9 chantier annulé : le devis signé revient en Signé (D10)', par.D10.etape === 'signe')
  T('C10 demande marquée gagnée sans devis : Signé', par.L3.etape === 'signe' && par.L3.preuve === 'demande_gagnee')
  T('C11 déplacement manuel en vigueur : D4 en Chantier, marqué « à la main », statuts réels Signé', par.D4.etape === 'chantier' && par.D4.manuel && par.D4.etapeDerivee === 'signe')
  T('C12 déplacement périmé (les statuts ont bougé depuis) : ignoré', par.D2.etape === 'devis_envoye' && !par.D2.manuel)
  const sansDep = P.cartes({ ...ENTREES(), deplacements: [] })
  T('C13 sans déplacement : D4 en Signé', sansDep.find((c) => c.id === 'D4').etape === 'signe')
  // Le paiement arrive APRÈS un déplacement manuel : la réalité reprend la main.
  const payeEnsuite = P.cartes({ ...ENTREES(), factures: [...FACTURES, fa('F4', 'D4', 'payee', 1000)] }).find((c) => c.id === 'D4')
  T('C14 un paiement arrivé après le geste manuel l’emporte (D4 → Payé, plus « à la main »)', payeEnsuite.etape === 'paye' && !payeEnsuite.manuel)
  const p = P.pipeline(ENTREES())
  const comptes = Object.fromEntries(p.colonnes.map((c) => [c.etape, c.cartes.length]))
  T('C15 colonnes : 2 · 1 · 3 · 3 · 3 · 1, et 3 classés', egal(comptes, { demande: 2, devis_envoye: 1, signe: 3, chantier: 3, a_facturer: 3, paye: 1 }) && p.classes === 3 && !p.vide, JSON.stringify(comptes) + ' classes=' + p.classes)
  T('C16 montant d’une colonne, au centime (Signé : 500 + 700 = 1 200 €)', p.colonnes.find((c) => c.etape === 'signe').montant === 120000 && p.colonnes.find((c) => c.etape === 'chantier').montant === 300000)
  T('C17 l’ordre des colonnes est celui du plan', p.colonnes.map((c) => c.libelle).join(' → ') === 'Demande → Devis envoyé → Signé → Chantier → À facturer / encaisser → Payé') // 12/10 : la colonne contient aussi les factures émises non payées
  T('C18 compte vide : pipeline vide', P.pipeline({ artisanId: A, leads: [], devis: [], factures: [], chantiers: [], deplacements: [] }).vide)
  T('C19 artisanId vide : rien (jamais « tout le monde »)', P.cartes({ ...ENTREES(), artisanId: '' }).length === 0)
  // Recette du 12/10 : deux brouillons du même client (v1, v2) faisaient deux cartes et la colonne additionnait les deux.
  const brouillons = [
    dv('Bv1', 'brouillon', 3200, { lead_id: 'LB1', created_at: '2026-10-09T09:00:00Z' }), dv('Bv2', 'brouillon', 3450, { lead_id: 'LB1', created_at: '2026-10-11T09:00:00Z' }),
    dv('Bm1', 'brouillon', 100, { client_nom: 'Client Mu', client_email: 'mu@test.invalid', created_at: '2026-10-01T09:00:00Z' }), dv('Bm2', 'brouillon', 150, { client_nom: 'C. Mu', client_email: 'MU@test.invalid', created_at: '2026-10-02T09:00:00Z' }),
    dv('Bn1', 'brouillon', 10, { client_nom: 'Client Nu', created_at: '2026-10-01T09:00:00Z' }), dv('Bx', 'brouillon', 20, { client_nom: 'Client Xi', created_at: '2026-10-01T09:00:00Z' }),
    dv('Be1', 'envoye', 500, { lead_id: 'LB2', envoye_le: '2026-10-05T09:00:00Z' }), dv('Be2', 'brouillon', 600, { lead_id: 'LB2', created_at: '2026-10-06T09:00:00Z' }),
  ]
  const pb = P.pipeline({ artisanId: A, leads: [], devis: brouillons, factures: [], chantiers: [], deplacements: [] })
  const dem = pb.colonnes.find((c) => c.etape === 'demande')
  T('C20 brouillons d’un même client (même demande, même e-mail) : une carte, la plus récente, comptée une fois', egal(dem.cartes.map((c) => c.id).sort(), ['Be2', 'Bm2', 'Bn1', 'Bv2', 'Bx']) && dem.montant === 345000 + 15000 + 1000 + 2000 + 60000 && dem.cartes.find((c) => c.id === 'Bv2').autresBrouillons === 1, JSON.stringify(dem.cartes.map((c) => [c.id, c.montant, c.autresBrouillons])))
  T('C21 un devis ENVOYÉ compte toujours pour lui-même, à côté du brouillon suivant', pb.colonnes.find((c) => c.etape === 'devis_envoye').cartes.length === 1)
}

// ═══════════════════════ D. Tâches et chantier ═══════════════════════
{
  const lignes = [
    { id: 'l1', ordre: 2, designation: 'Pose  carrelage\n sol', quantite: '12,5', unite: 'm²' },
    { id: 'l2', ordre: 1, designation: 'Dépose', quantite: 1, unite: 'forfait' },
    { id: 'l3', ordre: 3, designation: '   ', quantite: 1 },
    { id: 'l4', ordre: 4, designation: 'x'.repeat(400), quantite: 0 },
  ]
  const n = C.tachesDepuisDevis(lignes, [{ devis_ligne_id: 'l2', ordre: 0 }])
  T('D1 une tâche par ligne nommée, sans celle qui existe déjà, à la suite (ordre 1, 2)', egal(n.map((t) => [t.devis_ligne_id, t.ordre]), [['l1', 1], ['l4', 2]]), JSON.stringify(n))
  T('D2 libellé resserré, quantité « 12,5 » → 12.5, unité gardée', n[0].libelle === 'Pose carrelage sol' && n[0].quantite === 12.5 && n[0].unite === 'm²')
  T('D3 libellé coupé à 300, quantité 0 → vide', [...n[1].libelle].length === 300 && n[1].quantite === null)
  T('D4 générer deux fois ne double rien', C.tachesDepuisDevis(lignes, [...n, { devis_ligne_id: 'l2', ordre: 0 }]).length === 0)
  T('D5 depuis zéro : ordre du devis (Dépose d’abord)', C.tachesDepuisDevis(lignes, [])[0].libelle === 'Dépose')
  T('D6 avancement : sans tâche « — » (null), 1/3 → 33 %', C.avancement([]).pct === null && C.avancement([{ faite: true }, { faite: false }, {}]).pct === 33)
  T('D7 retard : fin prévue passée de 2 j → 2 ; le jour même → 0 ; terminé → 0 ; sans date → null',
    C.joursDeRetard({ statut: 'en_cours', date_fin_prevue: '2026-10-10' }, '2026-10-12') === 2 &&
    C.joursDeRetard({ statut: 'en_cours', date_fin_prevue: '2026-10-12' }, '2026-10-12') === 0 &&
    C.joursDeRetard({ statut: 'termine', date_fin_prevue: '2026-01-01' }, '2026-10-12') === 0 &&
    C.joursDeRetard({ statut: 'en_cours', date_fin_prevue: null }, '2026-10-12') === null)
  const sansDevis = C.actionsChantier({ devis: null, factures: [], leadStatut: null })
  const envoye = C.actionsChantier({ devis: { id: 'D2', statut: 'envoye' }, factures: [], leadStatut: null })
  const signe = C.actionsChantier({ devis: { id: 'D4', statut: 'accepte', lead_id: 'L9' }, factures: [], leadStatut: 'gagne' })
  const acompte = C.actionsChantier({ devis: { id: 'D5', statut: 'accepte', lead_id: 'L9' }, factures: FACTURES, leadStatut: 'devis' })
  const annulee = C.actionsChantier({ devis: { id: 'D9', statut: 'accepte' }, factures: FACTURES, leadStatut: null })
  // 18/10 (audit de cohérence C3 corrigé) : après un acompte, le même chemin émet la facture du SOLDE (acomptes déduits).
  const complete = C.actionsChantier({ devis: { id: 'D7', statut: 'accepte' }, factures: FACTURES, leadStatut: null })
  T('D8 Facturer : désactivé sans devis, sur devis non signé, ou si une facture complète existe — et dit pourquoi ; après un acompte seul, actif pour le SOLDE',
    !sansDevis.facturer.actif && !envoye.facturer.actif && !complete.facturer.actif && /déjà facturé/.test(complete.facturer.raison) && [sansDevis, envoye, complete].every((a) => a.facturer.raison) && acompte.facturer.actif && acompte.facturer.solde === true)
  T('D9 Facturer : actif sur devis signé sans facture ; une facture annulée par avoir ne bloque pas', signe.facturer.actif && signe.facturer.raison === null && annulee.facturer.actif)
  T('D10 Notifier : actif seulement si la demande est gagnée (sinon il relancerait un client signé)', signe.notifier.actif && !acompte.notifier.actif && /relancerait/.test(acompte.notifier.raison) && !sansDevis.notifier.actif)
  const msg = C.messageNotification({ titre: 'Salle de bain', statut: 'en_cours', avancementPct: 40, dateDebut: '2026-10-01', dateFinPrevue: '2026-10-20' })
  T('D11 message préparé : vrai état (40 %, fin le 20/10/2026), aucune promesse inventée', /40 %/.test(msg) && /20\/10\/2026/.test(msg) && !/€|prix|garanti/i.test(msg))
}

// ═══════════════════════ E. Tableau de bord ═══════════════════════
const MAINTENANT = new Date('2026-10-12T10:00:00Z')
const MATERIAUX = [
  { id: 'M1', artisan_id: A, nom: 'Colle', unite: 'sac', seuil_alerte: 5, stock: [{ lieu: 'atelier', quantite: 3 }, { lieu: 'camion', quantite: '1' }] },
  { id: 'M2', artisan_id: A, nom: 'Vis', unite: 'boîte', seuil_alerte: 0, stock: [] },
  { id: 'M3', artisan_id: A, nom: 'Joint', unite: 'u', seuil_alerte: 2, stock: [{ lieu: 'atelier', quantite: 10 }] },
  { id: 'M4', artisan_id: A, nom: 'Silicone', unite: 'u', seuil_alerte: '1', stock: null },
  { id: 'MB', artisan_id: B, nom: 'Autre', unite: 'u', seuil_alerte: 9, stock: [] },
]
{
  const t = calculerTableauCrm({ artisanId: A, devis: DEVIS, factures: FACTURES, demandes: LEADS, chantiers: CHANTIERS, materiaux: MATERIAUX, maintenant: MAINTENANT })
  T('E1 signé ce mois : D4 (1 000) + D6 (1 500) = 2 devis, 2 500 € — le devis d’un autre compte ne compte pas', egal(t.signeMois, { nombre: 2, montant: 250000 }), JSON.stringify(t.signeMois))
  const compta = calculerCompta({ artisanId: A, factures: FACTURES, devis: DEVIS, demandes: LEADS, lignes: [], periode: 'mois', maintenant: MAINTENANT })
  T('E2 « deux chiffres, un écran » : signé et en attente = ceux de /chiffres (période « Ce mois »)', egal(t.signeMois, compta.devis.acceptes) && egal(t.devisEnAttente, compta.devis.enAttente))
  T('E3 devis en attente : D2 (envoyé il y a 11 j, valable 30) = 1, 900 €', egal(t.devisEnAttente, { nombre: 1, montant: 90000 }))
  const gestion = calculer({ artisanId: A, factures: FACTURES, devis: DEVIS, demandes: LEADS, maintenant: MAINTENANT })
  T('E4 relances dues : 1 (D2, > 7 j sans réponse), celles du calcul de gestion', t.relancesDues.nombre === 1 && t.relancesDues.nombre === gestion.aRelancer.total)
  T('E5 chantiers : 2 ouverts (C5, C11), 1 en retard (C5, 2 j), aucun sans date', t.chantiers.actifs === 2 && t.chantiers.enRetard.nombre === 1 && egal(t.chantiers.enRetard.liste[0], { id: 'C5', titre: 'Chantier C5', jours: 2 }) && t.chantiers.sansDate === 0, JSON.stringify(t.chantiers))
  T('E6 stock bas : Silicone (0/1) puis Colle (4/5) ; seuil 0 ignoré ; autre compte ignoré', t.stockBas.nombre === 2 && egal(t.stockBas.liste.map((m) => [m.id, m.reste, m.seuil]), [['M4', 0, 1], ['M1', 4, 5]]), JSON.stringify(t.stockBas))
  const vide = calculerTableauCrm({ artisanId: A, devis: [], factures: [], demandes: [], chantiers: [], materiaux: [], maintenant: MAINTENANT })
  T('E7 compte vide : toutes les cases à null (« — »), aucun zéro inventé', vide.signeMois === null && vide.devisEnAttente === null && vide.relancesDues === null && vide.chantiers === null && vide.stockBas === null)
  const zero = calculerTableauCrm({ artisanId: A, devis: [dv('Dz', 'accepte', 100, { accepte_le: '2026-01-05T09:00:00Z' })], factures: [], demandes: [], chantiers: [ch('Cz', null, 'termine')], materiaux: [{ id: 'Mz', artisan_id: A, nom: 'z', seuil_alerte: 1, stock: [{ quantite: 5 }] }], maintenant: MAINTENANT })
  T('E8 vrai zéro : des devis mais aucun signé ce mois → 0 ; aucun chantier ouvert → 0 en retard ; stock suivi au-dessus du seuil → 0', egal(zero.signeMois, { nombre: 0, montant: 0 }) && zero.chantiers.enRetard.nombre === 0 && zero.stockBas.nombre === 0)
  const sansDate = calculerTableauCrm({ artisanId: A, devis: [], factures: [], demandes: [], chantiers: [ch('Cs', null, 'en_cours')], materiaux: [], maintenant: MAINTENANT })
  T('E9 chantier ouvert sans fin prévue : retard inconnu (null), compté « sans date »', sansDate.chantiers.enRetard === null && sansDate.chantiers.sansDate === 1)
  T('E10 aucune valeur NaN / undefined dans le tableau', !/NaN|undefined|Infinity/.test(JSON.stringify(t)) && !JSON.stringify(t).includes('null,"montant"'))
}

// ═══════════════════════ F. Clients ═══════════════════════
{
  const devis = [
    { id: 'DA', artisan_id: A, client_nom: 'Client Alpha', client_email: 'alpha@test.invalid', lead_id: 'LA', created_at: '2026-09-01' },
    { id: 'DA2', artisan_id: A, client_nom: 'C. Alpha', client_email: ' ALPHA@test.invalid ', created_at: '2026-10-01' },
    { id: 'DB1', artisan_id: A, client_nom: 'Client Beta', created_at: '2026-08-01' },
    { id: 'DB2', artisan_id: A, client_nom: 'client  béta', created_at: '2026-08-02' },
    { id: 'DG', artisan_id: A, client_nom: 'Client Gamma', client_email: 'g1@test.invalid' },
    { id: 'DG2', artisan_id: A, client_nom: 'Client Gamma', client_email: 'g2@test.invalid' },
    { id: 'DN', artisan_id: A, client_nom: 'Client Gamma' },
    { id: 'DX', artisan_id: A },
    { id: 'DZ', artisan_id: B, client_nom: 'Client Alpha', client_email: 'alpha@test.invalid' },
  ]
  const leads = [
    { id: 'LA', artisan_id: A, nom_prospect: 'Alpha', contact: '06 12 34 56 78' },
    { id: 'LA2', artisan_id: A, nom_prospect: 'Quelqu’un', contact: '+33 6 12 34 56 78' },
  ]
  const factures = [{ id: 'FA', artisan_id: A, devis_id: 'DA', client_nom: 'Client Alpha' }]
  const chantiers = [{ id: 'CB', artisan_id: A, devis_id: 'DB1' }]
  const g = K.regrouperClients({ artisanId: A, devis, factures, leads, chantiers, idDe: idTest })
  T('F1 une référence mal formée ne trouve rien', K.trouverGroupe(g, 'nimporte-quoi') === null && K.trouverGroupe(g, 'd-DA') === null && K.trouverGroupe(g, 'x'.repeat(64)) === null)
  const de = (id) => g.find((x) => x.devis.includes(id) || x.leads.includes(id))
  const A1 = de('DA')
  T('F2 Alpha = son devis, sa demande (lien), sa facture (lien), le devis au même e-mail (casse ignorée), la demande au même téléphone (+33)', A1 && egal(A1.devis, ['DA', 'DA2']) && egal(A1.leads, ['LA', 'LA2']) && egal(A1.factures, ['FA']), JSON.stringify(A1))
  const { createHash } = await import('node:crypto')
  const ancien = createHash('sha256').update('presti-crm-client:e:alpha@test.invalid').digest('hex')
  T('F3 clé = l’e-mail, identifiant = son empreinte HMAC (64 hex, jamais l’adresse en clair, plus le sha-256 à préfixe fixe)', A1.cle === 'e:alpha@test.invalid' && /^[0-9a-f]{64}$/.test(A1.id) && A1.id === Em.empreinteClient(A, 'e:alpha@test.invalid') && !A1.id.includes('alpha') && A1.id !== ancien)
  T('F3b l’empreinte dépend de l’artisan et du secret serveur', Em.empreinteClient(A, 'e:x@y.fr') !== Em.empreinteClient(B, 'e:x@y.fr') && (() => { const avant = Em.empreinteClient(A, 'e:x@y.fr'); process.env.PRESTI_SECRET_CRM = 'un-autre-secret-de-test'.padEnd(40, 'y'); const apres = Em.empreinteClient(A, 'e:x@y.fr'); process.env.PRESTI_SECRET_CRM = 'secret-de-test-crm-qa-'.padEnd(40, 'x'); return avant !== apres })())
  const beta = de('DB1')
  T('F4 deux pièces sans e-mail au même nom (accents, espaces) : un seul client, avec son chantier', egal(beta.devis, ['DB1', 'DB2']) && egal(beta.chantiers, ['CB']) && beta.cle === 'n:client beta')
  T('F5 même nom, e-mails différents : deux clients ; le nom seul ne rejoint aucun des deux', de('DG') !== de('DG2') && de('DN') !== de('DG') && de('DN') !== de('DG2'))
  T('F6 une pièce sans nom ni contact n’a pas de fiche ; rien d’un autre compte', !g.some((x) => x.devis.includes('DX')) && !g.some((x) => x.devis.includes('DZ')) && g.length === 5, String(g.length))
  // Les références de pièce sont des uuid en vrai : on rejoue avec des uuid.
  const g2 = K.regrouperClients({ artisanId: A, devis: [{ id: U(1), artisan_id: A, client_nom: 'Client Delta', client_email: 'delta@test.invalid' }], factures: [{ id: U(2), artisan_id: A, devis_id: U(1) }], leads: [], chantiers: [{ id: U(3), artisan_id: A, devis_id: U(1) }], idDe: idTest })
  T('F8 retrouver par d-<uuid>, f-<uuid>, c-<uuid> et par l’empreinte', [`d-${U(1)}`, `f-${U(2)}`, `c-${U(3)}`, g2[0].id].every((r) => K.trouverGroupe(g2, r) === g2[0]) && K.trouverGroupe(g2, `l-${U(9)}`) === null)
  T('F9 téléphone : +33 et 0033 ramenés à 0 ; une adresse e-mail n’est pas un téléphone', K.cleTelephone('+33 6 12 34 56 78') === '0612345678' && K.cleTelephone('0033612345678') === '0612345678' && K.cleTelephone('a@b.fr') === null)
  // Audit RGPD du 12/10 (e) : deux demandes effacées (« (client supprimé) ») ne font jamais un faux client commun.
  const g3 = K.regrouperClients({ artisanId: A, devis: [], factures: [], chantiers: [], idDe: idTest, leads: [
    { id: 'E1', artisan_id: A, nom_prospect: '(client supprimé)', contact: null }, { id: 'E2', artisan_id: A, nom_prospect: '(client supprimé)', contact: null },
    { id: 'E3', artisan_id: A, nom_prospect: ' (client supprimé) ', contact: null },
  ] })
  T('F10 demandes effacées : aucune fiche, jamais regroupées entre elles', g3.length === 0 && K.cleNom('(client supprimé)') === null, JSON.stringify(g3))
  const g4 = K.regrouperClients({ artisanId: A, idDe: idTest, factures: [], chantiers: [], devis: [{ id: 'DE', artisan_id: A, lead_id: 'E4', client_nom: 'Client Epsilon', client_email: 'eps@test.invalid' }], leads: [{ id: 'E4', artisan_id: A, nom_prospect: '(client supprimé)', contact: null }] })
  T('F11 une demande effacée garde son devis envoyé (lien), sans que « (client supprimé) » devienne son nom', g4.length === 1 && egal(g4[0].leads, ['E4']) && g4[0].nom === 'Client Epsilon')
}

// ═══════════════════════ G. Code ═══════════════════════
// Les commentaires de ligne d'abord : un « /api/crm/* » écrit dans un commentaire ouvrirait sinon un faux bloc /* … */.
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const lister = (dir) => fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? lister(path.join(dir, e.name)) : [path.join(dir, e.name).replace(/\\/g, '/')])
{
  const routes = lister('app/api/crm').filter((f) => f.endsWith('route.ts'))
  T('G1 les routes attendues existent', ['vue', 'pipeline', 'chantiers', 'chantiers/[id]', 'chantiers/[id]/taches', 'chantiers/[id]/materiaux', 'taches/[id]', 'materiaux/[id]', 'vehicules', 'vehicules/[id]', 'equipe', 'equipe/[id]', 'notes', 'notes/[id]', 'clients', 'commandes', 'commandes/[id]', 'commandes/[id]/relancer'].every((r) => routes.includes(`app/api/crm/${r}/route.ts`)), routes.join(' '))
  const fautes = []
  let handlers = 0, exportes = 0
  for (const f of routes) {
    const src = lire(f)
    exportes += (src.match(/export async function /g) ?? []).length
    for (const m of src.replace(/\r\n/g, '\n').matchAll(/export async function (GET|POST|PATCH|DELETE|PUT|OPTIONS)\(([^)]*)\)\s*\{\n([^\n]*)\n([^\n]*)/g)) {
      handlers++
      if (!/^\s*const g = await gardeCrm\(req(, \{ drapeau: '(crmPieces|crmPlanning|crmApresChantier|crmSuivi|crmAtelierVivant|crmPointage)' \})?\)$/.test(m[3]) || !/^\s*if \('reponse' in g\) return g\.reponse$/.test(m[4])) fautes.push(`${f} ${m[1]}`)
    }
    if (/export (const|let|function) (?!GET|POST|PATCH|DELETE|runtime|dynamic|maxDuration)/.test(src)) fautes.push(`${f} : export non permis`)
  }
  T(`G2 chaque gestionnaire (${handlers}) commence par gardeCrm (drapeau, session, offre) et s’arrête s’il refuse`, handlers === exportes && handlers >= 44 && fautes.length === 0, fautes.join(' · ') + ` (${handlers}/${exportes})`)
  // Audit d'attaque du 12/10 : GET /api/crm/pipeline répondait 405 (Next.js, méthode absente) AVANT la garde, à un compte
  // hors essai qui devait recevoir 404. Chaque route sert maintenant les six méthodes, toutes par la garde, puis 405.
  const incompletes = routes.filter((f) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].some((m) => !lire(f).includes(`export async function ${m}(`)))
  T('G2b chaque route sert GET, POST, PUT, PATCH, DELETE et OPTIONS : une méthode absente répond APRÈS la garde (404 hors essai, 405 sinon)', incompletes.length === 0 && /export const nonPermise = \(permises: string\) => new NextResponse\(null, \{ status: 405/.test(lire('lib/crm/serveur.ts')), incompletes.join(' '))
  const gardeSrc = sansCommentaires(lire('lib/crm/serveur.ts'))
  T('G2c limite de débit par compte dans la garde (consommerLimite « crm:<uid> »), après l’essai, 429 au-delà', gardeSrc.includes('consommerLimite(`crm:${session.uid}`, LIMITE_DEBIT.max, LIMITE_DEBIT.fenetreSec)') && gardeSrc.indexOf('consommerLimite(') > gardeSrc.indexOf("ouvertPour('crm', session.uid)") && /if \(!libre\) return \{ reponse: erreur\([^\n]*429/.test(gardeSrc))
  // Chaque appel à la clé de service porte l'artisan de la session. Exception documentée : devis_lignes n'a pas d'artisan_id ;
  // ses deux lectures prennent un devis_id déjà relu AVEC le filtre de session (chantiers/route.ts : devis vérifié ;
  // chantiers/[id]/taches : devis relu `.eq('artisan_id', g.uid)`).
  const sansFiltre = []
  for (const f of [...routes, 'lib/crm/serveur.ts']) {
    const src = sansCommentaires(lire(f))
    const appels = [...src.matchAll(/supabaseAdmin\s*\.(from\('([a-z_]+)'\)|rpc\('([a-z_]+)')/g)]
    appels.forEach((m, i) => {
      const fin = appels[i + 1]?.index ?? src.length
      const bloc = src.slice(m.index, Math.min(fin, m.index + 700))
      const table = m[2] ?? m[3]
      if (table === 'devis_lignes') { if (!/\.eq\('devis_id', (devis\.id|champs\.devis_id)\)/.test(bloc)) sansFiltre.push(`${f} devis_lignes`) ; return }
      if (table === 'artisans') { if (!/\.eq\('id', (session|g)\.uid\)/.test(bloc)) sansFiltre.push(`${f} artisans`); return }
      // 18/10 (chronologie du client) : `messages` et `relances` n'ont pas de colonne artisan_id ; elles se lisent par les demandes
      // du client, elles-mêmes lues pour la session (chargerDossiers) : la borne est `.in('lead_id', c.leads)`.
      if (table === 'messages' || table === 'relances') { if (!/\.in\('lead_id', c\.leads\)/.test(bloc)) sansFiltre.push(`${f} ${table}`); return }
      if (m[3]) { if (!/p_artisan: g\.uid/.test(bloc)) sansFiltre.push(`${f} rpc ${table}`); return }
      if (!/\.eq\('artisan_id', (g\.)?uid\)|artisan_id: g\.uid/.test(bloc)) sansFiltre.push(`${f} ${table}@${m.index}`)
    })
  }
  T('G3 chaque lecture / écriture par la clé de service est bornée à l’artisan de la session', sansFiltre.length === 0, sansFiltre.join(' · '))
  const devisLignesChantier = lire('app/api/crm/chantiers/route.ts')
  T('G4 création depuis un devis : le devis est relu pour la session et doit être signé avant tout', /from\('devis'\)\.select\('id, statut, objet, numero'\)\.eq\('id', champs\.devis_id\)\.eq\('artisan_id', g\.uid\)/.test(devisLignesChantier) && /statut !== 'accepte'/.test(devisLignesChantier))
  const garde = sansCommentaires(lire('lib/crm/serveur.ts'))
  // 12/10 — l'essai par compte (lib/flags.ts ESSAIS) : enEssai AVANT la session, puis ouvertPour(uid) juste après elle, 404 sans corps.
  T('G5 la garde lit le drapeau AVANT la session, puis la liste d’essai sur l’uid, et répond 404 sans corps', garde.indexOf("enEssai('crm')") > 0 && garde.indexOf("enEssai('crm')") < garde.indexOf('authArtisan(req)') && garde.indexOf("ouvertPour('crm', session.uid)") > garde.indexOf('authArtisan(req)') && garde.indexOf("ouvertPour('crm', session.uid)") < garde.indexOf("from('artisans')") && /new NextResponse\(null, \{ status: 404/.test(garde))
  // 13/10 soir — drapeau LEVÉ sur décision de Benj : le CRM est ouvert au public (offre Signature), plus en essai par compte.
  T('G6 drapeau `crm` levé, et plus dans ESSAI', /^\s*crm: true,/m.test(lire('lib/flags.ts')) && !/ESSAI[^\n]*crm: true/.test(lire('lib/flags.ts')))
  T('G7 menu : l’entrée CRM n’existe que drapeau levé ou compte en essai', /\.\.\.\(enEssai\('crm'\) \? \[\{ key: 'crm', essai: 'crm'/.test(lire('app/AppShell.tsx')) && /\.filter\(\(it\) => !it\.essai \|\| essais\[it\.essai\] === true\)/.test(lire('app/AppShell.tsx')))
  T('G8 page /crm : 404 serveur drapeau baissé sans essai (layout)', /if \(!enEssai\('crm'\)\) notFound\(\)/.test(lire('app/crm/layout.tsx')))
  T('G9 aucune page publique (Tarifs, landing, comparatif) ne parle du CRM', !['app/tarifs', 'app/page.tsx', 'app/Comparatif.tsx', 'app/abonnement'].some((p) => {
    const abs = path.join(RACINE, p)
    const fichiers = fs.statSync(abs).isDirectory() ? lister(p).filter((f) => /\.tsx?$/.test(f)) : [p]
    return fichiers.some((f) => /\bCRM\b|\/crm\b/.test(sansCommentaires(lire(f))))
  }))
  const ui = [...lister('app/crm'), ...lister('lib/crm')].filter((f) => /\.(tsx?|css)$/.test(f))
  // 13/10 — l'EXEMPLE couvre tout le CRM (demande de Benj). Ses DONNÉES vivent dans lib/crm/exemple.ts SEULEMENT : aucun autre
  // fichier du CRM ne contient un nom fictif, une adresse .invalid, un négoce, un numéro de pièce d'exemple ou un « lorem » ;
  // seuls les écrans qui l'affichent l'importent ; le bandeau dit « données fictives, rien n'est enregistré » ; maquette en démo.
  const donneesFictives = ui.filter((f) => !/lib[\/]crm[\/]exemple\.ts$/.test(f) && /(?<!données )fictif|\.invalid|Négoce|Grossiste|lorem|Dupont|Martin\b|EX-2026|AA-00\d-AA/i.test(sansCommentaires(lire(f))))
  const importeurs = [...lister('app'), ...lister('lib')].filter((f) => /\.(tsx?|mjs)$/.test(f) && /from ['"](@\/lib\/crm\/exemple|\.\/exemple(\.ts)?)['"]/.test(lire(f)))
  const permis = ['app/crm/page.tsx', 'app/crm/FicheChantier.tsx', 'app/crm/clients/[ref]/page.tsx', 'app/atelier-demo/Demo.tsx']
  const pageCrm = lire('app/crm/page.tsx'), modeSrc = lire('app/crm/mode.tsx')
  T('G10 données d’exemple seulement dans lib/crm/exemple.ts ; importées seulement par les écrans qui l’affichent ; bandeau « fictives, rien n’est enregistré » ; maquette en mode démo',
    donneesFictives.length === 0 && importeurs.length === 4 && importeurs.every((f) => permis.includes(f)) && /Exemple : données fictives, rien n’est enregistré\./.test(modeSrc) && /\{BANDEAU_EXEMPLE\}/.test(pageCrm) && /<Atelier key="exemple" donnees=\{DONNEES_EXEMPLE\} demo onVue2D=\{versVue\}( mesure=\{mesure\})?( vue=\{vivant \? VUE_EXEMPLE : undefined\})? \/>/.test(pageCrm),
    [...donneesFictives, ...importeurs.filter((f) => !permis.includes(f)), `importeurs=${importeurs.length}`].join(' '))
  // Aucune écriture possible en exemple : le seul chemin réseau du CRM est appel() (plus la vérification d'accès, en GET),
  // et appel() refuse toute méthode autre que GET quand le mode est posé ; les pages le posent PENDANT le rendu.
  const fetchs = lister('app/crm').filter((f) => /\.tsx?$/.test(f) && /\bfetch\(/.test(sansCommentaires(lire(f))))
  const clientSrc = sansCommentaires(lire('app/crm/client.ts'))
  const gardeEcriture = "if (ecrituresBloquees && (init.method ?? 'GET').toUpperCase() !== 'GET') return"
  T('G10b le seul fetch du CRM est dans appel() (plus /api/essais en lecture) ; appel() refuse toute écriture en mode exemple AVANT le réseau ; les trois pages posent le mode pendant le rendu',
    egal(fetchs.sort(), ['app/crm/client.ts', 'app/crm/mode.tsx']) && /fetch\('\/api\/essais', \{ headers: \{ Authorization/.test(modeSrc) && !/method:/.test(sansCommentaires(modeSrc))
      && clientSrc.indexOf(gardeEcriture) > 0 && clientSrc.indexOf(gardeEcriture) < clientSrc.indexOf('await fetch(')
      && /bloquerEcritures\(exemple\)/.test(pageCrm) && /bloquerEcritures\(exemple !== false\)/.test(lire('app/crm/chantiers/[id]/page.tsx')) && /bloquerEcritures\(exemple !== false\)/.test(lire('app/crm/clients/[ref]/page.tsx')),
    fetchs.join(' '))
  const css = sansCommentaires(lire('app/crm/crm.css'))
  T('G11 CSS : jetons de la console seulement, aucun bleu ni violet, aucune couleur en dur', !/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|blue|purple|violet/i.test(css))
  T('G12 CSS : les transitions ne sont posées que hors « reduced-motion »', !/transition|animation/.test(css.split('@media (prefers-reduced-motion: no-preference)')[0]))
  const fiche = lire('app/crm/FicheChantier.tsx')
  T('G13 fiche chantier : les trois boutons sont là ; « Facturer » appelle POST /api/factures, « Notifier » POST /api/messages (chemins existants)', /Fiche complète/.test(fiche) && /Notifier le client/.test(fiche) && /'Facturer'/.test(fiche) && /appel<[^>]*>\('\/api\/factures', \{ method: 'POST', body: \{ devis_id: d\.id \} \}\)/.test(fiche) && /'\/api\/messages', \{ method: 'POST', body: \{ action: 'reply'/.test(fiche) && fs.existsSync(path.join(RACINE, 'app/api/factures/route.ts')) && fs.existsSync(path.join(RACINE, 'app/api/messages/route.ts')))
  T('G14 boutons désactivés : ils disent pourquoi (infobulle + texte lu par les lecteurs d’écran)', /disabled=\{!f\.actions\.facturer\.actif/.test(fiche) && /title=\{f\.actions\.facturer\.raison/.test(fiche) && /id="crm-raison-facturer"/.test(fiche) && /id="crm-raison-notifier"/.test(fiche))
  const mig = lire('supabase/migrations/0141_crm_atelier.sql')
  T('G15 migration : état d’application en tête, contrôles avec résultat attendu, RLS sur les 8 tables', /APPLIQUÉE en production/.test(mig.slice(0, 400)) && (mig.match(/\[\d+\]|\[false\]/g) ?? []).length >= 6 && (mig.match(/enable row level security/g) ?? []).length === 8)
  T('G16 le jumeau _A_COLLER_…_NU existe', fs.existsSync(path.join(RACINE, 'supabase/migrations/_A_COLLER_sql_editor_0141_NU.sql')))
}

// ═══════════════════════ H. Rendu ═══════════════════════
{
  const ts = require('typescript')
  const CACHE = path.join(RACINE, 'node_modules', '.cache', `crm-qa-${process.pid}`)
  fs.mkdirSync(CACHE, { recursive: true })
  const versFichier = (rel) => pathToFileURL(path.join(RACINE, rel)).href
  const transpiler = (rel, remplacer) => ts.transpileModule(lire(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: path.basename(rel) }).outputText
    .replace(/(from\s+)(['"])([^'"]+)\2/g, (m, a, q, spec) => `${a}${q}${remplacer(spec)}${q}`)
  // Le client navigateur de Supabase est remplacé par un objet vide : le rendu serveur n'appelle rien.
  // Le client navigateur de Supabase : un faux qui rend une session, et un `fetch` espion (X : aucune écriture en exemple).
  fs.writeFileSync(path.join(CACHE, 'supabase.mjs'), "export const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'jeton-de-test' } } }) } }\n")
  fs.writeFileSync(path.join(CACHE, 'navigation.mjs'), 'export const useRouter = () => ({ replace() {}, push() {} })\n')
  const libs = (spec) => spec === '@/lib/supabaseClient' ? './supabase.mjs' : spec === 'next/navigation' ? './navigation.mjs' : spec.startsWith('@/lib/') ? versFichier(`${spec.slice(2)}.ts`) : spec === './client' ? './client.mjs' : spec === './mode' ? './mode.mjs' : spec === './Frise' ? './Frise.mjs' : spec === './Rappels' ? './Rappels.mjs' : spec
  fs.writeFileSync(path.join(CACHE, 'client.mjs'), transpiler('app/crm/client.ts', libs))
  fs.writeFileSync(path.join(CACHE, 'mode.mjs'), transpiler('app/crm/mode.tsx', libs))
  fs.writeFileSync(path.join(CACHE, 'Tableau.mjs'), transpiler('app/crm/Tableau.tsx', libs))
  fs.writeFileSync(path.join(CACHE, 'Pipeline.mjs'), transpiler('app/crm/Pipeline.tsx', libs))
  fs.writeFileSync(path.join(CACHE, 'Frise.mjs'), transpiler('app/crm/Frise.tsx', libs))
  fs.writeFileSync(path.join(CACHE, 'Rappels.mjs'), transpiler('app/crm/Rappels.tsx', libs))
  const { renderToStaticMarkup } = require('react-dom/server')
  const { createElement } = require('react')
  const rendre = async (fichier, props) => renderToStaticMarkup(createElement((await import(pathToFileURL(path.join(CACHE, fichier)).href)).default, props))
  const aplatir = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()

  const vide = calculerTableauCrm({ artisanId: A, devis: [], factures: [], demandes: [], chantiers: [], materiaux: [], maintenant: MAINTENANT })
  const hv = await rendre('Tableau.mjs', { t: vide })
  const valeurs = [...hv.matchAll(/<span class="val tnum">([^<]*)<\/span>/g)].map((m) => m[1])
  T('H1 tableau vide : les six cases (dont « À encaisser », 18/10) affichent « — », aucun montant', valeurs.length === 6 && valeurs.every((v) => v === '—') && !/€/.test(aplatir(hv)), valeurs.join('|'))
  T('H2 tableau vide : pas un mot d’exemple, et il dit d’où viendront les chiffres', !/exemple|fictif|démo/i.test(hv) && /Aucun devis pour l’instant/.test(aplatir(hv)) && /Aucun chantier pour l’instant/.test(aplatir(hv)))
  const plein = calculerTableauCrm({ artisanId: A, devis: DEVIS, factures: FACTURES, demandes: LEADS, chantiers: CHANTIERS, materiaux: MATERIAUX, maintenant: MAINTENANT })
  const hp = aplatir(await rendre('Tableau.mjs', { t: plein }))
  const attendus = ['Signé ce mois 2 500 € 2 devis signés', 'Devis en attente 1 900 € envoyés', 'Relances dues 1', 'Chantiers en retard 1 2 chantiers ouverts', 'Stock bas 2', 'Chantier C5 2 j de retard', 'Silicone 0 / 1 u', 'Colle 4 / 5 sac']
  T('H3 tableau rempli : les chiffres écrits à la main sont à l’écran', attendus.every((s) => hp.includes(s)), attendus.filter((s) => !hp.includes(s)).join(' | ') + ' ⟶ ' + hp.slice(0, 400))
  T('H4 aucun NaN / undefined à l’écran', !/NaN|undefined|Infinity/.test(hp))
  const pv = aplatir(await rendre('Pipeline.mjs', { p: P.pipeline({ artisanId: A, leads: [], devis: [], factures: [], chantiers: [], deplacements: [] }), onChange: () => {} }))
  T('H5 pipeline vide : un état vide qui explique, aucune carte', /Aucun dossier pour l’instant/.test(pv) && !/Déplacer vers/.test(pv))
  const hpipe = await rendre('Pipeline.mjs', { p: P.pipeline(ENTREES()), onChange: () => {} })
  const tp = aplatir(hpipe)
  T('H6 pipeline : six colonnes dans l’ordre, la carte déplacée le dit, les classés sont comptés', (hpipe.match(/<section class="crm-col"/g) ?? []).length === 6 && /Déplacé à la main · statuts réels : Signé/.test(tp) && /3 dossiers classés/.test(tp) && /data-crm-carte="devis:D4"/.test(hpipe))
  T('H7 pipeline : chaque carte a sa liste « Déplacer vers » étiquetée pour les lecteurs d’écran', (hpipe.match(/Déplacer vers…/g) ?? []).length === 13 && (hpipe.match(/class="crm-sr"/g) ?? []).length === 13)

  // ═══════════════════════ X. Exemple : tout le CRM, cohérent, sans écriture possible ═══════════════════════
  const E = await imp('lib/crm/exemple.ts')
  const { construireVue } = await imp('lib/crm/vue.ts')
  const V = E.VUE_EXEMPLE
  const ids = (l) => l.map((x) => x.id).sort()
  T('X1 l’exemple remplit chaque onglet : tableau, pipeline, chantiers, clients, équipe, atelier', V.tableau.signeMois?.nombre > 0 && !V.pipeline.vide && V.pipeline.colonnes.every((c) => c.cartes.length > 0) && V.chantiers.length >= 8 && V.clients.length >= 10 && E.EQUIPE_EXEMPLE.membres.length > 0 && E.EQUIPE_EXEMPLE.vehicules.length > 0 && V.atelier.materiaux.length > 0 && V.devisSignesSansChantier.length > 0,
    JSON.stringify(V.pipeline.colonnes.map((c) => c.cartes.length)))
  T('X2 cohérent entre les vues : l’atelier, la liste et le pipeline portent les MÊMES chantiers ; chaque chantier a sa fiche, chaque client la sienne',
    egal(ids(V.atelier.chantiers), ids(V.chantiers)) && V.chantiers.every((c) => E.ficheChantierExemple(c.id)?.chantier.titre === c.titre) && V.clients.every((c) => E.ficheClientExemple(c.id)?.client.nom === c.nom)
      && V.pipeline.colonnes.flatMap((c) => c.cartes).filter((k) => k.chantierId).every((k) => V.chantiers.some((c) => c.id === k.chantierId)))
  const ficheA = E.ficheClientExemple(V.clients.find((c) => c.nom === 'Client fictif A').id)
  const carteA = V.pipeline.colonnes.flatMap((c) => c.cartes).find((k) => k.client === 'Client fictif A')
  T('X3 mêmes montants partout : le devis du client A vaut la même chose dans le pipeline, sa fiche client et sa fiche chantier', ficheA && carteA && ficheA.signe === carteA.montant && E.ficheChantierExemple(carteA.chantierId).devis.total_ttc * 100 === carteA.montant, JSON.stringify({ signe: ficheA?.signe, carte: carteA?.montant }))
  T('X4 « deux chiffres, un écran » : le tableau de l’exemple est celui que calcule lib/crm/tableau.ts sur ses lignes : 4 devis signés en octobre (11 190 €), 2 chantiers en retard, 1 relance', V.tableau.signeMois.nombre === 4 && V.tableau.signeMois.montant === 1119000 && V.tableau.chantiers.enRetard.nombre === 2 && V.tableau.relancesDues.nombre === 1, JSON.stringify(V.tableau.signeMois))
  T('X5 le pipeline de l’exemple montre le correctif des brouillons : deux versions pour « Prospect fictif 3 », une seule carte, un seul montant', (() => { const k = V.pipeline.colonnes[0].cartes.filter((c) => c.client === 'Prospect fictif 3'); return k.length === 1 && k[0].autresBrouillons === 1 && k[0].montant === 345000 })())
  const json = JSON.stringify([V, E.EQUIPE_EXEMPLE, V.chantiers.map((c) => E.ficheChantierExemple(c.id)), V.clients.map((c) => E.ficheClientExemple(c.id))])
  const courriels = [...json.matchAll(/[\w.+-]+@[\w.-]+/g)].map((m) => m[0])
  const telephones = json.match(/(?<![0-9a-f-])0[1-9](?:[ .]?\d{2}){4}(?![0-9a-f])|\+33/g) ?? []
  T('X6 données clairement fictives : chaque e-mail en .invalid, aucun numéro de téléphone, chaque client « fictif / fictive »', courriels.length > 0 && courriels.every((e) => e.endsWith('.invalid')) && telephones.length === 0 && V.clients.every((c) => /fictif|fictive/.test(c.nom)), [...courriels.filter((e) => !e.endsWith('.invalid')), ...telephones, ...V.clients.filter((c) => !/fictif|fictive/.test(c.nom)).map((c) => c.nom)].join(' '))
  const recalculee = (await import(pathToFileURL(path.join(RACINE, 'lib/crm/exemple.ts')).href + '?bis')).VUE_EXEMPLE
  const a7 = JSON.stringify(recalculee), b7 = JSON.stringify(V)
  let i7 = 0; while (i7 < a7.length && a7[i7] === b7[i7]) i7++
  T('X7 l’exemple est figé (12/10/2026, 10 h 30) : le recalculer donne la même vue, octet pour octet', typeof construireVue === 'function' && E.MAINTENANT_EXEMPLE === '2026-10-12T08:30:00.000Z' && V.tableau.jour === '2026-10-12' && a7 === b7, `${a7.slice(i7 - 80, i7 + 60)} ≠ ${b7.slice(i7 - 80, i7 + 60)}`)
  // Aucune écriture : appel() en mode exemple ne touche jamais au réseau, quelle que soit la méthode.
  const clientMod = await import(pathToFileURL(path.join(CACHE, 'client.mjs')).href)
  const vrai = globalThis.fetch
  const parties = []
  globalThis.fetch = async (url, init) => { parties.push(`${init?.method ?? 'GET'} ${url}`); return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }) }
  clientMod.bloquerEcritures(true)
  const refus = []
  for (const [m, url] of [['POST', '/api/crm/chantiers'], ['PATCH', '/api/crm/taches/x'], ['DELETE', '/api/crm/chantiers/x'], ['PUT', '/api/crm/vue'], ['post', '/api/factures'], ['POST', '/api/messages'], ['POST', '/api/crm/pipeline'], ['POST', '/api/crm/notes'], ['DELETE', '/api/crm/equipe/x']]) refus.push(await clientMod.appel(url, { method: m, body: {} }))
  const lecture = await clientMod.appel('/api/crm/vue')
  clientMod.bloquerEcritures(false)
  const ecriture = await clientMod.appel('/api/crm/notes', { method: 'POST', body: {} })
  globalThis.fetch = vrai
  T('X8 mode exemple : POST, PUT, PATCH, DELETE (CRM, factures, messages) refusés AVANT le réseau, avec le message « rien n’est envoyé »', refus.every((r) => !r.ok && r.code === 'exemple' && /rien n’est envoyé/.test(r.erreur) && !clientMod.estErreur(r)) && egal(parties.slice(0, 1), ['GET /api/crm/vue']), parties.join(' | '))
  T('X9 … la lecture reste possible, et hors exemple l’écriture repart normalement', lecture.ok && ecriture.ok && egal(parties, ['GET /api/crm/vue', 'POST /api/crm/notes']), parties.join(' | '))
  // Rendu en exemple : les liens vers les écrans hors CRM sont inertes (ils ouvriraient les vraies données).
  const modeMod = await import(pathToFileURL(path.join(CACHE, 'mode.mjs')).href)
  const Tab = (await import(pathToFileURL(path.join(CACHE, 'Tableau.mjs')).href)).default
  const hx = renderToStaticMarkup(createElement(modeMod.ModeExemple, { actif: true }, createElement(Tab, { t: V.tableau })))
  T('X10 tableau de l’exemple : aucun lien vers /devis, /chiffres, /inventaire ; les retards mènent aux fiches d’exemple', !/href="\/(devis|chiffres|inventaire)/.test(hx) && /crm-lien-inerte/.test(hx) && /href="\/crm\/chantiers\/[0-9a-f-]{36}\?exemple=1"/.test(hx) && /de l’exemple/.test(aplatir(hx)))
  T('X11 liens en exemple : une fiche CRM garde le mode, tout autre écran est fermé', modeMod.lienExemple('/crm/chantiers/abc') === '/crm/chantiers/abc?exemple=1' && modeMod.lienExemple('/crm?vue=clients') === '/crm?vue=clients&exemple=1' && [ '/devis/x', '/factures', '/messages', '/inventaire', 'https://www.google.com/maps/dir/?api=1&destination=x', '/crmx' ].every((h) => modeMod.lienExemple(h) === null))
  fs.rmSync(CACHE, { recursive: true, force: true })
}

// ═══════════════════════ I. Atelier (lib/crm/atelier.ts) ═══════════════════════
{
  const At = await imp('lib/crm/atelier.ts')
  const ch = (id, statut, etape, extra = {}) => ({ id, titre: `Chantier ${id}`, client: null, statut, etape, avancement: null, date_debut: null, date_fin_prevue: null, vehicule_id: null, equipe: [], ...extra })
  const mat = (id, categorie, reste, seuil, extra = {}) => ({ id, nom: `Matériau ${id}`, unite: 'u', categorie, reste, seuil, fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null, ...extra })
  const D = {
    jour: '2026-10-12', metier: 'Plombier chauffagiste',
    chantiers: [
      ch('c1', 'en_cours', 'chantier', { date_fin_prevue: '2026-10-10', vehicule_id: 'v1', equipe: ['m1'] }), // en retard, aujourd'hui
      ch('c2', 'termine', 'a_facturer'), ch('c3', 'planifie', 'chantier', { date_debut: '2026-10-12' }), ch('c4', 'annule', 'classe'),
      ch('c5', 'termine', 'paye'), ch('c6', 'a_planifier', 'chantier'),
    ],
    materiaux: [mat('a', 'Raccords', 2, 5, { fournisseur: 'F1', prix_vu_ht: 2, prix_vu_le: '2026-08-01' }), mat('b', 'Raccords', 9, 5), mat('c', null, 0, 1), mat('d', 'Tubes', 3, 0)],
    vehicules: [{ id: 'v1', nom: 'V1', immatriculation: 'AB-1', conducteur_id: null, controle_technique_le: null, entretien_le: null, actif: true }, { id: 'v2', nom: 'V2', immatriculation: null, conducteur_id: null, controle_technique_le: null, entretien_le: null, actif: false }],
    membres: [{ id: 'm1', nom: 'M1', role: 'artisan', actif: true }, { id: 'm2', nom: 'M2', role: 'apprenti', actif: true }, { id: 'm3', nom: 'M3', role: 'compagnon', actif: false }],
    demandes: [{ id: 'l1', titre: 'D1', client: null, recue_le: '2026-10-12' }, { id: 'l2', titre: 'D2', client: null, recue_le: '2026-10-01' }],
  }
  const sc = At.construireScene(D)
  const par = (t) => sc.objets.filter((o) => o.type === t)
  T('I1 un bâtiment par chantier ouvert ou à facturer ; ni annulé ni payé', egal(par('chantier').map((o) => o.ref), ['c1', 'c2', 'c3', 'c6']))
  T('I2 une camionnette par véhicule ACTIF, un personnage par membre ACTIF', egal(par('vehicule').map((o) => o.ref), ['v1']) && egal(par('membre').map((o) => o.ref), ['m1', 'm2']))
  T('I3 un rayonnage par catégorie (sans catégorie comprise), triés', egal(par('categorie').map((o) => o.ref), ['Raccords', 'Sans catégorie', 'Tubes']))
  T('I4 un rayonnage sous son seuil pulse ; seuil 0 = pas suivi', sc.pulse.filter((p) => sc.objets[p.o]?.type === 'categorie').length === 2 && par('categorie').find((o) => o.ref === 'Tubes').etat.stockBas === false && par('categorie').find((o) => o.ref === 'Raccords').etat.stockBas)
  T('I5 accueil : un colis par demande, celle du jour allume « Aujourd’hui »', par('accueil')[0].etat.aujourdhui && /2 nouvelles demandes/.test(par('accueil')[0].detail))
  const c1 = par('chantier').find((o) => o.ref === 'c1')
  T('I6 chantier en retard : épingle corail foncé, « En retard · 2 j », allumé « Aujourd’hui » et « En retard »', c1.epingle === At.COULEURS.corailFonce && /En retard · 2 j/.test(c1.detail) && c1.etat.retard && c1.etat.aujourdhui)
  T('I7 terminé à facturer : épingle verte, filtre « À facturer »', par('chantier').find((o) => o.ref === 'c2').epingle === At.COULEURS.vert)
  T('I8 la camionnette du chantier du jour et le membre posté dessus sont « aujourd’hui »', par('vehicule')[0].etat.aujourdhui && par('membre').find((o) => o.ref === 'm1').etat.aujourdhui && !par('membre').find((o) => o.ref === 'm2').etat.aujourdhui)
  const f = (k) => [...At.objetsAllumes(sc.objets, k)].map((i) => sc.objets[i].cle).sort()
  T('I9 filtres : En retard = c1 ; À facturer = c2 ; Stock bas = Raccords et Sans catégorie ; sans filtre = tout', egal(f('retard'), ['chantier:c1']) && egal(f('a_facturer'), ['chantier:c2']) && egal(f('stock_bas'), ['categorie:Raccords', 'categorie:Sans catégorie']) && At.objetsAllumes(sc.objets, null).size === sc.objets.length)
  T('I10 « Aujourd’hui » : c1, c3 (commence ce jour), la camionnette, le membre, l’accueil', egal(f('aujourdhui'), ['accueil', 'chantier:c1', 'chantier:c3', 'membre:m1', 'vehicule:v1']))
  T('I11 même données → même maquette (stable) ; toute instance porte un objet existant ou -1', JSON.stringify(At.construireScene(D)) === JSON.stringify(sc) && At.FORMES.every((k) => sc.instances[k].every((it) => it.o >= -1 && it.o < sc.objets.length)))
  T('I12 aucune couleur hors palette maquette : ni bleu, ni rouge vif', At.FORMES.flatMap((k) => sc.instances[k]).every((it) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(it.c.slice(i, i + 2), 16)); return !(b > r + 25 && b > g) && !(r > 200 && g < 80 && b < 80) }))
  T('I13 préréglage par métier : « Plombier chauffagiste » → chauffagiste ; inconnu → général ; chaque préréglage change les accessoires', At.prereglageDe('Plombier chauffagiste') === 'chauffagiste' && At.prereglageDe('Électricien') === 'electricien' && At.prereglageDe('Fleuriste') === 'general' && new Set(At.PREREGLAGES.map((p) => JSON.stringify(At.accessoires(p)))).size === At.PREREGLAGES.length)
  const vide = At.construireScene({ jour: '2026-10-12', metier: null, chantiers: [], materiaux: [], vehicules: [], membres: [], demandes: [] })
  T('I14 atelier vide : ni maison, ni camionnette, ni rayonnage, ni colis — rien d’inventé', vide.objets.every((o) => o.type === 'accueil' || o.type === 'bureau') && vide.pulse.length === 0 && /Aucune nouvelle demande/.test(vide.objets[0].detail))
  const beaucoup = At.construireScene({ ...D, chantiers: Array.from({ length: 40 }, (_, i) => ch(`x${i}`, 'en_cours', 'chantier')), materiaux: Array.from({ length: 14 }, (_, i) => mat(`m${i}`, `Cat ${String(i).padStart(2, '0')}`, 1, 0)) })
  T('I15 au-delà des emplacements : 30 maisons, 10 rayonnages, et le reste DIT (horsScene)', beaucoup.objets.filter((o) => o.type === 'chantier').length === 30 && beaucoup.horsScene.chantiers === 10 && beaucoup.objets.filter((o) => o.type === 'categorie').length === 10 && beaucoup.horsScene.categories === 4)
  const places = At.emplacementsChantiers(30)
  T('I16 les maisons ne mordent ni sur le dépôt, ni sur le parking, et ne se chevauchent pas', places.every(([x, , z]) => x < At.DEPOT.x0 - 2.6 || x > At.PARKING.x1 + 2.6 || z < At.DEPOT.z0 - 2.6 || z > At.DEPOT.z1 + 3.4) && places.every((a, i) => places.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[2] - b[2]) >= 5.5)))
  const cmd = At.preparerCommande(D.materiaux, D.jour)
  T('I17 commande : ce qui est sous le seuil, par fournisseur ; quantité = de quoi revenir au double du seuil ; « à choisir » en dernier', egal(cmd.map((c) => [c.fournisseur, c.lignes.map((l) => [l.materiau_id, l.quantite])]), [['F1', [['a', 8]]], ['Fournisseur à choisir', [['c', 2]]]]))
  T('I18 commande : un prix vu de plus de 30 jours est « à revérifier »', cmd[0].lignes[0].prixAVerifier === true)
  const txt = At.texteCommande(cmd[0], { a: 12 }, null)
  T('I19 texte de commande : la quantité changée par l’artisan, aucun prix ni promesse', /- 12 u · Matériau a/.test(txt) && !/€|prix/i.test(txt))
  const as = At.assemblerAtelier({
    jour: '2026-10-12', metier: 'Maçon',
    chantiers: [{ id: 'k1', titre: 'K1', statut: 'en_cours', date_debut: null, date_fin_prevue: null, vehicule_id: null, client_nom: 'Sans devis' }],
    cartes: [{ objet: 'chantier', id: 'k1', etape: 'chantier', titre: 'K1', client: 'Client K', chantierId: 'k1', depuis: null }, { objet: 'lead', id: 'q1', etape: 'demande', titre: 'Q1', client: 'P', chantierId: null, depuis: '2026-10-11T22:30:00Z' }, { objet: 'lead', id: 'q2', etape: 'classe', titre: 'Q2', client: null, chantierId: null, depuis: null }],
    taches: [{ chantier_id: 'k1', faite: true }, { chantier_id: 'k1', faite: false }], equipe: [{ chantier_id: 'k1', membre_id: 'm1' }],
    materiaux: [{ id: 'z', nom: 'Z', unite: null, categorie: null, seuil_alerte: '2', stock: [{ quantite: '1.5' }, { quantite: 1 }], fournisseur: [{ nom: 'F', contact: 'f@test.invalid' }] }],
    vehicules: [], membres: [],
  })
  T('I20 assemblage : étape et client depuis le pipeline, avancement 50 %, équipe, stock additionné, fournisseur (objet ou tableau)', as.chantiers[0].etape === 'chantier' && as.chantiers[0].client === 'Client K' && as.chantiers[0].avancement === 50 && egal(as.chantiers[0].equipe, ['m1']) && as.materiaux[0].reste === 2.5 && as.materiaux[0].seuil === 2 && as.materiaux[0].fournisseur === 'F' && as.materiaux[0].fournisseur_contact === 'f@test.invalid')
  T('I21 assemblage : seules les demandes sans devis en « Demande » vont à l’accueil, datées au jour de PARIS (22 h 30 UTC le 11 = le 12)', egal(as.demandes, [{ id: 'q1', titre: 'Q1', client: 'P', recue_le: '2026-10-12' }]))
  const scene3d = lire('app/crm/atelier/Scene3D.tsx'), atl = lire('app/crm/atelier/Atelier.tsx'), page = lire('app/crm/page.tsx')
  // 19/10 : la maquette du chantier (lot 5, app/crm/atelier/SceneChantier.tsx) est chargée à la demande elle aussi, par PlanChantier.
  T('I22 la 3D est chargée à la demande (next/dynamic, ssr: false) et seules Scene3D.tsx et SceneChantier.tsx importent three / @react-three', /dynamic\(\(\) => import\('\.\/Scene3D'\), \{\s*ssr: false/.test(atl) && lire('app/crm/PlanChantier.tsx').includes("dynamic(() => import('./atelier/SceneChantier'), { ssr: false") && /from '@react-three\/fiber'/.test(scene3d) && [...lister('app'), ...lister('lib')].filter((f) => /\.(tsx?|mjs)$/.test(f) && !f.endsWith('Scene3D.tsx') && !f.endsWith('SceneChantier.tsx')).every((f) => !/from ['"](three|@react-three\/[a-z]+|three-stdlib)['"]/.test(lire(f))))
  T('I23 repli 2D automatique : WebGL absent, réduire les animations, téléphone, batterie faible, erreur de rendu', /getContext\('webgl2'\)/.test(atl) && /prefers-reduced-motion: reduce/.test(atl) && /innerWidth < 760/.test(atl) && /getBattery/.test(atl) && /class GardeRendu/.test(atl))
  T('I24 l’onglet Atelier est le seul à monter la maquette', /onglet === 'atelier' && \(\(\) => \{/.test(page) && (page.match(/<Atelier /g) ?? []).length === 2 && page.indexOf('<Atelier ') > page.indexOf("onglet === 'atelier'") && page.indexOf('<Atelier ') < page.indexOf("onglet === 'tableau'"))
  T('I25 un maillage instancié par forme (≤ 150 appels de dessin par construction)', /FORMES\.map\(\(f\) => \(\s*<Couche/.test(scene3d) && /<instancedMesh/.test(scene3d))
  const cssA = sansCommentaires(lire('app/crm/atelier/atelier.css'))
  T('I26 CSS de l’atelier : jetons seulement, ni bleu ni violet, transitions hors « reduced-motion » seulement', !/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|blue|purple|violet/i.test(cssA) && !/transition|animation:/.test(cssA.split('@media (prefers-reduced-motion: no-preference)')[0]))
}

// ═══════════════════════ R. RGPD du CRM (audit du 12/10) et recette ═══════════════════════
{
  const Ef = await imp('lib/crm/effacement.ts')
  const { DUREES_MOIS } = await imp('lib/legalArtisan.ts')
  const idDe = (cle) => Em.empreinteClient(A, cle)
  const devis = [
    { id: 'Dr1', artisan_id: A, lead_id: 'Lr', statut: 'accepte', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
    { id: 'Dr2', artisan_id: A, lead_id: null, statut: 'brouillon', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
  ]
  const leads = [{ id: 'Lr', artisan_id: A, nom_prospect: 'Client Rho', contact: 'rho@test.invalid' }, { id: 'Ls', artisan_id: A, nom_prospect: 'Client Sigma', contact: null }]
  const chantiers = [
    { id: 'Cr1', artisan_id: A, devis_id: 'Dr1', client_nom: 'Client Rho' },  // devis signé : le nom reste
    { id: 'Cr2', artisan_id: A, devis_id: 'Dr2', client_nom: 'Client Rho' },  // devis brouillon : le nom part
    { id: 'Cr3', artisan_id: A, devis_id: null, client_nom: 'client rho' },   // dépannage au même nom : le nom part
    { id: 'Cr4', artisan_id: A, devis_id: null, client_nom: 'Client Tau' },   // un autre : intact
  ]
  const groupes = K.regrouperClients({ artisanId: A, devis, factures: [], leads, chantiers, idDe })
  const choix = Ef.choisirEffacementCrm({ groupes, leadId: 'Lr', nomDemande: 'Client Rho', chantiers, devis })
  T('R1 effacement : l’empreinte du client est calculée AVANT (celle de son groupe) ; nom effacé sur ses chantiers sans devis envoyé seulement', choix.cleClient === idDe('e:rho@test.invalid') && egal(choix.chantiersSansNom, ['Cr2', 'Cr3']), JSON.stringify(choix))
  const route = sansCommentaires(lire('app/api/donnees/route.ts'))
  const iPost = route.indexOf('export async function POST')
  T('R2 la route d’effacement lit le CRM AVANT d’anonymiser, supprime les notes du client ET de la demande, efface les noms, et n’efface RIEN si le CRM est illisible',
    route.indexOf('const crm = await impactCrm(uid, lead)', iPost) > 0 && route.indexOf('const crm = await impactCrm(uid, lead)', iPost) < route.indexOf("from('leads').update(", iPost)
      && /from\('crm_notes'\)\.delete\(\)\.eq\('artisan_id', uid\)\.eq\('client_cle', crm\.cleClient\)/.test(route) && /from\('crm_notes'\)\.delete\(\)\.eq\('artisan_id', uid\)\.eq\('lead_id', leadId\)/.test(route)
      && /from\('chantiers'\)\.update\(\{ client_nom: null/.test(route) && /if \(!crm\) return NextResponse\.json\(\{ error: 'Votre CRM n’a pas pu être lu : rien n’a été effacé/.test(route) && /nom_prospect: NOM_EFFACE/.test(route))
  T('R3 le récapitulatif annonce les notes du CRM et les chantiers dont le nom part', /du CRM sur ce client/.test(route) && /sans devis envoyé \(le chantier reste, sans nom\)/.test(route))
  T('R4 durées : journal du CRM 24 mois, chantiers et notes 36 mois après la fin, membres inactifs 12 mois', DUREES_MOIS.crm_journal === 24 && DUREES_MOIS.crm === 36 && DUREES_MOIS.equipe_inactif === 12)
  const notes = [{ id: 'n1', client_cle: 'g1', cree_le: '2026-01-01' }, { id: 'n2', client_cle: 'g2', cree_le: '2020-01-01' }, { id: 'n3', client_cle: 'orph', cree_le: '2026-01-01' }, { id: 'n4', client_cle: 'g1', cree_le: '2020-01-01' }, { id: 'n5', client_cle: 'g3', cree_le: '2020-01-01', maj_le: '2026-02-01' }]
  const grp = [{ id: 'g1', derniere: '2026-05-01' }, { id: 'g2', derniere: '2022-01-01' }, { id: 'g3', derniere: '2021-01-01' }]
  const pur = Ef.notesClientAPurger(notes, grp, '2023-10-13T00:00:00.000Z')
  T('R5 purge des notes client : orpheline → part ; client et note sans nouvelle depuis 36 mois → part ; client actif ou note récente → reste', egal(pur, { ids: ['n2', 'n3'], suspect: false }), JSON.stringify(pur))
  T('R6 garde-fou : plus de la moitié de notes « orphelines » (empreinte changée ?) → rien n’est supprimé', egal(Ef.notesClientAPurger(notes, [], '2023-10-13'), { ids: [], suspect: true }))
  const purges = sansCommentaires(lire('lib/purgesRgpd.ts'))
  T('R7 la purge du CRM tourne chaque jour, hors drapeau : journal, chantiers finis, notes, membres inactifs rattachés à rien', /const r = await purgerCrm\(maintenant\)/.test(purges) && /supprimerAnciennes\('crm_journal', 'id', 'cree_le', seuilJournal/.test(purges) && /from\('chantiers'\)\.select\('id'\)\s*\.lt\('maj_le', seuilCrm\)/.test(purges) && /\.eq\('actif', false\)\.lt\('maj_le', seuilEquipe\)/.test(purges) && /chantier_equipe[\s\S]{0,200}chantier_taches[\s\S]{0,200}conducteur_id/.test(purges))
  const equipe = lire('app/crm/Equipe.tsx')
  T('R8 écran Équipe : « Informez votre équipe… », modèle de notice téléchargeable (durées réelles), « Téléphone professionnel »', /Informez votre équipe/.test(equipe) && /notice-information-equipe\.txt/.test(equipe) && /DUREES_MOIS\.equipe_inactif/.test(equipe) && /Téléphone professionnel \(facultatif\)/.test(equipe) && !/>Téléphone \(facultatif\)/.test(equipe))
  const zones = ['app/crm/FicheChantier.tsx', 'app/crm/clients/[ref]/page.tsx', 'app/crm/Chantiers.tsx'].map((f) => [f, (lire(f).match(/<textarea|Nature des travaux<input/g) ?? []).length, (lire(f).match(/\{AIDE_TEXTE_LIBRE\}/g) ?? []).length])
  T('R9 sous chaque zone de texte libre : « Pas de santé, d’opinion ni de jugement sur la personne »', /Pas de santé, d’opinion ni de jugement sur la personne\./.test(lire('app/crm/client.ts')) && zones.every(([, n, a]) => n > 0 && a >= n), JSON.stringify(zones))
  T('R10 recette : la visite guidée ne part pas d’elle-même sur /crm, et un clic hors de sa carte la ferme', /!\/\^\\\/crm\(\\\/\|\$\)\/\.test\(window\.location\.pathname\)/.test(lire('app/AppShell.tsx')) && /className="visite-fond" aria-hidden="true" onClick=\{\(\) => fin\.current\(false\)\}/.test(lire('app/Visite.tsx')))
  T('R11 recette : les six colonnes du pipeline tiennent dans 1 000 px (Payé n’est plus coupée à 1 440 px d’écran)', /\.crm-pipeline \{ display: grid; grid-template-columns: repeat\(6, minmax\(158px, 1fr\)\)/.test(lire('app/crm/crm.css')) && 6 * 158 + 5 * 10 <= 1000)
  T('R12 recette : la maquette 3D se précharge pendant la lecture des données (même morceau que next/dynamic), et le test WebGL attend que la lecture soit partie', /export function prechargerScene3D\(\) \{[\s\S]{0,400}void import\('\.\/Scene3D'\)\s*window\.setTimeout\(\(\) => \{ try \{ detecter\(\) \}/.test(lire('app/crm/atelier/Atelier.tsx')) && /prechargerScene3D\(\)/.test(lire('app/crm/page.tsx')))
}

// ═══════════════════════ J. Alertes, urgences, briefing (lib/crm/alertes.ts) — 15/10 ═══════════════════════
const Al = await imp('lib/crm/alertes.ts')
const Co = await imp('lib/crm/commandes.ts')
const Tr = await imp('lib/crm/tempsReel.ts')
const Pg = await imp('lib/crm/pages.ts')
const Vu = await imp('lib/crm/vue.ts')
const At2 = await imp('lib/crm/atelier.ts')
{
  const J = '2026-10-12'
  const tch = (total, faites, ouvertes = []) => ({ total, faites, faitesAujourdhui: 0, ouvertes })
  const chA = (id, statut, etape, extra = {}) => ({ id, titre: `Chantier ${id}`, client: null, statut, etape, avancement: null, date_debut: null, date_fin_prevue: null, vehicule_id: null, equipe: ['m1'], ...extra })
  const matA = (id, reste, seuil, extra = {}) => ({ id, nom: `Mat ${id}`, unite: 'u', categorie: 'Cat', reste, seuil, fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null, ...extra })
  const cmd = (id, statut, livraison, lignes, extra = {}) => ({ id, fournisseur: 'Négoce', contact: 'cmd@negoce.test', reference: `CMD-${id}`, statut, commandee_le: '2026-10-01', livraison_prevue: livraison, recue_le: statut === 'recue' ? '2026-10-05' : null, chantier_id: null, lignes: lignes.map((m) => ({ materiau_id: m, nom: `Mat ${m}`, quantite: 5, unite: 'u' })), relances: 0, relance_le: null, note: null, ...extra })
  const D = {
    jour: J, metier: null,
    chantiers: [
      chA('c1', 'en_cours', 'chantier', { date_fin_prevue: '2026-10-10', avancement: 25, taches: tch(4, 1, [{ id: 't1', libelle: 'Poser', membre_id: null }]) }), // retard 2
      chA('c2', 'en_cours', 'chantier', { date_fin_prevue: '2026-10-20', equipe: [] }),                                                                // sans équipe
      chA('c3', 'termine', 'a_facturer'),                                                                                                               // à facturer
      chA('c4', 'en_cours', 'paye', { date_fin_prevue: '2026-10-09' }),                                                                                // payé mais EN COURS et en retard (3 j) : doit rester visible
      chA('c5', 'termine', 'paye'), chA('c6', 'annule', 'classe'),                                                                                      // invisibles
      chA('c7', 'planifie', 'signe', { date_debut: '2026-10-12' }),
    ],
    materiaux: [matA('a', 1, 4), matA('b', 10, 4), matA('d', 0, 2), matA('e', 3, 3), matA('f', 9, 0)],
    reservations: [{ chantier_id: 'c1', materiau_id: 'a', quantite: 3 }, { chantier_id: 'c2', materiau_id: 'b', quantite: 2 }, { chantier_id: 'c7', materiau_id: 'd', quantite: 1 }],
    commandes: [cmd('K1', 'commandee', '2026-10-09', ['d'], { chantier_id: 'c7' }), cmd('K2', 'commandee', J, ['e']), cmd('K3', 'recue', '2026-10-01', ['a']), cmd('K4', 'annulee', '2026-10-01', ['a'])],
    commandesDisponibles: true,
    vehicules: [], membres: [{ id: 'm1', nom: 'Marc', role: 'artisan', actif: true }],
    demandes: [{ id: 'l1', titre: 'D1', client: null, recue_le: J }, { id: 'l2', titre: 'D2', client: null, recue_le: '2026-10-01' }],
  }
  const R = Al.calculerAlertes(D)
  const cles = R.alertes.map((a) => a.cle)
  T('J1 alertes : retard (même règle que le tableau), livraison en retard, stock insuffisant, à facturer, sans équipe, attendue — dans l’ordre de gravité puis d’ancienneté',
    egal(cles, ['livraison:K1', 'retard:c4', 'retard:c1', 'stock:c1', 'facturer:c3', 'sans_equipe:c2', 'attendue:K2']), cles.join(' '))
  T('J2 un chantier PAYÉ mais encore EN COURS et en retard reste visible et compté (il l’est au tableau de bord) ; terminé-payé et annulé : non',
    Al.chantierVisible({ statut: 'en_cours', etape: 'paye' }) && !Al.chantierVisible({ statut: 'termine', etape: 'paye' }) && !Al.chantierVisible({ statut: 'annule', etape: 'classe' }) && R.alertes.some((a) => a.cle === 'retard:c4' && a.jours === 3))
  T('J3 les chiffres du jour : 2 retards, 1 livraison en retard, 1 attendue, 3 matériaux sous le seuil, 1 à facturer, 1 sans équipe, 4 urgences critiques, 2 demandes dont 1 du jour',
    egal(R.chiffres, { retards: 2, livraisonsEnRetard: 1, livraisonsAttendues: 1, stockBas: 3, aFacturer: 1, sansEquipe: 1, demandes: 2, demandesDuJour: 1, critiques: 4 }), JSON.stringify(R.chiffres))
  const sc = R.alertes.find((a) => a.cle === 'stock:c1')
  T('J4 stock insuffisant : le matériau réservé (reste 1 < réservé 3) est critique et nommé ; un matériau déjà COMMANDÉ n’est pas relancé deux fois (d : commande K1 en cours)', sc?.gravite === 'critique' && /Mat a : reste 1 u \(seuil 4\), réservé 3/.test(sc.detail) && !R.alertes.some((a) => a.cle === 'stock:c7') && !R.alertes.some((a) => a.cle === 'stock:c2'))
  const k1 = R.alertes.find((a) => a.cle === 'livraison:K1')
  T('J5 livraison en retard : rattachée au chantier de la commande, 3 jours, commande identifiée ; recue / annulée : jamais d’alerte ; attendue aujourd’hui : info', k1?.chantierIds.join() === 'c7' && k1.jours === 3 && k1.commandeId === 'K1' && !cles.some((c) => /K3|K4/.test(c)) && R.alertes.find((a) => a.cle === 'attendue:K2')?.gravite === 'info')
  const sansReserv = Al.calculerAlertes({ ...D, reservations: [], commandes: [cmd('K1', 'commandee', '2026-10-09', ['d'])] })
  T('J6 une commande sans chantier ni matériau réservé n’est rattachée à aucun chantier mais reste une urgence', sansReserv.alertes.find((a) => a.cle === 'livraison:K1')?.chantierIds.length === 0 && Al.urgencesDuJour({ ...D, reservations: [], commandes: [cmd('K1', 'commandee', '2026-10-09', ['d'])] }).some((u) => u.type === 'livraison'))
  const sans = Al.calculerAlertes({ ...D, commandes: undefined, reservations: undefined })
  T('J7 sans commande enregistrée ni réservation : aucune livraison en retard ni stock de chantier n’est inventé', !sans.alertes.some((a) => ['livraison', 'attendue', 'stock'].includes(a.type)) && sans.chiffres.livraisonsEnRetard === 0)
  const relancee = Al.calculerAlertes({ ...D, commandes: [cmd('K1', 'commandee', '2026-10-09', ['d'], { chantier_id: 'c7', relances: 2, relance_le: '2026-10-11T22:30:00.000Z' })] }).alertes.find((a) => a.cle === 'livraison:K1')
  T('J7b une livraison déjà relancée le dit : « Relancé 2 fois, dernière relance le 12/10/2026 » (jour de Paris : 22 h 30 UTC le 11 = le 12)', /Relancé 2 fois, dernière relance le 12\/10\/2026/.test(relancee?.detail ?? ''), relancee?.detail)
  const U = Al.urgencesDuJour(D, R)
  const g = U.find((u) => u.type === 'stock_global'), dm = U.find((u) => u.type === 'demandes')
  T('J8 urgences du jour : les alertes, puis « 3 matériaux sous le seuil (dont 2 déjà commandés) » et « 2 nouvelles demandes » ; la plus grave d’abord ; chaque ligne dit où aller',
    U.length === R.alertes.length + 2 && /^3 matériaux sous le seuil/.test(g?.titre) && /2 déjà commandés/.test(g.detail) && /^2 nouvelles demandes/.test(dm?.titre) && U[0].gravite === 'critique' && U.slice(0, 4).every((u) => u.gravite === 'critique')
      && U.find((u) => u.cle === 'retard:c1').objetCle === 'chantier:c1' && dm.objetCle === 'accueil' && g.objetCle === 'categorie:Cat', JSON.stringify(U.map((u) => [u.cle, u.gravite])))
  const B = Al.construireBriefing(D)
  T('J9 briefing : un résumé de la journée, puis chaque chantier qui demande de l’attention (urgents d’abord), le dépôt, l’accueil ; mêmes données = même briefing',
    B[0].cle === 'resume' && /4 urgences/.test(B[0].texte) && egal(B.slice(1, 6).map((e) => e.cle).sort(), ['chantier:c1', 'chantier:c2', 'chantier:c3', 'chantier:c4', 'chantier:c7']) && B.at(-2).cle === 'depot' && B.at(-1).cle === 'accueil' && B.slice(1, 4).every((e) => e.gravite === 'critique') && egal(B, Al.construireBriefing(D)), B.map((e) => e.cle).join(' '))
  T('J10 briefing : un objet absent de la maquette n’est pas visé (la caméra ne bouge pas), le texte est quand même lu', Al.construireBriefing(D, () => false).every((e) => e.objetCle === null) && Al.construireBriefing(D, () => false)[1].texte.length > 10)
  // La maquette porte ces alertes : badges, équipe, terrain qui pulse, palette de livraison attendue.
  const scene = At2.construireScene(D)
  const o = (k) => scene.objets.find((x) => x.cle === k)
  T('J11 maquette : les badges du chantier viennent des alertes (c1 : retard + stock + tâches 1/4) ; l’équipe est celle des membres actifs affectés', egal(o('chantier:c1').badges.map((b) => b.libelle), ['Retard 2 j', 'Stock à compléter', '1/4 tâches']) && egal(o('chantier:c1').info.equipe.map((m) => m.nom), ['Marc']) && o('chantier:c2').info.equipe.length === 0 && o('chantier:c2').badges.some((b) => b.type === 'sans_equipe'))
  T('J12 maquette : le chantier payé-en-cours (c4) est posé et en retard ; terminé-payé et annulé ne le sont pas', !!o('chantier:c4')?.etat.retard && !o('chantier:c5') && !o('chantier:c6') && o('chantier:c3').etat.aFacturer && o('chantier:c3').detail === 'Terminé · à facturer')
  const ligne = (k) => scene.instances.box.filter((b) => b.o === scene.objets.findIndex((x) => x.cle === k)).length
  T('J13 maquette : la palette de livraison attendue ne se pose que sur le chantier en retard de livraison (c7) ; le terrain pulse sous une urgence (c1, c4, c7), pas sous un chantier calme',
    ligne('chantier:c7') > ligne('chantier:c3') + 4 && scene.pulse.filter((p) => scene.objets[p.o]?.type === 'chantier').map((p) => scene.objets[p.o].ref).sort().join() === 'c1,c4,c7')
  T('J14 maquette : « Livraisons » allume c7 seulement ; les chiffres des filtres sont ceux des urgences (retard 2, livraisons 1, à facturer 1, stock bas 3 = MATÉRIAUX et non rayonnages)',
    egal([...At2.objetsAllumes(scene.objets, 'livraison')].map((i) => scene.objets[i].cle), ['chantier:c7']) && egal(At2.chiffresFiltres(scene, D), { aujourdhui: At2.compteFiltres(scene.objets).aujourdhui, retard: 2, livraison: 1, a_facturer: 1, stock_bas: 3 }))
  const roads = scene.instances.box.filter((b) => b.o === -1 && b.c === '#DDD5C7').length
  T('J15 maquette : des routes entre les parcelles, mais le cadrage de la caméra ne dépend que de ce qui est posé (la ville décorative n’élargit pas les bornes)', roads > 20 && scene.bornes.min[0] > -30 && scene.bornes.max[0] < 60, `${roads} routes ; bornes ${JSON.stringify(scene.bornes)}`)
}

// ═══════════════════════ K. Commandes fournisseur (lib/crm/commandes.ts + routes) — 15/10 ═══════════════════════
{
  const J = '2026-10-12'
  const c = (statut, liv, extra = {}) => ({ id: 'x', fournisseur: 'F', contact: null, reference: 'R1', statut, commandee_le: '2026-10-01', livraison_prevue: liv, recue_le: null, chantier_id: null, lignes: [{ materiau_id: null, nom: 'Tube', quantite: 12.5, unite: 'm' }], relances: 0, relance_le: null, note: null, ...extra })
  T('K1 retard : « commandée » + livraison STRICTEMENT passée ; aujourd’hui = attendue, pas en retard ; reçue, annulée ou à venir : jamais',
    Co.retardLivraison(c('commandee', '2026-10-09'), J) === 3 && Co.retardLivraison(c('commandee', J), J) === 0 && Co.attendueAujourdhui(c('commandee', J), J) && Co.retardLivraison(c('recue', '2026-10-01'), J) === 0 && Co.retardLivraison(c('annulee', '2026-10-01'), J) === 0 && Co.retardLivraison(c('commandee', '2026-10-13'), J) === 0 && Co.enRetard(c('commandee', '2026-10-11'), J) && Co.retardLivraison(c('commandee', '2026-09-30'), J) === 12)
  const ok = Co.validerCommande({ fournisseur: ' Négoce Nord ', contact: 'cmd@negoce.test', livraison_prevue: '2026-10-20', lignes: [{ nom: 'Tube', quantite: '12,5', unite: 'm', materiau_id: U(7) }] }, J)
  T('K2 création : valeurs nettoyées (« 12,5 » lu 12.5, fournisseur sans espaces), date de commande par défaut = jour', ok.ok && ok.valeur.fournisseur_nom === 'Négoce Nord' && ok.valeur.lignes[0].quantite === 12.5 && ok.valeur.commandee_le === null && ok.valeur.livraison_prevue === '2026-10-20', JSON.stringify(ok))
  const bad = (b) => !Co.validerCommande(b, J).ok
  const ligne1 = [{ nom: 'Tube', quantite: 1 }]
  T('K3 création refusée (pas corrigée) : champ inconnu, sans livraison, livraison avant la commande, 0 ou 51 lignes, quantité 0, matériau mal formé, date inexistante, artisan_id',
    bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: ligne1, artisan_id: U(1) }) && bad({ fournisseur: 'F', lignes: ligne1 }) && bad({ fournisseur: 'F', livraison_prevue: '2026-10-05', lignes: ligne1 }) && bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', commandee_le: '2026-10-25', lignes: ligne1 })
      && bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: [] }) && bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: Array.from({ length: 51 }, () => ligne1[0]) }) && Co.validerCommande({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: Array.from({ length: 50 }, () => ligne1[0]) }, J).ok
      && bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: [{ nom: 'T', quantite: 0 }] }) && bad({ fournisseur: 'F', livraison_prevue: '2026-10-20', lignes: [{ nom: 'T', quantite: 1, materiau_id: "1' or '1'='1" }] }) && bad({ fournisseur: 'F', livraison_prevue: '2026-02-31', lignes: ligne1 }) && bad({ fournisseur: '', livraison_prevue: '2026-10-20', lignes: ligne1 }))
  const m = Co.validerModificationCommande
  T('K4 modification : UNE chose (reçue avec ou sans stock, annuler, nouvelle date) ; combinaison, action inconnue, champ inconnu, date inexistante : refusés',
    egal(m({ action: 'recue' }).valeur, { action: 'recue', entrer_en_stock: false }) && egal(m({ action: 'recue', entrer_en_stock: true }).valeur, { action: 'recue', entrer_en_stock: true }) && m({ action: 'annuler' }).ok && egal(m({ livraison_prevue: '2026-10-30' }).valeur, { livraison_prevue: '2026-10-30' })
      && !m({ action: 'annuler', livraison_prevue: '2026-10-30' }).ok && !m({ action: 'supprimer' }).ok && !m({ statut: 'recue' }).ok && !m({ livraison_prevue: '2026-13-01' }).ok && !m({ action: 'recue', entrer_en_stock: 'oui' }).ok && !m({}).ok)
  const rl = Co.validerRelance
  T('K5 relance : SANS `confirmer: true` rien ne part ; message obligatoire, 2 000 caractères au plus ; champ inconnu refusé', !rl({ message: 'x' }).ok && !rl({ message: 'x', confirmer: 'true' }).ok && rl({ message: 'x', confirmer: true }).ok && !rl({ message: '', confirmer: true }).ok && !rl({ message: 'x'.repeat(2001), confirmer: true }).ok && !rl({ message: 'x', confirmer: true, to: 'a@b.fr' }).ok)
  const t = Co.texteRelance(c('commandee', '2026-10-09'), J, null)
  T('K6 message de relance préparé : la commande, la date annoncée, le retard, les lignes ; aucun prix, aucune promesse, aucune donnée de client', /commande R1 passée le 01\/10\/2026/.test(t) && /annoncée pour le 09\/10\/2026/.test(t) && /3 jours de retard/.test(t) && /- 12,5 m · Tube/.test(t) && !/€|prix|remise|client/i.test(t) && /Pouvez-vous me confirmer la date de livraison/.test(t))
  T('K7 adresse e-mail plausible ou téléphone plausible dans le contact libre ; sinon rien (aucun envoi sans adresse)', Co.adresseMail(' cmd@negoce.test ') === 'cmd@negoce.test' && Co.adresseMail('02 40 00 00 00') === null && Co.adresseMail('a@b') === null && Co.telephone('02 40 00 00 00') === '02 40 00 00 00' && Co.telephone('cmd@negoce.test') === null)
  const lig = Co.commandeDeLigne({ id: 'i', statut: 'commandee', livraison_prevue: '2026-10-09', fournisseur_nom: 'F', lignes: [{ nom: 'A', quantite: '2' }, { nom: '', quantite: 1 }, { nom: 'B', quantite: 0 }, 'x', { nom: 'C', quantite: 3, unite: 'm', materiau_id: 'm1' }], relances: '2' })
  T('K8 lecture de la base : une ligne illisible est écartée (jamais devinée), un statut inconnu ne donne aucune commande', lig.lignes.length === 2 && lig.lignes[0].unite === 'u' && lig.lignes[1].materiau_id === 'm1' && lig.relances === 2 && Co.commandeDeLigne({ id: 'i', statut: 'perdue', livraison_prevue: '2026-10-09', fournisseur_nom: 'F' }) === null)
  // Le code : les routes, la confirmation, l'atomicité.
  const rl_ = sansCommentaires(lire('app/api/crm/commandes/[id]/relancer/route.ts')), pa_ = sansCommentaires(lire('app/api/crm/commandes/[id]/route.ts')), po_ = sansCommentaires(lire('app/api/crm/commandes/route.ts'))
  T('K9 la route de relance : message et confirmation validés AVANT toute lecture ; commande relue pour la session ; sans adresse → 422 ; une relance par heure (prise conditionnelle AVANT l’envoi, rendue si l’envoi échoue) ; le texte envoyé est celui de la requête',
    rl_.indexOf('validerRelance(corps.valeur)') > 0 && rl_.indexOf('validerRelance(corps.valeur)') < rl_.indexOf("from('commandes_fournisseur')") && /\.eq\('id', id\)\.eq\('artisan_id', g\.uid\)\.maybeSingle\(\)/.test(rl_) && /status|422/.test(rl_) && /code: 'sans_adresse'/.test(rl_)
      && rl_.indexOf(".or(`relance_le.is.null,relance_le.lt.") > 0 && rl_.indexOf(".or(`relance_le.is.null,relance_le.lt.") < rl_.indexOf('await sendEmail(') && /text: v\.valeur\.message/.test(rl_) && /relances: c\.relances, relance_le: c\.relance_le/.test(rl_) && /transactionnel: true/.test(rl_) && /consommerLimite\(`crm-relance:\$\{g\.uid\}`, 10, 86_400\)/.test(rl_))
  T('K10 réception : la commande est PRISE sous condition de statut (une seule ligne mise à jour) avant l’entrée en stock, qui passe par appliquer_mouvement du compte ; aucune autre route n’appelle l’envoi',
    pa_.indexOf(".eq('statut', 'commandee').select(COLONNES)") > 0 && pa_.indexOf(".eq('statut', 'commandee').select(COLONNES)") < pa_.indexOf("rpc('appliquer_mouvement'") && /p_artisan: g\.uid/.test(pa_) && /p_type: 'entree'/.test(pa_) && !/sendEmail/.test(pa_) && !/sendEmail/.test(po_) && lister('app/api/crm').filter((f) => /sendEmail/.test(sansCommentaires(lire(f)))).sort().join() === 'app/api/crm/apres-chantier/message/route.ts,app/api/crm/commandes/[id]/relancer/route.ts,app/api/crm/relances/envoyer/route.ts' /* 19/10 : + l'après-chantier (lot 4), envoi confirmé par l'artisan */) // 18/10 : + la relance d'un devis, confirmée
  T('K11 création : le chantier, le fournisseur et chaque matériau sont relus POUR LA SESSION avant l’insertion ; table absente → message clair (503), jamais un faux « aucune commande »',
    /chantierDe\(g\.uid, c\.chantier_id\)/.test(po_) && /from\('fournisseurs'\)\.select\('id'\)\.eq\('id', c\.fournisseur_id\)\.eq\('artisan_id', g\.uid\)/.test(po_) && /from\('materiaux'\)\.select\('id'\)\.in\('id', ids\)\.eq\('artisan_id', g\.uid\)/.test(po_) && /MANQUE_MIGRATION/.test(po_)
      && /tableAbsente/.test(lire('lib/crm/serveur.ts')) && /commandesDisponibles: !tableAbsente/.test(lire('lib/crm/serveur.ts')))
  const ui = lire('app/crm/atelier/Commande.tsx')
  T('K12 écran : « Relancer le fournisseur » prépare un message modifiable ; l’e-mail ne part qu’au clic « Envoyer l’e-mail à … » (corps `confirmer: true`) ; sans adresse : copier le message, jamais d’envoi ; c’est le seul appel de /relancer',
    /Envoyer l’e-mail à \$\{mail\}/.test(ui) && /body: \{ message, confirmer: true \}/.test(ui) && /\{mail && <button[^>]*onClick=\{\(\) => void envoyer\(\)\}/.test(ui) && /Aucune adresse e-mail enregistrée pour ce fournisseur : copiez le message/.test(ui) && /<textarea/.test(ui)
      && [...lister('app/crm'), ...lister('lib/crm')].filter((f) => /\/relancer/.test(sansCommentaires(lire(f))) && /\.(tsx?|ts)$/.test(f)).join() === 'app/crm/atelier/Commande.tsx', '')
  const pan = lire('app/crm/atelier/Panneau.tsx')
  T('K13 panneau du chantier : « Relancer le fournisseur » et « Ouvrir la commande » sur une livraison en retard ; « Préparer la commande » sur un stock à compléter ; tâches ouvertes cochables (PATCH /api/crm/taches/[id]) ; équipe sur place ; urgences et alertes',
    /Relancer le fournisseur/.test(pan) && /Ouvrir la commande/.test(pan) && /Préparer la commande/.test(pan) && /\/api\/crm\/taches\/\$\{id\}`, \{ method: 'PATCH', body: \{ faite: true \}/.test(pan) && /Sur place aujourd’hui/.test(pan) && /Urgences et alertes/.test(pan) && /Tâches ouvertes/.test(pan))
}

// ═══════════════════════ L. « Deux chiffres, un écran » : le même calcul partout, sur 300 comptes tirés au hasard ═══════════════════════
{
  const prng = (graine) => () => { graine |= 0; graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const MAINT = new Date('2026-10-12T08:30:00.000Z'), JOUR = '2026-10-12'
  const jourDec = (n) => { const d = new Date(Date.UTC(2026, 9, 12 + n)); return d.toISOString().slice(0, 10) }
  const generer = (graine) => {
    const r = prng(graine), pick = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1)), uid = 'U'
    const devis = Array.from({ length: ent(0, 14) }, (_, i) => {
      const statut = pick(['brouillon', 'envoye', 'accepte', 'accepte', 'accepte', 'refuse', 'expire'])
      const mois = pick([JOUR, '2026-10-03', '2026-09-20', '2026-08-15'])
      return { id: `D${i}`, artisan_id: uid, lead_id: null, statut, numero: `D-${i}`, objet: `Objet ${i}`, client_nom: `Client ${ent(1, 6)}`, client_email: null, client_adresse: null, total_ttc: ent(100, 9000) + (r() < 0.5 ? 0.5 : 0), acompte_pct: 0, date_emission: mois, envoye_le: `${mois}T09:00:00.000Z`, accepte_le: statut === 'accepte' ? `${mois}T09:00:00.000Z` : null, created_at: `${mois}T08:00:00.000Z`, validite_jours: 30 }
    })
    const factures = devis.filter((d) => d.statut === 'accepte').flatMap((d, i) => Array.from({ length: ent(0, 2) }, (_, k) => ({ id: `F${i}-${k}`, artisan_id: uid, devis_id: d.id, numero: `F-${i}-${k}`, statut: pick(['emise', 'payee', 'annulee', 'brouillon']), total_ttc: r() < 0.5 ? d.total_ttc : Math.round(d.total_ttc * 30) / 100, avoir_de: null, date_emission: '2026-10-05', date_echeance: null, client_nom: d.client_nom })))
    const leads = Array.from({ length: ent(0, 8) }, (_, i) => ({ id: `L${i}`, artisan_id: uid, statut: pick(['nouveau', 'repondu', 'en_discussion', 'gagne', 'perdu']), nom_prospect: `Prospect ${i}`, contact: null, canal: 'page', type_chantier: `Travaux ${i}`, ville: null, created_at: `${pick([JOUR, '2026-10-10', '2026-09-01'])}T07:00:00.000Z` }))
    const chantiers = []
    devis.filter((d) => d.statut === 'accepte').forEach((d, i) => { if (r() < 0.75) chantiers.push({ id: `C${i}`, artisan_id: uid, devis_id: d.id, client_nom: null, titre: `Chantier ${i}`, adresse: null, code_postal: null, ville: null, statut: pick(['a_planifier', 'planifie', 'en_cours', 'en_cours', 'en_pause', 'termine', 'annule']), date_debut: r() < 0.8 ? jourDec(ent(-12, 4)) : null, date_fin_prevue: r() < 0.8 ? jourDec(ent(-8, 12)) : null, date_fin_reelle: null, vehicule_id: null, notes: null, cree_le: '2026-09-01T09:00:00.000Z', maj_le: '2026-09-01T09:00:00.000Z' }) })
    for (let i = 0; i < ent(0, 2); i++) chantiers.push({ id: `S${i}`, artisan_id: uid, devis_id: null, client_nom: `Client sans devis ${i}`, titre: `Dépannage ${i}`, adresse: null, code_postal: null, ville: null, statut: pick(['a_planifier', 'en_cours', 'termine', 'annule']), date_debut: null, date_fin_prevue: r() < 0.5 ? jourDec(ent(-5, 5)) : null, date_fin_reelle: null, vehicule_id: null, notes: null, cree_le: '2026-09-02T09:00:00.000Z', maj_le: '2026-09-02T09:00:00.000Z' })
    const taches = chantiers.flatMap((c) => Array.from({ length: ent(0, 11) }, (_, k) => { const faite = r() < 0.5; return { id: `T${c.id}-${k}`, chantier_id: c.id, faite, libelle: `Tâche ${k}`, faite_le: faite ? `${pick([JOUR, '2026-10-08'])}T07:00:00.000Z` : null, membre_id: null, ordre: k } }))
    const materiaux = Array.from({ length: ent(0, 12) }, (_, i) => ({ id: `M${i}`, artisan_id: uid, nom: `Matériau ${i}`, unite: 'u', categorie: pick(['A', 'B', null, 'C']), seuil_alerte: r() < 0.5 ? 0 : ent(1, 10), fournisseur_prefere: null, prix_vu_ht: null, prix_vu_le: null, stock: Array.from({ length: ent(0, 2) }, () => ({ lieu: pick(['atelier', 'camion']), quantite: ent(0, 12) + (r() < 0.3 ? 0.25 : 0) })), fournisseur: null }))
    const reservations = chantiers.flatMap((c) => materiaux.filter(() => r() < 0.2).map((m) => ({ chantier_id: c.id, materiau_id: m.id, quantite: ent(1, 6), statut: 'reserve' })))
    const commandes = Array.from({ length: ent(0, 4) }, (_, i) => ({ id: `K${i}`, fournisseur: 'F', contact: null, reference: null, statut: pick(['commandee', 'commandee', 'recue', 'annulee']), commandee_le: '2026-09-25', livraison_prevue: jourDec(ent(-6, 6)), recue_le: null, chantier_id: null, lignes: materiaux.slice(0, ent(1, 3)).map((m) => ({ materiau_id: m.id, nom: m.nom, quantite: 5, unite: 'u' })), relances: 0, relance_le: null, note: null }))
    const membres = Array.from({ length: ent(0, 5) }, (_, i) => ({ id: `Mb${i}`, nom: `Membre ${i}`, role: pick(['artisan', 'compagnon', 'apprenti']), actif: r() < 0.85 }))
    const equipe = chantiers.flatMap((c) => membres.filter(() => r() < 0.3).map((m) => ({ chantier_id: c.id, membre_id: m.id })))
    return { devis, factures, leads, chantiers, taches, materiaux, deplacements: [], carnet: [], vehicules: [], membres, equipe, reservations, commandes, commandesDisponibles: true, tronque: false }
  }
  const mauvais = []
  let comptes = 0, avecRetardPaye = 0, avecLivraison = 0
  for (let graine = 1; graine <= 300; graine++) {
    const d = generer(graine)
    const v = Vu.construireVue({ uid: 'U', metier: 'plombier', d, maintenant: MAINT, idDe: (k) => k })
    const a = v.atelier, R = Al.calculerAlertes(a), sc = At2.construireScene(a)
    const e = (msg) => mauvais.push(`#${graine} ${msg}`)
    comptes++
    // 1. Retards : le tableau de bord et la carte comptent les mêmes chantiers.
    const tRetard = v.tableau.chantiers?.enRetard?.nombre ?? 0
    if (R.chiffres.retards !== tRetard) e(`retards carte ${R.chiffres.retards} ≠ tableau ${tRetard}`)
    // 2. Stock bas : même règle (seuil > 0 et quantité totale ≤ seuil).
    if (R.chiffres.stockBas !== (v.tableau.stockBas?.nombre ?? 0)) e(`stock bas carte ${R.chiffres.stockBas} ≠ tableau ${v.tableau.stockBas?.nombre ?? 0}`)
    // 3. Tâches : la liste des chantiers et la carte portent les mêmes comptes.
    for (const c of v.chantiers) {
      const x = a.chantiers.find((y) => y.id === c.id)
      if (!x || x.avancement !== c.avancement.pct || x.taches.faites !== c.avancement.faites || x.taches.total !== c.avancement.total) e(`avancement ${c.id}`)
      else if (x.taches.ouvertes.length !== Math.min(8, x.taches.total - x.taches.faites)) e(`tâches ouvertes ${c.id}: ${x.taches.ouvertes.length}`)
    }
    // 4. La carte pose TOUT chantier ouvert (jusqu'à la limite de la maquette).
    const ouverts = a.chantiers.filter((c) => c.statut !== 'termine' && c.statut !== 'annule').length
    const poses = sc.objets.filter((o) => o.type === 'chantier')
    if (poses.length !== Math.min(30, a.chantiers.filter(At2.chantierVisible).length)) e(`chantiers posés ${poses.length}`)
    if (poses.filter((o) => a.chantiers.find((c) => c.id === o.ref && c.statut !== 'termine')).length < Math.min(30, ouverts)) e('un chantier ouvert manque à la carte')
    // 5. À facturer : ce que dit la colonne du pipeline.
    const colonne = v.pipeline.colonnes.find((c) => c.etape === 'a_facturer').cartes.filter((k) => k.chantierId && a.chantiers.some((c) => c.id === k.chantierId && At2.chantierVisible(c))).length
    if (R.chiffres.aFacturer !== colonne) e(`à facturer carte ${R.chiffres.aFacturer} ≠ pipeline ${colonne}`)
    // 6. Demandes : la colonne « Demande » du pipeline (demandes sans devis).
    const dem = v.pipeline.colonnes.find((c) => c.etape === 'demande').cartes.filter((k) => k.objet === 'lead').length
    if (a.demandes.length !== dem) e(`demandes ${a.demandes.length} ≠ pipeline ${dem}`)
    // 7. Montants signés ce mois : recalcul indépendant sur les lignes brutes, en centimes.
    const sign = d.devis.filter((x) => x.statut === 'accepte' && String(x.accepte_le).slice(0, 7) === '2026-10')
    const attendu = sign.reduce((s, x) => s + Math.round(x.total_ttc * 100), 0)
    if (d.devis.length && (v.tableau.signeMois.nombre !== sign.length || v.tableau.signeMois.montant !== attendu)) e(`signé du mois ${v.tableau.signeMois.nombre}/${v.tableau.signeMois.montant} ≠ ${sign.length}/${attendu}`)
    // 8. Devis signés sans chantier : la liste proposée par « Créer un chantier ».
    const sansCh = d.devis.filter((x) => x.statut === 'accepte' && !d.chantiers.some((c) => c.devis_id === x.id)).length
    if (v.devisSignesSansChantier.length !== sansCh) e(`signés sans chantier ${v.devisSignesSansChantier.length} ≠ ${sansCh}`)
    // 9. Livraisons : une alerte par commande EN ATTENTE dont la date est passée, pas une de plus.
    const retardsCmd = d.commandes.filter((c) => c.statut === 'commandee' && c.livraison_prevue < JOUR).length
    if (R.chiffres.livraisonsEnRetard !== retardsCmd) e(`livraisons ${R.chiffres.livraisonsEnRetard} ≠ ${retardsCmd}`)
    // 10. Une alerte ne cite qu'un chantier visible de la carte, et toute urgence critique est au-dessus des autres.
    for (const al of R.alertes) for (const id of al.chantierIds) if (!a.chantiers.some((c) => c.id === id && At2.chantierVisible(c))) e(`alerte ${al.cle} sur un chantier invisible`)
    const U = Al.urgencesDuJour(a, R)
    if (U.some((u, i) => i > 0 && ['critique', 'attention', 'info'].indexOf(u.gravite) < ['critique', 'attention', 'info'].indexOf(U[i - 1].gravite))) e('urgences mal triées')
    // 11. Déterministe : mêmes lignes → même vue (un évènement temps réel ne peut pas faire diverger deux lectures).
    if (JSON.stringify(Vu.construireVue({ uid: 'U', metier: 'plombier', d: JSON.parse(JSON.stringify(d)), maintenant: MAINT, idDe: (k) => k })) !== JSON.stringify(v)) e('vue non déterministe')
    // 12. Les badges de la carte sont les alertes (aucune pastille sans alerte, aucune alerte sans pastille).
    for (const o of poses) { const nb = (R.parChantier.get(o.ref) ?? []).length; if (o.badges.filter((b) => b.type !== 'taches').length !== nb) e(`badges ${o.ref}`) }
    avecRetardPaye += a.chantiers.some((c) => c.etape === 'paye' && c.statut !== 'termine' && c.statut !== 'annule') ? 1 : 0
    avecLivraison += retardsCmd > 0 ? 1 : 0
  }
  T(`L1 « deux chiffres, un écran » sur ${comptes} comptes tirés au hasard : retards, stock bas, tâches, chantiers posés, à facturer, demandes, montant signé du mois, devis signés sans chantier, livraisons, urgences — la carte et les autres écrans disent la même chose`, mauvais.length === 0, mauvais.slice(0, 6).join(' | '))
  T('L2 le tirage couvre les cas qui piégeaient : des comptes avec un chantier payé mais encore en cours, des comptes avec une livraison en retard', avecRetardPaye >= 5 && avecLivraison >= 20, `${avecRetardPaye} / ${avecLivraison}`)
}

// ═══════════════════════ M. Temps réel (lib/crm/tempsReel.ts, app/crm/useTempsReel.ts, migration 0158) — 15/10 ═══════════════════════
{
  const uid = U(42)
  const ab = Tr.abonnements(uid)
  T('M1 un abonnement par table, chacun filtré sur LE compte de la session (`artisan_id=eq.<uid>`), tous les évènements d’écriture', ab.length === Tr.tablesEcoutees().length && ab.every((x) => x.schema === 'public' && x.event === '*' && x.filter === `artisan_id=eq.${uid}`) && new Set(ab.map((x) => x.table)).size === ab.length)
  T('M2 un identifiant qui n’est pas un uuid ne fabrique AUCUN filtre (injection de filtre) ; la casse est normalisée', Tr.abonnements("x,artisan_id=neq.1").length === 0 && Tr.abonnements('').length === 0 && Tr.abonnements(uid.toUpperCase())[0].filter === `artisan_id=eq.${uid}` && Tr.filtreCompte("00000000-0000-4000-8000-000000000001 or 1=1") === null)
  const mig = lire('supabase/migrations/0158_crm_commandes_temps_reel.sql')
  const migSql = mig.replace(/^\s*--.*$/gm, '')
  const liste0158 = (migSql.match(/foreach t in array array\[([^\]]+)\]/)?.[1] ?? '').split(',').map((x) => x.replace(/['\s]/g, '')).filter(Boolean)
  // 18/10 : 0162 ajoute crm_rappels à la publication (une table, un `alter publication … add table`).
  const sql0162 = lire('supabase/migrations/0162_crm_rappels.sql').replace(/^\s*--.*$/gm, '')
  const ajouts0162 = [...sql0162.matchAll(/alter publication supabase_realtime add table public\.(\w+)/g)].map((m) => m[1])
  // 21/10 : 0175 ajoute clients et crm_journal (écoutés seulement drapeau crmTempsReelComplet levé, lib/crm/tempsReel.ts).
  const sql0175 = lire('supabase/migrations/0175_crm_temps_reel_complet.sql').replace(/^\s*--.*$/gm, '')
  const ajouts0175 = (sql0175.match(/foreach t in array array\[([^\]]+)\]/)?.[1] ?? '').split(',').map((x) => x.replace(/['\s]/g, '')).filter(Boolean)
  const liste = [...liste0158, ...ajouts0162, ...ajouts0175]
  T('M3 la publication `supabase_realtime` (0158 + 0162 + 0175) écoute EXACTEMENT les tables du code (rien de plus, rien de moins)', egal([...liste].sort(), [...Tr.TABLES_TEMPS_REEL, ...Tr.TABLES_APRES_0175].sort()) && liste0158.length === 12 && egal(ajouts0162, ['crm_rappels']) && egal(ajouts0175, [...Tr.TABLES_APRES_0175]), liste.join())
  const tout = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => lire(`supabase/migrations/${f}`)).join('\n')
  const sansArtisan = [...Tr.TABLES_TEMPS_REEL, ...Tr.TABLES_APRES_0175].filter((t) => { const m = tout.match(new RegExp(`create table (?:if not exists )?public\\.${t}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i')); return !m || !/\bartisan_id\b/.test(m[1]) })
  T('M4 chaque table écoutée porte une colonne artisan_id (le filtre en a besoin) ; `stock`, qui n’en a pas, n’est PAS écoutée (ses variations passent par mouvements_stock)', sansArtisan.length === 0 && !Tr.TABLES_TEMPS_REEL.includes('stock') && /mouvements_stock/.test(migSql), sansArtisan.join())
  T('M5 migration 0158 : RLS activée, lecture de SES lignes, garde de session et de suspension, aucun droit d’écriture direct, rien pour anon, déclencheur anti-référence croisée',
    /alter table public\.commandes_fournisseur enable row level security/.test(migSql) && /create policy commandes_fournisseur_lecture on public\.commandes_fournisseur for select to authenticated\s+using \(\(select auth\.uid\(\)\) = artisan_id\)/.test(migSql)
      && /create policy garde_session on public\.commandes_fournisseur as restrictive/.test(migSql) && (migSql.match(/as restrictive/g) ?? []).length === 4 && /revoke all on public\.commandes_fournisseur from anon/.test(migSql) && /revoke insert, update, delete on public\.commandes_fournisseur from authenticated/.test(migSql)
      && /crm : chantier d un autre artisan/.test(migSql) && /crm : fournisseur d un autre artisan/.test(migSql) && /crm : materiau d un autre artisan/.test(migSql))
  T('M6 migration 0158 : état d’application en tête (non appliquée), contrôles avec résultat attendu, aucun DELETE écouté (non filtrable : fuite d’identifiant), jumeau _NU présent', /NON APPLIQUÉE/.test(mig.slice(0, 400)) && (mig.match(/\[(12|5|false|true)\]/g) ?? []).length >= 5 && /DELETE/.test(mig) && fs.existsSync(path.join(RACINE, 'supabase/migrations/_A_COLLER_sql_editor_0158_NU.sql')))
  const nu = lire('supabase/migrations/_A_COLLER_sql_editor_0158_NU.sql').replace(/^\s*--.*$/gm, '').replace(/\s+/g, ' ').trim()
  T('M7 le jumeau _NU porte le même SQL que la migration (hors commentaires)', nu === migSql.replace(/\s+/g, ' ').trim(), `${nu.length} ≠ ${migSql.replace(/\s+/g, ' ').trim().length}`)
  // La rafale : dix évènements d'affilée = une seule relecture.
  const horloge = { t: 0, file: [] }
  const minuteur = { set: (f, ms) => { const id = horloge.file.length; horloge.file.push({ id, a: horloge.t + ms, f, vivant: true }); return id }, clear: (id) => { const x = horloge.file.find((y) => y.id === id); if (x) x.vivant = false } }
  const avance = (ms) => { const fin = horloge.t + ms; for (;;) { const p = horloge.file.filter((x) => x.vivant && x.a <= fin).sort((a, b) => a.a - b.a)[0]; if (!p) break; p.vivant = false; horloge.t = p.a; p.f() } horloge.t = fin }
  let appels = 0
  const rafale = Tr.creerRafale(() => { appels++ }, 400, 2500, minuteur, () => horloge.t)
  for (let i = 0; i < 10; i++) { rafale.signaler(); avance(50) }
  T('M8 rafale : dix évènements en 500 ms = UNE relecture, 400 ms après le dernier', appels === 0 && rafale.enAttente() && (avance(349), appels === 0) && (avance(2), appels === 1) && !rafale.enAttente())
  appels = 0
  for (let i = 0; i < 80; i++) { rafale.signaler(); avance(100) } // un flux continu de 8 s
  T('M9 rafale : un flux continu ne repousse pas la mise à jour sans fin (au moins une relecture toutes les 2,5 s)', appels >= 3 && appels <= 4, String(appels))
  appels = 0; rafale.signaler(); rafale.annuler(); avance(5000)
  T('M10 rafale : annulée (écran fermé), rien ne part', appels === 0 && !rafale.enAttente())
  const hook = sansCommentaires(lire('app/crm/useTempsReel.ts')), page_ = sansCommentaires(lire('app/crm/page.tsx'))
  T('M11 le hook : un canal par compte, les abonnements de lib/crm/tempsReel (donc filtrés), nettoyage à la fermeture, relecture de rattrapage après une coupure, filet d’une minute ; AUCUN DELETE non filtré',
    /supabase\.channel\(`crm:\$\{uid\}`\)/.test(hook) && /abonnements\(uid, sansCle \?/.test(hook) && /on\('postgres_changes', \{ event: a\.event, schema: a\.schema, table: a\.table, filter: a\.filter \}/.test(hook) && /removeChannel\(canal\)/.test(hook) && /aEteCoupe/.test(hook) && /60_000/.test(hook) && !/DELETE/.test(hook) && !/filter: undefined/.test(hook))
  T('M12 la page : relit la MÊME vue serveur à chaque évènement (aucun chiffre recomposé dans le navigateur), n’écoute rien en exemple, ne redessine pas si rien n’a changé, garde la sélection par clé',
    /useTempsReel\(\{ uid, actif: !!vue && !exemple, surChangement: charger, sans: vue && vue\.rappels && !vue\.rappels\.disponibles \? \['crm_rappels'\] : \[\] \}\)/.test(page_) && /JSON\.stringify\(\{ \.\.\.r\.corps, maintenant: '' \}\)/.test(page_) && /if \(sans !== empreinte\.current\)/.test(page_) && /lien=\{lien\} dernier=\{dernier\}/.test(page_) && /cleSel/.test(sansCommentaires(lire('app/crm/atelier/Atelier.tsx'))) && !/postgres_changes/.test(page_))
  const s3d = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx'))
  T('M13 la ville ne se reconstruit pas à chaque évènement : l’apparition en cascade ne se joue qu’à la première image ; reduced-motion respecté (pas d’apparition, pas de pulsation vive, glissés instantanés)', /const apparition = useMemo\(\(\) => \(mouvementReduit\(\) \? null : \{[^}]*\}\), \[\]\)/.test(s3d) && /calme\.current \? 0\.22/.test(s3d) && /if \(mouvementReduit\(\)\) \{ anim\.current/.test(s3d))
}

// ═══════════════════════ N. Lecture par pages (lib/crm/pages.ts) — 15/10 ═══════════════════════
{
  const lignes = (n) => Array.from({ length: n }, (_, i) => ({ id: i }))
  const lecteur = (total, cap = 1000) => { const appels = []; return { appels, lire: async (de, a) => { appels.push([de, a]); return { data: lignes(total).slice(de, Math.min(a + 1, de + cap)), error: null } } } }
  const a = lecteur(2500), ra = await Pg.lirePages(a.lire, 2000)
  T('N1 plus de 1 000 lignes : lues par pages jusqu’au plafond (2 000), sans doublon ni trou', ra.data.length === 2000 && new Set(ra.data.map((x) => x.id)).size === 2000 && egal(a.appels, [[0, 999], [1000, 1999]]), JSON.stringify(a.appels))
  const b = lecteur(37), rb = await Pg.lirePages(b.lire, 2000)
  T('N2 un petit compte : UNE seule requête (pas de page vide en plus)', rb.data.length === 37 && b.appels.length === 1)
  const e = await Pg.lirePages(async (de) => (de === 0 ? { data: lignes(1000), error: null } : { data: null, error: { code: 'X', message: 'panne' } }), 5000)
  T('N3 une page en erreur fait échouer toute la lecture : jamais une table à moitié lue présentée comme complète', e.data === null && e.error?.message === 'panne')
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  T('N4 chargerDossiers lit CHAQUE table par pages (aucun `.limit(` seul qui serait coupé à 1 000 par PostgREST), avec un second tri sur la clé', !/\.limit\(/.test(srv.slice(srv.indexOf('export async function chargerDossiers'), srv.indexOf('/** Le chantier de l'))) && (srv.match(/lirePages\(\(de, a\) =>/g) ?? []).length === 14 && (srv.match(/\.range\(de, a\)/g) ?? []).length === 14) // 18/10 : + crm_rappels (0162)
}

// ═══════════════════════ O. L'exemple montre ce que le vrai CRM saurait montrer (15/10) ═══════════════════════
{
  const E = await imp('lib/crm/exemple.ts')
  const a = E.VUE_EXEMPLE.atelier
  const R = Al.calculerAlertes(a)
  T('O1 l’exemple porte une livraison en retard (salle de bain, 3 jours), un stock insuffisant (rénovation) et une tâche faite aujourd’hui — comme la vidéo de référence', R.alertes.some((x) => x.type === 'livraison' && x.jours === 3 && x.chantierIds.length === 1) && R.alertes.some((x) => x.type === 'stock' && x.gravite === 'critique') && a.chantiers.some((c) => c.taches.faitesAujourdhui === 1), R.alertes.map((x) => x.cle).join(' '))
  T('O2 l’exemple : la carte et le tableau de bord disent la même chose (2 chantiers en retard, 6 matériaux sous le seuil)', R.chiffres.retards === E.VUE_EXEMPLE.tableau.chantiers.enRetard.nombre && R.chiffres.retards === 2 && R.chiffres.stockBas === E.VUE_EXEMPLE.tableau.stockBas.nombre && R.chiffres.stockBas === 6, JSON.stringify(R.chiffres))
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
