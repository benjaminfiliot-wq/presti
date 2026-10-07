# Chaîne TikTok « Brico Travaux »

Une ligne du calendrier (`lignes/*.json`) devient une vidéo verticale 1080 × 1920 d'environ 16 s :
les photos réelles du produit vendu, animées (HyperFrames), avec une **voix off française** calée mot à mot sur les sous-titres.
Rien n'est publié par la chaîne : elle fabrique, le juge écoute, la publication reste un geste à part.

## Ce que la chaîne livre

Pour chaque ligne, dans `sorties/` :

| Fichier | Contenu | Quand le publier |
|---|---|---|
| `<id>-voix.mp4` | voix seule, -14 LUFS | publication avec un son TikTok « tendance » ajouté dans l'appli (voir plus bas) |
| `<id>-voix-musique.mp4` | voix + musique licenciée sous la voix (ducking), -14 LUFS | publication sans son ajouté ; n'existe que si une piste licenciée est au manifeste |
| `<id>/rapport.json` | fournisseur de voix, transcription de contrôle, niveaux, notes d'honnêteté | à relire avant de publier |
| `<id>/planche.jpg`, `<id>/images/` | une image par plan | à regarder avant de publier |
| `<id>/reperes.txt` | coupes, grille des temps forts, son à choisir au dépôt | au moment de publier |

## Commandes

```
node promo-src/tiktok-chaine/generer.mjs promo-src/tiktok-chaine/lignes/j1-aspirateur.json   # une vidéo
node promo-src/tiktok-chaine/generer.mjs promo-src/tiktok-chaine/lignes                     # tout le calendrier
node promo-src/tiktok-chaine/generer.mjs <ligne> --sans-rendu                              # voix + découpage seulement
node promo-src/tiktok-chaine/juge.mjs --sabotages                                          # le juge (voir plus bas)
node promo-src/tiktok-chaine/musique.mjs                                                   # état du manifeste de musique
```

Sur l'usine, mode file (même code) : `generer.mjs --file` vide `~/travail/tiktok/a-produire/`
(unité `scripts/usine/systemd/presti-tiktok.service`, jamais pendant la fenêtre du Chef H:05-H:20).

## La méthode, dans l'ordre

1. **Ligne validée** avant tout rendu : aucun chiffre, prix ni performance à l'écran (les nombres s'écrivent en lettres :
   « Six embouts fournis »), chaque plan a sa réplique, chaque image existe.
