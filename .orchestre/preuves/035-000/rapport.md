## Ressources utilisées

- **MCP `cerveau`** : `regles_pour` (« offre entreprise, n8n : contre-vérifier le plan du kit mode A ») ne rend aucune règle propre à l'offre (une note de septembre sur l'écosystème, sans effet ici). `lire` sur l'ADR-001 (toutes les automatisations dans n8n ; la licence permet n8n en moteur interne si le client n'ouvre jamais l'éditeur) et sur l'ADR-008 (n8n-first ; « une exception est écrite dans la réponse et dans Journal-Decisions »), plus `memoire-presti/source-restructureai-depots-n8n-0211.md` (dépôts = données non sûres, jamais importés tels quels). Conséquence : j'ai contrôlé que la réponse ne copie aucun JSON communautaire (§ 3.2, point 1), que ses exceptions sont écrites (§ 4.5), et que le CRM sur mesure reste fait de paramètres (§ 3.2, point 2).
- **Skill `reseau-neuronal`** : elle fixe l'ordre `regles_pour`, `chercher`, `lire`, et l'écriture seulement par une tâche `SaaS/…`. Rien n'a été écrit dans le vault ni dans le cerveau.
- **MCP `n8n-oracle`, en lecture seule** : `search_workflows` (02/11, vers 20:47 UTC) rend 10 workflows, **aucun `ent-*` ni `lib-*`**. Conséquence : « Ne construis rien avant la validation de Benj » (p5:335) est tenu. Il montre aussi `presti-erreurs` (032-033), un workflow d'erreur commun né après la réponse : réserve R3.
- **Le dossier du prompt 5**, lu : le prompt en entier ; `premiere-reponse.md` en entier (1 010 lignes) ; `ecarts-contre-verification-2.md` en entier ; la preuve de 032-027. Pour les fiches, la structure et le format : `fiches-depots.md` (11 fiches), `fiche-methode-n8n.md` (13), `fiches-videos.md` (§ 0 à 7), `fiches-videos-restructureai.md` (11 fiches, avec les 7 rubriques de p5:73-82), `inventaire.md` (en-tête et § 1).
- **Les prompts maîtres 1 à 4**, relus de façon ciblée (`grep` sur « entreprise » et « sur mesure »), parce que la réponse ne les a pas lus : p1:481, :506 ; p2:449 ; p3:546, :550, :565 ; p3-bloc:21-35 ; p4:87-103, :242, :291. Conséquence : aucune contradiction avec l'offre ; l'écart E6 de la contre-vérification n° 2 passe en réserve.
- **Le code, relu à la ligne** : `lib/plans.ts:17-20`, `:101-103`, `:113-114`, `:160-164` ; `lib/pilote/regles.ts:27`, `:30`, `:32`, `:36`, `:70`, `:79-82` ; `lib/relancesRegistre.ts:18` ; `0174_pilote_automatique.sql:24`, `:32`, `:41-42` ; `0189_role_lecture_n8n.sql:8` ; la liste `supabase/migrations/` et l'en-tête de `0185_automatisation.sql`. Conséquence : l'écart bloquant B1 (liste « jamais en automatique ») et la réserve R1 (migrations écrites depuis la réponse).
- **Le suivi** : `.orchestre/digest.md` et les tâches déjà déposées (`035-001` en cours, en-tête relu). Conséquence : la réserve R6 sur les commandes `verifier` du tableau se règle au dépôt, comme pour 035-001.
- Non chargés, parce qu'ils ne servent pas un audit de conformité d'un plan : les skills de design et de vidéo ; `get_workflow_sdk_reference` et `get_workflow_best_practices` (rien n'est construit) ; `security-review` (pas de diff à relire).

VERDICT : CONFORME SAUF

La réponse corrigée tient le prompt 5 en mode A, sauf sur un point qui ferait construire la porte de conformité faux (B1). Il se corrige
dans l'objectif de 035-004 et de 035-005, qui ne sont pas encore déposées. 035-001, 035-002, 035-003, 035-006 et 035-008 peuvent partir
tout de suite. 035-002 prend la correction B1 pour l'annexe d'autonomie.

## Écarts bloquants

### B1 — La liste « jamais en automatique » de la porte est plus courte que celle du prompt

- **Où** : `premiere-reponse.md:592` (fiche Conformité, mémoire), `:714` (`lib-porte-conformite@1.config.jamais_auto`, « copie figée de
  lib/pilote/regles.ts:79-82 »), `:716` (énumération `motifs`), `:632` (`lib-decider` : « un geste jamais automatique n'est jamais en
  pilote »), `:937`-`:938` (035-004, 035-005).
- **Écart** : p5:226 fixe la liste des gestes qui ne partent jamais seuls, même au contrat. La réponse la remplace par
  `OUTILS_JAMAIS_AUTO` du code (`lib/pilote/regles.ts:79-82` : facture payée, factures, avoir, remboursement, paiement, trois
  suppressions, hausse des tarifs). Il manque :
  - **envoyer un devis signé** : au contraire, `envoi_devis` et `envoyer_devis` sont dans la liste fermée du pilote
    (`lib/pilote/regles.ts:36`, `:70`), donc automatisables par un client Entreprise, qui hérite de Signature (`lib/plans.ts:103`) ;
  - **déclarer à l'URSSAF ou aux impôts** ;
  - **supprimer des données** en général (le code ne couvre que trois outils `supprimer_*`) ;
  - **passer ou prendre un appel téléphonique** ;
  - **inventer un créneau, un délai ou un fournisseur** : la fiche Rédaction dit que la porte arrête ce brouillon (`:528`), mais
    l'énumération des motifs n'a que `prix_sans_source` (`:716`). Le contrat est fermé : la porte ne peut pas dire ce refus.
- **Pourquoi c'est bloquant** : le test obligatoire « un geste de la liste jamais en automatique reste une carte » (p5:315) serait prouvé
  contre la mauvaise liste. Le juge, qui compare la copie au code, rougirait même si on la complétait.
- **Correction** :
  - 035-004 et 035-005 : `jamais_auto` = la liste du code **plus** les gestes de p5:226. Le juge vérifie que la liste du code est
    **incluse** dans celle du kit, pas qu'elles sont égales.
  - Ajouter les motifs `delai_creneau_fournisseur_sans_source`, `devis_engageant`, `declaration_fiscale_ou_sociale`,
    `suppression_de_donnees` et `appel_telephonique`.
  - Le test p5:315 parcourt toute la liste de p5:226, chaque geste réglé « automatique ».
  - 035-002 : l'annexe d'autonomie exclut ces types d'action de tout accord écrit ; `envoi_devis` n'y est pas proposable.
  - Question 29, à ajouter : « Envoyer un devis signé » (p5:226) vise-t-il tout envoi de devis par un client Entreprise ? Défaut :
    oui, l'envoi d'un devis reste une carte chez un client Entreprise. Rien ne change pour Signature (p5:275) : la règle vit dans la
    porte du kit et dans l'annexe, pas dans `lib/pilote/regles.ts`.

## Exigences

Légende : **faite** · **partielle** (réserve, non bloquante) · **manquante**. « PR » = `premiere-reponse.md`.

### Rôle, modes, positionnement (p5:12-42)

| Exigence (p5:NN) | État | Où dans la réponse, et pourquoi |
|---|---|---|
| p5:14-16 · tout dérive d'un irritant réel, avec sa source | faite | En mode A, irritants fictifs marqués « Exemple. » (PR:440-446) ; agents propres seulement sur un irritant signé (PR:608) |
| p5:18 · ne rien raser, poser sur l'existant | faite | Inventaire au fichier:ligne (PR:94-112) ; schéma gris, corail et pointillé (PR:186-269) |
| p5:20-22 · mode écrit en tête ; kit du mode A ; aucune donnée réelle | faite | PR:3-5, PR:66-69 ; kit en 035-002 à 035-007 |
| p5:27 · Signature à l'identique, plus les membres ; sur devis ; « Demander une démo » | faite | PR:71-72 (`lib/plans.ts:103`, relu) ; le bouton appartient à la landing (p4:103, chantier 2) |
| p5:31-40 · grille des trois offres : CRM sur mesure, équipe, pilotage, évolutivité | partielle | Équipe : organisations (L6b). Pilotage : Reporting, Alerte, KPIs. Avenants : PR:608. **Le CRM sur mesure** n'a qu'un principe, « des paramètres, jamais un éditeur » (PR:134-135, :218) : aucune tâche 035 ne le dessine. Le DoD du mode A ne l'exige pas (p5:339) : réserve R8 |
| p5:42 · ni gain non mesuré, ni témoignage, ni appel, ni rendez-vous pris seul, ni paiement par l'IA | faite | PR:843-844 ; juge de 035-002 sur les phrases de p5:42 (PR:935) ; démo sans chiffre de gain (PR:886) |

### Le cycle d'un client (p5:44-58)

| Exigence | État | Où |
|---|---|---|
| p5:50 · étape 0, demande de démo qualifiée par n8n (taille, métier, outils cités) | partielle | Prévue au C4, L19 (PR:109, :929), écrite depuis (`presti-demande-demo`, inactif, vu au MCP). « Outils cités » n'est pas lu : n8n ne lit aucun texte libre (question 15, avec défaut). Écart assumé et posé à Benj |
| p5:51 · étape 1, dossier de préparation sourcé et daté | partielle | Outils de veille au § 6 (PR:778) et B1 (PR:822) ; **aucun gabarit de dossier de préparation** dans 035-002 : réserve R7 |
| p5:52-53 · fiche de découverte signée ; matrice, irritant sans KPI signalé | faite | PR:448-460 ; matrice PR:440-446 (I4 signalé « aucun ROI mesurable ») ; moment de la fiche, question 26 |
| p5:54 · proposition ; coûts mesurés à blanc ; le prix, c'est Benj | faite | B2 (PR:823) ; question 5 (mesure à blanc) ; aucun prix écrit (PR:26) |
| p5:55 · accord écrit, art. 28, annexe d'autonomie | faite | 035-002 (annexe), 035-011 (art. 28, sous-traitants) |
| p5:56-58 · à blanc sur copie fictive ; ombre, puis validation, puis automatique type par type ; exploitation | faite | B3 à B7 (PR:824-828) |

### Sources et fiches de lecture (p5:60-88)

| Exigence | État | Où |
|---|---|---|
| p5:64-65 · vidéos envoyées, chacune en entier | partielle | Les 13 du 01/11 (`fiches-videos.md` § 2 : 10 fiches et 3 écartées) ; les 11 de @restructureai du 29/09 au 02/11, parole complète, six images par vidéo (`fiches-videos-restructureai.md`, 11 fiches). Manques signalés : images des cours YouTube, vidéos d'avant le 29/09, audio de quatre TikToks (PR:173-176) |
| p5:66-67 · dépôts : code, README, JSON, licences | partielle | 11 fiches (`fiches-depots.md`), licence lue pour chacune ; lecture partielle signalée (8 JSON sur « 280+ », 7 sur « 4 343 », 11 dépôts sur 53) (PR:122-124, :164-166). Le prompt admet la lecture partielle si elle est signalée (p5:85) |
| p5:68 · méthode n8n officielle : sous-workflows, erreurs, mode file, nœuds IA | faite | `fiche-methode-n8n.md`, 13 fiches dont « Enable queue mode » (:222) et « AI Agent » (:280). Les manques sont signalés (PR:167-168) |
| p5:69 · Presti : CLAUDE.md, rules, `contexte.md`, `plans.ts`, `011-cadrage`, prompts maîtres 1 à 4, cerveau | partielle | Prompts 1 à 4, `contexte.md`, état des lieux du 29/10, ADR-005 et ADR-006 : non lus, mais signalés (PR:177). **Relus ici de façon ciblée** : aucune contradiction avec l'offre (p3:546 donne le niveau 3 à l'Entreprise « par contrat » ; p4:87-103 porte le bloc et « Demander une démo entreprise »). Réserve R5 : le défaut de PR:177 renvoie à 035-010, qui ne les contient pas |
| p5:71-82 · une fiche par source, au format imposé | faite | Les 7 rubriques sont présentes (exemple : `fiches-videos-restructureai.md`, 11 fois chacune) ; « Ce qu'elle montre » ramené à 8 lignes au plus (032-027, écart 12) |
| p5:85 · sources manquantes signalées : quoi, ce que ça empêche | faite | PR:160-180 (17 lignes, avec un défaut chacune) |
| p5:86 · Whisper en local ; ne pas refaire `docs/connaissance-videos/` | faite | `fiches-videos.md` § 3 reprend l'existant ; Whisper pour @restructureai (032-022) |
| p5:87 · dépôt sans licence : on s'inspire, on réécrit | faite | PR:132-133 ; fiches 9 et 11 marquées « Réutilisable : non » |
| p5:88 · une note par source utile dans le vault, par une tâche `SaaS/…` | faite (en tâche) | 035-012 |

