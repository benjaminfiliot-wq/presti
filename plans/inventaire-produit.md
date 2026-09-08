# Inventaire du produit — généré le 2026-09-08 12:20

> Produit par `scripts/inventaire-produit.mjs` en lisant le code. Ne pas éditer à la main : relancer.

| Élément | Nombre |
|---|---|
| Pages | 33 |
| Routes API | 87 |
| Migrations | 81 (dernière : 0081_facture_regime_fige.sql) |
| Drapeaux | 21 (18 levés) |
| Envois d'email | 36 (+ 5 motifs d'alerte de service) |
| Crons | 2 planifiés · ⚠️ 2 route(s) cron sans planification : /api/cron/alertes, /api/cron/purge-comptes |
| Capacités | 23 (11 socle, +7 Studio, +5 Signature) |
| Suites de test | 77 dans le lanceur (68 jouées chaque nuit) · 18 écarté(s) volontairement |


## Pages (33)

| Chemin | Surface | Auth | Rendu | Fichier |
|---|---|---|---|---|
| `/` | landing | non | serveur | app/page.tsx |
| `/abonnement` | landing | oui | client | app/abonnement/page.tsx |
| `/aide` | landing | oui | client | app/aide/page.tsx |
| `/cgu` | landing | non | serveur | app/cgu/page.tsx |
| `/confidentialite` | landing | non | serveur | app/confidentialite/page.tsx |
| `/contact` | landing | non | serveur | app/contact/page.tsx |
| `/controle` | console | oui | client | app/controle/page.tsx |
| `/dashboard` | console | oui | client | app/dashboard/page.tsx |
| `/devis` | console | oui | client | app/devis/page.tsx |
| `/devis/[id]` | console | oui | client | app/devis/[id]/page.tsx |
| `/direction` | landing | non | serveur | app/direction/page.tsx |
| `/factures` | console | oui | client | app/factures/page.tsx |
| `/faq` | landing | non | serveur | app/faq/page.tsx |
| `/inventaire` | console | oui | client | app/inventaire/page.tsx |
| `/inventaire/fournisseurs` | console | oui | client | app/inventaire/fournisseurs/page.tsx |
| `/inventaire/recherche` | console | oui | client | app/inventaire/recherche/page.tsx |
| `/login` | landing | oui | client | app/login/page.tsx |
| `/mentions-legales` | landing | non | serveur | app/mentions-legales/page.tsx |
| `/messages` | console | non | client | app/messages/page.tsx |
| `/messages/canaux` | console | oui | client | app/messages/canaux/page.tsx |
| `/onboarding` | console | oui | client | app/onboarding/page.tsx |
| `/outils` | console | oui | client | app/outils/page.tsx |
| `/p/[slug]` | plateforme client | non | serveur | app/p/[slug]/page.tsx |
| `/p/[slug]/[...reste]` | plateforme client | non | serveur | app/p/[slug]/[...reste]/page.tsx |
| `/parametres` | console | oui | client | app/parametres/page.tsx |
| `/plateforme` | console | oui | client | app/plateforme/page.tsx |
| `/profil` | console | oui | client | app/profil/page.tsx |
| `/reset-password` | landing | non | client | app/reset-password/page.tsx |
| `/signup` | landing | non | client | app/signup/page.tsx |
| `/site/[slug]` | site artisan | non | serveur | app/site/[slug]/page.tsx |
| `/site/[slug]/[...reste]` | site artisan | non | serveur | app/site/[slug]/[...reste]/page.tsx |
| `/site/[slug]/infos-legales` | site artisan | non | serveur | app/site/[slug]/infos-legales/page.tsx |
| `/tarifs` | landing | oui | client | app/tarifs/page.tsx |

## Routes API (87)

