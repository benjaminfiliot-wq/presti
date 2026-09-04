import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Favicon DU SITE DE L'ARTISAN (audit v4 : l'onglet du client affichait le favicon de Presti —
// « votre site, votre marque » démenti au premier coup d'œil). Son logo s'il en a un, sinon
// ses initiales sur sa couleur.

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'
export const runtime = 'nodejs'

export default async function Icon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: a } = await supabaseAdmin.from('artisans').select('nom, accent, logo_url').eq('slug', slug).maybeSingle()
  const accent = /^#[0-9a-fA-F]{6}$/.test(a?.accent || '') ? (a!.accent as string) : '#8a5a2b'
  const initiales = String(a?.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?'
  const logo = a?.logo_url && /^https?:/.test(a.logo_url) ? a.logo_url : null
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, borderRadius: 16, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, fontSize: initiales.length > 1 ? 28 : 34, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiales}
      </div>
    ),
    { ...size },
  )
}
