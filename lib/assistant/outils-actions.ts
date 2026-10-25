// L'assistant de gestion de la console — les OUTILS D'ACTION (plans/016-assistant.md, jalon A3 : « l'assistant qui gère tout »).
//
// Module pur : ni réseau, ni base. Une seule table de vérité (SPEC) donne, pour chaque action : sa catégorie, ses champs,
// le schéma que le modèle voit ET la validation stricte de ce qu'il envoie (le même descriptif sert aux deux : ils ne
// peuvent pas diverger). L'exécution vit dans lib/assistant/actions-serveur.ts (qui appelle les mêmes routes et fonctions
// que l'interface, avec la session de l'artisan).
//
// Deux catégories, et rien entre les deux :
//  • DIRECT : une écriture interne, réversible (brouillon de devis, tarif, ligne de stock, tâche…). Elle s'exécute tout de
//    suite, s'inscrit au journal des actions et, quand c'est possible, garde de quoi l'ANNULER.
//  • CONFIRMATION : tout ce qui part vers l'extérieur (e-mail ou message à un client, devis envoyé), tout ce qui est
//    irréversible ou comptable (facture émise et scellée, facture encaissée, suppression) et tout lot de prix. L'outil ne
//    fait RIEN : il prépare une carte (le texte exact, l'avant/après) que l'artisan confirme d'un clic. Aucun outil de cette
//    catégorie ne peut s'exécuter depuis le modèle (lib/assistant/confirmation.ts).
//
// Aucun identifiant de compte ne vient du modèle. Les devis et factures se désignent par leur NUMÉRO, les chantiers, articles,
// membres et tâches par leur NOM : le serveur les retrouve dans les données de l'artisan (cartes.ts trouverUnique), et refuse
// quand c'est ambigu. Les seuls UUID acceptés sont ceux que les outils de lecture rendent (conversation, tarif).

import { FLAGS } from '../flags.ts'

export type CategorieAction = 'direct' | 'confirmation'

export type Champ =
  | { t: 'texte'; d: string; max?: number; req?: boolean; rech?: boolean }
  | { t: 'nombre'; d: string; min?: number; max?: number; req?: boolean; sourcer?: boolean }
  | { t: 'bool'; d: string }
  | { t: 'enum'; d: string; valeurs: readonly string[]; req?: boolean }
  | { t: 'uuid'; d: string; req?: boolean }
  | { t: 'email'; d: string }
  | { t: 'date'; d: string }
  | { t: 'liste'; d: string; max: number }
  | { t: 'lignes'; d: string; req?: boolean }

export type SpecAction = { cat: CategorieAction; crm?: boolean; libelle: string; desc: string; champs: Record<string, Champ> }

export const TVA_TAUX = [0, 5.5, 10, 20] as const
export const LIGNES_MAX = 40
export const ROLES_EQUIPE = ['artisan', 'compagnon', 'apprenti', 'salarie', 'sous_traitant', 'autre'] as const
export const STATUTS_DEMANDE = ['nouveau', 'en_discussion', 'repondu', 'gagne', 'perdu'] as const
export const STATUTS_CHANTIER_ACTION = ['a_planifier', 'planifie', 'en_cours', 'en_pause', 'termine', 'annule'] as const
export const MOUVEMENTS_STOCK = ['entree', 'sortie', 'inventaire', 'perte'] as const
export const TONS_RELANCE = ['cordial', 'ferme'] as const
/** Les types de facture que l'assistant propose. « situation » et « solde » (0176) seulement drapeau `facturesSituation` levé :
 *  baissé, l'outil ne les connaît pas (ni dans son schéma, ni à la validation). */
export const TYPES_FACTURE_TOUS = ['complete', 'acompte', 'situation', 'solde'] as const
export const TYPES_FACTURE: readonly (typeof TYPES_FACTURE_TOUS)[number][] = FLAGS.facturesSituation ? TYPES_FACTURE_TOUS : ['complete', 'acompte']

const numeroDevis: Champ = { t: 'texte', d: 'Numéro du devis, tel que rendu par lire_devis (ex. DEV-2026-0011).', max: 24, req: true }
const numeroFacture: Champ = { t: 'texte', d: 'Numéro de la facture, tel que rendu par lire_factures (ex. FAC-2026-0004).', max: 24, req: true }
const conversation: Champ = { t: 'uuid', d: 'Identifiant (UUID) d’une conversation, tel que rendu par lire_conversations. Jamais inventé.', req: true }
const chantier: Champ = { t: 'texte', d: 'Titre (ou mot du titre) du chantier, tel que lire_chantiers le rend. Ambigu : le serveur refuse et liste les candidats.', max: 80, req: true, rech: true }
const article: Champ = { t: 'texte', d: 'Nom (ou mot du nom) de l’article de l’inventaire, tel que lire_stock le rend.', max: 80, req: true, rech: true }

