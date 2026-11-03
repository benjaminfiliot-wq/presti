# Journal de mise en service — partie n8n (tâche 036-024, 03/11/2026)

Écrit par Claude Code sur l'hôte d'agents d'Oracle, le 03/11/2026 entre 16 h 14 et 16 h 30 (UTC), avec le MCP `n8n-oracle` (qui est joignable ici,
contrairement à ce que la consigne de l'hôte annonce). Règle tenue : la porte « simulation » n'a été levée nulle part, aucun identifiant n'a été créé ni
modifié, aucun gabarit `gabarit-*` ni `client-*` n'a été touché, aucun nœud n'a été édité. Seuls deux gestes ont modifié n8n : les `callerIds` (réglages de
workflow) et la publication.

## Ce qui bloque (à lire d'abord)

1. **Aucun identifiant Anthropic n'existe dans n8n** (`list_credentials` : Supabase, deux Slack, OpenAI). Deux workflows portent un nœud « Claude Haiku 5.5
   (sans identifiant) » et **refusent la publication** : `lib-rediger-message` (`xfRUnkwOKSwQezVb`) et `lib-lire-photo` (`UWjCdC5kv3CXt6jm`). Créer l'identifiant est
   interdit à un agent (`securite.md`, `interdit` de la tâche). Conséquence en chaîne : n8n refuse aussi de publier leurs parents tant qu'un enfant n'est pas
   publié — `presti-dep-accueil` (appelle lib-lire-photo), `presti-dep-suivi` et `presti-dep-facturation` (appellent lib-rediger-message) — et donc
   `presti-cerveau`, qui appelle ces trois chefs. **Pour débloquer** : Benj crée l'identifiant `anthropicApi` (clé à plafond, pas celle du produit), l'affecte
   au nœud de chacun des deux `lib-*`, puis on publie dans l'ordre `lib-rediger-message`, `lib-lire-photo`, `presti-dep-accueil`, `presti-dep-suivi`,
   `presti-dep-facturation`, `presti-cerveau`.
2. **À faire par la session principale, en root sur Oracle (non fait ici)** : poser `BOITE_CLE_N8N` dans l'environnement des exécuteurs du conteneur
   `/opt/n8n-complet`, et les modules `imapflow`, `nodemailer` (et `mailparser`) avec `NODE_FUNCTION_ALLOW_EXTERNAL`. Tant que ce n'est pas fait, `lib-boite-lire`,
   `lib-boite-brouillon` et `lib-boite-envoyer` ne peuvent pas joindre une vraie boîte ; en simulation, la relève est épinglée et n'en a pas besoin.
3. **Les exécutions planifiées réussies ne sont pas conservées** (`saveDataSuccessExecution: none` sur ces workflows, voulu pour ne pas gonfler la base).
   Une absence d'exécution dans la liste signifie donc « aucune erreur », pas « n'a pas tourné ». Les « premiers passages » ci-dessous sont des exécutions
   **manuelles** (conservées, `saveManualExecutions: true`) : ce n'est pas le même mode que le déclencheur réel ; c'est dit à chaque ligne.

## 1. Appelants ouverts (étape 1)

Sept socles, `callerPolicy: workflowsFromAList`. Liste existante conservée, puis ajoutés : `presti-cerveau 596OC5mL2aMBq6SD`, `presti-dep-accueil Ls0oFcQzzAk0rWcP`,
`presti-dep-devis dNikTYPKKsivUbd3`, `presti-dep-suivi jo8eQMEwiB9wCbKN`, `presti-dep-facturation bNAF6Xzx5On853kD`, `presti-dep-apres L3GOS7euxi60jCZN`,
`presti-dep-operations 74bDhTw6cEBzPORZ`, `presti-dep-direction oHGOyqsZGoUooxa6`. Jamais `any`. Le réglage relu dans la réponse de chaque écriture.

| Workflow | Id | Liste d'avant | Retour arrière |
|---|---|---|---|
| lib-decider | hckqX1tQjIommtTH | A391vnnTMKmJGhgT | remettre `callerIds = A391vnnTMKmJGhgT` |
| lib-porte-conformite | 8c8vkUeSkfgB5FAM | H33CKQ8sMB3VULfA | remettre `H33CKQ8sMB3VULfA` |
| lib-executer | ADX5mPWqIvq1LGs6 | H33CKQ8sMB3VULfA | idem |
| lib-relancer | jGM56jxeLUVXZIiM | H33CKQ8sMB3VULfA | idem |
| lib-rediger-message | xfRUnkwOKSwQezVb | H33CKQ8sMB3VULfA | idem |
| lib-journaliser | NQg0KDXIa5hhzAvq | rAAqj7NSVJoA3grm | remettre `rAAqj7NSVJoA3grm` |
| lib-qualifier-lead | uvGWZR8fHnXURRV6 | A391vnnTMKmJGhgT | remettre `A391vnnTMKmJGhgT` |

