import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { champsPermis, estObjet, identifiant, lireCorps } from '@/lib/crm/valider'
import { decisionAcompte } from '@/lib/crm/argent'
import { creerFacture } from '@/lib/factureDepuisDevis'
import { consommerLimite } from '@/lib/limites'

export const runtime = 'nodejs'

// POST /api/crm/acompte { devis_id } — « Demander l'acompte » depuis la frise d'un dossier (plan du 18/10, n°3).
// Crée la facture d'acompte du devis par LE chemin existant (lib/factureDepuisDevis.ts, `acomptePct`, celui de la facture
// d'acompte automatique et de l'assistant) : mentions obligatoires bloquantes, numérotation, scellement. Rien n'est envoyé au
// client. Refusé (lib/crm/argent.ts, decisionAcompte) si le devis n'est pas signé, ne prévoit pas d'acompte, ou a déjà une
// facture comptée. Un double clic ne fait pas deux factures : une seule demande par devis passe toutes les 15 secondes.
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

  const [devisR, facturesR] = await Promise.all([
    supabaseAdmin.from('devis').select('id, statut, total_ttc, acompte_pct').eq('id', devisId).eq('artisan_id', g.uid).maybeSingle(),
    supabaseAdmin.from('factures').select('id, statut, objet, total_ttc, acompte_pct, avoir_de').eq('devis_id', devisId).eq('artisan_id', g.uid),
  ])
  if (devisR.error || facturesR.error) { console.error('[crm/acompte] lecture :', (devisR.error ?? facturesR.error)?.message); return erreur(INDISPONIBLE, 503) }
  const d = decisionAcompte(devisR.data, facturesR.data ?? [])
  if (!d.ok) return erreur(d.erreur, d.statut)
  if (!(await consommerLimite(`crm-acompte:${g.uid}:${devisId}`, 1, 15))) return erreur('La facture d’acompte est déjà en cours de création : rechargez la page dans un instant.', 429, { code: 'debit' })

  const r = await creerFacture({ artisanId: g.uid, devisId, acomptePct: d.pct })
  if (!r.ok) return erreur(r.error, r.status, r.code ? { code: r.code, manquantes: r.manquantes, lien: r.lien } : {})
  return json({ ok: true, id: r.id, numero: r.numero }, 201)
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
