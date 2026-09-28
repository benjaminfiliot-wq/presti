<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-28T11:30:29Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 111 tâche(s) PASS, 192392 ligne(s) · faites par Claude Code : 58 tâche(s) PASS, 104369 ligne(s).
**État** — file : 4 · en cours : 11 · faites : 175 · refusées : 9

## ⚠ 4 question(s) en attente
- `.orchestre/en-cours/025-10.question.md` → `node scripts/orchestre.mjs repondre 025-10 <n>`
- `.orchestre/en-cours/026-068.question.md` → `node scripts/orchestre.mjs repondre 026-068 <n>`
- `.orchestre/en-cours/026-119.question.md` → `node scripts/orchestre.mjs repondre 026-119 <n>`
- `.orchestre/en-cours/026-124.question.md` → `node scripts/orchestre.mjs repondre 026-124 <n>`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-229 | test | en-cours | claude-code | — | depuis 2026-09-28T08:36:54Z · Écrire le contrat du socle du savoir (docs/savoir/sources.json, liste FERMÉE des sources avec leurs classes et leurs exclusions ; docs/savoir/reglages.json, interrupteurs tous éteints) et son juge scripts/savoir-socle-qa.mjs (critères SVS, parties export, envoi, reception, index, unites, et --reel) avec ses jeux d'essai et un témoin, puis prouver qu'il échoue aujourd'hui sur SVS-2, passe sur le témoin et attrape chaque sabotage |
| 026-076 | feature | en-cours | claude-code | — | depuis 2026-09-28T07:47:03Z · Écrire la migration *_pilotage_lecture.sql (treize fonctions public.pilotage_* SECURITY DEFINER réservées à service_role : décisions ouvertes, une décision, décisions par clé, agents avec leur dernier événement, leur prochain passage, leur coût du mois et leur modèle, coûts par agent, par tâche et par modèle (0 € attendu), état du Chef, fil d'événements, sources de la file Attention, tâches d'un agent, publication et lecture de l'état de l'orchestre dans la table fermée ops.code_etat), ses jumeaux de repli (`_A_COLLER_*`), son contrôle et le compte rendu d'un essai à sec généré par le juge |
| 023-03 | test | en-cours | codex-22 | — | depuis 2026-09-16T19:22:27Z · Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | en-cours | usine-codex-13 | — | depuis 2026-09-24T18:37:22Z · Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-061 | feature | en-cours | claude-code | — | depuis 2026-09-28T10:14:29Z · Écrire la migration supabase/migrations/0106_acquisition_echanges.sql (envois préparés puis approuvés par le seul Facteur, avec leur preuve de demande, leur référence et leur preuve de soumission ; formulaires à porter par l'usine ; réponses relevées dans la boîte Gmail de prospection, seulement les messages adressés à l'adresse de prospection, ou reçues du webhook Meta ; conversations Meta, rendez-vous, maquettes et vidéos dans un bucket privé de 3 Mo par fichier), ses jumeaux, son contrôle et la partie MagasinEchanges de magasinSupabase.ts, essayée à sec, dont les fonctions rendent { ok: false, raison } sans lever pour le premier contact de trop, le second formulaire à une entreprise, l'e-mail sans preuve de demande, l'opposition, les 90 jours, le 4e message, les 72 h, les verdicts manquants et le lien expiré |
| 026-068 | feature | en-cours | usine-codex-70 | — | depuis 2026-09-28T11:17:52Z · Créer GET /api/controle/pilotage?bloc=decider\|appeler\|envois\|entonnoir\|agents\|code (404 tant que le nouveau drapeau pilotage est baissé, garde fondateur, chaque bloc sourcé et lu seulement par les fonctions pilotage_* et la logique de lib/pilotage ; le bloc envois montre les envois des agents en lecture seule, sans texte ni destinataire, par envoisDesAgents de lib/pilotage/envois.ts) et lib/pilotage/blocs.ts, et inscrire le drapeau dans la carte de scripts/fermeture-e2e.mjs |
| 026-070 | feature | en-cours | usine-codex-71 | — | depuis 2026-09-28T11:18:57Z · Créer les sept modules purs de la station dans lib/pilotage/ (barre.ts, equipage.ts, attention.ts, fil.ts, tapis.ts, missions.ts, experience.ts) qui calculent, sans réseau et à un instant donné, les compteurs de la barre, l'équipage et la position de chaque personnage à partir des seuls événements et états, la file Attention unique (7 cartes, rouge puis orange, jaune, bleu), les bulles du fil masquées, les mouvements des tapis, les missions et le niveau (sur l'argent encaissé seulement), et l'état de l'expérience isolée |
| 026-119 | feature | en-cours | usine-codex-72 | — | depuis 2026-09-28T11:19:55Z · Écrire lib/crieur/faits.ts (au moins 12 faits sur Presti, chacun avec une preuve vérifiable dans le dépôt) et lib/crieur/composer.ts (composerLot, pur et déterministe, au plus 3 publications par semaine sur LinkedIn, Facebook et Instagram, une par canal et chaque canal à son jour, seulement celles des prochaines heures demandées, 15 par mois et 3 programmées à la fois, sans répéter un fait avant 30 jours, faits sous drapeau baissé exclus, « Commente SITE » en fin de post sur Instagram et Facebook seulement si le drapeau aimantSite est levé, chaque publication acceptée par jugerPublication) |
| 026-124 | test | en-cours | claude-code | — | depuis 2026-09-28T10:18:12Z · Ajouter à video-qa un profil pub-locale (vertical 15 s, voix ou silence) sans changer les profils reseaux et landing, écrire visages-qa (OpenCV YuNet, modèle épinglé par empreinte, étalonné sur les photos des démos) et socle-pubs-qa qui prouve les deux, pour que juges-026-pubs-contenu-preuve --lot=09 soit vert |
| 026-135 | feature | en-cours | usine-codex-73 | — | depuis 2026-09-28T11:26:50Z · Écrire lib/packPubDossier.ts (nettoyerDossierPack, pure, qui n'accepte que les photos de l'artisan lui-même) et la route GET/PUT /api/pubs/commander/brouillon qui lit et enregistre le dossier du pack derrière le drapeau packPub |
| 026-248 | test | en-cours | claude-code | — | depuis 2026-09-28T10:15:00Z · Écrire le contrat du Vigile, titulaire de la salle Sécurité (relevé quotidien en lecture seule sur l'usine — erreurs des 24 h, avis npm audit et fins de support, avis du conseiller Supabase, jetons et clés à échéance, bannissements du limiteur — résumé pour Benj ; il ne change rien d'autre que la pause de sécurité d'un agent : il pose une pause de sécurité sur un agent (seuil de vigile.json), ne la lève jamais, ne pose jamais la pause générale, jamais sur Matt, Claude Code ni le pont ; il ne lit aucun secret en clair, n'appelle que Codex ou Ollama local), sa consigne docs/agents/vigile.md, ses réglages docs/agents/vigile.json et le juge scripts/vigile-qa.mjs (critères VG, parties releve, serveur, usine, resume, unites, pause, --reel) avec jeux d'essai, témoin et sabotages, et prouver qu'il échoue aujourd'hui sur VG-1 et passe sur le témoin |
| 026-006 | feature | file | claude-code | — | Passer presti à Next.js 16 (dernière 16.x), React et React DOM 19.2 et leurs types, avec le script build en next build --webpack pour @serwist/next et sans script next lint, typecheck, build et budget de poids verts, jusqu'au vert de next16-qa --groupe=dependances |
| 026-051 | feature | file | codex | — | Étendre le Web Push aux fondateurs : lib/pilotage/notifications.ts (charge neutre par motif, liste fermée, lien qui ne porte qu'un identifiant), envoyerPushFondateurs dans lib/push.ts (tous les appareils des fondateurs, par le même envoi que les artisans), et un appel dans envoyer() de lib/alertes.ts pour chaque alerte d'entreprise urgente ou de digest, après son verrou quotidien |
| 026-072 | feature | file | codex | — | Créer lib/agents/acquisition/vigieMeta.ts : executerVigie n'interroge que graph.facebook.com/v26.0/ads_archive (France, pubs actives, par métier pour la cible artisan, par terme de TERMES_MARQUES pour la cible marque du Studio pubs) dans un budget d'appels injecté, retient les pages qui ont au moins 3 pubs actives dont une lancée il y a plus de 30 jours (et, pour une marque, un domaine dans ses légendes), écrit annonceurs et candidats, reçoit le jeton par ses dépendances sans jamais le garder, et rend l'état en_attente_jeton sans erreur quand il n'y a pas de jeton |
| 026-109 | feature | file | codex | — | Donner à l'orchestre des baux qui expirent (2 × maxMinutes sans battement), les commandes battement, expirer et promouvoir, un disjoncteur par tâche (3 tentatives échouées ou 2 échecs identiques → DISJONCTÉE), la quarantaine des décisions écrites par un exécutant et un bloc « Attention » en tête du digest, dans la source puis par maj, jusqu'au vert du groupe baux de preuve-026 |
| 026-110 | test | refuse | claude-code | FAIL | PASS pack-pub-dossier-qa --partie=api — référence : code 1, FAIL PD-1 — lib/packPubDossier.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find modul |
| 026-058 | feature | fait | claude-code | PASS | 2026-09-28T11:26:57Z · 5s · 0 l. |
| 026-069 | test | fait | claude-code | PASS | 2026-09-28T11:20:32Z · 33s · 0 l. |
| 026-039 | contenu | refuse | antigravity | FAIL | ❌ CP-6 npm run typecheck en code 2 : .next/types/routes.d.ts(132,1): error TS1434: Unexpected keyword or identifier. \| .next/types/routes.d.ts(132,11): error TS |
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

… 99 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
