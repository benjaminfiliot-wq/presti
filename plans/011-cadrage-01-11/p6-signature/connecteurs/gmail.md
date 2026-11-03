# Fiche connecteur — Google : Gmail et Google Agenda de l'artisan (tâche 036-009)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4 (« Les vrais outils : les connecteurs »,
> `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`). Décisions 1, 2 et 5 du plan
> (`plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` § 5). Une seule application OAuth Google sert Gmail, l'agenda et Drive
> (`drive-sheets.md`) ; sa vérification est rédigée dans `verification-google.md`, **jamais envoyée par un agent**.
> Le code « Connecter / Retirer » existe (`lib/connexions/`, `app/api/connexions/`), **derrière le drapeau `connexions` baissé**
> (`lib/flags.ts:344`) : route 404, rien à l'écran, aucun jeton stocké. Aucune application OAuth n'est créée ; rien n'a été relu sur
> Internet depuis cet hôte (réseau sortant fermé) : ce qui dépend de Google est **à vérifier à la date du geste**.

## Gmail

| Champ | Gmail (API Gmail, OAuth Google) |
|---|---|
| **Portées demandées** | `openid`, `email` (afficher le compte branché, ne pas brancher deux fois la même boîte : index `connexions_vivante_unique`, `0193_systeme_agents.sql:136-138`), `https://www.googleapis.com/auth/gmail.readonly`. **Rien d'autre** (`lib/connexions/oauth.ts`, `PORTEES`) ; `include_granted_scopes=false` : une connexion ne récupère jamais des portées accordées auparavant. Phase 2, par une tâche dédiée et **après** la vérification : `gmail.compose` (brouillon de Studio, envoi de Signature). Jamais `https://mail.google.com/` (accès complet, suppression comprise). Le juge refuse toute portée en plus (mutants « portée élargie »). |
| **Ce qu'on lit** | Phase 1 : les messages reçus depuis la dernière relève (identifiant, en-têtes expéditeur, objet, date, texte brut), pour les déposer **une fois** dans la conversation du client (`Message-ID`, comme `lib/releveCanal.ts` et `lib-boite-lire`, `imap.md`). Ni pièce jointe (phase Drive), ni autre libellé que la boîte de réception. |
| **Ce qu'on écrit** | Phase 1 : **rien** chez Google. Phase 2 : Studio = un brouillon dans la vraie boîte, **jamais envoyé** ; Signature = l'envoi du seul type `reponse_prospect` quand le pilote l'autorise (`lib/pilote/regles.ts:54`, 10 min, 20 par jour : `:27`, `:30`) ; libellés « à traiter », « devis », « factures ». Côté Presti : la ligne `connexions` (état, portées, deux secrets chiffrés). |
| **Où vit l'autorisation** | **Supabase, chiffrée**, table `connexions` (`0193_systeme_agents.sql:99-128`) : `secret_app` chiffré avec `CANAUX_KEY`, `secret_n8n` chiffré avec `BOITE_CLE_N8N` (la clé propre à n8n, nom fixé par 036-003), format `v1.<iv>.<tag>.<données>` de `lib/secretBox.ts:21-30` (fichier inchangé), **lié à sa ligne** par la donnée associée GCM `connexions:<id>:app|n8n` (`lib/connexions/chiffrement.ts`). n8n ouvre `secret_n8n` **en mémoire, à l'exécution** (nœud HTTP Request avec le jeton déchiffré ; jamais un identifiant n8n par artisan). Jamais dans n8n en clair, jamais dans un fichier versionné, jamais dans un journal (contrôle statique du juge). L'échange OAuth vit sur Presti, jamais sur n8n (décision 1). |
| **Retrait par le client** | Bouton « Retirer » de l'écran « Connexions » (036-011) → `POST /api/connexions/retirer { id }` : la ligne de **son** compte seulement (filtre `artisan_id`), révocation chez Google au mieux (`oauth2.googleapis.com/revoke`), puis état `retiree`, `secret_app` et `secret_n8n` à `null`, `retiree_le` posé (`patchRetrait`, `lib/connexions/etat.ts`) ; la base le refait d'elle-même (`connexions_coherence`, `0193:143-176`). Idempotent. Le client peut aussi retirer l'accès depuis son compte Google : Presti le voit au rafraîchissement suivant (`invalid_grant`, ligne suivante). |
| **Expiration, refus** | `jetonUtilisable` (`lib/connexions/etat.ts`) ne lève jamais : `invalid_grant` (autorisation retirée chez Google, expirée, mot de passe changé) → état `expiree`, **une** alerte `connexion_expiree` (au titulaire, par `lib-alerter` de n8n, sans secret) ; « Connexions » affiche « Autorisation expirée : reconnectez-le » (`vueConnexion`). Google injoignable ou en panne → silence, ni état changé ni alerte (le disjoncteur compte). Connexion déjà expirée → silence, pas d'alerte de plus. Le département qui en dépend se tait ; rien ne plante. **Attention** : tant que l'application reste « en test » chez Google, ses jetons de rafraîchissement expirent au bout de 7 jours (règle Google à revérifier) : une raison de plus pour ne rien promettre avant la vérification. |
| **Quotas de l'API** | Quotas par projet et par utilisateur de l'API Gmail, en « unités » par méthode : à relever sur la page officielle « Usage limits » de l'API Gmail le jour du geste (non relue ici). Nos propres plafonds : une relève toutes les 5 minutes au plus par boîte (`presti-boite`, 036-003), 20 envois automatiques par jour et par compte (`lib/pilote/regles.ts:30`). |
| **Coût** | API gratuite. **La vérification** : portées « restreintes » → vérification de l'application **et évaluation de sécurité annuelle** (CASA) par un évaluateur agréé ; ordre de grandeur relevé le 03/11/2026 dans des sources non officielles : **500 à 6 000 dollars par an** (plan, décision 2, `premiere-reponse.md:373-385`, sources citées dans `verification-google.md`). D'ici là : **IMAP/SMTP, gratuit** (`imap.md`, `lib/canaux.ts`). Gmail en OAuth est **fermé dans le code** tant que Benj n'a pas posé `GOOGLE_VERIFICATION_GMAIL=accordee` (`fournisseurOuvert`, `lib/connexions/oauth.ts`). |
| **Le test qui le prouve** | `node scripts/connexions-qa.mjs` (hors ligne, faux Google) : drapeau baissé = 404 partout, aucun appel ; Gmail fermé sans vérification (409) ; portées exactement minimales ; PKCE S256 contrôlé par le faux Google ; state différent, cookie absent, altéré ou échu = refus sans échange ; portée élargie accordée = refus et révocation ; aucun jeton, code, vérificateur ni client secret dans une réponse ; secrets au format v1, chacun ouvrable par sa seule clé ; retrait = jetons effacés ; expiration = état + une alerte, sans plantage ; 33 mutants. |

