---
type: decision
title: "ADR-004 — Brevo gratuit pour l'e-mail en masse"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - envoi
  - brevo
  - prospection
  - delivrabilite
aliases:
  - ADR-004
  - Brevo gratuit
sources:
  - "Addendum de Benj du 01/11/2026, §4 (e-mail en masse, décision verrouillée), §7 (sécurité)"
  - "https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan (consultée le 01/11/2026)"
  - "https://www.brevo.com/fr/pricing/ et https://www.brevo.com/pricing.md, généré le 2026-09-29 (consultées le 01/11/2026)"
  - "https://www.brevo.com/legal/antispampolicy/ (Acceptable Use Policy, annexe 7, consultée le 01/11/2026)"
  - "https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.brevo/ (consultée le 01/11/2026)"
  - "https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.brevotrigger/ (consultée le 01/11/2026)"
  - "https://aws.amazon.com/ses/pricing/ ; https://aws.amazon.com/aup/ (consultées le 01/11/2026)"
  - "https://github.com/knadh/listmonk ; https://listmonk.app/docs/bounces/ (consultées le 01/11/2026)"
  - "C:/Users/benja/Documents/presti/lib/email.ts:1-2"
  - "C:/Users/benja/Documents/presti/docs/registre-traitements.md:146, 347"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0096_ops_socle.sql:175, 193"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0106_acquisition_echanges.sql:135"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0124_automatisme_sous_gardes.sql:290-293"
  - "C:/Users/benja/Documents/presti-notice-publication/index.html:9, 12, 17-26 (commit 1f9a8bd)"
  - "C:/Users/benja/Documents/SaaS/Decisions/Journal-Decisions.md:5, 18"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-004 — Brevo gratuit pour l'e-mail en masse

> Décision de Benj du 01/11/2026, verrouillée. La section « Décision » reprend son texte. Les chiffres de Benj ont été vérifiés sur les pages officielles de Brevo et de n8n le 01/11. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».

## Contexte

**Le besoin, selon Benj :** envoyer en masse sans coût.

