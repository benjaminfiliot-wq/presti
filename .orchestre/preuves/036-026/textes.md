# 036-026 — tous les textes visibles

Relevés mécaniquement (Playwright, `innerText`, FAQ dépliée) sur le rendu hors ligne de la carte, de la page et du contact : `node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/036-026/outils/capture.mjs <dossier>` puis `node .orchestre/preuves/036-026/outils/textes.mjs <dossier>`. Les flèches « ↓ » du sommaire sont décoratives (`aria-hidden`).

## La carte de #tarifs (variante lp)

```text
SUR MESURE
Presti pour l’entreprise

Votre propre équipe d’assistants IA, construite pour votre entreprise et branchée sur vos outils.

Sur mesure : votre équipe, vos outils, vos automatisations. Sur démonstration et sur devis.
Sur devis, après un premier rendez-vous
Un organigramme d’assistants écrit pour vous : un Cerveau, des chefs de service, des spécialistes
Branché sur vos outils : Gmail, Outlook, Google Agenda, Slack, Teams, votre CRM, votre compta
Vos procédures écrites, une à une, guident chaque assistant
Un CRM sur mesure : vos champs, vos étapes, vos rôles, votre vocabulaire
Des applications à votre nom : centre de commande, app de terrain, portail de vos clients
La même autonomie que Signature, réglée type par type et fixée au contrat
1
Rendez-vous
2
Accueil
3
Proposition
4
Mise en service
5
Suivi mensuel
Parler à l’équipe
Tout savoir sur l’offre Entreprise
```

## La page /entreprise

