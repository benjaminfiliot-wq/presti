// « Où en est ma demande » (sprint J-1 §9 G2) — la frise que voit le client.
//
// Règle absolue : UNIQUEMENT des états réels. Chaque étape est cochée par une donnée qui
// existe en base (statut du lead, statut du devis). « Planifié » et « Terminé » n'ont
// aujourd'hui aucune colonne qui les porte : elles sont affichées comme À VENIR, jamais
// cochées. Le jour où un rendez-vous ou une fin de chantier existera en base, on branche
// ici — pas avant.

export const ETAPES_DEMANDE = ['Reçue', 'Qualifiée', 'Devis', 'Accepté', 'Planifié', 'Terminé'] as const
export type EtapeDemande = (typeof ETAPES_DEMANDE)[number]

export type SuiviDemande = {
  /** Nombre d'étapes atteintes (1 → 6). 0 si la demande est classée sans suite. */
  etape: number
  etapes: readonly EtapeDemande[]
  /** Demande classée sans suite (lead perdu) : la frise se met en retrait. */
  classee: boolean
  /** Ce qui justifie l'étape atteinte — pour ne jamais afficher une étape que rien ne porte. */
  preuve: 'lead' | 'devis_envoye' | 'devis_accepte' | 'lead_gagne' | 'aucune'
}

export type DonneesSuivi = {
  statut: string | null | undefined                // leads.statut
  devisStatut?: string | null | undefined          // devis.statut du dernier devis envoyé/accepté/refusé
  priseEnMain?: boolean | null | undefined         // leads.prise_en_main (n'avance pas la frise, informatif)
}

export function suiviDemande(d: DonneesSuivi): SuiviDemande {
  const statut = (d.statut || 'nouveau').toLowerCase()
  const devis = (d.devisStatut || '').toLowerCase()
  const classee = statut === 'perdu'

  // 4 — accepté : le client a accepté le devis (horodaté), ou l'artisan a marqué la demande gagnée.
  if (devis === 'accepte' || statut === 'gagne') {
    return { etape: 4, etapes: ETAPES_DEMANDE, classee, preuve: devis === 'accepte' ? 'devis_accepte' : 'lead_gagne' }
  }
  // 3 — devis : un devis a réellement été envoyé dans la conversation (jamais un brouillon).
  if (devis === 'envoye' || devis === 'refuse' || statut === 'devis') {
    return { etape: 3, etapes: ETAPES_DEMANDE, classee, preuve: 'devis_envoye' }
  }
  // 2 — qualifiée : l'échange a commencé (le prospect ou l'artisan a répondu).
  if (statut === 'en_discussion' || statut === 'repondu') {
    return { etape: 2, etapes: ETAPES_DEMANDE, classee, preuve: 'lead' }
  }
  // 1 — reçue : la demande existe.
  return { etape: 1, etapes: ETAPES_DEMANDE, classee, preuve: 'lead' }
}
