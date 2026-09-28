# 026-248 — échecs attendus du juge du Vigile (`node scripts/vigile-qa.mjs --preuve-echecs`)

Écrit par le juge le 2026-09-28T15:45:41.528Z (287 s). Code de sortie : 0.

## Écarts de lecture et précisions du contrat (relus avant d'écrire le juge)

- **Formes précisées par le juge** (en tête de `scripts/vigile-qa.mjs`) : les entrées de `construireReleve`, la section non mesurée (cinq clés), les chaînes `source`, les enveloppes du serveur, les éléments d'échéance, l'ordre et les clés des alertes, le tri des déclenchements de pause, `resumerGabarit` et `verifierResume` exportés par `releve.ts` (le gabarit est pur), `executer(options, deps)` et ses options d'essai `delaiModeleMs` et `delaiTlsMs`, une commande `.mjs` lancée par `process.execPath` (faux binaires portables sous Windows), les fichiers de `--travail`.
- **Motif de pause** : le corps posté porte déjà `vigile : <seuil> (<mesure>)` ; la route partagée de 026-129 pose le motif tel quel (préfixe de l'appelant seulement s'il manque) — à reporter dans 026-129.
- **Pause générale active** : le Vigile continue son relevé et ne sort rien d'autre : chaque déclenchement est écarté `deja_en_pause` (la liste fermée des raisons ne change pas).
- **`secret_expose`** se mesure sur les journaux locaux de l'usine et ne dépend pas de `vigile_agents` ; les trois autres seuils attendent 0115 (fonction absente → aucune pause possible sur eux).
- **Lecture « erreurs des 24 h »** : nom fixé ici à `erreurs24h()` de `lib/pilotage/salles/securite` (026-178 ne le nomme pas) ; `cronsDuService()` rend la valeur (`{ nom, dernier, reussi, enRetard }[]`), pas l'enveloppe de `sourcer`.
- **Certificat d'essai** : fabriqué au lancement par `openssl` (CN et SAN `localhost`, plus `IP:127.0.0.1`, 90 jours) sous `.orchestre/travail/`, jamais versionné ; le faux bus l'écoute sur `127.0.0.1`, d'où l'élément `tls:127.0.0.1` (la boucle locale n'est pas une fuite d'adresse pour VG-2).
- **MOTEUR_DE.vigile ollama** : `{ moteur, modele, url }`, l'adresse de la boucle locale dans l'entrée [à vérifier le jour de 026-249 : forme de l'entrée ollama de 026-043].
- **Budget** : 35 fichiers ; le juge, la consigne, les réglages, 27 fichiers de jeux d'essai (dont les 7 du témoin) et les deux preuves.
- **`--reel`** (VG-R1 à VG-R4) est écrit mais ne peut pas être exercé avant 026-251 (code 2 sans usine ni drapeau).
- **Correction du 28/09** (contre-vérification Codex + Claude Code, `correction-28-09.md`) : VG-10 juge les valeurs de `docs/agents/vigile.json` (contrat tant que provisoire ; confirmé = `accord` daté ; Next 15 au 2026-10-21 sourcé, jamais `a_verifier`) et les clauses manquantes de `vigile.md` ; VG-1 et VG-12 jouent des jeux avec le `vigile.json` LIVRÉ ; VG-6 espionne toute connexion TCP et toute écriture de fichier de chaque passage, et interdit `node:http`, `node:https`, `node:http2`, `node:dgram` et les sockets nettes dans le source ; faux npm nominal à 10 s. Les sabotages de `docs/agents/vigile.json` s'écrivent par chemins JSON (`json`).
- **Correction du 28/09, 2e passage** (`contre-verif-28-09.md`, D1 à D3) : une phrase de `vigile.md` qui touche un sujet du contrat (secret, vert non mesuré, pause et levée, cibles interdites, IA ou modèle, écriture ou envoi) doit appartenir à la liste fermée `PHRASES_PERMISES` du juge (une négation dans la phrase ne suffit plus), et depuis la 3e relecture le texte entier est fermé (une phrase contraire sans aucun mot des sujets, « il coupe tous les agents », rougit aussi) ; aucune date de vérification, de lecture ni d'accord de `vigile.json` après le jour du passage ; la source de Next 15 se limite à `https://endoflife.date/nextjs` et `https://nextjs.org/support-policy`. **Contrat précisé pour 026-249** : un `registre_verifie_le` daté dans le futur vaut « registre périmé » (orange), comme un registre relu il y a plus de `registre_perime_jours` ; les jeux `livre_registre_*` le jouent avec le `vigile.json` livré (horloge relative au registre, éléments ôtés).

## 1. L'arbre courant (critère attendu en échec : VG-1)

Premier échec : **VG-1** ✓ ; VG-10 vert ✓.

Extrait réel :

```
FAIL VG-1 — lib/vigile/releve.ts absent : le module du relevé n'existe pas (construireReleve introuvable)
```

| critère | verdict |
| --- | --- |
| VG-1 | FAIL VG-1 — lib/vigile/releve.ts absent : le module du relevé n'existe pas (construireReleve introuvable) |
| VG-2 | FAIL VG-2 — non jugé : lib/vigile/releve.ts absent (VG-1) ; non jugé sur la chaîne : scripts/vigile/releve.mjs absent |
| VG-3 | FAIL VG-3 — lib/vigile/releve.ts, lib/vigile/serveur.ts, lib/vigile/sources.ts, app/api/agents/vigile/route.ts absent(s) : la route n'est pas jugeable |
| VG-4 | FAIL VG-4 — lib/vigile/releve.ts absent ; lib/vigile/serveur.ts absent ; lib/vigile/sources.ts absent ; app/api/agents/vigile/route.ts absent |
| VG-5 | FAIL VG-5 — scripts/vigile/releve.mjs, lib/vigile/releve.ts absent(s) : la chaîne de l'usine n'est pas jugeable |
| VG-6 | FAIL VG-6 — scripts/vigile/releve.mjs, lib/vigile/releve.ts absent(s) : la chaîne de l'usine n'est pas jugeable |
| VG-7 | FAIL VG-7 — lib/vigile/releve.ts absent : pas de gabarit ni de vérification à juger |
| VG-8 | FAIL VG-8 — lib/vigile/releve.ts absent : pas de gabarit ni de vérification à juger |
| VG-9 | FAIL VG-9 — scripts/usine/systemd/presti-vigile.service absent ; scripts/usine/systemd/presti-vigile.timer absent |
| VG-10 | PASS VG-10 — vigile.md (80 lignes au plus, 17 clauses dont la remontée à Matt et à Benj et le défaut de qualité signalé, 2 règles mot pour mot (jamai… |
| VG-11 | SAUTE VG-11 — jugé seulement sur l'arbre réel sans --partie (typecheck, verrou, git status) |
| VG-12 | FAIL VG-12 — lib/vigile/releve.ts absent : aucune pause à juger |
| VG-13 | FAIL VG-13 — lib/vigile/releve.ts absent : aucune pause à juger |
| VG-14 | FAIL VG-14 — lib/vigile/releve.ts absent : aucune pause à juger |

## 2. Le témoin : 14/14 verts

| critère | verdict |
| --- | --- |
| VG-1 | PASS VG-1 — 8 relevés égaux clé par clé à leur attendu (vide, bus injoignable, nominal, critical rouge et Next 15 le 21/10 rouge, Next 15 le 28/09 or… |
| VG-2 | PASS VG-2 — relevés (38 jeux), réductions du serveur (nominal et saturé : 200 bans), gabarits : ni adresse IPv4/IPv6, ni @, ni « Témoin », ni « ignor… |
| VG-3 | PASS VG-3 — drapeau baissé 404 sans SQL ; sans jeton 401 ; a0 403 hors_perimetre sans lecture ; vigile en pause 423 ; vigile 200 = attendu-serveur.js… |
| VG-4 | PASS VG-4 — sources.ts importe les lectures de @/lib/controle/lectures et de @/lib/pilotage/salles/securite ; aucun .from( ni app_errors, ip_bans, ip… |
| VG-5 | PASS VG-5 — faux bus : GET etat, GET vigile, POST battement, un vigile_releve, un vigile_alerte par alerte rouge, rien d'autre ; relevé écrit = atten… |
| VG-6 | PASS VG-6 — npm : argv exact, dossier --depot, sans shell, environnement PATH/HOME/LANG ; systemctl et coffre : argv exacts, sans sudo ; npm qui dort… |
| VG-7 | PASS VG-7 — gabarits bornés (12 lignes, 1 200 et 200 signes), chaque niveau et « non mesuré », aucun nombre hors du relevé, aucune fuite ; verifierRe… |
| VG-8 | PASS VG-8 — actif faux, sans entrée vigile, freellmapi, ollama :cloud, ollama hors boucle → lecteur jamais créé ni appelé ; codex et ollama local → c… |
| VG-9 | PASS VG-9 — presti-vigile.service et .timer lus par un analyseur INI : exactement le contrat, aucun EnvironmentFile=, ni --maintenant, --npm, --coffr… |
| VG-10 | PASS VG-10 — vigile.md (80 lignes au plus, 17 clauses dont la remontée à Matt et à Benj et le défaut de qualité signalé, 2 règles mot pour mot (jamai… |
| VG-11 | PASS VG-11 — non applicable au témoin |
| VG-12 | PASS VG-12 — 20 jeux purs (25 échecs → une pause, 19 → aucune, chef et pont écartés même si le réglage les omet, les sept cibles écartées avec un rég… |
| VG-13 | PASS VG-13 — aucun { pause: false }, aucune route /api/controle, aucun interrupteur, aucune route hors etat, vigile, battement, evenements, pauses ; … |
| VG-14 | PASS VG-14 — POST pauses { agent, motif } suivi d'un vigile_pause agent:facteur propre ; 403 → pas de vigile_pause, une alerte ; relancé le même jour… |

## 3. Les sabotages du témoin : 89/89 rougissent leur critère

| n | critère | fichier | sabotage | verdict | ligne d'échec |
| --- | --- | --- | --- | --- | --- |
| 1 | VG-1 | `lib/vigile/releve.ts` | section non mesurée rendue vert | rouge ✓ | vide : erreurs non mesurée mais au niveau vert (inconnu attendu) |
| 2 | VG-1 | `lib/vigile/releve.ts` | Next 15 à 20 jours compté vert | rouge ✓ | nominal : 1 écart(s) avec l'attendu fait à la main : .dependances.fins_support[0].niveau : "vert" au lieu de "orange" |
| 3 | VG-1 | `lib/vigile/releve.ts` | échéance à J-7 comptée orange | rouge ✓ | nominal : 3 écart(s) avec l'attendu fait à la main : .echeances.elements[1].niveau : "orange" au lieu de "rouge" ; .alertes : 1 é… |
| 4 | VG-2 | `lib/vigile/releve.ts` | une adresse IP laissée dans les bans | rouge ✓ | serveur nominal : adresse 203.0.113.7 |
| 5 | VG-2 | `lib/vigile/releve.ts` | une raison libre recopiée | rouge ✓ | serveur nominal : adresse 203.0.113.7 |
| 6 | VG-2 | `lib/vigile/releve.ts` | le titre d'un avis recopié | rouge ✓ | relevé nominal : un « @ » |
| 7 | VG-3 | `app/api/agents/vigile/route.ts` | la route ouverte à tout agent | rouge ✓ | a0 : 200, 403 attendu (« {"le":"2026-10-01T04:50:00.000Z","bannissements":{"etat":"mesure","poses_24h":5… ») |
| 8 | VG-3 | `app/api/agents/vigile/route.ts` | la route sans busAgents | rouge ✓ | drapeau_baisse : 200, 404 attendu (« {"le":"2026-10-01T04:50:00.000Z","bannissements":{"etat":"mesure","poses_24h":5… ») |
| 9 | VG-3 | `app/api/agents/vigile/route.ts` | les sources lues avant le refus | rouge ✓ | sans jeton : une source ou une fonction métier est lue |
| 10 | VG-4 | `lib/vigile/sources.ts` | un .from('ip_bans') dans sources.ts | rouge ✓ | lib/vigile/sources.ts : .from( (une requête recopiée au lieu de la lecture partagée) |
| 11 | VG-4 | `lib/vigile/sources.ts` | un rpc hors des deux fonctions permises | rouge ✓ | lib/vigile/sources.ts : rpc('ops_etat') hors des deux fonctions permises |
| 12 | VG-5 | `scripts/vigile/releve.mjs` | deux vigile_releve le même jour | rouge ✓ | relancé le même jour : le faux bus a reçu « GET etat / GET vigile / POST battement / POST evenements:vigile_releve » (GET etat, G… |
| 13 | VG-5 | `scripts/vigile/releve.mjs` | un POST vers /api/agents/taches | rouge ✓ | nominal : le faux bus a reçu « GET etat / GET vigile / POST battement / POST taches / POST evenements:vigile_releve / POST evenem… |
| 14 | VG-5 | `scripts/vigile/releve.mjs` | un 423 suivi d'autres requêtes | rouge ✓ | 423 : 2 requête(s) et code 3 (une seule requête, code 0 attendus) |
| 15 | VG-6 | `scripts/vigile/releve.mjs` | le jeton transmis à npm | rouge ✓ | faux-npm.mjs : le jeton est dans l'environnement de l'enfant |
| 16 | VG-6 | `scripts/vigile/releve.mjs` | npm lancé avec shell: true | rouge ✓ | faux-npm.mjs lancé avec shell: true (false attendu) |
| 17 | VG-6 | `scripts/vigile/releve.mjs` | une lecture de agents.env | rouge ✓ | scripts/vigile/releve.mjs contient « agents.env » |
| 18 | VG-6 | `scripts/vigile/releve.mjs` | npm jamais tué au délai | rouge ✓ | npm qui dort : processus toujours vivant après le passage (pid 6336) |
| 19 | VG-7 | `lib/vigile/releve.ts` | un nombre inventé accepté | rouge ✓ | verifierResume(nombre-invente) sur vide : null (nombre attendu) |
| 20 | VG-7 | `lib/vigile/releve.ts` | le gabarit sans « non mesuré » | rouge ✓ | gabarit vide : la ligne de erreurs ne dit pas « non mesuré » |
| 21 | VG-7 | `scripts/vigile/releve.mjs` | le lecteur créé sans délai | rouge ✓ | creerLecteur("vigile", {}) : 'vigile' et un délai de 60 s au plus attendus |
| 22 | VG-8 | `scripts/vigile/releve.mjs` | un lecteur freellmapi appelé | rouge ✓ | freellmapi : le lecteur est appelé (jamais attendu) |
| 23 | VG-8 | `scripts/vigile/releve.mjs` | un modèle :cloud accepté | rouge ✓ | ollama_cloud : le lecteur est appelé (jamais attendu) |
| 24 | VG-8 | `scripts/vigile/releve.mjs` | le réglage actif ignoré | rouge ✓ | inactif_codex : le lecteur est appelé (jamais attendu) |
| 25 | VG-9 | `scripts/usine/systemd/presti-vigile.service` | une unité avec EnvironmentFile= | rouge ✓ | service : EnvironmentFile= (le coffre entier chargé) |
| 26 | VG-9 | `scripts/usine/systemd/presti-vigile.service` | --maintenant dans ExecStart | rouge ✓ | service : ExecStart=/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_VIGILE -- /usr/bin/nod… manque |
| 27 | VG-12 | `lib/vigile/releve.ts` | une pause sous le seuil | rouge ✓ | pause_un_a_25 : pauses[0].seuil : "secret_expose" au lieu de "boucle_erreurs" ; pauses[0].mesure : 0 au lieu de 25 ; pauses_ecart… |
| 28 | VG-12 | `lib/vigile/releve.ts` | une pause sur un seul niveau rouge du relevé | rouge ✓ | pause_sous_seuil : pauses : 1 élément(s) au lieu de 0 ([{"agent":"facteur","seuil":"qualite","mesure":1}]) ; alertes de pause pau… |
| 29 | VG-12 | `lib/vigile/releve.ts` | deux agents pour un seul déclenchement | rouge ✓ | pause_deux : pauses : 2 élément(s) au lieu de 1 ([{"agent":"standardiste","seuil":"boucle_erreurs","mesure":22},{"agent":"facteur… |
| 30 | VG-12 | `lib/vigile/releve.ts` | chef mis en pause (retiré de la liste en dur) | rouge ✓ | CIBLES_INTERDITES de releve.ts : ["pont","pont_telegram","systeme","a0","usine","vigile"] (exactement chef, pont, pont_telegram, … |
| 31 | VG-12 | `lib/vigile/releve.ts` | la liste en dur ignorée (le réglage seul) | rouge ✓ | pause_cibles_omises : pauses : 1 élément(s) au lieu de 0 ([{"agent":"chef","seuil":"boucle_erreurs","mesure":40}]) ; pauses_ecart… |
| 32 | VG-2 | `lib/vigile/releve.ts` | une adresse IPv6 compressée laissée dans les contextes | rouge ✓ | serveur nominal : adresse 2001:db8:abcd::42 |
| 33 | VG-13 | `scripts/vigile/releve.mjs` | une pause levée par { pause: false } | rouge ✓ | scripts/vigile/releve.mjs contient pause: false |
| 34 | VG-13 | `scripts/vigile/releve.mjs` | la pause générale posée | rouge ✓ | scripts/vigile/releve.mjs contient /api/controle/ |
| 35 | VG-13 | `scripts/vigile/releve.mjs` | une pause posée par une autre route que la route partagée | rouge ✓ | pause_posee : POST /api/agents/agent-pause hors des routes permises |
| 36 | VG-14 | `scripts/vigile/releve.mjs` | une pause sans vigile_pause | rouge ✓ | pause posée : le POST pauses n'est pas suivi d'un vigile_pause objet agent:facteur () |
| 37 | VG-14 | `scripts/vigile/releve.mjs` | un vigile_pause malgré le refus de la route | rouge ✓ | route qui refuse (403) : un vigile_pause est posté quand même |
| 38 | VG-14 | `scripts/vigile/releve.mjs` | une pause reposée le même jour | rouge ✓ | relancé le même jour : 1 POST pauses de plus sur facteur |
| 39 | VG-6 | `scripts/vigile/releve.mjs` | une requête https vers un autre hôte que --base (import dynamique, invisible au contrôle statique) | rouge ✓ | nominal : connexion hors de l'hôte de --base (127.0.0.1) : 127.0.0.2:9 |
| 40 | VG-6 | `scripts/vigile/releve.mjs` | node:https importé dans le script | rouge ✓ | scripts/vigile/releve.mjs importe node:https (HTTP par fetch vers la base seulement) |
| 41 | VG-6 | `scripts/vigile/releve.mjs` | une écriture dans le dossier temporaire du système, effacée aussitôt (hors de --travail, hors des instantanés) | rouge ✓ | nominal : écriture hors de --travail : writeFileSync C:/Users/benja/AppData/Local/Temp/vigile-qa-sabotage-20420.txt, rmSync C:/Us… |
| 42 | VG-6 | `scripts/vigile/releve.mjs` | une écriture à côté de --travail, dans un dossier que les instantanés ne couvrent pas | rouge ✓ | nominal : écriture hors de --travail : writeFileSync C:/Users/benja/Documents/presti/.orchestre/travail/vigile-qa/bacs/9dd795aa/n… |
| 43 | VG-10 | `docs/agents/vigile.json` | vigile.json : secret_expose à 0 (une pause sans aucun secret) | rouge ✓ | vigile.json : seuil de pause secret_expose = 0, provisoire, au lieu de 1 (la valeur du contrat tant que Benj n'a pas dit oui) |
| 44 | VG-10 | `docs/agents/vigile.json` | vigile.json : erreurs_rouge à 100000 | rouge ✓ | vigile.json : seuil erreurs_rouge = 100000, provisoire, au lieu de 100 (la valeur du contrat tant que Benj n'a pas dit oui) |
| 45 | VG-10 | `docs/agents/vigile.json` | vigile.json : echeance_rouge_jours négatif | rouge ✓ | vigile.json : seuil echeance_rouge_jours = -3, provisoire, au lieu de 7 (la valeur du contrat tant que Benj n'a pas dit oui) |
| 46 | VG-10 | `docs/agents/vigile.json` | vigile.json : Next 15 passé à a_verifier, sans date ni source | rouge ✓ | vigile.json : next 15 {"paquet":"next","majeure":15,"a_verifier":true} (fin_support "2026-10-21", source https://, lu_le ; jamais… |
| 47 | VG-10 | `docs/agents/vigile.json` | vigile.json : echecs_1h à 1000, provisoire: false sans accord de Benj | rouge ✓ | vigile.json : seuil de pause echecs_1h confirmé (provisoire: false) sans accord: "AAAA-MM-JJ" (la date du oui de Benj) |
| 48 | VG-10 | `docs/agents/vigile.json` | vigile.json : fin_support_orange_jours à 3 | rouge ✓ | vigile.json : seuil fin_support_orange_jours = 3, provisoire, au lieu de 30 (la valeur du contrat tant que Benj n'a pas dit oui) |
| 49 | VG-10 | `docs/agents/vigile.md` | vigile.md sans la remontée à Matt et à Benj | rouge ✓ | vigile.md ne dit pas « chaque pause remonte à matt et à benj » |
| 50 | VG-10 | `docs/agents/vigile.md` | vigile.md sans les bornes du résumé | rouge ✓ | vigile.md ne donne pas la borne du résumé « 12 lignes » |
| 51 | VG-10 | `docs/agents/vigile.md` | vigile.md : commande de reprise sans --base | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « node --experimental-strip-types --import .… |
| 52 | VG-1 | `docs/agents/vigile.json` | vigile.json livré : erreurs_rouge à 100000 (100 erreurs restent orange) | rouge ✓ | livre_seuils_hauts (vigile.json livré) : erreurs.niveau = "orange" au lieu de "rouge" |
| 53 | VG-1 | `docs/agents/vigile.json` | vigile.json livré : Next 15 passé à a_verifier (fin de support inconnue) | rouge ✓ | livre_seuils_bas (vigile.json livré) : dependances.fins_support[paquet=next].fin_support = null au lieu de "2026-10-21" ; dependa… |
| 54 | VG-1 | `docs/agents/vigile.json` | vigile.json livré : echeance_rouge_jours négatif (J-7 n'est plus rouge) | rouge ✓ | livre_seuils_hauts (vigile.json livré) : echeances.elements[nom=jeton_externe:veilleur].niveau = "orange" au lieu de "rouge" ; ec… |
| 55 | VG-12 | `docs/agents/vigile.json` | vigile.json livré : secret_expose à 0 (pause sans secret) | rouge ✓ | livre_pause_echecs_20 : pauses[0].seuil : "secret_expose" au lieu de "boucle_erreurs" ; pauses[0].mesure : 0 au lieu de 20 |
| 56 | VG-12 | `docs/agents/vigile.json` | vigile.json livré : echecs_1h à 1000, provisoire: false (20 échecs sans pause) | rouge ✓ | livre_pause_echecs_20 : pauses : 0 élément(s) au lieu de 1 ([]) ; alertes de pause aucune (pause:facteur attendue) |
| 57 | VG-12 | `docs/agents/vigile.json` | vigile.json livré : max_par_passage à 2 (deux pauses d'un coup) | rouge ✓ | livre_pause_deux : pauses : 2 élément(s) au lieu de 1 ([{"agent":"facteur","seuil":"boucle_erreurs","mesure":25},{"agent":"standa… |
| 58 | VG-10 | `docs/agents/vigile.md` | vigile.md : le niveau global peut rester vert avec une section non mesurée (revue Codex n°2) | rouge ✓ | vigile.md ne dit pas la règle « le niveau global n'est jamais vert tant qu'une section l'est » |
| 59 | VG-10 | `docs/agents/vigile.md` | vigile.md : une phrase contraire ajoutée, la règle gardée (vert malgré une section non mesurée) | rouge ✓ | vigile.md : phrase hors de la liste fermée (vert malgré une section non mesurée) : « Par exception, une section non mesurée peut … |
| 60 | VG-10 | `docs/agents/vigile.md` | vigile.md autorise la lecture de agents.env et des fichiers de clé (revue Codex n°5) | rouge ✓ | vigile.md ne dit pas la règle « il ne lit ni agents.env, ni .env.local, ni presti-secrets, ni aucun fichier de clé » |
| 61 | VG-10 | `docs/agents/vigile.md` | vigile.md : une lecture de agents.env ajoutée, l'interdit gardé | rouge ✓ | vigile.md : phrase hors de la liste fermée (secret ou fichier de secret) : « Au besoin, il lit `agents.env` pour vérifier une dat… |
| 62 | VG-10 | `docs/agents/vigile.md` | vigile.md : le Vigile peut lever une pause | rouge ✓ | vigile.md : phrase hors de la liste fermée (pause, levée ou reprise) : « Il peut lever la pause d'un agent qu'il a posée. » |
| 63 | VG-10 | `docs/agents/vigile.md` | vigile.md : le Vigile pose la pause générale en cas de doute | rouge ✓ | vigile.md : phrase hors de la liste fermée (pause, levée ou reprise) : « En cas de doute, il pose la pause générale. » |
| 64 | VG-10 | `docs/agents/vigile.json` | vigile.json : source de Next 15 remplacée par une page inventée (revue Codex n°3) | rouge ✓ | vigile.json : source de la fin de support de Next 15 : exemple.invalid n'est pas une page de référence pour next (endoflife.date,… |
| 65 | VG-10 | `docs/agents/vigile.json` | vigile.json : cron_secret situé dans Vercel au lieu du Vault de Supabase (revue Codex n°4) | rouge ✓ | vigile.json : échéance cron_secret située « Vercel (026-086) » (vault attendu, INDEX) |
| 66 | VG-10 | `docs/agents/vigile.json` | vigile.json : source de TELEGRAM_BOT_TOKEN remplacée par une page inventée | rouge ✓ | vigile.json : source de TELEGRAM_BOT_TOKEN : telegram-faq.invalid n'est pas une page de référence pour TELEGRAM_BOT_TOKEN (telegr… |
| 67 | VG-10 | `docs/agents/vigile.md` | vigile.md : lire agents.env « sans jamais en afficher la valeur » (contre-vérif S1) | rouge ✓ | vigile.md : phrase hors de la liste fermée (secret ou fichier de secret) : « Au besoin, il lit `agents.env` pour vérifier une dat… |
| 68 | VG-10 | `docs/agents/vigile.md` | vigile.md : rester vert malgré une section non mesurée (contre-vérif S2) | rouge ✓ | vigile.md : phrase hors de la liste fermée (vert malgré une section non mesurée) : « Une section non mesurée ne compte pas si les… |
| 69 | VG-10 | `docs/agents/vigile.md` | vigile.md : la pause générale « s'il ne peut pas » poser celle d'un agent (contre-vérif S3) | rouge ✓ | vigile.md : phrase hors de la liste fermée (pause, levée ou reprise) : « S'il ne peut pas poser la pause d'un agent, il pose la p… |
| 70 | VG-10 | `docs/agents/vigile.md` | vigile.md : lever la pause « dès que le seuil n'est plus franchi » (contre-vérif S4) | rouge ✓ | vigile.md : phrase hors de la liste fermée (pause, levée ou reprise) : « Il lève la pause qu'il a posée dès que le seuil n'est pl… |
| 71 | VG-10 | `docs/agents/vigile.md` | vigile.md : freellmapi « si Codex ne répond pas » (contre-vérif S5) | rouge ✓ | vigile.md : phrase hors de la liste fermée (IA ou modèle) : « Si Codex ne répond pas, il passe par freellmapi. » |
| 72 | VG-10 | `docs/agents/vigile.md` | vigile.md : « il n'est pas interdit de poser la pause générale » (revue Codex n°2 du 2e passage) | rouge ✓ | vigile.md : phrase hors de la liste fermée (pause, levée ou reprise) : « Il n'est pas interdit de poser la pause générale si les … |
| 73 | VG-10 | `docs/agents/vigile.json` | vigile.json : registre_verifie_le figé au 2099-01-01 (revue Codex n°4 du 2e passage, contre-vérif S6) | rouge ✓ | vigile.json : registre_verifie_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28) : une date future masquerait pour t… |
| 74 | VG-10 | `docs/agents/vigile.json` | vigile.json : verifie_le de META_PAGE_TOKEN au 2099-01-01 (contre-vérif S8) | rouge ✓ | vigile.json : échéance META_PAGE_TOKEN : verifie_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28) |
| 75 | VG-10 | `docs/agents/vigile.json` | vigile.json : lu_le de Next 15 au 2099-01-01 | rouge ✓ | vigile.json : fin de support "next" : lu_le 2099-01-01 est dans le futur (jour du passage : 2026-09-28) |
| 76 | VG-10 | `docs/agents/vigile.json` | vigile.json : erreurs_rouge « confirmé » par un accord daté du 2099-01-01 | rouge ✓ | vigile.json : seuil erreurs_rouge : accord 2099-01-01 est dans le futur (jour du passage : 2026-09-28) |
| 77 | VG-10 | `docs/agents/vigile.json` | vigile.json : pause_securite.accord au 2099-01-01 | rouge ✓ | vigile.json : pause_securite.accord 2099-01-01 est dans le futur (jour du passage : 2026-09-28) (null, ou la date du oui de Benj) |
| 78 | VG-10 | `docs/agents/vigile.json` | vigile.json : source de Next 15 = la page d'installation de nextjs.org, sans date de fin (revue Codex n°3 du 2e passage, contre-vérif S7) | rouge ✓ | vigile.json : source de la fin de support de Next 15 : https://nextjs.org/docs/app/getting-started/installation n'est ni https://… |
| 79 | VG-10 | `docs/agents/vigile.json` | vigile.json : source de Next 15 = une page de vercel.com | rouge ✓ | vigile.json : source de la fin de support de Next 15 : vercel.com n'est pas une page de référence pour next (endoflife.date, next… |
| 80 | VG-10 | `docs/agents/vigile.json` | vigile.json : source de Next 15 = les versions du dépôt vercel/next.js | rouge ✓ | vigile.json : source de la fin de support de Next 15 : github.com n'est pas une page de référence pour next (endoflife.date, next… |
| 81 | VG-1 | `docs/agents/vigile.json` | vigile.json livré : registre_perime_jours à 900 (un registre de 91 jours reste vert) | rouge ✓ | livre_registre_91 (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange" |
| 82 | VG-1 | `lib/vigile/releve.ts` | relevé : un registre daté dans le futur compté frais (la péremption masquée pour toujours) | rouge ✓ | livre_registre_futur (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange" |
| 83 | VG-1 | `lib/vigile/releve.ts` | relevé : la péremption du registre ignorée dans le niveau des échéances | rouge ✓ | livre_registre_91 (vigile.json livré) : echeances.niveau = "vert" au lieu de "orange" |
| 84 | VG-10 | `docs/agents/vigile.md` | vigile.md : « en cas de doute, il coupe tous les agents » (aucun mot des sujets : passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « En cas de doute, il coupe tous les agents.… |
| 85 | VG-10 | `docs/agents/vigile.md` | vigile.md : « il peut débloquer un agent qu'il a bloqué » (passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « Il peut débloquer un agent qu'il a bloqué.… |
| 86 | VG-10 | `docs/agents/vigile.md` | vigile.md : résumé par Claude Haiku (passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « Il résume avec Claude Haiku quand le gabar… |
| 87 | VG-10 | `docs/agents/vigile.md` | vigile.md : « il lit le token Meta » (passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « Il lit le token Meta pour connaître sa dat… |
| 88 | VG-10 | `docs/agents/vigile.md` | vigile.md : « il publie le relevé complet sur Telegram » (passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « Il publie le relevé complet sur Telegram. » |
| 89 | VG-10 | `docs/agents/vigile.md` | vigile.md : une option ajoutée à la commande de reprise (--tout-couper ; passait avant la fermeture du texte entier) | rouge ✓ | vigile.md : phrase hors de la liste fermée (hors des sujets reconnus, texte fermé) : « --travail=.orchestre/travail/vigile --tout… |

Chaque critère de VG-1 à VG-10 et de VG-12 à VG-14 a au moins un sabotage qui le rougit.

## ✓ Preuve complète
