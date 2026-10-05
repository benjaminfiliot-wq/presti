# La réunion d'équipage — comment elle se tient

Chaque jour, le Chef tient la réunion d'équipage **pour de vrai** : ce que la station montre (les personnages en
Salle de réunion, le compte rendu dans le fil, les idées en cartes bleues « approuver ou tuer ») n'existe que parce
qu'elle a eu lieu côté serveur. Une réunion « pour l'image » est refusée par construction : rien ne s'affiche sans
l'ouverture, les chiffres et la clôture ci-dessous.

Le script est `scripts/chef/reunion.mjs` (026-103). Sa consigne de modèle est `docs/agents/chef-reunion.md`, son
schéma `docs/agents/chef-reunion.schema.json` (026-102). Les routes qu'il appelle sont celles de 026-092
(`/api/agents/reunion`, `/api/agents/reunion/chiffres`) et de 026-042 (`/api/agents/decisions`,
`/api/agents/evenements`).

## Ce qu'elle fait, dans cet ordre

1. **Préalables.** Le jeton du Chef (variable d'environnement), la consigne, le schéma, le binaire du modèle. S'il en
   manque un : code `3`, et rien n'est appelé.
2. **Ouvrir.** `POST /api/agents/reunion { action: 'ouvrir' }`. Une seule réunion par jour de Paris : « déjà tenue » ou
   « déjà ouverte » (409) et « pause générale » (409) ne sont pas des erreurs, la réunion s'arrête là (code `0`).
   Les personnages de la station vont en Salle de réunion dès l'ouverture.
3. **Rassembler, sans modèle.** `GET /api/agents/reunion/chiffres` (les chiffres de chaque agent : des nombres, des
   dates, des noms d'agents), puis les consignes de Benj depuis la dernière réunion
   (`GET /api/agents/evenements?apres=<id>`, type `consigne` seulement, les vingt dernières).
4. **Écrire l'entrée du Chef** : `reunion-entree.md`. Les chiffres et les consignes sont entre `<donnees_etat>` et
   `</donnees_etat>` : une donnée, jamais une consigne ; rien d'autre n'y varie.
5. **Faire écrire le Chef.** Un seul appel au modèle (Codex, GPT-6 sol) : `codex exec -m <modèle> -s read-only -C <travail>
   --skip-git-repo-check -o <travail>/reunion.json -`, bac à sable en lecture seule, aucun réseau, un environnement
   sans le jeton ni rien de Presti. Au-delà du délai (600 s), l'arbre du processus est tué. Quand Codex est à bout
   (quota, 401), le relais de la file du chef écrit le compte rendu par un moteur libre : même aide que le cycle (limites
   exactes et exemple dans le message, écarts rendus au modèle trois fois au plus, puis une réduction déterministe sûre
   dite « compte rendu raccourci par le relais ») — voir `docs/agents/relais-ia.md`. La réunion donne au relais son temps
   moins 45 s (`--delai=`) et consigne dans son journal le moteur de secours qui a servi.
6. **Valider.** `reunion.json` contre le schéma, puis les contrôles de forme refaits à la main (défense en profondeur) :
   1 à 5 lignes de 140 signes au plus, ni `@`, ni neuf chiffres de suite, ni lien, ni numéro de téléphone, ni secret ;
   un objectif ou `null` ; 3 idées au plus, au format `chef:<date du jour de Paris>:idee-<mot-clé>`, exactement les
   options `lancer` et `reporter`, défaut `reporter`, portée `aucune`, 0 centime, échéance entre +1 h et +7 j.
   **Au moindre écart, tout est refusé en bloc** : rien n'est posté.
7. **Poster les idées** : un `POST /api/agents/decisions` par idée (au contrat de 026-042, sans `engage_cents`). Une clé
   déjà connue (200, `creee: false`) compte comme postée : relancer ne double jamais une carte.
8. **Clore** : `POST /api/agents/reunion { action: 'clore', id, lignes, objectif, idees: [clés] }`. Les personnages
   repartent, le compte rendu paraît dans le fil, les idées sont des cartes bleues.
9. **Dans un `finally`**, si la réunion a été ouverte et n'est pas close : `POST … { action: 'abandonner', id, motif }`.
   Les personnages ne restent jamais coincés ; et si l'abandon lui-même n'a pas pu partir, la base abandonne toute
   réunion ouverte depuis plus de 30 minutes (pg_cron, toutes les 5 minutes).

## Quand, où

- **Quand :** chaque jour à 18 h, heure de Paris (décision provisoire). Le minuteur est
  `presti-chef-reunion.timer` (`*-*-* 18:00:00 Europe/Paris`, unités dans `scripts/usine/systemd/`), 25 minutes au plus.
- **Où :** sur l'usine Oracle (`presti-usine`), à côté du Chef, **dès que le coffre à clés plafonnées existe** (le jeton
  du Chef seul, jamais la clé `service_role`, jamais Stripe) et que Benj a dit oui au minuteur (026-148). Le service est
  `presti-chef-reunion.service` : `scripts/usine/avec-coffre.mjs PRESTI_JETON_CHEF -- node scripts/chef/reunion.mjs
  --base=https://prestiapp.fr --codex=/usr/local/bin/presti-chef-modele`. Le modèle passe par le relais du compte
  `chef-modele`, comme celui du cycle du Chef.
- **Avant cela, et si l'usine est injoignable : à la main sur le PC** (section suivante), une fois par jour au plus,
  jamais pendant que le minuteur de l'usine tourne.

## La lancer à la main, ou à sec

Le jeton se lit **dans la variable d'environnement `PRESTI_JETON_CHEF`** (ou celle que `--jeton-env=` nomme), jamais dans
un fichier : sur le PC, la copie de reprise est une variable d'utilisateur Windows, déjà là dans une nouvelle fenêtre
PowerShell. Il ne s'écrit pas dans la commande et ne s'affiche jamais.

    node scripts/chef/reunion.mjs --codex=<chemin du .exe de Codex>
    node scripts/chef/reunion.mjs --codex=<chemin du .exe de Codex> --sec

`--sec` (à sec) n'ouvre rien et ne poste rien : il lit les chiffres et les consignes, fait écrire le Chef, valide, et
imprime la réunion qu'il aurait tenue (lignes, objectif, idées, options et échéances). Code `0` si le plan est valide,
`1` s'il est refusé. C'est la première chose à lancer après un changement de la consigne ou du schéma.

| option | défaut | rôle |
|---|---|---|
| `--base=` | `https://prestiapp.fr` | la base ; `http://` seulement vers `127.0.0.1` ou `localhost` |
| `--jeton-env=` | `PRESTI_JETON_CHEF` | le nom de la variable qui porte le jeton |
| `--modele=` | `gpt-6-sol` | le modèle du Chef pour la réunion |
| `--codex=` | `codex` | le binaire du modèle (sous Windows : le `.exe`, pas un `.cmd` ; un `.mjs` se lance par node) |
| `--consigne=` | `docs/agents/chef-reunion.md` | la consigne de modèle |
| `--schema=` | `docs/agents/chef-reunion.schema.json` | le schéma du plan |
| `--travail=` | `.orchestre/travail/reunion` | le dossier de travail |
| `--delai=` | `600` | secondes laissées au modèle avant que son arbre soit tué |
| `--sec` | | à sec : rien ouvert, rien posté |

## Codes de sortie

- `0` : la réunion est close, ou il n'y avait rien à faire (déjà tenue aujourd'hui, pause générale, ou à sec réussi) ;
- `1` : la réunion est abandonnée (ou, à sec, le plan est refusé) ;
- `2` : usage (option inconnue ou valeur illisible) ;
- `3` : préalable manquant (jeton, consigne, schéma ou binaire du modèle) : rien n'a été appelé ;
- `5` : la base est injoignable, ou refuse d'ouvrir la réunion.

