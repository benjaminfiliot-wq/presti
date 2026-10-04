'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { lire, messagePanne } from './Barre'
import { FeuilleAppels, FeuilleDecisions } from './Gestes'
import type { Attention as AttentionDonnees, Env, Role } from './Station'

// La file Attention, UNIQUE : les cartes servies, dans l'ordre servi (l'ordre, les couleurs et les comptes viennent des
// modules purs et de la route, l'écran ne trie rien). Une carte de geste « ouvrir » est un lien vers sa cible ; « decisions »
// et « appels » ouvrent leur feuille respective. Jamais de bouton « Envoyer », « Envoyé », « Copier », « Sauter » ni « Relayer ».
type Props = {
  env: Env<AttentionDonnees> | null
  erreurVue: string | null
  role?: Role
}

const PHRASE_VIDE = 'Rien pour toi. L’équipage tourne.'
const CIBLE_SURE = /^\/(controle(\/station)?|parametres)([?#/]|$)/

export default function Attention({ env, erreurVue, role = 'direction' }: Props) {
  const l = lire(env, erreurVue)
  const params = useSearchParams()
  const [feuille, setFeuille] = useState<'decisions' | 'appels' | null>(null)
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

  // Lien profond : ?decision=<id> ouvre la feuille des décisions au chargement
  useEffect(() => {
    const dec = params.get('decision')
    if (dec) {
      setFeuille('decisions')
    }
  }, [params])

  const decisionId = params.get('decision') ?? undefined

  return (
    <>
      <section className="mc-zone" data-zone="attention" aria-label="Attention">
        <h2 className="mc-titre-zone">ATTENTION</h2>
        {l.etat === 'chargement' ? <p className="mc-etat">Chargement…</p> : null}
        {l.etat === 'panne' ? <p className="mc-etat mc-panne" role="alert">{messagePanne('Attention', l.raison)}</p> : null}
        {l.etat === 'hors' ? <p className="mc-etat">— · hors périmètre</p> : null}
        {l.etat === 'ok' && l.valeur.cartes.length === 0 ? <p className="mc-etat" data-vide-attention>{l.valeur.vide ?? PHRASE_VIDE}</p> : null}
        {l.etat === 'ok' ? l.valeur.cartes.map((c) => {
          const contenu = (
            <>
              <span className="mc-att-nombre">{c.nombre}</span>
              <span className="mc-att-titre">{c.titre}</span>
            </>
          )
          const cible = c.geste.type === 'ouvrir' ? c.geste.cible : undefined
          if (cible && CIBLE_SURE.test(cible) && !cible.includes('@') && !/\d{9}/.test(cible)) {
            return (
              <Link key={c.cle} href={cible} className="mc-att" data-carte-attention={c.cle} data-couleur={c.couleur}>
                {contenu}
              </Link>
            )
          }

          // Cartes decisions et appels : cliquables pour ouvrir la feuille correspondante
          if (c.geste.type === 'decisions') {
            return (
              <div
                key={c.cle}
                className="mc-att"
                role="button"
                tabIndex={0}
                data-carte-attention={c.cle}
                data-couleur={c.couleur}
                onClick={() => setFeuille('decisions')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFeuille('decisions') } }}
              >
                {contenu}
              </div>
            )
          }

          if (c.geste.type === 'appels') {
            return (
              <div
                key={c.cle}
                className="mc-att"
                role="button"
                tabIndex={0}
                data-carte-attention={c.cle}
                data-couleur={c.couleur}
                onClick={() => setFeuille('appels')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFeuille('appels') } }}
              >
                {contenu}
              </div>
            )
          }

          return (
            <div key={c.cle} className="mc-att" data-carte-attention={c.cle} data-couleur={c.couleur}>
              {contenu}
            </div>
          )
        }) : null}
        {l.etat === 'ok' && l.valeur.total > l.valeur.cartes.length ? <p className="mc-autres" data-autres>{l.valeur.total - l.valeur.cartes.length} autres</p> : null}
      </section>

      {feuille === 'decisions' ? (
        <FeuilleDecisions role={roleEffectif} decision={decisionId} fermer={() => setFeuille(null)} />
      ) : null}

      {feuille === 'appels' ? (
        <FeuilleAppels role={roleEffectif} fermer={() => setFeuille(null)} />
      ) : null}
    </>
  )
}
