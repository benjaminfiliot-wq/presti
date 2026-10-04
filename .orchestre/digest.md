<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-10-04T23:52:08Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex) : 196 tâche(s) PASS, 226026 ligne(s) · faites par Claude Code : 104 tâche(s) PASS, 91457 ligne(s).
**État** — file : 6 · en cours : 13 · faites : 335 · refusées : 6

## Attention (1)
- 026-151 est DISJONCTÉE (trop d'échecs) : corrige, puis `node scripts/orchestre.mjs rejouer 026-151 --forcer`

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 026-159 | test | en-cours | claude-code | — | depuis 2026-10-04T23:38:53Z · Écrire scripts/juges-026-pubs-contenu-mutations.mjs, qui prouve sur des copies que chaque juge du domaine pubs et contenu échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et chaque témoin passe |
| 026-099 | test | en-cours | claude-code | — | depuis 2026-10-04T23:29:49Z · Écrire scripts/juges-026-envoi-mutations.mjs, qui prouve sur des copies que les huit juges de l'envoi automatique, de l'entrant et de la fabrication (disjoncteurs-qa, jauges-qa, facteur-qa, meta-webhooks-qa, repondeur-qa, rendez-vous-qa, maquette-video-qa, douleurs-qa) échouent chacun sur de vraies fautes avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-150 | test | en-cours | claude-code | — | depuis 2026-10-04T23:01:46Z · Écrire scripts/juges-026-securite-mutations.mjs, qui prouve sur des copies que media-octets-qa, instantane-quotidien-qa, git-garde-qa et next16-qa (mode --statique) échouent chacun sur de vraies fautes et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue avec le critère attendu et chaque témoin passe |
| 026-240 | test | en-cours | claude-code | — | depuis 2026-10-04T23:11:42Z · Écrire scripts/juges-026-savoir-mutations.mjs, qui mute sur des copies isolées les quatre juges de la couche Savoir (savoir-socle-qa, savoir-recherche-qa, savoir-lecons-qa, savoir-reflexion-qa) une faute à la fois et prouve que chacune est prise par le critère attendu, témoin intact vert, jusqu'au vert du méta-juge de 026-001 |
| 026-101 | test | en-cours | claude-code | — | depuis 2026-10-04T22:52:08Z · Écrire scripts/juges-026-acquisition-mutations.mjs, qui prouve sur des copies que chaque juge du domaine acquisition passe sur l'arbre réel et échoue, sur le critère nommé, pour chacune des mutations imposées par cette fiche, et qui sort en code 0 seulement si toutes échouent |
| 026-132 | test | en-cours | claude-code | — | depuis 2026-10-04T23:01:47Z · Écrire scripts/juges-026-station-ecran-mutations.mjs, qui prouve sur des copies que le juge d'écran de la station (pilotage-ecran-qa, six parties : station, vues, salles, fil, gestes, experience) échoue sur une vraie faute avec le critère nommé et passe sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-161 | test | en-cours | claude-code | — | depuis 2026-10-04T23:11:35Z · Écrire scripts/juges-026-mutations.mjs, qui prouve sur des copies que les juges qu'aucune fiche de mutations de domaine ne contre-vérifie (agents-llm-qa, ops-acquisition-qa, les deux juges 025 adaptés à Next 16, webhook-muet-qa amendé par 026-108, pont-orchestre-qa et prospects-entrant-qa de 026-142, et juges-026-preuve lui-même) échouent sur une vraie faute avec le critère nommé et passent sur l'arbre intact, puis que chaque juge de la série a au moins une mutation attrapée dans un rapport ; code 0 seulement si tout est pris |
| 026-186 | feature | en-cours | claude-code | — | depuis 2026-10-04T23:46:55Z · Donner à la carte sa forme de téléphone : un cadre de 358 px en vue d'ensemble ou sur la grille portrait du thème, le pincement dans le cadre seulement, +, − et ⊞ de 44 px, les plaques à partir du zoom ×2, touch-action: none, gesturestart bloqué sous Safari, la perte de contexte rattrapée, et scrollWidth ≤ 390, jusqu'au vert de station-ecran-qa (webkit) et de station-claw3d-qa (contexte) |
| 026-191 | test | en-cours | claude-code | — | depuis 2026-10-04T23:02:36Z · Écrire scripts/juges-026-station-claw3d-mutations.mjs, qui prouve sur des copies, sur l'usine, que les juges de rendu de la station Claw3D (station-claw3d-qa, station-ecran-qa, station-themes-qa, station-planche-qa, ecommerce-reservee-qa) échouent sur une vraie faute avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et chaque témoin passe |
| 026-192 | test | en-cours | claude-code | — | depuis 2026-10-04T23:31:24Z · Écrire scripts/juges-026-station-poste-mutations.mjs, qui prouve sur des copies, sur le PC, que les juges de la station qui lisent la vraie base ou créent un compte d'essai (station-reglages-qa, poste-extraction-qa, station-route-qa --partie=salles2, pilotage-sql-qa --migration=reglages, pilotage-ecran-qa --partie=salles-suite) échouent sur une vraie faute avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et chaque témoin passe |
| 026-198 | test | en-cours | claude-code | — | depuis 2026-10-04T23:36:39Z · Écrire scripts/juges-026-transverse-mutations.mjs, qui prouve sur des copies que les juges du pont Telegram (pont-telegram-qa) et du durcissement de l'usine (usine-durcie-qa) échouent sur une vraie faute avec le critère nommé et passent sur la copie intacte, et qui sort en code 0 seulement si chaque mutation échoue sur son critère et chaque témoin passe |
| 026-219 | test | en-cours | claude-code | — | depuis 2026-10-04T23:42:34Z · C16 — mutations des juges du domaine réseaux, selon Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 et §4 bis ; conserver l'accord individuel de Benj et le contrôle local Laya |
| 026-250 | test | en-cours | claude-code | — | depuis 2026-10-04T23:19:19Z · Écrire scripts/juges-026-postes-mutations.mjs, qui mute sur des copies isolées les quatre juges des postes de l'organigramme du 27/09 (comptable-qa, sav-qa, qualite-sites-qa, vigile-qa) une faute à la fois et prouve que chacune est prise par le critère attendu, témoin intact vert, jusqu'au vert du méta-juge de 026-001 |
| 026-152 | test | file | codex | — | Écrire scripts/juges-026-lt-mutations.mjs, qui prouve sur des copies que chacun des 16 juges du domaine livraison et trésorerie échoue, sur le critère attendu, face à une vraie faute plantée dans le code PASS, et passe sur l'arbre réel ; code 0 seulement si chaque mutation est prise et chaque témoin passe |
| 023-03 | test | file | claude-code | — | Écrire scripts/juges-023-mutations.mjs, qui prouve par des mutations sur copies que les juges corrigés familles-socle-suite-qa.mjs (023-01) et signature-repos-qa.mjs (023-02) échouent encore sur de vraies fautes, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 025-10 | test | file | claude-code | — | Écrire scripts/juges-025-mutations.mjs, qui prouve sur des copies que chaque juge de la série 025 échoue sur une vraie faute et passe sur l'arbre réel, et qui sort en code 0 seulement si chaque mutation échoue et chaque témoin passe |
| 026-183 | feature | file | codex | — | Faire bouger sur la carte ce que les données servies font bouger, et rien d'autre : les tapis et leurs « +1 », les lignes du Crieur et de l'Usine, l'égaliseur du Radar figé entre deux lectures, l'écran de la Salle Expérience (« FERMÉE · R13 » avant la première vente) et les badges LV, tous nourris par les enveloppes dans les calques des acteurs et du texte, jamais dans le décor, jusqu'au vert de station-ecran-qa (verite, camera, acteurs) et de station-claw3d-qa (verite) |
| 026-188 | feature | file | antigravity | — | Donner à la station le panneau de la salle Commandement (objectif, missions, succès, compte rendu et consignes reçues par le Chef, servis ; sante, et comptabilite pour le niveau et les euros), ouvert par ?salle=commandement à la place de la liste de ses agents, avec le résumé de salle commun, en lecture seule, à 390 px comme à 1440 px, jusqu'au vert de station-ecran-qa --partie=salles2 --lot=a |
| 026-189 | feature | file | antigravity | — | Donner à la station les panneaux des cinq salles nouvelles et de la salle réservée : Audience (l'existant, sans cookie ni IP, sans Windsor), Sécurité, Presti (un nombre de tickets, jamais un contenu), Observatoire (la France au hublot, agrégée par département), Salle de repos (Reprendre sous mot de passe, jamais « bientôt ») et E-commerce (« Branche réservée : rien n'est construit. », sans chiffre ni bouton), chacun avec le résumé de salle commun, à 390 px comme à 1440 px, jusqu'au vert de station-ecran-qa --partie=salles2 --lot=b |
| 026-123 | feature | fait | claude-code | PASS | 2026-10-04T21:50:27Z · 519s · 1760 l. |
| 026-172 | test | fait | claude-code | EXPIRÉE | bail expiré : claude-code silencieux depuis 131 min |
| 026-170 | test | fait | claude-code | FAIL | ✅ JA-1 référence 1c87006 réutilisée (identique blob pour blob) sous .orchestre/travail/juges-026-pilotage/reference (5823 fichiers), ancêtre de HEAD, sans app/c |
| 026-094 | feature | fait | codex | PASS | 2026-10-04T21:19:18Z · 129s · 0 l. |
| 026-179 | feature | fait | codex | PASS | 2026-10-04T20:58:45Z · 313s · 0 l. |
| 026-130 | test | fait | claude-code | EXPIRÉE | bail expiré : claude-code silencieux depuis 130 min |
| 026-200 | feature | fait | codex | PASS | 2026-10-04T20:40:29Z · 46s · 0 l. |
| 026-185 | feature | fait | claude-code | EXPIRÉE | bail expiré : claude-code silencieux depuis 136 min |
| 026-249 | feature | fait | claude-code | PASS | 2026-10-04T20:10:21Z · 247s · 1850 l. |
| 026-097 | feature | fait | claude-code | PASS | 2026-10-04T19:56:14Z · 70s · 3225 l. |
| 026-162 | feature | fait | claude-code | PASS | 2026-10-04T19:33:49Z · 4s · 0 l. |
| 026-227 | feature | fait | codex | PASS | 2026-10-04T19:07:25Z · 83s · 0 l. |
| 026-226 | feature | fait | claude-code | PASS | 2026-10-04T18:58:26Z · 87s · 737 l. |
| 026-247 | feature | fait | claude-code | PASS | 2026-10-04T18:44:43Z · 71s · 1076 l. |
| 026-201 | feature | fait | codex | PASS | 2026-10-04T18:38:51Z · 57s · 0 l. |
| 026-245 | feature | fait | codex | PASS | 2026-10-04T18:27:19Z · 14s · 0 l. |
| 026-178 | feature | fait | claude-code | PASS | 2026-10-04T18:16:47Z · 199s · 1074 l. |
| 026-243 | feature | fait | claude-code | PASS | 2026-10-04T18:14:08Z · 18s · 1018 l. |
| 026-136 | feature | fait | claude-code | PASS | 2026-10-04T18:05:49Z · 29s · 822 l. |
| 026-199 | test | fait | claude-code | PASS | 2026-10-04T17:46:01Z · 145s · 4915 l. |
| 026-254 | contenu | fait | claude-code | PASS | 2026-10-04T17:38:09Z · 174s · 545 l. |
| 026-138 | audit | fait | claude-code | PASS | 2026-10-04T17:20:48Z · 5s · 491 l. |
| 026-138-juge-pages | test | fait | claude-code | PASS | 2026-10-04T17:13:01Z · 68s · 741 l. |
| 026-156 | feature | fait | antigravity | REJOUÉ | disjoncteur réarmé explicitement par rejouer --forcer |
| 026-103 | feature | fait | codex | PASS | 2026-10-04T16:38:31Z · 22s · 0 l. |
| 026-092 | feature | fait | claude-code | PASS | 2026-10-04T16:24:36Z · 390s · 532 l. |
| 026-244 | test | fait | claude-code | PASS | 2026-10-04T16:24:33Z · 31s · 0 l. |
| 026-246 | test | fait | claude-code | PASS | 2026-10-04T16:18:22Z · 43s · 2506 l. |
| 026-221 | feature | fait | codex | PASS | 2026-10-04T16:13:17Z · 1s · 0 l. |
| 026-177 | feature | fait | usine-codex-1465 | PASS | 2026-10-04T15:39:40Z · 246s · 695 l. |
| 026-120 | feature | fait | ag-026-120 | EXPIRÉE | bail expiré : ag-026-120 silencieux depuis 133 min |
| 026-087 | feature | fait | claude-code | PASS | 2026-10-04T13:49:51Z · 161s · 939 l. |
| 026-096 | feature | fait | codex | PASS | 2026-10-04T13:26:50Z · 101s · 0 l. |
| 026-195 | feature | fait | codex | PASS | 2026-10-04T13:16:06Z · 99s · 0 l. |
| 026-174 | feature | fait | codex | PASS | 2026-10-04T13:02:58Z · 90s · 0 l. |
| 026-237 | feature | fait | claude-code | PASS | 2026-10-04T13:02:11Z · 115s · 0 l. |
| 026-083 | feature | fait | claude-code | PASS | 2026-10-04T12:53:56Z · 70s · 0 l. |
| 026-173 | feature | fait | codex | PASS | 2026-10-04T12:53:17Z · 45s · 0 l. |
| 026-242 | test | fait | claude-code | PASS | 2026-10-04T12:45:45Z · 81s · 0 l. |
| 026-171 | test | fait | claude-code | PASS | 2026-10-04T11:36:10Z · 728s · 0 l. |
| 026-175 | feature | fait | claude-code | PASS | 2026-10-04T11:17:24Z · 55s · 0 l. |
| 026-134 | feature | fait | claude-code | PASS | 2026-10-04T11:15:52Z · 45s · 0 l. |
| 026-217 | feature | fait | claude-code | PASS | 2026-10-04T11:14:35Z · 40s · 0 l. |
| 026-151 | test | fait | codex | DISJONCTÉE | bail expiré : usine-codex-126 silencieux depuis 135 min \| bail expiré : codex-mutations-151 silencieux depuis 2125 min \| decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche |
| 026-194 | test | fait | claude-code | PASS | 2026-10-04T11:09:44Z · 138s · 0 l. |
| 026-111 | feature | fait | antigravity | REJOUÉ | disjoncteur réarmé explicitement par rejouer --forcer |
| 026-176 | feature | fait | codex | PASS | 2026-10-04T11:03:54Z · 43s · 0 l. |
| 026-117 | feature | fait | antigravity | PASS | 2026-10-02T18:21:46Z · 143s · 2092 l. |
| 026-113 | feature | fait | antigravity | PASS | 2026-10-02T08:48:16Z · 100s · 1491 l. |
| 026-122 | feature | fait | codex | PASS | 2026-09-30T15:47:04Z · 28s · 0 l. |
| 026-259 | feature | fait | codex-rearmement-259 | PASS | 2026-09-30T15:30:32Z · 15s · 516 l. |
| 026-167 | test | fait | codex-reprise-167 | PASS | 2026-09-30T15:26:36Z · 276s · 806 l. |
| 026-258 | feature | fait | antigravity | PASS | 2026-09-30T10:57:29Z · 3s · 0 l. |
| 026-257 | feature | fait | codex-relais-compat-0930 | PASS | 2026-09-30T10:52:08Z · 119s · 445 l. |
| 026-225 | test | fait | codex-relais-0930 | PASS | 2026-09-30T10:23:11Z · 0s · 744 l. |
| 026-133 | test | fait | codex | PASS | 2026-09-30T08:24:52Z · 617s · 0 l. |
| 026-091 | test | fait | usine-codex-672 | PASS | 2026-09-30T04:00:24Z · 560s · 1682 l. |
| 026-145 | feature | fait | usine-codex-506 | PASS | 2026-09-30T01:29:21Z · 35s · 519 l. |
| 026-239 | feature | fait | usine-codex-503 | PASS | 2026-09-30T01:22:15Z · 41s · 1050 l. |
| 026-008 | feature | fait | claude-code | PASS | 2026-09-29T21:35:24Z · 444s · 825 l. |
| 026-166 | feature | fait | claude-code | PASS | 2026-09-29T21:11:44Z · 10s · 7 l. |
| 026-095 | feature | fait | codex | PASS | 2026-09-29T20:47:05Z · 147s · 0 l. |
| 026-157 | feature | fait | codex | PASS | 2026-09-29T20:43:52Z · 182s · 0 l. |
| 026-213 | feature | fait | codex | PASS | 2026-09-29T20:02:17Z · 9s · 0 l. |
| 026-218 | feature | fait | codex | PASS | 2026-09-29T19:19:13Z · 140s · 0 l. |
| 026-214 | feature | fait | codex | PASS | 2026-09-29T19:17:34Z · 21s · 0 l. |
| 026-212 | feature | fait | codex | PASS | 2026-09-29T19:14:45Z · 44s · 0 l. |
| 026-090 | feature | fait | codex | PASS | 2026-09-29T18:58:19Z · 94s · 0 l. |
| 026-088 | feature | fait | claude-code | PASS | 2026-09-29T17:57:02Z · 18s · 2310 l. |
| 026-089 | feature | fait | codex | PASS | 2026-09-29T17:30:22Z · 74s · 0 l. |
| 026-147 | feature | fait | antigravity | PASS | 2026-09-29T16:33:19Z · 185s · 0 l. |
| 026-210 | feature | fait | claude-code | PASS | 2026-09-29T16:28:58Z · 12s · 695 l. |
| 026-085 | feature | fait | claude-code | PASS | 2026-09-29T16:23:22Z · 56s · 1120 l. |
| 026-209 | feature | fait | codex | PASS | 2026-09-29T15:13:06Z · 24s · 0 l. |
| 026-236 | feature | fait | codex | PASS | 2026-09-29T15:03:52Z · 109s · 0 l. |
| 026-084 | feature | fait | codex | PASS | 2026-09-29T14:52:34Z · 70s · 0 l. |
| 026-144 | feature | fait | antigravity | PASS | 2026-09-29T14:52:29Z · 48s · 0 l. |
| 026-215 | feature | fait | codex | PASS | 2026-09-29T14:26:12Z · 17s · 0 l. |
| 026-233 | feature | fait | codex | PASS | 2026-09-29T14:24:37Z · 74s · 0 l. |
| 026-224 | feature | fait | codex | PASS | 2026-09-29T14:23:56Z · 21s · 0 l. |
| 026-073 | contenu | fait | codex | PASS | 2026-09-29T13:54:07Z · 27s · 0 l. |

… 260 tâche(s) de plus : voir `.orchestre/verdicts.jsonl`.
