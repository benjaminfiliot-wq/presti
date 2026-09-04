# Couverture — qui teste quoi — généré le 2026-09-04 22:39

> Généré par `scripts/inventaire-produit.mjs`. **Une case vide est un test à écrire.** Cases vides : **75**.

## Cases vides (75)

| Type | Élément |
|---|---|
| routes | `/api/account/inscription` |
| routes | `/api/account/slug` |
| routes | `/api/canaux/relever` |
| routes | `/api/contact` |
| routes | `/api/control/agents` |
| routes | `/api/control/run-agent` |
| routes | `/api/control/security` |
| routes | `/api/cron/purge-comptes` |
| routes | `/api/cron/relances` |
| routes | `/api/devis/:id/envoyer` |
| routes | `/api/devis/:id/pdf` |
| routes | `/api/factures/:id/facturx` |
| routes | `/api/factures/:id/pdf` |
| routes | `/api/leads/contact` |
| routes | `/api/leads/photos` |
| routes | `/api/plat-event` |
| routes | `/api/report-error` |
| routes | `/api/site/generate` |
| routes | `/api/stripe/portail` |
| routes | `/api/tools/reponse` |
| pages | `/onboarding` |
| pages | `/reset-password` |
| pages | `/site/[slug]/infos-legales` |
| capacites | `plateforme.comptes_clients` |
| capacites | `plateforme.domaine_perso` |
| capacites | `site.essentiel` |
| capacites | `devis.ia` |
| capacites | `devis.prix_artisan` |
| capacites | `factures.electronique` |
| capacites | `canaux.email` |
| capacites | `plateforme.ia.auto` |
| capacites | `plateforme.personnalisation_avancee` |
| capacites | `site.pro` |
| capacites | `inventaire.recherche_ia` |
| capacites | `canaux.whatsapp` |
| capacites | `export` |
| capacites | `plateforme.ia.expert` |
| capacites | `site.signature` |
| capacites | `canaux.reseaux` |
| capacites | `support.prioritaire` |
| emails | `app/api/account/inscription/route.ts:32` |
| emails | `app/api/auth/reset-request/route.ts:51` |
| emails | `app/api/contact/route.ts:55` |
| emails | `app/api/conversation/route.ts:165` |
| emails | `app/api/conversation/route.ts:180` |
| emails | `app/api/conversation/route.ts:216` |
| emails | `app/api/conversation/stream/route.ts:83` |
| emails | `app/api/cron/relances/route.ts:71` |
| emails | `app/api/devis/[id]/envoyer/route.ts:59` |
| emails | `app/api/leads/contact/route.ts:68` |
| emails | `app/api/leads/contact/route.ts:78` |
| emails | `app/api/leads/route.ts:169` |
| emails | `app/api/leads/route.ts:179` |
| emails | `app/api/leads/route.ts:235` |
| emails | `app/api/leads/route.ts:255` |
| emails | `app/api/messages/route.ts:94` |
| emails | `app/api/messages/route.ts:145` |
| emails | `app/api/p/auth/route.ts:60` |
| emails | `app/api/report-error/route.ts:40` |
| emails | `app/api/stripe/webhook/route.ts:46` |
| emails | `app/api/stripe/webhook/route.ts:57` |
| emails | `lib/purgeComptes.ts:28` |
| crons | `/api/cron/relances` |
| crons | `/api/canaux/relever` |
| drapeaux | `inventaireOcr` |
| drapeaux | `inventaireRecherche` |
| drapeaux | `plateformePilotage` |
| drapeaux | `plateformeRegles` |
| drapeaux | `siteSlides3d` |
| drapeaux | `aideVisites` |
| drapeaux | `aideCentre` |
| drapeaux | `landingVideo` |
| drapeaux | `plateformePersona` |
| drapeaux | `canauxWhatsapp` |
| drapeaux | `canauxReseaux` |

## Routes API

