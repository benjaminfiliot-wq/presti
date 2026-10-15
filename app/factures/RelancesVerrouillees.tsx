// Le réglage des relances automatiques, VERROUILLÉ (15/10, Benj : « En Studio »). Montré aux comptes dont l'offre n'a pas la capacité
// `factures.relances` (Essai, Essentiel) quand le serveur a répondu 403 { code: 'offre' } : il dit quoi, ce qui reste inclus, et mène à /abonnement.
// Même esprit que app/EcranVerrouille.tsx ; le serveur refuse de toute façon (route et passage quotidien) — ceci n'est que l'explication.
import { PLANS, planConf, type PlanPayant } from '@/lib/plans'
import './relances-auto.css'

export default function RelancesVerrouillees({ plan, offre }: { plan: string | null; offre: PlanPayant | null }) {
  const cible = PLANS[offre ?? 'studio'].label
  const actuelle = plan && plan !== 'gratuit' ? `l’offre ${planConf(plan).label}` : 'votre essai'
  return (
    <section className="psh-panel rel-auto rel-verrou" aria-labelledby="rel-verrou-titre" data-relances-verrouillees>
      <p className="rel-eyebrow">Impayés</p>
      <h2 id="rel-verrou-titre">
        <svg className="rel-verrou-cadenas" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        Relances automatiques des factures impayées
      </h2>
      <label className="rel-case rel-case-verrou">
        <input type="checkbox" checked={false} disabled readOnly aria-describedby="rel-verrou-texte" />
        <span>Relancer automatiquement mes factures échues</span>
      </label>
      <p className="rel-etat" id="rel-verrou-texte">
        Disponible avec l’offre {cible}. Vous êtes sur {actuelle} : vos factures restent là, et vous pouvez toujours relancer un client à la main depuis « Mes chiffres » ou la conversation. Avec {cible}, une case à cocher suffit : les relances partent seules après l’échéance et s’arrêtent dès que la facture est payée ou que le client répond.
      </p>
      <div className="rel-pied">
        <a className="psh-btn primary" href="/abonnement">Passer à l’offre {cible}</a>
      </div>
    </section>
  )
}
