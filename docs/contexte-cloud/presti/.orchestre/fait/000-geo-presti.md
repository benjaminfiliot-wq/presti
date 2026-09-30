---
id: 000-geo-presti
type: feature
objectif: Rendre prestiapp.fr lisible par les IA de réponse (audit GEO du 26/09 — ChatGPT 35/100) — llms.txt au format llmstxt.org et schéma FAQPage sur l'accueil, lu à la même source que la page /faq
perimetre: [public/llms.txt, app/page.tsx, app/faq/page.tsx, lib/faq.ts, .orchestre/preuves/000-geo-presti/**]
interdit: [scripts/**, supabase/**, package.json, package-lock.json, app/robots.ts]
verifier: node scripts/geo-presti-qa.mjs
budget: { fichiers: 5, minutes: 40 }
preuve: sortie de verifier dans .orchestre/preuves/000-geo-presti/verifier.log
executant: codex
---

# 000-geo-presti — llms.txt et FAQ lisibles par les IA

## Pourquoi
L'audit GEO du 26/09 (`reprise-cloud/veille/` et `presti-ops/veille/outils/geo-audit-prestiapp.txt`) donne à prestiapp.fr **35/100 pour ChatGPT**. Les causes : pas de `llms.txt`, et pas de schéma FAQPage sur l'accueil. Les robots d'IA sont déjà autorisés, et les schémas Organization, WebSite et SoftwareApplication sont déjà là.

## Ce qu'il faut faire
1. Lis `app/faq/page.tsx`. Si ses questions et réponses sont écrites dans la page, **déplace-les dans `lib/faq.ts`** (export d'un tableau `{ question, reponse }`), puis fais-les lire par `/faq`. Son rendu et son JSON-LD ne doivent pas changer.
2. Dans `app/page.tsx`, ajoute un `<script type="application/ld+json">` **FAQPage**, construit depuis `lib/faq.ts` : les 5 à 8 questions les plus utiles à un artisan, avec `acceptedAnswer`. Garde le même échappement que `app/faq/page.tsx` (`.replace(/</g, '\\u003c')`).
3. Crée `public/llms.txt` au format llmstxt.org :
   - un titre `# Presti` ;
   - un résumé en citation `> …` : le service pour les artisans, les réponses aux demandes en moins d'une minute, **le site à 300 €, TVA non applicable** ;
   - des sections `## …` avec au moins 5 liens `https://prestiapp.fr/…` décrits : l'accueil, la FAQ, le contact, les CGU, la commande de site si elle existe (cherche la route réelle) ;
   - aucun chiffre de clients, aucun avis, aucune note ; « HT » et « TTC » sont interdits.
4. Lance `node scripts/geo-presti-qa.mjs` jusqu'au PASS. Vérifie ensuite les types par `npm run typecheck`.
5. Ne change rien d'autre dans la page d'accueil : pas de texte visible modifié.

## C'est fini quand
- `node scripts/geo-presti-qa.mjs` rend PASS depuis `fait/`.
- `npm run typecheck` rend 0.
- `/faq` affiche les mêmes questions qu'avant, et l'accueil ne change pas à l'œil.
