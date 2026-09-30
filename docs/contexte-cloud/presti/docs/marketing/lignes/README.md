# Les cinq lignes éditoriales

Créée le 2026-09-29 d'après `Ecosysteme-Marketing-Reel-2026-09-25.md` §4 bis. Statut de chacune : **proposée, suspendue,
non approuvée par Benj**. Benj l'approuve une fois, avec la voix. Approuver une ligne n'autorise **aucune publication** : R24
reste ouverte, chaque publication attend l'accord de Benj sur son média et son texte exacts. Une ligne suspendue ne publie rien.

Chaque ligne ci-dessous a la même fiche : matière, gabarit, faits autorisés, canaux, cadence, appel à l'action, plafond, mention.
Un fait cité renvoie au dépôt (la clé « fait » de la fiche, suivie d'un chemin qui existe). Rien ne s'invente : une phrase qui n'est ni un fait ni une
phrase de la voix est en attente de Benj. Une sixième ligne facultative existe dans la source (Benj face caméra, 30 secondes,
une fois par semaine) ; elle n'est pas décrite ici tant qu'il ne la demande pas.

## L1 · Ton site en 20 secondes

- matière : le défilement vertical d'une maquette d'artisan **fictif**, jamais celle d'un vrai prospect ; vidéo de maquette de
  l'Atelier (fiche 026-075) sur des jeux d'essai et des photos de démos en CC0 ou CC BY créditées (tri de 026-126). Aucune photo
  CC BY-SA.
- gabarit : vidéo verticale 1080 par 1920, 15 à 30 secondes, défilement découpé en plans (au moins 5 coupes par 10 secondes,
  seuil de `scripts/video-qa.mjs`), sous-titres incrustés, fond libre de droits, jamais de silence. « 20 secondes » est la durée du
  film, pas un délai de livraison du produit.
- fait: lib/crieur/juge.ts#PHRASE_AIMANT
- canaux : tiktok, instagram, facebook
- cadence : TikTok, part de la cadence du réseau (3 vidéos par semaine les semaines 1 à 4, source de la fiche, déduit et à
  mesurer) ; Instagram et Facebook, les mêmes vidéos décalées d'un jour et seulement après la voie Meta officielle (R6).
- plafond : la cadence du réseau est partagée entre les lignes actives, la répartition se fixe à l'approbation ; première série
  de 3 à 5 vidéos avant tout accord de cadence (source de la fiche, R24).
- appel_action : Instagram et Facebook, la phrase d'appel du juge du Crieur, **seulement si le drapeau `aimantSite` est levé**
  (absent de lib/flags.ts au 2026-09-29, donc non) ; TikTok, « Lien en bio. »
- mention : « Exemple. » sur toute la durée de la maquette ; mention IA si une voix de synthèse est utilisée ; crédit de chaque
  photo CC BY dans la légende ou la description.

## L2 · La question du métier

- matière : une question qui appuie là où ça fait mal, puis la phrase vraie du métier ; une série par métier. Les douleurs
  viennent de la bibliothèque approuvée de la fiche 026-073 (à livrer, aucune citation n'est copiée ici) et du guide
  `plans/accroches-par-metier.md`.
- gabarit : vidéo verticale de texte animé, 15 à 30 secondes, une question, une phrase vraie, sous-titres incrustés, fond
  libre de droits.
- fait: plans/accroches-par-metier.md
- canaux : tiktok, instagram, facebook (la vidéo sur Instagram et Facebook attend R6)
- cadence : part de la cadence du réseau (voir L1) ; une série par métier, chaque première série passe par Benj.
- plafond : voir L1 ; une série de 3 à 5 vidéos avant tout accord de cadence.
- appel_action : « Lien en bio. » (un seul lien par compte : pas de code par ligne).
- mention : aucune donnée d'artisan ; la douleur citée est une citation publique d'artisan approuvée, jamais un nom ni un
  pseudo. La phrase « mon logiciel » pour le tri, « l'IA » quand c'est l'IA.

## L3 · Ce que fait vraiment le logiciel

- matière : une **capture réelle du produit** (compte de démo ou jeux d'essai, jamais les données d'un client) et un fait prouvé,
  par exemple le fait `reponse-rapide`, mot pour mot.
- gabarit : vidéo verticale, capture animée du produit, un texte de fait à l'écran (mot pour mot), sous-titres incrustés, fond
  libre de droits.
- fait: lib/crieur/faits.ts
- fait: plans/promesses.md
- canaux : tiktok, instagram, facebook
- cadence : voir L1.
- plafond : voir L1 ; un fait à drapeau (par exemple `site-sur-mesure`) ne se publie que drapeau levé.
- appel_action : « Lien en bio. »
- mention : mention IA si voix de synthèse ; aucune donnée personnelle dans la capture ; chaque fait vérifié dans le
  [registre des promesses](../offre/registre-promesses.md) avant publication.

## L4 · Une boîte tenue par des agents

- matière : les coulisses, la station et son décor, avec des jeux d'essai ou des chiffres **agrégés** réels, jamais un nom ni un
  compte réel. Ligne d'essai : elle attire, mais peut-être pas des artisans (déduit, à mesurer).
- gabarit : vidéo verticale de captures de la station, sous-titres incrustés, fond libre de droits ; les visuels de la station
  restent sous licence traçable (`docs/station/licence-planche.json`, CC0).
- fait: docs/station/planche.md
- canaux : tiktok
- cadence : voir L1 ; ligne d'essai, la boucle peut la suspendre.
- plafond : voir L1 ; aucune donnée d'artisan ni de prospect à l'écran.
- appel_action : « Lien en bio. »
- mention : « Exemple » sur un jeu d'essai, mention IA si voix de synthèse ; un agrégat cité porte sa source et sa date, sans
  aucun nom.

## L5 · Un fait Presti

- matière : les publications du Crieur, telles que la fiche 026-119 les compose : un texte de fait, mot pour mot, avec un
  visuel du Crieur.
- gabarit : texte avec visuel (carrousel ou image 1080 par 1080, gabarit du Crieur), pas de vidéo.
- fait: lib/crieur/faits.ts
- canaux : instagram, facebook, linkedin
- cadence : par le Crieur via Publora Starter, un texte par semaine et par réseau (Instagram le lundi, Facebook le mercredi,
  LinkedIn le vendredi, à 12 h) dans le quota de Publora ; le Crieur dépose un brouillon et Benj le programme lui-même.
- plafond : le quota de Publora Starter et le juge du Crieur (`lib/crieur/juge.ts`) ; jamais de programmation sans l'accord de
  Benj sur la version exacte.
- appel_action : « Commente SITE » sur Instagram et Facebook, **seulement drapeau `aimantSite` levé** ; sur LinkedIn, jamais
  (personne n'y répond).
- mention : aucune ; les adresses autres que prestiapp.fr sont refusées par le juge du Crieur.

## Règles communes

Aucune ligne n'a de cadence, de plafond ou de canal hors de ce fichier. Une publication est « dans le cadre » si sa ligne est
approuvée et non suspendue, et si son gabarit, ses faits, son canal, sa cadence et son plafond le sont. Une ligne est
suspendue d'un geste de Benj, ou par la boucle (une ligne sous le quart de la médiane pendant 2 semaines, après au moins 6
publications et 2 semaines, source de la fiche), avec une carte à Benj. Cette mémoire ne crée jamais de nouvelle ligne : c'est
un geste de Benj.
