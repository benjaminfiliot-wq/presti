import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { estUuid, lireCorps } from '@/lib/crm/valider'
import { adresseMail, commandeDeLigne, MANQUE_MIGRATION_COMMANDES, validerRelance } from '@/lib/crm/commandes'
import { sendEmail } from '@/lib/email'
import { consommerLimite } from '@/lib/limites'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

const COLONNES = 'id, fournisseur_nom, fournisseur_contact, reference, statut, commandee_le, livraison_prevue, recue_le, chantier_id, lignes, note, relances, relance_le'
const UNE_HEURE = 3_600_000

// POST /api/crm/commandes/[id]/relancer { message, confirmer: true } — « Relancer le fournisseur ».
//
// ⚠️ Ceci envoie un VRAI e-mail. Il ne part que si l'artisan l'a décidé dans l'écran : le corps doit porter `confirmer: true` (l'écran ne
// l'envoie qu'au clic sur le bouton « Envoyer l'e-mail à … », message relu et modifiable sous les yeux) et le texte envoyé est CELUI de
// la requête, jamais un texte reconstruit côté serveur. Sans adresse e-mail plausible chez le fournisseur : rien ne part (422), l'écran
// propose de copier le message. Garde-fous : une relance par heure et par commande, dix par jour et par compte.
export async function POST(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Commande introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerRelance(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { data: ligne, error } = await supabaseAdmin.from('commandes_fournisseur').select(COLONNES).eq('id', id).eq('artisan_id', g.uid).maybeSingle()
  if (error) { console.error('[crm/relance] lecture :', error.message); return erreur(['42P01', 'PGRST205'].includes(String(error.code)) ? MANQUE_MIGRATION_COMMANDES : INDISPONIBLE, 503) }
  const c = ligne ? commandeDeLigne(ligne as unknown as Record<string, unknown>) : null
  if (!c) return erreur('Commande introuvable.', 404)
  if (c.statut !== 'commandee') return erreur('Cette commande n’est plus en attente : rien à relancer.', 409)
  const destinataire = adresseMail(c.contact)
  if (!destinataire) return erreur('Aucune adresse e-mail pour ce fournisseur : copiez le message et envoyez-le par votre moyen habituel.', 422, { code: 'sans_adresse' })
  if (!(await consommerLimite(`crm-relance:${g.uid}`, 10, 86_400))) return erreur('Dix relances par jour au plus : réessayez demain, ou appelez le fournisseur.', 429, { code: 'debit' })
  // Prendre la relance AVANT l'envoi, sous condition (jamais deux envois sur deux clics) ; rendue si l'envoi échoue.
  const maintenant = new Date().toISOString()
  const { data: pris, error: ep } = await supabaseAdmin.from('commandes_fournisseur')
    .update({ relances: c.relances + 1, relance_le: maintenant })
    .eq('id', id).eq('artisan_id', g.uid).eq('statut', 'commandee')
    .or(`relance_le.is.null,relance_le.lt.${new Date(Date.now() - UNE_HEURE).toISOString()}`).select('id')
  if (ep) { console.error('[crm/relance] prise :', ep.message); return erreur(INDISPONIBLE, 503) }
  if (!pris?.length) return erreur('Ce fournisseur a déjà été relancé il y a moins d’une heure.', 429, { code: 'relance_recente' })
  const { data: artisan } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', g.uid).maybeSingle()
  const nom = (artisan?.nom as string | null)?.trim() || 'Votre artisan'
  const r = await sendEmail({
    to: destinataire,
    subject: `Livraison attendue${c.reference ? ` — commande ${c.reference}` : ''}`,
    text: v.valeur.message,
    fromName: nom,
    replyTo: (artisan?.email as string | null) || undefined,
    transactionnel: true, // le geste de l'artisan : la pause des agents ne le coupe pas (lib/email.ts)
  })
  if (!r.ok) {
    console.error('[crm/relance] envoi :', r.error)
    await supabaseAdmin.from('commandes_fournisseur').update({ relances: c.relances, relance_le: c.relance_le }).eq('id', id).eq('artisan_id', g.uid)
    return erreur('L’e-mail n’a pas pu partir pour le moment : rien n’a été envoyé.', 502)
  }
  return json({ ok: true, envoye_a: destinataire, relances: c.relances + 1 })
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
