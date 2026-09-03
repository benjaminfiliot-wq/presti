// Contraste de lisibilité (WCAG 2.1) — v4 §7/E1.
// Sert de garde-fou quand l'artisan choisit ses couleurs : on ne le laisse pas publier
// un site où son propre texte est illisible sans le lui dire clairement.

function canal(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Luminance relative d'une couleur `#rrggbb`. Renvoie null si la couleur est illisible. */
export function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

/** Rapport de contraste entre deux couleurs : 1 (identiques) → 21 (noir sur blanc). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return 1
  const [h, l] = la > lb ? [la, lb] : [lb, la]
  return (h + 0.05) / (l + 0.05)
}

/** Le niveau WCAG atteint pour du texte courant. */
export function niveauWCAG(ratio: number): 'AAA' | 'AA' | 'limite' | 'insuffisant' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'limite' // acceptable pour les grands titres seulement
  return 'insuffisant'
}

/** Noir ou blanc — celui qui se lit le mieux sur ce fond. */
export function encreLisible(fond: string): '#000000' | '#ffffff' {
  return contrastRatio(fond, '#000000') >= contrastRatio(fond, '#ffffff') ? '#000000' : '#ffffff'
}
