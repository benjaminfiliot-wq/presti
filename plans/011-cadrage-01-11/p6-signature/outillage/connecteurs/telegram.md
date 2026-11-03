# Telegram — fiche connecteur
Source : Telegram Bot API (core.telegram.org/bots/api, version 10.3 du 24/08/2026, lue le 03/11/2026, partie visible) · nœud n8n : Telegram (type exact à vérifier)
Ce que le système en fait : Telegram, ligne « Telegram » (OUTILLAGE.md § 0.4) : canal de l'artisan avec ses clients, et canal d'alerte de Benj. Existant : `canauxTelegram` levé (`lib/flags.ts:281`), `lib/canaux/telegram.ts`, `lib/agents/telegram.ts`
Portées demandées (le minimum) : pas de portée OAuth : Telegram passe par un jeton de bot (créé par le client dans BotFather). Lecture : les mises à jour du bot (`getUpdates` ou webhook) ; écriture après la porte : `sendMessage`
Ce qu'on lit : messages reçus par le bot (déjà rangés par Presti via `lib/canaux/telegram.ts`, n8n les lit dans les événements)
Ce qu'on écrit (après la porte) : réponses envoyées par `sendMessage` ; le nœud sert à répondre, jamais à recevoir
Où vit l'autorisation : le jeton du bot est un secret : jamais dans un fichier versionné, jamais saisi par un agent ; il est fourni par le client, chiffré dans Supabase (voie O3 à trancher par Benj)
Comment le client la retire : révoquer le jeton auprès de BotFather (`/revoke`) — à vérifier sur la page BotFather
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus dans la partie visible de la page — à vérifier (page complète dans le cache : `core.telegram.org-efb891b3c9.md`, 50 072 caractères)
Coût : gratuit (API Bot) — à vérifier
Entrée sans webhook (n8n n'est pas exposé) : `getUpdates` par déclencheur horaire, ou webhook côté Presti qui range le message en base (cas déjà traité par `lib/canaux/telegram.ts`)
Test hors ligne qui le prouvera : envoi à un bot d'essai sans clé réelle ; vérification qu'aucun `sendMessage` ne part en simulation (à écrire)
Points à vérifier par Claude Code : la règle « un seul consommateur de `getUpdates` par bot » ; la présence d'un webhook déjà posé par Presti (conflit possible avec `getUpdates`) ; les chiffres de limites d'envoi (non lus)
