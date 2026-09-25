---
name: presti-guiding-videos
description: Les checklists-guides que Benj utilise comme barres de qualité pour Presti (envoyées en vidéos/photos)
metadata: 
  node_type: memory
  type: reference
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-08-31T18:17:08.442Z
---

Benj guide le développement de Presti avec des reels de conseils SaaS/IA (talking-head, sous-titrés — le fond est dans l'audio, seuls les sous-titres/checklists sont lisibles). Frames extraites dans le scratchpad (`guidevids/`, `vids/`). Trois checklists servent de barres de qualité :

**1. Sécurité anti-hack (18 points "vibecoders getting hacked") :** creds DB exposés, .env publics, secrets en dur, auth faible, autorisation serveur manquante, accès aux données d'autrui (IDOR), permissions DB trop larges, Supabase/S3 mal configurés, routes admin non protégées, pages debug en prod, logs qui fuient des secrets, messages d'erreur verbeux, secrets dans l'historique git, secrets dans le JS frontend, contrôles côté client uniquement, validation d'entrée manquante, injection SQL/NoSQL. → **Audité (4 agents) + corrigé.**

**2. Checklist sécurité (vidéo) :** clés API dans .env, .env dans .gitignore, rate-limiting login, RLS activée, mots de passe hashés, droits vérifiés côté serveur, clé publique côté client, HTTPS partout, sessions qui expirent…

**3. Pré-lancement (20 choses avant de lancer) :** 404 perso, CTA clair, liens internes, page de remerciement, fil d'Ariane, études de cas, FAQ, promesse de délai, titres de pages uniques, méta-descriptions, images de partage (OG), vrais avis clients, alt text, schéma local, page de politique, Google Analytics… → **Fait** (sauf faux avis/études de cas : fabrication interdite, à ajouter avec de vrais clients).

**4. Nouveaux guides (31/08) — vidéos décodées via planches-contact ffmpeg :**
- **SEO** (« ça ne s'affiche pas sur Google ») : soumettre à **Google Search Console**, soumettre le **sitemap XML**, optimiser pour les **mots-clés** visés, faire les **meta titles + descriptions**.
- **Données structurées / rich results** (« perdre tes étoiles, prix, avis dans les liens bleus ») : un changement Google sur le JSON-LD schema.org peut te faire perdre les rich snippets, sans alerte.
- **Juridique/RGPD** (« ne pas se faire poursuivre avec Claude Code ») : si l'app collecte un nom/des infos → **politique de confidentialité**, consentement, disclosure de collecte, sinon risque de poursuite.
- **Design authentique** (« ton site a été fait par une IA, et ça se voit ») : éviter les tells IA — dégradé violet, glassmorphism/verre flou partout, orbes flottantes, fond à points, tirets « — » partout, grille bento générique.
- **Photo « 20 things to tell Claude before launching »** (qualité app) : onboarding, signup/login, email verification, password reset, account deletion, permissions, empty/loading/error/network states, data persistence, payment, notifications, analytics, crash reporting, privacy, accessibility, responsiveness, user flows, beta testers.
→ Audités le 31/08 (mes revues + agents audit-attaque/conformité live) : **0 faille critique**. Corrigés : reset mdp, suppression compte (RGPD), notice de collecte, mémoire agents read_only, balise Google Search Console (env). Restant : crash reporting (Sentry), SMTP Supabase→Resend, GSC à soumettre (action Benj).

**5b. Vidéos d'INSPIRATION SITE (niveau visé pour le constructeur — Benj insiste « des jours de travail », niveau agence)** :
- **« FIND »** (Enregistrement 2026-08-26 210511, « How I create cinematic websites that look unreal ») : site immobilier CINÉMATIQUE — hero sombre immersif, **mots-clés GÉANTS animés** au scroll (Buy / Sell / Rent avec flèches), imagerie plein cadre, mise en page éditoriale, transitions fluides, branding en gros.
- **« DRIP »** (Enregistrement 2026-08-27 181323, « Framerate + Claude ») : site PRODUIT premium (bouteille) — hero produit cinématique sombre, sections éditoriales fond crème avec **grands chiffres/specs** (600ml, 5000 mAh, 99%), **alternance sombre/clair**, photographie produit plein cadre, style Apple.
→ Le site Signature doit atteindre CE niveau : mots géants animés, sections éditoriales alternées avec grandes stats, plein cadre, scroll cinématique. (Autres vidéos inspiration motion : Glass Health AI 210614 = commercial SaaS glow ; 222509 = lead-gen particules.) Anti-fabrication : grandes stats seulement si vraies.

Règle Benj tirée de ces vidéos : anti-vibecoding (voir [[benj-corrections-incrementales]]) et respecter chaque point avec preuve. Voir [[presti-state]] et [[presti-platform-v2-masterplan]].
