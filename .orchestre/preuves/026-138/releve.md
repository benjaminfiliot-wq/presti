# 026-138 — relevé du 04/10 (17:17 UTC) : l'horloge a tenu 24 h en production, le juge corrigé est vert (9 critères sur 9)

Commande : `node scripts/horloge-qa.mjs --reel --fenetre=24` (lue en production avec la clé de service, rien affiché ; juge corrigé par 026-138-juge-pages, commit 0882f403) -> code 0. `releve.json` du 2026-10-04T17:17:19Z :

| Critère | Résultat |
|---|---|
| E24-0 préalables | PASS : `ops_horloge_etat` et `ops_etat` répondent, route du tic présente, première exécution de `presti-agents-tic` de plus de 24 h |
| E24-1 minutes exécutées | PASS : 1 440 exécutions réussies (1 380 au moins), plus grand trou 0 min (10 au plus) |
| E24-2 passages de A0 | PASS : 288 passages (276 au moins), plus grand écart 5 min (15 au plus) |
| E24-3 digests | PASS : `agents:2026-10-04:soir` et `agents:2026-10-04:matin` présents dans `public.alertes` |
| E24-4 tic | PASS : `passages_cron.tic` de 0 min, réussi |
| E24-5 argent | PASS : non faits depuis plus de 15 min : 0 ; abandonnés : 0 |
| E24-6 agents muets | PASS : aucun agent muet au-delà de deux périodes (21 agents) |
| E24-7 notifications | PASS : 2 notifications le 04/10 (3 au plus par jour de Paris) |
| E24-8 mesures | PASS : 11 mesures, aucune nulle, aucune lecture échouée |

Recoupement indépendant, une minute après le juge (SQL en lecture seule sur `ops.evenements`, le 04/10 à 17:18:38 UTC, par le connecteur Supabase, sans passer par le juge) : 288 passages de A0 sur 24 h glissantes, écart maximal 5 min 03 s, 2 notifications, 292 événements sur 24 h pour 1 787 au total (le journal dépasse donc largement la page de 200 que l'ancien juge ne dépassait pas). Le juge et la base disent la même chose.

## Historique : pourquoi le relevé de 15:00 UTC était rouge

Le même jour, `verifier` sortait FAIL sur E24-2 (« 0 passage de a0 ») alors que la production tenait. Cause exacte : `scripts/horloge-qa.mjs` demandait `ops_evenements_lire(p_limite: 500)` et s'arrêtait sur `if (l.length < 500) break` ; or la fonction plafonne à 200 lignes (migration 0097), donc le juge ne lisait que la première page, soit les 200 événements les plus anciens du journal (jusqu'au 29/09 07:00 UTC), hors fenêtre. Le relevé du 29/09 (« 158 passages, fenêtre pas encore remplie ») était le même artefact : son explication était fausse. E24-7 lisait la même page tronquée : son « aucune notification » d'alors n'avait aucune valeur de preuve (le vrai chiffre est 2, lu aujourd'hui). La correction s'est faite dans une fiche à part, comme la règle de 026-138 le demande : 026-138-juge-pages (lecture par pages jusqu'à la page vide, éprouvée en `--temoin` sur un journal de 450 événements servi par une base plafonnée à 200, quatre mutations prises).

## Conditions de la fenêtre, dites sans arrondir

- **Poste de Benj : non déclaré.** Benj n'a pas dit si son poste était éteint pendant la fenêtre. Constat : le PC a travaillé (sessions d'agents, commits) au moins pendant la journée du 04/10 ; la fenêtre n'est donc PAS une fenêtre « poste éteint » établie. Ce relevé prouve que l'horloge, A0, les digests, la file de l'argent et le plafond de notifications tiennent 24 h ; il ne prouve pas encore qu'ils tiennent poste éteint. La nuit poste éteint reste un geste de Benj.
- **Aucun geste pendant la fenêtre : non tenu à la lettre.** Sur les 24 h : 43 commits dans le dépôt, aucun ne touche `supabase/migrations`, 4 touchent `app/` ou `lib/` (déploiements). L'horloge a tourné sans trou malgré cela.
- **Digests de 7 h 30 et 18 h 30 : réception non déclarée.** Les deux lignes `digest` existent côté serveur (E24-3) ; savoir si Benj les a reçus dans sa boîte est à lui. Je n'ai pas lu sa boîte.
- Non prouvé ici (cf. la fiche) : l'épreuve de 72 h avec un quota Claude épuisé (phase 3), une commande réelle de `payee` à `en_ligne`, la tenue d'un vrai incident Vercel ou Supabase.
