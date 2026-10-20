import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { construireVue, type DossiersCrm } from '@/lib/crm/vue'
import { idClientPour } from '@/lib/crm/empreinte'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/crm/vue — tout ce que la page /crm affiche d'un coup : pipeline, tableau de bord, chantiers, clients, devis
// signés sans chantier, atelier. Lecture seule, pour le compte de la session ; l'assemblage est celui de lib/crm/vue.ts
// (pur, testé — et le même que celui de l'atelier d'exemple).
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
  return json(construireVue({ uid: g.uid, metier: g.metier, ...(g.formeJuridique !== undefined ? { formeJuridique: g.formeJuridique } : {}), ...(g.entreprise !== undefined ? { entreprise: g.entreprise } : {}), d: d as unknown as DossiersCrm, maintenant: new Date(), idDe: idClientPour(g.uid) }))
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