| Élément | Suites |
|---|---|
| `/api/account/delete` | parametres-e2e.mjs |
| `/api/account/inscription` | **—** |
| `/api/account/slug` | **—** |
| `/api/auth/mdp-fuite` | fuite-mdp-e2e.mjs |
| `/api/auth/reset-confirm` | fuite-mdp-e2e.mjs |
| `/api/auth/reset-request` | reset-plafond-e2e.mjs |
| `/api/canaux` | canaux-e2e.mjs |
| `/api/canaux/relever` | **—** |
| `/api/contact` | **—** |
| `/api/control/agents` | **—** |
| `/api/control/inbox` | smoke-test.mjs |
| `/api/control/run-agent` | **—** |
| `/api/control/security` | **—** |
| `/api/control/stats` | smoke-test.mjs |
| `/api/control/stripe` | smoke-test.mjs |
| `/api/conversation` | conv-e2e.mjs, devis-conversation-e2e.mjs, messages-e2e.mjs, persona-e2e.mjs, pilotage-e2e.mjs, plateforme-config-e2e.mjs |
| `/api/conversation/devis` | devis-conversation-e2e.mjs, pilotage-e2e.mjs |
| `/api/conversation/regles` | pilotage-e2e.mjs |
| `/api/conversation/stream` | persona-e2e.mjs, pilotage-e2e.mjs, plateforme-config-e2e.mjs |
| `/api/cron/purge-comptes` | **—** |
| `/api/cron/relances` | **—** |
| `/api/devis` | devis-source-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs |
| `/api/devis/:id` | devis-source-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs |
| `/api/devis/:id/envoyer` | **—** |
| `/api/devis/:id/pdf` | **—** |
| `/api/devis/auto` | injection-e2e.mjs |
| `/api/devis/generer` | devis-source-e2e.mjs |
| `/api/domain` | offres-e2e.mjs |
| `/api/donnees` | parametres-e2e.mjs, rls-e2e.mjs, suppressions-e2e.mjs |
| `/api/donnees/export` | parametres-e2e.mjs |
| `/api/factures` | mentions-bloquantes-e2e.mjs, pdf-e2e.mjs |
| `/api/factures/:id` | pdf-e2e.mjs |
| `/api/factures/:id/facturx` | **—** |
| `/api/factures/:id/pdf` | **—** |
| `/api/inventaire` | inventaire-e2e.mjs, inventaire-v2-e2e.mjs, mfa-e2e.mjs, offres-e2e.mjs, recherche-e2e.mjs, rls-e2e.mjs |
| `/api/inventaire/fournisseurs` | inventaire-v2-e2e.mjs, recherche-e2e.mjs |
| `/api/inventaire/materiaux` | inventaire-v2-e2e.mjs, recherche-e2e.mjs |
| `/api/inventaire/observations` | inventaire-v2-e2e.mjs |
| `/api/inventaire/recherche` | recherche-e2e.mjs |
| `/api/inventaire/recherche/retenir` | recherche-e2e.mjs |
| `/api/leads` | conv-e2e.mjs, injection-e2e.mjs, leads-abuse-test.mjs, limites-e2e.mjs, parametres-e2e.mjs, persona-e2e.mjs, plateforme-config-e2e.mjs |
| `/api/leads/contact` | **—** |
| `/api/leads/photos` | **—** |
| `/api/messages` | messages-e2e.mjs, pilotage-e2e.mjs |
| `/api/p/auth` | comptes-clients-e2e.mjs |
| `/api/plat-event` | **—** |
| `/api/plateforme/apparence` | persona-e2e.mjs |
| `/api/report-error` | **—** |
| `/api/securite/mot-de-passe` | parametres-e2e.mjs |
| `/api/securite/sessions` | mfa-e2e.mjs, parametres-e2e.mjs, rls-e2e.mjs |
| `/api/site/generate` | **—** |
| `/api/stripe/portail` | **—** |
| `/api/stripe/webhook` | stripe-verifier.mjs |
| `/api/subscribe` | stripe-session-test.mjs |
| `/api/tarifs` | rls-e2e.mjs, tarifs-e2e.mjs |
| `/api/tools/reponse` | **—** |

