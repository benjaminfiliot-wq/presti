# Couverture — qui teste quoi — généré le 2026-09-07 18:08

> Généré par `scripts/inventaire-produit.mjs`. **Une case vide est un test à écrire ; un angle mort est un test à brancher.** Cases vides : **0** · angles morts de l’audit nocturne : **0**.

## Règles de couverture

- **L'effet d'un réglage = le comportement observé sur chaque route qui le lit.** Prouver qu'un réglage s'enregistre ne prouve rien : le 05/09, les trois modes de réponse s'enregistraient parfaitement et se comportaient pareil (deux sources de vérité, lues dans un ordre différent selon la route). Un réglage est couvert quand une suite l'écrit, appelle CHAQUE route qui le lit, et constate la différence — aller ET retour (`modes-e2e`).
- Une case vide est un test à écrire, pas une case à oublier.
- **Une case remplie par une suite que l’audit ne joue pas ne surveille rien.** L’audit nocturne lance `tout-verifier.mjs` sans `--tout` : une suite absente du lanceur, ou de coût `ia`, n’a été jouée qu’une fois, à la main. L’élément qu’elle seule couvre est un ANGLE MORT — le 07/09, il y en avait dix pendant que ce rapport annonçait « 0 case vide ».

## Cases vides (0)

Aucune.

## Angles morts de l’audit nocturne (0)

Testé, mais par aucune suite que la nuit joue. À lire comme : « si ça casse en production, personne ne le saura avant qu’un artisan le dise. »

Aucun.

## Routes API

