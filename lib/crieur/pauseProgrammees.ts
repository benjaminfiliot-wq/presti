// La pause remet les publications connues en brouillon chez Publora avant de modifier le registre.
// Un échec externe ou local est déclaré ; aucune programmation inconnue n'est considérée suspendue.
import { suspendrePublication } from '@/lib/crieur/publora'

type Ligne = { id: string; canal: string; statut: string; raisons?: string[]; programmee_pour: string | null; publora_id: string | null }
type Deps = {
  lire: () => Promise<{ data: Ligne[] | null; error: unknown }>
  inscrire: (id: string) => Promise<{ error: unknown }>
  suspendre: (id: string) => Promise<void>
  notifier: (titre: string, texte: string) => Promise<{ ok: boolean }>
}
export type BilanProgrammees = { ok: true; programmees: number; suspendues: number; signalees: boolean } | { ok: false; raison: string }

export async function signalerProgrammees(maintenant: Date = new Date(), deps?: Deps): Promise<BilanProgrammees> {
  if (!deps) {
    const [{ supabaseAdmin }, { notifierEntreprise }] = await Promise.all([import('@/lib/supabaseAdmin'), import('@/lib/email')])
    deps = {
      lire: async () => await supabaseAdmin.from('crieur_posts').select('id,canal,statut,raisons,programmee_pour,publora_id').in('statut', ['programmee', 'brouillon_publora', 'erreur']),
      inscrire: async (id) => {
        const r = await supabaseAdmin.from('crieur_posts').update({ statut: 'brouillon_publora', programmee_pour: null, raisons: [] }).eq('id', id).select('id').maybeSingle()
        return { error: r.error || (r.data?.id !== id ? new Error('ligne suspendue non confirmee') : null) }
      },
      suspendre: suspendrePublication, notifier: notifierEntreprise,
    }
  }
  let lecture
  try { lecture = await deps.lire() } catch { return { ok: false, raison: 'Registre du Crieur illisible : suspension des publications non confirmée' } }
  if (lecture.error || !Array.isArray(lecture.data)) return { ok: false, raison: 'Registre du Crieur illisible : suspension des publications non confirmée' }
  const echecs: string[] = []
  let suspendues = 0
  let programmees = 0
  for (const l of lecture.data) {
    const incertaine = ['brouillon_publora', 'erreur'].includes(l.statut) && l.raisons?.some(r => ['programmation_en_cours', 'programmation_non_confirmee'].includes(r))
    // Les brouillons simples et les publications passees ne sont pas programmes
    // a suspendre. Une demande de programmation ambigue reste suivie explicitement.
    if (l.statut !== 'programmee' && !incertaine) continue
    const date = Date.parse(l.programmee_pour ?? '')
    if (Number.isFinite(date) && date <= maintenant.getTime()) continue
    programmees++
    try {
      if (!Number.isFinite(date)) throw new Error('date de programmation illisible')
      if (!l.publora_id) throw new Error('identifiant Publora absent')
      await deps.suspendre(l.publora_id)
      const inscription = await deps.inscrire(l.id)
      if (inscription.error) throw new Error('suspension externe confirmée mais registre non mis à jour')
      suspendues++
    } catch (e) { echecs.push(`${l.canal} : ${e instanceof Error ? e.message : 'suspension non confirmée'}`) }
  }
  if (echecs.length) {
    try { await deps.notifier('Pause générale : suspension Crieur incomplète', echecs.join('\n')) } catch { /* l'echec de suspension reste declare */ }
    return { ok: false, raison: `${echecs.length} publication(s) non confirmée(s) suspendue(s) : ${echecs.join('; ')}` }
  }
  return { ok: true, programmees, suspendues, signalees: false }
}
