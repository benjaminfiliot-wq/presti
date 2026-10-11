# 026-123 — contre-vérification du 04/10 : le juge corrigé (D-0410-9) tient, quatre sabotages réversibles

Écrit le 04/10/2026 par claude-code, reprise de la fiche après la réponse du chef (D-0410-9, `.orchestre/decisions-chef-0410.md`).

## Ce qui a changé dans le juge (et rien d'autre) : `scripts/fixtures/026-pilotage/c/parties/fil.mjs`

La production du Journal n'a pas bougé d'un octet depuis le 29/09 (sha256 plus bas). Le chef a accordé la correction de CE juge, sans l'assouplir.

1. **FL-14, 3e partie (« localStorage qui lève »)** : l'ancien piège faisait lever TOUT `window.localStorage`, y compris la session de Supabase (`sb-…-auth-token`), que `page.tsx` relit par `supabase.auth.getSession()` : en racine réelle la session disparaissait, la page partait en `/login` et le Journal n'existait plus (critère rouge pour une cause qui n'est pas le Journal). Désormais :
   - le juge **observe** les clés que ▼ écrit dans `localStorage` (hors `sb-…`) : c'est la clé propre au Journal (`mc-journal-replie`), non écrite en dur ;
   - dans le 3e passage, `getItem`/`setItem`/`removeItem` ne lèvent QUE pour ces clés ; la session de Supabase reste lisible ;
   - le juge **compte les levées** : un piège qui n'a jamais levé ne prouve rien et met le critère en échec ; aucune clé observée → échec aussi ;
   - ce qui était exigé l'est toujours : ▼ opérant, journal replié à la hauteur du champ, aucune erreur de la page, aucune boîte d'erreur.
2. **FL-3 d'environnement** : plutôt qu'allonger le délai du `page.goto` partagé de `pilotage-ecran-qa.mjs` (hors du périmètre accordé), le juge **chauffe la route** avant les scénarios (une requête de Node, 180 s au plus, vers `/controle/station` puis `/api/controle/journal?limite=1`, réponse jamais lue). Option « chauffer la route avant » de la décision.
3. **Délais de chargement** (même nature, constatés au premier essai à blanc sur le PC saturé : « Vérification de l'accès… » après 45 s, « transmettre » interrompu) : `pret()` 15 s → 90 s, trois attentes de montage de la page 15 s → 60 s, l'attente de la mise en page flottante 8 s → 30 s. Aucune ne juge quoi que ce soit : la suite part dès que la page est montée ; les fenêtres qui SONT des critères (FL-3 « visible avant t + 10 s », FL-5 10 s, FL-9 10 s, FL-4 5 s) n'ont pas bougé.

## Méthode des sabotages

- **Juge** : `node scripts/pilotage-ecran-qa.mjs --partie=fil` au **banc** (`--racine=<copie de la racine hors dépôt>`, graine fixe `35434315`), le juge final (sha256 ci-dessous).
- **Où** : dans la COPIE (jamais dans l'arbre de `presti`) ; sha256 avant, une seule occurrence exigée, sabotage écrit, juge joué, octets d'origine réécrits (aucun `git restore`), sha256 relu : égal à l'origine dans les quatre cas.
- **Témoin** (sans sabotage) : PASS 14/14, `verifier-banc-04-10-v2.txt` (FL-14 : « mc-journal-replie, observée, 3 levée(s) comptée(s) »).

## Résultat : 4 sabotages sur 4 pris, par le critère attendu

| # | Fichier (copie) | Sabotage | Attendu | Verdict du juge | sha256 restaurée |
|---|---|---|---|---|---|
| 1 | `Journal.tsx` | le pli est LU sans try/catch au montage (`window.localStorage.getItem(CLE_REPLI)`) | FL-14 | FAIL — FL-14 : « localStorage qui lève sur mc-journal-replie (clé(s) du Journal) : ▼ inopérant … le journal casse la page » | oui |
| 2 | `Journal.tsx` | le pli est ÉCRIT sans try/catch dans le gestionnaire de ▼ (`window.localStorage.setItem(…)`) | FL-14 | FAIL — FL-14 : « … erreur de la page (stockage fermé (piège du juge, clé du Journal « mc-journal-replie »)) » | oui |
| 3 | `Journal.tsx` | le pli n'est plus gardé du tout (l'écriture est retirée) | FL-14 | FAIL — FL-14 : « ▼ n'écrit aucune clé dans localStorage : le pli ne peut pas être gardé … après rechargement, le journal n'est plus replié » | oui |
| 4 | `Journal.tsx` | le Journal ne montre jamais plus de 11 bulles (`bulles.slice(0, 11)`) | FL-3 | FAIL — FL-3, FL-5, FL-9 : « la bulle servie au temps t n'est pas visible avant t + 10 s ; la bulle 60, servie 4 fois, apparaît 0 fois » | oui |

Les sabotages 1 et 2 sont ceux qui prouvent la décision : le critère garde sa force. Un Journal qui n'est pas résilient quand SON stockage lève est rouge ; un Journal résilient est vert même quand le stockage de la session de Supabase, lui, marche. Le sabotage 3 prouve que le juge n'est pas vacuant (une clé observée est exigée).

Les sha256 (sabotées) : 1 `9270f9e0…3536`, 2 `1ded5e7f…021e`, 3 `5fc932db…6044`, 4 `04ee9f03…368d` ; origine et restauration : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05`.

## Production et juge : empreintes

- `app/controle/station/Journal.tsx` : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05` (inchangée)
- `app/controle/station/journal/Transmettre.tsx` : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e` (inchangée)
- `app/controle/station/journal/journal.css` : `015ed25e58236ba961ffc5533e928885e11ba32ab01da58cc9127339d013b41c` (inchangée)
- `scripts/fixtures/026-pilotage/c/parties/fil.mjs` (juge corrigé) : `dca100224163728c7770b839a07cfefa1dfd1b454a36787a960af6867ae32501`
- `scripts/pilotage-ecran-qa.mjs` : `68e3541a0807fc4ea55ddb6e28bac4304cf035c86b9f819b65004de2ba4e5676` (non touché ; sa fonction `localStorageQuiLeve` reste pour ST-5)

## À savoir

- **ST-5** (`--partie=station`, « localStorage qui lève sans casse ») utilise encore l'ancien piège en bloc (`localStorageQuiLeve`) : en racine réelle il a probablement le même défaut. Hors décision D-0410-9 : à corriger de la même façon (clés propres à la station) par la fiche qui le porte (026-111).
- Les captures de la racine réelle (`bureau.jpg`, `telephone.jpg`) sont celles du dernier passage du juge sur la vraie page.

## Verdict officiel en racine réelle (après le juge corrigé)

- Rodage depuis `en-cours/` (`orchestre verifier 026-123`, 648 s) : PASS, FL-1 à FL-14 verts.
- **`verifier-final` depuis `fait/` (PC, `PRESTI_VERIFIER_PC=1`, un scénario à la fois) : PASS, 519 s**, verdict `026-123 PASS` dans `verdicts.jsonl` (21:50:27Z) ; FL-14 : « mc-journal-replie, observée, 5 levée(s) comptée(s) … la session de Supabase restant lisible » ; FL-12 : tsc vert. Journal : `verifier.log`.
- **Purge du compte fondateur d'essai vérifiée** : après chaque passage, lecture de `auth.users` (`capture.%@presti-test.invalid`) et de `public.artisans` : aucun compte de ce juge ne reste. Un compte orphelin d'un essai à blanc tué par le délai de la tâche de fond (créé à 20:07 UTC) a été retiré par `retirerCompteTest` (la fonction du juge, preuve par lecture). Restent trois comptes de capture d'AUTRES sessions (15:37 et 19:35 UTC, dont un artisan), laissés tels quels.
- Essais à blanc antérieurs conservés : `verifier-racine-reelle-04-10.log` (ancien juge : FL-3 et FL-14 rouges) ; `verifier-racine-reelle-04-10-essai2.log` (juge corrigé, PC saturé : 13/14, FL-5 sur une page non montée après 45 s, d'où le relèvement des délais de chargement) ; `verifier-banc-04-10-v2.txt` (banc 14/14).
