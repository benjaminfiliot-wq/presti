# Cahier des charges — vague 5 de la démo « Atelier Lestraque » (021-00)

**15/09/2026, relu par deux contre-experts.**

Historique :
- rédigé entre 13 h 30 et 14 h 30 (heure de Paris) par Claude Code ;
- corrigé entre 14 h 40 et 15 h 20 après deux contre-expertises, l'une sur la faisabilité, l'autre sur l'exigence de Benj (« le plus attirant », au niveau MotionSites).

Chaque constat bloquant ou important est soit corrigé dans le corps du cahier, soit écarté avec sa raison, soit transformé en question pour Benj. Le §10 donne ce que devient chaque constat, avec la section « Constats écartés ».

**Destinataires** :
- Codex et Antigravity (exécutants), qui n'ont vu ni la conversation ni les rapports ;
- Claude Code, pour les juges et le regard.

**Rapports sources** (tous dans `presti/.orchestre/preuves/021-00/`) :
- `existant.md` — la page aujourd'hui, les garde-fous, la CSP, les poids, les juges ;
- `ref-recit.md` — récit au défilement et défilement fluide (mesures dans `recit/`) ;
- `ref-video.md` et `ref-video-mesures.json` — vidéo de héros ;
- `ref-survol-objet.md` — révélation au survol et objet décomposé (prototypes dans `survol-objet/`) ;
- `motionsites-recherche.md` — première recherche MotionSites.

**Contre-expertises** (scripts, relevés et captures dans le scratchpad de la session,
`C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/`) :
- **Faisabilité** : `mesure.mjs` et `mesure.json`, `derive.mjs`, `verbes-mots.mjs`, `verbes-capture.mjs`, `verbes-*.jpg` ;
  mesures sur la page en ligne, 15/09 vers 14 h 25.
- **Exigence** : `ce5/mesure.mjs`, `ce5/mesure.json`, `ce5/ecart.mjs`, `ce5/*.jpg` ; mesures sur la page en ligne, 15/09 vers 14 h 14.
- **Mesures ajoutées pour cette correction** (dossier `021-00/` du scratchpad) :
  - `etapes-mise-en-page.mjs` et `.json` : mise en page des étapes épinglées, 1440×900, 1280×800 et 1088×800, 15/09 à 14 h 46 ;
  - `presta-couleurs.mjs` : couleurs et boîte de `#prestations`.

Le cahier du moment signature reste la loi pour le héros : `presti/.orchestre/preuves/020-01/cahier/cahier-des-charges.md`
(cité « cahier 020 »). Ce cahier-ci ne le répète pas, il l'intègre.

---

## 0. À lire d'abord

### 0.1 Conventions

- **`presti/`** = `C:/Users/benja/Documents/presti/`. **HEAD = `e33aec0`**. Lignes citées : disque au 15/09 vers 14 h 45.
  - `generer.mjs` est en cours de modification par 021-01 (871 lignes au relevé, `wc -l`).
  - `kit.css` fait 1 195 lignes et `kit.js` 295 (`wc -l`).
  - Si une ligne a bougé, la retrouver par la chaîne citée.
- **Chemins** :
  - **Kit** = `presti/public/sites-demo/_kit/` ;
  - **Générateur** = `presti/public/sites-demo/generer.mjs` ;
  - **Site** = `presti/public/sites-demo/lestraque/`.
- **Bureau chorégraphié** = `(min-width:1024px) and (prefers-reduced-motion:no-preference)` et
  `@supports (animation-timeline: view())` (kit.css:1075-1076). **Souris** = `(hover:hover) and (pointer:fine)`.
  **Téléphone portrait** = `(max-width:767px) and (min-height:560px)` : les conditions de la photo portrait et de son
  cadrage (generer.mjs:252 `MEDIA_MOBILE` ; kit.css:935-942).
- **Écart** et **part > 8** :
  - réduction grise de 160 px de large, |a − b|/255 moyen, et part des pixels dont l'écart dépasse 8 niveaux (cahier 020 §3.1 ; video-qa.mjs:24, 83) ;
  - « identiques » = écart moyen < 0,006 (video-qa.mjs:27).
- **Contraste d'un texte opaque** : méthode du cahier 020 §8.0 (texte rendu transparent, p90 de la luminance du fond,
  1,05/(L + 0,05)).
- **Contraste d'un texte translucide** (opacité α < 1) : couleur effective, pixel par pixel, en sRGB linéarisé,
  `α × encre + (1 − α) × fond`. Rapport WCAG pixel par pixel `(L_clair + 0,05)/(L_sombre + 0,05)` entre la couleur effective et
  le fond. On prend le **p10** de ces rapports sur les **boîtes des mots** (`Range.getClientRects`), jamais sur la boîte du bloc.
  Pourquoi : sur la phrase entière de l'atelier, le résultat tombe à 1,93 à 2,09, parce que sa 3e ligne passe sur le chêne
  clair ; sur les boîtes des verbes, il est de 5,28 à 5,40 (contre-expertise, `verbes-mots.mjs`).
- **Node sous Windows** : `createRequire('C:/Users/benja/Documents/presti/package.json')` pour playwright et sharp.
- **« Choix du cahier »** marque un seuil qui n'a pas de source extérieure : il est écrit tel quel, avec sa raison, et
  Claude Code peut le revoir sur film. Tout autre chiffre porte sa source.

### 0.2 État du chantier au 15/09 vers 14 h 45 (vérifié)

| Fait | Source |
|---|---|
| **020-13 (RL filmé), 020-02 (RL dans le kit) et 020-15 (relief accordé à RL) sont versées.** 020-02 : PASS à 11:33:30Z. 020-15 : PASS à 11:56:34Z | `git log` : 4bb9c58 (13 h 35), 1bdcd05 (13 h 39), e33aec0 (14 h 03) ; `verdicts.jsonl` |
| RL = rotation R + lumière L1, projecteur décalé de −2,5 s | decisions.md:56-58 ; `020-01/RL/bloc.css:22` |
| 020-15 a déjà fait, dans `relief.js` et `relief-fil.js`, les parties 020-02 du cahier 020 : synchronisation de toutes les animations, taille, voile tourné, fin sûre, relief calme. **Il a laissé la texture 2880** | decisions.md:58 ; `fait/020-15.md:27` et :42 |
| Le générateur pose déjà `data-relief-calme` et `data-relief-lumiere-css` **sans valeur** ; relief.js les lit par `hasAttribute` ; `signature-relief-qa.mjs:43` les exige | contre-expertise (generer.mjs:608 au commit e33aec0 ; relief.js:89) |
| **`images/heros-escalier-2880.avif` existe** (745 293 octets). `fait/020-15.md:27` et decisions.md:62 disent le contraire : c'est à corriger (CC-0 bis) | `ls -la lestraque/images` |
| **En cours** : 021-01 (socle, Codex, agent codex-15, depuis 12:34:09Z) et 021-04 (rendu Blender, Antigravity, ag-29-flash, depuis 12:34:03Z) | `.orchestre/en-cours/021-01.lock`, `021-04.lock` |
| Les fiches **telles que lancées** (elles font foi pour ces deux tâches) : 021-01 pose les attributs calme et lumière sans valeur et **ne pose pas** la texture ; 021-04 rend un **tronçon de trois marches** en quatre calques, **≤ 60 000 octets** d'AVIF, avec le seuil de teinte OB-9 | `en-cours/021-01.md` ; `en-cours/021-04.md` ; decisions.md:62-63 |
| `.orchestre/file/` est vide. 021-07 (plan de 5 s du geste pour le téléphone) **n'est pas partie** : elle attend dans `travail/021-07-en-attente.md` | `ls .orchestre/file` ; decisions.md:64 |
| **CC-0 fait** : captures blanches écartées du site, extension de licence consignée, roulis ρ = 0 consigné, images et films de `021-*` hors git | decisions.md:59-61 ; `.gitignore:91-94` ; `git status --short public/sites-demo` (seul `generer.mjs` modifié) |
| **Juges déjà écrits** (non suivis par git) : `familles-socle-qa.mjs` (14 h 30), `eclate-rendu-qa.mjs` (14 h 32), `video-heros-clip-qa.mjs` (14 h 23), `lenis-film-qa.mjs` (14 h 36), `rushes-atelier-qa.mjs` (14 h 35). Juges versés : `signature-repos-qa.mjs`, `signature-relief-qa.mjs` | `ls -la scripts` |
| **Trois juges régénèrent le site en place** : `signature-repos-qa.mjs:40`, `signature-relief-qa.mjs:39`, `nav-retenue-qa.mjs:34`. Aucun n'a d'option `--dossier` | `grep -n generer.mjs` et `grep -n -- --dossier` |
| **Lighthouse de référence** : 94 · 97 · 97 · 97 · 97 (médiane 97), LCP de 2 480 à 2 487 ms. Série servie par `http://127.0.0.1:51777`, **sans compression**. En ligne, `styles.css` est servi en `Content-Encoding: br` | `017-vague-3/final/lighthouse/resume.json` ; `curl -sI` du 15/09 vers 14 h 45 |
| `styles.css` fait 76 594 octets bruts et 13 140 en brotli 11 (rapport 5,83). `site.js` fait 23 147 octets bruts et 7 432 en brotli. Le `<link rel="stylesheet" href="styles.css">` bloque le rendu | mesure `zlib` du 15/09 ; `lestraque/index.html:24` |
| **Connecteur MotionSites de claude.ai** : il **a répondu** dans la session de correction (3 `search_prompts`, 1 `get_related_prompts`, métadonnées seulement, aucun `get_prompt`). Le doublon local « motionsites » demande une autorisation : c'est lui qui a bloqué les contre-expertises | messages de la session ; decisions.md:55 |

### 0.3 Ce que ce cahier corrige dans les rapports (vérifié dans les fichiers)

1. **Le récit ne change pas l'ordre des sections.** `ref-recit.md` §2.1 proposait de passer `#etapes` avant
   `#realisations`. Les deux sont `section--noir` (existant.md §1.1), donc « noir » puis « noir » : le garde-fou
   `gardeFousScenes` refuse deux scènes voisines sur le même fond et arrête la génération (generer.mjs:158-163). L'ordre
   reste : héros, plateau, prestations, atelier, réalisations, communes, étapes, questions, contact.
2. **Pas de lien vers `#contact` dans les lignes de prestations.** `ref-survol-objet.md` §2 proposait un lien étiré par
   ligne. Le juge de la barre compte tout `a[href*="#contact"]` visible comme un appel (nav-retenue-qa.mjs:59) : six liens
   visibles avec « Devis » dans la barre = doublons, donc FAIL. Le chemin clavier passe par un bouton (§3.3).
3. **Pas de vidéo préchargée en `blob:`** (technique de Cast and Render, `travail/motionsites/cast-and-render.md`). La CSP
   de la démo n'a pas de `media-src` : les médias retombent sur `default-src 'self'` (next.config.mjs:30), qui n'autorise
   pas `blob:` (existant.md §2.2).
4. **Pas de lissage sur la descente.** `ref-recit.md` §3.2 proposait `v += (cible − v) × k` sur la valeur envoyée au
   worker. Le cahier 020 exige que le worker suive la page à ±0,01 (D-6) avec une latence p95 ≤ 34 ms (D-11) : un lissage
   de 0,115 par image les ferait échouer. Le lissage ne sert qu'au suivi du curseur (§3.3).
5. **Les tranches des étapes, recalculées** depuis kit.css:1118-1145 :
   - tranche = 90 %/4 = 22,5 % de la plage `contain` ; plage d'une étape = 1,3 tranche = 29,25 % ; étape pleine entre 23,08 % et 76,92 % de sa plage ;
   - étape pleine : 01 de 0 à 29,125 % ; 02 de 35,875 à 51,625 % ; 03 de 58,375 à 74,125 % ; 04 de 80,875 à 100 % ;
   - **à 75 %, on est dans le fondu 03 → 04** : le « à 25, 50 et 75 % une seule étape est pleine » du commentaire de kit.css:1136-1138 est faux pour 75 %.

   Ces pourcentages ne dépendent pas de la hauteur de `#etapes` : la vague 5 peut l'allonger (§3.4) sans rien changer à la
   liste. Les juges visent les **centres des paliers** : C1 = 14,56 %, C2 = 43,75 %, C3 = 66,25 %, C4 = 90,44 %. Les fondus
   sont centrés sur 32,5 %, 55 % et 77,5 % (10 + k × 22,5).
