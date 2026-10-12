import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerMembre } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/equipe/[id]
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Membre introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerMembre(corps.valeur, false)
  if (!v.ok) return erreur(v.erreur, 400)
  const { data, error } = await supabaseAdmin.from('equipe_membres').update({ ...v.valeur, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/membre] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Membre introuvable.', 404)
  return json({ ok: true })
}

// DELETE /api/crm/equipe/[id] — le membre quitte aussi les équipes de chantier ; ses tâches et sa camionnette restent,
// sans personne affectée.
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Membre introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('equipe_membres').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/membre] suppression :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Membre introuvable.', 404)
  return json({ ok: true })
}
