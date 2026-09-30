# Le cerveau site v2 — les sites de démonstration (2026-09-14)

**Ce que c'est.** Neuf sites de démonstration d'artisan (plombier, électricien, chauffagiste, maçon, menuisier, peintre, carreleur, couvreur, serrurier) dans `public/sites-demo/`, rendus par un générateur déterministe et un kit d'animation, sans modèle de langage. Ils servent aux appels aux artisans que Benj a commencés le 2026-09-14. La v1 avait été produite par des agents ([[Antigravity]]) ; la v2 est rendue par `generer.mjs`, sans agent ni quota. Boussole : [[Récap-Projet]].

## Pourquoi la v1 a sauté

Les neuf démos v1, livrées par les agents dans la nuit du 13 au 14/09 et au petit matin (par vagues à 1 h 25, 3 h 01 et 6 h 24 ; le chauffagiste, dernier, vert à 7 h 45), étaient vertes au juge `scripts/site-qa.mjs` et propres. Benj, après ses premiers appels, les a jugées « très nulles, pires que ce qu'on avance via le site ». Il avait raison sur le fond. Trois causes trouvées le 2026-09-14 :

1. **Le juge mesurait la substance, pas le design.** Texte, photos, CSS, polices, Lighthouse : tout passait. Un site sans caractère passait aussi.
2. **La règle « animations retenues » du cerveau v1 interdisait le geste.** Les agents, sans direction artistique chiffrée, ont rendu le thème par défaut : un thème clair, une photo, des cartes, un reveal timide.
3. **26 photos sur 53 portaient une attribution inventée.** Fichier Commons inexistant, ou photo différente de celle citée ; un générateur d'agent (`public/sites-demo/build.mjs`, carreleur — jamais commité, supprimé depuis) téléchargeait des images Picsum et leur collait un auteur et une licence Commons. Un crédit photo faux, c'est un mensonge sur la page des mentions légales.

## Ce qu'est la v2

