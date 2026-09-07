# Registre des traitements — l'entreprise Presti

> Côté ARTISAN, le registre est dans `lib/legalArtisan.ts` : ce que Presti traite **pour le compte** de chaque artisan (ses prospects, ses devis, ses factures), où Presti est sous-traitant. Ce fichier-ci est le registre de **l'entreprise Presti responsable de traitement** : ses clients (les artisans), ses fondateurs, ses prospects, ses fournisseurs. Une ligne par traitement. Mis à jour le 7 septembre 2026 (ajout du Centre de direction).

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
| **Où** | `lib/direction/stripe.ts`, `app/api/direction/*` |

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

---

**Droits des personnes.** Les artisans exercent leurs droits depuis Paramètres → Données (export complet, suppression du compte avec 30 jours de grâce). Les fondateurs sont les seules personnes concernées par le journal de direction ; l'adresse IP y est une preuve d'action, conservée 24 mois puis effacée. Toute demande peut être adressée par le formulaire de contact du site.

**À revoir au prochain jalon.** J3 (messagerie de l'entreprise : emails reçus, conservation, assignation), J4 (comptabilité : factures fournisseurs, relevés du partenaire), J5 (mode support « voir comme lui » : journalisé et notifié à l'artisan).