### Données (p5:90-107)

| Exigence | État | Où |
|---|---|---|
| p5:92-94 · valeur, source, date, confiance ; inconnu = question ; un KPI sans base ne prouve rien | faite | PR:450-451 ; PR:843-846 ; Reporting PR:575-576 ; `bases_de_depart` exige les quatre champs (PR:744) |
| p5:95 · Supabase source de vérité ; n8n ne garde rien ; date de synchronisation visible | faite | PR:143-144 (exécutions masquées, question 10) ; `derniere_synchro_le` (PR:751) ; question 9 |
| p5:96 · zéro donnée réelle dans les tests ; aucun modèle gratuit en ligne | faite | 035-006 (`@exemple.invalid`, identifiants en `00000000-…`) ; PR:771 |
| p5:98-107 · fiche de découverte en 8 parties | faite (en tâche) | PR:448-460 ; 035-002, dont le juge exige les 8 parties |

### Architecture n8n-first (p5:109-152)

| Exigence | État | Où |
|---|---|---|
| p5:111-112, :114 · toute logique dans n8n ; l'app = interface ; exceptions écrites | faite | PR:381-395 (exceptions A et B, guetteur, duplications assumées) ; conforme à l'ADR-008 (« Garde-fous ») |
| p5:113 · Claude Code écrit les workflows ; Hermes les lit seulement | faite | PR:865 ; les tâches de Hermes (035-006, -009, -010, -012) n'écrivent rien dans n8n |
| p5:115 · Supabase, source de vérité et file | faite (mode A) | En mode A, rien n'est écrit : les effets prévus vont au bilan et à l'export (PR:639-641) ; les tables naissent avec la configuration, au « go » (p5:424) |
| p5:116 · le n8n d'Oracle seulement | faite | PR:768 |
| p5:117 · n8n va chercher, rien ne l'appelle ; webhook = décision de Benj | faite | Schedule Trigger toutes les 5 min (PR:311) ; n8n Form écarté (PR:776) |
| p5:119-152 · schéma du système | faite | PR:195-269 |

