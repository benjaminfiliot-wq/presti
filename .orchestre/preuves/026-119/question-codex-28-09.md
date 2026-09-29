1. Corriger le vérificateur `scripts/crieur-qa.mjs` sur le PC : son contrôle CR-4 découpe `Intl.DateTimeFormat('fr-FR').format()` sur ` à `, alors que cette machine rend `lundi 12:00`. Relancer ensuite la vérification de 026-119 sans modifier le compositeur.
2. Confirmer qu'un autre environnement de vérification rend `lundi à 12:00`, puis y relancer CR-4 et conserver la preuve du verdict.
