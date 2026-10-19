import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { champsPermis, estObjet, identifiant, lireCorps } from '@/lib/crm/valider'
import { decisionRelance, devisARelancer, messageRelanceDevis } from '@/lib/crm/rappels'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'

// POST /api/crm/relances { devis_id } — PRÉPARE la relance d'un devis envoyé resté sans réponse (plan du 18/10, n°1). RIEN n'est
// envoyé : la route rend le message (lib/crm/rappels.ts, messageRelanceDevis : court, sans lien, sans prix), l'adresse du client et
// la date d'envoi connue ; l'artisan le relit, le modifie, puis confirme (POST /api/crm/relances/envoyer).
// La date d'envoi d'un devis ancien peut manquer (audit de cohérence du 18/10, C1) : le message ne la cite alors pas.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 2_048)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const permis = champsPermis(corps.valeur, ['devis_id'])
  if (!permis.ok) return erreur(permis.erreur, 400)
  const id = identifiant(corps.valeur.devis_id, 'Devis', true)
  if (!id.ok) return erreur(id.erreur, 400)
  const devisId = id.valeur as string

  const [devisR, artR, rappelsR] = await Promise.all([
    supabaseAdmin.from('devis').select('id, artisan_id, statut, numero, objet, client_nom, client_email, total_ttc, envoye_le, date_emission, created_at, validite_jours').eq('id', devisId).eq('artisan_id', g.uid).maybeSingle(),
    supabaseAdmin.from('artisans').select('nom').eq('id', g.uid).maybeSingle(),
    supabaseAdmin.from('crm_rappels').select('id, devis_id, type, fait_le, envoye_le').eq('artisan_id', g.uid).eq('devis_id', devisId),
  ])
  if (devisR.error || artR.error) { console.error('[crm/relances] lecture :', (devisR.error ?? artR.error)?.message); return erreur(INDISPONIBLE, 503) }
  const rappels = rappelsR.error ? [] : rappelsR.data ?? []
  const d = devisR.data
  const envoyees = rappels.filter((r) => !!r.envoye_le).length
  const dec = decisionRelance(d, envoyees)
  if (!dec.ok) return erreur(dec.erreur, dec.statut)
  const jour = jourParis(new Date())
  // Le même calcul que la tuile « Relances dues » (dates, seuil, validité) ; un devis encore « jeune » se relance quand même si
  // l'artisan le décide : la date est alors celle de l'émission, au pire.
  const info = devisARelancer({ artisanId: g.uid, devis: [d!], rappels, jour })[0]
  const envoyeLe = info?.envoyeLe ?? (d!.envoye_le ?? d!.date_emission ?? d!.created_at ?? '').slice(0, 10)
  const dateSure = info ? info.dateSure : !!d!.envoye_le
  return json({
    devis_id: devisId, destinataire: d!.client_email, envoye_le: envoyeLe || null, date_sure: dateSure, relances: envoyees,
    message: messageRelanceDevis({ client: d!.client_nom ?? null, numero: d!.numero ?? null, objet: d!.objet ?? null, envoyeLe, dateSure: dateSure && !!envoyeLe, relances: envoyees, signature: (artR.data?.nom as string | null) ?? null }),
    rappels_disponibles: !rappelsR.error,
  })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
