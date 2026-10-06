// Vitrine du tableau de bord de gestion (/chiffres, livré le 06/10) : le VRAI composant d'affichage
// (app/chiffres/Tableau.tsx) nourri par le VRAI calcul (lib/tableau-de-bord/calculer.ts), sur un jeu
// de données fictif (lib/tableau-de-bord/exemple.ts). Rien n'est dessiné à la main, aucun compte de
// démonstration en base. L'écran est inerte (aucun lien cliquable : ses liens mènent à l'espace connecté)
// et masqué aux lecteurs d'écran, qui reçoivent sa description en une phrase.
import '@/app/chiffres/chiffres.css'
import Tableau, { eur } from '@/app/chiffres/Tableau'
import { indicateursExemple } from '@/lib/tableau-de-bord/exemple'

export default function DemoChiffres() {
  const i = indicateursExemple()
  const resume = `Exemple : ${eur(i.argent.caMois)} facturés ce mois, ${eur(i.argent.enRetard)} en retard, ${i.aRelancer.total} devis à relancer.`
  return (
    <div className="lp-chiffres reveal">
      <div className="lp-chiffres-ecran">
        <div className="lp-chiffres-barre" aria-hidden="true"><span /><span /><span /><em>Mes chiffres</em></div>
        <p className="lp-sr">{resume}</p>
        <div className="lp-chiffres-corps" aria-hidden="true" inert>
          <Tableau i={i} />
        </div>
      </div>
      <p className="lp-chiffres-note">Le vrai écran, calculé sur un artisan fictif : noms, montants et villes sont inventés.</p>
    </div>
  )
}
