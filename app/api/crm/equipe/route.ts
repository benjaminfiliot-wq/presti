import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { lireCorps, validerMembre } from '@/lib/crm/valider'

export const runtime = 'nodejs'

// GET /api/crm/equipe — les membres de l'équipe de la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('equipe_membres').select('id, nom, role, telephone, actif, cree_le').eq('artisan_id', g.uid).order('nom').limit(200)
  if (error) { const s = statutErreurBase(error); console.error('[crm/equipe] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  return json({ membres: data ?? [] })
}

// POST /api/crm/equipe { nom, role?, telephone? } — minimisation : ni adresse, ni date de naissance, ni salaire.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerMembre(corps.valeur, true)
  if (!v.ok) return erreur(v.erreur, 400)
  const { data, error } = await supabaseAdmin.from('equipe_membres').insert({ ...v.valeur, artisan_id: g.uid }).select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/equipe] création :', error?.message); return erreur(s.message, s.status) }
  return json({ ok: true, id: data.id }, 201)
}
