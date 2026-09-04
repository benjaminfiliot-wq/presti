import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Image de partage DE LA PLATEFORME DE L'ARTISAN (le lien qu'il colle partout) (audit v4 : la carte déclarait `summary_large_image`
// SANS image — carte cassée sur WhatsApp, le canal par lequel un artisan partage son site).
// À sa marque : son nom, son métier, sa zone, sa couleur, sa photo. Jamais « Presti ».

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'nodejs'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: a } = await supabaseAdmin
    .from('artisans').select('nom, metier, zone_intervention, ville, accent, photo_url, logo_url, realisations, plateforme_active')
    .eq('slug', slug).maybeSingle()
  const accent = /^#[0-9a-fA-F]{6}$/.test(a?.accent || '') ? (a!.accent as string) : '#8a5a2b'
  const nom: string = a?.plateforme_active !== false && !!a ? String(a?.nom || 'Artisan') : 'Page introuvable'
  const metier: string = a?.plateforme_active !== false && !!a ? String(a?.metier || '') : ''
  const zone: string = a?.plateforme_active !== false && !!a ? String(a?.zone_intervention || a?.ville || '') : ''
  const reals = Array.isArray(a?.realisations) ? (a!.realisations as { image?: string }[]) : []
  // Une photo réelle si elle existe (jamais une image de décoration inventée) ; sinon la couleur seule.
  const photo = a?.plateforme_active !== false && !!a ? (reals.find((r) => r?.image && /^https?:/.test(r.image))?.image || (a?.photo_url && /^https?:/.test(a.photo_url) ? a.photo_url : null)) : null
  const initiales = (nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('')

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#141210', color: '#fff', fontFamily: 'sans-serif', position: 'relative' }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: photo ? 'linear-gradient(90deg, rgba(20,18,16,.92) 0%, rgba(20,18,16,.55) 60%, rgba(20,18,16,.25) 100%)' : `linear-gradient(135deg, ${accent} 0%, #141210 100%)` }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '64px 72px', width: '100%', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28 }}>
            {a?.logo_url && /^https?:/.test(a.logo_url)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={a.logo_url} alt="" width={84} height={84} style={{ width: 84, height: 84, borderRadius: 20, objectFit: 'cover' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 84, height: 84, borderRadius: 20, background: accent, fontSize: 38, fontWeight: 700 }}>{initiales}</div>}
            {metier ? <div style={{ fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.9 }}>{metier}</div> : null}
          </div>
          <div style={{ fontSize: nom.length > 22 ? 64 : 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1000 }}>{nom}</div>
          {zone ? <div style={{ fontSize: 32, marginTop: 18, opacity: 0.85 }}>{zone}</div> : null}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: accent }} />
      </div>
    ),
    { ...size },
  )
}
