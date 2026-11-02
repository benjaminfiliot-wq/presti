# 032-001 — audit offensif des lots L1 (S1 à S5) et L2 (Entreprise) du chantier 4, 02/11/2026

Auditeur : Claude Code (claude-code), état d'esprit attaquant, distinct de l'auteur du lot. Lecture seule : aucun fichier du dépôt
modifié hors de ce rapport, aucun compte de test, aucune suite contre la production, aucun appel réseau vers Presti en ligne, ni build
ni typecheck (interdits ici ; le crochet `garde-agents-orca` refuse d'ailleurs toute commande qui nomme le lanceur `tout-verifier`).
Réseau neuronal : `regles_pour` (assistant, pilote, relances, factures, offres) lu avant de commencer ; plan §0, §3, §12, §13 ;
prompt de Benj `p3-assistant.md` §3.2 ; rapport du lot `chantier-4-rapport-L1-L2.md`.

Les attaques sont rejouées hors ligne par un script d'attaque (fetch doublé, toute autre adresse lève ; données inventées), dans le
dossier temporaire de la session, hors du dépôt. Son code est en annexe ; il se relance depuis la racine du dépôt :
`node --experimental-strip-types --import ./scripts/ts-loader.mjs <attaque-032-001.mjs>`.

VERDICT : NE TIENT PAS

Raison : une brèche §3.2 que le lot dit fermée reste ouverte (D1, « fait tout seul » envoie un devis dont une ligne est estimée ou à
0 €), et la promesse « une lecture en erreur ne laisse rien partir » de S3 ne tient pas (D3). Le push de L1 et L2 était conditionné
à un audit vert (plan §0.3) : il ne l'est pas. Les neuf suites sont vertes, mais aucune ne regarde ces chemins.

## Défauts, du plus grave au moins grave

| # | Gravité | Brèche | Preuve |
|---|---|---|---|
| D1 | **Élevée** | S1/§13 : le « fait tout seul » envoie un devis dont une ligne est estimée ou à 0 € | attaque 2 |
| D2 | Moyenne | S1 : une question sans « ? », une négation ou une hésitation ouvre le « fait tout seul », et la consigne dit « FAIS-LA » | attaque 1 |
| D3 | Moyenne | S3 : la lecture de la conversation (`leads`) en erreur rend « pas d'escalade » : la ligne part | attaque 3 |
| D4 | Moyenne (argent, latent) | L2 : `metadata.plan = 'entreprise'` l'emporte sur le montant ; un client Entreprise passé à 59 € au portail garde l'Entreprise | attaque 5 |
| D5 | Faible | S3 : lexique d'escalade troué (procès, justice, malfaçon, prud'hommes, incendie, blessé, dégâts, décennale, expert, refus de payer) | attaque 4 |
| D6 | Faible | S4 : deux envois au clic (Studio) ne relisent pas le registre au départ | fichier:ligne |
| D7 | Faible | L2 : `offres-affichage-qa` (les empreintes) n'est ni dans `SUITES` ni dans `HORS_LANCEUR` | fichier:ligne |
| I1 | Info | S4 : aucune exclusion entre chemins concurrents (lecture puis envoi, sans verrou) ; dossier par objet, pas par client | lecture |
| I2 | Info | S5 : par défaut l'acompte est émis seul, contre la lettre du §3.2 (« émettre une facture ») : décision de Benj Q-S5, à garder écrite | `lib/regles.ts` |

### D1 (élevée) — « fait tout seul » : un devis à prix estimé part chez le client

- Le plan l'exigeait (§3 S1 : « Un ordre `envoyer_devis` dont une ligne n'est pas sourcée devient une carte (`prixSources`,
  promesse de `lib/plans.ts:207`) » ; §13, ligne « Un prix sans source » : « + « fait tout seul » (S1) »). Le rapport du lot déclare
  S1 fait, sans réserve.
- Le code : `P.envoyer_devis` (`lib/assistant/actions-serveur.ts:844-868`) contrôle les mentions et l'e-mail, jamais la provenance
  des prix ; `prixSources` n'apparaît nulle part dans `lib/assistant/actions-serveur.ts` (grep : 0 occurrence). `envoyer_devis`
  n'est pas dans `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:79-82`) : en « fait tout seul », `proposee` l'exécute
  (`actions-serveur.ts:1387-1389`). La route d'envoi ne contrôle pas non plus les prix (`app/api/devis/[id]/envoyer/route.ts`, 23
  lignes : session puis `envoyerDevisServeur`).
