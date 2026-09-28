# 026-232 — contre-vérification du 28/09 (Claude Code, vers 16 h 45-17 h 05)

**Verdict : ROUGE, sur le juge, pour un défaut majeur mais latent. La production de l'outil est bien gardée.**

- **Le verifier est vert, et c'est confirmé de façon indépendante.** Sur l'usine, le témoin de Codex (passage n°0) a relancé `--preuve-echecs` sur l'arbre actuel : code 0 en 309 s, (a), (b) et (c) conformes. Les preuves de la fiche (`verifier.log`, `echecs-attendus.md`, 14 h 32 UTC) sont plus récentes que tous les fichiers du juge et des fixtures.
- **Mes 8 sabotages de la production rougissent tous le bon critère.** Six visent la production, deux visent la correction du 28/09. Chaque fichier a été restauré octet pour octet. Le témoin restauré repasse au vert sur les deux parties.
- **Le défaut.** La partie `cli` ne juge ni les compteurs du jour ni la réserve de crédits. Elle ne juge d'ailleurs aucun passage web de la ligne de commande. Un `chercher.mjs` (026-233) qui repart de zéro à chaque appel passe au vert. Les plafonds du jour (Perplexity 5, web 10 par agent, savoir 200) ne tiendraient alors plus d'un appel à l'autre, et la réserve de 1 000 crédits ne baisserait jamais. C'est pourtant par ces plafonds que la règle de Benj « Perplexity jamais en boucle, Firecrawl sous la réserve » s'applique en production.
- **Pourquoi latent.** `recherche_web` et `perplexity` sont éteints aujourd'hui. De plus, le `chercher.mjs` du témoin ne branche aucun transport web : avec `--web`, il rend `indisponible`.
- Trois angles morts mineurs s'y ajoutent (section D).

## A. Le moyen

1. **Codex sur l'usine.** Commande : `node ../presti-ops/usine/revue-codex.mjs 026-232 --sabotages=4 --delai=40` (gpt-6-sol, effort `medium`, abonnement ChatGPT seul, fiche de prospects).
   - **Code 3 : pas jugé.** Raison exacte : « quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM. » Codex a rendu le code 1 en 3 s, et la commande a duré 334 s au total.
   - Il n'y a pas de `verdict.json`. Le relevé du coureur, que Codex ne peut pas modifier (`journal.json`, `runs/0.log`), donne : témoin code 0 en 309 s, T0 = final = `86017733…`, aucune dérive, bac restauré.
   - Un premier lancement, vers 16 h 34, était mort après le montage du bac, sans relevé.
2. **Mes sabotages réversibles de la production.**
   - Ils se font sur une copie du témoin construite exactement comme `preparerTemoin()` : le témoin, plus `index.ts` et `indexer.mjs` du témoin du socle, plus `lectureFirecrawl.ts` et `moteurs.ts` du dépôt. La copie est dans `.orchestre/travail/contre-verif-026-232/temoin`.
   - Pour chaque sabotage : un remplacement unique, puis `node scripts/savoir-recherche-qa.mjs --racine=<copie> --partie=<partie>`, puis la restauration des octets d'origine et le contrôle du sha256.
   - À la fin : le juge sur la copie restaurée, toutes parties.
   - Les empreintes de la copie avant sabotage sont celles des fixtures : `recherche.ts` 857bb7a0…, `chercher.mjs` 10055b44….
3. **Sondes** : cinq sabotages d'angle mort (B1 à B5) et une sonde directe du contrat de `classesPour` sur le témoin non saboté (`sonde-contrat.log`).
4. **Aucun fichier du dépôt n'a été touché par moi.** Les 27 fichiers relevés (juge, fixtures de la recherche, témoin du socle, `moteurs.ts`, `lectureFirecrawl.ts`, fiche, preuves) sont identiques au début et à la fin (`sha-depart.txt` et `sha-fin.txt`), sauf deux fichiers du témoin du **socle** : `scripts/usine/savoir-recevoir.mjs` (16 h 55) et `systemd/presti-chef-savoir-recevoir.service` (16 h 57).
   - Ils ont été modifiés par une autre session. Ils sont hors du périmètre de 026-232, et le juge de 026-232 ne les lit pas.
   - Mes scripts n'écrivent que dans `.orchestre/travail/contre-verif-026-232/`.
   - `lib/savoir/` et `scripts/savoir/` n'existent toujours pas. Rien n'a été commité.

## B. Mes 8 sabotages : 8 rouges au bon critère

