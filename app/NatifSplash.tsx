'use client'

import { useEffect } from 'react'
import { estNatif, plugin } from '@/lib/natif'

// L'écran de lancement de la coque (SplashScreen, launchAutoHide: false) se retire quand la PREMIÈRE page est
// rendue — quelle qu'elle soit : /login autant que /dashboard. Monté par le layout racine, donc partout ;
// inerte dans un navigateur (`estNatif()` faux). Pas de minuterie : c'est le rendu qui décide.
// (Revue v9 J3 : monté seulement dans la console, l'écran restait affiché à jamais sur la page de connexion.)
export default function NatifSplash() {
  useEffect(() => {
    if (!estNatif()) return
    plugin('SplashScreen')?.hide?.({ fadeOutDuration: 200 }).catch(() => {})
    plugin('StatusBar')?.setStyle?.({ style: 'DARK' }).catch(() => {})
  }, [])
  return null
}
