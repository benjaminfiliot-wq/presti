# Publier sur TikTok, avec l'accord de Benj sur chaque vidéo (C07)

*Fiche 026-210. Garde : `scripts/contenu/publier-tiktok.mjs`. Règle R24 ouverte : chaque vidéo demande l'accord explicite de Benj sur sa version exacte (média et texte). Compte : @vibecode.clips, destiné à devenir celui de Presti. Règles de la plateforme, datées : [plateformes](plateformes/README.md).*

## Deux phases, et une seule est ouverte

**Phase 1 (la seule ouverte) : Chrome visible et l'extension.** L'agent publie dans l'onglet **visible** de Chrome (Chrome gèle la vidéo d'un onglet caché), par l'extension, comme la chaîne prouvée le 22/09. Le script ne clique jamais « Publier » : il dit si la publication est permise, et prouve ce qui a été publié.

**Phase 2 (fermée) : Playwright avec ouverture de session par QR.** Elle ne s'ajoute qu'après une preuve séparée (une fiche à elle), et jamais avec une lecture scriptée de TikTok Studio.

## La garde avant de cliquer

`verdictPublicationTikTok(video, { decision, pauseGenerale, ligneSuspendue, drapeauLeve })` lit le rendu, la légende, le texte incrusté, la miniature, la description, l'état du drapeau, le verdict de ligne et l'accord. Elle refuse dans cet ordre :

1. entrée incomplète, pause générale, ligne suspendue, drapeau baissé ;
2. fichier de plus de 9,5 Mo (l'extension plafonne à 10 Mo), ou de taille inconnue ;
3. une affirmation chiffrée sans source, ou dont `jev noul --provider laya` rend moins de 0,5, ou une panne de Laya : **bloqué, renvoyé à Benj** ;
4. l'absence d'accord individuel : décision `tranchee`, choix `accorder`, visant **cette** vidéo, sur **cette** version. Un accord d'une autre vidéo, d'une ancienne version, d'une première série ou d'une ligne, ou un score de Laya, n'autorise rien.

La carte de l'accord se prépare avec `lib/contenu/accord.ts` (`preparerDemandeAccord`), voir [accord](accord.md).

Écart connu (04/10/2026) : pour Instagram et Facebook, les contrôles automatiques de la ligne remplacent l'accord individuel
(décision du 30/09, confirmée par Benj le 04/10 : `lib/contenu/lignes.ts`, `lib/contenu/metaPublier.ts`). Le chemin TikTok, lui,
exige encore cet accord (point 4 ci-dessus, critère TT-2 de `contenu-qa --partie=tiktok`) : le geste est un clic dans un Chrome visible,
sans API, et l'aligner sur les contrôles automatiques est un changement de code et de juge à part, pas un changement de texte.

## Le geste de publication (Chrome visible)

1. Déposer le fichier (9,5 Mo au plus). La musique est **dans le fichier** : le formulaire web n'en ajoute pas.
2. Au premier dépôt, refuser le bandeau de cookies.
3. Taper la légende ; pour chaque mot-clé, une pause puis Échap.
4. Vérifier l'**étiquette IA** (voix de synthèse) et l'écran final. Étiquette absente : ne pas publier.
5. Cliquer **Publier**, seulement si le verdict est `ok`.

## Après la publication

- Recharger la publication et prouver l'adresse publique **sans cookies** : `preuvePublique(url)`. La colonne de confidentialité de Studio ment ; seule la page publique fait foi. Un état autre que 200, ou une page injoignable : « en attente », jamais un succès.
- Ranger la preuve, horodatée, dans `contenu_posts` : `ligneContenuPost(...)` ne prend que des champs de la liste blanche (adresse publique, heure, cible de l'accord). **Jamais la session, les cookies ni une capture de compte.**

## Les échecs sont des échecs

Onglet caché, bandeau de cookies qui revient, vérification automatique (« êtes-vous un robot ? »), bouton Publier bloqué : on s'arrête, on note l'échec, on n'insiste pas et on ne relance pas à l'aveugle. Avant toute reprise, on vérifie l'état réel de TikTok (la vidéo est-elle déjà en ligne ?) pour ne pas publier deux fois.

## Ce que ce script ne fait jamais

- Lire TikTok Studio ou le Centre de création (CGU de TikTok, zone EEA, §4.5 : interdit tant que R26 n'est pas tranchée).
- Télécharger ou transcrire la vidéo d'autrui.
- Publier sans l'accord individuel de Benj.
- Garder une session, un cookie ou un jeton.

Aucune publication réelle n'est un effet du juge (`node scripts/contenu-qa.mjs --partie=tiktok`).
