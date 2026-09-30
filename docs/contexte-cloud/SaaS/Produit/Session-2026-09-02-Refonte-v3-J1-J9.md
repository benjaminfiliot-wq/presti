# Session 2026-09-01/02 — Refonte v3 (moteur de sites + plateforme), J1 → J9

> Suite directe de [[Session-2026-08-31-Refonte-Site-Plateforme-Themes]]. Chantier ultra-structuré sur prompt écrit (`presti/plans/002-refonte-site-plateforme-v3.md`), fait **jalon par jalon, en autonomie**, chaque étape **testée en live** (Playwright, 0 erreur, données de test nettoyées). **Presti reste live** (Vercel : prestiapp.fr + qg.prestiapp.fr ; push `main` = déploie).

## Arbitrages Benj (avant de coder)
Indexer maintenant + domaine perso ensuite · **3D validée** (maquette d'abord puis intégration) · **6 thèmes** · formulaire plateforme en **A/B** · 1re génération de contenu **offerte**.

## Ce qui a été livré (J1 → J9, tout vérifié en live)
- **J1 — SEO / indexation** : les sites publiés sont indexables (robots conditionnel + `site_seo`), JSON-LD LocalBusiness complet, sitemap dynamique, fix des meta white-label. **J1-bis** : images en **bucket Storage** (fini le base64 en base).
- **J2/J3 — perf & archi CSS** : CSS site/plateforme séparé de la console (`/site` passé de 164 à ~38 Ko), galeries en `next/image`, motion allégée (Lenis coupé sur mobile).
- **J4 — site piloté par les données** : chaque section est activable/réordonnable (base `site_layout`), gating par formule côté serveur.
- **J5 — 6 thèmes** : Atelier / Nuit / Épuré + **Chantier / Bleu de travail / Vitrine** (validés sur maquettes avant de coder). S'appliquent au site ET à la plateforme.
- **J6 — contenu IA v2** : sections « Comment ça se passe » / FAQ (schema.org) / zone, garde-fous anti-fabrication renforcés, **1re génération offerte** (sans crédit).
- **J7 — studio « Ma page »** : l'artisan **compose sa page** (monter/descendre, afficher/masquer chaque bloc), **aperçu live** du site dans un cadre mobile, **copier le lien** + publier.
- **J8 — plateforme « machine à convertir »** : CTA collant mobile, **réassurance calculée** (délai de réponse **réel** mesuré sur 30 j, jamais inventé), **qualification silencieuse** (urgence + type de chantier → tri de l'inbox), **photo de chantier** jointe par le client (compressée, **géoloc/EXIF retirés** = RGPD), **formulaire A/B** (A complet vs B « 1 champ » avec coordonnées demandées après la 1re réponse) + mesure du taux de complétion.
- **J9 — domaine perso + 3D** :
  - **Domaine personnalisé** (offre Signature) : l'artisan branche son propre domaine (ex : `mon-entreprise.fr`) depuis /profil → ajout automatique côté Vercel + instructions DNS + vérification ; le site est servi sur son domaine (le lien Presti y redirige).
  - **Signature 3D** : **hero « matière »** = une pièce de bois travaillé qui tourne au ralenti (three.js **chargé en différé** → aucun poids ajouté, desktop uniquement, image en repli) ; **avant/après** = comparateur avec les **vraies photos** de l'artisan (curseur brut→fini, net, marche partout).

## Finitions plateforme (même session)
- **Accusé de réception** au client dès sa demande, **expéditeur = la marque de l'artisan** (pas « Presti »). Le domaine d'envoi `prestiapp.fr` était **déjà vérifié** dans Resend → c'était juste du code.
- **Mode pause** des demandes (toggle /profil) : la page l'annonce, la demande est **quand même enregistrée**, mais aucune réponse auto ni email ne part (congés / surcharge).

## Légal
- **Mentions légales** remplies avec le doc officiel INSEE/RNE : **entreprise individuelle immatriculée le 01/09/2026**, **SIREN 109 411 348**, **APE 6201Z**, **1 rue du Brouage, 17230 Marans**, TVA franchise en base (art. 293 B). → voir aussi [[../Legal/]] et [[user-benj]] (mémoire Claude).

## Blender (reporté)
Tentative de brancher **Blender via MCP** pour des rendus 3D « photo » : add-on installé mais le serveur ne tient pas sur la machine de Benj (la file de commandes se bloque → timeouts). **Abandonné, pas nécessaire** : la 3D livrée est 100 % procédurale (aucun fichier lourd, aucun Blender).

## État
**Le prompt de refonte v3 (J1 → J9) est intégralement livré et vérifié en live.** Prochain cap = **acquisition** (signer les premiers artisans) + affiner au fil des retours. Détail produit fin : mémoire Claude du projet OFM (`.claude/.../memory/` → `presti-platform-v2-masterplan`, `presti-state`).
