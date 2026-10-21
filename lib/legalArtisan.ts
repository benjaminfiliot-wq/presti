// Existence juridique des surfaces de l'artisan (v4 §16.5, correctif du 2026-09-03).
//
// Le défaut trouvé par l'audit : le site vitrine et la plateforme de contact n'avaient
// AUCUNE mention légale ni information sur les données. Or :
//  • un site professionnel doit porter les mentions de l'article 6-III de la LCEN ;
//  • la plateforme collecte nom, coordonnées, description de panne, photos de domicile
//    et adresse IP, sans dire un mot des finalités, des durées ni des droits (RGPD art. 13).
// Et c'est l'ARTISAN qui est responsable de traitement : c'est lui que la CNIL
// sanctionnerait, pour un site que Presti a produit.
//
// Règle tenue ici, la même que partout : **aucune donnée inventée**. Un champ que
// l'artisan n'a pas renseigné n'est pas comblé par une formule creuse — on écrit
// honnêtement qu'il manque, et on le lui dit dans sa console.

export type ArtisanLegal = {
  nom: string | null
  metier: string | null
  forme_juridique: string | null
  siret: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  tel_public: string | null
  email_public: string | null
  tva_num: string | null
  assurance_nom: string | null
  assurance_contrat: string | null
  assurance_activites: string | null
  assurance_zone: string | null
  zone_intervention: string | null
  mediateur_nom: string | null
  mediateur_url: string | null
}

export type Mention = { cle: string; label: string; valeur: string | null; obligatoire: boolean }

