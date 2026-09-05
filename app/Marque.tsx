import Image from 'next/image'

// Marque Presti — « l'aube » : un demi-soleil au pinceau posé sur une ligne d'horizon, le premier
// rayon. Trace peinte (poils, bavures, fin sèche) figée dans public/marque/*.svg — on ne la
// redessine pas en code, on l'affiche. Réservée aux surfaces Presti (console, landing) : JAMAIS sur
// le site ou la plateforme d'un artisan (white-label). Versions : corail (fonds sombres, défaut),
// encre (fonds clairs).
type Props = { size?: number; variante?: 'corail' | 'encre'; className?: string; title?: string }

export default function Marque({ size = 34, variante = 'corail', className, title }: Props) {
  return (
    <Image
      src={`/marque/presti-marque-${variante}.svg`}
      width={size} height={size} alt={title ?? ''} className={className}
      unoptimized priority draggable={false}
    />
  )
}
