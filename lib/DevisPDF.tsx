import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const CLAY = '#C15F3C'
const INK = '#1A1915'
const MUTED = '#6b675c'
const eur = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',')} €`

export type PDFLigne = { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number }
export type PDFData = {
  numero: string; date: string; validiteDate: string; validiteJours: number
  entNom: string; entSub: string[]
  clientNom: string; clientAdresse: string; objet: string
  lignes: PDFLigne[]
  totalBrut: number; remisePct: number; remiseMontant: number; totalHt: number
  tvaParTaux: [string, number][]; totalTtc: number; acomptePct: number; acompteMontant: number
  franchise: boolean; assurance: string; conditions: string; iban: string
}

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 48, paddingHorizontal: 44, fontSize: 9, fontFamily: 'Helvetica', color: INK, lineHeight: 1.5 },
  head: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 12 },
  entNom: { fontFamily: 'Times-Bold', fontSize: 17, color: INK },
  sub: { color: MUTED, fontSize: 8.5, marginTop: 2 },
  metaWrap: { textAlign: 'right' },
  title: { fontFamily: 'Times-Bold', fontSize: 18, color: CLAY },
  metaLine: { color: MUTED, fontSize: 8.5, marginTop: 2 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  label: { fontSize: 7, color: '#9a9385', letterSpacing: 1, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  bold: { fontFamily: 'Helvetica-Bold' },
  th: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 5, marginTop: 20 },
  thText: { fontSize: 7, color: '#9a9385', fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#efece3', paddingVertical: 5 },
  cDesig: { flexGrow: 1, flexBasis: 0, paddingRight: 6 },
  cQte: { width: 66, textAlign: 'right' },
  cPu: { width: 62, textAlign: 'right' },
  cTva: { width: 40, textAlign: 'right' },
  cTot: { width: 68, textAlign: 'right' },
  totals: { marginLeft: 'auto', width: 210, marginTop: 12 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { borderTopWidth: 2, borderTopColor: INK, marginTop: 3, paddingTop: 5 },
  grandText: { fontFamily: 'Times-Bold', fontSize: 12 },
  acompte: { color: CLAY, fontFamily: 'Helvetica-Bold' },
  sign: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 22 },
  signBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9c3b3', borderRadius: 5, padding: 8, width: 230, fontSize: 7.5, color: MUTED },
  legal: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#efece3', paddingTop: 10, fontSize: 7.5, color: MUTED },
  legalTitle: { fontSize: 7, color: '#9a9385', letterSpacing: 1, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
})

export function DevisPDF({ d }: { d: PDFData }) {
  return (
    <Document title={`Devis ${d.numero}`}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={{ maxWidth: 300 }}>
            <Text style={s.entNom}>{d.entNom || 'Votre entreprise'}</Text>
            {d.entSub.map((l, i) => <Text key={i} style={s.sub}>{l}</Text>)}
          </View>
          <View style={s.metaWrap}>
            <Text style={s.title}>DEVIS</Text>
            <Text style={s.metaLine}>{d.numero}</Text>
            <Text style={s.metaLine}>Le {d.date}</Text>
            <Text style={s.metaLine}>Valable jusqu&apos;au {d.validiteDate}</Text>
          </View>
        </View>

        <View style={s.grid}>
          <View style={{ maxWidth: 270 }}>
            <Text style={s.label}>ADRESSÉ À</Text>
            <Text style={s.bold}>{d.clientNom || 'Client'}</Text>
            {d.clientAdresse ? <Text>{d.clientAdresse}</Text> : null}
          </View>
          <View style={{ maxWidth: 200, textAlign: 'right' }}>
            <Text style={s.label}>OBJET</Text>
            <Text>{d.objet}</Text>
          </View>
        </View>

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

        <View style={s.totals}>
          {d.remiseMontant > 0.001 && <View style={s.totRow}><Text>Sous-total HT</Text><Text>{eur(d.totalBrut)}</Text></View>}
          {d.remiseMontant > 0.001 && <View style={s.totRow}><Text>Remise {d.remisePct}%</Text><Text>- {eur(d.remiseMontant)}</Text></View>}
          <View style={s.totRow}><Text>Total HT</Text><Text>{eur(d.totalHt)}</Text></View>
          {d.tvaParTaux.map(([t, m]) => <View key={t} style={s.totRow}><Text>TVA {t.replace('.', ',')}%</Text><Text>{eur(m)}</Text></View>)}
          <View style={[s.totRow, s.grand]}><Text style={s.grandText}>Total TTC</Text><Text style={s.grandText}>{eur(d.totalTtc)}</Text></View>
          {d.acomptePct > 0 && <View style={[s.totRow, s.acompte]}><Text>Acompte {d.acomptePct}%</Text><Text>{eur(d.acompteMontant)}</Text></View>}
        </View>

        <View style={s.sign}>
          <View style={s.signBox}>
            <Text>Bon pour accord — le client fait précéder sa signature de la mention manuscrite « Devis reçu avant l&apos;exécution des travaux ».</Text>
            <Text style={{ marginTop: 8 }}>Date et signature :</Text>
          </View>
        </View>

        <View style={s.legal}>
          <Text style={s.legalTitle}>MENTIONS</Text>
          <Text>Devis gratuit, valable {d.validiteJours} jours à compter du {d.date}.{d.conditions ? ` Conditions de paiement : ${d.conditions}.` : ''}{d.iban ? ` Règlement par virement — IBAN ${d.iban}.` : ''}</Text>
          {d.franchise ? <Text style={{ marginTop: 3 }}>TVA non applicable, art. L.223 et s. du code des impositions sur les biens et services (CIBS).</Text> : null}
          {d.assurance ? <Text style={{ marginTop: 3 }}>Assurance professionnelle : {d.assurance}</Text> : null}
        </View>
      </Page>
    </Document>
  )
}
