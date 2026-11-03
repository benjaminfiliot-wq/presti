# R1 — Inventaire de l'existant : l'assistant de gestion et tout ce qui l'entoure (chantier 4)

Rédigé le 02/11/2026, en lecture seule. Dépôt `presti`, branche `main`, HEAD `a51a12a8` (29/10/2026 19:09). Aucune modification
non commitée dans le périmètre lu (`git status --porcelain` vide sur `lib/assistant`, `lib/pilote`, `lib/plans.ts`, `lib/flags.ts`,
`lib/plateformeConfig.ts`, `lib/relances.ts`, `app/api/assistant`, `app/api/pilote`, `app/api/agents/tic`, `app/api/cron`,
`app/assistant`, `app/dashboard`, `supabase/migrations`).

Méthode : lecture des fichiers et `grep`, `git` en lecture, une seule exécution : une sonde PURE (aucun réseau, aucune base,
aucune écriture) qui appelle `cadrerDemande` sur dix questions (annexe A). Ni build, ni typecheck, ni tests, ni requête en base.

Légende : **[V]** relevé dans le code ou dans git ce jour ; **[S]** source datée, non revérifiée ici (base de production, GitHub,
PC) ; **[D]** déduit de la lecture du code, à prouver par un test.

Réseau neuronal consulté (outils `cerveau`) : `regles_pour` (inventaire assistant/pilote) ; `memoire-presti/pilote-auto-aide-2110.md`,
`memoire-presti/positionnement-automatique-2510.md`, `memoire-presti/comptes-fournisseurs-connectes-2910.md`,
`vault/inbox/sessions/2026-11-02-01h07-b6e06ae6-avant-compression.md` (la « grosse alerte » de Benj du 29/10 : « il ne peut absolument
pas interagir »), `vault/Decisions/Journal-Decisions.md` (entrée du 01/11, extrait). Lus à la main : `presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md`
(42 l.), `PROMPT-AUTOMATISATION-ARTISAN.md` (§0 à §3, l.13-180), `plans/011-cadrage-01-11/cadrage-p3.md` (§0, §1, §5.1),
`prompts-benj/p3-assistant-bloc-offres-corrige-0111.md`, `prompts-benj/benj-0111-addendum.md`, `.orchestre/contexte.md` (carte du code
du 02/11 00:58 UTC).

---

## 0. Ce qu'il faut retenir (12 constats)

1. **La plomberie est riche et elle tient** [V] : 21 outils de lecture (dont 2 de brouillon) et **52 outils d'action** (32 directs, 20 « à confirmer », dont
   22 du CRM) — le « ≈ 45 » des documents date d'avant le commit `8022cc6` (29/10, +6 outils). Cartes, journal, annulation, plafonds,
   garde-fou des chiffres, pilote avec 10 min d'annulation et 20 envois par jour.
2. **L'artisan n'arrive pas sur l'assistant** [V] : après connexion il atterrit sur `/outils` « Réponses instantanées »
   (`app/login/page.tsx:34`, et après l'inscription `lib/suiteSure.ts:5`). L'assistant est la DERNIÈRE entrée du menu, dans le groupe
   « Outils IA » (`app/AppShell.tsx:47-53`), derrière 12 entrées « Pilotage » (`:28-45`).
3. **Le mode « fait tout seul » (29/10) n'est lié à aucune offre et se déclenche trop large** [V+D] : une action « à confirmer »
   (envoi, relance, facture émise, encaissement, suppression) s'exécute SANS carte dès que `actionDemandee` est vrai et qu'aucun texte
   de tiers n'a été lu (`lib/assistant/cadrage.ts:160-162`, `lib/assistant/actions-serveur.ts:1365-1379`, branché sans condition
   d'offre `app/api/assistant/route.ts:128`). La sonde montre que **7 questions de lecture sur 10 lèvent `actionDemandee`** (« Quels
   devis dois-je relancer ? », « Est-ce que M. Martin a payé ? », « Le devis Dupont est-il signé ? »…, annexe A). Tension directe avec
   « Studio : rien ne part sans un clic » (`lib/plans.ts:98`) et avec la DoD « il peut valider avant envoi ».
4. **Aucun détecteur ne remplit la file du pilote** [V] : `piloterCarte` n'est appelé qu'à un endroit (`actions-serveur.ts:1390`,
   une carte née d'une conversation), `piloterProposition` à trois (`app/api/leads/route.ts:343`, `app/api/conversation/stream/route.ts:138`,
   `lib/canaux/serveur.ts:186`, des réponses à des prospects).
5. **Les détecteurs existent déjà en morceaux, en code pur, mais en lecture seule** [V] : `composerBriefing` (`lib/assistant/briefing.ts:44`),
   `posteAssistants` (`lib/crm/assistants.ts:60`), `devisARelancer` (`lib/crm/rappels.ts:107`), `calculer` (`lib/tableau-de-bord/calculer.ts:209`,
   seuil 7 j l.115), `facturesASignaler` (`lib/comptaAutomatisations.ts:40`), `decider` des impayés (`lib/relancesImpayes.ts:192`),
   `calculerAlertes` (`lib/crm/alertes.ts:76`), alertes de stock (`app/api/inventaire/route.ts:70-75`). Aucun n'écrit de carte.
6. **Tout ce que l'assistant lit et prépare exige la SESSION de l'artisan** [V] (`lib/assistant/session.ts:22-27`, `actions-serveur.ts:133`) :
   un détecteur planifié n'en a pas. Le seul chemin « sans session » existant est celui du pilote (`lib/pilote/executeur.ts:41-60`,
   `realisateursPilote`), limité à 6 outils.
7. **La table des cartes n'est pas une boîte « À valider »** [V] : `assistant_actions.conversation_id` et `tour` sont obligatoires
   (`0157_assistant_actions.sql:34-35`), une carte « à confirmer » expire en 24 h (`lib/assistant/cartes.ts:18`). Et il y a déjà
   **cinq endroits « à valider »** distincts : onglet « À confirmer » de `/assistant`, propositions de `Messages`, « À valider » des
   relances d'impayés (`app/factures/RelancesAuto.tsx:131`), file du pilote (`app/parametres/SectionPilote.tsx`), poste des assistants
   du CRM.
8. **Quatre mécanismes de relance sans registre commun** [V] : relances de conversation J+2/J+5/J+10 (`lib/relances.ts:23`), relances
   d'impayés J+3/J+10/J+21 (0159/0181), relance de devis du CRM (`app/api/crm/relances/envoyer/route.ts`), relances de l'assistant
   (`relancer_devis`, `relancer_facture`). L'anti-doublon de l'assistant ne lit que `assistant_actions` (`actions-serveur.ts:861` et `:941`)
   [D] : un même devis ou une même facture peut être relancé par deux chemins à quelques heures d'écart.
9. **Deux brèches de la liste §3.2 hors du pilote** [V+D] : (a) la règle d'automatisation « Tout auto » (Signature) ENVOIE un devis
   chiffré automatiquement sans vérifier la provenance des prix (`lib/reglesServeur.ts:53-62`, seules les mentions légales sont contrôlées),
   alors que ce chiffrage peut contenir des « estimations » du marché (`lib/devisAuto.ts:54-57`, `lib/prix/types.ts:45-80`) — le pilote,
   lui, refuse un devis non sourcé (`lib/pilote/regles.ts:154`) ; (b) le départ du pilote ne revérifie aucun mot d'escalade
   (`lib/pilote/executeur.ts:184-193`), et la liste par défaut ne contient ni « litige », ni « avocat », ni « menace », ni « sinistre »
   (`lib/plateformeConfig.ts:56`).
10. **Organisations : rien n'existe** [V] : aucune table `organisations`/`membres`/`invitations` dans les 168 migrations ; `equipe_membres`
    est une fiche sans compte (`0141_crm_atelier.sql:30-39`) ; la garde de session 0138 laisse passer un utilisateur absent de `artisans`
    (`0138_garde_session_rls.sql:55-72` : « aucune ligne » rend les conditions vraies), à corriger avant toute invitation.
11. **Des trous de données** [V] : pas de table `paiements` (seulement `factures.payee_le`, `0140:18`) ; les lignes de compta importées
    restent dans le **localStorage** du navigateur (`app/chiffres/ComptaArtisan.tsx:17`, `:74`, `:97`), donc invisibles à un détecteur
    serveur ; pas de SMS ; **n8n, Hermes et Orca : zéro occurrence dans `lib/` et `app/`**.
