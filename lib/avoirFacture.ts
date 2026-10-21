// L'AVOIR d'une facture émise — la seule façon de l'annuler (audit final, auditeur B, A9 ; route app/api/factures/[id]/avoir).
// Extrait de la route (audit argent du 21/10, E3) pour être rejoué sans session par scripts/types-devis-factures-qa.mjs. L'avoir
// passe par l'émission atomique (0180, lib/factureEmission.ts) : avoir, lignes, numéro, scellement ET statut « annulée » de la
// facture d'origine en UNE transaction, sous verrou. Sans 0180 : 503, rien n'est écrit.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { emettreFacture, JETON_NUMERO } from '@/lib/factureEmission'
import { couperTexte } from '@/lib/lignes'

export type ResultatAvoir =
  | { ok: true; id: string; numero: string; annule: string | null }
  | { ok: false; status: 404 | 409 | 500 | 503; error: string }

export async function creerAvoir(p: { artisanId: string; factureId: string; motif?: string }): Promise<ResultatAvoir> {
  const uid = p.artisanId
  const id = p.factureId
  const motif = couperTexte((p.motif ?? '').trim(), 200)
  const { data: cur } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!cur) return { ok: false, status: 404, error: 'Facture introuvable' }
  if (!cur.verrouillee) return { ok: false, status: 409, error: 'Cette facture n’a pas été émise : elle n’a pas besoin d’avoir.' }
  if (cur.avoir_de) return { ok: false, status: 409, error: 'Un avoir ne s’annule pas par un autre avoir.' }
  if (cur.statut === 'annulee') return { ok: false, status: 409, error: 'Cette facture est déjà annulée par un avoir.' }
  const { count: deja } = await supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('avoir_de', id)
  if ((deja ?? 0) > 0) return { ok: false, status: 409, error: 'Un avoir existe déjà pour cette facture.' }

  const { data: lignes, error: lErr } = await supabaseAdmin.from('factures_lignes')
    .select('designation, quantite, unite, prix_unitaire_ht, tva_taux').eq('facture_id', id).order('ordre')
  if (lErr) { console.error('[factures/avoir] lignes :', lErr.message); return { ok: false, status: 500, error: 'Lecture de la facture impossible : rien n’a été émis.' } }
  // Une facture scellée SANS LIGNE (le défaut d'avant 0178) s'annule quand même : une seule ligne « Annulation de la facture … »
  // à l'opposé de son total HT, au taux qui redonne EXACTEMENT sa TVA (0 ; 5,5 ; 10 ; 20 %). Aucun taux ne colle (plusieurs taux
  // mêlés) : refus, plutôt qu'un avoir à la TVA inventée.
  let remiseAvoir = Number(cur.remise_pct) || 0
  let source = (lignes ?? []) as { designation?: unknown; quantite?: unknown; unite?: unknown; prix_unitaire_ht?: unknown; tva_taux?: unknown }[]
  if (!source.length) {
    const ht = Math.round((Number(cur.total_ht) || 0) * 100)
    const tva = Math.round((Number(cur.total_tva) || 0) * 100)
    const taux = [0, 5.5, 10, 20].find((t) => Math.round((ht * t) / 100) === tva)
    if (taux === undefined || ht <= 0) return { ok: false, status: 409, error: 'Cette facture n’a aucune ligne enregistrée et plusieurs taux de TVA : son avoir ne peut pas être fabriqué automatiquement. Contactez le support.' }
    source = [{ designation: `Annulation de la facture ${cur.numero ?? ''}`.trim(), quantite: 1, unite: 'forfait', prix_unitaire_ht: ht / 100, tva_taux: taux }]
    remiseAvoir = 0
  }
  const negatives = source.map((l) => ({ ...l, prix_unitaire_ht: -Number(l.prix_unitaire_ht || 0) }))
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const neg = (v: unknown) => -Math.abs(Number(v) || 0)

  const r = await emettreFacture({
    artisan_id: uid, devis_id: cur.devis_id ?? null, type: 'avoir', avoir_de: id, annee: String(new Date().getFullYear()),
    facture: {
      client_id: cur.client_id ?? null,
      objet: `Avoir annulant la facture ${cur.numero ?? ''}${motif ? ` — ${motif}` : ''}`.trim(),
      date_emission: aujourdhui, date_echeance: aujourdhui,
      // La remise de la facture annulée est REPORTÉE, pas remise à zéro. Le PDF ne lit pas les totaux
      // scellés : il les recalcule depuis les lignes et `remise_pct` (lib/devisPdfData.ts). Avec 0 ici,
      // une facture de 1 000 EUR remisée à 10 % — donc 900 encaissés — sortait imprimée à -1 000 :
      // cent euros rendus en trop, sur une pièce scellée qu'on ne peut plus corriger.
      remise_pct: remiseAvoir, acompte_pct: 0,
      conditions: null, notes: cur.notes ?? null,
      client_nom: cur.client_nom, client_email: cur.client_email ?? null, client_adresse: cur.client_adresse ?? null,
      client_siren: cur.client_siren ?? null, client_pays: cur.client_pays ?? 'FR', adresse_chantier: cur.adresse_chantier ?? null,
      categorie_operation: cur.categorie_operation ?? 'mixte', devise: cur.devise ?? 'EUR',
      exoneration_code: cur.exoneration_code ?? null, tva_sur_debits: cur.tva_sur_debits ?? false,
      // Un avoir hérite du régime de la facture qu'il annule (0081) : sinon il la contredirait,
      // et deux pièces liées diraient deux choses différentes de la même opération.
      tva_regime: (cur as { tva_regime?: string | null }).tva_regime ?? null,
      total_ht: neg(cur.total_ht), total_tva: neg(cur.total_tva), total_ttc: neg(cur.total_ttc),
    },
    lignes: negatives,
    empreinte_modele: JSON.stringify({ numero: JETON_NUMERO, client: cur.client_nom, avoir_de: id, totaux: [neg(cur.total_ht), neg(cur.total_tva), neg(cur.total_ttc)], lignes: negatives }),
  })
  if (!r.ok) return { ok: false, status: r.status, error: r.status === 500 ? 'Création de l’avoir impossible. Rien n’a été émis.' : r.error }
  return { ok: true, id: r.id, numero: r.numero, annule: cur.numero ?? null }
}
