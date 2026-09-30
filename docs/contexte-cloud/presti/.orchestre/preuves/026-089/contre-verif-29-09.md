# 026-089 — contre-vérification du 29/09 (Claude Code)

## État trouvé en prenant la fiche
Une production déjà en place (facteur.ts, porteurs.ts, porteurs/gmail.ts, envoiMeta.ts, les trois routes ; `nodemailer` dans package.json) : 5 rouges au juge officiel, **toutes des défauts du juge `scripts/facteur-qa.mjs` et non de la production**, corrigés (commit séparé, à la manière des « juge corrigé » de 026-085, 026-116, 026-044) :

1. **FA-2 et FA-10** : le banc n'appliquait aucun palier (`poserEtat({ palier })` manquant) : la base refuse alors tout formulaire au premier contact (`quota_nouveaux`, graine 0 de 0096), donc l'envoi à juger n'existait pas.
2. **FA-2 (jugement)** : ni la notice vérifiée (`notice_verifiee_le`), ni des modèles approuvés, ni `NOTICE_URL` : dans le dépôt réel, `modeles.ts` est à `approuve: false` et `NOTICE_URL` est nul, donc J3 refuse tout, à juste titre (accord de Benj sur les textes, 026-083 ; notice en ligne, 026-162). Un juge qui exige une approbation dans le dépôt réel ne peut être satisfait par aucune production correcte. FA-2 rejoue désormais la chaîne travail → avis → approbation dans une **copie** de `lib/agents/acquisition/` (modèles approuvés, `NOTICE_URL` posé, sous `.orchestre/travail/facteur-qa/`, effacée ensuite) et vérifie, dans le dépôt réel, qu'aucun texte hors modèle n'est approuvé.
3. **FA-7** : la passe du soir ne recevait ni `noticeUrl` ni récupérateur (le serveur de la notice était démarré mais jamais atteint). Le juge passe l'adresse du faux serveur et un GET local sans redirection ; il vérifie aussi « autre page », « 404 » et « redirection » (rien posé, événement `notice_non_verifiee`) et que la notice conforme demande bien deux pages.
4. **FA-12, FA-13, FA-14** : « lecture assistée » sans garde pilotée ; le banc de routes importe chaque doublure `@/lib/…` une seule fois par processus (module `data:` en cache) et garde le premier `__DBL` : un second cas ne voyait jamais ses comportements. Le juge garde le premier D et lui passe comportements, valeurs et journal de chaque appel. Les trois critères sont réécrits pour exercer les gardes (404 avant identité, 401, 403 pour `facteur_usine` et `chef`, pause, battement), les six champs seulement de `travail` (chaînes piégées absentes), 9 corps mal formés → 400 sans juge, 409, 200, passe du soir.
5. **GM-3 (quota)** : le faux client SMTP du juge ne lisait pas la réponse à `MAIL FROM` (550 5.4.5 ignoré, envoi « réussi ») ; le code 550 est lu à sa place.

Aucun seuil de la fiche n'a été assoupli. Ce que le banc ne joue pas (à dire) : J1 `absent` / `injoignable` d'un formulaire (il faut un texte de formulaire conforme, donc `NOTICE_URL` et les douleurs approuvées), et le modèle du rejugement du soir (jugé par le script de l'usine, 026-094).

## Sabotages réversibles de la production (juge corrigé, sha256 restaurés, résultat lu)
| # | sabotage | verdict du juge | restauration |
|---|---|---|---|
| 1 | `facteur.ts` : l'empreinte du texte n'est plus comparée à celle de l'avis | FAIL FA-2 | sha256 identique |
| 2 | `porteurs/gmail.ts` : le mot de passe d'application garde ses espaces | FAIL GM-2 | sha256 identique |
| 3 | `usine/facteur/travail/route.ts` : la garde `busAgents` retirée | FAIL FA-12 | sha256 identique |
| 4 | `facteur.ts` : `JUGES_MAX_PAR_PASSAGE` 20 → 30 | FAIL FA-2 | sha256 identique |
| témoin | production restaurée (facteur.ts sha256 3413f60c8e2d2c69…) | PASS facteur, PASS gmail | — |

Script : `.orchestre/travail/026-089-debug/sab.mjs`.

## Ce qui reste à Benj / à faire avant le premier envoi
- Poser `PROSPECTION_GMAIL_PASS` (Vercel) ; accord sur le diff, dont `nodemailer` ; gestes Meta (R6), `META_PAGE_TOKEN`, `META_IG_ID` ; ouvrir `envoi_froid` au plus tôt le 12/10.
- **Dépendance non commitée** : 026-083 (`conformite.ts`, `modeles.ts`, `secondJuge.ts`, `affirmations.ts`) est encore en `file/` (verifier FAIL : accord de Benj sur les textes, étalonnage réel) ; facteur.ts les importe. Tant qu'ils ne sont pas dans HEAD, un push casse le build Vercel : la garde des imports de `commit-fiche.sh` refuse le commit.
