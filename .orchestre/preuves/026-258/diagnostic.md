# Diagnostic : Angles Morts Comportementaux du Juge Studio

Ce document détaille les 3 angles morts comportementaux découverts dans `scripts/studio-offre-qa.mjs` (signalés lors de la tâche `026-167`), ainsi que les corrections apportées dans le périmètre de la tâche `026-258`. Ces tests reposent strictement sur des **copies et des doublures (zéro intégration réelle)** pour garantir l'absence de bord d'effets sur le produit.

## 1. SO-2 (Prix statique vs dynamique)
- **Défaut du juge** : Le juge se contentait d'une vérification purement statique via `RegExp` pour vérifier l'absence de valeurs en dur ("490" ou "49000") dans les modules consommateurs. Une mutation qui assignait `PRIX_PACK_STUDIO_TEXTE = "490 €"` tout en fixant `PRIX_PACK_STUDIO_CENTS` à une valeur incohérente n'était pas détectée.
- **Correction** : Ajout du test dynamique `testerSO2`. Le juge effectue maintenant une copie isolée de `lib/studio/offre.ts`, remplace sa déclaration stricte `PRIX_PACK_STUDIO_CENTS = 49000` par `59000`, et importe le code. Si le constructeur de l'objet ou la constante `TEXTE` continue d'afficher statiquement "490 €" au lieu de refléter mathématiquement le changement de centimes (590 €), la copie mutée échoue.

## 2. SO-4 (Masquage des voies dans l'Aiguillage)
- **Défaut du juge** : Le juge vérifiait uniquement à l'aide d'expressions régulières que les termes `pack_studio` et `payment` étaient présents dans le code source de la fonction `aiguiller`, sans vérifier la véritable précédence ou la gestion des branches (ex. `subscription`). Une mutation retirant la vérification `mode === 'payment'` survivait au juge.
- **Correction** : Ajout du test dynamique `testerSO4`. Le juge importe directement `lib/stripeAiguillage.ts` et passe des sessions fictives dans `aiguiller()`. Il affirme formellement que :
  - `mode: payment`, `pack_studio` -> `pack_studio`
  - `mode: subscription`, `pack_studio` -> `orphelin`
  - `payment_status: unpaid`, `pack_studio` -> `en_attente`
  - `pack_id` manquant, `pack_studio` -> `orphelin`

## 3. SO-8 (Vérification de la limite de 3 Mo)
- **Défaut du juge** : Le juge créait un dossier test qui échouait dès le contrôle de `pub-qa.mjs` (ou sur un fichier vidéo manquant dans la copie), empêchant totalement le code d'atteindre la validation de taille limite. Une mutation supprimant complètement la règle `taille > TAILLE_MAX` passait le juge, car elle n'était jamais exécutée par le témoin de QA.
- **Correction** : Ajout du test dynamique `testerSO8`. Le juge provisionne désormais :
  - Un environnement sans réseau, passant des identifiants fictifs directement par l'environnement du sous-processus (aucun fichier `.env.local` généré sur disque).
  - Un stub strict pour `pub-qa.mjs` (qui passe toujours au vert) et pour Supabase, lequel traque toute tentative d'accès via les appels `upload` ou `ops_decision_trancher`.
  - Deux fichiers vidéos factices : un fichier de 2 Mo et un fichier dépassant la limite stricte (3 Mo + 1 octet).
  - Il garantit que le fichier 2 Mo déclenche exactement un appel upload et une décision, tandis que le fichier trop grand est fermement rejeté avec le code `1` et mention de la limite, en s'assurant formellement qu'aucun appel à Supabase n'est effectué pour la vidéo surdimensionnée.
