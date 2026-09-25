---
name: tiktok-depot-automatique
description: "Le dépôt d'une vidéo sur TikTok Studio MARCHE en automatique (prouvé le 22/09) — à condition que l'onglet soit visible ; la cause d'une roue qui tourne sans fin, et les fausses pistes à ne pas refaire"
metadata:
  node_type: memory
  type: reference
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-22T18:52:54.509Z
---

22/09/2026 : chaîne complète prouvée sur @vibecode.clips, jusqu'au bouton « Publier » (non cliqué) :
dépôt du fichier → analyse → champ Description → légende + hashtags écrits exactement.

**La seule vraie cause d'échec : l'onglet invisible.** Après le dépôt, le bouton rouge passe en roue de
chargement et n'en sort jamais, sans erreur console ni requête réseau. `document.visibilityState` valait
`"hidden"` : l'onglet de l'extension n'était pas l'onglet actif de la fenêtre, et Chrome gèle le décodage
vidéo des onglets cachés. Une fois l'onglet mis devant (`scripts/depot/onglet_devant.ps1 -Motif "TikTok
Studio"` : fenêtre au premier plan + Ctrl+Tab jusqu'au bon titre), le même dépôt aboutit en 10 s.

Recette qui marche, avec l'extension Claude in Chrome :
1. `onglet_devant.ps1` sur l'onglet TikTok Studio (`/tiktokstudio/upload`) ;
2. `find` du `input[type=file][accept=video/*]` puis `file_upload` dessus — **fichier ≤ 10 Mo**
   (plafond de l'outil) : `scripts/depot/preparer_depot.py` réencode en deux passes à ≤ 9,5 Mo ;
3. clic dans `[contenteditable=true]`, Ctrl+A, Suppr, `type` du texte ; chaque hashtag suivi d'une
   pause et d'Échap (sinon la liste de suggestions avale la suite) ;
4. le bouton « Publier » — **publication = geste public : accord explicite de Benj**.

Fausses pistes, toutes testées et vaines : injecter le fichier par `DataTransfer`, appeler directement
le `onChange` React, simuler un glisser-déposer, remplir la fenêtre Windows « Ouvrir » par UI Automation
(l'extension intercepte le sélecteur : aucune fenêtre ne s'ouvre). Le `input.files` relu après un
`file_upload` vaut 0 : normal, TikTok vide le champ après l'avoir lu — ce n'est pas un échec.

**22/09 soir — publication robot prouvée** : @y_clips20 publié par `publier_tiktok.py --publier` (profil
Playwright `data/navigateur-tiktok/y_clips20/`). Connexion SANS mot de passe : `--connexion` affiche le **QR
code** TikTok, Benj le scanne avec l'app (le compte actif sur son téléphone est celui qui se connecte — son 1er
scan a connecté y_clips20, le 2e **@madden.cuts**, pas @maddenclips). Au 1er dépôt d'un profil : bandeau cookies
(on décline), « Activer les vérifications automatiques du contenu ? » (on répond Annuler : c'est un réglage du
compte), visite guidée react-joyride qui intercepte les clics — `fermer_fenetres()` gère les trois.
La colonne « Moi uniquement » de Studio pendant l'examen était fausse : vérifier par fetch sans cookies.

Pour se passer de moi : `scripts/depot/publier_tiktok.py` (Playwright sur le vrai Chrome, un profil par
compte dans `data/navigateur-tiktok/<compte>/`, sans plafond de taille). Il faut **une connexion à la
main par compte** (`--connexion`) ; Chrome 136+ interdit le pilotage du profil par défaut.

Voir [[upload-video-reseaux-impossible]] (Facebook/LinkedIn, toujours vrai là-bas), [[clipforge-regles-permanentes]].
