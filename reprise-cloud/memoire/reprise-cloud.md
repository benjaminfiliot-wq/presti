---
name: reprise-cloud
description: "Dossier presti/reprise-cloud/ (26/09) pour qu'une session claude.ai/code reprenne si la limite du PC tombe ; maj.sh le rafraîchit ; ce que le cloud ne peut pas faire"
metadata:
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-25T22:17:20.886Z
---

Le 26/09/2026 vers 00 h, Benj était à 85 % de sa limite hebdomadaire. Il a demandé un « dossier cloud » en priorité, avec 250 € de crédit gardés en réserve.

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
