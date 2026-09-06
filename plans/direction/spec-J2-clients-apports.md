# Spec J2 — Clients & abonnements, et le Registre des apports avec preuve

> Prompt v10 §2.2 + exigence de Benj du 07/09 : « je veux m'assurer qu'il apporte des clients **avec preuve** ». Format `to-spec`. Vocabulaire du contrat (`SaaS/Legal/Contrat-collaboration-Presti-Alexandre`, 06/09/2026) : *Client apporté*, *Registre des apports*, *Période* (mois civil), *Coûts directs*, *commission* (20 %, art. 5).

## Problem Statement

Benj dirige Presti sans vue d'ensemble de ses clients : pour savoir qui paie quoi, qui est en essai, qui a un paiement échoué, il ouvre Stripe et Supabase. Pour agir (changer une offre, offrir des crédits, rembourser, suspendre), il n'a rien : le poste de contrôle actuel ne sait que lire. Et la question qui décide de l'argent versé à Alexandre — *quels clients a-t-il réellement apportés ?* — n'a aujourd'hui aucune réponse vérifiable : ni registre, ni preuve. Le contrat prévoit un Registre des apports rempli à la main ; Benj veut que chaque ligne soit **prouvée**, pas déclarée.

## Solution

Un onglet **Clients & abonnements** dans le Centre de direction : la liste des artisans avec leur situation réelle chez Stripe (lue en direct, jamais recopiée), leur canal d'acquisition, leur santé ; une fiche par artisan avec sa chronologie et huit actions re-confirmées et journalisées ; les demandes d'abonnement non abouties avec relance en un clic ; les paiements et leurs échecs ; les webhooks Stripe avec rejeu ; les offres et prix en lecture.

Et le **Registre des apports** : un **lien d'apport personnel** pour Alexandre (`prestiapp.fr/a/<code>`). Quand un futur artisan arrive par ce lien, le serveur pose une empreinte signée (cookie, 90 jours). À l'inscription, le serveur — pas le navigateur — lit l'empreinte, vérifie la signature et inscrit l'artisan au registre avec la **preuve** : code, date et page du premier passage, date d'inscription, statut `prouve`. Une ligne ajoutée à la main par Benj est `declare` et exige une pièce (email d'introduction, capture) ; sans pièce, elle ne compte pas. Un artisan peut aussi saisir un code à l'inscription (`saisi`). Le relevé mensuel du contrat (J4) ne compte que `prouve`, `saisi` et `declare` avec pièce, et le dit ligne par ligne. Alexandre voit son registre et ses preuves, en lecture.

## User Stories