```text
PRESTI POUR L’ENTREPRISE
Votre propre équipe d’assistants IA, construite pour votre entreprise.

Des assistants écrits d’après ce qui vous fait perdre du temps, chacun avec son rôle, qui travaillent dans les outils que vous utilisez déjà. Au début, rien ne part sans votre accord ; ensuite, seuls les types d’action que vous acceptez par écrit partent seuls.

Parler à l’équipe
Comment ça se passe
Sur devis, aucun prix public
Même autonomie que Signature
Base de données à Francfort
SUR CETTE PAGE
Votre organigramme d’assistants
↓
Vos outils branchés
↓
Votre CRM et vos applications
↓
Vos données en Europe
↓
Studio, Signature, Entreprise
↓
Vos garanties
↓
CE QUE VOUS OBTENEZ
Une équipe, vos outils, vos applications.

Tout est construit pour vous, à partir de ce qui vous fait perdre du temps : on ne garde que ce qui vous sert.

Votre organigramme d’assistants

Qui décide, qui exécute, qui rapporte. Vous pouvez parler à chaque niveau, par exemple « Où en est la relance des impayés ? » : l’assistant lit l’état réel, il ne devine pas.

RANG 0
Vous
Vous et votre équipe
Vous décidez, vous validez, vous pouvez tout couper.
RANG 1
Pilotage
Le Cerveau
Trie, lit et écrit, parle, vérifie. Il répartit le travail et ne décide jamais d’un montant.
La porte de conformité
Un veto sur tout ce qui sort. Elle ne peut rien envoyer elle-même.
RANGS 2 ET 3
Services
CHEF DE SERVICE
Accueil et qualification
Lecteur de vos boîtes
Trieur
Qualificateur à votre grille
Répondeur
CHEF DE SERVICE
Ventes
Chiffreur sur vos prix
Rédacteur de propositions
Relanceur
CHEF DE SERVICE
Administratif
Pièce manquante
Échéances
Archiviste
CHEF DE SERVICE
Finance
Facturier
Relanceur d’impayés
Export au comptable

Et selon ce qui vous fait perdre du temps : Opérations, Après-vente et réputation, Direction, Marketing.

RANG 3
Connecteurs
Vos outils
Les connecteurs lisent, et n’écrivent que sur la liste d’accès que vous signez.
Vos outils branchés, sous leur vrai nom

Les assistants travaillent dans vos outils, pas à côté. Vous donnez vous-même chaque accès ; chaque outil commence en lecture, et on vérifie qu’il se lit bien avant de vous promettre quoi que ce soit.

MESSAGERIE ET AGENDA
Gmail
Outlook
Google Agenda
DOCUMENTS ET TABLEURS
Google Drive
Google Docs
Google Sheets
OneDrive
Excel
ÉQUIPE
Slack
Microsoft Teams
Google Chat
CRM
HubSpot
Pipedrive
Salesforce
Zoho CRM
Odoo
Airtable
Notion
monday
ClickUp
PAIEMENT ET COMPTA
Stripe
QuickBooks
Xero
Pennylane
Tiime
Sage
SIGNATURE ET AVIS
Yousign
DocuSign
Fiche Google
Votre CRM et vos applications sur mesure

À votre nom et à vos couleurs. On part de ce catalogue, on choisit et on adapte ce qu’exige votre entreprise. Un écran par rôle, et tout ce qu’un assistant fait, un bouton le fait aussi.

POUR : GÉRANT, ASSOCIÉS
Centre de commande de direction

Vos données à jour, la page du matin, l’approbation d’un clic de ce que préparent les assistants, leur organigramme et leur état, le coût de l’IA.

POUR : ADMINISTRATIF, COMMERCIAUX
CRM sur mesure

Vos étapes, vos champs, vos vues par rôle. Une ligne « fait » sous chaque action, et l’import de votre export pour démarrer sur vos vrais chiffres.

POUR : DIRECTION
Vue « monde » de l’entreprise

Vos sites, vos équipes, vos chantiers et votre stock, dessinés comme un monde cliquable, sur vos vraies données.

POUR : COMPAGNONS, TECHNICIENS
App de terrain

Les chantiers du jour, les photos, les PV, la signature du client, le temps passé, le matériel utilisé.

POUR : VOS CLIENTS
Portail de vos clients

Le suivi du dossier, les documents, les devis à signer, les factures, la demande d’intervention avec photo.

POUR : VOTRE ÉQUIPE, VOS CLIENTS
Formulaires métier

Demande d’intervention, état des lieux, check-list de fin de chantier, avec dictée.

POUR : DIRECTION, COMPTABLE
Tableaux de bord et rapports

Vos indicateurs face à votre point de départ, chaque chiffre avec sa source et sa date, et le PDF du lundi.

Vos données hébergées en Europe

Votre base de données est chez Supabase, à Francfort (région eu-central-1). D’un client à l’autre, seuls les gabarits se réutilisent, jamais les données. Les modèles d’IA, eux, ne sont pas tous en Europe : chaque fournisseur est nommé dans le contrat de sous-traitance, et aucune de vos données ne part vers un modèle gratuit en ligne.

STUDIO, SIGNATURE, ENTREPRISE
Ce que le sur-mesure ajoute.

Le même moteur que Signature, avec la même autonomie. Ce qui change, c’est que tout est écrit pour vous.

Ligne
	Studio	Signature	Entreprise
AUTONOMIE	Tout est automatisé et préparé pour vous : vous validez d’un clic, rien ne part sans vous.	Tout part automatiquement : réponses, relances, Pilote et règles, plus le CRM.	Celle de Signature, réglée type par type et fixée au contrat.
ASSISTANTS	L’assistant de gestion, qui prépare	L’assistant de gestion et le Pilote automatique	Un organigramme d’assistants propre à votre entreprise, chaque service avec son chef
CE QUI LES GUIDE	Vos réglages	Vos réglages	Vos procédures écrites, recueillies une à une
OUTILS	Votre boîte e-mail	Votre boîte e-mail	Tous vos outils : Google Workspace ou Microsoft 365, Slack ou Teams, votre CRM, votre compta, votre signature électronique, vos tableurs
DONNÉES	Celles que vous gérez dans Presti	Celles que vous gérez dans Presti	Les vôtres, synchronisées depuis vos outils, avec la date de la dernière synchronisation
CRM	Non inclus	Le CRM « atelier »	Un CRM sur mesure : vos champs, vos étapes, vos rôles, vos vues
APPLICATIONS	La console Presti	La console Presti	Des applications sur mesure : centre de commande, app de terrain, portail de vos clients, formulaires, tableaux de bord
PILOTAGE	Votre console et « Mes chiffres »	Votre console et « Mes chiffres »	Page du matin de direction, rapport du lundi, bilan à un mois, point mensuel
ÉVOLUTION	Celle du produit	Celle du produit	De nouveaux assistants, services et applications par avenant, sans toucher au reste
COMMENT ÇA SE PASSE
Cinq temps, et rien ne se construit sans votre accord écrit.
1
Rendez-vous

Un rendez-vous de découverte : votre métier, vos outils, ce qui vous fait perdre le plus de temps. Vos chiffres se lisent dans vos outils, pas à l’estime.

2
Accueil

Un formulaire en deux temps, avec dictée : d’abord vos outils et vos accès, puis chaque tâche, pas à pas. Vos procédures deviennent des compétences écrites, que vous relisez.

3
Proposition

Ce qui sera construit, le calendrier et le coût récurrent mesuré, en deux options réelles. Le devis vous est envoyé avant, puis parcouru avec vous ligne à ligne. Vous signez le devis, le contrat de sous-traitance et l’annexe d’autonomie.

4
Mise en service

Tout est d’abord construit et testé sur des données de test, sans toucher vos outils. Puis le mode ombre sur vos vraies données : tout se prépare, rien ne sort. Puis la validation d’un clic. Puis l’automatique, type par type, sur votre accord écrit.

5
Suivi mensuel

La page du matin, le rapport du lundi, un bilan à un mois, puis un point chaque mois. Chaque refus de votre part ajuste une procédure ou une règle.

Le premier temps, c’est un rendez-vous.

Parler à l’équipe
VOS GARANTIES
Ce qui est écrit au contrat.
Un contrat de sous-traitance RGPD

Article 28 : Presti agit comme sous-traitant, et chaque sous-traitant ultérieur est nommé.

La liste des accès en écriture, signée

Vos outils commencent en lecture. Un assistant n’écrit que là où vous l’avez signé.

Rien ne part sans votre accord au début

Mode ombre, puis validation d’un clic. L’automatique vient type par type, quand vous l’acceptez par écrit.

Ce qui ne part jamais seul

Encaisser, rembourser ou payer ; émettre ou modifier une facture scellée ; supprimer des données ; répondre seul à un avis négatif. Même au contrat.

De nouveaux assistants par avenant

Un service, un assistant ou une application de plus s’ajoute par avenant, sans toucher au reste.

QUESTIONS
Ce qu’on nous demande avant le rendez-vous.
Combien ça coûte ?
C’est sur devis : il n’y a pas de prix public. Le prix se fixe après le rendez-vous de découverte, dans la proposition, avec deux options réelles et un devis parcouru avec vous ligne à ligne.
En combien de temps est-ce en place ?
Le calendrier est écrit dans la proposition, pour ce qui sera construit chez vous. Chaque outil est d’abord essayé en lecture : on ne promet rien avant d’avoir vu qu’il se lit bien.
Faut-il changer d’outils ?
Non. On branche ceux que vous utilisez déjà : les assistants travaillent dans vos outils, pas à côté.
Où vont nos données ?
Votre base de données est hébergée chez Supabase, à Francfort. D’un client à l’autre, seuls les gabarits se réutilisent, jamais les données. Les modèles d’IA ne sont pas tous en Europe : chaque fournisseur est nommé dans le contrat de sous-traitance, et aucune de vos données ne part vers un modèle gratuit en ligne.
Qui valide ce qui part ?
Vous, au début : rien ne sort sans votre clic. Ensuite, seuls les types d’action que vous acceptez par écrit partent seuls. Payer, encaisser, rembourser, supprimer des données ou répondre à un avis négatif ne partent jamais seuls.
Est-ce le même moteur que Signature ?
Oui, avec la même autonomie, réglée par type d’action et fixée au contrat. Ce qui change, c’est que les assistants, le CRM et les applications sont écrits pour vous.
Parlons de ce qui vous fait
perdre du temps.

Un premier rendez-vous pour comprendre votre entreprise et vos outils. Ensuite, une proposition avec deux options réelles.

Parler à l’équipe
```

