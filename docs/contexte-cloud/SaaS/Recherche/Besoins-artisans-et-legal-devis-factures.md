# Recherche — Besoins artisans + cadre légal (devis & factures)

> Recherche menée le 2026-08-14 (web ; Perplexity Computer = hors crédits). Base pour l'[[Architecture-v2-Devis-Factures-SiteClient]]. À affiner (Perplexity dès crédits, + avis forums).

## 1. LÉGAL — Devis bâtiment (mentions obligatoires)
- **Devis obligatoire dès 150 € TTC** de travaux (bâtiment). En-dessous : recommandé.
- **~12 mentions obligatoires** :
  - Identité : nom/dénomination, **forme juridique**, **SIREN/SIRET**, adresse du siège.
  - Date d'émission + **durée de validité** (pas de durée légale imposée ; usage **3 mois** ; À INDIQUER, sinon le client peut accepter au prix initial des mois plus tard).
  - **Désignation détaillée** des prestations/produits, **quantités**, **unités**, **prix unitaires HT**.
  - **Taux et montant de TVA** par ligne, **total HT** et **total TTC** distincts.
  - Conditions et modalités de **paiement** (acompte, échéances).
  - **Frais de déplacement** le cas échéant, caractère **gratuit ou payant** du devis.
  - Mention **« Devis reçu avant l'exécution des travaux »** (datée + signée à l'acceptation).
- **Assurance (bloc décennale)** — loi n° 2014-626 (18/06/2014) : sur CHAQUE devis ET facture, quand l'assurance est obligatoire pour le métier (bâtiment = oui), mention **« Assurance professionnelle »** + 6 infos : **nom de l'assureur, adresse, n° de contrat/police, activités garanties, zone géographique couverte**. Concerne aussi les **micro-entreprises** au Répertoire des Métiers.
- **Sanctions DGCCRF** : jusqu'à **3 000 €** (entrepreneur individuel) / **15 000 €** (société) par infraction.

## 2. LÉGAL — Facture
- **Numéro unique**, **séquence chronologique continue** : sans trou, sans doublon, sans retour arrière (traçabilité en cas de contrôle).
- Mentions : date, identité + adresse **vendeur ET acheteur**, **SIRET**, (n° TVA intracom si concerné), désignation, quantité, **PU HT**, **taux de TVA par ligne**, **totaux par taux**, **total HT / TVA / TTC**, **date/délai de paiement**, **taux des pénalités de retard**, **indemnité forfaitaire de recouvrement 40 €** (entre pros).
- **Franchise de TVA** : mention **« TVA non applicable, article 293 B du CGI »** — ⚠️ **à partir du 1er sept 2026**, remplacée par **« TVA non applicable, art. L. 223 et s. du code des impositions sur les biens et services (CIBS) »**. L'ancienne réf. 293 B reste tolérée **jusqu'au 31/12/2027**. → Presti doit basculer sur la mention **CIBS**.

## 3. LÉGAL — Facturation électronique (réforme)
- **1er sept 2026** : **RÉCEPTION** obligatoire pour **TOUTES** les entreprises assujetties (micro incluses) ; **émission** pour grandes entreprises + ETI.
- **1er sept 2027** : **ÉMISSION** obligatoire pour **TPE, micro-entreprises, indépendants** (y compris non-redevables / franchise TVA).
- **Formats** (norme EN 16931) : **Factur-X** (PDF/A-3 + XML embarqué), **UBL 2.1**, **CII**.
- Transmission via **PDP** (plateformes de dématérialisation partenaires agréées) ; **PPF** = annuaire/portail public.
- **Implication Presti** : concevoir « e-invoicing ready » dès maintenant (données structurées propres, n° SIRET client, format PDF/A) et prévoir génération **Factur-X + connexion PDP** d'ici mi-2027. Pas bloquant pour la V1 (PDF conforme), mais l'architecture doit le permettre.

