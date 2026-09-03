// Normalisation + bornage d'une ligne de devis/facture (validation d'entrée serveur).
// Empêche les quantités/prix négatifs ou démesurés et les taux de TVA hors barème.
const TVA_OK = [0, 5.5, 10, 20]

export type LigneNorm = {
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  tva_taux: number
  /** D'où vient le prix (v4 §8/F4). Bornée à un libellé court, jamais du texte libre. */
  source_prix?: string
}

export function normalizeLigne(
  l: { designation?: unknown; quantite?: unknown; unite?: unknown; prix_unitaire_ht?: unknown; tva_taux?: unknown; source_prix?: unknown },
  franchise: boolean,
): LigneNorm {
  const q = Number(l.quantite)
  const pu = Number(l.prix_unitaire_ht)
  const tv = Number(l.tva_taux)
  return {
    designation: (typeof l.designation === 'string' ? l.designation : '').slice(0, 300),
    quantite: Number.isFinite(q) && q > 0 ? Math.min(q, 100000) : 1,
    unite: ((typeof l.unite === 'string' ? l.unite : 'u').slice(0, 16)) || 'u',
    prix_unitaire_ht: Number.isFinite(pu) && pu >= 0 ? Math.min(pu, 10000000) : 0,
    tva_taux: franchise ? 0 : (TVA_OK.includes(tv) ? tv : 20),
    ...(typeof l.source_prix === 'string' && l.source_prix.trim()
      ? { source_prix: l.source_prix.trim().slice(0, 120) }
      : {}),
  }
}
