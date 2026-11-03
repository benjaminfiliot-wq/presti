# gabarit-artisan-suivi — Suivi et relances

Fiche du gabarit outillé (tâche 036-014, prompt 6, outillage, lot 2). Ligne 3 de la matrice de `OUTILLAGE.md` § 5 : Relanceur (agent ; outil de lecture : lib-controler-conflit) ; relance par le canal d'origine (Gmail, Outlook, SMTP, WhatsApp, Telegram, Twilio pour le SMS quand l'API est choisie, sinon SMS préparé) ; registre des relances ; STOP et opposition respectés.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d'Oracle : `OplnZ6KdKVegxtn4` (jamais publié, jamais activé). Export : `.orchestre/preuves/036-014/gabarit-artisan-suivi.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-argent-qa.mjs`.

## Le geste

Un déclencheur planifié (n8n d'Oracle n'est pas exposé : aucun webhook), les lectures de la plateforme (API REST de Supabase, filtre du compte sur chaque requête), un nœud Code qui constitue **un seul dossier par passage**, puis la **porte « simulation »** : sa sortie « vrai » ne fait que journaliser ce qui serait fait ; seule sa sortie « faux » atteint le modèle et les outils d'écriture. Une simulation absente ou illisible est une erreur, jamais un « faux ».

**Le code calcule les montants, jamais le modèle.** Aucun nœud Code ne contient un opérateur arithmétique (le juge le lit sur l'arbre syntaxique). Un montant est lu (centimes entiers ou texte rendus par la base ou par le code de l'application) et seulement comparé.

## STOP, opposition, conflit

