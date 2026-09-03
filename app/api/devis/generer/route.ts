import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDevis } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'
import { catalogueDe } from '@/lib/prix'
import { getUserRevocable } from '@/lib/authArtisan'

// Le modèle Expert (opus) peut mettre ~30 s : on dépasse le timeout Vercel par défaut (10 s).
export const runtime = 'nodejs'
export const maxDuration = 60

// Génère les lignes d'un devis à partir d'une description de chantier.
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: userData, error: uErr } = await getUserRevocable(token)
    if (uErr || !userData?.user) {
      return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    }

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, plan, is_founder')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (!artisan) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const body = await req.json()
    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 4000) : ''
    const { model, tier, downgraded } = resolveModel(body?.model, artisan.plan)
    if (!description) {
      return NextResponse.json({ error: 'Décris le chantier.' }, { status: 400 })
    }

    const credit = await consumeCredit(userData.user.id, tier, !!artisan.is_founder)
    if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })

    // Catalogue de prix (v4 §8) : les tarifs de l'artisan d'abord, les ordres de grandeur
    // du marché seulement pour ce qu'il n'a pas. Chaque poste porte sa source et sa date.
    let postes: Awaited<ReturnType<typeof catalogueDe>>['postes'] = []
    try {
      postes = (await catalogueDe(userData.user.id, artisan.metier)).postes
    } catch {
      // pas de catalogue → on chiffre quand même, tout sera marqué « estimation »
    }

    const result = await generateDevis({ nom: artisan.nom, metier: artisan.metier }, description, postes, model)
    return NextResponse.json({ ok: true, ...result, tier, downgraded })
  } catch (e) {
    console.error('[devis/generer] IA:', e)
    return NextResponse.json(
      { error: "L'IA n'a pas pu générer le devis. Réessaie ou reformule la description." },
      { status: 500 },
    )
  }
}