/** La table de vérité des actions. L'ordre est celui des outils proposés au modèle. */
export const SPEC = {
  // ── Devis ───────────────────────────────────────────────────────────────────────────────────────
  creer_devis: {
    cat: 'direct', libelle: 'créer un devis',
    desc: "Crée un DEVIS BROUILLON (rien n'est envoyé) à partir de lignes que tu fournis. Chaque ligne s'appuie sur un tarif de l'artisan (tarif_id rendu par lire_tarifs : le prix, l'unité et la TVA viennent alors de ses tarifs, pas de toi). Sans tarif_id, le prix doit avoir été donné par l'artisan lui-même dans la conversation ; sinon laisse prix_unitaire_ht absent : la ligne sera à chiffrer et tu le diras. Jamais de prix deviné. Pour un client déjà en conversation, passe conversation_id : nom et e-mail sont repris du dossier sans que tu les voies.",
    champs: {
      client_nom: { t: 'texte', d: 'Nom du client (ex. Mme Martin).', max: 160 },
      client_email: { t: 'email', d: 'E-mail du client, seulement si l’artisan l’a écrit lui-même.' },
      conversation_id: { t: 'uuid', d: 'Conversation du client (lire_conversations) : reprend son nom et son e-mail.' },
      objet: { t: 'texte', d: 'Objet du devis (ex. Pose de carrelage salle de bain).', max: 300, req: true },
      lignes: { t: 'lignes', d: 'Les lignes du devis.', req: true },
      remise_pct: { t: 'nombre', d: 'Remise en % : seulement si l’artisan l’a demandée.', min: 0, max: 100, sourcer: true },
      acompte_pct: { t: 'nombre', d: 'Acompte en % à la commande : seulement si l’artisan l’a demandé.', min: 0, max: 100, sourcer: true },
      validite_jours: { t: 'nombre', d: 'Validité en jours : seulement si l’artisan l’a donnée (défaut du produit : 90).', min: 1, max: 365, sourcer: true },
      conditions: { t: 'texte', d: 'Conditions particulières, si l’artisan en a dicté.', max: 2000 },
    },
  },
  modifier_devis: {
    cat: 'direct', libelle: 'modifier un devis',
    desc: "Modifie un devis BROUILLON (un devis parti chez le client ne se modifie pas : il en faut un nouveau). Ajoute des lignes (mêmes règles que creer_devis), retire des lignes par leur position (1 = première) ou leur désignation, change l'objet, la remise, l'acompte, le client.",
    champs: {
      numero: numeroDevis,
      objet: { t: 'texte', d: 'Nouvel objet.', max: 300 },
      ajouter_lignes: { t: 'lignes', d: 'Lignes à ajouter.' },
      retirer_lignes: { t: 'liste', d: 'Lignes à retirer : position (« 2 ») ou désignation exacte.', max: 20 },
      remise_pct: { t: 'nombre', d: 'Nouvelle remise en %.', min: 0, max: 100, sourcer: true },
      acompte_pct: { t: 'nombre', d: 'Nouvel acompte en %.', min: 0, max: 100, sourcer: true },
      client_nom: { t: 'texte', d: 'Nouveau nom de client.', max: 160 },
      client_email: { t: 'email', d: 'Nouvel e-mail du client, seulement si l’artisan l’a écrit.' },
    },
  },
  changer_statut_devis: {
    cat: 'direct', libelle: 'changer le statut d’un devis',
    desc: "Marque un devis comme signé (accepte) ou refusé (refuse), sur la parole de l'artisan (le client a signé, ou refusé, hors de Presti). Réversible. Un devis signé ouvre la facturation et le chantier.",
    champs: { numero: numeroDevis, statut: { t: 'enum', d: 'accepte (signé) ou refuse.', valeurs: ['accepte', 'refuse'], req: true } },
  },
  supprimer_devis_brouillon: {
    cat: 'confirmation', libelle: 'supprimer un devis brouillon',
    desc: "Propose de SUPPRIMER un devis brouillon (seulement un brouillon : un devis parti chez le client se conserve). L'artisan confirme sur une carte.",
    champs: { numero: numeroDevis },
  },
  envoyer_devis: {
    cat: 'confirmation', libelle: 'envoyer un devis',
    desc: "Propose d'ENVOYER un devis au client par e-mail (PDF joint), comme le bouton « Envoyer » de l'écran Devis. Rien ne part avant le clic de l'artisan sur la carte. Refus si l'e-mail du client ou une mention légale manque : dis lequel.",
    champs: { numero: numeroDevis },
  },
  relancer_devis: {
    cat: 'confirmation', libelle: 'relancer un devis',
    desc: "Propose de RELANCER par e-mail un devis envoyé resté sans réponse. Le texte est fixe (deux tons : cordial, ferme) et s'affiche en entier sur la carte ; tu n'écris rien dedans. Rien ne part avant le clic de l'artisan.",
    champs: { numero: numeroDevis, ton: { t: 'enum', d: 'cordial (défaut) ou ferme.', valeurs: TONS_RELANCE } },
  },
  // ── Factures ────────────────────────────────────────────────────────────────────────────────────
  creer_facture: {
    cat: 'confirmation', libelle: 'créer une facture',
    desc: FLAGS.facturesSituation
      ? "Propose de créer la FACTURE d'un devis signé : complete (tout le devis ; si des acomptes ou des situations sont déjà facturés, c'est la facture de SOLDE qui les déduit), acompte (un pourcentage, que l'artisan a donné), situation (situation de travaux : l'avancement CUMULÉ à date en %, que l'artisan a donné ; montant = cumul × devis − tout ce qui est déjà facturé) ou solde (dernière facture : déduit acomptes et situations). Une facture est émise ET scellée à la création (numéro définitif, plus modifiable : une correction passe par un avoir) : l'artisan confirme sur une carte. Mêmes règles que l'écran du devis (mentions légales, TVA, numérotation, avancement qui ne recule pas, jamais plus que le devis). Avancement lot par lot : depuis l'écran du devis, pas d'ici."
      : "Propose de créer la FACTURE d'un devis signé : complete (tout le devis) ou acompte (un pourcentage, que l'artisan a donné). Une facture est émise ET scellée à la création (numéro définitif, plus modifiable : une correction passe par un avoir) : l'artisan confirme sur une carte. Mêmes règles que l'écran Factures (mentions légales, TVA, numérotation). Pas de facture de solde avec déduction d'acompte dans Presti : si un acompte existe déjà, dis-le.",
    champs: {
      devis_numero: numeroDevis,
      type: { t: 'enum', d: FLAGS.facturesSituation ? 'complete (défaut), acompte, situation ou solde.' : 'complete (défaut) ou acompte.', valeurs: TYPES_FACTURE },
      acompte_pct: { t: 'nombre', d: 'Pourcentage de l’acompte (entre 1 et 99), obligatoire pour type=acompte : celui que l’artisan a donné.', min: 1, max: 99, sourcer: true },
      ...(FLAGS.facturesSituation ? { avancement_pct: { t: 'nombre', d: 'Avancement CUMULÉ du chantier à date, en % (entre 1 et 100), obligatoire pour type=situation : celui que l’artisan a donné.', min: 1, max: 100, sourcer: true } as const } : {}),
    },
  },
  marquer_facture_payee: {
    cat: 'confirmation', libelle: 'encaisser une facture',
    desc: "Propose de marquer une facture PAYÉE (encaissée). Irréversible : une facture payée ne revient pas en arrière. L'artisan confirme sur une carte, après avoir vérifié l'encaissement.",
    champs: { numero: numeroFacture },
  },
  relancer_facture: {
    cat: 'confirmation', libelle: 'relancer une facture impayée',
    desc: "Propose de RELANCER par e-mail le client d'une facture émise et non payée, échue. Le texte est fixe (deux tons : cordial, ferme), montants et dates repris de la facture, et s'affiche en entier sur la carte. Rien ne part avant le clic de l'artisan. Pour plusieurs factures, appelle l'outil une fois par facture (12 actions au plus par message).",
    champs: { numero: numeroFacture, ton: { t: 'enum', d: 'cordial (défaut) ou ferme.', valeurs: TONS_RELANCE } },
  },
  // ── Tarifs ──────────────────────────────────────────────────────────────────────────────────────
  ajouter_tarif: {
    cat: 'direct', libelle: 'ajouter un tarif',
    desc: "Ajoute (ou met à jour, même désignation + fournisseur + référence) un prix dans la bibliothèque de tarifs de l'artisan. Le prix doit être celui que l'artisan t'a donné.",
    champs: {
      designation: { t: 'texte', d: 'Désignation (ex. Pose carrelage 60x60).', max: 300, req: true },
      prix_ht: { t: 'nombre', d: 'Prix unitaire HT en euros.', min: 0, max: 1_000_000, req: true, sourcer: true },
      unite: { t: 'texte', d: 'Unité (m², u, h, ml…). Défaut : u.', max: 16 },
      tva_taux: { t: 'nombre', d: 'Taux de TVA : 0, 5.5, 10 ou 20 (défaut du produit : 10).', min: 0, max: 20 },
      fournisseur: { t: 'texte', d: 'Fournisseur, si donné.', max: 120 },
      reference: { t: 'texte', d: 'Référence, si donnée.', max: 80 },
    },
  },
  modifier_tarif: {
    cat: 'direct', libelle: 'modifier un tarif',
    desc: "Change le prix d'UNE ligne de la bibliothèque de tarifs (tarif_id rendu par lire_tarifs). Le nouveau prix est celui que l'artisan t'a donné. Pour un lot : augmenter_tarifs.",
    champs: { tarif_id: { t: 'uuid', d: 'Identifiant du tarif (lire_tarifs).', req: true }, prix_ht: { t: 'nombre', d: 'Nouveau prix unitaire HT en euros.', min: 0, max: 1_000_000, req: true, sourcer: true } },
  },
  augmenter_tarifs: {
    cat: 'confirmation', libelle: 'modifier un lot de tarifs',
    desc: "Propose d'augmenter (ou de baisser, pourcentage négatif) un LOT de tarifs de l'artisan : toutes les lignes dont la désignation contient le mot cherché (ex. « pose »), ou toute la bibliothèque si aucun mot (300 lignes au plus). Le pourcentage est celui que l'artisan a donné. La carte montre l'avant/après ; annulable après coup. Les devis déjà faits ne changent pas.",
    champs: {
      pourcentage: { t: 'nombre', d: 'Variation en % (ex. 5 pour +5 %, -3 pour -3 %), de -50 à 100.', min: -50, max: 100, req: true, sourcer: true },
      recherche: { t: 'texte', d: 'Mot de la désignation (ex. « pose »). Absent : tous les tarifs.', max: 60, rech: true },
      fournisseur: { t: 'texte', d: 'Seulement les tarifs de ce fournisseur.', max: 120, rech: true },
    },
  },
  supprimer_tarif: {
    cat: 'confirmation', libelle: 'supprimer un tarif',
    desc: "Propose de SUPPRIMER une ligne de la bibliothèque de tarifs. L'artisan confirme sur une carte.",
    champs: { tarif_id: { t: 'uuid', d: 'Identifiant du tarif (lire_tarifs).', req: true } },
  },
  // ── Inventaire ──────────────────────────────────────────────────────────────────────────────────
  ajouter_article: {
    cat: 'direct', libelle: 'ajouter un article',
    desc: "Crée un article dans l'inventaire (ou met à jour la fiche de même nom). Option : quantité initiale en stock. Les nombres sont ceux que l'artisan a donnés.",
    champs: {
      nom: { t: 'texte', d: 'Nom de l’article.', max: 200, req: true },
      unite: { t: 'texte', d: 'Unité (u, m, boîte…).', max: 16 },
      categorie: { t: 'texte', d: 'Catégorie.', max: 80 },
      seuil_alerte: { t: 'nombre', d: 'Seuil d’alerte de stock bas.', min: 0, max: 1_000_000, sourcer: true },
      fournisseur_prefere: { t: 'texte', d: 'Fournisseur habituel, si donné.', max: 120 },
      prix_dernier_ht: { t: 'nombre', d: 'Dernier prix d’achat HT, si donné.', min: 0, max: 1_000_000, sourcer: true },
      quantite_initiale: { t: 'nombre', d: 'Quantité à mettre en stock tout de suite.', min: 0, max: 1_000_000, sourcer: true },
      lieu: { t: 'texte', d: 'Lieu de stockage de la quantité initiale (défaut : atelier).', max: 60 },
    },
  },
  modifier_article: {
    cat: 'direct', libelle: 'modifier un article',
    desc: "Modifie la fiche d'un article de l'inventaire : seuil d'alerte (stock bas), fournisseur habituel, catégorie. Les champs absents ne changent pas.",
    champs: {
      article,
      seuil_alerte: { t: 'nombre', d: 'Nouveau seuil d’alerte.', min: 0, max: 1_000_000, sourcer: true },
      fournisseur_prefere: { t: 'texte', d: 'Fournisseur habituel.', max: 120 },
      categorie: { t: 'texte', d: 'Catégorie.', max: 80 },
    },
  },
  ajuster_stock: {
    cat: 'direct', libelle: 'ajuster le stock',
    desc: "Enregistre un mouvement de stock : entree (réception), sortie (consommation), perte, ou inventaire (recomptage : la quantité est la quantité COMPTÉE, pas une différence). Annulable.",
    champs: {
      article,
      mouvement: { t: 'enum', d: 'entree, sortie, perte ou inventaire.', valeurs: MOUVEMENTS_STOCK, req: true },
      quantite: { t: 'nombre', d: 'Quantité (celle de l’artisan).', min: 0, max: 1_000_000, req: true, sourcer: true },
      lieu: { t: 'texte', d: 'Lieu (défaut : atelier).', max: 60 },
      note: { t: 'texte', d: 'Note courte.', max: 300 },
    },
  },
  // ── CRM ─────────────────────────────────────────────────────────────────────────────────────────
  reserver_materiau: {
    cat: 'direct', crm: true, libelle: 'réserver du matériel',
    desc: "Réserve une quantité d'un article de l'inventaire pour un chantier du CRM (le stock ne baisse qu'à la sortie). Annulable.",
    champs: { chantier, article, quantite: { t: 'nombre', d: 'Quantité à réserver (celle de l’artisan).', min: 0.01, max: 1_000_000, req: true, sourcer: true }, lieu: { t: 'texte', d: 'Lieu du stock (défaut : atelier).', max: 60 } },
  },
  creer_chantier: {
    cat: 'direct', crm: true, libelle: 'créer un chantier',
    desc: "Crée un chantier dans le CRM : depuis un devis SIGNÉ (devis_numero), ou libre (titre). Les dates ne sont posées que si l'artisan les a données. Annulable.",
    champs: {
      devis_numero: { t: 'texte', d: 'Numéro d’un devis signé.', max: 24 },
      titre: { t: 'texte', d: 'Nature des travaux (obligatoire sans devis).', max: 200 },
      client_nom: { t: 'texte', d: 'Client (chantier libre).', max: 200 },
      adresse: { t: 'texte', d: 'Adresse du chantier.', max: 300 },
      date_debut: { t: 'date', d: 'Début AAAA-MM-JJ, si donné.' },
      date_fin_prevue: { t: 'date', d: 'Fin prévue AAAA-MM-JJ, si donnée.' },
      generer_taches: { t: 'bool', d: 'Vrai : une tâche par ligne du devis.' },
    },
  },
  modifier_chantier: {
    cat: 'direct', crm: true, libelle: 'modifier un chantier',
    desc: "Modifie un chantier du CRM : statut, dates, adresse, notes. Les champs absents ne changent pas. Annulable.",
    champs: {
      chantier,
      statut: { t: 'enum', d: 'a_planifier, planifie, en_cours, en_pause, termine ou annule.', valeurs: STATUTS_CHANTIER_ACTION },
      date_debut: { t: 'date', d: 'Début AAAA-MM-JJ, si donné.' },
      date_fin_prevue: { t: 'date', d: 'Fin prévue AAAA-MM-JJ, si donnée.' },
      adresse: { t: 'texte', d: 'Adresse du chantier.', max: 300 },
      notes: { t: 'texte', d: 'Notes du chantier.', max: 2000 },
    },
  },
  affecter_equipe: {
    cat: 'direct', crm: true, libelle: 'affecter l’équipe',
    desc: "Ajoute ou retire des membres de l'équipe sur un chantier du CRM (par leur nom). Annulable.",
    champs: { chantier, ajouter: { t: 'liste', d: 'Noms des membres à ajouter.', max: 10 }, retirer: { t: 'liste', d: 'Noms des membres à retirer.', max: 10 } },
  },
  ajouter_tache: {
    cat: 'direct', crm: true, libelle: 'ajouter une tâche',
    desc: "Ajoute une tâche à un chantier du CRM. Annulable.",
    champs: { chantier, libelle: { t: 'texte', d: 'La tâche.', max: 300, req: true } },
  },
  cocher_tache: {
    cat: 'direct', crm: true, libelle: 'cocher une tâche',
    desc: "Coche (faite) ou décoche une tâche d'un chantier du CRM, retrouvée par son libellé. Annulable.",
    champs: { chantier, tache: { t: 'texte', d: 'Libellé (ou mot du libellé) de la tâche.', max: 300, req: true, rech: true }, faite: { t: 'bool', d: 'Vrai : faite (défaut). Faux : à refaire.' } },
  },
  ajouter_note: {
    cat: 'direct', crm: true, libelle: 'ajouter une note',
    desc: "Ajoute une note interne (jamais visible du client) sur un chantier du CRM ou sur une conversation. Annulable.",
    champs: {
      chantier: { t: 'texte', d: 'Titre du chantier (ou absent si la note est sur une conversation).', max: 80, rech: true },
      conversation_id: { t: 'uuid', d: 'Conversation (lire_conversations), si la note n’est pas sur un chantier.' },
      texte: { t: 'texte', d: 'La note.', max: 2000, req: true },
    },
  },
  ajouter_membre_equipe: {
    cat: 'direct', crm: true, libelle: 'ajouter un membre d’équipe',
    desc: "Ajoute un membre à l'équipe du CRM (nom, rôle). Annulable.",
    champs: { nom: { t: 'texte', d: 'Nom du membre.', max: 120, req: true }, role: { t: 'enum', d: 'Rôle.', valeurs: ROLES_EQUIPE } },
  },
  // ── Clients, demandes, réponses ─────────────────────────────────────────────────────────────────
  changer_statut_demande: {
    cat: 'direct', libelle: 'changer le statut d’une demande',
    desc: "Change le statut d'une demande/conversation (nouveau, en_discussion, repondu, gagne, perdu), comme le sélecteur du tableau de bord. Annulable.",
    champs: { conversation_id: conversation, statut: { t: 'enum', d: 'Nouveau statut.', valeurs: STATUTS_DEMANDE, req: true } },
  },
  repondre_client: {
    cat: 'confirmation', libelle: 'répondre à un client',
    desc: "Propose d'ENVOYER à un client un message que tu rédiges, dans sa conversation (même chemin que le bouton « Envoyer » de Messages). Le texte s'affiche en entier sur la carte et ne part qu'au clic de l'artisan. Aucun prix, délai ou créneau qui ne vienne pas de l'artisan ou de ses données. Pour un texte rédigé par le moteur de réponses : preparer_reponse.",
    champs: { conversation_id: conversation, texte: { t: 'texte', d: 'Le message, en français, ton de l’artisan, sans prix ni délai inventés.', max: 2000, req: true } },
  },
  valider_reponse_proposee: {
    cat: 'confirmation', libelle: 'envoyer la réponse préparée',
    desc: "Propose d'ENVOYER au client la réponse déjà préparée dans sa conversation (« réponse proposée », lire_conversations). La carte montre le texte exact ; il part au clic de l'artisan.",
    champs: { conversation_id: conversation },
  },
  rejeter_reponse_proposee: {
    cat: 'direct', libelle: 'écarter une réponse préparée',
    desc: "Écarte la réponse préparée d'une conversation (elle ne partira pas). Ne peut pas être annulé : une nouvelle réponse se prépare avec preparer_reponse.",
    champs: { conversation_id: conversation },
  },
  // ── 21/10 — l'assistant relié à TOUT Presti (décision du fondateur) : factures, plateforme, « Ma page », relances automatiques,
  //    et le CRM récent (avancement, rappels, carte, pièces, commandes, après-chantier, lien de suivi). Mêmes règles : DIRECT =
  //    écriture interne journalisée (annulable si possible) ; CONFIRMATION = tout ce qui part chez un client ou ne se défait pas.
  envoyer_facture: {
    cat: 'confirmation', libelle: 'envoyer une facture',
    desc: "Propose d'ENVOYER au client par e-mail une facture DÉJÀ émise (PDF joint), comme le bouton « Envoyer » de l'écran Factures. N'émet rien, n'encaisse rien. Rien ne part avant le clic de l'artisan (ou, s'il l'a activé, son pilote automatique, après 10 minutes pendant lesquelles il peut l'annuler).",
    champs: { numero: numeroFacture },
  },
  regler_relances_impayes: {
    cat: 'confirmation', libelle: 'régler les relances automatiques d’impayés',
    desc: "Propose d'ACTIVER ou de COUPER les relances automatiques des factures impayées (écran Factures : e-mails envoyés seuls aux clients aux jours réglés). Les jours et les textes réglés ne changent pas. L'artisan confirme sur une carte (activer fait partir des e-mails chez ses clients).",
    champs: { actif: { t: 'bool', d: 'Vrai : activer ; faux : couper.' } },
  },
  regler_plateforme: {
    cat: 'confirmation', libelle: 'régler la plateforme',
    desc: "Change des réglages de « Ma plateforme » (comme l'écran) : mode de réponse assistee (l'IA prépare, l'artisan valide) ou manuelle, pause des demandes (congés), plage horaire de réponse (heures 0-23, ou 24 h/24), ton (sobre, chaleureux, direct), nombre de réponses de l'IA par conversation, message d'accueil, nom de l'assistant. Le mode « auto » (l'IA répond seule aux clients, offre Signature) ne se règle PAS ici : l'artisan le choisit lui-même dans Ma plateforme. Une CARTE montre l'avant / après : rien ne change avant le clic de l'artisan (la page est publique). Annulable ensuite.",
    champs: {
      mode_reponse: { t: 'enum', d: 'assistee ou manuelle.', valeurs: ['assistee', 'manuelle'] },
      pause_demandes: { t: 'bool', d: 'Vrai : demandes en pause (rien n’est envoyé, tout est gardé) ; faux : rouvertes.' },
      vingt_quatre_heures: { t: 'bool', d: 'Vrai : réponse 24 h/24 ; faux : seulement dans la plage heure_debut–heure_fin.' },
      heure_debut: { t: 'nombre', d: 'Heure de début (0 à 23), celle de l’artisan.', min: 0, max: 23, sourcer: true },
      heure_fin: { t: 'nombre', d: 'Heure de fin (0 à 23), celle de l’artisan.', min: 0, max: 23, sourcer: true },
      ton_reponses: { t: 'enum', d: 'Ton des réponses : sobre, chaleureux ou direct.', valeurs: ['sobre', 'chaleureux', 'direct'] },
      limite_messages: { t: 'nombre', d: 'Réponses de l’IA au plus par conversation (0 à 40), celle de l’artisan.', min: 0, max: 40, sourcer: true },
      message_accueil: { t: 'texte', d: 'Message d’accueil de la page, dicté par l’artisan.', max: 500 },
      nom_assistant: { t: 'texte', d: 'Nom de l’assistant sur la page, dicté par l’artisan.', max: 60 },
    },
  },
  modifier_ma_page: {
    cat: 'confirmation', libelle: 'modifier « Ma page »',
    desc: "Modifie la page publique de l'artisan (écran Profil) : présentation (bio), zone d'intervention, horaires, prestations à ajouter ou retirer. Seulement les mots que l'artisan te dicte : n'invente ni qualité, ni certification, ni délai. Une CARTE montre l'avant / après : rien ne change avant le clic de l'artisan (la page est publique). Annulable ensuite.",
    champs: {
      bio: { t: 'texte', d: 'Nouvelle présentation, dictée par l’artisan.', max: 800 },
      zone_intervention: { t: 'texte', d: 'Zone d’intervention (ex. La Rochelle et 30 km).', max: 160 },
      horaires: { t: 'texte', d: 'Horaires (ex. Lun-Ven 8h-18h).', max: 200 },
      ajouter_prestations: { t: 'liste', d: 'Noms de prestations à ajouter (12 au total au plus).', max: 12 },
      retirer_prestations: { t: 'liste', d: 'Noms de prestations à retirer.', max: 12 },
    },
  },
  avancer_chantier: {
    cat: 'direct', crm: true, libelle: 'faire avancer un chantier',
    desc: "L'artisan dit où en est un chantier (« carrelage salle de bain fini », « la cuisine est terminée ») : coche les tâches du chantier qui correspondent SANS ambiguïté (mots du travail + pièce), et rend l'avancement mis à jour. Ambigu : rien n'est coché, les tâches candidates te sont rendues : demande lesquelles (puis cocher_tache). Annulable.",
    champs: { chantier, avancement: { t: 'texte', d: 'Ce que l’artisan a dit de l’avancement, tel quel (ex. « carrelage salle de bain fini »).', max: 300, req: true } },
  },
  cloturer_chantier: {
    cat: 'direct', crm: true, libelle: 'valider un chantier',
    desc: "Valide un chantier du CRM dont toutes les tâches sont faites (bouton « Valider » de la carte) : statut terminé, fin réelle posée, le bâtiment quitte la carte de l'atelier (le chantier reste dans les listes, factures et chiffres). Refus s'il reste des tâches : dis combien. Annulable.",
    champs: { chantier },
  },
  remettre_chantier_carte: {
    cat: 'direct', crm: true, libelle: 'remettre un chantier sur la carte',
    desc: "Remet sur la carte de l'atelier un chantier validé (son statut ne change pas).",
    champs: { chantier },
  },
  regler_validation_auto: {
    cat: 'direct', crm: true, libelle: 'régler la validation automatique',
    desc: "Active ou coupe la validation AUTOMATIQUE des chantiers du CRM (un chantier dont toutes les tâches sont faites quitte seul la carte). Annulable.",
    champs: { actif: { t: 'bool', d: 'Vrai : activer ; faux : couper.' } },
  },
  repartir_taches_par_piece: {
    cat: 'direct', crm: true, libelle: 'répartir les tâches par pièce',
    desc: "Range les tâches d'un chantier par pièce (le plan du chantier) : avec tache et piece, range CETTE tâche ; sans, chaque tâche encore sans pièce reçoit celle que son libellé nomme (comme « Répartir les tâches par pièce » de la fiche). Annulable.",
    champs: { chantier, tache: { t: 'texte', d: 'Libellé (ou mot) d’une tâche, pour la ranger seule.', max: 300, rech: true }, piece: { t: 'texte', d: 'La pièce (ex. Salle de bain, Cuisine, WC).', max: 40 } },
  },
  creer_rappel: {
    cat: 'direct', crm: true, libelle: 'créer un rappel',
    desc: "Crée un rappel ou un rendez-vous dans le CRM sur UN chantier, UN devis ou UNE conversation : type, échéance (date donnée par l'artisan), heure si donnée, texte court. Annulable.",
    champs: {
      chantier: { t: 'texte', d: 'Titre du chantier (ou absent).', max: 80, rech: true },
      devis_numero: { t: 'texte', d: 'Numéro du devis (ou absent).', max: 24 },
      conversation_id: { t: 'uuid', d: 'Conversation (lire_conversations), ou absent.' },
      genre: { t: 'enum', d: 'rappeler (défaut), relancer_devis, visite, metre, rendez_vous ou autre.', valeurs: ['rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre'] },
      echeance: { t: 'date', d: 'Échéance AAAA-MM-JJ, celle de l’artisan.' },
      heure: { t: 'texte', d: 'Heure HH:MM, si l’artisan l’a donnée.', max: 5 },
      texte: { t: 'texte', d: 'Ce qu’il faut faire, en quelques mots.', max: 300 },
    },
  },
  cocher_rappel: {
    cat: 'direct', crm: true, libelle: 'cocher un rappel',
    desc: "Coche (fait) ou décoche un rappel à faire du CRM, retrouvé par son texte ou sa cible (lire_rappels). Annulable.",
    champs: { rappel: { t: 'texte', d: 'Texte (ou mot) du rappel, ou nom de sa cible, tel que lire_rappels le rend.', max: 300, req: true, rech: true }, fait: { t: 'bool', d: 'Vrai : fait (défaut). Faux : à refaire.' } },
  },
  enregistrer_commande: {
    cat: 'direct', crm: true, libelle: 'enregistrer une commande fournisseur',
    desc: "Enregistre une commande que l'artisan A PASSÉE chez un fournisseur (rien n'est commandé d'ici) : fournisseur, lignes, livraison annoncée, chantier destinataire. Chaque ligne s'écrit « quantité unité désignation » (ex. « 20 u plaque BA13 ») ; une désignation qui est celle d'un article de l'inventaire y est rattachée. Quantités et date : celles de l'artisan. Annulable (la commande est alors annulée).",
    champs: {
      fournisseur: { t: 'texte', d: 'Nom du fournisseur.', max: 120, req: true },
      livraison_prevue: { t: 'date', d: 'Livraison annoncée AAAA-MM-JJ, celle de l’artisan.' },
      articles: { t: 'liste', d: 'Lignes « quantité unité désignation », telles que l’artisan les dit. 20 au plus.', max: 20 },
      chantier: { t: 'texte', d: 'Chantier destinataire (ou absent).', max: 80, rech: true },
      reference: { t: 'texte', d: 'Référence de la commande, si donnée.', max: 60 },
    },
  },
  recevoir_commande: {
    cat: 'direct', crm: true, libelle: 'marquer une commande reçue',
    desc: "Marque reçue une commande fournisseur EN ATTENTE (retrouvée par fournisseur ou référence, lire_commandes) ; avec entrer_en_stock, chaque ligne liée à l'inventaire y entre (même chemin que l'écran). Ne se défait pas d'un clic (un stock se corrige avec ajuster_stock).",
    champs: { commande: { t: 'texte', d: 'Fournisseur ou référence de la commande.', max: 120, req: true, rech: true }, entrer_en_stock: { t: 'bool', d: 'Vrai : faire entrer les lignes liées à l’inventaire.' } },
  },
  relancer_commande: {
    cat: 'confirmation', crm: true, libelle: 'relancer un fournisseur',
    desc: "Propose d'envoyer au FOURNISSEUR d'une commande en attente l'e-mail de relance de l'écran (texte fixe : date de commande, livraison annoncée, lignes). Rien ne part avant le clic de l'artisan.",
    champs: { commande: { t: 'texte', d: 'Fournisseur ou référence de la commande.', max: 120, req: true, rech: true } },
  },
  demander_avis: {
    cat: 'confirmation', crm: true, libelle: 'demander un avis au client',
    desc: "Propose d'envoyer au client d'un chantier terminé la DEMANDE D'AVIS préparée par l'après-chantier (texte de l'artisan, réglé dans le CRM). Seulement si un rappel « Demander un avis » attend pour ce chantier. Rien ne part avant le clic de l'artisan.",
    champs: { chantier },
  },
  envoyer_rappel_entretien: {
    cat: 'confirmation', crm: true, libelle: 'proposer l’entretien au client',
    desc: "Propose d'envoyer au client la PROPOSITION D'ENTRETIEN préparée par l'après-chantier pour ce chantier (rappel « Proposer l'entretien »). Rien ne part avant le clic de l'artisan.",
    champs: { chantier },
  },
  noter_opposition_client: {
    cat: 'confirmation', crm: true, libelle: 'noter que le client refuse les messages',
    desc: "Propose de noter que le client d'un chantier ne veut plus recevoir de messages d'après-chantier (avis, entretien). Ne s'annule pas (droit d'opposition) : l'artisan confirme sur une carte.",
    champs: { chantier },
  },
  revoquer_lien_suivi: {
    cat: 'direct', crm: true, libelle: 'révoquer le lien de suivi',
    desc: "Coupe le lien de suivi d'un chantier donné au client (la page cesse aussitôt de répondre). Un NOUVEAU lien se crée sur la fiche du chantier (il ne s'affiche qu'une fois, là-bas : l'assistant ne le montre ni ne le garde).",
    champs: { chantier },
  },
} as const satisfies Record<string, SpecAction>

