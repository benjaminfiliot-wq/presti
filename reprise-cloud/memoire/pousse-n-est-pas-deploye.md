---
name: pousse-n-est-pas-deploye
description: "« Poussé » n'est pas « déployé » : 37 déploiements Vercel de suite en ERROR (13-14/09) sans que personne ne le voie — vérifier l'état du déploiement après chaque push (scripts/deploiement-etat.mjs)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T09:22:11.715Z
---

Le 14/09/2026, en cherchant pourquoi la suspension d'un compte restait « sans effet » en production alors que le correctif était poussé, l'API Vercel a montré 37 déploiements de production en ERROR à la suite, depuis le 13/09 17 h 57 UTC : `useSearchParams()` sans frontière Suspense dans `app/site/commander/page.tsx` faisait échouer le prérendu et tout le build. Tout ce qui avait été poussé pendant la nuit (site à la demande, correctif de suspension, corpus urgence) n'était pas en ligne ; deux suites e2e « en production » testaient un build vieux de seize heures.

**Why :** Vercel ne prévient pas dans le terminal ; un `git push` réussi se lit comme un déploiement réussi ; et un agent qui livre une page sans lancer `next build` ne voit pas qu'elle casse le prérendu.

**How to apply :** après chaque push sur `main`, `node scripts/deploiement-etat.mjs` (état des derniers déploiements + première ligne d'erreur ; code 1 si le dernier n'est pas READY). Avant de pousser une page client : `npm run build` en local. Une suite e2e « en production » commence par vérifier que la production sert le commit qu'elle croit tester. Voir [[presti-state]], [[livrable-colle-a-la-main]].

**Une chaîne gardée par && ne garde rien à travers un tube** (14/09/2026, 21 h 45) : `git add … 2>&1 | grep -v …  && git commit … | tail -1 && git push` — le code de sortie d'un tube est celui de sa DERNIÈRE commande (grep, tail) : git add a échoué (un chemin déplacé par un agent), rien n'a été commité, et la chaîne a continué jusqu'à « la production est à jour » sur l'ancien commit. Toujours `set -o pipefail` en tête d'une chaîne qui pousse, et vérifier que l'index n'est pas vide avant de commiter.

**Mesurer avant d'ajouter un dossier de preuves** (14/09/2026, vers 22 h 05) : `git add .orchestre/preuves/018-06` a embarqué 57 Mo de photos originales pleine définition téléchargées par Codex pour choisir (commit 80472e8, poussé). Retirées du suivi ensuite (`git rm --cached`, règles `.orchestre/preuves/*/photos/` et `**/originaux/` dans .gitignore) ; l'historique les garde, la réécrire demanderait un push forcé et l'accord de Benj. Avant un `git add` de dossier : `du -sh` et `git add -n`.
