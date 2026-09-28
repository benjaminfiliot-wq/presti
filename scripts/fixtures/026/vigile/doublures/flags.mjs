// Doublure de lib/flags pour vigile-qa (026-248) : __VIGILE_QA__.drapeaux dit quels drapeaux sont levés (les autres sont
// baissés). Chaque lecture par actif() est consignée.
const V = () => (globalThis.__VIGILE_QA__ ??= { drapeaux: {}, sources: {}, appels: [] })
export const FLAGS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? V().drapeaux?.[k] === true : undefined) })
export const actif = (f) => { V().appels.push({ quoi: 'flags.actif', drapeau: f }); return V().drapeaux?.[f] === true }
