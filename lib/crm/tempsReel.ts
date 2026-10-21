// CRM — le TEMPS RÉEL de l'écran : quelles tables écouter, avec quel filtre, et comment regrouper une rafale d'évènements en UNE
// relecture. Module pur (seul import : les drapeaux, eux-mêmes purs) : rejoué par scripts/crm-qa.mjs ; la liaison avec Supabase est dans app/crm/useTempsReel.ts.
//
// Le principe : un évènement dit « quelque chose a changé dans ce compte », jamais « voici la nouvelle valeur ». L'écran relit alors
// GET /api/crm/vue — le MÊME calcul que la première lecture (lib/crm/vue.ts) : aucun chiffre n'est recomposé côté navigateur à partir
// d'un évènement, donc aucun chiffre ne peut diverger de la donnée réelle (« deux chiffres, un écran »).
//
// Sécurité, deux couches : le filtre `artisan_id=eq.<uid>` limite ce que le serveur de temps réel envoie au compte de la session, et la
// RLS de chaque table (lecture de SES lignes) limite ce qu'il a le droit de recevoir — voir la migration 0158.
//
// 21/10 (« le CRM est connecté à tout, en temps réel », scripts/crm-connecte-qa.mjs) : chaque table que GET /api/crm/vue lit est soit
// écoutée ici, soit écartée avec sa raison (HORS_TEMPS_REEL). Deux trous trouvés : `clients` (le carnet : nom, e-mail, téléphone d'un
// client modifiés depuis un autre écran) et `crm_journal` (un dossier déplacé à la main dans le pipeline depuis un autre appareil).
// Migration 0175 (ÉCRITE, NON APPLIQUÉE) : elle les ajoute à la publication ; ils ne sont écoutés QUE drapeau `crmTempsReelComplet`
// levé — s'abonner à une table absente de la publication ferait tomber le canal entier. Ordre : coller 0175, PUIS lever le drapeau.
import { FLAGS } from '../flags.ts'

/**
 * Les tables que l'écran écoute. ⚠️ Identique à la liste de la publication `supabase_realtime` des migrations 0158 et 0162 (scripts/crm-qa.mjs
 * compare les deux). Toutes portent `artisan_id`, condition du filtre. `stock` n'y est pas (pas d'artisan_id) : ses variations passent par
 * `mouvements_stock`.
 */
export const TABLES_TEMPS_REEL = [
  'devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux',
  'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur',
  // 18/10 : les rappels et rendez-vous (migration 0162, qui les ajoute à la publication).
  'crm_rappels',
] as const
/** Ajoutées à la publication par la migration 0175 : écoutées seulement drapeau `crmTempsReelComplet` levé (0175 appliquée). */
export const TABLES_APRES_0175 = ['clients', 'crm_journal'] as const
export type TableTempsReel = (typeof TABLES_TEMPS_REEL)[number] | (typeof TABLES_APRES_0175)[number]

/** Les tables que l'écran écoute AUJOURD'HUI (selon le drapeau de 0175). */
export const tablesEcoutees = (complet: boolean = FLAGS.crmTempsReelComplet): readonly TableTempsReel[] =>
  complet ? [...TABLES_TEMPS_REEL, ...TABLES_APRES_0175] : TABLES_TEMPS_REEL

/**
 * Les tables lues pour composer l'écran (lib/crm/serveur.ts : gardeCrm, chargerDossiers, lireReglages ; le stock et les fournisseurs
 * arrivent par jointure sur materiaux). scripts/crm-connecte-qa.mjs RECALCULE cette liste depuis le code et la compare : une lecture
 * ajoutée sans être écoutée (ni écartée ci-dessous) fait rougir la suite.
 */
export const SOURCES_VUE = [
  'artisans', 'devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'materiaux', 'stock', 'fournisseurs', 'crm_journal', 'clients',
  'vehicules', 'equipe_membres', 'chantier_equipe', 'chantier_materiaux', 'commandes_fournisseur', 'crm_rappels', 'crm_reglages',
] as const

