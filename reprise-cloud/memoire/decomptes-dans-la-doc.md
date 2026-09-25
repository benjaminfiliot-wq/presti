---
name: decomptes-dans-la-doc
description: Ne pas écrire de décompte exact de fichiers dans une doc — il est faux dès la session suivante ; écrire la commande qui le donne
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-08T21:06:48.446Z
---

Ne jamais figer un **décompte exact** dans un document de référence : « 26 documents dans `plans/` »,
« 33 `page.tsx` », « 14 fichiers `_NU` », « 4 suites en dépendent ». Écrire à la place la commande
qui le donne, ou une formule sans nombre.

**Pourquoi.** Mesuré le 2026-09-08 : la passe qui a écrit `presti/CLAUDE.md` et `presti/README.md`
a été relue quelques heures plus tard, et **trois de ses décomptes étaient déjà faux** — périmés par
la session elle-même, qui venait d'ajouter `plans/011-video-et-premiere-publication.md`,
`scripts/promo-video.mjs` et `scripts/promo-couverture.mjs`. Un vérificateur les a classés
« moyen » : un chiffre faux dans un document de référence coûte plus cher que pas de chiffre du
tout, parce qu'il se recopie et qu'on le croit.

Le même défaut existe en version sournoise : un décompte **repris d'un journal** (« quatre suites
s'appuient dessus ») était vrai le jour où le journal a été écrit, faux le lendemain. Un chiffre
daté doit porter sa date, ou disparaître.

**Comment l'appliquer.**
- Décompte de fichiers → donner la commande : « `find app -name page.tsx` pour le compte du jour ».
- Règle qui dépend d'un décompte → la réécrire pour qu'elle n'en dépende pas. Exemple réel : au lieu
  de « le `_NU` est le seul à porter la bannière » (faux pour 0072 et 0073), écrire « ouvre le
  fichier, et si la première ligne n'est pas la bannière, colle le jumeau `_NU` s'il existe ».
- Un chiffre qui doit rester (résultat de suite, montant) porte **sa source et sa date**.

Voir [[livrable-colle-a-la-main]] et [[deux-chiffres-un-ecran]] : même famille — un chiffre écrit à
deux endroits, ou écrit sans sa source, finit par mentir.
