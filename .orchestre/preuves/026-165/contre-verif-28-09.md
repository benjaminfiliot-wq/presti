# Contre-vérification de 026-165 — 28/09/2026

Contre-vérificateur : Claude Code (agent séparé de l'exécutant). Racine : `C:/Users/benja/Documents/presti`.
Rien n'a été commité. Rien n'a été touché hors de `.orchestre/preuves/026-165/` et de `.orchestre/travail/`, sauf le script de production, saboté puis restauré 7 fois octet pour octet (sha256 plus bas, date de modification conservée par `cp -p`). En base : lecture seule (`select`). Sur l'usine : lecture seule (droits des fichiers, empreinte du rapport, comptes recalculés sur le journal, sans rien afficher de nominatif).

## Verdict

**Le VERT n'est pas confirmé : un trou bloquant dans le juge.** La garde centrale de la fiche (« sans rien envoyer » : une requête autre que GET émise par une page est coupée avant de partir) peut être retirée : le POST sort alors jusqu'au site, et le verifier reste VERT (sabotage n°1). Les autres points tiennent : 5 sabotages sur 7 rougissent le bon critère (MS-5, MS-1, MS-3, et les deux corrections du 27/09, MS-8 et FC). Le 7ᵉ (verdict figé) reste vert mais il est rattrapé plus loin par `--poser`. La vraie mesure est recoupée : le journal privé de l'usine redonne les chiffres du rapport, le rapport de l'usine est celui du dépôt, et l'événement n° 1505 est seul en base.

## Moyen

1. **Codex sur l'usine**, commande `node ../presti-ops/usine/revue-codex.mjs 026-165 --sabotages=4` : **pas jugé, code 3.** Raison exacte, tirée de `.orchestre/travail/revue-codex/026-165/journal.json` : `"quota": "quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM."`. Codex est sorti en code 1 au bout de 4 s. Le témoin (passage n°0) était vert, code 0, en 105 s. T0 = `b1d9164933188510ffb77333df35c401782b23ec`, `restaure: true`, fin à 15:15:58Z. Aucun sabotage n'a été fait par Codex, et `verdict.json` est absent.
2. **Repli : mes propres sabotages de la production**, dans `scripts/agents/mesure-a-sec.mjs`, un à la fois. Script `.orchestre/travail/contre-verif-026-165/saboter.mjs` : remplacement exact, une seule occurrence exigée, syntaxe vérifiée par `node --check`. Boucle `boucle.sh` : le verifier de la fiche est lancé tel quel depuis le poste (`node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs --autotest --preuve-echecs`) et se relance lui-même sur presti-usine. Ensuite `cp -p` depuis la copie d'origine, puis `sha256sum`. Journaux : `.orchestre/travail/contre-verif-026-165/sabotage-<n>.log` et `resultats.txt`. Les passages ont tourné de 15:18:51Z à environ 15:35Z. Aucun n'a touché `verifier.log`.
3. **Recoupement de la vraie mesure :**
   - en base, lecture seule sur `ops.evenements` et sur le catalogue ;
   - sur l'usine, `stat` des fichiers privés et empreinte du rapport ;
   - comptes recalculés depuis `journal.jsonl` sur l'usine même : seuls des totaux sont sortis.

## Sabotages

sha256 de référence de `scripts/agents/mesure-a-sec.mjs` (63 096 octets, fichier non suivi par Git), relevé avant tout sabotage et après chaque restauration :
`832d19387e192554523a2b54e988ee3bdf110144822540645a8265175e6d0f6f`

| n° | Sabotage (production) | Critère visé | Code | Ce que le verifier a dit | sha256 après restauration |
|---|---|---|---|---|---|
| 1 | Route du navigateur : la requête non-GET est comptée (`site.nonGet++`) mais n'est plus coupée (`return bloquer('non_get')` retiré) | MS-4 | **0, VERT** | Témoin : MS-4 ✓ (aucune page du témoin n'émet de POST). Faute « post » : « 1 requête(s) non-GET émise(s), **1 sortie(s) ; reçues par les sites : 1** », mais elle est comptée « attrapée », donc 4 fautes attrapées sur 4 | `832d1938…` identique |
| 2 | Route du navigateur : `await ctx.rythme.tour(hote)` retiré | MS-5 | 1, ROUGE | ✗ MS-5 : « plus petit écart : 22 ms au journal, 21 ms à l'arrivée » ; aucun autre critère rouge | `832d1938…` identique |
| 3 | Navigateur : juge `lue?.corps` (le HTML déjà lu par le Lecteur) au lieu de `page.content()` | MS-1 | 1, ROUGE | ✗ MS-1 : « captcha-js : HTML eligible, final eligible » ; aucun autre | `832d1938…` identique |
| 4 | `rapportPropre` : ne compte plus que les domaines précédés de `http(s)://` | MS-3 | 1, ROUGE | Témoin MS-3 ✓. Faute « domaine » : « ✗ NON attrapée … MS-3 resté vert », donc 3 fautes attrapées sur 4 | `832d1938…` identique |
| 5 | Correction du 27/09. Le refus `donnee_personnelle` de l'adaptateur n'est plus reporté (`s.final` n'est pas posé) : le site piège repart vers Chromium | MS-8 | 1, ROUGE | ✗ MS-8 ; ✗ MS-1 aussi (part 28,6 %, le piège compté éligible) | `832d1938…` identique |
| 6 | Correction du 27/09. Dépendances de l'adaptateur : `robots: async () => ''` (tout est permis) | FC | 1, ROUGE | ✗ FC : « robots refusés → firecrawl ; appels Firecrawl pendant ces trois essais : 1 » | `832d1938…` identique |
| 7 | `rediger` : verdict figé, `const verdict = 'PASS'` | verdict du rapport | 0, VERT | Rien ne lit la ligne verdict dans l'autotest, et le témoin est à 14,3 % de toute façon | `832d1938…` identique |

Restaurations : 7 sur 7 à sha256 identique. `git status` montre `?? scripts/agents/mesure-a-sec.mjs`, comme avant. Même taille et même date de modification (`2026-09-28 16:19:25`).

## Défauts

### Bloquant

**D1. MS-4 ne protège pas la garde « rien ne part »** (sabotage n°1).

Le témoin n'a aucune page qui émette un POST. Or 4 vrais sites en ont émis pendant la mesure : 3 `xhr` et 1 `fetch`, toutes coupées. Le critère MS-4 compte les tentatives : il ne distingue donc pas « coupée avant de partir » de « partie jusqu'au site ». Avec la garde retirée, la faute « post » est « attrapée » alors que le site d'essai a reçu le POST, et le verifier reste VERT. En mesure réelle, seul `requestfinished` le verrait, **après** l'envoi. C'est précisément ce que la fiche interdit.

**Correction :**
- mettre dans le témoin une page qui émet un POST au chargement, comme le font les vrais sites ;
- MS-4 vert si et seulement si les tentatives sont au moins 1, les sorties 0 et les requêtes reçues par le serveur d'essai 0 ;
- la faute plantée devient « garde levée » (par exemple une option du contexte qui laisse passer) et doit rougir MS-4 par « reçues ≥ 1 ».

### Mineurs

**D2. Verdict du rapport jamais jugé** (sabotage n°7). Un verdict figé à PASS passe l'autotest. Le risque est limité : `mesurer()` calcule son code de sortie à part, et `--poser` recalcule la part et refuse un verdict qui ne suit pas le seuil.

**Correction :** ajouter à l'autotest un second témoin sous le seuil (par exemple les six pages sans l'éligible), qui doit rendre « FAIL » dans le rapport et le code 3.

