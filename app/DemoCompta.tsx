'use client'

// Vitrine de la comptabilité artisan (refonte du 11/10) : le VRAI tableur de /chiffres (app/chiffres/Tableur.tsx),
// en lecture seule, sur des lignes fictives (lib/compta-exemple.ts). Rien n'est dessiné à la main : les feuilles,
// le tri, les filtres, les totaux et le téléchargement .xlsx sont ceux que l'artisan utilise. Sans `onChange`,
// aucune cellule n'est modifiable et rien n'est écrit nulle part.
import '@/app/chiffres/chiffres.css'
import Tableur from '@/app/chiffres/Tableur'
import { LIGNES_EXEMPLE } from '@/lib/compta-exemple'

export default function DemoCompta() {
  return (
    <div className="lp-compta reveal">
      <div className="lp-chiffres-ecran">
        <div className="lp-chiffres-barre" aria-hidden="true"><span /><span /><span /><em>Comptabilité · classeur</em></div>
        <div className="lp-compta-corps ca">
          <Tableur lignes={[...LIGNES_EXEMPLE]} />
        </div>
      </div>
      <p className="lp-chiffres-note">Le vrai tableur, sur un plombier fictif : noms et montants sont inventés. Triez, filtrez, téléchargez l&apos;exemple en .xlsx.</p>
    </div>
  )
}
