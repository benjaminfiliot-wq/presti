---
type: produit
sujet: gros chantier landing DRIP + IA + crédits + email + outillage
date: 2026-08-28
---

# Session 28/08 — Landing niveau DRIP, IA++, crédits, email, outillage

## 🛠️ Déblocage majeur : « voir » le rendu (fin du travail à l'aveugle)
- Le pane navigateur intégré **ne compose pas les frames** (screenshots impossibles) tant qu'il n'est pas affiché dans la fenêtre de Benj — je ne peux pas le forcer.
- **Solution installée** : **Playwright + Chromium headless** en local. Script `scripts/shot.mjs [url] [desktop|mobile]` → capture hero + devis (dense) + relances + dashboard + tarifs, en 1440×900 ou 390×844. Je Read les PNG → je vois + j'itère. **C'est LE fix.**
- Aussi : diagnostic géométrie via `getBoundingClientRect` (détecte débordements/chevauchements sans pixels).

## 🐛 Bug « site cassé » trouvé & corrigé
- `.lp{overflow-x:hidden}` forçait `overflow-y:auto` → cassait `position:sticky` → les scènes scroll-scrub ne s'épinglaient JAMAIS (doc défilait à moitié vide). **Fix = `overflow-x:clip`** (clippe sans casser le sticky). Vérifié : 3 scènes `stickyTop:0`.

## 🎬 Landing v4 — devis animé façon DRIP (V5)
- Scènes épinglées (`app/ScrollScene.tsx`, moteur data-attributes : `data-p`, `data-anim`, `data-count`, `data-tilt` ; `--p` sur `[data-stage]`).
- **Devis** : pivot 3D dramatique (rotateY jusqu'à 52° + scale 0.8→1 + translateZ, « tourne vers toi et grossit »), **ligne de scan** qui génère, **reflet lumineux** qui balaie, **tampon « Devis PRÊT conforme »**, **halo** qui s'intensifie, gros specs (30s / TVA 10% / total qui compte / PDF).
- Scènes relances + dashboard idem. **Réponse retirée** (démo + 24/7, pas encore construit).
- **Mobile** : responsive vérifié (tilt plafonné <760px pour rester à l'écran).

## 💳 Système de crédits (précis)
- **1 crédit = 1 génération** (réponse ou devis). **Modèle Expert = 3 crédits.** **Rechargés chaque mois, non reportés.**
- Montants : **Essai 3 crédits** · **Essentiel 29€ = 80/mois** · **Studio 59€ = 250/mois** · **Signature 99€ = 600/mois**.
- ⚠️ Comptage réel des crédits = **pas encore implémenté côté serveur** (gating actuel = par `plan`). À brancher avec la facturation.

## 🧠 IA — amélioration considérable (`lib/ai.ts`)
- Nouveau moteur `analyzeLead` : intention (urgence>réclamation>RDV>prix>info) + flags (compare devis, budget serré, assurance/sinistre, copro, chantier complexe) + canal (email/tel). Réponses ultra-adaptées.
- Devis : `METIER_GUIDES` enrichis (+couverture), TVA ligne par ligne, `normalizeUnite`, note d'hypothèses garantie, parsing 5 recours. Signatures inchangées, `tsc` OK.

## ✉️ Email → prestiapp.fr (OVH) + Resend
- `lib/email.ts` FROM = **`[EMAIL_MASQUE]`**.
- Domaine déjà dans Resend mais **failed** (DNS absents). DNS à poser chez OVH (script `scripts/resend-domain.mjs`) :
  - **TXT** `resend._domainkey` = `p=MIGf…QAB` (DKIM)
  - **MX** `send` (prio 10) = `feedback-smtp.eu-west-1.amazonses.com`
  - **TXT** `send` = `v=spf1 include:amazonses.com ~all`
- Après pose → re-vérifier via l'API. Sans ça, les emails ne partent qu'à l'adresse du compte Resend (le cœur produit ne touche pas les vrais prospects).

## ✅ Aussi livré (28/08, suite)
- **Vitrine interactive click-to-play** (remplace le scroll-scrub) : onglets → la démo se joue (devis/relances/dashboard/lien/paiement). Plus de gros titres blancs. `app/FeatureShowcase.tsx`.
- **Espace connecté au design v4** : recolor global `--accent` → corail (login/dashboard/devis/outils), aurore sur pages auth, avatar sidebar corail (`.psh-ava` fin du violet `#6d4de0`). Le QG (JarvisHub) reste cyan (esthétique voulue).
- **FACTURATION** (2e fonctionnalité) : table `factures`+`factures_lignes` (migration `0006_factures.sql`, **appliquée** ; 0004 backfillée car `is_founder()` manquait en base). API `/api/factures` (POST create-depuis-devis), `/api/factures/[id]` (GET/PATCH/DELETE), `/api/factures/[id]/pdf` (variante FACTURE de `DevisPDF` : titre FACTURE + échéance + mentions facture + pénalités retard, pas de case signature). Page `/factures` (liste + PDF + marquer payée), bouton **« Créer la facture »** sur le devis, nav Factures activée. Numérotation **FAC-YYYY-NNNN** via `next_numero(_,'facture')`. **Flux testé 5/5** (`scripts/test-factures.mjs`).
- Outillage screenshots : `scripts/shot.mjs` / `shot-fs.mjs` / `shot-app.mjs` / `shot-factures.mjs` (desktop/mobile, pages authentifiées via compte test jetable).

## ⏭️ Reste
Brancher le **comptage crédits** serveur (affichage OK, décrément pas codé) · **tunnel d'abonnement** (boutons → /signup, pas de paiement de palier) · **sites web** + **réponse auto** (paliers, "bientôt") · SIRET · décision **nom** (presti.ai) · Benj : **DNS Resend chez OVH** + **reconnecter Gmail** (mail Alexandre).
