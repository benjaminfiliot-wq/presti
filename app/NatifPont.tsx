'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { estNatif, plateforme, plugin, ouvrirExterne } from '@/lib/natif'
import { actif } from '@/lib/flags'
import { api } from '@/app/parametres/commun'

// Le pont côté application (prompt v9 §4.2-4.3). Monté par AppShell, il ne fait RIEN dans un navigateur :
// tout est derrière `estNatif()`. Dans la coque Capacitor :
//  • (l'écran de lancement, lui, se retire au premier rendu de N'IMPORTE quelle page : app/NatifSplash.tsx,
//    monté par le layout racine — /login n'a pas d'AppShell) ;
//  • notifications natives : les écouteurs (jeton → /api/push/abonner ; tap → la conversation) ; le canal
//    Android « presti » ; le jeton ne se rafraîchit au lancement que si l'artisan a ACTIVÉ les notifications
//    dans Paramètres (préférence `presti.push_active`) — pas sur la seule permission système, que les vieux
//    Android accordent d'office (revue du 07/09) ; et seulement quand la coque embarque Firebase (drapeau
//    `pushNatif`) : sans lui, `register()` plante l'app Android ;
//  • bouton retour Android : ferme le tiroir (AppShell écoute `presti:retour`), sinon page précédente,
//    sinon l'app passe en arrière-plan ;
//  • retour au premier plan : la page se rafraîchit (nouveaux messages) ;
//  • lien profond (App Links) : seulement une adresse de NOTRE origine ET un chemin de la console — une autre
//    app du téléphone ne pilote pas la WebView vers /p, /site ou /login (revue du 07/09) ;
//  • liens vers l'extérieur (Stripe, fournisseurs, le site public de l'artisan — /p, /site, /l) : le navigateur
//    du téléphone, jamais la WebView de la console (white-label, et pas d'artisan piégé sans barre d'adresse) ;
//  • réseau : un bandeau honnête « hors ligne », rien de plus.
type Ecouteur = { remove: () => Promise<void> }
const CLE_JETON = 'presti.jeton_natif'
const CLE_PUSH_ACTIVE = 'presti.push_active'
/** Les chemins que l'app accepte par lien profond — la même liste que le manifeste Android. */
const CHEMINS_CONSOLE = /^\/(dashboard|messages|devis|factures|inventaire|parametres)(\/|\?|$)/ // pas /abonnement : l'achat n'existe pas dans la coque (stores)
const cheminSur = (v: unknown) => (typeof v === 'string' && /^\/(?![/\\])[^\s\\]*$/.test(v) && CHEMINS_CONSOLE.test(v) ? v : '/dashboard')

export default function NatifPont() {
  const router = useRouter()
  const [horsLigne, setHorsLigne] = useState(false)

  useEffect(() => {
    if (!estNatif()) return
    const ecouteurs: Ecouteur[] = []
    const ecouter = async (p: ReturnType<typeof plugin>, nom: string, cb: (e: never) => void) => {
      try { const h = (await Promise.resolve(p?.addListener?.(nom, cb as (...a: unknown[]) => void))) as Ecouteur | undefined; if (h?.remove) ecouteurs.push(h) } catch { /* plugin absent */ }
    }

    const push = plugin('PushNotifications')
    if (push && actif('pushNatif')) {
      void ecouter(push, 'registration', async (t: { value: string }) => {
        try { sessionStorage.setItem(CLE_JETON, t.value) } catch { /* stockage indisponible */ }
        await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ type: plateforme(), jeton: t.value }) })
      })
      void ecouter(push, 'registrationError', (e: unknown) => console.error('[natif] enregistrement push :', e))
      void ecouter(push, 'pushNotificationActionPerformed', (a: { notification?: { data?: { url?: unknown } } }) => {
        router.push(cheminSur(a?.notification?.data?.url))
      })
      if (plateforme() === 'android') push.createChannel?.({ id: 'presti', name: 'Presti', description: 'Demandes, propositions et réponses de vos clients', importance: 5, visibility: 1, vibration: true, lights: true }).catch(() => {})
      // Le jeton se rafraîchit au lancement seulement si l'artisan a activé les notifications ici (Paramètres → Notifications).
      plugin('Preferences')?.get?.({ key: CLE_PUSH_ACTIVE }).then(async (r) => {
        if ((r as { value?: string | null })?.value !== '1') return
        const p = (await push.checkPermissions?.()) as { receive?: string } | undefined
        if (p?.receive === 'granted') await push.register?.()
      }).catch(() => {})
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
      void ecouter(app, 'appUrlOpen', ({ url }: { url: string }) => {
        try { const u = new URL(url); if (u.origin === window.location.origin) router.push(cheminSur(u.pathname + u.search)) } catch { /* adresse illisible : ignorée */ }
      })
    }

    // Les liens qui sortent de la console partent dans le navigateur du téléphone.
    const surClic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || e.defaultPrevented) return
      let u: URL
      try { u = new URL(a.getAttribute('href') ?? '', window.location.href) } catch { return }
      if (!/^https?:$/.test(u.protocol)) return
      const externe = u.origin !== window.location.origin, artisan = /^\/(p|site|l)\//.test(u.pathname)
      if (!externe && !artisan) return
      e.preventDefault()
      void ouvrirExterne(u.href)
    }
    document.addEventListener('click', surClic, true)

    const net = plugin('Network')
    if (net) {
      net.getStatus?.().then((s) => setHorsLigne(!(s as { connected?: boolean })?.connected)).catch(() => {})
      void ecouter(net, 'networkStatusChange', (s: { connected: boolean }) => setHorsLigne(!s.connected))
    }

    return () => { document.removeEventListener('click', surClic, true); for (const h of ecouteurs) h.remove().catch(() => {}) }
  }, [router])

  if (!horsLigne) return null
  return <div className="psh-horsligne" role="status" data-hors-ligne="1">Hors ligne — ce que vous lisez est à jour du dernier passage, vos envois attendront le réseau.</div>
}
