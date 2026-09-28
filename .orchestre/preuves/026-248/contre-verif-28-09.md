# 026-248 — contre-vérifications du 28/09 (Claude Code, deux IA)

Ce fichier garde les deux passages. Le second, fait vers 15 h 15-15 h 45 sur l'arbre corrigé deux fois, vient en premier. Le premier, fait à 14 h, est conservé tel quel plus bas.

# Deuxième contre-vérification (15 h 15-15 h 45, arbre après la correction de 14 h 46 et les retouches de 15 h 07)

**Verdict : ROUGE, défaut établi sur le juge (VG-10). La production du témoin est bien gardée.**

- **Le code est bien jugé.** Mes six sabotages du code de production rougissent chacun leur critère, et seulement celui-là. Le témoin restauré repasse au vert.
- **Le juge des documents se contourne.** Le détecteur de « phrases contraires » de VG-10, ajouté après la deuxième revue de Codex, laisse passer toute phrase qui contient un mot de négation. De plus, une date future dans `vigile.json` masque pour toujours la péremption du registre.
- Codex a rencontré les mêmes angles morts avant de tomber à court de quota. Je les ai reproduits de mon côté.

## A. Le moyen

1. **Codex sur l'usine.** Commande lancée : `node ../presti-ops/usine/revue-codex.mjs 026-248 --sabotages=4` (gpt-6-sol, effort `medium`, celui de la commande prescrite ; abonnement ChatGPT seul).
   - **Code 3 : pas jugé.** Raison exacte : « quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM ». Codex a rendu le code 1 au bout de 437 s. La commande a duré 524 s sur l'usine.
   - Il n'y a pas de `verdict.json`. En revanche, le relevé du coureur, que Codex ne peut pas modifier (`journal.json`, `runs/`), est complet jusqu'à la coupure.
   - Le verdict précédent, rendu à 14 h 56 après la première correction, est conservé dans `.orchestre/travail/revue-codex/026-248-apres-correction-1/`.
2. **Mes sabotages réversibles de la production.** Ils se font sur une copie du témoin construite comme `construireTemoin` : `lib/`, les 7 `*.temoin` et le `vigile.{md,json}` livré. La copie est dans `.orchestre/travail/contre-verif-026-248-v2/temoin`. Pour chaque sabotage :
   - je modifie un fichier de la copie ;
   - je lance `node scripts/vigile-qa.mjs --racine=<copie> --partie=<partie du critère>` ;
   - je restaure le fichier octet pour octet et je contrôle le sha256 ;
   - je relance la même partie.

   À la fin, le témoin restauré est jugé sur les six parties.
3. **Sondes de VG-10** avec la même méthode : les phrases contraires dans `vigile.md`, et les dates et sources de `vigile.json`.
4. **Aucun fichier du dépôt n'a été touché.** Les sha256 des 30 fichiers de la fiche sont identiques au début et à la fin (`sha-depart.txt` et `sha-fin.txt`). Rien n'a été commité.

## B. Ce que le coureur de Codex a relevé (`.orchestre/travail/revue-codex/026-248/journal.json`)

| passage | quoi | code |
| --- | --- | --- |
| 0 et 1 | témoin : `--preuve-echecs` sur l'arbre courant, dans le bac de l'usine | **0** en 86 s : VG-1 d'abord rouge, VG-10 vert, témoin vert, **66 sabotages rouges** |
| 2 | `vigile.md` : ajout de « Il n'est pas interdit de poser la pause générale si les alertes persistent. » | **0 : resté VERT** |
| 3 | `vigile.json` : source de Next 15 remplacée par `https://nextjs.org/docs/app/getting-started/installation` (une page sans date de fin) | **0 : resté VERT** |
| 4 | `vigile.json` : `registre_verifie_le` figé à `2099-01-01` | **0 : resté VERT** |

Codex allait passer au sabotage suivant quand le quota est tombé. Ces trois passages ont été lancés par le coureur, hors de portée de Codex. Ils ne touchent que des fichiers du périmètre, le bac est resté stable et aucune erreur de syntaxe n'est en cause. Ce sont donc des faits. Je les ai rejoués de mon côté (section D).

