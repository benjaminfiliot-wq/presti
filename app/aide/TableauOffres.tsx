// « Qui a quoi » : les fonctionnalités du centre d'aide, offre par offre. Les cases sont calculées avec peut() (lib/plans.ts), jamais retapées.
// Sous le tableau : les essais gratuits sans carte (durées ESSAI_JOURS, crédits creditsEssai, plafond ESSAI_CREDITS_PLAFOND).
import { creditsParMois, ESSAIS_AIDE, inclus, lignesOffresVisibles, NOM_OFFRE, OFFRES_AIDE, PLAFOND_CREDITS_ESSAI } from '@/lib/aideAutomatique'
import { PLANS } from '@/lib/plans'

export default function TableauOffres() {
  const lignes = lignesOffresVisibles()
  const essais = ESSAIS_AIDE()
  return (
    <section id="grp-offres" className="aide-grp" aria-labelledby="grp-offres-t">
      <h2 id="grp-offres-t">Qui a quoi, offre par offre</h2>
      <div className="aide-tab" role="table" aria-label="Fonctionnalités incluses dans chaque offre">
        <div className="aide-tab-r aide-tab-head" role="row">
          <span role="columnheader">Fonctionnalité</span>
          {OFFRES_AIDE.map((o) => <span role="columnheader" key={o}>{NOM_OFFRE[o]}</span>)}
        </div>
        {lignes.map((l) => (
          <div className="aide-tab-r" role="row" key={l.id}>
            <span className="aide-tab-l" role="rowheader">{l.label}</span>
            {OFFRES_AIDE.map((o) => {
              const oui = inclus(o, l.cap)
              return <span role="cell" key={o} data-o={NOM_OFFRE[o]} className={oui ? 'oui' : 'non'}>{oui ? '✓' : '—'}<span className="aide-sr">{oui ? ' inclus' : ' non inclus'}</span></span>
            })}
          </div>
        ))}
        <div className="aide-tab-r" role="row">
          <span className="aide-tab-l" role="rowheader">Crédits chaque mois</span>
          {OFFRES_AIDE.map((o) => <span role="cell" key={o} data-o={NOM_OFFRE[o]} className="oui">{creditsParMois(o)}</span>)}
        </div>
      </div>
      <div className="aide-essai" id="essais-gratuits">
        <h3>Essayer gratuitement, sans carte</h3>
        <p>Pour un premier abonnement, un essai gratuit existe sans carte bancaire, une seule fois par compte :</p>
        <ul>
          {essais.map((e) => <li key={e.offre}><b>{e.nom}</b> : {e.jours} jours, {e.credits} crédits d’essai</li>)}
        </ul>
        <p>Les crédits d’essai sont ceux du mois au prorata des jours d’essai (sur 30), arrondis à l’entier inférieur, et plafonnés à {PLAFOND_CREDITS_ESSAI} crédits quelle que soit l’offre. À la fin de l’essai sans carte, rien n’est prélevé et vous repassez à l’offre Gratuit ({PLANS.gratuit.creditsMois} crédits par mois).</p>
      </div>
    </section>
  )
}
