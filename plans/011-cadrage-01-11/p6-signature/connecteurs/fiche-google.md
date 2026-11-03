# Fiche connecteur — la fiche Google de l'artisan (avis) (tâche 036-006)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4 (« Les vrais outils : les connecteurs »,
> `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`, ligne « Fiche Google de l'entreprise »).
> Décision 3 du plan (`premiere-reponse.md` § 5) : **la demande d'accès à l'API est rédigée et laissée à Benj ; en attendant, le département
> réputation demande les avis par un canal consenti et prépare la réponse à un avis que l'artisan colle ou transfère ; rien n'est lu ni publié
> sur la fiche.** Les workflows `lib-avis-lire` et `lib-avis-repondre` sont prouvés hors ligne par `scripts/apres-reputation-n8n-qa.mjs` ;
> **le nœud Google réel décrit plus bas n'est ni posé, ni essayé, ni connecté** : il est préparé pour Benj, comme le veut
> `.claude/rules/securite.md` (aucun agent ne crée de compte, ne saisit une clé ni un code OAuth, n'envoie une demande à un tiers).
> Tout ce qui dépend de Google (noms de portées, quotas, délais, conditions) est **à vérifier à la date du jour** sur les pages de Google,
> citées en bas : rien ici n'a été relu sur Internet (le réseau sortant est fermé à cet hôte).

## Fiche (les neuf champs de p6 § 0.4)

| Champ | Fiche Google de l'artisan (API Google Business Profile) |
|---|---|
| **Portées demandées** | Une seule, la portée de gestion de la fiche : `https://www.googleapis.com/auth/business.manage` (à vérifier sur la page des portées de Google). Elle donne la lecture **et** l'écriture sur la fiche : Google n'en propose pas de lecture seule pour les avis, à vérifier. Le minimum est donc imposé par Google ; la limite à la lecture est faite **par Presti** : le connecteur commence **en lecture**, l'écriture d'une réponse n'est ouverte que par un lot testé et l'accord écrit de Benj, et jamais pour un avis négatif sans l'artisan. |
| **Ce qu'on lit** | La liste des avis d'un établissement : identifiant de l'avis, note (1 à 5), texte, date, prénom ou pseudo de l'auteur, réponse déjà publiée. Rien d'autre : ni photos, ni statistiques, ni autres établissements que celui que l'artisan a choisi. En attendant l'accès : **l'avis collé ou transféré par l'artisan** (note, texte, date), saisi dans Presti, sans aucun appel à Google. |
| **Ce qu'on écrit** | **Rien tant que l'accès n'est pas accordé, et rien sans le clic de l'artisan ensuite.** (1) Côté plateforme : une **carte « À valider »** par avis, avec un brouillon (négatif : toujours une carte ; positif : une carte aussi tant que Benj n'a pas accepté ce type, `premiere-reponse.md:305`) ; l'événement `avis_recu` et `carte_reponse_avis`, sans texte libre (`faits_sans_texte`, `0185_automatisation.sql:51-59`). (2) Côté Google, une fois l'accès accordé et **après** le clic de l'artisan : une réponse publique à l'avis (`review.reply`, nœud n8n, ou `PUT …/reviews/{avis}/reply` de l'API v4, à relire dans la référence citée en bas). Un avis suspect n'est **jamais** signalé à Google par Presti : la carte dit « à signaler » et c'est l'artisan qui le fait depuis sa fiche. |
| **Où vit l'autorisation** | **Supabase, chiffrée**, table `connexions` (`supabase/migrations/0193_systeme_agents.sql:99-128`), comme pour la boîte mail : `secret_n8n` au format `v1.<iv>.<tag>.<données>` (AES-256-GCM, `lib/secretBox.ts:21-30`), chiffré avec la clé propre à n8n, déchiffré **en mémoire, à l'exécution**. Décision 1 du plan (`premiere-reponse.md:359-371`). Le bouton « Connecter » et l'échange OAuth vivent dans **Presti** (lot 036-009), jamais sur n8n : le nœud « Google Business Profile » de n8n exige un **identifiant n8n par compte**, ce qui ne passe ni à l'échelle ni les règles (aucun agent ne crée d'identifiant) ; pour un artisan, la même opération passe par un nœud **HTTP Request** (jeton déchiffré à l'exécution). Le nœud n8n ne servirait qu'au « client zéro » de Benj. |
| **Retrait par le client** | Le bouton « Retirer » de « Connexions » (lot 036-009) : l'état passe à `retiree`, les deux secrets sont effacés par la base elle-même (`connexions_retiree_sans_secret`, `0193_systeme_agents.sql:126`). L'artisan peut aussi révoquer l'accès depuis son compte Google. `lib-avis-lire` ne lit plus rien dès que l'état n'est plus lisible ; **les avis déjà classés et leurs cartes restent** (ce sont ses données, rangées chez lui). Le mode « avis collé » continue de marcher sans connexion. |
| **Expiration, refus** | Jeton révoqué ou expiré, accès retiré par Google : le lecteur **se tait**, l'état passe à `erreur` ou `expiree` avec son motif pour l'écran « Connexions », **une** alerte part (`lib-alerter`), rien ne plante et le département ne réessaie plus tant que l'artisan n'a pas reconnecté (même règle que la boîte mail, `connecteurs/imap.md`). L'artisan garde le mode « avis collé ». |
| **Quotas de l'API** | **Aucun accès tant que Google n'a pas approuvé la demande** : le projet Google Cloud de Presti n'a pas de quota utilisable avant (à vérifier). Après approbation, le quota par projet est celui que la console Google Cloud affiche pour l'API (valeur à relever ce jour-là, pas ici). Notre usage prévu est très bas : **une lecture de la liste des avis par établissement connecté toutes les 6 heures** (4 par jour), **une réponse seulement après un clic**. Le plafond de Presti pour tout envoi reste 10 demandes d'avis par jour et par compte (`lib/apresChantier.ts`). |
| **Coût** | 0 € de licence côté Presti : n8n existe déjà, le nœud HTTP est natif. L'API Business Profile est gratuite d'après la documentation de Google, **à confirmer** sur la page de tarification le jour de l'envoi de la demande. Aucun service payant, aucune évaluation de sécurité annoncée pour cette portée (à vérifier : la décision 2 du plan chiffre celle de Gmail, pas celle-ci). |
| **Le test qui le prouve** | `node scripts/apres-reputation-n8n-qa.mjs` (hors ligne, 36 mutants) : un avis négatif n'est jamais publié, en Studio comme en Signature, pilote actif ou non (aucun effet de publication n'existe) ; un 5 étoiles qui menace d'une plainte est classé négatif (mots du **vrai** `MOTS_ESCALADE_TOUJOURS`) ; un faux avis est **signalé** (client inconnu, texte copié, rafale) sans jamais être écarté ni accusé ; un brouillon qui contient « Presti », un lien, un montant, une promesse ou le nom du client est refusé ; un avis d'un autre compte n'est ni lu ni répondu ; un avis n'entre qu'une fois. Et, **au premier branchement réel** : un essai de lecture sur la fiche de test de Benj avant tout état `active` — « une synchronisation ne se promet qu'après un essai de lecture réussi » (C4, `connexions_active_verifiee`, `0193_systeme_agents.sql:127`). |

