import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { lireCorps } from '@/lib/crm/valider'
import { MANQUE_MIGRATION_COMMANDES as MANQUE_MIGRATION, validerCommande } from '@/lib/crm/commandes'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'

const EN_COURS_MAX = 300

// POST /api/crm/commandes — enregistrer une commande que l'artisan A PASSÉE chez un fournisseur (rien n'est commandé d'ici) :
// fournisseur, lignes, date de livraison annoncée, chantier destinataire facultatif. C'est elle qui permet, passé la date, de dire
// « livraison en retard » avec une donnée et non à l'estime. Matériaux, fournisseur et chantier sont relus POUR LA SESSION.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const jour = jourParis(new Date())
  const v = validerCommande(corps.valeur, jour)
  if (!v.ok) return erreur(v.erreur, 400)
  const c = v.valeur
  if (c.chantier_id) {
    const { chantier, error } = await chantierDe(g.uid, c.chantier_id)
    if (error) { console.error('[crm/commandes] chantier :', error.message); return erreur(INDISPONIBLE, 503) }
    if (!chantier) return erreur('Chantier introuvable.', 404)
  }
  if (c.fournisseur_id) {
    const { data: f, error } = await supabaseAdmin.from('fournisseurs').select('id').eq('id', c.fournisseur_id).eq('artisan_id', g.uid).maybeSingle()
    if (error) { console.error('[crm/commandes] fournisseur :', error.message); return erreur(INDISPONIBLE, 503) }
    if (!f) return erreur('Fournisseur introuvable.', 404)
  }
  const ids = [...new Set(c.lignes.map((l) => l.materiau_id).filter((x): x is string => !!x))]
  if (ids.length) {
    const { data: ms, error } = await supabaseAdmin.from('materiaux').select('id').in('id', ids).eq('artisan_id', g.uid)
    if (error) { console.error('[crm/commandes] matériaux :', error.message); return erreur(INDISPONIBLE, 503) }
    if ((ms ?? []).length !== ids.length) return erreur('Matériau introuvable dans votre inventaire.', 404)
  }
  const { count, error: ec } = await supabaseAdmin.from('commandes_fournisseur').select('id', { count: 'exact', head: true }).eq('artisan_id', g.uid).eq('statut', 'commandee')
  if (ec) { console.error('[crm/commandes] décompte :', ec.message); return erreur(['42P01', 'PGRST205'].includes(String(ec.code)) ? MANQUE_MIGRATION : INDISPONIBLE, 503) }
  if ((count ?? 0) >= EN_COURS_MAX) return erreur('Trop de commandes en attente : marquez les anciennes comme reçues ou annulées.', 409)
  const { data, error } = await supabaseAdmin.from('commandes_fournisseur').insert({
    artisan_id: g.uid, fournisseur_id: c.fournisseur_id, fournisseur_nom: c.fournisseur_nom, fournisseur_contact: c.fournisseur_contact, reference: c.reference,
    commandee_le: c.commandee_le ?? jour, livraison_prevue: c.livraison_prevue, chantier_id: c.chantier_id, note: c.note, lignes: c.lignes,
  }).select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/commandes] création :', error?.message); return erreur(s.status === 503 ? MANQUE_MIGRATION : s.message, s.status) }
  return json({ ok: true, id: data.id }, 201)
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
