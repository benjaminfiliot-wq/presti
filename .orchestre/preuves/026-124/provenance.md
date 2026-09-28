# Provenance des deux téléchargements (026-124)

Deux accords de Benj, le 28/09, et seulement ceux-là (fiche 026-124, « Gestes de Benj (avant de commencer) »).

## 1. Modèle de détection de visages YuNet

- **Fichier déposé :** `scripts/modeles/face_detection_yunet_2023mar.onnx`
- **Source :** dépôt officiel `github.com/opencv/opencv_zoo`, dossier `models/face_detection_yunet`
- **URL exacte du binaire (Git LFS media, pas la page HTML) :**
  `https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx`
- **Commit du dépôt officiel qui porte ce fichier :** `f12e12798e8314f7c074a6656816c048dcc95b7a` (2023-06-06, « update yunet to v2 (#151) »)
- **Pointeur Git LFS d'origine (`git show HEAD:models/face_detection_yunet/face_detection_yunet_2023mar.onnx` sur le dépôt officiel) :**
  ```
  version https://git-lfs.github.com/spec/v1
  oid sha256:8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4
  size 232589
  ```
- **Taille téléchargée :** 232 589 octets (232 Ko) — conforme à l'oid et à la taille du pointeur LFS, et proche des « ~230 Ko » de la fiche.
- **sha256 du fichier déposé :** `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` — identique à l'oid LFS ci-dessus.
- **Licence :** Apache-2.0 (licence du dépôt `opencv/opencv_zoo`, fichier `LICENSE` à la racine).
- **Vérification fonctionnelle :** le fichier se charge dans `cv2.FaceDetectorYN.create(...)` (OpenCV 4.13.0, Python 3.12.10) sans erreur.
- **Empreinte épinglée dans le code :** `scripts/visages.py` et `scripts/visages-qa.mjs` refusent de tourner si le sha256 du fichier sur disque diffère de cette valeur (SP-4).

Piège rencontré : `raw.githubusercontent.com` sert un **pointeur Git LFS** de 131 octets (texte), pas le binaire — vérifié avant dépôt (`file` dit `data` sur le fichier final, pas texte). Le binaire réel est servi par `media.githubusercontent.com/media/...`.

## 2. Portrait peint du domaine public (témoin positif du détecteur)

- **Fichier déposé :** `scripts/fixtures/026-pubs-contenu/socle/visage-domaine-public.jpg`
- **Œuvre :** *Claes Duyst van Voorhout*, portrait peint par **Frans Hals** (peintre néerlandais, 1580–1666), vers 1638.
- **Source :** Wikimedia Commons, page de description
  `https://commons.wikimedia.org/wiki/File:Frans_Hals_-_Claes_Duyst_van_Voorhout.jpg`
- **URL exacte du fichier téléchargé (vignette 1280 px de large, servie par Wikimedia) :**
  `https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Frans_Hals_-_Claes_Duyst_van_Voorhout.jpg/1280px-Frans_Hals_-_Claes_Duyst_van_Voorhout.jpg`
- **Licence vérifiée sur la page Commons (API `imageinfo|extmetadata`) :** `LicenseShortName = Public domain`, `UsageTerms = Public domain`, `Copyrighted = False`, `Restrictions = ` (aucune). L'œuvre originale (Frans Hals, mort en 1666) est dans le domaine public depuis longtemps ; la reproduction photographique fidèle d'une œuvre 2D du domaine public est elle-même du domaine public (doctrine PD-Art appliquée par Wikimedia Commons — cf. `{{PD-Art}}` sur la page du fichier).
- **Dimensions :** 1280 × 1560 px. **Taille téléchargée :** 401 637 octets (0,38 Mo — la fiche proposait « environ 0,5 Mo » ; la vignette 1280 px de Wikimedia est le point le plus proche de cette taille parmi les vignettes disponibles, retenue après essai sur 8 portraits candidats, voir ci-dessous).
- **sha256 du fichier déposé :** `55ea2ab221044855e2a64c7157135323e1672779f4ccbae9afa596d687d01b6c`
- **Aucune photo d'une personne réelle vivante :** confirmé — c'est une peinture du XVIIe siècle, aucun visage réel n'entre dans le dépôt.

### Pourquoi ce portrait précis (choix motivé, pas le premier trouvé)

La fiche exige SP-6 : détection avec score ≥ 0,9, y compris incrusté à 30 % de largeur dans une photo de chantier 1080×1920. YuNet (entraîné sur des photographies réelles, WIDER FACE) est sensible au style pictural : testé sur 8 portraits candidats du domaine public à seuil bas (0,3) pour comparer les scores :

| Candidat | Peintre | Meilleur score |
|---|---|---|
| *Girl with a Pearl Earring* | Vermeer | 0,53 (rejeté — sous 0,9) |
| *Portrait of a Man in a Turban* | Van Eyck | 0,88 |
| *Mona Lisa* | Léonard de Vinci | 0,89 |
| *Self-portrait* (1659) | Rembrandt | 0,91 (marge trop faible) |
| *Self-portrait* | Titien | 0,90 |
| *Self-portrait* (1621-27) | Van Dyck | 0,91 |
| *Raffaello Sanzio* (autoportrait) | Raphaël | 0,83 |
| **Claes Duyst van Voorhout** | **Frans Hals** | **0,94 — retenu** |

Retenu à cause de la marge confortable au-dessus de 0,9, vérifiée aussi après incrustation à 30 % de largeur dans `public/sites-demo/carreleur/images/dallage-720.webp` redimensionné en 1080×1920 : score 0,928 (mesure exacte reprise dans `etalonnage-visages.json`).

## Sha256 de contrôle (recalculés le 28/09 depuis les fichiers déposés)

```
8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4  scripts/modeles/face_detection_yunet_2023mar.onnx
55ea2ab221044855e2a64c7157135323e1672779f4ccbae9afa596d687d01b6c  scripts/fixtures/026-pubs-contenu/socle/visage-domaine-public.jpg
```
