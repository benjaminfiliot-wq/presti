# 026-229 — contre-vérification du 28/09 (après-midi)

**Verdict : VERT.** Quatre sabotages réversibles de la production, chacun pris par le bon critère du verifier. Le témoin repasse au vert après restauration. Les 68 fichiers de production sont restaurés octet pour octet (sha256).

Verifier de la fiche : `node scripts/savoir-socle-qa.mjs --preuve-echecs`.

## 1. Moyen

- **Revue Codex sur l'usine : pas jugée (code 3).** Commande : `node ../presti-ops/usine/revue-codex.mjs 026-229 --sabotages=4`, lancée à 14:45Z. Raison exacte, dans `codex.log` : « You've hit your usage limit … try again at 3:48 PM ». C'est le quota de l'abonnement ChatGPT : Codex s'est arrêté au bout de 2 s et n'a produit aucun `verdict.json`. Même raison que la tentative de 13:23Z.
  - Donnée utile quand même : le passage n°0 du coureur (le verifier lancé sur l'usine, sur le paquet de l'arbre du PC) sort en **code 0 en 62 s**, avec (a), (b), (c) et (d) tous vrais (`.orchestre/travail/revue-codex/026-229/runs/0.log`). À 13:23Z, ce même passage sortait en code 1, à cause d'une erreur de typecheck de `lib/crieur/` dans le paquet, sans rapport avec la fiche.
- **Repli : sabotages faits à la main sur le PC.** Pilote : `.orchestre/travail/contre-verif-026-229-2809/sabotages.mjs` (copie dans `contre-verif-28-09/v3/`). Pour chaque sabotage, dans l'ordre :
  1. sauvegarde de l'original sur disque ;
  2. remplacement exact, une seule occurrence ;
  3. verifier **complet** (`--preuve-echecs`, pas une partie seule) ;
  4. restauration dans un `finally`, contrôlée par sha256.
- Aucun sabotage ne touche le juge `scripts/savoir-socle-qa.mjs`.
- **Cibles choisies pour ne pas gêner deux sessions qui tournaient en même temps.** J'ai évité `lib/savoir/index.ts` et `scripts/savoir/indexer.mjs` du témoin : la contre-vérification de 026-232, alors en cours, les copie. J'ai aussi évité `docs/savoir/reglages.json` du dépôt : le verifier de 026-234, alors en cours, le copie.
- Les sabotages de la fiche (`sabotages.json`, S01 à S30) n'ont pas été rejoués. Les quatre ci-dessous sont nouveaux.

## 2. Sabotages, critères rougis, restauration

| # | Fichier (production) | Sabotage | Critère attendu | Résultat du verifier | sha256 avant = restauré |
|---|---|---|---|---|---|
| K4 | `…/temoin/scripts/usine/systemd/presti-chef-savoir-recevoir.service` | `User=agents` → `User=root` : la réception tourne en root | SVS-11 (témoin) → (b) | code 1 en 291 s · (b) NON · `FAIL SVS-11 — presti-chef-savoir-recevoir.service [Service] User=root (attendu agents)`, seul critère rouge sur le témoin | `1a83d8d1876b4a0632c9254252425f3ee66aac5633f139cfcbb24246dbd18189` ✓ |
| K2 | `…/temoin/scripts/savoir/envoyer.mjs` | l'option `'-o', 'BatchMode=yes'` est retirée de l'appel ssh : un envoi planifié peut rester pendu sur une invite de mot de passe | SVS-7 (témoin) → (b) | code 1 en 313 s · (b) NON · `FAIL SVS-7 — allumé, appel 1 : -o BatchMode=yes absent` (aussi appel 2 et synchroniser 1-2), seul critère rouge sur le témoin | `69f21b100716d708d58272bcbfd0098ec336ca9186783f11660b1f8cda3c067e` ✓ |
| K3 | `…/temoin/scripts/usine/savoir-recevoir.mjs` | `if (!f) refus('fichier de l'archive absent du manifeste')` → `if (!f) continue` : un fichier hors manifeste entre au savoir | SVS-8 (témoin) → (b) | code 1 en 426 s · (b) NON · `FAIL SVS-8 — fichier hors manifeste : code 0 (attendu 1)` ; `apparu : travail/general/courant/fichiers/saas/intrus.md` ; `pas de raison au journal` | `f0608f7de743b4f76e0c2e9d187e67f0d0dcc313bfc521c61fd184d2eaac5c60` ✓ |
| K1 | `docs/savoir/sources.json` (contrat du dépôt) | la ligne prospects `"saas:Prospection/emails-artisans/**"` est retirée : ces listes d'e-mails retomberaient sous `saas:Prospection/**` (classe interne), donc dans `general` | SVS-1 (dépôt) → (d) et (a) | code 1 en 406 s · (d) NON : `FAIL SVS-1 — prospects : motifs obligatoires manquants — saas:Prospection/emails-artisans/**` · (a) NON : premier échec SVS-1 au lieu de SVS-2 · (b) NON : les copies du contrat du témoin diffèrent de celles du dépôt | `e6ce954abe0a3aad617bd25606aabdaabcaf45de6e365cb2c95ec2e7de87f62f` ✓ |
| — | aucun (témoin après restauration) | — | tout vert | **code 0 en 439 s · (a) ok · (b) ok · (c) ok · (d) ok → PASS** ; premier échec du dépôt SVS-2 ; S01 pris avec SVS-1 seul | — |

