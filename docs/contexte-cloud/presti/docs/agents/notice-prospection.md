# La notice de la prospection, en ligne

Publiée le 2026-09-29 (fiche 026-162), avec le « oui » de Benj du 29/09.

- **Notice (RGPD, art. 14)** : https://benjaminfiliot-wq.github.io/presti-notice/
- **Mentions légales** : https://benjaminfiliot-wq.github.io/presti-notice/mentions-legales/
- **Dépôt public** : benjaminfiliot-wq/presti-notice, branche `main`, racine ; trois fichiers seulement : `index.html`, `mentions-legales/index.html`, `.nojekyll` (vide).
- **Commit publié** : e7af6f4a28f7d67c2a931841bbd9f76a747eacc4 (2026-09-29, 21:06 UTC).
- **Hébergeur** : GitHub Pages. `NOTICE_URL` (`lib/agents/acquisition/contrat.ts`) porte l'adresse de la notice, avec sa barre finale.
- **Empreintes SHA-256 des pages servies (fins de ligne LF, lues par le juge)** : notice 6c3ae8152eb0fb2b41187881739244256bd1b10adebe222af71733c51a573166 ; mentions e127c570d22267f76481b9e0aff08f8152e03d2283f284538800e8da0ad0cb2c.

## Republier après un changement de la notice

1. Régénérer : `node scripts/notice-prospection.mjs`, puis `--verifier` (code 0).
2. Montrer le diff à Benj ; sans son « oui », rien n'est publié.
3. Copier exactement les deux fichiers (et rien d'autre) dans un clone de `presti-notice` hors du dépôt `presti`, commiter, pousser.
4. Rejuger : `node scripts/confidentialite-prospection-qa.mjs --hebergement --reel --confirmer-reel`.
5. Entre la régénération et la republication, le Facteur voit l'écart d'empreinte et ne pose plus `notice_verifiee_le` ; au-delà de 7 jours le formulaire s'arrête (`notice_perimee`) : c'est voulu.

## Repli

Si GitHub Pages refusait une page d'information d'entreprise, Cloudflare Pages sert les mêmes fichiers (compte gratuit à créer par Benj) ; mêmes critères, seule l'adresse change.

## Ne pas faire

Aucun script, aucune analyse d'audience, aucun domaine personnalisé, aucun lien vers prestiapp.fr sur ces pages ; ni jeton ni identifiant de connexion dans le dépôt.
