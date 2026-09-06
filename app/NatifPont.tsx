'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { estNatif, plateforme, plugin } from '@/lib/natif'
import { api } from '@/app/parametres/commun'

// Le pont côté application (prompt v9 §4.2-4.3). Monté par AppShell, il ne fait RIEN dans un navigateur :
// tout est derrière `estNatif()`. Dans la coque Capacitor :
//  • (l'écran de lancement, lui, se retire au premier rendu de N'IMPORTE quelle page : app/NatifSplash.tsx,
//    monté par le layout racine — /login n'a pas d'AppShell) ;
//  • notifications natives : les écouteurs (jeton → /api/push/abonner ; tap → la conversation) — la
//    PERMISSION, elle, se demande dans Paramètres → Notifications, au clic, jamais au lancement ; si elle
//    est déjà accordée, le jeton se rafraîchit à chaque ouverture ;
//  • bouton retour Android : ferme le tiroir (AppShell écoute `presti:retour`), sinon page précédente,
//    sinon l'app passe en arrière-plan ;
//  • retour au premier plan : la page se rafraîchit (nouveaux messages) ;
//  • réseau : un bandeau honnête « hors ligne », rien de plus.
type Ecouteur = { remove: () => Promise<void> }
const CLE_JETON = 'presti.jeton_natif'
const cheminSur = (v: unknown) => (typeof v === 'string' && /^\/(?![/\\])[^\s\\]*$/.test(v) ? v : '/dashboard')

export default function NatifPont() {
  const router = useRouter()
  const [horsLigne, setHorsLigne] = useState(false)

  useEffect(() => {
    if (!estNatif()) return
    const ecouteurs: Ecouteur[] = []
    const ecouter = async (p: ReturnType<typeof plugin>, nom: string, cb: (e: never) => void) => {
      try { const h = (await p?.addListener?.(nom, cb as (...a: unknown[]) => void)) as Ecouteur | undefined; if (h) ecouteurs.push(h) } catch { /* plugin absent */ }
    }

    // L'écran de lancement et la barre d'état sont réglés par app/NatifSplash.tsx (layout racine) : ici, la console seulement.
    const push = plugin('PushNotifications')
    if (push) {
      void ecouter(push, 'registration', async (t: { value: string }) => {
        try { sessionStorage.setItem(CLE_JETON, t.value) } catch { /* stockage indisponible */ }
        await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ type: plateforme(), jeton: t.value }) })
      })
      void ecouter(push, 'registrationError', (e: unknown) => console.error('[natif] enregistrement push :', e))
      void ecouter(push, 'pushNotificationActionPerformed', (a: { notification?: { data?: { url?: unknown } } }) => {
        router.push(cheminSur(a?.notification?.data?.url))
      })
      // Android 8+ : le canal « presti » (lib/pushNatif l'adresse) doit exister, sinon la notification tombe dans le canal
      // par défaut ; idempotent, sans effet sur iOS.
      if (plateforme() === 'android') push.createChannel?.({ id: 'presti', name: 'Presti', description: 'Demandes, propositions et réponses de vos clients', importance: 5, visibility: 1, vibration: true, lights: true }).catch(() => {})
      // Permission déjà accordée (depuis Paramètres → Notifications) : le jeton se rafraîchit à chaque ouverture.
      push.checkPermissions?.().then((p) => { if ((p as { receive?: string })?.receive === 'granted') return push.register?.() }).catch(() => {})
    }

    const app = plugin('App')
    if (app) {
      void ecouter(app, 'backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        const ev = new CustomEvent('presti:retour', { cancelable: true })
        window.dispatchEvent(ev)
        if (ev.defaultPrevented) return // le tiroir (ou un panneau) s'est fermé : c'était ça, le retour
        if (canGoBack) window.history.back(); else app.minimizeApp?.().catch(() => {})
      })
      void ecouter(app, 'appStateChange', ({ isActive }: { isActive: boolean }) => { if (isActive) router.refresh() })
      // Lien profond (App Links / Universal Links, §4.4) : seulement une adresse de NOTRE origine, et son chemin seul.
      void ecouter(app, 'appUrlOpen', ({ url }: { url: string }) => {
        try { const u = new URL(url); if (u.origin === window.location.origin) router.push(cheminSur(u.pathname + u.search)) } catch { /* adresse illisible : ignorée */ }
      })
    }

    const net = plugin('Network')
    if (net) {
      net.getStatus?.().then((s) => setHorsLigne(!(s as { connected?: boolean })?.connected)).catch(() => {})
      void ecouter(net, 'networkStatusChange', (s: { connected: boolean }) => setHorsLigne(!s.connected))
    }

    return () => { for (const h of ecouteurs) h.remove().catch(() => {}) }
  }, [router])

  if (!horsLigne) return null
  return <div className="psh-horsligne" role="status" data-hors-ligne="1">Hors ligne — ce que vous lisez est à jour du dernier passage, vos envois attendront le réseau.</div>
}
