# 026-090 — contre-vérification du 29/09 (Claude Code)

## Ce qui a été produit
`lib/agents/acquisition/metaWebhooks.ts` (signature, lecture des corps, aimant, rangement, lecteur de profil, magasin de production) et `app/api/webhooks/meta/route.ts` (GET de vérification, POST fermé). Juge officiel `meta-webhooks-qa` : PASS (MW-1 à MW-9), via `verifier-final.mjs` sur l'usine.

## Points de conception relus (écarts assumés avec la lettre de la fiche)
1. **Un doublon ne s'arrête pas net** : la boîte d'arrivée (`acq_meta_evenement_enregistrer`) est écrite d'abord, mais toutes les étapes suivantes sont idempotentes ; si la première livraison tombe en erreur après la boîte (500, Meta réessaie), la seconde ne doit pas être perdue, surtout un STOP.
2. **STOP posé avant la réponse reçue** (et non après) : l'opposition ne dépend pas de la réussite du rangement du texte.
3. **Aucun texte ni pseudo dans `ops.meta_evenements`** (`charge` = type, plateforme, id, date) : rien ne marque ces lignes « traitées », donc rien ne les purge ; le texte vit dans `ops.reponses`, avec sa propre durée de vie.
4. **Jauge du profil** : `consommerJauge(…, 'instagram_api')` (heure, 026-064) puis le plafond du jour `jaugeConsommer('instagram_api', 1)` ; l'une ou l'autre pleine → aucun appel (le juge pose la jauge `instagram_api` à 0).
5. **Identifiant de conversation** : `plateforme:meta_id` en local, traduit en uuid par `creerMagasinMeta` (la base range par `(plateforme, meta_id)`, et `magasinSupabase.enregistrerConversation` ne rend pas l'uuid, fichier interdit). Un commentaire ordinaire n'ouvre aucune conversation.
6. **Le jeton du profil** part dans l'en-tête `Authorization`, jamais dans l'adresse.
7. **`verifierSignature` en tête du fichier, sans commentaire avant elle** : `corpsDeFonction` du juge (MW-2) découpe le source AVEC commentaires aux indices du source SANS commentaires ; tout commentaire avant la fonction décale la fenêtre et fait manquer `timingSafeEqual`. Défaut du juge, non corrigeable ici (`scripts/*-qa.mjs` interdit) : à corriger un jour côté juge.
8. **`HOTE_META` / `VERSION_GRAPH` redits localement** : `envoiMeta.ts` (026-089) n'est pas encore dans HEAD ; l'importer aurait fait refuser le commit par la garde des imports.

## Sabotages réversibles de la production (sha256 restaurés, résultat lu)
| # | sabotage | verdict du juge | restauration |
|---|---|---|---|
| 1 | `metaWebhooks.ts` : `timingSafeEqual` remplacé par `===` sur les hexadécimaux | FAIL MW-2 | sha256 identique (de19017dc63c…) |
| 2 | `route.ts` : le refus 401 sur signature fausse retiré | FAIL MW-4 (et MW-1, MW-9) | sha256 identique (5e56539ff815…) |
| 3 | `metaWebhooks.ts` : `estAimant` passe à `startsWith('site')` (« sites web pas chers » devient un aimant) | FAIL MW-5 (et MW-9) | sha256 identique (de19017dc63c…) |
| 4 | `metaWebhooks.ts` : la garde « profil déjà lu » retirée (un second appel au profil) | FAIL MW-7 (et MW-9) | sha256 identique (de19017dc63c…) |
| témoin | production restaurée | PASS (MW-1 à MW-9) | — |

Scripts : `.orchestre/travail/026-090-debug/sab.mjs` et `sab3.mjs`.

## Ce qui reste à Benj (R6, aucun envoi ici)
- Lier une Page Facebook à @prestiapp, vérification d'entreprise, accès avancé (commentaires, messagerie, réponses privées) ; poser `META_APP_SECRET` et `META_PAGE_TOKEN` dans Vercel ; `META_WEBHOOK_VERIFY_TOKEN` (valeur tirée au hasard) et `META_IG_ID` seront posés par Claude Code après son « oui » ; déclarer `https://prestiapp.fr/api/webhooks/meta` chez Meta. Sans `META_APP_SECRET`, la route répond 503 (fermée).
- Le build Vercel et `curl -X POST https://prestiapp.fr/api/webhooks/meta` (503 ou 401 attendu) après le push : `node scripts/deploiement-etat.mjs`.
