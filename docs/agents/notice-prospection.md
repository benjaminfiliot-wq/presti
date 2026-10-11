# La notice de la prospection, en ligne

Publiée le 2026-09-29 (fiche 026-162), avec le « oui » de Benj du 29/09.

- **Notice (RGPD, art. 14)** : https://benjaminfiliot-wq.github.io/presti-notice/
- **Mentions légales** : https://benjaminfiliot-wq.github.io/presti-notice/mentions-legales/
- **Dépôt public** : benjaminfiliot-wq/presti-notice, branche `main`, racine ; trois fichiers seulement : `index.html`, `mentions-legales/index.html`, `.nojekyll` (vide).
- **Commit publié** : 470a193 (2026-10-04, 13:21 UTC, notice corrigée le 04/10 : e-mails, téléphones, sources, sous-traitants, transferts) ; première version e7af6f4a28f7d67c2a931841bbd9f76a747eacc4 (2026-09-29, 21:06 UTC).
- **Hébergeur** : GitHub Pages. `NOTICE_URL` (`lib/agents/acquisition/contrat.ts`) porte l'adresse de la notice, avec sa barre finale.
- **Empreintes SHA-256 des pages servies (fins de ligne LF, lues par le juge)** : notice 921b62d72064705b3b30bf53325c3a9b13c65f5d5c5b92fb57bc7710f8ab77c4 ; mentions e127c570d22267f76481b9e0aff08f8152e03d2283f284538800e8da0ad0cb2c.

## Republier après un changement de la notice

1. Régénérer : `node scripts/notice-prospection.mjs`, puis `--verifier` (code 0).
2. Montrer le diff à Benj ; sans son « oui », rien n'est publié.
3. Copier exactement les deux fichiers (et rien d'autre) dans un clone de `presti-notice` hors du dépôt `presti`, commiter, pousser.
4. Rejuger : `node scripts/confidentialite-prospection-qa.mjs --hebergement --reel --confirmer-reel`.
5. Entre la régénération et la republication, le Facteur voit l'écart d'empreinte et ne pose plus `notice_verifiee_le` ; au-delà de 7 jours le formulaire s'arrête (`notice_perimee`) : c'est voulu.

## Renouvellement de la vérification (7 jours)

`acq_etat_envoi().notice_verifiee_le` n'est valable que 7 jours : au-delà, `acq_envoi_froid_ouvrir` refuse (`ops:notice_absente`) et le formulaire s'arrête. **Le renouvellement est automatique, sans le PC de Benj** (constaté le 05/10/2026) :

- la tâche `pg_cron` **`acq-facteur-soir`** (`0 18,19 * * *`, UTC, chaque jour) appelle la route `app/api/cron/facteur` ; sa passe du soir (`lib/agents/acquisition/facteur.ts`) lit les deux pages en ligne, compare leurs empreintes à `noticeHtml()` et `mentionsHtml()` du dépôt déployé, sans suivre de redirection, puis pose `acq_notice_verifiee` ;
- un minuteur de l'usine (`presti-facteur-soir.timer`, 20 h 05 de Paris) rejoue le jugement du Facteur ; il ne remplace pas la tâche `pg_cron` ;
- preuve du 05/10 : passage de `acq-facteur-soir` à 18:00 UTC (`succeeded`), `notice_verifiee_le` = 17:59:58 UTC.

Ce qui peut faire tomber la vérification : (1) les pages en ligne ne correspondent plus au dépôt `presti` déployé (notice régénérée sans republication, voir plus haut) ; (2) GitHub Pages en panne ou page retirée ; (3) `NOTICE_URL` à `null` ; (4) la tâche `acq-facteur-soir` inactive. Contrôle en une lecture : `select notice_verifiee_le from acq_etat_envoi()` doit dater de moins de 24 h. Aucun minuteur supplémentaire n'est nécessaire ; une alerte « vérification de plus de 36 h » à la station serait un ajout possible, à proposer à Benj avant tout travail.

## Repli

Si GitHub Pages refusait une page d'information d'entreprise, Cloudflare Pages sert les mêmes fichiers (compte gratuit à créer par Benj) ; mêmes critères, seule l'adresse change.

## Ne pas faire

Aucun script, aucune analyse d'audience, aucun domaine personnalisé, aucun lien vers prestiapp.fr sur ces pages ; ni jeton ni identifiant de connexion dans le dépôt.
