# L'usine : le socle des agents (TÉMOIN du juge 026-048)

> Page témoin, écrite par Claude Code pour prouver que le juge `usine-socle-qa` sait passer au vert. Ce n'est pas le livrable de 026-050.

## Le compte agents

Un compte Unix à part, `agents`, sans sudo, sans shell de connexion (`/usr/sbin/nologin`), fait tourner les services 24 h/24. Le compte `usine`, qui fait tourner Codex avec le réseau, ne peut pas lire le coffre.

## Le coffre

`~agents/.config/presti/agents.env`, mode 600, dossier 700. Liste fermée : `PRESTI_JETON_CHEF`, `PRESTI_JETON_USINE`, `PRESTI_JETON_ATELIER`, `PRESTI_JETON_LIVREUR_USINE`, `PRESTI_JETON_FACTEUR_USINE`, `PRESTI_JETON_TELEGRAM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `PRESTI_JETON_STANDARDISTE`, `PRESTI_JETON_FACTEUR`, `TELEGRAM_CODE_APPAIRAGE`.

Jamais la clé de service Supabase, jamais Stripe, jamais la clé du produit. Poser une clé : `node scripts/usine-coffre.mjs poser <NOM>`, dans son propre terminal.

## Le code déployé

`/srv/presti-agents`, arbre détaché de `~/presti` sur `origin/main`. Après chaque push qui touche un agent de l'usine : `node scripts/usine-agents.mjs maj`.

## Les services

| Service | Minuteur | Compte | Variables du coffre |
|---|---|---|---|
| presti-surveillance.service | aucun | agents | PRESTI_JETON_USINE |
| presti-atelier.service | presti-atelier.timer | agents | PRESTI_JETON_ATELIER |
| presti-livreur.service | presti-livreur.timer | agents | PRESTI_JETON_LIVREUR_USINE |
| presti-chef-plein.service | presti-chef-plein.timer | agents | PRESTI_JETON_CHEF |
| presti-porteur.service | presti-porteur.timer | agents | PRESTI_JETON_FACTEUR_USINE |
| presti-standard.service | presti-standard.timer | agents | PRESTI_JETON_STANDARDISTE |
| presti-facteur.service | presti-facteur.timer | agents | PRESTI_JETON_FACTEUR |

## La surveillance

Le 95e centile sur 7 jours du processeur, de la mémoire et du réseau : sous 22 % partout, danger ; sous 30 %, approche. Une décision par semaine. Aucune charge factice.

## Reprise par le poste

- chef : `node scripts/chef/cycle.mjs --mode=plein --reprise --base=https://prestiapp.fr`
- atelier : `node --import ./scripts/ts-loader.mjs scripts/agents/atelier-maquettes.mjs --une-passe`
- livreur : `node scripts/usine/tourneur.mjs --capacite=livraison --une-passe --base=https://prestiapp.fr`

## Pièges

AppArmor : Codex doit rester le binaire que couvre le profil `codex-bwrap`. Jamais `ufw`, jamais le paquet `bubblewrap`, jamais `bash -l` pour une commande distante.
