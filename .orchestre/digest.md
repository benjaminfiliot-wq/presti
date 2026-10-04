<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-10-04T12:56:48Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 176 tâche(s) PASS, 213793 ligne(s) · faites par Claude Code : 97 tâche(s) PASS, 81982 ligne(s).
**État** — file : 12 · en cours : 8 · faites : 283 · refusées : 15

## Attention (7)
- 026-138 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-138 --forcer`
- 026-156 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-156 --forcer`
- 026-254 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-254 --forcer`
- 026-103 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-103 --forcer`
- 026-227 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-227 --forcer`
- 026-087 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-087 --forcer`
- 026-221 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-221 --forcer`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-120 | feature | en-cours | ag-026-120 | — | depuis 2026-10-04T09:43:28Z · Remplir le cadre des panneaux de la station : chaque salle cliquée ouvre son panneau (Recettes et Trésorerie, Usine à sites, Atelier des maquettes, Salle de réunion, Salle des envois avec les gestes du fondateur, Standard, Rédaction, Salle des machines ; les quatre autres ouvrent la fiche de leurs agents en attendant 026-164), et chaque agent sa fiche (tâches récentes, coût par tâche, consignes, boîtes, réponses, Pause), lus par la route de la station seulement pendant qu'ils sont ouverts, sourcés, sans aucun bouton d'envoi, à 390 px comme à 1440 px |
| 026-150 | test | en-cours | usine-codex-1399 | — | depuis 2026-10-04T10:47:49Z · Écrire scripts/juges-026-securite-mutations.mjs, qui prouve sur des copies que media-octets-qa, instantane-quotidien-qa, git-garde-qa et next16-qa (mode --statique) échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-152 | test | en-cours | usine-codex-1409 | — | depuis 2026-10-04T11:13:28Z · Écrire scripts/juges-026-lt-mutations.mjs, qui prouve sur des copies que chacun des 16 juges du domaine livraison et trésorerie échoue, sur le critère attendu, face à une vraie faute plantée dans le code PASS, et passe sur l'arbre réel ; code 0 seulement si chaque mutation est prise et chaque témoin passe |
| 026-159 | test | en-cours | usine-codex-1422 | — | depuis 2026-10-04T12:06:23Z · Écrire scripts/juges-026-pubs-contenu-mutations.mjs, qui prouve sur des copies que chaque juge du domaine pubs et contenu échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et chaque témoin passe |
| 026-177 | feature | en-cours | usine-codex-1416 | — | depuis 2026-10-04T11:34:19Z · Créer GET et PUT /api/controle/station/reglages (les deux commencent par actif('pilotage') → 404 ; GET sous sante, PUT sous estDirection, domaine reglages, verbe ecrire ; validerReglages côté serveur ; version périmée → 409 ; journal avant et après ; 64 Ko et 30 écritures par jour au plus), et inscrire le fichier dans la ligne pilotage de scripts/fermeture-e2e.mjs, jusqu'au vert de station-reglages-qa |
| 026-178 | feature | en-cours | claude-code | — | depuis 2026-10-04T12:14:50Z · Donner un lecteur, sous son domaine, à chaque vue de salle de la station qui rend encore « arrive avec sa fiche » (commandement, radar par pilotage_radar, audience, securite, presti, observatoire, repos, et ce qui reste de crieur, studio et chantier), remplir la sous-partie sante de direct.barre, ACTIVE AUJ. par pilotage_activite_salles et la répartition par nature de la Trésorerie, par les fonctions de 026-174 et 026-175, la salle ecommerce restant réservée, jusqu'au vert de station-route-qa --partie=salles2 |
| 026-240 | test | en-cours | usine-codex-1412 | — | depuis 2026-10-04T11:15:55Z · Écrire scripts/juges-026-savoir-mutations.mjs, qui mute sur des copies isolées les quatre juges de la couche Savoir (savoir-socle-qa, savoir-recherche-qa, savoir-lecons-qa, savoir-reflexion-qa) une faute à la fois et prouve que chacune est prise par le critère attendu, témoin intact vert, jusqu'au vert du méta-juge de 026-001 |
| 026-243 | feature | en-cours | usine-codex-1419 | — | depuis 2026-10-04T11:50:41Z · lib/direction/comptable.ts (rapprochement Stripe en lecture seule avec chaque vente et chaque abonnement, suivi du seuil de franchise 293 B daté, préparation — jamais dépôt ni paiement — des montants de déclaration, libellé sous Codex seulement) au-dessus de lib/direction/tresorerie.ts et sous l'identité de bus tresorier, avec une route de lecture app/api/controle/comptable/route.ts gardée par le jeton de l'agent, et un passage périodique par pg_cron |
| 026-151 | test | file | codex | — | Écrire scripts/juges-026-orchestre-chef-mutations.mjs, qui prouve sur des copies que preuve-026 (groupes source, baux, quota), chef-qa, revue-qa et chantier-qa échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-092 | feature | file | codex | — | Créer GET /api/controle/station?vue=direct\|fil\|salle\|agent (404 tant que le drapeau pilotage est baissé, garde fondateur, chaque sous-partie sourcée et lue seulement par les fonctions pilotage_* et station_* et les modules purs de lib/pilotage), lib/pilotage/station.ts, et les deux routes de la réunion réservées au jeton du Chef (POST /api/agents/reunion : ouvrir, clore, abandonner ; GET /api/agents/reunion/chiffres), inscrites dans la ligne pilotage de scripts/fermeture-e2e.mjs |
| 026-111 | feature | file | antigravity | — | Créer la station /controle/station (Mission Control plein écran, derrière le drapeau pilotage) : barre des compteurs en deux lignes, équipage, file Attention unique, Commandement (objectif, missions, niveau, compte rendu), bandeau des ventes, mise en page colonnes ou flottante, disposition téléphone à onglets, réglages lus au chargement, cadres réservés à la carte (avec la liste des salles), au journal, aux panneaux, aux vues et à l'habillage, jetons .mc-* par défaut dans le seul fichier de la station, et l'entrée « Station » du Poste qui y renvoie |
| 026-099 | test | file | codex | — | Écrire scripts/juges-026-envoi-mutations.mjs, qui prouve sur des copies que les huit juges de l'envoi automatique, de l'entrant et de la fabrication (disjoncteurs-qa, jauges-qa, facteur-qa, meta-webhooks-qa, repondeur-qa, rendez-vous-qa, maquette-video-qa, douleurs-qa) échouent chacun sur de vraies fautes avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-123 | feature | file | ag-1 | — | Remplir le cadre du journal de la station : le Journal de bord en direct (une bulle par événement réel, pastille de l'agent, heure de Paris, texte en police mono, filtre par agent, comptes rendus de réunion groupés) et le champ « ▶ Transmettre à l'équipage… » qui envoie la consigne de Benj à la route de 026-074, sans jamais afficher une bulle que le fil n'a pas servie |
| 023-03 | test | file | claude-code | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | claude-code | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-172 | test | file | claude-code | — | Écrire le juge d'écran de la station Claw3D station-ecran-qa (--partie=verite\|camera\|acteurs\|calque\|themes\|reglages\|salles2 [--lot=a\|b]\|webkit, sur la copie aux drapeaux pilotage et stationCarte levés, avec la session simulée de 026-170, captures prises par le juge), le script de recette de la carte station-recette.mjs (--avant, --reel, --constat) et le lot e de la preuve, chacun échouant sur la référence avec son premier critère et passant son témoin |
| 026-179 | feature | file | codex | — | Copier dans app/controle/station/moteur/claw3d/ le squelette 2D de Claw3D que garde le §0.3 (hôte Phaser réécrit en mode station seul avec un module CSS, pont vers React, types de carte, buildNavGrid2D et astar2D, générateur d'avatar) et, dans moteur/scene/, la scène pixel art de l'atelier sans roomFor, le peintre d'agents et la seule palette, avec LICENSE-claw3d.txt et PROVENANCE.md ; écrire le point d'entrée moteur/entree.tsx et ses accroches vides ; charger ce point d'entrée dans Carte.tsx par next/dynamic sans rendu serveur, seulement drapeau stationCarte levé ; poser stationCarte: false et sa ligne de carte ; ajouter station\/.* à CHEMINS_APP_PRESTI de proxy.ts, jusqu'au vert de station-claw3d-qa (provenance, garde, csp, poids, repos, hygiene) |
| 026-199 | test | file | claude-code | — | Écrire scripts/usine-pubs-qa.mjs (critères UP, parties routes, tourneur, unites et reel : la fabrication des packs pubs payés et des échantillons du Studio sur l'usine, PC éteint, par la chaîne gratuite) et scripts/search-console-qa.mjs (critères SC : la soumission automatique du plan d'un site vendu à la Search Console par un compte de service), avec leurs jeux d'essai, et prouver qu'ils échouent aujourd'hui et passent en témoin |
| 026-244 | test | file | claude-code | — | Écrire scripts/sav-qa.mjs (critères SAV) et ses jeux d'essai (messages de clients déjà payants dont un corpus d'injection, brouillons factices, compteur des 20 approbations sans retouche, cas remboursement et litige) qui prouvent que le module du SAV répond dans le fil du bon client avec le ton de Presti, ne part jamais sans un portier, escalade tout remboursement ou litige à Benj, et n'envoie une donnée de client qu'à Codex ou à un moteur local, jamais à un gratuit ni à un :cloud |
| 026-246 | test | file | claude-code | — | Écrire scripts/qualite-sites-qa.mjs (critères QSI) et ses jeux d'essai (serveur factice de sites livrés avec des pannes réglables : HTTP, HTTPS, poids, accessibilité, liens morts, mentions légales absentes, formulaire cassé) qui prouvent que le Contrôleur qualité mesure le rendu réel d'un site livré sans jamais le modifier, sans jamais soumettre un faux message dans son formulaire, et propose une correction au Livreur ou à Claude Code par une décision plutôt que d'agir lui-même |
| 026-083 | feature | fait | claude-code | PASS | 2026-10-04T12:53:56Z · 70s · 0 l. |
| 026-173 | feature | fait | codex | PASS | 2026-10-04T12:53:17Z · 45s · 0 l. |
| 026-242 | test | fait | claude-code | PASS | 2026-10-04T12:45:45Z · 81s · 0 l. |
| 026-237 | feature | fait | claude-code | FAIL | FAIL SVL-11 — package.json diffère de HEAD (117 s) |
| 026-174 | feature | fait | codex | DISJONCTÉE | decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche \| decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-170 | test | fait | claude-code | FAIL | decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-195 | feature | fait | codex | PASS | 2026-10-04T12:21:30Z · 68s · 0 l. |
| 026-171 | test | fait | claude-code | PASS | 2026-10-04T11:36:10Z · 728s · 0 l. |
| 026-175 | feature | fait | claude-code | PASS | 2026-10-04T11:17:24Z · 55s · 0 l. |
| 026-134 | feature | fait | claude-code | PASS | 2026-10-04T11:15:52Z · 45s · 0 l. |
| 026-217 | feature | fait | claude-code | PASS | 2026-10-04T11:14:35Z · 40s · 0 l. |
| 026-151 | test | fait | codex | DISJONCTÉE | bail expiré : usine-codex-126 silencieux depuis 135 min \| bail expiré : codex-mutations-151 silencieux depuis 2125 min \| decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-194 | test | fait | claude-code | PASS | 2026-10-04T11:09:44Z · 138s · 0 l. |
| 026-176 | feature | fait | codex | PASS | 2026-10-04T11:03:54Z · 43s · 0 l. |
| 026-099 | test | refuse | codex | DISJONCTÉE | bail expiré : usine-codex-486 silencieux depuis 133 min \| bail expiré : usine-codex-717 silencieux depuis 133 min \| bail expiré : codex silencieux depuis 131 min |
| 026-117 | feature | fait | antigravity | PASS | 2026-10-02T18:21:46Z · 143s · 2092 l. |
| 026-113 | feature | fait | antigravity | PASS | 2026-10-02T08:48:16Z · 100s · 1491 l. |
| 026-122 | feature | fait | codex | PASS | 2026-09-30T15:47:04Z · 28s · 0 l. |
| 026-259 | feature | fait | codex-rearmement-259 | PASS | 2026-09-30T15:30:32Z · 15s · 516 l. |
| 026-167 | test | fait | codex-reprise-167 | PASS | 2026-09-30T15:26:36Z · 276s · 806 l. |
| 026-258 | feature | fait | antigravity | PASS | 2026-09-30T10:57:29Z · 3s · 0 l. |
| 026-257 | feature | fait | codex-relais-compat-0930 | PASS | 2026-09-30T10:52:08Z · 119s · 445 l. |
| 026-225 | test | fait | codex-relais-0930 | PASS | 2026-09-30T10:23:11Z · 0s · 744 l. |
| 026-133 | test | fait | codex | PASS | 2026-09-30T08:24:52Z · 617s · 0 l. |
| 026-087 | feature | refuse | usine-codex-688 | DISJONCTÉE | bail expiré : usine-codex-332 silencieux depuis 133 min \| bail expiré : usine-codex-492 silencieux depuis 133 min \| bail expiré : usine-codex-688 silencieux depuis 132 min |
| 026-221 | feature | refuse | usine-codex-697 | DISJONCTÉE | bail expiré : usine-codex-344 silencieux depuis 132 min \| bail expiré : usine-codex-501 silencieux depuis 132 min \| bail expiré : usine-codex-697 silencieux depuis 131 min |
| 026-226 | feature | refuse | usine-codex-699 | DISJONCTÉE | bail expiré : usine-codex-345 silencieux depuis 132 min \| bail expiré : usine-codex-502 silencieux depuis 132 min \| bail expiré : usine-codex-699 silencieux depuis 131 min |
| 026-091 | test | fait | usine-codex-672 | PASS | 2026-09-30T04:00:24Z · 560s · 1682 l. |
| 026-145 | feature | fait | usine-codex-506 | PASS | 2026-09-30T01:29:21Z · 35s · 519 l. |
| 026-239 | feature | fait | usine-codex-503 | PASS | 2026-09-30T01:22:15Z · 41s · 1050 l. |
| 026-008 | feature | fait | claude-code | PASS | 2026-09-29T21:35:24Z · 444s · 825 l. |
| 026-162 | feature | fait | claude-code | PASS | 2026-09-29T21:19:32Z · 8s · 0 l. |
| 026-096 | feature | fait | claude-code | PASS | 2026-09-29T21:11:58Z · 44s · 1218 l. |
| 026-166 | feature | fait | claude-code | PASS | 2026-09-29T21:11:44Z · 10s · 7 l. |
| 026-095 | feature | fait | codex | PASS | 2026-09-29T20:47:05Z · 147s · 0 l. |
| 026-157 | feature | fait | codex | PASS | 2026-09-29T20:43:52Z · 182s · 0 l. |
| 026-213 | feature | fait | codex | PASS | 2026-09-29T20:02:17Z · 9s · 0 l. |
| 026-156 | feature | refuse | antigravity | FAIL | decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-227 | feature | refuse | usine-codex-198 | DISJONCTÉE | bail expiré : usine-codex-169 silencieux depuis 79 min \| bail expiré : usine-codex-187 silencieux depuis 64 min \| bail expiré : usine-codex-198 silencieux depuis 60 min |
| 026-218 | feature | fait | codex | PASS | 2026-09-29T19:19:13Z · 140s · 0 l. |
| 026-214 | feature | fait | codex | PASS | 2026-09-29T19:17:34Z · 21s · 0 l. |
| 026-212 | feature | fait | codex | PASS | 2026-09-29T19:14:45Z · 44s · 0 l. |
| 026-090 | feature | fait | codex | PASS | 2026-09-29T18:58:19Z · 94s · 0 l. |
| 026-103 | feature | refuse | usine-codex-188 | DISJONCTÉE | bail expiré : usine-codex-165 silencieux depuis 61 min \| bail expiré : usine-codex-182 silencieux depuis 60 min \| bail expiré : usine-codex-188 silencieux depuis 70 min |
| 026-254 | contenu | refuse | usine-codex-183 | DISJONCTÉE | bail expiré : usine-codex-144 silencieux depuis 63 min \| bail expiré : usine-codex-170 silencieux depuis 77 min \| bail expiré : usine-codex-183 silencieux depuis 61 min |
| 026-088 | feature | fait | claude-code | PASS | 2026-09-29T17:57:02Z · 18s · 2310 l. |
| 026-089 | feature | fait | codex | PASS | 2026-09-29T17:30:22Z · 74s · 0 l. |
| 026-147 | feature | fait | antigravity | PASS | 2026-09-29T16:33:19Z · 185s · 0 l. |
| 026-210 | feature | fait | claude-code | PASS | 2026-09-29T16:28:58Z · 12s · 695 l. |
| 026-085 | feature | fait | claude-code | PASS | 2026-09-29T16:23:22Z · 56s · 1120 l. |
| 026-138 | audit | refuse | claude-code | DISJONCTÉE | bail expiré : claude-code silencieux depuis 919 min \| bail expiré : claude-code silencieux depuis 61 min \| bail expiré : claude-code silencieux depuis 60 min |
| 026-209 | feature | fait | codex | PASS | 2026-09-29T15:13:06Z · 24s · 0 l. |
| 026-236 | feature | fait | codex | PASS | 2026-09-29T15:03:52Z · 109s · 0 l. |
| 026-084 | feature | fait | codex | PASS | 2026-09-29T14:52:34Z · 70s · 0 l. |
| 026-144 | feature | fait | antigravity | PASS | 2026-09-29T14:52:29Z · 48s · 0 l. |
| 026-215 | feature | fait | codex | PASS | 2026-09-29T14:26:12Z · 17s · 0 l. |
| 026-233 | feature | fait | codex | PASS | 2026-09-29T14:24:37Z · 74s · 0 l. |
| 026-224 | feature | fait | codex | PASS | 2026-09-29T14:23:56Z · 21s · 0 l. |
| 026-073 | contenu | fait | codex | PASS | 2026-09-29T13:54:07Z · 27s · 0 l. |
| 026-207 | feature | fait | claude-code | PASS | 2026-09-29T13:08:19Z · 13s · 0 l. |
| 026-139 | feature | fait | claude-code | PASS | 2026-09-29T13:07:04Z · 74s · 990 l. |
| 026-235 | feature | fait | usine-codex-133 | PASS | 2026-09-29T12:28:37Z · 118s · 915 l. |
| 026-222 | feature | fait | claude-code | PASS | 2026-09-29T12:26:08Z · 1s · 400 l. |
| 026-208 | feature | fait | antigravity | PASS | 2026-09-29T12:13:49Z · 0s · 0 l. |
| 026-206 | feature | fait | claude-code | PASS | 2026-09-29T12:13:36Z · 0s · 2334 l. |
| 026-253 | feature | fait | claude-code | PASS | 2026-09-29T12:08:44Z · 419s · 0 l. |
| 026-158 | feature | fait | antigravity | PASS | 2026-09-29T11:51:24Z · 425s · 0 l. |
| 026-006 | feature | fait | claude-code | PASS | 2026-09-29T11:47:23Z · 381s · 9610 l. |
| 026-211 | feature | fait | claude-code | PASS | 2026-09-29T11:46:52Z · 1s · 473 l. |
| 026-205 | feature | fait | claude-code | PASS | 2026-09-29T11:22:24Z · 2s · 1053 l. |
| 026-045 | test | fait | claude-code | PASS | 2026-09-29T11:01:29Z · 206s · 0 l. |
| 026-231 | feature | fait | codex | PASS | 2026-09-29T10:58:48Z · 53s · 0 l. |
| 026-047 | feature | fait | codex | PASS | 2026-09-29T10:55:47Z · 509s · 0 l. |
| 026-079 | feature | fait | claude-code | PASS | 2026-09-29T10:48:36Z · 24s · 0 l. |
| 026-238 | test | fait | claude-code | PASS | 2026-09-29T10:28:24Z · 565s · 0 l. |
| 026-129 | feature | fait | usine-codex-118 | PASS | 2026-09-29T10:07:47Z · 219s · 937 l. |
| 026-141 | feature | fait | codex | PASS | 2026-09-29T10:01:36Z · 221s · 0 l. |
| 026-064 | feature | fait | usine-codex-114 | PASS | 2026-09-29T09:54:39Z · 41s · 612 l. |
| 026-026 | test | fait | claude-code | PASS | 2026-09-29T09:48:57Z · 1084s · 0 l. |
| 026-127 | feature | fait | usine-codex-117 | PASS | 2026-09-29T09:48:36Z · 74s · 584 l. |

… 218 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
