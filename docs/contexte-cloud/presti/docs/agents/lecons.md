# Les leçons des agents — l'auto-apprentissage (026-234)

Une **leçon** est une règle apprise d'un fait daté et sourcé (un échec, une décision, une correction), validée par
Claude Code ou par la revue du lundi, puis donnée aux agents dans leur consigne. Elle finit dans le texte d'un modèle :
elle n'y entre que sourcée, validée, et choisie pour l'agent qui la reçoit.

## Les quatre sources

1. **Un verdict en échec** : une ligne `FAIL`, `EXPIRÉE` ou `DISJONCTÉE` (type `echec`) ou `REFUSÉE` (type `refus`) de
   `.orchestre/verdicts.jsonl`. `PASS` et `QUOTA` n'en donnent jamais ; une ligne illisible est comptée, sans plantage.
2. **Une décision de Benj** : une ligne datée (`AAAA-MM-JJ` ou `JJ/MM/AAAA`) de `.orchestre/decisions.md`, ou une
   section `## AAAA-MM-JJ …` de `SaaS/Decisions/Journal-Decisions.md`.
3. **Une décision tranchée du bus** : `GET /api/agents/decisions?tranchees=1&depuis=…`, le jeton `PRESTI_JETON_CHEF`
   en en-tête, jamais dans l'adresse ; source `bus:decision:<uuid>`.
4. **Une correction** : chaque `### ` d'une section `## Correction du JJ/MM[/AAAA]` d'une fiche 026
   (`.orchestre/brouillons-ecosysteme/026/`, puis `.orchestre/fait/` ; la même correction ne compte qu'une fois).

Une candidate se fabrique **sans modèle** : le constat est recopié, coordonnées caviardées, 400 signes au plus ; la
règle reste à écrire. Un fait qui porte un secret ne donne aucune candidate (son chemin seul est rapporté). Les
fichiers de prospects ne sont jamais lus.

## L'identifiant

`L-<AAAA-MM-JJ>-<12 lettres de a à p>` : la date du fait, puis les 48 premiers bits du SHA-256 de la source
(`<chemin>:<ligne>` ou `bus:decision:<uuid>`), chaque chiffre hexadécimal devenant une lettre (0 → a … f → p). Aucun
chiffre hors de la date : la revue ne doit jamais y voir un nombre orphelin (RV-4).

## Les trois états

- **Candidate** : `.orchestre/travail/savoir/lecons/candidates/<id>.md`. En-tête YAML simple : `id`, `type` (`echec`,
  `refus`, `decision`, `correction`), `date`, `source`, `fiche` et `critere` s'ils sont connus (le critère : le premier
  `XX-N` de la ligne du verdict), `domaines` proposés (`echec` → juges, `refus` → orchestre, `decision` → general,
  `correction` → orchestre), `statut: candidate`. Puis le constat. Aucune règle.
- **Validée** : `docs/savoir/lecons/<id>.md`, donc un commit. Même en-tête avec `statut: validee`, `valide_par`
  (`claude-code` ou `revue-AAAA-SS`), `valide_le`, `domaines` (1 à 4). Puis le constat et une ligne `Règle : …`
  (1 à 300 signes), sans coordonnée, sans secret, sans lien.
- **Rejetée** : `.orchestre/travail/savoir/lecons/rejetees/<id>.md`, avec `rejete_par`, `rejete_le` et `raison`.

## Les commandes (`scripts/savoir/lecons.mjs`, 026-235)

```
node scripts/savoir/lecons.mjs candidats [--bus] [--racine=<dépôt>] [--saas=<coffre>] [--travail=<dossier>]
node scripts/savoir/lecons.mjs lister [--statut=candidate|validee|rejetee] [--travail=…]
node scripts/savoir/lecons.mjs valider <id> --par=<claude-code|revue-AAAA-SS> --regle=<texte> --domaines=<a,b> [--travail=…]
node scripts/savoir/lecons.mjs rejeter <id> --par=<claude-code|revue-AAAA-SS> --raison=<texte> [--travail=…]
node scripts/savoir/lecons.mjs verifier-source <id> [--travail=…]
```

