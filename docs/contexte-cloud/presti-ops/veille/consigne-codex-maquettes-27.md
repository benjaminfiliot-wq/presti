Tu travailles sur l'usine de Presti, dans ~/veille. Écris et réponds en français.

MISSION : préparer des maquettes de site pour les 30 MEILLEURS prospects de `prospection/liste-2026-09-27.csv`. Benj les appellera, puis enverra la maquette après l'appel. **Personne n'est contacté par toi.**

JUGE : `node juges/juge-maquettes-27.mjs` (déjà écrit, NE PAS le modifier). Lis-le d'abord, boucle jusqu'au PASS.

CHOIX DES 30 : seulement les entreprises dont `a_un_site` vaut `non` ou `inconnu`. Trie-les par `score_laya` décroissant et varie les métiers.

MODÈLES :
- Réutilise les modèles de Presti : `~/presti/maquettes/modeles/` (couvreur, électricien, menuisier, plombier ; lis-les d'abord).
- Pour un métier sans modèle (maçon, carreleur, peintre, chauffagiste, isolation, paysagiste), prends le modèle le plus proche. Réécris alors le titre, les services et les textes avec le vocabulaire EXACT du métier, sans rien inventer sur l'entreprise.

CONTENU :
- Chaque page affiche le vrai nom de l'entreprise, sa commune et son métier. Le téléphone professionnel publié est permis.
- Elle porte une petite mention visible « Maquette — exemple non contractuel ».
- **INTERDITS dans la page** :
  - avis, note ou étoiles ;
  - chiffres inventés (années d'expérience, nombre de chantiers) ;
  - photo d'une personne réelle ;
  - fausse certification.
  RGE est permis seulement si la liste le dit (source ADEME).
- Pas de police distante : le rendu doit marcher sans réseau.

SORTIES, dans `prospection/maquettes-2026-09-27/` :
1. Un dossier `NN-slug/` par entreprise. Chacun contient :
   - `index.html` ;
   - `capture-bureau.png` (1440 × 900) ;
   - `capture-telephone.png` (390 × 844).
   Capture avec le Chromium de Playwright, déjà installé pour `~/presti` (`~/presti/node_modules/playwright`). Sers les pages par un petit serveur local sur 127.0.0.1.
2. `manifeste.json` : un tableau de 30 objets avec les champs `n`, `dossier`, `siren`, `entreprise`, `metier`, `commune`, `modele`, `score_laya`.
3. `LISEZMOI.md` :
   - l'ordre d'appel conseillé, avec le téléphone de chaque entreprise ;
   - le modèle utilisé par métier ;
   - ce qui a été adapté ;
   - les limites.
4. Regarde toi-même au moins 5 captures (outil de lecture d'images). Vérifie que ni le texte ni la mise en page ne sont cassés, et note ce que tu as vu dans le LISEZMOI.

DONNÉES : ce sont des données d'entreprises. Elles ne partent vers AUCUNE IA gratuite ni vers aucun modèle `:cloud`. Toi seulement.

INTERDITS :
- écrire hors de `~/veille/prospection/maquettes-2026-09-27/` ;
- modifier `~/presti` ;
- publier ou mettre en ligne quoi que ce soit ;
- modifier le juge.
