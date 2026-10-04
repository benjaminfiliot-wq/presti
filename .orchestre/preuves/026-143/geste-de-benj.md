# 026-143 — ce qui reste à faire (gestes de Benj), 05/10/2026

Livré par Claude Code (Sonnet), sans juge, sur l'ordre de Benj du 05/10 (~00 h). Rien n'a été installé ni posé sur l'usine,
aucun jeton créé, aucune donnée réelle touchée.

## Ce qui est livré dans le dépôt
- `app/essai-formulaire/page.tsx` : le formulaire de contact ordinaire d'essai (404 si le drapeau `essaiFormulaire` est baissé,
  `noindex`, aucun lien depuis le site).
- `app/essai-formulaire/envoi/route.ts` : l'action `POST /essai-formulaire/envoi` (hors `/api/`, pour `robots.txt`) ; elle ne garde que
  l'empreinte SHA-256 du champ `message` (un événement `essai_formulaire_recu`, agent `systeme`), 20 par jour au plus (429 au-delà),
  400 sans message.
- `lib/flags.ts` : `essaiFormulaire: true` ; `scripts/fermeture-e2e.mjs` : la ligne `essaiFormulaire` de `CARTE`.
- `envoi_froid` n'est pas touché.

## Les gestes, dans l'ordre (3 minutes de Benj, le reste est à Claude Code)
1. **(a)** dire si Oracle est bien nommé sous-traitant dans le registre des traitements et dans `/confidentialite` (sinon, attendre :
   les minuteurs ne s'installent pas avant).
2. **(b)** dire « oui » aux trois jetons d'agent : `atelier_maquettes`, `livreur_usine`, `facteur_usine`. Claude Code lance ensuite
   `node scripts/usine-coffre.mjs poser-jeton-agent <agent> --nom=<NOM>` : le jeton ne s'affiche jamais.
3. **(e)** et **(g)** dire « oui » à l'installation de Chromium arm64 et des quatre minuteurs (`presti-atelier`, `presti-livreur`,
   `presti-porteur`, `presti-export-nuit`) : Claude Code lance `node scripts/usine-agents.mjs installer atelier|livreur|porteur`.
4. **(f)** pour l'épreuve PC éteint du livreur : après `usine-production-qa.mjs --reel --epreuve=preparer`, éteindre le PC au moins
   24 h, le rallumer, puis `--epreuve=conclure`.
5. **(h)** avant le **24/10/2026** : ouvrir la console Oracle, page des coûts, dire à Claude Code si le coût prévu est 0 EUR.
   (L'inventaire `shape`/`ocpus`/disque se lit côté usine, rien à faire pour Benj.)

## Ce qui est à rejouer ensuite (par Claude Code, un jour de semaine entre 8 h et 17 h 30 de Paris)
`node --import ./scripts/ts-loader.mjs scripts/usine-production-qa.mjs --reel` puis
`node --import ./scripts/ts-loader.mjs scripts/facteur-qa.mjs --partie=porteur --reel --confirmer-reel` ; recopier les résultats dans
`mise-en-service.md`, `porteur-essai.md` et `epreuve-pc-eteint.md` de ce dossier.
