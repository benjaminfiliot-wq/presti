import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerModificationTache } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/taches/[id] — cocher / décocher (journalisé par déclencheur), renommer, réordonner, affecter.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Tâche introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationTache(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  if (v.valeur.membre_id) {
    const { data: m, error } = await supabaseAdmin.from('equipe_membres').select('id').eq('id', v.valeur.membre_id).eq('artisan_id', g.uid).maybeSingle()
    if (error) return erreur(INDISPONIBLE, 503)
    if (!m) return erreur('Membre de l’équipe introuvable.', 404)
  }
  const patch: Record<string, unknown> = { ...v.valeur, maj_le: new Date().toISOString() }
  if ('faite' in v.valeur) patch.faite_le = v.valeur.faite ? new Date().toISOString() : null
  const { data, error } = await supabaseAdmin.from('chantier_taches').update(patch).eq('id', id).eq('artisan_id', g.uid).select('id, faite')
  if (error) { const s = statutErreurBase(error); console.error('[crm/tache] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Tâche introuvable.', 404)
  return json({ ok: true, faite: data[0].faite })
}

// DELETE /api/crm/taches/[id]
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Tâche introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('chantier_taches').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/tache] suppression :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Tâche introuvable.', 404)
  return json({ ok: true })
}
