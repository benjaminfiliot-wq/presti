# Parcours de démo — à rejouer 3 fois de bout en bout à H24, sur un compte propre

> Chaque écran de ce parcours est niveau **DÉMO**. Tout le reste est TIENT ou APRÈS.
> « Propre » = compte créé pour la répétition, détruit après (zéro donnée de démo en base).
> Un écran qui accroche une fois = on le retire du parcours (drapeau) ou on le répare, jamais on « fera attention ».
> État au 04/09 06:50 — **rien n'est encore en production** (migrations et déploiement bloqués par le mot de passe Postgres).

| # | Écran | Ce qu'on montre | Ce qui doit être vrai | État |
|---|---|---|---|---|
| 1 | **Landing** `prestiapp.fr` | Le hero, la séquence « Une demande arrive » (5 scènes), le comparatif des offres | Séquence fluide, textes à jour, aucun onglet mort | Code ✅ · scènes 1-2 capturées, 3-5 après migrations |
| 2 | **Offres** landing `#tarifs` / `/abonnement` | Les 3 formules, la plateforme en première ligne, « qui a quoi » | Matrice = verrous serveur (`offres-e2e`) | Code ✅ · test prod ⏳ |
| 3 | **Inscription** `/signup` | Mot de passe fort, refus expliqué, fuites HIBP | Politique 12 car. (Supabase) + HIBP maison | ✅ en prod depuis le 03/09 |
| 4 | **Onboarding** | Nom, métier, ton | Vers la console en un clic | ✅ existant |
| 5 | **Console** + visite guidée | La première ouverture guide, « Plus tard » visible, `?` sur chaque écran | Rejouable depuis `?` ; `aide_vues` (0047) | Code ✅ (44/44 local) · prod ⏳ |
| 6 | **Plateforme — côté client** `/p/<slug>` depuis un **téléphone** | Une vraie demande, l'assistant qualifie (métier menuisier), photo jointe | Streaming, bandeau « assistant » | ✅ existant + IA métier |
| 7 | **Poste de pilotage** `/plateforme` | La conversation apparaît, proposition IA à valider, **« Je prends la main »** | 0050 en base | Code ✅ · prod ⏳ (`pilotage-e2e`) |
| 8 | **Devis** depuis la conversation | Brouillon créé par la règle « Réactif », prix sourcés | Règle enregistrée sur le compte démo | Code ✅ · prod ⏳ |
| 9 | **Acceptation** côté client | « Accepter le devis », horodaté, **facture d'acompte 30 %** créée | Règle avec acompte | Code ✅ · prod ⏳ |
| 10 | **Facture** | Scellée, numéro, mentions | Profil légal complet sur le compte démo | ✅ existant |
| 11 | **Inventaire** | Fiche matériau, fournisseurs + liste de départ vérifiée | 0048 en base | Code ✅ · prod ⏳ · **recherche IA : APRÈS** (drapeau baissé, ne pas montrer) |
| 12 | **Site Signature** `/site/<slug>` | Slides 3D des réalisations, mots géants, contact | **Photos réelles** (Benj / Openverse) | Code ✅ 14/14 · photos ⏳ |
| 13 | **Paramètres** | Navigation gauche, abonnement & usage, sécurité (sessions), ⓘ partout | 0052 en base | Code ✅ (49/49 local) · prod ⏳ |
| 14 | **Retour aux offres** | Depuis un 🔒 → « Disponible avec l'offre Studio » | Messages uniformes `messageVerrou()` | Code ✅ |

## Compte de démo
`scripts/demo-captures.mjs --garder` crée **Atelier du Chêne** (menuisier, Signature, règle Réactif, profil légal complet, slug `atelier-du-chene`) et le conserve. Mot de passe : réinitialisable depuis `/reset-password` (email `demo-menuisier@presti-test.invalid` → à remplacer par une vraie boîte lisible par Benj avant la démo, sinon pas de lien de réinitialisation).

## Répétitions
- **R1** — heure : · compte : · accrocs :
- **R2** — heure : · compte : · accrocs :
- **R3** — heure : · compte : · accrocs :
