import { computeTotals } from './devisTotals'
import type { PDFData } from './DevisPDF'
import { mentionFranchise, formaterSiren, type BaseMention } from '@/lib/facturation'

type ArtisanRow = {
  nom?: string | null; metier?: string | null; forme_juridique?: string | null
  adresse?: string | null; code_postal?: string | null; ville?: string | null; siret?: string | null
  assurance_nom?: string | null; assurance_contrat?: string | null; assurance_activites?: string | null; assurance_zone?: string | null
  mediateur_nom?: string | null; mediateur_url?: string | null; tva_num?: string | null; tva_regime?: string | null; mention_tva_base?: string | null; conditions_paiement?: string | null; iban?: string | null; logo_url?: string | null
  email?: string | null; email_public?: string | null; tva_sur_debits?: boolean | null
}
type DevisRow = {
  avoir_de?: string | null
  numero?: string | null; date_emission?: string | null; validite_jours?: number | null; date_echeance?: string | null
  remise_pct?: number | null; acompte_pct?: number | null; statut?: string | null
  client_nom?: string | null; client_adresse?: string | null; objet?: string | null
  client_siren?: string | null; adresse_chantier?: string | null; date_prestation?: string | null; tva_sur_debits?: boolean | null
}
type LigneRow = { designation?: string | null; quantite?: number | null; unite?: string | null; prix_unitaire_ht?: number | null; tva_taux?: number | null }

const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * Mentions de RÈGLEMENT d'une facture, art. L. 441-9 du code de commerce.
 *
 * Elles sont ici, et pas dans la mise en page, parce que le XML de facture électronique
 * doit porter le MÊME texte (BT-20, conditions de paiement) que le PDF : deux rédactions
 * divergentes sur une même facture, et c'est la mention elle-même qui devient contestable.
 *
 * @param clientPro le client est identifié comme professionnel (son SIREN est renseigné).
 */
export function mentionsReglement(clientPro: boolean): string[] {
  return [
    // Art. L. 441-9 c. com. : le taux des pénalités de retard est une mention obligatoire.
    'Pénalités de retard : 3 fois le taux d’intérêt légal en vigueur, exigibles sans rappel.',
    // Art. L. 441-10 II c. com. : l'indemnité forfaitaire de 40 € n'est due qu'ENTRE
    // PROFESSIONNELS. L'annoncer à un particulier, c'est lui réclamer une somme qui ne lui
    // est pas opposable — le défaut relevé par l'audit final (auditeur B, A11).
    ...(clientPro ? ['Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L. 441-10 du code de commerce).'] : []),
    // Art. L. 441-9 c. com. : « les conditions d'escompte » figurent sur la facture. Quand
    // aucun escompte n'est consenti, il faut l'ÉCRIRE : le silence n'est pas conforme.
    'Escompte pour paiement anticipé : néant.',
  ]
}

/**
 * Option pour le paiement de la TVA d'après les débits : art. 77 de l'annexe III au CGI —
 * le redevable qui l'a exercée « en fait mention sur les factures ». Une seule rédaction,
 * partagée par le PDF et par le XML (note de facture).
 */
export const MENTION_TVA_DEBITS = 'TVA acquittée d’après les débits (art. 77 de l’annexe III au CGI).'

