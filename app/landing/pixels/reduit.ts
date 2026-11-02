'use client'

// Le réglage « réduire les animations », suivi en direct : le basculer page ouverte coupe (ou rend) les effets sans recharger.
// À part de moteur.ts, que les composants serveur importent (PALETTE) : un hook React n'y a pas sa place.
import { useSyncExternalStore } from 'react'
import { REQUETE_REDUIT, mouvementReduit } from './moteur'

function abonner(rappel: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const m = window.matchMedia(REQUETE_REDUIT)
  m.addEventListener('change', rappel)
  return () => m.removeEventListener('change', rappel)
}

export function useMouvementReduit(): boolean {
  return useSyncExternalStore(abonner, mouvementReduit, () => false)
}
