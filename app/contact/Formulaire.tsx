'use client'

import { useState } from 'react'

// Le formulaire de contact public. Il remplace l'adresse email de l'entreprise, dont la boîte
// n'existe pas : un message écrit ici arrive vraiment, et son auteur en a la confirmation à
// l'écran. Une adresse publiée qui jette le courrier ne dit rien à personne.

export default function Formulaire() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [societe, setSociete] = useState('') // champ piège, invisible : seuls les robots le remplissent
  const [envoi, setEnvoi] = useState(false)
  const [etat, setEtat] = useState<{ type: 'ok' | 'err'; texte: string } | null>(null)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (envoi) return
    setEnvoi(true)
    setEtat(null)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, message, societe }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setEtat({ type: 'ok', texte: 'Message reçu. Vous aurez une réponse à cette adresse, en général sous 24 h.' })
        setNom(''); setEmail(''); setMessage('')
      } else {
        setEtat({ type: 'err', texte: d.error ?? 'Votre message n’a pas pu partir. Réessayez dans un moment.' })
      }
    } catch {
      setEtat({ type: 'err', texte: 'Connexion interrompue. Votre message n’est pas parti — réessayez.' })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="ct-form" onSubmit={envoyer} noValidate>
      <label className="ct-champ">
        <span>Votre nom</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={120} autoComplete="name" />
      </label>

      <label className="ct-champ">
        <span>Votre email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
        <em>C’est là que la réponse arrivera.</em>
      </label>

      <label className="ct-champ">
        <span>Votre message</span>
        <textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={4000} />
      </label>

      {/* Piège à robots : caché à l'œil ET aux lecteurs d'écran, jamais rempli par un humain. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label>Société<input tabIndex={-1} autoComplete="off" value={societe} onChange={(e) => setSociete(e.target.value)} /></label>
      </div>

      <button type="submit" className="btn btn--primary" disabled={envoi}>
        {envoi ? 'Envoi…' : 'Envoyer le message'}
      </button>

      {etat ? <p className={etat.type === 'ok' ? 'ct-ok' : 'ct-err'} role="status">{etat.texte}</p> : null}
    </form>
  )
}
