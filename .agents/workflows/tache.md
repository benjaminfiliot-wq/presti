---
description: Prendre la prochaine tâche de .orchestre/file/, la faire dans son périmètre, la prouver, la vérifier, la livrer en fait/
---

# /tache — la boucle d'un exécutant Presti

1. Lis `.orchestre/contexte.md`, puis `../SaaS/CLAUDE.md` et `../SaaS/Produit/Carte-du-code.md`. N'explore rien d'autre.
2. Lance `node scripts/orchestre.mjs prochaine --agent=<ton-nom>` (garde le même nom pour toute ta session).
   - Code de sortie 2 = aucune tâche compatible : arrête-toi là et dis-le en une ligne.
3. Fais exactement ce que dit la tâche, dans `perimetre` seulement. Ne touche pas à `interdit`. Respecte `budget`.
4. Dépose ta preuve dans `.orchestre/preuves/<id>/` (captures, sorties de commandes).
5. Lance `node scripts/orchestre.mjs verifier <id>`. Rouge ? Corrige et relance, tant que tu restes dans le budget.
6. Vert ? Déplace `.orchestre/en-cours/<id>.md` vers `.orchestre/fait/` puis relance `node scripts/orchestre.mjs verifier <id>` : c'est ce verdict qui compte.
7. Bloqué à n'importe quelle étape ? Écris `.orchestre/en-cours/<id>.question.md` avec deux ou trois options numérotées, puis attends `<id>.reponse.md`. Si tu abandonnes : `node scripts/orchestre.mjs liberer <id>`.
8. Termine par une seule ligne : `<id> : PASS|FAIL — <ligne du verdict>`. Rien d'autre.
