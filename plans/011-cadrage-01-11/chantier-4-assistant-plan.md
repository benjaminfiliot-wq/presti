# Chantier 4 — l'assistant de gestion agentique : le plan

Rédigé le 02/11/2026 vers 3 h, sur délégation de Benj (`memoire-presti/nuit-0211-delegation-c1-c4-c2.md` : « passe automatiquement au chantier de
l'assistant de gestion… avance le plus possible »). Ce document est un plan : il ne construit rien. Par délégation, les défauts du §5 s'appliquent
aux lots de la nuit. Restent à Benj : toute migration en production (« go » écrit), toute dépense (premier SMS réel), tout réglage de compte, toute
saisie de secret.

Sources lues en entier : `prompts-benj/p3-assistant.md` (P3, annexes 1 et 2), `p3-assistant-bloc-offres-corrige-0111.md` (OFF), les rapports
de la nuit (`…/scratchpad/c4/` : R1 existant, R2 annexes, R3 vidéos, R4 écran, R5 SMS), `CLAUDE.md`, `.claude/rules/*.md`, `cadrage-p3.md` (CP3).
Réseau neuronal : `nuit-0211-delegation-c1-c4-c2`, `chantiers-0111-etat-et-branchements`, ADR-007 (« proposée »), `Journal-Decisions` (01/11),
fil `inbox/sessions/2026-11-01-12h33-b6e06ae6-…`.

Conventions : `fichier:ligne` renvoie au commit HEAD `a51a12a8`, et « (arbre) » signale un fichier modifié cette nuit, non commité. Chaque
affirmation porte sa source.

## 0. Amendements du 02/11 au matin (décisions de Benj) — ils priment sur la suite du document

1. **Règle n8n-first** (message de Benj du 02/11, `.claude/rules/architecture-outils.md`) : toute logique métier récurrente se construit dans
   n8n, jamais dans le code de l'app, qui ne sert qu'à l'interface.
   - **Les détecteurs passent dans n8n.** Le module `lib/detecteurs/**` (L3), la route `POST /api/detecteurs/passage` et la clé
     `DETECTEURS_CLE` (L4) sont abandonnés. À leur place, un workflow `presti-detecteurs` sur le n8n d'Oracle (L3 n8n) : déclencheur à
     6 h 45, une requête SQL en lecture seule par détecteur, la mise en forme dans des nœuds Code, et un bilan agrégé par détecteur. En mode
     simulation, rien n'est écrit dans Supabase, rien n'est envoyé, aucun modèle n'est appelé. Le lot L8 fusionne avec ce lot.
     *Précisé le 02/11 midi (§0 bis), aligné sur la tâche `032-003`* : l'identifiant retenu étant l'API Supabase (point suivant), la
     « requête SQL » devient une lecture par table en GET HTTP (nœud HTTP Request), `select=` limité aux colonnes permises, par l'identifiant
     « Supabase account » ; le nœud Supabase ne sert qu'à `regles_automatisation` ; à défaut, données fictives épinglées (pin data) en
     attendant une vue par table (« go » de Benj). Jointures et règles vivent dans des nœuds Code. L8 garde la garde de la sauvegarde.
   - **L'accès à la base.** Le 02/11, Benj a créé dans n8n l'identifiant « Supabase account » (Supabase API) et a voulu qu'il ait
     **tous les droits** (« je veux qu'il ait tous les droits »). Les détecteurs n'y font que des lectures (point précédent) ; les futures
     automatisations qui écrivent passent par le même identifiant, toujours à blanc d'abord. Le rôle Postgres en lecture seule
     `n8n_lecture` (migration 0189, appliquée le 02/11) reste en base, inutilisé par n8n ; il se retire par la ligne de réversion de 0189
     si Benj le veut.
   - **Les cartes que l'artisan valide** restent dans l'interface (« À valider »). Un constat devient une carte quand n8n l'écrit dans la
     table prévue (0185, vague 2), après le « go » de Benj.
   - **Le niveau par offre** reste lu dans `lib/plans.ts` : une copie figée des capacités par offre accompagne le workflow, et une suite
     compare les deux.
   - **Exceptions justifiées.** S1 à S5 (§3) corrigent des failles dans des automatisations déjà codées et en production : le cron des
     relances, le pilote, les impayés, l'acceptation d'un devis. Ces correctifs ne font que restreindre. Ces chemins migrent un par un
     dans n8n (`migration-production.md`). Le registre des relances (S4) devra être lu par chacun de ces futurs workflows.
2. **Q-S5, acompte** : l'artisan d'une offre qui porte les règles choisit. La facture d'acompte part seule (par défaut, comme avant) ou elle
   est préparée et il l'émet d'un clic (maillon `acompte_seul`). Le verrou d'offre reste.
3. **Push de L1 et L2** accordé par Benj, une fois le typecheck, le build et l'audit verts.
4. **Landing (chantier 2)** : direction A avec le hero de B, au plus simple et sans friction, en suivant la structure du prompt 4.

## 0 bis. Ce que les vidéos changent (02/11 midi)

Sources : la synthèse C4 des 13 vidéos (27 exigences retenues, 8 écartées, 7 conflits) et sa critique de complétude (17 manques), du 02/11
(`…/scratchpad/videos-syntheses/`), relues contre `plans/analyse-videos.md` (cité « :ligne »), le §0, les prompts et le code. Lignes de code :
HEAD `372048ca`, identique à `a51a12a8` pour `app/`, `lib/` et `supabase/` ; « (arbre) » : modifié, non commité. Ici, « HEAD » désigne toujours
`372048ca` : le commit de L1 et L2 (`74db706a`, 02/11 à 15 h 08) a décalé des lignes depuis. Aucun montant n'est tiré des vidéos. Par
délégation de Benj, le défaut de chaque question s'applique, et la question reste listée pour lui (tableau en fin de section).
Le §0 prime sur tout ; ce §0 bis prime sur les §1 à §16 là où ils diffèrent.

**Les exigences retenues, par argent récupéré** (rang de la synthèse ; sources de `plans/analyse-videos.md` ; → lot du §14) :

1. **Impayé suivi jusqu'au paiement ou au motif** (:479, :535, :552). Une relance arrêtée par une réponse (`lib/relancesImpayesTour.ts:99`,
   arbre) revient en carte ; l'artisan range le motif d'un geste, le code n'en devine aucun. → L12 n8n (détecteur 11), L13 (`motif`, 0185).
2. **Mise en route avant toute automatisation** (:138, :291, :295, :689, :950, :957, :963, :967, :982). Frise de trois étapes, une question à la
   fois, import par la conversation, chaque écriture validée d'un geste ; « cinq questions au plus » vient de P3:581, pas des vidéos. → P1b, L14.
3. **Trois priorités chaque matin, l'argent qui dort d'abord** (:1386, :1442-1443). Un workflow n8n à heure fixe, qui propose, ne déclenche
   jamais le pilote et se tait un jour sans priorité. 6 h 45 et 7 h 30 sont des défauts du plan (§0.1, §5), pas de la vidéo. → L15 ; question 2.
4. **Une consigne sur plusieurs clients donne une seule carte de lot** (:137, :44, :169, :140) : retenus, exclus et leur motif, validée d'un
   geste. Le prix d'un ancien chantier reste un repère cité, jamais une ligne envoyée (:481, :496, :537). → L16 ; question 1.
5. **« Ne plus relancer ce client »** (:137 ; :128 et :71 parlent de prospection : retirées). Table `relances_exclusions` (0185), lue par n8n
   avant tout constat, et par le registre commun (S4) si Benj accepte l'exception B (question 10) ; une lecture en erreur refuse. → L6a, L13.
6. **Entretien proposé après le chantier, dans « À valider »** (:480, :536, :554), dès les détecteurs n8n et non en vague 2. On ne dit pas
   « contrat d'entretien » : le code ne propose qu'une date (`lib/apresChantier.ts:47-50`). → L12 n8n (détecteur 12), L18 ; questions 6 (a), 7.
7. **Ne rien reconstruire de l'infrastructure** (:587, :622, :640, :656-657). Les détecteurs vivent dans n8n ; la route à clé abandonnée au
   §0.1 est marquée comme telle partout ce midi (§1, §5 R4, §6, §9, §14, §15, §16 C1, traçabilité), sans effacer l'historique. → L3 n8n.
8. **Une proposition écartée ne revient pas** (:1284, :1290, :1336, :1354 ; dit, jamais montré, :1296). Les refus des 7 derniers jours entrent
   au contexte du tour (outil, objet, date) ; n8n saute une clé refusée ; chaque geste est retenu (P3:589). → L12 n8n, L16, P5 (0185).
9. **« Combien j'ai gagné ? » : la marge sur matériaux, estimée** (:1181, :1194, :1230). Jamais « bénéfice » ni le chiffre d'affaires du mois ;
   une question qui nomme un chantier mène aux chantiers, pas à `lire_chiffres` (`lib/assistant/cadrage.ts:54`). → L21 (A7).
10. **Aucune relance ne présume l'accord, ne culpabilise ni n'invente une urgence** (:494, :554, :65). On suit la règle de ton du vault
    (« Relances - prospection et produit », §2 ; source `mails.md` §4) contre la vidéo : tournures interdites testées hors ligne sur les textes
    par défaut, puis sur ceux de n8n. → L13.
11. **Suivi des artisans : 48 premières heures, J+14, J+30** (:143, :38, :46, :205, :255, :294). Chaque message naît d'un événement réel lu en
    base, sinon rien ; le premier contact passe par « Découvrir » (§7). Ce sont des clients de Presti : chantier 4, non 3. → L14, L17 ; question 4.
12. **Un geste, une compétence écrite**, source de la consigne et du workflow (:588, :623, :638, :658-659 ; :139). Avancé de P8 à P2 pour deux
    gestes (relancer un impayé, proposer l'entretien) ; cerveaux écrits par Claude Code, jamais par Hermes. → L13, L18, L21 (profil métier).
13. **L'assistant connaît Presti** (:575, :661, :665, :344, :353, :429). Lecture `lire_aide`, adossée à `chercher()` (`lib/aide.ts:1211`) ; une
    question sans réponse est comptée par thème, jamais son texte. → L21 (A10).
14. **Offre Entreprise : un workflow sur mesure ne fait que préparer** (:292, :1489-1490). Il écrit des opportunités (0185) dans la même boîte
    « À valider ». La source dit « avant exécution par n8n » (:292) : le niveau 3 est la question 9. → L20, après un contrat signé.
15. **Offre Entreprise : mise en place pas à pas, après le contrat** (:56, :73, :218, :271, :295, :482, :588, :817). Une brique d'entrée sur devis,
    une fiche de cadrage, des « moteurs » prouvés en simulation ; les procédures du client sont des données de son compte (0183), jamais le vault. → L20.
16. **Demande de démo rangée et suivie** (:116, :39-40, :129, :267, :1443 ; :117 ; :355) : table `demandes_demo` et `presti-demande-demo`,
    au bloc « Volet démo Entreprise » plus bas. → L19.
17. **Démo Entreprise en deux rendez-vous annoncés** (:40-42, :57, :166, :203, :208, :220, :232, :351, :366, :377, :400, :1484-1485 ; exclus :
    :65-69, :374-375). Trame écrite pour Benj ; la fiche de diagnostic se range avec la demande, jamais dans le vault. → tâche `SaaS/…`, L19.
18. **Chaque SMS de l'artisan porte STOP ; jamais de SMS pour prospecter** (:1499-1500, :1567 ; P3:574 ; ADR-007). Opposition écrite dans
    `sms_oppositions` (0186) ; un SMS sans STOP est refusé avant l'envoi. → L7 ; chemin et forme du STOP : question 3.
19. **Une seule question, seulement si une donnée bloque** (:689, :740, :696, :758, :428, :383, :1532). Cas « demande floue » écrits au harnais
    dès maintenant, sans dépense. C'est une lecture proposée (R3 §7, T1), pas une décision de Benj : question 8. → L21 (A1).
20. **Sous chaque réponse : ce qui vient d'être fait, l'avancement, le solde de crédits** (:680, :689, :738-739, :741, :761), tous calculés par
    le code (`libelleOutil`, `app/assistant/page.tsx:278`). → L5 (avec `app/assistant/page.tsx` et `PanneauAssistant.tsx`), P7 (étapes du devis).
21. **« À valider » en colonnes Repéré, Préparé, À valider** (:862, :905, :923). « Partira dans N min » en Signature, N lu dans
    `DELAI_ANNULATION_MIN` (`lib/pilote/regles.ts:24`) ; « Vérifié : … » limité aux contrôles réellement passés, jamais un nom d'outil. → L5, P5.
22. **Ni tuile à zéro, ni « tout est à jour » quand une source est en panne** (:1083, :1144-1145, :1380, :1442, :1459). Un zéro devient une phrase
    et un bouton ; la pastille « 3 priorités du jour → » ouvre « À valider ». → L5.
23. **Aucune marque ni nom de modèle chez l'artisan** (:1379, :1387, :1403). Claude, Anthropic, Opus, Sonnet, Haiku, GPT, OpenAI et Supabase
    rejoignent les mots interdits (§7), hors de la mention RGPD (`app/assistant/page.tsx:248`) et de `/confidentialite`. → L5 ; question 5.
24. **Le client Entreprise voit l'état de ses automatisations** (:197, :345, :683 ; aucun portail payant, :372). Section « Vos automatisations »,
    derrière le drapeau des organisations ; chaque workflow écrit le bilan agrégé de son passage. → L20.
25. **L'assistant à côté de ce que l'artisan regarde** (:680, :756). `PanneauAssistant` (contexte `{ type, id }`) réutilisé sur les devis, les
    factures, les messages et le stock ; verrou `peut(plan, 'assistant')`. → L5, ou plus tard.
26. **Chaque workflow alerte Benj s'il échoue** (:144, :32). Branche d'erreur vers `#presti-auto` et le Telegram du fondateur, plus un Error
    Trigger commun ; `n8n-specs-qa` rougit sans elle. → L12 n8n, puis chaque lot n8n.
27. **Le bureau de l'atelier 3D montre les chiffres du jour** (:959, :1018, :1028, :1031), tirés des calculs du tableau du CRM
    (`app/crm/Tableau.tsx:22`, `:28`), jamais à zéro. → L5 (petit lot).

**Deux omissions de la synthèse** (critique 13) :
- **Devis en étapes validées une à une** (:427, :354, :1532). Il revient sans délai ni fourchette : l'IA n'en invente aucun (§13 ; P3:553).
  Étapes posées côté serveur : client, lignes, prix sourcés, mentions, prêt à valider. → P7 (A3), avec le rang 20.
- **Espace client simple des clients de l'artisan** (avancement, documents, :293) : question 11.

**Écartées** (une ligne chacune) :
- Relances rédigées selon le contexte du client : la source ne le dit pas (:142, :82). La rédaction par le modèle (P3:585) se traite hors vidéos.
- Organisations, « chacun voit et valide ce qui le concerne » : la source ne le dit pas (:292). La matrice des rôles est au §10.
- Catalogue Entreprise qui croise plusieurs outils et relance la pièce manquante : la source ne le dit pas (:291-292) ; rien avant un client (:73).
- Récapitulatif hebdomadaire du travail fait : la source ne le dit pas (:866, :873). Le besoin vient du prompt (P3:588) : à traiter hors vidéos.
- Détails Entreprise des seules transcriptions (options A et B, fourchette, haute saison) : seules :218, :271 et :375 tiennent (rang 15).
- Acompte, situation et impayés calculés par le code : déjà au plan (§9, n° 1 à 3 ; §0.2 ; §13).
- Double chemin et validation avant chaque action : déjà au plan (§16 B1, B2 ; L10). La source du top 20 n° 15 (:1531) est fausse : :589, :639.
- Calendrier fiscal : hors périmètre (§5 ; P3:553 ; « de A à Z » interdit, :1084). Un « rappel de date seulement » (:1121) si Benj le veut.

**Règles communes à tout workflow n8n du chantier** (critique 1, 6 et 9 ; rang 26) :
- **Mention d'IA, en marque blanche** (critique 1). Tout e-mail rédigé par le modèle et envoyé au nom d'un artisan, sans sa relecture, porte
  la mention, comme l'app aujourd'hui (`lib/mentionAssistant.ts:13`) : « Message rédigé et envoyé automatiquement par l'assistant de {artisan} »
  (l.14-17 ; règlement (UE) 2024/1689, art. 50 : l.5-7). Un rappel d'impayé porte `PIED_AUTOMATIQUE` (`lib/relancesImpayes.ts:55`). Un texte
  fixe ne la porte pas : l'accusé de réception n'en a pas (`app/api/leads/route.ts:402`). Appels à reproduire :
  `app/api/cron/relances/route.ts:189` (HEAD ; l'arbre bouge encore), `lib/envoisServeur.ts:58` et `:76` (l.70 et l.88 arbre),
  `app/api/leads/route.ts:483`. Jamais « Presti » dans la mention ; un message relu et validé par l'artisan ne la porte pas
  (`lib/mentionAssistant.ts:9`). Visés, une fois dans n8n : relances, réponse seule, pilote, workflows sur mesure Entreprise, pour leurs
  textes rédigés par le modèle (la mention) ; impayés (`PIED_AUTOMATIQUE`). Un message de Presti (confirmation de démo, suivi des artisans,
  alerte à Benj) ne la porte jamais : il n'est écrit au nom d'aucun artisan. `presti-apres-chantier` ne fait que poser des rappels
  (`lib/apresChantier.ts:8-9`) ; s'il envoie un jour, ses textes fixes portent `PIED_APRES` (`lib/apresChantier.ts:51`), jamais la mention.
  La synthèse écrivait « n8n : sans objet » au rang 10 : c'était faux. Chaque nœud d'envoi déclare son pied : la mention (texte rédigé par
  le modèle et envoyé au nom d'un artisan sans sa relecture), `PIED_AUTOMATIQUE` (rappel d'impayé), `PIED_APRES` (après-chantier) ou rien
  (texte fixe, message de Presti) ; `n8n-specs-qa` contrôle chaque nœud d'envoi contre son pied déclaré, et rougit sur un nœud qui n'en
  déclare aucun ou qui porte un autre pied que le sien.
- **Ce que n8n lit** (critique 6). Des identifiants, des dates, des montants et des statuts ; jamais un nom, une adresse, un e-mail ni un texte de
  client : la carte renvoie à l'objet, que l'écran lit sous la RLS. Pour l'impayé arrêté, n8n lit `relances_impayes_arrets` (0159:59-66) et la
  facture, jamais `messages`. Seule exception : un workflow qui envoie lit, au moment d'envoyer, ce que son message exige (adresse et nom du
  destinataire). Le nœud Supabase de n8n rend toutes les colonnes, sans option pour les choisir (définition lue le 02/11 par le MCP
  `n8n-oracle`) : la limite passe par une lecture GET avec `select=` (nœud HTTP Request, même identifiant, si n8n le permet), sinon par une
  vue par table (migration, « go » de Benj). `n8n-specs-qa` tient la liste des colonnes permises par table. Données sur le n8n d'Oracle
  seulement, jamais sur le n8n cloud (`architecture-outils.md`), jamais vers un modèle gratuit (`securite.md`). Registre : une section
  « Lectures de n8n sur le serveur Oracle » dans `docs/registre-traitements.md`, avant la publication du premier workflow qui lit des données
  d'artisans (P3:570). `032-003` (faite par claude-code, verdict PASS le 02/11 à 16 h 13 : `.orchestre/fait/032-003.md`) suit cette règle
  depuis sa réécriture du 02/11 à 13 h 50 (`032-003.md:42-47`) : lectures en GET HTTP, `select=` limité aux colonnes permises, identifiant
  « Supabase account » ; nœud Supabase seulement pour `regles_automatisation` ; à défaut, données fictives épinglées (pin data) en attendant
  une vue par table (« go » de Benj).
- **Mise en service.** Livré inactif (`active: false`), essayé à blanc sur des données fictives (pin data), avec sa branche d'erreur ; publié
  sur le « go » de Benj, après sa simulation s'il écrit ou s'il envoie (`securite.md`). Aucun secret dans un export.
- **Chiffres** (critique 9, transposée). Aucun texte d'un workflow (briefing, suivi des artisans, confirmation de démo) ne porte un chiffre
  qu'aucune suite ne mesure : ni « en moins d'une minute » (sa preuve, `plans/promesses.md:8`, rejoue `pilotage-e2e`, qui ne mesure aucune
  durée), ni « sous 24 h » sans l'accord de Benj (`app/contact/Formulaire.tsx:30`), ni un gain promis. Les comptes viennent du code.

**Automatisations codées à migrer dans n8n, une par une** (`migration-production.md` : workflow créé, simulation, comparaison à l'ancien,
ancien code coupé, drapeau vérifié). La liste du §0.1 (« Exceptions justifiées ») est complétée ici (critique 5) :

| Chemin codé, en production | Où | Workflow prévu | À noter |
|---|---|---|---|
| Relances de conversation J+2, J+5, J+10 | `app/api/cron/relances/route.ts` (cron Vercel de 8 h), `lib/relances.ts:23` | `presti-relances` | mention d'IA ; registre S4 et exclusions |
| Relances d'impayés J+3, J+10, J+21 | `lib/relancesImpayes.ts:31`, `lib/relancesImpayesTour.ts` (même cron) | `presti-relances-impayes` | `PIED_AUTOMATIQUE` ; arrêt sur réponse |
| Pilote : envoi seul après 10 min | `lib/pilote`, tic pg_cron `0101:164` | selon la question 9 | ses gardes (§13) se reprennent telles quelles |
| Acompte à l'acceptation d'un devis | `app/api/conversation/devis/route.ts:93-99` (S5) | à nommer | le choix Q-S5 de l'artisan (§0.2) |
| Après-chantier : pose des rappels | `tourApresChantier`, `app/api/cron/relances/route.ts:24`, `:293` (HEAD) | `presti-apres-chantier` | rang 6 ; drapeau `crmApresChantier` (`lib/flags.ts:199`) |
| **Ajout** : accusé de réception au prospect, au nom de l'artisan | `app/api/leads/route.ts:393-399` | à nommer | n8n tire et ne reçoit rien (:1443) : l'accusé attendrait le passage suivant, à mesurer au pas 3 avant toute bascule |
| **Ajout** : avis à l'artisan d'une nouvelle demande | `app/api/leads/route.ts:386` | à nommer | même délai à mesurer |
| **Ajout** : réponse instantanée qui part sans relecture | `app/api/leads/route.ts:473-483` | à nommer | même délai, sur la promesse centrale : aucune bascule sans mesure |
| Avis à Benj d'une demande de démo | `notifierEntreprise`, `app/api/contact/route.ts:56` | `presti-demande-demo` | rang 16 |
| Le reste du cron de 8 h (purges, expirations, alertes, courriers, compta, rappels du matin) et les pg_cron | `app/api/cron/relances/route.ts:354` (HEAD) | — | suivent `migration-production.md`, hors de ce plan |

**Volet « démo Entreprise » : un propriétaire par couche** (partage fixé le 02/11 midi par la session principale ; critique 2 et 7) :
- **Chantier 2, l'interface** : la page (défaut du prompt : `/contact` au motif « entreprise », `p4-landing.md:291` ; `/entreprise` si Benj
  la choisit) et son formulaire ; la route `/api/contact` ne change pas au chantier 2. Champs, repris du plan du chantier 2 : prénom et e-mail,
  obligatoires (choix du plan, au plus simple) ; taille de l'équipe et activité (:267) ; message facultatif. Le formulaire envoie aussi motif,
  taille et activité en champs séparés, que la route actuelle ignore (elle ne lit que `societe`, `nom`, `email` et `message` :
  `app/api/contact/route.ts:37-44`). « Outils en place » n'entre pas au formulaire : on en parle au premier échange, et la fiche de cadrage
  le détaille après la signature (:295 ; rang 15, §12.1).
- **Chantier 4, les données et l'automatisation** : la table `demandes_demo` (motif, taille, activité, prénom, e-mail, message, état, date du
  rendez-vous, fiche de diagnostic du rang 17 ; sous RLS, clé de service seule, sans IP ; migration au « go » écrit de Benj), le workflow
  `presti-demande-demo`, la liste des demandes dans `/controle` et la migration de `notifierEntreprise` (`app/api/contact/route.ts:56`) en
  cinq pas. L19 ajoute à `/api/contact` l'écriture dans `demandes_demo`, une fois la migration posée ; d'ici là, l'e-mail actuel reste.
  Jamais dans la file des prospects de `MaquetteForm` (`app/api/prospects/entrant/route.ts:80`) : aucun demandeur n'entre dans une séquence
  automatique.