## Google Agenda

| Champ | Google Agenda (API Calendar, même application OAuth) |
|---|---|
| **Portées demandées** | `openid`, `email`, `https://www.googleapis.com/auth/calendar.freebusy` : **les créneaux occupés, rien d'autre** (ni titre, ni lieu, ni invités). Phase 2 (poser le rendez-vous choisi, après un clic de l'artisan, décision 5) : `calendar.events.owned` ou `calendar.events`, la plus étroite qui suffit, à confirmer sur la console le jour du geste ; jamais `calendar` (complet). |
| **Ce qu'on lit** | `freeBusy` sur l'agenda principal, sur la fenêtre utile (essai de lecture : les 24 prochaines heures, `ESSAI_LECTURE`, `lib/connexions/oauth.ts`). Le planificateur (`lib-agenda-creneaux`, 036-008) ne propose **que** des créneaux libres lus ; « un créneau absent de l'agenda ne peut pas être proposé ». |
| **Ce qu'on écrit** | Phase 1 : rien. Phase 2 : le rendez-vous choisi par le client et validé par l'artisan — **carte, en Studio comme en Signature** (décision 5 : « rendez-vous posé » hors de la liste fermée `OUTIL_TYPE`, `lib/pilote/regles.ts:53-63`). |
| **Où vit l'autorisation** | Comme Gmail : `connexions`, fournisseur `google_agenda`, deux secrets chiffrés et liés à la ligne. |
| **Retrait par le client** | Comme Gmail. |
| **Expiration, refus** | Comme Gmail : le planificateur se tait (il ne propose aucun créneau plutôt qu'un créneau deviné), « Connexions » le dit, une alerte part. |
| **Quotas de l'API** | Quotas de l'API Calendar par projet et par utilisateur : page officielle « Manage quotas » de Calendar, à relever le jour du geste. Lecture à la demande seulement (une demande de rendez-vous), jamais en boucle. |
| **Coût** | API gratuite. Portées « sensibles » : vérification de l'application **sans** évaluation de sécurité (à confirmer sur la console, plan § 3.2) : 0 € hors le temps de Benj. |
| **Le test qui le prouve** | `node scripts/connexions-qa.mjs` (section C : portée `calendar.freebusy` exacte ; mutant « agenda complet au lieu des créneaux » tué ; section D : l'essai de lecture appelle `freeBusy`, rien d'autre) ; et `scripts/operations-n8n-qa.mjs` (036-008) pour « aucun créneau inventé ». |

## Ce que la vidéo de référence change ici

`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md:63` (image 044, `POST /webhook/gmail-reply` qui classe une réponse) et
`:132`, `:167`, `:263` (l'agent « réserve dans l'agenda ») : on reprend **la lecture** de la boîte et **la lecture** de l'agenda ; on ne reprend
**pas** la réservation seule (décision 5) ni l'agent vocal (hors périmètre, outil payant, p6 § 0.2 F).

## Gestes préparés pour Benj (aucun n'est fait)

1. Créer le projet Google Cloud de Presti et l'application OAuth « Web » (écran de consentement, domaines) : `verification-google.md`.
2. Poser dans Vercel `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`
   (`https://qg.prestiapp.fr/api/connexions/google/retour`, à confirmer : l'URL exacte de la console) et `BOITE_CLE_N8N` (32 octets aléatoires
   en base64, **générés par lui**, la même valeur dans l'environnement des exécuteurs n8n d'Oracle) ; jamais `CANAUX_KEY` dans n8n.
3. Coller `0185`, `0192`, `0193` (dans cet ordre), **puis** lever `connexions` (`lib/flags.ts:344`). Gmail reste fermé tant que
   `GOOGLE_VERIFICATION_GMAIL=accordee` n'est pas posé, après l'accord de Google et, s'il le veut, le paiement de l'évaluation.
