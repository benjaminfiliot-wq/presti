# 021-18 — le plan d'atelier, encodé en miroir et recopié

## Source et licence

- Plan : « Carpenter sanding a piece of lumber », **Marco Lopez**, banque **Mixkit**, licence **Mixkit Stock Video Free License**.
- Page du plan : https://mixkit.co/free-stock-video/carpenter-sanding-a-piece-of-lumber-776/ — texte de la licence :
  https://mixkit.co/license/#videoFree
- Page relue le 2026-09-15 à 17:11:16 (+02:00), en simple lecture (aucun compte, aucun clic) ; copie dans `licence-page.html` :
  titre du plan présent, « Mixkit Stock Video Free License » présent, « Restricted License » absent.
- Fichier source : `.orchestre/travail/rushes-atelier/mixkit-776-sanding-lumber.mp4`, 1280×720, 24000/1001 images/s, 34,78 s.
  sha256 recalculé : `70ae8cce243bb135ff44d9d817e0d459a151345ad0638aa58725607626100d92`, égal à rushes.json.

## Fenêtre et recadrage

- **Fenêtre** : début 16,97 s, durée 6,006 s (144 images, de l'image 407 à l'image 550 de la source), d'un seul tenant.
- **Recadrage** : x = 320, y = 160, largeur = 960, hauteur = 540 (16/9 exact), **puis miroir horizontal**, agrandi en
  1280×720, sans filtre, sans assombrissement ni étalonnage.
- **Pourquoi cette fenêtre.** C'est le passage le plus chaud de la source (R − B moyen du recadrage 22,5, contre 19 à 20,6
  entre 6 et 14 s et après 25 s), et le geste y est régulier : quatre allers-retours de la ponceuse, mouvement moyen stable
  (coefficient de variation 0,26), sans recul du corps. C'est aussi l'un des meilleurs raccords des 31 944 couples
  début/durée de 6 à 8 s (0,0255 sur la source).
- **Pourquoi ce recadrage.** x = 320 garde la ponceuse entière au bout de son geste (x = 240 la coupait). En miroir, la phrase
  de l'atelier tombe sur l'avant-bras sombre en contre-jour ; la poignée de la ponceuse et le câble restent sous le texte, le
  t-shirt passe à droite. Simulation sur toute la source, puis regard dans la vraie scène générée (`regard/scene-*.png`) :
  la place du texte reste calme, la composition vaut celle du plan non retourné.

## La barbe

Le bout de barbe entre par le haut du cadre, avec un masque à grille et une sangle jaune, entre x ≈ 380 et 650 de la source.
Il est présent sur **toutes** les images de la fenêtre et descend au plus à y ≈ 125 px (images 125 à 143). Vérifié image par
image sur les 144 images (bande x 400–700, y 80–180, trait rouge à y = 160), puis en zoom ×2 sur les images 0, 60, 110, 125,
135 et 143. **Bande retirée : le haut du cadre, de y = 0 à y = 160 px**, avant le miroir, soit 35 px de marge sous la barbe.

## La marque et ce que montre la planche

Une inscription blanche « makita » est sur la plaque verte de la ponceuse, sous la main. Aucun recadrage permis ne l'exclut :
la plaque suit la main. Sans miroir, le mot se lisait à la taille de la scène (`regard/marque-avant-miroir-1600x900.png`).
Avec le miroir, l'inscription devient une suite de signes à l'envers, qui ne se lit plus comme un mot sur les deux fichiers
encodés affichés en 1600×900 (`regard/marque-miroir-1600x900.png`, images 0, 40 et 100, H.264 en haut, AV1 en bas). Dans la
scène elle-même, la plaque tombe au bord gauche, souvent hors de l'écran.

Planche regardée (`planche.jpg`, 8 images du H.264) : les mains et la ponceuse à gauche, l'avant-bras, le t-shirt gris à
droite, l'atelier flou derrière. Aucun visage, aucune barbe, aucune marque lisible, aucun lieu identifiable.

visage : non ; logo : illisible après recadrage et miroir ; lieu reconnaissable : non

La variante sans miroir (même fenêtre, même recadrage) est gardée entière dans `.orchestre/travail/021-18/variante-gardee/`,
si la décision retenait plutôt de garder la marque.

## Encodage

- Recette de la fiche, **sans fondu** (`fondu: 0`), depuis la source pour les deux fichiers :
  `crop=960:540:320:160,hflip,scale=1280:720:flags=lanczos,setsar=1,format=yuv420p`, puis libx264 slow crf 27 tune film,
  et libsvtav1 preset 5 crf 40.
- Poids : **H.264 265 449 octets** (plafond 600 000), **AV1 96 475 octets** (plafond 350 000). 1280×720, 6,006 s,
  144 images, sans son. Raccord et écarts : voir `mesures.json`, recopiés du juge.

## Mon avis : la boucle se voit-elle ?

Un peu. La dernière et la première image ont la même pose (mains avancées sur la ponceuse), mais le bras et le bord du
t-shirt sautent d'une vingtaine de pixels au raccord : un œil attentif verra un léger à-coup toutes les 6 secondes, que le
va-et-vient continu du geste atténue. Le raccord mesuré reste sous 0,03 ; la fiche n'admet donc pas le fondu de 0,5 s.