/** Les sources lues mais NON écoutées, chacune avec sa raison (elles sont relues par le filet de 60 s et à chaque ouverture de l'écran). */
export const HORS_TEMPS_REEL: Readonly<Record<string, string>> = {
  artisans: 'la fiche du compte (métier, forme juridique, nom, ville, adresse) : la diffuser par le temps réel enverrait toute la ligne (offre, crédits, Stripe) au navigateur ; elle se modifie dans Paramètres, et l’atelier la relit à son ouverture et toutes les 60 s',
  stock: 'pas de colonne artisan_id (filtre impossible) : chaque variation passe par appliquer_mouvement, qui écrit aussi mouvements_stock, écoutée',
  fournisseurs: 'le nom et le contact d’un fournisseur (jointure sur materiaux) : modifiés depuis Inventaire, relus à l’ouverture et toutes les 60 s',
  crm_reglages: 'fermée aux rôles du navigateur (RLS sans politique, 0172) : le temps réel ne pourrait rien en livrer ; le réglage s’écrit depuis l’écran même, qui relit aussitôt',
}

/** Ce que l'artisan lit quand l'écran se met à jour tout seul : « Tâche cochée », « Devis signé »… (toujours dans l'ordre : le plus parlant d'abord). */
export const LIBELLE_TABLE: Record<TableTempsReel, string> = {
  devis: 'Devis', factures: 'Facture', leads: 'Demande', chantiers: 'Chantier', chantier_taches: 'Tâche', chantier_equipe: 'Équipe du chantier',
  chantier_materiaux: 'Matériel réservé', materiaux: 'Inventaire', mouvements_stock: 'Stock', vehicules: 'Véhicule', equipe_membres: 'Équipe', commandes_fournisseur: 'Commande',
  crm_rappels: 'Rappel',
  clients: 'Client', crm_journal: 'Pipeline',
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type Abonnement = { schema: 'public'; table: TableTempsReel; event: '*'; filter: string }

/** Le filtre d'un compte. Un identifiant qui n'est pas un uuid ne donne AUCUN abonnement (jamais un filtre fabriqué à partir de n'importe quoi). */
export const filtreCompte = (uid: string): string | null => (RE_UUID.test(uid) ? `artisan_id=eq.${uid.toLowerCase()}` : null)

/**
 * Les abonnements d'un compte. `sans` : des tables encore ABSENTES de la base (une migration pas encore appliquée, comme 0162 pour
 * crm_rappels) — s'abonner à une table qui n'existe pas fait échouer TOUT le canal, et l'écran perdrait son temps réel entier.
 */
export function abonnements(uid: string, sans: readonly TableTempsReel[] = [], complet: boolean = FLAGS.crmTempsReelComplet): Abonnement[] {
  const filter = filtreCompte(uid)
  return filter ? tablesEcoutees(complet).filter((t) => !sans.includes(t)).map((table) => ({ schema: 'public' as const, table, event: '*' as const, filter })) : []
}

export type Minuteur = { set: (f: () => void, ms: number) => unknown; clear: (id: unknown) => void }
const MINUTEUR_REEL: Minuteur = { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) }

/**
 * Regroupe une rafale de signaux en UN seul appel : `calme` ms après le dernier signal, mais jamais plus de `max` ms après le
 * premier (un flux continu de modifications ne repousse pas indéfiniment la mise à jour). Cocher dix tâches d'affilée = une relecture.
 */
export function creerRafale(appel: () => void, calme = 400, max = 2500, minuteur: Minuteur = MINUTEUR_REEL, maintenant: () => number = Date.now) {
  let id: unknown = null
  let premier = 0
  const lancer = () => { id = null; premier = 0; appel() }
  return {
    signaler() {
      const t = maintenant()
      if (id === null) premier = t
      else minuteur.clear(id)
      id = minuteur.set(lancer, Math.max(0, Math.min(calme, premier + max - t)))
    },
    annuler() { if (id !== null) minuteur.clear(id); id = null; premier = 0 },
    enAttente: () => id !== null,
  }
}
