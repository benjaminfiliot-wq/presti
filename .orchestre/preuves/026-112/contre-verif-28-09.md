# 026-112 — contre-vérification indépendante (28/09)

## Moyen

D'abord tenté la relecture par Codex sur l'usine (économie de Claude), comme demandé :

```
cd presti && node ../presti-ops/usine/revue-codex.mjs 026-112 --sabotages=4
```

**Résultat : NON JUGÉ (code 125)**, avant même que le paquet parte sur l'usine — refusé par le contrôle local
(`usine.mjs executer`) pour 3 motifs qui ressemblent à des secrets, **tous hors périmètre de 026-112** :

```
✗ usine executer : contrôle du paquet, 3 problème(s) — rien n'est envoyé
  .orchestre/fait/026-069.md:42 : motif nom sensible : valeur (JSON, YAML, minuscules)
  lib/agents/llm.ts:82 : motif nom sensible : valeur (JSON, YAML, minuscules)
  scripts/vigile-qa.mjs:639 : motif URL avec identifiants (schéma://utilisateur:mot de passe@hôte)
```

`lib/agents/llm.ts` est exactement le fichier de bruit déjà signalé dans le compte-rendu de la fiche (créé par une
session concurrente, non commité, absent de HEAD) ; `.orchestre/fait/026-069.md` et `scripts/vigile-qa.mjs` sont deux
autres fichiers du dépôt, sans rapport avec `lib/packPub.ts` / `lib/packPubServeur.ts` / `lib/stripeAiguillage.ts` /
`app/api/stripe/webhook/route.ts`. Codex n'a jamais été contacté (aucun `verdict.json`, `journal.json` ni `codex.log`
dans `.orchestre/travail/revue-codex/026-112/` — seul `executer.log` existe, preuve copiée dans
`contre-verif-28-09/revue-codex-executer.log`). Conformément à la consigne de la fiche pour un code 3 ou 125, j'ai
donc fait moi-même les sabotages.

**Six sabotages réversibles de la PRODUCTION** (le maximum utile pour ce périmètre à 4 fichiers, au-delà du minimum
de 4 demandé), un par critère PP-1 à PP-6 :

1. copie du fichier ciblé dans le scratchpad (empreinte sha256 relevée **avant tout sabotage**, sur les 4 fichiers du
   périmètre, avant même de lancer Codex) ;
2. une seule modification minimale, choisie pour ne toucher qu'un seul critère ;
3. `node scripts/pack-pub-paiement-qa.mjs --partie=noyau` (le verifier exact de la fiche, jamais modifié — c'est le
   juge, interdit de sabotage) ;
4. restauration par copie depuis le scratchpad ;
5. `sha256sum` du fichier restauré, comparée à l'empreinte relevée à l'étape 1.

Aucun des 4 fichiers de production n'a été touché par `pack-pub-paiement-qa.mjs`, `webhook-muet-qa.mjs`,
`scripts/fixtures/**` ni aucun autre fichier interdit par l'en-tête de la fiche. Rien n'a été commité.

## Sabotages, critères rougis, restauration