export type NomAction = keyof typeof SPEC
export const NOMS_ACTIONS = Object.keys(SPEC) as NomAction[]
export const estNomAction = (n: unknown): n is NomAction => typeof n === 'string' && Object.prototype.hasOwnProperty.call(SPEC, n)
const specDe = (n: NomAction): SpecAction => SPEC[n] as SpecAction
export const categorieDe = (n: NomAction): CategorieAction => specDe(n).cat
export const estActionCrm = (n: NomAction): boolean => !!specDe(n).crm
export const ACTIONS_CONFIRMEES: readonly NomAction[] = NOMS_ACTIONS.filter((n) => specDe(n).cat === 'confirmation')
export const ACTIONS_DIRECTES: readonly NomAction[] = NOMS_ACTIONS.filter((n) => specDe(n).cat === 'direct')
export const ACTIONS_CRM: readonly NomAction[] = NOMS_ACTIONS.filter((n) => specDe(n).crm)
export const LIBELLE_ACTION: Record<NomAction, string> = Object.fromEntries(NOMS_ACTIONS.map((n) => [n, specDe(n).libelle])) as Record<NomAction, string>

/** Au plus ce nombre d'actions (directes + cartes) par message : borne le travail d'un tour et l'envoi en masse. */
export const ACTIONS_PAR_TOUR_MAX = 12

