# La fabrication des pubs sur l'usine (026-202)

État au 05/10/2026 : **écrite, pas encore en service**. Le minuteur `presti-pubs` n'est pas installé sur l'usine ; les outils de rendu
(HyperFrames 0.8.33, modèle de voix Kokoro `ff_siwis`) n'y sont pas posés. Les gestes de Benj sont dans
`.orchestre/preuves/026-202/geste-de-benj.md`.

## Ce qui tournera
- `presti-pubs.timer` (toutes les 15 min) lance `presti-pubs.service` sous le compte `agents`, par `avec-coffre.mjs PRESTI_JETON_STUDIO` :
  un seul jeton, celui de l'agent `studio`. Le tourneur est `scripts/usine/pubs.mjs --une-passe`, un travail par passage.
- Un pack pubs payé est fabriqué dans les 2 h ; un échantillon du Studio accordé aussi (la garde `scripts/studio/garde.mjs` passe d'abord :
  voir `docs/studio/prealables.md`).
- Aucun outil payant. Un outil absent (hyperframes, ffmpeg) rend `outil_absent`, jamais un faux vert.

## Ce que Benj voit
Les cinq premiers packs à livrer, et le premier échantillon à regarder (décision `regarder_premier_echantillon`). Jamais d'envoi automatique
d'un échantillon.

## Reprise par le poste
Si l'usine est injoignable plus de 24 h : `scripts/pack-pub/exporter.mjs`, `fabriquer.mjs`, `deposer.mjs` et
`scripts/studio/deposer-echantillon.mjs`, lancés par Claude Code avec l'accord de Benj.

## Installer, arrêter (toujours par `gardien`)
```
ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte>
# installer : copier presti-pubs.service et presti-pubs.timer de /srv/presti-agents/scripts/usine/systemd/ dans /etc/systemd/system/,
#   systemd-analyze verify, systemctl daemon-reload, systemctl enable --now presti-pubs.timer
# arrêter   : sudo systemctl stop presti-pubs.timer   (sur l'ordre de Benj)
```
Aucune installation sous le compte `usine`. Aucune valeur de jeton dans ce fichier.
