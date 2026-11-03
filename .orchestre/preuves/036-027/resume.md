# 036-027 — le cerveau des deux lib-* réparé, bancs verts, chaîne republiée en simulation

## Ressources utilisées

- **Inventaire de la session** (hôte d'agents d'Oracle, sans écran) :
  - outil Skill ;
  - MCP `cerveau` (lecture seule, copie du vault du 02/11) ;
  - MCP `n8n-oracle` (dans le périmètre : `lib-rediger-message`, `lib-lire-photo`, `presti-dep-*`, `presti-cerveau`, `presti-banc-*`, `lib-banc-*`).
- **Non utilisés** :
  - les connecteurs Supabase, Slack et les autres, hors périmètre ;
  - les skills de design et de vidéo : ce lot n'a ni page ni vidéo.
- **Skill `reseau-neuronal`** : il a fixé l'ordre de travail, `regles_pour` avant de publier, puis `chercher` et `lire`, et rien écrit dans le vault.
- **MCP `cerveau`** :
  - `regles_pour` « régler le cerveau… republier la chaîne en simulation » n'a rendu aucune règle nouvelle. Les règles tenues sont celles de 036-025 (publier
    en testant, sans lever de porte) et `.claude/rules/`.
  - `chercher` « lib-rediger-message… Structured Output Parser » m'a mené à la section 036-025 du journal, à la fiche 4 de `fiche-methode-n8n.md`
    (« `passthroughBinaryImages` vrai par défaut » ; « le parseur n'est pas le contrat ») et à la spécification de l'accueil.
  - `chercher` « photo… registre des traitements… Anthropic » a trouvé deux choses :
    - le § 23 du registre (« aucune photo n'est transmise »), d'où le point à trancher sur le RGPD ;
    - le gabarit 036-013 (« Lire la photo (Anthropic), la photo (URL signée) »), qui confirme que l'image au modèle est le dessein prévu.
- **Skill `claude-api`** : tableau « Thinking & Effort ». Pour Claude Haiku 5.5, la réflexion est adaptative et **active par défaut**, `disabled` est accepté
  seulement à un effort `high` ou plus bas, et un échantillonnage non par défaut est refusé. C'est la clé de la cause, et la raison de retirer `temperature`.
- **Fiches de méthode n8n** (`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`) :
  - **fiche 9** : un banc manuel juge le brouillon de l'enfant **direct** seulement. Le 1er banc argent (838, puis 844 « Workflow is not active ») m'a montré
    qu'un petit-enfant exige la version publiée. D'où le nouvel ordre :
    1. banc relance, qui juge le brouillon de la rédaction ;
    2. publication de l'enfant ;
    3. bancs argent et suivi.
  - **fiche 4** : appariement et revalidation dans un nœud Code, `autoFix` faux.
- **MCP `n8n-oracle`** :
  - `get_workflow_details` pour relire chaque workflow avant de le toucher ;
  - `get_node_types` sur Anthropic Chat Model 1.6 (option `thinkingMode`) et HTTP Request 4.5 (réponse en fichier, `neverError`) ;
  - `validate_node_config` avant l'écriture ;
  - `get_workflow_execution` (784, 790, 802, puis chaque banc, relus nœud par nœud) et `search_workflow_executions` ;
  - `list_credentials` : « Supabase account » existant, affecté et non modifié ;
  - `search_nodes` ;
  - `update_workflow`, deux versions nommées ;
  - `test_workflow` : essai à blanc 866, sans modèle ;
  - `execute_workflow` en mode manuel pour les bancs, une suite à la fois ;
  - `publish_workflow`.
  - `get_workflow_sdk_reference` et `get_workflow_best_practices` n'ont pas été appelés : aucun workflow n'a été construit, deux ont été réparés par opérations.
- **Sources du dépôt** :
  - `.orchestre/preuves/036-025/resume.md` et `etat.json` (identifiants des bancs, état de la chaîne) ;
  - `app/api/leads/route.ts:226-262` (bucket privé `lead-media`, chemin `<lead.id>/<i>.<ext>`) ;
  - `plans/011-cadrage-01-11/p6-signature/contrats/accueil.json` (contrat `lib-lire-photo@1`).

## Ce qui a été fait (détail : `etat.json` et la section « 036-027 » du journal)

1. **Cause, exécution 784.** `thinkingMode` n'est pas réglé, donc la réflexion par défaut de Haiku 5.5 reste active ; elle consomme tout `max_tokens`, puis le
   texte rendu est vide. Les plafonds réels étaient de 700 pour la rédaction et 300 pour la photo, l'inverse de la consigne.
2. **`lib-rediger-message`** : 2 000 jetons, `thinkingMode: disabled`, `temperature` retirée. Prompt et schéma inchangés.
3. **`lib-lire-photo`** :
   - mêmes réglages du modèle, et l'image elle-même au modèle (téléchargement binaire depuis `lead-media`, contrôle des octets, `passthroughBinaryImages: true`) ;
   - sans image : statut `refuse`, aucune description, modèle non appelé.
4. **Bancs**, tous verts et relus nœud par nœud :
   - relance 847 ;
   - argent 856 (après un premier passage 838, non jugé) ;
   - suivi 871 ;
   - cerveau 882.
5. **Chaîne republiée, enfants d'abord** :
   1. `lib-rediger-message` ;
   2. `lib-lire-photo` (nouvelle version) ;
   3. `presti-dep-suivi`, `presti-dep-facturation`, puis `presti-cerveau`.

   La porte « simulation » n'a été levée nulle part.

## À trancher

La liste complète est dans `etat.json` (`a_trancher`) et dans le journal :
- prouver la lecture d'une vraie image ;
- mettre à jour le § 23 du registre ;
- vérifier la clé `service_role` de « Supabase account » ;
- préciser la règle 6 du prompt de rédaction ;
- vérifier FAC-EX-0037 dans la facturation ;
- corriger le libellé photo de l'accueil.