// ── Les schémas vus par le modèle (dérivés de SPEC) ────────────────────────────────────────────────

type SchemaChamp = Record<string, unknown>
const LIGNE_SCHEMA: SchemaChamp = {
  type: 'object', additionalProperties: false,
  properties: {
    tarif_id: { type: 'string', description: 'Identifiant (UUID) d’un tarif de l’artisan (lire_tarifs) : prix, unité et TVA viennent de lui.' },
    designation: { type: 'string', maxLength: 300, description: 'Désignation de la ligne (reprise du tarif si tarif_id).' },
    quantite: { type: 'number', exclusiveMinimum: 0, maximum: 100000, description: 'Quantité.' },
    unite: { type: 'string', maxLength: 16, description: 'Unité (reprise du tarif si tarif_id).' },
    prix_unitaire_ht: { type: 'number', minimum: 0, maximum: 10000000, description: 'Prix unitaire HT, SEULEMENT si l’artisan l’a donné et sans tarif_id. Sinon absent : la ligne est à chiffrer.' },
  },
  required: ['quantite'],
}

function schemaChamp(c: Champ): SchemaChamp {
  switch (c.t) {
    case 'texte': return { type: 'string', maxLength: c.max ?? 300, description: c.d }
    case 'nombre': return { type: 'number', ...(c.min !== undefined ? { minimum: c.min } : {}), ...(c.max !== undefined ? { maximum: c.max } : {}), description: c.d }
    case 'bool': return { type: 'boolean', description: c.d }
    case 'enum': return { type: 'string', enum: [...c.valeurs], description: c.d }
    case 'uuid': return { type: 'string', description: c.d }
    case 'email': return { type: 'string', maxLength: 200, description: c.d }
    case 'date': return { type: 'string', description: c.d }
    case 'liste': return { type: 'array', maxItems: c.max, items: { type: 'string', maxLength: 300 }, description: c.d }
    case 'lignes': return { type: 'array', maxItems: LIGNES_MAX, items: LIGNE_SCHEMA, description: c.d }
  }
}

