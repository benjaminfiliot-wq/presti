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
  // Les totaux se déduisent de ce qui est AFFICHÉ, pas des sommes exactes. Le document imprime le
  // détail de TVA par taux, puis Total HT, Total TVA, Total TTC : si le TTC vient d'une somme non
  // arrondie, les trois lignes ne s'additionnent plus. Mesuré : 6 × 50 € remisés de 15 % à 5,5 %
  // donnaient 255,00 + 14,03 = 269,02. Un centime qui manque sur une pièce scellée fait douter de
  // tout le reste — et on ne peut plus la corriger.
  const detail = Object.fromEntries(Object.entries(parTaux).map(([k, v]) => [k, round2(v)]))
  const htArrondi = round2(ht)
  const tvaArrondie = round2(Object.values(detail).reduce((a, b) => a + b, 0))
  return {
    total_ht: htArrondi,
    total_tva: tvaArrondie,
    total_ttc: round2(htArrondi + tvaArrondie),
    tva_par_taux: detail,
  }
}
