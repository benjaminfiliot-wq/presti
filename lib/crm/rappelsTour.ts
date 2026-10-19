// Le passage du MATIN des rappels du CRM (plan du 18/10, n°1) : chaque artisan dont des rappels arrivent à échéance aujourd'hui (ou
// sont en retard) reçoit UNE notification sur ses appareils (« 3 rappels aujourd'hui, dont 1 en retard »), qui ouvre son tableau de
// bord. Appelé par le passage quotidien (app/api/cron/relances, 8 h) ; jamais sous pause générale. Rien d'autre ne part : aucun
// e-mail, aucun message au client. Seulement les comptes dont l'offre porte le CRM (lib/plans.ts, capacité `crm`).
//
// La règle est pure (resumeDuMatin) ; la lecture et l'envoi sont injectés pour le test (scripts/crm-lot2-qa.mjs).
import { peut } from '@/lib/plans'

export type RappelDuMatin = { artisan_id: string; echeance: string }
export type ResumeMatin = { artisanId: string; total: number; enRetard: number }

/** Les rappels ouverts dus aujourd'hui ou avant, regroupés par artisan. */
export function resumeDuMatin(rappels: readonly RappelDuMatin[], jour: string): ResumeMatin[] {
  const par = new Map<string, ResumeMatin>()
  for (const r of rappels) {
    if (r.echeance > jour) continue
    const x = par.get(r.artisan_id) ?? { artisanId: r.artisan_id, total: 0, enRetard: 0 }
    x.total++
    if (r.echeance < jour) x.enRetard++
    par.set(r.artisan_id, x)
  }
  return [...par.values()].sort((a, b) => a.artisanId.localeCompare(b.artisanId))
}

export const texteMatin = (r: ResumeMatin): { titre: string; ligne: string } => ({
  titre: 'À faire aujourd’hui',
  ligne: `${r.total} rappel${r.total > 1 ? 's' : ''}${r.enRetard ? `, dont ${r.enRetard} en retard` : ''} : ouvrez votre tableau de bord.`,
})

export type DependancesTour = {
  lireRappels: (jour: string) => Promise<{ data: RappelDuMatin[] | null; error: { code?: string; message: string } | null }>
  lirePlans: (ids: string[]) => Promise<{ data: { id: string; plan: string | null }[] | null; error: { message: string } | null }>
  envoyer: (artisanId: string, charge: { titre: string; ligne: string; url: string; tag: string }) => Promise<{ envoyes: number; raison?: string }>
}

export async function tourRappels(jour: string, dep: DependancesTour): Promise<{ comptes: number; notifies: number; erreurs: string[]; installe: boolean }> {
  const lu = await dep.lireRappels(jour)
  if (lu.error) {
    // Table absente (0162 non appliquée) : rien à faire, ce n'est pas une panne.
    if (['42P01', 'PGRST205'].includes(String(lu.error.code))) return { comptes: 0, notifies: 0, erreurs: [], installe: false }
    return { comptes: 0, notifies: 0, erreurs: [lu.error.message], installe: true }
  }
  const resumes = resumeDuMatin(lu.data ?? [], jour)
  if (!resumes.length) return { comptes: 0, notifies: 0, erreurs: [], installe: true }
  const plans = await dep.lirePlans(resumes.map((r) => r.artisanId))
  if (plans.error) return { comptes: resumes.length, notifies: 0, erreurs: [plans.error.message], installe: true }
  const planDe = new Map((plans.data ?? []).map((p) => [p.id, p.plan]))
  let notifies = 0
  const erreurs: string[] = []
  for (const r of resumes) {
    if (!peut(planDe.get(r.artisanId) ?? null, 'crm')) continue
    try {
      const res = await dep.envoyer(r.artisanId, { ...texteMatin(r), url: '/crm?vue=tableau', tag: 'crm-rappels-matin' })
      if (res.envoyes > 0) notifies++
    } catch (e) { erreurs.push(e instanceof Error ? e.message : String(e)) }
  }
  return { comptes: resumes.length, notifies, erreurs, installe: true }
}
