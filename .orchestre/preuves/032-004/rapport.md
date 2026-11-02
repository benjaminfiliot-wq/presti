# 032-004 — contre-audit offensif des correctifs D1 à D7 (lots L1 et L2 du chantier 4), 02/11/2026

Auditeur : Claude Code (claude-code), état d'esprit attaquant. Je n'ai écrit ni le lot, ni ses correctifs, ni le premier audit (032-001).
Lecture seule : aucun fichier du dépôt modifié hors de `.orchestre/preuves/032-004/`, aucun compte de test, aucune suite contre la
production, aucun appel réseau vers Presti en ligne, ni build, ni typecheck, ni commit. Réseau neuronal : `regles_pour` (« audit offensif
de l'assistant de gestion : assistant, pilote, relances, factures, offres ») lu avant de commencer ; premier audit
`.orchestre/preuves/032-001/rapport.md` ; plan §0, §3, §12, §13 ; prompt de Benj `p3-assistant.md` annexe 2 §3.2.

Les attaques sont rejouées hors ligne (fetch doublé : toute adresse autre que la base factice lève ; données inventées) par deux scripts
du dossier temporaire de la session, hors du dépôt, en annexe. Sorties ci-dessous copiées de leur exécution (code 0).

VERDICT : NE TIENT PAS

Raison : le correctif D1 tient sur le chemin que l'audit avait rejoué, mais un autre chemin fait toujours partir, sans le clic de
l'artisan, un devis dont le prix est une estimation (D1 bis, élevée) : la provenance « prix donné par l'artisan » se décide sur un nombre
trouvé dans n'importe quelle donnée lue pendant le tour, y compris une estimation lue dans un autre devis. Et D2 ne tient pas : 27 tournures
françaises courantes qui ne sont pas des ordres ouvrent encore le « fait tout seul ». Les neuf suites sont vertes ; aucune ne regarde ces
deux chemins.

## Bilan par correctif

| # | Correctif | Verdict | Défaut restant (gravité) |
|---|---|---|---|
| D1 | `P.envoyer_devis` + `horsAuto` | tient sur sa cible ; **contourné** | D1 bis : blanchiment de la provenance par `creer_devis` / `modifier_devis` (**élevée**) |
| D2 | `MOTS_QUESTION`, `HESITATION`, `INTERDIT`, `DEJA_FAIT` | **ne tient pas** | 27 formulations ouvrent encore le mode (moyenne) ; 3 vrais ordres bloqués (faible) |
| D3 | `leadDuCompteStrict` dans `escalade` | tient sur sa cible | deux lectures du pilote avalent encore une erreur et laissent partir (faible) |
| D4 | Entreprise ne l'emporte qu'hors montant public ou au montant de Signature | tient pour Studio et Essentiel | descendu au prix de Signature au portail, le contrat garde l'Entreprise (moyenne, argent, latent) |
| D5 | `MOTS_ESCALADE_TOUJOURS` élargi | tient pour les 10 phrases de 032-001 | 18 tournures courantes manquées sur 20 ; 12 faux positifs sur 13 messages ordinaires (faible) |
| D6 | registre relu au départ (`a-valider`, `validerPropositionServeur`) | tient | l'essai du clic Studio sur les impayés est textuel ; erreur de colonne lue comme table absente (faible) |
| D7 | `offres-affichage-qa` au tableau `SUITES` | tient | — (`scripts/tout-verifier.mjs:55`, dans `SUITES`) |

## D1 — tient sur sa cible, contourné par un autre chemin

### Le rejeu de 032-001 (tient)

Message de l'artisan « Envoie le devis DEV-2026-0011 à M. Essai », `faitToutSeul` vrai :
```
rejeu 032-001 : ligne estimée à 100 € + ligne à 0 € sans provenance => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
une seule ligne « à chiffrer » => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
provenance vide, prix 80 € => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
devis sans aucune ligne => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
témoin : toutes les lignes au tarif de l'artisan => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/…0011/envoyer"]}
lignes illisibles (devis_lignes en erreur 500) => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
```
Les autres chemins d'envoi d'un devis tiennent : la règle « Tout auto » relit les lignes du devis créé (`lib/reglesServeur.ts`,
`prixSources`, essais B1 à B7) ; le pilote relit `prixSources` au départ (`lib/pilote/file.ts:96-97`) ; la route
`/api/devis/[id]/envoyer` n'est appelée que par l'écran du devis (clic), l'assistant et le pilote ; `envoyerDevisServeur` n'a pas d'autre
appelant (grep). La boucle exécute les outils d'un tour l'un après l'autre (`lib/assistant/boucle.ts:265`) : pas de course entre la
préparation et l'envoi.

### D1 bis (élevée) — une estimation recopiée devient « prix donné par l'artisan », et le devis part seul

- La garde D1 (et celle du pilote) ne lit que l'étiquette `source_prix` des lignes (`ligneSourcee`, `lib/pilote/regles.ts:115-122` :
  « vos tarifs », « tarif de l'artisan », « prix donné par l'artisan »).
- Cette étiquette « prix donné par l'artisan » est posée par `resoudreLignes` (`lib/assistant/cartes.ts:164-182`) sur toute ligne sans
  `tarif_id` dont le modèle donne un prix, pour `creer_devis` (`lib/assistant/actions-serveur.ts:226-244`) comme pour les
  `ajouter_lignes` de `modifier_devis` (`:271-292`).
- Le seul contrôle de ce prix est `verifierSources` (`lib/assistant/cartes.ts:92-100`) : il admet le nombre s'il figure dans AU MOINS UNE
  source, et les sources sont le message de l'artisan, TOUT l'historique (réponses de l'assistant comprises), et le JSON de chaque outil lu
  pendant le tour (`lib/assistant/boucle.ts:159`, `:183`). Or `lire_devis_detail` rend les prix des lignes d'un devis avec leur provenance
  (`lib/assistant/lectures-tout.ts:91-99`, « estimation » comprise), et il n'est pas un contenu de tiers (`OUTILS_CONTENU_TIERS`,
  `lib/pilote/regles.ts:196`) : le « fait tout seul » reste ouvert.
- Rejeu, message « Refais le devis de Martin pour M. Essai et envoie-le-lui », le devis de Martin porte une ligne estimée à 450 € :
  ```
  lire_devis est-il un contenu de tiers ? => false
  faitToutSeul du message => true
  verifierSources(creer_devis, prix 450, sources = [message, lecture du tour]) — null = accepté => null
  provenance écrite par resoudreLignes => ["prix donné par l'artisan"]
  prixSources(lignes du nouveau devis) — la garde D1 => true
  envoyer_devis du nouveau devis, même tour => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/…0011/envoyer"]}
  témoin : la même ligne recopiée avec sa provenance d'origine => false
  autre source admise : un nombre écrit par l'ASSISTANT au tour d'avant (« environ 85 € la prise ») => null
  ```
- Portée : le même blanchiment trompe le pilote (Signature, carte `envoyer_devis` partie seule après 10 minutes) : il lit la même étiquette.
  Le modèle doit recopier le prix sans `tarif_id`, ce qu'une demande « refais / duplique le devis de… », « remets la ligne comme sur l'autre
  devis » rend naturel. Le §3.2 (« envoyer un devis […] avec un prix sans source ») et la promesse de `lib/plans.ts:207` tombent.
