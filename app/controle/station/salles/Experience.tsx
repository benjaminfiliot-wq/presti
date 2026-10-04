'use client'

import { euros } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import Fenetre, { Corps, Tuile, type SalleProps } from './Fenetre'
import { jour as jourParis, usePanneau, type Rep } from './lecture'
import './experience.css'

// La Salle Expérience (fiche 026-125, décision R13) : l'expérience isolée (un budget, 30 jours, un arrêt automatique à J30 si
// elle n'a rien rapporté), en lecture seule. Tant qu'aucune vente n'existe, la salle le dit et rien n'est rendu d'autre. L'écran
// n'ajoute aucune phrase ni aucun calcul : le texte, le jour, le budget et les gains sont ceux que la route sert
// (etatExperience). Aucun bouton de lancement, d'arrêt ou de relance : le geste de lancement viendra avec la première expérience.
type Vue = {
  barre: string | null
  titre?: string | null
  texte: string
  jour: number
  sur: number
  gains: number
  budget: number
  statut: string | null
  arret_le?: string | null
}

export default function Experience({ attribut, onFermer }: Pick<SalleProps, 'onFermer'> & { attribut: 'data-salle-panneau' }) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=experience'))
  return (
    <Fenetre cle="experience" attribut={attribut} titre="Salle Expérience" onFermer={onFermer} etat={etat}>
      <Corps etat={etat} quoi="Expérience">
        {(v) => {
          const enCours = v.statut === 'en_cours'
          const gagnante = v.statut === 'gagnante'
          const part = Math.min(1, Math.max(0, v.sur > 0 ? v.jour / v.sur : 0))
          return (
            <>
              {v.titre && v.statut ? <h3 className="mc-titre-zone" data-experience-titre>{v.titre}</h3> : null}
              <p className="mc-texte-exact mc-experience-texte" data-experience-texte>{v.texte}</p>
              {enCours ? (
                <>
                  <div className="mc-experience-barre" role="progressbar" aria-label="Jour de l'expérience" aria-valuemin={0} aria-valuenow={v.jour} aria-valuemax={v.sur} aria-valuetext={`jour ${v.jour} sur ${v.sur}`} style={{ ['--part' as string]: part }}>
                    <span />
                  </div>
                  <p className="mc-petit mc-chiffre" data-experience-jour>{`J${v.jour}/${v.sur}`}</p>
                  <div className="mc-tuiles" data-groupe="experience">
                    <Tuile libelle="BUDGET" attribut="experience-budget">{euros(v.budget)}</Tuile>
                    <Tuile libelle="GAINS" attribut="experience-gains">{euros(v.gains)}</Tuile>
                  </div>
                  {v.arret_le ? <p className="mc-doux" data-experience-arret>{`S'arrête seule le ${jourParis(v.arret_le)} si elle n'a rien rapporté.`}</p> : null}
                </>
              ) : null}
              {gagnante ? (
                <div className="mc-tuiles" data-groupe="experience">
                  <Tuile libelle="GAINS" attribut="experience-gains">{euros(v.gains)}</Tuile>
                </div>
              ) : null}
            </>
          )
        }}
      </Corps>
    </Fenetre>
  )
}
