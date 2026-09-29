<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-29T11:58:53Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 138 tâche(s) PASS, 199380 ligne(s) · faites par Claude Code : 82 tâche(s) PASS, 76236 ligne(s).
**État** — file : 13 · en cours : 13 · faites : 226 · refusées : 8

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-157 | feature | en-cours | usine-codex-108 | — | depuis 2026-09-29T00:01:10Z · Écrire scripts/pack-pub/exporter.mjs (une ligne packs_pubs payée devient un dossier pack.json local, sans courriel, et signale la voix à produire) et scripts/pack-pub/deposer.mjs (juge local vert d'abord, puis dépôt de sortie/ dans le bucket privé packs-pubs avec une marge de 400 Mo et passage payee → fabriquee) |
| 026-156 | feature | en-cours | ag-026-156 | — | depuis 2026-09-28T23:57:50Z · Écrire scripts/pack-pub/fabriquer.mjs qui, depuis un dossier de pack, prépare les photos (octets vérifiés, sans métadonnées), refuse une personne sans accord, écrit le manifeste des entrées, instancie et rend les trois films et les trois visuels avec HyperFrames en local, puis appelle textes.mjs, pour produire un sortie/ que pub-locale-qa accepte sur les trois jeux d'essai |
| 026-138 | audit | en-cours | claude-code | — | depuis 2026-09-28T21:56:26Z · Prouver en production que l'horloge a tenu 24 h sans le poste : au moins 1 380 minutes exécutées par pg_cron sans trou de plus de 10 min, au moins 276 passages du veilleur A0 sans trou de plus de 15 min, les deux digests du jour partis, aucun message d'argent en souffrance non signalé, et au plus 3 notifications non urgentes par jour de Paris |
| 026-170 | test | en-cours | claude-code | — | depuis 2026-09-28T18:53:44Z · Écrire le juge propre à Claw3D station-claw3d-qa (dix parties : provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene ; csp et poids sur un build de production de la copie), le format du thème (theme.schema.json), un thème d'essai neutre sans donnée, une session simulée sans compte ni clé pour faire tourner les juges de rendu sur l'usine, un témoin minimal par partie (jamais un moteur complet) et le lot k de la preuve, chaque partie échouant sur un moteur piégé et passant sur son témoin |
| 023-03 | test | en-cours | claude-code | — | depuis 2026-09-28T21:43:03Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | claude-code | — | depuis 2026-09-29T00:26:10Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-083 | feature | en-cours | claude-code | — | depuis 2026-09-29T11:08:43Z · Créer lib/agents/acquisition/modeles.ts (le modèle de formulaire du §1.1 de la voie gratuite, variantes B et A, le formulaire du Studio, les sujets, les pieds, le message du lien et sa seule relance, la réponse privée, les messages du Répondeur et du Studio, chacun avec son empreinte et approuve à false), affirmations.ts, faq.ts, conformite.ts dont jugerMessage refuse tout message qui n'est pas exactement un modèle approuvé rempli par un fait vérifié et une douleur approuvée, ou qui oublie la première phrase, l'identité, la source de la liste, la notice, l'adresse de réponse, le STOP ou la référence, porte un lien ou prestiapp.fr dans un formulaire, un prix au premier message, un texte plus long que le champ, un e-mail sans preuve de demande, ou dépasse les règles de contact, et secondJuge.ts qui juge le ton et les promesses implicites par un lecteur injecté, fermé par défaut et étalonné sur un jeu de pièges |
| 026-084 | feature | en-cours | claude-code | — | depuis 2026-09-29T06:12:20Z · Créer la page de rendez-vous maison (décision R14, 0 €) : lib/agents/acquisition/rendezVous.ts (disponibilités de Benj, créneaux libres de 15 min, validation d'une réservation) et la route app/rendez-vous/[jeton]/route.ts qui sert, sans traçage ni script, une page privée noindex où le prospect choisit un créneau et laisse son numéro, réserve sans double réservation, crée la carte « À appeler » et prévient Benj par une notification sans donnée personnelle, avec la même 404 pour un lien inconnu, mal formé ou expiré |
| 026-088 | feature | en-cours | usine-codex-124 | — | depuis 2026-09-29T10:59:12Z · Écrire la migration *_pilotage_station.sql (tables fermées ops.reunions et ops.experiences, quatorze fonctions public.station_* SECURITY DEFINER réservées à service_role : consigne de Benj écrite comme événement, pause posée (jamais levée) et consigne au Chef par le pont Telegram, réunion quotidienne ouverte, chiffrée sans modèle, close ou abandonnée par le seul Chef, objectif actif, expérience isolée à budget nul refusée tant qu'aucune vente n'existe et arrêtée seule à J30, deux passages pg_cron, graine de l'agent pont_telegram), ses jumeaux, son contrôle et le compte rendu d'un essai à sec généré par le juge |
| 026-133 | test | en-cours | usine-codex-121 | — | depuis 2026-09-29T10:19:50Z · Écrire scripts/juges-026-usine-mutations.mjs, qui prouve sur des copies que usine-socle-qa, usine-sql-qa, usine-routes-qa, usine-production-qa et les groupes consigne (schéma de réunion), consignes, fil et usine de chef-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-151 | test | en-cours | usine-codex-126 | — | depuis 2026-09-29T11:00:00Z · Écrire scripts/juges-026-orchestre-chef-mutations.mjs, qui prouve sur des copies que preuve-026 (groupes source, baux, quota), chef-qa, revue-qa et chantier-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-171 | test | en-cours | claude-code | — | depuis 2026-09-29T11:08:32Z · Écrire les juges des modules purs, des thèmes, des réglages, de l'extraction du Poste et de la branche réservée (station-themes-qa --partie=modules et --theme=station\|vaisseau, station-reglages-qa, poste-extraction-qa, ecommerce-reservee-qa) avec leurs jeux d'essai et le lot t de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-235 | feature | en-cours | usine-codex-130 | — | depuis 2026-09-29T11:57:38Z · Écrire scripts/savoir/lecons.mjs (candidats depuis les verdicts en échec, les décisions tranchées par Benj, les décisions tranchées du bus et les corrections des fiches, datées, sourcées, caviardées et idempotentes ; lister ; valider et rejeter par Claude Code ou la revue du lundi seulement, jamais sur l'usine ; verifier-source), jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=candidats,validation |
| 026-155 | feature | file | usine-codex-112 | — | Écrire scripts/studio/garde.mjs, qui refuse d'ouvrir un échantillon du Studio tant que les préalables datés de 026-128 (licences de la chaîne gratuite avec le droit commercial, fiche ARPP, activité de l'EI ; ni juriste ni compte Instagram) et le dossier de la marque (accord écrit tiré de sa réponse, page produit datée de moins de 30 jours, absence de refus) manquent, ainsi que docs/studio/modeles-messages.md (qui renvoie aux modèles de lib/agents/acquisition/modeles.ts sans les recopier) et docs/studio/seance.md (la séance de Claude Code ouverte par une décision studio_echantillon, jusqu'au dépôt de l'échantillon et à l'envoi par le Répondeur) |
| 026-253 | feature | file | claude-code | — | Adapter scripts/budget-perf.mjs à la sortie de build de Next 16 --webpack (le fichier .next/app-build-manifest.json qu'il lisait a disparu), en gardant la même mesure honnête du poids réellement transféré pour /site/[slug] et /p/[slug], jusqu'au vert de next16-qa --groupe=dependances (N16-1 à N16-7) |
| 026-252 | feature | file | claude-code | — | Faire passer `next build --webpack` (Next 16, fiche 026-006) en coupant l'import Node natif (`node:crypto`, `node:zlib`) qui remonte jusqu'au bundle client via `app/controle/Sites.tsx`, sans toucher à la logique de `lib/siteDossier.ts`, `lib/siteRetrait.ts` ni `lib/zip.ts` |
| 026-073 | contenu | file | codex | — | Constituer la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts (au moins 40 entrées sur au moins 8 métiers du bâtiment, chacune tirée de ce que des artisans écrivent eux-mêmes en public, avec la citation exacte, sa page source et sa date, les mots-clés, une question « qui appuie là où ça fait mal » et une accroche d'objet, sans aucune donnée personnelle, toutes à approuve false jusqu'à l'approbation unique de Benj) et sa méthode docs/agents/douleurs-methode.md, pour que chaque citation se retrouve mot pour mot sur sa page quand le juge la relit |
| 026-091 | test | file | codex | — | Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-139 | feature | file | codex | — | Écrire le crochet hooks/git-garde.mjs de l'orchestre (PreToolUse Bash et PowerShell), qui refuse en code 2 toute commande git ou de suppression destructrice où qu'elle soit dans la ligne, le brancher dans gabarits/settings.json et le recopier dans presti par maj, jusqu'au vert de ../orchestre/test/git-garde-qa.mjs |
| 026-144 | feature | file | antigravity | — | Créer la page /pubs/commander où l'artisan choisit 6 à 12 de ses photos, dit qui y figure et avec quel accord, donne ses faits, choisit accroche et voix, puis paie 149 €, et la carte CartePackPub montrée sur le tableau de bord sous le drapeau packPubVente |
| 026-152 | test | file | codex | — | Écrire scripts/juges-026-lt-mutations.mjs, qui prouve sur des copies que chacun des 16 juges du domaine livraison et trésorerie échoue, sur le critère attendu, face à une vraie faute plantée dans le code PASS, et passe sur l'arbre réel ; code 0 seulement si chaque mutation est prise et chaque témoin passe |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-222 | feature | file | codex | — | Cursor comme exécutant borné de l’orchestre selon la relecture de complétude du 27/09 |
| 026-224 | feature | file | codex | — | Fish Audio sous garde de licence et quota selon la relecture de complétude du 27/09 |
| 026-233 | feature | file | codex | — | Écrire lib/savoir/recherche.ts (chercher : le savoir d'abord dans les classes de l'agent, puis le web par lireAvecFirecrawl sous la réserve de crédits, Perplexity seulement plan et coût constatés, refus de toute donnée personnelle dans une requête web, chaque résultat sourcé, un événement savoir_recherche ; avecRecherche : deux besoins et une relance au plus) et scripts/savoir/chercher.mjs (index de l'usine, journal par POST /api/agents/evenements avec le jeton de l'agent), jusqu'au vert de scripts/savoir-recherche-qa.mjs --partie=outil,cli |
| 026-237 | feature | file | claude-code | — | Brancher les leçons validées dans la porte unique des modèles (creerLecteur de lib/agents/llm.ts, les trois moteurs, leçons lues une fois à la création, sous l'interrupteur lecons_dans_consignes) et dans l'entrée du chef (scripts/chef/etat.mjs lance lecons-entree.mjs après l'état), dire le bloc <lecons_validees> dans docs/agents/chef.md, jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=branchement, de scripts/agents-llm-qa.mjs et de scripts/chef-qa.mjs --groupe=consigne,etat,cycle |
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
| 026-149 | feature | fait | usine-codex-94 | PASS | 2026-09-28T17:33:29Z · 88s · 385 l. |
| 026-074 | feature | fait | codex | PASS | 2026-09-28T17:32:51Z · 269s · 0 l. |
| 026-070 | feature | fait | codex | PASS | 2026-09-28T17:26:49Z · 49s · 0 l. |
| 026-137 | feature | fait | usine-codex-93 | PASS | 2026-09-28T17:22:44Z · 46s · 513 l. |
| 026-009 | test | fait | claude-code | PASS | 2026-09-28T17:13:27Z · 74s · 0 l. |
| 026-106 | feature | fait | usine-codex-91 | PASS | 2026-09-28T17:12:32Z · 57s · 497 l. |
| 026-232 | test | fait | claude-code | PASS | 2026-09-28T17:10:25Z · 499s · 0 l. |
| 026-078 | feature | fait | usine-codex-90 | PASS | 2026-09-28T17:08:54Z · 84s · 489 l. |
| 026-075 | feature | fait | usine-codex-89 | PASS | 2026-09-28T17:05:48Z · 59s · 444 l. |
| 026-100 | feature | fait | codex | PASS | 2026-09-28T16:41:28Z · 169s · 0 l. |
| 026-131 | contenu | fait | claude-code | PASS | 2026-09-28T16:29:35Z · 19s · 0 l. |
| 026-165 | test | fait | claude-code | PASS | 2026-09-28T16:28:55Z · 124s · 0 l. |
| 026-051 | feature | fait | codex | PASS | 2026-09-28T16:12:04Z · 37s · 0 l. |
| 026-043 | feature | fait | claude-code | PASS | 2026-09-28T16:06:08Z · 187s · 0 l. |
| 026-109 | feature | fait | claude-code | PASS | 2026-09-28T15:57:56Z · 54s · 0 l. |
| 026-234 | test | fait | claude-code | PASS | 2026-09-28T15:57:40Z · 276s · 0 l. |
| 026-068 | feature | fait | codex | PASS | 2026-09-28T15:56:27Z · 232s · 0 l. |
| 026-076 | feature | fait | claude-code | PASS | 2026-09-28T15:54:47Z · 8s · 0 l. |
| 026-071 | test | fait | claude-code | PASS | 2026-09-28T15:51:08Z · 31s · 0 l. |
| 026-248 | test | fait | claude-code | PASS | 2026-09-28T15:45:41Z · 289s · 0 l. |
| 026-229 | test | fait | claude-code | PASS | 2026-09-28T15:39:06Z · 328s · 0 l. |
| 026-114 | feature | fait | claude-code | PASS | 2026-09-28T15:35:08Z · 3s · 0 l. |
| 026-116 | test | fait | claude-code | PASS | 2026-09-28T14:25:19Z · 195s · 0 l. |
| 026-072 | feature | fait | codex | PASS | 2026-09-28T12:43:47Z · 258s · 0 l. |
| 026-077 | feature | fait | usine-codex-75 | PASS | 2026-09-28T12:05:37Z · 124s · 649 l. |
| 026-039 | contenu | fait | antigravity | PASS | 2026-09-28T11:44:10Z · 322s · 0 l. |
| 026-041 | test | fait | claude-code | PASS | 2026-09-28T11:37:03Z · 224s · 0 l. |
| 026-058 | feature | fait | claude-code | PASS | 2026-09-28T11:26:57Z · 5s · 0 l. |
| 026-069 | test | fait | claude-code | PASS | 2026-09-28T11:20:32Z · 33s · 0 l. |
| 026-049 | feature | fait | usine-codex-66 | PASS | 2026-09-28T11:17:07Z · 151s · 420 l. |
| 026-057 | feature | fait | usine-codex-69 | PASS | 2026-09-28T11:09:25Z · 88s · 702 l. |
| 026-107 | feature | fait | claude-code | PASS | 2026-09-28T11:08:26Z · 78s · 511 l. |
| 026-112 | feature | fait | claude-code | PASS | 2026-09-28T11:04:56Z · 195s · 622 l. |

… 160 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