### Méthode n8n (p5:154-166)

| Exigence | État | Où |
|---|---|---|
| p5:156 · un parent par client, qui ne fait que router | faite | PR:302-347 ; Alerte et Reporting appelés par le parent (écart 5, corrigé) |
| p5:157 · couches capture → normalisation → … → reporting | partielle | Toutes les couches ont un gabarit, **sauf « normalisation »** : `lib-normaliser-telephone` est passé en « exécution » (PR:629). A3 annonce pourtant une normalisation (PR:818). Réserve R2 |
| p5:158 · bibliothèque partagée (capture, dédoublonnage, relance J+1/3/7, rapport, alerte, synchronisation), gabarits seuls | faite | PR:619-643 |
| p5:159 · un contrat d'entrée et de sortie par sous-workflow, vérifié en Code | faite | PR:645-753 (le JSON se lit, 032-027) |
| p5:160 · idempotence (organisation, type, objet, jour) | faite, avec un écart posé | La clé prend l'étape au lieu du jour (question 24, défaut repris du C4:440). C'est plus strict pour les paliers de relance ; Benj tranche |
| p5:161 · drapeau `simulation` partout | faite | Porte « If simulation » avant chaque effet, et un mutant qui la retire (PR:136-138, :636) |
| p5:162 · workflow d'erreur commun, reprises bornées **à attente croissante**, disjoncteur, interrupteur | partielle | Workflow d'erreur, disjoncteur et interrupteurs : PR:639-640, :353-356. **L'attente croissante** est dite « à construire dans Supabase » (PR:145-146), mais aucun gabarit ni aucune tâche ne la porte : Retry On Fail reste fixe (PR:415). Réserve R2. Le workflow d'erreur commun existe désormais (`presti-erreurs`) : réserve R3 |
| p5:163 · nommage ; **description en tête** (rôle, entrées, sorties, propriétaire) | partielle | Nommage tenu. La description de tête n'est ni demandée aux `lib-*` ni contrôlée par le juge de 035-001 (règles listées PR:934). Réserve R4 |
| p5:164 · export JSON sans identifiant, rejoué hors ligne | faite (en tâche) | 035-003 à 035-007 |
| p5:165 · identifiants par client ; le client branche lui-même | faite | Question 13 ; PR:141-142 |
| p5:166 · lots bornés, quotas, mémoire et disque d'Oracle avant un client | faite | Lots de 200 (PR:681) ; mesures en tête (PR:34-37) |

