// lib/landing/aube.ts — « l'aube en pixels », la signature de la landing v2 : l'horizon corail de la piste B « Cinéma » (refonte du
// 18/10), dessiné en marches de pixels comme les blocs de mistral.ai (direction de Benj, 02/11 au soir : « claude.com × mistral.ai »).
// Calculée UNE fois, côté serveur, de façon déterministe (même graine → mêmes carrés : aucun écart d'hydratation, aucun JS au client).
// Rendue en SVG statique : aucune image à charger, aucun WebGL, rien qui bouge sans CSS.

export type Pixel = { x: number; y: number; o: number }

/** Générateur pseudo-aléatoire minuscule et stable (Mulberry32). */
function graine(n: number) {
  return () => {
    n |= 0; n = (n + 0x6d2b79f5) | 0
    let t = Math.imul(n ^ (n >>> 15), 1 | n)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Les carrés de l'aube : `colonnes` × `rangs` cellules de `cote` unités. La densité monte vers le bas (l'horizon) et vers le centre
 * (le soleil qui se lève derrière le produit) ; en haut, quelques pixels isolés se détachent, comme des braises.
 */
export function aube({ colonnes = 60, rangs = 9, cote = 24, centre = 0.5, largeurSoleil = 0.32, n = 1811 } = {}): Pixel[] {
  const hasard = graine(n)
  const pixels: Pixel[] = []
  for (let r = 0; r < rangs; r++) {
    const bas = (r + 1) / rangs // 0 en haut → 1 en bas
    for (let c = 0; c < colonnes; c++) {
      const dx = (c + 0.5) / colonnes - centre
      const soleil = Math.exp(-(dx * dx) / (2 * largeurSoleil * largeurSoleil)) // cloche centrée
      const p = Math.min(1, Math.pow(bas, 1.6) * (0.35 + 0.95 * soleil))
      if (hasard() < p) pixels.push({ x: c * cote, y: r * cote, o: Math.round((0.35 + 0.65 * bas * (0.55 + 0.45 * soleil)) * 100) / 100 })
    }
  }
  return pixels
}
