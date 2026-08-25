export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import React from 'react'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData } = await supabaseAdmin.auth.getUser(token)
    if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (!devis.client_email) return NextResponse.json({ error: "Renseigne l'email du client pour l'envoyer." }, { status: 400 })

    const { data: lignes } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', id).order('ordre')
    const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()

    const pdfData = buildPdfData(devis, lignes ?? [], artisan ?? {})
    const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
    const base64 = Buffer.from(buffer).toString('base64')

    const nomEnt = artisan?.nom || 'votre artisan'
    const r = await sendEmail({
      to: devis.client_email,
      subject: `Votre devis ${devis.numero || ''} — ${nomEnt}`,
      text: `Bonjour ${devis.client_nom || ''},\n\nVeuillez trouver ci-joint votre devis${devis.objet ? ` pour : ${devis.objet}` : ''}. Il est valable ${devis.validite_jours || 90} jours.\n\nN'hésitez pas à me contacter pour toute question.\n\nBien à vous,\n${nomEnt}`,
      replyTo: artisan?.email || undefined,
      attachments: [{ filename: `${devis.numero || 'devis'}.pdf`, content: base64 }],
    })
    if (!r.ok) return NextResponse.json({ error: `Envoi échoué : ${r.error}` }, { status: 502 })

    await supabaseAdmin.from('devis').update({ statut: 'envoye', updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
