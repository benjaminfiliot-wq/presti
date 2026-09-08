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
  /** Le taux décidé par Benjamin pour CET apport (0077). NULL = il n'a rien décidé. */
  taux_pct?: number | null
}

// `tauxPct` et non `taux` : un pourcentage ENTIER (20, 10, 0). Le nom porte l'unité parce que
// l'ancien ne la portait pas — verdict() rendait 0.2, le relevé le redivisait par 100, et la
// commission d'Alexandre valait douze centimes au lieu de onze euros quatre-vingts.
export type Verdict = { compte: boolean; tauxPct: number; raison: string }

/**
 * Compte-t-elle, et à quel taux ?
 *  • prouvé / saisi : oui, 20 % (le serveur a constaté l'arrivée) ;
 *  • déclaré AVEC pièce : oui, 20 % (Benj l'atteste, la pièce est au dossier) ;
 *  • déclaré SANS pièce : non — c'est exactement ce que « avec preuve » veut dire ;
 *  • contesté : oui, 10 % (art. 5 : en cas de désaccord, la commission est ramenée à 10 %) ;
 *  • retiré : non.
 */
/** Les bornes du contrat (art. 5) : Benjamin décide entre les deux, jamais en dehors. */
export const TAUX_MIN = 10
export const TAUX_PLEIN = 20
export const TAUX_CONTESTE = 10
export const tauxValide = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= TAUX_MIN && n <= TAUX_PLEIN

export function verdict(l: Pick<LigneApport, 'statut' | 'piece' | 'motif'> & { taux_pct?: number | null }): Verdict {
  // Le taux décidé prime sur le taux par défaut — c'est le sens de la fourchette du contrat. Mais
  // un apport CONTESTÉ reste plafonné à 10 % quoi qu'il y ait dans le réglage : le contrat prime
  // sur la décision, sinon la clause de désaccord ne servirait à rien.
  const choisi = tauxValide(l.taux_pct) ? l.taux_pct : null
  const plein = choisi ?? TAUX_PLEIN
  const conteste = Math.min(choisi ?? TAUX_CONTESTE, TAUX_CONTESTE)
  const dit = (n: number) => (choisi === null ? '' : ` (taux réglé à ${n} %)`)
  switch (l.statut) {
    case 'prouve': return { compte: true, tauxPct: plein, raison: `Prouvé : arrivé par le lien d’apport, empreinte vérifiée par le serveur.${dit(plein)}` }
    case 'saisi': return { compte: true, tauxPct: plein, raison: `Code d’apport saisi par l’artisan à son inscription.${dit(plein)}` }
    case 'declare': return l.piece && l.piece.trim()
      ? { compte: true, tauxPct: plein, raison: `Déclaré, avec pièce au dossier.${dit(plein)}` }
      : { compte: false, tauxPct: 0, raison: 'Déclaré sans pièce : ne compte pas tant qu’une pièce n’est pas jointe.' }
    case 'conteste': return { compte: true, tauxPct: conteste, raison: `Contesté${l.motif ? ` : ${l.motif}` : ''} — commission ramenée à ${conteste} % (contrat, art. 5).` }
    case 'retire': return { compte: false, tauxPct: 0, raison: `Retiré du registre${l.motif ? ` : ${l.motif}` : ''}.` }
    default: return { compte: false, tauxPct: 0, raison: 'Statut inconnu.' }
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
