import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerModificationRappel } from '@/lib/crm/valider'

export const runtime = 'nodejs'
const MANQUE_0162 = 'Les rappels ne sont pas encore installés sur cette base (migration 0162).'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/rappels/[id] { fait?, echeance?, heure?, texte?, type? } — cocher (fait), décaler, corriger. La cible ne change pas.
// DELETE /api/crm/rappels/[id] — supprimer. Chaque écriture porte l'artisan de la session : le rappel d'un autre compte n'existe pas.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Rappel introuvable.', 404)
  const corps = await lireCorps(req, 4_096)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationRappel(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { fait, ...champs } = v.valeur
  const maj: Record<string, unknown> = { ...champs }
  if (fait !== undefined) maj.fait_le = fait ? new Date().toISOString() : null
  const { data, error } = await supabaseAdmin.from('crm_rappels').update(maj).eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/rappels] modification :', error.message); return erreur(s.status === 503 ? MANQUE_0162 : s.message, s.status) }
  if (!data?.length) return erreur('Rappel introuvable.', 404)
  return json({ ok: true })
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Rappel introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('crm_rappels').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/rappels] suppression :', error.message); return erreur(s.status === 503 ? MANQUE_0162 : s.message, s.status) }
  if (!data?.length) return erreur('Rappel introuvable.', 404)
  return json({ ok: true })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
