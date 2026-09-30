---
workflow: product-launch-video
flow: autonomous
destination: instagram-reels
aspect: 9:16
width: 1080
height: 1920
duration: 15
capture: no-capture
VO_MODE: none
---

# Presti — Reel de lancement

## Intent

**Montrer le produit tel qu'il est.** Les captures réelles de Presti sont déjà sur le disque et
constituent les assets vedettes du film. Ne rien inventer, ne rien scraper, ne substituer aucun
visuel de stock : le seul intérêt de ce film est qu'on y voit le vrai logiciel.

## Message

Un client écrit à l'artisan pendant qu'il est sur un chantier. Le logiciel prépare la réponse et
chiffre le devis. L'artisan relit, et c'est lui qui envoie.

## Angle

**L'artisan garde la main.** C'est le seul argument que le produit tient vraiment, et c'est le seul
que la concurrence n'affiche pas — tout le monde promet l'automatique. Ici l'aveu est l'argument :
rien ne part sans l'artisan, sauf un accusé de réception à son nom. Cette honnêteté est le cœur du
film, pas une note de bas de page.

## Public

Un artisan du bâtiment français — plombier, couvreur, carreleur — 44 ans, à son compte, en
Charente-Maritime. Il regarde ça sur son téléphone, le soir, après le chantier. Il se méfie du
marketing et il repère une promesse creuse en deux secondes. Rien de corporate, rien de startup.

## Identité de marque

Palette exacte, à ne pas réinterpréter :

| rôle | valeur |
|---|---|
| fond nuit | `#0A0C11` |
| accent corail | `#D97757` |
| texte clair | `#EDEFF4` |
| crème | `#F3EEE6` |

**Motif signature : l'aube.** Une lumière chaude corail qui monte du bas du cadre, et un trait
d'horizon fin — crème au centre, corail aux extrémités, disparaissant sur les bords. C'est le trait
du logo. Il doit revenir au moins deux fois dans le film.

**Polices de marque**, à inliner en base64 depuis `promo-src/fonts/` :

- `bg700.woff` — display, graisse 700, `letter-spacing: -0.035em`, `line-height: 0.95`
- `hg500.woff` — sous-lignes et libellés, graisse 500
- `hg400.woff` — texte courant, graisse 400

Contraste de graisse dramatique entre le display et le reste. Aucune police système, aucun lien
Google Fonts.

## Assets réels — les vedettes du film

Dans `promo-src/` (dépaquetés par `scripts/promo-video.mjs`, présents sur le disque) :

| fichier | ce que c'est |
|---|---|
| `crop-msg.png` | le message d'un client tel qu'il arrive |
| `crop-rep.png` | la réponse préparée par le logiciel |
| `crop-devis.png` | le devis chiffré |
| `crop-site.png` | la page de l'artisan |
| `marque.svg` | la marque Presti |

Ces captures viennent du produit en exécution, pas d'une maquette. Elles doivent occuper le cadre,
pas figurer en vignette.

## Le fil — six scènes, texte à reprendre mot pour mot

1. **0 → 2,5 s** — L'aube monte, le trait d'horizon se dessine.
   « Vous êtes sur un chantier. » / sous-ligne : « Les mains prises. »
2. **2,5 → 5,2 s** — Coupe franche. `crop-msg.png` entre dans le cadre.
   « Un client vous écrit. » / « Il attend. Pas toujours longtemps. »
3. **5,2 → 8,2 s** — `crop-rep.png`. Le cœur du film.
   « La réponse est déjà écrite. » / « Vous la relisez. Vous l'envoyez. »
   Le mot **« Vous »** doit être visuellement plus fort que le reste.
4. **8,2 → 11,0 s** — `crop-devis.png`, avec un compteur qui monte de 0 à **2 358 €**, chiffres
   tabulaires. « Et le devis est chiffré. » / « sur vos prix à vous. »
5. **11,0 → 13,2 s** — L'aveu. Plus calme, plus petit, mais pas traité comme une transition : c'est
   la scène qui rend les quatre précédentes croyables.
   « Rien ne part sans vous. » / en corail, plus petit : « Sauf un accusé de réception. »
6. **13,2 → 15,0 s** — L'aube revient, plus large. `marque.svg`, puis :
   « 29 € par mois. Essai sans carte. » et, discret en bas : « prestiapp.fr »

## Mouvement

Coupes franches partout. **Une seule** transition shader, au passage 5 → 6, chaude et cinématique —
jamais un glitch. Chaque scène garde du mouvement après son entrée ; rien ne reste figé. Entrées
décalées de 0,1 à 0,3 s après le début de scène, jamais à zéro.

## Interdits — vérifiés dans le code, non négociables

- **Aucun visage humain, aucun avatar, aucune voix de synthèse.** Loi n° 2023-451 art. 5 : mention
  « Images virtuelles » obligatoire dès qu'un procédé d'IA représente un visage en communication
  commerciale. On ne s'approche pas de cette zone.
- **Aucune photo de chantier générique, aucun stock.** Le film est typographique et montre le vrai
  produit, rien d'autre.
- **Ne jamais écrire ni suggérer** : « répond automatiquement à votre place », « gagnez 5 à 10 heures
  par semaine », « mise à jour automatique de vos tarifs ». Les trois sont fausses.
- **Aucun chiffre inventé.** Les seuls nombres autorisés dans ce film sont **2 358 €** et **29 €**.
- Le nom s'écrit **PRESTI**. Jamais « Preti ».

## Rendu

**Local uniquement.** Pas de rendu cloud, pas de crédits HeyGen. Sortie MP4 dans `public/promo/`.

## Customizations

- Featurer les captures d'écran réelles du produit comme assets vedettes du film (show-it-as-is).
- Le film est **muet** : pas de voix off, pas de musique à ce stade. Le texte incrusté porte le sens.
- Format vertical strict 1080×1920 — la destination est un Reel Instagram, pas un site.
