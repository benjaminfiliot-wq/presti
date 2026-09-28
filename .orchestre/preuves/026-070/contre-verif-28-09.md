# 026-070 — contre-vérification du 28/09

## 1. Codex sur l'usine (juge indépendant)

```
cd presti && node ../presti-ops/usine/revue-codex.mjs 026-070 --sabotages=4 --delai=40
```

Résultat : **code 3 — pas jugé** (quota de l'abonnement ChatGPT épuisé).

Raison exacte, telle que rendue par le coureur (`.orchestre/travail/revue-codex/026-070/executer.log`) :

```
[revue-codex 14:02:17] témoin : code 1 en 29 s
[revue-codex 14:02:21] codex : code 1 en 4 s ; quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM.
· usine executer : commande finie en 34 s sur l'usine, code 3 (seule)
⏸ revue-codex 026-070 : QUOTA (3) — quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM.
```

Codex n'a jamais pu démarrer sa revue (quota épuisé avant même son premier appel). Mais **le témoin lui-même** — le
`verifier` exact de la fiche, rejoué sur l'usine sur l'état réel du dépôt (2bba50c3 + les non-commités, avant tout
sabotage), sans intervention de Codex — est ressorti **rouge, code 1**, sur **EQ-1 seul** (`.orchestre/travail/revue-codex/026-070/runs/0.log`).
Ce résultat, bien qu'obtenu dans le cadre de l'appel à Codex, est un fait vérifiable indépendamment de la panne de quota :
voir §2.

Comme prescrit (code 3 = pas jugé) : sabotages manuels ci-dessous.

**Relance après l'heure annoncée** (16:31, après « 3:48 PM ») : même résultat, **code 3** de nouveau (quota toujours
épuisé — l'heure de réinitialisation annoncée ne s'est pas confirmée dans cette fenêtre). Mais le second témoin,
rejoué indépendamment dans un bac neuf de l'usine (état identique du dépôt), **reproduit exactement le même
verdict** que le premier : 26 critères verts, **EQ-1 seul rouge**, message identique au caractère près
(`.orchestre/travail/revue-codex/026-070/runs/0.log` de cette seconde tentative). Deux exécutions indépendantes du
même `verifier`, sur deux bacs différents de l'usine, convergent : ce n'est pas un aléa d'exécution.

## 2. Constat préalable : le verifier échoue déjà, sans aucun sabotage de ma part

Rejoué sur le PC, à l'identique de la commande de la fiche :

```
node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules
❌ EQ-1 EQUIPAGE : chef, vigie_meta, recenseur, juge_faits, redacteur, garde, facteur, facteur_usine, standardiste,
   repondeur, atelier_maquettes, redacteur_site, livreur, livreur_usine, tresorier, crieur, studio, experience, a0,
   systeme, pont, contenu, pont_telegram, douleurs ; les vingt-cinq noms de 026-070 (décision du chef d'entreprise
   du 27/09) attendus
station-logique-qa --partie=modules : FAIL — EQ-1
```

`lib/pilotage/equipage.ts` (`descriptifs`) ne porte que **24 identités** : il manque **`usine` → Surveillant → salle
`machines`**, la 25ᵉ, explicitement nommée dans la table de la fiche (« `machines` | … `usine` → Surveillant ») et
présente dans `EQUIPAGE_ATTENDU` de `scripts/fixtures/026-pilotage/s/commun.mjs` (`usine: 'machines'`, ligne 51).
Ceci **contredit** `.orchestre/preuves/026-070/verifier.log` (PASS, EQ-1 vert, « 15 cartes ») et `reponse-28-09.md`
(« PASS 27/27 », « PASS · 71 s · 640 lignes »), tous deux datés de cet après-midi.

Horodatage des fichiers (mtime, `stat`) :

| fichier | mtime |
|---|---|
| `.orchestre/preuves/026-070/verifier.log` (PASS certifié) | 14:46:23 |
| `.orchestre/preuves/026-070/reponse-28-09.md` (décision, PASS annoncé) | 14:48:57 |
| `lib/pilotage/equipage.ts` (état actuel, EQ-1 rouge) | **15:07:05** |

