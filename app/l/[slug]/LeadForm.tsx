'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

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

  // Conversation
  const [token, setToken] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [closed, setClosed] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const storageKey = `presti-conv-${slug}`

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

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, nom_prospect: nom, contact, message, website }),
      })
      const d = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok) { setErr(d.error ?? 'Une erreur est survenue.'); return }

      const seed: Msg[] = []
      if (message.trim()) seed.push({ sens: 'in', contenu: message.trim() })
      if (d.reply) seed.push({ sens: 'out', contenu: d.reply })
      setMsgs(seed)
      if (d.token) {
        setToken(d.token)
        try { localStorage.setItem(storageKey, d.token) } catch {}
      }
      setPhase('chat')
    } catch {
      setLoading(false)
      setErr('Connexion interrompue. Réessayez.')
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

        <div className="plat-thread" ref={threadRef}>
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

  return (
    <form onSubmit={submit}>
      {/* honeypot anti-bot : invisible pour les humains, ignoré des lecteurs d'écran */}
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        value={website} onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <label>Votre nom</label>
      <input value={nom} onChange={(e) => setNom(e.target.value)} required />
      <label>Votre email ou téléphone</label>
      <input value={contact} onChange={(e) => setContact(e.target.value)} required />
      <label>Votre besoin (décrivez les travaux)</label>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required style={{ resize: 'vertical' }} />
      <button disabled={loading}>{loading ? '…' : 'Démarrer la conversation'}</button>
      {err && <div className="msg err">{err}</div>}
    </form>
  )
}
