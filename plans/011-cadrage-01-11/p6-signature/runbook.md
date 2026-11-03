# Runbook du système d'agents — couper, rejouer, reprendre (prompt 6, lot 036-012)

Écrit le 03/11/2026 sur l'hôte d'agents d'Oracle par Claude Code. **Rien de ce qui suit n'a été exécuté** : ce sont des gestes préparés pour Benj ou pour
la session principale du PC. Toute requête ci-dessous vise **un compte** (`artisan_id = '<compte>'`) : « Supabase account » passe outre la RLS, donc un filtre
oublié touche tous les artisans. Les trois tables citées (`departements_reglages`, `evenements_metier`, `actions_auto`) existent dans les migrations
`0174`, `0185` et `0193`, dont **0185 et 0193 ne sont pas encore collées** (voir `mise-en-service.md`) : avant leur pose, seuls les gestes 1.a, 1.d et 1.e s'appliquent.

Trois principes, dans cet ordre : **couper d'abord** (un geste, sans réfléchir, toujours permis), **comprendre ensuite** (lire le journal), **rejouer ou reprendre**
à la fin, jamais l'inverse. Un agent ne coupe pas de lui-même un compte d'un autre : il alerte.

## 1. Couper

| # | Ce qu'on coupe | Geste | Qui | Effet | Se défait par |
|---|---|---|---|---|---|
| 1.a | **Tout le système d'agents, pour tous** | baisser le drapeau `systemeAgents` dans `lib/flags.ts` (et `connexions` pour le bouton « Connecter »), pousser | session principale, après accord | l'écran, les routes et les nouvelles écritures disparaissent (échec fermé) | relever le drapeau (une migration collée d'abord) |
| 1.b | **Un compte, tous les départements** (interrupteur général) | ligne `departement = 'tous'` de `departements_reglages` : `palier = 'arret'`, `en_marche = false` | l'artisan (toujours permis) ou Presti | les chefs relisent l'interrupteur **juste avant l'effet** (`lib-executer`) : rien ne part, même un événement déjà pris | `palier = 'simulation'` (l'artisan) ; `'ombre'` ou `'reel'` seulement par Presti (acteur fondateur, trigger de 0193) |
| 1.c | **Un département d'un compte** | même table, `departement = 'accueil' / 'devis' / 'suivi' / 'facturation' / 'apres' / 'operations' / 'direction'` | idem | le palier effectif est **le plus prudent** de celui du département et de celui de « tous » | idem |
| 1.d | **Le pilote automatique d'un compte** (les envois qui partent seuls après 10 min) | écran des réglages du pilote, ou `pilote_reglages.actif = false` | l'artisan | « couper le pilote annule toute la file d'un coup » (`lib/pilote/regles.ts`, en-tête) ; chaque envoi relit les réglages juste avant | le rallumer |
| 1.e | **Tout ce qui sort de Presti** (pause générale) | `ops_interrupteur` (relue par `sortiePermise()`) | Benj, depuis `/controle` | chaque route d'envoi relit la pause ; n8n **ne sait pas la lire** (`0097_ops_identite.sql:314`, fonction réservée au rôle de service) : les chefs exigent `config.pause_generale === false`, seule valeur exacte qui ouvre | la remettre |
| 1.f | **Un workflow n8n** | le désactiver (dépublier) dans n8n | Benj (un agent ne publie ni ne dépublie) | le workflow ne se déclenche plus ; les enfants restent appelables par leurs parents | le republier : **enfants avant parents** |
| 1.g | **Une connexion** (Gmail, Agenda…) | le bouton « Retirer » de l'écran « Connexions » | l'artisan | le jeton chiffré est effacé ; le département concerné se tait | « Connecter » à nouveau |