- Pour K4, K2 et K3, (c) passe aussi à NON, et c'est attendu. Le sabotage vit dans la source du témoin, que S01 (marqué `seul`, donc joué sur toutes les parties) recopie. S01 rougit alors en plus le critère saboté (« aussi : SVS-11 », « aussi : SVS-7 », « aussi : SVS-8 »). Les autres sabotages de la fiche restent pris.
- Pour K1, (c) reste ok. Les sabotages de la fiche ne lisent que la copie du contrat qui est dans le témoin.
- Sha256 du fichier saboté, pendant le passage :

  | Sabotage | sha256 pendant le passage |
  |---|---|
  | K4 | `618d6f8ace8488b34acfedd3e396c6fe9c7217674e07ad72bc2b603a26720e44` |
  | K2 | `182c43d59383b6e6d897301b95749b4e8f2190f10e3c07d96f0866e44ede5e41` |
  | K3 | `4f355ce15774d46a5ee92c964cf3dabd46b5073848d16e396b7fc9ad04a77e19` |
  | K1 | `eff9b0143bae6c8d25e52d899edb8b70f10b5b518817cc1c236f47665a9f6b00` |

- **Contrôle final.** J'ai relevé le sha256 des 68 fichiers de production avant les sabotages (`docs/savoir/**`, `scripts/fixtures/026/savoir/socle/**`, le juge, la fiche) et je les ai relevés à nouveau après. Les deux listes sont **identiques** (`v3/sha-reference.txt` et `v3/sha-apres.txt`).

## 3. Reliquats laissés par une contre-vérification précédente (dossier `contre-verif-28-09/`)

Cette tentative, arrêtée vers 16:37 heure de Paris, avait laissé deux traces. J'ai corrigé les deux :

1. **Un sabotage non restauré dans le témoin.** Le fichier `…/temoin/scripts/usine/savoir-recevoir.mjs` avait été modifié à 16:37:03, ce qui l'avait fait passer de `f0608f7d…` à `4bab1ed4…`. Il portait `if (false && entrees.has(nom)) refus('entrée en double')`.
   - Pourquoi je suis sûr que c'est un reliquat : en retirant seulement `false && `, on retombe exactement sur `f0608f7de743…`. C'est le sha256 « avant » et « restauré » que la même session avait noté à 14:37 pour P3 (`contre-verif-28-09/bilan.json`).
   - J'ai rétabli ce fichier avant mes sabotages ; son sha256 a été vérifié. La version avec le reliquat est gardée dans `v3/reliquat-savoir-recevoir.mjs.txt`.
2. **La preuve de la fiche avait été écrasée.** `echecs-attendus.md` était la sortie d'un passage saboté (généré à 14:16:14Z, « **026-229 : FAIL** »). Cette version est gardée dans `v3/echecs-attendus.md.ecrase-14h16Z`. Le passage témoin final l'a remplacée par la vraie preuve (générée à 15:21:09Z, « **026-229 : PASS** »). `verifier.log`, qui date du passage PASS de 12:07Z, n'a pas été touché.

## 4. Remarque, non bloquante

Le verifier reste vert quand le contrôle « entrée en double » de la réception est désactivé : le passage de l'usine à 14:45Z tournait sur un arbre qui portait le reliquat, et il est sorti vert.

Ce n'est pas un trou du juge. Le Cahier du juge (SVS-8) ne demande pas ce cas. Et une entrée en double ne peut rien faire entrer qui n'ait pas été vérifié : c'est la dernière occurrence qui est gardée, et elle doit correspondre à l'empreinte du manifeste avant toute écriture. On peut l'ajouter aux pièges de SVS-8 si l'on veut un contrôle de plus.

## 5. Traces

- Tous les journaux et le bilan : `.orchestre/preuves/026-229/contre-verif-28-09/v3/`. On y trouve `K1.log` à `K4.log`, `TEMOIN.log`, `K*-echecs-attendus.md`, `bilan.json`, les trois relevés sha et le pilote.
- Copie de travail : `.orchestre/travail/contre-verif-026-229-2809/`.
- Rien n'a été commité. Aucun fichier n'a été laissé modifié hors de `.orchestre/preuves/026-229/` et `.orchestre/travail/`, à une exception près : le reliquat du point 3.1, ramené à son original.
