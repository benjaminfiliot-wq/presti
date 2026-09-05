# Inventaire du produit — généré le 2026-09-05 06:39

> Produit par `scripts/inventaire-produit.mjs` en lisant le code. Ne pas éditer à la main : relancer.

| Élément | Nombre |
|---|---|
| Pages | 30 |
| Routes API | 58 |
| Migrations | 58 (dernière : 0058_bornes_artisans.sql) |
| Drapeaux | 12 (9 levés) |
| Envois d'email | 29 (+ 5 motifs d'alerte de service) |
| Crons | 2 planifiés · ⚠️ 2 route(s) cron sans planification : /api/cron/alertes, /api/cron/purge-comptes |
| Capacités | 23 (11 socle, +7 Studio, +5 Signature) |
| Suites de test | 40 dans le lanceur · ⚠️ 21 script(s) de test hors lanceur |


## Pages (30)

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
| `/parametres` | console | oui | client | app/parametres/page.tsx |
| `/plateforme` | console | oui | client | app/plateforme/page.tsx |
| `/profil` | console | oui | client | app/profil/page.tsx |
| `/reset-password` | landing | non | client | app/reset-password/page.tsx |
| `/signup` | landing | non | client | app/signup/page.tsx |
| `/site/[slug]` | site artisan | non | serveur | app/site/[slug]/page.tsx |
| `/site/[slug]/infos-legales` | site artisan | non | serveur | app/site/[slug]/infos-legales/page.tsx |
| `/tarifs` | landing | oui | client | app/tarifs/page.tsx |

## Routes API (58)

