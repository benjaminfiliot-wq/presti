# 036-026 — L'offre Entreprise, plus vendeuse et plus complète : preuve

Exécutant : claude-code, sur l'hôte d'agents Oracle, le 03/11/2026. Ni build, ni typecheck, ni commit, ni push, ni migration (gardes).
Verdict mécanique : `node scripts/offre-entreprise-site-qa.mjs` → **OK, 30 contrôles, 29 mutants vus, sortie 0** (sortie complète plus bas).

## Ressources utilisées

| Ressource | Ce qu'elle a changé |
|---|---|
| Skill `presti-design` | Palette `.lp` chaude (fond `#09090C`, corail `#D97757`, gris chaud `#8B867D`), polices du système, moteur `Motion` et son filet (rien caché sans JS, `prefers-reduced-motion` = tout immobile), une seule signature par écran, aucune 3D. La page se pose dans `.lp` et réutilise `.lp-head2`, `.lp-kick`, `.lp-btn`, `.lp-spot`, `.lp-faq`, `.lp-final`, `.lp-clair`. |
| Skill `frontend-design` | Plan de design avant le code : la signature retenue est **l'organigramme dessiné en code** (rail vertical, un point par rang, un pouls qui descend du Cerveau vers les outils) ; tout le reste reste calme. Numérotation seulement là où l'ordre est vrai (les cinq temps, les rangs). Mots écrits côté lecteur (« Parler à l'équipe », « Comment ça se passe »). |
| Skill `ui-ux-pro-max` (recherche `--domain landing` et `--domain ux`) | Le motif « Enterprise Gateway » proposait des logos de clients : **écarté** (interdit). La règle « Table Handling » a décidé l'empilement du comparatif en cartes sous 760 px plutôt qu'un défilement horizontal. |
| Skill `emil-design-eng` | Seuls `transform` et `opacity` s'animent ; entrée de l'en-tête en ease-out (`--ease-apple`) avec un décalage de 80 ms ; `:active` en `scale(.97)` sur les boutons ; survols derrière `@media (hover:hover) and (pointer:fine)`. |
| Skill `apple-design` | Interlettrage négatif sur le titre (`-.045em`), interligne serré sur les grands titres, plus large sur le corps ; cibles de 44 px (liens du sommaire, lien « Tout savoir ») ; repli `prefers-reduced-motion` sans mouvement. |
| Skill `ecc:make-interfaces-feel-better` | `text-wrap: balance` sur les titres, `pretty` sur les paragraphes courts ; aucune `transition: all` ; rayons cohérents (cartes 14–24 px). |
| Skill `design:design-critique` (critique avant de rendre) | Trois corrections appliquées : un sommaire des sections dans la colonne droite de l'en-tête (elle était vide à 1440 px) ; un bouton « Parler à l'équipe » sous les cinq temps (aucun appel pendant six écrans) ; étiquettes mono relevées de .64–.68rem à .7–.72rem. Gardé exprès : la répétition Studio/Signature dans le comparatif empilé (c'est vrai, et c'est ce qui montre l'écart). |
| Skill `reseau-neuronal` + MCP `cerveau` | `regles_pour` « page publique, offre entreprise, chiffres, témoignages » ; `chercher` « Presti pour l'entreprise », « landing ». Lus : `p5-entreprise-sur-mesure.md` § Positionnement (ce qu'on n'écrit jamais : chiffre de gain, témoignage, logo, « remplace un salarié », rendez-vous pris seul, paiement par l'IA, fonction derrière un drapeau) ; mémoire `toutes-les-ressources-a-chaque-construction-0211` (d'où cette section) ; `inventaire.md` du p5 (pas de `/entreprise`, le motif du contact n'existait pas). |
| Sources du contenu | `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` § 0.4, 2.1, 2.2, 2.4, 2.5, 2.6, 2.8, 2.9 ; `plans/011-cadrage-01-11/p6-entreprise/premiere-reponse.md` § 4.2 ; `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 3 et § 7, `inventaire-outils.md` ; `lib/plans.ts`, `lib/flags.ts`, `lib/demandesDemo.ts` (lecture seule) ; `.claude/rules/architecture-outils.md`. |
| Rendu réel, sans build | `react-dom/server` + Playwright (même méthode que `scripts/accueil-captures.mjs`) : captures 390 et 1440 px dans `captures/`, mesure du débordement (`captures/mesures-debordement.json` : `scrollWidth = clientWidth` partout, 0 élément hors cadre, marge 16 px à 390 px), et relevé mécanique des textes (`textes.md`). Outils dans `outils/`. Les polices `next/font` ne se chargent pas hors ligne : captures en police système. |

Non chargés, et pourquoi : MCP n8n-oracle (hors périmètre, aucune automatisation ici) ; skills vidéo (aucune vidéo) ; plugins 3D et GSAP (la tâche interdit la 3D lourde ; `Motion`, déjà en place, suffit).

## Ce qui a été fait (fichiers du périmètre)

| Fichier | Changement |
|---|---|
| `app/OffreEntreprise.tsx` | Variante `lp` : kicker « Sur mesure », titre et accroche de `PLANS.entreprise`, promesse, six points, les cinq temps en une ligne, bouton « Parler à l'équipe » (`/contact?motif=entreprise`), lien « Tout savoir sur l'offre Entreprise » (`/entreprise`). Variante `abo` : seulement le lien vers `/entreprise` en plus (les trois bénéfices de 036-023 restent). |
| `app/accueil.css` | Le bloc 036-023 de la carte remplacé par sa version enrichie (deux colonnes, frise des cinq temps, empilement sous 760 px). |
| `app/page.tsx` | Une seule phrase : le titre de `#tarifs` devient « Deux formules : tout préparé, ou tout automatique. Et le sur-mesure pour l'entreprise. » Rien d'autre de la landing. |
| `app/entreprise/page.tsx` (nouveau) | La page : en-tête + sommaire, ce que vous obtenez (organigramme, outils, CRM et applications, données en Europe), comparatif, cinq temps, garanties, questions, bandeau final. Métadonnées : titre, description, `alternates.canonical: '/entreprise'`. |
| `app/entreprise/entreprise.css` (nouveau) | Styles `.ent-*`, posés dans `.lp`. |
| `app/contact/page.tsx` | `?motif=entreprise` : titre « Parlons de votre entreprise », trois points, lien vers `/entreprise`. Sans motif : la même page qu'avant (fins de ligne CRLF gardées). |
| `app/contact/Formulaire.tsx` | Prop `motif` : message prérempli de quatre questions ; refusé avant l'envoi s'il est laissé tel quel. Corps envoyé inchangé. |
| `scripts/offre-entreprise-site-qa.mjs` | Juge étendu : contrôles de 036-023 gardés, 25 mutants ajoutés (un par contrôle neuf). |
| `scripts/tout-verifier.mjs` | Une entrée dans `SUITES`, juste après `p6-transverse-qa.mjs` (l.241), `cout: 'gratuit'` (la convention du fichier : 122 suites `gratuit`, aucune `local`). |

L'API n'a pas changé. Limites de `/api/contact` (`lib/demandesDemo.ts:108-111`) : message de 10 à 4 000 caractères ; le message prérempli fait 149 caractères (148 une fois rogné), et le juge le recalcule.

## Chaque affirmation et sa source

`p6` = `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`.

### La carte de `#tarifs`

| Texte | Source |
|---|---|
| « Presti pour l'entreprise » ; accroche | `PLANS.entreprise.label` et `.accroche`, `lib/plans.ts:120` (lus, jamais recopiés ; le juge le vérifie) |
| « Sur devis, après un premier rendez-vous » | `surDevis: true`, `lib/plans.ts:120` ; prix fixé dans la proposition, après le rendez-vous : p6:476-479 |
| « Votre propre équipe d'assistants IA, construite pour votre entreprise et branchée sur vos outils. » | p6:430 (« son propre système d'exploitation agentique »), p6:432 (« ses outils branchés »), formule de la tâche § 1 |
| « Un organigramme d'assistants écrit pour vous : un Cerveau, des chefs de service, des spécialistes » | p6:447, p6:510-515 |
| « Branché sur vos outils : Gmail, Outlook, Google Agenda, Slack, Teams, votre CRM, votre compta » | p6:586 ; p6:449 ; OUTILLAGE.md § 3 (nœuds Gmail, Outlook, Google Agenda, Slack, Teams) |
| « Vos procédures écrites, une à une, guident chaque assistant » | p6:448 |
| « Un CRM sur mesure : vos champs, vos étapes, vos rôles, votre vocabulaire » | p6:451 |
| « Des applications à votre nom : centre de commande, app de terrain, portail de vos clients » | p6:452, p6:488-489 (« sous son organisation, son nom et ses couleurs »), p6:494, 497, 498 |
| « La même autonomie que Signature, réglée type par type et fixée au contrat » | p6:438-440 |
| Les cinq temps | p6:587 (§ 2.8) |

