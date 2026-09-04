# Audit final v5 — 04/09/2026, 4 auditeurs indépendants + test des 5 secondes

> Quatre agents en lecture seule (sécurité, parcours/UX, métier IA-devis-factures, données/migrations/tests) et un test des 5 secondes sur la landing (5 personas, 1440 px et 390 px). Rapports bruts dans le scratchpad `audit/`. Ici : ce qui a été retenu, corrigé ou reporté — avec l'état à l'heure de la démo.

## Bloquants démo — tous corrigés

| # | Défaut | Source | Correctif | État |
|---|---|---|---|---|
| 1 | **Facture d'acompte « 30 % » émise à 100 % du devis, scellée** (`lib/factureDepuisDevis.ts` recopiait toutes les lignes et les totaux) — chemin exact de la démo | métier | Une ligne d'acompte par taux de TVA, au pourcentage, remise déjà appliquée ; totaux recalculés | ✅ déployé |
| 2 | **Intentions par sous-chaîne** : « je voudrais **sav**oir » → réclamation, « **panne**aux » → urgence, « im**porte**ant » → menuiserie (`lib/ai.ts` `has()`) | métier | Mot entier (pluriel toléré), début de mot pour les clés ≥ 6 lettres ; 3 tests unitaires | ✅ déployé |
| 3 | **Message du prospect mutilé** avant lecture par le modèle (`blocProspect`, classe de caractères) — trouvé le matin en regardant les captures | (moi) | Balises correctement échappées ; test « message INTACT » | ✅ déployé le matin |
| 4 | Adresse `demo-menuisier@presti-test.invalid` affichée sur le site de démo (contact, JSON-LD, page légale) — seule fuite « presti » côté client | parcours | `email_public: null`, `site_seo: false` sur le compte démo, relancé | ✅ |
| 5 | **Nav de la landing sans règle responsive** : sur 390 px, « Se connecter » et « Commencer » hors écran — aucune inscription possible depuis le header mobile | 5 s + parcours | Sous 640 px : liens et « Se connecter » masqués, le bouton principal reste | ✅ déployé |

## Sérieux — corrigés avant la démo

