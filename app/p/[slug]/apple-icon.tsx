import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Icône d'ÉCRAN D'ACCUEIL iOS de la plateforme de conversation (audit final, C/13). C'est
// précisément la page qu'un client épingle pour suivre son devis : sans ce fichier, il épingle
// une capture d'écran anonyme au lieu de la marque de l'artisan.
//
// Deux écarts volontaires avec icon.tsx (le favicon d'onglet) :
//  - 180 px, la taille attendue par iOS ;
//  - AUCUN arrondi : iOS applique son propre masque. Des coins déjà transparents seraient
//    peints en noir par-dessus, et l'icône aurait une bordure sombre.

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const runtime = 'nodejs'

export default async function AppleIcon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: a } = await supabaseAdmin.from('artisans').select('nom, accent, logo_url').eq('slug', slug).maybeSingle()
  const accent = /^#[0-9a-fA-F]{6}$/.test(a?.accent || '') ? (a!.accent as string) : '#8a5a2b'
  const initiales = String(a?.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?'
  const logo = a?.logo_url && /^https?:/.test(a.logo_url) ? a.logo_url : null
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, fontSize: initiales.length > 1 ? 78 : 96, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="" width={180} height={180} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiales}
      </div>
    ),
    { ...size },
  )
}
