<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-29T18:06:58Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 152 tâche(s) PASS, 202405 ligne(s) · faites par Claude Code : 88 tâche(s) PASS, 81975 ligne(s).
**État** — file : 22 · en cours : 12 · faites : 247 · refusées : 12

## Attention (5)
- 026-008 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-008 --forcer`
- 026-138 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-138 --forcer`
- 026-157 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-157 --forcer`
- 026-239 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-239 --forcer`
- 026-156 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-156 --forcer`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-103 | feature | en-cours | usine-codex-188 | — | depuis 2026-09-29T17:33:27Z · Écrire scripts/chef/reunion.mjs, qui tient la réunion d'équipage quotidienne avec le jeton du Chef (ouvrir, rassembler les chiffres sans modèle, faire écrire au Chef un compte rendu de 1 à 5 lignes, un objectif et 3 idées au plus, les valider contre le schéma, poster les idées puis clore, ou abandonner dans un finally), sans jamais afficher le jeton, et sa notice docs/agents/reunion.md |
| 026-152 | test | en-cours | claude-code | — | depuis 2026-09-29T16:49:08Z · Écrire scripts/juges-026-lt-mutations.mjs, qui prouve sur des copies que chacun des 16 juges du domaine livraison et trésorerie échoue, sur le critère attendu, face à une vraie faute plantée dans le code PASS, et passe sur l'arbre réel ; code 0 seulement si chaque mutation est prise et chaque témoin passe |
| 026-227 | feature | en-cours | usine-codex-187 | — | depuis 2026-09-29T17:26:39Z · Lancer une expérience après la première vente selon la relecture de complétude du 27/09 |
| 026-254 | contenu | en-cours | usine-codex-183 | — | depuis 2026-09-29T17:13:33Z · Compléter la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts de 14 à au moins 40 citations réelles sur au moins 8 métiers du bâtiment (au moins 3 par métier couvert, 10 « tous » au plus), en ajoutant des entrées sans jamais en réécrire une existante, chacune retrouvée mot pour mot par le juge sur sa page publique, toutes à approuve false, et mettre à jour la liste des sources de docs/agents/douleurs-methode.md |
| 026-122 | feature | en-cours | usine-codex-184 | — | depuis 2026-09-29T17:22:40Z · Écrire lib/crieur/publora.ts (brouillons Publora, jamais de scheduledTime, sur LinkedIn, Facebook et Instagram avec le visuel du fait pour Instagram ; la publication attend l'accord de Benj pour chacune, R24, décision du 27/09 qui remplace R7), la route quotidienne GET /api/cron/crieur (CRON_SECRET, puis la pause générale qui arrête tout sans appeler Publora, mode à sec, une publication par canal et par semaine, chaque publication jugée par jugerPublication avant Publora, inscrite dans crieur_posts en brouillon_publora avec son créneau proposé, Benj prié d'accorder chaque brouillon), le drapeau aimantSite (baissé) qui retient « Commente SITE » tant que personne n'y répond, et la route GET /api/crieur/visuel/[id] qui dessine le texte d'un fait en image |
| 026-090 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:47:14Z · Créer la route app/api/webhooks/meta (GET de vérification par le jeton, POST fermé sans secret et signature X-Hub-Signature-256 vérifiée sur le corps brut avant toute lecture) et lib/agents/acquisition/metaWebhooks.ts, qui rangent sans doublon les commentaires « SITE » et les messages reçus sur Instagram et Facebook en conversations et en réponses, lisent le profil d'une personne seulement après qu'elle a écrit, et posent l'opposition d'un STOP dès la réception, sans jamais répondre eux-mêmes |
| 026-096 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:47:06Z · Créer lib/agents/acquisition/repondeur.ts et la route app/api/cron/repondeur : le Répondeur prépare, par les seuls modèles approuvés et sans modèle de langage, la réponse privée à chaque commentaire « SITE » et la réponse à chaque message classé (question tirée de la FAQ, prix, appel, confirmation d'un STOP, accusé d'une demande RGPD, questions à un entrant, suite du Studio pour une marque), par le Gmail de prospection dans le fil avec sa preuve de demande ou dans la conversation Meta, et la seule relance après un lien de maquette resté sans réponse, annoncée comme l'assistant IA de Presti, avec le lien de rendez-vous ou de paiement qui passe la main à Benj, sans jamais négocier, promettre hors de la liste, ni répondre à un cas sensible ou hostile ; le Facteur l'envoie après les juges |
| 026-111 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:46:54Z · Créer la station /controle/station (Mission Control plein écran, derrière le drapeau pilotage) : barre des compteurs en deux lignes, équipage, file Attention unique, Commandement (objectif, missions, niveau, compte rendu), bandeau des ventes, mise en page colonnes ou flottante, disposition téléphone à onglets, réglages lus au chargement, cadres réservés à la carte (avec la liste des salles), au journal, aux panneaux, aux vues et à l'habillage, jetons .mc-* par défaut dans le seul fichier de la station, et l'entrée « Station » du Poste qui y renvoie |
| 026-212 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:54:42Z · C09 — publication des Reels Instagram et vidéos Facebook par Graph, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-213 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:54:51Z · C10 — mesure par publication et attribution prudente, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-214 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:54:59Z · C11 — boucle d’apprentissage et score de republication, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-218 | feature | en-cours | claude-code | — | depuis 2026-09-29T17:55:10Z · C15 — relevé des jetons par agent et par IA, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-157 | feature | file | codex | — | Écrire scripts/pack-pub/exporter.mjs (une ligne packs_pubs payée devient un dossier pack.json local, sans courriel, et signale la voix à produire) et scripts/pack-pub/deposer.mjs (juge local vert d'abord, puis dépôt de sortie/ dans le bucket privé packs-pubs avec une marge de 400 Mo et passage payee → fabriquee) |
| 026-083 | feature | file | claude-code | — | Créer lib/agents/acquisition/modeles.ts (le modèle de formulaire du §1.1 de la voie gratuite, variantes B et A, le formulaire du Studio, les sujets, les pieds, le message du lien et sa seule relance, la réponse privée, les messages du Répondeur et du Studio, chacun avec son empreinte et approuve à false), affirmations.ts, faq.ts, conformite.ts dont jugerMessage refuse tout message qui n'est pas exactement un modèle approuvé rempli par un fait vérifié et une douleur approuvée, ou qui oublie la première phrase, l'identité, la source de la liste, la notice, l'adresse de réponse, le STOP ou la référence, porte un lien ou prestiapp.fr dans un formulaire, un prix au premier message, un texte plus long que le champ, un e-mail sans preuve de demande, ou dépasse les règles de contact, et secondJuge.ts qui juge le ton et les promesses implicites par un lecteur injecté, fermé par défaut et étalonné sur un jeu de pièges |
| 026-008 | feature | file | usine-codex-151 | — | Renommer middleware.ts en proxy.ts (fonction proxy, même matcher, même corps) et faire passer la CI et le lanceur nocturne par npm run build, jusqu'au vert complet de scripts/next16-qa.mjs (dépendances, code, service local sur le port 3161, suites e2e locales et juges verts avant la migration) |
| 026-133 | test | file | usine-codex-137 | — | Écrire scripts/juges-026-usine-mutations.mjs, qui prouve sur des copies que usine-socle-qa, usine-sql-qa, usine-routes-qa, usine-production-qa et les groupes consigne (schéma de réunion), consignes, fil et usine de chef-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-151 | test | file | usine-codex-126 | — | Écrire scripts/juges-026-orchestre-chef-mutations.mjs, qui prouve sur des copies que preuve-026 (groupes source, baux, quota), chef-qa, revue-qa et chantier-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-170 | test | file | claude-code | — | Écrire le juge propre à Claw3D station-claw3d-qa (dix parties : provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene ; csp et poids sur un build de production de la copie), le format du thème (theme.schema.json), un thème d'essai neutre sans donnée, une session simulée sans compte ni clé pour faire tourner les juges de rendu sur l'usine, un témoin minimal par partie (jamais un moteur complet) et le lot k de la preuve, chaque partie échouant sur un moteur piégé et passant sur son témoin |
| 026-171 | test | file | claude-code | — | Écrire les juges des modules purs, des thèmes, des réglages, de l'extraction du Poste et de la branche réservée (station-themes-qa --partie=modules et --theme=station\|vaisseau, station-reglages-qa, poste-extraction-qa, ecommerce-reservee-qa) avec leurs jeux d'essai et le lot t de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 023-03 | test | file | claude-code | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | claude-code | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-155 | feature | file | usine-codex-112 | — | Écrire scripts/studio/garde.mjs, qui refuse d'ouvrir un échantillon du Studio tant que les préalables datés de 026-128 (licences de la chaîne gratuite avec le droit commercial, fiche ARPP, activité de l'EI ; ni juriste ni compte Instagram) et le dossier de la marque (accord écrit tiré de sa réponse, page produit datée de moins de 30 jours, absence de refus) manquent, ainsi que docs/studio/modeles-messages.md (qui renvoie aux modèles de lib/agents/acquisition/modeles.ts sans les recopier) et docs/studio/seance.md (la séance de Claude Code ouverte par une décision studio_echantillon, jusqu'au dépôt de l'échantillon et à l'envoi par le Répondeur) |
| 026-252 | feature | file | claude-code | — | Faire passer `next build --webpack` (Next 16, fiche 026-006) en coupant l'import Node natif (`node:crypto`, `node:zlib`) qui remonte jusqu'au bundle client via `app/controle/Sites.tsx`, sans toucher à la logique de `lib/siteDossier.ts`, `lib/siteRetrait.ts` ni `lib/zip.ts` |
| 026-087 | feature | file | codex | — | Créer lib/agents/acquisition/redacteur.ts (la Plume) : executerRedacteur prépare pour le Facteur, sans modèle de langage et seulement quand l'envoi à froid est ouvert, les premiers contacts par le formulaire de contact du site (formulaire_B_v1, formulaire_A_v1 si la variante A est levée et la maquette prête, formulaire_studio_v1 pour une marque), un par entreprise, dans le reste du plafond du formulaire, avec un fait vérifié, une douleur approuvée du métier, l'adresse de prospection, la notice et une référence, sans jamais dépasser le champ du formulaire ; et preparerMessageLien rédige le message qui suit un oui, par le Gmail de prospection avec sa preuve de demande ou dans la conversation Meta ; rien ne va au magasin sans l'accord de jugerMessage |
| 026-091 | test | file | codex | — | Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-092 | feature | file | codex | — | Créer GET /api/controle/station?vue=direct\|fil\|salle\|agent (404 tant que le drapeau pilotage est baissé, garde fondateur, chaque sous-partie sourcée et lue seulement par les fonctions pilotage_* et station_* et les modules purs de lib/pilotage), lib/pilotage/station.ts, et les deux routes de la réunion réservées au jeton du Chef (POST /api/agents/reunion : ouvrir, clore, abandonner ; GET /api/agents/reunion/chiffres), inscrites dans la ligne pilotage de scripts/fermeture-e2e.mjs |
| 026-145 | feature | file | codex | — | Créer la route POST /api/prospects/entrant (demande « Recevoir la maquette de mon site », 4 champs, une adresse e-mail obligatoire, seule voie pour lui envoyer sa maquette, et une case d'accord), fermée par le nouveau drapeau prospectsEntrant baissé, qui refuse une adresse bannie, piège les robots, plafonne par adresse et par jour, valide les champs par normaliserDemandeEntrante (la normalisation commune du formulaire, des commentaires et des messages) et enregistre un candidat entrant chaud (froid false) par acq_candidats_enregistrer, dont le canal e-mail porte case_cochee_le (la case cochée devient la preuve de demande { type: 'case_entrant', id } des messages que le Gmail de prospection lui enverra), avec la même réponse qu'il soit créé, déjà connu ou en opposition, jusqu'au vert de scripts/prospects-entrant-qa.mjs |
| 026-162 | feature | file | claude-code | — | Publier la notice de confidentialité de la prospection et ses mentions légales (notice-prospection/index.html et notice-prospection/mentions-legales/index.html, 026-039) sur GitHub Pages, dans le dépôt public benjaminfiliot-wq/presti-notice, après le « oui » de Benj, écrire l'adresse obtenue dans NOTICE_URL (lib/agents/acquisition/contrat.ts, 026-016) et dans docs/agents/notice-prospection.md, jusqu'au vert de confidentialite-prospection-qa --hebergement --reel (les deux pages servies en 200, sans redirection vers un autre hôte, à l'empreinte des fichiers du dépôt, sans script ni lien vers prestiapp.fr) ; avant de publier, vérifier que le geste G3 de Benj est daté dans decisions.md (la notice dit l'entraînement coupé) ; et consigner la lecture datée des conditions de l'API ads_archive de Meta (docs/agents/meta-ads-archive-conditions.md et l'événement lecture_ads_archive, sans lequel la Plume ne contacte aucun prospect venu de la bibliothèque Meta) |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-221 | feature | file | codex | — | Installer OpenClaw confiné sur l’usine selon la relecture de complétude du 27/09 |
| 026-226 | feature | file | codex | — | Passe mensuelle des douleurs selon la relecture de complétude du 27/09 |
| 026-242 | test | file | claude-code | — | Écrire scripts/comptable-qa.mjs (critères CPT) et ses jeux d'essai (Stripe factice en lecture seule avec une clé d'écriture piégée, ventes et abonnements factices, seuil de franchise 293 B daté) qui prouvent que le module du Comptable rapproche chaque encaissement d'une vente sans double compte, suit le seuil de franchise sans jamais le dépasser sans alerte, prépare des montants de déclaration jamais déposés ni payés, ne touche à aucune mention de TVA et n'envoie une donnée financière ou de client qu'à Codex ou à un moteur local, jamais à un gratuit ni à un :cloud |
| 026-244 | test | file | claude-code | — | Écrire scripts/sav-qa.mjs (critères SAV) et ses jeux d'essai (messages de clients déjà payants dont un corpus d'injection, brouillons factices, compteur des 20 approbations sans retouche, cas remboursement et litige) qui prouvent que le module du SAV répond dans le fil du bon client avec le ton de Presti, ne part jamais sans un portier, escalade tout remboursement ou litige à Benj, et n'envoie une donnée de client qu'à Codex ou à un moteur local, jamais à un gratuit ni à un :cloud |
| 026-246 | test | file | claude-code | — | Écrire scripts/qualite-sites-qa.mjs (critères QSI) et ses jeux d'essai (serveur factice de sites livrés avec des pannes réglables : HTTP, HTTPS, poids, accessibilité, liens morts, mentions légales absentes, formulaire cassé) qui prouvent que le Contrôleur qualité mesure le rendu réel d'un site livré sans jamais le modifier, sans jamais soumettre un faux message dans son formulaire, et propose une correction au Livreur ou à Claude Code par une décision plutôt que d'agir lui-même |
| 026-095 | feature | refuse | claude-code | FAIL | ✅ PF-9 ni 2captcha/anti-captcha/capsolver/stealth/proxy/puppeteer-extra, ni storageState ; typecheck vert |
| 026-088 | feature | fait | claude-code | PASS | 2026-09-29T17:57:02Z · 18s · 2310 l. |
| 026-156 | feature | refuse | antigravity | FAIL | FAIL PL-1 — jeu-2 : scripts/pack-pub/fabriquer.mjs : code null — · check ok (76 s) ; jeu-3 : scripts/pack-pub/fabriquer.mjs : code null — · check ok (136 s) |
| 026-089 | feature | fait | codex | PASS | 2026-09-29T17:30:22Z · 74s · 0 l. |
| 026-239 | feature | refuse | usine-codex-173 | DISJONCTÉE | bail expiré : usine-codex-135 silencieux depuis 63 min \| bail expiré : usine-codex-149 silencieux depuis 63 min \| bail expiré : usine-codex-173 silencieux depuis 69 min |
| 026-147 | feature | fait | antigravity | PASS | 2026-09-29T16:33:19Z · 185s · 0 l. |
| 026-210 | feature | fait | claude-code | PASS | 2026-09-29T16:28:58Z · 12s · 695 l. |
| 026-085 | feature | fait | claude-code | PASS | 2026-09-29T16:23:22Z · 56s · 1120 l. |
| 026-237 | feature | fait | claude-code | FAIL | FAIL SVL-11 — git status : chemin(s) apparu(s) pendant ce passage : lib/agents/acquisition/porteurFormulaire.ts \| lib/agents/acquisition/porteurs/ (101 s) |
| 026-138 | audit | refuse | claude-code | DISJONCTÉE | bail expiré : claude-code silencieux depuis 919 min \| bail expiré : claude-code silencieux depuis 61 min \| bail expiré : claude-code silencieux depuis 60 min |
| 026-209 | feature | fait | codex | PASS | 2026-09-29T15:13:06Z · 24s · 0 l. |
| 026-236 | feature | fait | codex | PASS | 2026-09-29T15:03:52Z · 109s · 0 l. |
| 026-084 | feature | fait | codex | PASS | 2026-09-29T14:52:34Z · 70s · 0 l. |
| 026-144 | feature | fait | antigravity | PASS | 2026-09-29T14:52:29Z · 48s · 0 l. |
| 026-215 | feature | fait | codex | PASS | 2026-09-29T14:26:12Z · 17s · 0 l. |
| 026-233 | feature | fait | codex | PASS | 2026-09-29T14:24:37Z · 74s · 0 l. |
| 026-224 | feature | fait | codex | PASS | 2026-09-29T14:23:56Z · 21s · 0 l. |
| 026-073 | contenu | fait | codex | PASS | 2026-09-29T13:54:07Z · 27s · 0 l. |
| 026-207 | feature | fait | claude-code | PASS | 2026-09-29T13:08:19Z · 13s · 0 l. |
| 026-139 | feature | fait | claude-code | PASS | 2026-09-29T13:07:04Z · 74s · 990 l. |
| 026-235 | feature | fait | usine-codex-133 | PASS | 2026-09-29T12:28:37Z · 118s · 915 l. |
| 026-222 | feature | fait | claude-code | PASS | 2026-09-29T12:26:08Z · 1s · 400 l. |
| 026-208 | feature | fait | antigravity | PASS | 2026-09-29T12:13:49Z · 0s · 0 l. |
| 026-206 | feature | fait | claude-code | PASS | 2026-09-29T12:13:36Z · 0s · 2334 l. |
| 026-253 | feature | fait | claude-code | PASS | 2026-09-29T12:08:44Z · 419s · 0 l. |
| 026-158 | feature | fait | antigravity | PASS | 2026-09-29T11:51:24Z · 425s · 0 l. |
| 026-006 | feature | fait | claude-code | PASS | 2026-09-29T11:47:23Z · 381s · 9610 l. |
| 026-211 | feature | fait | claude-code | PASS | 2026-09-29T11:46:52Z · 1s · 473 l. |
| 026-205 | feature | fait | claude-code | PASS | 2026-09-29T11:22:24Z · 2s · 1053 l. |
| 026-045 | test | fait | claude-code | PASS | 2026-09-29T11:01:29Z · 206s · 0 l. |
| 026-231 | feature | fait | codex | PASS | 2026-09-29T10:58:48Z · 53s · 0 l. |
| 026-047 | feature | fait | codex | PASS | 2026-09-29T10:55:47Z · 509s · 0 l. |
| 026-079 | feature | fait | claude-code | PASS | 2026-09-29T10:48:36Z · 24s · 0 l. |
| 026-238 | test | fait | claude-code | PASS | 2026-09-29T10:28:24Z · 565s · 0 l. |
| 026-129 | feature | fait | usine-codex-118 | PASS | 2026-09-29T10:07:47Z · 219s · 937 l. |
| 026-141 | feature | fait | codex | PASS | 2026-09-29T10:01:36Z · 221s · 0 l. |
| 026-064 | feature | fait | usine-codex-114 | PASS | 2026-09-29T09:54:39Z · 41s · 612 l. |
| 026-026 | test | fait | claude-code | PASS | 2026-09-29T09:48:57Z · 1084s · 0 l. |
| 026-127 | feature | fait | usine-codex-117 | PASS | 2026-09-29T09:48:36Z · 74s · 584 l. |
| 026-154 | contenu | fait | codex | PASS | 2026-09-29T09:31:12Z · 2s · 0 l. |
| 026-115 | feature | fait | claude-code | PASS | 2026-09-29T09:31:04Z · 81s · 438 l. |
| 026-118 | feature | fait | codex | PASS | 2026-09-29T09:19:28Z · 219s · 0 l. |
| 026-063 | feature | fait | claude-code | PASS | 2026-09-29T09:12:19Z · 382s · 0 l. |
| 026-119 | feature | fait | codex | PASS | 2026-09-29T08:49:29Z · 6s · 0 l. |
| 026-230 | feature | fait | codex | PASS | 2026-09-29T08:45:37Z · 292s · 0 l. |
| 026-155 | feature | fait | usine-codex-112 | PASS | 2026-09-29T06:16:54Z · 52s · 576 l. |
| 026-012 | test | fait | claude-code | PASS | 2026-09-29T04:50:35Z · 451s · 0 l. |
| 026-012 | test | refuse | claude-code | PASS | 2026-09-29T04:50:35Z · 451s · 0 l. |
| 026-023 | test | fait | claude-code | PASS | 2026-09-29T03:29:32Z · 90s · 0 l. |
| 026-023 | test | refuse | claude-code | PASS | 2026-09-29T03:29:32Z · 90s · 0 l. |
| 026-032 | test | fait | claude-code | PASS | 2026-09-29T03:10:02Z · 80s · 0 l. |
| 026-029 | test | fait | claude-code | PASS | 2026-09-29T03:05:59Z · 51s · 0 l. |
| 026-081 | test | fait | claude-code | PASS | 2026-09-29T01:43:02Z · 10s · 0 l. |
| 026-016 | test | fait | claude-code | PASS | 2026-09-29T01:41:52Z · 12s · 0 l. |
| 026-082 | feature | fait | usine-codex-109 | PASS | 2026-09-29T00:52:56Z · 49s · 581 l. |
| 026-126 | test | fait | claude-code | PASS | 2026-09-29T00:34:29Z · 282s · 0 l. |
| 026-061 | feature | fait | claude-code | PASS | 2026-09-29T00:08:26Z · 24s · 0 l. |
| 026-110 | test | fait | claude-code | PASS | 2026-09-28T23:57:00Z · 94s · 0 l. |
| 026-080 | test | fait | claude-code | PASS | 2026-09-28T23:36:40Z · 8s · 0 l. |
| 026-128 | test | fait | claude-code | PASS | 2026-09-28T23:12:26Z · 59s · 0 l. |
| 026-153 | feature | fait | ag-026-153 | PASS | 2026-09-28T22:05:43Z · 65s · 770 l. |
| 026-135 | feature | fait | usine-codex-98 | PASS | 2026-09-28T18:37:42Z · 34s · 523 l. |
| 026-204 | test | fait | claude-code | PASS | 2026-09-28T18:34:35Z · 43s · 0 l. |
| 026-086 | feature | fait | usine-codex-87 | PASS | 2026-09-28T17:55:16Z · 2s · 1435 l. |
| 026-062 | test | fait | claude-code | PASS | 2026-09-28T17:46:08Z · 39s · 0 l. |
| 026-124 | test | fait | claude-code | PASS | 2026-09-28T17:40:16Z · 93s · 0 l. |

… 193 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
