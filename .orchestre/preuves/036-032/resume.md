# 036-032 — Le vrai multi-agents dans n8n, et la preuve de la clé (résumé de preuve)

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| **MCP `cerveau`** (`regles_pour`, `chercher`) | Il m'a rendu la règle des comptes non Presti et les passages de l'audit 036-028 (écart 2), de `multi-agents.md` et de `journal-mise-en-service.md` (appelants ouverts, 036-024). Ces passages ont fixé le point de départ : 11 agents dans n8n, aucun chef, et une note du chef de 036-019 que personne ne lit. D'où le choix de donner au chef une décision réelle mais seulement prudente (retenir un pilote en carte). |
| **MCP `n8n-oracle`** | Outils employés : `get_workflow_details` (relu chaque chef avant de le toucher : 7 versionId identiques aux exports locaux), `get_node_types` (agent 3.1, toolWorkflow 2.2, Anthropic 1.6, parseur 1.3), `get_workflow_sdk_reference` (motifs), `get_workflow_best_practices` (liste, puis « triage » : sortie structurée, gestion d'une sortie inattendue), `validate_node_config` puis `validate_workflow`, `create_workflow_from_code` (le passeur), `update_workflow`, `publish_workflow`, `execute_workflow` et `get_workflow_execution` (bancs), `list_credentials` (« Anthropic account », sans le modifier). |
| **Fiche méthode n8n** (`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`, fiche 4) | `autoFix` faux (hors schéma = rejet), `passthroughBinaryImages` faux, `maxIterations` et lots bornés, revalidation dans un nœud Code (« le parseur n'est pas le contrat »). Elle avertit aussi qu'une erreur d'outil revient comme un résultat et peut passer inaperçue. C'est pourquoi la revalidation trace les appels réels et le statut de leur retour, et refuse un spécialiste cité sans avoir été appelé. |
| **Fiches dépôts** (`p5-entreprise/fiches-depots.md`) et **fiches vidéos @restructureai** (`p5-entreprise/fiches-videos-restructureai.md:64-75`) | La forme du sous-workflow-outil (n° 7) et du sous-agent sans état. L'organigramme « un chef qui confie aux managers », avec des notes structurées d'un département à l'autre. La note du chef est donc un contrat strict, qui voyage dans `resultat.note_du_chef`. |
| **`outillage/multi-agents.md`, exports de 036-019 et 036-001 à 036-008** | La forme cible (chef Sonnet, spécialistes, parseur strict, jamais un montant). Les exports locaux m'ont donné la structure exacte de chaque chef, sans relire 450 Ko par le MCP. |
| **`journal-mise-en-service.md` (036-027)** et **`branchement-reel.md` (036-030)** | Le piège de la réflexion qui vide la sortie. La règle « enfants publiés d'abord » (un petit-enfant exige la version publiée). Les comptes de référence des bancs (1007, 1016, 871). `CODE_CARTES` du Cerveau traite `ecrire_carte` et `mettre_en_file_pilote` avec le même corps : retenir un pilote en carte ne demande donc rien au Cerveau. |
| **Mémoire `n8n-poser-un-gabarit`** | `errorWorkflow` ne se pose qu'à la création par le SDK : le passeur est créé directement avec ses réglages. |

## Ce qui est fait (détail dans `plans/011-cadrage-01-11/p6-signature/multi-agents-n8n.md`)

- **Sept chefs `presti-dep-*`** reçoivent chacun huit nœuds : un agent IA « Chef du département … » (Claude Sonnet 5.5, « Anthropic account »,
  réflexion adaptative basse, 8 000 jetons), un parseur strict, deux spécialistes `toolWorkflow`, le dossier, un élément vide et la revalidation.
  Tous publiés, versions dans le document.
- **`lib-specialiste-outil`** (`Yicrr9T7m3jqpOXD`, nouveau, publié) : le passeur entre l'outil et le `lib-*`. Il ne transmet que l'enveloppe, force
  la simulation, n'accepte que les cibles de sa liste blanche. Son id est ajouté aux appelants des onze `lib-*` cibles.
- **Le chef ne peut que retenir un pilote en carte.** Jamais un montant (refusé par la revalidation), jamais une action ajoutée. Une panne ne
  change rien au département.
- **Bancs** : six sur six verts, une fois chacun après publication, porte « simulation » à vrai, `effets_faits` 0 partout : 1253 (cerveau),
  1271 (argent), 1299 (suivi), 1321 (après), 1336 (opérations), 1350 (direction). Relevé : `bancs.txt`.
- **La clé** : `presti-banc-boite`, exécution 1177. Le nœud Code reçoit l'erreur exacte **`access to env vars denied`**
  (`N8N_BLOCK_ENV_ACCESS_IN_NODE`). La clé n'est ni affichée ni lue, et le réglage du serveur n'est pas changé : il revient à la session principale.

## Sorties de commandes

```
$ node -e "const t=require('fs').readFileSync('plans/011-cadrage-01-11/p6-signature/multi-agents-n8n.md','utf8');if(!/presti-dep-accueil/.test(t)||!/toolWorkflow|agent/i.test(t)||!/BOITE_CLE_N8N/.test(t)||!/exécution/i.test(t)||!/retour arrière/i.test(t))process.exit(1)"; echo "verifier: code $?"
verifier: code 0

$ node .orchestre/preuves/036-032/comparer.mjs | tail -1        # sept exports en ligne contre le générateur
VERT : 56 nœuds identiques au générateur, liens complets, 7 chefs
$ EXPORTS=/tmp/a032/mutant/ node comparer.mjs | tail -1          # mutant : une phrase du prompt du suivi changée
ROUGE : 1 écart(s)

$ node .orchestre/preuves/036-032/essai-revalider.mjs | tail -1  # pilote retenu, montant, panne, spécialiste inconnu, cité non appelé
VERT : 5 cas
```

## Points à valider par la session principale

1. **La clé** : choisir entre `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (qui ouvre toutes les variables à tous les nœuds Code) et un identifiant dédié
   (qui revient à Benj). Puis rejouer `presti-banc-boite` et attendre `lue: true`, `longueur: 44`, `aller_retour_aes_gcm: "ok"`.
2. **Bancs des opérations et de la direction** : ajouter un cas qui passe par les créneaux, l'import, l'alerte ou le coût à travers le chef.
   Aujourd'hui, ces deux chefs n'ont eu aucune clé de spécialiste dans leurs bancs.
3. **Coût** : un appel Sonnet par compte, par département et par passage. Il ne court pas tant qu'aucun compte n'est en marche. À mesurer
   avant l'ombre.
4. **Registre des traitements** : la sortie d'un département (avec 500 signes de brouillon) part à Anthropic sur un vrai compte.
5. Les essais avant publication (1127 à 1222, sur le brouillon de l'accueil) sont listés dans le document. Ce sont des réglages, pas les bancs
   « une fois chacun ».
