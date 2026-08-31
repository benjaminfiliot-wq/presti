'use client'

import { useEffect } from 'react'

// Error boundary racine (remplace le layout en cas de crash grave). Rapporte l'erreur
// au crash reporting self-hosté puis affiche un écran propre avec un bouton pour réessayer.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      fetch('/api/report-error', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexte: 'global-error', message: error?.message ?? 'erreur inconnue', stack: error?.stack ?? '', url: typeof location !== 'undefined' ? location.href : '' }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B0A0F', color: '#ECEAE6', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 1.2rem', borderRadius: 14, background: 'linear-gradient(130deg,#E8946F,#D97757)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px -8px rgba(217,119,87,.6)' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1a0f0a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          </div>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 .5rem' }}>Une erreur est survenue</h1>
          <p style={{ color: '#8B867D', margin: '0 0 1.4rem', lineHeight: 1.6 }}>Pas de panique, rien n&apos;est perdu. Réessayez — et si ça persiste, revenez dans un instant.</p>
          <button onClick={() => reset()} style={{ background: 'linear-gradient(120deg,#E8946F,#D97757)', color: '#1a0f0a', border: 'none', borderRadius: 11, padding: '.8rem 1.6rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Réessayer</button>
        </div>
      </body>
    </html>
  )
}
