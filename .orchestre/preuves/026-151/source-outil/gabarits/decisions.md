# Décisions — les choix que les agents prennent seuls

Ce fichier évite qu'un agent s'arrête pour une question qui a déjà une réponse. Avant d'écrire une
`<id>.question.md`, l'agent lit ce tableau. Si la question y est, il applique le défaut sans demander.

| Question | Défaut retenu | Réversible ? |
|---|---|---|
| Photo libre de droits ou générée ? | Libre de droits, créditée (auteur, source, licence dans le dépôt) | Oui |
| Animation lourde sur mobile ? | Non : bureau ≥ 1024 px seulement, et jamais quand `prefers-reduced-motion` est actif | Oui |
| Nom d'une démo (entreprise, personne) ? | Inventé, puis vérifié au registre des entreprises pour ne pas tomber sur une vraie | Oui |
| Doute sur une copie (texte, accroche, promesse) ? | La version la plus sobre | Oui |
| Dépendance nouvelle (paquet npm, service) ? | Non, sauf tâche dédiée qui la nomme | Oui, tant qu'elle n'est pas posée |
| Migration de schéma ? | Jamais par un agent : question à Benj | Non |

## La règle

- Question absente de la liste → l'agent choisit l'**option réversible**, l'écrit ici (une ligne dans le tableau,
  date et id de tâche dans la colonne « Défaut retenu »), et continue. Pas de question, pas d'attente.
- Benj ne reçoit que trois types de questions :
  1. **de l'argent à engager** (abonnement, achat, crédit API au-delà de la tâche) ;
  2. **une action irréversible** (suppression, envoi, publication, migration, paiement) ;
  3. **une posture de marque** (ton, promesse, prix affiché, nom public).
  Tout le reste se tranche ici.

## Décisions ajoutées par les agents

<!-- une ligne par décision, du plus récent au plus ancien : | question | défaut retenu (date, id) | réversible ? | -->
