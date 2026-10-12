import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerModificationNote } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/notes/[id] { texte }
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Note introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationNote(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { data, error } = await supabaseAdmin.from('crm_notes').update({ texte: v.valeur.texte, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/note] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Note introuvable.', 404)
  return json({ ok: true })
}

// DELETE /api/crm/notes/[id]
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Note introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('crm_notes').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/note] suppression :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Note introuvable.', 404)
  return json({ ok: true })
}
