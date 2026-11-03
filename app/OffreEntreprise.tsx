import { PLANS } from '@/lib/plans'

// La carte « Presti pour l'entreprise, sur mesure » (036-023, demande de Benj du 03/11). Sobre : aucun prix, aucun chiffre de gain,
// aucun témoignage. Le titre et l'accroche viennent de PLANS.entreprise (lib/plans.ts) ; « sur devis » est son drapeau `surDevis`.
// Les trois bénéfices sont ceux du prompt 6 § 2.2. Composant sans état : serveur comme client.
const BENEFICES = ['Votre équipe et vos rôles', 'Tous vos outils branchés', 'Des automatisations et des applications écrites pour vous']
const LIEN = '/contact?motif=entreprise'

export default function OffreEntreprise({ variante }: { variante: 'lp' | 'abo' }) {
  const p = PLANS.entreprise
  if (variante === 'lp') {
    return (
      <div className="lp-plan lp-ent lp-spot" data-offre-entreprise>
        <div className="lp-pn">{p.label}</div>
        {p.surDevis ? <div className="lp-ent-devis">Sur devis</div> : null}
        <div className="lp-for">{p.accroche}</div>
        <ul className="lp-plist">
          {BENEFICES.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <a className="lp-btn lp-btn--g" href={LIEN} data-entreprise-contact>Parler à l’équipe</a>
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
    </div>
  )
}
