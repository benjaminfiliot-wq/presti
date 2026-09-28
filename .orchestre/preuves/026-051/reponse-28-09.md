# 026-051 — réponse de Claude Code à la question du 28/09 (manche 2, 14h07)

## Question posée (Codex, `question-codex-28-09.md` de cette même date)

1. Mettre à jour le juge et sa fixture hors de cette tâche pour attendre les neuf motifs imposés par la réponse du 28/09, puis relancer la vérification.
2. Réviser explicitement la fiche pour ne garder que six motifs poussés et modifier la règle PF-9 sur les urgences du veilleur.

(Une première question, différente, avait été posée et classée plus tôt le même jour à 13h07 — conservée sans écrasement sous `question-codex-28-09-manche1-13h07.md` : elle demandait d'arbitrer entre six et neuf motifs ; Claude Code y avait déjà répondu « option 1 » en l'écrivant dans la fiche elle-même. La question ci-dessus est la suite : une fois l'option 1 actée, qui corrige le juge ?)

## Décision : **option 1**

Le juge (`scripts/pilotage-push-qa.mjs`) et sa fixture (`scripts/fixtures/026-pilotage/a/alertes-push.json`, `.../jeux.mjs`) attendent désormais les **neuf** motifs poussés : les six de 026-051 (`paiement`, `appel`, `panne_agent`, `argent_bloque`, `coupe_circuit`, `digest`) plus les trois urgents du veilleur ajoutés par la réponse du 28/09 (`usine_injoignable`, `canal_arrete`, `gmail_bloque`). La fiche n'a pas été touchée (sa note du 28/09 dit déjà « option 1 » et « PF-9 du juge reste tel quel : il attend ces neuf motifs ») : l'option 2 (revenir à six motifs) est écartée — elle contredirait `lib/agents/veilleur.ts` (026-047, déjà PASS), qui exporte `URGENTS` avec les trois motifs en question ; PF-9 le vérifie déjà dynamiquement (sans liste figée) et échouerait sinon.

C'est moi, Claude Code, qui ai corrigé le juge (écrit par Claude, CLAUDE.md:23 l'autorise) — pas Codex, dont le périmètre l'interdit explicitement (`interdit: [..., scripts/juges-026-pilotage-preuve.mjs, scripts/fixtures/**, ...]`).

## Correction du juge — minimale, ciblée

**`scripts/pilotage-push-qa.mjs`** (4 changements, tous des constantes/messages, aucune logique nouvelle) :
- `BLOC_DU_MOTIF` : ajout de `usine_injoignable: 'agents'`, `canal_arrete: 'envois'`, `gmail_bloque: 'envois'` (mêmes blocs que `chargeFondateur` dans le patch de Codex, tous valides dans `BLOCS` de `lib/pilotage/liens.ts`).
- PF-2 : `mp.length !== 6` → `!== 9` (comparaison à `P.pousses`, donc tirée de la fixture).
- PF-3 : seuil `n < 7` → `n < 10` (neuf motifs d'entreprise + un paiement d'artisan).
- Textes descriptifs (« six motifs » → « neuf motifs ») dans PF-2 et PF-T1, cosmétique.

**PF-9 n'a pas été touché** : il compare déjà dynamiquement `URGENTS` (lu dans `lib/agents/veilleur.ts`) à `MOTIFS_POUSSES`, sans liste figée — c'est précisément ce qui le fait échouer aujourd'hui sans le patch de Codex, et réussir avec.

**Fixture** (`scripts/fixtures/026-pilotage/a/`) :
- `alertes-push.json` : `pousses` passe de 6 à 9 entrées (ordre : les six puis les trois nouveaux) ; trois alertes piégées ajoutées (`temoin-usine`, `temoin-canal`, `temoin-gmail`), même gabarit que les autres (nom, téléphone, email, montant, référence à 12 chiffres).
- `jeux.mjs` (`verifierAlertesPush`, l'auto-contrôle du jeu, PF-T1) : chaîne attendue de `pousses` étendue aux neuf motifs.

## Preuve : le juge reste rouge sur deux sabotages de la production qu'il vise

Après application du patch de Codex (`lib/pilotage/notifications.ts`, `lib/push.ts`, `lib/alertes.ts`), juge complet lancé une première fois : **PASS** (PF-1 à PF-9 verts, PF-10/tsc vert en 115 s).

Empreintes SHA-256 de l'état correct (post-patch), prises avant sabotage :
```
lib/pilotage/notifications.ts  a9801b833a6f6b0085c2d5f165e9c83212ac766bfea65c40bd63d408d7214909
lib/push.ts                    6591e091ddbe735d87f2542876b3108449cad54537a913be030e113cbe5ce799
lib/alertes.ts                 205f339aa1cf5361b2b7fd7315f700074733dc1faa35992cbfd0042bf9645812
```

**Sabotage 1** — bloc erroné pour `usine_injoignable` dans `lib/pilotage/notifications.ts` (`bloc: 'agents'` → `bloc: 'argent'`, un bloc qui existe mais n'est pas celui attendu) :
→ juge **FAIL — PF-2** (`usine_injoignable : url ".../bloc=argent", ".../bloc=agents" attendu (bloc agents)`), les 9 autres critères verts. Preuve que la nouvelle entrée `BLOC_DU_MOTIF` fait un travail réel.

**Sabotage 2** — retrait complet de `gmail_bloque` de `lib/pilotage/notifications.ts` (liste `MOTIFS_POUSSES` et entrée `CHARGES`) :
→ juge **FAIL — PF-2, PF-3, PF-9** (`gmail_bloque` manquant de `MOTIFS_POUSSES` ; 9 alertes chargées au lieu de 10 ; `gmail_bloque` — motif urgent du veilleur — absent de `MOTIFS_POUSSES`). Preuve que le seuil à neuf (PF-2/PF-3) et la vérification dynamique (PF-9) attrapent chacun le même trou, indépendamment.

Après chaque sabotage, `lib/pilotage/notifications.ts` restauré depuis l'instantané pris juste après le patch ; SHA-256 vérifié identique à l'état correct ci-dessus (octet pour octet) avant de poursuivre.

## Application du patch et vérification finale

- `git apply --check .orchestre/travail/usine/026-051/resultat.patch` : propre (rien n'avait bougé sous le périmètre entre la production du patch et son application).
- `git apply` : appliqué sans conflit (`lib/alertes.ts`, `lib/push.ts` modifiés ; `lib/pilotage/notifications.ts` créé).
- `node scripts/orchestre.mjs verifier 026-051` : **PASS** en 93 s (0 ligne « produite » par la mesure de l'orchestre — artefact de l'ordre demandé : `.lock` déplacé vers les preuves avant `verifier`, donc `lock.sha` absent pour `compterLignes` ; la production réelle est le patch de 90 lignes appliqué plus les corrections du juge/fixture — sans conséquence sur le verdict PF, seulement sur ce compteur cosmétique du digest).
- Sortie complète : `.orchestre/preuves/026-051/verifier.log` (non vide, 10/10 PF verts).

## Rangement

- Question de la manche 2 : `.orchestre/preuves/026-051/question-codex-28-09.md`.
- Question de la manche 1 (13h07, préservée) : `.orchestre/preuves/026-051/question-codex-28-09-manche1-13h07.md`.
- `.lock` → `.orchestre/preuves/026-051/026-051.lock`, `.avant.txt` → `.orchestre/preuves/026-051/avant.txt` (contenu identique à celui déjà présent).
- Fiche : `.orchestre/en-cours/026-051.md` → `.orchestre/fait/026-051.md`.

Aucun commit fait ici (règle absolue) ; Claude Code commitera.
