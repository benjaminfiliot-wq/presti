<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-28T15:54:47Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 118 tâche(s) PASS, 194191 ligne(s) · faites par Claude Code : 68 tâche(s) PASS, 111141 ligne(s).
**État** — file : 11 · en cours : 3 · faites : 194 · refusées : 8

## Attention (2)
- 026-068 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-068 --forcer`
- verrou expiré : 026-073 (usine-codex-83, silencieux depuis 100 min) — `node scripts/orchestre.mjs expirer`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-086 | feature | en-cours | usine-codex-87 | — | depuis 2026-09-28T15:02:36Z · Écrire la migration 0101 qui active pg_cron et pg_net et planifie chaque minute public.ops_horloge_minute() (baux expirés, décisions échues, puis GET https://prestiapp.fr/api/agents/tic avec le jeton CRON_SECRET lu dans Supabase Vault et un timeout_milliseconds explicite), plus un ménage quotidien et ops_horloge_etat() qui ne rend jamais le secret, avec jumeaux, contrôle et compte rendu d'essai à sec |
| 026-073 | contenu | en-cours | usine-codex-83 | — | depuis 2026-09-28T14:14:18Z · Constituer la bibliothèque des douleurs lib/agents/acquisition/douleurs.ts (au moins 40 entrées sur au moins 8 métiers du bâtiment, chacune tirée de ce que des artisans écrivent eux-mêmes en public, avec la citation exacte, sa page source et sa date, les mots-clés, une question « qui appuie là où ça fait mal » et une accroche d'objet, sans aucune donnée personnelle, toutes à approuve false jusqu'à l'approbation unique de Benj) et sa méthode docs/agents/douleurs-methode.md, pour que chaque citation se retrouve mot pour mot sur sa page quand le juge la relit |
| 026-235 | feature | en-cours | usine-codex-84 | — | depuis 2026-09-28T14:56:22Z · Écrire scripts/savoir/lecons.mjs (candidats depuis les verdicts en échec, les décisions tranchées par Benj, les décisions tranchées du bus et les corrections des fiches, datées, sourcées, caviardées et idempotentes ; lister ; valider et rejeter par Claude Code ou la revue du lundi seulement, jamais sur l'usine ; verifier-source), jusqu'au vert de scripts/savoir-lecons-qa.mjs --partie=candidats,validation |
| 026-106 | feature | file | usine-codex-82 | — | Avant le premier envoi à froid, faire générer et déposer un site payé hors du poste, dans GitHub Actions, PC éteint (workflow generer-site.yml déclenché par repository_dispatch, 20 min au plus, une exécution à la fois, sans artefact ni clé du produit), demandé depuis Vercel par demanderGeneration sous un plafond mensuel d'exécutions et trois tentatives par commande |
| 026-075 | feature | file | usine-codex-81 | — | Écrire scripts/agents/maquette-video.mjs, qui fabrique sur l'usine, à partir du dossier d'une maquette générée, une vidéo verticale de 15 à 20 s qui fait défiler la page d'accueil de haut en bas (capture pleine page par Chromium, panoramique par ffmpeg), en H.264, sans son, de 3 Mo au plus, lisible en continu sur un téléphone, déterministe, sans aucune ressource d'un autre hôte |
| 026-204 | test | file | claude-code | — | C01 — juges du contenu et preuve du domaine réseaux, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 023-03 | test | file | codex-22 | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | usine-codex-13 | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-006 | feature | file | claude-code | — | Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 026-078 | feature | file | usine-codex-80 | — | Dans le Poste, montrer le résumé de la matière de chaque commande, mettre en ligne un site généré en un seul geste, noter la soumission du plan à la Search Console, envoyer le dossier sur demande, et faire remonter dans À faire chaque commande qui attend un geste humain |
| 026-124 | test | file | claude-code | — | Ajouter à video-qa un profil pub-locale (vertical 15 s, voix ou silence) sans changer les profils reseaux et landing, écrire visages-qa (OpenCV YuNet, modèle épinglé par empreinte, étalonné sur les photos des démos) et socle-pubs-qa qui prouve les deux, pour que juges-026-pubs-contenu-preuve --lot=09 soit vert |
| 026-135 | feature | file | usine-codex-73 | — | Écrire lib/packPubDossier.ts (nettoyerDossierPack, pure, qui n'accepte que les photos de l'artisan lui-même) et la route GET/PUT /api/pubs/commander/brouillon qui lit et enregistre le dossier du pack derrière le drapeau packPub |
| 026-063 | feature | file | claude-code | — | Écrire la migration 0111 des disjoncteurs de l'envoi, tenus par la base en compteurs absolus (paliers du formulaire de 5 à 40 par jour qui écrivent seuls la ligne de plafond du formulaire, technologies de formulaire, signaux de STOP, plainte, avis d'abus, échec de soumission, refus du Gmail et erreur Meta qui mettent en pause une technologie, un modèle, le formulaire, le Gmail ou Meta, montée de palier par règle et bilan des 100 premiers contacts froids, descente au premier voyant rouge, notice vérifiée, gestes du fondateur dont l'ouverture d'envoi_froid au plus tôt le 12/10, jauges, échantillon du soir), ses jumeaux, son contrôle, lib/agents/acquisition/disjoncteurs.ts et la partie MagasinEnvoi de magasinSupabase.ts, essayée à sec |
| 026-115 | feature | file | codex | — | Quand Codex annonce son quota épuisé, faire rendre la tâche à la file, noter l'échéance dans .orchestre/quotas.json, refuser codex-* dans prochaine et executant.mjs jusqu'à cette échéance et dire dans le bloc Attention quel autre exécutant lancer, jusqu'au vert du groupe quota de preuve-026 |
| 026-076 | feature | fait | claude-code | PASS | 2026-09-28T15:54:47Z · 8s · 0 l. |
| 026-071 | test | fait | claude-code | PASS | 2026-09-28T15:51:08Z · 31s · 0 l. |
| 026-061 | feature | fait | claude-code | PASS | 2026-09-28T15:50:08Z · 24s · 0 l. |
| 026-248 | test | fait | claude-code | PASS | 2026-09-28T15:45:41Z · 289s · 0 l. |
| 026-229 | test | fait | claude-code | PASS | 2026-09-28T15:39:06Z · 328s · 0 l. |
| 026-114 | feature | fait | claude-code | PASS | 2026-09-28T15:35:08Z · 3s · 0 l. |
| 026-109 | feature | fait | claude-code | PASS | 2026-09-28T15:31:01Z · 25s · 689 l. |
| 026-165 | test | fait | claude-code | PASS | 2026-09-28T15:12:14Z · 135s · 1424 l. |
| 026-068 | feature | fait | codex | DISJONCTÉE | ✅ RL-4 six blocs → 200 au contrat (bloc, source, a ; valeur à la forme, ou nulle avec erreur ou manque), jamais 500 \| ✅ RL-9 npm run typecheck vert \| ✅ RL-4 six blocs → 200 au contrat (bloc, source, a ; valeur à la forme, ou nulle avec erreur ou manque), jamais 500 |
| 026-234 | test | fait | claude-code | PASS | 2026-09-28T14:56:08Z · 243s · 3632 l. |
| 026-232 | test | fait | claude-code | PASS | 2026-09-28T14:32:10Z · 871s · 2758 l. |
| 026-116 | test | fait | claude-code | PASS | 2026-09-28T14:25:19Z · 195s · 0 l. |
| 026-100 | feature | fait | claude-code | PASS | 2026-09-28T13:58:11Z · 272s · 510 l. |
| 026-074 | feature | fait | codex | PASS | 2026-09-28T13:46:33Z · 953s · 0 l. |
| 026-118 | feature | refuse | usine-codex-78 | FAIL | PASS PP-8 — POST : 404 (drapeau packPub), authArtisan, 403 fondateur, erreursAvantPaiementPack, parametresCheckoutPack, poserSessionStripePack, dans l'ordre ; a |
| 026-051 | feature | fait | codex | PASS | 2026-09-28T12:47:26Z · 93s · 0 l. |
| 026-070 | feature | fait | usine-codex-71 | PASS | 2026-09-28T12:46:24Z · 71s · 640 l. |
| 026-072 | feature | fait | codex | PASS | 2026-09-28T12:43:47Z · 258s · 0 l. |
| 026-119 | feature | fait | codex | FAIL | Error: Cannot find module 'C:\Users\benja\AppData\Local\Temp\vi-026-119-66468\scripts\crieur-qa.mjs' |
| 026-230 | feature | refuse | usine-codex-77 | FAIL | FAIL SVS-1 — interrupteurs.semantique est actif sans depuis/accord |
| 026-077 | feature | fait | usine-codex-75 | PASS | 2026-09-28T12:05:37Z · 124s · 649 l. |
| 026-039 | contenu | fait | antigravity | PASS | 2026-09-28T11:44:10Z · 322s · 0 l. |
| 026-110 | test | fait | claude-code | PASS | 2026-09-28T11:39:06Z · 364s · 0 l. |
| 026-041 | test | fait | claude-code | PASS | 2026-09-28T11:37:03Z · 224s · 0 l. |
| 026-058 | feature | fait | claude-code | PASS | 2026-09-28T11:26:57Z · 5s · 0 l. |
| 026-069 | test | fait | claude-code | PASS | 2026-09-28T11:20:32Z · 33s · 0 l. |
| 026-049 | feature | fait | usine-codex-66 | PASS | 2026-09-28T11:17:07Z · 151s · 420 l. |
| 026-043 | feature | fait | claude-code | PASS | 2026-09-28T11:14:15Z · 168s · 0 l. |
| 026-057 | feature | fait | usine-codex-69 | PASS | 2026-09-28T11:09:25Z · 88s · 702 l. |
| 026-107 | feature | fait | claude-code | PASS | 2026-09-28T11:08:26Z · 78s · 511 l. |
| 026-112 | feature | fait | claude-code | PASS | 2026-09-28T11:04:56Z · 195s · 622 l. |
| 026-160 | feature | fait | usine-codex-67 | PASS | 2026-09-28T10:55:31Z · 45s · 474 l. |
| 026-056 | feature | fait | usine-codex-64 | PASS | 2026-09-28T10:35:50Z · 419s · 431 l. |
| 026-047 | feature | fait | usine-codex-63 | PASS | 2026-09-28T10:24:50Z · 254s · 572 l. |
| 026-131 | contenu | fait | claude-code | PASS | 2026-09-28T10:24:13Z · 44s · 311 l. |
| 026-169 | feature | fait | claude-code | PASS | 2026-09-28T10:20:16Z · 66s · 0 l. |
| 026-046 | feature | fait | usine-codex-62 | PASS | 2026-09-28T10:17:28Z · 148s · 436 l. |
| 026-060 | feature | fait | claude-code | PASS | 2026-09-28T09:58:27Z · 23s · 3091 l. |
| 026-036 | feature | fait | claude-code | PASS | 2026-09-28T09:52:10Z · 8s · 0 l. |
| 026-054 | feature | fait | claude-code | PASS | 2026-09-28T09:48:21Z · 6s · 668 l. |
| 026-108 | test | fait | claude-code | PASS | 2026-09-28T09:02:58Z · 482s · 0 l. |
| 026-142 | test | fait | claude-code | PASS | 2026-09-28T09:00:40Z · 4s · 0 l. |
| 026-037 | test | fait | claude-code | PASS | 2026-09-28T09:00:23Z · 431s · 0 l. |
| 026-062 | test | fait | claude-code | PASS | 2026-09-28T08:48:03Z · 33s · 2721 l. |
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
| 026-045 | test | fait | claude-code | PASS | 2026-09-27T18:25:07Z · 342s · 0 l. |
| 026-028 | feature | fait | codex | PASS | 2026-09-27T18:13:14Z · 8s · 0 l. |
| 026-105 | feature | fait | usine-codex-50 | PASS | 2026-09-27T16:37:50Z · 19s · 573 l. |
| 026-032 | test | fait | claude-code | PASS | 2026-09-27T16:25:16Z · 66s · 4042 l. |
| 026-026 | test | fait | claude-code | PASS | 2026-09-27T15:57:16Z · 146s · 0 l. |
| 026-066 | test | fait | claude-code | PASS | 2026-09-27T14:06:09Z · 179s · 6790 l. |
| 026-025 | feature | fait | claude-code | PASS | 2026-09-27T13:45:50Z · 40s · 696 l. |
| 026-102 | test | fait | claude-code | PASS | 2026-09-27T12:24:53Z · 272s · 10311 l. |
| 026-029 | test | fait | claude-code | PASS | 2026-09-27T12:22:57Z · 26s · 0 l. |
| 026-011 | feature | fait | claude-code | PASS | 2026-09-27T12:06:48Z · 1s · 1382 l. |
| 026-024 | feature | fait | usine-codex-42 | PASS | 2026-09-27T11:45:09Z · 27s · 476 l. |
| 000-modeles-metiers | feature | fait | ag-modeles | PASS | 2026-09-27T11:40:03Z · 0s · 487 l. |
| 026-021 | feature | fait | claude-code | PASS | 2026-09-27T11:37:25Z · 14s · 705 l. |
| 026-010 | feature | fait | claude-code | PASS | 2026-09-27T11:19:48Z · 2s · 1170 l. |
| 026-038 | test | fait | claude-code | PASS | 2026-09-27T08:57:04Z · 67s · 3072 l. |
| 000-retractation | feature | fait | usine-codex-41 | PASS | 2026-09-27T07:08:47Z · 0s · 258 l. |
| 000-revue-026 | contenu | fait | codex | PASS | 2026-09-27T06:19:46Z · 2s · 0 l. |

… 116 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
