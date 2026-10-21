import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { estUuid } from '@/lib/crm/valider'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// Le LIEN DE POINTAGE d'un chantier pour un COMPAGNON (décision B du 21/10 ; table chantier_pointage, migration 0174 ; drapeau
// crmPointage ; modèle : le lien de suivi, route voisine). Le compagnon ouvre /pointage/<jeton> sur son téléphone et coche « fait ».
// GET    → { actif, cree_le, dernier_acces_le } (jamais le jeton : seule son empreinte est gardée) ;
// POST   → crée le lien, ou le REMPLACE (l'ancien cesse aussitôt de répondre) ; rend l'adresse UNE fois ;
// DELETE → révoque le lien.
const MANQUE_0174 = 'Le lien de pointage arrive avec la prochaine mise à jour : réessayez plus tard.'
const absente = (e: { code?: string } | null | undefined) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))
const adresse = (req: Request, jeton: string) => `${new URL(req.url).origin}/pointage/${jeton}`

async function chantierDuCompte(uid: string, ctx: Ctx): Promise<{ id: string } | { reponse: Response }> {
  const { id } = await ctx.params
  if (!estUuid(id)) return { reponse: erreur('Chantier introuvable.', 404) }
  const { chantier, error } = await chantierDe(uid, id)
  if (error) return { reponse: erreur(INDISPONIBLE, 503) }
  if (!chantier) return { reponse: erreur('Chantier introuvable.', 404) }
  return { id }
}

export async function GET(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  const c = await chantierDuCompte(g.uid, ctx)
  if ('reponse' in c) return c.reponse
  const { data, error } = await supabaseAdmin.from('chantier_pointage').select('cree_le, dernier_acces_le').eq('chantier_id', c.id).eq('artisan_id', g.uid).maybeSingle()
  if (error) return erreur(absente(error) ? MANQUE_0174 : INDISPONIBLE, 503)
  return json({ actif: !!data, cree_le: data?.cree_le ?? null, dernier_acces_le: data?.dernier_acces_le ?? null })
}

export async function POST(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  const c = await chantierDuCompte(g.uid, ctx)
  if ('reponse' in c) return c.reponse
  // 32 octets aléatoires, en base64url (43 caractères) : impossible à deviner ; seule l'empreinte SHA-256 est enregistrée.
  const jeton = randomBytes(32).toString('base64url')
  const empreinte = createHash('sha256').update(jeton).digest('hex')
  const { error } = await supabaseAdmin.from('chantier_pointage').upsert({ chantier_id: c.id, artisan_id: g.uid, jeton_empreinte: empreinte, cree_le: new Date().toISOString(), dernier_acces_le: null }, { onConflict: 'chantier_id' })
  if (error) { console.error('[crm/pointage] création :', error.message); return erreur(absente(error) ? MANQUE_0174 : INDISPONIBLE, 503) }
  return json({ ok: true, adresse: adresse(req, jeton) }, 201)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  const c = await chantierDuCompte(g.uid, ctx)
  if ('reponse' in c) return c.reponse
  const { error } = await supabaseAdmin.from('chantier_pointage').delete().eq('chantier_id', c.id).eq('artisan_id', g.uid)
  if (error) return erreur(absente(error) ? MANQUE_0174 : INDISPONIBLE, 503)
  return json({ ok: true })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPointage' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
