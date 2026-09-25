---
name: drive-televerser-sans-champ-fichier
description: "Déposer un fichier sur Google Drive depuis le navigateur en interceptant input.click(), quand il n'y a aucun champ fichier dans le DOM"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-21T15:50:13.186Z
---

Google Drive n'a **aucun** `input[type=file]` dans sa page : il en crée un à la volée et appelle
`click()` dessus, ce qui ouvre la boîte de dialogue Windows — invisible et inatteignable.
Le connecteur Drive ne sauve pas : `create_file` veut le contenu en base64, donc un mp4 de 9 Mo
ferait 12 M de caractères dans l'appel. Et `file_upload` de Chrome plafonne à 10 Mo.

La manœuvre qui marche (faite le 21/09/2026 pour livrer le clip d'essai Propaganda) :

1. avant tout clic, poser un piège dans la page —
   remplacer `HTMLInputElement.prototype.click` par une fonction qui, pour `type==='file'`, range
   l'élément dans `window.__capt`, lui met un `aria-label` reconnaissable, le rend visible
   (`position:fixed; opacity:1; width:320px`) et l'attache au `body` — puis `return` sans appeler
   l'originale, donc la boîte de dialogue ne s'ouvre jamais ;
2. cliquer **Nouveau → Importer un fichier** : l'input est capturé au lieu d'ouvrir le sélecteur ;
3. `find` sur l'`aria-label` donne un `ref`, `file_upload` y dépose le fichier ;
4. remettre l'input hors écran puis `dispatchEvent(new Event('change',{bubbles:true}))` : Drive prend
   le relais et téléverse pour de vrai (« 1 importation terminée »).

Ensuite : l'id du fichier se récupère proprement avec le connecteur Drive (`search_files`,
`title contains '...'`), et le partage « Tous les utilisateurs qui ont le lien / Lecteur » se règle
dans la fenêtre Partager (le connecteur, lui, ne sait partager qu'avec une adresse mail nommée).

**Preuve que le lien est public** : `curl` sans cookies sur l'URL de partage doit rendre 200 **et**
contenir le nom du fichier. Un bouton « Connexion » dans l'en-tête de la page est normal et ne veut pas
dire que le lien est fermé. Voir [[preuve-vide-est-un-mensonge]].