Les douze spécialistes de lots avaient déjà leur chef (ou `presti-boite`) dans leurs `callerIds` : relu, non modifié. `lib-dedoublonner`, `lib-alerter`, `lib-battement`,
`lib-disjoncteur`, `lib-capturer-lead`, `lib-normaliser-telephone`, `lib-rapport-hebdo` : non relevés dans l'étape 7 (c), appelants laissés tels quels.

## 2. Workflows, un par un

« Activé » : en n8n 2.x, publier active. « Premier passage » : pour un `lib-*` ou un chef (déclencheur « appelé par », que le MCP ne peut pas lancer), le passage
est celui d'un **banc d'essai** lancé à la main (inactif, cas fictifs « Exemple. », jamais publié, simulation) ; pour un parent planifié, un lancement manuel
du workflow publié. Retour arrière commun : **dépublier, parents d'abord** (`unpublish_workflow`), puis rétablir les `callerIds` du § 1.

### 2.1 Socles publiés (aucun appelant à eux-mêmes)

| Workflow | Id | Publié | Activé | Premier passage | Résultat | Retour arrière |
|---|---|---|---|---|---|---|
| lib-journaliser | NQg0KDXIa5hhzAvq | oui | oui | non lancé seul ; appelé par les bancs (§ 2.3) | aucune erreur relevée | dépublier |
| lib-dedoublonner | MnNHht0kG7S6ehDV | oui | oui | idem | idem | dépublier |
| lib-alerter | meYNTqcDsMzcFjdr | oui | oui | idem | idem | dépublier |
| lib-disjoncteur | zmmR9U9S0gc3X6tC | oui | oui | idem | idem | dépublier |
| lib-battement | XwjyA6PFjzlI2vpd | oui | oui | idem | idem | dépublier |
| lib-capturer-lead | yj7KzcEjf04iTAcm | oui | oui | idem | idem | dépublier |
| lib-qualifier-lead | uvGWZR8fHnXURRV6 | oui | oui | idem | idem | dépublier |
| lib-decider | hckqX1tQjIommtTH | oui | oui | idem | idem | dépublier |
| lib-relancer | jGM56jxeLUVXZIiM | oui | oui | idem | idem | dépublier |
| lib-normaliser-telephone | 8ahfqH01ZSpb0262 | oui | oui | idem | idem | dépublier |
| lib-porte-conformite | 8c8vkUeSkfgB5FAM | oui | oui | idem | idem | dépublier |
| lib-executer | ADX5mPWqIvq1LGs6 | oui | oui | idem | idem | dépublier |
| lib-rapport-hebdo | 1BFHQyfhuNpTmlrj | oui | oui | idem | idem | dépublier |

Honnêteté : les bancs `lib-banc-socle`, `lib-banc-metier`, `lib-banc-relance` (qui les appellent) n'ont **pas** été relancés ici ; ces treize workflows n'ont donc eu
**aucun passage relu** dans cette tâche. Ils sont publiés et sans erreur, rien de plus. À rejouer par un banc avant de s'y fier.

### 2.2 Spécialistes de lots

| Workflow | Id | Publié | Activé | Premier passage | Résultat | Retour arrière |
|---|---|---|---|---|---|---|
| lib-trier-demande | SrT4QJJmb6LLM1FK | oui | oui | aucun (son chef n'est pas publiable, § « Ce qui bloque ») | non relu | dépublier |
| lib-lire-photo | UWjCdC5kv3CXt6jm | **non** | non | — | refus : identifiant `anthropicApi` manquant | rien à défaire |
| lib-rediger-message | xfRUnkwOKSwQezVb | **non** | non | — | refus : identifiant `anthropicApi` manquant | rien à défaire |
| lib-boite-lire | cQqfkVseZU2Ax0xQ | oui | oui | via `presti-boite` (§ 2.4) | relève épinglée en simulation | dépublier |
| lib-boite-brouillon | zw2k0vo9wpv7lNfr | oui | oui | banc `presti-banc-boite`, exécution 726 | succès | dépublier |
| lib-boite-envoyer | UkMVpSxETSIY4Mku | oui | oui | idem ; nœud SMTP resté désactivé | succès | dépublier |
| lib-controler-conflit | F2son8oGwifPETg3 | oui | oui | banc `presti-banc-suivi`, exécution 734 | succès | dépublier |
| lib-avis-lire | ScpXQIH54wmmuuel | oui | oui | banc `presti-banc-apres`, exécution 717 | succès | dépublier |
| lib-avis-repondre | OW7vXn4aPzSYoSdm | oui | oui | idem | succès | dépublier |
| lib-alerte-liste | v2wfT9qB5e0LHtFI | oui | oui | banc `presti-banc-direction`, exécution 710 | succès | dépublier |
| lib-cout-ia | JtGOKOG1ssFP5z1u | oui | oui | idem | succès | dépublier |
| lib-agenda-creneaux | 414xd7DQaRmEgoTs | oui | oui | banc `presti-banc-operations`, exécution 701 | succès | dépublier |
| lib-synchroniser-outil | znIxgrxNzUvGeanu | oui | oui | idem | succès | dépublier |

### 2.3 Chefs

| Workflow | Id | Publié | Activé | Premier passage | Résultat | Retour arrière |
|---|---|---|---|---|---|---|
| presti-dep-devis | dNikTYPKKsivUbd3 | oui | oui | aucun banc lancé pour lui | non relu | dépublier |
| presti-dep-apres | L3GOS7euxi60jCZN | oui | oui | `presti-banc-apres`, exécution 717 | succès | dépublier |
| presti-dep-operations | 74bDhTw6cEBzPORZ | oui | oui | `presti-banc-operations`, exécution 701 | succès | dépublier |
| presti-dep-direction | oHGOyqsZGoUooxa6 | oui | oui | `presti-banc-direction`, exécution 710 | succès | dépublier |
| presti-dep-accueil | Ls0oFcQzzAk0rWcP | **non** | non | — | refus : `lib-lire-photo` non publié | rien à défaire |
| presti-dep-suivi | jo8eQMEwiB9wCbKN | **non** | non | — | refus : `lib-rediger-message` non publié | rien à défaire |
| presti-dep-facturation | bNAF6Xzx5On853kD | **non** | non | `presti-banc-argent`, exécution 739 (le banc est « succès ») | le chef, non publié, échoue au nœud « Appeler lib-rediger-message » : « Workflow is not active and cannot be executed » (exécution 750). Attendu, même cause. | rien à défaire |
| presti-cerveau | 596OC5mL2aMBq6SD | **non** | non | — | refus : appelle trois chefs non publiés | rien à défaire |

Le banc `presti-banc-cerveau` n'a pas été lancé (le Cerveau n'est pas publiable).