### La page `/entreprise`

| Texte | Source |
|---|---|
| Kicker « Presti pour l'entreprise » | `PLANS.entreprise.label`, `lib/plans.ts:120` |
| Titre « Votre propre équipe d'assistants IA, construite pour votre entreprise. » | p6:430 ; tâche § 1 |
| « Des assistants écrits d'après ce qui vous fait perdre du temps, chacun avec son rôle » | p6:447 (« dérivés de ses irritants, chacun avec son chef ») |
| « qui travaillent dans les outils que vous utilisez déjà » | p6:237 (« dans les outils du client, pas à côté ») |
| « Au début, rien ne part sans votre accord ; ensuite, seuls les types d'action que vous acceptez par écrit partent seuls. » | p6:483 (mode ombre, validation d'un clic, automatique type par type sur accord écrit) |
| « Sur devis, aucun prix public » | p6:440-441 |
| « Même autonomie que Signature » | p6:440 |
| « Base de données à Francfort » | `.claude/rules/architecture-outils.md:104` (Supabase `eu-central-1`, région AWS de Francfort ; formulation de la tâche § 2.2) |
| Sommaire « Sur cette page » | les sections de la page elle-même |
| « Une équipe, vos outils, vos applications. » / « on ne garde que ce qui vous sert » | p6:521 (« on ne garde que ceux qu'exige un irritant signé »), p6:489 (« Chaque application découle d'un irritant ») |
| « Qui décide, qui exécute, qui rapporte. » | p6:507 |
| « Vous pouvez parler à chaque niveau… « Où en est la relance des impayés ? »… l'assistant lit l'état réel, il ne devine pas. » | p6:517-519 |
| Rang 0 « Vous et votre équipe — Vous décidez, vous validez, vous pouvez tout couper. » | p6:510 |
| Rang 1 « Le Cerveau — Trie, lit et écrit, parle, vérifie. Il répartit le travail et ne décide jamais d'un montant. » | p6:511, p6:225 |
| Rang 1 « La porte de conformité — Un veto sur tout ce qui sort. Elle ne peut rien envoyer elle-même. » | p6:512 |
| Rangs 2 et 3 « Chef de service » + services et spécialistes (Accueil et qualification ; Ventes ; Administratif ; Finance) | p6:513-514 ; p6:525 (lecteur multi-boîtes, trieur, qualificateur à grille, répondeur), p6:526 (chiffreur sur ses prix, rédacteur de propositions, relanceur), p6:528 (pièce manquante, échéances, archiviste), p6:529 (facturier, relanceur d'impayés, export au comptable) |
| « Et selon ce qui vous fait perdre du temps : Opérations, Après-vente et réputation, Direction, Marketing. » | p6:527, 530, 531, 532 ; p6:521 |
| Rang 3 « Vos outils — Les connecteurs lisent, et n'écrivent que sur la liste d'accès que vous signez. » | p6:515 |
| « Vos outils branchés, sous leur vrai nom » — « Les assistants travaillent dans vos outils, pas à côté. » | p6:237 |
| « Vous donnez vous-même chaque accès ; chaque outil commence en lecture » | p6:237-240 ; p6:481 (« le client connecte lui-même ses comptes ») |
| « on vérifie qu'il se lit bien avant de vous promettre quoi que ce soit » | p6:481 (« essai de lecture de chaque outil avant toute promesse ») |
| Étiquettes d'outils (29 noms) | OUTILLAGE.md § 3 (nœuds natifs : Gmail, Outlook, Google Agenda, Drive, Docs, Sheets, Chat, OneDrive, Excel, Slack, Teams, HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday, ClickUp, Stripe, QuickBooks, Xero, fiche Google Business Profile ; par l'API : Pennylane, Tiime, Sage, Yousign, DocuSign) et § 7. Exclus : WhatsApp (`canauxWhatsapp: false`, `lib/flags.ts:70`), SMS (`smsClients: false`, `lib/flags.ts:319`), Qonto et l'agrégateur bancaire (« à étudier »). En texte, sans logo. |
| « Votre CRM et vos applications sur mesure » — « À votre nom et à vos couleurs. On part de ce catalogue, on choisit et on adapte… » | p6:488-490 |
| « Un écran par rôle, et tout ce qu'un assistant fait, un bouton le fait aussi. » | p6:502-504 |
| Centre de commande de direction (gérant, associés) | p6:494 (sans le compteur de modèle externe, qui relève du mode privé) |
| CRM sur mesure (administratif, commerciaux) | p6:495 |
| Vue « monde » de l'entreprise (direction) | p6:496 |
| App de terrain (compagnons, techniciens) | p6:497 (sans « hors ligne possible », non vérifié) |
| Portail de vos clients (vos clients) | p6:498 |
| Formulaires métier (votre équipe, vos clients) | p6:499 |
| Tableaux de bord et rapports (direction, comptable) | p6:500 (« KPIs en euros » réécrit « indicateurs face à votre point de départ » : aucun montant affiché) |
| « Votre base de données est chez Supabase, à Francfort (région eu-central-1). » | `.claude/rules/architecture-outils.md:104` |
| « D'un client à l'autre, seuls les gabarits se réutilisent, jamais les données. » | p6:573 |
| « Les modèles d'IA, eux, ne sont pas tous en Europe : chaque fournisseur est nommé dans le contrat de sous-traitance » | tâche § 2.2 (ne pas écrire que rien ne sort d'Europe) ; p6:601 (sous-traitants ultérieurs listés, dont le fournisseur du modèle) |
| « aucune de vos données ne part vers un modèle gratuit en ligne » | p6:558 ; `.claude/rules/securite.md` |
| Comparatif — en-têtes Studio, Signature | `PLANS.studio.label`, `PLANS.signature.label`, `lib/plans.ts:117-118` |
| « Le même moteur que Signature, avec la même autonomie. Ce qui change, c'est que tout est écrit pour vous. » | p6:438-440 |
| Ligne Autonomie : Studio, Signature | `PLANS.studio.accroche`, `PLANS.signature.accroche` (lus dans `lib/plans.ts:117-118`) ; Entreprise : p6:440 |
| Ligne Assistants : « L'assistant de gestion, qui prépare » / « … et le Pilote automatique » / organigramme | `'assistant'` Studio `lib/plans.ts:89`, drapeau `assistant: true` `lib/flags.ts:161` ; `'assistant.pilote'` Signature `lib/plans.ts:103`, `piloteAutomatique: true` `lib/flags.ts:243` ; Entreprise p6:447. (Les « sept départements standards » du § 2.2 ne sont pas écrits : `systemeAgents: false`, `lib/flags.ts:340`.) |
| Ligne Ce qui les guide : « Vos réglages » / « Vos procédures écrites… » | p6:448 |
| Ligne Outils : « Votre boîte e-mail » / « Tous vos outils… » | `'canaux.email'` Studio `lib/plans.ts:76` (Signature en hérite), drapeau `messagerie: true` `lib/flags.ts:44` ; Entreprise p6:449 (sans « banque en lecture » ni « logiciel métier ») |
| Ligne Données | p6:450 |
| Ligne CRM : « Non inclus » / « Le CRM « atelier » » / sur mesure | `'crm'` seulement en Signature, `lib/plans.ts:100`, `crm: true` `lib/flags.ts:172` ; Entreprise p6:451 |
| Ligne Applications : « La console Presti » / sur mesure | p6:452 |
| Ligne Pilotage : « Votre console et « Mes chiffres » » / page du matin de direction… | `'chiffres'` Studio `lib/plans.ts:80`, `comptabilite: true` `lib/flags.ts:47` ; Entreprise p6:455 |
| Ligne Évolution | p6:456 |
| Lignes retirées | Équipe humaine (organisation multi-membres) et Données privées (mode privé) : p6:453-454, fonctions pas en ligne (tâche § 2.3 ; aucun drapeau `organisations` dans `lib/flags.ts`) |
| « Cinq temps, et rien ne se construit sans votre accord écrit. » | p6:480 (accord écrit, étape 6) avant p6:482 (construction, étape 8) |
| 1. Rendez-vous — « votre métier, vos outils, ce qui vous fait perdre le plus de temps. Vos chiffres se lisent dans vos outils, pas à l'estime. » | p6:476 (C2, chiffres lus dans ses outils, C3) |
| 2. Accueil — formulaire en deux temps, avec dictée ; outils et accès, puis chaque tâche ; compétences écrites relues | p6:477 |
| 3. Proposition — construit, calendrier, coût récurrent mesuré, deux options réelles, devis envoyé avant et parcouru ligne à ligne ; signature du devis, du contrat de sous-traitance, de l'annexe d'autonomie | p6:479, p6:480 |
| 4. Mise en service — construit et testé sur des données de test sans toucher vos outils ; mode ombre ; validation d'un clic ; automatique type par type sur accord écrit | p6:482, p6:483 |
| 5. Suivi mensuel — page du matin, rapport du lundi, bilan à un mois, point mensuel ; chaque refus ajuste une procédure ou une règle | p6:484 |
| « Le premier temps, c'est un rendez-vous. » | p6:476 |
| Garantie « Un contrat de sous-traitance RGPD — Article 28 : Presti agit comme sous-traitant, et chaque sous-traitant ultérieur est nommé. » | p6:480, p6:601 |
| Garantie « La liste des accès en écriture, signée — Vos outils commencent en lecture. Un assistant n'écrit que là où vous l'avez signé. » | p6:480, p6:240, p6:515 |
| Garantie « Rien ne part sans votre accord au début » | p6:483 |
| Garantie « Ce qui ne part jamais seul — Encaisser, rembourser ou payer ; émettre ou modifier une facture scellée ; supprimer des données ; répondre seul à un avis négatif. Même au contrat. » | p6:564-566 |
| Garantie « De nouveaux assistants par avenant… sans toucher au reste. » | p6:456 |
| Q « Combien ça coûte ? » | p6:440-441 ; p6:479 |
| Q « En combien de temps est-ce en place ? » | p6:479 (le calendrier dans la proposition) ; p6:481 (essai de lecture avant toute promesse) |
| Q « Faut-il changer d'outils ? » | p6:237 |
| Q « Où vont nos données ? » | `.claude/rules/architecture-outils.md:104` ; p6:573 ; p6:601 ; p6:558 |
| Q « Qui valide ce qui part ? » | p6:483 ; p6:564-566 |
| Q « Est-ce le même moteur que Signature ? » | p6:438-440 |
| Bandeau final « Parlons de ce qui vous fait perdre du temps. » + « Un premier rendez-vous… une proposition avec deux options réelles. » | p6:476, p6:479 |
| Bouton « Parler à l'équipe » | p6:474, p6:588 |
| Métadonnées (titre, description, canonique) | contenu ci-dessus ; canonique exigé par la tâche § 2 |

