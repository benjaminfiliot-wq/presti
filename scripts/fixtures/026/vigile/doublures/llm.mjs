// Doublure de lib/agents/moteurs et de lib/agents/llm (contrat de 026-041) pour vigile-qa (026-248). MOTEUR_DE vient de
// __VIGILE_QA__.moteurs quand la sonde le pose, sinon la table du contrat de 026-041, SANS entrée vigile ; creerLecteur
// vient de __VIGILE_QA__.creerLecteur, sinon rend null (aucun moteur joignable). Chaque appel est consigné.
const V = () => (globalThis.__VIGILE_QA__ ??= { drapeaux: {}, sources: {}, appels: [] })
export const MODELE_AGENTS = 'gpt-6-luna'
export const MODELE_REJUGE = 'gpt-6-sol'
const CONTRAT = Object.freeze({
  standardiste: Object.freeze({ moteur: 'codex', modele: 'gpt-6-luna', personnelles: true }),
  facteur: Object.freeze({ moteur: 'codex', modele: 'gpt-6-luna', personnelles: true }),
  douleurs: Object.freeze({ moteur: 'freellmapi', modele: 'auto', personnelles: false }),
})
export const MOTEUR_DE = new Proxy({}, {
  get: (_, k) => (V().moteurs ?? CONTRAT)[k],
  has: (_, k) => k in (V().moteurs ?? CONTRAT),
  ownKeys: () => Reflect.ownKeys(V().moteurs ?? CONTRAT),
  getOwnPropertyDescriptor: (_, k) => Object.getOwnPropertyDescriptor(V().moteurs ?? CONTRAT, k),
})
export const PLAFONDS = Object.freeze({ jetonsSortie: 1024, appelsParExecution: 20, delaiMs: Object.freeze({ codex: 600000, freellmapi: 60000 }), eurosParAppel: 0 })
export function emballerDonnees(d) {
  const t = typeof d === 'string' ? d : JSON.stringify(d)
  return `<donnees>\n${String(t).replace(/<\/?donnees>/g, '')}\n</donnees>`
}
export const retirerCoordonnees = (d) => d
export function creerLecteur(agent, options, deps) {
  V().appels.push({ quoi: 'creerLecteur', agent, options: options ?? null })
  return typeof V().creerLecteur === 'function' ? V().creerLecteur(agent, options, deps) : null
}
