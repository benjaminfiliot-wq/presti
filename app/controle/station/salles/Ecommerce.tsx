'use client'

import Fenetre, { type SalleProps } from './Fenetre'

// Le panneau de la salle réservée E-commerce (fiche 026-189) : la branche n'existe pas, le panneau le dit et rien d'autre. Ni chiffre,
// ni bouton, ni lecture : il n'y a rien à servir. Le résumé de salle commun est monté en tête, tout y dit « — ».
export default function Ecommerce({ equipage, poser, onFermer }: SalleProps) {
  return (
    <Fenetre cle="ecommerce" titre="E-commerce" onFermer={onFermer} resume={{ equipage, poser }}>
      <p className="mc-etat" data-branche-reservee>Branche réservée : rien n’est construit.</p>
    </Fenetre>
  )
}
