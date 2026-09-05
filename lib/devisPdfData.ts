import { computeTotals } from './devisTotals'
import type { PDFData } from './DevisPDF'
import { mentionFranchise, type BaseMention } from '@/lib/facturation'

type ArtisanRow = {
  nom?: string | null; metier?: string | null; forme_juridique?: string | null
  adresse?: string | null; code_postal?: string | null; ville?: string | null; siret?: string | null
  assurance_nom?: string | null; assurance_contrat?: string | null; assurance_activites?: string | null; assurance_zone?: string | null
  mediateur_nom?: string | null; mediateur_url?: string | null; tva_num?: string | null; tva_regime?: string | null; mention_tva_base?: string | null; conditions_paiement?: string | null; iban?: string | null; logo_url?: string | null
}
type DevisRow = {
  avoir_de?: string | null
  numero?: string | null; date_emission?: string | null; validite_jours?: number | null; date_echeance?: string | null
  remise_pct?: number | null; acompte_pct?: number | null; statut?: string | null
  client_nom?: string | null; client_adresse?: string | null; objet?: string | null
}
type LigneRow = { designation?: string | null; quantite?: number | null; unite?: string | null; prix_unitaire_ht?: number | null; tva_taux?: number | null }

const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export function buildPdfData(devis: DevisRow, lignes: LigneRow[], artisan: ArtisanRow, type: 'devis' | 'facture' = 'devis'): PDFData {
  // Franchise de TVA (défaut auto-entrepreneur) ⇒ 0 % sur toutes les lignes.
  // La MENTION qui l'accompagne n'est pas figée : la recodification CGI → CIBS est entrée
  // en vigueur le 01/09/2026 avec une tolérance jusqu'au 31/12/2027. Elle se calcule donc
  // à la date du document et selon le choix de l'artisan (lib/facturation.ts).
  const franchise = (artisan.tva_regime || 'franchise') === 'franchise'
  const ls = (lignes || []).map((l) => {
    const tv = Number(l.tva_taux)
    return {
      designation: l.designation ?? '', quantite: Number(l.quantite) || 0, unite: l.unite ?? 'u',
      prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
      tva_taux: franchise ? 0 : (Number.isFinite(tv) ? tv : 20), // ne pas écraser un 0 réel
    }
  })
  const totals = computeTotals(ls, Number(devis.remise_pct) || 0)
  const totalBrut = ls.reduce((sum, l) => sum + l.quantite * l.prix_unitaire_ht, 0)
  const emission = devis.date_emission ? new Date(devis.date_emission) : new Date()
  const validiteJours = Number(devis.validite_jours) || 90
  const validiteDate = new Date(emission.getTime() + validiteJours * 86400000)
  const acomptePct = Number(devis.acompte_pct) || 0
  const echeance = devis.date_echeance ? new Date(devis.date_echeance) : new Date(emission.getTime() + 30 * 86400000)

  const entSub = [
    [artisan.metier, artisan.forme_juridique].filter(Boolean).join(' · '),
    [artisan.adresse, artisan.code_postal, artisan.ville].filter(Boolean).join(', '),
    artisan.siret ? `SIRET ${artisan.siret}` : '',
    // Art. 242 nonies A, ann. II CGI, 3° : l'assujetti porte son numéro d'identification. Un artisan
    // en franchise n'en a pas (les paramètres le mettent à null) : la ligne disparaît d'elle-même.
    artisan.tva_num ? `N° TVA intracommunautaire ${artisan.tva_num}` : '',
  ].filter(Boolean) as string[]

  const assurance = artisan.assurance_nom
    ? `${artisan.assurance_nom}${artisan.assurance_contrat ? `, contrat n° ${artisan.assurance_contrat}` : ''}${artisan.assurance_activites ? `, ${artisan.assurance_activites}` : ''}${artisan.assurance_zone ? `, ${artisan.assurance_zone}` : ''}.`
    : ''

  return {
    numero: devis.numero || '', date: dateFr(emission), validiteDate: dateFr(validiteDate), validiteJours,
    entNom: artisan.nom || '', entSub,
    clientNom: devis.client_nom || 'Client', clientAdresse: devis.client_adresse || '', objet: devis.objet || '',
    lignes: ls,
    totalBrut, remisePct: Number(devis.remise_pct) || 0, remiseMontant: totalBrut - totals.total_ht, totalHt: totals.total_ht,
    tvaParTaux: Object.entries(totals.tva_par_taux), totalTtc: totals.total_ttc, acomptePct, acompteMontant: (totals.total_ttc * acomptePct) / 100,
    franchise, mentionTva: mentionFranchise((artisan.mention_tva_base as BaseMention) || 'auto', emission), assurance, conditions: artisan.conditions_paiement || '', iban: artisan.iban || '',
    type, echeanceDate: dateFr(echeance),
    logoUrl: artisan.logo_url || null, statut: devis.statut || null,
    avoir: !!devis.avoir_de,
    // Art. L. 616-1 c. conso : le professionnel communique au consommateur les coordonnées du
    // médiateur dont il relève. Sur le devis, avant l'engagement — pas seulement sur le site.
    mediateur: [artisan.mediateur_nom, artisan.mediateur_url].filter(Boolean).join(' — '),
  }
}
