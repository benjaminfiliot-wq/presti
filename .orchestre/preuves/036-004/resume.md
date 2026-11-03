## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle` (n8n local d'Oracle), sous-agents. Les skills de design, de vidéo et de pages ne servent pas ce domaine (aucune page, aucune vidéo) et n'ont pas été chargés.

- **Skill `reseau-neuronal`** : chargé en premier ; il impose `regles_pour` puis `chercher` et interdit d'écrire dans le vault. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique ») a rendu ADR-004 (Brevo : les relances de devis et de factures vivent dans un workflow distinct de la prospection froide, ce qui est le cas : aucun contact de prospection ne passe par le Suivi). `chercher` a rendu le brief `c4-n8n-relances.md` (le cron), la note `Geste - Relancer un devis sans réponse` (trois façons de relancer dans le code, trous connus), le plan du chantier 4 (S4, le registre commun) et la compétence `competences/suivi.md`, écrite en parallèle par un autre lot : elle dit la même chose que ce lot (Studio : relances en lot à valider le lundi ; Signature : `relance_devis` après le délai du pilote ; note d'intérêt par le code). Effet : la forme de l'écart « pause générale », le jour du lot, la place de la note d'intérêt (elle ordonne, elle ne décide jamais).
- **Le prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : partie 0, lignes A12 (relances datées et note d'intérêt) et A20 (contrôleur de conflit), § 0.6 (n8n-first, white-label, idempotence, mode à blanc). Effet : un chef de département qui appelle des `lib-*`, jamais de calcul d'argent dans n8n, « Supabase account » qui passe outre la RLS donc une lecture sans filtre sur le compte est un défaut.
- **La première réponse, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** : ligne 036-004 du § 4 et ses critères de sortie (jamais deux relances en 3 jours, conflit = rien, décisions identiques au cron), § 3.3 (le tableau Studio / Signature, vérifié au fichier:ligne), § 5 (les cinq décisions à leur défaut). Effet : la table Studio / Signature du chef et les mutants du juge.
- **Les fiches vidéo, `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`** (lignes 168-181 : relances datées J+2 / J+5 et note d'intérêt « avant de déranger un humain » ; lignes 237-245 : le « contrôleur de conflit » qui écarte ce qui concurrence un existant avant d'agir ; ligne 40 : la file d'approbation à feu vert groupé est la carte de lot de `lib/assistant/cartes.ts`). Effet : la note d'intérêt sert à ORDONNER les relances proposées, pas à envoyer ; le contrôleur passe avant tout geste ; la carte de lot reprend le format de `apercuLotRelances`.
- **MCP `n8n-oracle`** : `search_workflows` (identifiants des sept `lib-*` appelés), `get_workflow_best_practices` (`human_in_the_loop` : aucune documentation ; `notification` : prévenir l'alerte vide, d'où les branches « Rien à … ? » qui sautent un appel sans entrée), `validate_workflow`, `create_workflow_from_code` (contrôleur, banc), `update_workflow` (le squelette de 036-001 devient le Suivi : 72 opérations en 7 lots, puis 5 mises à jour de nœuds), `test_workflow` (quatre essais à données épinglées), `get_workflow_execution` et `get_workflow_details` (les exports). Aucun `publish_workflow`, aucun identifiant créé ou modifié. `get_workflow_sdk_reference` n'a pas été rappelé : les programmes SDK reprennent les constructions déjà validées de 036-001 et 036-003, et `validate_workflow` les a acceptés.
- **Les gabarits déjà construits, repris et non refaits** : le nœud « Contrat » de `.orchestre/preuves/035-003/` (`codeEntree`, `codeSortie`), les `lib-relancer`, `lib-decider`, `lib-rediger-message` (modèle épinglé), `lib-porte-conformite`, `lib-executer` et `lib-journaliser` de 035-004 et 035-005, le chef Accueil de 036-001 (forme du chef), la fabrique, le rapatriement et le juge de 036-003 (`boite-n8n-qa.mjs`), et le juge du cron `scripts/relances-n8n-qa.mjs` (sa base en mémoire et sa doublure de la route sont reprises dans mon juge ; le sien reste vert).
- **`.claude/rules/*.md`, `CLAUDE.md`, `.orchestre/contexte.md`** : `migration-production.md` (pas 1 à 3 seulement ; l'ancien code tourne toujours), `architecture-outils.md` (n8n-first, aucun identifiant), `securite.md` (rien d'envoyé, pas de migration, pas de secret), `autonomie-abonnements.md` et `lib/plans.ts` (les capacités `relances`, `relances.auto`, `assistant.pilote` sont relues au code par le juge).
- **Le code de l'application, lu et JOUÉ, jamais modifié** : `lib/relancesRegistre.ts` (le vrai `historiqueRelances` lit ce que n8n écrirait), `lib/pilote/regles.ts` (`sujetEscalade`, listes du pilote), `lib/plans.ts` (`peut`), `lib/assistant/cartes.ts` (le vrai `apercuLotRelances` rend la carte de lot), `lib/assistant/outils-actions.ts` (`LOT_RELANCES_MAX`), `lib/relances.ts` (`CADENCE_RELANCES`, `sujetDuFil`), `lib/agents/sortie.ts` et `lib/agents/pause.ts` (la pause générale), et la VRAIE route `app/api/cron/relances/route.ts`.
- **Sécurité** : `ecc:security-review` et `presti-audit-attaque` n'ont pas été invoqués comme outils (aucun diff applicatif : `app/**`, `lib/**`, `supabase/**` intouchés) ; leurs points sont appliqués dans le juge : isolation par compte (M1 à M3), aucun secret ni adresse dans un export (H1), « Presti » absent des textes vers un client (H2), rien de fait en simulation (G4).

## Ce qui est construit : dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Nœuds | Rôle | Appelants permis |
|---|---|---|---|---|
| `presti-dep-suivi` | `jo8eQMEwiB9wCbKN` | 31 | le chef du département 3 (le squelette de 036-001 devient le vrai chef, même identifiant) | `presti-cerveau` (`596OC5mL2aMBq6SD`), `presti-banc-suivi` |
| `lib-controler-conflit` | `F2son8oGwifPETg3` | 8 | le contrôleur de conflit (A20) | `presti-dep-suivi` |
| `presti-banc-suivi` | `95LajsFcVM4AALac` | 6 | le banc : deux comptes fictifs (Studio, Signature), 13 dossiers chacun, un lundi | aucun (`none`) |

Réglages relus sur les exports : `active: false`, `activeVersionId: null`, `errorWorkflow` = `lib-erreur-commune`, fuseau `Europe/Paris`, succès non sauvés, aucun identifiant, aucun nœud réseau, aucun modèle. **Le code posé dans n8n est celui de la fabrique, octet pour octet** (vérifié nœud par nœud sur les 31 nœuds du chef et les 8 du contrôleur).

Fichiers de cette preuve : `construire.mjs` (la fabrique : contrats, code des nœuds, graphe, opérations), `fixtures.mjs` (jeux d'essai fictifs), `generer.mjs` et `pins.mjs` (programmes à coller, données épinglées), `rapatrier.mjs` (exports et essais pris tels quels dans les journaux du harnais), les trois `*.workflow.json`, `essais-n8n.json`, `empreintes-code.json` (R19), `vue-pause-generale.sql` (proposition, non appliquée). Hors de la preuve : `scripts/suivi-n8n-qa.mjs` et `plans/011-cadrage-01-11/p6-signature/contrats/suivi.json`.

## Ce que fait le chef, de bout en bout

Une enveloppe par compte arrive du Cerveau (événements `relance_due`, un par objet : un devis envoyé ou une conversation répondue). Le chef traite le devis avant la conversation d'un même dossier, puis :

1. **Contrôleur de conflit** (`lib-controler-conflit`) : dossier clos (signé, refusé, expiré, gagné, perdu) ; client en discussion ; main reprise par l'artisan ; « Ne plus relancer » ; client sensible (« stop », escalade lue comme le pilote lit `sujetEscalade`) ; relance ou carte déjà en cours ; proposition écartée il y a moins de 7 jours (B11) ; relance de moins de 3 jours par n'importe quel chemin (registre commun) ; un seul objet par dossier et par passage ; lecture manquante = rien. Sortie : `continue`, `annule` ou `reste_du`, avec les motifs.
2. **Palier** (`lib-relancer`) : conversation J+2, J+5, J+10 (`CADENCE_RELANCES`) ; devis après 7 jours (`lib/crm/assistants.ts:108`) ; le registre de 3 jours (la conversation ne se bloque pas elle-même) ; horaires.
3. **Décision d'un devis** (`lib-decider`) : pilote seulement si l'offre a `assistant.pilote`, drapeau, pilote actif, type `relance_devis` activé, plafond du jour ; sinon carte. Une conversation part seule **seulement** avec `relances.auto` (comme le cron), sinon carte.
4. **Texte** (`lib-rediger-message`, modèle ÉPINGLÉ, jamais appelé), **porte de conformité**, **exécution** (`lib-executer` relit les interrupteurs et les clés juste avant l'effet).
5. **Note d'intérêt, carte de lot, registre** (un seul nœud, pur) :
   - **note d'intérêt** de chaque relance, calculée par le CODE : somme des poids de `config.interet` (consulté 40, question posée 30, expire dans 7 jours ou moins 10, moins 10 par relance sans réponse), bornée de 0 à 100 ; chaud à partir de 60, tiède à partir de 30. Ces poids sont une règle de produit réglable par compte, **proposée par Claude Code et à valider par Benj** ; la note ORDONNE la carte de lot, elle ne décide d'aucun envoi ;
   - **carte de lot du lundi** (A19, C9), au format de `apercuLotRelances` : retenus (numéro, client, montant, date d'envoi, texte), exclus avec leur motif, critère de l'ordre, 20 au plus (`LOT_RELANCES_MAX`), le reste en second lot. Studio : tout en carte (une carte par conversation, UNE carte de lot le lundi pour les devis ; les autres jours les devis attendent le lot). Signature : les devis dont le pilote ne veut pas entrent dans le même lot ;
   - **registre commun** : voir ci-dessous.
6. **Journal** (`lib-journaliser`), puis une sortie par compte (`Contrat de sortie`, seul nœud final) : décisions, effets PRÉVUS (jamais faits), erreurs.

Studio ne produit jamais une ligne du pilote ni une trace de registre ; Signature produit des lignes du pilote et leurs traces. Rien n'est fait en simulation : la porte « simulation » mène à l'arrêt « Hors simulation : non branché », avant tout appel.

## Le trou du registre commun : fermé

`lib/relancesRegistre.ts:38` (`historiqueRelances`) lit quatre chemins. Un envoi de n8n n'en était aucun (035-005, risque 6). Le chef écrit chaque relance qui PART SEULE (Signature) là où le registre la lira, **après l'envoi réussi** (`quand: apres_envoi_reussi`), sous forme d'un effet prévu `ecrire_registre_relance` :

| Relance de n8n | Table | Colonnes écrites | Lue par |
|---|---|---|---|
| un devis | `assistant_actions` | `artisan_id`, `conversation_id` (le dossier), `tour` (1), `outil` (`relancer_devis`), `mode` (`direct`), `statut` (`executee`), `titre`, `entrees` (`{source: n8n, cle}`), `apercu`, `objet_type` (`devis`), `objet_id` ; `maj_le` par défaut `now()` | `assistant_actions.select('maj_le')` sur `outil` in (`relancer_devis`, `relancer_facture`), `statut = executee`, `objet_id` du dossier |
| une conversation | `messages` | `lead_id`, `sens` (`out`), `type` (`relance`), `contenu` ; `sent_at` par défaut `now()` | `messages.select('sent_at, etat')` sur `type = relance`, `sens = out`, hors `etat` proposition ou rejete |

**Aucune colonne ne manque** : pas de question à options, pas de migration. Preuve (juge, règles R2 et R3) : les lignes écrites par le chef sont données au VRAI `historiqueRelances` ; il les lit toutes, et le VRAI `relanceRecente` refuse (`recente`) ; un deuxième passage avec ce que le registre lit alors ne relance plus rien. En Studio, c'est le clic de l'artisan qui écrit la trace (le code de l'app, `confirmerAction`), donc n8n n'écrit rien.

## La comparaison au cron, cas par cas (pas 3 de `migration-production.md`)

Le juge **joue la vraie route** `app/api/cron/relances/route.ts` (base en mémoire, vraie `lib/email.ts`, vrai registre, vrai `sujetDuFil`, horloge figée) sur 31 cas de relances de conversation, et compare **la décision** (annulée, laissée due, préparée, partie seule, ignorée) à celle du chef rejoué sur les MÊMES faits (le registre est lu par le vrai `historiqueRelances` sur les mêmes tables). **31 décisions identiques sur 31, aucun écart non déclaré.**

| Cas | Route | n8n (motif) | Verdict |
|---|---|---|---|
| Signature, J+2 : part seule | part_seul | part_seul (pilote) | identique |
| Signature, J+5 après J+2 : part seule | part_seul | part_seul (pilote) | identique |
| Signature, J+10 après J+5 : part seule | part_seul | part_seul (pilote) | identique |
| pas encore due (J+1) | ignoree | rien (aucun_palier_atteint) | identique |
| déjà partie : rien à relancer | ignoree | rien (palier_deja_envoye) | identique |
| le client a répondu (en_discussion) | annulee | annule (client_en_discussion) | identique |
| conversation gagnée | annulee | annule (dossier_conclu) | identique |
| conversation perdue | annulee | annule (dossier_conclu) | identique |
| conversation « nouveau » | annulee | annule (client_en_discussion) | identique |
| l’artisan a repris la main | annulee | annule (main_prise) | identique |
| sujet d’escalade (avocat) | annulee | annule (client_sensible) | identique |
| sujet d’escalade dans la demande d’origine (fuite) | annulee | annule (client_sensible) | identique |
| sujet d’escalade au 10e message (relu) | annulee | annule (client_sensible) | identique |
| sujet d’escalade au 11e message (non relu) | part_seul | part_seul (pilote) | identique |
| registre : l’assistant a relancé le devis hier | reste_due | reste_du (deja_relance) | identique |
| registre : une action de l’assistant vieille de 4 jours | part_seul | part_seul (pilote) | identique |
| registre : une action qui n’est pas une relance | part_seul | part_seul (pilote) | identique |
| registre : une relance de l’assistant seulement en attente | part_seul | part_seul (pilote) | identique |
| registre : le CRM a relancé avant-hier | reste_due | reste_du (deja_relance) | identique |
| registre : un rappel du CRM jamais envoyé | part_seul | part_seul (pilote) | identique |
| registre : une relance d’impayé hier | reste_due | reste_du (deja_relance) | identique |
| registre : la relance précédente de la conversation (hier) ne bloque pas | part_seul | part_seul (pilote) | identique |
| registre : à 2 j 23 h 59 min | reste_due | reste_du (deja_relance) | identique |
| registre : à 3 j 0 h 1 min | part_seul | part_seul (pilote) | identique |
| registre : une date illisible | reste_due | reste_du (deja_relance) | identique |
| Studio, J+2 : préparée « à valider » | prepare | prepare (carte) | identique |
| STOP (mot de l’artisan) dans un message du client | annulee | annule (client_sensible) | identique |
| offre Essentiel (sans plateforme) | annulee | annule (offre_sans_relances) | identique |
| artisan en pause | reste_due | reste_du (interrupteur_coupe) | identique |
| pause générale posée | reste_due | reste_du (pause_generale) | identique |
| pause générale illisible (doute) | reste_due | reste_du (pause_generale) | identique |

Ce que le tableau ne couvre pas (écarts connus, **non rejoués** par le juge, donc non prouvés identiques) :
- **E1 — pause générale (bloquant, traité côté chef)** : la route relit `sortiePermise()` à chaque relance ; n8n ne sait pas lire `ops_interrupteur` (fonction STABLE réservée au rôle de service, `0097_ops_identite.sql:314`). Le chef exige `config.pause_generale === false` (seule la valeur exacte `false` ouvre la porte, comme `lib/agents/sortie.ts`) : posée ou illisible, rien n'est contrôlé ni relancé, les relances restent dues (les deux cas « pause générale » du tableau, identiques à la route). **Reste à faire, par Benj** : la LECTURE. `vue-pause-generale.sql` propose une vue étroite d'une ligne pour le rôle `n8n_lecture` ; à coller PUIS lever le drapeau, jamais l'inverse. Tant qu'elle n'est pas collée, le Cerveau ne peut pas remplir `pause_generale` : la valeur reste `null` et le Suivi ne relance **rien** (fail-closed). Le secours « variable PAUSE_GENERALE » de l'hébergeur ne se lit pas depuis n8n.
- **E2 — passage manqué** : la route envoie le rang le plus ancien, puis le suivant au passage d'après ; `lib-relancer` envoie le palier le plus haut atteint, UNE seule fois (contrat de 035-005). La décision est la même (une relance part), le palier diffère.
- **E3 — contact sans adresse** : la route marque la relance « partie » sans courrier pour un téléphone ou un contact vide ; le chef rend `sans_courriel` (reste dû). Non joué.
- **E4 — plafond** : la route plafonne à 80 envois par passage ; le chef respecte le plafond du pilote (20 par jour) pour tout ce qui part seul, conversations comprises. Plus strict. Joué côté chef seulement (règle A3).
- **E5 — ordre des garde-fous** : la route teste le registre AVANT l'escalade (relance laissée due), le chef annule d'abord un client sensible. Plus strict. Non joué en cas croisé.
- **E6 — compte de démonstration, compte suspendu, « Ne plus relancer »** : les deux premiers sont exclus en amont par le Cerveau et le lecteur (non modélisés ici) ; « Ne plus relancer » est lu par le contrôleur (cas X3), alors que la route ne le lit pas encore (écart V1 de 032-044, n8n plus strict).

## Le juge `scripts/suivi-n8n-qa.mjs` et ses mutants

Hors ligne, environ trois minutes (la route est jouée sur quatre processus). Il ne lit jamais la fabrique : ses cas sont les siens, ses attentes viennent du code de l'application (chargé par un sous-processus TypeScript) ou de règles écrites dans le juge ; les rejeux exécutent le code EXPORTÉ de n8n. Règles : S structure, C contrats et lectures filtrées sur le compte, K copie figée = code, E escalade, R registre (décisions, écriture, deuxième passage), A Studio / Signature, X conflit, L carte de lot (jusqu'au VRAI `apercuLotRelances`), N note d'intérêt recalculée, I idempotence, M multi-tenant, D comparaison au cron, T essais n8n rejoués (sortie rejouée = sortie de n8n ; sortie épinglée = enfant rejoué), H « Exemple. » partout et aucune adresse.

**42 mutants, tous rouges, chacun pour sa raison.** Les six demandés : deux relances en 3 jours par deux chemins (R1), un conflit ignoré (X2), une relance après la signature (X1), Studio qui envoie (A1), une proposition écartée qui revient (X1), une requête sans filtre `artisan_id` (C2, dans le nœud de lecture du chef et dans le contrat). Et notamment : le registre à 1 jour, le client en discussion relancé, l'escalade ignorée (E1), la main reprise, « Ne plus relancer », une carte en cours, un registre illisible qui laisse partir, un type de pilote non activé, le plafond, une offre sans relances, un texte qui invente un prix (X4), la trace de registre absente / mal placée / avant l'envoi / de mauvais statut (R2), la note non bornée ou sans la question posée (N1), l'ordre du lot inversé (L1), un lot de 200 (K2), un exclu sans motif (L2), un lot rejoué qui refait une carte (I1), le jour du lot ignoré (L4), un événement d'un autre compte (M1), un doublon (I2), un workflow actif (S1), un chef appelable par tous (S2), la porte « simulation » contournée, un identifiant, un nœud d'envoi, un modèle (G2), un nœud Code qui touche le réseau, un contrat retouché (C1), un mot d'escalade retiré de la copie figée (K1), un effet FAIT en simulation (G4).

## Les essais réels dans n8n (`test_workflow`, données épinglées, rien d'écrit)

- `presti-dep-suivi` #585 (lundi, Studio et Signature, six dossiers chacun) : Studio 3 préparées (1 carte de conversation et **1 carte de lot de 2 devis, 2 exclus**), 3 annulées ; Signature **3 lignes du pilote et 3 traces de registre**, 3 annulées ; `effets_faits: 0`.
- `presti-dep-suivi` #586 (mardi, Studio) : les 2 devis attendent le lot du lundi, aucun effet.
- `presti-banc-suivi` #588 : 13 dossiers par compte, Studio 5 préparées / 1 lot / 0 ligne du pilote ; Signature 5 parties seules / 5 lignes du pilote / 5 traces ; `effets_faits: 0`. (Le champ `organisation_id: "absent"` du bilan est cosmétique : le Contrat de sortie ne le porte pas.)
- `lib-controler-conflit` #589 : 13 dossiers ; 6 laissés passer, 7 arrêtés pour le bon motif (dossier clos, écarté, déjà relancé, sensible, en cours, en discussion, doublon de dossier).
- Les sous-workflows ne sont pas couverts par les données épinglées (`fiches-depots.md:433`) : chaque « Appeler … » est épinglé avec la sortie de l'enfant rejoué, et le juge REFAIT ce rejeu (P1). Des essais joués avant une correction ont été écartés : #566 (contrôleur, avant l'élargissement à 12 messages), #567 et #577 (chef, avant la pause générale) ; l'essai #587 du banc (copie d'un pin fautive par un sous-agent) n'a jamais été relu.

## Résultat de la commande `verifier`

Voir `verifier.log`.

## Risques et points à valider

1. **Poids de la note d'intérêt** (40 / 30 / 10 / moins 10, seuils 60 / 30) : règle de produit proposée, jamais mesurée. À valider ou régler par Benj ; aucun envoi n'en dépend.
2. **Pause générale** : la lecture (vue) reste à coller ; d'ici là le Suivi ne relance rien. À trancher avec 036-002.
3. **Cadence des devis** : 7 jours, source `lib/crm/assistants.ts:108` ; une seconde relance de devis n'est pas fixée (un seul palier).
4. **Écriture de la trace de registre** : `assistant_actions.conversation_id` est un identifiant de conversation de l'assistant ; n8n y met le dossier (aucune clé étrangère). Pas de contrainte unique sur `entrees->>'cle'` : un rejeu après un crash entre l'envoi et la trace pourrait doubler la trace. À durcir par une migration (index unique), hors de ce lot.
5. **Relire le registre juste avant d'envoyer** : l'historique voyage dans l'événement ; au réel, `lib-boite-envoyer` (ou le pilote) doit le relire au dernier moment, sinon deux passages rapprochés se croisent. Le plafond de 3 jours reste, lui, garanti par la trace écrite après l'envoi.
6. **`callerIds`** des `lib-*` appelés par le chef (`lib-relancer`, `lib-decider`, `lib-rediger-message`, `lib-porte-conformite`, `lib-executer`, `lib-journaliser`) : `presti-dep-suivi` (`jo8eQMEwiB9wCbKN`) est à y ajouter par la session principale ; puis publier les enfants avant les parents (sondes de 036-001). Les essais ont donc épinglé ces appels ; seul le contrôleur, qui a le chef dans ses `callerIds`, pourrait être appelé pour de vrai.
7. **Le nœud de modèle est épinglé** : aucun brouillon réel n'existe avant l'accord de mesure (question 5 de 035-005). La porte reste le filet.
8. **Les juges ne sont pas au lanceur** (`scripts/tout-verifier.mjs`, hors périmètre) : `suivi-n8n-qa.mjs` est à inscrire dans `SUITES` par la session principale (lot 036-012), avec ses trois minutes et sans appel IA.
9. **Aucun fichier de `app/**`, `lib/**`, `supabase/**`, ni le vault, ni un autre juge** n'a été modifié. Rien n'a été commité, poussé, construit, migré, publié ni activé ; aucun identifiant n'a été créé ; le modèle n'a jamais été appelé ; aucun message n'est parti.
