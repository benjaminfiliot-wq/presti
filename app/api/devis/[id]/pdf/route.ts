export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import React from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return new Response('Non authentifié', { status: 401 })
    const { data: userData } = await supabaseAdmin.auth.getUser(token)
    if (!userData?.user) return new Response('Session expirée', { status: 401 })
    const uid = userData.user.id

    const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!devis) return new Response('Devis introuvable', { status: 404 })
    const { data: lignes } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', id).order('ordre')
    const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()

    const pdfData = buildPdfData(devis, lignes ?? [], artisan ?? {})
    const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${devis.numero || 'devis'}.pdf"`,
      },
    })
  } catch (e) {
    console.error('[devis pdf]', e)
    return new Response('Erreur lors de la génération du PDF.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}
