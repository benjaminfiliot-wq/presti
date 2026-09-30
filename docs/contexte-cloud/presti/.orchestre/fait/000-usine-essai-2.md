---
id: 000-usine-essai-2
type: test
objectif: Le fichier scripts/fixtures/usine-essai-2/bonjour.txt existe et contient exactement la phrase « bonjour depuis l'usine »
perimetre: [scripts/fixtures/usine-essai-2/**]
interdit: [app/**, lib/**, supabase/**]
verifier: node scripts/fixtures/usine-essai-qa.mjs usine-essai-2
budget: { fichiers: 1, minutes: 5 }
preuve: sortie de `verifier` dans .orchestre/preuves/000-usine-essai-2/verifier.log
executant: codex
---

# 000-usine-essai-2 — second essai du pont PC ↔ usine (version finale de scripts/usine.mjs)

## Contexte

Le premier essai (000-usine-essai) a rendu PASS ; `scripts/usine.mjs` a ensuite changé sa façon d'ouvrir le shell distant.
Cette fiche rejoue le trajet complet avec la version finale. Elle ne touche à rien du produit.

## Ce qu'il faut faire

1. Crée le fichier `scripts/fixtures/usine-essai-2/bonjour.txt` avec, pour tout contenu, la phrase `bonjour depuis l'usine`
   (minuscules, apostrophe droite `'`, sans guillemets autour), suivie au plus d'un retour à la ligne.
2. Ne crée aucun autre fichier dans `scripts/fixtures/usine-essai-2/`, et ne touche à rien d'autre.
3. Lance `node scripts/orchestre.mjs verifier 000-usine-essai-2` pour contrôler.

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- La preuve attendue est dans `.orchestre/preuves/000-usine-essai-2/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