- Rejeu (attaque 2) : devis DEV-2026-0011 avec une ligne `source_prix: 'estimation'` à 100 € et une ligne à 0 € sans provenance ;
  message de l'artisan « Envoie le devis DEV-2026-0011 à M. Essai » :
  ```
  fait_tout_seul => true
  statut de la carte => executee
  route d'envoi atteinte => ["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]
  témoin : prixSources(lignes du devis) — la règle du pilote et de « Tout auto » => false
  témoin : decisionPilote du même envoi => {"auto":false,"motif":"prix_non_source"}
  ```
  Le pilote et la règle « Tout auto » refusent ce devis ; l'assistant l'envoie sans carte. Le même tour peut créer le devis
  (`creer_devis`, direct, « un prix manquant ne bloque pas un devis (ligne à chiffrer) », `cadrage.ts:208`) puis l'envoyer.
- Correctif attendu : dans `proposee`, une préparation `envoyer_devis` dont les lignes relues ne passent pas `prixSources` ne lit
  pas `autonome()` (carte, raison « une ligne a un prix estimé ou à chiffrer ») ; un essai dans `securite-assistant-0211-qa` et son
  mutant.

### D2 (moyenne) — des messages qui ne sont pas des ordres ouvrent le « fait tout seul »

- `estQuestion` (`lib/assistant/cadrage.ts:137`) ne reconnaît qu'un « ? » final ou un mot interrogatif EN TÊTE ; `faitToutSeul`
  (`:196-197`) ne lit que `actionDemandee`, levé par « relanc » où qu'il soit, négation comprise. Et pour un tel message, la
  consigne au modèle est « L'artisan demande une ACTION : FAIS-LA avec l'outil correspondant, tout de suite » (`:208`).
- Rejeu (attaque 1), `contenuTiersLu: false` :
  ```
  « Ne relance surtout pas Dupont » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Il ne faut pas relancer le devis DEV-2026-0011 » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Est-ce utile de relancer Dupont » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Tu penses qu'il faut relancer Dupont » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Je me demandais s'il fallait relancer Dupont » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Et si on relançait Dupont » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « J'ai déjà relancé Dupont hier, rien à faire » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Relancer Dupont maintenant, bonne idée ou pas » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Vaut-il mieux relancer Dupont ou attendre » => {"actionDemandee":true,"question":false,"faitToutSeul":true}
  « Quels devis relancer ? Merci » => {"actionDemandee":true,"question":true,"faitToutSeul":false}   (témoin)
  « Quels devis dois-je relancer ? » => {"actionDemandee":true,"question":true,"faitToutSeul":false} (témoin)
  ```
- Portée : les gestes §3.2 restent des cartes (A1e de la suite, vérifié) ; ce qui passe, ce sont les gestes « à confirmer » hors §3.2
  (relance, envoi de devis ou de facture, réponse à un client). Le modèle doit encore appeler l'outil, mais la consigne l'y pousse.
  Avec D1, « Est-ce utile d'envoyer le devis DEV-2026-0011 » peut faire partir un prix estimé.
