---
name: tiktok-studio-affichage-menteur
description: "Dans TikTok Studio, la colonne confidentialité affiche une valeur périmée — seule une relecture après rechargement dit la vérité"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-21T15:49:59.694Z
---

Changer la confidentialité d'une publication se fait dans **TikTok Studio → Publications**
(`tiktok.com/tiktokstudio/content?tab=post`), colonne « Politique de confidentialité » : « Tout le monde » →
« Moi uniquement ». C'est le seul endroit du web ; ni la grille du profil ni la page d'une vidéo ne
proposent ce réglage.

**Le piège, vu le 21/09/2026 :** l'écran ment dans les deux sens. Un bandeau vert « Les paramètres ont été
mis à jour » s'affiche puis la ligne **retombe sur « Tout le monde »** alors que le changement a bien pris ;
et à l'inverse une ligne peut afficher « Moi uniquement » alors que rien n'est parti. Quatre allers-retours
perdus à corriger des lignes déjà bonnes.

**Why:** l'affichage est optimiste et la liste ne se resynchronise pas ; le bandeau de succès ne prouve rien.

**How to apply:** ne jamais lire l'état dans la page qui vient de le modifier. Recharger l'URL, relire, et
pour la preuve finale interroger l'extérieur sans cookies :
`curl https://www.tiktok.com/@<compte>/video/<id>` doit répondre `item_privacy_authorization&status_self_see`.
Traiter une ligne à la fois : une boucle JS avec des `await sleep` dépasse les 45 s du pont CDP et meurt au
milieu. Même famille que [[preuve-vide-est-un-mensonge]] et [[juge-capture-lui-meme]].
