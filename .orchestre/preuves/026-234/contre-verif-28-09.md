# 026-234 — contre-vérification du 28/09

Fiche : `.orchestre/fait/026-234.md` (type test : le juge `savoir-lecons-qa.mjs`, ses jeux d'essai et son témoin,
`docs/agents/lecons.md`, l'étape « Leçons » de `docs/agents/revue-hebdo.md`). Verdicts certifiés :
`verdicts.jsonl` 14:51:31Z (en-cours) et 14:56:08Z (fait), PASS, code 0.

## 1. Codex sur l'usine : pas jugé (quota)

```
cd presti && node ../presti-ops/usine/revue-codex.mjs 026-234 --sabotages=4 --delai=40
```

Résultat : **code 3, pas jugé**. Le quota de l'abonnement ChatGPT est épuisé. Codex s'est arrêté au premier appel (2 s)
avec le message « You've hit your usage limit … try again at 3:48 PM ». Le coureur rend
« ⏸ revue-codex 026-234 : QUOTA (3) — quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM. » Le détail est dans
`.orchestre/travail/revue-codex/026-234/` : `journal.json` (début 14:57:36Z, fin 14:59:06Z, `verdict.json absent`)
et `codex.log`.

**Le témoin est vert sur l'usine.** Le coureur rejoue d'abord le `verifier` exact, sans Codex, dans un bac neuf
(7a72a7f4 plus les fichiers non commités du PC, arbre T0 `c67dd947…`) : **code 0, PASS en 86 s**
(`runs/0.log`). On y lit (a) SVL-1 en premier échec, (b) SVL-10 vert, (c) le témoin vert et (d) les sabotages
conformes. C'est une deuxième machine qui confirme le PASS du PC, indépendamment de la panne de quota.

Codex n'a pas pu juger, donc je fais les sabotages moi-même (ci-dessous). Le champ `juge_corrige` est vide : aucune
correction du juge à viser, donc pas de sabotage supplémentaire pour ça.

## 2. Six sabotages réversibles, tous vus sur le bon critère

**Méthode.** Le script est `.orchestre/travail/contre-verif-026-234/lancer.mjs`. Pour chaque sabotage, dans cet ordre :

- relever le sha256 du fichier et en faire une copie ;
- faire un remplacement unique (la chaîne doit apparaître une seule fois) ;
- lancer le **verifier exact** `node scripts/savoir-lecons-qa.mjs --preuve-echecs` ;
- restaurer le fichier octet pour octet, dates comprises, puis recontrôler son sha256.

Un seul sabotage est actif à la fois. Le juge (`savoir-lecons-qa.mjs`) n'est jamais touché.

**Ce que je sabote.** L'arbre ne contient encore que deux fichiers de production de 026-234, les deux consignes :
M1 et M2 portent sur elles. Le reste de la production n'existe pas encore (`lecons.mjs`, `lecons.ts`,
`lecons-entree.mjs`, le branchement : ce sont les fiches 026-235 à 026-237). Pour cette partie, la référence est le
témoin, et M3 à M6 le sabotent. Ce sont des implémentations plausibles mais fausses, choisies **hors des 29 sabotages
déjà listés dans `sabotages.json`**. Chaque sortie complète est dans `.orchestre/travail/contre-verif-026-234/`
(fichiers `M*.log` et `M*.echecs.md`).

