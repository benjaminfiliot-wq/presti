#!/usr/bin/env node
// scripts/crm-lot2-qa.mjs — juge du LOT 2 des améliorations du CRM (plan plans/crm-idees-twenty-1810.md, n°1 et n°4) :
// les RAPPELS et RENDEZ-VOUS (table crm_rappels, migration 0162), « À faire aujourd'hui », la RELANCE d'un devis en un geste
// (préparée, relue, envoyée seulement après confirmation), le passage du matin, et la CHRONOLOGIE de la fiche client.
//
//  A. VALIDATION (lib/crm/valider.ts) : une cible exactement, empreinte client, type, date et heure réelles, texte borné.
//  B. RÈGLES PURES (lib/crm/rappels.ts) : échéances rapides, « À faire aujourd'hui », prochain rendez-vous, devis à relancer
//     (le même compte que la tuile « Relances dues » sur 300 comptes tirés au hasard, date d'envoi absente comprise — audit C1),
//     message préparé (sans lien, sans prix), décision d'envoi, contrôle du message, rattachement par une ANCIENNE clé (audit C4).
//  C. PASSAGE DU MATIN (lib/crm/rappelsTour.ts) : une notification par compte Signature, rien pour les autres, table absente = rien.
//  D. CHRONOLOGIE (lib/crm/chronologie.ts) : ordre, familles, filtres, extraits bornés, aucun évènement sans date.
//  E. EXEMPLE, ÉCRANS, CODE, MIGRATION : l'exemple montre rappels, relance et rendez-vous ; rendu serveur des composants ;
//     routes gardées ; l'envoi n'a lieu qu'après décision et contrôle ; 0162 (RLS, gardes, anon, déclencheur, publication) et
//     son jumeau ; la liste du temps réel.
//  L. EN VRAI (TEST_BASE=http://localhost:<port>, et 0162 appliquée) : comptes de test (@presti-test.invalid : aucun e-mail ne part
//     vers ce domaine, lib/email.ts), routes réelles, isolation entre comptes, offre, temps réel ; NETTOYAGE dans un finally.
//
// Usage : [TEST_BASE=http://localhost:3217] node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot2-qa.mjs
// Codes : 0 vert · 1 rouge
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
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
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')

const V = await imp('lib/crm/valider.ts')
const R = await imp('lib/crm/rappels.ts')
const Tr = await imp('lib/crm/rappelsTour.ts')
const Ch = await imp('lib/crm/chronologie.ts')
const { calculer } = await imp('lib/tableau-de-bord/calculer.ts')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const E64 = 'a'.repeat(64)

// ═══════════════════════ A. Validation ═══════════════════════
{
  const ok = V.validerCreationRappel({ chantier_id: U(1), echeance: '2026-10-20', heure: '14:30', texte: '  Métré  ', type: 'metre' })
  T('A1 rappel complet accepté : cible, type, jour, heure, texte nettoyé', ok.ok && egal(ok.valeur, { cible: { chantier_id: U(1) }, type: 'metre', echeance: '2026-10-20', heure: '14:30', texte: 'Métré' }), JSON.stringify(ok))
  T('A2 type par défaut « rappeler » ; heure facultative', V.validerCreationRappel({ devis_id: U(2), echeance: '2026-10-20' }).valeur?.type === 'rappeler')
  T('A3 UNE cible exactement (aucune, ou deux : refusé)', !V.validerCreationRappel({ echeance: '2026-10-20' }).ok && !V.validerCreationRappel({ devis_id: U(2), chantier_id: U(1), echeance: '2026-10-20' }).ok)
  T('A4 le client est une empreinte (64 hex), jamais une adresse', V.validerCreationRappel({ client: E64, echeance: '2026-10-20' }).ok && !V.validerCreationRappel({ client: 'client@test.invalid', echeance: '2026-10-20' }).ok)
  T('A5 jour obligatoire et réel (31 février refusé) ; heure « 25:00 » refusée', !V.validerCreationRappel({ lead_id: U(3) }).ok && !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-02-31' }).ok && !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-10-20', heure: '25:00' }).ok)
  T('A6 type inconnu, texte de 301 caractères, champ inconnu (artisan_id, origine) : refusés', !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-10-20', type: 'facture' }).ok && !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-10-20', texte: 'x'.repeat(301) }).ok && !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-10-20', artisan_id: U(9) }).ok && !V.validerCreationRappel({ lead_id: U(3), echeance: '2026-10-20', origine: 'systeme' }).ok)
  T('A7 identifiant de cible mal formé refusé (injection)', !V.validerCreationRappel({ devis_id: "1' or '1'='1", echeance: '2026-10-20' }).ok)
  T('A8 modification : cocher, décaler, corriger ; vide ou jour effacé refusés ; la cible ne se change pas', V.validerModificationRappel({ fait: true }).ok && V.validerModificationRappel({ echeance: '2026-10-21' }).ok && !V.validerModificationRappel({}).ok && !V.validerModificationRappel({ echeance: '' }).ok && !V.validerModificationRappel({ devis_id: U(1) }).ok && !V.validerModificationRappel({ fait: 'oui' }).ok)
}

