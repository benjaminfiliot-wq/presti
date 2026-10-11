// La ligne de station_experience_etat() : aucune_vente (booléen) et fin_prevue_le ; `ventes` reste accepté (jeux d'essai des juges).
type Ligne = { ventes?: number | null; aucune_vente?: boolean | null; fin_prevue_le?: string | null; statut?: string | null; jour?: number | null; gains_eur?: number | null; budget_eur?: number | null; titre?: string | null; nom?: string | null }
export function etatExperience(ligne: Ligne | null, _maintenant: Date) {
  const l = ligne ?? {}, statut = l.statut ?? null
  const ventes = l.ventes ?? (l.aucune_vente === false ? 1 : 0)
  const jour = Math.min(30, Math.max(1, Number.isFinite(l.jour) ? l.jour! : 1))
  const gains = Number.isFinite(l.gains_eur) ? l.gains_eur! : 0
  const format = new Intl.NumberFormat('fr-FR').format(gains)
  const texte = !statut ? ventes > 0 ? 'Aucune expérience en cours. Lancer une expérience se décide avec Benj (R13).' : 'Aucune expérience avant la première vente (décision R13).'
    : statut === 'arretee_auto' ? 'Arrêtée seule à J30 : rien rapporté.'
    : statut === 'gagnante' ? `J30 atteint : ${format} € gagnés. À toi de décider de la suite.`
    : statut === 'arretee' ? 'Arrêtée par Benj.' : 'Expérience en cours.'
  return { barre: statut === 'en_cours' ? `J${jour}/30 · ${format} €` : null, titre: l.titre ?? l.nom ?? 'Expérience', texte, jour, sur: 30, gains, budget: Number.isFinite(l.budget_eur) ? l.budget_eur! : 0, statut, arret_le: statut === 'en_cours' ? l.fin_prevue_le ?? null : null }
}
