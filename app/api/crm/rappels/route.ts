import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, COLONNES, erreur, gardeCrm, INDISPONIBLE, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { lireCorps, validerCreationRappel } from '@/lib/crm/valider'
import { regrouperClients } from '@/lib/crm/clients'
import { idClientPour } from '@/lib/crm/empreinte'

export const runtime = 'nodejs'
const MANQUE_0162 = 'Les rappels ne sont pas encore installés sur cette base (migration 0162).'

// Les rappels et rendez-vous de l'artisan (plan du 18/10, n°1 ; table crm_rappels, migration 0162).
// GET  /api/crm/rappels             → les rappels À FAIRE du compte (les faits récents sont dans GET /api/crm/vue).
// POST /api/crm/rappels { client | lead_id | devis_id | chantier_id, type, echeance, heure?, texte? } → un rappel sur UNE cible
//      qui appartient à la session (un client : un groupe de ses pièces, lib/crm/clients.ts ; sinon une ligne à elle). La base
//      refuse aussi une cible d'un autre compte (déclencheur de 0162). Au plus 500 rappels ouverts par compte.
const MAX_OUVERTS = 500

export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('crm_rappels').select(COLONNES.rappels).eq('artisan_id', g.uid).is('fait_le', null).order('echeance').order('id').limit(MAX_OUVERTS)
  if (error) { const s = statutErreurBase(error); console.error('[crm/rappels] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  return json({ rappels: data ?? [] })
}

export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 4_096)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerCreationRappel(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const cible = v.valeur.cible
  if ('client' in cible) {
    const d = await chargerDossiers(g.uid)
    if (!d.ok) return erreur(INDISPONIBLE, 503)
    const existe = regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: idClientPour(g.uid) }).some((c) => c.id === cible.client)
    if (!existe) return erreur('Client introuvable.', 404)
  } else {
    const [table, idCible, nom] = 'lead_id' in cible ? ['leads', cible.lead_id, 'Demande'] as const : 'devis_id' in cible ? ['devis', cible.devis_id, 'Devis'] as const : ['chantiers', cible.chantier_id, 'Chantier'] as const
    const { data, error } = await supabaseAdmin.from(table).select('id').eq('id', idCible).eq('artisan_id', g.uid).maybeSingle()
    if (error) return erreur(INDISPONIBLE, 503)
    if (!data) return erreur(`${nom} introuvable.`, 404)
  }
  const { count, error: ec } = await supabaseAdmin.from('crm_rappels').select('id', { count: 'exact', head: true }).eq('artisan_id', g.uid).is('fait_le', null)
  if (ec) { const s = statutErreurBase(ec); return erreur(s.status === 503 ? 'Les rappels ne sont pas encore installés sur cette base (migration 0162).' : INDISPONIBLE, 503) }
  if ((count ?? 0) >= MAX_OUVERTS) return erreur(`Vous avez déjà ${MAX_OUVERTS} rappels à faire : cochez ou supprimez-en avant d’en ajouter.`, 409)
  const ligne = {
    artisan_id: g.uid, type: v.valeur.type, echeance: v.valeur.echeance, heure: v.valeur.heure, texte: v.valeur.texte, origine: 'artisan',
    client_cle: 'client' in cible ? cible.client : null,
    lead_id: 'lead_id' in cible ? cible.lead_id : null,
    devis_id: 'devis_id' in cible ? cible.devis_id : null,
    chantier_id: 'chantier_id' in cible ? cible.chantier_id : null,
  }
  const { data, error } = await supabaseAdmin.from('crm_rappels').insert({ ...ligne, artisan_id: g.uid }).select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/rappels] création :', error?.message); return erreur(s.status === 503 ? MANQUE_0162 : s.message, s.status) }
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