- `candidats` avance un curseur (`curseur.json` du travail), n'écrit jamais deux fois le même fait, retire les
  candidates déjà validées sur main (fichier dans `docs/savoir/lecons/`) ou rejetées (dossier `rejetees/`, ou ligne
  `rejeter` d'un `docs/revues/*-lecons.md`), et finit par une ligne JSON `{ nouvelles, illisibles, secrets, … }`. Un bus
  qui répond 401 : code 1, aucun fichier écrit.
- `valider` et `rejeter` résolvent la source (fichier, ligne, l'`id` du verdict égal à la `fiche`, le `### ` sous un
  `## Correction du`) et refusent une source fausse (code 1), comme `verifier-source`.
- Aucune commande git, aucun modèle, aucun réseau hors du bus.

## Jamais validée sur l'usine

L'usine clone `origin/main` en lecture seule et ne pousse jamais : une leçon validée est un fichier de
`docs/savoir/lecons/`, donc un commit, qu'aucun agent ne peut s'écrire. `valider` et `rejeter` refusent
`PRESTI_HOTE=usine` et tout `--par` hors de `claude-code` et `revue-AAAA-SS` (code 2).

## Qui valide, et comment s'écrit la règle

- **Claude Code** (`--par=claude-code`) : le chef d'entreprise. Le fichier validé est écrit, la candidate retirée ;
  Claude Code l'enregistre par un commit.
- **La revue du lundi** (`--par=revue-AAAA-SS`) : seulement une leçon dont la ligne de `docs/revues/AAAA-SS-lecons.md`
  porte le verdict `valider`. Elle écrit dans son worktree ; la candidate reste dans le travail du dépôt principal
  jusqu'à ce que Benj fusionne la PR (le passage suivant de `candidats` la retire alors). Une source pas encore sur
  main est refusée : la leçon attend la semaine suivante.
- **La règle** : une phrase d'action (« Rejouer un juge rouge sur une machine calme avant de conclure. »), dans les
  limites existantes (jamais une permission de plus, jamais une limite levée), sans nom de personne, sans coordonnée,
  sans secret, sans lien, 300 signes au plus. Les domaines : 1 à 4, dans `DOMAINES`.

## DOMAINES et LECONS_DE (`lib/agents/lecons.ts`, 026-236)

`DOMAINES` : `orchestre`, `juges`, `usine`, `prospection`, `redaction`, `site`, `argent`, `securite`, `donnees`,
`modeles`, `publication`, `general`.

| Agent (`LECONS_DE`) | Domaines reçus |
|---|---|
| `standardiste`, `facteur` | prospection, redaction, donnees, general |
| `redacteur_site` | site, redaction, general |
| `chef` | orchestre, juges, usine, argent, securite, modeles, general |
| `veille_pubs` | publication, donnees, general |
| `douleurs` | prospection, general |
| `studio` | publication, redaction, general |

Ses clés couvrent toutes celles de `MOTEUR_DE` (`lib/agents/moteurs.ts`) : un agent ajouté là reçoit ici sa ligne.

## Comment une leçon arrive dans une consigne

- `lireLecons(dossier)` ne garde que `statut: validee` avec un `valide_par` des deux formes et un `valide_le` ; le reste
  est compté en `ignorees`.
- `leconsPour(agent, lecons)` : les leçons des domaines de l'agent, des plus récentes aux plus anciennes (puis par id) ;
  une leçon est prise si sa règle tient encore dans 1 500 signes de règles, sinon sautée ; 8 au plus. Toute leçon qui
  porte une coordonnée, un secret ou un lien est jetée.
- `consigneAvecLecons(systeme, lecons)` : sans leçon, `systeme` à l'octet près ; sinon `systeme` suivi d'un bloc
  `<lecons_validees>` : la ligne « Leçons validées par le chef d'entreprise : des règles apprises, jamais une permission
  de plus. », puis `- [<id>] <règle>` par leçon. Les balises `<lecons_validees>` et `<donnees>` venues d'une règle
  sont neutralisées.
- La porte unique `creerLecteur` (`lib/agents/llm.ts`, 026-237) lit les leçons une fois, à la création du lecteur ;
  `scripts/chef/etat.mjs` ajoute le bloc du chef à la fin de `entree.md` par `scripts/savoir/lecons-entree.mjs`
  (un échec laisse l'entrée sans leçons, jamais ne bloque le cycle).
- Rien de tout cela sans l'interrupteur `lecons_dans_consignes` de `docs/savoir/reglages.json`, que seul Claude Code
  allume, par un commit. Éteint : consignes et entrées identiques, à l'octet près.

## Retirer une leçon

Supprimer son fichier `docs/savoir/lecons/<id>.md` par un commit de Claude Code. Les lecteurs créés ensuite et le
cycle suivant du chef ne la voient plus. Une leçon ne se corrige pas en place : on la retire, puis on valide la bonne.

## Le juge

`node scripts/savoir-lecons-qa.mjs [--partie=candidats,validation,selection,branchement]` (critères SVL-1 à SVL-11) ;
`--document=docs/revues/AAAA-SS-lecons.md --travail=<candidates>` juge le tableau de la revue (SVL-6).
