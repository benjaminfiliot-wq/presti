Tu travailles sur l'usine de Presti, dans ~/veille. Écris en français.

TROISIÈME PASSE des 10 sites de référence de `prospection/sites-reference/`. Garde ce qui est juste :
- les entreprises, leurs téléphones sourcés, leurs liens-reseaux.json ;
- les photos sous licence avec leurs crédits, les communes voisines ;
- la DA du métier, les polices du kit et kit.js.

Deux relecteurs indépendants ont jugé la seconde passe : **propre, mais nettement en dessous de Lestraque**. Benj vise le haut de la barre, pas un bon modèle. **Personne n'est contacté, rien n'est publié.**

JUGE : `node juges/juge-sites-reference-v3.mjs` (déjà écrit, NE PAS le modifier). Il relance la v2, puis MESURE chaque site dans Chromium. Lis-le en entier d'abord, surtout le contrat de balisage de son en-tête. Boucle jusqu'au PASS.

CE QUE LES RELECTEURS ONT VU, à corriger dans `_generateur/`, puis régénérer (jamais de retouche à la main d'une page) :
1. **Même gabarit partout.** 02, 06 et 07 sont identiques au nom près, 03 et 05 aussi. Chaque site doit être écrit pour SON artisan : son métier, sa commune et ses communes voisines, un titre et un texte d'atelier propres.
2. **Structure de Lestraque exigée sur l'accueil.** Regarde `~/presti/public/sites-demo/lestraque/index.html` et reprends-en l'ordre :
   - héros photo avec un titre COURT ;
   - citation ;
   - `#prestations` : au moins 6, chacune `[data-role="prestation"]` ;
   - `#atelier` ;
   - `#realisations` : au moins 5 photos, en galerie ou en carrousel ;
   - `#communes` ;
   - `#etapes` : au moins 3, chacune `[data-role="etape"]` ;
   - `#questions` : au moins 4, en `details` ;
   - `#contact` avec le lien tel:.
3. **Le titre du héros chasse le bouton sous le pli** (100 à 115 px sur 4 à 7 lignes). Titre court, comme « Fait pour rester » chez Lestraque. La commune va dans le surtitre. Plafonne la taille du titre. Au 1440 × 900, le bas du bouton `[data-role="cta-hero"]` reste à 860 px au plus, sur l'accueil ET sur chaque page de commune.
4. **Contrastes :**
   - Elec'Technic met du blanc sur le jaune #E8B93B (1,84:1) : sur le jaune, texte foncé ;
   - en DA sombre, ne peins pas l'en-tête des pages intérieures ni le pied avec l'encre claire ;
   - surtitres `[data-role="kicker"]` sur fond sombre : version éclaircie de l'accent ;
   - boutons blancs sur l'accent des menuisiers (#A9743F, 3,99:1) et du maçon (#8A8177, 3,83:1) : foncer le fond ou le texte ;
   - tout bouton porte `[data-role="cta"]`, et le juge exige 4,5:1 (3:1 au-delà de 24 px).
5. **Menanteau (héros « aplat ») :** le bouton a le fond du héros et n'a plus de forme. Donne-lui un fond blanc et le texte à l'accent.
6. **En double-clic (file://), la navigation mène à des listes de dossiers.** Écris des liens explicites `…/index.html`, comme Lestraque. Retire `crossorigin` du preload des polices.
7. **Français :** « Carrelage à Les Magnils-Reigniers » → « aux Magnils-Reigniers » ; « de Établissements Videau et Fils » → « des Établissements… » ; « de Elec'Technic » → « d'Elec'Technic ». Gère à + le/les et de + le/les, et l'élision devant une voyelle, dans le générateur. « à La Rochelle » est juste.
8. **Le texte parle de la maquette, pas de l'artisan.** Le bandeau `[data-role="bandeau-maquette"]` « Maquette — exemple non contractuel » suffit, sur chaque page. Ni le héros ni la FAQ ne parlent de maquette, de proposition, ni de « à préciser ». La FAQ répond aux questions d'un CLIENT de l'artisan sur son métier (comment se passe une demande, ce qu'il faut préparer…), de façon générale. RIEN sur l'entreprise elle-même : pas de délai, de prix, de garantie, de certification, d'ancienneté, d'avis ni de chiffre. La liste dit RGE ou « depuis 1956 » pour certaines : ne le mets pas.
9. **Nettoyage :**
   - retire `amorce-generateur/` et `maquette-amorce.json` des dossiers : ce sont tes brouillons, site/ les remplace ;
   - pour 07 (M.C.I), `source_telephone` devient l'URL publique ADEME `https://data.ademe.fr/data-fair/api/v1/datasets/6x4i1u8yqh1sfhis83l1gw6f/lines?siret_eq=40533605800012` ;
   - les mentions disent : « Images redimensionnées et converties pour le web par Presti ; adaptations diffusées sous la même licence que l'original pour les CC BY-SA ».
10. **Captures** `capture-bureau.png` (1440 × 900) et `capture-telephone.png` (390 × 844) refaites après régénération, polices chargées. Mets à jour le LISEZMOI (ce qui change dans cette passe ; l'ordre d'appel et les liens restent).

DONNÉES : données d'entreprises. Elles ne partent vers AUCUNE IA gratuite ni vers aucun modèle `:cloud`. Aucune recherche Firecrawl.

INTERDITS : écrire hors de `~/veille/prospection/sites-reference/` ; modifier `~/presti` ; publier ; modifier les juges.
