# Prospection en masse — maquette au niveau Lestraque et premier contact v2 (07/10/2026)

Accord de Benj pour la prospection en masse, à trois conditions : des maquettes du niveau de l'exemple de la vitrine (Lestraque) et cohérentes avec le métier ; le message « je me permets de vous contacter… je tente une approche différente en vous montrant d'avance le produit » ; les photos de l'artisan reprises, en le lui disant. Et : « fais gaffe à ta limite de crédit ».

## La maquette

- Rendu : `maquettes/rendu.mjs`, appelé par `public/sites-demo/generer.mjs --maquette=… --sortie=…` (l'interface de l'Atelier ne change pas). Le kit de Lestraque (kit.css, kit.js, familles recit, survol, telephone) et ses neuf scènes, dans le même ordre : héros plein cadre, plateau « à compléter avec vous », prestations, bande plein cadre, réalisations en travelling, zone, étapes monumentales, questions, contact avec formulaire de démonstration.
- Textes par métier : `maquettes/modeles/<métier>/contenu.json`, format version 2 (plombier, chauffagiste, électricien, menuisier, couvreur, maçon, peintre, carreleur, serrurier, isolation, paysagiste). Le métier écrit par la base (« électricien », « carrelage », « maçonnerie », « charpente »…) est ramené à son modèle par `ALIAS_METIER`.
- Photos : d'abord celles du site de l'artisan (`scripts/agents/atelier-photos.mjs` : robot poli du recenseur, robots.txt respecté, logos, icônes, petites images et images unies écartés, JPEG ré-encodé SANS métadonnées), montrées à lui seul en aperçu privé ; la maquette le dit (« photos reprises de votre site, à remplacer à votre convenance », en bas d'écran et au pied, avec le domaine). Sinon, les photos libres de la démo du métier, copiées octet pour octet et créditées (auteur, licence) ; jamais le portfolio du compte de démo. Le paysagiste n'a aucune photo libre cohérente : sa maquette n'est fabriquée que si son site en donne.
- Vidéo : `scripts/agents/maquette-video.mjs` filme la page écran par écran (540 px, 24 i/s, chaque écran posé puis glissé), sous 3 Mo.
- Juges : `scripts/maquette-qa.mjs` (MQ-1 à MQ-12) et `scripts/atelier-maquettes-qa.mjs` (AM-13 niveau par métier, AM-14 photos de l'artisan, AM-15 sabotages du rendu).

## Le premier contact v2

Gabarits dans `lib/agents/acquisition/gabaritsPremierContactV2.ts`, NON branchés et NON approuvés :

| id | lien | J3 aujourd'hui |
|---|---|---|
| `formulaire_A_v2_photos` | oui, celui de SA maquette | refusé : `lien_formulaire` (règle « jamais prestiapp.fr avant un oui ») |
| `formulaire_A_v2_illustrations` | oui | refusé : même raison |
| `formulaire_A_v2_sans_lien` | non, l'aperçu part sur demande | accepté par `jugerModele` |

Pour brancher, dans l'ordre :

1. Benj approuve le texte exact ; Claude Code le recopie dans `MODELES` (modeles.ts), l'ajoute à `APPROUVES` et à `.orchestre/preuves/026-083/approbation.txt` (empreinte), dans un commit à part.
2. Formes avec lien seulement : Benj lève la règle « jamais prestiapp.fr avant un oui » pour ce seul lien (contrat.ts `DOMAINE_PRINCIPAL` ; conformite.ts, codes `lien_formulaire` et `domaine_principal` : exactement un lien de forme `RE_LIEN_MAQUETTE`, celui de la maquette prête du prospect), et le lien de maquette est créé AVANT le premier contact (aujourd'hui après un « oui » : `app/api/usine/atelier/lien`, `maquettesLien.ts`, `liens_a_creer` = prospects « oui »).
3. `redacteur.ts` (`preparerUn`) choisit la forme d'après le rapport de la maquette (`rapport.json` → `photos_artisan`), à faire remonter avec le dépôt de l'Atelier ; la route `app/api/cron/redacteur` n'a pas à changer.

## Ce qui bloque l'envoi réel

- `envoi_froid` fermé (Benj seul l'ouvre).
- Boîte Gmail de prospection dédiée pas encore créée (adresse de réponse `{adresse}`).
- Second juge du Facteur : Codex en 401 sur l'usine pour `chef-modele`.
- Prospects importés de Vibe Prospecting (source `manuel`) : `SOURCES_LISTE` n'a pas de phrase pour `manuel`, J3 les refuse (`source_absente`) ; il faut une phrase de source vraie pour cette liste (ex. « Votre entreprise figure dans une base de données d'entreprises publiques (Vibe Prospecting). ») et une source distincte en base.
- Formes avec lien : points 1 et 2 ci-dessus. Forme sans lien : point 1 seulement.