| # | Fichier | Sabotage | Critère rougi (message exact) | sha256 restauré |
|---|---------|----------|--------------------------------|------------------|
| S1 | `lib/packPub.ts` | `ACCROCHES_PACK` amputé de `'avis_clients'` | **PP-1** — `ACCROCHES_PACK = [...7 valeurs...], [...8 valeurs...] attendu` | OK (`2d1eec2c…`) |
| S2 | `lib/packPub.ts` | `decisionEncaissement` : `return avant.stripe_session_id === session.id ? 'deja' : 'second_paiement'` → `return 'deja'` | **PP-2** — `decisionEncaissement(autre session sur une ligne déjà payée) = "deja", "second_paiement" attendu` | OK (`2d1eec2c…`) |
| S3 | `lib/stripeAiguillage.ts` | condition pack : `metadata?.type === 'pack_pub'` → `'pack_pub_x'` | **PP-3** — `aiguiller(pack) = "orphelin", "pack_pub" attendu` | OK (`31e7460c…`) |
| S4 | `app/api/stripe/webhook/route.ts` | branche `pack_pub` : `if (r === 'introuvable') throw new Error(...)` supprimé | **PP-4** — `la branche pack_pub ne lève pas d'erreur sur 'introuvable'` | OK (`2f94d606…`) |
| S5 | `lib/packPubServeur.ts` | `encaisserPackPub` : `.eq('id', packId).eq('etat', 'brouillon')` → `.eq('id', packId)` | **PP-5** — `encaisserPackPub ne met pas à jour avec .eq('etat', 'brouillon')` | OK (`649aee7d…`) |
| S6 | `lib/packPub.ts` | `billing_address_collection: 'required'` → `'auto'` | **PP-6** — `billing_address_collection = "auto", 'required' attendu` | OK (`2d1eec2c…`) |

Chaque sabotage n'a rougi **que** le critère visé — tous les autres PP restent PASS dans le même passage (journaux
complets : `contre-verif-28-09/S1-PP1.log` … `S6-PP6.log`). Le verifier exécute donc réellement le code jugé (import
et appel des fonctions par la sonde, lecture ciblée pour PP-4/PP-5), pas une simple présence de texte.

## Restauration finale et témoin

Après restauration des 4 fichiers, les empreintes sha256 sont strictement identiques à celles relevées avant le
premier sabotage :

```
2d1eec2ce7d71ee5a38702172d16bfba150f7e1141648aa608d0a313d592aadb  lib/packPub.ts
649aee7d4dd136c8506a5e008b0ae90d5900bb62e9ae17ef05f36bfcf4359c18  lib/packPubServeur.ts
31e7460c6859055eb4b9bab279f5587f1e6d79977df24281bfa078b73ddeacad  lib/stripeAiguillage.ts
2f94d606b51eb441b192c0c3a3b3f52452d93c7fce681fbcc95ac10fab6451bc  app/api/stripe/webhook/route.ts
```

Passage témoin (`contre-verif-28-09/temoin-final.log`) : **PASS**, les 7 critères PP-1 à PP-7 verts, code 0.

En plus (exigé par la fiche), recontrôle de `node scripts/webhook-muet-qa.mjs` sans aucune modification :
**PASS** (WM-1 à WM-5, code 0 — `contre-verif-28-09/webhook-muet-recheck.log`). `lib/stripe.ts` et
`lib/abonnementSync.ts` toujours identiques à HEAD (HEAD a avancé entre-temps, `0a9f78d` au lieu de `22b3864` du
premier passage — dépôt à sessions concurrentes — mais les deux fichiers d'argent restent inchangés). Aucun défaut
retrouvé ; le verdict PASS de la fiche tient.

## Conclusion

- Revue Codex sur l'usine : **NON JUGÉE** (125), rejetée au contrôle du paquet par du bruit hors périmètre
  (`lib/agents/llm.ts` notamment, déjà identifié comme tel dans le compte-rendu de la fiche) — pas un verdict sur
  026-112.
- 6 sabotages réversibles de la production (≥ 4 exigés), chacun a rougi exactement le bon critère PP, aucun n'est
  resté vert à tort.
- Restauration byte-for-byte confirmée par sha256 sur les 4 fichiers du périmètre.
- Témoin final `pack-pub-paiement-qa --partie=noyau` : PASS. `webhook-muet-qa` : PASS.
- Rien commité, rien touché hors `lib/packPub.ts`, `lib/packPubServeur.ts`, `lib/stripeAiguillage.ts`,
  `app/api/stripe/webhook/route.ts` (tous restaurés), `.orchestre/preuves/026-112/**` et `.orchestre/travail/**`.

**Verdict de la contre-vérification : VERT.**
