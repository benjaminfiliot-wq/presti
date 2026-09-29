# Réponse de Claude Code — 026-119 (28/09)

## Décision

**Option 1** (celle demandée) : CR-4 de `scripts/crieur-qa.mjs` ne dépend plus du format ICU du système. Le composeur (`lib/crieur/composer.ts`, `lib/crieur/faits.ts`) n'est pas modifié — le patch de Codex (`.orchestre/travail/usine/026-119/resultat.patch`) est appliqué tel quel.

## Pourquoi CR-4 était rouge sur ce poste

`Intl.DateTimeFormat('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(d)` rend `« lundi à 12:00 »` sous l'ICU de Linux mais `« lundi 12:00 »` (sans « à ») sous l'ICU de ce Windows. Le test faisait `fmt.format(d).split(' à ')`, qui ne coupe donc plus rien sur ce poste : `jour = "lundi 12:00"`, `heure = undefined`, et `(heure||'').startsWith('12:00')` échoue toujours — même pour un `composerLot` parfaitement correct. Reproduit avant correction :
```
node -e "console.log(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date('2024-01-01T11:00:00.000Z')))"
→ "lundi 12:00"   (attendu par le test : "lundi à 12:00")
```

## Correction minimale

Un seul bloc changé dans `scripts/crieur-qa.mjs` (CR-4, `horairesSemaine`) : `fmt.format(d).split(' à ')` → `fmt.formatToParts(d)`, en lisant les parts nommées `weekday`/`hour`/`minute` au lieu du texte assemblé (dont le séparateur dépend de l'ICU). Rien d'autre n'a changé : mêmes exigences (jour attendu, 12:00 pile, dans les 7 jours), même sévérité.

```diff
-        const [jour, heure] = fmt.format(d).split(' à ')
-        if (!(heure || '').startsWith('12:00')) s.echoue('CR-4', `horairesSemaine[${i}] : ${iso} n'est pas 12 h de Paris (${fmt.format(d)})`)
-        if (attendus[i] && !jour.toLowerCase().startsWith(attendus[i])) s.echoue('CR-4', `horairesSemaine[${i}] : ${jour}, ${attendus[i]} attendu`)
+        const parties = fmt.formatToParts(d)
+        const jour = (parties.find((p) => p.type === 'weekday')?.value || '').toLowerCase()
+        const heure = parties.find((p) => p.type === 'hour')?.value || ''
+        const minute = parties.find((p) => p.type === 'minute')?.value || ''
+        if (!(heure === '12' && minute === '00')) s.echoue('CR-4', `horairesSemaine[${i}] : ${iso} n'est pas 12 h de Paris (${fmt.format(d)})`)
+        if (attendus[i] && !jour.startsWith(attendus[i])) s.echoue('CR-4', `horairesSemaine[${i}] : ${jour}, ${attendus[i]} attendu`)
```

sha256 avant : `75a91c1d69ec7d1fa734ea483cf23c0daf187b37710ac708e2fa0c80497bf8e3`
sha256 après : `4cf99566c87718305f101123998d63d384167dd31d663520e9532bb61dce3340`

## Preuve : le juge reste exigeant (3 sabotages de la production qu'il vise, restaurés octet pour octet)

Cible sabotée à chaque fois : `lib/crieur/composer.ts` (jamais le juge). Référence : sha256 `981924f02522d9c8d5401f5a64273f794f2a4daebc5411c9ce485a1a4c869451` (copie témoin : `.orchestre/preuves/026-119/sabotages/composer.ts.reference`), identique avant tout sabotage et après chaque restauration (vérifié par `diff -q` et par sha256 à chaque étape).

| # | Sabotage réversible dans `composer.ts` | `crieur-qa --partie=composer` avant restauration | Après restauration |
|---|---|---|---|
| 1 | `horairesSemaine` : `[0, 2, 4].map` → `[1, 3, 5].map` (jours décalés d'un cran) | **FAIL CR-4** — `horairesSemaine[0] : mardi, lundi attendu ; […] jeudi, mercredi attendu ; […] samedi, vendredi attendu` | sha256 identique · `PASS CR-4` |
| 2 | `midiParis` : correction ciblée sur 13 h au lieu de midi (`heureParis - 12` → `heureParis - 13`) | **FAIL CR-4** — `horairesSemaine[0] : … n'est pas 12 h de Paris (lundi 13:00)` (×3) | sha256 identique · `PASS CR-4` |
| 3 | `decalageStable` : ajout de `Date.now() % 7` (choix non déterministe) | **FAIL CR-4** — `composerLot(mois-neuf) : deux appels identiques rendent des résultats différents` | sha256 identique · `PASS CR-4` |

Remarque : un premier essai sur `midiParis` (décaler seulement l'heure de départ `Date.UTC(…, 12)` → `Date.UTC(…, 11)`) n'a **rien cassé** — l'algorithme de correction de `midiParis` est insensible à l'heure de départ choisie (il recalcule l'écart réel à partir du fuseau, donc `UTC(H) - (heureParis(H) - 12)` vaut toujours l'instant de midi Paris quel que soit `H`, tant qu'aucun changement d'heure d'été n'est traversé). Remplacé par le sabotage n°2 ci-dessus, qui vise directement la constante cible (13 au lieu de 12) et casse réellement le résultat.

Non-régression : `scripts/crieur-qa.mjs` est aussi le vérificateur de **026-116** (déjà en `fait/`), via `--partie=juge`. Rejoué après la correction : **PASS CR-14, PASS CR-NR** (`node scripts/crieur-qa.mjs --partie=juge`) — la correction, limitée au bloc `horairesSemaine` de `--partie=composer`, ne touche pas `--partie=juge`.

## Patch de Codex

`git apply --check` puis `git apply` de `.orchestre/travail/usine/026-119/resultat.patch` : appliqué sans conflit, seuls `lib/crieur/composer.ts` (123 lignes, nouveau fichier) et `lib/crieur/faits.ts` (28 lignes, nouveau fichier) créés — exactement le périmètre de la fiche. Rien d'autre n'avait bougé depuis le verrou (`avant.txt` du lock == `avant.txt` déjà archivé dans les preuves).

## Lecture des faits et d'un lot composé

13 faits (≥ 12 attendus), identifiants stables, textes ≤ 220 signes. Vérifié à la main (pas seulement CR-1) : les 11 preuves `{ promesse: n }` correspondent chacune à une ligne ✅ de `plans/promesses.md` (promesses 1, 4, 9, 10, 11, 14, 15, 17, 18, 19, 20, motif cité mot pour mot) ; les 2 preuves `{ fichier, motif }` existent verbatim (`CADENCE_RELANCES = [2, 5, 10]` dans `lib/relances.ts`, `PRIX_SITE_TEXTE = '300 €'` dans `lib/siteCommande.ts`) ; le drapeau `siteCommandeVente` du fait `site-sur-mesure` existe bien dans `lib/flags.ts`.

Un lot composé lu en direct (`composerLot` réellement appelé, lundi 2024-01-01 05:00 UTC, `aimantSite: true`) :
- Instagram, lundi 12 h Paris, fait `export-donnees`, se termine par la phrase aimant, `visuel`/`media` posés sur `export-donnees.png` ;
- Facebook, mercredi 12 h Paris, fait `essai-offert`, se termine par la phrase aimant ;
- LinkedIn, vendredi 12 h Paris, faits `relances` + `stock`, **pas** de phrase aimant (jamais sur LinkedIn).

Chaque publication est assemblée d'une phrase de `PHRASES_GABARIT` + texte(s) de fait cité(s) mot pour mot + éventuellement la phrase aimant — exactement ce que `jugerPublication` accepte. Trouvé exact.

## Le seul rouge restant, et pourquoi il n'est pas de 026-119

`node scripts/orchestre.mjs verifier 026-119` (depuis `fait/`) échoue sur **CR-NR** seul : `lib/alertes.ts modifié par rapport à HEAD`. Ce fichier est un des 4 « sentinelles » hors périmètre du Crieur que CR-NR protège dans **tous** les modes (`app/api/cron/relances/route.ts`, `lib/alertes.ts`, `scripts/pipeline.mjs`, `vercel.json`) — jamais touché par cette fiche. La diff en cours (un ajout `chargeFondateur`/`envoyerPushFondateurs`, 6 lignes) appartient à une autre session, active pendant tout mon travail : `git status --porcelain -- lib/alertes.ts` est resté `M` sur 10 relectures espacées de 20 s (~3 min, plus une dernière relecture juste avant d'écrire cette note) — c'est un chantier en cours, pas un flottement d'une seconde.

Essai du recours prévu, `bash presti-ops/usine/verifier-isole.sh 026-119` : **inapplicable ici**, pour une raison d'infrastructure et non de fond — la copie isolée part de `HEAD` + les seuls chemins de `perimetre` (`lib/crieur/composer.ts`, `lib/crieur/faits.ts`). Or `scripts/crieur-qa.mjs`, `lib/crieur/juge.ts` (026-116) et `scripts/fixtures/026-pubs-contenu/crieur/lire.mjs` (026-116) ne sont **eux-mêmes pas encore commités** (`git cat-file -e HEAD:… ` échoue pour les quatre) : la copie isolée ne trouve pas le juge lui-même (`Cannot find module '…/scripts/crieur-qa.mjs'`). C'est un défaut de `verifier-isole.sh` face à un arriéré de fiches non commitées, pas un défaut de 026-119 — à signaler séparément (le prochain commit de 026-116/026-119 par Claude Code le résorbe de fait).

**Preuve de substitution**, équivalente en substance : une racine isolée construite à la main (jamais via `git worktree`, refusé par la permission système ; seulement des `git show HEAD:<fichier>` en lecture, plus des copies), avec les 4 sentinelles à leur contenu **HEAD exact** et `lib/crieur/{composer,faits,juge}.ts` = la production actuelle :
```
node scripts/crieur-qa.mjs --partie=composer --racine=<copie isolée>
→ PASS CR-1, PASS CR-2, PASS CR-3, PASS CR-4, PASS CR-NR — crieur-qa : PASS
```
(sortie complète : `.orchestre/preuves/026-119/verifier-racine-isolee.log`). Ceci prouve que, sentinelles non contaminées, le vérificateur officiel de la fiche est **entièrement vert** — le seul obstacle au PASS de `node scripts/orchestre.mjs verifier 026-119` en arbre principal est `lib/alertes.ts`, hors périmètre, en cours d'écriture par une autre session.

## État laissé et action restante

- `lib/crieur/composer.ts`, `lib/crieur/faits.ts` : patch de Codex appliqué, inchangé depuis.
- `scripts/crieur-qa.mjs` : CR-4 corrigé (diff ci-dessus), reste exigeant (3 sabotages prouvés + non-régression 026-116).
- `.orchestre/fait/026-119.md` : fiche déplacée depuis `en-cours/`. `.orchestre/preuves/026-119/` contient `avant.txt`, `026-119.lock`, `question-codex-28-09.md`, `verifier.log` (dernier essai réel, FAIL CR-NR, 2026-09-28T12:32:10Z), `verifier-racine-isolee.log` (PASS, preuve de substitution), `sabotages/composer.ts.reference`, et cette réponse.
- **Reste à faire, par Claude Code (chef d'écosystème) :** dès que `lib/alertes.ts` redevient identique à HEAD (l'autre session termine ou commite), rejouer `node scripts/orchestre.mjs verifier 026-119` depuis `fait/` — d'après la preuve de substitution, il doit passer du premier coup. Rien d'autre à changer dans le périmètre de 026-119.
