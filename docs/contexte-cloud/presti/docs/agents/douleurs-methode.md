# La bibliothèque des douleurs : méthode

Fiche 026-073. Module : `lib/agents/acquisition/douleurs.ts` (`DOULEURS`, tableau gelé). Juge : `scripts/douleurs-qa.mjs`.

## À quoi ça sert

Chaque entrée est une phrase que des artisans du bâtiment ont écrite eux-mêmes en public. La question qui en est tirée, une fois approuvée, entre mot pour mot dans le premier message (`{douleur}` des modèles A et B) et l'accroche d'objet sert à comparer des objets. Un message qui porte vient d'un fait réel, pas du volume.

## D'où viennent les entrées

- Des pages publiques que tout le monde lit sans compte : forums de métier, questions publiques, rubriques de conseils.
- Jamais par prospect, jamais la page d'un artisan que l'on démarche, jamais en moissonnant des profils. Aucune liste de personnes.
- La page source est celle du fil ou de l'article, jamais celle d'un auteur.
- Les sources sont lues comme le fait le juge : robots.txt d'abord (`PrestiRecenseur`, sinon `*`), une requête par seconde et par hôte, en UTF-8 (les pages en ISO-8859-1 sont écartées, leurs accents ne se retrouveraient pas). Une source illisible (connexion exigée, robots.txt qui interdit, blocage) ne sert pas.
- Les messages écrits par un tiers qui n'exerce pas le métier (étude de marché, promotion d'un outil, sondage) ne sont pas des douleurs : seuls comptent ceux d'artisans qui parlent de leur propre travail.

## Ce qui est interdit

- Toute donnée personnelle dans un champ : pas de pseudo, de nom, de ville, de photo, d'adresse e-mail, de téléphone, de lien de profil, de `@` ni de `u/`.
- Une citation inventée, reformulée, corrigée ou raccourcie au milieu d'un mot : elle est recopiée telle qu'écrite, fautes comprises, en 200 signes au plus, et doit se retrouver mot pour mot sur sa page (DL-4).
- Une source d'un domaine de `DOMAINES_EXCLUS` ou une page de profil (`/user/`, `/u/`, `/profil`, `/membre`).
- Dans la question : un chiffre, une promesse, un nom de concurrent, un terme de la liste noire de J3, « Presti ». Une phrase, au vouvoiement, qui finit par « ? », 160 signes au plus.

## Comment Benj approuve

Toutes les entrées naissent à `approuve: false`. Benj lit la bibliothèque une fois (une vingtaine de minutes) et dit lesquelles approuver. Claude Code écrit `.orchestre/preuves/026-073/approbation.txt` (date et mots de Benj), passe ces entrées à `approuve: true` dans un commit à part, puis relance le juge. Seules les entrées approuvées entrent dans un message.

## La passe mensuelle

Chaque mois, une nouvelle fiche du même modèle ajoute des entrées : elle n'en réécrit, n'en retire et n'en approuve jamais une existante. Chaque nouvelle entrée est relue par le juge sur sa page avant de compter.

## Cible

Décision du 29/09/2026 (`.orchestre/decisions.md`) : la cible du critère DL-1 est provisoirement de 12 citations réelles sur 3 métiers au moins (3 entrées au moins par métier couvert, 10 « tous » au plus). La complétion à 40 citations sur 8 métiers est la fiche de suite 026-254. Un nombre sous la cible fait toujours échouer le juge, comme une citation introuvable sur sa page.

## Sources relues (relève du 2026-09-29)

| Source | Page | Métier | Entrées |
|---|---|---|---|
| plombiers-reunis.com (forum de plombiers et chauffagistes) | fil « Que pensez vous des plateformes de mise en relation? » (topic8048) | plombier, tous | 3 |
| plombiers-reunis.com | fil « Que pensez vous des plateformes de mise en relation » (topic9863) | plombier | 1 |
| plombiers-reunis.com | fil « Avis sur création entreprise » (topic8284) | plombier, chauffagiste | 4 |
| plombiers-reunis.com | fil « Décennale et responsabilité civile professionnelle » (topic9711) | chauffagiste | 2 |
| volta-electricite.info (forum d'électriciens) | sujet 13016 « Besoins de conseils pour établir mon premier devis... » | électricien | 2 |
| volta-electricite.info | sujet 12472 « Méthode de devis » | électricien | 2 |

Les deux robots.txt ont été lus le 2026-09-29 : aucune de ces pages n'y est interdite. La sortie du juge, page par page (code HTTP, « retrouvée » ou « absente »), est dans `.orchestre/preuves/026-073/relecture-detail.log` (une ligne par entrée) ; le verdict du juge est dans `verifier.log` et les quatre sabotages dans `sabotages.log`.