6. **Vocabulaire de l'objet décomposé**, sourcé :
   - le limon à la française est une poutre dans laquelle marches et contremarches sont encastrées
     (https://fr.wikipedia.org/wiki/Limon_(architecture), lu le 15/09) ;
   - un artisan entaille les marches de 17 mm dans le limon
     (https://www.leboisdeshuiles.fr/artisan-fabricant-escaliers-portes-meubles-menuisier-sur-mesure/entaillage-limons-par-artisan-menuisier-pour-fabrication-escalier-sur-mesure, lu le 15/09) ;
   - Festool indique que des marches encastrées se fixent tout de même avec des vis, et montre des marches en chêne de
     40 mm (https://www.festool.fr/savoir/exemples-d%E2%80%99applications/escalier-%C3%A0-la-fran%C3%A7aise-avec-contremarches, lu le 15/09).

   L'objet est un **tronçon de trois marches sur un limon à la française**, en quatre groupes : limon avec ses entailles,
   marches en chêne de 40 mm, contremarches, vis (decisions.md:63 ; fiche 021-04 en cours).

### 0.4 Ce qui change après les deux contre-expertises (résumé)

**Faisabilité.**
- **État recalé** : 020-02 et 020-15 sont faites ; 021-02 est réduite à la texture 2880 et à `dureeP95`.
- **Juges** : ils ne régénèrent plus le site pendant qu'une autre tâche y travaille (`--dossier`).
- **Critères impossibles réécrits** : T-2, T-8 et LN-4.
- **Budgets** :
  - Lighthouse est servi en brotli ;
  - le CSS de bureau passe dans une feuille qui ne bloque pas le téléphone ;
  - l'éclaté est à 60 000 octets.
- **Défauts de détail corrigés** : cadre des étapes, géométrie du survol, état d'attente des chiffres.
- **Productions déplacées** :
  - les films et captures sont produits par les juges ;
  - les copies de fichiers binaires sont faites par Antigravity ;
  - le crédit d'une vidéo passe par un crochet du générateur.

**Exigence.**
- **Vidéo de héros** : le MP4 du geste au téléphone est **retiré**. Au bureau, une **vraie vidéo d'atelier** devient le défaut (§4.2), et une ouverture filmée est proposée sur film (§4.3).
- **Objet décomposé** : il devient une **grande scène**. Il s'éclate pièce par pièce sur au moins 450 px et raconte le devis en quatre temps (§3.4).
- **Récit** : ce sont les étapes épinglées, avec un compteur « 01 / 04 » (§3.4).
- **Téléphone** : un profil léger, en CSS seul (§3.6, Q4).
- **Défilement glissé** : il est mesuré et recommandé sur film (§3.2, Q-B).
- **Surcharge** : le juge la voit aussi en défilement (T-10).

### 0.5 Préalables de Claude Code

- **CC-0 : fait** (§0.2).
- **CC-0 bis**, à faire tout de suite :
  1. corriger decisions.md:62 et `fait/020-15.md:27`, car la texture 2880 existe (745 293 octets) ;
  2. consigner dans decisions.md que le MP4 du geste au téléphone (021-07, 021-08) est retiré, et pourquoi (§4.1) ;
  3. consigner que les juges de la vague 5 ne régénèrent plus le site en place (§6.0).
- **CC-1** : écrire les juges du §6 et vérifier que chacun **échoue** sur l'état d'avant, pour la bonne raison (méthode du cahier 020 §11, point 8).

---

## 1. Intention

Un artisan ouvre la démo.

**Le héros.** Au repos, l'escalier du héros vit de lui-même : la cage tourne lentement et un projecteur balaie le bois (RL). Au
premier coup de molette, le regard plonge vers le puits. Le surtitre et le bouton s'effacent, « Fait pour rester » reste
seul, puis le plateau noir referme la cage.

**Le plateau.** Sur ce noir, la phrase de l'artisan s'allume mot à mot : « Du premier relevé à la dernière marche posée, je
ne passe la main à personne. » Une fois la phrase pleine, et seulement alors, les trois chiffres apparaissent et se gagnent sous les yeux.

**Les prestations.** La souris qui glisse sur la liste fait apparaître, grande et amortie, la photo de chaque ouvrage,
au-dessus de la ligne, sans jamais cacher le titre qu'on lit.

**L'atelier.** Les quatre verbes « trace, débite, assemble, ponce » s'allument. Puis de vraies mains travaillent le bois en
plein cadre (vidéo d'atelier, bureau).

**Les réalisations.** Les pièces livrées défilent en travelling.

**Les étapes.** Les quatre temps deviennent **un récit dans une grande scène**, et le compteur passe de « 01 » à « 04 » :
1. la demande (la fiche du formulaire) ;
2. le relevé au trait, coté ;
3. l'escalier en chêne qui **s'éclate pièce par pièce** en ses pièces nommées, comme les lignes d'un devis ;
4. l'escalier remonté, posé.

Une phrase ferme la scène et mène au formulaire, sans le presser.

**Au téléphone.** La page reste légère : la cage tourne en CSS, sans rien télécharger. La citation et les verbes s'allument
au défilement, et l'éclaté s'ouvre en entrant à l'écran.

**La règle partout.** Un seul mouvement principal par écran, jamais deux textes qui bougent ensemble.

---

## 2. Carte de la page cible

L'ordre des sections est inchangé (§0.3, point 1). « Gardée » = rien ne change ; « modifiée » = un effet s'ajoute à une scène existante ;
aucune scène nouvelle.

**Hauteur de page à 1440×900** :
- 10 729 px aujourd'hui (mesuré, `etapes-mise-en-page.json`) ;
- 10 999 px avec le palier de 30svh de la descente (+270 px, cahier 020 §2) ;
- **12 349 px** avec `#etapes` passé de 300svh à 450svh (+150svh = +1 350 px, §3.4).

| # | Scène (sélecteur) | Statut | Effet de la vague 5 | Mouvement principal de l'écran (C7) | Mouvements secondaires tolérés | Téléphone |
|---|---|---|---|---|---|---|
| 0 | Barre `header.nav` | gardée | — | — | relais « Devis » (240 ms) | inchangée |
| 1a | Héros au repos `.ouverture>.hero--plein` | fait (020-02, 020-15) ; 021-02 : texture 2880 | **Geste au repos RL** | la cage tourne et le projecteur balaie (un seul geste composé, cahier 020 §3.5) | suivi de la souris par le relief, avec WebGL seulement | **RL en CSS** à la place de la dérive (021-17, Q4) |
| 1a′ | Ouverture filmée (**prototype**, 021-15) | proposée sur film (Q-A2) | 3 à 5 s de « remontée du puits » qui finit sur la photo, puis RL | le plan filmé, puis RL | — | rien |
| 1b | Héros au défilement, y de 0 à 0,30 h | 020-03 | **Descente** | la plongée vers le puits | fondu du surtitre et du pied (même geste) ; roulis ρ = 0 (decisions.md:61) | rien |
| 2 | Plateau `.ouverture>.plateau` | modifiée (021-03) | **Récit** : citation allumée mot à mot, puis chiffres comptés au temps | la citation qui s'allume (liée au défilement) | chiffres **invisibles** jusqu'à la fin de la citation, puis comptés une fois ; `glisse-cadre` existant de la photo | citation en `view()` (021-17) ; valeurs finales |
| 3 | Prestations `#prestations` | modifiée (021-06) | **Révélation au survol** : liste qui prévisualise | l'aperçu au-dessus de la ligne (à l'interaction seulement) | titre h2 mot à mot existant, à l'entrée | rail existant, rien de neuf |
| 4 | Dans l'atelier `#atelier` | modifiée (021-03, 021-13) | **Récit** : les quatre verbes s'allument ; **vidéo d'atelier** (défaut, Q-A) | la vidéo, une fois les verbes pleins | verbes (avant la vidéo) ; `derive` de la photo tant que la vidéo ne joue pas | verbes en `view()` (021-17) ; photo |
| 5 | Réalisations `#realisations` | gardée | — | travelling épinglé existant | `relief-3d` existant | rail existant |
| 6 | Communes `#communes` | gardée | — | aucun | survol existant | — |
| 7 | Étapes `#etapes` | modifiée (021-05, 021-16) | **Récit en quatre temps et objet décomposé** dans une grande scène : fiche → relevé coté → éclaté nommé → posé ; compteur « 01 / 04 » ; 450svh | l'état de la scène qui change, entre deux paliers seulement | liste des étapes (même timeline, même geste) ; jauge existante ; compteur | éclaté fixe, cadre 4:3, pastilles et légende ; s'ouvre en `view()` (021-17) |
| 8 | Questions `#questions` | gardée | — | aucun | `glisse-cadre` existant | — |
| 9 | Contact `#contact` | gardée | **Aucun mouvement ajouté** dans le formulaire | aucun | h2 mot à mot existant | — |
| — | Toute la page | modifiée si Benj dit oui à Q-B | **Défilement glissé** au bureau à la souris (Lenis), après mesures et film (021-09, 021-19) | — | — | natif |

**Écarté pour cette vague, avec la raison :**
- **Zoom de la pièce 04 des réalisations vers le héros** (`ref-recit.md` §2.1) : ce serait un second geste sur l'écran du travelling (C7).
- **Second survol dans les réalisations** (`ref-survol-objet.md` §2, « ce que je ne propose pas »).
- **Gomme et pixellisation au curseur** (nike-hover, pixel-grid-hover) : il faudrait une seconde image alignée par photo, qui n'existe pas (`ref-survol-objet.md` §2).
- **Vidéo à la place de la photo du héros au bureau** : RL, la descente et le relief agissent sur la photo et sa carte de profondeur (da.json:8 ; `ref-video.md` §3.1). L'ouverture filmée (1a′) passe **avant** RL et finit sur la photo, sans la remplacer.
- **Trait qui se dessine** (`stroke-dashoffset`) pour le relevé : il se peint sur le fil principal (`ref-recit.md` §3.4). Le relevé entre par `clip-path` (§3.4 C).

---

## 3. Les effets, un par un

### 3.0 Le socle commun (021-01, en cours) et sa suite (021-20)

**Pourquoi.** Tout le mouvement vit aujourd'hui dans `_kit/kit.css` et `_kit/kit.js`. Pour que les familles tournent en parallèle,
chacune écrit dans ses propres fichiers, et le générateur les assemble.

**021-01, telle que lancée** (`en-cours/021-01.md`, qui fait foi) :
- **Familles** : `_kit/familles/<nom>.{css,js,mjs}`, chargées par `await import()` ; la liste active est `da.familles` (`[]` pour lestraque) ou `--familles=`.
- **Assemblage** :
  - le CSS des familles est ajouté à `styles.css` après kit.css ;
  - le JS des familles est ajouté à `site.js` après kit.js, séparé par `\n;\n`.
- **Six crochets** : `plateauCitation`, `plateauValeur`, `atelierPhrase`, `etapesMedia`, `herosMedia`, `garde` ; `ctx` = `{ metier, da, site, contenu, rel, photoDe, esc, page }`.
- **Attributions** :
  - les entrées `"type": "video"` et `"type": "rendu"` sont exclues des contrôles de photos et de la ligne de crédits photo ;
  - les `lestraque/<nom>/attributions.json` des familles actives sont fusionnés.
- **Relief** :
  - `data-relief-calme` et `data-relief-lumiere-css`, sans valeur, comme aujourd'hui ;
  - `data-relief-descente` avec ses refus ;
  - `data-relief-texture` quand `da.relief.texture` existe (fichier présent, ≥ 1 024 octets) ;
  - da.json reçoit `calme`, `lumiereCss` et `descente`, **pas** `texture`.
- **Ligne de commande** : `--sortie=<dossier>` (tout est vérifié avant la moindre écriture), `--familles=`, `--da=<fichier.json>`.

**021-20 — la suite du socle** (Codex, après le PASS de 021-01), deux ajouts dans `generer.mjs` seulement.

| Point | Ce qui change | Pourquoi |
|---|---|---|
| **Feuille de bureau** | Une famille peut avoir `<nom>.bureau.css`. Les feuilles de bureau des familles actives sont assemblées, dans l'ordre de la liste, en `lestraque/bureau.css`. Toutes les pages reçoivent `<link rel="stylesheet" href="bureau.css" media="(min-width: 1024px)">` juste après le lien de `styles.css`, et seulement si au moins une famille active en a une | Le CSS de `styles.css` bloque le rendu au téléphone, où la marge LCP est de 13 à 20 ms (resume.json). Une feuille dont le `media` ne correspond pas n'est pas bloquante, même si elle reste téléchargée : « the browser still downloads the CSS asset, albeit with a lower priority for non-blocking resources » (https://web.dev/articles/critical-rendering-path/render-blocking-css, lu le 15/09) |
| **Crochet `credits(entrees, ctx) → entrees`** | Appelé là où la ligne de crédits des mentions légales est construite (generer.mjs, `creditsLigne`). Une famille y ajoute ses entrées non photo (vidéo), rendues avec l'auteur, la source, la licence et **un lien vers le texte de la licence** | Aucun des six crochets de 021-01 ne touche les crédits. Les entrées `video` sont exclues de la ligne photo par 021-01 : sans ce crochet, le crédit de la vidéo d'atelier (§4.2) n'aurait aucune place |

Sans famille active, la sortie de 021-20 est identique octet pour octet à celle de 021-01 (SS-1).

**Règle d'or des familles.**
- **Écriture** : une famille n'écrit que dans `_kit/familles/<nom>.*`. Ses fichiers binaires sont recopiés dans `lestraque/<nom>/**` **par une tâche Antigravity** (§7.0).
- **Interdits** : elle ne touche jamais `kit.css`, `kit.js`, `relief*.js`, `generer.mjs` ni `da.json`.
- **Cascade** :
  - toute règle CSS d'une famille vit sous les mêmes conditions que la chorégraphie qu'elle prolonge ;
  - la cascade la place après kit.css : à spécificité égale, elle l'emporte ;
  - toute règle de bureau va dans `<nom>.bureau.css` ;
  - `<nom>.css` ne contient que ce que le téléphone, le mouvement réduit ou l'absence de JavaScript doivent recevoir.

### 3.1 Récit au défilement, plateau et atelier (021-03, famille `recit`)

**Références** (planches ouvertes par Claude Code, métadonnées par le connecteur) :
- https://motionsites.ai/?prompt=arceage-stats — chiffres comptés au temps, environ 1,3 s décéléré, mise en page immobile (`ref-recit.md` §1 R5) ;
- https://motionsites.ai/?prompt=layered-depth — la phrase sur la durée ;
- https://motionsites.ai/?prompt=data-storytelling (premium, catégorie SaaS, trouvé le 15/09) — planche
  `travail/motionsites-apercus/planches/data-storytelling-v5.jpg`, ouverte : « Every layer tells a story. », une phrase courte
  en deux graisses posée sur un objet unique qui traverse tout le cadre. Leçon : la phrase et l'image se lisent ensemble, sans
  rien d'autre qui bouge.

Le récit principal est porté par les étapes (§3.4). Citation, chiffres et verbes sont des **accents** qui l'annoncent.

#### A. La citation qui s'allume (plateau)

| Contexte | Comportement |
|---|---|
| **Bureau chorégraphié** | Chaque mot est un `span.citation__mot` (`style="--i:<rang>"`, rang à partir de 0). Il passe d'une opacité de **0,55** à **1**, lié à la position de la citation : `view-timeline` sur le `<p>` de la citation, `animation-range: cover calc(2% + var(--i) * 3%) cover calc(24% + var(--i) * 3%)`, `linear`, `fill-mode: both`. Le `.reveal` de la figure ne joue plus sa montée : `html.js .plateau__citation.reveal:has(.citation__mot){animation:none;opacity:1;transform:none}` sous les mêmes conditions. Règles dans `recit.bureau.css` |
| Téléphone | Rien dans `recit.*` : le profil téléphone (§3.6, 021-17) décide |
| Mouvement réduit, sans `view()`, sans JavaScript | Opacité 1 (les spans n'ont aucun style hors du bloc chorégraphié) |

**Paramètres et sources :**
- **Plage et pas** de 3 % par mot : ceux des titres qui se lèvent (kit.css:1091, `mot-leve`). Avec les 15 mots de la citation, le dernier s'allume entre `cover 44 %` et `cover 66 %` (calcul).
- **Plancher 0,55** : celui des numéros d'étapes (commentaire de kit.css:1136).
  - La citation est composée à `clamp(2.1rem,4vw,4rem)` (kit.css:355), soit 57,6 px à 1440 px et 43,5 px à 1088 px : ce sont des grands caractères au sens de WCAG 1.4.3.
  - Contraste au plancher mesuré par la contre-expertise : **5,49** (méthode du texte translucide, §0.1).
- **Propriétés animées** : `opacity` seulement.

**Fichiers.** `recit.mjs` → crochet `plateauCitation` : découpe sur les espaces, ponctuation collée au mot, apostrophes
typographiques inchangées (generer.mjs:110).

#### B. Les chiffres gagnés au temps (plateau)

**Le défaut corrigé.** Les chiffres entrent à l'écran et reçoivent `vu` alors que la citation n'est pas encore pleine. Mesures de la contre-expertise, avec le seuil de 0,12 et la marge de −6 % de kit.js:159 :
- **1440×900** : chiffres « vus » à y = 700, citation à `cover` 42,3 % ; citation pleine (`cover` 66 %) à y = 980 ;
- **1088×800** : y = 540, puis y = 810.

Sur cette bande de 270 à 280 px, rien n'était défini.

| Contexte | Comportement |
|---|---|
| **Bureau chorégraphié**, JavaScript actif | **État d'attente** : au démarrage, `recit.js` pose la classe `chiffres--attente` sur `.chiffres`. Sous les conditions du bureau chorégraphié, `recit.bureau.css` la rend à `opacity:0`. Le bloc est sous la ligne de flottaison au chargement, donc aucun éclair n'est visible. Si le script échoue, la classe n'est jamais posée et les valeurs finales restent affichées. Pendant l'attente, aucun nombre n'est visible, ni « 0 » ni valeur finale. **Départ** : quand les deux conditions sont vraies, dernier mot de la citation à opacité ≥ 0,98 **et** bloc `.chiffres` visible à 100 %, `recit.js` attend 0,3 s puis lance le fondu du bloc (0 → 1 en 0,55 s, `cubic-bezier(.16,1,.3,1)`) et le comptage de 0 à la valeur finale en **1,3 s**, courbe `cubic-bezier(.16,1,.3,1)` évaluée en JavaScript, en `requestAnimationFrame`, **une seule fois**. **Filet** : si le bloc est visible à 100 % depuis 4 s sans départ, les valeurs finales s'affichent sans comptage |
| Accessibilité | La vraie valeur reste dans le DOM : le crochet `plateauValeur` rend `<span class="chiffre__valeur"><span class="chiffre__vrai">10</span><span class="chiffre__compte" aria-hidden="true"></span></span>`. Pendant le comptage, `.chiffre__vrai` est masqué visuellement (pas `display:none`) et `.chiffre__compte` montre le nombre ; à la fin, retour à l'état initial. L'opacité 0 du bloc ne le retire pas de l'arbre d'accessibilité |
| Téléphone, mouvement réduit, sans `view()`, sans JavaScript | Valeur finale d'emblée, aucun comptage, bloc visible |

**Paramètres et sources :**
- **Durée** : 1,3 s décéléré (arceage-stats, `ref-recit.md` §1 R5).
- **Comptage au temps**, jamais au défilement, pour ne jamais figer un faux chiffre (R5). L'état d'attente invisible tient la même règle : pendant l'attente, aucun nombre faux n'est affiché.
- **Largeur** : les chiffres de Fraunces ont tous la même largeur, 259 px pour 111, 179, 180 et 888 (contre-expertise, `mesure.json`, `tnum`). `font-variant-numeric: tabular-nums` suffit ; RC-7 le vérifie.
- **Valeurs** : `site.json` → `plateau.chiffres`.

**Fichiers.** `recit.mjs` (crochet `plateauValeur`), `recit.bureau.css`, `recit.js`.

#### C. Les quatre verbes (atelier)

| Contexte | Comportement |
|---|---|
| **Bureau chorégraphié** | « trace », « débite », « assemble », « ponce » sont des `span.atelier__verbe` (`--i` de 0 à 3). Le reste de la phrase reste plein. Chaque verbe passe de 0,55 à 1 d'opacité **et** de `translateY(.12em)` à 0, lié au défilement : `view-timeline` sur la phrase, `animation-range: cover calc(20% + var(--i) * 6%) cover calc(34% + var(--i) * 6%)` |
| Téléphone | Rien dans `recit.*` (§3.6) |
| Mouvement réduit, sans `view()`, sans JavaScript | Verbes pleins |

**Paramètres et sources :**
- **Pas** de 6 % : celui de la cascade des `.reveal` (kit.css:1095).
- **Début et fin** : début à `cover 20 %`, fin d'un élément à +14 % ; **choix du cahier**, pour que les quatre verbes soient pleins avant le milieu de l'écran (fin du 4e à `cover 52 %`).
- **Contraste**, méthode du texte translucide (§0.1) :
  - la phrase est à 31,7 px à 1440 px, mais à **23,9 px à 1088 px** (kit.css:577), sous le seuil des grands caractères ;
  - le plancher doit donc tenir **4,5 à 1088 px** et 3,0 à partir de 1280 px ;
  - mesuré sur les boîtes des verbes : 5,28 à 5,40 (contre-expertise).
- **Si la vidéo d'atelier est active** (§4.2), elle ne démarre qu'une fois le dernier verbe plein : un seul mouvement à la fois.

**Fichiers.** `recit.mjs` : crochet `atelierPhrase`, qui entoure les quatre verbes exacts. Si l'un manque dans le texte, le crochet `garde` lève une erreur.

### 3.2 Défilement et animations fluides (021-09 mesure et filme ; 021-19 si Benj dit oui)

**Décision de cette vague.**
- **Pendant la vague** : le site reste en défilement natif jusqu'à la réponse de Benj à Q-B. La fluidité vient d'abord des paliers, des trous et des courbes, que le CSS lié au défilement exécute hors du fil principal dans Chrome et Safari 26.4 (https://webkit.org/blog/17862/webkit-features-for-safari-26-4/, cité par `ref-recit.md` §3.1).
- **Le « glissé »** : le rapport source reconnaît que c'est la signature des sites MotionSites (`ref-recit.md:311`). Il n'est donc **pas** écarté par défaut. Il est mesuré (021-09), puis montré à Benj **avant 021-11** (CC-5, étape bloquante).

**Contraintes que tout défilement lissé doit tenir** :
- `scroll-behavior:smooth` reste refusé : il bloque tout défilement programmé (kit.js:246-247) ;
- les juges et la vidéo de la landing pilotent la page par `scrollTo({behavior:'instant'})` (nav-retenue-qa.mjs:110 et 115, demo-usage-qa.mjs:151) et par défilement en rAF (demo-video.mjs:57-78) : DF-2 et DF-4 doivent tenir **avec** Lenis ;
- au téléphone : 0 octet et natif ; en mouvement réduit : coupé.

**Lenis** : MIT, 1.3.26 (`npm view lenis`, cité par `ref-recit.md` §3.1).
- **021-09** l'injecte sur une copie locale et mesure : DF-2, DF-4, p95 des intervalles rAF et tâches longues, en natif et avec Lenis (LN-5).
- **Si les trois mesures passent**, la recommandation à Benj est : glissé au bureau à la souris seulement. Il est chargé à part (`lestraque/lenis/`), vaut 0 octet au téléphone et est coupé en mouvement réduit.
- **Si Benj dit oui**, la tâche 021-19 le pose et nomme la dépendance (decisions.md:12).

**Jeu de courbes et de durées, obligatoire pour toutes les familles** (valeurs déjà dans le kit) :

| Usage | Valeur | Source |
|---|---|---|
| Lié au défilement | `linear` sur la timeline, forme donnée par les paliers des images-clés | kit.css:1139-1145 |
| Entrée ou accent au temps | 0,55 s, `cubic-bezier(.16,1,.3,1)` | kit.css:544 |
| Repli au temps (`.reveal`) | 0,55 s, `cubic-bezier(.2,.7,.2,1)`, cascade de 70 ms | kit.css:1072 |
| Sortie | 0,2 s, même courbe que l'entrée | Codrops, entrée 2 à 8 fois plus longue que la sortie (`ref-survol-objet.md` §1.2) |
| Aller-retour ambiant | `cubic-bezier(.37,0,.63,1)` | cahier 020 §3.5 ; kit.css:1176 |
| Zoom d'image au dévoilement | 0,9 s, `cubic-bezier(.16,1,.3,1)` | kit.css:546 |

**Propriétés animées permises** :
- `opacity`, `transform`, `translate`, `scale`, `rotate` ;
- `clip-path` pour une entrée ponctuelle au bureau (déjà utilisé, kit.css:544).

**Jamais** :
- `filter` (« sort du compositeur et coûte 400 ms de fil principal sur mobile », kit.css:100) ;
- une transition sur `width`, `height`, `top`, `left`, `padding` ou `margin` (site-qa.mjs, fonction `jugerGeste`).

**Écouteurs** : `scroll`, `wheel`, `touchmove` et `pointermove` sont toujours `{ passive: true }`, avec au plus une mesure par image (patron de kit.js:139).

### 3.3 Révélation au survol (021-06, famille `survol`)

**Références :**
- https://motionsites.ai/?prompt=reveal-hero — une seconde image révélée dans un disque doux sous le curseur (planche
  `survol-objet/apercus/reveal-hero-planche.jpg`, ouverte) ;
- https://motionsites.ai/?prompt=nike-hover — traînée amortie qui suit le curseur (`travail/motionsites/nike-hover.md`, prompt ouvert par Benj) ;
- https://motionsites.ai/?prompt=cardia-3d (premium, trouvé le 15/09) — planche `travail/motionsites-apercus/planches/cardia-3d-v5.jpg`,
  ouverte : le grand titre passe **derrière** l'objet, mais l'objet est sur fond sombre et le titre blanc reste lisible autour.
  Sur le papier clair des prestations (fond `rgb(244,237,226)`, titres `rgb(31,22,14)`, `presta-couleurs.mjs`), une photo
  sous un titre sombre le rendrait illisible dans les zones sombres : l'aperçu ne passe donc jamais sur le titre lu ;
- Codrops, *Creating a Menu Image Animation on Hover* (2020) — suivi amorti à 0,08 par image, volets en 0,2 s (`ref-survol-objet.md` §1.2) ;
- WCAG 2.2, critère 1.4.13 (https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

**Ce que la version d'avant ne tenait pas** (contre-expertises, 1440×900 et 1088×800) :
- **Titre couvert** : l'aperçu centré sur le curseur couvrait **54 %** du titre survolé.
- **Placement** : `left:0; top:0` plaçait chaque vignette dans sa ligne (`li.presta__ligne` en `position:relative`, kit.css:534 ; `ol.presta` en `static`).
- **Débordement** : sur la dernière ligne, l'aperçu dépassait le bas de la section de 113 px (1440), 103 px (1280) et 90 px (1088).
- **Numéro** : kit.css:1036-1041 veut le numéro de la ligne survolée **visible**.

**Géométrie mesurée** (`ce5/mesure.json`) :

| Format | Numéros (x) | Début du texte du h3 | Fin du texte du h3, lignes 1 à 6 | `.presta__texte` (x) | Hauteur d'une ligne |
|---|---|---|---|---|---|
| 1440×900 | 72 à 249 | 292 | 691 · 703 · 776 · 621 · 802 · 863 | 975 | 114 px |
| 1088×800 | 54 à 188 | 221 | 522 · 531 · 586 · 469 · 606 · 652 | 736 | 101 à 124 px |

**Le geste : un aperçu posé au-dessus de la ligne survolée**, qui suit le curseur à l'horizontale, avec du poids. Les six
`<picture>` existantes restent les seules images (le garde-fou « deux fois au plus » de generer.mjs:131-136 compte les `<picture>`).

| Contexte | Comportement |
|---|---|
| **Bureau ≥ 1024 px, souris, mouvement permis** | `survol.bureau.css` : `.scene--presta .presta__ligne{position:static}` et `.scene--presta ol.presta{position:relative}`. Toutes les vignettes sont placées au même endroit, dans le repère de `ol.presta` : `position:absolute; left:0; top:0; width:min(24vw,26rem); aspect-ratio:4/5; translate: calc(var(--sx) * 1px) calc(var(--sy) * 1px); rotate: calc(var(--sr) * 1deg)`. `survol.js` calcule, à chaque redimensionnement, les bornes sur les boîtes mesurées (voir les formules sous ce tableau). **Entrée** d'une ligne : son image s'ouvre par `clip-path: inset(50% 0 50% 0)` → `inset(0)` en **0,55 s** `cubic-bezier(.16,1,.3,1)`, et l'image intérieure passe de `scale:1.15` à 1 en 0,9 s. **Sortie** : fermeture en **0,2 s**, dans le sens du mouvement. Une seule image ouverte à plus de 50 % à la fois |
| Suivi | `k = 1 − exp(−dt × 5,0)` avec `dt` en secondes, appliqué à `--sx` et `--sy` en rAF, seulement tant que la souris est dans la liste ou que l'écart résiduel dépasse 0,5 px. **5,0 s⁻¹** = équivalent temporel du 0,08 par image à 60 Hz de Codrops 2020 (−ln(0,92) × 60 = 5,0). Passer d'une ligne à la suivante fait **glisser** l'aperçu d'une hauteur de ligne. Rotation : `--sr` = vitesse horizontale amortie × 0,02, bornée à ±4° (±4° : `ref-survol-objet.md` §2 ; 0,02 : choix du cahier, à juger sur film) |
| Chargement | Le HTML garde `sizes="(max-width: 767px) 80vw, 11rem"` (generer.mjs:493). **À l'approche** : quand `#prestations` est à moins d'un écran (IntersectionObserver, `rootMargin: '100% 0px'`), `survol.js` remplace l'attribut `sizes` des six `img`/`source` par `(max-width: 767px) 80vw, min(24vw, 26rem)` et appelle `img.decode()`. Le premier survol n'affiche jamais une image floue : à dpr 2, 345,6 px affichés demandent 691 px, que la variante 480 ne fournit pas (`ref-survol-objet.md` §2) |
| **Clavier** | `survol.js` (bureau seulement) remplace le contenu de chaque `h3` par `<button type="button" class="presta__declencheur" aria-pressed="false">` portant le même texte, stylé comme le titre. `:focus-visible` ou clic → l'aperçu de la ligne s'ouvre à la même place que pour la souris, avec `--sx` à la borne gauche et sans suivi ; `Escape` le ferme en gardant le focus ; `blur` le ferme. Pas de lien, pas de nouvel appel à l'action (§0.3, point 2) |
| Mouvement réduit (bureau souris) | Aucun suivi, aucune rotation : l'aperçu apparaît à sa place au-dessus de la ligne, abscisse à la borne gauche, en fondu d'opacité de 0,2 s |
| Téléphone, tactile | Rien de neuf : le rail montre déjà la photo en tête de carte (kit.css:726-728, 854). `survol.js` ne s'exécute pas, le DOM reste identique |
| Sans JavaScript | Survol CSS actuel (kit.css:543-549 et 1036-1041), inchangé |

**Formules des bornes**, pour une vignette de largeur `l` et de hauteur `h = 1,25 × l` :
- abscisse : `--sx = clamp(xh3, xCurseur − l/2, xTexte − 12 − l)`, où `xh3` est le début du texte des h3 et `xTexte` le bord gauche de `.presta__texte` ;
- ordonnée : `--sy = max(hautSection, hautLigne − 10 − h)`, où `hautSection` est le haut de `#prestations` et `hautLigne` le haut de la ligne survolée, tous deux dans le repère de `ol.presta`.

L'aperçu est donc toujours **au-dessus** de la ligne, jamais sur `.presta__texte`, jamais sur les numéros, et jamais hors de la section.

**Pourquoi « au-dessus »** (calcul sur la géométrie mesurée) :
- **1440×900** : l'aperçu mesure 345,6 × 432 px. Ligne 1 : l'ordonnée est bornée au haut de la section, donc l'aperçu descend de 37 px dans la ligne 1. Il couvre au plus 2 px de hauteur du h3 de 44 px, soit **4,5 %** ; les lignes 2 à 6 ne sont pas couvertes.
- **1088×800** : l'aperçu mesure 261 × 326 px. Ligne 1 : il descend de 14 px dans la ligne, sans toucher le h3.
- **Aucun débordement** au bas de la section.
- **Abscisse maximale** du bord gauche : 617 px à 1440 et 463 px à 1088, pour ne jamais toucher `.presta__texte`.

**Fichiers.** `_kit/familles/survol.bureau.css` (spécificité au moins égale à `.scene--presta .presta__vignette` de kit.css:1039) ;
`_kit/familles/survol.js`. Aucun `.mjs`.

### 3.4 Les étapes : récit en quatre temps et objet décomposé (021-04, 021-22, 021-05, 021-16 ; famille `eclate`)

**Références :**
- https://motionsites.ai/?prompt=cast-and-render : un objet rendu en 3D, déroulé au défilement en plein écran sur une piste `height: 560vh; min-height: 3200px`, avec des « trous » entre les textes (`travail/motionsites/cast-and-render.md:9-15`, prompt ouvert par Benj).
- https://motionsites.ai/?prompt=heart-health-dashboard (premium, catégorie 3D, trouvé le 15/09). Planche `travail/motionsites-apercus/planches/heart-health-dashboard-v5.jpg`, ouverte : un grand objet 3D domine le panneau, et une bulle reliée par un point à une partie de l'objet la nomme. Ce qu'on en retient : une étiquette est **ancrée** sur sa pièce.
- https://motionsites.ai/?prompt=cardia-3d (premium) : planche ouverte, l'objet au centre est plus grand que le titre qu'il chevauche.
- https://motionsites.ai/?prompt=veyra-electric et https://motionsites.ai/?prompt=nex-robotics : nommer une pièce par un filet court, l'anatomie comme argument de sérieux (`ref-survol-objet.md` §3.1).
- **Limite** : une recherche « exploded view product parts separating on scroll with labels », faite le 15/09 par le connecteur (10 résultats : scroll-landing, beauty-products, product-studio, scroll-marquee, veyra-electric, cardia-3d, heart-health-dashboard, pet-products, daisy-sweet, cordex), ne remonte aucun aperçu qui montre un éclaté au défilement. La chorégraphie ci-dessous est donc propre à Lestraque ; l'échelle, elle, suit les références.

**Ce qui était trop timide** (contre-expertise « exigence ») :
- **Taille** : le cadre faisait 450 × 338 px en 1440×900, soit 11,72 % de l'écran, et 400 × 300 px en 1088×800, soit 13,76 % (`ce5/mesure.json`).
- **Défilement** : l'éclatement et le remontage tenaient chacun en 6,75 % de la plage, soit 121 px et 108 px de défilement.
- **Lecture** : l'objet se lisait comme trois planches, pas comme un escalier.

**Pourquoi une marche, puis un tronçon d'escalier.**
- **Le lien avec le texte** : il relie mot pour mot la prestation 01 (« marches de 40 mm », contenu.json:25), le héros (l'escalier) et l'étape « Plan et devis » (« un devis ligne par ligne », contenu.json:161 : une pièce, une ligne).
- **La photo remplacée** : `tournage-copeaux` reste affichée dans la vignette de la prestation « escalier » (da.json, `prestationsPhotos.escalier`), donc le contrôle des photos orphelines (generer.mjs:786-787) tient.

**La mise en page mesurée aujourd'hui** (`etapes-mise-en-page.json`, étape 02 pleine) :

| Format | `#etapes` | Plage `contain` | Colonnes | Liste (x, largeur) | Texte d'une étape | Titre h2 |
|---|---|---|---|---|---|---|
| 1440×900 | 2 700 px | 1 800 px | 540 · 676 px, écart 80 | 692, 676 | 503 px, 2 lignes | 540 × 196 px |
| 1280×800 | 2 400 px | 1 600 px | 476 · 596 px | 620, 596 | 442 px, 2 lignes | 476 × 174 px |
| 1088×800 | 2 400 px | 1 600 px | 400 · 500 px | 534, 500 | 352 px, 3 lignes | 400 × 148 px |

#### A. Le rendu (021-04, Antigravity, en cours)

La fiche `en-cours/021-04.md` fait foi :
- **Objet et fichiers** : tronçon de trois marches sur un limon à la française, en quatre calques (`limon`, `contremarche`, `marche`, `vis`), cadre 4:3 de 1 400 × 1 050 px ; `assemble.avif`, `eclate.avif`, quatre calques avec alpha, `eclate.json` (boîtes, vecteurs, ordre, cinq étiquettes projetées, cote « 40 mm ») ;
- **Poids** : ≤ 60 000 octets d'AVIF ;
- **Justesse** : composite ≤ 1 % de pixels écartés ;
- **Teinte** : ΔE00 ≤ 10 contre les marches de la photo du héros (OB-9) ;
- **Reproductibilité** : deux lancements ; rapport avec la qualité AVIF (OB-7, `eclate-rendu-qa.mjs:13`).

Avant 021-22, Claude Code regarde la planche et les rendus (CC-2) : le bois fait-il chêne ? Les vis se voient-elles ?

#### B. Le relevé au trait et la recopie dans le site (021-22, Antigravity)

- **Relevé au trait** : relancer le script Blender de 021-04 (recopié dans la preuve de 021-22, même caméra orthographique, même cadre) en mode trait. Selon ce que Blender 5.2 offre, c'est le modificateur Line Art de Grease Pencil ou Freestyle : la tâche vérifie et consigne. Le trait est crème `#F4EDE2` (jeton de `.section--noir`, kit.css:468) sur fond transparent, avec les arêtes visibles du tronçon assemblé.
  - Sortie : `releve.avif` (alpha) ≤ 15 000 octets (**choix du cahier** : un quart du plafond des six AVIF de l'éclaté, pour un dessin sans matière).
  - Sortie : `releve.json` = `{ "cadre": {...}, "cotes": [ { "texte": "40 mm", "x1", "y1", "x2", "y2" }, { "texte": "17 mm", … } ] }`, points projetés par Blender, en fraction du cadre.
  - Cotes, les seules : l'épaisseur d'une marche, « 40 mm » (contenu.json:25), et la profondeur d'une entaille, « 17 mm » (§0.3, point 6).
- **Fond des rendus** : l'éclaté va vivre sur le noir de la section. Si la couleur du pixel (0, 0) d'`assemble.avif` s'écarte de `#14110E` (fond de `.section--noir`, kit.css:468) de plus de 3 niveaux sur un canal, 021-22 relance le rendu complet avec ce fond. Le juge `eclate-rendu-qa.mjs --dossier=.orchestre/preuves/021-22` doit alors repasser.
- **Recopie** : seulement après ses propres contrôles, 021-22 recopie dans `public/sites-demo/lestraque/eclate/` les six AVIF et `eclate.json` retenus, plus `releve.avif` et `releve.json`. Les empreintes sha256 doivent être identiques à celles de la preuve.
  - Cette recopie de fichiers binaires est faite par Antigravity et non par Codex (constat de faisabilité, §10).
  - Elle écrit aussi `lestraque/eclate/attributions.json`, en entrées `"type": "rendu"`, auteur « Presti », licence « rendu procédural, sans œuvre tierce ».

#### C. La grande scène et l'éclaté pièce par pièce (021-05, Codex)

| Contexte | Comportement |
|---|---|
| **Bureau chorégraphié et hauteur ≥ 680 px** (étapes épinglées, kit.css:1110) | Le crochet `etapesMedia` rend `<figure class="etapes__photo eclate" role="img" aria-label="Anatomie d'un escalier : limon à la française, marches en chêne de 40 mm, contremarches et vis">`, qui garde la classe `etapes__photo` (sa place au téléphone, kit.css:768-778). Contenu : une boîte `div.eclate__rendu` au rapport 4:3 avec `container-type: size`, qui contient `img.eclate__assemble`, un `img.eclate__calque` par pièce (`loading="lazy"`, `decoding="async"`, positionné par `left/top/width/height` en % depuis eclate.json, `--vx`/`--vy` = vecteur × 100, animé en `translate: calc(var(--vx) * 1cqw) calc(var(--vy) * 1cqh)`), `img.eclate__eclate` (repli), un SVG de cote et les étiquettes en HTML (`aria-hidden="true"`), chacune reliée par un filet et un point à son ancre d'eclate.json ; et un compteur `span.eclate__compteur` « 01 / 04 », construit comme celui du travelling (`.compteur__fenetre` et `.compteur__piste`, kit.css:633-637) |
| Neutraliser le cadre photo | Dans `eclate.bureau.css`, avec une spécificité supérieure à kit.css:1105 et 1116 : `#etapes .etapes__photo.eclate img{animation:none;scale:none;translate:none}`, puis les animations de l'éclaté au-dessus. Sans cela, `glisse-cadre` (translate) et `scale:1.14` s'appliqueraient aux calques |
| **Grande scène** | Dans `eclate.bureau.css`, sous les conditions des étapes épinglées : `#etapes:has(.eclate){height:450svh}` (au lieu de 300svh, kit.css:1111) ; `.etapes__tete` alignée en haut (au lieu de `align-self:center`, kit.css:1114) ; la figure prend la colonne de gauche et **peut déborder dans la marge gauche jusqu'au bord de la fenêtre** ; le fond de la figure est celui de la section. Cibles mesurables : EC-11 à EC-15 (boîte du rendu ≥ 30 % de l'écran en 1440×900 et ≥ 23 % en 1088×800 ; texte des étapes ≥ 420 px et ≥ 310 px de large, 4 lignes au plus ; titre h2 jamais recouvert). Faisabilité calculée sur la mise en page mesurée : en 1440×900, une boîte de 720 × 540 px, débordant de 65 px dans la marge de 72 px, laisse 1 296 − 655 − 48 = 593 px à la liste, dont 420 px de texte après la colonne des numéros de 173 px ; en hauteur, 88 + 196 + 24 + 540 = 848 ≤ 876 px. En 1088×800 : boîte de 527 × 395 px, débordement de 54 px, texte de 310 px ; 88 + 148 + 24 + 395 = 655 ≤ 776 px |
| Téléphone, mouvement réduit, sans `view()`, hauteur < 680 px (`eclate.css`) | **Cadre 4:3 à toutes les largeurs** (`.etapes__photo.eclate{aspect-ratio:4/3}`, contre le 3:2 de kit.css:768 et 771 ; mesuré aujourd'hui 390 × 260 px au téléphone). Seule `eclate.avif` est affichée ; `assemble.avif` et les calques restent `display:none`, donc non chargés. Les étiquettes deviennent **cinq pastilles numérotées** (≥ 24 × 24 px, chiffre ≥ 14 px) posées sur leurs ancres, et une **légende** `ol.eclate__legende` sous la figure, avec les cinq textes en ≥ 14 px ; les étiquettes du bureau sont masquées. Rien ne bouge |
| Sans JavaScript | Comme le téléphone au bureau non chorégraphié (rien ne dépend de JavaScript) |

**Chorégraphie, sur la plage `contain` de `#etapes` à 450svh.**
- **Longueur de la plage** : 350svh, soit 3 150 px en 1440×900 et 2 800 px en 1280×800 et 1088×800.
- **Paliers de la liste** : inchangés (§0.3, point 5).
- **Tenues** : autour de chaque centre de palier, la scène est **complète et immobile** sur ±3 %, soit 189 px en 1440 et 168 px en 1088. Ce sont les trous.

| Plage (%) | Liste | La scène (021-05 seule) | Animation |
|---|---|---|---|
| 0 → 29,125 | 01 pleine | assemblée, immobile ; compteur « 01 » | — |
| 29,125 → 35,875 | fondu 01 → 02 | rien ne bouge dans la scène | compteur : passe à « 02 » à 32,5 |
| 35,875 → 38,875 | 02 pleine | la cote « 40 mm » entre, **après** le fondu de la liste | cote : `opacity` 0 → 1, `scale` 0,6 → 1 sur l'axe du trait |
| 38,875 → 46,75 | 02 pleine | immobile (tenue C2 = 43,75 ± 3) | — |
| 46,75 → 63,25 | fin de 02, fondu, début de 03 | **l'éclatement, pièce par pièce** : cote sortie (46,75 → 47,75) ; `assemble.avif` 1 → 0 et calques 0 → 1 (46,75 → 47,25) ; puis quatre groupes, chacun sur 9 %, départs décalés de 2,5 % : **vis** 46,75 → 55,75 ; **marches** 49,25 → 58,25 ; **contremarches** 51,75 → 60,75 ; **limon** 54,25 → 63,25 (un groupe dont le vecteur est nul ne bouge pas). Étiquettes : entrées l'une après l'autre, départs 58,5 + 0,8 k (k = 0 à 4), chacune sur 1,55 %, toutes pleines à 63,25 ; compteur « 03 » à 55 | calques : `translate` 0 → vecteur ; étiquettes : `opacity` 0 → 1 et `translateY` 0,5rem → 0 |
| 63,25 → 69,25 | 03 pleine | éclatée, nommée, immobile (tenue C3 = 66,25 ± 3) | — |
| 69,25 → 70,94 | 03 pleine | étiquettes sorties | `opacity` 1 → 0 |
| 70,94 → 87,44 | fin de 03, fondu, début de 04 | **le remontage**, ordre inverse, les vis en dernier : **limon** 70,94 → 79,94 ; **contremarches** 73,44 → 82,44 ; **marches** 75,94 → 84,94 ; **vis** 78,44 → 87,44 ; calques 1 → 0 et `assemble.avif` 0 → 1 sur 86,94 → 87,44 ; compteur « 04 » à 77,5 | calques : vecteur → 0 |
| 87,44 → 100 | 04 pleine | assemblée, immobile (tenue C4 = 90,44 ± 3) | — |

**Longueurs obtenues** :
- l'éclatement et le remontage couvrent chacun 16,5 % de la plage, soit **520 px** en 1440×900 et **462 px** en 1088×800 ;
- plancher : 450 px, demandé par la contre-expertise ;
- à comparer à Cast and Render : au moins 3 200 px de piste pour tout le récit.

**Sources et choix** :
- **Bornes des paliers** : calculées depuis kit.css:1118-1145 (§0.3).
- **Cote après le fondu** : correction de la contre-expertise, jamais pendant que les textes de la liste se croisent.
- **« Vis en dernier »** : ce sont elles qui fixent (§0.3, point 6).
- **Choix du cahier, à juger sur film** : 450svh, les tenues de ±3 %, la durée de 9 % par groupe et le décalage de 2,5 %.
- **Propriétés** : `translate`, `opacity`, `scale` seulement.

**Contraste des étiquettes et de la cote** :
- texte crème `#F4EDE2` sur `#14110E`, filet `#D4A574` ;
- p90 ≥ 4,5 (WCAG 1.4.3, texte courant) ;
- texte ≥ 14 px (**choix du cahier**, EC-13).

**Fichiers.** `_kit/familles/eclate.mjs` (crochets `etapesMedia` et `garde` : les fichiers d'eclate.json existent dans
`lestraque/eclate/`, chacun > 0 octet, et la figure est rendue) ; `_kit/familles/eclate.bureau.css` ; `_kit/familles/eclate.css`.
Aucune ligne de JavaScript.

#### D. Le récit dans la scène : la demande, le relevé, le devis, la pose (021-16, Codex, après 021-05)

Les centres des paliers deviennent quatre **états** de la scène, un seul à la fois, dans la même boîte :

| Palier | Liste (texte existant) | État de la scène (021-16) | Texte de la scène (réel ou sourcé) |
|---|---|---|---|
| C1 = 14,56 | 01 | **La demande** : une fiche en HTML, crème sur noir, à la place du rendu | « Votre projet — Escalier » · « Commune — Rennes » · « Quand — Dans les trois mois » (libellés et options du formulaire, `lestraque/index.html:41`) |
| C2 = 43,75 | 02 | **Le relevé** : `releve.avif`, au trait, dans la même boîte que le rendu, avec ses deux cotes | « 40 mm », « 17 mm » (`releve.json`) |
| C3 = 66,25 | 03 | **Le devis** : l'éclaté de 021-05, dont les étiquettes sont numérotées 1 à 5 comme des lignes de devis, **sans aucun prix** | les cinq étiquettes d'eclate.json |
| C4 = 90,44 | 04 | **La pose** : l'escalier remonté, puis une phrase seule, **sans lien** | « Tout commence par votre demande. » (**choix du cahier**, question Q-C) |

**Passages** (ils remplacent les lignes du tableau de 021-05 aux mêmes plages) :
- **29,125 → 35,875**, fondu de la liste : la fiche sort (`opacity` 1 → 0, `translate` 0 → −1,5rem) pendant que le relevé entre par `clip-path: inset(0 100% 0 0)` → `inset(0)` ;
- **35,875 → 38,875** : les cotes du relevé entrent, remplaçant la cote seule de 021-05 ;
- **46,75 → 48,75** : le trait s'efface (`opacity` 1 → 0) pendant que les calques apparaissent. L'éclatement de 021-05 suit, inchangé ;
- **87,44 → 90,0** : la phrase finale entre (`opacity` 0 → 1, `translateY` 0,5rem → 0). Elle est pleine avant la tenue et le reste jusqu'à 100 %.

La phrase n'est ni un lien ni un bouton : nav-retenue compte tout `a[href*="#contact"]` visible (nav-retenue-qa.mjs:59).
Une seule chose change à la fois dans la scène ; aucun texte de la scène ne bouge pendant que la liste croise ses textes, sauf
la fiche qui sort.

**Fichiers.** Les mêmes que 021-05, qui les a créés : 021-16 tourne **après** le PASS de 021-05.

### 3.5 Geste au repos, relief et descente (020-02 et 020-15 faites ; 021-02 réduite ; 020-03)

| Tâche | État ou contenu | Fichiers | Juge |
|---|---|---|---|
| **020-02**, **020-13**, **020-15** | **Faites et versées** (§0.2) | — | `signature-repos-qa.mjs`, `signature-relief-qa.mjs` (versés) |
| **021-02** (Codex), **réduite** | Ce que 020-15 a laissé : **texture 2880** (`images/heros-escalier-2880.avif`, 745 293 octets, existe) chargée par le worker **au moins 3 s après** l'état prêt de la toile, avec **mipmaps**, jamais si `navigator.connection.saveData` ; le fil ajoute à sa réponse « compte » `texture: { largeur, mipmaps }` et `dureeP95` ; la clé `"texture": "images/heros-escalier-2880.avif"` dans `da.json` → `relief` (decisions.md:62 : c'est 021-02 qui l'écrit). **Pas** de `calme` ni `lumiereCss` : déjà posés | `_kit/relief.js`, `_kit/relief-fil.js`, `_kit/da.json` (clé `relief.texture` seulement), SORTIES | `scripts/relief-texture-qa.mjs` (à écrire, RX-1 à RX-7 ; il échoue aujourd'hui : pas de clé, pas de champ `texture`) |
| **020-03** (Codex) | Palier de 30svh, zoom 1 → 1,04, fondus sur 25svh, δ jusqu'à δmax, ρ = 0 (decisions.md:61) ; `data-relief-descente` est posé par 021-01 | `_kit/kit.css` (bloc 2 du cahier 020 §7.3, après le bloc de 020-02), `_kit/relief.js`, `_kit/relief-fil.js`, SORTIES | `scripts/signature-defile-qa.mjs` (à écrire : D-1 à D-15 du cahier 020 §8.2) |

**Seuil de D-15.**
- **La règle** : 0,9 × la valeur du film retenu (cahier 020 l.782-785).
- **La valeur de référence** : elle est **calculée par le juge lui-même** sur `020-01/descente/avant-correction/descente-d116.mp4`, par la même mesure de déplacement (appariement de blocs de 16 px sur l'image réduite), puis consignée dans son JSON.
- **Ce qui manque ailleurs** : `controle-film-d116.json` ne contient que l'écart film contre image-clé (0,0168 à y = 270 ; 0,0155 à y = 1170), pas ce déplacement. L'« annexe B » citée n'existe pas.

### 3.6 Profil téléphone (021-17, famille `telephone`, CSS seul ; question Q4)

> **Complément du 16/09/2026 (Benj) — le téléphone de référence est un Xiaomi (Android).** Benj constate « au téléphone il n’y a pas les animations, il n’y a rien du tout ». Conséquences pour le profil mobile v2 (tâche 024-01) :
> - le navigateur peut être Chrome **ou le navigateur Xiaomi (Mi Browser), à moteur Chromium souvent plus ancien** : aucun effet ne doit dépendre seulement d’`animation-timeline` ; repli IntersectionObserver / Web Animations obligatoire ;
> - sur Xiaomi (HyperOS/MIUI), l’économiseur de batterie et l’option « Supprimer les animations » peuvent faire répondre `prefers-reduced-motion: reduce` au navigateur : en mouvement réduit, **garder des fondus d’opacité et de couleur sans déplacement ni échelle** (le site reste vivant sans mouvement), et rien qui clignote ;
> - WebKit 26.6 est désormais installé pour Playwright : un profil iPhone réel (moteur WebKit, qui gère `view()`) s’ajoute aux profils Android et « sans prise en charge ».

**Constat.**
- **Aujourd'hui** : au téléphone, deux animations seulement tournent, `derive-tel-haut` et `jauge` (`ce5/mesure.json`, 390×844 ; existant.md:45, « 70 animations au bureau, 2 au téléphone »).
- **Le héros** : entre 2 s et 5 s après le chargement, son écart moyen est de 0,0185 (captures `ce5/tel-heros-t2.jpg` et `-t5.jpg`, ouvertes : une photo fixe et le titre).
- **La règle** : decisions.md:9 n'exclut que l'animation **lourde** au téléphone. Les animations de `transform` et `opacity`, liées au défilement ou au temps, passent par le compositeur (§3.2).

**Proposition (défaut si Benj ne répond pas), tout dans `_kit/familles/telephone.css`**, sous **téléphone portrait**,
`prefers-reduced-motion: no-preference` et `html.js`, avec `@supports (animation-timeline: view())` pour les points 2 à 4 :

1. **RL au héros, en CSS.**
   - **Remplacement** : `derive-tel-haut` est remplacée par la rotation et le projecteur de RL, avec les mêmes durées que le bureau : rotation 10 s aller-retour en `cubic-bezier(.37,0,.63,1)`, projecteur 9 s linéaire décalé de −2,5 s (`020-01/RL/bloc.css:22`, :28).
   - **Réglages à mesurer** : amplitude, point d'origine (l'œil de la spirale **dans le recadrage portrait**) et échelle de base. Ils couvrent les coins à chaque image (TL-2). La valeur 1,07 du bureau est calculée pour d'autres rapports (cahier 020 §3.5).
   - **Projecteur** : placé pour le portrait, sous le voile existant (kit.css:937).
   - **Mots-clés** : `@keyframes signature-tourne-*` et `signature-projecteur` sont déclarés hors de tout bloc `@media` (kit.css:1178-1179, 1188). La tâche vérifie qu'ils sont bien disponibles au téléphone, sinon elle les redéclare sous d'autres noms.
2. **Citation mot à mot**, comme au §3.1 A, mais en `view()` au téléphone.
3. **Verbes**, comme au §3.1 C, en `view()`.
4. **L'éclaté s'ouvre en entrant à l'écran.**
   - `assemble.avif` et les calques sont affichés au lieu d'`eclate.avif`.
   - Les calques vont de 0 à leur vecteur sur `animation-timeline: view(); animation-range: entry 20% cover 45%` (**choix du cahier**), puis les pastilles apparaissent.
   - En remontant, il se referme. Aucun JavaScript : la classe `.vu` de kit.js viendrait avec les styles d'entrée de `.reveal`.

**Ce qui ne change pas au téléphone** :
- chiffres (valeurs finales), survol (rail), vidéo d'atelier et glissé : absents ;
- 0 worker, 0 WebGL ;
- la tablette de 768 à 1 023 px garde la photo paysage et `pousse` (mesuré : `heros-escalier-2400.avif` en 820×1180 et 1000×700).

**Garde-fous** :
- Lighthouse mobile 5 passes, médiane ≥ 95 et LCP < 2 500 ms (TL-8) ;
- 0 requête ajoutée au chargement hors `bureau.css` (TL-9) ;
- film du téléphone avant/après sur toute la page, regardé par Benj avant 021-11 (CC-5).

---

## 4. Vidéo de héros

### 4.1 Ce qui est retiré : le MP4 du geste au téléphone (021-07, 021-08)

La première version prévoyait, au téléphone seulement, le geste CSS de RL rejoué image par image sur la photo, encodé en MP4
et joué une fois. **Cette voie est retirée**, pour cinq raisons vérifiées.

1. **Ce n'est pas une vidéo au sens des références.** Le rapport source le dit : « une vidéo tirée d'une photo n'a de valeur que si elle contient ce que le CSS ne sait pas faire » (`ref-video.md:119`). Les références ouvertes montrent une scène qui bouge vraiment : chalet dans la brume (unwind-hero), fleurs qui poussent (speakup-venture-hero).
2. **Elle ne pouvait pas passer sans saut.**
   - La dérive du héros tourne dès le chargement (kit.css:940-942 ; 12 s aller-retour, kit.css:698), alors que la vidéo ne jouait qu'après `load`, un moment libre et le téléchargement.
   - Écart moyen contre l'état à 0 : 0,0104 à 0,5 s, 0,0199 à 1 s, 0,0446 à 3 s, 0,0542 à 4 s (contre-expertise, `derive.mjs`), pour un seuil VH-5 de 0,006.
3. **Mauvaise cible.** Elle était déclenchée sous 1 024 px, alors que la photo portrait et son cadrage ne servent que sous 768 px (generer.mjs:252 ; kit.css:935-941). Entre 768 et 1 023 px, elle aurait remplacé une photo paysage (mesuré : `heros-escalier-2400.avif` en 820×1180 et 1000×700).
4. **Chemin iPhone non couvert.** `requestIdleCallback` est absent de Safari (caniuse, « n d #2 » pour Safari 26.2 à 27 et iOS Safari 26.1 à 26.6). Le H.264 n'est jamais lu par le Chromium de Playwright (« Chromium does not have all the codecs that Google Chrome or Microsoft Edge are bundling », playwright.dev/docs/browsers).
5. **Coût.** 200 000 à 300 000 octets pour un geste que le CSS fait pour 0 octet.

**À la place** : au téléphone, RL tourne **en CSS** (§3.6, Q4).

**Suites** :
- `travail/021-07-en-attente.md` est archivé ;
- `scripts/video-heros-clip-qa.mjs` n'est pas versé ;
- l'extension de licence consignée (decisions.md:60) reste valable, mais sans usage dans cette vague, sauf l'ouverture filmée (§4.3) si Benj la retient.

### 4.2 La vraie vidéo : des mains dans l'atelier, au bureau (021-10 → Q-A → 021-18 → 021-13, famille `video`)

**Références** (planches ouvertes par Claude Code) :
- https://motionsites.ai/?prompt=unwind-hero : chalet dans la brume, avancée très lente, titre blanc posé sur une brume uniforme ; écart moyen 0,0046 par image (`ref-video-mesures.json`) ;
- https://motionsites.ai/?prompt=speakup-venture-hero : la place du titre est vide **dans** l'image ; écart moyen 0,0039 ;
- https://motionsites.ai/?prompt=visual-hero et https://motionsites.ai/?prompt=cinematic-brand : fond noir qui garantit le contraste (`ref-video.md` §1.2).

La recherche « craft workshop hands woodworking cinematic video hero » (connecteur, 15/09) ne remonte aucun atelier. Les dix résultats sont Wealth Video Hero, cinematic-brand, ltx-video, New Era Automotive Hero, vertex-ai-hero, impressive-hero, visual-hero, unwind-hero, obsidian-hero et ai-workflow. `ref-video.md:63` le relevait déjà : « aucun atelier, aucun artisan, aucun bois travaillé ».

**Où.**
- **La scène** : la scène plein cadre « Dans l'atelier » (`#atelier`, 100svh, existant.md §1.1), au bureau.
- **Ce qu'on ne fait pas** : ce n'est pas le héros. RL, la descente et le relief vivent sur la photo du héros, et Benj a dit de tout garder (decisions.md:54).
- **Pourquoi elle compte** : c'est le seul endroit de la page où une vraie scène filmée peut prendre tout l'écran. Elle est dans le film de la landing en 1280×800 (§5.5).

**La source.**
- **Qui la cherche** : 021-10 (Antigravity) visionne 6 à 10 plans libres, au moins 3 « mains seules » (`rushes-atelier-qa.mjs`, RU-1 à RU-5 déjà écrits). Banques : Pexels, Pixabay, Coverr, Mixkit « Free », Commons CC0 (`ref-video.md` §2.1).
- **Ce qu'elle mesure** : pour chaque plan, le poids ré-encodé en 1280×720 sur 8 s (RU-6).
- **Qui choisit** : Benj, sur les planches (Q-A).
- **Sans réponse au moment de lancer 021-18** : le plan « mains seules » de 6 s au moins, sans coupe, dont le H.264 ré-encodé est le plus léger. Benj le voit de toute façon sur le film complet avant la mise en ligne (CC-4).
- **Risque de marque** : montrer une vraie personne comme l'artisan fictif. Pexels interdit de suggérer un tel lien (`ref-video.md` §2.2). La parade : mains seules, sans visage ni logo, et crédit « images d'illustration ».

| Contexte | Comportement |
|---|---|
| **Bureau ≥ 1024 px**, mouvement permis, JavaScript actif, `saveData` faux | **Aucun balisage au générateur**. `video.js` crée l'élément quand `#atelier` est à moins d'un écran (IntersectionObserver, `rootMargin: '100% 0px'`), après `load` et un moment libre : `requestIdleCallback(…, { timeout: 1200 })`, **sinon `setTimeout(…, 300)`** (le repli de kit.js:217). L'élément : `<video class="atelier__video" muted playsinline loop preload="auto" aria-hidden="true" tabindex="-1" disablepictureinpicture>`, posé dans le média de la scène sous le voile existant, avec deux `<source>` (AV1 puis H.264). La vidéo reste à `opacity:0`. **Lecture** : quand la scène couvre ≥ 60 % de l'écran **et** que le dernier verbe est plein (opacité ≥ 0,98), `play()` ; à `playing`, fondu 0 → 1 en 0,55 s (`cubic-bezier(.16,1,.3,1)`, l'image diffère de la photo) ; la dérive de la photo dessous passe en `animation-play-state: paused`. **Pause** quand la scène couvre < 20 % de l'écran. **Bouton** `button.atelier__pause` (« Mettre la vidéo en pause » / « Relancer la vidéo », `aria-pressed`), en bas à droite de la scène, visible dès `playing` : WCAG 2.2.2 exige un moyen d'arrêter un mouvement automatique de plus de 5 s (https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). Ce bouton n'est pas un appel à l'action : aucun lien vers `#contact` |
| Téléphone et tablette < 1024 px, mouvement réduit, `saveData`, sans JavaScript | Aucun élément créé, 0 requête vidéo, la photo actuelle |
| Échec (`error`, `play()` rejeté, pas de `playing` en 4 s) | L'élément est retiré ; la photo et sa dérive restent |

**Paramètres et sources.**
- **Encodage** (021-18, Antigravity), mesuré par `ref-video.md` §2.3 :
  - format : 1280×720, boucle de 6 à 8 s ;
  - H.264 : `libx264 -preset slow -crf 27 -tune film -pix_fmt yuv420p -movflags +faststart -an` (niveau ≤ 4.0) ;
  - AV1 : `libsvtav1 -preset 5 -crf 40 -an`, encodé depuis la source et non depuis le H.264 ;
  - raccord de boucle : écart moyen entre la dernière et la première image ≤ 0,03, sinon un fondu de 0,5 s est cuit dans le fichier (**choix du cahier**).
- **Plafonds** : AV1 ≤ 350 000 octets, H.264 ≤ 600 000 octets.
  - C'est un **choix du cahier**, environ le double de la seule mesure disponible (photo d'atelier animée, 1280×720, 8 s : 279 023 o en H.264 et 109 208 o en AV1, `ref-video.md:111`).
  - Raison : un vrai plan en mouvement se compresse moins bien qu'une photo animée.
  - À revoir sur les mesures de RU-6.
- **Lisibilité** : la phrase de l'atelier et ses verbes passent **sur** la vidéo. À chaque image échantillonnée, le contraste doit tenir les seuils de RC-9 (VA-11). Si le plan choisi ne les tient pas, 021-18 le recadre pour garder les mains hors de la zone du texte. On n'assombrit jamais l'image.
- **Hébergement** : `lestraque/video/atelier.av1.mp4` et `atelier.h264.mp4`, en même origine (CSP, §0.3, point 3). La recopie est faite par 021-18 (Antigravity).
- **Crédit** : par le crochet `credits` (021-20), dans les mentions légales :
  - texte : « Images d'illustration : <auteur>, <banque>, <licence> » ;
  - avec le lien de la page du plan et le lien du texte de la licence ;
  - entrée `"type": "video"` dans `lestraque/video/attributions.json`.

**Fichiers.** `_kit/familles/video.mjs` (crochets `credits` et `garde` : les deux fichiers et l'entrée existent) ; `video.bureau.css` ;
`video.js`.

### 4.3 L'ouverture filmée au bureau : un prototype à montrer (021-15, question Q-A2)

**Pourquoi.** Au chargement, un plan de 3 à 5 s « contient ce que le CSS ne sait pas faire » (`ref-video.md:119`) : le relief de la photo,
filmé avec la carte graphique, dans une **remontée du puits**, qui finit **exactement** sur la photo du héros au repos, puis RL prend le relais.

**Ce que produit 021-15** (Antigravity, rien dans le site) :
- **Page de tournage** : hors du site, dans la preuve, qui réutilise `relief.js` et `relief-fil.js` en lecture. Chromium avec carte graphique (`--use-gl=angle`, cahier 020 §8.0).
- **Images positionnées une à une**, jamais en temps réel (méthode des films R, L1 et L2) :
  - la trajectoire va de δ = 0,116 (δmax à dpr 1, cahier 020 §6) et d'un zoom de 1,04 (cahier 020 §2), jusqu'à δ = 0 et un zoom de 1 ;
  - sans titre, puis le titre en fondu sur la dernière seconde ;
  - la **dernière image est identique** à la capture du héros au repos, animations à 0 (écart moyen < 0,006).
- **Formats et sorties** :
  - 1440×900 et 1088×800, 30 images/s, H.264 et AV1 aux réglages du §4.2, poids consignés ;
  - `cote-a-cote.mp4` : le chargement actuel à côté du chargement avec l'ouverture ;
  - `planche.jpg` ;
  - `rapport.md`, avec licence et empreinte de la source.
- **Licence** : c'est une adaptation de la photo CC BY-SA 4.0 de Petar Milošević (attributions.json). Si Benj la retient, elle est diffusée sous la même licence, avec le lien de la licence (decisions.md:60).

**Si Benj dit oui**, une tâche d'intégration sera écrite à part. Elle ne fait pas partie du chemin de cette vague : LCP du bureau,
relais avec RL et relief, et contraste du titre sont à mesurer.

---

## 5. Budget et non-régression

### 5.1 Lighthouse mobile

- **Barre** : sur **5 passes** de l'accueil servi en local :
  - médiane de la performance **≥ 95** (contrainte de Benj) ;
  - médianes LCP **< 2 500 ms**, TBT **< 200 ms**, CLS **< 0,1** ;
  - accessibilité, bonnes pratiques et SEO ≥ 95 (site-qa.mjs:47-52).
- **Marge connue** : LCP de référence de 2 480 à 2 487 ms, soit 13 à 20 ms sous la barre ; une passe à 94 sur 5 (resume.json).
- **Outil** : `scripts/lighthouse-mediane.mjs`, à écrire par Claude Code. Il :
  - sert un dossier en local **en brotli**, comme la production (`Content-Encoding: br` relevé sur `styles.css` en ligne le 15/09), et l'écrit dans `resume.json` (`"compression": "br"`) ;
  - envoie l'en-tête CSP de production (§5.3) ;
  - lance 5 passes avec les réglages de resume.json : simulation, débit 1 474,56 kbit/s, processeur ×4, 412×823 à dpr 1,75 ;
  - prend le verrou de site-qa.mjs:615-629.

  La série de 02:00Z, servie sans compression, n'est plus une référence : un octet brut n'y pesait pas ce qu'il pèse en ligne.
- **Quand** :
  - chaque tâche qui change ce que le téléphone charge mesure elle-même la médiane par son juge : 021-20 (lien de `bureau.css`), 021-03 (spans dans le HTML), 021-05 et 021-16 (`eclate.css`, HTML de la figure), 021-17 (profil téléphone) ;
  - la mesure finale avant/après est une tâche à part (021-21).
- **Référence « avant »** : e33aec0, extrait par `git archive` (lecture seule) dans `.orchestre/travail/021-21/avant/`, servi par le même outil.

### 5.2 Poids

| Budget | Plafond | Origine |
|---|---|---|
| Téléphone 390×844 dpr 3, **jusqu'à `load`** (CDP `encodedDataLength`, cache désactivé) | requêtes = référence **+ 1** (`bureau.css`, non bloquante) ; octets ≤ référence + croissance brotli de `styles.css`, `site.js` et `bureau.css` | référence en ligne : 324 790 octets, 12 requêtes (existant.md §2.3) |
| `styles.css`, **toutes familles réunies** | ≤ **+1 000 octets en brotli 11** ; poids brut consigné | P-2 du cahier 020 (§8.3), appliqué à l'ensemble et non par famille (contre-expertise : 4 000 o brotli, soit environ 23 300 o bruts, dépassaient la marge LCP) |
| `bureau.css` | ≤ **6 000 octets en brotli 11** | choix du cahier : c'est le CSS de quatre familles au bureau ; il ne bloque pas le téléphone (§3.0) |
| `site.js`, total des familles | ≤ **+2 710 octets en brotli** | choix du cahier : le poids brotli de `relief.js`, dernier module de bureau accepté (existant.md §2.3) |
| `lestraque/eclate/` | ≤ **75 000 octets** | 60 000 (OB-3, decisions.md:63) + 15 000 pour le relevé (§3.4 B) |
| Images du survol, **à l'approche** de `#prestations`, au bureau à souris | ≤ **+227 478 octets** | 6 × la plus lourde variante 960 AVIF mesurée (37 913 octets, `ref-survol-objet.md` §2) |
| Texture 2880 (bureau avec carte) | une requête du worker, 745 293 octets, ≥ 3 s après l'état prêt ; 0 avec `saveData` | `ls -la` ; §3.5 |
| Vidéo d'atelier (bureau) | AV1 ≤ 350 000 o ; H.264 ≤ 600 000 o ; 0 au téléphone | §4.2 |
| Bureau 1440×900, défilement complet | croissance mesurée et consignée, ≤ référence + la somme des lignes « éclaté », « survol », « texture », « `bureau.css` » et l'AV1 de l'atelier | référence 514 778 octets sans carte graphique (existant.md §2.3) |
| Vidéo de la landing | ≤ 1 500 000 octets | video-qa.mjs, profil landing (`LANDING.POIDS_MAX`) |

### 5.3 CSP, worker, propriétés

- **CSP** : aucune origine nouvelle.
  - Scripts, styles (`bureau.css` compris), images et vidéos en même origine ; les vidéos retombent sur `default-src 'self'` (next.config.mjs:30).
  - Pas de `blob:` pour un média ; pas d'`eval`, de `new Function` ni de WebAssembly.
  - Aucun gestionnaire en attribut (`script-src-attr 'none'`) ; aucun worker nouveau (`worker-src 'self'`).
  - Source : `next.config.mjs`, règle `/((?!site/|p/).*)` (l.98).
  - Les juges servent la page **avec cet en-tête** et échouent sur tout événement `securitypolicyviolation`.
- **Worker WebGL** : un seul worker et une seule toile sur l'accueil au bureau, aucun au téléphone (existant.md §2.4). Budget P-4 du cahier 020 : `dureeP95` ≤ 16,7 ms, 0 tâche longue, p95 des intervalles rAF ≤ 20 ms.
- **Propriétés** : §3.2.

### 5.4 Juges existants à garder verts

| Juge | Commande | Ce qu'il protège |
|---|---|---|
| Site | `node scripts/site-qa.mjs <dossier>` | Lighthouse ×4 ≥ 95, SEO, geste (≥ 12 `.reveal`, ≥ 8 `:hover`, mouvement réduit, aucune transition de mise en page), devis |
| Usage | `node scripts/demo-usage-qa.mjs --url=<url locale> --sortie=<dossier>` | 7 contrôles sur 7, dont console sans erreur (demo-usage-qa.mjs:322-336) |
| Barre retenue | `node scripts/nav-retenue-qa.mjs --dossier=<généré>` (option à ajouter, CC-1) | Un seul appel visible tous les 150 px ; neuf démos gelées |
| Geste au repos | `node scripts/signature-repos-qa.mjs --dossier=<généré>` (option à ajouter) | RL, coins, contraste, rien ailleurs |
| Relief | `node scripts/signature-relief-qa.mjs --dossier=<généré>` (option à ajouter) | synchronisation, calme, projecteur décalé |
| Héros et landing | `landing-demo-qa.mjs`, `credits-landing-qa.mjs` | Texte et crédits de la landing vrais |
| Générateur | ses garde-fous (generer.mjs, `gardeFousScenes`, photos orphelines) | Ordre, fonds, photos, h2, téléphone |

**Neuf démos gelées** : aucun fichier sous `public/sites-demo/{plombier,electricien,chauffagiste,macon,menuisier,peintre,carreleur,couvreur,serrurier}/`
ne change. **Aucun dossier nouveau directement sous `public/sites-demo/`** : les juges comptent tout dossier autre que
`lestraque`, `_kit` et `_polices` comme une démo gelée (nav-retenue-qa.mjs:40-44).

### 5.5 Vidéo de la landing et grille à refaire

- **Vidéo de la landing** (`scripts/demo-video.mjs`, 1280×800 ; `node scripts/video-qa.mjs --profil=landing`), à rejouer une fois tout intégré. Changements écrits par Claude Code (CC-3) :
  - le plan `heros_souris` avec le palier (cahier 020 §7.6) ;
  - un plan des étapes qui traverse les quatre états (C1 à C4) de la scène de 450svh ;
  - un plan de l'atelier **pendant que la vidéo joue** : la famille « vidéo » est visible dans le film de la landing (critère L-1 de `landing-v5-qa.mjs`) ;
  - les crédits sous la vidéo : photo du héros (decisions.md:48) et plan d'atelier.
- **Grille à l'aveugle** :
  - captures en 1088×800 sans carte graphique par `scripts/demo-images-cles.mjs --viewport=1088x800`, vers un dossier de preuve ;
  - la page est plus longue (palier de 270 px, étapes de +150svh) : Claude Code consigne quelles scènes montrent `d30` et `d60` avant de rejouer C2, C6 et C7 ;
  - survol, glissé et profil téléphone n'y apparaissent jamais (4 images fixes, `grille-aveugle.mjs:77`) : le film complet (T-11) les montre à Benj.

---

## 6. Critères d'acceptation mesurables

### 6.0 Méthodes communes (tous les juges, écrits par Claude Code)

- **Génération isolée**. Un juge de famille génère avec
  `node public/sites-demo/generer.mjs lestraque --sortie=<tmp> --familles=<familles déjà fusionnées>,<sa famille>`
  dans un dossier temporaire, et **ne touche jamais** au site.
  - Il lance les juges existants **avec `--dossier=<tmp>`** : `signature-repos-qa`, `signature-relief-qa`, `nav-retenue-qa`. Cette option est à ajouter en CC-1 ; aujourd'hui, ces trois juges régénèrent le site en place (§0.2).
  - Tant que ces options n'existent pas, **aucune tâche de famille n'est mise en file pendant que 021-02 ou 020-03 tournent**.
  - Seules 021-02, 020-03 et 021-11 régénèrent le site.
- **Serveur** :
  - il sert les fichiers du dossier généré, avec les types MIME de nav-retenue-qa.mjs, plus `video/mp4` ;
  - il compresse en **brotli** comme la production (§5.1) ;
  - il envoie l'**en-tête CSP de production** (§5.3) ;
  - l'écoute de `securitypolicyviolation` est injectée avant la navigation.
- **Navigateur** : Chromium de Playwright.
  - **Sans carte graphique** : `chromium.launch()`.
  - **Avec carte** : `--use-gl=angle --enable-webgl --ignore-gpu-blocklist` (cahier 020 §8.0).
  - **Téléphone** : 390×844, `deviceScaleFactor` 3, `isMobile`, `hasTouch`.
  - **Lecture du H.264** : Chrome de marque (`channel: 'chrome'`). S'il n'est pas installé, le critère **échoue** avec ce motif, jamais un PASS silencieux.
- **Positionner la plage `contain` de `#etapes`** : `y = haut(#etapes) + p × (hauteur(#etapes) − innerHeight)`, `scrollTo` instantané, puis attendre 2 rAF.
- **Mesures de base** :
  - **opacité effective** d'un élément : produit des `opacity` calculées de l'élément et de ses parents ;
  - **tâches longues** : `PerformanceObserver({ type: 'longtask', buffered: true })`, seuil 50 ms (cahier 020 D-12) ;
  - **défilement continu** : `page.mouse.wheel(0, 5)` à chaque rAF, témoin ≥ 100 changements de `scrollY` (cahier 020 §8.0) ;
  - **octets** : CDP `Network.loadingFinished.encodedDataLength`, cache désactivé ; les requêtes des workers sont comptées à part ;
  - **contraste** : §0.1, texte opaque ou translucide selon le cas.
- **Référence** : chaque juge mesure aussi la génération `--familles=<familles déjà fusionnées>` (sans sa famille) dans les mêmes conditions ; les critères « inchangé » comparent à elle.
- **Preuves produites par le juge lui-même.**
  - Chaque juge écrit ses mesures en JSON, ses images en JPEG et ses films en MP4 (ffmpeg) dans `.orchestre/preuves/<tâche>/juge/`. Il tourne hors du bac à sable, donc il peut le faire même quand l'exécutant est Codex. C'est le patron « le juge capture lui-même ».
  - Jamais un fichier de 0 octet.
  - Les images du §6.10 viennent de là.
- **Budget d'un juge** : 30 minutes au plus (plafond de l'orchestre, orchestre.mjs:317 et orchestre.json:27). Un juge qui enchaîne Lighthouse et d'autres juges est découpé (§6.9).

### 6.1 Socle

**021-01 : juge `scripts/familles-socle-qa.mjs` (écrit, 20 478 octets).**
- **SO-1** : sans famille, la sortie est identique à celle du générateur de e33aec0, hors attributs `data-relief-*` et `lastmod` ; le site en place ne bouge pas.
- **SO-2** : famille témoin : CSS et JS assemblés à leur place, six crochets, refus du `garde` sans écriture.
- **SO-3** : `--da` invalides refusés, rien d'écrit.
- **SO-4** : `familles: []` ; calme et lumière posés sans valeur ; `data-relief-descente` égal à la valeur de da.json ; **aucune** `data-relief-texture` (familles-socle-qa.mjs:96-103).
- **SO-5** : entrées `rendu` et `video` hors des crédits photo ; attributions de famille fusionnées.
- **SO-6** : `signature-repos-qa.mjs` et `nav-retenue-qa.mjs` PASS.

Ils régénèrent le site en place tant que `--dossier` n'existe pas. C'est admis pour 021-01 seule, parce qu'aucune tâche ne touche le site en même temps (021-04 n'écrit que dans sa preuve).

**Suite du socle (021-20) : juge `scripts/familles-socle-suite-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| SS-1 | Génération sans famille, contre celle du générateur de 021-01 (commit de son PASS, extrait par `git archive`) | identique octet pour octet ; pas de `bureau.css`, pas de lien | §3.0 |
| SS-2 | Famille témoin avec `temoin.bureau.css` | `lestraque/bureau.css` écrit ; sur toutes les pages, `<link rel="stylesheet" href="bureau.css" media="(min-width: 1024px)">` juste après le lien de `styles.css` ; au téléphone (390×844), la requête de `bureau.css` n'a pas la priorité initiale `VeryHigh` (CDP `Network.requestWillBeSent`) ; au bureau, une règle du témoin s'applique (`getComputedStyle`) | web.dev, feuilles à `media` non concordant (§3.0) |
| SS-3 | Famille témoin avec un crochet `credits` qui ajoute une entrée `video` | l'entrée apparaît dans la ligne de crédits des mentions légales, avec un lien vers le texte de la licence ; absente quand la famille est inactive | §3.0 ; CC BY-SA 4.0 §3(a)(1)(C) exige le lien ou le texte de la licence |
| SS-4 | Lighthouse mobile, `lighthouse-mediane.mjs`, génération avec le témoin (un `bureau.css` de 6 000 octets brotli) | médiane ≥ 95, LCP < 2 500 ms | §5.1 |
| SS-5 | `node scripts/familles-socle-qa.mjs` | PASS | 021-01 intacte |

### 6.2 Récit, plateau et atelier (021-03) : juge `scripts/recit-qa.mjs`

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| RC-1 | Génération avec `recit` | acceptée ; ordre des `id` de l'accueil inchangé (`prestations`, `atelier`, `realisations`, `communes`, `etapes`, `questions`, `contact`) | §0.3 point 1 ; generer.mjs:158-163 |
| RC-2 | Nombre de `span.citation__mot` ; texte concaténé | = nombre de mots de `site.json` → `artisan.citation` ; texte identique | §3.1 A |
| RC-3 | Bureau 1440×900 et 1088×800 sans carte : opacité effective de chaque mot quand le haut de la citation est au bas de l'écran, puis à `cover 70 %` | ≤ 0,57 partout au premier instant ; ≥ 0,98 au second ; entre les deux (pas de 2 % de `cover`), mot i ≥ mot i+1 − 0,01 | kit.css:1136 ; kit.css:1091 |
| RC-4 | Contraste des mots de la citation à 0,55 d'opacité, **méthode du texte translucide** (§0.1), boîtes des mots | p10 ≥ 3,0 | WCAG 1.4.3, grands caractères ; mesuré 5,49 (contre-expertise) |
| RC-5 | Chiffres, bureau, défilement continu : instant de départ `t0` relevé comme en RC-6 ; texte de `.chiffre__compte` toutes les 100 ms | à `t0` + 300 ms, au moins une valeur visible ≠ finale ; fin atteinte entre `t0` + 1 100 et `t0` + 1 500 ms ; à `t0` + 2 000 ms, valeurs = `site.json` → `plateau.chiffres` ; `.chiffre__vrai` vaut toujours la valeur finale | ≈ 1,3 s (`ref-recit.md` §1 R5) |
| RC-6 | Défilement continu : instant `t0` du départ (première valeur de `.chiffre__compte` non vide), instant où le dernier mot atteint 0,98, instant où `.chiffres` est visible à 100 % | `t0` ≥ max(fin de la citation, bloc entier visible) + 250 ms | un seul mouvement à la fois (§2) ; 0,3 s au §3.1 B, moins une trame |
| RC-7 | Largeur de `.chiffre__valeur` pendant le comptage | constante à ±0,5 px | site-qa.mjs, `jugerGeste` |
| RC-8 | Verbes : 4 `span.atelier__verbe` ; textes ; opacités comme RC-3 sur la timeline de la phrase | « trace », « débite », « assemble », « ponce » ; 0,55 → 1 | contenu.json:75 |
| RC-9 | Contraste des verbes à 0,55 d'opacité, méthode du texte translucide, boîtes des verbes, à `cover` 20, 38 et 52 % | p10 ≥ 4,5 en 1088×800 ; ≥ 3,0 en 1280×800 et 1440×900 | §3.1 C ; mesuré 5,28 à 5,40 |
| RC-10 | Mouvement réduit (1440×900), téléphone, JavaScript coupé : opacités, valeurs, animations dont le nom commence par `citation-` ou `verbe-`, comptage | mots et verbes à 1 ; bloc `.chiffres` visible ; valeurs finales d'emblée ; 0 animation de la famille ; 0 changement de texte des valeurs pendant 3 s | §3.1 |
| RC-11 | `@keyframes` de `recit*.css` | seulement `opacity`, `transform`, `translate` | §3.2 |
| RC-12 | Défilement continu de `.ouverture` à la fin de `#atelier`, 1440×900, sans carte | 0 tâche longue | cahier 020 D-12 |
| RC-13 | Téléphone : requêtes jusqu'à `load` ; croissance brotli de `styles.css` et `site.js` ; Lighthouse 5 passes | même nombre de requêtes ; `styles.css` dans le plafond commun (§5.2) ; médiane ≥ 95, LCP < 2 500 ms | §5.1, §5.2 |
| RC-14 | **Visiteur arrêté dans la bande d'attente** : 1440×900 à y = 840, 1088×800 à y = 675 (milieux des bandes y = 700 → 980 et y = 540 → 810, `mesure.json`), 3 s sans défiler | opacité effective de `.chiffres` ≤ 0,02 ; aucun « 0 » ni valeur finale visible | §3.1 B |
| RC-15 | Filet : `recit.js` modifié par le juge pour ne jamais voir la citation pleine (script injecté qui fige l'opacité du dernier mot), bloc visible à 100 % | valeurs finales visibles (≥ 0,98) en ≤ 4,5 s | §3.1 B |

### 6.3 Révélation au survol (021-06) : juge `scripts/survol-qa.mjs`

Formats : 1440×900, 1280×800 et 1088×800, souris.

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| SV-1 | `mouse.move` au centre du texte du h3 de la ligne k (k = 1 à 6) ; fraction ouverte du `clip-path` de sa vignette toutes les 25 ms | ≥ 0,90 en ≤ 250 ms | `ref-survol-objet.md` §1.3 et §2 |
| SV-2 | Taille de la vignette ouverte | largeur = min(24vw, 26rem) ± 2 px ; rapport 4/5 ± 1 % | §3.3 |
| SV-3 | Suivi : curseur déplacé de +200 px en x, en 10 pas sur 160 ms, dans le même titre, depuis une abscisse choisie par le juge pour que la cible reste dans les bornes ; bord gauche de la vignette relevé | écart à la cible > 5 px 100 ms après l'arrêt ; ≤ 2 px 1 000 ms après | λ = 5,0 s⁻¹ : reste 61 % à 100 ms, 0,7 % à 1 s (calcul) |
| SV-4 | Balayage des six lignes (haut → bas puis bas → haut, 1,5 s chacun), relevé toutes les 25 ms | intersection de la vignette ouverte avec chaque `.presta__texte` et avec le `.presta__num` de la ligne survolée = 0 px² ; vignette entièrement dans la boîte de `#prestations` | §3.3 ; kit.css:1036-1041 ; débordement mesuré de 90 à 113 px |
| SV-5 | Même balayage, rapide (0,4 s) : `rotate` calculé | \|rotation\| ≤ 4° | `ref-survol-objet.md` §2 |
| SV-6 | Passage de la ligne k à k+1 : fraction ouverte de k et de k+1 | k ≤ 0,05 en ≤ 250 ms ; 300 ms après le passage, une seule vignette ouverte à plus de 0,5 | sortie 0,2 s (§3.2) |
| SV-7 | Clavier, 1440×900 : Tab jusqu'au 1er `button.presta__declencheur`, puis Échap, puis Tab suivant | au focus : vignette ouverte ≥ 0,90 en ≤ 250 ms et immobile (relevés à 300 et 600 ms identiques ±0,5 px), au-dessus de sa ligne ; Échap : fermée ≤ 0,05 en ≤ 250 ms, focus toujours sur le bouton ; nom accessible = texte du h3 | WCAG 1.4.13 |
| SV-8 | Appels à l'action | nombre de `a[href*="#contact"]` dans `#prestations` = référence ; `nav-retenue-qa --dossier` PASS | §0.3 point 2 |
| SV-9 | Réseau : images de `#prestations` avant l'approche, puis section à moins d'un écran (sans souris), puis après balayage | avant l'approche : mêmes URL que la référence ; après l'approche : octets supplémentaires ≤ 227 478 ; le balayage n'ajoute aucune requête | §3.3, §5.2 |
| SV-10 | Mouvement réduit (souris, 1440×900) : position de la vignette pour deux positions du curseur dans la même ligne ; rotation | identique ±0,5 px ; `rotate` nul ; ouverture en opacité en ≤ 200 ms | §3.3 |
| SV-11 | Téléphone 390×844 : DOM de `#prestations` (outerHTML), requêtes | identiques à la référence ; aucun `button.presta__declencheur` | §3.3 |
| SV-12 | Sans JavaScript, 1440×900 : survol d'une ligne | vignette ouverte par le CSS actuel (fraction ≥ 0,90 en ≤ 600 ms) | kit.css:543-549 |
| SV-13 | `site-qa` geste : règles `:hover` ; transitions de mise en page | ≥ 8 ; aucune | site-qa.mjs, `jugerGeste` |
| SV-14 | Écouteurs (`addEventListener` instrumenté avant la navigation) | `pointermove`, `scroll`, `wheel`, `touchmove` en `passive: true` ; aucune boucle rAF active 1 s après la sortie de la souris de la liste | §3.2 |
| SV-15 | **Titre lu jamais caché** : 400 ms après l'entrée du curseur dans une ligne (curseur immobile), part de la surface des boîtes du texte du h3 survolé (`Range.getClientRects`) couverte par la vignette | ≤ 10 % pour les six lignes, aux trois formats | contre-expertise (54 % avant) ; calcul du §3.3 : 4,5 % au pire |
| SV-16 | **Pas d'image floue** au premier survol : juste avant que la fraction ouverte atteigne 0,5, `img.complete` et `naturalWidth` ≥ 691 px pour l'image de la ligne (dpr 2) | vrai pour les six lignes | 345,6 px × dpr 2 (calcul) |

### 6.4 Les étapes

**Rendu (021-04) : juge `scripts/eclate-rendu-qa.mjs`** (écrit, lit la preuve, ne lance pas Blender) :
- **OB-1** : fichiers et `eclate.json`, 4 pièces, 5 étiquettes, cote « 40 mm ».
- **OB-2** : canal alpha des calques ; cadre 1400 × 1050.
- **OB-3** : AVIF ≤ 60 000 octets.
- **OB-4** : composite ≤ 1 % de pixels écartés de plus de 24 niveaux.
- **OB-5** : chaque pièce ≥ 0,2 % du cadre ; vis ≥ 0,4 %.
- **OB-6** : deux lancements, écart < 0,006.
- **OB-7** : rapport ≥ 800 caractères, avec la commande, Blender 5.2, la graine, les médianes L\*a\*b\* et **la qualité AVIF**.
- **OB-8** : site intact (photo du héros identique au dépôt, aucun rendu non suivi sous `public/`).
- **OB-9** : ΔE00 ≤ 10 contre les marches de la photo du héros (`eclate-rendu-qa.mjs:4-14`).

Il accepte `--dossier=` pour être rejoué sur la preuve de 021-22.

**Relevé et recopie (021-22) : juge `scripts/releve-rendu-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| RT-1 | Fichiers de `.orchestre/preuves/021-22/` | `releve.avif` (alpha, 1400 × 1050), `releve.json` (2 cotes aux textes « 40 mm » et « 17 mm », points en fraction dans [0 ; 1]), `planche.jpg`, `rapport.md` ≥ 600 caractères (outil de trait retenu, commande, version de Blender), tous > 0 octet | §3.4 B |
| RT-2 | Poids de `releve.avif` | ≤ 15 000 octets | §3.4 B |
| RT-3 | Alignement : pixels du trait (alpha > 128) contre les arêtes d'`assemble.avif` (filtre de Sobel sur le gris, arêtes dilatées de 3 px) | ≥ 85 % des pixels du trait sur une arête | choix du cahier : le trait est le même objet, vu de la même caméra |
| RT-4 | Couleur du trait | médiane RVB des pixels opaques à ±6 niveaux de `#F4EDE2` | kit.css:468 |
| RT-5 | Fond des rendus retenus | pixel (0, 0) d'`assemble.avif` et d'`eclate.avif` à ≤ 3 niveaux de `#14110E` sur chaque canal ; si 021-22 a relancé le rendu, `eclate-rendu-qa.mjs --dossier=.orchestre/preuves/021-22` PASS | §3.4 B |
| RT-6 | Recopie dans `lestraque/eclate/` | exactement les 6 AVIF, `eclate.json`, `releve.avif`, `releve.json`, `attributions.json` ; sha256 identiques à la preuve ; `attributions.json` en entrées `"type": "rendu"` | §3.4 B |
| RT-7 | Reste du site | aucun autre fichier nouveau ni modifié sous `public/` (liste `git status --porcelain public` contre `avant.txt`, en ignorant `generer.mjs` et les fichiers d'une tâche Codex en cours, listés par le juge depuis `en-cours/*.md`) | §7.0 |

**Grande scène et éclaté (021-05) : juge `scripts/eclate-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| EC-1 | Génération avec `eclate` | acceptée ; `figure.etapes__photo.eclate[role=img]` avec son `aria-label` ; **aucune `picture` `tournage-copeaux` dans `#etapes`** ; `tournage-copeaux` toujours affichée dans `#prestations` | §3.4 C ; generer.mjs, photos orphelines |
| EC-2 | Bureau 1440×900 et 1088×800, sans et avec carte, aux centres C1 = 14,56 ; C2 = 43,75 ; C3 = 66,25 ; C4 = 90,44 % | C1 : assemblée (`assemble.avif` ≥ 0,98, calques ≤ 0,02) ; C2 : assemblée + cote ≥ 0,98 ; C3 : calques ≥ 0,98, décalage de chaque calque = vecteur × taille de la boîte ± 2 px, 5 étiquettes ≥ 0,98 ; C4 : assemblée, étiquettes ≤ 0,02 ; compteur « 01 », « 02 », « 03 », « 04 » | §3.4 C ; ±2 px (`ref-survol-objet.md` §5) |
| EC-3 | Aux mêmes instants, étape pleine de la liste (`etape__num` ≥ 0,98) | son rang = rang de l'état de la scène | règle « Deux chiffres, un écran » |
| EC-4 | Immobilité dans les tenues : décalages et opacités à Ck − 2,5 % et Ck + 2,5 % (k = 1 à 4) | identiques ±0,5 px et ±0,01 | les trous (§3.4 C) |
| EC-5 | Contraste p90 des étiquettes, de la cote et du compteur sur leur fond | ≥ 4,5 | WCAG 1.4.3 |
| EC-6 | Téléphone 390×844, mouvement réduit 1440×900, hauteur 1440×640 : requêtes d'`eclate/` après défilement complet ; boîtes | seule `eclate.avif` demandée ; figure au rapport 4:3 ± 1 % ; 5 pastilles ≥ 24 × 24 px, chiffres ≥ 14 px, sans chevauchement ; légende de 5 lignes ≥ 14 px ; aucun débordement horizontal (`scrollWidth` = `innerWidth`) | §3.4 C ; 390 × 260 px mesuré avant |
| EC-7 | Bureau 1440×900 : requêtes d'`eclate/` à y = 0, 3 s après `load` | 0 | chargement paresseux |
| EC-8 | Défilement continu à travers `#etapes`, 1440×900, avec carte | 0 tâche longue ; p95 des intervalles rAF ≤ 20 ms | cahier 020 P-4 |
| EC-9 | `@keyframes` d'`eclate*.css` | seulement `translate`, `opacity`, `scale` (et `clip-path` pour 021-16) | §3.2 |
| EC-10 | Poids d'`lestraque/eclate/` ; croissance brotli de `styles.css` et de `bureau.css` ; Lighthouse téléphone 5 passes | ≤ 75 000 octets ; dans les plafonds du §5.2 ; médiane ≥ 95, LCP < 2 500 ms | §5.1, §5.2 |
| EC-11 | **Longueur du geste** : défilement entre le premier calque qui quitte sa position (> 0,5 px) et le dernier qui atteint son vecteur ; idem au remontage | ≥ 450 px en 1440×900 et 1088×800 | contre-expertise ; calcul du §3.4 C : 520 et 462 px |
| EC-12 | **Taille de la scène** : aire de la boîte `div.eclate__rendu` rapportée à l'écran, à C3 | ≥ 30 % en 1440×900 ; ≥ 23 % en 1088×800 ; consignée en 1280×800 | §3.4 C (11,72 % et 13,76 % avant) ; choix du cahier calculé sur la mise en page mesurée |
| EC-13 | **Étiquettes lisibles et ancrées**, à C3 | taille de police ≥ 14 px ; boîtes sans chevauchement deux à deux ; point d'ancrage de chaque étiquette sur un pixel opaque (alpha > 128) de sa pièce, dans l'état éclaté | choix du cahier ; références heart-health-dashboard, veyra-electric |
| EC-14 | **Liste lisible** à côté de la scène, à C2 | largeur du texte d'une étape ≥ 420 px en 1440×900, ≥ 310 px en 1088×800 ; chaque paragraphe ≤ 4 lignes | mesuré avant : 503 et 352 px, 2 et 3 lignes (`etapes-mise-en-page.json`) |
| EC-15 | **Titre et bords** | boîte du h2 sans intersection avec `div.eclate__rendu` ; boîte du rendu dans l'écran (x ≥ 0, bas ≤ `innerHeight`) ; couleur du fond de la figure à ≤ 3 niveaux du pixel (0, 0) d'`assemble.avif` | §3.4 C |
| EC-16 | `nav-retenue-qa --dossier`, `signature-repos-qa --dossier` | PASS (la page est plus longue de 150svh) | §5.4 |

**Récit dans la scène (021-16) : juge `scripts/etapes-recit-qa.mjs`** (enchaîne `eclate-qa.mjs` sur la même génération) :

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| ER-1 | Capture de la boîte de la scène aux centres C1 à C4, 1440×900 et 1088×800 sans carte ; écart moyen entre centres consécutifs | ≥ 0,05 pour C1/C2, C2/C3 et C3/C4 | contre-expertise « exigence » : la scène change vraiment à chaque étape |
| ER-2 | À C1 : textes de la fiche | « Votre projet — Escalier », « Commune — Rennes », « Quand — Dans les trois mois », identiques aux libellés et options du formulaire de l'accueil ; fiche ≥ 0,98, relevé et rendu ≤ 0,02 | `lestraque/index.html:41` |
| ER-3 | À C2 : `releve.avif` ≥ 0,98 ; cotes « 40 mm » et « 17 mm » ≥ 0,98 ; fiche ≤ 0,02 | vrai | §3.4 D |
| ER-4 | Texte de la scène à tous les états | aucun prix (aucune correspondance de `/\d[\d\s]*(€|euros?)/i`) | « sans prix » (§3.4 D) |
| ER-5 | À C4 : phrase finale ≥ 0,98, texte exact de Q-C ; aucun `a` ni `button` dans la phrase | vrai ; `nav-retenue-qa --dossier` PASS | §3.4 D |
| ER-6 | Un seul texte en mouvement : dans le fondu 29,125 → 35,875, relevé toutes les 0,5 % de plage des textes de la scène dont l'opacité ou la position change | au plus la fiche (qui sort) ; les cotes restent à 0 jusqu'à 35,875 | §1, §2 |
| ER-7 | Sans JavaScript, téléphone, mouvement réduit | comme EC-6 : éclaté fixe et légende ; fiche et relevé non affichés, 0 requête de `releve.avif` | §3.4 C |

### 6.5 Vidéos

**Rushes (021-10) : juge `scripts/rushes-atelier-qa.mjs`** (écrit) :
- **RU-1** : 6 à 10 plans, avec page, banque, titre, auteur, licence citée, durée, définition, sha256, visages, logos, lieu, outils électriques ;
- **RU-2** : licences de la liste fermée, aucune Mixkit « Restricted » ;
- **RU-3** : une planche de 8 images par plan ;
- **RU-4** : aucune copie hors du dossier de travail ;
- **RU-5** : au moins 3 plans « mains seules ».

**À ajouter en CC-1** :

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| RU-6 | Pour chaque plan : `reencodage` dans `rushes.json` (1280×720, 8 s depuis le début du plan, H.264 et AV1 aux réglages du §4.2) ; le juge ré-encode lui-même un plan tiré au hasard et compare | poids déclarés à ±3 % du poids recalculé ; plus long passage sans coupe (écart consécutif < 0,085, video-qa.mjs:30) consigné en secondes | §4.2 |

**Plan d'atelier encodé et recopié (021-18) : juge `scripts/atelier-plan-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| AP-1 | Plan retenu | l'`id` du plan écrit dans `choix.json`, avec la réponse de Benj ou la règle « sans réponse » (§4.2), recalculée par le juge sur `rushes.json` | §4.2 |
| AP-2 | ffprobe de `lestraque/video/atelier.av1.mp4` et `atelier.h264.mp4` | 1280×720 ; durée de 6,0 à 8,0 s ; aucune piste audio ; H.264 profil High, niveau ≤ 4.0 ; AV1 profil Main ; ≥ 24 images/s | §4.2 |
| AP-3 | Poids | AV1 ≤ 350 000 o ; H.264 ≤ 600 000 o | §4.2 |
| AP-4 | Raccord de boucle : dernière image contre première | écart moyen ≤ 0,03 | §4.2 |
| AP-5 | Lisibilité : sur 8 images de chaque fichier, zone de la phrase de l'atelier (boîtes des mots relevées sur la page en 1088×800, 1280×800 et 1440×900, voile de la page superposé) | contraste du texte opaque p90 ≥ 4,5 en 1088×800, ≥ 3,0 en 1280×800 et 1440×900 | RC-9 ; WCAG 1.4.3 |
| AP-6 | Mains seules : planche de 8 images du fichier encodé | fichier > 0 octet ; `rapport.md` qui répond « visage : non ; logo : non ; lieu reconnaissable : non » ; Claude Code regarde la planche (CC-2) | `ref-video.md` §2.2 |
| AP-7 | Licence et attributions | licence relue sur la page du plan le jour même (copie datée dans la preuve) ; `lestraque/video/attributions.json` avec une entrée `"type": "video"`, auteur, banque, adresse de la page, licence, adresse du texte de la licence ; sha256 des MP4 identiques à la preuve | §4.2 |
| AP-8 | Reste du site | aucun autre fichier nouveau ni modifié sous `public/` (même méthode que RT-7) | §7.0 |

**Vidéo d'atelier dans la page (021-13) : juge `scripts/video-atelier-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| VA-1 | HTML généré avec `video` | aucune `video` dans le HTML de l'accueil ni des pages communes (l'élément est créé par `video.js`) ; ligne de crédits des mentions légales avec l'entrée du plan et un lien vers le texte de sa licence | §4.2 ; SS-3 |
| VA-2 | Bureau 1440×900 : requêtes vidéo à y = 0 pendant 3 s après `load` ; puis `#atelier` à moins d'un écran | 0 d'abord ; ensuite, sources AV1 **en premier**, même origine, aucune URL `blob:` | §4.2 |
| VA-3 | Départ : défilement continu jusqu'à l'atelier ; instants de `playing`, du dernier verbe à 0,98, et part de l'écran couverte par la scène | `playing` après le dernier verbe plein **et** scène ≥ 60 % ; pause (`paused` vrai) en ≤ 500 ms quand la scène couvre < 20 % | §4.2 ; un mouvement à la fois |
| VA-4 | Conditions niées, une à la fois : 390×844 ; 820×1180 ; `reducedMotion: 'reduce'` ; `navigator.connection.saveData = true` ; JavaScript coupé | 0 requête vidéo et 0 `video` dans le DOM pendant 8 s après avoir défilé jusqu'à l'atelier | §4.2 |
| VA-5 | Sans `requestIdleCallback` (`delete window.requestIdleCallback` par script injecté) | la vidéo joue quand même (`playing` en ≤ 5 s à l'atelier) | Safari n'a pas `requestIdleCallback` (caniuse) ; kit.js:217 |
| VA-6 | H.264 seul, lu par Chrome de marque (`channel: 'chrome'`, source AV1 bloquée par `page.route`) | `playing` en ≤ 5 s | Chromium de Playwright sans tous les codecs (playwright.dev/docs/browsers) |
| VA-7 | Bouton pause : clic, puis Entrée au clavier | `paused` vrai en ≤ 250 ms ; `aria-pressed` et nom accessible cohérents ; relance au second appui ; le bouton n'est pas un `a[href*="#contact"]` | WCAG 2.2.2 |
| VA-8 | Échec simulé (404 sur les deux sources) | élément retiré en ≤ 4,5 s ; photo visible, dérive active | §4.2 |
| VA-9 | Lisibilité dans la page : 8 captures pendant la lecture, boîtes des mots de la phrase | comme AP-5 | RC-9 |
| VA-10 | C7 dans la scène pendant la lecture : animations au temps dans `#atelier` hors la vidéo | 0 (dérive en pause) ; `glisse-cadre` et verbes immobiles sans défilement | §2 |
| VA-11 | Téléphone : requêtes jusqu'à `load`, Lighthouse 5 passes | requêtes = référence de la génération sans `video` ; médiane ≥ 95 | §5.1 |
| VA-12 | CSP et console, bureau, jusqu'à 10 s de lecture | 0 violation, 0 erreur | §5.3 |

**Ouverture filmée (021-15, prototype) : juge `scripts/ouverture-film-qa.mjs`** (lit `.orchestre/preuves/021-15/`) :

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| OU-1 | Fichiers | `ouverture-1440x900.h264.mp4`, `ouverture-1088x800.h264.mp4`, leurs AV1, `cote-a-cote.mp4`, `planche.jpg`, `mesures.json`, `tournage.mjs`, `rapport.md` ≥ 800 caractères (licence CC BY-SA 4.0, auteur, lien Commons, sha256 de la source) ; > 0 octet | §4.3 |
| OU-2 | ffprobe | durée de 3,0 à 5,0 s ; définition du nom ; ≥ 29 images/s ; aucune piste audio | §4.3 |
| OU-3 | Dernière image contre une capture de l'accueil faite par le juge au même format, avec carte, animations figées à 0, souris hors de la page | écart moyen < 0,006 | « identiques », video-qa.mjs:27 |
| OU-4 | Mouvement : première image contre dernière | part > 8 ≥ 0,30 (choix du cahier : un geste qui se voit) | §4.3 |
| OU-5 | Paires d'images consécutives | aucun écart > 0,085 | video-qa.mjs:30 |
| OU-6 | `mesures.json` recalculé sur les fichiers | valeurs déclarées = recalculées ± 0,01 ; poids exacts | honnêteté des mesures |
| OU-7 | Site | aucun fichier nouveau ni modifié sous `public/` du fait de 021-15 (méthode RT-7) | §4.3 |

### 6.6 Relief et descente

**Texture 2880 (021-02) : juge `scripts/relief-texture-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| RX-1 | da.json et accueil généré | `relief.texture` = `"images/heros-escalier-2880.avif"` ; `data-relief-texture` posé sur le héros ; `calme` et `lumiereCss` inchangés | §3.5 ; decisions.md:62 |
| RX-2 | Bureau 1440×900, dpr 2, avec carte : requêtes du worker (`page.on('request')` sur le worker) | une requête de la texture 2880, **≥ 3 000 ms** après l'état prêt de la toile ; aucune avant | §3.5 |
| RX-3 | `saveData` vrai (script injecté) | 0 requête de la texture pendant 10 s ; la toile reste active | §3.5 |
| RX-4 | Réponse du fil à « compte », 2 s après la texture | `texture.largeur` = 2880 ; `texture.mipmaps` vrai ; `dureeP95` numérique ≤ 16,7 ms | cahier 020 P-4 |
| RX-5 | Remplacement de la texture : captures de la toile 100 ms avant et 100 ms après, animations CSS figées, souris immobile | écart moyen < 0,01 (choix du cahier : pas de saut visible) | §3.5 |
| RX-6 | Téléphone 390×844 | 0 requête de la texture ; 0 worker | existant.md §2.4 |
| RX-7 | `signature-relief-qa.mjs --dossier` et `signature-repos-qa.mjs --dossier` | PASS | 020-15 intacte |

Sur l'état d'aujourd'hui, RX-1 et RX-4 échouent (pas de clé, pas de champ `texture`) : le juge est vérifié en échec avant la mise en file (CC-1).

**Descente (020-03) : juge `scripts/signature-defile-qa.mjs`.**
- Critères D-1 à D-15, R-4 à y = 0,30 h, R-6, R-8 complet et P-1 à P-4 du cahier 020 (§8.2, §8.3), avec `roulisParDelta` = 0.
- Lancé sur le dossier généré.
- La valeur de référence de D-15 est calculée par le juge sur `descente-d116.mp4` (§3.5).

### 6.7 Profil téléphone (021-17) : juge `scripts/telephone-qa.mjs`

Format : 390×844, dpr 3, `isMobile`, `hasTouch`. Génération `--familles=recit,eclate,telephone` (et les familles déjà fusionnées).

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| TL-1 | Héros : images à 2,5 s et 5,0 s après `load`, voile et titre masqués | part > 8 ≥ 0,40 (choix du cahier : le téléphone n'est pas jugé par la grille ; le bureau fait 0,64 à 0,71, decisions.md:57) | §3.6 |
| TL-2 | Coins : fond magenta injecté derrière `.hero__media`, une image sur trois pendant 10 s | 0 pixel magenta (détecteur du cahier 020 R-4) | §3.6 |
| TL-3 | Contraste p90 de la boîte du h1, voile de la page compris, une image sur cinq pendant 10 s | ≥ 3,0 à chaque image (mesuré avant : 4,68) | cahier 020 R-12 ; `mesure.json` |
| TL-4 | Animations au temps sur le héros | `derive-tel-haut` absente ; au plus le geste RL (rotation et projecteur) | §3.6 |
| TL-5 | 820×1180 et 768×1024 | héros inchangé contre la référence (animations `pousse` seules, part > 8 entre deux captures de la référence et de la génération au même instant < 0,02) | §3.6 ; tablettes mesurées |
| TL-6 | Citation et verbes au défilement | ordre et planchers comme RC-3 et RC-8 ; contrastes comme RC-4 et RC-9 (méthode du texte translucide) | §3.6 |
| TL-7 | Éclaté : figure à `cover` 10 %, puis à `cover` 50 % | d'abord calques à vecteur 0 (±0,5 px) ; ensuite, décalage = vecteur ± 2 px, pastilles ≥ 0,98, sans chevauchement ; requêtes d'`eclate/` : `assemble.avif` et les calques, jamais avant que la figure soit à moins d'un écran | §3.6 |
| TL-8 | Lighthouse mobile, `lighthouse-mediane.mjs`, 5 passes | médiane ≥ 95 ; LCP < 2 500 ms ; CLS < 0,1 | §5.1 |
| TL-9 | Requêtes et octets jusqu'à `load` ; croissance brotli de `styles.css` | requêtes = référence + 1 au plus (`bureau.css`) ; `styles.css` dans le plafond commun | §5.2 |
| TL-10 | Mouvement réduit au téléphone : capture à y = 0 et de l'éclaté | part > 8 < 0,02 contre la référence ; éclaté fixe | cahier 020 R-7 |
| TL-11 | Workers et contextes WebGL (constructeurs instrumentés) | 0 et 0 | existant.md §2.4 |
| TL-12 | Film produit par le juge : `tel-avant-apres.mp4`, toute la page défilée par le même programme, référence à gauche, génération à droite | fichier > 0 octet, ≥ 29 images/s, même durée ± 0,1 s | CC-5 |

### 6.8 Défilement

**Contrôles communs, dans `scripts/vague5-integration-qa.mjs`** :

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| DF-1 | `getComputedStyle(document.documentElement).scrollBehavior`, bureau et téléphone | `auto` | kit.js:246-247 |
| DF-2 | `scrollTo({top: Y, behavior: 'instant'})` pour Y ∈ {1 000 ; 4 000 ; 8 000}, lecture de `scrollY` après 1 rAF puis 500 ms | `scrollY` = Y aux deux lectures | juges et vidéo pilotent la page ainsi (§3.2) |
| DF-3 | Écouteurs `wheel`, `touchmove`, `touchstart`, `scroll` (`addEventListener` instrumenté) | tous `passive: true` ; aucun `preventDefault()` sur `wheel`, sauf Lenis si Q-B oui (alors DF-2 et DF-4 font foi) | §3.2 |
| DF-4 | Clic sur chacun des 4 liens de la barre (Prestations, Réalisations, Communes, Questions), 1440×900 | 2 s après, le h2 de la cible est entier à l'écran et sous la barre | kit.js:249-253 ; les quatre liens sont visibles au bureau (contre-expertise) |
| DF-5 | Valeurs `cubic-bezier(…)` des fichiers `_kit/familles/*.css` | ∈ {(.16,1,.3,1) ; (.2,.7,.2,1) ; (.37,0,.63,1) ; (.45,0,.55,1)} | §3.2 |

**Film et mesures Lenis (021-09) : juge `scripts/lenis-film-qa.mjs`** (écrit) :
- **LN-1 à LN-3** : fichiers, ffprobe et programme de molette identiques ;
- **LN-4, tel qu'écrit** : `package.json` et `package-lock.json` identiques au dépôt, aucun fichier Lenis non suivi sous `public/` ou `scripts/`, aucune trace de Lenis dans `lestraque/index.html` et `site.js` (lenis-film-qa.mjs:12-13, 83-85). L'ancienne formulation, « git status identique », échouait par construction, puisque d'autres tâches écrivent en parallèle.

**À ajouter en CC-1** :

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| LN-5 | `mesures.json`, recalculé par le juge sur la copie de travail, en natif et avec Lenis injecté : DF-2, DF-4, p95 des intervalles rAF et tâches longues pendant le programme de molette | les deux séries présentes ; pour Lenis : DF-2 et DF-4 tenus, p95 ≤ 20 ms, 0 tâche longue. Si l'un échoue, la recommandation à Benj devient « normal », consignée dans `rapport.md` | §3.2 ; cahier 020 P-4 |

**Lenis au bureau (021-19, seulement si Q-B oui) : juge `scripts/lenis-bureau-qa.mjs`**, écrit seulement sur un oui :
- Lenis est chargé seulement au bureau à la souris ;
- 0 octet au téléphone, coupé en mouvement réduit ;
- DF-1 à DF-5 avec Lenis ;
- `demo-usage-qa`, `nav-retenue-qa --dossier` et le relevé de `demo-video.mjs` en PASS.

### 6.9 Transversal

**Intégration (021-11) : juge `scripts/vague5-integration-qa.mjs`, sans Lighthouse.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| T-2 | Téléphone : requêtes et octets **jusqu'à `load`** | requêtes = référence + 1 (`bureau.css`) ; octets dans le §5.2 | §5.2 |
| T-3 | Brotli 11 de `styles.css`, `site.js` et `bureau.css` contre la référence e33aec0 | §5.2 | §5.2 |
| T-4 | CSP et console : accueil en 1440×900 sans et avec carte, en 390×844 ; défilement complet, balayage du survol, lecture de la vidéo d'atelier | 0 violation, 0 erreur, 0 exception | §5.3 ; demo-usage-qa.mjs:322-329 |
| T-5 | `Worker` et contextes WebGL | bureau avec carte : 1 worker, 1 toile ; téléphone : 0 | §5.3 |
| T-6 | Juges de famille et juges existants (§5.4), l'un après l'autre, **sur le site régénéré** (`--dossier`) | tous PASS | §5.4 |
| T-7 | Démos gelées ; dossiers sous `public/sites-demo/` | aucun changement ; aucun dossier nouveau | §5.4 |
| T-8 | **Au temps, par geste** : pour chaque scène du §2, en 1440×900, souris immobile hors de la page, 3 s sans défiler au milieu de la scène : animations `running` de `document.getAnimations()` dont la timeline est `DocumentTimeline`, regroupées par geste | au plus **un geste nouveau par écran** hors de la liste blanche : `signature-tourne-*`, `signature-projecteur`, `pousse`, `derive*`, `glisse-cadre`, animations de la toile du relief synchronisées sur elles, lecture de la vidéo d'atelier | C7 ; contre-expertise : 2 animations au temps hors « poussée » déjà au héros, donc un seuil de 1 animation échouait par construction |
| T-8b | Même relevé en 1088×800 | même seuil | format de la grille |
| T-9 | Bureau 1440×900, défilement complet : octets | §5.2 | §5.2 |
| T-10 | **En défilement continu** (1440×900 sans carte, puis 390×844) : par fenêtre de 150 px, groupes d'éléments dont l'opacité effective ou la position à l'écran change de plus de 0,05 (ou de plus de 2 px) hors du défilement lui-même (position relevée par rapport à l'élément collant ou à la section) | par écran du §2 : au plus **un groupe principal**, plus les secondaires listés dans sa ligne ; dans les étapes, liste et scène comptent pour un seul geste, mais jamais deux textes de la scène à la fois (ER-6) | C7 ; contre-expertise : T-8 seul ne voyait pas les animations liées au défilement |
| T-11 | **Films complets produits par le juge** : `page-bureau.mp4` (1440×900, avec carte, molette réelle du haut au bas de la page, horloge recalée sur des flashs blancs comme `demo-video.mjs`), `page-telephone.mp4` (390×844) ; `integration-planche.jpg` (`bureau-t06/t25/t50/t80/d30/d60/d100` en 1088×800 sans carte) | fichiers > 0 octet ; aucune image blanche (écart-type du gris ≥ 8 sur chaque image de la planche) | CC-4 ; « le juge capture lui-même » |
| T-12 | Hauteur de la page en 1440×900 et 1088×800 | consignée (attendue : environ 12 349 px en 1440×900, §2) | §2 |

**Lighthouse avant et après (021-21) : juge `scripts/lighthouse-vague5-qa.mjs`.**

| Id | Mesure | Seuil | Origine |
|---|---|---|---|
| T-1 | `lighthouse-mediane.mjs`, 5 passes sur e33aec0 (extrait par `git archive` dans `.orchestre/travail/021-21/avant/`) puis 5 passes sur le site régénéré, même serveur brotli | barre du §5.1 sur la série « après » ; les deux séries et leur écart consignés dans `resume-avant.json` et `resume-apres.json` | §5.1 |

**Landing (021-12) : juge `scripts/landing-v5-qa.mjs`.**
- Enchaîne `video-qa.mjs public/promo/demo-site/lestraque.mp4 --profil=landing`, `credits-landing-qa.mjs` et `landing-demo-qa.mjs`.
- **L-1** : au moins une image du film montre la vidéo d'atelier en lecture. Le juge compare une zone de `#atelier` à la photo d'atelier : écart moyen ≥ 0,05 sur au moins 1 s du plan de l'atelier.
- **L-2** : les crédits sous la vidéo nomment la photo du héros et le plan d'atelier.

### 6.10 Contrôle à l'œil (Claude Code, puis Benj)

Toutes ces images et tous ces films sont **produits par le juge** de la tâche, dans `.orchestre/preuves/<tâche>/juge/` (§6.0),
et regardés par Claude Code avant la tâche suivante qui en dépend (CC-2). Films non versionnés (`.gitignore:92`).

| Nom | Juge (tâche) | Instant | Écran | Ce qu'on doit voir |
|---|---|---|---|---|
| `citation-cover10`, `-cover35`, `-cover70` | recit-qa (021-03) | citation à `cover` 10, 35, 70 % | 1440×900 et 1088×800 | les mots s'allument dans l'ordre de lecture ; les mots pâles restent lisibles |
| `chiffres-film.mp4` (4 s) | recit-qa (021-03) | bande d'attente puis départ | 1440×900 | aucun nombre pendant l'attente ; le bloc entre et compte après la citation, décélère, finit sur 10 / 180 / 8 |
| `verbes-film.mp4` | recit-qa (021-03) | traversée de l'atelier | 1440×900 | les quatre verbes s'allument avant le milieu de l'écran |
| `survol-film.mp4` (6 s) | survol-qa (021-06) | balayage lent puis rapide des six lignes | 1440×900 et 1088×800 | l'aperçu glisse au-dessus des lignes avec du poids, ne cache jamais le titre lu ni un texte, change par un volet franc ; comparer à `reveal-hero-planche.jpg` et à `presta-survol-1440.png` |
| `survol-clavier` | survol-qa (021-06) | focus sur la ligne 3 | 1440×900 | aperçu au-dessus de la ligne, anneau de focus visible |
| `planche.jpg` du relevé | releve-rendu-qa (021-22) | — | 1400×1050 | trait propre, cotes justes, posé sur le rendu |
| `eclate-c1`, `-c2`, `-c3`, `-c4` | eclate-qa (021-05) | centres des paliers | 1440×900 et 1088×800 sans carte | grande scène ; assemblée ; cote ; éclatée et nommée, bois chaud ; remontée |
| `eclate-film.mp4` (12 s) | eclate-qa (021-05) | traversée de `#etapes` | 1440×900 | l'escalier s'ouvre pièce par pièce sur un long défilement, se tient, se remonte ; la liste reste lisible à droite |
| `eclate-tel` | eclate-qa (021-05) | étapes à l'écran | 390×844 | éclaté 4:3, pastilles et légende lisibles, rien ne déborde |
| `etapes-recit-film.mp4` (16 s) | etapes-recit-qa (021-16) | traversée de `#etapes` | 1440×900 | la demande, le relevé, le devis, la pose : un seul changement à la fois ; la phrase finale |
| `atelier-planche.jpg` et `atelier-film.mp4` | atelier-plan-qa (021-18), video-atelier-qa (021-13) | boucle entière ; arrivée à l'atelier | 1440×900 | mains seules, geste lisible, phrase lisible, boucle sans saut, bouton pause discret |
| `ouverture` et `cote-a-cote.mp4` | ouverture-film-qa (021-15) | chargement | 1440×900 | ce que Benj compare pour Q-A2 |
| `cote-a-cote.mp4` | lenis-film-qa (021-09) | même molette | 1440×900 ×2 | ce que Benj compare pour Q-B, avec les mesures de LN-5 |
| `planche-<n>.jpg` | rushes-atelier-qa (021-10) | 8 images par plan | — | ce que Benj voit pour Q-A |
| `tel-avant-apres.mp4` | telephone-qa (021-17) | toute la page | 390×844 | ce que Benj voit pour Q4 |
| `page-bureau.mp4`, `page-telephone.mp4`, `integration-planche.jpg` | vague5-integration-qa (021-11) | toute la page | 1440×900, 390×844, 1088×800 | l'ensemble, vu d'une traite : pas d'écran surchargé (CC-4) ; aucune image blanche |

---

## 7. Découpage en tâches

### 7.0 Règles communes à toutes les tâches

- **Gabarit** : `presti/.orchestre/gabarit-tache.md`. Une tâche = `.orchestre/file/<id>.md`, écrit par Claude Code à partir de
  la fiche ci-dessous, avec la partie du §3 correspondante recopiée dans son contexte : l'exécutant ne lit que sa tâche et `contexte.md`.
- **Codex** écrit sans lancer de sous-processus ; son vérificateur est lancé hors de son bac à sable juste après
  (decisions.md:45 ; executant.mjs:104-120).
- **Antigravity** lance le navigateur, ffmpeg, Blender et Node. **Toute recopie de fichier binaire dans `public/`**
  (AVIF, MP4) est faite par une tâche Antigravity (021-22, 021-18), jamais par Codex : son écriture binaire n'est pas vérifiée.
- **Juges** : tous écrits par Claude Code dans `scripts/` avant la mise en file de la tâche, et vérifiés en échec sur l'état
  d'avant (CC-1). Un exécutant n'écrit jamais dans `scripts/**`.
- **SORTIES**, les fichiers que la régénération du site réécrit :
  - `public/sites-demo/lestraque/{index.html,styles.css,bureau.css,site.js,relief.js,relief-fil.js,sitemap.xml,robots.txt,favicon.svg}` ;
  - `lestraque/fonts/**`, `lestraque/menuisier-*/**`, `lestraque/mentions-legales/**`, `lestraque/confidentialite/**`.

  Seules 021-02, 020-03 et 021-11 les ont dans leur périmètre.
- **Interdit à toutes** (en plus du leur) :
  - `app/**`, `lib/**`, `supabase/**`, `public/promo/**` (sauf 021-12) ;
  - les neuf démos gelées (§5.4) ;
  - `.orchestre/decisions.md`, `.orchestre/verdicts.jsonl`, `.orchestre/preuves/020-01/**`, `.orchestre/preuves/021-00/**` ;
  - tout dossier nouveau directement sous `public/sites-demo/` ;
  - toute commande git qui change l'état.
- **Familles actives** :
  - le socle pose `"familles": []` et les juges de famille passent `--familles=` explicitement ;
  - seule 021-11 écrit la liste finale : `["recit", "survol", "eclate", "video", "telephone"]`, dans cet ordre, car `telephone` complète `recit` et `eclate`.
- **Attributions d'une famille** : dans `lestraque/<nom>/attributions.json`, écrit par la tâche Antigravity qui recopie ses fichiers.
- **Budget** : 30 minutes au plus par tâche (orchestre.mjs:317, `maxMinutes` 30). Le vérificateur hors bac à sable est coupé à 45 min (executant.mjs:116).
- **Parallélisme** :
  - aucune tâche de famille n'est en file pendant 021-02 ou 020-03 tant que `--dossier` n'existe pas dans les trois juges du §5.4 (§6.0) ;
  - les juges qui lancent Lighthouse attendent le verrou de site-qa.mjs:615-629 : ils s'enchaînent d'eux-mêmes.

### 7.1 Vue d'ensemble et parallélisme

| Id | Exécutant | Objectif court | Dépend de | Tourne en parallèle avec |
|---|---|---|---|---|
| **021-01** | codex | Socle : familles, crochets, `--sortie`, attributs du relief (**en cours**) | — | 021-04, 021-09, 021-10, 021-15 |
| **021-04** | antigravity | Rendu Blender du tronçon de trois marches (**en cours**) | — | 021-01, 021-09, 021-10, 021-15 |
| 021-09 | antigravity | Films natif / Lenis et mesures avec Lenis | CC-1 (LN-5) | toutes |
| 021-10 | antigravity | Rushes d'atelier visionnés et ré-encodés | CC-1 (RU-6) | toutes |
| 021-15 | antigravity | Ouverture filmée au bureau (prototype) | CC-1 | toutes |
| 021-20 | codex | Suite du socle : `bureau.css`, crochet `credits` | 021-01 PASS | 021-02, 021-22, tâches Antigravity |
| 021-02 | codex | Texture 2880 du relief (**régénère**) | 021-01 PASS | 021-20, 021-22, tâches Antigravity |
| 021-22 | antigravity | Relevé au trait, fond des rendus, recopie dans `lestraque/eclate/` | 021-04 PASS et regardé | 021-20, 021-02, 021-03, 021-06 |
| 021-03 | codex | Récit : citation, chiffres (état d'attente), verbes | 021-20 PASS ; `--dossier` (CC-1) | 021-05, 021-06, 021-13, 021-16, 020-03 |
| 021-06 | codex | Révélation au survol | 021-20 PASS ; `--dossier` | 021-03, 021-05, 021-13, 021-16, 021-17, 020-03 |
| 021-05 | codex | Grande scène des étapes, éclaté pièce par pièce, compteur | 021-20 PASS ; 021-22 PASS et regardé | 021-03, 021-06, 021-13, 020-03 |
| 021-16 | codex | Récit dans la scène : demande, relevé, devis, pose | 021-05 PASS et regardé | 021-03, 021-06, 021-13, 021-17, 020-03 |
| 021-17 | codex | Profil téléphone (famille `telephone`) | 021-03 et 021-05 PASS ; Q4 (sans réponse : oui) | 021-06, 021-13, 021-16, 020-03 |
| 021-18 | antigravity | Plan d'atelier encodé, vérifié et recopié | 021-10 PASS et regardé ; Q-A (ou règle « sans réponse ») | toutes |
| 021-13 | codex | Vidéo d'atelier dans la page (famille `video`) | 021-20 PASS ; 021-03 PASS ; 021-18 PASS et regardé | 021-05, 021-06, 021-16, 021-17, 020-03 |
| 020-03 | codex | Descente (**régénère**) | 021-02 PASS et regardé | familles, si `--dossier` existe |
| (021-19) | codex | Lenis au bureau à la souris, **seulement si Q-B oui** | 021-09 regardé par Benj | familles |
| 021-11 | antigravity | Intégration : liste des familles, régénération, juges fonctionnels, films complets (**régénère**) | toutes les précédentes PASS et regardées ; CC-5 fait | — |
| 021-21 | antigravity | Lighthouse mobile avant et après | 021-11 PASS | — |
| 021-12 | antigravity | Vidéo de la landing et images de la grille | 021-21 PASS ; CC-3 | — |
| ~~021-07~~, ~~021-08~~ | — | **Retirées** : MP4 du geste au téléphone (§4.1) | — | — |

**Chemin critique** :
- **Chemin principal** : 021-04 → 021-22 → 021-05 → 021-16 → 021-11 → 021-21 → 021-12.
- **Branches qui le rejoignent en 021-05** : 021-01 → 021-20.
- **Branches qui le rejoignent en 021-11** :
  - 021-01 → 021-02 → 020-03 ;
  - 021-10 → 021-18 → 021-13 ;
  - 021-03 et 021-05 → 021-17.
- **Au plus fort** : quatre tâches Codex en même temps (021-03, 021-06, 021-05 ou 021-16, 021-13 ou 021-17), et trois à quatre tâches Antigravity au départ. Les quotas d'Antigravity se sont déjà épuisés (`preuves/agents-flash-quota-epuise-1818.jsonl`) : elles peuvent devoir s'étaler.

### 7.2 Fiches des tâches

#### 021-01 — le socle des familles (en cours)

La fiche `en-cours/021-01.md` fait foi.
- **Exécutant** : codex.
- **Périmètre** : `generer.mjs`, `_kit/da.json`, `_kit/familles/LISEZMOI.md`, `.orchestre/preuves/021-01/**`.
- **Vérificateur** : `node scripts/familles-socle-qa.mjs` (SO-1 à SO-6).
- **Budget** : 4 fichiers, 30 minutes.

#### 021-04 — le rendu de l'escalier éclaté (en cours)

La fiche `en-cours/021-04.md` fait foi.
- **Exécutant** : antigravity.
- **Périmètre** : `.orchestre/preuves/021-04/**`.
- **Vérificateur** : `node scripts/eclate-rendu-qa.mjs` (OB-1 à OB-9).
- **Budget** : la fiche annonce 40 minutes, mais l'orchestre plafonne à 30 (orchestre.mjs:317).

#### 021-20 — la suite du socle

- **Exécutant** : codex.
- **Objectif** : le générateur écrit une feuille `bureau.css`, liée avec `media="(min-width: 1024px)"`, et offre un crochet `credits` pour les crédits non photo ; rien ne change sans famille.
- **À faire** : §3.0, tableau « 021-20 ». Compléter `LISEZMOI.md` **sans dépasser 60 lignes** (SO-2 le vérifie).
- **Périmètre** : `public/sites-demo/generer.mjs`, `public/sites-demo/_kit/familles/LISEZMOI.md`, `.orchestre/preuves/021-20/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**`. Ne pas régénérer le site en place.
- **Vérificateur** : `node scripts/familles-socle-suite-qa.mjs` (SS-1 à SS-5).
- **Dépend** de 021-01 PASS. **Budget** : 2 fichiers, 30 minutes.

#### 021-02 — la texture 2880 du relief

- **Exécutant** : codex. **Régénère.**
- **Objectif** : avec WebGL, le relief charge la photo en 2880 avec mipmaps, au moins 3 s après être prêt, jamais en économie de données, et rend compte de sa texture et de sa durée p95.
- **À faire** : §3.5, ligne 021-02 ; cahier 020 §7.4 et §7.5, parties « texture » seulement.
- **Périmètre** : `public/sites-demo/_kit/relief.js`, `_kit/relief-fil.js`, `_kit/da.json` (clé `relief.texture` seulement), SORTIES, `.orchestre/preuves/021-02/**`.
- **Interdit** : `generer.mjs`, `_kit/kit.css`, `_kit/kit.js`, `_kit/familles/**`, `scripts/**` ; toute règle de descente ; `calme` et `lumiereCss`.
- **Vérificateur** : `node scripts/relief-texture-qa.mjs` (RX-1 à RX-7).
- **Dépend** de 021-01 PASS. **Budget** : 3 fichiers, 30 minutes.

#### 021-03 — le récit du plateau et de l'atelier

- **Exécutant** : codex.
- **Objectif** : la citation s'allume mot à mot au défilement ; les chiffres restent invisibles jusqu'à ce qu'elle soit pleine, puis entrent et se comptent une fois ; les quatre verbes s'allument ; rien au téléphone ni en mouvement réduit.
- **À faire** : §3.1 A, B, C ; §3.2 (courbes, propriétés, écouteurs).
- **Périmètre** : `public/sites-demo/_kit/familles/recit.mjs`, `recit.bureau.css`, `recit.js`, `.orchestre/preuves/021-03/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**`.
- **Vérificateur** : `node scripts/recit-qa.mjs` (RC-1 à RC-15).
- **Dépend** de 021-20 PASS et des options `--dossier` (CC-1). **Budget** : 3 fichiers, 30 minutes.

#### 021-06 — la révélation au survol

- **Exécutant** : codex.
- **Objectif** : au bureau à la souris, une grande photo apparaît au-dessus de la ligne survolée, la suit à l'horizontale avec du poids et change par un volet ; elle ne cache jamais le titre lu, un texte ou un numéro, et ne sort pas de la section ; au clavier, un bouton par ligne ; rien de neuf au téléphone.
- **À faire** : §3.3 ; §3.2.
- **Périmètre** : `public/sites-demo/_kit/familles/survol.bureau.css`, `survol.js`, `.orchestre/preuves/021-06/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**` ; tout lien `a[href*="#contact"]` ajouté.
- **Vérificateur** : `node scripts/survol-qa.mjs` (SV-1 à SV-16).
- **Dépend** de 021-20 PASS et des options `--dossier`. **Budget** : 2 fichiers, 30 minutes.

#### 021-22 — le relevé au trait et la recopie de l'éclaté

- **Exécutant** : antigravity (Blender en ligne de commande, sharp).
- **Objectif** : le tronçon d'escalier dessiné au trait, avec ses deux cotes, aligné sur le rendu ; les rendus sur le fond exact de la section ; le tout recopié dans le site, identique à la preuve.
- **À faire** : §3.4 B. Recopier dans la preuve le script de `021-04` et les rendus retenus. Si le fond s'écarte de `#14110E`, relancer le rendu complet. Écrire `rapport.md` et `planche.jpg`, puis recopier en dernier.
- **Périmètre** : `.orchestre/preuves/021-22/**`, `public/sites-demo/lestraque/eclate/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**` ; `.orchestre/preuves/021-04/**` (lecture seule).
- **Vérificateur** : `node scripts/releve-rendu-qa.mjs` (RT-1 à RT-7).
- **Dépend** de 021-04 PASS et regardé. **Budget** : 20 fichiers, 30 minutes.

#### 021-05 — la grande scène des étapes

- **Exécutant** : codex.
- **Objectif** : dans les étapes épinglées, l'escalier en chêne occupe une grande scène à gauche, s'ouvre pièce par pièce sur un long défilement, se nomme, puis se remonte, en suivant la liste, avec un compteur « 01 / 04 » ; au téléphone, un éclaté fixe au format 4:3, avec pastilles et légende.
- **À faire** : §3.4 C.
- **Périmètre** : `public/sites-demo/_kit/familles/eclate.mjs`, `eclate.bureau.css`, `eclate.css`, `.orchestre/preuves/021-05/**`.
- **Interdit** : tout le reste de `public/**`, y compris `lestraque/eclate/**` (recopié par 021-22) ; `scripts/**`.
- **Vérificateur** : `node scripts/eclate-qa.mjs` (EC-1 à EC-16).
- **Dépend** de 021-20 PASS et de 021-22 PASS et regardé. **Budget** : 3 fichiers, 30 minutes.

#### 021-16 — le récit dans la scène

- **Exécutant** : codex.
- **Objectif** : la scène des étapes raconte la demande (fiche), le relevé (trait coté), le devis (éclaté numéroté, sans prix) et la pose (phrase finale sans lien), un état par étape, un seul changement à la fois.
- **À faire** : §3.4 D.
- **Périmètre** : les trois fichiers `eclate.*` de 021-05, `.orchestre/preuves/021-16/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**`.
- **Vérificateur** : `node scripts/etapes-recit-qa.mjs` (ER-1 à ER-7, puis EC-1 à EC-16).
- **Dépend** de 021-05 PASS et regardé. **Budget** : 3 fichiers, 30 minutes.

#### 021-17 — le profil téléphone

- **Exécutant** : codex.
- **Objectif** : au téléphone, la cage de l'escalier tourne en CSS à la place de la dérive ; la citation et les verbes s'allument au défilement ; l'éclaté s'ouvre en entrant à l'écran ; rien à télécharger de plus ; médiane Lighthouse ≥ 95.
- **À faire** : §3.6.
- **Périmètre** : `public/sites-demo/_kit/familles/telephone.css`, `.orchestre/preuves/021-17/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**`.
- **Vérificateur** : `node scripts/telephone-qa.mjs` (TL-1 à TL-12).
- **Dépend** de 021-03 et 021-05 PASS, et de Q4 (sans réponse : oui). **Budget** : 1 fichier, 30 minutes.

#### 021-18 — le plan d'atelier

- **Exécutant** : antigravity (ffmpeg, Playwright, sharp).
- **Objectif** : le plan « mains seules » choisi par Benj, ou retenu par la règle du §4.2, encodé en boucle de 6 à 8 s en AV1 et H.264 sous les plafonds, lisible sous la phrase de l'atelier, crédité et recopié dans le site.
- **À faire** : §4.2 « Paramètres » ; `choix.json` ; licence relue sur la page le jour même ; recadrage si AP-5 échoue ; `planche.jpg`, `rapport.md` ; recopie en dernier dans `lestraque/video/` avec `attributions.json`.
- **Périmètre** : `.orchestre/preuves/021-18/**`, `.orchestre/travail/rushes-atelier/**` (lecture), `public/sites-demo/lestraque/video/**`.
- **Interdit** : tout le reste de `public/**` ; `scripts/**` ; tout plan dont la licence n'est pas lisible sur sa page.
- **Vérificateur** : `node scripts/atelier-plan-qa.mjs` (AP-1 à AP-8).
- **Dépend** de 021-10 PASS et regardé, et de Q-A. **Budget** : 10 fichiers, 30 minutes.

#### 021-13 — la vidéo d'atelier dans la page

- **Exécutant** : codex.
- **Objectif** : au bureau, à l'approche de l'atelier, la vidéo se charge ; elle joue en boucle quand la scène est à l'écran et que les verbes sont pleins, avec un bouton pause ; elle est créditée dans les mentions légales ; rien au téléphone, en mouvement réduit, en économie de données ni sans JavaScript.
- **À faire** : §4.2.
- **Périmètre** : `public/sites-demo/_kit/familles/video.mjs`, `video.bureau.css`, `video.js`, `.orchestre/preuves/021-13/**`.
- **Interdit** : tout le reste de `public/**` (y compris `lestraque/video/**`, recopié par 021-18) ; `scripts/**`.
- **Vérificateur** : `node scripts/video-atelier-qa.mjs` (VA-1 à VA-12).
- **Dépend** de 021-20, 021-03 et 021-18 PASS (plan regardé). **Budget** : 3 fichiers, 30 minutes.

#### 021-09 — le glissé mesuré et filmé

- **Exécutant** : antigravity.
- **Objectif** : deux films identiques de la démo en 1440×900, défilée par le même programme de molette, l'un natif, l'autre avec Lenis injecté, leur montage côte à côte, et les mesures qui disent si Lenis tient les ancres et les défilements programmés.
- **À faire** :
  - **Copie** : copie locale de la démo générée dans `.orchestre/travail/021-09/`.
  - **Lenis** : `lenis.min.js` 1.3.26 depuis `npm pack lenis@1.3.26` dans le dossier de travail, injecté par `page.addInitScript` avec `lerp: 0.1`, `smoothWheel: true`, `syncTouch: false`.
  - **Molette et horloge** : molette réelle selon un programme fixe ; horloge recalée sur des flashs blancs comme `demo-video.mjs`.
  - **Films** : 12 s par film ; `cote-a-cote.mp4` par `hstack`.
  - **Mesures** : DF-2, DF-4, p95 rAF et tâches longues dans les deux cas (LN-5) ; recommandation dans `rapport.md`.
- **Périmètre** : `.orchestre/preuves/021-09/**`, `.orchestre/travail/021-09/**`.
- **Interdit** : `public/**`, `scripts/**`, `package.json`, `package-lock.json`, `node_modules/**`.
- **Vérificateur** : `node scripts/lenis-film-qa.mjs` (LN-1 à LN-5).
- **Dépend** de CC-1. **Budget** : 10 fichiers, 30 minutes.

#### 021-10 — les rushes d'atelier

- **Exécutant** : antigravity.
- **Objectif** : 6 à 10 plans libres de droits où des mains travaillent le bois, dont au moins 3 « mains seules » ; chacun regardé, décrit, vérifié à la source et ré-encodé pour connaître son poids.
- **À faire** :
  - **Sources** : pistes de `ref-video.md` §2.1 ; aucun compte, aucun paiement, aucun formulaire.
  - **Téléchargement et licence** : la plus petite définition ≥ 1 280 px de large ; licence relevée sur la page du plan le jour même.
  - **Préparation** : planche de 8 images ; ré-encodage 1280×720 sur 8 s aux réglages du §4.2 ; `rushes.json`.
- **Périmètre** : `.orchestre/preuves/021-10/**`, `.orchestre/travail/rushes-atelier/**`.
- **Interdit** : `public/**`, `scripts/**`.
- **Vérificateur** : `node scripts/rushes-atelier-qa.mjs` (RU-1 à RU-6).
- **Dépend** de CC-1. **Budget** : 25 fichiers, 30 minutes.

#### 021-15 — l'ouverture filmée (prototype)

- **Exécutant** : antigravity.
- **Objectif** : un plan de 3 à 5 s, filmé avec la carte graphique, où le regard remonte du puits jusqu'à la photo exacte du héros au repos, en 1440×900 et 1088×800, et le côte à côte avec le chargement actuel, pour que Benj décide.
- **À faire** : §4.3.
- **Périmètre** : `.orchestre/preuves/021-15/**`, `.orchestre/travail/021-15/**`.
- **Interdit** : `public/**`, `scripts/**`.
- **Vérificateur** : `node scripts/ouverture-film-qa.mjs` (OU-1 à OU-7).
- **Dépend** de CC-1. **Budget** : 12 fichiers, 30 minutes.

#### 020-03 — la descente

- **Exécutant** : codex. **Régénère.**
- **Objectif, à faire, critères** : cahier 020 §11 « Tâche 020-03 », avec ces changements :
  - `generer.mjs` et `da.json` sortent du périmètre, puisque 021-01 a posé `data-relief-descente` ;
  - `roulisParDelta` = 0 (decisions.md:61).
- **Périmètre** : `public/sites-demo/_kit/kit.css` (bloc 2 du cahier 020 §7.3), `_kit/relief.js`, `_kit/relief-fil.js`, SORTIES, `.orchestre/preuves/020-03/**`.
- **Interdit** : `generer.mjs`, `_kit/da.json`, `_kit/kit.js`, `_kit/familles/**`, `scripts/**` ; toute modification du geste au repos.
- **Vérificateur** : `node scripts/signature-defile-qa.mjs`.
- **Dépend** de 021-02 PASS et regardé. **Budget** : 3 fichiers, 30 minutes.

#### (021-19) — Lenis au bureau : conditionnelle

Elle n'est écrite que si Benj répond oui à Q-B et que LN-5 passe. Contour :
- **Fichiers** : famille `glisse`, `lestraque/lenis/lenis.min.js` recopié par Antigravity avec son en-tête MIT.
- **Chargement** : seulement au bureau à la souris, jamais en mouvement réduit ; 0 octet au téléphone.
- **Dépendance** : nommée dans la tâche (decisions.md:12).
- **Vérificateur** : `lenis-bureau-qa.mjs`.

#### 021-11 — intégration

- **Exécutant** : antigravity. **Régénère.**
- **Objectif** : les cinq familles actives dans le site, tous les juges verts l'un après l'autre sur le site régénéré, et les films complets de la page au bureau et au téléphone.
- **À faire** : écrire `"familles": ["recit", "survol", "eclate", "video", "telephone"]` dans da.json ; régénérer ; lancer `node scripts/vague5-integration-qa.mjs`.
- **Périmètre** : `public/sites-demo/_kit/da.json` (clé `familles` seulement), SORTIES, `.orchestre/preuves/021-11/**`.
- **Interdit** : tout autre fichier de `public/**` ; `scripts/**`. Un juge rouge ne se corrige pas ici : la tâche s'arrête et écrit quel juge et quelle mesure.
- **Vérificateur** : `node scripts/vague5-integration-qa.mjs` (T-2 à T-12, DF-1 à DF-5, juges de famille).
- **Dépend** de toutes les tâches précédentes PASS et regardées, et de CC-5. **Budget** : 3 fichiers, 30 minutes.

#### 021-21 — Lighthouse avant et après

- **Exécutant** : antigravity.
- **Objectif** : deux séries de 5 passes Lighthouse mobile, servies en brotli, sur e33aec0 et sur le site intégré ; la barre de 95 tenue.
- **À faire** : `git archive e33aec0 public/sites-demo` (lecture seule) extrait dans `.orchestre/travail/021-21/avant/` ; `node scripts/lighthouse-vague5-qa.mjs`.
- **Périmètre** : `.orchestre/preuves/021-21/**`, `.orchestre/travail/021-21/**`.
- **Interdit** : `public/**`, `scripts/**`.
- **Vérificateur** : `node scripts/lighthouse-vague5-qa.mjs` (T-1).
- **Dépend** de 021-11 PASS. **Budget** : 15 fichiers, 30 minutes.

#### 021-12 — la vidéo de la landing et les images de la grille

- **Exécutant** : antigravity.
- **Objectif** : la vidéo de la landing refilmée sur la démo de la vague 5, sous 1,5 Mo, sans plan figé, avec l'atelier en lecture et les crédits ; les images de la grille en 1088×800.
- **À faire** :
  - `node scripts/demo-video.mjs` (adapté en CC-3) vers un dossier d'essai ;
  - si `landing-v5-qa` passe sur l'essai, remplacer `public/promo/demo-site/lestraque.mp4` et `lestraque-affiche.webp` ;
  - `node scripts/demo-images-cles.mjs <site> .orchestre/preuves/021-12/grille --viewport=1088x800`.
- **Périmètre** : `public/promo/demo-site/lestraque.mp4`, `public/promo/demo-site/lestraque-affiche.webp`, `.orchestre/preuves/021-12/**`.
- **Interdit** : `public/sites-demo/**`, `app/**`, `scripts/**`.
- **Vérificateur** : `node scripts/landing-v5-qa.mjs`.
- **Dépend** de 021-21 PASS et de CC-3. **Budget** : 4 fichiers, 30 minutes.

### 7.3 Ce que fait Claude Code (hors file)

| Étape | Quand | Contenu |
|---|---|---|
| CC-0 | **fait** | Captures blanches écartées, extension de licence et roulis consignés, images et films de `021-*` hors git (decisions.md:59-61 ; .gitignore:91-94) |
| CC-0 bis | maintenant | Corriger decisions.md:62 et `fait/020-15.md:27` (la texture 2880 existe) ; consigner le retrait de 021-07 et 021-08 (§4.1), la grande scène des étapes et la vidéo d'atelier par défaut ; archiver `travail/021-07-en-attente.md` ; ne pas verser `video-heros-clip-qa.mjs` |
| CC-1 | avant chaque mise en file | **Juges à écrire** : `lighthouse-mediane.mjs`, `familles-socle-suite-qa.mjs`, `relief-texture-qa.mjs`, `signature-defile-qa.mjs`, `recit-qa.mjs`, `survol-qa.mjs`, `releve-rendu-qa.mjs`, `eclate-qa.mjs`, `etapes-recit-qa.mjs`, `telephone-qa.mjs`, `atelier-plan-qa.mjs`, `video-atelier-qa.mjs`, `ouverture-film-qa.mjs`, `vague5-integration-qa.mjs`, `lighthouse-vague5-qa.mjs`, `landing-v5-qa.mjs` ; `lenis-bureau-qa.mjs` seulement si Q-B oui. **Juges à étendre** : `rushes-atelier-qa.mjs` (RU-6), `lenis-film-qa.mjs` (LN-5). **Option `--dossier=<généré>`**, sans régénération, à ajouter à `signature-repos-qa.mjs`, `signature-relief-qa.mjs` et `nav-retenue-qa.mjs`. Chaque juge est lancé sur l'état d'avant et doit échouer pour la bonne raison |
| CC-2 | après chaque PASS | Regarder les images et films du §6.10 produits par le juge avant de lancer la tâche suivante qui en dépend ; pour 021-04, la planche (le bois fait-il chêne ?) avant 021-22 |
| CC-3 | après 021-11 | Adapter `scripts/demo-video.mjs` : plan `heros_souris` avec le palier ; plan des étapes qui traverse C1 à C4 ; plan de l'atelier en lecture ; crédits du plan d'atelier sous la vidéo |
| CC-4 | après 021-11, avant tout commit | Montrer à Benj `page-bureau.mp4` et `page-telephone.mp4` ; après 021-12, rejouer la grille à l'aveugle sur C2, C6 et C7 (protocole 1088×800 du cahier 020 §11) |
| CC-5 | **bloquant avant 021-11** | Montrer à Benj les planches de 021-10 (Q-A), le film de 021-15 (Q-A2), `cote-a-cote.mp4` et les mesures de 021-09 (Q-B), `tel-avant-apres.mp4` de 021-17 (Q4) ; consigner ses réponses dans decisions.md |
| CC-6 | fin | Commit, push, puis `node scripts/deploiement-etat.mjs` (un push n'est pas un déploiement) ; demander à Benj d'ouvrir la démo sur son iPhone |

---

## 8. Questions pour Benj (goût et marque seulement)

**Coûts.** Rien ne coûte d'argent dans cette vague : Blender, Lenis, banques libres et rendus font 0 €. Aucun prompt MotionSites n'est à ouvrir.

**Mode de réponse.** Chaque question a une réponse par défaut, réversible. Les questions Q-A, Q-A2, Q-B et Q4 se tranchent **sur film**, avant l'intégration (CC-5).

- **Q-A — La vraie vidéo, au bureau.**
  - **Ce qui est prévu** : de vraies mains qui travaillent le bois (rabot, ponçage), en plein écran dans « Dans l'atelier ». La vidéo vient d'une banque gratuite, sans visage ni logo, avec le crédit « images d'illustration ». Elle joue en boucle avec un petit bouton pause.
  - **Ton choix** : le plan, sur les planches de 021-10. Et veux-tu la boucle avec pause, ou une seule lecture de 5 s qui se fige ?
  - **Sans réponse** : le plan « mains seules » le plus léger, en boucle avec pause. Tu le verras sur le film complet avant la mise en ligne.
- **Q-A2 — Une ouverture filmée au bureau ?** Au chargement, 3 à 5 s où le regard remonte du puits de l'escalier jusqu'à la photo, puis la cage tourne comme aujourd'hui. Tu compares sur le film côte à côte de 021-15. **Sans réponse : non.**
- **Q-B — Défilement « glissé » au bureau à la souris ?**
  - **Ce qu'on compare** : le défilement normal du navigateur ou le glissé (Lenis), sur `cote-a-cote.mp4` de 021-09.
  - **Recommandation** : oui, si les mesures montrent que les ancres et les défilements programmés tiennent.
  - **Sans réponse au moment de l'intégration** : normal, et la question reste ouverte.
- **Q4 — Le téléphone.**
  - **Ce qui est proposé** : la cage qui tourne en CSS dans le héros, à la place de la petite dérive, sans rien télécharger. La citation et les quatre verbes s'allument au défilement, et l'escalier éclaté s'ouvre en arrivant à l'écran.
  - **Garde-fous** : la note Lighthouse mobile (≥ 95). Tu verras `tel-avant-apres.mp4`.
  - **Option non retenue pour l'instant** : les cartes du rail des prestations qui se révèlent en glissant.
  - **Sans réponse : oui.**
- **Q-C — La phrase qui ferme les étapes.** « Tout commence par votre demande. », en texte seul, sans lien. **Sans réponse : celle-ci.**
- **Q3 — Roulis pendant la descente.** Consigné à « non » (decisions.md:61) : la cage tourne déjà au repos. Le film `descente-d116-roulis.mp4` montre l'autre choix si tu veux le voir. **Sans réponse : non.**
- **Demande (pas une question)** : après l'intégration, ouvre la démo sur ton iPhone. Le mode économie d'énergie de Safari et la cage qui tourne au téléphone ne se vérifient pas sur ordinateur.

---

## 9. Risques et ce qui n'est pas établi

1. **Lighthouse mobile.** La marge LCP est de 13 à 20 ms (resume.json), avec une passe déjà à 94. Trois effets ne sont pas mesurés :
   - la rotation de RL sur l'image LCP du téléphone (021-17) ;
   - la requête de `bureau.css` au téléphone ;
   - le passage à une référence servie en brotli.

   Parades : mesure par famille (§5.1) et série avant/après (021-21).
2. **Temps des juges.** Le verrou Lighthouse de site-qa.mjs:615-629 peut faire attendre jusqu'à 20 min, et un juge est coupé à 30 min (orchestre.mjs:317). Plusieurs juges de famille en même temps peuvent dépasser. Le parallélisme est donc à régler au vu des premiers PASS.
3. **Page plus longue.** Les étapes passent à 450svh, soit +1 350 px en 1440×900. Conséquences :
   - `demo-video.mjs`, `d30` et `d60` de la grille et le relais de la barre sont à rejouer ;
   - ce long épinglage peut peser sur la « retenue » (C7).

   Seuls les films et la réaction de Benj le diront.
4. **Blender 5.2 en mode trait.** Line Art ou Freestyle : la disponibilité n'est pas vérifiée (021-22 la consigne).
5. **Fond des rendus.** Le rendu de 021-04 peut ne pas être sur `#14110E`, ce qui impose un nouveau rendu en 021-22. Temps non budgété.
6. **Vidéo d'atelier.** Plusieurs points ne sont pas établis :
   - un vrai plan peut ne pas laisser la phrase lisible (AP-5, VA-9) ;
   - ses plafonds de poids sont un choix du cahier ;
   - le raccord de boucle peut se voir ;
   - il reste un risque de marque : des mains réelles présentées comme celles de l'artisan fictif (`ref-video.md` §2.2).
7. **Écriture binaire.** Elle reste une hypothèse, mais seulement pour Antigravity (021-22, 021-18) : Codex n'écrit plus de fichier binaire.
8. **`translate` avec `var()` et unités de conteneur** (021-05, 021-17) : l'exécution par le compositeur n'est pas vérifiée. EC-8 mesure les tâches longues et la cadence.
9. **RL au téléphone.**
   - L'échelle de base, le point d'origine dans le recadrage portrait et le placement du projecteur sont à mesurer (TL-2, TL-3).
   - Le mode économie d'énergie d'iOS n'est pas documenté (`ref-video.md` §3.4).
10. **Matière du rendu.** Le seuil OB-9 (ΔE00 ≤ 10) est un choix de Claude Code, et le rendu peut rester « image de synthèse » à côté des photos. Parade : regarder la planche (CC-2).
11. **Vocabulaire.** « Limon à la française », « entailles », « vis », « 17 mm » et « 40 mm » sont sourcés (§0.3). Un artisan peut préférer « embrèvement » : ce n'est pas vérifié sur une source lue en entier.
12. **C7, l'accumulation.** RL, descente, citation, chiffres, survol, verbes, vidéo d'atelier et grande scène n'ont jamais été vus ensemble. T-8 et T-10 comptent les gestes, mais la mesure reste la réaction de Benj sur `page-bureau.mp4` (decisions.md, entrée « La démo passe 8/8 à la médiane de la grille »).
13. **Grille à l'aveugle.** Survol, glissé, vidéo d'atelier et profil téléphone n'y apparaissent jamais (4 images fixes, `grille-aveugle.mjs:77`). Seuls la citation, les verbes et la grande scène peuvent y compter, si `d30` ou `d60` tombent sur eux. Le gain sur la grille n'est pas établi.
14. **Contraste des étapes inactives** à 45 % d'opacité (kit.css:1143) : non mesuré. La liste est désormais à côté d'une scène plus grande et plus lumineuse.
15. **Firefox.** Les animations liées au défilement n'y sont pas actives en version stable (MDN, cité par `ref-recit.md` §2.3). Le repli (éclaté fixe, valeurs finales, mots pleins) n'est vérifié qu'en simulant l'absence de `view()`.
16. **MotionSites.** Les recherches du 15/09 ne remontent ni éclaté au défilement ni vidéo d'atelier. La chorégraphie des étapes et le choix du plan d'atelier sont propres à Lestraque ; seuls l'échelle, les étiquettes ancrées et la vidéo plein cadre viennent des références ouvertes.

---

## 10. Les constats des deux contre-experts : ce qui en est fait

### 10.1 Contre-expertise de faisabilité

| Gravité | Constat | Vérifié par Claude Code | Sort | Où |
|---|---|---|---|---|
| bloquant | Plafond de 40 000 octets d'AVIF faux : le prototype pèse déjà 51 951 octets pour les six fichiers comptés | `eclate-rendu-qa.mjs:64` (déjà 60 000) ; decisions.md:63 ; fiche 021-04 en cours | **Corrigé** : 60 000 octets pour l'éclaté, plus 15 000 pour le relevé ; la qualité AVIF est exigée au rapport (OB-7, `eclate-rendu-qa.mjs:13`). L'option « ne pas publier `eclate.avif` » est écartée (§10.3) | §3.4 A, §5.2 |
| bloquant | VH-5 intenable : la dérive tourne avant la lecture | kit.css:940-942 et :698 lus ; mesures `derive.mjs` reprises | **Sans objet** : le MP4 du téléphone est retiré | §4.1 |
| important | État périmé : 020-13, 020-02 et 020-15 versées ; 021-02 déjà en grande partie faite ; attributs sans valeur | `git log`, `verdicts.jsonl`, `en-cours/`, `ls` (texture 2880 présente) | **Corrigé** : état recalé ; 021-02 réduite à la texture et `dureeP95`, avec un juge neuf qui échoue aujourd'hui ; SO-4 tel qu'écrit ; texture au budget du bureau ; CC-0 bis pour decisions.md:62 | §0.2, §3.5, §5.2, §7 |
| important | Des juges régénèrent le site pendant que d'autres tâches y travaillent | `grep` : signature-repos-qa.mjs:40, signature-relief-qa.mjs:39, nav-retenue-qa.mjs:34 | **Corrigé** : option `--dossier` en CC-1 ; aucune famille en file pendant 021-02 ou 020-03 d'ici là | §6.0, §7.0, §7.3 |
| important | T-8, T-2 et LN-4 échouent par construction | liste des animations du héros (`mesure.json`) ; `lenis-film-qa.mjs:83-85` | **Corrigé** : T-8 par geste avec liste blanche ; T-2 jusqu'à `load` ; LN-4 tel que le juge l'écrit | §6.8, §6.9 |
| important | Le budget CSS dépasse la marge LCP ; mesure faite sans compression | 76 594 / 13 140 octets (zlib) ; resume.json servi sans compression ; `Content-Encoding: br` en ligne | **Corrigé** : `bureau.css` non bloquante (021-20) ; Lighthouse servi en brotli ; plafond commun de +1 000 octets brotli ; médiane mesurée par famille | §3.0, §5.1, §5.2 |
| important | Vidéo sous 1 024 px, portrait sous 768 px | generer.mjs:252 ; kit.css:935-941 | **Sans objet** (MP4 retiré). Le profil téléphone vise exactement « téléphone portrait » (§0.1) et TL-5 vérifie les tablettes | §3.6, §6.7 |
| important | Chemin iPhone : pas de `requestIdleCallback`, H.264 jamais lu | kit.js:217 (repli existant) | **Sans objet** au téléphone ; **repris** pour la vidéo d'atelier : repli `setTimeout`, VA-5 et VA-6 (Chrome de marque) ; essai sur l'iPhone de Benj (CC-6) | §4.2, §6.5 |
| important | Le cadre `.etapes__photo` disparaît avec sa classe ; 3:2 sous 960 px | kit.css:768-778 et :1103-1116 lus | **Corrigé** : la figure garde la classe ; animations neutralisées ; 4:3 à toutes les largeurs ; étiquettes ancrées (EC-13) | §3.4 C, §6.4 |
| important | Films du §6.9 confiés à Codex, qui ne peut pas les produire | decisions.md:45 ; executant.mjs:104-120 | **Corrigé** : les juges produisent images et films ; retiré de 021-11 | §6.0, §6.10 |
| important | Crédit de la vidéo sans mécanisme ; pas de lien de licence | fiche 021-01 (six crochets, entrées `video` exclues) | **Corrigé** : crochet `credits` (021-20), SS-3, VA-1, AP-7 | §3.0, §4.2 |
| important | Survol : titre couvert à 54 %, vignettes placées ligne par ligne, débordement de 90 à 113 px | `ce5/mesure.json` ; kit.css:534 ; `presta-couleurs.mjs` | **Corrigé** : aperçu au-dessus de la ligne, bornes écrites, `ol.presta` relatif ; SV-4 et SV-15 | §3.3, §6.3 |
| important | Chiffres : état d'attente non défini | `mesure.json` (y = 700 → 980 ; 540 → 810) | **Corrigé** : bloc invisible, départ lié à la citation pleine **et** au bloc entier ; filet de 4 s ; RC-5, RC-6, RC-14, RC-15 | §3.1 B, §6.2 |
| mineur | Chemins déplacés ; photos-heros-qa ; annexe B et seuil de D-15 | `ls`, `grep` ; `controle-film-d116.json` lu | **Corrigé** pour les chemins et photos-heros-qa (plus aucun champ `usage` modifié) ; **écarté** pour le seuil de D-15 tiré de ce fichier (§10.3) | §0.2, §3.5 |
| mineur | Méthode de contraste d'un texte à 0,55 non écrite | — | **Corrigé** | §0.1, RC-4, RC-9 |
| mineur | VC-7 : voile de la page à superposer | video-heros-clip-qa.mjs:130-150 | **Sans objet** (MP4 retiré) ; TL-3 écrit « voile compris » | §6.7 |
| mineur | Copie des AVIF et des MP4 par Codex | — | **Corrigé** : Antigravity recopie (021-22, 021-18) | §7.0 |
| mineur | Licence : consigner l'extension, ajouter le lien | decisions.md:60 | **Corrigé** : extension consignée (CC-0) ; lien de licence dans tout crédit de vidéo (crochet `credits`) ; ouverture filmée sous CC BY-SA 4.0 | §4.2, §4.3 |
| mineur | Budgets de temps au-dessus du plafond ; 021-11 coupé | orchestre.mjs:317 ; executant.mjs:116 | **Corrigé** : 30 min partout ; Lighthouse sorti de 021-11 dans 021-21 | §7 |

### 10.2 Contre-expertise d'exigence

| Gravité | Constat | Sort | Où |
|---|---|---|---|
| bloquant | Pas de vraie « hero vidéo » : aucune au bureau, un geste CSS encodé au téléphone | **Corrigé** : MP4 du téléphone retiré ; **vraie vidéo d'atelier par défaut** au bureau, plein cadre, visible dans le film de la landing (L-1) ; ouverture filmée proposée sur film (Q-A2). Elle n'est pas dans le héros au bureau : Benj a demandé de tout garder (decisions.md:54) | §4, §5.5, §8 |
| bloquant | Objet décomposé timide : 11,7 % de l'écran, 121 px de défilement, trois planches | **Corrigé** : tronçon de trois marches (021-04) ; grande scène ; 450svh ; éclatement pièce par pièce sur 520 et 462 px ; EC-11 à EC-15 ; film. **Aire de 35 % ramenée à 30 % et 23 %** (§10.3) | §3.4, §6.4 |
| bloquant | Le récit n'est qu'une suite d'accents | **Corrigé** : les étapes deviennent le récit (demande, relevé, devis, pose), avec compteur « 01 / 04 », phrase finale et ER-1 (la scène change vraiment) ; citation et verbes restent des accents | §3.4 D, §6.4 |
| important | Rien de plus au téléphone | **Corrigé** : profil téléphone en CSS (Q4, défaut oui), TL-1 à TL-12, film avant/après. **Écarté** pour cette vague : les cartes du rail révélées ; **modifié** : `view()` au lieu de la classe `.vu` (§10.3) | §3.6, §6.7 |
| important | « Smooth animation » ne produit rien | **Corrigé** : mesures avec Lenis (LN-5), recommandation, film montré à Benj **avant** 021-11 (CC-5), tâche 021-19 prête | §3.2, §7 |
| important | Chiffres : faux « 0 » ou saut | **Corrigé** (même correction que la faisabilité) | §3.1 B |
| important | Le survol recouvre le titre dans 5 lignes sur 6 | **Corrigé** : aperçu au-dessus de la ligne, SV-15 ≤ 10 %. **Écarté** : l'option « aperçu sous le titre, contraste ≥ 3 » (§10.3) | §3.3 |
| important | Éclaté du téléphone en 3:2, étiquettes illisibles | **Corrigé** : 4:3, pastilles et légende, EC-6 | §3.4 C |
| important | Le juge C7 ne voit pas la surcharge ; la cote entre pendant le fondu | **Corrigé** : T-8 par geste, T-10 en défilement continu, cote après le fondu (35,875 %), films complets (CC-4) | §3.4 C, §6.9 |
| important | Plan d'exécution périmé | **Corrigé** (même correction que la faisabilité) | §0.2, §7 |
| important | Matière sans seuil | **Corrigé** : OB-9 (ΔE00 ≤ 10) est déjà dans le juge de 021-04 ; fond des rendus (RT-5) ; 021-22 attend le regard de Claude Code sur la planche | §3.4 A-B |
| mineur | Aperçu flou au premier survol | **Corrigé** : préchargement à l'approche, SV-9, SV-16 | §3.3 |
| mineur | Repli « premier geste » de la vidéo hors du héros | **Sans objet** (MP4 retiré) | §4.1 |
| mineur | Niveau MotionSites jugé sans le connecteur | **Corrigé** : le connecteur de claude.ai a répondu (3 recherches, 1 lookalike, métadonnées) ; 4 aperçus téléchargés et ouverts (`cardia-3d`, `heart-health-dashboard`, `data-storytelling`, `keel`). Limite restante : ni éclaté au défilement ni vidéo d'atelier dans la bibliothèque (§9, point 16) | §3.1, §3.3, §3.4, §4.2 |

### 10.3 Constats écartés (avec la raison)

1. **« Aire du cadre ≥ 35 % de l'écran »** (exigence, objet décomposé) : seuil ramené à **≥ 30 % en 1440×900 et ≥ 23 % en 1088×800** (EC-12).
   - **Calcul en 1088×800** : une boîte 4:3 de 35 % mesure 637 × 478 px. Même collée au bord gauche, elle ne laisse au texte des étapes qu'environ 1 033 − (637 + 48) − 148 ≈ 200 px de large, soit plus du double des lignes d'aujourd'hui (352 px et 3 lignes, `etapes-mise-en-page.json`).
   - **Calcul en 1440×900** : 30 % laissent 420 px de texte (§3.4 C).
   - Les deux seuils restent 2,6 et 1,7 fois l'aire d'avant (11,72 % et 13,76 %).
2. **« Aperçu sous le titre survolé, gardé à un contraste p90 ≥ 3 »** (exigence, survol, première option). La section est sur papier `rgb(244,237,226)` avec des titres `rgb(31,22,14)` (`presta-couleurs.mjs`). Une photo placée sous une encre sombre la rend illisible dans ses zones sombres, sauf à assombrir ou inverser le texte. L'option « décalé vers la zone libre » est retenue.
3. **« Fixer le seuil de D-15 à partir de `controle-film-d116.json` »** (faisabilité, mineur). Le fichier ne contient que l'écart entre le film et les images-clés (0,0168 et 0,0155), pas le déplacement par appariement de blocs que mesure D-15 (cahier 020 l.782-785). Le juge calcule la référence sur le film lui-même (§3.5).
4. **« Ne pas publier `eclate.avif` »** (faisabilité, première option du bloquant). `eclate.avif` est l'image fixe du téléphone, du mouvement réduit et de l'absence de `view()` (§3.4 C). Le plafond est relevé à 60 000 octets à la place (decisions.md:63).
5. **« Au téléphone, cartes du rail des prestations révélées à l'aimantation »** (exigence, téléphone). Aucune mesure de `view()` en axe horizontal dans un rail à défilement aimanté n'existe dans les rapports. Le point reste une option de Q4 et n'est pas écrit dans 021-17.
6. **« Éclaté du téléphone ouvert par la classe `.vu` et une transition de 1,2 s »** (exigence, téléphone). `.vu` n'est posée par kit.js que sur `.reveal` et `.etape` (kit.js:157-164), qui portent leurs propres styles d'entrée. Une animation `view()` fait la même ouverture sans JavaScript ni conflit (§3.6).
7. **« Au téléphone, filmer la descente dans le puits avec relief et carte graphique »** (exigence, deuxième voie du bloquant « vidéo »). Au téléphone, elle coûterait 200 000 à 300 000 octets (plafonds de `ref-video.md` §3.3) sur une marge LCP de 13 à 20 ms, pour un relief que le téléphone n'a pas. L'idée est reprise **au bureau**, en prototype d'ouverture (021-15).
8. **Parades propres au MP4 du téléphone** (VH-5, repli « premier geste », VC-7, déclenchement sous 1 024 px) : sans objet depuis le retrait du §4.1.
