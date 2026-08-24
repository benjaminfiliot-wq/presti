// Calcul des totaux d'un devis/facture — partagé client (affichage live) + serveur (source de vérité).
export type LigneCalc = { quantite: number; prix_unitaire_ht: number; tva_taux: number }

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeTotals(lignes: LigneCalc[], remisePct = 0) {
  const remise = Math.max(0, Math.min(100, Number(remisePct) || 0)) / 100
  let ht = 0
  let tva = 0
  const parTaux: Record<string, number> = {}
  for (const l of lignes) {
    const lineHt = (Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0) * (1 - remise)
    const taux = Number(l.tva_taux) || 0
    ht += lineHt
    const t = (lineHt * taux) / 100
    tva += t
    parTaux[taux] = (parTaux[taux] || 0) + t
  }
  return {
    total_ht: round2(ht),
    total_tva: round2(tva),
    total_ttc: round2(ht + tva),
    tva_par_taux: Object.fromEntries(Object.entries(parTaux).map(([k, v]) => [k, round2(v)])),
  }
}
