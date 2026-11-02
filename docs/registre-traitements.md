# Registre des traitements — l'entreprise Presti

> Côté ARTISAN, le registre est dans `lib/legalArtisan.ts` : ce que Presti traite **pour le compte** de chaque artisan (ses prospects, ses devis, ses factures), où Presti est sous-traitant. Ce fichier-ci est le registre de **l'entreprise Presti responsable de traitement** : ses clients (les artisans), ses fondateurs, ses prospects, ses fournisseurs. Une ligne par traitement. Mis à jour le 28 septembre 2026 (ajout du § 11, la prospection des professionnels). Mis à jour le 20 octobre 2026 (audit RGPD : §§ 15 à 24, le CRM, les essais gratuits, le traitement central de l’IA et les transferts hors UE).

## 1. Les comptes des artisans (clients de Presti)

| | |
|---|---|
| **Finalité** | Fournir le service : compte, console, offre, crédits, facturation |
| **Données** | Identité professionnelle (nom, entreprise, métier, SIRET, forme juridique, adresse, assurance), email et téléphone, mot de passe haché, offre et crédits, identifiants Stripe, dates de connexion et sessions |
| **Base légale** | Exécution du contrat (conditions générales) |
| **Personnes** | Les artisans inscrits |
| **Durée** | Compte actif, puis 30 jours de grâce après demande de suppression ; les pièces comptables sont conservées 10 ans (`DUREES_MOIS.comptable`) |
| **Destinataires** | Supabase (hébergement, UE), Stripe (paiement), Resend (emails) |
| **Où** | `supabase/migrations/0001_artisans.sql`, `lib/purgeComptes.ts`, `app/api/donnees/export/route.ts` |

## 2. La sécurité des accès et la lutte contre les abus

| | |
|---|---|
| **Finalité** | Empêcher l'usurpation de compte et l'abus des formulaires publics |
| **Données** | Adresses IP **en clair** pour le bannissement d'une source d'abus (`ip_bans`, `ip_abus`) ; adresses **pseudonymisées** partout où un artisan peut les lire (`leads.ip`, `devis.accepte_ip`) ; compteurs anonymes de tentatives ; empreinte d'appareil de confiance (navigateur, jamais l'adresse) ; codes de connexion hachés |
| **Base légale** | Intérêt légitime (sécurité du service et des comptes) |
| **Personnes** | Visiteurs des pages publiques, artisans, fondateurs |
| **Durée** | 12 mois (`DUREES_MOIS.anti_abus`) ; codes et appareils : à leur expiration ; sessions vérifiées : 90 jours |
| **Destinataires** | Supabase |
| **Où** | `lib/security.ts`, `lib/limites.ts`, `lib/connexion.ts`, `supabase/migrations/0013`, `0049`, `0063`, purge dans `lib/purgesRgpd.ts` |

## 3. Les paiements et abonnements

| | |
|---|---|
| **Finalité** | Encaisser l'abonnement, émettre les factures de Presti, suivre les impayés |
| **Données** | Nom de facturation, adresse de facturation, montants, statut d'abonnement, identifiants de paiement. **Presti ne voit ni ne stocke aucun numéro de carte** |
| **Base légale** | Exécution du contrat ; obligation légale (comptabilité) |
| **Personnes** | Artisans abonnés |
| **Durée** | Chez Stripe selon sa politique ; 10 ans pour les pièces comptables |
| **Destinataires** | Stripe (sous-traitant, UE/États-Unis avec clauses contractuelles types) |
| **Où** | `lib/stripe.ts`, `app/api/subscribe`, `app/api/stripe/**`, `lib/direction/stripe.ts` (lecture seule) |

## 4. Les emails envoyés par Presti

| | |
|---|---|
| **Finalité** | Messages de service (code de connexion, alertes de crédits, factures), réponses au formulaire de contact |
| **Données** | Adresse email, contenu du message, journal d'envoi |
| **Base légale** | Exécution du contrat ; intérêt légitime pour le contact |
| **Personnes** | Artisans, personnes qui écrivent à Presti |
| **Durée** | Chez Resend selon sa politique ; les messages du formulaire ne sont pas stockés en base (envoi direct) |
| **Destinataires** | Resend |
| **Où** | `lib/email.ts`, `app/api/contact/route.ts`, `lib/alertes.ts` |

## 5. Le Centre de direction — journal des actions *(v10 J1, 7 septembre 2026)*

