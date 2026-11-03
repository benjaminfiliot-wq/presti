# Runbook : la démonstration du mode A sur « Exemple. Bâti-Démo » (tâche 035-007)

Ce runbook s'adresse à celui qui surveille la démo : Benj, la session principale, ou un auditeur. Il dit quoi faire dans trois cas :
un agent s'arrête, il faut rejouer un passage, il faut tout couper.

Toutes les situations décrites ici ont été vues pour de vrai dans le n8n d'Oracle. Les numéros d'exécution le prouvent ; leur détail est dans
`.orchestre/preuves/035-007/essais-n8n.json`.

L'état actuel est le mode A :
- les six workflows sont **inactifs** et n'ont jamais été publiés ;
- tout est en simulation, avec des données fictives, et toute lecture de base est épinglée ;
- rien n'est envoyé, aucune ligne n'est écrite et aucun modèle n'est appelé.

## Ce qui tourne

| Workflow | Id n8n | Rôle |
|---|---|---|
| `ent-exemple-parent` | `egBJcOFqHnSnmXaN` | Toutes les 5 min : interrupteur, verrou, disjoncteurs, événements échus, routage, journal, battement. Il route et ne calcule rien. |
| `ent-exemple-qualification` | `CeZdu0DkZfi7XDVn` | Note les demandes, sans modèle, et prépare une carte « valider la réponse proposée » |
| `ent-exemple-relance` | `yk2F9qZZrlAAseLB` | Gère les paliers J+1, J+3 et J+7, le registre de 3 jours, le stop, le litige et l'escalade. Rend des demandes de rédaction. |
| `ent-exemple-redaction` | `vtM522VNdzcl4o9I` | Rédige le brouillon (modèle épinglé), le soumet à la porte de conformité, puis prévoit une carte |
| `ent-exemple-alerte` | `BnVx0mm1Ulrg4XlJ` | Donne l'alerte interne sur une liste fermée d'anomalies, jamais au client final |
| `ent-exemple-reporting` | `TrryBnJIbdQ9tzhw` | Produit le rapport du gérant : des comptes sourcés, aucun chiffre de gain |

Le workflow d'erreur de chacun est `lib-erreur-commune` (`yekMM9ewk03F9y2q`).

Le juge hors ligne se lance par `node scripts/demo-entreprise-qa.mjs`. Il dure environ une seconde et n'appelle ni réseau ni modèle.

## 1. Un agent s'arrête

**Comment on le voit**
- **Le bilan du passage** est le dernier nœud du parent, « Bilan du passage » :
  - `statuts.<agent>` vaut `erreur` quand la chaîne a répondu, mais en échec ;
  - il vaut `echec` quand la chaîne n'a pas répondu du tout (sortie d'erreur de l'appel).
- **Le journal du passage** (`lib-journaliser`) porte une ligne `chaine_appelee` avec le statut, ou le message de la sortie d'erreur.
- **Le disjoncteur** (`lib-disjoncteur`, seuil de 3) compte les échecs de suite. Au troisième, il s'ouvre et prévoit une alerte
  `disjoncteur_ouvert` vers Benj. Au passage suivant, le parent **saute** l'agent et l'écrit au journal (`agent_saute`).
- **L'agent Alerte** signale aussi un disjoncteur ouvert ou un battement absent depuis 26 h quand il balaye.

**Ce qui se passe, et ce qui ne se passe pas**
- Le parent continue. Chaque appel de chaîne est en « Continue (using error output) » : une chaîne en panne ne fait pas tomber les autres.
  - Preuve, essai **456** : trois chaînes en panne, le parent finit son passage, journalise et compte un échec par disjoncteur.
- Une chaîne en panne ne produit aucun effet : `effets_prevus` est vide et `effets_faits` aussi.

**Diagnostiquer**
1. Ouvrir l'exécution du parent. Suivre le lien de la sous-exécution sur le nœud `Appeler ent-exemple-<agent>`.
2. Dans la chaîne, lire le champ `erreurs` du nœud « Contrat de sortie ». Il nomme l'appel en échec, par exemple
   `Appeler lib-dedoublonner : appel en échec`.
3. Les causes connues :

