# Triage — une seule liste, par gravité (prompt v6 §3)

> Tout ce que les huit auditeurs ont trouvé (A attaque, B conformité, C qualité, D parcours, E IA, F fiabilité, G motion, H abonnement), fusionné et dédoublonné, avec son état au 05/09 à 11 h. Registre détaillé des correctifs : `correctifs.md`. Actions humaines : liste H du `plans/journal-final.md`.

## Bloquants (5 trouvés → 5 fermés)
| Source | Défaut | État |
|---|---|---|
| B-1 | Boîte `contact@prestiapp.fr` morte sur 3 pages + Reply-To morts | ✅ `c1ffcb7` |
| B-2 | Compte facturé jamais purgé, artisan non prévenu | ✅ `c1ffcb7` (anonymisation) |
| H-1 | Portail Stripe non configuré en LIVE → résiliation impossible (500) | ✅ fait par Benj le 05/09, sondé |
| H-2 | Double abonnement possible | ✅ `cf666ca` |
| F-3 | `passages_cron` absente en prod (0057 non collée) — recoté bloquant par F pour l'alerte `cron_muet` | ✅ collée par Benj le 05/09 |

## Majeurs (54 trouvés → 52 fermés, 2 humains : DMARC H11, téléphone H16)
| Source | Défaut | État |
|---|---|---|
| B-A4 | Franchise « auto » ≠ référence de l'éditeur | ✅ `cf666ca` |
| B-A5 | N° TVA absent du PDF | ✅ `cf666ca` |
| B-A6 | Médiateur absent du devis | ✅ lot 3 |
| B-A9 | Annulation de facture sans avoir | ✅ lot 3 |
| B-B3 | Facture Stripe sans identité du client pro | ✅ `cf666ca` + pied de facture **H7** |
| B-B5/E1 | CGV : prix, TVA, public | ✅ `303a5fd` |
| B-C7 | IP des prospects lisible | ✅ lot 3 |
| B-C10 | Pas d'accord art. 28 | ✅ lot 3 |
| B-C15 | IMAP absent de la politique | ✅ `cf666ca` |
| B-D2 | Email/téléphone de l'éditeur absents (LCEN) | ✅ email publié (solde) · téléphone → **H16** |
| B-E3 | CGU non acceptées à l'inscription | ✅ `cf666ca` |
| B-E4 | Rétractation absente | ✅ `cf666ca` (information) — formulaire type et report de l'acompte : `apres-demo` |
| B-F3 | From `contact@prestiapp.fr` sur les emails white-label | ⏳ **H10** (domaine neutre) |
| C-1 | Landing 2,8 Mo sur téléphone | ✅ `303a5fd` |
| C-2 | Infos-légales indexable malgré `site_seo=false` | ✅ `cf666ca` |
| C-3 | Comparatif muet aux lecteurs d'écran | ✅ `cf666ca` |
| C-4 | Contraste 2,73:1 | ✅ `cf666ca` |
| D-1.6 | Nom/tel sans borne | ✅ code `23bfbef` + base **H1** (0058) |
| D-1.7 | Slug généré invalide | ✅ `23bfbef` |
| D-2.6 | « Hors ligne » avant Enregistrer | ✅ `23bfbef` |
| D-3.3 | Lien magique expiré muet | ✅ `23bfbef` |
| D-4.6 | `/plateforme` à 510 px sur iPhone | ✅ `23bfbef` |
| E-M1 | Expert débité 1 crédit | ✅ lot E (+ route non-flux, `4232a69`) |
| E-M2 | Assistant autonome sans verrou serveur | ✅ lot E |
| E-M3 | `qualifie` toujours vrai | ✅ lot E |
| E-M4 | Anti-fabrication : 8 cas | ✅ lot E |
| E-M5 | Pannes IA muettes, crédit perdu | ✅ lot E |
| F-1 | `signalerPanneIA` en `void` | ✅ `67f7283` |
| F-2 | Alerte perdue si l'email échoue | ✅ `67f7283` |
| F-4 | Ronde « erreurs » cassée (colonne, fenêtre) | ✅ `67f7283` |
| F-5 | Relance marquée envoyée sans partir | ✅ `67f7283` |
| F-6 | Crédits bas chaque matin | ✅ `67f7283` |
| F-7 | Emails sans borne globale | ✅ `67f7283` |
| F-8 | 34 % de rebonds (.invalid) | ✅ `67f7283` |
| F-9 | DMARC absent | ⏳ **H11** (DNS) |
| F-10 | `artisan-media` sans quota | ✅ solde (0059 → H14) |
| F-11 | Démo relancée au nom d'un artisan fictif | ✅ `67f7283` |
| F-12 | Aucune sauvegarde prouvée | ✅ solde — chiffrée, quotidienne, restauration prouvée |
| H-3 | Fin d'un ancien abonnement rétrograde l'abonné | ✅ `cf666ca` |
| H-4 | Erreur webhook → 200 (Stripe ne réessaie pas) | ✅ `cf666ca` |
| H-5 | Échecs de prélèvement non écoutés | ✅ `cf666ca` |
| H-6 | Changement d'offre impossible (0 produit au catalogue) | ✅ catalogue 29/59/99 € + portail |
| H-7 | Client d'un artisan à 0 crédit dans le silence | ✅ lot 3 |
| H-8 | Page Stripe sans 293 B ni adresse | ✅ `cf666ca` + modèle de facture posé |
| G-1.1 / 1.2 / 2.2 / 2.3 / 3.1 / 3.2 / 3.3 / 4.1 | Pause de la séquence, CTA au zoom, Lenis sous la modale, focus avant/après, tiroir mobile, focus composeur, fil live, 404 neutre | ✅ lot G |
| G-2.1 | CLS 1,05 des slides 3D (pin GSAP) | ✅ solde |
| B-A2/A7/A10-A13 | Mentions secondaires facture/devis | ✅ solde |
| B-C6/C12/C13 | Purges 12 mois / 3 ans | ✅ solde |

