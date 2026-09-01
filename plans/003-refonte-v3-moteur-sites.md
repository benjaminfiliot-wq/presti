# Plan 003 — Refonte v3 : moteur de sites vitrine + plateforme (J0)

> Réponse au prompt `plans/002-refonte-site-plateforme-v3.md`. **J0 = audit + plan chiffré + décisions.** Aucun code n'est écrit tant que Benj n'a pas tranché les 5 points de la §5 ci-dessous. Format : §13 du prompt.

## 1. Ce que j'ai vérifié (dans le vrai code, pas de supposition)

Les 10 constats du prompt (§2) sont **exacts**. Confirmations + 2 découvertes qui changent le chiffrage :

| Constat | Vérifié | Détail |
|---|---|---|
| 🔴 noindex | ✅ | `app/site/[slug]/page.tsx:40` → `robots:{index:false,follow:false}` (idem `/l/`). |
| 🔴 CSS monolithe | ✅ | `globals.css` = **180 Ko**, chargé sur toutes les routes (site client inclus). |
| 🟠 images non optimisées | ✅ **+ pire que décrit** | 10 `<img>` en dur (site 5 / LeadForm 3 / l 2). **Voir découverte D1.** |
| 🟠 thèmes = palettes | ✅ | `nuit`/`epure` ne redéfinissent que couleurs + 1 police (`globals.css` ~l.1980). Layout/échelle/rythme/rayons/texture identiques. |
| 🟠 layout figé | ✅ | Sections en `{tier===3 && …}` dans `page.tsx`, aucun modèle de données. |
| 🟠 motion coûteuse | ✅ | `SiteMotion.tsx` : **4 `getBoundingClientRect()` dans la boucle rAF** (manif, mots, features) ; parallax jamais coupé sous 760px/saveData. |
| 🟡 régé = 1 crédit pro | ✅ | `api/site/generate` consomme 1 crédit tier pro, pas de versioning. |
| 🟡 2 sauts | ✅ | `contact_href` → `/l/[slug]` ; `site_contact_integre` existe mais plus exploité (embed retiré au refactor DNA). |
| 🟡 a11y | ✅ (partiel) | `:focus-visible` posé récemment ; mots géants = `<a>` sans aria-label ; pas de skip-link. |
| 🟡 pas de perf CI | ✅ | Aucun budget/Lighthouse/axe en CI. |

**Stack confirmée** : Next 15.1.6, lenis 1.3.26, gsap 3.15 (**utilisé par `app/Motion.tsx` = landing**, pas par le site), `@react-pdf/renderer` 4.8. **`three` ABSENT**, **`sharp` ABSENT**. Skills `presti-design/verify/ai-lab` présents ; scripts `shot-site/shot-platv2/smoke-test/ai-eval` présents. Migrations → 0022 (prochaines : 0023+).

### Découvertes qui modifient le plan
- **D1 — 🔴 Les images sont des data-URI base64 stockées dans la DB** (`PortfolioUpload.tsx:22` → `toDataURL('image/jpeg',0.72)`, `LogoUpload` → PNG ; **aucun `storage.from()` nulle part**). Conséquences : (a) `next/image` **ne peut pas optimiser une data-URI** (ni AVIF/WebP, ni `sizes`, ni cap de taille) → **G3 exige d'abord une migration vers un bucket Supabase Storage** (upload fichier + URL) ; (b) surtout, **le base64 est inliné dans le HTML servi** → il plombe déjà M4 (poids page) et le LCP bien plus que des `<img>` ordinaires. **C'est le vrai chantier perf n°1, sous-estimé par le prompt.** → Nouveau chantier **A0 (storage)** avant G3.
- **D2 — gsap** est légitimement dans le bundle (landing `Motion.tsx`). Pour le site : garder le rAF maison (plus léger, tient M4). Ne pas tirer gsap dans la route `/site`.

## 2. Divergences / honnêteté technique (§0.4)