// ═══════════════════════ B. Règles pures ═══════════════════════
{
  // 2026-10-18 est un dimanche ; 2026-10-16 un vendredi ; 2026-10-19 un lundi.
  T('B1 échéances rapides : demain, dans 3 jours, lundi (un dimanche → le lendemain ; un lundi → le lundi suivant), jamais aujourd’hui',
    egal(R.echeancesRapides('2026-10-18').map((x) => x.echeance), ['2026-10-19', '2026-10-21', '2026-10-19']) && egal(R.echeancesRapides('2026-10-16').map((x) => x.echeance), ['2026-10-17', '2026-10-19', '2026-10-19']) && R.echeancesRapides('2026-10-19')[2].echeance === '2026-10-26')
  const rp = (id, echeance, extra = {}) => ({ id, client_cle: null, lead_id: null, devis_id: U(1), chantier_id: null, type: 'rappeler', echeance, heure: null, texte: null, fait_le: null, origine: 'artisan', cible: { objet: 'devis', libelle: 'Devis', href: null }, retard: 0, ...extra })
  const af = R.aFaire([rp('a', '2026-10-15'), rp('b', '2026-10-18', { heure: '09:00' }), rp('c', '2026-10-18'), rp('d', '2026-10-22'), rp('e', '2026-10-30'), rp('f', '2026-10-10', { fait_le: '2026-10-11T08:00:00Z' })], '2026-10-18')
  T('B2 « À faire aujourd’hui » : en retard, puis aujourd’hui (sans heure d’abord), puis les 7 jours ; un rappel fait n’y est jamais', egal(af.enRetard.map((x) => x.id), ['a']) && egal(af.aujourdhui.map((x) => x.id), ['c', 'b']) && egal(af.semaine.map((x) => x.id), ['d']) && af.total === 3, JSON.stringify(af))
  T('B3 prochain rendez-vous : visite / métré / rendez-vous seulement, à venir et non faits', R.prochainRendezVous([rp('a', '2026-10-20', { type: 'rappeler' }), rp('b', '2026-10-25', { type: 'visite' }), rp('c', '2026-10-21', { type: 'metre' }), rp('d', '2026-10-10', { type: 'rendez_vous' }), rp('e', '2026-10-19', { type: 'rendez_vous', fait_le: 'x' })], '2026-10-18')?.id === 'c')
  T('B4 les rappels d’une fiche : le client lui-même ou une de ses pièces', egal(R.rappelsDe([rp('a', 'x', { devis_id: U(1) }), rp('b', 'x', { devis_id: U(2) }), rp('c', 'x', { devis_id: null, client_cle: E64 })], { client: E64, devis: [U(1)] }).map((x) => x.id), ['a', 'c']))

  // B5 — devis à relancer : le même compte que la tuile « Relances dues » (lib/tableau-de-bord/calculer.ts), sur 300 comptes.
  let graine = 1810
  const r = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648 }
  const maintenant = new Date('2026-10-18T10:00:00Z')
  const mauvais = []
  let vus = 0, sansDate = 0
  for (let k = 0; k < 300; k++) {
    const devis = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => {
      const age = Math.floor(r() * 120)
      const jour = new Date(maintenant.getTime() - age * 864e5).toISOString()
      const avecDate = r() < 0.5
      if (!avecDate) sansDate++
      return { id: `D${k}-${i}`, artisan_id: 'A', statut: ['envoye', 'envoye', 'accepte', 'brouillon', 'refuse'][Math.floor(r() * 5)], numero: `N${i}`, client_nom: 'C', total_ttc: 100, envoye_le: avecDate ? jour : null, date_emission: jour.slice(0, 10), created_at: jour, validite_jours: r() < 0.3 ? 30 : null }
    })
    const a = R.devisARelancer({ artisanId: 'A', devis, rappels: [], jour: '2026-10-18' })
    const b = calculer({ artisanId: 'A', factures: [], devis, demandes: [], maintenant }).aRelancer
    vus += a.length
    if (a.length !== b.total || !egal(a.map((x) => x.devisId).sort(), b.liste.map((x) => x.id).concat(a.slice(b.liste.length).map((x) => x.devisId)).sort())) mauvais.push(`compte ${k} : ${a.length} ≠ ${b.total}`)
    if (a.some((x) => x.dateSure !== !!devis.find((d) => d.id === x.devisId).envoye_le)) mauvais.push(`compte ${k} : dateSure`)
  }
  T(`B5 sur 300 comptes (${vus} devis à relancer, ${sansDate} sans date d’envoi) : le geste propose exactement les devis de la tuile « Relances dues » ; sans date d’envoi (audit C1), « date inconnue »`, mauvais.length === 0 && vus > 50, mauvais.slice(0, 4).join(' | '))
  const m1 = R.messageRelanceDevis({ client: 'Mme Test', numero: 'DEV-1', objet: 'Salle d’eau', envoyeLe: '2026-10-02', dateSure: true, relances: 0, signature: 'Plomberie Test' })
  const m2 = R.messageRelanceDevis({ client: null, numero: 'DEV-1', objet: null, envoyeLe: '2026-10-02', dateSure: false, relances: 2, signature: null })
  T('B6 message préparé : poli, cite le devis et la date d’envoi connue, signé ; sans lien, sans prix, sans délai', /Bonjour Mme Test,/.test(m1) && /« Salle d’eau »/.test(m1) && /le 02\/10\/2026/.test(m1) && /Plomberie Test$/.test(m1) && R.controlerMessageRelance(m1).ok && !/€|\d+ ?jours?|http/i.test(m1), m1)
  T('B7 date d’envoi inconnue : le message ne cite AUCUNE date ; après des relances, « une dernière fois »', !/\d{2}\/\d{2}\/\d{4}/.test(m2) && /dernière fois/.test(m2) && /n° DEV-1/.test(m2), m2)
  T('B8 décision : devis absent 404 ; signé, brouillon 409 ; sans e-mail 422 ; 3 relances 409 ; envoyé avec e-mail : oui',
    R.decisionRelance(null, 0).statut === 404 && R.decisionRelance({ statut: 'accepte', client_email: 'a@b.fr' }, 0).statut === 409 && R.decisionRelance({ statut: 'brouillon', client_email: 'a@b.fr' }, 0).statut === 409 && R.decisionRelance({ statut: 'envoye', client_email: null }, 0).statut === 422 && R.decisionRelance({ statut: 'envoye', client_email: 'a@b.fr' }, 3).statut === 409 && R.decisionRelance({ statut: 'envoye', client_email: 'a@b.fr' }, 2).ok)
  T('B9 contrôle du message : aucun lien (http, www, domaine nu) ; une adresse e-mail dans la signature passe ; trop court ou trop long refusé',
    !R.controlerMessageRelance('Bonjour, voyez https://x.fr merci').ok && !R.controlerMessageRelance('Bonjour, voyez www.exemple.com merci').ok && !R.controlerMessageRelance('Bonjour, voyez mon-site.fr pour le devis').ok && R.controlerMessageRelance('Bonjour, je reste joignable : contact@plomberie.fr').ok && !R.controlerMessageRelance('Bonjour').ok && !R.controlerMessageRelance('x'.repeat(4001)).ok && !R.controlerMessageRelance(42).ok)
  // C4 : un rappel posé sous l'ANCIEN identifiant du client (avant qu'on lui ajoute un e-mail) se rattache toujours à lui seul.
  const hab = R.habillerRappels([{ ...rp('z', '2026-10-20'), devis_id: null, client_cle: 'b'.repeat(64) }], { jour: '2026-10-18', devis: [], leads: [], chantiers: [], clients: [{ id: 'c'.repeat(64), nom: 'Mme Test', anciens: ['b'.repeat(64)] }] })
  T('B10 (audit C4) un rappel posé sous une ANCIENNE clé du client s’affiche sur SA fiche (identifiant actuel)', hab[0].cible.libelle === 'Mme Test' && hab[0].cible.href === `/crm/clients/${'c'.repeat(64)}`, JSON.stringify(hab[0].cible))
}

