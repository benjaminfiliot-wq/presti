// Qui a le droit de quoi dans le Poste de contrôle (prompt v11 §5).
//
// Une seule fonction décide, et **chaque route l'appelle**. C'est la condition posée par le §5 : « toute
// écriture hors de son périmètre est refusée côté serveur, pas seulement masquée dans l'interface ».
// Un bouton caché n'est pas une protection — c'est une politesse.
//
// Deux rôles, et ils ne se ressemblent pas :
//
//   `fondateur`  — Benjamin. Tout, avec re-confirmation au mot de passe sur ce qui touche à l'argent,
//                  aux accès et aux données d'un artisan.
//   `partenaire` — Alexandre. Ce que le contrat lui accorde (article 7) : ses apports, son relevé, la
//                  LECTURE des clients et des abonnements, et les fils de messagerie qui lui sont
//                  assignés. Pas la comptabilité de l'entreprise, pas les réglages, pas les actions sur
//                  un artisan, pas la santé du système, pas le journal des autres.
//
// Ce que personne ne peut faire, pas même Benjamin : lire les conversations d'un artisan avec ses
// clients, ses devis, ses photos. Le Poste de contrôle COMPTE, il ne lit pas. La seule exception prévue
// est un ticket de support ouvert, journalisé et notifié à l'artisan — elle n'existe pas encore.

export type RoleInterne = 'fondateur' | 'partenaire'
export type Verbe = 'voir' | 'ecrire'

export type Domaine =
  /** Liste des artisans, fiche, offre, statut Stripe, canal d'arrivée, encaissé. */
  | 'clients'
  /** Les huit gestes sur un artisan : crédits, suspension, réactivation, offre, remboursement, pause, portail, message. */
  | 'artisan.actions'
  /** Le registre des apports : qui a amené qui, et la preuve. */
  | 'apports'
  /** Valider, contester ou refuser un apport — la décision, et l'argent qu'elle engage. */
  | 'apports.decision'
  /** La boîte de l'entreprise. Le partenaire n'y voit que les fils qui lui sont assignés. */
  | 'messagerie'
  /** Achats, TVA, URSSAF, impôt, trésorerie, coûts d'infrastructure. La comptabilité de Benjamin. */
  | 'comptabilite'
  /** Le relevé mensuel du partenaire — le sien, qu'il doit pouvoir lire et exporter (art. 4.2). */
  | 'releve.partenaire'
  /** État du service, alertes, déploiements, coûts IA, quotas. */
  | 'sante'
  /** Bannissements d'adresses, sessions, tentatives. */
  | 'securite'
  /** Drapeaux, prix, modèles, plafonds, comptes connectés, rôles. */
  | 'reglages'
  /** Le journal des actions. Le partenaire n'y voit que LES SIENNES. */
  | 'journal'

/** La matrice, écrite une fois. `false` = refusé, `'siennes'` = autorisé mais borné à ses propres lignes. */
const PARTENAIRE: Record<Domaine, { voir: boolean | 'siennes'; ecrire: boolean | 'siennes' }> = {
  clients:             { voir: true,      ecrire: false },
  'artisan.actions':   { voir: false,     ecrire: false },
  apports:             { voir: 'siennes', ecrire: 'siennes' },
  'apports.decision':  { voir: 'siennes', ecrire: false },
  messagerie:          { voir: 'siennes', ecrire: 'siennes' },
  comptabilite:        { voir: false,     ecrire: false },
  'releve.partenaire': { voir: 'siennes', ecrire: false },
  sante:               { voir: false,     ecrire: false },
  securite:            { voir: false,     ecrire: false },
  reglages:            { voir: false,     ecrire: false },
  journal:             { voir: 'siennes', ecrire: false },
}

export type Verdict =
  | { permis: true; borne: false }
  /** Permis, mais uniquement sur ses propres lignes — l'appelant DOIT filtrer. */
  | { permis: true; borne: true }
  | { permis: false; raison: string }

/**
 * Ce que ce rôle peut faire dans ce domaine.
 *
 * Rendre un objet plutôt qu'un booléen n'est pas de la coquetterie : `{ permis: true, borne: true }`
 * oblige l'appelant à regarder `borne`, là où un `true` se serait laissé oublier. La différence entre
 * « il voit ses apports » et « il voit les apports » tient à ce seul champ.
 */
export function peutFaire(role: RoleInterne, domaine: Domaine, verbe: Verbe): Verdict {
  if (role === 'fondateur') return { permis: true, borne: false }
  const regle = PARTENAIRE[domaine]
  if (!regle) return { permis: false, raison: `Domaine inconnu : ${domaine}.` }
  const v = regle[verbe]
  if (v === false) return { permis: false, raison: RAISONS[domaine] ?? 'Ce n’est pas dans votre périmètre.' }
  return { permis: true, borne: v === 'siennes' }
}

/** Pourquoi c'est refusé, écrit pour la personne qui le lit — jamais « accès refusé » tout court. */
const RAISONS: Partial<Record<Domaine, string>> = {
  'artisan.actions': 'Les actions sur un artisan sont réservées à Benjamin.',
  comptabilite: 'La comptabilité de l’entreprise n’est pas dans votre périmètre. Votre relevé mensuel, lui, l’est.',
  'apports.decision': 'La décision sur un apport revient à Benjamin. Vous pouvez la contester, avec un motif.',
  sante: 'La santé du système est réservée à Benjamin.',
  securite: 'La sécurité est réservée à Benjamin.',
  reglages: 'Les réglages sont réservés à Benjamin.',
  clients: 'Vous avez la lecture des clients, pas l’écriture.',
  journal: 'Vous voyez le journal de vos propres actions.',
  messagerie: 'Vous voyez les fils qui vous sont assignés.',
  'releve.partenaire': 'Votre relevé est en lecture.',
}

/** Vrai raccourci de lecture : `permis` sans devoir déballer le verdict. */
export const autorise = (role: RoleInterne, domaine: Domaine, verbe: Verbe): boolean => peutFaire(role, domaine, verbe).permis

/** Vrai quand le rôle ne voit que ses propres lignes dans ce domaine. */
export const borneAuxSiennes = (role: RoleInterne, domaine: Domaine, verbe: Verbe = 'voir'): boolean => {
  const v = peutFaire(role, domaine, verbe)
  return v.permis && v.borne
}
