# Prospection des artisans : le cadre légal (27/09/2026)

Recherche faite par Perplexity Computer le 27/09/2026, avec les sources officielles citées. Ce document s'impose aux agents de prospection de l'écosystème, en particulier aux fiches d'acquisition de la série 026.

## En bref

- **Aucun délai légal avant le premier contact.** Le « 12/10 » de l'INDEX 026 est une date de planning, pas une obligation. Seule obligation de temps : informer la personne **au plus tard au premier contact, et au plus un mois après la collecte**.
- **Contacter un artisan pour son métier se fait en « opt-out ».** Pas de consentement préalable, par téléphone, SMS, mail ou formulaire, à trois conditions :
  - l'offre a un lien avec son activité ;
  - il est informé ;
  - il peut refuser simplement et gratuitement.
- **Les entrepreneurs individuels sont des personnes physiques.** Leurs coordonnées, même `contact@`, sont des données personnelles : le RGPD s'applique en entier. Il faut respecter les fiches marquées « non diffusibles » dans l'Annuaire des entreprises.

## Par canal

| Canal | Autorisé ? | Conditions | Source |
|---|---|---|---|
| Mail générique d'une SARL ou EURL | Oui, sans consentement | Identité, moyen de refus | [CNIL](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel) |
| Mail nominatif, ou mail d'un EI | Oui, en opt-out | Lien avec le métier, information, refus possible | [CNIL 2024](https://www.cnil.fr/sites/cnil/files/2024-06/recommandations_reutilisateurs_de_donnees_publiees_sur_internet.pdf) |
| Formulaire de contact du site | Oui, traité comme un mail par prudence | **Envoi manuel, un par un**, et respect d'un « pas de sollicitation » affiché. Un robot qui remplit des formulaires serait vu comme du spam | [L34-5 CPCE](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961/) |
| Téléphone vers un numéro professionnel | Oui. L'opt-in de la loi 2025-594 (Bloctel fermé le 11/08/2026) ne vise que les consommateurs | Donner son identité à chaque appel, informer, accepter un refus | [CNIL](https://www.cnil.fr/fr/prospection-commerciale-par-telephone-hors-automate-dappel-quelles-sont-les-regles) |
| SMS | Oui, en opt-out | Lien avec le métier, « STOP » | [CNIL](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel) |
| Fichier tiré de sources publiques (Recherche d'entreprises, liste RGE) | Oui, sur la base de l'intérêt légitime | Données limitées, pas de profilage, information dans le mois, liste des refus, conservation 3 ans | [CNIL](https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des) |

## Mentions obligatoires dans chaque message (mail, SMS, formulaire)

- L'identité : nom suivi de « EI », SIREN, adresse ([Service-public](https://entreprendre.service-public.gouv.fr/vosdroits/F36008)).
- Un objet qui correspond à l'offre.
- Un moyen gratuit de refuser : « STOP » pour un SMS, un lien de désinscription pour un mail ([L34-5](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961/), [LCEN art. 20](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000018048180)).
- **La source des données** : par exemple « vos coordonnées professionnelles publiques, Annuaire des entreprises ».

## La vente elle-même

Un artisan de **5 salariés ou moins** qui signe hors établissement ou à distance, pour un contrat hors de son activité principale, bénéficie des protections du consommateur. Il a notamment **14 jours de rétractation** ([L221-3 C. conso](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226882)). La commande du site à 300 € doit donc l'informer du droit de rétractation et fournir le formulaire type.

## Délivrabilité (bonnes pratiques, pas des obligations)

- Gmail exige SPF ou DKIM pour tout expéditeur. Au-delà de 5 000 envois par jour, il faut SPF, DKIM et DMARC, plus une désinscription en un clic.
- Le taux de plaintes doit rester sous 0,1 %, et ne jamais atteindre 0,3 % ([Google](https://support.google.com/mail/answer/81126?hl=fr)).
- Un compte gmail.com est limité à 500 envois par jour.
- Monter en charge progressivement reste une bonne pratique.

## Conséquences pour Presti

1. Le premier contact peut partir **dès que les mentions obligatoires sont prêtes**. Il manque aujourd'hui le SIREN et l'adresse de Benj : le statut EI et l'immatriculation sont à confirmer.
2. Tant que Benj valide chaque envoi (R24), la voie la plus sûre est l'appel, suivi d'un SMS ou d'un mail avec la maquette.
3. Les fiches d'acquisition de la 026 qui prévoient des formulaires remplis par un agent doivent passer en « l'agent prépare, un humain soumet ». Sinon, il faut une analyse de risque écrite avant toute automatisation.
4. La commande du site doit mentionner les 14 jours de rétractation pour les petites entreprises.