- Correctif attendu : une ligne sans `tarif_id` ne prend « prix donné par l'artisan » que si le nombre figure dans ce que l'ARTISAN a écrit
  (son message et ses messages signés de l'historique), jamais dans une donnée lue ni dans une réponse de l'assistant ; sinon « à chiffrer »
  ou la provenance lue (« estimation »). Plus sobre encore : `envoyer_devis` en « fait tout seul » seulement si chaque ligne est au tarif.
  Un essai et son mutant dans `securite-assistant-0211-qa` (le scénario ci-dessus).
- Accessoire : `lire_devis_detail` présente une provenance VIDE comme « saisi par l'artisan » (`lectures-tout.ts:98`), le contraire de la
  règle E1 de `ligneSourcee` (vide = non sourcé). À aligner.

## D2 (moyenne) — ne tient pas : des tournures courantes ouvrent encore le « fait tout seul »

36 phrases qui ne sont pas des ordres, `contenuTiersLu: false` ; **27 ouvrent le mode** (extrait, la sortie complète est en annexe C) :
```
⚠ OUVRE « Pas question de relancer Dupont »              ⚠ OUVRE « Hors de question de relancer Dupont »
⚠ OUVRE « Laisse tomber la relance de Dupont »           ⚠ OUVRE « On attend pour relancer Dupont »
⚠ OUVRE « Relance Dupont plus tard »                     ⚠ OUVRE « Évitons de relancer Dupont »
⚠ OUVRE « Oublie la relance de Dupont »                  ⚠ OUVRE « Relance pas Dupont »
⚠ OUVRE « Attends avant de relancer Dupont »             ⚠ OUVRE « Relance Dupont la semaine prochaine »
⚠ OUVRE « Dupont, on le relance pas »                    ⚠ OUVRE « Je ne pense pas qu'il faille relancer Dupont »
⚠ OUVRE « Relancer Dupont ? Non »                        ⚠ OUVRE « Non, pas de relance pour Dupont »
⚠ OUVRE « Plus de relance pour Dupont »                  ⚠ OUVRE « Stop les relances à Dupont »
⚠ OUVRE « Envoie pas le devis à Dupont »                 ⚠ OUVRE « N'envoie le devis DEV-2026-0011 qu'après mon appel »
⚠ OUVRE « Envoie le devis à Dupont seulement s'il rappelle »   ⚠ OUVRE « Faudrait relancer Dupont un de ces jours »
⚠ OUVRE « Relance Dupont si tu veux »                    ⚠ OUVRE « Tu pourrais relancer Dupont »
⚠ OUVRE « J'hésite à relancer Dupont »                   ⚠ OUVRE « Je relance Dupont moi-même »
⚠ OUVRE « Je m'occupe de relancer Dupont »               ⚠ OUVRE « Dupont a été relancé hier »    ⚠ OUVRE « Relance de Dupont faite »
ferme « Faut pas relancer Dupont », « Surtout ne relance pas Dupont », « Inutile de relancer Dupont », « Je préfère ne pas… », etc.
```
Causes, au fichier : `INTERDIT` (`lib/assistant/cadrage.ts:230-241`) exige « ne/n' … pas » ou une liste fermée d'amorces : la négation
familière sans « ne » (« relance pas », « envoie pas », « on le relance pas »), « pas question », « hors de question », « non, pas de… »,
« plus de… », « stop », « laisse tomber », « oublie », « évitons », « attends » lui échappent ; « ? Non » finit sans « ? » ; un report
(« plus tard », « la semaine prochaine », « qu'après », « seulement si ») n'est lu nulle part ; `DEJA_FAIT` (`:243`) ne lit que la première
personne (« j'ai… », « on a… ») et rate le passif (« a été relancé ») et le participe seul (« relance faite ») ; `HESITATION` rate
« j'hésite », « si tu veux », « tu pourrais », « un de ces jours ». Pour chacune, `blocCadrage` dit au modèle « FAIS-LA … tout de suite »
(`:312-317`). Portée inchangée depuis 032-001 : gestes « à confirmer » hors §3.2 (relance, envoi d'un devis sourcé, réponse à un client) ;
le modèle doit encore appeler l'outil.

Vrais ordres que les nouvelles règles changent en carte (faible) :
```
✗ carte « Relance Dupont si ce n'est pas déjà fait »            (DEJA_FAIT lit « deja fait »)
✗ carte « Relance Dupont, peut-être en ton ferme »             (HESITATION lit « peut etre »)
✗ carte « Relance Dupont, je ne veux pas perdre ce chantier »  (INTERDIT lit « je ne veux pas »)
```
Correctif attendu : renverser la charge. Le mode ne s'ouvre que sur un ordre à l'impératif EN TÊTE de message (« relance », « envoie »,
« réponds », après un salut), sans négation, report ni condition dans la phrase ; tout le reste est une carte. Les essais A2g/A2h (18 et
21 phrases) n'en contiennent aucune des 27 ci-dessus.

## D3 — tient sur sa cible ; deux lectures du pilote avalent encore une erreur (faible)

```
rejeu 032-001 : base saine, « mon avocat » → escalade => true
rejeu 032-001 : « leads » en erreur 500 => lève : conversation illisible : rien ne part
« messages » en erreur 500 => lève : messages du client illisibles : rien ne part
mot PROPRE à l'artisan (« carrelage fissuré »), base saine => true
même message, « plateforme_config » en erreur 500 => rend false — le mot de l'artisan est perdu, la ligne part
etatConversation : 3 réponses de l'IA pour une limite de 2 => limite
même conversation, compte des messages en erreur 500 => rend « ok » — la limite saute, la réponse part
contexte : « artisans » en erreur 500 → plan lu => {"plan":null,"suspendu":false}
```
- `escalade` lit la configuration par `getPlateformeConfig` (`lib/pilote/executeur.ts:230`), qui rend `CONFIG_DEFAUT` sur une erreur
  (`lib/plateformeConfig.ts:109-115`) : les mots d'escalade propres à l'artisan disparaissent, seuls `MOTS_ESCALADE_TOUJOURS` et les mots
  par défaut restent. Même lecture dans `etatConversation` (`:217`) : plage horaire et limite de l'artisan remplacées par les défauts.
- `etatConversation` ignore l'erreur du compte des réponses de l'IA (`:218`, `const { count } = …`) : `count` nul vaut 0, la limite de
  réponses par conversation (Ma plateforme) ne bloque plus.
- Sûrs (vérifié) : `carteDe` et `lignesDevis` en erreur rendent null (carte annulée, devis non sourcé) ; `etatConversation` sur `leads` en
  erreur rend « prise_en_main » (annulée) ; `contexte` sur `artisans` en erreur rend un plan nul, que `decisionPilote` refuse (offre).
- Correctif attendu : `getPlateformeConfig` strict pour le pilote (erreur → lever) ; lire `error` du compte (erreur → lever).

## D4 (moyenne, argent, latent) — descendu au prix de Signature, le contrat garde l'Entreprise

```
metadata.plan = entreprise · Studio            => studio
metadata.plan = entreprise · ancienne Essentiel => essentiel
metadata.plan = entreprise · Signature         => entreprise (« déjà à jour »)
metadata.plan = entreprise · sur devis (300 €) => entreprise
metadata.plan = entreprise · absent            => entreprise
metadata.plan = signature · sur devis / absent => signature      (inchangé d'avant le lot)
metadata.plan = — · sur devis / absent         => null (« aucune offre ne correspond »)
contrat Entreprise à 300 € passé au portail sur le prix de Signature (99 €), métadonnée intacte => {"plan":"entreprise","raison":"déjà à jour"}
```
- Le correctif ferme la descente vers Studio et Essentiel. Il garde exprès le montant de Signature (`lib/abonnementSync.ts:63-69`, « dont
  elle reprend tout ») : or l'Entreprise, c'est Signature PLUS `organisation.membres` (`lib/plans.ts:15-18`). Un contrat Entreprise vendu
  sur devis au-dessus de 99 € et ramené au prix de Signature au portail (ouvert à l'artisan, `app/api/stripe/portail/route.ts:56`) garde les
  membres pour 99 € : la faille même de l'en-tête (`:8-15`), à une marche près.
- Chemins : le webhook et les actions de direction passent tous deux par `alignerSurAbonnement` ; `changerOffre` réécrit
  `metadata.plan` avec l'offre visée et refuse l'Entreprise (prix 0, `lib/direction/stripe-actions.ts:29-30`, `:54`) : sûr. Aucun
  contrat Entreprise n'existe aujourd'hui : latent.
- Correctif attendu (session principale, argent, accord de Benj) : reconnaître l'Entreprise par un prix Stripe dédié (identifiant de prix,
  ou `price.metadata.plan` posé à la création du prix), jamais par la métadonnée de l'abonnement ; et un portail sans changement d'offre
  pour ces contrats (réglage du compte Stripe, à Benj). L'essai EG-3l consacre le cas « au prix de Signature → Entreprise » sans distinguer
  un contrat né à 99 € d'un contrat descendu à 99 €.

## D5 (faible) — le lexique d'escalade troue encore, et bloque des messages ordinaires

Les 10 phrases de 032-001 sont repérées (C4a). Nouvelles tournures, mots de l'artisan vides, `null` = la ligne part :
```
« Je vais saisir le juge » => null                     « J'ai subi un préjudice, j'attends une indemnisation » => null
« Je demande un dédommagement » => null                « Je vous envoie une lettre recommandée » => null
« C'est un vice caché » => null                        « J'ai fait opposition sur le paiement » => null
« Je ne vous paie pas tant que ce n'est pas réparé » => null   « Je ne réglerai pas cette facture » => null
« Je vais laisser un avis négatif partout » => null    « Je vais vous faire une mauvaise pub sur Google » => null
« C'est dangereux, les fils sont à nu » => null        « Le plafond s'est écroulé » => null
« Il y a de l'eau partout dans la salle de bain » => null      « Infiltration au plafond depuis votre passage » => null
« Je dépose une réclamation » => null                  « J'ai contacté UFC-Que Choisir » => null
« Ma fille est tombée de l'échafaudage » => null       « Court-circuit depuis votre intervention » => null
témoins : « Ça sent le brûlé dans le tableau » => brûl ; « Je vous mets en demeure » => en demeure
```
Faux positifs (la ligne passe à la main ; côté sûr, mais Signature perd son autonomie) :
```
« Pas d'urgence, quand vous pouvez » => urgence        « Pour l'assurance, il me faut la facture » => assurance
« Je ne veux pas payer trop cher » => pas payer        « Quel est le processus pour le devis ? » => procès
« Mon voisin, M. Gazzola, m'a donné votre nom » => gaz « Expertise comptable : il me faut un devis détaillé » => expert
« Je travaille dans la police municipale » => police   « Remboursement de la TVA : quel taux ? » => rembours
« Ma gazinière est à changer aussi » => gaz            « Le gazon devant la maison est fragile » => gaz
« Accidentellement j'ai cassé la poignée » => accident « Mon mari est pompier, il sera là le matin » => pompier
```
« procès » repéré « au début d'un mot » sans accent devient `proces`, préfixe de « processus » ; un nom propre (« Gazzola ») suffit. Ajouter
au moins : juge, préjudice, indemni, dédommag, recommandé, vice caché, opposition, réclamation, danger, écroul, infiltration,
court-circuit, chute/tombé, UFC, avis négatif ; ancrer « proces » en mot entier et « pas payer » hors « veux pas payer ». Le lexique par
métier reste en vague 2 (plan §3 S3).

## D6 — tient ; deux réserves (faible)

- Les deux envois au clic relisent le registre au départ, avant toute prise : `app/api/factures/relances-auto/a-valider/route.ts:79-86`
  (`sauf: 'impayes'`), `lib/envoisServeur.ts:110-119` (`sauf: 'conversation'`, si `prop.type === 'relance'`, valeur que le cron écrit :
  `app/api/cron/relances/route.ts:170`). Le pilote, l'assistant, le CRM, les impayés et le cron lisent tous `historiqueRelances` (grep).
  Aucun chemin de relance à un client ne l'ignore encore ; la relance d'une commande fournisseur (`app/api/crm/commandes/[id]/relancer`)
  n'écrit pas à un client et reste hors registre, à raison.
- Réserve 1 : l'essai du clic Studio sur les impayés n'est qu'une expression régulière sur le texte de la route
  (`scripts/relances-impayes-qa.mjs:465-469`) ; seul C5 (conversation) rejoue le comportement. Un essai qui appelle la route vaudrait mieux.
- Réserve 2 (S4) : `historiqueRelances` prend une erreur de COLONNE pour une table absente et l'ignore (`lib/relancesRegistre.ts:65`,
  `ABSENTE = /PGRST205|42P01|does not exist|schema cache/i`) :
  ```
  témoin : relance CRM ce matin → verdict => {"refus":true,"raison":"recente",…}
  colonne crm_rappels.envoye_le absente (42703) → historique => {"ok":true,"traces":[],"ignorees":["crm_rappels"]}
  → verdict => {"refus":false}
  colonne inconnue du cache de schéma (PGRST204) → verdict => {"refus":false}
  témoin : délai dépassé (57014) → verdict => {"refus":true,"raison":"illisible",…}
  ```
  Ne retenir que `PGRST205` et `42P01`.
- Hors registre, par un autre outil : `repondre_client` (« à confirmer », exécuté en « fait tout seul ») ne lit pas le registre
  (`lib/assistant/actions-serveur.ts:1010`, aucun appel à `registre`) ; un modèle refusé sur `relancer_devis` (« déjà relancé hier ») peut
  écrire la même relance en réponse libre. Plausible, non rejoué (dépend du modèle).

## D7 — tient

`scripts/tout-verifier.mjs:55` : `offres-affichage-qa` est au tableau `SUITES` (`cout: 'gratuit'`), et l'essai D4 de
`securite-assistant-0211-qa` vérifie la présence de cette dernière au même tableau. Jouée : 286/286.

## Information hors des correctifs (I3) — la réponse SEULE ignore le lexique d'escalade

`MOTS_ESCALADE_TOUJOURS` n'est lu que par le pilote. La réponse automatique au prospect (Signature, mode « auto ») ne lit que les mots de
l'artisan (`motEscalade`, `lib/plateformeConfig.ts:120-124`), dont le défaut ne contient ni avocat, ni litige, ni plainte, ni sinistre
(`:56`) :
```
escalade_mots par défaut => ["urgence","fuite","degat des eaux","inondation","gaz","assurance"]
iaDoitRepondre(mode auto, « Litige en cours : mon avocat vous écrira ») => {"ok":true}
iaDoitRepondre(mode auto, « Je vais porter plainte contre vous ») => {"ok":true}
iaDoitRepondre(mode auto, « Sinistre chez moi après vos travaux ») => {"ok":true}
iaDoitRepondre(mode auto, « Fuite sous l'évier ») => {"ok":false,"raison":"escalade","mot":"fuite"}
```
Le playbook « réclamation » (`lib/ai/playbooks.ts:41-49`) fait accuser réception et escalader, mais l'IA parle quand même au client au nom
de l'artisan sur un sujet que le §3.2 range dans « ne s'automatise jamais ». Le plan (§13, l.484) compte cette garde comme acquise. À
trancher par la session principale : faire lire `sujetEscalade` (la liste toujours appliquée) par `iaDoitRepondre`.

## Les suites, jouées une à la fois (02/11, hors ligne)

| Suite | Sortie | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `89 PASS, 0 FAIL` (68 au premier audit ; mutants A2j, A2k, A3e, C3m, C4c, C5c nouveaux) | 0 |
| `relances-registre-qa` | `44 PASS, 0 FAIL` | 0 |
| `assistant-qa` | `310 PASS, 0 FAIL` | 0 |
| `assistant-tout-qa` | `120 PASS, 0 FAIL` | 0 |
| `pilote-qa` | `88 vert(s), 0 rouge(s)` | 0 |
| `relances-impayes-qa` | `✅ relances-impayes-qa : 218/218 contrôles` | 0 |
| `offres-affichage-qa` | `✅ offres-affichage-qa : 286/286 contrôles` | 0 |
| `essais-gratuits-qa` | `✅ essais-gratuits-qa : 43 réussis, 0 échoués` | 0 |
| `crm-qa` | `216 vert(s), 0 rouge(s)` | 0 |

Vertes, et cette fois chaque correctif a son essai et son mutant. Mais aucune ne joue D1 bis (le devis est toujours posé en base avec
son étiquette, jamais créé par l'assistant à partir d'une lecture), ni les 27 tournures de D2, ni la descente au prix de Signature (D4).

## Points à valider (session principale, Benj)

1. Corriger D1 bis avant le push de L1 (ne fait que restreindre) : provenance « prix donné par l'artisan » seulement sur un nombre écrit
   par l'artisan ; essai et mutant ; puis un audit distinct.
2. D2 : renverser la charge (ordre à l'impératif en tête, sans négation, report ni condition, sinon carte) ; ajouter les 27 phrases
   ci-dessus aux essais A2g.
3. D4 touche l'argent : prix Stripe dédié à l'Entreprise et portail sans changement d'offre pour ces contrats, accord de Benj.
4. D3, D5, D6 (réserves), I3 : peuvent suivre dans le lot ou au suivant.
5. Restent à la session principale : `npm run typecheck`, `npm run build` (`PRESTI_DIST=.next-prod`), le déploiement et les suites en
   direct (`pilotage-e2e`, `relances-e2e`).

## Annexes — les scripts d'attaque (hors dépôt, rejoués tels quels)

Dossier temporaire de la session : `C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\aa312a08-73ab-44e9-8e8f-5ae3c1c5df60\scratchpad\`.
Lancer depuis la racine du dépôt : `node --experimental-strip-types --import ./scripts/ts-loader.mjs <script>`. Aucun secret lu (clés
d'essai inventées, `RESEND_API_KEY` ôtée), aucun réseau.

### Annexe A — `attaque-032-004.mjs`

```js
#!/usr/bin/env node
// Contre-audit 032-004 : attaques hors ligne des correctifs D1 à D7 (lots L1 et L2 du chantier 4). Lecture seule : aucun réseau
// (fetch doublé, toute autre adresse lève), aucune base, aucun modèle, aucun e-mail. Données inventées.
// Lancer depuis C:/Users/benja/Documents/presti :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register(`data:text/javascript,${encodeURIComponent("export async function resolve(spec, ctx, next) { if (spec.startsWith('next/') && !spec.slice(5).includes('.') && !spec.slice(5).includes('/')) return next(spec + '.js', ctx); return next(spec, ctx) }")}`)
process.removeAllListeners('warning')
process.on('warning', () => {})
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
delete process.env.RESEND_API_KEY

const RACINE = process.cwd()
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const log = (etiquette, valeur) => console.log(`${etiquette} => ${typeof valeur === 'string' ? valeur : JSON.stringify(valeur)}`)

// ── Doublure de PostgREST (reprise du script de 032-001 ; + panne des HEAD, + compte) ──
const T = {}
const requetes = []
const PANNE = new Set()
function cond(champ, brut) {
  let v = brut, non = false
  if (v.startsWith('not.')) { non = true; v = v.slice(4) }
  const [op, ...r] = v.split('.'); const x = decodeURIComponent(r.join('.'))
  let res = true
  if (op === 'eq') res = String(champ) === x
  else if (op === 'is') res = x === 'null' ? champ === null || champ === undefined : String(champ) === x
  else if (op === 'in') res = x.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(champ))
  else if (op === 'lte') res = String(champ) <= x
  else if (op === 'gte') res = String(champ) >= x
  return non ? !res : res
}
const ORDRE = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
const entete = (h, k) => (h ? (typeof h.get === 'function' ? h.get(k) : h[k] ?? Object.entries(h).find(([x]) => x.toLowerCase() === k.toLowerCase())?.[1]) : undefined)
globalThis.fetch = async (entree, init = {}) => {
  const url = new URL(typeof entree === 'string' ? entree : entree.url ?? String(entree))
  if (url.hostname !== 'base.test') throw new Error(`réseau interdit : ${url.host}`)
  const methode = String(init.method ?? 'GET').toUpperCase()
  const rep = (corps, statut = 200, h = {}) => new Response(corps === undefined ? null : JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json', ...h } })
  if (url.pathname.startsWith('/rest/v1/rpc/')) { requetes.push({ methode, table: 'rpc' }); return rep(true) }
  const table = url.pathname.slice('/rest/v1/'.length)
  const lignes = (T[table] ??= [])
  const params = [...url.searchParams].filter(([k]) => !ORDRE.has(k))
  requetes.push({ methode, table, url })
  if (PANNE.has(table) && (methode === 'GET' || methode === 'HEAD')) return new Response(methode === 'HEAD' ? null : JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout' }), { status: 500, headers: { 'content-type': 'application/json' } })
  const corps = init.body ? JSON.parse(init.body) : null
  if (methode === 'GET' || methode === 'HEAD') {
    let r = lignes.filter((l) => params.every(([k, v]) => k === 'or' || cond(l[k], v)))
    if (methode === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-0/${r.length}` } })
    const lim = url.searchParams.get('limit'); if (lim) r = r.slice(0, Number(lim))
    if (String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return r.length === 1 ? rep(r[0]) : r.length === 0 && url.searchParams.has('limit') ? rep(null) : rep({ code: 'PGRST116', message: 'no rows' }, 406)
    return rep(r)
  }
  if (methode === 'PATCH') { for (const l of lignes.filter((l) => params.every(([k, v]) => cond(l[k], v)))) Object.assign(l, corps); return rep([]) }
  if (methode === 'POST') { for (const n of Array.isArray(corps) ? corps : [corps]) lignes.push({ id: id(7000 + lignes.length), ...n }); return rep([]) }
  return rep([])
}
const vider = () => { for (const k of Object.keys(T)) delete T[k]; requetes.length = 0; PANNE.clear() }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-004-'))
async function copie(rel, doublures) {
  let code = fs.readFileSync(path.join(RACINE, rel), 'utf8')
  let n = 0
  for (const [spec, contenu] of Object.entries(doublures)) {
    const f = path.join(TMP, `doublure-${++n}.ts`); fs.writeFileSync(f, contenu)
    code = code.split(`from '${spec}'`).join(`from '${pathToFileURL(f).href}'`)
  }
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-copie.ts`); fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}

const ARTISAN = { id: A, plan: 'signature', is_founder: false, nom: 'Atelier Essai', email: 'atelier@essai.test', metier: 'Plombier', forme_juridique: 'EI', siret: '12345678900011', adresse: '1 rue de l’Essai', code_postal: '17000', ville: 'Essai-sur-Mer', tel_public: null, email_public: 'contact@essai.test', tva_num: null, assurance_nom: 'Assureur Essai', assurance_contrat: '0001', assurance_activites: 'plomberie', assurance_zone: 'France', zone_intervention: 'Essai-sur-Mer', mediateur_nom: 'Médiateur Essai', mediateur_url: null, leads_pause: false, plateforme_active: true }
const DEVIS = (lignes) => ({
  artisans: [{ ...ARTISAN }],
  devis: [{ id: id(11), artisan_id: A, numero: 'DEV-2026-0011', statut: 'brouillon', objet: 'Essai', client_nom: 'M. Essai', client_email: 'client@essai.test', client_adresse: null, total_ht: 100, total_tva: 10, total_ttc: 110, remise_pct: 0, acompte_pct: 0, validite_jours: 90, conditions: null, notes: null, lead_id: null, envoye_le: null }],
  devis_lignes: lignes.map((l, i) => ({ id: id(110 + i), devis_id: id(11), ordre: i + 1, quantite: 1, unite: 'u', tva_taux: 10, ...l })),
  assistant_journal: [],
})

try {
  const cadrage = await imp('lib/assistant/cadrage.ts')
  const R = await imp('lib/pilote/regles.ts')
  const srvMod = await imp('lib/assistant/actions-serveur.ts')
  const oa = await imp('lib/assistant/outils-actions.ts')
  const conf = await imp('lib/assistant/confirmation.ts')
  const cartes = await imp('lib/assistant/cartes.ts')

  async function envoyerDevisTourAutonome(message) {
    const routes = []
    const srv = srvMod.actionsDeSession({
      uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(900), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { envoyerDevis: async () => new Response('{}'), appeler: async (_g, chemin) => { routes.push(chemin); return { status: 200, json: { ok: true } } }, piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => cadrage.faitToutSeul(cadrage.cadrerDemande(message, null), { contenuTiersLu: false }),
    })
    const v = oa.validerAction('envoyer_devis', { numero: 'DEV-2026-0011' })
    const r = await srv.executeurs.envoyer_devis(v.entree)
    return { fait_tout_seul: r.donnees?.fait_tout_seul ?? false, carte: r.carte?.statut ?? null, pas_d_office: r.donnees?.pas_d_office ?? false, routes }
  }

  // ═══ D1 — rejeu de l'attaque 2 de 032-001, puis variantes
  console.log('\n── D1 — envoyer_devis en « fait tout seul » (message : « Envoie le devis DEV-2026-0011 à M. Essai »)')
  const ORDRE_ENVOI = 'Envoie le devis DEV-2026-0011 à M. Essai'
  const cas = [
    ['rejeu 032-001 : ligne estimée à 100 € + ligne à 0 € sans provenance', [{ designation: 'Ballon (prix du marché)', prix_unitaire_ht: 100, source_prix: 'estimation' }, { designation: 'Déplacement', prix_unitaire_ht: 0, source_prix: null }]],
    ['une seule ligne « à chiffrer »', [{ designation: 'Pose', prix_unitaire_ht: 0, source_prix: 'à chiffrer' }]],
    ['provenance vide, prix 80 €', [{ designation: 'Pose', prix_unitaire_ht: 80, source_prix: '' }]],
    ['devis sans aucune ligne', []],
    ['témoin : toutes les lignes au tarif de l’artisan', [{ designation: 'Pose', prix_unitaire_ht: 80, source_prix: 'tarif de l’artisan' }]],
    ['ligne marquée « prix donné par l’artisan » (voir la chaîne de blanchiment)', [{ designation: 'Remplacement ballon', prix_unitaire_ht: 450, source_prix: 'prix donné par l’artisan' }]],
  ]
  for (const [nom, lignes] of cas) {
    vider(); Object.assign(T, DEVIS(lignes))
    log(`  ${nom}`, await envoyerDevisTourAutonome(ORDRE_ENVOI))
  }
  vider(); Object.assign(T, DEVIS([{ designation: 'Pose', prix_unitaire_ht: 80, source_prix: 'tarif de l’artisan' }])); PANNE.add('devis_lignes')
  log('  lignes illisibles (devis_lignes en erreur 500)', await envoyerDevisTourAutonome(ORDRE_ENVOI).catch((e) => `lève : ${e.message}`))

  // ═══ D1 bis — la provenance « prix donné par l'artisan » se décide sur un nombre trouvé dans N'IMPORTE QUELLE donnée lue
  console.log('\n── D1 bis — blanchiment : un prix ESTIMÉ, lu dans un devis, recopié par le modèle devient « prix donné par l’artisan »')
  const msg = 'Refais le devis de Martin pour M. Essai et envoie-le-lui'
  // Ce que lire_devis rend au modèle pendant le tour (pas un contenu de tiers : aucune balise [MESSAGE_CLIENT], outil hors OUTILS_CONTENU_TIERS).
  const luDansLeTour = JSON.stringify({ devis: [{ numero: 'DEV-2026-0009', client: 'M. Martin', lignes: [{ designation: 'Remplacement ballon 200 L', quantite: 1, prix_unitaire_ht: 450, source_prix: 'estimation' }] }] })
  log('  message de l’artisan', msg)
  log('  lire_devis est-il un contenu de tiers ?', R.OUTILS_CONTENU_TIERS.includes('lire_devis'))
  const c = cadrage.cadrerDemande(msg, null)
  log('  faitToutSeul du message', cadrage.faitToutSeul(c, { contenuTiersLu: false }))
  const entreeCreer = { client_nom: 'M. Essai', objet: 'Ballon', lignes: [{ tarif_id: null, designation: 'Remplacement ballon 200 L', quantite: 1, unite: 'u', prix_unitaire_ht: 450 }] }
  log('  verifierSources(creer_devis, prix 450, sources = [message, lecture du tour]) — null = accepté', cartes.verifierSources('creer_devis', entreeCreer, [msg, luDansLeTour]))
  const res = cartes.resoudreLignes(entreeCreer.lignes, new Map())
  log('  provenance écrite par resoudreLignes', res.lignes.map((l) => l.source_prix))
  log('  prixSources(lignes du nouveau devis) — la garde D1', R.prixSources(res.lignes))
  vider(); Object.assign(T, DEVIS(res.lignes.map((l) => ({ designation: l.designation, prix_unitaire_ht: l.prix_unitaire_ht, source_prix: l.source_prix }))))
  log('  envoyer_devis du nouveau devis, même tour', await envoyerDevisTourAutonome(msg))
  log('  témoin : la même ligne recopiée avec sa provenance d’origine', R.prixSources([{ prix_unitaire_ht: 450, source_prix: 'estimation' }]))
  log('  autre source admise : un nombre écrit par l’ASSISTANT au tour d’avant (« environ 85 € la prise »)', cartes.verifierSources('creer_devis', { lignes: [{ tarif_id: null, designation: 'Prise', quantite: 3, unite: 'u', prix_unitaire_ht: 85 }] }, ['Ajoute les prises et envoie le devis', 'Pour trois prises, comptez environ 85 € la prise.']))

  // ═══ D2 — formulations françaises courantes
  console.log('\n── D2 — formulations qui ne sont PAS des ordres (faitToutSeul attendu : false)')
  const pasOrdres = [
    'Pas question de relancer Dupont', 'Hors de question de relancer Dupont', 'Laisse tomber la relance de Dupont', 'On attend pour relancer Dupont',
    'Relance Dupont plus tard', 'Évitons de relancer Dupont', 'Oublie la relance de Dupont', 'Relance pas Dupont', 'Faut pas relancer Dupont',
    'Surtout ne relance pas Dupont', 'Attends avant de relancer Dupont', 'Relance Dupont la semaine prochaine', 'Ne t’embête pas à relancer Dupont',
    'Inutile de relancer Dupont', 'Dupont, on le relance pas', 'Je préfère ne pas relancer Dupont', 'Je ne pense pas qu’il faille relancer Dupont',
    'Relancer Dupont ? Non', 'Non, pas de relance pour Dupont', 'Plus de relance pour Dupont', 'Stop les relances à Dupont',
    'Envoie pas le devis à Dupont', 'N’envoie le devis DEV-2026-0011 qu’après mon appel', 'Envoie le devis à Dupont seulement s’il rappelle',
    'Faudrait relancer Dupont un de ces jours', 'Il faudrait peut-être relancer Dupont', 'Relance Dupont si tu veux', 'Tu pourrais relancer Dupont',
    'Pourrais-tu me dire qui relancer', 'J’hésite à relancer Dupont', 'Je relance Dupont moi-même', 'Je m’occupe de relancer Dupont',
    'Dupont a été relancé hier', 'Le devis de Dupont est déjà parti', 'Relance de Dupont faite', 'C’est bon pour la relance de Dupont, déjà fait',
  ]
  for (const m of pasOrdres) {
    const c2 = cadrage.cadrerDemande(m, null)
    const ft = cadrage.faitToutSeul(c2, { contenuTiersLu: false })
    log(`  ${ft ? '⚠ OUVRE' : 'ferme '} « ${m} »`, { actionDemandee: c2.actionDemandee, question: c2.question, interdit: c2.interdit, dejaFait: c2.dejaFait })
  }
  console.log('\n── D2 — vrais ordres (faitToutSeul attendu : true ; false = devient une carte, gravité faible)')
  const ordres = [
    'Relance Dupont', 'Relance Dupont, il ne répond plus', 'Relance les clients qui n’ont pas répondu', 'Envoie le devis DEV-2026-0011 à Dupont, il ne l’a pas reçu',
    'Relance Dupont, je n’ai pas de nouvelles', 'Relance Dupont, il n’a jamais répondu', 'Relance Dupont sans attendre', 'Envoie le devis à Dupont, n’oublie pas la pièce jointe',
    'Relance Dupont, ne t’inquiète pas pour le ton', 'Relance Dupont ou Martin, celui qui doit le plus', 'Relance Dupont si ce n’est pas déjà fait',
    'Relance Dupont, ça ne peut plus attendre', 'Bonjour, relance Dupont s’il te plaît', 'Relance Dupont, peut-être en ton ferme', 'Relance Dupont : rien depuis 10 jours',
    'Envoie le devis à Dupont, et si possible aujourd’hui', 'Relance Dupont, je ne veux pas perdre ce chantier', 'Je veux que tu relances Dupont',
  ]
  for (const m of ordres) {
    const c2 = cadrage.cadrerDemande(m, null)
    const ft = cadrage.faitToutSeul(c2, { contenuTiersLu: false })
    log(`  ${ft ? 'ouvre ' : '✗ carte'} « ${m} »`, { actionDemandee: c2.actionDemandee, question: c2.question, interdit: c2.interdit, dejaFait: c2.dejaFait })
  }

  // ═══ D3 — lectures du pilote qui avalent une erreur
  console.log('\n── D3 — escalade et autres lectures du pilote en erreur')
  const EXE = await copie('lib/pilote/executeur.ts', { '@/lib/envoisPdfServeur': "export async function envoyerDevisServeur(): Promise<never> { throw new Error('doublure') }\nexport async function envoyerFactureServeur(): Promise<never> { throw new Error('doublure') }\n" })
  const L1 = id(501)
  const monde3 = (motsArtisan = [], contenu = 'Je conteste votre facture, mon avocat vous écrira.') => {
    vider()
    Object.assign(T, {
      leads: [{ id: L1, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: 'Bonjour, devis pour un ballon', statut: 'en_discussion', prise_en_main: false, canal: 'web' }],
      messages: [{ id: id(502), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu }],
      plateforme_config: [{ artisan_id: A, escalade_mots: motsArtisan, limite_messages: 2, auto_24_7: true }],
    })
  }
  const deps = EXE.dependancesSupabase()
  const ligne = { id: id(660), artisan_id: A, type: 'relance_devis', source: 'carte', ref_id: id(661), lead_id: L1, libelle: 'essai', prete_le: '2026-11-02T08:00:00Z', part_le: '2026-11-02T08:10:00Z' }
  monde3(); log('  rejeu 032-001 : base saine, « mon avocat » → escalade', await deps.escalade(ligne, L1, new Date()))
  monde3(); PANNE.add('leads'); log('  rejeu 032-001 : « leads » en erreur 500', await deps.escalade(ligne, L1, new Date()).then((x) => `rend ${x}`, (e) => `lève : ${e.message}`))
  monde3(); PANNE.add('messages'); log('  « messages » en erreur 500', await deps.escalade(ligne, L1, new Date()).then((x) => `rend ${x}`, (e) => `lève : ${e.message}`))
  monde3(['carrelage fissuré'], 'Le carrelage fissuré est revenu, c’est inadmissible'); log('  mot PROPRE à l’artisan (« carrelage fissuré »), base saine', await deps.escalade(ligne, L1, new Date()))
  monde3(['carrelage fissuré'], 'Le carrelage fissuré est revenu, c’est inadmissible'); PANNE.add('plateforme_config')
  log('  même message, « plateforme_config » en erreur 500', await deps.escalade(ligne, L1, new Date()).then((x) => `rend ${x}${x ? '' : ' — le mot de l’artisan est perdu, la ligne part'}`, (e) => `lève : ${e.message}`))
  // etatConversation : la limite de réponses de l'IA par conversation (Ma plateforme), compte en erreur
  const ligneRep = { ...ligne, type: 'reponse_prospect', source: 'proposition' }
  monde3(); T.messages.push(...[1, 2, 3].map((k) => ({ id: id(520 + k), lead_id: L1, sens: 'out', type: 'reponse_auto', etat: null, sent_at: '2026-11-01T10:00:00Z', contenu: 'réponse' })))
  log('  etatConversation : 3 réponses de l’IA pour une limite de 2', await deps.etatConversation(ligneRep, new Date('2026-11-02T10:00:00Z')))
  monde3(); T.messages.push(...[1, 2, 3].map((k) => ({ id: id(520 + k), lead_id: L1, sens: 'out', type: 'reponse_auto', etat: null, sent_at: '2026-11-01T10:00:00Z', contenu: 'réponse' }))); PANNE.add('messages')
  log('  même conversation, compte des messages en erreur 500', await deps.etatConversation(ligneRep, new Date('2026-11-02T10:00:00Z')).then((x) => `rend « ${x} »${x === 'ok' ? ' — la limite saute, la réponse part' : ''}`, (e) => `lève : ${e.message}`))
  // contexte : l'offre illisible
  vider(); T.artisans = [{ ...ARTISAN }]; PANNE.add('artisans')
  log('  contexte : « artisans » en erreur 500 → plan lu', await deps.contexte(A, new Date()).then((x) => ({ plan: x.plan, suspendu: x.suspendu }), (e) => `lève : ${e.message}`))

  // ═══ D4 — l'Entreprise et les montants
  console.log('\n── D4 — alignerSurAbonnement : montants et métadonnée')
  const { alignerSurAbonnement } = await imp('lib/abonnementSync.ts')
  const sub = (centimes, meta) => ({ id: 'sub_essai', status: 'active', customer: 'cus_essai', metadata: { uid: A, ...(meta ? { plan: meta } : {}) }, items: { data: [{ current_period_start: Date.parse('2026-11-01T00:00:00Z') / 1000, price: { unit_amount: centimes } }] } })
  const montants = [[5900, 'Studio'], [2900, 'ancienne Essentiel'], [9900, 'Signature'], [30000, 'sur devis (300 €)'], [null, 'absent']]
  for (const meta of ['entreprise', 'signature', null]) {
    for (const [cts, nom] of montants) {
      vider(); T.artisans = [{ id: A, plan: 'entreprise', credits: 600, credits_forfait_servi: 600, credits_periode: '2026-11-01', stripe_subscription_id: 'sub_essai', stripe_customer_id: 'cus_essai' }]
      const a = await alignerSurAbonnement(sub(cts, meta))
      log(`  metadata.plan = ${meta ?? '—'} · ${nom}`, { plan: a.plan, raison: a.raison })
    }
  }
  vider(); T.artisans = [{ id: A, plan: 'entreprise', credits: 600, credits_forfait_servi: 600, credits_periode: '2026-11-01', stripe_subscription_id: 'sub_essai', stripe_customer_id: 'cus_essai' }]
  const desc = await alignerSurAbonnement(sub(9900, 'entreprise'))
  log('  contrat Entreprise à 300 € passé au portail sur le prix de Signature (99 €), métadonnée intacte', { plan: desc.plan, raison: desc.raison })

  // ═══ D5 — le lexique d'escalade
  console.log('\n── D5 — sujets d’escalade encore absents (sujetEscalade, mots de l’artisan vides ; null = la ligne part)')
  const manques = [
    'Je vais saisir le juge', 'J’ai subi un préjudice, j’attends une indemnisation', 'Je demande un dédommagement', 'Je vous envoie une lettre recommandée',
    'C’est un vice caché', 'J’ai fait opposition sur le paiement', 'Je ne vous paie pas tant que ce n’est pas réparé', 'Je ne réglerai pas cette facture',
    'Je vais laisser un avis négatif partout', 'Je vais vous faire une mauvaise pub sur Google', 'C’est dangereux, les fils sont à nu', 'Le plafond s’est écroulé',
    'Il y a de l’eau partout dans la salle de bain', 'Infiltration au plafond depuis votre passage', 'Ça sent le brûlé dans le tableau', 'Je dépose une réclamation',
    'J’ai contacté UFC-Que Choisir', 'Ma fille est tombée de l’échafaudage', 'Court-circuit depuis votre intervention', 'Je vous mets en demeure',
  ]
  for (const p of manques) log(`  « ${p} »`, R.sujetEscalade([p], []))
  console.log('\n── D5 — faux positifs sur des messages ordinaires (non null = la ligne passe à la main)')
  const ordinaires = [
    'Pas d’urgence, quand vous pouvez', 'Pour l’assurance, il me faut la facture', 'Je ne veux pas payer trop cher', 'Quel est le processus pour le devis ?',
    'Mon voisin, M. Gazzola, m’a donné votre nom', 'Expertise comptable : il me faut un devis détaillé', 'Je travaille dans la police municipale, je rentre à 18 h',
    'Remboursement de la TVA : quel taux ?', 'Ma gazinière est à changer aussi', 'Pas de souci pour l’accès, le gardien a les clés',
    'Le gazon devant la maison est fragile', 'Accidentellement j’ai cassé la poignée', 'Mon mari est pompier, il sera là le matin',
  ]
  for (const p of ordinaires) log(`  « ${p} »`, R.sujetEscalade([p], []))

  // ═══ D6 (et S4) — le registre : une colonne absente lue comme une table absente
  console.log('\n── D6/S4 — historiqueRelances : une erreur de COLONNE est prise pour une table absente (ignorée)')
  const { historiqueRelances, relanceRecente } = await imp('lib/relancesRegistre.ts')
  const faux = (pannes) => ({
    from(table) {
      const q = { _t: table, select() { return q }, eq() { return q }, in() { return q }, not() { return q }, order() { return q }, limit() { return q },
        then(ok, ko) {
          const p = pannes[table]
          const data = table === 'devis' ? [{ id: id(11), lead_id: null }] : table === 'crm_rappels' ? [{ envoye_le: '2026-11-02T07:00:00Z' }] : []
          return Promise.resolve(p ? { data: null, error: p } : { data, error: null }).then(ok, ko)
        } }
      return q
    },
  })
  const maintenant = new Date('2026-11-02T09:00:00Z')
  const h0 = await historiqueRelances(A, { type: 'devis', id: id(11) }, faux({}))
  log('  témoin : relance CRM ce matin → verdict', relanceRecente(h0, maintenant))
  const h1 = await historiqueRelances(A, { type: 'devis', id: id(11) }, faux({ crm_rappels: { code: '42703', message: 'column crm_rappels.envoye_le does not exist' } }))
  log('  colonne crm_rappels.envoye_le absente (42703) → historique', h1)
  log('  → verdict', relanceRecente(h1, maintenant))
  const h2 = await historiqueRelances(A, { type: 'devis', id: id(11) }, faux({ crm_rappels: { code: 'PGRST204', message: "Could not find the 'envoye_le' column of 'crm_rappels' in the schema cache" } }))
  log('  colonne inconnue du cache de schéma (PGRST204) → verdict', relanceRecente(h2, maintenant))
  const h3 = await historiqueRelances(A, { type: 'devis', id: id(11) }, faux({ crm_rappels: { code: '57014', message: 'canceling statement due to statement timeout' } }))
  log('  témoin : délai dépassé (57014) → verdict', relanceRecente(h3, maintenant))
} catch (e) {
  console.error('ERREUR DU SCRIPT :', e)
  process.exitCode = 1
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}
```

### Annexe B — `attaque-032-004-b.mjs`

```js
// Annexe B de 032-004 : la garde d'escalade de la réponse SEULE (Signature, mode auto), fonction pure, hors ligne.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
globalThis.fetch = async () => { throw new Error('réseau interdit') }
const P = await import(pathToFileURL(path.join(process.cwd(), 'lib/plateformeConfig.ts')).href)
const cfg = { ...P.CONFIG_DEFAUT, mode_reponse: 'auto' }
console.log('escalade_mots par défaut =>', JSON.stringify(P.CONFIG_DEFAUT.escalade_mots))
for (const m of ['Litige en cours : mon avocat vous écrira', 'Je vais porter plainte contre vous', 'Sinistre chez moi après vos travaux', 'Fuite sous l’évier'])
  console.log(`iaDoitRepondre(mode auto, « ${m} ») =>`, JSON.stringify(P.iaDoitRepondre(cfg, { nbReponsesIA: 0, message: m })))
```

### Annexe C — sortie complète de l’annexe A

```

── D1 — envoyer_devis en « fait tout seul » (message : « Envoie le devis DEV-2026-0011 à M. Essai »)
  rejeu 032-001 : ligne estimée à 100 € + ligne à 0 € sans provenance => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  une seule ligne « à chiffrer » => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  provenance vide, prix 80 € => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  devis sans aucune ligne => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  témoin : toutes les lignes au tarif de l’artisan => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]}
  ligne marquée « prix donné par l’artisan » (voir la chaîne de blanchiment) => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]}
  lignes illisibles (devis_lignes en erreur 500) => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}

── D1 bis — blanchiment : un prix ESTIMÉ, lu dans un devis, recopié par le modèle devient « prix donné par l’artisan »
  message de l’artisan => Refais le devis de Martin pour M. Essai et envoie-le-lui
  lire_devis est-il un contenu de tiers ? => false
  faitToutSeul du message => true
  verifierSources(creer_devis, prix 450, sources = [message, lecture du tour]) — null = accepté => null
  provenance écrite par resoudreLignes => ["prix donné par l’artisan"]
  prixSources(lignes du nouveau devis) — la garde D1 => true
  envoyer_devis du nouveau devis, même tour => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]}
  témoin : la même ligne recopiée avec sa provenance d’origine => false
  autre source admise : un nombre écrit par l’ASSISTANT au tour d’avant (« environ 85 € la prise ») => null