### Le contact au motif entreprise

| Texte | Source |
|---|---|
| Kicker « Presti pour l'entreprise » | `PLANS.entreprise.label` |
| « Parlons de votre entreprise » | tâche § 3 |
| « Dites-nous en quelques lignes qui vous êtes et ce qui vous fait perdre du temps. Nous vous proposons ensuite un rendez-vous. » | p6:474 (« un workflow n8n range la demande et prépare le rendez-vous ; créneau proposé par Benj ») |
| Les trois points (rendez-vous de découverte ; proposition à deux options et devis ligne à ligne ; rien de construit sans accord écrit) | p6:476, p6:479, p6:480-482 |
| « Avant d'écrire ? Tout savoir sur l'offre Entreprise : ce qui est construit pour vous, comment ça se passe, vos garanties. » | la page `/entreprise` |
| Libellé « Votre entreprise, en quatre réponses » et les quatre questions | tâche § 3 |
| « Répondez à au moins une des questions avant d'envoyer. » | garde locale : le message laissé tel quel passerait la limite de 10 caractères de l'API (`lib/demandesDemo.ts:111`) sans rien dire |

## Interdits vérifiés

- Aucun prix, aucun chiffre de gain, aucun témoignage, aucun logo, aucune image (`<img` absent), aucune capture : juge, contrôles `PRIX`, `GAIN`, `TEMOIGNAGE` sur la page, la carte, le contact et le formulaire.
- Aucun « démo » visible dans les fichiers de la tâche : contrôle `DEMO`. **Réserve, hors périmètre** : la carte affiche `PLANS.entreprise.accroche`, qui dit encore « Sur démonstration et sur devis » (`lib/plans.ts:120`). Le juge de 036-023 exige que l'accroche vienne de `PLANS` ; `lib/` est interdit à cette tâche. Le juge l'écrit en avertissement à chaque passage. Correction prévue par `premiere-reponse.md` § 4.2 (`lib/plans.ts`, avec `messageVerrou` `lib/plans.ts:169`) : à faire par la session principale.
- Aucune fonction derrière un drapeau baissé : ni WhatsApp (`lib/flags.ts:70`), ni SMS (`:319`), ni l'organisation multi-membres, ni le mode privé, ni l'écran « Connexions » (`connexions: false`, `:344`), ni les « départements » du système d'agents de l'artisan (`systemeAgents: false`, `:340`) ; contrôle `DRAPEAU_BAISSE`. La page vend ce qui est **construit pour le client** (p6 § 2.5, « catalogue de départ, à choisir et à adapter ») ; elle ne présente aucune de ces applications comme déjà en ligne dans Presti.
- Aucun mot creux (« révolutionnaire », « booster », « clé en main », « solution innovante ») : contrôle `CREUX`.
- Europe : « Francfort » et « ne sont pas tous en Europe » exigés, « rien ne sort d'Europe » refusé : contrôles dédiés.

