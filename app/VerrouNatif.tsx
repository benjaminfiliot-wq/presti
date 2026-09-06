'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { estNatif, plugin } from '@/lib/natif'
import { desabonnerCetAppareil } from '@/lib/pushClient'
import Marque from '@/app/Marque'

// Verrou biométrique de l'application (prompt v9 §4.3, décision §10 : après 5 min d'arrière-plan).
//
// Un artisan ouvre l'app vingt fois par jour, sur chantier : pas de mot de passe à retaper. Face ID ou
// l'empreinte ROUVRENT une session déjà vérifiée — jamais à la place du second facteur. Refus ou échec :
// l'appareil est désabonné des notifications, la session est fermée, et c'est mot de passe + code (v7).
//
// Monté par le LAYOUT RACINE (toutes les pages authentifiées, /controle et /onboarding compris — revue du
// 07/09), jamais actif sur une surface d'artisan ni dans un navigateur. Le moment du passage en arrière-plan
// est gardé par Preferences (survit à la fermeture de l'app) ; au retour, ou à l'ouverture, s'il date de plus
// de 5 min et qu'une biométrie existe, l'écran est couvert (`inert` sur le reste) jusqu'au déverrouillage.
// Pas de biométrie sur l'appareil : pas de verrou — on ne fait pas semblant.
//
// Plugin : @aparajita/capacitor-biometric-auth s'enregistre côté natif sous « BiometricAuthNative » ; sa méthode
// `authenticate` est du JavaScript (elle appelle `internalAuthenticate`). Sans son bundle web, c'est donc
// `internalAuthenticate` qu'on appelle (revue du 07/09 : « BiometricAuth.authenticate » ne joignait rien).
const DELAI_MS = 5 * 60 * 1000
const CLE = 'presti.arriere_plan_le'
const SURFACES_ARTISAN = /^\/(p|site|l)\//
const ANNULATIONS = /userCancel|systemCancel|appCancel|userFallback/i

export default function VerrouNatif() {
  const router = useRouter()
  const pathname = usePathname()
  const [verrou, setVerrou] = useState(false)
  const [busy, setBusy] = useState(false)
  const bouton = useRef<HTMLButtonElement>(null)

  const fermerSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    await Promise.race([desabonnerCetAppareil(data.session?.access_token), new Promise((r) => setTimeout(r, 2000))])
    await supabase.auth.signOut().catch(() => {})
    router.replace('/login?verrou=1')
  }, [router])

  const deverrouiller = useCallback(async () => {
    const bio = plugin('BiometricAuthNative')
    if (!bio) { setVerrou(false); return }
    setBusy(true)
    try {
      await bio.internalAuthenticate({
        reason: 'Déverrouiller Presti', cancelTitle: 'Annuler', allowDeviceCredential: true,
        iosFallbackTitle: 'Code du téléphone', androidTitle: 'Presti', androidSubtitle: 'Déverrouillez pour reprendre', androidConfirmationRequired: false,
      })
      setVerrou(false)
      await plugin('Preferences')?.remove?.({ key: CLE }).catch(() => {})
    } catch (e) {
      const code = String((e as { code?: string; message?: string })?.code ?? (e as Error)?.message ?? '')
      // Annulé (retour, appui hors de l'invite) : l'écran reste verrouillé, le bouton permet de réessayer.
      if (ANNULATIONS.test(code)) return
      // Refus ou échec : on ne laisse pas une session ouverte derrière un écran.
      await fermerSession()
    } finally { setBusy(false) }
  }, [fermerSession])

  useEffect(() => {
    if (!estNatif() || SURFACES_ARTISAN.test(pathname ?? '')) return
    const app = plugin('App'), prefs = plugin('Preferences'), bio = plugin('BiometricAuthNative')
    if (!app || !prefs) return
    const verifier = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) return
        const r = (await prefs.get({ key: CLE }).catch(() => null)) as { value?: string | null } | null
        const depuis = Number(r?.value || 0)
        if (!depuis || Date.now() - depuis <= DELAI_MS) return
        const b = (await bio?.checkBiometry?.().catch(() => null)) as { isAvailable?: boolean } | null
        if (!b?.isAvailable) { await prefs.remove({ key: CLE }).catch(() => {}); return }
        setVerrou(true)
      } catch { /* jamais bloquant */ }
    }
    const ecouteurs: { remove: () => Promise<void> }[] = []
    ;(async () => {
      try {
        // `addListener` rend une promesse chez la plupart des plugins, pas chez tous : on ne suppose rien.
        const h = (await Promise.resolve(app.addListener('appStateChange', async ({ isActive }: { isActive: boolean }) => {
          if (!isActive) await prefs.set({ key: CLE, value: String(Date.now()) }).catch(() => {})
          else await verifier()
        }))) as { remove?: () => Promise<void> } | undefined
        if (h?.remove) ecouteurs.push(h as { remove: () => Promise<void> })
      } catch { /* plugin App absent */ }
    })()
    void verifier() // ouverture après une fermeture complète de l'app
    return () => { for (const h of ecouteurs) h.remove().catch(() => {}) }
  }, [pathname])

  // L'écran verrouillé : le reste de la page devient inerte, le bouton prend le focus, la biométrie se lance.
  useEffect(() => {
    if (!verrou) return
    const inertes = [...document.querySelectorAll<HTMLElement>('.psh-main, .psh-side, main')].filter((el) => !el.closest('.psh-verrou'))
    for (const el of inertes) el.setAttribute('inert', '')
    bouton.current?.focus()
    void deverrouiller()
    return () => { for (const el of inertes) el.removeAttribute('inert') }
  }, [verrou, deverrouiller])

  if (!verrou) return null
  return (
    <div className="psh-verrou" role="dialog" aria-modal="true" aria-label="Presti est verrouillée" data-verrou>
      <div className="psh-verrou-in">
        <Marque size={40} />
        <h1>Presti est verrouillée</h1>
        <p>Déverrouillez avec votre empreinte ou votre visage pour reprendre là où vous étiez.</p>
        <button ref={bouton} type="button" className="btn btn--primary" disabled={busy} onClick={deverrouiller}>{busy ? '…' : 'Déverrouiller'}</button>
      </div>
    </div>
  )
}