| Route | Méthodes | Auth | Plan requis | Plafonds | Crédits | IA |
|---|---|---|---|---|---|---|
| `/api/account/delete` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/account/inscription` | POST | jeton artisan | — | inscription:· 1/24*60*60s | — | — |
| `/api/account/slug` | GET, POST | jeton artisan | — | — | — | — |
| `/api/auth/mdp-fuite` | POST | publique | — | — | — | — |
| `/api/auth/reset-confirm` | POST | publique | — | — | — | — |
| `/api/auth/reset-request` | POST | publique | — | — | — | — |
| `/api/canaux` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/canaux/relever` | GET, POST | jeton artisan | — | — | — | — |
| `/api/contact` | POST | publique | — | contact:· 3/3600s | — | — |
| `/api/control/agents` | POST | jeton artisan | — | — | — | — |
| `/api/control/inbox` | GET | jeton artisan | — | — | — | — |
| `/api/control/run-agent` | POST, GET | jeton artisan | — | — | — | — |
| `/api/control/security` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/control/stats` | GET | jeton artisan | — | — | — | — |
| `/api/control/stripe` | GET | jeton artisan | — | — | — | — |
| `/api/conversation` | GET, POST | jeton de conversation | — | conv:· 6/5*60s | oui | ⚡ |
| `/api/conversation/devis` | POST | jeton de conversation | — | conv:· 6/5*60s | — | — |
| `/api/conversation/regles` | POST | jeton de conversation | — | regles-ip:· 30/3600s · regles:· 6/3600s | — | ⚡ |
| `/api/conversation/stream` | POST | jeton de conversation | plateforme.ia.auto | conv:· 6/5*60s | oui | ⚡ |
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
| `/api/messages` | POST | jeton artisan | — | — | oui | ⚡ |
| `/api/p/auth` | GET, POST | publique | — | lien:ip:· 5/15*60s | — | — |
| `/api/plat-event` | POST | publique | — | — | — | — |
| `/api/plateforme/apparence` | GET, POST | jeton artisan | plateforme.personnalisation_avancee | — | — | — |
| `/api/report-error` | POST | publique | — | err:ip:· 60/5*60s | — | — |
| `/api/securite/mot-de-passe` | POST | jeton artisan | — | mdp:· 5/15*60s | — | — |
| `/api/securite/sessions` | GET, DELETE, POST | jeton artisan | — | — | — | — |
| `/api/site/generate` | POST | jeton artisan | — | — | oui | — |
| `/api/stripe/portail` | GET, POST | jeton artisan | — | — | — | — |
| `/api/stripe/webhook` | POST | signature Stripe | — | — | — | — |
| `/api/subscribe` | POST | jeton artisan | — | — | — | — |
| `/api/tarifs` | GET, POST, DELETE | jeton artisan | — | — | — | — |
| `/api/tools/reponse` | POST | jeton artisan | — | — | oui | ⚡ |

## Migrations (58)

Posées à la main dans le SQL Editor (mot de passe Postgres désaligné). Sondes en base sur les dix dernières :

| Migration | En base |
|---|---|
| 0049_limites_atomiques.sql | ✅ |
| 0050_pilotage.sql | ✅ |
| 0051_slug_modifiable.sql | ✅ |
| 0052_parametres.sql | ✅ |
| 0053_plateforme_persona.sql | ✅ |
| 0054_purge_comptes_test.sql | ✅ |
| 0055_verrou_credits_stripe.sql | ✅ |
| 0056_cache_prix_mutualise.sql | ✅ |
| 0057_passages_cron.sql | non sondée |
| 0058_bornes_artisans.sql | non sondée |

Fichiers à coller présents : _A_COLLER_sql_editor_0047_a_0052.sql, _A_COLLER_sql_editor_0053.sql, _A_COLLER_sql_editor_0054.sql, _A_COLLER_sql_editor_0054_0055.sql, _A_COLLER_sql_editor_0056.sql, _A_COLLER_sql_editor_0057.sql, _A_COLLER_sql_editor_0057_0058.sql.

## Drapeaux (12)

| Drapeau | État | Consommé par |
|---|---|---|
| `mfa` | levé | app/AppShell.tsx, app/login/page.tsx, app/parametres/commun.ts, app/parametres/page.tsx, app/parametres/SectionSecurite.tsx, lib/authArtisan.ts |
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

## Emails envoyés (29)

| Où | Fonction | Type / sujet | Destinataire |
|---|---|---|---|
| app/api/account/inscription/route.ts:32 | notifierEntreprise | — | entreprise |
| app/api/auth/reset-request/route.ts:51 | sendEmail | 'Réinitialisation de votre mot de passe — Presti' | email |
| app/api/contact/route.ts:55 | notifierEntreprise | — | entreprise |
| app/api/conversation/devis/route.ts:68 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/devis/route.ts:87 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/devis/route.ts:108 | notifierArtisan | devis_accepte | artisan |
| app/api/conversation/route.ts:166 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/route.ts:185 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/route.ts:220 | notifierArtisan | nouvelle_demande | artisan |
| app/api/conversation/stream/route.ts:84 | notifierArtisan | nouvelle_demande | artisan |
| app/api/cron/relances/route.ts:76 | sendEmail | — | lead.contact as string |
| app/api/devis/[id]/envoyer/route.ts:59 | sendEmail | `Votre devis ${devis.numero || ''} — ${nomEnt}` | devis.client_email |
| app/api/leads/contact/route.ts:68 | notifierArtisan | nouvelle_demande | artisan |
| app/api/leads/contact/route.ts:78 | sendEmail | `Bien reçu — ${artisan?.nom || 'votre demande'}` | contact |
| app/api/leads/route.ts:170 | notifierArtisan | nouvelle_demande | artisan |
| app/api/leads/route.ts:180 | sendEmail | `Bien reçu — ${artisan.nom || 'votre demande'}` | contact |
| app/api/leads/route.ts:236 | sendEmail | nouvelle_demande | contact |
| app/api/leads/route.ts:256 | notifierArtisan | nouvelle_demande | artisan |
| app/api/messages/route.ts:95 | sendEmail | `Réponse de ${artisanV?.nom ?? 'votre artisan'}` | lead.contact |
| app/api/messages/route.ts:154 | sendEmail | `Réponse de ${artisan?.nom ?? 'votre artisan'}` | lead.contact |
| app/api/p/auth/route.ts:60 | sendEmail | `Votre lien de connexion — ${artisan.nom || 'votre espace'}` | email |
| app/api/report-error/route.ts:40 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:55 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:69 | notifierEntreprise | — | entreprise |
| app/api/stripe/webhook/route.ts:88 | notifierEntreprise | — | entreprise |
| lib/alertes.ts:244 | notifierEntreprise | `Presti — ${sujet}` | entreprise |
| lib/alertes.ts:245 | sendEmail | `Presti — ${sujet}` | al.a.email |
| lib/purgeComptes.ts:129 | notifierEntreprise | — | entreprise |
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
| `factures` | essentiel | app/aide/page.tsx, app/api/account/delete/route.ts, app/api/control/agents/route.ts, app/api/donnees/export/route.ts, app/api/factures/[id]/avoir/route.ts, app/api/factures/[id]/facturx/route.ts, app/api/factures/[id]/pdf/route.ts, app/api/factures/[id]/route.ts, app/AppShell.tsx, app/factures/page.tsx, lib/aide.ts, lib/alertes.ts, lib/factureDepuisDevis.ts, lib/purgeComptes.ts |
| `factures.electronique` | essentiel | ⚠️ **aucun verrou serveur** |
| `canaux.email` | essentiel | ⚠️ **aucun verrou serveur** |
| `relances` | essentiel | app/api/cron/relances/route.ts, app/api/leads/contact/route.ts, app/api/leads/route.ts, lib/alertes.ts, lib/purgeComptes.ts |
| `plateforme.ia.auto` | studio | app/api/conversation/stream/route.ts, app/plateforme/Automatisations.tsx, lib/ai/routage.ts |
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

## Suites de test (40)

| Suite | Script | Coût |
|---|---|---|
| Typage |  | gratuit |
| Build |  | gratuit |
| Budgets de performance | scripts/budget-perf.mjs | gratuit |
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

⚠️ Scripts de test absents du lanceur : `scripts/abonnement-e2e.mjs`, `scripts/comptes-clients-e2e.mjs`, `scripts/conv-e2e.mjs`, `scripts/devis-conversation-e2e.mjs`, `scripts/fact-e2e.mjs`, `scripts/leads-abuse-test.mjs`, `scripts/mail-verifier.mjs`, `scripts/messages-deauto-e2e.mjs`, `scripts/messages-e2e.mjs`, `scripts/mfa-e2e.mjs`, `scripts/pdf-e2e.mjs`, `scripts/persona-e2e.mjs`, `scripts/plateforme-config-e2e.mjs`, `scripts/plateforme-e2e.mjs`, `scripts/plateforme-intelligence-e2e.mjs`, `scripts/purger-comptes-test.mjs`, `scripts/recherche-e2e.mjs`, `scripts/smoke-test.mjs`, `scripts/stripe-session-test.mjs`, `scripts/stripe-verifier.mjs`, `scripts/suppressions-e2e.mjs`
