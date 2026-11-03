# 036-034 — résumé de preuve

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| **MCP `cerveau`** : `regles_pour` (« corriger un workflow n8n presti-cerveau et republier, mode ombre ») et `chercher` (« mode ombre carte assistant_actions… ») | `regles_pour` n'a rendu aucune règle propre. `chercher` m'a mené à `branchement-reel.md` (036-030), qui décrit le nœud « Préparer les cartes de l'ombre », la limite « demande composée sans proposition » et l'essai 999 épinglé. Il m'a aussi mené à `schema-gabarits.md`, qui rappelle qu'on n'écrit jamais `mode: 'n8n'` ni `statut: 'executee'` pour une carte d'agent. C'est de là qu'est venue l'hypothèse « la sortie du chef n'est pas celle que le Cerveau attend ». |
| **MCP `n8n-oracle`** : `search_workflow_executions`, `get_workflow_execution`, `get_workflow_details`, `update_workflow`, `publish_workflow`, `execute_workflow` | Il a donné les exécutions 1409 à 1426, qui datent l'essai de 19:04 à 19:08 UTC, et 1253, qui montre la sortie réelle du chef. Il a servi aussi à poser la correction, enfants d'abord, à publier, et à jouer le banc 1494. Je n'ai chargé ni `get_workflow_sdk_reference` ni `get_workflow_best_practices` : aucun workflow n'est construit, seuls trois nœuds Code existants et un réglage ont changé. |
| **Skill `diagnosing-bugs`** | Il m'a imposé une boucle rouge avant toute théorie : `banc-cartes-ombre.mjs` sur l'export d'avant donne 0 carte et un événement marqué, le symptôme exact. J'ai aussi classé les hypothèses : demande introuvable, contrainte 0194, écriture épinglée, chef en échec, demande sans proposition. Chacune a été écartée ou confirmée par une exécution. |
| **Fiche `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 2, 6 et 9) | Point 9 : les données d'exécution ne sont pas gardées, ce qui explique pourquoi les passages de l'essai sont introuvables. Point 2 : un parent appelle la version **publiée** de l'enfant, donc l'enfant se republie d'abord. Point 6 : l'idempotence repose sur la clé unique en base, ce qui rend le rejeu sans doublon. |
| **Mémoire `n8n-poser-un-gabarit`** | Elle m'a fait vérifier `executeOnce` et `.all()` sur la lecture des événements, réutilisée par la marque bornée. Elle m'a aussi rappelé de relire le brouillon après `update_workflow`, avant de publier. |
| **Migrations `0157_assistant_actions.sql` et `0194_cartes_agents.sql`** | La forme de la ligne est vérifiée champ par champ par le banc : contrainte `assistant_actions_agent`, déclencheur de naissance, `objet_type` et `objet_id` liés, clé `^[A-Za-z0-9_:.-]{3,120}$`. |
| **Session pair `presti-69`** (même verrou, message reçu en cours de route) | Elle m'a fourni ses essais 1438, 1450, 1460 et 1475, son Bilan qui lève une erreur, gardé tel quel, et l'alerte « rejeu sans fin ». Cette alerte est devenue le rejeu borné à 10 minutes. |
| Vidéos analysées, skills de design et de vidéo | Non chargés : hors du domaine de la tâche (diagnostic d'un workflow n8n). |

## Cause (exécutions citées)

- Les passages de l'essai, de 19:04 à 19:08 UTC, ne sont pas conservés : `saveDataSuccessExecution: "none"`. Ils sont datés par les
  erreurs **1409, 1413, 1417, 1422, 1426** de `lib-battement` (`SubworkflowPolicyDenialError`). Le premier passage a duré 10 s, contre
  4 s pour les suivants : le chef a tourné.
- **1253** (`presti-banc-cerveau`, nœud « Appeler presti-dep-accueil ») : une demande sans proposition donne `ecrire_note` et
  `demander_brouillon`, jamais `ecrire_carte`.
- Le Cerveau compose **toute** vraie demande avec `proposition: null` (nœud « Composer les pages »). Le nœud « Préparer les cartes de
  l'ombre » ignorait `demander_brouillon` : 0 carte, et l'événement marqué quand même.
- Reproduit sur le Cerveau par **1438** (session presti-69).

## Correction (n8n)

| Workflow | Changement | Version |
|---|---|---|
| `lib-battement` (`XwjyA6PFjzlI2vpd`) | `callerIds = "rAAqj7NSVJoA3grm,596OC5mL2aMBq6SD"` | réglage, version active inchangée `1d71b164` |
| `presti-cerveau` (`596OC5mL2aMBq6SD`) | « Préparer les cartes de l'ombre » : `demander_brouillon` devient une carte en ombre, une par objet, sans texte inventé | publiée `33a95c8b` |
| `presti-cerveau` | « Bilan du passage » (presti-69) : erreur levée si l'écriture échoue, après la marque | publiée `33a95c8b` |
| `presti-cerveau` | « Préparer les marques » : si l'écriture échoue, un événement de moins de 10 min n'est pas marqué ; au-delà, il l'est (rejeu borné) | **active `78c413bb`** |
| `presti-banc-cerveau` (`x7QfmFAZNIxaoUS6`) | + « Cas de l'essai réel », + « Cartes de l'ombre (code du Cerveau) », + « Requête d'insertion (montrée, jamais envoyée) » | brouillon `8999a330`, inactif |

## Sorties

Banc hors ligne : rouge avant, vert après.

```
$ node banc-cartes-ombre.mjs cerveau-avant.workflow.json
effets du chef pour la demande : ecrire_note, demander_brouillon
cartes que le Cerveau POSTerait : 0
événement marqué « traité » : true (écriture réussie)
ROUGE                                                     (code 1)

