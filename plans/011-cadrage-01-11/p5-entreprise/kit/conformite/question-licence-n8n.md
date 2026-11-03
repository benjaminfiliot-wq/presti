# Brouillon — la question à license@n8n.io (licence de n8n et offre « Presti pour l'entreprise »)

> **BROUILLON, NON ENVOYÉ.** Tâche 035-011, écrit le 02/11/2026 par Claude Code. **Benj l'envoie lui-même**, depuis sa propre boîte :
> Claude Code n'envoie rien (`.claude/rules/securite.md`, « Actions irréversibles » ; périmètre de la tâche). Ce fichier est le seul livrable.
>
> **Pourquoi.** Question 3 de `premiere-reponse.md:885` : « La licence de n8n couvre-t-elle l'offre ? » Benj l'envoie « avant le premier
> contrat ». D'ici la réponse écrite, le client ne règle que des **paramètres bornés** (`premiere-reponse.md:885` ; `:134-135`).
>
> **Ce que le dossier sait déjà** (à relire avant d'envoyer : ces faits viennent de la FAQ lue le 01/11/2026 par ADR-001, et le 02/11 par
> les fiches `fiches-depots.md` (fiche 3) et `fiche-methode-n8n.md` (fiche 12) ; la FAQ n'a pas été relue en ligne pour cette pièce) :
> - n8n est sous la **Sustainable Use License 1.0**, sauf les fichiers « .ee » (licence Enterprise) (`fiches-depots.md:262-265`).
> - Selon la FAQ : permis de construire, faire tourner et maintenir des workflows **sur sa propre instance pour des clients** qui n'y accèdent pas ;
>   permis que ces clients branchent leurs propres comptes ; permis de déclencher des workflows préconstruits par API ou webhook ; **interdit** un
>   constructeur de workflows intégré à un SaaS, même derrière une interface maison, et d'héberger n8n pour que des clients y construisent
>   (`fiches-depots.md:367-372` ; `fiches-depots.md:306-308`).
> - **Le risque porte sur le mot « règle ».** La fiche 12, qui a lu la FAQ en entier le 02/11, la résume ainsi : n8n comme moteur interne d'un SaaS
>   est permis « sans que l'utilisateur voie **ou règle** un workflow » ; est interdit l'hébergement où le client « construit **ou règle** ses
>   workflows (interface, API, MCP, agent IA), même par une interface maison » (`fiche-methode-n8n.md:698-703`). Un paramètre borné que le client
>   modifie dans l'interface de Presti est **exactement la zone grise** : la fiche la nomme (`fiche-methode-n8n.md:704` « Zone grise » ; `:712-713` « À faire confirmer »).
>   C'est l'objet de la question A.
> - **Le branchement des comptes du client est ouvert**, pas réglé : il « ne doit pas faire passer le client par n8n » (`fiche-methode-n8n.md:709-714`,
>   question 7 du § 5 de `fiche-methode-n8n.md` : défaut « une séance menée par Benj où le client saisit lui-même son mot de passe chez son fournisseur ; n8n n'est pas
>   exposé », `fiche-methode-n8n.md:1046-1047`). Le message décrit ce défaut et pose la question A.5, sans présenter le lien en libre-service comme acquis.
> - La variante en libre-service de la question A.5 suppose un n8n joignable depuis le navigateur du client : ce serait une **décision de sécurité de
>   Benj** (p5:117), pas un réglage ; la poser à n8n n'engage à rien.
> - Benj **relit la FAQ à la source** avant d'envoyer, et remplace le texte « Exemple. [exact wording] » du message par les mots anglais exacts.
>
> **Ce qu'il ne faut pas faire en attendant** : promettre au client un réglage de la logique ; lui montrer l'éditeur de n8n (la démo du mode A est un
> rapport HTML statique : `premiere-reponse.md`, question 4) ; activer une fonction « .ee » en production.
>
> **Le prix de l'offre n'a rien à faire dans ce message** : ne pas l'ajouter. Ne pas y joindre de donnée d'un client ni de prospect, ni identifiant,
> ni adresse du serveur.
>
> **Les trous à remplir par Benj** : le texte entre crochets « Exemple. [...] » (nom, société, adresse d'expédition). Le nom de la société
> d'édition de Presti n'est pas dans cette pièce : à compléter.

---

## Le message à envoyer (en anglais, la langue de la FAQ de licence)

**To:** license@n8n.io
**Subject:** Sustainable Use License — self-hosted n8n running tailored workflows for the customers of a SaaS (clarification request)

Hello,

I run Exemple. [company name], a French software publisher. I would like to check, before signing any customer, whether our planned use of
self-hosted n8n fits the Sustainable Use License 1.0 (and the license FAQ at
https://docs.n8n.io/n8n-community-license/community-license/license-faq.md, which I read on Exemple. [date of reading]). I would rather ask
than guess.

**Our setup**

- We self-host a single n8n instance (version 2.45.7 at the time of writing, Docker, in an EU cloud region), on a server we operate.
  Nobody outside our company has an account on it, can log in to it, or can see the editor.
- We **plan to sell** a service to small and medium businesses (no customer has signed yet): a tailored automation system (reminders for unpaid invoices and quotes, reports, alerts,
  qualification of incoming requests). **We** design, build and maintain the workflows, for each customer separately, and we run them on our
  instance. The customer pays for the service, not for access to n8n.
- Customers use **our own web interface**, not n8n. In that interface they can only change a short list of **bounded parameters** that we define
  in advance (for example a reminder delay within a fixed range, a daily sending limit, an on/off switch). Parameters are stored in our
  database. The workflows read them; the customer cannot create, edit, reorder or add a node, a rule or a condition.
- Customers connect **their own accounts** (calendar, mailbox, accounting tool). Our default plan is a short session led by us: the customer types
  their own password on their provider's page, never sees n8n, and the resulting credentials are stored in n8n, one set per customer. The n8n
  instance is not reachable from the Internet. We have not settled whether a self-service variant is acceptable, hence question A.5.
- Our application does not call n8n through a public webhook: the workflows poll our database on a schedule and write their results back.
- We do not redistribute or modify n8n. To the best of our knowledge we use no file marked ".ee" and no paid feature (we will check the plan and
  usage screen of the instance before we go live). We may register the instance with a free license key (not decided yet; question B covers what
  that sends to n8n).

**Our questions**

**A. License fit.** Is the use described above — running tailored workflows for paying customers on our own instance, with a settings screen limited
to bounded parameters that the workflows read — permitted under the Sustainable Use License 1.0 as you interpret it? In particular:

1. The FAQ, as we read it, forbids offering customers the ability to **build or configure** their workflows, even through a custom interface
   (Exemple. [exact wording of the FAQ, to be copied from the page by the sender]). Does a settings screen limited to bounded parameters count as
   "configuring" a workflow in that sense? If not, where do you draw the line between a bounded parameter and workflow logic (for example: may a customer choose from a fixed list of predefined variants of a workflow, or turn a
   predefined step on or off)?
2. Is charging a fee for building, running and maintaining workflows for customers permitted, as long as customers have no access to the instance?
3. Is it acceptable to keep several customers' workflows on one instance, separated by naming, tags and per-customer credentials?
4. Under which exact conditions would you require an Enterprise or embedding license for this use?
5. Connecting a customer's accounts: is our default acceptable (a session led by us, where the customer enters their own credentials on their
   provider's page and never sees n8n or its editor)? Would a self-service variant also be acceptable, where the customer grants OAuth consent
   through a link generated by our own interface and never logs in to n8n? Or must the customer's accounts be connected in some other way?

**B. Data and telemetry.** Does a self-hosted instance send any data to n8n (telemetry, diagnostics, license checks, version checks, and the free
license-key registration mentioned above)? If so, which
data, to which entity and country, and how can it be switched off or limited? We ask because, as a data processor under the GDPR, we must list every
recipient of our customers' personal data, and we want to be sure that none of it reaches n8n. Is a data processing agreement available if some
data does?

I would be grateful for a written answer that I can keep with our records. If this is better handled by another team or a form, please tell me where
to send it.

Best regards,
Exemple. [full name]
Exemple. [title], Exemple. [company name]
Exemple. [postal address of the company]

---

## Ce que Benj fait de la réponse

| Réponse de n8n | Suite |
|---|---|
| A : oui, par écrit | L'archiver avec la date et le nom de l'interlocuteur dans le dossier juridique de Benj ; la citer dans le contrat de services ; lever la réserve de `premiere-reponse.md:885`. Une réponse orale ou ambiguë ne lève rien |
| A : non, ou « il faut une licence Enterprise » | Rien ne se vend sur n8n tel quel : décision de Benj (licence payante, autre architecture) ; le prix d'une licence est une dépense soumise à son accord (`.claude/rules/securite.md`) |
| A : réponse partielle (une limite sur les paramètres) | La limite devient une règle de la porte du kit : le client ne règle que ce que n8n a confirmé |
| B : rien n'est envoyé à n8n | Garder la réponse ; `sous-traitants.md` § 3 (n8n hors liste) devient « confirmé le [date] » |
| B : des données partent vers n8n | Couper la fonction si possible ; sinon, n8n entre dans `sous-traitants.md` § 1 avant la signature, et `contrat-sous-traitance.md` annexe 2 suit |
| Pas de réponse | Ne pas la remplacer par une supposition : le premier contrat attend. Relancer, puis décider |

La section n8n du registre des traitements (`docs/registre-traitements.md`, § 23 bis) n'est pas modifiée par cette pièce : elle reste au lot L12.

## Ce que ce message ne dit jamais

<!-- jamais:debut -->
- Jamais le prix de l'offre, ni un nom de client, ni une donnée de prospect.
- Jamais l'adresse ou l'accès du serveur.
- Jamais une affirmation sur le texte de la licence que la FAQ n'a pas écrite : les questions restent des questions.
- Jamais un envoi par Claude Code : Benj envoie, depuis sa boîte.
<!-- jamais:fin -->
