// L'état partagé des doublures d'une sonde (026-199) : le juge le règle entre deux appels, les doublures le lisent et consignent
// ce qu'une route leur demande, dans l'ordre (le juge compte, il ne croit pas la route).
export const U = () => (globalThis.__UP_JUGE__ ??= {
  drapeaux: { busAgents: true },
  agents: new Map(), // jeton → { nom, en_pause }
  pause: { active: false },
  journal: [], // { quoi, … } dans l'ordre des appels aux doublures
})
export const noter = (quoi, extra = {}) => { U().journal.push({ quoi, ...extra }) }