| # | Défaut | Source | Correctif |
|---|---|---|---|
| 6 | **Verrou des privilèges troué** : 0045 a réécrit `lock_artisan_privileges` depuis 0005 et perdu `credits`, `credits_reset_le`, `stripe_customer_id`, `stripe_subscription_id` (figés par 0007) → `update artisans set credits = 999999` passait depuis le navigateur | sécurité | **Migration 0055** (à coller : `_A_COLLER_sql_editor_0054_0055.sql`) |
| 7 | `/api/conversation/devis` action `modifier` sans plafond → un email Resend à l'artisan par appel | sécurité | Même plafond que les autres routes de conversation (6 / 5 min) + abus enregistré |
| 8 | **Règles d'automatisation sans verrou serveur** : un Essentiel écrivait sa règle (RLS) et obtenait devis auto + acompte (Signature) | données | `declencherRegles` vérifie `peut(plan, 'plateforme.regles')` |
| 9 | Modèle « Pro/Expert » réglé par l'artisan ignoré en conversation live (Haiku d'office) — le compte démo est en Pro | métier | `resolveModel(cfg.modele, plan)` transmis au flux |
| 10 | `after()` du flux + `/api/conversation/regles` du navigateur tournaient **en parallèle** → double crédit, numéro de devis brûlé | métier | Un seul chemin : la route dédiée (navigateur et tests) |
| 11 | Renvoyer un devis accepté le repassait « envoyé » → ré-acceptation → seconde facture d'acompte | métier | 409 sur un devis accepté |
| 12 | Profil déclaré (services, zone, bio, TVA, assurance) jamais transmis à l'assistant → anti-fabrication inactive, services de l'Atelier ignorés | métier | Colonnes sélectionnées et passées dans les trois routes |
| 13 | `tva_regime` non transmis au chiffrage → « TVA 0 » pour un artisan au réel | métier | Transmis (devis auto + route generer) |
| 14 | `devis.envoye_le` inexistant → « tout auto » échouait en silence | métier | Colonne ajoutée en 0055 |
| 15 | Drapeaux `plateformePilotage`/`plateformeRegles` baissés mais écrans montrés | parcours + données | Drapeaux levés (fonctions construites et testées) |
| 16 | « Atelier vous répond directement » (prénom = premier mot du nom d'entreprise) | parcours | Nom complet |
| 17 | Essai : « 1 à 3 essais » vs « 3 crédits » vs « Commencer » | parcours + 5 s | Un seul libellé : « 3 crédits offerts · sans carte », nav « Essayer gratuitement » |
| 18 | Deux titres centrés cassés même en 1440 px (`max-width:28ch` calculé sur 16 px → colonne de 251 px) | 5 s | Contrainte en `ch` sur le `h2`, bloc à 680 px |
| 19 | Le mot « IA » absent au-dessus de la ligne de flottaison | 5 s | Pastille « Assistant IA pour les artisans du bâtiment » |
| 20 | Vidéo 16/9 illisible à 340 px sur téléphone | 5 s | Sur téléphone, séquence scène par scène par défaut |
| 21 | Sitemap : clones de test indexables ; démo indexée | parcours | Comptes `@presti-test.invalid` exclus du sitemap, démo `site_seo: false` |
| 22 | Badge « Le plus choisi » sans donnée | parcours | Retiré |
| 23 | Jeton `google-site-verification` servi sur `/site` et `/p` (domaine perso) | parcours | Posé sur la landing seulement |
| 24 | Lanceur : suite « IA — unitaires » sans le hook ts-loader → toujours rouge | données | Corrigé |
| 25 | Nettoyage des comptes de test avalé (facture émise → suppression impossible, 3 comptes résiduels) | données + (moi) | 0054 `purger_compte_test` + `scripts/purger-comptes-test.mjs` |

## Mineurs corrigés
`reset-request` : jokers SQL échappés dans le motif · envoi de devis : vrai contrôle d'email · `/api/conversation/regles` : plafond par IP (30/h) · `scripts/_*.tmp.mjs` ignorés par git · tutoiement exigé dès la première phrase (persona).

## Reporté — `plans/apres-demo.md`
- **Suppression RGPD d'un compte avec facture émise** (trigger 0041) : anonymiser plutôt que supprimer ; la purge à 30 jours réessaie en silence aujourd'hui.
- **`qualifie` toujours vrai** (type de chantier retombe sur le métier) → devis chiffré dès la première réponse même sur « vous êtes disponible ? » ; à conditionner à un type détecté dans le message ou à 2 tours. Le maillon « photo requise » reste le garde-fou.
- Anti-fabrication : faux positifs (« urgence », « dépannage », « salle de bain » comptés comme prestations non déclarées) ; négations non vues.
- `acompte_pct: 30` codé en dur sur les devis auto ; messages système du fil fournis au modèle comme tours ; numéro de facture consommé avant l'insert ; CSP `unsafe-inline` (chantier nonce) ; `/api/plat-event` plafond par slug ; champs texte non bornés sur `POST /api/devis/[id]` et colonnes persona ; `POST /api/conversation` contourne `iaDoitRepondre` ; hero : réordonner (vidéo plus haut), remplacer le « 7× » HBR par un témoignage réel ; page légale de la démo : médiateur « non communiqué » en rouge (honnête, à remplir par un vrai artisan) ; 14 suites absentes du lanceur.

## Ce que les auditeurs ont vérifié sans rien trouver
Auth centrale (révocation + MFA aal2), contrôles `artisan_id` sur toutes les routes objets, webhook Stripe signé, sessions client hachées, crons fail-closed, secrets hors dépôt, RLS/GRANT des migrations 0047→0054 (rejouables, `_A_COLLER_` identiques), FK en cascade, bucket privé + URLs signées, en-têtes prod ; aucune autre occurrence de « Presti » côté client, tous les liens de la landing en 200, vidéo servie et bascule scène par scène correcte, grille identique landing/abonnement, attribution CC BY-SA en légende, pas de faute de français relevée ; `tsc` 0 erreur, `ia-unit` 99/99, `maillite` 14/14, `facturx` 30/30.

## Limite
Les navigateurs des auditeurs (intégré et Chrome) étaient hors service pendant l'audit (« Policy check temporarily unavailable ») : le parcours a été vérifié sur le HTML servi + Playwright (Chromium du dépôt) pour le test des 5 secondes, pas sur un rendu réel du navigateur intégré. **Le parcours de démo doit être rejoué à l'œil trois fois avant ce soir** (`plans/demo-parcours.md`).
