import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateLeadReply } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'
import { getUserRevocable } from '@/lib/authArtisan'

// Modèle Expert (opus) possible → au-delà du timeout Vercel par défaut (10 s).
export const runtime = 'nodejs'
export const maxDuration = 60

// Générateur de réponse à la demande : l'artisan connecté colle la demande
// d'un client, Presti rédige la réponse dans son ton.
export async function POST(req: Request) {
  try {
    // Auth : on vérifie le jeton Supabase de l'artisan connecté (anti-abus + bon profil)
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: userData, error: uErr } = await getUserRevocable(token)
    if (uErr || !userData?.user) {
      return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    }

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, ton_style, plan, is_founder')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (!artisan) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const body = await req.json()
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    const nomClient = typeof body?.nomClient === 'string' ? body.nomClient.trim().slice(0, 160) : null
    const { model, tier, downgraded } = resolveModel(body?.model, artisan.plan)
    if (!message) {
      return NextResponse.json({ error: 'Décris la demande de ton client.' }, { status: 400 })
    }

    const credit = await consumeCredit(userData.user.id, tier, !!artisan.is_founder)
    if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })

    const reply = await generateLeadReply(
      { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style },
      { nom_prospect: nomClient, message },
      model,
    )

    return NextResponse.json({ ok: true, reply, tier, downgraded })
  } catch (e) {
    console.error('[tools/reponse] IA:', e)
    return NextResponse.json({ error: "La génération a échoué. Réessaie." }, { status: 500 })
  }
}
