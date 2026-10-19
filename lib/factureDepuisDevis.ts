// Création d'une facture — LA fonction, appelée par /api/factures (l'artisan) et par
// l'acceptation d'un devis quand une règle d'automatisation demande une facture d'acompte.
// Extraite de la route pour qu'il n'y ait qu'un seul chemin : mentions bloquantes,
// numérotation, lignes, puis SCELLEMENT (la pièce devient inaltérable).
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne, type LigneNorm } from '@/lib/lignes'
import { empreinte, sirenValide } from '@/lib/facturation'
import { COLONNES_LEGALES, OU_REMPLIR, mentionsManquantesEmission, messageMentionsBloquantes, versArtisanLegal } from '@/lib/legalArtisan'

export type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

export type ResultatFacture =
  | { ok: true; id: string; numero: string }
  | { ok: false; status: 400 | 404 | 409 | 422 | 500; error: string; code?: 'mentions_manquantes' | 'client_incomplet'; manquantes?: string[]; lien?: string }

export async function creerFacture(p: {
  artisanId: string
  /** Chemin principal : depuis un devis de l'artisan. */
  devisId?: string
  /** Sinon : un corps autonome (objet, client, lignes…). */
  corps?: Record<string, unknown>
  /** Force le pourcentage d'acompte (facture d'acompte automatique). */
  acomptePct?: number
}): Promise<ResultatFacture> {
  const uid = p.artisanId
  const devisId = p.devisId

  let src: Record<string, unknown> = {}
  let lignes: LigneIn[] = []
  type LigneFacturee = { designation?: unknown; quantite?: unknown; prix_unitaire_ht?: unknown; tva_taux?: unknown }
  let acomptesADeduire: { numero: string; date: string | null; lignes: LigneFacturee[] }[] = []
  if (devisId) {
    const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', devisId).eq('artisan_id', uid).maybeSingle()
    if (!devis) return { ok: false, status: 404, error: 'Devis introuvable' }
    const { data: dl } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
    src = devis
    lignes = (dl ?? []) as LigneIn[]
    // Recette du 12/10 : un second POST (double clic, deuxième onglet) émettait une deuxième facture complète du même
    // devis. Une facture d'acompte reste possible ; une facture complète, seulement si la précédente a été annulée par
    // un avoir.
    const estAcompte = typeof p.acomptePct === 'number' && p.acomptePct > 0 && p.acomptePct < 100
    if (!estAcompte) {
      const { data: deja } = await supabaseAdmin.from('factures').select('id, numero, avoir_de, statut, date_emission').eq('artisan_id', uid).eq('devis_id', devisId)
      const emises = (deja ?? []).filter((f) => !f.avoir_de)
      const annulees = new Set((deja ?? []).map((f) => f.avoir_de).filter(Boolean))
      const restantes = emises.filter((f) => !annulees.has(f.id))
      if (restantes.length) {
        const { data: lf } = await supabaseAdmin.from('factures_lignes').select('facture_id, designation, quantite, prix_unitaire_ht, tva_taux').in('facture_id', restantes.map((f) => f.id))
        const lignesDe = (id: string) => (lf ?? []).filter((l) => l.facture_id === id)
        const completes = restantes.filter((f) => !lignesDe(f.id).every((l) => /^Acompte /.test(String(l.designation ?? ''))))
        if (completes.length) return { ok: false, status: 409, error: `Ce devis est déjà facturé (${completes[0].numero}). Pour refaire la facture, émettez d’abord un avoir.` }
        // Audit de cohérence du 18/10, C3 : la facture complète d'un devis dont un acompte est DÉJÀ facturé reprenait 100 % du
        // devis — 1 300 € facturés pour un devis de 1 000 € avec 300 € d'acompte, au client comme dans « Mes chiffres ». Elle
        // devient une facture de SOLDE : les lignes du devis, puis la déduction de chaque acompte facturé (émis ou payé, non
        // annulé par un avoir), à son taux de TVA. Ses totaux sont donc ceux du reste dû, et la TVA n'est pas facturée deux fois.
        acomptesADeduire = restantes
          .filter((f) => ['emise', 'payee'].includes(String(f.statut ?? '')) && lignesDe(f.id).length > 0)
          .map((f) => ({ numero: String(f.numero ?? ''), date: typeof f.date_emission === 'string' ? f.date_emission : null, lignes: lignesDe(f.id) }))
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
  // Facture d'ACOMPTE (audit v5 du 04/09 : la facture « Acompte 30 % » recopiait les lignes et
  // les totaux COMPLETS du devis — 100 % facturé, scellé). Ici : une ligne par taux de TVA,
  // au pourcentage demandé, remise du devis déjà appliquée.
  const acomptePct = typeof p.acomptePct === 'number' && p.acomptePct > 0 && p.acomptePct < 100 ? p.acomptePct : null
  let remise = Number(src.remise_pct) || 0
  let eff = lignesDevis
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
  // Facture de SOLDE (C3, voir plus haut) : les lignes du devis restent telles quelles (le client voit tout le chantier), puis
  // la remise du devis en ligne négative — elle ne doit pas s'appliquer aux déductions, qui portent déjà la leur — puis une
  // ligne négative par acompte facturé et par taux, qui cite son numéro et sa date (BOFiP : la facture de solde fait référence
  // aux factures d'acompte). Quantité −1 et prix positif : la norme EN 16931 refuse un prix net négatif (BR-27), pas une
  // quantité négative. Les totaux sont alors ceux du reste dû, et la somme des factures du devis égale le devis.
  const solde = acomptePct === null && acomptesADeduire.length > 0
  if (solde) {
    const numeroDevis = typeof src.numero === 'string' ? src.numero : ''
    const dateFr = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '')
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
    const deductions: LigneNorm[] = acomptesADeduire.flatMap((a) => a.lignes.map((l) => {
      const taux = franchise ? 0 : Number(l.tva_taux) || 0
      const ht = Math.round((Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0) * 100) / 100
      return {
        designation: `Déduction de l’acompte facturé ${a.numero}${a.date ? ` du ${dateFr(a.date)}` : ''}${a.lignes.length > 1 ? ` (TVA ${taux} %)` : ''}`,
        quantite: -1, unite: 'forfait', prix_unitaire_ht: ht, tva_taux: taux,
      }
    })).filter((l) => l.prix_unitaire_ht > 0)
    eff = [...lignesDevis, ...lignesRemise, ...deductions]
    if (computeTotals(eff, 0).total_ttc <= 0) {
      return { ok: false, status: 409, error: `Les acomptes déjà facturés (${acomptesADeduire.map((a) => a.numero).join(', ')}) couvrent tout le devis : il ne reste pas de solde à facturer.` }
    }
  }
  const totals = computeTotals(eff, remise)

  // Le numéro est pris EN DERNIER : tout ce qui peut refuser la facture (mentions de
  // l'artisan, identité du client, lignes) a déjà été vérifié. Il reste une fenêtre — si
  // l'insert échoue juste après, le numéro est consommé et la séquence saute. Une rupture
  // se justifie auprès de l'administration (art. 242 nonies A : séquence chronologique et
  // continue, ruptures documentées) ; un doublon, non. On ne rend donc JAMAIS un numéro
  // déjà tiré : la seule vraie correction est de numéroter et d'insérer dans la même
  // transaction SQL (fonction à écrire côté base — audit final, auditeur B, A7).
  const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'facture' })
  const numero = `FAC-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`
  const echeance = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  // Une facture de solde n'est pas une facture d'acompte : elle ne recopie pas le pourcentage du devis (lib/crm/argent.ts
  // reconnaît un acompte à ce pourcentage ET à un total inférieur au devis — ce que le solde serait aussi).
  const acompte = typeof p.acomptePct === 'number' ? p.acomptePct : solde ? 0 : (Number(src.acompte_pct) || 0)
  // SIREN du client et adresse de chantier : le déclencheur d'immuabilité les fige au
  // scellement, donc si on ne les recopie pas MAINTENANT elles sont perdues pour cette
  // pièce. Le SIREN n'est repris que s'il passe la clé de Luhn — un identifiant faux part
  // dans la facture électronique et ne se corrige plus après transmission.
  const clientSiren = sirenValide(typeof src.client_siren === 'string' ? src.client_siren : null)
    ? String(src.client_siren).replace(/\s/g, '')
    : null

  const { data: facture, error: fErr } = await supabaseAdmin
    .from('factures')
    .insert({
      artisan_id: uid, devis_id: devisId ?? null, numero,
      objet: acompte && typeof p.acomptePct === 'number' ? `Acompte ${acompte} % — ${s(src.objet, 260) ?? 'travaux'}` : solde ? `Solde — ${s(src.objet, 280) ?? 'travaux'}` : s(src.objet, 300),
      statut: 'emise', date_echeance: echeance,
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
    })
    .select('id, numero').single()
  if (fErr) { console.error('[factures] insert:', fErr.message); return { ok: false, status: 500, error: 'Création de la facture impossible' } }

  if (eff.length) await supabaseAdmin.from('factures_lignes').insert(eff.map((l, i) => ({ facture_id: facture.id, ordre: i, ...l })))

  // SCELLEMENT — après les lignes, quand le contenu est complet. C'est ici que la pièce
  // devient inaltérable (le déclencheur d'immuabilité refuserait d'écrire l'empreinte sur
  // une facture déjà verrouillée). C'est ce qui rend la comptabilité opposable.
  await supabaseAdmin.from('factures').update({
    verrouillee: true, emise_le: new Date().toISOString(),
    empreinte: await empreinte(JSON.stringify({ numero: facture.numero, client: clientNom, totaux: [totals.total_ht, totals.total_tva, totals.total_ttc], lignes: eff })),
  }).eq('id', facture.id)

  return { ok: true, id: facture.id, numero: facture.numero }
}
