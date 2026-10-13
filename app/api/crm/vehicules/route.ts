import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { lireCorps, validerVehicule } from '@/lib/crm/valider'

export const runtime = 'nodejs'
const COLONNES_VEHICULE = 'id, nom, immatriculation, conducteur_id, controle_technique_le, entretien_le, notes, actif, cree_le'

// GET /api/crm/vehicules — les véhicules de la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('vehicules').select(COLONNES_VEHICULE).eq('artisan_id', g.uid).order('nom').limit(200)
  if (error) { const s = statutErreurBase(error); console.error('[crm/vehicules] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  return json({ vehicules: data ?? [] })
}

// POST /api/crm/vehicules { nom, immatriculation?, conducteur_id?, controle_technique_le?, entretien_le?, notes? }
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerVehicule(corps.valeur, true)
  if (!v.ok) return erreur(v.erreur, 400)
  if (v.valeur.conducteur_id) {
    const { data: m } = await supabaseAdmin.from('equipe_membres').select('id').eq('id', v.valeur.conducteur_id).eq('artisan_id', g.uid).maybeSingle()
    if (!m) return erreur('Conducteur introuvable dans votre équipe.', 404)
  }
  const { data, error } = await supabaseAdmin.from('vehicules').insert({ ...v.valeur, artisan_id: g.uid }).select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/vehicules] création :', error?.message); return erreur(s.message, s.status) }
  return json({ ok: true, id: data.id }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
