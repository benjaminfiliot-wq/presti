// Test permanent — XML de facture électronique (v4 §10.3).
//
// Le risque d'un générateur XML fait main n'est pas qu'il « ne marche pas » : c'est
// qu'il produise un document plausible mais invalide, découvert le jour où la plateforme
// agréée le rejette. On vérifie donc que le document est réellement bien formé, que les
// montants s'y retrouvent, et surtout qu'aucune donnée n'est INVENTÉE quand elle manque.
//
// Usage : node scripts/facturx-e2e.mjs

import fs from 'node:fs'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { genererFacturX, controlerAvantEmission } from '../lib/facturx.ts'

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
void fs

const base = {
  numero: 'FAC-2026-0042',
  date_emission: '2026-09-03',
  date_echeance: '2026-10-03',
  devise: 'EUR',
  categorie_operation: 'mixte',
  exoneration_code: 'VATEX-FR-FRANCHISE',
  exoneration_mention: 'TVA non applicable, art. L. 223-1 et s. du CIBS.',
  vendeur: { nom: 'Plomberie Martin', siret: '55203253400646', tva: null, adresse: '12 rue des Lilas', code_postal: '44000', ville: 'Nantes', pays: 'FR' },
  acheteur: { nom: 'SCI Bellevue', siren: '552032534', adresse: '3 place du Marché, 44000 Nantes', pays: 'FR' },
  adresse_chantier: '18 avenue de la Gare, 44300 Nantes',
  lignes: [
    { designation: 'Chauffe-eau 200 L', quantite: 1, unite: 'u', prix_unitaire_ht: 640, tva_taux: 0 },
    { designation: 'Pose et raccordement', quantite: 4, unite: 'h', prix_unitaire_ht: 55, tva_taux: 0 },
    { designation: 'Tube cuivre', quantite: 12, unite: 'ml', prix_unitaire_ht: 8.5, tva_taux: 0 },
  ],
  remise_pct: 0,
  total_ht: 962, total_tva: 0, total_ttc: 962,
  franchise: true,
}

console.log('\n── 1. Le document est réellement bien formé')
const xml = genererFacturX(base)
const validation = XMLValidator.validate(xml)
T('XML valide (analyseur strict)', validation === true, JSON.stringify(validation))
T('déclaration UTF-8', xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
T('profil EN 16931 déclaré', xml.includes('urn:cen.eu:en16931:2017'))
T('type de document 380 (facture)', xml.includes('<ram:TypeCode>380</ram:TypeCode>'))

// parseTagValue/parseAttributeValue à false : en XML tout est texte. Sans ça l'analyseur
// convertit « 962.00 » en 962 et « 55203253400646 » en nombre, et on ne compare plus ce
// que le document contient réellement.
const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false, parseAttributeValue: false })
const doc = p.parse(xml)['rsm:CrossIndustryInvoice']
const tx = doc['rsm:SupplyChainTradeTransaction']

console.log('\n── 2. Les données de la facture s’y retrouvent')
T('numéro', doc['rsm:ExchangedDocument']['ram:ID'] === 'FAC-2026-0042')
T('date au format 102 (AAAAMMJJ)', String(doc['rsm:ExchangedDocument']['ram:IssueDateTime']['udt:DateTimeString']['#text']) === '20260903')
T('3 lignes', tx['ram:IncludedSupplyChainTradeLineItem'].length === 3)
const som = tx['ram:ApplicableHeaderTradeSettlement']['ram:SpecifiedTradeSettlementHeaderMonetarySummation']
T('total HT', som['ram:LineTotalAmount'] === '962.00', String(som['ram:LineTotalAmount']))
T('total TTC', som['ram:GrandTotalAmount'] === '962.00')
T('reste à payer', som['ram:DuePayableAmount'] === '962.00')

console.log('\n── 3. Identifiants et adresses')
const vendeur = tx['ram:ApplicableHeaderTradeAgreement']['ram:SellerTradeParty']
const acheteur = tx['ram:ApplicableHeaderTradeAgreement']['ram:BuyerTradeParty']
T('SIRET du vendeur, schéma 0009', vendeur['ram:ID']['#text'] === '55203253400646' && vendeur['ram:ID']['@schemeID'] === '0009')
T('SIREN du client, schéma 0002', acheteur['ram:ID']['#text'] === '552032534' && acheteur['ram:ID']['@schemeID'] === '0002')
T('l’adresse de CHANTIER est portée comme lieu de livraison',
  tx['ram:ApplicableHeaderTradeDelivery']['ram:ShipToTradeParty']['ram:PostalTradeAddress']['ram:LineOne'] === '18 avenue de la Gare, 44300 Nantes')