export type DefinitionAction = {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, SchemaChamp>; required?: string[]; additionalProperties: false }
}

export const DEFINITIONS_ACTIONS: Record<NomAction, DefinitionAction> = Object.fromEntries(NOMS_ACTIONS.map((n) => {
  const s = specDe(n)
  const required = Object.entries(s.champs).filter(([, c]) => 'req' in c && c.req).map(([k]) => k)
  const def: DefinitionAction = {
    name: n,
    description: s.desc,
    input_schema: { type: 'object', properties: Object.fromEntries(Object.entries(s.champs).map(([k, c]) => [k, schemaChamp(c)])), ...(required.length ? { required } : {}), additionalProperties: false },
  }
  return [n, def]
})) as Record<NomAction, DefinitionAction>

// ── La validation : le modèle n'est jamais cru sur parole ──────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const NUMERO = /^(DEV|FAC)-\d{4}-\d{1,6}$/i
const DEFAUTS: Record<string, unknown> = { ton: 'cordial', type: 'complete', faite: true, fait: true, lieu: 'atelier', entrer_en_stock: false, genre: 'rappeler' }

export type LigneEntree = { tarif_id: string | null; designation: string; quantite: number; unite: string | null; prix_unitaire_ht: number | null }
export type EntreeAction = Record<string, unknown>
export type ValidationAction = { ok: true; entree: EntreeAction } | { ok: false; erreur: string }

