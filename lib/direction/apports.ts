// Le Registre des apports : ce qui compte, et pourquoi (contrat art. 5 ; demande de Benj du 07/09).
//
// Une seule règle, ici, réutilisée telle quelle par l'écran, par le relevé mensuel (J4) et par les tests. Elle
// rend TOUJOURS une raison lisible : Benj doit pouvoir dire à Alexandre, ligne par ligne, pourquoi elle compte
// ou non — et Alexandre doit pouvoir la lire lui-même.
export type Statut = 'prouve' | 'saisi' | 'declare' | 'conteste' | 'retire'

export type LigneApport = {
  id: string
  artisan_id: string
  statut: Statut
  preuve: { code?: string; arrivee?: string; page?: string | null; inscription?: string; source?: string } | null
  piece: string | null
  motif: string | null
  premier_contact_le: string | null
  souscrit_le: string | null
  offre_souscription: string | null
}

export type Verdict = { compte: boolean; taux: number; raison: string }

/**
 * Compte-t-elle, et à quel taux ?
 *  • prouvé / saisi : oui, 20 % (le serveur a constaté l'arrivée) ;
 *  • déclaré AVEC pièce : oui, 20 % (Benj l'atteste, la pièce est au dossier) ;
 *  • déclaré SANS pièce : non — c'est exactement ce que « avec preuve » veut dire ;
 *  • contesté : oui, 10 % (art. 5 : en cas de désaccord, la commission est ramenée à 10 %) ;
 *  • retiré : non.
 */
export function verdict(l: Pick<LigneApport, 'statut' | 'piece' | 'motif'>): Verdict {
  switch (l.statut) {
    case 'prouve': return { compte: true, taux: 0.2, raison: 'Prouvé : arrivé par le lien d’apport, empreinte vérifiée par le serveur.' }
    case 'saisi': return { compte: true, taux: 0.2, raison: 'Code d’apport saisi par l’artisan à son inscription.' }
    case 'declare': return l.piece && l.piece.trim()
      ? { compte: true, taux: 0.2, raison: 'Déclaré, avec pièce au dossier.' }
      : { compte: false, taux: 0, raison: 'Déclaré sans pièce : ne compte pas tant qu’une pièce n’est pas jointe.' }
    case 'conteste': return { compte: true, taux: 0.1, raison: `Contesté${l.motif ? ` : ${l.motif}` : ''} — commission ramenée à 10 % (contrat, art. 5).` }
    case 'retire': return { compte: false, taux: 0, raison: `Retiré du registre${l.motif ? ` : ${l.motif}` : ''}.` }
    default: return { compte: false, taux: 0, raison: 'Statut inconnu.' }
  }
}

const LIBELLES: Record<Statut, string> = { prouve: 'Prouvé', saisi: 'Code saisi', declare: 'Déclaré', conteste: 'Contesté', retire: 'Retiré' }
export const libelleStatut = (s: Statut) => LIBELLES[s] ?? s

/** Une preuve en une phrase, pour l'écran — sans jargon et sans rien inventer. */
export function preuveLisible(l: Pick<LigneApport, 'statut' | 'preuve' | 'piece'>): string {
  const p = l.preuve
  if (l.statut === 'prouve' && p?.arrivee) {
    const arrivee = new Date(p.arrivee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const inscription = p.inscription ? new Date(p.inscription).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null
    return `Arrivé par le lien le ${arrivee}${inscription ? `, inscrit le ${inscription}` : ''}${p.page ? ` (depuis ${p.page})` : ''}.`
  }
  if (l.statut === 'saisi') return 'Code d’apport saisi à l’inscription.'
  if (l.statut === 'declare') return l.piece?.trim() ? `Pièce : ${l.piece}` : 'Aucune pièce jointe.'
  return '—'
}
