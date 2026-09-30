# Fiche objections — Réacto (vente terrain)

> 📌 **Écrit pour Alexandre — c'est Benj qui reprend.** Depuis le **2026-09-08**, la collaboration est terminée et Benj vend **seul** ([[Journal-Decisions]]). C'est le seul des trois documents de `Prospection/` qui serve vraiment à **vendre Presti** : la méthode (ne jamais contredire, ramener au chantier perdu) tient toujours.
> ⚠️ Cinq corrections à faire avant de s'en servir : (1) le produit s'appelle **Presti** depuis le 2026-08-06, plus « Réacto » ; (2) le prix n'est pas 39 €/mois mais **essai gratuit / 29 € / 59 € / 99 €** (source de vérité : `presti/lib/plans.ts`) — les arguments de prix sont à recalculer ; (3) l'**objection 7** promet un « SMS direct au numéro manqué » : cette fonction **n'existe pas** dans le code — le SMS n'est même pas derrière un drapeau, il n'existe aucune capacité SMS dans `presti/lib/plans.ts`, et `presti/app/messages/canaux/page.tsx` dit lui-même que ce canal demande un compte SMS facturé, non branché ; les seuls canaux non-email prévus (WhatsApp, réseaux) sont à `false` dans `presti/lib/flags.ts`. Ne pas la promettre en vente ; (4) l'accroche de clôture « premiers (**−50 % à vie**) » + **liste d'attente** est une offre de **pré-lancement** ([[Plan-Developpement]], [[Landing-et-objections]]) : elle n'existe ni dans `presti/lib/plans.ts` ni dans Stripe, et il n'y a plus de liste d'attente — le produit est en ligne depuis le 2026-08-14, l'accroche du jour c'est l'**essai gratuit** ; (5) les chiffres « **54 %** en moins de 4h » et « **3 à 5** chantiers perdus/mois » sont **anglo-saxons** et n'ont jamais été confirmés en France ([[Brief-Alexandre-Artisans]] le signale lui-même ; les 5 interviews n'ont jamais eu lieu, [[Récap-Projet]]) — à donner comme ordre de grandeur, jamais comme un fait français.

> Pour Alexandre (et pour la FAQ de la landing). But : répondre à un artisan sceptique **sans le braquer**, et à chaque fois **ramener vers le fric qu'il perd** + montrer concrètement l'utilité de Réacto.
> Format : **Objection → Réponse courte (à dire) → Argument de fond (pourquoi ça tient)**.

## La règle
Tu ne contredis jamais frontalement. Tu dis « je comprends », puis tu recentres sur **le chantier qui part chez le voisin**. L'ennemi de l'artisan, c'est pas toi — c'est le concurrent qui a répondu avant lui.

## La phrase qui recentre tout
> « Réacto, c'est l'employé qui répond à ta place H24 et qui relance tes devis — pour 39 €/mois. Un seul chantier récupéré dans l'année, et c'est remboursé dix fois. »

---

## Les objections

**1. « J'ai pas le temps d'apprendre un logiciel. »**
- **Réponse :** « Justement, y'a rien à apprendre. Tu l'installes en 5 min, et après tu y touches plus — tu reçois juste les leads. »
- **Argument :** la valeur de Réacto = t'ENLEVER du boulot, pas t'en rajouter. Zéro courbe d'apprentissage, sinon on rate la cible (des gens déjà débordés).

**2. « Je gère déjà mes clients au téléphone / au feeling. »**
- **Réponse :** « Nickel pour ceux que t'arrives à choper. Mais celui qui t'écrit pendant que t'es sur un toit, et que tu rappelles 3h après — il a déjà appelé deux autres artisans. Lui, tu le perds sans même le savoir. »
- **Argument :** 54 % des clients choisissent en moins de 4h. La douleur est INVISIBLE (il ne voit pas les chantiers perdus) → Réacto les rend visibles et les rattrape.

**3. « C'est encore un truc à payer / c'est cher. »**
- **Réponse :** « 39 balles par mois. Ton chantier moyen, c'est combien — 2 000, 5 000 ? T'en récupères UN dans l'année et c'est remboursé pour dix ans. »
- **Argument :** recadrer le prix face à la valeur d'UN chantier, jamais dans l'absolu. Il en perd 3 à 5 par mois.

**4. « Les réponses automatiques, ça fait robot / impersonnel. »**
- **Réponse :** « Elles sont écrites dans ton style, avec ton nom, comme si c'était toi entre deux chantiers. Le client voit juste un artisan qui répond vite et carré. Et tu peux tout relire avant. »
- **Argument :** on répond au risque n°1 (son image). La réactivité = signe de sérieux, pas de robot.

**5. « J'y connais rien en informatique. »**
- **Réponse :** « C'est fait exprès pour les gens comme toi, pas pour des geeks. Si tu sais envoyer un SMS, tu sais t'en servir — et on te l'installe. »
- **Argument :** on lève la peur technique. C'est notre wedge : simple pour les non-tech.

**6. « J'ai déjà trop de boulot, je suis plein. »**
- **Réponse :** « Encore mieux : au lieu de dire oui à tout, tu réponds vite et tu choisis les chantiers les plus rentables. Et t'as toujours un pipeline chaud pour quand c'est plus calme. »
- **Argument :** transforme « je suis plein » en « tu peux trier + sécuriser l'avenir ». Plein aujourd'hui ≠ plein dans 3 mois.

**7. « Mes clients appellent, ils écrivent pas. »**
- **Réponse :** « Et quand t'es en haut d'un échafaudage et que ça sonne dans le vide ? Réacto renvoie un SMS direct au numéro manqué : "désolé je suis sur un chantier, je vous rappelle à 18h — c'est pour quel type de travaux ?" Tu perds plus l'appel. »
- **Argument :** même le canal téléphone, on le rattrape. *(⚠️ interne : fonction "SMS sur appel manqué" = phase 2, ne pas promettre comme dispo tout de suite.)*

---

## Quand il est chaud (il dit oui / il accroche)
Note son **nom + métier + ville**, dis-lui qu'il fait partie des **premiers (−50 % à vie)**, et récupère son **email/tél** pour la liste d'attente. → à noter dans le vault (`Validation/` ou `Prospection/`).
