# Registre des agents du bus : qui bat, qui ne bat pas, pourquoi (relevé du 05/10/2026, soir)

Source : `select nom, periode_minutes, battement_le from ops.agents` (projet `gorcdvmueakcncsmrouo`), relue le 05/10 à 16 h 20 UTC.
Règle d'honnêteté : un agent qui ne travaille pas ne bat pas. Un battement ne se pose que par un vrai passage de son travail ;
la commande qui le relit est donnée pour chaque ligne. Le bus compte 38 lignes : 17 agents battent, 8 sont des restes d'essai
(`essai_station_*`) et les 13 lignes ci-dessous n'avaient jamais battu. Comment relire les 13 d'un coup :

```sql
select nom, periode_minutes, battement_le from ops.agents
where nom in ('vigie_meta','moteur_demandes','pont_telegram','qualite_sites','sav','pont','redacteur_site','livreur',
              'experience','systeme','contenu','tresorier','douleurs') order by battement_le nulls first, nom;
```

## Le tableau

| Agent | Rôle | Hôte | Période | État réel (05/10) | Condition de réveil | Preuve |
|---|---|---|---|---|---|---|
| `livreur` | livraison des sites (tour de livraison) | Vercel : `tourLivraison()` appelé par le tic (pg_cron, chaque minute, sous condition « minute multiple de 15 ») et, en filet, par `/api/cron/relances` (08 h UTC) | 15 min | **RÉPARÉ et PROUVÉ (D-0510-M1)** : battement posé le 05/10 à 17:00:12 UTC ; le tour réussissait (`passages_cron.livraison`, `reussi`, 0 erreur) mais `battementLivreur()` ne partait jamais | un tour de livraison sans erreur | cause : `rpc: Rpc = supabaseAdmin.rpc` (voir plus bas) ; relire `battement_le` à la minute 00/15/30/45 qui suit le déploiement |
| `tresorier` | veille de trésorerie (seuil de TVA) | idem (même tour, fin de `tourLivraison`) | 1 440 min | **RÉPARÉ et PROUVÉ (D-0510-M1)**, même cause : battement posé le 05/10 à 17:00:12 UTC | `veilleTresorerie()` rend sans lever | idem |
| `vigie_meta` | vigie de la bibliothèque des pubs Meta (artisans, marques) | pg_cron `acq-vigie-meta` (`10 5-8 * * *`, UTC) → Vercel `/api/cron/vigie-meta` | 1 440 min | **EN ATTENTE du premier passage planifié** : le job a été créé le 05/10 vers 09 h 50 UTC, après la fenêtre 05 h 10-08 h 10 du jour (`cron.job_run_details` : aucun passage du job 52 ; `passages_cron` : aucune ligne `acq-vigie-meta`). Le jeton Meta est en base (`acq_jeton_meta()` rend 1 ligne, jeton non nul) et son échéance est lue (événement `jeton_echeance`) | **06/10 à 05 h 10 UTC** (07 h 10 à Paris). La route bat après `enregistrerPassage(..., true)`. Elle ne bat pas, par conception, si Meta répond `jeton_invalide` (code 190) ou `en_attente_identite` (code 1357045, identité du compte non confirmée) : réponse 500 et alerte « Jeton Meta à renouveler » | `select battement_le from ops.agents where nom='vigie_meta'` après 05 h 11 UTC le 06/10. Réserve non levée : les conditions de l'API `ads_archive` restent « non lisibles » (`meta-ads-archive-conditions.md`, verdict REFUSE : la vigie compte sans rien préparer) |
| `moteur_demandes` | moteur des demandes de Benj | un autre agent écrit son lanceur | 5 min | non touché ici ; jeton en base, jamais battu | le lanceur en cours d'écriture | `ops.agents` |
| `pont_telegram` | pont Telegram (sécurité) | idem | 5 min | non touché ici ; **pas de jeton en base** (`jeton_hash` nul) | idem | `ops.agents` |
| `qualite_sites` | contrôleur qualité des sites | idem (`presti-qualite.timer` n'est pas installé sur l'usine : `systemctl list-timers` du 05/10) | 1 440 min | non touché ici ; jeton en base | idem | `ops.agents` |
| `sav` | SAV des clients déjà payants | idem (`presti-sav.timer` non installé) | 15 min | non touché ici ; jeton en base | idem | `ops.agents` |
| `pont` | range les tâches de code du bus en propositions pour Claude Code | `presti-pont.timer` : écrit mais **volontairement non installé** | 10 080 min | **EN ATTENTE LÉGITIME** : ni jeton en base, ni `PRESTI_JETON_PONT` dans la liste fermée du coffre, aucun groupe dans `usine-agents.mjs` ; le preneur (`preneur`, 0127) prend déjà les tâches libres, et `docs/agents/preneur-libre.md` §5 interdit d'installer le pont tant que ses capacités recouvrent celles du preneur ; `pont-orchestre.mjs` lit mal `taches/prendre` (tableau) et `evenements` (nombre) | décision du chef : retirer au pont ses capacités libres, corriger `pont-orchestre.mjs`, ajouter le nom au coffre, poser un jeton, installer le minuteur | `ops.taches` : 0 tâche de code en file |
| `redacteur_site` | rédaction des textes de site (lecteur d'IA, Codex) appelé par l'atelier des maquettes et la génération des sites | aucun processus propre : un rôle du relais d'IA (`creerLecteur('redacteur_site')`) | 10 080 min | **EN ATTENTE LÉGITIME** : aucune commande de site (`sites_commandes` : 0 ligne) ; et **aucun code ne le bat, même quand il travaillera** (pas de jeton, aucun `ops_battement`) | une commande de site payée, ET une décision de conception : un jeton + un battement après une lecture réussie (ou retirer l'identité du bus) | `select count(*) from sites_commandes` |
| `experience` | expériences isolées (essais mesurés) | aucun processus : `scripts/chef/lancer-experience.mjs` à la main du chef, `station-experiences-echues-arreter` (pg_cron, 03 h 17) ne fait qu'arrêter les expériences échues | 480 min | **EN ATTENTE LÉGITIME** : inactive tant qu'aucune expérience n'est approuvée ; aucune ne rouvre le froid avant le 12/10 (`lancement-experience.md`) | un accord de Benj (`accord_benj { id, objectif, date }`) puis un lancement réel | `ops.evenements` : type `experience_lancee` |
| `systeme` | identité de la « plomberie SQL » : les fonctions `ops_*` écrivent leurs événements sous ce nom | aucun processus : fonctions Postgres (horloge, baux, décisions) | 10 080 min | **PAS UN PROCESSUS, par conception** : le Veilleur l'exclut des silences (`['a0','systeme','usine']`) ; l'horloge a ses propres preuves (`select public.ops_horloge_etat(60)` : 60 exécutions réussies sur 60 le 05/10) ; lui faire battre n'aurait pas de passage propre à attester | à décider par le chef : soit le Veilleur bat `systeme` quand `ops_horloge_etat` est sain (un vrai constat), soit l'écran dit « identité sans processus » | `select public.ops_horloge_etat(60)` |
| `contenu` | fabrique de vidéos pour les réseaux (idée, script, rendu, dépôt privé) | usine : `scripts/contenu/fabriquer.mjs` sous `PRESTI_JETON_CONTENU`, **aucun minuteur, aucun appelant** | 1 440 min | **EN ATTENTE LÉGITIME** : aucune entrée (idée + ligne éditoriale) à fabriquer ; pas de jeton en base ; `PRESTI_JETON_CONTENU` hors liste fermée du coffre. Le battement existe déjà dans le script, après un dépôt réel (étape 5) | une entrée `{ entree, ligne, ideesConnues }` ET le jeton de `contenu` | `ops.evenements` : dépôt dans le bucket privé `contenu` |
| `douleurs` | veille mensuelle des douleurs (Observatoire) | usine : `presti-douleurs.timer` (`monthly`), **écrit mais non installé** | 1 440 min en base (44 640 selon `douleurs-mensuelles.md`, à aligner) | **EN ATTENTE LÉGITIME** : `docs/agents/douleurs-mensuelles.md` demande le « oui » de Benj au minuteur ; pas de jeton en base ; `PRESTI_JETON_DOULEURS` hors liste fermée du coffre ; le collecteur de sources n'existe pas (la passe rendrait « rien de mesuré », vrai mais creux) | « oui » de Benj, nom ajouté au coffre, jeton posé, `installer` le groupe (à créer dans `usine-agents.mjs`) ; la passe bat même sur un mois vide | `.orchestre/travail/douleurs/rapport-AAAA-MM.md` |

