import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { acompteApresAcceptation } from '@/lib/reglesServeur'
import { creerFacture } from '@/lib/factureDepuisDevis'
import { notifierArtisan } from '@/lib/notifications'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

// Carte Devis dans la conversation (v4 §A3) : le client ACCEPTE ou DEMANDE UNE MODIFICATION
// depuis le fil. L'acceptation est horodatée et journalisée (IP + canal) — valeur probante.
// Accès par le jeton secret de la conversation, jamais par un identifiant devinable.

export const runtime = 'nodejs'

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const action = body?.action === 'accepter' ? 'accepter' : body?.action === 'modifier' ? 'modifier' : ''
    const commentaire = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : ''
    if (!TOKEN_RE.test(token) || !action) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/conversation/devis')
      return NextResponse.json({ ok: true })
    }

    const { data: lead } = await supabaseAdmin
      .from('leads').select('id, artisan_id, nom_prospect, contact, statut').eq('token', token).maybeSingle()
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    // Le devis visible du fil : jamais un brouillon.
    const { data: devis } = await supabaseAdmin
      .from('devis').select('id, numero, total_ttc, statut, accepte_le')
      .eq('lead_id', lead.id).in('statut', ['envoye', 'accepte', 'refuse'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!devis) return NextResponse.json({ error: 'Aucun devis à traiter.' }, { status: 404 })

    const { data: artisan } = await supabaseAdmin
      .from('artisans').select('nom, email').eq('id', lead.artisan_id).maybeSingle()
    const qui = lead.nom_prospect || lead.contact || 'Le client'

    if (action === 'accepter') {
      // Idempotent : un devis déjà accepté ne change pas d'horodatage (la preuve est figée).
      if (devis.statut === 'accepte') return NextResponse.json({ ok: true, deja: true })
      await supabaseAdmin.from('devis').update({
        statut: 'accepte',
        accepte_le: new Date().toISOString(),
        accepte_ip: ip === 'unknown' ? null : ip,
        accepte_canal: 'plateforme',
        updated_at: new Date().toISOString(),
      }).eq('id', devis.id)

      // Trace dans le fil : l'échange porte la preuve, pas seulement la table devis.
      await supabaseAdmin.from('messages').insert({
        lead_id: lead.id, sens: 'in', type: 'devis_accepte',
        contenu: `✅ ${qui} a accepté le devis ${devis.numero || ''} (${Number(devis.total_ttc || 0).toFixed(2)} € TTC).`,
      })
      await supabaseAdmin.from('leads')
        .update({ statut: lead.statut === 'perdu' ? lead.statut : 'gagne', updated_at: new Date().toISOString(), lu_le: null })
        .eq('id', lead.id)

      if (artisan?.email) {
        await notifierArtisan(lead.artisan_id, 'devis_accepte', artisan.email, {
          
          subject: `✅ Devis accepté — ${qui}`,
          text: `Bonne nouvelle : ${qui} vient d'accepter votre devis ${devis.numero || ''} (${Number(devis.total_ttc || 0).toFixed(2)} € TTC) depuis votre espace de conversation.\n\nL'acceptation est horodatée et conservée avec l'échange.\n\nRetrouvez le dossier dans votre espace (Devis).`,
          replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
        }).catch(() => {})
      }
      // Règle d'automatisation (v5 §9) : « quand le client accepte → facture d'acompte de N % ».
      // Même chemin que la facture manuelle : mentions bloquantes, numérotation, scellement.
      // Un refus (mentions manquantes) ne casse pas l'acceptation — l'artisan est prévenu.
      let facture: { numero: string } | null = null
      try {
        const pct = await acompteApresAcceptation(lead.artisan_id)
        if (pct) {
          const f = await creerFacture({ artisanId: lead.artisan_id, devisId: devis.id, acomptePct: pct })
          if (f.ok) {
            facture = { numero: f.numero }
            await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'facture_emise', contenu: `Facture d'acompte ${f.numero} (${pct} %)` })
          } else if (artisan?.email) {
            await notifierArtisan(lead.artisan_id, 'devis_accepte', artisan.email, { subject: `Facture d'acompte non créée — ${qui}`, text: `Votre règle demande une facture d'acompte de ${pct} % à l'acceptation, mais elle n'a pas pu être créée :\n\n${f.error}\n\nCréez-la depuis votre espace (Factures) une fois le profil complété.`, replyTo: 'contact@prestiapp.fr' }).catch(() => {})
          }
        }
      } catch (e) { console.error('[conversation/devis] acompte:', e) }
      return NextResponse.json({ ok: true, statut: 'accepte', ...(facture ? { facture } : {}) })
    }

    // Demande de modification : on ne touche pas au statut, on fait remonter la demande.
    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id, sens: 'in', type: 'manuel',
      contenu: commentaire || `Bonjour, pouvez-vous modifier le devis ${devis.numero || ''} ?`,
    })
    await supabaseAdmin.from('leads')
      .update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'en_discussion', updated_at: new Date().toISOString(), lu_le: null })
      .eq('id', lead.id)
    if (artisan?.email) {
      await notifierArtisan(lead.artisan_id, 'devis_accepte', artisan.email, {
        
        subject: `Modification demandée — devis ${devis.numero || ''}`,
        text: `${qui} demande une modification de votre devis ${devis.numero || ''} :\n\n« ${commentaire || '(sans précision)'} »\n\nRépondez-lui depuis votre espace (Messages).`,
        replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true, statut: devis.statut })
  } catch (e) {
    console.error('[conversation/devis] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
