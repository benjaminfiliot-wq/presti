# 026-008 — contre-vérification du 29/09/2026 (Claude Code, Sonnet)

Le PASS N16-1 à N16-16 (verifier.log, 415 s) vient après la correction de QUATRE juges par la décision du chef du 29/09 au soir (jamais affaiblis). Quatre sabotages réversibles, tous restaurés octet pour octet (cmp) :

1. **N16-14** — `proxy.ts` : le test de chemin `CHEMINS_APP_PRESTI` neutralisé (`if (false && …)`), donc un hôte inconnu sert `/sw.js`. `node scripts/next16-qa.mjs --groupe=service` (vrai build + vrai serveur) : `FAIL N16-14 — hôte inconnu : code 200/application/javascript`. Le juge corrigé (http.request, en-tête Host respecté sous Node 24) attrape donc bien un proxy qui ne joue pas son rôle ; et `qg.` y est bien vu différent de la landing.
2. **N16-8** — `proxy.ts` : ajout de `export const runtime = 'edge'`. `--groupe=code` : `FAIL N16-8 — exporte un runtime`.
3. **N16-9** — `scripts/tout-verifier.mjs` : la suite Build remise à `npx next build`. `--groupe=code` : `FAIL N16-9 — npm-build=false`.
4. **domaine-sans-site-qa (juge adapté à proxy.ts)** — copie de l'arbre avec `if (false && artisan)` dans `proxy.ts`, `--racine=<copie>` : `FAIL DS-1, DS-2` (un domaine perso n'est plus servi). Le témoin (`--temoin`) reste vert (6/6) et le dépôt réel aussi (6/6).

Juges corrigés par ce chantier (chacun resté vert sur son témoin quand il en a un, et resserré ou aligné sur l'état légitime du dépôt, jamais assoupli) :
- `scripts/next16-qa.mjs` (N16-14) : `fetch` de Node 24 ignore l'en-tête `Host` ; remplacé par `http.request`.
- `scripts/seo-e2e.mjs` : robots, sitemap et canoniques sont comparés au domaine public `https://prestiapp.fr` (code : `metadataBase`), plus à l'adresse du serveur testé ; en production le résultat est identique.
- `scripts/pwa-e2e.mjs` : `/site/commander` et `/site/acheter` sont des écrans de l'application, pas le site public d'un artisan ; exclus de la sonde « target=_blank » (`/site/<slug>` et `/p/<slug>` restent contrôlés).
- `scripts/fermeture-e2e.mjs` : les douze routes du Poste absentes de PROTEGEES y sont (401/403 attendu) ; un 404 n'est toléré, pour les routes `pilotage` et `jauges`, que si le drapeau `pilotage` est baissé ET si chaque `route.ts` du dossier lit `actif('pilotage')` ; `packPub` (route) et `packPubVente` (lu) dans la carte des drapeaux ; `/onboarding` accepte la coquille rendue côté client depuis 026-035 à condition d'y trouver le script propre à la page.
- `scripts/domaine-sans-site-qa.mjs` : charge `proxy.ts` (export `proxy`) quand il n'y a plus de `middleware.ts` ; le témoin copie le bon fichier.

Le disjoncteur : `rejouer --forcer` remet en file mais `prochaine` continue de refuser une tâche dont le dernier verdict PASS/DISJONCTÉE est DISJONCTÉE (fiche prise donc à la main : `file/` → `fait/`, cliché `decisions-avant.md` rafraîchi à l'état courant, ce que fait `prochaine` à la prise). Le PASS blanchit le disjoncteur.