## C. Mes six sabotages de la production : six rouges au bon critère, puis retour au vert

Les empreintes de la copie avant sabotage sont identiques à celles des fixtures `*.temoin` et du `vigile.{md,json}` livré.

| n | critère | fichier | sabotage | ligne d'échec (réelle) | sha256 : avant → saboté → restauré | partie après restauration |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | VG-12 | `lib/vigile/releve.ts` | un agent déjà en pause peut être repausé (seule la pause générale l'écarte encore) | `pause_deja : pauses : 1 élément(s) au lieu de 0 (… redacteur_site … boucle_erreurs, 30) ; pauses_ecartees.deja_en_pause : 0 au lieu de 1` | 8875ccda… → 14911fe6… → 8875ccda… ✓ | vert, code 0 |
| 2 | VG-14 | `scripts/vigile/releve.mjs` | le `vigile_pause` porte l'objet `pause:<agent>` au lieu de `agent:<agent>` | `pause posée : le POST pauses n'est pas suivi d'un vigile_pause objet agent:facteur ({… "objet":"pause:facteur" …})` | cc1ed624… → f823e6c5… → cc1ed624… ✓ | vert, code 0 |
| 3 | VG-9 | `scripts/usine/systemd/presti-vigile.service` | `User=root` au lieu de `User=agents` | `service : User=agents manque ; service : User=root hors contrat` | 511cd3cc… → 0269aa95… → 511cd3cc… ✓ | vert, code 0 |
| 4 | VG-8 | `scripts/vigile/releve.mjs` | Ollama accepté sur tout hôte http (`boucleLocale` élargie) | `ollama_distant : le lecteur est appelé (jamais attendu)` | cc1ed624… → adc3fcc9… → cc1ed624… ✓ | vert, code 0 |
| 5 | VG-1 | `lib/vigile/releve.ts` | un nom absent du coffre ne rend plus les échéances rouges | `coffre_manquant : 2 écart(s) avec l'attendu fait à la main : .niveau : "inconnu" au lieu de "rouge" ; .echeances.niveau : "vert" au lieu de "rouge"` | 8875ccda… → c225a864… → 8875ccda… ✓ | vert, code 0 |
| 6 | VG-13 | `scripts/vigile/releve.mjs` | un `POST /api/agents/reprise` à chaque passage | `pause_posee : POST /api/agents/reprise hors des routes permises ; pause_relance : … ; pause_403 : … ; pause_404 : … ; pause_generale : …` | cc1ed624… → 614f4997… → cc1ed624… ✓ | vert, code 0 |

- Chaque sabotage ne rougit que son propre critère : la colonne `rouges` de `sabotages-prod.json` ne contient qu'un seul identifiant par ligne.
- **Le témoin restauré, jugé sur les six parties, rend le code 0 et `vigile-qa : PASS`.** VG-1 à VG-10 et VG-12 à VG-14 sont verts, et VG-11 est sauté comme prévu (170 s, voir `temoin-final.log`).
- Les sha256 de la copie restaurée sont égaux à ceux des fixtures pour les 7 fichiers `.temoin` et pour les 2 documents livrés.

## D. Les angles morts de VG-10 (défaut établi)

### D1. Des phrases contraires au contrat dans `vigile.md` passent au vert

La règle mot pour mot reste en place dans le document. On ajoute seulement une phrase qui la contredit.

