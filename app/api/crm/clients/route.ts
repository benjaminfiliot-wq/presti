import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json } from '@/lib/crm/serveur'
import { regrouperClients, trouverGroupe } from '@/lib/crm/clients'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'

// GET /api/crm/clients               → la liste des clients (regroupement des pièces, lib/crm/clients.ts) ;
// GET /api/crm/clients?ref=<réf>     → la fiche 360° d'UN client : <réf> = son identifiant (64 hex) ou une de ses pièces
//                                      (d-<devis>, l-<demande>, c-<chantier>, f-<facture>).
// Fiche : coordonnées, demandes, devis, factures, chantiers, notes, prochain rendez-vous. Lecture seule, pour la session.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const d = await chargerDossiers(g.uid)
  if (!d.ok) { console.error('[crm/clients] lecture :', d.erreur.message); return erreur(INDISPONIBLE, 503) }
  const groupes = regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet })
  const ref = new URL(req.url).searchParams.get('ref')
  if (!ref) {
    return json({ clients: groupes.map((c) => ({ id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, demandes: c.leads.length, devis: c.devis.length, factures: c.factures.length, chantiers: c.chantiers.length, derniere: c.derniere })), tronque: d.tronque })
  }
  if (ref.length > 80) return erreur('Client introuvable.', 404)
  const c = trouverGroupe(groupes, ref)
  if (!c) return erreur('Client introuvable.', 404)

  const { data: notes, error } = await supabaseAdmin.from('crm_notes').select('id, texte, cree_le, maj_le').eq('artisan_id', g.uid).eq('client_cle', c.id).order('cree_le', { ascending: false }).limit(200)
  if (error) { console.error('[crm/clients] notes :', error.message); return erreur(INDISPONIBLE, 503) }

  const dans = <T extends { id: string }>(l: readonly T[], ids: string[]) => l.filter((x) => ids.includes(x.id))
  const devis = dans(d.devis, c.devis)
  const factures = dans(d.factures, c.factures)
  const chantiers = dans(d.chantiers, c.chantiers)
  const leads = dans(d.leads, c.leads)
  const jour = jourParis(new Date())
  const aVenir = chantiers
    .filter((x) => x.statut !== 'termine' && x.statut !== 'annule' && typeof x.date_debut === 'string' && x.date_debut >= jour)
    .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)))[0] ?? null

  return json({
    client: { id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, adresse: c.adresse },
    demandes: leads.map((l) => ({ id: l.id, statut: l.statut, type_chantier: l.type_chantier, canal: l.canal, ville: l.ville, created_at: l.created_at })),
    devis: devis.map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, accepte_le: x.accepte_le })),
    factures: factures.map((x) => ({ id: x.id, numero: x.numero, statut: x.statut, total_ttc: x.total_ttc, date_emission: x.date_emission, date_echeance: x.date_echeance, avoir_de: x.avoir_de })),
    chantiers: chantiers.map((x) => ({ id: x.id, titre: x.titre, statut: x.statut, date_debut: x.date_debut, date_fin_prevue: x.date_fin_prevue })),
    notes: notes ?? [],
    // Il n'existe pas d'agenda de rendez-vous côté artisan (ops.rendez_vous est celui de Presti avec ses prospects) :
    // la case reste vide plutôt que d'inventer un rendez-vous. Le prochain DÉBUT de chantier est donné à part, pour ce qu'il est.
    prochainRendezVous: null,
    prochainChantier: aVenir ? { id: aVenir.id, titre: aVenir.titre, date_debut: aVenir.date_debut } : null,
    // Total des devis signés de ce client, en centimes ; null s'il n'a aucun devis (l'écran affiche « — »).
    signe: devis.length ? devis.filter((x) => x.statut === 'accepte').reduce((s, x) => s + Math.round(Number(x.total_ttc ?? 0) * 100), 0) : null,
  })
}
