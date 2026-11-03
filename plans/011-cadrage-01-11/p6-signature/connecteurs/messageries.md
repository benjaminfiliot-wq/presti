# Fiche connecteur — WhatsApp, Telegram et SMS (tâche 036-009)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4
> (`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`, lignes « WhatsApp », « Telegram », « SMS »). Ces trois canaux
> **existent déjà** dans le code ; cette fiche dit comment ils entrent dans le système d'agents, sans rien en réécrire (p6:32-34). Aucun n'utilise
> l'OAuth Google de `lib/connexions/oauth.ts`. Rien n'a été relu sur Internet depuis cet hôte : tarifs et règles des fournisseurs **à vérifier à
> la date du geste**.

## WhatsApp (API WhatsApp Business Cloud de Meta)

| Champ | WhatsApp |
|---|---|
| **Portées demandées** | Celles de la liaison Meta existante (`lib/canaux/meta.ts`, `app/api/canaux/meta/`) : gestion et messagerie du compte WhatsApp Business de l'artisan, rien d'autre ; le minimum exact est celui que validera la revue de l'application par Meta. |
| **Ce qu'on lit** | Les messages reçus par le numéro professionnel de l'artisan, déposés dans **la même conversation** que sa page (p6 § 0.4). |
| **Ce qu'on écrit** | La réponse, dans la fenêtre de 24 heures ouverte par le client ; écrire **en premier** exige un modèle de message validé par Meta. Studio : carte ; Signature : le seul type autorisé par le pilote. |
| **Où vit l'autorisation** | Aujourd'hui : la liaison Meta existante (0139, chiffrée par `lib/secretBox.ts`). Dans le système d'agents : une ligne `connexions` fournisseur `whatsapp` (déjà prévu par 0193), `secret_n8n` chiffré avec `BOITE_CLE_N8N` et lié à la ligne (`lib/connexions/chiffrement.ts`), quand le canal passera par n8n. |
| **Retrait par le client** | Délier dans « Connexions » : état `retiree`, secrets effacés (`POST /api/connexions/retirer` pour une ligne `connexions` ; la route Meta existante pour la liaison actuelle). |
| **Expiration, refus** | Jeton Meta expiré ou révoqué : le canal se tait, « Connexions » le dit, une alerte part (même règle que `lib/connexions/etat.ts`) ; rien ne plante. |
| **Quotas de l'API** | Paliers d'envoi de Meta par numéro (conversations ouvertes par jour), à relever le jour du geste ; plafond du pilote : 20 par jour et par compte (`lib/pilote/regles.ts:30`). |
| **Coût** | Facturation de Meta par conversation ou par message selon la catégorie (service, marketing, utilitaire) : grille à relever le jour du geste, **montrée à Benj avant le premier envoi réel**. Aucun montant avancé ici. |
| **Le test qui le prouve** | Le drapeau `canauxWhatsapp` reste **baissé** (`lib/flags.ts:70`) : aucun message ne part. Le dépôt dans la même conversation est prouvé par `scripts/boite-n8n-qa.mjs` (une conversation par client, quel que soit le canal). Le chiffrement et le retrait d'une ligne `connexions` : `scripts/connexions-qa.mjs`. |

## Telegram

| Champ | Telegram |
|---|---|
| **Portées demandées** | Aucune portée OAuth : un bot par artisan ou le bot de Presti, selon `lib/canaux/telegram.ts` ; le client écrit au bot de lui-même (Telegram interdit d'écrire le premier à qui n'a pas démarré le bot). |
| **Ce qu'on lit** | Les messages adressés au bot, rangés dans la conversation du client. |
| **Ce qu'on écrit** | La réponse au client ; et l'alerte interne (canal d'alerte de Benj, `lib/agents/telegram.ts`). |
| **Où vit l'autorisation** | Le jeton du bot, chiffré comme aujourd'hui (`lib/canaux/telegram.ts`) ; pour n8n, une ligne `connexions` fournisseur `telegram` avec `secret_n8n` (`BOITE_CLE_N8N`). Jamais un jeton de bot dans un identifiant n8n en clair ni dans un fichier versionné. |
| **Retrait par le client** | « Retirer » : état `retiree`, jeton effacé ; le client peut aussi bloquer le bot de son côté. |
| **Expiration, refus** | Jeton révoqué (bot supprimé, jeton régénéré) : réponse 401 de Telegram → le canal se tait, « Connexions » le dit, une alerte part ; rien ne plante. |
| **Quotas de l'API** | Limites d'envoi de l'API Bot de Telegram (par discussion et globales), à relever sur la FAQ officielle le jour du geste. |
| **Coût** | 0 € (API Bot gratuite). |
| **Le test qui le prouve** | Canal en production (`canauxTelegram` levé, `lib/flags.ts:281`), couvert par ses juges existants ; le retrait d'une ligne `connexions` : `scripts/connexions-qa.mjs`. |

## SMS

| Champ | SMS (décision 4) |
|---|---|
| **Portées demandées** | Aucune : **le SMS est préparé** et s'ouvre d'un geste sur le téléphone de l'artisan (`lib/sms/lien.ts:10`), depuis son propre numéro. |
| **Ce qu'on lit** | Rien chez un opérateur. Les réponses arrivent sur le téléphone de l'artisan. |
| **Ce qu'on écrit** | Le texte du SMS (rappel, confirmation, demande d'avis), aux seuls clients qui l'ont accepté, STOP compris, sans lien ni montant ; jamais envoyé par Presti. |
| **Où vit l'autorisation** | Aucune autorisation à garder. Le jour où un fournisseur est choisi : une clé d'API dans l'environnement serveur (jamais en base en clair, jamais versionnée). |
| **Retrait par le client** | Couper le type d'action dans « Mes départements » ; le client final répond STOP : table d'oppositions de 0186 (`supabase/migrations/0186_sms_clients.sql:101`), qui coupe tout envoi suivant. |
| **Expiration, refus** | Sans objet pour le SMS préparé. |
| **Quotas de l'API** | Plage horaire d'envoi (`lib/sms/plage.ts:7-8`) ; plafond du pilote. |
| **Coût** | 0 € tant qu'il est préparé. L'envoi par un fournisseur reste **fermé** : `SMS_COUT_APPROUVE = null` (`lib/sms/tarifs.ts:23`), drapeau `smsClients` baissé (`lib/flags.ts:319`), jusqu'à ce que Benj choisisse un fournisseur sur un tarif relevé à la date du jour et approuve le coût par écrit. |
| **Le test qui le prouve** | Les juges du chantier SMS (SMS à blanc, STOP) ; 036-006 : « le STOP coupe tout » (`scripts/apres-reputation-n8n-qa.mjs`). |