### Système agentique (p5:168-220)

| Exigence | État | Où |
|---|---|---|
| p5:170 · le client ne parle qu'à l'assistant ; Hermes et Orca derrière | faite | PR:797 ; nœud « derrière » du schéma (PR:243) |
| p5:174-181 · hiérarchie des rangs 0 à 3 | faite | PR:273-303 |
| p5:185-194 · six agents minimum, fiche personnalisée (gabarit et exemple en mode A) | faite | PR:462-604 : les six fiches au format de p5:200-212. Ce qui ne porte pas « Exemple. » fait le gabarit (PR:464-465) |
| p5:190 · Relance : registre commun avant chaque envoi | faite | PR:498-505 ; un envoi parti de n8n n'est pas lu par les chemins de l'app (PR:101) : à régler en mode B (réserve R9) |
| p5:191 · Rédaction : ni prix, ni délai, ni créneau, ni fournisseur absent | partielle → **B1** | Dit dans la fiche (PR:528) ; la porte n'a pas le motif |
| p5:192 · Alerte, dont le client qui décroche | faite | `client_qui_decroche` (PR:727) |
| p5:194 · Conformité : veto ; lecture en erreur = refus | faite, sauf **B1** | PR:582-604 |
| p5:196 · agents propres seulement sur un irritant, ajoutables plus tard | faite | PR:606-617 |
| p5:216-220 · schéma strict ; le code calcule les montants ; aucun modèle d'abord ; mémoire Postgres ; journal avec le coût | faite | PR:418-419, :701 (`montant_centimes`), :475, :781, :723 |

