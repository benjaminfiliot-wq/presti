// Le journal des doublures du lot 04 (026-045) : globalThis.__JUGE_045__, partagé entre le juge (dans la sonde) et les
// doublures. Chaque appel est consigné { rang, quoi, args } ; la configuration du cas (J.config) dit ce que rend chaque doublure.
export const J = () => (globalThis.__JUGE_045__ ??= { seq: 0, appels: [], emails: [], config: {} })
// le rang vient du compteur de la sonde du lot 03 (__JUGE_026__.seq) quand il existe : le faux PostgREST de la sonde le
// partage, ce qui met les appels des doublures et les appels SQL sur une seule ligne de temps
const rang = () => { const g = globalThis.__JUGE_026__; if (g && typeof g.seq === 'number') return ++g.seq; return ++J().seq }
export function noter(quoi, args) {
  const j = J()
  const a = { rang: rang(), quoi, args: JSON.parse(JSON.stringify(args ?? null)) }
  j.appels.push(a)
  return a
}
/** Avance l'horloge simulée de `ms` (une doublure qui « dure ») ; sans horloge simulée, rien. */
export function durer(ms) {
  const h = globalThis.__HORLOGE_SIMULEE__
  if (ms > 0 && h && h.estFigee()) h.avancer(ms)
}
/** Le comportement configuré pour `quoi` : { erreur?: string, dureeMs?: number, rend?: any }. */
export async function jouer(quoi, args, defaut) {
  noter(quoi, args)
  const c = J().config?.[quoi] ?? {}
  durer(c.dureeMs ?? 0)
  if (c.erreur) throw new Error(c.erreur)
  return c.rend !== undefined ? c.rend : typeof defaut === 'function' ? defaut() : defaut
}
