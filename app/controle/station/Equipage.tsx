'use client'

import { useEffect, useState } from 'react'
import { euros, relTime } from '@/lib/direction/fraicheur'
import { SALLES } from '@/lib/pilotage/equipage'
import { lire, messagePanne } from './Barre'
import { ConsigneAgent, PauseAgent } from './Gestes'
import type { Attention, Env, Equipage as EquipageDonnees, Poser, Role } from './Station'

// L'équipage : le Commandant en tête, puis une carte par agent, dans l'ordre servi. Le point d'état, ce qu'il fait, sa
// cadence, son coût du mois, son modèle (le texte servi, jamais un nom écrit ici), la salle où il se trouve, l'ancienneté
// de son activité, et la ligne « ⚠ » quand une carte Attention le nomme (le même texte que la carte).
// Fiche 026-117 : chaque agent porte PauseAgent et ConsigneAgent (aucun pour le rôle lecture).
type Props = {
  env: Env<EquipageDonnees> | null
  erreurVue: string | null
  attention: Env<Attention> | null
  maintenant: number
  prenom: string
  replie: boolean
  poser: Poser
  role?: Role
}

const PLAQUES: Record<string, string> = Object.fromEntries(SALLES.map((s) => [s.cle, s.plaque]))

export default function Equipage({ env, erreurVue, attention, maintenant, prenom, replie, poser, role = 'direction' }: Props) {
  const l = lire(env, erreurVue)
  const att = lire(attention)
  const cartes = att.etat === 'ok' ? att.valeur.cartes : []
  const couts = l.etat === 'ok' ? lire(l.valeur.couts) : null
  const [estLecture, setEstLecture] = useState(role === 'lecture')

  useEffect(() => {
    if (role === 'lecture') {
      setEstLecture(true)
      return
    }
    const verifierRole = () => {
      const el = document.querySelector('.mc[data-role="lecture"], .mc-lecture, [data-lecture-seule]')
      if (el) setEstLecture(true)
    }
    verifierRole()
    const timer = setInterval(verifierRole, 100)
    return () => clearInterval(timer)
  }, [role])

  const roleEffectif = estLecture ? 'lecture' : role

  if (replie) {
    // Le rail de 44 px : une pastille par agent, rien d'autre.
    return (
      <section className="mc-zone mc-rail" data-zone="equipage" aria-label="Équipage">
        {l.etat === 'ok' ? l.valeur.agents.map((a) => (
          <button key={a.nom} type="button" className="mc-pastille" data-pastille-agent={a.nom} aria-label={`${a.libelle} : ${a.activite}`} title={`${a.libelle} : ${a.activite}`} onClick={() => poser({ agent: a.nom, salle: null })}>
            <span className="mc-point" data-point={a.point} />
          </button>
        )) : null}
      </section>
    )
  }

  return (
    <section className="mc-zone" data-zone="equipage" aria-label="Équipage">
      <h2 className="mc-titre-zone">ÉQUIPAGE</h2>
      <div className="mc-commandant" data-commandant>
        <b>{prenom}</b>
        <small>Commandant · fondateur</small>
        <small>à la console</small>
      </div>
      {l.etat === 'chargement' ? <p className="mc-etat">Chargement…</p> : null}
      {l.etat === 'panne' ? <p className="mc-etat mc-panne" role="alert">{messagePanne('Équipage', l.raison)}</p> : null}
      {l.etat === 'hors' ? <p className="mc-etat">— · hors périmètre</p> : null}
      {l.etat === 'ok' ? l.valeur.agents.map((a) => {
        const carte = cartes.find((c) => c.agent === a.nom)
        const cout = couts?.etat === 'ok' ? couts.valeur.find((c) => c.nom === a.nom)?.cout_mois_eur : null
        const ouvrir = () => poser({ agent: a.nom, salle: null })
        return (
          <div key={a.nom} className="mc-agent" role="button" tabIndex={0} data-agent={a.nom} onClick={ouvrir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir() } }}>
            <div className="mc-agent-tete">
              <span className="mc-point" data-point={a.point} aria-label={`état ${a.point}`} />
              <b>{a.libelle}</b>
              <small>{a.role}</small>
            </div>
            <div className="mc-agent-act" data-activite>{a.activite}</div>
            {carte ? <div className="mc-agent-alerte" data-alerte>⚠ {carte.titre}</div> : null}
            <div className="mc-agent-meta">
              <span data-salle-agent>📍 {PLAQUES[a.position.salle] ?? a.position.salle}</span>
              <span data-anciennete>{relTime(a.activite_le, maintenant)}</span>
            </div>
            <div className="mc-agent-meta">
              <span data-cadence>{a.cadence}</span>
              <span data-cout>{euros(cout)}</span>
            </div>
            <div className="mc-agent-modele" data-modele>{a.modele.texte}</div>
            {roleEffectif === 'direction' ? (
              <div className="mc-agent-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <PauseAgent nom={a.nom} etat={a.etat} />
                <ConsigneAgent nom={a.nom} libelle={a.libelle} />
              </div>
            ) : null}
          </div>
        )
      }) : null}
    </section>
  )
}
