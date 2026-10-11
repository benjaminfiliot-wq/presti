# 026-241 — ce qui reste (05/10/2026)

Rien d'ici n'est une clé ni un code : ce sont des gestes de poste ou de chef, écrits en deux lignes chacun.

1. **Tâche Windows « Presti savoir »** (toutes les 2 h) : non créée, parce qu'un export parcourt tout l'arbre (plus de 6 minutes, plusieurs centaines de Mo) et que le PC est à moins de 1 Go libre. Quand le PC a de la marge : `powershell -ExecutionPolicy Bypass -File .orchestre\preuves\026-241\tache-windows-presti-savoir.ps1`, puis `node scripts/savoir-socle-qa.mjs --reel` (SVS-R3 lit son XML).
2. **Plafond du contrat** (pour le chef, pas pour Benj) : ajouter `"presti:docs/contexte-cloud/**"` aux `exclusions` de `docs/savoir/sources.json` (53 Mo de copies du dépôt, 2 014 fichiers suivis), sinon aucun envoi ne passera : export à 101 Mo pour un plafond de 80 Mo. Ensuite : premier envoi, puis `envoi`, `lecons_dans_consignes` et `bilan_quotidien` à `actif: true` (avec `depuis` et `accord`), commit, push, `usine-agents.mjs maj`.