### Autonomie (p5:222-227)

| Exigence | État | Où |
|---|---|---|
| p5:224 · celle de Signature, par type, carte d'abord, automatique après l'ombre et un accord écrit | faite | PR:83-84 ; mode A au niveau 2 au plus (question 1) |
| p5:225 · par le pilote existant, ou son équivalent n8n | faite | Exception A, question 1 ; autonomie écrite une seule fois (PR:358-360) |
| p5:226 · liste « jamais en automatique, même au contrat » | **manquante en partie → B1** | Voir B1 |
| p5:227 · accord écrit du client avant chaque déploiement | faite | B4 à B6 (PR:825-827) |

### Outils (p5:229-255)

| Exigence | État | Où |
|---|---|---|
| p5:233-236 · d'abord ce qu'il paie ; gratuit d'abord ; tableau aux huit colonnes | faite | PR:766-784, les huit colonnes de p5:236 ; les tarifs non relus portent « à vérifier » |
| p5:238 · le payant se paie sur le compte du client, accepté par Benj | faite | PR:763-764 ; SMS : question 22 |
| p5:244 · le Brevo de Presti n'est jamais partagé | faite | PR:773 |
| p5:248, :252 · aucun modèle gratuit en ligne avec une donnée ; Apify, Firecrawl en ligne et LinkedIn interdits | faite | PR:771, :778 |
| p5:253 · l'agenda : proposer, jamais réserver | faite | PR:616, :779 |
| p5:255 · battement à 26 h | faite | `lib-battement` (PR:641) |