| Signe | Cause | Remède |
|---|---|---|
| `The sub-workflow (<id>) cannot be called by this workflow` | Le `lib-*` n'a pas la chaîne dans ses `callerIds` : la politique d'appel est appliquée **même en manuel** (essais 443 et 456) | Ajouter l'appelant aux `callerIds` du `lib-*`. C'est la session principale qui le fait (liste dans la preuve) ; un sous-agent ne le fait jamais. |
| `statut: rejete`, ligne `contrat_rejete` | L'enveloppe reçue sort du contrat : champ en trop, type faux, adresse ou téléphone présent | Corriger l'appelant. Le contrat n'est jamais assoupli pour faire passer une donnée. |
| Arrêt `Hors simulation : effet réel non branché` | Une enveloppe est arrivée avec `simulation: false` (essai 454) | C'est voulu : en mode A, rien n'est branché derrière la porte. |
| `statut: erreur` sur `lib-rediger-message` | Un brouillon hors schéma : la revalidation l'a refusé | Aucun brouillon ne passe. La demande reste à reprendre au passage suivant. |

4. **Réarmer.** Une fois la cause corrigée, on réarme le disjoncteur **à la main**. Un succès remet le compteur à zéro mais ne referme pas
   un disjoncteur ouvert (`lib-disjoncteur`, 035-003). En mode A, le geste se fait sur les données épinglées des disjoncteurs ; en mode B,
   il se fera sur la table des disjoncteurs, au « go » de Benj.

## 2. Rejouer

Rejouer le même lot ne crée **aucun doublon**. Trois gardes l'assurent, de la plus en amont à la plus en aval :
- **la clé de chaque geste** (`lib-dedoublonner`) : organisation, type, objet et palier, ou période. Si la clé est déjà réservée, la
  réponse est « déjà fait » ;
- **la clé de l'action**, relue par `lib-executer` juste avant l'effet. Si elle est déjà en base, la réponse est « déjà fait » ;
- **en mode B, la contrainte unique à l'écriture** (`on_conflict=organisation_id,cle`).

Preuves :
- essai **453** : le rapport de la semaine, rejoué, rend « déjà produit » et aucun nouveau rapport ;
- le juge rejoue tout le passage avec les clés du premier tour : zéro carte, note, rapport ou alerte en plus (règle G5).

**Pour rejouer en mode A**, c'est-à-dire en essai, sans rien publier :
1. Reprendre les données épinglées de l'essai dans `essais-n8n.json` : champs `entrees` et `epingles`.
2. Les passer à `test_workflow` (MCP `n8n-oracle`) sur le workflow voulu, sans modification.
3. Relire la sortie avec `get_workflow_execution`, nœud « Contrat de sortie » ou « Bilan du passage ».
4. Lancer `node scripts/demo-entreprise-qa.mjs`. Il rejoue l'essai hors ligne et compare (règle N). Une sortie n8n retouchée le fait rougir.

**Pour rejouer un passage manqué en mode B**, au « go » seulement :
- remettre l'événement à `a_traiter` ;
- le parent le reprendra au passage suivant, toutes les 5 minutes.

Ne jamais forcer un effet à la main : le parent et ses gardes décident, pas l'opérateur.

## 3. Couper

Il y a trois niveaux, du plus fin au plus large. L'arrêt a un effet immédiat (p5:263).

1. **Un agent** : `interrupteurs_agents.<agent> = false` dans la configuration du client.
   - Le parent saute l'agent et l'écrit au journal (`agent_saute`).
   - Pour la Rédaction, `lib-executer` relit aussi l'interrupteur juste avant l'effet : une coupure en plein passage ne laisse partir aucune
     carte (035-005).
2. **Tout le client** : `interrupteur_general = false`.
   - Le passage s'arrête avant le verrou : rien n'est appelé.
   - Preuve, essai **455** : bilan `arret: interrupteur_general_coupe`, 0 effet.
   - Un interrupteur absent ou illisible vaut « coupé » (fail-closed).
   - Dans la console, couper l'interrupteur général coupera aussi `pilote_reglages.actif` du compte (premiere-reponse.md § 4.3).
3. **n8n lui-même** : dépublier `ent-exemple-parent`. En mode A, il ne l'a jamais été.
   - En dernier recours, archiver les `ent-exemple-*` : c'est le retour arrière de l'étape A4 (premiere-reponse.md § 7.2).
   - Les `lib-*` ne sont jamais touchés par ce geste.

Couper ne supprime rien. On rallume dans l'ordre inverse, et seulement une fois la cause connue.

## 4. Avant de quitter le mode A (rien de tout cela n'est fait)

- **Les `callerIds` des `lib-*`** : ajouter les appelants listés dans la preuve. Cela revient à la session principale.
- **Les tables** de la configuration par organisation, du journal, des disjoncteurs, du battement et des événements (0185) : elles naissent au
  « go » de Benj. On colle la migration, **puis** on lève le drapeau.
- **Les emplacements « mode A : épinglé »** du parent deviennent des lectures GET filtrées par organisation, derrière leur porte.
- **Publier** : les enfants d'abord, le parent en dernier. Toute publication attend le « go » écrit de Benj.
