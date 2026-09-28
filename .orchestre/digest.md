<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-28T12:53:15Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 116 tâche(s) PASS, 193681 ligne(s) · faites par Claude Code : 61 tâche(s) PASS, 107027 ligne(s).
**État** — file : 1 · en cours : 13 · faites : 185 · refusées : 9

## ⚠ 3 question(s) en attente
- `.orchestre/en-cours/025-10.question.md` → `node scripts/orchestre.mjs repondre 025-10 <n>`
- `.orchestre/en-cours/026-124.question.md` → `node scripts/orchestre.mjs repondre 026-124 <n>`
- `.orchestre/en-cours/026-135.question.md` → `node scripts/orchestre.mjs repondre 026-135 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-100 | feature | en-cours | claude-code | — | depuis 2026-09-28T12:29:48Z · Écrire scripts/livrer-site.mjs, qui enchaîne pour une commande payée l'export, la rédaction, generer.mjs --source, puis site-deposer.mjs (qui lance site-qa), sous un verrou, avec deux régénérations au plus, un journal sans donnée personnelle, un mode --ci qui tourne sans le poste sous Linux (GitHub Actions, qui ne dépose que sur une commande encore payée) et un mode --usine --entree= --sortie=, sans base ni stockage, pour le livreur de l'usine Oracle (sortie et manifeste au contrat de docs/agents/usine-production.md) |
| 026-076 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:47:03Z · Écrire la migration *_pilotage_lecture.sql (treize fonctions public.pilotage_* SECURITY DEFINER réservées à service_role : décisions ouvertes, une décision, décisions par clé, agents avec leur dernier événement, leur prochain passage, leur coût du mois et leur modèle, coûts par agent, par tâche et par modèle (0 € attendu), état du Chef, fil d'événements, sources de la file Attention, tâches d'un agent, publication et lecture de l'état de l'orchestre dans la table fermée ops.code_etat), ses jumeaux de repli (`_A_COLLER_*`), son contrôle et le compte rendu d'un essai à sec généré par le juge |
| 023-03 | test | en-cours | codex-22 | — | depuis 2026-09-16T19:22:27Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | usine-codex-13 | — | depuis 2026-09-24T18:37:22Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-061 | feature | en-cours | claude-code | — | depuis 2026-09-28T10:14:29Z · Écrire la migration supabase/migrations/0106_acquisition_echanges.sql (envois préparés puis approuvés par le seul Facteur, avec leur preuve de demande, leur référence et leur preuve de soumission ; formulaires à porter par l'usine ; réponses relevées dans la boîte Gmail de prospection, seulement les messages adressés à l'adresse de prospection, ou reçues du webhook Meta ; conversations Meta, rendez-vous, maquettes et vidéos dans un bucket privé de 3 Mo par fichier), ses jumeaux, son contrôle et la partie MagasinEchanges de magasinSupabase.ts, essayée à sec, dont les fonctions rendent { ok: false, raison } sans lever pour le premier contact de trop, le second formulaire à une entreprise, l'e-mail sans preuve de demande, l'opposition, les 90 jours, le 4e message, les 72 h, les verdicts manquants et le lien expiré |
| 026-071 | test | en-cours | claude-code | — | depuis 2026-09-28T12:19:59Z · Écrire scripts/maquette-video-qa.mjs (qui fait tourner lui-même le script de vidéo sur un site d'essai et mesure le fichier par ffprobe et ffmpeg) et scripts/douleurs-qa.mjs (forme, absence de donnée personnelle, et chaque citation relue par le juge lui-même sur sa page source), avec leurs jeux d'essai, et les inscrire au lot 7 de juges-026-acquisition-preuve.mjs, qui sort en 0 seulement si chacun échoue sur la référence avec son premier critère et passe son autocontrôle |
| 026-086 | feature | en-cours | claude-code | — | depuis 2026-09-28T12:22:31Z · Écrire la migration 0101 qui active pg_cron et pg_net et planifie chaque minute public.ops_horloge_minute() (baux expirés, décisions échues, puis GET https://prestiapp.fr/api/agents/tic avec le jeton CRON_SECRET lu dans Supabase Vault et un timeout_milliseconds explicite), plus un ménage quotidien et ops_horloge_etat() qui ne rend jamais le secret, avec jumeaux, contrôle et compte rendu d'essai à sec |
| 026-109 | feature | en-cours | claude-code | — | depuis 2026-09-28T12:53:08Z · Donner à l'orchestre des baux qui expirent (2 × maxMinutes sans battement), les commandes battement, expirer et promouvoir, un disjoncteur par tâche (3 tentatives échouées ou 2 échecs identiques → DISJONCTÉE), la quarantaine des décisions écrites par un exécutant et un bloc « Attention » en tête du digest, dans la source puis par maj, jusqu'au vert du groupe baux de preuve-026 |
| 026-124 | test | en-cours | claude-code | — | depuis 2026-09-28T10:18:12Z · Ajouter à video-qa un profil pub-locale (vertical 15 s, voix ou silence) sans changer les profils reseaux et landing, écrire visages-qa (OpenCV YuNet, modèle épinglé par empreinte, étalonné sur les photos des démos) et socle-pubs-qa qui prouve les deux, pour que juges-026-pubs-contenu-preuve --lot=09 soit vert |
| 026-135 | feature | en-cours | usine-codex-73 | — | depuis 2026-09-28T11:26:50Z · Écrire lib/packPubDossier.ts (nettoyerDossierPack, pure, qui n'accepte que les photos de l'artisan lui-même) et la route GET/PUT /api/pubs/commander/brouillon qui lit et enregistre le dossier du pack derrière le drapeau packPub |
| 026-204 | test | en-cours | claude-code | — | depuis 2026-09-28T12:20:18Z · C01 — juges du contenu et preuve du domaine réseaux, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-232 | test | en-cours | claude-code | — | depuis 2026-09-28T12:34:08Z · Écrire le contrat de l'auto-recherche (lib/savoir/recherche.ts : le savoir d'abord, puis le web par Firecrawl sous la réserve de crédits et Perplexity seulement plan et coût constatés, jamais une donnée personnelle dans une requête web, jamais un extrait prospects à un agent sans personnelles, chaque résultat avec sa source, un événement savoir_recherche par appel) et son juge scripts/savoir-recherche-qa.mjs (critères SVR, parties outil et cli, et --reel) avec jeux d'essai, témoin et sabotages, et prouver qu'il échoue aujourd'hui sur SVR-1 et passe sur le témoin |
| 026-234 | test | en-cours | claude-code | — | depuis 2026-09-28T12:38:19Z · Écrire le contrat de l'auto-apprentissage (une leçon candidate par verdict en échec, décision tranchée ou correction, datée et sourcée ; validée seulement par Claude Code ou par la revue du lundi et rangée dans docs/savoir/lecons/ ; choisie par agent et injectée dans sa consigne par la porte unique et par l'entrée du chef), sa consigne docs/agents/lecons.md, l'étape « Leçons » de docs/agents/revue-hebdo.md, et le juge scripts/savoir-lecons-qa.mjs (critères SVL, parties candidats, validation, selection, branchement, --document) avec jeux d'essai, témoin et sabotages, et prouver qu'il échoue aujourd'hui sur SVL-1 et passe sur le témoin |
| 026-006 | feature | file | claude-code | — | Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 026-118 | feature | refuse | usine-codex-78 | FAIL | PASS PP-8 — POST : 404 (drapeau packPub), authArtisan, 403 fondateur, erreursAvantPaiementPack, parametresCheckoutPack, poserSessionStripePack, dans l'ordre ; a |
| 026-068 | feature | fait | usine-codex-70 | FAIL | ❌ RL-3 copie ou serveur : RL-3 : next dev (copie) ne répond pas après 240 s : serwist) Serwist is disabled. ○ (serwist) Serwist is disabled. ✓ Ready in 97s ○ Co |
| 026-051 | feature | fait | codex | PASS | 2026-09-28T12:47:26Z · 93s · 0 l. |
| 026-070 | feature | fait | usine-codex-71 | PASS | 2026-09-28T12:46:24Z · 71s · 640 l. |
| 026-072 | feature | fait | codex | PASS | 2026-09-28T12:43:47Z · 258s · 0 l. |
| 026-248 | test | fait | claude-code | PASS | 2026-09-28T12:42:10Z · 864s · 0 l. |
| 026-119 | feature | fait | codex | FAIL | Error: Cannot find module 'C:\Users\benja\AppData\Local\Temp\vi-026-119-66468\scripts\crieur-qa.mjs' |
| 026-230 | feature | refuse | usine-codex-77 | FAIL | FAIL SVS-1 — interrupteurs.semantique est actif sans depuis/accord |
| 026-229 | test | fait | claude-code | PASS | 2026-09-28T12:07:17Z · 224s · 4389 l. |
| 026-077 | feature | fait | usine-codex-75 | PASS | 2026-09-28T12:05:37Z · 124s · 649 l. |
| 026-039 | contenu | fait | antigravity | PASS | 2026-09-28T11:44:10Z · 322s · 0 l. |
| 026-110 | test | fait | claude-code | PASS | 2026-09-28T11:39:06Z · 364s · 0 l. |
| 026-041 | test | fait | claude-code | PASS | 2026-09-28T11:37:03Z · 224s · 0 l. |
| 026-058 | feature | fait | claude-code | PASS | 2026-09-28T11:26:57Z · 5s · 0 l. |
| 026-069 | test | fait | claude-code | PASS | 2026-09-28T11:20:32Z · 33s · 0 l. |
| 026-049 | feature | fait | usine-codex-66 | PASS | 2026-09-28T11:17:07Z · 151s · 420 l. |
| 026-114 | feature | fait | claude-code | PASS | 2026-09-28T11:14:24Z · 7s · 0 l. |
| 026-043 | feature | fait | claude-code | PASS | 2026-09-28T11:14:15Z · 168s · 0 l. |
| 026-116 | test | fait | claude-code | PASS | 2026-09-28T11:13:27Z · 84s · 0 l. |
| 026-057 | feature | fait | usine-codex-69 | PASS | 2026-09-28T11:09:25Z · 88s · 702 l. |
| 026-107 | feature | fait | claude-code | PASS | 2026-09-28T11:08:26Z · 78s · 511 l. |
| 026-112 | feature | fait | claude-code | PASS | 2026-09-28T11:04:56Z · 195s · 622 l. |
| 026-160 | feature | fait | usine-codex-67 | PASS | 2026-09-28T10:55:31Z · 45s · 474 l. |
| 026-100 | feature | refuse | usine-codex-65 | FAIL | ❌ CH-8 rédacteur en échec : le journal montre ["export"], l'export puis la rédaction seulement attendus |
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
| 000-geo-presti | feature | fait | usine-codex-40 | PASS | 2026-09-27T06:14:53Z · 0s · 274 l. |
| 026-065 | feature | fait | ag-065g | PASS | 2026-09-26T15:57:21Z · 8s · 527 l. |
| 026-055 | feature | fait | ag-055g | PASS | 2026-09-26T15:47:57Z · 12s · 312 l. |
| 000-marketing-026 | contenu | fait | usine-codex-38 | PASS | 2026-09-26T15:00:53Z · 2s · 238 l. |
| 026-023 | test | fait | claude-code | PASS | 2026-09-26T14:45:59Z · 63s · 3246 l. |
| 026-022 | feature | fait | usine-codex-37 | PASS | 2026-09-26T09:46:00Z · 10s · 347 l. |
| 026-017 | feature | fait | usine-codex-36 | PASS | 2026-09-26T09:40:39Z · 17s · 411 l. |
| 026-014 | feature | fait | usine-codex-35 | PASS | 2026-09-26T09:39:36Z · 14s · 407 l. |

… 108 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
