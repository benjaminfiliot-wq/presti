'use client'

import { useEffect, useState } from 'react'
import Marque from '@/app/Marque'

// Invitation à installer l'application (prompt v9 §2.4). Montée par AppShell — donc dans la console
// UNIQUEMENT : jamais sur la landing, jamais sur une surface artisan (white-label).
//
//  - Android / Chrome : on capte `beforeinstallprompt`, on le garde, et le bouton « Installer »
//    le rejoue au clic. Refus mémorisé 30 jours (localStorage), jamais de pop-up bloquante.
//  - iOS / Safari : pas d'événement d'installation — la carte explique les deux gestes
//    (Partager → Sur l'écran d'accueil) avec l'icône Partager d'iOS dessinée en SVG.
//  - Déjà installée (display-mode: standalone, navigator.standalone) ou dans la coque Capacitor : rien.
//  - Sur un écran de bureau à la souris : rien non plus — le navigateur a son propre bouton et
//    la carte parle « de votre téléphone ».
type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Mode = 'aucun' | 'android' | 'ios'

const CLE_REFUS = 'presti.installer_refus'
const REFUS_JOURS = 30

const estInstallee = () => {
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  const nav = navigator as Navigator & { standalone?: boolean }
  return matchMedia('(display-mode: standalone)').matches || nav.standalone === true || !!w.Capacitor?.isNativePlatform?.()
}
const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const surTactile = () => matchMedia('(pointer: coarse)').matches || window.innerWidth <= 1024
const refusRecent = () => {
  try {
    const d = localStorage.getItem(CLE_REFUS)
    return !!d && Date.now() - new Date(d).getTime() < REFUS_JOURS * 86400000
  } catch { return false }
}

export default function InstallerApp() {
  const [mode, setMode] = useState<Mode>('aucun')
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null)

  useEffect(() => {
    if (estInstallee() || !surTactile() || refusRecent()) return
    if (estIos()) { setMode('ios'); return }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvenement(e as EvenementInstallation); setMode('android') }
    const onInstallee = () => setMode('aucun')
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstallee)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstallee) }
  }, [])

  const fermer = () => {
    try { localStorage.setItem(CLE_REFUS, new Date().toISOString()) } catch { /* stockage indisponible : la carte reviendra, ce n'est pas grave */ }
    setMode('aucun')
  }
  const installer = async () => {
    if (!evenement) return
    try {
      await evenement.prompt()
      const choix = await evenement.userChoice
      if (choix.outcome === 'accepted') setMode('aucun'); else fermer()
    } catch { fermer() }
  }

  if (mode === 'aucun') return null
  return (
    <aside className="psh-installer" role="complementary" aria-label="Installer Presti sur votre téléphone" data-mode={mode}>
      <div className="psh-installer-ic" aria-hidden="true"><Marque size={26} /></div>
      <div className="psh-installer-tx">
        <b>Installer Presti sur votre téléphone</b>
        {mode === 'android' ? (
          <span>Recevez les demandes en direct, sans ouvrir le navigateur.</span>
        ) : (
          <span>
            Touchez{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-label="Partager" role="img"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            {' '}Partager, puis « Sur l’écran d’accueil ».
          </span>
        )}
      </div>
      {mode === 'android' && <button type="button" className="psh-btn primary" onClick={installer}>Installer</button>}
      <button type="button" className="psh-installer-x" onClick={fermer} aria-label="Ne plus proposer pendant 30 jours" title="Ne plus proposer pendant 30 jours">×</button>
    </aside>
  )
}