`lib/pilotage/equipage.ts` a été réécrit **après** la certification du PASS. Le fichier n'est pas suivi par git
(`??`, jamais commité), donc aucun blob de comparaison ; mais la fenêtre (20 min après le PASS, aucune action de ma
part avant cette contre-vérification) correspond exactement au risque connu (mémoire « Presti — sessions
concurrentes » : plusieurs sessions écrivent dans `presti`). Un second signe pointe dans le même sens : une des
exécutions de cette contre-vérification (avant les sabotages, §3) a vu **SM-2 rouge une fois** sur une erreur
TypeScript étrangère au périmètre de la fiche (`lib/crieur/juge.ts(158,40): Cannot find name 'ADRESSE_AUTORISEE'`,
hors `lib/pilotage/`) ; rejouée à l'identique quelques minutes plus tard, SM-2 est repassée verte — cohérent avec une
autre session en train d'écrire ailleurs dans le dépôt au même moment, sans rapport avec 026-070.

**Ce n'est pas un sabotage que j'ai produit : c'est l'état trouvé en ouvrant ce dossier**, avant toute intervention
(sha256 de `lib/pilotage/equipage.ts` à cet instant : `43cc0c0eeda4c086f807c401801b2e01a7a00a18fc243ab8315dabc5ff9d3931`,
conservée intacte du début à la fin de cette contre-vérification — voir §4). Conformément au mandat (« ne touche rien
hors de ces preuves et de `.orchestre/travail/` »), je n'ai pas corrigé `equipage.ts` : ce fichier est resté exactement
dans l'état où je l'ai trouvé, sabotages compris restaurés dessus.

## 3. Six sabotages réversibles de la production (4 + 2 ciblant la correction du juge du 28/09)

Méthode, pour chacun : copie de sauvegarde (`cp -p`) dans le scratchpad, un remplacement de chaîne, `node --import
./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules` (la commande `verifier` exacte de la fiche),
lecture du critère visé, restauration par `cp -p` depuis la copie, `cmp` + `sha256sum` identiques à l'avant. Un seul
fichier modifié à la fois, jamais deux sabotages actifs ensemble. Aucun fichier interdit touché (juge, fixtures).

Les quatre premiers ciblent des critères **verts** dans l'état trouvé (donc la preuve de causalité est propre,
indépendante du défaut EQ-1 du §2). Les deux derniers, sur `equipage.ts`, ciblent spécifiquement la correction du
28/09 documentée dans `reponse-28-09.md` (juge relevé de 18 à 25 identités, `EQUIPAGE_ATTENDU` avec les sept
nouvelles salles) : ils s'isolent du défaut préexistant en comparant le **texte exact** de l'échec EQ-1 avant/après
(une ligne supplémentaire apparaît, spécifique au sabotage, sans quoi le message reste identique à celui du §2).

| # | fichier | sabotage | critère visé | résultat | restauré |
|---|---|---|---|---|---|
| S1 | `lib/pilotage/barre.ts` | `compteARebours` : `` `en retard de ${…} min` `` → `` `il y a ${…} min` `` | BA-1 | **rouge** : « compteARebours(-5 min) = « il y a 5 min », « en retard de 5 min » attendu » (et BA-2, qui en dépend, rouge aussi) | sha256 identique |
| S2 | `lib/pilotage/attention.ts` | `jauge_pleine` déplacé de `rouge` vers `jaune` dans `COULEUR_DE` | AT-2 | **rouge** : « COULEUR_DE.jauge_pleine = jaune, rouge attendu » | sha256 identique |
| S3 | `lib/pilotage/fil.ts` | jeton de masquage téléphone `'[numéro]'` → `'[num]'` | FI-1 | **rouge** : « masquer(« appeler le 06 12 34 56 78 ») = « appeler le [num] », [numéro] attendu » | sha256 identique |
| S4 | `lib/pilotage/missions.ts` | `NIVEAUX` : `1000` → `1001` | MI-1 | **rouge** : niveau `{"lv":2,"prochainSeuil":1001,…,"texte":"312 / 1 001 XP"}` ; « NIVEAUX = [0,300,1001,3000,10000] » ; « le niveau ne monte pas au seuil 1000 € (2 → 2) » | sha256 identique |
| S5 | `lib/pilotage/equipage.ts` | `contenu` : salle `'audience'` → `'securite'` (une des sept salles de la décision du 27/09) | EQ-1 (nouvelle ligne, sur la correction du 28/09) | **rouge, ligne nouvelle** : le message du §2 gagne « ; EQUIPAGE.contenu.salle = securite, audience attendue » | sha256 identique |
| S6 | `lib/pilotage/equipage.ts` | identité `douleurs` retirée de `EQUIPAGE` (une des sept nouvelles du 27/09) | EQ-1 (liste, sur la correction du 28/09) | **rouge, liste modifiée** : la liste des « noms » du message du §2 perd `douleurs` en fin de liste (24 → 23 noms listés) | sha256 identique |

