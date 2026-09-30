# Session 2026-09-05 (nuit) — Prompt v8, partie A : le site sur un téléphone

Suite de [[Session-2026-09-05-v7-Modes-et-Code-Email]]. Même protocole : preuve avant correctif, journal `plans/journal-final.md` ([20]-[21]), 0 appel IA, Stripe en test. Plan complet : `plans/007-mobile-et-application.md`.

## Ce que Benj avait vu
« On ne peut pas se connecter depuis la page web sur mobile. » Vrai : sous 760 px, une règle CSS cachait les liens **et** le bouton « Se connecter ». Un artisan client n'avait aucun chemin vers son espace depuis son téléphone. Invisible pour les audits précédents : l'auditeur landing avait testé l'inscription, pas la connexion.

## La suite d'abord : `scripts/mobile-e2e.mjs`
Trois profils Playwright (iPhone 14 WebKit, Pixel 7 Chromium, iPad Mini WebKit), 28 pages non connectées puis connectées (compte démo `atelier-du-chene`), six invariants par page (défilement horizontal, chemin vers /login, cibles ≥ 44 px, champs ≥ 16 px, éléments hors écran, axe critique/grave), puis les parcours : connexion au doigt jusqu'au tiroir de la console, composeur sous clavier (fenêtre −320 px), tâches longues au défilement (CPU ×4), Lighthouse mobile. **Passage rouge en prod : 12/103.**

## Ce que la suite a appris à mesurer (à retenir)
- Un serveur local en http + la CSP `upgrade-insecure-requests` = pages **sans style** ; la suite sert les requêtes https://localhost depuis http. Sans ça, toutes les mesures locales étaient fausses.
- Un tiroir fermé est hors écran par construction ; un onglet dans un conteneur qui défile n'est pas « hors écran » ; un lien texte demande 44 px de haut et 24 de large (WCAG 2.5.8), un bouton 44 × 44.
- axe lit un texte encore transparent pendant une révélation au défilement → `reducedMotion: reduce`.
- La tablette (768 px) se manipule au doigt : les règles « cibles et champs » vont jusqu'à 1024 px, les règles de mise en page restent à 760.
- Les jetons corail `--co*` vivent sur `.lp` : la barre réutilisée hors landing les perdait (bouton « Essayer » transparent).

## Corrigé (5 commits `59934f0` → `8f40d0d`, six passages locaux 12 → 19 → 45 → 74 → 93 → 100)
`PublicNav` (barre publique avec tiroir, aussi sur FAQ/contact/légal) · `100dvh` · tiroir console < 900 px refermé après navigation · 16 px et 44 px sur tout champ ≤ 1024 px · `viewportFit: cover` + zones sûres · claviers (SIRET, CP, téléphone) · lignes de devis en deux rangées · fil de la boîte de réception et de la plateforme client à la hauteur de `visualViewport` · 119 règles `:hover` sous garde · texte sombre sur les boutons corail (3,1:1 → 7:1) · gris « faint » 5:1 · aperçu du devis lisible et étiquettes reliées · thème nuit du site · landing sans GSAP sur tactile (import dynamique sur bureau), scènes 390/520 px, calques coûteux coupés.

## Preuve en production
`mobile-e2e` **100/100** (iPhone 36, Pixel 31, iPad 29) · 0 tâche longue au défilement · Lighthouse mobile **/ 90 · /login 96 · /dashboard 92 · /p 94**, accessibilité **100** partout. Lanceur complet : 42/45 puis 43/45 (G-1.2 alignée), les deux autres = plafond quotidien d'emails atteint par les rejeux (95/80), 45/45 attendu au nightly.

## Reste à Benj
- **Un vrai passage sur son téléphone** (Safari iOS + Chrome Android) — ferme la partie A.
- **La décision B0** : PWA + Capacitor recommandé (même code, stores, push natives, caméra, Face ID ; compiler iOS demande un Mac ou Codemagic). Comptes Apple Developer / Play Console / Firebase à ouvrir en parallèle.
