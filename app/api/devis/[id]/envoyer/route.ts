export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import React from 'react'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'
import { sendEmail } from '@/lib/email'
import { getUserRevocable } from '@/lib/authArtisan'
import { OU_REMPLIR, mentionsManquantesEmission, messageMentionsBloquantes, versArtisanLegal } from '@/lib/legalArtisan'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData } = await getUserRevocable(token)
    if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (!devis.client_email) return NextResponse.json({ error: "Renseigne l'email du client pour l'envoyer." }, { status: 400 })

    const { data: lignes } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', id).order('ordre')
    const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()

    // Mentions obligatoires BLOQUANTES (audit v4 §3) : un devis sans SIRET ni assurance
    // décennale ne SORT pas — jusqu'à 3 000 € d'amende pour l'artisan. Le brouillon reste
    // intact : on refuse l'émission, pas le travail. HTTP 422 + la liste + où remplir.
    const manquantes = mentionsManquantesEmission(versArtisanLegal(artisan))
    if (manquantes.length) {
      return NextResponse.json({
        error: messageMentionsBloquantes(manquantes, 'ce devis'),
        code: 'mentions_manquantes', manquantes, lien: OU_REMPLIR.lien,
      }, { status: 422 })
    }

    const pdfData = buildPdfData(devis, lignes ?? [], artisan ?? {})
    const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
    const base64 = Buffer.from(buffer).toString('base64')

    const nomEnt = artisan?.nom || 'votre artisan'
    const r = await sendEmail({
      to: devis.client_email,
      subject: `Votre devis ${devis.numero || ''} — ${nomEnt}`,
      text: `Bonjour ${devis.client_nom || ''},\n\nVeuillez trouver ci-joint votre devis${devis.objet ? ` pour : ${devis.objet}` : ''}. Il est valable ${devis.validite_jours || 90} jours.\n\nN'hésitez pas à me contacter pour toute question.\n\nBien à vous,\n${nomEnt}`,
      // Marque blanche : le client final doit voir le nom de SON artisan comme expéditeur,
      // pas « Presti ». Sans fromName, lib/email.ts retombe sur la marque de l'éditeur.
      fromName: artisan?.nom || undefined,
      replyTo: artisan?.email || undefined,
      attachments: [{ filename: `${devis.numero || 'devis'}.pdf`, content: base64 }],
    })
    if (!r.ok) { console.error('[devis envoyer]', r.error); return NextResponse.json({ error: 'Envoi impossible pour le moment.' }, { status: 502 }) }

    await supabaseAdmin.from('devis').update({ statut: 'envoye', updated_at: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[devis envoyer] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
