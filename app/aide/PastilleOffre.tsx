// La pastille d'offre du centre d'aide : « Gratuit », « Studio » ou « Signature » (l'Essentiel n'est plus vendu depuis le 25/10). Elle dit la PREMIÈRE offre qui inclut
// la fonctionnalité (lib/aideAutomatique.ts, lue dans lib/plans.ts) ; les offres au-dessus l'incluent aussi, ce que dit son info-bulle.
// 03/11 (036-037) : « Sur devis » pour l'offre Entreprise (PLANS.entreprise.surDevis) : ni Studio ni Signature, et surtout pas « Gratuit ».
import { NOM_OFFRE, titrePastille, type PastilleAide } from '@/lib/aideAutomatique'

export default function PastilleOffre({ offre }: { offre: PastilleAide }) {
  if (offre === 'sur_devis') return <span className="aide-pastille aide-pastille--part" data-offre="sur_devis" title="Une offre à part, construite sur mesure : le prix se fixe sur devis, après un premier rendez-vous.">Sur devis</span>
  if (!offre) return <span className="aide-pastille aide-pastille--part" title="Se commande à part ; ne fait partie d’aucune offre.">Commandé à part</span>
  return <span className={`aide-pastille aide-pastille--${offre}`} data-offre={offre} title={titrePastille(offre)}>{NOM_OFFRE[offre]}</span>
}
