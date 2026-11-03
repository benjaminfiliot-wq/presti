## Ressources utilisées

- **Réseau neuronal, MCP `cerveau`** (skill `reseau-neuronal` chargé). `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique : interface systemeAgents en lecture seule ») a rendu une liste vide : aucune règle de plus que celles de `.claude/rules/*.md` et de `CLAUDE.md`, que j'ai suivies (n8n-first : l'app ne fait que l'interface ; aucune écriture en base ; rien d'envoyé). Je n'ai pas fait de `chercher`/`lire` supplémentaire, et je n'ai rien écrit dans le vault.
- **Prompt 6 (`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`) et plan `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`.** Je ne les ai pas rouverts en entier dans cette session : leurs décisions (double chemin B3, une question à la fois B4, tableau Studio / Signature, cinq décisions par défaut) m'ont été données par la tâche et par la preuve de 036-010 (`.orchestre/preuves/036-010/resume.md`, lue). C'est une limite, pas une relecture.
- **Les cinq maquettes de 036-010** (`plans/011-cadrage-01-11/p6-signature/maquettes/*.html`, lues en entier) : la feuille `maquettes.css` et le style de chaque écran ont été repris mécaniquement dans `app/systeme/systeme.css` (tout sous `.sys`, polices de l'app), la structure HTML a été portée en JSX. Les catalogues (19 outils, 7 départements, 14 types) sont comparés aux maquettes par le juge.
- **Vidéos déjà analysées** : le panneau « une question à la fois » et la ligne « fait : … » viennent de `plans/analyse-videos.md` l. 672 (via la preuve de 036-010) ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` § 3.3 et § 5 (coût de l'IA en clair, lot avec ses exclus) via la même preuve. Non rouverts ici ; les fiches de @restructureai sont écartées pour l'interface (consigne du 03/11).
- **Skill `presti-design`** (chargé) : corail `#D97757` seul accent, vert réservé au « validé », mouvement réduit respecté. **Code existant lu** : `lib/plans.ts` (`peut`), `lib/flags.ts`, `lib/assistant/confirmation.ts` et `app/api/assistant/actions/route.ts` (confirmer, écarter), `app/api/pilote/file/route.ts` (annuler un envoi), `lib/connexions/routes.ts` (retirer, démarrer Google), `lib/crm/serveur.ts` et `lib/crm/vue.ts` (lus sans être modifiés), migration `0193` (tables et colonnes lues).
- **Agents `presti-anim-accessibilite` et `presti-anim-marque`** (lecture seule, distincts de moi) : leurs revues sont détaillées plus bas, avec ce qui a été corrigé.

## Ce qui est livré

Tout est derrière le drapeau `systemeAgents` (baissé, `lib/flags.ts` non touché) : `layout.tsx` et chaque `page.tsx` appellent `notFound()` drapeau baissé (rien dans le DOM, 404) ; la route de lecture teste le drapeau avant la session et toute lecture.

| Écran | Route | Fichiers | Maquette |
|---|---|---|---|
| Centre de commande | `/systeme` | `CentreCommande.tsx`, `Cartes.tsx` | `centre-de-commande.html` |
| Ce qui a été fait | `/systeme/fait` | `Fait.tsx` | `ce-qui-a-ete-fait.html` |
| Connexions (19 outils) | `/systeme/connexions` | `Connexions.tsx` | `connexions.html` |
| Mes départements | `/systeme/departements` | `Departements.tsx` | `departements.html` |
| CRM « atelier » | `/systeme/clients` | `ClientsAtelier.tsx` | `crm-atelier.html` |

Lectures : `GET /api/systeme/[vue]` (`app/api/systeme/[vue]/route.ts`), lecture seule (POST, PUT, PATCH, DELETE répondent 405). Chaque requête filtre sur `artisan_id = uid` de la session. `connexions` ne lit jamais `secret_app` ni `secret_n8n` (liste blanche de colonnes dans `app/api/systeme/regles.ts`). Une table de 0193 pas encore posée répond « pas encore ouvert », jamais une fausse donnée.
Actions, uniquement par les routes qui existent : `POST /api/assistant/actions` (valider, écarter), `POST /api/pilote/file` (annuler un envoi en délai), `POST /api/connexions/retirer` et `/api/connexions/google/demarrer` (404 tant que `connexions` est baissé). Aucune logique d'automatisation dans l'app.
Verrou d'offre : `peut()` seulement (`regles.ts` : `verrouDe`, `estSignature`) ; en Studio « Part seul : inclus dans Signature » est visible et verrouillé. Les gestes « Toujours à vous » et « Bientôt, après essais » sont verrouillés pour toutes les offres.
Double chemin : chaque feu vert et « Annuler l'envoi » a son lien manuel (`data-manuel`). Une question à la fois : `PanneauQuestion` (« Question n sur N »), servi au centre de commande et au CRM ; les questions sont des lacunes réelles (chantier sans date de début), les réponses se font dans l'outil du métier.
CRM : `app/crm/**` et `lib/crm/**` non modifiés ; chiffres « lu dans … le … » ; import en trois temps dont l'aperçu se fait dans le navigateur, sans rien écrire ; « Valider l'import » reste désactivé tant que le circuit d'écriture n'est pas ouvert.

## Écarts aux maquettes (assumés)

- Les interrupteurs et le palier de « Mes départements » s'affichent désactivés : aucune route d'écriture n'existe, et l'ombre/le réel se posent par la mise en service du compte.
- « Tout mettre en pause » est un lien vers les réglages, pas une écriture.
- « Préparé » = actions directes exécutées par l'assistant ; « Repéré » = demandes des 7 derniers jours. Les « fait : … » viennent de ce que la carte a réellement enregistré, jamais d'un texte inventé.
- Le bandeau « Maquette · données d'exemple » et les noms « Exemple. … » ne sont pas repris : l'écran lit les vrais comptes.
- Pas de bloc « aperçu de la prochaine action recommandée » dans la fiche CRM : aucune source de données n'existe encore.
- **Captures 390 et 1440 px : non prises.** Pas de build ni de serveur sur l'hôte d'agents (`securite.md`) ; à faire sur le PC. Le juge ne rend pas les pages dans un navigateur.

## Revue d'accessibilité (`presti-anim-accessibilite`) et de marque (`presti-anim-marque`)

Corrigé : aperçu signé du nom de l'artisan (et non « de votre nom ») ; identifiants techniques remplacés par des libellés français (« Action préparée » en repli) ; canal brut retiré ; couleurs du schéma passées aux jetons ; « IMAP et SMTP » dit « Autre boîte mail (Orange, Free…) » ; bouton « Choisir un fichier » accessible au clavier ; messages de retour dans une zone `role="status"` permanente ; noms accessibles contextualisés (Valider, Écarter, Retirer, Connecter, Annuler l'envoi) ; titres de page ; Connexions ajouté à la barre du bas mobile ; nom de l'interrupteur sans son état ; `aria-controls` sur la confirmation de retrait ; étape d'import « terminée » dite au lecteur d'écran ; séparateur dans le compteur « À valider » ; tableau d'aperçu atteignable au clavier ; question annoncée (`aria-live`) et bouton « Plus tard » retiré s'il n'y a qu'une question ; landmarks homonymes renommés ; `dateTime` sur `<time>`.
Non repris : gestion fine du focus à l'ouverture de la confirmation de retrait, état « mixte » de la case « Tout sélectionner », zone tactile de 44 px autour des cases à cocher (à traiter avec les captures sur le PC).

## Le juge `scripts/interface-p6-qa.mjs`

Il lit le code réel, rejoue `app/api/systeme/regles.ts` sous le chargeur TypeScript (drapeau baissé → 404, verrous contre `peut()` pour sept offres, colonnes sans secret) et compare les catalogues aux maquettes. Mutants refusés (18 statiques, 4 dynamiques) : drapeau baissé qui rend la page (centre, CRM, Connexions, layout) ; route lue avant le drapeau ; `plan === 'studio'` et `offre === 'signature'` en dur ; écriture hors des routes existantes ; écriture en base depuis la route ; secret de connexion lu (colonnes, écran) ; lecture sans filtre sur le compte ; « Presti » sur une surface artisan ; bouton d'assistant sans chemin manuel ; jargon à l'écran ; question à la fois cassée ; import CRM qui écrit ; CSS global ; garde qui ignore le drapeau ; verrou qui ignore `peut()` ; geste « toujours à vous » ouvert ; Signature décidée par le nom de l'offre. Un mutant dont le motif est introuvable compte comme un échec du juge.
Limite : contrôle de code et de règles pures ; aucun rendu navigateur, donc ni contraste mesuré ni capture.

Sortie : `✓ interface-p6-qa : 89 contrôles, 18 mutants statiques et 4 mutants dynamiques refusés, 5 écrans, 19 outils, 7 départements`. `npx tsc --noEmit` : aucune erreur. `offres-affichage-qa` : 95 verts, 0 rouge.