| sonde | phrase ajoutée | contrat violé | VG-10 | sha256 saboté → restauré |
| --- | --- | --- | --- | --- |
| S1 | « Au besoin, il lit `agents.env` pour vérifier une date, sans jamais en afficher la valeur. » | aucun fichier de secret lu | **VERT** | ca829e9a… → f982d9bf… ✓ |
| S2 | « Une section non mesurée ne compte pas si les autres sont au vert : le niveau reste vert. » | jamais vert avec une section non mesurée | **VERT** | 5130b947… → f982d9bf… ✓ |
| S3 | « S'il ne peut pas poser la pause d'un agent, il pose la pause générale. » | ne pose jamais la pause générale | **VERT** | eae36ec8… → f982d9bf… ✓ |
| S4 | « Il lève la pause qu'il a posée dès que le seuil n'est plus franchi. » | ne la lève jamais | **VERT** | d6fc3d2b… → f982d9bf… ✓ |
| S5 | « Si Codex ne répond pas, il passe par freellmapi. » | jamais d'IA gratuite | **VERT** | afe589a9… → f982d9bf… ✓ |
| Codex n°2 | « Il n'est pas interdit de poser la pause générale si les alertes persistent. » | ne pose jamais la pause générale | **VERT** | (sur l'usine) |

**La cause.** `contradictions()` (`vigile-qa.mjs`, vers les lignes 1188 à 1204) juge qu'une phrase « nie » l'interdit dès qu'elle contient **un** mot de négation : `ne`, `ni`, `jamais`, `aucun`, `pas` ou `n'`. Peu importe le verbe sur lequel ce mot porte. Les sabotages 59 et 61 à 63 de `sabotages.json` rougissent seulement parce que leurs phrases ne contiennent aucune négation. Le résumé de VG-10, « aucune phrase contraire », dit donc plus que ce que le juge vérifie.

**Mon avis sur la gravité : important, pas bloquant pour le comportement.** Mes sabotages 1, 4 et 6, ainsi que les sabotages existants 17 (`agents.env`), 22 et 23 (IA gratuite, `:cloud`) et 33 et 34 (lever la pause, pause générale), montrent que les critères de code rougissent si le Vigile *fait* ce que la phrase autorise. Le risque, c'est une consigne qui ment : un lecteur ou un exécutant de 026-249 pourrait s'y fier.

### D2. Les dates de `vigile.json` ne sont jamais comparées au jour

| sonde | écart | parties jugées | verdict |
| --- | --- | --- | --- |
| S6 (Codex n°4) | `registre_verifie_le: "2099-01-01"` | unites et releve | **VERT**, code 0 |
| S8 | `verifie_le` de META_PAGE_TOKEN à `2099-01-01` | unites | **VERT**, code 0 |

**L'effet en production.** Le témoin calcule `perime = joursCalendrier(verifie, jour) > 90` (`lib/vigile/releve.ts`, vers la ligne 300). Avec une date future, l'écart en jours est négatif. **L'orange « registre périmé » ne se déclencherait donc plus jamais.** Le relevé, jugé sur les jeux « livré », ne le voit pas non plus : aucun de ces jeux n'essaie la péremption avec le fichier livré.

**Gravité : importante.** Elle masque une alerte du contrat.

### D3. La source de Next 15 : mineur

**S7 (Codex n°3).** `https://nextjs.org/docs/app/getting-started/installation` passe au vert. `HOTES_SOURCE.next` accepte n'importe quelle page de `nextjs.org` et de `vercel.com`. Le chemin n'est restreint que pour `endoflife.date` et `github.com`.

## E. Des preuves locales en retard sur l'arbre (à régénérer)

- `sabotages.json` compte **66** sabotages. Il a été modifié à 15 h 06, et `vigile-qa.mjs` à 15 h 07.
- `verifier.log` et `echecs-attendus.md` datent de 14 h 42 et n'en comptent que **57**.
- Le résumé de la fiche fourni pour cette contre-vérification annonce encore « 38 sabotages, 392 s ».
- L'arbre courant passe bien le verifier : c'est le passage n°0 de l'usine (code 0, 66 sabotages rouges, 86 s). Mais les preuves de la fiche ne le montrent pas encore. Il faut relancer `node scripts/orchestre.mjs verifier 026-248` avant de commiter.

## F. Corrections à faire dans `scripts/vigile-qa.mjs` (et `sabotages.json`)