## La cause du livreur et du trésorier (réparée)

`lib/siteLivraisonBus.ts` déclarait quatre fonctions avec le défaut `rpc: Rpc = supabaseAdmin.rpc`. Dans supabase-js 2.112,
`rpc()` lit `this.rest` : passée nue, la fonction perd son `this` et **lève un TypeError à chaque appel**. Les quatre fonctions
avalaient cette exception :

- `battementLivreur()` et `battementTresorier()` : `catch { /* Le veilleur constatera le silence */ }` : aucun battement, jamais
  (mais comme le Veilleur ignore un agent sans battement, personne ne le constatait) ;
- `busEnPause()` : `catch { return true }` : la pause générale était lue « vraie » en production, quel que soit l'interrupteur
  (`ops_interrupteur('pause_generale')` rend `false`) ; `tourLivraison()` sautait donc la génération distante, la sortie de
  l'usine, les retards, les retraits et Search Console ;
- `cloreTacheLivraison()` : rendait `erreur`, comptée dans `bilan.erreurs`, ce qui aurait aussi supprimé le battement du livreur
  dès la première commande livrée.

Aucun juge ne le voyait : les doublures de `bus-livraison-qa.mjs` fournissent des fonctions fléchées, qui ne perdent rien.
Correction : le défaut passe par `rpcAdmin`, qui appelle `supabaseAdmin.rpc(...)` en gardant son `this`. Garde-fou ajouté au juge :
critère **BL-10** de `scripts/bus-livraison-qa.mjs` (aucune référence nue à `supabaseAdmin.rpc` ni `.from` dans `lib/` et `app/`,
hors `typeof`) ; la version d'avant en comptait 4, la nouvelle 0. Au 05/10 : 0 commande, 0 tâche `livrer_site` : la correction
ne change aucun comportement visible chez un client, elle rend seulement vrais la pause et les battements.

