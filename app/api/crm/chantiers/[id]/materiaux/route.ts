import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerReservation } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// POST /api/crm/chantiers/[id]/materiaux { materiau_id, quantite, lieu?, note? } — réserver un matériau de l'inventaire
// pour ce chantier. La réservation ne touche pas au stock ; la sortie (PATCH /api/crm/materiaux/[id] { action: 'sortir' })
// le décrémente par appliquer_mouvement.
export async function POST(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerReservation(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { chantier: c, error: el } = await chantierDe(g.uid, id)
  if (el) { console.error('[crm/materiaux] chantier :', el.message); return erreur(INDISPONIBLE, 503) }
  if (!c) return erreur('Chantier introuvable.', 404)
  if (c.statut === 'termine' || c.statut === 'annule') return erreur('Ce chantier est clos : rouvrez-le pour y réserver du matériel.', 409)
  const { data: m, error: em } = await supabaseAdmin.from('materiaux').select('id').eq('id', v.valeur.materiau_id!).eq('artisan_id', g.uid).maybeSingle()
  if (em) { console.error('[crm/materiaux] matériau :', em.message); return erreur(INDISPONIBLE, 503) }
  if (!m) return erreur('Matériau introuvable dans votre inventaire.', 404)
  const { data, error } = await supabaseAdmin.from('chantier_materiaux')
    .insert({ ...v.valeur, chantier_id: id, artisan_id: g.uid })
    .select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/materiaux] réservation :', error?.message); return erreur(s.message, s.status) }
  return json({ ok: true, id: data.id }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
