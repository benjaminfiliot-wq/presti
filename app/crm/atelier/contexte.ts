'use client'

import { createContext, useContext } from 'react'
import { useExemple } from '../mode'

// La page de DÉMONSTRATION de l'atelier (/atelier-demo, prop `demo` d'Atelier) se comporte comme l'EXEMPLE du CRM (app/crm/mode.tsx) :
// rien n'est lu ni écrit, les actions qui sortiraient des données fictives ouvrent une explication (ou un dialogue d'exemple) au lieu
// d'un lien mort. Atelier pose ce contexte ; les panneaux le lisent.
export const DemoAtelier = createContext(false)

/** Vrai dans l'exemple du CRM ET dans la page de démonstration : aucune écriture, et on le dit. */
export function useSansEcriture(): boolean {
  const demo = useContext(DemoAtelier)
  const exemple = useExemple()
  return demo || exemple
}
