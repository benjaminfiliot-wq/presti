# Demande de vérification Google de l'application OAuth de Presti — RÉDIGÉE, NON ENVOYÉE (tâche 036-009)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Décision 2 du plan
> (`plans/011-cadrage-01-11/p6-signature/premiere-reponse.md:373-385`) : **IMAP/SMTP d'abord ; Gmail en OAuth ne se promet à personne avant
> la vérification ; 036-009 rédige la demande sans l'envoyer ; la dépense reste à Benj.**
> **Statut : prête à envoyer par Benj. Aucun agent ne l'a envoyée, ni ne crée le projet, l'application, l'identifiant ou le compte**
> (`.claude/rules/securite.md` : compte, dépense, envoi à un tiers = gestes réservés). Rien de ce texte n'a été relu sur Internet depuis cet hôte
> (réseau sortant fermé) : les formulaires, règles et noms de champs de Google sont **à revérifier le jour de l'envoi** sur les pages citées en bas.

## 0. Ce que je recommande, en une phrase

**Envoyer d'abord la vérification pour l'agenda et Drive seulement** (portées « sensibles » et « non sensibles » : vérification sans évaluation de
sécurité, 0 €), et **garder Gmail en IMAP/SMTP** tant que le nombre d'artisans Signature qui le demandent ne paie pas l'évaluation annuelle ; la
demande Gmail (§ 4) est prête pour ce jour-là. Le code suit déjà cette règle : Gmail en OAuth reste fermé tant que `GOOGLE_VERIFICATION_GMAIL`
ne vaut pas `accordee` (`lib/connexions/oauth.ts`, `fournisseurOuvert`), et tout reste derrière le drapeau `connexions` baissé (`lib/flags.ts:344`).

## 1. Les portées, et pourquoi chacune

Liste exacte demandée par le code (`lib/connexions/oauth.ts`, `PORTEES`, contrôlée par `scripts/connexions-qa.mjs`, section C et mutants
« portée élargie ») ; `include_granted_scopes=false`, `access_type=offline`, PKCE S256.

| Portée | Classe chez Google (à confirmer sur la console) | Outil | Pourquoi, en français | Justification à coller (anglais, formulaire Google) |
|---|---|---|---|---|
| `openid`, `email` | non sensible | tous | afficher dans « Connexions » quel compte est branché ; empêcher de brancher deux fois le même | "Used only to display which Google account the business owner connected, and to prevent connecting the same account twice." |
| `https://www.googleapis.com/auth/calendar.freebusy` | sensible | Google Agenda | lire **les créneaux occupés** de l'artisan pour ne proposer à ses clients que des créneaux réellement libres ; ni titre, ni lieu, ni invité | "Presti proposes appointment slots to the business owner's customers. We read only free/busy information of the owner's primary calendar so that we never propose a slot that is already taken. We do not read event titles, attendees, locations or descriptions, and we do not create events with this scope." |
| `https://www.googleapis.com/auth/drive.file` | non sensible | Drive, Sheets | ranger les devis, factures et photos d'un chantier dans un dossier créé par Presti ; lire un classeur **que l'artisan choisit lui-même** dans le sélecteur Google pour importer ses clients, tarifs ou stock, après aperçu et validation | "Presti stores the quotes, invoices and job photos it creates in folders it creates in the owner's Drive, and reads a spreadsheet only when the owner explicitly selects it with the Google Picker to import their own customers or prices. We have no access to any other file." |
| `https://www.googleapis.com/auth/gmail.readonly` (**§ 4, plus tard**) | **restreinte** | Gmail | lire les demandes de devis reçues pour les ranger dans la conversation du bon client et préparer la réponse que l'artisan valide | "Presti reads incoming customer requests in the business owner's inbox so that each request is attached to the right customer conversation and a reply draft is prepared for the owner to approve. Messages are processed to provide this user-facing feature only." |
| `https://www.googleapis.com/auth/gmail.compose` (**§ 4, phase 2**) | **restreinte** | Gmail | Studio : écrire le brouillon de réponse dans la vraie boîte, **jamais envoyé** par Presti ; Signature : envoyer la réponse que l'artisan a autorisée | "On the Studio plan Presti writes a reply draft into the owner's Drafts folder and never sends it; on the Signature plan, and only for the message types the owner has enabled, Presti sends the approved reply from the owner's own mailbox." |

