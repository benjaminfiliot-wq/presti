# Mise en service — l'ordre des gestes de Benj (prompt 6, lot 036-012)

Écrit le 03/11/2026 par Claude Code (hôte d'agents d'Oracle). **Rien de ce document n'est fait.** Le code, les migrations, les gabarits, les copies fictives et les
juges sont prêts ; chaque geste ci-dessous est un geste que `.claude/rules/securite.md` réserve à Benj (migration en production, secret, identifiant, publication,
envoi à un client d'artisan, accord d'un volontaire). Les cinq décisions de la première réponse (§ 5) ont pris leur **défaut** et sont appliquées ; Benj peut les renverser
sans refaire le travail.

Le principe : **on avance d'un cran, on vérifie, on peut revenir** (`runbook.md` § 1 coupe à tout moment). Aucune étape n'est sautée parce que la précédente « a l'air bonne ».

## Ce qui est prêt (compté le 03/11)

- 28 workflows n8n du prompt 6 (lots 036-001 à 036-008, relevés sur leurs exports), **inactifs**, sans identifiant, jugés hors ligne : 19 enfants (12 `lib-*` et 7 `presti-dep-*`) à publier avant 9 parents (`presti-cerveau`, `presti-boite` et 7 bancs `presti-banc-*` qui restent inactifs) ; ils s'ajoutent aux socles `lib-*` des prompts 4 et 5 et aux workflows du chantier 4 (`presti-accuse-reception`, `presti-reponse-seule`, `presti-relances`, …).
- 19 gabarits outillés (`gabarit-artisan-*` : 10 ; `gabarit-ent-*` : 9) et leur déployeur à blanc `scripts/deployer-client-n8n.mjs` (juge : `deployer-client-n8n-qa.mjs`).
- Trois migrations **écrites, non appliquées** : `0185_automatisation.sql`, `0192_accuse_reception_n8n.sql`, `0193_systeme_agents.sql`, chacune avec son jumeau `_A_COLLER_sql_editor_…_NU.sql`.
- Trois drapeaux **baissés** : `accuseParN8n`, `systemeAgents`, `connexions` (`lib/flags.ts:334`, `:340`, `:344`).
- Le lanceur joue tous les juges ; `p6-transverse-qa.mjs` prouve que les tests obligatoires du § 1.7 y sont portés.
- Pas encore faits : les lots **036-010** (maquettes, en cours) et **036-011** (l'interface en code, derrière `systemeAgents`). Sans 036-011, l'étape 11 (réel) se pilote par la base et n8n, pas par l'écran de l'artisan.

## Les gestes, dans l'ordre

| # | Geste | Qui | Avant | Preuve que c'est fait | Retour arrière |
|---|---|---|---|---|---|
| **1** | **Trancher O3** : comment la copie d'un client reçoit ses identifiants. (a) l'application crée l'identifiant n8n par l'API de n8n au « Connecter » (OAuth2 à prouver sur un compte d'essai) ; (b) la copie lit le jeton déchiffré et appelle l'API par un nœud HTTP (perd l'icône de l'outil). Défaut recommandé : **(b)**, qui ne demande à aucun agent de créer un identifiant (`OUTILLAGE.md` § O3) | Benj | rien | une ligne dans `Decisions/Journal-Decisions.md` | revenir à l'autre voie : les gabarits ne portent aucun identifiant |
| **2** | **Webhook ou non.** Défaut : **non** (n8n reste à `127.0.0.1:5678`, joint par tunnel ; WhatsApp, Telegram, Messenger, Instagram, SMS et la page `/p` arrivent déjà chez Presti, qui les range en base ; n8n les lit). Un webhook exposé ne se décide que pour le temps réel de WhatsApp / Facebook Lead Ads | Benj | 1 | idem | rien n'est exposé tant que non |
| **3** | **Essai à sec des trois migrations** par la session principale du PC : le bloc `do … raise exception` qui exécute chaque jumeau puis annule tout. Aucune base ou PGlite n'existe sur l'hôte d'agents : l'essai n'a **jamais** été joué (`0193_systeme_agents.sql`, en-tête) | session principale | — | la sortie du bloc, sans erreur, collée dans la preuve | rien ne reste en base |
| **4** | **Relire l'état des migrations en base** (`list_migrations`, `cron.job`) : ne présumer ni `0189` (rôle `n8n_lecture`), ni `0191`, ni `0186`, ni les 168 déjà posées | session principale | 3 | liste relue | — |
| **5** | **Coller `0185`, puis `0192`, puis `0193`, dans cet ordre, jamais un autre** (le bloc « prérequis » de 0193 refuse si 0185 ou 0192 manque ; rejouer 0185 après 0193 remettrait l'ancien trigger : rejouer 0193 ensuite). Voie 1 : `node scripts/appliquer-migration.mjs supabase/migrations/0185_automatisation.sql` (exige `DIRECT_URL`) ; voie 2 : coller le jumeau dans le SQL Editor. **Exécuter les contrôles du pied de chaque jumeau** : tous au vert | Benj (« go » écrit) | 3, 4 | pieds de jumeaux au vert ; `node scripts/migrations-jumelles-e2e.mjs` vert | les trois migrations ne cassent rien tant que leurs drapeaux sont baissés ; chaque fichier est « tout ou rien » dans une transaction |
| **6** | **Lever les drapeaux, PUIS seulement** : `accuseParN8n` après 0192 (et le workflow `presti-accuse-reception` testé), `systemeAgents` et `connexions` après 0193 et le juge de 036-009 vert. **Jamais avant** : levé sans ses tables, le chemin refuse tout et l'artisan tombe sur un écran mort (`lib/flags.ts:20-22`). Un push sur `main` déploie : `node scripts/attendre-deploiement.mjs` puis `node scripts/deploiement-etat.mjs` | session principale, après accord | 5 | déploiement READY au SHA exact | rebaisser le drapeau, repousser |
| **7** | **Dans n8n d'Oracle : poser la clé et les modules, ouvrir les appelants, publier.** (a) générer 32 octets soi-même (`openssl rand -base64 32`) et la poser comme `BOITE_CLE_N8N` dans l'environnement des **exécuteurs** du conteneur `/opt/n8n-complet` — un secret, geste réservé ; (b) `NODE_FUNCTION_ALLOW_EXTERNAL=imapflow,nodemailer,mailparser` et `NODE_FUNCTION_ALLOW_BUILTIN=crypto,dns,net` (à relire dans la documentation de n8n 2.45.7 avant de poser, `connecteurs/imap.md:35`) ; (c) **ouvrir les `callerIds` des `lib-*` du socle aux chefs** (voir ci-dessous) ; (d) **publier les enfants avant les parents** | Benj | 5 | chaque workflow publié répond à un appel de banc | dépublier (parents d'abord) |
| **8** | **Comptes volontaires.** Un Studio, un Signature, **avec leur accord écrit** ; l'organisation de Benj en client zéro. Aucun branchement sans accord (`mode-ombre.md` § 1) | Benj | 6 | l'accord écrit, rangé hors du dépôt | retirer la connexion (« Retirer ») |
| **9** | **Déploiement réel de la copie d'un client.** Fabriquer à blanc : `node scripts/deployer-client-n8n.mjs --client=<slug> --offre=studio|signature [--types=…]` ; importer chaque `client-<slug>-*` dans n8n **inactive** ; **brancher soi-même** les emplacements `EMPLACEMENT_<SLUG>_<type>` sur les identifiants du client (selon O3) ; poser les jetons `*_DU_CLIENT` restants (liste dans `client-<slug>-emplacements.json`). Un agent ne crée ni ne branche aucun identifiant | Benj | 1, 7, 8 | copie importée, inactive, emplacements branchés | supprimer la copie : les gabarits et les chefs ne bougent pas |
| **10** | **Mode ombre** sur le compte volontaire : `departements_reglages.palier = 'ombre'` pour **un département à la fois**, posé par Presti (acteur fondateur). Tout se prépare, **rien ne sort** ; les cartes sont comparées à ce que l'artisan a réellement fait (p6:370) — `mode-ombre.md` | Benj | 9 | comparaison quotidienne lue ; les cartes préparées recoupent ce que l'artisan a fait, ou l'écart est expliqué | `palier = 'simulation'` ou `'arret'` (`runbook.md` § 1.b-c) |
| **11a** | **Studio en réel.** `palier = 'reel'` : réponses, devis, relances **préparés** (cartes « À valider », brouillons dans la boîte) ; **jamais envoyés** : le juge le prouve (T2a, T2b). L'artisan valide d'un clic | Benj | 10 sur 7 jours sans écart | cartes vues par l'artisan, aucun envoi automatique | `arret` |
| **11b** | **Signature, type par type** : activer d'abord `reponse_prospect`, une semaine ; puis `relance_devis` ; puis `relance_impaye` (opt-in) ; `envoi_devis` seulement si toutes les lignes sont sourcées ; `envoi_facture` d'une facture déjà émise. **Jamais** les gestes de `OUTILS_JAMAIS_AUTO`. Chaque type garde 10 minutes d'annulation et 20 par jour (T5) | Benj | 11a ; plafonds relus | un type = une semaine de journal sans doublon (requête « envois en double », `kpis-base.md` § 9) | désactiver le type (la carte revient) |
| **12** | **Premier envoi réel à un client d'un artisan** : toujours précédé de l'accord de l'artisan et d'un envoi à soi-même (« vers moi d'abord ») | Benj + l'artisan | 11a | l'e-mail reçu, sans le mot « Presti », avec la mention d'IA et le `Reply-To` de l'artisan (`lib/email.ts:6-11`) | `arret` |

### Étape 7 (c) — les `callerIds` à ouvrir, relevés sur les exports

Les socles `lib-*` n'acceptent aujourd'hui que leurs appelants du prompt 5 (`workflowsFromAList`). **Aucun des huit chefs ni le Cerveau n'y figure**, relevé sur les
exports de `.orchestre/preuves/035-003` à `035-005` (ce sont des exports : lire la liste réelle dans n8n avant d'agir). À ajouter aux `callerIds` de chacun des sept
(`lib-decider` `hckqX1tQjIommtTH`, `lib-porte-conformite` `8c8vkUeSkfgB5FAM`, `lib-executer` `ADX5mPWqIvq1LGs6`, `lib-relancer` `jGM56jxeLUVXZIiM`,
`lib-rediger-message` `xfRUnkwOKSwQezVb`, `lib-journaliser` `NQg0KDXIa5hhzAvq`, `lib-qualifier-lead` `uvGWZR8fHnXURRV6`) :

`presti-cerveau 596OC5mL2aMBq6SD` · `presti-dep-accueil Ls0oFcQzzAk0rWcP` · `presti-dep-devis dNikTYPKKsivUbd3` · `presti-dep-suivi jo8eQMEwiB9wCbKN` ·
`presti-dep-facturation bNAF6Xzx5On853kD` · `presti-dep-apres L3GOS7euxi60jCZN` · `presti-dep-operations 74bDhTw6cEBzPORZ` · `presti-dep-direction oHGOyqsZGoUooxa6`

Seuls ceux qu'un chef appelle réellement sont nécessaires ; la liste ci-dessus est la plus large que les exports montrent, à resserrer sur ce que chaque chef
appelle (colonne « appelle » des exports). Jamais `any` : le juge commun (R11) le refuse.

### Étape 7 (d) — l'ordre de publication

1. **Les socles** `lib-*` d'abord (ils n'appellent personne), puis les spécialistes de lots : `lib-trier-demande`, `lib-lire-photo`, `lib-boite-lire`, `lib-boite-brouillon`, `lib-boite-envoyer`,
   `lib-controler-conflit`, `lib-avis-lire`, `lib-avis-repondre`, `lib-alerte-liste`, `lib-cout-ia`, `lib-agenda-creneaux`, `lib-synchroniser-outil`.
2. **Les chefs** `presti-dep-*` (ils appellent les `lib-*`).
3. **Le Cerveau** `presti-cerveau`, puis les parents planifiés (`presti-boite`, …).
4. **Les bancs** `presti-banc-*` (appelables par personne : `callerPolicy: none`) restent **inactifs** : ils servent à l'essai, pas à la marche.
5. **Les copies client** (`client-<slug>-*`) en dernier, jamais avant leur chef.

Publier un parent avant son enfant fait échouer son premier passage (`fiche-methode-n8n.md`, point 2).

## Ce qui n'est PAS dans cet ordre et reste à Benj, indépendamment

- Application OAuth Google et, s'il le veut, l'évaluation de sécurité annuelle de Google (décision 2, 500 à 6 000 dollars par an selon des sources non officielles) : `connecteurs/verification-google.md` est **rédigé, pas envoyé**. Tant qu'il n'y a pas d'OAuth Google vérifié, l'IMAP/SMTP existant fait la boîte mail (décision 2, défaut appliqué).
- Demande d'accès à l'API des avis Google (décision 3) : rédigée, laissée à Benj.
- SMS par un fournisseur (décision 4) : fermé (`SMS_COUT_APPROUVE = null`) ; le SMS préparé et ouvert d'un geste reste gratuit.
- Rendez-vous posé seul en Signature (décision 5) : **non**, jamais sans accord écrit et tests de 036-008.
- Pour Hermes : une clé API propre dans un espace de travail à plafond (`architecture-outils.md`) ; sans rapport avec cet ordre, mais à ne pas oublier avant de lui confier du volume.
