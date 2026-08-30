---
name: presti-ai-lab
description: >-
  Améliorer et ÉVALUER l'IA générative de Presti (devis chiffrés, réponses aux prospects, relances).
  À utiliser quand on veut rendre l'IA plus forte / plus adaptable, tester une modif de prompt sans
  régression, ou juger la qualité des générations sur plusieurs métiers et situations client.
  Déclenche : "muscle l'IA", "évalue le chiffrage", "teste le prompt", "la réponse auto est faible",
  amélioration IA, eval IA, non-régression des générations.
---

# Presti — Labo IA (améliorer + évaluer)

But : faire progresser l'IA de Presti sans jamais régresser, en **mesurant** au lieu de deviner.
Voir l'agent `presti-ai-engineer` pour l'architecture détaillée de `lib/ai.ts`.

## Boucle d'amélioration
1. **Baseline** : lancer l'éval AVANT toute modif → `node scripts/ai-eval.mjs` (matrice métiers × situations).
   Lire les sorties : ton respecté ? quantités cohérentes ? TVA correcte (10 rénovation, 5.5 énergétique,
   20 neuf/doute) ? garde-fous tenus (aucun prix chiffré dans une réponse, aucun délai inventé) ? spécifique
   au client (pas générique) ?
2. **Modifier** (prompt / signaux déterministes / repères de prix `guideMetier`) — voir l'agent.
3. **Re-éval** : relancer `ai-eval.mjs`, comparer. La modif doit AMÉLIORER sans casser un autre cas.
4. **Contrôles automatiques** intégrés à l'éval : TVA ∈ {0,5.5,10,20}, quantités > 0, prix ≥ 0, présence de
   la signature de l'artisan dans les réponses, absence de chiffre de prix dans les réponses.
5. `npx tsc --noEmit` puis `npx next build` (0 erreur) avant commit.

## Grille de qualité (viser le niveau Anthropic)
- **Adaptabilité** : la sortie change réellement selon le métier, le ton de l'artisan et la demande du client.
  Une réponse réutilisable telle quelle pour un autre client = échec.
- **Utilité** : chaque réponse fait avancer le prospect d'UNE étape concrète (visite, devis, créneau, rappel).
- **Chiffrage** : décomposition fine (fourniture/pose/dépose/main d'œuvre), ordres de grandeur réalistes France,
  hypothèses listées dans `note`, jamais de fausse certitude.
- **Sécurité de ton** : jamais de prix dans une réponse ; urgence → rassurer + 1 action immédiate ; réclamation
  → sérieux sans reconnaître de faute ; hors-métier → honnête.

## Paliers (coût / qualité)
Standard=Haiku (rapide, volume), Pro=Sonnet-5, Expert=Opus-5. Pro/Expert ont le **thinking adaptatif** (auto-dosé).
Tester les 3 : Standard doit rester correct et rapide ; Pro/Expert doivent être nettement plus fins.

## Faire évoluer l'éval
Quand un nouveau type de demande client récurrent apparaît, l'ajouter comme cas dans `scripts/ai-eval.mjs`
(pour ne plus jamais régresser dessus) ET comme signal déterministe + branche de prompt dans `lib/ai.ts`.
