---
name: presti-facturation-tva
description: "Presti facture en FRANCHISE EN BASE (art. 293 B du CGI) — pas de TVA, prix affichés = montants payés ; les trois choses qui doivent bouger ensemble le jour de l'immatriculation"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-09-04T21:13:35.094Z
---

**Presti ne facture PAS de TVA.** Benjamin Filiot est entrepreneur individuel en micro-entreprise, immatriculé au RNE le 2026-09-01 (SIREN 109 411 348, code 6201Z), en **franchise en base de TVA, art. 293 B du CGI**. Il n'a **aucune immatriculation à la TVA** auprès de l'administration.

Conséquences dans le code, toutes vérifiées en production le 2026-09-04 :
- `STRIPE_TAXE_AUTO=0` sur Vercel → `app/api/subscribe/route.ts` n'envoie ni `automatic_tax`, ni `tax_behavior`, ni collecte d'adresse. Le montant annoncé est celui qui est payé.
- Les prix s'affichent **sans « HT »**, avec la mention « TVA non applicable, art. 293 B du CGI » sous chaque prix (`app/page.tsx` `.lp-tva`, `app/abonnement/page.tsx` `.abo-tva`).
- Aucune immatriculation active dans Stripe. `scripts/stripe-verifier.mjs` connaît le régime : il lit `STRIPE_TAXE_AUTO` et signale la **divergence** entre régime voulu et régime appliqué, dans les deux sens.

**L'erreur commise le 2026-09-04, à ne pas refaire.** J'ai activé le calcul de TVA et affiché « 29 € HT » parce que deux immatriculations françaises étaient déclarées dans Stripe. Elles y avaient été saisies sans exister à l'administration. Pendant quelques heures, le site annonçait « TVA non applicable » pendant que la facturation s'apprêtait à prélever 20 %. Aucun client n'avait payé, donc rien à rattraper. **Leçon : une immatriculation dans Stripe n'est qu'un réglage, elle ne prouve rien.** Vérifier le régime réel auprès de Benj avant de toucher à quoi que ce soit de fiscal, et se rappeler que collecter une TVA non due est le sens dangereux de l'erreur.

**Le jour où l'immatriculation existera, TROIS choses bougent ENSEMBLE** (une seule qui bouge = le site dit une chose, la facture une autre) :
1. Déclarer l'immatriculation dans Stripe (Taxes → Immatriculations).
2. `STRIPE_TAXE_AUTO=1` sur Vercel — le code renvoie alors `tax_behavior: 'exclusive'`, `automatic_tax`, adresse et numéro de TVA du client.
3. Reprendre les prix affichés (remettre « HT », retirer la mention 293 B) **et** `app/mentions-legales/page.tsx` (retirer l'art. 293 B, ajouter le numéro de TVA).

Outils : `scripts/stripe-franchise-base.mjs` (clôt les immatriculations, refuse d'agir si une facture existe), `scripts/stripe-session-test.mjs` (crée une vraie session puis l'expire, sans débit), `scripts/stripe-verifier.mjs` (compte, TVA, webhook, variables Vercel, refus d'un appel forgé en production).

**À faire côté Benj, jamais par moi** : le pied de page des factures Stripe doit porter la mention 293 B (Stripe → Paramètres → Factures). Et à vérifier avec son comptable : acheter des services à l'étranger (Anthropic, Vercel, Supabase, Resend) demande en principe un numéro de TVA intracommunautaire pour l'autoliquidation, **même en franchise en base** — c'est distinct de la TVA facturée aux clients.

Voir [[presti-state]], [[presti-sprint-v5]].
