---
id: 000-marketing-026
type: contenu
objectif: Transformer les 16 fiches marketing C01–C16 de SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md (§3 « La carte vers Presti » et §4 bis « Presti sur les réseaux, en automatique ») en brouillons de la série 026 (026-204 et suivants, ids continus), au format exact des fiches existantes, juges d'abord, avec Laya/Jev branché là où il sert ; écart relevé par la relecture de conformité du 26/09.
perimetre: [.orchestre/brouillons-ecosysteme/026/INDEX.md, .orchestre/brouillons-ecosysteme/026/026-2*.md, .orchestre/preuves/000-marketing-026/**]
interdit: [scripts/**, app/**, lib/**, supabase/**, .orchestre/brouillons-ecosysteme/026/026-0*.md, .orchestre/brouillons-ecosysteme/026/026-1*.md, .orchestre/brouillons-ecosysteme/026/026-200.md, .orchestre/brouillons-ecosysteme/026/026-201.md, .orchestre/brouillons-ecosysteme/026/026-202.md, .orchestre/brouillons-ecosysteme/026/026-203.md]
verifier: node scripts/juges-026-marketing-assemblage.mjs
budget: { fichiers: 22, minutes: 90 }
preuve: sortie de verifier dans .orchestre/preuves/000-marketing-026/verifier.log
executant: antigravity
---

# 000-marketing-026 — les fiches marketing C01–C16 entrent dans la série 026

## Pourquoi
La relecture de conformité du 26/09 (`presti-ops/veille/conformite/rapport.md`, « Corrections non prises ») a relevé un manque. Les fiches C01 à C16 sont détaillées dans le document marketing, mais aucune fiche numérotée de la 026 ne les exécute : personne ne les produira.

## Ce qu'il faut faire
1. **Lire.** Commence par `SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md` en entier. Puis lis `.orchestre/brouillons-ecosysteme/026/INDEX.md` : ses règles, ses colonnes et sa section « Règles ». Termine par 3 fiches existantes, une de juges (claude-code), une de production (codex) et une de mutations, pour copier leur format EXACT.
2. **Écrire les brouillons.** Numérote-les `026-204.md` et suivants, sans trou. Il faut :
   - d'ABORD les fiches de juges (executant: claude-code), qui écrivent les juges des fiches marketing ;
   - puis les fiches de production (codex, ou codex sur l'usine) ;
   - puis une fiche de mutations des juges (verifier = le méta-juge `scripts/juges-026-mutations-preuve.mjs`, comme les autres).
   Tu peux regrouper deux C par fiche quand elles touchent les mêmes fichiers. Chaque fiche cite ses C (par exemple « C03 ») dans son `objectif` ou son titre.
3. **Laya/Jev**, consigne répétée de Benj. Laya est un modèle local de DÉCISION : `jev noul` (probabilité calibrée qu'une affirmation soit vraie), `jev score`, `jev decide`. Il ne rédige pas. Branche-le au minimum :
   - au contrôle des chiffres et des promesses AVANT toute publication (seuil 0,5, sinon bloqué et renvoyé à Benj) ;
   - au score des contenus à republier.
   Voir `presti-ops/usine/laya-LISEZMOI.md` et la section « Ajout du 26/09 » de 026-041.
4. **Règles fixes, déjà tranchées.** Ne les redemande pas.
   - Tout est gratuit : Publora Starter, TikTok, Instagram et Facebook sans pub payante.
   - Chaque publication passe par l'accord de Benj (R24 reste ouvert : accord par publication par défaut).
   - Aucune donnée de prospect vers une IA gratuite ni vers un modèle Ollama `:cloud`.
   - Le compte @vibecode.clips devient le compte TikTok de Presti.
   - Sur plusieurs juges dans un verifier : `node scripts/juges-en-serie.mjs "…" "…"`, jamais `exit $r`, et pas de parenthèses nues.
5. **INDEX.** Ajoute une ligne au tableau pour chaque nouvelle fiche, avec ses dépendances réelles et sa vague. Ajoute aussi la section « Ce que l'assemblage marketing du 26/09 a changé » : les fiches ajoutées, les C couvertes, et Laya.
6. **Vérifier.** Chaque fiche doit passer `node scripts/orchestre.mjs valider <fichier>`. La couverture de 026-001 (`node scripts/juges-026-preuve.mjs --couverture`) doit rester verte.

## Ne pas faire
- Ne modifie AUCUNE fiche existante 026-001 à 026-203. N'écris aucun code (scripts, app, lib, supabase) : ce sont des brouillons.
- N'invente aucune décision de Benj. Une question vraiment ouverte va dans la section « Décisions R à trancher » de l'INDEX, avec ta recommandation.

## Ce que le juge exige (durci le 26/09 à 16 h, après un premier rendu refusé)
Le premier rendu comptait 16 fiches d'environ 1,3 Ko, avec la consigne « se conformer aux spécifications », un périmètre contredit par l'interdit (`lib/contenu/lignes.ts` alors que `lib/**` est interdit) et aucune étape. Il a été mis de côté dans `.orchestre/travail/marketing-squelettes-2026-09-26/`.

Chaque nouvelle fiche doit maintenant :
- **faire au moins 4 000 caractères.** Prends pour modèle 026-140 à 026-145, et copie leur niveau de détail, pas seulement leur en-tête ;
- **dans « Ce qu'il faut faire », donner au moins 5 étapes numérotées et concrètes** : fichiers, fonctions, données, cas limites, et le rôle exact de Laya (`jev noul` sur quel texte, avec quel seuil) ;
- **dans « C'est fini quand », poser au moins 3 critères vérifiables** par le verifier ;
- **avoir un `perimetre` et un `interdit` disjoints** ;
- **citer sa source précise** : `Ecosysteme-Marketing-Reel-2026-09-25.md` et le § ou la ligne de la fiche C correspondante ;
- **pour une fiche d'exécutant** (codex ou antigravity) :
  - dépendre d'au moins une nouvelle fiche de juges ;
  - avoir un verifier qui lance un script écrit par une de ces fiches de juges, ou qui existe déjà.

**Lance `node scripts/juges-026-marketing-assemblage.mjs` toi-même et corrige jusqu'au PASS AVANT de passer la tâche en fait/.**
