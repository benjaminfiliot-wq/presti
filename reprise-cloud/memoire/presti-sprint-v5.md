---
name: presti-sprint-v5
description: "Sprint J-1 (v5) du 2026-09-03/04 avant la démo du 04 au soir — tout est en prod (migrations via SQL Editor), bugs trouvés à l'œil (message mutilé par une regex, comptes de test bloqués par une facture), leçons de coordination"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-09-04T12:38:28.753Z
---

Sprint « J-1 démo » sur `plans/004-sprint-j1-demo.md` (prompt v5), journal `plans/journal-v5.md`, parcours `plans/demo-parcours.md`, reports `plans/apres-demo.md`. Session Claude Code ouverte sur `Documents/ofm` (pas `presti`) → les skills/agents `presti-*` du repo ne sont pas enregistrés ; lus à la main et passés en briefs aux sous-agents.

**Décisions Benj** : grille des offres telle quelle ; compte démo **menuisier** (« Atelier du Chêne », slug `atelier-du-chene`, identifiants dans `.demo-compte.local`, ignoré par git) ; photos CC BY-SA de Commons avec attribution en légende ; **pas de domaine neutre**, **domaine perso pour toutes les offres** ; vidéo + 2FA dans le sprint (revirement du 04/09) ; boîte OVH + DMARC après ; Postgres : le mot de passe reste désaligné → **migrations collées dans le SQL Editor** (`_A_COLLER_sql_editor_*.sql`), 0047→0053 posées, 0054 (purge comptes de test) à coller.

**État 04/09 13:30** : tout le parcours de démo est en production (captures des 5 scènes réelles, vidéo `public/demo/hero.mp4` montée en local avec ffmpeg — HyperFrames hébergé refuse les agents CLI). Suites prod vertes : limites, mentions, audit-correctifs, legal, rls, slides, fuite-mdp, aide, parametres 70/70, offres 12/12, reset-plafond 5/5, mfa 25/25 ; pilotage/persona/recherche relancées après correctifs. Audit final v5 = 4 auditeurs + test des 5 secondes, rapports dans le scratchpad `audit/`.

**Bugs trouvés en REGARDANT (pas par les suites)** :
- `lib/ai.ts` `blocProspect` : `/[/?MESSAGE_CLIENT]/gi` était une classe de caractères → toutes les lettres m,e,s,a,g,c,l,i,n,t effacées du message du prospect avant lecture par le modèle (« le message est difficile à lire »). 94 tests verts ne regardaient pas ce que le modèle recevait. Corrigé + test unitaire « message INTACT ».
- Trigger `factures_conservees` (0041) : une facture émise bloque `delete artisans` → les suites laissaient des comptes de test en prod **sans erreur** ; la suppression RGPD d'un vrai compte échouerait aussi (→ apres-demo : anonymiser au lieu de supprimer).
- La règle « réactif » crée le devis dès la 1re réponse, AVANT que le client laisse son email → envoi 400 ; corrigé (repli sur le contact de la conversation à l'envoi + propagation).
- `after()` de Next derrière une réponse en streaming ne s'exécute pas de façon fiable sur Vercel → route dédiée `/api/conversation/regles` appelée par le navigateur (idempotente) ; les tests API doivent l'appeler aussi.

**Leçons de coordination (à réappliquer)** :
- Sous-agents : JAMAIS `next build`/`next dev` (`.next` partagé), jamais de commit/push/migration, jamais de suites e2e concurrentes contre la prod (mon IP se fait bannir par l'anti-abus : purger `ip_abus`/`ip_bans` entre suites, captures jamais en même temps).
- Toujours **regarder** les captures/réponses IA à l'œil avant une démo ; les suites vérifient la plomberie, pas le sens.
- Heredocs bash mangent backticks et `\\n` → édits par script Python (chaînes brutes `r"..."`). ffmpeg sous Windows : chemins relatifs depuis `cwd`, jamais `C:` dans un filtre.
- Limite d'usage (429) coupe les sous-agents ; les relancer par SendMessage.

Voir [[presti-state]], [[presti-audit-v4]], [[benj-corrections-incrementales]].

**Soirée du 04/09 — après la démo.** Audit final (4 auditeurs + test des 5 secondes) puis revue adverse du cache : 25 correctifs, dont **une régression que j'avais moi-même introduite** en corrigeant les plafonds (le booléen de `consommerLimite` jeté avec `void` → aucun refus émis, et sur serverless les compteurs pouvaient rester à zéro). Autres défauts confirmés : la preuve qu'un prix a été vu n'était pas rattachée à SON site (empoisonnement possible du cache de tous), et le nom de fournisseur, libre, partait brut dans le prompt système. Puis Stripe branché de bout en bout, et **la TVA remise à l'endroit** ([[presti-facturation-tva]]).

**Leçon de méthode, la plus utile de la journée** : les défauts qui comptaient n'ont pas été trouvés par les suites, mais **en regardant** — une capture d'écran lue à l'œil, une facture ouverte en base, un relevé de compte Stripe. 94 tests verts ne regardaient pas ce que le modèle recevait, ni ce que le client allait payer. Vérifier l'effet réel, pas seulement la plomberie.
