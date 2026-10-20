'use client'

import type { DonneesAtelier, ObjetScene } from '@/lib/crm/atelier'
import { articlesDe, CATEGORIES_TYPIQUES, type ActionFiche, type Metier3D } from '@/lib/crm/infrastructure'
import { Lien } from '../mode'
import StockRapide from './Stock'

// Le panneau d'une STRUCTURE de la base (lot 4 : « tout ce qui se voit est cliquable et utile ») : à quoi elle sert, les données réelles
// qui s'y rattachent (stock d'une famille, commandes attendues, véhicules, équipe, profil), une ou deux actions vers l'écran qui existe —
// et, pour une structure de stockage, de quoi REMPLIR le stock sur place (./Stock.tsx). La fiche est calculée par lib/crm/infrastructure.ts.

export default function PanneauStructure({ objet, donnees, metier, onVue2D, onChoisir, onChange }: {
  objet: ObjetScene; donnees: DonneesAtelier; metier: Metier3D
  onVue2D: (vue: string) => void; onChoisir?: (cle: string) => void; onChange: () => void
}) {
  const f = objet.fiche
  if (!f) return <p className="crm-vide">{objet.detail}</p>
  const aller = (a: ActionFiche) =>
    a.href ? <Lien key={a.libelle} className="psh-btn ghost" href={a.href}>{a.libelle}</Lien>
      : a.onglet ? <button key={a.libelle} type="button" className="psh-btn ghost" onClick={() => onVue2D(a.onglet!)}>{a.libelle}</button>
        : a.objet ? <button key={a.libelle} type="button" className="psh-btn ghost" onClick={() => onChoisir?.(a.objet === 'accueil' ? 'accueil' : a.objet!)}>{a.libelle}</button>
          : null
  return (
    <div className="atl-pile" data-atelier-structure={objet.ref}>
      <p className="atl-role">{f.role}</p>
      {f.lignes.length > 0 && <ul className="atl-liste atl-fiche">{f.lignes.map((l, i) => <li key={i}><span>{l}</span></li>)}</ul>}
      {f.stock && (
        <StockRapide donnees={donnees} articles={articlesDe(donnees, f.stock.filtre)} famille={f.stock.famille}
          suggestions={CATEGORIES_TYPIQUES[metier]} onChange={onChange} />
      )}
      <div className="crm-boutons">{f.actions.map(aller)}</div>
    </div>
  )
}
