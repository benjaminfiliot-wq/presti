'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Marque from '@/app/Marque'
import { estInstallee, installer, peutInstaller, surChangement } from '@/lib/installation'

// Invitation à installer l'application (prompt v9 §2.4). Montée par AppShell — donc dans la console
// UNIQUEMENT : jamais sur la landing, jamais sur une surface artisan (white-label).
//
//  - Chrome / Edge, téléphone OU ordinateur : l'invitation du navigateur (`beforeinstallprompt`, captée par
//    lib/installation) → une carte, et le bouton « Installer » la rejoue au clic. Refus mémorisé 30 jours,
//    jamais de pop-up bloquante. Sur ordinateur, la carte dit « sur cet ordinateur » (demande de Benj du 07/09 :
//    Presti doit être disponible sur PC).
//  - iOS / Safari : pas d'événement d'installation — la carte explique les deux gestes
//    (Partager → Sur l'écran d'accueil). Pas dans Chrome, Firefox ou une WebView intégrée : le geste n'y existe pas.
//  - Déjà installée (display-mode: standalone, navigator.standalone) ou dans la coque Capacitor : rien.
//  - Écrans de conversation (/messages, /plateforme) : rien — chaque pixel est pour le fil.
//  - La carte promet ce qui existe : l'accès direct et les notifications (J2).
type Mode = 'aucun' | 'invite' | 'ios'

const CLE_REFUS = 'presti.installer_refus'
const REFUS_JOURS = 30
const ECRANS_SANS_CARTE = /^\/(messages|plateforme)(\/|$)/

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
  const [bureau, setBureau] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ECRANS_SANS_CARTE.test(pathname ?? '')) { setMode('aucun'); return }
    if (estInstallee() || refusRecent()) return
    setBureau(!surTactile())
    if (estIos() && surTactile()) { if (estSafariIos()) setMode('ios'); return }
    const maj = () => setMode(peutInstaller() ? 'invite' : 'aucun')
    maj()
    return surChangement(maj)
  }, [pathname])

  const fermer = () => {
    try { localStorage.setItem(CLE_REFUS, new Date().toISOString()) } catch { /* stockage indisponible : la carte reviendra, ce n'est pas grave */ }
    setMode('aucun'); rendreFocus()
  }
  const lancer = async () => {
    setBusy(true)
    const r = await installer()
    setBusy(false)
    if (r === 'accepte') { setMode('aucun'); rendreFocus() } else if (r === 'refuse') fermer()
  }

  if (mode === 'aucun') return null
  return (
    <aside className="psh-installer" role="complementary" aria-label={`Installer Presti sur ${bureau ? 'cet ordinateur' : 'votre téléphone'}`} data-mode={mode === 'invite' ? (bureau ? 'bureau' : 'android') : 'ios'}>
      <div className="psh-installer-ic" aria-hidden="true"><Marque size={26} /></div>
      <div className="psh-installer-tx">
        <b>{bureau ? 'Installer Presti sur cet ordinateur' : 'Installer Presti sur votre téléphone'}</b>
        {mode === 'invite' ? (
          <span>{bureau ? 'Dans sa propre fenêtre, sans onglets, avec ses notifications.' : 'Vos conversations et vos devis à un tap, sans passer par le navigateur.'}</span>
        ) : (
          <span>
            Touchez{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            {' '}Partager, puis {'« Sur l’écran d’accueil ».'}
          </span>
        )}
      </div>
      {mode === 'invite' && <button type="button" className="psh-btn primary" disabled={busy} onClick={lancer}>{busy ? '…' : 'Installer'}</button>}
      <button type="button" className="psh-installer-x" onClick={fermer} aria-label="Ne plus proposer pendant 30 jours" title="Ne plus proposer pendant 30 jours">×</button>
    </aside>
  )
}