## Pages

| Élément | Suites |
|---|---|
| `/` | smoke-test.mjs |
| `/abonnement` | offres-e2e.mjs, stripe-session-test.mjs |
| `/aide` | aide-e2e.mjs, inventaire-e2e.mjs, tout-verifier.mjs |
| `/cgu` | smoke-test.mjs |
| `/confidentialite` | smoke-test.mjs |
| `/contact` | legal-e2e.mjs, mail-verifier.mjs |
| `/controle` | seo-e2e.mjs |
| `/dashboard` | aide-e2e.mjs, parametres-e2e.mjs, seo-e2e.mjs, stripe-session-test.mjs |
| `/devis` | aide-e2e.mjs, devis-conversation-e2e.mjs, devis-source-e2e.mjs, fact-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, pilotage-e2e.mjs, smoke-test.mjs, suppressions-e2e.mjs, tout-verifier.mjs |
| `/devis/[id]` | aide-e2e.mjs, devis-source-e2e.mjs, fact-e2e.mjs, injection-e2e.mjs, mentions-bloquantes-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, smoke-test.mjs, suppressions-e2e.mjs |
| `/factures` | fact-e2e.mjs, mentions-bloquantes-e2e.mjs, parametres-e2e.mjs, pdf-e2e.mjs, seo-e2e.mjs |
| `/faq` | smoke-test.mjs |
| `/inventaire` | cache-prix-e2e.mjs, inventaire-e2e.mjs, inventaire-v2-e2e.mjs, mfa-e2e.mjs, offres-e2e.mjs, recherche-e2e.mjs, rls-e2e.mjs, tout-verifier.mjs |
| `/inventaire/fournisseurs` | inventaire-v2-e2e.mjs, recherche-e2e.mjs |
| `/inventaire/recherche` | recherche-e2e.mjs |
| `/login` | aide-e2e.mjs, devis-source-e2e.mjs, fact-e2e.mjs, messages-deauto-e2e.mjs, mfa-e2e.mjs, parametres-e2e.mjs, photos-e2e.mjs, plateforme-intelligence-e2e.mjs, smoke-test.mjs |
| `/mentions-legales` | smoke-test.mjs |
| `/messages` | messages-deauto-e2e.mjs, messages-e2e.mjs, parametres-e2e.mjs, pilotage-e2e.mjs, seo-e2e.mjs |
| `/messages/canaux` | parametres-e2e.mjs |
| `/onboarding` | **—** |
| `/outils` | aide-e2e.mjs, devis-source-e2e.mjs, ia-unit-e2e.mjs, mfa-e2e.mjs, photos-e2e.mjs |
| `/p/[slug]` | a11y-e2e.mjs, audit-correctifs-e2e.mjs, comptes-clients-e2e.mjs, devis-conversation-e2e.mjs, legal-e2e.mjs, persona-e2e.mjs, plateforme-e2e.mjs, plateforme-intelligence-e2e.mjs, seo-e2e.mjs, smoke-test.mjs |
| `/parametres` | mentions-bloquantes-e2e.mjs, mfa-e2e.mjs, parametres-e2e.mjs, seo-e2e.mjs, tout-verifier.mjs |
| `/plateforme` | messages-deauto-e2e.mjs, parametres-e2e.mjs, persona-e2e.mjs, plateforme-config-e2e.mjs, plateforme-intelligence-e2e.mjs, seo-e2e.mjs |
| `/profil` | aide-e2e.mjs, messages-deauto-e2e.mjs, parametres-e2e.mjs, photos-e2e.mjs, seo-e2e.mjs |
| `/reset-password` | **—** |
| `/signup` | motdepasse-e2e.mjs, smoke-test.mjs |
| `/site/[slug]` | a11y-e2e.mjs, legal-e2e.mjs, seo-e2e.mjs, site-motion-e2e.mjs, site-style-e2e.mjs, slides-e2e.mjs, smoke-test.mjs |
| `/site/[slug]/infos-legales` | **—** |
| `/tarifs` | rls-e2e.mjs, tarifs-e2e.mjs, tout-verifier.mjs |

