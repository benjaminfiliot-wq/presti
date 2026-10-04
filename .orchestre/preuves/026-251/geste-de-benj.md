# 026-251 — gestes restants (05/10/2026)

1. Dire « oui », geste par geste : jeton `vigile`, jeton `qualite_sites`, (jeton `tresorier` : après une graine, voir mise-en-service.md), minuteur `presti-vigile`,
   première passe du Contrôleur sur les sites livrés.
2. Créer la clé Stripe restreinte en lecture (Balance, Charges, Invoices, Subscriptions) et la donner une fois ; Claude Code la pose dans Vercel sans l'afficher.
3. Confirmer les seuils de `vigile.json` avant que la pause de sécurité ne soit en service.
Claude Code enchaîne ensuite : `usine-agents.mjs maj` + `installer vigile` (par gardien), `poser-jeton-agent vigile`, `poser-jeton-agent qualite_sites --nom=PRESTI_JETON_QUALITE`,
première passe du Vigile, puis les juges (une fois étendus : pilotage-sql-qa --migration=postes, usine-socle-qa, station-logique-qa, vigile-qa --reel).
