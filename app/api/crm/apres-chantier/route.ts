import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, nonPermise } from '@/lib/crm/serveur'
import { estObjet, lireCorps } from '@/lib/crm/valider'
import { DESCRIPTION_VARIABLES_APRES, LIEN_AVIS_AUTORISE, lireReglagesApres, REGLAGES_APRES_PAR_DEFAUT, TEXTES_APRES_PAR_DEFAUT, PIED_APRES } from '@/lib/apresChantier'

export const runtime = 'nodejs'

// Les réglages de l'APRÈS-CHANTIER (plan du 18/10, n°7, migration 0165, drapeau crmApresChantier) : « Demander un avis » et
// « Proposer l'entretien », pour tous les chantiers du compte. DÉSACTIVÉS par défaut ; activer est un geste de l'artisan (PUT),
// jamais un effet de bord. Activer ne fait partir AUCUN message : le passage quotidien pose des rappels, l'artisan confirme chaque
// envoi. Lit et écrit la SEULE ligne du compte de la session.
const MANQUE_0165 = 'L’après-chantier arrive avec la prochaine mise à jour : réessayez plus tard.'
const absente = (e: { code?: string } | null) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))

export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('crm_apres_chantier').select('avis, entretien, texte_avis, texte_entretien, actif_depuis').eq('artisan_id', g.uid).maybeSingle()
  if (error) return erreur(absente(error) ? MANQUE_0165 : 'Réglages illisibles : réessayez dans un instant.', 503)
  return json({
    reglages: data ?? REGLAGES_APRES_PAR_DEFAUT,
    textesParDefaut: TEXTES_APRES_PAR_DEFAUT, variables: DESCRIPTION_VARIABLES_APRES, pied: PIED_APRES, lienAvis: LIEN_AVIS_AUTORISE,
  })
}

export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 8_192)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const v = lireReglagesApres(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const avant = await supabaseAdmin.from('crm_apres_chantier').select('avis, entretien, actif_depuis').eq('artisan_id', g.uid).maybeSingle()
  if (avant.error) return erreur(absente(avant.error) ? MANQUE_0165 : 'Réglages illisibles : réessayez dans un instant.', 503)
  const etaitActif = !!(avant.data?.avis || avant.data?.entretien)
  const devientActif = v.reglages.avis || v.reglages.entretien
  // La date d'activation borne le rattrapage : seuls les chantiers finis depuis peu reçoivent une demande d'avis.
  const actif_depuis = devientActif ? (etaitActif ? avant.data?.actif_depuis ?? new Date().toISOString() : new Date().toISOString()) : null
  const { error } = await supabaseAdmin.from('crm_apres_chantier').upsert({ artisan_id: g.uid, ...v.reglages, actif_depuis, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  if (error) { console.error('[crm/apres-chantier] réglages :', error.message); return erreur(absente(error) ? MANQUE_0165 : 'Réglages non enregistrés : réessayez dans un instant.', 503) }
  return json({ ok: true, reglages: { ...v.reglages, actif_depuis } })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PUT')
}
