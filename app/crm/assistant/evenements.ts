'use client'

// L'assistant dans le CRM — les ÉVÉNEMENTS du document qui relient les écrans sans qu'ils se connaissent :
//  • ouvrirAssistant(contexte)  : une fiche, un panneau de la maquette ou une salle d'attente ouvre le panneau de l'assistant, avec l'objet
//                                 ouvert (« ce chantier ») ; le panneau monté dans l'atelier ou la fiche l'écoute ;
//  • surligner(objet)           : l'assistant vient d'agir sur un objet → la maquette le met en évidence 2 à 3 s (Atelier l'écoute) ;
//  • signalerActivite()         : une réponse ou une décision vient d'avoir lieu → le poste des assistants relit son fil d'activité.
import { EV_ACTIVITE, EV_OUVRIR, EV_SURLIGNER, type ContexteAssistant } from '@/lib/crm/assistantCrm'

export type ObjetVise = { type: string; id: string }

export function ouvrirAssistant(contexte: ContexteAssistant | null = null) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ContexteAssistant | null>(EV_OUVRIR, { detail: contexte }))
}

/** Met en évidence, dans la maquette, l'objet (ou les objets) sur lequel l'assistant vient d'agir. */
export function surligner(objet: ObjetVise | readonly ObjetVise[]) {
  if (typeof window === 'undefined') return
  const objets = (Array.isArray(objet) ? objet : [objet]) as ObjetVise[]
  if (!objets.length) return
  window.dispatchEvent(new CustomEvent<ObjetVise[]>(EV_SURLIGNER, { detail: objets }))
}

export function signalerActivite() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EV_ACTIVITE))
}

// ── L'accès de CE compte à l'assistant, publié par le panneau (seul à le lire) pour les boutons « Demander à l'assistant » ──
export type AccesAssistant = 'attente' | 'ok' | 'verrou' | 'absent'
let accesCourant: AccesAssistant = 'attente'
const abonnes = new Set<() => void>()
export function publierAcces(a: AccesAssistant) {
  if (a === accesCourant) return
  accesCourant = a
  for (const f of abonnes) f()
}
export const lireAcces = (): AccesAssistant => accesCourant
export function abonnerAcces(f: () => void): () => void { abonnes.add(f); return () => { abonnes.delete(f) } }
