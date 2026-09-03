// Facture électronique — XML CII, profil EN 16931 (v4 §10.3).
//
// C'est la pièce qui rend Presti « solution compatible » : la facture lisible reste le
// PDF, mais ce que l'administration et la plateforme agréée lisent, c'est cet XML.
//
// Deux règles tenues ici, et elles sont la raison d'être du fichier :
//  • aucune donnée inventée — un champ qu'on n'a pas n'est PAS émis, plutôt qu'émis faux.
//    Une facture électronique rejetée se corrige ; une facture acceptée avec un SIREN
//    fabriqué est un problème pour l'artisan ;
//  • l'échappement XML est systématique : un nom de client contenant « & » ou « < »
//    produirait sinon un document invalide, découvert au pire moment.
//
// ⚠️ Honnêteté sur l'état : cet XML suit la structure CII / EN 16931. Il n'a PAS encore
// été passé au Schematron officiel EN 16931 + CIUS France, ni embarqué dans un PDF/A-3
// validé par VeraPDF. Tant que ces deux vérifications ne sont pas faites, on parle d'un
// XML conforme à la structure, pas d'une facture Factur-X certifiée.

import { basesParTaux, type BaseTaux } from './facturation.ts'

export type LigneFacture = {
  designation: string; quantite: number; unite: string
  prix_unitaire_ht: number; tva_taux: number
}

export type DonneesFacturX = {
  numero: string
  date_emission: string           // AAAA-MM-JJ
  date_echeance?: string | null
  devise?: string
  categorie_operation?: 'biens' | 'services' | 'mixte'
  exoneration_code?: string | null
  exoneration_mention?: string | null
  vendeur: { nom: string; siret?: string | null; tva?: string | null; adresse?: string | null; code_postal?: string | null; ville?: string | null; pays?: string }
  acheteur: { nom: string; siren?: string | null; adresse?: string | null; pays?: string }
  adresse_chantier?: string | null
  lignes: LigneFacture[]
  remise_pct?: number
  total_ht: number
  total_tva: number
  total_ttc: number
  franchise: boolean
}

/** Échappement XML. Systématique : un « & » dans un nom d'entreprise casse tout le document. */
const x = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const n2 = (v: number) => (Math.round(Number(v) * 100) / 100).toFixed(2)

/** Unités CEFACT (rec. 20). Non reconnue ⇒ C62 (« unité »), jamais un code inventé. */
const UNITES: Record<string, string> = {
  u: 'C62', unite: 'C62', 'ens.': 'C62', ens: 'C62', forfait: 'C62', lot: 'C62',
  ml: 'MTR', m: 'MTR', 'm²': 'MTK', m2: 'MTK', 'm³': 'MTQ', m3: 'MTQ',
  h: 'HUR', j: 'DAY', kg: 'KGM', l: 'LTR',
}
const codeUnite = (u: string) => UNITES[String(u || 'u').toLowerCase().trim()] ?? 'C62'

/**
 * Catégorie de TVA (UNTDID 5305) :
 *  S = taux normal ou réduit · E = exonéré · AE = autoliquidation.
 * La franchise en base se déclare en E avec son motif codifié.
 */
const categorieTva = (taux: number, franchise: boolean) => (franchise || taux === 0 ? 'E' : 'S')

