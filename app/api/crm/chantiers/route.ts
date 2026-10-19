import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { COLONNES, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { lireCorps, validerCreationChantier } from '@/lib/crm/valider'
import { tacheAInserer, tachesDepuisDevis } from '@/lib/crm/chantier'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'

// GET /api/crm/chantiers — les chantiers de la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('chantiers').select(COLONNES.chantiers).eq('artisan_id', g.uid).order('cree_le', { ascending: false }).limit(500)
  if (error) { const s = statutErreurBase(error); console.error('[crm/chantiers] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  return json({ chantiers: data ?? [] })
}

// POST /api/crm/chantiers — créer un chantier : depuis un devis SIGNÉ de la session (un seul chantier par devis), ou libre
// (titre obligatoire). `generer_taches: true` crée aussi une tâche par ligne du devis. `equipe` : identifiants de membres.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerCreationChantier(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { equipe, generer_taches, ...champs } = v.valeur

  let titre = champs.titre ?? null
  if (champs.devis_id) {
    const { data: devis, error } = await supabaseAdmin.from('devis').select('id, statut, objet, numero').eq('id', champs.devis_id).eq('artisan_id', g.uid).maybeSingle()
    if (error) { console.error('[crm/chantiers] devis :', error.message); return erreur(INDISPONIBLE, 503) }
    if (!devis) return erreur('Devis introuvable.', 404)
    if (devis.statut !== 'accepte') return erreur('Un chantier se crée à partir d’un devis signé.', 409)
    const { data: deja } = await supabaseAdmin.from('chantiers').select('id').eq('devis_id', devis.id).eq('artisan_id', g.uid).maybeSingle()
    if (deja) return erreur('Ce devis a déjà son chantier.', 409, { id: deja.id })
    titre = titre ?? (devis.objet?.trim() || (devis.numero ? `Devis ${devis.numero}` : 'Chantier'))
  } else if (generer_taches) {
    return erreur('Sans devis, il n’y a pas de lignes d’où générer les tâches.', 400)
  }
  if (champs.vehicule_id) {
    const { data: vh } = await supabaseAdmin.from('vehicules').select('id').eq('id', champs.vehicule_id).eq('artisan_id', g.uid).maybeSingle()
    if (!vh) return erreur('Véhicule introuvable.', 404)
  }
  if (equipe?.length) {
    const { data: ms } = await supabaseAdmin.from('equipe_membres').select('id').eq('artisan_id', g.uid).in('id', equipe)
    if ((ms ?? []).length !== equipe.length) return erreur('Membre de l’équipe introuvable.', 404)
  }

  const { data: cree, error } = await supabaseAdmin.from('chantiers')
    .insert({ ...champs, titre, artisan_id: g.uid })
    .select('id').single()
  if (error || !cree) { const s = statutErreurBase(error); console.error('[crm/chantiers] création :', error?.message); return erreur(s.status === 409 ? 'Ce devis a déjà son chantier.' : s.message, s.status) }

  const suites: string[] = []
  if (equipe?.length) {
    const { error: e } = await supabaseAdmin.from('chantier_equipe').insert(equipe.map((membre_id) => ({ chantier_id: cree.id, membre_id, artisan_id: g.uid })))
    if (e) { console.error('[crm/chantiers] équipe :', e.message); suites.push('L’équipe n’a pas pu être affectée : réessayez depuis la fiche.') }
  }
  let taches = 0
  if (generer_taches && champs.devis_id) {
    const { data: lignes, error: el } = await supabaseAdmin.from('devis_lignes').select('id, ordre, designation, quantite, unite').eq('devis_id', champs.devis_id)
    const nouvelles = el ? [] : tachesDepuisDevis(lignes ?? [], [])
    if (el) suites.push('Les lignes du devis n’ont pas pu être lues : générez les tâches depuis la fiche.')
    if (nouvelles.length) {
      const { error: et } = await supabaseAdmin.from('chantier_taches').insert(nouvelles.map((t) => ({ ...tacheAInserer(t, actif('crmPlan')), chantier_id: cree.id, artisan_id: g.uid })))
      if (et) { console.error('[crm/chantiers] tâches :', et.message); suites.push('Les tâches n’ont pas pu être créées : générez-les depuis la fiche.') }
      else taches = nouvelles.length
    }
  }
  return json({ ok: true, id: cree.id, taches, avertissements: suites }, 201)
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
