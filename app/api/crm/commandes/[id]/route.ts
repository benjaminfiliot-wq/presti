import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import { estUuid, lireCorps } from '@/lib/crm/valider'
import { commandeDeLigne, MANQUE_MIGRATION_COMMANDES, validerModificationCommande } from '@/lib/crm/commandes'
import { jourParis } from '@/lib/comptaTableau'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

const COLONNES = 'id, fournisseur_nom, fournisseur_contact, reference, statut, commandee_le, livraison_prevue, recue_le, chantier_id, lignes, note, relances, relance_le'
const absente = (e: { code?: string } | null) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))

// PATCH /api/crm/commandes/[id] — UNE chose à la fois, sur une commande encore EN ATTENTE :
//   { action: 'recue', entrer_en_stock? }  la marchandise est arrivée ; avec entrer_en_stock, chaque ligne liée à l'inventaire y entre
//                                           (appliquer_mouvement, type « entree », le même chemin que l'écran Inventaire) ;
//   { action: 'annuler' }                   la commande n'aura pas lieu ;
//   { livraison_prevue }                    le fournisseur a annoncé une nouvelle date.
// Le passage « en attente → reçue / annulée » est atomique (une seule ligne mise à jour sous condition de statut) : deux clics ne
// font entrer le stock qu'une fois.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Commande introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationCommande(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const m = v.valeur
  const jour = jourParis(new Date())

  if ('livraison_prevue' in m) {
    const { data, error } = await supabaseAdmin.from('commandes_fournisseur').update({ livraison_prevue: m.livraison_prevue }).eq('id', id).eq('artisan_id', g.uid).eq('statut', 'commandee').select('id')
    if (error) { const s = statutErreurBase(error); console.error('[crm/commande] date :', error.message); return erreur(absente(error) ? MANQUE_MIGRATION_COMMANDES : s.message, s.status) }
    if (!data?.length) return erreur('Commande introuvable ou déjà clôturée.', 404)
    return json({ ok: true })
  }
  if (m.action === 'annuler') {
    const { data, error } = await supabaseAdmin.from('commandes_fournisseur').update({ statut: 'annulee' }).eq('id', id).eq('artisan_id', g.uid).eq('statut', 'commandee').select('id')
    if (error) { const s = statutErreurBase(error); console.error('[crm/commande] annulation :', error.message); return erreur(absente(error) ? MANQUE_MIGRATION_COMMANDES : s.message, s.status) }
    if (!data?.length) return erreur('Commande introuvable ou déjà clôturée.', 404)
    return json({ ok: true })
  }
  // Reçue : on prend la commande d'abord (statut conditionnel), PUIS le stock — un échec de stock ne rouvre pas la commande, il se dit.
  const { data, error } = await supabaseAdmin.from('commandes_fournisseur').update({ statut: 'recue', recue_le: jour }).eq('id', id).eq('artisan_id', g.uid).eq('statut', 'commandee').select(COLONNES)
  if (error) { const s = statutErreurBase(error); console.error('[crm/commande] réception :', error.message); return erreur(absente(error) ? MANQUE_MIGRATION_COMMANDES : s.message, s.status) }
  const c = data?.[0] ? commandeDeLigne(data[0] as unknown as Record<string, unknown>) : null
  if (!c) return erreur('Commande introuvable ou déjà clôturée.', 404)
  const stock = { entrees: 0, echecs: [] as string[] }
  if (m.entrer_en_stock) {
    for (const l of c.lignes) {
      if (!l.materiau_id) continue
      const { error: em } = await supabaseAdmin.rpc('appliquer_mouvement', {
        p_artisan: g.uid, p_materiau: l.materiau_id, p_type: 'entree', p_quantite: l.quantite, p_lieu: 'atelier', p_devis: null,
        p_source: 'manuel', p_cout: null, p_note: `Commande reçue${c.reference ? ` ${c.reference}` : ''}`.slice(0, 300),
      })
      if (em) { console.error('[crm/commande] entrée en stock :', em.message); stock.echecs.push(l.nom) } else stock.entrees++
    }
  }
  return json({ ok: true, stock })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH')
}
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('PATCH')
}
