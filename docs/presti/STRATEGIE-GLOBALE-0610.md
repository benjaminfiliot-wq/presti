# Presti — stratégie globale (06/10/2026)

Ce document fixe des décisions. Les faits viennent du dépôt `presti` et du coffre `SaaS`, avec le fichier qui les porte.
Un chiffre qui n'a pas de source est écrit « à mesurer ». Aucun chiffre de marché n'est ajouté ici.

## 0. Point de départ

- **Le produit est complet, la vente est vide.** Le seul chiffre d'affaires jamais lu est « MRR 29 €, 1 artisan payant,
  3 essais » (07/09, `SaaS/Récap-Projet.md:114`). Aucun chiffre plus récent n'est écrit.
- **Le démarchage à froid du 09 au 16/09 n'a rien donné.** Environ 220 contacts et 0 intéressé (`SaaS/Decisions/Journal-Decisions.md:6`).
  Sur les 166 e-mails : 1 STOP, 5 rebonds, 0 intéressé (`SaaS/Prospection/emails-artisans/envois-2026-09-15.md`).
  Instagram : 12 contactés, 0 réponse. Facebook : 9 contactés, 1 réponse (`SaaS/Prospection/Lot-20x20-2026-09-14.md`).
- **Benj est seul et partage son temps avec l'e-commerce.** La stratégie doit donc être bon marché en heures. Les agents
  produisent, Benj décide et décroche le téléphone.

## 1. Cible : décidée

**Première cible : l'artisan du second œuvre qui travaille seul ou avec un ou deux compagnons, et qui reçoit déjà des demandes
par Internet.** Il les perd faute de répondre vite.

- **Métiers** : plombier-chauffagiste, électricien, menuisier, couvreur. Ce sont les quatre métiers que le recensement RGE
  sait déjà isoler (`lib/agents/acquisition/rge.ts:103-107`). Maçons, peintres et carreleurs viendront ensuite. Ils sont dans la
  cible large, 0 à 9 salariés (`docs/marketing/audience/README.md:7`), mais l'outil ne les isole pas encore.
- **Taille** : de 0 à 2 salariés. Au-delà, il y a souvent une secrétaire qui répond, et la promesse « le premier qui répond »
  porte moins. C'est une hypothèse à vérifier par les appels.
- **Zone** : Charente-Maritime, sud Vendée et Deux-Sèvres (17, 85, 79). C'est la zone déjà étudiée
  (`SaaS/Produit/Etude-Marche-Site-Vitrine-Artisans-2026-09-27.md:3`), et une zone resserrée permet le téléphone et les
  recommandations. On ne l'élargit qu'après 5 clients payants.
- **Signal d'achat** : un site ou une fiche Google qui reçoit des demandes. Le recensement retient les entreprises qui ont un site :
  37 819 SIRET (24/09, `SaaS/Produit/Ecosysteme-Prospection-Gratuite-2026-09-24.md:56`), dont 22 938 au site non vide (28/09,
  `docs/agents/mesure-a-sec-2026-09-28.md:10`). Ces volumes couvrent toute la France. **Le volume pour 17/85/79 est à mesurer.**

## 2. Problème payé

L'artisan ne paie pas pour « de l'IA ». **Il paie pour ne plus perdre un chantier parce qu'il a répondu trop tard, et pour ne plus
passer ses soirées sur ses devis et ses relances.**

Un seul chiffre est autorisé dans l'argumentaire (`SaaS/Prospection/Guide-Presti-Demarchage.md`) : 7 × plus de chances d'un vrai
échange quand on répond dans l'heure (Harvard Business Review, 2 241 entreprises, déjà sur la landing).

## 3. Offre et prix : on ne touche pas à la grille

La grille actuelle reste en place (`lib/plans.ts:56-64`, prix mensuels, franchise en base, art. 293 B) :

