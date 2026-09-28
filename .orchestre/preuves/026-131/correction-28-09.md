# Correction de 026-131 — 2026-09-28

Décision de Benj (28/09) : « corrige puis publie ». Deux corrections sur le texte déjà PASS mais pas commité.

## 1. Renumérotation « 3 ter » → « 3 quater »

`app/cgu/page.tsx` contenait deux `<h2>` intitulés « 3 ter » : `id="retractation"` (rétractation du site à la demande, article existant, HEAD) et `id="pubs"` (le pack pubs locales, fiche 026-131, pas encore commité). Défaut déjà relevé, non corrigé, dans `.orchestre/preuves/026-131/contre-verif-28-09.md` (défaut n°3) et dans la note de Benj de l'ancien `article-3-ter.txt`.

Renuméroté « 3 quater » (le `id="pubs"` ne change pas — seuls les liens `#pubs` en dépendent, pas le numéro) dans :
- `app/cgu/page.tsx` — le `<h2>` du bloc pack ;
- `lib/packPub.ts` — commentaire de `TRANSITIONS_PACK` (« la retouche unique promise par les CGU 3 ter » → « 3 quater ») ;
- `scripts/cgu-pack-pub-qa.mjs` — en-tête et lecture (`titre_h2` vient du contrat, donc suit automatiquement) ;
- `scripts/fixtures/026-pubs-contenu/contrat-pack.json` — `cgu.titre_h2`.

Non touché (volontairement) : `lib/siteAchatPublic.ts` cite « article 3 ter de nos conditions générales » à propos du site à la demande — c'est le BON article (rétractation, id="retractation"), qui garde son numéro. Aucun changement là.

## 2. Rétractation ajoutée

L'article ne disait rien de la rétractation. Ajout, en fin de bloc « 3 quater », de trois `<p>` sur le modèle exact de l'article 3 ter (rétractation du site, `app/cgu/page.tsx:64-66` avant correction) :
- même mécanique : applicabilité L221-3 (entreprise ≤ 5 salariés, hors établissement, hors champ d'activité principale) + délai de 14 jours ; demande expresse de commencer avant la fin du délai ; perte du droit via L221-28 ; comment l'exercer (email, adresse de la page de contact) ;
- adapté au pack : le motif de perte du droit (L221-28) est le contenu personnalisé à partir des photos et spécifications de l'artisan, au lieu de « site entièrement livré » (qui n'a pas de sens pour un pack livré par lien de téléchargement) ;
- rien d'inventé : aucun délai différent de 14 jours, aucune voie d'exercice différente de l'email à la page de contact, pas de mécanisme L221-25 (paiement proportionnel) qui n'est pas cité par la consigne et n'a pas d'équivalent clair pour un pack fabriqué en une fois.

## Juge : CG-6 ajouté, prouvé par sabotage

`scripts/cgu-pack-pub-qa.mjs` gagne CG-6 : rougit si la rétractation du pack manque une mention exigée (contrat `cgu.retractation_phrases_exigees` : rétractation, L221-3, L221-28, 14 jours, contenu personnalisé) OU si deux `<h2>` des CGU partagent le même numéro (détection générique par regex sur tous les titres, pas seulement 3 ter/3 quater).

Empreinte de référence avant tout sabotage : `3c0b9ebafc9797d23bf33f6d30a8a3dbb706a16d90c2bd5ad9d37112a2dbb823 app/cgu/page.tsx`.

| # | Sabotage | Attendu | Obtenu | Restauré (sha256 identique) |
|---|---|---|---|---|
| 1 | Suppression des 3 `<p>` de rétractation du bloc pack | FAIL CG-6 seul | **FAIL CG-6** seul (5 mentions absentes) ; CG-1 à CG-5 PASS — `.orchestre/preuves/026-131/sabotage-cg6/sabotage-1-retractation-absente.log` | oui |
| 2 | `<h2 id="retractation">3 ter...` → `<h2 id="retractation">3 quater...` (numéro dupliqué avec le pack) | FAIL CG-6 seul | **FAIL CG-6** seul (« 3 quater » utilisé par 2 articles) ; CG-1 à CG-5 PASS — `.orchestre/preuves/026-131/sabotage-cg6/sabotage-2-numero-duplique.log` | oui |

Après chaque sabotage, restauration par copie du fichier sauvegardé avant sabotage (`sabotage-cg6/avant.tsx`), jamais par `git` ; `sha256sum app/cgu/page.tsx` vérifié identique à la référence avant de passer au sabotage suivant, et à la fin.

`npm run typecheck` rejoué seul (hors du juge) : vert, aucune erreur.

## Verdict final

`node scripts/cgu-pack-pub-qa.mjs` : PASS sur CG-1 à CG-6 (voir `.orchestre/preuves/026-131/verifier.log`, régénéré par `node scripts/orchestre.mjs verifier 026-131`).
