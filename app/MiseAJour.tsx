'use client'

import { useEffect, useState } from 'react'
import type { Serwist } from '@serwist/window'

// Enregistrement du service worker et bandeau de mise à jour (prompt v9 §2.3). Monté par AppShell :
// le service worker n'est enregistré QUE depuis la console — jamais depuis une surface artisan.
//
// `window.serwist` est posé par @serwist/next (register: false dans next.config.mjs → c'est nous
// qui appelons register(), ici). En développement le plugin est désactivé : rien ne se passe.
//
// Mise à jour : skipWaiting est désactivé dans app/sw.ts. Quand une nouvelle version attend,
// on le dit et on laisse l'artisan choisir le moment — un rechargement imposé au milieu d'un
// devis serait une faute. Au clic, SKIP_WAITING → le nouveau worker prend la main → rechargement.
declare global {
  interface Window { serwist?: Serwist }
}

let enregistre = false

export default function MiseAJour() {
  const [prete, setPrete] = useState(false)

  useEffect(() => {
    const sw = window.serwist
    if (!sw || !('serviceWorker' in navigator)) return
    const onWaiting = () => setPrete(true)
    const onControlling = (e: { isUpdate?: boolean; isExternal?: boolean }) => { if (e.isUpdate || e.isExternal) window.location.reload() }
    sw.addEventListener('waiting', onWaiting)
    sw.addEventListener('controlling', onControlling)
    if (!enregistre) {
      enregistre = true
      sw.register().then((reg) => { if (reg?.waiting) setPrete(true) }).catch(() => { enregistre = false })
    }
    return () => { sw.removeEventListener('waiting', onWaiting); sw.removeEventListener('controlling', onControlling) }
  }, [])

  if (!prete) return null
  return (
    <div className="psh-maj" role="status" data-presti-maj="1">
      <span>Une nouvelle version de Presti est prête.</span>
      <button type="button" className="psh-btn primary" onClick={() => window.serwist?.messageSkipWaiting()}>Recharger</button>
    </div>
  )
}