export function genererFacturX(d: DonneesFacturX): string {
  const devise = d.devise || 'EUR'
  const date = (s: string) => String(s).slice(0, 10).replace(/-/g, '')
  const bases: BaseTaux[] = basesParTaux(d.lignes, d.remise_pct ?? 0)

  const lignes = d.lignes.map((l, i) => {
    const ht = Math.round(Number(l.quantite) * Number(l.prix_unitaire_ht) * 100) / 100
    const cat = categorieTva(Number(l.tva_taux), d.franchise)
    return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${x(l.designation)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${n2(l.prix_unitaire_ht)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${codeUnite(l.unite)}">${n2(l.quantite)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${cat}</ram:CategoryCode>
          <ram:RateApplicablePercent>${n2(l.tva_taux)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${n2(ht)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
  }).join('\n')

  const taxes = bases.map((b) => {
    const cat = categorieTva(b.taux, d.franchise)
    const motif = cat === 'E' && d.exoneration_code
      ? `\n        <ram:ExemptionReason>${x(d.exoneration_mention || '')}</ram:ExemptionReason>\n        <ram:ExemptionReasonCode>${x(d.exoneration_code)}</ram:ExemptionReasonCode>`
      : ''
    return `      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${n2(b.tva)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${motif}
        <ram:BasisAmount>${n2(b.base_ht)}</ram:BasisAmount>
        <ram:CategoryCode>${cat}</ram:CategoryCode>
        <ram:RateApplicablePercent>${n2(b.taux)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`
  }).join('\n')

  // Un identifiant qu'on n'a pas n'est PAS émis : mieux vaut un champ absent qu'un
  // champ faux, qu'on ne pourrait plus corriger une fois la facture transmise.
  const vendeurIds = [
    d.vendeur.siret ? `        <ram:ID schemeID="0009">${x(d.vendeur.siret.replace(/\s/g, ''))}</ram:ID>` : '',
    d.vendeur.tva ? `        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${x(d.vendeur.tva)}</ram:ID></ram:SpecifiedTaxRegistration>` : '',
  ].filter(Boolean).join('\n')
  const acheteurId = d.acheteur.siren
    ? `        <ram:ID schemeID="0002">${x(d.acheteur.siren.replace(/\s/g, ''))}</ram:ID>\n`
    : ''

  const adresseVendeur = `        <ram:PostalTradeAddress>${d.vendeur.code_postal ? `\n          <ram:PostcodeCode>${x(d.vendeur.code_postal)}</ram:PostcodeCode>` : ''}${d.vendeur.adresse ? `\n          <ram:LineOne>${x(d.vendeur.adresse)}</ram:LineOne>` : ''}${d.vendeur.ville ? `\n          <ram:CityName>${x(d.vendeur.ville)}</ram:CityName>` : ''}
          <ram:CountryID>${x(d.vendeur.pays || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>`

  // L'adresse de CHANTIER, quand elle diffère de l'adresse de facturation, est le lieu
  // de livraison au sens de la norme. C'est une information que l'artisan a et qui
  // manque presque toujours dans les factures du bâtiment.
  const livraison = d.adresse_chantier
    ? `      <ram:ShipToTradeParty>
        <ram:Name>${x(d.acheteur.nom)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${x(d.adresse_chantier)}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:ShipToTradeParty>\n`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${x(d.numero)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${date(d.date_emission)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${lignes}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${x(d.vendeur.nom)}</ram:Name>
${vendeurIds}
${adresseVendeur}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
${acheteurId}        <ram:Name>${x(d.acheteur.nom)}</ram:Name>
        <ram:PostalTradeAddress>${d.acheteur.adresse ? `\n          <ram:LineOne>${x(d.acheteur.adresse)}</ram:LineOne>` : ''}
          <ram:CountryID>${x(d.acheteur.pays || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
${livraison}    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${x(devise)}</ram:InvoiceCurrencyCode>
${taxes}
${d.date_echeance ? `      <ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${date(d.date_echeance)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>\n` : ''}      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${n2(d.total_ht)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${n2(d.total_ht)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${x(devise)}">${n2(d.total_tva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${n2(d.total_ttc)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${n2(d.total_ttc)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`
}

/**
 * Contrôles préalables à l'émission. Ils ne remplacent pas le Schematron officiel : ils
 * attrapent ce qui fait rejeter une facture dans la vie réelle, AVANT de la transmettre,
 * quand elle est encore corrigeable.
 */
export function controlerAvantEmission(d: DonneesFacturX): string[] {
  const soucis: string[] = []
  if (!d.numero?.trim()) soucis.push('Le numéro de facture est absent.')
  if (!/^\d{4}-\d{2}-\d{2}/.test(d.date_emission || '')) soucis.push('La date d’émission est absente ou mal formée.')
  if (!d.vendeur.nom?.trim()) soucis.push('Votre raison sociale est absente — renseignez-la dans Paramètres.')
  if (!d.vendeur.siret) soucis.push('Votre SIRET est absent : il est obligatoire sur une facture.')
  if (!d.acheteur.nom?.trim()) soucis.push('Le nom du client est absent.')
  if (!d.lignes.length) soucis.push('La facture ne comporte aucune ligne.')
  if (d.franchise && !d.exoneration_code) soucis.push('Le motif d’exonération de TVA n’est pas codifié.')
  const somme = basesParTaux(d.lignes, d.remise_pct ?? 0).reduce((s, b) => s + b.base_ht, 0)
  if (Math.abs(somme - d.total_ht) > 0.02) {
    soucis.push(`Le total HT (${n2(d.total_ht)} €) ne correspond pas à la somme des lignes (${n2(somme)} €).`)
  }
  return soucis
}