| Route | Méthodes | Auth | Plan requis | Plafonds | Crédits | IA |
|---|---|---|---|---|---|---|
| `/api/account/delete` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/account/inscription` | POST | jeton artisan | — | inscription:· 1/24*60*60s | — | — |
| `/api/account/slug` | GET, POST | jeton artisan | — | — | — | — |
| `/api/auth/code` | POST, GET | jeton artisan | — | code:ip:· 30/600s | — | — |
| `/api/auth/code/verifier` | POST | publique | — | code:verif:ip:· 60/600s | — | — |
| `/api/auth/mdp-fuite` | POST | publique | — | — | — | — |
| `/api/auth/reset-confirm` | POST | publique | — | — | — | — |
| `/api/auth/reset-request` | POST | publique | — | — | — | — |
| `/api/canaux` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/canaux/relever` | GET, POST | jeton artisan | — | — | — | — |
| `/api/contact` | POST | publique | — | contact:· 3/3600s | — | — |
| `/api/controle/a-faire` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/alertes/:id/acquitter` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/apports` | GET, POST, PATCH | jeton fondateur | — | — | — | — |
| `/api/controle/apports/:id/statut` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/barre` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/chiffres` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/clients` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/clients/:id` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/clients/:id/action` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/compta` | GET, POST | jeton fondateur | — | — | — | — |
| `/api/controle/courriers` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/courriers/:fil` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/courriers/:fil/action` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/courriers/relever` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/crons/:nom/relancer` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/etat` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/fil` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/journal` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/recherche` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/reconfirmer` | POST | jeton fondateur | — | reconf:· 5/15*60s | — | — |
| `/api/controle/reglages` | GET, POST | jeton fondateur | — | — | — | — |
| `/api/controle/releve` | GET, POST | jeton fondateur | — | — | — | — |
| `/api/controle/securite/bans` | GET, POST, DELETE | jeton fondateur | — | — | — | — |
| `/api/controle/support` | GET | jeton fondateur | — | — | — | — |
| `/api/controle/support/demander` | POST | jeton fondateur | — | — | — | — |
| `/api/controle/support/lire` | GET | jeton fondateur | — | — | — | — |
| `/api/conversation` | GET, POST | jeton de conversation | — | conv:· 6/5*60s | oui | ⚡ |
| `/api/conversation/devis` | POST | jeton de conversation | — | conv:· 6/5*60s | — | — |
| `/api/conversation/regles` | POST | jeton de conversation | — | regles-ip:· 30/3600s · regles:· 6/3600s | — | ⚡ |
| `/api/conversation/stream` | POST | jeton de conversation | — | conv:· 6/5*60s | oui | ⚡ |
| `/api/cron/alertes` | GET | secret cron | — | — | — | — |
| `/api/cron/purge-comptes` | GET | secret cron | — | — | — | — |
| `/api/cron/relances` | GET | secret cron | — | — | — | — |
| `/api/devis` | POST | jeton artisan | — | — | — | — |
| `/api/devis/:id` | POST, DELETE | jeton artisan | — | — | — | — |
| `/api/devis/:id/envoyer` | POST | jeton artisan | — | — | — | — |
| `/api/devis/:id/pdf` | GET | jeton artisan | — | — | — | — |
| `/api/devis/auto` | POST | jeton artisan | — | — | — | — |
| `/api/devis/generer` | POST | jeton artisan | — | — | oui | ⚡ |
| `/api/domain` | GET, POST, DELETE | jeton artisan | site.domaine_perso | — | — | — |
| `/api/donnees` | GET, POST | jeton artisan | — | — | — | — |
| `/api/donnees/export` | GET | jeton artisan | — | — | — | — |
| `/api/factures` | POST | jeton artisan | — | — | — | — |
| `/api/factures/:id` | GET, PATCH, DELETE | jeton artisan | — | — | — | — |
| `/api/factures/:id/avoir` | POST | jeton artisan | — | — | — | — |
| `/api/factures/:id/facturx` | GET | jeton artisan | — | — | — | — |
| `/api/factures/:id/pdf` | GET | jeton artisan | — | — | — | — |
| `/api/inventaire` | GET, POST, DELETE | jeton artisan | inventaire.stock | — | — | — |
| `/api/inventaire/fournisseurs` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/inventaire/materiaux` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/inventaire/observations` | GET, POST | jeton artisan | — | — | — | — |
| `/api/inventaire/recherche` | POST | jeton artisan | inventaire.recherche_ia | — | oui | ⚡ |
| `/api/inventaire/recherche/retenir` | POST | jeton artisan | inventaire.recherche_ia | — | — | — |
| `/api/leads` | POST | publique | — | — | oui | ⚡ |
| `/api/leads/contact` | POST | publique | — | — | — | — |
| `/api/leads/photos` | POST | jeton artisan | — | — | — | — |
| `/api/media` | POST, GET | jeton artisan | — | — | — | — |
| `/api/messages` | POST | jeton artisan | — | — | oui | ⚡ |
| `/api/p/auth` | GET, POST | publique | — | lien:ip:· 5/15*60s | — | — |
| `/api/plat-event` | POST | publique | — | — | — | — |
| `/api/plateforme/apparence` | GET, POST | jeton artisan | plateforme.personnalisation_avancee | — | — | — |
| `/api/plateforme/config` | GET | jeton artisan | — | — | — | — |
| `/api/push/abonner` | GET, POST, DELETE | jeton artisan | — | push:abonner:· 20/3600s | — | — |
| `/api/push/test` | POST | jeton artisan | — | push:test:· 5/3600s | — | — |
| `/api/report-error` | POST | publique | — | err:ip:· 60/5*60s | — | — |
| `/api/securite/acces-support` | GET, POST | jeton artisan | — | — | — | — |
| `/api/securite/appareils` | GET, DELETE | jeton artisan | — | — | — | — |
| `/api/securite/mot-de-passe` | POST | jeton artisan | — | mdp:· 5/15*60s | — | — |
| `/api/securite/sessions` | GET, DELETE, POST | jeton artisan | — | — | — | — |
| `/api/site/generate` | POST | jeton artisan | — | — | oui | — |
| `/api/stripe/portail` | GET, POST | jeton artisan | — | — | — | — |
| `/api/stripe/webhook` | POST | signature Stripe | — | — | — | — |
| `/api/subscribe` | POST | jeton artisan | — | — | — | — |
| `/api/support/demande` | POST | jeton artisan | — | — | — | — |
| `/api/tarifs` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/tools/reponse` | POST | jeton artisan | — | — | oui | ⚡ |

