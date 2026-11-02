// La matrice des rôles d'une organisation (chantier 4, §10 ; cadrage-p3.md §5.3, l.289-302).
//
// Miroir, ligne pour ligne et DANS LE MÊME ORDRE, de la table `droits_roles` remplie par
// supabase/migrations/0183_organisations.sql (section 5). `scripts/organisations-qa.mjs` compare les deux : une ligne
// changée d'un seul côté le fait rougir.
//
// Rien ne lit encore ce fichier : la couche des routes (`resoudreCompte`, P4b) le lira, derrière le drapeau des organisations.
// Le titulaire seul gère l'abonnement, les membres et le niveau 3. Le compagnon voit ses chantiers et son pointage, jamais la
// compta. L'invité lit.

export const ROLES = ['titulaire', 'associe', 'administratif', 'compagnon', 'invite'] as const
export type Role = (typeof ROLES)[number]

export const DOMAINES = [
  'abonnement', // abonnement, Stripe, suppression du compte, membres
  'reglages', // réglages de l'entreprise, canaux, plateforme
  'demandes', // demandes, conversations, clients
  'devis',
  'factures', // factures, relances d'impayés, compta
  'tarifs',
  'stock', // stock, commandes fournisseurs
  'chantiers', // chantiers, tâches, pièces
  'pointage', // pointage, notes de chantier
  'assistant', // l'assistant (chat)
  'a_valider', // la boîte « À valider »
  'autonomie', // le niveau 3 (réglages d'autonomie)
] as const
export type Domaine = (typeof DOMAINES)[number]

/**
 * aucun · lecture · ecriture ;
 * siens : seulement ce qui le concerne (ses chantiers par `chantier_equipe`, son pointage, ses tâches), filtré ligne par ligne ;
 * restreint : une partie du domaine, que la route déclare (l'assistant sans actions d'argent ; « À valider » commercial et factures).
 * En base, `comptes_accessibles` n'ouvre un compte que pour lecture et ecriture : siens et restreint y valent aucun.
 */
export const NIVEAUX = ['aucun', 'lecture', 'ecriture', 'siens', 'restreint'] as const
export type Niveau = (typeof NIVEAUX)[number]

export type LigneDroit = readonly [Role, Domaine, Niveau]

/** La matrice, dans l'ordre exact de l'insertion de 0183. */
export const MATRICE: readonly LigneDroit[] = [
  ['titulaire', 'abonnement', 'ecriture'],
  ['titulaire', 'reglages', 'ecriture'],
  ['titulaire', 'demandes', 'ecriture'],
  ['titulaire', 'devis', 'ecriture'],
  ['titulaire', 'factures', 'ecriture'],
  ['titulaire', 'tarifs', 'ecriture'],
  ['titulaire', 'stock', 'ecriture'],
  ['titulaire', 'chantiers', 'ecriture'],
  ['titulaire', 'pointage', 'ecriture'],
  ['titulaire', 'assistant', 'ecriture'],
  ['titulaire', 'a_valider', 'ecriture'],
  ['titulaire', 'autonomie', 'ecriture'],

  ['associe', 'abonnement', 'aucun'],
  ['associe', 'reglages', 'ecriture'],
  ['associe', 'demandes', 'ecriture'],
  ['associe', 'devis', 'ecriture'],
  ['associe', 'factures', 'ecriture'],
  ['associe', 'tarifs', 'ecriture'],
  ['associe', 'stock', 'ecriture'],
  ['associe', 'chantiers', 'ecriture'],
  ['associe', 'pointage', 'ecriture'],
  ['associe', 'assistant', 'ecriture'],
  ['associe', 'a_valider', 'ecriture'],
  ['associe', 'autonomie', 'aucun'],

  ['administratif', 'abonnement', 'aucun'],
  ['administratif', 'reglages', 'lecture'],
  ['administratif', 'demandes', 'ecriture'],
  ['administratif', 'devis', 'ecriture'],
  ['administratif', 'factures', 'ecriture'],
  ['administratif', 'tarifs', 'lecture'],
  ['administratif', 'stock', 'ecriture'],
  ['administratif', 'chantiers', 'ecriture'],
  ['administratif', 'pointage', 'lecture'],
  ['administratif', 'assistant', 'restreint'],
  ['administratif', 'a_valider', 'restreint'],
  ['administratif', 'autonomie', 'aucun'],

  ['compagnon', 'abonnement', 'aucun'],
  ['compagnon', 'reglages', 'aucun'],
  ['compagnon', 'demandes', 'aucun'],
  ['compagnon', 'devis', 'aucun'],
  ['compagnon', 'factures', 'aucun'],
  ['compagnon', 'tarifs', 'aucun'],
  ['compagnon', 'stock', 'lecture'],
  ['compagnon', 'chantiers', 'siens'],
  ['compagnon', 'pointage', 'siens'],
  ['compagnon', 'assistant', 'aucun'],
  ['compagnon', 'a_valider', 'siens'],
  ['compagnon', 'autonomie', 'aucun'],

  ['invite', 'abonnement', 'aucun'],
  ['invite', 'reglages', 'aucun'],
  ['invite', 'demandes', 'lecture'],
  ['invite', 'devis', 'lecture'],
  ['invite', 'factures', 'lecture'],
  ['invite', 'tarifs', 'aucun'],
  ['invite', 'stock', 'aucun'],
  ['invite', 'chantiers', 'lecture'],
  ['invite', 'pointage', 'aucun'],
  ['invite', 'assistant', 'aucun'],
  ['invite', 'a_valider', 'aucun'],
  ['invite', 'autonomie', 'aucun'],
]

/** Le niveau d'un rôle sur un domaine. Une paire absente vaut « aucun » (échec fermé). */
export function niveauDe(role: Role, domaine: Domaine): Niveau {
  return MATRICE.find(([r, d]) => r === role && d === domaine)?.[2] ?? 'aucun'
}

/**
 * Le même verdict que `comptes_accessibles` en base pour un membre actif d'une organisation ouverte et non suspendue :
 * l'écriture exige « ecriture » ; la lecture accepte « lecture » ou « ecriture ». siens et restreint ne suffisent jamais ici :
 * la route ou la politique M3 qui les ouvre le fait explicitement, ligne par ligne.
 */
export function ouvreLeCompte(role: Role, domaine: Domaine, demande: 'lecture' | 'ecriture'): boolean {
  const n = niveauDe(role, domaine)
  return n === 'ecriture' || (n === 'lecture' && demande === 'lecture')
}
