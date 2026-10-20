# Registre des traitements — l'entreprise Presti

> Côté ARTISAN, le registre est dans `lib/legalArtisan.ts` : ce que Presti traite **pour le compte** de chaque artisan (ses prospects, ses devis, ses factures), où Presti est sous-traitant. Ce fichier-ci est le registre de **l'entreprise Presti responsable de traitement** : ses clients (les artisans), ses fondateurs, ses prospects, ses fournisseurs. Une ligne par traitement. Mis à jour le 28 septembre 2026 (ajout du § 11, la prospection des professionnels).

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
