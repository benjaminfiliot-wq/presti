import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
}

const wrap: React.CSSProperties = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#09090C', color: '#ECEAE6', padding: '2rem', textAlign: 'center',
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
}
const mark: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 12, margin: '0 auto 1.4rem',
  background: 'linear-gradient(135deg,#E8946F,#D97757)', display: 'grid', placeItems: 'center',
  boxShadow: '0 8px 24px -6px rgba(217,119,87,.55)',
}
const link: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '.5rem', padding: '.8rem 1.4rem',
  borderRadius: 11, fontWeight: 650, textDecoration: 'none',
}

// Page 404 personnalisée (checklist pré-lancement) — garde le visiteur, propose des issues claires.
export default function NotFound() {
  return (
    <main style={wrap}>
      <div style={{ maxWidth: 480 }}>
        <div style={mark}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M6 21V10l6-4 6 4v11" /><path d="M10 21v-6h4v6" /></svg>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '.8rem', letterSpacing: '.14em', color: '#E8946F', fontWeight: 600 }}>ERREUR 404</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontSize: 'clamp(1.8rem,5vw,2.6rem)', fontWeight: 800, margin: '.6rem 0 0', letterSpacing: '-.02em' }}>
          Cette page a filé sur un chantier.
        </h1>
        <p style={{ color: '#8B867D', fontSize: '1.05rem', margin: '1rem 0 2rem', lineHeight: 1.6 }}>
          Le lien n&apos;existe pas ou a été déplacé. Pas de panique — voici par où repartir.
        </p>
        <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ ...link, background: 'linear-gradient(120deg,#E8946F,#D97757)', color: '#1a0f0a' }}>Retour à l&apos;accueil</Link>
          <Link href="/faq" style={{ ...link, background: '#141319', color: '#ECEAE6', border: '1px solid rgba(255,255,255,.1)' }}>Voir la FAQ</Link>
        </div>
      </div>
    </main>
  )
}
