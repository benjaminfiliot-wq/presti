// app/api/usine/porteur/oppositions/route.ts — l'export de nuit du porteur du formulaire (fiche 026-095).
//
// GET  → { oppositions: [{ cle_type, cle_valeur, expire_le, cree_le }] } : les lignes d'opposition, actives et expirées, rien
//        d'autre, 50 000 au plus. L'usine les recopie chaque nuit : un STOP ne se perd jamais, même si la base gratuite
//        n'a pas de sauvegarde.
// POST { envois: uuid[] } (500 au plus, sinon 400) → { garder: uuid[] } : parmi ces dossiers de preuves, ceux que la base
//        garde (l'envoi existe, son prospect n'est pas effacé, son dernier contact date de moins de 3 ans). L'usine efface
//        les autres. Aucune écriture.
//
// Même garde que `travail` : jeton de l'agent `facteur_usine`, drapeau `busAgents`.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AGENT = 'facteur_usine'
const LIGNES_MAX = 50_000
const IDS_MAX = 500
const CORPS_MAX = 64 * 1024
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })

async function garde(req: Request): Promise<NextResponse | null> {
  if (actif('busAgents') === false) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  return null
}

export async function GET(req: Request) {
  const refus = await garde(req)
  if (refus) return refus
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_oppositions_porteur', {})
    if (error || !Array.isArray(data)) return erreur(503, 'base_injoignable')
    const oppositions = data.slice(0, LIGNES_MAX).flatMap((l: unknown) => {
      if (!l || typeof l !== 'object') return []
      const o = l as Record<string, unknown>
      if (typeof o.cle_type !== 'string' || typeof o.cle_valeur !== 'string') return []
      return [{ cle_type: o.cle_type, cle_valeur: o.cle_valeur, expire_le: typeof o.expire_le === 'string' ? o.expire_le : null, cree_le: typeof o.cree_le === 'string' ? o.cree_le : null }]
    })
    return NextResponse.json({ oppositions }, { headers: entetes })
  } catch { return erreur(503, 'base_injoignable') }
}

export async function POST(req: Request) {
  const refus = await garde(req)
  if (refus) return refus
  let brut: string
  try { brut = await req.text() } catch { return erreur(400, 'corps_invalide') }
  if (new TextEncoder().encode(brut).length > CORPS_MAX) return erreur(413, 'corps_trop_gros')
  let corps: unknown
  try { corps = JSON.parse(brut) } catch { return erreur(400, 'corps_invalide') }
  const ids = corps && typeof corps === 'object' && !Array.isArray(corps) ? (corps as { envois?: unknown }).envois : null
  if (!Array.isArray(ids) || ids.length > IDS_MAX || !ids.every((i): i is string => typeof i === 'string' && UUID.test(i))) return erreur(400, 'corps_invalide')
  if (ids.length === 0) return NextResponse.json({ garder: [] }, { headers: entetes })
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_preuves_a_garder', { p_envois: ids })
    if (error || !Array.isArray(data)) return erreur(503, 'base_injoignable')
    const garder = data.filter((i: unknown): i is string => typeof i === 'string' && UUID.test(i))
    return NextResponse.json({ garder }, { headers: entetes })
  } catch { return erreur(503, 'base_injoignable') }
}
