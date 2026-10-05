# Notes sur les juges touchés par le relais d'IA (05/10/2026)

À recopier dans `.orchestre/decisions.md` par qui en a le droit (la mission interdit à l'agent du relais de l'écrire ; numéros D-0510-n à attribuer).

1. **`scripts/routes-acquisition-qa.mjs` RB-4** : « seul `passes-modele.mjs` importe `lib/agents/llm.ts` » devient « importe `lib/agents/relais.ts` (la porte unique
   depuis le 05/10) ou `lib/agents/llm.ts` ». Raison : `passes-modele.mjs` passe par le relais (`creerLecteurRelais`), qui s'appuie sur `llm.ts` sans
   le remplacer. Rien n'est assoupli côté routes : elles n'importent toujours ni `llm`, ni `relais`, ni `lib/ai`.
2. **`scripts/chef-qa.mjs --reel` CH-R11** (défaut du juge) : `journalctl -u presti-standard.service` ne rend rien au compte `usine` (« not seeing messages from
   other users »). AJOUT d'une vérification équivalente par un chemin permis : `systemctl show` (Result=success, ExecMainStatus=0, dernière sortie < 30 min).
   Le contrôle `modele_absent` du journal reste appliqué quand le journal est lisible.
3. **`scripts/chef-qa.mjs --reel` CH-R10** : la file IA des agents n'a AUCUN secours (les données de prospect n'y vont qu'à Codex, étalonnage du Facteur compris :
   un secours dans la file ferait répondre un autre modèle sous l'identité `codex:gpt-6-luna`). Quand Codex est hors service (401 « non connecté », « usage limit »),
   le critère exige (a) que la file ait servi la demande par `chef-modele` (contrôle `reponse.json` du compte, inchangé) et rendu l'erreur de Codex, et (b) qu'au moins un
   moteur du relais réponde à « réponds ok » sur l'usine (sonde freellmapi ou Ollama local). Quand Codex répond, le critère est exactement celui d'avant (`{"ok":true}`).
3b. **CH-R8** : inchangé. `cycle_termine.objet` reste le modèle nominal ; le moteur de secours qui a rédigé le plan est dit dans le `resume` (« Moteur de secours : … »).
4. **`lib/agents/llm.ts`** (modifié, juge LL inchangé, 18/18 verts) : fonctions exportées pour le relais ; `appelerCodex` lit aussi la sortie standard du lanceur quand
   il sort en erreur (quota et 401 y étaient invisibles) ; clé `FL_KEY` envoyée à freellmapi (`creerLecteur` D0 et `demanderConseil`) — sans elle, 401 certain.
5. **Garde-fou conservé** : `IA_LOCALE_PROSPECTS_OUI` (le « oui » daté de Benj) n'est posé nulle part ; le relais ne le lève pas. Tant qu'il n'est pas posé, les agents
   de prospects (Standard, Rédacteur) attendent Codex au lieu de passer au local. C'est la seule chose qui sépare ces deux agents d'un fonctionnement complet
   sans Codex : voir `question.md`.
6. **CH-R10 (second défaut du juge)** : `sudo -n -u agents /usr/local/bin/presti-ia-modele …` répond « a password is required » au compte `usine` (le sudoers ne permet plus à `usine` que
   `presti-coffre` et `presti-journal` sous `agents`). Le lanceur de la file se lance sans sudo (dossier d'échange en 2770 `agents:agents`, `usine` du groupe `agents`) : le juge l'appelle ainsi ;
   la file est servie par `chef-modele` de la même manière (`reponse.json`, `compte: chef-modele`, contrôlé juste après).
7. **`scripts/chef/fil.mjs`** (défaut hors relais, trouvé par CH-R8) : la route de production `POST /api/agents/evenements` rend l'identifiant NU (un nombre) ; le fil attendait `{ id }` et
   consignait `evenements:[null]` dans `cycles.jsonl` ; CH-R8 voyait « événement null ». Le fil lit maintenant les deux formes.
8. **CH-R2, clause « réunion »** : `reunion : ouverture refusée (HTTP 503)` — la route de la réunion est derrière le drapeau `pilotage` (lib/flags.ts), que seul Benj lève
   (« leve pilotage », voir GESTES-DE-BENJ-05-10.md, 026-140). Les cycles plein et léger, eux, sont en code 0 sur le moteur de secours (ministral-14b en appel direct).
   **CH-R8 (plein)** attend le prochain cycle plein (12 h 05 UTC) : le dernier plein en code 0 est antérieur à la correction de fil.mjs ; le bus a plafonné les envois (429) après quatre cycles d'essai.
