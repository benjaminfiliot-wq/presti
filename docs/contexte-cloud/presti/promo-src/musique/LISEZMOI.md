# Les musiques des dix publications

**Trois pistes pour dix films**, choisies par Benj le 2026-09-10 après écoute — « comme ça ça fait
de la variation ». Les voix off ont été retirées le même jour (« enlève les voix c'est horrible »).

> ⚠️ **Ces fichiers sont la source du son livré.** Sans eux, un re-rendu des vidéos repart muet.
> Ils sont versionnés ici pour cette raison, comme les polices et les captures.

## La licence, et ce qu'elle autorise vraiment

Les trois sont sous **Pixabay Content License** — <https://pixabay.com/service/license-summary/>.

| Ce qu'on a le droit de faire | |
|---|---|
| Usage **commercial** | ✅ CGU §5 : droit « irrevocable, worldwide, perpetual, non-exclusive and royalty-free right to download, use, copy, modify or adapt the Content for commercial or non-commercial purposes » |
| **Sans attribution** | ✅ CGU §6 : « You do not need to credit Pixabay or the contributor of Content when you use it » |
| **Sans partage à l'identique** | ✅ aucune clause ShareAlike — c'est ce qui disqualifiait le CC BY-SA (cf. le piège des photos de démo) |
| Facebook / Instagram | ✅ nommés explicitement dans la FAQ Pixabay |

**Ce qu'il ne faut PAS faire** : redistribuer une piste **seule** (la revendre ou la republier comme
fichier audio). L'intégrer à une vidéo est précisément l'usage prévu.

## ⚠️ Le risque qui subsiste, et il n'est pas juridique

Deux des trois pistes sont du studio **Musinova**, qui revend **le même catalogue sous licence
payante ailleurs** (music-bay.net 7–99 €, Pond5, packs itch.io). La licence Pixabay reste
irrévocable — rien à craindre côté droit — mais un ayant droit qui vend à 99 € a un intérêt
économique direct à empreinter son catalogue chez un distributeur.

**Conséquence concrète : un match Meta Rights Manager peut couper l'audio d'une publication DÉJÀ en
ligne.** Ce n'est pas une violation, c'est une réclamation automatique, et elle se conteste — mais
la pub tourne en silence pendant ce temps.

La piste 4 (**Databend**) ne présente pas ce profil.

**Les publications exposées** (celles qui partent sur Facebook ou Instagram avec une piste
Musinova) : **01**, **08**, **09**. Si l'une se fait couper, la parade est immédiate — repasser
`musique-poser.mjs` avec la piste 4 sur cette publication, une seconde par fichier.

## Les trois pistes

| # | Titre | Auteur | Durée | Page |
|---|---|---|---|---|
| 1 | Minimal Techno Electronic Underscore | Musinova | 1:40 | <https://pixabay.com/music/ambient-minimal-techno-electronic-underscore-534592/> |
| 2 | Ambient Technology IDM Background | Musinova | 1:48 | <https://pixabay.com/music/ambient-ambient-technology-idm-background-560603/> |
| 4 | Dark Electronic Pulse Background | Databend | 1:44 | <https://pixabay.com/music/electronic-dark-electronic-pulse-background-546935/> |

*(La piste 3, « Dark Folktronica » de SamuelFJohanns, avait le profil de licence le plus sûr mais
n'a pas été retenue à l'écoute. Sa page reste notée si le besoin revient :
<https://pixabay.com/music/ambient-dark-folktronica-dark-pulse-505326/>)*

## Qui a quoi, et pourquoi

La musique suit le **propos** de la publication, pas un tour de rôle mécanique. Et chaque film
entre à un **endroit différent** du morceau : sans ça, les trois ou quatre publications qui
partagent une piste sonneraient identiques.

| Pub | Piste | Entrée | Pourquoi celle-là |
|---|---|---|---|
| **01** | 1 · minimal techno | 8 s | Le vaisseau amiral : le plus de matière, le plus de coupes. La grille de ticks fait métronome |
| **03** | 1 · minimal techno | 40 s | Un mécanisme qui retire quelque chose — un rythme régulier le dit mieux qu'une nappe |
| **07** | 1 · minimal techno | 68 s | « Trois prix, rien de caché » : net et cadencé |
| **02** | 2 · ambient IDM | 8 s | Explicative, dense en texte. La plus discrète des trois (−13,1 LUFS) : la typo domine |
| **08** | 2 · ambient IDM | 45 s | On entre dans le *breakdown* nu du morceau — la capture d'écran doit porter le plan seule |
| **09** | 2 · ambient IDM | 75 s | Camion, dépôt, chantier : pratique, sans emphase |
| **10** | 2 · ambient IDM | 30 s | Le premier abonné. C'est intime, pas sombre — la piste 4 aurait mal lu le moment |
| **04** | 4 · dark electronic | 8 s | Confidentialité, quatre mécanismes : le sujet le plus grave du lot |
| **05** | 4 · dark electronic | 40 s | La facture électronique n'est pas une option, c'est une contrainte imposée |
| **06** | 4 · dark electronic | 70 s | Le seul aveu d'échec du lot : « je l'ai testée, elle a raté » |

## Le réglage, et pourquoi il n'est pas celui de la voix

La voix off était normalisée à **−16 LUFS** : un niveau de premier plan, celui d'un présentateur.
C'est en grande partie ce qui la rendait envahissante. La musique est posée à **−23 LUFS** — un lit
de fond. Fondus de 1,2 s à l'entrée, 2,5 s à la sortie, pour qu'elle s'efface sous la marque finale.

## Refaire, ou changer

```bash
node scripts/musique-poser.mjs promo-src/musique/1-minimal-techno.mp3 01 --depart=8
```

Le script **ne re-rend rien** : il remplace la piste audio d'un MP4 déjà rendu, image copiée telle
quelle. Une seconde par fichier. Il refuse de boucler une musique trop courte (une couture
s'entend), il remesure avant de remplacer, et il **sort en erreur s'il n'a traité aucun fichier** —
garde-fou ajouté après qu'un appel mal formé ait affiché « ✓ 0 fichier(s) sonorisé(s) » en sortant
tranquillement en 0.

Pour **remettre les voix** : `node scripts/voix-mixer.mjs NN`. Les `publications/pub-NN/voix.mp3`
sont toujours sur le disque.
