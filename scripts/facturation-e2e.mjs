// Test permanent — conformité de facturation (v4 §10).
//
// Ce qu'on prouve :
//   1. la mention de franchise n'est PAS figée : elle suit la date et le choix de
//      l'artisan (recodification CGI → CIBS au 01/09/2026, tolérance au 31/12/2027) ;
//   2. le SIREN du client est réellement vérifié (clé de Luhn), pas juste compté ;
//   3. les mentions obligatoires des documents sont JUSTES : l'indemnité de 40 € n'est
//      réclamée qu'entre professionnels, l'escompte est écrit même quand il n'y en a pas,
//      et rien (date de prestation, chantier, SIREN, assurance) n'est inventé quand la
//      donnée manque — audit final, auditeur B, A2/A10/A11 et E4 ;
//   4. une facture ÉMISE est scellée : ni ses montants, ni son numéro, ni son client ne
//      peuvent changer, et elle ne peut pas être supprimée. Le verrou est en BASE, donc
//      il tient même si un jour du code oublie de le vérifier.
//
// Usage : node scripts/facturation-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
// lib/devisPdfData.ts s'importe avec l'alias « @/ » : ce hook le résout pour Node. Il doit
// être POSÉ avant le chargement du module, d'où l'import dynamique plus bas (les imports
// statiques d'un fichier sont tous résolus avant que son corps ne s'exécute).
import './ts-loader.mjs'
import {
  mentionFranchise, sirenValide, basesParTaux, empreinte,
  toleranceCgiEncoreValable, codeExonerationParDefaut, MOTIFS_EXONERATION,
} from '../lib/facturation.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. La mention de franchise suit la loi, pas une constante')
const avant = new Date('2026-01-15')
const apres = new Date('2026-10-01')
const bienApres = new Date('2028-03-01')
T('avant le 01/09/2026, « auto » cite le CGI', /293 B du CGI/.test(mentionFranchise('auto', avant)), mentionFranchise('auto', avant))
T('pendant la tolérance, « auto » cite encore le CGI — la même référence que Presti sur ses propres documents', /293 B du CGI/.test(mentionFranchise('auto', apres)), mentionFranchise('auto', apres))
T('passé la tolérance, « auto » bascule sur le CIBS', /CIBS/.test(mentionFranchise('auto', bienApres)), mentionFranchise('auto', bienApres))
T('un artisan peut garder le CGI pendant la tolérance', /293 B du CGI/.test(mentionFranchise('cgi', apres)))
T('passé la tolérance, le CGI n’est plus servi même sur demande', /CIBS/.test(mentionFranchise('cgi', bienApres)), mentionFranchise('cgi', bienApres))
T('« cibs » force la nouvelle référence à toute date', /CIBS/.test(mentionFranchise('cibs', avant)))
T('la tolérance est bien ouverte aujourd’hui', toleranceCgiEncoreValable(new Date('2027-06-01')) === true)
T('et fermée en 2028', toleranceCgiEncoreValable(bienApres) === false)

console.log('\n── 2. SIREN : la clé est vérifiée, pas seulement la longueur')
T('SIREN valide accepté (Danone, 552032534)', sirenValide('552032534'))
T('SIRET valide accepté (14 chiffres)', sirenValide('55203253400646'))
T('les espaces ne gênent pas', sirenValide('552 032 534'))
T('un chiffre modifié est refusé', !sirenValide('552032535'))
T('9 chiffres au hasard sont refusés', !sirenValide('123456789'))
T('trop court : refusé', !sirenValide('5520325'))
T('vide : refusé', !sirenValide('') && !sirenValide(null))
T('La Poste, seule exception connue, est acceptée', sirenValide('356000000'))