## Mineurs (≈ 60) — non bloquants pour la démo
- A : CSP (`script-src-attr 'none'`, nonce écarté et motivé), JSON-LD échappé → ✅ solde.
- C : favicon/apple-icon, canoniques des pages d'auth, OG des pages secondaires, liens légaux non soulignés, cibles tactiles, `/contact` sans erreur par champ, TTFB dynamique, `<img>` bruts, pas de `h1` sur infos-légales.
- D : tutoiement de l'onboarding, `retour=` perdu, `/login` sans redirection si connecté, site vide publié sans avertissement, « presti » minuscule sur Stripe.
- E : `POST /api/conversation` sans `iaDoitRepondre` ; régénération = 2ᵉ appel pour 1 crédit ; SDK sans timeout ; fondateurs sans plafond sur `/p` ; code mort (`repondreAvecOutils`, `routerModele`) ; pas de prompt caching.
- F : détection de rejeu éteinte (1/3 de l'audit v4), 14 mineurs listés dans `fiabilite.md`.
- H : fondateur pouvait s'abonner (✅ `303a5fd`), scripts dangereux (✅), idempotence webhook absente.
- G : animations infinies hors écran, CLS mobile 0,095 sur `.lp-proof`, `role=tab` sans `aria-controls`, heure lue en `aria-live` à chaque scène, `.site-shot-tag` 3,95:1 sur le thème nuit, CSS `.fs-*` orphelin.

## Ce que ce sprint ne prouve pas
- ~~Les 5 suites IA~~ → rejouées le 05/09 après-midi, toutes vertes (Haiku, < 1 €).
- Les 11 transitions d'abonnement en conditions réelles (`abonnement-e2e`) attendent **H4** (clé de test).
