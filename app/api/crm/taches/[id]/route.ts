import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, lireReglages, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { champsValidation, peutValider } from '@/lib/crm/carte'
import { jourParis } from '@/lib/comptaTableau'
import { estUuid, lireCorps, validerModificationTache } from '@/lib/crm/valider'
import { actif } from '@/lib/flags'

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
  // La pièce (0166) n'existe pour l'API que drapeau crmPlan levé.
  if ('piece' in v.valeur && !actif('crmPlan')) return erreur('Champ inconnu : piece.', 400)
  if (v.valeur.membre_id) {
    const { data: m, error } = await supabaseAdmin.from('equipe_membres').select('id').eq('id', v.valeur.membre_id).eq('artisan_id', g.uid).maybeSingle()
    if (error) return erreur(INDISPONIBLE, 503)
    if (!m) return erreur('Membre de l’équipe introuvable.', 404)
  }
  const patch: Record<string, unknown> = { ...v.valeur, maj_le: new Date().toISOString() }
  if ('faite' in v.valeur) patch.faite_le = v.valeur.faite ? new Date().toISOString() : null
  const { data, error } = await supabaseAdmin.from('chantier_taches').update(patch).eq('id', id).eq('artisan_id', g.uid).select('id, faite, chantier_id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/tache] modification :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Tâche introuvable.', 404)
  // Lot 5 (drapeau crmAtelierVivant, 0172) : réglage « valider automatiquement » posé, et c'était la DERNIÈRE tâche à faire → le
  // chantier est validé (terminé, fin réelle, retiré de la carte). Une panne ici ne défait pas la tâche cochée : elle est dite.
  let chantierValide = false
  if (data[0].faite && actif('crmAtelierVivant')) chantierValide = await validerSiFini(g.uid, data[0].chantier_id as string)
  return json({ ok: true, faite: data[0].faite, ...(chantierValide ? { chantierValide: true } : {}) })
}

/** La validation automatique : seulement si le réglage est posé, que toutes les tâches du chantier sont faites, et qu'il est sur la carte. */
async function validerSiFini(uid: string, chantierId: string): Promise<boolean> {
  const reglages = await lireReglages(uid)
  if (!reglages.validationAuto) return false
  const [{ data: taches, error: et }, { data: c, error: ec }] = await Promise.all([
    supabaseAdmin.from('chantier_taches').select('faite').eq('chantier_id', chantierId).eq('artisan_id', uid),
    supabaseAdmin.from('chantiers').select('id, statut, date_fin_reelle, retire_carte_le').eq('id', chantierId).eq('artisan_id', uid).maybeSingle(),
  ])
  if (et || ec || !c) { if (et || ec) console.error('[crm/tache] validation automatique (lecture) :', (et ?? ec)?.message); return false }
  // Déjà terminé (par exemple remis sur la carte par l'artisan) : la validation automatique ne le retire pas de nouveau (audit du 20/10, F2).
  if (c.statut === 'termine') return false
  const t = { total: (taches ?? []).length, faites: (taches ?? []).filter((x) => x.faite).length }
  if (t.total === 0 || t.faites < t.total || !peutValider({ statut: c.statut as string, taches: t, retire_carte_le: c.retire_carte_le as string | null })) return false
  const maintenant = new Date()
  const { error } = await supabaseAdmin.from('chantiers').update({ ...champsValidation({ date_fin_reelle: c.date_fin_reelle as string | null }, jourParis(maintenant), maintenant), maj_le: maintenant.toISOString() })
    .eq('id', chantierId).eq('artisan_id', uid).is('retire_carte_le', null)
  if (error) { console.error('[crm/tache] validation automatique :', error.message); return false }
  return true
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
