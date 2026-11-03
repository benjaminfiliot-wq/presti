# Les systèmes multi-agents des gabarits (036-019, prompt 6)

Un **chef de département** par gabarit (AI Agent 3.1, Claude Sonnet 5.5, un seul Structured Output Parser strict), qui délègue à ses **spécialistes**, eux-mêmes des agents IA branchés en **agents-outils** (`agentTool` 3, Claude Haiku 5.5) avec leurs outils **de lecture**. C'est l'organigramme des vidéos de @restructureai : un chef qui distribue et rend une note structurée (`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` : l.64-66 et l.75, l.133, l.341, l.377).

## La forme, identique dans les 16 gabarits

```
… → [prédécesseur] → Chef du département X → Revalider le chef (Code, R18) → [agent exécutant d’origine] → … (inchangé)
                       ├ ai_languageModel : Claude Sonnet 5.5
                       ├ ai_outputParser  : schéma strict {decision, note, points_a_confirmer, specialistes_consultes}
                       └ ai_tool : Spécialiste : … (agentTool) ── ai_languageModel : Claude Haiku 5.5
                                                               └─ ai_tool : outils de LECTURE (copies, R23)
```

- Le chef se pose **après** la porte « simulation » (c’est un appel au modèle, donc un effet au sens de R15) : en simulation, ni le chef ni ses spécialistes ne tournent.
- Sa note voyage dans l’élément (`note_du_chef`) ; le code qui compte (devis, relances, paliers) ne la lit pas. **Le chef ne décide jamais d’un montant** : son schéma n’en porte aucun, la revalidation rejette toute somme écrite.
- Les agents d’origine restent les **exécutants typés** du chemin principal (leur schéma, leur revalidation, leurs essais ne changent pas : « rien n’est perdu »). Leurs consignes et leurs outils de lecture sont **repris** par les spécialistes (copies d’outils : un nœud d’outil ne se branche que sur un agent).
- Un spécialiste « vérificateur des faits » complète les gabarits qui n’avaient qu’un ou deux agents, pour que le chef ait toujours deux spécialistes au moins.
- Les outils d’accord humain d’Entreprise (Slack, Teams) restent à l’agent d’origine ; aucun spécialiste n’en reçoit.

| Gabarit | Chef | Posé devant | Spécialistes (agents-outils) | Outils de lecture |
|---|---|---|---|---|
| gabarit-artisan-accueil-reponse | Chef du département accueil | Rédacteur | Qualificateur ; Rédacteur ; vérificateur des faits | 4 + 2 + 2 |
| gabarit-artisan-apres | Chef du département après-chantier | Préparateur de réponses | Préparateur de réponses ; vérificateur des faits | 2 + 2 |
| gabarit-artisan-devis | Chef du département devis | Rédacteur de lignes | Rédacteur de lignes ; vérificateur des faits | 4 + 2 |
| gabarit-artisan-direction | Chef du département direction | Rédacteur de la page | Rédacteur de la page ; Rédacteur du rapport ; vérificateur des faits | 2 + 2 + 2 |
| gabarit-artisan-facturation | Chef du département facturation | Relanceur d'impayés | Relanceur d'impayés ; vérificateur des faits | 4 + 2 |
| gabarit-artisan-operations | Chef du département opérations | Planificateur | Planificateur ; Gardien du stock ; Archiviste | 2 + 1 + 1 |
| gabarit-artisan-suivi | Chef du département suivi | Relanceur | Relanceur ; vérificateur des faits | 4 + 2 |
| gabarit-ent-accueil | Chef du département accueil | Trieur | Trieur ; Qualificateur ; vérificateur des faits | 1 + 4 + 1 |
| gabarit-ent-administratif | Chef du département administratif | Rédacteur de relances | Rédacteur de relances ; Rédacteur d’attestations ; vérificateur des faits | 3 + 2 + 2 |
| gabarit-ent-apres-vente | Chef du département après-vente | Rédacteur de réponses | Rédacteur de réponses ; vérificateur des faits | 4 + 2 |
| gabarit-ent-direction | Chef du département direction | Rédacteur de la direction | Rédacteur de la direction ; vérificateur des faits | 2 + 2 |
| gabarit-ent-finance | Chef du département finance | Rédacteur d’impayés | Rédacteur d’impayés ; vérificateur des faits | 4 + 2 |
| gabarit-ent-leads | Chef du département leads | Rédacteur de séquence | Rédacteur de séquence ; vérificateur des faits | 4 + 2 |
| gabarit-ent-marketing | Chef du département marketing | Rédacteur de contenu | Rédacteur de contenu ; vérificateur des faits | 2 + 2 |
| gabarit-ent-operations | Chef du département opérations | Répartiteur | Répartiteur ; vérificateur des faits | 4 + 2 |
| gabarit-ent-ventes | Chef du département ventes | Rédacteur de propositions | Rédacteur de propositions ; Relanceur ; vérificateur des faits | 4 + 3 + 2 |

