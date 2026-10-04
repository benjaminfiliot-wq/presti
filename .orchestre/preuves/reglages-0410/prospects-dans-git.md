# Listes de prospects dans git : plan pour la décision de Benj (04/10/2026)

Lot « ménage de l'orchestre » (audit A §4-5, C §5.7/§5.9, R6/R7). **Ce lot n'a rien supprimé, rien déplacé, rien stagé** dans `docs/contexte-cloud/` ni dans `.gitignore`.
Tout ce qui suit est mesuré le 04/10 entre 14 h et 15 h (heure de Paris).

## 1. Constat vérifié

| Quoi | Mesure |
|---|---|
| Fichiers visés par l'audit | `docs/contexte-cloud/presti-secrets/prospection/` : `prospects.json` (26 844 o), `prospects-3-reseaux-2026-09-09.md` (14 436 o), `linkedin-17-2026-09-09.md` (11 783 o) |
| Entrée dans git | commit `0fcf0bb0` du 30/09 à 22:17 (« docs: compléter entreprise et quatre dossiers pour Claude cloud ») : copies de `../presti-secrets/prospection/` (les originaux restent hors dépôt, intacts, datés du 09/09) |
| Dépôt | `benjaminfiliot-wq/presti`, **privé** (audit C §5.9 : 404 sans jeton) |
| Contenu, mesuré par motifs sans afficher une valeur | **0 courriel, 0 numéro de téléphone à 10 chiffres** (ni `+33`). Le « 9 numéros de téléphone » de l'audit est une erreur de lecture : ce sont **9 suites de 15 chiffres de la forme `/profile.php?id=…`** (identifiants de profils Facebook publics) dans le `.md` et dans le `.json`, plus 5 à 11 suites de 14 chiffres (forme de SIRET, données du registre public). Reste : noms d'entreprises, lieux, notes d'accroche, liens de profils. |
| Nature | données professionnelles de personnes physiques (artisans, dirigeants) : prospection B2B, pas de donnée de santé, de paiement ni d'identifiant de connexion |
| Autres dossiers « prospection » dans HEAD | `docs/contexte-cloud/presti-ops/prospection/` (688 fichiers : maquettes et sites de référence du 27/09, noms d'entreprises réelles dans les dossiers), `docs/contexte-cloud/SaaS/Prospection/` (24 fichiers : guides, objections, lots d'e-mails), `reprise-cloud/prospection/` |
| Qui détient une copie | le clone de l'usine (`~/presti`, il suit `origin/main`), le worktree `presti-ops/reprise-locale-1001`, le clone de Claude cloud, GitHub (historique). Non vérifié ici : les sauvegardes du PC |

## 2. État à l’heure de cette note : l’option B est DÉJÀ appliquée par un autre lot

Le lot « audit de confidentialité » a choisi « retirer du suivi » et l’a commitée : **`b3771273` (04/10 14:46)**, 716 fichiers, 17 lignes ajoutées (`.gitignore` : quatre
dossiers de prospection ancrés, `.codex/auth.json`, `*.pem` sauf la clé publique, `*.p12`, `**/firebase/compte-de-service.json`, `/fix.js`), 62 375 supprimées. Les fichiers restent sur le disque ;
l’historique garde tout (dépôt privé, non réécrit). Ce lot-ci n’y a pas touché et ne l’a pas commandé : la consigne qu’il a reçue était de ne rien supprimer et d’écrire un plan.

**Effet de bord constaté AVANT ce commit, et levé par lui** : de ~14 h 12 à 14 h 46, les 716 suppressions étaient stagées sans commit et `node scripts/usine.mjs executer` échouait à construire son paquet
(`git add --pathspec-from-file` : « The following paths are ignored by one of your .gitignore files : docs/contexte-cloud/SaaS/Prospection … »). Chaque `verifier-final.mjs` rendait « l’usine ne juge pas (code 3) » et
se repliait sur le PC (constaté à 14 h 11, 14 h 13, 14 h 29, 14 h 31 ; 026-170 : le repli PC a rendu un FAIL de portabilité, cf. `menage-orchestre.md`). Leçon pour la suite : un retrait du suivi
se stage ET se commite dans la même minute, sinon l’usine ne reçoit plus rien (défaut de `construirePaquet` : un chemin supprimé mais ignoré fait échouer `git add`).

## 3. Les options

