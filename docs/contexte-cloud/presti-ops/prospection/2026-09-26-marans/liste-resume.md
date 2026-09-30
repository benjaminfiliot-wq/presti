# Prospection artisans RGE — autour de Marans (17230)
Liste construite le 2026-09-25 pour les appels du samedi 26/09 au soir.

## Sources (gratuites, publiques, citées)
- **ADEME — liste des entreprises RGE** (open data) : dataset `liste-des-entreprises-rge-2`, API `https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines` (filtre `qs=code_postal:XXXXX`). Page dataset : https://data.ademe.fr/datasets/liste-des-entreprises-rge-2
- **API Recherche d'entreprises** (data.gouv.fr / DINUM, gratuite) : `https://recherche-entreprises.api.gouv.fr/search?q=<SIRET>` — utilisée pour l'état administratif, la date de création et l'effectif. Doc : https://recherche-entreprises.api.gouv.fr/docs/

## Zone couverte (~35 km autour de Marans) — codes postaux utilisés
17230 (Marans, Andilly, Charron, Villedoux, Longèves, Saint-Ouen-d'Aunis), 17137 (Esnandes, Nieul-sur-Mer, Marsilly, L'Houmeau), 17540 (Nuaillé-d'Aunis), 17170 (Courçon, Saint-Jean-de-Liversay, Ferrières, La Ronde, Taugon), 17139 (Dompierre-sur-Mer), 17138 (Puilboreau, Saint-Xandre), 17180 (Périgny), 17000 (La Rochelle), 17140 (Lagord), 17440 (Aytré), 17700 (Surgères), 85450 (Chaillé-les-Marais), 85400 (Luçon), 85770 (L'Île-d'Elle).

## Méthode de filtrage
1. Téléchargement de toutes les lignes RGE pour ces 14 codes postaux (558 lignes brutes, une ligne = une qualification).
2. Filtre sur le domaine de qualification RGE, rattaché à un métier : plomberie-chauffage (chaudière bois/condensation, PAC, poêle, solaire thermique, VMC), électricité (photovoltaïque, radiateurs électriques), menuiserie (fenêtres/volets/portes), couverture (isolation toiture/terrasse), et isolation (proche, combles/murs/planchers) → 447 lignes.
3. Regroupement par SIRET (une entreprise peut avoir plusieurs qualifications) → 180 entreprises uniques, 179 avec un téléphone public.
4. Vérification de l'état administratif via l'API Recherche d'entreprises → 177 entreprises actives (2 fermées écartées).
5. Vérification du site web connu (champ `site_internet` de l'ADEME) par requête HTTP légère (une page, délai 10 s) : répond ou non, HTTPS, balise viewport, année de copyright, formulaire de contact.
   - **A = aucun site connu** (rien dans les sources ADEME/API) → meilleure cible : 45
   - **B = site connu mais problématique** (ne répond pas, pas de HTTPS, pas de balise viewport mobile, ou copyright ≤ 2021) : 70
   - **C = site correct** (répond, HTTPS, mobile, récent) → gardé en fin de liste : 62 au total, 5 retenues pour compléter la liste

⚠️ Limite honnête : le site web n'est vérifié que s'il est déclaré dans la fiche RGE de l'ADEME. Une entreprise classée A peut en réalité avoir un site non déclaré à l'ADEME — aucune recherche web individuelle par entreprise n'a été faite (uniquement des sources API structurées, sans passer les données de prospects à un moteur de recherche ou une IA).

## Liste finale retenue : 120 entreprises (visée 60–120, au moins 40 en A+B)

### Par priorité
- B : 70
- A : 45
- C : 5

### Par métier
- plomberie-chauffage : 65
- électricité : 32
- menuiserie : 26
- isolation : 25
- couverture : 4

### Par commune
- LA ROCHELLE : 13
- PERIGNY : 11
- LUCON : 10
- AYTRE : 9
- DOMPIERRE SUR MER : 8
- LAGORD : 4
- PUILBOREAU : 4
- SAINTE GEMME LA PLAINE : 4
- VERINES : 3
- VOUHE : 3
- SAINT XANDRE : 3
- ANGLIERS : 2
- DOMPIERRE-SUR-MER : 2
- L'HOUMEAU : 2
- SAINT SAUVEUR D'AUNIS : 2
- SURGERES : 2
- ANDILLY : 2
- LES MAGNILS REIGNIERS : 2
- SAINT SAUVEUR D AUNIS : 2
- BOUHET : 1
- CHAILLE LES MARAIS : 1
- CHASNAIS : 1
- L'ILE-D'ELLE : 1
- LAIROUX : 1
- LE GUE-DE-VELLUIRE : 1
- LES VELLUIRE-SUR-VENDEE : 1
- LUÇON : 1
- MARANS : 1
- MARSILLY : 1
- PUYRAVAULT : 1
- SAINT GEORGES DU BOIS : 1
- SAINT-CYR-DU-DORET : 1
- SAINT-JEAN-DE-LIVERSAY : 1
- SAINT-OUEN-D'AUNIS : 1
- SAINTE-GEMME-LA-PLAINE : 1
- VIX : 1
- BENON : 1
- CHAMPAGNE LES MARAIS : 1
- ESNANDES : 1
- FERRIERES : 1
- L HOUMEAU : 1
- LA LAIGNE : 1
- LA TAILLEE : 1
- LE GUE D'ALLERE : 1
- NIEUL SUR MER : 1
- NUAILLE D AUNIS : 1
- SAINT MARD : 1
- SAINT PIERRE D AMILLY : 1
- SAINT-SAUVEUR-D'AUNIS : 1
- VELLUIRE : 1
- VELLUIRE SUR VENDEE : 1

## Fichier
`liste.csv` — colonnes : priorite, entreprise, metier, commune, telephone, site, constat_site, siret, date_creation, effectif, source. Trié A puis B puis C.

## Rappel avant d'appeler
- Ce fichier reste en local, hors de tout dépôt Git, jamais commité.
- Aucun message n'a été envoyé à un prospect : la liste ne fait que préparer les appels de Benj.
