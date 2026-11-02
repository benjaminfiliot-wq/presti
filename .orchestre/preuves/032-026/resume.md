## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« contact, démo, entreprise, n8n ») : a rendu la règle d'architecture (n8n d'Oracle, identifiant « Supabase account » qui vise la vraie API). Effet : aucune lecture réelle tentée, aucun identifiant créé, workflow laissé inactif.
- **MCP `cerveau`, `chercher`** (« demande de démo entreprise suivi relance Benj ») : a confirmé la ligne L19 du plan (§14) et le motif « entreprise » de `/contact` (plan du chantier 2, §3). Effet : la route ne range que le motif `entreprise`, le reste du contact est inchangé.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference` (patterns, rules), `get_workflow_best_practices` (notification, scheduling), `search_nodes`, `get_node_types` (Schedule Trigger 1.4, Slack 2.7), `list_credentials`, `search_workflows`, `validate_workflow`, `create_workflow_from_code`, `update_workflow` (réglages seulement), `prepare_workflow_pin_data`, `test_workflow`, `get_workflow_execution`, `get_workflow_details`. Effet : cron aligné sur le quart d'heure (la règle « scheduling » dit qu'il n'y a pas de rattrapage, d'où la limite écrite plus bas), un seul nœud d'envoi (la règle « notification »), pas de `getWorkflowStaticData`, réutilisation de l'identifiant Slack existant au lieu d'en créer un.
- **Skill `supabase-postgres-best-practices`** (security-rls-basics, security-privileges, query-partial-indexes) : RLS dès la création, droits retirés, `(select …)` dans les gardes, index partiel `where etat = 'nouvelle'` pour la lecture de n8n.
- **Skill `presti-design`** : densité d'outil de travail du Poste (pas de grandes cartes), classes existantes (`tool-card`, `sess`, `pill`, `btn--ghost`), corail par les classes et pas en dur, chiffres en `tabular-nums`.
- **Skill `ecc:security-review`** : listes blanches et pas listes noires, messages d'erreur génériques, aucune coordonnée dans un journal (`console.error` ne porte ni prénom, ni adresse, ni message ; un mutant le prouve), identifiant UUID validé avant toute requête, rien injecté en HTML.
- **Sous-agent `presti-audit-attaque`** (opus, lecture seule, distinct de l'auteur) : relecture offensive ; ses constats et leur suite sont plus bas, section « Audit distinct ».
- **Fiches de la méthode n8n** (`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`, points 6, 8, 9 ; fiche 8 ; §3.4) : la garantie « une fois » ne vient pas de n8n ; `saveDataSuccessExecution: none` (point 9) ; pas de Wait long, un déclencheur fréquent.
- **Fiches des dépôts** (`p5-entreprise/fiches-depots.md:489-496`, routeur Slack et nœuds de validation) : un canal interne pour Benj, jamais un envoi au client sans validation.
- **Vidéos déjà analysées** (`plans/analyse-videos.md:43`, `:101`, `:116`) : « expliquer ce qui se passe après la demande de démo » et la trame d'appel. Effet : aucun envoi automatique au demandeur dans ce lot ; la confirmation attend les textes validés par Benj (question 4 du plan).
- **Briefs et juges n8n déjà faits** (`plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md`, `scripts/suivi-artisan-qa.mjs`, export de `presti-garde-sauvegarde` de 032-023) : gabarit exact des lectures, empreintes du code, rejeu en `vm`, mutants ; nœud Slack `#presti-auto` repris de 032-023.

## Ce qui est livré

Rien ne change en production : drapeau `demandesDemo` baissé (`lib/flags.ts:323`, non touché), migration non appliquée, workflow inactif.

