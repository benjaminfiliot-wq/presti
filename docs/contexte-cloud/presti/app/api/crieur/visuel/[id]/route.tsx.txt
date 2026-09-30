import { ImageResponse } from 'next/og'
import { FAITS } from '@/lib/crieur/faits'

export const runtime = 'nodejs'

export async function GET(_req: Request, contexte: { params: Promise<{ id: string }> }) {
  const { id } = await contexte.params
  const fait = FAITS.find((f) => f.id === id.replace(/\.png$/, ''))
  if (!fait) return new Response('Fait inconnu', { status: 404 })
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 90, background: '#101923', color: '#f8fafc' }}>
      <div style={{ display: 'flex', fontSize: 58, lineHeight: 1.25 }}>{fait.texte}</div>
      <div style={{ display: 'flex', fontSize: 52, color: '#34d399' }}>Presti</div>
    </div>,
    { width: 1080, height: 1080, headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
