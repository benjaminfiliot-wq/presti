Tu travailles sur l'usine de Presti, dans ~/veille (bibliothèque de veille, voir INDEX.md). Réponds et écris en français.

MISSION : analyser « de manière extrêmement rigoureuse » 14 vidéos YouTube sur le dropshipping / l'e-commerce avec l'IA, pour construire la future branche e-commerce de Presti. Chaque vidéo est dans ~/veille/youtube/<id>/ : video.mp4 (360p), sous-titres .vtt éventuels, video.info.json.

JUGE : `node juges/juge-yt.mjs` (déjà écrit, NE PAS le modifier). Tu boucles jusqu'à ce qu'il rende PASS. Lis-le d'abord : il fixe les fichiers et les sections attendus.

MÉTHODE PAR VIDÉO
1. Transcription horodatée → youtube/<id>/transcription.txt, lignes « [mm:ss] texte ». Ordre de préférence :
   a) les sous-titres .vtt (fr, sinon en), nettoyés : sans doublons, sans balises ;
   b) sinon Whisper par Cloudflare via freellmapi ;
   c) sinon faster-whisper local (~/veille/2026-09-25/venv, modèle base ou small, par morceaux).
2. Images → youtube/<id>/images/, 640 px de large :
   - une image toutes les 20 s ;
   - plus les changements de plan (ffmpeg, select='gt(scene,0.3)'), plafonnés à 80.
3. Inventaire A. Un modèle texte de freellmapi lit la transcription complète, par morceaux s'il le faut. Pour les images qui montrent un écran (Shopify, outils, chiffres, prix), un modèle vision de freellmapi lit le texte à l'écran.
4. Inventaire B, INDÉPENDANT : Jev avec Laya (~/laya/openpave-jev ; lis README.md et SKILL.md pour l'appeler, par exemple `jev --provider laya`). Si Jev est bloqué, un AUTRE fournisseur de freellmapi que celui de A. Note-le dans l'inventaire.
5. Contrôle. Un troisième modèle compare A et B à la transcription et relève :
   - les oublis ;
   - les déformations ;
   - les chiffres non sourcés.
6. Écris inventaires/yt-<id>.md avec les sections exactes suivantes :
   - « ## Méthode » : les étapes exactes, dans l'ordre, horodatées ;
   - « ## Outils » : nom, usage, prix, gratuit ou non ;
   - « ## Chiffres » : chiffre, horodatage, et la mention « affirmation non vérifiée » ;
   - « ## Affirmations douteuses » ;
   - « ## Transposable à Presti », en gratuit d'abord ;
   - « ## Contrôle » : ce que le contrôleur a corrigé, avec les mentions « inventaire A » et « inventaire B ».

ENSUITE
- dropshipping/strategie-brouillon.md, avec les sections :
  - « ## Contradictions » entre vidéos ;
  - « ## Outils gratuits » ;
  - « ## Plan pour Presti ».
  Chaque affirmation cite l'id YouTube de sa source.
- Mets à jour INDEX.md et index.json : domaine dropshipping, les 14 vidéos, avec l'état et les chemins de chaque fichier.

IA GRATUITES (freellmapi)
- Adresse compatible OpenAI : http://127.0.0.1:3001/v1. Liste des modèles : GET /v1/models.
- La clé est dans ~/.config/presti/freellmapi.key : lis-la dans une variable, ne l'affiche JAMAIS, ne l'écris dans aucun fichier.
- max_tokens ≥ 1500, car les modèles qui raisonnent consomment des jetons.
- Sur une erreur 429 ou 5xx : attente croissante, puis bascule sur un autre modèle.
- Répartis la charge entre fournisseurs : google, mistral, cerebras, cloudflare.
- Écris un script réutilisable, outils/analyse-video.mjs (ou .py), relançable vidéo par vidéo : il saute ce qui est déjà fait.

INTERDITS
- Rien en dehors de ~/veille.
- Aucune donnée personnelle.
- Ne pas modifier le juge.
- Ne pas supprimer les vidéos.
- Ne rien installer avec sudo.
- Ne rien publier.
