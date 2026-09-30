<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-30T13:58:16Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 165 tâche(s) PASS, 207699 ligne(s) · faites par Claude Code : 91 tâche(s) PASS, 81681 ligne(s).
**État** — file : 41 · en cours : 0 · faites : 248 · refusées : 1

## Attention (7)
- 026-138 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-138 --forcer`
- 026-156 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-156 --forcer`
- 026-254 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-254 --forcer`
- 026-103 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-103 --forcer`
- 026-122 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-122 --forcer`
- 026-227 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-227 --forcer`
- 026-087 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-087 --forcer`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-134 | feature | file | usine-codex-691 | — | Écrire la migration 0104_crieur (table crieur_posts fermée à tous sauf service_role, qui garde les publications du Crieur sur LinkedIn, Facebook et Instagram, déposées en brouillon Publora avec leur créneau proposé en attendant l'accord de Benj pour chacune (R24, décision du 27/09 qui remplace R7), et les raisons d'un refus du juge, fonction public.crieur_appel qui lit cron_secret dans le Vault et appelle /api/cron/crieur par pg_net, tâche pg_cron presti-crieur chaque jour à 5 h UTC), ses jumeaux et son contrôle, puis l'éprouver à sec avant que Claude Code l'applique par le connecteur Supabase |
| 026-175 | feature | file | usine-codex-696 | — | Écrire la migration 0113_station_reglages.sql (numéro provisoire : ops.station_reglages à une seule ligne, ops.station_reglages_historique des 50 dernières versions, station_reglages_lire et station_reglages_ecrire SECURITY DEFINER réservées à service_role avec refus d'une version périmée, d'une clé inconnue et de plus de 64 Ko, pilotage_radar, pilotage_prospects_departements agrégé et pilotage_activite_salles, graines des cinq personnages de la station encore sans identité : garde, tresorier, studio, contenu, douleurs), ses deux jumeaux, son contrôle et le compte rendu d'un essai à sec généré par le juge, puis l'appliquer soi-même par le connecteur Supabase |
| 026-091 | test | file | usine-codex-672 | — | Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-096 | feature | file | claude-code | — | Créer lib/agents/acquisition/repondeur.ts et la route app/api/cron/repondeur : le Répondeur prépare, par les seuls modèles approuvés et sans modèle de langage, la réponse privée à chaque commentaire « SITE » et la réponse à chaque message classé (question tirée de la FAQ, prix, appel, confirmation d'un STOP, accusé d'une demande RGPD, questions à un entrant, suite du Studio pour une marque), par le Gmail de prospection dans le fil avec sa preuve de demande ou dans la conversation Meta, et la seule relance après un lien de maquette resté sans réponse, annoncée comme l'assistant IA de Presti, avec le lien de rendez-vous ou de paiement qui passe la main à Benj, sans jamais négocier, promettre hors de la liste, ni répondre à un cas sensible ou hostile ; le Facteur l'envoie après les juges |
| 026-157 | feature | file | codex | — | Écrire scripts/pack-pub/exporter.mjs (une ligne packs_pubs payée devient un dossier pack.json local, sans courriel, et signale la voix à produire) et scripts/pack-pub/deposer.mjs (juge local vert d'abord, puis dépôt de sortie/ dans le bucket privé packs-pubs avec une marge de 400 Mo et passage payee → fabriquee) |
| 026-156 | feature | file | antigravity | — | Écrire scripts/pack-pub/fabriquer.mjs qui, depuis un dossier de pack, prépare les photos (octets vérifiés, sans métadonnées), refuse une personne sans accord, écrit le manifeste des entrées, instancie et rend les trois films et les trois visuels avec HyperFrames en local, puis appelle textes.mjs, pour produire un sortie/ que pub-locale-qa accepte sur les trois jeux d'essai |
| 026-209 | feature | file | codex | — | C06 — fabrique de vidéos sur l’usine, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-084 | feature | file | codex | — | Créer la page de rendez-vous maison (décision R14, 0 €) : lib/agents/acquisition/rendezVous.ts (disponibilités de Benj, créneaux libres de 15 min, validation d'une réservation) et la route app/rendez-vous/[jeton]/route.ts qui sert, sans traçage ni script, une page privée noindex où le prospect choisit un créneau et laisse son numéro, réserve sans double réservation, crée la carte « À appeler » et prévient Benj par une notification sans donnée personnelle, avec la même 404 pour un lien inconnu, mal formé ou expiré |
| 026-215 | feature | file | codex | — | C12 — veille des tendances et laboratoire des accroches, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-224 | feature | file | codex | — | Fish Audio sous garde de licence et quota selon la relecture de complétude du 27/09 |
| 026-073 | contenu | file | codex | — | Constituer la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts (au moins 40 entrées sur au moins 8 métiers du bâtiment, chacune tirée de ce que des artisans écrivent eux-mêmes en public, avec la citation exacte, sa page source et sa date, les mots-clés, une question « qui appuie là où ça fait mal » et une accroche d'objet, sans aucune donnée personnelle, toutes à approuve false jusqu'à l'approbation unique de Benj) et sa méthode docs/agents/douleurs-methode.md, pour que chaque citation se retrouve mot pour mot sur sa page quand le juge la relit |
| 026-207 | feature | file | codex | — | C04 — garde des lignes et pont avec le Crieur, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-235 | feature | file | usine-codex-133 | — | Écrire scripts/savoir/lecons.mjs (candidats depuis les verdicts en échec, les décisions tranchées par Benj, les décisions tranchées du bus et les corrections des fiches, datées, sourcées, caviardées et idempotentes ; lister ; valider et rejeter par Claude Code ou la revue du lundi seulement, jamais sur l'usine ; verifier-source), jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=candidats,validation |
| 026-208 | feature | file | antigravity | — | C05 — cinq gabarits vidéo et un carrousel HyperFrames, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-253 | feature | file | claude-code | — | Adapter scripts/budget-perf.mjs à la sortie de build de Next 16 --webpack (le fichier .next/app-build-manifest.json qu'il lisait a disparu), en gardant la même mesure honnête du poids réellement transféré pour /site/[slug] et /p/[slug], jusqu'au vert de next16-qa --groupe=dependances (N16-1 à N16-7) |
| 026-006 | feature | file | claude-code | — | Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 026-047 | feature | file | codex | — | Écrire le veilleur A0 lib/agents/veilleur.ts (agent muet, panne de plus de 2 h, usine Oracle injoignable, disjoncteur, jeton externe à J-7, stockage au-delà de 60 %, argent bloqué, cartes des disjoncteurs du formulaire, du Gmail de prospection et de Meta tenus par la base (technologie en pause, canal arrêté, Gmail bloqué, modèle suspendu, changer de message), de la notice périmée, du bilan et du rappel Vercel Pro, coupe-circuit à 150 € sans recette, lignes d'Attention colorées et ordonnées, digest de 7 h 30 et 18 h 30 heure de Paris, 3 notifications par jour au plus hors urgences) sur les tuyaux de lib/alertes.ts, et ajouter à lib/alertes.ts ses motifs, la surveillance du tic et le digest hebdomadaire en repli seulement |
| 026-141 | feature | file | codex | — | Brancher la livraison sur l'horloge du bus : la route tic de 026-horloge-bus appelle tourLivraison toutes les 15 min, l'interrupteur de pause du bus arrête retraits et générations distantes, tourLivraison consomme la sortie que le livreur de l'usine a déposée (relue, décodée, copiée dans le bucket sites, commande passée à generee, dossier usine effacé, jamais une tâche d'essai), la tâche livrer_site:<commande> du bus est close par ops_tache_clore quand la commande atteint generee, et le livreur bat à chaque tour |
| 026-064 | feature | file | usine-codex-114 | — | Créer lib/agents/acquisition/jauges.ts (la liste fermée des jauges de quota : formulaires du jour au plafond du palier, état de chaque technologie de formulaire, e-mails sollicités du jour, réponses privées et messagerie Meta, API Instagram, bibliothèque publicitaire, Publora ; calculerJauges qui rend pour chacune utilisé, plafond, part et état ok, attention à 75 % ou plein à 100 %, et consommerJauge qui refuse un appel au-delà du plafond) et la route de lecture GET /api/controle/jauges réservée à un fondateur, sans aucune donnée de prospect |
| 026-154 | contenu | file | codex | — | Écrire scripts/pack-pub/textes.mjs qui produit, sans modèle d'IA et à partir des seuls faits du pack, sortie/textes.md (trois variantes d'annonce aux longueurs Meta) et sortie/fiche-10-min.md (lancer la pub pas à pas, catégorie Logement selon docs/pubs/meta-logement.json), et refuse d'écrire la fiche tant que la catégorie n'est pas vérifiée |
| 026-118 | feature | file | codex | — | Ajouter la route POST /api/pubs/commander, qui ouvre un Checkout Stripe à paiement unique avec facture pour le pack pubs à partir de parametresCheckoutPack, derrière le nouveau drapeau packPub baissé, avec packPubVente baissé aussi |
| 026-230 | feature | file | codex | — | Écrire scripts/savoir/exporter.mjs (liste fermée de docs/savoir/sources.json, exclusions avant toute ouverture, secrets écartés, classes public, interne et prospects, caviardage, manifestes, sortie hors dépôt), scripts/savoir/envoyer.mjs (deux archives vers le dépôt /srv/presti-savoir/depot de l'usine par ssh, sous l'interrupteur envoi) et scripts/savoir/synchroniser.mjs (les deux à la suite, pour la tâche Windows), jusqu'au vert de scripts/savoir-socle-qa.mjs --partie=export,envoi |
| 026-155 | feature | file | usine-codex-112 | — | Écrire scripts/studio/garde.mjs, qui refuse d'ouvrir un échantillon du Studio tant que les préalables datés de 026-128 (licences de la chaîne gratuite avec le droit commercial, fiche ARPP, activité de l'EI ; ni juriste ni compte Instagram) et le dossier de la marque (accord écrit tiré de sa réponse, page produit datée de moins de 30 jours, absence de refus) manquent, ainsi que docs/studio/modeles-messages.md (qui renvoie aux modèles de lib/agents/acquisition/modeles.ts sans les recopier) et docs/studio/seance.md (la séance de Claude Code ouverte par une décision studio_echantillon, jusqu'au dépôt de l'échantillon et à l'envoi par le Répondeur) |
| 026-082 | feature | file | usine-codex-109 | — | Créer lib/agents/acquisition/maquettesLien.ts (jeton de 43 signes, empreinte SHA-256, expiration à 21 jours, servirMaquette et executerPurge purs), la route app/maquette/[jeton]/[[...fichier]]/route.ts qui sert une page privée noindex, sans traçage ni écriture, avec la capture et la vidéo de 15 à 20 s (lecture par plages pour les téléphones), 404 identique pour un lien inconnu, mal formé ou expiré, et la route app/api/cron/maquettes-purge |
| 026-153 | feature | file | ag-026-153 | — | Créer le gabarit HyperFrames du pack pubs (trois films 1080×1920 de 15 s avant-apres, chantier et artisan-ville, et un visuel 1080×1080) fait seulement de photos de l'artisan et de textes à marques, et scripts/pack-pub/instancier.mjs qui remplit les marques depuis un pack.json |
| 026-149 | feature | file | usine-codex-94 | — | Écrire lib/packPubPurge.ts (packsAPurger pur, purgerPacksExpires borné et sans exception) et l'appeler chaque jour depuis la tâche des relances, pour effacer du bucket packs-pubs les fichiers d'un pack livré dont le lien de 30 jours a expiré, comme le promet l'article 3 ter des CGU |
| 026-074 | feature | file | codex | — | Créer les cinq routes d'écriture du Pilotage (trancher une décision avec reconfirmation quand elle engage, et rendre aux agents une réponse tranchée ; marquer rendu un appel, réservation ou réponse ; mettre un agent en pause sous reconfirmation securite ; transmettre une consigne à l'équipage ; les cinq gestes du fondateur sur l'envoi sous reconfirmation securite), fermées par le drapeau pilotage, gardées par estDirection, journalisées avant d'agir, branchées sur les seules fonctions des propriétaires du bus, de l'acquisition et de la station, et sans aucune route d'envoi |
| 026-137 | feature | file | usine-codex-93 | — | Écrire lib/packPubLivraison.ts (courriel de livraison pur, lien de 30 jours) et les routes du Poste GET /api/controle/packs (liste, aperçus signés de 600 s) et POST /api/controle/packs/[id] (livrer sous reconfirmation artisan, ou refaire avec une consigne), journal d'abord et état conditionnel |
| 026-075 | feature | file | usine-codex-89 | — | Écrire scripts/agents/maquette-video.mjs, qui fabrique sur l'usine, à partir du dossier d'une maquette générée, une vidéo verticale de 15 à 20 s qui fait défiler la page d'accueil de haut en bas (capture pleine page par Chromium, panoramique par ffmpeg), en H.264, sans son, de 3 Mo au plus, lisible en continu sur un téléphone, déterministe, sans aucune ressource d'un autre hôte |
| 026-068 | feature | file | codex | — | Créer GET /api/controle/pilotage?bloc=decider\|appeler\|envois\|entonnoir\|agents\|code (404 tant que le nouveau drapeau pilotage est baissé, garde fondateur, chaque bloc sourcé et lu seulement par les fonctions pilotage_* et la logique de lib/pilotage ; le bloc envois montre les envois des agents en lecture seule, sans texte ni destinataire, par envoisDesAgents de lib/pilotage/envois.ts) et lib/pilotage/blocs.ts, et inscrire le drapeau dans la carte de scripts/fermeture-e2e.mjs |
| 026-049 | feature | file | usine-codex-66 | — | Créer la route GET /api/agents/tic, fermée par le drapeau busAgents et par CRON_SECRET comme les routes cron, qui enchaîne sous un budget de 25 s les baux expirés, le balayage des commandes payées, la file de l'argent et, une fois par créneau de 5 min, le veilleur A0, puis note son passage tic dans passages_cron et répond 500 si une étape a échoué |
| 026-056 | feature | file | usine-codex-64 | — | Créer les routes POST /api/agents/usine/entree et /api/agents/usine/depot derrière le drapeau busAgents, gardées par authAgent et exigerTable('taches'), qui ne signent d'URL (lecture 15 min, dépôt) dans le bucket privé usine que pour la tâche que l'agent tient sous bail (ops_tache_detenue), dans les limites de sa capacité lues dans lib/agents/usineLimites.json, et refusent tout dépôt quand le stockage dépasse 60 % ou ne se mesure pas, avec lib/agents/usineDepot.ts, jusqu'au vert de scripts/usine-routes-qa.mjs |
| 026-046 | feature | file | usine-codex-62 | — | Écrire lib/agents/fileArgent.ts qui met chaque commande de site payée dans la file argent (une fois par commande), traite la file sous un budget de temps avec un registre fermé de gestionnaires idempotents (commande_payee crée la tâche livrer_site puis dépose, sans jamais bloquer l'argent, son entrée pour le livreur de l'usine ; essai_e2e), ne marque un message fait qu'après succès et alerte sur un type inconnu, sans jamais écrire dans Stripe ni dans sites_commandes |
| 026-059 | feature | file | usine-codex-60 | — | Créer GET /api/controle/tresorerie et la tuile Argent (encaissé du jour, 7 jours et mois, abonnement mensuel récurrent, sites vendus, dépenses, marge, seuil de TVA) calculées uniquement par lib/direction/stripe.ts et lib/direction/tresorerie.ts, montrée en tête de Comptabilité, plus une veille hebdomadaire du seuil de TVA |
| 026-168 | test | file | claude-code | — | Écrire le juge de la planche station-planche-qa (--partie=planche : il lance lui-même, sur l'usine, l'atelier ~/claw3d-pixel sur 127.0.0.1 avec une liste blanche fermée, capture lui-même la planche des 20 salles et de la salle réservée dans la vraie mise en page à 1440×900, 1280×800 et 390×844, et juge grille entière, palette, licences du lot A, absence de donnée et poids) et le lot p de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-035 | feature | file | usine-codex-59 | — | Écrire les écrans de l'achat public derrière siteAchatPublic (page /site/acheter à quatre champs et case CGU, page /site/commander/merci avec renvoi du lien, mode « compléter mon dossier » de /site/commander avec l'étape Vos prestations, paramètre suite sûr de /onboarding) |
| 026-033 | feature | file | usine-codex-58 | — | Écrire scripts/commande-exporter.mjs, qui transforme une commande payée au dossier complet en dossier source pour generer.mjs --source (commande.json au contrat de 025-03, photos de l'artisan seulement, vérifiées, sans métadonnées, en webp et avif, attributions crédibles) hors de public/, sans afficher aucune donnée personnelle |
| 026-042 | feature | file | usine-codex-57 | — | Créer les 7 fichiers de routes /api/agents/* du bus (créer, prendre et rendre une tâche, écrire et lire des événements, créer une décision et relire ses décisions tranchées, battement, état) derrière le drapeau busAgents baissé, chacune gardée par authAgent, limitée aux types et tables de l'agent et branchée sur une seule fonction de lib/agents/bus.ts, sans aucune route qui tranche, approuve ou change un interrupteur |
| 026-031 | feature | file | usine-codex-56 | — | Tenir l'article 3 bis des CGU : dater la suppression du compte sur ses sites en ligne quand la purge réussit et prévenir l'artisan, puis douze mois plus tard envoyer le lien du dossier, passer la commande à retiree, détacher le domaine et purger les fichiers à l'expiration, le tout dans tourLivraison |
| 026-030 | feature | file | usine-codex-55 | — | Permettre de compléter le dossier d'une commande déjà payée et pas encore générée (GET/PUT /api/site/commander/complement, qui rattache d'abord la commande par l'adresse de la session), et ajouter au dossier la liste des prestations, exigée avant la fabrication par erreursFabrication sans toucher aux règles du paiement |
| 026-240 | test | file | codex | — | Écrire scripts/juges-026-savoir-mutations.mjs, qui mute sur des copies isolées les quatre juges de la couche Savoir (savoir-socle-qa, savoir-recherche-qa, savoir-lecons-qa, savoir-reflexion-qa) une faute à la fois et prouve que chacune est prise par le critère attendu, témoin intact vert, jusqu'au vert du méta-juge de 026-001 |
| 026-217 | feature | fait | claude-code | PASS | 2026-09-30T13:43:35Z · 2s · 0 l. |
| 026-210 | feature | fait | claude-code | PASS | 2026-09-30T13:43:25Z · 2s · 394 l. |
| 026-133 | test | fait | codex | PASS | 2026-09-30T08:24:52Z · 617s · 0 l. |
| 026-091 | test | fait | usine-codex-672 | PASS | 2026-09-30T04:00:24Z · 560s · 1682 l. |
| 026-145 | feature | fait | usine-codex-506 | PASS | 2026-09-30T01:29:21Z · 35s · 519 l. |
| 026-239 | feature | fait | usine-codex-503 | PASS | 2026-09-30T01:22:15Z · 41s · 1050 l. |
| 026-008 | feature | fait | claude-code | PASS | 2026-09-29T21:35:24Z · 444s · 825 l. |
| 026-162 | feature | fait | claude-code | PASS | 2026-09-29T21:19:32Z · 8s · 0 l. |
| 026-166 | feature | fait | claude-code | PASS | 2026-09-29T21:11:44Z · 10s · 7 l. |
| 026-095 | feature | fait | codex | PASS | 2026-09-29T20:47:05Z · 147s · 0 l. |
| 026-157 | feature | fait | codex | PASS | 2026-09-29T20:43:52Z · 182s · 0 l. |
| 026-213 | feature | fait | codex | PASS | 2026-09-29T20:02:17Z · 9s · 0 l. |
| 026-218 | feature | fait | codex | PASS | 2026-09-29T19:19:13Z · 140s · 0 l. |
| 026-214 | feature | fait | codex | PASS | 2026-09-29T19:17:34Z · 21s · 0 l. |
| 026-212 | feature | fait | codex | PASS | 2026-09-29T19:14:45Z · 44s · 0 l. |
| 026-090 | feature | fait | codex | PASS | 2026-09-29T18:58:19Z · 94s · 0 l. |
| 026-088 | feature | fait | claude-code | PASS | 2026-09-29T17:57:02Z · 18s · 2310 l. |
| 026-147 | feature | fait | antigravity | PASS | 2026-09-29T16:33:19Z · 185s · 0 l. |
| 026-085 | feature | fait | claude-code | PASS | 2026-09-29T16:23:22Z · 56s · 1120 l. |
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
| 026-012 | test | fait | claude-code | PASS | 2026-09-29T04:50:35Z · 451s · 0 l. |
| 026-023 | test | fait | claude-code | PASS | 2026-09-29T03:29:32Z · 90s · 0 l. |
| 026-032 | test | fait | claude-code | PASS | 2026-09-29T03:10:02Z · 80s · 0 l. |
| 026-029 | test | fait | claude-code | PASS | 2026-09-29T03:05:59Z · 51s · 0 l. |
| 026-081 | test | fait | claude-code | PASS | 2026-09-29T01:43:02Z · 10s · 0 l. |

… 190 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
