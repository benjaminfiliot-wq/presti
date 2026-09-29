---
name: reprise-cloud
description: "Dossier presti/reprise-cloud/ (v1 26/09, v2 29/09) pour qu'une session claude.ai/code reprenne ; point d'entrée LISEZ-MOI-D-ABORD.md, limites et réglages dans LIMITES-DU-CLOUD.md ; maj.sh v2 caviarde et scanne"
metadata:
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-29T09:37:21.693Z
---

**v2 du 29/09/2026 (demande de Benj : « mêmes capacités, accès, connaissances et contrôle » dans le cloud).**
- **Point d'entrée : `reprise-cloud/LISEZ-MOI-D-ABORD.md`** (mission, état CALCULÉ par `outils/etat.mjs`, décisions de Benj, règles absolues, protocole des migrations, boucle de chantier). `LISEZ-MOI.md` n'est plus qu'un renvoi.
- **`LIMITES-DU-CLOUD.md`** : la liste honnête de ce que le cloud ne peut pas faire, avec réglage exact et risque, et l'ordre des réglages pour Benj. Ce qui n'a pas pu être vérifié y est marqué « à tester » (TCP 22 depuis la VM, téléchargements Playwright, outil Workflow dans le cloud, noms des outils de connecteurs, type de compte).
- **`outils/`** (écrits à la main, `maj.sh` n'y touche pas) : `etat.mjs` (compte les fiches 026 et sépare « faisables dans le cloud » de « à laisser au PC »), `commit-fiche-cloud.sh` (remplace `presti-ops/usine/commit-fiche.sh`, hors dépôt : branche de la session, jamais main, ni digest.md ni verdicts.jsonl ; testé sur un dépôt jetable), `recevoir.mjs` (PC : reporte le verdict d'une fiche du cloud), `chantier-continu.workflow.js` (la boucle de chantier du PC, adaptée), `md5-migration.mjs`, `nettoyer.mjs` (caviardage des e-mails/téléphones/SIREN de tiers + scan de secrets), `permissions-deny-cloud.json`.
- **`maj.sh` v2** : recopie sans logs ni PID ni états du moteur, exclut les projets arrêtés, `tiktok-*` et `saas-side-project` (il contenait un mot de passe provisoire), puis `nettoyer.mjs --caviarder` et `--scan` (code 1 s'il reste quelque chose). Commit : `git add -- reprise-cloud && git commit -q -m … -- reprise-cloud && git push -q origin main`.
- **Constats importants du 29/09 :**
  - le cloud ne pousse pas sur `main` (le proxy GitHub n'autorise que la branche courante) : branche `claude/…` + PR, fusion côté PC par `git fetch` + `git merge --no-ff` (`gh` n'est pas installé sur le PC) ;
  - les 35 règles `permissions.deny` de Benj sont dans `~/.claude/settings.json` : ABSENTES du cloud, tant qu'elles ne sont pas reportées dans `.claude/settings.json` du dépôt (les 11 règles Bash sont prêtes dans `outils/permissions-deny-cloud.json`) ;
  - les plugins du PC (ecc, linkedin-skills…) ne s'installent pas dans le cloud ; `.claude/skills` et `.claude/agents` du dépôt, si ;
  - les 16 connecteurs claude.ai (Supabase, Vercel, Gmail, Drive, ElevenLabs, Windsor…) sont utilisables dans le cloud quand on les active ; en routine, tous sont inclus par défaut, écritures comprises : ne garder que Supabase ;
  - variables d'environnement du cloud = lisibles par la session ; pas de coffre ; « identifiants d'API » (Pro/Max) = clé qui ne passe pas dans la VM ;
  - seule voie vers l'égalité TOTALE sans rien exposer : Remote Control (session sur le PC, pilotée depuis claude.ai/code ou le téléphone) ; environnement auto-hébergé sur l'usine = Team/Enterprise seulement.

**v1 du 26/09 (reste vrai).** Le 26/09/2026 vers 00 h, Benj était à 85 % de sa limite hebdomadaire. Il a demandé un « dossier cloud » en priorité, avec 250 € de crédit gardés en réserve.

**Ce qui a été fait :** `presti/reprise-cloud/`, commit c2dda2e, sur main, déployé.
- `LISEZ-MOI.md` : point d'entrée, règles, tableau d'avancement, file d'attente.
- `memoire/` : la mémoire Presti, sans les fiches personnelles ni celles des projets arrêtés.
- `docs/` : les docs Ecosysteme-*.
- `usine/`.
- `veille/`.
- Les brouillons de la 026 sont commités avec.
- Le dépôt est privé (l'API anonyme répond 404).

**Why :** si la session du PC est à court, une session cloud reprend sans rien réexpliquer.

**How to apply :**
- **Avant de pousser un nouvel état :** `bash reprise-cloud/maj.sh` depuis presti/. Le scan des motifs de clés ne remonte que des faux positifs : des préfixes cités et des clés factices de 026-041. Toute vraie clé bloque le commit.
- **Ce que le cloud ne peut pas faire :** joindre l'usine, lire presti-secrets, piloter le navigateur du PC, voir les données de prospects. Il ne prend donc que les fiches claude-code sans secret.
- **Coût à redire à Benj :** une session cloud consomme la MÊME limite, puis le crédit d'usage supplémentaire. Elle ne donne pas de quota en plus.
- **Priorité budgétaire exprimée par Benj :** tout ce qui peut tourner sur Codex (usine), freellmapi, Laya/Jev ou Whisper local y va. Claude écrit les juges et contrôle.
- **Piège yt-dlp sur le PC (26/09) :**
  - Un 429 sur les sous-titres `en` fait échouer toute la vidéo.
  - Il faut `--js-runtimes node`, télécharger la vidéo d'abord, puis les sous-titres `fr` seuls avec `--ignore-errors --sleep-subtitles 8`.

Voir [[ecosysteme-presti]], [[usine-oracle]].
- **Fable 5.1 ne donne PAS de réserve à part (mesuré le 26/09).** Un agent Fable de 531 k jetons (fiche 026-023) a fait passer « Weekly · all models » de 95 à 97 % ET « Weekly · Fable » de 0 à 6 %. Le compteur Fable est une sous-limite, pas un quota en plus. Ne pas y basculer pour « économiser » la limite.