2. **Voix.** Le texte dit est **exactement** le texte affiché (accroche, révélation, gestes, bénéfice, appel).
   - Fournisseur décidé par la garde du dépôt `lib/studio/voixFish.ts` (usage commercial) :
     Fish Audio **seulement** si une clé existe dans `presti-secrets` (fichier dont le nom contient « fish ») **et** si
     `voix-fish.json` déclare un forfait commercial prouvé. Sinon : voix locale **Kokoro `ff_siwis`** (gratuite, sans clé,
     modèle Apache-2.0), sur le PC comme sur l'usine.
   - Cache `cache/voix/` **clé sur le texte** (sha256 du fournisseur, de la voix, du débit et du texte dit), jamais sur l'id
     d'une ligne : un cache par clip a déjà resservi la voix d'un autre clip.
   - Chaque réplique est **écoutée** par faster-whisper : ses mots datés donnent l'instant de chaque sous-titre, et une
     réplique que la voix ne dit pas correctement (ressemblance < 0,8) arrête la vidéo. Remède : reformuler (Kokoro dit mal
     « éventail », et « c'est aspiré » s'entend « t'aspirées »), ou une entrée `prononciations` dans `produits/<produit>.json`.
3. **Découpage** : chaque plan commence sur un **temps fort** (ceux de la piste du manifeste, sinon une grille à 128 BPM)
   et dure assez de temps forts pour sa réplique plus un souffle.
4. **Rendu HyperFrames muet**, puis le son : piste de voix normalisée à -14 LUFS (deux passes) ; si une piste est
   licenciée, musique démarrée sur son premier temps fort, passée sous la voix (compresseur piloté par la voix), fondu final,
   mélange normalisé à -14 LUFS.
5. **Écoute de la vidéo finale** (pas des fichiers intermédiaires) : niveau, aucun silence de plus de 0,8 s au début,
   transcription comparée au texte affiché (≥ 0,85). La vidéo est refusée sinon.

## Style d'animation « keynote » (par défaut depuis le 07/10)

Repris de la référence de Benj (une démo produit façon keynote, @tonytuyisenge), à la charte noir / jaune, dans `plans-keynote.mjs` :

1. **Ouverture** : la vidéo OUVRE sur le point lumineux. L'accroche est lisible dès la 1ʳᵉ image (étiquettes affichées d'avance, le mot dit s'allume), sur la scène du problème assombrie ; la comète tourne autour du texte, se pose au centre et grossit ; au plan suivant elle s'ouvre en cercle sur le produit (morph) et son nom s'écrit **lettre à lettre** au rythme de la voix.
2. **Coupes « whip »** : glissé rapide avec **flou de mouvement directionnel** (filtre SVG propre à chaque coupe, posé seulement pendant la coupe) ; **éclair lumineux** (bloom) sur les coupes « flash ».
3. **Cartes en perspective 3D** : les photos et les fiches produit entrent de biais et en profondeur, en décalé, puis flottent (ombres portées, reflet qui passe).
4. **Trait de lumière** : il dessine un arc puis devient la barre jaune qui porte le bénéfice.
5. **Mouvement continu** : chaque plan dérive légèrement (travelling, roulis) : rien n'est jamais figé.
6. **Clôture** : une pilule BRICO TRAVAUX, des bulles en parallaxe, la phrase d'appel dessous, dite et calée sur la voix. « Lien dans la bio » n'apparaît qu'une fois (ici) ; le temps gagné va à la révélation du produit.

Retiré après revue du 07/10 : le texte géant qui défilait en fond (« SANS FIL · ») se lisait tronqué ou collé (« EMUTS », « SANFIL ») : fond sombre et lueur à la place. Prononciation : Kokoro dit bien « sans fil », mais après « L'aspirateur » Whisper entend « s'en file » : la révélation dit « Un aspirateur sans fil ».

`--style=classique` (ou `"style": "classique"` dans la ligne, ou `TIKTOK_STYLE`) rend l'ancien style. Pas encore fait : l'animation incrustée dans l'écran d'un téléphone posé dans un vrai décor (il faut une photo de décor à la licence prouvée).
Piège HyperFrames : trop de surcouches lourdes (flou CSS, dégradé radial, clip-path) font sortir des images noires ; `hyperframes lint` les compte (avertissement `composition_heavy_overlay_count_high`) : préférer les dégradés linéaires et l'opacité.

## Musique : la règle

**Jamais un son protégé incrusté** (contrefaçon : TikTok coupe le son ou retire la vidéo).
Seule source admise : **TikTok Studio > « Sons libres de droits »** (bibliothèque commerciale).
`musique/manifeste.json` liste les pistes ; une piste n'est utilisable que si :

- sa licence est relevée (source `tiktok_studio_sons_libres_de_droits`, `is_commerce_music: true`, `commercial_right_type: 2`, date) ;
- la réponse de l'API qui le prouve est versionnée dans `musique/preuves/<music_id>.json` ;
- le fichier `musique/fichiers/<music_id>.mp3` (jamais versionné) a l'empreinte sha256 du manifeste ;
- ses temps forts sont connus (`extra.beats.beats_tracker` de l'API, sinon `hyperframes beats`).

Une piste nommée par une ligne (`"musique": "tt-…"`) mais non utilisable est une **erreur**, jamais un repli silencieux.
Sans piste utilisable, la chaîne livre la version voix seule et rien d'autre.

### Ajouter une piste

1. Dans TikTok Studio connecté (`/tiktokstudio/sound-library`), la page appelle
   `POST /tiktok/v1/creator/music/unlimited/search/list/?aid=1988` avec `{page_num, page_size, keyword, music_type: 1}` ;
   sauver la réponse JSON de la recherche (onglet Réseau) et télécharger le son (bouton de la page, ou `play_url`).
2. `node promo-src/tiktok-chaine/musique.mjs ajouter <reponse.json> <music_id> <fichier.mp3> --ambiance=energique,bricolage`
   (copie le fichier, écrit l'empreinte, les temps forts et la preuve).
3. `node promo-src/tiktok-chaine/musique.mjs` doit dire « utilisable ».

## Publier : son incrusté OU son de l'appli, jamais les deux

Le son « tendance » de la bibliothèque commerciale peut aussi être ajouté **au moment de publier**, dans l'appli
TikTok (compte professionnel : seuls les sons commerciaux y sont proposés). Dans ce cas, publier **`<id>-voix.mp4`**
(voix seule) et baisser le son ajouté pour que la voix reste devant ; **jamais `<id>-voix-musique.mp4`** avec un son
ajouté par-dessus (deux musiques). `reperes.txt` donne le tempo à viser et la première coupe à caler sur le premier temps fort.

## Le juge

`juge.mjs` écoute et mesure lui-même chaque vidéo livrée, sans croire le rapport :
J1 voix présente, J2 texte dit = texte affiché (transcription de la vidéo comparée à la ligne), J3 sous-titres calés sur la
voix réelle (médiane ≤ 0,25 s, pire ≤ 0,7 s), J4 -14 LUFS ± 1,5, J5 aucun silence > 0,8 s au début, J6 aucune piste sans
preuve de licence au manifeste (et la version musique nomme une piste utilisable), J7 le son couvre la vidéo,
J8 au moins une coupe à flou directionnel (mesuré sur l'image : à la coupe, le rapport des contrastes horizontal / vertical
s'effondre par rapport au milieu des plans), J9 au moins un plan en perspective 3D, J10 aucun passage figé de plus de 0,8 s, J11 aucun mot tronqué ou collé à l'écran (OCR tesseract de 3 images au-dessus des sous-titres : tout mot lu avec assurance doit être un mot de la ligne ou de la marque ; tesseract est sur l'usine, pas sur le PC)
(différence d'images à 10 i/s).
`--sabotages` fabrique des copies cassées (muette, voix d'une autre vidéo, -10 dB, 1,5 s de silence en tête, piste sans preuve,
sous-titres décalés de 0,8 s, coupes cherchées hors des whips, perspective retirée, 1,2 s d'image figée, « EMUTS SANFIL » incrusté) : chacune doit être
refusée, sinon le juge échoue. Le juge demande le style keynote (J8, J9) : une vidéo du style classique est refusée.

## Installer la voix

- **PC** : `python -m venv --system-site-packages %USERPROFILE%\.presti-voix\venv` puis
  `%USERPROFILE%\.presti-voix\venv\Scripts\python -m pip install kokoro-onnx soundfile` (faster-whisper est déjà installé).
- **Usine** : `/home/agents/venv-voix` (utilisateur `agents`) : `python3 -m venv ~/venv-voix && ~/venv-voix/bin/pip install kokoro-onnx soundfile faster-whisper`.
- Modèles : Kokoro v1.0 dans `~/.cache/hyperframes/tts/` (téléchargé au premier usage s'il manque) ; faster-whisper
  `small` dans le cache Hugging Face. `TIKTOK_PYTHON` force un autre Python ; `TIKTOK_WHISPER` un autre modèle d'écoute ;
  `TIKTOK_VOIX_VITESSE` le débit (1,15 par défaut).
- faster-whisper ne décode plus l'audio par PyAV (incompatible avec les versions récentes) : `voix.py` lit le WAV lui-même.

## Fish Audio : quoi remplir pour l'activer

1. Prendre un forfait Fish Audio **qui autorise l'usage commercial** (décision d'argent de Benj ; le gratuit ne l'autorise pas).
2. Mettre la clé seule sur une ligne dans `presti-secrets/fish-audio.txt` (jamais dans le dépôt).
3. Dans `voix-fish.json`, remplir `droits` : `forfait` (nom exact du forfait), `commercial: true`, `prouve_le` (date de la
   preuve, ex. `2026-10-07`), `source` (où est la preuve : facture ou page des conditions, avec son adresse), `expire_le`
   (fin de la période payée) ; et `voix_id` (l'id de la voix française choisie dans la bibliothèque Fish).
4. La garde vérifie aussi le solde de crédits (relevé du jour) ; sans solde lisible, elle rend la voix locale.
   Le chemin Fish de `voix.mjs` n'a pas pu être essayé faute de clé : premier rendu Fish = à écouter.

## Produits

`produits/*.json` décrit le produit **vendu** : fiche du fournisseur, colis exact, caractéristiques citables, avertissements,
et chaque image (adresse publique, recadrage qui retire les textes du vendeur, détourage, `masques` pour effacer un élément
collé au produit, points pour la loupe). Une vidéo ne montre et ne dit que ce qui est dans le colis.
