'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Marque from '@/app/Marque'

// Invitation à installer l'application (prompt v9 §2.4). Montée par AppShell — donc dans la console
// UNIQUEMENT : jamais sur la landing, jamais sur une surface artisan (white-label).
//
//  - Android / Chrome : on capte `beforeinstallprompt`, on le garde, et le bouton « Installer »
//    le rejoue au clic. Refus mémorisé 30 jours (localStorage), jamais de pop-up bloquante.
//  - iOS / Safari : pas d'événement d'installation — la carte explique les deux gestes
//    (Partager → Sur l'écran d'accueil) avec l'icône Partager d'iOS dessinée en SVG. Pas dans Chrome,
//    Firefox ou une WebView intégrée (Instagram, Facebook, Gmail…) : le geste n'y existe pas.
//  - Déjà installée (display-mode: standalone, navigator.standalone) ou dans la coque Capacitor : rien.
//  - Pointeur principal à la souris (bureau) : rien — le navigateur a son propre bouton et la carte
//    parle « de votre téléphone ». On se fonde sur le pointeur, pas sur la largeur de la fenêtre.
//  - Écrans de conversation (/messages, /plateforme) : rien — chaque pixel est pour le fil (sur iPad la
//    carte poussait le composeur sous le clavier, mobile-e2e du 06/09).
//  - La carte promet ce qui existe aujourd'hui : l'accès direct. « En direct » attendra les notifications (J2).
type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Mode = 'aucun' | 'android' | 'ios'

const CLE_REFUS = 'presti.installer_refus'
const REFUS_JOURS = 30
const ECRANS_SANS_CARTE = /^\/(messages|plateforme)(\/|$)/

const estInstallee = () => {
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  const nav = navigator as Navigator & { standalone?: boolean }
  return matchMedia('(display-mode: standalone)').matches || nav.standalone === true || !!w.Capacitor?.isNativePlatform?.()
}
const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
/** Safari iOS lui-même : ni un autre navigateur iOS, ni la WebView d'une application. */
const estSafariIos = () => estIos() && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|FBAN|FBAV|Instagram|LinkedInApp|GSA\/|Line\/|Twitter|Snapchat|MicroMessenger/i.test(navigator.userAgent)
const surTactile = () => matchMedia('(pointer: coarse)').matches
const refusRecent = () => {
  try {
    const d = localStorage.getItem(CLE_REFUS)
    return !!d && Date.now() - new Date(d).getTime() < REFUS_JOURS * 86400000
  } catch { return false }
}
/** La carte disparaît : le focus va au titre de la page plutôt que de retomber sur le document. */
const rendreFocus = () => { (document.querySelector('.psh-top h1') as HTMLElement | null)?.focus() }

export default function InstallerApp() {
  const pathname = usePathname()
  const [mode, setMode] = useState<Mode>('aucun')
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null)

  useEffect(() => {
    if (ECRANS_SANS_CARTE.test(pathname ?? '')) { setMode('aucun'); return }
    if (estInstallee() || !surTactile() || refusRecent()) return
    if (estIos()) { if (estSafariIos()) setMode('ios'); return }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvenement(e as EvenementInstallation); setMode('android') }
    const onInstallee = () => setMode('aucun')
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstallee)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstallee) }
  }, [pathname])

  const fermer = () => {
    try { localStorage.setItem(CLE_REFUS, new Date().toISOString()) } catch { /* stockage indisponible : la carte reviendra, ce n'est pas grave */ }
    setMode('aucun'); rendreFocus()
  }
  const installer = async () => {
    if (!evenement) return
    try {
      await evenement.prompt()
      const choix = await evenement.userChoice
      if (choix.outcome === 'accepted') { setMode('aucun'); rendreFocus() } else fermer()
    } catch { fermer() }
  }

  if (mode === 'aucun') return null
  return (
    <aside className="psh-installer" role="complementary" aria-label="Installer Presti sur votre téléphone" data-mode={mode}>
      <div className="psh-installer-ic" aria-hidden="true"><Marque size={26} /></div>
      <div className="psh-installer-tx">
        <b>Installer Presti sur votre téléphone</b>
        {mode === 'android' ? (
          <span>Vos conversations et vos devis à un tap, sans passer par le navigateur.</span>
        ) : (
          <span>
            Touchez{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            {' '}Partager, puis «{' '}Sur l’écran d’accueil{' '}».
          </span>
        )}
      </div>
      {mode === 'android' && <button type="button" className="psh-btn primary" onClick={installer}>Installer</button>}
      <button type="button" className="psh-installer-x" onClick={fermer} aria-label="Ne plus proposer pendant 30 jours" title="Ne plus proposer pendant 30 jours">×</button>
    </aside>
  )
}
