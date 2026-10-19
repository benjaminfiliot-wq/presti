import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { estObjet, estUuid, lireCorps } from '@/lib/crm/valider'
import { validerChampsPiece } from '@/lib/crm/pieces'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }
const BUCKET = 'chantier-pieces'

// PATCH  /api/crm/pieces/[id] { type?, legende?, pris_le? } — corriger l'étiquette, la légende ou la date d'une pièce.
// DELETE /api/crm/pieces/[id] — retire le FICHIER du bucket, puis la ligne (sa place est libérée du quota). Pour la session seulement.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Pièce introuvable.', 404)
  const corps = await lireCorps(req, 2_048)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const v = validerChampsPiece(corps.valeur, new Date(), false)
  if (!v.ok) return erreur(v.erreur, 400)
  const { data, error } = await supabaseAdmin.from('chantier_pieces').update(v.valeur).eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/pieces] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Pièce introuvable.', 404)
  return json({ ok: true })
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Pièce introuvable.', 404)
  const { data: p, error: el } = await supabaseAdmin.from('chantier_pieces').select('id, chemin').eq('id', id).eq('artisan_id', g.uid).maybeSingle()
  if (el) return erreur(INDISPONIBLE, 503)
  if (!p) return erreur('Pièce introuvable.', 404)
  // Le fichier d'abord : une ligne sans fichier se voit (« fichier manquant ») et se supprime ; un fichier sans ligne serait invisible.
  const r = await supabaseAdmin.storage.from(BUCKET).remove([p.chemin])
  if (r.error) { console.error('[crm/pieces] retrait du fichier :', r.error.message); return erreur('Le fichier n’a pas pu être retiré. Réessayez dans un instant.', 503) }
  const { error } = await supabaseAdmin.from('chantier_pieces').delete().eq('id', id).eq('artisan_id', g.uid)
  if (error) { const s = statutErreurBase(error); console.error('[crm/pieces] suppression :', error.message); return erreur(s.message, s.status) }
  return json({ ok: true })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH, DELETE')
}
