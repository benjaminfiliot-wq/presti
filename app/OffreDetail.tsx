import { PLANS, detailOffre, type PlanPayant } from '@/lib/plans'

// Le détail COMPLET d'une offre, rendu depuis la grille de lib/plans.ts (detailOffre) : rien n'est recopié ici, rien n'est
// coupé (l'ancien `.slice(0, 5)` de la landing cachait le CRM et l'assistant derrière cinq lignes). Au-dessus de la première
// offre, seules les lignes qui s'ajoutent à l'offre d'en dessous sont listées, sous « Tout ce qu'inclut l'offre X, plus : ». Composant sans état : utilisable côté serveur comme côté client.
export default function OffreDetail({ id, classe }: { id: PlanPayant; classe: 'lp-plist' | 'abo-list' }) {
  const { precedente, lignes: toutes } = detailOffre(id)
  // 15/10 (Benj) : une offre ne répète pas celle d'en dessous — « Tout ce qu'inclut X, plus : » puis seulement ce qui s'ajoute.
  const lignes = precedente ? toutes.filter((l) => l.nouveau) : toutes
  const groupes: { nom: string; items: typeof lignes }[] = []
  for (const l of lignes) {
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.nom === l.groupe) dernier.items.push(l)
    else groupes.push({ nom: l.groupe, items: [l] })
  }
  return (
    <div className="od" data-offre-detail={id}>
      {precedente ? <p className="od-herite">Tout ce qu’inclut l’offre {PLANS[precedente].label}, <b>plus</b>&nbsp;:</p> : <p className="od-herite">Ce qui est inclus&nbsp;:</p>}
      {groupes.map((g) => (
        <div key={g.nom} className="od-g">
          <p className="od-gt">{g.nom}</p>
          <ul className={classe}>
            {g.items.map((l) => (
              <li key={l.texte}>{l.texte}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