## Sortie du juge et de ses mutants

```text
$ node scripts/offre-entreprise-site-qa.mjs
avertissement : PLANS.entreprise.accroche contient « démonstration » (lib/plans.ts) — à corriger hors de ce juge : « Sur mesure : votre équipe, vos outils, vos automatisations. Sur démonstration et sur devis. »
OK : 30 contrôles, carte présente sur 2 pages, page /entreprise et contact jugés, 29 mutants vus
sortie=0
```

30 contrôles = l'état réel + 29 mutants. Chaque mutant doit **changer la source** (sinon « inopérant », échec) et être **vu par le motif attendu** (sinon « non vu », échec) ; un seul raté fait sortir 1.
Mutants de 036-023 (gardés) : carte retirée, prix écrit, lien cassé, accroche en dur.
Mutants de 036-026 : carte non enrichie (3 points), un temps manque à la carte, carte sans lien vers `/entreprise`, variante abo sans ce lien, page absente, canonique retiré, un temps manque à la page, une application manque, outil inventé (WaveSpeed), moins de six outils, bouton de la page cassé, prix sur la page, « Demander une démo », « Gagnez 10 heures », « 30 % », témoignage en `<blockquote>`, logo en `<img>`, WhatsApp ajouté, mot creux, « Rien ne sort d'Europe », contact sourd au motif, question manquante au prérempli, corps de l'API changé, « démo » au contact, juge retiré du lanceur.

