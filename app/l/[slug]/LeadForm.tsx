'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { compressPhotoToDataUrl } from '@/lib/media'

type Msg = { sens: 'in' | 'out'; contenu: string }
type Props = { slug: string; artisanNom?: string | null; avatar?: string | null }

const initials = (n?: string | null) =>
  (n || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A'

export default function LeadForm({ slug, artisanNom, avatar }: Props) {
  // Phase 1 (formulaire) → Phase 2 (conversation en direct).
  const [phase, setPhase] = useState<'form' | 'chat'>('form')
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot (doit rester vide)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([]) // data URLs WebP (EXIF strippé)
  const [photoBusy, setPhotoBusy] = useState(false)

  // A/B (J8) : A = formulaire complet ; B = « 1 champ » (besoin d'abord, coordonnées après la 1re réponse).
  const [variant, setVariant] = useState<'A' | 'B' | null>(null)
  const [needContact, setNeedContact] = useState(false) // variante B : coordonnées pas encore capturées

  // Conversation
  const [token, setToken] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [closed, setClosed] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const storageKey = `presti-conv-${slug}`

  // Événement d'entonnoir anonyme (ne casse jamais la page).
  function pingEvent(event: 'view' | 'lead' | 'contact', v: 'A' | 'B' | null) {
    try {
      fetch('/api/plat-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ slug, event, variant: v }) }).catch(() => {})
    } catch { /* ignore */ }
  }

  // Assignation de la variante A/B (collante par visiteur) + comptage d'une vue par session.
  useEffect(() => {
    let v: 'A' | 'B'
    try {
      const k = `presti-ab-${slug}`
      const stored = localStorage.getItem(k)
      v = stored === 'A' || stored === 'B' ? stored : (Math.random() < 0.5 ? 'A' : 'B')
      localStorage.setItem(k, v)
    } catch { v = Math.random() < 0.5 ? 'A' : 'B' }
    setVariant(v)
    try {
      const vk = `presti-view-${slug}`
      if (!sessionStorage.getItem(vk)) { sessionStorage.setItem(vk, '1'); pingEvent('view', v) }
    } catch { /* pas de compteur si stockage indispo */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Restaure une conversation en cours (le prospect revient sur la page).
  useEffect(() => {
    let t: string | null = null
    try { t = localStorage.getItem(storageKey) } catch { t = null }
    if (!t) return
    ;(async () => {
      try {
        const res = await fetch(`/api/conversation?token=${encodeURIComponent(t!)}`)
        if (!res.ok) { try { localStorage.removeItem(storageKey) } catch {} ; return }
        const d = await res.json()
        if (Array.isArray(d.messages) && d.messages.length) {
          setToken(t)
          setMsgs(d.messages.map((m: Msg) => ({ sens: m.sens, contenu: m.contenu })))
          setPhase('chat')
        }
      } catch { /* silencieux : on garde le formulaire */ }
    })()
  }, [storageKey])

  // Auto-scroll vers le dernier message.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, thinking, phase])

  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // permet de re-choisir le même fichier
    if (!files.length) return
    setPhotoBusy(true)
    setErr(null)
    const slots = Math.max(0, 3 - photos.length)
    const next: string[] = []
    for (const f of files.slice(0, slots)) {
      if (!f.type.startsWith('image/')) continue
      const d = await compressPhotoToDataUrl(f)
      if (d) next.push(d)
    }
    if (next.length) setPhotos((p) => [...p, ...next].slice(0, 3))
    setPhotoBusy(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const isB = variant === 'B'
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isB
          ? { slug, message, website, photos, variant: 'B', deferContact: true }
          : { slug, nom_prospect: nom, contact, message, website, photos, variant: 'A' }),
      })
      const d = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok) { setErr(d.error ?? 'Une erreur est survenue.'); return }

      pingEvent('lead', variant)
      if (!isB) pingEvent('contact', variant) // variante A : contact fourni dès le départ

      const seed: Msg[] = []
      if (message.trim()) seed.push({ sens: 'in', contenu: message.trim() })
      if (d.reply) seed.push({ sens: 'out', contenu: d.reply })
      else seed.push({ sens: 'out', contenu: `Bien reçu${nom.trim() ? ' ' + nom.trim().split(/\s+/)[0] : ''} ! ${artisanNom || 'Votre artisan'} a bien votre demande et vous répond au plus vite.` })
      setMsgs(seed)
      if (d.token) {
        setToken(d.token)
        try { localStorage.setItem(storageKey, d.token) } catch {}
      }
      if (isB) setNeedContact(true) // variante B : on demande les coordonnées après la 1re réponse
      setPhase('chat')
    } catch {
      setLoading(false)
      setErr('Connexion interrompue. Réessayez.')
    }
  }

  // Variante B : capture différée des coordonnées, une fois la valeur démontrée.
  async function captureContact(e: FormEvent) {
    e.preventDefault()
    if (!token || loading) return
    if (!contact.trim()) { setErr('Indiquez un email ou un téléphone pour être recontacté.'); return }
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/leads/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nom_prospect: nom, contact, website }),
      })
      const d = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok) { setErr(d.error ?? 'Envoi impossible.'); return }
      pingEvent('contact', variant)
      setNeedContact(false)
      setMsgs((m) => [...m, { sens: 'out', contenu: `Merci${nom.trim() ? ' ' + nom.trim().split(/\s+/)[0] : ''} ! ${artisanNom || "L'artisan"} a vos coordonnées et revient vers vous très vite. Vous pouvez continuer à préciser votre besoin ici.` }])
    } catch {
      setLoading(false); setErr('Connexion interrompue. Réessayez.')
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !token || sending) return
    setDraft('')
    setErr(null)
    setMsgs((m) => [...m, { sens: 'in', contenu: text }])
    setSending(true)
    setThinking(true)
    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, message: text, website }),
      })
      const d = await res.json().catch(() => ({}))
      setThinking(false)
      setSending(false)
      if (!res.ok) { setErr(d.error ?? 'Message non envoyé.'); return }
      if (d.reply) setMsgs((m) => [...m, { sens: 'out', contenu: d.reply }])
      if (d.closed) setClosed(true)
    } catch {
      setThinking(false)
      setSending(false)
      setErr('Connexion interrompue. Réessayez.')
    }
  }

  if (phase === 'chat') {
    return (
      <div className="plat-chat">
        <div className="plat-chat-head">
          <span className="plat-chat-ava">{avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" /> : <b>{initials(artisanNom)}</b>}</span>
          <span className="plat-chat-id">
            <b>{artisanNom || 'Votre artisan'}</b>
            <span className="plat-chat-live"><span className="plat-live-dot" />En ligne · répond en direct</span>
          </span>
        </div>

        <div className="plat-thread" ref={threadRef} data-lenis-prevent>
          {msgs.map((m, i) => (
            <div key={i} className={`plat-bub ${m.sens === 'in' ? 'me' : 'them'}`}>
              {m.sens === 'out' && <span className="plat-bub-ava">{avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" /> : <b>{initials(artisanNom)}</b>}</span>}
              <div className="plat-bub-txt">{m.contenu.split('\n').map((line, j) => <span key={j}>{line}{j < m.contenu.split('\n').length - 1 ? <br /> : null}</span>)}</div>
            </div>
          ))}
          {thinking && (
            <div className="plat-bub them">
              <span className="plat-bub-ava">{avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" /> : <b>{initials(artisanNom)}</b>}</span>
              <div className="plat-bub-txt typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        {closed ? (
          <div className="plat-chat-closed">Merci pour cet échange détaillé&nbsp;! {artisanNom || "L'artisan"} revient vers vous très vite pour la suite.</div>
        ) : needContact ? (
          <form className="plat-capture" onSubmit={captureContact}>
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={website} onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            <span className="plat-capture-t">Pour être recontacté par {artisanNom || "l'artisan"}, laissez vos coordonnées&nbsp;:</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom (facultatif)" aria-label="Votre nom" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone" aria-label="Email ou téléphone" required />
            <button type="submit" disabled={loading || !contact.trim()}>{loading ? '…' : 'Être recontacté'}</button>
          </form>
        ) : (
          <form className="plat-compose" onSubmit={send}>
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={website} onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
              placeholder="Écrivez votre message…"
              rows={1}
            />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Envoyer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
            </button>
          </form>
        )}
        {err && <div className="msg err" style={{ marginTop: '.6rem' }}>{err}</div>}
      </div>
    )
  }

  // Bloc photos partagé par les deux variantes.
  const photoPicker = (
    <div className="plat-photos">
      <div className="plat-photos-grid">
        {photos.map((p, i) => (
          <div className="plat-photo" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`Photo ${i + 1}`} />
            <button type="button" className="plat-photo-x" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} aria-label="Retirer la photo">×</button>
          </div>
        ))}
        {photos.length < 3 ? (
          <label className={`plat-photo-add${photoBusy ? ' busy' : ''}`}>
            <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} hidden disabled={photoBusy} />
            <span aria-hidden="true">{photoBusy ? '…' : '+'}</span>
            <small>{photoBusy ? 'Compression…' : 'Ajouter une photo'}</small>
          </label>
        ) : null}
      </div>
      <p className="plat-photos-note">Facultatif · jusqu&apos;à 3 photos. La localisation est retirée automatiquement.</p>
    </div>
  )

  // Tant que la variante A/B n'est pas résolue (1er rendu client), on évite tout flash de mise en page.
  if (!variant) return <div className="plat-form-skel" aria-hidden="true" />

  return (
    <form onSubmit={submit}>
      {/* honeypot anti-bot : invisible pour les humains, ignoré des lecteurs d'écran */}
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        value={website} onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      {variant === 'B' ? (
        <>
          {/* Variante B : « 1 champ » — on démontre la valeur avant de demander les coordonnées. */}
          <label>Décrivez votre besoin</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required style={{ resize: 'vertical' }}
            placeholder="Ex : Fuite sous mon évier de cuisine depuis ce matin, l'eau goutte dans le placard…" />
          {photoPicker}
          <button disabled={loading || photoBusy}>{loading ? '…' : 'Obtenir une réponse'}</button>
          <p className="plat-consent">Réponse immédiate. On vous demandera vos coordonnées juste après, pour vous recontacter.</p>
        </>
      ) : (
        <>
          <label>Votre nom</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required />
          <label>Votre email ou téléphone</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} required />
          <label>Votre besoin (décrivez les travaux)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required style={{ resize: 'vertical' }} />
          {photoPicker}
          <button disabled={loading || photoBusy}>{loading ? '…' : 'Démarrer la conversation'}</button>
          <p className="plat-consent">En envoyant, vous acceptez que vos coordonnées soient utilisées uniquement pour traiter votre demande. Vous pouvez demander leur suppression à tout moment.</p>
        </>
      )}
      {err && <div className="msg err">{err}</div>}
    </form>
  )
}