### Sécurité, conformité, isolation (p5:257-264)

| Exigence | État | Où |
|---|---|---|
| p5:259 · isolation stricte par RLS ; test d'isolation ; droits par rôle | partielle | Côté base : `organisations-qa` (L6b, hors 035) ; côté n8n : le filtre organisation, contrôlé par le juge (035-001), et l'audit 035-013. **Le jeu fictif n'a qu'une organisation** (035-006) : aucun rejeu ne prouve que la démo ne lit rien d'une seconde. Réserve R10 |
| p5:260 · sous-traitant art. 28, registre, sous-traitants ultérieurs | faite (en tâche) | 035-011 |
| p5:261-262 · secrets ; marque blanche | faite | Juge 035-001 ; motif `marque_interdite` (PR:716) |
| p5:263 · arrêt immédiat par client et par agent | faite | PR:353-356 ; `lib-executer` relit les interrupteurs avant l'effet (PR:636) |
| p5:264 · plafond de coût IA et SMS par client et par jour ; arrêt, alerte, file du lendemain | partielle | Dit dans la fiche Rédaction (PR:521-522) ; **aucun gabarit ne porte le contrôle du plafond de coût ni la file du lendemain** (le `plafond_jour` de la porte compte des sorties). Réserve R11 |

### Contraintes, livrables, KPIs, format (p5:266-308)

| Exigence | État | Où |
|---|---|---|
| p5:268-274 · contraintes | faite, sauf B1 | Voir plus haut |
| p5:275 · Studio et Signature inchangés | faite | Rien ne touche `lib/plans.ts` ; tests au lanceur (PR:839) |
| Livrables 1 à 5, 7, 8, 9 et 10 (p5:279-288) | faits | PR § 3, § 5.2 et 035-002, § 5.1, § 4, § 5.3, § 6, § 5.5, § 7.2, § 7.3 (avec la colonne « cible ») |
| Livrable 6 · registre des données collectées | fait (en tâche) | 035-002 |
| Livrable 11 · plan de tests et runbook | fait (en tâche) | PR:830-839 ; runbook en 035-007 |
| Livrable 12 · éléments du devis : coûts mesurés à blanc, **temps de construction estimé**, jamais un prix | partielle | La mesure à blanc est en question 5 ; **aucune tâche ne produit le gabarit des éléments du devis**, ni une estimation du temps de construction par lot. Réserve R12 |
| p5:292-301 · KPIs | faits | K1 à K8 (PR:850-857) |
| p5:303-308 · Mermaid, tableaux, fichier:ligne, questions avec un défaut | faite | 28 questions, chacune avec un défaut (PR:877-910) |

### Tests obligatoires (p5:310-320)

| Test | État | Où |
|---|---|---|
| Rejeu de chaque sous-workflow | fait (en tâche) | 035-003, -004, -005, -007 |
| Sortie de modèle hors schéma | fait (en tâche) | 035-005 |
| Geste « jamais en automatique » | **faux tel quel → B1** | Il serait prouvé contre la liste du code |
| Idempotence | fait (en tâche) | 035-003, 035-007 |
| Isolation et rôles | partiel | Réserve R10 |
| Mode à blanc | fait (en tâche) | 035-001, 035-007 (mutant « If simulation ») |
| Plafonds de coût et disjoncteurs | partiel | Disjoncteurs en 035-003 ; plafond de coût : réserve R11 |
| Entreprise = Signature + `organisation.membres` | fait | Déjà au lanceur (PR:839), et `lib/plans.ts:103`, relu |
| Inscription au lanceur, mutation prouvée | faite | A1 (PR:816) : par la session principale |

