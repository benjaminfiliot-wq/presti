'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { estNatif, plugin } from '@/lib/natif'
import Marque from '@/app/Marque'

// Verrou biométrique de l'application (prompt v9 §4.3, décision §10 : après 5 min d'arrière-plan).
//
// Un artisan ouvre l'app vingt fois par jour, sur chantier : pas de mot de passe à retaper. Face ID ou
// l'empreinte ROUVRENT une session déjà vérifiée — jamais à la place du second facteur. Refus ou échec :
// la session est fermée et c'est mot de passe + code par email (v7).
//
// Le moment du passage en arrière-plan est gardé par le plugin Preferences (il survit à la fermeture de
// l'app) ; au retour, ou à l'ouverture, s'il date de plus de 5 min et qu'une biométrie existe, l'écran se
// couvre jusqu'au déverrouillage. Pas de biométrie sur l'appareil : pas de verrou — on ne fait pas semblant.
// Inerte dans un navigateur.
const DELAI_MS = 5 * 60 * 1000
const CLE = 'presti.arriere_plan_le'

export default function VerrouNatif() {
  const router = useRouter()
  const [verrou, setVerrou] = useState(false)
  const [busy, setBusy] = useState(false)

  const deverrouiller = useCallback(async () => {
    const bio = plugin('BiometricAuth')
    if (!bio?.authenticate) { setVerrou(false); return }
    setBusy(true)
    try {
      await bio.authenticate({
        reason: 'Déverrouiller Presti', cancelTitle: 'Annuler', allowDeviceCredential: true,
        iosFallbackTitle: 'Code du téléphone', androidTitle: 'Presti', androidSubtitle: 'Déverrouillez pour reprendre', androidConfirmationRequired: false,
      })
      setVerrou(false)
      await plugin('Preferences')?.remove?.({ key: CLE }).catch(() => {})
    } catch {
      // Refus ou échec : on ne laisse pas une session ouverte derrière un écran — mot de passe + code.
      await supabase.auth.signOut().catch(() => {})
      router.replace('/login?verrou=1')
    } finally { setBusy(false) }
  }, [router])

  useEffect(() => {
    if (!estNatif()) return
    const app = plugin('App'), prefs = plugin('Preferences'), bio = plugin('BiometricAuth')
    if (!app || !prefs) return
    const verifier = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const r = (await prefs.get({ key: CLE }).catch(() => null)) as { value?: string | null } | null
      const depuis = Number(r?.value || 0)
      if (!depuis || Date.now() - depuis <= DELAI_MS) return
      const b = (await bio?.checkBiometry?.().catch(() => null)) as { isAvailable?: boolean } | null
      if (!b?.isAvailable) { await prefs.remove({ key: CLE }).catch(() => {}); return }
      setVerrou(true)
    }
    const ecouteurs: { remove: () => Promise<void> }[] = []
    app.addListener('appStateChange', async ({ isActive }: { isActive: boolean }) => {
      if (!isActive) await prefs.set({ key: CLE, value: String(Date.now()) }).catch(() => {})
      else await verifier()
    }).then((h) => ecouteurs.push(h as { remove: () => Promise<void> })).catch(() => {})
    void verifier() // ouverture après une fermeture complète de l'app
    return () => { for (const h of ecouteurs) h.remove().catch(() => {}) }
  }, [])

  useEffect(() => { if (verrou) void deverrouiller() }, [verrou, deverrouiller])

  if (!verrou) return null
  return (
    <div className="psh-verrou" role="dialog" aria-modal="true" aria-label="Presti est verrouillée" data-verrou>
      <div className="psh-verrou-in">
        <Marque size={40} />
        <h1>Presti est verrouillée</h1>
        <p>Déverrouillez avec votre empreinte ou votre visage pour reprendre là où vous étiez.</p>
        <button type="button" className="btn btn--primary" disabled={busy} onClick={deverrouiller}>{busy ? '…' : 'Déverrouiller'}</button>
      </div>
    </div>
  )
}
