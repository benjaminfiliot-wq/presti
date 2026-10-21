// L'assistant de gestion — l'AVANCEMENT d'un chantier dit en une phrase (décision du fondateur du 21/10, B1). Module pur.
//
// « Chantier Dupont : carrelage salle de bain fini » → quelles tâches de CE chantier cocher ? Règle : on ne coche que ce qui
// correspond SANS ambiguïté ; sinon rien n'est coché et la liste des candidates part au modèle, qui demande à l'artisan.
//  • la PIÈCE dite (« salle de bain », « cuisine »…) se reconnaît avec la même table que le plan du chantier (lib/crm/plan.ts) ; la
//    pièce d'une tâche est celle que l'artisan a choisie, sinon celle que son libellé nomme ;
//  • les MOTS du travail (« carrelage », « faïence », « pose »…) doivent TOUS se retrouver dans le libellé (début de mot, accents et
//    casse ignorés, pluriel toléré) ;
//  • pièce seule (« la salle de bain est finie ») : toutes les tâches à faire de la pièce ;
//  • mots sans pièce, et les tâches trouvées sont dans PLUSIEURS pièces : ambigu (on ne coche pas la cuisine pour la salle de bain) ;
//  • des tâches qui ne portent qu'une partie des mots : ambigu (candidates rendues) ; aucune : rien.
import { pieceDe } from '@/lib/crm/plan'
import { avancement } from '@/lib/crm/chantier'

export type TacheAvancement = { id: string; libelle: string; faite: boolean | null; piece?: string | null }

export type Correspondance =
  | { statut: 'net'; taches: TacheAvancement[]; piece: string | null; mots: string[] }
  | { statut: 'ambigu'; candidates: TacheAvancement[]; raison: string; piece: string | null; mots: string[] }
  | { statut: 'rien'; raison: string; piece: string | null; mots: string[] }

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Les mots qui ne disent pas QUEL travail : l'état (fini, terminé), les liaisons, le mot « chantier ». */
const VIDES = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une', 'et', 'a', 'au', 'aux', 'en', 'est', 'sont', 'c', 'ca', 'cest', 'on', 'a', 'ete', 'tout', 'toute',
  'tous', 'toutes', 'fini', 'finie', 'finis', 'finies', 'finit', 'termine', 'terminee', 'termines', 'terminees', 'fait', 'faite', 'faits', 'faites', 'acheve',
  'achevee', 'acheves', 'boucle', 'bouclee', 'ok', 'bon', 'bonne', 'pour', 'sur', 'dans', 'chez', 'chantier', 'travaux', 'travail', 'partie', 'aujourd', 'hui',
  'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'nous', 'vous', 'il', 'ils', 'elle', 'elles', 'j', 'je', 'avons', 'avez', 'ont', 'ai',
  'deja', 'maintenant', 'enfin', 'bien', 'aussi', 'plus', 'reste', 'piece', 'pieces',
])

/** Les mots de la pièce citée sont retirés des mots du travail (« salle de bain » n'est pas un travail). */
function sansMotsDePiece(texte: string): string {
  return texte
    .replace(/salles?\s+de\s+bains?|\bsdb\b|salles?\s+d['’ ]?eau/gi, ' ')
    .replace(/\bw\.?c\b|toilettes?/gi, ' ')
    .replace(/\b(cuisine|chambres?|s[ée]jour|salon|entr[ée]e|couloir|garage|toiture|toit|fa[çc]ade|ext[ée]rieur|jardin|terrasse)\b/gi, ' ')
}

/** Les mots du travail, normalisés (sans accent, minuscules), de 3 lettres au moins, hors mots vides. */
export function motsDuTravail(phrase: string): string[] {
  const n = sansAccent(sansMotsDePiece(phrase)).replace(/[^a-z0-9]+/g, ' ').trim()
  const mots = n.split(' ').filter((m) => m.length >= 3 && !VIDES.has(m))
  return [...new Set(mots)]
}

/** Un mot cherché se retrouve dans un libellé : au début d'un mot du libellé, pluriel (s, x) toléré, 5 lettres suffisent. */
export function motDans(mot: string, libelle: string): boolean {
  const racine = mot.replace(/(s|x)$/, '')
  const r = racine.length > 6 ? racine.slice(0, Math.max(5, racine.length - 2)) : racine
  const l = sansAccent(libelle).replace(/[^a-z0-9]+/g, ' ')
  return l.split(' ').some((w) => w.startsWith(r))
}

/** La pièce d'une tâche : celle choisie par l'artisan, sinon celle que nomme le libellé. */
export const pieceDeTache = (t: TacheAvancement): string | null => (t.piece && t.piece.trim()) || pieceDe(t.libelle)

export function correspondanceAvancement(taches: readonly TacheAvancement[], phrase: string): Correspondance {
  const piece = pieceDe(phrase)
  const mots = motsDuTravail(phrase)
  const base = { piece, mots }
  if (!piece && !mots.length) return { statut: 'rien', raison: 'La phrase ne dit ni quel travail ni quelle pièce.', ...base }
  const dansLaPiece = piece ? taches.filter((t) => pieceDeTache(t) === piece) : [...taches]
  if (piece && !dansLaPiece.length) return { statut: 'rien', raison: `Aucune tâche de ce chantier n'est rangée dans « ${piece} ».`, ...base }

  // Pièce seule : toutes les tâches de la pièce.
  if (!mots.length) {
    const aFaire = dansLaPiece.filter((t) => !t.faite)
    return aFaire.length ? { statut: 'net', taches: aFaire, ...base } : { statut: 'rien', raison: `Toutes les tâches de « ${piece} » sont déjà faites.`, ...base }
  }

  const completes = dansLaPiece.filter((t) => mots.every((m) => motDans(m, t.libelle)))
  const partielles = dansLaPiece.filter((t) => !completes.includes(t) && mots.some((m) => motDans(m, t.libelle)))
  if (!completes.length) {
    return partielles.length
      ? { statut: 'ambigu', candidates: partielles, raison: 'Aucune tâche ne correspond à tous les mots : lesquelles cocher ?', ...base }
      : { statut: 'rien', raison: 'Aucune tâche de ce chantier ne correspond.', ...base }
  }
  const aFaire = completes.filter((t) => !t.faite)
  if (!aFaire.length) return { statut: 'rien', raison: 'Les tâches correspondantes sont déjà faites.', ...base }
  // Sans pièce dite, des tâches de plusieurs pièces : on ne choisit pas à la place de l'artisan.
  if (!piece) {
    const pieces = new Set(aFaire.map((t) => pieceDeTache(t) ?? '—'))
    if (pieces.size > 1) return { statut: 'ambigu', candidates: aFaire, raison: `Ces tâches sont dans plusieurs pièces (${[...pieces].join(', ')}) : laquelle ?`, ...base }
  }
  return { statut: 'net', taches: aFaire, ...base }
}

/** L'avancement d'un chantier : LA règle de la fiche (lib/crm/chantier.ts avancement), pas une copie. */
export const pctAvancement = (taches: readonly { faite: boolean | null }[]): number | null => avancement(taches).pct