## Migrations (81)

Posées à la main dans le SQL Editor (mot de passe Postgres désaligné). Sondes en base sur les dix dernières :

| Migration | En base |
|---|---|
| 0072_courriers_nature.sql | non sondée |
| 0073_courriers_domaines.sql | non sondée |
| 0074_support.sql | non sondée |
| 0075_support_element.sql | non sondée |
| 0076_support_purge.sql | non sondée |
| 0077_apport_taux.sql | non sondée |
| 0078_conservation.sql | non sondée |
| 0079_profils_fondateur.sql | non sondée |
| 0080_credits_et_acompte.sql | non sondée |
| 0081_facture_regime_fige.sql | non sondée |

Fichiers à coller présents : _A_COLLER_sql_editor_0047_a_0052.sql, _A_COLLER_sql_editor_0053.sql, _A_COLLER_sql_editor_0054.sql, _A_COLLER_sql_editor_0054_0055.sql, _A_COLLER_sql_editor_0056.sql, _A_COLLER_sql_editor_0057.sql, _A_COLLER_sql_editor_0057_0058.sql, _A_COLLER_sql_editor_0059_0061.sql, _A_COLLER_sql_editor_0062.sql, _A_COLLER_sql_editor_0063.sql, _A_COLLER_sql_editor_0064.sql, _A_COLLER_sql_editor_0065.sql, _A_COLLER_sql_editor_0066.sql, _A_COLLER_sql_editor_0067.sql, _A_COLLER_sql_editor_0068.sql, _A_COLLER_sql_editor_0068b.sql, _A_COLLER_sql_editor_0069.sql, _A_COLLER_sql_editor_0070.sql, _A_COLLER_sql_editor_0071.sql, _A_COLLER_sql_editor_0072.sql, _A_COLLER_sql_editor_0072_NU.sql, _A_COLLER_sql_editor_0073.sql, _A_COLLER_sql_editor_0073_NU.sql, _A_COLLER_sql_editor_0074.sql, _A_COLLER_sql_editor_0074_NU.sql, _A_COLLER_sql_editor_0075.sql, _A_COLLER_sql_editor_0075_NU.sql, _A_COLLER_sql_editor_0076.sql, _A_COLLER_sql_editor_0076_NU.sql, _A_COLLER_sql_editor_0077.sql, _A_COLLER_sql_editor_0077_NU.sql, _A_COLLER_sql_editor_0078.sql, _A_COLLER_sql_editor_0078_NU.sql, _A_COLLER_sql_editor_0079.sql, _A_COLLER_sql_editor_0079_NU.sql, _A_COLLER_sql_editor_0080.sql, _A_COLLER_sql_editor_0080_NU.sql, _A_COLLER_sql_editor_0081.sql, _A_COLLER_sql_editor_0081_NU.sql.

