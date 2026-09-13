# Le cœur de cerveau — `lib/ai/cerveaux/` (prompt v15 §8)

Presti n'a pas de modèle entraîné : il a des **cerveaux configurés** (le prompt de conversation, les consignes par métier, le filtre anti-invention, la détection d'urgence, le chiffrage, la recherche fournisseurs, la persona). Jusqu'ici ils ne s'amélioraient que quand quelqu'un y pensait — le vitrier dont la vitre cassée ressortait en « normal » est resté là quatre jours, jusqu'à ce qu'un audit tombe dessus. Ici, on arrête ça : **un cycle et un registre**.

## Un dossier par cerveau

| Fichier | Rôle |
|---|---|
| `cas.jsonl` | les cas de référence : une ligne = `{ id, message, metier, attendu, origine, statut }`. `statut: "reference"` (vérité établie) ou `"ouvert"` (défaut connu, pas encore corrigé — il entre le jour même, avant la correction) |
| `evaluer.mjs` | rejoue tous les cas contre le cerveau **tel qu'il est** et sort un score ; compare au dernier score accepté (`score.json`) ; **un score qui baisse rend 1 : ça ne se fusionne pas** (`.husky/pre-commit`) |
| `score.json` | le dernier score accepté (`--accepter`), daté — une décision, pas un effet de bord |
| `journal.md` | chaque amélioration, datée : ce qui a changé, pourquoi, le score avant, le score après |

Lancer : `node --experimental-strip-types --import ./scripts/ts-loader.mjs lib/ai/cerveaux/<cerveau>/evaluer.mjs`. Les cerveaux déterministes (urgence, métiers, anti-fabrication, routage, prix) tournent hors ligne, gratuitement, à chaque commit. Ceux qui appellent un modèle (conversation, devis, recherche fournisseurs) passent par `scripts/ai-eval.mjs` — payant, donc à la main et en connaissance de cause.

## D'où viennent les cas — et d'où ils ne viennent jamais

- **Les défauts trouvés** (Benj, les auditeurs) : chacun devient un cas `ouvert` le jour même, avant même d'être corrigé.
- **Les cas synthétiques par métier** : en volume, par Antigravity, à partir de `lib/ai/metiers.ts` ; relus par échantillon.
- **Les corrections des artisans** (la différence entre le brouillon IA et ce qu'ils envoient) : seulement avec le réglage « Aider Presti à s'améliorer » activé (désactivé par défaut), et **anonymisées** par une fonction testée — pas encore construit (voir le journal du cerveau `urgence`).
- **Jamais** une conversation privée lue telle quelle. « La forme, jamais le fond » vaut ici comme au support.

## Le cycle (hebdomadaire, planifié)

1. `evaluer.mjs` sur tous les cerveaux → scores au journal. 2. Les échecs sont triés : consigne fausse, connaissance métier manquante, cas mal écrit. 3. Antigravity propose ; Claude Code relit et fusionne **si le score monte sans faire baisser un autre cerveau**. 4. Le tableau des scores se lit dans le Poste de contrôle (onglet « Cerveaux », à construire).

Apprendre, ici, veut dire : des consignes plus justes, des règles de métier plus complètes, une base de prix qui s'enrichit — mesuré par des cas rejoués. Pas d'entraînement de modèle.
