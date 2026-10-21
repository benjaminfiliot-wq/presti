// Création d'une facture — LA fonction, appelée par /api/factures (l'artisan) et par
// l'acceptation d'un devis quand une règle d'automatisation demande une facture d'acompte.
// Extraite de la route pour qu'il n'y ait qu'un seul chemin : mentions bloquantes,
// numérotation, lignes, puis SCELLEMENT (la pièce devient inaltérable).
// Depuis l'audit argent du 21/10 (0180) : ce fichier PRÉPARE la pièce et la vérifie ; l'émission (facture + lignes + numéro +
// scellement) est UNE transaction en base, qui revérifie le déjà-facturé sous verrou (lib/factureEmission.ts).
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne, type LigneNorm } from '@/lib/lignes'
import { sirenValide } from '@/lib/facturation'
import { COLONNES_LEGALES, OU_REMPLIR, mentionsManquantesEmission, messageMentionsBloquantes, versArtisanLegal } from '@/lib/legalArtisan'
import { actif } from '@/lib/flags'
import { calculerSituation, lignesDeduction, natureDe, normaliserLot, type AvancementDemande, type DetailSituation, type FactureAnterieure, type TypeFacture } from '@/lib/facturesTypes'
import { emettreFacture, JETON_NUMERO } from '@/lib/factureEmission'

export type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

export type ResultatFacture =
  | { ok: true; id: string; numero: string }
  | { ok: false; status: 400 | 404 | 409 | 422 | 500 | 503; error: string; code?: 'mentions_manquantes' | 'client_incomplet'; manquantes?: string[]; lien?: string }

/** Les paramètres d'une facture (création ou simulation). */
export type ParamsFacture = {
  artisanId: string
  /** Chemin principal : depuis un devis de l'artisan. */
  devisId?: string
  /** Sinon : un corps autonome (objet, client, lignes…). */
  corps?: Record<string, unknown>
  /** Force le pourcentage d'acompte (facture d'acompte automatique). */
  acomptePct?: number
  /**
   * Le TYPE demandé (drapeau `facturesSituation`, migration 0176, lib/facturesTypes.ts). « situation » et « solde » explicites
   * n'existent que drapeau levé (sinon 404) ET 0176 appliquée (sinon 503). Absent : le chemin d'avant (facture complète, ou de
   * solde si des acomptes existent).
   */
  type?: TypeFacture | null
  /** Situation de travaux : l'avancement CUMULÉ à date, global ou lot par lot. */
  avancement?: AvancementDemande
  /**
   * Le TTC annoncé à l'artisan avant son clic (carte de l'assistant, audit argent du 21/10, M5) : si le montant recalculé au
   * moment d'émettre diffère d'un centime, rien n'est émis (409) — une facture n'est jamais émise pour un autre montant que
   * celui que l'artisan a confirmé.
   */
  ttcAttendu?: number
}

/**
 * La SIMULATION d'une facture (0176) : tout ce que creerFacture vérifie et calcule, sans tirer de numéro ni rien écrire. Sert à la
 * carte de l'assistant (« Situation n° 2 : 1 404,31 € HT… ») pour qu'elle annonce le montant exact que le clic émettra.
 */
export type SimulationFacture = {
  ok: true; simulation: true; type: TypeFacture
  total_ht: number; total_tva: number; total_ttc: number
  /** Les factures déduites (solde, situation), par numéro. */
  deduites: string[]
  situation?: { numero: number; detail: DetailSituation }
}
type EchecFacture = Extract<ResultatFacture, { ok: false }>

export async function creerFacture(p: ParamsFacture): Promise<ResultatFacture> {
  return (await traiterFacture(p, false)) as ResultatFacture
}

export async function simulerFacture(p: ParamsFacture): Promise<SimulationFacture | EchecFacture> {
  return (await traiterFacture(p, true)) as SimulationFacture | EchecFacture
}

