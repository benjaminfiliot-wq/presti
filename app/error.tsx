'use client'

import { useEffect } from 'react'

// Error boundary de segment : rapporte puis propose de réessayer, dans le thème de l'app.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      fetch('/api/report-error', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexte: 'segment-error', message: error?.message ?? 'erreur inconnue', stack: error?.stack ?? '', url: typeof location !== 'undefined' ? location.href : '' }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [error])

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.3rem', marginBottom: '.5rem' }}>Oups, un souci est survenu</h1>
        <p className="muted" style={{ marginBottom: '1.3rem', lineHeight: 1.6 }}>Rien n&apos;est perdu. Réessayez — et si ça persiste, revenez dans un instant.</p>
        <button className="btn" style={{ width: 'auto' }} onClick={() => reset()}>Réessayer</button>
      </div>
    </main>
  )
}
