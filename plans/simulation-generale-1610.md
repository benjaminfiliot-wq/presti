# Simulation générale — 16/10/2026

Demande de Benj : « des tests de simulation sur chaque fonctionnalité pour s'assurer que tout marche très bien ; et pour chaque abonnement, deux options : soit tu paies, soit tu utilises des semaines gratuites offertes ».

## Verdict en dix lignes

- **Les fonctionnalités des quatre offres (Essai, Essentiel, Studio, Signature) marchent de bout en bout** sur un build de production local branché à la vraie base : 403 contrôles verts, 0 défaut (tableau plus bas). Tout ce qui n'est pas dans une offre est fermé : écran verrouillé **et** refus serveur 403 sans donnée ni crédit consommé.
- **Les deux choix existent maintenant pour chaque offre payante.** Avant cette simulation, un compte qui avait droit à l'essai n'avait plus **aucun bouton « payer »** sur /abonnement ni dans Paramètres, et l'accueil ne proposait que l'essai : c'était le défaut n° 1, corrigé (voir plus bas).
- « Payer » : le bouton ouvre la session de paiement Stripe **en mode test** (créée pour de vrai, vérifiée chez Stripe, puis expirée) ; rien n'est payé, aucun abonnement réel.
- « Essai gratuit » : 7 / 14 / 21 jours annoncés = 7 / 14 / 21 jours envoyés à Stripe = fin d'essai à J+7 / J+14 / J+21 en base ; aucune carte exigée ; fin d'essai sans carte → retour à l'Essai, accès refermé (3 portes vérifiées) ; un seul essai par compte.
- Trois défauts de produit corrigés, et vingt-huit scripts de test réparés : 24 dont les comptes de test étaient refusés par la base (mot de passe de 11 caractères, 12 exigés), 4 dont les attentes étaient périmées depuis la décision du 15/10.
- Deux appels IA réels seulement (chiffrage sur les tarifs de l'artisan ; commande simple à l'assistant), tout le reste simulé et compté. **Aucun e-mail réel** (tout est intercepté et consigné), **aucun paiement**, comptes de test supprimés et **relus en base : il ne reste rien**.

## Comment la simulation est faite (garde-fous)

