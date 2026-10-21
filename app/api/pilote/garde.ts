// PILOTE AUTOMATIQUE — la garde commune des routes /api/pilote/* (21/10).
// Drapeau baissé : 404 avant toute lecture. Puis la session (révocation, suspension, double authentification). Puis l'offre lue en
// base : `signature` dit si le compte a la capacité `assistant.pilote` (Signature, Business, fondateur). Puis les tables (0174) : 503.
//
// Audit offensif du 21/10 (F1) : un compte RÉTROGRADÉ hors Signature doit encore pouvoir VOIR sa file et l'ANNULER (et couper le
// pilote) — `exigerSignature: false` pour ces chemins ; seuls l'activation et l'ajout de types exigent l'offre.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan } from '@/lib/authArtisan'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { peut, messageVerrou } from '@/lib/plans'
import { piloteDisponible } from '@/lib/pilote/serveur'

export async function gardePilote(req: Request, o: { exigerSignature?: boolean } = {}): Promise<{ uid: string; signature: boolean } | { reponse: Response }> {
  if (!actif('piloteAutomatique')) return { reponse: NextResponse.json({ error: 'introuvable' }, { status: 404 }) }
  const s = await authArtisan(req)
  if ('error' in s) return { reponse: NextResponse.json({ error: s.error, code: s.code }, { status: s.status }) }
  const { data, error } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', s.uid).maybeSingle()
  if (error) return { reponse: NextResponse.json({ error: 'Votre offre n’a pas pu être lue. Réessayez dans un instant.' }, { status: 503 }) }
  const plan = data?.is_founder ? 'business' : ((data?.plan as string | null | undefined) ?? null)
  const signature = peut(plan, 'assistant.pilote')
  if (o.exigerSignature !== false && !signature) return { reponse: NextResponse.json({ error: messageVerrou('assistant.pilote'), code: 'offre' }, { status: 403, headers: { 'Cache-Control': 'no-store' } }) }
  if (!(await piloteDisponible())) return { reponse: NextResponse.json({ error: 'Le pilote automatique est indisponible pour l’instant.' }, { status: 503 }) }
  return { uid: s.uid, signature }
}
