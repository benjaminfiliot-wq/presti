## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« n8n, publication, workflow, données ») : n'a rendu que la source des dépôts n8n (inspiration, jamais
  importés) et la règle des comptes non Presti. Effet : aucune règle neuve ; je m'en tiens à `securite.md` (publication = geste de Benj) et
  à `migration-production.md` (table absente = pas de publication).
- **MCP `cerveau`, `chercher` et `lire`** (« EXECUTIONS_DATA_MAX_AGE purge des exécutions n8n Oracle durée échecs ») : a remonté le
  registre § 23 bis (`docs/registre-traitements.md:350` : durée des échecs « à fixer par le fondateur avant la publication ») et la fiche 3
  de `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (purge **active par défaut**, 336 h ou 10 000 exécutions). Effet : la
  durée des échecs est **bornée par défaut à 14 jours**, mais je ne peux pas la relever sur l'instance (`/opt`, docker interdits) ; je
  l'écris comme condition de Benj, pas comme un réglage de workflow.
- **MCP `n8n-oracle`**, en lecture seulement : `search_workflows` (8 workflows `presti-*`), `get_workflow_details` sur les sept,
  `search_workflow_executions` (333 et 334 toujours présentes ; aucune exécution des six depuis 032-037), `get_workflow_best_practices`
  (`scheduling` : pas de rattrapage d'un passage manqué, pas de chevauchement ; `monitoring` : pas de fiche). Effet : tous les constats
  ci-dessous portent sur l'état **en ligne** de ce soir, pas sur les exports seuls. Aucune modification, publication ni exécution.
- **Fiche `fiche-methode-n8n.md`** (points 5, fiche 2, fiche 3) et **`fiches-depots.md`** fiche 4 : un workflow d'erreur commun posé
  dans chaque workflow, qui ne part jamais sur une exécution manuelle. Effet : la chaîne d'alerte presti-erreurs ne peut pas être essayée
  avant la première vraie panne ; je le note comme risque, pas comme défaut.
- **Vidéos déjà analysées** : `plans/analyse-videos.md:144` (« alerte e-mail à Benj en cas d'échec d'un workflow », rang 26). Effet :
  je juge presti-erreurs sur ce qu'il envoie (une alerte sans donnée), et je compte les alertes qu'il enverrait (démo : 96 par jour).
- **Preuves amont** : `032-029/rapport.md` (« Ce qu'il faut pour publier en simulation », annexes A et B), `032-033/resume.md`,
  `032-037/resume.md` et sa question ; script de colonnes `032-029/colonnes-contre-0189.mjs` (repris et étendu à 0190 et 0191).
- **Juges** rejoués un par un : `suivi-artisan-qa`, `briefing-n8n-qa`, `detecteurs-n8n-qa`, `sauvegarde-n8n-qa`, `demandes-demo-qa`,
  `n8n-specs-qa` (et une seconde fois sur le briefing et le suivi).
- **Non chargés, et pourquoi** : skills de design, de pages et de vidéo (sans objet). `security-review` (skill) revoit un diff de branche :
  ici aucun code n'a changé, je l'ai remplacé par la lecture des nœuds en ligne (types, méthodes, URL, colonnes, identifiants).
  `presti-audit-attaque` est un sous-agent qui tente des exploits contre l'app : interdit ici (aucune requête vers la production).

# 032-038 — audit des réglages du soir et feu vert, workflow par workflow, pour publier en simulation

Fait le 02/11/2026 au soir par Claude Code (Opus 5.5), hôte d'agents Oracle, `/home/usine/Documents/presti`. Je n'ai écrit ni ces
workflows, ni l'audit 032-029, ni les correctifs 032-033 et 032-037. Lecture seule dans n8n ; aucune requête vers Supabase ni vers la
production ; aucun fichier hors de ce dossier. **Je ne publie rien** : la publication est un geste de Benj.

## En une ligne

Les réglages de 032-033 et 032-037 sont **posés en ligne, identiques aux exports, et les six juges sont verts sur eux**. Le briefing et
les détecteurs ne font que lire (GET aux colonnes permises) et calculer : **feu vert technique pour les publier en simulation**, sous deux
gestes de Benj qui ne touchent pas aux workflows. Les quatre autres ne sont **pas encore** publiables : il leur manque une table
(`suivi_artisan_envois`, `demandes_demo`) ou un identifiant SSH, et trois d'entre eux envoient ou écrivent pour de vrai.

## Ce qui a été vérifié, et comment

1. **L'état en ligne** (`controle-en-ligne.mjs`, sortie `controle-en-ligne.log`, **0 écart**) : le script relit les réponses du MCP
   enregistrées par le harnais (journal de session, et le fichier `tool-results` des détecteurs, 83 707 caractères) et contrôle, pour
   chacun : inactif et jamais publié (`active: false`, `activeVersionId: null`, `triggerCount: 0`) ; `errorWorkflow = AQeHiC58UgbMR4Kr`
   (presti-erreurs) ; `saveDataSuccessExecution: none` ; `saveDataErrorExecution: all` ; fuseau `Europe/Paris` ; **en ligne = export**
   reposé par 032-037 (sha256 de `nodes`, `connections`, `settings`, et `versionId` identiques) ; chaque nœud classé (lecture, calcul,
   envoi, écriture ou commande sur l'hôte) ; chaque nœud HTTP : méthode, hôte, absence de corps ou d'en-têtes, colonnes de `select=`
   confrontées aux droits de `n8n_lecture` (0189, 0190, 0191) ; chaque nœud Code : son empreinte sha256 retrouvée dans le juge du lot.
2. **presti-erreurs** (`AQeHiC58UgbMR4Kr`) : `active: true`, `activeVersionId` = `versionId` = `feb50b6a-9cb2-48b8-8143-ca50845c06cd`,
   `activeVersion.sameAsDraft: true`, sans `errorWorkflow` (pas de boucle), `saveDataSuccessExecution: none`, `executionTimeout: 60`.
   Error Trigger → Code « Message sans donnée » → Slack `#presti-auto` (« Slack account 2 », `includeLinkToWorkflow: false`). Relu le
   code en ligne : ne sortent que le nom du workflow (s'il a la forme `presti-…`), le nœud (liste fermée de caractères, 60 au plus), le
   numéro (chiffres seuls) et l'heure ; jamais `execution.error`, `execution.url` ni `trigger.error`. Identique à l'export de 032-033.
3. **Les juges**, rejoués l'un après l'autre sur les exports (égaux à l'état en ligne, point 1) : `juges-resume.log`.

| Juge | Code | Durée | Ce qu'il dit (dernières lignes de `juge-*.log`) |
|---|---|---|---|
| `suivi-artisan-qa.mjs` | 0 | 103 s | OK ; 63/63 mutants rouges pour la raison attendue ; textes égaux au brief |
| `briefing-n8n-qa.mjs` | 0 | 64 s | OK ; mêmes priorités que `composerBriefing` (29 passages fixes, 320 tirés) ; sortie en liste blanche |
| `detecteurs-n8n-qa.mjs` | 0 | 209 s | OK ; propriété sur 3 792 cas, niveau ≤ plafond de l'offre ; essai 335 rejoué hors ligne |
| `sauvegarde-n8n-qa.mjs` | 0 | 5 s | VERTE ; 22 + 25 cas rejoués |
| `demandes-demo-qa.mjs` | 0 | 115 s | vert |
| `n8n-specs-qa.mjs` | 0 | 0 s | OK ; presti-detecteurs R1 à R7 tenues ; 88 mutants |
| `n8n-specs-qa.mjs` sur briefing et suivi | 0 | — | R1 à R7 tenues sur les deux (`juge-n8n-specs-qa-briefing-suivi.log`) |

Le rouge de 032-037 (deux mutants périmés de `n8n-specs-qa`) est **fermé** : les deux mutants ôtent maintenant aussi
`settings.errorWorkflow` (`scripts/n8n-specs-qa.mjs:388-389`) et rougissent pour R3 (sortie : « → R3 aucune branche d'erreur »).

## Les six verdicts

### presti-detecteurs (`J8pduyxn9seR8Z9t`)

VERDICT presti-detecteurs : PUBLIABLE EN SIMULATION

- **Réglages relus en ligne** : inactif, jamais publié ; `errorWorkflow` = presti-erreurs ; succès `none` ; échecs `all` ; Paris ;
  `versionId 9106bdf6-2b45-45cb-b274-8f672ef12b12` = export ; nodes `0f9712782e29…` identiques.
- **Aucun nœud d'envoi ni d'écriture** : 41 nœuds = Schedule ×1, Supabase ×1 (`getAll`, `regles_automatisation`, `limit 1`), Code ×19,
  HTTP ×18 (**tous `GET`**, tous vers `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/`, sans corps ni en-têtes), Error Trigger ×1
  relié à « Message d échec » (un nœud **Code**, aucun envoi), note ×1. Aucun nœud désactivé, aucun `onError`, `continueOnFail` ni reprise.
- **Colonnes lues** : 14 lectures sur des colonnes accordées par 0189 ; 4 tables sans droit pour `n8n_lecture`
  (`relances_impayes_arrets`, `relances_impayes_reglages`, `prix_artisan`, `pilote_reglages`) : déclaré au brief et à l'audit (D-M2, moyen),
  sans effet aujourd'hui (l'identifiant est « Supabase account », la clé du projet), à régler **avant** de passer au rôle à droits
  limités. Aucune colonne de nom, d'adresse, d'e-mail, de téléphone ni de texte (annexe A de 032-029, recontrôlée).
- **Juge rejoué** : `detecteurs-n8n-qa` OK, 19/19 empreintes de nœuds Code retrouvées ; `n8n-specs-qa` OK.
- **Conditions de Benj, hors du workflow, au moment de publier** : (1) **la durée des échecs** : rien ne la borne par workflow ; la purge
  de l'instance est active par défaut à 336 h (fiche méthode, fiche 3), non relevée ici (lecture de `/opt` interdite). Le registre
  (`docs/registre-traitements.md:350`) veut une durée « fixée par le fondateur avant la publication » : poser
  `EXECUTIONS_DATA_MAX_AGE=168` (recommandation de 032-033) ou écrire au registre que 14 jours sont retenus ; (2) **supprimer les
  exécutions 333 et 334** (vraies données de `regles_automatisation`, toujours présentes : `search_workflow_executions` de ce soir).
  Aucun des deux ne change le workflow ; le second est dû que l'on publie ou non.

### presti-briefing-matin (`xPIDCvkp8Gk08A2E`)

VERDICT presti-briefing-matin : PUBLIABLE EN SIMULATION

- **Réglages relus en ligne** : inactif, jamais publié ; `errorWorkflow` = presti-erreurs ; succès `none` ; échecs `all` ; Paris ;
  `versionId d19fec51-b268-41be-bea2-9999bdfff1fe` = export ; nodes `8a9d3abcb315…` identiques.
- **Aucun nœud d'envoi ni d'écriture** : 19 nœuds = Schedule ×1 (7 h 30), Code ×11, HTTP ×7 (**tous `GET`** vers l'API du projet, sans
  corps ni en-têtes). La seule sortie est « Bilan du passage », agrégée, sans identifiant de compte ; les lignes « à écrire » restent
  dans le nœud précédent et, succès `none`, ne sont **pas gardées**.
- **Colonnes lues** : les 7 lectures sont dans 0189 (`messages` : `lead_id, sens, etat, sent_at`, jamais le contenu).
- **Juge rejoué** : `briefing-n8n-qa` OK, 11/11 empreintes ; `n8n-specs-qa` R1 à R7 tenues.
- **Condition de Benj** : la même durée des échecs (condition (1) des détecteurs). Un échec survient exprès dès qu'une lecture est
  douteuse (« Contrôle des lectures ») : il est alors gardé avec ce qu'il a lu (identifiants, montants), jusqu'à la purge, et presti-erreurs
  prévient `#presti-auto` sans donnée.

### presti-suivi-artisan (`2HsfV00lGSX1KGY1`)

VERDICT presti-suivi-artisan : PAS ENCORE

- **Réglages relus en ligne** : tous bons (inactif, `errorWorkflow`, succès `none`, échecs `all`, Paris ; `8cd9a2dc…` = export ;
  nodes `b61a5f27505f…` identiques). **Aucun nœud d'envoi ni d'écriture** : Schedule, Code ×8, HTTP ×5 tous `GET`, note.
- **Juge rejoué** : `suivi-artisan-qa` OK (63/63 mutants, 8/8 empreintes) ; `n8n-specs-qa` R1 à R7 tenues.
- **Ce qui manque** : (1) **la table `suivi_artisan_envois` n'existe pas** : 0191 est préparée, en tête « NON APPLIQUÉE », elle attend le
  « go » écrit de Benj. Publié ce soir, le workflow échouerait **chaque matin à la 5e lecture**, après avoir lu les comptes, demandes,
  devis et factures réels, et garderait ces lectures dans l'exécution en échec (S-2 de 032-029) ; (2) après 0191, **une lecture réelle du
  registre** qui prouve qu'il répond ; (3) `artisans.notifications` n'a de droit pour `n8n_lecture` que dans 0191 (même migration) ;
  (4) avant tout envoi (pas pour la simulation) : le texte S-M1 (« Une première demande est arrivée **sur votre page** », toujours dans
  le nœud « Textes du suivi (brouillons) » en ligne) et la validation des six textes par Benj.

### presti-sauvegarde (`16Gbnw1jg1JmFbfV`)

VERDICT presti-sauvegarde : PAS ENCORE

- **Réglages relus en ligne** : tous bons (`errorWorkflow`, succès `none`, échecs `all`, `executionTimeout: 1200`, Paris ; `90fa1b61…` =
  export ; nodes `2846b15e9100…` identiques). **Juge rejoué** : `sauvegarde-n8n-qa` VERTE, 3/3 empreintes.
- **Ce n'est pas un workflow de simulation** : il **écrit et efface sur l'hôte** par SSH (« Lancer la sauvegarde », « Écrire le
  battement », « Purger les archives de plus de 14 jours » : `find … -mtime +14 -delete`) et **envoie** sur Slack (« Alerte Slack
  (échec) », branche principale ; « Alerte Slack (erreur du workflow) », branche d'erreur interne).
- **Ce qui manque** : (1) **aucun identifiant SSH** sur les quatre nœuds SSH (`AUCUN identifiant` au contrôle) : publié tel quel, il
  échouerait dès « Lancer la sauvegarde », chaque nuit à 3 h 40 ; l'identifiant est un geste de Benj (`securite.md` : aucun agent ne
  saisit une clé) ; (2) les préconditions de `scripts/sauvegarde.mjs` (clé de service, clé publique de sauvegarde ; code 2 sinon) ;
  (3) un essai réel au « go » de Benj, puisqu'il ne s'essaie pas en simulation. Note : avec `errorWorkflow` posé, son Error Trigger
  interne ne part plus ; presti-erreurs alerte à sa place, sans le lien du brief (dit en 032-033).

### presti-garde-sauvegarde (`2uovL6sfTnINC3ka`)

VERDICT presti-garde-sauvegarde : PAS ENCORE

- **Réglages relus en ligne** : tous bons (`executionTimeout: 600` ; `f68c4b7e…` = export ; nodes `1b6176af604d…` identiques).
  **Juge rejoué** : `sauvegarde-n8n-qa` VERTE, 2/2 empreintes.
- **Écrit et envoie** : « Écrire le battement de la garde » (SSH, fichier sur l'hôte), « Alerte Slack (garde) » et l'alerte d'erreur interne.
- **Ce qui manque** : (1) **aucun identifiant SSH** sur ses quatre nœuds SSH ; (2) **presti-sauvegarde d'abord** : sans archive du jour
  ni battement, la garde alerterait chaque matin à 4 h (« pas d'archive du jour », « le battement manque ») : une fausse alarme par jour
  tant que la sauvegarde n'est pas publiée et verte.

### presti-demande-demo (`4R2wS9374GUxb63F`)

VERDICT presti-demande-demo : PAS ENCORE

- **Réglages relus en ligne** : tous bons (`8e9ec1e2…` = export ; nodes `bc3b2f735120…` identiques). **Juge rejoué** :
  `demandes-demo-qa` vert, 2/2 empreintes. Lectures : 2 × `GET demandes_demo (id,taille,activite,etat,cree_le)`, colonnes accordées
  par 0190 seulement ; aucun prénom, adresse ni message lu, et le code les écarte s'ils venaient.
- **Il envoie** : « Prévenir Benj (#presti-auto) », Slack, branche principale (un avis interne à Benj, jamais au demandeur). Ce n'est donc
  pas une simulation : publié, il prévient pour de vrai.
- **Ce qui manque** : (1) **la table `demandes_demo` n'existe pas** : 0190 « NON APPLIQUÉE », attend le « go » de Benj. Publié ce soir,
  il échouerait **toutes les 15 minutes** (déclencheur `0 */15 * * * *`) : **96 échecs par jour, donc 96 alertes de presti-erreurs** dans
  `#presti-auto` ; (2) puis le drapeau `demandesDemo` levé (`lib/flags.ts:320-323`, aujourd'hui `false`) pour que `/api/contact` range les
  demandes, dans l'ordre « migration appliquée et contrôlée, PUIS drapeau » ; sinon la table reste vide et le workflow tourne à vide.

## Ce que Benj fait pour publier ce soir les deux premiers (rien ici n'est fait par moi)

1. Choisir la durée des échecs : `EXECUTIONS_DATA_MAX_AGE=168` dans `/opt/n8n-complet` (et `EXECUTIONS_DATA_PRUNE=true`), ou garder le
   défaut de 336 h en l'écrivant au registre § 23 bis.
2. Supprimer les exécutions 333 et 334 de presti-detecteurs.
3. Publier presti-detecteurs et presti-briefing-matin (`publish_workflow`, ou le bouton dans n8n), puis relire `active: true` et
   `activeVersionId` = `9106bdf6…` et `d19fec51…`. Rien d'autre ne bouge.
4. Le lendemain : une exécution de production de chacun, en succès, sans donnée gardée (`saveDataSuccessExecution: none`) ; le
   bilan ne se lit donc **pas** dans les exécutions. Pour voir le bilan d'un passage, il faut une exécution manuelle (gardée selon le
   défaut de l'instance) ou attendre la table de la voie (a).

## Risques et points à valider

- **La chaîne d'alerte n'a jamais tourné** : un Error Trigger ne part que sur l'échec d'une exécution de production (fiche méthode,
  fiche 2). Le premier échec réel sera le premier essai de presti-erreurs et de « Slack account 2 » depuis ce chemin.
- **Le bilan d'un succès n'est plus visible** (succès `none`) : c'est voulu (aucune donnée gardée), mais en simulation on ne lit plus
  rien d'un passage réussi. Si Benj veut lire le bilan agrégé, il faut une sortie dédiée sans donnée (lot suivant), pas rouvrir les succès.
- `availableInMCP: true` sur les sept (S-F1, B-M1, D-F3, faible) : tout client MCP de l'instance peut lancer ces workflows à la main ;
  un lancement manuel garde ses données selon le défaut de l'instance. Hermes n'a que la lecture (`architecture-outils.md`).
- D-F2 (détecteurs) : le filtre `artisan_id=in.(…)` grandit avec le nombre de comptes ; au-delà d'une longueur d'adresse non mesurée,
  la lecture échoue en bloc (échec, alerte, aucune fausse donnée).
- presti-erreurs n'a pas de juge de lot : l'empreinte de son nœud Code n'est dans aucun script (`controle-en-ligne.log`, dernière
  section). Je l'ai relu à la main (point 2) ; un juge qui l'épingle serait plus sûr avant d'y brancher d'autres workflows.
- Un passage manqué (n8n arrêté) n'est pas rattrapé (`get_workflow_best_practices`, « scheduling ») : sans conséquence pour un point du
  jour ; les détecteurs se rattrapent par leurs clés d'étape.

## Fichiers de ce dossier

`controle-en-ligne.mjs` et `controle-en-ligne.log` (état en ligne contre exports, juges et droits) ; `juges-resume.log` et les sept
`juge-*.log` ; `verifier.log` (sortie de `node scripts/orchestre.mjs verifier 032-038`) ; `avant.txt`, `decisions-avant.md` (posés par
l'orchestre à la prise de la tâche).
