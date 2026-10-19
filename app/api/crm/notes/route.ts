import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { estEmpreinte, estUuid, lireCorps, validerCreationNote } from '@/lib/crm/valider'
import { clesDesNotes, rattacherCle, regrouperClients } from '@/lib/crm/clients'
import { idClientPour } from '@/lib/crm/empreinte'

export const runtime = 'nodejs'

// GET /api/crm/notes?client=<empreinte> | ?chantier_id=<uuid> | ?lead_id=<uuid> — les notes d'UNE cible, pour la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const p = new URL(req.url).searchParams
  const client = p.get('client'), chantier = p.get('chantier_id'), lead = p.get('lead_id')
  const cibles = [client, chantier, lead].filter(Boolean)
  if (cibles.length !== 1) return erreur('Une cible : client, chantier_id ou lead_id.', 400)
  let q = supabaseAdmin.from('crm_notes').select('id, texte, client_cle, chantier_id, lead_id, cree_le, maj_le').eq('artisan_id', g.uid)
  if (client) {
    if (!estEmpreinte(client)) return erreur('Client : identifiant invalide.', 400)
    // C4 (audit du 18/10) : un client a pu changer d'identifiant (e-mail ajouté) : on lit sous toutes ses clés.
    const d = await chargerDossiers(g.uid)
    if (!d.ok) return erreur(INDISPONIBLE, 503)
    const groupes = regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: idClientPour(g.uid) })
    const groupe = rattacherCle(groupes, client)
    q = groupe ? q.in('client_cle', clesDesNotes(groupes, groupe)) : q.eq('client_cle', client)
  }
  if (chantier) { if (!estUuid(chantier)) return erreur('Chantier : identifiant invalide.', 400); q = q.eq('chantier_id', chantier) }
  if (lead) { if (!estUuid(lead)) return erreur('Demande : identifiant invalide.', 400); q = q.eq('lead_id', lead) }
  const { data, error } = await q.order('cree_le', { ascending: false }).limit(200)
  if (error) { const s = statutErreurBase(error); console.error('[crm/notes] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  return json({ notes: data ?? [] })
}

// POST /api/crm/notes { texte, client | chantier_id | lead_id } — la cible doit exister chez la session (un client : un
// groupe de ses pièces, lib/crm/clients.ts ; un chantier, une demande : une ligne à elle).
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerCreationNote(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const cible = v.valeur.cible
  let cleClient: string | null = null
  if ('client' in cible) {
    const d = await chargerDossiers(g.uid)
    if (!d.ok) return erreur(INDISPONIBLE, 503)
    // Une fiche ouverte avant l'ajout d'un e-mail porte l'ancien identifiant : la note va au client, sous son identifiant ACTUEL.
    const groupe = rattacherCle(regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: idClientPour(g.uid) }), cible.client)
    if (!groupe) return erreur('Client introuvable.', 404)
    cleClient = groupe.id
  } else {
    const [table, idCible] = 'chantier_id' in cible ? ['chantiers', cible.chantier_id] as const : ['leads', cible.lead_id] as const
    const { data, error } = await supabaseAdmin.from(table).select('id').eq('id', idCible).eq('artisan_id', g.uid).maybeSingle()
    if (error) return erreur(INDISPONIBLE, 503)
    if (!data) return erreur(table === 'chantiers' ? 'Chantier introuvable.' : 'Demande introuvable.', 404)
  }
  const ligne = {
    artisan_id: g.uid, texte: v.valeur.texte,
    client_cle: cleClient,
    chantier_id: 'chantier_id' in cible ? cible.chantier_id : null,
    lead_id: 'lead_id' in cible ? cible.lead_id : null,
  }
  const { data, error } = await supabaseAdmin.from('crm_notes').insert({ ...ligne, artisan_id: g.uid }).select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/notes] création :', error?.message); return erreur(s.message, s.status) }
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