## Pourquoi le nœud Google n'est pas dans les exports

La garde `scripts/n8n-specs-qa.mjs` ne permet que les types de nœuds de sa liste blanche (`TYPES_PERMIS`, l.88-90) : `n8n-nodes-base.googleBusinessProfile`
n'y est pas, et le juge `scripts/apres-reputation-n8n-qa.mjs` le refuse aussi (règle S4, avec un mutant qui l'ajoute). Poser le nœud réel exige donc : (1) l'accès à l'API
(la demande, ci-dessous) ; (2) un identifiant (compte de Benj, hors de portée d'un agent) ou, pour les artisans, un nœud HTTP Request avec le jeton déchiffré ;
(3) un **amendement de la garde** — un nœud Google déclaré, **désactivé**, derrière la sortie « faux » de la porte « simulation » (R15), `pied: aucun` — dans une tâche dont le périmètre contient
`scripts/n8n-specs-qa.mjs` (hors périmètre de 036-006).

## Les gestes préparés pour Benj (aucun n'est fait)

1. **Envoyer la demande d'accès** (texte prêt dans `.orchestre/preuves/036-006/resume.md`, section « La demande d'accès à l'API Business Profile ») depuis le compte Google qui possède
   le projet Google Cloud de Presti. Compléter les champs entre crochets (numéro du projet, e-mail de contact, URL des pages légales). Geste réservé : compte, jamais un agent.
2. **Attendre l'approbation**, puis activer l'API dans le projet et relever le quota affiché.
3. **Créer l'application OAuth** (lot 036-009) avec la seule portée de gestion de la fiche, écran de consentement au nom de Presti pour l'artisan (c'est l'écran de **connexion**, pas un écran de la fiche de l'artisan,
   donc le nom « Presti » y est permis ; il ne paraît jamais côté client final).
4. **Poser le nœud** : l'HTTP Request de lecture (`GET …/reviews`, jeton déchiffré), puis l'écriture **désactivée par défaut**, après l'amendement de la garde et l'accord écrit de Benj.
5. **Les paliers** : simulation (avis collés) → lecture réelle sur la fiche de test de Benj → mode ombre sur un compte volontaire → cartes réelles → jamais de publication sans clic.

## Ce que ce lot ne fait pas, dit en toutes lettres

- Aucun appel à Google, aucune demande envoyée, aucun compte, aucun projet, aucune clé, aucun identifiant n8n créé ou modifié.
- Le « Reply Poster » de la vidéo du 02/11 (`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md:363-368`) **n'est pas construit** ; son « Approval Desk » l'est (`lib-avis-repondre` : tout avis devient une carte).
- Une réponse positive qui part seule est **hors de la liste fermée** du pilote (`OUTIL_TYPE`, `lib/pilote/regles.ts:53-63`) tant que Benj n'a pas ajouté ce type après tests ; le juge rougit le jour où quelqu'un l'y met sans mettre à jour la copie du chef.

## Sources (à relire le jour de l'envoi)

- Référence Google `reviews.updateReply` : https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply (citée par `premiere-reponse.md:416`).
- Le nœud n8n `Google Business Profile` (ressource `review`, opérations `getAll`, `get`, `reply`, `delete`) : relevé `search_nodes` du 03/11/2026 sur le n8n d'Oracle.
- La page d'accès à l'API Business Profile et sa liste de conditions : à ouvrir par Benj depuis la console Google Cloud (je n'ai pas pu la lire).
