import { ImageResponse } from 'next/og'

export const alt = "Presti — répondez à chaque demande de devis en moins d'une minute"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Aperçu de partage (Open Graph / Twitter) — carte de marque générée.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0d0d10 0%, #1a1310 100%)', color: '#ECEAE6', padding: '70px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 76, height: 76, borderRadius: 20, background: 'linear-gradient(135deg,#E8946F,#D97757)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 46, color: '#fff' }}>⌂</div>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Presti</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 30, color: '#E8946F', fontWeight: 600 }}>Pour les artisans du bâtiment</div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>Le premier qui répond décroche le chantier.</div>
          <div style={{ fontSize: 30, color: '#8B867D', maxWidth: 900 }}>Presti répond à chaque demande de devis en moins d&apos;une minute — et relance tout seul.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: '#8B867D' }}>
          <div>prestiapp.fr</div>
          <div style={{ color: '#ECEAE6' }}>Essai gratuit · sans carte</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