| | Option | Effet | Réversibilité |
|---|---|---|---|
| **A** | **Garder dans git** (état d'avant) | Rien ne change. Les données restent dans l'historique et dans tous les clones (usine, cloud, reprise). Les juges qui balayent « tous les fichiers suivis » continuent de voir `docs/contexte-cloud/` (SO-1, SG-5, audit C §5.5). | Totale. |
| **B** | **Retirer du suivi, garder sur le disque** (`git rm --cached` + règles `.gitignore`, UN commit) | Les fichiers quittent `HEAD` et les prochains paquets de l'usine ; ils restent sur le disque du PC, et `../presti-secrets/prospection/` reste l'original. À l'usine, le prochain `usine.mjs preparer` (fetch + alignement sur `origin/main`) supprime les copies de `~/presti`. **L'historique les garde** (commit `0fcf0bb0`), donc GitHub aussi. Débloque `executer`. | Totale : `git revert <commit>` ou `git add -f`. Aucune donnée perdue. |
| **C** | **B + purge de l'historique** (`git filter-repo --invert-paths`, `git push --force`) | Les fichiers disparaissent aussi des commits passés de GitHub. | **Non** une fois poussé : tous les clones (usine, reprise-locale-1001, cloud, PC) divergent et doivent être reclonés ; les hash changent (les fiches et `verdicts.jsonl` citent des commits) ; le pousseur de l'usine pousse `main` toutes les 2 min. Interdit à ce lot (force-push). À faire seulement après un miroir de sauvegarde (`git clone --mirror`). |
| **D** | **B réduit aux trois seules listes nominatives** (`presti-secrets/prospection/`), le reste de `docs/contexte-cloud/` reste suivi | Même effet que B sur les listes ; garde les guides et maquettes de référence dans git pour Claude cloud. | Totale. |

## 4. Recommandation

**Garder B (déjà fait, réversible à 100 %).** Raisons : il débloque l’usine, sort les données du périmètre des juges et des paquets, et le risque réel est faible (dépôt privé, 0 courriel et 0 téléphone dans les trois listes
mesurées ici, identifiants Facebook publics et SIRET). **C seulement si Benj veut que les données disparaissent aussi de l’historique** : coût élevé (reclonage de l’usine, du worktree et du cloud, hash des
commits cités dans les fiches qui changent), bénéfice marginal pour un dépôt privé. **D** n’a plus de sens : B est plus large (les trois dossiers, 716 fichiers) ; si Benj veut que Claude cloud revoie les maquettes de référence,
c’est `git revert b3771273` puis un retrait des seuls fichiers nominatifs.

Un point pour celui qui a commité B : la commande de mesure ci-dessus donne **0 courriel dans les trois listes de `presti-secrets/prospection/`**, alors que le message du commit parle d’adresses e-mail et de téléphones : cela
vaut pour les autres dossiers retirés (`deja-contactes-email.txt`, `corbeille-gmail-2026-09-15.md`, `emails-artisans/`…), que ce lot n’a pas mesurés.

## 5. Ce que Benj doit répondre

Une lettre : **B** (on garde, rien à faire), **C** (purge de l’historique, à faire par lui ou le chef après `git clone --mirror`), ou **A** (`git revert b3771273`). Sans réponse : B reste, l’historique n’est pas touché.

## 6. Revérification du soir (04/10, ~21 h 30, reprise du lot) : le plan tient, deux constats en plus

Mesuré de nouveau, sans afficher une seule valeur :

- **Les trois listes de `presti-secrets/prospection/`** (sur le disque : `prospects.json`, `prospects-3-reseaux-2026-09-09.md`, `linkedin-17-2026-09-09.md`) : **0 numéro de téléphone** (motif français `0X XX XX XX XX` / `+33` **borné par des chiffres** : 0 occurrence ;
  sans bornes, 9 « numéros » par fichier, tous de 10 chiffres pris au milieu de suites plus longues : ce sont les identifiants `profile.php?id=…` de Facebook, 14 par fichier), **0 courriel**. L'« 9 numéros de téléphone » de l'audit C §5.9 vient d'un motif sans bornes ; la conclusion du §1 est confirmée.
- **Option B toujours en place** : `b3771273` est dans l'historique, `git ls-files docs/contexte-cloud/presti-secrets` ne suit plus `prospection/`, les fichiers sont sur le disque, les originaux sont dans `../presti-secrets/prospection/`. Rien n'a été supprimé par ce lot, ni avant ni ce soir.
- **Reste suivi dans `docs/contexte-cloud/presti-secrets/` (5 fichiers)** : `INVENTAIRE.json`, `android/LISEZ-MOI.txt`, `firebase/compte-de-service.json` et `firebase/google-services.json` (toutes les valeurs sensibles sont `[VALEUR_MASQUEE]` ; aucun `AIza`), et **`relecture.txt`**.
  `compte-de-service.json` est aussi visé par une règle `.gitignore` (`**/firebase/compte-de-service.json`) mais **reste suivi** : une règle `.gitignore` ne retire jamais un fichier déjà suivi.
- **Constat en plus, à décider par Benj** : `relecture.txt` (« Compte de relecture des stores ») masque l'adresse et le mot de passe mais laisse en clair **le code à 6 chiffres** du compte de relecture (fixe, variable `RELECTURE_CODE` de Vercel). Faible gravité (il ne sert qu'avec l'adresse et le mot de passe masqués, dépôt privé), mais c'est la seule valeur de type identifiant encore en clair dans ce dossier.
  Pour l'aligner sur le reste : `git rm --cached docs/contexte-cloud/presti-secrets/relecture.txt docs/contexte-cloud/presti-secrets/firebase/compte-de-service.json` + une règle `.gitignore` pour `relecture.txt` (réversible, le fichier reste sur le disque et à `../presti-secrets/`). Non fait : le lot n'a pas à décider ce qui sort du suivi.
  Si Benj veut que le code disparaisse aussi de l'historique : même réserve que l'option C (reclonage de l'usine, de la reprise et du cloud) ; plus simple : **renouveler le code** (relancer `scripts/compte-relecture.mjs`, variable Vercel) : l'ancienne valeur devient inutile.

Une lettre suffit toujours (B/C/A du §5), plus, si Benj le veut, « R » pour retirer aussi `relecture.txt` et `compte-de-service.json` du suivi.