- Correctif attendu : `estQuestion` lit aussi « est-ce », « vaut-il », « tu penses », « je me demande », « et si », « ou pas »,
  « ou attendre » ; une négation (« ne … pas », « surtout pas », « il ne faut pas ») ou un passé composé (« j'ai relancé ») ôte
  `actionDemandee`. Côté sûr : dans le doute, carte.

### D3 (moyenne) — S3 : une lecture en erreur laisse partir la ligne

- La tâche demande « une lecture en erreur ne laisse rien partir » ; la dépendance le promet (`lib/pilote/file.ts`,
  `escalade` : « Lecture impossible : lever »). Or `escalade` (`lib/pilote/executeur.ts:224-232`) commence par
  `const lead = await leadDuCompte(leadId, l.artisan_id)` puis `if (!lead) return false` (`:227-228`), et `leadDuCompte`
  (`lib/envoisServeur.ts:28-32`) ignore l'erreur de lecture (`const { data } = …`). Une erreur sur `leads` vaut donc « aucun sujet
  d'escalade » : la ligne passe au jeton puis à `executer`. Pour une relance de devis (carte), `executer` ne relit pas le lead : elle
  part.
- Rejeu (attaque 3), message entrant « Je conteste votre facture, mon avocat vous écrira. » en base :
  ```
  base saine, message « mon avocat » → escalade => true
  lecture de « messages » en erreur 500 →  => lève : messages du client illisibles : rien ne part
  lecture de « leads » en erreur 500 (même message « avocat » en base) →  => rend false — la ligne n'est PAS renvoyée à la main
  ```
- La suite ne peut pas le voir : C3f (`scripts/securite-assistant-0211-qa.mjs:558`) consacre « conversation introuvable → false »,
  qui est exactement le chemin de l'erreur.
- Correctif attendu : dans `escalade`, lire le lead avec son `error` ; erreur → lever. Seul un lead réellement absent ou d'un autre
  compte rend false.

### D4 (moyenne, argent, latent) — L2 : la métadonnée Entreprise survit à un changement d'offre

- `lib/abonnementSync.ts:64` : `(meta === 'entreprise' ? meta : null) ?? planDepuisMontant(…)`. L'en-tête du même fichier pose la
  règle contraire, née d'une faille réelle (`:8-15`) : « le portail de facturation laisse l'artisan changer d'offre lui-même […] le
  montant facturé décide du plan, jamais une métadonnée qu'un changement d'offre laisse périmée. » Le portail est ouvert à l'artisan
  (`app/api/stripe/portail/route.ts:56`, configuration par défaut du tableau de bord Stripe) ; un changement de prix au portail ne
  touche pas aux métadonnées de l'abonnement.
- Rejeu (attaque 5), abonnement actif à 59,00 € (le prix de Studio) :
  ```
  abonnement à 59,00 € (prix de Studio), metadata.plan = entreprise → plan écrit => {"plan":"entreprise","raison":"déjà à jour"}
  même abonnement sans métadonnée → plan => studio
  témoin d'avant le lot : metadata.plan = signature à 59 € → plan => studio
  ```
  Un client Entreprise qui descend à 59 € au portail garde l'Entreprise (Signature entière, 600 crédits, membres).
- Réponse à la question du point 6 de la tâche : **un client ne peut pas forger `metadata.plan = 'entreprise'` à partir de rien.**
  Le Checkout ne prend qu'une offre de `OFFRES` (`app/api/subscribe/route.ts:42-43`, puis `metadata.plan: offre.id` l.98-99) ;
  `changerOffre` est réservé à la direction et typé `PlanPayant` (`lib/direction/stripe-actions.ts:26-30`, `:54`) ; la colonne
  `artisans.plan` n'est pas modifiable par le navigateur (`supabase/migrations/0160_artisans_verrou_colonnes.sql:16`, `:23`).
  Seul un abonnement Entreprise créé à la main porte cette métadonnée ; aucun n'existe aujourd'hui, d'où « latent ».
- Correctif attendu (session principale, argent) : l'Entreprise ne l'emporte que si le montant n'est PAS celui d'une offre publique
  autre que Signature, ou mieux, un prix Stripe dédié à l'Entreprise (son identifiant de prix, pas une métadonnée) ; et côté Stripe,
  un portail sans changement d'offre pour ces contrats.

### D5 (faible) — S3 : le lexique d'escalade laisse passer des synonymes courants

- `MOTS_ESCALADE_TOUJOURS` (`lib/pilote/regles.ts`) couvre à la lettre les cinq sujets du §3.2, mais pas leurs synonymes. Rejeu
  (attaque 4), mots de l'artisan vides :
  ```
  « Je vais vous attaquer en justice » => null
  « On se verra au procès » => null
  « Votre travail est une malfaçon, je saisis les prud'hommes » => null
  « Il y a eu un incendie après votre passage » => null
  « Mon fils a été blessé par le chauffe-eau » => null
  « Gros dégâts dans la cuisine depuis hier » => null
  « Je fais jouer la garantie décennale » => null
  « Un expert passera constater » => null
  « Je ne paierai pas cette facture » => null
  « Je vous signale à la DGCCRF » => null
  « Mon avocat vous écrira » => avocat   (témoin)
  « Litige en cours » => litige          (témoin)
  ```
- Correctif attendu : ajouter au moins justice, procès, malfaçon, prud'hom, incendie, brûl, blessé, accident, dégât (seul),
  décennale, expert, DGCCRF, « ne paierai pas », remboursement. Le lexique par métier reste en vague 2 (plan §3 S3).

### D6 (faible) — S4 : deux envois au clic ne relisent pas le registre au départ

- Le rapport du lot dit : « la réalisation d'une carte relit le registre au moment de l'envoi ». C'est vrai pour les cartes de
  l'assistant (`actions-serveur.ts`, `R.relancer_devis` et `R.relancer_facture`), pas pour deux envois de l'offre Studio :
  - `app/api/factures/relances-auto/a-valider/route.ts` (envoi l.94) : la relance d'impayé « à valider », préparée le matin par le
    passage (qui lit le registre à la préparation), part au clic des jours plus tard sans relecture ;
  - `validerPropositionServeur` (`lib/envoisServeur.ts:90`) : la relance de conversation proposée par le cron
    (`app/api/cron/relances/route.ts:165-170`, registre lu à la proposition, l.126) part au clic sans relecture.
- Le CRM, autre envoi au clic, relit lui le registre (`app/api/crm/relances/envoyer/route.ts:46-47`, 409). Gravité faible : c'est
  l'artisan qui clique, il relit le texte ; mais rien ne lui dit que le client a été relancé hier par un autre chemin.
- Les six appelants nommés au plan passent bien par `historiqueRelances(` (grep : `executeur.ts:88`, `crm/relances/envoyer:46`,
  `cron/relances:126`, `relancesImpayesMagasin.ts:56`, et `registre()` de `actions-serveur.ts`, appelé dans `P.` et `R.` des deux
  relances). Aucune fuite entre comptes trouvée : chaque lecture du registre est filtrée par `artisan_id`, les messages par une
  conversation retrouvée sur le compte.

### D7 (faible) — la preuve d'immobilité de Studio et Signature n'est jouée par aucun lanceur

- `scripts/offres-affichage-qa.mjs` n'est ni dans `SUITES` ni dans `HORS_LANCEUR` de `scripts/tout-verifier.mjs` (grep
  « offres-affichage » : 0 occurrence) ; seul `scripts/simulation-generale.mjs:982` l'appelle, et celle-ci est hors lanceur (l.217).
  CLAUDE.md : « Une suite absente de SUITES n'est jouée par personne, ni en local ni par l'audit de nuit. »