| Fichier | Rôle |
|---|---|
| `supabase/migrations/0190_demandes_demo.sql` | la table `demandes_demo`, « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj », retour arrière d'une ligne |
| `supabase/migrations/_A_COLLER_sql_editor_0190_NU.sql` | le jumeau, fabriqué par `scripts/sql-nu.mjs` avec un bloc de contrôle propre à 0190 (`.orchestre/preuves/032-026/controle-0190.sql`) |
| `lib/demandesDemo.ts` | toute la logique (contact, Poste), sans import à l'exécution : jugée hors ligne |
| `app/api/contact/route.ts` | branchement de `traiterContact` |
| `app/api/controle/demandes-demo/route.ts` | GET (liste) et POST `{ id }` (« traitée »), garde `lib/direction/garde.ts` |
| `app/controle/DemandesDemo.tsx`, `app/controle/page.tsx` | l'onglet « Démos », derrière le drapeau |
| `plans/011-cadrage-01-11/briefs/c4-n8n-demande-demo.md` | le brief du workflow |
| `scripts/demandes-demo-qa.mjs` | la suite hors ligne |

### La table (0190)

`id`, `motif` (`entreprise`), `taille` (`1`, `2 à 5`, `6 à 20`, `plus de 20`), `activite` (`Artisan`, `Entreprise du bâtiment`, `Architecte`, `Autre`) — listes du formulaire du chantier 2 (`c2-lot4/texte.md:284-285`) —, `prenom`, `email`, `message` (facultatif), `etat` (`nouvelle`, `traitee`), `rendez_vous_le`, `fiche_diagnostic` (rang 17), `traitee_le`, `traitee_par`, `cree_le`, `maj_le` (déclencheur). Contrainte : `traitee` ⇔ `traitee_le` posé. Sans IP. RLS activée, aucune politique pour `anon` ni `authenticated`, droits retirés, les quatre gardes de 0138 posées en restrictif ; écriture par la clé de service seulement. Pour n8n : `grant select (id, motif, taille, activite, etat, cree_le, maj_le, traitee_le)` au rôle `n8n_lecture` de 0189, s'il existe (bloc sauté sinon) — jamais prénom, adresse ni message.

### La route `/api/contact`

Drapeau baissé : le code d'avant, déplacé tel quel dans `traiterContact` ; motif, taille et activité ne sont même pas lus. Drapeau levé : si l'un des trois champs est présent, les trois sont exigés en liste fermée ; une valeur hors liste n'entre jamais en base, mais la demande n'est jamais perdue : même réponse et même e-mail qu'avant, seul le code est journalisé (correctif de l'audit, point 1) ; après le plafond de 3 par heure, la ligne est écrite, PUIS le même e-mail qu'avant part. Écriture en panne : l'e-mail part quand même (200). E-mail en panne mais demande rangée : 200 (elle se lit dans le Poste). Les deux en panne : 502, comme avant. L'en-tête composé par le formulaire du chantier 2 (« [Démo entreprise] Équipe : … · activité : … ») est retiré du message rangé quand il est exactement celui-là ; une moitié d'émoji laissée par la coupe à 120 signes est retirée de la ligne (Postgres la refuserait ; point 7). Un message de contact ordinaire (aucun des trois champs) ne crée aucune ligne.

### L'écran

