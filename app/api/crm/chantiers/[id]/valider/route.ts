import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerActionCarte } from '@/lib/crm/valider'
import { champsValidation, peutValider } from '@/lib/crm/carte'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// POST /api/crm/chantiers/[id]/valider — la CARTE de l'atelier (lot 5, migration 0172 ; drapeau crmAtelierVivant).
//   { action: 'valider' }  : toutes les tâches sont faites (ou le chantier est déjà terminé) → statut terminé, fin réelle (gardée si
//                            déjà posée), retire_carte_le : le bâtiment QUITTE la carte ; le chantier reste dans la liste, la fiche,
//                            le pipeline, les factures et les chiffres. Sinon 409, et la raison.
//   { action: 'remettre' } : retire_carte_le remis à vide — le chantier revient sur la carte (son statut ne change pas).
// Chaque lecture et chaque écriture sont filtrées sur `artisan_id = uid` (la session) : un autre compte reçoit 404.
export async function POST(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerActionCarte(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { chantier: c, error } = await chantierDe(g.uid, id)
  if (error) { const s = statutErreurBase(error); console.error('[crm/valider] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  if (!c) return erreur('Chantier introuvable.', 404)

  if (v.valeur.action === 'remettre') {
    if (!c.retire_carte_le) return erreur('Ce chantier est déjà sur la carte.', 409)
    const { error: e } = await supabaseAdmin.from('chantiers').update({ retire_carte_le: null, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid)
    if (e) { const s = statutErreurBase(e); console.error('[crm/valider] remettre :', e.message); return erreur(s.message, s.status) }
    return json({ ok: true, surLaCarte: true })
  }

  const { data: taches, error: et } = await supabaseAdmin.from('chantier_taches').select('faite').eq('chantier_id', id).eq('artisan_id', g.uid)
  if (et) { console.error('[crm/valider] tâches :', et.message); return erreur(INDISPONIBLE, 503) }
  const t = { total: (taches ?? []).length, faites: (taches ?? []).filter((x) => x.faite).length }
  if (c.retire_carte_le) return erreur('Ce chantier est déjà validé.', 409)
  if (!peutValider({ statut: c.statut, taches: t, retire_carte_le: null })) {
    return erreur(c.statut === 'annule' ? 'Un chantier annulé ne se valide pas.' : t.total === 0 ? 'Ce chantier n’a pas de tâche : passez-le « Terminé » pour le valider.' : `Il reste ${t.total - t.faites} tâche${t.total - t.faites > 1 ? 's' : ''} à faire.`, 409)
  }
  const maintenant = new Date()
  const champs = champsValidation(c, jourParis(maintenant), maintenant)
  const { data: ecrit, error: e } = await supabaseAdmin.from('chantiers').update({ ...champs, maj_le: maintenant.toISOString() }).eq('id', id).eq('artisan_id', g.uid).is('retire_carte_le', null).select('id')
  if (e) { const s = statutErreurBase(e); console.error('[crm/valider] valider :', e.message); return erreur(s.message, s.status) }
  // Validé entre-temps (deux clics, deux onglets) : rien n'a été écrit ici, on ne prétend pas le contraire (audit du 20/10, F4).
  if (!ecrit?.length) return erreur('Ce chantier est déjà validé.', 409)
  return json({ ok: true, surLaCarte: false, ...champs })
}

// Méthodes non servies : la garde d'abord (drapeau baissé, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
