# Journal du cerveau « urgence » — détection déterministe (lib/ai.ts : `qualifyLead` → `isUrgent`)

> Une entrée par amélioration, datée : ce qui a changé, pourquoi, le score avant, le score après. Le score est celui de
> `evaluer.mjs` sur `cas.jsonl` (20 cas au 2026-09-13, dont 1 ouvert). Rejouer : `node --experimental-strip-types --import ./scripts/ts-loader.mjs lib/ai/cerveaux/urgence/evaluer.mjs`.

## 2026-09-13 — création du registre, et le vitrier corrigé

- **Avant** : 65 % (13/20). Le vitrier — « ma vitre de salon est cassée » — ressortait en `normal` depuis le 09/09 (`plans/accroches-par-metier.md:56`), et avec lui toute la famille « sécurité du logement » : vitre brisée après effraction, porte-fenêtre cassée, porte claquée avec les clés dedans, cambriolage. La liste `URGENCE_KEYWORDS` ne connaissait que les sinistres de plomberie, chauffage, électricité et les mots de hâte.
- **Ce qui a changé** : `URGENCE_PAIRES` dans `lib/ai.ts` — une urgence peut être une **paire** : un objet fragile (vitre, vitrine, carreau, vitrage, baie vitrée, porte-fenêtre, fenêtre, verre / porte, serrure, clé, verrou) **et** un mot de casse ou de blocage (cassé, brisé, éclaté, explosé, fissuré, effraction, cambriolage / claqué, bloqué, coincé, forcé, enfermé dehors, ne ferme plus, perdu), n'importe où dans le message. Un mot seul ne décide pas : « remplacer une vitre de véranda l'an prochain » reste `normal` (cas `normal-02`), « installer une porte-fenêtre neuve » aussi (`normal-07`).
- **Après** : **95 %** (19/20). Les 158 unitaires IA existants (`scripts/ia-unit-e2e.mjs`) restent verts ; `tsc` propre.
- **Reste ouvert** : `normal-04` — « changer une serrure… **sans urgence** » ressort `urgent` : le détecteur ne lit pas la négation. À traiter au prochain cycle (proposition attendue d'Antigravity : une liste de négations « sans / pas / aucune » devant « urgence / urgent », à condition que les 19 autres tiennent).
- **Branché** : `scripts/tout-verifier.mjs` (suite « IA — cerveau urgence ») et `.husky/pre-commit` — un score qui baisse bloque le commit.
