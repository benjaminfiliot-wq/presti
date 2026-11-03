'use client'

import { contexteDeObjet, quandLisible } from '@/lib/crm/assistantCrm'
import { useSansEcriture } from './contexte'
import { useActivite } from '../assistant/useActivite'
import type { ObjetScene } from '@/lib/crm/atelier'

// La ligne « fait : … » de la fiche d'un objet de la maquette (03/11, prompt 6 : « chaque objet ouvre sa fiche, qui montre ce que les
// assistants y ont fait »). Elle lit le MÊME fil que le poste des assistants (useActivite → GET /api/crm/assistants/activite, filtré par
// compte, les douze dernières actions) et ne garde que les actions « faites » qui portent sur CET objet. Rien d'autre n'est inventé :
// aucune action récente sur l'objet → la ligne le dit.
export default function LigneFait({ objet }: { objet: ObjetScene }) {
  const simule = useSansEcriture()
  const { activite } = useActivite(simule)
  const c = contexteDeObjet(objet)
  if (!c) return null
  const faites = (activite?.lignes ?? []).filter((l) => l.etat === 'fait' && l.objet?.type === c.type && l.objet.id === c.id)
  const maintenant = new Date()
  return (
    <p className="atl-fait" data-atelier-fait aria-live="polite">
      {!activite ? <span className="muted">fait : lecture…</span>
        : !activite.disponible ? null
        : faites.length === 0 ? <span className="muted">fait : rien de récent par les assistants sur cet élément.</span>
        : <><b>fait :</b> {faites.slice(0, 2).map((l) => l.texte).join(' · ')} <time className="muted tnum" dateTime={faites[0].quand}>{quandLisible(faites[0].quand, maintenant)}</time></>}
    </p>
  )
}