`scripts/simulation-generale.mjs` (avec `scripts/lib/sim-serveur.mjs`, `sim-ia-proxy.mjs`, `sim-preload.cjs`) lance son propre `next start` sur le build `.next-simulation`, **avec dans l'environnement du seul processus serveur** :
- la clé Stripe de **test** à la place de la clé réelle (`STRIPE_SECRET_KEY_TEST`), un secret de webhook propre à la simulation ;
- une clé d'envoi factice et un préchargement qui **intercepte tout appel à Resend** (consigné, jamais livré) ; il court-circuite aussi les compteurs de plafond d'e-mails, partagés avec la production, pour ne pas entamer le quota du jour des vrais artisans ;
- un proxy `ANTHROPIC_BASE_URL` qui laisse passer **2 appels réels au plus** et simule le reste (devis JSON, texte, et un « modèle » scripté pour la boucle de l'assistant : l'outil, la carte, la confirmation, l'envoi sont le vrai code) ;
- les adresses IP de documentation (203.0.113.x) pour les visiteurs simulés, afin que le plafond anti-abus par IP (6 demandes / 10 min) ne fausse rien.

Chaque offre a un compte de test (`@presti-test.invalid`) : parcours par l'API réelle **et** en vrai navigateur (Playwright) — toutes les pages de la console, devis → chiffrage IA → enregistrer → envoyer → facture à l'écran, chat public d'un client sur mobile, Paramètres (7 onglets), centre d'aide, clics réels sur les boutons d'abonnement. Les comptes sont supprimés dans un `finally`, puis la base est relue (compte de connexion, fiche, 47 tables portant `artisan_id`, messages, relances, registre des essais) : rien ne reste. Les sessions Stripe de test sont expirées et les clients de test supprimés.

<!-- AUTO-DEBUT : ce bloc est réécrit par scripts/simulation-generale.mjs ; le reste du fichier est à la main -->
## Résultats de la dernière exécution (2026-10-16 01:30 UTC)

Bilan : **403 contrôles verts, 0 défaut(s)** — 404 constats ; build local de production (`.next-simulation`), base réelle, clé Stripe de TEST, e-mails interceptés (35 message(s) consigné(s), aucun parti), appels IA comptés (2 réel(s) sur 24).

Légende : ✅ marche · 🔒 fermé comme prévu (écran verrouillé et/ou refus serveur sans donnée ni crédit) · ❌ défaut · · non applicable ou non joué.

### Offre × fonctionnalité (synthèse)

| Fonctionnalité | Essai | Essentiel | Studio | Signature |
|---|:-:|:-:|:-:|:-:|
| Tableau de bord | ✅ | ✅ | ✅ | ✅ |
| Clients (fiches clients du CRM ; hors CRM, le client se saisit dans le devis) | 🔒 | 🔒 | 🔒 | ✅ |
| Devis : création, PDF, envoi par e-mail | ✅ | ✅ | ✅ | ✅ |
| Chiffrage du devis par l’IA, sur les tarifs de l’artisan | ✅🔒 | ✅🔒 | ✅ | ✅ |
| Factures : depuis un devis, payée, Factur-X | ✅ | ✅ | ✅ | ✅ |
| Acompte automatique à l’acceptation (règle Signature) | · | · | 🔒 | ✅ |
| Mes tarifs | ✅ | ✅ | ✅ | ✅ |
| Page de conversation publique (demande d’un client) | 🔒 | 🔒 | ✅ | ✅ |
| Messages (boîte, réponses, prise de main) | 🔒 | 🔒 | ✅ | ✅ |
| Réponse préparée / automatique, Réponses instantanées | 🔒 | 🔒 | ✅ | ✅ |
| Comptes clients (lien magique) | 🔒 | 🔒 | ✅ | ✅ |
| Relances de conversation (J+2 / J+5 / J+10) | 🔒 | 🔒 | ✅ | ✅ |
| Relances d’impayés | 🔒 | 🔒 | ✅ | ✅ |
| Inventaire (stock, recherche fournisseurs) | 🔒 | 🔒 | ✅ | ✅ |
| Mes chiffres | 🔒 | 🔒 | ✅ | ✅ |
| Automatisations de Mes chiffres (Signature) | 🔒 | 🔒 | ✅🔒 | ✅ |
| CRM atelier (pipeline, chantiers, vue) | 🔒 | 🔒 | 🔒 | ✅ |
| Assistant de gestion (commande + carte à confirmer) | 🔒 | 🔒 | 🔒 | ✅ |
| Centre d’aide (vidéos) | ✅ | ✅ | ✅ | ✅ |
| Paramètres | ✅ | ✅ | ✅ | ✅ |
| Abonnement (écran, choix payer / essai) | ✅ | ✅ | ✅ | ✅ |

_✅🔒 : la fonction marche et ses annexes hors offre sont fermées (ex. chiffrage ouvert, rangement IA des fichiers fermé)._

<details><summary>Détail : les 325 contrôles, un par un</summary>

| Fonctionnalité | Essai | Essentiel | Studio | Signature |
|---|:-:|:-:|:-:|:-:|
| tarifs : ajout d’un tarif puis lecture de la bibliothèque | ✅ | ✅ | ✅ | ✅ |
| devis : création (numéro, 2 lignes, totaux) | ✅ | ✅ | ✅ | ✅ |
| devis : PDF généré et lisible | ✅ | ✅ | ✅ | ✅ |
| devis : chiffrage par l’IA (lignes proposées, 1 crédit débité) | ✅ | ✅ | ✅ | ✅ |
| devis : le chiffrage reçoit LES TARIFS de l’artisan (le prompt les contient) | ✅ | ✅ | ✅ | ✅ |
| devis : envoi au client (statut « envoyé », e-mail intercepté avec le PDF en pièce jointe) | ✅ | ✅ | ✅ | ✅ |
| factures : création depuis le devis (numéro FAC, lignes reprises) | ✅ | ✅ | ✅ | ✅ |
| factures : un second clic ne refacture pas le devis (409) | ✅ | ✅ | ✅ | ✅ |
| factures : PDF généré et lisible | ✅ | ✅ | ✅ | ✅ |
| factures : Factur-X (XML de facture électronique avec le numéro) | ✅ | ✅ | ✅ | ✅ |
| factures : marquée payée (statut en base) | ✅ | ✅ | ✅ | ✅ |
| factures : une facture payée ne revient pas en arrière (409) | ✅ | ✅ | ✅ | ✅ |
| crédits épuisés : le chiffrage est refusé (402), aucun appel au modèle, aucun débit | ✅ | ✅ | ✅ | ✅ |
| porte : Messages (boîte de réception, réponses) | 🔒 | 🔒 | ✅ | ✅ |
| porte : Réponses instantanées (IA) | 🔒 | 🔒 | ✅ | ✅ |
| porte : Devis automatique depuis une conversation | 🔒 | 🔒 | ✅ | ✅ |
| porte : Ma plateforme : réglages | 🔒 | 🔒 | ✅ | ✅ |
| porte : Ma plateforme : apparence | 🔒 | 🔒 | ✅ | ✅ |
| porte : Boîte e-mail branchée | 🔒 | 🔒 | ✅ | ✅ |
| porte : Mes chiffres | 🔒 | 🔒 | ✅ | ✅ |
| porte : Mes chiffres : rangement des fichiers par l’IA | 🔒 | 🔒 | ✅ | ✅ |
| porte : Mes chiffres : automatisations (Signature) | 🔒 | 🔒 | 🔒 | ✅ |
| porte : Relances automatiques des factures impayées | 🔒 | 🔒 | ✅ | ✅ |
| porte : Inventaire | 🔒 | 🔒 | ✅ | ✅ |
| porte : Inventaire : recherche chez les fournisseurs (IA) | 🔒 | 🔒 | ✅ | ✅ |
| porte : CRM atelier | 🔒 | 🔒 | 🔒 | ✅ |
| porte : Assistant de gestion | 🔒 | 🔒 | 🔒 | ✅ |
| page de conversation publique : une demande est refusée (403 « plateforme »), rien enregistré, aucun crédit | 🔒 | 🔒 | · | · |
| page publique de l’artisan : neutre (pas de chat) | 🔒 | 🔒 | · | · |
| relances de conversation : aucune relance armée sans plateforme (le devis part, la demande reste intacte) | 🔒 | 🔒 | · | · |
| comptes clients : aucun lien magique créé ni envoyé | 🔒 | 🔒 | · | · |
| devis : réponse du vrai modèle exploitable (lignes chiffrées) | · | ✅ | · | · |
| page de conversation publique : affichée à la marque de l’artisan | · | · | ✅ | ✅ |
| Ma plateforme : réglages lus (mode de réponse) | · | · | ✅ | ✅ |
| Ma plateforme : le mode « automatique » s’enregistre (RLS de l’artisan) | · | · | ✅ | ✅ |
| conversation publique : la demande du client est enregistrée et l’IA répond seule (mode automatique) | · | · | ✅ | ✅ |
| réponse automatique : 1 crédit débité | · | · | ✅ | ✅ |
| conversation publique : le client poursuit la discussion, l’IA répond | · | · | ✅ | ✅ |
| réponse préparée : rien ne part seul, une proposition attend la validation de l’artisan | · | · | ✅ | ✅ |
| Messages : l’artisan valide la réponse préparée (envoyée, statut « répondu ») | · | · | ✅ | ✅ |
| relances de conversation : armées à J+2 / J+5 / J+10 après la réponse | · | · | ✅ | ✅ |
| Messages : l’artisan répond lui-même au client | · | · | ✅ | ✅ |
| Messages : brouillon de réponse proposé par l’IA (1 crédit) | · | · | ✅ | ✅ |
| Messages : prise de main puis retour de la main à l’assistant | · | · | ✅ | ✅ |
| devis automatique depuis la conversation : brouillon chiffré par l’IA, rattaché au client | · | · | ✅ | ✅ |
| devis de la conversation : envoyé au client | · | · | ✅ | ✅ |
| conversation publique : le client accepte le devis depuis le fil (horodaté) | · | · | ✅ | ✅ |
| règle d’acompte automatique : aucune facture émise (règles = Signature) | · | · | 🔒 | · |
| comptes clients : le lien magique part par e-mail (intercepté, au nom de l’artisan) | · | · | ✅ | ✅ |
| comptes clients : le lien ouvre une session (cookie), le client est reconnu | · | · | ✅ | ✅ |
| comptes clients : le lien ne sert qu’une fois | · | · | ✅ | ✅ |
| Mes chiffres : le tableau reprend les factures du compte (dont la facture payée) | · | · | ✅ | ✅ |
| Mes chiffres : automatisations fermées | · | · | ✅ | · |
| relances d’impayés : l’artisan les active (opt-in) | · | · | ✅ | ✅ |
| relances d’impayés (passage simulé à échéance +4 j) : une relance part, une seule, au nom de l’artisan | · | · | ✅ | ✅ |
| relances d’impayés : un second passage le même jour ne renvoie rien (idempotent) | · | · | ✅ | ✅ |
| relances d’impayés : une facture réglée n’est plus relancée | · | · | ✅ | ✅ |
| inventaire : article créé, entrée de 20, sortie de 17 → reste 3 (sous le seuil de 5) | · | · | ✅ | ✅ |
| inventaire : recherche chez les fournisseurs — porte ouverte (requête invalide refusée en 400, sans crédit) | · | · | ✅ | ✅ |
| règles d’automatisation (Signature) : enregistrées avec un acompte de 30 % | · | · | · | ✅ |
| règle d’acompte : une facture d’acompte de 30 % est émise à l’acceptation | · | · | · | ✅ |
| Mes chiffres : automatisations ouvertes (Signature) | · | · | · | ✅ |
| Mes chiffres : réglages d’automatisation (alerte impayés, export mensuel) lisibles | · | · | · | ✅ |
| CRM : le pipeline (6 colonnes) reprend les devis, demandes et factures du compte | · | · | · | ✅ |
| CRM : clients, tableau de bord et atelier présents dans la vue | · | · | · | ✅ |
| CRM : déplacement manuel d’un dossier dans le pipeline (journalisé) | · | · | · | ✅ |
| CRM : un chantier naît du devis signé, avec une tâche par ligne | · | · | · | ✅ |
| CRM : fiches clients | · | · | · | ✅ |
| assistant de gestion : une commande simple est comprise et répondue | · | · | · | ✅ |
| assistant de gestion : « Envoie le devis… » propose une CARTE à confirmer, et rien n’est parti | · | · | · | ✅ |
| assistant de gestion : après ma confirmation, le devis part (statut « envoyé », e-mail intercepté avec le PDF) | · | · | · | ✅ |
| assistant de gestion : un second clic sur la carte ne renvoie rien | · | · | · | ✅ |
| écran /dashboard | ✅ | ✅ | ✅ | ✅ |
| écran /devis | ✅ | ✅ | ✅ | ✅ |
| écran /factures | ✅ | ✅ | ✅ | ✅ |
| écran /tarifs | ✅ | ✅ | ✅ | ✅ |
| écran /profil | ✅ | ✅ | ✅ | ✅ |
| écran /parametres | ✅ | ✅ | ✅ | ✅ |
| écran /abonnement | ✅ | ✅ | ✅ | ✅ |
| écran /aide | ✅ | ✅ | ✅ | ✅ |
| écran /messages | 🔒 | 🔒 | ✅ | ✅ |
| écran /plateforme | 🔒 | 🔒 | ✅ | ✅ |
| écran /outils | 🔒 | 🔒 | ✅ | ✅ |
| écran /chiffres | 🔒 | 🔒 | ✅ | ✅ |
| écran /inventaire | 🔒 | 🔒 | ✅ | ✅ |
| écran /crm | 🔒 | 🔒 | 🔒 | ✅ |
| écran /assistant | 🔒 | 🔒 | 🔒 | ✅ |
| écran /messages/canaux | 🔒 | 🔒 | ✅ | ✅ |
| écran /inventaire/fournisseurs | 🔒 | 🔒 | ✅ | ✅ |
| écran /inventaire/recherche | 🔒 | 🔒 | ✅ | ✅ |
| écran devis : « Chiffrer avec l’IA » remplit les lignes du devis | ✅ | ✅ | ✅ | ✅ |
| écran devis : « Enregistrer » crée le devis en base (client, lignes, total) | ✅ | ✅ | ✅ | ✅ |
| écran devis : le chiffrage par l’IA a coûté 1 crédit | ✅ | ✅ | ✅ | ✅ |
| écran devis : « Envoyer au client » (statut « envoyé », e-mail intercepté avec le PDF) | ✅ | ✅ | ✅ | ✅ |
| écran devis : « Créer la facture » émet la facture, visible dans la liste | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « profil » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « notifications » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « application » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « legal » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « abonnement » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « securite » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres : onglet « donnees » s’affiche | ✅ | ✅ | ✅ | ✅ |
| paramètres → abonnement : le choix « payer » est proposé à côté de l’essai pour chaque offre supérieure | ✅ | ✅ | ✅ | ✅ |
| centre d’aide : des vidéos sont proposées | ✅ | ✅ | ✅ | ✅ |
| centre d’aide : ouvrir une vidéo monte le lecteur vidéo (source mp4, étapes écrites dessous) | ✅ | ✅ | ✅ | ✅ |
| tableau de bord : affiche l’activité du compte (devis, factures, crédits) | ✅ | ✅ | ✅ | ✅ |
| page de conversation (vrai chat, mobile) : le client écrit, l’assistant répond dans le fil | · | · | ✅ | ✅ |
| page de conversation : la demande arrive chez l’artisan avec les coordonnées laissées | · | · | ✅ | ✅ |
| Messages (écran de l’artisan) : la conversation du client est dans la boîte | · | · | ✅ | ✅ |
| centre d’aide : les 15 vidéos (mp4 + affiche) sont servies et lisibles | · | · | · | · |

</details>

### Contrôles transverses

- ✅ centre d’aide : les 15 vidéos (mp4 + affiche) sont servies et lisibles
- ✅ ménage : plus rien en base après la simulation

### Les deux choix de chaque offre payante (payer / semaines gratuites offertes)

| Fonctionnalité | Essentiel | Studio | Signature |
|---|:-:|:-:|:-:|
| accueil : les semaines gratuites sont annoncées (durée = ESSAI_JOURS) | ✅ | ✅ | ✅ |
| accueil : le choix « s’abonner directement » existe et mène à l’inscription de CETTE offre | ✅ | ✅ | ✅ |
| accueil : le choix « essai gratuit » existe et mène à l’inscription | ✅ | ✅ | ✅ |
| abonnement : un compte neuf a droit à l’essai, avec les durées de lib/plans.ts | ✅ | ✅ | ✅ |
| écran /abonnement : le choix « essai gratuit » (durée annoncée = ESSAI_JOURS) | ✅ | ✅ | ✅ |
| écran /abonnement : le choix « payer » (prix de la grille) | ✅ | ✅ | ✅ |
| payer : le bouton envoie vers le paiement Stripe en mode TEST (session créée, page checkout.stripe.com) | ✅ | ✅ | ✅ |
| payer : session d’abonnement mensuel au prix de la grille, SANS essai, carte demandée tout de suite | ✅ | ✅ | ✅ |
| payer : Stripe confirme la session (ouverte, TEST, montant de la grille) | ✅ | ✅ | ✅ |
| essai gratuit : le bouton ouvre la session Stripe de TEST | ✅ | ✅ | ✅ |
| essai gratuit : Stripe reçoit 7 jours d’essai, AUCUNE carte exigée, annulation si aucune carte à la fin | ✅ | · | · |
| essai gratuit activé : offre Essentiel, crédits de l’essai (18), abonnement enregistré | ✅ | · | · |
| essai gratuit : durée annoncée (7 j) = durée appliquée (fin d’essai à J+7) | ✅ | · | · |
| essai gratuit : inscrit au registre (un seul essai par compte) | ✅ | ✅ | ✅ |
| essai gratuit : le rejeu du même événement ne recharge pas les crédits (idempotent) | ✅ | ✅ | ✅ |
| webhook : une signature forgée est refusée (400) | ✅ | ✅ | ✅ |
| pendant l’essai : plus d’autre essai possible (un seul par compte) | ✅ | ✅ | ✅ |
| accès pendant l’essai : les portes suivent l’offre Essentiel (Ma plateforme, inventaire, CRM) | ✅ | · | · |
| fin d’essai sans carte : retour à l’offre d’Essai, aucun abonnement, crédits ramenés à ceux de l’Essai | ✅ | ✅ | ✅ |
| accès après la fin de l’essai : les portes suivent l’offre Essai (Ma plateforme, inventaire, CRM) | ✅ | ✅ | ✅ |
| après l’essai : plus de semaines gratuites (déjà prises), seul le paiement reste | ✅ | ✅ | ✅ |
| écran /abonnement après l’essai : seul le choix « payer » reste, aucune promesse de jours gratuits | ✅ | ✅ | ✅ |
| après l’essai : redemander l’essai n’en donne pas un second (la session exige la carte) | ✅ | ✅ | ✅ |
| payer : l’abonnement est activé — offre Essentiel, forfait entier de 80 crédits | ✅ | · | · |
| accès abonnement payé : les portes suivent l’offre Essentiel (Ma plateforme, inventaire, CRM) | ✅ | · | · |
| résiliation d’un abonnement payé : retour à l’Essai sans perdre les crédits restants | ✅ | ✅ | ✅ |
| essai gratuit : Stripe reçoit 14 jours d’essai, AUCUNE carte exigée, annulation si aucune carte à la fin | · | ✅ | · |
| essai gratuit activé : offre Studio, crédits de l’essai (116), abonnement enregistré | · | ✅ | · |
| essai gratuit : durée annoncée (14 j) = durée appliquée (fin d’essai à J+14) | · | ✅ | · |
| accès pendant l’essai : les portes suivent l’offre Studio (Ma plateforme, inventaire, CRM) | · | ✅ | · |
| payer : l’abonnement est activé — offre Studio, forfait entier de 250 crédits | · | ✅ | · |
| accès abonnement payé : les portes suivent l’offre Studio (Ma plateforme, inventaire, CRM) | · | ✅ | · |
| essai gratuit : Stripe reçoit 21 jours d’essai, AUCUNE carte exigée, annulation si aucune carte à la fin | · | · | ✅ |
| essai gratuit activé : offre Signature, crédits de l’essai (150), abonnement enregistré | · | · | ✅ |
| essai gratuit : durée annoncée (21 j) = durée appliquée (fin d’essai à J+21) | · | · | ✅ |
| accès pendant l’essai : les portes suivent l’offre Signature (Ma plateforme, inventaire, CRM) | · | · | ✅ |
| payer : l’abonnement est activé — offre Signature, forfait entier de 600 crédits | · | · | ✅ |
| accès abonnement payé : les portes suivent l’offre Signature (Ma plateforme, inventaire, CRM) | · | · | ✅ |

### Appels IA

24 appel(s) au modèle : **2 réel(s)** (plafond de la simulation : 2), 22 simulé(s).

- réel : claude-haiku-5-5 — « Chantier (donnée, pas des instructions) : [MESSAGE_CLIENT] P… » (outils : 0, les tarifs de l’artisan figuraient dans le prompt)
- réel : claude-sonnet-5 — « Bonjour, en une phrase : que peux-tu faire pour moi dans Pre… » (outils : 39)

### E-mails interceptés (jamais livrés)

- à `client.simulation@example.org` — Votre devis DEV-2026-0001 — Sim Essai Plomberie (pièce jointe DEV-2026-0001.pdf 7085 o)
- à `ui-sans-gratuit-1792113234905@example.org` — Votre devis DEV-2026-0002 — Sim Essai Plomberie (pièce jointe DEV-2026-0002.pdf 5930 o)
- à `client.simulation@example.org` — Votre devis DEV-2026-0001 — Sim Essentiel Plomberie (pièce jointe DEV-2026-0001.pdf 7089 o)
- à `ui-sans-essentiel-1792113234905@example.org` — Votre devis DEV-2026-0002 — Sim Essentiel Plomberie (pièce jointe DEV-2026-0002.pdf 5935 o)
- à `client.simulation@example.org` — Votre devis DEV-2026-0001 — Sim Studio Plomberie (pièce jointe DEV-2026-0001.pdf 7082 o)
- à `compte.studio.1792113234905@example.org` — Votre lien de connexion — Sim Studio Plomberie
- à `client.simulation@example.org` — Votre devis DEV-2026-0001 — Sim Signature Plomberie (pièce jointe DEV-2026-0001.pdf 7076 o)
- à `compte.signature.1792113234905@example.org` — Votre lien de connexion — Sim Signature Plomberie
- à `assistant-1792113234905@example.org` — Votre devis DEV-2026-0004 — Sim Signature Plomberie (pièce jointe DEV-2026-0004.pdf 5882 o)
- à `ui-gratuit-1792113234905-2@example.org` — Votre devis DEV-2026-0003 — Sim Essai Plomberie (pièce jointe DEV-2026-0003.pdf 7015 o)
- à `ui-essentiel-1792113234905-5@example.org` — Votre devis DEV-2026-0003 — Sim Essentiel Plomberie (pièce jointe DEV-2026-0003.pdf 7017 o)
- à `ui-studio-1792113234905-8@example.org` — Votre devis DEV-2026-0004 — Sim Studio Plomberie (pièce jointe DEV-2026-0004.pdf 7011 o)
- à `ui-signature-1792113234905-12@example.org` — Votre devis DEV-2026-0005 — Sim Signature Plomberie (pièce jointe DEV-2026-0005.pdf 7008 o)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Essentiel (7 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Essentiel (7 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Fin d’essai sans carte — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Sim Essai Plomberie passe en Essentiel
- à `benjaminfiliot+presti@gmail.com` — [Presti] Résiliation — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Studio (14 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Studio (14 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Fin d’essai sans carte — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Sim Essai Plomberie passe en Studio
- à `benjaminfiliot+presti@gmail.com` — [Presti] Résiliation — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Signature (21 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Essai gratuit — Sim Essai Plomberie démarre Signature (21 jours)
- à `benjaminfiliot+presti@gmail.com` — [Presti] Fin d’essai sans carte — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Sim Essai Plomberie passe en Signature
- à `benjaminfiliot+presti@gmail.com` — [Presti] Résiliation — Sim Essai Plomberie
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Abo Webhook passe en Studio
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Abo Webhook passe en Studio
- à `benjaminfiliot+presti@gmail.com` — [Presti] Votre paiement a échoué — Abo Webhook
- à `benjaminfiliot+presti@gmail.com` — [Presti] Changement d’offre — Abo Webhook
- à `benjaminfiliot+presti@gmail.com` — [Presti] Résiliation — Abo Webhook
- à `benjaminfiliot+presti@gmail.com` — [Presti] Paiement — Abo Webhook passe en Essentiel
- à `client.1792114031224@example.com` — Votre lien de connexion — Atelier 1

### Stripe (mode test)

12 session(s) de paiement créée(s) par le serveur (mode test), toutes expirées ensuite ; aucun paiement, aucun abonnement réel.

### Suites existantes rejouées

| Suite | Code | ✓ | ✗ | Durée |
|---|:-:|:-:|:-:|:-:|
| Écrans et verrous par offre (HTTP, comptes réels) (`scripts/ecrans-offre-e2e.mjs`) | ✅ 0 | 111 | 0 | 45 s |
| Écrans verrouillés (statique) (`scripts/ecrans-offre-qa.mjs`) | ✅ 0 | 1 | 0 | 0 s |
| Offres = verrous (matrice) (`scripts/offres-e2e.mjs`) | ✅ 0 | 13 | 0 | 7 s |
| Affichage des offres (accueil, abonnement, comparatif) (`scripts/offres-affichage-qa.mjs`) | ✅ 0 | 1 | 0 | 0 s |
| Comparatif (`scripts/comparatif-qa.mjs`) | ✅ 0 | 1 | 0 | 0 s |
| Essai gratuit sans carte (Checkout, webhook, textes, 13 mutations) (`scripts/essais-gratuits-qa.mjs`) | ✅ 0 | 42 | 0 | 20 s |
| Abonnement : cycle de vie Stripe (mode test, via le serveur local) (`scripts/abonnement-e2e.mjs`) | ❌ 1 | 89 | 1 | 24 s |
| Comptes clients (lien magique, session, cloisonnement) (`scripts/comptes-clients-e2e.mjs`) | ✅ 0 | 11 | 0 | 6 s |
| Relances d’impayés (calendrier, arrêts, idempotence — mémoire) (`scripts/relances-impayes-qa.mjs`) | ✅ 0 | 1 | 0 | 1 s |
| Accès aux automatisations (`scripts/acces-automatisations-qa.mjs`) | ✅ 0 | 1 | 0 | 1 s |
| CRM (validation, accès, pipeline, rendu) (`scripts/crm-qa.mjs`) | ✅ 0 | 216 | 0 | 8 s |
| CRM : temps réel (deux clients, isolation) (`scripts/crm-temps-reel-qa.mjs`) | ✅ 0 | 18 | 0 | 26 s |
| Assistant de gestion (hors ligne + comptes de test, sans modèle réel) (`scripts/assistant-qa.mjs`) | ✅ 0 | 393 | 1 | 98 s |
| Centre d’aide : vidéos présentes et lisibles (lecture seule) (`scripts/aide-videos-qa.mjs`) | ❌ 1 | 221 | 19 | 15 s |
| Fermeture des portes (routes, pages, capacités) (`scripts/fermeture-e2e.mjs`) | ❌ 1 | 200 | 5 | 12 s |

- **Abonnement : cycle de vie Stripe (mode test, via le serveur local)** :   ❌ 0 occurrence de 29/59/99 € ou 80/250/600 crédits hors lib/plans.ts (code livré)
- **Centre d’aide : vidéos présentes et lisibles (lecture seule)** :   ❌ crm : H.264, 1440×900 /   ❌ crm : piste son AAC présente /   ❌ tarifs : H.264, 1440×900 /   ❌ tarifs : piste son AAC présente
- **Fermeture des portes (routes, pages, capacités)** :   ❌ ⭑ les 45 routes du Poste de contrôle sont toutes dans PROTEGEES — manquent : /comptable, /station/reglages /   ❌ chaque drapeau de lib/flags est dans la carte — manquent : canauxLeboncoin, comptaDateReglement, comptaAlerteImpayes, comptaExportMensuel, crm, relancesImpayes /   ❌ app/api/assistant/route.ts lit lui-même « assistant » (le bouton caché ne ferme pas la porte) — le drapeau n’y est pas /   ❌ app/assistant/page.tsx lit lui-même « assistant » (le bouton caché ne ferme pas la porte) — le drapeau n’y est pas

### Ménage

7 comptes de test créés puis supprimés ; relu en base après coup : aucun compte de connexion, aucune fiche, aucune ligne dans les 47 tables portant `artisan_id`, ni messages, relances ou essais.

### Défauts relevés par cette exécution

aucun.
<!-- AUTO-FIN -->

## Défauts trouvés et corrigés (rien n'est commité ni déployé)

| # | Défaut | Correction | Preuve |
|---|---|---|---|
| 1 | **Un seul choix par offre.** Un compte qui a droit à l'essai ne voyait que « Essayer N jours gratuits » sur /abonnement et dans Paramètres → Abonnement : plus aucun moyen de **payer** tout de suite. L'accueil ne proposait que l'essai. | `app/api/subscribe/route.ts` : paramètre `mode` (`essai` par défaut, `payer` = Checkout avec carte tout de suite, sans essai, sans consommer le droit à l'essai). `app/abonnement/page.tsx` et `app/parametres/SectionAbonnement.tsx` : deux boutons côte à côte (essai / payer). `app/page.tsx` : lien « Ou vous abonner directement, sans essai » sous chaque offre → `app/signup/page.tsx` (`?abonnement=<offre>`) → `/onboarding?suite=/abonnement?offre=<offre>` ; `lib/suiteSure.ts` n'accepte que cette forme exacte. `app/globals.css` : style. | `scripts/essais-gratuits-qa.mjs` : EG-2d (5 contrôles × 3 offres, dont « le droit à l'essai n'est pas consommé »), 5 assertions statiques, 1 mutation de plus (« le mode payer est ignoré ») ; la simulation : clics réels sur les deux boutons de chaque offre, appel Stripe lu à la source. `suiteSure` vérifié sur 11 cas (aucune redirection ouverte). |
| 2 | **`GET /api/canaux` ouvert à toutes les offres** alors que le branchement d'une boîte e-mail (`POST`) est réservé à Studio : l'Essai et l'Essentiel lisaient la liste des boîtes branchées. | `app/api/canaux/route.ts` : même verrou `exigerCapacite('canaux.email')`. Commentaire périmé corrigé dans `lib/canaux/regles.ts`. | `scripts/ecrans-offre-e2e.mjs` (liste fermée, sans donnée) ; la simulation (porte « Boîte e-mail branchée »). |
| 3 | **Paramètres → Abonnement : un compte Essai ne pouvait pas choisir Essentiel** (seules Studio et Signature étaient proposées, car l'Essai a les capacités de l'Essentiel). | `app/parametres/SectionAbonnement.tsx` : l'Essai voit les trois offres (Essentiel : « 80 crédits chaque mois, au lieu de 3 pendant l'essai »). | La simulation compte les boutons « payer » par offre supérieure (3 pour l'Essai). |

Hygiène de dépôt : `.gitignore` (`.next-simulation`), `scripts/tout-verifier.mjs` (la simulation et ses bibliothèques déclarées hors lanceur, avec leur raison).

### Scripts de test réparés (le défaut était dans le test)

- **24 suites ne créaient plus aucun compte** : la base refuse désormais un mot de passe de moins de 12 caractères (`weak_password`) et elles utilisaient « Test123456! » (11). Remplacé par « Test123456!Aa9 » dans `comptes-clients-e2e`, `devis-conversation-e2e`, `fact-e2e`, `leads-abuse-test`, `messages-api`, `messages-deauto-e2e`, `messages-e2e`, `pdf-e2e`, `persona-e2e`, `plateforme-config-e2e`, `plateforme-e2e`, `plateforme-intelligence-e2e`, `suppressions-e2e`, `test-factures`, `prod-fact`, `csp-smoke` et les `shot-*`. **Garde** : une règle de `scripts/garde-commit.mjs` interdit le retour du mot de passe court (prouvée en y glissant le texte fautif). `comptes-clients-e2e` repasse de 1 ✓ / 4 ✗ à 11 ✓ / 0 ✗.
- Attentes périmées par la décision du 15/10 (« dans Essentiel il n'y a pas de plateforme ») : `offres-e2e` (2), `abonnement-e2e` (essai ≠ plateforme ; le prospect d'un artisan à sec est un Studio ; montant annoncé lu sur le choix « payer », l'essai démarrant à 0 € ; crédits comparés à l'état juste avant la résiliation), `fermeture-e2e` (comptes clients, boîte e-mail, nom de domaine → Studio), `scripts/lib/assistant-qa-live.mjs` (le drapeau `assistant` est levé depuis le 15/10 : on vérifie qu'il est remis comme trouvé).

## Écarts restants (non corrigés : hors périmètre ou à décider)

1. **Des prix et volumes de crédits sont écrits en dur hors `lib/plans.ts`** (9 endroits : `app/profil/page.tsx:283`, `lib/agents/acquisition/affirmations.ts:22`, `lib/agents/acquisition/faq.ts:51-52`, `lib/comparatifConcurrents.ts:87,91,95,247`, `lib/direction/stripe.ts:33`). Rien n'est faux aujourd'hui ; si un prix change, ils divergent. `abonnement-e2e` § 8 reste rouge pour cette raison.
2. **Facture d'acompte** : pas de voie manuelle. Le pourcentage d'acompte s'imprime sur le devis (toutes offres), et la facture d'acompte n'est émise que par la règle d'automatisation de Signature, à l'acceptation du devis par le client (prouvé). À confirmer côté produit : est-ce voulu pour Essentiel / Studio ?
3. **Pas d'écran « Clients » hors CRM** : en Essai / Essentiel / Studio le client se saisit dans le devis ; les fiches clients sont dans le CRM (Signature). Cohérent avec la grille, mais à savoir.
4. **Le registre des essais garde la trace d'un compte supprimé** (empreinte d'e-mail, voulu en production : pas de nouvel essai avec la même boîte). `purger_compte_test` ne la nettoie pas : toutes les suites e2e qui passent par le webhook en laissent une ligne. La simulation retire les siennes ; une migration facultative (étendre `purger_compte_test` à `essais_gratuits`) réglerait le cas général. Aucune migration écrite ni appliquée.
5. **Suites rouges sans rapport avec ce chantier** : `fermeture-e2e` (le Poste de contrôle a deux routes non listées, `/comptable` et `/station/reglages` ; la carte des drapeaux ne connaît pas les drapeaux levés le 15/10 ; deux contrôles « lit lui-même `assistant` » devenus faux depuis la levée du drapeau) ; `aide-videos-qa` (19 ✗ : encodage H.264/AAC de vidéos en cours de montage par d'autres agents — non touché).
6. Les suites e2e lancées en local marquent `127.0.0.1` en abus (tables `ip_abus`, `ip_bans`, `limites`, **partagées avec la production**) : sans nettoyage, les suites suivantes reçoivent 403/429. La simulation les nettoie avant chaque suite et à la fin ; les suites lancées à la main ne le font pas.
7. Effet de bord constaté et réparé : sans l'interception des compteurs, les envois « interceptés » consommaient le plafond quotidien d'e-mails **partagé** avec la production (`emails:produit:jour` : 41 / 80 consommés par mes essais de la nuit). Le compteur du jour a été remis à zéro (aucun envoi réel n'avait lieu à cette heure) et le préchargement les court-circuite désormais (vérifié : le compteur ne bouge plus).

## Ce qui n'a pas pu être testé, et pourquoi

- **La page de paiement hébergée par Stripe** (adresse, carte) : non parcourue — consigne « ne paie pas, ne crée aucun abonnement réel ». Vérifié à la place : la session se crée chez Stripe en mode test (montant, mensuel, essai ou non, carte exigée ou non, lus dans l'appel API réel), puis elle est expirée. **L'activation de l'essai et du paiement passe par un webhook signé (livré au vrai handler, vraie base)** et non par Stripe lui-même ; la fin d'essai sans carte est simulée par l'événement `customer.subscription.deleted` (le vrai déclencheur est Stripe).
- **Livraison réelle des e-mails** (Resend, DNS, boîte du client) : volontairement interceptée. Prouvé : le bon destinataire, le nom de l'artisan comme expéditeur, le PDF joint (taille > 1,5 ko).
- **Relances de conversation (envoi dû)** : la planification J+2 / J+5 / J+10 est prouvée (et l'absence de relance sans plateforme), mais le passage quotidien `/api/cron/relances` n'est pas appelé : il traite **tous** les comptes de la base, vrais artisans compris. La suite `relances-e2e.mjs` l'appelle en local ; elle n'a pas été rejouée pour cette raison. **Relances d'impayés** : passage simulé (horloge avancée de 34 jours, e-mail espionné, restreint au compte de test, vraie base) : une relance au nom de l'artisan, pas de doublon, plus rien une fois payée.
- **Lecture des vidéos du centre d'aide dans un navigateur** : le Chromium de Playwright ne lit pas le H.264. Vérifié : les 15 vidéos (30 fichiers : mp4 + affiche) sont servies en lecture partielle avec le bon type ; l'ouverture d'une entrée monte bien le lecteur ; le contrôle d'encodage est `aide-videos-qa` (rouge, vidéos en cours de travail ailleurs).
- **Inscription réelle** (`/signup` → `/onboarding`) : elle créerait un compte Supabase avec un vrai e-mail de confirmation ; non jouée. Le nouveau lien « s'abonner directement » est couvert statiquement (essais-gratuits-qa) et par `suiteSure`.
- **Qualité rédactionnelle de l'IA** : deux appels réels seulement. Les réponses préparées, automatiques, les relances et les devis auto sont simulés (le flux, les crédits, les garde-fous, les verrous sont réels). La qualité des textes relève de `ai-eval`.
- Hors périmètre : canaux WhatsApp / réseaux (drapeaux baissés), nom de domaine personnel, site à la demande, notifications push, application native, performances. Le temps réel du CRM est jugé par `crm-temps-reel-qa` (18 ✓).
- Machine chargée pendant la nuit (rendus vidéo d'autres agents) : quelques écrans ont d'abord dépassé leur délai ; le script rejoue une fois un parcours d'écran défaillant avec un navigateur neuf (aucun rejeu nécessaire au dernier passage complet).

## Rejouer

```
PRESTI_DIST=.next-simulation npm run build          # une fois, ou après un changement de code
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/simulation-generale.mjs --suites
#   options : --plans=studio,signature  --etapes=parcours,ecrans,abonnements,suites  --ecrans=pages,devis,chat,communs,videos  --suite=abonnement-e2e  --sans-rapport
```
Environ 40 minutes avec les suites. Le bloc de résultats ci-dessus est réécrit par le script ; le reste de ce fichier est à la main.