| | |
|---|---|
| **Finalité** | Imputabilité et sécurité des actions privilégiées : savoir qui a fait quoi sur les comptes clients, avec l'état avant et après |
| **Données** | Identifiant et adresse de connexion du fondateur, action, cible, état avant/après (minimal, sans secret ni donnée d'identité), **adresse IP de l'acteur en clair**, navigateur. L'adresse d'une cible bannie y est **pseudonymisée** |
| **Base légale** | Intérêt légitime (art. 6.1.f) : imputabilité des actions privilégiées |
| **Personnes** | Les fondateurs (Benjamin, et toute personne à qui un rôle est donné) |
| **Durée** | **24 mois** — le délai de contestation des relevés du contrat de collaboration, augmenté d'une marge ; trigger d'immuabilité, purge automatique |
| **Destinataires** | Supabase. L'artisan concerné par une action peut en obtenir l'extrait dans son export de données (sans l'adresse ni l'appareil du fondateur) |
| **Où** | `supabase/migrations/0065_direction.sql`, `lib/direction/journal.ts`, `app/api/donnees/export/route.ts` |

## 6. Le Centre de direction — re-confirmation, alertes, rôles *(v10 J1)*

| | |
|---|---|
| **Finalité** | Exiger le mot de passe avant une action sensible ; garder les alertes internes jusqu'à leur acquittement ; définir qui peut écrire |
| **Données** | Empreinte d'un jeton court et sa portée ; motif, sujet et corps technique d'une alerte (**adresses email masquées à l'écriture**), artisan concerné par référence ; rôle d'un fondateur |
| **Base légale** | Intérêt légitime (sécurité, continuité de service) |
| **Personnes** | Fondateurs ; artisan cité par une alerte |
| **Durée** | Re-confirmations : 5 minutes de validité, purgées après 7 jours. Alertes : 12 mois après acquittement, **et la ligne disparaît avec le compte de l'artisan concerné** |
| **Destinataires** | Supabase |
| **Où** | `supabase/migrations/0065_direction.sql`, `lib/direction/reconfirmation.ts`, `lib/alertes.ts` |

## 7. Le Centre de direction — lectures de pilotage *(v10 J1)*

| | |
|---|---|
| **Finalité** | Piloter l'entreprise : état du service, chiffres (MRR, encaissé, essais), file des actions |
| **Données** | Agrégats Stripe (montants, statuts, **nom de facturation** du client), comptes d'artisans (offre, crédits, date d'inscription, nom, métier). **Jamais** le contenu des conversations, devis ou factures des artisans, ni leurs prospects — prouvé par `scripts/direction-e2e.mjs` (bloc « sentinelle ») |
| **Base légale** | Intérêt légitime (gestion de l'entreprise) ; exécution du contrat |
| **Personnes** | Artisans clients (agrégés ou nommés), fondateurs |
| **Durée** | Aucun stockage propre : lectures à la source, cache mémoire de 90 secondes pour les sources externes |
| **Destinataires** | Stripe, Supabase, Resend, Anthropic (coûts, si la clé d'administration est posée) |
| **Où** | `lib/direction/stripe.ts`, `app/api/controle/*` |

## 8. Le compte de relecture des stores *(v9, 7 septembre 2026)*

| | |
|---|---|
| **Finalité** | Permettre à Apple et Google d'examiner l'application avec un compte de démonstration |
| **Données** | Un compte fictif (adresse en `.invalid`, jamais délivrable), des conversations et un devis inventés — aucune donnée réelle |
| **Base légale** | Intérêt légitime (publication de l'application) |
| **Personnes** | Aucune personne réelle |
| **Durée** | Tant que l'application est publiée |
| **Où** | `scripts/compte-relecture.mjs`, `app/api/auth/code/verifier/route.ts` |

## 9. Sauvegardes

| | |
|---|---|
| **Finalité** | Restaurer le service après un incident |
| **Données** | Copie chiffrée de la base |
| **Base légale** | Intérêt légitime (continuité) |
| **Durée** | 30 jours (artefact chiffré) |
| **Où** | `docs/sauvegardes.md`, `.github/workflows/sauvegarde.yml` |

## 10. Le mode support — accès ponctuel à un élément d'un compte *(v11 §5, 8 septembre 2026)*

Il ne s'agit **pas** d'ouvrir une session « en tant que » l'artisan. Une telle session produirait des
traces attribuées à lui : ses propres journaux diraient qu'il a consulté ses données, et il n'aurait
aucun moyen de distinguer ses actes des nôtres. Ici, chaque lecture porte le nom de la personne qui
lit, et l'artisan la voit.

| | |
|---|---|
| **Finalité** | Répondre à une demande d'aide portant sur un élément précis (un devis, une facture, une conversation) que l'artisan a lui-même désigné |
| **Données** | La **forme** de l'élément : statut, dates, nombre de lignes, montants, nombre et poids des photos, état d'envoi. **Jamais** le contenu des échanges, les coordonnées des clients de l'artisan, ni les photos elles-mêmes. Plus, pour chaque lecture : le nom de la personne, la vue consultée, l'horodatage |
| **Base légale** | Exécution du contrat (art. 6.1.b) pour l'assistance, **et consentement exprès de l'artisan (art. 7)** pour chaque accès : la fenêtre naît fermée et ne s'ouvre que par son clic |
| **Personnes** | L'artisan ; indirectement ses clients, dont **aucune donnée d'identité ne transite** par cette porte — il peut consentir pour lui, pas pour eux |
| **Durée** | La fenêtre : **60 minutes**, ou moins s'il la referme. Les traces : **24 mois**, comme le journal de direction — la preuve doit vivre aussi longtemps que l'action qu'elle documente |
| **Garanties** | Un ticket qu'il a ouvert est requis ; sans élément désigné par lui, aucun accès n'est demandable ; **pas d'email parti, pas de porte** ; trois demandes au maximum par ticket ; un refus vaut 24 h ; il peut poser un **verrou définitif** « ne plus jamais me demander » ; les traces sont immuables et partent avec son export |
| **Destinataires** | Supabase, Resend (la notification). Aucun tiers |
| **Où** | `supabase/migrations/0074_support.sql`, `0075_support_element.sql`, `app/api/controle/support/`, `app/api/securite/acces-support/`, `app/parametres/CarteSupport.tsx` |

## 11. La prospection des professionnels (agents d'acquisition) *(voie gratuite, 28 septembre 2026)*

Depuis la revue du 25 septembre 2026, Presti ne relève **aucune adresse e-mail** sur le site d'un
professionnel : le premier message part par le **formulaire de contact** publié sur son propre
site, un message par entreprise, à vie, jamais relancé. La seule adresse gardée est celle qu'une
personne nous donne elle-même en nous écrivant.

| | |
|---|---|
| **Finalité** | Proposer à des entreprises du bâtiment un site, et aux annonceurs de la bibliothèque publicitaire de Meta des vidéos publicitaires, en rapport avec leur métier, **par le formulaire de contact de leur site** ; répondre à celles qui écrivent (réponse au formulaire, formulaire « Recevoir la maquette », commentaire, message) |
| **Base légale** | Intérêt légitime, prospection B2B en rapport avec la profession (CNIL, page du 10/06/2026 ; RGPD art. 6.1.f) |
| **Personnes** | Entreprises du bâtiment (artisans), annonceurs de la bibliothèque publicitaire de Meta |
| **Données** | Dénomination, SIREN, commune, métier, faits publics datés avec leur source (dont l'audit du site : HTTPS, affichage mobile, année du copyright), adresse de la page du formulaire de contact et sa technologie, comptes professionnels Instagram et Facebook, preuves de soumission (empreintes ; captures gardées sur l'usine), messages échangés, créneau et numéro donnés pour un rendez-vous. **Aucune adresse e-mail relevée** : la seule adresse gardée est celle qu'une personne nous donne en nous écrivant |
| **Sources** | La liste publique des entreprises RGE de l'ADEME (Licence Ouverte), l'API Recherche d'entreprises (SIRENE), le site de l'entreprise, la bibliothèque publicitaire de Meta, et la personne elle-même (réponse, formulaire, commentaire, message) |
| **Exclusions** | Diffusion partielle (c'est le droit, C. com. A123-96), dirigeants, toute adresse e-mail lue sur un site, les formulaires protégés contre les robots ou qui refusent le démarchage, aucun annuaire ni Google Maps |
| **Information (art. 14)** | Dès le premier message : qui écrit, d'où vient la liste (ADEME ou Meta), l'adresse de la notice (GitHub Pages), comment s'opposer (« écrivez STOP »), et que le message est rédigé et envoyé par l'**assistant IA** de Presti |
| **Durée** | **3 ans** à compter de la collecte ou du **dernier contact émanant du prospect** (nos relances ne comptent pas) ; l'opposition est gardée au-delà, réduite à ses clés |
| **Destinataires** | Aucun |
| **Sous-traitants** | Supabase, Vercel, Google (la boîte Gmail de prospection), Meta (messages Instagram et Facebook, bibliothèque publicitaire), OpenAI (Codex, sur l'abonnement ChatGPT de Presti : classement des réponses, second juge, rédaction des sites — aucune donnée de prospect vers une offre gratuite), Oracle (Oracle Cloud, le serveur de fabrication à Paris) et GitHub (génération des sites commandés, hébergement de la notice) |
| **Droits** | Écrire STOP à l'adresse du message (ou répondre « STOP »), ou écrire au responsable ; opposition appliquée en moins de **10 minutes** sur tous les canaux ; réponse à une demande RGPD dans le mois (art. 12.3) |
| **Où** | `supabase/migrations/0105_acquisition_socle.sql`, `0106_acquisition_echanges.sql`, `lib/agents/acquisition/`, `docs/agents/analyse-interet-legitime.md` |

---

**Droits des personnes.** Les artisans exercent leurs droits depuis Paramètres → Données (export complet, suppression du compte avec 30 jours de grâce). Les fondateurs sont les seules personnes concernées par le journal de direction ; l'adresse IP y est une preuve d'action, conservée 24 mois puis effacée. Toute demande peut être adressée par le formulaire de contact du site.

**À revoir au prochain jalon.** J3 (messagerie de l'entreprise : emails reçus, conservation, assignation), J4 (comptabilité : factures fournisseurs, relevés du partenaire), — le mode support est traité au § 10.

## 12. Le savoir des agents *(couche Savoir, 05 octobre 2026 ; en vigueur à la mise en service, 026-241)*

Les agents de l'usine reçoivent le savoir de Presti (ses documents de travail) pour répondre juste. **Tant que le premier envoi n'est pas
fait (interrupteur `envoi` de `docs/savoir/reglages.json` éteint), aucune donnée ne part.**

| | |
|---|---|
| **Finalité** | Donner aux agents de Presti le savoir de l'entreprise (documents internes, leçons tirées des essais), pour qu'ils travaillent juste |
| **Base légale** | Intérêt légitime (RGPD art. 6.1.f), comme la prospection du § 11 |
| **Personnes** | Les associés (contrats, notes), les prospects des listes de travail (compartiment à part) |
| **Données** | Documents internes caviardés (secrets écartés par chemin) ; les listes de prospects et les contrats des associés dans un compartiment à part, que seuls les scripts des agents lisent |
| **Durée** | Chaque synchronisation remplace la précédente ; une copie précédente est gardée |
| **Destinataires** | L'usine Oracle de Presti ; Codex sur l'abonnement ChatGPT de Presti (entraînement coupé depuis le 25/09/2026) ; modèles locaux. **Aucune IA gratuite** ne reçoit ces données |
| **Où** | `/home/agents/travail/savoir/` (usine), `scripts/savoir/`, `lib/savoir/` |
| **Droits** | Écrire au responsable ; la demande d'effacement d'un prospect s'applique au compartiment à la synchronisation suivante |


## 13. Le géocodage des chantiers *(carte de l'atelier du CRM, lot 5, 20 octobre 2026 ; drapeau `crmAtelierVivant`)*

Presti agit ici **pour le compte de l'artisan** (sous-traitant) : la carte de son atelier place chaque chantier dans sa vraie direction
depuis sa base. Rien n'est envoyé tant que le drapeau est baissé.

| | |
|---|---|
| **Finalité** | Situer les chantiers de l'artisan (et sa base) sur la carte de l'atelier du CRM : direction et distance comprimée depuis la base |
| **Données envoyées** | L'adresse, le code postal et la ville du chantier (à défaut, l'adresse du client écrite sur le devis), et celles du siège de l'artisan — **jamais le nom du client**, ni aucune autre donnée (`lib/crm/carte.ts`, `requeteAdresse`) |
| **Données gardées** | La latitude et la longitude trouvées, et la date de la recherche (`chantiers.lat`, `lng`, `geocode_le`, migration 0172) ; effacées quand l'adresse change ; la position du siège n'est gardée qu'en mémoire du serveur, 24 h |
| **Base légale** | Exécution du contrat de l'artisan (le service CRM qu'il a choisi d'ouvrir) |
| **Personnes** | Les clients des artisans (par l'adresse de leur chantier), les artisans (leur siège) |
| **Durée** | Celle du chantier dans le CRM ; supprimée avec lui |
| **Destinataire** | La Base Adresse Nationale, service public de l'État : `api-adresse.data.gouv.fr` (appel par le serveur de Presti, délai 4 s, au plus 10 recherches par chargement de la vue) |
| **Où** | `lib/crm/geocodage.ts`, `lib/crm/carte.ts`, `app/api/crm/vue/route.ts`, `supabase/migrations/0172_crm_carte_chantiers.sql` |


## 14. Le contrôle des mots de passe fuités *(Have I Been Pwned, 20 octobre 2026)*

| | |
|---|---|
| **Finalité** | Refuser, à l'inscription, à la réinitialisation et au changement de mot de passe, un mot de passe déjà présent dans des fuites de données (équivalent de la protection Supabase réservée au plan Pro) |
| **Données envoyées** | **5 caractères hexadécimaux** de l'empreinte SHA-1 du mot de passe (principe de k-anonymat). **Aucun mot de passe**, ni empreinte complète, ni email ; la comparaison du suffixe se fait chez nous, et rien n'est journalisé |
| **Base légale** | Intérêt légitime (sécurité des comptes) |
| **Destinataire** | Have I Been Pwned, `api.pwnedpasswords.com` — appel par le serveur de Presti (relais `app/api/auth/mdp-fuite`), le navigateur ne contacte jamais HIBP (CSP inchangée) ; délai 3 s, en cas de panne on laisse passer |
| **Où** | `lib/motDePasse.ts`, `app/api/auth/mdp-fuite/route.ts`, `scripts/mdp-compromis-qa.mjs` |

## 15. Le CRM de l'artisan — chantiers, équipe, matériel, notes *(drapeau `crm`, mis à jour le 20 octobre 2026)*

Presti agit ici **pour le compte de l'artisan** (sous-traitant, art. 28 ; contrat : annexe des CGU). Le responsable de traitement est l'artisan.

| | |
|---|---|
| **Finalité** | Organiser les travaux de l'artisan : chantiers, tâches, planning, équipe, véhicules, matériel réservé et sorti de l'inventaire, notes sur un client ou une demande, rappels, journal des actions |
| **Données** | Titre, adresse, code postal, ville, dates, statut et notes d'un chantier ; nom du client porté par le chantier ; tâches, affectations, réservations de matériel ; notes du CRM (une empreinte HMAC identifie le client, jamais son e-mail en clair) ; membres de l'équipe et véhicules ; rappels ; journal (statuts, tâches cochées, sorties de stock) |
| **Base légale** | Exécution du contrat de l'artisan avec Presti |
| **Personnes** | Les clients et prospects de l'artisan, les membres de son équipe |
| **Durée** | Chantier, tâches, réservations, équipe affectée et notes de chantier : **36 mois** après la fin du chantier (`DUREES_MOIS.crm`) ; journal et rappels faits : **24 mois** (`crm_journal`) ; membre inactif rattaché à rien : **12 mois** (`equipe_inactif`) ; notes client : orphelines ou 36 mois sans nouvelle. Purge quotidienne `purgerCrm`, hors drapeau |
| **Destinataires** | Supabase (UE). Aucun autre pour ce traitement hors § 13 (adresse du chantier) et § 20 (assistant) |
| **Effacement à la demande d'un client de l'artisan** | `app/api/donnees/route.ts` + `lib/crm/effacement.ts` (`choisirEffacementCrm`) : notes du client et de la demande, nom, **photos et pièces, adresse, position et lien de suivi** des chantiers **sans devis envoyé ni facture** ; ce qui est légalement conservé (devis envoyés, factures) reste |
| **Où** | `supabase/migrations/0141_crm_atelier.sql`, `lib/purgesRgpd.ts`, `lib/crm/effacement.ts`, `lib/purgeComptes.ts` (à l'anonymisation du compte) |

## 16. Photos et pièces du chantier *(0163, drapeau `crmPieces`, 20 octobre 2026)*

| | |
|---|---|
| **Finalité** | Garder l'état des lieux, l'avancement et les pièces d'un chantier (photos, plans, factures de fournisseurs) |
| **Données** | Fichiers images (webp, jpeg, png) ou PDF de 4 Mo au plus, chemin `<compte>/<chantier>/<identifiant>`, type, légende (200 caractères), date, taille. **Ce sont des intérieurs de particuliers**, parfois des visages ou des adresses |
| **Base légale** | Exécution du contrat de l'artisan ; intérêt légitime de l'artisan à garder la preuve de l'état des travaux — **à valider par le fondateur** |
| **Personnes** | Les clients de l'artisan, toute personne visible sur une photo |
| **Durée** | Celle du chantier : **36 mois** après sa fin. Les **fichiers du bucket privé sont retirés avant les lignes** (la base ne supprime jamais un fichier) : `purgerCrm`, `purgeComptes`, effacement à la demande |
| **Garanties** | Bucket **privé** `chantier-pieces`, aucune politique de lecture publique (seule la clé de service lit) ; l'artisan reçoit des adresses signées de courte durée pour **ses** pièces ; quota par compte |
| **Destinataires** | Supabase (UE). Les photos ne sont pas envoyées au modèle d'IA (aucune image dans les appels de `lib/ai.ts`, recherche du 20/10) |
| **Où** | `supabase/migrations/0163_chantier_pieces.sql`, `app/api/crm/pieces`, `lib/purgesRgpd.ts`, `lib/purgeComptes.ts` |

## 17. Le lien de suivi donné au client d'un chantier *(0167, drapeau `crmSuivi`, 20 octobre 2026)*

| | |
|---|---|
| **Finalité** | Laisser le client de l'artisan suivre l'avancement de son chantier sur une page privée, en lecture seule |
| **Données** | Côté base : l'**empreinte SHA-256** du lien (jamais le lien), le chantier, la date de création et du dernier accès. Côté page publique : nom de l'entreprise, titre du chantier, état, dates, avancement par pièce — **jamais** un prix, une adresse, un nom de client ou de compagnon, un libellé de tâche, une photo |
| **Base légale** | Exécution du contrat de l'artisan |
| **Personnes** | Les clients de l'artisan |
| **Durée** | Le lien **cesse de répondre 90 jours après la fin réelle du chantier** (`JOURS_SUIVI_APRES_FIN`, calcul à la lecture dans `app/suivi/[jeton]/route.ts` : 404 sans un mot) ou plus tôt si l'artisan le révoque ; la ligne disparaît avec le chantier (36 mois après sa fin) ou à l'effacement à la demande |
| **Garanties** | Jeton de 32 octets aléatoires ; 60 lectures par 10 minutes et par adresse (pseudonymisée) ; offre et suspension revérifiées à chaque lecture ; `noindex`, pas de cookie, pas de script |
| **Où** | `supabase/migrations/0167_chantier_suivi.sql`, `lib/crm/suivi.ts`, `app/suivi/[jeton]/route.ts` |

## 18. Le lien d'agenda de l'artisan *(0164, 20 octobre 2026)*

| | |
|---|---|
| **Finalité** | Permettre à l'artisan d'abonner son agenda (Google Agenda, iPhone, Outlook) à ses chantiers et rendez-vous |
| **Données** | Base : l'empreinte SHA-256 du lien et la date du dernier accès. Flux ICS : titre et adresse des chantiers, type et note des rendez-vous ; **jamais** l'e-mail ni le téléphone d'un client, ni un montant |
| **Base légale** | Exécution du contrat de l'artisan |
| **Personnes** | Les clients de l'artisan (par l'adresse de leur chantier) |
| **Durée** | Tant que l'artisan garde son lien (révocation à tout moment) ; vidé avec le compte. Ce que l'agenda de l'artisan en a copié relève du fournisseur d'agenda qu'**il** a choisi |
| **Destinataire** | Le fournisseur d'agenda de l'artisan, à sa demande (pas un sous-traitant de Presti) |
| **Où** | `supabase/migrations/0164_crm_agenda.sql`, `lib/crm/ics.ts`, `app/api/agenda/[jeton]/route.ts` |

## 19. L'après-chantier : avis et entretien *(0165, 0171, drapeau `crmApresChantier`, 20 octobre 2026)*

| | |
|---|---|
| **Finalité** | Proposer à l'artisan, après un chantier terminé, de demander un avis au client ou de rappeler l'entretien d'un équipement (chaudière, pompe à chaleur, conduit) |
| **Données** | Réglages et textes de l'artisan (désactivés par défaut) ; rappels posés (origine « système ») ; trace d'un envoi (date, jamais le texte) ; **refus du client** : empreinte sha256 (32 hex) de son adresse, jamais l'adresse |
| **Base légale** | Intérêt légitime de l'artisan (art. 6.1.f), le client pouvant s'opposer à tout moment (art. 21) — **analyse à faire valider par le fondateur** |
| **Personnes** | Les clients de l'artisan |
| **Garanties** | **Aucun message ne part tout seul** : l'artisan relit et confirme chaque envoi ; pas de lien dans le texte ; 10 messages par compte et par jour ; le refus est lu avant chaque envoi (409) |
| **Durée** | Rappels faits : 24 mois ; entretien suivi 36 mois au plus après la fin du chantier ; **le refus est gardé tant que le compte de l'artisan existe** (l'opposition doit tenir, art. 21.3), vidé à son anonymisation |
| **Où** | `lib/apresChantier.ts`, `lib/apresChantierTour.ts`, `app/api/crm/apres-chantier/`, `supabase/migrations/0165_crm_apres_chantier.sql`, `0171_crm_apres_opposition.sql` |

## 20. L'assistant de gestion de la console *(0150, 0157, drapeau `assistant`, 20 octobre 2026)*

Presti agit **pour le compte de l'artisan** (sous-traitant) ; Anthropic est son sous-traitant ultérieur (§ 24).

| | |
|---|---|
| **Finalité** | Aider l'artisan à lire sa gestion (devis, factures, conversations, chantiers, chiffres, stock, tarifs) et à préparer des documents ou des messages, qu'il confirme avant tout envoi |
| **Données** | Les questions de l'artisan ; ce que les outils de lecture rendent au modèle (noms de clients, montants, lignes de devis, textes de messages) ; journal des appels d'outils (entrées résumées, résultat) ; cartes et actions préparées (texte exact d'un e-mail, lignes d'un devis) |
| **Base légale** | Exécution du contrat de l'artisan ; instructions de l'artisan |
| **Personnes** | L'artisan ; les clients et prospects dont les données sont lues |
| **Durée** | Tant que le compte existe : **aucune purge automatique propre** (conversations, journal, actions) — effacées avec le compte ou à son anonymisation (`TABLES_A_VIDER`). **À trancher par le fondateur** : une durée de journal, si on veut en annoncer une |
| **Destinataires** | Anthropic (États-Unis, § 24) ; Supabase (UE) |
| **Où** | `lib/assistant/`, `supabase/migrations/0150_assistant.sql`, `0157_assistant_actions.sql`, `lib/purgeComptes.ts` |

## 21. Le registre des essais gratuits *(0156, 20 octobre 2026)*

Traitement de **Presti pour son propre compte** (responsable de traitement).

| | |
|---|---|
| **Finalité** | Ne donner qu'un seul essai gratuit par adresse e-mail : un compte recréé avec la même boîte ne rouvre pas un essai |
| **Données** | **Empreinte SHA-256** de l'adresse normalisée (minuscules, sans « +étiquette », sans points Gmail) précédée d'un préfixe fixe — un pseudonyme, pas une donnée anonyme ; identifiant du compte, offre d'essai et durée, identifiants Stripe (client, abonnement), début et fin de l'essai |
| **Base légale** | Intérêt légitime (prévenir l'abus de l'essai gratuit) — **analyse à faire approuver par le fondateur** |
| **Personnes** | Les artisans qui ont ouvert un essai |
| **Durée** | **24 mois après la fin de l'essai** (`DUREES_MOIS.essai_gratuit`, ou après son début si la fin manque) ; purge quotidienne `purgerEssaisGratuits` (`lib/purgesRgpd.ts`). Pas de clé étrangère : la ligne **survit** à la suppression du compte, c'est cette purge qui l'efface. Conséquence assumée : au-delà, un nouvel essai redevient possible |
| **Accès** | `service_role` seulement (RLS sans politique, droits retirés à `anon` et `authenticated`) |
| **Destinataires** | Supabase ; Stripe pour les identifiants qui le concernent (§ 3) |
| **Où** | `supabase/migrations/0156_essais_gratuits.sql`, `lib/essaiGratuitServeur.ts`, `lib/purgesRgpd.ts` |

## 22. La relève de messagerie de l'artisan *(table `canaux`, cron de 7 h, 20 octobre 2026)*

Presti agit **pour le compte de l'artisan** (sous-traitant), uniquement si l'artisan a relié sa boîte.

| | |
|---|---|
| **Finalité** | Aller chercher les e-mails reçus sur la boîte professionnelle de l'artisan pour les ranger dans sa boîte de réception Presti, à côté des demandes de sa plateforme |
| **Données** | Identifiants IMAP de la boîte (**chiffrés**, jamais réaffichés), adresse, date de la dernière relève ; les e-mails relevés (expéditeur, objet, texte), rangés comme des messages d'une conversation. Sont ignorés : expéditeurs automatiques, e-mails que l'artisan s'envoie à lui-même, doublons (identifiant de message) |
| **Base légale** | Exécution du contrat de l'artisan, uniquement s'il a relié la boîte |
| **Personnes** | Toute personne qui écrit à l'artisan sur cette boîte |
| **Durée** | Identifiants : jusqu'à ce que l'artisan coupe la relève (ils sont alors effacés) ou ferme son compte. Messages relevés : comme une conversation, **36 mois** à compter du dernier échange, sauf si elle est liée à un devis signé ou à une facture |
| **Destinataires** | Supabase (UE) ; le fournisseur de la boîte de l'artisan (sa propre messagerie) |
| **Où** | `lib/releveCanal.ts`, `app/api/canaux/relever`, `supabase/migrations/0036_canaux.sql` |

## 22 bis. Les canaux sans API d'un réseau tiers *(0177, drapeaux `canauxTelegram`, `canauxNotifications`, `canauxLiens`, `importProspects`, 21 octobre 2026)*

Presti agit **pour le compte de l'artisan** (sous-traitant), seulement pour les canaux que l'artisan a lui-même reliés ou utilisés.

| | Bot Telegram de l'artisan | Notifications e-mail des réseaux | Prospects importés d'un formulaire publicitaire | Origine d'une demande |
|---|---|---|---|---|
| **Finalité** | Recevoir les demandes des clients qui écrivent au bot et y répondre | Regrouper dans Presti les messages reçus sur LinkedIn, une Page Facebook, Instagram, TikTok, les plateformes de devis, Le Bon Coin | Rappeler une personne qui a rempli le formulaire d'une publicité de l'artisan | Savoir de quel réseau vient une demande |
| **Base légale** | Art. 6.1.b (mesures précontractuelles : la personne écrit la première) | Exécution du contrat de l'artisan (sa boîte reliée) | Art. 6.1.b : la personne a demandé à être recontactée ; l'information (art. 13) passe par la politique de confidentialité de l'artisan liée dans son formulaire | Exécution du contrat |
| **Données** | Identifiant de conversation Telegram, prénom et nom affichés, texte et type de pièce jointe ; numéro de téléphone seulement si le client partage sa propre fiche | Nom affiché, extrait du message, lien vers la conversation d'origine ; seuls les e-mails dont la signature DKIM du réseau est vérifiée sont rangés | Liste fermée : nom, e-mail, téléphone, ville et code postal, réponses décrivant le besoin, nom du formulaire, date de remplissage, date d'import ; identifiants publicitaires et autres colonnes écartés | Nom du réseau (liste fermée, `leads.origine`) |
| **Envoi automatique** | Réponse validée par l'artisan, ou par le Pilote automatique s'il l'a activé (mention de l'assistant IA) | Aucun : « Copier et ouvrir » sur le réseau | **Aucun** (ni IA, ni relance, ni Pilote) | — |
| **Durée** | Celle des conversations : 36 mois sans échange | Celle des conversations | **6 mois** si l'artisan ne l'a jamais contacté (purge automatique, `lib/purgesRgpd.ts`), sinon celle des conversations | Celle de la demande |
| **Destinataires** | Supabase (UE) ; **Telegram FZ-LLC** (hors UE), qui achemine les messages du bot | Aucun nouveau : les données viennent de la boîte de l'artisan | Aucun nouveau : fichier déposé par l'artisan | Aucun |
| **Sécurité** | Jeton du bot chiffré (AES-256-GCM), webhook protégé par un secret propre à chaque bot, plafonds d'entrée | Expéditeur vérifié par signature DKIM alignée sur le domaine du réseau et en-tête du serveur de la boîte ; liens limités à la conversation du réseau | Valeurs neutralisées (= + - @), doublons écartés, plafonds horaires | — |
| **Où** | `lib/canaux/telegram.ts`, `app/api/canaux/telegram/` | `lib/canaux/notifications.ts`, `lib/canaux/dkim.ts`, `lib/releveCanal.ts` | `lib/canaux/importProspects.ts`, `app/api/demandes/import` | `lib/canaux/reseaux.ts`, `app/api/leads` |

## 23. Le traitement central : le message d'un prospect envoyé à Anthropic pour rédiger la réponse *(20 octobre 2026)*

C'est le cœur du produit. Presti agit **pour le compte de l'artisan** (sous-traitant) ; Anthropic est son sous-traitant ultérieur.

| | |
|---|---|
| **Finalité** | Rédiger, pour l'artisan, la réponse à un prospect qui l'a contacté via sa page : première réponse, suite de la conversation, relance, brouillon de devis |
| **Données envoyées au modèle** | Le **nom du prospect** tel qu'il l'a donné, le **canal** de contact (e-mail ou téléphone — pas l'adresse ni le numéro), le **texte de son message** et de la conversation ; côté artisan : métier, ton, services déclarés, prix, et en exemples ses dernières réponses et devis acceptés. **Aucune photo** n'est transmise (`lib/ai.ts`, 20/10). Le message du prospect est présenté au modèle comme une donnée, pas comme des instructions |
| **Mode** | **Par défaut, l'IA propose et l'artisan valide** (`mode_reponse: 'assistee'`, `lib/plateformeConfig.ts`) ; l'envoi autonome n'existe qu'à partir de l'offre Studio |
| **Garde-fous** | L'IA n'invente ni prix sourcé, ni fournisseur, ni délai précis, ni créneau (prompts de `lib/ai.ts`, `lib/ai/antiFabrication.ts`) ; une réclamation est escaladée à l'humain |
| **Base légale** | Mesures précontractuelles prises à la demande du prospect (art. 6.1.b) ; l'information du prospect se fait à la collecte (`noticeCollecte`) et sur la page « Informations légales » du site de l'artisan |
| **Personnes** | Les prospects et clients de l'artisan |
| **Durée côté Presti** | Celle de la conversation : **36 mois** après le dernier échange, sauf devis signé ou facture |
| **Durée côté Anthropic** | **À documenter par le fondateur** à partir des conditions de l'API d'Anthropic (conservation, non-entraînement) : les pages publiques affirment que le prestataire n'utilise pas ces données pour entraîner ses modèles ; la pièce qui le prouve est à archiver (§ 24) |
| **Où** | `lib/ai.ts`, `lib/ai/`, `app/api/leads`, `lib/plateformeConfig.ts` |

## 23 bis. Les lectures de n8n sur le serveur Oracle *(chantier 4, 2 novembre 2026 ; aucun workflow publié à cette date)*

Depuis le 02/11/2026, la logique récurrente de Presti se construit dans n8n (décision du fondateur, `.claude/rules/architecture-outils.md`,
« règle n8n-first »). Cette section existe **avant** la publication du premier workflow qui lit des données d'artisans, comme le plan l'exige
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`, règles communes, « Ce que n8n lit »). Au 02/11/2026, **aucun** de ces workflows n'est
publié : tous sont inactifs, essayés sur des données fictives.

| | |
|---|---|
| **Finalité** | Repérer pour l'artisan l'argent à récupérer et les actions à préparer (`presti-detecteurs`), composer son point du matin (`presti-briefing-matin`), suivre ses premiers jours et ses bilans à J+14 et J+30 (`presti-suivi-artisan`), sauvegarder la base et vérifier la sauvegarde (`presti-sauvegarde`, `presti-garde-sauvegarde`), ranger les demandes de démo « Presti pour l'entreprise » (`presti-demande-demo`), poser les rappels d'après-chantier (`presti-apres-chantier`) |
| **Données lues** | Des **identifiants, dates, montants et statuts** : jamais un nom, une adresse, un e-mail, un téléphone ni le texte d'un client. Liste exacte des tables et colonnes, workflow par workflow : `.orchestre/preuves/032-029/rapport.md`, annexe A (relevée contre le rôle `n8n_lecture`, `supabase/migrations/0189_role_lecture_n8n.sql`). Seule exception prévue : un workflow qui envoie lit, au moment d'envoyer, l'adresse et le nom du destinataire ; aucun n'envoie à la date de cette section. La sauvegarde, elle, lit toutes les tables : c'est sa fonction ; l'archive est **chiffrée** par une clé publique, la clé privée reste hors du serveur (`scripts/sauvegarde.mjs`, § 4.1 du plan) |
| **Où** | n8n auto-hébergé dans Docker sur le serveur Oracle Cloud de Presti, région **eu-paris-1** (Paris, relevé le 02/11/2026 par les métadonnées de l'instance), lié à `127.0.0.1:5678`, joint seulement par un tunnel SSH. Le n8n hébergé en ligne (`presti.app.n8n.cloud`) ne reçoit aucune donnée personnelle (`.claude/rules/architecture-outils.md`) |
| **Durée dans n8n** | Exécutions réussies : **rien n'est gardé** (`saveDataSuccessExecution: 'none'`, posé avant toute publication : tâche 032-033). Exécutions en échec : **14 jours** (336 h, purge par défaut de l'instance n8n), retenus le 02/11/2026 à la publication en simulation de `presti-detecteurs` et `presti-briefing-matin`, en attendant que le fondateur fixe une durée plus courte (`EXECUTIONS_DATA_MAX_AGE`, réglage du serveur). Une exécution d'essai du 02/11 (n° 333 et 334 de `presti-detecteurs`) a gardé une vraie ligne de `regles_automatisation` : **sa suppression est un geste du fondateur** (audit 032-029, D-1) |
| **Alertes** | Un workflow en échec prévient le fondateur dans Slack `#presti-auto` par `presti-erreurs` : nom du workflow, nœud, numéro et heure de l'exécution, **sans aucune donnée** d'artisan ni de client |
| **Accès** | Le fondateur (compte propriétaire de n8n) ; la session principale de Claude Code, par le connecteur `n8n-oracle` ; Hermes, par le même connecteur **en lecture seule** (`.claude/rules/architecture-outils.md`) |
| **Base légale** | Exécution du contrat d'abonnement de l'artisan (art. 6.1.b) pour les détecteurs, le point du matin, le suivi et l'après-chantier ; intérêt légitime de Presti à la sécurité et à la continuité du service (art. 6.1.f) pour la sauvegarde ; mesures précontractuelles à la demande de l'entreprise (art. 6.1.b) pour les demandes de démo |
| **Personnes** | Les artisans clients de Presti ; pour la sauvegarde, aussi les prospects et clients de l'artisan (contenu chiffré) ; pour les démos, les personnes qui en demandent une |
| **Sous-traitant** | Oracle (hébergement du serveur, Paris) : accord de traitement des données **à archiver** par le fondateur, comme au § 24 (« à archiver » ≠ « signé ») |
| **Avant chaque publication** | Relire cette section ; le workflow est audité par un agent distinct, essayé en simulation, puis publié sur le « go » écrit du fondateur |

## 24. Transferts hors Union européenne et garanties

Le tableau dit ce que les **textes publics annoncent** (`lib/legalArtisan.ts`, `app/cgu`, `app/confidentialite`) et ce qu'il reste à **archiver**. Il n'affirme la signature d'aucun accord : aucune pièce n'en est versionnée dans le dépôt (recherche du 20/10).

| Prestataire | Rôle | Lieu annoncé | Garantie annoncée | Pièce à archiver par le fondateur (« à archiver » ≠ « signé ») | État |
|---|---|---|---|---|---|
| **Supabase** | Base de données, stockage des fichiers | Union européenne (Francfort) | Pas de transfert annoncé | Accord de traitement des données (DPA) ; confirmer la région du projet ; préciser tout accès depuis hors UE (support) | Relevé le 21/10 : DPA v1 du 01/08/2026 intégré aux conditions (supabase.com/legal/customer-resources/data-processing-addendum) ; support « follow-the-sun » : accès hors UE possible ; PDF daté et capture de la région à archiver |
| **Vercel** | Hébergement de l'application, journaux | États-Unis | Clauses contractuelles types (CCT) annoncées ; cadre de protection des données UE-États-Unis (Data Privacy Framework) à vérifier pour ce prestataire | DPA avec CCT / certification DPF à archiver | Relevé le 21/10 : ⚠️ DPA (vercel.com/legal/dpa, en vigueur le 31/03/2026) réservé aux offres **Pro et Enterprise** : en Hobby, aucun DPA ne couvre Presti. Offre à vérifier (Settings → Billing) |
| **Anthropic** | Modèle d'IA (réponses, assistant) | États-Unis | CCT annoncées ; non-entraînement annoncé | DPA / conditions commerciales de l'API, durée de conservation des appels | Relevé le 21/10 : DPA du 24/02/2025 intégré « by reference » aux conditions commerciales (cocontractant Anthropic Ireland) ; non-entraînement contractuel ; entrées/sorties de l’API effacées sous 30 jours (sauf exceptions) ; PDF datés à archiver |
| **Resend** | Envoi des e-mails (réponses, relances, devis, messages de service) | États-Unis | CCT annoncées | DPA avec CCT / certification DPF à archiver | Relevé le 21/10 : DPA du 31/12/2025 intégré aux conditions ; version exécutée dans le tableau de bord, à récupérer |
| **Stripe** | Paiement des abonnements (Presti, responsable de traitement) | UE et États-Unis | CCT annoncées (§ 3) | DPA de Stripe, accepté en ligne à conserver | Relevé le 21/10 : DPA du 28/09/2026 et DTA intégrés « par référence » au contrat de services ; PDF datés à archiver |

Relevé du 21/10/2026, sources et liens : `SaaS/Legal/DPA-prestataires-2026-10-21.md` (aucun DPA n’est à signer à part ; aucun n’est « signé » au sens d’une pièce versionnée).

Les prestataires de la prospection (§ 11 : Google, Meta, OpenAI, Oracle, GitHub) et du contrôle des mots de passe (§ 14 : Have I Been Pwned) ont leur propre ligne de garanties à compléter de la même façon ; ils ne sont pas repris ici.

**Rappel de la règle de rédaction** : citer les clauses contractuelles types ou le Data Privacy Framework comme garantie *annoncée* ou *à archiver*, jamais comme *signée* tant que la pièce n'est pas dans le dossier du fondateur.