## Drapeaux (21)

| Drapeau | État | Consommé par |
|---|---|---|
| `codeEmail` | levé | app/api/auth/code/route.ts, app/api/auth/code/verifier/route.ts, app/api/securite/appareils/route.ts, app/api/securite/sessions/route.ts, app/AppShell.tsx, app/login/page.tsx, app/parametres/SectionSecurite.tsx, lib/authArtisan.ts, lib/purgesRgpd.ts |
| `pushWeb` | levé | app/api/push/abonner/route.ts, app/api/push/test/route.ts, app/parametres/page.tsx, app/parametres/SectionNotifications.tsx, lib/push.ts |
| `pushNatif` | levé | app/NatifPont.tsx, app/parametres/SectionNotifications.tsx, lib/push.ts |
| `mfa` | levé | app/api/auth/code/route.ts, app/AppShell.tsx, app/login/page.tsx, app/parametres/commun.ts, app/parametres/page.tsx, app/parametres/SectionSecurite.tsx, lib/authArtisan.ts |
| `direction` | levé | app/api/controle/a-faire/route.ts, app/api/controle/alertes/[id]/acquitter/route.ts, app/api/controle/apports/route.ts, app/api/controle/apports/[id]/statut/route.ts, app/api/controle/barre/route.ts, app/api/controle/chiffres/route.ts, app/api/controle/clients/route.ts, app/api/controle/clients/[id]/action/route.ts, app/api/controle/clients/[id]/route.ts, app/api/controle/compta/route.ts, app/api/controle/courriers/relever/route.ts, app/api/controle/courriers/route.ts, app/api/controle/courriers/[fil]/action/route.ts, app/api/controle/courriers/[fil]/route.ts, app/api/controle/crons/[nom]/relancer/route.ts, app/api/controle/etat/route.ts, app/api/controle/fil/route.ts, app/api/controle/journal/route.ts, app/api/controle/recherche/route.ts, app/api/controle/reconfirmer/route.ts, app/api/controle/reglages/route.ts, app/api/controle/releve/route.ts, app/api/controle/securite/bans/route.ts, app/api/controle/support/demander/route.ts, app/api/controle/support/lire/route.ts, app/api/controle/support/route.ts, app/api/cron/relances/route.ts, app/api/donnees/export/route.ts, app/api/stripe/webhook/route.ts, app/AppShell.tsx, app/controle/Apports.tsx, app/controle/Aujourdhui.tsx, app/controle/BarreEtat.tsx, app/controle/BlocSupport.tsx, app/controle/client.ts, app/controle/Clients.tsx, app/controle/Comptabilite.tsx, app/controle/Fiche.tsx, app/controle/Fraicheur.tsx, app/controle/Journal.tsx, app/controle/layout.tsx, app/controle/Messagerie.tsx, app/controle/page.tsx, app/controle/Reglages.tsx, app/direction/page.tsx, app/robots.ts, lib/abonnementSync.ts, lib/alertes.ts, lib/controle/releve.ts, lib/controle/sante.ts, lib/credits.ts, lib/direction/courriers.ts, lib/direction/fraicheur.ts, lib/direction/garde.ts, lib/direction/journal.ts, lib/direction/reconfirmation.ts, lib/direction/stripe-actions.ts, lib/direction/stripe.ts, lib/purgesRgpd.ts |
| `apports` | levé | app/a/[code]/route.ts, app/api/account/inscription/route.ts, app/api/controle/apports/route.ts, app/api/controle/apports/[id]/statut/route.ts, app/api/controle/clients/route.ts, app/api/controle/clients/[id]/route.ts, app/api/controle/recherche/route.ts, app/api/controle/releve/route.ts, app/controle/Apports.tsx, app/controle/Clients.tsx, app/controle/Comptabilite.tsx, app/controle/page.tsx, app/controle/Reglages.tsx, lib/controle/confiance.ts, lib/controle/droits.ts, lib/controle/releve.ts, lib/direction/apports.ts, lib/direction/garde.ts |
| `actionsArtisan` | levé | app/api/controle/clients/[id]/action/route.ts, app/controle/Fiche.tsx |
| `messagerie` | levé | app/api/controle/barre/route.ts, app/api/controle/courriers/relever/route.ts, app/api/controle/courriers/route.ts, app/api/controle/courriers/[fil]/action/route.ts, app/api/controle/courriers/[fil]/route.ts, app/api/controle/recherche/route.ts, app/api/cron/relances/route.ts, app/api/support/demande/route.ts, app/cgu/page.tsx, app/confidentialite/page.tsx, app/controle/Messagerie.tsx, app/controle/page.tsx, app/controle/Reglages.tsx, lib/aide.ts, lib/controle/droits.ts, lib/direction/courriers.ts, lib/direction/garde.ts, lib/direction/natures.ts |
| `comptabilite` | levé | app/api/controle/barre/route.ts, app/api/controle/compta/route.ts, app/api/controle/releve/route.ts, app/controle/page.tsx, lib/controle/droits.ts |
| `supportArtisan` | levé | app/api/controle/support/demander/route.ts, app/api/controle/support/lire/route.ts, app/api/controle/support/route.ts, app/api/securite/acces-support/route.ts, app/api/support/demande/route.ts, app/AppShell.tsx, app/controle/Fiche.tsx, app/page.tsx, app/parametres/SectionSecurite.tsx, lib/purgesRgpd.ts |
| `inventaireOcr` | baissé | ⚠️ **nulle part** (drapeau mort) |
| `inventaireRecherche` | levé | app/api/inventaire/recherche/retenir/route.ts, app/api/inventaire/recherche/route.ts, app/inventaire/page.tsx, app/inventaire/recherche/page.tsx, lib/plans.ts |
| `plateformePilotage` | levé | ⚠️ **nulle part** (drapeau mort) |
| `plateformeRegles` | levé | lib/plans.ts |
| `siteSlides3d` | levé | lib/plans.ts |
| `aideVisites` | levé | app/AppShell.tsx |
| `aideCentre` | levé | app/aide/page.tsx, app/AidePanneau.tsx, app/AppShell.tsx, app/parametres/page.tsx |
| `landingVideo` | levé | app/page.tsx |
| `plateformePersona` | levé | lib/plans.ts |
| `canauxWhatsapp` | baissé | lib/plans.ts |
| `canauxReseaux` | baissé | lib/plans.ts |