$ node banc-cartes-ombre.mjs cerveau-final.workflow.json            → 1 carte, VERT (code 0)
$ node banc-cartes-ombre.mjs cerveau-final.workflow.json --ecriture-en-echec
événement marqué « traité » : false (écriture de la carte en échec, événement récent : 1 min)   VERT
$ node banc-cartes-ombre.mjs cerveau-final.workflow.json --ecriture-en-echec --ancien
événement marqué « traité » : true (écriture de la carte en échec, événement ancien : 30 min)   VERT
$ node banc-cartes-ombre.mjs cerveau-publie.workflow.json --ecriture-en-echec --ancien         (33a95c8b, avant le borne)
défauts : événement ancien jamais marqué : rejeu sans fin (le chef tournerait chaque minute)    ROUGE

$ node non-regression.mjs cerveau-avant.workflow.json   → ombre : 16 lignes ; simulation : 0
$ node non-regression.mjs cerveau-final.workflow.json   → ombre : 17 lignes {"ecrire_carte":16,"demander_brouillon":1}, doublons de clé : false ; simulation : 0

$ node banc-egal.mjs cerveau-final.workflow.json banc-noeuds-poses.json   → copie du banc identique au Cerveau : true  (code 0)
$ node banc-egal.mjs cerveau-avant.workflow.json banc-noeuds-poses.json   → false (code 1, le contrôle sait rougir)
```

Banc n8n **1494** (`presti-banc-cerveau`, manuel, succès, 19:20:08 à 19:20:17 UTC), nœud « Requête d'insertion » :

```
verdict: vert, envoyee: false, methode: POST, url: …/rest/v1/assistant_actions?on_conflict=artisan_id,cle
statut_chef_essai: ok, effets_chef_essai: [ecrire_note, demander_brouillon, inserer_journal]
par_compte: { 0000000000a1: 17 cartes (1 brouillon à rédiger), 0000000000c3: 1 carte (1 brouillon à rédiger) }   (b2 en simulation : aucune)
Bilan du banc : [16/0/4/2, 4/13/3/1, 0/0/0/0]   (les deux premiers comptes sont identiques à 1007)
```

Insertion confrontée à la base, essai **1475** (presti-69, `presti-cerveau`, écriture non épinglée, compte fictif `…c3`) :

```
Écrire les cartes (ombre) : 409 {"code":"23503", … "assistant_actions_artisan_id_fkey" …}
  → CHECK assistant_actions_agent et déclencheur BEFORE assistant_actions_agent_naissance passés ; seule la FK refuse (aucun compte réel)
Préparer les marques : { vide: true }    (événement non marqué, il sera rejoué)
Bilan du passage : erreur levée, exécution conservée
Appeler lib-battement : statut "ok"      (politique d'appel corrigée)
```

## Retour arrière

Voir `plans/011-cadrage-01-11/p6-signature/ombre-reel.md`, section « Retour arrière » :
- `presti-cerveau` : restaurer `9b019809`, puis publier ;
- `lib-battement` : `callerIds = "rAAqj7NSVJoA3grm"` ;
- `presti-banc-cerveau` : restaurer `a5f45834`.

## Risques et points à valider

- **La session principale** doit rejouer l'essai réel sur un compte de test. Attendu :
  - une ligne `assistant_actions` avec `origine = 'agent'` et `cle = 'brouillon:<lead>'` ;
  - l'événement marqué traité ;
  - zéro envoi.
- La carte d'une demande sans proposition n'a pas de texte. Il faudra une proposition composée en amont pour comparer de vrais brouillons.
- Le rejeu borné garde jusqu'à environ 10 appels du chef si l'écriture échoue sans arrêt. Chaque échec laisse une exécution en erreur, et
  donc une trace.
- Deux sessions ont travaillé en même temps sous le même verrou 036-034, moi et presti-69. Nous nous sommes accordés par message : je garde
  la main et presti-69 ne touche plus à rien. Les fichiers `bilan-*.js`, `cartes-avant.js`, `cerveau-avant-9b019809.workflow.json`,
  `operation-*.json`, `pin-ombre-fictif.json` et `decisions-avant.md` de ce dossier sont les siens.
- `orchestre.mjs prochaine` a répondu « chevauche 036-034 » : le verrou était déjà posé (19:09:27Z, `claude-code`).
