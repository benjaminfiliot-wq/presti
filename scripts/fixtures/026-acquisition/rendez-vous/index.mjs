// scripts/fixtures/026-acquisition/rendez-vous/index.mjs — jeux d'essai de rendez-vous-qa (fiche 026-081, lot 6), écrit
// par Claude Code. Jetons d'essai, numéros de téléphone conformes et fautifs. Aucune donnée réelle (0612345678 et
// 0698765432 sont des numéros d'essai fictifs, pas de vrais numéros).

export const JETON_VALIDE = 'A'.repeat(43)
export const JETON_EXPIRE = 'B'.repeat(43)
export const JETON_DEJA_RESERVE = 'C'.repeat(43)
export const JETON_INCONNU = 'D'.repeat(43)
export const JETON_MAL_FORME = 'trop-court'

export const TELEPHONES_CONFORMES = Object.freeze(['0612345678', '+33612345678', '06 12 34 56 78'])
export const TELEPHONES_FAUTIFS = Object.freeze(['123', '061234567', '00612345678', 'abcdefghij'])
