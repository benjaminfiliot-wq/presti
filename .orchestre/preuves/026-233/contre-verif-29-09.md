# 026-233 — contre-vérification du 29/09 (Claude Code ; revue-codex indisponible : quota ChatGPT épuisé jusqu'au 3/10)

Production écrite par Claude Code (Codex : QUOTA, pas de relais sur une fiche prospects). `verifier` : PASS depuis fait/ dans une copie isolée
(`verifier-isole.sh`) ; le passage direct ne tombait que sur SVR-12 « git status » à cause de fichiers d'autres chantiers apparus pendant le passage.

Quatre sabotages réversibles de la production, chacun rejoué contre `scripts/savoir-recherche-qa.mjs`, fichiers restaurés depuis une copie
(sha256 vérifiés identiques après coup) :
- lib/savoir/recherche.ts f9693910c1dca9da690e1e1dc4f6ad3c5cc86256104b59fefeaad2f969f08076
- scripts/savoir/chercher.mjs b769afff3ae1ad12d7d3ac762848700265670b2f2a9fd14df86b1c394c0bb645

| # | Sabotage | Attrapé par |
|---|----------|-------------|
| 1 | filtre de classe au retour retiré (`!classes.includes(source.classe)`) | SVR-7 et SVR-9 : douleurs reçoit des extraits prospects/interne |
| 2 | `refusDonneePersonnelle` neutralisé avant le web | SVR-6 : 4 requêtes web reçues pour une question avec adresse |
| 3 | `besoinsParReponse` 2 → 5 | SVR-1 (plafonds), SVR-6, SVR-9 (5 recherches au lieu de 2) |
| 4 | la question écrite dans `recherches-<jour>.jsonl` (chercher.mjs) | SVR-10 : clé `question` interdite dans la ligne |

(SVR-12 « git status » apparaît aussi dans les passages sabotés : bruit des autres chantiers, sans rapport avec le sabotage.)

Reste pour Benj / Claude Code : rien d'urgent. La clé Firecrawl n'est pas au coffre de l'usine (`NOMS_PERMIS`) : `--web` rend `indisponible`
sans clé ; Perplexity reste fermé (reglages.json : ni plan ni coût constatés). Aucun envoi réel, aucune dépense.