**D3. `mesurer()` n'est jamais exercée par le verifier** (lecture du code). L'autotest passe par `executerMesure` seulement. Les contrôles propres à la vraie mesure ne sont donc jugés que par la mesure réelle elle-même :
- le refus d'afficher un rapport qui porte un domaine ;
- la somme MS-2 ;
- l'arrêt, code 1, sur une requête non-GET sortie ;
- le code 3 d'un FAIL ;
- les droits 0600/0700 ;
- l'effacement au-delà de 30 jours.

Je les ai constatés à la main sur l'usine (voir plus bas). Ils ne sont pas gardés contre une régression.

**D4. Écart à la lettre de la fiche sur le POST.** La fiche dit « une requête `POST` arrête tout (code 1) ». Le script coupe la requête et continue. La mesure réelle a donc fini en PASS avec « 4 tentées, 0 sorties ». Ce choix est plus sûr que la lettre de la fiche (rien ne part, au lieu de s'arrêter une fois la requête partie), mais il faut l'écrire dans la fiche ou dans le rapport de l'exécutant. Le résumé VERT (« Aucune requête non-GET n'est sortie ») est exact, mais il tait les 4 tentatives.

**D5. MS-8 respecté à la lettre par un détour.** Le source écrit `['cher', 'cher'].join('')` pour que le mot n'apparaisse pas en clair, et garde en production une branche `ctx.faute === 'libre'` qui fabrique l'opération libre. Cette branche est inaccessible hors autotest, et `firecrawlReel` refuse tout ce qui n'est pas `scrape`. Le vrai contrôle est donc le comportement de la doublure (sabotage n°5 vu). La vérification par lecture du source, elle, ne garde plus rien.