**6 sabotages sur 6 rougis exactement sur le critère visé.** Le juge compare des valeurs et des textes précis (pas un
simple test de présence) : `EQUIPAGE_ATTENDU` (25 entrées, corrigé le 28/09) est bien relu à chaque appel, réagit à un
retrait d'identité comme à une mauvaise salle, et les quatre autres modules sont testés sur des transformations de
texte et de seuils qui ne peuvent réussir par accident.

## 4. Restauration finale

```
sha256sum lib/pilotage/{barre,equipage,attention,fil,tapis,missions,experience}.ts
```
identique avant/après les six sabotages (`diff sha-avant.txt sha-apres.txt` vide) ; `cmp` fichier par fichier après
chaque restauration individuelle : identique à chaque fois. `git status --short -- lib/pilotage/` avant et après :
inchangé (les sept modules restent `??`, aucun `M`). Rejeu final du verifier, après toutes les restaurations :
identique au §2, un seul échec, EQ-1, même texte, SM-2 verte (105–113 s selon la charge machine).

## 5. Conclusion

**Non vert.** Le témoin obtenu sur l'usine (code 1, avant toute panne de quota) et le rejeu local du verifier
donnent la même chose : `station-logique-qa --partie=modules` échoue **actuellement**, sur EQ-1, faute d'une identité
(`usine` → Surveillant → `machines`) dans `lib/pilotage/equipage.ts`. Cela contredit le PASS certifié dans
`.orchestre/preuves/026-070/verifier.log` et la décision `reponse-28-09.md`, tous deux produits ~20 minutes avant la
dernière modification du fichier — signe d'une régression introduite après coup, probablement par une session
concurrente (mémoire « Presti — sessions concurrentes »), et non d'un défaut du travail de Codex ou de la correction
du juge du 28/09 : les six sabotages montrent au contraire que le juge corrigé (25 identités, salles du 27/09) est
précis et sensible à la moindre entorse.

**Codex sur l'usine n'a jamais pu juger** (quota épuisé, code 3, deux tentatives — 14:02 et 16:31, la seconde
pourtant après l'heure de réinitialisation annoncée). Mais le témoin seul (le `verifier` exact, sans Codex) a tourné
deux fois, sur deux bacs indépendants de l'usine, avec le même verdict précis que le rejeu local du PC : un signal
convergent à trois exécutions distinctes, pas un aléa. À relancer plus tard si un second avis de Codex est encore
voulu une fois le quota vraiment revenu.

**Action requise avant de considérer 026-070 vraiment fait** : ajouter l'identité manquante à `EQUIPAGE` dans
`lib/pilotage/equipage.ts` (`usine: ['Surveillant', …, 'machines']`, ou le libellé que la fiche/Benj confirme) et
rejouer `node scripts/orchestre.mjs verifier 026-070` pour re-certifier un PASS réel. Je n'ai pas fait ce geste moi-même
(hors mandat de cette contre-vérification : « ne touche rien hors de ces preuves et de `.orchestre/travail/` »).
