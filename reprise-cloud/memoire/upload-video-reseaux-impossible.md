---
name: upload-video-reseaux-impossible
description: "Téléverser une vidéo sur Facebook ou LinkedIn en pilotant le navigateur ne marche pas — et comment j'ai cru le contraire"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-09T10:55:48.745Z
---

Mesuré le **2026-09-09** en pilotant le vrai Chrome de Benj. **On ne peut pas publier une vidéo sur
Facebook ni sur LinkedIn par automatisation.** Deux murs différents :

- **Facebook** : `file_upload` pose bien le fichier sur l'`input` (ils sont dans le light DOM,
  accessibles par référence) et le composeur affiche la vignette — mais **l'envoi reste bloqué à
  0 %**, plus d'une minute, sans erreur. L'uploader découpé ne démarre pas sur une sélection de
  fichier programmatique. Le dialogue « Créer un reel » est pire : il n'enregistre même pas le
  fichier. Les **images** passent, elles (photo de profil, couverture) — c'est propre à la vidéo.
- **LinkedIn** : le champ vit dans un **shadow DOM** (`#media-editor-file-selector__file-input`),
  inatteignable par référence ; cliquer sur « Vidéo » ouvre un sélecteur système impilotable.

**Ne pas promettre la vidéo. Dire tout de suite qu'elle se téléverse à la main.**

- **Instagram** (mesuré le 2026-09-09, en plus) : le `input[type=file]` du dialogue « Créer une
  publication » **existe et accepte le fichier** (il porte bien `presti-carre.mp4`, 2,2 Mo, vérifié en
  lisant `input.files`) — mais l'interface ne bouge pas d'un pixel, elle continue d'afficher « Faites
  glisser les photos et les vidéos ici ». Trois voies essayées, trois refus : le dépôt du fichier sur
  l'`input`, un `dispatchEvent` manuel de `input` + `change`, et un `DragEvent` de dépôt construit avec
  un `DataTransfer` sur la zone. React n'accepte que l'événement de confiance du vrai sélecteur.
  **Donc les trois réseaux refusent la publication de média par automatisation, pour trois raisons
  différentes.** Publier se fait au téléphone, point.

## La faute que j'ai commise, à ne pas refaire

J'ai **annoncé un Reel publié qui ne l'était pas**. Mon contrôle était
`/texte de la légende/.test(document.body.innerText)` — exécuté **pendant que le composeur était
encore ouvert**. Il a trouvé la légende dans le DOM du brouillon et je l'ai lue comme une preuve de
publication. Benj a regardé sa Page et m'a contredit ; il avait raison.

**La règle : après une action publique, vérifier là où le public regarde, pas dans le DOM courant.**
Pour Facebook : l'onglet dédié (« Vous n'avez pas encore créé de reel » est sans ambiguïté), ou la
Page ouverte dans le navigateur intégré de l'app, qui n'a aucune session — voir
[[facebook-page-pieges]]. Un test de chaîne dans la page qu'on vient de manipuler ne prouve rien.

C'est la même faute que celle que le journal de Presti reproche depuis deux jours : vérifier la
plomberie au lieu de regarder le résultat. Voir [[livrable-colle-a-la-main]].
