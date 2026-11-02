## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« n8n, publication, workflow : publier en simulation deux workflows n8n sur Oracle ») : n'a rendu aucune
  règle nouvelle ; il a confirmé `architecture-outils.md` (n8n sur Oracle, `n8n-oracle` branché à Claude Code) et le rappel « un workflow à
  la fois ». Effet : je m'en suis tenu à deux `publish_workflow` et à rien d'autre.
- **Rapport d'audit `.orchestre/preuves/032-038/rapport.md`** (lu en entier) : verdict « PUBLIABLE EN SIMULATION » pour les deux, versions
  `9106bdf6…` et `d19fec51…`, aucun nœud d'envoi ni d'écriture (GET seulement), et les deux conditions de Benj qui restent hors des
  workflows. Effet : ce sont les valeurs que j'ai contrôlées avant de publier, et les deux points de la section « Ce qui reste à Benj » ci-dessous.
- **MCP `n8n-oracle`** : `search_workflows` (état de tous les `presti-*`, avant et après), `get_workflow_details` (avant et après, sur les
  deux), `publish_workflow` (deux appels, avec le `versionId` exact). Effet : ce sont les seuls gestes sur l'instance ; aucun nœud, réglage,
  identifiant ni exécution touché.
- **Non chargés, et pourquoi** : skills de design, de pages, de vidéo (sans objet) ; `get_workflow_sdk_reference` et
  `get_workflow_best_practices` (on ne construit ni ne modifie aucun workflow) ; `security-review` (aucun diff : le contrôle est la
  comparaison des nœuds avant/après, ci-dessous).

# 032-039 — presti-detecteurs et presti-briefing-matin publiés en simulation

Fait le 02/11/2026 par Claude Code (hôte d'agents Oracle). Horloge de l'hôte (`date`) : publication entre **21:21 et 21:22 UTC**, soit
22 h 21 à Paris (heure d'hiver).

## Ce qui a été publié

| Workflow | Identifiant | Version publiée | Avant | Après |
|---|---|---|---|---|
| presti-detecteurs | `J8pduyxn9seR8Z9t` | `9106bdf6-2b45-45cb-b274-8f672ef12b12` | `active: false`, `activeVersionId: null`, `triggerCount: 0` | `active: true`, `activeVersionId` = `versionId` = la version publiée, `triggerCount: 1`, `activeVersion.sameAsDraft: true` |
| presti-briefing-matin | `xPIDCvkp8Gk08A2E` | `d19fec51-b268-41be-bea2-9999bdfff1fe` | `active: false`, `activeVersionId: null`, `triggerCount: 0` | `active: true`, `activeVersionId` = `versionId` = la version publiée, `triggerCount: 1`, `activeVersion.sameAsDraft: true` |

Contrôlé avant de publier, sur les deux (`etat-avant.json`) : version courante égale à celle de l'objectif, `settings.errorWorkflow` =
`AQeHiC58UgbMR4Kr` (presti-erreurs), `saveDataSuccessExecution: none`, `saveDataErrorExecution: all`, fuseau `Europe/Paris`. Aucune
version ne différait : la question n'a pas eu lieu d'être.

Contrôlé après (`etat-apres.json`) : mêmes réglages ; les `nodes` du brouillon, triés, sont **identiques octet pour octet** avant et après
pour les deux (`jq -S` puis `cmp`) ; la liste `search_workflows` montre que seuls ces deux-là ont changé (les autres `presti-*` restent
`active: false`, presti-erreurs reste `active: true` comme avant). Les fichiers `etat-avant.json` et `etat-apres.json` contiennent les
réponses de `get_workflow_details` telles que le MCP les a rendues, rangées sous `presti-detecteurs` et `presti-briefing-matin`.

## Ce qui tournera, et quand (déclencheurs relus dans `etat-apres.json`)

- **presti-detecteurs** : un seul déclencheur, « Déclencheur 6 h 45 » — **chaque jour à 6 h 45** (fuseau `Europe/Paris`). Premier passage :
  **mardi 03/11/2026 à 6 h 45**. 41 nœuds : 18 lectures HTTP `GET` vers l'API REST du projet Supabase, 1 lecture Supabase `getAll`
  (`regles_automatisation`, `limit 1`), du calcul (Code), aucun envoi, aucune écriture ; la branche d'erreur ne fait que composer un message.
- **presti-briefing-matin** : un seul déclencheur, « Déclencheur 7 h 30 » — **chaque jour à 7 h 30** (Paris). Premier passage :
  **mardi 03/11/2026 à 7 h 30**. 19 nœuds : 7 lectures `GET`, du calcul, une seule sortie (le « Bilan du passage », agrégé, sans identifiant
  de compte). Les lignes « à écrire » restent dans le nœud précédent et ne partent nulle part.
- Un échec d'un passage déclenche presti-erreurs (déjà actif), qui prévient `#presti-auto` sans donnée. Un passage réussi ne garde rien
  (`saveDataSuccessExecution: none`) : le lendemain, le succès se voit au compteur d'exécutions, pas au contenu. Un passage manqué (n8n
  arrêté) n'est pas rattrapé.

## Ce qui reste à Benj (rien de cela n'a été fait ici, c'est interdit à cette tâche)

1. **Supprimer les exécutions n° 333 et 334** de presti-detecteurs (vraies données de `regles_automatisation`). Je n'y ai pas touché, ni
   exécuté quoi que ce soit à la main : le geste lui revient.
2. **La durée de conservation des échecs** (condition (1) de l'audit 032-038) : rien ne la borne par workflow ; la purge de l'instance est
   active par défaut à 336 h (14 jours), non relevée ici. Soit `EXECUTIONS_DATA_MAX_AGE=168` dans `/opt/n8n-complet`, soit une ligne au
   registre (`docs/registre-traitements.md`, § 23 bis) qui retient 14 jours. À régler avant le premier échec réel plutôt qu'après.

## Ce qui n'a pas bougé

Les cinq autres workflows `presti-*` (suivi-artisan, sauvegarde, garde-sauvegarde, demande-demo, apres-chantier) et `lib-erreur-commune` :
inactifs avant, inactifs après. Aucun identifiant n8n créé ou modifié, aucune exécution lancée ou supprimée, aucun fichier hors de ce dossier.