| Offre | Prix | Crédits | Rôle dans la vente |
|---|---|---|---|
| Essai | 0 € | 3 | sans carte : il juge la qualité sur ses vraies demandes |
| Essentiel | 29 €/mois | 80 | l'offre d'entrée, celle qu'on vend au téléphone |
| Studio | 59 €/mois | 250 | l'assistant répond seul, jour et nuit (`plateforme.ia.auto`) : la montée naturelle |
| Signature | 99 €/mois | 600 | ancre de prix, presque jamais vendue au départ |
| Site à la demande | 300 € une fois | — | produit d'appel, livré sous 48 h (`lib/siteCommande.ts`) |

Décisions :

1. **Pas de baisse de prix ni de tarif annuel ce mois-ci.** Le problème n'est pas le prix : le froid n'a obtenu aucune réponse, il
   n'a donc pas pu être refusé sur le prix. On change de prix seulement si 3 appels sur 10 butent sur lui (à mesurer).
2. **Le site à 300 € sert de porte d'entrée.** Le produit est concret, l'achat est unique et l'artisan comprend tout de suite ce
   qu'il obtient. L'étude du 27/09 signale un seul risque : « trop bas pour être honnête ». On y répond par la transparence
   (domaine à son nom, aucune location) plutôt que par le prix.
3. **L'essai à 3 crédits est court.** On le garde, mais on mesure combien d'essais consomment leurs 3 crédits. Si moins de la
   moitié le font, le frein vient de l'activation, pas de l'offre (à mesurer, voir §7).

## 4. Acquisition : gratuite d'abord, dans cet ordre

1. **Le téléphone, avec Benj, 10 appels par semaine sur la cible du §1.** C'est le seul canal qui a déjà obtenu une réponse
   humaine. Le recensement fournit la liste : `lib/agents/acquisition/`, croisement RGE/ADEME et SIRENE. Au téléphone, on vend
   l'essai ou le site à 300 €, pas l'abonnement. Chaque objection entendue est notée dans `SaaS/Prospection/`. Le coffre ne porte
   encore aucun résultat d'appel (`SaaS/Récap-Projet.md:107`).
2. **La vitrine comme destination unique.** Chaque canal envoie vers prestiapp.fr avec une campagne déclarée dans
   `lib/audience.ts`, sans cookie (`docs/marketing/audience/README.md`). Une visite sans campagne ne nous apprend rien.
3. **Le contenu organique**, déjà outillé (TikTok, Instagram @prestiapp, Page Facebook, LinkedIn de Benj ;
   `docs/marketing/plateformes/README.md`). Il passe en mode « preuve » : une démo de 20 secondes du vrai produit par publication,
   pas de discours. Ces publications coûtent des heures d'agent, pas d'argent.
4. **L'envoi à froid automatique reste fermé.** L'interrupteur `envoi_froid` (`ops.interrupteurs`, semé fermé par
   `supabase/migrations/0096_ops_socle.sql`, garde dans `lib/agents/acquisition/disjoncteurs.ts`) ne s'ouvre que par un geste de
   Benj (`acq_envoi_froid_ouvrir`), au palier P0, soit 5 par jour (`lib/agents/acquisition/contrat.ts:803-809`). **Condition
   d'ouverture recommandée** : la vitrine refaite en ligne (vague 1 faite ce soir) et au moins 10 appels notés, pour que le
   message écrit reprenne les mots entendus au téléphone. La mesure à sec de septembre ne trouve que 12,2 % de formulaires
   éligibles (`docs/agents/mesure-a-sec-2026-09-28.md:4-5`) : c'est un canal d'appoint.
5. **Payant : pas avant 3 clients payants.** Le pack pub UGC à 490 € (`docs/RENDU-05-10-ECOM-PUB-META-PRESTI.md:9`) attend qu'on
   sache quel message convertit.

## 5. La vitrine