1. **Les phrases contraires (D1).** Une négation quelque part dans la phrase ne suffit pas.
   - Toute phrase de `vigile.md` qui touche un sujet interdit (fichier de secret, pause générale, levée, IA gratuite ou `:cloud`, vert malgré une section non mesurée) doit appartenir à une **liste fermée de phrases permises**, comparées sur le texte aplati. Toute autre phrase sur ces sujets rougit.
   - Ajouter S1 à S5 et Codex n°2 à `sabotages.json`.
2. **Les dates (D2).**
   - Refuser dans VG-10 toute date postérieure au jour du passage : `registre_verifie_le`, `verifie_le`, `lu_le` et `accord`.
   - Trancher le contrat pour 026-249 : une date future du registre vaut-elle « périmé » ? Je le propose. Ajouter ensuite un jeu `livre` qui teste la péremption : 91 jours → orange, date future → orange.
   - Sabotages à ajouter : `registre_verifie_le` en 2099 (VG-10, puis VG-1 si le contrat est tranché) et un `verifie_le` futur (VG-10).
3. **La source de Next 15 (D3).** Limiter la source à `endoflife.date/nextjs` et à la page de politique de support de Next.js (un chemin précis). Ajouter le sabotage de Codex n°3.
4. **Les preuves.** Régénérer `verifier.log` et `echecs-attendus.md` après ces corrections, puis refaire relire par Codex quand son quota revient (après 15 h 48).

## G. Traces

- **Codex :** `.orchestre/travail/revue-codex/026-248/` (`journal.json`, `runs/0.log` à `runs/4.log`, `codex.log`, `executer.log`).
- **Sortie complète de ma commande :** `.orchestre/travail/contre-verif-026-248-v2/revue-codex.out`.
- **Mes passages :** `.orchestre/travail/contre-verif-026-248-v2/`. On y trouve :
  - `sabotages-prod.json` et `sabotages-prod.mjs` ;
  - `sondes-vg10.json`, `sondes-json.json` et leurs scripts ;
  - `sorties.log` (les sorties complètes du juge) et `temoin-final.log` ;
  - `sha-depart.txt` et `sha-fin.txt` ;
  - la copie `temoin/`.

---

# Première contre-vérification (14 h, avant la correction de 14 h 46)

**Verdict : ROUGE, défaut établi sur le juge.** Le verifier de la fiche est vert. Les fichiers livrés sont conformes au contrat : `docs/agents/vigile.json` porte bien 10/100, 5/20, J-14/J-7, 30, 90 et les seuils de pause 1/20/1/1. Mais le juge ne voit pas plusieurs écarts au contrat. Le plus important : **VG-10 ne vérifie que la forme de `vigile.json`, pas ses valeurs**, et aucune partie du juge ne lit le `vigile.json` livré (toutes utilisent `entrees/vigile-essai.json`). Codex a établi ce défaut et je l'ai reproduit de mon côté. Il faut le corriger dans `vigile-qa.mjs` avant de s'appuyer sur VG-10, donc avant 026-249.

## 1. Moyen

1. **Codex sur l'usine**, avec `node ../presti-ops/usine/revue-codex.mjs 026-248 --sabotages=4` (gpt-6-sol, medium, abonnement ChatGPT seul, 10 min 30 s). **Code 1 : défaut établi.** Le témoin, c'est-à-dire le verifier tel quel, est vert en 72 s. Codex a fait quatre sabotages et **les quatre sont restés verts**. Détail dans `.orchestre/travail/revue-codex/026-248/verdict.json`.
2. **Mes sabotages de la production.** La production de cette fiche de test, c'est le témoin : les 7 fichiers `scripts/fixtures/026/vigile/temoin/**.temoin`. Je les ai copiés dans `.orchestre/travail/contre-verif-026-248/temoin`, de la même façon que `construireTemoin` du juge. Pour chaque sabotage : je modifie la copie, je lance `node scripts/vigile-qa.mjs --racine=<copie> --partie=<partie du critère>`, je restaure la copie octet pour octet et je contrôle le sha256. Je relance ensuite la même partie, qui doit repasser au vert. À la fin, le témoin restauré est jugé sur toutes les parties. **Aucun fichier du dépôt n'a été touché.**
3. **Sondes des angles morts** : trois écarts au contrat que le juge devrait rougir, faits avec la même méthode (copie, restauration, sha256).

