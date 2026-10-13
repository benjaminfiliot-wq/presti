import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerVehicule } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/vehicules/[id]
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Véhicule introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerVehicule(corps.valeur, false)
  if (!v.ok) return erreur(v.erreur, 400)
  if (v.valeur.conducteur_id) {
    const { data: m } = await supabaseAdmin.from('equipe_membres').select('id').eq('id', v.valeur.conducteur_id).eq('artisan_id', g.uid).maybeSingle()
    if (!m) return erreur('Conducteur introuvable dans votre équipe.', 404)
  }
  const { data, error } = await supabaseAdmin.from('vehicules').update({ ...v.valeur, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/vehicule] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Véhicule introuvable.', 404)
  return json({ ok: true })
}

// DELETE /api/crm/vehicules/[id] — les chantiers qui l'utilisaient le perdent (vehicule_id remis à vide), rien d'autre.
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Véhicule introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('vehicules').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/vehicule] suppression :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Véhicule introuvable.', 404)
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
