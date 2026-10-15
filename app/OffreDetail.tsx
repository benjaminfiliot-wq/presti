import { PLANS, detailOffre, type PlanPayant } from '@/lib/plans'

// Le détail COMPLET d'une offre, rendu depuis la grille de lib/plans.ts (detailOffre) : rien n'est recopié ici, rien n'est
// coupé (l'ancien `.slice(0, 5)` de la landing cachait le CRM et l'assistant derrière cinq lignes). Les lignes qui s'ajoutent
// à l'offre d'en dessous sont marquées. Composant sans état : utilisable côté serveur comme côté client.
export default function OffreDetail({ id, classe }: { id: PlanPayant; classe: 'lp-plist' | 'abo-list' }) {
  const { precedente, lignes } = detailOffre(id)
  const groupes: { nom: string; items: typeof lignes }[] = []
  for (const l of lignes) {
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.nom === l.groupe) dernier.items.push(l)
    else groupes.push({ nom: l.groupe, items: [l] })
  }
  return (
    <div className="od" data-offre-detail={id}>
      {precedente ? <p className="od-herite">Tout ce qu’inclut {PLANS[precedente].label}, et ce qui s’ajoute&nbsp;:</p> : <p className="od-herite">Ce qui est inclus&nbsp;:</p>}
      {groupes.map((g) => (
        <div key={g.nom} className="od-g">
          <p className="od-gt">{g.nom}</p>
          <ul className={classe}>
            {g.items.map((l) => (
              <li key={l.texte} className={l.nouveau ? 'od-nouveau' : undefined}>{l.nouveau ? <b className="od-badge">En plus</b> : null}{l.texte}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
