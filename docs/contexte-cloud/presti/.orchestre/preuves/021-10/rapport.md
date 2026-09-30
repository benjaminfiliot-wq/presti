# Rapport d'analyse comparative des rushes vidéo d'atelier (Tâche 021-10)

## 1. Contexte et statut des banques interrogées

Pour alimenter la réflexion sur le hero d'accueil Presti (artisan du bâtiment / menuisier-charpentier), huit plans vidéo ont été sélectionnés, téléchargés dans `.orchestre/travail/rushes-atelier/`, convertis en planches d'images et analysés en détail.

### Exclusion technique de Pexels et Pixabay
- **Pexels** (`pexels.com`) et **Pixabay** (`pixabay.com`) appliquent une protection WAF / Cloudflare stricte qui renvoie systématiquement une réponse HTTP `403 Forbidden` aux requêtes scriptées (Node.js `fetch`).
- Conformément aux consignes de sécurité du projet (aucun contournement clandestin, respect de la politique de requêtes), ces deux banques n'ont pas été forcées par émulation complexe de navigateur.
- La recherche a donc porté avec succès sur les trois sources ouvertes et vérifiées :
  1. **Wikimedia Commons** (domaine public / CC0)
  2. **Mixkit** (licence *Mixkit Stock Video Free License* strictement vérifiée, exclusion des vidéos taguées *Restricted*)
  3. **Coverr** (licence *Coverr* libre pour usage commercial sans attribution obligatoire)

---

## 2. Analyse détaillée des 8 plans retenus

### Plan 1 : `commons-mondial-metiers`
- **Fichier** : `commons-mondial-metiers.webm` (1920×1080, 11,13 s, 16,2 Mo)
- **Source** : Wikimedia Commons — Benoît Prieur — CC0
- **Geste** : Vue panoramique d'un grand hall d'exposition (Mondial des Métiers) où plusieurs artisans et apprentis s'affairent autour d'ossatures et d'établis.
- **Ambiance lumineuse** : Éclairage de foire/salon industriel, fort contraste artificiel, plafond noir avec projecteurs.
- **Lisibilité d'un titre** : Très mauvaise. La scène est saturée d'éléments visuels en mouvement, de chevrons et de structures métalliques.
- **Risques résiduels** : Plusieurs visages sont parfaitement identifiables ; stands et lettrages (« C », signalétique de salon) reconnaissables ; présence d'aspirateurs et machines modernes bruyantes visuellement. Ne correspond pas à l'intimité d'un atelier d'artisan.

### Plan 2 : `mixkit-39684-leveling-board`
- **Fichier** : `mixkit-39684-leveling-board.mp4` (1280×720, 8,09 s, 3,4 Mo)
- **Source** : Mixkit — Edgar Fernandez — Mixkit Free
- **Geste** : Geste d'arasage / raclage manuel le long d'un chant de planche sombre, faisant naître de magnifiques copeaux de bois enroulés en spirale.
- **Ambiance lumineuse** : Éclairage d'atelier doux avec une faible profondeur de champ. La pièce de bois sombre (teinte noyer/chêne foncé) accroche la lumière sur son arête.
- **Lisibilité d'un titre** : Excellente. Le haut et le côté gauche de l'image sont plongés dans un flou harmonieux, permettant une superposition immédiate d'un titre blanc ou clair sans masque opaque lourd.
- **Risques résiduels** : L'artisan porte des gants de protection jaunes de marque 3M (petit marquage imprimé visible sur le dos du gant lors de certains mouvements).

### Plan 3 : `mixkit-776-sanding-lumber`
- **Fichier** : `mixkit-776-sanding-lumber.mp4` (1280×720, 34,78 s, 10,8 Mo)
- **Source** : Mixkit — Marco Lopez — Mixkit Free
- **Geste** : Ponçage de surface à l'aide d'une ponceuse orbitale électrique sur une pièce de bois clair.
- **Ambiance lumineuse** : Contre-jour chaleureux avec de grandes ouvertures en arrière-plan, tonalité dorée.
- **Lisibilité d'un titre** : Moyenne à bonne sur le tiers droit.
- **Risques résiduels** : L'outil électrique crée une vibration et une répétition mécanique ; cadre tronqué sous le menton sans visage, mais silhouette globale visible.

### Plan 4 : `mixkit-778-marking-wood`
- **Fichier** : `mixkit-778-marking-wood.mp4` (1280×720, 43,21 s, 12,6 Mo)
- **Source** : Mixkit — Marco Lopez — Mixkit Free
- **Geste** : Artisan traçant des repères au crayon à papier sur un panneau d'établi, puis manipulant une règle et une vitre.
- **Ambiance lumineuse** : Atelier traditionnel feutré, tons ocres et bois chaud.
- **Lisibilité d'un titre** : Correcte sur la gauche.
- **Risques résiduels** : Visage très présent et parfaitement identifiable (artisan portant une casquette bleue et une moustache prononcée). Cela brise l'illusion d'universalité pour les différents profils d'artisans utilisant Presti.

