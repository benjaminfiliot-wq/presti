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
import { planifierRelances } from '@/lib/relances'
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
    if (devis.statut === 'accepte') return NextResponse.json({ error: 'Ce devis est déjà accepté par le client : il ne se renvoie pas. Pour une modification, créez un nouveau devis.' }, { status: 409 })
    if (!devis.client_email && devis.lead_id) {
      // Devis créé par une règle avant que le client ne laisse ses coordonnées : on reprend
      // le contact de la conversation rattachée (uniquement si c'est un email).
      const { data: lead } = await supabaseAdmin.from('leads').select('contact, nom_prospect').eq('id', devis.lead_id).maybeSingle()
      const contact = typeof lead?.contact === 'string' ? lead.contact.trim() : ''
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) {
        const maj: Record<string, string> = { client_email: contact }
        if (!devis.client_nom && lead?.nom_prospect) maj.client_nom = lead.nom_prospect
        await supabaseAdmin.from('devis').update(maj).eq('id', id)
        Object.assign(devis, maj)
      }
    }
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
      fromName: artisan?.nom?.trim() || 'Votre artisan',
      replyTo: artisan?.email || undefined,
      attachments: [{ filename: `${devis.numero || 'devis'}.pdf`, content: base64 }],
      transactionnel: true, // le geste de l'artisan : la pause des agents ne le coupe pas (lib/email.ts)
    })
    if (!r.ok) { console.error('[devis envoyer]', r.error); return NextResponse.json({ error: 'Envoi impossible pour le moment.' }, { status: 502 }) }

    await supabaseAdmin.from('devis').update({ statut: 'envoye', updated_at: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid)

    // Relances J+2 / J+5 / J+10 (audit des promesses du 12/10, hors site, ligne « code ») : un devis rattaché à une
    // conversation arme les relances par le MÊME mécanisme qu'une réponse envoyée (lib/relances.ts) — la balle est chez le
    // client, le cron le relance tant qu'il ne répond pas. Un devis créé seul (« Nouveau devis », sans conversation) n'a pas
    // de fil auquel rattacher une relance : il n'en a pas, et la grille ne le promet plus (lib/plans.ts).
    let relances = 0
    if (devis.lead_id) {
      const { data: lead } = await supabaseAdmin.from('leads').select('id, statut').eq('id', devis.lead_id).eq('artisan_id', uid).maybeSingle()
      if (lead && lead.statut !== 'gagne' && lead.statut !== 'perdu') {
        await supabaseAdmin.from('leads').update({ statut: 'repondu', updated_at: new Date().toISOString() }).eq('id', lead.id)
        relances = await planifierRelances(lead.id)
      }
    }
    return NextResponse.json({ ok: true, relances })
  } catch (e) {
    console.error('[devis envoyer] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