const nettoyer = (s: string, rech: boolean) => {
  const sansControle = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').replace(/\r/g, '')
  return (rech ? sansControle.replace(/[%_]/g, ' ').replace(/\s+/g, ' ') : sansControle.replace(/[ \t]+/g, ' ')).trim()
}

function validerLignes(v: unknown, nom: string): { ok: true; lignes: LigneEntree[] } | { ok: false; erreur: string } {
  if (!Array.isArray(v)) return { ok: false, erreur: `${nom} : une liste de lignes` }
  if (v.length > LIGNES_MAX) return { ok: false, erreur: `${nom} : ${LIGNES_MAX} lignes au plus` }
  const out: LigneEntree[] = []
  for (const [i, brut] of v.entries()) {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return { ok: false, erreur: `${nom}[${i + 1}] : un objet attendu` }
    const l = brut as Record<string, unknown>
    const inconnues = Object.keys(l).filter((k) => !['tarif_id', 'designation', 'quantite', 'unite', 'prix_unitaire_ht'].includes(k))
    if (inconnues.length) return { ok: false, erreur: `${nom}[${i + 1}] : champ inconnu ${inconnues[0]}` }
    let tarif: string | null = null
    if (l.tarif_id !== undefined && l.tarif_id !== null) {
      if (typeof l.tarif_id !== 'string' || !UUID.test(l.tarif_id.trim())) return { ok: false, erreur: `${nom}[${i + 1}] : tarif_id doit être un UUID rendu par lire_tarifs` }
      tarif = l.tarif_id.trim().toLowerCase()
    }
    const q = Number(l.quantite)
    if (typeof l.quantite !== 'number' || !Number.isFinite(q) || q <= 0 || q > 100000) return { ok: false, erreur: `${nom}[${i + 1}] : quantite > 0 attendue` }
    let pu: number | null = null
    if (l.prix_unitaire_ht !== undefined && l.prix_unitaire_ht !== null) {
      if (typeof l.prix_unitaire_ht !== 'number' || !Number.isFinite(l.prix_unitaire_ht) || l.prix_unitaire_ht < 0 || l.prix_unitaire_ht > 10_000_000) return { ok: false, erreur: `${nom}[${i + 1}] : prix_unitaire_ht ≥ 0 attendu` }
      pu = l.prix_unitaire_ht
    }
    const designation = typeof l.designation === 'string' ? nettoyer(l.designation, false).slice(0, 300) : ''
    if (!designation && !tarif) return { ok: false, erreur: `${nom}[${i + 1}] : une désignation (ou un tarif_id) est nécessaire` }
    const unite = typeof l.unite === 'string' && l.unite.trim() ? nettoyer(l.unite, false).slice(0, 16) : null
    out.push({ tarif_id: tarif, designation, quantite: q, unite, prix_unitaire_ht: tarif ? null : pu })
  }
  return { ok: true, lignes: out }
}

