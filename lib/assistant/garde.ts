// L'assistant de gestion de la console — la GARDE commune des routes /api/assistant/*. Serveur uniquement.
import { NextResponse } from 'next/server'
import { enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { decisionAcces } from '@/lib/crm/acces'
import { decisionAssistant } from './acces'
import { clientDeSession } from './session'

export type GardeAssistant = {
  uid: string; jeton: string; nom: string | null; metier: string | null; plan: string | null; isFounder: boolean
  /** Le compte a le CRM (même décision que les routes /api/crm/* : drapeau ou essai, puis capacité `crm`). */
  crm: boolean
}

export async function gardeAssistant(req: Request): Promise<GardeAssistant | { reponse: NextResponse }> {
  // 1. Le drapeau d'abord : baissé, la route n'existe pas (404, ni session ni base).
  if (!enEssai('assistant')) return { reponse: NextResponse.json({ error: 'Introuvable' }, { status: 404 }) }
  const s = await authArtisan(req)
  const jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  // 2. Le profil se lit comme l'écran le lit : sous la RLS, avec le jeton de l'artisan.
  const { data: art } = estEchec(s) ? { data: null } : await clientDeSession(jeton).from('artisans').select('nom, metier, plan, is_founder').eq('id', s.uid).maybeSingle()
  const uid = estEchec(s) ? '' : s.uid
  const d = decisionAssistant({
    drapeau: true,
    session: estEchec(s) ? { ok: false, statut: s.status, erreur: s.error, ...(s.code ? { code: s.code } : {}) } : { ok: true },
    ouvertPourCeCompte: !estEchec(s) && ouvertPour('assistant', uid),
    plan: (art?.plan as string | null | undefined) ?? null,
  })
  if (!d.ok) return { reponse: NextResponse.json({ error: d.erreur ?? 'Introuvable', ...(d.code ? { code: d.code } : {}) }, { status: d.statut }) }
  if (!art) return { reponse: NextResponse.json({ error: 'Profil introuvable' }, { status: 404 }) }
  const crm = decisionAcces({ drapeau: ouvertPour('crm', uid), session: { ok: true }, plan: art.plan as string | null }).ok
  return { uid, jeton, nom: (art.nom as string | null) ?? null, metier: (art.metier as string | null) ?? null, plan: (art.plan as string | null) ?? null, isFounder: !!art.is_founder, crm }
}
