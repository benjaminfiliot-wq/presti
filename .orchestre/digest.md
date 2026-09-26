<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-26T09:29:50Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex, gemini-cli, qwen) : 80 tâche(s) PASS, 181176 ligne(s) · faites par Claude Code : 13 tâche(s) PASS, 49369 ligne(s).
**État** — file : 4 · en cours : 3 · faites : 99 · refusées : 6

## ⚠ 1 question(s) en attente
- `.orchestre/en-cours/025-10.question.md` → `node scripts/orchestre.mjs repondre 025-10 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 023-03 | test | en-cours | codex-22 | — | depuis 2026-09-16T19:22:27Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | usine-codex-13 | — | depuis 2026-09-24T18:37:22Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-020 | feature | en-cours | usine-codex-33 | — | depuis 2026-09-26T09:29:48Z · Créer lib/agents/acquisition/lecteurSite.ts : lecture polie d'un site d'artisan (robots.txt selon la RFC 9309, 1 requête par seconde et par hôte, 4 pages et 1 Mo par page au plus, ni autre domaine ni adresse privée) qui rend un JSON validé de faits cités mot pour mot, d'un audit factuel (HTTPS, affichage mobile, année du copyright), du SIREN des mentions, du formulaire de contact avec sa technologie et son verdict (éligible, ou abandon définitif au moindre captcha, pot de miel, refus du démarchage, clause contre les robots ou robots.txt qui interdit l'URL d'action), et des comptes Instagram et Facebook qu'il publie ; aucune adresse e-mail n'est jamais relevée |
| 026-003 | feature | file | codex | — | Faire décider le type d'une image envoyée à /api/media par ses premiers octets (JPEG, PNG, WebP acceptés ; HEIC, AVIF, SVG et le reste refusés en 415) grâce à une fonction pure lib/typeImage.ts, et écrire le fichier avec le type et l'extension détectés |
| 026-005 | feature | file | codex | — | Écrire scripts/instantane-quotidien.mjs, qui fige l'arbre de travail dans un commit hors de main par un index temporaire, exclut .exe, secrets, données de prospects et fichiers de plus de 90 Mo, pousse ce seul commit sur une branche instantane-AAAA-MM-JJ du dépôt de sauvegarde sans jamais forcer, et journalise chaque passage |
| 026-014 | feature | file | codex | — | Créer les modules purs lib/pilotage/decisions.ts (5 cartes au plus triées par euros puis échéance, 2 à 7 options, libellé du défaut prudent, portée de reconfirmation exigée), lib/pilotage/appels.ts (cartes À appeler avec lien tel: normalisé) et lib/pilotage/liens.ts (liens du Pilotage qui ne portent qu'un identifiant) |
| 026-017 | feature | file | codex | — | Créer les modules purs lib/pilotage/agents.ts (état de chaque agent : actif, muet, en panne depuis plus de 2 h, en pause, disjoncteur, avec son coût du mois) et lib/pilotage/code.ts (résumé de l'orchestre et des PR, périmé au-delà de 2 h), et scripts/pilotage-code-publier.mjs qui publie depuis le poste un état de l'orchestre de 20 Ko au plus, sans jamais afficher un secret |
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
| 000-usine-essai-3 | test | fait | codex | PASS | 2026-09-24T16:30:42Z · 0s · 0 l. |
| 027-01 | feature | fait | codex | PASS | 2026-09-24T16:16:49Z · 37s · 0 l. |
| 000-usine-essai-2 | test | fait | usine-codex-2 | PASS | 2026-09-24T15:59:45Z · 1s · 2 l. |
| 000-usine-essai | test | fait | usine-codex-1 | PASS | 2026-09-24T15:55:22Z · 0s · 1 l. |
| 025-07 | feature | fait | claude-code | PASS | 2026-09-24T15:48:48Z · 22s · 270 l. |
| 025-04 | feature | fait | claude-code | PASS | 2026-09-24T15:43:35Z · 1s · 652 l. |
| 023-04 | feature | fait | ag-46-flash | PASS | 2026-09-16T20:18:52Z · 7s · 1549 l. |
| 021-16 | feature | refuse | ag-45-flash | FAIL | · EC : ✗ grande scène des étapes : FAIL — EC-8 : 0 tâche(s) longue(s) (0) et p95 des intervalles rAF 33.3 ms (≤ 20) aux deux essais ; référence sans eclate dans |
| 023-01 | test | fait | antigravity | PASS | 2026-09-16T17:50:08Z · 292s · 0 l. |
| 023-02 | feature | fait | antigravity | PASS | 2026-09-16T17:48:21Z · 246s · 0 l. |
| 022-01 | contenu | fait | antigravity | PASS | 2026-09-16T17:25:37Z · 0s · 0 l. |
| 022-05 | contenu | fait | codex-pr-02 | PASS | 2026-09-16T10:46:06Z · 3s · 0 l. |
| 021-02 | feature | refuse | codex-18 | FAIL | · RX-7 : signature-relief-qa.mjs → ✗ relief de la signature : FAIL — geste au repos : ✗ signature au repos : FAIL — téléphone 390×844 : signature-projecteur, si |
| 021-20 | feature | refuse | codex-relais | FAIL | · SS-5 : ✗ socle des familles : FAIL — SO-1 : sans famille, la sortie diffère de la référence (différents : aucun ; manquants : bureau.css ; en trop |
| 021-23 | test | fait | antigravity | PASS | 2026-09-15T21:56:40Z · 0s · 0 l. |
| 021-17 | feature | fait | codex-21 | PASS | 2026-09-15T21:16:46Z · 451s · 0 l. |
| 021-04 | contenu | fait | claude-021-04 | PASS | 2026-09-15T16:59:18Z · 2s · 1028 l. |
| 021-14 | contenu | refuse | ag-41-lite | FAIL | ✗ films natif et Lenis : FAIL — LN-7 : la première image de natif.mp4 ne ressemble pas à l'accueil de la démo (écart 1.000, moins de 0,15) : page sans styles, m |
| 022-04 | feature | fait | codex | PASS | 2026-09-15T14:01:52Z · 29s · 0 l. |
| 022-02 | contenu | fait | codex | PASS | 2026-09-15T13:44:04Z · 0s · 0 l. |
| 021-10 | contenu | fait | ag-33-flash | PASS | 2026-09-15T13:30:17Z · 30s · 422 l. |
| 021-01 | feature | fait | claude-code | PASS | 2026-09-15T13:21:27Z · 172s · 291 l. |
| 021-09 | contenu | fait | ag-31-flash | PASS | 2026-09-15T12:54:04Z · 4s · 566 l. |
| 020-15 | feature | fait | codex-14 | PASS | 2026-09-15T11:56:34Z · 123s · 0 l. |
| 020-02 | feature | fait | codex-13 | PASS | 2026-09-15T11:35:17Z · 107s · 0 l. |
| 020-13 | contenu | fait | ag-28-flash | PASS | 2026-09-15T11:34:45Z · 1s · 5784 l. |
| 020-11 | contenu | fait | ag-26-flash | PASS | 2026-09-15T11:10:10Z · 1s · 10430 l. |
| 020-12 | contenu | fait | ag-27-flash | PASS | 2026-09-15T10:50:01Z · 1s · 36858 l. |
| 020-14 | feature | fait | codex-12 | PASS | 2026-09-15T10:40:33Z · 48s · 0 l. |
| 020-10 | contenu | fait | codex-11 | PASS | 2026-09-15T10:34:33Z · 1s · 0 l. |
| 019-03 | contenu | fait | codex-10 | PASS | 2026-09-15T07:48:53Z · 2s · 0 l. |
| 019-02 | feature | fait | codex-9 | PASS | 2026-09-15T07:29:47Z · 40s · 0 l. |
| 019-01 | feature | fait | codex-8 | PASS | 2026-09-15T07:12:46Z · 22s · 0 l. |
| 018-10 | contenu | fait | codex-6 | PASS | 2026-09-15T02:12:56Z · 16s · 0 l. |
| 018-09 | feature | fait | ag-25-flash | PASS | 2026-09-15T02:12:55Z · 10s · 14826 l. |
| 018-08 | contenu | fait | ag-24-flash | PASS | 2026-09-14T20:25:41Z · 8s · 2720 l. |
| 018-07 | feature | fait | ag-23-flash | PASS | 2026-09-14T20:22:47Z · 79s · 6359 l. |
| 018-05 | feature | fait | ag-22-flash | PASS | 2026-09-14T20:01:01Z · 85s · 6210 l. |
| 018-06 | contenu | fait | codex-4 | PASS | 2026-09-14T20:00:45Z · 10s · 0 l. |
| 018-04 | contenu | fait | codex-3 | PASS | 2026-09-14T19:42:39Z · 2s · 0 l. |
| 018-03 | feature | fait | ag-21-flash | PASS | 2026-09-14T19:36:11Z · 9s · 18721 l. |
| 018-02 | feature | fait | codex-2 | PASS | 2026-09-14T19:34:53Z · 64s · 0 l. |
| 018-01 | feature | fait | codex-1 | PASS | 2026-09-14T19:27:44Z · 12s · 0 l. |
| 016-03 | feature | fait | claude-code | PASS | 2026-09-14T12:12:18Z · 29s · 0 l. |
| 016-02 | feature | fait | claude-code | PASS | 2026-09-14T11:53:45Z · 67s · 279 l. |
| 016-01 | contenu | fait | antigravity | PASS | 2026-09-14T11:05:42Z · 1s · 0 l. |
| 014-11 | test | fait | ag-11-g37 | PASS | 2026-09-14T09:35:02Z · 29s · 98 l. |
| 014-17 | test | fait | ag-17-g38 | PASS | 2026-09-14T09:34:14Z · 80s · 446 l. |
| 014-20 | contenu | fait | ag-20-g38 | PASS | 2026-09-14T07:53:22Z · 3s · 1198 l. |
| 014-04 | boucle-qa | fait | ag-04-g38b | PASS | 2026-09-14T05:45:11Z · 61s · 2913 l. |
| 014-19 | test | fait | ag-19-g37 | PASS | 2026-09-14T05:40:18Z · 521s · 24 l. |
| 014-18 | feature | fait | ag-18-g38 | PASS | 2026-09-14T04:51:14Z · 40s · 108 l. |
| 014-10 | boucle-qa | fait | ag-10-g38 | PASS | 2026-09-14T04:41:54Z · 174s · 4839 l. |
| 014-05 | boucle-qa | fait | ag-05-g38 | PASS | 2026-09-14T04:41:05Z · 90s · 2578 l. |
| 014-08 | boucle-qa | fait | ag-08-g38 | PASS | 2026-09-14T04:40:18Z · 131s · 3842 l. |
| 014-13 | test | fait | ag-13-gemini37flas | PASS | 2026-09-14T04:39:56Z · 22s · 293 l. |
| 014-03 | boucle-qa | fait | ag-03-g38 | PASS | 2026-09-14T04:34:21Z · 79s · 15466 l. |
| 014-02 | boucle-qa | fait | duo-02 | PASS | 2026-09-14T04:31:39Z · 87s · 13612 l. |
| 014-09 | boucle-qa | fait | claude-code | PASS | 2026-09-13T23:44:23Z · 53s · 17032 l. |
| 014-07 | boucle-qa | fait | ag-07-g38 | PASS | 2026-09-13T23:37:23Z · 156s · 3038 l. |
| 014-06 | boucle-qa | fait | ag-06-g38 | PASS | 2026-09-13T23:36:21Z · 129s · 2221 l. |
| 014-14 | feature | fait | claude-code | PASS | 2026-09-13T18:41:34Z · 64s · 0 l. |
| 014-01 | feature | fait | antigravity | PASS | 2026-09-13T17:11:39Z · 20s · 0 l. |

… 12 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
