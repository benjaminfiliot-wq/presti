# 026-202 — la fabrication des pubs sur l'usine : gestes de Benj (05/10/2026)

Livré : `docs/agents/usine-pubs.md` (état « écrit, pas en service ») et `docs/studio/prealables.md` (honnête : « droit commercial : non
attesté », car les conditions de sortie de Cloudflare Workers AI sont introuvables ; ARPP et activité de l'EI non attestées). Rien n'a été
installé sur l'usine (aucun « oui » de Benj aux outils ni au minuteur), rien écrit en production.

À faire, dans l'ordre :
1. Dire « oui » à l'installation de HyperFrames 0.8.33 (npm, sans script d'installation, dans /srv/presti-agents) et au modèle de voix
   Kokoro (téléchargé au premier `hyperframes tts`) : Claude Code donne la taille avant.
2. Dire « oui » au minuteur `presti-pubs` ; Claude Code pose le jeton `studio` (jamais affiché) et installe par `gardien`.
3. Confirmer d'un mot l'activité de l'EI que Claude Code lira dans l'extrait public du RNE ; Claude Code lira aussi la fiche ARPP et les
   conditions Cloudflare, puis complètera `docs/studio/prealables.md`.
4. Épreuve : `--etape=preparer`, éteindre le PC au moins 2 h, le rallumer, `--etape=conclure` (`usine-pubs-qa.mjs --reel`).