1. **Ordre revu : la migration image (A0) passe AVANT tout.** Elle débloque G3 **et** donne le plus gros gain LCP/poids (retire le base64 du HTML). La faire en J1-bis.
2. **3D (C2) : je recommande de NE PAS la faire maintenant.** `three` absent, budget 120 Ko + pipeline Blender→glTF→gltf-transform = plusieurs jours pour un gain incertain vs une belle photo. **Reco : C1 (motion 2D) + thèmes d'abord.** Ne rouvrir C2 que si, après acquisition, un métier premium le justifie. (= reco de la décision 2 du prompt, je la confirme chiffres à l'appui.)
3. **6 thèmes → je recommande 4 d'abord** (les 3 existants poussés en vraie DNA + **Chantier**), puis Bleu-de-travail et Vitrine en second lot. Mieux vaut 4 thèmes non-superposables que 6 tièdes (critère M6).
4. **Formulaire « 1 champ » (E2) en A/B**, pas en bascule directe — ça change le flux de leads en prod (reco prompt confirmée).
5. **CI budgets (G6)** : le repo n'a pas de workflow GitHub Actions visible. Le mettre en place a un coût fixe ; utile mais pas bloquant pour l'acquisition. À faire en dernier (J-fin), ou en local via `scripts/` d'abord.

## 3. Plan chiffré par jalon (chaque jalon = déployable + vérifié via `presti-verify`)