1. En tant que Benj, je veux voir tous les artisans avec offre, statut Stripe (essai, actif, impayé, résilié, en pause), MRR, date de renouvellement, crédits restants, dernière activité, canal d'acquisition et santé, pour savoir en un écran où en est l'entreprise.
2. En tant que Benj, je veux trier et filtrer cette liste (offre, statut, canal, santé, recherche par nom ou email), pour trouver un client en trois secondes.
3. En tant que Benj, je veux ouvrir la fiche d'un artisan et lire sa chronologie (inscription, paiements, changements d'offre, alertes, actions de direction le concernant), pour comprendre son histoire avant d'agir.
4. En tant que Benj, je veux voir l'abonnement Stripe de l'artisan en direct (statut, période, prochaine facture, moyen de paiement masqué), avec la fraîcheur de la lecture, pour ne jamais décider sur une copie périmée.
5. En tant que Benj, je veux **changer l'offre** d'un artisan (montée ou descente, prorata Stripe), après re-confirmation, pour régler un cas sans ouvrir Stripe.
6. En tant que Benj, je veux **offrir des crédits** à un artisan (montant borné, motif obligatoire), après re-confirmation, pour un geste commercial tracé.
7. En tant que Benj, je veux **prolonger l'essai** d'un artisan (jours bornés), après re-confirmation, pour laisser une chance à un prospect hésitant.
8. En tant que Benj, je veux **rembourser** un paiement (partiel ou total, motif), après re-confirmation, avec le montant exact repris de Stripe, pour traiter une réclamation.
9. En tant que Benj, je veux **mettre en pause** puis **réactiver** un abonnement (pause de collecte Stripe), après re-confirmation, pour un artisan en congé.
10. En tant que Benj, je veux **suspendre** un compte (accès coupé, données conservées, sessions fermées) puis le **réactiver**, après re-confirmation, pour un abus ou un impayé prolongé — et l'artisan est prévenu par email.
11. En tant que Benj, je veux **ouvrir le portail Stripe du client** (lien de portail généré pour lui) sans me connecter à sa place, pour l'aider au téléphone.
12. En tant que Benj, je veux **envoyer un email** à un artisan depuis l'adresse Presti (modèles sans IA), journalisé, pour ne pas sortir du centre.
13. En tant que Benj, je veux que chaque action ci-dessus soit refusée sans re-confirmation, journalisée avant/après, et visible dans la chronologie de l'artisan, pour que rien ne se fasse en silence.
14. En tant que Benj, je veux la liste des **demandes d'abonnement non abouties** (checkout ouvert non payé, essai qui expire sous 7 jours, demande depuis la landing, formulaire pro) avec une relance en un clic (email prérédigé), pour ne perdre aucune conversion.
15. En tant que Benj, je veux la liste des **paiements** Stripe (charges, factures, remboursements, litiges) filtrable, avec HT/TTC et statut, pour suivre l'argent.
16. En tant que Benj, je veux les **échecs de paiement** avec leur cause lisible (carte refusée, 3DS, fonds insuffisants) et une relance en un clic, pour récupérer les impayés.
17. En tant que Benj, je veux les **litiges** avec leur échéance de réponse et les pièces disponibles (facture, CGU acceptées, journal d'usage), pour répondre à temps.
18. En tant que Benj, je veux voir l'état du **point de terminaison webhook**, les derniers événements reçus et ceux qui ont échoué, et **rejouer** un événement, pour réparer une désynchronisation sans toucher à la base.
19. En tant que Benj, je veux voir la matrice des **offres et prix** avec les prix Stripe liés, et créer un **coupon** ou un **lien de paiement**, après re-confirmation, pour une opération commerciale.
20. En tant que Benj, je veux que le **Registre des apports** liste chaque client apporté avec son statut (`prouve`, `saisi`, `declare`, `conteste`, `retire`), sa preuve, l'apporteur, la date du premier contact, la date de souscription et l'offre — les colonnes de l'annexe B du contrat.
21. En tant que Benj, je veux qu'un artisan arrivé par le **lien d'apport** d'Alexandre soit inscrit **automatiquement** au registre, avec la preuve serveur, sans que personne n'ait rien à saisir.
22. En tant que Benj, je veux pouvoir **contester** ou **retirer** une ligne du registre (motif, re-confirmation, journalisé), pour appliquer l'article 5 du contrat (désaccord → 10 %).
23. En tant que Benj, je veux ajouter une ligne `declare` à la main **seulement avec une pièce** (fichier ou lien), pour que rien ne soit versé sur une simple parole.
24. En tant que Benj, je veux que le registre distingue ce qui **compte pour la commission** de ce qui ne compte pas, et pourquoi, pour que le relevé du J4 soit incontestable.
25. En tant qu'Alexandre (rôle lecture), je veux voir mon lien d'apport, mon registre et la preuve de chaque ligne, pour savoir où j'en suis — sans voir la comptabilité ni pouvoir écrire.
26. En tant qu'Alexandre, je veux voir la liste des clients et leurs abonnements en lecture, comme le contrat me le donne, pour suivre les comptes que j'ai apportés.
27. En tant qu'artisan qui s'inscrit, je veux pouvoir saisir un code d'apport si on m'en a donné un, pour que la personne qui m'a recommandé Presti soit reconnue — et rien de plus ne change pour moi.
28. En tant qu'artisan, je veux que le lien d'apport ne m'expose à rien : pas de pistage publicitaire, une empreinte technique de 90 jours, décrite dans la politique de confidentialité.
29. En tant que Benj, je veux que le canal d'acquisition apparaisse dans la liste des artisans (organique / apporté par X / code), pour lire la part d'Alexandre d'un coup d'œil.
30. En tant que Benj, je veux que la suite de tests prouve, en mode test Stripe, chaque action (état Stripe et état Supabase cohérents après chacune) et le registre (un passage par le lien puis une inscription = une ligne `prouve` avec la bonne preuve ; un cookie forgé = rien ; une déclaration sans pièce = refusée).

## Implementation Decisions

- **Lecture Stripe en direct, jamais dénormalisée** : les statuts, périodes et montants viennent de l'API à chaque affichage (cache mémoire 60 s, fraîcheur affichée). La base ne gagne aucune colonne « statut Stripe » ; le webhook reste la seule écriture automatique sur le compte (plan, crédits, identifiants).
- **Idempotence du webhook** : une table des événements Stripe reçus (identifiant, type, reçu le, traité, erreur) — c'est aussi la source de l'onglet Webhooks et du rejeu. Le rejeu relit l'événement chez Stripe (jamais le corps stocké) et le repasse par le même traitement.
- **Actions** : chaque action est une route d'écriture qui exige le rôle `direction`, une re-confirmation de portée `argent` (offre, crédits, essai, remboursement, pause, coupon, lien de paiement) ou `artisan` (suspension, réactivation, email, registre), journalise avant/après, puis agit chez Stripe **puis** en base (ou l'inverse selon la source de vérité), et remet l'état d'avant si la seconde écriture échoue. Les bornes (crédits offerts, jours d'essai, montant remboursé ≤ payé) sont dans le code et rappelées à l'écran.
- **Suspension** : un état de compte porté par une table à côté d'`artisans` (jamais une colonne sensible de plus sur `artisans`, trigger 0055), lu par la garde des artisans ; sessions fermées par la révocation réelle existante ; email à l'artisan par le canal existant.
- **Lien d'apport** : chaque apporteur a un code court, unique, non devinable. La route publique du lien pose un **cookie httpOnly signé** (HMAC serveur : code, horodatage, page d'arrivée), 90 jours, puis redirige vers la landing. Rien n'est exposé au JavaScript du navigateur.
- **Rattachement à l'inscription** : après la création du compte, le navigateur appelle une route de rattachement avec sa session ; le serveur lit le cookie, vérifie signature et fraîcheur, et écrit la ligne du registre avec la preuve. Un cookie absent, forgé ou périmé n'écrit rien. Le code saisi dans le formulaire suit le même chemin avec le statut `saisi`. Un compte ne peut être rattaché qu'une fois, dans les 30 jours suivant l'inscription (art. 5 : inscription au registre ≤ 30 j après souscription).
- **Registre** : une table par ligne d'apport (artisan, apporteur, statut, preuve structurée, pièce, dates, offre à la souscription, motif de contestation), migration 0066 ; RLS fondateurs ; écriture serveur seule ; chaque changement de statut est journalisé et re-confirmé.
- **Ce qui compte** : une règle unique, dans le code, rendue par l'API avec sa raison (« prouvé par lien », « déclaré avec pièce », « contesté le … », « retiré »), réutilisée telle quelle par le relevé mensuel du J4.
- **Canal d'acquisition** dans la liste : dérivé du registre (apporté par X) ou « organique » ; jamais une saisie libre.
- **Rôle lecture** : voit la liste, les fiches (sans les actions), les paiements, son registre et ses preuves ; aucune route d'écriture ; les pièces des autres apporteurs lui sont cachées.
- **Emails** : modèles en dur (sans IA), envoyés par le canal existant depuis l'adresse Presti, journalisés avec le modèle utilisé — jamais le corps d'un email de l'artisan.
- **Politique de confidentialité** : un paragraphe « Lien de recommandation » (empreinte technique signée, 90 jours, finalité : reconnaître l'apporteur, aucun tiers publicitaire).

## Testing Decisions

- Un bon test observe l'effet : l'état Stripe (mode test) **et** l'état Supabase après chaque action, la ligne de journal, la réponse de l'API — jamais l'implémentation.
- Suite `direction-stripe-e2e` (clé de test uniquement, refuse une clé réelle) : client et abonnement de test créés chez Stripe, puis les huit actions dans l'ordre, chacune : sans re-confirmation → refusée ; avec → état Stripe attendu, état base attendu, journal avant/après ; remboursement supérieur au payé → refusé ; pause puis réactivation → périodes cohérentes ; suspension → l'artisan ne passe plus la garde, ses sessions sont fermées, il est réactivé ensuite ; rejeu d'un webhook → même état, pas de double crédit.
- Suite `direction-apports-e2e` : passage par le lien → cookie signé posé (httpOnly, 90 j) → inscription → ligne `prouve` avec code, dates et page ; cookie modifié d'un caractère → aucune ligne ; cookie de plus de 90 jours → aucune ligne ; second rattachement → refusé ; code saisi → `saisi` ; déclaration sans pièce → 400 ; contestation → statut, motif, journal ; rôle lecture → voit ses lignes, pas les pièces des autres, n'écrit rien ; « ce qui compte » rend la raison attendue pour chaque statut.
- Prior art : `scripts/abonnement-e2e.mjs` (Stripe en mode test, 78 contrôles), `scripts/direction-e2e.mjs` (garde, re-confirmation, journal), `scripts/code-connexion-e2e.mjs` (cookies signés, appareils de confiance).

## Out of Scope

- La messagerie Gmail (J3), la comptabilité, les obligations et le relevé mensuel lui-même (J4) — le J2 fournit au J4 la règle « ce qui compte ».
- Les achats intégrés Apple/Google : l'app mobile ne vend rien (décision des fiches store du 07/09).
- Une commission calculée au J2 : le registre qualifie, le relevé (J4) calcule.
- Un lien d'apport pour d'autres apporteurs qu'Alexandre : le modèle le permet, l'écran n'en crée qu'un.

## Further Notes

- Le contrat (art. 5) prévoit un désaccord → 10 % : le statut `conteste` porte le motif et la date ; le relevé du J4 applique 10 % aux lignes contestées non retirées.
- La preuve par lien ne dit pas *qui* a convaincu l'artisan, elle dit *par où* il est arrivé — c'est la seule chose qu'un système peut prouver ; le contrat s'y prête (« mis en relation »). Benj garde la contestation pour le reste.
- Tout ce que le J2 écrit chez Stripe se teste en clé de test contre une préversion ; la prod reste en clé réelle et n'est jamais la cible d'un test d'écriture.