**Non concernés (aucun agent IA, rien à organiser)** : `gabarit-artisan-accueil-boite`, `gabarit-artisan-accueil-envoi`, `gabarit-artisan-accueil-leads`. Ils lisent et envoient sans modèle ; le juge les liste, il ne les compte pas verts.

## Détail des outils par spécialiste

### gabarit-artisan-accueil-reponse
- **Qualificateur** (claude-haiku-5-5) : Lire le fil Gmail (qualificateur), Lire le message Outlook (qualificateur), Trier la demande (lib-trier-demande), Lire la photo (lib-lire-photo)
- **Rédacteur** (claude-haiku-5-5) : Lire le fil Gmail (rédacteur), Lire le message Outlook (rédacteur)
- **vérificateur des faits** (claude-haiku-5-5) : Lire le fil Gmail (qualificateur), Lire le message Outlook (qualificateur)

### gabarit-artisan-apres
- **Préparateur de réponses** (claude-haiku-5-5) : Outil : relire les avis de la fiche, Outil : lire et classer un avis
- **vérificateur des faits** (claude-haiku-5-5) : Outil : relire les avis de la fiche, Outil : lire et classer un avis

### gabarit-artisan-devis
- **Rédacteur de lignes** (claude-haiku-5-5) : Tarifs (Google Sheets), Tarifs (Excel), Lire le fil (Gmail), Lire le message (Outlook)
- **vérificateur des faits** (claude-haiku-5-5) : Tarifs (Google Sheets), Tarifs (Excel)

### gabarit-artisan-direction
- **Rédacteur de la page** (claude-haiku-5-5) : Outil : alertes ouvertes, Outil : coût IA
- **Rédacteur du rapport** (claude-haiku-5-5) : Outil : relire les rapports passés, Outil : coût IA (rapport)
- **vérificateur des faits** (claude-haiku-5-5) : Outil : alertes ouvertes, Outil : coût IA

### gabarit-artisan-facturation
- **Relanceur d'impayés** (claude-haiku-5-5) : Lire un paiement (Stripe), Lire le fil (Gmail), Lire le message (Outlook), Contrôleur de conflit (lib-controler-conflit)
- **vérificateur des faits** (claude-haiku-5-5) : Lire un paiement (Stripe), Lire le fil (Gmail)

### gabarit-artisan-operations
- **Planificateur** (claude-haiku-5-5) : Outil : disponibilité Google Agenda, Outil : événements Outlook
- **Gardien du stock** (claude-haiku-5-5) : Outil : lire le tableur de stock
- **Archiviste** (claude-haiku-5-5) : Outil : chercher dans Drive

### gabarit-artisan-suivi
- **Relanceur** (claude-haiku-5-5) : Contrôleur de conflit (lib-controler-conflit), Lire le fil (Gmail), Lire le message (Outlook), Registre des relances (Google Sheets)
- **vérificateur des faits** (claude-haiku-5-5) : Contrôleur de conflit (lib-controler-conflit), Lire le fil (Gmail)

### gabarit-ent-accueil
- **Trieur** (claude-haiku-5-5) : Trier la demande
- **Qualificateur** (claude-haiku-5-5) : Lire le fil Gmail, Lire le fil Outlook, Trier la demande, Lire la photo
- **vérificateur des faits** (claude-haiku-5-5) : Trier la demande