### Première réponse et fin (p5:322-340, annexe 2)

| Exigence | État | Où |
|---|---|---|
| p5:326-333 · les 8 points | faits | § 1 à § 8 |
| Annexe 2 § 4 · en tête : disque et mémoire d'Oracle, `presti-detecteurs`, migrations des organisations | faite, mais périmée | Juste à 19:20 UTC. Depuis, 0183 à 0188, 0190 et 0191 sont écrites, non suivies par git et **non appliquées** (fichiers de 19:37 à 20:27). Réserve R1 |
| p5:335 · rien avant la validation | faite | Aucun `ent-*` ni `lib-*` dans n8n (MCP, 20:47 UTC) |
| p5:339 · DoD du mode A | couvert par les tâches | 035-002 (fiche), 035-003 à 035-005 (capture, qualification, relance, rapport, alerte, conformité), 035-006 et 035-007 (démo « Exemple. », à blanc, exportée, testée) |
| Annexe 2 · DoD : note de session, Journal-Decisions, `hot.md` | couvert | 035-012 |

## Les tâches 035-001 à 035-013 couvrent-elles le mode A ?

**Oui, une fois B1 corrigé**, et avec les réserves ci-dessous. La couverture, élément par élément :

| Élément du mode A (p5:22, p5:339) | Tâches |
|---|---|
| Fiche de découverte, matrice, registre, annexe d'autonomie | 035-002 |
| Bibliothèque : socle (contrat, dédoublonnage, journal, erreur, alerte, disjoncteur, battement) | 035-003 |
| Bibliothèque : capture, qualification, décision | 035-004 |
| Bibliothèque : relance, rédaction, porte, exécution, rapport | 035-005 (**B1**) |
| Juges des exports, du kit et des fiches, avec mutants | 035-001, 035-002, 035-008 |
| Démo « Exemple. Bâti-Démo », données fictives, rapport d'exemple, runbook | 035-006, 035-007 |
| Sources restantes | 035-009, 035-010 |
| Conformité (art. 28, sous-traitants, question de licence) | 035-011 |
| Vault | 035-012 |
| Audit distinct de l'auteur, avant toute publication | 035-013 |

Ce qui n'est porté par aucune tâche 035 : les réserves R2, R4, R7, R10, R11 et R12. Le CRM sur mesure (R8) relève du mode B.

## Réserves (non bloquantes)

- **R1 — L'en-tête est périmé sur les migrations.** Depuis la réponse (19:20 UTC), 0183, 0184 et 0188 (L6b) sont écrites, comme 0185 à
  0187, 0190 et 0191 : des fichiers non suivis par git et non appliqués (0185, l.4 : « NON APPLIQUÉE … attend le go écrit de Benj »).
  Deux questions en changent de base :
  - question 2 : 0185 prépare `opportunites` ;
  - K6 : `opportunites_decisions` garde l'empreinte du texte avant et après, ce qui rendrait « sans modification » mesurable
    (0185:350-359).

  Il faut aussi recouper `autonomie_reglages` (0185:186) avec la règle « l'autonomie n'est écrite qu'une fois » (PR:358-360).
  Correction : 035-004 et 035-005 relisent 0185 avant d'écrire leurs contrats.
- **R2 — Deux manques de méthode.**
  - Aucun gabarit pour la couche « normalisation » (p5:157) : il faut un `lib-normaliser-evenement`, qui met les champs structurés
    d'une demande sous une forme canonique sans lire le contact (035-004).
  - Aucune reprise à attente croissante (p5:162) : l'échéance de l'événement réclamé doit croître à chaque échec (1, 5, puis 30 min,
    par exemple), dans 035-003.
