---
name: presti-design
description: >-
  Design system de Presti (dark cinématique + niveau d'animation "DRIP/Framer" codé). À utiliser pour toute
  création ou refonte d'UI Presti : landing, pages, composants, animations. Déclenche : "design", "refonte",
  "anime", "plus beau", "cartes", "hero", "landing".
---

# Presti — Design system (dark cinématique)

Identité validée par Benj : **sombre premium + animé**, humain, jamais gadget. Références : sites animés
façon **DRIP/Framer** (mouvement fluide, gros typo) mais **100% codé** (pas Framer). Cf `SaaS/Recherche/Videos-decortiquees.md`.

## Tokens (déjà dans `app/globals.css`, `:root`)
- Fond nuit `--paper:#0A0C11` · surfaces `--surface:#13161F` / `--surface-2:#1A1E29`
- Texte `--ink:#EDEFF4` / `--muted:#8B93A2` · lignes `rgba(255,255,255,.08)`
- Accent bleu `--accent:#6C8CFF` + violet `--accent-2:#8A6BFF` · cyan HUD `#3EE0F0` · jaune chantier `#F5B301`
- Sémantique : ok `#38CD8C`, warn `#E4B45A`, crit `#F0776A`
- Polices : display **Bricolage Grotesque**, corps **Hanken Grotesk**, data **JetBrains Mono** (next/font)

## Composants existants (réutiliser, ne pas réinventer)
- **AppShell** (`app/AppShell.tsx`) : sidebar espace connecté.
- **Poste de contrôle** (`app/JarvisHub.tsx`) : HUD circulaire interactif SVG (fondateurs).
- **HeroDemo** (`app/HeroDemo.tsx`) : démo animée (téléphone qui se joue seul).
- Classes utilitaires : `.btn--primary`, `.sweepborder` (bordure lumineuse), `.pdemo`, `.will-reveal` (reveal scroll), `.faq-item`, `.legal-wrap`.

## Motion (fait maison, robuste)
- **Reveal au scroll** : `ScrollFx.tsx` (IntersectionObserver + **filet de sécurité** : jamais de contenu caché si l'observer ne se déclenche pas). Toujours prévoir un fallback visible.
- **Compteurs animés** : `Counter.tsx` (fallback = valeur finale directe si rAF pausé).
- Glow néon (`--glow`), bordure qui balaye (`.sweepborder` + `@property --sweep`), flottement 3D (`perspective + translateY`).
- **Respecter** `prefers-reduced-motion` partout.

## Règles pour la refonte site (#2)
1. **Orienté SOLUTIONS + DÉMOS** — pas de blabla sur le problème ; montrer ce qu'on résout, animé.
2. **Cartes de réassurance** animées (✅ Rapide/Fiable/Sécurisé/Gratuit).
3. Animations **au service du sens** (présenter une fonctionnalité), pas décoratives à l'excès.
4. Thème sombre painté explicitement ; wide content en `overflow-x:auto`.
5. Toujours vérifier le rendu réel (voir skill `presti-verify`).
