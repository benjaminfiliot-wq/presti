# Brief — workflow n8n `presti-briefing-matin` (chantier 4, lot L15, voie (a) ; tâche 032-013)

Écrit le 02/11/2026 par Claude Code (serveur Oracle, hôte d'agents). Sources : tâche `.orchestre/en-cours/032-013.md` ; plan du chantier 4
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §0 bis rang 3 (l.60-61), « Règles communes à tout workflow n8n » (l.127-156),
question 2 (l.234), §5 (l.424), §7 section 3 (l.507, l.516-518, l.523-524), rang 22 (l.99-100), rang 23 (l.101-102), §14 ligne 7 (l.840),
§16 B4 (l.891) ; prompt de Benj `prompts-benj/p3-assistant.md` (P3:584 l'argent qui dort d'abord ; P3:587 e-mail si l'artisan le veut ;
P3:593 aucun jargon ; P3:597 une clé unique par action ; P3:570 les données restent sur Oracle ; P3:625) ; règle n8n-first
(`.claude/rules/architecture-outils.md`, ADR-008). Juge hors ligne : `scripts/briefing-n8n-qa.mjs`. Modèle : le lot L3
(`briefs/c4-n8n-detecteurs.md`, son juge `scripts/detecteurs-n8n-qa.mjs`, rendu TIENT par l'audit 032-016).

## Ce que fait le workflow

Chaque matin à 7 h 30 (fuseau du workflow `Europe/Paris`), en **simulation** : il lit, il calcule le point du jour de chaque compte et
ses trois priorités, il se tait pour un compte sans priorité, il rend un bilan agrégé. Il n'écrit rien dans Supabase, n'envoie rien,
n'appelle aucun modèle, ne déclenche jamais le pilote (rang 3 : il propose). Livré **inactif**, jamais publié sans le « go » de Benj.
L'app garde `composerBriefing` (`lib/assistant/briefing.ts:44`) pour l'outil `briefing_du_matin` de l'assistant
(`lib/assistant/executeurs.ts:255-292`), sans changement : aucune ligne de l'app ne bouge dans ce lot.

n8n d'Oracle, id `xPIDCvkp8Gk08A2E`, projet personnel de Benj, 19 nœuds, une seule chaîne :

| # | Nœud | Type | Rôle |
|---|---|---|---|
| 1 | Déclencheur 7 h 30 | Schedule Trigger 1.4 | tous les jours à 7 h 30 ; son `timestamp` est l'instant du passage (jamais `$now`, `$today`, Luxon ni l'horloge du serveur) |
| 2 | Contexte du passage | Code | mode `simulation`, l'instant, le jour de Paris (`Intl.DateTimeFormat`, comme `jourParis`, `lib/comptaTableau.ts:159-160`), les seuils et les limites |
| 3 | Capacités des offres | Code | copie figée de `peut()` (`lib/plans.ts:149`) pour `assistant`, `chiffres`, `inventaire.stock`, `crm` en Studio, Signature, Entreprise |
| 4 | Lire comptes | HTTP GET | `artisans`, filtrés `plan=in.(studio,signature,entreprise)`, `est_demo=is.false`, `suppression_demandee_le=is.null` |
| 5 | Comptes retenus | Code | vérifie chaque ligne (colonnes exactes, identifiant, filtre appliqué) ; rend la liste des comptes et le filtre `in.(…)` (repli `00000000-0000-0000-0000-000000000000`) |
| 6 | Lire demandes | HTTP GET | `leads` des comptes retenus |
| 7 | Paquets de demandes ouvertes | Code | par compte : les 200 plus récentes par `updated_at` (vides en dernier), puis les ouvertes, par paquets de 100 (`executeurs.ts:164-170`) |
| 8 | Lire messages | HTTP GET, un appel par paquet | `messages` du paquet, `etat` vide ou `proposition`, `sent_at` décroissant, 1 000 au plus (`executeurs.ts:170-172`) |
| 9 | Lire devis envoyés | HTTP GET | `devis` des comptes retenus, `statut=eq.envoye` |
| 10 | Lire factures | HTTP GET | `factures` des comptes retenus (tous statuts : les avoirs annulent leur facture) |
| 11 | Lire matériaux suivis | HTTP GET | `materiaux` des comptes retenus, `seuil_alerte=gt.0` (l'alerte exige un seuil positif, `app/api/inventaire/route.ts:68`) |
| 12 | Lire stock | HTTP GET | `stock` des matériaux lus (`materiau_id=in.(…)`) |
| 13 | Contrôle des lectures | Code | colonnes exactes, identifiants lisibles, plafond de pages non atteint : sinon le passage s'arrête |
| 14-17 | Conversations qui attendent · Devis sans réponse · Impayés · Stock sous le seuil | Code | les quatre rubriques, reproduites de la chaîne de l'app (plus bas) |
| 18 | Point du jour par compte | Code | rubriques, urgences, chiffres, trois priorités ; une ligne « à écrire » par compte qui en a, rien pour les autres |
| 19 | Bilan du passage | Code | la seule sortie : un bilan agrégé, sans identifiant de compte |

Chaque lecture : HTTP Request 4.5, GET sur `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/<table>`, identifiant prédéfini `supabaseApi`
« Supabase account » (`dTewDK98MLrNckNG`, ni créé ni modifié), au gabarit de « Lire factures » du lot L3 : requête en paires, `order=id`,
`limit=1000`, pagination `offset = {{ $pageCount * 1000 }}`, fin `{{ !Array.isArray($response.body) || $response.body.length < 1000 }}`,
`limitPagesFetched`, 50 pages au plus, `timeout` 30 s, `executeOnce`, `alwaysOutputData` ; sans corps, sans en-tête, sans autre option.
« Lire messages » a son propre gabarit, celui de l'app : un appel par paquet (pas d'`executeOnce`), sans pagination. Une lecture en erreur
arrête le passage (aucun `onError`) ; une lecture de 50 000 lignes (50 pages pleines) aussi : jamais un point du jour tronqué, jamais
« rien à signaler » sur une source en panne (rang 22).

## Les colonnes permises (et rien d'autre)

Règle (plan §0 bis, « Ce que n8n lit », l.140-151) : des identifiants, des dates, des montants et des statuts ; jamais un nom, une adresse,
un e-mail ni un texte de client. Chaque colonne ci-dessous est citée à la ligne de sa migration, et comprise dans ce que Benj a déjà
accordé au rôle `n8n_lecture` (`0189_role_lecture_n8n.sql:38-46`). `briefing-n8n-qa` relit chaque ligne citée et rougit sur toute
autre colonne, et sur tout nom de colonne qui contient `nom`, `email`, `contact`, `adresse`, `message`, `contenu` ou `texte`.
Le « jamais `messages` » du plan (l.141-142) vise l'impayé arrêté ; ici, `messages` ne donne que des identifiants de demande, des sens, des
états et des dates (0189:42) : jamais `contenu`.

| Table | Colonne | Migration | Accordée par |
|---|---|---|---|
| `artisans` | `id` | `0001_artisans.sql:5` | `0189_role_lecture_n8n.sql:38` |
| `artisans` | `plan` | `0001_artisans.sql:12` | `0189_role_lecture_n8n.sql:38` |
| `artisans` | `est_demo` | `0068_controle.sql:127` | `0189_role_lecture_n8n.sql:38` |
| `artisans` | `suppression_demandee_le` | `0052_parametres.sql:26` | `0189_role_lecture_n8n.sql:38` |
| `leads` | `id` | `0010_hardening.sql:7` | `0189_role_lecture_n8n.sql:41` |
| `leads` | `artisan_id` | `0010_hardening.sql:8` | `0189_role_lecture_n8n.sql:41` |
| `leads` | `statut` | `0010_hardening.sql:10` | `0189_role_lecture_n8n.sql:41` |
| `leads` | `urgence` | `0026_lead_qualif.sql:4` | `0189_role_lecture_n8n.sql:41` |
| `leads` | `lu_le` | `0015_conversation.sql:16` | `0189_role_lecture_n8n.sql:41` |
| `leads` | `updated_at` | `0010_hardening.sql:11` | `0189_role_lecture_n8n.sql:41` |
| `messages` | `lead_id` | `0010_hardening.sql:21` | `0189_role_lecture_n8n.sql:42` |
| `messages` | `sens` | `0010_hardening.sql:22` | `0189_role_lecture_n8n.sql:42` |
| `messages` | `etat` | `0050_pilotage.sql:18` | `0189_role_lecture_n8n.sql:42` |
| `messages` | `sent_at` | `0010_hardening.sql:22` | `0189_role_lecture_n8n.sql:42` |
| `devis` | `id` | `0002_devis.sql:37` | `0189_role_lecture_n8n.sql:40` |
| `devis` | `artisan_id` | `0002_devis.sql:38` | `0189_role_lecture_n8n.sql:40` |
| `devis` | `statut` | `0002_devis.sql:42` | `0189_role_lecture_n8n.sql:40` |
| `devis` | `total_ttc` | `0002_devis.sql:50` | `0189_role_lecture_n8n.sql:40` |
| `devis` | `envoye_le` | `0055_verrou_credits_stripe.sql:35` | `0189_role_lecture_n8n.sql:40` |
| `factures` | `id` | `0006_factures.sql:11` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `artisan_id` | `0006_factures.sql:12` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `statut` | `0006_factures.sql:17` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `date_emission` | `0006_factures.sql:18` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `date_echeance` | `0006_factures.sql:19` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `total_ttc` | `0006_factures.sql:25` | `0189_role_lecture_n8n.sql:39` |
| `factures` | `avoir_de` | `0041_facturation_electronique.sql:20` | `0189_role_lecture_n8n.sql:39` |
| `materiaux` | `id` | `0040_inventaire.sql:8` | `0189_role_lecture_n8n.sql:45` |
| `materiaux` | `artisan_id` | `0040_inventaire.sql:9` | `0189_role_lecture_n8n.sql:45` |
| `materiaux` | `seuil_alerte` | `0040_inventaire.sql:19` | `0189_role_lecture_n8n.sql:45` |
| `stock` | `id` | `0040_inventaire.sql:36` | `0189_role_lecture_n8n.sql:46` |
| `stock` | `materiau_id` | `0040_inventaire.sql:37` | `0189_role_lecture_n8n.sql:46` |
| `stock` | `quantite` | `0040_inventaire.sql:39` | `0189_role_lecture_n8n.sql:46` |

Aucune colonne de plus que la liste attendue par la tâche. Écartés exprès : `leads.nom_prospect`, `leads.message`, `messages.contenu`,
`devis.numero` et `client_nom`, `factures.numero` et `client_nom`, `materiaux.nom` (des textes ou des noms) : la sortie ne porte que des
identifiants, et l'écran retrouvera le nom sous la RLS.

## La correspondance avec composerBriefing, rubrique par rubrique

| Rubrique (ordre de `composerBriefing`) | La chaîne de l'app reproduite | Dans n8n |
|---|---|---|
| `conversations` | `lire_conversations` (`executeurs.ts:161-179` : 200 demandes par `updated_at`, ouvertes, messages par paquets de 100, `etat` vide ou `proposition`, 1 000 par paquet), `attenteDe` et `resumerConversations` (`donnees.ts:190-245`, en attente seulement, 50 au plus), urgentes d'abord (`briefing.ts:53-55`) | « Paquets de demandes ouvertes », « Lire messages », « Conversations qui attendent » ; aucune fenêtre de temps |
| `devis_sans_reponse` | `devis` envoyés, `envoye_le` croissant, 200 au plus (`executeurs.ts:264`), jour d'envoi à Paris (l.277), `joursEntre` ≥ 7 (`briefing.ts:35`, `:40`, `:58-61`), le plus ancien d'abord | « Devis sans réponse » |
| `impayes` | route de « Mes chiffres » (`app/api/compta/tableau/route.ts:19`, `:37` : 2 000 factures, émission décroissante puis identifiant), `facturesComptees` et impayés de `calculerCompta` (`comptaTableau.ts:211-215`, `:316-337`), 50 listés (`donnees.ts:111-142`), échues et urgentes à 30 jours (`briefing.ts:37`, `:65-68`) | « Impayés » |
| `stock_bas` | alerte de l'écran Inventaire (`app/api/inventaire/route.ts:67-75`), épuisé si reste ≤ 0 (`briefing.ts:71-72`) | « Stock sous le seuil » |
| `chantiers_du_jour`, `chantiers_en_retard`, `a_facturer` (CRM) | `briefing.ts:74-81`, d'après la maquette de l'atelier (`lib/assistant/crm.ts:160-163`) et le pipeline (`:266-291`) | **hors de ce lot (Q4)** : un compte qui a `crm` les nomme dans `rubriques_hors_n8n` ; rien ne les dit vides |

Mêmes seuils (7 et 30 jours, 8 lignes), mêmes limites (200 demandes, 50 conversations, 50 impayés listés, 200 devis, 2 000 factures),
mêmes ordres et tris stables, jours comptés à Paris. Les capacités se lisent dans la copie figée, jamais un `plan === …`. Ni nom d'outil
ni `a_savoir` (§7, l.518) : la sortie ne porte que des identifiants, des nombres et des énumérations.

**Écarts déclarés, chacun avec le cas du juge qui le montre**
1. **Stock rangé par identifiant**, l'écran par nom (`app/api/inventaire/route.ts:63`), que n8n ne lit pas. Au-delà de 8 alertes, les 8
   objets montrés et le premier objet de la priorité diffèrent ; la rubrique et ses urgences se comparent comme des ensembles
   (`comparer`, branche `stock_bas` ; jeux tirés où le nom suit un autre ordre que l'identifiant, `Base.materiau`).
2. **Ex æquo** : à date égale (`updated_at`, `envoye_le`, `date_emission`), Postgres ne garantit aucun ordre ; n8n départage par
   identifiant, et le juge suppose que la base fait de même (`simulateur`, tri par identifiant puis ordre demandé ; jeux tirés avec dates
   égales). Les microsecondes de Postgres sont comptées (`cleTemps`).
3. **Inventaire de plus de 5 000 articles** : l'app lit les 5 000 premiers par nom (`app/api/inventaire/route.ts:36`, `:59`) ; n8n lit tous les
   matériaux suivis. Non exercé par le juge (au-delà de toute taille réelle connue).
4. **Une lecture en panne arrête tout le passage**, quand l'app dit « lecture indisponible » rubrique par rubrique
   (`executeurs.ts:278`) : aucun compte n'a son point du jour ce matin-là, plutôt qu'un point du jour qui tairait une source
   (cas (j) et (k) du juge).
5. **Le CRM n'entre pas** : la référence appelle `composerBriefing` sans `crm` ; ses rubriques viendraient après les quatre comparées,
   et ses urgences après celles du stock (`briefing.ts:74-81`) ; cas (g).
6. **Les sommes de stock** se font dans l'ordre des lignes (identifiant) ; un écart d'arrondi flottant sur des quantités non exactes en
   binaire reste possible à la limite du seuil (le juge tire des quantités entières ou en demis).
7. **L'URL des filtres `in.(…)`** grandit avec le nombre de comptes et de matériaux suivis (37 caractères par identifiant), comme au lot
   L3 : une adresse trop longue ferait échouer la lecture, donc arrêterait le passage (jamais un point du jour faux). À mesurer en L12.

## Les trois priorités et le silence

Défaut de ce lot (Q1) : les trois premières rubriques non vides dans l'ordre de P3:584, l'argent qui dort (`impayes`), puis les clients
qui attendent (`conversations`), puis le reste dans l'ordre de `composerBriefing` (`devis_sans_reponse`, `stock_bas`). Chacune porte sa
rubrique, son nombre et son premier objet (celui que `composerBriefing` met en tête). `composerBriefing` range ses rubriques autrement
(les conversations d'abord) : c'est la question Q1. Un compte sans rubrique ne donne rien (rang 3) ; le bilan compte à part les comptes
CRM muets, dont les rubriques du CRM n'ont pas été lues.

## Sortie

« Point du jour par compte » rend un seul élément : `{ mode, jour, comptes_lus, comptes_hors_offre, comptes_muets, comptes_muets_crm,
a_ecrire }`, où chaque ligne « à écrire » est `{ cle: 'point_du_jour:<compte>:<jour>', artisan_id, jour, mode, priorites,
point_du_jour: { rubriques, urgences, chiffres, rubriques_hors_n8n, rubriques_hors_offre } }` (P3:597 : le même passage rejoué donne les
mêmes lignes). Montants en centimes. « Bilan du passage », la seule sortie, est agrégé : `{ mode, jour, comptes_lus,
comptes_avec_point_du_jour, comptes_muets, comptes_muets_rubriques_hors_n8n, comptes_hors_offre, priorites_par_rubrique }`. Aucune
chaîne hors des identifiants, des dates ISO, de la clé et des énumérations fermées ; aucun mot du §7 (l.523) ni aucune marque (rang 23).

## La table de la voie (a) (Q2, proposition ; migration écrite par la session principale, au « go » de Benj)

`points_du_jour` : `artisan_id uuid not null references artisans(id) on delete cascade`, `jour date not null`, `cle text not null`
(`point_du_jour:<compte>:<jour>`), `priorites jsonb not null`, `point_du_jour jsonb not null`, `cree_le timestamptz not null default
now()` ; `unique (artisan_id, jour)` (un rejeu ne crée aucun doublon) ; RLS : lecture par l'artisan (`auth.uid() = artisan_id`), aucune
politique d'écriture (la clé de service seule écrit) ; aucun nom ni texte, seulement ce que rend ce workflow. Le nœud d'écriture (HTTP
POST en `upsert` sur la clé, au gabarit d'une écriture, jugé à part) viendra après la migration ; l'e-mail après Q3.

## Mention d'IA (plan l.128-139)

Ce workflow **n'est pas visé** : il n'écrit aucun message au nom d'un artisan et n'envoie rien. Le jour où l'e-mail du point du jour
partira (Q3), son texte sera fixe (un message de Presti à l'artisan, rédigé par le code, sans modèle) : il ne portera pas la mention, et
`n8n-specs-qa` contrôlera le pied déclaré de son nœud d'envoi.

## Ce que garantit le juge `briefing-n8n-qa`, et ses limites

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/briefing-n8n-qa.mjs` — hors ligne, sans base, sans modèle.
Structure (graphe entier, gabarits HTTP exacts, colonnes, réglages en liste blanche, aucun secret) ; empreintes SHA-256 des 11 nœuds
Code ; rejeu dans un processus enfant `node --permission` sans `--allow-*`, globaux en liste blanche (durcissement de 032-016),
horloge et `import()` refusés ; copies comparées au code ; comparaison avec la vraie chaîne de l'app (fonctions pures importées) sur les
cas fixes (a) à (l) et 320 jeux tirés à graine fixe ; sortie en liste blanche ; essai n8n rejoué ; brief relu contre les migrations ;
49 mutants. **Limites** : le rejeu n'est pas n8n (ce que l'exécuteur de code d'Oracle permet est relevé au brief du L3) ; le réseau du
processus enfant n'est pas coupé sur Node 24 ; la référence simule les lectures de l'app (mêmes requêtes) sans Postgres réel ; la
lecture réelle par l'identifiant « Supabase account » n'est pas l'objet de ce lot.
