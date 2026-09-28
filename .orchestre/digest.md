<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-28T20:25:51Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 125 tâche(s) PASS, 195892 ligne(s) · faites par Claude Code : 73 tâche(s) PASS, 73787 ligne(s).
**État** — file : 8 · en cours : 6 · faites : 204 · refusées : 11

## ⚠ 2 question(s) en attente
- `.orchestre/en-cours/026-063.question.md` → `node scripts/orchestre.mjs repondre 026-063 <n>`
- `.orchestre/en-cours/026-091.question.md` → `node scripts/orchestre.mjs repondre 026-091 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-128 | test | en-cours | ? | — | depuis ? · Écrire studio-garde-qa (les préalables du Studio pubs et le dossier de chaque marque), pub-qa (le juge J2 d'un échantillon vidéo en dix points, étalonné sur cinq défauts plantés) et studio-offre-qa (l'offre du Studio en paramètre, 5 vidéos à 490 €, et son paiement, 026-166), avec leur contrat d'habillage et un produit témoin fictif, pour que juges-026-pubs-contenu-preuve --lot=17 soit vert |
| 026-170 | test | en-cours | claude-code | — | depuis 2026-09-28T18:53:44Z · Écrire le juge propre à Claw3D station-claw3d-qa (dix parties : provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene ; csp et poids sur un build de production de la copie), le format du thème (theme.schema.json), un thème d'essai neutre sans donnée, une session simulée sans compte ni clé pour faire tourner les juges de rendu sur l'usine, un témoin minimal par partie (jamais un moteur complet) et le lot k de la preuve, chaque partie échouant sur un moteur piégé et passant sur son témoin |
| 026-063 | feature | en-cours | usine-codex-99 | — | depuis 2026-09-28T18:09:33Z · Écrire la migration 0111 des disjoncteurs de l'envoi, tenus par la base en compteurs absolus (paliers du formulaire de 5 à 40 par jour qui écrivent seuls la ligne de plafond du formulaire, technologies de formulaire, signaux de STOP, plainte, avis d'abus, échec de soumission, refus du Gmail et erreur Meta qui mettent en pause une technologie, un modèle, le formulaire, le Gmail ou Meta, montée de palier par règle et bilan des 100 premiers contacts froids, descente au premier voyant rouge, notice vérifiée, gestes du fondateur dont l'ouverture d'envoi_froid au plus tôt le 12/10, jauges, échantillon du soir), ses jumeaux, son contrôle, lib/agents/acquisition/disjoncteurs.ts et la partie MagasinEnvoi de magasinSupabase.ts, essayée à sec |
| 026-073 | contenu | en-cours | usine-codex-83 | — | depuis 2026-09-28T14:14:18Z · Constituer la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts (au moins 40 entrées sur au moins 8 métiers du bâtiment, chacune tirée de ce que des artisans écrivent eux-mêmes en public, avec la citation exacte, sa page source et sa date, les mots-clés, une question « qui appuie là où ça fait mal » et une accroche d'objet, sans aucune donnée personnelle, toutes à approuve false jusqu'à l'approbation unique de Benj) et sa méthode docs/agents/douleurs-methode.md, pour que chaque citation se retrouve mot pour mot sur sa page quand le juge la relit |
| 026-091 | test | en-cours | usine-codex-100 | — | depuis 2026-09-28T18:15:20Z · Écrire scripts/juges-026-horloge-bus-mutations.mjs, qui prouve sur des copies que chacun des dix juges du domaine horloge et bus échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-235 | feature | en-cours | usine-codex-84 | — | depuis 2026-09-28T14:56:22Z · Écrire scripts/savoir/lecons.mjs (candidats depuis les verdicts en échec, les décisions tranchées par Benj, les décisions tranchées du bus et les corrections des fiches, datées, sourcées, caviardées et idempotentes ; lister ; valider et rejeter par Claude Code ou la revue du lundi seulement, jamais sur l'usine ; verifier-source), jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=candidats,validation |
| 026-006 | feature | file | claude-code | — | Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 023-03 | test | file | codex-22 | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | usine-codex-13 | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-082 | feature | file | codex | — | Créer lib/agents/acquisition/maquettesLien.ts (jeton de 43 signes, empreinte SHA-256, expiration à 21 jours, servirMaquette et executerPurge purs), la route app/maquette/[jeton]/[[...fichier]]/route.ts qui sert une page privée noindex, sans traçage ni écriture, avec la capture et la vidéo de 15 à 20 s (lecture par plages pour les téléphones), 404 identique pour un lien inconnu, mal formé ou expiré, et la route app/api/cron/maquettes-purge |
| 026-115 | feature | file | codex | — | Quand Codex annonce son quota épuisé, faire rendre la tâche à la file, noter l'échéance dans .orchestre/quotas.json, refuser codex-* dans prochaine et executant.mjs jusqu'à cette échéance et dire dans le bloc Attention quel autre exécutant lancer, jusqu'au vert du groupe quota de preuve-026 |
| 026-171 | test | file | claude-code | — | Écrire les juges des modules purs, des thèmes, des réglages, de l'extraction du Poste et de la branche réservée (station-themes-qa --partie=modules et --theme=station\|vaisseau, station-reglages-qa, poste-extraction-qa, ecommerce-reservee-qa) avec leurs jeux d'essai et le lot t de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-252 | feature | file | claude-code | — | Faire passer `next build --webpack` (Next 16, fiche 026-006) en coupant l'import Node natif (`node:crypto`, `node:zlib`) qui remonte jusqu'au bundle client via `app/controle/Sites.tsx`, sans toucher à la logique de `lib/siteDossier.ts`, `lib/siteRetrait.ts` ni `lib/zip.ts` |
| 026-128 | test | fait | claude-code | PASS | 2026-09-28T20:25:50Z · 137s · 1837 l. |
| 026-081 | test | fait | claude-code | PASS | 2026-09-28T19:32:31Z · 11s · 0 l. |
| 026-141 | feature | refuse | usine-codex-101 | FAIL | ✅ BL-2 busEnPause : faux seulement sur une réponse explicite false ; vrai sur true, null, une erreur PostgREST (400), une erreur serveur (500) et un rpc qui lèv |
| 026-080 | test | fait | claude-code | PASS | 2026-09-28T18:49:34Z · 3s · 0 l. |
| 026-135 | feature | fait | usine-codex-98 | PASS | 2026-09-28T18:37:42Z · 34s · 523 l. |
| 026-204 | test | fait | claude-code | PASS | 2026-09-28T18:34:35Z · 43s · 0 l. |
| 026-026 | test | fait | claude-code | PASS | 2026-09-28T18:16:09Z · 140s · 0 l. |
| 026-110 | test | fait | claude-code | PASS | 2026-09-28T18:02:36Z · 72s · 0 l. |
| 026-086 | feature | fait | usine-codex-87 | PASS | 2026-09-28T17:55:16Z · 2s · 1435 l. |
| 026-062 | test | fait | claude-code | PASS | 2026-09-28T17:46:08Z · 39s · 0 l. |
| 026-124 | test | fait | claude-code | PASS | 2026-09-28T17:40:16Z · 93s · 0 l. |
| 026-119 | feature | refuse | codex | FAIL | FAIL CR-NR — app/api/cron/relances/route.ts modifié par rapport à HEAD |
| 026-149 | feature | fait | usine-codex-94 | PASS | 2026-09-28T17:33:29Z · 88s · 385 l. |
| 026-074 | feature | fait | codex | PASS | 2026-09-28T17:32:51Z · 269s · 0 l. |
| 026-070 | feature | fait | codex | PASS | 2026-09-28T17:26:49Z · 49s · 0 l. |
| 026-137 | feature | fait | usine-codex-93 | PASS | 2026-09-28T17:22:44Z · 46s · 513 l. |
| 026-009 | test | fait | claude-code | PASS | 2026-09-28T17:13:27Z · 74s · 0 l. |
| 026-012 | test | refuse | claude-code | FAIL | ✅ JA-1 référence 4041ec9 réutilisée (identique blob pour blob) sous .orchestre/travail/juges-026-pilotage/reference (2421 fichiers), ancêtre de HEAD, sans lib/p |
| 026-106 | feature | fait | usine-codex-91 | PASS | 2026-09-28T17:12:32Z · 57s · 497 l. |
| 026-232 | test | fait | claude-code | PASS | 2026-09-28T17:10:25Z · 499s · 0 l. |
| 026-078 | feature | fait | usine-codex-90 | PASS | 2026-09-28T17:08:54Z · 84s · 489 l. |
| 026-075 | feature | fait | usine-codex-89 | PASS | 2026-09-28T17:05:48Z · 59s · 444 l. |
| 026-016 | test | fait | claude-code | PASS | 2026-09-28T17:03:06Z · 50s · 0 l. |
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
| 026-061 | feature | fait | claude-code | PASS | 2026-09-28T15:50:08Z · 24s · 0 l. |
| 026-248 | test | fait | claude-code | PASS | 2026-09-28T15:45:41Z · 289s · 0 l. |
| 026-229 | test | fait | claude-code | PASS | 2026-09-28T15:39:06Z · 328s · 0 l. |
| 026-114 | feature | fait | claude-code | PASS | 2026-09-28T15:35:08Z · 3s · 0 l. |
| 026-116 | test | fait | claude-code | PASS | 2026-09-28T14:25:19Z · 195s · 0 l. |
| 026-118 | feature | refuse | usine-codex-78 | FAIL | PASS PP-8 — POST : 404 (drapeau packPub), authArtisan, 403 fondateur, erreursAvantPaiementPack, parametresCheckoutPack, poserSessionStripePack, dans l'ordre ; a |
| 026-072 | feature | fait | codex | PASS | 2026-09-28T12:43:47Z · 258s · 0 l. |
| 026-230 | feature | refuse | usine-codex-77 | FAIL | FAIL SVS-1 — interrupteurs.semantique est actif sans depuis/accord |
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
| 026-047 | feature | fait | usine-codex-63 | PASS | 2026-09-28T10:24:50Z · 254s · 572 l. |
| 026-169 | feature | fait | claude-code | PASS | 2026-09-28T10:20:16Z · 66s · 0 l. |
| 026-046 | feature | fait | usine-codex-62 | PASS | 2026-09-28T10:17:28Z · 148s · 436 l. |
| 026-060 | feature | fait | claude-code | PASS | 2026-09-28T09:58:27Z · 23s · 3091 l. |
| 026-036 | feature | fait | claude-code | PASS | 2026-09-28T09:52:10Z · 8s · 0 l. |
| 026-054 | feature | fait | claude-code | PASS | 2026-09-28T09:48:21Z · 6s · 668 l. |
| 026-108 | test | fait | claude-code | PASS | 2026-09-28T09:02:58Z · 482s · 0 l. |
| 026-142 | test | fait | claude-code | PASS | 2026-09-28T09:00:40Z · 4s · 0 l. |
| 026-037 | test | fait | claude-code | PASS | 2026-09-28T09:00:23Z · 431s · 0 l. |
| 026-004 | test | fait | claude-code | PASS | 2026-09-28T08:42:18Z · 16s · 1235 l. |
| 026-098 | test | fait | claude-code | PASS | 2026-09-28T08:30:36Z · 193s · 327 l. |
| 026-093 | feature | fait | claude-code | PASS | 2026-09-28T08:20:19Z · 99s · 764 l. |
| 026-044 | feature | fait | claude-code | PASS | 2026-09-28T07:54:53Z · 13s · 373 l. |
| 026-059 | feature | fait | usine-codex-60 | PASS | 2026-09-28T07:37:59Z · 41s · 421 l. |
| 026-034 | feature | fait | claude-code | PASS | 2026-09-28T07:33:40Z · 1s · 6384 l. |
| 026-104 | test | fait | claude-code | PASS | 2026-09-28T06:15:53Z · 458s · 0 l. |
| 026-168 | test | fait | claude-code | PASS | 2026-09-28T06:04:46Z · 642s · 0 l. |
| 026-223 | feature | fait | codex | PASS | 2026-09-28T05:50:23Z · 1s · 0 l. |
| 026-146 | feature | fait | codex | PASS | 2026-09-28T05:50:01Z · 14s · 0 l. |
| 026-220 | test | fait | claude-code | PASS | 2026-09-28T05:49:03Z · 52s · 0 l. |
| 026-027 | feature | fait | claude-code | PASS | 2026-09-28T05:45:26Z · 45s · 0 l. |
| 026-121 | test | fait | claude-code | PASS | 2026-09-28T05:37:53Z · 152s · 0 l. |
| 026-035 | feature | fait | usine-codex-59 | PASS | 2026-09-27T23:09:08Z · 124s · 466 l. |
| 026-033 | feature | fait | usine-codex-58 | PASS | 2026-09-27T23:06:33Z · 11s · 446 l. |
| 026-042 | feature | fait | usine-codex-57 | PASS | 2026-09-27T22:55:45Z · 72s · 520 l. |
| 026-031 | feature | fait | usine-codex-56 | PASS | 2026-09-27T22:53:06Z · 163s · 427 l. |
| 026-007 | feature | fait | claude-code | PASS | 2026-09-27T22:50:20Z · 5s · 406 l. |
| 026-030 | feature | fait | usine-codex-55 | PASS | 2026-09-27T22:48:21Z · 142s · 384 l. |
| 026-053 | feature | fait | codex | PASS | 2026-09-27T22:08:11Z · 111s · 0 l. |
| 026-067 | test | fait | claude-code | PASS | 2026-09-27T21:08:41Z · 650s · 0 l. |
| 026-040 | feature | fait | claude-code | PASS | 2026-09-27T20:47:49Z · 100s · 639 l. |
| 026-052 | test | fait | claude-code | PASS | 2026-09-27T20:41:33Z · 770s · 0 l. |
| 026-013 | feature | fait | claude-code | PASS | 2026-09-27T19:12:21Z · 11s · 2324 l. |
| 026-050 | feature | fait | claude-code | PASS | 2026-09-27T19:03:27Z · 128s · 1479 l. |

… 129 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