### gabarit-ent-administratif
- **Rédacteur de relances** (claude-haiku-5-5) : Lire le fil Gmail, Lire le fil Outlook, Chercher dans le Drive (outil)
- **Rédacteur d’attestations** (claude-haiku-5-5) : Chercher dans le Drive (outil) (attestations), Lire le classeur Sheets (outil)
- **vérificateur des faits** (claude-haiku-5-5) : Lire le fil Gmail, Lire le fil Outlook

### gabarit-ent-apres-vente
- **Rédacteur de réponses** (claude-haiku-5-5) : Avis de la fiche Google (outil), Ticket Zendesk (outil), Lire le fil Gmail, Lire le fil Outlook
- **vérificateur des faits** (claude-haiku-5-5) : Avis de la fiche Google (outil), Ticket Zendesk (outil)

### gabarit-ent-direction
- **Rédacteur de la direction** (claude-haiku-5-5) : Lire le classeur Sheets (outil), Chercher dans le Drive (outil)
- **vérificateur des faits** (claude-haiku-5-5) : Lire le classeur Sheets (outil), Chercher dans le Drive (outil)

### gabarit-ent-finance
- **Rédacteur d’impayés** (claude-haiku-5-5) : Paiement Stripe (outil), Facture QuickBooks (outil), Facture Xero (outil), Lire le fil Gmail
- **vérificateur des faits** (claude-haiku-5-5) : Paiement Stripe (outil), Facture QuickBooks (outil)

### gabarit-ent-leads
- **Rédacteur de séquence** (claude-haiku-5-5) : Fiche CRM : HubSpot, Fiche CRM : Airtable, Fiche CRM : Notion, Contrôler les conflits
- **vérificateur des faits** (claude-haiku-5-5) : Fiche CRM : HubSpot, Fiche CRM : Airtable

### gabarit-ent-marketing
- **Rédacteur de contenu** (claude-haiku-5-5) : Idées et calendrier (Notion), Contenus passés (Airtable)
- **vérificateur des faits** (claude-haiku-5-5) : Idées et calendrier (Notion), Contenus passés (Airtable)

### gabarit-ent-operations
- **Répartiteur** (claude-haiku-5-5) : Lire l’agenda Google (outil), Lire l’agenda Outlook (outil), Tâches ClickUp (outil), Lire le classeur Sheets (outil)
- **vérificateur des faits** (claude-haiku-5-5) : Lire l’agenda Google (outil), Lire l’agenda Outlook (outil)

### gabarit-ent-ventes
- **Rédacteur de propositions** (claude-haiku-5-5) : Fiche CRM : HubSpot, Fiche CRM : Pipedrive, Fiche CRM : Salesforce, Fiche CRM : Zoho CRM
- **Relanceur** (claude-haiku-5-5) : Contrôler les conflits, Lire le fil Gmail, Lire le fil Outlook
- **vérificateur des faits** (claude-haiku-5-5) : Fiche CRM : HubSpot, Fiche CRM : Pipedrive

## Limites assumées

- **Non joué dans n8n** : le MCP n8n n’est pas branché sur l’hôte d’agents ; le chef et ses spécialistes n’ont tourné nulle part (aucun appel au modèle, règle de la tâche). Prouvés : la structure (juge `scripts/multi-agents-qa.mjs`, R1 à R23 de `n8n-specs-qa.mjs`) et la revalidation du chef (bac à sable, `essais-n8n.json`).
- **La note du chef informe, elle ne décide pas** : elle voyage dans l’élément mais aucun nœud ne l’utilise encore (le code reste l’autorité). L’exploiter (par exemple `besoin_humain` → carte « À valider ») est un choix de produit à faire par la session principale.
- **Coût** : un appel de plus par événement pour le chef, plus les spécialistes consultés (Haiku). À mesurer avant mise en service.
- **`agentTool` dans les dépôts** : aucun des dépôts sous `~/agents/depots/` n’emploie ce type ; ils emploient `toolWorkflow` (34 fichiers). La forme vient de `get_node_types` (`agentTool` 3 : `toolDescription`, `text`, `options.systemMessage`) et de la doc officielle n8n (`n8n-io_skills`, `TOOLS.md` : dans un outil d’agent, `$json` n’est que ce que le modèle passe : le chef transmet donc la question en entier).
