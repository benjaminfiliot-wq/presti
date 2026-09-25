---
name: suite-qui-seme-ses-donnees
description: Une suite qui sème elle-même ses lignes ne prouve que la moitié aval — la promesse peut être verte et le produit muet
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 80cc957c-aa60-452a-9898-68b6b198a63a
  modified: 2026-09-10T10:28:35.027Z
---

Une suite e2e qui **crée elle-même les lignes qu'elle vérifie** ne prouve que la moitié aval de la
chaîne. La moitié amont — *le produit pose-t-il seulement ces lignes ?* — n'est jamais exercée, et
personne ne le voit parce que la suite est verte.

Cas réel (Presti, 10/09/2026) : `relances-e2e` créait les lignes `relances` avec la clé service, puis
prouvait magnifiquement que le cron les envoie, s'arrête au bon moment, épargne les fondateurs. La
promesse 16 « Relances automatiques » était ✅ dans `plans/promesses.md` depuis le 05/09. En réalité le
produit ne planifiait **jamais** de relance en Essentiel : le seul point d'insertion vivait dans la
branche réservée à l'assistant autonome, vendu à partir de Studio. Un client à 29 € payait une ligne de
grille qui ne s'exécutait pas — trouvé en confrontant le guide de démarchage au code, pas par les tests.

**Pourquoi :** une preuve verte endort. Plus la suite est soignée sur sa moitié, plus l'autre moitié
paraît couverte. Et ça touche exactement les fonctionnalités qui s'arment en silence (relances,
notifications, tâches planifiées) : leur absence ne fait jamais d'erreur, juste rien.

**Comment l'appliquer :**
- Devant une suite qui `insert()` son propre décor, se demander *qui pose ça en vrai ?* et remonter à
  la route. Si aucun test n'appelle cette route, la promesse est verte à moitié.
- Écrire au moins un cas qui part du **geste de l'utilisateur** (appeler la route importée localement,
  avec une vraie session) et laisse le produit créer les lignes — cf. `relances-e2e` §9-10.
- Un correctif de ce genre se valide en deux temps : jouer la suite sur le code d'AVANT et compter les
  rouges, puis sur le code d'après. Sans le premier temps, le test ne prouve rien.
- Le pendant côté vente : voir [[decompte-promesse-vs-code]] et [[presti-state]].