## 4. LÉGAL — TVA dans le bâtiment
- **20 %** : taux normal (neuf, hors conditions réduites).
- **10 %** : travaux d'amélioration/transformation/entretien d'un **logement achevé depuis + de 2 ans**.
- **5,5 %** : travaux de **rénovation énergétique** (isolation, chauffage performant…).
- **Attestation de TVA réduite** (client) requise pour 10 % et 5,5 %. → Presti : proposer le **taux par ligne** (défaut intelligent selon contexte) + générer l'attestation plus tard.

## 5. MARCHÉ / CONCURRENCE
| Outil | Prix | Forces | Manques |
|---|---|---|---|
| **Tolteck** | ~19-25 €/mois | Simple, rapide, **offline**, gestion articles + **calcul de marge temps réel**, fort sur le **chiffrage** | Peu d'IA, écosystème limité |
| **Obat** | ~50 €/mois | All-in-one BTP, **sync bancaire**, **relances impayés**, factures de situation | **Dense/complexe**, cher, courbe d'apprentissage |
| **Henrri** | Gratuit | Facturation en ligne illimitée | **Pas spécialisé BTP** (pas de bibliothèque d'ouvrages, pas de situations), pas d'offline |

**Le trou de marché (positionnement Presti)** : *aussi simple que Tolteck, mais **intelligent** (l'IA chiffre le devis à partir d'une simple description du chantier), moins cher/plus léger qu'Obat, et connecté à la génération de leads (réponse auto).* L'IA générative est le vrai différenciateur — aucun ne la propose vraiment.

## 6. Ce qui ferait un devis/facture « digne d'Anthropic »
- **Génération IA depuis une description** du chantier → lignes + quantités + unités + PU proposés, éditables.
- **Bibliothèque de prix par métier** (fourchettes) qui apprend/s'ajuste → chiffrage assisté.
- **Adaptabilité par métier** (postes & unités types) = le « hors norme » demandé.
- **Conformité automatique** (toutes mentions légales gérées pour l'artisan — il ne peut pas se tromper).
- **Devis → facture en 1 clic**, numérotation continue gérée, relances.
- **PDF pro** irréprochable + « e-invoicing ready ».

## Sources
- [Devis obligatoire artisan 2026 (acompli.fr)](https://acompli.fr/blog-devis-obligatoire-artisan.html) · [Mentions devis (manay.fr)](https://www.manay.fr/blog/artisan/mentions-obligatoires-devis/) · [Décennale sur devis (orus.eu)](https://www.orus.eu/blog-orus/garantie-decennale-devis) · [CAPEB — assurance obligatoire](https://www.capeb.fr/actualites/nouvelle-mention-obligatoire-sur-les-devis-et-les-factures-l-assurance-professionnelle)
- [Mentions facture micro (legalplace.fr)](https://www.legalplace.fr/guides/mentions-obligatoires-facture-auto-entrepreneur/) · [Mention 293 B → CIBS 2026 (kohenavocats.fr)](https://kohenavocats.fr/2026/07/08/mention-tva-293b-cibs-facture-micro-entreprise-2026/) · [Facture micro (portail-autoentrepreneur.fr)](https://www.portail-autoentrepreneur.fr/academie/gestion-auto-entreprise/facturation/mentions-obligatoires-facture)
- [Calendrier facture électronique (cegid.com)](https://www.cegid.com/fr/facture-electronique-obligatoire/calendrier-facture-electronique/) · [Facture élec. auto-entrepreneur (portail-autoentrepreneur.fr)](https://www.portail-autoentrepreneur.fr/academie/gestion-auto-entreprise/facturation/facture-electronique-obligatoire)
- [Avis Tolteck (outilios.fr)](https://outilios.fr/avis-tolteck/) · [Comparatif logiciels artisans (tiime.fr)](https://blog.tiime.fr/top-10-meilleurs-logiciels-de-devis-et-facturation-artisans) · [Comparatif (artisansmart.fr)](https://artisansmart.fr/blog/comparatif-logiciel-artisan-2026/)