console.log('\n── 3. Bases HT par taux (exigées par EN 16931)')
const lignes = [
  { quantite: 2, prix_unitaire_ht: 100, tva_taux: 10 },
  { quantite: 1, prix_unitaire_ht: 50, tva_taux: 10 },
  { quantite: 3, prix_unitaire_ht: 20, tva_taux: 20 },
  { quantite: 1, prix_unitaire_ht: 80, tva_taux: 5.5 },
]
const bases = basesParTaux(lignes)
T('un bloc par taux, dans l’ordre', bases.map((b) => b.taux).join(',') === '5.5,10,20', JSON.stringify(bases.map((b) => b.taux)))
T('base 10 % = 250 €', bases.find((b) => b.taux === 10).base_ht === 250, JSON.stringify(bases))
T('TVA 10 % = 25 €', bases.find((b) => b.taux === 10).tva === 25)
T('TVA 5,5 % arrondie au centime', bases.find((b) => b.taux === 5.5).tva === 4.4, String(bases.find((b) => b.taux === 5.5)?.tva))
const remisees = basesParTaux(lignes, 10)
T('la remise s’applique à chaque base', remisees.find((b) => b.taux === 10).base_ht === 225, JSON.stringify(remisees))

console.log('\n── 4. Motifs d’exonération codifiés')
T('la franchise a un code par défaut', codeExonerationParDefaut('franchise') === 'VATEX-FR-FRANCHISE')
T('un assujetti n’en a pas', codeExonerationParDefaut('reel') === null)
T('tous les motifs ont un code et une mention', MOTIFS_EXONERATION.every((m) => m.code && m.label && m.mention))

console.log('\n── 5. Empreinte')
const e1 = await empreinte('facture A')
const e2 = await empreinte('facture A')
const e3 = await empreinte('facture B')
T('même contenu, même empreinte', e1 === e2)
T('contenu différent, empreinte différente', e1 !== e3)
T('64 caractères hexadécimaux (SHA-256)', /^[0-9a-f]{64}$/.test(e1), e1)

console.log('\n── 6. Mentions obligatoires des documents (PDF)')
const { buildPdfData, mentionsReglement, MENTION_TVA_DEBITS } = await import('../lib/devisPdfData.ts')

const artisanPdf = {
  nom: 'Plomberie Martin', metier: 'Plombier', forme_juridique: 'EI',
  adresse: '12 rue des Lilas', code_postal: '44000', ville: 'Nantes', siret: '55203253400646',
  email: 'contact@plomberie-martin.fr', tva_regime: 'reel', tva_num: 'FR40552032534', tva_sur_debits: true,
  assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-778812',
  assurance_activites: 'garantie décennale — plomberie', assurance_zone: 'France métropolitaine',
}
const lignesPdf = [{ designation: 'Pose', quantite: 1, unite: 'u', prix_unitaire_ht: 1000, tva_taux: 10 }]

T('un particulier ne se voit pas réclamer l’indemnité de 40 € (art. L. 441-10 : entre pros)',
  !mentionsReglement(false).some((m) => /40 €/.test(m)), mentionsReglement(false).join(' '))
T('un client professionnel, si', mentionsReglement(true).some((m) => /40 €/.test(m)))
T('les pénalités de retard sont dues dans les deux cas (art. L. 441-9)',
  [false, true].every((pro) => mentionsReglement(pro).some((m) => /Pénalités de retard/.test(m))))
T('l’escompte est écrit même quand il n’y en a pas : « néant »',
  mentionsReglement(false).some((m) => /[Ee]scompte.*néant/.test(m)))

