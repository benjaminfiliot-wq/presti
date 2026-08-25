import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDevis } from '@/lib/ai'
import { resolveModel } from '@/lib/models'

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
      .select('nom, metier, plan')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (!artisan) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const body = await req.json()
    const description = body?.description
    const { model, tier, downgraded } = resolveModel(body?.model, artisan.plan)
    if (!description || !String(description).trim()) {
      return NextResponse.json({ error: 'Décris le chantier.' }, { status: 400 })
    }

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

    const result = await generateDevis({ nom: artisan.nom, metier: artisan.metier }, String(description), postes, model)
    return NextResponse.json({ ok: true, ...result, tier, downgraded })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: "L'IA n'a pas pu générer le devis. Réessaie ou reformule la description. (" + msg + ')' },
      { status: 500 },
    )
  }
}