── D2 — formulations qui ne sont PAS des ordres (faitToutSeul attendu : false)
  ⚠ OUVRE « Pas question de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Hors de question de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Laisse tomber la relance de Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « On attend pour relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relance Dupont plus tard » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Évitons de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Oublie la relance de Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relance pas Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Faut pas relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Surtout ne relance pas Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ⚠ OUVRE « Attends avant de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relance Dupont la semaine prochaine » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Ne t’embête pas à relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Inutile de relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ⚠ OUVRE « Dupont, on le relance pas » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Je préfère ne pas relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ⚠ OUVRE « Je ne pense pas qu’il faille relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relancer Dupont ? Non » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Non, pas de relance pour Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Plus de relance pour Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Stop les relances à Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Envoie pas le devis à Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « N’envoie le devis DEV-2026-0011 qu’après mon appel » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Envoie le devis à Dupont seulement s’il rappelle » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Faudrait relancer Dupont un de ces jours » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Il faudrait peut-être relancer Dupont » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relance Dupont si tu veux » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Tu pourrais relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Pourrais-tu me dire qui relancer » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « J’hésite à relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Je relance Dupont moi-même » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Je m’occupe de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Dupont a été relancé hier » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Le devis de Dupont est déjà parti » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":false}
  ⚠ OUVRE « Relance de Dupont faite » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « C’est bon pour la relance de Dupont, déjà fait » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":true}

