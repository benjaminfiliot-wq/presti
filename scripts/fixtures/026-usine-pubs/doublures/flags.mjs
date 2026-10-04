// Doublure de lib/flags.ts : le juge lève ou baisse `busAgents` (U().drapeaux) ; chaque lecture est consignée.
import { U, noter } from './etat.mjs'
export const FLAGS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? U().drapeaux[k] !== false : undefined) })
export const actif = (nom) => { noter('flags.actif', { drapeau: nom }); return U().drapeaux[nom] !== false }
