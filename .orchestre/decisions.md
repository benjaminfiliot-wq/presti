# Décisions — les choix que les agents prennent seuls

Ce fichier évite qu'un agent s'arrête pour une question qui a déjà une réponse. Avant d'écrire une
`<id>.question.md`, l'agent lit ce tableau. Si la question y est, il applique le défaut sans demander.

| Question | Défaut retenu | Réversible ? |
|---|---|---|
| Photo libre de droits ou générée ? | Libre de droits, créditée (auteur, source, licence dans le dépôt) | Oui |
| Animation lourde sur mobile ? | Non : bureau ≥ 1024 px seulement, et jamais quand `prefers-reduced-motion` est actif | Oui |
| Nom d'une démo (entreprise, personne) ? | Inventé, puis vérifié au registre des entreprises pour ne pas tomber sur une vraie | Oui |
| Doute sur une copie (texte, accroche, promesse) ? | La version la plus sobre | Oui |
| Dépendance nouvelle (paquet npm, service) ? | Non, sauf tâche dédiée qui la nomme | Oui, tant qu'elle n'est pas posée |
| Migration de schéma ? | Jamais par un agent : question à Benj | Non |

## La règle

- Question absente de la liste → l'agent choisit l'**option réversible**, l'écrit ici (une ligne dans le tableau,
  date et id de tâche dans la colonne « Défaut retenu »), et continue. Pas de question, pas d'attente.
- Benj ne reçoit que trois types de questions :
  1. **de l'argent à engager** (abonnement, achat, crédit API au-delà de la tâche) ;
  2. **une action irréversible** (suppression, envoi, publication, migration, paiement) ;
  3. **une posture de marque** (ton, promesse, prix affiché, nom public).
  Tout le reste se tranche ici.

## Décisions ajoutées par les agents

<!-- une ligne par décision, du plus récent au plus ancien : | question | défaut retenu (date, id) | réversible ? | -->

| Question | Défaut retenu | Réversible ? |
|---|---|---|
| Le juge vidéo exige 3 000 kbps et une piste son ; la capture de la landing doit être muette et ≤ 1,5 Mo ? | Un profil `--profil=landing` dans `scripts/video-qa.mjs` (16:9, muette, ≤ 1,5 Mo), mêmes seuils de figé, d'énergie et de coupes ; le profil réseaux ne change pas (2026-09-14, 016-03) | Oui |
| Qui note la démo sur la grille C1–C8 ? | Un sous-agent qui n'a pas construit la démo et n'a pas lu les notes antérieures, et qui re-note aussi les références (2026-09-14, 016-02) | Oui |
| Les leçons Design Rocket et les prompts MotionSites premium sont payants (compte de Benj en Free Plan) ? | Ne rien débloquer, rien cliquer ; fixer le niveau sur les aperçus publics (images-clés des WebP/MP4 du catalogue) — l'abonnement est une question d'argent pour Benj (2026-09-14, 016-01) | Oui |
| Le navigateur d'Antigravity n'a pas les sessions de Benj ? | Aperçus publics pour MotionSites ; Claude in Chrome (le vrai Chrome de Benj) pour ce qui exige sa session, en lecture seule (2026-09-14, 016-01) | Oui |
| Nom de la démo unique ? | « Atelier Lestraque », Rennes — 0 résultat au registre (`recherche-entreprises.api.gouv.fr`) ; « Bellevigne » et « Vernet » écartés (homonymes) (2026-09-14, 016-02) | Oui |
| Photos de la démo : Unsplash/Pexels (clé API à créer) ou Commons ? | Commons, recherche par catégories, provenance prouvée par `photos-provenance.mjs` ; pas de compte à créer (2026-09-14, 016-02) | Oui |
| Le h1 « Le bois, sur mesure » (plus beau) ou « Menuisier à Rennes » (exigé par le juge SEO) ? | « Menuisier à Rennes » en titre monumental, la promesse en kicker (2026-09-14, 016-02) | Oui |
| Une démo servie par Next depuis `public/` perd ses styles sans barre finale ? | Liens internes des démos vers `index.html` (générateur) plutôt qu'une règle globale `trailingSlash` dans `next.config.mjs` (2026-09-14, 016-02) | Oui |
| Benj demande de connecter Gemini CLI via Chrome (point 4) ? | Fait le 2026-09-14 à 14 h 38 : la connexion Google aboutit (identifiants enregistrés dans ~/.gemini, aucun mot de passe tapé), mais Google refuse ensuite l'offre gratuite à ce client (IneligibleTierError UNSUPPORTED_CLIENT, « migrate to the Antigravity suite »). Gemini gratuit = Antigravity ; Gemini CLI ne marche plus qu'avec une clé d'API, que Claude Code ne manipule pas (à Benj s'il la veut). scripts/executant.mjs corrigé | Oui |
| La démo passe 8/8 à la médiane de la grille, mais Benj la juge « loin encore du résultat que je veux » (14/09, vers 14 h 30) ? | La barre par défaut de `grille-qa.mjs` devient le 3e quartile des références (`--barre=haut`), la médiane reste disponible (`--barre=mediane`). Écart mesuré par un workflow à sept angles avant toute retouche ; la réaction de Benj reste la mesure finale | Oui |
