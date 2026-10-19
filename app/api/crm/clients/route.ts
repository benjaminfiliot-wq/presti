import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { clesDesNotes, regrouperClients, trouverGroupe } from '@/lib/crm/clients'
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
  // C4 (audit du 18/10) : les notes du client sous son identifiant actuel ET sous ses anciennes clés (lib/crm/clients.ts).

  const { data: notes, error } = await supabaseAdmin.from('crm_notes').select('id, texte, cree_le, maj_le').eq('artisan_id', g.uid).in('client_cle', clesDesNotes(groupes, c)).order('cree_le', { ascending: false }).limit(200)
  if (error) { console.error('[crm/clients] notes :', error.message); return erreur(INDISPONIBLE, 503) }
  // La chronologie (plan du 18/10, n°4) : les échanges et relances des SEULES pièces de ce client (ses demandes, ses factures),
  // et les notes posées sur ses demandes et ses chantiers. Lecture seule, chaque requête bornée aux identifiants du groupe, eux-mêmes
  // lus pour la session (chargerDossiers) : aucune pièce d'un autre compte ne peut y entrer.
  const vide = Promise.resolve({ data: [] as Record<string, unknown>[], error: null })
  const [messagesR, relancesR, impayesR, notesPiecesR] = await Promise.all([
    c.leads.length ? supabaseAdmin.from('messages').select('id, lead_id, sens, type, contenu, sent_at').in('lead_id', c.leads).order('sent_at', { ascending: false }).limit(300) : vide,
    c.leads.length ? supabaseAdmin.from('relances').select('id, lead_id, rang, planifiee_le, envoyee').in('lead_id', c.leads).eq('envoyee', true).limit(100) : vide,
    c.factures.length ? supabaseAdmin.from('relances_impayes').select('id, facture_id, rang, envoyee_le, statut').eq('artisan_id', g.uid).in('facture_id', c.factures).limit(100) : vide,
    c.leads.length || c.chantiers.length
      ? supabaseAdmin.from('crm_notes').select('id, texte, cree_le').eq('artisan_id', g.uid).or([c.leads.length ? `lead_id.in.(${c.leads.join(',')})` : '', c.chantiers.length ? `chantier_id.in.(${c.chantiers.join(',')})` : ''].filter(Boolean).join(',')).limit(200)
      : vide,
  ])
  // Une table d'échanges absente (base ancienne) ne fait pas tomber la fiche : la chronologie le montre sans ces lignes.
  for (const [nom, r] of [['messages', messagesR], ['relances', relancesR], ['relances_impayes', impayesR], ['notes des pièces', notesPiecesR]] as const) if (r.error) console.error(`[crm/clients] chronologie (${nom}) :`, r.error.message)
  return json(construireFicheClient({
    groupe: c, groupes, d: d as unknown as DossiersCrm, notes: (notes ?? []) as NoteCrm[], maintenant: new Date(),
    notesPieces: (notesPiecesR.data ?? []) as NoteCrm[],
    rappels: d.rappels, rappelsDisponibles: d.rappelsDisponibles,
    messages: (messagesR.data ?? []) as never, relancesConversation: (relancesR.data ?? []) as never, relancesImpayes: (impayesR.data ?? []) as never,
  }))
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
