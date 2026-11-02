// La mosaïque de pixels derrière chaque démonstration (033-009) : la grammaire de mistral.ai (l'écran du produit posé sur de grands
// blocs de couleur en marches), version Presti : corail, corail clair, ambre, braise profonde, une étincelle jaune rare.
// Calculée côté serveur, de façon déterministe (même graine → mêmes blocs : aucun écart d'hydratation) ; SVG statique, aucun script.
// Chaque bloc porte son rang d'allumage (--i) : à l'entrée de la scène, les marches montent depuis le coin d'ancrage (landing-v2.css).
import type { CSSProperties } from 'react'

const COULEURS = ['#D97757', '#E8946F', '#EE8B3C', '#B85C3C', '#D97757', '#EE8B3C']

function graine(n: number) {
  return () => {
    n |= 0; n = (n + 0x6d2b79f5) | 0
    let t = Math.imul(n ^ (n >>> 15), 1 | n)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Bloc = { x: number; y: number; c: string; o: number; i: number }

/** `cote` : de quel côté monte l'escalier (gauche ou droite). */
export function blocs(n: number, cote: 'gauche' | 'droite', colonnes = 14, rangs = 10): Bloc[] {
  const h = graine(n)
  const out: Bloc[] = []
  for (let c = 0; c < colonnes; c++) {
    const d = cote === 'droite' ? colonnes - 1 - c : c // 0 = colonne d'ancrage
    // Profil en marches : haut près de l'ancrage, qui descend par paliers de deux colonnes.
    const hauteur = Math.max(1, Math.round(rangs * (0.92 - Math.floor(d / 2) * 0.13) + (h() - 0.5) * 1.6))
    for (let r = rangs - 1; r >= rangs - hauteur; r--) {
      if (h() < 0.16) continue // quelques trous : la matière respire
      const k = Math.floor(h() * COULEURS.length)
      const c0 = h() < 0.035 ? '#F5B301' : COULEURS[k]
      out.push({ x: c, y: r, c: c0, o: Math.round((0.8 + 0.2 * h()) * 100) / 100, i: d + (rangs - 1 - r) })
    }
    // Braises : un ou deux blocs isolés au-dessus du profil.
    if (h() < 0.45) { const r = Math.max(0, rangs - hauteur - 1 - Math.floor(h() * 3)); out.push({ x: c, y: r, c: COULEURS[Math.floor(h() * 4)], o: 0.7, i: d + rangs }) }
  }
  return out
}

export default function Mosaique({ n, cote, className = '' }: { n: number; cote: 'gauche' | 'droite'; className?: string }) {
  const b = blocs(n, cote)
  return (
    <svg className={`lp3-mosaique ${className}`} viewBox="0 0 14 10" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {b.map((p) => <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.002" height="1.002" fill={p.c} opacity={p.o} style={{ '--i': p.i } as CSSProperties} />)}
    </svg>
  )
}
