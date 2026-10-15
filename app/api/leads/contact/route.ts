import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { notifierArtisan } from '@/lib/notifications'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { refusSiSansPlateforme } from '@/lib/plateformeAccesServeur'

export const runtime = 'nodejs'

// Capture DIFFÉRÉE des coordonnées (variante B « 1 champ ») : le prospect a d'abord décrit son
// besoin et reçu une réponse ; on récupère maintenant son nom + contact. On complète le lead,
// on prévient l'artisan et on programme les relances (comme un lead classique).
const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, n) : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const token = clip(body?.token, 100)
    const contact = clip(body?.contact, 200)
    const nom_prospect = clip(body?.nom_prospect, 120)
    if (!token || !contact) return NextResponse.json({ error: 'Coordonnées requises' }, { status: 400 })

    // Le champ acceptait n'importe quoi : « pasunemail » était enregistré, la page
    // répondait « merci », et l'artisan recevait une demande QU'IL NE POUVAIT PAS
    // RECONTACTER — sans le savoir. Le pire genre de défaut : silencieux des deux côtés.
    const estEmail = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(contact)
    const estTel = (contact.match(/\d/g) ?? []).length >= 9 && /^[\d\s+().-]+$/.test(contact)
    if (!estEmail && !estTel) {
      return NextResponse.json({
        error: 'Indiquez un email valide ou un numéro de téléphone, pour que l’artisan puisse vous répondre.',
      }, { status: 400 })
    }

    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/leads/contact')
      return NextResponse.json({ ok: true })
    }

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, artisan_id, contact, message, statut, photos')
      .eq('token', token)
      .maybeSingle()
    if (!lead) return NextResponse.json({ error: 'Lien expiré.' }, { status: 404 })
    // 15/10 (Benj) : la plateforme commence avec Studio — l'artisan d'une offre sans plateforme ne reçoit plus rien ici, et aucun crédit n'est touché.
    const ferme = await refusSiSansPlateforme(lead.artisan_id)
    if (ferme) return ferme

    // Idempotent : si le contact est déjà là, on ne renvoie pas d'email en double.
    if (lead.contact) return NextResponse.json({ ok: true, already: true })

    await supabaseAdmin.from('leads')
      .update({ contact, nom_prospect, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    // Un devis créé par une règle avant ces coordonnées récupère l'email du client.
    if (contact.includes('@')) {
      await supabaseAdmin.from('devis').update({ client_email: contact }).eq('lead_id', lead.id).is('client_email', null)
    }

    // Prévenir l'artisan (maintenant qu'il y a de quoi recontacter) + programmer les relances.
    try {
      const { data: artisan } = await supabaseAdmin
        .from('artisans').select('email, nom, leads_pause').eq('id', lead.artisan_id).maybeSingle()
      const photoCount = Array.isArray(lead.photos) ? lead.photos.length : 0
      // En pause, rien ne part, notification comprise : la demande attend dans Messages (l'aide le dit).
      if (artisan?.email && artisan.leads_pause !== true) {
        await notifierArtisan(lead.artisan_id, 'nouvelle_demande', artisan.email, {
          leadId: lead.id,
          subject: `Nouveau lead — ${nom_prospect || contact}`,
          text: `Un prospect a laissé ses coordonnées après un premier échange sur votre page.\n\nNom : ${nom_prospect || 'non précisé'}\nContact : ${contact}\nBesoin : ${lead.message || 'non précisé'}${photoCount ? `\nPhotos jointes : ${photoCount}` : ''}\n\nRetrouvez l'échange dans votre espace (Messages).`,
          replyTo: contact.includes('@') ? contact : undefined,
        }).catch(() => {})
      }
      // Accusé de réception au prospect (marque de l'artisan), maintenant qu'on a son email — sauf si l'artisan a mis ses
      // demandes en pause : sa page « n'envoie plus rien automatiquement » (Ma plateforme ; audit des promesses du 12/10).
      if (contact.includes('@') && artisan?.leads_pause !== true) {
        const prenom = (nom_prospect || '').trim().split(/\s+/)[0]
        await sendEmail({
          to: contact,
          fromName: artisan?.nom?.trim() || 'Votre artisan',
          subject: `Bien reçu — ${artisan?.nom || 'votre demande'}`,
          text: `Bonjour${prenom ? ' ' + prenom : ''},\n\nMerci ! ${artisan?.nom || 'Nous'} a bien vos coordonnées et revient vers vous très vite pour la suite.\n\nÀ très bientôt.`,
          anonyme: true,
          transactionnel: true,
          replyTo: artisan?.email ?? undefined,
        }).catch(() => {})
      }
      // Relances J+2/J+5/J+10 seulement si le lead a bien reçu une réponse et n'en a pas déjà.
      if (lead.statut === 'repondu') {
        const { count } = await supabaseAdmin
          .from('relances').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id)
        if ((count ?? 0) === 0) {
          const now = Date.now()
          await supabaseAdmin.from('relances').insert([2, 5, 10].map((j, i) => ({
            lead_id: lead.id, planifiee_le: new Date(now + j * 86400000).toISOString(), rang: i + 1, envoyee: false,
          })))
        }
      }
    } catch (e) {
      console.warn('[leads/contact] notif/relances non bloquant:', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[leads/contact] erreur:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