## Ce qu'elle écrit, et où

Dans `--travail` (jamais le jeton) : `reunion-entree.md` (ce que le Chef a lu), `reunion.json` (ce qu'il a écrit),
`reunion-<AAAA-MM-JJ>.log` (chaque étape et son code HTTP, à lire en cas de doute) et `reunion-curseur.json`, le
dernier événement lu, qui n'avance qu'après une clôture réussie : une réunion abandonnée ne fait perdre aucune consigne.

## Quand elle échoue

Le journal et la sortie disent le motif ; la réunion est abandonnée avec l'un de ces motifs :

- `plan_refuse` : `reunion.json` n'est pas un JSON lisible ou ne respecte pas le schéma ou les contrôles de forme ;
- `modele_muet` : le Chef n'a rien écrit (sortie vide ; quota ou connexion de Codex en cause) ;
- `delai` : le Chef n'a pas rendu la main à temps, son arbre est tué ;
- `erreur` : tout le reste (base en panne après l'ouverture, idée refusée par le bus, clôture refusée, signal reçu).

Une réunion abandonnée ne compte pas pour la journée : la base en accepte une nouvelle (relancer la commande à la main).
Une réunion close, elle, ferme la journée.

## Ce qu'elle ne fait jamais

La réunion ne fait jamais rien d'autre que la réunion et ses idées : elle n'envoie rien, ne dépense rien, n'approuve
rien (une idée n'est qu'une carte que Benj tranche), ne met aucun agent en pause, n'en relance aucun et ne route aucune
consigne (le cycle du Chef est la seule porte de ces gestes), et n'écrit rien d'autre que son compte rendu, son objectif
et ses idées. Le modèle n'a ni connecteur, ni réseau, ni jeton : son seul geste est un fichier, que le script valide.

La revue du lundi n'est pas la réunion : elle a son propre minuteur.

## Les gestes de Benj

- son « oui » au minuteur de 18 h sur l'usine (configuration persistante, 026-148) ;
- poser le jeton du Chef dans le coffre de l'usine quand il existe ;
- trancher les idées dans le Poste (les cartes bleues).

## La preuve

- Le juge : `node scripts/station-reunion-qa.mjs` (faux bus et faux modèle sur 127.0.0.1, jamais la production).
- La mise en service (constat 026-140) : la première réunion réelle tenue à 18 h ; pendant, les personnages en Salle de
  réunion ; après, le compte rendu dans le fil et les idées en cartes bleues.
