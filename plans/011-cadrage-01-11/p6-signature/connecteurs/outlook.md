# Fiche connecteur — Microsoft : Outlook (boîte) et Outlook Agenda de l'artisan (tâche 036-009)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4
> (`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`, lignes « Outlook / Microsoft 365 » et « Outlook Agenda »).
> **Aujourd'hui, la boîte Outlook passe par l'IMAP/SMTP existant** (`lib/canaux.ts`, `imap.md`), gratuit, sans application. Le code OAuth
> Microsoft **n'est pas écrit** dans ce lot : 036-009 livre le chemin Google (`lib/connexions/`) ; le chemin Microsoft se branche sur **le même
> cœur** (même table, même chiffrement, même état, même retrait) par une tâche dédiée, après la création de l'application par Benj. Rien n'a été
> relu sur Internet depuis cet hôte : noms de permissions, quotas et règles de Microsoft sont **à vérifier à la date du geste**.

| Champ | Outlook / Microsoft 365 (Microsoft Graph, OAuth Microsoft identity platform) |
|---|---|
| **Portées demandées** | Permissions **déléguées** seulement (jamais d'application, qui ouvriraient toutes les boîtes d'un locataire) : `openid`, `email`, `offline_access` (jeton de rafraîchissement), `Mail.Read` (phase 1) ; agenda : `Calendars.ReadBasic` (créneaux, sans le contenu des rendez-vous ; à confirmer pour `getSchedule`). Phase 2, par une tâche dédiée : `Mail.ReadWrite` pour le brouillon de Studio, `Mail.Send` pour Signature, `Calendars.ReadWrite` pour poser un rendez-vous validé. Jamais `Mail.ReadWrite.Shared`, jamais de permission d'administrateur. |
| **Ce qu'on lit** | Les messages de la boîte de réception depuis la dernière relève (identifiant, `internetMessageId`, expéditeur, objet, date, texte), déposés **une fois** dans la conversation (même dédoublonnage que `imap.md`). Agenda : les créneaux occupés de la fenêtre utile. |
| **Ce qu'on écrit** | Phase 1 : rien. Phase 2 : brouillon (Studio, jamais envoyé), envoi du seul `reponse_prospect` autorisé par le pilote (Signature), rendez-vous **après clic de l'artisan** (décision 5). |
| **Où vit l'autorisation** | Comme Google : table `connexions` (`0193_systeme_agents.sql:99-128`, fournisseurs `outlook` et `outlook_agenda` déjà prévus), `secret_app` (`CANAUX_KEY`) et `secret_n8n` (`BOITE_CLE_N8N`) au format v1, liés à la ligne (`lib/connexions/chiffrement.ts`). PKCE et état scellés comme `lib/connexions/oauth.ts`. Jamais dans n8n en clair. |
| **Retrait par le client** | « Retirer » → `POST /api/connexions/retirer` (déjà écrit : il ne dépend pas du fournisseur) : état `retiree`, deux secrets effacés. Microsoft n'a pas de point de révocation d'un jeton unique comparable à celui de Google : le retrait côté Presti efface le jeton ; le client retire aussi l'application depuis « Mes applications » de son compte Microsoft (lien à donner dans « Connexions »). |
| **Expiration, refus** | Même règle que Google (`jetonUtilisable`, `lib/connexions/etat.ts`, à généraliser au point de jeton Microsoft) : `invalid_grant` (dont l'expiration du jeton de rafraîchissement après une longue inactivité, règle Microsoft à revérifier) → `expiree`, une alerte, silence du département ; panne → silence, sans alerte. Rien ne plante. |
| **Quotas de l'API** | Limites de Microsoft Graph par application et par boîte (« throttling », réponses 429 avec `Retry-After`) : page officielle « Microsoft Graph throttling guidance », à relever le jour du geste. n8n respecte `Retry-After` (disjoncteur). |
| **Coût** | API gratuite. L'inscription de l'application dans Microsoft Entra est gratuite ; la « vérification de l'éditeur » (badge, et condition pour que des comptes professionnels consentent) demande un compte Microsoft Partner Network, à étudier par Benj. Aucun montant n'est avancé ici. |
| **Le test qui le prouve** | À écrire avec le code Microsoft : les mêmes cas que `scripts/connexions-qa.mjs` (drapeau, état, PKCE, portées exactes, aucun jeton au client, deux clés, retrait, expiration), sur un faux point Microsoft. Le retrait et le chiffrement, communs, sont déjà prouvés par ce juge. |

## Gestes préparés pour Benj (aucun n'est fait)

1. Inscrire l'application « Presti » dans Microsoft Entra (multi-locataire et comptes personnels), URI de redirection
   `https://qg.prestiapp.fr/api/connexions/microsoft/retour` (à confirmer), permissions déléguées de la phase 1 seulement.
2. Poser les variables `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_REDIRECT_URI` dans Vercel, **puis** déposer la
   tâche d'écriture des routes `microsoft/demarrer` et `microsoft/retour`. Jusque-là, Outlook reste en IMAP/SMTP.