## Capacités

| Élément | Suites |
|---|---|
| `plateforme.conversation` | offres-e2e.mjs |
| `plateforme.comptes_clients` | **—** |
| `plateforme.domaine_perso` | **—** |
| `site.essentiel` | **—** |
| `site.domaine_perso` | offres-e2e.mjs |
| `devis.ia` | **—** |
| `devis.prix_artisan` | **—** |
| `factures` | audit-correctifs-e2e.mjs, facturation-e2e.mjs, mentions-bloquantes-e2e.mjs, pilotage-e2e.mjs, rls-e2e.mjs |
| `factures.electronique` | **—** |
| `canaux.email` | **—** |
| `relances` | limites-e2e.mjs |
| `plateforme.ia.auto` | **—** |
| `plateforme.personnalisation_avancee` | **—** |
| `site.pro` | **—** |
| `inventaire.stock` | offres-e2e.mjs |
| `inventaire.recherche_ia` | **—** |
| `canaux.whatsapp` | **—** |
| `export` | **—** |
| `plateforme.ia.expert` | **—** |
| `plateforme.regles` | regles-verrou-e2e.mjs |
| `site.signature` | **—** |
| `canaux.reseaux` | **—** |
| `support.prioritaire` | **—** |

## Emails

| Élément | Suites |
|---|---|
| `app/api/account/inscription/route.ts:32` | **—** |
| `app/api/auth/reset-request/route.ts:51` | **—** |
| `app/api/contact/route.ts:55` | **—** |
| `app/api/conversation/devis/route.ts:68` | devis-conversation-e2e.mjs, persona-e2e.mjs |
| `app/api/conversation/devis/route.ts:87` | devis-conversation-e2e.mjs, persona-e2e.mjs |
| `app/api/conversation/devis/route.ts:108` | devis-conversation-e2e.mjs, persona-e2e.mjs |
| `app/api/conversation/route.ts:165` | **—** |
| `app/api/conversation/route.ts:180` | **—** |
| `app/api/conversation/route.ts:216` | **—** |
| `app/api/conversation/stream/route.ts:83` | **—** |
| `app/api/cron/relances/route.ts:71` | **—** |
| `app/api/devis/[id]/envoyer/route.ts:59` | **—** |
| `app/api/leads/contact/route.ts:68` | **—** |
| `app/api/leads/contact/route.ts:78` | **—** |
| `app/api/leads/route.ts:169` | **—** |
| `app/api/leads/route.ts:179` | **—** |
| `app/api/leads/route.ts:235` | **—** |
| `app/api/leads/route.ts:255` | **—** |
| `app/api/messages/route.ts:94` | **—** |
| `app/api/messages/route.ts:145` | **—** |
| `app/api/p/auth/route.ts:60` | **—** |
| `app/api/report-error/route.ts:40` | **—** |
| `app/api/stripe/webhook/route.ts:46` | **—** |
| `app/api/stripe/webhook/route.ts:57` | **—** |
| `lib/purgeComptes.ts:28` | **—** |
| `lib/reglesServeur.ts:61` | pilotage-e2e.mjs |

## Crons

| Élément | Suites |
|---|---|
| `/api/cron/relances` | **—** |
| `/api/canaux/relever` | **—** |

## Drapeaux

| Élément | Suites |
|---|---|
| `mfa` | mfa-e2e.mjs |
| `inventaireOcr` | **—** |
| `inventaireRecherche` | **—** |
| `plateformePilotage` | **—** |
| `plateformeRegles` | **—** |
| `siteSlides3d` | **—** |
| `aideVisites` | **—** |
| `aideCentre` | **—** |
| `landingVideo` | **—** |
| `plateformePersona` | **—** |
| `canauxWhatsapp` | **—** |
| `canauxReseaux` | **—** |
