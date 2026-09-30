# Session 2026-08-31 → 09-01 — Refonte DNA site + plateforme, thèmes, console artisan

> Grosse session. Presti est **live et déployé** (Vercel : prestiapp.fr landing + qg.prestiapp.fr espace connecté ; repo `C:\Users\benja\Documents\presti`, push `main` = déploie). Bien au-delà de l'« étape 1 auth ». Voir aussi [[Architecture-v2-Devis-Factures-SiteClient]] et [[Journal-Decisions]].

## Contexte
Benj jugeait le site vitrine « largement en dessous » des 2 vidéos de référence. On a repris à zéro la **DNA visuelle** et découplé site ↔ plateforme.

## Les 2 vidéos de référence (décodées image par image)
- **FIND** (agence immo) : fond **crème chaud alterné avec panneaux sombres** cinématiques, serif éditorial, **MOTS GÉANTS interactifs** (Buy→/Sell/Rent) sur imagerie, full-bleed, très « agence ».
- **DRIP** (produit) : **panneaux plein écran, une spec par écran**, produit centré, gros chiffres, minimal type Apple, scroll qui morphe.
- Synthèse retenue = **crème éditoriale + panneaux sombres**, énorme typo, full-bleed, scroll cinématique — **volontairement à l'opposé de la console Presti** (nuit graphite/orange) pour une identité propre à l'artisan.

## Ce qui a été livré (tout testé en live, Playwright)
1. **Site vitrine refondu** (`/site/[slug]`), DNA « Atelier » crème + panneaux sombres. 3 niveaux (Essentiel épuré → Signature cinématique complet : hero image, mots géants hiérarchisés, blocs alternés, manifeste, galerie). Smooth scroll Lenis + hero cinétique + parallax des panneaux.
2. **Découplage site ↔ plateforme** : le site **ne contient plus** le chat. Il présente tout, puis un panneau de contact renvoie vers la plateforme (`/l/[slug]`).
3. **Plateforme refondue** (`/l/[slug]`) dans la même DNA crème (avant : sombre proche de Presti → c'est ce que Benj voyait « comme avant »).
4. **Thèmes / DNA au choix** (pas qu'une couleur) : **Atelier** (crème serif), **Nuit** (sombre grotesk), **Épuré** (blanc minimal). S'appliquent au **site ET à la plateforme**. Migration `0022_theme`. Réglé dans Ma page → Apparence.
5. **Console artisan** (`/messages`, côté artisan ≠ interface client) : réponse **auto ou manuelle** + **choix du modèle IA** (Standard/Pro/Expert, respecte la formule) + **devis auto/manuel depuis le fil** → facture en 1 clic.
6. **Abonnements** alignés : Essentiel→site Essentiel, Studio→site Pro, Signature→site Signature ; mentionnent console + thèmes. Prix inchangés (29/59/99).
7. **Démo landing** enrichie : onglets « Plateforme de contact », « Site web (3 niveaux) », « Thèmes au choix ».

## Où c'est (pour Benj, slug `benjamin-filiot`)
- Console (côté artisan) : **qg.prestiapp.fr** → Messages / Ma page / Devis / Factures.
- Plateforme (côté client) : **prestiapp.fr/l/benjamin-filiot** (active).
- Site : **prestiapp.fr/site/benjamin-filiot** — ⚠️ était **hors ligne** (à publier dans Ma page → « Mon site est publié »).

## Reste à approfondir (au choix de Benj)
Interface de communication encore plus poussée, thèmes plus fins (polices/layouts au choix), vidéo promo des sites via **Hyperframes** (outil vidéo branché).

## Coentreprise d'agents (cerveau Obsidian à jour)
Les 12 agents Managed écrivent leurs acquis dans leur mémoire cloud → `sync-down` les remonte dans `Coentreprise/{audit,animation,gestion,mails}/journal.md`. Ce round : **anim-marque** (direction artistique) + **anim-accessibilité** ont revu le site live (voir `Coentreprise/animation/journal.md`).
