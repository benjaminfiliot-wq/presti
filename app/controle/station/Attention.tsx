'use client'

import Link from 'next/link'
import { lire, messagePanne } from './Barre'
import type { Attention as AttentionDonnees, Env } from './Station'

// La file Attention, UNIQUE : les cartes servies, dans l'ordre servi (l'ordre, les couleurs et les comptes viennent des
// modules purs et de la route, l'écran ne trie rien). Une carte de geste « ouvrir » est un lien vers sa cible ; « decisions »
// et « appels » sont affichées sans action (les gestes vivent dans leur fiche). Jamais de bouton « Envoyer » ni « Copier ».
type Props = { env: Env<AttentionDonnees> | null; erreurVue: string | null }

const PHRASE_VIDE = 'Rien pour toi. L’équipage tourne.'
// Une cible n'est suivie que si elle mène dans la console : le reste s'affiche sans lien.
const CIBLE_SURE = /^\/(controle(\/station)?|parametres)([?#/]|$)/

export default function Attention({ env, erreurVue }: Props) {
  const l = lire(env, erreurVue)
  return (
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
        return cible && CIBLE_SURE.test(cible) && !cible.includes('@') && !/\d{9}/.test(cible)
          ? <Link key={c.cle} href={cible} className="mc-att" data-carte-attention={c.cle} data-couleur={c.couleur}>{contenu}</Link>
          : <div key={c.cle} className="mc-att" data-carte-attention={c.cle} data-couleur={c.couleur}>{contenu}</div>
      }) : null}
      {l.etat === 'ok' && l.valeur.total > l.valeur.cartes.length ? <p className="mc-autres" data-autres>{l.valeur.total - l.valeur.cartes.length} autres</p> : null}
    </section>
  )
}