12. **La documentation du code est en retard sur le code** [V] (liste au §15), et deux chantiers parallèles non fusionnés touchent ce
    périmètre : le worktree `comptes-fournisseurs-0a934e` (modifie `lib/assistant/actions-serveur.ts`, `outils-actions.ts`, porte une
    migration `0182_comptes_fournisseurs.sql` non commitée) et la branche `refonte-1018` (37 commits d'avance, drapeau `consoleV2`).

---

## 1. L'assistant de gestion — `lib/assistant/*` (21 fichiers, 5 888 lignes) [V]

### 1.1 Les fichiers

| Fichier | Lignes | Rôle |
|---|---|---|
| `boucle.ts` | 312 | Un tour : appels au modèle, outils, journal, garde-fou des chiffres (`executerTour` l.116) |
| `cadrage.ts` | 301 | Prompt système (l.188), analyse déterministe de la demande (l.137), `faitToutSeul` (l.160), garde des chiffres (l.275) |
| `outils.ts` | 491 | Schémas des 21 lectures (l.128), listes (l.70-77), `outilsAssistant` (l.307), `validerEntree` (l.365) |
| `outils-actions.ts` | 734 | Table de vérité `SPEC` des 52 actions (l.58-459), `validerAction` (l.569), `nombresASourcer` (l.717) |
| `actions-serveur.ts` | 1 415 | Préparations `P` et réalisations `R` des actions, cartes, « fait tout seul », mise en file du pilote |
| `actions-tout.ts` | 575 | Actions ajoutées le 21/10 (factures, plateforme, « Ma page », CRM récent) |
| `executeurs.ts` | 305 | Lectures sous la session (l.107-255), briefing (l.255-292), `journalEnBase` (l.300) |
| `lectures-tout.ts` | 225 | 8 lectures du 21/10 (l.63-204) |
| `cartes.ts` | 216 | Statuts (l.15), validité 24 h (l.18), sources des nombres (l.92, l.103), textes de relance fixes (l.135, l.146), lignes sur tarifs (l.164) |
| `confirmation.ts` | 194 | `confirmerAction` (l.95), `refuserAction` (l.126), `annulerAction` (l.138), magasin en mémoire (l.161) |
| `magasin.ts` | 58 | Écriture de `assistant_actions` par la clé de service filtrée par `artisan_id` (l.3-5, l.12), `actionsDisponibles` (l.52) |
| `journal.ts` | 69 | Ligne de journal sans texte libre (l.7-10, l.36, l.53) |
| `briefing.ts` | 101 | Briefing du matin, module pur (l.44) |
| `crm.ts` | 291 | Résumés CRM (chantiers l.98, équipe l.157, matériaux réservés l.212, à facturer l.266) |
| `donnees.ts` | 251 | Résumés stock, devis, factures, chiffres |
| `historique.ts` | 73 | Historique signé HMAC (l.8-15, l.24, l.32, l.50) |
| `garde.ts` / `acces.ts` | 34 / 26 | Garde commune des routes (l.16) ; décision d'accès (l.15-26) |
| `session.ts` | 55 | Client PostgREST au jeton de l'artisan (l.22), appel des routes de l'interface (l.39) |
| `tour.ts` | 71 | Plafond de tours et crédit (`preparerTour` l.37) |
| `avancement.ts` | 91 | Avancement d'un chantier d'après les mots de l'artisan |

### 1.2 La route `app/api/assistant/route.ts` (180 l.)
- Garde : drapeau, session, essai, offre (`gardeAssistant`, l.66 → `lib/assistant/garde.ts:16-34`, décision `lib/assistant/acces.ts:24` :
  capacité `assistant`).
- Débits fail-closed : 30 requêtes / 10 min (l.51, l.95) et 200 / jour (l.54, l.98).
- Identifiant de conversation tiré par le serveur (l.76-89) ; historique cru seulement s'il est signé (l.90-93).
- Palier : « pro » par défaut (l.111), 1 crédit (`lib/plans.ts:116`), « expert » 3 crédits.
- Outils d'action **toujours** donnés quand la table 0157 est là (`actionsOk` l.120, `actions: actionsOk` l.155) ; brouillons seulement
  si l'artisan les demande (l.150).
- « Fait tout seul » : `autonome: () => faitToutSeul(cadrage, etatTour)` (l.128) — aucun test d'offre.
- Outils qui « rendent du texte de tiers » : `OUTILS_CONTENU_TIERS` + `rechercher_fournisseurs` (l.57).
- Plafond de tours atomique en base (`assistant_prendre_tour`, l.135 ; 20 tours, `lib/plans.ts:168`) ; crédit consommé puis rendu
  en cas de panne (l.140-141), seulement si aucun appel au modèle n'a été facturé (`boucle.ts:71-75`).
- Réponse en flux NDJSON (l.168-179). Texte seulement : `message` est une chaîne (l.72), 2 000 caractères au plus (`cadrage.ts:20`) ;
  **aucun fichier, aucune photo, aucun lien** (aucun `type="file"` dans `app/assistant/`).

### 1.3 La boucle `lib/assistant/boucle.ts`
- 8 appels au modèle par tour (`cadrage.ts:16`), 45 s (`cadrage.ts:18`, la route a `maxDuration = 60`, l.25).
- Outils proposés selon CRM / actions / brouillons (l.150 ; `outils.ts:307-313`, point de cache sur le dernier outil l.312).
- Chaque appel est **journalisé avant** que son résultat reparte au modèle (l.247) ; un journal qui refuse d'écrire arrête le tour
  (l.252-254, `JournalIndisponible`).
- Défenses en profondeur : outil inconnu (l.187-190), entrée invalide (l.192-196), CRM fermé (l.197-201), actions fermées (l.204-207),
  12 actions par message (l.208-211, `outils-actions.ts:474`), nombre sans source refusé (l.212-217), message au client avec un nombre
  inventé refusé (l.218-224), un brouillon par message (l.233-237).
- « Contenu de tiers lu » posé dès qu'un résultat contient `[MESSAGE_CLIENT]` ou vient d'un outil de tiers (l.179-180) ; il ne
  redescend jamais dans le tour.
- Garde-fou final des chiffres : régénération avec rappel, puis retrait de la phrase fautive (l.291-309).

### 1.4 Les outils : 21 lectures, 52 actions [V]

**Lectures (21)** — `outils.ts:70-72`, schémas l.128-298, exécuteurs `executeurs.ts:107-255` et `lectures-tout.ts:63-204` :
- générales (12, l.70) : `lire_stock`, `lire_devis`, `lire_factures`, `lire_conversations`, `lire_chiffres`, `lire_tarifs`,
  `briefing_du_matin`, `lire_fil`, `lire_devis_detail`, `lire_plateforme`, `lire_profil`, `lire_relances_auto` ;
- CRM (7, l.71) : `lire_chantiers`, `lire_equipe_du_jour`, `lire_materiaux_reserves`, `lire_a_facturer`, `lire_ou_j_en_suis`,
  `lire_rappels`, `lire_commandes` ;
- brouillons (2, l.72) : `preparer_devis_brouillon` (chiffrage du moteur, `executeurs.ts:181` → `lib/devisAuto.ts:25`),
  `preparer_reponse` (`executeurs.ts:195`).

**Actions (52)** — `outils-actions.ts:58-459`, catégorie relevée à chaque `cat:` (D = directe, C = à confirmer, * = CRM) :

| Domaine | Actions |
|---|---|
| Devis (6) | `creer_devis` D (l.60), `modifier_devis` D (l.75), `changer_statut_devis` D (l.89), `supprimer_devis_brouillon` C (l.94), `envoyer_devis` C (l.99), `relancer_devis` C (l.104) |
| Factures (6) | `creer_facture` C (l.110), `creer_facture_libre` C (l.122), `marquer_facture_payee` C (l.136), `relancer_facture` C (l.141), `envoyer_facture` C (l.340), `regler_relances_impayes` C (l.345) |
| Tarifs (4) | `ajouter_tarif` D (l.147), `modifier_tarif` D (l.159), `augmenter_tarifs` C (l.164), `supprimer_tarif` C (l.173) |
| Inventaire (8) | `ajouter_article` D (l.179), `modifier_article` D (l.193), `ajuster_stock` D (l.203), `supprimer_article` C (l.215), `preparer_liste_achat` D (l.220), `rechercher_fournisseurs` D (l.229), `retenir_resultat` D (l.237), `exporter_tableau` D (l.247) |
| CRM (22) | `reserver_materiau`, `creer_chantier`, `modifier_chantier`, `affecter_equipe`, `ajouter_tache`, `cocher_tache`, `ajouter_note`, `ajouter_membre_equipe`, `avancer_chantier`, `cloturer_chantier`, `remettre_chantier_carte`, `regler_validation_auto`, `repartir_taches_par_piece`, `creer_rappel`, `cocher_rappel`, `enregistrer_commande`, `recevoir_commande`, `revoquer_lien_suivi` (D*, répartis entre l.257 et l.456) ; `relancer_commande`, `demander_avis`, `envoyer_rappel_entretien`, `noter_opposition_client` (C*, l.435-454) |
| Demandes et messages (4) | `changer_statut_demande` D (l.317), `repondre_client` C (l.322), `valider_reponse_proposee` C (l.327), `rejeter_reponse_proposee` D (l.332) |
| Plateforme (2) | `regler_plateforme` C (l.350), `modifier_ma_page` C (l.365) |

Totaux [V] : 32 D + 20 C = 52 ; 22 CRM. Le modèle voit jusqu'à **73 outils** avec le CRM (21 + 52), 44 sans (14 + 30) ; deux de
moins quand l'artisan ne demande pas de brouillon (`boucle.ts:150`). Les 6 outils
ajoutés par `8022cc6` : `rechercher_fournisseurs`, `retenir_resultat`, `exporter_tableau`, `creer_facture_libre`, `supprimer_article`,
`preparer_liste_achat` (`git show --stat 8022cc6` : `outils-actions.ts` +80, `actions-serveur.ts` +423).
Construction fail-closed : une action « à confirmer » sans préparation, une directe avec préparation, ou un outil du catalogue sans
exécution font échouer la construction (`actions-serveur.ts:1404-1413`).

### 1.5 Le cadrage et le mode « fait tout seul » [V]
- Mots d'action (`MOTS_ACTION`, `cadrage.ts:98-115`), d'effet (`MOTS_ACTION_EFFET`, l.78-84), de brouillon (l.85-89), accord « oui »
  (l.90, et toute réponse qui COMMENCE par « oui », l.92), créations « nouveau devis » (l.117). Correspondance par début de mot
  (`contient`, l.47).
- `actionDemandee` (l.146) décide du MODE depuis le 29/10 : demandé + aucun texte de tiers → exécuté (l.160-162) ; sinon carte.
- Le prompt dit alors au modèle « FAIS-LA … les outils à confirmer l'EXÉCUTENT directement » (l.172-173).
- Exécution : `proposee()` prépare, puis, si `ctx.autonome()`, réalise aussitôt et inscrit l'action comme faite (`actions-serveur.ts:1358-1379`).
  Plafonds inchangés : 30 envois (`ENVOIS_JOUR_MAX`, l.59) et 200 actions par jour (`ACTIONS_JOUR_MAX`, l.61, l.1322).
- **Ce que montre la sonde** (annexe A) : `actionDemandee = true` pour « Quelles factures sont payées ? », « Est-ce que M. Martin a payé ? »,
  « Quels devis dois-je relancer ? » (et `actionAEffet` vrai), « Le devis Dupont est-il signé ? », « Ai-je déjà relancé ce client ? »,
  « Qu'est-ce que j'ai réglé ce mois-ci ? », « Combien de devis ai-je envoyés la semaine passée ? ». `lire_devis` et `lire_factures`
  ne sont pas des lectures « de tiers » (`lib/pilote/regles.ts:132`) [D] : après elles, une relance demandée « en question » part sans
  carte. Les tests existants ne couvrent que 9 questions de lecture (`scripts/assistant-qa.mjs:908`) et 6 (`:887`).

### 1.6 Cartes, confirmation, annulation [V]
- Table `assistant_actions` (`0157:31-51`) : 7 statuts (`cartes.ts:15`), mode `direct` / `confirmation`, `annulation` jsonb, objet lié ;
  écrite par le service seulement, lue par l'artisan sous RLS (`0157:55-59`) ; garde de session posée (`0157:70-85`).
- Confirmation : réclamation atomique `en_attente → en_cours` (`confirmation.ts:106` ; `magasin.ts:24-31`), une seule exécution ;
  échec → statut `echec` avec motif (l.113-116) ; validité 24 h (`cartes.ts:18`, refus `expiree` l.83).
- Annulation d'une action faite quand un inverse existe (`confirmation.ts:138-156`) ; inverses relevés dans `actions-serveur.ts`
  (l.235, 280, 304, 446, 466, 488, 514, 538, 575, 588, 607, 629, 648, 678, 694, 716, 740, 755, 775, 1120, 1128, 1177).
- Route des décisions : `app/api/assistant/actions/route.ts` (60 l.), 120 clics / 10 min (l.27), carte confirmée ou refusée sortie de la
  file du pilote (`annulerParRef`, l.54).

### 1.7 Le journal [V]
- `assistant_journal` (`0150:52-72`) : une ligne par appel d'outil — compte, conversation, tour, outil, entrées résumées, résultat
  (`ok`/`refus`/`erreur`), phrase, objet.
- RGPD : aucun texte libre (`journal.ts:7-10`, `resumerEntrees` l.36-50) : un nom cherché devient « (texte non conservé) ».
- Ce qui manque pour la traçabilité du prompt : ni modèle, ni jetons, ni coût, ni version de prompt par tour (schéma `journal.ts:17-27`) ;
  les entrées libres ne sont pas gardées, donc un tour n'est pas rejouable à l'identique.

### 1.8 Le briefing [V]
- `composerBriefing` (`briefing.ts:44-101`), pur : conversations en attente (urgentes d'abord, l.52-55), devis envoyés sans réponse
  depuis **7 jours** (`DEVIS_SANS_REPONSE_JOURS`, l.35 ; l.57-62), factures échues (urgentes à **30 jours**, l.37 ; l.64-68), stock sous
  le seuil (l.70-72), et avec le CRM : chantiers du jour, en retard (urgents à 7 j, l.77), à facturer (l.74-81). Chaque rubrique liste
  ses `actions_possibles` (des PROPOSITIONS, l.99).
- Produit **seulement si on le demande** : outil `briefing_du_matin` (`executeurs.ts:255-292`), sous la session de l'artisan.
- Le seul « briefing poussé » existant est la notification du matin des rappels du CRM (`lib/crm/rappelsTour.ts:1-4`, `:36-58`,
  passage de `app/api/cron/relances/route.ts:325-336`), offre `crm` seulement, push seulement.

### 1.9 La mémoire [V]
- Pas de mémoire en base : `assistant_conversations` ne garde que le compteur de tours (`0150:38-44`) ; l'historique vient de l'écran,
  12 messages et 12 000 caractères au plus (`cadrage.ts:22-23`), cru seulement signé (`historique.ts:8-15` ; la raison de ne rien stocker :
  RGPD, l.13-15).
- Mémoires annexes : `retenir_resultat` (un résultat de recherche fournisseur gardé dans l'inventaire ou les tarifs), exemples de devis
  passés pour le chiffrage (`lib/ai/exemples.ts`). Ni faits retenus, ni préférences, ni pgvector (non activé d'après le catalogue du
  01/11 : `cadrage-p3.md:47`) [S].

### 1.10 Accès, offres, plafonds [V]
- Capacité `assistant` = **Studio et au-dessus** (`lib/plans.ts:75`) ; outils CRM seulement avec la capacité `crm` (Signature, `lib/plans.ts:86`) :
  décision `lib/crm/acces.ts` reprise par `garde.ts:32`.
- Le prompt et les cartes interdisent l'invention : `cadrage.ts:206-212` (aucun prix, délai, créneau, fournisseur ; messages de clients
  = données) ; coordonnées des clients masquées avant envoi au modèle (`masquerCoordonnees`, l.228).

### 1.11 Les écrans de l'assistant [V]
- `/assistant` (`app/assistant/page.tsx`, 293 l.) : la conversation et un « poste de commande » à trois onglets « À confirmer »,
  « Actions », « Journal » (l.75, l.253-275) ; cartes `app/assistant/CarteView.tsx` ; sans essai ouvert, retour à `/dashboard` (l.100).
- Panneau de l'assistant DANS le CRM (`app/crm/assistant/PanneauAssistant.tsx`, 268 l.) : même moteur, contexte « ce chantier ».

---

## 2. Le pilote automatique — `lib/pilote/*` (4 fichiers, 734 lignes) [V]

| Élément | Où |
|---|---|
| Délai d'annulation 10 min | `regles.ts:24-25` |
| Plafond 20 envois / 24 h glissantes / compte | `regles.ts:27` ; jeton atomique fail-closed `serveur.ts:55` ; comptage `serveur.ts:40-46` |
| Attente maximale 24 h (`ATTENTE_MAX_MS`) → repasse en manuel | `regles.ts:29`, `regles.ts:165-169`, `file.ts:70` |
| 15 lignes par passage, budget 20 s, reprise des lignes `en_cours` après 5 min | `regles.ts:31`, `file.ts:21-22`, `file.ts:52` |
| 6 types : `reponse_prospect`, `relance_devis`, `relance_impaye`, `envoi_devis`, `envoi_facture`, `assistant_client` | `regles.ts:33` ; contrainte en base `0174:31` |
| `OUTIL_TYPE` (9 outils → type) | `regles.ts:50-60` |
| Liste fermée des outils réellement exécutables (6) | `OUTILS_EXECUTABLES_PILOTE`, `regles.ts:67` |
| Jamais automatiques | `OUTILS_JAMAIS_AUTO`, `regles.ts:70-73` (`marquer_facture_payee`, `creer_facture`, `rembourser`, `payer`, `creer_avoir`, `supprimer_devis_brouillon`, `supprimer_tarif`, `augmenter_tarifs`) |
| Prix sourcés obligatoires (`prixSources`) | `regles.ts:94-105` (provenance explicite « vos tarifs », « tarif de l'artisan », « prix donné par l'artisan ») |
| Carte née d'une conversation où un texte de tiers a été lu : jamais seule | `regles.ts:126-133`, marque posée `actions-serveur.ts:1380-1386`, vérifiée `serveur.ts:106`, `file.ts:79` |
| Décision | `decisionPilote`, `regles.ts:139-157` (drapeau, jamais auto, offre `assistant.pilote`, actif, type actif, prix, plafond) |
| Idempotence | clé `<source>:<ref_id>` (`regles.ts:160`), contrainte unique `(artisan_id, cle)` (`0174:42`), `upsert … ignoreDuplicates` (`serveur.ts:76`) |
| Réglages | `pilote_reglages` (`0174:21-26`), défaut coupé (`regles.ts:81`) ; couper annule toute la file (`serveur.ts:192-200`) ; changement d'offre annule (`serveur.ts:207-212`) |
| Prévenir l'artisan | push seulement (`serveur.ts:81-88`) |
| Départ | tic minute (`app/api/agents/tic/route.ts:87-101`), orchestrateur `file.ts:48-108`, cartes via `confirmerAction` (`executeur.ts:208`), envois par les fonctions partagées (`executeur.ts:3-12`, `lib/envoisServeur.ts:90`, `:130`, `lib/envoisPdfServeur.ts:32`, `:101`) |
| Écran | `app/parametres/SectionPilote.tsx` (liste « Partira dans … », « Annuler », l.48, l.95-100) ; routes `app/api/pilote/file`, `app/api/pilote/reglages` (garde `app/api/pilote/garde.ts:14-25`) |
| Canaux pilotables | e-mail, formulaire, Telegram seulement (`lib/canaux/regles.ts:42-48`) |

Qui remplit la file : **`piloterCarte`** (`serveur.ts:99-117`) appelé par `actions-serveur.ts:1390`, et **`piloterProposition`**
(`serveur.ts:120-142`) appelé par `app/api/leads/route.ts:343`, `app/api/conversation/stream/route.ts:138`, `lib/canaux/serveur.ts:186`.
Aucun détecteur, aucun passage planifié ne crée de ligne.

Ce qui manque au pilote pour la DoD : aucun renvoi automatique d'une action en `echec` (statut final, `file.ts:102`) ; pas de
disjoncteur par type ; pas de mot d'escalade relu au départ (`executeur.ts:184-193` ne regarde que prise en main, limite, horaire) ;
`OUTILS_JAMAIS_AUTO` est une liste écrite à la main qui ne cite ni `supprimer_article`, ni `creer_facture_libre`, ni
`noter_opposition_client` (protégés aujourd'hui par la seule liste blanche, `regles.ts:75-78`).
Constat de production du 29/10 [S] : `actions_auto` 0 ligne, `pilote_reglages` 0 ligne (`ETAT-DES-LIEUX-2026-10-29.md:21`).

---

## 3. Offres, capacités, mode de réponse [V]

- `lib/plans.ts` : `PlanId = gratuit | essentiel | studio | signature | business` (l.14) — **pas d'offre « entreprise »**.
- Capacités (l.18-37). STUDIO (l.56-76) : plateforme, `canaux.email`, `relances` (préparées), `chiffres`, `factures.relances` (l.70),
  inventaire et recherche, `canaux.whatsapp`, `export`, **`assistant`** (l.75). SIGNATURE (l.77-90) ajoute `plateforme.ia.auto`,
  `relances.auto`, `factures.relances.auto` (l.80), `plateforme.ia.expert`, `plateforme.regles` (l.81), `chiffres.auto` (l.82),
  `canaux.reseaux`, `support.prioritaire` (l.83), **`crm`** (l.86), **`assistant.pilote`** (l.89). Business = Signature, interne (l.101).
- Prix et essais : Studio 59 €/mois, 250 crédits (l.98), Signature 99 €/mois, 600 crédits (l.99) ; essai sans carte 7 / 21 jours (l.108).
- Verrou unique `peut(plan, capacite)` (l.134-136) ; message `messageVerrou` (l.145).
- Textes vendus : Studio « vous validez d'un clic, rien ne part sans vous » (l.98, l.206) ; Signature « tout part automatiquement …
  jamais un prix estimé ni un paiement sans vous » (l.207) ; ligne de grille « Vous confirmez ce qui part chez un client » (l.260) ;
  Pilote (l.266).
- `lib/plateformeConfig.ts` : défaut `mode_reponse: 'assistee'` (l.44-45) ; mots d'escalade par défaut (l.56) ; l'escalade passe avant
  le mode assisté (l.157-161) ; **`modeEffectif`** rend « assistée » avec le motif **`verrou_offre`** quand « auto » est choisi sans
  `plateforme.ia.auto` (l.183-186) ; décision unique `decisionReponse` (l.197-210).
- Décision du 01/11 à trancher [V, fichier] : le bloc d'offres corrigé par Benj (`prompts-benj/p3-assistant-bloc-offres-corrige-0111.md:12`)
  écrit « Capacité : plateforme.ia.auto à partir de Studio », contraire à `lib/plans.ts:80` ; il dit aussi que l'offre Entreprise
  « n'est pas un niveau d'autonomie différent … disponible dans l'offre Signature » (l.28-36), alors que l'annexe 2 §3.1 de
  `p3-assistant.md` lui donne « le niveau 3 sur les types d'action convenus par contrat ».

---

## 4. Les drapeaux utiles au chantier — `lib/flags.ts` (57 drapeaux, 11 baissés) [V]

Levés : `busAgents` (l.17, ouvre `/api/agents/*` dont le tic), `pushWeb` (l.26), `pushNatif` (l.29), `messagerie` (l.44),
`comptabilite` (l.47), `inventaireRecherche` (l.58), `plateformeRegles` (l.60), `comptaDateReglement` (l.136), `comptaAlerteImpayes` (l.141),
`comptaExportMensuel` (l.144), **`assistant` (l.161)**, **`crm` (l.172)**, `relancesImpayes` (l.179), `crmPieces` (l.186), `crmPlanning` (l.191),
`crmApresChantier` (l.199), `crmPlan` (l.205), `crmSuivi` (l.211), `crmAtelierVivant` (l.224), `crmTempsReelComplet` (l.233),
**`piloteAutomatique` (l.243)**, `crmPointage` (l.249), `devisLots` (l.260), `facturesSituation` (l.271), `canauxTelegram` (l.281),
`canauxNotifications` (l.295), `canauxLiens` (l.303), `importProspects` (l.311).

Baissés (11) : `constructeurSite` (l.19), **`inventaireOcr` (l.56, photo de facture fournisseur → lignes)**, `landingVideo` (l.66),
**`canauxWhatsapp` (l.70)**, **`canauxReseaux` (l.72)**, `canauxLeboncoin` (l.79), `siteAchatPublic` (l.95), `packPub` (l.116),
`packPubVente` (l.118), `aimantSite` (l.128), `ecommerce` (l.130).

`ESSAI` est vide (l.323), `enEssai` (l.325). **`consoleV2` n'existe pas sur `main`** (`grep` : 0) : il est dans `refonte-1018`
(`lib/flags.ts:189` de cette branche, `ESSAI = { consoleV2: true }` l.206 ; 37 commits d'avance, dernier le 19/10). Aucun drapeau
n'existe encore pour : détecteurs, boîte « À valider », organisations, SMS, offre Entreprise, `comptesFournisseurs` (seulement dans le
worktree `comptes-fournisseurs-0a934e`, d'après la note du cerveau du 29/10 [S]).

---

## 5. Les relances et les passages quotidiens [V]

| Mécanisme | Où | Offre | Comportement |
|---|---|---|---|
| Relances de CONVERSATION J+2/J+5/J+10 | `lib/relances.ts:23`, armées par `planifierRelances` (l.38 ; appelée par `lib/envoisServeur.ts:120`, `:148`, `lib/envoisPdfServeur.ts:86`) ; jamais pour une demande importée (l.42-43) | plateforme (Studio+) | Passage `app/api/cron/relances/route.ts` : Studio → PROPOSÉE dans le fil + notification (l.159-180) ; Signature (`relances.auto`) → e-mail au nom de l'artisan (l.181-208) ; 100 par passage (l.36) ; fondateur sauté (l.154-158) |
| Relance d'un devis par la conversation | seulement si le devis porte un `lead_id` (`lib/envoisPdfServeur.ts:80-88`) | Studio+ | un devis créé hors conversation (par l'assistant sans `conversation_id`, ou à la main) n'a **aucune** relance automatique |
| Relances d'IMPAYÉS J+3/J+10/J+21 (réglables) | `lib/relancesImpayes.ts` (3 relances au plus l.23, 10 / compte / jour l.28, `decider` l.192), `lib/relancesImpayesTour.ts` (200 comptes l.25 ; Studio → `a_valider`, Signature → envoyée, l.81, l.125), tables 0159 + 0181 | `factures.relances` (Studio), `.auto` (Signature) | opt-in par artisan (`flags.ts:174`) ; fondateur ignoré (`relancesImpayesTour.ts:78`) |
| Relance d'un devis du CRM | `app/api/crm/relances/envoyer/route.ts` (3 relances, rappel à +7 j, l.11-17) ; règle `devisARelancer` (`lib/crm/rappels.ts:107`) | `crm` | geste de l'artisan |
| Relances de l'assistant | `relancer_devis` (`actions-serveur.ts:855-866`), `relancer_facture` (`:933-946`) ; textes fixes (`cartes.ts:135-153`) ; 3 jours entre deux (l.63) | `assistant` | carte, « fait tout seul » ou pilote (`relance_devis`, `relance_impaye`) |

Le même passage quotidien porte aussi : relève de la boîte de l'entreprise (l.51-54), purges, expiration des devis, alertes, livraison,
automatisations compta (l.269-270), après-chantier qui POSE des rappels (l.290-321), notification du matin des rappels CRM (l.325-336).
Horaire : `0 8 * * *` en UTC (`vercel.json:5`), soit 9 h à Paris en hiver. Pause générale lue avant toute lecture de contact (l.59) et
relue à chaque relance (l.81). Constat du 29/10 [S] : « comptes: 0 » pour compta, impayés, après-chantier, rappels (`ETAT-DES-LIEUX:25`).

---

## 6. Devis, factures, montants, règles d'automatisation [V]

- Création d'un devis par l'assistant : `creer_devis` (directe, brouillon) ; chaque ligne s'appuie sur un tarif (`tarif_id`) ou sur un
  prix donné par l'artisan, sinon « à chiffrer » (`cartes.ts:164-181`) ; **TVA par défaut 10 %** pour une ligne sans tarif et pour un
  tarif sans taux (`cartes.ts:173`, `:178`). Route de l'interface `POST /api/devis` appelée avec la session (`actions-serveur.ts:29`) ;
  totaux calculés par le code (`app/api/devis/route.ts:32`, `lib/devisTotals.ts:6`).
- Chiffrage automatique d'une conversation : `lib/devisAuto.ts:25` (sources `manuel | outil | regle`, l.19 ; idempotent par conversation) ;
  catalogue « SES tarifs d'abord, les ordres de grandeur du marché » (l.54-57) ; un prix du marché est libellé « estimation »
  (`lib/prix/types.ts:45-80`, `lib/prix/marche.ts:5-9`).
- Conversion devis → facture : `creer_facture` (carte) → `creerFacture` (`lib/factureDepuisDevis.ts:60`), même fonction que le bouton
  « Facturer » (`app/devis/[id]/page.tsx:249`), que `POST /api/factures` (`app/api/factures/route.ts:34`), l'acompte du CRM
  (`app/api/crm/acompte/route.ts:36`) et l'acompte après acceptation (`app/api/conversation/devis/route.ts:95`) ; simulation exacte avant
  émission (`lib/factureDepuisDevis.ts:64`, `actions-serveur.ts:883-888`) ; émission atomique (0180, « APPLIQUÉE le 21/10 », en-tête l.3) ;
  acompte, situation, solde (drapeau `facturesSituation`, `outils-actions.ts:46-49`) ; mentions bloquantes (`lib/legalArtisan.ts:94`).
- Règles d'automatisation de la plateforme (`lib/regles.ts`, Signature `lib/reglesServeur.ts:33`) : quatre préréglages, dont « Tout auto »
  qui envoie le devis dans la conversation sans validation (`lib/regles.ts:54-58`, `:120-122`) ; l'envoi ne contrôle que les mentions
  légales (`lib/reglesServeur.ts:53-62`), **pas la provenance des prix** [V] → brèche §3.2 décrite au constat 9.
- Marge : seulement au niveau de « Mes chiffres », quand des dépenses sont connues (`lib/comptaTableau.ts:26`, `:386`) ; aucune marge
  par devis.

## 7. Inventaire, stock, fournisseurs [V]

- `lib/inventaire/` (5 fichiers + `CONTEXT.md`) : vocabulaire (matériau, fournisseur, observation de prix, prix d'achat, prix vu à
  revérifier après 30 jours, lieu ; `CONTEXT.md:7-32`), cache des prix, observations, liste de départ des fournisseurs, garde `auth.ts`.
- Alertes : `seuil_alerte` (`0040_inventaire.sql:19`) ; calculées à la lecture par `GET /api/inventaire` (`app/api/inventaire/route.ts:70-75`) ;
  affichées sur `/inventaire` (`app/inventaire/page.tsx:41`, `:175-179`) ; lues par `lire_stock` (`executeurs.ts:107`) et le briefing
  (`briefing.ts:70-72`) ; alerte « stock » de la carte de l'atelier (`lib/crm/alertes.ts:19`, `:76`). **Aucune alerte poussée.**
- Besoins par chantier : réservations du CRM seulement (`chantier_materiaux`, `0141:121`) ; `resumerMateriauxReserves` signale
  `reserve_plus_que_le_stock` (`lib/assistant/crm.ts:212-261`, l.257). Les lignes d'un devis ne sont reliées à aucun article : « Est-ce
  que j'ai assez de carrelage pour le chantier Dupont ? » n'a de réponse calculée que si le matériau a été réservé (offre `crm`).
- Commandes proposées : `preparer_liste_achat` (liste « à racheter », tables `listes_achat` / `lignes_achat`, `0040:63`, `:71`) ;
  commandes fournisseur `commandes_fournisseur` (`0158:29`) et `enregistrer_commande`, `recevoir_commande`, `relancer_commande`.
- Recherche chez les fournisseurs : `lib/recherche-fournisseurs.ts`, route `/api/inventaire/recherche` ; comptes fournisseurs connectés :
  travail non fusionné (worktree `comptes-fournisseurs-0a934e`, migration 0182 non commitée, aucun site calibré d'après la note du
  29/10 [S]).
- Imports existants : tarifs CSV (`lib/prix/csv.ts`, `app/tarifs/page.tsx`), stock CSV (`app/inventaire/ImportCsv.tsx`). OCR baissé
  (`flags.ts:56`).

## 8. Comptabilité [V]
- « Mes chiffres » (`app/chiffres/`) : l'IA voit la FORME des fichiers (chiffres masqués), le code lit et calcule chaque centime
  (`lib/comptaAssistant.ts:1-13`) ; les lignes importées restent dans le localStorage (`app/chiffres/ComptaArtisan.tsx:17`, `:74`, `:97`).
- Automatisations (Signature, `chiffres.auto`) : alerte d'impayé une fois par facture et export mensuel au comptable
  (`lib/comptaAutomatisations.ts:1-13`, `facturesASignaler` l.40 ; tables `compta_reglages`, `compta_alertes_envoyees`, `0140:37`, `:56`).
- Rien pour l'URSSAF ni les impôts (cohérent avec §3.2) ; pas de table de paiements (`factures.payee_le`, `0140:18-25`).

## 9. Rendez-vous, équipe, pointage [V]
- Rendez-vous de l'artisan = rappels du CRM de type `visite`, `metre`, `rendez_vous` (`lib/crm/rappels.ts:25`, table `crm_rappels`
  `0162:22`) ; lien d'agenda ICS privé (`crm_agenda`, `0164:14`, `lib/crm/ics.ts`) ; notification du matin à l'artisan seulement,
  « aucun message au client » (`lib/crm/rappelsTour.ts:1-4`). **Aucun rappel de rendez-vous au client.** (`app/rendez-vous/[jeton]` est
  la prise de rendez-vous de la PROSPECTION de Presti, `lib/agents/acquisition/rendezVous.ts`, hors périmètre.)
- Équipe : `equipe_membres` (nom, rôle métier `artisan | compagnon | apprenti | salarie | sous_traitant | autre`, téléphone ; `0141:30-39`),
  `chantier_equipe` (`0141:87-93`), `vehicules` (`0141:43`) ; écran `app/crm/Equipe.tsx`. Ce sont des fiches, **pas des comptes**.
- Pointage : lien à jeton par chantier (`chantier_pointage`, `0174:65-71` ; page `app/pointage/[jeton]/route.ts`) ; avancement dit par
  l'artisan (`avancer_chantier`, `lib/assistant/avancement.ts`).

## 10. Canaux [V]
- E-mail : `lib/email.ts` (Resend) ; nom de l'artisan en expéditeur et son adresse en Reply-To (l.6-11) ; l'adresse technique reste
  `contact@prestiapp.fr` tant que `EMAIL_EXPEDITEUR_ARTISAN` n'est pas posée (l.18-20, variable non lue ici) ; plafonds du jour :
  80 envois « produit » par défaut (l.92-93), part des canaux 40 (l.91) ; la pause générale ne coupe pas un envoi transactionnel (l.73).
- WhatsApp / Messenger / Instagram : drapeaux baissés (`flags.ts:70`, `:72`), règles `lib/canaux/regles.ts:13-31` ; Le Bon Coin baissé.
- Telegram de l'ARTISAN : `lib/canaux/telegram.ts`, levé (`flags.ts:281`), seul canal de conversation pilotable (`lib/canaux/regles.ts:42`).
  `lib/agents/telegram.ts` est autre chose : le pont du FONDATEUR (commandes `pause`, `etat`, `consigne`, l.11-12).
- Réseaux par e-mails de notification, liens et QR, import CSV des prospects : levés (l.295, l.303, l.311).
- SMS : **absent** (aucun fournisseur, route ni drapeau ; le mot n'apparaît que comme source d'un lien, `lib/canaux/reseaux.ts:12`).
- Notifications à l'artisan : push web et natif (`lib/push.ts:105`, `lib/pushNatif.ts`), `notifierArtisan` (`lib/notifications.ts:59`).

## 11. Horloges et orchestration [V]
- Tic minute : pg_cron `presti-agents-tic` `* * * * *` (`0101_ops_horloge.sql:164`) → `GET /api/agents/tic` (`app/api/agents/tic/route.ts`) :
  drapeau `busAgents` (l.20), secret en temps constant (l.21-23), budget 25 s (l.26), pause générale (l.32), étapes baux, balayage,
  file d'argent, veilleur (toutes les 5 min), **pilote** (l.87-101, sauté sous pause), livraison toutes les 15 min (l.103-109).
- Crons Vercel : deux, tous deux pris (`vercel.json:2-11`).
- n8n, Hermes, Orca : aucune occurrence dans `lib/` ni `app/` (`grep` ce jour) ; d'après `.claude/rules/architecture-outils.md`,
  n8n tourne sur Oracle sans workflow métier, Hermes et Orca sur le PC [S].
- Conflit de doctrine à trancher : l'annexe technique du 29/10 dit « pas de n8n, pas de Docker … un nouveau détecteur se branche sur le
  tic ou le passage quotidien » (`PROMPT-AUTOMATISATION-ARTISAN.md:53-54`) ; les décisions du 01/11 disent « n8n : moteur de TOUTES les
  automatisations … aucune automatisation en dur dans le backend » (`.claude/rules/architecture-outils.md`, ADR-001) et l'annexe 2 de
  `p3-assistant.md` (§3.4) : n8n porte les déclencheurs planifiés, Supabase reste la file. La décision la plus récente (01/11) prime.

## 12. Les pages de la console [V]
24 pages utilisent `AppShell` : `abonnement`, `aide`, `assistant`, `chiffres`, `controle`, `crm` (+ `chantiers/[id]`, `clients/[ref]`),
`dashboard`, `devis` (+ `[id]`), `factures`, `inventaire` (+ `fournisseurs`, `recherche`), `messages` (+ `canaux`), `outils`, `parametres`,
`plateforme`, `profil`, `pubs/commander`, `site/commander`, `tarifs`.
- Atterrissage : `/outils` après connexion (`app/login/page.tsx:32-35`) et après l'inscription (`lib/suiteSure.ts:5`).
- Menu : groupe « Pilotage » de 12 entrées (`app/AppShell.tsx:28-45`), puis « Outils IA » : « Réponses instantanées » (l.50) et
  « Assistant de gestion » (l.52).
- `/dashboard` (`app/dashboard/page.tsx`, 234 l.) : les demandes (leads) et leurs statuts (l.16-24) ; ni impayés, ni relances, ni briefing.
- `/onboarding` (131 l.) : nom, métier, téléphone, ton, adresse de page (`app/onboarding/page.tsx:61-65`) ; aucun import.
- Paramètres : `SectionPilote.tsx` ; Factures : `RelancesAuto.tsx` ; CRM : atelier 3D, pipeline, planning, rappels, équipe, pointage.

## 13. Les tables utiles — `supabase/migrations` [V]

168 migrations numérotées et 136 jumeaux `_A_COLLER_*` (`ls` ce jour) ; **dernière : `0181_relances_impayes_a_valider.sql`**.

| Domaine | Tables (fichier:ligne de création) |
|---|---|
| Assistant | `assistant_conversations` (0150:38), `assistant_journal` (0150:52), `assistant_actions` (0157:31) ; fonctions `assistant_prendre_tour` / `assistant_rendre_tour` (0150:79-) |
| Pilote | `pilote_reglages` (0174:21), `actions_auto` (0174:28, déclencheur anti-croisement 0174:49-63), `chantier_pointage` (0174:65) |
| Devis | `clients` (0002:24), `devis` (0002:36), `devis_lignes` (0002:59) ; déclencheur des dates 0170 (en-tête : « NON APPLIQUÉE », l.1) ; types et lots 0176 |
| Factures | `factures` (0006:10), `factures_lignes` (0006:36), `payee_le` (0140:18), provenance des prix 0178, émission atomique 0180 |
| Relances | `relances` (0010:30), `relances_impayes_reglages` (0159:24), `relances_impayes` (0159:41), `relances_impayes_arrets` (0159:59), statuts `a_valider` / `rejetee` (0181:38-40) |
| Conversations | `leads` (0010:6), `messages` (0010:19), `plateforme_config` (0032:4), `canaux` (0036:4), `canaux_evenements` (0139:43), `regles_automatisation` (0050:46) |
| Stock | `prix_artisan` (0038:8), `materiaux` (0040:7), `stock` (0040:35), `mouvements_stock` (0040:46), `listes_achat` (0040:63), `lignes_achat` (0040:71), `fournisseurs` (0048:13), `prix_observations` (0048:67), `commandes_fournisseur` (0158:29) |
| Équipe et chantiers | `equipe_membres` (0141:30), `vehicules` (0141:43), `chantiers` (0141:61), `chantier_equipe` (0141:87), `chantier_taches` (0141:99), `chantier_materiaux` (0141:121), `crm_notes` (0141:139), `crm_journal` (0141:158), `crm_rappels` (0162:22), `chantier_pieces` (0163:29), `crm_agenda` (0164:14), `crm_apres_chantier` (0165:19), `chantier_suivi` (0167:14), `crm_apres_opposition` (0171:14), `crm_reglages` (0172:34) |
| Compta | `compta_reglages` (0140:37), `compta_alertes_envoyees` (0140:56) |
| Transverse | `artisans` (0001:4), `app_errors` (0016:5), `limites` (0049:17), `passages_cron` (0057:12), `push_abonnements` (0064:15), `suspensions` (0068:24) ; garde de session 0138 (`jeton_session_valide` l.35-74, `compte_non_suspendu` l.79) |
| **Absentes** | `organisations`, `membres`, `invitations`, `evenements_metier`, `opportunites` / détecteurs, `paiements`, `documents` (hors `chantier_pieces`), envois SMS |

Point d'attention [V] : beaucoup d'en-têtes de migrations disent encore « NON APPLIQUÉE » (0155, 0156, 0157, 0158, 0159, 0162 à 0167)
alors que les commentaires des drapeaux disent qu'elles l'ont été (par ex. `flags.ts:174-176` pour 0159, l.184 et l.190 pour 0163-0164)
et que l'état des lieux du 29/10 compte des lignes dans `assistant_actions` (0157) [S]. La vérité est en base, pas dans l'en-tête.

## 14. Les tests au lanceur — `scripts/tout-verifier.mjs` [V]
- `rls-e2e.mjs` (l.46, CONTRE LA PRODUCTION) : 14 tables (`artisans, canaux, devis, devis_lignes, factures, leads, lignes_achat,
  listes_achat, materiaux, messages, mouvements_stock, plateforme_config, prix_artisan, stock`) ; aucune table de l'assistant, du pilote
  ni du CRM.
- `relances-impayes-qa.mjs` (l.54), `acces-automatisations-qa.mjs` (l.57), `aide-automatique-qa.mjs` (l.59), `relances-e2e.mjs` (l.72),
  `assistant-qa.mjs` (l.136), `pilote-qa.mjs` (l.157), `types-devis-factures-qa.mjs` (l.159), `avancement-qa.mjs` (l.161),
  `assistant-tout-qa.mjs` (l.162), `crm-assistant-panneau-qa.mjs` (l.163), suites CRM (l.143-172).
- Résultats du 01/11 [S] : `assistant-qa` 309/0, `assistant-tout-qa` 118/0, `pilote-qa` vert ; deux défauts dans la partie `--live`
  (`cadrage-p3.md:87-90`). Non rejoués ici (interdit de tests).
- Tâches en file `029-001` et `029-002` (`.orchestre/file/`) : l'assistant en vrai et jugé par le vrai modèle — assignées à `codex` et
  `antigravity`, exécutants interdits depuis le 01/11 (`.claude/rules/architecture-outils.md`).

## 15. Écarts entre la documentation et le code [V]
1. `lib/assistant/acces.ts:4` et `:8` : « Signature et Business seulement » — faux depuis le 25/10 (`lib/plans.ts:75`).
2. `app/api/assistant/route.ts:40` : « `assistant` (Signature, Business) » — même erreur.
3. `app/api/assistant/actions/route.ts:20-22` : « C'est le SEUL chemin qui exécute une action à confirmer … offre Signature » — faux
   depuis le « fait tout seul » (`actions-serveur.ts:1365`) et le 25/10.
4. `lib/assistant/confirmation.ts:3-5` : « La règle de fer : une action à confirmer ne s'exécute QUE par ce chemin » — même chose.
5. `app/crm/assistant/PanneauAssistant.tsx:11` : « l'assistant est Signature ».
6. `scripts/tout-verifier.mjs:136` : « 28 actions », « offre Signature ».
7. `ETAT-DES-LIEUX-2026-10-29.md:23` : « les outils d'action ne sont proposés que sur un mot d'action » — périmé depuis `8022cc6`
   (`route.ts:152-155`) ; « 45 outils d'action » → 52.
8. En-têtes de migrations « NON APPLIQUÉE » (§13).
9. `lib/aideAutomatique.ts:18-19` recopie 10 min et 20 / jour au lieu d'importer `lib/pilote/regles.ts:24` et `:27`.
10. « cron de 8 h » : c'est 08:00 UTC (`vercel.json:5`).

---

## 16. Definition of Done n° 1 (`p3-assistant.md:362-376`) : existe, manque, où brancher

| Point | Ce qui existe [V] | Ce qui manque | Où le brancher |
|---|---|---|---|
| L'artisan arrive sur un assistant clair, pas sur un menu complexe | `/assistant` (chat + « À confirmer / Actions / Journal », `app/assistant/page.tsx:75`, `:253-275`) ; panneau dans le CRM | Atterrissage `/outils` (`app/login/page.tsx:34`, `lib/suiteSure.ts:5`) ; assistant en dernière position du menu (`app/AppShell.tsx:52`) ; accueil `/dashboard` limité aux demandes ; aucun briefing ni tâche prioritaire à l'ouverture ; `consoleV2` hors de `main` | Nouvel accueil derrière un drapeau (fusion de `refonte-1018`/`consoleV2` à décider, ou drapeau neuf) ; `destination()` (`login/page.tsx:32-35`) et `suiteSure` (l.5) ; `NAV` (`AppShell.tsx:28`) ; bloc « briefing du jour » alimenté par `composerBriefing` (`briefing.ts:44`) |
| Créer un devis en langage naturel | `creer_devis` (`outils-actions.ts:60-74`), lignes sur tarifs (`cartes.ts:164-181`), nombre sans source refusé (`boucle.ts:212-217`), totaux par le code (`app/api/devis/route.ts:32`), `preparer_devis_brouillon` | Comptes sans tarifs → tout « à chiffrer » (compte fondateur : 0 tarif, `ETAT-DES-LIEUX:22` [S]) ; TVA 10 % par défaut (`cartes.ts:178`) ; texte seulement (ni photo, ni fichier, ni lien) | Mise en route : imports existants (`lib/prix/csv.ts`, `app/inventaire/ImportCsv.tsx`) + import de clients et d'anciens devis à créer ; TVA par défaut lue du profil (`regleTva`, `lib/ai/metiers.ts`) |
| Valider avant envoi | 20 actions « à confirmer » ; `confirmerAction` (`confirmation.ts:95`) ; Studio : relances proposées (`cron/relances/route.ts:159-180`), impayés `a_valider` (0181) | « Fait tout seul » sans carte, sans lien avec l'offre (`route.ts:128`) et déclenché par des questions (annexe A) ; cartes qui expirent en 24 h (`cartes.ts:18`) ; cinq boîtes « à valider » distinctes | Restreindre `faitToutSeul` (`cadrage.ts:160`) : liste fermée des actions qu'il peut exécuter, réglage par type, et jamais une action à effet externe sous Studio ; une boîte « À valider » unique qui agrège `assistant_actions`, propositions, `relances_impayes.a_valider`, `actions_auto` ; test des questions au lanceur |
| Transformer un devis en facture | `creer_facture` → `creerFacture` (`lib/factureDepuisDevis.ts:60`), bouton du devis, simulation exacte, émission atomique (0180), acompte / situation / solde | Rien ne PROPOSE la facture d'un devis signé ou d'un chantier terminé (le poste des assistants le montre sans agir, `lib/crm/assistants.ts:4-10`) | Détecteurs « devis signé sans facture » et « chantier terminé sans solde » qui créent une carte `creer_facture` (jamais émise seule : `regles.ts:70-73`) |
| Voir son inventaire et ses alertes | `/inventaire` et ses alertes (`app/inventaire/page.tsx:175-179`, `app/api/inventaire/route.ts:70-75`), `lire_stock`, briefing, carte de l'atelier | Aucune alerte poussée ; besoins par chantier liés aux seules réservations CRM ; OCR baissé | Détecteur « stock sous le seuil » → carte `preparer_liste_achat` ; alerte dans le briefing poussé |
| Relancer devis et factures | 4 mécanismes (§5) ; textes fixes ; pilote `relance_devis` / `relance_impaye` | Aucune relance automatique d'un devis hors conversation ; aucun registre commun (`actions-serveur.ts:861`, `:941`) | Détecteur « devis envoyé sans réponse » (seuil 7 j déjà écrit, `calculer.ts:115`, `briefing.ts:35`) → carte `relancer_devis` → `piloterCarte` ; anti-doublon qui lit `messages` (type relance), `crm_rappels.envoye_le`, `relances_impayes` et `assistant_actions` |
| Chaque action IA est traçable | `assistant_journal` (avant le résultat), `assistant_actions`, `actions_auto` (la file est le journal), `crm_journal`, `passages_cron` | Modèle, jetons, coût, version du prompt par tour ; journal lisible « ce que j'ai fait pour vous cette semaine » ; journal des passages de détecteurs | Colonnes ou table de « passages » (cadrage-p3 §5.2 propose `redactions`, `passages_detecteurs`) ; vue hebdomadaire sur `assistant_actions` + `actions_auto` |
| Chaque organisation est isolée | RLS par `artisan_id` + garde 0138 (252 gardes, `0138:29-31`) ; écritures de service filtrées (`magasin.ts:3-5`, `pilote/serveur.ts:1-5`) ; déclencheurs anti-croisement (`0174:49-63`) ; `rls-e2e` (14 tables) | Pas d'organisation ni de membre ; garde 0138 ouverte à un non-artisan (`0138:55-72`) ; `rls-e2e` ne couvre ni l'assistant, ni le pilote, ni le CRM | Annexe 2 §3.3 (migration additive, `peut_acceder(artisan_id)`, politiques table par table) ; corriger 0138 d'abord ; étendre l'isolation testée |
| Le niveau d'autonomie dépend de l'abonnement | `peut()` (`plans.ts:134`) ; `modeEffectif` / `verrou_offre` (`plateformeConfig.ts:183-186`) ; pilote réservé à `assistant.pilote` (`regles.ts:151`) et réglable par type (`regles.ts:80-92`) | Niveaux 1-2-3 par type d'action seulement pour 6 types du pilote ; « fait tout seul » hors offre ; offre Entreprise absente (`plans.ts:14`) ; bloc d'offres du 01/11 contradictoire (§3) | Généraliser `pilote_reglages.types` en niveau par type (cadrage-p3 §5.2 : `autonomie_reglages`) ; l'offre Entreprise dans `lib/plans.ts` (geste « argent » de la session principale) |
| Aucune action irréversible ne part sans autorisation | `OUTILS_JAMAIS_AUTO` + liste blanche (`regles.ts:67-78`) ; prix sourcés (`regles.ts:105`) ; contenu de tiers (`regles.ts:132`) ; 10 min d'annulation ; pause générale | « Fait tout seul » trop large ; « Tout auto » envoie un devis non sourcé (`reglesServeur.ts:53-62`) ; escalade non revérifiée au départ du pilote (`executeur.ts:184-193`) ; mots d'escalade incomplets (`plateformeConfig.ts:56`) | Un seul catalogue « jamais automatique » dérivé de `SPEC` et lu par le pilote, les règles et le « fait tout seul » ; `prixSources` dans `reglesServeur.ts` ; relire l'escalade dans `etatConversation` |
| Le système est testé, documenté et déployable | Suites hors ligne au lanceur (§14) ; `plans/016-assistant.md` (129 l.), `lib/ai/README.md` ; règle « coller puis lever » | Sauvegarde nocturne rouge depuis le 25/10 [S] et partielle (`scripts/sauvegarde.mjs:49-59` : 34 tables, ni `assistant_actions`, ni `actions_auto`, ni le CRM) ; docs en retard (§15) ; tests des détecteurs, de la porte de conformité et du « fait tout seul » sur des questions à écrire | Phase 0 de l'annexe 2 §4 ; nouvelles suites dans `SUITES` |

## 17. Definition of Done n° 2 (fin de l'annexe 2, `p3-assistant.md:623-629`)

| Point | Ce qui existe [V] | Ce qui manque | Où le brancher |
|---|---|---|---|
| Sur un compte de test rempli par la mise en route, l'assistant produit seul ses cartes du matin | Règles pures de détection (constat 5) ; briefing pur ; horloges (tic `0101:164`, passage 08:00 UTC) ; push du matin déjà utilisé pour les rappels CRM ; magasin des cartes (`magasin.ts:14`) | Pas de mise en route guidée (5 questions), pas d'import clients / anciens devis ; pas d'événements ni d'opportunités ; aucune lecture « sans session » hors du pilote ; `assistant_actions` exige conversation et tour (0157:34-35) et expire en 24 h ; la compta est dans le navigateur ; le compte fondateur est sauté par les relances (`cron/relances/route.ts:154-158`, `relancesImpayesTour.ts:78`) | Module pur de détecteurs (ex. `lib/assistant/detecteurs/`), lectures par clé de service filtrée sur le modèle de `realisateursPilote` (`executeur.ts:46`) ; table d'opportunités (cadrage-p3 §5.2) ou « conversation du matin » synthétique ; déclencheur : route protégée appelée par n8n (ADR-001) ou étape du tic (annexe du 29/10) — à trancher ; compte de test dédié, données fictives |
| Sous Signature, une relance de devis réglée au niveau 3 part seule, s'annule 10 min et apparaît au journal | Tout le départ existe : type `relance_devis` (`regles.ts:33`, `:52`), exécutable sans session (`regles.ts:67`), file 10 min (`serveur.ts:68-79`), annulation (`serveur.ts:155`, `SectionPilote.tsx:100`), journal (`actions_auto` + `assistant_journal` par `confirmerAction`, `executeur.ts:208`), push (`serveur.ts:85-88`) | La carte de relance n'est créée QUE si l'artisan la demande dans une conversation sans lecture de tiers (`actions-serveur.ts:1382-1390`) ; aucun détecteur ; 0 ligne de réglage en production [S] | Détecteur « devis sans réponse » → `P.relancer_devis` version service (`actions-serveur.ts:855-866` sans session) → carte `confirmation` → `piloterCarte` (`serveur.ts:99`) → tic |
| Aucun geste §3.2 n'est automatisable ; aucun montant ne vient du modèle | Pilote : jamais auto + liste blanche + prix sourcés ; montants : `computeTotals`, `creerFacture`, simulation, garde des chiffres (`boucle.ts:291-309`, `cadrage.ts:275`), compta calculée par le code, textes de relance fixes | Règle « Tout auto » (prix non sourcé envoyé) ; « fait tout seul » sur encaissement / suppression / émission demandés par une phrase ambiguë ; escalade ; listes à la main | Porte de conformité unique (annexe 2 §4.6) appelée par le pilote, les règles et le « fait tout seul » ; tests : « un geste §3.2 réglé au niveau 3 ne part jamais » étendu aux règles et au « fait tout seul » |
| Deux membres d'une même organisation, droits différents ; deux organisations étanches | Isolation par compte ; rôles du fondateur (`lib/controle/droits.ts`) comme modèle de matrice | Tout : tables, invitations, fonction d'accès, politiques réécrites, écran d'équipe à comptes ; correction de la garde 0138 | Annexe 2 §3.3, après sauvegarde vérifiée et plan validé par Benj |
| Sauvegarde nocturne verte ; tests au lanceur verts et capables de rougir | `.github/workflows/sauvegarde.yml`, `scripts/sauvegarde.mjs` (chiffrement, `docs/sauvegardes.md`) ; lanceur | Workflow en échec depuis le 25/10 (quota GitHub, `ETAT-DES-LIEUX:30`) [S] ; liste de 34 tables écrite en dur (`sauvegarde.mjs:49-59`) ; aucune sauvegarde hors GitHub | Tâche planifiée hors GitHub Actions (n8n ou pg_cron sur Oracle, copie chiffrée hors du serveur) ; liste des tables dérivée du catalogue |

---

## 18. L'inventaire en 15 lignes (annexe 2 §9.1)

1. Route `app/api/assistant/route.ts` (180 l.) : garde l.66, 30 req/10 min et 200/jour (l.51, l.54), palier « pro » (l.111), outils d'action toujours donnés si 0157 est là (l.120, l.155), « fait tout seul » sans condition d'offre (l.128).
2. Boucle `lib/assistant/boucle.ts:116-312` : 8 appels (`cadrage.ts:16`), 45 s (`:18`), 12 actions par message (`outils-actions.ts:474`), journal avant résultat (l.247), garde des chiffres (l.291-309).
3. Outils : 21 lectures (`outils.ts:70-72` : 12 générales, 7 CRM, 2 brouillons) et 52 actions (`outils-actions.ts:58-459` : 32 directes, 20 à confirmer, 22 CRM) — pas 45.
4. Cartes `assistant_actions` (`0157:31`, 7 statuts `cartes.ts:15`, 24 h `cartes.ts:18`), confirmées une fois (`confirmation.ts:95`, `/api/assistant/actions`) ; journal `assistant_journal` (`0150:52`) sans texte libre (`journal.ts:7-10`).
5. Cadrage : mots d'action `cadrage.ts:78-117`, `faitToutSeul` l.160 exécuté `actions-serveur.ts:1365-1379` ; 7 questions de lecture sur 10 le déclenchent (sonde, annexe A).
6. Briefing pur `briefing.ts:44` (devis ≥ 7 j l.35, impayé urgent 30 j l.37), produit seulement à la demande (`executeurs.ts:255`) ; mémoire = historique signé de l'écran, 12 messages (`historique.ts:13-15`, `cadrage.ts:22`).
7. Pilote `lib/pilote/regles.ts` : 10 min (l.24), 20/jour (l.27), 24 h (l.29), 6 types (l.33), `OUTIL_TYPE` (l.50), 6 exécutables (l.67), jamais auto (l.70-73), `prixSources` (l.105), tiers lus (l.132) ; tables `pilote_reglages` et `actions_auto` (`0174:21-44`).
8. File remplie par `piloterCarte` seul appel `actions-serveur.ts:1390` et `piloterProposition` (`api/leads/route.ts:343`, `conversation/stream/route.ts:138`, `canaux/serveur.ts:186`) ; vidée par le tic (`agents/tic/route.ts:87-101`, pg_cron `0101:164`) ; aucun détecteur.
9. Offres `lib/plans.ts` : pas d'« entreprise » (l.14) ; Studio 59 €, 7 j, avec `assistant` (l.75, l.98, l.108) ; Signature 99 €, 21 j, ajoute `plateforme.ia.auto`/`relances.auto`/`factures.relances.auto` (l.80), `crm` (l.86), `assistant.pilote` (l.89) ; verrou `peut()` (l.134).
10. Réponse aux prospects : défaut « assistée » (`plateformeConfig.ts:45`), `modeEffectif` → `verrou_offre` sans `plateforme.ia.auto` (l.183-186) ; règle « Tout auto » envoie un devis sans contrôle des prix (`reglesServeur.ts:53-62`).
11. Drapeaux (57) : levés `assistant` (`flags.ts:161`), `crm` (:172), `relancesImpayes` (:179), `piloteAutomatique` (:243), `canauxTelegram` (:281) ; baissés `inventaireOcr` (:56), `canauxWhatsapp` (:70), `canauxReseaux` (:72) ; `consoleV2` seulement sur `refonte-1018`.
12. Relances : conversation J+2/5/10 (`relances.ts:23`, `cron/relances/route.ts:159-208`), impayés J+3/10/21 opt-in (0159, 0181, `relancesImpayesTour.ts:81`), CRM (`api/crm/relances/envoyer`), assistant (`actions-serveur.ts:855`, `:933`) — sans registre commun ; un seul passage, 08:00 UTC (`vercel.json:5`).
13. Tables : `devis`/`devis_lignes` (0002:36, :59), `factures`/`factures_lignes` (0006:10, :36), `relances` (0010:30), `materiaux`/`stock`/`mouvements_stock`/`listes_achat` (0040), `chantiers`/`chantier_equipe`/`equipe_membres` (0141:61, :87, :30), `commandes_fournisseur` (0158:29) ; dernière migration 0181 ; ni organisations, ni membres, ni événements, ni paiements.
14. Isolation : RLS `artisan_id` + garde de session (`0138:35-74`, ouverte à un non-artisan l.55-72) ; écritures de service filtrées (`assistant/magasin.ts:3-5`, `pilote/serveur.ts:1-5`) ; `rls-e2e` sur 14 tables (`tout-verifier.mjs:46`).
15. Canaux : e-mail au nom de l'artisan, Reply-To (`email.ts:6-11`, `:20`), Telegram de l'artisan seul canal pilotable (`canaux/regles.ts:42`), WhatsApp et réseaux baissés ; `lib/agents/telegram.ts` = pont du fondateur ; SMS, n8n, Hermes, Orca : zéro occurrence dans `lib/` et `app/`.

---

## Annexe A — La sonde (lecture seule)

Fichier : `C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7\scratchpad\c4\sonde-cadrage.mjs`
(importe `lib/assistant/cadrage.ts`, module pur ; aucun réseau, aucune base, aucune écriture). Commande, depuis la racine du dépôt :
`node --experimental-strip-types --no-warnings --import ./scripts/ts-loader.mjs <sonde>`. Sortie du 02/11/2026 :

```
{"question":"Quelles factures sont payées ?","actionDemandee":true,"actionAEffet":false,"faitToutSeulSansTiers":true}
{"question":"Est-ce que M. Martin a payé ?","actionDemandee":true,"actionAEffet":false,"faitToutSeulSansTiers":true}
{"question":"Quels devis dois-je relancer ?","actionDemandee":true,"actionAEffet":true,"faitToutSeulSansTiers":true}
{"question":"Le devis Dupont est-il signé ?","actionDemandee":true,"actionAEffet":false,"faitToutSeulSansTiers":true}
{"question":"Ai-je déjà relancé ce client ?","actionDemandee":true,"actionAEffet":true,"faitToutSeulSansTiers":true}
{"question":"Qu’est-ce que j’ai réglé ce mois-ci ?","actionDemandee":true,"actionAEffet":false,"faitToutSeulSansTiers":true}
{"question":"Combien de devis ai-je envoyés la semaine passée ?","actionDemandee":true,"actionAEffet":false,"faitToutSeulSansTiers":true}
{"question":"Quelles factures sont impayées ?","actionDemandee":false,"actionAEffet":false,"faitToutSeulSansTiers":false}
{"question":"Combien de devis ai-je ?","actionDemandee":false,"actionAEffet":false,"faitToutSeulSansTiers":false}
{"question":"Est-ce que j’ai assez de carrelage pour le chantier Dupont ?","actionDemandee":false,"actionAEffet":false,"faitToutSeulSansTiers":false}
```

Lecture : la sonde prouve le comportement du cadrage, pas ce que le modèle fera ensuite. Que le modèle exécute alors une relance ou un
encaissement est une déduction [D] (le prompt lui dit « FAIS-LA », `cadrage.ts:172-173`) : à prouver par un test hors ligne avec un
faux modèle, comme `scripts/assistant-qa.mjs` sait le faire.

## Annexe B — Travaux parallèles qui touchent ce périmètre [V]
- Worktree `C:/Users/benja/Documents/presti/.claude/worktrees/comptes-fournisseurs-0a934e`, branche `claude/comptes-fournisseurs-0a934e` :
  1 commit d'avance sur `main` (`47fb721a`, 29/10, badges « qui a besoin d'un compte ») et des fichiers NON commités, dont
  `lib/assistant/actions-serveur.ts` (3 lignes), `lib/assistant/outils-actions.ts` (2 lignes), `lib/recherche-fournisseurs.ts` (+70),
  `scripts/tout-verifier.mjs` (+2) et `supabase/migrations/0182_comptes_fournisseurs.sql`. Risque de conflit et de numéro de migration
  (0182) pour le chantier.
- Branche `refonte-1018` (37 commits d'avance, dernier `c9215381` du 19/10) : piste A « Instrument » de la console et drapeau
  `consoleV2`, « à retirer avant fusion » (`lib/flags.ts:188` de la branche).
