// 026-178 — le Chantier du code : pilotage_code_lire() (026-076), le relevé du poste validé par validerSnapshot puis résumé par
// resumeCode (026-017) : la file, les tâches en cours, les derniers verdicts. Un relevé refusé est « aucun relevé », jamais une valeur
// recopiée à la main. Sous `sante`.
import type { Contexte } from '../station'
import { validerSnapshot, resumeCode } from '../code'
import { premiere } from './outils'

export async function lire(c: Contexte) {
  const x = premiere(await c.rpc('pilotage_code_lire'))
  return resumeCode(validerSnapshot(x?.etat ?? null), x?.publie_le ?? null, c.maintenant)
}
