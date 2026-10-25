// La pastille d'offre du centre d'aide : « Gratuit », « Studio » ou « Signature » (l'Essentiel n'est plus vendu depuis le 25/10). Elle dit la PREMIÈRE offre qui inclut
// la fonctionnalité (lib/aideAutomatique.ts, lue dans lib/plans.ts) ; les offres au-dessus l'incluent aussi, ce que dit son info-bulle.
import { NOM_OFFRE, titrePastille, type OffreAide } from '@/lib/aideAutomatique'

export default function PastilleOffre({ offre }: { offre: OffreAide | null }) {
  if (!offre) return <span className="aide-pastille aide-pastille--part" title="Se commande à part ; ne fait partie d’aucune offre.">Commandé à part</span>
  return <span className={`aide-pastille aide-pastille--${offre}`} data-offre={offre} title={titrePastille(offre)}>{NOM_OFFRE[offre]}</span>
}