| n | critère | fichier (copie) | sabotage | ligne d'échec réelle | sha256 avant → saboté → restauré |
| --- | --- | --- | --- | --- | --- |
| P1 | SVR-5 | `lib/savoir/recherche.ts` | Perplexity appelé même quand Firecrawl a rendu des pages (`if (place())`) | `Perplexity, Firecrawl a rendu des pages : 1 appel(s) reçu(s) (attendu zéro)` | 857bb7a0 → 250854cc → 857bb7a0 ✓ |
| P2 | SVR-4 | `lib/savoir/recherche.ts` | plafond web du jour décalé d'un cran (`>` au lieu de `>=`) | `11e appel web du jour : 4 requête(s) web reçue(s) (attendu aucune)` | 857bb7a0 → 9ac6ea2b → 857bb7a0 ✓ |
| P3 | SVR-8 | `lib/savoir/recherche.ts` | question hors bornes : deux événements | `s2_trop_court : 2 appel(s) à deps.journal (attendu un au plus)` | 857bb7a0 → eada5076 → 857bb7a0 ✓ |
| P4 | SVR-2 | `lib/savoir/recherche.ts` | extrait du savoir non coupé à 600 signes | `extrait de 1010 signes pour Produit/Prospection-Cadre-Legal-2026-09-27.md (600 au plus)` | 857bb7a0 → af2ff40a → 857bb7a0 ✓ |
| P5 | SVR-10 | `scripts/savoir/chercher.mjs` | la question en clair dans `recherches-<jour>.jsonl` | `recherches-<jour>.jsonl : clés [… "question" …] (attendu agent, credits, id, le, n, origines, question_sha256, refus)` | 10055b44 → 7f82e9a5 → 10055b44 ✓ |
| P6 | SVR-10 | `scripts/savoir/chercher.mjs` | un 400 du bus avalé (`if (!r.ok) throw` retiré) | `400 du faux bus : code 0 (attendu 3)` | 10055b44 → 9215bcdc → 10055b44 ✓ |
| C1 | SVR-7 | `lib/savoir/recherche.ts` | **correction du 28/09** : `classesPour` lit `personnelles` avant le moteur | `classesPour(essai_gratuit_perso) = ["public","interne","prospects"] (attendu ["public"] — 28/09 …)`, plus essai_cloud, la sentinelle prospects dans la sortie et la demande au savoir avec trois classes | 857bb7a0 → 018f5962 → 857bb7a0 ✓ |
| C2 | SVR-6 | `lib/savoir/recherche.ts` | **correction du 28/09** : la requête **Perplexity** reçoit la question plus les extraits (S11 ne vise que Firecrawl) | `cas permis : la requête reçue par le faux Perplexity n'est pas exactement la question ("… Note publique faible : un mot sur la réda…")` | 857bb7a0 → 442e8156 → 857bb7a0 ✓ |

- Chaque sabotage rougit son critère. P1 à P6 ne rougissent **que** celui-là.
- C2 rougit aussi SVR-5 (« appels Perplexity reçus … attendu exactement un, la question telle quelle »), ce qui est cohérent.
- C1 rougit aussi SVR-12, par effet de bord du typage strict : le `return` anticipé rend la comparaison suivante impossible (TS2367). SVR-7 le prend indépendamment de ce typage.
- **Témoin restauré, toutes parties : code 0, `savoir-recherche-qa : PASS — tout vert`** (31 s ; relancé après B4 et B5, voir `temoin-final.log`). Les sha256 de la copie à la fin sont égaux à ceux des fixtures.

## C. Le défaut majeur (latent) : la ligne de commande n'est jugée ni sur ses compteurs, ni sur sa réserve, ni sur le web

| sonde | sabotage de `scripts/savoir/chercher.mjs` | partie `cli` | sha256 saboté → restauré |
| --- | --- | --- | --- |
| B4 | `const compteurs = {}` : les compteurs du jour déjà écrits sont ignorés, chaque appel repart de zéro | **VERT**, code 0 | d142070f → 10055b44 ✓ |
| B5 | la réserve `credits-firecrawl.json` n'est plus jamais écrite (`if (false) ecrireAtomique(pCredits, …)`) | **VERT**, code 0 | d221bad4 → 10055b44 ✓ |

**Le contrat.** La fiche (section CLI) et l'en-tête du juge (lignes 89-91) demandent que la ligne de commande :

- charge les compteurs du jour ;
- tienne `compteurs-<jour>.json` ;
- tienne la réserve `credits-firecrawl.json` (`{ consommes }`, restant = `reserve_credits − consommes`), sérialisée par un verrou `O_EXCL`.

