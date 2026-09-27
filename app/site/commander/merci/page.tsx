'use client'

import { useState } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import { actif } from '@/lib/flags'

export default function MerciSite() {
  const searchParams = useSearchParams()
  const commande = searchParams.get('commande') || ''
  const [attente, setAttente] = useState(false)
  const [message, setMessage] = useState('')
  if (!actif('siteAchatPublic') || !actif('siteCommande')) notFound()

  async function renvoyer() {
    setAttente(true)
    try {
      await fetch('/api/site/commander/public/renvoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commande }),
      })
    } catch { /* La réponse affichée ne révèle rien sur la commande. */ }
    setMessage('Si le lien peut être renvoyé, il arrivera à l’adresse de votre commande.')
    setAttente(false)
  }

  return <main className="wrap" style={{ maxWidth: 680, paddingBlock: '4rem' }}>
    <meta name="robots" content="noindex" />
    <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
      <h1>Paiement reçu</h1>
      <p>Paiement reçu. Un lien vient de partir vers votre adresse : il ouvre votre dossier.</p>
      <button type="button" className="btn btn--primary" onClick={renvoyer} disabled={attente}>Renvoyer le lien</button>
      {message && <p role="status">{message}</p>}
    </div>
  </main>
}