| Élément | Suites |
|---|---|
| `/api/account/delete` | parametres-e2e.mjs |
| `/api/account/inscription` | controle-apports-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/account/slug` | fermeture-e2e.mjs |
| `/api/auth/code` | code-connexion-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, pwa-e2e.mjs |
| `/api/auth/code/verifier` | code-connexion-e2e.mjs |
| `/api/auth/mdp-fuite` | fuite-mdp-e2e.mjs |
| `/api/auth/reset-confirm` | fuite-mdp-e2e.mjs |
| `/api/auth/reset-request` | emails-e2e.mjs, reset-plafond-e2e.mjs |
| `/api/canaux` | canaux-e2e.mjs, fermeture-e2e.mjs |
| `/api/canaux/relever` | fermeture-e2e.mjs |
| `/api/contact` | emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/control/agents` | fermeture-e2e.mjs |
| `/api/control/inbox` | fermeture-e2e.mjs, smoke-test.mjs |
| `/api/control/run-agent` | fermeture-e2e.mjs |
| `/api/control/security` | controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/control/stats` | code-connexion-e2e.mjs, fermeture-e2e.mjs, smoke-test.mjs |
| `/api/control/stripe` | fermeture-e2e.mjs, smoke-test.mjs |
| `/api/controle/a-faire` | controle-droits-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/alertes/:id/acquitter` | controle-e2e.mjs |
| `/api/controle/apports` | controle-apports-e2e.mjs, controle-droits-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/apports/:id/statut` | controle-apports-e2e.mjs, emails-e2e.mjs |
| `/api/controle/barre` | fermeture-e2e.mjs |
| `/api/controle/chiffres` | controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/clients` | controle-apports-e2e.mjs, controle-droits-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/clients/:id` | controle-droits-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/clients/:id/action` | controle-droits-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/compta` | controle-compta-e2e.mjs, controle-droits-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/courriers` | controle-droits-e2e.mjs, controle-messagerie-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/courriers/:fil` | controle-messagerie-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/courriers/:fil/action` | controle-messagerie-e2e.mjs, emails-e2e.mjs |
| `/api/controle/courriers/relever` | controle-messagerie-e2e.mjs |
| `/api/controle/etat` | controle-droits-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/fil` | controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/journal` | controle-droits-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/recherche` | fermeture-e2e.mjs |
| `/api/controle/reconfirmer` | controle-apports-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/reglages` | controle-droits-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/releve` | controle-compta-e2e.mjs, fermeture-e2e.mjs |
| `/api/controle/securite/bans` | controle-droits-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/api/conversation` | abonnement-e2e.mjs, audit-final-e2e.mjs, conv-e2e.mjs, devis-conversation-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, messages-e2e.mjs, modes-e2e.mjs, persona-e2e.mjs, pilotage-e2e.mjs, plateforme-config-e2e.mjs |
| `/api/conversation/devis` | audit-final-e2e.mjs, devis-conversation-e2e.mjs, emails-e2e.mjs, pilotage-e2e.mjs |
| `/api/conversation/regles` | fermeture-e2e.mjs, pilotage-e2e.mjs |
| `/api/conversation/stream` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, modes-e2e.mjs, persona-e2e.mjs, pilotage-e2e.mjs, plateforme-config-e2e.mjs |
| `/api/cron/alertes` | fermeture-e2e.mjs |
| `/api/cron/purge-comptes` | fermeture-e2e.mjs |
| `/api/cron/relances` | audit-final-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, relances-e2e.mjs |
| `/api/devis` | audit-final-e2e.mjs, devis-source-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs |
| `/api/devis/:id` | audit-final-e2e.mjs, devis-source-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs |
| `/api/devis/:id/envoyer` | emails-e2e.mjs, fermeture-e2e.mjs, mentions-bloquantes-e2e.mjs |
| `/api/devis/:id/pdf` | fermeture-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs |
| `/api/devis/auto` | fermeture-e2e.mjs, injection-e2e.mjs |
| `/api/devis/generer` | audit-final-e2e.mjs, devis-source-e2e.mjs |
| `/api/domain` | domaine-perso-e2e.mjs, offres-e2e.mjs |
| `/api/donnees` | parametres-e2e.mjs, quota-media-e2e.mjs, rls-e2e.mjs, suppressions-e2e.mjs |
| `/api/donnees/export` | parametres-e2e.mjs |
| `/api/factures` | audit-final-e2e.mjs, fermeture-e2e.mjs, mentions-bloquantes-e2e.mjs, pdf-e2e.mjs |
| `/api/factures/:id` | audit-final-e2e.mjs, fermeture-e2e.mjs, pdf-e2e.mjs |
| `/api/factures/:id/avoir` | audit-final-e2e.mjs, fermeture-e2e.mjs |
| `/api/factures/:id/facturx` | fermeture-e2e.mjs |
| `/api/factures/:id/pdf` | fermeture-e2e.mjs, pdf-e2e.mjs |
| `/api/inventaire` | abonnement-e2e.mjs, fermeture-e2e.mjs, inventaire-e2e.mjs, inventaire-v2-e2e.mjs, mfa-e2e.mjs, offres-e2e.mjs, recherche-e2e.mjs, rls-e2e.mjs |
| `/api/inventaire/fournisseurs` | inventaire-v2-e2e.mjs, recherche-e2e.mjs |
| `/api/inventaire/materiaux` | inventaire-v2-e2e.mjs, recherche-e2e.mjs |
| `/api/inventaire/observations` | inventaire-v2-e2e.mjs |
| `/api/inventaire/recherche` | fermeture-e2e.mjs, recherche-e2e.mjs |
| `/api/inventaire/recherche/retenir` | fermeture-e2e.mjs, recherche-e2e.mjs |
| `/api/leads` | audit-final-e2e.mjs, conv-e2e.mjs, domaine-perso-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, injection-e2e.mjs, leads-abuse-test.mjs, limites-e2e.mjs, modes-e2e.mjs, parametres-e2e.mjs, persona-e2e.mjs, plateforme-config-e2e.mjs, push-e2e.mjs, quota-media-e2e.mjs, relances-e2e.mjs |
| `/api/leads/contact` | emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/leads/photos` | fermeture-e2e.mjs |
| `/api/media` | quota-media-e2e.mjs |
| `/api/messages` | audit-final-e2e.mjs, emails-e2e.mjs, messages-e2e.mjs, modes-e2e.mjs, pilotage-e2e.mjs |
| `/api/p/auth` | comptes-clients-e2e.mjs, emails-e2e.mjs |
| `/api/plat-event` | fermeture-e2e.mjs |
| `/api/plateforme/apparence` | abonnement-e2e.mjs, fermeture-e2e.mjs, persona-e2e.mjs |
| `/api/plateforme/config` | code-connexion-e2e.mjs, modes-e2e.mjs |
| `/api/push/abonner` | code-connexion-e2e.mjs, fermeture-e2e.mjs, push-e2e.mjs |
| `/api/push/test` | push-e2e.mjs |
| `/api/report-error` | emails-e2e.mjs, fermeture-e2e.mjs |
| `/api/securite/appareils` | code-connexion-e2e.mjs |
| `/api/securite/mot-de-passe` | parametres-e2e.mjs |
| `/api/securite/sessions` | code-connexion-e2e.mjs, mfa-e2e.mjs, parametres-e2e.mjs, rls-e2e.mjs |
| `/api/site/generate` | audit-final-e2e.mjs |
| `/api/stripe/portail` | abonnement-e2e.mjs, fermeture-e2e.mjs |
| `/api/stripe/webhook` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, stripe-verifier.mjs |
| `/api/subscribe` | abonnement-e2e.mjs, audit-final-e2e.mjs, stripe-session-test.mjs |
| `/api/tarifs` | rls-e2e.mjs, tarifs-e2e.mjs |
| `/api/tools/reponse` | audit-final-e2e.mjs |

## Pages

| Élément | Suites |
|---|---|
| `/` | abonnement-e2e.mjs, audit-final-e2e.mjs, domaine-perso-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, lib/connexion-test.mjs, liens-profonds-e2e.mjs, mobile-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/abonnement` | abonnement-e2e.mjs, controle-argent-e2e.mjs, mobile-e2e.mjs, offres-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, stripe-session-test.mjs, tout-verifier.mjs |
| `/aide` | aide-e2e.mjs, fermeture-e2e.mjs, inventaire-e2e.mjs, mobile-e2e.mjs, tout-verifier.mjs |
| `/cgu` | audit-final-e2e.mjs, domaine-perso-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/confidentialite` | audit-final-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/contact` | alertes-e2e.mjs, emails-e2e.mjs, facturation-e2e.mjs, fermeture-e2e.mjs, legal-e2e.mjs, mail-verifier.mjs, mobile-e2e.mjs, seo-e2e.mjs |
| `/controle` | controle-apports-e2e.mjs, controle-argent-e2e.mjs, controle-compta-e2e.mjs, controle-droits-e2e.mjs, controle-e2e.mjs, controle-messagerie-e2e.mjs, domaine-perso-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, seo-e2e.mjs, tout-verifier.mjs |
| `/dashboard` | abonnement-e2e.mjs, aide-e2e.mjs, controle-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, push-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, stripe-session-test.mjs |
| `/devis` | aide-e2e.mjs, audit-final-e2e.mjs, devis-conversation-e2e.mjs, devis-source-e2e.mjs, emails-e2e.mjs, fact-e2e.mjs, facturation-e2e.mjs, fermeture-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, pilotage-e2e.mjs, pwa-e2e.mjs, smoke-test.mjs, suppressions-e2e.mjs, tout-verifier.mjs |
| `/devis/[id]` | aide-e2e.mjs, audit-final-e2e.mjs, devis-source-e2e.mjs, emails-e2e.mjs, fact-e2e.mjs, fermeture-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, pwa-e2e.mjs, smoke-test.mjs, suppressions-e2e.mjs |
| `/direction` | controle-argent-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `/factures` | audit-final-e2e.mjs, fact-e2e.mjs, fermeture-e2e.mjs, mentions-bloquantes-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, seo-e2e.mjs |
| `/faq` | domaine-perso-e2e.mjs, fermeture-e2e.mjs, mobile-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/inventaire` | abonnement-e2e.mjs, cache-prix-e2e.mjs, fermeture-e2e.mjs, inventaire-e2e.mjs, inventaire-v2-e2e.mjs, mfa-e2e.mjs, mobile-e2e.mjs, offres-e2e.mjs, pwa-e2e.mjs, recherche-e2e.mjs, rls-e2e.mjs, tout-verifier.mjs |
| `/inventaire/fournisseurs` | inventaire-v2-e2e.mjs, mobile-e2e.mjs, pwa-e2e.mjs, recherche-e2e.mjs |
| `/inventaire/recherche` | fermeture-e2e.mjs, mobile-e2e.mjs, recherche-e2e.mjs |
| `/login` | aide-e2e.mjs, code-connexion-e2e.mjs, controle-e2e.mjs, devis-source-e2e.mjs, domaine-perso-e2e.mjs, fact-e2e.mjs, fermeture-e2e.mjs, lib/connexion-test.mjs, messages-deauto-e2e.mjs, mfa-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, photos-e2e.mjs, plateforme-intelligence-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/mentions-legales` | audit-final-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/messages` | audit-final-e2e.mjs, emails-e2e.mjs, messages-deauto-e2e.mjs, messages-e2e.mjs, mobile-e2e.mjs, modes-e2e.mjs, parametres-e2e.mjs, pilotage-e2e.mjs, push-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, tout-verifier.mjs |
| `/messages/canaux` | mobile-e2e.mjs, parametres-e2e.mjs |
| `/onboarding` | fermeture-e2e.mjs |
| `/outils` | aide-e2e.mjs, code-connexion-e2e.mjs, devis-source-e2e.mjs, ia-unit-e2e.mjs, mfa-e2e.mjs, mobile-e2e.mjs, photos-e2e.mjs |
| `/p/[slug]` | a11y-e2e.mjs, abonnement-e2e.mjs, audit-correctifs-e2e.mjs, audit-final-e2e.mjs, comptes-clients-e2e.mjs, devis-conversation-e2e.mjs, domaine-perso-e2e.mjs, emails-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, persona-e2e.mjs, plateforme-e2e.mjs, plateforme-intelligence-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/p/[slug]/[...reste]` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs |
| `/parametres` | code-connexion-e2e.mjs, mentions-bloquantes-e2e.mjs, mfa-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, push-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, tout-verifier.mjs |
| `/plateforme` | abonnement-e2e.mjs, audit-final-e2e.mjs, code-connexion-e2e.mjs, fermeture-e2e.mjs, messages-deauto-e2e.mjs, mobile-e2e.mjs, modes-e2e.mjs, parametres-e2e.mjs, persona-e2e.mjs, plateforme-config-e2e.mjs, plateforme-intelligence-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, tout-verifier.mjs |
| `/profil` | aide-e2e.mjs, audit-final-e2e.mjs, messages-deauto-e2e.mjs, mobile-e2e.mjs, parametres-e2e.mjs, photos-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs |
| `/reset-password` | fermeture-e2e.mjs, mobile-e2e.mjs, seo-e2e.mjs |
| `/signup` | audit-final-e2e.mjs, mobile-e2e.mjs, motdepasse-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/site/[slug]` | a11y-e2e.mjs, audit-final-e2e.mjs, domaine-perso-e2e.mjs, fermeture-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, motion-cls-e2e.mjs, pwa-e2e.mjs, seo-e2e.mjs, site-motion-e2e.mjs, site-style-e2e.mjs, slides-e2e.mjs, smoke-test.mjs |
| `/site/[slug]/[...reste]` | audit-final-e2e.mjs, domaine-perso-e2e.mjs, fermeture-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, pwa-e2e.mjs |
| `/site/[slug]/infos-legales` | audit-final-e2e.mjs, domaine-perso-e2e.mjs, fermeture-e2e.mjs, legal-e2e.mjs, mobile-e2e.mjs, pwa-e2e.mjs |
| `/tarifs` | rls-e2e.mjs, tarifs-e2e.mjs, tout-verifier.mjs |

## Capacités

| Élément | Suites |
|---|---|
| `plateforme.conversation` | abonnement-e2e.mjs, offres-e2e.mjs |
| `plateforme.comptes_clients` | fermeture-e2e.mjs |
| `plateforme.domaine_perso` | fermeture-e2e.mjs |
| `site.essentiel` | fermeture-e2e.mjs |
| `site.domaine_perso` | offres-e2e.mjs |
| `devis.ia` | abonnement-e2e.mjs |
| `devis.prix_artisan` | fermeture-e2e.mjs |
| `factures` | audit-correctifs-e2e.mjs, audit-final-e2e.mjs, controle-droits-e2e.mjs, facturation-e2e.mjs, mentions-bloquantes-e2e.mjs, pilotage-e2e.mjs, purge-comptes-e2e.mjs, purger-donnees-test.mjs, purges-rgpd-e2e.mjs, rls-e2e.mjs, zero-demo-e2e.mjs |
| `factures.electronique` | fermeture-e2e.mjs |
| `canaux.email` | fermeture-e2e.mjs |
| `relances` | limites-e2e.mjs, purger-donnees-test.mjs, quota-media-e2e.mjs, relances-e2e.mjs |
| `plateforme.ia.auto` | abonnement-e2e.mjs, modes-e2e.mjs |
| `plateforme.personnalisation_avancee` | fermeture-e2e.mjs |
| `site.pro` | fermeture-e2e.mjs |
| `inventaire.stock` | abonnement-e2e.mjs, offres-e2e.mjs |
| `inventaire.recherche_ia` | fermeture-e2e.mjs |
| `canaux.whatsapp` | fermeture-e2e.mjs |
| `export` | fermeture-e2e.mjs |
| `plateforme.ia.expert` | fermeture-e2e.mjs |
| `plateforme.regles` | regles-verrou-e2e.mjs |
| `site.signature` | fermeture-e2e.mjs |
| `canaux.reseaux` | fermeture-e2e.mjs |
| `support.prioritaire` | fermeture-e2e.mjs |

## Emails

| Élément | Suites |
|---|---|
| `app/api/account/inscription/route.ts:39` | emails-e2e.mjs |
| `app/api/auth/code/route.ts:91` | code-connexion-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs |
| `app/api/auth/reset-request/route.ts:51` | emails-e2e.mjs |
| `app/api/contact/route.ts:55` | emails-e2e.mjs |
| `app/api/controle/apports/[id]/statut/route.ts:92` | emails-e2e.mjs |
| `app/api/controle/clients/[id]/action/route.ts:190` | emails-e2e.mjs, fermeture-e2e.mjs |
| `app/api/controle/courriers/[fil]/action/route.ts:91` | emails-e2e.mjs |
| `app/api/conversation/devis/route.ts:68` | audit-final-e2e.mjs, devis-conversation-e2e.mjs, emails-e2e.mjs, persona-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/devis/route.ts:87` | audit-final-e2e.mjs, devis-conversation-e2e.mjs, emails-e2e.mjs, persona-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/devis/route.ts:108` | audit-final-e2e.mjs, devis-conversation-e2e.mjs, emails-e2e.mjs, persona-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/route.ts:170` | emails-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/route.ts:188` | emails-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/route.ts:223` | emails-e2e.mjs, push-e2e.mjs |
| `app/api/conversation/stream/route.ts:83` | audit-final-e2e.mjs, emails-e2e.mjs, push-e2e.mjs |
| `app/api/cron/relances/route.ts:98` | audit-final-e2e.mjs, emails-e2e.mjs, relances-e2e.mjs |
| `app/api/devis/[id]/envoyer/route.ts:59` | emails-e2e.mjs |
| `app/api/leads/contact/route.ts:68` | emails-e2e.mjs, push-e2e.mjs |
| `app/api/leads/contact/route.ts:78` | emails-e2e.mjs |
| `app/api/leads/route.ts:193` | audit-final-e2e.mjs, emails-e2e.mjs, push-e2e.mjs, relances-e2e.mjs |
| `app/api/leads/route.ts:203` | audit-final-e2e.mjs, emails-e2e.mjs, relances-e2e.mjs |
| `app/api/leads/route.ts:259` | audit-final-e2e.mjs, emails-e2e.mjs, push-e2e.mjs, relances-e2e.mjs |
| `app/api/leads/route.ts:279` | audit-final-e2e.mjs, emails-e2e.mjs, push-e2e.mjs, relances-e2e.mjs |
| `app/api/messages/route.ts:98` | audit-final-e2e.mjs, emails-e2e.mjs |
| `app/api/messages/route.ts:157` | audit-final-e2e.mjs, emails-e2e.mjs |
| `app/api/p/auth/route.ts:60` | emails-e2e.mjs |
| `app/api/report-error/route.ts:40` | emails-e2e.mjs |
| `app/api/stripe/webhook/route.ts:66` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, stripe-verifier.mjs |
| `app/api/stripe/webhook/route.ts:84` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, stripe-verifier.mjs |
| `app/api/stripe/webhook/route.ts:99` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, stripe-verifier.mjs |
| `app/api/stripe/webhook/route.ts:118` | abonnement-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs, stripe-verifier.mjs |
| `lib/alertes.ts:321` | abonnement-e2e.mjs, alertes-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs |
| `lib/alertes.ts:322` | abonnement-e2e.mjs, alertes-e2e.mjs, audit-final-e2e.mjs, emails-e2e.mjs |
| `lib/purgeComptes.ts:134` | emails-e2e.mjs, purge-comptes-e2e.mjs |
| `lib/reglesServeur.ts:67` | emails-e2e.mjs, pilotage-e2e.mjs, regles-verrou-e2e.mjs |

