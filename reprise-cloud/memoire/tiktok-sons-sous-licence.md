---
name: tiktok-sons-sous-licence
description: "La musique des clips vient de TikTok Studio > Sons libres de droits (770 000 sons, licence commerciale, téléchargeables par API) — kit, outils et pièges du 22/09"
metadata:
  type: reference
---

22/09/2026 soir. Le formulaire web de TikTok Studio ne permet PAS d'ajouter un son à la publication (pas
d'éditeur). Mais Studio a une page **Sons libres de droits** (`/tiktokstudio/sound-library`) : « sans restriction
d'utilisation et sans risque de mise en sourdine », avec un bouton de téléchargement. C'est la source de musique
et de bruitages des clips (règle permanente : jamais un son protégé, cf. [[clipforge-regles-permanentes]]).

- API (dans la page connectée, TikTok signe) : POST `/tiktok/v1/creator/music/unlimited/search/list/?aid=1988`
  `{page_num, page_size, keyword, music_type: 1 chanson | 2 effet}` ; chaque son a `play_url`,
  `is_commerce_music`, `commercial_right_type` 2 et la piste des beats (`extra.beats.beats_tracker`).
  Les chansons portent `is_unlimited_music: true` ; les effets ne le renseignent pas (même licence).
- Outils : `scripts/musique/sons_tiktok.py` (chercher/telecharger), kit `data/musique/kit.json`,
  `scripts/musique/poser_musique.py`, `scripts/sfx/passe_sfx.py` (adapté du skill suggest-sfx), juge
  `scripts/juges/qualite_clip.py` ; skill généré `clipforge-son`.
- Pièges : un effet d'une demi-seconde pèse < 20 Ko (seuil de taille par type) ; `adelay` indexé sur les entrées
  ffmpeg — la liste contient « -i » + chemin, donc indice = len//2+1.
- La musique/les bruitages du dépôt claude-faceless-shorts-creator sont générés par ElevenLabs sous le compte de
  leur auteur : secours seulement. Le clip beurre publié le 22/09 porte encore une de ces musiques (tech-pulse).
