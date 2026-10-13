# Textes légaux du CRM — à publier quand Benj le décide

**Fichier :** `docs/rgpd-crm-textes-legaux-1310.patch` (audit RGPD du 12/10, point f). **Il n'est PAS appliqué** dans le code.

## Pourquoi c'est à part

Le patch modifie les **conditions générales** (annexe art. 28) et la **politique de confidentialité**. Une CGU qui change
doit être **annoncée aux utilisateurs** avant d'entrer en vigueur. C'est à Benj de choisir le moment : par exemple quand
le drapeau `crm` sera levé pour tous, avec un e-mail aux artisans.

Tant que le patch n'est pas appliqué, les **durées sont déjà appliquées** par la purge quotidienne (`lib/purgesRgpd.ts`,
`purgerCrm`), car elles sont dans le code (`DUREES_MOIS` de `lib/legalArtisan.ts`). Elles ne font que raccourcir la
conservation : aucune annonce n'est nécessaire pour ça.

## Ce que le patch change (4 fichiers)

1. **`lib/legalArtisan.ts`**
   - `TRAITEMENTS` : nouveau champ `personnes` (catégories de personnes) pour chaque traitement.
   - Deux traitements en plus : « Organiser et suivre vos chantiers » (36 mois après la fin ; historique 24 mois) et
     « Gestion de l'équipe » (12 mois après le départ si plus rien n'est rattaché).
   - `SOUS_TRAITANTS` : le rôle d'Anthropic est élargi à l'assistant de gestion (il lit factures, impayés, montants et
     noms de clients).
   - Ces listes s'affichent dans l'annexe des CGU **et** sur la page « Informations légales » du site de chaque artisan.
2. **`app/confidentialite/page.tsx`** : § 2 (données du CRM : chantiers, équipe, véhicules), § 4 (rôle d'Anthropic),
   § 5 (durées du CRM). Date de mise à jour : 13 octobre 2026 — **à remplacer par la date de publication**.
3. **`app/cgu/page.tsx`** (annexe art. 28) : chaque traitement affiche personnes, données, base, durée ; la nature du
   traitement cite le CRM, l'équipe et l'assistant de gestion ; durées du CRM et effacement d'une conversation.
4. **`docs/registre-traitements.md`** : nouveau § 13 (CRM, équipe, assistant de gestion, Presti sous-traitant).

## Appliquer

```
git apply docs/rgpd-crm-textes-legaux-1310.patch
npm run typecheck
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-qa.mjs
```

Ne pas lancer `scripts/purges-rgpd-e2e.mjs` pour ça : il joue la purge globale sur la base de `.env.local` (production).
Chaque nouvelle durée affichée commence par la durée appliquée (`libelleDuree(DUREES_MOIS[cle])`), comme ce script l'exige.

Vérifié le 13/10 : le patch s'applique (`git apply --check`) et le projet compile avec lui (`tsc --noEmit`).