const facturePro = buildPdfData({
  numero: 'FAC-2026-0042', date_emission: '2026-09-03', date_prestation: '2026-08-28',
  client_nom: 'SCI Bellevue', client_adresse: '3 place du Marché, 44000 Nantes', client_siren: '552032534',
  adresse_chantier: '18 avenue de la Gare, 44300 Nantes', objet: 'Réfection salle de bain',
}, lignesPdf, artisanPdf, 'facture')
T('facture B2B : le SIREN du client est rendu, groupé par trois', facturePro.clientSiren === '552 032 534', facturePro.clientSiren)
T('l’adresse du chantier est rendue (art. 242 nonies A)', facturePro.adresseChantier === '18 avenue de la Gare, 44300 Nantes')
T('la date de la prestation est rendue en clair', facturePro.datePrestation === '28 août 2026', facturePro.datePrestation)
T('la facture d’un pro porte l’indemnité de 40 €', (facturePro.mentionsReglement ?? []).some((m) => /40 €/.test(m)))
T('… et la mention TVA d’après les débits (art. 77 ann. III CGI)', facturePro.mentionTvaDebits === MENTION_TVA_DEBITS)
T('assurance : assureur, n° de contrat ET couverture géographique (art. L. 243-2 c. ass.)',
  /AXA France IARD/.test(facturePro.assurance) && /DEC-778812/.test(facturePro.assurance) && /France métropolitaine/.test(facturePro.assurance),
  facturePro.assurance)

// ── L'avoir rend EXACTEMENT ce que la facture a encaissé ────────────────────────────────────────
//
// Le 08/09, l'avoir posait `remise_pct: 0` en recopiant les lignes de la facture annulée. La base
// stockait le bon total (-900), mais le PDF ne lit pas les totaux scellés : il recalcule depuis
// les lignes et la remise. Le client recevait donc -1 000 pour une facture de 900 — cent euros
// rendus en trop, sur une pièce scellée qu'on ne peut plus corriger.
//
// Ce test regarde ce que le CLIENT reçoit. Un test qui aurait vérifié la base serait passé.
{
  const lignesAvoir = lignesPdf.map((l) => ({ ...l, prix_unitaire_ht: -Math.abs(l.prix_unitaire_ht) }))
  const facture = buildPdfData({ numero: 'FAC-2026-0100', date_emission: '2026-09-08', client_nom: 'Mme Durand', remise_pct: 10 }, lignesPdf, artisanPdf, 'facture')
  const avoir = buildPdfData({ numero: 'FAC-2026-0101', date_emission: '2026-09-08', client_nom: 'Mme Durand', remise_pct: 10, avoir_de: 'x' }, lignesAvoir, artisanPdf, 'facture')
  T('⭑ un avoir rend exactement ce que sa facture a facturé, remise comprise',
    Math.abs(avoir.totalTtc + facture.totalTtc) < 0.005,
    `facture ${facture.totalTtc} ↔ avoir ${avoir.totalTtc}`)

  const avoirSansRemise = buildPdfData({ numero: 'FAC-2026-0102', date_emission: '2026-09-08', client_nom: 'Mme Durand', remise_pct: 0, avoir_de: 'x' }, lignesAvoir, artisanPdf, 'facture')
  T('… et sans la remise reportée, il rendrait trop — c’est le défaut du 08/09',
    Math.abs(avoirSansRemise.totalTtc) > Math.abs(facture.totalTtc),
    `${avoirSansRemise.totalTtc} contre ${facture.totalTtc}`)
}

const facturePart = buildPdfData({ numero: 'FAC-2026-0043', date_emission: '2026-09-03', client_nom: 'Mme Durand' }, lignesPdf, artisanPdf, 'facture')
T('facture d’un particulier : aucune indemnité de 40 €', !(facturePart.mentionsReglement ?? []).some((m) => /40 €/.test(m)))
T('aucune date de prestation inventée quand la donnée manque', facturePart.datePrestation === '', facturePart.datePrestation)
T('aucune adresse de chantier inventée', facturePart.adresseChantier === '')
T('aucun SIREN inventé', facturePart.clientSiren === '')
T('un assureur seul ne fabrique ni contrat ni zone',
  buildPdfData({ numero: 'X', client_nom: 'Y' }, lignesPdf, { ...artisanPdf, assurance_contrat: null, assurance_activites: null, assurance_zone: null }, 'facture').assurance === 'AXA France IARD.')
T('en franchise, la TVA d’après les débits n’a pas d’objet',
  buildPdfData({ numero: 'X', client_nom: 'Y' }, lignesPdf, { ...artisanPdf, tva_regime: 'franchise' }, 'facture').mentionTvaDebits === '')

