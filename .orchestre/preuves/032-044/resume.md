## Ressources utilisées

- **MCP `cerveau`** (skill `reseau-neuronal` : lecture seule, rien écrit dans le vault) — `regles_pour` (« relances de conversation J+2, J+5, J+10, Studio à valider, Signature qui part seul, e-mail »)
  rend `autonomie-abonnements.md` (Studio prépare, Signature envoie seul : `relances.auto`, `lib/plans.ts:79-80`) et `presti/CLAUDE.md` ; `chercher` rend **ADR-001** et **ADR-008** (n8n-first,
  les relances migrent « une par une » en cinq pas ; seule l'exception S1 à S5 des correctifs de sécurité vaut) et le geste « Relancer un devis sans réponse » du vault (trois façons de relancer dans le
  code, trous connus). Ils fixent le périmètre : pas 1 à 3, l'ancien code reste, le registre commun de 3 jours (S4) et « Ne plus relancer » (L13, 0185) sont des lectures du workflow, jamais une écriture.
- **MCP `n8n-oracle`** — `get_workflow_sdk_reference` (règle 2 : une lecture qui rend zéro élément arrête la chaîne ; `alwaysOutputData` n'est correct que là où un nœud en aval doit tourner à vide,
  ce qui est exactement le cas d'un passage qui croise douze lectures — d'où ce réglage sur onze d'entre elles, et la règle 3 `executeOnce`), `get_workflow_best_practices` (`scheduling` : cron à six champs,
  pas de rattrapage des passages manqués → les relances restent dues ; `notification`), `search_nodes`, `validate_workflow` (le SDK refuse les fonctions fléchées : le code est écrit littéralement),
  `create_workflow_from_code`, `update_workflow` (réglages : fuseau, délai, branche d'erreur), `get_workflow_details` (identifiants de nœuds de l'export), `test_workflow` (exécution **446**),
  `get_workflow_execution` (sorties relevées). Aucun identifiant créé ni modifié ; rien activé.