Le nœud « Constituer la relance due » ne laisse passer un dossier que si la base écrit **explicitement** `stop`, `opposition`, `main_prise`, `exclu` et `sensible` à **faux** : une valeur absente ou non lue vaut « ne pas relancer ». Le dossier passe ensuite par `lib-controler-conflit` (dossier clos, client en discussion, main reprise, exclu, client sensible, déjà en cours, déjà relancé il y a moins de 3 jours par n'importe quel chemin) ; une réponse absente, en erreur ou négative arrête tout. Aucun texte de client n'est lu par n8n : la sensibilité est un drapeau écrit par la base (`sujetEscalade`).

Les paliers : conversation J+2, J+5, J+10 ; devis 7 jours (`lib/crm/assistants.ts:108`). Studio : une carte « À valider » portant la relance préparée, jamais d'envoi. Signature : conversation si `relances.auto` ; devis si le pilote est actif et le type `relance_devis` activé ; plafond du jour ; délai d'annulation écoulé.

## Le canal d'origine

| Canal | Nœud | Remarque |
|---|---|---|
| e-mail | Gmail ou Outlook (au choix du compte) | à son nom, depuis sa boîte |
| SMTP | Envoi d'e-mail (SMTP) | boîte hébergée hors Gmail et Outlook |
| WhatsApp | WhatsApp Business Cloud | le client a déjà écrit ; un modèle validé par Meta est requis pour écrire en premier |
| Telegram | Telegram | le client a démarré la conversation avec le robot de l'artisan |
| SMS, API choisie | Twilio | STOP dans chaque SMS, ni lien ni montant (`lib/sms/encodage.ts`) |
| SMS, sinon | « SMS préparé » (nœud Code) | lien `sms:` ouvert d'un geste sur le téléphone de l'artisan (`lib/sms/lien.ts:10`) ; rien ne part |

Chaque relance envoyée est inscrite au **registre commun** (`assistant_actions`, `lib/relancesRegistre.ts`) et déposée dans la conversation du client, avec son canal.

## Les nœuds

| Nœud | Outil | Lit / écrit | Porte | Rôle |
|---|---|---|---|---|
| Tous les jours à 9 h | Déclencheur planifié |  | avant la porte | Déclencheur à intervalle : n8n d'Oracle n'est pas exposé à Internet, aucun webhook (R22). |
| Préparer | Code | calcule (sans montant) | avant la porte |  |
| Relire la configuration | HTTP | lit `n8n_config_agents` | avant la porte | Configuration du compte. Paliers : J+2, J+5, J+10 pour une conversation, 7 jours pour un devis (lib/relances.ts, lib/crm/assistants.ts:108). |
| Lire les relances dues | HTTP | lit `n8n_relances_dues` | avant la porte | Devis envoyés et conversations sans réponse, avec les drapeaux écrits par la base : STOP, opposition, main reprise, exclu, client sensible. Aucun texte de client. |
| Constituer la relance due | Code | calcule (sans montant) | avant la porte | STOP et opposition : rien ne part. Une valeur absente vaut « ne pas relancer ». |
| Préparer l'appel du contrôleur | Code | calcule (sans montant) | avant la porte |  |
| Contrôler le conflit (lib-controler-conflit) | Exécuter un sous-workflow | appelle | avant la porte | A20 : dossier clos, client en discussion, main reprise, exclu, client sensible, déjà en cours, déjà relancé (registre commun, 3 jours). Lecture seule. Ses callerIds doivent contenir la copie du client. |
| Le dossier peut-il être relancé ? | If |  | avant la porte | Faux ou réponse absente : rien (côté sûr). |
| Porte simulation (modèle) | If |  | PORTE | Vrai : simulation, rien ne part (le modèle n'est pas appelé : sa sortie vient d'un enregistrement daté). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Modèle enregistré (simulation) | Code | calcule (sans montant) | avant la porte |  |
| Relanceur | Agent IA | appelle le modèle | derrière la porte (sortie « faux ») | Un agent par spécialiste : Claude, un parseur à schéma strict, des outils de LECTURE seulement. Atteint par la sortie « faux » de la porte (appeler le modèle est un effet). |
| Claude (Haiku 5.5) | Modèle Claude |  | sous-nœud de l’agent |  |
| Schéma de la relance | Parseur structuré |  | sous-nœud de l’agent |  |
| Contrôleur de conflit (lib-controler-conflit) | Outil : sous-workflow | lit | outil de lecture de l’agent | Le même spécialiste que le chemin principal, offert à l'agent en lecture. |
| Lire le fil (Gmail) | Outil : Gmail | lit | outil de lecture de l’agent | Dernier échange avec le client sur Gmail. |
| Lire le message (Outlook) | Outil : Outlook | lit | outil de lecture de l’agent | Dernier échange avec le client sur Outlook. |
| Registre des relances (Google Sheets) | Outil : Google Sheets | lit | outil de lecture de l’agent | Si l'artisan tient son suivi dans une feuille : lecture seule. |
| Revalider le message | Code | calcule (sans montant) | avant la porte | R18 : hors schéma = rejet. Aucun montant ni lien dans une relance. |
| Décider de la voie | Code | calcule (sans montant) | avant la porte | Studio : carte, relance à valider. Signature : envoi seul (conversation : relances.auto ; devis : pilote relance_devis). |
| Porte simulation (effets) | If |  | PORTE | Vrai : simulation, rien ne part (seuls les effets prévus sont journalisés). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Effets prévus | Code | calcule (sans montant) | avant la porte |  |
| Choisir la voie | Switch |  | derrière la porte (sortie « faux ») | Fallback = carte : la relance préparée attend la validation de l'artisan. |
| Déposer la carte | HTTP | écrit `opportunites` | derrière la porte (sortie « faux ») | Studio : la relance préparée devient une carte « À valider » dans la plateforme. |
| Lire le destinataire | HTTP | lit `n8n_destinataires` | derrière la porte (sortie « faux ») | Lue AU MOMENT d'envoyer, après la porte : le contact ne sert qu'au nœud d'envoi du canal d'origine. |
| Choisir le canal | Switch |  | derrière la porte (sortie « faux ») | Le canal d'origine du client. Fallback = SMS préparé. |
| Relance Gmail | Gmail | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Gmail de l'artisan, à son nom. Atteint par la sortie « faux » de la porte seulement. |
| Relance Outlook | Outlook | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Outlook de l'artisan, à son nom. |
| Relance SMTP | SMTP | écrit (send) | derrière la porte (sortie « faux ») | Envoi par le SMTP de l'artisan (ou de son hébergeur de messagerie). |
| Relance WhatsApp | WhatsApp | écrit (send) | derrière la porte (sortie « faux ») | WhatsApp Business Cloud (Meta) : le client a déjà écrit sur ce canal ; un modèle de message validé par Meta est requis pour écrire en premier. |
| Relance Telegram | Telegram | écrit (sendMessage) | derrière la porte (sortie « faux ») | Telegram : le client a démarré la conversation avec le robot de l'artisan (jamais un identifiant écrit ici). |
| Relance SMS (Twilio) | Twilio | écrit (send) | derrière la porte (sortie « faux ») | SMS par l'API Twilio, choisie par l'artisan (sinon « SMS préparé », lib/sms/lien.ts:10). STOP dans chaque SMS, ni lien ni montant (lib/sms/encodage.ts). |
| SMS préparé | Code | calcule (sans montant) | derrière la porte (sortie « faux ») | Étape gratuite : un lien sms: que l'artisan ouvre sur son téléphone (lib/sms/lien.ts:10). Rien ne part de ce gabarit. |
| Inscrire au registre | HTTP | écrit `assistant_actions` | derrière la porte (sortie « faux ») | Registre commun des relances (lib/relancesRegistre.ts) : jamais deux relances en 3 jours, par n'importe quel chemin. Idempotent. |
| Déposer dans la conversation | HTTP | écrit `messages` | derrière la porte (sortie « faux ») | Tout message sortant est déposé dans la même conversation par client, avec son canal d'origine (p6 § 0.5). |

## Ce que l'agent lit

Le contrôleur de conflit (sous-workflow en outil, « outil: lecture »), le fil Gmail, le message Outlook, le registre des relances tenu dans Google Sheets.

## Pour la copie d'un client

1. Un déploiement crée `client-<slug>-<département>` à partir de ce gabarit (OUTILLAGE.md O1) : accord écrit du client, « go » de Benj, décision O3 (voie a ou b pour les identifiants).
2. Le client branche **lui-même** ses comptes dans « Connecter » ; chaque nœud d'outil reçoit alors l'identifiant du client et de lui seul. Un agent n'en saisit aucun.
3. Remplacer dans le nœud « Préparer » l'identifiant d'exemple par le compte de l'artisan ; renseigner les classeurs, dossiers et feuilles (champs vides dans les nœuds Drive, Sheets, Excel, OneDrive).
4. Ajouter la copie aux `callerIds` des sous-workflows qu'elle appelle, puis publier ces sous-workflows avant la copie (n8n n'appelle un sous-workflow que dans sa version publiée).
5. Passer `simulation` à faux dans la configuration du compte **en dernier**, après la fin des essais à blanc ; l'interrupteur général et celui du département restent fermés tant que la copie n'est pas validée.
6. Supprimer les nœuds des outils que le client n'utilise pas (par exemple Excel s'il est sur Google) : la copie ne garde que ses outils.
7. Les vues étroites lues par le gabarit (`n8n_*`) et les fonctions de PDF (`n8n_pdf_*`) sont à écrire dans la base, par migration, avec le « go » écrit de Benj (elles ne sont pas dans ce lot).
8. Aucun message de client n'est lu par n8n : la vue `n8n_relances_dues` ne porte que des drapeaux et des nombres.
