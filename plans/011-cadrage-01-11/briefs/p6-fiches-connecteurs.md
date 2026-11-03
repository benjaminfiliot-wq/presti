# Brief Hermes — les fiches connecteurs de l'outillage (prompt 6, tâche 036-017)

**Pour qui** : Hermes. C'est du volume : une fiche par outil, rédigée depuis la documentation officielle, sans jugement de sécurité.
Claude Code relit ensuite et tranche ce qui demande du jugement : les portées minimales retenues et la voie O3.

**Pourquoi** : le 03/11 vers 14 h, Benj a demandé de mettre les vrais outils dans les systèmes. Il a ajouté : « il faut bien plus d'outils…
Insta, Facebook, LinkedIn, Brevo, d'autres logiciels faits pour les leads… pour l'entreprise sur mesure il y a beaucoup de choses ». Il veut
aussi que tu utilises « Hermes et Orca avec l'API pour aider et aller plus vite ». Chaque outil branché exige une fiche connecteur
(p6:258-262).

**Entrées** (déjà dans le dépôt, rien à télécharger) :
- `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` : la liste des outils (§ 3, § 5, § 6, § 7) et les contraintes O2 et O3 ;
- `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`, l.235-267 : le tableau des outils et le format de la fiche ;
- pour chaque outil, sa page officielle : documentation de son API (portées, quotas, tarifs) et page du nœud sur `docs.n8n.io/integrations`.
  Tu la lis par la recherche web du serveur, SearXNG et Firecrawl auto-hébergé sur Oracle. Jamais Firecrawl en ligne, jamais Apify.

**Les outils** : une fiche chacun, dans cet ordre. Les fiches de Gmail, Outlook, Drive et Sheets, messageries, Stripe et vérification Google
sont écrites par le lot 036-009 : ne les refais pas.
1. **Prompt 1** : Google Agenda, Outlook Agenda, OneDrive, Excel, fiche Google Business Profile, Twilio (SMS), Telegram, Slack,
   Microsoft Teams, Facebook Graph (Messenger, Instagram, Facebook Lead Ads).
2. **Leads et réseaux** : Instagram (API Graph), LinkedIn (publication), TikTok (API Business et Content Posting), YouTube, X,
   Google Ads, ManyChat, Typeform, Jotform, Tally, Calendly, Cal.com, Brevo, Mailchimp, ActiveCampaign, Lemlist.
3. **Entreprise** : HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday, ClickUp, QuickBooks, Xero, Pennylane, Tiime,
   Sage, Qonto, Yousign, DocuSign, Zendesk, Chatwoot, Trustpilot, Google Chat, Sirene/INSEE.

**Le format OBLIGATOIRE de chaque fiche** (p6:258-262) :

```text
# <Outil> — fiche connecteur
Source : <pages officielles lues, chacune avec son lien et la date de lecture> · nœud n8n : <type exact, ou « aucun : nœud HTTP »>
Ce que le système en fait : <ligne de la matrice OUTILLAGE.md qui l'emploie>
Portées demandées (le minimum) : <liste exacte des portées ou permissions, lecture d'abord>
Ce qu'on lit : <…>                Ce qu'on écrit (après la porte) : <…>
Où vit l'autorisation : <jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj>
Comment le client la retire : <…>  Ce qui se passe quand elle expire : <le système se tait, « Connexions » le dit, une alerte part>
Quotas de l'API : <chiffres officiels, avec leur source>      Coût : <prix officiel daté, ou « gratuit », ou « à vérifier »>
Entrée sans webhook (n8n n'est pas exposé) : <comment on lit à intervalle, ou « par Presti et la base »>
Test hors ligne qui le prouvera : <ce que le juge vérifiera>
Points à vérifier par Claude Code : <ce que la documentation ne dit pas clairement>
```

**Reprise** (03/11, 14 h 10) : une première passe a écrit Google Agenda, Outlook Agenda, OneDrive, Telegram et Slack. Une fiche déjà présente
dans le dossier de sortie reste telle quelle. Tu écris les suivantes dans l'ordre de la liste, autant que la passe le permet, puis tu mets
`INDEX.md` à jour.

**Sortie** : un fichier par outil, `plans/011-cadrage-01-11/p6-signature/outillage/connecteurs/<outil-en-minuscules>.md`. Puis un index
`plans/011-cadrage-01-11/p6-signature/outillage/connecteurs/INDEX.md`, une ligne par outil : nœud, coût, quotas, voie d'entrée.

**Règles** :
- Le réseau neuronal d'abord : MCP `cerveau`, `regles_pour` sur « outils payants, données de clients, comptes, Brevo, réseaux sociaux ».
- Faits seulement : un quota ou un prix vient d'une page officielle datée, sinon « à vérifier ». Rien d'inventé.
- Aucune donnée personnelle. Aucun compte créé, aucun envoi, aucune publication, aucune clé lue ou saisie.
- Collecte LinkedIn interdite : LinkedIn sert seulement à publier, sur le compte du client.
- Tu n'écris que les fichiers de sortie.
- En fin : `--fini <id> --resume "<n> fiches écrites, <m> à vérifier"`.
