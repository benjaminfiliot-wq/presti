# 026-248 — corrections du 28/09 (défauts des contre-vérifications)

Ce fichier garde les deux passages. Le second répond à la **deuxième contre-vérification** (`contre-verif-28-09.md`, 15 h 15-15 h 45) et vient en tête. Le premier (14 h 46) est conservé plus bas, sans changement.

# Deuxième passage (16 h 05-17 h 01) : réponse à la contre-vérification de 15 h 45

**Verdict.** `node scripts/orchestre.mjs verifier 026-248` est **PASS** depuis `fait/` : 321 s, le 28/09 à 17 h 00.

- L'arbre courant échoue d'abord sur **VG-1** (« `lib/vigile/releve.ts` absent »). VG-10 y est vert.
- Le témoin passe **14/14**.
- **89 sabotages sur 89** rougissent leur critère : 66 avant ce passage, 23 ajoutés (n° 67 à 89).
- `verifier.log` et `echecs-attendus.md` ont été réécrits par ce verifier (`2026-09-28T15:00:42Z`). Les lignes d'échec citées plus bas sont celles du tableau 3 de `echecs-attendus.md`.

**Périmètre.** Seuls ces fichiers ont changé :

- `scripts/vigile-qa.mjs` ;
- `scripts/fixtures/026/vigile/sabotages.json` ;
- `scripts/fixtures/026/vigile/entrees/releve.json` (jeux `livre_registre_*`) ;
- `scripts/fixtures/026/vigile/temoin/lib/vigile/releve.ts.temoin` (une date future vaut « périmé ») ;
- ce dossier de preuves.

`docs/agents/vigile.md` et `docs/agents/vigile.json` sont inchangés (sha256 `f982d9bf…` et `a34cbd56…`). Rien n'a été commité et rien n'a été lancé sur l'usine.

## D1. VG-10 : une négation dans la phrase suffisait (IMPORTANT, levé)

**Ce qui a changé.**

- **Plus de mots de négation.** `contradictions()` n'en cherche plus. Une phrase de `vigile.md` n'est acceptée que si elle appartient, texte aplati, à la **liste fermée `PHRASES_PERMISES`** du juge.
- **Le texte entier est fermé.** Les 47 phrases du document sont dans la liste, pas seulement celles qui touchent un sujet du contrat. Le motif est donné plus bas, à la 3e relecture.
- **Les sujets ne font plus que nommer l'écart.** `SUJETS_MD` (secret, vert non mesuré, pause et levée, cibles interdites, IA, écriture ou envoi) sert seulement à étiqueter le message d'échec.
- **Le résumé de VG-10 dit ce qui est vérifié :** « texte entier fermé : chaque phrase est l'une des 47 de la liste arrêtée dans le juge, négation ou pas ».

**Les sabotages qui le prouvent.** Ces six phrases étaient **VERTES** à 15 h 45 (contre-vérification, section D1). Elles sont **ROUGES** maintenant :

