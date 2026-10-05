'use client'

import { euros } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import type { Env } from '../Station'
import Fenetre, { Corps, Tuile, type SalleProps } from './Fenetre'
import { ecrire, estNombre, usePanneau, type Rep } from './lecture'

// Le panneau de la salle Presti (fiche 026-189) : le business hors agents, en lecture seule. Le MRR, les artisans actifs, le NOMBRE de
// tickets de support ouverts (jamais leur contenu, jamais qui les a écrits) et le score de chaque Cerveau, tels que servis. Une sous-partie
// refusée se dit « hors périmètre », jamais 0 ; le texte servi s'affiche en texte ; aucun bouton.
type Vue = {
  artisans_actifs: number | null
  cerveaux: { cle: string; score: number | null }[]
  mrr: Env<number> | null
  tickets: Env<{ nombre: number }> | null
}

const pourcent = (x: number | null | undefined) => (estNombre(x) ? `${Math.round(x * 100)} %` : '—')

export default function Presti({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=presti'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="presti" titre="Presti" onFermer={onFermer} etat={v ? etat : null} resume={{ equipage, poser, recettes: v?.mrr ? ecrire(v.mrr, (m) => euros(m), 'MRR') : null, taches: v?.cerveaux?.length ?? null }}>
      <Corps etat={etat} quoi="Presti">
        {(vue) => (
          <>
            <div className="mc-tuiles" data-groupe="business">
              <Tuile libelle="MRR" attribut="mrr" note="abonnements récurrents">{ecrire(vue.mrr, (m) => euros(m), 'Stripe')}</Tuile>
              <Tuile libelle="ARTISANS ACTIFS" attribut="artisans">{estNombre(vue.artisans_actifs) ? vue.artisans_actifs : '—'}</Tuile>
              <Tuile libelle="TICKETS DE SUPPORT OUVERTS" attribut="tickets">{ecrire(vue.tickets, (t) => String(t.nombre), 'Support')}</Tuile>
            </div>
            <h3 className="mc-titre-zone">CERVEAUX</h3>
            {vue.cerveaux.length === 0 ? <p className="mc-etat">Aucun score de Cerveau pour l’instant.</p> : (
              <ul className="mc-liste" data-groupe="cerveaux">
                {vue.cerveaux.map((c) => <li key={c.cle} data-cerveau={c.cle}><span>{c.cle}</span><span className="mc-chiffre">{pourcent(c.score)}</span></li>)}
              </ul>
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