## Emails envoyés (36)

| Où | Fonction | Type / sujet | Destinataire |
|---|---|---|---|
| app/api/account/inscription/route.ts:39 | notifierEntreprise | — | entreprise |
| app/api/auth/code/route.ts:91 | sendEmail | — | email |
| app/api/auth/reset-request/route.ts:51 | sendEmail | 'Réinitialisation de votre mot de passe — Presti' | email |
| app/api/contact/route.ts:55 | notifierEntreprise | — | entreprise |
| app/api/controle/apports/[id]/statut/route.ts:92 | sendEmail | — | dest.email |
| app/api/controle/clients/[id]/action/route.ts:195 | sendEmail | — | a.email |
| app/api/controle/courriers/[fil]/action/route.ts:91 | sendEmail | — | destinataire |
| app/api/controle/support/demander/route.ts:88 | sendEmail | 'Presti demande à regarder un élément de votre compte' | a.email |
| app/api/conversation/devis/route.ts:76 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/devis/route.ts:95 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/devis/route.ts:116 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/route.ts:170 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/route.ts:188 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/route.ts:227 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/stream/route.ts:83 | notifierArtisan | nouvelle_demande | artisan |
| app/api/cron/relances/route.ts:98 | sendEmail | — | lead.contact as string |
| app/api/devis/[id]/envoyer/route.ts:59 | sendEmail | `Votre devis ${devis.numero || ''} — ${nomEnt}` | devis.client_email |
| app/api/leads/contact/route.ts:68 | notifierArtisan | nouvelle_demande | artisan |
| app/api/leads/contact/route.ts:78 | sendEmail | `Bien reçu — ${artisan?.nom || 'votre demande'}` | contact |
| app/api/leads/route.ts:193 | notifierArtisan | nouvelle_demande | artisan |
| app/api/leads/route.ts:203 | sendEmail | `Bien reçu — ${artisan.nom || 'votre demande'}` | contact |
| app/api/leads/route.ts:259 | sendEmail | nouvelle_demande | contact |
| app/api/leads/route.ts:279 | notifierArtisan | nouvelle_demande | artisan |
| app/api/messages/route.ts:98 | sendEmail | `Réponse de ${artisanV?.nom ?? 'votre artisan'}` | lead.contact |
| app/api/messages/route.ts:157 | sendEmail | `Réponse de ${artisan?.nom ?? 'votre artisan'}` | lead.contact |
| app/api/p/auth/route.ts:64 | sendEmail | `Votre lien de connexion — ${artisan.nom || 'votre espace'}` | email |
| app/api/report-error/route.ts:40 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:66 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:84 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:99 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:118 | notifierEntreprise | — | entreprise |
| app/api/support/demande/route.ts:84 | notifierEntreprise | — | entreprise |
| lib/alertes.ts:321 | notifierEntreprise | `Presti — ${sujet}` | entreprise |
| lib/alertes.ts:322 | sendEmail | `Presti — ${sujet}` | al.a.email |
| lib/purgeComptes.ts:134 | notifierEntreprise | — | entreprise |
| lib/reglesServeur.ts:67 | notifierArtisan | proposition | artisan |

