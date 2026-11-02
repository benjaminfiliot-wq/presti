## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« offre entreprise, n8n : écrire le vérificateur des fiches de lecture vidéo… ») : rien n'est revenu (`[]`). Aucune règle propre à la tâche ; j'ai appliqué celles de `.claude/rules/` (sous-agent : ni build, ni commit, ni migration).
- **MCP `cerveau`, `chercher` puis `lire`** : `vault/10 Presti/04 Décisions/ADR-001 — Toutes les automatisations dans n8n.md` et `ADR-008 — n8n-first — la logique métier récurrente aussi.md`, lus en entier. Le juge est un outil de contrôle du dépôt, lancé à la main ou par `verifier`. Ce n'est ni une automatisation récurrente ni une logique métier : aucun workflow n8n n'est à créer, et l'ADR-008 ne demande donc pas d'exception écrite. `chercher` a aussi rendu la spécification du juge, `fiches-videos.md` §7 (l. 1020-1027), qui a fixé les cinq contrôles et la mutation imposée (« une transcription retirée doit le faire rougir »).
- **Prompt 5**, `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md:71-88` : le format en huit champs (p5:74-81), les 3 à 8 lignes (p5:75), la marque des chiffres (p5:81), la transcription obligatoire (p5:86).
- **Les fiches jugées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` et `fiches-videos-restructureai.md`, lues, jamais modifiées. Leurs en-têtes ont donné trois conventions que le juge applique : `[h:mm]` pour les cours longs (`fiches-videos.md:7-9`), `[x,y-z,t s]` pour les TikToks, « lu sur une maquette, non vérifié » (`fiches-videos-restructureai.md:15-16`).
- **Le brief Hermes** `plans/011-cadrage-01-11/briefs/fiches-videos-restructureai.md` et l'en-tête 035-009 (`fiches-videos.md:1006-1018`) : ils ont fixé le second mode du juge, un dossier `liste.json` + `<id>.transcription.txt|json` + `<id>.fiche.json`.
- **Les vidéos déjà analysées** : `/home/usine/agents/videos/restructureai/*.transcription.json` (format `{duree, segments[{debut, fin, texte}]}`) et `.info.json`, `docs/connaissance-videos/veille/*/transcription.txt`. Ils ont fixé la recherche des transcriptions : par l'identifiant, puis par le dossier du compte, et les sous-titres `.vtt` pour les cours YouTube.
- **Le juge à mutants existant** `scripts/usine-relais-qa.mjs` (l. 26-29, 663-791) : le patron « chaque capacité retirée sur une COPIE, le banc doit rougir », repris ici.
- **Skill `presti-verify`** : aucun « c'est bon » sans sortie de commande. D'où la sonde sur une copie du vrai fichier : elle prouve que le vert des 11 fiches de @restructureai n'est pas creux. Build et déploiement sont sans objet (interdits aux sous-agents, `securite.md`).
- **Skill `reseau-neuronal`** : le vault en lecture seule, les notes citées par leur chemin. Rien n'y a été écrit (c'est `interdit` de la tâche).

## Ce qui a été livré (périmètre seulement)

| Fichier | Rôle |
|---|---|
| `scripts/fiches-videos-qa.mjs` | le juge, le banc (`--temoins`) et les mutants (`--mutants`) |
| `scripts/fixtures/fiches-videos-qa/temoins.json` | les témoins : une fiche Markdown et un dossier au format 035-009, entièrement fictifs (« Exemple. », identifiants `70000000000000000NN`) |
| `.orchestre/preuves/035-008/mutants.log` | la sortie complète de `node scripts/fiches-videos-qa.mjs --mutants` (code 0) |
| `.orchestre/preuves/035-008/fiches-existantes.log` | la sortie du juge sur les deux fichiers de fiches (code 1), puis la sonde |

Usage : `node scripts/fiches-videos-qa.mjs [<fichier.md | dossier>…]`. Sans argument, il juge les deux fichiers de p5-entreprise. Les autres options sont `--temoins`, `--mutants`, `--transcriptions=<d1,d2>`, `--garder`.

## Les contrôles et leur source

| Code | Ce qui rougit | Source |
|---|---|---|
| FORMAT | un des huit champs absent, en double, hors de l'ordre ou vide ; Source sans « intégralement : oui/non », sans « lue le », sans date de publication ; « Ce qu'elle montre » hors de 3 à 8 lignes (lignes de liste de premier niveau, ou phrases pour un paragraphe) ; une clé JSON hors du schéma ; une vidéo de `liste.json` sans fiche ; une Source JSON sans l'identifiant de la vidéo | p5:73-82, p5:74, p5:75 ; `fiches-videos.md:1022` |
| HORODATAGE | un horodatage au-delà de la durée (+1 s) ou mal formé (minutes ou secondes > 59). Formats lus : `[mm:ss]`, `[h:mm:ss]`, `[h:mm]` si la vidéo dure une heure ou plus, `[x,y-z,t s]`, « image NNN » | `fiches-videos.md:1023` |
| DUREE | des horodatages cités sans aucune durée connue (transcription, `.info.json`, `liste.json`, `.vtt`, ou durée déclarée dans Source ou le titre) : ils sont invérifiables | conséquence de `fiches-videos.md:1023` |
| TRANSCRIPTION | une vidéo sans transcription, ou une transcription vide sans le motif « sans parole » | p5:86 ; `fiches-videos.md:1021` |
| CHIFFRE | un chiffre de « Chiffres annoncés » sans « annoncé par l'auteur, non vérifié » ni « lu(s) sur une/des maquette(s), non vérifié(s) ». Une ligne marquée couvre ses sous-lignes ; un paragraphe est couvert par sa marque | p5:81 ; `fiches-videos.md:1024` ; `fiches-videos-restructureai.md:15-16` |
| RECOPIE | 16 mots consécutifs ou plus en commun avec la transcription (casse, accents et ponctuation ignorés). Source est exclue, car p5:74 y exige le titre | `fiches-videos.md:1025`, `:12` |

## Les mutants (sortie complète : `mutants.log`)

**Niveau 1, le banc : 41 cas, 41 au bon verdict.** Chaque témoin muté doit sortir avec l'ensemble **exact** des codes attendus, ni moins ni plus. Chaque témoin propre doit rester vert : sept cas d'anti-faux-positif.
- Les cas d'anti-faux-positif : la borne de 15 mots, le motif « sans parole », la durée déclarée, le paragraphe marqué, la marque au pluriel « lus sur des maquettes », un paragraphe de 3 phrases sur 2 lignes, une transcription rangée au nom du compte.
- La mutation imposée (`fiches-videos.md:1027`) : `dossier : transcription retirée` donne TRANSCRIPTION. En Markdown, la même mutation donne DUREE+TRANSCRIPTION, puisque la durée venait de la transcription.

**Niveau 2, le juge muté : 31 mutants, 31 tués pour la bonne raison.**
- Chaque contrôle porte un repère de fin de ligne. Un mutant retire cette ligne, ou la transforme (seuil 15 ou 17, héritage de la marque supprimé, motif ignoré, singulier imposé…), dans une **copie** du juge. Le banc de la copie doit alors sortir en 1, avec un rapport (pas un plantage), et rougir sur le cas attendu.
- Une garde rougit si un repère n'a pas de mutant. Je l'ai prouvé sur une copie : un repère `essai-orphelin` ajouté donne `✗ repère(s) sans mutant : essai-orphelin`, puis ROUGE, code 1.

## Les fiches existantes : 27 lues, 15 vertes, 12 rouges (`fiches-existantes.log`, sur Oracle)

**Vertes : les 11 fiches de `fiches-videos-restructureai.md`** (transcriptions trouvées dans `/home/usine/agents/videos/restructureai/`, durées mesurées), plus 3.1, 3.2, 3.3 et 3.4 de `fiches-videos.md`.
- Ce vert n'est pas creux : sur une copie de ce fichier, j'ai injecté 16 mots de la vraie transcription de 7690784360898874645 et un horodatage `[02:10]`. Le juge a rendu RECOPIE (18 mots) et HORODATAGE (130 s pour une durée de 89,3 s), code 1.

**Rouges : ce qui manque, sans rien corriger.** Les fiches sont `interdit`.

| Fiche (`fiches-videos.md`) | Défaut | Ce qui manque |
|---|---|---|
| 2.1, 2.2, 2.3 (cours YouTube) | TRANSCRIPTION | les sous-titres `en-orig` sont sur le PC (`videos/references-2026-11-01/`), pas sur Oracle. Le juge lit les `.vtt` (cas `md-sous-titres-vtt`), mais je n'ai pas pu vérifier ici le nom réel des fichiers |
| 2.1 | CHIFFRE | « Par le client filmé, également non vérifiés : environ 100 000 $… » : la marque de p5:81, « annoncé par l'auteur », manque. L'en-tête du fichier l'exige pourtant aussi pour un client filmé (`fiches-videos.md:7-8`) |
| 2.4 à 2.10 (TikToks du 01/11) | TRANSCRIPTION | les transcriptions faster-whisper sont sur le PC (`videos/references-2026-11-01/tiktok/`), absentes d'Oracle. Sur le PC, le dossier `videos/` est cherché par défaut |
| 2.7, 2.8, 2.9 | FORMAT | « Ce qu'elle montre » tient en 2 lignes ou phrases, pour 3 à 8 exigées (p5:75) |
| 2.10, 3.5, 3.6 | FORMAT | « Ce qu'elle montre » tient en une seule phrase |
| 2.9 | CHIFFRE | les chiffres de maquette (« 26 présents sur 30, 185 600 CHF… ») sont dits « fictifs » mais ne portent pas « lu sur une maquette, non vérifié » |
| 3.5, 3.6 | TRANSCRIPTION | pas d'audio : déjà signalé par la fiche elle-même (`fiches-videos.md:961`) |

Les avertissements ne rougissent pas : 2.1, 2.2, 2.3 et 2.10 ont un bloc en gras hors des huit champs (« Détail de la lecture », l. 200, 299, 363 et 672).

## Limites connues

- Les 12 rouges sont mesurés sur Oracle. Sur le PC, les transcriptions de `videos/references-2026-11-01/` devraient en effacer une partie, si leurs noms portent l'identifiant de la vidéo ou si leur dossier porte le nom du compte. C'est à rejouer là-bas : `node scripts/fiches-videos-qa.mjs`.
- La durée « déclarée » (Source ou titre : « 146,5 s », « 4 h 05 ») n'est qu'une déclaration. Le juge s'en sert faute de mieux et l'indique dans son message.
- Les cibles de 035-009 (`videos/references-2026-11-02/restructureai`) et de 035-010 (`p5-entreprise/complements`) n'existent pas encore : le juge y répond « cible introuvable », en rouge, ce qui est voulu.
- Une source qui n'est pas une vidéo (dépôt, documentation) ne passe que FORMAT et CHIFFRE.