Onglet « Démos » du Poste (`/controle?onglet=demos`), seulement drapeau levé ; filtres « À traiter » (avec compteur) et « Toutes » ; chaque demande : état, activité, taille, date, prénom, adresse (lien `mailto:` seulement si l'adresse n'a ni `?`, `&`, `%`, `#`, `/` ni `:` — `EMAIL_LIEN`, point 6), message, rendez-vous ; les neuves d'abord, puis les plus récentes, 200 au plus (point 9) ; bouton « Marquer traitée » pour le rôle `direction`. Route : drapeau baissé 404 sans garde ; compte fondateur (second facteur, `is_founder`, plafond) ; domaine `messagerie` et jamais un rôle borné (un partenaire ne voit rien) ; le geste est journalisé d'abord (`courrier_classe`, cible `demande_demo`, sans coordonnée ; une action non journalisée n'a pas lieu), puis une mise à jour conditionnelle `etat = nouvelle` : un double clic ou un rejeu répond « déjà traitée » sans rien changer.

### Le workflow `presti-demande-demo`

n8n d'Oracle, id **`4R2wS9374GUxb63F`**, projet personnel de Benj, **inactif, jamais publié** (`active: false`, `activeVersionId: null`), 6 nœuds : cron `0 */15 * * * *` → « Fenêtres du passage » (Code) → « Lire demandes neuves » (GET) → « Lire demandes à relancer » (GET, `etat=eq.nouvelle`) → « Avis à Benj » (Code) → « Prévenir Benj (#presti-auto) » (Slack, identifiant existant « Slack account 2 »). `select=id,taille,activite,etat,cree_le`. Une fois par demande grâce à des fenêtres de 15 minutes alignées, sans trou ni chevauchement, décalées de 5 minutes ; relance à J+2 dans la même fenêtre 48 h plus tôt, seulement si l'état est encore « nouvelle ». Aucun envoi au demandeur. Réglages : `executionOrder v1`, `Europe/Paris`, `saveDataSuccessExecution: none`, `availableInMCP: true`. Export : `.orchestre/preuves/032-026/presti-demande-demo.workflow.json` (code des deux nœuds vérifié octet pour octet contre la source envoyée).

### L'essai sur données épinglées

`test_workflow`, exécution **346**, `success` (`.orchestre/preuves/032-026/essai-n8n.json`). Données fictives (UUID de motif, adresses `exemple.invalid`) ; déclencheur, deux lectures et Slack épinglés : rien n'a été lu en base, rien n'a été posté. Passage de 10 h 15 (Paris) : fenêtre `[08:55Z, 09:10Z)`, relance `[31/10 08:55Z, 09:10Z)`. Sortie de n8n : 4 avis — trois demandes neuves (dont la borne incluse 08:55 et une demande portant des coordonnées : elles n'en sortent pas), une relance ; écartés : la borne exclue 09:10, une taille hors liste, une demande déjà traitée à J+2, une hors fenêtre.

### La suite et ses mutants

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/demandes-demo-qa.mjs` : vert. Sortie relevée :

```text
  ✓ A. drapeau demandesDemo baissé (lib/flags.ts)
  ✓ B. /api/contact : 1620 comparaisons à la route d'avant, drapeau baissé, à l'octet près ; levé : écriture + e-mail, panne d'écriture = e-mail quand même, hors liste = jamais rangé et jamais perdu
  ✓ C. routes : branchements seulement (drapeau, garde du fondateur, clé de service)
  ✓ D. Poste : 404 baissé, refus de garde transmis, partenaire refusé, geste « traitée » journalisé et conditionnel
  ✓ E. écran : onglet Démos derrière le drapeau, route protégée, aucun HTML injecté
  ✓ F. migration 0190 non appliquée : RLS, droits retirés, gardes, listes fermées, sans IP ; jumeau identique
  ✓ G. export n8n inactif, jamais publié : lectures GET sans coordonnées, un seul avis Slack à Benj, aucun secret, empreintes
  ✓ H. rejeu : essai n8n rendu à l’identique ; 120 demandes sur 4,5 jours : un avis chacune, une relance J+2 si non traitée
  ✓ I. mutants : 53/53 rouges
✅ demandes-demo-qa : vert
```

L'oracle du point B est le code de la route d'avant, recopié dans la suite : 270 corps (20 écrits, 250 tirés) × 6 conditions (ban, plafond, e-mail en panne, corps illisible, IP illisible), réponse et suite des appels comparées. Les 53 mutants (drapeau ignoré, e-mail perdu quand l'écriture tombe, hors liste rangé, hors liste qui perd la demande, moitié de caractère rangée, lien `mailto:` non gardé, neuves pas en tête, coordonnée au journal, geste non conditionnel ou sans journal, partenaire admis, RLS retirée, `anon` gardé, n8n qui lit l'e-mail, IP rangée, jumeau divergent, workflow actif ou publié, lecture en POST, autre canal Slack, envoi au demandeur ajouté, succès gardés, faux secret, fenêtres qui se chevauchent ou trouées, relance à J+1, doublon d'avis, essai non épinglé…) rougissent chacun pour sa raison (`QA_RAISONS=1` les affiche). Deux mutants avaient d'abord survécu (doublon d'avis, coordonnées recopiées) : le juge a été renforcé (lignes lues deux fois dans le rejeu, mutant qui fait vraiment sortir les champs), pas le code.

`node scripts/migrations-jumelles-e2e.mjs` : vert (jumeau 0190 parsable et inclus dans sa migration).

Non fait ici, par interdit de l'hôte : `npm run build`, `npm run typecheck`, essai du rendu de l'onglet dans un navigateur. La session principale les rejoue avant tout push.

## Audit distinct

Sous-agent `presti-audit-attaque` (opus), lecture seule, distinct de l'auteur, 34 outils. Il n'a trouvé **aucun écart drapeau baissé** avec `git show HEAD:app/api/contact/route.ts`, **aucun contournement** de la garde (partenaire refusé deux fois, rôle lecture refusé au geste), **aucune incompatibilité SQL**, **aucune erreur de typage probable** (assignation de `supabaseAdmin` à `ClientBase`, `notifierEntreprise` à `notifier`, rétrécissements). Ses constats et leur suite :

| # | Constat | Suite |
|---|---|---|
| 1 | Une valeur hors liste rendait 400 sans e-mail : la demande était perdue (le plan du chantier 2 écrit les choix en minuscules, `chantier-2-landing-plan.md:123-125`) | **corrigé** : jamais rangée, jamais perdue (même e-mail qu'avant) ; le formulaire réel du chantier 2 (`presti-c2/lib/landing/contenu.ts:200-201`, relu le 02/11 au soir) porte exactement les listes de 0190 ; deux mutants |
| 2 | n8n lit par la clé de service (« Supabase account »), qui passe outre la RLS et les droits par colonne : le `grant` à `n8n_lecture` ne protège rien pour ce workflow ; 0190 avant 0189 saute le bloc | **dit tel quel** dans la migration et le brief ; la barrière réelle est le `select=` figé par le juge ; la voie stricte (identifiant Postgres `n8n_lecture`, que seul Benj peut créer) est au pas 5 ci-dessous |
| 3 | Prénom, adresse et message gardés sans durée | **à Benj** : durée à fixer, purge dans `lib/purgesRgpd.ts` et ligne au registre (`docs/registre-traitements.md`), hors de mon périmètre ; pas 2 ci-dessous, avant le lever |
| 4 | Le juge n'est pas dans `SUITES` | **à la session principale** (le lanceur est interdit à cette tâche) |
| 5 | `notifierEntreprise` journalise le sujet « Message de <nom> » quand l'e-mail échoue (`lib/email.ts:152`) | **pas une régression** (HEAD faisait pareil) ; `lib/email.ts` est interdit ; le sujet n'a pas été changé pour garder l'e-mail à l'octet près ; le juge le dit (il ne couvre que les journaux de `traiterContact`) |
| 6 | Lien `mailto:` piégeable (`?cc=…&subject=…`) | **corrigé** : `EMAIL_LIEN`, lien posé seulement sur une adresse sans `? & % # / :` ; deux mutants |
| 7 | Moitié d'émoji après la coupe à 120 signes, et adresse valide en JS mais refusée par le CHECK (`{2,}` compté en unités UTF-16) : ligne perdue sans bruit | **corrigé** : moitiés retirées de la ligne ; CHECK de l'adresse ramené à `[^[:space:]@]+` après le point (toute adresse acceptée par la route l'est par la base) ; un mutant |
| 8 | Le journal de direction est écrit avant la mise à jour : un rejeu ou un identifiant inconnu laisse une entrée | **gardé, écrit** : c'est la règle du dépôt (une action non journalisée n'a pas lieu, `lib/direction/journal.ts:7-9`, même ordre que `app/api/controle/demandes/route.ts`) ; une fonction SQL qui fait les deux dans une transaction (`0069_courriers.sql:113`) est le remède, dans une migration suivante |
| 9 | Liste plafonnée à 100 tous états confondus : une neuve ancienne pouvait sortir de l'écran | **corrigé** : neuves d'abord (`order etat`, puis `cree_le` décroissant), 200 au plus ; un mutant |
| 10 | Pas de plafond global : en changeant d'IP, chaque envoi crée une ligne et un avis Slack | **écrit** aux risques ; l'e-mail existait déjà sans plafond global |

Trous du juge relevés et suite : `notifier` simulé (point 5, écrit) ; `estDirection` réécrit dans le juge (la vraie garde importe la base : non jouable hors ligne ; le branchement est vérifié par texte) ; le gabarit fige la clé de service (dit au point 2) ; les listes ne sont pas comparées au formulaire, qui n'est pas dans ce dépôt (relevé à la main, point 1) ; `mailto:` et l'écart JS/CHECK sont désormais couverts.

## Risques et limites

- **Un passage n8n manqué** (n8n arrêté pendant un quart d'heure) ne prévient pas pour les demandes de sa fenêtre, et une relance de J+2 peut sauter de même. Rien n'est perdu : la demande est en base, l'e-mail actuel est parti, l'onglet la montre. Remède durable : une colonne `avis_le` posée par n8n après l'envoi (écriture de n8n en base, décision de Benj).
- Le rejeu du code n'est pas n8n ; la lecture réelle n'a pas été faite (0190 absente : la lecture répondrait 404 et le passage s'arrêterait avant tout avis).
- La route du Poste réutilise l'action de journal `courrier_classe` (la liste fermée `Action` de `lib/direction/journal.ts` est hors de mon périmètre) ; `cible_type: 'demande_demo'` la distingue.
- La suite n'est pas encore dans `SUITES` de `scripts/tout-verifier.mjs` (interdit à cette tâche) : à y ajouter par la session principale.
- Pas de plafond global sur `/api/contact` (3 par heure et par IP seulement) : un envoi depuis de nombreuses IP crée autant de lignes et d'avis Slack (audit, point 10).
- Le journal de direction peut porter un geste « traitée » qui n'a rien changé (rejeu, identifiant inconnu) : convention du dépôt, remède par fonction SQL (audit, point 8).
- `lib/flags.ts` apparaît modifié dans `git status` : ce n'est pas ce lot (le drapeau `demandesDemo` était déjà posé, baissé ; je n'y ai pas touché).

## Avant l'activation

Dans cet ordre, chaque pas sur « go » écrit de Benj :

1. **Migration** : coller `supabase/migrations/_A_COLLER_sql_editor_0190_NU.sql` (ou `node scripts/appliquer-migration.mjs supabase/migrations/0190_demandes_demo.sql`), puis lire le bloc de contrôle : table présente, RLS `true`, politiques = les quatre gardes (+ `n8n_lecture_select` si 0189 est appliquée), aucun droit `anon`/`authenticated`, 0 ligne.
2. **Conservation** : Benj fixe la durée de conservation des demandes ; purge ajoutée à `lib/purgesRgpd.ts` et ligne au registre des traitements (audit, point 3), avant le lever du drapeau.
3. **Build et typecheck** par la session principale (`npm run build`, `npm run typecheck`), `scripts/demandes-demo-qa.mjs` ajouté à `SUITES`, déploiement drapeau baissé, contrôle que `/api/contact` répond comme avant.
4. **Drapeau** : lever `demandesDemo` dans `lib/flags.ts` (jamais avant les pas 1 et 2) ; essai d'une demande de démo fictive sur `/contact?motif=entreprise` (le formulaire est au chantier 2, `landingV2`), la voir dans l'onglet « Démos », la marquer traitée, la supprimer.
5. **Publication du workflow** : valider les deux textes Slack du brief ; de préférence, remplacer la lecture par la clé de service par un identifiant Postgres `n8n_lecture` (créé par Benj, 0189 appliquée AVANT 0190, sinon rejouer le bloc `$lecture$` de 0190) — audit, point 2 ; confirmer que « Slack account 2 » poste bien dans `#presti-auto` ; décider s'il faut aussi Telegram (plan l.200-201 ; aucun identifiant Telegram n'existe dans le n8n d'Oracle) ; publier `4R2wS9374GUxb63F`. L'envoi au demandeur (confirmation, rappel de rendez-vous) reste à un lot suivant : question 4 du plan (canal), textes validés par Benj.
6. **Couper l'e-mail actuel** à Benj (`notifierEntreprise` dans `traiterContact`) seulement une fois la liste en ligne et contrôlée (plan l.204-206) — pas dans ce lot.
