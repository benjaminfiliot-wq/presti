# Brief Hermes — les SMS sans payer (prompt 6, SMS ; Benj, 03/11 : « les SMS, pareil, tu le fais »)

**Pour qui** : Hermes. C'est une recherche, sans jugement de sécurité. Claude Code tranche ensuite.

**Pourquoi** : le prompt 6 (p6:252) dit que les SMS servent aux rappels, aux confirmations et aux demandes d'avis, seulement aux clients de
l'artisan qui l'ont accepté, avec STOP dans chaque SMS. Il passe par l'étape gratuite d'abord (le SMS préparé, `lib/sms/lien.ts:10`), puis par
une API au plus bas prix vérifié. Benj a donné une liste d'API gratuites : https://github.com/public-apis/public-apis.

**À faire** : un tableau comparatif dans `plans/011-cadrage-01-11/p6-signature/outillage/sms-options.md`. Chaque option a sa ligne :
- nom ;
- lien officiel ;
- envoi possible vers des numéros français : oui ou non, avec la source ;
- gratuit : oui, non, ou quota gratuit chiffré avec sa source et sa date ;
- licence, si c'est du code ;
- ce qu'il faut côté artisan (un téléphone Android, un compte…) ;
- STOP et désinscription possibles ;
- où vont les données (pays) ;
- appel sans webhook possible (n8n n'est pas exposé) ;
- nœud n8n existant ou nœud HTTP.

Parcours dans cet ordre :
1. la section SMS et télécommunications de public-apis ;
2. les passerelles libres qui envoient par le téléphone Android de l'artisan, avec son forfait : par exemple « SMS Gateway for Android »,
   « textbee », « android-sms-gateway » (licence et sécurité à lire sur leur page) ;
3. l'API SMS de Free Mobile, qui n'envoie qu'à soi-même : à noter comme telle ;
4. Brevo SMS et Twilio, à titre de repère payant.

**Règles** :
- Le réseau neuronal d'abord : MCP `cerveau`, `regles_pour` sur « SMS, clients d'artisans, données personnelles, outils payants ».
- Faits seulement : un prix ou un quota vient d'une page officielle datée, sinon « à vérifier ».
- Aucun compte créé, aucun envoi, aucune clé, aucune donnée personnelle.
- Tu n'écris que le fichier de sortie.
- En fin : `--fini <id> --resume "<n> options comparées"`.