## Le contact, /contact?motif=entreprise (colonne et formulaire)

```text
Accueil
›
Nous écrire
PRESTI POUR L’ENTREPRISE
Parlons de votre entreprise

Dites-nous en quelques lignes qui vous êtes et ce qui vous fait perdre du temps. Nous vous proposons ensuite un rendez-vous.

Un rendez-vous de découverte : votre métier, vos outils, ce qui vous fait perdre le plus de temps.
Une proposition avec deux options réelles, et un devis parcouru avec vous ligne à ligne.
Rien n’est construit sans votre accord écrit.

Avant d’écrire ? Tout savoir sur l’offre Entreprise : ce qui est construit pour vous, comment ça se passe, vos garanties.

Votre nom
Votre email
C’est là que la réponse arrivera.
Votre entreprise, en quatre réponses
Société
Envoyer le message

[message prérempli]
Votre entreprise et votre métier :

Combien vous êtes :

Vos outils (messagerie, agenda, CRM, compta…) :

Ce qui vous fait perdre le plus de temps :
```

## Les métadonnées de /entreprise

```ts
export const metadata: Metadata = {
  title: 'L’offre Entreprise : vos assistants IA sur mesure',
  description:
    'Une équipe d’assistants IA construite pour votre entreprise, branchée sur vos outils (Gmail, Outlook, Google Agenda, Slack, Teams, votre CRM), avec votre CRM et vos applications sur mesure. Sur devis, après un rendez-vous.',
  alternates: { canonical: '/entreprise' },
}
```

## Le contact sans motif

Inchangé : mêmes textes qu'avant (diff de `app/contact/page.tsx` : seules la signature de la fonction, la branche `entreprise` et la prop `motif` du formulaire sont ajoutées ; `app/contact/Formulaire.tsx` garde, sans motif, le même libellé, le même nombre de lignes et le même corps envoyé).
