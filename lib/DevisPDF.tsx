import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const CLAY = '#C15F3C'
const CLAY_SOFT = '#FBF1EC'
const INK = '#1A1915'
const MUTED = '#6b675c'
const FAINT = '#9a9385'
const LINE = '#efece3'
const OK = '#2c7a52'
const OK_SOFT = '#EAF5EE'
const eur = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',')} €`

export type PDFLigne = { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number }
export type PDFData = {
  numero: string; date: string; validiteDate: string; validiteJours: number
  entNom: string; entSub: string[]
  clientNom: string; clientAdresse: string; objet: string
  lignes: PDFLigne[]
  totalBrut: number; remisePct: number; remiseMontant: number; totalHt: number
  tvaParTaux: [string, number][]; totalTtc: number; acomptePct: number; acompteMontant: number
  franchise: boolean; mentionTva: string; assurance: string; conditions: string; iban: string
  type?: 'devis' | 'facture'; echeanceDate?: string
  logoUrl?: string | null; statut?: string | null
}

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 46, paddingHorizontal: 44, fontSize: 9, fontFamily: 'Helvetica', color: INK, lineHeight: 1.5 },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', maxWidth: 320 },
  logo: { width: 46, height: 46, marginRight: 11, objectFit: 'contain' },
  entNom: { fontFamily: 'Times-Bold', fontSize: 16, color: INK },
  sub: { color: MUTED, fontSize: 8.5, marginTop: 1.5 },
  metaWrap: { textAlign: 'right' },
  title: { fontFamily: 'Times-Bold', fontSize: 19, color: CLAY, letterSpacing: 1 },
  metaLine: { color: MUTED, fontSize: 8.5, marginTop: 2 },
  metaNum: { color: INK, fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  statusPill: { marginTop: 6, alignSelf: 'flex-end', fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1, paddingVertical: 2.5, paddingHorizontal: 8, borderRadius: 3 },

  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  label: { fontSize: 7, color: FAINT, letterSpacing: 1, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Bandeau facture : montant à payer + échéance
  payBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, backgroundColor: CLAY_SOFT, borderRadius: 7, borderLeftWidth: 3, borderLeftColor: CLAY, paddingVertical: 11, paddingHorizontal: 14 },
  payLabel: { fontSize: 7, color: CLAY, letterSpacing: 1.2, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  payAmt: { fontFamily: 'Times-Bold', fontSize: 17, color: INK },
  payDate: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: INK },

  th: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 5, marginTop: 20 },
  thText: { fontSize: 7, color: FAINT, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5 },
  cDesig: { flexGrow: 1, flexBasis: 0, paddingRight: 6 },
  cQte: { width: 66, textAlign: 'right' },
  cPu: { width: 62, textAlign: 'right' },
  cTva: { width: 40, textAlign: 'right' },
  cTot: { width: 68, textAlign: 'right' },

  totals: { marginLeft: 'auto', width: 238, marginTop: 14 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totSub: { color: MUTED },
  // Total TTC : bandeau corail (le montant clé ressort)
  grand: { backgroundColor: CLAY, borderRadius: 6, marginTop: 6, paddingVertical: 8, paddingHorizontal: 12 },
  grandText: { fontFamily: 'Times-Bold', fontSize: 13, color: '#fff' },
  acompte: { color: CLAY, fontFamily: 'Helvetica-Bold', marginTop: 4, paddingHorizontal: 12 },

  // Bloc paiement (RIB) — facture
  pay: { marginTop: 20, backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 11 },
  payTitle: { fontSize: 7, color: FAINT, letterSpacing: 1, marginBottom: 5, fontFamily: 'Helvetica-Bold' },
  payKey: { color: MUTED },
  payVal: { fontFamily: 'Helvetica-Bold', color: INK },

  sign: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 22 },
  signBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9c3b3', borderRadius: 5, padding: 8, width: 230, fontSize: 7.5, color: MUTED },
  legal: { marginTop: 18, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10, fontSize: 7.5, color: MUTED },
  legalTitle: { fontSize: 7, color: FAINT, letterSpacing: 1, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
})

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  payee: { label: 'PAYÉE', bg: OK_SOFT, color: OK },
  annulee: { label: 'ANNULÉE', bg: '#F1EFEA', color: MUTED },
}

export function DevisPDF({ d }: { d: PDFData }) {
  const isFacture = d.type === 'facture'
  const status = isFacture && d.statut ? STATUS[d.statut] : null

  return (
    <Document title={`${isFacture ? 'Facture' : 'Devis'} ${d.numero}`}>
      <Page size="A4" style={s.page}>
        {/* En-tête : logo + entreprise · méta document */}
        <View style={s.head}>
          <View style={s.brand}>
            {d.logoUrl ? <Image src={d.logoUrl} style={s.logo} /> : null}
            <View style={{ flexShrink: 1 }}>
              <Text style={s.entNom}>{d.entNom || 'Votre entreprise'}</Text>
              {d.entSub.map((l, i) => <Text key={i} style={s.sub}>{l}</Text>)}
            </View>
          </View>
          <View style={s.metaWrap}>
            <Text style={s.title}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>
            <Text style={s.metaNum}>{d.numero}</Text>
            <Text style={s.metaLine}>Émis le {d.date}</Text>
            <Text style={s.metaLine}>{isFacture ? `Échéance : ${d.echeanceDate || d.date}` : `Valable jusqu'au ${d.validiteDate}`}</Text>
            {status ? <Text style={[s.statusPill, { backgroundColor: status.bg, color: status.color }]}>{status.label}</Text> : null}
          </View>
        </View>

        {/* Client · objet */}
        <View style={s.grid}>
          <View style={{ maxWidth: 270 }}>
            <Text style={s.label}>{isFacture ? 'FACTURÉ À' : 'ADRESSÉ À'}</Text>
            <Text style={s.bold}>{d.clientNom || 'Client'}</Text>
            {d.clientAdresse ? <Text>{d.clientAdresse}</Text> : null}
          </View>
          {d.objet ? (
            <View style={{ maxWidth: 200, textAlign: 'right' }}>
              <Text style={s.label}>OBJET</Text>
              <Text>{d.objet}</Text>
            </View>
          ) : null}
        </View>

        {/* Bandeau facture : montant à payer + échéance */}
        {isFacture && d.statut !== 'annulee' ? (
          <View style={s.payBand}>
            <View>
              <Text style={s.payLabel}>{d.statut === 'payee' ? 'MONTANT RÉGLÉ' : 'MONTANT À PAYER'}</Text>
              <Text style={s.payAmt}>{eur(d.totalTtc)}</Text>
            </View>
            <View style={{ textAlign: 'right' }}>
              <Text style={s.payLabel}>{d.statut === 'payee' ? 'STATUT' : 'À RÉGLER AVANT LE'}</Text>
              <Text style={s.payDate}>{d.statut === 'payee' ? 'Acquittée' : (d.echeanceDate || d.date)}</Text>
            </View>
          </View>
        ) : null}

        {/* Lignes */}
        <View style={s.th}>
          <Text style={[s.cDesig, s.thText]}>DÉSIGNATION</Text>
          <Text style={[s.cQte, s.thText]}>QTÉ</Text>
          <Text style={[s.cPu, s.thText]}>PU HT</Text>
          <Text style={[s.cTva, s.thText]}>TVA</Text>
          <Text style={[s.cTot, s.thText]}>TOTAL HT</Text>
        </View>
        {d.lignes.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDesig}>{l.designation}</Text>
            <Text style={s.cQte}>{l.quantite.toLocaleString('fr-FR')} {l.unite}</Text>
            <Text style={s.cPu}>{eur(l.prix_unitaire_ht)}</Text>
            <Text style={s.cTva}>{String(l.tva_taux).replace('.', ',')}%</Text>
            <Text style={s.cTot}>{eur(l.quantite * l.prix_unitaire_ht)}</Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={s.totals}>
          {d.remiseMontant > 0.001 && <View style={s.totRow}><Text style={s.totSub}>Sous-total HT</Text><Text style={s.totSub}>{eur(d.totalBrut)}</Text></View>}
          {d.remiseMontant > 0.001 && <View style={s.totRow}><Text style={s.totSub}>Remise {d.remisePct}%</Text><Text style={s.totSub}>- {eur(d.remiseMontant)}</Text></View>}
          <View style={s.totRow}><Text style={s.totSub}>Total HT</Text><Text style={s.totSub}>{eur(d.totalHt)}</Text></View>
          {d.tvaParTaux.map(([t, m]) => <View key={t} style={s.totRow}><Text style={s.totSub}>TVA {t.replace('.', ',')}%</Text><Text style={s.totSub}>{eur(m)}</Text></View>)}
          <View style={[s.totRow, s.grand]}><Text style={s.grandText}>Total TTC</Text><Text style={s.grandText}>{eur(d.totalTtc)}</Text></View>
          {!isFacture && d.acomptePct > 0 && <View style={[s.totRow, s.acompte]}><Text>Acompte {d.acomptePct}% à la commande</Text><Text>{eur(d.acompteMontant)}</Text></View>}
        </View>

        {/* Bloc paiement (RIB) — facture non annulée */}
        {isFacture && d.statut !== 'annulee' ? (
          <View style={s.pay}>
            <Text style={s.payTitle}>RÈGLEMENT</Text>
            {d.iban ? (
              <View style={s.totRow}><Text style={s.payKey}>Par virement — IBAN</Text><Text style={s.payVal}>{d.iban}</Text></View>
            ) : (
              <Text style={s.payKey}>Coordonnées bancaires communiquées séparément.</Text>
            )}
            {d.conditions ? <View style={[s.totRow, { marginTop: 2 }]}><Text style={s.payKey}>Conditions</Text><Text style={s.payVal}>{d.conditions}</Text></View> : null}
          </View>
        ) : null}

        {/* Bon pour accord — devis uniquement */}
        {!isFacture && (
          <View style={s.sign}>
            <View style={s.signBox}>
              <Text>Bon pour accord — le client fait précéder sa signature de la mention manuscrite « Devis reçu avant l&apos;exécution des travaux ».</Text>
              <Text style={{ marginTop: 8 }}>Date et signature :</Text>
            </View>
          </View>
        )}

        {/* Mentions légales */}
        <View style={s.legal}>
          <Text style={s.legalTitle}>MENTIONS</Text>
          {isFacture
            ? <Text>Facture payable {d.echeanceDate ? `au plus tard le ${d.echeanceDate}` : 'à réception'}. En cas de retard : pénalités au taux de 3 fois le taux d&apos;intérêt légal, plus une indemnité forfaitaire de recouvrement de 40 €.</Text>
            : <Text>Devis gratuit, valable {d.validiteJours} jours à compter du {d.date}.{d.conditions ? ` Conditions de paiement : ${d.conditions}.` : ''}{d.iban ? ` Règlement par virement — IBAN ${d.iban}.` : ''}</Text>}
          {d.franchise ? <Text style={{ marginTop: 3 }}>{d.mentionTva}</Text> : null}
          {d.assurance ? <Text style={{ marginTop: 3 }}>Assurance professionnelle : {d.assurance}</Text> : null}
        </View>
      </Page>
    </Document>
  )
}
