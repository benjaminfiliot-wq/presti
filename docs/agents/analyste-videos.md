# L'analyste de vidéos (agent sans clé, usine Oracle)

Une URL TikTok ou YouTube déposée dans une file ; une vingtaine de minutes plus tard, un fichier Markdown d'analyse existe, sans que personne
intervienne. Tout est local à l'usine : yt-dlp, ffmpeg, tesseract et Ollama sur 127.0.0.1. **Aucune clé** : le service n'a ni coffre, ni
variable d'environnement (le juge le prouve avec des « canaris »). Code : `scripts/usine/analyse-video.mjs`. Juge : `node scripts/analyse-video-qa.mjs`
(`--auto-controle` : le témoin puis 55 sabotages sur copie, tous attrapés). Groupe d'unités : `videos` (`presti-videos.service` + `.timer`).

## Déposer une vidéo

Hôtes autorisés (liste fermée, https seulement, sans identifiants ni port) : `tiktok.com`, `www.`/`m.`/`vm.`/`vt.tiktok.com`,
`youtube.com`, `www.`/`m.youtube.com`, `youtu.be`. Tout le reste est refusé avant le moindre outil.

```
# depuis le poste
ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3 \
  "sudo -n -u agents env HOME=/home/agents /usr/bin/node /srv/presti-agents/scripts/usine/analyse-video.mjs --deposer=https://vm.tiktok.com/XXXX/"
```

ou écrire l'URL (une ligne) dans `/home/agents/travail/videos/a-analyser/<nom>.url` (nom : lettres, chiffres, `.`, `_`, `-`, au plus 80 signes ; un
raccourci Windows `.url` convient). Un `.mp4` posé dans ce dossier est analysé aussi (jamais un chemin hors de `/home/agents/travail/videos`).
Le minuteur `presti-videos.timer` passe toutes les 10 minutes ; pour ne pas attendre : `sudo systemctl start presti-videos.service`, ou
`node scripts/usine/analyse-video.mjs --une-passe` sous le compte `agents`. Une seule analyse à la fois (verrou `analyste.verrou`).

## Lire le résultat

Dans `/home/agents/travail/videos/` :

| Où | Quoi |
|---|---|
| `analyses/<uploader>-<id>.analyse.md` | l'analyse (bandeau, titre, métadonnées exactes, 4 sections, sous-titres lus, notes de vision) |
| `analyses/<uploader>-<id>.notes.json` | les notes brutes (vision + sous-titres), pour recouper |
| `journal.jsonl` | une ligne par événement (téléchargement, images, ocr, image, synthese, analyse, echec, mise_de_cote) |
| `traitees/` | les fichiers de la file déjà faits |
| `a-part/` | mis de côté : trois échecs, ou refus définitif (hôte, 5 min, 60 Mo) ; la cause est dans le journal |
| `etat.json` | essais comptés par fichier ; `tmp/` : travail en cours (repris tel quel après un arrêt) |

`Statut : ok` = synthèse publiée. `Statut : incertain` = la garde des nombres a refusé la synthèse (un nombre qui n'est ni dans les notes ni dans les
métadonnées) : le fichier ne garde alors que les notes brutes. Une vidéo déjà analysée (même compte, même id) n'est pas refaite (`--refaire`).

## Comment ça marche

1. yt-dlp (durée ≤ 5 min, ≤ 60 Mo, 180 s, métadonnées `info.json`), ffprobe confirme durée et taille.
2. Au plus 40 images en 480 px de large (une toutes les 2 s, ou moins souvent pour couvrir toute la vidéo).
3. **Sous-titres par OCR sur toutes les images** (tesseract, `eng+fra`) : la bande basse est isolée par un seuil sur le blanc, agrandie ×3 (≈ 4 s pour
   26 images). Sans tesseract, l'analyse se fait quand même et le dit.