export function buildPdfData(devis: DevisRow, lignes: LigneRow[], artisan: ArtisanRow, type: 'devis' | 'facture' = 'devis'): PDFData {
  // Franchise de TVA (défaut auto-entrepreneur) ⇒ 0 % sur toutes les lignes.
  // La MENTION qui l'accompagne n'est pas figée : la recodification CGI → CIBS est entrée
  // en vigueur le 01/09/2026 avec une tolérance jusqu'au 31/12/2027. Elle se calcule donc
  // à la date du document et selon le choix de l'artisan (lib/facturation.ts).
  // Pour une FACTURE, le régime est celui figé à l'émission (0081), pas celui d'aujourd'hui : le
  // PDF est regénéré à la demande, et une facture émise à 20 % se réimprimait à 0 % le jour où
  // l'artisan repassait en franchise. Le client, lui, garde l'autre version dans ses archives.
  // Une facture antérieure à 0081 n'a pas de régime figé : on retombe alors sur le courant,
  // faute de pouvoir le deviner sans risquer d'inventer. Un devis, lui, se refait : son régime
  // est toujours le courant.
  const regimeFige = type === 'facture' ? (devis as { tva_regime?: string | null }).tva_regime : null
  const franchise = ((regimeFige || artisan.tva_regime) || 'franchise') === 'franchise'
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

  // Art. L. 243-2 al. 2 c. assurances : coordonnées de l'assureur, référence du contrat ET
  // couverture géographique. Chaque morceau n'est écrit que s'il existe — un contrat ou une
  // zone inventés seraient pires que leur absence (audit final, auditeur B, A2).
  const assurance = artisan.assurance_nom
    ? `${artisan.assurance_nom}${artisan.assurance_contrat ? `, contrat n° ${artisan.assurance_contrat}` : ''}${artisan.assurance_activites ? `, ${artisan.assurance_activites}` : ''}${artisan.assurance_zone ? `, ${artisan.assurance_zone}` : ''}.`
    : ''

  // Art. 242 nonies A, ann. II CGI : identité COMPLÈTE du client. Le SIREN n'est exigé
  // qu'entre professionnels ; rendu seulement quand il est connu, il dit aussi si la pièce
  // est B2B — donc si l'indemnité de 40 € est due (mentionsReglement ci-dessus).
  const clientSiren = devis.client_siren ? formaterSiren(devis.client_siren) : ''

  // Arrêté du 24/01/2017, art. 2 : le devis porte le LIEU D'EXÉCUTION de la prestation.
  // Sur la facture, l'adresse de chantier complète l'identification quand elle diffère de
  // l'adresse de facturation — le cas courant du bâtiment (siège / chantier).
  const adresseChantier = (devis.adresse_chantier || '').trim()

  // Art. 242 nonies A, ann. II CGI : la date de la prestation figure sur la facture dès
  // lors qu'elle est déterminée. Elle n'est PAS déduite de la date d'émission : une date
  // de prestation supposée est une mention fausse sur une pièce scellée.
  const prestation = devis.date_prestation ? new Date(devis.date_prestation) : null
  const datePrestation = prestation && !Number.isNaN(prestation.getTime()) ? dateFr(prestation) : ''

  // Art. 77 ann. III CGI : la mention est due sur les FACTURES. L'option est figée sur la
  // pièce à l'émission ; on retombe sur le réglage de l'entreprise pour les factures émises
  // avant que la colonne ne soit remplie. Sans TVA collectée (franchise), elle n'a pas d'objet.
  const tvaDebits = type === 'facture' && !franchise && (devis.tva_sur_debits === true || artisan.tva_sur_debits === true)

  // Formulaire type de rétractation, annexe à l'art. R. 221-1 c. conso, exigé par l'art.
  // L. 221-5 : le professionnel le FOURNIT au consommateur avec l'offre. Donc sur le devis,
  // et seulement quand le client n'est pas un professionnel identifié (SIREN). L'adresse et
  // le courriel du destinataire viennent de l'artisan : rien n'est complété d'office.
  const adresseArtisan = [artisan.adresse, [artisan.code_postal, artisan.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const retractationDestinataire = type === 'devis' && !clientSiren
    ? [artisan.nom, adresseArtisan, artisan.email_public || artisan.email].filter(Boolean).join(' — ')
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
    clientSiren, adresseChantier, datePrestation,
    mentionsReglement: type === 'facture' ? mentionsReglement(!!clientSiren) : [],
    mentionTvaDebits: tvaDebits ? MENTION_TVA_DEBITS : '',
    retractationDestinataire,
  }
}