## 2. Ce que Codex a établi (`verdict.json`)

| n° | sabotage (dans `docs/agents/vigile.json`) | verdict |
| --- | --- | --- |
| 2 | `erreurs_rouge` à 100000 au lieu de 100 | resté VERT |
| 3 | `secret_expose` à 0 : une pause devient possible sans aucun secret | resté VERT |
| 4 | `echeance_rouge_jours` négatif : le rouge à J-7 disparaît | resté VERT |
| 5 | Next 15 remplacé par `a_verifier`, sans date ni source | resté VERT |

Les défauts que Codex a relevés :

- **Bloquant** : `secret_expose` passe de 1 à 0 sans aucun échec.
- **Majeurs** : `erreurs_rouge` à 100000, `echeance_rouge_jours` négatif, et l'échappatoire `a_verifier` sur une fin de support pourtant connue.
- **Mineur** : VG-10 se contente de chercher douze phrases dans `vigile.md`. Il ne contrôle ni la remontée à Matt et à Benj, ni les bornes du résumé, ni la commande de reprise.

**Mon avis sur la gravité.** Aujourd'hui, les valeurs livrées sont justes. Rien n'est donc faux en service. En revanche, `vigile.json` est la configuration que lit le script de l'usine, et une dérive y passerait inaperçue. Je classe ce défaut « important, à corriger avant clôture ». Le cas `secret_expose` à 0 est le plus grave, car il pauserait un agent par passage. Le résumé de VG-10, « pause_securite au contrat », est trompeur : seules la forme, `max_par_passage` et `cibles_interdites` sont contrôlées.

## 3. Mes six sabotages de la production : six rouges au bon critère

La copie du témoin a les mêmes empreintes sha256 que les fixtures. Par exemple, `scripts/vigile/releve.mjs` vaut `cc1ed6242ae22ef3…` et `presti-vigile.timer` vaut `41dc8a8bb1d7f610…`.

| n | critère | fichier | sabotage | ligne d'échec (réelle) | sha256 : avant → saboté → restauré | partie au vert après |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | VG-13 | `scripts/vigile/releve.mjs` | pause levée de façon déguisée : `{ agent, ['pau'+'se']: !1 }` sur chaque agent en pause (le contrôle statique ne la voit pas) | `pause_posee : un corps porte « pause » ({"agent":"redacteur_site","pause":false})` | cc1ed624… → a1a91cde… → cc1ed624… ✓ | ✓ (25 s) |
| 2 | VG-6 | `scripts/vigile/releve.mjs` | `npm audit` sans `--omit=dev` | `argv du faux npm : ["audit","--json","--registry=…"] (exactement audit --json --omit=dev …)` (passage rejoué, voir la note) | cc1ed624… → 19d5b49c… → cc1ed624… ✓ | ✓ |
| 3 | VG-5 | `scripts/vigile/releve.mjs` | 40 relevés gardés au lieu de 30 | `35 relevés anciens : 36 jour(s) gardé(s) de 2026-08-01 à 2026-10-01 (30, du 2026-08-07 …)` | cc1ed624… → 64a42341… → cc1ed624… ✓ | ✓ (30 s) |
| 4 | VG-9 | `scripts/usine/systemd/presti-vigile.timer` | minuteur à 07:50, donc après le digest de 7 h 30 | `minuteur : [Timer] OnCalendar=*-*-* 07:50:00 Europe/Paris …` | 41dc8a8b… → 9facd043… → 41dc8a8b… ✓ | ✓ |
| 5 | VG-8 | `scripts/vigile/releve.mjs` | Ollama accepté hors de la boucle locale (`&& boucleLocale(e.url)` retiré) | `ollama_distant : le lecteur est appelé (jamais attendu)` | cc1ed624… → c908ed8f… → cc1ed624… ✓ | ✓ (21 s) |
| 6 | VG-14 | `scripts/vigile/releve.mjs` | la ligne de journal (le secret) recopiée dans le `vigile_pause` | `la ligne de journal qui a déclenché la pause sort (requête, fichier ou console)` | cc1ed624… → e3302263… → cc1ed624… ✓ | ✓ (15 s) |

