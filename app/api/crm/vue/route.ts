import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { cartes, pipeline } from '@/lib/crm/pipeline'
import { assemblerAtelier } from '@/lib/crm/atelier'
import { calculerTableauCrm } from '@/lib/crm/tableau'
import { avancement, joursDeRetard } from '@/lib/crm/chantier'
import { regrouperClients } from '@/lib/crm/clients'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/crm/vue — tout ce que la page /crm affiche d'un coup : pipeline, tableau de bord, chantiers, clients, devis
// signés sans chantier. Lecture seule, pour le compte de la session ; les calculs sont ceux de lib/crm/* (purs, testés).
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const d = await chargerDossiers(g.uid)
  if (!d.ok) {
    const s = statutErreurBase(d.erreur)
    console.error('[crm/vue] lecture :', d.erreur.message)
    // Jamais un tableau vide sur une panne : 503 et aucune donnée.
    return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503)
  }
  const maintenant = new Date()
  const jour = jourParis(maintenant)
  const tachesPar = new Map<string, { faite: boolean }[]>()
  for (const t of d.taches as { chantier_id: string; faite: boolean }[]) tachesPar.set(t.chantier_id, [...(tachesPar.get(t.chantier_id) ?? []), t])
  const devisParId = new Map(d.devis.map((x) => [x.id as string, x]))
  const entreesPipeline = { artisanId: g.uid, leads: d.leads, devis: d.devis, factures: d.factures, chantiers: d.chantiers, deplacements: d.deplacements }
  const chantierParDevis = new Set(d.chantiers.map((c) => c.devis_id).filter(Boolean))

  return json({
    maintenant: maintenant.toISOString(),
    tronque: d.tronque,
    pipeline: pipeline(entreesPipeline),
    // La maquette de l'atelier (J3) : les mêmes lignes, mises en scène par lib/crm/atelier.ts.
    atelier: assemblerAtelier({ jour, metier: g.metier, chantiers: d.chantiers, cartes: cartes(entreesPipeline), taches: d.taches, equipe: d.equipe, materiaux: d.materiaux, vehicules: d.vehicules, membres: d.membres }),
    tableau: calculerTableauCrm({ artisanId: g.uid, devis: d.devis, factures: d.factures, demandes: d.leads, chantiers: d.chantiers, materiaux: d.materiaux, maintenant }),
    chantiers: d.chantiers.map((c) => {
      const dv = c.devis_id ? devisParId.get(c.devis_id) : undefined
      return {
        id: c.id, titre: c.titre, statut: c.statut, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue,
        client: dv?.client_nom ?? c.client_nom ?? null, devis_numero: dv?.numero ?? null,
        avancement: avancement(tachesPar.get(c.id) ?? []), retard: joursDeRetard(c, jour),
      }
    }),
    // Les devis signés qui n'ont pas encore de chantier : ce que « Créer un chantier » propose.
    devisSignesSansChantier: d.devis
      .filter((x) => x.statut === 'accepte' && !chantierParDevis.has(x.id))
      .map((x) => ({ id: x.id, numero: x.numero, objet: x.objet, client_nom: x.client_nom, total_ttc: x.total_ttc, accepte_le: x.accepte_le })),
    clients: regrouperClients({ artisanId: g.uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet })
      .map((c) => ({ id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, demandes: c.leads.length, devis: c.devis.length, factures: c.factures.length, chantiers: c.chantiers.length, derniere: c.derniere })),
  })
}
