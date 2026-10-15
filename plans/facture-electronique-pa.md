# Facture électronique : raccorder Presti à une plateforme agréée (PA)

Recherche du 15/10/2026. Aucune inscription, aucun contact, aucun achat : seulement des pages publiques lues. Toute date « lu le » ci-dessous = 15/10/2026. Ce qui n'a pas pu être vérifié est marqué **[NON VÉRIFIÉ]**.

## 1. Résumé

1. **Recommandation : raccorder Presti à une PA par API en « marque grise » (Presti = « solution compatible »), avec SUPER PDP comme premier choix et Iopole en plan B**, derrière une couche d'abstraction (`lib/pa/`) pour pouvoir changer de fournisseur sans réécrire.
2. **Le calendrier tient** (aucun report trouvé) : réception obligatoire pour toutes les entreprises depuis le 01/09/2026 (donc déjà vrai pour tes artisans) ; émission obligatoire pour PME/micro au **01/09/2027**. Il reste ~10,5 mois. L'administration applique une « bienveillance » au démarrage, mais précise que ce n'est ni un report ni une suspension.
3. **Aujourd'hui Presti ne répond à aucune des deux obligations** : un XML CII à télécharger n'est pas une facture électronique au sens de la loi (elle doit transiter par une PA), et Presti ne sait pas recevoir. Les 4 concurrents comparés affichent tous une PA.
4. **Coût : le seul prix public trouvé est celui de SUPER PDP** : 0,01 € HT par facture (jusqu'à 10 000/mois), minimum de facturation 10 € HT par an, 2 € HT par vérification KYC/KYB. Iopole, Seqino, Docoon : prix non publics (devis). Aucun engagement minimum visible chez SUPER PDP.
5. **Charge estimée : 18 à 28 jours de développement** (mon estimation, pas une donnée sourcée), dont l'e-reporting (clients particuliers) et la mise en conformité réelle du XML (Schematron), pas encore faite. Décision à prendre par Benj : section 7.

## 2. Ce que dit la loi et le calendrier

### 2.1 Dates (confirmées, sans divergence)

| Fait | Source | Lu le |
|---|---|---|
| « La réforme ... est entrée en vigueur le 1er septembre 2026 ». Toutes les entreprises doivent **recevoir** des factures électroniques, quelle que soit leur taille. Grandes entreprises et ETI : **émission** + e-reporting dès le 01/09/2026. | economie.gouv.fr, « Tout savoir sur la facturation électronique pour les entreprises » https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises | 15/10/2026 |
| **01/09/2027** : petites et micro-entreprises (PME) doivent émettre et transmettre leur e-reporting. | même page ; impots.gouv.fr https://www.impots.gouv.fr/professionnel/la-facturation-electronique-quest-ce-que-cest (page modifiée le 26/05/2026) | 15/10/2026 |
| Phase de démarrage : « approche de bienveillance et de tolérance ». Texte du guide DGFiP (juillet 2026) : « Cette approche ne constitue ni un report ni une suspension de l'obligation ». Pas de sanction automatique pour les entreprises en « trajectoire sérieuse de mise en conformité ». | guide pratique DGFiP https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf (Q29, p. 33) | 15/10/2026 |
| Émission volontaire avant l'échéance permise, mais **obligatoirement par une PA**. Un client ne peut pas imposer une facture électronique à une PME avant 2027. | même guide, Q17, Q18, Q20 (p. 21 à 24) | 15/10/2026 |
| Sanctions prévues : amende par facture (art. 1737 CGI) pour l'émission ; art. 1788 D CGI pour l'e-reporting ; mise en demeure avant sanction pour la réception (art. 1737 IV bis). Montants non relevés ici. | même guide, Q29 | 15/10/2026 |
| Les entreprises en **franchise en base** (cas de beaucoup d'artisans Presti) restent assujetties : soumises à la facturation électronique « en réception et en émission ». Les opérations **exonérées au titre des art. 261 à 261 E CGI** en sont exclues (la franchise 293 B n'est pas dans cette liste). | economie.gouv.fr (même page) ; FAQ DGFiP https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/faq---fe_je-decouvre-la-facturation-electronique.pdf (p. 3) | 15/10/2026 |

### 2.2 Textes

- **Articles du CGI cités par la DGFiP en vigueur** : 289 bis (émission/transmission/réception par une plateforme agréée), 289 E (la PA transmet les données à l'administration), 290 et 290 A (e-reporting), 1737 et 1788 D (sanctions), 242 nonies A annexe II (mentions de facture). Source : guide pratique et FAQ ci-dessus.
- **Décret n° 2022-1299 du 7 octobre 2022** : cité par la FAQ DGFiP et présent sur Légifrance (https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046383394). Lu en extrait de recherche seulement.
- **Ordonnance n° 2021-1190 du 15/09/2021** : confirmée comme cadre juridique d'origine par le dossier de spécifications externes v2.1 (impots.gouv.fr, extrait de recherche).
- **Loi de finances 2024, art. 26** (loi n° 2023-1322 du 29/12/2023) : **[NON VÉRIFIÉ] ici à la source**. Je ne l'ai pas rouverte sur Légifrance ; c'est elle qui, de mémoire, a fixé le calendrier 2026/2027 et remplacé « plateforme de dématérialisation partenaire (PDP) » par « plateforme agréée (PA) ». À faire relire avant de citer ce texte à un client.
- **Aucun décret ou arrêté récent de report trouvé.** La seule évolution visible de 2026 est la tolérance de démarrage (communiqué du ministre de l'Action et des Comptes publics, lien depuis la page economie.gouv.fr ; non ouvert ici).

### 2.3 Architecture : PPF, annuaire, formats

| Sujet | Ce qui est établi | Source |
|---|---|---|
| Rôle du PPF | Le portail public de facturation reste côté administration : annuaire des destinataires de factures + déclaration/collecte des données transmises par les PA. L'État décrit un « modèle ouvert » : services publics (annuaire, remontée de données) + réseau de plateformes privées agréées. Le guide DGFiP parle aussi d'un « concentrateur ». | economie.gouv.fr, actualité du 16/01/2026 https://www.economie.gouv.fr/actualites/facturation-electronique-la-liste-des-101-premieres-plateformes-agreees-est-disponible ; impots.gouv.fr/specifications-externes-b2b ; guide Q26 |
| Le PPF n'est plus une plateforme d'émission « par défaut » pour les entreprises | Les textes officiels lus ne proposent que l'annuaire et la remontée de données ; pas de service d'émission du PPF présenté aux entreprises. **[NON VÉRIFIÉ]** : la date et le texte exacts qui ont retiré l'émission du PPF. | idem |
| Annuaire | Chaque entreprise désigne dans l'annuaire la PA qui reçoit ses factures. 500 000 entreprises l'avaient déjà fait en janvier 2026. | economie.gouv.fr 16/01/2026 ; FAQ DGFiP p. 4 |
| Formats | Socle EN 16931 : **UBL, CII, Factur-X (PDF/A-3 + XML CII)**. Norme AFNOR XP Z12-012 (formats et profils des factures et des statuts de cycle de vie), XP Z12-013 (API pour relier les systèmes d'information aux PA), XP Z12-014 (cas d'usage B2B). Dossier de spécifications externes **v3.2 du 30/04/2026**. | https://www.impots.gouv.fr/specifications-externes-b2b (page modifiée le 02/07/2026) ; extrait du dossier v2.1 |
| Statuts de cycle de vie | La PA suit la facture par des « statuts » horodatés (déposée, rejetée, refusée, encaissée, etc.). Liste exacte des statuts obligatoires : **[NON VÉRIFIÉ]** (à lire dans XP Z12-012). | FAQ DGFiP p. 5 ; economie.gouv.fr |
| E-reporting | Données de transaction et de paiement transmises à l'administration pour : ventes à des **particuliers**, certaines associations non assujetties, clients étrangers. Même calendrier que l'émission. Pour un franchisé en base : transmission tous les deux mois (FAQ p. 9 et 11). Une facture n'est **pas** émise électroniquement pour un particulier : l'artisan l'envoie par son canal habituel, et ses données partent par la PA. | FAQ DGFiP p. 3, 9, 11 ; vidéo explicative economie.gouv.fr (transcription) |
| 4 nouvelles mentions obligatoires à partir du 01/09/2026 | **SIREN du client** ; **catégorie d'opération** (vente / prestation de services / les deux) ; **option TVA sur les débits** le cas échéant ; **adresse de livraison** seulement si différente de l'adresse de facturation. | economie.gouv.fr (même page) |

Conséquence pour un artisan : une grande partie de ses clients sont des particuliers (aucune facture électronique, mais de l'**e-reporting** à faire). Les clients professionnels (SIREN) passent par la PA.

## 3. Ce que fait Presti aujourd'hui (lu dans le dépôt)

Fichiers lus : `lib/facturx.ts`, `lib/facturation.ts`, `app/api/factures/[id]/facturx/route.ts`, `lib/comparatifConcurrents.ts`, `lib/plans.ts`, `lib/flags.ts`, migrations 0006/0041/0044.

**Existant**
- Route `GET /api/factures/[id]/facturx` : génère un **XML CII profil EN 16931** (`urn:cen.eu:en16931:2017`), à télécharger ; contrôle `?controle=1` avant émission (numéro, date, raison sociale, SIRET, nom + adresse client, lignes, motif d'exonération codifié, cohérence du total).
- Champs émis : numéro, date, type 380 (facture) ou 381 (avoir), lignes (quantité, unité CEFACT, prix net après remise, taux), bases HT par taux, catégorie de TVA (S ou E), motif d'exonération + code VATEX (franchise, autoliquidation, hors champ), vendeur (SIRET `0009`, n° TVA, adresse), acheteur (SIREN `0002` si présent, adresse), adresse de chantier en `ShipToTradeParty`, date de prestation (BT-72), conditions de règlement + échéance, mentions libres (TVA sur les débits), totaux.
- Règle tenue : un champ inconnu n'est **pas émis** (pas de SIREN inventé). Échappement XML systématique. Validation de SIREN par clé de Luhn (`sirenValide`).
- Base de données : `client_siren`, `categorie_operation`, `tva_sur_debits`, `exoneration_code` sur `factures` (migration 0041) ; factures scellées avec empreinte (0044) ; statuts `emise | payee | annulee`.
- Positionnement actuel honnête : la grille de `lib/plans.ts` dit « Factures + export XML Factur-X » ; le comparatif dit « Export XML Factur-X ; pas de plateforme agréée intégrée » et reconnaît que les autres sont devant sur ce point.

**Ce qui manque** (constaté dans le code ; les points marqués ⚠ sont des soupçons de non-conformité à vérifier, pas des certitudes)
1. **Aucune transmission** : pas de lien avec une PA, pas d'envoi, pas de statut, pas de réception, pas d'e-reporting.
2. Le commentaire de `lib/facturx.ts` le dit lui-même : **jamais passé au Schematron EN 16931 + CIUS France**, ni embarqué dans un **PDF/A-3** validé (VeraPDF).
3. ⚠ `categorie_operation` est lue et stockée mais **n'est pas écrite dans le XML** (le champ est dans le type `DonneesFacturX`, je ne l'ai pas vu dans `genererFacturX`). C'est l'une des 4 mentions obligatoires. À vérifier contre XP Z12-012 : où se loge cette information en CII (profil étendu France ?).
4. ⚠ Identifiants légaux (SIRET vendeur `0009`, SIREN acheteur `0002`) placés directement sous `SellerTradeParty/BuyerTradeParty` ; la norme range l'immatriculation légale (BT-30/BT-47) dans `SpecifiedLegalOrganization`. À trancher avec le validateur.
5. ⚠ Mentions de règlement (pénalités, indemnité de 40 €, escompte) mises dans `PaymentTerms/Description` ; je crois que le CIUS France demande des notes `IncludedNote` avec code sujet (PMD, PMT, AAB). **[NON VÉRIFIÉ]** de mémoire.
6. Pas d'adresse électronique de routage (BT-34/BT-49), pas de moyen de paiement (IBAN), pas de rattachement explicite à l'annuaire. Peut être pris en charge ou exigé par la PA selon son contrat.
7. Pas de format UBL ni de PDF/A-3 : acceptable si la PA prend le CII brut. **[NON VÉRIFIÉ]** pour SUPER PDP : sa page tarifs/documentation ne liste pas les formats ; Iopole annonce UBL, CII, Factur-X.
8. Pas de gestion de l'**annuaire côté artisan** (quelle PA reçoit ses factures), ni du **mandat** donné à la PA.
9. Cas BTP à couvrir côté PA : factures d'acompte et de situation, retenue de garantie, **autoliquidation sous-traitance**. Les « cas d'usage » de l'XP Z12-014 sont à confronter. **[NON VÉRIFIÉ]**.

## 4. Être au niveau d'Obat / Tolteck / Batappli : capacités à couvrir

Faits publics lus le 15/10/2026 : Obat « conforme à la réforme via Iopole » (inclus dès l'offre Pro, https://www.obat.fr/tarifs/). Batappli : PA **eFacture de Cecurity**, « gratuite pour tous les clients », émission et réception depuis le logiciel (https://www.batappli.fr/fonctionnalites). Tolteck : « notre PA sera directement intégrée au logiciel » (futur dans la phrase), réception via **Pennylane**, 100 % pris en charge par Tolteck (https://www.tolteck.com/fr-fr/facturation-electronique/). Henrri : « plusieurs PA » choisies automatiquement, flux B2B « intégralement offerts », se présente en « Solution Compatible » avec mandat résiliable (https://www.henrri.com/mes-questions-dentrepreneurs/facturation-electronique-b2b/). **Les quatre l'incluent sans supplément.** Aucun des quatre n'indique clairement l'e-reporting sur les pages lues (Henrri : « la PA transmet les données », les autres : silence).

| Capacité | Pourquoi | État Presti | Où ça se règle |
|---|---|---|---|
| Adresse de facturation / annuaire de réception | Chaque artisan désigne une PA de réception ; la PA du fournisseur la lit dans l'annuaire. | Absent | PA (annuaire) + écran Paramètres |
| Mandat artisan → PA, vérification d'identité (KYB) | La PA agit pour le compte de l'artisan. | Absent | PA (parcours d'onboarding) |
| Réception des factures fournisseurs | Obligatoire depuis le 01/09/2026 pour tous. | Absent | Webhook + écran « Factures reçues » |
| Émission via PA | Obligatoire 01/09/2027 (PME/micro) ; volontaire avant. | XML local seulement | Bouton « Envoyer » + adaptateur PA |
| Statuts de cycle de vie | Suivi horodaté : déposée, rejetée, refusée, encaissée... | Absent | Webhook + colonne de statut |
| E-reporting (particuliers, paiements) | Obligatoire en même temps que l'émission ; concerne la majorité des factures d'un artisan. | Absent | PA (transmission) + données Presti |
| Archivage probant | Conservation des factures (délais légaux, preuve). | Empreinte SHA-256 des factures scellées (0044) ; pas d'archivage probant | Option PA (Iopole : NF 461, 10 ans, en option payante) ou Storage |
| Rattachement SIREN | SIREN client obligatoire, SIRET/SIREN vendeur. | Saisie + Luhn faits | Déjà là |
| Formats | UBL, CII, Factur-X. | CII (non validé) | `lib/facturx.ts` + validateur |
| 4 mentions obligatoires | SIREN client, catégorie d'opération, TVA débits, adresse de livraison. | 3 sur 4 dans le XML, catégorie non émise (voir 3.3) | `lib/facturx.ts` |

## 5. Options comparées

**Liste officielle** : page « Je consulte la liste des plateformes agréées », modifiée le **13/10/2026**, https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees. Deux listes en PDF : (a) « opérateurs satisfaisant à l'ensemble des conditions, incluant les tests d'interopérabilité » (immatriculation définitive, avec la date de délivrance) ; (b) « dossier complet et conforme, en attente de leur immatriculation définitive conditionnée à la réussite des tests d'interopérabilité » (9 opérateurs lus). Le fichier de la liste (a) ne porte pas de date propre : j'utilise la date de modification de la page. Quelques lignes de la liste (a) portent « En attente » à la place de la date (par exemple FactureApp, Kalanda, Ratioo).

Présence dans les listes (lu le 15/10/2026) : IOPOLE (immatriculée 11/12/2025), PENNYLANE (11/12/2025), DOCOON (15/12/2025), GENERIX Group (11/12/2025), SUPER PDP (22/12/2025), SEQINO (15/01/2026), A-Cube (21/07/2026), INVOPOP (15/01/2026), STORECOVE (28/04/2026), CECURITY (18/12/2025, PA de Batappli), VosFactures (15/04/2026). **Absents sous ces noms** : Libeo, Tolteck, Henrri, Obat (Obat passe par Iopole). La PA propre de Tolteck n'est donc pas retrouvée sous son nom (elle peut être immatriculée sous la raison sociale d'un tiers) : **[NON VÉRIFIÉ]**. Chorus Pro n'est pas une PA : c'est le portail de la facturation vers le secteur public.

| Plateforme | Statut officiel (liste du 13/10/2026) | API / doc éditeur | Émission + réception | Prix public | Modèle | Sandbox | Point d'attention |
|---|---|---|---|---|---|---|---|
| **SUPER PDP** https://www.superpdp.tech | Immatriculée 22/12/2025 | Oui : API REST, doc en ligne (https://www.superpdp.tech/documentation/ , démarrage rapide en bac à sable) ; webhooks de statuts selon un comparateur tiers | Oui (page d'accueil) ; statuts, e-reporting : **[NON VÉRIFIÉ]** sur le site de l'éditeur | **Oui** : API 0,01 € HT/facture jusqu'à 10 000/mois, 0,005 € de 10 000 à 100 000, 0,0025 € au-delà ; KYC/KYB 2 € HT ; **minimum 10 € HT par an** ; offre « Compte » gratuite jusqu'à 1 000 factures/mois (https://www.superpdp.tech/tarifs) | **Marque grise** : tu paies au tarif de gros et revends ; la marque SUPER PDP apparaît à l'inscription du client. Marque blanche : « contactez-nous », conditions non publiées | Oui (démarrage rapide) | Petite structure (une comparaison tierce la décrit comme petite société parisienne). Formats supportés non listés sur le site. Risque de dépendance. |
| **Iopole** https://www.iopole.com | Immatriculée 11/12/2025 (la page dit « définitivement ») | Oui, « API first » ; doc technique incluse dans tous les plans | Oui, émission et réception, UBL/CII/Factur-X, e-reporting ; archivage légal NF 461 en option | **Non public.** Plans par volume : Starter 5 000 factures/mois, Business 10 000, Enterprise au-delà ; aucun montant (https://www.iopole.com/tarifs) | Marque grise (Starter, Business), **marque blanche** en Enterprise (option) ; module d'onboarding KYB + mandat | Oui : « sandbox en un clic » gratuite (https://labs.iopole.io/sandbox) ; 1 préproduction incluse | Référence du secteur (Obat, Axonaut, Vertuoza, Synobat). Paliers pensés pour des volumes que Presti n'a pas encore. Aucun prix public ; frais de mise en service : **[NON VÉRIFIÉ]** (une question de la FAQ existe, réponse non lue). |
| **Seqino** https://seqino.com | Immatriculée 15/01/2026 (n° 0048 d'après le site) | Oui : portail développeurs (https://dev-portal.seqino.dev/portal/catalogue-products/seqino-pdp-1/b4a01d315c59492f601ffcac91e1a2a6/docs) | Annoncé : oui | **Non public** | Marque grise ou blanche (« Intégrer par API » / « Devenir PA par API ») | **[NON VÉRIFIÉ]** | Candidate plan C. Contact : https://seqino.com/contact/ |
| **Docoon** https://docoon.com | Immatriculée 15/12/2025 (Docoon Immo : 23/12/2025) | Oui : API « REST/GraphQL, multi-tenant » citée, doc dédiée liée depuis la page | Plateforme complète (e-reporting, signature, archivage) | **Non public** | Marque grise **et blanche** natives, support délégable | **[NON VÉRIFIÉ]** | Orientée ERP, ETI, gros volumes ; probablement surdimensionnée pour un démarrage. |
| **Pennylane** https://www.pennylane.com | Immatriculée 11/12/2025 | **Aucune offre éditeur publique trouvée.** PA incluse sans surcoût pour les utilisateurs de Pennylane. | Oui pour ses utilisateurs ; Tolteck s'en sert pour la réception | Non applicable | Connecteur : à explorer | **[NON VÉRIFIÉ]** | Pennylane est aussi un logiciel de gestion, donc un concurrent indirect côté TPE ; adresse de la liste = portabilité, pas commerciale. |
| **Generix Group** https://www.generixgroup.com | Immatriculée 11/12/2025 | Oui d'après un comparateur tiers (marque blanche aux éditeurs) | Oui | **Non public** (« sur devis ») | Marque blanche | **[NON VÉRIFIÉ]** | Cible ETI et grands comptes, hors budget probable. |
| A-Cube https://www.acubeapi.com | Immatriculée 21/07/2026 | API (comparateur tiers) | Émission UBL/CII, réception, statuts, e-reporting selon ce comparateur | **[NON VÉRIFIÉ]** | API pour éditeurs | **[NON VÉRIFIÉ]** | Société italienne ; récent. À garder en réserve. |

Autres PA à API pour éditeurs repérées dans la liste, **non étudiées** : Invopop, Storecove, B2BRouter, Billit, Dokapi, VosFactures (marque grise API d'après un comparateur tiers). Le « Grand Benchmark des Plateformes Agréées » de The Invoicing Hub (avril 2026) existe et compare les cas d'usage pris en charge : https://www.theinvoicinghub.com/wp-content/uploads/2026/04/The-Invoicing-Hub-Le-Grand-Benchmark-des-Plateformes-Agreees-3e-edition-Avril-2026.pdf (non ouvert).

**Sources secondaires utilisées, à croiser** (certaines contiennent des liens d'affiliation, donc à ne pas prendre pour neutres) : comparateur-facturation-electronique.fr, comparepdp.com, infos-pa.com, ma-facture-electronique.org. Toute affirmation qui ne vient que d'elles est signalée plus haut.

**Adresses de contact trouvées, à titre d'information (non contactées)**

| Plateforme | Contact |
|---|---|
| SUPER PDP | formulaire https://www.superpdp.tech/contact (pas d'e-mail sur le site ; l'e-mail `contact@superpdp.tech` figure dans la liste DGFiP) |
| Iopole | https://www.iopole.com/contact ; contact@iopole.com (liste DGFiP) |
| Seqino | https://seqino.com/contact/ ; contact-pdp@seqino.com (liste DGFiP) |
| Docoon | contact@docoon.com ; démo : https://docoon.com/nous-contacter/?get=demo ; 01 44 88 83 60 (page Docoon) |
| Generix | pdp@generixgroup.com (liste DGFiP) |
| A-Cube | france@a-cube.io (liste DGFiP) |

## 6. Alternatives sans raccordement

| Option | Ce qu'on garde | Ce qu'on perd |
|---|---|---|
| **A. Rester sur l'export XML seul** | Zéro coût, zéro dépendance, texte honnête déjà en place. | L'artisan doit se débrouiller seul pour l'émission obligatoire de 2027 (créer un compte chez une PA, ressaisir ou téléverser le XML). Aucune réception. Aucun e-reporting. Le XML n'étant pas validé, il peut être rejeté. Presti reste la seule colonne « Non » sur le critère du comparatif et perd les artisans qui comparent. |
| **B. S'appuyer sur la PA du client ou du comptable** | Pas de développement lourd. Le guide DGFiP accepte qu'on passe par « logiciel de gestion, logiciel de comptabilité, expert-comptable, banque » (Q1). | Parcours cassé pour l'artisan (deux outils), pas de suivi des statuts dans Presti, pas de valeur ajoutée. Dépend du bon vouloir du comptable. |
| **C. Solution intermédiaire sans API** | Page d'aide « Recevoir vos factures : choisir une PA » + lien vers la liste officielle + XML validé au Schematron + import manuel. Quelques jours de travail. | Pas d'envoi ni de statut dans Presti ; ne règle ni l'e-reporting ni la concurrence. Mais **comble tout de suite le trou de la réception**. |

**Ce que font les concurrents (public)** : tous les quatre sont dans le modèle « solution compatible + PA partenaire incluse sans supplément ». Obat → Iopole ; Batappli → Cecurity (eFacture) ; Henrri → plusieurs PA partenaires (non nommées) ; Tolteck → sa propre PA pour l'émission (« sera intégrée », donc pas forcément livrée) et Pennylane pour la réception. À noter : le comparatif de Presti dit déjà, pour Tolteck, « plateforme agréée intégrée pour l'émission » ; vu le futur de la phrase de la page lue aujourd'hui, la formulation du comparatif est à revérifier.

## 7. Recommandation

**Option principale : SUPER PDP, API en marque grise, Presti « solution compatible », via un adaptateur interchangeable.**

Raisons (coût, risque, délai pour un fondateur solo) :
- **Coût maîtrisé et visible.** Seule PA à publier un barème API et à n'imposer aucun volume minimum (10 € HT/an de minimum de facturation). Illustration, avec mes hypothèses (pas une donnée du fournisseur) : 100 artisans × 15 factures par mois = 1 500 factures/mois ≈ 15 € HT/mois, plus 2 € HT par artisan à l'onboarding KYB (200 € pour 100 artisans). Peu risqué avant d'avoir des revenus. À confirmer : les factures reçues et les lignes d'e-reporting comptent-elles dans le volume ? **[NON VÉRIFIÉ]** (la page dit « une journée de caisse = une facture » pour l'e-reporting caisse).
- **Délai court** : sandbox et démarrage rapide publics, webhooks (source tierce), pas de démo commerciale obligatoire pour commencer à coder.
- **Risque principal** : petit fournisseur. Parade : l'adaptateur `lib/pa/` isole le fournisseur ; les factures sont archivées côté Presti ; on peut basculer vers Iopole.
- **Ce qui reste inconnu et décide** : formats acceptés, e-reporting exposé par l'API, statuts, gestion d'une grappe de clients (multi-tenant), contrat de sous-traitance. Un passage par la documentation (publique) répond à une partie sans contacter personne.

**Plan B : Iopole.** Plus sûr (référence du marché, SecNumCloud, formats et e-reporting annoncés, archivage NF 461 en option, onboarding KYB + mandat clé en main, sandbox gratuite, Obat s'en sert). Mais prix non publics et paliers 5 000 / 10 000 factures par mois : il faudra un devis, avec un risque de minimum inadapté à un démarrage. À activer si SUPER PDP ne couvre pas l'e-reporting ou les cas BTP, ou si un contrat de sous-traitance conforme n'est pas possible.

**Plan C (réserve)** : Seqino (API, marque grise ou blanche, doc publique, prix non publics). Et, en attendant la décision, l'option 6.C (page d'aide + XML validé) coûte peu.

**Calendrier proposé** : décision fin octobre ; bac à sable et spike 1 à 2 semaines (novembre) ; version bêta fermée à partir de janvier 2027 ; mise en production générale avant mars 2027 ; échéance légale de l'émission le 01/09/2027. Les artisans doivent pouvoir **recevoir dès maintenant** : la réception peut être livrée en premier.

## 8. Ce que Benj doit décider et signer

1. **Faut-il raccorder une PA ?** (oui recommandé ; alternative : option 6.C seule). Conséquence directe : le comparatif, le texte « Export XML Factur-X » et la ligne `facture_electronique` restent en l'état tant que rien n'est livré.
2. **Quel fournisseur et quel modèle** : SUPER PDP en marque grise (recommandé), ou demander un devis Iopole. Une marque blanche n'est pas nécessaire au départ.
3. **Autoriser la lecture de la documentation et l'ouverture d'un compte sandbox** (gratuit chez SUPER PDP et Iopole) : c'est toi, personnellement, qui crées le compte. Je n'ai rien créé.
4. **Contrat / conditions** : relire les CGU et le contrat éditeur du fournisseur avant tout envoi réel (SUPER PDP : conditions publiées sous `/legal/11`, non lues ici) ; points à vérifier : responsabilité en cas de facture perdue ou rejetée, disponibilité (SLA : Iopole annonce 99,9 % contractuel en Enterprise, rien de public pour SUPER PDP), conditions de sortie et de portabilité des données, révision des tarifs.
5. **Rôle juridique de Presti** : « solution compatible », pas PA. Presti ne doit jamais écrire qu'il est « agréé ». Qui est responsable de quoi : l'artisan reste responsable du contenu de ses factures ; la PA du bon acheminement ; Presti de l'exactitude des données qu'il transmet. À faire relire à un juriste.
6. **RGPD et sous-traitance** : la PA devient sous-traitant ultérieur de Presti, qui est sous-traitant de l'artisan (ou co-responsable). Prévoir : accord de traitement (DPA) avec la PA, mise à jour de la liste des sous-traitants, des CGU et de la politique de confidentialité, localisation des données (Iopole : hébergement France SecNumCloud ; SUPER PDP : **[NON VÉRIFIÉ]**), durée de conservation.
7. **Prix pour l'artisan** : inclure sans supplément dans toutes les offres (c'est ce que font Obat, Tolteck, Batappli, Henrri) avec un plafond raisonnable, ou facturer l'e-reporting/l'archivage en option. À décider avec la grille `lib/plans.ts`.
8. **Archivage** : garder l'empreinte et le fichier côté Presti (Supabase Storage) ou acheter l'archivage probant de la PA.
9. **Calendrier** : date cible de livraison (fin février 2027 proposée) et ordre : réception d'abord, émission ensuite, e-reporting avec l'émission.
10. **Communication aux clients** (à ne faire qu'une fois livré, jamais avant) : « Presti est une solution compatible raccordée à la plateforme agréée X » ; ne pas promettre la conformité avant les tests Schematron et la validation par la PA ; mettre à jour `COMPARATIF_DATE`, le critère `facture_electronique` et `COMPARATIF_LIMITES` (règle `scripts/comparatif-qa.mjs`) ; ne pas annoncer l'e-reporting tant qu'il n'est pas livré.
11. **Presti lui-même** : Presti est assujetti à la TVA (en franchise, art. 293 B) donc **doit pouvoir recevoir** les factures électroniques de ses propres fournisseurs depuis le 01/09/2026 et **émettre** les siennes à ses artisans abonnés à partir du 01/09/2027 (factures d'abonnement émises via Stripe aujourd'hui). À régler en parallèle, avec la même PA ou une autre.

## 9. Plan technique d'intégration (dépôt Presti)

Estimation de charge : mes estimations de jours de développement, avec marge d'incertitude ; hors temps de décision et de contrat.

| Étape | Contenu | Charge |
|---|---|---|
| 0. Spike sandbox | Créer le compte sandbox (par Benj), envoyer/recevoir une facture de test, lire statuts et webhooks, tester ton XML actuel, noter les formats acceptés. Décision finale go/no-go ici. | 1 à 2 j |
| 1. Base de données (migration 0160+, à appliquer par moi via `apply_migration` après essai à sec) | `pa_comptes` (artisan_id, fournisseur, id_externe, statut_onboarding, mandat_signe_le, adresse_reception) ; `pa_envois` (facture_id, fournisseur, id_externe, statut_cycle, erreur, horodatages, empreinte du XML, UNIQUE(facture_id, version)) ; `factures_recues` (artisan_id, id_externe UNIQUE, émetteur, SIREN, montants, XML/PDF dans Storage, statut, dates) ; `pa_evenements` (journal brut des webhooks, idempotence) ; `ereporting_lots` (période, type, données, statut, id_externe). RLS par `artisan_id`, comme `factures`. Interdire la modification d'une facture déjà transmise (trigger du type 0044). | 1 j |
| 2. Couche fournisseur | `lib/pa/index.ts` (interface : `creerCompte`, `envoyerFacture`, `lireStatuts`, `recevoir`, `declarerEreporting`), `lib/pa/superpdp.ts`, `lib/pa/mock.ts` pour les tests, clés dans les variables d'environnement serveur. | 2 à 3 j |
| 3. Onboarding artisan | Écran Paramètres : SIRET/SIREN du vendeur vérifiés, KYB, signature du mandat (lien du fournisseur), choix de la PA de réception dans l'annuaire, affichage de l'état. Route `POST /api/pa/onboarding`. | 2 à 3 j |
| 4. Émission | Reprendre `lib/facturx.ts` : écrire la catégorie d'opération ; ranger SIREN/SIRET dans `SpecifiedLegalOrganization` ; notes avec codes sujet si le CIUS l'exige ; passer le **Schematron EN 16931 + CIUS France** en test automatisé (script du type `scripts/facturx-e2e.mjs`) ; PDF/A-3 si la PA le demande ; route `POST /api/factures/[id]/envoyer` (contrôle `controlerAvantEmission`, sceller, créer `pa_envois`, appeler la PA, **clé d'idempotence = id de facture + version**). Client sans SIREN (particulier) : pas d'envoi de facture, partie e-reporting. | 3 à 5 j |
| 5. Réception et statuts | Route `POST /api/webhooks/pa` (signature vérifiée, idempotente, journal `pa_evenements`, répond vite, traitement différé), plus une tâche cron de rattrapage dans `app/api/cron/`. Écran « Factures reçues » + statuts dans la liste des factures (`app/factures/page.tsx`) : déposée, rejetée, refusée, encaissée... ; action « Encaissée » liée au passage `payee`. | 3 à 4 j |
| 6. E-reporting | Données de transaction (ventes aux particuliers) et de paiement : déclenchées à l'émission/encaissement, lot périodique (tous les deux mois en franchise d'après la FAQ ; autres périodicités à relire). | 3 à 5 j |
| 7. Archivage | Stockage du XML et du PDF transmis + accusés (Storage Supabase) ou option de la PA. | 1 à 2 j |
| 8. Tests et mise en ligne | `scripts/pa-e2e.mjs` (mock + sandbox), tests de rejet (SIREN faux, total incohérent, nom avec `&`), cycle complet, procédure presti-verify, juge en production. | 2 à 3 j |
| 9. Drapeau et vitrine | `lib/flags.ts` : ajouter `factureElectroniquePA` (false jusqu'à vérification en production ; routes en 404/503 et menu masqué). Quand livré : changer `PRESTI.facture_electronique` et `COMPARATIF_LIMITES` dans `lib/comparatifConcurrents.ts` (affiché par `app/ComparatifConcurrents.tsx`), la ligne « Factures + export XML Factur-X » de `lib/plans.ts` (groupe « Devis & factures », capacité `factures.electronique`), `COMPARATIF_DATE`, puis `scripts/comparatif-qa.mjs`. Règle « fonctionnalité livrée = visible dans DemoSequence ». | 1 j |
| **Total** | | **18 à 28 j** |

À ne pas oublier : la règle de la vitrine (rien d'annoncé avant d'être livré), l'ordre « migration collée puis drapeau levé » déjà en usage dans `lib/flags.ts`, et le texte de `lib/plans.ts` qui interdit de laisser croire à une conformité non assurée.

## 10. Risques et inconnues restantes

- **Rien n'a été contacté ni testé.** Aucune API n'a été appelée ; toutes les capacités techniques viennent des pages publiques et, pour SUPER PDP, d'un extrait de la documentation et de comparateurs tiers (potentiellement affiliés).
- **Loi de finances 2024 art. 26 et ordonnance 2021-1190** non rouvertes à la source (lues par ricochet). Montants des amendes : non relevés.
- **Statuts de cycle de vie obligatoires, formats exacts de l'e-reporting, règles BR-FR du CIUS France** : à lire dans le dossier v3.2 des spécifications externes et l'XP Z12-012 (non ouverts).
- **Le XML de Presti n'est pas validé** ; les points 3.3 à 3.5 sont des soupçons à confirmer par le Schematron. Le temps de correction peut dépasser l'estimation.
- **Cas BTP** (acompte, situation, retenue de garantie, autoliquidation en sous-traitance) : non confrontés aux cas d'usage XP Z12-014 ni aux capacités de chaque PA.
- **Dépendance et continuité** d'une petite PA (SUPER PDP) ; pour Iopole, tarifs et minimums inconnus.
- **Exactitude du comparatif de la page d'accueil** : la ligne Tolteck est à revérifier (futur dans la phrase). Une comparaison plus ancienne que 6 mois fait échouer `scripts/comparatif-qa.mjs` : le comparatif a été relu aujourd'hui.
- **Le juriste** : rôle de « solution compatible », responsabilité, DPA, mandat et CGU. Non couvert ici.
- **Interprétation du champ d'application pour la franchise en base** : lue sur economie.gouv.fr et la FAQ DGFiP (soumises, sauf opérations des art. 261 à 261 E). À confirmer avec un expert-comptable avant de promettre quoi que ce soit à un artisan.

## 11. Sources principales (toutes lues le 15/10/2026)

- https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises
- https://www.economie.gouv.fr/actualites/facturation-electronique-la-liste-des-101-premieres-plateformes-agreees-est-disponible (16/01/2026)
- https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees (modifiée le 13/10/2026) et les deux PDF « liste_pa_attente_rapport_audit » et « liste_pa_attente_test_interop »
- https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees
- https://www.impots.gouv.fr/professionnel/la-facturation-electronique-quest-ce-que-cest
- https://www.impots.gouv.fr/specifications-externes-b2b (v3.2 du 30/04/2026)
- https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf (juillet 2026)
- https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/faq---fe_je-decouvre-la-facturation-electronique.pdf
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046383394 (décret 2022-1299, extrait)
- https://www.iopole.com/ , https://www.iopole.com/tarifs
- https://www.superpdp.tech/tarifs , https://www.superpdp.tech/ , https://www.superpdp.tech/documentation/
- https://seqino.com , https://docoon.com/facturation-electronique-faire-le-bon-choix-de-pa/
- https://www.obat.fr/tarifs/ , https://www.batappli.fr/fonctionnalites , https://www.tolteck.com/fr-fr/facturation-electronique/ , https://www.henrri.com/mes-questions-dentrepreneurs/facturation-electronique-b2b/
- Secondaires : https://comparepdp.com/articles/api-facturation-electronique , https://www.comparateur-facturation-electronique.fr/choisir-pdp/ , https://www.infos-pa.com/plateformes/superpdp , https://ma-facture-electronique.org/plateforme-agreee/liste-officielle/docoon/
- Dépôt : `lib/facturx.ts`, `lib/facturation.ts`, `app/api/factures/[id]/facturx/route.ts`, `lib/comparatifConcurrents.ts`, `lib/plans.ts`, `lib/flags.ts`, migrations 0006, 0041, 0044.