## Autres suites relues (aucune n'a rougi par ce travail)

- Vertes : `promesses-suite-qa` (10/0), `maquette-formulaire-qa`, `geo-presti-qa`, `aide-automatique-qa` (62/0, avec `ts-loader`), `comparatif-qa` (avec `ts-loader`).
- Rouges **avant** ce travail, sans lien avec lui : `offres-affichage-qa` et `essais-gratuits-qa` (empreintes et montants de Studio/Signature : le changement de prix du 03/11, `lib/plans.ts:115-118`) ; `achat-ecrans-qa` EA-9/EA-10 (lit l'historique git de cette copie, signale aussi `lib/flags.ts`, que je n'ai pas touché) ; `landing-v3-qa` (juge d'une maquette v3 non posée) ; `promesses-qa` (« référence illisible » de l'historique git). À rejouer par la session principale sur le PC, où l'historique est complet.

## Risques et points à valider (pour la session principale et Benj)

1. **L'accroche de `lib/plans.ts:120`** dit « Sur démonstration » : à réécrire (hors périmètre ; le juge l'avertit).
2. **Le motif n'est pas transmis à l'API** : `lireMotif` (`lib/demandesDemo.ts:59-71`) exige motif, taille ET activité en liste fermée ; un motif seul serait refusé et journalisé. Le jour où `demandesDemo` se lève (après 0190), il faudra deux listes dans le formulaire (taille, activité) pour ranger la demande dans `demandes_demo`. Aujourd'hui, l'e-mail part comme avant, les quatre réponses dans le message.
3. **Build, typecheck et vérification en direct non faits ici** (interdits) : `npm run build` et `npm run typecheck`, puis l'aperçu Vercel (`/entreprise` en 200, `/contact?motif=entreprise`, `/contact` inchangé, DOM sans « démo »), à faire par la session principale avant de montrer à Benj. Point d'attention du typage : `Formulaire({ motif }: { motif?: 'entreprise' } = {})` et `Contact` devenu `async` avec `searchParams: Promise<…>` (forme de Next 16 déjà employée par `app/studio/commander/[jeton]/page.tsx:12`).
4. **`/entreprise` n'est pas dans `app/sitemap.ts`** ni dans `PublicPied` (tous deux interdits à cette tâche, travail en cours d'une autre session) : à ajouter ensuite pour l'indexation.
5. Captures en police système (hors ligne) : la vraie typographie (Bricolage Grotesque, Hanken Grotesk, JetBrains Mono) se voit sur l'aperçu.
