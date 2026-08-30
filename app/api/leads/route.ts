import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateLeadReply } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit } from '@/lib/credits'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

// Bornes anti-abus (une demande légitime tient largement dedans).
const MAX = { slug: 80, contact: 200, nom: 120, message: 5000 }
const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, n) : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const slug = clip(body?.slug, MAX.slug)
    const contact = clip(body?.contact, MAX.contact)
    const nom_prospect = clip(body?.nom_prospect, MAX.nom)
    const message = clip(body?.message, MAX.message)

    // Validation stricte des entrées (slug attendu : minuscules/chiffres/tirets)
    if (!slug || !contact) {
      return NextResponse.json({ error: 'Slug et contact requis' }, { status: 400 })
    }
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }

    const ip = getIp(req)

    // Anti-hacker : IP bannie (manuelle ou auto) → on refuse tout, immédiatement.
    if (await isBanned(ip)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // Honeypot anti-bot : champ caché qui doit rester vide. Rempli = bot → abus + drop silencieux.
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/leads')
      return NextResponse.json({ ok: true })
    }

    // Rate-limit PAR IP (anti-flood + anti-relais email anonyme) : au-delà de 6 demandes
    // par IP sur 10 min, on refuse tout — et on journalise l'abus (peut déclencher un auto-ban).
    if (ip !== 'unknown') {
      try {
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { count } = await supabaseAdmin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('ip', ip)
          .gte('created_at', since)
        if ((count ?? 0) >= 6) {
          await recordAbuse(ip, 'flood /api/leads')
          return NextResponse.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 })
        }
      } catch { /* en cas de doute sur le comptage : on ne bloque pas un vrai prospect */ }
    }

    // 1) Retrouver l'artisan à partir de son slug
    const { data: artisan, error: aErr } = await supabaseAdmin
      .from('artisans')
      .select('id, nom, metier, ton_style, email, is_founder')
      .eq('slug', slug)
      .maybeSingle()

    if (aErr) {
      console.error('[leads] lookup artisan:', aErr.message)
      return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
    }
    if (!artisan) return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })

    // 2) Enregistrer le lead (chemin critique : on ne le perd jamais)
    const { data: lead, error: lErr } = await supabaseAdmin
      .from('leads')
      .insert({
        artisan_id: artisan.id,
        nom_prospect,
        contact,
        message,
        canal: 'formulaire',
        statut: 'nouveau',
        ip: ip === 'unknown' ? null : ip,
      })
      .select('id')
      .single()

    if (lErr) {
      console.error('[leads] insert lead:', lErr.message)
      return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
    }

    // 2bis) Anti-abus (I2) : on plafonne l'IA+email par artisan sur une fenêtre courte.
    // Au-delà, le lead est TOUJOURS sauvé (visible dashboard) mais on coupe le coûteux
    // (empêche l'amplification de coûts IA et le relais d'emails). Ne bloque jamais un vrai lead.
    let throttled = false
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('artisan_id', artisan.id)
        .gte('created_at', since)
      throttled = (count ?? 0) > 8
    } catch {
      // en cas de doute sur le comptage, on ne throttle pas (priorité : ne rien perdre)
    }
    if (throttled) {
      console.warn('[leads] throttle IA/email pour artisan', artisan.id)
      return NextResponse.json({ ok: true, leadId: lead.id })
    }

    // Décompte d'un crédit pour la réponse auto. Si épuisé : le lead est TOUJOURS
    // sauvé (visible dans le dashboard), on coupe seulement la génération IA.
    const credit = await consumeCredit(artisan.id, 'standard', !!artisan.is_founder)
    if (!credit.ok) {
      console.warn('[leads] crédits épuisés pour artisan', artisan.id, '— réponse auto coupée, lead conservé')
      return NextResponse.json({ ok: true, leadId: lead.id })
    }

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
    console.error('[leads] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
