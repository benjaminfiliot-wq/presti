// lib/crieur/pauseProgrammees.ts — ce que le Crieur fait de ce qui est DÉJÀ programmé quand la pause générale est posée.
//
// Presti ne programme rien lui-même (R24 : lib/crieur/publora.ts ne crée que des brouillons) ; c'est Benj qui programme, dans
// Publora, les brouillons qu'il accorde. Une publication programmée part donc d'elle-même, hors de Vercel : aucune route de
// Presti ne peut l'arrêter, et l'API de Publora n'est pas connue ici pour l'annuler. On ne fabrique pas un geste qu'on ne connaît
// pas : on COMPTE ces publications dans le registre et on PRÉVIENT le fondateur, qui les retire dans Publora (docs/agents/pause-generale.md).
// Un registre illisible n'est pas « zéro publication » : c'est une raison d'échouer, dite.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notifierEntreprise } from '@/lib/email'

export type BilanProgrammees = { ok: true; programmees: number; signalees: boolean } | { ok: false; raison: string }

export async function signalerProgrammees(maintenant: Date = new Date()): Promise<BilanProgrammees> {
  const lecture = await supabaseAdmin
    .from('crieur_posts')
    .select('id,canal,statut,programmee_pour,publora_id')
    .in('statut', ['programmee', 'brouillon_publora'])
    .gt('programmee_pour', maintenant.toISOString())
  if (lecture.error) return { ok: false, raison: 'Registre du Crieur illisible : les publications déjà programmées ne peuvent pas être comptées, vérifier Publora à la main' }
  const lignes = (lecture.data ?? []) as { canal: string; programmee_pour: string; publora_id: string | null }[]
  if (!lignes.length) return { ok: true, programmees: 0, signalees: false }
  const detail = lignes.map((l) => `- ${l.canal} le ${l.programmee_pour} (Publora : ${l.publora_id ?? 'inconnu'})`).join('\n')
  const envoi = await notifierEntreprise(
    `Pause générale : ${lignes.length} publication(s) déjà programmée(s) restent actives`,
    `La pause générale est posée : le Crieur ne dépose plus rien. Ces publications, programmées dans Publora, partiront quand même si elles ne sont pas retirées dans Publora :\n${detail}`,
  )
  return { ok: true, programmees: lignes.length, signalees: envoi.ok }
}
