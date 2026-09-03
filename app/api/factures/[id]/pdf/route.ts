export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import React from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'
import { getUserRevocable } from '@/lib/authArtisan'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return new Response('Non authentifié', { status: 401 })
    const { data: userData } = await getUserRevocable(token)
    if (!userData?.user) return new Response('Session expirée', { status: 401 })
    const uid = userData.user.id

    const { data: facture } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!facture) return new Response('Facture introuvable', { status: 404 })
    const { data: lignes } = await supabaseAdmin.from('factures_lignes').select('*').eq('facture_id', id).order('ordre')
    const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()

    const pdfData = buildPdfData(facture, lignes ?? [], artisan ?? {}, 'facture')
    const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${facture.numero || 'facture'}.pdf"`,
      },
    })
  } catch (e) {
    console.error('[facture pdf]', e)
    return new Response('Erreur lors de la génération du PDF.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}
