type Ligne = { ventes?: number | null; statut?: string | null; jour?: number | null; gains_eur?: number | null; budget_eur?: number | null; titre?: string | null }
export function etatExperience(ligne: Ligne | null, _maintenant: Date) {
  const l = ligne ?? {}, statut = l.statut ?? null
  const jour = Math.min(30, Math.max(1, Number.isFinite(l.jour) ? l.jour! : 1))
  const gains = Number.isFinite(l.gains_eur) ? l.gains_eur! : 0
  const format = new Intl.NumberFormat('fr-FR').format(gains)
  const texte = !statut ? (l.ventes ?? 0) > 0 ? 'Aucune expérience en cours. Lancer une expérience se décide avec Benj (R13).' : 'Aucune expérience avant la première vente (décision R13).'
    : statut === 'arretee_auto' ? 'Arrêtée seule à J30 : rien rapporté.'
    : statut === 'gagnante' ? `J30 atteint : ${format} € gagnés. À toi de décider de la suite.`
    : statut === 'arretee' ? 'Arrêtée par Benj.' : 'Expérience en cours.'
  return { barre: statut === 'en_cours' ? `J${jour}/30 · ${format} €` : null, titre: l.titre ?? 'Expérience', texte, jour, sur: 30, gains, budget: Number.isFinite(l.budget_eur) ? l.budget_eur! : 0, statut }
}
