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
// en cours dans l'onglet B était perdu quand on cliquait dans l'onglet A). Un événement `controlling`
// sans worker connu (première mise en service, second onglet ouvert pendant l'installation) n'est
// pas une mise à jour : rien à afficher.
//
// « Plus tard » masque le bandeau pour cet onglet, avec l'identité du worker reporté et l'heure :
// il revient après 4 h, dès qu'une autre version attend (événement `waiting`), ou quand l'artisan
// recharge lui-même la page — jamais définitivement.
declare global {
  interface Window { serwist?: Serwist }
}

const CLE_REPORT = 'presti.maj_reportee'
const REPORT_MS = 4 * 3600 * 1000
let enregistre = false
let rechargementDemande = false

type Report = { url: string; t: number }
const lireReport = (): Report | null => { try { const v = JSON.parse(sessionStorage.getItem(CLE_REPORT) || 'null'); return v && typeof v.url === 'string' && typeof v.t === 'number' ? v : null } catch { return null } }
const effacerReport = () => { try { sessionStorage.removeItem(CLE_REPORT) } catch { /* stockage indisponible */ } }
const rechargeVolontaire = () => { try { return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload' } catch { return false } }
/** Le report vaut-il encore pour ce worker en attente ? (même script, moins de 4 h, pas de rechargement volontaire) */
const encoreReporte = (attente: ServiceWorker | null) => {
  const r = lireReport()
  if (!r || !attente) return false
  if (r.url !== attente.scriptURL || Date.now() - r.t > REPORT_MS || rechargeVolontaire()) { effacerReport(); return false }
  return true
}

export default function MiseAJour() {
  const [prete, setPrete] = useState(false)
  const [reportee, setReportee] = useState(false)

  useEffect(() => {
    const sw = window.serwist
    if (!sw || !('serviceWorker' in navigator)) return
    // Une autre version attend : on le dit, même si une précédente avait été reportée.
    const onWaiting = () => { effacerReport(); setReportee(false); setPrete(true) }
    const onControlling = (e: { sw?: ServiceWorker; isUpdate?: boolean; isExternal?: boolean }) => {
      if (!e.sw || !(e.isUpdate || e.isExternal)) return // premier contrôle (clientsClaim), ou worker inconnu : rien à recharger
      if (rechargementDemande) { window.location.reload(); return }
      // Un autre onglet a demandé la mise à jour : on le dit ici, on ne recharge pas à sa place.
      effacerReport(); setReportee(false); setPrete(true)
    }
    sw.addEventListener('waiting', onWaiting)
    sw.addEventListener('controlling', onControlling)
    if (!enregistre) {
      enregistre = true
      sw.register().then((reg) => {
        if (!reg?.waiting) return
        if (encoreReporte(reg.waiting)) setReportee(true)
        setPrete(true)
      }).catch(() => { enregistre = false })
    }
    return () => { sw.removeEventListener('waiting', onWaiting); sw.removeEventListener('controlling', onControlling) }
  }, [])

  const recharger = () => {
    rechargementDemande = true
    effacerReport()
    // S'il reste un worker en attente, on lui cède la main (puis `controlling` recharge) ; sinon le nouveau
    // worker a déjà pris la main (clic venu d'un autre onglet) : on recharge directement.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) window.serwist?.messageSkipWaiting(); else window.location.reload()
    }).catch(() => window.location.reload())
  }
  const plusTard = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      try { sessionStorage.setItem(CLE_REPORT, JSON.stringify({ url: reg?.waiting?.scriptURL || '', t: Date.now() })) } catch { /* stockage indisponible */ }
    }).catch(() => {})
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
