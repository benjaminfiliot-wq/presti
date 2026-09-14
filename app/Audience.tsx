'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { actif } from '@/lib/flags'
import { estNatif } from '@/lib/natif'
import { CLE_NE_PAS_COMPTER, cheminMesurable, estHotePresti, hoteMesure } from '@/lib/audience'

// La mesure d'audience de la vitrine (migrations 0090, 0091) : une vue = un envoi, sans cookie, sans identifiant.
//
// Monté par le layout racine, donc partout — et c'est pourquoi chaque condition ci-dessous est un « return » :
// hôte de Presti seulement (jamais le domaine d'un artisan), page de la liste fermée seulement, jamais dans
// l'application mobile (la politique y promet « aucune mesure d'audience »), jamais sous un navigateur piloté
// (nos suites Playwright), et jamais contre un refus : Global Privacy Control, Do Not Track, le bouton
// « Ne plus me compter » de /confidentialite, ou le lien d'exclusion du Poste (`?exclure=1`).
//
// L'envoi attend que le navigateur soit oisif : la page d'accueil tient Lighthouse ≥ 90 et son plus grand
// rendu est du texte — rien ici ne doit passer devant.

/**
 * Vrai après le premier passage de l'effet dans ce document, QUELLE QUE SOIT la page : une navigation côté client
 * n'est jamais une entrée. Posé avant les gardes — posé après, l'artisan qui se déconnecte depuis /dashboard
 * (router.replace('/login'), même document) comptait une « arrivée » sur /login (contre-revue du 14/09).
 */
let dejaEntre = false

export default function Audience() {
  const chemin = usePathname() ?? ''
  useEffect(() => {
    if (!actif('audience')) return
    const premiere = !dejaEntre
    dejaEntre = true
    if (!hoteMesure(window.location.hostname) || !cheminMesurable(chemin) || estNatif()) return
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.webdriver || nav.globalPrivacyControl === true || nav.doNotTrack === '1') return
    if (new URLSearchParams(window.location.search).get('exclure') === '1') return
    try { if (localStorage.getItem(CLE_NE_PAS_COMPTER) === 'non') return } catch { /* stockage fermé : aucun refus lisible */ }

    // Les pages publiques naviguent par de vrais liens : chaque clic recharge le document et remet `dejaEntre` à
    // zéro. Une ENTRÉE est donc une page dont le référent n'est pas Presti, et qui n'est ni un rechargement ni un
    // retour arrière (revue du 14/09 : chaque page ouverte comptait une « arrivée en accès direct »).
    const refInterne = (() => { try { return !!document.referrer && estHotePresti(new URL(document.referrer).hostname) } catch { return false } })()
    const typeNav = (performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined)?.type
    const entree = premiere && !refInterne && typeNav !== 'reload' && typeNav !== 'back_forward'
    const p = new URLSearchParams(window.location.search)
    const t = navigator.maxTouchPoints > 1 ? 1 : 0
    const corps = JSON.stringify(entree
      ? { c: chemin, e: true, t, r: document.referrer.slice(0, 300), s: p.get('utm_source'), k: p.get('utm_campaign') }
      : { c: chemin, e: false, t })
    const envoyer = () => {
      try { if (navigator.sendBeacon?.('/api/audience', new Blob([corps], { type: 'application/json' }))) return } catch { /* repli ci-dessous */ }
      void fetch('/api/audience', { method: 'POST', body: corps, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
    }
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(envoyer, { timeout: 4000 })
    else window.setTimeout(envoyer, 1500)
  }, [chemin])
  return null
}
