// CRM — le PLAN DU CHANTIER par pièce (plan du 18/10, n°8, version 1 : un schéma, pas un plan à l'échelle). Module pur.
//
// Un devis d'artisan se lit pièce par pièce (cuisine, salle de bain, WC, toiture). Chaque tâche du chantier est rangée dans une
// pièce : celle que l'artisan a choisie (chantier_taches.piece, migration 0166), sinon celle que son libellé nomme (mots-clés
// ci-dessous), sinon celle que nomme le titre du chantier, sinon « Général ». Le schéma montre une case par pièce : à faire, en
// cours ou fini, le pourcentage, l'équipe qui y a des tâches.
export const PIECE_MAX = 40
export const GENERAL = 'Général'

// L'ordre compte : la première pièce reconnue gagne (« meuble de salle de bain dans la chambre » → Salle de bain).
export const PIECES: readonly { nom: string; motif: RegExp }[] = [
  { nom: 'Salle de bain', motif: /salles?\s+de\s+bains?|\bsdb\b|salles?\s+d['’]eau|douche|baignoire|lavabo|vasque|s[èe]che-serviettes/i },
  { nom: 'WC', motif: /\bw\.?c\b|toilettes?|\bcuvette\b|bâti[- ]support|bati[- ]support/i },
  { nom: 'Cuisine', motif: /cuisine|[ée]vier|plan de travail|cr[ée]dence|hotte/i },
  { nom: 'Chambre', motif: /chambres?/i },
  { nom: 'Séjour', motif: /s[ée]jour|salon|living|salle [àa] manger/i },
  { nom: 'Entrée', motif: /\bentr[ée]e\b(?!\s+d['’](eau|air))|\bhall\b/i },
  { nom: 'Couloir', motif: /couloir|d[ée]gagement|palier|escalier/i },
  { nom: 'Garage', motif: /garage|cellier|buanderie|\bcave\b|chaufferie|local technique/i },
  { nom: 'Toiture', motif: /toiture|\btoit\b|couverture|charpente|goutti[èe]re|zinguerie|\btuiles?\b|faîtage|faitage|combles?/i },
  { nom: 'Façade', motif: /fa[çc]ade|ravalement|enduit ext[ée]rieur|bardage/i },
  { nom: 'Extérieur', motif: /ext[ée]rieur|jardin|terrasse|cl[ôo]ture|portail|all[ée]e|piscine/i },
]

/** La pièce que nomme un texte (libellé de tâche, titre de chantier), ou null. */
export function pieceDe(texte: string | null | undefined): string | null {
  if (!texte) return null
  return PIECES.find((p) => p.motif.test(texte))?.nom ?? null
}

/** Nettoie une pièce saisie par l'artisan : espaces resserrés, 40 caractères au plus, vide → null. */
export function nettoyerPiece(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  return s ? [...s].slice(0, PIECE_MAX).join('') : null
}

export type TachePlan = { id: string; libelle: string; faite: boolean | null; membre_id: string | null; piece?: string | null }
export type MembrePlan = { id: string; nom: string }
export type EtatPiece = 'a_faire' | 'en_cours' | 'fini'
export type PiecePlan = {
  nom: string; total: number; faites: number; pct: number; etat: EtatPiece
  /** Les membres qui ont au moins une tâche dans la pièce (avatars du schéma). */
  membres: MembrePlan[]
  taches: (TachePlan & { pieceDevinee: boolean })[]
}

/** Le schéma du chantier : une case par pièce, dans l'ordre où le devis les cite, « Général » en dernier. */
export function planChantier(p: { titre: string | null; taches: readonly TachePlan[]; membres: readonly MembrePlan[] }): PiecePlan[] {
  const parDefaut = pieceDe(p.titre) ?? GENERAL
  const nomDe = new Map(p.membres.map((m) => [m.id, m.nom]))
  const pieces = new Map<string, PiecePlan>()
  for (const t of p.taches) {
    const choisie = nettoyerPiece(t.piece)
    const nom = choisie ?? pieceDe(t.libelle) ?? parDefaut
    const x = pieces.get(nom) ?? { nom, total: 0, faites: 0, pct: 0, etat: 'a_faire' as EtatPiece, membres: [], taches: [] }
    x.total++
    if (t.faite) x.faites++
    if (t.membre_id && nomDe.has(t.membre_id) && !x.membres.some((m) => m.id === t.membre_id)) x.membres.push({ id: t.membre_id, nom: nomDe.get(t.membre_id)! })
    x.taches.push({ ...t, pieceDevinee: !choisie })
    pieces.set(nom, x)
  }
  const liste = [...pieces.values()].map((x) => ({ ...x, pct: Math.round((x.faites / x.total) * 100), etat: (x.faites === 0 ? 'a_faire' : x.faites === x.total ? 'fini' : 'en_cours') as EtatPiece }))
  return [...liste.filter((x) => x.nom !== GENERAL), ...liste.filter((x) => x.nom === GENERAL)]
}

export const LIBELLES_ETAT_PIECE: Record<EtatPiece, string> = { a_faire: 'À faire', en_cours: 'En cours', fini: 'Fini' }
