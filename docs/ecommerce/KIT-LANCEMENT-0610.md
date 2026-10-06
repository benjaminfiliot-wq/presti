# Kit de lancement e-commerce — prêt à publier (06/10/2026, soir)

Complète `STRATEGIE-ECOM-0610-SOIR.md` (produits, prix, marges, fournisseurs mesurés). Décision de Benj ce soir : **le format A (photo fixe de Léa) est rejeté** (« affreux ») ; **on part sur le format B** (présentation animée, photos réelles du produit). Une influenceuse IA ne reviendra qu'en VIDÉO animée (modèle vidéo d'Alexya, crédits à recharger), jamais en photo fixe.

Les rendus du 4 B local de l'écosystème (`superviseur-2026-10-06-v3-*`) ont été relus : accroches gardées après retrait des durées non prouvées ; calendrier (mauvais produits) et réponses aux acheteurs (contraires à la garantie légale) **réécrits ici**.

## 1. Accroches (2 premières secondes, sans chiffre non prouvé)
**Aspirateur de voiture sans fil**
- « Ta voiture est pleine de miettes ? »
- « Pas de fil ? Pas de problème. »
- « Rechargeable. Sans fil. Sans prise à chercher. »
- « Aspirez, rechargez, repartez. »
- « Le truc qui vit dans ma boîte à gants. »
**Nettoyeur haute pression sans fil**
- « Terrasse sale ? C'est fini. »
- « Vélo plein de boue ? Un coup de pression. »
- « Pas de câble. Pas de tuyau d'arrosage à brancher. »
- « Un seau d'eau et c'est parti. »
- « Le nettoyeur qui tient dans le coffre. »

