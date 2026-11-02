// Drapeaux de fonctionnalités — la règle d'or du sprint J-1 (plans/004-sprint-j1-demo.md §0) :
// **une fonctionnalité non finie n'apparaît pas.** Un bouton qui mène à un écran cassé coûte
// plus cher en démo qu'un bouton absent. Tout ce qui n'est pas prêt est masqué ICI, pas
// laissé à moitié dans l'interface.
//
// Un drapeau à `false` cache l'entrée de menu, la route répond 404, et rien dans le DOM ne
// trahit l'existence de la fonctionnalité. Passer à `true` = la fonctionnalité est finie,
// vérifiée en production (cycle presti-verify) et jouable dans le parcours de démo.
//
// On ne lit pas ces drapeaux depuis une variable d'environnement : un drapeau est une
// décision de code, versionnée, relue en revue — pas un réglage qu'on bascule à chaud.

export const FLAGS = {
  /** Bus des agents : ferme /api/agents/* ; à lever sur décision de Benj après 0096 à 0098 appliquées et PASS de 026-042.
   *  Levé le 28/09/2026 par Claude Code, sur l'autorisation de Benj pour la mise en service de l'usine (026-058, qui
   *  l'exige) : 0096 à 0098 appliquées, 026-042 PASS, routes derrière un jeton d'agent (agents-garde-qa PASS). */
  busAgents: true,
  /** 24/09/2026 — ferme le constructeur de site et POST /api/site/generate. */
  constructeurSite: false,
  /** v7 bloc 2 — code par email à la connexion (routes api/auth/code, verrou lib/authArtisan, appareils de
   *  confiance). À passer à `true` dès que la migration 0063 est collée : avec le drapeau levé et sans les
   *  tables, le verrou refuse TOUT (fail-closed, voulu) — d'où l'ordre : coller, puis lever. */
  codeEmail: true,
  /** v9 J2 — notifications push web (routes api/push, lib/push, Paramètres → Notifications). À lever dès que la
   *  migration 0064 est collée : baissé, les routes répondent 503 et rien n'est proposé à l'artisan. */
  pushWeb: true,
  /** v9 J3 — notifications NATIVES (coque Capacitor). À lever quand `google-services.json` (M3) est dans mobile/android/app/ :
   *  sans Firebase, `PushNotifications.register()` plante l'app Android. Baissé : l'app dit « prochaine version ». */
  pushNatif: true,
  /** §6 — 2FA TOTP via Supabase MFA. Décision Benj du 04/09 : dans le sprint. Livré et testé (scripts/mfa-e2e.mjs). */
  mfa: true,
  /** v10 J1 — le Centre de direction (app/direction, app/api/direction). À lever dès que la migration 0065 est collée :
   *  levé sans les tables, la garde répond 503 (fail-closed, voulu) — d'où l'ordre : coller, puis lever. Baissé : 404. */
  direction: true,
  /** v10 J2 — Registre des apports avec preuve (lien /a/<code>, onglets Clients et Apports). À lever quand la
   *  migration 0067 est collée : sans elle, les routes répondent 503 et les onglets ne sont pas proposés. */
  apports: true,
  /** v10 J2b — agir sur un artisan (crédits, suspension, réactivation, message, portail). À lever quand la
   *  migration 0068 est collée : sans elle, les routes répondent 404 et la fiche n'affiche aucun bouton. */
  actionsArtisan: true,
  /** v10 J3 — la messagerie de l'entreprise (boîte unifiée, classement, réponse dans le fil).
   *  À lever quand la migration 0069 est collée : sans elle, les routes répondent 404 et l'onglet
   *  n'apparaît pas dans le Centre. */
  messagerie: true,
  /** v11 J5 — la comptabilité de l'entreprise et le relevé du partenaire. Levé quand 0071 est collée :
   *  sans elle, les routes répondent 503 sur des tables absentes et l'onglet n'a rien à montrer. */
  comptabilite: true,
  /** v11 §5 — le mode support : l'artisan ouvre lui-même une fenêtre d'une heure sur UN élément qu'il
   *  a désigné, on n'y lit que la forme, chaque lecture est tracée des deux côtés. Levé le 08/09,
   *  après les deux conditions que je m'étais données : migrations 0074 et 0075 en base, et
   *  `support-e2e` 34/34 contre un vrai serveur — dont la preuve que la phrase témoin d'un message
   *  ne sort pas, et que la vue d'à côté (RLS fondateur) est bien fermée : 0 devis, 0 factures,
   *  0 demandes là où il y en avait 9, 12 et 9. */
  supportArtisan: true,
  /** §8 F1 — photo de facture fournisseur → OCR → lignes proposées. */
  inventaireOcr: false,
  /** §8 F3 — assistant de recherche fournisseurs. Livré et testé le 04/09 (scripts/recherche-e2e.mjs : 37/37, vraie recherche Castorama). */
  inventaireRecherche: true,
  /** §9 G1 — constructeur de règles d'automatisation. */
  plateformeRegles: true,
  /** §4 B3 — visites guidées à la première ouverture. */
  aideVisites: true,
  /** §4 B4 — centre d'aide /aide. */
  aideCentre: true,
  /** 24/09/2026 — la vidéo hero porte une promesse retirée. Elle reviendra une fois refilmée, avec ses textes incrustés listés dans public/demo/hero.textes.json. Sinon : séquence HTML. */
  landingVideo: false,
  /** 02/11/2026 — la landing v2 du chantier 2 (direction A avec le hero de B, les 7 sections du prompt 4 de Benj), /offres et /comparatif.
   *  Baissé : la landing actuelle, et ces deux pages en 404 en production. Se lève sur le « oui » de Benj (plan du chantier 2, lot 9). */
  landingV2: false,
  /** §9 G2 — persona et apparence avancée de la plateforme. Livré (sprint J-1). */
  plateformePersona: true,
  /** Canaux WhatsApp — vendu dans la grille cible, pas construit. Reste caché tant que c'est vrai. */
  canauxWhatsapp: false,
  /** Canaux réseaux sociaux — idem. */
  canauxReseaux: false,
  /** 12/10 — Le Bon Coin par l'e-mail de notification (lib/canaux/leboncoin.ts, reconnu dans la relève de la boîte branchée) :
   *  pas d'API, l'artisan copie la réponse préparée et la colle dans Le Bon Coin. Construit, testé sur fixtures INVENTÉES.
   *  Se lève après la migration 0139 appliquée ET un vrai e-mail de notification passé au parseur (caviardé). Baissé : la
   *  relève ignore ces e-mails comme avant (expéditeur automatique), et rien n'en parle à l'écran.
   *  canauxWhatsapp et canauxReseaux, eux, ouvrent les canaux Meta (app/api/canaux/meta, lib/canaux/meta.ts) : même ordre,
   *  0139 d'abord, puis un vrai message reçu et une vraie réponse envoyée depuis l'application Meta de test. */
  canauxLeboncoin: false,
  /** v15 §3 — le site à la demande : la page /site/commander, le dossier (api/site/commander/brouillon) et le
   *  paiement unique (api/site/commander). À lever dès que la migration 0088 est collée : levé sans la table,
   *  les routes répondent 503 (fail-closed, voulu) — d'où l'ordre : appliquer (Claude Code), puis lever. Baissé : 404. */
  siteCommande: true,
  /** v15 §4 — la VENTE du site : le bloc « Le site, à la demande — 300 € une fois » et le bouton « Commander mon
   *  site » sur la landing et /abonnement. Ne se lève qu'après l'étape 7 verte et un site de démonstration
   *  regardé par Benj (H5). Tant qu'il est baissé, la page n'est atteignable que par son adresse.
   *  LEVÉ le 25/09/2026 sur décision de Benj (campagne d'appels de Marans du 26/09) : 025 et sa suite en production,
   *  générateur jugé sur 4 métiers (025-21, 025-23), paiement vérifié (025-22). Vercel passe en Pro au premier site vendu. */
  siteCommandeVente: true,
  /** 026-025 — l'achat du site SANS compte : POST /api/site/commander/public (Checkout du même constructeur que l'achat
   *  avec compte, case CGU et case de renoncement L221-28 obligatoires) et /api/site/commander/public/renvoyer ; le compte
   *  naît après le paiement, au webhook, et son lien part par Resend. Baissé : les deux routes répondent 404. Se lève sur
   *  décision de Benj (comme siteCommandeVente) : après le texte des cases relu, les PASS de 026-027, 026-030 et 026-035, de
   *  025-09, et achat-public-qa --reel vert. Levé sans les colonnes de 0103, l'insertion échoue (503, fail-closed). */
  siteAchatPublic: false,
  /** v16 §3.4 — le bloc « Et le site qui va avec » sous la séquence de la landing : la capture animée de LA démo
   *  (Atelier Lestraque) et le lien vers le site réel. Il MONTRE, il ne vend pas (pas de bouton de commande). Se lève
   *  quand la démo est validée sans Benj : site-qa + grille-qa + code-qa verts (scripts/demo-verifier.mjs) et la vidéo
   *  passée au juge (scripts/video-qa.mjs public/promo/demo-site/lestraque.mp4). */
  landingDemoSite: true,
  /** 14/09 — la mesure d'audience de la vitrine, sans cookie (lib/audience.ts, app/Audience.tsx, api/audience, onglet
   *  Visiteurs du Poste). Levé le 14/09 : migrations 0090 à 0092 appliquées (MCP Supabase, feu vert de Benj), après une
   *  revue adversariale (20 défauts) et une contre-revue (8), tous corrigés, et audience-e2e vert. Levé sans les tables,
   *  les vues se perdraient (204, erreur en console) et l'onglet répondrait 503. Baissé : rien n'est envoyé ni écrit, la
   *  route répond 404, l'onglet n'existe pas, /confidentialite ne décrit pas la mesure — mais la purge quotidienne
   *  continue d'effacer ce qui a été écrit (lib/purgesRgpd.ts, étape 8, hors drapeau). */
  audience: true,
  /** 24/09 — Pilotage (Mission Control), premier onglet du Poste. Baissé : GET /api/controle/pilotage répond 404 et l'onglet n'existe pas. Levé par la fiche 026-140, après la recette et l'accord de Benj. */
  pilotage: true, // levé le 2026-10-05 sur la demande de Benj (il ne pouvait pas accéder à la station), après la livraison de la série 026 ; recette 026-140 : voir .orchestre/preuves/026-140/
  /** 026-179 — carte Claw3D de la station, levée par 026-193 après sa recette. Baissé : la page de la station garde son cadre d'attente et la liste des salles, et le moteur (Phaser) n'est jamais chargé. */
  stationCarte: true, // levé le 2026-10-05 sur la demande de Benj (la station était vide) ; recette 026-193 : voir .orchestre/preuves/026-193/
  /** 026-118 — le pack pubs locales : le dossier (/pubs/commander, /api/pubs/commander/brouillon) et le paiement
   *  (POST /api/pubs/commander). Baissé : les routes répondent 404. À lever sur décision de Benj, seulement après
   *  l'application de 0102, le PASS des fiches 05 (CGU 3 ter, lues par Benj), 12, 15 et 24 (effacement des fichiers
   *  promis par le 3 ter), 134 et 144, la catégorie « Logement » vérifiée par Benj et un pack d'essai regardé par Benj. */
  packPub: false,
  /** 026-118 — la carte de vente du pack pubs dans l'application. À lever après packPub. */
  packPubVente: false,
  /** Levé le 29/09/2026 par Claude Code sur la demande de Benj : envoyer des demandes à l'écosystème quand la limite de Claude Code est atteinte
   *  (POST et GET /api/controle/demandes, onglet Demandes du Poste, GET et PATCH /api/agents/demandes). Levé avant l'application de 0117 : tant
   *  qu'elle n'est pas appliquée, les routes répondent 503 (fail-closed, voulu). Baissé : 404 partout, l'onglet n'existe pas. */
  demandesEcosysteme: true,
  /** Ferme la route de la demande entrante ; lever prospectsEntrant quand le formulaire de la landing v2 existe, sur décision de Benj. */
  prospectsEntrant: true, // levé le 2026-10-07 sur la décision de Benj (06/10) : le formulaire de la vitrine existe (app/MaquetteForm.tsx, section #maquette)
  /** 25/09 — Aimant "Commente SITE" du Crieur. Baissé : aucune publication ne promet la maquette.
   * Levé par Claude Code quand les webhooks Meta (026-090) et le Répondeur (026-096) sont déployés
   * et qu'un entrant d'essai a été servi de bout en bout. */
  aimantSite: false,
  /** Branche réservée par Benj le 25/09 : rien n’est construit ; elle attend ses trois vidéos sources. */
  ecommerce: false,
  /** 026-143 — la page d'essai du porteur du formulaire (026-095) : /essai-formulaire et son action /essai-formulaire/envoi, un formulaire de contact ordinaire qui ne garde que l'empreinte SHA-256 du message (un événement du journal, 20 par jour au plus). Baissé : les deux répondent 404. */
  essaiFormulaire: true,
  /** 12/10/2026 — compta de l'artisan (/chiffres) : l'encaissé rangé au mois du RÈGLEMENT (factures.payee_le, posée par un
   *  déclencheur de la migration 0140). Baissé : la route ne lit pas la colonne (elle n'existe pas avant 0140) et l'encaissé
   *  est rangé au mois d'émission, ce que l'écran dit. LEVÉ le 15/10/2026 (0140 en base, vérifiée). */
  comptaDateReglement: true,
  /** 12/10/2026 — alerte e-mail à l'artisan quand une facture dépasse N jours d'impayé (lib/comptaAutomatisations.ts, passage
   *  quotidien de /api/cron/relances, réglage dans /chiffres). Baissé : rien n'est lu ni envoyé, GET/PUT /api/compta/reglages
   *  répondent 404 si l'export l'est aussi, et l'écran n'en parle pas. LEVÉ le 15/10/2026 sur décision de Benj (0140 et ses gardes en base) ;
   *  réservé à l'offre Signature (capacité `chiffres.auto`) côté serveur : route et passage quotidien. */
  comptaAlerteImpayes: true,
  /** 12/10/2026 — export mensuel automatique du journal des factures (CSV) à l'adresse du comptable. Mêmes conditions que
   *  comptaAlerteImpayes : LEVÉ le 15/10/2026 sur décision de Benj, offre Signature (`chiffres.auto`). */
  comptaExportMensuel: true,
  /** 15/10/2026 — A3 : l'assistant AGIT (devis, factures, tarifs, stock, CRM, messages ; cartes à confirmer pour tout ce qui part chez un
   *  client, journal des actions annulables). Migration 0157 (table assistant_actions) APPLIQUÉE en production le 14/10 ; drapeau levé et
   *  `ESSAI` vidé ensuite, sur accord de Benj. Sans 0157, l'assistant ne propose aucun outil d'action (lib/assistant/magasin.ts,
   *  actionsDisponibles : fail-closed).
   *  29/10/2026 — « il ne peut absolument pas agir » (Benj) : les outils d'action sont désormais TOUJOURS donnés au modèle (plus de
   *  détecteur de mots-clés en barrière), avec le mode « fait tout seul » — une action « à confirmer » demandée par l'artisan lui-même, sans
   *  texte de tiers lu dans le tour, est exécutée tout de suite et reste annulable quand un inverse existe (lib/assistant/cadrage.ts
   *  faitToutSeul). Nouveaux outils : recherche chez les fournisseurs, export Excel, facture sans devis, liste d'achat, suppression d'article,
   *  sortie de stock pour un chantier. Aucune migration nouvelle.
   *  12/10/2026 — l'assistant de gestion de la console (plans/016-assistant.md, jalons A1 lecture seule et A2 brouillons) :
   *  page /assistant, POST /api/assistant, entrée « Assistant » du menu. Offre Signature à l'époque ; Studio et au-dessus depuis le 25/10
   *  (capacité `assistant`, lib/plans.ts ; ses outils CRM restent Signature).
   *  Baissé : la page et la route répondent 404, rien dans le menu, rien dans la grille des offres. Se lève après la migration
   *  0150 appliquée (levé sans elle, la route refuse chaque tour : le plafond et le journal sont en base, fail-closed), puis la
   *  recette A5 du plan (évaluation, audits sécurité et RGPD par des agents distincts, parcours réel sur un compte de test) et
   *  l'accord de Benj. */
  assistant: true,
  /** 12/10/2026 — CRM « atelier vivant » (offre Signature), jalons J1-J5 : migration 0141 (chantiers, tâches, matériaux
   *  réservés, véhicules, équipe, notes, journal), routes /api/crm/*, page /crm (atelier 3D chargé à la demande avec repli 2D,
   *  pipeline, tableau de bord, chantiers, fiche client, équipe). La page /atelier-demo (données fictives) est hors drapeau :
   *  elle n'existe que sur un serveur lancé avec PRESTI_DEMO_ATELIER=1. Baissé : toutes les routes /api/crm/* et la page /crm répondent 404 avant toute lecture, rien dans le
   *  menu, rien sur la page Tarifs. Se lève dans cet ordre : 0141 appliquée et contrôlée, scripts/crm-e2e.mjs vert contre une
   *  base de test, recette J6 (plan 3.8) et accord de Benj. Levé sans 0141, les routes répondent 503 (tables absentes).
   *  13/10/2026 soir — LEVÉ sur demande de Benj (« vérifie que le CRM fonctionne parfaitement et mets-le au grand public »).
   *  Contrôlé avant : crm-qa 166/0, crm-sql-qa 64/0 (0141 rejouée, RLS des 8 tables), et en production les 8 tables ont
   *  RLS + 5 politiques chacune, aucun droit pour anon. crm-e2e « levé » non joué : il exige une base de TEST distincte
   *  (refuse la production) et il n'en existe pas ; Benj a utilisé le CRM en essai sur son compte. */
  crm: true,
  /** 15/10/2026 — relances AUTOMATIQUES des factures impayées (lib/relancesImpayes.ts, passage quotidien de /api/cron/relances, réglage
   *  et journal dans Factures, GET/PUT /api/factures/relances-auto). Désactivées par défaut pour chaque artisan (opt-in). Migration 0159
   *  appliquée (15/10). Offre : Studio et au-dessus (capacité `factures.relances`, lib/plans.ts, décision de Benj du 15/10 ; depuis le 25/10,
   *  préparées à valider en Studio, envoyées seules en Signature avec `factures.relances.auto`) : la route et
   *  le passage quotidien refusent les autres offres, l'écran Factures montre le réglage verrouillé avec renvoi vers /abonnement.
   *  La grille des offres, le comparatif de la landing et la page Tarifs gagnent seuls leur ligne. Baissé : tout cela disparaît. */
  relancesImpayes: true,
  /** 18/10/2026 — CRM, lot 3 (plans/crm-idees-twenty-1810.md, n°5) : PHOTOS et PIÈCES du chantier (bucket PRIVÉ chantier-pieces, table
   *  chantier_pieces, migration 0163 ; routes /api/crm/pieces*, section « Photos et pièces » de la fiche chantier). Baissé : la section
   *  n'existe pas et les routes répondent 404. Se lève dans cet ordre : 0163 appliquée et contrôlée, scripts/crm-lot3-qa.mjs vert
   *  (partie « en vrai » comprise), relecture de conformité (intérieurs de particuliers, visages), accord de Benj.
   *  20/10/2026 — LEVÉ (« règle ça », Benj) : 0163 appliquée et contrôlée, crm-lot3-qa 36/0, relecture de conformité GO avec réserve P1
   *  corrigée (supprimer un chantier retire d'abord ses fichiers du bucket). Partie « en vrai » non jouée : pas de base de test. */
  crmPieces: true,
  /** 18/10/2026 — CRM, lot 3 (n°6) : onglet PLANNING de la semaine (conflits, décaler un chantier) et LIEN D'AGENDA privé (flux ICS,
   *  table crm_agenda, migration 0164 ; routes /api/crm/agenda et /api/agenda/<jeton>). Baissé : pas d'onglet, routes 404. Se lève
   *  après 0164 appliquée, scripts/crm-lot3-qa.mjs vert, et l'accord de Benj.
   *  20/10/2026 — LEVÉ (« règle ça », Benj) : 0164 appliquée (RLS sans politique, voulu), crm-lot3-qa 36/0. */
  crmPlanning: true,
  /** 19/10/2026 — CRM, lot 4 (n°7) : l'APRÈS-CHANTIER (demande d'avis, rappel d'entretien ; table crm_apres_chantier, migration 0165 ;
   *  routes /api/crm/apres-chantier*, encart « Après le chantier » de la fiche, passage quotidien qui POSE des rappels). Désactivé
   *  par défaut pour chaque artisan, et aucun message ne part sans sa confirmation. Baissé : routes 404, encart absent, aucun rappel
   *  posé. Se lève après 0165 appliquée, scripts/crm-lot4-qa.mjs vert, audit de conformité (lien vers la fiche d'avis, durées
   *  d'entretien) et accord de Benj.
   *  20/10/2026 — LEVÉ (« règle ça », Benj) : 0165 appliquée, crm-lot4-qa 30/0, relecture de conformité : A1 opposition du client
   *  notée (0171, route /api/crm/apres-chantier/opposition), A2 suivi d'entretien ramené à 3 ans, texte d'avis par défaut neutre. */
  crmApresChantier: true,
  /** 19/10/2026 — CRM, lot 5 (n°8, version 1) : le PLAN DU CHANTIER par pièce (schéma, pas plan à l'échelle) dans la fiche ; la pièce
   *  de chaque tâche (chantier_taches.piece, migration 0166), devinée d'après le libellé, corrigeable. Baissé : pas de schéma, la
   *  colonne n'est ni lue ni écrite (les routes refusent `piece`). Se lève après 0166 appliquée, scripts/crm-lot5-qa.mjs vert et
   *  l'accord de Benj.
   *  20/10/2026 — LEVÉ (« règle ça », Benj) : 0166 appliquée, crm-lot5-qa 33/0. */
  crmPlan: true,
  /** 19/10/2026 — CRM, lot 5 (n°8, version 3) : le LIEN DE SUIVI d'un chantier pour le client (page publique /suivi/<jeton>, lecture
   *  seule, sans prix ni adresse ni nom ; table chantier_suivi, migration 0167 ; routes /api/crm/chantiers/<id>/suivi). Baissé : page et
   *  routes 404, rien dans la fiche. Se lève après 0167 appliquée, scripts/crm-lot5-qa.mjs vert, audit de conformité et accord de Benj.
   *  20/10/2026 — LEVÉ (« règle ça », Benj) : 0167 appliquée (RLS sans politique, voulu), crm-lot5-qa 33/0, relecture de conformité GO
   *  (réserves mineures : titre du chantier visible du client, pas d'expiration du lien). */
  crmSuivi: true,
  /** 20/10/2026 — CRM, « atelier vivant » : (1) l'ACCUEIL VIVANT, c'est-à-dire la salle d'attente en trois files dans le panneau de
   *  l'accueil (nouvelles demandes, devis en attente du client, signés à planifier) et l'arrivée en direct d'une demande (bannière
   *  discrète, colis qui tombe en 3D, accueil surligné en 2D) ; (2) le POSTE DES ASSISTANTS, un objet de la maquette près du bureau
   *  (relanceur de devis, encaissement, facturation, agenda) dont le panneau liste ce qui attend la validation de l'artisan. Aucune
   *  migration, aucune table, AUCUN envoi automatique : chaque ligne renvoie vers l'écran existant où l'artisan agit (mode « assistée »,
   *  l'IA propose et l'artisan valide). Baissé : le panneau de l'accueil est celui d'avant, l'objet « assistants » n'existe pas dans la
   *  scène, aucune bannière, et GET /api/crm/vue ne porte pas le champ `vivant` (factures émises). Se lève après scripts/crm-vivant-qa.mjs
   *  vert, crm-lot1 à crm-lot5-qa toujours verts, un coup d'œil au rendu 3D réel (chute du colis, poste près du bureau) et l'accord de Benj.
   *  Même soir, même drapeau — la 3D ADAPTÉE À L'ARTISAN (lib/crm/infrastructure.ts) : quatre bases aux bâtiments distincts (chez soi,
   *  atelier, entrepôt, sans local = camion-atelier), structures et matériaux propres au métier, chantiers par type, statut à son compte /
   *  société (artisans.forme_juridique, LU seulement drapeau levé), gabarit des véhicules déduit de leur nom, lieu déclarable (localStorage).
   *  20/10/2026 — LEVÉ (« oui, lève le drapeau », Benj) : crm-vivant-qa 62/0, crm-atelier3d-qa 65/0, rendu relu sur deux planches. */
  crmAtelierVivant: true,
  /** 21/10/2026 — CRM « connecté à tout, en temps réel » (scripts/crm-connecte-qa.mjs) : l'écran écoute AUSSI `clients` (le carnet) et
   *  `crm_journal` (un dossier déplacé dans le pipeline depuis un autre appareil) — lib/crm/tempsReel.ts, TABLES_APRES_0175. Migration
   *  0175 ÉCRITE, NON APPLIQUÉE (elle ajoute ces deux tables à la publication supabase_realtime). Baissé : l'écran écoute les 13 tables
   *  d'avant, ces deux-là sont relues par le filet de 60 s. Levé SANS 0175 : le canal temps réel entier tomberait (une table absente de
   *  la publication fait échouer l'abonnement) — d'où l'ordre : coller 0175, contrôler (supabase/controles/0175_crm_temps_reel_complet.sql),
   *  PUIS lever.
   *  21/10/2026 — LEVÉ : 0175 appliquée, contrôle vert (les deux tables dans la publication, RLS active, deux politiques de lecture),
   *  crm-connecte-qa 31/0. */
  crmTempsReelComplet: true,
  /** 21/10/2026 — PILOTE AUTOMATIQUE (décision du fondateur, offre Signature, capacité `assistant.pilote`) : réglage par type d'action
   *  (réponses aux prospects, relances de devis et d'impayés, envoi de devis et de factures, messages de l'assistant à un client) ;
   *  une action préparée part seule après 10 minutes d'annulation possible (file actions_auto, passage chaque minute de
   *  /api/agents/tic), garde-fous non désactivables dans lib/pilote/regles.ts. Migration 0174 ÉCRITE, NON APPLIQUÉE. Baissé : rien
   *  n'entre dans la file, le tic saute l'étape, les routes /api/pilote/* répondent 404, l'écran n'en parle pas, la grille non plus.
   *  Se lève dans cet ordre : 0174 appliquée et contrôlée (supabase/controles/0174_pilote_automatique.sql), scripts/pilote-qa.mjs
   *  vert, essai sur le compte de Benj, accord de Benj. Levé sans 0174 : les routes répondent 503 et rien n'entre en file (fail-closed).
   *  21/10/2026 — LEVÉ (« oui, en Signature, avec un délai d'annulation », Benj) : 0174 appliquée, contrôle 9/9 ; audit du pilote (E1, E2,
   *  M1-M4, F1-F4) corrigé ; pilote-qa 88/0. Le pilote reste COUPÉ sur chaque compte tant que l'artisan ne l'active pas lui-même. */
  piloteAutomatique: true,
  /** 21/10/2026 — CRM : le LIEN DE POINTAGE d'un chantier pour un compagnon (décision B du fondateur : l'avancement sans ressaisie ;
   *  table chantier_pointage, migration 0174 ; routes /api/crm/chantiers/<id>/pointage, page publique /pointage/<jeton> : le compagnon
   *  coche « fait » en fin de journée, sans compte, rien d'autre). Baissé : routes et page 404, rien dans la fiche. Se lève après 0174
   *  appliquée et contrôlée, scripts/avancement-qa.mjs vert et l'accord de Benj.
   *  21/10/2026 — LEVÉ : 0174 appliquée et contrôlée, avancement-qa 30/0 (« je te laisse faire », Benj). */
  crmPointage: true,
  /** 21/10/2026 — DEVIS PAR LOTS (demande du fondateur, entreprises tous corps d'état et chantiers longs) : à la création ou dans
   *  l'éditeur, « Devis simple » ou « Devis par lots ». Chaque ligne porte un `lot` (« Lot 1 — Démolition ») ; l'éditeur affecte,
   *  renomme et regroupe ; le PDF titre chaque lot avec son sous-total HT, puis le total HT, la TVA par taux et le TTC, au centime
   *  près ceux du devis simple (lib/facturesTypes.ts, grouperParLots) ; le chiffrage IA renseigne le lot quand le devis est par
   *  lots. Colonnes devis.type_devis, devis_lignes.lot et factures_lignes.lot : migration 0176 ÉCRITE, NON APPLIQUÉE. Baissé : aucun
   *  choix dans l'éditeur, les routes ignorent `type_devis` et `lot`, le chiffrage IA garde son prompt d'avant. Levé SANS 0176 : un
   *  devis demandé « par lots » est refusé en 503 (lib/facturesTypesServeur.ts), un devis simple s'enregistre comme avant
   *  (fail-closed). Se lève dans cet ordre : 0176 appliquée et contrôlée (supabase/controles/0176_types_devis_factures.sql), puis
   *  scripts/types-devis-factures-qa.mjs vert, puis l'accord de Benj.
   *  21/10/2026 — LEVÉ : 0176 et 0180 appliquées et contrôlées (9/9, 11/11), audit argent indépendant corrigé (C1, E1-E3, M1-M5), types-devis-factures-qa 101/0 (« oui, fais les deux », Benj). */
  devisLots: true,
  /** 21/10/2026 — TYPES DE FACTURE (même demande) : à la création, « Facture », « Facture d'acompte », « Situation de travaux »
   *  (avancement CUMULÉ à date, global ou lot par lot ; montant = cumul × marché − tout ce qui est déjà facturé sur le devis) et
   *  « Facture de solde » (déduit acomptes et situations). Garde-fous en base (migration 0176, déclencheur
   *  factures_situation_verifier) : cumul ≤ 100 %, avancement qui ne recule pas, jamais plus que le devis, situation immuable,
   *  numéro de facture inchangé. La retenue de garantie n'est PAS faite (voir lib/facturesTypes.ts). Migration 0176 ÉCRITE, NON
   *  APPLIQUÉE. Baissé : le bouton « Créer la facture » fait ce qu'il faisait, POST /api/factures refuse `type: situation|solde`
   *  en 404, l'assistant ne connaît que « complète » et « acompte ». Levé SANS 0176 : « Situation » et « Solde » explicites
   *  répondent 503 et rien n'est écrit (fail-closed). Se lève dans cet ordre : 0176 appliquée et contrôlée, puis
   *  scripts/types-devis-factures-qa.mjs vert, puis l'accord de Benj.
   *  21/10/2026 — LEVÉ : émission atomique facture_emettre (0180) éprouvée en base (double facture, acompte par-dessus, totaux faux refusés ; avoir ; situation ; compteur sans trou), audit argent corrigé, types-devis-factures-qa 101/0 (« oui, fais les deux », Benj). */
  facturesSituation: true,
  /** 21/10/2026 — TELEGRAM EN DIRECT (demande du fondateur : « tous nos réseaux dans la messagerie ») : l'artisan crée son bot avec
   *  @BotFather et colle LUI-MÊME le jeton dans Messages → Canaux (lib/canaux/telegram.ts, app/api/canaux/telegram) ; jeton CHIFFRÉ
   *  (CANAUX_KEY), webhook avec secret_token dérivé de la liaison, réception → conversation, réponse validée ou partie par le Pilote
   *  automatique → sendMessage. Offre Studio (capacité canaux.whatsapp). migration 0177 APPLIQUÉE le 21/10/2026 (contrôle 10/10) (le type « telegram »
   *  dans canaux, la fonction canaux_conversation_ouvrir). Baissé : routes 404, rien à l'écran, rien n'est lu. Levé SANS 0177 : la
   *  liaison est refusée en 503 (contrainte de type) et rien n'est rangé. Se lève dans cet ordre : 0177 appliquée et contrôlée
   *  (supabase/controles/0177_canaux_reseaux.sql), scripts/canaux-reseaux-qa.mjs vert, un vrai bot de test relié, un message reçu
   *  et une réponse envoyée, puis l'accord de Benj.
   *  21/10/2026 — LEVÉ (« le reste recevra et enverra direct », Benj) : 0177 appliquée (10/10), audit offensif corrigé (plafonds d'entrée, crédits IA, quota d'e-mails séparé), canaux-reseaux-qa 111/0. Non éprouvé avec un vrai bot : à surveiller au premier artisan qui relie le sien. */
  canauxTelegram: true,
  /** 21/10/2026 — LES RÉSEAUX SANS API, PAR LEURS E-MAILS DE NOTIFICATION (LinkedIn, Page Facebook, Instagram, TikTok, 123devis,
   *  Habitatpresto, PagesJaunes, Houzz, Travaux.com, StarOfService ; lib/canaux/notifications.ts) : reconnus dans la relève de la
   *  boîte branchée comme Le Bon Coin ; la conversation arrive avec la pastille du réseau, l'IA prépare la réponse, « Copier et
   *  ouvrir LinkedIn » la copie et ouvre la conversation d'origine. Fixtures INVENTÉES. migration 0177 APPLIQUÉE le 21/10/2026 (contrôle 10/10).
   *  Baissé : la relève ignore ces e-mails comme avant. Se lève après 0177 appliquée et contrôlée, canaux-reseaux-qa vert, et au
   *  moins un vrai e-mail de notification par réseau passé au lecteur (caviardé) ; un réseau dont le gabarit réel ne passe pas
   *  sort de RESEAUX_NOTIFICATION avant de lever.
   *  21/10/2026 — LEVÉ (« allume les notifications si c'est bon », Benj) : la vérification DKIM est éprouvée sur un VRAI e-mail
   *  (TikTok Shop, Gmail de Benj, lu en lecture seule, gardé hors du dépôt) : copie exacte (17 581 octets, bh identique), signatures
   *  email.tiktok.com et sendgrid.info VALIDES, corps / objet / expéditeur falsifiés REFUSÉS ; l'e-mail d'information n'est pas
   *  rangé comme message ; l'en-tête d'authentification retenu est celui du serveur (mx.google.com). Repli DNS-over-HTTPS ajouté
   *  (lib/releveCanal.ts). Non éprouvé : le gabarit RÉEL d'un message LinkedIn / Facebook / Instagram (aucun dans la boîte de Benj) —
   *  un gabarit non reconnu est ignoré (rien de rangé, rien d'inventé), à surveiller au premier artisan qui branche sa boîte. */
  canauxNotifications: true,
  /** 21/10/2026 — « VOS RÉSEAUX » (Messages → Canaux) : pour chaque réseau, le lien de la page de conversation marqué de sa source
   *  (?src=instagram, liste fermée lib/canaux/reseaux.ts), le texte à coller (bio, message d'accueil natif), un QR code fabriqué
   *  sur place (lib/qr.ts) ; l'origine est enregistrée (leads.origine, migration 0177 APPLIQUÉE le 21/10/2026 (contrôle 10/10)) et affichée en
   *  pastille. Baissé : rien à l'écran, la page /p n'envoie pas l'origine, /api/leads ne l'écrit pas. Levé SANS 0177 : la demande
   *  est enregistrée SANS son origine (second essai sans la colonne : on ne perd jamais un prospect) et la pastille manque — d'où
   *  l'ordre : 0177 appliquée et contrôlée, canaux-reseaux-qa vert, puis lever.
   *  21/10/2026 — LEVÉ : 0177 appliquée (10/10), canaux-reseaux-qa 111/0 (QR décodés par OpenCV). */
  canauxLiens: true,
  /** 21/10/2026 — IMPORT DES PROSPECTS DES FORMULAIRES PUBLICITAIRES (TikTok, Facebook / Instagram Lead Ads, LinkedIn Lead Gen) par
   *  le fichier CSV exporté du réseau (lib/canaux/importProspects.ts, POST /api/demandes/import) : colonnes reconnues, aperçu avant
   *  import, doublons écartés ; la demande arrive « à contacter » (canal `import`), AUCUN envoi automatique (ni IA, ni relance, ni
   *  pilote : la personne n'a pas écrit à l'artisan). migration 0177 APPLIQUÉE le 21/10/2026 (contrôle 10/10) (leads.origine). Baissé : route 404,
   *  rien à l'écran. Levé SANS 0177 : l'import répond 503 et rien n'est écrit. Se lève après 0177 appliquée et contrôlée,
   *  canaux-reseaux-qa vert, un vrai export (caviardé) de chaque réseau passé à l'aperçu, et l'accord de Benj.
   *  21/10/2026 — LEVÉ : 0177 appliquée, audit offensif corrigé (liste blanche, consentement tracé, purge à 6 mois, neutralisation des formules), canaux-reseaux-qa 111/0 ; aucun envoi à un prospect importé. Fichiers d'export réels non encore passés à l'aperçu. */
  importProspects: true,
} as const

export type Flag = keyof typeof FLAGS

export const actif = (f: Flag): boolean => FLAGS[f]

/** 12/10/2026 — l'ESSAI avant l'ouverture générale (décision de Benj : il essaie d'abord sur son compte). Une
 *  fonctionnalité au drapeau baissé mais `true` ici s'ouvre pour les seuls comptes listés CÔTÉ SERVEUR dans
 *  lib/essais.ts (jamais ici : ce fichier part dans le JavaScript public, audit d'attaque du 12/10, B1). Les routes
 *  répondent 404 à tout autre compte, l'entrée de menu ne s'affiche qu'après réponse de /api/essais. À remettre à
 *  false (et vider lib/essais.ts) quand le drapeau passe à true. */
export const ESSAI: Partial<Record<Flag, boolean>> = {}
/** La fonctionnalité existe pour au moins un compte (drapeau levé, ou essai en cours). */
export const enEssai = (f: Flag): boolean => FLAGS[f] || !!ESSAI[f]
