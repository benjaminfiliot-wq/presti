<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-30T01:23:17Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 162 tâche(s) PASS, 205498 ligne(s) · faites par Claude Code : 90 tâche(s) PASS, 81982 ligne(s).
**État** — file : 23 · en cours : 7 · faites : 259 · refusées : 16

## Attention (7)
- 026-138 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-138 --forcer`
- 026-156 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-156 --forcer`
- 026-254 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-254 --forcer`
- 026-103 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-103 --forcer`
- 026-122 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-122 --forcer`
- 026-227 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-227 --forcer`
- 6 question(s) en attente : `026-087` — `node scripts/orchestre.mjs repondre 026-087 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-145 | feature | en-cours | usine-codex-506 | — | depuis 2026-09-30T01:22:54Z · Créer la route POST /api/prospects/entrant (demande « Recevoir la maquette de mon site », 4 champs, une adresse e-mail obligatoire, seule voie pour lui envoyer sa maquette, et une case d'accord), fermée par le nouveau drapeau prospectsEntrant baissé, qui refuse une adresse bannie, piège les robots, plafonne par adresse et par jour, valide les champs par normaliserDemandeEntrante (la normalisation commune du formulaire, des commentaires et des messages) et enregistre un candidat entrant chaud (froid false) par acq_candidats_enregistrer, dont le canal e-mail porte case_cochee_le (la case cochée devient la preuve de demande { type: 'case_entrant', id } des messages que le Gmail de prospection lui enverra), avec la même réponse qu'il soit créé, déjà connu ou en opposition, jusqu'au vert de scripts/prospects-entrant-qa.mjs |
| 026-087 | feature | en-cours | usine-codex-492 | — | depuis 2026-09-30T01:14:36Z · Créer lib/agents/acquisition/redacteur.ts (la Plume) : executerRedacteur prépare pour le Facteur, sans modèle de langage et seulement quand l'envoi à froid est ouvert, les premiers contacts par le formulaire de contact du site (formulaire_B_v1, formulaire_A_v1 si la variante A est levée et la maquette prête, formulaire_studio_v1 pour une marque), un par entreprise, dans le reste du plafond du formulaire, avec un fait vérifié, une douleur approuvée du métier, l'adresse de prospection, la notice et une référence, sans jamais dépasser le champ du formulaire ; et preparerMessageLien rédige le message qui suit un oui, par le Gmail de prospection avec sa preuve de demande ou dans la conversation Meta ; rien ne va au magasin sans l'accord de jugerMessage |
| 026-134 | feature | en-cours | usine-codex-495 | — | depuis 2026-09-30T01:14:59Z · Écrire la migration 0104_crieur (table crieur_posts fermée à tous sauf service_role, qui garde les publications du Crieur sur LinkedIn, Facebook et Instagram, déposées en brouillon Publora avec leur créneau proposé en attendant l'accord de Benj pour chacune (R24, décision du 27/09 qui remplace R7), et les raisons d'un refus du juge, fonction public.crieur_appel qui lit cron_secret dans le Vault et appelle /api/cron/crieur par pg_net, tâche pg_cron presti-crieur chaque jour à 5 h UTC), ses jumeaux et son contrôle, puis l'éprouver à sec avant que Claude Code l'applique par le connecteur Supabase |
| 026-175 | feature | en-cours | usine-codex-500 | — | depuis 2026-09-30T01:15:27Z · Écrire la migration 0113_station_reglages.sql (numéro provisoire : ops.station_reglages à une seule ligne, ops.station_reglages_historique des 50 dernières versions, station_reglages_lire et station_reglages_ecrire SECURITY DEFINER réservées à service_role avec refus d'une version périmée, d'une clé inconnue et de plus de 64 Ko, pilotage_radar, pilotage_prospects_departements agrégé et pilotage_activite_salles, graines des cinq personnages de la station encore sans identité : garde, tresorier, studio, contenu, douleurs), ses deux jumeaux, son contrôle et le compte rendu d'un essai à sec généré par le juge, puis l'appliquer soi-même par le connecteur Supabase |
| 026-221 | feature | en-cours | usine-codex-501 | — | depuis 2026-09-30T01:15:41Z · Installer OpenClaw confiné sur l’usine selon la relecture de complétude du 27/09 |
| 026-226 | feature | en-cours | usine-codex-502 | — | depuis 2026-09-30T01:15:53Z · Passe mensuelle des douleurs selon la relecture de complétude du 27/09 |
| 026-099 | test | en-cours | usine-codex-486 | — | depuis 2026-09-30T01:08:58Z · Écrire scripts/juges-026-envoi-mutations.mjs, qui prouve sur des copies que les huit juges de l'envoi automatique, de l'entrant et de la fabrication (disjoncteurs-qa, jauges-qa, facteur-qa, meta-webhooks-qa, repondeur-qa, rendez-vous-qa, maquette-video-qa, douleurs-qa) échouent chacun sur de vraies fautes avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-091 | test | file | usine-codex-333 | — | Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-194 | test | file | claude-code | — | Écrire scripts/pont-telegram-qa.mjs (critères PT, parties routes, usine et reel) et scripts/usine-durcie-qa.mjs (critères UD, statique et --reel), avec leurs jeux d'essai, et prouver qu'ils échouent aujourd'hui et passent en témoin |
| 026-152 | test | file | claude-code | — | Écrire scripts/juges-026-lt-mutations.mjs, qui prouve sur des copies que chacun des 16 juges du domaine livraison et trésorerie échoue, sur le critère attendu, face à une vraie faute plantée dans le code PASS, et passe sur l'arbre réel ; code 0 seulement si chaque mutation est prise et chaque témoin passe |
| 026-083 | feature | file | claude-code | — | Créer lib/agents/acquisition/modeles.ts (le modèle de formulaire du §1.1 de la voie gratuite, variantes B et A, le formulaire du Studio, les sujets, les pieds, le message du lien et sa seule relance, la réponse privée, les messages du Répondeur et du Studio, chacun avec son empreinte et approuve à false), affirmations.ts, faq.ts, conformite.ts dont jugerMessage refuse tout message qui n'est pas exactement un modèle approuvé rempli par un fait vérifié et une douleur approuvée, ou qui oublie la première phrase, l'identité, la source de la liste, la notice, l'adresse de réponse, le STOP ou la référence, porte un lien ou prestiapp.fr dans un formulaire, un prix au premier message, un texte plus long que le champ, un e-mail sans preuve de demande, ou dépasse les règles de contact, et secondJuge.ts qui juge le ton et les promesses implicites par un lecteur injecté, fermé par défaut et étalonné sur un jeu de pièges |
| 026-133 | test | file | usine-codex-137 | — | Écrire scripts/juges-026-usine-mutations.mjs, qui prouve sur des copies que usine-socle-qa, usine-sql-qa, usine-routes-qa, usine-production-qa et les groupes consigne (schéma de réunion), consignes, fil et usine de chef-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-151 | test | file | usine-codex-126 | — | Écrire scripts/juges-026-orchestre-chef-mutations.mjs, qui prouve sur des copies que preuve-026 (groupes source, baux, quota), chef-qa, revue-qa et chantier-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-170 | test | file | claude-code | — | Écrire le juge propre à Claw3D station-claw3d-qa (dix parties : provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene ; csp et poids sur un build de production de la copie), le format du thème (theme.schema.json), un thème d'essai neutre sans donnée, une session simulée sans compte ni clé pour faire tourner les juges de rendu sur l'usine, un témoin minimal par partie (jamais un moteur complet) et le lot k de la preuve, chaque partie échouant sur un moteur piégé et passant sur son témoin |
| 026-171 | test | file | claude-code | — | Écrire les juges des modules purs, des thèmes, des réglages, de l'extraction du Poste et de la branche réservée (station-themes-qa --partie=modules et --theme=station\|vaisseau, station-reglages-qa, poste-extraction-qa, ecommerce-reservee-qa) avec leurs jeux d'essai et le lot t de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 023-03 | test | file | claude-code | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | claude-code | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-155 | feature | file | usine-codex-112 | — | Écrire scripts/studio/garde.mjs, qui refuse d'ouvrir un échantillon du Studio tant que les préalables datés de 026-128 (licences de la chaîne gratuite avec le droit commercial, fiche ARPP, activité de l'EI ; ni juriste ni compte Instagram) et le dossier de la marque (accord écrit tiré de sa réponse, page produit datée de moins de 30 jours, absence de refus) manquent, ainsi que docs/studio/modeles-messages.md (qui renvoie aux modèles de lib/agents/acquisition/modeles.ts sans les recopier) et docs/studio/seance.md (la séance de Claude Code ouverte par une décision studio_echantillon, jusqu'au dépôt de l'échantillon et à l'envoi par le Répondeur) |
| 026-252 | feature | file | claude-code | — | Faire passer `next build --webpack` (Next 16, fiche 026-006) en coupant l'import Node natif (`node:crypto`, `node:zlib`) qui remonte jusqu'au bundle client via `app/controle/Sites.tsx`, sans toucher à la logique de `lib/siteDossier.ts`, `lib/siteRetrait.ts` ni `lib/zip.ts` |
| 026-113 | feature | file | antigravity | — | Remplir le cadre Vues.tsx posé par 026-111 : ?vue=missions (le Commandement en grand, chaque mission avec sa barre, sa valeur, sa cible et ce qu'elle débloque), ?vue=succes (tous les succès : débloqués avec leur date, à venir grisés, jamais cachés), ?vue=aide (légende des points, des cartes, des compteurs et des six genres de salle dont « réservée », raccourcis I, Échap, +, −, ⊞, flèches, et pour chaque compteur « d'où vient ce chiffre », lu dans la source servie), en lecture seule, à 390 px comme à 1440 px |
| 026-117 | feature | file | antigravity | — | Donner à la station ses gestes (une carte Attention de décisions ouvre les décisions avec 2 à 7 boutons chacune et le mot de passe quand elle engage, une carte d'appels ouvre les appels à rendre, rendez-vous réservés et réponses, chacun avec « Appel rendu », les quatre gestes du fondateur sur l'envoi sous mot de passe dans un composant exporté pour la Salle des envois, l'interrupteur AUTO coupe ou relance tout sous mot de passe, Pause et Reprendre sur chaque agent sous mot de passe), le lien profond vers une décision, aucun bouton pour le rôle lecture, et aucun geste d'envoi, à 390 px comme à 1440 px |
| 026-123 | feature | file | antigravity | — | Remplir le cadre du journal de la station : le Journal de bord en direct (une bulle par événement réel, pastille de l'agent, heure de Paris, texte en police mono, filtre par agent, comptes rendus de réunion groupés) et le champ « ▶ Transmettre à l'équipage… » qui envoie la consigne de Benj à la route de 026-074, sans jamais afficher une bulle que le fil n'a pas servie |
| 026-150 | test | file | codex | — | Écrire scripts/juges-026-securite-mutations.mjs, qui prouve sur des copies que media-octets-qa, instantane-quotidien-qa, git-garde-qa et next16-qa (mode --statique) échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-167 | test | file | codex | — | Écrire scripts/juges-026-studio-offre-mutations.mjs, qui prouve sur des copies que le juge de l'offre du Studio (studio-offre-qa, écrit en 026-128) échoue sur une vraie faute de 026-166 avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et le témoin passe |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-179 | feature | file | codex | — | Copier dans app/controle/station/moteur/claw3d/ le squelette 2D de Claw3D que garde le §0.3 (hôte Phaser réécrit en mode station seul avec un module CSS, pont vers React, types de carte, buildNavGrid2D et astar2D, générateur d'avatar) et, dans moteur/scene/, la scène pixel art de l'atelier sans roomFor, le peintre d'agents et la seule palette, avec LICENSE-claw3d.txt et PROVENANCE.md ; écrire le point d'entrée moteur/entree.tsx et ses accroches vides ; charger ce point d'entrée dans Carte.tsx par next/dynamic sans rendu serveur, seulement drapeau stationCarte levé ; poser stationCarte: false et sa ligne de carte ; ajouter station\/.* à CHEMINS_APP_PRESTI de proxy.ts, jusqu'au vert de station-claw3d-qa (provenance, garde, csp, poids, repos, hygiene) |
| 026-199 | test | file | claude-code | — | Écrire scripts/usine-pubs-qa.mjs (critères UP, parties routes, tourneur, unites et reel : la fabrication des packs pubs payés et des échantillons du Studio sur l'usine, PC éteint, par la chaîne gratuite) et scripts/search-console-qa.mjs (critères SC : la soumission automatique du plan d'un site vendu à la Search Console par un compte de service), avec leurs jeux d'essai, et prouver qu'ils échouent aujourd'hui et passent en témoin |
| 026-242 | test | file | claude-code | — | Écrire scripts/comptable-qa.mjs (critères CPT) et ses jeux d'essai (Stripe factice en lecture seule avec une clé d'écriture piégée, ventes et abonnements factices, seuil de franchise 293 B daté) qui prouvent que le module du Comptable rapproche chaque encaissement d'une vente sans double compte, suit le seuil de franchise sans jamais le dépasser sans alerte, prépare des montants de déclaration jamais déposés ni payés, ne touche à aucune mention de TVA et n'envoie une donnée financière ou de client qu'à Codex ou à un moteur local, jamais à un gratuit ni à un :cloud |
| 026-244 | test | file | claude-code | — | Écrire scripts/sav-qa.mjs (critères SAV) et ses jeux d'essai (messages de clients déjà payants dont un corpus d'injection, brouillons factices, compteur des 20 approbations sans retouche, cas remboursement et litige) qui prouvent que le module du SAV répond dans le fil du bon client avec le ton de Presti, ne part jamais sans un portier, escalade tout remboursement ou litige à Benj, et n'envoie une donnée de client qu'à Codex ou à un moteur local, jamais à un gratuit ni à un :cloud |
| 026-246 | test | file | claude-code | — | Écrire scripts/qualite-sites-qa.mjs (critères QSI) et ses jeux d'essai (serveur factice de sites livrés avec des pannes réglables : HTTP, HTTPS, poids, accessibilité, liens morts, mentions légales absentes, formulaire cassé) qui prouvent que le Contrôleur qualité mesure le rendu réel d'un site livré sans jamais le modifier, sans jamais soumettre un faux message dans son formulaire, et propose une correction au Livreur ou à Claude Code par une décision plutôt que d'agir lui-même |
| 026-239 | feature | fait | usine-codex-503 | PASS | 2026-09-30T01:22:15Z · 41s · 1050 l. |
| 026-092 | feature | refuse | usine-codex-334 | FAIL | station-route-qa --partie=lecture — racine C:\Users\benja\Documents\presti — base cac779e — sources, doublures, puis vivant (arbre réel, copie au drapeau levé, |
| 026-008 | feature | fait | claude-code | PASS | 2026-09-29T21:35:24Z · 444s · 825 l. |
| 026-162 | feature | fait | claude-code | PASS | 2026-09-29T21:19:32Z · 8s · 0 l. |
| 026-096 | feature | fait | claude-code | PASS | 2026-09-29T21:11:58Z · 44s · 1218 l. |
| 026-166 | feature | fait | claude-code | PASS | 2026-09-29T21:11:44Z · 10s · 7 l. |
| 026-095 | feature | fait | codex | PASS | 2026-09-29T20:47:05Z · 147s · 0 l. |
| 026-157 | feature | fait | codex | PASS | 2026-09-29T20:43:52Z · 182s · 0 l. |
| 026-213 | feature | fait | codex | PASS | 2026-09-29T20:02:17Z · 9s · 0 l. |
| 026-156 | feature | refuse | antigravity | FAIL | decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-111 | feature | refuse | claude-code | FAIL | decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-227 | feature | refuse | usine-codex-198 | DISJONCTÉE | bail expiré : usine-codex-169 silencieux depuis 79 min \| bail expiré : usine-codex-187 silencieux depuis 64 min \| bail expiré : usine-codex-198 silencieux depuis 60 min |
| 026-122 | feature | refuse | usine-codex-196 | DISJONCTÉE | bail expiré : usine-codex-166 silencieux depuis 61 min \| bail expiré : usine-codex-184 silencieux depuis 61 min \| bail expiré : usine-codex-196 silencieux depuis 63 min |
| 026-218 | feature | fait | codex | PASS | 2026-09-29T19:19:13Z · 140s · 0 l. |
| 026-214 | feature | fait | codex | PASS | 2026-09-29T19:17:34Z · 21s · 0 l. |
| 026-212 | feature | fait | codex | PASS | 2026-09-29T19:14:45Z · 44s · 0 l. |
| 026-090 | feature | fait | codex | PASS | 2026-09-29T18:58:19Z · 94s · 0 l. |
| 026-103 | feature | refuse | usine-codex-188 | DISJONCTÉE | bail expiré : usine-codex-165 silencieux depuis 61 min \| bail expiré : usine-codex-182 silencieux depuis 60 min \| bail expiré : usine-codex-188 silencieux depuis 70 min |
| 026-254 | contenu | refuse | usine-codex-183 | DISJONCTÉE | bail expiré : usine-codex-144 silencieux depuis 63 min \| bail expiré : usine-codex-170 silencieux depuis 77 min \| bail expiré : usine-codex-183 silencieux depuis 61 min |
| 026-088 | feature | fait | claude-code | PASS | 2026-09-29T17:57:02Z · 18s · 2310 l. |
| 026-089 | feature | fait | codex | PASS | 2026-09-29T17:30:22Z · 74s · 0 l. |
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

… 205 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
