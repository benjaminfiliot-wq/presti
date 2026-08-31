import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateSiteContent } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'

export const runtime = 'nodejs'
export const maxDuration = 60

// Génère (à la demande) le contenu du site vitrine de l'artisan connecté, puis le stocke.
// Authentifié + décompte d'un crédit (au tier "pro" pour la qualité — génération rare).
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    const uid = userData.user.id

    const { data: a } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, bio, zone_intervention, ville, horaires, services, realisations, plan, is_founder')
      .eq('id', uid)
      .maybeSingle()
    if (!a) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const { model, tier } = resolveModel('pro', a.plan)
    const credit = await consumeCredit(uid, tier, !!a.is_founder)
    if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })

    const contenu = await generateSiteContent({
      nom: a.nom, metier: a.metier, bio: a.bio, zone: a.zone_intervention, ville: a.ville, horaires: a.horaires,
      services: Array.isArray(a.services) ? a.services : [],
      realisations: Array.isArray(a.realisations) ? a.realisations : [],
    }, model)

    await supabaseAdmin.from('artisans').update({ site_contenu: contenu, site_contenu_le: new Date().toISOString() }).eq('id', uid)
    return NextResponse.json({ ok: true, contenu })
  } catch (e) {
    console.error('[site/generate]', e)
    return NextResponse.json({ error: "L'IA n'a pas pu rédiger le contenu. Réessaie dans un instant." }, { status: 500 })
  }
}