- **`TOUTES-LES-TRANSCRIPTIONS.md`** (`/home/usine/agents/videos/references-2026-11-02/restructureai/`, lue aux lignes 9-34, 938-944, 1069-1073, 1208-1222 et par recherche des mots « follow », « approval »,
  « stop », « human », 1932 lignes) — « la plupart des artisans n'ont pas un problème de marketing, ils ont un problème de relance » et « nothing goes live without your approval » → Studio prépare et l'artisan
  valide, Signature seule ; « a few days later, it checks back on its own » et la relance J+2 / J+5 → la cadence datée J+2, J+5, J+10 est celle qu'on garde ; « if something's off, it stops and calls the
  owner » → un sujet d'escalade, un mot « STOP », une main prise ou une pause **arrêtent** la relance, jamais ne la contournent. Changé dans le travail : la décision « escalade » est comparée à la vraie
  route sur un message au 5ᵉ rang (relu) et au 11ᵉ rang (non relu), et « STOP » est un cas à part.
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` et `fiches-videos.md`** — l.168-181 (relances datées J+2 / J+5, « jamais deux relances en 3 jours », `lib/relancesRegistre.ts:18`),
  l.173 et 406 (les exclusions et le registre lus avant chaque envoi), l.393 (la relance d'impayé s'arrête sur un motif rangé, pas sur le silence), l.400 (la relance « comme s'il avait accepté » viole la règle de
  ton) : le registre de 3 jours et les exclusions sont des cas du juge ; le ton de la relance n'est pas touché ici (le prompt est transcrit, pas réécrit).
- **Le plan du chantier 4** (§ 0 bis : mention d'IA en marque blanche, « ce que n8n lit », mise en service ; lot L18 « relances » ; lot L13 « Ne plus relancer » et sa question 10), **`.claude/rules/`**
  (`migration-production.md` : pas 1 à 3 ; `autonomie-abonnements.md` ; `securite.md` : rien d'envoyé, aucun identifiant ; `email-brevo.md` : les relances de devis et de factures vivent dans un workflow
  distinct de la prospection froide — c'est le cas, aucun contact de prospection n'y passe) et les modèles **032-040 / 032-042** (forme du juge, du brief, de la preuve) ; `plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.md`.
- **Le code lui-même, joué** : `app/api/cron/relances/route.ts`, `lib/relances.ts`, `lib/relancesRegistre.ts`, `lib/email.ts`, `lib/notifications.ts`, `lib/plateformeConfig.ts`, `lib/plateformeAcces.ts`,
  `lib/pilote/regles.ts`, `lib/plans.ts`, `lib/mentionAssistant.ts` — la comparaison n'est pas une lecture, c'est la vraie route exécutée avec des doublures. Les listes de mots d'escalade, les expressions et
  les offres du nœud sont **générées** depuis `lib/pilote/regles.ts` et `lib/plans.ts` (`generer.mjs`), jamais retapées.

## Le workflow

`presti-relances`, n8n d'Oracle, **id `2VwYlKx60iX8z4pg`**, `active: false`, aucune version publiée (`activeVersionId: null`), fuseau `Europe/Paris`, 21 nœuds.
Export : `presti-relances.workflow.json` (écrit par `exporter.mjs` depuis les sources des nœuds Code (`noeuds/`) et les identifiants rendus par n8n (`ids.json`) ; copie dans
`plans/011-cadrage-01-11/briefs/c4-n8n-relances.workflow.json`). **Honnêteté sur l'export** : le lien avec n8n est tenu par le rejeu — le juge rejoue le code de l'export sur la pin data de l'exécution 446 et retrouve,
au caractère près, les sorties que n8n a rendues pour `Decider`, `Modele epingle` et `Courriers a envoyer` (un code différent de celui de n8n ferait rougir ce contrôle) ; les paramètres des douze lectures
ont été relus sur `get_workflow_details` après la création (lecture à l'œil, pas un différentiel machine : le rejeu ne couvre que les trois nœuds Code). Une fois par jour à 8 h → l'instant du passage → douze lectures `GET` (aucune écriture) → `Decider` → `Modele epingle` (**épinglé : un nœud Code sans réseau
ni module, aucun appel**) → `Courriers a envoyer` → deux filtres en parallèle → **deux nœuds d'envoi désactivés, sans identifiant, sans « envoyé avec n8n »** (relance : `pied: mention` ; avis à l'artisan :
`pied: aucun`). « Supabase account » existait ; `presti-erreurs` désigné comme workflow d'erreur. Détail : `plans/011-cadrage-01-11/briefs/c4-n8n-relances.md`.

## L'essai à blanc

`test_workflow` sur pin data fictive (`essai-pin.json`, noms « Exemple NNN. », adresses `@exemple.test`), **exécution 446, `success`** (03/11/2026 08:22:19 UTC, 112 ms en tout) ; sorties : `essai-n8n.json`.
Neuf relances dues sur huit conversations (une dixième, future, n'est pas lue) : Signature J+2 et J+5 → **2 relances parties** avec la mention d'IA ; Studio J+10 → **1 préparée « à valider »** (avis à l'artisan) ;
Signature par téléphone → part sans courrier ; client en discussion → annulée ; « STOP » dans un message du client (mot de l'artisan) → annulée ; trace de l'assistant récente → laissée due ; offre sans plateforme →
annulée ; deuxième relance de la même conversation → laissée due. Les envois sont désactivés : rien n'est parti ; le modèle est épinglé : aucun appel, aucun crédit.

## Comparaison à l'ancien code

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/relances-n8n-qa.mjs` → **OK, code 0** (`relances-n8n-qa.txt`). Le juge **joue la vraie `app/api/cron/relances/route.ts`** sur 21 cas
(base en mémoire, vraie `lib/email.ts` avec un `fetch` qui note ce que Resend recevrait, vraie `lib/notifications.ts`, vrai registre, vrai `sujetDuFil`, horloge figée), en déduit ce qu'elle fait de chaque relance
(annulée, laissée due, préparée, partie), rejoue l'export (**ses nœuds HTTP exécutés d'après leurs paramètres contre les mêmes tables**, puis les nœuds Code et les gabarits d'envoi) et compare **l'effet, la décision et
le courrier entier** (`From`, `To`, sujet, texte avec la mention, `Reply-To`) : **262 décisions, 111 relances et 84 avis identiques** à ceux de la route, aux écarts écrits près. Cas par cas :

