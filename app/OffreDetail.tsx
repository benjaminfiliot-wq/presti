import { PLANS, detailOffre, type PlanPayant } from '@/lib/plans'

// Le détail COMPLET d'une offre, rendu depuis la grille de lib/plans.ts (detailOffre) : rien n'est recopié ici, rien n'est
// coupé (l'ancien `.slice(0, 5)` de la landing cachait le CRM et l'assistant derrière cinq lignes). Au-dessus de la première
// offre, seules les lignes qui s'ajoutent à l'offre d'en dessous sont listées, sous « Tout ce qu'inclut l'offre X, plus : ». Composant sans état : utilisable côté serveur comme côté client.
// 02/11 (Benj : « trop d'informations sur les différentes offres ») : en mode `court`, la landing montre une ligne par groupe,
// raccourcie, comme les cartes de claude.com ; le niveau d'automatisation est déjà dans l'accroche, les crédits au-dessus. Le détail
// complet reste dans « Qui a quoi, ligne par ligne » (app/Comparatif.tsx), et partout ailleurs (sans `court`) rien ne change.
const HORS_RESUME = new Set(['Automatisation', 'Inclus'])
function resumer(texte: string): string {
  let t = texte
  for (const coupure of [' : ', ' — ', ' (', ', ']) {
    if (t.length <= 64) break
    const i = t.indexOf(coupure)
    if (i > 0 && t.slice(0, i).split(/\s+/).length >= 3) t = t.slice(0, i)
  }
  return t.trim()
}

export default function OffreDetail({ id, classe, court = false }: { id: PlanPayant; classe: 'lp-plist' | 'abo-list'; court?: boolean }) {
  const { precedente, lignes: toutes } = detailOffre(id)
  // 15/10 (Benj) : une offre ne répète pas celle d'en dessous — « Tout ce qu'inclut X, plus : » puis seulement ce qui s'ajoute.
  const lignes = precedente ? toutes.filter((l) => l.nouveau) : toutes
  const groupes: { nom: string; items: typeof lignes }[] = []
  for (const l of lignes) {
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.nom === l.groupe) dernier.items.push(l)
    else groupes.push({ nom: l.groupe, items: [l] })
  }
  const herite = precedente ? <p className="od-herite">Tout ce qu’inclut l’offre {PLANS[precedente].label}, <b>plus</b>&nbsp;:</p> : <p className="od-herite">Ce qui est inclus&nbsp;:</p>
  if (court) {
    const points = groupes.filter((g) => !HORS_RESUME.has(g.nom)).map((g) => resumer(g.items[0].texte))
    return (
      <div className="od od--court" data-offre-detail={id}>
        {herite}
        <ul className={classe}>
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <div className="od" data-offre-detail={id}>
      {herite}
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
