# Refonte 18/10 — avancement (reprise après coupure : lire ici d'abord)

Périmètre de ce passage : étapes 1 (audit), 2 (architecture), 3 (deux pistes). Aucun code applicatif touché,
aucun build/dev dans le dépôt (un autre agent finit le CRM), aucun commit.

| Étape | État | Sortie |
|---|---|---|
| 0. Lecture PROMPT-BENJ, CLAUDE.md, presti-design | fait | — |
| 1a. Captures landing prod 1440/390 | fait | presti-ops/refonte-1018/avant/ |
| 1b. Compte de test + captures console prod | fait (comptes détruits, relu) | idem |
| 1c. zero-demo-e2e | ROUGE pour 3 comptes capture.direction.* du 04/10 (pas ce chantier) — signalé | — |
| 1d. Mesures (Lighthouse, contrastes, CSS, clics) | fait → AUDIT.md | plans/refonte-1018/AUDIT.md |
| 2. Inventaire + architecture | fait | INVENTAIRE-CONTENU.md, ARCHITECTURE.md |
| 3. Pistes A/B (HTML statique, Figma indisponible) + planches | fait, DIRECTION.md écrit (reco : console A, landing B) | presti-ops/refonte-1018/pistes/ , DIRECTION.md |
| Journal | fait (décisions 18 à 21) | presti-ops/JOURNAL-PLAN.md § Refonte 18/10 |

Étapes 1-3 terminées le 18/10 vers 23 h 59. Suite (étape 4, jetons puis composants) : attendre le choix de Benj
(JOURNAL-PLAN.md, décision 18), travailler sur une branche `refonte-1018`, drapeaux `consoleV2`/`landingV2` baissés.
Scripts relançables : scripts/refonte-avant-landing.mjs, refonte-avant-console.mjs, refonte-avant-css.mjs,
refonte-pistes-captures.mjs (commités le 19/10 dans la copie de travail presti-refonte).

## 19/10 — étapes 4 et 5 (copie de travail `C:\Users\benja\Documents\presti-refonte`, branche `refonte-1018`)

Décision de Benj (19/10) : console piste A, landing piste B, aube seulement dans « Découvrir » et la visite, `/offres`,
maquettes HTML sans Figma. Ne jamais toucher `C:\Users\benja\Documents\presti` (l'agent CRM y travaille).
Pas de `next build` local (vidéos en cours) : les builds se font sur Vercel (prévisualisation de la branche).

| Pas | État | Commit |
|---|---|---|
| Étapes 1-3 versionnées | fait | 491b05dc |
| Correctif : pastilles bleues Messages / Ma plateforme | fait | cafb210a |
| Correctif : facture échue « En retard » | fait | ea6310af |
| Correctif : pastille « Signature » aux comptes Signature | fait | 6f63b1b2 |
| 4.1 Jetons + drapeaux consoleV2 / landingV2 (baissés, consoleV2 en essai) | fait | 3c591d88 |
| 4.2 Composants components/ui | fait | 4216c11f |
| 4.3 Atelier /outils/ui | fait | 262bfcf4 |
| 5.1 AppShell v2 (CoqueV2) + /api/console/recherche | fait | a7ce6160 |
| 5.2 Accueil « Aujourd'hui » + /api/aujourdhui | fait | d4380020 |
| TEMPORAIRE : consoleV2 levé sur la branche (prévisualisation) | **à retirer par `git revert 3abfb98a` avant fusion** | 3abfb98a |
| Retouches + scripts/refonte-apres-console.mjs (captures après, contrôles) | fait, tout vert sur la prévisualisation | e90cc307 |
| 6.2 juge des pages /offres et /comparatif | fait ; pages confiées à Codex (tâche R18-01, worktree `presti-refonte-pages`, branche `refonte-1018-pages`) | 6df36d21 |

Captures « après » : `presti-ops\refonte-1018\apres\` (relancer : voir l'en-tête de scripts/refonte-apres-console.mjs ;
le jeton de partage Vercel est propre à CHAQUE déploiement : outil Vercel `get_access_to_vercel_url` sur l'URL du
déploiement, pas sur l'alias de branche).

Reste : landing v2 (étape 6.1 : 10 sections, slides, onglets), /faq complète, visite guidée en slides (5.3), pages console
une à une (5.4 : Messages, Devis liste/fiche en mode lecture, Factures liste d'abord…), jury de design, Lighthouse sur
prévisualisation, revert du commit TEMPORAIRE avant fusion.