- **Le témoin restauré, jugé sur toutes les parties : code 0, `vigile-qa : PASS`, de VG-1 à VG-14** (64 s). Les fixtures du témoin sont intactes : le sha256 est le même avant et après.
- **Note sur le sabotage 2.** Au premier passage, le PC était chargé. VG-6 a rougi pour une mauvaise raison (`le faux npm n'a pas été lancé`) : le faux npm a été tué au délai de 3 s du scénario nominal avant même d'avoir démarré. VG-5 est aussi passé au rouge (`dependances.raison "delai"`). Rejoué au repos, VG-6 rougit sur l'argv, ce qui est la bonne raison. Le délai de 3 s produit donc de faux rouges quand la machine est chargée. C'est mineur : cela ne donne jamais un faux vert.

## 4. Sondes des angles morts du juge

| sonde | critère | écart au contrat | verdict du juge |
| --- | --- | --- | --- |
| A | VG-6 | une requête vers `https://127.0.0.2:9/`, un autre hôte que `--base`, faite par `node:https` et non par `fetch` | **VERT : angle mort.** Le juge n'espionne que `globalThis.fetch`. Le contrat dit pourtant « toutes les requêtes HTTP … vont à l'hôte de --base ». |
| B | VG-6 | une écriture hors de `--travail`, dans un dossier que le juge ne surveille pas | **VERT : angle mort (mineur).** L'instantané ne couvre que `depot`, `unites`, `journaux`, `home` et `cwd`. |
| C | VG-10 | `echecs_1h` passé de 20 à 1000, avec `provisoire: false` | **VERT : angle mort.** Même défaut que Codex, reproduit indépendamment. |

Toutes les sondes ont été restaurées : sha256 contrôlé, partie relancée au vert. Le fichier écrit par la sonde B se trouvait sous `.orchestre/travail/` et a été effacé.

## 5. Corrections à faire dans `scripts/vigile-qa.mjs` (et `sabotages.json`)

1. **VG-10.** Tant que `provisoire` vaut `true`, comparer les huit seuils et les quatre seuils de pause aux valeurs du contrat. Exiger pour Next 15 `fin_support: "2026-10-21"`, une source `https://` et `lu_le`. Réserver `a_verifier` aux dates vraiment inconnues. Ajouter au moins un cas de VG-1 et un cas de VG-12 joués avec **le `vigile.json` livré**, et non celui de la fixture. Ajouter à `sabotages.json` des sabotages sur `docs/agents/vigile.json`, comme les quatre de Codex.
2. **VG-6.** Espionner aussi `http.request`, `https.request`, `net.connect` et `tls.connect` : seul l'hôte de la base est permis, pour le certificat. À défaut, interdire dans le source de `scripts/vigile/**` et `lib/vigile/**` tout import de `node:http`, `node:https` ou `node:net` autre que la lecture TLS.
3. **Mineurs.** Surveiller aussi `os.tmpdir()` et la racine jugée pendant la chaîne. Porter à 10 s environ le délai du faux npm dans le scénario nominal (`npm_dort` garde ses 2 s). Ajouter à VG-10 les clauses manquantes de `vigile.md` : remontée à Matt et à Benj, défaut de qualité signalé, bornes du résumé, commande de reprise.

## 6. Traces

- Codex : `.orchestre/travail/revue-codex/026-248/` (`verdict.json`, `executer.log`, `runs/`).
- Mes passages : `.orchestre/travail/contre-verif-026-248/` (`resultats.json`, `sondes.json`, `sorties.log` avec les sorties complètes du juge).
- État du dépôt : rien n'a été commité. Les fichiers de la fiche sont toujours non suivis, comme avant. Je n'ai écrit que sous `.orchestre/travail/` et ce fichier-ci.