| J | Contenu | Estimation | Definition of done |
|---|---|---|---|
| **J1** | **G1 indexation** : `robots` conditionnel (`site_active && site_seo!==false`), `sitemap.ts` dynamique (sites publiés), `alternates.canonical`, `LocalBusiness` JSON-LD complet + `FAQPage`/`Breadcrumb` (FAQ arrive en J6). Migration `0023_site_seo` (colonne `site_seo bool default true`). | ~0,5 j | `curl` → `index,follow` sur un site publié ; Rich Results OK ; noindex conservé si `site_active=false`. |
| **J1-bis** | **A0 storage images** : bucket Supabase `artisan-media` (public, immutable, hash), réécriture `PortfolioUpload`/`LogoUpload` (upload fichier → URL), script de migration des data-URI existantes → bucket, `remotePatterns`. | ~1 j | Nouvelles images = URL bucket ; anciennes migrées ; HTML servi ne contient plus de base64. |
| **J2** | **A1 CSS scindé** (site.css/plat.css par segment, déplacement à l'identique — 2 commits) + **G3 next/image** (maintenant possible via bucket : `sizes`, `priority` hero, `placeholder=blur`, AVIF/WebP) + **M10 white-label** dans `smoke-test.mjs`. | ~1 j | `/site` ne charge plus le CSS console ; LCP avant/après mesuré ; smoke-test « 0 occurrence presti » vert. |
| **J3** | **C1 motion** : mesures 1×/resize (ResizeObserver), transforms via variables CSS, coupe parallax <760px/saveData/3g/reduced-motion, Lenis off mobile, pause hors-viewport. + 3 gestes tier 3 (masque titres, View Transitions galerie↔lightbox avec repli, curseur matière desktop). | ~1 j | Trace Playwright : 0 long task > 50 ms au scroll (M5) ; M9 vérifié. |
| **J4** | **A2 sections data-driven** (`0024_site_layout` jsonb, défaut dérivé du tier → zéro régression) + **A3 `lib/themes.ts`** (contrat `Theme`). Rendu = boucle sur sections, 1 composant serveur/section, gating serveur. | ~1,5 j | Tous les sites existants rendus **à l'identique** (captures avant/après superposables). |
| **J5** | **B thèmes v2** : `lib/contrast.ts` (garde-fou WCAG accent), 3 existants poussés en vraie DNA + **Chantier** (échelle/rythme/rayons/texture/police distincts). Fontes `next/font` scopées thème. *Artboards Claude Design validés par Benj AVANT code.* | ~2 j | M6 : 4 captures non-superposables ; contraste AA sur les 4 (tier 1/2/3). |
| **J6** | **D contenu IA v2** : `SiteContenu.v2` (process/faq/zone/services_reecrits/titres_sections/ton) rétro-compatible ; garde-fous anti-fabrication étendus + **passe de validation programmatique** (rejet années/%/prix/labels/superlatifs non fournis) ; `0025_site_contenu_versions` + rollback ; 1re génération offerte (décision 4). Éval `ai-eval.mjs` 8 profils. | ~1,5 j | `ai-eval` : 8/8 sans fait fabriqué ; rollback testé ; 1re génération = 0 crédit. |
| **J7** | **F studio « Ma page »** : scinder en onglets, aperçu live iframe (`?preview=1`, desktop/mobile), composer les sections (réordonner/on-off/verrou formule), studio images (recadrage + tailles + hero + alt IA), publier (état + lien + QR). | ~2 j | Un artisan test publie un site complet en < 10 min (chronométré). |
| **J8** | **E plateforme v3** : mobile-first 390px, CTA collant safe-area, **formulaire 1 champ en A/B** (décision 5), upload photo chantier (WebP client + EXIF strip), qualification (urgence/type dans `/messages`), réassurance calculée (délai réel 30j), accusé réception marque artisan, cohérence tokens thème. | ~2 j | M8 instrumenté (event serveur anonyme), baseline enregistrée. |
| **J9** | **G2 domaine perso** (Signature) via API Vercel Domains + DNS + 301. Puis **C2 3D** SEULEMENT si décision 2 = oui. + **G5 axe-core** + **G6 budgets CI**. | 1 j (domaine) + 3-4 j (3D si validé) | Domaine test résolu ; axe 0 critique ; budget CI casse le build si dépassé. |

**Total hors 3D : ~14 j.** Avec 6 thèmes au lieu de 4 : +2 j. Avec 3D (C2) : +3-4 j. → réaliste **~2,5 à 4 semaines** de build selon les arbitrages.

## 4. Risques principaux
- **A2/A3 (sections data-driven)** = le refactor le plus risqué (réécrit le rendu). Mitigation : migration défaut = tier actuel, comparaison de captures obligatoire (M6/A4), commits atomiques réversibles, jamais de rasage (§0.2).
- **A0 storage** : migrer les data-URI existantes sans casser les sites en ligne (faire par lot, garder le fallback data-URI le temps de la bascule).
- **Fail-open `consumeCredit`** : la 1re-génération-offerte ne doit pas ouvrir une faille de quota. Garder fail-open (§14), juste ne pas décompter.

## 5. ⚠️ Décisions — ARBITRÉES PAR BENJ (2026-09-01)

1. **Indexation & domaine** → ✅ **Indexer maintenant + domaine perso ensuite** (A immédiat + B Signature en J9).
2. **3D** → ✅ **ON LA LANCE** (scènes S1 « matière » + S2 « avant/après », Signature/opt-in, budgets perf stricts §C2). J9 inclut C2 (installer `three`, pipeline Blender→glTF).
3. **Nombre de thèmes** → ✅ **6 d'un coup** (Atelier, Nuit, Épuré retravaillés + Chantier, Bleu de travail, Vitrine). +2 j.
4. **1re génération de contenu offerte** → ✅ **OUI** (défaut appliqué, pas d'objection).
5. **Plateforme formulaire 1 champ** → ✅ **A/B 2 semaines**, pas de bascule directe.

**Scope validé = le prompt complet (6 thèmes + 3D). ~4 semaines.** Ordre d'exécution : J1 (indexation) → J1-bis (storage) → J2 → … → J9 (domaine + 3D).

## 6. Ce qui reste / prochaine action
Dès l'arbitrage des 5 points → j'attaque **J1 (indexation)** puis **J1-bis (storage images)**, en respectant `presti-verify` (build → typecheck → déploiement → vérif live → nettoyage), commits atomiques français, preuve à chaque pas (§13). Je ne pousse rien de non vérifié.
