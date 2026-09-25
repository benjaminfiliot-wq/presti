---
name: suites-menage-finally
description: "Toute suite qui crée un compte privilégié en production doit le nettoyer dans un finally, privilèges retirés d'abord"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7e59f8cf-41af-4413-b326-b03458018a55
  modified: 2026-09-07T11:51:19.980Z
---

Une suite de test qui crée un compte **privilégié** en production (`is_founder`, un rôle
d'administration) doit le nettoyer dans un `finally`, jamais en fin de chemin heureux — et retirer les
**privilèges avant** de supprimer, parce qu'une suppression peut échouer là où un `update` passe.

**Pourquoi** : le 2026-09-07, sur Presti, `smoke-test` a laissé un compte `is_founder` en base après
une exception. La migration `0065`, collée quelques heures plus tard, contenait
`insert into direction_roles select id from artisans where is_founder = true` — elle a fait confiance
à l'état de la base et promu un compte de test au rang d'administrateur de l'entreprise. Aucune des
trois étapes n'est absurde seule ; c'est leur enchaînement qui ouvre la porte. La même faute est
réapparue le jour même dans `direction-messagerie-e2e`.

**Comment l'appliquer** : `main().catch(...).finally(() => menage())`, le `menage()` retirant le rôle,
puis `is_founder`, puis supprimant la ligne et le compte de connexion — et se plaignant bruyamment si
quelque chose subsiste. Doubler d'une suite permanente qui refuse tout compte privilégié hors d'une
liste close (`scripts/zero-demo-e2e.mjs`). Corollaire : une migration ne doit jamais **déduire** un
privilège de l'état de la base, elle doit **nommer** les comptes concernés.

Voir aussi [[presti-state]].
