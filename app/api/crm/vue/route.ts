import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, lireReglages, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { preparerCarte } from '@/lib/crm/geocodage'
import { actif } from '@/lib/flags'
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
  // La carte (drapeau crmAtelierVivant, lot 5) : le réglage de validation, la base et les chantiers géocodés (Base Adresse Nationale,
  // adresse seule, 4 s, 10 recherches au plus — lib/crm/geocodage.ts). Une panne de la BAN ne fait jamais tomber la vue.
  let carte: { base: { lat: number; lng: number } | null; validationAuto: boolean } | undefined
  let dossiers = d as unknown as DossiersCrm
  if (actif('crmAtelierVivant')) {
    const chantiers = dossiers.chantiers
    const adressesDevis = new Map(dossiers.devis.map((x) => [x.id, x.client_adresse]))
    const [reglages, geo] = await Promise.all([
      lireReglages(g.uid),
      preparerCarte({ uid: g.uid, chantiers, adressesDevis, siege: g.siege ?? null }).catch((e) => { console.error('[crm/vue] carte :', e); return null }),
    ])
    if (geo) dossiers = { ...dossiers, chantiers: chantiers.map((c) => { const p = geo.positions.get(c.id); return p ? { ...c, lat: p.lat, lng: p.lng } : c }) }
    carte = { base: geo?.base ?? null, validationAuto: reglages.validationAuto }
  }
  return json(construireVue({ uid: g.uid, metier: g.metier, ...(g.formeJuridique !== undefined ? { formeJuridique: g.formeJuridique } : {}), ...(g.entreprise !== undefined ? { entreprise: g.entreprise } : {}), ...(carte ? { carte } : {}), d: dossiers, maintenant: new Date(), idDe: idClientPour(g.uid) }))
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