Requêtes de 1.b et 1.c (à passer par Benj ou la session principale, jamais par un agent de l'hôte) :

```sql
-- Couper tout un compte. La ligne « tous » naît en arrêt ou en simulation (trigger de 0193) : l'arrêt ne se bloque jamais.
insert into public.departements_reglages (artisan_id, departement, palier, en_marche)
values ('<compte>', 'tous', 'arret', false)
on conflict (artisan_id, departement) do update set palier = 'arret', en_marche = false;

-- Couper un seul département du même compte.
update public.departements_reglages set palier = 'arret', en_marche = false
 where artisan_id = '<compte>' and departement = 'suivi';
```

**Après avoir coupé, vérifier** (lecture) : rien n'est en route pour ce compte.

```sql
select type, statut, count(*) from public.actions_auto
 where artisan_id = '<compte>' and statut in ('a_partir', 'en_cours') group by 1, 2;   -- doit être vide, ou annulée au passage suivant
```

## 2. Rejouer — par la clé d'idempotence, jamais par une clé neuve

Une clé identifie **un fait** ; la base refuse le second. Rejouer, c'est redonner le **même** fait à n8n : s'il a déjà produit son effet, la contrainte d'unicité
l'arrête ; sinon il le produit une fois.

| Ce qu'on rejoue | Clé | Contrainte qui empêche le doublon | Source |
|---|---|---|---|
| un événement métier (demande reçue, devis envoyé…) | `evenements_metier.cle` | `unique (artisan_id, cle)` | `0185_automatisation.sql:135` |
| une action du pilote (réponse, relance, envoi) | `actions_auto.cle` | `unique (artisan_id, cle)` | `0174_pilote_automatique.sql` |
| une relance d'impayé | `(facture_id, rang)` et `(artisan_id, destinataire, jour)` | deux contraintes d'unicité | `0159_relances_impayes.sql` |
| un message de la boîte mail | `bm:` + SHA-256 du compte et du `Message-ID` | clé d'événement par compte (036-003) | `.orchestre/preuves/036-003/resume.md` |
| une opportunité ouverte | `opportunites.cle` | index unique partiel `(artisan_id, cle)` | `0185_automatisation.sql:267` |

Procédure, dans cet ordre :

1. **Lire pourquoi ça a échoué** (avant de rejouer, jamais après) :
   ```sql
   select id, type, statut, motif, cle, traite_le from public.actions_auto
    where artisan_id = '<compte>' and statut in ('echec', 'manuel') order by traite_le desc limit 50;
   select id, detecteur, statut, motif_blocage, tentatives from public.opportunites
    where artisan_id = '<compte>' and statut in ('echec', 'bloquee') order by cree_le desc limit 50;
   ```
2. **Corriger la cause** (jeton expiré → l'artisan reconnecte ; interrupteur coupé → le rallumer ; donnée manquante → la compléter). Rejouer sans corriger recrée l'échec.
3. **Un événement non traité** se rejoue en **remettant à vide sa marque `traite_le`** — la seule modification qu'autorise le trigger de 0193 (`0193_systeme_agents.sql:403-407` : « remise à vide pour rejouer un événement, runbook 036-012 ») :
   ```sql
   update public.evenements_metier set traite_le = null
    where artisan_id = '<compte>' and cle = '<clé de l’événement>';       -- un seul fait, jamais un lot sans clé
   ```
   Au passage suivant, la vue `n8n_evenements_a_traiter` le redonne au Cerveau. Un envoi déjà parti ne repart pas : sa clé existe.
4. **Une action du pilote en `echec`** : le pilote la renvoie « en manuel » (`statut = 'manuel'`) ; c'est l'artisan qui la valide d'un clic. On ne la remet pas en `a_partir` à la main.
5. **Un lot entier** : jamais sans filtre de compte ni sans `limit`. Rejouer 20 événements d'un compte, un compte à la fois, en simulation d'abord (palier `simulation`, § 3).
6. **Vérifier qu'il n'y a pas de doublon** : la requête « envois en double » de `kpis-base.md` (§ 9) doit rester à zéro.

Ce qu'on ne fait jamais : fabriquer une clé neuve pour « forcer » ; supprimer la ligne du fait pour qu'il « repasse » ; rejouer un envoi à un client sans avoir lu son statut.

## 3. Reprendre — le disjoncteur se réarme à la main

Un département qui échoue de suite **se tait** plutôt que d'insister : `lib/alertes.ts:388` (« Trois échecs de suite. À faire : lire la cause, puis le reprendre depuis la… »).
La reprise n'est jamais automatique.

**Où en est le disjoncteur, honnêtement (03/11).** `lib-disjoncteur` existe dans n8n, **inactif et en mode A** : il compte les échecs en simulation et son effet réel
« n'est pas branché » (nœud d'arrêt « Hors simulation : non branché », `.orchestre/preuves/035-003/lib-disjoncteur.workflow.json`). Sa table n'existe pas encore. Ce qui
tient aujourd'hui lieu de disjoncteur, et se réarme à la main :

| Panne | Ce qui se passe seul | Réarmement (geste humain) |
|---|---|---|
| Jeton refusé ou expiré (`invalid_grant`) | la connexion passe en `erreur` avec son motif ; **une** alerte part ; le département se tait ; plus rien n'est lu | l'artisan reconnecte depuis « Connexions » → état `active` ; puis § 3.1 |
| Serveur de la boîte injoignable | disjoncteur de la boîte : pas d'alerte, rien lu ce passage (`lib-boite-lire`) | attendre le passage suivant (5 min) ; si ça dure, lire la cause avant de toucher |
| Échecs répétés d'un département | alerte `disjoncteur` | palier du département à `arret` (§ 1.c), cause corrigée, puis § 3.1 |
| Coût IA au-dessus du plafond du jour | `plafond_cout_centimes_jour` de `departements_reglages` : le département s'arrête | relever le plafond, ou attendre le lendemain ; jamais en passant par-dessus |

### 3.1 Remonter les paliers, un cran à la fois

Le palier monte ainsi : `arret` → `simulation` → `ombre` → `reel`. **L'artisan** peut descendre et revenir à `simulation` ; **Presti seul** monte à `ombre` et `reel`
(trigger de `0193` : un acteur fondateur est exigé). Après une panne :

1. repasser en `simulation` ; laisser **un passage complet** tourner et lire le journal (« fait : … » de chaque chef) ;
2. remonter en `ombre` (tout se prépare, rien ne sort ; les cartes sont comparées à ce que l'artisan a réellement fait) — voir `mode-ombre.md` ;
3. remonter en `reel` **un département à la fois**, Studio d'abord, Signature type par type (`mise-en-service.md`, étape 11).

### 3.2 Ce qui reprend sans doublon

Un département repris relit ses événements non traités (`n8n_evenements_a_traiter`) : ceux déjà traités portent leur marque, ceux qui n'ont pas abouti n'ont pas de clé
d'envoi, donc partent une fois. C'est la propriété que testent le rejeu de `cerveau-accueil-n8n-qa.mjs` (I1) et `p6-transverse-qa.mjs` (T1).

## 4. Si on ne sait pas

Couper (§ 1.b), ne rien rejouer, écrire une question à options dans `.orchestre/en-cours/<id>.question.md`. Aucune panne ne justifie un envoi à la main « pour aller
plus vite » : un client d'artisan qui reçoit un doublon ne l'oublie pas.
