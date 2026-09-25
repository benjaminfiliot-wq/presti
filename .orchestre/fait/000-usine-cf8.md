---
id: 000-usine-cf8
type: test
objectif: Sur l'usine, scripts/fixtures/usine-essai-4/bonjour.txt contient « bonjour depuis l'usine » ET constructeur-ferme-qa CF-8 (npm run typecheck du worktree) passe, sans faux rouge dû au node_modules
perimetre: [scripts/fixtures/usine-essai-4/**]
interdit: [app/**, lib/**, supabase/**, scripts/*.mjs, scripts/fixtures/025/**]
verifier: node scripts/fixtures/usine-essai-qa.mjs usine-essai-4 && node scripts/constructeur-ferme-qa.mjs --critere=CF-8
budget: { fichiers: 1, minutes: 20 }
preuve: sortie de `verifier` dans .orchestre/preuves/000-usine-cf8/verifier.log
executant: codex
---

# 000-usine-cf8 — essai de l'usine : CF-8 vert dans un worktree (relecture à froid U2 du 24/09)

## Contexte

Sur l'usine, `node_modules` du worktree était un lien symbolique vers `~/presti/node_modules`. `tsc` résout ce lien vers
son chemin réel, et le critère CF-8 de `scripts/constructeur-ferme-qa.mjs` (qui exige `lib.es5.d.ts` sous
`<arbre>/node_modules`) rendait un faux rouge. `scripts/usine.mjs` pose désormais une copie en liens physiques
(`cp -al`). Cette fiche le prouve de bout en bout. Elle ne touche à rien du produit.

## Ce qu'il faut faire

1. Crée le fichier `scripts/fixtures/usine-essai-4/bonjour.txt` avec, pour tout contenu, la phrase `bonjour depuis l'usine`
   (minuscules, apostrophe droite `'`, sans guillemets autour), suivie au plus d'un retour à la ligne.
2. Ne crée aucun autre fichier dans `scripts/fixtures/usine-essai-4/`, et ne touche à rien d'autre (ni `node_modules`, ni
   un juge : `scripts/constructeur-ferme-qa.mjs` appartient à Claude Code).
3. Lance `node scripts/orchestre.mjs verifier 000-usine-cf8` pour contrôler. Le typecheck de CF-8 prend une à deux
   minutes.

## C'est fini quand

- `verifier` est vert depuis `fait/` : `usine-essai-qa` vert, puis `constructeur-ferme-qa : PASS` avec CF-8 seul
  (« --critere : seulement CF-8 »).
- La preuve attendue est dans `.orchestre/preuves/000-usine-cf8/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
