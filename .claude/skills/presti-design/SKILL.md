---
name: presti-design
description: >-
  Design system de Presti (dark cinématique + corail Claude, niveau d'animation "DRIP/Framer" codé). À utiliser
  pour toute création ou refonte d'UI Presti : landing, site vitrine artisan, console, composants, animations.
  Déclenche : "design", "refonte", "anime", "plus beau", "cartes", "hero", "landing", "palette", "couleurs".
---

# Presti — Design system (dark cinématique + corail)

Identité validée par Benj : **sombre premium + animé**, humain, jamais gadget. Références : sites animés
façon **DRIP/Framer** (mouvement fluide, gros typo) mais **100% codé** (pas Framer).
Cf `C:/Users/benja/Documents/SaaS/Recherche/Videos-decortiquees.md` (coffre SaaS, hors dépôt presti).

## ⚠️ L'accent est le CORAIL `#D97757` — jamais du bleu, jamais du violet

C'est la règle qui compte. Le CSS le dit lui-même : « corail Claude », « aucun violet ».
Une version de cette skill a annoncé un accent bleu `#6C8CFF` + violet `#8A6BFF` pendant des semaines :
c'était faux sur les deux couches, et ça a failli faire dériver dix vidéos publicitaires.
Avant de peindre quoi que ce soit, relire les fichiers ci-dessous — pas cette page de mémoire.

## Où vivent les jetons (pour que la prochaine dérive se voie)

Quatre surfaces, quatre fichiers. **En cas de désaccord, le CSS a raison — corriger cette skill.**

| Surface | Fichier | Sélecteur | Fond |
|---|---|---|---|
| Socle partagé (toutes les pages) | `app/base.css` | `:root` | sombre froid |
| Console (espace connecté, via `AppShell`) | `app/globals.css` | classes app | sombre froid |
| Landing publique | `app/globals.css` (~l.1100) | `.lp` / `.lp-*` | sombre **chaud** |
| Site vitrine + plateforme artisan | `app/site/[slug]/site.css`, `app/p/[slug]/plat.css` | `.site` / `.plat` | **clair** par défaut, thémable |

Il n'y a **aucun `:root` dans `globals.css`** : le socle est dans `base.css`. Chercher les jetons au
mauvais endroit est la première façon de se tromper de palette.

Contrôle de dérive — ces commandes ne doivent sortir aucun bleu/violet vivant :

```bash
grep -nE "#6C8CFF|#8A6BFF|#3EE0F0" app/globals.css
```

```bash
grep -rnE "^\s*--(accent|co|pc)\s*:" app/base.css app/globals.css app/p/*/plat.css
```

### 1. Socle partagé — `app/base.css`, `:root`
Chargé par le layout **racine**, donc présent partout (y compris `/site` et `/p` qui ne chargent PAS `globals.css`).

- Accent **corail** `--accent:#D97757` · clair `--accent-2:#E8946F` · survol `--accent-hover:#C15F3C`
  · encre `--accent-ink:#E8946F` · voiles `--accent-tint:rgba(217,119,87,.14)` / `--accent-tint-2:…,.30`
- Fond `--paper:#0A0C11` · surfaces `--surface:#13161F` / `--surface-2:#1A1E29` · `--elev:#20242F`
- Texte `--ink:#EDEFF4` / `--ink-soft:#C3C8D4` · gris **froid** `--muted:#8B93A2` / `--faint:#7F8797`
- Lignes `--line:rgba(255,255,255,.09)` / `--line-2:rgba(255,255,255,.055)`
- Sémantique : `--ok:#38CD8C` · `--warn:#E4B45A` · `--crit:#F0776A` (+ `-tint` à `.15`)
- `--hi:#F5B301` — jaune chantier, **étincelle rare**, jamais une surface
- `--glow`, `--radius`/`--radius-sm`, `--shadow-sm`/`--shadow`/`--shadow-lg` sont définis ici :
  les réutiliser plutôt que réinventer une ombre.
- **Alias legacy → corail** : `--clay*`, `--green*`, `--bg`, `--soft`, `--live` pointent tous sur
  l'accent ou le fond. Donc `--green` **est corail** (`a{color:var(--green)}`). Ne pas lire ces noms
  au pied de la lettre, et ne pas en créer de nouveaux.
- Eases : `--ease-out`, `--ease-io`, `--ease-apple:cubic-bezier(.16,1,.3,1)`

### 2. Landing publique — `app/globals.css`, `.lp`
Palette **autonome et plus chaude** que le socle ; elle ne touche pas au reste de l'app.

- Corail `--co:#D97757` · `--co2:#E8946F` · `--co-deep:#B85C3C` · `--co-glow:rgba(217,119,87,.5)`
- Fonds `--bg:#09090C` / `--bg2:#0D0C11` · surfaces `--surf:#141319` / `--surf2:#1B1A22` · `--elev:#232029`
- Texte `--ink:#ECEAE6` / `--ink2:#C7C2BA` · gris **chaud** `--muted:#8B867D` / `--faint:#827D74`
- Lignes `--line:rgba(255,255,255,.08)` / `--line2:rgba(255,255,255,.05)`
- `--ok:#46C89A` (redéfini ici) ; `--warn` et `--crit` restent ceux du socle
- Le gris de la landing est **chaud** (`#8B867D`), celui de la console **froid** (`#8B93A2`) :
  ne pas les échanger, l'écart se voit.
- Les barres publiques **hors landing** (FAQ, contact, pages légales) portent une copie réduite de ces
  jetons sur `.lp-head, .lp-tiroir` (~l.2590) : sans elle, `var(--co)` n'existe pas et le bouton
  « Essayer » redevient transparent (contraste 1,05). Toute nouvelle surface `.lp-*` hors landing
  doit faire pareil.

### 3. Artisan (site vitrine + plateforme) — `site.css` / `plat.css`
**Clair et chaud par défaut** — c'est l'inverse du reste du produit, ne pas y appliquer le dark par réflexe.

- Défaut crème : `--sbg:#F5EFE4` / `--spanel:#FBF7EF` / `--sink:#1B1712` (site),
  `--pb:#F5EFE4` / `--ps:#FBF7EF` / `--pi:#1B1712` (plateforme)
- Accent `--pc:#D97757` — **personnalisable par l'artisan**, tout le thème en dérive via `color-mix`.
  Le `#D97757` de `plat.css` n'est que le **défaut** : à l'exécution, `--pc` est injecté en style
  inline depuis l'accent enregistré de l'artisan (`app/site/[slug]/page.tsx`, `app/p/[slug]/page.tsx`).
  `site.css` ne le définit jamais, il le consomme. Donc : **ne jamais coder un corail en dur dans ces
  deux fichiers** — passer par `--pc`, sinon la personnalisation client saute.
- L'encre posée sur l'accent est **calculée pour le contraste** (`--pc-ink`, `--pc-ink-clair`,
  `--pc-ink-sombre`, via `lisibleSur()`) : ne pas la remplacer par un blanc ou un noir en dur,
  l'artisan peut choisir un accent clair.
- Thèmes `data-theme` : `nuit` (sombre), `epure` (blanc minimal type Apple), `chantier` (capitales,
  angles vifs, `border-radius:0`), `bleu`, `vitrine`. Plus `.site-dark` pour une section sombre isolée.
- Le `bleu` de `data-theme="bleu"` est un **thème client assumé**, pas la marque Presti.

## Polices
Cœur du système (préchargées, `next/font`, déclarées dans `app/layout.tsx`) :
**Bricolage Grotesque** (display, `--font-display`) · **Hanken Grotesk** (corps, `--font-body`)
· **JetBrains Mono** (data, `--font-mono`).
Les thèmes artisan piochent en plus dans une réserve non préchargée : Fraunces (serif éditoriale du
site vitrine), Archivo Narrow, IBM Plex Sans, Manrope, Newsreader, Instrument Serif, Syne, Lora.
Liste à jour :

```bash
grep -n "next/font/google" -A2 app/layout.tsx
```

## Vestiges connus : le HUD « façon Jarvis » (supprimé le 07/09)
Le HUD circulaire a été retiré du produit **mais son CSS est resté** dans `app/globals.css` :
sélecteurs `.hud*` et `.jv-*`, ~130 règles, portant le cyan `#3EE0F0` et les trois derniers `#6C8CFF`
(un dégradé radial, une barre de progression, le bouton `.jv-save`).

**C'est du code mort** : aucun `.tsx` du dépôt ne référence `hud` ni `jv-` (vérifié le 10/09). Idem
pour `.will-reveal`, restée dans le CSS alors que la landing utilise `.reveal`.

Donc : **ne pas les repeindre en corail**. Repeindre du code qui ne rend rien ne change rien à
l'écran et laisse le piège en place. Ils sont écrits ici pour qu'on cesse de les prendre pour la
palette. Le vrai geste est de les supprimer — dans une passe dédiée, pas en marge d'une refonte.
Ne jamais réintroduire le HUD, le radar animé ou le cyan.

## Composants existants (réutiliser, ne pas réinventer)
- **AppShell** (`app/AppShell.tsx`) : sidebar de l'espace connecté ; c'est lui qui importe `globals.css`.
- **Poste de contrôle** (`app/controle/`) : l'écran unique du fondateur — barre d'état permanente
  (`BarreEtat.tsx`), rail d'onglets avec compteurs, palette de recherche Ctrl+K / ⌘K (`Recherche.tsx`),
  tableaux denses. Densité d'un outil de travail : pas de grandes cartes décoratives.
- **Démos landing** : `HeroApp.tsx` (héros — scène **visible par défaut**, rendue serveur, lisible
  avant JS), `DemoSequence.tsx`, `DemoVideo.tsx`, `Comparatif.tsx`, `Visite.tsx`.
  *(Il n'y a plus de `HeroDemo.tsx`.)*
- Classes utilitaires : `.btn--primary`, `.sweepborder` (bordure lumineuse), `.pdemo` (téléphone de
  démo), `.reveal` / `.reveal-kids` (reveal scroll), `.count`, `.faq-item`, `.legal-wrap`.

## Motion (fait maison, robuste)
- **Moteur landing** : `app/Motion.tsx` — **GSAP ScrollTrigger** (`gsap ^3.15`), et non un
  IntersectionObserver maison. Il gère `.reveal` / `.reveal-kids` (cascade via `--d`), le parallax
  `.parallax[data-speed]` et les compteurs `.count[data-to][data-suffix]`.
  *(Il n'y a plus de `ScrollFx.tsx` ni de `Counter.tsx`.)*
- **Filet de sécurité obligatoire** : rien ne doit jamais rester caché si ScrollTrigger échoue. Le
  masquage n'est armé qu'après coup (`.lp` reçoit `.reveal-armed`) ; sans JS, tout reste visible.
  Reproduire ce schéma pour toute nouvelle animation d'apparition.
- Site vitrine : moteur séparé `app/site/[slug]/SiteMotion.tsx`.
- Smooth scroll **Lenis** (`lenis ^1.3`), actif seulement sur les pages qui l'initialisent (`html.lenis`).
- Glow (`--glow`), bordure qui balaye (`.sweepborder` + `@property --sweep`), flottement 3D
  (`perspective` + `translateY`).
- **Respecter `prefers-reduced-motion` partout** : repli = tout visible, aucun mouvement, compteurs
  affichés à leur valeur finale.

## Règles pour la refonte site
1. **Orienté SOLUTIONS + DÉMOS** — pas de blabla sur le problème ; montrer ce qu'on résout, animé.
2. **Cartes de réassurance** animées (✅ Rapide / Fiable / Sécurisé / Gratuit).
3. Animations **au service du sens** (présenter une fonctionnalité), pas décoratives à l'excès.
4. **Peindre le fond explicitement, avec la palette de la bonne surface** : sombre sur la landing et
   la console, **clair** sur `/site` et `/p`. Wide content en `overflow-x:auto`.
5. Toute nouvelle fonctionnalité livrée se montre dans la vitrine de la landing : une scène dans
   `DemoSequence.tsx` (**un scénario, pas un catalogue** — chaque scène est une capture du vrai
   produit par Playwright, `scripts/demo-captures.mjs` ; rien n'est dessiné à la main) et/ou une
   rangée `.lp-feat`. *(Il n'existe pas de composant `FeatureShowcase` — ne pas le chercher.)*
6. Toujours vérifier le rendu réel (voir skill `presti-verify`).