// ═══════════════════════ C. Passage du matin ═══════════════════════
{
  const lignes = [{ artisan_id: 'S', echeance: '2026-10-18' }, { artisan_id: 'S', echeance: '2026-10-15' }, { artisan_id: 'S', echeance: '2026-10-20' }, { artisan_id: 'E', echeance: '2026-10-18' }]
  T('C1 résumé du matin : dus aujourd’hui et en retard, par compte (pas les rappels futurs)', egal(Tr.resumeDuMatin(lignes, '2026-10-18'), [{ artisanId: 'E', total: 1, enRetard: 0 }, { artisanId: 'S', total: 2, enRetard: 1 }]))
  T('C2 texte : « 2 rappels, dont 1 en retard » ; rien d’un client (ni nom, ni montant)', Tr.texteMatin({ artisanId: 'S', total: 2, enRetard: 1 }).ligne === '2 rappels, dont 1 en retard : ouvrez votre tableau de bord.')
  const envois = []
  const r1 = await Tr.tourRappels('2026-10-18', { lireRappels: async () => ({ data: lignes, error: null }), lirePlans: async () => ({ data: [{ id: 'S', plan: 'signature' }, { id: 'E', plan: 'essentiel' }], error: null }), envoyer: async (id, c) => { envois.push([id, c]); return { envoyes: 1 } } })
  T('C3 seul le compte dont l’offre porte le CRM (Signature) est notifié ; la notification ouvre le tableau de bord du CRM', r1.notifies === 1 && envois.length === 1 && envois[0][0] === 'S' && envois[0][1].url === '/crm?vue=tableau' && envois[0][1].tag === 'crm-rappels-matin', JSON.stringify(envois))
  const r2 = await Tr.tourRappels('2026-10-18', { lireRappels: async () => ({ data: null, error: { code: 'PGRST205', message: 'absente' } }), lirePlans: async () => { throw new Error('ne doit pas lire') }, envoyer: async () => { throw new Error('ne doit rien envoyer') } })
  T('C4 table absente (0162 non appliquée) : rien n’est lu ni envoyé, et ce n’est pas une panne', r2.installe === false && r2.erreurs.length === 0)
  const cron = sansCommentaires(lire('app/api/cron/relances/route.ts'))
  T('C5 le passage quotidien appelle le tour des rappels hors pause, sans e-mail, et le journalise', /if \(!enPause && !interrompue\) \{\s*try \{\s*const jour = /.test(cron) && /tourRappels\(jour, \{/.test(cron) && /envoyer: \(id, charge\) => envoyerPushArtisan\(id, charge\)/.test(cron) && /enregistrerPassage\('rappels-crm'/.test(cron))
}

// ═══════════════════════ D. Chronologie ═══════════════════════
{
  const e = Ch.chronologie({
    leads: [{ id: 'L1', created_at: '2026-09-01T08:00:00Z', canal: 'page', type_chantier: 'Salle d’eau' }],
    messages: [{ id: 'M1', lead_id: 'L1', sens: 'in', type: 'manuel', contenu: 'x'.repeat(500), sent_at: '2026-09-01T08:00:00Z' }, { id: 'M2', lead_id: 'L1', sens: 'out', type: 'reponse_auto', contenu: 'Bonjour', sent_at: '2026-09-01T08:01:00Z' }],
    relancesConversation: [{ id: 'R1', lead_id: 'L1', rang: 1, planifiee_le: '2026-09-03T08:00:00Z', envoyee: true }, { id: 'R2', lead_id: 'L1', rang: 2, planifiee_le: '2026-09-06T08:00:00Z', envoyee: false }],
    devis: [{ id: 'D1', numero: 'DEV-1', objet: 'Salle d’eau', statut: 'accepte', total_ttc: 1200, created_at: '2026-09-02T09:00:00Z', envoye_le: '2026-09-02T10:00:00Z', accepte_le: '2026-09-05T10:00:00Z' }],
    factures: [{ id: 'F1', numero: 'FAC-1', statut: 'payee', total_ttc: 360, date_emission: '2026-09-06', payee_le: '2026-09-08T10:00:00Z' }, { id: 'F2', numero: 'FAC-2', statut: 'brouillon', total_ttc: 840, date_emission: '2026-09-09' }],
    relancesImpayes: [{ id: 'I1', facture_id: 'F1', rang: 1, envoyee_le: '2026-09-07T08:00:00Z' }],
    chantiers: [{ id: 'C1', titre: 'Salle d’eau', cree_le: '2026-09-05T11:00:00Z', statut: 'termine', date_fin_reelle: '2026-09-20' }],
    notes: [{ id: 'N1', texte: 'Préfère le matin', cree_le: '2026-09-04T12:00:00Z' }],
    rappels: [{ id: 'P1', type: 'relancer_devis', texte: 'Relance n° 1 envoyée par e-mail', echeance: '2026-09-04', fait_le: '2026-09-04T09:00:00Z', envoye_le: '2026-09-04T09:00:00Z' }, { id: 'P2', type: 'visite', echeance: '2026-09-03', fait_le: '2026-09-03T15:00:00Z' }, { id: 'P3', type: 'rappeler', echeance: '2026-10-30', fait_le: null }],
  })
  const cles = e.map((x) => x.cle)
  T('D1 le fil : le plus récent en haut, chaque pièce datée (demande, échanges, devis préparé / envoyé / signé, facture émise / payée, relances, chantier ouvert / terminé, note, rappels faits)',
    cles[0] === 'ch-fin:C1' && cles.slice(-2).includes('lead:L1') && ['msg:M1', 'msg:M2', 'relconv:R1', 'devis-cree:D1', 'devis-envoye:D1', 'devis-signe:D1', 'fact:F1', 'fact-payee:F1', 'relimp:I1', 'ch:C1', 'note:N1', 'rap-env:P1', 'rap:P2'].every((k) => cles.includes(k)), cles.join(' '))
  T('D2 ni brouillon de facture, ni relance non envoyée, ni rappel encore à faire', !cles.includes('fact:F2') && !cles.includes('relconv:R2') && !cles.some((k) => k.endsWith('P3')))
  T('D3 un échange est résumé (140 caractères au plus) : le texte entier reste dans Messages', [...(e.find((x) => x.cle === 'msg:M1').detail ?? '')].length <= 140)
  const n = Ch.comptes(e)
  T('D4 filtres : Tout = la somme des familles ; chaque filtre ne garde que sa famille', n.tout === n.echanges + n.argent + n.chantiers + n.notes && Ch.filtrer(e, 'argent').every((x) => x.famille === 'argent') && Ch.filtrer(e, 'argent').length === n.argent && n.argent === 6, JSON.stringify(n))
  T('D5 aucun évènement sans date valable (jamais une date inventée)', Ch.chronologie({ leads: [{ id: 'L', created_at: null }], messages: [], devis: [{ id: 'D', created_at: 'pas une date' }], factures: [], chantiers: [], notes: [], rappels: [] }).length === 0)
}

// ═══════════════════════ E. Exemple, écrans, code, migration ═══════════════════════
{
  const Ex = await imp('lib/crm/exemple.ts')
  const v = Ex.VUE_EXEMPLE
  // 20/10 : avec l'après-chantier levé (crmApresChantier), l'exemple porte en plus la demande d'avis 856 (échue le 04/10) : un retard de plus.
  const apres = (await imp('lib/flags.ts')).FLAGS.crmApresChantier, retards = apres ? 2 : 1
  T('E1 exemple : « À faire aujourd’hui » = 1 en retard (cuisine ; + la demande d’avis si l’après-chantier est levé) + 2 aujourd’hui (relance du devis, prévenir le client des radiateurs)', v.rappels.aFaire.enRetard.length === retards && v.rappels.aFaire.aujourdhui.length === 2 && v.rappels.disponibles, JSON.stringify(v.rappels.aFaire).slice(0, 300))
  T('E2 exemple : l’adoucisseur (envoyé il y a 14 jours) est à relancer, avec la vraie date d’envoi ; et le compte = la tuile « Relances dues »', v.rappels.devisARelancer.some((d) => d.objet === 'Adoucisseur' && d.dateSure && d.jours === 14) && v.rappels.devisARelancer.length === v.tableau.relancesDues.nombre)
  const carte = v.pipeline.colonnes.flatMap((c) => c.cartes).find((c) => c.titre === 'Adoucisseur')
  T('E3 exemple : la carte du pipeline porte son rappel (badge)', carte?.rappel?.type === 'relancer_devis' && carte.rappel.echeance === '2026-10-12')
  const fa = Ex.ficheClientExemple(`d-${U(501)}`)
  T('E4 exemple : la fiche de la cliente A a son prochain rendez-vous (réception des travaux, 16/10 17 h 30) et un fil daté', fa.prochainRendezVous?.type === 'rendez_vous' && fa.prochainRendezVous.echeance === '2026-10-16' && fa.chronologie.length >= 6 && fa.chronologie[0].quand >= fa.chronologie.at(-1).quand)
  const fc = Ex.ficheChantierExemple(U(2))
  T('E5 exemple : la fiche de la cuisine montre son rappel en retard', fc.rappels.some((r) => r.retard === 2 && !r.fait_le) && fc.jour === '2026-10-12')
  T('E6 exemple : le briefing du matin de l’atelier dit « À faire aujourd’hui » (3 rappels dont 1 en retard ; 4 dont 2 avec l’après-chantier)', (await imp('lib/crm/alertes.ts')).construireBriefing(v.atelier).some((x) => x.cle === 'rappels' && (apres ? /4 rappels, dont 2 en retard/ : /3 rappels, dont 1 en retard/).test(x.texte)))

  // Le code des routes : garde, borne au compte, envoi seulement après décision et contrôle.
  const env = sansCommentaires(lire('app/api/crm/relances/envoyer/route.ts'))
  const i = (s) => env.indexOf(s)
  T('E7 envoi d’une relance : message contrôlé et décision prise AVANT l’envoi ; une seule par devis et par minute ; e-mail au nom de l’artisan ; historique sans le texte',
    i('controlerMessageRelance(') > 0 && i('decisionRelance(') > 0 && i('consommerLimite(`crm-relance:${g.uid}:${devisId}`, 1, 60)') > i('decisionRelance(') && i('await sendEmail(') > i('consommerLimite(') && /fromName: nom/.test(env) && /transactionnel: true/.test(env) && /text: msg\.texte/.test(env) && /texte: `Relance n° \$\{envoyees \+ 1\} envoyée par e-mail`/.test(env) && !/attachments/.test(env))
  const prep = sansCommentaires(lire('app/api/crm/relances/route.ts'))
  T('E8 préparer une relance n’envoie RIEN (aucun e-mail, aucune écriture)', !/sendEmail|\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(prep))
  const page = sansCommentaires(lire('app/crm/clients/[ref]/page.tsx'))
  T('E9 fiche client : Appeler (tel:), Écrire, + Note, + Rappel, Nouveau devis en tête ; prochain rendez-vous rempli ; fil filtrable', /href=\{`tel:/.test(page) && />Écrire</.test(page) && />\+ Note</.test(page) && />\+ Rappel</.test(page) && />Nouveau devis</.test(page) && /prochainRendezVous/.test(page) && /FILTRES_CHRONO\.map/.test(page))
  const tab = lire('app/crm/Tableau.tsx')
  T('E10 tableau de bord : la tuile « Relances dues » mène aux devis à relancer ; « À faire aujourd’hui » en tête', /'#crm-relances-dues'/.test(tab) && /<AFaireAujourdhui/.test(tab) && /<RelancesDevis/.test(tab))
  const rap = sansCommentaires(lire('app/crm/Rappels.tsx'))
  T('E11 l’envoi demande une confirmation (« Envoyer cette relance par e-mail à … ? ») ; toute écriture passe par appel() (bloquée en exemple)', /confirm\(`Envoyer cette relance par e-mail à \$\{dest\} \?`\)/.test(rap) && !/\bfetch\(/.test(rap))

  // 18/10 : monter et démonter le panneau du rappel à chaque ouverture faisait tomber l'onglet sous crm-exemple-qa (pipeline, fiches).
  const inclut = (s, t) => s.includes(t)
  T('E11b le panneau du rappel est masqué (hidden), jamais monté et démonté à chaque ouverture ; la fiche client n’empile plus deux boutons',
    inclut(rap, 'className="crm-rappel-rapides" role="group" aria-label="Me le rappeler" hidden={!ouvert}') && inclut(rap, 'aria-label="Poser un rappel" hidden={!ouvert}') && !inclut(rap, 'ouvert && !complet &&') && !inclut(rap, 'ouvert && complet &&')
    && inclut(page, 'libelle="+ Rappel"') && !inclut(page, 'setRappel') && inclut(lire('app/crm/crm.css'), '.crm-rappel-rapides[hidden], .crm-rappel-form[hidden] { display: none }'))

  // La migration 0162 et son jumeau.
  const mig = lire('supabase/migrations/0162_crm_rappels.sql'), sql = mig.replace(/^\s*--.*$/gm, '')
  T('E12 0162 : état en tête (non appliquée), idempotente (if not exists / drop … if exists), cascade depuis le compte et les cibles',
    /NON APPLIQUÉE/.test(mig.slice(0, 300)) && /create table if not exists public\.crm_rappels/.test(sql) && (sql.match(/on delete cascade/g) ?? []).length === 4 && !/drop table|alter table public\.artisans/i.test(sql))
  T('E13 0162 : RLS « ses lignes », garde de session et de suspension, rien pour anon, aucune écriture directe, déclencheur anti-cible d’un autre compte',
    /alter table public\.crm_rappels enable row level security/.test(sql) && /create policy crm_rappels_lecture on public\.crm_rappels for select to authenticated\s+using \(\(select auth\.uid\(\)\) = artisan_id\)/.test(sql) && (sql.match(/as restrictive/g) ?? []).length === 4 && /revoke all on public\.crm_rappels from anon/.test(sql) && /revoke insert, update, delete on public\.crm_rappels from authenticated/.test(sql) && /crm : devis d un autre artisan/.test(sql) && /crm : chantier d un autre artisan/.test(sql) && /crm : demande d un autre artisan/.test(sql) && /set search_path = ''/.test(sql))
  T('E14 0162 : une cible exactement (num_nonnulls = 1), contrôles du bas avec résultats attendus', /num_nonnulls\(client_cle, lead_id, devis_id, chantier_id\) = 1/.test(sql) && (mig.match(/-- \[(1|5|false|true)\]/g) ?? []).length >= 5)
  // Comme scripts/migrations-jumelles-e2e.mjs : le pied « CONTROLE APRES COLLAGE » (lecture seule) est coupé avant de comparer.
  const { sansCommentaires: scSql, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
  const lignesSql = (s) => scSql(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
  const jumeauBrut = lire('supabase/migrations/_A_COLLER_sql_editor_0162_NU.sql')
  T('E15 le jumeau _A_COLLER_sql_editor_0162_NU.sql porte le même SQL (hors pied de contrôle, qui ne fait que LIRE)', egal(lignesSql(jumeauBrut.split(MARQUE_CONTROLE)[0]), lignesSql(mig)) && /pg_policies/.test(jumeauBrut.split(MARQUE_CONTROLE)[1] ?? '') && !/^\s*(insert|update|delete|alter|create|drop)\b/im.test(jumeauBrut.split(MARQUE_CONTROLE)[1] ?? ''))
  const Trr = await imp('lib/crm/tempsReel.ts')
  T('E16 temps réel : crm_rappels est écouté (filtre du compte) et publié par 0162', Trr.TABLES_TEMPS_REEL.includes('crm_rappels') && /alter publication supabase_realtime add table public\.crm_rappels/.test(sql))
  const ab = Trr.abonnements(U(42), ['crm_rappels'])
  T('E17 table absente (0162 pas encore appliquée) : l’écran ne l’écoute pas — sinon TOUT le canal tombe — et garde les autres tables', ab.length === Trr.TABLES_TEMPS_REEL.length - 1 && !ab.some((a) => a.table === 'crm_rappels') && /sans: vue && vue\.rappels && !vue\.rappels\.disponibles \? \['crm_rappels'\] : \[\]/.test(lire('app/crm/page.tsx')))
}

// ═══════════════════════ L. En vrai ═══════════════════════
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
  // Une requête HEAD ne rend pas l'erreur d'une table absente : on lit vraiment (zéro ou une ligne).
  const { error: absente } = await admin.from('crm_rappels').select('id').limit(1)
  if (absente) console.log(`\n⏸  L non joué : la table crm_rappels n’existe pas (${absente.code}) — appliquer la migration 0162, puis rejouer.`)
  else {
    const comptes = []
    const canaux = []
    const creer = async (nom, plan) => {
      const slug = `lot2-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
      const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
      const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
      if (error) throw new Error(`compte ${nom} : ${error.message}`)
      comptes.push(u.user.id)
      const { error: ea } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Test lot 2 ${nom}`, metier: 'Plombier', slug, plan })
      if (ea) throw new Error(`fiche ${nom} : ${ea.message}`)
      const nav = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: s, error: es } = await nav.auth.signInWithPassword({ email, password: mdp })
      if (es) throw new Error(`connexion ${nom} : ${es.message}`)
      await verifierSessionTest(s.session.access_token)
      return { uid: u.user.id, jeton: s.session.access_token, nav }
    }
    const http = async (c, chemin, init = {}) => {
      const r = await fetch(`${BASE}${chemin}`, { method: init.method ?? 'GET', headers: { Authorization: `Bearer ${c.jeton}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: init.body !== undefined ? JSON.stringify(init.body) : undefined })
      return { status: r.status, corps: await r.json().catch(() => null) }
    }
    try {
      console.log('\n── L. Comptes de test, données semées par la clé de service')
      const [CA, CB, CS] = [await creer('A', 'signature'), await creer('B', 'signature'), await creer('S', 'studio')]
      const il_y_a = (j) => new Date(Date.now() - j * 864e5).toISOString()
      const { data: lead } = await admin.from('leads').insert({ artisan_id: CA.uid, nom_prospect: 'Client lot 2', contact: 'client-lot2@presti-test.invalid', message: 'Bonjour, une salle d’eau', statut: 'repondu', token: crypto.randomUUID() }).select('id').single()
      const { data: d, error: ed } = await admin.from('devis').insert({ artisan_id: CA.uid, lead_id: lead.id, statut: 'envoye', numero: 'DEV-LOT2-1', objet: 'Salle d’eau', client_nom: 'Client lot 2', client_email: 'client-lot2@presti-test.invalid', total_ttc: 2400, total_ht: 2400, envoye_le: il_y_a(10), date_emission: il_y_a(10).slice(0, 10), created_at: il_y_a(11) }).select('id').single()
      if (ed) throw new Error(`devis : ${ed.message}`)
      const { data: chA } = await admin.from('chantiers').insert({ artisan_id: CA.uid, titre: 'Chantier lot 2', statut: 'planifie' }).select('id').single()
      const { data: chB } = await admin.from('chantiers').insert({ artisan_id: CB.uid, titre: 'Chantier de B', statut: 'planifie' }).select('id').single()

      // Le temps réel : A est abonné à SES rappels (le filtre de l'écran).
      const evts = []
      const canal = CA.nav.channel(`crm-lot2:${CA.uid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crm_rappels', filter: `artisan_id=eq.${CA.uid}` }, (p) => evts.push(p))
      await new Promise((ok) => { const t = setTimeout(ok, 12000); canal.subscribe((s) => { if (s === 'SUBSCRIBED') { clearTimeout(t); ok() } }) })
      canaux.push([CA.nav, canal])

      const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const p1 = await http(CA, '/api/crm/rappels', { method: 'POST', body: { chantier_id: chA.id, type: 'visite', echeance: jour, heure: '09:30', texte: 'Visite technique' } })
      T('L1 poser un rappel sur SON chantier : 201', p1.status === 201 && typeof p1.corps?.id === 'string', JSON.stringify(p1))
      const croise = await http(CA, '/api/crm/rappels', { method: 'POST', body: { chantier_id: chB.id, echeance: jour } })
      T('L2 sur le chantier d’un AUTRE compte : 404 (rien n’est écrit)', croise.status === 404)
      const studio = await http(CS, '/api/crm/rappels', { method: 'POST', body: { chantier_id: chA.id, echeance: jour } })
      T('L3 compte Studio : 403 (offre)', studio.status === 403 && studio.corps?.code === 'offre')
      const faux = await http(CA, '/api/crm/rappels', { method: 'POST', body: { client: 'f'.repeat(64), echeance: jour } })
      const mal = await http(CA, '/api/crm/rappels', { method: 'POST', body: { chantier_id: chA.id, echeance: jour, artisan_id: CB.uid } })
      T('L4 client inconnu : 404 ; champ artisan_id glissé dans le corps : 400', faux.status === 404 && mal.status === 400, `${faux.status} ${mal.status}`)
      const v1 = await http(CA, '/api/crm/vue')
      T('L5 la vue : le rappel est « à faire aujourd’hui » ; le devis envoyé il y a 10 jours est à relancer, date sûre', v1.status === 200 && v1.corps.rappels.aFaire.aujourdhui.some((r) => r.id === p1.corps.id && r.cible.objet === 'chantier') && v1.corps.rappels.devisARelancer.some((x) => x.devisId === d.id && x.dateSure && x.jours === 10), JSON.stringify(v1.corps?.rappels?.aFaire).slice(0, 300))
      const autre = await http(CB, `/api/crm/rappels/${p1.corps.id}`, { method: 'PATCH', body: { fait: true } })
      T('L6 le compte B ne peut ni cocher ni supprimer le rappel de A (404)', autre.status === 404 && (await http(CB, `/api/crm/rappels/${p1.corps.id}`, { method: 'DELETE' })).status === 404)
      const coche = await http(CA, `/api/crm/rappels/${p1.corps.id}`, { method: 'PATCH', body: { fait: true } })
      const { data: lu } = await admin.from('crm_rappels').select('fait_le').eq('id', p1.corps.id).single()
      T('L7 cocher : fait_le posé', coche.status === 200 && !!lu.fait_le)
      // Attente bornée (8 s) des deux évènements, comme scripts/crm-temps-reel-qa.mjs.
      const recu = (type) => evts.some((e) => e.eventType === type && e.new?.id === p1.corps.id)
      for (let i = 0; i < 80 && !(recu('INSERT') && recu('UPDATE')); i++) await new Promise((r) => setTimeout(r, 100))
      T('L8 temps réel : l’écran abonné de A a reçu la création et la modification de son rappel', recu('INSERT') && recu('UPDATE'), `${evts.length} évènement(s) : ${evts.map((e) => e.eventType).join(', ')}`)
      const prep = await http(CA, '/api/crm/relances', { method: 'POST', body: { devis_id: d.id } })
      T('L9 préparer la relance : un message relisible, sans lien, adressé au client du devis ; RIEN n’est envoyé ni écrit', prep.status === 200 && /Salle d’eau/.test(prep.corps.message) && !/http/.test(prep.corps.message) && prep.corps.destinataire === 'client-lot2@presti-test.invalid' && (await admin.from('crm_rappels').select('id', { count: 'exact', head: true }).eq('devis_id', d.id)).count === 0, JSON.stringify(prep.corps).slice(0, 300))
      const lien = await http(CA, '/api/crm/relances/envoyer', { method: 'POST', body: { devis_id: d.id, message: 'Bonjour, voyez https://exemple.fr' } })
      T('L10 un message avec un lien est refusé (400), rien ne part', lien.status === 400)
      const env = await http(CA, '/api/crm/relances/envoyer', { method: 'POST', body: { devis_id: d.id, message: prep.corps.message } })
      const { data: apres } = await admin.from('crm_rappels').select('type, envoye_le, fait_le, echeance, origine, cle').eq('devis_id', d.id).order('cree_le')
      T('L11 envoyer (après relecture) : 201 ; l’historique (envoyée, faite) et le rappel dans 7 jours (posé par Presti) sont écrits — l’e-mail vers .invalid n’est jamais remis (lib/email.ts)',
        env.status === 201 && apres?.length === 2 && apres.some((x) => x.envoye_le && x.fait_le) && apres.some((x) => !x.fait_le && x.origine === 'systeme' && x.cle === `relance-devis:${d.id}:2`), JSON.stringify([env, apres]).slice(0, 400))
      const deux = await http(CA, '/api/crm/relances/envoyer', { method: 'POST', body: { devis_id: d.id, message: prep.corps.message } })
      T('L12 un double clic ne fait pas deux e-mails (429)', deux.status === 429)
      const autreEnvoi = await http(CB, '/api/crm/relances/envoyer', { method: 'POST', body: { devis_id: d.id, message: prep.corps.message } })
      T('L13 le compte B ne peut pas relancer le devis de A (404)', autreEnvoi.status === 404)
      const ref = (await http(CA, '/api/crm/clients')).corps?.clients?.[0]?.id
      await http(CA, '/api/crm/rappels', { method: 'POST', body: { client: ref, type: 'rendez_vous', echeance: '2099-01-02', heure: '17:00' } })
      const fiche = await http(CA, `/api/crm/clients?ref=${ref}`)
      T('L14 fiche client : prochain rendez-vous rempli ; le fil montre la demande, les échanges, le devis envoyé et la relance envoyée', fiche.status === 200 && fiche.corps.prochainRendezVous?.echeance === '2099-01-02' && ['Demande reçue', 'Devis envoyé', 'Relance du devis envoyée'].every((t) => fiche.corps.chronologie.some((e) => e.titre === t)), JSON.stringify(fiche.corps?.chronologie?.map((e) => e.titre)).slice(0, 300))
    } catch (e) {
      T('L erreur inattendue', false, e.message)
    } finally {
      for (const [nav, canal] of canaux) { try { await nav.removeChannel(canal) } catch { /* fermé */ } }
      let restes = 0
      for (const id of comptes) {
        const { error } = await admin.rpc('purger_compte_test', { p_id: id })
        if (error) console.log(`  ⚠️ purge ${id} : ${error.message}`)
        for (const t of ['crm_rappels', 'devis', 'chantiers', 'leads']) { const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', id); restes += count ?? 0 }
        const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', id); restes += count ?? 0
      }
      T(`L15 nettoyage : les ${comptes.length} comptes de test et toutes leurs lignes (rappels compris) sont supprimés`, restes === 0, `${restes} ligne(s) restent`)
    }
  }
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
