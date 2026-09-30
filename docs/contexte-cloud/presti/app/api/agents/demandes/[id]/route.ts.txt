import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { majDemande, estUuid, BRANCHE, COMPTE_RENDU_MAX, STATUTS, type StatutDemande } from '@/lib/agents/demandes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Le moteur met à jour une demande (0117) : PATCH /api/agents/demandes/<id> { statut, branche?, compte_rendu? }. Le sens du
// statut (recue → en_cours → faite | echec) et le format de la branche (demandes/dem-<id8>, jamais main) sont aussi imposés
// par la base. Derrière busAgents ET demandesEcosysteme, le jeton d'un agent et la table « demandes » dans sa portée.
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('busAgents') || !actif('demandesEcosysteme')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur(400, 'parametres_invalides')
  if (Number(req.headers.get('content-length')) > 8 * 1024) return erreur(413, 'corps_trop_grand')
  let corps: Record<string, unknown>
  try {
    const brut = await req.text()
    if (new TextEncoder().encode(brut).length > 8 * 1024) return erreur(413, 'corps_trop_grand')
    corps = JSON.parse(brut)
  } catch { return erreur(400, 'json_invalide') }
  const { statut, branche, compte_rendu } = (corps && typeof corps === 'object' && !Array.isArray(corps) ? corps : {}) as Record<string, unknown>
  if (typeof statut !== 'string' || !(STATUTS as readonly string[]).includes(statut) ||
    (branche !== undefined && branche !== null && (typeof branche !== 'string' || !BRANCHE.test(branche))) ||
    (compte_rendu !== undefined && compte_rendu !== null && (typeof compte_rendu !== 'string' || compte_rendu.trim().length > COMPTE_RENDU_MAX))) return erreur(400, 'corps_invalide')
  const table = await exigerTable(agent, 'demandes')
  if (table) return reponseRefusAgent(table)
  const r = await majDemande(id, statut as StatutDemande, (branche as string | null | undefined) ?? null, (compte_rendu as string | null | undefined) ?? null)
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json({ id, statut: r.data })
}
