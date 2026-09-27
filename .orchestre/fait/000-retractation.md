---
id: 000-retractation
type: feature
objectif: Mettre la commande du site à 300 € en conformité avec le droit de rétractation des petites entreprises (L221-3 et L221-28 du Code de la consommation) — case de renoncement exprès non cochée et obligatoire, refus serveur sans accord, accord horodaté dans Stripe, section CGU avec le modèle de formulaire
perimetre: [app/site/commander/page.tsx, app/api/site/commander/route.ts, app/cgu/page.tsx, .orchestre/preuves/000-retractation/**]
interdit: [scripts/**, supabase/**, package.json, package-lock.json, lib/stripe*, app/api/stripe/**]
verifier: node scripts/retractation-qa.mjs
budget: { fichiers: 4, minutes: 45 }
preuve: sortie de verifier dans .orchestre/preuves/000-retractation/verifier.log
executant: codex
---

# 000-retractation — droit de rétractation sur la commande du site

## Pourquoi
Le cadre légal établi le 27/09 (`reprise-cloud/docs/` et `SaaS/Produit/Prospection-Cadre-Legal-2026-09-27.md`) s'appuie sur deux articles du Code de la consommation :
- **L221-3** : un artisan de **5 salariés ou moins** qui signe à distance un contrat hors du champ de son activité principale est protégé comme un consommateur. Il dispose de **14 jours de rétractation**.
- **L221-28 1°** : comme le site est livré en 48 h, avant la fin de ces 14 jours, le client doit **demander expressément** que la réalisation commence tout de suite, et **reconnaître** qu'il perd son droit de rétractation une fois le service entièrement exécuté.

Aujourd'hui, ni la page de commande ni les CGU n'en parlent.

## Ce qu'il faut faire
1. **Page (`app/site/commander/page.tsx`).**
   - Ajoute un état `renonciationRetractation` qui vaut `false` au départ, et une case à cocher avec ce texte exact : « Je demande que Presti commence la réalisation de mon site avant la fin du délai de rétractation de 14 jours, et je reconnais perdre mon droit de rétractation une fois le site entièrement livré (article L221-28 du Code de la consommation). »
   - Mets juste au-dessus une phrase courte sur le droit de rétractation (14 jours pour les entreprises de 5 salariés ou moins), avec un lien vers `/cgu#retractation`.
   - Le bouton de paiement reste désactivé tant que la case n'est pas cochée.
   - Envoie `renonciationRetractation` dans le corps du POST vers `/api/site/commander`.
2. **Route (`app/api/site/commander/route.ts`).**
   - Lis `renonciationRetractation` dans le corps. S'il ne vaut pas exactement `true`, réponds 400 avec un message clair, avant tout appel à Stripe.
   - Ajoute `retractation_accord: new Date().toISOString()` aux deux `metadata` (la session et le `payment_intent_data`).
   - Ne change rien d'autre au paiement.
3. **CGU (`app/cgu/page.tsx`).** Ajoute, après la section « 3 bis », une section `<h2 id="retractation">3 ter. Droit de rétractation (site à la demande)</h2>` qui dit :
   - qui en bénéficie (L221-3) et le délai de 14 jours ;
   - le renoncement exprès pour un site livré avant 14 jours (L221-28) ;
   - si le client se rétracte après le début de la réalisation, le paiement au prorata du travail fait (L221-25) ;
   - comment exercer ce droit : par mail, à l'adresse de contact de la page.
   - Donne ensuite le **modèle de formulaire de rétractation** (annexe à l'article R221-1) : « À l'attention de … : Je/Nous vous notifie/notifions par la présente ma/notre rétractation du contrat portant sur la prestation de services ci-dessous… Commandé le … Nom … Adresse … Date … ».
4. Lance `node scripts/retractation-qa.mjs` jusqu'au PASS, puis `npm run typecheck`.
5. Ne touche à rien d'autre. Pas de « HT » ni de « TTC » : c'est « TVA non applicable, art. 293 B du CGI ».

## C'est fini quand
- `node scripts/retractation-qa.mjs` rend PASS depuis `fait/`.
- `npm run typecheck` rend 0.
- Sans la case cochée, aucun appel à Stripe ne part : la route rend 400.
