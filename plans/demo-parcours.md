# Parcours de démo — à rejouer 3 fois de bout en bout, sur le compte de démonstration

> Chaque écran de ce parcours est niveau **DÉMO**. Tout le reste est TIENT ou APRÈS.
> Un écran qui accroche une fois = on le retire du parcours (drapeau) ou on le répare, jamais on « fera attention ».
> État au 04/09 13:00 — **tout est en production** (migrations 0047→0053 posées, 0054 à coller pour la purge des comptes de test). Compte de démo **Atelier du Chêne** en place.

| # | Écran | Ce qu'on montre | Ce qui doit être vrai | État |
|---|---|---|---|---|
| 1 | **Landing** `prestiapp.fr` | Le hero, la **vidéo** « Une demande arrive » (26 s, 5 captures réelles) ou la séquence scène par scène, le comparatif | Vidéo lue quand visible ; bascule scène par scène | ✅ prod (`landingVideo` levé) |
| 2 | **Offres** landing `#tarifs` / `/abonnement` | Les 3 formules, la plateforme en première ligne, domaine perso pour tous | Matrice = verrous serveur | ✅ `offres-e2e` 12/12 prod |
| 3 | **Inscription** `/signup` | Mot de passe fort, refus expliqué, fuites HIBP | Politique 12 car. + HIBP maison | ✅ `fuite-mdp` 25/25 prod |
| 4 | **Onboarding** | Nom, métier, ton | Vers la console en un clic | ✅ |
| 5 | **Console** + visite guidée | Première ouverture guidée, « Plus tard », `?` sur chaque écran | Rejouable depuis `?` | ✅ `aide-e2e` 45/45 prod |
| 6 | **Plateforme — côté client** `/p/atelier-du-chene` depuis un **téléphone** | Une vraie demande (bibliothèque en chêne), l'assistant qualifie, coordonnées demandées après la 1re réponse | Streaming, bandeau « assistant », **message lu intact** (bug du 04/09 corrigé) | ✅ recapturé après correctif |
| 7 | **Poste de pilotage** `/plateforme` | La conversation, la proposition IA, **« Je prends la main »**, la règle Réactif | 0050 en base | ✅ prod · `pilotage-e2e` à rejouer (test corrigé) |
| 8 | **Devis** depuis la conversation | Brouillon créé par la règle dès la 1re réponse, lignes sourcées, envoi en un clic | Règle Réactif sur le compte démo ; l'email du client repris à l'envoi | ✅ scène 3 capturée en prod |
| 9 | **Acceptation** côté client | « Accepter le devis », horodaté, **facture d'acompte 30 %** créée | Règle avec acompte | ✅ scène 4 capturée en prod |
| 10 | **Facture** | Scellée, numéro, mentions | Profil légal complet sur le compte démo | ✅ (FAC-2026-000x sur le compte démo) |
| 11 | **Inventaire** | Fiche matériau, fournisseurs, **recherche IA** (BA13 → Castorama, prix cité) | 0048 en base ; drapeau `inventaireRecherche` levé | ✅ prod · OCR de facture : APRÈS (drapeau baissé) |
| 12 | **Site Signature** `/site/atelier-du-chene` | Slides 3D des réalisations (escalier hélicoïdal, cuisine — CC BY-SA, attribution en légende), mots géants, contact | Photos sous licence, attribution visible | ✅ scène 5 capturée |
| 13 | **Paramètres** | Navigation gauche, abonnement & usage, sécurité (sessions, **2FA**), ⓘ partout | 0052 en base | ✅ `parametres` 70/70 · `mfa` 25/25 prod |
| 14 | **Retour aux offres** | Depuis un 🔒 → « Disponible avec l'offre Studio » | Messages uniformes `messageVerrou()` | ✅ |

## Ce qu'on NE montre PAS (drapeaux baissés ou hors parcours)
- OCR de facture (`inventaireOcr`), WhatsApp / réseaux (`canauxWhatsapp`, `canauxReseaux`), pilotage multi-règles avancé (`plateformeRegles`).
- Brico Dépôt dans la recherche fournisseurs (`web_fetch` refusé) → chercher un produit **Castorama**.
- La suppression de compte depuis les paramètres (bloquée par une facture émise — `apres-demo.md`).

## Compte de démo
`scripts/demo-captures.mjs --garder` crée ou **rafraîchit** **Atelier du Chêne** (menuisier, Signature, règle Réactif, profil légal complet, slug `atelier-du-chene`, conversations remises à zéro, mot de passe renouvelé). Identifiants dans `.demo-compte.local` (ignoré par git — jamais dans le chat ni dans ce fichier). Adresse `demo-menuisier@presti-test.invalid` : **aucun email ne part** vers cette boîte (notifications, réinitialisation) — c'est voulu, la démo se joue connecté.

## Avant de commencer, ce soir (5 min)
1. `node scripts/demo-captures.mjs --garder` → compte propre, mot de passe neuf.
2. `node scripts/purger-comptes-test.mjs` (après 0054) → plus aucun compte de test à part la démo.
3. Ouvrir `/p/atelier-du-chene` sur le téléphone, `/plateforme` sur l'ordinateur, connecté.
4. Réseau : la 1re réponse arrive en ~3 s, le devis de la règle ~20-60 s après (modèle Pro) — parler pendant ce temps, ou rafraîchir la conversation.

## Répétitions
- **R1** — heure : · compte : · accrocs :
- **R2** — heure : · compte : · accrocs :
- **R3** — heure : · compte : · accrocs :
