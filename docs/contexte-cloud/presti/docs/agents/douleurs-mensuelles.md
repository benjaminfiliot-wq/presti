# La veille des douleurs : passe mensuelle

Fiche 026-226. Code : `scripts/chef/douleurs.mjs` (`passeMensuelle`). Juge : `node scripts/juges-026-completude-qa.mjs --partie=douleurs`. Contrat : `--contrat=douleurs`.

## Qui la tient

L'agent `douleurs` (« Veille des douleurs », semé par la migration 0113, période 44 640 min, plafond 0), titulaire de l'Observatoire à l'écran. Ce n'est pas le Chef : sa panne ne se cache pas dans celle du Chef. Le Chef **lit** le rapport à la réunion et peut ouvrir une fiche de conception après verdict ; il ne lance pas la passe et ne tient pas le jeton de `douleurs`.

## Cadence

Un minuteur propre sur l'usine : `presti-douleurs.timer` (`OnCalendar=monthly`, `Persistent=true`) lance `presti-douleurs.service` (`User=agents`, `avec-coffre.mjs PRESTI_JETON_DOULEURS -- node scripts/chef/douleurs.mjs --une-passe`, aucun `EnvironmentFile=`). Il est distinct du cycle léger, du chantier de 7 h et de la revue hebdomadaire (026-121). La passe traite le mois civil **précédent** (heure de Paris). Un mois non écoulé est refusé sans écriture ; la clé `douleurs-AAAA-MM` est idempotente : une reprise rend `deja: true` sans écrire.

## Ce que la passe fait

1. Lit des sources minimisées `[{ id, type, date, probleme, nombre, gravite, extrait, source }]` (fichier `sources-AAAA-MM.json` du dossier de travail ; absent = mois vide). Une source incomplète ou hors du mois est écartée et listée dans `ecartees`.
2. Regroupe par problème utilisateur. Chaque douleur porte ses `sources` et un `nombre` : la somme, ou « non mesuré » dès qu'une source n'est pas comptée. Une seule source n'est pas une tendance.
3. Fait annoter les extraits par le classeur (`creerLecteur('douleurs')`), seulement après masquage des adresses et téléphones. Le classeur annote (`confiance_classeur`), il ne crée ni ne décide une douleur ; s'il tombe, la passe continue sans lui.
4. Propose trois propositions au plus, chacune avec preuve (ids), hypothèse testable, coût **estimé**, dépendances, garde, prochain petit essai et `validation: ['claude-code']`.
5. Un mois sans source donne « rien de mesuré » : ni douleur ni proposition inventée. C'est une réussite (battement envoyé).

## Règles de Benj tenues

- L'entrée `douleurs` de `MOTEUR_DE` est freellmapi, `personnelles: false` : les extraits de support, de devis ou de réponses de clients n'y vont jamais, même « anonymisés » ; ils se classent en local (Laya, ou Ollama après le « oui » daté de Benj) ou par Codex. Aucune dépense.
- Le rapport ne cite ni prospect réel ni détail de conversation : agrégats et ids seulement.
- Une proposition payante, ou touchant droits et sécurité, passe par Claude Code et par Benj. Le drapeau produit reste éteint tant que la fonctionnalité n'est pas finie.

## Bus

`ops_battement('douleurs')` (POST `/api/agents/battement`) après une passe réussie, mois vide compris ; jamais en pause (HTTP 423 : aucun battement, la passe n'échoue pas). Le jeton `PRESTI_JETON_DOULEURS` vit dans le coffre de l'usine, jamais dans le dépôt.

## Mise en service (gestes restants)

Après le PASS, par Claude Code avec le compte `gardien`, sur « oui » de Benj au minuteur : ajouter `PRESTI_JETON_DOULEURS` à `NOMS_PERMIS` de `scripts/usine/coffre-regles.mjs` (hors périmètre de la fiche), poser le jeton sans l'afficher (voie de 026-050), copier les deux unités, `systemd-analyze verify`, `systemctl enable --now presti-douleurs.timer`. Tant que ce n'est pas fait, le minuteur est **inactif** et rien ne tourne.

## États honnêtes

- Le collecteur qui alimente `sources-AAAA-MM.json` depuis le support, les devis et les alertes réels n'existe pas encore : sans fichier, la passe rend « rien de mesuré » (vrai : rien n'a été mesuré), pas « aucune douleur ».
- Sans le module `lib/agents/llm.ts` chargeable hors de l'application, la passe se fait sans annotation du classeur.
