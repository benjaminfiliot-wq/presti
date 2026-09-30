# Règles par plateforme, datées

Créée le 2026-09-29. Chaque règle porte la **date à laquelle elle a été relevée** et sa source. Une règle sans date ne vaut
rien. Ces règles bougent : **relire chacune avant de s'en servir si sa date a plus de 30 jours** (donc avant le 2026-10-25 pour
les plus récentes de cette page). Une règle marquée « à vérifier » n'a pas été mesurée et ne peut pas fonder une publication.
Source, sauf mention contraire : `Ecosysteme-Marketing-Reel-2026-09-25.md`, §4 bis (dossier SaaS/Produit).

## Ce qui vaut pour tous les réseaux

- Outils gratuits seulement ; aucune publicité payante ; R24 : l'accord de Benj sur chaque publication (média et texte exacts).
- **Lien en bio unique** : TikTok et Instagram n'offrent qu'un lien, dans la bio, donc pas de code d'apport par ligne ; une
  vente ne peut pas être rattachée à une ligne avec certitude (voir `../mesure/README.md`). **Liens cliquables** : seulement dans
  les textes où le réseau les rend cliquables (Facebook, LinkedIn : à vérifier réseau par réseau) ; le juge du Crieur n'admet que
  l'hôte `prestiapp.fr` (`lib/crieur/juge.ts`, `adresse_etrangere`). Aucune autre adresse dans un texte.
- **Mention IA** : une voix de synthèse exige la **mention IA** (étiquette IA de TikTok, fiche C07 de la source) ; dire aussi
  « IA » dans le texte quand c'est une IA qui écrit.
- **Licences des actifs** (musique, images, photos, décors) : **CC0** utilisable ; **CC BY** utilisable **avec crédit** inscrit
  dans la légende ou la description ; **CC BY-SA : interdit dans les vidéos** des réseaux (le partage à l'identique s'étendrait
  au film ; l'exception de la démo Lestraque ne vaut que pour la vidéo de la landing). Licence inconnue : refus. Chaque actif
  garde sa licence, son auteur, son adresse et sa date (voir `docs/station/licence-planche.json`).
- Le son est **dans le fichier** ; un film muet est refusé. Piste entre −26 et −19 LUFS (`scripts/video-qa.mjs`, `LUFS_MIN` et
  `LUFS_MAX`), au moins 5 coupes par 10 secondes, format vertical 1080 par 1920.
- Les vidéos d'autrui ne sont ni téléchargées ni transcrites ; les statistiques d'un réseau ne sont pas lues par un script en
  dehors d'une API officielle.

## TikTok — compte @vibecode.clips, destiné à devenir celui de Presti

| Règle | Relevée le | Source |
|---|---|---|
| Voie de publication : l'extension Chrome, onglet **visible** (Chrome gèle la vidéo d'un onglet caché) | 2026-09-22 | chaîne prouvée le 22/09 |
| Fichier au plus 10 Mo par l'extension : réencoder à 9,5 Mo au plus | 2026-09-22 | source de la fiche |
| Le formulaire web n'ajoute pas de son : la musique est dans le fichier | 2026-09-22 | source de la fiche |
| Légende tapée ; chaque mot-clé suivi d'une pause et d'Échap ; au premier dépôt, refuser le bandeau de cookies | 2026-09-22 | source de la fiche |
| La colonne de confidentialité de Studio ment : relire après rechargement, prouver sans cookies | 2026-09-22 | source de la fiche |
| Épingler un commentaire : impossible sur le web | 2026-09-25 | source de la fiche |
| CGU de TikTok (zone EEA, §4.5) : interdit d'extraire des données ou du contenu par un système automatisé non fourni ni approuvé par TikTok. Lecture scriptée de Studio, moissonnage du Creative Center, téléchargement scripté des sons : **interdit** tant que R26 n'est pas tranchée | 2026-09-25 | CGU lues sur la page publique |
| Changement de nom d'utilisateur : environ une fois tous les 30 jours ; nom affiché : environ 7 jours (mesuré sur un autre compte) | 2026-09-21 | source de la fiche |
| Bio : 80 signes au plus ; lien en bio : compte professionnel ou seuil d'abonnés possible | à vérifier | source de la fiche |
| API officielle de publication : privée tant que l'application n'est pas auditée | à vérifier | source de la fiche |
| Pas de « Commente SITE » : aucun agent n'y répond | 2026-09-25 | source de la fiche |

## Instagram — compte @prestiapp

| Règle | Relevée le | Source |
|---|---|---|
| Publora Starter : 15 publications par mois, 3 programmées à la fois, 7 jours d'horizon | 2026-09-25 | source de la fiche |
| Vidéo par le navigateur : refusée ; les Reels passent par l'API Graph officielle, après R6 | 2026-09-09 | mesuré le 09/09 |
| Lien de bio : seulement depuis l'application | 2026-09-25 | source de la fiche |
| Nom : 2 changements tous les 14 jours | 2026-09-25 | source de la fiche |
| Messages privés à froid : non (R5) | 2026-09-25 | source de la fiche |

## Facebook — Page Presti

| Règle | Relevée le | Source |
|---|---|---|
| Vidéo par le navigateur : bloquée à 0 % ; les vidéos de la Page passent par l'API Graph, après R6 | 2026-09-09 | mesuré le 09/09 |
| Une Page ne peut pas écrire la première | 2026-09-14 | mesuré le 14/09 |
| Groupes : jamais de publication promotionnelle, sinon suppression et bannissement | 2026-09-25 | source de la fiche |
| Repli avant R6 : programmation à la main dans Meta Business Suite, geste de Benj, pas une automatisation | 2026-09-25 | source de la fiche |

## LinkedIn — profil du fondateur

| Règle | Relevée le | Source |
|---|---|---|
| Un texte par semaine, par le Crieur, le vendredi à 12 h | 2026-09-25 | source de la fiche |
| Vidéo impossible par le navigateur (champ en shadow DOM) | 2026-09-09 | mesuré le 09/09 |
| Pas de « Commente SITE » : personne n'y répond | 2026-09-25 | source de la fiche |

## Ce que cette page ne dit pas

Aucune règle n'a été mesurée de nouveau le 2026-09-29 : les dates ci-dessus sont celles des mesures d'origine. Un agent qui
publie relit la règle concernée sur la page publique du réseau si elle a plus de 30 jours, et le dit dans la carte à Benj.
