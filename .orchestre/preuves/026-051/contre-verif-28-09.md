# 026-051 — contre-vérification du 28/09/2026

**Verdict : ROUGE, défaut établi sur le juge (2 bloquants, confirmés indépendamment de Codex). Le verifier de la fiche, lui, est un vrai PASS — reproduit deux fois à l'identique (avant et après mes huit sabotages/reproductions).**

## 1. Moyen

1. **Codex sur l'usine** : `node ../presti-ops/usine/revue-codex.mjs 026-051 --sabotages=4` (gpt-6-sol, medium, abonnement ChatGPT seul — la fiche a été détectée « prospects » par le script, donc aucun conseiller). Lancé 13:16:19Z, fini 13:19:41Z (3 min 22 s au total, bien sous les 90 min du script et les 40 min mentionnés). **Code 1 : défaut établi.**
2. **Reproduction indépendante** de 2 des défauts bloquants de Codex, directement sur la production (édition directe, pas de copie), avec le verifier exact de la fiche — pour ne pas me fier au seul `verdict.json`.
3. **Mes 6 sabotages** (contrôles positifs) : 4 généraux + 2 qui ciblent la correction du juge faite par Claude Code le 28/09 (extension de `pilotage-push-qa.mjs` de 6 à 9 motifs poussés).
4. Restauration octet pour octet après chaque coup (sha256 avant/après), sur les trois fichiers du périmètre (`lib/pilotage/notifications.ts`, `lib/push.ts`, `lib/alertes.ts`). Jamais touché le juge ni ses fixtures.

## 2. Codex — code 1, deux défauts bloquants + trois majeurs

Témoin (passage n°1, avant tout sabotage) : PASS en 6 s — confirme que Codex jugeait bien le code livré, pas un accident du bac. Arbre final restauré et identique à `T0` (`926bc9aed28000bfd2ed61bf359f1c80da2715f6`), `derive: []`.

| n° | sabotage (Codex) | fichier | verifier resté | gravité | défaut du juge |
|---|---|---|---|---|---|
| 2 | texte de `paiement` remplacé par un message générique figé | lib/pilotage/notifications.ts:12 | vert | majeur | PF-2 ne compare pas le texte réel aux textes prescrits, seulement leur longueur |
| 3 | `renotify` de `paiement` inversé à `false` | lib/pilotage/notifications.ts:12 | vert | majeur | PF-2/PF-8 ne vérifient jamais `renotify` |
| 4 | `lireFondateurs` renvoie deux identifiants figés au lieu du résultat de la requête | lib/push.ts:153 | vert | **bloquant** | PF-5 ne lit que la présence syntaxique du filtre dans le source ; PF-8 accepte des identifiants figés qui collent à sa propre fixture |
| 5 | `envoyerPushFondateurs` annonce le nombre de fondateurs au lieu de sommer les envois réels | lib/push.ts:167 | vert | majeur | PF-4 accepte un total calculé, jamais mesuré contre les envois réellement rendus par les doublures |
| 6 | branche `coupe_circuit` retirée du push entreprise | lib/alertes.ts:329 | vert | **bloquant** | PF-7 ne refuse pas une exclusion supplémentaire dans la condition ; PF-8 n'exerce jamais `coupe_circuit` |

Résumé de Codex : « Témoin n°1 vert, mais cinq sabotages fonctionnels (n°2 à n°6) sont restés verts. Le vérificateur ne garantit ni les textes et renotify prescrits, ni la sélection réelle des fondateurs, ni le total d'envois, ni l'envoi de chaque motif urgent. »

## 3. Mes deux reproductions indépendantes (R1, R2)

Je ne me fie pas qu'au `verdict.json` de Codex : mêmes défauts, refaits moi-même, directement sur la production, avec sha256 avant/après.