── D2 — vrais ordres (faitToutSeul attendu : true ; false = devient une carte, gravité faible)
  ouvre  « Relance Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont, il ne répond plus » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance les clients qui n’ont pas répondu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Envoie le devis DEV-2026-0011 à Dupont, il ne l’a pas reçu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont, je n’ai pas de nouvelles » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont, il n’a jamais répondu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont sans attendre » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Envoie le devis à Dupont, n’oublie pas la pièce jointe » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont, ne t’inquiète pas pour le ton » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont ou Martin, celui qui doit le plus » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont si ce n’est pas déjà fait » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":true}
  ouvre  « Relance Dupont, ça ne peut plus attendre » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Bonjour, relance Dupont s’il te plaît » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, peut-être en ton ferme » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont : rien depuis 10 jours » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Envoie le devis à Dupont, et si possible aujourd’hui » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, je ne veux pas perdre ce chantier » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ouvre  « Je veux que tu relances Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}

── D3 — escalade et autres lectures du pilote en erreur
  rejeu 032-001 : base saine, « mon avocat » → escalade => true
  rejeu 032-001 : « leads » en erreur 500 => lève : conversation illisible : rien ne part
  « messages » en erreur 500 => lève : messages du client illisibles : rien ne part
  mot PROPRE à l’artisan (« carrelage fissuré »), base saine => true
  même message, « plateforme_config » en erreur 500 => rend false — le mot de l’artisan est perdu, la ligne part
  etatConversation : 3 réponses de l’IA pour une limite de 2 => limite
  même conversation, compte des messages en erreur 500 => rend « ok » — la limite saute, la réponse part
  contexte : « artisans » en erreur 500 → plan lu => {"plan":null,"suspendu":false}