## Crons

| Élément | Suites |
|---|---|
| `/api/cron/relances` | audit-final-e2e.mjs, emails-e2e.mjs, fermeture-e2e.mjs, relances-e2e.mjs |
| `/api/canaux/relever` | fermeture-e2e.mjs |

## Drapeaux

| Élément | Suites |
|---|---|
| `codeEmail` | code-connexion-e2e.mjs, fermeture-e2e.mjs |
| `pushWeb` | fermeture-e2e.mjs, push-e2e.mjs |
| `pushNatif` | fermeture-e2e.mjs |
| `mfa` | fermeture-e2e.mjs, mfa-e2e.mjs |
| `direction` | controle-argent-e2e.mjs, controle-compta-e2e.mjs, controle-droits-e2e.mjs, controle-e2e.mjs, fermeture-e2e.mjs |
| `apports` | controle-apports-e2e.mjs, controle-droits-e2e.mjs, fermeture-e2e.mjs |
| `actionsArtisan` | fermeture-e2e.mjs |
| `messagerie` | fermeture-e2e.mjs |
| `comptabilite` | fermeture-e2e.mjs |
| `inventaireOcr` | fermeture-e2e.mjs |
| `inventaireRecherche` | fermeture-e2e.mjs |
| `plateformePilotage` | fermeture-e2e.mjs |
| `plateformeRegles` | fermeture-e2e.mjs |
| `siteSlides3d` | fermeture-e2e.mjs |
| `aideVisites` | fermeture-e2e.mjs |
| `aideCentre` | fermeture-e2e.mjs |
| `landingVideo` | fermeture-e2e.mjs |
| `plateformePersona` | fermeture-e2e.mjs |
| `canauxWhatsapp` | fermeture-e2e.mjs |
| `canauxReseaux` | fermeture-e2e.mjs |
