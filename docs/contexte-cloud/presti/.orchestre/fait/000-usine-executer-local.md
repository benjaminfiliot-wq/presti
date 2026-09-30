---
id: 000-usine-executer-local
type: test
objectif: Le fichier scripts/fixtures/usine-essai-5/bonjour.txt existe et contient exactement la phrase « bonjour depuis l'usine », jugé par executer
perimetre: [scripts/fixtures/usine-essai-5/**]
interdit: [app/**, lib/**, supabase/**, scripts/usine.mjs]
verifier: node scripts/usine.mjs executer --nom=essai-local --delai=5 -- node scripts/fixtures/usine-essai-qa.mjs usine-essai-5
budget: { fichiers: 1, minutes: 10 }
preuve: sortie de `verifier` dans .orchestre/preuves/000-usine-executer-local/verifier.log
executant: codex
---

# 000-usine-executer-local — une fiche jugée par `executer`, verte sur l'usine comme sur le PC

## Contexte

Le 25/09/2026, les fiches dont le `verifier` passe par `node scripts/usine.mjs executer …` ne pouvaient jamais être vertes
sur l'usine : leur vérificateur appelait executer dans le worktree de la tâche, qui n'a pas la clé ssh du PC (« Host key
verification failed », code 125 à chaque tour). `executer` reconnaît désormais qu'il tourne déjà sur l'usine et lance la
commande sur place. Cette fiche le prouve de bout en bout ; elle ne touche à rien du produit.

## Ce qu'il faut faire

1. Crée le fichier `scripts/fixtures/usine-essai-5/bonjour.txt` avec, pour tout contenu, la phrase `bonjour depuis l'usine`
   (minuscules, apostrophe droite `'`, sans guillemets autour), suivie au plus d'un retour à la ligne.
2. Ne crée aucun autre fichier dans `scripts/fixtures/usine-essai-5/`, et ne touche à rien d'autre.
3. Lance `node scripts/orchestre.mjs verifier 000-usine-executer-local` pour contrôler.

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- La preuve attendue est dans `.orchestre/preuves/000-usine-executer-local/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