const devisPart = buildPdfData({ numero: 'DEV-2026-0007', date_emission: '2026-09-03', client_nom: 'Mme Durand', objet: 'Réfection salle de bain' }, lignesPdf, artisanPdf)
T('devis d’un particulier : le formulaire de rétractation est fourni (art. L. 221-5, annexe R. 221-1)',
  /Plomberie Martin/.test(devisPart.retractationDestinataire) && /12 rue des Lilas, 44000 Nantes/.test(devisPart.retractationDestinataire),
  devisPart.retractationDestinataire)
T('il porte le courriel où notifier la rétractation', /contact@plomberie-martin\.fr/.test(devisPart.retractationDestinataire))
T('un devis ne porte pas les mentions de règlement d’une facture', (devisPart.mentionsReglement ?? []).length === 0)
T('devis adressé à un professionnel identifié : pas de formulaire',
  buildPdfData({ numero: 'DEV-8', client_nom: 'SCI Bellevue', client_siren: '552032534' }, lignesPdf, artisanPdf).retractationDestinataire === '')
T('facture : jamais de formulaire de rétractation', facturePart.retractationDestinataire === '')

console.log('\n── 7. Une facture émise est scellée — verrou en BASE')
let uid = null
try {
  const email = `verif-fact-${Date.now()}@presti-test.invalid`
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({ id: uid, email, nom: 'Vérif Facture', metier: 'Plombier', slug: `verif-fact-${Date.now()}`, plan: 'studio' })

  const { data: f, error: ef } = await sb.from('factures').insert({
    artisan_id: uid, numero: 'FAC-2026-0001', statut: 'emise', objet: 'Test',
    client_nom: 'Client Test', client_siren: '552032534',
    total_ht: 1000, total_tva: 100, total_ttc: 1100,
    date_emission: new Date().toISOString().slice(0, 10),
  }).select('id').single()
  if (ef) throw new Error('création facture : ' + ef.message)

  // Tant qu'elle n'est pas scellée, on peut encore corriger : c'est voulu (brouillon).
  const { error: eLibre } = await sb.from('factures').update({ total_ht: 1200 }).eq('id', f.id)
  T('avant scellement, la correction reste possible', !eLibre, eLibre?.message)

  await sb.from('factures').update({ verrouillee: true, emise_le: new Date().toISOString(), empreinte: await empreinte('x') }).eq('id', f.id)

  const { error: eMontant } = await sb.from('factures').update({ total_ht: 9999 }).eq('id', f.id)
  T('après scellement, le montant est refusé', !!eMontant, 'la modification a été acceptée !')
  const { error: eNumero } = await sb.from('factures').update({ numero: 'FAC-2026-9999' }).eq('id', f.id)
  T('le numéro est refusé', !!eNumero)
  const { error: eClient } = await sb.from('factures').update({ client_nom: 'Quelqu’un d’autre' }).eq('id', f.id)
  T('le client est refusé', !!eClient)
  const { error: eSiren } = await sb.from('factures').update({ client_siren: '111111111' }).eq('id', f.id)
  T('le SIREN est refusé', !!eSiren)

  // Ce qui doit RESTER modifiable : l'état de règlement, et les notes.
  const { error: eStatut } = await sb.from('factures').update({ statut: 'payee' }).eq('id', f.id)
  T('le passage à « payée » reste possible', !eStatut, eStatut?.message)

  const { error: eSuppr } = await sb.from('factures').delete().eq('id', f.id)
  T('la suppression est refusée (conservation 10 ans)', !!eSuppr, 'la facture a été supprimée !')
  const { count } = await sb.from('factures').select('id', { count: 'exact', head: true }).eq('id', f.id)
  T('elle est toujours là', count === 1, `${count}`)

  // Nettoyage : on lève le verrou côté service_role pour pouvoir retirer la pièce de test.
  await sb.from('factures').update({ verrouillee: false }).eq('id', f.id)
  await sb.from('factures').delete().eq('id', f.id)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan de test supprimé')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
