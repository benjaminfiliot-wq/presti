<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-29T09:52:19Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 133 tâche(s) PASS, 198443 ligne(s) · faites par Claude Code : 76 tâche(s) PASS, 65100 ligne(s).
**État** — file : 12 · en cours : 14 · faites : 215 · refusées : 11

## ⚠ 3 question(s) en attente
- `.orchestre/en-cours/026-064.question.md` → `node scripts/orchestre.mjs repondre 026-064 <n>`
- `.orchestre/en-cours/026-079.question.md` → `node scripts/orchestre.mjs repondre 026-079 <n>`
- `.orchestre/en-cours/026-231.question.md` → `node scripts/orchestre.mjs repondre 026-231 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-064 | feature | en-cours | usine-codex-114 | — | depuis 2026-09-29T09:23:54Z · Créer lib/agents/acquisition/jauges.ts (la liste fermée des jauges de quota : formulaires du jour au plafond du palier, état de chaque technologie de formulaire, e-mails sollicités du jour, réponses privées et messagerie Meta, API Instagram, bibliothèque publicitaire, Publora ; calculerJauges qui rend pour chacune utilisé, plafond, part et état ok, attention à 75 % ou plein à 100 %, et consommerJauge qui refuse un appel au-delà du plafond) et la route de lecture GET /api/controle/jauges réservée à un fondateur, sans aucune donnée de prospect |
| 026-157 | feature | en-cours | usine-codex-108 | — | depuis 2026-09-29T00:01:10Z · Écrire scripts/pack-pub/exporter.mjs (une ligne packs_pubs payée devient un dossier pack.json local, sans courriel, et signale la voix à produire) et scripts/pack-pub/deposer.mjs (juge local vert d'abord, puis dépôt de sortie/ dans le bucket privé packs-pubs avec une marge de 400 Mo et passage payee → fabriquee) |
| 026-006 | feature | en-cours | claude-code | — | depuis 2026-09-29T01:53:00Z · Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 026-156 | feature | en-cours | ag-026-156 | — | depuis 2026-09-28T23:57:50Z · Écrire scripts/pack-pub/fabriquer.mjs qui, depuis un dossier de pack, prépare les photos (octets vérifiés, sans métadonnées), refuse une personne sans accord, écrit le manifeste des entrées, instancie et rend les trois films et les trois visuels avec HyperFrames en local, puis appelle textes.mjs, pour produire un sortie/ que pub-locale-qa accepte sur les trois jeux d'essai |
| 026-138 | audit | en-cours | claude-code | — | depuis 2026-09-28T21:56:26Z · Prouver en production que l'horloge a tenu 24 h sans le poste : au moins 1 380 minutes exécutées par pg_cron sans trou de plus de 10 min, au moins 276 passages du veilleur A0 sans trou de plus de 15 min, les deux digests du jour partis, aucun message d'argent en souffrance non signalé, et au plus 3 notifications non urgentes par jour de Paris |
| 026-170 | test | en-cours | claude-code | — | depuis 2026-09-28T18:53:44Z · Écrire le juge propre à Claw3D station-claw3d-qa (dix parties : provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene ; csp et poids sur un build de production de la copie), le format du thème (theme.schema.json), un thème d'essai neutre sans donnée, une session simulée sans compte ni clé pour faire tourner les juges de rendu sur l'usine, un témoin minimal par partie (jamais un moteur complet) et le lot k de la preuve, chaque partie échouant sur un moteur piégé et passant sur son témoin |
| 023-03 | test | en-cours | claude-code | — | depuis 2026-09-28T21:43:03Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | claude-code | — | depuis 2026-09-29T00:26:10Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-073 | contenu | en-cours | usine-codex-83 | — | depuis 2026-09-28T14:14:18Z · Constituer la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts (au moins 40 entrées sur au moins 8 métiers du bâtiment, chacune tirée de ce que des artisans écrivent eux-mêmes en public, avec la citation exacte, sa page source et sa date, les mots-clés, une question « qui appuie là où ça fait mal » et une accroche d'objet, sans aucune donnée personnelle, toutes à approuve false jusqu'à l'approbation unique de Benj) et sa méthode docs/agents/douleurs-methode.md, pour que chaque citation se retrouve mot pour mot sur sa page quand le juge la relit |
| 026-079 | feature | en-cours | usine-codex-115 | — | depuis 2026-09-29T09:30:44Z · Écrire la migration *_pilotage_echanges.sql (treize fonctions public.pilotage_* SECURITY DEFINER réservées à service_role, en lecture seule, sans aucune jointure prospect → commande à elle (celle de 0111, ops.acq_commande_du_prospect, est la seule) : envois des agents du jour avec leurs trois verdicts et sans texte, compteurs du jour par canal et par palier comptés par les fonctions de l'acquisition, compteurs par technologie de formulaire, entonnoir, date du bilan lue dans ops.etat_envoi et ses 100 premiers contacts froids, appels à rendre (réservations de la page de rendez-vous et réponses « appel »), réponses du jour par classe, état de l'envoi pour les gestes du fondateur, tapis de la station, recettes venues des agents ou non, atelier, réponses récentes), ses jumeaux de repli, son contrôle et le compte rendu d'un essai à sec généré par le juge |
| 026-084 | feature | en-cours | claude-code | — | depuis 2026-09-29T06:12:20Z · Créer la page de rendez-vous maison (décision R14, 0 €) : lib/agents/acquisition/rendezVous.ts (disponibilités de Benj, créneaux libres de 15 min, validation d'une réservation) et la route app/rendez-vous/[jeton]/route.ts qui sert, sans traçage ni script, une page privée noindex où le prospect choisit un créneau et laisse son numéro, réserve sans double réservation, crée la carte « À appeler » et prévient Benj par une notification sans donnée personnelle, avec la même 404 pour un lien inconnu, mal formé ou expiré |
| 026-231 | feature | en-cours | usine-codex-116 | — | depuis 2026-09-29T09:31:34Z · Écrire la moitié usine du socle du savoir, scripts/usine/savoir-recevoir.mjs (archives du dépôt validées puis posées sous /home/agents/travail/savoir, compartiments general et prospects séparés), lib/savoir/index.ts (découpe, normalisation, index BM25 déterministe, caviardage, fusion des scores), scripts/savoir/indexer.mjs (index par compartiment, vecteurs Ollama locaux pour general seulement et sous interrupteur), les unités presti-chef-savoir-recevoir et presti-chef-savoir-index (.service et .path) et docs/savoir/LISEZMOI.md, jusqu'au vert de scripts/savoir-socle-qa.mjs --partie=reception,index,unites |
| 026-235 | feature | en-cours | usine-codex-84 | — | depuis 2026-09-28T14:56:22Z · Écrire scripts/savoir/lecons.mjs (candidats depuis les verdicts en échec, les décisions tranchées par Benj, les décisions tranchées du bus et les corrections des fiches, datées, sourcées, caviardées et idempotentes ; lister ; valider et rejeter par Claude Code ou la revue du lundi seulement, jamais sur l'usine ; verifier-source), jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=candidats,validation |
| 026-238 | test | en-cours | claude-code | — | depuis 2026-09-29T08:44:42Z · Écrire le contrat de l'auto-réflexion (bilan quotidien léger de Matt sur l'usine et bilan hebdomadaire de la revue du lundi, qui relisent résultats, échecs, coûts, leçons et recherches calculés par un script, et proposent au plus trois améliorations au chef d'entreprise par le pont, jamais appliquées sans lui), ses consignes docs/agents/chef-bilan.md, docs/agents/chef-bilan.schema.json, docs/revues/GABARIT-bilan.md et l'étape « Bilan » de docs/agents/revue-hebdo.md, et le juge scripts/savoir-reflexion-qa.mjs (critères SVB, parties donnees, bilan, unites, --document, --reel) avec jeux d'essai, témoin et sabotages, et prouver qu'il échoue aujourd'hui sur SVB-1 et passe sur le témoin |
| 026-155 | feature | file | usine-codex-112 | — | Écrire scripts/studio/garde.mjs, qui refuse d'ouvrir un échantillon du Studio tant que les préalables datés de 026-128 (licences de la chaîne gratuite avec le droit commercial, fiche ARPP, activité de l'EI ; ni juriste ni compte Instagram) et le dossier de la marque (accord écrit tiré de sa réponse, page produit datée de moins de 30 jours, absence de refus) manquent, ainsi que docs/studio/modeles-messages.md (qui renvoie aux modèles de lib/agents/acquisition/modeles.ts sans les recopier) et docs/studio/seance.md (la séance de Claude Code ouverte par une décision studio_echantillon, jusqu'au dépôt de l'échantillon et à l'envoi par le Répondeur) |
| 026-253 | feature | file | claude-code | — | Adapter scripts/budget-perf.mjs à la sortie de build de Next 16 --webpack (le fichier .next/app-build-manifest.json qu'il lisait a disparu), en gardant la même mesure honnête du poids réellement transféré pour /site/[slug] et /p/[slug], jusqu'au vert de next16-qa --groupe=dependances (N16-1 à N16-7) |
| 026-252 | feature | file | claude-code | — | Faire passer `next build --webpack` (Next 16, fiche 026-006) en coupant l'import Node natif (`node:crypto`, `node:zlib`) qui remonte jusqu'au bundle client via `app/controle/Sites.tsx`, sans toucher à la logique de `lib/siteDossier.ts`, `lib/siteRetrait.ts` ni `lib/zip.ts` |
| 026-091 | test | file | codex | — | Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-129 | feature | file | codex | — | Donner au chef « Matt » ce qu'il lui faut pour tourner 24 h/24 sur l'usine Oracle — scripts/chef/consignes.mjs (les consignes de Benj, lues comme données), scripts/chef/fil.mjs (vérifier le plan, puis poster au fil les consignes lues et l'événement cycle_termine avec le modèle et le compte rendu), dans scripts/chef/cycle.mjs la nouvelle chaîne, l'environnement du modèle vidé de tout secret, le réseau coupé et la garde contre deux chefs, le passage du modèle sous un compte chef-modele sans droit sur le coffre (scripts/usine/chef-modele.mjs, son lanceur et son script d'essai), et les dix unités systemd presti-chef-plein, presti-chef-leger, presti-chef-reunion (qui lance la réunion de 026-103), presti-chef-modele et presti-ia-modele (la file de modèle des agents, sur le même compte chef-modele, avec son lanceur scripts/usine/presti-ia-modele.sh et l'option --echange de chef-modele.mjs) — jusqu'au vert de scripts/chef-qa.mjs sur tous ses groupes hors --reel |
| 026-139 | feature | file | codex | — | Écrire le crochet hooks/git-garde.mjs de l'orchestre (PreToolUse Bash et PowerShell), qui refuse en code 2 toute commande git ou de suppression destructrice où qu'elle soit dans la ligne, le brancher dans gabarits/settings.json et le recopier dans presti par maj, jusqu'au vert de ../orchestre/test/git-garde-qa.mjs |
| 026-144 | feature | file | antigravity | — | Créer la page /pubs/commander où l'artisan choisit 6 à 12 de ses photos, dit qui y figure et avec quel accord, donne ses faits, choisit accroche et voix, puis paie 149 €, et la carte CartePackPub montrée sur le tableau de bord sous le drapeau packPubVente |
| 026-151 | test | file | codex | — | Écrire scripts/juges-026-orchestre-chef-mutations.mjs, qui prouve sur des copies que preuve-026 (groupes source, baux, quota), chef-qa, revue-qa et chantier-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-171 | test | file | claude-code | — | Écrire les juges des modules purs, des thèmes, des réglages, de l'extraction du Poste et de la branche réservée (station-themes-qa --partie=modules et --theme=station\|vaisseau, station-reglages-qa, poste-extraction-qa, ecommerce-reservee-qa) avec leurs jeux d'essai et le lot t de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-222 | feature | file | codex | — | Cursor comme exécutant borné de l’orchestre selon la relecture de complétude du 27/09 |
| 026-224 | feature | file | codex | — | Fish Audio sous garde de licence et quota selon la relecture de complétude du 27/09 |
| 026-026 | test | fait | claude-code | PASS | 2026-09-29T09:48:57Z · 1084s · 0 l. |
| 026-127 | feature | fait | usine-codex-117 | PASS | 2026-09-29T09:48:36Z · 74s · 584 l. |
| 026-154 | contenu | fait | codex | PASS | 2026-09-29T09:31:12Z · 2s · 0 l. |
| 026-115 | feature | fait | claude-code | PASS | 2026-09-29T09:31:04Z · 81s · 438 l. |
| 026-118 | feature | fait | codex | PASS | 2026-09-29T09:19:28Z · 219s · 0 l. |
| 026-063 | feature | fait | claude-code | PASS | 2026-09-29T09:12:19Z · 382s · 0 l. |
| 026-141 | feature | refuse | codex | FAIL | ✅ BL-2 busEnPause : faux seulement sur une réponse explicite false ; vrai sur true, null, une erreur PostgREST (400), une erreur serveur (500) et un rpc qui lèv |
| 026-119 | feature | fait | codex | PASS | 2026-09-29T08:49:29Z · 6s · 0 l. |
| 026-230 | feature | fait | codex | PASS | 2026-09-29T08:45:37Z · 292s · 0 l. |
| 026-158 | feature | refuse | antigravity | FAIL | FAIL PQ-1 — video-qa en échec : Débit (pub locale), Aucun plan figé (pub locale), Rythme des coupes (pub locale) |
| 026-155 | feature | fait | usine-codex-112 | PASS | 2026-09-29T06:16:54Z · 52s · 576 l. |
| 026-012 | test | fait | claude-code | PASS | 2026-09-29T04:50:35Z · 451s · 0 l. |
| 026-012 | test | refuse | claude-code | PASS | 2026-09-29T04:50:35Z · 451s · 0 l. |
| 026-023 | test | fait | claude-code | PASS | 2026-09-29T03:29:32Z · 90s · 0 l. |
| 026-023 | test | refuse | claude-code | PASS | 2026-09-29T03:29:32Z · 90s · 0 l. |
| 026-032 | test | fait | claude-code | PASS | 2026-09-29T03:10:02Z · 80s · 0 l. |
| 026-029 | test | fait | claude-code | PASS | 2026-09-29T03:05:59Z · 51s · 0 l. |
| 026-081 | test | fait | claude-code | PASS | 2026-09-29T01:43:02Z · 10s · 0 l. |
| 026-016 | test | fait | claude-code | PASS | 2026-09-29T01:41:52Z · 12s · 0 l. |
| 026-045 | test | fait | claude-code | FAIL | PASS JP-1 — [autotest echec-sur-reference : lecture des sorties : 6 sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme accep |
| 026-047 | feature | refuse | codex | FAIL | FAIL VA-8 — app/api/controle/a-faire/route.ts : le diff avec HEAD (0 retirée(s), 0 ajoutée(s)) ne se limite pas à la ligne NOMS_CRON ; NOMS_CRON : ajouté rien ; |
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
| 026-160 | feature | fait | usine-codex-67 | PASS | 2026-09-28T10:55:31Z · 45s · 474 l. |
| 026-056 | feature | fait | usine-codex-64 | PASS | 2026-09-28T10:35:50Z · 419s · 431 l. |
| 026-169 | feature | fait | claude-code | PASS | 2026-09-28T10:20:16Z · 66s · 0 l. |
| 026-046 | feature | fait | usine-codex-62 | PASS | 2026-09-28T10:17:28Z · 148s · 436 l. |
| 026-060 | feature | fait | claude-code | PASS | 2026-09-28T09:58:27Z · 23s · 3091 l. |
| 026-036 | feature | fait | claude-code | PASS | 2026-09-28T09:52:10Z · 8s · 0 l. |
| 026-054 | feature | fait | claude-code | PASS | 2026-09-28T09:48:21Z · 6s · 668 l. |
| 026-108 | test | fait | claude-code | PASS | 2026-09-28T09:02:58Z · 482s · 0 l. |

… 152 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
