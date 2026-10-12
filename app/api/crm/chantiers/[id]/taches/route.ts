import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid, lireCorps, validerCreationTache } from '@/lib/crm/valider'
import { tachesDepuisDevis } from '@/lib/crm/chantier'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// POST /api/crm/chantiers/[id]/taches
//   { libelle, quantite?, unite?, membre_id?, ordre? }  → une tâche ajoutée à la main ;
//   { depuis_devis: true }                               → une tâche par ligne du devis lié qui n'a pas encore la sienne.
export async function POST(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerCreationTache(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { chantier: c, error: el } = await chantierDe(g.uid, id)
  if (el) { console.error('[crm/taches] chantier :', el.message); return erreur(INDISPONIBLE, 503) }
  if (!c) return erreur('Chantier introuvable.', 404)

  const { data: existantes, error: ee } = await supabaseAdmin.from('chantier_taches').select('devis_ligne_id, ordre').eq('chantier_id', id).eq('artisan_id', g.uid)
  if (ee) { console.error('[crm/taches] lecture :', ee.message); return erreur(INDISPONIBLE, 503) }

  if ('depuis_devis' in v.valeur) {
    if (!c.devis_id) return erreur('Ce chantier n’a pas de devis : ajoutez les tâches à la main.', 409)
    // Le devis est relu avec le filtre de la session : un devis_id en base qui ne serait pas à elle ne donne rien.
    const { data: devis } = await supabaseAdmin.from('devis').select('id').eq('id', c.devis_id).eq('artisan_id', g.uid).maybeSingle()
    if (!devis) return erreur('Devis introuvable.', 404)
    const { data: lignes, error: elg } = await supabaseAdmin.from('devis_lignes').select('id, ordre, designation, quantite, unite').eq('devis_id', devis.id)
    if (elg) { console.error('[crm/taches] lignes :', elg.message); return erreur(INDISPONIBLE, 503) }
    const nouvelles = tachesDepuisDevis(lignes ?? [], existantes ?? [])
    if (!nouvelles.length) return json({ ok: true, creees: 0 })
    const { error } = await supabaseAdmin.from('chantier_taches').insert(nouvelles.map((t) => ({ ...t, chantier_id: id, artisan_id: g.uid })))
    if (error) {
      const s = statutErreurBase(error)
      console.error('[crm/taches] génération :', error.message)
      return erreur(s.status === 409 ? 'Les tâches de ce devis viennent d’être générées ailleurs : rechargez la fiche.' : s.message, s.status)
    }
    return json({ ok: true, creees: nouvelles.length }, 201)
  }

  const t = v.valeur
  if (t.membre_id) {
    const { data: m } = await supabaseAdmin.from('equipe_membres').select('id').eq('id', t.membre_id).eq('artisan_id', g.uid).maybeSingle()
    if (!m) return erreur('Membre de l’équipe introuvable.', 404)
  }
  const ordre = t.ordre ?? (existantes ?? []).reduce((m, x) => Math.max(m, Number(x.ordre) || 0), -1) + 1
  const { data, error } = await supabaseAdmin.from('chantier_taches')
    .insert({ ...t, faite_le: t.faite ? new Date().toISOString() : null, ordre, chantier_id: id, artisan_id: g.uid })
    .select('id').single()
  if (error || !data) { const s = statutErreurBase(error); console.error('[crm/taches] création :', error?.message); return erreur(s.message, s.status) }
  return json({ ok: true, id: data.id }, 201)
}
