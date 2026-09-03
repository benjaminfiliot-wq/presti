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
