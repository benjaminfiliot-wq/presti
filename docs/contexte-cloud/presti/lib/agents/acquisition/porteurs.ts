// lib/agents/acquisition/porteurs.ts — l'interface d'un porteur d'envoi (fiche 026-089) : TYPES SEULEMENT, aucun appel réseau.
//
// Un porteur emmène un message approuvé jusqu'à son destinataire par UN canal. Le Facteur (facteur.ts) n'en connaît que
// cette forme ; le porteur Gmail (porteurs/gmail.ts) est le seul écrit ici. Le porteur du formulaire, lui, tourne sur
// l'usine (026-095) et n'est jamais appelé par le Facteur.
import type { Canal } from './contrat'

/** Une pièce jointe : le chemin d'un MP4 dans le bucket privé `packs-pubs`, jamais un fichier du disque. */
export interface PieceJointe {
  chemin_bucket: string
  nom: string
}

export interface MessageSortant {
  a: string
  objet: string | null
  texte: string
  /** Le Message-ID du courriel auquel on répond (fil), sinon null. */
  enReponseA: string | null
  /** Les Message-ID du fil, du plus ancien au plus récent. */
  references: string[]
  /** Une seule pièce jointe au plus. */
  pieceJointe?: PieceJointe
}

export type ErreurPorteur = 'auth' | 'quota' | 'injoignable' | 'refus'

export type ResultatPorteur =
  | { ok: true; id_externe: string; entetes: Record<string, string> }
  | { ok: false; erreur: ErreurPorteur; definitif: boolean }

export interface Porteur {
  canal: Canal
  /** Ne lève jamais : toute panne est rendue en `{ ok: false }`. */
  envoyer(m: MessageSortant): Promise<ResultatPorteur>
}