- **Le texte « Ce qui se passe ensuite »**, écrit ici une fois, repris mot pour mot par la page (chantier 2) et par l'e-mail de confirmation
  (chantier 4) :

  > **Ce qui se passe ensuite**
  > 1. Un premier échange : nous vous posons quelques questions sur votre équipe, vos outils et les tâches qui vous prennent du temps.
  > 2. Un second rendez-vous : une démonstration sur vos propres cas, puis une proposition sur devis.
  > 3. Vous décidez librement.

  Sources : :116 (questions, démonstration, prix, décision libre) ; :351, :366, :377 (deux rendez-vous ; ne jamais faire croire que le premier
  suffit). Aucun délai tant que Benj ne le tient pas (`p4-landing.md:124`).
- **`presti-demande-demo`** (n8n d'Oracle, qui tire et ne reçoit rien, :1443), livré inactif. Il lit les nouvelles demandes à intervalle
  court ; le prénom et l'e-mail, seulement au moment d'envoyer, jamais le message (« Ce que n8n lit »). Il alerte Benj sur `#presti-auto` et
  Telegram (activité, taille, lien vers `/controle`, sans coordonnées) et le relance tant que la demande n'est pas marquée « traitée » dans
  `/controle` (L19). Il envoie la confirmation (le texte ci-dessus, une vraie capture de Presti, jamais un faux cas, :117), puis un seul
  rappel la veille du rendez-vous fixé par Benj, arrêté par une annulation (:39, :129), et plus aucun au troisième report (:355).
  Textes validés par Benj avant l'activation (envoi sortant, `securite.md`) ; canal : question 4 ; jamais de SMS (P3:574). Benj lit dans
  `/controle` le message et l'adresse que l'e-mail actuel lui donne (`app/api/contact/route.ts:56-59`) : cet e-mail n'est coupé qu'une fois
  cette liste en ligne.
- **« Vos données », sans aucune marque** (critique 2) : « La base de données et les photos sont hébergées dans l'Union européenne », mot
  pour mot, toujours suivie du lien vers `/confidentialite`. La source ne situe dans l'Union que la base et les photos
  (`app/confidentialite/page.tsx:59`) ; l'application et trois prestataires sont aux États-Unis, sous clauses types (l.60-63, `:65`).
  Jamais « Supabase » ni « eu-central-1 » sur une page publique hors des pages légales (`p4-landing.md:49`, `:297`). Ligne reprise mot pour
  mot par le chantier 2.

**Règle du vert, une seule** (fixée le 02/11 midi par la session principale, sur la charte qui réserve le vert #38CD8C à « validé »,
`p4-landing.md:232`, `:281` ; critique 15). Le vert ne marque qu'un état « validé » ou « payé ». Une étape de la mise en route validée d'un
geste de l'artisan est un « validé » : coche verte (jeton `--ok` de la console, #38CD8C, `.claude/skills/presti-design/SKILL.md:54`) ; l'étape
en cours est corail ; une étape seulement lue n'est jamais verte. Dans la frise de la landing, seule l'étape « tu valides » est verte
(chantier 2) ; le vert propre à la landing (`--ok:#46C89A`, même fichier, l.70) est une question du chantier 2. La règle s'écrit dans
`presti-design` (tâche 5 ci-dessous).

**Tâches du chantier 4 à déposer plus tard** (critique 16 : la synthèse les renvoyait au chantier 1, approuvé par Benj le 02/11 vers 12 h 30,
Journal-Decisions) ; périmètre `SaaS/…` sauf mention :
1. ADR-008, « Conséquences » : « identifiant Postgres en lecture seule à créer par Benj » (l.57) devient l'identifiant « Supabase account »,
   tous droits, créé par Benj le 02/11 (§0.1 ; Journal-Decisions du 02/11 au matin) ; la liste des automatisations déjà codées (l.58) gagne
   l'accusé de réception, l'avis à l'artisan et la réponse qui part seule (`app/api/leads/route.ts:393-399`, `:386`, `:473-483`) ; renvoi
   aux exceptions A et B une fois tranchées.
2. Journal-Decisions : les exceptions A et B, seulement si Benj les accepte (questions 9 et 10).
3. Note de playbook « Démo Presti pour l'entreprise » (rang 17), lue par Benj avant chaque appel.
4. Notes « Geste - … » (`10 Presti/01 Produit/`) : le champ `workflow` rempli dès que son workflow existe (rang 12).
5. Hors du vault : la règle du vert dans `.claude/skills/presti-design/SKILL.md` ; la section n8n de `docs/registre-traitements.md`.

**Questions à Benj, défaut appliqué** (les 7 conflits de la synthèse, la tension T1, puis trois points de la critique) :

| # | Question | Défaut appliqué | S'il dit autre chose |
|---|---|---|---|
| 1 | Un ordre groupé en conversation (« Relance les devis envoyés il y a plus de 5 jours », P3:160 ; dans la vidéo : « relance les devis non signés depuis 30 jours », :137) part-il seul, comme le « fait tout seul » du 29/10 (§3 S1), ou donne-t-il une carte de lot (:137, :44) ? (rang 4) | Plusieurs clients : une carte de lot, avec ses exclus. Un objet seul garde le « fait tout seul » | « Part seul » : le lot part sans revue, les exclus restent filtrés par le code. « Toujours une carte » : le choix du 29/10 est défait davantage |
| 2 | Comment le briefing du matin arrive-t-il (P3:587 : notification de l'app, e-mail si l'artisan le veut) ? Le n8n d'Oracle ne reçoit rien, le push vit dans l'app (`lib/push.ts`), l'ADR-008 range toute notification dans n8n (rang 3) | (a) n8n écrit le point du jour dans une table (migration, « go ») que l'accueil affiche, plus un e-mail si l'artisan le veut. Pas de push pour l'instant | (b) une route d'envoi à clé : rouvre ce que le §0.1 a abandonné, exception à écrire. (c) n8n envoie le push lui-même : Benj pose les clés VAPID dans n8n |
| 3 | SMS (rang 18) : qui envoie, et quelle forme de STOP ? L'ADR-007 écrit « les envois passeront par n8n » ; le §11 envoie depuis `lib/sms/envoyer.ts` | Envoi : `presti-sms-envoi` lit la file `sms_envois` (0186) ; `lib/sms` garde l'encodage, le lien `sms:` de l'étape 0 et l'estimation à blanc. STOP : le code du fournisseur ; le SMS passe alors en « marketing », sous la plage stricte (un rendez-vous du lundi se rappelle le samedi : R5 §6, point 3). Tout reste à blanc tant que le coût n'est pas approuvé | Envoi par `lib/sms/envoyer.ts` : exception à écrire. STOP par un lien `/stop/<jeton>` (critique 12) : il contredit la porte 5 « pas de lien » du §11, suppose un domaine neutre (`NEXT_PUBLIC_DOMAINE_NEUTRE`, `lib/urls.ts:10`) et n'est jamais sur `prestiapp.fr` (R5 §6, point 3) |
| 4 | Par quel canal partent les e-mails de Presti à ses artisans (`presti-suivi-artisan`) et aux demandeurs de démo (`presti-demande-demo`) ? Brevo gratuit partage ses 300 envois par jour avec la prospection (`email-brevo.md`) ; Resend porte déjà les e-mails du produit (§5 R5) (rangs 11, 16) | Resend appelé par n8n, hors du quota de la prospection ; la clé, posée par Benj dans n8n ; chaque texte validé par Benj avant l'activation (`securite.md`) | Brevo : ces envois prennent sur le quota de la prospection, file du lendemain au plafond |
| 5 | Le fil d'Ariane de `/assistant` dit « assistant IA (Claude, Anthropic) » (`app/assistant/page.tsx:180`), hors de la mention de transparence (l.248, posée le 13/10, `plans/016-assistant.md` §10). Le garder ? (rang 23) | La mention de la l.248 reste ; le fil d'Ariane ne change pas avant la réponse | Retiré : `accueil-qa` ajoute ce fil à la liste des marques interdites |
| 6 | Décisions d'argent, aucun montant tiré des vidéos : (a) contrat ou abonnement d'entretien (:480) ; (b) source de prix « vos derniers chantiers » (:537) ; (c) recharge payante des crédits, ou crédits Entreprise fixés au contrat au lieu de 600 (§12 ; :741) ; (d) forme du prix Entreprise : mise en place puis abonnement, ou contrat annuel (:786) ; (e) seuil d'alerte de marge par chantier (:1231) ; (f) garantie conditionnée à des actions du client (:219, :256 ; relevée par la critique) | (a) la proposition de date qui existe (`lib/apresChantier.ts:47-50`) ; (b) non ; (c) rien ne change ; (d) sur devis, structure fixée par Benj ; (e) aucun détecteur de marge ; (f) aucune garantie ajoutée | Chaque « oui » ouvre un lot d'argent de la session principale (`lib/plans.ts`), jamais un prix estimé envoyé seul (`lib/plans.ts:207`). (b) resterait un repère, refusé par `prixSources` pour tout envoi seul |
| 7 | L'après-chantier en Studio ? Le chantier « terminé » vient du CRM, réservé à Signature (`lib/plans.ts:86`) (rang 6) | Signature seulement | Un autre déclencheur pour Studio : un devis accepté qui nomme un équipement à entretenir (détecteur neuf) |
| 8 | Tension T1, qui n'est pas une décision de Benj (critique 11). La vidéo veut des questions avant le devis (:428) ; le 14/10, Benj veut « un agent qui agit », « pas un outil à questions » (Journal-Decisions, 2026-10-14) ; le prompt dit « Demander une information manquante » (P3:167) (rang 19) | Lecture proposée (R3 §7, T1) : une seule question, seulement quand une donnée bloque ; sinon un brouillon tout de suite ; mesurée au harnais | « Jamais de question » : un brouillon avec ses champs « à compléter ». « Des questions avant chaque devis » : revient sur le 14/10 |
| 9 | n8n-first, offre Entreprise (critique 3) : au niveau 3, qui envoie une action d'un workflow sur mesure ? La source dit « avant exécution par n8n » (:292) ; le pilote est codé dans l'app (`lib/pilote`, tic `0101:164`), et l'ADR-008 le range parmi les chemins à migrer (rang 14) | Niveau 2 seulement : la carte validée d'un geste s'exécute par l'interface. Pas de niveau 3 sur mesure tant que n8n n'envoie pas seul, après avoir lu dans Supabase que l'action est validée, ou programmée et non annulée, avec les gardes du pilote | Le pilote codé envoie au niveau 3 : exception A inscrite au Journal-Decisions ; le premier contrat peut ouvrir le niveau 3 plus tôt |
| 10 | n8n-first, « Ne plus relancer ce client » (critique 4) : fonction neuve, lue par les chemins de relance codés, alors que l'ADR-008 réserve l'exception S1 à S5 aux correctifs de sécurité (rang 5) | Exception B proposée et justifiée ici (ADR-008, l.46). Elle n'entre au Journal-Decisions qu'avec l'accord de Benj. D'ici là, L13 se prépare à blanc, aucun chemin codé n'est touché, et « Ne plus relancer » reste caché derrière un drapeau baissé | Il accepte B : elle entre au Journal-Decisions, et L13 branche l'exclusion sur les chemins codés par le registre commun (S4). Il la refuse : seuls les workflows n8n lisent l'exclusion, chemin par chemin, après chaque migration |
| 11 | Un espace client pour les clients de l'artisan (avancement, documents, :293 ; omis par la synthèse, critique 13) ? Le lien de suivi existe : avancement par pièce, jamais un prix ni un document (0167, `crmSuivi` levé, `lib/flags.ts:211` ; registre, §17) | Rien de neuf : le lien de suivi reste tel quel ; les documents partent par e-mail, au nom de l'artisan | Les documents rejoignent le lien de suivi : lot d'interface en marque blanche (jamais « Presti »), §17 du registre réécrit (il exclut les prix), migration au « go » |

**Exceptions à n8n-first proposées pour le Journal-Decisions.** L'ADR-008 veut qu'une exception soit « écrite dans la réponse et dans
[[Journal-Decisions]] » ; elles n'y sont pas écrites ici et attendent la réponse de Benj (tâche 2 ci-dessus) :
- **A** (question 9, seulement si Benj choisit le pilote) : « Exception à n8n-first (ADR-008), offre Entreprise, niveau 3. Une action d'un
  workflow sur mesure, programmée puis non annulée en 10 minutes, est envoyée par le pilote de l'app (`lib/pilote`, tic pg_cron `0101:164`).
  Raison : ce pilote, déjà en production, porte seul les gardes (gestes jamais automatiques, prix sourcés, escalade relue, registre des
  relances, plafonds) ; les écrire une seconde fois dans n8n doublerait la règle de sûreté. Le workflow n8n ne fait que préparer. Fin de
  l'exception : la migration du pilote dans n8n, en cinq pas. »
- **B** (question 10) : « Exception à n8n-first (ADR-008), « Ne plus relancer ce client ». Une table `relances_exclusions` (0185, au « go » de
  Benj) et un bouton de l'interface ; chaque chemin de relance déjà codé en production lit l'exclusion par le registre commun
  (`historiqueRelances`, S4) et refuse l'envoi, y compris quand la lecture échoue. Raison : c'est une fonction neuve, pas un correctif de
  sécurité, mais elle ne fait que restreindre ; sans elle, un client exclu serait encore relancé par ces chemins jusqu'à leur migration.
  Chaque workflow n8n de relance la lit dès sa création. Fin de l'exception : la migration du dernier chemin codé. »

## 1. Résumé de compréhension

1. Presti est en production. Son assistant agit déjà : 21 lectures, 52 actions, cartes, journal, et un pilote qui laisse 10 min pour annuler, à
   20 envois par jour au plus. Il n'a pourtant jamais rien fait seul : aucun détecteur ne remplit sa file, et tout est à activer (R1 §0, R2 C4).
2. Benj veut trois niveaux d'autonomie, réglés par type d'action (P3:540-548), répartis sur trois offres. Studio prépare, Signature envoie seul,
   et Entreprise reprend le moteur de Signature avec des organisations, un CRM et des automatisations n8n sur mesure (OFF:21-36).
3. On ne rase rien. Les détecteurs vivent dans un workflow n8n, `presti-detecteurs`, qui lit lui-même les tables existantes par l'identifiant
   « Supabase account » (§0.1). La route à clé dédiée d'abord prévue (ADR-001, P3:565) est abandonnée le 02/11 (n8n-first, voir §0.1).
   Supabase reste la source et la file, et Hermes reste derrière.
4. Avant toute nouveauté, cinq brèches de la liste §3.2 se ferment en production (§3).
5. Phase 0 : la sauvegarde ne couvre que 34 tables sur environ 92, et elle ne tourne plus depuis le 25/10 ; restent aussi la boîte e-mail et les tâches (§4).
6. Les organisations multi-membres se font maintenant, par migrations additives coupables d'un interrupteur. Préalables : corriger la garde 0138,
   prouver la sauvegarde, obtenir le « go » de Benj (§10).
7. SMS : un adaptateur indépendant du fournisseur, Sweego par défaut (0,040 € HT), qui reste à blanc tant que Benj n'a pas approuvé le coût (§11).
8. L'accueil de la console devient l'assistant : piste A, avec le drapeau `consoleV2` porté sur `main` et baissé (§7).
9. Cette nuit, tout reste derrière un drapeau baissé. Les migrations sont préparées et testées, jamais appliquées. Aucun secret, aucune dépense,
   aucun compte créé.
10. Le code calcule tous les montants, et aucune donnée n'est inventée. Les tests se jouent hors ligne, prouvent qu'ils peuvent rougir et entrent
    au lanceur `scripts/tout-verifier.mjs`.

## 2. L'existant en 15 lignes (R1 §18, revérifié)

1. Route `app/api/assistant/route.ts` (180 l.) : garde à la l.66 ; outils d'action toujours donnés (l.155). Le « fait tout seul » ne teste
   aucune offre (`autonome: () => faitToutSeul(cadrage, etatTour)`, l.128).
2. Boucle `lib/assistant/boucle.ts` : 8 appels (`cadrage.ts:16`) en 45 s (`:18`), journal avant le résultat (l.247), garde des chiffres (l.291-309).
3. 21 lectures (`outils.ts:70-72`) et 52 actions, dont 20 à confirmer (`outils-actions.ts:58-459`, `ACTIONS_CONFIRMEES` l.468), et non 45.
4. Cartes `assistant_actions` (`0157:31-51`) : `conversation_id` et `tour` obligatoires (l.34-35), valables 24 h (`cartes.ts:18`). Journal
   `assistant_journal` (`0150:52`), sans texte libre.
5. Cadrage : `actionDemandee` (`cadrage.ts:146`) choisit le mode, et `faitToutSeul` (l.160-162) est exécuté par `proposee`
   (`actions-serveur.ts:1365-1379`). Sept questions de lecture sur dix le déclenchent (sonde de R1, annexe A).
6. Briefing pur (`briefing.ts:44`) : un devis sans réponse ressort à 7 jours (l.35), un impayé devient urgent à 30 jours (l.37). Il n'est
   calculé que si on le demande.
7. Pilote `lib/pilote/regles.ts` : 10 min (l.24), 20 par jour (l.27), 24 h (l.29), 6 types (l.33), 6 outils exécutables (l.67), jamais
   automatiques (l.70-73), `prixSources` (l.105), tiers lus (l.132). Tables `pilote_reglages` et `actions_auto` (`0174:21-44`).
8. File remplie seulement par `piloterCarte` (`actions-serveur.ts:1390`) et `piloterProposition` (3 appels), vidée par le tic (`0101:164`).
   Aucun détecteur.
9. `lib/plans.ts` : `PlanId` sans « entreprise » (l.14). Studio à 59 € avec `assistant` (l.75, l.98). Signature à 99 € (l.99) ajoute
   `plateforme.ia.auto`, `relances.auto`, `factures.relances.auto` (l.80), `crm` (l.86) et `assistant.pilote` (l.89). Essais de 7 et 21 jours
   (l.108). Verrou `peut()` (l.134).
10. Réponse aux demandes : « assistée » par défaut (`plateformeConfig.ts:45`), `verrou_offre` sans `plateforme.ia.auto` (l.183-186). Mots
    d'escalade par défaut : urgence, fuite, dégât des eaux, inondation, gaz, assurance (l.56).
11. Drapeaux (57) : `assistant` (l.161), `crm` (l.172), `relancesImpayes` (l.179) et `piloteAutomatique` (l.243) levés ; `inventaireOcr` (l.56),
    `canauxWhatsapp` (l.70) et `canauxReseaux` (l.72) baissés ; `ESSAI = {}` (l.323) ; `consoleV2` n'existe que sur `refonte-1018`.
12. Relances sans registre commun : conversation J+2/5/10 (`relances.ts:23`) ; impayés J+3/10/21, sur activation (`relancesImpayes.ts:31`, `:36`) ;
    CRM (`app/api/crm/relances/envoyer/route.ts`) ; assistant (`actions-serveur.ts:855`, `:933`).
13. Tables : `devis` (0002:36), `factures` (0006:10), `relances` (0010:30), stock (0040), CRM (0141), `commandes_fournisseur` (0158:29). Dernière
    migration : 0181. Ni organisations, ni événements, ni paiements, ni SMS.
14. Isolation : RLS par `artisan_id` et garde `jeton_session_valide()` (`0138:35-74`), qui laisse passer un utilisateur sans ligne `artisans`
    (CTE l.44-47, l.55-56, l.66). `rls-e2e` couvre 14 tables (`tout-verifier.mjs:46`).
15. E-mail au nom de l'artisan (`email.ts:6-11`) ; seul Telegram est pilotable (`canaux/regles.ts:42`). Aucune occurrence de SMS, n8n, Hermes
    ni Orca dans `lib/` ou `app/`. La sauvegarde couvre 34 tables (`scripts/sauvegarde.mjs:49-59`).

## 3. Sécurité d'abord : cinq brèches à fermer en production

**État à l'heure de la rédaction (02/11 vers 3 h).** S1, S2 et S3 sont en cours dans l'arbre, non commités (`lib/assistant/{cadrage,actions-serveur}.ts`,
`lib/pilote/{regles,file,executeur}.ts`, `lib/reglesServeur.ts`) ; leur suite annoncée, `scripts/securite-assistant-0211-qa.mjs`, n'existe pas encore.
S4 et S5 ne sont pas commencées. Le lot L1 (§14) reprend cet arbre tel quel, sans le refaire.

**S1 — Le « fait tout seul » exécute des gestes §3.2, et il part sur une simple question.**
- Constat : `faitToutSeul = actionDemandee && !contenuTiersLu` (`cadrage.ts:160-162`), et `actionDemandee` se lève sur « paye », « regle »,
  « signe » ou « relanc » (`MOTS_ACTION`, l.98-115). `proposee` exécute alors toute action à confirmer, y compris encaissement, émission,
  suppression et lot de prix (`actions-serveur.ts:1362-1379`).
- Correctif, défaut retenu (en cours dans l'arbre) : `estQuestion(message)` (« ? » final, ou mot interrogatif en tête après un salut) remplit le champ
  `question`, et `faitToutSeul` exige `question === false` ; devant une question, la consigne dit « réponds d'abord, rien ne s'exécute d'office ».
  `proposee` ignore `autonome()` pour un geste de `OUTILS_JAMAIS_AUTO` (`jamaisAutomatique`, `raisonJamaisAuto`), liste commune au pilote et à
  l'assistant, qui gagne `creer_facture_libre` et `supprimer_article`. Reste à faire : la suite de tests, et une règle de plus. Un ordre `envoyer_devis` dont une
  ligne n'est pas sourcée devient une carte (`prixSources`, promesse de `lib/plans.ts:207`).
- Effet : un ordre garde le « fait tout seul » du 29/10 (devis, relance, envoi, stock). Encaisser, émettre une facture, supprimer ou changer les prix
  en lot donne une carte préremplie, validée d'un clic. Cela vaut aussi pour deux essais de Benj du 01/11 : la facture sans devis, et la hausse de
  5 % des tarifs de pose (fil `2026-11-01-12h33`). Le choix du 29/10 est donc défait en partie (R1 du §5).
- Test qui doit rougir (`securite-assistant-0211-qa.mjs`) :
  - les 10 questions de la sonde rendent `faitToutSeul` faux ; 10 ordres, et « oui » après « Voulez-vous que je… ? », le rendent vrai ;
  - avec `autonome()` vrai, chaque outil de `OUTILS_JAMAIS_AUTO` donne une carte `en_attente`, et un espion prouve que son réalisateur n'est
    jamais appelé ; `relancer_devis`, demandé par un ordre, s'exécute bien ;
  - tout nom de `SPEC` en `supprimer_*`, `marquer_facture_payee`, `creer_facture*` ou `augmenter_tarifs` est dans la liste, et hors de `OUTILS_EXECUTABLES_PILOTE` ;
  - mutations : `question === false` retiré, `!jamaisSeul` retiré, un nom ôté de la liste. `assistant-qa.mjs` (309 vérifications) doit rester vert.

**S2 — La règle « Tout auto » envoie un devis aux prix estimés.**
- Constat : avant `statut: 'envoye'`, seules les mentions légales sont contrôlées (`reglesServeur.ts:53-62`). Or le chiffrage écrit
  `source_prix: "estimation"` pour un prix du marché (`lib/ai.ts:986-997`), un devis que le pilote refuserait (`lib/pilote/regles.ts:154`).
- Correctif (en cours dans l'arbre) : relire les lignes du devis créé (`lignesDuDevis`, `lib/pilote/serveur.ts:58-66`) et exiger `prixSources`. Sinon, le
  devis reste en brouillon, et la notification dit « une ligne a un prix estimé ». Les tests remplacent `DependancesRegles`.
- Test (même suite) : rien ne part avec une ligne estimée, à 0 €, sans provenance ou illisible ; tout sourcé, avec les mentions, part.
  Mutation : retirer la condition `prixNonSource`.

**S3 — Le pilote ne relit pas l'escalade au moment d'envoyer.**
- Constat : l'état de la conversation n'est relu que pour `reponse_prospect` (`file.ts:90-96`), et seulement la prise en main, la limite et
  l'horaire (`executeur.ts:184-193`). La liste par défaut n'a ni litige, ni avocat, ni menace, ni sinistre (`plateformeConfig.ts:56`).
- Correctif (en cours dans l'arbre) : `MOTS_ESCALADE_TOUJOURS` et `sujetEscalade` (`regles.ts`). Pour toute ligne rattachée à une conversation,
  `escalade(l, leadId)` relit les 10 derniers messages entrants : conversation de la carte, du devis, ou du devis de la facture
  (`conversationDeLaCarte`, `executeur.ts`). Un mot trouvé renvoie la ligne à la main (motif `escalade`) ; une lecture impossible vaut un échec.
- Le plancher de l'arbre compte aussi « fuite », « urgence », « gaz » et « assurance ». C'est le côté sûr pour un envoi sans humain, mais un
  plombier en Signature verra ses réponses « fuite » revenir à la main. Le lexique par métier (Q9 de CP3) viendra en vague 2. Limite : une réponse
  arrivée dans la boîte de l'artisan (Reply-To) n'est pas lue par Presti.
- Test (`scripts/pilote-qa.mjs`, lanceur l.157) : « avocat » renvoie la relance à la main sans appeler `executer` ; « litige » aussi, même avec
  `escalade_mots: []`. Une lecture qui lève donne un échec ; sans mot, la ligne part. Mutation : l'appel retiré.

**S4 — Quatre chemins de relance, aucun registre commun (à faire).**
- Constat : l'anti-doublon de l'assistant et du pilote ne lit que `assistant_actions` (`actions-serveur.ts:861`, `:941` ; `executeur.ts:62-65`),
  et une lecture en erreur y vaut « jamais relancé » (`.catch(() => null)`). Les trois autres chemins écrivent ailleurs : le CRM dans
  `crm_rappels.envoye_le` (`app/api/crm/relances/envoyer/route.ts:56-63`), les impayés dans `relances_impayes` (0159), la conversation dans
  `messages.type = 'relance'` (`app/api/cron/relances/route.ts:209-214`).
- Correctif, dans `lib/relancesRegistre.ts` :
  - `historiqueRelances(artisanId, { type, id })` lit les quatre traces, plus les cartes en attente du même objet. Une erreur de lecture refuse
    (fail-closed) ; une table absente est ignorée, et c'est signalé. La fonction pure `relanceRecente(historique, maintenant, RELANCE_DELAI_JOURS)`
    tranche, à 3 jours (`actions-serveur.ts:63`).
  - Elle est appelée avant chaque envoi : `P.relancer_devis`, `P.relancer_facture`, `dejaRelance` du pilote, la route du CRM, `decider` des impayés
    (`relancesImpayes.ts:192`, raison `deja_relancee_ailleurs`). Aussi la relance de conversation d'un lead qui porte un devis
    (`cron/relances/route.ts:159-208`) : elle reste due et repart le lendemain.
- Test (`scripts/relances-registre-qa.mjs`) : pour chacune des 6 paires de chemins, la seconde relance est refusée dans les 3 jours, permise
  au-delà. Une lecture en erreur refuse. Le source prouve que les 6 appelants passent par `historiqueRelances(`. Mutations : un appel ôté, `<`
  devenu `<=`. `relances-impayes-qa.mjs` gagne le cas `deja_relancee_ailleurs`.

**S5 — L'acompte est émis seul à l'acceptation, sans verrou d'offre (trouvée en vérifiant, à faire).**
- Constat : `acompteApresAcceptation` (`reglesServeur.ts:80-83`) lit la règle sans tester l'offre ; `creerFacture` émet et scelle alors la facture
  d'acompte (`app/api/conversation/devis/route.ts:93-99`). La règle s'écrit depuis le navigateur (`reglesServeur.ts:29-31`) : un compte Studio
  l'obtient. Or émettre une facture ne se fait jamais seul (`cadrage-p3.md:221`).
- Correctif : (a) cette nuit, le verrou de `declencherRegles` (`peut(plan, 'plateforme.regles')`, `reglesServeur.ts:33`) ; (b) défaut par délégation,
  l'acompte est préparé, pas émis : la notification dit « facture d'acompte de N % à émettre d'un clic », avec le lien vers le devis (bouton
  « Facturer », `app/devis/[id]/page.tsx:249`). Les phrases des préréglages sont réécrites (`lib/regles.ts:51`, `:56`, `:89`). Question Q-S5 au §5.
- Test (même suite) : avec « Tout auto », Studio n'a aucun acompte ; Signature n'émet aucune facture et reçoit une notification. Mutation qui doit rougir.

**Mise en production de L1.**
- La session principale passe `npm run typecheck`, `npm run build` et les suites hors ligne, une à une ; un sous-agent distinct audite
  (`presti-audit-attaque`, lecture seule). Commit des seuls fichiers du lot, puis push si la délégation le couvre (le lot ne fait que restreindre),
  sinon au réveil. Ensuite `attendre-deploiement.mjs` et `deploiement-etat.mjs`. Retour arrière : `git revert`, sans migration.
- Pas de vérification en direct cette nuit : il faudrait créer un compte, ce qui est exclu. Le rejeu `--live` revient à Benj (Q13).

## 4. Phase 0 — le socle

**4.1 Sauvegarde.**
- Constat : la liste figée couvre 34 tables (`scripts/sauvegarde.mjs:49-59`) sur environ 92 (`cadrage-p3.md:108`). Il y manque `assistant_actions`,
  `actions_auto`, le CRM et les impayés. GitHub Actions échoue depuis le 25/10 (quota, `.github/workflows/sauvegarde.yml:17-18`). La dernière archive
  locale date du 05/09 (`sauvegardes/2026-09-05T13-34-08-905Z.presti`), et `pg_dump` ne marche plus : le mot de passe est désaligné depuis le 14/09.
- Cette nuit, sans secret ni dépense (lot L9) :
  1. `sauvegarde.mjs` découvre les tables par la définition OpenAPI de PostgREST ; `EXCLUES` donne la raison de chaque table écartée, comme `HORS_LANCEUR` ;
     la restauration suit l'ordre des clés étrangères ; le tout est testé hors ligne par `scripts/sauvegarde-qa.mjs` ;
  2. un passage réel par la session principale, `node scripts/sauvegarde.mjs --dossier D:/presti-travail/sauvegardes/base`, puis `--verifier`.
     L'archive est chiffrée par `cle-sauvegarde.pub.pem`, et seule la clé privée la relit ;
  3. le workflow n8n `presti-sauvegarde` (3 h 40, 14 jours gardés), qui lance `sauvegarde.mjs` sur Oracle par le nœud SSH de ce n8n, avec
     une clé réservée à cette commande (le nœud SSH y figure, « Execute Command » non : recherche du 02/11 par le MCP `n8n-oracle` ; l'unité
     systemd de `cadrage-p3.md:112-113` est abandonnée, n8n-first), et le brief d'un chien de garde n8n. À 4 h, il vérifie l'archive, sa
     taille et son manifeste ; sinon, il alerte `#presti-auto` et le Telegram du fondateur.
- Attend Benj : poser la clé de service sur Oracle et publier `presti-sauvegarde` (avec sa clé SSH, posée dans n8n et sur Oracle), ou remettre
  à jour le mot de passe Postgres (Q1) ; ouvrir une fois la clé privée (`coffre-presti`) pour l'aller-retour ; lire le compteur d'Actions.
- Preuve exigée avant toute migration (`cadrage-p3.md:117`) : toutes les tables dans l'archive du jour, avec des comptes égaux ; aller-retour
  vert ; un compte fictif restauré dans un Postgres jetable ; l'alerte déclenchée une fois.

**4.2 Boîte e-mail.**
- Constat : le passage de 8 h UTC voit une « boîte non configurée » et se déclare pourtant réussi (`cron/relances/route.ts:341-353`). Les variables
  `IMAP_*` sont absentes (`cadrage-p3.md:69`), et la table `canaux` des artisans est vide (l.70).
- Cette nuit, rien ne change. Benj crée un mot de passe d'application Gmail et le range par `node scripts/ranger-env.mjs`. Ensuite seulement,
  « non configurée » deviendra un échec en production (3 lignes, `route.ts:345-353`, vague 2).

**4.3 Tâches et coût.**
- Constat : 14 tâches Claude sont actives ; les tâches Windows de l'écosystème sont coupées depuis le 11/10 (`cadrage-p3.md:74-75`) ; six tâches sont
  en pause depuis le 01/11, et l'injection du réseau neuronal est réparée (`chantiers-0111-etat-et-branchements`). Cette nuit : un inventaire en
  lecture seule, et aucune tâche relancée (la prospection relève du chantier 3). Le brief n8n de L8 spécifie le battement : plus de 26 h sans signe déclenche une alerte.
- Coût : aucun détecteur ne rédige de texte cette nuit. Les 1 547 € annoncés restent à vérifier dans la console (`cadrage-p3.md:121`).

## 5. Questions bloquantes : les défauts appliqués cette nuit

| Question | Défaut appliqué par délégation (tout se défait) |
|---|---|
| Fournisseur de SMS (P3:621) | Sweego, 0,040 € HT, pack de 20 €, plusieurs expéditeurs par API (R5 §3-4). Brevo en second, sur un compte distinct de la prospection. Aucun compte créé, aucun envoi réel. |
| SMS au niveau 3 (ADR-007 contre `cadrage-p3.md:219`) | Niveau 2 pour toutes les offres en v1. Le niveau 3 s'ouvre sous Signature après deux semaines réelles sans incident. |
| Notification du briefing (P3:621, Q7) | Notification de l'app (push levés, `flags.ts:26`, `:29`), à 7 h 30 heure de Paris, e-mail en option. Le type `briefing` est à créer (`lib/notificationsTypes.ts:5`). Revu le 02/11 midi : workflow n8n `presti-briefing-matin` ; voie de livraison, question 2 du §0 bis (défaut : affiché à l'accueil, e-mail en option, sans push). |
| Contenu de l'offre Entreprise (OFF:21-36) | L'autonomie de Signature, plus organisations, CRM et automatisations n8n sur mesure par contrat. Prix sur devis, aucun Stripe en libre-service, bouton « Demander une démo » (chantier 2). |
| « `plateforme.ia.auto` à partir de Studio » (OFF:12) | Le code ne change pas (`plans.ts:63`, `:80`). La ligne vient de l'ancien `CLAUDE.md` (OFF:40-44). |
| R1 : « fait tout seul » et gestes §3.2 | §3, S1 : une carte préremplie, validée d'un clic, jamais déclenchée par une question. Défait en partie le choix du 29/10. |
| R2 : l'offre Entreprise dans le code | `PlanId` `entreprise` = SIGNATURE + `organisation.membres`, sans prix Stripe ni essai (§12). |
| R3 : Hermes dans le produit ? | Il reste derrière : il orchestre les tâches de Benj, jamais une réponse à un artisan (marque blanche, PC à 8 Go, crédit partagé, `architecture-outils.md`). |
| R4 : où vivent les détecteurs | En code pur, testés et sous RLS ; n8n Oracle les déclenche par une route à clé (abandonné le 02/11 : n8n-first, voir §0.1). Aujourd'hui : dans le workflow n8n `presti-detecteurs`, en lectures seules. Le tic garde le pilote pendant la transition. |
| R5 : volume d'e-mails | Plafond de la plateforme : 80 par jour (`email.ts:88-94`), à mesurer d'abord. Clients sur Resend, prospection sur Brevo. Toute hausse est une dépense : décision de Benj. |
| R6 : adresse d'expédition | `contact@prestiapp.fr` par défaut (`email.ts:18-20`). Benj vérifie `EMAIL_EXPEDITEUR_ARTISAN` en production. |
| R7 : tout automatique par défaut ? | Les détecteurs proposent et préparent, pour tous. En Signature, les relances de devis et d'impayés passent au niveau 3 à la fin de la mise en route, coupables d'un geste. Rien n'est activé cette nuit. |
| R8 : détecteur 5 sans donnée | Colonne `factures.envoyee_le` (0187, préparée). Le détecteur reste coupé d'ici là. |
| R9 : détecteur 7 | Le verrou reste : un devis né d'une demande ne dépasse jamais le niveau 2 (`regles.ts:132`). |
| R10 : détecteurs CRM en Studio | Une variante sans chantier : « devis accepté sans facture de solde ». |
| R11 : « systèmes n8n inclus » sur la grille | Non, pas avant un workflow métier prouvé (`plans.ts:5-7`). |
| R12 : clé d'idempotence | (artisan, type, objet, étape), et non « jour » (P3:597 contre `cadrage-p3.md:379`). |
| Q-S5 : acompte de la règle à l'acceptation | Préparé et notifié, émis d'un clic (§3, S5). Benj peut rétablir l'émission seule en Signature. |
| Calendrier fiscal (vidéo yova2n, R3 C6) | Hors périmètre : rien vers l'URSSAF ni les impôts (P3:553). |
| CP3, Q1 à Q14 | Défauts du cadrage gardés (`cadrage-p3.md:144-157`), sauf Q10, que remplacent R3 et R4 (ADR-001). |

## 6. L'architecture, posée sur l'existant (en corail : ce qui s'ajoute ; en gris pointillé : abandonné le 02/11, §0.1)

```mermaid
flowchart LR
  classDef existe fill:#2b2b2b,stroke:#888,color:#eee;
  classDef ajout fill:#D97757,stroke:#7a3a22,color:#000;
  classDef humain fill:#1f4d3a,stroke:#6c6,color:#eee;
  classDef derriere fill:#3a3a3a,stroke:#e66,color:#fff,stroke-dasharray:5 5;
  classDef abandon fill:#1a1a1a,stroke:#666,color:#888,stroke-dasharray:3 3;
  ART["Artisan · console et mobile"]:::humain
  CLI["Client de l'artisan"]:::humain
  subgraph VC["Presti sur Vercel"]
    ACC["Accueil « Aujourd'hui »<br/>consoleV2 baissé"]:::ajout
    ASS["Assistant /api/assistant<br/>21 lectures · 52 actions"]:::existe
    PORTE["Porte : question ≠ ordre<br/>gestes §3.2 = carte · prix sourcés"]:::ajout
    BOITE["À valider : cartes, réponses,<br/>relances d'impayés, devis préparés"]:::existe
    PIL["Pilote actions_auto<br/>10 min · 20 par jour · liste fermée"]:::existe
    ESC["Escalade relue au départ"]:::ajout
    REG["Registre des relances<br/>4 chemins · 3 jours"]:::ajout
    ENV["Envois partagés<br/>envoisServeur · email.ts"]:::existe
    ROUTE["POST /api/detecteurs/passage, clé dédiée<br/>abandonné le 02/11 · n8n-first · §0.1"]:::abandon
    DET["lib/detecteurs : 10 règles pures<br/>abandonné le 02/11 · n8n-first · §0.1"]:::abandon
    SMS["lib/sms : envoyerSms à blanc<br/>smsClients baissé"]:::ajout
  end
  subgraph SB["Supabase · source de vérité et file"]
    TAB["Tables métier · RLS artisan_id<br/>garde 0138"]:::existe
    TIC["pg_cron : tic minute"]:::existe
    MIG["0183 à 0188 préparées, non appliquées<br/>organisations · opportunités · SMS"]:::ajout
  end
  subgraph OR["Oracle · Docker"]
    N8N["n8n : presti-detecteurs à 6 h 45<br/>lectures GET, colonnes limitées · simulation<br/>garde de la sauvegarde à 4 h"]:::ajout
    SAV["Sauvegarde chiffrée<br/>toutes les tables"]:::ajout
  end
  HER["Hermes + Orca<br/>outils de Benj, jamais devant un artisan"]:::derriere
  ART --> ACC --> ASS --> PORTE
  PORTE --> BOITE --> ART
  PORTE --> PIL
  TIC --> PIL --> ESC --> REG --> ENV --> CLI
  BOITE --> REG
  N8N -->|lectures seules · Supabase account| TAB
  N8N -.->|abandonné le 02/11 : Bearer DETECTEURS_CLE| ROUTE -.-> DET
  ASS --> TAB
  SAV --> TAB
  N8N -.->|vérifie| SAV
  N8N -.->|vague 2 : opportunités, après le go| MIG
  SMS -.->|vague 2 : journal des envois| MIG
  HER -.->|tâches de Benj| N8N
```

- n8n déclenche et lit lui-même Supabase ; Presti ne l'appelle jamais (`cadrage-p3.md:153`). *Réécrit le 02/11 midi* : « n8n ne voit que des
  agrégats » n'était plus vrai depuis qu'il lit les tables (§0.1). Il ne doit lire que des identifiants, des dates, des montants et des statuts,
  jamais un nom, une adresse, un e-mail ni un texte de client (limite à poser, §9) ; seul un workflow qui envoie lit, au moment d'envoyer, l'adresse et le nom de
  son destinataire (§0 bis, « Ce que n8n lit »). Ces données restent sur le n8n d'Oracle (P3:570), jamais sur le n8n cloud, et s'inscrivent
  au registre des traitements. Supabase porte la vérité et les files (P3:564).
- Les dix « agents » du prompt deviennent des familles d'outils et de détecteurs de l'assistant (P3:568) : l'artisan ne voit qu'un assistant. La
  mémoire tient dans des tables et la recherche plein texte, sans pgvector (P3:569), et aucune dépendance n'est ajoutée (Q11). Le tic garde le
  pilote ; chaque automatisation passera dans n8n une à une, en cinq pas (`migration-production.md`).

## 7. L'interface : mobile d'abord, piste A « Instrument » (R4)

```text
/dashboard « Aujourd'hui »   (drapeau consoleV2 ; menu de la coque v2 : Aujourd'hui · Clients · Atelier · Ma présence · Pilotage)
├─ 1 Bonjour <nom> · « 3 à valider · 1 part seul dans 7 min · 4 faites pour vous »        (chiffres en mono)
├─ 2 Demander à l'assistant → feuille plein écran au téléphone ; ligne « fait » sous chaque réponse ; solde de crédits
├─ 3 Le point du jour : 3 priorités calculées par le code (0 appel au modèle, 0 crédit) · « Tout le point du jour » replié
├─ 4 À valider, l'argent d'abord : réponses préparées · relances d'impayés · cartes de l'assistant · devis préparés (Relire)
├─ 5 Part tout seul (Signature) : « Partira dans 7 min » + règle graduée + Annuler · Tout arrêter · onglet Fait pour vous
├─ 6 Vos chiffres du mois (capacité chiffres) : 4 tuiles et 6 barres
├─ 7 Ce que l'assistant fait seul : un réglage par type d'action (Je valide | Part seul après 10 min)
├─ 8 Découvrir (textes selon l'offre)       └─ 9 Votre lien de contact [Copier]
Barre du bas au téléphone : Aujourd'hui · Messages · Devis · Factures · Plus
```

- **Données** (R4 §6.1) : la section 4 réunit quatre sources sans en réécrire aucune. Ce sont les cartes (`POST /api/assistant/actions`), les
  réponses (`POST /api/messages`), les relances `a_valider` (0181) et les devis préparés (`lib/devisAuto.ts:80-82`). La section 5 lit
  `/api/pilote/file` et `/api/pilote/reglages`. La section 3 vient de `composerBriefing` (`briefing.ts:44`), sans nom d'outil ni `a_savoir`.
- **Route** : `GET /api/aujourdhui` de la branche, étendue à une réponse par section, chacune avec son état (`ok`, `indisponible`, `hors offre`). Une
  panne n'efface pas tout l'écran, et ne s'affiche jamais en zéros (`refonte-1018:app/api/aujourdhui/route.ts:59-62`).
- **Mobile d'abord** : base de 390 px, cibles d'au moins 44 px, un seul bouton principal (la première carte, sinon « + Devis »). Conversation en
  feuille, sans effet de verre ; mouvement réduit respecté ; 5 lignes par liste au téléphone.
- **Vocabulaire** : jamais agent, workflow, n8n, MCP, prompt, LLM, détecteur, opportunité, file, modèle, Hermes ni Orca. On écrit « Partira dans 7 min »,
  jamais « Envoyé, annulable » (`lib/pilote/regles.ts:172-177`). 02/11 midi : ni marque ni nom de modèle, hors de la mention RGPD (§0 bis, rang 23).
- **Drapeau `consoleV2`** (R4 §10) : porté sur `main` et baissé, sans les commits temporaires `3abfb98a` et `dedfd033`. Il s'ouvre ensuite en essai au
  compte fondateur et au compte de démonstration (`lib/essais.ts:7`), une fois `scripts/assistant-qa.mjs:1018` adapté. Les drapeaux déjà levés
  gardent leur rôle à l'intérieur. À sa levée, l'arrivée après connexion passe de `/outils` (`app/login/page.tsx:34`, `lib/suiteSure.ts:5`) à `/dashboard`.
- **Plus tard** : la colonne « Repéré », les boutons Modifier, Plus tard et « Ne plus me proposer », et la validation par lot arrivent avec les
  opportunités (0185, P5). Pas de trombone avant l'import par la conversation.

## 8. Modèle de données

**8.1 Le prompt face à l'existant** (`cadrage-p3.md:257-279`, revérifié). `artisan_id` reste la clé de rattachement (P3:559), les identifiants
restent en français (`CLAUDE.md`), et aucun `organization_id` n'entre dans une table existante.

| Tables du prompt | Dans Presti | Ce qu'on fait |
|---|---|---|
| `users`, `organizations`, `memberships` | `auth.users`, `artisans` | `utilisateurs`, `organisations`, `membres`, `invitations` (0183) |
| `clients`, `leads`, `devis(_lignes)`, `factures(_lignes)`, `fournisseurs`, `chantiers` | 0002, 0010, 0006, 0048, 0141 | rien |
| `produits`, `inventaire`, `mouvements_inventaire`, `commandes(_lignes)`, `taches` | `materiaux`, `stock`, `mouvements_stock`, `prix_artisan`, `commandes_fournisseur`, `chantier_taches`, `crm_rappels` | rien |
| `conversations`, `messages`, `relances` | `leads`, `messages`, `relances`, `relances_impayes*` | un registre en code (S4) |
| `paiements` | seulement `factures.payee_le` (0140:18) | une table, après les organisations (Q12, argent) |
| `documents` | `chantier_pieces` et le stockage | le classement viendra plus tard |
| `agent_runs`, `tool_calls`, `agent_actions`, `human_approvals` | `assistant_journal`, `passages_cron`, `assistant_actions`, `actions_auto` | `passages_detecteurs`, `opportunites`, `opportunites_decisions` (0185) ; `acteur_id` (M5) |
| `automation_rules`, `permissions`, `subscription_plans` | `regles_automatisation` ; rien ; `lib/plans.ts` | `detecteurs_reglages`, `autonomie_reglages` (0185) ; `droits_roles` (0183) ; offre `entreprise` (§12) |
| `errors`, `audit_log`, `metrics_daily` | `app_errors` ; `assistant_journal` et `crm_journal` ; rien | `metriques_automatisation_jour` (P8) |
| (neuf) événements, envois de SMS | rien | `evenements_metier` (0185) ; `sms_envois`, `sms_oppositions`, `sms_expediteurs` (0186) |

**8.2 Les migrations à préparer.** Le numéro 0182 est réservé par le worktree `comptes-fournisseurs-0a934e` (R1, annexe B). Chaque table neuve a la
RLS dès sa création, sa garde de session et ses droits `anon` retirés. On y écrit par fonction ou par la clé de service, et ses colonnes ont des
noms français (`cree_le`, `maj_le`, `acteur_id`).
- **0183_organisations** (M1) :
  - `organisations` (id = `artisans.id`), et `membres` : rôle titulaire, associé, administratif, compagnon ou invité ; statut invité, actif ou retiré ;
    `equipe_membre_id` vers `equipe_membres` ; unique par (organisation, utilisateur).
  - `invitations` (empreinte du jeton, 7 jours au plus, usage unique), et `utilisateurs` (id = `auth.uid`, `sessions_invalides_avant`,
    `connexion_verifiee_le`).
  - `droits_roles`, remplie par la matrice de R2 §5.5, et les fonctions `comptes_accessibles`, `peut_acceder`, `role_de`. L'interrupteur
    `organisations_ouvertes` va dans `ops.interrupteurs` (`0096_ops_socle.sql:237-243`) : faux par défaut, posé par un fondateur seulement
    (`0097:313-352`). Chaque artisan reçoit une organisation, dont il est le titulaire.
- **0184_garde_session_membres** (M2) : de nouveaux corps pour `jeton_session_valide()` et `compte_non_suspendu()` (§10). Les corps de 0138 sont
  recopiés en tête, pour le retour arrière.
- **0185_automatisation** : `evenements_metier` (unique par (artisan_id, cle), faits sans texte libre) ; `detecteurs_reglages` et `autonomie_reglages`
  (niveau 1 à 3, plafond par jour, `pose_par`), `pilote_reglages` restant en place ; `opportunites_decisions` et `passages_detecteurs`. `opportunites`
  suit le cycle de `cadrage-p3.md:230-251`, avec `montant_centimes` calculé par le code, `expire_le` et un lien vers la carte ou la ligne de
  pilote ; un index unique partiel sur (artisan_id, cle) la garde unique tant qu'elle est ouverte.
- **02/11 midi** (§0 bis) : 0185 gagne `relances_exclusions` (rang 5) et une colonne `motif` sur `relances_impayes_arrets` (0159, rang 1) ;
  la table `demandes_demo` (rang 16) et la migration de `crm_reglages` (rang 2) se préparent à part. Toutes attendent le « go » écrit de Benj.
- **0186_sms_clients** : `sms_envois` (clé unique, état, segments, coût HT, source du tarif), `sms_oppositions`, `sms_expediteurs`,
  `clients.tel_source` et `tel_source_le`, et l'interrupteur `sms_arret`.
- **0187_factures_envoyee_le** : la colonne qui manque au détecteur 5.
- **0188_garde_session_rejouee** (M6) : la boucle idempotente de 0138 (l.99-119), rejouée pour que chaque table à RLS ait ses quatre gardes.

**8.3 Comment elles sont préparées.**
- En tête de chaque fichier : « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj », et le retour arrière écrit.
- Le jumeau `_A_COLLER_sql_editor_018N_NU.sql` est fabriqué par `scripts/sql-nu.mjs` et vérifié par `migrations-jumelles-e2e.mjs` (lanceur l.30).
- Les tests sont au §10. La session principale seule fait l'essai à sec, par un bloc `do … raise exception` (`scripts/lib/sql-essai.mjs`) :
  rien ne reste, et les verrous ne durent que quelques millisecondes.
- Application : au connecteur, lot par lot, après un « go » écrit (Q2), le jumeau restant le repli. On colle la migration, PUIS on lève le drapeau.
  Rien de ce qui part cette nuit n'en a besoin.

## 9. Les 10 premiers détecteurs, classés par argent récupéré (R2 §4), et deux de plus (02/11 midi)

L'ordre est estimé : aucun compte réel n'est assez rempli pour le mesurer (EDL:22), et la simulation le recalculera. La priorité suit P3:584 :
d'abord l'argent qui dort, puis les clients qui attendent. Tous passent par le nouveau drapeau `detecteurs`. Le niveau 3 exige en plus le drapeau
`piloteAutomatique` et la capacité `assistant.pilote` (`plans.ts:89`).

| # | Détecteur | Déclencheur (colonnes réelles) | Proposition (outil existant) | Studio · Signature · Entreprise | Drapeaux en plus |
|---|---|---|---|---|---|
| 1 | Facture échue à J+3, J+10, J+21 | `factures.statut='emise'`, `date_echeance` (0006:17, :19), `payee_le` vide (0140:18) ; règle `decider` (`relancesImpayes.ts:192`) | `relancer_facture` (`outils-actions.ts:141`), textes fixes | 1-2 (`a_valider`, 0181) · 3 (`relance_impaye`) · comme Signature | `relancesImpayes` |
| 2 | Chantier terminé sans facture de solde | `chantiers.statut='termine'`, `etape='a_facturer'` (`crm/alertes.ts:51-60`) ; en Studio, devis `accepte` sans facture `standard` ni `solde` (0176:44) | carte `creer_facture` de type `solde` (`outils-actions.ts:110-121`) | 1-2 partout (jamais émise seule) | `crm`, `facturesSituation` |
| 3 | Devis signé sans facture d'acompte | `devis.statut='accepte'` (0002:42), `accepte_le` (0033:4), `acompte_pct > 0` (0002:46), aucune facture `acompte` liée (0006:13, 0176:44) | carte `creer_facture` de type `acompte` | 1-2 partout | `facturesSituation` |
| 4 | Devis envoyé sans réponse à J+3, J+7, J+14 | `statut='envoye'`, `envoye_le` (0055:35), encore valable (`validite_jours`, 0002:44) ; registre S4 | `relancer_devis` (`outils-actions.ts:104`) | 1-2 · 3 (`relance_devis`) · comme Signature | — |
| 5 | Facture émise jamais envoyée | aucune donnée : l'envoi n'écrit rien (`envoisPdfServeur.ts:101-138`) | `envoyer_facture` (`outils-actions.ts:340`) | coupé jusqu'à 0187 | — |
| 6 | Demande restée sans réponse | `leads.statut='nouveau'` (0010:10) depuis trop longtemps, dans les horaires (`plateformeConfig.ts:137`) | réponse préparée, puis `valider_reponse_proposee` (`piloterProposition`) | 1-2 (`verrou_offre`) · 3 en mode « auto » · comme Signature | — |
| 7 | Demande qualifiée : brouillon de devis sur ses tarifs | lead sans devis (`devis.lead_id`, 0033:3), `qualifyLead` déterministe (`lib/ai.ts:290-294`), `prix_artisan` (0038:8) | `creer_devis` en brouillon, puis carte `envoyer_devis` | 2 au plus partout (tiers lu, `regles.ts:132`) | — |
| 8 | Devis bientôt expiré | `envoye_le` + `validite_jours` − X jours (`devisDepasse`, `devisExpiration.ts:19`) | `relancer_devis` (texte « expire le » en vague 2) | comme le n° 4 | — |
| 9 | Stock sous le seuil pour un chantier | réservation `chantier_materiaux` (0141:121) sous le seuil ou insuffisante, sans commande (`crm/alertes.ts:109-125`) ; en Studio, `seuil_alerte` (0040:19) | `preparer_liste_achat` (`outils-actions.ts:220`), `enregistrer_commande` | 1-2 partout (commande proposée) | `crm` |
| 10 | Chantier terminé : demande d'avis | `statut='termine'` depuis `DELAI_AVIS_JOURS` (2 jours, `apresChantier.ts:23`), sans opposition (0171) | `demander_avis` (`outils-actions.ts:440`) | 1-2 partout (pas exécutable sans session, `regles.ts:62-67`) | `crm`, `crmApresChantier` |
| 11 | Relance d'impayé arrêtée par une réponse du client (02/11 midi, §0 bis, rang 1) | `relances_impayes_arrets.raison='reponse_client'`, `reprise_le` vide (0159:59-66), facture sans `payee_le` (0140:18) ; jamais `messages` | carte « Le client a répondu » et son motif choisi d'un geste ; « oubli » reprend les relances (`app/api/factures/relances-auto/route.ts:80`) ; « dit avoir payé » : l'artisan vérifie, jamais « payée » seul (§13) | 1-2 partout | `relancesImpayes` |
| 12 | Entretien à proposer (02/11 midi, §0 bis, rang 6) | rappel posé par l'après-chantier : `crm_rappels.cle` « entretien:… », `origine='systeme'`, `echeance` passée, `envoye_le` vide (0162:30-36) ; chantier terminé, sans opposition (0171) ; jamais `crm_rappels.texte` | `envoyer_rappel_entretien` (`outils-actions.ts:445`), e-mail au nom de l'artisan | 1-2 partout (le pilote ne l'exécute pas, `regles.ts:62-67`) | `crm`, `crmApresChantier` |

**La simulation, sans aucune table nouvelle (lot L3 n8n ; le module de L3 et la route de L4 sont abandonnés le 02/11 : n8n-first, voir §0.1).**
- Lecture : le workflow `presti-detecteurs` fait par compte une lecture par table en GET HTTP, `select=` limité aux colonnes permises, par
  l'identifiant « Supabase account », filtrée sur `artisan_id` ; le nœud Supabase ne sert qu'à `regles_automatisation` ; à défaut, données
  fictives épinglées (pin data) en attendant une vue par table, au « go » de Benj (§0.1 ; `032-003.md:42-47` ; `lib/detecteurs/lecture.ts`
  et ses lectures par la clé de service sont abandonnés le 02/11). Elles portent sur
  les devis, factures, leads, chantiers et réservations, le stock, `relances_impayes`, `crm_rappels`, les cartes et la file récentes, et
  `plateforme_config`. Elles ne prennent que des identifiants, des dates, des montants et des statuts (§0 bis, « Ce que n8n lit ») : le
  détecteur 7 lit la qualification rangée à la création de la demande (`leads.urgence`, `leads.type_chantier`, 0026:4-5), jamais son texte.
- Constats : des nœuds Code rendent le détecteur, la clé par étape (`devis_sans_reponse:<id>:j7`), l'objet, le montant en centimes, les jours, le
  niveau proposé selon l'offre (copie figée de `lib/plans.ts`) et l'outil existant. Jamais un nom, une adresse, un e-mail ni un texte. Réécrit
  le 02/11 midi, puis aligné sur `032-003` : la promesse ne tient que si ces colonnes ne sont jamais lues ; `select=` les écarte, et
  `detecteurs-n8n-qa` rougit sur une colonne `nom`, `email`, `contact`, `adresse`, `message`, `contenu` ou `texte` (`032-003.md:61-62`).
- En simulation, rien n'est écrit dans Supabase ni envoyé, aucun modèle n'est appelé ; la sortie est un bilan agrégé par détecteur (nombre,
  montant total), rejoué hors ligne par `detecteurs-n8n-qa` (tâche `032-003`).
- Route `POST /api/detecteurs/passage` (abandonnée le 02/11 : n8n-first, voir §0.1 ; gardée ici pour l'historique) :
  - mode `simulation` seulement, et réponse 404 tant que le drapeau est baissé (sauf comptes en essai) ;
  - clé `DETECTEURS_CLE` comparée en temps constant (`bearerEgal`, `lib/secretEgal.ts:18`), réponse 401 sans elle ;
  - lots par curseur, dans un budget de 25 s ;
  - réponse en agrégats par détecteur, et une seule ligne écrite, dans `passages_cron` (`0057:12`, `enregistrerPassage`, `lib/alertes.ts:213`) :
    aucune autre écriture, aucun envoi, aucun appel au modèle.

## 10. Les organisations multi-membres (P3:555-561, R2 §5)

**Préalable : la faille de 0138.**
- La CTE `a` lit `artisans` par `auth.uid()` (`0138:44-47`). Pour qui n'y figure pas, la révocation (l.55-56) et le code par e-mail (l.66) sont
  vrais à vide.
- M2 lit ces champs dans `utilisateurs` pour un non-artisan, et refuse un membre actif non titulaire sans ligne. Un compte neuf reste permis :
  il écrit sa ligne `artisans` à l'inscription, sous la RLS (`app/onboarding/page.tsx:62-67`, politique `artisan_insert_own`, 0001:22). Un test
  de non-régression le prouve.
- La suspension d'une organisation atteint ses membres par `comptes_accessibles`, qui exclut en écriture les comptes suspendus.

**Matrice** (R2 §5.5) : le titulaire seul gère l'abonnement, les membres et le niveau 3. Le compagnon voit ses chantiers (`chantier_equipe` et
`equipe_membre_id`) et son pointage, jamais la compta. L'invité lit. Un test vérifie que `lib/organisations/droits.ts` et `droits_roles` disent la
même chose.

**Les pas, dans l'ordre.** On ajoute des politiques permissives `org_*` ; aucune politique existante n'est jamais modifiée.

| Pas | Contenu | Retour arrière | Préalable |
|---|---|---|---|
| M0 | Sauvegarde de toutes les tables prouvée (§4.1) ; essai à sec de chaque migration | — | Benj : clé privée, `presti-sauvegarde` publié |
| M1 (0183) | Tables, fonctions, `droits_roles`, interrupteur faux ; une organisation et un titulaire par artisan | `drop` des objets neufs | M0, « go » |
| M2 (0184) | Garde de session étendue aux membres | corps de 0138 recopiés en tête | M1, banc de 0138 rejoué |
| M6 (0188) | Gardes reposées sur les tables qui n'en ont pas | `drop` | indépendant |
| M3-A, M3-B | Lecture seule (`assistant_*`, `crm_journal`, `prix_observations`), puis le CRM (`chantiers`, `chantier_*`, `crm_*`, `equipe_membres`, `vehicules`), où le compagnon voit ses chantiers | `drop` des `org_*` | M2 |
| M3-C, M3-D | Commercial (`leads`, `messages`, `relances`, `clients*`, `plateforme_config`), puis l'argent (`devis*`, `factures*`, `relances_impayes*`, `prix_artisan`) | idem | lot précédent ; auditeur distinct pour M3-D |
| M3-E, M3-F, M4, M5 | Stock ; tables fermées lues par une vue (`canaux`, `artisans`) ; stockage ; `acteur_id` | `drop` | lot précédent |

- **Retour arrière global**, à tout moment : `organisations_ouvertes` remis à faux, sans DDL ; `comptes_accessibles` ne rend plus que `auth.uid()`.
- **Côté routes** (P4b) : `resoudreCompte(session)` rend `{ acteurId, compteId, role }`. Un non-titulaire reçoit 403 sur toute route qui ne déclare
  pas `{ domaine, niveau }`. C'est aussi critique que la RLS : 268 fichiers passent par la clé de service (`cadrage-p3.md:51`).
- **Tests** (`scripts/organisations-qa.mjs`) :
  - partie statique, toujours jouée : RLS, garde, `revoke`, interrupteur, retour arrière ;
  - partie PGlite (`PGLITE_DIR`, comme `assistant-qa.mjs:1023-1027`) : deux organisations à quatre rôles, étanches ; matrice dans les deux sens ;
    compagnon ; membre sans ligne `artisans` ; inscription non régressée ; interrupteur. Sans PGlite : code 2, « en attente », jamais un faux vert ;
  - 4 mutations qui doivent rougir : `statut='actif'` retiré, `organisation_id` inversé, garde de suspension retirée, `security invoker`.
- **Cette nuit** : M1, M2 et M6 sont écrites, avec leurs jumeaux et leurs tests ; rien n'est appliqué.

## 11. SMS (R5)

- **L'adaptateur** `envoyerSms` ne dépend d'aucun fournisseur (contrat de R5 §7.2). Il vit dans `lib/sms/` : `contrat.ts`, `encodage.ts`,
  `expediteur.ts`, `numero.ts`, `plage.ts`, `lien.ts`, `envoyer.ts`, `fournisseurs/factice.ts`, et `fournisseurs/sweego.ts`, qu'aucun test n'appelle.
  La session principale écrit `tarifs.ts` : tarifs sourcés et datés, `SMS_COUT_APPROUVE = null`.
- **Trois types**, en liste fermée : `rappel_rdv`, `devis_pret`, `rappel_paiement`, en GSM-7 pur, un segment, sans montant ni menace. Aucun SMS
  commercial : le consentement n'est pas recueilli, et la loi n° 2025-594 l'interdit pour la rénovation énergétique.
- **À blanc par défaut** : `mode: 'blanc'` rend `simule` avec une estimation (segments, coût calculé par le code). Un `fetch` qui lève prouve que
  rien ne sort.
- **Étape 0, gratuite** : `lien.ts` prépare un lien `sms:` (RFC 5724), que l'artisan envoie lui-même depuis son téléphone.
- **Les portes, dans l'ordre** (R5 §7.3) :
  1. drapeau `smsClients`, interrupteur `sms_arret`, type, pause générale (`lib/agents/sortie.ts:12-20`) ;
  2. offre : en v1, `peut(plan, 'assistant')` et un geste de l'artisan (niveau 2). La capacité `sms.envoi` arrive avec le premier envoi réel,
     pour ne pas toucher la grille ;
  3. mobile de métropole, sans opposition, avec un numéro donné pour ce chantier (`tel_source`, 0186) ;
  4. expéditeur : le nom de l'artisan, validé. Jamais « Presti », jamais le numéro court du fournisseur ;
  5. pas de lien, deux segments au plus, du lundi au samedi de 8 h à 20 h heure de Paris, hors jours fériés ;
  6. en réel, coût approuvé ; idempotence ; plafonds en fail-closed, 10 par artisan et 100 en tout par jour (8 € HT au plus) ; disjoncteur.
     Un envoi `incertain` n'est jamais renvoyé.
  - 02/11 midi (§0 bis, rang 18) : chaque SMS porte STOP, refusé sans lui ; une opposition reçue s'écrit dans `sms_oppositions` et ferme la
    porte 3 ; le chemin d'envoi (`lib/sms` ou n8n) et la forme du STOP sont la question 3.
- **Tests** : `scripts/sms-qa.mjs` joue les 13 cas hors ligne de R5 §9. Le 14e, la RLS de `sms_envois`, est dans `automatisation-schema-qa.mjs`.
- **Attend Benj** : le fournisseur, son compte et le « go » écrit sur le prix d'un segment ; les plafonds, et qui paie (défaut : Presti en v1) ;
  les questions au support de Sweego (R5 S8), le registre des traitements et le DPA ; la migration 0186.

## 12. L'offre Entreprise dans `lib/plans.ts` (session principale : c'est de l'argent)

```ts
export type PlanId = 'gratuit' | 'essentiel' | 'studio' | 'signature' | 'entreprise' | 'business'   // PlanPayant ne bouge pas
| 'organisation.membres'                                    // + Capacite : inviter des membres (§10)
const ENTREPRISE: Capacite[] = [...SIGNATURE, 'organisation.membres']   // même autonomie que Signature (OFF:28-36)
entreprise: { label: 'Presti pour l’entreprise', accroche: 'Sur mesure : votre équipe, vos outils, vos automatisations. Sur démonstration et sur devis.',
              creditsMois: 600, prixMois: 0, surDevis: true, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: ENTREPRISE },
business: { …, capacites: ENTREPRISE }                      // le compte fondateur essaie l'écran d'équipe
PLAFOND_IMAGES_MO.entreprise = 1024 · PLAFOND_PHOTOS_CLIENTS_MO.entreprise = 500 · PLAFOND_PIECES_CHANTIER_MO.entreprise = 2048   // = Signature
offreDeReference(plan)   // 'signature' pour signature, business, entreprise ; aUneOffreAuDessus(plan) en découle
messageVerrou('organisation.membres')   // « Disponible avec Presti pour l’entreprise, sur démonstration. »
```

- **Ce qui ne bouge pas** : `OFFRES`, `ESSAI_JOURS` et les cellules de la grille restent des `Record<PlanPayant, …>` (l.108, l.151-152, l.184). Donc ni
  Checkout, ni essai, ni colonne publique. Benj crée l'abonnement à la main chez Stripe, avec `metadata.plan = entreprise`. Le typage signale tout
  `Record<PlanId, …>` oublié.
- **Les tests d'offre en dur, à corriger** : `lib/abonnementSync.ts:61` lit le montant avant `metadata.plan`, si bien qu'un contrat à 99 € serait pris
  pour Signature ; `entreprise` doit l'emporter, et `planDepuisMontant` écarte déjà un prix à 0 (l.22). `lib/quotaMedia.ts:85-87` et
  `app/parametres/SectionAbonnement.tsx:22` passent par `offreDeReference` ; à la l.107, un prix à 0 € affiche « Essai gratuit, sans carte », il
  faut « Contrat sur mesure ». Reste `lib/plans.ts:139-147`.
- **Inchangés, mais testés** : `app/api/subscribe/route.ts:42-43` (seulement `OFFRES`), `lib/direction/stripe-actions.ts:26-30` (refuse un prix
  nul ou négatif), `app/controle/Fiche.tsx:31` et `:148`, `app/assistant/page.tsx:176`.
- **Tests qui doivent rougir.** `scripts/offres-affichage-qa.mjs` : l'étape 2 (l.55-58) compte `PLANS.entreprise`. Une empreinte SHA-256 de
  `PLANS.studio`, `PLANS.signature`, `OFFRES`, `ESSAI_JOURS`, `AUTOMATISATION` et `GRILLE_COMPLETE`, relevée avant le changement, prouve que Studio et
  Signature n'ont pas bougé d'un octet. Entreprise vaut exactement SIGNATURE plus `organisation.membres`, hors `OFFRES` et `ESSAI_JOURS`. Mutations :
  Entreprise ajoutée à `OFFRES`, une capacité ôtée à Studio. `scripts/essais-gratuits-qa.mjs` (EG-3) : à 99 € avec `metadata.plan = entreprise`, le
  plan est `entreprise` ; un Checkout `entreprise` répond 400 ; l'essai dure 0 jour. Mutation (EG-5) : l'ordre de lecture inversé.
- **02/11 midi** (§0 bis) : la mise en place d'un client Entreprise (§12.1 ci-dessous : rang 15), ses workflows sur mesure (rang 14), « Vos
  automatisations » (rang 24), la trame de démo (rang 17) et les demandes de démo (rang 16, volet « démo Entreprise ») ; questions 6 (c, d)
  et 9. Les 600 crédits par mois de l'offre sont la question 6 (c).

### 12.1 Mettre en place un client Entreprise (02/11 midi, §0 bis, rang 15)

Repris de l'amendement de la synthèse C4 (rang 15), qui vit dans un dossier temporaire ; sources relues contre `plans/analyse-videos.md`
(« :ligne ») et ce plan. Aucun montant des vidéos n'est repris (:74, :233). → L20 : rien avant un contrat signé.

1. **Préalable** : P2 vert, soit deux semaines de passages de `presti-detecteurs` en simulation, faux positifs comptés (§14), avant la
   première mise en service : soigner la livraison avant de vendre davantage (:217). La démo ne montre que le vrai produit (:117). Aucune
   date n'est promise avant le cadrage (`p4-landing.md:124`).
2. **Rien de sur mesure avant le contrat signé** (:73).
3. **La proposition** : une seule brique d'entrée, le manque qui rapporte le plus (l'argent qui dort d'abord, P3:584), la suite proposée au
   suivi (:218). Chaque étape porte son prix, sur devis, fixé par Benj ; aucune étape sans prix pour servir d'ancrage (:271, :375).
4. **Après la signature, une fiche de cadrage en deux temps** (:43, :291, :295). D'abord les outils du client (CRM, ERP, inventaire,
   messagerie d'équipe, e-mail ; OFF:25-27), leur rôle et leur coût, dont on a parlé au premier échange (volet « démo Entreprise », §0 bis).
   Puis une fiche par processus : qui fait quoi, dans quel outil, en combien de temps, en réponse libre ou dictée. Un champ vide déclenche
   une question précise, jamais une valeur supposée.
5. **Les procédures du client sont des données de son compte** (:588, :590, :817) : une table filtrée par organisation, sous RLS, avec 0183
   (« go » de Benj). Jamais dans `lib/ai/cerveaux/`, commun à tous les comptes, ni dans le vault, qui ne porte aucune donnée opérationnelle de client
   (`architecture-outils.md`).
6. **Un catalogue de « moteurs »** (:482, :488). Chaque moteur est un modèle de workflow n8n prouvé en simulation : d'abord « Relances »
   (devis et impayés) et « Après-chantier » (avis et entretien), copiés et adaptés par client. Un workflow à la fois, le plus rentable
   d'abord (:56), selon les cinq pas de `migration-production.md` ; un projet et une étiquette n8n par client sur Oracle ; une tâche
   `.orchestre/file/` par intégration. Un moteur n'entre au catalogue qu'après sa preuve (§5, R11). Alors seulement la page de démo du
   chantier 2 peut le nommer, en mots simples, sans prix ni écran d'équipe avant les organisations (`p4-landing.md:291` ; plan du
   chantier 2, rang 19).
7. **Le suivi** : un point à J+30 de chaque mise en service, et un rappel à Benj d'une proposition restée sans réponse (:38, :204). Ce sont
   des alertes internes vers `#presti-auto` et le Telegram du fondateur : l'identifiant du compte et la date, sans coordonnées. Hermes
   prépare les tâches, jamais devant le client (`architecture-outils.md`).

Workflows du n8n d'Oracle, livrés inactifs et essayés à blanc, textes validés par Benj avant l'activation (`securite.md`) : les modèles par
moteur (étiquettes `moteur-relances`, `moteur-apres-chantier`), copiés par client, qui envoient au nom du client : la mention d'IA sur un
texte rédigé par le modèle, `PIED_AUTOMATIQUE` sur un impayé (`lib/relancesImpayes.ts:55`), `PIED_APRES` sur un texte fixe d'après-chantier
(`lib/apresChantier.ts:51`, `:79`) ; une relance de devis, à texte fixe (`lib/assistant/outils-actions.ts:106`), n'en porte aucune (§0 bis) ;
`presti-entreprise-cadrage` (lien de la fiche, une relance d'une fiche incomplète, alerte à Benj) et `presti-entreprise-suivi` (J+30,
propositions sans réponse), messages de Presti, non visés. Les questions 6 (c, d) et 9 restent ouvertes.

## 13. Ce qui ne s'automatise jamais (§3.2, P3:553), et où c'est garanti

| Geste | Garde dans le code | Après la nuit | Test |
|---|---|---|---|
| Envoyer un devis signé | refusé par l'assistant (`actions-serveur.ts:320-323`, `:830-833`) et par le pilote (`executeur.ts:76`) | inchangé | `securite-assistant-0211-qa` |
| Un prix sans source | `prixSources` (`regles.ts:105`, `:154`) ; garde des chiffres (`boucle.ts:212-224`, `:291-309`) | + règle « Tout auto » (S2) ; + « fait tout seul » (S1) | idem |
| Encaisser, rembourser, payer | `marquer_facture_payee` jamais piloté (`regles.ts:70-73`) ; aucun outil `rembourser`, `payer` ni `creer_avoir` | plus exécuté par le « fait tout seul » (S1) | idem |
| Émettre une facture | `creer_facture` jamais piloté | + `creer_facture_libre` (arbre) ; acompte d'une règle préparé, pas émis (S5) | idem |
| Supprimer des données | `supprimer_devis_brouillon`, `supprimer_tarif` jamais pilotés | + `supprimer_article` (arbre) ; plus de suppression par le « fait tout seul » | idem |
| Changer les prix en lot | `augmenter_tarifs` jamais piloté | plus appliqué par le « fait tout seul » | idem |
| Escalade : litige, sinistre, fuite, menace, avocat | playbook réclamation (`lib/ai/playbooks.ts:41-49`) ; mot relu avant la réponse seule (`plateformeConfig.ts:157-161`) | relue aussi au départ du pilote (S3) | `pilote-qa` |
| URSSAF, impôts | aucune fonction (`cadrage-p3.md:82`) | — | `double-chemin-qa` : aucune action de ce domaine |
| Créneau, délai, fournisseur ou prix inventés | consignes (`cadrage.ts:206-212`, `lib/ai.ts`) ; garde finale des chiffres | — | `assistant-qa` |
| Téléphoner, prendre un rendez-vous seul (P3:576) | aucune fonction d'appel ; un créneau vient de l'agenda | — | — |

Une seule liste fait foi : `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:70-73`, élargie dans l'arbre), lue par le pilote et par `proposee`. Un type
de pilote neuf n'entre que si la suite a parcouru tout le catalogue (P3:603).

## 14. Les phases, la nuit du 02/11, puis la suite (mise à jour du 02/11 midi)

| Phase | Contenu | Preuve de sortie | Attend Benj |
|---|---|---|---|
| P0 Socle | Sauvegarde complète par `presti-sauvegarde` (n8n), chien de garde ; boîte e-mail ; battements | Archive vérifiée, aller-retour, alerte déclenchée une fois | Clé sur Oracle, clé SSH dans n8n, clé privée, IMAP |
| P1 Sécurité | S1 à S5 (02/11 midi : écrits dans l'arbre, non commités ; contre-audit `032-004` en cours) | Suites vertes, mutations, audit distinct, déploiement vérifié par SHA | Push, si la délégation ne le couvre pas |
| P1b Mise en route (02/11 midi, sortie de P7 : §0 bis, rang 2) | Frise de trois étapes, une question à la fois, import des clients et des tarifs par la conversation, « Décrire mon entreprise » | Un compte fictif rempli par la mise en route ; aucun tarif deviné ; un second import sans doublon | « go » pour la migration de `crm_reglages` |
| P2 Mesure | Détecteurs en simulation dans n8n (`presti-detecteurs`, §0.1) | Deux semaines de passages, faux positifs comptés par détecteur | Clé (abandonné le 02/11 : n8n-first, voir §0.1) ; workflow publié en simulation |
| P3 Accueil | `consoleV2` en essai, puis levé | Jury en 390 et 1440 px, zéro mot interdit, états dégradés | Levée |
| P4a Organisations | 0183, 0184, 0188, `droits.ts` | `organisations-qa`, essai à sec, application | « go » par lot |
| P5 Boîte et briefing | 0185 ; opportunités changées en cartes ; Modifier, Plus tard, lot ; briefing poussé à 7 h 30 (02/11 midi : `presti-briefing-matin` dans n8n, voie en question 2 du §0 bis) | Sur un compte fictif, les cartes du matin naissent seules (P3:625) | « go » pour 0185 |
| P4b Équipes | M3 à M5, routes, écran d'équipe | Deux membres aux droits différents ; organisations étanches sur 44 tables | « go » par lot |
| P6 Autonomie | `autonomie_reglages` ; des détecteurs vers le pilote | Sous Signature, une relance de devis au niveau 3 part seule, s'annule 10 min, apparaît au journal (P3:626) | — |
| P7 Entreprise, SMS réel, mise en route | Contrat ; SMS par API ; imports guidés en 5 questions au plus (02/11 midi : la mise en route passe en P1b ; P7 garde le suivi J+14 et J+30, rang 11, et les étapes du devis, rang 20) | Coût approuvé ; un compte importé | Coût, comptes |
| P8 Boucle | Mesures hebdomadaires par détecteur, `/controle`, documentation, vault | Notes au vault | — |

**Les règles de la nuit** (nuit du 02/11, gardées pour l'historique ; la suite est plus bas, « La suite, après L1 et L2 »).
- **Ordre** : la session principale fait L0, L1, L2, L4, L6 puis L11 (L4 abandonné le 02/11 : n8n-first, voir §0.1).
- **Vagues de sous-agents**, deux à la fois au plus, car le PC n'a que 600 Mo de RAM libre (note du 01/11) : L3 et L9 pendant L1 ; L5 et L10
  pendant L2 et L4 ; L7 et L8 pendant L6.
- **Si la nuit ne suffit pas**, on coupe dans cet ordre : L10, L8, L7, puis 0185 à 0187. Jamais L1.
- **Chaque lot** devient une tâche `.orchestre/file/032-0NN.md`, dont l'en-tête YAML porte `id, type, objectif, perimetre, interdit, verifier,
  budget, preuve`. `interdit` liste les autres périmètres, `verifier` lance la suite du lot, et le verdict vient de
  `node scripts/orchestre.mjs verifier <id>`. Un lot encore rouge au bout de son budget passe « bloqué », avec une question à options.
- **Le prompt de chaque sous-agent** (`sonnet`) lui redit les règles, car il ne les reçoit pas seul. Il lit d'abord `regles_pour` et les notes nommées pour
  son lot. Il ne fait ni build, ni `next dev`, ni commit, ni push, ni migration, ni suite contre la production (`securite.md`). Identifiants en
  français, aucun secret, données fictives, mutation prouvée. Un autre agent l'audite, jamais lui-même.
- **Le lanceur** ne tourne jamais en entier cette nuit : certaines de ses suites créent des comptes sur la base réelle (`rls-e2e.mjs` l.46,
  `regles-verrou-e2e.mjs` l.64). On joue les suites hors ligne une à une.
- **Commits et push** : un commit par lot, aux chemins nommés. `scripts/tout-verifier.mjs` porte déjà deux ajouts du chantier 1 : seuls les hunks
  du lot y entrent. Push : L1 seulement, si la délégation le couvre.
- **Hermes** ne reçoit aucune tâche : son crédit est celui du produit, et le complexe revient à Claude Code (règle du 01/11 au soir).

| Lot | Qui l'écrit | Périmètre exclusif | Objectif | Suite au lanceur (mutation prouvée) | Budget |
|---|---|---|---|---|---|
| L0 Ouverture | principal | `lib/flags.ts` ; `.orchestre/file/032-*.md` | 4 drapeaux baissés (`consoleV2`, `detecteurs`, `organisations`, `smsClients`) ; tâches ; état du déploiement de HEAD | typecheck ; `assistant-qa`, `offres-affichage-qa` verts | 20 min |
| L1 Sécurité S1-S5 | principal (reprend l'arbre) | `lib/assistant/{cadrage,actions-serveur}.ts`, `lib/pilote/{regles,file,executeur}.ts`, `lib/reglesServeur.ts`, `lib/regles.ts`, `lib/relancesRegistre.ts`, `lib/relancesImpayes.ts`, `lib/relancesImpayesTour.ts`, `app/api/crm/relances/envoyer/route.ts`, `app/api/cron/relances/route.ts`, `app/api/conversation/devis/route.ts`, `scripts/{securite-assistant-0211,relances-registre,pilote,relances-impayes,assistant}-qa.mjs` | §3 | `securite-assistant-0211-qa` (S1, S2, S5), `pilote-qa` (S3), `relances-registre-qa` (S4) ; mutations du §3 | 2 h 30 |
| L2 Argent | principal | `lib/plans.ts`, `lib/abonnementSync.ts`, `lib/quotaMedia.ts`, `app/parametres/SectionAbonnement.tsx`, `lib/sms/tarifs.ts`, `scripts/offres-affichage-qa.mjs`, `scripts/essais-gratuits-qa.mjs` | Offre Entreprise (§12) ; porte du coût SMS (`SMS_COUT_APPROUVE = null`, tarifs de R5 §3 datés du 02/11) | empreinte de Studio et Signature ; webhook `metadata.plan` ; Checkout refusé | 1 h |
| L3 Détecteurs purs (abandonné le 02/11 : n8n-first, voir §0.1 ; remplacé par L3 n8n, tâche `032-003`) | sous-agent | `lib/detecteurs/**`, `scripts/detecteurs-qa.mjs` | Les 10 règles, catalogue, priorité, lecture injectée, `simulerCompte` (§9) | déclenche, se tait, à la limite, après disparition de la condition ; clé par étape ; Studio ; n° 5 coupé ; n° 7 jamais au niveau 3 ; toute écriture ou `fetch` lève ; un comparateur inversé dans une copie | 2 h |
| L4 Route (abandonné le 02/11 : n8n-first, voir §0.1) | principal, après L3 | `app/api/detecteurs/passage/route.ts`, `scripts/detecteurs-route-qa.mjs` | La route du §9 | 404 drapeau baissé ; 401 sans clé ou avec une fausse ; 400 en mode réel ; aucune écriture hors `passages_cron` ; aucune chaîne qui ressemble à un nom ou un e-mail ; comparaison de la clé retirée | 45 min |
| L5 Accueil | sous-agent, avec `presti-design` | matière portée de `refonte-1018` (`components/ui/**`, `app/console/**`, `lib/consoleV2Client.ts`, `app/dashboard/Aujourdhui.tsx`, `aujourdhui.css`, `app/api/aujourdhui/**`, `app/api/console/**`) ; `app/dashboard/page.tsx`, `app/AppShell.tsx`, `app/base.css`, `lib/assistant/briefing.ts`, `scripts/accueil-qa.mjs` | §7 | 4 sources en cartes triées par argent ; pas de doublon avec le point du jour ; mots interdits ; Studio sans « Part seul » actif ; jamais « Envoyé » ; une panne sans zéros | 2 h 30 |
| L6 Migrations | principal | `supabase/migrations/0183` à `0188` et leurs 6 jumeaux, `lib/organisations/droits.ts`, `scripts/organisations-qa.mjs`, `scripts/automatisation-schema-qa.mjs` | §8 et §10 ; essais à sec | partie statique ; partie PGlite (code 2 sans elle) ; `migrations-jumelles-e2e` ; 4 mutations | 2 h |
| L7 SMS à blanc | sous-agent, après L2 | `lib/sms/**` sauf `tarifs.ts`, `scripts/sms-qa.mjs` | §11 | les 13 cas de R5 §9 | 1 h 30 |
| L8 n8n | sous-agent, relu par le principal | `plans/011-cadrage-01-11/briefs/c4-n8n-{detecteurs-matin,garde-sauvegarde}.{md,workflow.json}`, `scripts/n8n-specs-qa.mjs` | Déclencheur à 6 h 45 (Europe/Paris), `POST` vers L4 avec la clé de service que Benj collera (abandonné le 02/11 : n8n-first, voir §0.1 ; la partie détecteurs fusionne dans L3 n8n), erreur vers Slack et Telegram ; garde de la sauvegarde et battements à 4 h (gardés : « La suite », ligne 3) | JSON lisible, `active: false`, aucun secret, hôte `prestiapp.fr` (sans objet depuis le 02/11 : n8n n'appelle plus Presti), `mode: simulation`, branche d'erreur ; `active: true` doit rougir | 45 min |
| L9 Sauvegarde | sous-agent ; passage réel par le principal | `scripts/sauvegarde.mjs`, `scripts/restaurer.mjs`, `docs/sauvegardes.md`, `ops/sauvegarde/**` (abandonné le 02/11 : n8n-first ; à sa place `presti-sauvegarde`, §4.1), `scripts/sauvegarde-qa.mjs` | §4.1 | découverte sur une fausse définition OpenAPI ; chaque table des migrations est sauvegardée, ou dans `EXCLUES` avec sa raison ; ordre des clés étrangères ; une table retirée doit rougir | 1 h 30 |
| L10 Double chemin | sous-agent | `scripts/double-chemin-qa.mjs` | Règle B2 des vidéos : chaque action de `SPEC` a son écran ou sa route manuelle (`plans/016-assistant.md:32-34`) | table action → fichier existant ; une entrée retirée doit rougir | 45 min |
| L11 Intégration | principal | `scripts/tout-verifier.mjs` (inscrire les suites), `lib/flags.ts` (`ESSAI = { consoleV2: true }` si L5 est audité), `scripts/assistant-qa.mjs:1018`, `.orchestre/contexte.md`, vault (tâche de périmètre `SaaS/…`) | Build ; suites une à une ; audits distincts (`presti-audit-attaque` sur L1, L4, L6 ; `presti-audit-conformite` sur L2, L7 ; `presti-anim-accessibilite` et `presti-anim-marque` sur L5) ; commits ; sauvegarde réelle ; captures en 390 et 1440 px sur l'atelier d'exemple ; rapport du matin | — | 1 h 30 |

**La suite, après L1 et L2 (mise à jour du 02/11 midi ; §0 bis).**

État au 02/11 midi : L1 et L2 sont écrits dans l'arbre, non commités ; leur contre-audit `032-004` est en cours (`.orchestre/en-cours/`), et le
push attend le typecheck, le build et cet audit, verts (§0.3). L3 n8n est écrit en tâche (`032-003`, dans `.orchestre/file/`). Rien d'autre n'a
commencé : ni les drapeaux de L0, ni les migrations 0183 à 0188, ni `lib/sms`.
- **Qui** : chaque lot est une tâche `.orchestre/file/032-0NN.md` (en-tête YAML complet), `executant: claude-code`, lancée dans une conversation
  Orca visible (règle de Benj du 02/11, Journal-Decisions) ; deux agents au plus en même temps sur le PC (Journal-Decisions, 02/11 midi).
- **Ce qui reste à la session principale** : commit, push, déploiement, migration et build, que la garde refuse aux sessions lancées par Orca
  (`scripts/hooks/garde-agents-orca.mjs`) ; elle écrit aussi, ou relit, le schéma, l'argent, la sécurité et les cerveaux. Un autre agent audite,
  jamais l'auteur.
- **Preuves** : chaque suite neuve joue hors ligne, prouve qu'elle rougit (mutation) et entre au tableau `SUITES` (L11). Chaque workflow suit les
  règles communes du §0 bis.
- **Hermes** ne reçoit aucune tâche de ce chantier, comme cette nuit (crédit partagé avec le produit).
- **Ordre** : l'argent récupéré d'abord ; L9 passe avant toute migration appliquée (§4.1).

| # | Lot | Contenu (§0 bis) | Qui l'écrit | Suite au lanceur (mutation prouvée) | Attend Benj |
|---|---|---|---|---|---|
| 1 | L3 n8n `presti-detecteurs` | Les 10 détecteurs du §9 en simulation : lectures en GET HTTP, `select=` limité aux colonnes permises, identifiant « Supabase account » (nœud Supabase seulement pour `regles_automatisation` ; à défaut, pin data en attendant une vue par table, « go » de Benj), nœuds Code, bilan agrégé (tâche `032-003`, écrite, puis faite : PASS le 02/11 à 16 h 13 ; audit `032-010` : le workflow tient, son juge non — trois défauts élevés, corrigés par `032-012`) | Claude Code, tâche `032-003`, conversation Orca | `detecteurs-n8n-qa` : l'export rejoué hors ligne ; un comparateur inversé rougit | L'hôte de l'identifiant « Supabase account » visait une page web (`.orchestre/preuves/032-003/resume.md`, réserve 1) : corrigé par Benj le 02/11 vers 17 h 10 (vraie API du projet, clé du projet). Reste : la preuve par une lecture réelle (L12), puis publier le workflow en simulation, ce qui ouvre les deux semaines de P2, une fois `032-012` audité et L12 posé |
| 2 | L12 n8n : détecteurs 11 et 12, garde commune | Réponse à une relance d'impayé (rang 1) ; entretien à proposer (rang 6) ; clés refusées sautées (rang 8) ; colonnes limitées (critique 6) ; `n8n-specs-qa` pour tout workflow : `active: false`, aucun secret, branche d'erreur (rang 26), mention d'IA sur les workflows visés (critique 1 ; §0 bis) ; section n8n du registre | Claude Code, conversation Orca | `detecteurs-n8n-qa` étendue ; `n8n-specs-qa` : une branche ôtée, une mention ôtée d'un workflow visé, une colonne `nom` lue, `active: true` : chacun rougit | L'identifiant Telegram dans n8n, s'il manque (aucun agent ne saisit de jeton) |
| 3 | L9 et L8 : le socle | Sauvegarde de toutes les tables (§4.1), lancée à 3 h 40 par un workflow n8n `presti-sauvegarde` du n8n d'Oracle ; garde de la sauvegarde à 4 h et battements ; tous livrés inactifs | Claude Code ; passage réel par la session principale | `sauvegarde-qa` ; `n8n-specs-qa` | Clé de service sur Oracle et publication des workflows (clé SSH dans n8n), ou mot de passe Postgres (Q1) ; clé privée, une fois |
| 4 | L0 et L6a : drapeaux et schéma de l'argent | Drapeaux baissés (L0) ; 0185 (opportunités, décisions, `relances_exclusions`, colonne `motif` des arrêts d'impayé, événements) et 0187, avec leurs jumeaux | Session principale (schéma) | `automatisation-schema-qa` (PGlite, sinon code 2) ; `migrations-jumelles-e2e` | « go » écrit par migration, après L9 ; questions 9 et 10 |
| 5 | L13 Impayés et exclusions | Carte « Le client a répondu » et son motif (rang 1) ; « Ne plus relancer » lu par n8n, et par le registre des chemins codés si Benj accepte l'exception B ; d'ici là, à blanc, derrière un drapeau baissé (rang 5 ; question 10) ; ton des relances (rang 10) ; compétence « relancer un impayé » (rang 12) ; n8n écrit ses cartes dans 0185, à blanc d'abord | Claude Code, relu par la session principale (argent), conversation Orca | `relances-registre-qa` (un client exclu ne reçoit rien ; lecture en erreur : refus) ; `relances-ton-qa` (neuve) ; `detecteurs-n8n-qa` | 0185 posée ; exception B (question 10) |
| 6 | L14 Mise en route (P1b) | Frise, questions, import, « Décrire mon entreprise » (rang 2) ; accueil des 48 h dans « Découvrir » (rang 11) | Claude Code, avec `presti-design`, conversation Orca | `mise-en-route-qa` (neuve) : aucun tarif deviné, second import sans doublon, Studio sans « Part seul » | Migration de `crm_reglages` (« go ») |
| 7 | L15 Briefing du matin | `presti-briefing-matin` à 7 h 30 (rang 3), voie (a) | Claude Code, conversation Orca | `briefing-n8n-qa` (neuve) : mêmes priorités que `composerBriefing`, demande de 23 h comprise, jour vide sans envoi | Question 2 ; publication |
| 8 | L16 Relances groupées | Carte de lot avec exclus (rang 4) ; cartes refusées au contexte du tour (rang 8) | Claude Code, conversation Orca | `securite-assistant-0211-qa` (3 retenus, 1 exclu, réalisateur jamais appelé avant la validation) ; `assistant-qa` | Question 1 |
| 9 | L5 Accueil | §7, plus colonnes (rang 21), zéros (rang 22), marques (rang 23), ligne « fait » et solde (rang 20), panneau (rang 25), atelier (rang 27) | Claude Code, avec `presti-design`, conversation Orca | `accueil-qa` | Levée de `consoleV2` ; question 5 |
| 10 | L17 Suivi des artisans | `presti-suivi-artisan` : J0 à J+2, J+14, J+30 (rang 11), livré inactif | Claude Code, conversation Orca | `suivi-artisan-qa` (neuve) : aucun message sans événement réel ; `n8n-specs-qa` | Question 4 ; chaque texte validé avant l'activation |
| 11 | L18 Chemins codés vers n8n | Un par un, en cinq pas (§0 bis) : après-chantier (`presti-apres-chantier`, compétence « proposer l'entretien »), accusé de réception et avis à l'artisan, réponse seule, relances, impayés ; le pilote selon la question 9 | Claude Code, conversation Orca ; chaque bascule par la session principale | une suite de comparaison par chemin (simulation contre l'ancien passage) | « go » de chaque bascule (l'ancien code coupé) |
| 12 | L19 Demandes de démo Entreprise | Table `demandes_demo` et `presti-demande-demo` (rang 16) ; l'écriture dans `demandes_demo` ajoutée à `/api/contact`, une fois la migration posée ; la liste des demandes de démo dans `/controle` et le geste « traitée » (interface, compte fondateur) ; l'e-mail actuel à Benj reste jusqu'à ce que cette liste existe ; la page et le formulaire sont au chantier 2 | Claude Code, conversation Orca ; migration par la session principale | `demande-demo-qa` (neuve) ; `n8n-specs-qa` | Migration (« go ») ; textes des e-mails ; question 4 |
| 13 | L6b Organisations | 0183, 0184, 0188 (P4a), puis M3 à M5 (P4b) | Session principale | `organisations-qa` | « go » par lot |
| 14 | L20 Entreprise, sur contrat | §12.1 (rang 15), workflows sur mesure (rang 14), « Vos automatisations » (rang 24) | Claude Code ; rien avant un contrat signé | `n8n-specs-qa` ; `organisations-qa` | Un contrat ; questions 6 (c, d) et 9 |
| 15 | L7 SMS à blanc | §11 et STOP (rang 18) ; 0186 préparée par la session principale | Claude Code, conversation Orca | `sms-qa`, plus « un SMS sans STOP est refusé » | Question 3 ; le coût ; « go » pour 0186 |
| 16 | L21 et L10 : qualité de l'assistant | Double chemin (L10) ; aide (rang 13) ; profil métier (rang 12) ; marge (rang 9) ; une seule question (rang 19) | Claude Code (cerveaux : jamais Hermes), conversation Orca | `double-chemin-qa` ; `assistant-qa` ; harnais `presti-ai-lab` | Question 8 ; crédits pour le jeu réel (Q13) |
| — | L11 Intégration, à la fin de chaque lot | Suites au tableau `SUITES`, typecheck et build, audit distinct, commit, `.orchestre/contexte.md` | Session principale | le lanceur, suite par suite | Push |

## 15. Ce qui attend Benj au réveil

1. Lire ce plan et l'approuver, ou corriger un défaut du §5 (R1 et Q-S5 défont en partie des choix du 29/10).
2. Donner le « go » du push de L1, s'il n'a pas eu lieu cette nuit.
3. Pour la sauvegarde : poser la clé de service sur Oracle et publier `presti-sauvegarde` (avec sa clé SSH, posée dans n8n et sur Oracle), ou
   remettre à jour le mot de passe Postgres (Q1).
4. Ouvrir une fois la clé privée de sauvegarde (`coffre-presti`), pour prouver la restauration.
5. Pour la boîte e-mail : créer un mot de passe d'application Gmail et le ranger (`node scripts/ranger-env.mjs`).
6. Générer `DETECTEURS_CLE`, la coller dans Vercel Production et dans l'identifiant n8n, puis activer le workflow, livré inactif (abandonné le
   02/11 : n8n-first, voir §0.1 ; aucune clé à générer, n8n lit Supabase par « Supabase account », dont Benj a corrigé l'hôte le 02/11
   vers 17 h 10). Reste : publier `presti-detecteurs` en simulation, une fois le juge corrigé (`032-012`) et audité, et L12 posé.
7. Pour les migrations 0183 à 0188 : un « go » écrit, lot par lot, une fois la sauvegarde vérifiée.
8. Permettre l'installation de PGlite hors du dépôt (paquet npm `@electric-sql/pglite`, un téléchargement), pour des tests SQL réels.
9. Pour le SMS : choisir le fournisseur (Sweego par défaut), créer le compte, approuver le prix d'un segment, fixer les plafonds.
10. Confirmer le contenu de l'offre Entreprise. Le premier abonnement se crée à la main chez Stripe (`metadata.plan = entreprise`).
11. Lire `EMAIL_EXPEDITEUR_ARTISAN` en production (R6), et le compteur GitHub Actions.
12. Tâches `029-001` et `029-002` : leur exécutant est interdit depuis le 01/11, et rejouer `--live` coûte des crédits (Q13). À trancher.
13. Les heures actives de Windows laissent un redémarrage possible entre 1 h et 9 h (note de délégation).
14. (02/11 midi) Les onze questions du §0 bis, « Questions à Benj, défaut appliqué » : chaque défaut s'applique d'ici sa réponse ; les
    exceptions A et B à n8n-first n'entrent au Journal-Decisions qu'avec son accord.

## 16. Les 26 règles des vidéos (R3 §4)

Revue du 02/11 midi : les mentions « 02/11 midi » renvoient au §0 bis, qui prime sur ce tableau.

| Règle | Lot, ou raison du report |
|---|---|
| A1 Une question à la fois, seulement si une donnée manque | L1 : la consigne `cadrage.ts:172` est gardée, et une question ne vaut plus un ordre. Cas « demande floue » au harnais IA : reporté (crédits, Q13). 02/11 midi : cas écrits sans dépense (L21) ; la règle est une lecture proposée, soumise à Benj (tension T1, question 8) |
| A2 Montrer le travail fait ; barre d'avancement | L5 : ligne `libelleOutil` (`app/assistant/page.tsx:278`) sous chaque réponse. Barre : reportée, aucun état d'étape côté serveur. 02/11 midi : étapes du devis posées côté serveur en P7 (rang 20) |
| A3 Devis par étapes ; montants par le code ; prix sourcés | L1 (S1, S2) ; les étapes en P7, dessin à valider. 02/11 midi : sans délai ni fourchette (omission 1 de la synthèse) |
| A4 Consigne en langage naturel, échantillon, exclusions | P5 : validation des opportunités par lot. La lecture existe déjà (`lire_devis`). 02/11 midi : carte de lot avec exclus, L16 (rang 4) ; question 1 |
| A5 Fichier dans la conversation | P7 (mise en route) : aucun champ fichier dans `app/assistant` ; le circuit de `/chiffres` est à reprendre. 02/11 midi : P1b, L14 (rang 2) |
| A6 « Décrire mon entreprise » | P7 : migration nécessaire (`crm_reglages` ne porte que `validation_auto`, 0172:34-36). 02/11 midi : P1b, L14 (rang 2) |
| A7 Marge estimée sur les matériaux | Vague 2 : outil de lecture (`lib/assistant/crm.ts:111`) et cas d'évaluation ; le seuil d'alerte revient à Benj. 02/11 midi : L21 (rang 9) ; seuil : question 6 (e) |
| A8 Solde de crédits visible | L5 : en tête de la feuille de conversation |
| A9 Connaissance métier ; la production ne lit jamais le vault | Principe tenu (§6) ; contenu en P8 |
| B1 Un geste par action ; échantillon si plusieurs clients | L5 (À valider) ; l'échantillon en P5 |
| B2 Double chemin prouvé sur `SPEC` | L10 |
| B3 Repéré, Préparé, À valider | L5 pour « À valider » ; les trois colonnes avec 0185 (P5). 02/11 midi : colonnes tirées du cycle des opportunités, « Vérifié : … » limité aux contrôles passés (rang 21) |
| B4 « N à valider + 3 priorités » ; briefing en 3 lignes, qui ne déclenche jamais le pilote | L5 : la barre et les priorités, sans modèle. Briefing poussé : P5 (type de notification, clé). 02/11 midi : workflow n8n `presti-briefing-matin`, L15 (rang 3) ; voie : question 2 |
| B5 Une proposition écartée ne revient pas | P5 : `opportunites_decisions` (0185) garde le refus ; une clé refusée n'est plus proposée. 02/11 midi : aussi dans la conversation (L16) et dans n8n dès L12 (rang 8) |
| C1 Ni nouvelle boucle ni nouvelle mémoire ; n8n appelle Presti par une clé (abandonné le 02/11 : n8n-first, voir §0.1 ; n8n lit Supabase lui-même) | L3, L4 (abandonnés le 02/11, §0.1), L8 (sa partie détecteurs fusionnée) ; aujourd'hui L3 n8n |
| C2 Compétences : un dossier par geste | P8 (prompts et harnais IA) : les 5 notes « Geste » du vault, copiées dans `lib/ai/cerveaux/`. 02/11 midi : avancé à P2 pour deux gestes, L13 et L18 (rang 12) |
| C3 Demandes sans réponse | L3 : détecteur 6, en simulation (02/11 midi : L3 n8n) |
| C4 Impayés relancés jusqu'au paiement ou au motif | L3 : détecteur 1, avec les textes existants ; classement du motif reporté (migration et modèle). 02/11 midi : L3 n8n ; détecteur 11 en L12 ; motif choisi par l'artisan (0185, L13) ; suggestion du modèle reportée (rang 1) |
| C5 Après le chantier : entretien, suivi | L3 : détecteur 10 ; l'entretien suit le même modèle en vague 2 (`envoyer_rappel_entretien`). 02/11 midi : L3 n8n ; détecteur 12 dès L12 (rang 6) |
| C6 Calendrier fiscal | §5 : hors périmètre |
| C7 Petit modèle pour le simple ; alerte si un workflow échoue | `routerModele` existe ; l'alerte est la branche d'erreur de L8. 02/11 midi : une branche d'erreur dans chaque workflow, vérifiée par `n8n-specs-qa` (rang 26) |
| D1 Mise en route courte, par étapes | P7 (5 questions au plus, P3:581). 02/11 midi : P1b, L14 (rang 2) |
| D2 Accueil sur 48 h ; point à 14 ou 30 jours | P7 : e-mails Brevo, chantier 3. 02/11 midi : chantier 4, `presti-suivi-artisan`, L14 et L17 (rang 11) ; canal : question 4 |
| E1 Isolation entre locataires prouvée | L6 (`organisations-qa`) ; extension de `rls-e2e` reportée : elle tourne contre la production |
| E2 Ni appel, ni rendez-vous seul, ni prix d'un ancien chantier, ni résultat garanti | §13 (gardes existantes) et L1 (prix sourcés) |
| E3 Aucun mot technique, aucune marque à l'écran | L5 : `accueil-qa` vérifie la liste des mots interdits. 02/11 midi : marques et noms de modèles ajoutés à la liste (rang 23) ; fil d'Ariane : question 5 |

## Traçabilité : exigence du prompt → section du plan → lot

| Exigence (numéros de R2 §1) | Section | Lot |
|---|---|---|
| E01, E07, E34 : l'assistant d'abord, l'accueil | §7 | L5 |
| E02 : fichier, photo, lien | §16 (A5) | P7 (02/11 midi : P1b, L14) |
| E03, E14, C14 : pile technique | §6 (aucune dépendance ajoutée, Q11) | — |
| E04 : principes non négociables | §3, §6, §13 | L1, L6 |
| E05, E27, E61, C3, C4 : autonomie par offre et par type d'action | §5, §9, §12, §13 | L1, L2, L3 (P6) |
| E06, E09, E54, C28 : architecture, agents changés en familles d'outils | §6 | L3, L4 (abandonnés le 02/11 : n8n-first, voir §0.1), L8 (sa partie détecteurs fusionnée) ; aujourd'hui L3 n8n et L12 |
| E08 : écrans 2 à 7 | §7 (ils existent, et restent) | — |
| E10, E53, C13 : modèle de données | §8 | L6 |
| E11, E30, E39 : sécurité, organisations, isolation | §10 | L6 (P4a, P4b) |
| E12, E35, E55, C20 : fiabilité, idempotence | §3 (S4), §9, §11 | L1, L3, L7 |
| E13, E26, E36, E56 : tests | §3, §14 | tous |
| E15, E39, E59 : définition du fini | §14 (phases) | P1 à P8 |
| E16, E38, E60 : première réponse attendue | §1 à §10 | — |
| E17 : mémoire, réseau neuronal | en-tête, §14 | L11 (vault) |
| E18, E23 : outils gratuits seulement | §4, §11 | L9, L7 |
| E19 : ne rien raser, drapeaux, `lib/plans.ts` | §7, §12 | L0, L2, L5 |
| E20 : interdits, SMS, sauvegarde avant les organisations | §4, §10, §11, §13 | L9, L6, L7 |
| E21, E68, C8, C9, C24, C25 : inventaire, constat du 29/10 | §2 | — |
| E22, E24, E64 : rien d'irréversible sans Benj, défauts, secrets | §5, §15 | — |
| E25 : une preuve est une sortie de commande | §14 | L11 |
| E28, E65, C2, C7 : offre Entreprise | §5, §12 | L2 |
| E29, E49, C19 : ce qui ne s'automatise jamais | §3, §13 | L1 |
| E31, E62, E66, C5, C6 : n8n, Hermes, Supabase source et file | §0.1, §0 bis, §5, §6, §9 | L4 (abandonné le 02/11 : n8n-first, voir §0.1), L8 (sa partie détecteurs fusionnée) ; aujourd'hui L3 n8n, L12, L8 (garde de la sauvegarde) |
| E32, C27 : canaux, SMS | §11 | L7, L6 (0186) |
| E33, E40 à E48 : couches 0 à 9 | §4, §9, §14 | L3, L9 (P2 à P8) |
| E44 : événements métier | §8 | L6 (0185) |
| E45, C10, C11, C12 : détecteurs | §5, §9 | L3 (02/11 : L3 n8n, puis L12) |
| E50, E51, C18 : boîte unique, briefing poussé, exécution | §7, §14 | L5 (P5, P6) |
| E52, E57, E58 : boucle d'amélioration, livrables | §14 | P8 |
| E63, E67, C29 : rôles des agents, budget de temps, ordre des chantiers | §14 (règles de la nuit) | — |
| E69 : « l'assistant doit tout faire » | §3 (S1 garde le « fait tout seul » hors §3.2) | L1 |
| E70 : comptes fournisseurs | §8.2 (0182 réservée au worktree) | — |
| E71, P3:621 : consigne de la nuit, questions ouvertes | en-tête, §5 | — |
| C21 : « fuite », urgence ou escalade | §3 (S3), §5 (Q9) | L1 (vague 2) |
| C22, C23 : volume d'e-mails, adresse d'expédition | §5 (R5, R6) | — |
