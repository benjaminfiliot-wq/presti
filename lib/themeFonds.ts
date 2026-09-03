// Fonds des thèmes, côté serveur (v4 §14).
//
// Sert à calculer une couleur d'accent LISIBLE pour les petits textes : l'accent est
// choisi par l'artisan, donc aucune valeur codée en dur ne peut convenir à tous.
// On prend volontairement la surface la plus défavorable de chaque thème (les cartes,
// pas le fond de page) : si ça passe là, ça passe partout.

export const FOND_THEME: Record<string, string> = {
  atelier: '#ECE6DC',
  nuit: '#16110D',
  epure: '#F1EEE9',
  chantier: '#E2DFD7',
  bleu: '#E6ECF3',
  vitrine: '#F0EEE9',
}

export function fondDuTheme(theme: string | null | undefined): string {
  return FOND_THEME[theme || 'atelier'] ?? FOND_THEME.atelier
}
