// Le passage QUOTIDIEN de l'après-chantier (plan du 18/10, n°7) : pour chaque artisan qui l'a activé (crm_apres_chantier,
// migration 0165) et dont l'offre porte le CRM, il pose les rappels « Demander un avis » et « Proposer l'entretien » de ses
// chantiers terminés (crm_rappels, origine « systeme », clé unique : jamais deux fois le même). Il N'ENVOIE RIEN au client :
// l'artisan relit et confirme chaque message (POST /api/crm/apres-chantier/message). Appelé par app/api/cron/relances AVANT le
// passage du matin des rappels, pour que la notification du matin les compte.
//
// La règle est pure (lib/apresChantier.ts, propositions) ; la lecture et l'écriture sont injectées pour le test
// (scripts/crm-lot4-qa.mjs).
import { peut } from '@/lib/plans'
import { ajouterMois, ENTRETIEN_ANS_MAX, propositions, type ChantierApres, type Proposition, type ReglagesApres } from '@/lib/apresChantier'

type Erreur = { code?: string; message: string } | null
export type LigneReglages = ReglagesApres & { artisan_id: string }
export type DependancesApres = {
  lireReglages: () => Promise<{ data: LigneReglages[] | null; error: Erreur }>
  lirePlans: (ids: string[]) => Promise<{ data: { id: string; plan: string | null; is_founder?: boolean | null }[] | null; error: Erreur }>
  /** Les chantiers TERMINÉS du compte finis depuis `depuis` (avec l'objet du devis et les désignations, pour l'équipement). */
  lireChantiers: (artisanId: string, depuis: string) => Promise<{ data: ChantierApres[] | null; error: Erreur }>
  /** Les clés des rappels de l'après-chantier déjà posés par le compte (« avis:… », « entretien:… »). */
  lireCles: (artisanId: string) => Promise<{ data: string[] | null; error: Erreur }>
  poser: (artisanId: string, lignes: Proposition[]) => Promise<{ error: Erreur }>
}

const absente = (e: Erreur) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))
/** Au plus tant de rappels posés par compte et par passage : un compte qui active avec 300 vieux chantiers n'est pas noyé. */
export const MAX_POSES_PAR_PASSAGE = 20

export async function tourApresChantier(jour: string, dep: DependancesApres): Promise<{ comptes: number; poses: number; erreurs: string[]; installe: boolean }> {
  const r = await dep.lireReglages()
  if (r.error) return absente(r.error) ? { comptes: 0, poses: 0, erreurs: [], installe: false } : { comptes: 0, poses: 0, erreurs: [r.error.message], installe: true }
  const actifs = (r.data ?? []).filter((x) => x.avis || x.entretien)
  if (!actifs.length) return { comptes: 0, poses: 0, erreurs: [], installe: true }
  const plans = await dep.lirePlans(actifs.map((x) => x.artisan_id))
  if (plans.error) return { comptes: actifs.length, poses: 0, erreurs: [plans.error.message], installe: true }
  const planDe = new Map((plans.data ?? []).map((p) => [p.id, p]))
  const depuis = ajouterMois(jour, -12 * ENTRETIEN_ANS_MAX)
  let poses = 0, comptes = 0
  const erreurs: string[] = []
  for (const reg of actifs) {
    const p = planDe.get(reg.artisan_id)
    if (!p || (!p.is_founder && !peut(p.plan ?? null, 'crm'))) continue
    comptes++
    try {
      const [ch, cles] = await Promise.all([dep.lireChantiers(reg.artisan_id, depuis), dep.lireCles(reg.artisan_id)])
      if (ch.error || cles.error) { erreurs.push(`${reg.artisan_id.slice(0, 8)} : ${(ch.error ?? cles.error)!.message}`); continue }
      const aPoser = propositions({ chantiers: ch.data ?? [], reglages: reg, existantes: new Set(cles.data ?? []), jour })
        .sort((a, b) => a.echeance.localeCompare(b.echeance)).slice(0, MAX_POSES_PAR_PASSAGE)
      if (!aPoser.length) continue
      const w = await dep.poser(reg.artisan_id, aPoser)
      if (w.error) { erreurs.push(`${reg.artisan_id.slice(0, 8)} : ${w.error.message}`); continue }
      poses += aPoser.length
    } catch (e) { erreurs.push(e instanceof Error ? e.message : String(e)) }
  }
  return { comptes, poses, erreurs, installe: true }
}
