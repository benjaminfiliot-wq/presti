'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import { TYPES_NOTIFICATION, notificationActive, pushActive, type Notifications, type TypeNotification } from '@/lib/notificationsTypes'
import { dateFr, jeton, type SectionProps } from './commun'

// Paramètres → Notifications (prompt v9 §3.4).
//
//  1. « Sur votre téléphone » : activer les notifications push SUR CET APPAREIL — la permission est
//     demandée AU CLIC, jamais au chargement ; la liste des appareils abonnés, retirables un à un ;
//     « M'envoyer un test ». Sur iPhone, seulement une fois Presti installée sur l'écran d'accueil
//     (iOS 16.4+) : l'écran le dit et renvoie vers le geste d'installation.
//  2. « Ce qui vous est envoyé » : par événement, email et/ou push (absent = activé).
//
// Sans le drapeau `pushWeb` (migration 0064 pas encore collée), seule la partie email existe.

type Appareil = { id: string; type: string; endpoint: string | null; appareil: string | null; actif: boolean; cree_le: string; dernier_succes: string | null; echecs: number }
type Support = 'ok' | 'non' | 'ios_non_installee'

const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const estInstallee = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const supportPush = (): Support => {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (estIos() && !estInstallee() && !ok) return 'ios_non_installee'
  return ok ? 'ok' : 'non'
}
/** La clé VAPID (base64url) au format attendu par le navigateur. */
function cleEnOctets(cle: string): Uint8Array {
  const b64 = (cle + '='.repeat((4 - (cle.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64)
  return Uint8Array.from(brut, (c) => c.charCodeAt(0))
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const t = await jeton()
  const r = await fetch(chemin, { ...init, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init?.headers ?? {}) } })
  const data = (await r.json().catch(() => ({}))) as T & { error?: string }
  return { ok: r.ok, status: r.status, data }
}

export default function SectionNotifications({ a, patch, signaler }: SectionProps) {
  const pushDispo = actif('pushWeb')
  const [support, setSupport] = useState<Support>('non')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [cle, setCle] = useState<string | null>(null)
  const [appareils, setAppareils] = useState<Appareil[] | null>(null)
  const [courant, setCourant] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const r = await appel<{ cle?: string | null; appareils?: Appareil[] }>('/api/push/abonner')
    if (!r.ok) { setErreur(r.data.error ?? 'Liste indisponible.'); setAppareils([]); return }
    setCle(r.data.cle ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null)
    setAppareils(r.data.appareils ?? [])
  }, [])

  useEffect(() => {
    if (!pushDispo) return
    setSupport(supportPush())
    if ('Notification' in window) setPermission(Notification.permission)
    void charger()
    // L'abonnement de CE navigateur, s'il existe : pour dire « cet appareil » dans la liste.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => setCourant(s?.endpoint ?? null)).catch(() => {})
    }
  }, [pushDispo, charger])

  async function activer() {
    setErreur(null); setBusy('activer')
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) throw new Error('Le service worker de Presti n’est pas encore en place : rechargez la page, puis réessayez.')
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { if (perm === 'denied') setErreur('Notifications bloquées dans ce navigateur.'); return }
      const clePublique = cle ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
      if (!clePublique) throw new Error('Clé de notification absente : réessayez dans un instant.')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(clePublique) as BufferSource })
      const j = sub.toJSON()
      const r = await appel('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) })
      if (!r.ok) { await sub.unsubscribe().catch(() => {}); throw new Error(r.data.error ?? 'Abonnement refusé.') }
      setCourant(sub.endpoint)
      await charger()
      signaler({ type: 'ok', text: 'Cet appareil reçoit maintenant les notifications ✅' })
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Activation impossible.'
      setErreur(/push service|Registration failed|AbortError/i.test(m) ? 'Ce navigateur n’a pas pu s’abonner au service de notifications. Réessayez, ou utilisez Chrome ou Safari.' : m)
    } finally { setBusy(null) }
  }

  async function retirer(ap: Appareil) {
    setBusy(`app-${ap.id}`); setErreur(null)
    const r = await appel('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ id: ap.id }) })
    if (!r.ok) { setErreur(r.data.error ?? 'Suppression impossible.'); setBusy(null); return }
    if (ap.endpoint && ap.endpoint === courant) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
      const s = await reg?.pushManager.getSubscription().catch(() => null)
      await s?.unsubscribe().catch(() => {})
      setCourant(null)
    }
    await charger(); setBusy(null)
    signaler({ type: 'ok', text: 'Appareil retiré.' })
  }

  async function tester() {
    setBusy('test'); setErreur(null)
    const r = await appel<{ envoyes?: number; supprimes?: number }>('/api/push/test', { method: 'POST' })
    setBusy(null)
    if (!r.ok) { setErreur(r.data.error ?? 'Envoi impossible.'); return }
    signaler({ type: 'ok', text: `Test envoyé à ${r.data.envoyes ?? 0} appareil${(r.data.envoyes ?? 0) > 1 ? 's' : ''} — regardez votre téléphone.` })
    if (r.data.supprimes) void charger()
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
          {support === 'ios_non_installee' ? (
            <p className="notif-etat" data-etat="ios">
              Sur iPhone, les notifications ne fonctionnent qu’une fois Presti installée sur l’écran d’accueil : dans Safari, touchez
              Partager puis « Sur l’écran d’accueil ». Ouvrez ensuite Presti depuis son icône et revenez ici.
            </p>
          ) : support === 'non' ? (
            <p className="notif-etat" data-etat="non">Ce navigateur ne sait pas recevoir de notifications. Sur un téléphone, utilisez Chrome (Android) ou Presti installée sur l’écran d’accueil (iPhone).</p>
          ) : permission === 'denied' ? (
            <p className="notif-etat" data-etat="refuse">Les notifications sont bloquées pour Presti dans ce navigateur. Réautorisez-les dans ses réglages du site, puis revenez ici.</p>
          ) : courant && actifs.some((x) => x.endpoint === courant) ? (
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
                  <li key={ap.id} className={ap.endpoint && ap.endpoint === courant ? 'courante' : ''}>
                    <span className="sess-ic" aria-hidden="true">
                      {/iPhone|Android|iPad/i.test(ap.appareil ?? '')
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>}
                    </span>
                    <span className="sess-txt">
                      <b>{ap.appareil || 'Appareil'}{ap.endpoint && ap.endpoint === courant ? <em>Cet appareil</em> : null}{!ap.actif ? <em>Désactivé</em> : null}</b>
                      <small>Abonné le {dateFr(ap.cree_le)}{ap.dernier_succes ? ` · dernière notification le ${dateFr(ap.dernier_succes, true)}` : ''}{!ap.actif ? ' · trois envois ratés : réactivez-le depuis cet appareil' : ''}</small>
                    </span>
                    <button type="button" className="btn btn--ghost danger" disabled={!!busy} onClick={() => retirer(ap)}>{busy === `app-${ap.id}` ? '…' : 'Retirer'}</button>
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
              <label><input type="checkbox" checked={notificationActive(a.notifications, t.id)} onChange={(e) => basculer(t.id, 'email', e.target.checked)} /> Email</label>
              {pushDispo ? <label><input type="checkbox" checked={pushActive(a.notifications, t.id)} onChange={(e) => basculer(t.id, 'push', e.target.checked)} /> Push</label> : null}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