/** Valide l'entrée d'une action contre SPEC, sans tolérance : type faux, valeur hors liste, champ inconnu → refus lisible. */
export function validerAction(nom: NomAction, brut: unknown): ValidationAction {
  const ko = (erreur: string): ValidationAction => ({ ok: false, erreur })
  if (brut === undefined || brut === null) brut = {}
  if (typeof brut !== 'object' || Array.isArray(brut)) return ko('entrée attendue : un objet')
  const o = brut as Record<string, unknown>
  const champs = specDe(nom).champs
  const inconnues = Object.keys(o).filter((k) => !(k in champs))
  if (inconnues.length) return ko(`champ inconnu : ${inconnues.slice(0, 3).join(', ')}`)
  const entree: EntreeAction = {}
  for (const [cle, c] of Object.entries(champs)) {
    const v = o[cle]
    const absent = v === undefined || v === null || v === ''
    if (absent) {
      if ('req' in c && c.req) return ko(`${cle} : obligatoire`)
      entree[cle] = c.t === 'liste' || c.t === 'lignes' ? [] : cle in DEFAUTS ? DEFAUTS[cle] : null
      continue
    }
    switch (c.t) {
      case 'texte': {
        if (typeof v !== 'string') return ko(`${cle} : du texte`)
        const t = nettoyer(v, !!c.rech)
        if (t.length > (c.max ?? 300)) return ko(`${cle} : ${c.max ?? 300} caractères au plus`)
        if (!t && c.req) return ko(`${cle} : obligatoire`)
        entree[cle] = t || null
        break
      }
      case 'nombre': {
        if (typeof v !== 'number' || !Number.isFinite(v)) return ko(`${cle} : un nombre`)
        if ((c.min !== undefined && v < c.min) || (c.max !== undefined && v > c.max)) return ko(`${cle} : entre ${c.min ?? '−∞'} et ${c.max ?? '+∞'}`)
        entree[cle] = v
        break
      }
      case 'bool': if (typeof v !== 'boolean') return ko(`${cle} : vrai ou faux`); entree[cle] = v; break
      case 'enum': if (typeof v !== 'string' || !c.valeurs.includes(v)) return ko(`${cle} : une valeur parmi ${c.valeurs.join(', ')}`); entree[cle] = v; break
      case 'uuid': if (typeof v !== 'string' || !UUID.test(v.trim())) return ko(`${cle} : identifiant (UUID) attendu, tel que rendu par un outil de lecture`); entree[cle] = v.trim().toLowerCase(); break
      case 'email': if (typeof v !== 'string' || !EMAIL.test(v.trim())) return ko(`${cle} : adresse e-mail invalide`); entree[cle] = v.trim().toLowerCase().slice(0, 200); break
      case 'date': {
        if (typeof v !== 'string' || !DATE.test(v.trim()) || Number.isNaN(Date.parse(v.trim() + 'T00:00:00Z'))) return ko(`${cle} : date AAAA-MM-JJ`)
        entree[cle] = v.trim()
        break
      }
      case 'liste': {
        if (!Array.isArray(v) || v.length > c.max || v.some((x) => typeof x !== 'string' && typeof x !== 'number')) return ko(`${cle} : une liste de ${c.max} textes au plus`)
        entree[cle] = v.map((x) => nettoyer(String(x), true).slice(0, 300)).filter(Boolean)
        break
      }
      case 'lignes': {
        const r = validerLignes(v, cle)
        if (!r.ok) return ko(r.erreur)
        if (!r.lignes.length && 'req' in c && c.req) return ko(`${cle} : au moins une ligne`)
        entree[cle] = r.lignes
        break
      }
    }
  }
  // Numéros : DEV- pour les devis, FAC- pour les factures, en majuscules.
  for (const cle of ['numero', 'devis_numero']) {
    if (typeof entree[cle] === 'string') {
      const n = (entree[cle] as string).toUpperCase()
      if (!NUMERO.test(n)) return ko(`${cle} : numéro de pièce attendu (DEV-AAAA-NNNN ou FAC-AAAA-NNNN)`)
      const attendu = cle === 'numero' && /facture/.test(nom) ? 'FAC' : 'DEV'
      if (!n.startsWith(attendu + '-')) return ko(`${cle} : un numéro ${attendu}-… est attendu`)
      entree[cle] = n
    }
  }
  const e = validerCoherence(nom, entree)
  return e ? ko(e) : { ok: true, entree }
}