**Preuve réelle (05/10, déploiement `8dfd94d` READY à 16 h 54 UTC)** : au tic de 17 h 00 UTC, `passages_cron.livraison` =
17:00:12.458 (reussi, 0 erreur) et `ops.agents` : `tresorier.battement_le` = 17:00:12.053, `livreur.battement_le` = 17:00:12.402
(avant : `null` depuis la création). Relu par `select nom, battement_le from ops.agents where nom in ('livreur','tresorier')`.

## Les 17 autres (battent déjà)

`a0`, `atelier_maquettes`, `chef`, `crieur` (dernier battement le 04/10 : sa dernière passe a échoué, `passages_cron.crieur`
`reussi=false`, 1 erreur le 05/10 à 05 h UTC, à regarder), `facteur`, `facteur_usine`, `garde`, `juge_faits`, `livreur_usine`,
`preneur`, `recenseur`, `redacteur`, `repondeur`, `standardiste`, `studio`, `usine`, `vigile`. Les huit agents `essai_station_*`
sont des restes d'essais de la station (`periode_minutes` 60, jamais battus, aucun processus) : à retirer par le chef.

## Ce que Benj doit faire, agent par agent

- `livreur`, `tresorier` : rien. Se vérifie seul au prochain passage du tic.
- `vigie_meta` : rien avant le 06/10 à 07 h 10 (Paris). Si l'alerte « Jeton Meta à renouveler » arrive, le compte Meta demande
  la confirmation d'identité de l'API Bibliothèque des publicités (code 1357045) ou le jeton a été refusé : c'est son geste.
- `moteur_demandes`, `pont_telegram`, `qualite_sites`, `sav` : rien ici ; un autre agent écrit leurs lanceurs.
- `pont`, `redacteur_site`, `systeme`, `experience`, `contenu` : rien de lui ; ce sont des décisions de conception du chef.
- `douleurs` : dire « oui » au minuteur mensuel ; sans collecteur de sources, la première passe dira « rien de mesuré ».
