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
| Ouvrir les deux prompts MotionSites gratuits restants (vote : stillmind, church-community) ? | Pas maintenant (2026-09-14, vers 15 h). Le contradicteur montre que l'effet phare de stillmind est dans sa vidéo et que l'entrée de church-community est un montage de présentation ; et l'analyse des écarts (sept angles + synthèse) donne un plan précis dont le manque principal est la composition de page, qu'aucun des douze aperçus gratuits n'enseigne. Les deux ouvertures restent en réserve (irréversibles) ; fiches des douze aperçus : scratchpad refs-libres | Oui |
| La vidéo de la landing (lestraque.mp4) filme la galerie de la démo, dont deux photos CC BY-SA (vastringue 3.0, rabot japonais 4.0) et un héros CC BY 2.0 sans crédit à côté de la vidéo ? | Relevé le 2026-09-14 vers 15 h. Refaire la vidéo juste après la vague 1 (nouvelles photos en cours, CC0 / domaine public / CC BY de préférence), avec une ligne de crédits sous la vidéo qui renvoie aux attributions ; pas de réenregistrement pendant que les agents modifient la démo | Oui |
| Dix démos métier ou une seule ? | Benj, 2026-09-14 vers 17 h 10 (entre le lancement de la vague 2 à 17 h 07 et sa relance à 17 h 11 ; « vers 16 h » écrit d'abord était faux) : « pas besoin d'en faire 10, seulement un est suffisant ». Les retouches visent Lestraque seul ; les neuf démos métier restent gelées telles qu'en ligne (commit efda4a7), plus régénérées ni jugées ; le générateur peut prendre des chemins propres à Lestraque (regénéralisation plus tard). Vague 2 arrêtée après un seul agent démarré (aucun fichier modifié) et relancée ainsi | Oui |
| Quels dossiers donner à Codex quand l'orchestre le lance ? Le projet « presti » de l'application Codex de Benj contient presti ET presti-secrets | Le 2026-09-14 vers 21 h : presti en écriture (bac à sable workspace-write, réseau autorisé) et le vault SaaS en plus (le prompt de tâche le fait lire) ; PAS presti-secrets — aucune tâche n'en a besoin et un exécutant n'écrit pas à côté des secrets. Jamais le « danger-full-access » que ~/.codex/config.toml règle pour l'application ; effort de raisonnement medium par défaut (none en exec sinon) | Oui |
| Codex (tâche 018-01) échoue à vérifier : son bac à sable Windows refuse à Node de lancer des sous-processus (spawn EPERM) ; faut-il lui ouvrir l'accès complet ? | Non (2026-09-14 vers 21 h 30) : on garde workspace-write. Son travail est juste (018-01 PASS en 15 s lancé hors bac à sable par Claude Code). La boucle passe dans scripts/executant.mjs : Codex écrit sans lancer verifier/npm/Playwright, le vérificateur tourne hors bac à sable juste après, et sa sortie revient à Codex en cas d'échec (--boucle=3) | Oui |
| Le réétalonnage du héros (018-08, Antigravity) passe son juge : faut-il le mettre en ligne ? | Non (2026-09-14 vers 22 h 30). Regardé par Claude Code sur avant-apres.jpg : image délavée, bois gris-beige laiteux, fond noir devenu gris, portrait crayeux et verdâtre — pire que l'original trop jaune. Le juge passait parce qu'il bornait la teinte (b* 15,6) et les noirs (0,1 %) sans plancher de contraste : aplatir l'image suffisait. Images et entrées du héros remises dans leur état d'avant ; juge renforcé (écart-type de L*, noirs gardés dans une fourchette) avant un réétalonnage plus doux, regardé avant tout commit | Oui |