/** Les règles qui lient plusieurs champs. */
function validerCoherence(nom: NomAction, e: EntreeAction): string | null {
  const vide = (k: string) => !(e[k] as unknown[] | undefined)?.length
  switch (nom) {
    case 'creer_devis':
      return !e.client_nom && !e.conversation_id ? 'client_nom (ou conversation_id) : obligatoire' : null
    case 'modifier_devis':
      return !e.objet && vide('ajouter_lignes') && vide('retirer_lignes') && e.remise_pct === null && e.acompte_pct === null && !e.client_nom && !e.client_email ? 'rien à modifier' : null
    case 'creer_facture':
      if (e.type === 'acompte' && e.acompte_pct === null) return 'acompte_pct : obligatoire pour une facture d’acompte'
      if (e.type === 'complete' && e.acompte_pct !== null) return 'acompte_pct : réservé à type=acompte'
      // 0176 (drapeau facturesSituation) : un pourcentage n'appartient qu'à son type.
      if ((e.type === 'situation' || e.type === 'solde') && e.acompte_pct !== null) return 'acompte_pct : réservé à type=acompte'
      if (e.type === 'situation' && (e.avancement_pct === null || e.avancement_pct === undefined)) return 'avancement_pct : obligatoire pour une situation de travaux'
      if (e.type !== 'situation' && e.avancement_pct !== null && e.avancement_pct !== undefined) return 'avancement_pct : réservé à type=situation'
      return null
    case 'modifier_article':
      return e.seuil_alerte === null && !e.fournisseur_prefere && !e.categorie ? 'rien à modifier' : null
    case 'creer_chantier':
      if (!e.devis_numero && !e.titre) return 'titre (ou devis_numero d’un devis signé) : obligatoire'
      if (e.generer_taches === true && !e.devis_numero) return 'generer_taches : demande un devis'
      if (e.date_debut && e.date_fin_prevue && (e.date_fin_prevue as string) < (e.date_debut as string)) return 'la fin prévue est avant le début'
      return null
    case 'modifier_chantier':
      if (!e.statut && !e.date_debut && !e.date_fin_prevue && !e.adresse && !e.notes) return 'rien à modifier'
      if (e.date_debut && e.date_fin_prevue && (e.date_fin_prevue as string) < (e.date_debut as string)) return 'la fin prévue est avant le début'
      return null
    case 'affecter_equipe':
      return vide('ajouter') && vide('retirer') ? 'ajouter ou retirer : au moins un nom' : null
    case 'ajouter_note':
      if (!e.chantier && !e.conversation_id) return 'chantier ou conversation_id : obligatoire'
      return e.chantier && e.conversation_id ? 'chantier OU conversation_id, pas les deux' : null
    case 'regler_relances_impayes':
    case 'regler_validation_auto':
      return e.actif === null ? 'actif : vrai (activer) ou faux (couper)' : null
    case 'regler_plateforme': {
      const cles = ['mode_reponse', 'pause_demandes', 'vingt_quatre_heures', 'heure_debut', 'heure_fin', 'ton_reponses', 'limite_messages', 'message_accueil', 'nom_assistant']
      if (cles.every((k) => e[k] === null || e[k] === undefined)) return 'rien à modifier'
      if ((e.heure_debut === null) !== (e.heure_fin === null)) return 'heure_debut et heure_fin : les deux ensemble'
      if (e.heure_debut !== null && (!Number.isInteger(e.heure_debut) || !Number.isInteger(e.heure_fin))) return 'heures : entiers de 0 à 23'
      if (e.limite_messages !== null && !Number.isInteger(e.limite_messages)) return 'limite_messages : un entier'
      return null
    }
    case 'modifier_ma_page':
      return !e.bio && !e.zone_intervention && !e.horaires && vide('ajouter_prestations') && vide('retirer_prestations') ? 'rien à modifier' : null
    case 'repartir_taches_par_piece':
      return (e.tache === null) !== (e.piece === null) ? 'tache et piece : les deux ensemble (ou aucun pour tout répartir)' : null
    case 'creer_rappel': {
      const cibles = [e.chantier, e.devis_numero, e.conversation_id].filter((x) => x !== null && x !== undefined && x !== '')
      if (cibles.length !== 1) return 'un rappel se rattache à UN chantier, UN devis (devis_numero) ou UNE conversation'
      if (!e.echeance) return 'echeance : obligatoire (la date donnée par l’artisan)'
      if (e.heure !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.heure))) return 'heure : HH:MM'
      return null
    }
    case 'enregistrer_commande':
      if (!e.livraison_prevue) return 'livraison_prevue : obligatoire (la date annoncée par le fournisseur)'
      return vide('articles') ? 'articles : au moins une ligne' : null
    case 'ajouter_tarif':
      return e.tva_taux !== null && !(TVA_TAUX as readonly number[]).includes(e.tva_taux as number) ? 'tva_taux : 0, 5.5, 10 ou 20' : null
    default:
      return null
  }
}

// ── Les nombres qui doivent venir de l'artisan ─────────────────────────────────────────────────────

/** Les nombres qui doivent se trouver dans ce que l'artisan a écrit (ou dans une donnée lue) : prix sans tarif, pourcentages, quantités de stock. */
export function nombresASourcer(nom: NomAction, e: EntreeAction): { champ: string; valeur: number }[] {
  const out: { champ: string; valeur: number }[] = []
  for (const [cle, c] of Object.entries(specDe(nom).champs)) {
    if (c.t === 'nombre' && c.sourcer && typeof e[cle] === 'number') out.push({ champ: cle, valeur: e[cle] as number })
  }
  // 21/10 — les quantités d'une commande fournisseur (« 20 u plaque BA13 ») : celles de l'artisan, comme toute quantité.
  if (nom === 'enregistrer_commande' && Array.isArray(e.articles)) {
    for (const [i, a] of (e.articles as string[]).entries()) {
      const m = String(a).trim().match(/^(\d+(?:[.,]\d+)?)/)
      if (m) out.push({ champ: `articles[${i + 1}].quantite`, valeur: Number(m[1].replace(',', '.')) })
    }
  }
  for (const cle of ['lignes', 'ajouter_lignes']) {
    if (!Array.isArray(e[cle])) continue
    for (const [i, l] of (e[cle] as LigneEntree[]).entries()) if (!l.tarif_id && l.prix_unitaire_ht !== null && l.prix_unitaire_ht > 0) out.push({ champ: `${cle}[${i + 1}].prix_unitaire_ht`, valeur: l.prix_unitaire_ht })
  }
  return out
}
