import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'

export const runtime = 'nodejs'
const MANQUE_0164 = 'Le lien d’agenda n’est pas encore installé sur cette base (migration 0164).'
const absente = (e: { code?: string } | null | undefined) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))
/** L'adresse publique du flux : le jeton n'est rendu qu'ici, une seule fois, à la création. */
const adresse = (req: Request, jeton: string) => `${new URL(req.url).origin}/api/agenda/${jeton}.ics`

// Le lien d'agenda privé de l'artisan (plan du 18/10, n°6 ; table crm_agenda, migration 0164).
// GET    /api/crm/agenda → { actif, cree_le, dernier_acces_le } (jamais le jeton : il n'est gardé que sous forme d'empreinte) ;
// POST   /api/crm/agenda → crée le lien, ou le REMPLACE (l'ancien cesse aussitôt de répondre) ; rend l'adresse UNE fois ;
// DELETE /api/crm/agenda → révoque le lien (plus aucun agenda ne le lit).
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin.from('crm_agenda').select('cree_le, dernier_acces_le').eq('artisan_id', g.uid).maybeSingle()
  if (error) return erreur(absente(error) ? MANQUE_0164 : INDISPONIBLE, 503)
  return json({ actif: !!data, cree_le: data?.cree_le ?? null, dernier_acces_le: data?.dernier_acces_le ?? null })
}

export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  // 32 octets aléatoires, en base64url (43 caractères) : impossible à deviner ; seule l'empreinte SHA-256 est enregistrée.
  const jeton = randomBytes(32).toString('base64url')
  const empreinte = createHash('sha256').update(jeton).digest('hex')
  const { error } = await supabaseAdmin.from('crm_agenda').upsert({ artisan_id: g.uid, jeton_empreinte: empreinte, cree_le: new Date().toISOString(), dernier_acces_le: null }, { onConflict: 'artisan_id' })
  if (error) { console.error('[crm/agenda] création :', error.message); return erreur(absente(error) ? MANQUE_0164 : INDISPONIBLE, 503) }
  return json({ ok: true, adresse: adresse(req, jeton) }, 201)
}

export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  const { error } = await supabaseAdmin.from('crm_agenda').delete().eq('artisan_id', g.uid)
  if (error) return erreur(absente(error) ? MANQUE_0164 : INDISPONIBLE, 503)
  return json({ ok: true })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPlanning' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST, DELETE')
}
