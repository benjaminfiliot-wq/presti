# RESUME 10 LIGNES
1. Presti est un SaaS en production pour les artisans français du bâtiment. Il répond aux demandes de devis en moins d'une minute, chiffre les devis avec les prix de l'artisan, relance, facture, propose un CRM et vend un site à la demande (300 € une fois). Tout est en marque blanche : le client ne voit jamais « Presti » (SaaS/CLAUDE.md l.13 et règle 4 ; wiki/concepts/Offre exacte et interdits en prospection.md).
2. Benj est le seul propriétaire et le seul opérateur. Alexandre est sorti le 08/09 (migration 0084). Gabriel et Louis-Victor ne travaillent plus pour lui depuis le 24/09. L'argent, les comptes et la publication restent à Benj (Decisions/Journal-Decisions.md, entrées 2026-09-06, 2026-09-08 et 2026-09-24).
3. Il y a deux offres depuis le 25/10. Studio coûte 59 €/mois : l'IA prépare et l'artisan valide. Signature coûte 99 €/mois : réponses, relances, Pilote et CRM partent seuls. L'Essentiel n'est plus vendu. L'essai sans carte dure 7 jours en Studio et 21 en Signature (décision du 26/10). lib/plans.ts fait foi (Journal-Decisions 2026-10-25 et 2026-10-26 ; wiki/concepts/Offres et grille tarifaire.md ; presti/lib/plans.ts:63, 98-99, 108).
4. Positionnement : on dit « automatique » partout, mais seulement pour ce que le plan fait vraiment, et par défaut l'artisan valide. Interdits : appel géré, rendez-vous posé, notification inventée, prix d'abonnement dans une vidéo (Journal-Decisions 2026-10-25 et l.98 ; wiki/concepts/Positionnement automatique.md ; Promesses dans les pubs et garde-fous.md).
5. Cible : indépendants et TPE du bâtiment (moins de 20 salariés, hors chaînes), en Charente-Maritime d'abord, puis dans les départements voisins. On écrit à l'adresse publiée par l'entreprise ou par la liste RGE de l'ADEME, une seule fois à vie, avec une phrase STOP. Le plafond est de 50 premiers e-mails par jour (Journal-Decisions l.82, l.89, 2026-10-26 soir D2, 2026-10-29 l.5 ; wiki/concepts/Profil du prospect idéal et portes d'entrée.md).
6. Le premier message présente Presti : un fait vrai sur l'artisan, deux phrases sur l'outil, une démo de 10 minutes, l'essai gratuit sans carte, la source de l'adresse et STOP, en 80 à 130 mots. Ordre des canaux : e-mail, puis Instagram @prestiapp, puis commentaire de la Page. Benj tient le téléphone. Reddit sert seulement à trouver des leads, et on ne touche jamais un compte non-Presti (wiki/concepts/Premier message - présenter Presti.md ; Ordre des canaux de contact.md ; Journal-Decisions l.85 et l.101).
7. Le vault ne montre aucun résultat commercial. Depuis le 26/10 : 47 premiers e-mails, 7 réponses, aucune chaude. Harvey prépare des candidats vérifiés (115 le 01/11), mais son envoi est en pause. Aucun client payant n'est documenté depuis le « MRR 29 € » du 07/09 (wiki/hot.md l.23 ; inbox/sessions/2026-11-01-12h11-2eb202a3-fin.md ; Produit/Journee-2026-10-25.md l.16 ; Récap-Projet.md l.115).
8. Pubs : seul l'œil de Benj tranche, et les notes de 7 à 9 sur 10 des juges n'ont prédit aucun de ses verdicts. On copie plan par plan la vidéo d'un autre créateur qu'il désigne, avec toute la boîte à outils et le workflow pub-10-sur-10. On ne ralentit jamais (au moins 3,3 mots/s), la voix est celle de Benj (Fish), et rien n'est publié sans lui. Tout ce qui a été rendu depuis le 26/10 est refusé ou sans verdict (wiki/concepts/Verdicts de Benj sur les films - historique.md ; Journal-Decisions 2026-10-26 et 2026-10-29).
9. Règles de conduite :
   - écrire à Benj en français, court, au fil de l'eau ;
   - ce qui est public, payant, irréversible ou personnel reste à lui ;
   - rien à payer : il n'y a que les 200 € de crédit Claude ;
   - ne jamais toucher un compte non-Presti ;
   - tuer un processus par son PID seulement ;
   - jamais de git restore, reset, clean ni stash.
   (wiki/concepts/Règles de Benj — communication.md ; Règles de Benj — accords et gestes interdits.md ; Journal-Decisions 2026-10-29 l.8.)
10. L'architecture du 01/11 n'est pas dans le vault : n8n pour toutes les automatisations, Hermes pour l'intelligence, Orca comme harness, Supabase pour les données, Obsidian via MCP. Le mot « Orca » n'y apparaît nulle part, et Hermes y est encore un « candidat non retenu ». Le vault n'a rien digéré depuis le 29/10 à 9 h 30 (98 fils « a-integrer »). Cette décision n'est écrite que dans presti/CLAUDE.md (grep sur le vault ; wiki/concepts/Hermes OpenClaw AtomicAgent - évaluations et verdicts.md l.43 ; inbox/sessions/ ; presti/CLAUDE.md, section « Architecture imposée »).

# CONTENU
# Ce que le cerveau (vault SaaS) dit de Presti, au 01/11/2026

Lecture seule : je n'ai rien modifié, ni dans le vault, ni dans le dépôt, ni sur le serveur. Aucun secret n'est recopié ici.

## 0. Ce qui a été lu, et à la place de quoi

**Les dossiers demandés n'existent pas.** `10 Presti/`, `30 Prospection/` et `50 Automatisations/` sont absents : le test `-d` répond `ABSENT` pour les trois. J'ai lu leurs équivalents réels :

- **À la place de « 10 Presti »** :
  - `CLAUDE.md`, `Récap-Projet.md` ;
  - `wiki/hot.md`, `wiki/index.md`, `wiki/overview.md`, `wiki/log.md` ;
  - `Produit/Journee-2026-10-29.md`, la note la plus récente de `Produit/` (hors `Carte-du-code.md`, qui est générée), puis `Journee-2026-10-26.md` et `Journee-2026-10-25.md` ;
  - `Decisions/Journal-Decisions.md`, lignes 1 à 479 : environ 75 décisions, du 06/09 au 29/10.
- **À la place de « 30 Prospection »** :
  - les notes de prospection de `wiki/concepts/` ;
  - `Prospection/Audit-prospection-2026-10-26.md`, §6 et §7 ;
  - `wiki/entities/Harvey.md` et `Harvey - source de candidats.md`.
- **À la place de « 50 Automatisations »** :
  - `wiki/entities/Usine.md`, `Usine Oracle presti-usine.md` et `ia-caller.md` ;
  - les concepts « Écosystème d'agents », « Exécutants et routage des modèles » et « Hermes OpenClaw AtomicAgent » ;
  - les fils `inbox/sessions/` postérieurs au 29/10.

**Recoupements hors vault, en lecture seule :**
- dans le dépôt : `presti/lib/plans.ts`, `presti/lib/flags.ts` et `presti/CLAUDE.md` (section « Architecture imposée », modifiée le 01/11 à 14 h 14) ;
- dans presti-ops : `QG/DECISIONS.md`, `QG/ETAT.md`, `agents-prospection/outils/controles.py` et `envoi_manuel.py` ;
- `git log` et `git branch` ;
- un `docker ps` sur le serveur Oracle.

**Outils `cerveau` :** `quoi_de_neuf` depuis le 29/10, deux recherches `chercher`, et un `lire` sur la section du CLAUDE.md du dépôt.

---

## 1. Décisions en vigueur

### 1.1 Organisation et méthode

| Date | Décision | Note source |
|---|---|---|
| 06/09 | Presti appartient à 100 % à Benj. L'accord de fondateurs est caduc. | Journal-Decisions, entrée 2026-09-06 |
| 08/09 | Alexandre est sorti et tous ses accès sont retirés (migration 0084). On retire des droits sans réécrire le passé : son journal et ses 5 factures scellées restent. | Journal-Decisions, 2026-09-08 |
| 08/09 | Presti ne lit plus les données d'un artisan sans son accord. Le mode support ouvre une heure, sur un seul élément que l'artisan désigne. | Journal-Decisions, 2026-09-08 |
| 08/09 | Comptes Play et Apple reportés aux premiers revenus. Les clés Stripe restreintes ne sont pas révoquées. | Journal-Decisions, 2026-09-08 |
| 13-14/09 | Règles d'exécution : jamais `git restore/checkout/stash/reset/clean` dans une tâche, et un commit avant toute flotte. Une chaîne qui pousse s'arrête au premier FAIL (`&&`). Poussé n'est pas déployé. Une photo de démo a une provenance prouvée. | Journal-Decisions, 2026-09-14 ; `SaaS/CLAUDE.md`, règles 7 à 10 |
| 14/09 | Rien de payant sans Benj. | Journal-Decisions, 2026-09-14 |
| 24/09 | Gabriel et Louis-Victor ne travaillent plus pour Benj : il est le seul envoyeur. | Journal-Decisions, 2026-09-24 |
| 08/10 | « Presti d'abord, e-commerce arrêté. » | Journal-Decisions, l.80 |
| 19/10 | Les bots Araignée et Chasseur sont mis en sommeil, le cerveau est gardé. La prospection et le rangement du vault passent par des tâches planifiées. | Journal-Decisions, l.61 |
| 19/10 | Les agents de prospection peuvent envoyer, valider et gérer les messages dans les plafonds, sur les comptes Presti seulement. Claude leur attribue les tâches. | Journal-Decisions, l.62 |
| 19/10 | Le vault s'écrit à chaque chantier livré, et au moins une fois par jour de travail. | Journal-Decisions, l.109 |
| 26/10 | claude-obsidian est adopté et `wiki/hot.md` est relu au démarrage. La mémoire presti est indexée par le MCP `cerveau`. | Journal-Decisions, 2026-10-26 (Cerveau Obsidian) |
| 27/10 | Rien à payer : il n'y a que les 200 € de crédit Claude Platform. Les comptes rendus vont dans Slack `#presti-auto`, sans donnée de prospect. Le PC reste éveillé. | Journal-Decisions, 2026-10-29, l.7, l.8 et l.13 |

### 1.2 Offres et produit (le code fait foi)

| Date | Décision | Note source |
|---|---|---|
| 13/09 | Site à la demande : 300 € une fois, hors abonnement, livré sous forme de dossier statique. | Journal-Decisions, 2026-09-13 ; `wiki/concepts/Offre exacte et interdits en prospection.md` |
| 13/10 | Essai gratuit sans carte, un seul par compte. Les durées ont été revues le 26/10. | Journal-Decisions, l.90 |
| 13/10 | Le CRM est réservé à Signature. | Journal-Decisions, l.91 ; `lib/plans.ts:86` |
| 15/10 | La plateforme commence avec Studio. | Journal-Decisions, l.95 ; `lib/plans.ts:58` |
| 15/10 | La facture électronique par plateforme agréée peut attendre l'obligation du 01/09/2027. | Journal-Decisions, l.96 |
| 18/10 | Le TOP 8 du CRM est construit et tout est relié. Second verrou par colonne sur la table des artisans (migrations 0160 et 0161). | Journal-Decisions, l.102 et l.103 |
| 19/10 | Refonte : console en piste A « Instrument », landing en piste B « Cinéma », prix publics sur `/offres`, maquettes en HTML sans Figma. | Journal-Decisions, l.64 et l.106 |
| 20/10 | Le CRM vivant est levé et les lots 3 à 5 sont ouverts à tous. Le suivi d'entretien est ramené à 3 ans. | Journal-Decisions, 2026-10-20 |
| 21/10 | L'artisan choisit le type de devis (simple ou par lots) et de facture (facture, acompte, situation, solde). | Journal-Decisions, 2026-10-21 |
| 21/10 | Pilote automatique, en Signature : une action part après 10 minutes sans annulation. Garde-fous permanents : un prix non sourcé reste manuel, jamais d'encaissement ni d'émission, 20 envois par jour au plus. | Journal-Decisions, 2026-10-21 |
| 25/10 | Deux offres. Studio à 59 € : l'IA prépare, l'artisan valide. Signature à 99 € : tout part seul. L'Essentiel n'est plus vendu, les tarifs s'affichent « dès 59 € », CGU 2026-10-25. | Journal-Decisions, 2026-10-25 ; `lib/plans.ts:63`, `:80` et `:96-99` |
| 25/10 | L'angle « tout est automatique » va sur la landing, dans la prospection et dans les pubs, sans dépasser ce que fait le plan. | Journal-Decisions, 2026-10-25 ; `wiki/concepts/Positionnement automatique.md` |
| 25/10 | L'assistant de gestion passe en Studio. Cette décision n'est écrite que dans le code. | `lib/plans.ts:73-75` |
| 26/10 | Essai de 7 jours en Studio et de 21 jours en Signature, CGU datées du 26/10. Benj l'a confirmé le 27/10. | Journal-Decisions, 2026-10-26 et 2026-10-29 l.12 ; `lib/plans.ts:108` |

### 1.3 Prospection

| Date | Décision | Note source |
|---|---|---|
| 08/10 | Charente-Maritime (17) d'abord, puis les départements voisins, puis la France. Les artisans à vieux site sans devis en ligne passent en premier. | Journal-Decisions, l.82 |
| 12/10 | Ne jamais toucher un compte réseau qui ne s'appelle pas Presti, même pour lire ses réglages. | Journal-Decisions, l.85 ; `Règles de Benj — accords et gestes interdits.md`, l.36 |
| 13/10 | Un premier e-mail est permis à l'adresse publiée par l'entreprise, une seule fois, sans lien. | Journal-Decisions, l.89 |
| 18/10 | Ordre des canaux : e-mail, puis Instagram @prestiapp, puis commentaire de la Page. Benj tient le téléphone, pas de SMS sans son accord, Reddit sert seulement à trouver des leads. | Journal-Decisions, l.101 ; `presti-ops/QG/DECISIONS.md` |
| 20/10 | Un message par artisan, et cinq jours au moins avant tout autre envoi. On vérifie les envoyés avant d'écrire. | `wiki/concepts/Un message par artisan puis cinq jours.md` |
| 21/10 | Le premier message présente Presti : un fait vrai, deux phrases sur l'outil, une démo de 10 minutes, l'essai gratuit sans carte, la source de l'adresse et STOP. Il fait de 80 à 130 mots. | `wiki/concepts/Premier message - présenter Presti.md` ; `controles.py:103` |
| 21/10 | WhatsApp de Benj : seulement des conversations neuves ouvertes par lien direct. On ne lit rien d'autre et on n'envoie jamais le soir. | `wiki/concepts/Ordre des canaux de contact.md`, l.31 |
| 25/10 | Benj relance la prospection Presti : les agents écrivent, et il appelle lui-même les meilleurs. | `Profil et cap de Benj.md`, l.32 ; `Règles de Benj — prospection et contact.md`, l.35 |
| 26/10 | D1, « on paye rien » : l'envoi reste sur Gmail, sans infrastructure d'envoi payante. | Journal-Decisions, 2026-10-26 (soir) |
| 26/10 | D2 : l'adresse publiée dans la liste RGE de l'ADEME est acceptée, avec la phrase qui en donne la source. | idem |
| 26/10 | D3 : pas de compte France Travail. | idem |
| 26/10 | D5 : aucune chasse n'est ralentie. Objectif de 60 à 100 candidats vérifiés par jour, avec les signaux de besoin en tête. | idem |
| 27/10 | Plafond de 50 premiers e-mails par jour. | Journal-Decisions, 2026-10-29 l.5 ; `envoi_manuel.py:62` |
| 27/10 | Influenceurs : micro-comptes de 2 000 à 30 000 abonnés, sans agence, troc sans argent. Benj les contacte lui-même. | Journal-Decisions, 2026-10-29 l.6 |

### 1.4 Vidéo et pubs

| Date | Décision | Note source |
|---|---|---|
| 07/10 | Benj voit chaque vidéo avant sa publication. | Journal-Decisions, l.77 |
| 12/10 | Aucun film ne part sans la voix Fish que Benj génère. | Journal-Decisions, l.86 |
| 14/10 | Vidéos personnelles aux artisans : pas de gros plan sur la tête de Benj. | Journal-Decisions, l.94 |
| 17/10 | Aucun prix d'abonnement dans les vidéos. | Journal-Decisions, l.98 |
| 18/10 | On ne modifie plus les anciennes publications. Les pubs « mises en scène » se font sans personnage, avec les objets en héros. On ne publie jamais la nuit, seulement à partir de 8 h. | Journal-Decisions, l.99, l.100 et l.105 |
| 19/10 | Une planche côte à côte (6 images-clés) est montrée à Benj avant le film. « Les soirées perdues » est abandonnée. | Journal-Decisions, l.108 et l.58 |
| 26/10 | Jamais ralentir une référence ni ajouter de silence : la voix tient au moins 3,3 mots/s. On reprend la grammaire de la référence, jamais son décor. Voix Fish « Voix Marketing Professionnel », Drama 3. | Journal-Decisions, 2026-10-26, l.29 à l.31 |
| 28/10 | Une référence est toujours la vidéo d'un autre créateur, et on copie celle que Benj désigne (« Frisson », plus celle du 29/10 avec un hook). La règle « toujours de la 3D » est dépassée. | Journal-Decisions, 2026-10-29, l.9 et l.10 |
| 28/10 | Toute la boîte à outils dès le premier jet, et toujours le workflow `pub-10-sur-10`, jamais un seul agent. REVIEW.md porte une section « Outils vN ». | Journal-Decisions, 2026-10-29 l.11 |
| règle constante | Seul l'avis de Benj tranche : les notes de 7 à 9 sur 10 des juges n'ont prédit aucun de ses verdicts. | `Verdicts de Benj sur les films - historique.md`, l.78 |

### 1.5 Travailler avec Benj

| Date | Décision | Note source |
|---|---|---|
| 19/10 | Chaque avancement est posté dès qu'il arrive, en 2 à 4 lignes. | Journal-Decisions, l.107 ; `Règles de Benj — communication.md`, l.31 |
| 26/10 | Toujours écrire à Benj en français. | Journal-Decisions, l.32 |
| règle constante | Ce qui est public, payant, irréversible ou personnel reste à Benj. Tout le reste s'exécute sans lui redemander. | `Règles de Benj — accords et gestes interdits.md`, l.46 |

### 1.6 Décision du 01/11 : en vigueur, mais absente du vault

| Date | Décision | Source |
|---|---|---|
| 01/11 | Répartition des rôles :<br>- n8n porte toutes les automatisations ;<br>- Hermes Agent assure l'intelligence et l'orchestration ;<br>- Orca est le harness obligatoire ;<br>- Claude Code ne fait que le développement ;<br>- Supabase garde les données opérationnelles ;<br>- Obsidian est la mémoire stratégique, consultée via MCP, sans donnée opérationnelle client ;<br>- MCP fait le pont entre tous. | `presti/CLAUDE.md`, section « Architecture imposée ». Aucune note du vault. |
| 01/11 | Les données de prospects et de clients ne quittent jamais le serveur Oracle vers un service gratuit en ligne. Le n8n cloud ne reçoit aucune donnée personnelle. | Consigne de la mission. Seul le second point est écrit, dans `presti/CLAUDE.md:55`. Aucune note du vault. |

---

## 2. Contradictions repérées

**C1. Studio : la réponse part-elle seule, ou l'artisan la valide-t-il ?**
- Côté « automatique dès Studio » :
  - `wiki/concepts/Promesses dans les pubs et garde-fous.md`, l.32 ;
  - `Règles de Benj — communication.md`, l.36 ;
  - `Profil et cap de Benj.md`, l.35 ;
  - la mémoire `positionnement-automatique-2510.md`, écrite le 25/10 à 14 h 50.
- Côté « Studio prépare, l'artisan valide » :
  - Journal-Decisions, 2026-10-25 ;
  - `Positionnement automatique.md`, l.27 ;
  - `Offres et grille tarifaire.md`, l.29 et l.30.
- **Ce qui tranche :** `lib/plans.ts:63` (« en Studio rien ne part sans validation — plateforme.ia.auto passe en Signature ») et `:80`. Le premier côté a été écrit 2 h 40 avant le commit `2ba41f92` (25/10, 17 h 28). Hors vault, `presti/CLAUDE.md` l.9-10 dit encore « l'envoi autonome est vendu à partir de Studio ».

**C2. Plafond quotidien d'envoi : 5, 15, 30 ou 50.**
- 5 par jour : règle du 11/10 (`Écosystème d'agents - histoire et pause du 11-10.md`, l.46).
- 30 par jour : Journal-Decisions, 26/10 soir (D1, « PLAFOND_JOUR = 30 ») ; `Garde-fous d'envoi e-mail et délivrabilité.md`, l.30.
- 50 par jour : Journal-Decisions, 2026-10-29 l.5 ; `hot.md`, l.23.
- 15 par jour : Harvey (`Harvey.md`, l.33).
- **Ce qui tranche :** `envoi_manuel.py:62` vaut `PLAFOND_JOUR = 50`. Le plafond de Harvey reste à 15, mais son envoi est en pause.

**C3. Longueur du premier e-mail.**
- 110 mots au plus : `Format d'e-mail froid artisan.md`, l.25.
- Moins de 100 mots, pour le format B : même note, l.28.
- 60 à 110 mots, attribués à controles.py : `Journee-2026-10-26.md`, l.28.
- 80 à 130 mots : `Premier message - présenter Presti.md`, l.35.
- `hot.md` l.33 et `Journee-2026-10-29.md` l.46 la laissent encore « à trancher ».
- **Ce qui tranche :** `controles.py:103` applique 80 à 130 mots (« décision du 21/10 »).

**C4. Créneau d'envoi.**
- Du mardi au jeudi à 7 h 15 :
  - `Format d'e-mail froid artisan.md`, l.26 ;
  - `Un message par artisan puis cinq jours.md`, l.26 ;
  - `Règles de Benj — prospection et contact.md`, l.30.
- Du lundi au vendredi, de 8 h 30 à 18 h 30 : `Garde-fous d'envoi…`, l.28.
- En pratique, le lundi 26/10 : 11 envois à 8 h 45 et 16 à 10 h 10 (`Journee-2026-10-26.md`, l.9).

**C5. Relancer un prospect qui n'a pas répondu.**
- Aucune relance : la notice et le MANUEL §11.8 (`Cadre légal et notice de prospection.md`, l.32 ; `Un message par artisan…`, l.35).
- Une relance à 5-7 jours : `Format d'e-mail froid…`, l.27.
- Relances J+3, J+7 et J+12 : `SEQUENCES.csv`, en pause depuis le 13/10.
- Appliqué aujourd'hui : aucune relance (`Un message par artisan…`, l.40). Benj n'a jamais tranché.

**C6. Notice publiée contre e-mail froid.**
- La notice du 04/10 dit : « depuis le 25/09, nous n'écrivons plus à une adresse e-mail relevée sur un site ou dans une liste » (`Cadre légal…`, l.32).
- En face : la décision du 13/10 (adresse publiée) et la D2 du 26/10 (liste RGE), dans Journal-Decisions.
- C'est toujours ouvert : `Audit-prospection-2026-10-26.md`, l.259. Le paragraphe de remplacement du 12/10 n'est pas publié (`Garde-fous…`, l.47).

**C7. Phrase STOP.**
- Le format d'e-mail froid finit par « Merci, nom, Presti, à Marans », sans STOP (`Format…`, l.32).
- Le MANUEL, la notice et la CNIL l'exigent (`Premier message…`, l.25).

**C8. Comptes personnels.**
- 12/10 : « le démarchage ne part que de comptes Presti » (`Règles de Benj — prospection et contact.md`, l.37).
- En face :
  - le 21/10, le WhatsApp personnel de Benj sert à la prospection (même note, l.33) ;
  - l'e-mail part du Gmail de Benj (`Format…`, l.25 ; `Harvey.md`, l.33 : « Gmail personnel : prudence (Benj, 25/10) ») ;
  - pourtant, le 07/10, le « repli sur la boîte Gmail personnelle » avait été coupé (Journal-Decisions, l.78).

**C9. Validation humaine des envois de prospection.**
- Côté « un humain valide » :
  - Harvey met chaque envoi derrière une validation et son envoi est en pause (`Harvey.md`, l.27 et l.32) ;
  - le MANUEL §11.10 dit que Benj envoie lui-même les messages réseaux (`Ordre des canaux…`, l.36) ;
  - la D4 n'est pas tranchée (Journal-Decisions, 26/10 soir).
- Côté « automatique » :
  - le 04/10, « tout doit être auto » (Journal-Decisions, l.72) ;
  - le 19/10, « les agents peuvent envoyer » (l.62) ;
  - le 01/11, « prospection par e-mail automatique, sans validation de Benj » (`presti/CLAUDE.md`, point 4, qui signale lui-même ce conflit).

**C10. Le serveur Oracle : résilié, abandonné ou en service ?**
- Les trois versions du vault :
  - « Oracle : résilié par Benj avant le 24/10 » (Journal-Decisions, 2026-10-19, l.63) ;
  - « usine abandonnée le 11/10, ne pas proposer de la relancer » (`wiki/entities/Usine.md`, l.30 et l.40) ;
  - « essai Oracle expiré le 24/10, usine à vérifier » (`Journee-2026-10-26.md`, l.17), et « résiliation non prouvée » (`hot.md`, l.39).
- **La mesure du 01/11 :** le serveur est allumé depuis 5 semaines et 1 jour. Il fait tourner n8n 2.45.6 (« Up 2 days »), le bac à sable, les exécuteurs, SearXNG et freellmapi (« Up 5 weeks »). Le disque est plein à 90 %.

**C11. Hermes.**
- Dans le vault : Hermes est un « candidat non retenu, à réouvrir sur demande de Benj » (`Hermes OpenClaw AtomicAgent - évaluations et verdicts.md`, l.43), et il tournait en conteneur sur l'usine.
- Le 01/11 : Hermes devient la couche d'intelligence (`presti/CLAUDE.md`). Il est installé sur le PC, et les anciens conteneurs Hermes et OpenClaw ont été supprimés d'Oracle (`inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md`, l.76). Le `docker ps` n'en montre plus aucun.

**C12. Rôle de Claude Code.**
- Dans le vault : « Claude Code pense, les exécutants produisent » (`Exécutants et routage des modèles.md` ; `Règles de Benj — délégation et exécutants.md`, l.30). Depuis le 19/10, la prospection et le rangement passent par des tâches planifiées Claude (Journal-Decisions, l.61).
- Le 01/11 : Claude Code ne fait que du développement, Hermes orchestre et n8n porte les automatisations.
- Or les captures du 30-31/10 montrent 11 tâches planifiées Claude d'exploitation, dont `harvey-boucle-quotidienne`, `presti-envoi-prospection` et `presti-rangement-vault-soir`.

**C13. Voix des pubs.**
- La voix Kokoro a été jugée « horrible » le 07/10 (`Verdicts…`, l.41). Depuis le 12/10, aucun film ne part sans la voix Fish de Benj (Journal-Decisions, l.86).
- L'architecture du 01/11 dit « Voix off : Kokoro ». Le même fichier corrige plus bas : Kokoro pour les essais, Fish pour une pub publiée.

**C14. Style, structure et durée des pubs.**
- **Ancien style ou référence d'un autre créateur :**
  - le 19/10 : « on reprend l'ancien style (Les offres, Assistant IA) ; les références TikTok ne servent ni au look ni à l'animation » (Journal-Decisions, l.59 ; `Règles de Benj — barre de qualité vidéo et références.md`, l.44) ;
  - le 26/10 : « on repart du moteur Les offres v1 » (l.28) ;
  - le 28/10 : « une référence est toujours la vidéo d'un autre créateur, jamais un film Presti ; offres-v1 n'est qu'un outil de rendu » (Journal-Decisions, 2026-10-29, l.9).
- **Rendu ou structure :** le 13/10, « on copie le rendu, pas la structure » (l.92) ; le 19/10 puis le 28/10, « copie plan par plan » (`Verdicts…`, l.62 ; `Règles… barre vidéo…`, l.43).
- **Rythme :** le 17/10, « plus lent, plus d'explication » (l.98) ; le 26/10, « jamais ralentir, au moins 3,3 mots/s, un visuel neuf toutes les 0,5 à 0,9 s » (l.30 ; `Règles… barre vidéo…`, l.38).
- **3D :**
  - le 16/10, style 3D (l.97) ;
  - le 27/10, « la 3D est voulue » (mémoire `v13-mediocre-3d-oui-2710`) ;
  - le 28/10, « toujours de la 3D » est dépassé ;
  - la skill `presti-motion-adaptation` porte « 3D refusée » (déjà signalé dans `Journee-2026-10-29.md`, l.53).
- **Durée :** le 13/10, « au moins 40 s » (l.92). Or la v10 finale dure 36,6 s (`Journee-2026-10-29.md`, l.20) et la v21 v2, 37,62 s (`inbox/sessions/2026-10-29-pub-v21-inventaire-hook-v2.md`, l.25).

**C15. Assistant de gestion.**
- Offre : le 14/10, « réservé à Signature » (Journal-Decisions, l.93) ; le 25/10, il passe en Studio (`lib/plans.ts:73-75`).
- Validation : selon `lib/plans.ts:73-74`, « en Studio il prépare et l'artisan confirme (cartes) ». Le commit `8022cc60` du 29/10 dit pourtant « mode fait tout seul », « sans carte à confirmer » (`inbox/…2026-11-01-12h33…`, l.87).

**C16. Pause de l'écosystème.**
- `SaaS/CLAUDE.md` l.20 : « en pause depuis le 11/10, on ne relance rien sans sa demande ».
- En face : les captures du 30-31/10 montrent 11 tâches planifiées distinctes lancées. Benj a relancé la prospection le 25/10 (`Profil et cap…`, l.32).

**C17. Ordre des départements.**
- `Profil du prospect idéal et portes d'entrée.md`, l.30 : 17, 85, 79, 86, 16, puis 44, 49, 24, 33.
- `Harvey.md` l.34 et `Harvey - source de candidats.md` l.36 : 17, 85, 79, 16, 86, 44, 49, 33. Le 24 est absent.

**C18. Deux migrations portent le numéro 0182.**
- Celle de l'ia-caller : « migration de journal 0182 écrite, non posée » (`wiki/entities/ia-caller.md`, section « État au 26/10 »).
- Celle des comptes fournisseurs : `0182_comptes_fournisseurs.sql` (`inbox/sessions/2026-10-29-presti-comptes-fournisseurs.md`, l.22).
- La dernière migration posée est 0181 (`ls supabase/migrations`).

**C19. Abonnés payants.**
- `Récap-Projet.md` l.115 : « MRR 29 €, 1 artisan payant » (07/09).
- `Journee-2026-10-25.md` l.16 : « aucun abonné payant » à l'Essentiel.
- Aucune note n'explique l'écart.

**C20. IA gratuite et données personnelles.**
- Le 29/10 : seule la relecture publique de la recherche fournisseurs part vers l'IA gratuite. Google est exclu du produit, et Mistral gratuit entraîne ses modèles sur les requêtes sauf réglage (`inbox/sessions/2026-10-29-presti-ia-gratuite-freellmapi.md`, l.17 à l.21 et l.28 à l.31).
- Le 01/11 : le n8n d'Oracle est relié à freellmapi, avec « Gemini, Groq » proposés (`inbox/…2026-11-01-12h33…`, l.84-85).
- **Risque :** si un workflow n8n fait passer des données de prospects ou de clients par freellmapi, il enfreint la règle du 01/11.

**C21. Outils de l'architecture contre « rien à payer ».**
- L'architecture du 01/11 cite Firecrawl, Scrapin, Apify, SERP et WaveSpeed.
- En face, la règle du 27/10 « rien à payer » (Journal-Decisions, 2026-10-29, l.8), et Firecrawl est en 402 (`hot.md`, l.23). `presti/CLAUDE.md` signale lui-même ce conflit, au point 3.

**C22. Le téléphone.**
- Le 18/10 : « Benj s'occupe lui-même du téléphone » (`QG/DECISIONS.md` ; Journal-Decisions, l.101).
- En face : l'ia-caller est une IA qui appelle à froid et cale une démo (`wiki/entities/ia-caller.md`). Son prompt v3 n'est pas validé (`hot.md`, l.37).

---

## 3. Ce qui est périmé dans le vault

| Note | Ce qui est faux | Preuve |
|---|---|---|
| `Récap-Projet.md` (en-tête « 2026-09-15, v18 », l.5) | La grille « Essai / Essentiel 29 € / Studio 59 € / Signature 99 € » (l.15). | `lib/plans.ts:97`, Essentiel : « Ancienne offre, plus proposée » ; Journal-Decisions, 2026-10-25 |
| `Récap-Projet.md` | « Canal : local (FB, forums métier) » (l.14). | Ordre des canaux du 18/10 (Journal-Decisions, l.101) |
| `Récap-Projet.md` | « 3 drapeaux baissés sur 21 » et « 85 migrations, dernière 0085 » (l.36). | `lib/flags.ts` : 57 drapeaux à valeur littérale, dont 11 à false. `supabase/migrations` : dernière 0181, 168 fichiers numérotés |
| `Récap-Projet.md` | « Branche unique `main` » (l.36 et l.77). | `git branch -a` : au moins 20 branches, dont `refonte-1018`, `claude/ia-gratuite-18150d`, `claude/comptes-fournisseurs-0a934e` et `vitrine-seo-2710` |
| `Récap-Projet.md` | « Gabriel démarche avec Benj » (l.8, l.108 et l.118). | Journal-Decisions, 2026-09-24 |
| `Récap-Projet.md` | La note n'a pas été mise à jour depuis le 15/09. | Règle n°6 de `SaaS/CLAUDE.md` |
| `SaaS/CLAUDE.md` (fichier du 19/10) | « Passation du 19/10 à lire en premier » (l.17) et « la note de session la plus récente est Session-2026-10-18-19 » (l.46). | `Produit/Journee-2026-10-29.md` existe |
| `SaaS/CLAUDE.md` | « Écosystème en pause » (l.20). | C16 |
| `SaaS/CLAUDE.md` | « Publora bloqué jusqu'au 01/11 » (l.27). | Date atteinte, état non revérifié |
| `SaaS/CLAUDE.md` | Gabriel (l.40). | Journal-Decisions, 24/09 |
| `SaaS/CLAUDE.md` | « La mémoire fine vit dans la mémoire du projet OFM » (l.48). | Mémoire presti et `wiki/` depuis le 26/10 |
| `SaaS/CLAUDE.md` | La liste des skills ne cite pas claude-obsidian (l.70-76). | Journal-Decisions, 26/10 |
| `SaaS/CLAUDE.md` | n8n, Hermes et Orca ne sont mentionnés nulle part. | grep sur le vault |
| Journal-Decisions, 2026-10-19, l.63 | « Oracle : résilié par Benj avant le 24/10 ». | `ssh … uptime` : « up 5 weeks, 1 day ». `docker ps` : n8n 2.45.6 et freellmapi en marche |
| Journal-Decisions, 26/10 soir, l.18 | « PLAFOND_JOUR = 30 ». | `envoi_manuel.py:62` = 50. L'entrée du 29/10 (l.5) le corrige sans renvoi depuis l'ancienne |
| Journal-Decisions, l.90 (13/10) | Essai « de 7, 14 ou 21 jours ». | `lib/plans.ts:108` : Studio 7, Signature 21 |
| Journal-Decisions, l.93 (14/10) | « Assistant réservé à Signature ». | `lib/plans.ts:73-75` |
| `wiki/entities/Usine.md` (l.30, l.40) et `Usine Oracle presti-usine.md` (l.31-32) | « Abandonnée le 11/10 », état au 08/10, coût à vérifier avant le 24/10. | Serveur en marche, disque à 90 % (et non 99 %), n8n installé le 29/10 |
| `wiki/concepts/Hermes OpenClaw AtomicAgent…` (l.43) | « Candidats non retenus ». | `presti/CLAUDE.md` du 01/11 ; conteneurs supprimés |
| `wiki/concepts/Exécutants et routage des modèles.md` (l.34) | freellmapi et Ollama « sur l'usine, jusqu'à l'abandon ». Le routage v16 ignore Hermes, Orca et n8n. | freellmapi tourne depuis 5 semaines ; aucun Ollama dans `docker ps` ; architecture du 01/11 |
| `wiki/concepts/Garde-fous d'envoi…` (l.30) | « Plafond : 30 ». | `envoi_manuel.py:62` = 50 |
| `wiki/hot.md` (29/10, 9 h 30) | Longueur « à trancher » (l.33). | `controles.py:103` applique 80 à 130 mots |
| `wiki/hot.md` | « Résiliation Oracle non prouvée » (l.39). | Le serveur est en marche, il n'est donc pas résilié |
| `wiki/hot.md` | « CRM : rien de neuf depuis 24e5cae » (l.44). | `git log` : `8022cc60` (29/10, 17 h 21) et `a51a12a8` (29/10, 19 h 09) |
| `wiki/hot.md` | Rien n'a été écrit après le 29/10. | 98 fils `a-integrer` dans `inbox/sessions` |
| `Promesses dans les pubs…` (l.32), `Règles de Benj — communication` (l.36), `Profil et cap de Benj` (l.35) | « Automatique dès Studio ». | `lib/plans.ts:63` et `:98` |
| `Offre exacte et interdits en prospection.md` (l.50) | « Fonction non livrée : relance d'impayé ». | `lib/flags.ts:179`, `relancesImpayes: true` ; `lib/plans.ts:70` (Studio) et `:80` (Signature) |
| `Offre exacte…` (l.38) et `Offres et grille tarifaire.md` (l.44, l.48) | « À vérifier dans le code », « date du commit non relevée », « prix non relus ». | `lib/plans.ts:98-99` (59 et 99 €), `:108` (7 et 21 jours) ; `24e5caee` du 26/10 à 15 h 40 |
| `Verdicts de Benj sur les films - historique.md` | La note s'arrête à la v10 finale. Il manque la v21 : 9,04 sur 10 aux juges, puis arrêtée sur verdict de Benj, « d'une médiocrité affligeante ». | `inbox/…pub-v21…`, l.32 ; `inbox/…2026-11-01-12h33…`, l.72 et l.99 |
| `Écosystème d'agents…` (l.46) | La « tension » entre la règle des 5 par jour et les 27 envois. | Règle remplacée par 30, puis par 50 |
| `Prospection/Objections-reponses.md` (l.4) | La correction dit « 29 € / 59 € / 99 € ». | `lib/plans.ts:97` |
| `Fondateurs/Profil-Fondateurs.md` (l.34) | « Canal d'acquisition — LA QUESTION OUVERTE ». | Canaux tranchés le 18/10 |
| `wiki/index.md` (l.121) | `[[HyperFrames]]` est ambigu. | Doublon relevé par le lint, `Journee-2026-10-29.md` l.73 |
| `wiki/log.md` et la tâche `presti-rangement-vault-soir` | Aucun rangement depuis le 29/10 à 9 h 30. | Les passages du 29/10 (21 h 48) et du 31/10 (14 h 56 et 23 h 15) n'ont rien rendu : leur section « fait » est vide |
| Hors vault : `presti-ops/QG/DECISIONS.md` | Dernière entrée le 19/10. Il manque les décisions du 21/10, du 25/10, du 26/10, du 27 au 29/10 et du 01/11. | `ls` : fichier modifié le 19/10 à 00 h 01 |
| Hors vault : `presti/CLAUDE.md` | Envoi autonome dès Studio (l.9-10), « 21 drapeaux, 3 baissés » (l.252-253), « une seule branche » (l.374). | `lib/plans.ts:63` et `:80` ; `lib/flags.ts` ; `git branch` |

---

## 4. Deux constats de données et de sécurité (à traiter par l'agent principal)

1. **Un secret en clair dans le vault.** La ligne 52 de `inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md` contient une valeur qui ressemble à un code ou jeton d'authentification, collé pour Hermes. Je ne la recopie pas. L'ingestion du 26/10 se vantait de « 0 secret » (`wiki/log.md`, l.37-38). Je n'ai rien modifié.
2. **Des données de prospects dans Obsidian.** La règle du 01/11 dit « aucune donnée opérationnelle client » dans Obsidian, et `wiki/overview.md` l.22 dit « jamais de listes nominatives ». Or le dossier `Prospection/` contient :
   - `deja-contactes-email.txt` (166 lignes avec « @ ») ;
   - `corbeille-gmail-2026-09-15.md` (48 lignes avec « @ ») ;
   - `emails-artisans/`, 10 fichiers dont `envoi-2026-09-15.csv` ;
   - `prospect-JB-DECO-BAT-2026-10-21.md`.

   Je n'ai fait que compter les lignes, sans rien afficher. Par ailleurs, toute la chaîne des prospects vit sur le PC (`presti-ops/agents-prospection/file/`), pas sur Oracle.

## 5. Ce qui reste ouvert, tranché nulle part

- **Prospection :**
  - D4 (envoi automatique de la sortie de la chasse) et D6 (démo de 10 ou de 5 minutes) ;
  - la règle des 6 mots communs, qui bloque 24 messages de la chasse ;
  - la mise en file des candidats Harvey.
- **Vidéo :**
  - la vitesse de la voix Fish, 1.2 ou 1.3, et sa licence non commerciale ;
  - l'écran filmé, les logos de marques et la 3D dans `presti-motion-adaptation`.
- **IA caller :** faut-il réserver une démo après l'appel ? Son prompt v3 n'est pas validé.
- **Prospection, côté légal :**
  - remettre la notice d'accord avec l'e-mail froid et la liste RGE ;
  - trancher la relance unique ;
  - trancher la phrase STOP dans le format d'e-mail.
- **QG :** inscrire les décisions du 21/10 au 01/11 dans `QG/DECISIONS.md`.
- **Branches en attente :**
  - `ia-gratuite`, avec ses gestes Benj (OVH, port 443, Caddy, couper l'entraînement Mistral) ;
  - `comptes-fournisseurs`, qui demande de lire les CGU des négoces avant tout calibrage.
- **Migrations :** la collision du numéro 0182.
- **Architecture du 01/11 :** le conflit entre la prospection automatique et la validation humaine, et la migration une par une des automatisations codées vers n8n (`pg_cron acq-*`, crons Vercel, Pilote, relances, tâches planifiées Claude).
- **Divers :** WSL pour claude-obsidian (Journal-Decisions, 26/10, l.37).

# SOURCES
C:/Users/benja/Documents/SaaS/CLAUDE.md
C:/Users/benja/Documents/SaaS/Récap-Projet.md
C:/Users/benja/Documents/SaaS/wiki/hot.md
C:/Users/benja/Documents/SaaS/wiki/index.md
C:/Users/benja/Documents/SaaS/wiki/log.md
C:/Users/benja/Documents/SaaS/wiki/overview.md
C:/Users/benja/Documents/SaaS/Decisions/Journal-Decisions.md (lignes 1 à 479)
C:/Users/benja/Documents/SaaS/Produit/Journee-2026-10-29.md
C:/Users/benja/Documents/SaaS/Produit/Journee-2026-10-26.md
C:/Users/benja/Documents/SaaS/Produit/Journee-2026-10-25.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Offres et grille tarifaire.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Positionnement automatique.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Profil du prospect idéal et portes d'entrée.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Premier message - présenter Presti.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Format d'e-mail froid artisan.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de Benj — prospection et contact.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de Benj — accords et gestes interdits.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de Benj — communication.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de Benj — barre de qualité vidéo et références.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de Benj — délégation et exécutants.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Cadre légal et notice de prospection.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Promesses dans les pubs et garde-fous.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Verdicts de Benj sur les films - historique.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Références de Benj et ce qu'elles enseignent.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Offre exacte et interdits en prospection.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Hermes OpenClaw AtomicAgent - évaluations et verdicts.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Profil et cap de Benj.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Documents perimes et ce qui fait foi.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Ordre des canaux de contact.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Un message par artisan puis cinq jours.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Écosystème d'agents - histoire et pause du 11-10.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Garde-fous d'envoi e-mail et délivrabilité.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Exécutants et routage des modèles.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Cap de Benj, gestes et perimetres des agents.md
C:/Users/benja/Documents/SaaS/wiki/concepts/Système neuronal du cerveau.md (recherche par grep)
C:/Users/benja/Documents/SaaS/wiki/entities/Harvey.md
C:/Users/benja/Documents/SaaS/wiki/entities/Harvey - source de candidats.md
C:/Users/benja/Documents/SaaS/wiki/entities/Usine.md
C:/Users/benja/Documents/SaaS/wiki/entities/Usine Oracle presti-usine.md
C:/Users/benja/Documents/SaaS/wiki/entities/ia-caller.md (lignes 20 à 60)
C:/Users/benja/Documents/SaaS/wiki/entities/Cerveau MCP.md (recherche par grep)
C:/Users/benja/Documents/SaaS/Prospection/Audit-prospection-2026-10-26.md (lignes 221 à 261)
C:/Users/benja/Documents/SaaS/Prospection/Objections-reponses.md (lignes 1 à 21)
C:/Users/benja/Documents/SaaS/Fondateurs/Profil-Fondateurs.md (recherche par grep)
C:/Users/benja/Documents/SaaS/Agents/Journal.md (lignes 11 à 18)
C:/Users/benja/Documents/SaaS/Prospection/deja-contactes-email.txt, corbeille-gmail-2026-09-15.md, emails-artisans/, prospect-JB-DECO-BAT-2026-10-21.md (comptage de lignes seulement, rien affiché)
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-14h42-ea9f2e07-fin.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-12h11-2eb202a3-fin.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-11h37-a809c5f3-fin.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-31-23h15-bf3b507a-fin.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-29-presti-ia-gratuite-freellmapi.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-29-presti-comptes-fournisseurs.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-29-pub-v21-inventaire-hook-v2.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-29-croissance-reseaux.md
C:/Users/benja/Documents/SaaS/inbox/sessions/2026-10-3*-*-fin.md et 2026-10-29-21h*.md (nom de tâche et section « fait » seulement, 27 fichiers)
C:/Users/benja/Documents/presti/lib/plans.ts (lignes 40 à 109, et grep)
C:/Users/benja/Documents/presti/lib/flags.ts (grep des drapeaux)
C:/Users/benja/Documents/presti/CLAUDE.md (section « Architecture imposée » lue via cerveau.lire ; grep des lignes 9-10, 55, 252-253 et 374)
C:/Users/benja/Documents/presti-ops/QG/DECISIONS.md
C:/Users/benja/Documents/presti-ops/QG/ETAT.md
C:/Users/benja/Documents/presti-ops/agents-prospection/outils/envoi_manuel.py (grep, ligne 62)
C:/Users/benja/Documents/presti-ops/agents-prospection/outils/controles.py (lignes 96 à 105, et grep)
C:/Users/benja/Documents/outils-ia/harvey/harvey.yaml (grep de clés seulement)
C:/Users/benja/.claude/projects/C--Users-benja-Documents-presti/memory/positionnement-automatique-2510.md
git log et git branch -a dans C:/Users/benja/Documents/presti ; ls de supabase/migrations
ssh en lecture sur gardien@88.96.53.3 : uptime, sudo -n docker ps, df -h
MCP cerveau : quoi_de_neuf (depuis le 2026-10-29), chercher (2 requêtes), lire (presti/CLAUDE.md, section « Architecture imposée »)

# NON VERIFIE
Le contenu des 98 fils inbox/sessions marqués « a-integrer » n'est pas lu en entier : j'en ai lu 12, plus l'en-tête de 27 autres. D'autres décisions de Benj du 29/10 au 01/11 peuvent s'y trouver.
L'état réel de Publora au 01/11, date annoncée de fin du blocage.
Le nombre d'artisans payants et le MRR actuels : /controle et Stripe n'ont pas été consultés.
Le sort du premier inscrit du 13/10, à qui l'essai Signature avait été proposé.
La cause des tâches planifiées terminées sans réponse du 29 au 31/10, dont trois passages de presti-rangement-vault-soir. Je suppose la limite hebdomadaire de Claude, sans preuve.
Le décompte des drapeaux : 57 trouvés par le motif « nom: true/false », dont 11 à false. Un drapeau défini par une expression échappe à ce motif.
Les versions de Hermes (0.21.5) et d'Orca (1.4.245) sur le PC, reprises de la consigne sans être relancées.
Le texte de la notice de prospection publiée, que je n'ai pas relue en ligne, et le contenu de FEU-VERT.txt, que je n'ai pas ouvert.
Le paramétrage réel de freellmapi (fournisseurs actifs, entraînement Mistral coupé ou non) et l'absence de workflows dans les n8n d'Oracle et du cloud. presti/CLAUDE.md l'affirme, mais je n'ai pas interrogé l'API ni le MCP n8n.
La règle des 6 mots communs dans chasse_vers_file.py : je ne l'ai pas lue dans le code.
La présence d'Ollama sur Oracle hors Docker : docker ps ne le montre pas.
Si Benj a levé le seuil « pub d'au moins 40 s » du 13/10 : aucune note ne le dit.
L'emplacement exact de la migration 0182 de l'ia-caller : chemin non retrouvé.
La nature exacte de la valeur sensible en ligne 52 du fil du 01/11 à 12 h 33, que je n'ai ni analysée ni recopiée.
Ce qu'a changé la modification du 20/10 de Récap-Projet.md : la date du fichier est le 20/10, mais l'en-tête dit le 15/09.
Le contenu de presti/plans/011-cadrage-01-11/ : j'ai seulement vu des extraits par la recherche cerveau.
La validité juridique des règles citées dans Cadre légal et notice de prospection (Bloctel, L34-5 CPCE), que la note signale elle-même « à vérifier ».