| # | fichier | sabotage | critère visé | résultat du verifier | restauré (sha256) |
|---|---|---|---|---|---|
| M1 | `docs/agents/revue-hebdo.md` | la commande `valider` de l'étape 6 passe de `--par=revue-AAAA-SS` à `--par=claude-code` (la revue signerait comme le chef d'entreprise) | SVL-10 | **code 1**, (b) NON : « FAIL SVL-10 — docs/agents/revue-hebdo.md ne dit pas « --par=revue-aaaa-ss » » | `0469896a…839f` égal |
| M2 | `docs/agents/lecons.md` | l'identifiant documenté `L-<AAAA-MM-JJ>-<12 chiffres hexadécimaux>` (le défaut RV-4) | SVL-10 | **code 1**, (b) NON : « docs/agents/lecons.md ne donne pas le format de l'identifiant » | `b94b3435…4e24` égal |
| M3 | témoin `scripts/savoir/lecons.mjs` | `rejeter` écrit la rejetée mais ne retire plus la candidate | SVL-5 | **code 1**, (c) NON, seul critère rouge du témoin : « FAIL SVL-5 — rejeter : la candidate est restée dans candidates/ » | `463c009b…8a17` égal |
| M4 | témoin `lib/agents/lecons.ts` | `lireLecons` garde une leçon sans `valide_le` (contrôle retiré) | SVL-7 | **code 1**, (c) NON : « FAIL SVL-7 — lireLecons : […, L-2026-09-27-aaaaaaaaaaam] » et « ignorees = 2 (3 attendu) ». SVL-8 et SVL-9 rougissent aussi, parce qu'ils consomment `lecons.ts` : la leçon sans date arrive dans l'entrée du chef et dans les consignes | `1f0b44c4…0d39` égal |
| M5 | témoin `lib/agents/llm.ts` | `creerLecteur` ignore l'interrupteur `lecons_dans_consignes` | SVL-9 | **code 1**, (c) NON, seul critère rouge : « facteur-eteint : entrée standard ≠ celle d'un appel sans leçons (à l'octet près) » et « douleurs-eteint : corps envoyé ≠ … » | `5978c2a2…1406` égal |
| M6 | témoin `scripts/savoir/lecons.mjs` | un bus qui répond 401 est lu comme « aucune décision » : le passage continue | SVL-2 | **code 1**, (c) NON, seul critère rouge : « bus en 401 : code 0 (1 attendu) » et « 18 fichier(s) écrit(s) quand même » | `463c009b…8a17` égal |

**6 sabotages sur 6 sont vus, chacun sur le critère visé.** Dans les six passages, deux choses tiennent :

- (a) reste conforme : le premier échec de l'arbre est toujours SVL-1 ;
- (d) reste conforme : 29 sabotages de `sabotages.json` sur 29 sont pris.

`scripts/savoir/` était absent avant et après chaque passage. La production de 026-235, en cours sur l'usine
(`usine-codex-84`), n'est donc pas arrivée pendant mes mesures.

## 3. Restauration et rejeu final

- **Empreintes.** J'ai pris le sha256 des 26 fichiers suivants avant et après les six sabotages : les deux consignes,
  les 23 fichiers de `scripts/fixtures/026/savoir/lecons/` et le juge. Les deux relevés sont identiques (`diff` vide :
  `sha-avant.txt` et `sha-apres.txt` dans le dossier de travail).
- **Rejeu du verifier exact après restauration** : **code 0, PASS en 221 s**. (a), (b), (c) et (d) sont conformes, et
  SVL-11 est vert.
- **La preuve de la fiche.** Chaque passage de `--preuve-echecs` réécrit
  `.orchestre/preuves/026-234/echecs-attendus.md`. J'ai remis à la fin **les octets d'origine**, ceux du passage
  certifié depuis `fait/` (sha256 `e8150054…ef4f`, identique à celui relevé avant mon premier passage). `verifier.log`
  et `avant.txt` n'ont pas été touchés.
- **Git.** `git status` du périmètre est inchangé. Un seul chemin est apparu pendant ma contre-vérification :
  `docs/agents/mesure-a-sec-2026-09-28.md`, écrit à 17:07:14 par `scripts/agents/mesure-a-sec.mjs`. C'est une autre
  session sur un autre chantier, pas mes sabotages.

## 4. Contrôles indépendants en plus

- **Les juges voisins restent verts.** 026-234 renumérote les étapes de `revue-hebdo.md` (La PR passe de 6 à 7, le
  ménage de 7 à 8). J'ai rejoué `node scripts/revue-qa.mjs --critere=RV-6` et
  `node scripts/chantier-qa.mjs --critere=CT-5` : **PASS l'un et l'autre**. « Aucun connecteur » et « Jamais de fusion »
  sont toujours là (lignes 12 et 83).
- **Les attendus écrits à la main.** J'ai recoupé à part les 30 lignes de `essai/.orchestre/verdicts.jsonl`
  (16 PASS, 5 FAIL, 5 QUOTA, 1 REFUSÉE, 1 EXPIRÉE, 1 DISJONCTÉE, 1 illisible) avec `attendu-candidates.json` :
  30 cohérentes sur 30. Une candidate existe exactement pour chaque FAIL, REFUSÉE, EXPIRÉE et DISJONCTÉE, aucune pour
  PASS ni QUOTA, et `illisibles` vaut 1.

## 5. Défauts relevés (mineurs, aucun bloquant ni majeur)

1. **SVL-10 ne voit pas une consigne qui s'écarte du code sur les domaines.** Le juge cherche chaque domaine dans tout
   le document (`c.includes(x)`), et les 12 domaines apparaissent tous aussi dans la table `LECONS_DE`. De plus, la
   table n'est jamais comparée à `LECONS_DE_ATTENDU`.

   Je l'ai prouvé sur une **copie** (`.orchestre/travail/contre-verif-026-234/racine-domaines/`) : `publication` y est
   retiré de la ligne `DOMAINES`, et `douleurs` y reçoit `donnees`. Avec `--racine` sur cette copie, SVL-10 reste
   **PASS**.

   Le code, lui, est jugé strictement par SVL-7 (S17 le prouve). L'écart ne toucherait donc que le texte que lisent
   Claude Code et la revue. Correction proposée : dans SVL-10, comparer la ligne `DOMAINES` à la liste exacte, et
   chaque ligne de la table à `LECONS_DE_ATTENDU`.
2. **SVL-11 peut rougir sur le dépôt à cause d'une autre session.** Le contrôle « chemin apparu pendant ce passage »
   n'exclut que `.orchestre/travail/` et `.orchestre/preuves/`. Pendant le passage M3, il a rougi sur
   `.orchestre/file/026-106.md`, déplacé par l'orchestre à ce moment-là. C'est sans effet aujourd'hui : dans (a),
   SVL-1 reste le premier échec. Mais quand 026-235 à 026-237 seront livrées et que le dépôt devra être entièrement
   vert, un mouvement de l'orchestre ou d'une autre session suffira à le faire rougir. Correction proposée : exclure
   tout `.orchestre/`, ou ne regarder que les chemins de `perimetre` et d'`interdit`.

Autour de ces fichiers, `git status` montre d'autres chemins modifiés depuis `avant.txt` (`lib/crieur/*`,
`lib/direction/journal.ts`, `supabase/…0101…`, `scripts/douleurs-qa.mjs`…). Ils appartiennent à d'autres chantiers en
cours (crieur, horloge 0101, douleurs) et ne viennent pas de 026-234.

## 6. Conclusion

**Vert.** Le PASS de 026-234 tient. Trois choses le confirment :

- **Le témoin sur l'usine** : code 0, sur une autre machine.
- **Six sabotages sur six** vus sur le bon critère : deux sur les consignes livrées, quatre sur le témoin qui tient
  lieu de la production future, tous hors des 29 déjà prévus. Chaque fichier est restauré et vérifié au sha256.
- **Le rejeu final** : code 0.

Codex n'a pas jugé (quota épuisé, code 3). On peut le relancer quand le quota revient si l'on veut un second avis. Deux
défauts mineurs du juge (§5) sont à corriger à l'occasion, par exemple dans 026-240 qui contre-vérifie la série. Rien
n'a été commité. J'ai écrit seulement dans ce fichier et dans `.orchestre/travail/` ; j'ai aussi remis
`echecs-attendus.md` à ses octets d'origine.