### Plan 5 : `mixkit-1445-measures-wood`
- **Fichier** : `mixkit-1445-measures-wood.mp4` (1280×720, 10,88 s, 3,3 Mo)
- **Source** : Mixkit — Josh Janssen — Mixkit Free
- **Geste** : Déroulement régulier d'un mètre ruban métallique le long d'un chevron brut posé sur des tréteaux.
- **Ambiance lumineuse** : Lumière naturelle diffuse d'extérieur ou de chantier couvert, tons neutres et clairs.
- **Lisibilité d'un titre** : Exceptionnelle. La partie haute de l'image est un aplat flou et régulier qui fait ressortir le texte immédiatement.
- **Risques résiduels** : Zéro visage, zéro logo, aucun lieu identifiable. Geste calme et universel. Seul compromis : la tonalité générale est un peu désaturée/froide par rapport à la chaleur du bois raboté.

### Plan 6 : `coverr-filing-down-wood`
- **Fichier** : `coverr-filing-down-wood.mp4` (1920×1080, 14,17 s, 8,2 Mo)
- **Source** : Coverr — Coverr — Coverr
- **Geste** : Main faisant coulisser une baguette profilée sur une table d'atelier.
- **Ambiance lumineuse** : Neutre, lumière du jour.
- **Lisibilité d'un titre** : Moyenne.
- **Risques résiduels** : Arrière-plan chargé de chutes de bois informes et de cartons d'emballage qui donnent une impression de désordre peu flatteuse.

### Plan 7 : `coverr-sawing-plank`
- **Fichier** : `coverr-sawing-plank.mp4` (1920×1080, 15,13 s, 8,6 Mo)
- **Source** : Coverr — Coverr — Coverr
- **Geste** : Mains et avant-bras saupoudrés de sciure poussant méthodiquement une planche le long d'un guide sur un plateau de machine à bois.
- **Ambiance lumineuse** : Lumière rasante sur la sciure et le bois blond, grain d'image très artisanal.
- **Lisibilité d'un titre** : Bonne sur le haut du cadre.
- **Risques résiduels** : Bruit visuel de la sciure qui bouge, présence de débris en arrière-plan, geste lié à une machine d'atelier plutôt qu'à un travail à la main.

### Plan 8 : `coverr-sawing-wood`
- **Fichier** : `coverr-sawing-wood.mp4` (14,29 s, 1920×1080, 8,7 Mo)
- **Source** : Coverr — Coverr — Coverr
- **Geste** : Tronçonnage de chevrons à la scie radiale stationnaire jaune.
- **Ambiance lumineuse** : Plein jour en extérieur, éclairage cru.
- **Lisibilité d'un titre** : Moyenne.
- **Risques résiduels** : La machine jaune DeWalt est immédiatement identifiable (couleur et forme caractéristique). La poussière et le mouvement heurté perturbent la lecture.

---

## 3. Le podium des 3 meilleurs plans

| Rang | Plan ID | Titre & Source | Atout majeur pour Presti | Compromis / Risque |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `mixkit-39684-leveling-board` | *Hand leveling wooden board* (Mixkit Free) | **Poésie et authenticité artisanale.** Le ruban de copeau de bois qui s'enroule sous le racloir symbolise parfaitement l'excellence du geste et la noblesse du métier. | Logo 3M discret sur le gant jaune ; durée courte (8 s, nécessite une boucle fluide). |
| **2** | `mixkit-1445-measures-wood` | *A person measures wood* (Mixkit Free) | **Neutralité et lisibilité absolue.** Mains seules déroulant un mètre ruban, zéro visage, zéro logo. Arrière-plan flou parfait pour le titre. | Esthétique plus technique/chantier qu'ébénisterie chaleureuse (bois brut). |
| **3** | `coverr-sawing-plank` | *Sawing a plank of wood* (Coverr) | **Matière et authenticité brute.** Mains recouvertes de sciure, immersion directe dans l'odeur du bois d'atelier. | Présence d'une machine et arrière-plan un peu brut de décoffrage. |

---

## 4. Recommandation finale

Nous **recommandons** l'intégration du plan **`mixkit-39684-leveling-board`** (*Hand of a carpenter leveling a wooden board*) pour le hero de Presti.

### Justification de la recommandation :
1. **Émotion et transmission du métier** : Contrairement aux machines électriques qui renvoient à l'usinage industriel ou au bricolage, le racloir/rabot manuel qui fait naître un copeau régulier incarne la noblesse de l'artisanat français d'art et du bâtiment. C'est l'image même du « travail bien fait » que Presti valorise auprès des clients finaux.
2. **Qualité typographique** : La zone supérieure et gauche offre un contraste sombre et flou naturel. Il n'est pas nécessaire d'ajouter un filtre sombre agressif à 60 % d'opacité, ce qui préserve la vivacité de la vidéo.
3. **Anonymat respecté** : Aucun visage n'apparaît, évitant tout rejet d'identification de la part des artisans utilisateurs.

### Alternative en cas de refus des gants :
Si la présence du gant jaune avec marquage 3M déplaît à Benj pour des raisons de purisme graphique, la seconde option immédiate est **`mixkit-1445-measures-wood`** (geste universel du mètre ruban, mains nues sans gant, conformité totale).

Enfin, si l'on souhaite un plan de rabotage à la main nue sans gant sur chêne massif clair baigné de lumière naturelle, il sera très simple et peu coûteux pour Benj de tourner une séquence dédiée de 10 secondes avec un smartphone en 4K sur un vrai établi d'artisan local, maintenant que le cahier des charges esthétique et technique est parfaitement calibré.
