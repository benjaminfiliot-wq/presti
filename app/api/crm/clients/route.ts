import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { regrouperClients, trouverGroupe } from '@/lib/crm/clients'
import { idClientPour } from '@/lib/crm/empreinte'
import { construireFicheClient, type DossiersCrm, type NoteCrm } from '@/lib/crm/vue'

export const runtime = 'nodejs'

// GET /api/crm/clients               → la liste des clients (regroupement des pièces, lib/crm/clients.ts) ;
// GET /api/crm/clients?ref=<réf>     → la fiche 360° d'UN client : <réf> = son identifiant (64 hex) ou une de ses pièces
//                                      (d-<devis>, l-<demande>, c-<chantier>, f-<facture>).
// Fiche : coordonnées, demandes, devis, factures, chantiers, notes, prochain rendez-vous (lib/crm/vue.ts, le même
// assemblage que la fiche de l'atelier d'exemple). Lecture seule, pour la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const d = await chargerDossiers(g.uid)
  if (!d.ok) { console.error('[crm/clients] lecture :', d.erreur.message); return erreur(INDISPONIBLE, 503) }
  const groupes = regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: idClientPour(g.uid) })
  const ref = new URL(req.url).searchParams.get('ref')
  if (!ref) {
    return json({ clients: groupes.map((c) => ({ id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, demandes: c.leads.length, devis: c.devis.length, factures: c.factures.length, chantiers: c.chantiers.length, derniere: c.derniere })), tronque: d.tronque })
  }
  if (ref.length > 80) return erreur('Client introuvable.', 404)
  const c = trouverGroupe(groupes, ref)
  if (!c) return erreur('Client introuvable.', 404)

  const { data: notes, error } = await supabaseAdmin.from('crm_notes').select('id, texte, cree_le, maj_le').eq('artisan_id', g.uid).eq('client_cle', c.id).order('cree_le', { ascending: false }).limit(200)
  if (error) { console.error('[crm/clients] notes :', error.message); return erreur(INDISPONIBLE, 503) }
  return json(construireFicheClient({ groupe: c, d: d as unknown as DossiersCrm, notes: (notes ?? []) as NoteCrm[], maintenant: new Date() }))
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
