// Vidéos d'explication du centre d'aide (/aide) : une capture de l'écran réel par fonctionnalité du menu.
//
// Source unique : lib/aide-videos.json. Les `etapes` sont À LA FOIS les cartons d'étape de la vidéo
// (scripts/aide-videos-anime.mjs : motion design + voix) et la liste écrite sous elle dans le centre d'aide : un seul texte, jamais deux.
// Les fichiers vivent dans public/aide-videos/<id>.mp4 + <id>.webp (affiche) ; scripts/aide-videos-qa.mjs vérifie le tout.
// Règle de la vitrine (mémoire « Presti — règle vitrine ») : une fonctionnalité du menu sans vidéo fait échouer ce test.

import data from './aide-videos.json'
import { enEssai, type Flag } from './flags'

export type AideVideo = {
  id: string
  titre: string
  /** L'écran de la console (sans paramètre) : le lien « Ouvrir l'écran » du centre d'aide. */
  route: string
  /** Offre minimale qui donne accès à l'écran. */
  offre: 'essentiel' | 'studio' | 'signature'
  /** Phrase en plus pour ce qui ne tient pas dans une offre (le site se commande à part). */
  note?: string
  /** Le drapeau qui cache l'entrée de menu : sans lui, la vidéo n'est pas proposée non plus. */
  drapeau?: Flag
  resume: string
  etapes: string[]
  /** Ce que dit la voix de la vidéo : une phrase d'intro, une par étape (écrite pour l'oreille), une de fin. */
  voix?: { intro: string; etapes: string[]; fin: string }
  /** Durée du fichier, en secondes (écrite par le montage). */
  duree?: number
}

export const VIDEOS = data.videos as AideVideo[]

export const urlVideo = (v: AideVideo): string => `/aide-videos/${v.id}.mp4`
export const urlAffiche = (v: AideVideo): string => `/aide-videos/${v.id}.webp`

/** Les vidéos dont l'écran existe dans le menu de CE compte (drapeaux). */
export const videosVisibles = (): AideVideo[] => VIDEOS.filter((v) => !v.drapeau || enEssai(v.drapeau))

/** La vidéo de l'écran courant (`/devis/abc` → celle de `/devis`), la route la plus précise d'abord. */
export function videoPour(chemin: string): AideVideo | null {
  const base = chemin.split('?')[0]
  const candidats = videosVisibles().filter((v) => base === v.route || base.startsWith(v.route + '/'))
  return candidats.sort((a, b) => b.route.length - a.route.length)[0] ?? null
}

/** « 0:36 » */
export const dureeTexte = (s?: number): string => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '')
