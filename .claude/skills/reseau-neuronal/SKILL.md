---
name: reseau-neuronal
description: Se servir du réseau neuronal de Presti (vault Obsidian SaaS) par le MCP cerveau, pour Claude Code et Hermes — chercher et lire avant de produire, regles_pour avant une action à risque, et écrire une note neuve ou relier des notes sans jamais toucher une note de Benj ni y mettre une donnée client. À charger avant toute tâche Presti, avant d'écrire dans le vault, et sur « note ça », « ajoute au réseau neuronal », « crée une décision », « un playbook », « un apprentissage ».
---

# Réseau neuronal (vault SaaS) — mode d'emploi commun à Claude Code et Hermes

Le vault `C:/Users/benja/Documents/SaaS` est la mémoire permanente de Presti. On le lit et on l'écrit par le MCP `cerveau`
(Claude Code : serveur `cerveau` ; Hermes : `mcp_servers.cerveau` de son `config.yaml`). Carte du vault : son `CLAUDE.md`.

## Lire — toujours, avant de produire

1. `regles_pour` avec la tâche en une phrase, AVANT toute action à risque : publier, envoyer, migrer, déployer, supprimer,
   dépenser, toucher un compte.
2. `chercher` (question en français, `k` de 6 à 10), puis `lire` le chemin rendu (avec `section` si la note est longue).
3. `quoi_de_neuf` (« 2j », « 7j ») pour ce qui a bougé.
4. `sante_reseau` (lecture seule) pour la santé du réseau : notes isolées, « à relier », et « à revoir » (règles et décisions
   non reconfirmées depuis 30 et 60 jours). Une entrée « à revoir » ne se reconfirme jamais de tête : Claude Code la confronte
   au code (brief `presti/plans/011-cadrage-01-11/briefs/revoir-notes.md`), ou Benj tranche.
5. Citer les notes utilisées, par leur chemin.

## Écrire — seulement ce qui doit durer

1. `chercher` d'abord : si la note existe, la compléter (`relier_notes`) plutôt qu'en créer une seconde.
2. `modele_note` avec le type : dossiers permis, sections du modèle, champs propres, statut initial.
3. `creer_note` : `type`, `titre`, `description` (une phrase), `sections` (texte par titre de section, sans « # » ni « ## »),
   `sources` (au moins une : fichier:ligne, note, page officielle), `auteur` (`claude-code` ou `hermes`) ; au besoin `dossier`,
   `liens`, `tags`, `champs`, `date` (date du fait).
4. `relier_notes` : liens ajoutés à une note d'agent pas encore validée, ou à une note-index « Index - … ».

| Type | Pour | Dossier par défaut |
|---|---|---|
| `decision` | une décision au format ADR (naît `proposee`, numéro ajouté seul) | `10 Presti/04 Décisions` |
| `playbook` | une méthode rejouée à l'identique (prospection, vidéo, workflow n8n) | `30 Prospection/02 Playbooks` |
| `apprentissage` | ce qu'on a appris, écrit comme une règle ; aussi les objections et les verdicts | `90 Apprentissages` |
| `erreur` | une leçon tirée d'une erreur | `90 Apprentissages` |
| `segment` | un client TYPE, jamais un vrai client | `10 Presti/03 ICP` |
| `prompt` | la fiche d'un prompt en service | `50 Automatisations/04 Prompts` |
| `idee` | une idée à tester | `Idees-Vrac` |

## Ce que l'outil refuse — ne jamais le contourner

- Écraser une note, doublonner un nom, écrire hors des dossiers prévus pour le type.
- Un statut autre que le premier du modèle, et les champs `valide_par` / `valide_le` : seul Benj valide.
- E-mail (sauf `@prestiapp.fr` et les adresses d'exemple), téléphone, IBAN, SIREN ou SIRET, UUID, adresse postale,
  « M. / Mme Nom », secret ou jeton, commentaire `%%`, HTML actif, image chargée depuis Internet.
- Un lien vers une note absente, ambiguë ou écartée (données de prospects).

Un refus se traite en reformulant sans la donnée, ou en demandant à Benj. Jamais en écrivant le fichier à la main.

## Les règles de Benj qui s'appliquent ici

- Les cinq règles du 01/11 font foi : `C:/Users/benja/Documents/presti/.claude/rules/` (architecture-outils,
  autonomie-abonnements, email-brevo, migration-production, securite) ; Hermes en a le résumé dans `presti/.hermes.md`.
- « Ne modifie jamais une note stratégique sans ma validation. »
- « Ne stocke jamais de donnée opérationnelle client dans Obsidian. » Les données métier restent dans Supabase.
- « Après une décision importante, propose une note de décision » : `creer_note`, type `decision`.
- Aucun chiffre sans source. Toujours en français ; dire « réseau neuronal ».

## Quand le MCP manque

Lire le vault directement : son `CLAUDE.md`, puis les notes « Index - … » des dossiers numérotés. N'y rien écrire à la main
sans une tâche dont le périmètre est `SaaS/…`. Preuve des garde-fous d'écriture : `node scripts/test-ecriture.mjs` dans
`C:/Users/benja/Documents/cerveau`.