- Les empreintes, elles, sont honnêtes. Recalculées depuis `git show HEAD:lib/plans.ts` et depuis l'arbre :
  ```
  HEAD  {"studio":"488dadcb6e12","signature":"5a4c3086b1a0","offres":"9db31c0e063d","essai":"bb4f9f97bf48","automatisation":"c8e896fd40a8","grille":"5687bafb906f"}
  arbre {"studio":"488dadcb6e12","signature":"5a4c3086b1a0","offres":"9db31c0e063d","essai":"bb4f9f97bf48","automatisation":"c8e896fd40a8","grille":"5687bafb906f"}
  ```
  Elles sont égales aux valeurs `AVANT` de la suite (`scripts/offres-affichage-qa.mjs:76-83`) : Studio, Signature, le tunnel, les
  essais, la promesse et la grille n'ont pas bougé d'un octet.

### I1, I2 (informations)

- I1 : `historiqueRelances` lit, puis l'appelant envoie, sans verrou commun : deux chemins qui passent dans la même seconde (cron du
  matin et pilote) peuvent tous deux lire « rien » et envoyer. Fenêtre de quelques secondes ; à garder pour le passage dans n8n. Le
  dossier est celui d'un OBJET (devis, conversation, factures du devis), pas d'un client : deux factures sans devis d'un même client
  se relancent chacune, conformément au plan (§3 S4).
- I2 : S5 tient comme décidé. Studio n'a jamais d'acompte (`acompteApresAcceptation`, verrou `peut(plan, 'plateforme.regles')`,
  offre illisible = rien) ; le choix « d'un clic » n'émet rien (`acompte_seul: false` → notification seule) ; une règle d'avant le
  02/11 garde l'émission seule (`normaliserMaillons`, `lib/regles.ts:84`). Mais la valeur par défaut émet une
  facture seule, ce que le §3.2 range dans « ne s'automatise jamais ». C'est la décision de Benj (Q-S5, plan §0.2) ; elle mérite une
  ligne dans `Journal-Decisions` comme exception au §3.2, si ce n'est pas déjà fait.

## Ce qui tient (vérifié)

