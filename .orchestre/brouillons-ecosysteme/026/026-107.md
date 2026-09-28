---
id: 026-107
type: feature
objectif: Déplacer executant.mjs et antigravity.mjs dans le dépôt orchestre (bin/), sans chemin propre à presti, les faire recopier par maj, retirer gemini-cli et qwen des exécutants, puis lancer maj dans presti, jusqu'au vert du groupe source de ../orchestre/test/preuve-026.mjs
perimetre: [../orchestre/bin/executant.mjs, ../orchestre/bin/antigravity.mjs, ../orchestre/bin/orchestre.mjs, ../orchestre/README.md, scripts/executant.mjs, scripts/antigravity.mjs, scripts/orchestre.mjs, scripts/lib/preuves.mjs, scripts/hooks/**, scripts/juges/**, .orchestre/orchestre.json, .orchestre/preuves/026-107/**]
interdit: [../orchestre/test/**, ../orchestre/hooks/**, ../orchestre/juges/**, ../orchestre/gabarits/**, app/**, lib/**, supabase/**, public/**, .claude/**, .orchestre/decisions.md]
verifier: node ../orchestre/test/preuve-026.mjs --groupe=source
budget: { fichiers: 10, minutes: 15 }
preuve: sortie de verifier dans .orchestre/preuves/026-107/verifier.log
executant: claude-code
---

# 026-107 — les exécutants rejoignent la source de l'orchestre

## Place dans la série (assemblage du 24/09)

Cette section fait foi si le texte plus bas cite un autre ordre, un id provisoire ou un numéro de migration provisoire.

- **Id :** 026-107 (ancien id : 026-075 ; provisoire : 026-code-securite-06) · **vague :** 57 de `INDEX.md` · **exécutant :** codex.
- **Dépend de (PASS) :** 026-098.
- **Ids définitifs** des domaines cités (« la fiche NN » d'un domaine = son id provisoire `026-<domaine>-NN`) :
  - code-securite : 01 → 026-002 · 02 → 026-005 · 03 → 026-007 · 04 → 026-003 · 05 → 026-098 · 06 → 026-107 · 07 → 026-109 · 08 → 026-115 · 09 → 026-139 · 10 → 026-004 · 11 → 026-006 · 12 → 026-008 · 13 → 026-102 · 14 → 026-105 · 15 → 026-127 · 16 → 026-121 · 17 → 026-146 · 18 → 026-148 · 19 → 026-150 · 20 → 026-151

## Contexte

**Dépend de :** 026-098.

L'orchestre est un outil à part : son dépôt est `C:\Users\benja\Documents\orchestre`, et presti n'en a qu'une copie, tenue à jour par `node scripts/orchestre.mjs maj`. Sa clé `source` est dans `.orchestre/orchestre.json`. `maj` recopie les paires `bin/orchestre.mjs` → `scripts/orchestre.mjs`, `bin/lib/preuves.mjs` → `scripts/lib/preuves.mjs`, `hooks/*.mjs` → `scripts/hooks/` et les juges déjà installés (`bin/orchestre.mjs:826-835`).

Deux pilotes vivent seulement dans presti. Ils ne sont donc ni versionnés avec l'outil ni recopiés :
- `scripts/executant.mjs` lance Codex en `exec` dans un bac à sable (`:80` : `-s workspace-write`, réseau permis, `--add-dir` du vault et de la source) ;
- `scripts/antigravity.mjs` pilote Antigravity et prend un instantané avant chaque lancement (`instantane()`, `:158-170` ; refus sans instantané, `:175`).

Leur version actuelle (24/09 : `gpt-6-sol` par défaut, `gpt-6-luna` pour les cycles légers, `instantane`, `--add-dir` de la source, mode `--a-blanc`) est la bonne. **C'est elle qu'on déplace, sans rien perdre.**

**Exception à la règle générale** du prompt des exécutants (« tu ne modifies ni `scripts/orchestre.mjs` ni `scripts/antigravity.mjs` ») : cette fiche les met dans son périmètre, parce qu'on les modifie dans la source et que `maj` les propage. Tu écris dans la source, puis tu lances `maj`. Tu ne modifies jamais la copie de presti à la main.

## Ce qu'il faut faire

1. **Copier** `scripts/executant.mjs` et `scripts/antigravity.mjs` de presti vers `../orchestre/bin/`. Ce sont les points de départ, à l'octet près.
2. **Généraliser**, dans `bin/` seulement :
   - la racine du projet est trouvée comme dans `bin/orchestre.mjs` (le dossier qui contient `.orchestre/`, en remontant depuis le fichier ou le répertoire courant) ;
   - le vault vient de la clé `vault` de `.orchestre/orchestre.json`, la source de la clé `source`, le nom du projet de la clé `projet` ;
   - plus aucune occurrence de `presti`, `'SaaS'` ou `Documents`, commentaires compris ;
   - le préfixe du fichier d'index temporaire de `instantane()` devient `<projet>-instantane-` ;
   - le `PROMPT` d'Antigravity nomme le projet par sa clé `projet`. Il ne cite plus `plans/cerveau-site.md`. Sa règle devient : « tu ne modifies ni `scripts/orchestre.mjs`, ni `scripts/antigravity.mjs`, ni `scripts/executant.mjs`, ni les vérificateurs, sauf si la fiche les met dans son périmètre ».
3. **Ne rien affaiblir**, dans `executant.mjs` : toujours `-s workspace-write` et `sandbox_workspace_write.network_access=true`, jamais `danger-full-access` ni l'option qui contourne le bac à sable. Modèle par défaut `gpt-6-sol`. `--add-dir` du vault et de la source quand ils existent. `--a-blanc` gardé.
4. **Rendre `executant.mjs` importable** : `export { binaireCodex }`, et le programme principal (`switch (commande)`) ne tourne que si le fichier est lancé directement. `antigravity.mjs` exporte `PROMPT` et `instantane`.
5. **Retirer les exécutants fantômes** :
   - dans `bin/orchestre.mjs`, `DEFAUTS.executants` vaut `['antigravity', 'codex', 'claude-code']` (`:51`) ;
   - dans `executant.mjs`, les moteurs `gemini` et `qwen` sont retirés : `--moteur=qwen` sort en code 2 (« moteur inconnu ») ;
   - dans presti, la liste `executants` de `.orchestre/orchestre.json` perd `gemini-cli` et `qwen`, et le reste du fichier ne bouge pas.
6. **`maj`** : ajouter à la liste des paires `['bin/executant.mjs', 'scripts/executant.mjs']` et `['bin/antigravity.mjs', 'scripts/antigravity.mjs']`.
7. **`README.md` de l'orchestre** : deux lignes sur les deux pilotes et sur leur recopie par `maj`.
8. **Dans presti** : `node scripts/orchestre.mjs maj`. Cette commande ne lance aucun sous-programme. `scripts/orchestre.mjs`, `scripts/executant.mjs` et `scripts/antigravity.mjs` doivent alors être identiques à la source.
9. **À ne pas faire.** Ne pas toucher `test/`, `hooks/`, `juges/` ni `gabarits/` de l'orchestre. Pas d'expiration des verrous (fiche 07), pas de réaiguillage sur quota (fiche 08). Aucune commande git.

## C'est fini quand

- `verifier` est vert depuis `fait/` : ORS-1 à ORS-8 et ORS-NR.
- `verifier.log` est dans `.orchestre/preuves/026-107/` et n'est pas vide.
- Rien n'a bougé hors `perimetre`.
- Claude Code relit le diff de `bin/executant.mjs` (le bac à sable de Codex), puis il commite dans le dépôt orchestre. Côté presti, les trois scripts recopiés partent au prochain commit de Claude Code.

## Cahier du juge

Le groupe `source` de `../orchestre/test/preuve-026.mjs` (fiche 05) :

- il **lance `maj` lui-même** dans un projet factice et compare les octets (ORS-2), puis il compare les trois fichiers de presti à ceux de la source (ORS-8) ;
- il **lance `lancer … --a-blanc`** dans un factice dont le vault vaut `../coffre`, puis il relit l'`argv` rendu : présence des `--add-dir`, de `workspace-write` et du réseau ; absence de `danger-full-access`, de l'option de contournement du bac à sable et de `--yolo` (ORS-3 à ORS-5) ;
- il **lance `antigravity.mjs lancer`** dans un dossier sans git et exige le refus « instantané impossible » (ORS-6) ;
- il **importe** `scripts/executant.mjs` dans un sous-processus et exige une sortie vide et l'export `binaireCodex` (ORS-7) ;
- il **cherche** `presti`, `SaaS` et `Documents` dans les deux fichiers de `bin/` (ORS-3) ;
- il **relance `test/preuve.mjs`** (ORS-NR).

## Correction du 27/09

Référence de la relecture : `reprise-cloud/docs/revue-fiches-2026-09-26.md`. Les adaptations ci-dessous font partie de cette fiche ; le `verifier` de son en-tête doit exercer les nouveaux cas avant un PASS.

### 1. Défaut, source et correction

- **Défaut :** La distribution et la reprise des exécutants ne connaissent pas Cursor.
- **Source :** Décision Cursor du 26/09 dans `reprise-cloud/memoire/ecosysteme-presti.md:137` et `reprise-cloud/docs/revue-fiches-2026-09-26.md`.
- **Étapes / périmètre :** Inscrire Cursor comme candidat seulement après 026-222 : rôle d’exécutant, périmètre écrit, sandbox, accès au dépôt borné, aucun coût ou abonnement présumé. Si le test de reprise échoue ou si le coût nul n’est pas prouvé, le routeur le saute et conserve Codex/Antigravity.
- **Vérification :** Le groupe source/quota rejoue une tâche fictive interrompue puis reprise par Cursor sans toucher hors périmètre, et refuse l’activation sans garde.

> 28/09 : codex → claude-code. Le périmètre est dans ../orchestre (dépôt séparé, absent de l'usine) : le moteur ne pouvait que le refuser (« périmètre hors du dépôt »).
