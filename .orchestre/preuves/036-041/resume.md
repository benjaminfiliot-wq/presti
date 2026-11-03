# 036-041 — Passe de design du tableau de bord (« Dashboard V14 — Modern & Minimal UI »)

## Avant
Captures de référence issues de `.orchestre/preuves/036-039/1440.png` et `390.png` (copiées en `1440-avant.png` et `390-avant.png`) :
- Huit cartes sombres d’égale hauteur, sans hiérarchie ni relief.
- Chiffres petits, au même poids visuel que leurs libellés.
- Sources affichées en clair sous chaque titre avec une date ISO brute (`2026-11-03T12:00:00.000Z`).
- Absence du graphique des encaissements sur 12 mois, des 5 listes opérationnelles, de la navigation en pastilles, du rail d’icônes et de la carte maîtresse en dégradé corail.

## Après, bloc par bloc
- **Direction artistique (référence « Dashboard V14 — Modern & Minimal UI »)** :
  - Plateau clair, minimal et haut de gamme (`#F4F5F8`), cartes blanches (`#FFFFFF`) à coins arrondis (`16px`), bordures subtiles et ombres douces.
  - **Barre haute en pastilles** : médaillon corail « Pilotage », navigation centrale en pastilles avec onglet actif en pastille sombre (`#14161B`), pastille d’état en direct (« Mis à jour il y a … ») et bouton d’actualisation.
  - **Barre d’icônes fine à gauche** : rail vertical blanc avec icônes SVG en ligne vers Tableau de bord, Devis, Factures, Clients & chantiers, Stock & tarifs, Mes chiffres et Paramètres (replié en barre horizontale compacte sous 720 px).
  - **Soulèvement au survol** : `translateY(-5px)` avec transition douce (`cubic-bezier(.16,1,.3,1)`), intégralement coupé par `prefers-reduced-motion: reduce`.
- **Bande des 5 chiffres clés (`Bande`)** :
  - **Carte maîtresse en dégradé corail (`#D97757` → `#E8946F`)** pour **Encaissé ce mois**, valeur très grande et grasse en `JetBrains Mono`, repère de l’an passé et évolution avec flèche SVG.
  - Quatre cartes blanches (**À encaisser**, **Impayés en retard** en `--tdb-crit`, **Demandes neuves**, **À valider** en `--tdb-warn`) avec titre en petit, icône SVG dédiée, valeur en très grand et évolution en vert avec flèche `↗` (ou `↘` si baisse) **uniquement lorsque la donnée du mois précédent existe** (`null` sinon).
- **Graphique de l’argent sur 12 mois (`Graphique`)** :
  - SVG écrit à la main (`role="img"`, `aria-label="Encaissements par mois sur douze mois"`), sans dépendance externe.
  - Douze barres mensuelles avec piste claire, mois courant en corail `#D97757` et infobulle `<title>` donnant le montant exact en euros au survol et au focus clavier.
- **Cinq listes utiles (`Liste`, 5 lignes max chacune)** :
  - **Prochains rendez-vous** (`/crm`), **Devis envoyés sans réponse** (`/devis/<id>` et `/devis`), **Factures en retard** avec montant et jours de retard en `--tdb-crit` (`/factures/<id>` et `/factures`), **Meilleurs clients** par chiffre en `--tdb-ok` (`/crm`), **Articles sous le seuil** en `--tdb-warn` (`/inventaire`).
- **Sources au survol (`Source`)** :
  - Icône `ⓘ` accessible au clavier (`tabIndex={0}`) avec `title` et infobulle en date française (« Source : … lu le 3 novembre à 13 h »), jamais affichée en clair dans le flux.
- **Vue détaillée (`Section`)** :
  - Les blocs métier complets (`Aujourd’hui`, `Devis et factures`, `Clients`, `Chantiers et agenda`, `Stock et tarifs`, `Relances`, `Assistants et crédits`) avec leurs états vides explicites.

## Vérification et preuves
- `node scripts/tableau-de-bord-qa.mjs` : **PASS** (41 critères `TB-1` à `TB-18` + juge `lib/tableau/qa.mjs` et ses 8 mutants `service_role`, `sans_source`, `euros_flottants`, `sans_etat_vide`, `drapeau_baisse_visible`, `autre_artisan`, `sans_graphique`, `sans_listes`).
- Captures sur données fictives « Exemple » vérifiées visuellement : `1440-avant.png`, `1440-apres.png`, `390-avant.png`, `390-apres.png` (zéro débordement horizontal à 1440 px et 390 px).
