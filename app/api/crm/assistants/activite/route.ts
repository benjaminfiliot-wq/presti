import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, nonPermise } from '@/lib/crm/serveur'
import { compteursActivite, filActivite, jourDeParis, libellePropre, type ActionLue } from '@/lib/crm/assistantCrm'

export const runtime = 'nodejs'

// /api/crm/assistants/activite — le FIL D'ACTIVITÉ de l'assistant de gestion, montré en direct dans le poste des assistants de l'atelier
// (demande du fondateur du 21/10 : « que l'assistant travaille DIRECTEMENT dans le CRM »). Lecture seule.
//   GET → { disponible, lignes: LigneActivite[], compteurs: { faitesAujourdhui, aConfirmer, envoyeesAujourdhui } }
// Garde des routes du CRM (drapeau crmAtelierVivant, session, essai, offre Signature, débit). La table assistant_actions (0157) est lue
// avec la clé de service ET filtrée par `artisan_id = uid` (comme toutes les routes du CRM) ; filActivite refiltre par compte. Ni les
// entrées, ni l'aperçu (textes des messages aux clients) ne sont lus : le titre de l'action et l'objet visé suffisent. Les noms lisibles
// (chantier, devis, facture, demande) sont relus sous le même filtre de compte.
const LIMITE = 40

export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('assistant_actions')
    .select('id, artisan_id, outil, mode, statut, titre, objet_type, objet_id, cree_le, maj_le, expire_le')
    .eq('artisan_id', g.uid).order('maj_le', { ascending: false }).limit(LIMITE)
  // Table absente (0157 non appliquée) : le poste le dit, sans erreur.
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return json({ disponible: false, lignes: [], compteurs: { faitesAujourdhui: 0, aConfirmer: 0, envoyeesAujourdhui: 0 } })
    console.error('[crm/assistants/activite] lecture :', error.message)
    return erreur('L’activité de l’assistant n’a pas pu être lue.', 503)
  }
  const actions = (data ?? []) as unknown as (ActionLue & { expire_le: string | null })[]
  const ids = (t: string) => [...new Set(actions.filter((a) => a.objet_type === t && a.objet_id).map((a) => a.objet_id as string))]
  const noms: Record<string, string> = {}
  const lire = async (table: string, colonnes: string, liste: string[], nom: (l: Record<string, unknown>) => string) => {
    if (!liste.length) return
    const { data: d } = await supabaseAdmin.from(table).select(`id, ${colonnes}`).eq('artisan_id', g.uid).in('id', liste)
    for (const l of (d ?? []) as unknown as Record<string, unknown>[]) { const n = libellePropre(nom(l)); if (n) noms[String(l.id)] = n }
  }
  await Promise.all([
    lire('chantiers', 'titre', ids('chantier'), (l) => `chantier ${String(l.titre ?? '')}`),
    lire('devis', 'numero', ids('devis'), (l) => `devis ${String(l.numero ?? '')}`),
    lire('factures', 'numero', ids('facture'), (l) => `facture ${String(l.numero ?? '')}`),
    lire('leads', 'nom_prospect', ids('conversation'), (l) => String(l.nom_prospect ?? '')),
  ])
  const maintenant = new Date()
  return json({
    disponible: true,
    lignes: filActivite(g.uid, actions, noms, maintenant),
    compteurs: compteursActivite(g.uid, actions, jourDeParis(maintenant.toISOString()), maintenant),
  })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmAtelierVivant' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET')
}
