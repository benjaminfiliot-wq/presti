// Le relevé mensuel du partenaire (contrat, article 4.2 — prompt v11 §3).
//
// Ce fichier calcule ce que Presti doit à Alexandre pour un mois donné. C'est de l'argent réel entre
// deux personnes qui travaillent ensemble : il vaut mieux qu'il soit juste, lisible, et qu'il se
// vérifie à la main en deux minutes.
//
// LA FORMULE, retrouvée sur les trois cas de l'annexe A du contrat et prouvée par la suite :
//
//   résultat distribuable  R = chiffre d'affaires encaissé NET des remboursements − coûts directs
//   commission             C = 20 % du chiffre d'affaires encaissé des clients APPORTÉS
//   base d'intéressement   B = R − C
//   intéressement          I = 20 % × B
//   part de Benjamin           80 % × B
//   TOTAL DÛ À ALEXANDRE   C + I
//
// Le point qui n'a rien d'évident : la commission porte sur le CHIFFRE D'AFFAIRES du client apporté,
// pas sur le résultat. Dans le premier cas de l'annexe A, elle vaut 20 % de 59 € — soit 11,80 € — et
// non 20 % des 51 € de résultat, qui donneraient 18,36 € au partenaire au lieu de 19,64 €. La
// différence est de 1,28 € sur un client ; elle se compte en centaines d'euros sur une année.
//
// (Écrire « C + 20 % × (R − C) » ou « 20 % × R + 80 % × C » revient au même : ces deux expressions
// sont égales. Ce n'est donc PAS là qu'est la subtilité, contrairement à ce qu'on pourrait croire.)
//
// Vérification sur l'annexe A — 51 € de résultat avec 59 € de chiffre d'affaires apporté donnent
// 19,64 € et 31,36 € ; sans apport, 10,20 € et 40,80 € ; et 1 020 € avec 708 € apportés donnent
// 317,28 € et 702,72 €. Les trois tombent au centime.
//
// LES REMBOURSEMENTS (article 5.4) comptent comme des encaissements négatifs du mois où ils ont lieu.
// La commission d'un client remboursé se reprend donc d'elle-même, et le résultat distribuable baisse
// du même coup — les deux restent d'accord. Le montant repris est affiché à part pour qu'on puisse le
// relire, mais il n'est pas calculé à part. Un total dû négatif est rendu tel quel : l'article dit
// « déduite du relevé suivant », pas « oubliée ».
//
// TOUT EST EN CENTIMES, entiers. Un relevé calculé en flottants finit par afficher 19,639999999 ou
// par perdre un centime au passage — sur de l'argent qu'on doit à quelqu'un, ce n'est pas acceptable.

/** Les taux du contrat. Ici, en clair, et nulle part ailleurs. */
export const TAUX = {
  /** Article 5 : commission sur le chiffre d'affaires des clients apportés. */
  commission: 0.20,
  /** Article 4 : part du partenaire dans le résultat distribuable. */
  interessement: 0.20,
  /** Article 5, apport contesté : la commission tombe de moitié. */
  commissionContestee: 0.10,
} as const

export type LigneClient = {
  artisan_id: string
  nom: string | null
  /** Encaissé sur ce client dans le mois, en CENTIMES. */
  encaisse: number
  /** Remboursé à ce client dans le mois, en CENTIMES, toujours POSITIF (article 5.4). */
  rembourse?: number
  /** L'apport compte-t-il, et à quel taux (0, 10 ou 20) ? Vient du registre, jamais d'une saisie. */
  tauxApport: number
  statutApport: string | null
}

export type Releve = {
  /** Le mois, en AAAA-MM. */
  mois: string
  /** Chiffre d'affaires encaissé NET des remboursements, tous clients confondus (centimes). */
  encaisse: number
  /** Ce qui a été remboursé dans le mois (centimes, positif) — article 5.4. */
  rembourse: number
  /** La commission reprise à cause de ces remboursements (centimes, positif). Déjà déduite. */
  reprise: number
  /** Coûts directs du mois (centimes). */
  couts: number
  /** R = encaissé − coûts. */
  resultat: number
  /** C = somme des commissions par client. */
  commission: number
  /** B = R − C. */
  base: number
  /** I = 20 % de B. */
  interessement: number
  /** Ce que Presti doit au partenaire : C + I. */
  dûAuPartenaire: number
  /** Ce qui reste à Benjamin : 80 % de B. */
  partFondateur: number
  /** Le détail, client par client — un relevé qu'on ne peut pas vérifier ne vaut rien. */
  clients: (LigneClient & { commission: number; reprise: number; net: number; rembourse: number })[]
}

/**
 * Calcule le relevé. Aucune lecture de base ici : on lui donne les faits, il fait l'arithmétique.
 * C'est ce qui permet de le prouver sur les cas de l'annexe A sans monter tout un décor.
 */
export function calculerReleve(mois: string, clients: LigneClient[], coutsCentimes: number): Releve {
  const detail = clients.map((c) => {
    const rembourse = Math.max(0, c.rembourse ?? 0)
    // Article 5.4 : un remboursement est un encaissement NÉGATIF du mois où il a lieu. Le traiter
    // comme une ligne à part corrigerait la commission sans corriger le résultat, et les deux se
    // contrediraient — on ne s'en apercevrait qu'au moment de payer.
    const net = c.encaisse - rembourse
    return {
      ...c, rembourse,
      // La commission suit le taux du registre : 20 % prouvé ou saisi, 10 % contesté, 0 sinon.
      commission: Math.round(net * (c.tauxApport / 100)),
      /** Ce que le remboursement retire au partenaire — affiché, pour que le calcul se relise. */
      reprise: Math.round(rembourse * (c.tauxApport / 100)),
      net,
    }
  })
  const encaisse = detail.reduce((n, c) => n + c.net, 0)
  const rembourse = detail.reduce((n, c) => n + c.rembourse, 0)
  const reprise = detail.reduce((n, c) => n + c.reprise, 0)
  const commission = detail.reduce((n, c) => n + c.commission, 0)
  const resultat = encaisse - coutsCentimes
  const base = resultat - commission
  // Un résultat négatif ne se partage pas : on ne réclame pas au partenaire sa part des pertes, et le
  // contrat ne le prévoit pas. La commission, elle, reste due — elle porte sur du chiffre d'affaires
  // encaissé, pas sur un bénéfice.
  const interessement = base > 0 ? Math.round(base * TAUX.interessement) : 0
  const partFondateur = base > 0 ? base - interessement : base
  return {
    mois, encaisse, rembourse, reprise, couts: coutsCentimes, resultat, commission, base,
    interessement, dûAuPartenaire: commission + interessement, partFondateur,
    clients: detail,
  }
}

/** Les bornes d'un mois AAAA-MM, en ISO. Le mois est celui de l'ENCAISSEMENT, pas de la facture. */
export function bornesDuMois(mois: string): { debut: string; fin: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(mois)
  if (!m) return null
  const an = Number(m[1]), mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  return {
    debut: new Date(Date.UTC(an, mo - 1, 1)).toISOString(),
    fin: new Date(Date.UTC(mo === 12 ? an + 1 : an, mo === 12 ? 0 : mo, 1)).toISOString(),
  }
}

/** Un montant en centimes, écrit comme on l'écrit en France. */
export const enEuros = (centimes: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(centimes / 100)
