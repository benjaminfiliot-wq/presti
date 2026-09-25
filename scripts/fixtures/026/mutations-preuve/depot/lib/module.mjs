// Faux module du mini-dépôt d'essai du méta-juge (026-001). Le faux juge scripts/x-qa.mjs le juge par deux critères.

/** plafond entre 0 et 10 */
export function plafond(n) {
  return Math.max(0, Math.min(n, 10))
}

/** le signe d'un nombre, 1 pour zéro */
export function signe(n) {
  return n < 0 ? -1 : 1
}