async function traiterFacture(p: ParamsFacture, simuler: boolean): Promise<ResultatFacture | SimulationFacture> {
  const uid = p.artisanId
  const devisId = p.devisId
  const situationsOuvertes = actif('facturesSituation')
  if (!situationsOuvertes && (p.type === 'situation' || p.type === 'solde')) return { ok: false, status: 404, error: 'Type de facture indisponible.' }
  const typeDemande = situationsOuvertes ? (p.type ?? null) : null
  if (typeDemande && typeDemande !== 'standard' && !devisId) return { ok: false, status: 400, error: 'Une facture d’acompte, de situation ou de solde se fait depuis un devis signé.' }

  let src: Record<string, unknown> = {}
  let lignes: LigneIn[] = []
  // Les factures déjà émises sur le devis, à DÉDUIRE : acomptes et situations, émis ou payés, non annulés par un avoir.
  let anterieures: FactureAnterieure[] = []
  // Le plus grand numéro de situation déjà donné sur le devis, situations annulées comprises (jamais réutilisé).
  let numeroSituationMax = 0
  // Le DÉJÀ-FACTURÉ HT du devis, en centimes : toutes ses factures émises ou payées, ni avoir ni visées par un avoir, AVEC OU
  // SANS lignes (audit argent du 21/10, C1 et E1). Sert à « jamais plus que le devis », pour TOUS les types.
  let dejaFactureC = 0
  let nbComptees = 0
  if (devisId) {
    const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', devisId).eq('artisan_id', uid).maybeSingle()
    if (!devis) return { ok: false, status: 404, error: 'Devis introuvable' }
    const { data: dl } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
    src = devis
    lignes = (dl ?? []) as LigneIn[]
    // Recette du 12/10 : un second POST (double clic, deuxième onglet) émettait une deuxième facture complète du même
    // devis. Une facture d'acompte reste possible ; une facture complète, seulement si la précédente a été annulée par
    // un avoir.
    // Audit argent du 21/10 (C1) : l'acompte NE SAUTE PLUS cette lecture — un acompte après des situations (ou après la facture
    // complète) faisait facturer plus que le devis. Seul le refus « déjà facturé » reste propre aux factures complètes.
    const estAcompte = typeof p.acomptePct === 'number' && p.acomptePct > 0 && p.acomptePct < 100
    {
      // `*` : les colonnes de 0176 (type, données de situation) quand elles existent, et rien de plus quand elles n'existent pas.
      const { data: deja, error: dErr } = await supabaseAdmin.from('factures').select('*').eq('artisan_id', uid).eq('devis_id', devisId)
      if (dErr) { console.error('[factures] lecture du déjà-facturé :', dErr.message); return { ok: false, status: 500, error: 'Lecture des factures du devis impossible : rien n’a été émis.' } }
      const emises = (deja ?? []).filter((f) => !f.avoir_de)
      const annulees = new Set((deja ?? []).map((f) => f.avoir_de).filter(Boolean))
      const restantes = emises.filter((f) => !annulees.has(f.id))
      numeroSituationMax = (deja ?? []).reduce((m, f) => Math.max(m, Number(f.situation_numero) || 0), 0)
      const comptees = restantes.filter((f) => ['emise', 'payee'].includes(String(f.statut ?? '')))
      dejaFactureC = comptees.reduce((t, f) => t + Math.round((Number(f.total_ht) || 0) * 100), 0)
      nbComptees = comptees.length
      if (restantes.length) {
        const { data: lf } = await supabaseAdmin.from('factures_lignes').select('facture_id, designation, quantite, prix_unitaire_ht, tva_taux').in('facture_id', restantes.map((f) => f.id))
        const lignesDe = (id: string) => (lf ?? []).filter((l) => l.facture_id === id)
        // La nature de chaque facture (lib/facturesTypes.ts natureDe) : un acompte se reconnaît comme avant 0176, à ses lignes
        // « Acompte … » ; une situation, à son type ou à son objet « Situation n° … » ; tout le reste est une facture complète.
        // Une situation demandée sur un devis déjà facturé en entier est refusée par calculerSituation, avec sa raison.
        const completes = restantes.filter((f) => natureDe(f, lignesDe(f.id)) === 'complete')
        if (completes.length && typeDemande !== 'situation' && !estAcompte) return { ok: false, status: 409, error: `Ce devis est déjà facturé (${completes[0].numero}). Pour refaire la facture, émettez d’abord un avoir.` }
        // Audit de cohérence du 18/10, C3 : la facture complète d'un devis dont un acompte est DÉJÀ facturé reprenait 100 % du
        // devis — 1 300 € facturés pour un devis de 1 000 € avec 300 € d'acompte, au client comme dans « Mes chiffres ». Elle
        // devient une facture de SOLDE : les lignes du devis, puis la déduction de chaque acompte facturé (émis ou payé, non
        // annulé par un avoir), à son taux de TVA. Ses totaux sont donc ceux du reste dû, et la TVA n'est pas facturée deux fois.
        // 0176 : les SITUATIONS de travaux se déduisent de la même façon (par taux, de leur montant net).
        const nombre = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v))
        // Toutes les factures COMPTÉES, avec ou sans lignes (audit argent du 21/10, E1) : une facture sans ligne est « complète »
        // (natureDe) et bloque la suite plutôt que d'être oubliée dans le déjà-facturé.
        anterieures = comptees
          .map((f): FactureAnterieure => ({
            id: String(f.id), numero: String(f.numero ?? ''), date: typeof f.date_emission === 'string' ? f.date_emission : null,
            nature: natureDe(f, lignesDe(f.id)),
            situation_numero: nombre(f.situation_numero), avancement_pct: nombre(f.avancement_pct),
            avancement_lots: f.avancement_lots && typeof f.avancement_lots === 'object' ? f.avancement_lots as Record<string, number> : null,
            cumul_ht: nombre(f.cumul_ht), marche_ht: nombre(f.marche_ht), remise_pct: Number(f.remise_pct) || 0,
            lignes: lignesDe(f.id),
          }))
      }
    }
  } else {
    src = p.corps ?? {}
    lignes = Array.isArray(src.lignes) ? (src.lignes as LigneIn[]) : []
  }
  if (lignes.length > 200) return { ok: false, status: 400, error: 'Trop de lignes (200 max).' }

  const { data: art } = await supabaseAdmin.from('artisans').select(`tva_regime, tva_sur_debits, ${COLONNES_LEGALES}`).eq('id', uid).maybeSingle()

  const s = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

  // Mentions obligatoires BLOQUANTES (audit v4 §3) : une facture est émise ET scellée à la
  // création — on refuse AVANT de consommer un numéro. 15 € par mention manquante, jusqu'à
  // 3 000 € sans l'assurance décennale.
  const manquantes = mentionsManquantesEmission(versArtisanLegal(art as Record<string, unknown> | null))
  if (manquantes.length) {
    return { ok: false, status: 422, error: messageMentionsBloquantes(manquantes, 'cette facture'), code: 'mentions_manquantes', manquantes, lien: OU_REMPLIR.lien }
  }

  // Identité du CLIENT (art. 242 nonies A, ann. II CGI). Sans nom, le PDF sortait
  // « FACTURÉ À Client » — une facture scellée qui ne désigne personne, et qu'on ne peut
  // plus corriger. On refuse ici, AVANT le numéro, comme pour les mentions de l'artisan.
  // L'adresse, elle, ne bloque pas : la facture d'acompte automatique d'un client venu de
  // la plateforme n'a souvent que son nom. Elle est signalée par le contrôle avant émission
  // du XML (lib/facturx.ts, controlerAvantEmission).
  const clientNom = s(src.client_nom, 160)
  if (!clientNom) {
    return {
      ok: false, status: 422, code: 'client_incomplet', manquantes: ['Nom du client'],
      error: 'Impossible d’émettre cette facture : le nom du client est une mention obligatoire (art. 242 nonies A de l’annexe II au CGI). Renseignez-le sur le devis, puis réessayez.',
    }
  }
  // Audit de cohérence du 18/10, C6 : « Créer la facture » marchait sur un BROUILLON et scellait une pièce comptable (numéro
  // consommé pour toujours, séquence continue). On ne facture qu'un devis SIGNÉ — acompte compris : l'acceptation dans la
  // conversation passe le devis à « accepte » AVANT de demander la facture d'acompte. Refusé avant le numéro.
  if (devisId && src.statut !== 'accepte') {
    return { ok: false, status: 409, error: `Ce devis n’est pas signé (statut : ${String(src.statut ?? 'brouillon')}) : on ne facture qu’un devis accepté. Passez son statut à « Accepté » une fois le client d’accord, puis créez la facture.` }
  }
  const franchise = ((art?.tva_regime as string | null) || 'franchise') === 'franchise'
  const lignesDevis = lignes.map((l) => normalizeLigne(l, franchise))
  // Le LOT des lignes du devis (0176, appliquée) : recopié sur la facture complète ou de solde.
  const lotDe = (i: number) => normaliserLot((lignes[i] as { lot?: unknown }).lot)
  const lignesDevisFacture: LigneNorm[] = lignesDevis.map((l, i) => { const lot = lotDe(i); return lot ? { ...l, lot } : l })
  // Facture d'ACOMPTE (audit v5 du 04/09 : la facture « Acompte 30 % » recopiait les lignes et
  // les totaux COMPLETS du devis — 100 % facturé, scellé). Ici : une ligne par taux de TVA,
  // au pourcentage demandé, remise du devis déjà appliquée.
  const acomptePct = typeof p.acomptePct === 'number' && p.acomptePct > 0 && p.acomptePct < 100 ? p.acomptePct : null
  if (typeDemande === 'acompte' && acomptePct === null) return { ok: false, status: 400, error: 'Facture d’acompte : un pourcentage entre 1 et 99 % est attendu.' }
  let remise = Number(src.remise_pct) || 0
  let eff: LigneNorm[] = lignesDevisFacture
  if (acomptePct !== null) {
    const parTaux = new Map<number, number>()
    for (const l of lignesDevis) parTaux.set(l.tva_taux, (parTaux.get(l.tva_taux) ?? 0) + l.quantite * l.prix_unitaire_ht)
    const coef = (acomptePct / 100) * (1 - remise / 100)
    const numeroDevis = typeof src.numero === 'string' ? src.numero : ''
    eff = [...parTaux.entries()].map(([taux, ht]) => ({
      designation: `Acompte ${acomptePct} % sur le devis ${numeroDevis}`.trim() + (parTaux.size > 1 ? ` (part soumise à TVA ${taux} %)` : ''),
      quantite: 1, unite: 'forfait', prix_unitaire_ht: Math.round(ht * coef * 100) / 100, tva_taux: taux,
    }))
    remise = 0
  }
  // SITUATION DE TRAVAUX (0176, lib/facturesTypes.ts calculerSituation) : cumul à date × marché − tout ce qui est déjà facturé
  // sur le devis. Refusée AVANT le numéro, comme tout le reste : avancement hors de 0-100 %, qui recule, rien à facturer,
  // devis déjà facturé en entier. La base revérifie (déclencheur factures_situation_verifier).
  let situation: { numero: number; avancementPct: number; avancementLots: Record<string, number> | null; marcheHt: number; cumulHt: number; detail: DetailSituation } | null = null
  if (typeDemande === 'situation') {
    const r = calculerSituation({
      devisNumero: typeof src.numero === 'string' ? src.numero : '', remisePct: remise,
      lignesDevis: lignesDevis.map((l, i) => ({ ...l, lot: lotDe(i) })), franchise,
      anterieures, numeroMax: numeroSituationMax, avancement: p.avancement ?? {},
    })
    if (!r.ok) return { ok: false, status: r.status, error: r.error }
    situation = { numero: r.numero, avancementPct: r.avancementPct, avancementLots: r.avancementLots, marcheHt: r.marcheHt, cumulHt: r.cumulHt, detail: r.detail }
    eff = r.lignes
    remise = 0
  }
  if (typeDemande === 'solde' && anterieures.length === 0) return { ok: false, status: 409, error: 'Aucune facture d’acompte ni de situation sur ce devis : il n’y a rien à déduire. Choisissez « Facture ».' }
  // Facture de SOLDE (C3, voir plus haut) : les lignes du devis restent telles quelles (le client voit tout le chantier), puis
  // la remise du devis en ligne négative — elle ne doit pas s'appliquer aux déductions, qui portent déjà la leur — puis une
  // ligne négative par acompte facturé et par taux, qui cite son numéro et sa date (BOFiP : la facture de solde fait référence
  // aux factures d'acompte). Quantité −1 et prix positif : la norme EN 16931 refuse un prix net négatif (BR-27), pas une
  // quantité négative. Les totaux sont alors ceux du reste dû, et la somme des factures du devis égale le devis.
  const solde = acomptePct === null && !situation && anterieures.length > 0
  if (solde) {
    const numeroDevis = typeof src.numero === 'string' ? src.numero : ''
    const lignesRemise: LigneNorm[] = []
    if (remise > 0) {
      const parTaux = new Map<number, number>()
      for (const l of lignesDevis) parTaux.set(l.tva_taux, (parTaux.get(l.tva_taux) ?? 0) + l.quantite * l.prix_unitaire_ht)
      for (const [taux, ht] of parTaux) {
        const montant = Math.round(ht * remise) / 100
        if (montant > 0) lignesRemise.push({ designation: `Remise ${remise} % du devis ${numeroDevis}`.trim() + (parTaux.size > 1 ? ` (part soumise à TVA ${taux} %)` : ''), quantite: -1, unite: 'forfait', prix_unitaire_ht: montant, tva_taux: taux })
      }
      remise = 0
    }
    // Une ligne par ligne d'acompte (rédaction et calcul d'avant 0176, inchangés : lib/facturesTypes.ts lignesDeduction), puis
    // une par situation et par taux.
    const deductions = lignesDeduction(anterieures, franchise)
    eff = [...lignesDevisFacture, ...lignesRemise, ...deductions]
    if (computeTotals(eff, 0).total_ttc <= 0) {
      const quoi = anterieures.some((a) => a.nature === 'situation') ? 'Les factures déjà émises' : 'Les acomptes déjà facturés'
      return { ok: false, status: 409, error: `${quoi} (${anterieures.map((a) => a.numero).join(', ')}) couvrent tout le devis : il ne reste pas de solde à facturer.` }
    }
  }
  const totals = computeTotals(eff, remise)
  const typeEffectif: TypeFacture = acomptePct !== null ? 'acompte' : situation ? 'situation' : solde ? 'solde' : 'standard'
  // JAMAIS PLUS QUE LE DEVIS, pour tous les types (audit argent du 21/10, C1) : déjà facturé + cette facture ≤ total HT du devis,
  // à un centime d'arrondi près par facture (plus quatre pour la remise ligne par taux d'un solde). La base le revérifie sous
  // verrou au moment d'émettre (0180).
  if (devisId) {
    const devisC = Math.round((Number(src.total_ht) || 0) * 100)
    const ceC = Math.round(totals.total_ht * 100)
    if (dejaFactureC + ceC > devisC + nbComptees + 4) {
      const e = (c: number) => `${(c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`
      return { ok: false, status: 409, error: `Cette facture ferait facturer plus que le devis : ${e(dejaFactureC)} HT déjà facturés, ${e(ceC)} HT pour celle-ci, ${e(devisC)} HT au devis. Rien n’a été émis.` }
    }
  }
  if (typeof p.ttcAttendu === 'number' && Math.round(totals.total_ttc * 100) !== Math.round(p.ttcAttendu * 100)) {
    return { ok: false, status: 409, error: `Le montant a changé depuis la proposition (${p.ttcAttendu.toFixed(2).replace('.', ',')} € TTC annoncés, ${totals.total_ttc.toFixed(2).replace('.', ',')} € TTC aujourd’hui) : rien n’a été émis. Redemandez la facture pour voir le nouveau montant.` }
  }
  if (simuler) {
    return {
      ok: true, simulation: true, type: typeEffectif, total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc,
      deduites: solde || situation ? anterieures.map((a) => a.numero) : [],
      ...(situation ? { situation: { numero: situation.numero, detail: situation.detail } } : {}),
    }
  }

  // Une facture SANS LIGNE ne s'émet pas (vérification du 21/10 en production : une facture faite depuis un devis chiffré par
  // l'IA sortait scellée avec 0 ligne — la colonne factures_lignes.source_prix manquait, 0178, et l'erreur n'était pas lue).
  if (!eff.length) return { ok: false, status: 422, error: 'Cette facture n’a aucune ligne : elle ne peut pas être émise. Ajoutez au moins une ligne au devis, puis réessayez.' }
  const echeance = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  // Une facture de solde n'est pas une facture d'acompte : elle ne recopie pas le pourcentage du devis (lib/crm/argent.ts
  // reconnaît un acompte à ce pourcentage ET à un total inférieur au devis — ce que le solde serait aussi). Une situation non plus.
  const acompte = typeof p.acomptePct === 'number' ? p.acomptePct : solde || situation ? 0 : (Number(src.acompte_pct) || 0)
  // SIREN du client et adresse de chantier : le déclencheur d'immuabilité les fige au
  // scellement, donc si on ne les recopie pas MAINTENANT elles sont perdues pour cette
  // pièce. Le SIREN n'est repris que s'il passe la clé de Luhn — un identifiant faux part
  // dans la facture électronique et ne se corrige plus après transmission.
  const clientSiren = sirenValide(typeof src.client_siren === 'string' ? src.client_siren : null)
    ? String(src.client_siren).replace(/\s/g, '')
    : null

  // L'ÉMISSION : facture, lignes, numéro (compteur de l'artisan) et scellement en UNE transaction (0180, lib/factureEmission.ts).
  // La base revérifie sous verrou ce que ce fichier a vérifié (déjà-facturé recalculé, jamais plus que le devis, montant d'une
  // situation ou d'un solde, totaux = lignes) ; un refus n'écrit rien et ne consomme aucun numéro.
  return emettreFacture({
    artisan_id: uid, devis_id: devisId ?? null, type: typeEffectif, annee: String(new Date().getFullYear()),
    facture: {
      objet: acompte && typeof p.acomptePct === 'number' ? `Acompte ${acompte} % — ${s(src.objet, 260) ?? 'travaux'}` : situation ? `Situation n° ${situation.numero} — ${s(src.objet, 270) ?? 'travaux'}` : solde ? `Solde — ${s(src.objet, 280) ?? 'travaux'}` : s(src.objet, 300),
      date_echeance: echeance,
      remise_pct: remise, acompte_pct: acompte,
      conditions: s(src.conditions, 4000), notes: s(src.notes, 4000),
      client_nom: clientNom, client_email: s(src.client_email, 200), client_adresse: s(src.client_adresse, 300),
      client_siren: clientSiren, adresse_chantier: s(src.adresse_chantier, 300),
      // Art. 77 ann. III CGI : l'option pour les débits se mentionne sur la facture. On la
      // fige à l'émission — le régime du jour, pas celui que l'artisan aura dans deux ans.
      tva_sur_debits: (art as Record<string, unknown> | null)?.tva_sur_debits === true,
      // 0081 — le régime est FIGÉ ici, à côté de `tva_sur_debits` et pour la même raison : le PDF
      // est regénéré à la demande, et doit rendre la pièce telle qu'elle a été émise.
      tva_regime: franchise ? 'franchise' : 'reel',
      total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc,
      ...(situation ? {
        situation_numero: situation.numero, avancement_pct: situation.avancementPct, avancement_lots: situation.avancementLots,
        marche_ht: situation.marcheHt, cumul_ht: situation.cumulHt, situation_detail: situation.detail,
      } : {}),
    },
    lignes: eff.map((l) => ({ ...l })),
    empreinte_modele: JSON.stringify({ numero: JETON_NUMERO, client: clientNom, totaux: [totals.total_ht, totals.total_tva, totals.total_ttc], lignes: eff, ...(situation ? { situation: situation.detail } : {}) }),
  })
}
