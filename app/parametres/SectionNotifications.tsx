'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import { TYPES_NOTIFICATION, notificationActive, pushActive, type Notifications, type TypeNotification } from '@/lib/notificationsTypes'
import { api, dateFr, type SectionProps } from './commun'
import { estNatif, plateforme, plugin } from '@/lib/natif'

// Paramètres → Notifications (prompt v9 §3.4).
//
//  1. « Sur votre téléphone » : activer les notifications push SUR CET APPAREIL — la permission est
//     demandée AU CLIC, jamais au chargement ; la liste des appareils abonnés, retirables un à un ;
//     « M'envoyer un test ». Sur iPhone, seulement une fois Presti installée sur l'écran d'accueil
//     (iOS 16.4+) : l'écran le dit et renvoie vers le geste d'installation.
//  2. « Ce qui vous est envoyé » : par événement, email et/ou push (absent = activé).
//
// Chaque issue a un mot pour l'artisan (revue du 06/09) : invite fermée, navigateur qui bloque,
// service worker pas encore prêt, ancien abonnement sous une autre clé, test parti vers zéro appareil.
// Sans le drapeau `pushWeb` (migration 0064 pas encore collée), seule la partie email existe.

type Appareil = { id: string; type: string; endpoint: string | null; jeton: string | null; appareil: string | null; actif: boolean; cree_le: string; dernier_succes: string | null; echecs: number }
type Support = 'ok' | 'non' | 'ios_non_installee'

const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const estInstallee = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const supportPush = (): Support => {
  if (estNatif()) return 'ok' // la coque (J3) : notifications natives, quel que soit le WebView
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (estIos() && !estInstallee() && !ok) return 'ios_non_installee'
  return ok ? 'ok' : 'non'
}
/** Le jeton natif de CET appareil (posé par app/NatifPont.tsx à l'enregistrement). */
const jetonNatif = (): string | null => { try { return sessionStorage.getItem('presti.jeton_natif') } catch { return null } }
/** La clé VAPID (base64url) au format attendu par le navigateur. */
function cleEnOctets(cle: string): Uint8Array {
  const b64 = (cle + '='.repeat((4 - (cle.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64)
  return Uint8Array.from(brut, (c) => c.charCodeAt(0))
}
/** Le service worker de la console : déjà là, ou en train de s'installer (première visite). */
async function serviceWorkerPret(): Promise<ServiceWorkerRegistration | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg?.active) return reg // une inscription sans worker ACTIF (première visite, en cours d'installation) ne suffit pas à s'abonner
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 8000))])
}

