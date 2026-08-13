'use client'

import { useState, type FormEvent } from 'react'

export default function LeadForm({ slug }: { slug: string }) {
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
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
      body: JSON.stringify({ slug, nom_prospect: nom, contact, message }),
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
    return <div className="msg">Merci ! Votre demande est bien envoyée. Vous aurez une réponse très vite. ✅</div>
  }

  return (
    <form onSubmit={submit}>
      <label>Votre nom</label>
      <input value={nom} onChange={(e) => setNom(e.target.value)} required />
      <label>Votre email ou téléphone</label>
      <input value={contact} onChange={(e) => setContact(e.target.value)} required />
      <label>Votre besoin (décrivez les travaux)</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        required
        style={{ width: '100%', padding: '.7rem .8rem', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
      />
      <button disabled={loading}>{loading ? '…' : 'Envoyer ma demande'}</button>
      {err && <div className="msg err">{err}</div>}
    </form>
  )
}
