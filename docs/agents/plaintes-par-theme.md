# Les plaintes d'artisans, agrégées par thème

Demande de Benj (07/10/2026) : contacter « des personnes qui ont des problèmes qu'on peut résoudre, et le mieux serait qu'elles s'en plaignent ». Ce document est l'AGRÉGAT : par thème, les phrases exactes d'artisans (citation, page du fil, date de relève), pour reprendre LEURS mots dans le message et la maquette. Il est régénéré par `node --import ./scripts/ts-loader.mjs scripts/veille-plaintes.mjs --agreger` ; ne pas l'éditer à la main sous la ligne « Agrégat ».

Code : `lib/agents/acquisition/plaintes.ts` (thèmes, classement, contrôle des données personnelles), `lib/agents/acquisition/plaintesParTheme.ts` (les citations retenues, `formulationsPour(theme)`), `scripts/veille-plaintes.mjs` (découverte et relève polies), juge `scripts/veille-plaintes-qa.mjs`.

## Règles (RGPD)

- On garde la phrase, la page du fil et la date. JAMAIS l'auteur : ni pseudo, ni nom, ni profil, ni ville, ni photo. Les en-têtes de message (« Réponse de … ») sont écartés à la lecture.
- On ne contacte JAMAIS l'auteur d'un message de forum : c'est un particulier qui n'a rien demandé, il n'y a aucune base légale. La veille sert à comprendre et à formuler, pas à trouver des personnes.
- Lecture polie seulement : robots.txt lu et respecté (PrestiRecenseur, sinon « * »), une requête par seconde et par hôte, pages publiques sans compte, UTF-8. Conditions d'utilisation relues avant d'ajouter une source.
- Une phrase d'un client qui se plaint d'un artisan, d'un vendeur d'outil ou d'une étude de marché n'est pas une douleur d'artisan : chaque candidate est relue avant d'entrer dans `plaintesParTheme.ts`. Toute entrée naît à `approuve: false` ; seules les approuvées entrent dans un message.

## Sources

