'use client'

import { useEffect, useState } from 'react'
import type { Serwist } from '@serwist/window'

// Enregistrement du service worker et bandeau de mise à jour (prompt v9 §2.3). Monté par AppShell :
// le service worker n'est enregistré QUE depuis la console — jamais depuis une surface artisan.
//
// `window.serwist` est posé par @serwist/next (register: false dans next.config.mjs → c'est nous
// qui appelons register(), ici). En développement le plugin est désactivé : rien ne se passe.
//
// Mise à jour : skipWaiting est désactivé dans app/sw.ts. Quand une nouvelle version attend, on le
// dit et on laisse l'artisan choisir le moment — un rechargement imposé au milieu d'un devis serait
// une faute. Au clic « Recharger », SKIP_WAITING → le nouveau worker prend la main → rechargement.
//
// Le nouveau worker prend la main sur TOUS les onglets ouverts (clientsClaim) : seul l'onglet qui a
// cliqué se recharge ; les autres voient le bandeau et gardent leur saisie (revue du 06/09 : un devis
// en cours dans l'onglet B était perdu quand on cliquait dans l'onglet A). « Plus tard » masque le
// bandeau pour la session de l'onglet ; il revient à la prochaine ouverture.
declare global {
  interface Window { serwist?: Serwist }
}

const CLE_REPORT = 'presti.maj_reportee'
let enregistre = false
let rechargementDemande = false

export default function MiseAJour() {
  const [prete, setPrete] = useState(false)
  const [reportee, setReportee] = useState(false)

  useEffect(() => {
    const sw = window.serwist
    if (!sw || !('serviceWorker' in navigator)) return
    try { if (sessionStorage.getItem(CLE_REPORT)) setReportee(true) } catch { /* stockage indisponible */ }
    const onWaiting = () => setPrete(true)
    const onControlling = (e: { isUpdate?: boolean; isExternal?: boolean }) => {
      if (!(e.isUpdate || e.isExternal)) return // premier contrôle (clientsClaim) : rien à recharger
      if (rechargementDemande) { window.location.reload(); return }
      // Un autre onglet a demandé la mise à jour : on le dit ici, on ne recharge pas à sa place.
      setReportee(false); setPrete(true)
    }
    sw.addEventListener('waiting', onWaiting)
    sw.addEventListener('controlling', onControlling)
    if (!enregistre) {
      enregistre = true
      sw.register().then((reg) => { if (reg?.waiting) setPrete(true) }).catch(() => { enregistre = false })
    }
    return () => { sw.removeEventListener('waiting', onWaiting); sw.removeEventListener('controlling', onControlling) }
  }, [])

  const recharger = () => {
    rechargementDemande = true
    // S'il reste un worker en attente, on lui cède la main (puis `controlling` recharge) ; sinon le nouveau
    // worker a déjà pris la main (clic venu d'un autre onglet) : on recharge directement.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) window.serwist?.messageSkipWaiting(); else window.location.reload()
    }).catch(() => window.location.reload())
  }
  const plusTard = () => {
    try { sessionStorage.setItem(CLE_REPORT, '1') } catch { /* stockage indisponible */ }
    setReportee(true)
  }

  if (!prete || reportee) return null
  return (
    <div className="psh-maj" role="status" data-presti-maj="1">
      <span>Une nouvelle version de Presti est prête.</span>
      <button type="button" className="psh-btn ghost" onClick={plusTard}>Plus tard</button>
      <button type="button" className="psh-btn primary" onClick={recharger}>Recharger</button>
    </div>
  )
}
