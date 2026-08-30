'use client'

import { useState, type FormEvent } from 'react'

export default function LeadForm({ slug }: { slug: string }) {
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot (doit rester vide)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, nom_prospect: nom, contact, message, website }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErr(d.error ?? 'Une erreur est survenue.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="plat-done">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
        <span>Demande envoyée&nbsp;! Vous allez recevoir une réponse très vite.</span>
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
      <button disabled={loading}>{loading ? '…' : 'Envoyer ma demande'}</button>
      {err && <div className="msg err">{err}</div>}
    </form>
  )
}