Alertes de service (`lib/alerteService.ts`) : solde, authentification, debit, surcharge, inconnu — une par heure et par motif, vers l'adresse de l'entreprise.

## Crons (2)

| Chemin | Fréquence | Fichier |
|---|---|---|
| `/api/cron/relances` | `0 8 * * *` | app/api/cron/relances/route.ts |
| `/api/canaux/relever` | `0 7 * * *` | app/api/canaux/relever/route.ts |

⚠️ Routes cron sans planification (jamais appelées seules) : `/api/cron/alertes`, `/api/cron/purge-comptes`

## Capacités par offre (23)

| Capacité | Offre minimale | Verrouillée dans |
|---|---|---|
| `plateforme.conversation` | essentiel | ⚠️ **aucun verrou serveur** |
| `plateforme.comptes_clients` | essentiel | ⚠️ **aucun verrou serveur** |
| `plateforme.domaine_perso` | essentiel | ⚠️ **aucun verrou serveur** |
| `site.essentiel` | essentiel | ⚠️ **aucun verrou serveur** |
| `site.domaine_perso` | essentiel | app/api/domain/route.ts |
| `devis.ia` | essentiel | ⚠️ **aucun verrou serveur** |
| `devis.prix_artisan` | essentiel | ⚠️ **aucun verrou serveur** |
| `factures` | essentiel | app/aide/page.tsx, app/api/account/delete/route.ts, app/api/controle/clients/[id]/route.ts, app/api/donnees/export/route.ts, app/api/factures/[id]/avoir/route.ts, app/api/factures/[id]/facturx/route.ts, app/api/factures/[id]/pdf/route.ts, app/api/factures/[id]/route.ts, app/api/support/demande/route.ts, app/AppShell.tsx, app/factures/page.tsx, app/parametres/CarteSupport.tsx, lib/aide.ts, lib/alertes.ts, lib/factureDepuisDevis.ts, lib/purgeComptes.ts |
| `factures.electronique` | essentiel | ⚠️ **aucun verrou serveur** |
| `canaux.email` | essentiel | ⚠️ **aucun verrou serveur** |
| `relances` | essentiel | app/api/cron/relances/route.ts, app/api/leads/contact/route.ts, app/api/leads/route.ts, lib/alertes.ts, lib/purgeComptes.ts |
| `plateforme.ia.auto` | studio | app/api/plateforme/config/route.ts, app/plateforme/Automatisations.tsx, app/plateforme/Reglages.tsx, lib/ai/routage.ts, lib/plateformeConfig.ts |
| `plateforme.personnalisation_avancee` | studio | app/api/plateforme/apparence/route.ts |
| `site.pro` | studio | ⚠️ **aucun verrou serveur** |
| `inventaire.stock` | studio | app/api/inventaire/route.ts, lib/inventaire/auth.ts |
| `inventaire.recherche_ia` | studio | app/api/inventaire/recherche/retenir/route.ts, app/api/inventaire/recherche/route.ts, app/inventaire/recherche/page.tsx |
| `canaux.whatsapp` | studio | ⚠️ **aucun verrou serveur** |
| `export` | studio | app/parametres/SectionDonnees.tsx |
| `plateforme.ia.expert` | signature | app/inventaire/recherche/page.tsx, app/plateforme/Automatisations.tsx |
| `plateforme.regles` | signature | lib/reglesServeur.ts |
| `site.signature` | signature | ⚠️ **aucun verrou serveur** |
| `canaux.reseaux` | signature | ⚠️ **aucun verrou serveur** |
| `support.prioritaire` | signature | ⚠️ **aucun verrou serveur** |