## 2. Vidéos format B (présentation animée, voix off) — environ 16 s
Fabriquées par la chaîne `promo-src/tiktok-chaine/` (README : la méthode complète ; sur l'usine en mode `--file`). Même structure pour chaque vidéo :
1. 0-2 s : accroche en gros texte sur un plan du problème (miettes, terrasse sale, vélo boueux) ;
2. 2-12 s : le produit en 5 gestes d'usage, texte mot à mot, une loupe sur un détail RÉEL du colis ;
3. 12-14 s : le bénéfice en une phrase ;
4. fin : « Lien dans la bio ».
Produits montrés (07/10, produits d'Europe) : l'aspirateur CJ 2039611415532191746 (entrepôt Allemagne ; colis : aspirateur, six embouts, filtre, câble USB, notice) et le nettoyeur AliExpress 1005009522003959, variante « FR 6000mah-2 batteries » (colis : pistolet, rallonge, deux buses, tuyau, raccord, crépine, deux batteries, chargeur ; **pas de pot à mousse ni de mallette** dans la description : jamais montrés). Les photos sont celles de ces fiches, recadrées sans les textes du vendeur.

### 2 bis. Voix et son (méthode de l'écosystème, 07/10)
- **Voix off obligatoire** : le texte dit est exactement le texte affiché, et les sous-titres apparaissent quand la voix dit chaque mot (temps réels relevés par faster-whisper sur la voix).
- **Fournisseur** : Fish Audio seulement avec une clé dans `presti-secrets` ET un forfait commercial prouvé déclaré dans `promo-src/tiktok-chaine/voix-fish.json` (garde `lib/studio/voixFish.ts` ; le gratuit de Fish n'a pas le droit commercial). Sinon la voix locale Kokoro `ff_siwis`, gratuite, sur le PC et sur l'usine.
- **Cache de voix clé sur le texte**, jamais sur l'id d'une vidéo ; **chaque vidéo finale est transcrite** et refusée si elle ne dit pas son texte.
- **Musique** : jamais un son protégé incrusté. Seules les pistes de TikTok Studio > « Sons libres de droits » entrent au manifeste `promo-src/tiktok-chaine/musique/manifeste.json`, avec la réponse de l'API qui prouve la licence commerciale. Les coupes tombent sur les temps forts de la piste ; la musique passe sous la voix (ducking) ; tout est à -14 LUFS.
- **Deux rendus par vidéo** : `<id>-voix.mp4` (voix seule) et `<id>-voix-musique.mp4` (si une piste licenciée existe). Si le son « tendance » est ajouté dans l'appli au moment de publier (compte pro, bibliothèque commerciale), publier la **voix seule** : jamais deux musiques.
- **Juge** : `node promo-src/tiktok-chaine/juge.mjs --sabotages` (voix présente, texte dit = texte affiché, sous-titres calés, -14 LUFS, pas de silence de tête, aucune piste sans licence).

## 3. Calendrier — 7 jours (1 vidéo par produit et par jour)
| Jour | Aspirateur (12 h 30) | Nettoyeur (19 h 00) |
|---|---|---|
| 1 | « Ta voiture est pleine de miettes ? » | « Terrasse sale ? C'est fini. » |
| 2 | « Le truc qui vit dans ma boîte à gants. » | « Vélo plein de boue ? Un coup de pression. » |
| 3 | « Pas de fil ? Pas de problème. » | « Un seau d'eau et c'est parti. » |
| 4 | avant / après d'un tapis de sol | avant / après d'une dalle de terrasse |
| 5 | « Rechargeable. Sans fil. Sans prise à chercher. » | « Pas de câble. Pas de tuyau d'arrosage à brancher. » |
| 6 | réponse en vidéo au commentaire le plus fréquent | réponse en vidéo au commentaire le plus fréquent |
| 7 | « Aspirez, rechargez, repartez. » | « Le nettoyeur qui tient dans le coffre. » |
Les heures sont un premier choix, **à mesurer** : après 7 jours on garde les créneaux et les accroches qui font le plus de vues complètes. Musique : uniquement les sons sous licence de la bibliothèque commerciale TikTok, incrustés depuis le manifeste ou choisis au dépôt sur la version voix seule (§ 2 bis).

## 4. Réponses types aux acheteurs eBay (conformes au droit français)
1. **Délai** : « Bonjour, votre colis est expédié depuis notre entrepôt partenaire ; le délai annoncé sur l'annonce ([X à Y] jours ouvrés) court à partir de l'expédition. Je vous envoie le numéro de suivi dès qu'il est disponible. »
2. **Suivi** : « Le numéro de suivi est dans votre commande eBay ; s'il ne bouge pas pendant 5 jours, écrivez-moi et je relance le transporteur. »
3. **Rétractation** : « Vous disposez de 14 jours après réception pour changer d'avis (droit de rétractation) ; écrivez-moi et je vous indique l'adresse de retour. »
4. **Produit défectueux** : « Je suis désolé. Envoyez-moi une photo ou une courte vidéo du défaut : je vous propose un remplacement ou un remboursement (garantie légale de conformité de 2 ans). Les frais de retour d'un produit défectueux sont à ma charge. »
5. **Colis abîmé** : « Envoyez-moi une photo du colis et du produit : je vous rembourse ou je vous renvoie l'article, sans frais pour vous. »
6. **Annulation** : « Si le colis n'est pas encore parti, j'annule tout de suite et vous êtes remboursé ; s'il est parti, vous pourrez le refuser ou le retourner sous 14 jours. »
7. **Colis perdu** : « Si le suivi n'indique aucune livraison à la date prévue plus 10 jours, je vous rembourse intégralement. »
8. **Question avant achat** : réponse factuelle à partir de la fiche du fournisseur uniquement ; « je vérifie et je reviens vers vous » plutôt qu'une promesse.
(Ces garanties s'imposent à un vendeur professionnel ; c'est aussi le meilleur moyen de garder un compte eBay neuf en bonne santé.)

## 5. Ce qui déclenche le lancement (gestes de Benj)
- **« Publie »** pour les deux annonces eBay (et la fiche TikTok Shop du nettoyeur, stock France) ;
- **le centre vendeur TikTok Shop** n'est pas connecté dans le Chrome du PC : connexion à faire par Benj (code SMS ou compte TikTok) si la fiche doit être posée d'ici.
