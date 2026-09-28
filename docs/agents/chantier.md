# Le chantier (A12) — consigne

Une idée que Benj a tranchée « lancer » devient une fiche de l'orchestre, avec **son juge**, proposées ensemble dans une
PR. Benj fusionne (ou non) ; ensuite seulement, la fiche est déposée dans `.orchestre/file/`, un exécutant la fabrique
et le juge la tranche. **La routine ne fusionne jamais.**

## Qui, où, quand

- **Claude Code, sur le poste de Benj**, dans une session à lui (lancée à la main, ou par une tâche planifiée du poste),
  au plus une fois par jour.
- Le chantier **n'est pas le travail du cycle du chef** : ni le cycle plein, ni le cycle léger, ni les minuteurs de
  l'usine ne le lancent, et aucun script de `scripts/chef/` autre que `chantier.mjs` ne l'appelle (026-148). Sur
  l'usine, le modèle n'a pas de réseau, un juge ne vient jamais de Codex, et la clé du dépôt y est en lecture seule.
- **Aucun connecteur** : ni Supabase, ni Gmail, ni Vercel, ni navigateur. Les seuls accès au réseau sont ceux de
  `chantier.mjs` (vers `--base`) et de `git` et `gh` (la branche et la PR).
- Le jeton est `PRESTI_JETON_CHEF`, la copie de reprise du poste (variable d'utilisateur Windows) : jamais affiché,
  jamais passé en argument, jamais écrit.
- Le dépôt principal porte le travail d'autres sessions : une proposition s'écrit dans un worktree à part, sur sa
  propre branche.

## 1. Trouver les idées tranchées

`ops_etat()` (et donc `GET /api/agents/etat`) **ne rend que les décisions ouvertes**, et `ops.decisions` n'a pas de
colonne `nature` : une idée tranchée ne se lit jamais dans l'état. Elle se lit ainsi :

```
node scripts/chef/chantier.mjs idees --depuis=<ISO du dernier passage, ou 7 jours> --base=https://prestiapp.fr --sortie=idees.json
```

`chantier.mjs idees` lit `GET /api/agents/decisions?tranchees=1&depuis=…` avec le jeton du chef (route de 026-042,
fonction `ops_decisions_tranchees` de 0098), et ne garde que les décisions dont la clé commence par
`chef:<AAAA-MM-JJ>:idee-` (le préfixe que le schéma du chef impose aux idées) et dont le `choix` vaut `lancer`. Une
idée tranchée `reporter`, ou passée au défaut (`reporter` aussi), n'est pas un chantier.

Le dernier passage est la date ISO écrite dans `.orchestre/travail/chantier/dernier-passage.txt` (dossier ignoré par
git) ; sans ce fichier, 7 jours en arrière. Une idée dont la clé figure déjà dans une proposition (sur `main` ou dans
une PR `chantier/…` ouverte) est sautée.

## 2. Pour chaque idée : la fiche, son juge, la PR

1. Le worktree : `git fetch origin main`, puis `git worktree add ../presti-chantier-<id> -b chantier/<id> origin/main`.
   Si le juge a besoin de `node_modules` : une jonction (`cmd //c mklink /J node_modules <presti>\node_modules`),
   retirée par `cmd //c rmdir node_modules` **avant** `git worktree remove`, sinon le vrai `node_modules` est effacé.
2. **La fiche** : `.orchestre/propositions/<id>.md`, au format du gabarit `.orchestre/gabarit-tache.md`, avec un id
   libre (`NNN-mot-cle`, absent de `file/`, `en-cours/`, `fait/` et `refuse/`), et, juste sous son titre, la ligne :

   ```
   Décision : chef:<AAAA-MM-JJ>:idee-<mot-clé>
   ```

   Le périmètre ne touche une zone protégée que si `executant: claude-code`. Les zones : `supabase/**`, `lib/plans.ts`,
   `lib/stripe*`, `app/api/stripe/**`, `proxy.ts`, `middleware.ts`, `lib/ai.ts`, `lib/agents/llm.ts`,
   `app/api/agents/**`, `vercel.json`, `scripts/*-qa.mjs`, `scripts/juges/**`, `scripts/fixtures/**`, `.claude/**`,
   `.github/**`, et tout chemin en `../`.
3. **Son juge** : `scripts/<nom>-qa.mjs`, que la fiche lance dans `verifier`. Le juge est écrit par la routine, donc
   par Claude Code, jamais par l'exécutant qui l'utilisera : il reste **hors du périmètre** de la fiche (et figure dans
   son `interdit`). Il imprime une ligne par critère (`PASS XX-1 — …` ou `FAIL XX-1 — …`), et juge la substance de ce
   que la fiche fabrique, jamais la seule présence d'un fichier.
4. **Le garde** doit être vert :

   ```
   node scripts/chef/chantier.mjs verifier-fiche .orchestre/propositions/<id>.md
   ```

   Il valide l'en-tête (`orchestre valider`), la ligne `Décision :`, les zones protégées, le script de `verifier`
   (présent, hors du périmètre), l'id libre, puis **lance lui-même le juge proposé** sur l'arbre courant : le juge doit
   échouer aujourd'hui, sur un critère identifié (une ligne `FAIL XX-1 — …`). Un juge vert avant la fabrication ne
   prouve rien (revue du 24/09, B2) ; un plantage non plus.
5. **La PR** : ajouter les deux seuls fichiers (la proposition et son juge), les enregistrer sur la branche
   `chantier/<id>`, pousser la branche et ouvrir une PR vers `main` (`gh pr create --base main --head chantier/<id>`).
   **Jamais de fusion** : c'est Benj qui fusionne.
6. Le ménage : revenir au dépôt principal, `git worktree remove ../presti-chantier-<id>`, puis écrire la date du
   passage dans `.orchestre/travail/chantier/dernier-passage.txt`.

## 3. Après la fusion par Benj : le dépôt

Sur le poste, dans le dépôt principal à jour :

```
node scripts/chef/chantier.mjs deposer .orchestre/propositions/<id>.md
```

`deposer` refait `verifier-fiche`, relit la décision (`GET /api/agents/decisions?tranchees=1`) et exige qu'elle soit
tranchée `lancer`, puis copie la fiche dans `.orchestre/file/<id>.md`. Il refuse un id déjà présent, une décision
absente ou tranchée `reporter`, et ne modifie jamais la proposition. L'orchestre fait le reste (`prochaine`, puis
`verifier` depuis `fait/`).

## Qui fusionne quoi

`node scripts/chef/chantier.mjs fusion-permise <base> <tete>` dit si une PR ne contient que ce qui pourrait se fusionner
sans Benj : `docs/**`, `plans/*.md`, et un `scripts/*-e2e.mjs` **nouveau**. Jamais un juge, jamais un test existant
modifié, jamais du code. Une PR du chantier porte un juge : elle n'est donc jamais « permise ». Et même quand elle
l'est, la routine ne fusionne pas.

## Ce que la routine ne fait jamais

- fusionner, pousser sur `main`, écrire dans le dépôt principal (sauf `deposer`, après la fusion par Benj) ;
- déposer une fiche dans `.orchestre/file/` avant la fusion ;
- confier un juge à l'exécutant, ou mettre le juge dans le périmètre ;
- chercher une idée tranchée dans l'état ;
- utiliser un connecteur, afficher ou recopier le jeton.
