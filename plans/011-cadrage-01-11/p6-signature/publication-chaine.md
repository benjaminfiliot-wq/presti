# 036-042 — Publication de la chaîne : les six départements et le réel

État du 03/11/2026, 23:35 UTC (Claude Code, hôte d'agents d'Oracle, MCP `n8n-oracle`).

**Publié, enfants d'abord : `lib-envoyer-courriel`, puis `presti-dep-envoi`, puis `presti-cerveau`.** Les sept chefs `presti-dep-*` n'ont pas
été touchés : leur brouillon est leur version publiée (036-035, 19:44). **Aucun compte n'est au réel** (lu en base juste avant de publier, § 5).
Aucune porte « simulation » n'a été levée. Aucun identifiant n'a été créé ni modifié. Aucun appel au modèle n'a été fait par les bancs (§ 3).

Preuves : `.orchestre/preuves/036-042/` (diff, exports avant et publié, jeux épinglés, sorties des chefs, `resume.md`).

## 1. Le brouillon de `presti-cerveau` relu contre la version publiée

`get_workflow_versions_diff` de `78c413bb` (publiée, 036-034) vers `02860d45` (brouillon) : `diff-78c413bb-02860d45.json`.

| Ce que le brouillon contient | D'où | Relu |
|---|---|---|
| 5 nœuds ajoutés : « Préparer les lectures des départements », « Des lectures à faire ? », « Lire les tables des départements », « Jours fériés utiles ? », « Lire les jours fériés (calendrier.api.gouv.fr) » | 036-036 (`aaa496b8`) | identiques aux sources `036-036/noeuds/preparer-lectures.js` (seul écart : fin de ligne) |
| « Aiguiller » : les six contrats (devis, suivi, facturation, apres, operations, direction) composés depuis les faits et les lectures | 036-036 (`c17e787c` à `6fedfef9`) | identique à `noeuds/aiguiller.js`, plus la retouche 036-038 (`SERVIS` avec `reel`) |
| « Composer les pages » (faits des événements), « Bilan du passage » (lectures, jour férié) | 036-036 | identiques à `composer-pages.js` et `bilan.js` |
| « Préparer les cartes de l'ombre » : cartes des six départements + `BLOC_CARTES_REEL` | 036-036 (`014493c4`) + 036-038 (`a18daaae`) | identique à `cartes.js` + le bloc de `lib/agents/n8n/envoi-reel.mjs` |
| « Lire les interrupteurs généraux », « Interrupteur général », « Préparer les marques » : palier `reel` accepté | 036-038 (`bd761a69`) | conforme à `envoi-reel.mjs` |
| Connexion « Composer les pages → Aiguiller » remplacée par la chaîne des lectures | 036-036 | 8 connexions ajoutées, 1 retirée |

**Ce qui manquait : rien dans l'aiguillage.** La table `ROUTES` d'« Aiguiller » couvre les neuf types de `TYPES_EVENEMENT`
(`lib/evenements/ecrivain.ts:21`) : `demande_recue`→accueil, `devis_a_preparer`→devis, `relance_due`→suivi, `facture_a_emettre` et
`impaye_echu`→facturation, `chantier_termine`→apres, `rendez_vous_a_poser` et `stock_sous_le_seuil`→operations, `page_du_matin`→direction.
Le réel ne sert que les comptes dont « tous » **et** le département sont au réel et en marche (le plus prudent des deux, `palierDe`) ; il n'y en a
aucun. Je n'ai donc rien écrit dans le brouillon : il est publié tel que 036-036 et 036-038 l'ont laissé, après bancs.

**Une limite trouvée, laissée fermée (pas complétée, volontairement)** : le Suivi s'abstient toujours (§ 3, exécution 2851). « Aiguiller »
passe `destinataire.opposition: null` pour une relance, parce que l'app ne lit pas l'opposition du client pour une relance ; le cron de production
range même `stop: null` (`app/api/cron/relances/route.ts:166`, `:187`). `lib-porte-conformite` refuse alors `lecture_en_erreur`. Inventer
`opposition: false` affaiblirait la garde : aucune carte de relance de conversation en ombre tant que l'app ne lit pas l'opposition et le STOP
(à faire côté app, hors de mon périmètre). L'événement est marqué traité, sans boucle ni doublon.

## 2. Ce que chaque workflow est devenu

| Workflow | Id | Version d'avant (active) | Ce qui a changé | Version publiée | Retour arrière |
|---|---|---|---|---|---|
| `lib-envoyer-courriel` | `Zs4fVsKZThSRCDjd` | aucune (jamais publié) | rien : publié tel que 036-038 l'a créé | `f3e74330` | `unpublish_workflow Zs4fVsKZThSRCDjd` (après `presti-dep-envoi`) |
| `presti-dep-envoi` | `DPZnxlsZHUwFEY0H` | aucune (jamais publié) | rien : publié tel que 036-038 l'a créé | `c5d849ff` | `unpublish_workflow DPZnxlsZHUwFEY0H` : plus aucun envoi n8n |
| `presti-dep-accueil`, `-devis`, `-suivi`, `-facturation`, `-apres`, `-operations`, `-direction` | `Ls0oFcQzzAk0rWcP`, `dNikTYPKKsivUbd3`, `jo8eQMEwiB9wCbKN`, `bNAF6Xzx5On853kD`, `L3GOS7euxi60jCZN`, `74bDhTw6cEBzPORZ`, `oHGOyqsZGoUooxa6` | `8025147d`, `1c944a38`, `ce6641b9`, `dcffb632`, `41873abb`, `c5dc2180`, `1a572c9b` | rien (brouillon = publiée) | inchangées | sans objet |
| `presti-cerveau` | `596OC5mL2aMBq6SD` | `78c413bb` (036-034, 35 nœuds) | les six départements (036-036) et le palier réel (036-038), § 1 ; 40 nœuds | `02860d45` | `publish_workflow 596OC5mL2aMBq6SD versionId=78c413bb-2768-492c-8381-41b6800f03fb` (export : `presti-cerveau-avant-78c413bb.workflow.json`) |

