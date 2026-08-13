import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateLeadReply } from '@/lib/ai'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { slug, nom_prospect, contact, message } = body ?? {}

    if (!slug || !contact) {
      return NextResponse.json({ error: 'Slug et contact requis' }, { status: 400 })
    }

    // 1) Retrouver l'artisan à partir de son slug
    const { data: artisan, error: aErr } = await supabaseAdmin
      .from('artisans')
      .select('id, nom, metier, ton_style, email')
      .eq('slug', slug)
      .maybeSingle()

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
    if (!artisan) return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })

    // 2) Enregistrer le lead (chemin critique : on ne le perd jamais)
    const { data: lead, error: lErr } = await supabaseAdmin
      .from('leads')
      .insert({
        artisan_id: artisan.id,
        nom_prospect: nom_prospect ?? null,
        contact,
        message: message ?? null,
        canal: 'formulaire',
        statut: 'nouveau',
      })
      .select('id')
      .single()

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

    // 3) Étape 4 — réponse IA instantanée + emails.
    // Non bloquant : si l'IA ou l'email échoue, le lead est déjà sauvé et
    // apparaîtra dans le dashboard (statut 'nouveau'), donc rien n'est perdu.
    try {
      // trace du message entrant du prospect
      if (message) {
        await supabaseAdmin.from('messages').insert({
          lead_id: lead.id,
          sens: 'in',
          type: 'manuel',
          contenu: message,
        })
      }

      const reply = await generateLeadReply(
        { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style },
        { nom_prospect, contact, message },
      )

      if (reply) {
        await supabaseAdmin.from('messages').insert({
          lead_id: lead.id,
          sens: 'out',
          type: 'reponse_auto',
          contenu: reply,
        })

        const isEmail = typeof contact === 'string' && contact.includes('@')

        // a) réponse instantanée au prospect (si son contact est un email)
        if (isEmail) {
          await sendEmail({
            to: contact,
            subject: `Votre demande — ${artisan.nom ?? 'Presti'}`,
            text: reply,
            replyTo: artisan.email ?? undefined,
          })
        }

        // b) notification à l'artisan
        if (artisan.email) {
          const recap = `Nouveau contact via votre lien Presti.

Nom : ${nom_prospect || 'non précisé'}
Contact : ${contact}
Besoin : ${message || 'non précisé'}

Réponse automatique ${isEmail ? 'envoyée au prospect' : '(prospect sans email — à rappeler)'} :
---
${reply}`
          await sendEmail({
            to: artisan.email,
            subject: `Nouveau lead — ${nom_prospect || contact}`,
            text: recap,
            replyTo: isEmail ? contact : undefined,
          })
        }

        await supabaseAdmin
          .from('leads')
          .update({ statut: 'repondu', updated_at: new Date().toISOString() })
          .eq('id', lead.id)

        // Étape 6 — planifier les relances automatiques (J+2, J+5, J+10).
        // Le cron /api/cron/relances les enverra à échéance si le lead est
        // toujours en attente (statut 'repondu', pas encore gagné/perdu).
        const now = Date.now()
        const jours = [2, 5, 10]
        await supabaseAdmin.from('relances').insert(
          jours.map((j, i) => ({
            lead_id: lead.id,
            planifiee_le: new Date(now + j * 86400000).toISOString(),
            rang: i + 1,
            envoyee: false,
          })),
        )
      }
    } catch (e) {
      console.error('[leads] étape 4 (IA/email) a échoué:', e)
      // lead conservé en 'nouveau' — visible dans le dashboard, rien de perdu
    }

    return NextResponse.json({ ok: true, leadId: lead.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