| # | fichier | sabotage | résultat du verifier | confirme |
|---|---|---|---|---|
| R1 | lib/alertes.ts | `al.a === 'entreprise'` → `al.a === 'entreprise' \&\& al.motif !== 'coupe_circuit'` | **PASS 10/10**, aucun critère rouge | le défaut bloquant n°6 de Codex : un motif urgent du veilleur peut perdre son push sans que rien le voie |
| R2 | lib/push.ts | corps de `lireFondateurs` remplacé par `return ['…f001', '…f002']` (identifiants de la fixture du juge), résultat réel de la requête ignoré (`void data`) | **PASS 10/10**, PF-5 toujours ✅ (« lu dans le source ») | le défaut bloquant n°4 de Codex : PF-5 ne contrôle que le texte du filtre, jamais ce que la fonction renvoie réellement à l'exécution |

Les deux défauts bloquants de Codex sont donc confirmés indépendamment, pas seulement rapportés par lui.

## 4. Mes 6 sabotages — contrôles positifs (chacun rougit le bon critère)

4 généraux + 2 qui ciblent spécifiquement la correction du juge du 28/09 (`BLOC_DU_MOTIF` étendu, seuils PF-2/PF-3 passés de 6 à 9/10).

| # | cible | fichier | sabotage | critère(s) rougi(s) | restauré (sha256) |
|---|---|---|---|---|---|
| S1 | général | lib/pilotage/notifications.ts | bloc de `appel` : `appeler` → `argent` | PF-2 (« appel : url …bloc=argent, …bloc=appeler attendu ») | oui |
| S2 | général | lib/push.ts | `cheminSur` : retrait du garde anti-`//hôte` (regex affaiblie, `(?![/\\])` ôté) | PF-6 (« le corps de cheminSur a changé ») | oui |
| S3 | général | lib/alertes.ts | condition inversée : `al.a === 'entreprise'` → `al.a !== 'entreprise'` | PF-3, PF-7, PF-8 (push part vers personne pour une alerte d'entreprise, et vers les fondateurs pour une alerte artisan — comportement inversé) | oui |
| S4 | général | lib/pilotage/notifications.ts | motif `digest` retiré de `MOTIFS_POUSSES`/`CHARGES` | PF-2, PF-3 (PF-9 reste vert : `digest` n'est pas un motif urgent du veilleur — normal) | oui |
| S5 | correction | lib/pilotage/notifications.ts | motif `gmail_bloque` (un des 3 motifs ajoutés) retiré entièrement | PF-2, PF-3, PF-9 (le seuil à 9 motifs et la vérification dynamique de PF-9 l'attrapent chacun, indépendamment) | oui |
| S6 | correction | lib/pilotage/notifications.ts | bloc de `canal_arrete` : `envois` → `agents` | PF-2 (« canal_arrete : url …bloc=agents, …bloc=envois attendu ») | oui |

Note sur S3 : un rouge PF-10 (`tsc`) est apparu en même temps, sur `lib/crieur/juge.ts` (`error TS2538`) — fichier hors périmètre, jamais touché par moi. `git status --short lib/crieur/juge.ts` a confirmé une modification en cours par une **session concurrente** au moment du sabotage ; PF-10 est revenu vert après restauration et une deuxième session n'y touchait plus (cf. mémoire « Presti — sessions concurrentes »). Sans rapport avec mon sabotage ; PF-3/PF-7/PF-8 restent le verdict à retenir pour S3.

## 5. Restauration — sha256 avant / après l'ensemble des 8 coups (S1-S6, R1-R2)

| fichier | avant tout sabotage | après restauration finale |
|---|---|---|
| `lib/pilotage/notifications.ts` | `a9801b833a6f6b0085c2d5f165e9c83212ac766bfea65c40bd63d408d7214909` | `a9801b833a6f6b0085c2d5f165e9c83212ac766bfea65c40bd63d408d7214909` ✓ |
| `lib/push.ts` | `6591e091ddbe735d87f2542876b3108449cad54537a913be030e113cbe5ce799` | `6591e091ddbe735d87f2542876b3108449cad54537a913be030e113cbe5ce799` ✓ |
| `lib/alertes.ts` | `205f339aa1cf5361b2b7fd7315f700074733dc1faa35992cbfd0042bf9645812` | `205f339aa1cf5361b2b7fd7315f700074733dc1faa35992cbfd0042bf9645812` ✓ |

Ces trois empreintes sont aussi celles que la preuve de l'exécutant (`reponse-28-09.md`) avait relevées juste après le patch : confirme qu'aucune des deux sessions n'a laissé de trace sur l'autre.

`git diff` sur les trois fichiers, après restauration finale, ne montre que le diff **déjà présent avant que je commence** (le patch livré de 026-051, non commité — décrit dans `reponse-28-09.md`, section « Application du patch et vérification finale ») : aucune trace supplémentaire de mes 8 sabotages/reproductions. Verifier final rejoué en entier après restauration : **PASS, PF-1 à PF-10 verts, tsc vert en 42 s**.

Rien commité. Rien écrit hors `.orchestre/preuves/026-051/` (ce fichier) et `.orchestre/travail/revue-codex/026-051/` (créé par `revue-codex.mjs` lui-même, pas par moi).

## 6. Ce que je confirme en plus des sabotages

Lecture directe du code livré (pas seulement le verdict du juge) : `envoyer()` de `lib/alertes.ts` branche bien `envoyerPushFondateurs(chargeFondateur(al.motif))` après `consommerLimite(` et `persisterAlerte(`, sous `!simulation && al.a === 'entreprise'`, en `.catch()` sans `await` — conforme au contrat PF-7. `chargeFondateur` de `lib/pilotage/notifications.ts` couvre bien les neuf motifs (les six de la fiche + les trois ajoutés par la réponse du 28/09), `null` sinon, et n'importe que `./liens` et un type de `@/lib/push` — conforme PF-1/PF-2/PF-9. `lireFondateurs`/`envoyerPushFondateurs` de `lib/push.ts` sont additifs (22 lignes ajoutées, 0 retirée sur le reste du fichier) — conforme PF-6.

## 7. Conclusion

**Le verifier de la fiche est un vrai PASS**, reproduit deux fois à l'identique (avant mes sabotages et après restauration complète). Rien ne dit que la production livrée aujourd'hui est cassée : au contraire, sa lecture directe (§6) confirme qu'elle pousse bien vers les fondateurs pour les neuf motifs, y compris `coupe_circuit`, et qu'elle lit les vrais fondateurs.

**Mais le juge (`scripts/pilotage-push-qa.mjs`) a deux angles morts bloquants**, établis par Codex et confirmés indépendamment par moi (§3, R1 et R2) : une régression future qui exclurait `coupe_circuit` du push, ou qui ferait perdre à `lireFondateurs` son vrai résultat de requête au profit d'identifiants figés, passerait inaperçue — PASS garanti à tort. Trois défauts majeurs s'y ajoutent (textes et `renotify` non comparés aux valeurs prescrites, total `envoyes` non vérifié contre les envois réels), rapportés par Codex et non re-vérifiés par moi indépendamment (les deux bloquants étaient prioritaires).

La correction du juge faite par Claude Code le 28/09 (extension à 9 motifs) fonctionne bien pour ce qu'elle couvre : mes deux sabotages ciblés sur les motifs ajoutés (S5 sur `gmail_bloque`, S6 sur `canal_arrete`) sont correctement attrapés. Le problème est ailleurs, dans les cinq trous que Codex a trouvés — indépendants de cette correction-là.

**Recommandation, non faite ici** (correction du juge hors périmètre d'une contre-vérification, comme pour 026-107 et 026-248) : dans `scripts/pilotage-push-qa.mjs`, (1) comparer réellement chaque motif à son résultat de requête plutôt qu'au texte source, en particulier pour `lireFondateurs` (PF-5, avec des identifiants imprévisibles dans la fixture) et `envoyerPushFondateurs` (PF-4, en faisant varier les envois réussis/échoués par doublure) ; (2) exercer explicitement `coupe_circuit` dans PF-8, idéalement chaque motif de `MOTIFS_POUSSES` un par un plutôt qu'un sous-ensemble ; (3) comparer titre/ligne/`renotify` de chaque motif aux valeurs prescrites par la fiche plutôt qu'à leur seule forme (longueur, présence).