4. **Modèle de vision local `qwen2.5vl:3b`** sur au plus 10 images (`--images-vision=N`, jusqu'à 40) : celles qui changent le plus (écrans, outils). Il recopie
   le texte visible et décrit la scène. Le modèle est déchargé juste après.
5. Synthèse en français par un modèle texte : Ollama Cloud (`gpt-oss:120b-cloud`, souvent à court de quota gratuit), sinon `qwen3:8b` local, sinon le 4B.
6. La garde des nombres (modèle : `scripts/chef/bilan.mjs`) refuse toute synthèse qui contient un nombre absent des notes, des sous-titres, du titre, de la
   description et des métadonnées (essayée sur chaque moteur, puis « incertain »).

## Mesures

Usine : 4 cœurs ARM (Neoverse-N1), 24 Go, sans GPU, partagée avec les autres agents.

| Étape | Mesure |
|---|---|
| Téléchargement | 3 s (1 à 2 Mo) |
| Images + miniatures + OCR de 26 images | ≈ 10 s en tout |
| Vision `qwen2.5vl:3b` | **70 à 125 s par image** (≈ 1 100 jetons d'image : le préremplissage domine, 16 jetons/s) ; 1ʳᵉ image +60 s de chargement |
| Synthèse `qwen3:8b` | 310 à 360 s (le 4B : ≈ 180 s, plus bavard, plus de spéculation) ; Ollama Cloud : instantané tant que le quota gratuit tient |
| Total mesuré | 39 s de vidéo, 10 images lues : **21,7 min** ; 110 s de vidéo, 10 images lues : **31 min** (dont 2 images sautées après 5 min d'attente : voir Limites) |
| Mémoire | modèle de vision ≈ 4,3 Go, `qwen3:8b` ≈ 6,7 Go (un seul à la fois, déchargés après usage) ; le service est limité à 1 Go hors Ollama |
| Temps par minute de vidéo | à ~10 images lues : 20 à 30 min quel que soit la durée (le coût suit le nombre d'images lues, pas la durée) ; +1,5 min par image lue en plus |

Comparaison avec l'analyse faite à la main (`docs/ecommerce/sources/ecomsantiagoo-7664657468739374366.analyse.md`, 55 images regardées), version
sans OCR : l'analyste a retrouvé l'appel final « Comment STORE », la vidéo de brosse de grill virale, la page AliExpress, les captures Shopify, mais
**a raté** StoreMint, Higgsfield, le prix de 35,88 $, la méthode « chercher sur TikTok d'abord » et le récit des sept jours (10 images sur 40 seulement) ;
**s'est trompé** : « brosses à dents » pour une brosse de grill, des totaux Shopify lus à l'écran qui ne sont pas ceux de l'analyse à la main (3 186 $ contre 3 171 $) ;
**a conclu à tort** « rien ne sert Presti » (la méthode de repérage sert Brico Travaux). La synthèse du 8B est plus faible que la lecture humaine quand les
images sont rares : c'est ce que l'OCR des sous-titres (ajouté ensuite) corrige, car il donne le fil de toute la vidéo.

## Limites (mesurées, pas supposées)

- **Pas de transcription audio** : seuls le texte incrusté et l'image sont lus. Une vidéo sans sous-titres perd son fil.
- Le modèle de vision n'en lit qu'une dizaine : les écrans montrés entre deux images lues sont ratés. Les chiffres lus à l'écran peuvent être faux (chiffres voisins
  confondus) : le bandeau le dit, recoupez avant de citer.
- **Ollama est partagé** : quand un autre agent charge son modèle (le preneur passe toutes les 10 min), le modèle de vision est déchargé et une requête peut attendre
  plus de 5 min ; chaque image a trois essais, puis est sautée ; trois images de suite perdues = échec de l'essai (repris au passage suivant, les notes déjà lues sont gardées).
- Ollama Cloud : quota gratuit atteint le 06/10 (erreur 429) ; la synthèse retombe alors sur le 8B local (+5 min).
- `tesseract-ocr` (+ `eng`, `fra`) est un paquet système installé par `apt` sur l'usine le 06/10/2026 ; l'analyste fonctionne sans, avec moins de matière.
- Vidéos publiques seulement : jamais de donnée de prospect, jamais de clé, jamais d'hôte hors liste.

## Installation (déjà faite si `presti-videos.timer` est actif)

`git push origin main`, puis `PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs maj --forcer`, puis
`PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs installer videos`. Dossiers de travail créés par l'analyste lui-même sous
`/home/agents/travail/videos/`. Prérequis : `/home/agents/bin/yt-dlp` (binaire autonome aarch64), `ffmpeg`, `tesseract` (facultatif), Ollama avec `qwen2.5vl:3b`.
