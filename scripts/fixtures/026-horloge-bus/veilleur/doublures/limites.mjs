// Doublure de lib/limites (026-045), pour tic-qa : consommerLimite tient une vraie fenêtre glissante par clé, sur l'horloge
// simulée (comme consommer_limite de 0049), et consigne chaque clé demandée.
import { J, noter } from './commun-doublures.mjs'

const vus = () => (J().limites ??= {})
export async function consommerLimite(cle, max, fenetreSec) {
  noter('limites.consommerLimite', { cle, max, fenetreSec })
  const t = Date.now()
  const l = (vus()[cle] ?? []).filter((x) => x > t - Number(fenetreSec) * 1000)
  const ok = l.length < Number(max)
  if (ok) l.push(t)
  vus()[cle] = l
  return ok
}
export async function limiteAtteinte(cle, max, fenetreSec) {
  noter('limites.limiteAtteinte', { cle, max, fenetreSec })
  const t = Date.now()
  return (vus()[cle] ?? []).filter((x) => x > t - Number(fenetreSec) * 1000).length >= Number(max)
}
export const cleEmail = (prefixe) => `${prefixe}:empreinte-du-juge`
