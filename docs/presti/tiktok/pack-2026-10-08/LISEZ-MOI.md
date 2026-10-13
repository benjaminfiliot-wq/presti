# Pack Presti — 3 vidéos, 9 publications préparées

Préparé le 08/10/2026. **Non programmé, non publié.** Ce pack comprend trois créations Presti déclinées sur TikTok, Instagram Reels et Facebook Reels.

| Jour Europe/Paris | Heure | Création | Réseaux |
|---|---|---|---|
| Vendredi 09/10/2026 | 13 h | 01 — Les devis qui dorment | TikTok, Instagram, Facebook |
| Vendredi 09/10/2026 | 16 h | 02 — L’artisan en plein chantier | TikTok, Instagram, Facebook |
| Vendredi 09/10/2026 | 20 h | 03 — Excel en vrac | TikTok, Instagram, Facebook |

Les neuf fiches JSON comprennent le MP4, son SHA256, une légende adaptée, le commentaire épinglé et les heures locale/UTC (11, 14 et 18 h UTC). Le manifeste regroupe sources, preuves et réserves.

MP4 et audio : `promo-src/tiktok-chaine/sorties/pack-2026-10-08/`. Neuf fichiers `presti-XX-tiktok/instagram/facebook.mp4`, trois masters `presti-XX-voix-seule.mp4`, trois pistes `.m4a`, trois planches `contact-XX.jpg` et les logs FFmpeg. Les scripts de voix ici sont extraits des compositions existantes.

Les sources `sorties/v3/presti-XX-final-upload.mp4` durent 40,033 / 33,433 / 30,900 secondes. Images reprises sans réencodage : 1080×1920, H264 à 30 fps, AAC 192k à 48 kHz stéréo, faststart. Les bandes-son mixtes d’origine sont remplacées par les pistes originales de Benjamin, alignées aux mêmes compositions. **Aucune musique incrustée sur aucun réseau** : une licence TikTok n’est pas supposée valable sur Meta. Aucune TTS ni API payante.

Niveaux mesurés : 01 −14,78 LUFS / −4,41 dBTP ; 02 −14,70 / −4,35 ; 03 −14,48 / −4,41. La fin est complétée par du silence jusqu’à la durée de la composition. Les neuf formats, durées et empreintes sont vérifiés.

La vidéo 03 promet l’import Excel : implementation et tests locaux réels livrés, déploiement production encore à attester. Diffuser 01 et 03 après confirmation que la version est accessible aux artisans. Formats `.xlsx` et CSV ; stockage navigateur sans synchronisation ; recettes distinctes de l’encaissement : ces limites figurent dans la légende 03. La légende 02 précise que les demandes arrivent par le lien Presti partagé, sans connexion directe automatique à Google ou Facebook.

Les planches ont été vues. Une écoute humaine finale des trois masters reste nécessaire pour la validation artistique. Aucun verdict global 028-014 ni appel de publication. Le pack ne contient pas de produits TikTok Shop.

HyperFrames local indisponible (`npx --no-install`, CLI absent) : usage inconnu, aucune installation ni modification de composition. Reproduction locale : `node docs/presti/tiktok/pack-2026-10-08/preparer-pack.mjs`.

## Promesses fausses (audit du 12/10, `plans/promesses-2026-10.md`, partie C, lignes 59, 60, 64, 65)

Les fichiers `script-voix-01.txt` et `script-voix-02.txt` restent tels qu'ils ont été enregistrés (ils décrivent l'audio publié). Ces phrases sont **NO-GO** : ne plus les réenregistrer, ne pas republier la vidéo qui les porte sans décision de Benj (dépublier ou refaire : `presti-ops\JOURNAL-PLAN.md`, « À décider »).

| Script | Phrase enregistrée | Pourquoi c'est faux | Texte à dire à la place |
|---|---|---|---|
| 01, l. 5 | « Un client t'écrit sur Google ou Leboncoin ? » | Aucun branchement à Google ni à Le Bon Coin ; les règles de Le Bon Coin interdisent le lien dans une annonce. | « Un client t'écrit par ton lien Presti ? » |
| 01, l. 6 | « Réponse en quelques secondes » | Rien ne mesure ni ne garantit des secondes ; la génération est bornée à 60 s (`app/api/leads/route.ts`, `maxDuration`). | « Ta réponse est prête en moins d'une minute, avec ta façon de parler. » |
| 01, l. 7 | « Un devis reste sans réponse ? Il relance tout seul. » | Seul un devis envoyé depuis une conversation arme les relances (`app/api/devis/[id]/envoyer/route.ts`) ; un devis créé seul n'en a pas. | « Ton client ne répond plus ? Il est relancé à J+2, J+5 et J+10. » |
| 02, l. 4 | « Presti répond en quelques secondes » | Même raison que 01, l. 6. | « Presti prépare la réponse en moins d'une minute, dans le ton de l'artisan… » |
| 02, l. 5 | « il garde donc la main sur chaque message » | Les relances J+2, J+5, J+10 partent seules (`app/api/cron/relances/route.ts`), avec la mention de l'assistant. | « …il garde donc la main sur ses réponses. » |