── D4 — alignerSurAbonnement : montants et métadonnée
  metadata.plan = entreprise · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = entreprise · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = entreprise · Signature => {"plan":"entreprise","raison":"déjà à jour"}
  metadata.plan = entreprise · sur devis (300 €) => {"plan":"entreprise","raison":"déjà à jour"}
  metadata.plan = entreprise · absent => {"plan":"entreprise","raison":"déjà à jour"}
  metadata.plan = signature · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · Signature => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · sur devis (300 €) => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · absent => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · Signature => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · sur devis (300 €) => {"plan":null,"raison":"montant 30000 : aucune offre ne correspond"}
  metadata.plan = — · absent => {"plan":null,"raison":"montant — : aucune offre ne correspond"}
  contrat Entreprise à 300 € passé au portail sur le prix de Signature (99 €), métadonnée intacte => {"plan":"entreprise","raison":"déjà à jour"}

── D5 — sujets d’escalade encore absents (sujetEscalade, mots de l’artisan vides ; null = la ligne part)
  « Je vais saisir le juge » => null
  « J’ai subi un préjudice, j’attends une indemnisation » => null
  « Je demande un dédommagement » => null
  « Je vous envoie une lettre recommandée » => null
  « C’est un vice caché » => null
  « J’ai fait opposition sur le paiement » => null
  « Je ne vous paie pas tant que ce n’est pas réparé » => null
  « Je ne réglerai pas cette facture » => null
  « Je vais laisser un avis négatif partout » => null
  « Je vais vous faire une mauvaise pub sur Google » => null
  « C’est dangereux, les fils sont à nu » => null
  « Le plafond s’est écroulé » => null
  « Il y a de l’eau partout dans la salle de bain » => null
  « Infiltration au plafond depuis votre passage » => null
  « Ça sent le brûlé dans le tableau » => brûl
  « Je dépose une réclamation » => null
  « J’ai contacté UFC-Que Choisir » => null
  « Ma fille est tombée de l’échafaudage » => null
  « Court-circuit depuis votre intervention » => null
  « Je vous mets en demeure » => en demeure

