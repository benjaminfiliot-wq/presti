---
name: presti-qui-tient-quel-reseau
description: "Qui démarche sur quel réseau pour Presti, et les quatre affirmations fausses parties dans dix InMails LinkedIn le 2026-09-09"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-10T07:42:04.603Z
---

Tranché par Benj le **2026-09-10** : **LinkedIn est à Louis-Victor**, qui le gère seul. Gabriel est
sur Facebook et Instagram. Benj arbitre et garde la main sur le produit et sur le compte Instagram
`@prestiapp`, d'où partent les messages aux artisans (voir [[instagram-dm-automatisation]]).

## Ce qui est parti et qu'il ne faut pas reproduire

Le **09/09 à 22 h 20**, dix InMails ont été envoyés depuis le compte de Benjamin, rédigés par
Louis-Victor. Quatre problèmes, vérifiés dans le code le 10/09 :

1. **Le produit y est appelé « Preti »**, signature comprise (« Fondateur de Preti »). Il s'appelle
   **Presti**.
2. **« Gestion des mails par IA : réponse automatique à vos prospects »** — pas faux, mais vendu comme
   inclus alors qu'il ne l'est pas, et accroché au seul endroit où il ne s'applique pas.
   ⚠️ **Correction : j'avais d'abord écrit « faux », c'était excessif, et Benj a eu raison de me
   reprendre.** Le mode existe bel et bien — `ModeReponse = 'auto' | 'assistee' | 'manuelle'`
   (`lib/plateformeConfig.ts:13`), avec plage horaire et 24/7. Deux réserves seulement : il est
   **verrouillé à Studio (59 €)** — sans la capacité `plateforme.ia.auto`, `plateformeConfig.ts:160`
   rebascule en `assistee` avec le motif `verrou_offre` — et il ne concerne **pas la boîte mail** :
   un mail relevé passe par `lib/releveCanal.ts`, qui fait un simple `insert` sans aucun appel IA.
   La réponse automatique vit dans la conversation de la page Presti, pas dans les mails.
3. **« Connexion fournisseurs : mise à jour automatique de vos tarifs »** — faux, et c'est l'inverse :
   l'import est un **CSV manuel** (`app/inventaire/ImportCsv.tsx`), et `lib/inventaire/CONTEXT.md`
   exclut explicitement le prix scrapé. Les deux seuls crons de `vercel.json` sont les relances et la
   relève des canaux.
4. **« Vous faire gagner 5 à 10 heures par semaine »** — aucune mesure n'existe. C'est le chiffre
   inventé que les vérificateurs interdisent depuis le 09/09.

Résultat : **une réponse sur dix**, un refus poli d'Emmanuel Courandière, et l'InMail marqué
« rejeté » par LinkedIn. Les cinq invitations envoyées le 09/09 sont restées sans réponse.

**La leçon, et elle vaut pour les trois réseaux :** un message de démarchage écrit par quelqu'un qui
n'a pas lu le code contient des promesses que le produit ne tient pas. Toute personne qui démarche
pour Presti doit partir de `plans/accroches-par-metier.md` et de l'antisèche des cinq pièges — pas
de sa mémoire du produit.

**Mise à jour du 24/09/2026 :** Gabriel et Louis-Victor ne travaillent plus pour Benj (réponse de Benj). Benj est désormais le seul à démarcher pour Presti, sur tous les réseaux. Le reste de cette note ne vaut plus que comme historique des erreurs à ne pas refaire.