Portées **jamais demandées** : `https://mail.google.com/` (accès complet, suppression), `gmail.modify`, `calendar` (agenda complet), `drive` et
`drive.readonly` (tout le Drive), `spreadsheets` (tous les classeurs), `contacts`.

## 2. L'écran de consentement (à remplir par Benj sur la console Google Cloud)

| Champ | Valeur proposée | À vérifier avant l'envoi |
|---|---|---|
| Type d'utilisateurs | Externe | — |
| Nom de l'application | Presti | c'est la marque que voit **l'artisan** (client de Presti), dans la console ; ses propres clients ne voient jamais cet écran (white-label intact, `lib/email.ts:6-11`) |
| Logo | le logo de Presti (120 × 120, fond uni) | son ajout déclenche la vérification de la marque |
| Adresse d'assistance | une adresse `@prestiapp.fr` choisie par Benj | joignable, lue |
| Domaine autorisé | `prestiapp.fr` | **domaine vérifié dans Google Search Console** par Benj (compte) |
| Page d'accueil | `https://prestiapp.fr` | décrit l'application, accessible sans connexion |
| Règles de confidentialité | `https://prestiapp.fr/confidentialite` (`app/confidentialite/`) | **à compléter avant l'envoi** (tâche dédiée, hors de ce lot) : une section « Données Google » qui dit quelles données Google sont lues, pourquoi, où elles vivent (Supabase UE), combien de temps, comment les effacer (bouton « Retirer »), et la déclaration d'usage limité du § 3 |
| Conditions d'utilisation | `https://prestiapp.fr/cgu` (`app/cgu/`) | — |
| URI de redirection | `https://qg.prestiapp.fr/api/connexions/google/retour` | **le même hôte que la console** qui pose le cookie `__Host-` de l'état (sinon tout branchement est refusé, refus par défaut) ; la valeur exacte va dans `GOOGLE_OAUTH_REDIRECT_URI` |
| Origine JavaScript | aucune (l'échange se fait côté serveur) | — |
| Contacts développeur | une adresse de Benj | — |

## 3. La déclaration d'usage limité (« Limited Use »), à coller et à reprendre dans la politique de confidentialité

> Presti's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy,
> including the Limited Use requirements. Google user data is used only to provide the user-facing features described above, at the request of
> the business owner who connected their account. It is never sold, never used for advertising, and never used to develop, improve or train
> generalized artificial-intelligence or machine-learning models. When an AI model drafts a reply, the message content is sent to our model
> provider only to produce that draft for the owner, under terms that exclude training on it. No human at Presti reads Google user data, except
> with the owner's explicit consent for a support request, for security purposes, or to comply with the law. Tokens are encrypted at rest
> (AES-256-GCM) and the owner can revoke access at any time from the "Connections" screen, which deletes the stored tokens immediately.

Points que Benj confirme avant de la signer (je ne les invente pas) : les conditions du fournisseur de modèle sur l'absence d'entraînement (à lire
dans ses conditions commerciales le jour de l'envoi) ; la durée de conservation exacte des messages importés ; l'hébergement en UE (Supabase,
eu-central-1, `.claude/rules/architecture-outils.md`).

## 4. Gmail : la partie « restreinte » (prête, à n'envoyer que le jour où Benj accepte la dépense)

- **Ce qui s'ajoute** : les portées `gmail.readonly` (puis `gmail.compose`), et **l'évaluation de sécurité annuelle** (CASA, niveau 2 en général)
  par un évaluateur agréé, payée par Presti, à renouveler chaque année.
- **Coût relevé le 03/11/2026** (plan, décision 2, à confirmer par un devis) : **500 à 6 000 dollars par an** à l'évaluateur, ordre de grandeur de
  sources non officielles ([deepstrike.io](https://deepstrike.io/blog/google-casa-security-assessment-2025),
  [unipile.com](https://www.unipile.com/integrating-google-oauth-2-0-user-authentication-into-your-app/)) ; un chiffre de 15 000 à 75 000 dollars vient
  d'un vendeur d'application déjà vérifiée et **n'est pas retenu**. Règle officielle des portées restreintes : [aide Google](https://support.google.com/cloud/answer/13465431?hl=fr).
- **Délai** (même relevé) : quelques jours pour la revue de Google, plus long pour l'évaluation.
- **Ce que l'évaluation regardera chez nous, déjà en place** : jetons chiffrés au repos, deux clés séparées pour l'app et pour n8n, chiffrés liés à
  leur ligne (`lib/connexions/chiffrement.ts`) ; aucun jeton renvoyé au navigateur ni écrit dans un journal ; état lié à la session et PKCE
  (`lib/connexions/oauth.ts`) ; retrait qui efface (`lib/connexions/etat.ts`, `patchRetrait`) ; RLS sur `connexions`
  (`supabase/migrations/0193_systeme_agents.sql`, non appliquée) ; en-têtes de sécurité du site existants ; juge `scripts/connexions-qa.mjs`.
  **À préparer avant elle** : un inventaire des sous-traitants qui voient des données Gmail, la politique de conservation, et un test d'intrusion
  si l'évaluateur l'exige.
- **Alternative gratuite, déjà en service** : IMAP/SMTP avec un mot de passe d'application saisi par l'artisan lui-même (`lib/canaux.ts`, `imap.md`).

## 5. La vidéo de démonstration à tourner (par Benj, sur un compte Google de test, sans aucune donnée réelle)

Exigée par Google pour les portées sensibles et restreintes ; non répertoriée sur YouTube ; en anglais ou sous-titrée en anglais (à vérifier).

1. La page `https://prestiapp.fr`, puis la connexion à la console avec un **compte artisan de test** (créé par l'API admin, supprimé après).
2. L'écran « Connexions » (036-011), le bouton « Connecter » de Google Agenda.
3. **L'écran de consentement de Google en entier**, avec la barre d'adresse visible : on doit y lire `client_id=` (l'identifiant de l'application
   déclarée) et la liste des portées demandées.
4. Le retour sur la console : « Connecté », le compte affiché.
5. **Chaque portée en usage** : une demande d'un client de test → les créneaux libres proposés, lus dans l'agenda de test (`calendar.freebusy`) ;
   un devis PDF rangé dans le dossier Drive créé par Presti, puis l'import d'un classeur choisi dans le sélecteur (`drive.file`). Pour Gmail (§ 4) :
   une demande reçue dans la boîte de test, rangée dans la conversation, puis le brouillon préparé et **non envoyé** en Studio.
6. Le bouton « Retirer » : l'état passe à « Retiré », puis la page des autorisations du compte Google de test montre que Presti n'y est plus.

## 6. Avant d'envoyer : la liste de Benj

- [ ] Projet Google Cloud de Presti créé ; API Calendar, Drive, Sheets et Picker activées (Gmail seulement au § 4).
- [ ] Domaine `prestiapp.fr` vérifié dans Search Console.
- [ ] Politique de confidentialité complétée (§ 2, § 3) et en ligne.
- [ ] Application OAuth « Web » créée ; URI de redirection du § 2 ; variables `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
      `GOOGLE_OAUTH_REDIRECT_URI` et `BOITE_CLE_N8N` posées par lui dans Vercel (et `BOITE_CLE_N8N` dans les exécuteurs n8n d'Oracle).
- [ ] Migrations `0185`, `0192`, `0193` collées, **puis** drapeau `connexions` levé (`.claude/rules/migration-production.md`) — sur un compte de
      test d'abord, le temps de tourner la vidéo.
- [ ] Vidéo tournée (§ 5), lien non répertorié.
- [ ] Formulaire de vérification rempli avec le § 1 (justifications) et le § 3 ; envoyé **par lui**.
- [ ] Pour Gmail seulement : devis de l'évaluateur reçu, dépense acceptée par écrit, puis `GOOGLE_VERIFICATION_GMAIL=accordee` après l'accord de Google.

## Sources

Relevées le 03/11/2026 par le plan (`premiere-reponse.md`, « Sources externes consultées »), non relues depuis cet hôte :
[support.google.com/cloud/answer/13465431](https://support.google.com/cloud/answer/13465431?hl=fr) ·
[deepstrike.io, CASA 2025](https://deepstrike.io/blog/google-casa-security-assessment-2025) ·
[unipile.com, vérification OAuth 2026](https://www.unipile.com/integrating-google-oauth-2-0-user-authentication-into-your-app/).
À lire le jour de l'envoi : la politique « Google API Services User Data Policy » (usage limité) et la page de la console sur la classification des portées.
