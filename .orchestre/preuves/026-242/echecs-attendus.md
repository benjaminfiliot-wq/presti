# 026-242 — échecs attendus du juge du Comptable (`scripts/comptable-qa.mjs --preuve-echecs`)

Généré par le juge lui-même. Verdict : **conforme**.

## (a) L'arbre courant

Module du Comptable **absent** du dépôt : code 1, premier échec **CPT-2** (attendu : CPT-2).

```
⏭ NON JUGÉ CPT-1 — non jugé : module absent (le premier échec est CPT-2)
❌ FAIL CPT-2 — module du Comptable ABSENT de /home/user/presti/.claude/worktrees/agent-a14d389d1a3715b22 (cherché : lib/direction/comptable.ts, lib/direction/comptable.mjs, lib/agents/comptable.ts, lib/agents/comptable.mjs, lib/comptable.ts, lib/comptable.mjs) — rien à rapprocher, rien n'est prouvé
⏭ NON JUGÉ CPT-3 — non jugé : module absent
⏭ NON JUGÉ CPT-4 — non jugé : module absent
⏭ NON JUGÉ CPT-5 — non jugé : module absent
⏭ NON JUGÉ CPT-6 — non jugé : module absent
⏭ NON JUGÉ CPT-7 — non jugé : module absent
⏭ NON JUGÉ CPT-8 — non jugé : module absent
```

## (b) Le témoin (référence jamais déployée)

Code 0, 8/8 critères verts.

```
✅ PASS CPT-1 — module lib/direction/comptable.mjs : 5 exports, import sans effet de bord, aucune écriture Stripe (source lu et client piégé intact)
✅ PASS CPT-2 — 10 rapprochés (1337,00 €), 2 orphelins, 1 écart (ch_08), 2 doublons comptés une fois, remboursement/échecs/annulation écartés, commandes intactes
✅ PASS CPT-3 — 60 % → ok (recette 2025, orphelin et écart ignorés) ; pile 90 % et 92 % → approche_seuil ; 101 % → seuil_depasse daté 2026-07-20 ; seuil sans date refusé ; jeu complet 133700 → ok
✅ PASS CPT-4 — T1 48000, T2 54800, année 133700 ; tva 0 ; ni réseau ni dépôt ; aucune fonction nommée declarer/payer
✅ PASS CPT-5 — gabarits légaux inchangés avant/après (empreintes), aucune écriture de fichier ni référence à un gabarit dans le source, la mention de franchise est cohérente sur ses trois emplacements
✅ PASS CPT-6 — MOTEUR_DE.comptable = codex/personnelles ; 1 demande à l'agent « comptable » sans moteur imposé ; repli fixe si moteur absent, nul, en erreur ou muet (1501 ms)
✅ PASS CPT-7 — tuile, déclaration et cumul du seuil rendent le même total au centime sur T1, T2 et l'année (48000, 54800, 133700)
✅ PASS CPT-8 — 13 ligne(s) (type + montant, ni carte ni secret) ; un second passage n'en ajoute aucune
```

## (c) 20 sabotages du témoin, chacun doit rougir son critère nommé

| sabotage | ce qu'il fait | critère attendu | rouges | verdict |
|---|---|---|---|---|
| ecriture-stripe | le module appelle stripe.refunds.create (écriture Stripe) | CPT-1 | CPT-1, CPT-2, CPT-4, CPT-7, CPT-8 | attrapé |
| declarer-par-reseau | une fonction « declarerTva » dépose par un appel réseau | CPT-4 | CPT-4 | attrapé |
| payer-impur | une fonction « payerEcheance » modifie son entrée (effet de bord) | CPT-4 | CPT-4 | attrapé |
| tva-non-nulle | preparerDeclaration rend une TVA calculée au lieu de 0 | CPT-4 | CPT-4 | attrapé |
| double-comptage | un paiement dupliqué (même id Stripe) est compté deux fois | CPT-2 | CPT-2, CPT-3, CPT-4, CPT-7 | attrapé |
| ecart-absorbe | l'écart d'un centime est absorbé : le paiement est compté comme rapproché | CPT-2 | CPT-2, CPT-3, CPT-4, CPT-7 | attrapé |
| commande-corrigee-seule | l'écart est « corrigé » en réécrivant la commande | CPT-2 | CPT-2, CPT-4, CPT-7, CPT-8 | attrapé |
| orphelin-en-recette | un paiement orphelin est aussi compté en recette rapprochée | CPT-2 | CPT-2, CPT-3, CPT-4, CPT-7 | attrapé |
| seuil-sans-alerte | le seuil est dépassé sans aucune alerte (état toujours « ok ») | CPT-3 | CPT-3 | attrapé |
| alerte-trop-tardive | l'alerte d'approche ne se déclenche plus qu'à 99 % au lieu de 90 % | CPT-3 | CPT-3 | attrapé |
| seuil-sans-date | un seuil sans source datée est accepté | CPT-3 | CPT-3 | attrapé |
| libelle-gratuit | la demande de libellé désigne le moteur gratuit freellmapi | CPT-6 | CPT-6 | attrapé |
| libelle-bloquant | plus de délai de garde : un moteur muet bloque le libellé | CPT-6 | CPT-6 | attrapé |
| table-moteur-cloud | MOTEUR_DE.comptable passe de codex à freellmapi | CPT-6 | CPT-6 | attrapé |
| deux-chemins-deux-totaux | le total de la tuile ajoute les orphelins, celui de la déclaration non | CPT-7 | CPT-7 | attrapé |
| mention-changee-seule | la mention des CGU est changée seule : les deux autres emplacements gardent l'ancienne | CPT-5 | CPT-5 | attrapé |
| mention-facture-seule | la mention du gabarit de facture est changée seule | CPT-5 | CPT-5 | attrapé |
| ecriture-gabarit | le module réécrit le gabarit de facture (mention de TVA modifiée par un agent) | CPT-5 | CPT-5 | attrapé |
| journal-non-idempotent | un second passage sur le même jeu duplique les lignes du journal | CPT-8 | CPT-8 | attrapé |
| journal-numero-carte | un numéro de carte se retrouve dans la ligne de journal | CPT-8 | CPT-8 | attrapé |

## Limites

Un test vert ne prouve que ce qu'il regarde : ces sabotages prouvent que le juge sait rougir sur ces fautes-là, dans le contrat qu'il exerce (en-tête de `scripts/comptable-qa.mjs`) ; ils ne prouvent rien du module de 026-243 ni de son branchement réel.
