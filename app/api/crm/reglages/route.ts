import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, lireReglages, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { lireCorps, validerReglagesCrm } from '@/lib/crm/valider'

export const runtime = 'nodejs'

// /api/crm/reglages — les réglages du CRM du compte (crm_reglages, migration 0172 ; drapeau crmAtelierVivant).
//   GET : { validation_auto, disponible } — faux par défaut (aucune ligne), faux si la table manque.
//   PUT { validation_auto: true | false } : « Valider automatiquement quand toutes les tâches sont cochées ». La table n'a AUCUN droit
//   pour anon / authenticated : seule cette route l'écrit, pour la session (`artisan_id = uid`).
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  const r = await lireReglages(g.uid)
  return json({ validation_auto: r.validationAuto, disponible: r.disponible })
}

export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerReglagesCrm(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { error } = await supabaseAdmin.from('crm_reglages').upsert({ artisan_id: g.uid, validation_auto: v.valeur.validation_auto, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  if (error) { const s = statutErreurBase(error); console.error('[crm/reglages] écriture :', error.message); return erreur(s.message, s.status) }
  return json({ ok: true, validation_auto: v.valeur.validation_auto })
}

// Méthodes non servies : la garde d'abord (drapeau baissé, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
