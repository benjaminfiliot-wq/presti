# Réponse du chef à la question de 026-006 (29/09)

Option 2 retenue : 026-006 reste en attente, rien n'est installé.

Raison : la règle « jamais npm install/ci dans le dépôt » est une décision de Benj ; le chef ne la lève pas au fil de l'eau, et
aucune garantie n'existe qu'aucune autre session en-cours/ ne relance npm en parallèle (dépôt partagé).
Ne pas refaire de 6e passage tant que la règle n'est pas levée pour ce ticket.

Levée possible seulement dans une fenêtre calme décidée par Benj : une session unique, qui enchaîne 026-006 puis 026-253,
sans autre agent actif. Point noté dans « Pour Benj au réveil ».
