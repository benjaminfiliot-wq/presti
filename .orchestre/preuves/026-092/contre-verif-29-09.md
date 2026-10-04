# 026-092 — contre-vérification du 04/10/2026 (Claude Code, Sonnet)

(Nom de fichier imposé par la consigne du lot : « contre-verif-29-09 » ; la contre-vérification est du 04/10.)

## Verdict officiel

`PRESTI_VERIFIER_PC=1 node ../presti-ops/usine/verifier-final.mjs 026-092` → **PASS**, 390 s, sur le PC (le juge crée un compte fondateur et un compte artisan d'essai avec `.env.local`, que l'usine n'a pas : décision du chef du 04/10, `reponse-chef.md`, option 1). `verifier.log` : 35 critères verts, 0 rouge.

- `station-route-qa --partie=lecture` : SV-1 à SV-23, plus les compléments vivants (SV-2 arbre réel → 404 ; SV-3, SV-4, SV-7 sur la copie au drapeau levé avec comptes d'essai créés puis supprimés ; SV-11 `tsc --noEmit` vert en 53 s).
- `station-route-qa --partie=reunion` : RA-1 à RA-5, plus RA-1 sur l'arbre réel et RA-4 sur la copie aux drapeaux levés (`busAgents` et `pilotage`, la copie seulement).

Le FAIL précédent (04/10 15:34Z, « SV-3 copie ou serveur : fetch failed ») n'est pas un défaut des routes : le même code et le même juge passent à la relance. À ce moment le PC était saturé (processeur à 100 %, Defender à plusieurs cœurs, 1,4 Go libres sur 7,9) avec six agents et le moteur en même temps ; le `next dev` de la copie a perdu une connexion en cours de compilation. Aucun juge n'a été modifié ni assoupli pour obtenir ce PASS (`scripts/station-route-qa.mjs` : interdit par la fiche, non touché).

## Quatre sabotages réversibles (cinq en fait), sur une copie de HEAD

Le dépôt de travail est partagé avec d'autres sessions (travail non commité de 026-178 dans `lib/pilotage/station.ts` et la route de la station) : les sabotages n'ont donc pas été joués sur lui. Ils l'ont été sur une **copie de HEAD (`git archive`, bb823d3d)** de `app/`, `lib/`, `proxy.ts` et `scripts/fermeture-e2e.mjs`, jugée par `--racine=<copie>` (sources et doublures), après un **témoin** vert : copie intacte → lecture PASS (23 critères) et réunion PASS (5 critères). Chaque fichier est restauré et son sha256 relu :

1. **SV-1** — `app/api/controle/station/route.ts` : l'instruction `if (!actif('pilotage')) return … 404` retirée. `FAIL SV-1 — première instruction du GET « const f = await estFondateur(req) » : if (!actif('pilotage')) return … 404 attendu` (les 22 autres critères tombent en « non jugé : SV-1 en échec »). sha256 ef8ff24ae3bc6910… avant et après : identiques.
2. **SV-16, SV-22** — `lib/pilotage/station.ts` : `trier()` neutralisée (`if (false && d && !peut(d))`). `FAIL SV-16 — « santé sans comptabilité » : direct.barre.commandes_mois = {"valeur":3,…}, « hors périmètre » attendu` et `FAIL SV-22 — lignes.packs et experience doivent être hors périmètre`. sha256 fefe9bc2e052013b… avant et après : identiques.
3. **SV-5** — `lib/pilotage/station.ts` : un `Math.max(1, 2)` ajouté (un calcul dans la couche de lecture, contre la règle de vérité). `FAIL SV-5 — station.ts contient Math.`. sha256 identique après restauration.
4. **RA-2** — `app/api/agents/reunion/route.ts` : `p_agent` pris du corps avant l'authentification (`(corps as { agent?: string }).agent ?? a.nom`). `FAIL RA-2 — p_agent vaut « (corps as { agent?: string », a.nom (l'authentification) attendu`. sha256 14ab58a17f8fd3e9… avant et après : identiques.
5. **RA-3** — `app/api/agents/reunion/chiffres/route.ts` : le refus des agents autres que le Chef retiré. `FAIL RA-3 — GET avec jeton-pont-essai → 200 (1 rpc), 403 sans rpc attendu ; GET avec jeton-standard-essai → 200 (1 rpc), 403 sans rpc attendu`. sha256 28de75f6f931599a… avant et après : identiques.

Les cinq sabotages sont attrapés par le critère qui porte leur nom ; le témoin reste vert ; aucun fichier du dépôt réel n'a été modifié par la contre-vérification. Le script de la contre-vérification (`contre092.mjs`) est dans le scratchpad de la session, non versionné.

## Ce que le commit contient, et pourquoi

Le code de la fiche (`lib/pilotage/station.ts`, la route de la station, les deux routes de la réunion, la ligne `'pilotage'` de `scripts/fermeture-e2e.mjs`) est **déjà dans HEAD** (ee9a6299, 334c5cb9). Le travail non commité de 026-178 qui recouvre `lib/pilotage/station.ts`, `app/api/controle/station/route.ts` et la ligne `'pilotage'` (lecteurs de `lib/pilotage/salles/`, route `reglages`, non suivis) appartient à cette autre fiche : il n'est pas commité ici (son import `./salles/index` casserait le build Vercel tant que `salles/` n'est pas suivi). Le commit de 026-092 porte donc la fiche en `fait/`, ses preuves, le digest et les verdicts.

## Geste réservé à Benj

La fiche demande « l'accord de Benj sur le diff avant le push » (`/api/agents/**`, plan §5.4) : les routes de la réunion sont déjà dans `main` ; ce commit n'ajoute aucun code. Après le push : `node scripts/deploiement-etat.mjs` (READY) et `node scripts/fermeture-e2e.mjs` en production (les routes répondent 404, drapeau `pilotage` baissé).
