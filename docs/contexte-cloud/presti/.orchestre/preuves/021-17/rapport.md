# 021-17 — rapport de l'exécutant (Claude Code, reprise après la coupure de 17 h 55)

**Reprise.** Rien dans le périmètre : `telephone.css` n'existait pas. `juge/` ne contenait qu'un passage du juge à 17 h 32, lancé
sans la famille (dérive encore là, TL-3 de référence 4,66). Travail repris de zéro, en suivant la fiche.

**Un seul fichier** : `public/sites-demo/_kit/familles/telephone.css`. Les valeurs de la fiche sont reprises telles quelles pour le
héros (1,31 ; 50 % 61 % ; 15,86 % ; projecteur recopié octet pour octet depuis kit.css, vérifié par recherche de la chaîne), la
citation et les verbes.

**Un écart, pour la qualité et non pour un critère : les plages de l'éclaté.**

| Élément | Fiche | Retenu |
|---|---|---|
| calques, apparition | cover 10 % → 12 % | cover 10 % → 11 % |
| `img.eclate__assemble`, effacement | cover 10 % → 12 % | cover 11 % → 12 % |
| calques, départ sur leur vecteur | cover 10 % → 45 % | cover 12 % → 45 % |
| pastilles | cover 45 % → 49 % | inchangé |

Pourquoi : avec le fondu croisé simultané de la fiche, à mi-fondu, l'image assemblée à 0,5 recouvre des calques à 0,5, et l'objet
n'est couvert qu'à 75 %. Pendant une dizaine de pixels de défilement, il pâlit sur le fond noir. Les calques bougent aussi déjà
pendant ce fondu : double image de 4 px au plus. Avec les plages retenues, les calques deviennent opaques sous l'image assemblée
encore pleine. Elle s'efface ensuite sur des calques identiques et immobiles, et le départ commence seulement là. TL-7 n'y perd
rien : à cover 10 %, les calques sont rendus et immobiles ; à cover 50 %, ils sont pleins et sur leur vecteur.

**Mesures de ma sonde** (`.orchestre/travail/021-17-outils/sonde.mjs`, copie `021-17-1`, 390×844) :
- **Héros** : seules `signature-tourne-4` (img) et `signature-projecteur::before` tournent. Débord horizontal : 0 px.
- **Citation** : de 0,55 à 1 dans l'ordre de lecture. Tout est à 0,55 à cover 0 et tout est plein à cover 70.
- **Verbes** : tous à 0,55 à cover 20 ; à cover 38, 1 / 0,93 / 0,74 / 0,55 ; tous pleins à cover 52.
- **Éclaté** :
  - boîte de 390 × 292,5 ;
  - calques à leur place à cover 10 % (limon centré à 192,9 px, soit (0,2579 + 0,4736 / 2) × 390) ;
  - à cover 50 %, place + vecteur (limon à 116,6 = 192,9 − 0,1957 × 390) ;
  - pastilles à 1 ;
  - requêtes : `assemble.avif` et les quatre calques, jamais `eclate.avif`.
- **Poids** :
  - `styles.css` en brotli 11 : +647 octets contre la génération sans famille (1 000 au plus), +324 contre `recit,eclate` ;
  - `index.html` et `site.js` identiques à la référence.

**Regard** (`regard/`, capturé et ouvert par moi) :
- **`heros-rotation-t0.jpg`, `heros-rotation-t5000.jpg`** : la cage pivote autour de l'œil, qui reste en place, et le projecteur
  éclaire l'anneau. Le titre reste lisible aux deux extrémités.
- **`eclate-ouverture-cover30.jpg`** : les pièces s'écartent, sans double image.
- **`eclate-ouvert-cover50.jpg`** : l'éclaté est ouvert, les cinq pastilles sont posées sur leurs pièces, avec la légende dessous.
- **`citation-cover40.jpg`** : les mots s'allument dans l'ordre de lecture.

**Verdict du juge** : voir `verifier.log` (sortie de `node scripts/telephone-qa.mjs`) et `juge/`.

## Correction après le verdict TL-7

Le passage hors bac à sable a validé tous les critères sauf la distance de la première requête de l'éclaté : **3 656 px sous le
bas de l'écran**, contre une limite de **3 056 px** issue du témoin natif (**2 956 px + 100 px**).

Cause : au premier défilement, `kit.js` ajoute `html.tout-rendu`; la règle de `kit.css` rend alors toutes les sections lointaines
immédiatement visibles et Chromium découvre les images `loading="lazy"` de l'éclaté dès ce premier pas du juge. La correction
reste dans `telephone.css` : `figure.eclate` conserve sa propre `content-visibility:auto`, avec
`contain-intrinsic-size:auto 292.5px` correspondant à sa boîte mobile 390 × 292,5 mesurée. Sa géométrie 4:3 et sa timeline ne
changent pas lorsqu'elle approche de l'écran, mais ses descendants ne sont plus découverts prématurément par `tout-rendu`.

Conformément au prompt Codex Windows, cette reprise ne relance pas le vérificateur : Claude Code mesure la nouvelle distance hors
bac à sable.
