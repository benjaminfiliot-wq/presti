// Doublure de lib/flags pour agents-routes-qa (026-038) : __JUGE_026__.drapeaux dit quels drapeaux sont levés (les autres
// sont baissés). Chaque lecture par actif() est consignée.
const J = () => (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
export const FLAGS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? J().drapeaux?.[k] === true : undefined) })
export const actif = (f) => { const j = J(); j.doublures.push({ rang: ++j.seq, quoi: 'flags.actif', drapeau: f }); return j.drapeaux?.[f] === true }
