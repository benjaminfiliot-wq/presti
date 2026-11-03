# 036-042 — Publier la chaîne : les six départements et le réel — preuve

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans mon travail |
|---|---|
| **MCP `cerveau`** : `regles_pour` (« publier des workflows n8n… ») et `chercher` (« publier workflow n8n enfants d'abord retour arrière ») | m'a rendu `fiche-methode-n8n.md` § 3.9 (diff de versions, enfants publiés puis parent, retour arrière par restauration ou dépublication) et `mise-en-service.md` étape 7(d) (enfants avant parents, dépublier parents d'abord) : c'est l'ordre suivi |
| **Skill `reseau-neuronal`** | lecture seule du réseau (copie du vault du 02/11) : je n'y ai rien écrit, comme la consigne de session l'exige |
| **MCP `n8n-oracle`** : `get_workflow_history`, `get_workflow_versions_diff`, `get_workflow_details`, `test_workflow`, `get_workflow_execution`, `search_workflow_executions`, `publish_workflow` | relecture du brouillon contre la version publiée (diff `78c413bb`→`02860d45`), bancs sur les vrais workflows, relecture nœud par nœud, publication à version fixée |
| **MCP Supabase** (`execute_sql`, lecture agrégée seulement) | a prouvé, juste avant de publier, qu'**aucun compte n'est au réel** (un seul compte, en ombre) et, après, qu'aucun événement n'attend |
| **Mémoires n8n** (`n8n-prouver-une-ecriture`, `n8n-essai-envoi-reel`, `n8n-agent-outils-pieges`, `n8n-secret-hors-executions`, `n8n-poser-un-gabarit`) | la preuve d'écriture par clé étrangère d'un compte fictif (exécution 2894) ; `test_workflow` sur le vrai `presti-dep-envoi` ; « un banc manuel joue le brouillon de son enfant direct » ; succès non conservés, donc surveiller les erreurs |
| **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 2 et § 3.9) | en production un parent appelle la version **publiée** de l'enfant : publier `lib-envoyer-courriel` avant `presti-dep-envoi` |
| **Sources de 036-036 et 036-038** : `departements-reels.md`, `reel.md` (§ 4, 5), `lib/agents/n8n/envoi-reel.mjs`, `lib/evenements/departements.ts`, `lib/evenements/ecrivain.ts`, `.orchestre/preuves/036-036/noeuds/`, `036-036/pin-banc-six.json`, `036-038/essai-pindata.json` | comparaison octet par octet des nœuds du brouillon aux sources ; jeux fictifs des bancs |
| **Juge `node scripts/reel-qa.mjs`** | rejoué ici : `036-038 : PASS — 16 contrôles verts, 28/28 mutants vus` |

Pas de skill de design ni de vidéo : hors du domaine de la tâche. `get_workflow_sdk_reference` et `get_workflow_best_practices` ne servent qu'à
construire un workflow ; je n'en ai construit ni modifié aucun.

## Ce qui est fait

- **Relu** le brouillon `02860d45` de `presti-cerveau` contre la version publiée `78c413bb` : 5 nœuds ajoutés, 7 modifiés, 8 connexions
  ajoutées, 1 retirée (`diff-78c413bb-02860d45.json`) ; les nœuds sont identiques aux sources de 036-036 plus les retouches de 036-038.
- **Rien à compléter dans l'aiguillage** : `ROUTES` couvre les neuf types de `TYPES_EVENEMENT` ; le réel exige « tous » et le département au réel.
- **Bancs** (une fois chacun, en simulation, sans aucun appel au modèle) : Cerveau étape A **2832**, Accueil **2878**, Devis **2837**,
  Suivi **2851** (abstention voulue), Facturation **2864** (2856 = ma maquette fautive), Après-chantier **2871**, Opérations **2876**,
  Direction **2877**, Cerveau étape C **2894** (6 cartes, refus 23503 de la clé étrangère seulement : rien écrit), réel **2903**
  (sous-exécutions 2904, 2905 : mêmes identifiants Resend que 2749, aucun second message, `delivered@resend.dev` seulement).
- **Publié**, enfants d'abord : `lib-envoyer-courriel` `f3e74330`, `presti-dep-envoi` `c5d849ff`, `presti-cerveau` `02860d45`. Chefs : non touchés.
- Détail, versions d'avant, retour arrière : `plans/011-cadrage-01-11/p6-signature/publication-chaine.md`.

## Production après publication

- 23:34-23:38 UTC : `search_workflow_executions` (tous workflows, depuis 23:34) → `count: 0` ; les erreurs sont conservées
  (`saveDataErrorExecution: all`), les succès non : **aucun passage en erreur**.
- `n8n_evenements_a_traiter` : 0 en attente ; `departements_reglages` : 0 ligne au palier `reel`. `presti-dep-envoi` ne sert donc personne.

## Risques et points à valider

1. **Suivi** : aucune carte de relance de conversation tant que l'app ne lit pas l'opposition et le STOP du client (porte `lecture_en_erreur`).
   À faire côté app (`app/api/cron/relances/route.ts` passe `stop: null`), pas dans n8n.
2. **Le jugement des chefs n'est pas prouvé ici** : nœud agent épinglé (aucune clé API). Les chefs publiés appellent Haiku par l'identifiant
   n8n de production quand un vrai événement arrive (règle d'`architecture-outils.md`).
3. **`lib-rediger-message`** porte l'identifiant « Anthropic account » alors que sa note dit « AUCUN identifiant » : en ombre, une relance
   d'impayé réelle fera rédiger Haiku. À trancher par Benj (garder, ou retirer l'identifiant).
4. **Accueil** : la carte d'une vraie demande reste sans texte (`demander_brouillon`, limite de 036-034) ; ne pas passer l'Accueil d'un compte
   Signature au réel (`reel.md` § 5).
5. Passer un vrai compte au réel : geste de la session principale, sur le « go » écrit de Benj.

## Sortie de `verifier`

`node scripts/orchestre.mjs verifier 036-042`, rejoué depuis `fait/` :
`✓ 036-042 : PASS · 0s · preuve : .orchestre/preuves/036-042/verifier.log` (code 0, 2026-11-03T23:37:42Z).
