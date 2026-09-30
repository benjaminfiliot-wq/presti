---
id: 000-usine-essai
type: test
objectif: Le fichier scripts/fixtures/usine-essai/bonjour.txt existe et contient exactement la phrase « bonjour depuis l'usine »
perimetre: [scripts/fixtures/usine-essai/**]
interdit: [app/**, lib/**, supabase/**]
verifier: node scripts/fixtures/usine-essai-qa.mjs
budget: { fichiers: 1, minutes: 5 }
preuve: sortie de `verifier` dans .orchestre/preuves/000-usine-essai/verifier.log
executant: codex
---

# 000-usine-essai — essai de bout en bout du pont PC ↔ usine

## Contexte

`scripts/usine.mjs` envoie une fiche de l'orchestre à l'usine (serveur Oracle), où Codex la traite dans une copie jetable du
dépôt ; le résultat revient au PC par un patch, et le PC rend le verdict. Cette fiche ne sert qu'à prouver le trajet : elle
ne touche à rien du produit.

## Ce qu'il faut faire

1. Crée le fichier `scripts/fixtures/usine-essai/bonjour.txt` avec, pour tout contenu, la phrase `bonjour depuis l'usine`
   (minuscules, apostrophe droite `'`, sans guillemets autour), suivie au plus d'un retour à la ligne.
2. Ne crée aucun autre fichier dans `scripts/fixtures/usine-essai/`, et ne touche à rien d'autre.
3. Lance `node scripts/orchestre.mjs verifier 000-usine-essai` pour contrôler.

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- La preuve attendue est dans `.orchestre/preuves/000-usine-essai/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
