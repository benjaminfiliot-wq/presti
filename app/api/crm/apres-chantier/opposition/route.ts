import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { champsPermis, estObjet, identifiant, lireCorps } from '@/lib/crm/valider'
import { empreinteAdresse } from '@/lib/crm/apresOpposition'

export const runtime = 'nodejs'

// L'OPPOSITION du client aux messages d'après-chantier (migration 0171, audit de conformité du 20/10, A1 ; drapeau crmApresChantier).
//   POST { rappel_id } → le client de ce rappel a dit non : son empreinte d'adresse est notée pour ce compte (plus aucun envoi,
//                        decisionEnvoiApres refuse en 409), ce rappel est coché et les autres rappels d'après-chantier encore à faire
//                        sur ce chantier sont retirés. Rien n'est envoyé au client.
// Une opposition ne s'annule pas depuis l'écran : elle doit tenir (RGPD art. 21.3).
export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 2_048)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const permis = champsPermis(corps.valeur, ['rappel_id'])
  if (!permis.ok) return erreur(permis.erreur, 400)
  const id = identifiant(corps.valeur.rappel_id, 'Rappel', true)
  if (!id.ok) return erreur(id.erreur, 400)

  const r = await supabaseAdmin.from('crm_rappels').select('id, type, chantier_id').eq('id', id.valeur as string).eq('artisan_id', g.uid).maybeSingle()
  if (r.error) return erreur(INDISPONIBLE, 503)
  if (!r.data || !['demande_avis', 'entretien'].includes(r.data.type as string) || !r.data.chantier_id) return erreur('Rappel introuvable.', 404)
  const ch = await supabaseAdmin.from('chantiers').select('devis_id').eq('id', r.data.chantier_id).eq('artisan_id', g.uid).maybeSingle()
  if (ch.error) return erreur(INDISPONIBLE, 503)
  if (!ch.data) return erreur('Chantier introuvable.', 404)
  const dv = ch.data.devis_id
    ? await supabaseAdmin.from('devis').select('client_email').eq('id', ch.data.devis_id).eq('artisan_id', g.uid).maybeSingle()
    : { data: null, error: null }
  if (dv.error) return erreur(INDISPONIBLE, 503)
  const email = typeof dv.data?.client_email === 'string' && dv.data.client_email.trim() ? dv.data.client_email.trim() : null

  // Sans adresse, aucun message ne peut partir de toute façon : on retire seulement les rappels.
  if (email) {
    const o = await supabaseAdmin.from('crm_apres_opposition').upsert({ artisan_id: g.uid, empreinte: empreinteAdresse(email) }, { onConflict: 'artisan_id,empreinte', ignoreDuplicates: true })
    if (o.error) { console.error('[crm/apres-chantier] opposition :', o.error.message); return erreur(INDISPONIBLE, 503) }
  }
  const maintenant = new Date().toISOString()
  const [fait, autres] = await Promise.all([
    supabaseAdmin.from('crm_rappels').update({ fait_le: maintenant, texte: 'Le client ne veut plus de messages d’après-chantier' }).eq('id', r.data.id).eq('artisan_id', g.uid),
    supabaseAdmin.from('crm_rappels').delete().eq('artisan_id', g.uid).eq('chantier_id', r.data.chantier_id).in('type', ['demande_avis', 'entretien']).is('fait_le', null).neq('id', r.data.id),
  ])
  if (fait.error || autres.error) console.error('[crm/apres-chantier] opposition (rappels) :', (fait.error ?? autres.error)?.message)
  return json({ ok: true, note: !!email }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