| n | sonde | ligne d'échec |
| --- | --- | --- |
| 67 | S1 : lire `agents.env` « sans jamais en afficher la valeur » | `phrase hors de la liste fermée (secret ou fichier de secret) : « Au besoin, il lit agents.env pour vérifier une dat…` |
| 68 | S2 : rester vert malgré une section non mesurée | `phrase hors de la liste fermée (vert malgré une section non mesurée) : « Une section non mesurée ne compte pas si les…` |
| 69 | S3 : la pause générale « s'il ne peut pas » | `phrase hors de la liste fermée (pause, levée ou reprise) : « S'il ne peut pas poser la pause d'un agent, il pose la p…` |
| 70 | S4 : lever la pause « dès que le seuil n'est plus franchi » | `phrase hors de la liste fermée (pause, levée ou reprise) : « Il lève la pause qu'il a posée dès que le seuil n'est pl…` |
| 71 | S5 : freellmapi « si Codex ne répond pas » | `phrase hors de la liste fermée (IA ou modèle) : « Si Codex ne répond pas, il passe par freellmapi. »` |
| 72 | Codex n°2 : « il n'est pas interdit de poser la pause générale » | `phrase hors de la liste fermée (pause, levée ou reprise) : « Il n'est pas interdit de poser la pause générale si les …` |

### 3e relecture : la fermeture par sujets laissait encore passer des phrases contraires

J'ai relu la première version de la correction : le juge de 16 h 21 (sha256 `78f4a011…`), qui ne fermait que les phrases touchant un sujet. Des phrases contraires au contrat qui n'emploient **aucun mot des sujets restaient vertes**.

J'ai sondé comme la contre-vérification : une phrase ajoutée à une copie de `vigile.md`, puis `--racine=<copie> --partie=unites`. Les sorties avant et après sont dans `sondes-vg10-28-09.log`, dans ce dossier.

| sonde | avant (16 h 21) | après | sabotage |
| --- | --- | --- | --- |
| « En cas de doute, il coupe tous les agents. » | **VERT** | rouge | 84 |
| « Il peut débloquer un agent qu'il a bloqué. » | **VERT** | rouge | 85 |
| « Il résume avec Claude Haiku quand le gabarit ne suffit pas. » | **VERT** | rouge | 86 |
| « Il lit le token Meta pour connaître sa date. » | **VERT** | rouge | 87 |
| « Il publie le relevé complet sur Telegram. » | **VERT** | rouge | 88 |
| `--tout-couper` ajouté à la commande de reprise | **VERT** | rouge | 89 |
| `vigile.md` livré, inchangé | vert | vert | (témoin) |

**Pourquoi fermer tout le texte plutôt qu'allonger les listes de mots ?** On n'en finit pas avec les synonymes : « couper », « débloquer », « geler », « remettre en service »… Le texte ne compte que 47 phrases, et c'est la consigne que lit aussi le modèle.

**Le prix à payer.** Toute retouche de `vigile.md` demande de mettre à jour `PHRASES_PERMISES` dans le juge. Le juge le rappelle en tête et au-dessus de la liste.

## D2. Aucune date de `vigile.json` n'était comparée au jour (IMPORTANT, levé ; contrat de 026-249 tranché)

**Ce qui a changé.**

- **Dates refusées.** `dateRefusee()` refuse une date qui n'est pas une vraie `AAAA-MM-JJ`, ou qui tombe après le jour du passage (heure de Paris). Elle s'applique à :
  - `registre_verifie_le` ;
  - chaque `verifie_le` d'échéance ;
  - chaque `lu_le` de fin de support ;
  - l'`accord` d'un seuil confirmé ;
  - `resume_modele.accord` et `pause_securite.accord`.
- **Contrat de 026-249 tranché.** Un `registre_verifie_le` **daté dans le futur vaut « registre périmé »** (orange), comme un registre relu il y a plus de `registre_perime_jours`.
  - La règle est écrite dans l'en-tête du juge (« Contrats précisés ») et dans `echecs-attendus.md`.
  - Le témoin `releve.ts` l'applique : `perime = age === null || age < 0 || age > seuil`.
- **Trois jeux `livre_registre_*` (VG-1).** Ils utilisent le `vigile.json` **livré**, sans les éléments du registre, avec une horloge relative au registre (« registre±Nj », 08:00 UTC) :
  - 90 jours → vert ;
  - 91 jours → orange ;
  - la veille du registre (registre daté dans le futur) → orange.

**Les sabotages qui le prouvent.** S6 et S8 étaient **VERTS** à 15 h 45. Ils sont **ROUGES** maintenant :

| n | critère | sabotage | ligne d'échec |
| --- | --- | --- | --- |
| 73 | VG-10 | `registre_verifie_le` au 2099-01-01 (S6, Codex n°4) | `registre_verifie_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28) : une date future masquerait pour t…` |
| 74 | VG-10 | `verifie_le` de META_PAGE_TOKEN au 2099-01-01 (S8) | `échéance META_PAGE_TOKEN : verifie_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28)` |
| 75 | VG-10 | `lu_le` de Next 15 au 2099-01-01 | `fin de support "next" : lu_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28)` |
| 76 | VG-10 | `erreurs_rouge` confirmé par un accord du 2099-01-01 | `seuil erreurs_rouge : accord 2099-01-01 est dans le futur (jour du passage : 2026-09-28)` |
| 77 | VG-10 | `pause_securite.accord` au 2099-01-01 | `pause_securite.accord 2099-01-01 est dans le futur (jour du passage : 2026-09-28) (null, ou la date du oui de Benj)` |
| 81 | VG-1 | fichier livré : `registre_perime_jours` à 900 | `livre_registre_91 (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange"` |
| 82 | VG-1 | relevé : un registre daté dans le futur compté frais | `livre_registre_futur (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange"` |
| 83 | VG-1 | relevé : la péremption ignorée dans le niveau des échéances | `livre_registre_91 (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange"` |

## D3. Source de Next 15 : n'importe quelle page de nextjs.org ou vercel.com passait (MINEUR, levé)

**Ce qui a changé.** `sourceRefusee('next', …)` n'accepte plus que les deux pages qui datent la fin de support :

- `https://endoflife.date/nextjs` : c'est la source du fichier livré ;
- `https://nextjs.org/support-policy`.

Tout autre chemin ou hôte rougit.

| n | sabotage | ligne d'échec |
| --- | --- | --- |
| 78 | la page d'installation de nextjs.org (S7, Codex n°3, **VERTE** à 15 h 45) | `source de la fin de support de Next 15 : https://nextjs.org/docs/app/getting-started/installation n'est ni https://…` |
| 79 | une page de vercel.com | `vercel.com n'est pas une page de référence pour next (endoflife.date, next…` |
| 80 | les versions du dépôt vercel/next.js | `github.com n'est pas une page de référence pour next (endoflife.date, next…` |

## D4. Preuves en retard sur l'arbre (levé)

`verifier.log` et `echecs-attendus.md` viennent du verifier de 17 h 00 : 89 sabotages, 320 s pour le juge, 321 s au total, sur l'arbre des sha256 ci-dessous.

Le résumé « 38 sabotages, 392 s » ne vient d'aucun fichier du périmètre. Il sera remplacé au prochain passage de `verifier` dans le digest.

## D5. Codex n'a pas jugé (quota épuisé) : pas refait par l'exécutant

Je n'ai **pas** relancé `node ../presti-ops/usine/revue-codex.mjs 026-248 --sabotages=4`, pour deux raisons :

- la revue indépendante appartient à la contre-vérification ;
- deux passages concurrents écriraient dans le même dossier, `.orchestre/travail/revue-codex/026-248/`, qui garde aussi les traces de 15 h 45.

**À faire par Claude Code :** recopier ce dossier (par exemple dans `026-248-contre-verif-2/`), puis relancer la revue. Le quota est revenu depuis 15 h 48.

## État après le passage (sha256)

| fichier | sha256 |
| --- | --- |
| `scripts/vigile-qa.mjs` | `2ceccbe5c3f565aaa5151de19023865310f46922224ac18683b23841d9a4bfb8` |
| `scripts/fixtures/026/vigile/sabotages.json` | `6221a50ffccca8a076deb95af6557fc24f2c0a0d82d622086e3c9f5d4b395b1e` |
| `scripts/fixtures/026/vigile/entrees/releve.json` | `b60ecaf5d52ec75180cb164bb1af39ec69372252041c33068db346c9d1abbfaf` |
| `scripts/fixtures/026/vigile/temoin/lib/vigile/releve.ts.temoin` | `39c8b8ed520a21e2e0b319a2d4ab1052bbcdba9536167859e0f9cefcebdcb2ed` |
| `docs/agents/vigile.md` (inchangé) | `f982d9bf37f577f67a57e1f2e832f79a3c454d7619d9813a143a074ab2a71537` |
| `docs/agents/vigile.json` (inchangé) | `a34cbd56aa142b08ec2f2a7e1b995e24608ae3f7494acb84baa231947960626a` |

---

# Premier passage (14 h 46) : réponse à la contre-vérification de 14 h

Cette note répond à `contre-verif-28-09.md`. Les cinq défauts établis ont été corrigés dans le périmètre de la fiche : `scripts/vigile-qa.mjs`, `scripts/fixtures/026/vigile/entrees/releve.json`, `scripts/fixtures/026/vigile/sabotages.json` et `docs/agents/vigile.json` (seule sa `note` change, les valeurs restent les mêmes). La production du Vigile (026-249) n'est pas touchée. Rien n'a été commité.

**Verdict.** `node scripts/orchestre.mjs verifier 026-248` est **PASS** depuis `fait/` en 864 s, sur un PC chargé (CPU à 100 %, 53 processus node d'autres sessions).

- L'arbre courant échoue d'abord sur **VG-1**, et VG-10 y est vert.
- Le témoin passe **14/14**.
- **57 sabotages sur 57** rougissent leur critère. Il y en avait 38 avant : 19 ont été ajoutés, et VG-10 fait maintenant partie des critères exigés.
- Le détail ligne par ligne est dans `echecs-attendus.md` (tableau 3, lignes 39 à 57) et dans `verifier.log`.

## Défaut par défaut : ce qui a changé, et le sabotage qui le reproduit (il rougit maintenant)

Les lignes d'échec ci-dessous sont les vraies lignes du juge, relevées dans `echecs-attendus.md`.

### 1. VG-10 ne jugeait que la forme de `vigile.json`, jamais ses valeurs (Codex, et ma sonde C)

**Ce qui a changé.**

- **Seuils provisoires.** Tant qu'un seuil vaut `provisoire: true`, il doit valoir exactement la valeur du contrat. Pour le relevé : 10, 100, 5, 20, 14, 7, 30 et 90. Pour la pause : 1, 20, 1 et 1.
- **Seuils confirmés.** Un seuil que Benj a confirmé s'écrit `{ valeur, provisoire: false, accord: "AAAA-MM-JJ" }` (la date de son « oui »). Il doit rester cohérent : positif, entier (sauf `cout_jour_eur`), orange < rouge, J-rouge < J-orange. La `note` de `vigile.json` le dit maintenant.
- **Next 15.** Il faut `fin_support` au `2026-10-21`, une source `https://` et `lu_le`. `a_verifier` n'est jamais accepté ici, car la date est connue (026-004).
- **Échéances.** Chaque échéance porte `verifie_le` et se trouve dans un seul état : une date, `sans_echeance` ou `a_verifier`. Une date ou un `sans_echeance` doit citer sa source.
- **Jeux avec le fichier livré (VG-1).** Sept jeux se jouent avec le `vigile.json` **livré** de la racine jugée (`"reglages": { "livre": true }`, contrôle `livre`, valeurs attendues calculées à la main). Ils se placent aux bornes des seuils :
  - erreurs : 9, 10, 99 et 100 ;
  - bannissements : 4, 5, 19 et 20 ;
  - jetons : J-15, J-14, J-8 et J-7 ;
  - Next 15 : 31, 30, 20 et 0 jours.
- **Jeux avec le fichier livré (VG-12).** Sept jeux de pause se jouent aussi avec le fichier livré :
  - 20 échecs : une pause ;
  - 19 échecs, 1 € et 0 secret : aucune pause ;
  - 1,5 € : une pause ;
  - 1 envoi hors règle : une pause ;
  - 1 secret : une pause ;
  - deux agents qui franchissent ensemble : une seule pause ;
  - chef et pont : aucune pause.
- **Sabotages de `vigile.json`.** Ils s'écrivent désormais par chemins JSON (champ `json`) : ils résistent à une remise en forme du fichier.

**Les sabotages qui le prouvent.**

| n | critère | sabotage | ligne d'échec |
| --- | --- | --- | --- |
| 43 | VG-10 | `secret_expose` à 0 (le cas bloquant de Codex) | `seuil de pause secret_expose = 0, provisoire, au lieu de 1` |
| 44 | VG-10 | `erreurs_rouge` à 100000 | `seuil erreurs_rouge = 100000, provisoire, au lieu de 100` |
| 45 | VG-10 | `echeance_rouge_jours` négatif | `seuil echeance_rouge_jours = -3, provisoire, au lieu de 7` |
| 46 | VG-10 | Next 15 en `a_verifier`, sans date ni source | `next 15 {"paquet":"next","majeure":15,"a_verifier":true} (fin_support "2026-10-21", source https://, lu_le ; jamais…` |
| 47 | VG-10 | `echecs_1h` à 1000 avec `provisoire: false` (sonde C) | `seuil de pause echecs_1h confirmé (provisoire: false) sans accord: "AAAA-MM-JJ"` |
| 48 | VG-10 | `fin_support_orange_jours` à 3 | `seuil fin_support_orange_jours = 3, provisoire, au lieu de 30` |
| 52 | VG-1 | fichier livré : `erreurs_rouge` à 100000 | `livre_seuils_hauts (vigile.json livré) : erreurs.niveau = "orange" au lieu de "rouge"` |
| 53 | VG-1 | fichier livré : Next 15 en `a_verifier` | `livre_seuils_bas … fins_support[paquet=next].fin_support = null au lieu de "2026-10-21"` |
| 54 | VG-1 | fichier livré : `echeance_rouge_jours` négatif | `livre_seuils_hauts … elements[nom=jeton_externe:veilleur].niveau = "orange" au lieu de "rouge"` |
| 55 | VG-12 | fichier livré : `secret_expose` à 0 | `livre_pause_echecs_20 : pauses[0].seuil : "secret_expose" au lieu de "boucle_erreurs"` |
| 56 | VG-12 | fichier livré : `echecs_1h` à 1000, `provisoire: false` | `livre_pause_echecs_20 : pauses : 0 élément(s) au lieu de 1` |
| 57 | VG-12 | fichier livré : `max_par_passage` à 2 | `livre_pause_deux : pauses : 2 élément(s) au lieu de 1` |

### 2. VG-6 ne voyait pas une requête `node:https` vers un autre hôte (sonde A)

**Ce qui a changé.**

- **Espion réseau.** Pendant chaque passage de `executer()`, un espion se pose sur `net.Socket.prototype.connect`. `fetch`, `http`, `https`, `net` et `tls` passent tous par là, que le module soit importé par défaut, nommé ou dynamique. Une connexion vers un autre hôte que celui de `--base`, ou une connexion `ipc`, rougit VG-6. Le contrôle vaut pour tous les passages de la chaîne. Il vaut aussi pour VG-13 dans les passages de pause.
- **Contrôle d'espion vide.** Si l'espion ne voit aucune connexion au passage nominal, VG-6 rougit aussi : un espion cassé ne peut pas passer pour un vert.
- **Contrôle statique.** Le source de `lib/vigile/**` et `scripts/vigile/**` ne doit importer ni `node:http`, ni `node:https`, ni `node:http2`, ni `node:dgram`. Il ne doit ouvrir aucune socket nette (`net.connect`, `createConnection`, `Socket`). `tls.connect` reste permis, pour lire la date du certificat.

**Les sabotages qui le prouvent.**

| n | sabotage | ligne d'échec |
| --- | --- | --- |
| 39 | requête `https` vers `127.0.0.2:9` par `import('node:ht' + 'tps')`, invisible au contrôle statique (c'est la sonde A) | `nominal : connexion hors de l'hôte de --base (127.0.0.1) : 127.0.0.2:9` |
| 40 | `import https from 'node:https'` | `scripts/vigile/releve.mjs importe node:https (HTTP par fetch vers la base seulement)` |

### 3. Une écriture hors de `--travail`, dans un dossier non surveillé, passait (sonde B)

**Ce qui a changé.**

- **Espion de fichiers.** Pendant chaque passage, un espion couvre les écritures de `fs` et de `fs/promises` : `write*`, `append*`, `mkdir*`, `rm*`, `rename*`, `copy*`, `cp*`, `open` en écriture, `createWriteStream`, etc. Les liaisons ESM sont resynchronisées par `syncBuiltinESMExports`, pour que les imports nommés soient aussi couverts.
- **Règle.** Toute écriture hors de `--travail` rougit VG-6, où qu'elle soit, même si le fichier est effacé aussitôt.
- **Instantanés.** Ils restent en place, en plus de l'espion.

**Les sabotages qui le prouvent.**

| n | sabotage | ligne d'échec |
| --- | --- | --- |
| 41 | écriture dans `os.tmpdir()` puis effacement | `nominal : écriture hors de --travail : writeFileSync C:/Users/benja/AppData/Local/Temp/vigile-qa-sabotage-19900.txt, rmSync …` |
| 42 | écriture à côté de `--travail`, dans le bac, que les instantanés ne couvrent pas (c'est la sonde B) | `nominal : écriture hors de --travail : writeFileSync …/.orchestre/travail/vigile-qa/bacs/…` |

### 4. VG-10 ne contrôlait pas toutes les clauses de `vigile.md` (Codex, mineur)

**Ce qui a changé.** Il y a maintenant 17 clauses au lieu de 12. S'y ajoutent :

- « il signale, Benj ou Claude Code décide » ;
- « pendant la pause générale, il continue » ;
- « un défaut de qualité se signale, il ne se met pas en pause » ;
- « chaque pause remonte à Matt et à Benj » ;
- « non couvert : les journaux Vercel » ;
- « aucun nombre qui ne soit dans le relevé ».

VG-10 contrôle aussi :

- les bornes du résumé : 12 lignes, 1 200 signes, 200 signes, et la sortie `{ "texte", "evenement" }` ;
- la section de reprise : la commande exacte `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/vigile/releve.mjs --base=https://prestiapp.fr`, « non mesuré » et `PRESTI_JETON_VIGILE`.

**Les sabotages qui le prouvent.**

| n | sabotage | ligne d'échec |
| --- | --- | --- |
| 49 | la remontée retirée | `vigile.md ne dit pas « chaque pause remonte à matt et à benj »` |
| 50 | les bornes retirées | `vigile.md ne donne pas la borne du résumé « 12 lignes »` |
| 51 | la commande de reprise sans `--base` | `vigile.md : la section de reprise ne donne pas la commande exacte …` |

### 5. Faux rouges sur un PC chargé : le faux npm nominal était tué à 3 s (mineur)

**Ce qui a changé.** Le délai npm du passage nominal passe de 3 s à **10 s** (`delaiNpm: sc.delaiNpm ?? 10`). Le scénario `npm_dort` garde 2 s, pour prouver que npm est tué au délai.

**La preuve.** Il n'y a pas de sabotage possible ici : c'est une marge de charge, pas un comportement du code jugé. Deux passages le montrent :

- le témoin complet, lancé pendant que d'autres sessions tenaient le processeur à 100 %, est vert sur VG-5 et VG-6, sans `dependances.raison "delai"` au nominal ;
- dans ce même passage, le sabotage 18 (« npm jamais tué au délai ») rougit toujours VG-6.

## Ce qui reste à Benj ou à Claude Code

- Si Benj confirme un seuil différent de celui du contrat, Claude Code l'inscrit (`provisoire: false`, `accord` daté). Il met ensuite à jour, dans `entrees/releve.json`, les valeurs attendues des jeux `livre_*` qui touchent ce seuil. C'est voulu : une valeur confirmée doit se refléter dans les attendus faits à la main.
- Les sabotages `json` de `vigile.json` visent des chemins (`seuils.erreurs_rouge.valeur`, `fins_support[paquet=next]`…). Ils survivent à une remise en forme du fichier, pas à un renommage de clé.

## Traces

- `echecs-attendus.md` et `verifier.log` (ce dossier), réécrits par le verifier du 28/09 à 14 h 42.
- Le premier verdict de Codex est conservé dans `.orchestre/travail/revue-codex/026-248-avant-correction/`.
