import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDevis } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'

// Génère les lignes d'un devis à partir d'une description de chantier.
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
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

    // Bibliothèque de postes du métier (optionnelle — peut ne pas exister encore)
    let postes: { designation: string; unite: string; prix_ht_min: number; prix_ht_max: number; tva_defaut: number }[] = []
    try {
      const { data } = await supabaseAdmin
        .from('postes_types')
        .select('designation, unite, prix_ht_min, prix_ht_max, tva_defaut')
        .eq('metier', artisan.metier ?? '')
      if (data) postes = data as typeof postes
    } catch {
      // table pas encore créée → on génère sans bibliothèque
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