console.log('\n── 4. Unités et TVA')
const unites = tx['ram:IncludedSupplyChainTradeLineItem'].map((l) => l['ram:SpecifiedLineTradeDelivery']['ram:BilledQuantity']['@unitCode'])
T('u → C62, h → HUR, ml → MTR', unites.join(',') === 'C62,HUR,MTR', unites.join(','))
const tva = tx['ram:ApplicableHeaderTradeSettlement']['ram:ApplicableTradeTax']
T('franchise ⇒ catégorie E (exonéré)', tva['ram:CategoryCode'] === 'E', tva['ram:CategoryCode'])
T('motif d’exonération codifié', tva['ram:ExemptionReasonCode'] === 'VATEX-FR-FRANCHISE')
T('et sa mention en clair', /CIBS/.test(tva['ram:ExemptionReason']))

console.log('\n── 5. Une unité inconnue ne produit pas un code inventé')
const bizarre = genererFacturX({ ...base, lignes: [{ designation: 'X', quantite: 1, unite: 'palette', prix_unitaire_ht: 10, tva_taux: 0 }], total_ht: 10, total_ttc: 10 })
T('« palette » retombe sur C62', bizarre.includes('unitCode="C62"'))

console.log('\n── 6. Aucune donnée inventée quand elle manque')
const sansIds = genererFacturX({ ...base, vendeur: { ...base.vendeur, siret: null, tva: null }, acheteur: { ...base.acheteur, siren: null }, adresse_chantier: null })
T('pas de SIRET vendeur ⇒ balise absente, pas vide', !sansIds.includes('schemeID="0009"'))
T('pas de SIREN client ⇒ balise absente', !sansIds.includes('schemeID="0002"'))
T('pas d’adresse de chantier ⇒ pas de lieu de livraison', !sansIds.includes('ShipToTradeParty'))
T('le document reste valide sans ces données', XMLValidator.validate(sansIds) === true)

console.log('\n── 7. Les caractères spéciaux ne cassent pas le document')
const piegeux = genererFacturX({
  ...base,
  vendeur: { ...base.vendeur, nom: 'Martin & Fils <SARL>' },
  acheteur: { ...base.acheteur, nom: 'Dupont "Immo" & Cie' },
  lignes: [{ designation: 'Pose de 3 m² <sous-sol> & finitions', quantite: 1, unite: 'u', prix_unitaire_ht: 100, tva_taux: 0 }],
  total_ht: 100, total_ttc: 100,
})
T('XML toujours valide avec &, < et guillemets', XMLValidator.validate(piegeux) === true)
const dp = p.parse(piegeux)['rsm:CrossIndustryInvoice']['rsm:SupplyChainTradeTransaction']
T('le nom est restitué à l’identique après relecture',
  dp['ram:ApplicableHeaderTradeAgreement']['ram:SellerTradeParty']['ram:Name'] === 'Martin & Fils <SARL>',
  dp['ram:ApplicableHeaderTradeAgreement']['ram:SellerTradeParty']['ram:Name'])

console.log('\n── 8. Les contrôles attrapent ce qui ferait rejeter la facture')
T('facture complète : aucun souci', controlerAvantEmission(base).length === 0, JSON.stringify(controlerAvantEmission(base)))
T('SIRET manquant signalé', controlerAvantEmission({ ...base, vendeur: { ...base.vendeur, siret: null } }).some((s) => /SIRET/.test(s)))
T('aucune ligne signalé', controlerAvantEmission({ ...base, lignes: [] }).some((s) => /aucune ligne/.test(s)))
T('motif d’exonération manquant signalé', controlerAvantEmission({ ...base, exoneration_code: null }).some((s) => /exonération/.test(s)))
T('total incohérent signalé', controlerAvantEmission({ ...base, total_ht: 500 }).some((s) => /ne correspond pas/.test(s)))
T('numéro manquant signalé', controlerAvantEmission({ ...base, numero: '' }).some((s) => /numéro/.test(s)))

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
