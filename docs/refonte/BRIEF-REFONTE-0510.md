# Refonte de Presti : site vitrine et app (brief du 05/10/2026)

**Demande de Benj (05/10, soir) :** « refaire complètement le site, avec la meilleure qualité, des sites bien meilleurs, tout ce qu'on a appris depuis qu'on n'a pas touché à Presti, qu'il soit bluffant avec ce qu'on propose comme création de site ». Le site actuel lui paraît « très vieux comparé à nos connaissances ». Les agents travaillent seuls ; Claude Code surveille et donne les instructions.

## Ce qui doit être vrai à la fin
1. **La vitrine (prestiapp.fr) vend d'abord les solutions, en démo animée** : un artisan comprend en 10 secondes ce que Presti fait pour lui (réponse en moins d'une minute, relances, devis, site à la demande). Pas de blabla sur le problème.
2. **La création de sites est la preuve visible** : un site de démonstration au meilleur niveau (le niveau « Lestraque », un seul site, pas dix) montré en vrai, avec ses animations, et la façon dont on le livre.
3. **Un formulaire d'entrée clair** sur la landing (c'est la condition de l'épreuve de bout en bout 026-163 : une demande réelle depuis une adresse perso).
4. **Cartes de réassurance** animées (rapide, fiable, sécurisé, gratuit au départ), thème sombre, mobile d'abord.
5. **Une animation au service du sens** (jamais décorative à l'excès), `prefers-reduced-motion` respecté, aucun contenu caché si un script échoue.

## Cadre (non négociable)
- Design : `presti-design` (jetons de `app/globals.css`, polices Bricolage Grotesque / Hanken Grotesk / JetBrains Mono), pas de HUD circulaire, densité d'un outil de travail dans la console.
- Plateforme publique des artisans : **white-label**, zéro « Presti » côté client final.
- Facturation : franchise en base, aucune TVA affichée (voir la mémoire du projet).
- Rien n'est publié sans les juges : typecheck, build, captures bureau et mobile non vides, aucun défilement horizontal.
- Un fichier, un périmètre : deux fiches ne se chevauchent jamais.

## Phases (une fiche chacune, dans `.orchestre/file/`)
| Fiche | Phase | Exécutant | Sortie |
|---|---|---|---|
| 027-01 | **Audit** de l'existant : captures bureau et mobile, défauts avec fichier et ligne, opportunités, priorités | Antigravity | `docs/refonte/audit/AUDIT.md` + captures |
| 027-02 | Structure et maquette de la nouvelle landing (sections, textes, jetons d'animation) à partir de l'audit | Antigravity | `docs/refonte/MAQUETTE.md` |
| 027-03 | Construction de la landing (formulaire d'entrée compris) | Codex | `app/page.tsx` et composants |
| 027-04 | Page « Création de sites » et démo animée | Codex / Antigravity | pages et démos |
| 027-05 | Améliorations de l'app (parcours, vitesse, mobile) | Codex | par lots |

Les fiches 027-02 à 027-05 sont écrites **après** l'audit : elles s'appuient sur ses mesures, pas sur des impressions.

## Références à lire
`SaaS/Produit/Cerveau-site-v2.md`, `Landing-et-objections.md`, `Ecosysteme-Sites-Kit-2026-09-25.md`, `Etude-Marche-Site-Vitrine-Artisans-2026-09-27.md`, les compétences `presti-design`, `improve-animations`, `find-animation-opportunities`, et les juges existants `scripts/landing-demo-qa.mjs`, `scripts/demo-images-viewport-qa.mjs`.