| Source | Lecture automatique | Raison (relu le 07/10/2026) |
|---|---|---|
| plombiers-reunis.com (forum de plombiers et chauffagistes) | oui | robots.txt n'interdit que /admin, /cache, /profile*, /search*, /user*, /v3/ ; CGU : contenus publiés sous licence Creative Commons, aucune clause contre la lecture automatisée. Plan de site public utilisé pour la découverte. |
| droit-finances.commentcamarche.com (forum questions-réponses) | oui, titres côté entreprise seulement | robots.txt n'interdit que /xhr/, /s/, /profile/… et publie ses plans de site ; CGU muettes sur la lecture automatisée. Forum surtout écrit par des CLIENTS : rendement faible (relève du 07/10 : aucune phrase d'artisan du bâtiment retenue hors celles déjà dans douleurs.ts). |
| volta-electricite.info, forum.copaindescopeaux.fr | oui (fils déjà relus en 026-073/026-254) | robots.txt permissif ; pas de plan de site exploitable (redirection, ou fils sans titre dans l'adresse) : ajout fil par fil. |
| **Reddit** (r/france, r/vosfinances, r/BTP…) | **NON** | `robots.txt` de www.reddit.com et old.reddit.com : `User-agent: *` / `Disallow: /` (lu le 07/10/2026) ; ce même fichier renvoie à la Public Content Policy de Reddit pour les restrictions d'usage et ne réserve l'accès qu'à la recherche et à l'usage non commercial (r/reddit4researchers) : Presti est un usage commercial. Ce qu'il faudrait : un accord commercial avec Reddit (API de données) ; à défaut, une lecture HUMAINE par Benj, phrase par phrase, recopiée dans `plaintesParTheme.ts` avec la page du fil — jamais un robot, jamais un acteur Apify « reddit-scraper ». |
| **Avis Google (Google Maps)** | **NON** | robots.txt laisse /maps/place/, mais les Conditions additionnelles de Google Maps interdisent l'extraction en masse et la copie des avis ; les acteurs Apify (compass/crawler-google-places : 0,004 $ par fiche + 0,002 $ de détails + 0,0005 $ par avis, soit environ 0,016 $ par entreprise à 20 avis, ~0,50 $ pour 30 prospects, ce que le crédit gratuit couvrirait) les moissonnent : non lancé. Ce qu'il faudrait : l'API Places officielle (Place Details, champ `reviews`, 5 avis au plus par fiche) avec une clé Google Cloud et un compte de facturation — décision de Benj. Le score de douleur sait déjà compter les avis en mémoire (`compterAvis`) sans rien stocker. |
| Facebook, Instagram, LinkedIn, X, TikTok, PagesJaunes, Trustpilot | **NON** | Conditions qui interdisent la collecte automatisée (`HOTES_INTERDITS` de plaintes.ts). |

## Brancher le message et la maquette

`formulationsPour(theme, { approuveesSeulement: true })` (plaintesParTheme.ts) rend, pour un thème, les phrases d'artisans approuvées avec leur page et leur date : le rédacteur et la maquette y prennent LEURS mots (« un devis, une journée entière », « pas un appel, pas un courrier ») au lieu des nôtres. Le branchement n'est pas fait ici : `redacteur.ts`, `modeles.ts` et `maquettes/**` sont tenus par d'autres sessions (07/10). Tant qu'aucune entrée d'un thème n'est approuvée, `approuveesSeulement` rend une liste vide pour ce thème : rien n'entre dans un message sans l'accord de Benj.

## Le score de douleur des entreprises prospectées

Pendant B2B de cette veille : `lib/agents/acquisition/scoreDouleur.ts` note chaque entreprise prospectée de 0 à 100 à partir de signaux publics sur elle-même (pas de site 35, copyright ancien 20, pas de version mobile 15, sans HTTPS 10, formulaire absent ou cassé 15, avis qui se plaignent de devis ou de rappels absents — comptés, jamais stockés —, nos messages restés sans réponse 5). Le recenseur pose le score dans son patch ; `scripts/score-douleur-passe.mjs --ecrire` (re)note la file ; les files du recenseur (`acq_reserver`) et du premier contact (`acq_prospects_pour_premier_contact`) passent par score décroissant (migrations 0135-0136). Juge : `scripts/score-douleur-qa.mjs` (`--auto-controle`, `--reel`).

## Crédits

La veille ne consomme AUCUN crédit payant : lecture directe polie. Apify et Firecrawl ne sont pas appelés (Firecrawl reste refusé par `lib/agents/depense.mjs` tant que Benj n'a pas décidé).

## Agrégat

45 citation(s) rangée(s) (une citation peut compter dans deux thèmes).

| Thème | Citations | Approuvées | Pages sources | Ce que Presti y répond |
|---|---|---|---|---|
| Devis non relancés, sans réponse ou jamais signés | 6 | 2 | 4 | Un devis envoyé depuis la conversation avec le client est suivi de trois relances (J+2, J+5, J+10) par e-mail. |
| Appels manqués, téléphone impossible à tenir sur le chantier | 4 | 1 | 3 | Chaque demande écrite faite par le lien de contact arrive dans Presti, avec une réponse prête en moins d’une minute, même pendant le chantier (pas les appels). |
| Pas de site, site obsolète, invisible sur internet | 11 | 1 | 9 | Presti livre un site d’artisan à jour et lisible sur téléphone, dont le formulaire envoie chaque demande dans Presti. |
| Impayés, retards de paiement, relances de factures | 10 | 0 | 7 | Presti fait la facture depuis le devis, liste les impayés dans « Mes chiffres » et prépare un brouillon de relance que l’artisan envoie lui-même. |
| Temps perdu en administratif : devis, factures, paperasse le soir | 14 | 3 | 9 | Presti prépare le devis puis la facture à partir de la demande du client. |

### Devis non relancés, sans réponse ou jamais signés

| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |
|---|---|---|---|---|---|
| « la plateforme vens la meme proposition a plusieurs entreprises qui se retrouvent en concurrence et il arrive qu'aucune des trois ne remporte le chantier » | plombier | https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html | 2026-09-29 | douleurs (plombier-plateforme-meme-demande) | oui |
| « la majorité du temps je n'ais pas eu le marché, sans compter les clients qui cherchent seulement a connaitre le prix de la prestation » | tous | https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html | 2026-09-29 | douleurs (tous-plateforme-curieux-du-prix) | oui |
| « Les gens du bâtiment que je connais me dise que mes prix sont normaux, mais j'ai pas mal de devis qui reviennent pas signer donc je comprends pas. » | plaquiste | https://droit-finances.commentcamarche.com/forum/affich-6922149-tarification-plaquiste | 2026-10-04 | douleurs (plaquiste-devis-pas-signes) | non |
| « les clients qui font faire 10 devis y'en n'a marre!!! les devis pour nous sont gratuits! » | couvreur | https://droit-finances.commentcamarche.com/forum/affich-4322786-tarif-couvreur-couverture | 2026-10-04 | douleurs (couvreur-clients-multiples-devis) | non |
| « résultat de l'opération, aucun client ne donne suite!!!!!! pas un appel, pas un courrier!!! » | couvreur | https://droit-finances.commentcamarche.com/forum/affich-4322786-tarif-couvreur-couverture | 2026-10-04 | douleurs (couvreur-aucun-retour-apres-devis) | non |
| « je constate aussi une baisse importante des demandes, et les visites et devis débouchent de moins en moins sur une commande... » | plombier | https://plombiers-reunis.com/topic8140-grosse-baisse-dactivite-au-mois-de-mars.html | 2026-10-04 | douleurs (plombier-demandes-en-baisse) | non |

### Appels manqués, téléphone impossible à tenir sur le chantier

| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |
|---|---|---|---|---|---|
| « Bien souvent les chantiers vous sont attribués le vendredi, vous appelez le lundi, mais il s'agit d'un contact bidon » | plombier | https://plombiers-reunis.com/topic9863-que-pensez-vous-des-plateformes-de-mise-en-relation.html | 2026-09-29 | douleurs (plombier-plateforme-contact-bidon) | oui |
| « en attendant nous sommes la proie facile de ces sites qui ne font pas payer tous ces petits malins qui font des demandes et qui n'ont même pas l'honnêteté de répondre ni au téléphone ni aux courriels » | plombier | https://plombiers-reunis.com/topic3385-des-conseils-pour-un-debut-dactivite-comment-trouver-des-chantiers.html | 2026-10-04 | douleurs (plombier-sites-demandes-sans-reponse) | non |
| « Entre les appels, les demandes de renseignements et les personnes qui veulent simplement avoir une première idée du prix, ça peut vite prendre du temps. » | tous | https://plombiers-reunis.com/topic9680-combien-de-temps-vous-passez-a-gerer-les-appels.html | 2026-10-07 | veille (veille-tous-appels-renseignements-prix) | non |
| « Et quand on est sur un chantier, ce n'est pas toujours évident de décrocher ou de rappeler rapidement. » | tous | https://plombiers-reunis.com/topic9680-combien-de-temps-vous-passez-a-gerer-les-appels.html | 2026-10-07 | veille (veille-tous-chantier-decrocher-rappeler) | non |

### Pas de site, site obsolète, invisible sur internet

| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |
|---|---|---|---|---|---|
| « Les recherches que je fais sur internet maintenant sont toutes sponsorisées, ils te vendraient n'importe quoi en te racontant n'importe quoi. » | chauffagiste | https://plombiers-reunis.com/topic9711-decennale-et-responsabilite-civile-professionnelle.html | 2026-09-29 | douleurs (chauffagiste-recherches-sponsorisees) | oui |
| « je suis plombiers de métier et j'ai presque 20 ans d'expérience, ce qui me manque c'est la clientèle pour démarrer » | plombier | https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html | 2026-09-29 | douleurs (plombier-manque-clientele) | non |
| « Je n'ai plus trop de réseau ,alors je voulais savoir si cela était vraiment un frein pour démarrer? » | chauffagiste | https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html | 2026-09-29 | douleurs (chauffagiste-reseau-perdu) | non |
| « la prospection de nouveaux clients pour assurer un lendemain » | menuisier | https://forum.copaindescopeaux.fr/viewtopic.php?t=1803&start=100 | 2026-10-04 | douleurs (menuisier-prospection-lendemain) | non |
| « J'ai pas suffisamment d'appels » | plombier | https://plombiers-reunis.com/topic8995-a-mon-compte-comment-trouver-des-clients.html | 2026-10-04 | douleurs (plombier-pas-assez-d-appels) | non |
| « je n'est pas vraiment beaucoup de travail a peine de quoi survivre ! » | plombier | https://droit-finances.commentcamarche.com/forum/affich-5346622-demarcher-des-clients-dans-le-batiment | 2026-10-04 | douleurs (plombier-a-peine-de-quoi-survivre) | non |
| « J'aimerai remplir un peu plus mon ajenda, pour vous quel et la meileur pub? » | electricien | http://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?f=25&t=1382 | 2026-10-04 | douleurs (electricien-remplir-l-agenda) | non |
| « Les Flyers, je n'y crois pas du tout (perso, 5000 distribués, 3 appels) il vaut mieux investir dans une pub véhicule qui flashe. » | electricien | http://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?f=25&t=1382 | 2026-10-04 | douleurs (electricien-flyers-peu-d-appels) | non |
| « Je viens de créer ma boite,le plus important c'est avoir le maximum de visibilité » | tous | https://plombiers-reunis.com/topic3191-site-de-devis-gratuits.html | 2026-10-07 | veille (veille-tous-nouvelle-boite-visibilite) | non |
| « Avez-vous des conseils, des méthodes pour trouver des clietns ou des liens de site pour trouver de nouveau clients (pas de 123devis et compagnie, merci) du gratuit svp ? » | plombier | https://plombiers-reunis.com/topic3385-des-conseils-pour-un-debut-dactivite-comment-trouver-des-chantiers.html | 2026-10-07 | veille (veille-plombier-trouver-clients-gratuit) | non |
| « Mieux vos lancer son site internet et ça fiche Google et payer quelqu'un pour bien référencer tout ça » | plombier | https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html | 2026-10-07 | veille (veille-plombier-site-et-fiche-google) | non |

### Impayés, retards de paiement, relances de factures

| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |
|---|---|---|---|---|---|
| « le client qui oublie de te payer dans les délais » | menuisier | https://forum.copaindescopeaux.fr/viewtopic.php?t=1803&start=100 | 2026-10-04 | douleurs (menuisier-client-oublie-de-payer) | non |
| « Suite à cela on refuse de me payer une facture qui n'a rien à voir et on me demande de payer la facture du plombier qui a fait la vidange reseau et changer le raccord. » | peintre | https://droit-finances.commentcamarche.com/forum/affich-9197577-litige-client-artisan | 2026-10-04 | douleurs (peintre-facture-refusee-client) | non |
| « je suis artisan en entreprisse individuel jai effectuer des travaux de maconnerie pour une somme de7100 euro ttc le client accepte mon de devis et le signe » | macon | https://droit-finances.commentcamarche.com/forum/affich-5224679-un-client-doit-il-payer | 2026-10-04 | douleurs (macon-client-conteste-apres-chantier) | non |
| « apres 1moi jenvois une lettre de relance pour me regler le solde restant 1mois plus tard il menvois unlettre recomander motif tout les point de mon devis sont litigieux » | macon | https://droit-finances.commentcamarche.com/forum/affich-5224679-un-client-doit-il-payer | 2026-10-04 | douleurs (macon-relance-solde-sans-reponse) | non |
| « gros problème de trésorerie suite a des impayés clients » | macon | https://droit-finances.commentcamarche.com/forum/affich-5266639-artisan-macon-en-liquidation-judiciaire | 2026-10-04 | douleurs (macon-impayes-clients-tresorerie) | non |
| « pendant toute la dure du chantier ils sont tres content et jai meme realiser des travaux suplementaire nont facturer » | macon | https://droit-finances.commentcamarche.com/forum/affich-5224679-un-client-doit-il-payer | 2026-10-04 | douleurs (macon-travaux-en-plus-non-factures) | non |
| « on brade nos prix.. en cause?? des clients qui voient tout trop cher, d'autres qui ne vous payent pas ( la justice mets du temps pour que vous soyez indemnisé ) » | couvreur | https://droit-finances.commentcamarche.com/forum/affich-4095722-facturation-main-d-oeuvre | 2026-10-04 | douleurs (couvreur-prix-brades-clients-tardifs) | non |
| « Ce la dure depuis 10 mois, il nous fait poiroter sans cesse en nous disant que pour le moment il ne peut pas nous régler mais que la situation allait se débloquer. » | tous | https://droit-finances.commentcamarche.com/forum/affich-8177234-artisan-impaye-chantier | 2026-10-04 | douleurs (tous-impaye-donneur-d-ordre) | non |
| « J'ai changer un ballon d'eau chaude chez un client qui à déja payer une partie de la facture mais ne veux pas payer le reste. » | plombier | https://plombiers-reunis.com/topic3140-client-refusant-de-payer-la-facture.html | 2026-10-07 | veille (veille-plombier-client-paie-une-partie) | non |
| « un moi après le chantier il ne veut toujours pas payer que puis je faire et il me doit encore 400 €??????? » | plombier | https://plombiers-reunis.com/topic3140-client-refusant-de-payer-la-facture.html | 2026-10-07 | veille (veille-plombier-un-mois-apres-toujours-pas-paye) | non |

### Temps perdu en administratif : devis, factures, paperasse le soir

| Citation (mot pour mot) | Métier | Page | Relevée le | Origine | Approuvée |
|---|---|---|---|---|---|
| « toute cette bureaucratie, coute terriblement cher » | plombier | https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html | 2026-09-29 | douleurs (plombier-bureaucratie) | oui |
| « Je me doit d'effectuer des devis pour le patron en 1h max en comptant le matériel nécessaire + MO. Je trouve cela délicat et pas optimale niveau temps. » | electricien | https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=12472 | 2026-09-29 | douleurs (electricien-devis-une-heure) | oui |
| « Les premiers devis vont être long a rédiger car il faut tout compter et vérifier sa marge » | electricien | https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=12472 | 2026-09-29 | douleurs (electricien-devis-longs) | oui |
| « Oui beaucoup de paperasse pour les différentes formation. » | chauffagiste | https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html | 2026-09-29 | douleurs (chauffagiste-paperasse) | non |
| « Et pour mon premier chantier évidemment je suis en difficulté pour établir le devis. » | electricien | https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=13016 | 2026-09-29 | douleurs (electricien-premier-devis) | non |
| « Ah Effectivement les premières rédactions sont compliquées et parfois ratées. » | electricien | https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=13016 | 2026-09-29 | douleurs (electricien-redactions-ratees) | non |
| « Le détail que tu n'avais pas vu en faisant ton devis et qui plombe ta pose » | menuisier | https://forum.copaindescopeaux.fr/viewtopic.php?t=1803&start=100 | 2026-10-04 | douleurs (menuisier-detail-oublie-devis) | non |
| « Le soir, tu te penches sur tes devis, ta comptabilité... » | menuisier | https://forum.copaindescopeaux.fr/viewtopic.php?t=1803&start=100 | 2026-10-04 | douleurs (menuisier-devis-le-soir) | non |
| « Se dire voilà, le samedi (par exemple) je ne fais que les devis et la facturation, te feras aussi gagner du temps. » | menuisier | https://forum.copaindescopeaux.fr/viewtopic.php?t=1803&start=100 | 2026-10-04 | douleurs (menuisier-jour-devis-facturation) | non |
| « Je suis peintre en bâtiment, il faut donc que j'achète mes différents produits (peinture, impression, enduit, bâches, etc.) Je ne sais pas comment l'indiquer sur ma facture. » | peintre | https://droit-finances.commentcamarche.com/forum/affich-5608476-peintre-en-batiment-auto-entreprise | 2026-10-04 | douleurs (peintre-facture-fournitures) | non |
| « Je vais créer mon entreprise de peinture et je n'arrive pas à avoir les infos pour calculer mon devis et comment il se construit et ce qu'il y a dedans » | peintre | https://droit-finances.commentcamarche.com/forum/affich-5162892-comment-calculer-un-devis-peinture-ou-tapisse | 2026-10-04 | douleurs (peintre-calcul-du-devis) | non |
| « pendant toute la dure du chantier ils sont tres content et jai meme realiser des travaux suplementaire nont facturer » | macon | https://droit-finances.commentcamarche.com/forum/affich-5224679-un-client-doit-il-payer | 2026-10-04 | douleurs (macon-travaux-en-plus-non-factures) | non |
| « il faut se déplacer, calculer, taper le devis, le renvoyer, et tout cela nous prend une journée entière! » | couvreur | https://droit-finances.commentcamarche.com/forum/affich-4322786-tarif-couvreur-couverture | 2026-10-04 | douleurs (couvreur-devis-journee-entiere) | non |
| « Entre les appels, les demandes de renseignements et les personnes qui veulent simplement avoir une première idée du prix, ça peut vite prendre du temps. » | tous | https://plombiers-reunis.com/topic9680-combien-de-temps-vous-passez-a-gerer-les-appels.html | 2026-10-07 | veille (veille-tous-appels-renseignements-prix) | non |