── D5 — faux positifs sur des messages ordinaires (non null = la ligne passe à la main)
  « Pas d’urgence, quand vous pouvez » => urgence
  « Pour l’assurance, il me faut la facture » => assurance
  « Je ne veux pas payer trop cher » => pas payer
  « Quel est le processus pour le devis ? » => procès
  « Mon voisin, M. Gazzola, m’a donné votre nom » => gaz
  « Expertise comptable : il me faut un devis détaillé » => expert
  « Je travaille dans la police municipale, je rentre à 18 h » => police
  « Remboursement de la TVA : quel taux ? » => rembours
  « Ma gazinière est à changer aussi » => gaz
  « Pas de souci pour l’accès, le gardien a les clés » => null
  « Le gazon devant la maison est fragile » => gaz
  « Accidentellement j’ai cassé la poignée » => accident
  « Mon mari est pompier, il sera là le matin » => pompier

── D6/S4 — historiqueRelances : une erreur de COLONNE est prise pour une table absente (ignorée)
  témoin : relance CRM ce matin → verdict => {"refus":true,"raison":"recente","derniere":{"chemin":"crm","le":"2026-11-02T07:00:00Z"}}
  colonne crm_rappels.envoye_le absente (42703) → historique => {"ok":true,"traces":[],"ignorees":["crm_rappels"]}
  → verdict => {"refus":false}
  colonne inconnue du cache de schéma (PGRST204) → verdict => {"refus":false}
  témoin : délai dépassé (57014) → verdict => {"refus":true,"raison":"illisible","erreur":"crm_rappels : canceling statement due to statement timeout"}
```
