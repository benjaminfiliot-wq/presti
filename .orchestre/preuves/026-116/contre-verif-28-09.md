# Contre-vérification de 026-116 — 28/09/2026

Contre-vérificateur : Claude Code (agent séparé de l'exécutant). Racine : `C:/Users/benja/Documents/presti`.
Rien commité, rien touché hors `.orchestre/preuves/026-116/` et `.orchestre/travail/` (confirmé : `git diff --stat` sur `lib/crieur/juge.ts` et `scripts/crieur-qa.mjs` vide après restauration, voir sha256 plus bas).

## Verdict

**Vert mécanique confirmé, mais défauts établis sur le fond.** Le mécanisme de preuve de 026-116 est honnête : `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20` juge réellement CR-14 sur le témoin (pas un test qui se contente d'exister), et mes 4 sabotages locaux ainsi que les 4 de Codex reddissent tous le bon critère puis reviennent au vert après restauration bit-à-bit. Mais Codex (revue-codex, gpt-6-sol) et ma propre sonde établissent des défauts réels dans le code jugé et dans le juge lui-même — 4 bloquants, 4 majeurs — dont deux que j'ai vérifiés moi-même en faisant tourner `jugerPublication` : un contournement de préfixe sur `adresse_etrangere`, et l'acceptation d'une publication entièrement vide.

## Moyen

1. **Codex sur l'usine** (`node ../presti-ops/usine/revue-codex.mjs 026-116 --sabotages=4`, gpt-6-sol medium, ~90 min de budget) : a jugé (code 1, pas 3/125), donc pas de repli nécessaire sur ce point. Verdict lu dans `.orchestre/travail/revue-codex/026-116/verdict.json`.
2. **Mes propres sabotages locaux** (4, malgré le jugement réussi de Codex, pour une preuve directement reproductible sur ce poste sans dépendre de l'usine) : édition d'une ligne de `lib/crieur/juge.ts` à la fois, `node scripts/crieur-qa.mjs --partie=juge --temoin` pour lire le critère qui rougit, restauration exacte (Edit inverse), `sha256sum` avant/après pour prouver l'octet-à-octet, puis un passage par le vrai vérificateur de la fiche (`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20`) pendant un sabotage pour prouver que ça remonte jusqu'au critère du vérificateur déclaré.
3. **Sonde indépendante** : un script hors dépôt (`scratchpad/sonde-verif.mjs`) qui importe `lib/crieur/juge.ts` tel quel (non saboté) et appelle `jugerPublication` avec des entrées choisies pour tester deux défauts précis relevés par Codex.

## Sabotages (les miens, en plus des 4 de Codex)

sha256 de référence, avant tout sabotage et après chaque restauration :
`e16b552cfbed3601c4e1c226a19c700ee2e6a88a36625189c4d30c57cfd2c20f  lib/crieur/juge.ts`

| # | Ligne sabotée | Critère rougi attendu | Sortie réelle de `crieur-qa --partie=juge --temoin` | sha256 après restauration |
|---|---|---|---|---|
| S1 | `if ((canal==='instagram'\|\|canal==='facebook') && aimantLeve && dernierePhrase!==PHRASE_AIMANT)` → préfixé `false &&` | CR-14 / aimant_absent | `FAIL CR-14 — aimant-absent-instagram (fautive « aimant_absent ») acceptée à tort ; raison aimant_absent jamais observée dans le corpus` | `e16b552c…` identique |
| S2 | bloc `media_invalide` (3 branches) → chacune préfixée `false &&` | CR-14 / media_invalide | `FAIL CR-14 — media-absent-instagram … ; media-hors-gabarit … ; media-sur-linkedin … acceptée(s) à tort ; raison media_invalide jamais observée` | `e16b552c…` identique |
| S3 | `if (f?.drapeau && drapeaux[f.drapeau]!==true)` → préfixé `false &&` | CR-14 / drapeau_baisse | `FAIL CR-14 — drapeau-baisse (fautive « drapeau_baisse ») acceptée à tort ; raison drapeau_baisse jamais observée` | `e16b552c…` identique |
| S4 | `raisons.add('phrase_inconnue')` → gardé par `if (false)` | CR-14 / phrase_inconnue | `FAIL CR-14 — phrase-inconnue (fautive « phrase_inconnue ») acceptée à tort ; raison phrase_inconnue jamais observée` | `e16b552c…` identique |

Chacun des 4 : PASS avant (CR-14 vert), FAIL pendant (le bon critère et rien d'autre côté CR-14), PASS après restauration, sha256 identique à chaque restauration.

**Propagation au vérificateur déclaré de la fiche** (`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20`), testée pendant S4 :
- avant S4 : ligne `crieur-qa --partie=juge` → `FAIL … CR-NR` (seul, voir « Bruit ambiant » plus bas)
- pendant S4 : ligne `crieur-qa --partie=juge` → `FAIL … CR-14, CR-NR` — le sabotage remonte bien jusqu'au vérificateur de la fiche, pas seulement au sous-juge.
- après restauration de S4 : retour à `FAIL … CR-NR` seul (rejoué une dernière fois pour laisser `.orchestre/preuves/026-116/echecs-attendus.md` dans un état propre, 1237 octets — taille identique à l'original).

## Bruit ambiant (hors périmètre de 026-116, ne pas confondre avec un défaut de la fiche)

Le dépôt est modifié en continu par d'autres sessions pendant cette contre-vérification (mémoire « presti-sessions-concurrentes ») :
- `CR-NR` échoue systématiquement, même sans aucun sabotage de ma part, car `lib/alertes.ts`, `app/api/stripe/webhook/route.ts`, `app/cgu/page.tsx`, `scripts/executant.mjs`, `scripts/fermeture-e2e.mjs` sont déjà modifiés dans le bac par rapport à `HEAD` — aucun de ces fichiers n'est dans le périmètre de 026-116 (certains y sont explicitement interdits).
- Le critère `IMMOBILE` du vérificateur de lot a vu apparaître/disparaître des fichiers différents à chacun de mes deux passages complets (`scripts/usine-repartition.mjs`, puis `scripts/fixtures/026/savoir/lecons/*.mjs`, puis `.orchestre/fait/026-071.md`, `.orchestre/file/026-106.md`…) : ce sont d'autres agents qui écrivent en direct dans `.orchestre/` et `scripts/` pendant que je travaille, pas un effet de mes sabotages (les miens ne touchent que `lib/crieur/juge.ts`, toujours restauré avant le passage suivant).
- Codex avait relevé exactement le même symptôme (« Témoins n°1 et n°6 rouges uniquement sur CR-NR »), donc c'est reproductible et daté, pas un accident de ma session.

## Défauts établis (Codex, verdict.json — je rapporte les bloquants et majeurs)

**Bloquants**
1. **CR-NR compare à `HEAD` un fichier déjà modifié hors périmètre** (`lib/alertes.ts`) — le témoin peut rougir pour une raison qui n'a rien à voir avec 026-116. Correction proposée : isoler la non-régression aux changements imputables à la fiche, ou jouer sur un arbre propre.
2. **En `--temoin`, `composer`/`route`/`horloge` sautent tous leurs critères fonctionnels** (confirmé en lisant `crieur-qa.mjs` : `modeFabrication = o.temoin && PARTIE !== 'juge'` saute tout sauf CR-NR) — la preuve `--lot=20` ne contrôle aujourd'hui, sur l'arbre courant, que CR-14 et CR-NR. Une implémentation absente ou fausse de ces trois parties pourrait laisser leur témoin vert tant que 026-119/122/134 ne sont pas elles-mêmes prouvées.
3. **Contournement de préfixe sur `adresse_etrangere`** — **vérifié directement par moi** (sonde ci-dessous) : `ADRESSE_AUTORISEE = 'https://prestiapp.fr'` et le test est un simple `.startsWith(...)`, donc `https://prestiapp.fr.evil.com/hack` passe comme une adresse autorisée. Le corpus CR-14 ne teste qu'un seul domaine étranger (`exemple-externe.test`), donc rien ne détecte cette faille par le jeu d'essai actuel.
4. **`CR-1` (futur, dans `crieur-qa.mjs`, code déjà écrit par cette fiche) accepte un `preuve.motif` vide** : `texteFichier.includes(String(preuve.motif || ''))` vaut toujours vrai quand `motif` est vide ou absent (`''.includes('')` en JS) — un fait pourrait être déclaré « prouvé » par un fichier sans aucun motif vérifié.

**Majeurs**
5. CR-5/6/8/15-19 (route, pas encore écrite) reposent surtout sur des recherches de chaînes et de positions dans le source plutôt que sur l'exécution réelle des scénarios (401 effectif, pause, rejeu, battement) — un futur `route.ts` pourrait avoir un appel mort ou une branche inversée sans que `crieur-qa --partie=route` s'en aperçoive.
6. CR-7 (`publora.ts`, pas encore écrit) n'exige pas que le corps du POST porte `content`/`platforms` — un corps vide passerait tant qu'il n'a pas de clé en trop.
7. CR-3/CR-4 (`composer.ts`, pas encore écrit) n'imposent aucune borne inférieure : un `composerLot` qui renvoie toujours `[]` satisferait les bornes hautes, le quota plein et l'horizon.
8. **Le corpus CR-14 ne teste ni publication vide ni `fait_ids` inconnu** — **vérifié directement par moi** : `jugerPublication({ canal: 'linkedin', texte: '', fait_ids: [] }, ctx)` rend `{"ok":true}` — une publication LinkedIn sans aucun texte ni fait passe le juge aujourd'hui, sans qu'aucun cas du corpus ne le détecte.

**Sabotages menés par Codex sur l'usine (4/4 vus)**, fichiers restaurés par Codex lui-même côté usine (confirmé de mon côté : mon `lib/crieur/juge.ts` local n'a jamais bougé pendant l'exécution de `revue-codex.mjs`, sha256 inchangé avant/après) :
- n°2 : `ok: true` renvoyé systématiquement → CR-14 rouge.
- n°3 : refus `aimant_absent` désactivé → CR-14 rouge.
- n°4 : `adresse_etrangere` réduit à ne reconnaître que `exemple-externe.test` → **CR-14 reste VERT** (c'est le même trou de couverture que le défaut bloquant n°3 ci-dessus, vu sous un autre angle : le corpus ne varie pas assez le domaine étranger pour distinguer une implémentation générale d'une implémentation qui mémorise le seul cas de test).
- n°5 : contrôle des numéros de téléphone supprimé → CR-14 rouge.

## Sonde indépendante (hors sabotage, sur le code réel non modifié)

`scratchpad/sonde-verif.mjs`, importé directement via `scripts/ts-loader.mjs`, contre `lib/crieur/juge.ts` intact :

```
TEST1 (texte "Voir https://prestiapp.fr.evil.com/hack pour en savoir plus.", canal linkedin)
  → {"ok":false,"raisons":["phrase_inconnue"]}
  (aucune raison adresse_etrangere alors que l'URL pointe vers evil.com : confirme le défaut bloquant n°3)

TEST2 (texte "", fait_ids [], canal linkedin)
  → {"ok":true}
  (publication entièrement vide acceptée : confirme le défaut majeur n°8)
```

## Ce qui n'a pas été refait

Les critères d'implémentation eux-mêmes de `composer`/`route`/`horloge` (026-119/122/134) n'ont pas été contre-vérifiés ici : ils sont hors périmètre de 026-116 et « sautés » par construction tant que leurs propres fiches ne sont pas prouvées — Codex le signale comme risque de conception (défaut bloquant n°2), pas comme un défaut caché aujourd'hui.

## Conclusion

Le vert de 026-116 est réel au sens mécanique (le sabotage — le mien comme celui de Codex — prouve que CR-14 juge pour de vrai et que ça remonte au vérificateur de la fiche), mais il ne garantit pas ce que la fiche promet : « jamais une publication qui invente un fait ou une donnée » et « aucune adresse hors https://prestiapp.fr » sont aujourd'hui contournables (préfixe de domaine trompeur, publication vide). Ces deux défauts sont dans `lib/crieur/juge.ts` lui-même, pas dans une fiche dépendante à venir — donc dans le périmètre strict de 026-116. À corriger avant que le Crieur dépose de vrais brouillons dans Publora.
