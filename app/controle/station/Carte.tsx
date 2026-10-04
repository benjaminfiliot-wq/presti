'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { actif } from '@/lib/flags'
import { SALLES, SALLE_RESERVEE } from '@/lib/pilotage/equipage'
import type { Bulle, CarteDonnees, Env, Equipage, ReglagesServis, Tapis } from './Station'

// Le cadre de la carte. Drapeau `stationCarte` baissé (tant que la carte pixel, fiches 026-179 à 026-186, n'est pas livrée et recettée),
// il rend un contenu d'attente ET la liste des salles : la station minimale reste utilisable, on ouvre les salles par la liste (un
// bouton de 44 px par clé de SALLES, plus « E-commerce · réservée », désactivée). Un appui pose ?salle=<clé> sans quitter la page.
// Levé, il charge le moteur de la carte par next/dynamic, côté navigateur seulement, et par un seul module : moteur/entree.tsx.
//
// Ses propriétés sont figées ici, une fois pour toutes : les fiches de la carte les lisent sans toucher à Station.tsx.
// Aucun morceau de Phaser n'est chargé tant que ce cadre est le cadre d'attente : Phaser n'est importé que sous moteur/, par import("phaser").
export type CarteProps = {
  equipage: Env<Equipage> | null
  tapis: Env<Tapis> | null
  bulles: Bulle[]
  reglages: ReglagesServis | null
  carte: Env<CarteDonnees> | null
}

const Moteur = dynamic(() => import('./moteur/entree'), { ssr: false })

/** La liste des salles : un bouton de 44 px par clé de SALLES plus la réservée. Elle reste SOUS la carte et se parcourt au clavier (Tab), carte ou pas. */
function ListeSalles() {
  const router = useRouter()
  function ouvrirSalle(cle: string) {
    const q = new URLSearchParams(window.location.search)
    q.set('salle', cle)
    q.delete('agent')
    router.replace(`/controle/station?${q.toString()}`, { scroll: false })
  }
  return (
    <ul className="mc-salles" data-liste-salles aria-label="Les salles">
      {SALLES.map((s) => (
        <li key={s.cle}><button type="button" data-salle={s.cle} onClick={() => ouvrirSalle(s.cle)}>{s.plaque}</button></li>
      ))}
      <li><button type="button" data-salle={SALLE_RESERVEE.cle} disabled>{SALLE_RESERVEE.plaque} · réservée</button></li>
    </ul>
  )
}

function CarteAttente() {
  return (
    <div data-station-carte data-images="0" className="mc-carte">
      <p className="mc-carte-attente">La carte de la station arrive avec sa fiche.</p>
      <ListeSalles />
    </div>
  )
}

export default function Carte(props: CarteProps) {
  if (!actif('stationCarte')) return <CarteAttente />
  return (
    <div data-station-carte data-images="0" className="mc-carte">
      <Moteur {...props} />
      <ListeSalles />
    </div>
  )
}
