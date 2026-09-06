import type { Metadata } from 'next'
import Marque from '@/app/Marque'

// Page hors-ligne (prompt v9 §2.3). Précachée par le service worker au premier passage dans la
// console, servie à la place de n'importe quelle page Presti quand le réseau manque — jamais à
// la place d'une surface artisan (/site, /p) : le repli les exclut (app/sw.ts).
//
// Styles en ligne, sans script : elle doit se rendre avec RIEN d'autre que son propre HTML —
// ni feuille de style, ni police, ni JavaScript ne sont garantis hors ligne.
export const metadata: Metadata = {
  title: 'Hors ligne',
  description: 'Presti a besoin d’une connexion pour afficher vos conversations.',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
}
export const dynamic = 'force-static'

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0A0C11', color: '#ECEAE6', padding: '2rem', textAlign: 'center',
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
}
const mark: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 14, margin: '0 auto 1.4rem',
  background: '#141319', border: '1px solid rgba(255,255,255,.08)', display: 'grid', placeItems: 'center',
}
const h1: React.CSSProperties = { fontSize: '1.5rem', margin: '0 0 .6rem', lineHeight: 1.2, fontWeight: 650 }
const p: React.CSSProperties = { color: '#C7C2BA', lineHeight: 1.55, margin: '0 0 1.6rem', fontSize: '.98rem' }
const link: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '.7rem 1.4rem',
  borderRadius: 11, fontWeight: 650, textDecoration: 'none', color: '#1a0f0a', background: '#D97757',
}

export default function HorsLigne() {
  return (
    <main style={wrap} data-presti-hors-ligne="1">
      <div style={{ maxWidth: 440 }}>
        <div style={mark}><Marque size={30} /></div>
        <h1 style={h1}>Vous êtes hors ligne</h1>
        <p style={p}>
          Presti a besoin d’une connexion pour afficher vos conversations, vos devis et vos factures.
          Rien n’est perdu : dès que le réseau revient, tout est là.
        </p>
        <a href="/dashboard" style={link}>Réessayer</a>
      </div>
    </main>
  )
}