| Cas | Route | n8n | Résultat |
|---|---|---|---|
| **J+2, J+5, J+10**, Signature, e-mail, trois conversations | trois relances parties, mention d'IA, `Reply-To` de l'artisan | idem | identiques |
| Relance pas encore due ; relance déjà partie | ni lue ni touchée | ni lue ni touchée | identiques |
| **Le client a répondu** (en discussion, gagné, perdu, nouveau) ; demande ou compte disparus | annulée | `annulee` / `lead_clos`, `lead_absent`, `compte_absent` | identiques |
| **STOP** (mot de l'artisan), « fuite », « avocat », « urgence » au 5ᵉ message ; « fuite » au 11ᵉ message ; mots de l'artisan absents | annulée ; le 11ᵉ message n'est pas relu ; part | idem | identiques |
| **Exclu** (« Ne plus relancer » : conversation, client d'un devis) ; exclusion levée | la route ne lit pas la table : elle relance | `annulee` / `exclu` ; exclusion levée : part | **V1** (n8n plus strict, voulu) |
| **Registre de 3 jours** : assistant, CRM, impayés seuls ou avec l'assistant ; relance de conversation ; action non exécutée / autre outil ; date illisible ; 2 j 23 h 59 / 3 j 0 h 1 | laissée due / part ; illisible : laissée due | idem | identiques |
| **Studio à valider** : préparée, avis à l'artisan ; une par conversation et par passage ; préférence coupée ; sans e-mail ; `.invalid` | proposition dans le fil, avis, rien au prospect | `prepare` ; avis `proposition`, `desactive`, `sans_email`, `adresse_de_test` | identiques |
| **Signature qui part seul** : e-mail ; téléphone (deux relances) ; contact vide | relance avec mention ; tracée sans courrier | `part_seul` ; `pas_un_courriel` ; `sans_coordonnees` | identiques |
| Essai, Essentiel, offre inconnue ; compte de démonstration ; Business, Entreprise | annulée ; annulée ; part | idem | identiques |
| Suspendu ; suspension levée ; artisan en pause ; main prise | laissée due ; part ; laissée due ; annulée | idem | identiques |
| Adresse `.invalid` ; casse mélangée ; **adresse atypique** | « partie » sans courrier ; part ; **part** | idem ; idem ; **laissée due** | **E2** |
| **Pause générale** posée | rien n'est lu | n8n ne sait pas la lire : il décide | **E1** (bloquant, voir « Avant la bascule », 1) |
| **Plafond de 80 envois** (86 dues, une conversation close après la coupure) | s'arrête à la 81ᵉ, le reste (même la close) reste dû | idem | identiques |
| **Cent relances par passage** (105 Studio) | 100 lues, 80 avis puis plus d'avis, 5 non lues | idem | identiques |
| **Nuit et week-end** (samedi 8 h ; dimanche 3 h 30) | aucune plage horaire : une relance due la nuit part, une due à 8 h 00 min 30 attend | idem | identiques |
| Modèle en panne ; vide ; texte déjà signé de la mention | texte de repli par rang ; une seule mention | idem | identiques |
| Noms chargés (`&`, guillemets, chevrons) ; artisan sans nom ni adresse ; nom sur deux lignes | `From` nettoyé, sujet brut | idem ; sujet **sur une ligne** | identiques ; **V2** |
| Deux relances dues rangées à l'envers | la première de la base part | la plus ancienne part | **V3** |

**« STOP »** : la route n'a pas de désinscription sur un message entrant ; le cas du juge est un mot d'escalade réglé par l'artisan (`escalade_mots`), le même que celui qui arrête la réponse seule.
**76 mutants, tous rouges** : un client exclu relancé, le registre de 3 jours ignoré (entier, un jour au lieu de trois, chaque chemin, date illisible), Studio qui part seul, mention ôtée (nœud ou texte), envoi hors
simulation (nœuds activés, identifiant SMTP, « envoyé avec n8n »), « Presti » dans le message ou l'expéditeur, `Reply-To` perdu, escalade ou mots de l'artisan ignorés, un seul ou vingt messages relus, client
qui a répondu / main prise / offre sans plateforme / démonstration / suspendu / pause relancés, deux relances le même jour, plafonds retirés, échéance non filtrée, lecture vide qui arrête la chaîne, modèle qui
répond autre chose / appelle le réseau / remplacé par un POST / non déclaré, workflow actif, branche d'erreur retirée, exécutions réussies gardées, déclencheur à la minute, etc. (liste complète : `relances-n8n-qa.txt`).
Garde commune `n8n-specs-qa` sur l'export : R1 à R7 tenues.

## Avant la bascule

Pas 4 et 5 : rien n'est fait ; l'ancien code (`app/api/cron/relances/route.ts:74-241`) tourne toujours. Ce que Benj décide, dans l'ordre (détail et justifications dans le brief) :
1. **La pause générale (bloquant)** : n8n ne la lit pas (`ops_interrupteur` est une fonction `STABLE` réservée au rôle de service ; la garde ne connaît que `GET` sur une table avec `select=`). Recommandé : une vue
   étroite d'une ligne, lue en `GET`, le workflow s'arrêtant si la pause est posée **ou illisible** ; migration collée avant toute publication. Écart E1, prouvé par le juge.
2. **Les écritures que n8n ne peut pas faire** (prise de la relance, annulation, relâche, message du fil, rejet de l'ancienne proposition, push, compte rendu du passage) : des fonctions en base écrites par n8n
   (exception à 0189), **idempotentes** et dans l'ordre prise → envoi → relâche. Route et n8n partagent `relances.envoyee` : une relance n'est prise que par un des deux, **jamais deux fois**, même en chevauchement.
3. **Le nœud de modèle et la garde commune** : la liste blanche « c4 » de `scripts/n8n-specs-qa.mjs` n'admet aucun nœud de modèle (fichier hors périmètre ici) ; colonnes à ouvrir pour le prompt (métier, ton, profil, persona).
4. **Ce que n8n lit** : le texte des messages entrants des clients et la demande d'origine, déclarés « lecture au moment d'envoyer » ; vue étroite (0189), section du registre des traitements, durée des exécutions en erreur.
5. **La migration 0185 posée avant la publication** (sinon la lecture des exclusions arrête le passage, voulu) et **l'exception B** (question 10) : V1.
6. **Le plafond d'e-mails du jour** (Resend gratuit : 100 par jour ; trois workflows de Presti comptent chacun leurs envois). 7. **L'identifiant SMTP** (réglage de compte, interdit à un agent), puis réactiver les deux nœuds.
8. **Un passage d'ombre** de quelques jours (envois désactivés, comparaison chaque matin aux compteurs de la route). 9. **L'heure** : 8 h à Paris contre 8 h UTC.
10. **Pas 4** : un drapeau neuf `relancesParN8n` (baissé) qui saute la seule boucle des relances de conversation ; publier, constater un passage, **puis** lever le drapeau (un chevauchement ne double rien, voir 2). Retour :
    baisser le drapeau et dépublier ensemble. 11. **Pas 5** : `relancesParN8n` seul gouverne ce chemin (`lib/flags.ts` fait foi).

**Constat hors périmètre, non touché** : `presti-reponse-seule` (032-042) et `presti-accuse-reception` (032-040) n'ont pas `alwaysOutputData` sur leurs lectures ; une lecture qui rend un tableau vide arrête leur
chaîne dans n8n (règle 2 du SDK : zéro élément, les nœuds suivants ne tournent pas), ce que leur pin data (toujours remplie) ne montre pas. À reprendre avant leur publication (détail : le brief).

## Fichiers

- `scripts/relances-n8n-qa.mjs` (neuf) — le juge ; hors `SUITES` du lanceur des suites (interdit à cette tâche) : à y ajouter par la session principale (il joue la vraie route avec des doublures, aucune base,
  aucun réseau, environ une minute avec les 76 mutants).
- `plans/011-cadrage-01-11/briefs/c4-n8n-relances.md` et `.workflow.json` (neufs).
- `.orchestre/preuves/032-044/` : `presti-relances.workflow.json`, `ids.json`, `essai-pin.json`, `essai-n8n.json`, `relances-n8n-qa.txt`, `resume.md`, `generer.mjs`, `workflow-def.mjs`, `sdk.mjs`, `sdk.txt`,
  `exporter.mjs`, `noeuds/` (sources des nœuds Code : `passage.js`, `decider.modele.js`, `decider.js` généré, `modele.js`, `courriers.js`), `verifier.log`.
- n8n d'Oracle : `presti-relances` (`2VwYlKx60iX8z4pg`), inactif. Aucun autre workflow touché, aucun identifiant, aucune base lue ou écrite, aucun appel de modèle, aucun envoi.
