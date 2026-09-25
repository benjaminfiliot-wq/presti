---
name: demo-photos-licence
description: "Les photos du compte de démonstration Presti sont en CC BY-SA : elles vont sur le site, jamais dans une vidéo de publicité"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-10T09:53:22.488Z
---

Le portfolio du compte de démonstration `atelier-du-chene` utilise **trois photos de Wikimedia
Commons en CC BY-SA 4.0** — escalier hélicoïdal ×2 (Petar Milošević) et cuisine bois
(JessofWoodnCo). La liste fait foi : `public/demo/portfolio/attributions.json`.

**Sur le site, c'est réglé** : l'attribution y est affichée, c'est la « ligne de fait » de chaque
slide, et `scripts/demo-captures.mjs` le dit en toutes lettres.

⛔ **Dans une vidéo de publicité, elles ne peuvent pas entrer.** Deux raisons, et la seconde est la
vraie :

1. l'attribution devrait être incrustée dans le film ;
2. surtout, **BY-SA impose le partage à l'identique** — un film qui incorpore l'image devrait
   lui-même être publié sous CC BY-SA. Pour une publicité, c'est disqualifiant.

Découvert le **2026-09-10** alors que la vidéo de la publication n° 8 était **déjà rendue avec**.
Et défiler plus bas ne sauve rien : la galerie porte les mêmes photos.

**La conséquence pratique** : le site de démonstration n'est pas filmable. Une vidéo qui parle du
site vitrine montre autre chose — le lien de contact dans la console, par exemple — et la promesse
reste dans le **texte**, où elle est sourcée. Voir [[hyperframes-en-local]].

Et la règle générale : la vérification « aucune donnée réelle d'artisan ni de prospect dans les
captures » doit se doubler d'une vérification de **licence**. Une publicité qui emprunte le travail
de quelqu'un sans le dire est du même genre qu'une publicité qui promet une fonction inexistante.

**Exception décidée par Benj le 14/09/2026 (vers 23 h)** : la photo du héros de la démo Lestraque (escalier, CC BY-SA 4.0, Petar Milošević, étalonnée) PEUT apparaître dans la vidéo de la landing, avec son crédit sous la vidéo (« la photo est bien »). Pour les autres photos CC BY-SA et les autres films, la règle prudente reste.
