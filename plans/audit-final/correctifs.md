# Registre des correctifs — audit final (prompt v6 §5)

> Une ligne par défaut corrigé : test rouge → correctif → test vert en prod → commit. Aucun appel IA.
> Suites : `seo-e2e`, `purge-comptes-e2e`, `audit-final-e2e` (56 points), `ia-unit-e2e` (111), `regles-verrou-e2e` (8), `facturation-e2e` (35).

| # | Source | Gravité | Défaut | Test rouge | Correctif | Vert | Commit |
|---|--------|---------|--------|------------|-----------|------|--------|
| 1 | B | bloquant | `mailto:contact@prestiapp.fr` (boîte inexistante) sur CGU, FAQ, confidentialité + 2 Reply-To morts | `seo-e2e` §2 bis : 3 ❌ | liens vers `/contact` ; Reply-To par défaut | 32/32 prod | `c1ffcb7` |
| 2 | B | bloquant | purge à J+30 avalait le refus de `factures_conservees` : compte facturé jamais effacé | `purge-comptes-e2e` : 9/18 ❌ | effacement / anonymisation, erreurs remontées, accès banni, Stripe annulé, récapitulatif honnête | 18/18 | `c1ffcb7` |
| 3 | H | bloquant | second abonnement possible (29 + 59 €/mois), ancien id écrasé | `audit-final` : 200 + URL Stripe | 409 + renvoi portail ; `/abonnement` suit | ✅ prod | `cf666ca` |
| 4 | B-A4 | majeur | franchise « auto » citait le CIBS, Presti le 293 B | `audit-final` | « auto » = 293 B tant que la tolérance dure | ✅ | `cf666ca` |
| 5 | B-A5 | majeur | n° TVA de l'artisan absent du PDF | `audit-final` (buildPdfData) | ligne « N° TVA intracommunautaire » | ✅ | `cf666ca` |
| 6 | B-E3 | majeur | CGU non acceptées à l'inscription | `audit-final` (HTML /signup) | case obligatoire, date + version en métadonnées auth | ✅ prod | `cf666ca` |
| 7 | B-C15 | majeur | messagerie IMAP absente de la politique | `audit-final` | collecte + finalité décrites | ✅ prod | `cf666ca` |
| 8 | B-E4 | majeur | rétractation jamais mentionnée | `audit-final` | L. 221-18/25/28 à l'acceptation et sur le devis | ✅ | `cf666ca` |
| 9 | B-B3 | majeur | facture Stripe sans identité du client pro | code | adresse + n° TVA collectés, pied de facture posé sur le client | ✅ | `cf666ca` |
| 10 | C-2 | majeur | infos-légales indexable malgré `site_seo=false` | `audit-final` (noindex) | robots dérivés de `site_active`/`site_seo` | ✅ prod | `cf666ca` |
| 11 | C-3 | majeur | comparatif muet aux lecteurs d'écran | `audit-final` | `role="img"`, `tabIndex` + région | ✅ prod | `cf666ca` |
| 12 | C-4 | majeur | contraste 2,73:1 | `audit-final` (calcul) | `--faint` 4,9:1 | ✅ | `cf666ca` |
| 13 | H | majeur | fin d'un ancien abonnement rétrogradait l'abonné | `audit-final` (concerneAbonnementCourant) | comparaison à l'id en base | ✅ | `cf666ca` |
| 14 | H | majeur | échec de prélèvement non écouté ; erreur webhook → 200 | `audit-final` | `invoice.payment_failed` → alerte ; erreur → 500 + email | ✅ | `cf666ca` |
| 15 | C-1 | majeur | landing 2,8 Mo sur téléphone | `audit-final` (WebP, HEAD) | WebP, 2 scènes montées | ✅ prod | `303a5fd` |
| 16 | B-B5/E1 | majeur | CGV sans prix/TVA/public | `audit-final` | CGU §3 : pros, prix, 293 B | ✅ prod | `303a5fd` |
| 17 | H | mineur | fondateur peut s'abonner ; scripts dangereux | `audit-final` (403) | 403 ; `_DANGER_` + argument obligatoire ; script mort supprimé | ✅ prod | `303a5fd` |
| 18 | B-A9 | majeur | facture « annulée » d'un clic, sans avoir | `audit-final` (PATCH 409, POST avoir) | `POST /api/factures/[id]/avoir`, 381, PDF « AVOIR » | ✅ prod | lot 3 |
| 19 | B-A6 | majeur | médiateur absent du devis | `audit-final` | mention L. 616-1 sur le devis | ✅ | lot 3 |
| 20 | B-C7 | majeur | IP des prospects lisible en clair | `audit-final` (ipPseudonyme) | empreinte salée, absente de l'export | ✅ | lot 3 |
| 21 | B-C10 | majeur | pas d'accord art. 28 | `audit-final` (HTML /cgu) | annexe générée depuis le registre | ✅ prod | lot 3 |
| 22 | H | majeur | chat muet à 0 crédit | `audit-final` | `raison: 'credits'` + note dans le fil | ✅ | lot 3 |
| 23 | E-M1 | majeur | Expert débité 1 crédit | `audit-final` | tarif du modèle servi | ✅ | lot E |
| 24 | E-M2 | majeur | assistant autonome sans verrou serveur | `audit-final` | `peut(plan, 'plateforme.ia.auto')` → assisté | ✅ | lot E |
| 25 | E-M3 | majeur | `qualifie` toujours vrai | `regles-verrou` +2, `ia-unit` +2 | qualification par le message | 8/8, 111/111 | lot E |
| 26 | E-M4 | majeur | filtre anti-fabrication : 8 cas | `ia-unit` +10 (rouge 4) | mots génériques retirés, verbe d'engagement, négation locale, métier implicite | 111/111 | lot E |
| 27 | E-M5 | majeur | pannes IA muettes, crédit perdu | `audit-final` | `signalerPanneIA` ×6, `rendreCredit` | ✅ | lot E |
| 28 | D-1.7 | majeur | slug généré invalide | `audit-final` (slugBase) | ≤ 40, sans tiret de bord | ✅ | `23bfbef` |
| 29 | D-1.6 | majeur | nom/tel sans borne | `audit-final` (insert 371) | maxLength + migration 0058 (check) | ⏳ H1 (0058 à coller) | `23bfbef` |
| 30 | D-3.3 | majeur | lien magique expiré muet | `audit-final` | message `role="alert"` | ✅ | `23bfbef` |
| 31 | D-4.6 | majeur | /plateforme à 510 px | `audit-final` (CSS) | onglets défilants | ✅ | `23bfbef` |
| 32 | D-2.6 | majeur | « hors ligne » avant Enregistrer | `audit-final` | libellé suit l'état enregistré | ✅ | `23bfbef` |
| 33 | F-1 | majeur | `signalerPanneIA` en `void` avant `return` | `audit-final` (grep) | `await` sur les 10 sites + trace app_errors | ✅ | `67f7283` |
| 34 | F-2 | majeur | alerte perdue 24 h si l'email échoue | `audit-final` | consignée dans app_errors (second canal) | ✅ | `67f7283` |
| 35 | F-4 | majeur | ronde « erreurs » : colonne inexistante, fenêtre 10 min | `audit-final` | colonne `contexte`, 24 h glissantes, seuil 10 | ✅ | `67f7283` |
| 36 | F-5 | majeur | relance marquée envoyée sans être partie | `audit-final` | `envoi.ok` vérifié, relance laissée due | ✅ | `67f7283` |
| 37 | F-6 | majeur | crédits bas : email chaque matin | code | clé mensuelle par seuil | ✅ | `67f7283` |
| 38 | F-7 | majeur | aucune borne globale d'emails | `audit-final` | plafond `emails:jour` (80), critiques exemptés | ✅ | `67f7283` |
| 39 | F-8 | majeur | 34 % de rebonds (adresses .invalid) | `audit-final` (sendEmail) | `.invalid` jamais envoyé | ✅ | `67f7283` |
| 40 | F-11 | majeur | démo relancée au nom d'un artisan fictif | `audit-final` | pas de relance pour un fondateur | ✅ | `67f7283` |
| 41 | F-9 | majeur | DMARC absent, `rua` vers boîte morte | — | script corrigé ; enregistrement DNS = **H11** | ⏳ H11 | `67f7283` |
| 42 | G-1.1 | majeur | séquence sans commande de pause | `audit-final` (aria-pressed) | bouton pause/lecture | ✅ | lot G |
| 43 | G-1.2 | majeur | CTA coupé à 200 % de zoom | `audit-final` (CSS 760) | repli des liens dès 760 px | ✅ | lot G |
| 44 | G-2.2 | majeur | visionneuse : la molette défile la page derrière | `audit-final` | `lenis.stop()/start()` | ✅ | lot G |
| 45 | G-2.3 | majeur | focus invisible sur le curseur avant/après | `audit-final` | anneau sur le bouton visible | ✅ | lot G |
| 46 | G-3.1 | majeur | tiroir mobile sans dialog/Échap/inert | `audit-final` | aria-expanded, dialog, focus, Échap, inert | ✅ | lot G |
| 47 | G-3.2 | majeur | focus du composeur imperceptible | `audit-final` | anneau 2 px | ✅ | lot G |
| 48 | G-3.3 | majeur | fil sans région live | `audit-final` | `role="log" aria-live` | ✅ | lot G |
| 49 | G-4.1 | majeur | 404 Presti sous les adresses d'artisan | `audit-final` (404 prod) | attrape-tout `[...reste]` | ✅ prod | lot G |
| 50 | G-2.1 | majeur | CLS 1,05 des slides 3D | — | sticky + scrub (1 h 30) | 📋 `apres-demo` | — |
| 51 | F-12 | majeur | aucune sauvegarde | `restaurer --aller-retour` 7/7 | sauvegarde chiffrée quotidienne + restauration prouvée | ✅ | solde |
| 52 | F-10 | majeur | `artisan-media` sans quota | `quota-media-e2e` | `/api/media`, plafond par offre, mesure réelle, 0059 | ✅ (0059 → H14) | solde |
| 53 | B-C6/C12/C13 | majeur | purges 12 mois / 3 ans jamais appliquées | `purges-rgpd-e2e` | `lib/purgesRgpd.ts` + cron + 0060 | ✅ | solde |
| 54 | B-A2/A7/A10-A13 | majeur | mentions secondaires facture/devis | `facturation-e2e`, `facturx-e2e` | PDF + Factur-X + formulaire type de rétractation | ✅ | solde |
| 55 | G-2.1 | majeur | CLS 1,05 des slides 3D | `motion-cls-e2e` | sticky + scrub, overflow clip | ✅ | solde |
| 56 | promesse 16 | majeur | relances sans suite | `relances-e2e` (nouvelle) | — | ✅ | solde |
| 57 | promesse 13 | majeur | domaine perso sans suite | `domaine-perso-e2e` (nouvelle) | middleware : `domaine_verifie`, attrape-tout ; 0061 + 409 | ✅ | solde |
| 58 | A mineurs | mineur | CSP `unsafe-inline`, JSON-LD | `seo-e2e` | `script-src-attr 'none'` (nonce écarté, motivé) ; échappement | ✅ | solde |
| 59 | C mineurs | mineur | favicon, canoniques, OG | `seo-e2e` | icônes, layouts par page | ✅ | solde |
| 60 | B-D2 | majeur | email de l'éditeur absent (LCEN) | `legal-e2e` | alias publié ; téléphone → H16 | ✅ partiel | solde |
| 61 | promesse 21 | majeur | support prioritaire sans engagement | `legal-e2e` | article « Support et assistance », délais par offre | ✅ | solde |
| 62 | F-5b | majeur | budget IA muet sans clé admin | `alertes-e2e` | rappel hebdomadaire + estimation | ✅ | solde |

## Reste (décision humaine ou dashboard) — voir la liste H du journal
- H-bloquant 1 : configuration du **portail Stripe** en LIVE (tableau de bord, 15 min) — sans elle, `POST /api/stripe/portail` rend 500.
- B-D2 : email et téléphone de l'éditeur dans les mentions légales (LCEN) — dépend d'une boîte qui fonctionne (contact@ morte) ou d'un choix d'adresse.
- B-F3 : domaine d'envoi sans « presti » (white-label des emails) — achat/vérification d'un domaine neutre.
- H7 : pied de facture Stripe (modèle de facture, mention 293 B) pour la PREMIÈRE facture d'un abonnement.
- F-3 `passages_cron` (H1), F-10 quota `artisan-media` (politique de stockage, `apres-demo`), F-12 sauvegardes (H12).
- Chiffrés `apres-demo` : A2/A7/A10-A13 (mentions facture/devis), C6/C12/C13 (purges 12 mois / 3 ans), A-CSP nonce, JSON-LD.