/** Ce qui doit figurer sur les mentions légales, avec ce qui manque clairement identifié. */
export function mentionsObligatoires(a: ArtisanLegal): Mention[] {
  const adresse = [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [
    { cle: 'nom', label: 'Dénomination', valeur: a.nom, obligatoire: true },
    { cle: 'forme', label: 'Forme juridique', valeur: a.forme_juridique, obligatoire: true },
    { cle: 'siret', label: 'SIRET', valeur: a.siret, obligatoire: true },
    { cle: 'adresse', label: 'Adresse', valeur: adresse || null, obligatoire: true },
    { cle: 'contact', label: 'Contact', valeur: [a.tel_public, a.email_public].filter(Boolean).join(' · ') || null, obligatoire: true },
    { cle: 'tva', label: 'N° de TVA intracommunautaire', valeur: a.tva_num, obligatoire: false },
    {
      cle: 'assurance',
      label: 'Assurance professionnelle',
      valeur: a.assurance_nom
        ? [a.assurance_nom,
           a.assurance_contrat ? `contrat n° ${a.assurance_contrat}` : null,
           a.assurance_activites, a.assurance_zone].filter(Boolean).join(', ')
        : null,
      // Obligatoire pour les métiers du bâtiment (garantie décennale, art. L.241-1 c. ass.).
      obligatoire: true,
    },
    {
      cle: 'mediateur',
      label: 'Médiateur de la consommation',
      valeur: a.mediateur_nom
        ? [a.mediateur_nom, a.mediateur_url].filter(Boolean).join(' — ')
        : null,
      // Art. L.616-1 c. conso : obligatoire dès qu'on vend à des particuliers.
      // On ne l'invente pas : une page qui évoque « un médiateur » sans le nommer
      // est une affirmation non fondée de plus.
      obligatoire: true,
    },
  ]
}

/** Les mentions obligatoires qui manquent — sert à prévenir l'artisan dans sa console. */
export function mentionsManquantes(a: ArtisanLegal): string[] {
  return mentionsObligatoires(a).filter((m) => m.obligatoire && !m.valeur).map((m) => m.label)
}

// ── Mentions BLOQUANTES avant émission (audit v4 §3 : « 10/10 comptes ont siret = null »).
//
// Un devis ou une facture qui SORT sans ces mentions expose l'artisan : 15 € d'amende par
// mention manquante (art. L.441-9 c. com., art. 242 nonies A ann. II CGI), et jusqu'à
// 3 000 € pour l'absence de l'assurance décennale sur un devis du bâtiment (art. L.243-2
// c. assurances). On bloque donc l'ENVOI d'un devis et la CRÉATION d'une facture — jamais
// la sauvegarde d'un brouillon : l'artisan peut travailler, il ne peut pas émettre.
//
// Le médiateur (obligatoire sur le site) et le contact public ne bloquent pas ici : ils
// sont signalés dans la console, mais leur absence sur le document n'entraîne pas la
// même sanction, et bloquer davantage empêcherait de facturer.
export const MENTIONS_EMISSION: readonly string[] = ['nom', 'forme', 'siret', 'adresse', 'assurance']

/** Où l'artisan remplit ces mentions. Une seule vérité, réutilisée dans le message et le lien. */
export const OU_REMPLIR = { lien: '/parametres', label: 'Paramètres → Entreprise & légal' }

/** Les mentions dont l'absence interdit d'émettre (devis envoyé, facture créée). */
export function mentionsManquantesEmission(a: ArtisanLegal): string[] {
  return mentionsObligatoires(a)
    .filter((m) => MENTIONS_EMISSION.includes(m.cle) && !m.valeur)
    .map((m) => m.label)
}

/**
 * Le message rendu à l'artisan quand on refuse d'émettre : quoi remplir, et où.
 * `quoi` = « ce devis » / « cette facture ».
 */
export function messageMentionsBloquantes(manquantes: string[], quoi: string): string {
  const liste = manquantes.join(', ')
  return `Impossible d'émettre ${quoi} : il manque ${manquantes.length > 1 ? 'des mentions obligatoires' : 'une mention obligatoire'} (${liste}). ` +
    `Renseignez-${manquantes.length > 1 ? 'les' : 'la'} dans ${OU_REMPLIR.label}, puis réessayez. Votre brouillon est conservé.`
}

/** Colonnes à lire sur `artisans` pour appeler mentionsManquantesEmission (évite un select('*')). */
export const COLONNES_LEGALES =
  'nom, metier, forme_juridique, siret, adresse, code_postal, ville, tel_public, email_public, tva_num, assurance_nom, assurance_contrat, assurance_activites, assurance_zone, zone_intervention, mediateur_nom, mediateur_url'

/** Normalise une ligne `artisans` (colonnes possiblement absentes) en ArtisanLegal. */
export function versArtisanLegal(a: Record<string, unknown> | null | undefined): ArtisanLegal {
  const s = (k: string): string | null => {
    const v = a?.[k]
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }
  return {
    nom: s('nom'), metier: s('metier'), forme_juridique: s('forme_juridique'), siret: s('siret'),
    adresse: s('adresse'), code_postal: s('code_postal'), ville: s('ville'),
    tel_public: s('tel_public'), email_public: s('email_public'), tva_num: s('tva_num'),
    assurance_nom: s('assurance_nom'), assurance_contrat: s('assurance_contrat'),
    assurance_activites: s('assurance_activites'), assurance_zone: s('assurance_zone'),
    zone_intervention: s('zone_intervention'), mediateur_nom: s('mediateur_nom'), mediateur_url: s('mediateur_url'),
  }
}

// ── Durées de conservation : ce qui est ANNONCÉ est ce qui est APPLIQUÉ.
//
// Le défaut trouvé par l'audit final (auditeur B, majeur C6) : ces pages annonçaient
// « 3 ans », « 12 mois » en toutes lettres, et aucune ligne de code ne les appliquait — rien
// n'était jamais purgé. Une durée promise que la base ne tient pas est le pire des deux
// mondes : elle ne protège personne et elle constitue l'écart démontrable qu'un contrôle
// cherche (RGPD art. 5.1 e « limitation de la conservation », art. 13.2 a « durée annoncée »).
//
// Les durées vivent donc ici en NOMBRES DE MOIS, pas en phrases. `lib/purgesRgpd.ts` les
// exécute, les pages légales les affichent via `libelleDuree`. Changer un chiffre change les
// deux d'un coup : le document et la base ne peuvent plus diverger.

/** Clés des durées — sert à relier un traitement affiché à la purge qui l'applique. */
export type CleDuree = 'conversation' | 'comptable' | 'anti_abus' | 'crm' | 'crm_journal' | 'equipe_inactif' | 'essai_gratuit'

export const DUREES_MOIS: Record<CleDuree, number> = {
  /**
   * Conversation (lead + messages) sans nouvel échange. Purgée par `purgerConversationsSansSuite`, sauf si elle est liée à un
   * devis SIGNÉ ou à une facture (pièces comptables : `comptable`). Un fil dont le devis n'est qu'un brouillon, envoyé, refusé ou
   * expiré n'est pas une pièce comptable : il part avec les autres (audit RGPD du 20/10).
   */
  conversation: 36,
  /**
   * Pièces comptables : facture émise, et le devis / le client qu'elle cite.
   * Obligation légale (art. L. 102 B du LPF) : JAMAIS purgées par le cron — la durée figure
   * ici pour être affichée, pas pour déclencher une suppression automatique.
   */
  comptable: 120,
  /** Anti-abus : empreintes d'IP, horodatages d'abus, bannissements expirés. */
  anti_abus: 12,
  // CRM (audit RGPD du 12/10, point b) — appliquées par `purgerCrm` (lib/purgesRgpd.ts).
  /** Chantiers (avec tâches, réservations, équipe et notes) et notes client : après la FIN (chantier clos, ou dernière pièce du client). */
  crm: 36,
  /** Journal du CRM (statuts, tâches cochées, sorties de stock, déplacements du pipeline) : à compter de l'écriture. */
  crm_journal: 24,
  /** Membre de l'équipe marqué inactif et rattaché à aucun chantier, aucune tâche, aucun véhicule : depuis sa dernière modification. */
  equipe_inactif: 12,
  /**
   * Registre des essais gratuits (0156) — traitement de Presti pour son propre compte (registre-traitements.md), non affiché
   * aux clients des artisans. Compté depuis la FIN de l'essai ; purgé par `purgerEssaisGratuits` (lib/purgesRgpd.ts).
   */
  essai_gratuit: 24,
}

/**
 * Le lien de suivi donné au client d'un chantier (page publique /suivi/<jeton>, 0167) cesse de répondre ce nombre de jours après
 * la FIN RÉELLE du chantier (calcul à la lecture, app/suivi/[jeton]/route.ts : aucune colonne, aucune migration). Un chantier
 * sans fin réelle (encore ouvert) n'expire pas ; l'artisan peut toujours retirer le lien plus tôt.
 */
export const JOURS_SUIVI_APRES_FIN = 90

/**
 * La durée telle qu'elle se lit sur les pages (« 12 mois », « 3 ans »), tirée du nombre
 * réellement appliqué. En dessous de deux ans on garde les mois : « 1 an » pour douze mois
 * se lit comme un arrondi, alors que la politique annonce précisément douze mois.
 */
export function libelleDuree(mois: number): string {
  return mois >= 24 && mois % 12 === 0 ? `${mois / 12} ans` : `${mois} mois`
}

/**
 * Les traitements de données opérés sur les surfaces de l'artisan.
 * Écrits ici une fois pour toutes : l'artisan n'a pas à rédiger une politique de
 * confidentialité, et surtout il ne doit pas avoir à deviner ce que l'outil collecte.
 */
// `cle` relie une ligne à la purge qui l'applique (null : aucune durée automatique propre, la ligne le dit). Chaque ligne qui a
// une clé COMMENCE par la durée de cette clé — scripts/rgpd-qa.mjs et scripts/purges-rgpd-e2e.mjs le vérifient.
export const TRAITEMENTS: { cle: CleDuree | null; finalite: string; donnees: string; base: string; duree: string }[] = [
  {
    cle: 'conversation',
    finalite: 'Répondre à votre demande de devis et échanger avec vous',
    donnees: 'Nom, coordonnées (email ou téléphone), description de votre projet, photos que vous envoyez, historique de la conversation',
    base: 'Mesures précontractuelles prises à votre demande (RGPD art. 6.1.b)',
    // Audit RGPD du 20/10 : la purge (purgerConversationsSansSuite) ne garde plus au-delà que les fils liés à un devis SIGNÉ ou à
    // une facture — pas tout fil portant un devis. Le texte dit ce que la machine fait.
    duree: `${libelleDuree(DUREES_MOIS.conversation)} à compter de notre dernier échange, sauf si la conversation est liée à un devis signé ou à une facture : elle suit alors la durée des pièces comptables`,
  },
  // 21/10 (0177, lib/canaux/importProspects.ts) : un prospect d'un formulaire publicitaire de l'artisan, importé par fichier ; aucun envoi automatique.
  {
    cle: 'conversation',
    finalite: 'Vous recontacter après que vous avez rempli le formulaire d’une publicité de l’artisan (TikTok, Facebook, Instagram, LinkedIn…)',
    donnees: 'Nom, coordonnées et message saisis dans le formulaire, nom du réseau d’origine ; aucun message ne vous est envoyé automatiquement',
    base: 'Mesures précontractuelles prises à votre demande (RGPD art. 6.1.b) : vous avez demandé à être recontacté',
    duree: `${libelleDuree(DUREES_MOIS.conversation)} sans échange avec l’artisan, puis suppression`,
  },
  {
    cle: 'comptable',
    finalite: 'Établir un devis, puis une facture si les travaux sont réalisés',
    donnees: 'Nom, adresse de facturation, adresse du chantier, détail des prestations et montants',
    base: 'Exécution du contrat, puis obligation légale de conservation comptable',
    duree: `${libelleDuree(DUREES_MOIS.comptable)} pour les pièces comptables (art. L. 102 B du LPF)`,
  },
  {
    cle: 'anti_abus',
    finalite: 'Protéger le service contre les abus (envois massifs, robots)',
    // Cette ligne est rendue sur la page publique de chaque artisan, en face de la finalité
    // anti-abus — or c'est exactement celle qui conserve l'adresse en clair (lib/security.ts).
    // Faire dire à l'artisan « jamais l'adresse en clair » l'exposait à notre place.
    donnees: 'Adresse IP (en clair dans le registre anti-abus, côté serveur uniquement ; pseudonymisée partout ailleurs), horodatage des envois',
    base: 'Intérêt légitime à préserver le service',
    duree: libelleDuree(DUREES_MOIS.anti_abus),
  },
  // ── Le CRM de l'artisan (drapeaux crmPieces, crmApresChantier, crmSuivi, crmAtelierVivant levés le 20/10/2026).
  //    Mises à jour des textes légaux : audit RGPD du 20/10. Chaque ligne dit ce que le code fait (lib/purgesRgpd.ts, purgerCrm ;
  //    app/suivi/[jeton]/route.ts ; lib/apresChantier.ts), pas ce qu'on voudrait qu'il fasse.
  {
    cle: 'crm',
    finalite: 'Organiser et suivre les travaux quand un chantier est ouvert (planning, tâches, équipe, matériel, notes de suivi)',
    donnees: 'Nom, adresse du chantier et sa position sur une carte (calculée à partir de l’adresse seule, jamais du nom), dates, tâches, notes',
    base: 'Exécution du contrat (RGPD art. 6.1.b)',
    duree: `${libelleDuree(DUREES_MOIS.crm)} après la fin du chantier`,
  },
  {
    cle: 'crm',
    finalite: 'Garder la trace de l’état des lieux et de l’avancement du chantier (photos et pièces du chantier)',
    donnees: 'Photos et documents ajoutés par l’artisan (état des lieux, avancement, plans, factures de fournisseurs), avec leur date et une légende ; rangés dans un espace privé, jamais public, que l’artisan seul consulte',
    base: 'Exécution du contrat (RGPD art. 6.1.b) ; intérêt légitime à garder la preuve de l’état des travaux (art. 6.1.f)',
    duree: `${libelleDuree(DUREES_MOIS.crm)} après la fin du chantier, fichiers compris`,
  },
  {
    cle: 'crm',
    finalite: 'Vous laisser suivre l’avancement de votre chantier sur une page privée, si l’artisan vous en donne le lien',
    donnees: 'Un lien secret par chantier ; la page montre l’avancement pièce par pièce et les dates, sans prix, sans adresse, sans photo ni nom de client. Presti ne garde que l’empreinte du lien et la date du dernier accès',
    base: 'Exécution du contrat (RGPD art. 6.1.b)',
    duree: `${libelleDuree(DUREES_MOIS.crm)} après la fin du chantier pour la ligne qui porte le lien ; le lien cesse de répondre ${JOURS_SUIVI_APRES_FIN} jours après la fin réelle du chantier, ou plus tôt si l’artisan le retire`,
  },
  {
    cle: 'crm_journal',
    finalite: 'Après les travaux : vous proposer de laisser un avis, ou vous rappeler l’entretien d’un équipement (chaudière, pompe à chaleur, conduit de fumée)',
    donnees: 'Nom, adresse email, titre du chantier. Si vous refusez ces messages, une empreinte de votre adresse (jamais l’adresse elle-même) est gardée pour qu’on ne vous réécrive plus',
    base: 'Intérêt légitime de l’artisan à rester en contact avec ses clients (RGPD art. 6.1.f) ; vous pouvez vous y opposer à tout moment en répondant au message (art. 21)',
    duree: `${libelleDuree(DUREES_MOIS.crm_journal)} pour la trace d’un message envoyé (son texte n’est pas gardé) ; l’entretien n’est suivi que jusqu’à ${libelleDuree(DUREES_MOIS.crm)} après la fin du chantier ; le refus est gardé tant que le compte de l’artisan existe, pour qu’il soit respecté`,
  },
  // 21/10 — Pilote automatique (lib/pilote, 0174) : purge lib/purgesRgpd.ts étape 11, même durée que le journal du CRM.
  {
    cle: 'crm_journal',
    finalite: 'Vous répondre ou vous relancer sans attendre, quand l’artisan a choisi l’envoi automatique de ces messages (Pilote automatique)',
    donnees: 'Le message préparé pour vous (réponse, relance, devis ou facture déjà émise), votre nom et votre adresse email ; il part au nom de l’artisan au bout de 10 minutes, sauf s’il l’annule. Une réponse à votre demande envoyée automatiquement porte la mention de l’assistant. Le journal des envois garde un intitulé court et l’heure, pas le texte',
    base: 'Exécution du contrat ou de mesures précontractuelles prises à votre demande (RGPD art. 6.1.b) ; pour les relances, intérêt légitime de l’artisan à être payé et à suivre ses devis (art. 6.1.f)',
    duree: `${libelleDuree(DUREES_MOIS.crm_journal)} après la préparation de l’envoi pour la ligne du journal ; le message lui-même suit la durée de la conversation`,
  },
  // 21/10 — lien de pointage d'un compagnon (chantier_pointage, 0174) : supprimé avec le chantier (cascade).
  {
    cle: 'crm',
    finalite: 'Laisser un compagnon de l’artisan cocher, depuis son téléphone, les tâches terminées de votre chantier',
    donnees: 'Les intitulés des tâches du chantier, et rien d’autre : ni prix, ni adresse, ni nom de client. Presti ne garde que l’empreinte du lien et la date du dernier accès ; le compagnon ne peut que cocher « fait »',
    base: 'Exécution du contrat (RGPD art. 6.1.b)',
    duree: `${libelleDuree(DUREES_MOIS.crm)} après la fin du chantier au plus, avec lequel le lien est supprimé ; plus tôt si l’artisan le retire`,
  },
  {
    cle: null,
    finalite: 'Faire apparaître vos chantiers et rendez-vous dans l’agenda de l’artisan (Google Agenda, iPhone, Outlook), s’il l’a demandé',
    donnees: 'Titre et adresse du chantier, type et note du rendez-vous ; jamais votre email ni votre téléphone. L’agenda de l’artisan les lit à une adresse secrète qu’il peut retirer à tout moment',
    base: 'Exécution du contrat (RGPD art. 6.1.b)',
    duree: 'Tant que l’artisan garde son lien d’agenda actif : seule l’empreinte du lien est conservée, et les données déjà copiées dans l’agenda de l’artisan relèvent de son fournisseur d’agenda',
  },
  {
    cle: null,
    finalite: 'Aider l’artisan à préparer ses devis, relances et messages (assistant de gestion de la console)',
    donnees: 'Ce que l’assistant consulte pour préparer un document ou un message : coordonnées d’un client, lignes de devis, texte d’un message. Il n’agit que sur le compte de l’artisan, et chaque action est tracée dans son journal',
    base: 'Exécution du contrat de l’artisan avec Presti ; instructions de l’artisan',
    duree: 'Tant que le compte de l’artisan existe (journal et conversations de l’assistant) ; effacés avec le compte ou à son anonymisation',
  },
]

/**
 * Les destinataires PUBLICS : un service de l'État que Presti appelle sans contrat de sous-traitance (donc pas dans SOUS_TRAITANTS,
 * dont les pages disent « chacun encadré par un contrat »). Ils ne reçoivent que ce qui est écrit ici.
 */
export const DESTINATAIRES_PUBLICS: { nom: string; role: string; lieu: string }[] = [
  {
    nom: 'Base Adresse Nationale (api-adresse.data.gouv.fr)',
    role: 'Service public qui situe une adresse : le serveur de Presti lui envoie l’adresse, le code postal et la ville du chantier, et rien d’autre (jamais le nom du client), pour placer le chantier sur la carte du CRM',
    lieu: 'France, service de l’État',
  },
]

/** Les sous-traitants réellement utilisés — ceux-là et pas d'autres. */
export const SOUS_TRAITANTS: { nom: string; role: string; lieu: string }[] = [
  { nom: 'Presti', role: 'Éditeur de l’outil : hébergement des demandes, rédaction assistée des réponses', lieu: 'France' },
  { nom: 'Supabase', role: 'Base de données et stockage des photos', lieu: 'Union européenne (Francfort)' },
  { nom: 'Vercel', role: 'Hébergement du site et de la plateforme', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
  { nom: 'Anthropic', role: 'Modèle d’intelligence artificielle qui aide à rédiger les réponses (le message du prospect lui est transmis pour cela) et fait fonctionner l’assistant de gestion de la console (qui peut lire les devis, factures, conversations et chantiers du compte, donc des noms de clients et des montants)', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
  { nom: 'Resend', role: 'Envoi des emails (réponses, relances, devis)', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
  // 21/10 (0177) : seulement si l'artisan relie son propre bot Telegram (drapeau canauxTelegram).
  { nom: 'Telegram', role: 'Messagerie : transmet les messages échangés avec le bot Telegram de l’artisan, seulement s’il en a relié un (identifiant Telegram, prénom, texte des messages)', lieu: 'Hors Union européenne (Telegram FZ-LLC) ; canal choisi par l’artisan, sans clauses contractuelles types connues' },
]

/** Phrase d'information affichée AU MOMENT de la collecte (RGPD art. 13). */
export function noticeCollecte(nomArtisan: string | null): string {
  const qui = nomArtisan?.trim() || 'l’artisan'
  // La durée vient de DUREES_MOIS : la phrase de collecte et la purge qui l'applique ne
  // peuvent pas se contredire (audit final, auditeur B, C6).
  return `Vos coordonnées et votre message sont transmis à ${qui} pour répondre à votre demande, et conservés ${libelleDuree(DUREES_MOIS.conversation)}. Vous pouvez y accéder, les corriger ou les faire supprimer à tout moment.`
}
