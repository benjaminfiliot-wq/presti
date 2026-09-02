import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { COOKIE_SESSION, cookieOptions, consommerLien, creerLienMagique, revoquerSession, sessionCourante } from '@/lib/clientAuth'

// Connexion des CLIENTS de la plateforme par lien magique (v4 §6/§D2).
// Sécurité (§D4) : réponse IDENTIQUE que le compte existe ou non (aucune énumération
// d'emails), rate-limit par IP et par email, cookie httpOnly, révocation serveur réelle.

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const SLUG_RE = /^[a-z0-9-]{1,80}$/

export async function GET() {
  const s = await sessionCourante()
  return NextResponse.json({ connecte: !!s, client: s ? { email: s.email, nom: s.nom } : null })
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    const body = await req.json().catch(() => null)
    const action = body?.action

    // ── Déconnexion : on révoque la session EN BASE, pas seulement le cookie.
    if (action === 'deconnexion') {
      await revoquerSession()
      const res = NextResponse.json({ ok: true })
      res.cookies.set(COOKIE_SESSION, '', { ...cookieOptions(0) })
      return res
    }

    // ── Demande de lien magique
    if (action === 'demande') {
      const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
      if (!SLUG_RE.test(slug) || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
      if (typeof body?.website === 'string' && body.website.trim()) {
        await recordAbuse(ip, 'honeypot /api/p/auth')
        return NextResponse.json({ ok: true }) // réponse uniforme
      }

      // Rate-limit : par IP et par email (anti-bombardement de boîtes aux lettres).
      const depuis = new Date(Date.now() - 15 * 60000).toISOString()
      if (ip !== 'unknown') {
        const { count } = await supabaseAdmin.from('clients_liens').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('cree_le', depuis)
        if ((count ?? 0) >= 5) { await recordAbuse(ip, 'flood liens magiques'); return NextResponse.json({ ok: true }) }
      }
      const { count: parEmail } = await supabaseAdmin.from('clients_liens').select('id', { count: 'exact', head: true }).eq('email', email).gte('cree_le', depuis)
      if ((parEmail ?? 0) >= 3) return NextResponse.json({ ok: true }) // silencieux : pas d'info donnée

      const { data: artisan } = await supabaseAdmin
        .from('artisans').select('id, nom, slug, plateforme_active').eq('slug', slug).maybeSingle()
      // Réponse IDENTIQUE même si l'artisan n'existe pas → aucune énumération possible.
      if (artisan && artisan.plateforme_active !== false) {
        const jeton = await creerLienMagique(artisan.id, email, ip)
        const lien = `https://prestiapp.fr/p/${artisan.slug}?connexion=${encodeURIComponent(jeton)}`
        await sendEmail({
          to: email,
          fromName: artisan.nom || undefined, // white-label : le client voit la marque de l'artisan
          subject: `Votre lien de connexion — ${artisan.nom || 'votre espace'}`,
          text: `Bonjour,\n\nVoici votre lien pour accéder à votre espace :\n${lien}\n\nCe lien est valable 20 minutes et ne fonctionne qu'une fois.\nSi vous n'avez rien demandé, ignorez ce message.`,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true })
    }

    // ── Vérification du lien → ouverture de session
    if (action === 'verifier') {
      const jeton = typeof body?.token === 'string' ? body.token : ''
      if (!jeton) return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })
      const r = await consommerLien(jeton, ip, req.headers.get('user-agent') || undefined)
      if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: 400 })
      const res = NextResponse.json({ ok: true, client: { email: r.client.email, nom: r.client.nom } })
      res.cookies.set(COOKIE_SESSION, r.session, cookieOptions())
      return res
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e) {
    console.error('[p/auth] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