## Suites de test (77)

| Suite | Script | Coût |
|---|---|---|
| Typage |  | gratuit |
| Build |  | gratuit |
| Budgets de performance | scripts/budget-perf.mjs | gratuit |
| Fichiers a coller | scripts/migrations-jumelles-e2e.mjs | gratuit |
| RLS : ce qu un jeton de navigateur voit des autres | scripts/sonde-rls-fondateur.mjs | gratuit |
| L ancien poste de controle reste supprime | scripts/sonde-ancien-poste.mjs | gratuit |
| Chiffrement des canaux | scripts/canaux-e2e.mjs | gratuit |
| Lecture des emails | scripts/maillite-e2e.mjs | gratuit |
| Réglages du site | scripts/site-style-e2e.mjs | navigateur |
| Tarifs et provenance des prix | scripts/tarifs-e2e.mjs | gratuit |
| Conformité de facturation | scripts/facturation-e2e.mjs | gratuit |
| XML de facture électronique | scripts/facturx-e2e.mjs | gratuit |
| Isolation entre artisans (RLS) | scripts/rls-e2e.mjs | gratuit |
| Force des mots de passe | scripts/motdepasse-e2e.mjs | navigateur |
| Mots de passe fuités (HIBP) | scripts/fuite-mdp-e2e.mjs | gratuit |
| Offres = verrous (matrice) | scripts/offres-e2e.mjs | gratuit |
| Limites atomiques | scripts/limites-e2e.mjs | gratuit |
| Plafond de réinitialisation | scripts/reset-plafond-e2e.mjs | gratuit |
| Mentions bloquantes à l émission | scripts/mentions-bloquantes-e2e.mjs | gratuit |
| Verrou serveur des règles (offre) | scripts/regles-verrou-e2e.mjs | gratuit |
| Purge des comptes (effacement / anonymisation) | scripts/purge-comptes-e2e.mjs | gratuit |
| Correctifs de l audit final (B, C, H) | scripts/audit-final-e2e.mjs | gratuit |
| Fermeture des portes (routes, crons, pages, capacités, drapeaux) | scripts/fermeture-e2e.mjs | gratuit |
| Carte des emails | scripts/emails-e2e.mjs | gratuit |
| Garde de commit (régressions connues) | scripts/garde-commit.mjs | gratuit |
| Quota de stockage par compte | scripts/quota-media-e2e.mjs | gratuit |
| Purges RGPD (12 mois / 3 ans) | scripts/purges-rgpd-e2e.mjs | gratuit |
| Relances automatiques (bout en bout, sans IA) | scripts/relances-e2e.mjs | gratuit |
| Domaine perso (routage, marque, vérification) | scripts/domaine-perso-e2e.mjs | gratuit |
| Motion — CLS des slides, onglets de la démo, boucles hors écran | scripts/motion-cls-e2e.mjs | navigateur |
| Mobile (iPhone 14, Pixel 7, iPad Mini : 28 pages, parcours, clavier, Lighthouse) | scripts/mobile-e2e.mjs | navigateur |
| App installable (manifeste, white-label, service worker, hors-ligne, carte Android/iOS, mise à jour) | scripts/pwa-e2e.mjs | navigateur |
| Liens profonds de l’app (assetlinks, white-label, chemins manifeste = pont, coque fermée) | scripts/liens-profonds-e2e.mjs | gratuit |
| Poste de contrôle — socle (garde, second facteur, re-confirmation, journal immuable, rôle lecture, écran) | scripts/controle-e2e.mjs | navigateur |
| Poste de contrôle — registre des apports (lien signé, preuve infalsifiable, pièce obligatoire, 10 % contesté) | scripts/controle-apports-e2e.mjs | gratuit |
| Poste de contrôle — gestes d’argent en mode TEST (offre, prorata, remboursement borné, pause, alignement en base) | scripts/controle-argent-e2e.mjs | gratuit |
| Poste de contrôle — messagerie de l’entreprise (dédoublonnage, fil, classement journalisé, boîte non lisible par PostgREST) | scripts/controle-messagerie-e2e.mjs | gratuit |
| Poste de contrôle — droits du partenaire (chaque action interdite rejouée avec son jeton, et PostgREST muet) | scripts/controle-droits-e2e.mjs | gratuit |
| Poste de contrôle — comptabilité et relevé du partenaire (annexe A du contrat, au centime) | scripts/controle-compta-e2e.mjs | gratuit |
| Zéro démo — aucun compte privilégié inattendu, aucune donnée de test en production, aucun écran du produit qui montre du faux | scripts/zero-demo-e2e.mjs | gratuit |
| Notifications push web (envoi chiffré, purge 410, plafond, charge utile sans donnée personnelle, routes, écran) | scripts/push-e2e.mjs | navigateur |
| Code par email à la connexion (anti-énumération, essais, appareils de confiance, TOTP) | scripts/code-connexion-e2e.mjs | navigateur |
| Les trois modes de réponse (offre × mode × route, sans IA) | scripts/modes-e2e.mjs | gratuit |
| Alertes (ronde à sec, huit motifs) | scripts/alertes-e2e.mjs | gratuit |
| Cache mutualisé des prix | scripts/cache-prix-e2e.mjs | gratuit |
| IA — unitaires (métiers, playbooks, anti-fabrication) | scripts/ia-unit-e2e.mjs | gratuit |
| Aide (panneau, ⓘ, visite, centre) | scripts/aide-e2e.mjs | navigateur |
| Inventaire v2 (fiches, fournisseurs, isolation) | scripts/inventaire-v2-e2e.mjs | gratuit |
| Slides 3D (Signature) | scripts/slides-e2e.mjs | navigateur |
| Paramètres (navigation, sécurité, données) | scripts/parametres-e2e.mjs | navigateur |
| Poste de pilotage (propositions, prise de main, règles) | scripts/pilotage-e2e.mjs | ia |
| Correctifs de l audit | scripts/audit-correctifs-e2e.mjs | gratuit |
| Inventaire | scripts/inventaire-e2e.mjs | navigateur |
| Photos et géolocalisation | scripts/photos-e2e.mjs | navigateur |
| Visionneuse et réassurance | scripts/site-motion-e2e.mjs | navigateur |
| Accessibilité (axe-core) | scripts/a11y-e2e.mjs | navigateur |
| Indexation et white-label | scripts/seo-e2e.mjs | gratuit |
| Existence juridique des surfaces | scripts/legal-e2e.mjs | navigateur |
| Canaux — interface | scripts/canaux-visuel.mjs | navigateur |
| Injection de prompt | scripts/injection-e2e.mjs | ia |
| Provenance dans un devis réel | scripts/devis-source-e2e.mjs | ia |
| Mode support — la matrice des droits (unitaire, sans reseau) | scripts/support-droits-unit.mjs | gratuit |
| Mode support — la porte : un ticket n’autorise rien, l’artisan seul ouvre, chaque lecture trace | scripts/support-e2e.mjs | gratuit |
| Courriers de l’entreprise — resolution de la boite et classement par nature | scripts/courriers-e2e.mjs | gratuit |
| Abonnement de bout en bout (11 transitions, sans débit) | scripts/abonnement-e2e.mjs | ia |
| Comptes clients de la plateforme (lien à usage unique, révocation serveur) | scripts/comptes-clients-e2e.mjs | gratuit |
| Messagerie de la console (persistance et remise) | scripts/messages-e2e.mjs | gratuit |
| Panneau IA : le serveur décide, pas le navigateur | scripts/plateforme-config-e2e.mjs | ia |
| Suppression granulaire (documents légaux conservés) | scripts/suppressions-e2e.mjs | gratuit |
| Double authentification (enrôlement, codes de secours) | scripts/mfa-e2e.mjs | navigateur |
| Carte Devis dans la conversation (acceptation opposable) | scripts/devis-conversation-e2e.mjs | navigateur |
| Messages — désactivation de l’automatique | scripts/messages-deauto-e2e.mjs | navigateur |
| App de conversation de la plateforme | scripts/plateforme-e2e.mjs | navigateur |
| Écran « Ma plateforme → Intelligence » | scripts/plateforme-intelligence-e2e.mjs | navigateur |
| Conversation-plateforme (premier contact + relance) | scripts/conv-e2e.mjs | ia |
| Persona : le ton réglé change vraiment la réponse | scripts/persona-e2e.mjs | ia |
| Recherche chez les fournisseurs (sceau, plafonds) | scripts/recherche-e2e.mjs | ia |
