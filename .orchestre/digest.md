<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-27T22:50:20Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex, gemini-cli, qwen) : 100 tâche(s) PASS, 188067 ligne(s) · faites par Claude Code : 36 tâche(s) PASS, 99664 ligne(s).
**État** — file : 0 · en cours : 6 · faites : 142 · refusées : 7

## ⚠ 1 question(s) en attente
- `.orchestre/en-cours/025-10.question.md` → `node scripts/orchestre.mjs repondre 025-10 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 023-03 | test | en-cours | codex-22 | — | depuis 2026-09-16T19:22:27Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | usine-codex-13 | — | depuis 2026-09-24T18:37:22Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-031 | feature | en-cours | usine-codex-56 | — | depuis 2026-09-27T22:39:00Z · Tenir l'article 3 bis des CGU : dater la suppression du compte sur ses sites en ligne quand la purge réussit et prévenir l'artisan, puis douze mois plus tard envoyer le lien du dossier, passer la commande à retiree, détacher le domaine et purger les fichiers à l'expiration, le tout dans tourLivraison |
| 026-034 | feature | en-cours | claude-code | — | depuis 2026-09-27T19:40:57Z · Écrire la migration 0099 dont les déclencheurs refusent dans la base toute entrée d'un envoi en prepare ou approuve pendant la pause générale, vers une clé en opposition active, en premier contact tant que l'interrupteur envoi_froid est fermé, à moins de 90 jours, au-delà de 3 messages ou à moins de 72 h, au-delà des plafonds du jour du canal (envois et nouveaux contacts comptés à part), en second formulaire à une même entreprise (un par entreprise, à vie), en e-mail sans preuve de demande ou en premier contact par e-mail, en relance hors des règles de la voie gratuite, ou approuvé sans les trois verdicts par un autre que le Facteur, annulent les envois en attente d'un nouvel opposant, et exposent ops_garde_etat(), avec jumeaux, contrôle et compte rendu d'essai à sec |
| 026-042 | feature | en-cours | usine-codex-57 | — | depuis 2026-09-27T22:40:43Z · Créer les 7 fichiers de routes /api/agents/* du bus (créer, prendre et rendre une tâche, écrire et lire des événements, créer une décision et relire ses décisions tranchées, battement, état) derrière le drapeau busAgents baissé, chacune gardée par authAgent, limitée aux types et tables de l'agent et branchée sur une seule fonction de lib/agents/bus.ts, sans aucune route qui tranche, approuve ou change un interrupteur |
| 026-104 | test | en-cours | claude-code | — | depuis 2026-09-27T19:05:19Z · Écrire le juge d'écran de la station pilotage-ecran-qa (--partie=station\|vues\|salles\|salles-suite\|fil\|gestes\|experience : captures prises par le juge à 1440×900 et 390×844 sur la copie au drapeau levé, vues servies par un jeu d'essai tiré au hasard, événement injecté, immobilité mesurée sans événement), le script de recette pilotage-recette.mjs (--avant, --reel, --constat) et le lot c de la preuve, chacun échouant sur la référence avec son premier critère |
| 026-007 | feature | fait | claude-code | PASS | 2026-09-27T22:50:20Z · 5s · 406 l. |
| 026-030 | feature | fait | usine-codex-55 | PASS | 2026-09-27T22:48:21Z · 142s · 384 l. |
| 026-053 | feature | fait | codex | PASS | 2026-09-27T22:08:11Z · 111s · 0 l. |
| 026-168 | test | fait | claude-code | PASS | 2026-09-27T21:43:00Z · 378s · 2169 l. |
| 026-067 | test | fait | claude-code | PASS | 2026-09-27T21:08:41Z · 650s · 0 l. |
| 026-040 | feature | fait | claude-code | PASS | 2026-09-27T20:47:49Z · 100s · 639 l. |
| 026-052 | test | fait | claude-code | PASS | 2026-09-27T20:41:33Z · 770s · 0 l. |
| 026-223 | feature | fait | usine-codex-54 | PASS | 2026-09-27T20:26:16Z · 2s · 451 l. |
| 026-146 | feature | fait | usine-codex-53 | PASS | 2026-09-27T20:23:49Z · 53s · 539 l. |
| 026-039 | contenu | refuse | usine-codex-52 | FAIL | ✅ CP-6 npm run typecheck vert (162 s) |
| 026-121 | test | fait | claude-code | PASS | 2026-09-27T19:57:16Z · 155s · 2507 l. |
| 026-220 | test | fait | claude-code | PASS | 2026-09-27T19:52:14Z · 112s · 3246 l. |
| 026-037 | test | fait | claude-code | PASS | 2026-09-27T19:50:11Z · 777s · 5646 l. |
| 026-027 | feature | fait | claude-code | PASS | 2026-09-27T19:29:12Z · 49s · 465 l. |
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

… 55 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
