# Inventaire des assets — Presti

Mode **no-capture** : aucun site n'a été crawlé. Les visuels ci-dessous ne sont pas des maquettes —
ce sont des **captures du produit en exécution**, prises par Playwright sur le code de production et
recadrées. C'est le seul intérêt du film : on y voit le vrai logiciel.

Tous les fichiers sont dans `capture/assets/`.

| fichier | dimensions | ce qu'on y voit | rôle dans le film |
|---|---|---|---|
| `crop-msg.png` | 752 × 356 | La demande d'un client telle qu'elle arrive sur la page de l'artisan — une bulle de conversation avec le message entrant. | **Scène 2.** Le déclencheur : quelqu'un écrit. |
| `crop-rep.png` | 648 × 550 | La réponse rédigée par le logiciel, posée dans l'espace de l'artisan, en attente de sa relecture. | **Scène 3.** Le cœur du produit, et la scène la plus importante du film. |
| `crop-devis.png` | 728 × 814 | Un devis chiffré, avec ses postes et son total. | **Scène 4.** La preuve que le chiffrage existe vraiment. |
| `crop-site.png` | 880 × 875 | La page publique de l'artisan, à sa marque. | Réserve — non retenu dans le fil à six scènes, disponible si une scène doit être remplacée. |
| `marque.svg` | vectoriel | La marque Presti. | **Scène 6.** La clôture. |

## Ce qu'il ne faut pas en faire

Ces captures doivent **occuper le cadre**, pas figurer en vignette dans un coin. Un artisan qui
regarde un Reel de logiciel veut voir l'écran, pas un habillage autour d'un timbre-poste.

Le format cible est vertical (1080 × 1920) et les captures sont toutes plus larges que hautes ou
proches du carré : elles seront donc posées au centre, à une échelle qui remplit la largeur utile,
et le mouvement se fera par recadrage et translation à l'intérieur du cadre — jamais par déformation.

## Ce qui n'existe pas

Aucune photo de chantier, aucun visage, aucune voix. Le film est muet et typographique, et il le
reste : c'est un choix, pas un manque.
