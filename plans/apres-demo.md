# Après la démo — niveau 3, on n'y touche pas pendant le sprint

> Tout ce qui n'est ni vu demain soir, ni nécessaire pour que rien ne casse. Chiffré quand l'audit l'a fait.

## Décidé « après » par le prompt v5 (§11)
- Jeton en cookie `httpOnly` plutôt que `localStorage` (migration `@supabase/ssr`) — 1,5 j
- Accord de sous-traitance art. 28 RGPD (rédaction) — 1 j
- Factur-X : PDF/A-3 + validation Schematron — 1 j, échéance réelle 01/09/2027
- Durées de conservation + purge — 4 h
- Bandeau cookies — seulement si un analytics est activé
- 2FA TOTP (Supabase MFA) — 2 h, reco Benj = après
- 28 lectures clientes directes vers PostgREST hors garde de révocation — 2-3 j

## Refactors (écartés par l'Annexe A pendant le sprint)
- `codebase-design`, `improve-codebase-architecture` — un refactor à J-1 est le meilleur moyen de casser ce qui marche
- `wayfinder` — c'est la v6

## Parcours client (constat du 2026-09-03)
- Bordereau de rétractation (14 j, art. L221-18 conso) — obligatoire, porté par l'artisan — ~6 h avec le médiateur (fait)
- Acceptation des CGU à l'inscription (case + trace en base) — 1 h
- Acompte payable en ligne par le client de l'artisan (Stripe Connect ou lien de paiement) — 1 j
- Email de bienvenue / document d'accueil — 2 h
- Signature électronique qualifiée des devis (au-delà de l'acceptation horodatée) — à évaluer

## Ajouts pendant le sprint
<!-- chaque chose masquée derrière un drapeau atterrit ici, avec ce qui manque pour la finir -->
- **§7 — outils de l'assistant dans la conversation en direct** : `lib/ai/outils.ts` livre `repondreAvecOutils` (6 outils, boucle tool-use, anti-fabrication étendu) et 4/4 scénarios passent — mais la route `/api/conversation/stream` n'est **pas** branchée dessus : la boucle à outils ne peut pas streamer, et la démo repose sur le streaming. À faire : un mode « outils » non-stream déclenché quand l'intention est devis/RDV/réclamation (le client voit « l'assistant vérifie… » 3-5 s), sinon streaming. ~3 h. En attendant, les règles d'automatisation (§9) couvrent « qualifié → devis brouillon ».
- **§9 — « Où en est ma demande »** (frise reçue → qualifiée → devis → accepté → planifié → terminé) côté client : les états existent (`leads.statut`, `devis.statut`), la carte n'est pas dessinée. ~2 h.
- **§9 G2 — persona et apparence avancée de la plateforme** (style d'écriture par exemples, polices, fond, avatar, amorces) : drapeau `plateformePersona` baissé ; la ligne « Personnalisation » n'apparaît pas dans la grille tant que ce n'est pas livré. ~1 j.
- **§8 F3 — assistant de recherche fournisseurs** : F1/F2 livrés, `docs/fournisseurs.md` (3 sites utilisables sans compte), signatures prêtes (`LISTE_DEPART`, `enregistrerObservation`, `POST /api/inventaire/materiaux`). Reste le moteur (`web_search` avec `allowed_domains` + `web_fetch`, tableau comparatif, « ce que je n'ai pas pu voir ») et l'écran `/inventaire/recherche`. Drapeau `inventaireRecherche` baissé. ~1 j.
- **Inventaire — ré-import CSV** : `inventaire-v2-e2e` en prod signale 2 rouges (67/69) : un ré-import du même fichier peut créer une fiche de plus au lieu de mettre à jour (upsert `onConflict artisan_id,nom,reference` vs fiche créée à la main avec `reference_fabricant`). L'import simple marche ; c'est le **second** import qui doublonne. À corriger : normaliser `reference` à la création manuelle comme à l'import (même colonne source), puis rejouer le test. ~1 h. Ne pas montrer un ré-import en démo.
- **Canaux WhatsApp / réseaux** : dans la grille cible, pas construits, drapeaux `canauxWhatsapp`/`canauxReseaux` baissés → lignes cachées.
- **Adresses neutres** (`lib/urls.ts`, middleware) : code dormant, décision Benj = pas de domaine neutre ; ⚠️ pour que « l'URL ne dit jamais presti » vaille pour tous, `site.domaine_perso` devrait descendre sur les trois offres (aujourd'hui Signature).
- **§4 B4 — animations du centre d'aide** : chaque article de `/aide` devait porter une animation courte (10-15 s, enregistrée au vrai produit via Playwright → GIF/WebM). Reporté : le centre d'aide est livré **sans animations** (texte du panneau B1 seulement). À faire : un script `scripts/aide-animations.mjs` qui rejoue chaque `commentOnSenSert` sur un compte de test et enregistre la vidéo (`recordVideo` de Playwright → WebM), puis un champ `animation?: string` sur `Article`. ~4 h.
- **§4 B5 — « Pourquoi cette proposition ? »** sur les décisions de l'IA (réponse, devis, prix) : lien qui déplie les sources (données du profil utilisées, prix et provenance, règle appliquée). Reporté : dépend des **outils de l'assistant** (§7, `consulter_prix`, `creer_devis_brouillon`…) dont la trace d'exécution est la matière première de l'explication. À faire quand §7 est stabilisé : renvoyer la trace des outils dans la réponse de `/api/conversation` et `/api/devis/auto`, puis un composant `Pourquoi.tsx` (console + carte devis côté client). ~1 j.
- **§4 B2 — info-bulles ⓘ sur `/plateforme` et `/parametres`** : les 27 textes existent dans `lib/aide.ts` (`plateforme.*`, `parametres.*`), à poser (`<Info cle="…" />` après chaque label) une fois la refonte de ces deux pages (§6, §9) terminée. ~30 min.
- **§4 B3 — visites guidées des autres surfaces** (plateforme côté artisan, éditeur de site, inventaire) : la structure `VISITES` de `app/Visite.tsx` est prête, il manque les étapes (5-7 par surface, `data-visite` sur les cibles) après leur refonte. ~1 h par surface.
- **§8 F1 — photo de facture → OCR → lignes proposées** : drapeau `inventaireOcr: false` (`lib/flags.ts`), rien dans l'interface. Ce qui manque : route `POST /api/inventaire/facture` (image → Claude vision → lignes `{nom, quantité, prix_ht, référence}` avec extrait cité), écran d'aperçu ligne par ligne (même geste que l'import CSV : rien n'est enregistré sans validation), puis `enregistrerObservation(uid, {source: 'facture', vu_le: date de la facture})` par ligne validée. Le socle est prêt : `prix_observations.source = 'facture'` et `lib/inventaire/observations.ts` acceptent déjà cette provenance. ~4 h.
- **Suppression d'un compte avec facture émise (RGPD)** — trouvé le 04/09 en purgeant les comptes de test : le trigger `factures_conservees` (0041, conservation 10 ans) fait échouer `delete artisans` dès qu'une facture est émise, et `/api/account/delete` + la purge automatique (`lib/purgeComptes.ts`) **échoueraient de la même façon sur un vrai compte** — l'artisan ne pourrait pas supprimer son compte. Trois comptes de test étaient restés en base pour cette raison (purgés via 0054, réservé aux `@presti-test.invalid`). À faire : décider le modèle « compte supprimé mais factures conservées » — anonymiser le compte (email/nom/tel/adresse remplacés, `supprime_le` posé, connexion impossible) et garder les factures rattachées à l'identité minimale exigée par le Code de commerce, plutôt que `delete`. Puis adapter `purgeComptes.ts`, la route de suppression, et un test `compte-supprime-e2e`. ~3 h.