**Comment Presti envoie aujourd'hui.**
- *Prospection* : du PC, par Gmail. Le plafond est de 50 premiers messages par jour depuis le 29/10 ([[Journal-Decisions]], l. 5). La tâche d'envoi `presti-envoi-prospection` est désactivée depuis le 01/11 (`plans/011-cadrage-01-11/cadrage-00-synthese.md:18` ; outil `list_scheduled_tasks`, 01/11). Les gardes d'envoi sont décrites dans [[Garde-fous d'envoi e-mail et délivrabilité]].
- *E-mails du produit* (devis, factures, relances, réponses au nom de l'artisan) : Resend, depuis le domaine `prestiapp.fr` (`lib/email.ts:1-2` ; `docs/registre-traitements.md:347`).
- *Chaîne serveur* : la base n'a pas de canal d'e-mail froid (`supabase/migrations/0096_ops_socle.sql:175`) et refuse un premier contact sur le canal `email_sollicite` (`0124_automatisme_sous_gardes.sql:290-293`).

**Le vault avait écarté Brevo pour le froid, trois fois.**
- 24/09 : Brevo interdit les listes récupérées sur internet ; il reste permis pour les conversations sollicitées ([[Ecosysteme-Prospection-Gratuite-2026-09-24]], l. 236).
- 19/10 : « Brevo : pas pour la prospection à froid » ([[Flyers-cartes-Brevo-2026-10-19]], l. 7).
- 26/10 : politique relue, « Brevo sert seulement à ceux qui ont dit oui » ([[Audit-prospection-2026-10-26]], §3.1, l. 75-85). Le même soir, le D1 de Benj écarte « Brevo pour le froid » ([[Journal-Decisions]], l. 18).

La décision du 01/11 change ce cap.

**Les chiffres de Benj, vérifiés sur les pages officielles** (consultées le 01/11) :

| Chiffre de Benj | Ce que dit Brevo | Page |
|---|---|---|
| 300 e-mails par jour, non cumulables | 300 envois par jour ; la limite se remet à zéro chaque jour ; les envois non utilisés ne passent pas au lendemain | article d'aide « FAQs - What are the limits of the Free plan? » ; FAQ de la page des tarifs en français |
| 100 000 contacts stockés | jusqu'à 100 000 contacts dans le compte | même article ; `pricing.md`, offre Free, contacts marketing inclus : 100 000 |
| 2 000 contacts uniques en automatisation | 2 000 contacts uniques au plus entrent dans les automatisations actives ; ensuite, plus aucun n'entre ; alerte à 80 % puis à 100 % | même article |
| Branding Brevo présent | tout e-mail de l'offre gratuite porte le sticker « Sent with Brevo » ; le retirer demande l'offre Starter avec l'option payante « Sans logo Brevo », ou une offre supérieure | même article ; page des tarifs en français |

**Autres limites relevées dans le même article.**
- Une campagne de plus de 300 destinataires n'atteint que 300 personnes le jour prévu ; le reste se relance à la main (option « Requeue »), 300 par jour.
- Une fois les 300 atteints, on ne peut pas programmer une campagne pour le lendemain : il faut attendre la remise à zéro.
- En transactionnel, au-delà de la limite, 1 000 e-mails au plus attendent dans une file de reprise ; au-delà, ils ne partent pas.
- L'offre gratuite n'a qu'un utilisateur.

**n8n a bien les deux nodes** (doc officielle, consultée le 01/11) :
- **Brevo** : contacts (créer, créer ou mettre à jour, supprimer, lire, lister, modifier), attributs de contact, e-mails (envoyer, envoyer un modèle), expéditeurs.
- **Brevo Trigger** : douze événements d'e-mail : bloqué, cliqué, différé, délivré, rebond dur, invalide, signalé comme spam, ouvert, envoyé, rebond doux, ouverture unique, désabonné.

**La politique anti-spam de Brevo** (Acceptable Use Policy, annexe 7 des conditions générales, §1, https://www.brevo.com/legal/antispampolicy/, consultée le 01/11) :
- les listes de contacts récupérées sur internet, acquises ou achetées sont strictement interdites, en transactionnel comme en marketing (§1.B) ;
- le consentement de chaque contact doit être actif (une case à cocher, jamais pré-cochée) et explicite ; on doit pouvoir prouver l'opt-in de chaque contact à tout moment (§1.C) ;
- tout e-mail marketing ou en masse porte un lien de désinscription facile à trouver (§1.C) ;
- un manquement peut entraîner la suspension immédiate ou la restriction du compte entier (§1.A) ;
- écrire à des contacts tirés de réseaux professionnels comme LinkedIn demande un contrôle préalable par le support (§1.E).

## Décision

Texte de Benj (addendum du 01/11, §4) — **Option A retenue : Brevo plan gratuit.**

- 300 e-mails par jour maximum, non cumulables d'un jour sur l'autre.
- 100 000 contacts stockés.
- Automatisations Brevo limitées à 2 000 contacts uniques.
- Intégration n8n native : node Brevo (contacts + envoi) + Brevo Trigger.
- Branding Brevo présent sur les e-mails.

**Règles d'usage.**
- La prospection e-mail automatique respecte le plafond de 300 par jour.
- Le workflow n8n vérifie le quota restant avant chaque campagne.
- Si le plafond est atteint, la campagne est mise en file pour le lendemain, jamais bloquée ni perdue.
- Les relances de factures et de devis clients sont dans un workflow n8n distinct de la prospection froide, pour ne pas consommer le même quota.
- Brevo Trigger capte les réponses, les rebonds et les désabonnements, et met à jour Supabase en temps réel.

**Seuil de bascule.**
- Moins de 9 000 e-mails par mois : Brevo gratuit suffit.
- Plus de 9 000 par mois, ou plus de 2 000 contacts uniques en automatisation : basculer vers Listmonk auto-hébergé sur Oracle + SES, en remplaçant seulement le node Brevo par un node HTTP Request.

Le seuil de 9 000 correspond à 300 envois par jour pendant 30 jours.

## Alternatives rejetées

- **Listmonk** : reporté. Il devient la cible au seuil de bascule.
- **Apify** et **autres** : rejetés par Benj (texte de l'ADR demandé le 01/11). Pour mémoire, le D1 du 26/10 avait déjà écarté les offres d'envoi payantes : domaines secondaires, Mailforge, Instantly ([[Journal-Decisions]], l. 18).

## Conséquences

**La file d'attente vit dans n8n et dans Supabase, pas chez Brevo.** Brevo ne programme pas une campagne pour le lendemain une fois les 300 atteints (article d'aide). La mise en file « pour le lendemain » se fait donc côté n8n, relue après la remise à zéro.

**Le workflow envoie par lots qui tiennent dans le quota du jour.** Une campagne Brevo de plus de 300 destinataires demande une relance à la main (article d'aide). Le node Brevo envoie un e-mail ou un modèle à la fois ; c'est n8n qui dose.

**Le quota restant se lit hors du node.** Le node Brevo n'a aucune opération pour lire le quota (liste des opérations, doc n8n). Le workflow comptera ses envois en base, ou interrogera l'API de Brevo par un node HTTP Request.

**Le Brevo Trigger a besoin d'une adresse publique.** C'est un webhook entrant. Le n8n d'Oracle est fermé à internet et ne se joint que par un tunnel (`CLAUDE.md:54` ; fil `SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:76`).

**Les événements rejoignent les tables existantes.** Les désabonnements et les rebonds durs vont dans la liste d'opposition `ops.opposition`, qui accepte les clés `email`, `domaine` ou `siren` (`0096_ops_socle.sql:193`). Les réponses ont leur table, `ops.reponses` (`0106_acquisition_echanges.sql:135`).

**Les gestes restent à Benj.** Créer le compte Brevo, coller la clé dans n8n, poser les enregistrements DNS du domaine d'envoi : Claude Code ne crée aucun compte et ne saisit aucune clé (addendum §7 ; `CLAUDE.md:122-123`).

**La notice et le registre doivent nommer Brevo.** La liste des prestataires de la notice publique ne contient pas Brevo (`presti-notice/index.html:17-26`). La notice dit aussi que Google envoie nos messages depuis la boîte Gmail de prospection (`index.html:18`) et que les réponses y arrivent (`index.html:12`). Le registre nomme Google pour la boîte de prospection (`docs/registre-traitements.md:146`).

**Chaque e-mail porte le sticker de Brevo.** La décision l'accepte.

## Sources et liens

- Addendum de Benj du 01/11/2026, §4 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Brevo, pages officielles consultées le 01/11/2026 : https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan · https://www.brevo.com/fr/pricing/ · https://www.brevo.com/pricing.md · https://www.brevo.com/legal/antispampolicy/
- n8n, pages officielles consultées le 01/11/2026 : https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.brevo/ · https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.brevotrigger/
- Bascule, pages officielles consultées le 01/11/2026 : https://aws.amazon.com/ses/pricing/ · https://aws.amazon.com/aup/ · https://github.com/knadh/listmonk · https://listmonk.app/docs/bounces/
- Code : `lib/email.ts:1-2` · `docs/registre-traitements.md:146`, `:347` · `supabase/migrations/0096_ops_socle.sql:175`, `:193` · `0106_acquisition_echanges.sql:135` · `0124_automatisme_sous_gardes.sql:290-293` · `CLAUDE.md:54`, `:122-123` (version de travail du 01/11).
- Notice publique : `presti-notice/index.html:9`, `:12`, `:17-26` (commit `1f9a8bd`).
- Vault : [[Journal-Decisions]] · [[Ecosysteme-Prospection-Gratuite-2026-09-24]] · [[Flyers-cartes-Brevo-2026-10-19]] · [[Audit-prospection-2026-10-26]] · [[Garde-fous d'envoi e-mail et délivrabilité]] · [[Cadre légal et notice de prospection]] · [[Registre des traitements - Presti responsable]] · [[Carte - Prospection et relation artisan]]
- ADR liés : [[ADR-001 — Toutes les automatisations dans n8n]] · [[ADR-003 — Infrastructure auto-hébergée sur Oracle]] · [[ADR-005 — Prospection e-mail automatique]]

## Points à signaler à Benj

1. **La politique de Brevo interdit l'usage prévu pour la prospection.** Nos adresses sont relevées sur les sites des artisans et dans la liste RGE de l'ADEME ; aucun artisan n'a coché de case. Brevo interdit ces listes et exige une preuve d'opt-in par contact (§1.B et §1.C). La sanction prévue est la suspension immédiate du compte entier (§1.A). Le vault l'avait conclu trois fois ; ton D1 du 26/10 écartait « Brevo pour le froid ».
2. **Un compte suspendu couperait tout ce qui passe par lui**, y compris les relances clients si elles y passent.
3. **Le quota est par compte, pas par workflow.** Deux workflows sur le même compte partagent les mêmes 300 envois par jour. Aujourd'hui, les relances clients partent par Resend (`lib/email.ts:1`), avec leur propre quota.
4. **Le Brevo Trigger ne capte pas les réponses.** La doc n8n liste douze événements ; aucun n'est une réponse. Il faudra un autre chemin pour les réponses, par exemple la lecture de la boîte qui les reçoit.
5. **Brevo exige un lien de désinscription ; la notice promet un message sans lien.** Selon la notice, le premier message ne contient ni lien ni pièce jointe (`presti-notice/index.html:9`).
6. **Sticker et white-label.** Si des e-mails envoyés au nom d'un artisan passaient par Brevo, ses clients verraient le sticker de Brevo. La règle white-label ne vise que le nom « Presti » ; le sticker montre un outil tiers.
7. **La bascule n'est pas gratuite.** Amazon SES coûte 0,10 $ pour 1 000 e-mails à la carte ; un nouveau compte AWS reçoit jusqu'à 200 $ de crédits, et l'offre gratuite dure 6 mois après la création du compte (https://aws.amazon.com/ses/pricing/). La politique d'AWS interdit aussi les e-mails de masse non sollicités (https://aws.amazon.com/aup/). Le vault l'avait noté le 24/09 ([[Ecosysteme-Prospection-Gratuite-2026-09-24]], l. 239).
8. **Remplacer « seulement le node Brevo » ne suffit pas.** Le Brevo Trigger devra aussi être remplacé. Listmonk (licence AGPL v3) traite les rebonds par une boîte POP3 ou par des webhooks, dont ceux de SES ; sa doc ne décrit aucune détection des réponses (https://listmonk.app/docs/bounces/). Le vault le notait le 24/09 ([[Ecosysteme-Prospection-Gratuite-2026-09-24]], l. 247).
