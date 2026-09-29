# La revue du lundi (A11) — consigne

Chaque lundi, une revue de la semaine écoulée : l'entonnoir, l'argent et les coûts, les exécutants, les échecs, et
trois décisions classées par euros en jeu. Elle arrive à Benj sous la forme d'une PR `docs/revues/AAAA-SS.md` ; il la
lit, la commente, la fusionne ou non. **La routine ne fusionne jamais.**

## Qui, où, quand

- **Claude Code, sur le poste de Benj**, le lundi (dans une session à lui, lancée à la main ou par une tâche planifiée
  du poste). Ce travail est **distinct du cycle du chef** : ni le cycle plein, ni le cycle léger, ni les minuteurs de
  l'usine ne lancent la revue (026-148). Sur l'usine, le modèle n'a ni réseau ni droit d'écriture sur le dépôt.
- **Aucun connecteur** : ni Supabase, ni Gmail, ni Vercel, ni navigateur. Les seuls accès au réseau sont ceux de
  `revue-donnees.mjs` (vers `--base`, et seulement là) et de `git` et `gh` (la branche et la PR).
- Le jeton est `PRESTI_JETON_CHEF`, la copie de reprise du poste (variable d'utilisateur Windows) : jamais affiché,
  jamais passé en argument, jamais écrit. Sans lui, l'argent et l'entonnoir valent « non mesuré », et la revue le dit.
- Le dépôt principal porte le travail d'autres sessions : la revue ne s'y écrit jamais. Elle vit dans un worktree à
  part, sur sa propre branche.

## La marche à suivre

1. **La semaine** : la semaine ISO qui s'est terminée la veille, à l'heure de Paris (le lundi 21/09/2026, c'est
   `2026-38`). Elle s'écrit `AAAA-SS`.
2. **Le worktree** :

   ```
   git fetch origin main
   git worktree add ../presti-revue-AAAA-SS -b revue/AAAA-SS origin/main
   cd ../presti-revue-AAAA-SS
   ```

3. **Les chiffres**, calculés par un script et jamais par le modèle (leçon « Deux chiffres, un écran ») :

   ```
   node scripts/chef/revue-donnees.mjs --semaine=AAAA-SS --base=https://prestiapp.fr --verdicts=../presti/.orchestre/verdicts.jsonl --agents=../presti/.orchestre/agents.jsonl --sortie=revue.json
   ```

   Un code ≠ 0 arrête tout : pas de revue, et Benj reçoit la ligne en échec, telle quelle.
4. **Le document** : `docs/revues/AAAA-SS.md`, sur le modèle de `docs/revues/GABARIT.md`, avec **seulement des nombres
   présents dans `revue.json`**. Aucun total, aucune moyenne, aucun pourcentage calculé à la main ; une valeur absente
   s'écrit « non mesuré », jamais 0, et un nombre s'écrit en entier (jamais « 12k »). Ne comptent pas comme des
   nombres : les dates valides, les heures HH:MM, les semaines AAAA-SS, les numéros de section et de liste qui se
   suivent, les identifiants (`026-146`, `RV-1`). Un chiffre dans du code en ligne, une fraction, une fourchette ou une
   durée se vérifie comme le reste : le juge le cherche dans `revue.json`.
   - Chaque section dit sa source (la `source` que porte chaque bloc de `revue.json`) et sa fraîcheur (`fraicheur`).
   - **Trois décisions**, ni deux ni quatre, classées par euros en jeu, du plus gros montant au plus petit. Chacune a
     un montant en € pris dans `revue.json`, une ou deux phrases de raison, et une ligne « Source : » qui nomme la clé
     de `revue.json` d'où vient le montant.
   - 120 lignes au plus.
5. **Le juge** doit être vert :

   ```
   node scripts/revue-qa.mjs --document=docs/revues/AAAA-SS.md --donnees=revue.json
   ```

   S'il est rouge, corriger le document (jamais `revue.json`, jamais le juge) ; toujours rouge après trois corrections :
   pas de PR, et Benj reçoit la ligne en échec.
6. **Les leçons** (`docs/agents/lecons.md`) : relire les leçons candidates et trancher chacune.

   ```
   node scripts/savoir/lecons.mjs lister --statut=candidate --travail=../presti/.orchestre/travail/savoir/lecons
   ```

   Écrire `docs/revues/AAAA-SS-lecons.md` : un titre, puis le tableau `| Leçon | Type | Source | Verdict | Règle
   proposée | Domaines |`, 20 lignes au plus, verdict `valider`, `rejeter` ou `revoir`, la source recopiée de la
   candidate, ni coordonnée ni lien. Une règle est une phrase d'action dans les limites existantes, sans nom de
   personne ; 1 à 4 domaines. Le juge doit être vert (mêmes trois corrections au plus) :

   ```
   node scripts/savoir-lecons-qa.mjs --document=docs/revues/AAAA-SS-lecons.md --travail=../presti/.orchestre/travail/savoir/lecons
   ```

   Puis, pour chaque ligne `valider`, dans le worktree (jamais dans le dépôt principal) :

   ```
   node scripts/savoir/lecons.mjs valider <id> --par=revue-AAAA-SS --regle="…" --domaines=… --travail=../presti/.orchestre/travail/savoir/lecons
   ```

   Une validation refusée (source pas encore sur main) : la ligne reste, la leçon attend la semaine suivante. Aucune
   candidate : pas de document de leçons.
7. **Le bilan** (`docs/agents/chef-bilan.md`) : relire la semaine et proposer, jamais appliquer. Les chiffres, par un script :

   ```
   node scripts/chef/bilan-donnees.mjs --semaine=AAAA-SS --base=https://prestiapp.fr --verdicts=../presti/.orchestre/verdicts.jsonl --agents=../presti/.orchestre/agents.jsonl --candidates=../presti/.orchestre/travail/savoir/lecons/candidates --sortie=bilan-semaine.json
   ```

   Un code ≠ 0 arrête cette étape : pas de bilan cette semaine, la revue continue et Benj reçoit la ligne en échec.
   Écrire `docs/revues/AAAA-SS-bilan.md` sur le modèle de `docs/revues/GABARIT-bilan.md` : cinq sections, 100 lignes
   au plus, seulement des nombres présents dans `bilan-semaine.json` (mêmes exceptions que pour la revue), de une à
   trois propositions au chef d'entreprise, chacune avec sa ligne « Source : » et sa ligne « Effet attendu : ». Une
   proposition n'est jamais appliquée : Benj la lit, et Claude Code exécute ce qu'il retient. Le juge doit être vert
   (mêmes trois corrections au plus, jamais `bilan-semaine.json`) :

   ```
   node scripts/savoir-reflexion-qa.mjs --document=docs/revues/AAAA-SS-bilan.md --donnees=bilan-semaine.json
   ```
8. **La PR** : ajouter `docs/revues/AAAA-SS.md` et, s'ils existent, `docs/revues/AAAA-SS-lecons.md`, `docs/revues/AAAA-SS-bilan.md` et les
   fichiers `docs/savoir/lecons/<id>.md` que l'étape 6 a écrits (jamais `revue.json`, jamais `bilan-semaine.json`), les enregistrer sur la branche
   `revue/AAAA-SS`, pousser la branche et ouvrir une PR vers `main` (`gh pr create --base main --head revue/AAAA-SS`).
   **Jamais de fusion**, même si le texte paraît parfait : c'est Benj qui fusionne.
9. **Le ménage** : supprimer `revue.json` et `bilan-semaine.json`, revenir au dépôt principal, puis `git worktree remove ../presti-revue-AAAA-SS`.

## Ce que la routine ne fait jamais

- inventer, arrondir ou recalculer un nombre ;
- écrire dans le dépôt principal, fusionner une PR, pousser sur `main` ;
- utiliser un connecteur, afficher ou recopier le jeton ;
- valider une leçon avec un autre `--par` que `revue-AAAA-SS`, ou sans sa ligne `valider` ;
- lancer autre chose que `revue-donnees.mjs`, `revue-qa.mjs`, `lecons.mjs`, `savoir-lecons-qa.mjs`, `bilan-donnees.mjs`,
  `savoir-reflexion-qa.mjs`, `git` et `gh`.
