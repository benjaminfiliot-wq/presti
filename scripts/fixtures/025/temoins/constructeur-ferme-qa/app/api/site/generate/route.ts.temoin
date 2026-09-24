import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateSiteContent } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { signalerPanneIA } from '@/lib/alerteService'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const maxDuration = 60

// Génère (à la demande) le contenu du site vitrine de l'artisan connecté, puis le stocke.
// Authentifié + décompte d'un crédit (au tier "pro" pour la qualité — génération rare).
export async function POST(req: Request) {
  if (!actif('constructeurSite')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  let aRendre: { uid: string; tier: Parameters<typeof rendreCredit>[1]; fondateur: boolean } | null = null
  try {
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })
    const uid = session.uid

    const { data: a } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, bio, zone_intervention, ville, horaires, services, realisations, plan, is_founder, site_contenu_le')
      .eq('id', uid)
      .maybeSingle()
    if (!a) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const { model, tier } = resolveModel('pro', a.plan)
    // 1re génération OFFERTE (hors crédits) : découple « soigner sa vitrine » de « répondre aux prospects ».
    const first = !a.site_contenu_le
    if (!first) {
      const credit = await consumeCredit(uid, tier, !!a.is_founder)
      if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })
      aRendre = { uid, tier, fondateur: !!a.is_founder }
    }

    const contenu = await generateSiteContent({
      nom: a.nom, metier: a.metier, bio: a.bio, zone: a.zone_intervention, ville: a.ville, horaires: a.horaires,
      services: Array.isArray(a.services) ? a.services : [],
      realisations: Array.isArray(a.realisations) ? a.realisations : [],
    }, model)

    await supabaseAdmin.from('artisans').update({ site_contenu: contenu, site_contenu_le: new Date().toISOString() }).eq('id', uid)
    return NextResponse.json({ ok: true, contenu, free: first })
  } catch (e) {
    console.error('[site/generate]', e)
    await signalerPanneIA('rédaction du site (/api/site/generate)', e)
    if (aRendre) await rendreCredit(aRendre.uid, aRendre.tier, aRendre.fondateur)
    return NextResponse.json({ error: "L'IA n'a pas pu rédiger le contenu. Réessaie dans un instant." }, { status: 500 })
  }
}
