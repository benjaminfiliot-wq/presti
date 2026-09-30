# Production de sites sur l'usine

## Ce qui tourne sur l'usine

Deux services `oneshot` tournent sous le compte `agents` dans `/srv/presti-agents`. Le minuteur `presti-atelier.timer` passe toutes les 15 min ; `presti-livreur.timer` passe toutes les 10 min. `avec-coffre.mjs` ne donne à chaque service que son jeton : `PRESTI_JETON_ATELIER` pour l'atelier et `PRESTI_JETON_LIVREUR_USINE` pour le livreur. Les unités ont `MemoryMax=4G` et refusent les passages concurrents.

## L'atelier des maquettes

La fiche 026-097 réécrite fournit `scripts/agents/atelier-maquettes.mjs --une-passe`, ses routes `app/api/usine/atelier/*` et l'agent `atelier_maquettes`. Son jeton est `PRESTI_JETON_ATELIER`. `PRESTI_URL=https://prestiapp.fr` est posé dans l'unité, pas dans le coffre.

## Les tâches du livreur

L'agent `livreur_usine` prend les tâches de capacité `livraison`, de type `livrer_site`, avec la clé d'idempotence `livrer_site:<uuid de commande>`. La charge a exactement `commande: <uuid>` et éventuellement `essai: true`. Le bail de prise est de 30 min. Le tourneur bat le rappel, prend au plus deux tâches par passage et arrête après 50 min ; la génération reçoit 25 min par tâche.

## L'entrée

La file de l'argent prépare `usine/<tache>/entree/` : `commande.json` et les photos de l'artisan. Le serveur signe la lecture ; le tourneur télécharge au plus `entrees_max` fichiers dans `<travail>/<tache>/entree/`, compte les octets et y ajoute `charge.json` identique à la charge. Le fabricant ne reçoit que ce dossier, un dossier de sortie, et les variables autorisées par la table de capacités.

## La sortie et le manifeste

Le fabricant écrit `site/**`, `rapport-qa.json` et `<sortie>/manifeste.json` de forme `{ "fichiers": [{ "nom": "site/index.html", "type": "text/html" }] }`. Seuls les fichiers listés partent. Le tourneur vérifie les noms, extensions, types MIME, octets magiques, UTF-8, JSON, liens symboliques, secrets, nombre et tailles avant tout dépôt. Les limites viennent de `lib/agents/usineLimites.json` : 300 fichiers maximum, 5 242 880 octets par fichier et 41 943 040 octets au total. Il déclare chaque SHA-256 puis fait un PUT sur chaque URL signée avec son Content-Type ; il ne rend `faite` qu'après tous les PUT, avec `supabase://usine/<tache>/sortie/`.

## Ce que le serveur fait ensuite

Le consommateur relit et décode les objets déposés, copie le site dans `sites/<commande>/`, passe la commande à `generee` et efface `usine/<tache>/`. Une tâche dont la charge porte `essai: true` n'est jamais consommée.

## GitHub Actions en repli

GitHub Actions ne part que si la tâche n'a pas été prise dans l'heure, ou si `livreur_usine` est muet. Une même commande n'est jamais générée en parallèle par l'usine et Actions.

## Reprise par le poste

Quand l'usine est injoignable (carte rouge du veilleur), lancer `node scripts/usine/tourneur.mjs --capacite=livraison --une-passe --base=https://prestiapp.fr` avec `PRESTI_JETON_LIVREUR_USINE` et `CODEX_LANCEUR` pointant sur le Codex du poste ; sans lanceur, le fabricant travaille `--sans-ia`. GitHub Actions est l'autre repli. Pour l'atelier, lancer `node --import ./scripts/ts-loader.mjs scripts/agents/atelier-maquettes.mjs --une-passe` avec `PRESTI_JETON_ATELIER` et `PRESTI_URL`.

## Ce qui ne va jamais sur l'usine

La clé de service Supabase, une clé Stripe, la clé Anthropic du produit, `.env.local`.