export default function SectionNotifications({ a, patch, signaler }: SectionProps) {
  const pushDispo = actif('pushWeb')
  /** La coque sans Firebase (drapeau `pushNatif` baissé) : les notifications natives viendront avec une prochaine version de l'app. */
  const natifSansPush = estNatif() && !actif('pushNatif')
  const [support, setSupport] = useState<Support>('non')
  const [ios, setIos] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [cle, setCle] = useState<string | null>(null)
  const [appareils, setAppareils] = useState<Appareil[] | null>(null)
  const [courant, setCourant] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const r = await api<{ cle?: string | null; appareils?: Appareil[] }>('/api/push/abonner')
    if (!r.ok) { setErreur(r.data.error ?? 'Liste indisponible.'); setAppareils([]); return }
    setCle(r.data.cle ?? null) // une seule source : la clé que le serveur signe
    setAppareils(r.data.appareils ?? [])
  }, [])

  useEffect(() => {
    if (!pushDispo) return
    setSupport(supportPush()); setIos(estIos())
    void charger()
    if (estNatif()) {
      // La coque : la permission vient du plugin, « cet appareil » est le jeton natif gardé par NatifPont.
      setCourant(jetonNatif())
      plugin('PushNotifications')?.checkPermissions?.().then((p) => {
        const r = (p as { receive?: string })?.receive
        setPermission(r === 'granted' ? 'granted' : r === 'denied' ? 'denied' : 'default')
      }).catch(() => {})
      return
    }
    if ('Notification' in window) setPermission(Notification.permission)
    // L'abonnement de CE navigateur, s'il existe : pour dire « cet appareil » dans la liste.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => setCourant(s?.endpoint ?? null)).catch(() => {})
    }
  }, [pushDispo, charger])

  /** Cette ligne de la liste est-elle l'appareil sur lequel on est ? (endpoint web, ou jeton natif) */
  const estCourant = (ap: Appareil) => !!courant && (ap.endpoint === courant || ap.jeton === courant)

  /** Activation dans la coque : permission native, puis enregistrement — le jeton arrive par NatifPont → /api/push/abonner. */
  async function activerNatif() {
    const push = plugin('PushNotifications')
    if (!push?.requestPermissions || !push.register) throw new Error('Notifications natives indisponibles dans cette version de l’application.')
    const p = (await push.requestPermissions()) as { receive?: string }
    setPermission(p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'default')
    if (p.receive !== 'granted') { setErreur(p.receive === 'denied' ? (plateforme() === 'ios' ? 'Notifications refusées pour Presti : Réglages → Notifications → Presti.' : 'Notifications refusées pour Presti : Paramètres du téléphone → Applications → Presti → Notifications.') : 'Autorisez les notifications quand le téléphone le demande, puis réessayez.'); return }
    await push.register()
    await plugin('Preferences')?.set?.({ key: 'presti.push_active', value: '1' }).catch(() => {})
    // Le jeton arrive de façon asynchrone (écouteur `registration` de NatifPont) : on laisse le temps, puis on relit.
    for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 400)); const j = jetonNatif(); if (j) { setCourant(j); break } }
    await charger()
    if (jetonNatif()) signaler({ type: 'ok', text: `Ce ${plateforme() === 'ios' ? 'iPhone' : 'téléphone'} reçoit maintenant les notifications ✅` })
    else setErreur('Le téléphone n’a pas rendu de jeton de notification. Vérifiez la connexion, puis réessayez.')
  }

  async function activer() {
    setErreur(null); setBusy('activer')
    try {
      if (estNatif()) { await activerNatif(); return }
      // La permission est demandée EN PREMIER, dans le geste du clic lui-même : Safari (iPhone installée) refuse
      // toute demande qui arrive après un await (revue du 06/09). Le service worker vient ensuite.
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'denied') { setErreur('Notifications bloquées dans ce navigateur.'); return }
      if (perm !== 'granted') { setErreur('Autorisez les notifications quand le navigateur le demande, puis réessayez.'); return }
      const reg = await serviceWorkerPret()
      if (!reg) throw new Error('Presti se prépare encore sur cet appareil : patientez quelques secondes, puis réessayez.')
      const clePublique = cle
      if (!clePublique) throw new Error('Clé de notification absente : réessayez dans un instant.')
      const options = { userVisibleOnly: true, applicationServerKey: cleEnOctets(clePublique) as BufferSource }
      let sub: PushSubscription
      try {
        sub = await reg.pushManager.subscribe(options)
      } catch (e) {
        // Un ancien abonnement sous une autre clé (autre déploiement) bloque le nouveau : on le retire et on refait.
        if (!/applicationServerKey|different/i.test(String(e))) throw e
        await (await reg.pushManager.getSubscription())?.unsubscribe().catch(() => {})
        sub = await reg.pushManager.subscribe(options)
      }
      let j = sub.toJSON()
      let r = await api<{ code?: string }>('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) })
      if (!r.ok && r.data.code === 'reabonner') {
        // L'endpoint de ce navigateur est encore rattaché à un autre compte (autre artisan connecté ici avant) :
        // on se réabonne — nouvel endpoint, nouvelles clés — et on refait la demande une fois.
        await sub.unsubscribe().catch(() => {})
        sub = await reg.pushManager.subscribe(options)
        j = sub.toJSON()
        r = await api<{ code?: string }>('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) })
      }
      if (!r.ok) { await sub.unsubscribe().catch(() => {}); throw new Error(r.data.error ?? 'Abonnement refusé.') }
      setCourant(sub.endpoint)
      await charger()
      signaler({ type: 'ok', text: 'Cet appareil reçoit maintenant les notifications ✅' })
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Activation impossible.'
      setErreur(/push service|Registration failed|AbortError|NotAllowedError/i.test(m) ? 'Ce navigateur n’a pas pu s’abonner au service de notifications. Réessayez, ou utilisez Chrome ou Safari.' : m)
    } finally { setBusy(null) }
  }

  async function retirer(ap: Appareil) {
    setBusy(`app-${ap.id}`); setErreur(null)
    const r = await api('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ id: ap.id }) })
    if (!r.ok) { setErreur(r.data.error ?? 'Suppression impossible.'); setBusy(null); return }
    if (estCourant(ap)) {
      if (ap.jeton) {
        try { sessionStorage.removeItem('presti.jeton_natif') } catch { /* stockage indisponible */ }
        await plugin('Preferences')?.set?.({ key: 'presti.push_active', value: '0' }).catch(() => {})
      } else if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
        const s = await reg?.pushManager.getSubscription().catch(() => null)
        await s?.unsubscribe().catch(() => {})
      }
      setCourant(null)
    }
    await charger(); setBusy(null)
    signaler({ type: 'ok', text: 'Appareil retiré.' })
  }

  async function tester() {
    setBusy('test'); setErreur(null)
    const r = await api<{ envoyes?: number; supprimes?: number; desactives?: number }>('/api/push/test', { method: 'POST' })
    await charger() // un appareil oublié ou désactivé pendant le test doit disparaître ou se marquer tout de suite
    setBusy(null)
    if (!r.ok) { setErreur(r.data.error ?? 'Envoi impossible.'); return }
    const n = r.data.envoyes ?? 0
    if (n === 0) {
      const detail = [r.data.supprimes ? `${r.data.supprimes} appareil oublié (abonnement expiré)` : '', r.data.desactives ? `${r.data.desactives} désactivé après trois échecs` : ''].filter(Boolean).join(', ')
      setErreur(`Aucune notification n’a pu partir${detail ? ` : ${detail}` : ''}. Réactivez les notifications depuis l’appareil concerné.`)
      return
    }
    signaler({ type: 'ok', text: `Test envoyé à ${n} appareil${n > 1 ? 's' : ''} — regardez votre téléphone.` })
  }

  async function basculer(type: TypeNotification, canal: 'email' | 'push', valeur: boolean) {
    const avant: Notifications = a.notifications ?? {}
    const notifications: Notifications = canal === 'email'
      ? { ...avant, [type]: valeur }
      : { ...avant, push: { ...(avant.push ?? {}), [type]: valeur } }
    patch({ notifications }) // optimiste : la case répond tout de suite
    const { error } = await supabase.from('artisans').update({ notifications }).eq('id', a.id)
    if (error) { patch({ notifications: avant }); signaler({ type: 'err', text: 'Réglage non enregistré.' }) }
  }

  const actifs = (appareils ?? []).filter((x) => x.actif)
  return (
    <>
      {pushDispo ? (
        <div className="tool-card" data-notif-push>
          <h2>Sur votre téléphone</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>
            Une notification à la seconde où un client vous écrit, où un devis est accepté, où l’assistant a besoin de vous.
            Jamais le contenu du message : il reste dans Presti.
          </p>
          {natifSansPush ? (
            <p className="notif-etat" data-etat="natif-bientot">Dans l’application, vous êtes prévenu par email.</p>
          ) : support === 'ios_non_installee' ? (
            <p className="notif-etat" data-etat="ios">
              Sur iPhone, les notifications ne fonctionnent qu’une fois Presti installée sur l’écran d’accueil : dans Safari, touchez
              Partager puis « Sur l’écran d’accueil ». Ouvrez ensuite Presti depuis son icône et revenez ici.
            </p>
          ) : support === 'non' ? (
            <p className="notif-etat" data-etat="non">Ce navigateur ne sait pas recevoir de notifications. Sur un téléphone, utilisez Chrome (Android) ou Presti installée sur l’écran d’accueil (iPhone).</p>
          ) : permission === 'denied' ? (
            <p className="notif-etat" data-etat="refuse">
              {ios
                ? 'Les notifications de Presti sont désactivées sur cet iPhone. Réactivez-les dans Réglages → Notifications → Presti, puis revenez ici.'
                : estNatif()
                  ? 'Les notifications de Presti sont désactivées sur ce téléphone. Réactivez-les dans Paramètres → Applications → Presti → Notifications, puis revenez ici.'
                  : 'Les notifications sont bloquées pour Presti dans ce navigateur. Réautorisez-les dans ses réglages du site, puis revenez ici.'}
            </p>
          ) : actifs.some(estCourant) ? (
            <p className="notif-etat" data-etat="actif">✅ Cet appareil reçoit les notifications.</p>
          ) : (
            <button type="button" className="btn btn--primary" data-activer disabled={busy === 'activer'} onClick={activer}>{busy === 'activer' ? '…' : 'Activer sur cet appareil'}</button>
          )}
          {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}

          <h3 className="notif-h3">Appareils abonnés</h3>
          {appareils === null ? <p className="muted">Chargement…</p>
            : appareils.length === 0 ? <p className="muted" data-appareils-vide>Aucun appareil pour l’instant.</p>
            : (
              <ul className="sess" data-appareils>
                {appareils.map((ap) => (
                  <li key={ap.id} className={estCourant(ap) ? 'courante' : ''}>
                    <span className="sess-ic" aria-hidden="true">
                      {/iPhone|Android|iPad/i.test(ap.appareil ?? '')
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>}
                    </span>
                    <span className="sess-txt">
                      <b>{ap.appareil || 'Appareil'}{estCourant(ap) ? <em>Cet appareil</em> : null}{!ap.actif ? <em>Désactivé</em> : null}</b>
                      <small>Abonné le {dateFr(ap.cree_le)}{ap.dernier_succes ? ` · dernière notification le ${dateFr(ap.dernier_succes, true)}` : ''}{!ap.actif ? ' · trois envois ratés : réactivez-le depuis cet appareil' : ''}</small>
                    </span>
                    <button type="button" className="btn btn--ghost danger" aria-label={`Retirer ${ap.appareil || 'cet appareil'}`} disabled={!!busy} onClick={() => retirer(ap)}>{busy === `app-${ap.id}` ? '…' : 'Retirer'}</button>
                  </li>
                ))}
              </ul>
            )}
          {actifs.length > 0 ? <button type="button" className="btn btn--ghost" data-tester disabled={!!busy} onClick={tester}>{busy === 'test' ? '…' : 'M’envoyer un test'}</button> : null}
        </div>
      ) : null}

      <div className="tool-card" data-notif-prefs>
        <h2>Ce qui vous est envoyé</h2>
        <p className="muted" style={{ margin: '0 0 .4rem' }}>
          {pushDispo ? <>Par email à <b>{a.email}</b>, et sur vos appareils abonnés. </> : <>Envoyés à <b>{a.email}</b>. </>}
          Coupez ce que vous ne voulez plus recevoir — vos clients, eux, continuent d’être répondus.
        </p>
        {TYPES_NOTIFICATION.map((t) => (
          <div key={t.id} className="notif-row" data-type={t.id}>
            <span><b>{t.label}</b><small>{t.detail}</small></span>
            <span className="notif-canaux">
              <label><input type="checkbox" aria-label={`${t.label} : par email`} checked={notificationActive(a.notifications, t.id)} onChange={(e) => basculer(t.id, 'email', e.target.checked)} /> Email</label>
              {pushDispo ? <label><input type="checkbox" aria-label={`${t.label} : notification sur vos appareils`} checked={pushActive(a.notifications, t.id)} onChange={(e) => basculer(t.id, 'push', e.target.checked)} /> Push</label> : null}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