- S1 : les dix gestes §3.2 restent une carte en « fait tout seul » (une seule liste, `OUTILS_JAMAIS_AUTO`, lue par le pilote et par
  `proposee`) ; aucune action directe ne les contourne (les suppressions, la facture, l'encaissement et le lot de prix sont « à
  confirmer », vérifié dans `lib/assistant/outils-actions.ts`) ; un « ? » ou un mot interrogatif en tête ferme bien le mode.
- S2 : « Tout auto » relit les lignes du devis créé ; lecture en erreur = non sourcé (`lignesDuDevis` rend null) ; la provenance d'une
  ligne chiffrée par l'IA n'est admise que si son libellé ET son prix au centime sont ceux d'un poste du catalogue de l'artisan
  (`lib/prix/types.ts:66-84`) : le modèle ne peut pas déguiser une estimation en tarif.
- S3 : relecture au départ pour chaque type de la file rattaché à une conversation, y compris une carte sans `lead_id` (retrouvée par
  son devis ou sa facture) ; messages illisibles = échec (attaque 3, deuxième ligne). Restent D3 et D5.
- S4 : registre lu avant l'envoi par les six appelants du plan, illisible = refus, filtré par compte. Restent D6 et I1.
- S5 : voir I2.
- L2 : Entreprise = Signature + `organisation.membres`, hors `OFFRES` et `ESSAI_JOURS` ; aucun test d'offre en dur oublié (grep
  `plan === 'signature'|'studio'` hors `lib/plans.ts` : seulement `plan === 'business'`, inchangé) ; métadonnée non forgeable par un
  client (D4).

## Les suites, jouées une à la fois (02/11, hors ligne)

| Suite | Sortie | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `68 PASS, 0 FAIL` | 0 |
| `relances-registre-qa` | `44 PASS, 0 FAIL` | 0 |
| `assistant-qa` | `310 PASS, 0 FAIL` | 0 |
| `assistant-tout-qa` | `120 PASS, 0 FAIL` | 0 |
| `pilote-qa` | `88 vert(s), 0 rouge(s)` | 0 |
| `relances-impayes-qa` | `✅ relances-impayes-qa : 217/217 contrôles` | 0 |
| `offres-affichage-qa` | `✅ offres-affichage-qa : 286/286 contrôles` | 0 |
| `essais-gratuits-qa` | `✅ essais-gratuits-qa : 42 réussis, 0 échoués` (dont « mutation « le contrat Entreprise est lu au montant » → vue (EG-3l) ») | 0 |
| `crm-qa` | `216 vert(s), 0 rouge(s)` | 0 |

Vertes, mais aucune ne regarde D1 à D7 : D1 n'a pas d'essai, D3 est encodé comme voulu par C3f, D4 n'essaie que 99 €.

## Points à valider (session principale, Benj)

1. Corriger D1, D2, D3 avant le push de L1 (ils ne font que restreindre), avec essais et mutants ; puis un second audit distinct.
2. D4 touche l'argent : choix du critère (prix Stripe dédié plutôt que métadonnée) par la session principale, accord de Benj.
3. D5, D6, D7 : peuvent suivre dans le même lot ou au suivant ; D7 est une ligne dans `SUITES`.
4. Restent à jouer par la session principale : `npm run typecheck`, `npm run build` (avec `PRESTI_DIST=.next-prod`), puis le
   déploiement et les suites en direct (`pilotage-e2e`, `relances-e2e`).

## Annexe — le script d'attaque (hors dépôt, rejoué tel quel)

Dossier temporaire de la session : `C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\d339b949-d9b7-4ff1-ba3c-3b4466c1820e\scratchpad\attaque-032-001.mjs`.
Ses parties : (1) `cadrerDemande` et `faitToutSeul` sur onze messages ; (2) `actionsDeSession(...).executeurs.envoyer_devis` avec
`autonome` calculé par `faitToutSeul` sur « Envoie le devis DEV-2026-0011 à M. Essai », PostgREST doublé (devis, `devis_lignes`
estimée et à 0 €), `appeler` doublé qui note la route ; (3) `dependancesSupabase().escalade` d'une copie de
`lib/pilote/executeur.ts` (seul `@/lib/envoisPdfServeur` remplacé, comme dans la suite), `leads` puis `messages` en erreur 500 ;
(4) `sujetEscalade` sur douze phrases ; (5) `alignerSurAbonnement` d'un abonnement actif à 5 900 centimes, avec et sans
`metadata.plan`. Le code est celui des sorties ci-dessus ; il ne lit aucun secret (clés d'essai inventées, `RESEND_API_KEY` ôtée).