- **La grammaire** : `plans/cerveau-site-motifs.md`. Ce que PromptedSite et MotionSites nous ont appris, réécrit en valeurs exactes : la forme d'un prompt de design (identité, palette par rôle, typographie, sections, spec de mouvement, responsive, livrable) et les motifs (rideau d'ouverture une fois par session, h1 mot à mot, Ken Burns et parallaxe légère, reveal en cascade `cubic-bezier(.16,1,.3,1)` 0,95 s, bouton pilule, marquee, cartes à halo, galerie bento, panneau d'étapes collant, grands liens de communes, accordéon `<details>`, bande d'appel, menu panneau, nav qui se solidifie, filigrane, grain). Rien n'est recopié : CSS/JS maison, sans framework, sans police tierce, sans requête externe.
- **Le kit** : `public/sites-demo/_kit/` — `kit.css`, `kit.js`, et `da.json` = la direction artistique par métier (accent du juge + teinte de texte contrastée, fonds, encres, display + texte, geste du héros, filigrane, matière, rayon).
- **Le générateur** : `public/sites-demo/generer.mjs`. Il rend un site entier depuis `contenu.json` (les textes), `attributions.json` (les photos et ce que Commons en dit) et `site.json` (le dossier). Aucun modèle de langage à la génération : mise en page déterministe, rejouable, identique à chaque fois. Le geste ne dépend plus d'un quota.
- **Les photos** : re-sourcées par `scripts/photos-demo.mjs` (`chercher` → planche numérotée choisie à l'œil, `prendre` → téléchargement Commons, attribution recopiée de l'API) et prouvées par `scripts/photos-provenance.mjs` (auteur comparé à l'API, image locale comparée à la vignette Commons par empreinte perceptuelle). Résultat : 56 photos, 0 fausse attribution.
- **Le juge** : `scripts/site-qa.mjs` a gagné un bloc « Le geste » (h1 en mots, ≥ 12 `.reveal`, rideau + marquee + galerie + étapes + accordéon présents, ≥ 8 `:hover` et un `cubic-bezier`, `prefers-reduced-motion` traité, rien qui anime la mise en page) et trois mesures au rendu réel (h1 ≥ 56 px à approche négative, contenu sous la ligne de flottaison masqué puis dévoilé en entier, tout visible sans défiler en mouvement réduit). `scripts/lh-diag.mjs` lit le détail Lighthouse au lieu du score.

## Les trois gestes de héros

| Geste | Ce que c'est | Métiers |
|---|---|---|
| `plein` | photo plein cadre, dégradé bas, texte en bas à gauche, filigrane | plombier, chauffagiste, couvreur |
| `scinde` | texte à gauche, photo 4:5 à droite dans un cadre avec aplat accent décalé | électricien (sombre), maçon, menuisier, carreleur (calepinage CSS), serrurier |
| `aplat` | fond accent plein, photo 4:3 qui déborde en bas | peintre |

Jamais le même geste pour deux métiers voisins. Toujours : kicker mono, h1 mot à mot, chapeau, bouton pilule + téléphone.

## Résultats (2026-09-14, 11 h 45)

- Juge complet (rendu réel bureau + mobile + mouvement réduit, Lighthouse mobile sur l'accueil et une page de commune) : **9 sites sur 9 verts**.
- Lighthouse mobile : Performance 96–100, Accessibilité 96–100, TBT 0–137 ms, LCP 1,4–2,5 s.
- Sur le peintre, Performance 84 → 99 après trois corrections de kit : le flou animé (`filter: blur`) sur les mots sortait du compositeur (TBT 500 ms), la première mesure de la ligne des étapes forçait une mise en page au chargement (822 ms), le rideau animait `visibility`. À part : `scroll-behavior: smooth` en CSS bloquait tout défilement programmé — le juge et la capture ne voyaient jamais le bas de page (19 reveals « cachés ») ; retiré, les ancres défilent via kit.js.
- Une mesure de performance se prend machine au repos : celles prises pendant qu'un agent faisait tourner Playwright étaient fausses de 100 à 150 ms.

## Ajouter un métier (les cinq commandes)

1. Une ligne dans `public/sites-demo/_kit/da.json` (identité en trois mots, palette, typographie, geste, matière, rayon — motifs §4), puis `node scripts/polices-demo.mjs` si une police manque.
2. `node scripts/photos-demo.mjs chercher <metier>` puis `prendre <metier> <n°:rôle:"Légende"> …` — on choisit à l'œil sur la planche.
3. `node public/sites-demo/generer.mjs <metier>` (textes dans `contenu.json`, écrits ou extraits par `public/sites-demo/extraire-contenu.mjs`).
4. `node scripts/site-qa.mjs public/sites-demo/<metier>` (avec `--statique` d'abord, rapide), `node scripts/lh-diag.mjs public/sites-demo/<metier> [chemin]` si un score manque.
5. `node scripts/capture-site.mjs public/sites-demo/<metier> <préfixe>` — et regarder les captures bureau et mobile. Le juge vert ne remplace pas l'œil : c'est exactement ce qui a manqué à la v1.

## Ce qui reste à l'appréciation de Benj

- **Les textes v1 sont conservés.** `contenu.json` reprend les textes des sites v1 (écrits et jugés) : on ne les a pas réécrits. À relire si le ton ne va pas.
- **Les photos viennent de Commons.** Provenance prouvée, licences acceptées par le juge, mais choisies à l'œil sur une planche : à remplacer par les photos de l'artisan dès qu'il en donne.
- **Le chauffagiste est au seuil LCP** : 2,49 s, le plein cadre le plus lourd. À surveiller.

## v16 — LA démo : Atelier Lestraque (2026-09-14)

**La commande.** Le prompt v16 de Benj demande deux choses : un système universel qui tourne sans lui et sans vider Claude Code (l'orchestre autonome, voir [[Orchestre]]), et **une** démo de site au niveau MotionSites qui finit sur la landing. Les neuf démos v2 ci-dessus restent ce qu'elles sont ; la v16 en ajoute une dixième, faite pour être montrée.

### Les références regardées, et la grille C1–C8

- **MotionSites** : 55 prompts relevés en métadonnées, sans consommer d'ouverture (`plans/references-motionsites.md`). Neuf aperçus animés publics réduits en images-clés (`scripts/refs-images-cles.mjs` → `planche-refs.jpg`). Le niveau n'a été écrit qu'**après** avoir regardé : une synthèse en six points, puis la grille.
- **Design Rocket** : Benj est connecté en Free Plan, et tout le contenu est derrière « Upgrade to Pro », même le module 1. Rien n'a été lu ni payé. Les « principes Design Rocket » qu'un agent avait écrits sans source ont été retirés.
- **La grille**, notée de 1 à 5 :

| | Critère | Au niveau quand… |
|---|---|---|
| C1 | Objet visuel fort dans le héros | vidéo, 3D ou photo plein cadre qui porte l'écran |
| C2 | Mouvement ambiant continu | quelque chose vit en permanence (boucle, parallaxe, projecteur) |
| C3 | Typographie monumentale | un seul titre ≥ 12 vw, kicker fin, contraste franc |
| C4 | Révélations séquencées au défilement | listes, chiffres, galeries arrivent dans l'ordre |
| C5 | Contrastes entre sections | sombre/clair, aplats, raccords |
| C6 | Matière | flou, lumière, grain, profondeur |
| C7 | Retenue | une nav fine, un bouton, rien de gratuit |
| C8 | Rythme | rien de figé plus d'une seconde, cadence lisible |

Règle : la démo doit atteindre **au moins la médiane des références sur chaque critère**. Verdict mécanique : `scripts/grille-qa.mjs`, qui lit `.orchestre/preuves/refs/grille.json`. Les notes viennent d'un sous-agent indépendant : il n'a pas construit la démo, il n'a pas lu les notes antérieures, et il re-note lui-même les neuf références. Ses médianes : **C1 5 · C2 4 · C3 3 · C4 4 · C5 2 · C6 4 · C7 3 · C8 4**.

### La démo

« Atelier Lestraque », menuisier-agenceur **fictif** à Rennes, dans `public/sites-demo/lestraque/`. Le nom a été vérifié au registre des entreprises : 0 résultat. « Atelier Bellevigne » et « Vernet » ont été écartés parce qu'ils existent. Onze photos Commons, 0 fausse attribution (`photos-provenance.mjs lestraque`). La recherche par **catégories** (établis, copeaux, veinage) a donné le rabot du héros et six photos de matière, là où la recherche plein texte ne donnait rien. Les textes reprennent ceux du menuisier v2 avec le nouveau nom. Le h1 reste « Menuisier à Rennes » (exigé par le juge SEO) et la promesse passe dans le kicker.

**Les gestes à la carte** (`plans/cerveau-site-motifs.md` §6). Ils sont posés par des drapeaux dans `_kit/da.json`, jamais par défaut : les neuf démos v2 ne changent pas (juge statique 10/10).
- `monumental` : un seul titre à 12,5 vw (160 px sur 1280).
- `lumiere` : un balayage dans le cadre la moitié d'un cycle, une poussée ample et lente de la photo (13 % + translation en 12 s), une lueur chaude qui dérive (bureau ≥ 900 px). Le balayage se retire quand la révélation brut → fini est présente (bureau seulement). Tout passe par transform et opacity, et rien ne bouge en mouvement réduit.
- `sombre` : la section des étapes en fond atelier, avec du grain.
- `raccords` : cette section entre et sort en biais.
- `bandeAccent` : une bande qui défile sur l'accent.
- `galerie` : six photos choisies.

### Les trois passes du juge indépendant

1. **Première passe — FAIL.** C3 à C7 passent, mais **C1 4, C2 2, C8 2** échouent : « quatre captures du héros identiques ». Le balayage de lumière était bien écrit en CSS, mais il était invisible. Large de 240 % du héros, il ne traversait l'écran que 1,5 s sur 7, et jamais aux instants capturés. Pourtant la production était verte (Lighthouse 96/99). C'est exactement ce que la grille est là pour attraper. Correction : balayage recadré, lueur continue, poussée ample de la photo.
2. **Deuxième passe — C1 reste à 4.** C2 passe de 2 à 4, C6 de 4 à 5 et C8 de 2 à 4. La différence entre images-clés du héros monte à 0,06–0,10, contre 0,008 avant. Mais « l'objet du héros est toujours une photo fixe ».
3. **Passe finale — PASS sur les huit critères**, avec la **révélation brut → fini** : dans la photo du rabot, un cercle de lumière laisse voir l'escalier fini (bureau seulement). Le juge l'a d'abord notée PASS (C1 5, C2 5, C6 5, C7 4, avec une réserve sur deux animations superposées). Mais la première version montrait une tache brune floue. Corrigée avant de valider : l'escalier est posé à droite au lieu d'être étiré, et le cercle est plus grand, plus net et reste sur son centre ; le balayage se retire quand la révélation est là, pour garder un seul geste signature. Tout changement après un PASS l'annule, d'où la passe finale.

| | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
|---|---|---|---|---|---|---|---|---|
| Démo (3ᵉ passe) | 5 | 5 | 5 | 4 | 3 | 5 | 5 | 4 |
| Médiane des références | 5 | 4 | 3 | 4 | 2 | 4 | 3 | 4 |

Sur C7, le juge note « un seul geste signature, thématiquement justifié ». La marge la plus fine est C5 (3 contre 2) : les fonds clairs restent proches les uns des autres. Le juge la signale comme non bloquante.

### La performance : l'échec à 92, la trace, le 97 stable

- **13 h 43 — 016-02 FAIL** au vérificateur : Lighthouse mobile 92 sur l'accueil, alors qu'un passage précédent au repos disait 97. La page était au bord du seuil, pas stable. Défaut de méthode au passage : la chaîne de fond enchaînait verdict, compilation, commit et poussée sans s'arrêter sur le verdict. Elle a été arrêtée avant la poussée, rien n'est parti.
- Un premier correctif visait la ligne des étapes, que Lighthouse accusait via `site.js`. Il n'a pas suffi : trois mesures au repos ont donné 91 · 95 · 97.
- **La trace du fil principal** (`scripts/trace-longues-taches.mjs` : Playwright + CDP, mobile, CPU ×4, trois chargements) a montré que les longues tâches étaient **de la mise en page, pas du script**. Il y en avait deux : la première mise en page d'une page longue, puis une seconde, complète, à l'arrivée de la police de texte.
- **Correctifs** : `text-wrap: balance` réservé aux h1/h2 (plus sur les nombreux h3), et police de texte en `font-display: optional` (la police de titre reste en `swap`, préchargée).
- **Résultat** : Lighthouse mobile accueil **97 · 97 · 97** au repos, et le CLS tombe de 0,016 à 0. **016-02 : PASS** à 13 h 53 (site-qa + grille-qa + code-qa) : la démo est validée sans Benj.

### La mise en ligne sur la landing

- Bloc « Et le site qui va avec » sous la séquence de `#fonctionnalites` (`app/DemoSite.tsx`), derrière le drapeau `landingDemoSite`. Il montre, il ne vend pas : pas de bouton de commande.
- La capture animée est muette et pèse 1,3 Mo (`scripts/demo-video.mjs` : la souris promène la lentille pendant l'enregistrement). Elle est passée au juge vidéo dans un nouveau profil `--profil=landing` (16:9, muette, ≤ 1,5 Mo). Le profil « réseaux » exigeait une piste son et un débit incompatibles avec la landing.
- Le bloc a un lien vers `/sites-demo/lestraque/index.html` et une ligne : « Le site, à la demande — 300 €, une fois. »
- Commit `ca5d62c` (13 h 55) poussé, déploiement READY (journal-v16, bloc 4 ; aucune sortie de `scripts/deploiement-etat.mjs` n'est conservée dans les preuves, la capture de la landing en production par 016-03 le corrobore). **016-03 : PASS en production** à 13 h 58 : la vidéo joue sur bureau et sur mobile, et la page de la démo comme sa feuille de style répondent en 200.

### Les leçons

- **Un geste écrit n'est pas un geste vu.** Avant de déclarer un mouvement ambiant, prendre les images-clés et mesurer leur différence. Et un effet qui se voit mais ne se lit pas est pire que rien.
- **La chaîne qui pousse s'arrête au premier échec** (`&&`, jamais `;`). Sinon elle met en ligne une démo refusée.
- **Tracer avant de corriger.** Lighthouse accusait le script, la trace montrait la mise en page. Mesurer au moins trois fois au repos avant de conclure.
- **Next sert `public/` sans barre finale.** `/sites-demo/x/` est redirigé vers `/sites-demo/x`, et les chemins relatifs cassent (styles en 404). Les liens internes des démos visent donc `index.html` (générateur) plutôt qu'une règle globale.

### Ce qui reste à Benj (v16 §6)

- **H1** : décider s'il prend MotionSites Unlimited et/ou Design Rocket Pro. C'est une question d'argent.
- **H2** : laisser Chrome connecté aux deux sites.
- **H3** : dire oui ou non à la démo en ligne. C'est facultatif, puisqu'elle est validée et en ligne.
- En plus : une connexion unique à Gemini CLI ou à Qwen Code pour le second exécutant. Et le connecteur MotionSites de Claude Code demande une nouvelle autorisation.

## Sources

- `plans/journal-v16.md` (blocs 1 à 4) — le récit de la démo, avec toutes les mesures, le 2026-09-14. Ses heures ont été rectifiées le 14/09 à 14 h 10 d'après `verdicts.jsonl` et git ; les heures ci-dessus suivent les horodatages machine.
- `.orchestre/preuves/016-03/verifier.log` (vidéo joue bureau/mobile, 200), le commit `ca5d62c` et `app/DemoSite.tsx` — la mise en ligne.
- `plans/references-motionsites.md` — le niveau MotionSites et la grille C1–C8 (médianes provisoires) ; `.orchestre/preuves/refs/grille.json` — les notes finales du juge indépendant, dont les médianes font foi.
- `.orchestre/decisions.md`, `.orchestre/digest.md`, `.orchestre/verdicts.jsonl` — les décisions et les verdicts 016-01 à 016-03.
- `plans/journal-v15.md` (bloc 17) — le récit du 2026-09-14.
- [[Journal-Decisions]] — les décisions du 2026-09-14 : démos v2 (générateur, provenance, juge du geste) et v16 (juge indépendant sur la grille, révélation brut → fini, chaîne qui s'arrête au premier échec, police optional).
- `plans/cerveau-site.md` (§3, §7, §8, §9) — la direction artistique, l'anti-fabrication, la livraison, le journal du cerveau.
- `plans/cerveau-site-motifs.md` — la grammaire et les motifs en valeurs exactes.
- `public/sites-demo/generer.mjs`, `public/sites-demo/_kit/` (kit.css, kit.js, da.json), `public/sites-demo/extraire-contenu.mjs`.
- `scripts/photos-demo.mjs`, `scripts/photos-provenance.mjs`, `scripts/site-qa.mjs`, `scripts/lh-diag.mjs`, `scripts/capture-site.mjs`, `scripts/polices-demo.mjs`.
