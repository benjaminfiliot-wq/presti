# 026-202 — mise en service de la fabrication des pubs sur l'usine (05/10/2026, Claude Code Sonnet)

Autorisation de Benj (05/10, conversation) : « 5 : je t'autorise (HyperFrames + Kokoro) ; 6 : tu es autorisé, tu as toutes les clés, fais-le seul ; 3 (l'épreuve PC éteint) en dernier ». Compte `gardien` accordé (D-0410-15). Aucun jeton ni clé affiché ci-dessous.

## Étapes

| # | Étape | Fait | Preuve |
|---|---|---|---|
| 0 | Code déployé sur l'usine | fait | `maj --forcer` (surveillance en marche : `maj` simple refuse) via une copie de `usine-agents.mjs` pointée sur la clé gardien : arbre → `eadce6484be4` = origin/main. Constat : `scripts/pack-pub/fabriquer.mjs` n'avait **jamais été commité sur main** (rédigé en 026-156, seulement dans des instantanés) : l'usine n'avait pas le fabricant. Commité et poussé (eadce648). |
| 1 | HyperFrames 0.8.33 | fait | `npm install --ignore-scripts --save-exact hyperframes@0.8.33` dans `/srv/presti-agents/outils-pubs` (sous-dossier non suivi, survit à `maj`) ; 136 paquets, 366 Mo. Tailles annoncées avant (registre npm) : hyperframes 34,7 Mo décompressé, onnxruntime-node 218 Mo. `/usr/local/bin/hyperframes` (script root, 755) lance le CLI avec `HYPERFRAMES_PYTHON` du venv et sans télémétrie ; `/usr/local/lib/node_modules/hyperframes` → l'installation (c'est là que `fabriquer.mjs` la cherche, sinon il retomberait sur `npx` sans `--ignore-scripts`). `sudo -u agents hyperframes --version` → 0.8.33. |
| 2 | Voix Kokoro `ff_siwis` | fait | Tailles relevées par HEAD avant le téléchargement : `kokoro-v1.0.onnx` 325 532 387 o + `voices-v1.0.bin` 28 214 398 o (≈ 354 Mo, source github.com/thewh1teagle/kokoro-onnx, release model-files-v1.0). Il faut en plus un venv Python `/srv/presti-agents/outils-pubs/venv` (wheels seulement, `--only-binary`) : kokoro-onnx 0.6.1, soundfile 0.14.0, onnxruntime 1.30.0, numpy 2.5.3 (176 Mo). Essai sous `agents` : phrase fictive → `voix.wav` 147 500 o, 3,1 s ; cache `~/.cache/hyperframes` 339 Mo. |
| 3 | Dépendance non prévue : détecteur de visages | fait | `fabriquer.mjs` appelle `python scripts/visages.py` (OpenCV YuNet) : `python` n'existait pas. Ajout de `opencv-python-headless` 5.0.0.93 (wheel) dans le même venv + `/usr/local/bin/python` (script root → python du venv). `cv2.FaceDetectorYN` présent. |
| 4 | Chromium pour le rendu | fait | HyperFrames n'a pas de headless-shell arm64 géré : `/usr/local/bin/chromium` → le `chrome-headless-shell` de `/srv/playwright` (026-143). `hyperframes doctor` : Chrome « system: /usr/local/bin/chromium », FFmpeg 6.1.1, TTS Kokoro installé. |
| 5 | Fabrication réelle d'un pack témoin (jeu-1 de 026-pubs-contenu) sous `agents`, environnement du tourneur | fait | `fabriquer.mjs` : check 32 s, 3 films + 3 visuels en 636 s (total 10 min 37 s, usine chargée par d'autres travaux, charge 15 à 25) ; sorties video-1 6,18 Mo, video-2 7,64 Mo, video-3 7,20 Mo, 3 visuels, textes.md, fiche-10-min.md. Effacé ensuite. Marge : le tourneur laisse 40 min par pack. |
| 6 | Migration : identité `studio` | fait | L'agent `studio` n'existait pas en base (la graine de 026-175 n'était pas dans la 0113 appliquée) : `agents-jeton.mjs studio` rendait « agent inconnu ». `supabase/migrations/0125_agent_studio.sql` (un `ops_agent_enregistrer`, idempotent). Protocole : essai à sec par DO + raise exception sur la vraie base (ligne conforme, +1 événement, puis `ESSAI_A_SEC_OK`), contre-vérification (0 ligne `studio`, 0 événement après l'essai), `apply_migration`, contrôle (nom, libellé, tables `{evenements}`, période 60, sans jeton, hors pause). Le jeton posé à l'étape 7 est le test réel : le tourneur a ensuite battu en tant que `studio`. |
| 7 | Jeton interne de l'agent `studio` | fait | `node scripts/usine-coffre.mjs poser-jeton-agent studio` → « posé : PRESTI_JETON_STUDIO … jamais affiché » ; `usine-coffre noms` liste maintenant PRESTI_JETON_STUDIO. Posé le 05/10/2026. |
| 8 | Unités | fait | `presti-pubs.service` et `.timer` copiés par `gardien` dans `/etc/systemd/system/`, `systemd-analyze verify` sans erreur sur ces deux unités, `daemon-reload`. Empreintes sha256 identiques à l'arbre déployé : service `cd825472d6e1a488…`, timer `3b60616d21e6824…`. |
| 9 | Un passage du tourneur | fait | `systemctl start presti-pubs.service` : Result=success, code 0, journal « [pubs] aucun travail » (le jeton `studio` est accepté par `/api/usine/pubs/travail`). Base : `studio.battement_le = 2026-10-05 08:59:28 UTC` ; `livreur_usine.battement_le` reste nul (aucun battement venu des pubs). |
| 10 | Minuteur | fait | `systemctl enable --now presti-pubs.timer` ; `is-enabled` = enabled, `is-active` = active, prochain passage 09:00 UTC, toutes les 15 min. |

## Non fait

- **Épreuve PC éteint (point 5 de la fiche, `usine-pubs-qa --reel --etape=preparer` puis `conclure`)** : Benj l'a placée en dernier. `preparer` écrit des objets d'essai en production et exige l'extinction du poste ≥ 2 h : non lancé.
- **`docs/studio/prealables.md`** : inchangé, voir `reste-pour-benj.md`.
- Un `usine-pubs-qa --reel` vert n'est donc pas encore établi ; `verifier.log` n'est pas écrasé.

## Constats pour la suite
- `pub-locale-qa --partie=complet` lancé tel quel sur l'usine dépasse son plafond de 12 min par jeu (usine chargée) : à lancer depuis le PC, ou plafond à relever ; la fabrication elle-même passe (étape 5).
- Rendu en capture par copie d'écran (pas de beginFrame) : 10 à 11 min par pack sous charge, bien dans les 40 min du tourneur.
- Le 05/10 08:5x, un autre processus `pubs.mjs --une-passe` tournait sous le compte `usine` (juge d'une autre fiche) : ne pas le confondre avec le minuteur.