**Ce que le juge vérifie.** Aucune ligne ne lit ces fichiers (`grep "credits-firecrawl\|compteurs-"` ne trouve que le commentaire d'en-tête). La partie `cli` ne joue qu'un seul cas `--web` : `nom_web`, refusé pour donnée personnelle avant le transport. De son côté, le témoin `chercher.mjs` ne passe ni `firecrawl` ni `perplexity` à `deps` : son web rend toujours `indisponible` (`transport`).

**La conséquence.** SVR-4 et SVR-5 jugent les plafonds au niveau de l'outil, avec un `deps.compteurs` fourni par le juge. Mais c'est la ligne de commande, un processus par appel sur l'usine, qui doit les faire tenir d'un appel à l'autre. Une 026-233 qui ne persiste rien passe au vert. Une fois `recherche_web` et `perplexity` allumés, les deux règles de Benj ne tiendraient plus en production, et rien ne le verrait : 026-241 `--reel` ne contrôle qu'un événement et l'absence de ligne `web` tant que le web est éteint. Les deux règles sont :

- Perplexity « jamais en boucle » (plafond 5 par jour) ;
- Firecrawl « sur la réserve de départ ».

**Gravité : majeur.** C'est un garde-fou d'une règle de Benj, sans critère, et c'est le seul juge écrit avant la production. Il n'est pas bloquant aujourd'hui, puisque les deux interrupteurs sont éteints et que rien ne fuit.

## D. Angles morts mineurs

| sonde | quoi | verdict | commentaire |
| --- | --- | --- | --- |
| B1 | test `/(:\|-)cloud$/` retiré de `classesPour` | **VERT** (SVR-7) | test mort pour les jeux d'essai : le seul moteur « cloud » des fixtures (`essai_cloud`, moteur `ollama_cloud`) est déjà écarté par `MOTEURS_INTERNE` |
| sonde du contrat | `classesPour` du témoin non saboté sur `{ moteur: 'ollama_local', modele: 'gpt-oss:120b-cloud', personnelles: true }` | rend **`["public","interne","prospects"]`** | `echecs-attendus.md` écrit « `["public"]` pour … **un modèle `:cloud`** », mais le témoin ne teste que `moteur`, jamais `modele`. Risque faible aujourd'hui : `llm.ts` impose un modèle local (`modeleOllamaPour`) à `ollama_local`, et `MOTEUR_DE` n'a que codex et freellmapi. Mais le contrat écrit et le témoin divergent |
| B2 | `'claude'` ajouté à `MOTEURS_PROSPECTS` | **VERT** (SVR-7) | aucun agent Claude `personnelles: true` dans les fixtures ; la décision du 27/09 réserve les prospects à Codex et au local |
| B3 | constat Perplexity daté du futur accepté (`constat > maintenant` retiré) | **VERT** (SVR-5) | aucune `reglages` d'essai au `constate_le` futur ; un tel constat ne se périmerait jamais (même famille que D2 de 026-248) |

Les autres cas de la sonde sont conformes au contrat :

- `claude` avec `personnelles` → `["public","interne"]` ;
- `groq` → `["public"]` ;
- `codex-cloud` → `["public"]`.

## E. Corrections à faire (juge et fixtures de 026-232, avant que 026-233 ne s'y mesure)

1. **Défaut C.**
   - Ajouter à la partie `cli` deux appels successifs du même agent sur la même `--racine-travail`, avec des compteurs pré-remplis. Par exemple `compteurs-<jour>.json` avec `web:chef = 10`, `perplexity = 5` et `savoir:chef = 200`, puis `--web`. Attendu : aucune requête web, et pas de résultat du savoir au-delà du plafond. Exiger aussi que le fichier du jour soit relu et réécrit.
   - Ajouter un faux Firecrawl sur `127.0.0.1` joignable par la ligne de commande (base configurable) pour que `--web` fasse vraiment une recherche. Attendu : `credits-firecrawl.json` passe de `consommes: n` à `n + 5` ; une réserve à 1 crédit donne `ferme (credits)`.
   - Trancher dans la fiche si `chercher.mjs` doit brancher le transport réel (`firecrawlPar`). C'est ce que dit le contrat, mais pas le témoin, qu'il faut alors compléter.
   - Ajouter B4 et B5 à `sabotages.json` (SVR-10 ou un nouveau critère).
2. **B1 et la sonde du contrat.** Tester aussi `modele` dans `classesPour` (`/(:|-)cloud$/` sur `e.modele`). Ajouter l'agent d'essai `essai_local_cloud: { moteur: 'ollama_local', modele: 'gpt-oss:120b-cloud', personnelles: true }` → `["public"]`, puis B1 comme sabotage.
3. **B2.** Ajouter `essai_claude_perso: { moteur: 'claude', personnelles: true }` → `["public","interne"]`, puis B2 comme sabotage.
4. **B3.** Ajouter un réglage `web_perplexity_futur` (`constate_le` après l'horloge d'essai) → zéro appel, puis B3 comme sabotage.
5. Régénérer ensuite `verifier.log` et `echecs-attendus.md` (`node scripts/orchestre.mjs verifier 026-232`), puis refaire relire par Codex quand son quota revient.

## F. Traces

- **Codex :** `.orchestre/travail/revue-codex/026-232/` (`journal.json`, `runs/0.log`, `codex.log`, `consigne.md`, `executer.log`).
- **Mes passages :** `.orchestre/travail/contre-verif-026-232/`. On y trouve :
  - `sabotages-prod.json` et `sabotages-prod.mjs` ;
  - `resultats-lot1.json` (P1 à B3, puis le témoin final) et `resultats-lot2.json` (B4 et B5) ;
  - `sorties.log` (les sorties complètes du juge) et `temoin-final.log` ;
  - `sonde-contrat.mjs` et `sonde-contrat.log` ;
  - `sha-depart.txt` et `sha-fin.txt` ;
  - la copie `temoin/`.
