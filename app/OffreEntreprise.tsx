import { PLANS } from '@/lib/plans'

// La carte « Presti pour l'entreprise, sur mesure » (036-023, enrichie par 036-026 : Benj, 03/11 au soir, « être plus vendeur, mettre
// plus d'informations »). Aucun prix, aucun chiffre de gain, aucun témoignage. Le titre et l'accroche viennent de PLANS.entreprise
// (lib/plans.ts) ; « sur devis » est son drapeau `surDevis`. Chaque phrase a sa source au fichier:ligne dans
// .orchestre/preuves/036-026/resume.md (prompt 6 § 2.2, § 2.4, § 2.6, § 2.8). Composant sans état : serveur comme client.

// Variante `abo` (page abonnement) : les trois bénéfices de 036-023, inchangés (prompt 6 § 2.2).
const BENEFICES = ['Votre équipe et vos rôles', 'Tous vos outils branchés', 'Des automatisations et des applications écrites pour vous']

// Variante `lp` (landing, #tarifs) : six points concrets, tirés du § 2.8 et du § 2.2 du prompt 6.
const POINTS = [
  'Un organigramme d’assistants écrit pour vous : un Cerveau, des chefs de service, des spécialistes',
  'Branché sur vos outils : Gmail, Outlook, Google Agenda, Slack, Teams, votre CRM, votre compta',
  'Vos procédures écrites, une à une, guident chaque assistant',
  'Un CRM sur mesure : vos champs, vos étapes, vos rôles, votre vocabulaire',
  'Des applications à votre nom : centre de commande, app de terrain, portail de vos clients',
  'La même autonomie que Signature, réglée type par type et fixée au contrat',
]

// Les cinq temps du parcours (§ 2.8, d'après le § 2.4).
const TEMPS = ['Rendez-vous', 'Accueil', 'Proposition', 'Mise en service', 'Suivi mensuel']

const LIEN = '/contact?motif=entreprise'
const PAGE = '/entreprise'

export default function OffreEntreprise({ variante }: { variante: 'lp' | 'abo' }) {
  const p = PLANS.entreprise
  if (variante === 'lp') {
    return (
      <div className="lp-plan lp-ent lp-spot" data-offre-entreprise>
        <div className="lp-ent-tete">
          <div className="lp-ent-gauche">
            <div className="lp-ent-kick">Sur mesure</div>
            <div className="lp-pn">{p.label}</div>
            <p className="lp-ent-promesse">Votre propre équipe d’assistants IA, construite pour votre entreprise et branchée sur vos outils.</p>
            <div className="lp-for">{p.accroche}</div>
            {p.surDevis ? <div className="lp-ent-devis">Sur devis, après un premier rendez-vous</div> : null}
          </div>
          <ul className="lp-plist lp-ent-points">
            {POINTS.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
        <ol className="lp-ent-temps" aria-label="Comment ça se passe, en cinq temps">
          {TEMPS.map((t, i) => <li key={t}><i>{i + 1}</i>{t}</li>)}
        </ol>
        <div className="lp-ent-actions">
          <a className="lp-btn lp-btn--p" href={LIEN} data-entreprise-contact>Parler à l’équipe</a>
          <a className="lp-ent-lien" href={PAGE} data-entreprise-page>Tout savoir sur l’offre Entreprise</a>
        </div>
      </div>
    )
  }
  return (
    <div className="abo-card abo-ent" data-offre-entreprise style={{ gridColumn: '1 / -1' }}>
      <div className="abo-name">{p.label}</div>
      {p.surDevis ? <div className="abo-credits">Sur devis</div> : null}
      <div className="abo-for">{p.accroche}</div>
      <ul className="abo-list">
        {BENEFICES.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <a className="psh-btn ghost" href={LIEN} data-entreprise-contact style={{ display: 'inline-flex', width: 'auto', justifyContent: 'center' }}>Parler à l’équipe</a>
      <a href={PAGE} data-entreprise-page style={{ display: 'inline-block', marginTop: '.6rem', textDecoration: 'underline', textUnderlineOffset: '.15em' }}>Tout savoir sur l’offre Entreprise</a>
    </div>
  )
}