- **Rôle** : transformer en essai la visite qu'amène un appel ou une publication. Elle ne convainc pas seule un inconnu.
- **Ordre de la page** (décidé, en place depuis ce soir) :
  1. la promesse, d'où viennent les demandes, et le prix d'appel dès le haut ;
  2. la démo du vrai produit (5 scènes) et le site Lestraque ;
  3. le tableau de bord « Vos chiffres » ;
  4. la confiance ;
  5. les prix d'abord, le détail des crédits ensuite, le comparatif replié ;
  6. les questions ;
  7. l'appel final.
- **Interdits** : un témoignage inventé, un compteur de clients, un chiffre non sourcé. Tant qu'il n'y a pas de client à citer, la
  preuve est le produit lui-même, montré tel quel.
- Le plan de refonte détaillé est dans `docs/refonte/PLAN-REFONTE-0610.md`.

## 6. Les 5 chantiers produit qui pèsent le plus sur la conversion

Classés par effet attendu sur « visite → essai → payant » :

1. **Un formulaire d'entrée sur la vitrine** (`prospectsEntrant`, drapeau baissé : `lib/flags.ts:117`). Aujourd'hui, un artisan
   intéressé qui ne veut pas créer de compte n'a aucun moyen de laisser son numéro. Le brief du 05/10 l'exige
   (`docs/refonte/BRIEF-REFONTE-0510.md`, point 3).
2. **L'activation de l'essai : la première demande en moins de 10 minutes.** Après l'inscription, l'artisan doit coller son lien et
   voir une vraie réponse préparée. Si la boîte reste vide, l'essai meurt. On mesure d'abord le temps entre l'inscription et le
   premier crédit consommé (à mesurer), puis on corrige l'écran d'accueil.
3. **Le type de chantier et la ville remplis automatiquement.** Seuls 6 leads sur 88 ont un `type_chantier`, et la table `clients`
   est vide (`docs/produit/tableau-de-bord-artisan.md`, « Limites »). Le tableau de bord « Vos chiffres », montré sur la vitrine,
   est donc à moitié vide chez un vrai artisan. C'est la promesse de la vitrine qui doit devenir vraie chez lui.
4. **L'acompte en ligne au moment où le devis est accepté.** Le Récap le place parmi les chantiers nommés. C'est l'argument
   « l'argent rentre plus vite », celui qu'un artisan comprend sans explication.
5. **La relance de l'essai expiré**, par e-mail à J+3 et J+7 : « il vous reste N crédits », ou « vos 3 crédits sont utilisés, voici
   ce qu'ils ont produit ». Elle s'appuie sur le moteur de relances existant (`lib/relances.ts`).

## 7. Les chiffres à suivre chaque semaine (le lundi, dans `/controle`)

| # | Chiffre | Où on le lit | Cible de départ |
|---|---|---|---|
| 1 | Appels passés / conversations utiles / essais obtenus | note dans `SaaS/Prospection/` | 10 / 3 / 1 par semaine (hypothèse) |
| 2 | Visites de la vitrine, par campagne | onglet Visiteurs de `/controle` (`lib/audience.ts`) | à mesurer (pas de référence) |
| 3 | Inscriptions à l'essai | `/controle`, Clients & abonnements | à mesurer |
| 4 | Essais activés (au moins 1 crédit consommé sous 7 jours) | `/controle` | plus de la moitié des inscrits |
| 5 | Essais devenus payants | `/controle`, Stripe | à mesurer |
| 6 | MRR et nombre d'artisans payants | `/controle`, Comptabilité | 5 payants avant d'élargir la zone |
| 7 | Sites à 300 € vendus | `/controle` | à mesurer |
| 8 | Résiliations | Stripe | à mesurer |

**Règle** : on ne change qu'une chose à la fois, et pendant une semaine. Si l'essai convertit mal, on regarde d'abord le chiffre 4
(activation), avant de toucher au prix.

## 8. Ce qui reste à Benj

- Passer les 10 appels de la semaine et noter les objections : c'est la seule matière qui manque.
- Décider d'ouvrir l'interrupteur `envoi_froid`, aux conditions du §4.4.
- Approuver ou corriger la cible du §1. La zone 17/85/79 et la tranche 0-2 salariés sont des choix, pas des faits.
