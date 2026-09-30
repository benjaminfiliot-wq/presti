---
id: 000-usine-essai-3
type: test
objectif: Le fichier scripts/fixtures/usine-essai-3/bonjour.txt existe et contient exactement la phrase « bonjour depuis l'usine »
perimetre: [scripts/fixtures/usine-essai-3/**]
interdit: [app/**, lib/**, supabase/**]
verifier: node scripts/fixtures/usine-essai-qa.mjs usine-essai-3
budget: { fichiers: 1, minutes: 5 }
preuve: sortie de `verifier` dans .orchestre/preuves/000-usine-essai-3/verifier.log
executant: codex
---

# 000-usine-essai-3 — essai de bout en bout après les corrections de l'attaque du 24/09/2026

## Contexte

`scripts/usine.mjs` a été corrigé après une attaque (paquet : clés dans les binaires et les lignes « ++ », fichiers de clé
filtrés ; retour : le verdict du PC est enregistré avant la marque de l'usine, et un rouge retire le patch du PC). Cette
fiche rejoue le trajet complet avec la version corrigée. Elle ne touche à rien du produit.

## Ce qu'il faut faire

1. Crée le fichier `scripts/fixtures/usine-essai-3/bonjour.txt` avec, pour tout contenu, la phrase `bonjour depuis l'usine`
   (minuscules, apostrophe droite `'`, sans guillemets autour), suivie au plus d'un retour à la ligne.
2. Ne crée aucun autre fichier dans `scripts/fixtures/usine-essai-3/`, et ne touche à rien d'autre.
3. Lance `node scripts/orchestre.mjs verifier 000-usine-essai-3` pour contrôler.

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- La preuve attendue est dans `.orchestre/preuves/000-usine-essai-3/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