**Correction :** planter la faute par une dépendance injectée par l'autotest, pas par une branche du code de production.

**D6. Stock estimé gonflé d'un facteur 2,2.** C'est conforme à la formule de la fiche, mais trompeur. « 12,2 % de 22 938 = 2 804 formulaires » applique le taux des sites **lus** à tous les candidats. Or 55 % des tirés tombent avant la lecture (97 refus SIRENE et 12 sites injoignables sur 200). Sur les tirés, la part est de **5,5 %** (11 sur 200), soit environ **1 262** formulaires, juste au-dessus du seuil de 5 %. La ligne « candidats à tirer : 364 et 728 » tient bien compte de cette perte, elle est juste.

**D7. Hors périmètre, mais des points « C'est fini quand » restent en attente.**
- La migration 0111 (`acq_etat_envoi`, `acq_envoi_froid_ouvrir`) n'existe ni dans le dépôt ni en base : « `acq_etat_envoi().mesure_a_sec` le rend » est invérifiable.
- 0106 (`acq_decision_creer`) est dans le dépôt mais **pas appliquée** en production (absente de `pg_proc` et de `schema_migrations`). La branche FAIL de `--poser` échouerait donc en code 1, sans créer de carte. Sans effet aujourd'hui, puisque le verdict est PASS.
- Point 4 de la fiche (« commit et push du script et du rapport ») : pas fait. `scripts/agents/mesure-a-sec.mjs` et `docs/agents/mesure-a-sec-2026-09-28.md` sont non suivis (`??`), et `git log` est vide sur le script.

### Remarque de méthode (pas un défaut à la lettre)

Dans Chromium, les requêtes vers des tiers sont coupées : 70 « tiers » et 155 « type » au journal réel. Un captcha dont le `<script src>` porte `recaptcha`, `hcaptcha` ou `turnstile` reste visible dans le DOM, car la signature de `lecteurSite.ts:194` est une recherche de texte. En revanche, une protection injectée par un script tiers qui ne porte pas ces mots ne se verra jamais. L'écart HTML / navigateur de 0 sur 11 est à lire avec cette limite.

## Recoupement de la vraie mesure (vérifié)

- **MS-7 :** `select … from ops.evenements where type = 'mesure_a_sec'` rend **une seule ligne** : n° 1505, `systeme`, `mesure:2026-09-28`, « PASS 12,2 % éligibles (n = 200) », posée le 2026-09-28 à 15:07:56Z.
- **Rapport :** `~/mesure-a-sec/2026-09-28/rapport.md` sur l'usine et `docs/agents/mesure-a-sec-2026-09-28.md` ont le même contenu. Seule différence : la ligne vide finale du fichier du dépôt, d'où les empreintes `f4a87e79…` et `0edfe2ab…`.
- **MS-2 :** 200 tirés, 90 lus, 110 de manque = 49 + 48 + 12 + 1. Les abandons (38 + 21 + 19 + 1 = 79) plus les 11 éligibles font bien 90 sites lus.
- **MS-5 et MS-4, recalculés sur `journal.jsonl` (1 375 entrées) :**
  - plus petit écart au même hôte : **1 094 ms**, aucun écart sous 1 000 ms ;
  - 504 lectures, toutes avec un UA ;
  - 4 requêtes non-GET (xhr, xhr, xhr, fetch), **0 envoyée** ;
  - 0 redirection dans le navigateur.
- **Données privées sur l'usine :** dossier `~/mesure-a-sec` et dossier du jour en 700 ; `domaines.txt` (200 lignes), `journal.jsonl` et `rapport.md` en 600.
- **MS-3 :** le rapport du dépôt ne porte ni domaine hors `data.ademe.fr`, ni numéro de 9 ou 14 chiffres, ni « @ » (le témoin le confirme par `rapportPropre`).
- **Verifier de l'exécutant** (`verifier.log`, 15:12:13Z, code 0, 135 s) : il se relance bien sur presti-usine, et MS-1, MS-3 à MS-6, MS-8, FC et NC sont verts, avec 4 fautes sur 4. Le témoin de Codex (passage n°0, 105 s) le rejoue vert.

## À faire (exécutant)

1. D1 : corriger le témoin et MS-4 comme décrit, puis rejouer le verifier et vérifier que la faute « garde levée » rougit MS-4 par « reçues ≥ 1 ».
2. D2 et D5 si le temps le permet. Pour D6, corriger la ligne « stock estimé » en l'écrivant sur les sites tirés, ou l'annoncer comme borne haute.
3. Commit et push du script et du rapport (point 4 de la fiche), une fois D1 corrigé.
4. Relancer `revue-codex.mjs 026-165` après la remise à zéro du quota ChatGPT, pour avoir une seconde revue indépendante.
