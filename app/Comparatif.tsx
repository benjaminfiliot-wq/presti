import { GRILLE, OFFRES, type PlanPayant } from '@/lib/plans'

// Le tableau « qui a quoi » — rendu depuis la matrice de lib/plans.ts, jamais écrit à la
// main. La landing et /abonnement affichent EXACTEMENT ce que le serveur verrouille.
// Composant serveur (aucun hook) : utilisable partout.

const COCHE = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>

function Cellule({ v }: { v: boolean | string }) {
  if (v === true) return <span className="cmp-oui" aria-label="Inclus">{COCHE}</span>
  if (v === false) return <span className="cmp-non" aria-label="Non inclus">—</span>
  return <span className="cmp-txt">{v}</span>
}

export default function Comparatif({ actuel, misEnAvant = 'studio' }: { actuel?: string | null; misEnAvant?: PlanPayant }) {
  const groupes = Array.from(new Set(GRILLE.map((l) => l.groupe)))
  return (
    <div className="cmp-wrap">
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col"><span className="visually-hidden">Fonctionnalité</span></th>
            {OFFRES.map((o) => (
              <th key={o.id} scope="col" className={`${o.id === misEnAvant ? 'cmp-feat' : ''}${actuel === o.id ? ' cmp-actuel' : ''}`}>
                <span className="cmp-nom">{o.label}</span>
                <span className="cmp-prix">{o.prix} €<small>/mois</small></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupes.map((g) => (
            <>
              <tr key={`g-${g}`} className="cmp-groupe"><th scope="rowgroup" colSpan={4}>{g}</th></tr>
              {GRILLE.filter((l) => l.groupe === g).map((l) => (
                <tr key={l.label}>
                  <th scope="row">{l.label}</th>
                  {OFFRES.map((o) => <td key={o.id} className={o.id === misEnAvant ? 'cmp-feat' : ''}><Cellule v={l.cellules[o.id]} /></td>)}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
