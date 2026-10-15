import { ECRANS, libelleOffreMinimale, type Ecran } from '@/lib/accesOffre'
import { PLANS, planConf } from '@/lib/plans'
import { actif } from '@/lib/flags'

// L'écran affiché à la place d'un écran réservé à une offre (15/10, Benj : « Ma plateforme » et « Mes chiffres » commencent avec
// Studio, pour tous les comptes, Essentiel existants compris). Il dit quoi, pourquoi, ce qui RESTE inclus dans l'offre actuelle,
// et mène à /abonnement. Rendu par app/plateforme/page.tsx et app/chiffres/page.tsx quand la matrice (lib/plans.ts) refuse l'écran
// — le serveur refuse de toute façon (403, lib/accesOffreServeur.ts) : cet écran n'est que l'explication.
const RESTE: Record<Ecran, string> = {
  plateforme: 'Votre lien de conversation reste actif, et l’IA continue de préparer les réponses : vous les relisez et les envoyez depuis Messages. Les comptes clients et votre nom de domaine restent aussi inclus.',
  chiffres: 'Vos devis et vos factures restent dans Devis et Factures, avec l’export de vos données. Seul le tableau de bord comptable passe en Studio.',
}
// Ce que Signature ajoute : dit seulement si c'est livré (règles : drapeau plateformeRegles ; compta : drapeaux de la migration 0140).
const plus = (ecran: Ecran): string | null =>
  ecran === 'plateforme'
    ? (actif('plateformeRegles') ? 'Avec Signature, vos règles d’automatisation créent et envoient le devis à votre place, selon vos réglages.' : null)
    : (actif('comptaAlerteImpayes') || actif('comptaExportMensuel') ? 'Avec Signature, les automatisations de ce tableau (alerte sur les impayés, export mensuel à votre comptable) travaillent à votre place.' : null)

export default function EcranVerrouille({ ecran, plan }: { ecran: Ecran; plan: string | null }) {
  const e = ECRANS[ecran]
  const offre = libelleOffreMinimale(e.capacite)
  const actuelle = plan && plan !== 'gratuit' ? `l’offre ${planConf(plan).label}` : 'votre essai'
  return (
    <div className="psh-panel verrou-offre" role="status" data-ecran-verrouille={ecran}>
      <div className="verrou-offre-cadenas" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      </div>
      <p className="verrou-offre-eyebrow">Disponible avec l’offre {offre}</p>
      <h2>« {e.nom} » commence avec l’offre {offre}</h2>
      <p>C’est {e.contenu}</p>
      <p>Vous êtes sur {actuelle}, qui n’inclut pas cet écran. {RESTE[ecran]}</p>
      {plus(ecran) ? <p className="verrou-offre-plus">{plus(ecran)}</p> : null}
      <div className="verrou-offre-actions">
        <a className="psh-btn primary" href="/abonnement">Passer à l’offre {offre}</a>
        <a className="psh-btn ghost" href="/abonnement">Comparer les offres ({PLANS.studio.prixMois} € Studio · {PLANS.signature.prixMois} € Signature)</a>
      </div>
    </div>
  )
}