Ordre du retour arrière complet, parents d'abord : `presti-cerveau` sur `78c413bb`, puis dépublier `presti-dep-envoi`, puis
`lib-envoyer-courriel`. L'app garde la main d'elle-même tant qu'aucun département n'est au réel (`lib/agents/n8n/garde-reel.ts`).

## 3. Les bancs, en simulation, une fois chacun

Méthode : `test_workflow` sur les vrais workflows, lectures Supabase épinglées avec un compte fictif (`…0000c6`, données « Exemple. »).
**Aucun appel au modèle** (consigne : pas de clé API Anthropic) : dans chaque chef, le nœud agent « Chef du département … » est épinglé avec une
note neutre (`rien_a_signaler`, aucun spécialiste) — sa revalidation ne peut que rendre plus prudent ; dans Suivi et Facturation, l'appel à
`lib-rediger-message` est aussi épinglé (son nœud porte l'identifiant « Anthropic account » malgré sa note « sans identifiant ») avec un texte
« Exemple. » ; dans l'Accueil, `lib-lire-photo` est épinglé. Le jugement du modèle n'est donc **pas** prouvé ici ; le reste du code l'est.

| Banc | Exécution | Ce que j'ai relu nœud par nœud | Verdict |
|---|---|---|---|
| Cerveau, étape A (aiguillage) | **2832** | 7 types → 7 enveloppes (`presti-dep-<dep>@1`), 13 lectures lues, 0 non lue, jour férié `false`, aucun rejet, `simulation: true` partout | vert |
| Accueil | **2878** | entrée conforme ; tri `peut_attendre` ; note `a_revoir` ; `demander_brouillon` (proposition nulle, limite connue de 036-034) | vert |
| Devis | **2837** | entrée conforme ; carte `devis_pret`, prix « estimé » ×2 (rien n'est recopié), envoi « au clic » | vert |
| Suivi | **2851** | conflit : aucun ; relance palier 1 due ; porte : **refus `lecture_en_erreur`** (opposition inconnue) → `reste_du`, aucune carte | vert (abstention voulue, § 1) |
| Facturation | 2856 puis **2864** | 2856 : ma maquette de rédaction avait une mauvaise `action_cle` (erreur de banc, pas du workflow) ; 2864 : décision carte (pilote coupé), porte « passe », carte `relance_impaye` avec brouillon | vert |
| Après-chantier | **2871** | carte de lot `demande_avis_lot` (1 destinataire, rien ne part, « après clic de l'artisan ») | vert |
| Opérations | **2876** | carte `commande_fournisseur` « à valider », fournisseur et quantité « à compléter », aucun prix | vert |
| Direction | **2877** | page du matin : l'argent d'abord, 3 priorités sourcées, fin sur les cartes ; `deposer_page` | vert |
| Cerveau, étape C (cartes) | **2894** | sorties réelles des chefs ci-dessus ; 6 cartes préparées (accueil, devis, facturation, apres, operations, direction), chacune avec `origine: agent`, son département, son motif, ses `sources` ; **écriture non épinglée** : Postgres rend 409 / `23503` sur `assistant_actions_artisan_id_fkey` (compte fictif) — la clé étrangère est vérifiée en dernier, donc les 6 lignes passent déclencheur et contraintes, et rien n'est écrit ; 7 événements à marquer (marque épinglée) | statut « error » attendu et voulu (`Bilan du passage` lève sur écriture refusée) |
| Réel (`presti-dep-envoi` + `lib-envoyer-courriel`) | **2903** (sous-exécutions 2904, 2905) | jeu fictif de 036-038 (`essai-pindata.json`) : `c001` Studio cliquée et `c002` Signature pilote échu → Resend rend `01a1a3a9-e1dd-…` et `01a1a3a9-e2ae-…`, **les mêmes identifiants que 2749** (clé d'idempotence) : aucun second message ; `c005` opposition, `c006` opt_in, `c007` marque écartées ; `c003`, `c004`, `c008` laissées. Destinataire : `delivered@resend.dev` seulement | vert |

Aucun workflow n'a échoué deux fois : rien n'a été dépublié.

## 4. Publication

| Ordre | Workflow | Version publiée | Réponse |
|---|---|---|---|
| 1 | `lib-envoyer-courriel` | `f3e74330-ce20-4a78-9e10-20293e2451e0` | `success`, `activeVersionId` = idem |
| 2 | `presti-dep-envoi` | `c5d849ff-b979-4340-8123-863a0f13c55c` | `success`, `activeVersionId` = idem |
| 3 | chefs touchés | aucun | — |
| 4 | `presti-cerveau` | `02860d45-bdfe-499b-b522-7d72765e5a4f` | `success`, `activeVersionId` = idem |

## 5. Aucun compte au réel

Avant de publier, lecture agrégée de `departements_reglages` (aucune donnée de compte) : un seul compte, en **ombre** et en marche sur `tous` et
les sept départements ; **zéro ligne au palier `reel`**. `presti-dep-envoi` ne trouve donc aucun compte à chaque minute (« Comptes au réel »
vide) et n'envoie rien. Le passage d'un vrai compte au réel reste le geste de la session principale, sur le « go » écrit de Benj
(`reel.md` § 5), Accueil Signature exclu tant que le Cerveau ne compose pas la proposition.

## 6. Après publication

Voir `.orchestre/preuves/036-042/resume.md`, section « Production après publication ».
