<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-28T09:15:21Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex, gemini-cli, qwen) : 105 tâche(s) PASS, 189357 ligne(s) · faites par Claude Code : 48 tâche(s) PASS, 101354 ligne(s).
**État** — file : 2 · en cours : 9 · faites : 157 · refusées : 7

## ⚠ 3 question(s) en attente
- `.orchestre/en-cours/025-10.question.md` → `node scripts/orchestre.mjs repondre 025-10 <n>`
- `.orchestre/en-cours/026-058.question.md` → `node scripts/orchestre.mjs repondre 026-058 <n>`
- `.orchestre/en-cours/026-076.question.md` → `node scripts/orchestre.mjs repondre 026-076 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-229 | test | en-cours | claude-code | — | depuis 2026-09-28T08:36:54Z · Écrire le contrat du socle du savoir (docs/savoir/sources.json, liste FERMÉE des sources avec leurs classes et leurs exclusions ; docs/savoir/reglages.json, interrupteurs tous éteints) et son juge scripts/savoir-socle-qa.mjs (critères SVS, parties export, envoi, reception, index, unites, et --reel) avec ses jeux d'essai et un témoin, puis prouver qu'il échoue aujourd'hui sur SVS-2, passe sur le témoin et attrape chaque sabotage |
| 026-076 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:47:03Z · Écrire la migration *_pilotage_lecture.sql (treize fonctions public.pilotage_* SECURITY DEFINER réservées à service_role : décisions ouvertes, une décision, décisions par clé, agents avec leur dernier événement, leur prochain passage, leur coût du mois et leur modèle, coûts par agent, par tâche et par modèle (0 € attendu), état du Chef, fil d'événements, sources de la file Attention, tâches d'un agent, publication et lecture de l'état de l'orchestre dans la table fermée ops.code_etat), ses jumeaux de repli (`_A_COLLER_*`), son contrôle et le compte rendu d'un essai à sec généré par le juge |
| 026-060 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:46:43Z · Écrire la migration supabase/migrations/0105_acquisition_socle.sql, ses deux jumeaux de repli, son contrôle, lib/agents/acquisition/magasinSupabase.ts pour MagasinSocle, la section 11 du registre des traitements et l'analyse d'intérêt légitime, essayée à sec, pour que les fonctions public.acq_* du socle existent réservées à service_role (entrants comptés chauds, opposition temporaire, conservation de 3 ans depuis le dernier contact venu du prospect, cible artisan ou marque, curseurs d'import, jeton Meta rangé dans le coffre) et que les quinze agents opérationnels du bus, dont le Facteur, le porteur du formulaire de l'usine, le Répondeur et l'Expérience, soient enregistrés dans ops.agents avec leur période |
| 026-036 | feature | en-cours | ? | — | depuis ? · Écrire la migration 0100 qui crée la file durable argent de Supabase Queues (pgmq) et ses fonctions SECURITY DEFINER réservées à service_role (envoi une seule fois par clé, lecture sous délai d'invisibilité borné, abandon après 3 lectures avec événement, effet marqué une seule fois), avec jumeaux, contrôle et compte rendu d'un essai à sec généré par le juge |
| 023-03 | test | en-cours | codex-22 | — | depuis 2026-09-16T19:22:27Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | usine-codex-13 | — | depuis 2026-09-24T18:37:22Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-054 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:46:12Z · Écrire la migration de l'usine 0110_usine_socle.sql qui crée le bucket privé usine à ses limites, la fonction ops_tache_detenue réservée à service_role et les graines des agents usine et livreur_usine, ses deux jumeaux de repli (`_A_COLLER_*`) et son contrôle en lecture seule, puis l'éprouver à sec sur la vraie base avant que Claude Code l'applique par le connecteur Supabase |
| 026-058 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:46:30Z · Mettre en service le socle des agents sur l'usine Oracle — compte agents, coffre à clés plafonnées en 600, assistants presti-coffre et presti-journal avec leur sudoers, code du commit déployé en lecture seule dans /srv/presti-agents — puis la surveillance (jeton de l'agent usine créé et posé dans le coffre par Claude Code après le oui de Benj, sans être affiché, presti-surveillance.service actif), après les « oui » de Benj, jusqu'au vert de scripts/usine-socle-qa.mjs --reel --groupe=socle,surveillance |
| 026-169 | feature | en-cours | claude-code | — | depuis 2026-09-28T08:47:07Z · Redessiner la station dans l'atelier Claw3D de l'usine (~/claw3d-pixel, liste blanche fermée) avec les seuls packs CC0 du lot A, sans aucun téléchargement : les 20 salles et la salle réservée E-commerce (porte fermée), la nébuleuse, 4 personnages et 1 portrait, dans la vraie mise en page, sans aucune donnée, la grille et le facteur entier fixés à 1440, 1280 et 390 px, le Vaisseau en 3 modules ; laisser l'atelier à un commit local cité, et écrire docs/station/planche.md, grille.json et licence-planche.json, jusqu'au vert de station-planche-qa --partie=planche |
| 026-100 | feature | file | codex | — | Écrire scripts/livrer-site.mjs, qui enchaîne pour une commande payée l'export, la rédaction, generer.mjs --source, puis site-deposer.mjs (qui lance site-qa), sous un verrou, avec deux régénérations au plus, un journal sans donnée personnelle, un mode --ci qui tourne sans le poste sous Linux (GitHub Actions, qui ne dépose que sur une commande encore payée) et un mode --usine --entree= --sortie=, sans base ni stockage, pour le livreur de l'usine Oracle (sortie et manifeste au contrat de docs/agents/usine-production.md) |
| 026-107 | feature | file | codex | — | Déplacer executant.mjs et antigravity.mjs dans le dépôt orchestre (bin/), sans chemin propre à presti, les faire recopier par maj, retirer gemini-cli et qwen des exécutants, puis lancer maj dans presti, jusqu'au vert du groupe source de ../orchestre/test/preuve-026.mjs |
| 026-039 | contenu | refuse | antigravity | FAIL | ❌ CP-6 npm run typecheck en code 2 : lib/siteRedacteur.ts(21,7): error TS2322: Type 'string' is not assignable to type 'number'. |
| 026-108 | test | fait | claude-code | PASS | 2026-09-28T09:02:58Z · 482s · 0 l. |
| 026-142 | test | fait | claude-code | PASS | 2026-09-28T09:00:40Z · 4s · 0 l. |
| 026-037 | test | fait | claude-code | PASS | 2026-09-28T09:00:23Z · 431s · 0 l. |
| 026-062 | test | fait | claude-code | PASS | 2026-09-28T08:48:03Z · 33s · 2721 l. |
| 026-004 | test | fait | claude-code | PASS | 2026-09-28T08:42:18Z · 16s · 1235 l. |
| 026-041 | test | fait | claude-code | PASS | 2026-09-28T08:39:40Z · 118s · 1731 l. |
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
| 026-020 | feature | fait | usine-codex-33 | PASS | 2026-09-26T09:35:58Z · 30s · 500 l. |
| 026-005 | feature | fait | usine-codex-34 | PASS | 2026-09-26T09:35:16Z · 32s · 425 l. |
| 026-003 | feature | fait | ag-26003 | PASS | 2026-09-26T09:33:15Z · 20s · 282 l. |
| 026-019 | feature | fait | usine-codex-32 | PASS | 2026-09-26T09:29:22Z · 54s · 433 l. |
| 026-015 | feature | fait | usine-codex-31 | PASS | 2026-09-26T09:26:47Z · 37s · 371 l. |
| 026-048 | test | fait | claude-code | PASS | 2026-09-26T08:38:11Z · 4s · 4321 l. |
| 026-018 | test | fait | claude-code | PASS | 2026-09-26T06:16:11Z · 38s · 7611 l. |
| 026-016 | test | fait | claude-code | PASS | 2026-09-26T05:03:27Z · 5s · 12254 l. |
| 026-012 | test | fait | claude-code | PASS | 2026-09-26T03:19:55Z · 5s · 10049 l. |
| 026-009 | test | fait | claude-code | PASS | 2026-09-26T01:56:41Z · 33s · 6788 l. |
| 026-002 | test | fait | claude-code | PASS | 2026-09-26T00:09:53Z · 333s · 2202 l. |
| 026-001 | test | fait | claude-code | PASS | 2026-09-25T22:41:52Z · 116s · 2257 l. |
| 025-23 | feature | fait | usine-codex-30 | PASS | 2026-09-25T18:14:20Z · 304s · 230 l. |
| 000-usine-executer-local | test | fait | usine-codex-29 | PASS | 2026-09-25T17:20:48Z · 11s · 1 l. |
| 025-20 | feature | fait | usine-codex-28 | PASS | 2026-09-25T14:44:47Z · 58s · 281 l. |
| 025-19 | feature | fait | usine-codex-27 | PASS | 2026-09-25T14:37:46Z · 38s · 320 l. |
| 025-21 | feature | fait | usine-codex-25 | PASS | 2026-09-25T14:28:45Z · 89s · 279 l. |
| 025-22 | feature | fait | usine-codex-26 | PASS | 2026-09-25T14:20:46Z · 72s · 375 l. |
| 025-18 | feature | fait | usine-codex-24 | PASS | 2026-09-25T14:14:26Z · 36s · 282 l. |
| 027-02 | feature | fait | usine-codex-23 | PASS | 2026-09-25T10:53:31Z · 491s · 1294 l. |
| 025-14 | feature | fait | codex | PASS | 2026-09-25T08:42:46Z · 324s · 0 l. |
| 025-16 | feature | fait | codex | PASS | 2026-09-25T07:45:27Z · 167s · 0 l. |
| 025-17 | feature | fait | usine-codex-19 | PASS | 2026-09-24T22:08:06Z · 49s · 325 l. |
| 025-15 | contenu | fait | usine-codex-16 | PASS | 2026-09-24T21:41:45Z · 11s · 313 l. |
| 000-usine-cf8 | test | fait | usine-codex-14 | PASS | 2026-09-24T21:14:59Z · 21s · 1 l. |
| 025-13 | feature | fait | claude-code | PASS | 2026-09-24T20:39:30Z · 6s · 1492 l. |
| 025-03 | feature | fait | usine-codex-11 | PASS | 2026-09-24T18:33:17Z · 59s · 476 l. |
| 025-12 | feature | fait | claude-code | PASS | 2026-09-24T18:18:27Z · 4s · 1194 l. |
| 025-11 | contenu | fait | usine-codex-12 | PASS | 2026-09-24T18:10:22Z · 51s · 347 l. |
| 025-06 | contenu | fait | usine-codex-10 | PASS | 2026-09-24T17:57:36Z · 4s · 271 l. |
| 025-02 | feature | fait | usine-codex-9 | PASS | 2026-09-24T17:57:23Z · 17s · 403 l. |
| 025-09 | feature | fait | usine-codex-8 | PASS | 2026-09-24T17:45:51Z · 276s · 326 l. |
| 025-05 | feature | fait | usine-codex-7 | PASS | 2026-09-24T17:35:54Z · 356s · 682 l. |

… 75 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