- **R3 — Un workflow d'erreur commun existe déjà.** `presti-erreurs` est né de 032-033, après la réponse. 035-003 doit le reprendre ou
  l'étendre, et pas créer un second `lib-erreur-commune` (p5:162 : « un workflow d'erreur commun »). Hors périmètre, à signaler à la
  session principale : le MCP le montre `active: true`, alors que sa description dit « Inactif ».
- **R4 — La description de tête n'est pas contrôlée** (p5:163 : rôle, entrées, sorties, propriétaire). Ajouter la règle au juge
  (035-001, en cours) : par une tâche suivante, ou par la session principale.
- **R5 — Le défaut de PR:177 ne mène nulle part.** Il renvoie à 035-010, qui ne contient pas ces sources. Le relevé ciblé de cet
  audit ne trouve aucune contradiction. Il faut quand même ajouter à 035-010 les prompts 1 à 4, `contexte.md`, l'état des lieux du
  29/10, l'ADR-005 et l'ADR-006.
- **R6 — Trois commandes `verifier` du tableau sont à réécrire au dépôt** :
  - pour 035-004 et 035-005, « Idem » rejouerait les contrôles de 035-003, pas les leurs ;
  - pour 035-007, `scripts/demo-entreprise-qa.mjs` n'est pas dans le périmètre de la tâche.

  Le dépôt de 035-001 montre que la session principale réécrit déjà l'en-tête : à faire de même.
- **R7 — Étape 1** : aucun gabarit de dossier de préparation, où chaque information publique porte sa source et sa date (p5:51). À
  ajouter à 035-002.
- **R8 — Le CRM sur mesure** (p5:35) n'a qu'un principe. C'est le mode B (L20), après la réponse de n8n sur la licence (question 3).
- **R9 — Le registre des relances côté app ne voit pas les envois de n8n** (PR:101). En mode B, un envoi parti de n8n doit être
  inscrit dans une table que lit `lib/relancesRegistre.ts` avant la mise en automatique (B6).
- **R10 — Isolation en mode A.** Il faut ajouter une seconde organisation fictive au jeu 035-006, puis prouver en 035-007 que la démo
  ne lit et n'écrit rien d'elle (p5:259, p5:317).
- **R11 — Plafond de coût** (p5:264, p5:318). Il faut nommer où il se contrôle : avant l'appel de `lib-rediger-message`, sur le coût
  journalisé du jour. Il faut aussi nommer la file du lendemain, et le tester en 035-005, même nœud du modèle épinglé.
- **R12 — Éléments du devis** (livrable 12). Il faut un gabarit dans 035-002 ou 035-007 : les coûts récurrents mesurés à blanc et le
  temps de construction par lot, jamais un prix.
- **R13 — Les architectes sont dans la cible** (annexe 1 § E ; p4:243). La démo est du bâtiment, comme le veut le défaut de p5:429.
  La fiche de découverte doit rester valable pour un cabinet d'architecte (035-002).

## Ce qui a été vérifié dans la contre-vérification n° 2

Les 16 écarts sont repris par 032-027 (`.orchestre/preuves/032-027/resume.md`). Ceux que j'ai relus dans la réponse tiennent :
- l'écart 2 (question 25, PR:907) ;
- l'écart 3 (question 26, PR:908) ;
- l'écart 4 (`lib-normaliser-telephone` à l'envoi, PR:629 ; question 27) ;
- l'écart 5 (déclencheurs par le parent, PR:541-544, :563-566) ;
- l'écart 6 (PR:128, :177) ;
- l'écart 8 (PR:108, :936) ;
- l'écart 9 (PR:390-391) ;
- l'écart 10 (PR:777, question 28) ;
- l'écart 11 (PR:358-360) ;
- l'écart 14 (colonne « cible », PR:848) ;
- l'écart 15 (PR:727) ;
- l'écart 16 (PR:904).

Aucun écart corrigé n'est rouvert. B1 est neuf : aucune des deux contre-vérifications ne l'avait relevé.

## Vérification

Sortie de `node scripts/orchestre.mjs verifier 035-000` : `verifier.txt`, dans ce dossier.
