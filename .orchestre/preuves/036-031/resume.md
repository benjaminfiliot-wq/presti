# 036-031 — Les gabarits n8n parlent au vrai schéma (03/11/2026, claude-code, hôte d'agents Oracle)

## Ressources utilisées

| Ressource | Ce qu'elle a changé |
|---|---|
| MCP `cerveau` : `regles_pour` (« schéma, migrations, RLS, n8n ») | Rappel de la règle « on colle PUIS on lève » et du « go » écrit de Benj : 0195 est **écrite, pas appliquée**, et son en-tête donne l'ordre de pose (0185, 0193, 0194, puis 0195). |
| Mémoire `n8n-poser-un-gabarit` (piège : un nœud dans une chaîne reçoit un tour par élément) | Chaque lecture neuve porte `executeOnce` et `alwaysOutputData`, plus `onError: continueRegularOutput`, pour qu'une lecture en erreur donne « rien lu », donc le côté sûr. |
| MCP `n8n-oracle` : `search_workflows`, `get_workflow_details` (accueil-boite, comparé à l'export du lot), `update_workflow` (10 gabarits, puis un correctif R7 sur les 10) | Les corrections sont faites dans n8n. Les gabarits restent inactifs, sans identifiant, avec la porte « simulation » intacte. Aucun `presti-*` ni `lib-*` touché. |
| Sous-agents `general-purpose` (Sonnet), 5 en parallèle, consigne mécanique | Ils ont appliqué les `ops-*.json` tels quels. J'ai vérifié qu'ils ne mentaient pas : nombre de nœuds lu dans n8n égal à celui des exports corrigés, pour les 10 gabarits (22, 26, 22, 48, 39, 50, 43, 49, 80, 42). |
| Audits 036-028 (`audit-0311-conformite.md`, `tables-appelees.txt`) et 036-029 (`audit-0311-fonctionnement.md`) | La liste des 61 objets et leurs appelants. Le point 4 de 036-029 (« les écrans lisent `assistant_actions` ») a fixé la cible des cartes. |
| Migrations lues : 0010, 0002, 0006, 0032, 0038, 0139, 0141, 0157, 0159, 0162, 0174, 0185, 0189, 0193, 0194 | C'est le vrai schéma. Le compte est `artisan_id`, sans colonne `organisation_id`. La carte d'agent suit 0194. La file du pilote est `actions_auto` (0174). `canaux_conversation_ouvrir` (0139) ne couvre pas l'e-mail, d'où 0195. |
| Export `presti-cerveau` de 036-030 (« Composer les comptes », « Préparer les cartes de l'ombre ») | Copie de l'offre, des capacités et de la grille de qualification. Même forme de carte. « Mettre en file du pilote » devient une carte, et seule l'app met en file. |
| `scripts/sql-nu.mjs` et les règles écrites de 0193/0194 (le skill `supabase-postgres-best-practices` n'a PAS été chargé dans cette session) | 0195 : `security definer`, `search_path` vide, verrou consultatif, droits retirés à `anon` et `authenticated`. Le jumeau est fabriqué par le script, avec un contrôle propre (`controle-0195.sql`). |
| Juges : `n8n-specs-qa`, `gabarits-accueil-qa`, `gabarits-argent-qa`, `gabarits-terrain-qa`, `migrations-jumelles-e2e` | Ils ont trouvé une vraie faute : `nom` lu dans `artisans` (R7), corrigée. Les autres rouges sont expliqués plus bas. |

Non chargés, et pourquoi : les skills de design et de vidéo (hors domaine). `security-review` aussi : 0195 a été relue à la main contre les
règles de 0193 et 0194 (une seule fonction `security definer`, bornée à un compte, refusée à `anon` et `authenticated`).

## Ce qui est fait

1. **Les 61 objets** : `plans/011-cadrage-01-11/p6-signature/schema-gabarits.md`, une ligne chacun, avec l'appelant, l'objet réel
   (migration:ligne) ou « manquant », et la correction.
   - 55 objets existent.
   - Un seul est vraiment manquant : `deposer_message`.
   - 2 sont hors base (les PDF), 4 `entreprise_*` sont hors offre vendue, et 1 dépend de 0183.
2. **Les 10 `gabarit-artisan-*` corrigés dans n8n** :
   - 50 nœuds HTTP sont repointés vers les vraies tables, avec le filtre `artisan_id`, un `select=` explicite, `on_conflict` sur les vraies
     contraintes et les cartes à la forme 0194 ;
   - 10 lectures de configuration deviennent 8 lectures réelles chacune, suivies d'un Code « composer » qui garde le nom du nœud remplacé ;
   - aucun autre nœud Code n'est touché.

   Le fabricant est `corriger.mjs`. Les opérations sont dans `ops-*.json`, les exports corrigés dans `gabarit-artisan-*.workflow.json`, le
   relevé dans `corrections.txt`.
3. **`supabase/migrations/0195_deposer_message.sql`**, avec son jumeau `_A_COLLER_sql_editor_0195_deposer_message_NU.sql` : **non appliquée**.
   - Elle dépose un message reçu une seule fois (verrou, empreinte de la clé) dans la conversation du compte.
   - Une conversation neuve devient un fait `demande_recue` pour le Cerveau.
   - Aucune table neuve.

## Sortie des juges (rejoués un à la fois)

- `migrations-jumelles-e2e` : **vert** (code 0) ; le jumeau 0195 a ses chaînes refermées, ses blocs `$…$` appariés, ses parenthèses
  équilibrées, et il est inclus dans 0195 (`juge-migrations-jumelles.log`).
- `n8n-specs-qa` : sur les anciens exports, **vert** (code 0, `juge-n8n-specs-avant.log`). Sur les exports corrigés, **rouge** (code 1,
  `juge-n8n-specs-apres.log`), pour trois motifs seulement :
  - R14 « requête sans filtre organisation », 107 fois ;
  - R7 « select= avec *, jointure ou alias », 20 fois ;
  - R14 « écriture sans organisation_id dans le corps », 1 fois (`messages`).
- `gabarits-accueil-qa`, `gabarits-argent-qa`, `gabarits-terrain-qa` sur les exports corrigés (copie des dossiers de lot avec les exports
  remplacés) : **rouges** (code 1, `juge-gabarits-*-apres.log`). Il y a deux causes principales :
  - les essais n8n enregistrés n'épinglent pas les nouvelles lectures (« lecture non épinglée ») ;
  - le juge de l'accueil attend les anciennes adresses.
  - S'y ajoute un mutant du terrain qui survit, parce qu'il cherche un texte qui a changé.

**Pourquoi je ne les ai pas mis au vert** : ces juges codent l'ancien contrat, une colonne `organisation_id` qui n'existe dans aucune
migration (0185:17, 0193:36), et ils sont hors de mon périmètre (`scripts/`). Les remettre au vert sur le vrai schéma est une tâche à part.
Le détail, motif par motif, est dans `schema-gabarits.md`, section « Juges ».

## Points à valider

1. Les prix en centimes : `prix_artisan.prix_ht` est en euros, `numeric` (0038:13). Deux options : une colonne calculée en base (0196), ou
   un montant lu dans l'app. En attendant, la ligne reste « estimée », donc jamais envoyée seule.
2. `deposer_message` est exécutable par `service_role` en plus de `n8n_lecture`, parce que n8n n'a que la clé de service (0194:24-27). La
   consigne disait « n8n_lecture seulement ».
3. Les PDF de devis et de facture : des routes de l'app à exposer à n8n, ou laissées à l'app.
4. `gabarit-artisan-accueil-envoi` ne doit jamais tourner en même temps que le tic de l'app : ce seraient deux expéditeurs sur la même file
   `actions_auto`.

## Ce qui n'a pas été fait

- Aucune migration appliquée, aucun gabarit activé ni publié, aucun envoi, aucun identifiant créé.
- Ni commit, ni push, ni build.
- Les essais n8n (`test_workflow`) des gabarits corrigés n'ont pas été rejoués.
- Les 9 exports `gabarit-ent-*` ne sont pas corrigés : ils ne sont pas dans n8n, et leurs fichiers sont hors de mon périmètre.

## Verdict de la commande `verifier`

Voir `verifier.log` (sortie de `node scripts/orchestre.mjs verifier 036-031`).
