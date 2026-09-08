import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp } from '@/lib/security'

export const runtime = 'nodejs'

// Événement anonyme d'entonnoir de la plateforme (A/B formulaire, M8) : view / lead / contact.
// Aucune PII. Écrit par le serveur (service_role). Cap souple par IP pour éviter le bruit.
const EVENTS = new Set(['view', 'lead', 'contact'])
const VARIANTS = new Set(['A', 'B'])

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const slug = typeof body?.slug === 'string' ? body.slug.trim().slice(0, 80) : ''
    const event = typeof body?.event === 'string' ? body.event.trim() : ''
    const variant = typeof body?.variant === 'string' && VARIANTS.has(body.variant) ? body.variant : null
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || !EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    // Plafond souple, PAR SLUG et non par IP : 400 événements sur dix minutes pour une même page.
    // Le commentaire disait « 40 par IP » ; le code n'a jamais filtré sur l'IP, qui ne sert ici qu'à
    // écarter les requêtes sans adresse. Un plafond par slug protège la STATISTIQUE de la page
    // (c'est ce qu'on veut : qu'un chiffre affiché à l'artisan reste crédible), pas contre une
    // personne seule — et il ne faut pas croire le contraire en lisant cette ligne.
    const ip = getIp(req)
    if (ip !== 'unknown') {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('plat_events').select('id', { count: 'exact', head: true })
        .eq('slug', slug).gte('created_at', since)
      if ((count ?? 0) > 400) return NextResponse.json({ ok: true }) // seuil global par slug : on ignore silencieusement
    }
    await supabaseAdmin.from('plat_events').insert({ slug, event, variant })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // l'instrumentation ne doit jamais casser la page
  }
}
