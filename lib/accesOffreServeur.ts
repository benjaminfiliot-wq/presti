// Serveur seulement (clé de service) : la garde des routes d'un écran réservé à une offre (lib/accesOffre.ts).
// Ordre : session valide (authArtisan : révocation, suspension, double authentification) → offre du compte lue en base →
// 403 { code: 'offre' } avec le message de la matrice. L'uid ne vient QUE de la session.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { decisionEcran } from './accesOffre'
import type { Capacite } from './plans'

export type GardeOffre = { uid: string; plan: string | null } | { reponse: NextResponse }

export async function exigerCapacite(req: Request, capacite: Capacite, sujet: string): Promise<GardeOffre> {
  const s = await authArtisan(req)
  if (estEchec(s)) return { reponse: NextResponse.json({ error: s.error, code: s.code }, { status: s.status }) }
  const { data, error } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', s.uid).maybeSingle()
  if (error) { console.error('[offre] lecture de l’offre :', error.message); return { reponse: NextResponse.json({ error: 'Votre offre n’a pas pu être lue. Réessayez dans un instant.' }, { status: 503 }) } }
  // Un fondateur compte comme Business, comme partout ailleurs (app/api/leads).
  const plan = data?.is_founder ? 'business' : ((data?.plan as string | null | undefined) ?? null)
  const d = decisionEcran(plan, capacite, sujet)
  if (!d.ok) return { reponse: NextResponse.json({ error: d.erreur, code: d.code, offre: d.offre }, { status: d.statut, headers: { 'Cache-Control': 'no-store' } }) }
  return { uid: s.uid, plan }
}
