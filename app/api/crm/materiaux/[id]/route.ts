import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerModificationReservation } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/crm/materiaux/[id]
//   { action: 'sortir' }            → sortie du stock par crm_sortir_materiau (0141) : verrou, appliquer_mouvement (0040,
//                                     type « sortie », rattaché au devis du chantier), réservation « sorti », journal.
//                                     Tout ou rien, une seule fois.
//   { quantite?, lieu?, note? }     → modifier une réservation pas encore sortie.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Réservation introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationReservation(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)

  const { data: r, error: el } = await supabaseAdmin.from('chantier_materiaux').select('id, statut').eq('id', id).eq('artisan_id', g.uid).maybeSingle()
  if (el) { console.error('[crm/materiau] lecture :', el.message); return erreur(INDISPONIBLE, 503) }
  if (!r) return erreur('Réservation introuvable.', 404)
  if (r.statut !== 'reserve') return erreur('Cette réservation est déjà sortie ou annulée.', 409)

  if ('action' in v.valeur) {
    const { data, error } = await supabaseAdmin.rpc('crm_sortir_materiau', { p_artisan: g.uid, p_reservation: id })
    if (error) {
      console.error('[crm/materiau] sortie :', error.message)
      if (/deja traitee/.test(error.message)) return erreur('Cette réservation est déjà sortie.', 409)
      const manque = /stock insuffisant \(reste ([^)]*)\)/.exec(error.message)
      if (manque) return erreur(`Il n’en reste que ${manque[1]} à cet endroit : enregistrez la livraison dans l’Inventaire avant de sortir ce matériau. Rien n’a été décompté.`, 409)
      if (/introuvable/i.test(error.message)) return erreur('Réservation introuvable.', 404)
      return erreur('La sortie de stock a échoué : rien n’a été décompté.', 500)
    }
    return json({ ok: true, reste: Number(data) })
  }
  const { error } = await supabaseAdmin.from('chantier_materiaux').update({ ...v.valeur, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid).eq('statut', 'reserve')
  if (error) { const s = statutErreurBase(error); console.error('[crm/materiau] modification :', error.message); return erreur(s.message, s.status) }
  return json({ ok: true })
}

// DELETE /api/crm/materiaux/[id] — annuler une réservation pas encore sortie (une sortie, elle, ne s'annule pas ici :
// le stock se corrige depuis l'Inventaire, par un mouvement tracé).
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Réservation introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('chantier_materiaux').delete().eq('id', id).eq('artisan_id', g.uid).eq('statut', 'reserve').select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/materiau] annulation :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Réservation introuvable ou déjà sortie.', 404)
  return json({ ok: true })
}