### 2.4 Parents planifiés

| Workflow | Id | Publié | Activé | Premier passage (manuel) | Résultat | Retour arrière |
|---|---|---|---|---|---|---|
| presti-boite | yQK50I6JXchYBH7Y | oui | oui (toutes les 5 min) | exécution 696 | « succès » en 25 ms mais **à relire avec méfiance** : la lecture de l'interrupteur est épinglée ; le bilan dit `appel en erreur: 1`, `defauts: 1`, `importes: 0`. Un passage manuel épingle le déclencheur ; le vrai passage planifié n'a pas été relu (succès non conservés). | dépublier |
| presti-accuse-reception | VnU1onu9T4Z2asTu | oui | oui (chaque minute) | exécution 695 | succès (135 ms) ; GET seulement, envois désactivés | dépublier |
| presti-suivi-artisan | 2HsfV00lGSX1KGY1 | oui | oui | exécution 697 | succès (836 ms) | dépublier |
| presti-demande-demo | 4R2wS9374GUxb63F | oui | oui | exécution 698 | succès (303 ms) | dépublier |
| presti-detecteurs | J8pduyxn9seR8Z9t | **déjà publié avant la tâche** | oui | exécution 699 | succès (2,5 s) | dépublier |
| presti-briefing-matin | xPIDCvkp8Gk08A2E | **déjà publié avant la tâche** | oui | exécution 700 | succès (1 s) | dépublier |

Remarque : `presti-detecteurs` et `presti-briefing-matin` étaient déjà actifs au début de la tâche (`active: true`), alors que leur description les dit « inactifs
jusqu'au go de Benj ». Je n'y ai rien changé ; c'est à signaler à Benj. Non publiés, par choix : `presti-relances`, `presti-reponse-seule`, `presti-apres-chantier`,
`presti-sauvegarde`, `presti-garde-sauvegarde` (hors liste de la tâche), `lib-erreur-commune` (workflow d'erreur : n'a pas besoin d'être publié), tous les
`presti-banc-*` et `lib-banc-*` (restent inactifs), les `ent-exemple-*`, les `gabarit-*`.

## 3. Un workflow qui échoue deux fois est désactivé

Aucun workflow publié n'a échoué en exécution planifiée ni deux fois. Au moment de l'écriture, la liste des exécutions en erreur depuis 16 h 14 UTC ne contient
que l'exécution 750 (chef non publié, appelé par un banc manuel). Rien n'a donc été dépublié. **Condition de relance de ce qui reste hors service** :
l'identifiant `anthropicApi` posé par Benj (§ « Ce qui bloque », point 1).

## 4. Reste à faire, par qui

- Benj : l'identifiant `anthropicApi` (point 1), puis publication dans l'ordre indiqué.
- Session principale (root sur Oracle) : `BOITE_CLE_N8N` et les modules IMAP/SMTP (point 2).
- À rejouer avant de croire « vert » : les trois bancs `lib-banc-*`, le banc `presti-banc-cerveau` et `presti-banc-boite` après publication des deux `lib-*` de rédaction ;
  un passage **planifié** de `presti-boite` (relire les exécutions en erreur après 5 minutes ; une exécution réussie n'est pas conservée).
- Rien n'a été envoyé ni écrit en base par ce travail : tout est resté en simulation (lectures GET, sorties épinglées, `effets_prevus`).
