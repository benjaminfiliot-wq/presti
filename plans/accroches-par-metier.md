# La phrase vraie à dire à un artisan — Presti · 2026-09-09

> **Ce document sert à écrire à de vraies personnes.** Chaque phrase du tableau a été rejouée dans le code de `C:\Users\benja\Documents\presti` aujourd'hui : `detecterMetier` et `blocMetierReponse` exécutés sur 43 libellés (`node --experimental-strip-types` sur `lib/ai/metiers.ts`), `guideMetier` et `qualifyLead` exécutés sur 35 métiers et 17 demandes types (fonctions extraites telles quelles de `lib/ai.ts`). Aucun build, aucune migration, aucun navigateur, rien de commité.
>
> **Six accroches de la version précédente ont été supprimées, pas réécrites** : elles étaient fausses ou interchangeables. Le détail est en §5.
>
> Dire **« mon logiciel »**, jamais « mon IA » — tout l'argument est que le tri est déterministe.

---

## 1. La phrase à dire, par métier

| Métier | La phrase à dire | Où ça se vérifie |
|---|---|---|
| **Carreleur** | « Des huit métiers qui ont des prix repères chez moi, le carrelage est celui qui en a le moins : trois lignes — pose sol, faïence murale, chape/ragréage. » | `0002_devis.sql:123-125` (3 lignes) ; les 8 métiers servis et leur compte : `0002_devis.sql:101-133` (5/5/4/4/4/3/4/4) |
| **Charpentier** | « "Charpentier" est dans ma liste d'inscription, entre Menuisier et Couvreur — et c'est le seul des trois à ne déclencher ni prix repère ni mémo de chiffrage. » | `app/onboarding/page.tsx:11` (l'ordre exact) ; aucune ligne "Charpentier" `0002_devis.sql:101-133` ; `guideMetier('Charpentier')` → AUCUN (rejoué) ; côté rédaction il reçoit le profil couvreur (alias `charpent`, `metiers.ts:82`, rejoué) |
| **Chauffagiste** | « Le chauffagiste n'a pas de profil à lui : mon logiciel lui parle en plombier, et il ne lui souffle pas un mot de désembouage. » | `detecterMetier('Chauffagiste')` → `plombier` (rejoué) ; alias `chauffag` dans le profil PLOMBIER `metiers.ts:34` ; vocabulaire servi `metiers.ts:35` (ballon, mitigeur, siphon, PER) ; **zéro occurrence** de « désembouage », « équilibrage », « tubage » dans tout le dépôt (grep) |
| **Climaticien / Frigoriste** | « "Frigoriste", mon logiciel le reconnaît — mais il le range en plombier : ballon, mitigeur, siphon. Pas un mot de fluide, et zéro prix de clim. » | `detecterMetier` → `plombier` (rejoué ; alias `climatic`/`frigorist`, `metiers.ts:34`) ; `guideMetier('Climaticien / Frigoriste')` → AUCUN (rejoué) ; aucune ligne clim dans `0002_devis.sql:101-133` (la PAC est sous « Chauffagiste ») |
| **Couvreur** | « Sur la réfection de toiture mon logiciel porte deux fourchettes qui ne se recoupent pas : 80-200 €/m² dans sa table, 100-250 dans son mémo de chiffrage. Des moyennes, pas vos prix. » | `0002_devis.sql:130` (80-200) vs `lib/ai.ts:765` (100-250) ; les deux arrivent dans le **même** prompt de devis, `lib/ai.ts:902` ; « moyennes indicatives — ce ne sont PAS les prix de cet artisan » `lib/ai.ts:894` |
| **Cuisiniste** | « J'ai une case "Cuisine" pour trier les demandes, et "devis pour une cuisine équipée" tombe bien dedans — mais "Cuisiniste" ne déclenche chez moi ni profil ni prix. » | `lib/ai.ts:260` ; `qualifyLead('devis pour une cuisine équipée sur mesure')` → Cuisine (rejoué) ; `detecterMetier('Cuisiniste')` → générique, **bloc métier vide** (rejoué ; `metiers.ts:140`) |
| **Ébéniste / Agenceur** | « "Ébéniste / Agenceur" vous donne le profil menuisier entier — il refuse de chiffrer sans dimensions et compte la dépose — mais pas une ligne de prix : elles sont au nom "Menuisier". » | `detecterMetier` → `menuisier` (rejoué ; alias `ebenist`, `metiers.ts:50`) ; règles `metiers.ts:52-53` ; les 4 postes `0002_devis.sql:119-122` + égalité stricte `lib/prix/marche.ts:32` et `:41` |
| **Électricien** | « Pour l'élec j'ai cinq fourchettes du marché — tableau, prise, point lumineux, mise aux normes, câble au ml — et rien du tout en photovoltaïque. » | `0002_devis.sql:106-110` ; aucun poste PV ni dans la table (`:101-133`) ni dans le mémo électricité (`lib/ai.ts:740`) ; « fourchettes du marché », **jamais** « prix de référence » (`lib/prix/marche.ts:5-9`) |
| **Étancheur** | « "Étancheur" est dans ma liste d'inscription, et il tombe sur le profil du couvreur : ça parle tuiles et liteaux, pas membrane ni EPDM. » | `app/onboarding/page.tsx:13` ; `detecterMetier('Étancheur')` → `couvreur` (rejoué ; alias `etanch`, `metiers.ts:82`) ; vocabulaire `metiers.ts:83` ; grep : « membrane », « EPDM », « bitume » **absents du code** ; `guideMetier` → AUCUN (rejoué) |
| **Façadier / Ravaleur** | « Le prix de l'enduit de façade est bien dans mon logiciel — 30 à 70 €/m² — mais rangé sous "Maçon". Un compte "Façadier / Ravaleur" ne le reçoit jamais. » | `0002_devis.sql:114` ; égalité stricte `lib/prix/marche.ts:32` et `:41` ; `detecterMetier('Façadier / Ravaleur')` → **générique**, bloc vide (rejoué) ; à garder pour la suite : « ravalement de façade, le crépi est à refaire » ressort classé **Peinture** (rejoué) |
| **Ferronnier** | « "Ferronnier" n'existe qu'à un seul endroit chez moi : le menu de l'inscription. Derrière, il n'y a rien. » | grep repo-wide sur `ferronn` : **une occurrence**, `app/onboarding/page.tsx:12` ; `detecterMetier` → générique, bloc vide (rejoué) ; « portail battant en fer forgé » ressort en **Menuiserie**, « garde-corps sur ma terrasse » en **Maçonnerie** (rejoué) |
| **Isolation (ITE/ITI)** | « Dans ma liste il y a "Isolation (ITE/ITI)" — et comme le mot contient "sol", mon logiciel vous prend pour un carreleur et vous parle ragréage et plinthes. » | `app/onboarding/page.tsx:13` ; `detecterMetier` → `carreleur` (rejoué) ; cause : alias `sol` du carreleur `metiers.ts:74` + `:121` ; vocabulaire servi `metiers.ts:75` ; `guideMetier` → mémo Carrelage/sols (rejoué). Même accident sur « Solier / Moquettiste » et « Panneaux solaires » (rejoués) |
| **Maçon** | « Mon logiciel porte un prix pour l'ouverture de mur porteur — 1 500 à 4 000 € — et en même temps la consigne de ne jamais la chiffrer sans être venu voir. Les deux arrivent dans le même devis. » | `0002_devis.sql:112` et `lib/ai.ts:745` (les deux couches portent la même fourchette) ; la consigne `metiers.ts:61`, injectée dans le prompt via `metiers.ts:139-147` ; concaténation `lib/ai.ts:897` + `:902` |
| **Menuisier** | « Sur le délai, mon logiciel a un garde-fou en dur : si la réponse écrit "sous trois semaines" et que votre profil ne l'annonce pas, elle est refaite une fois — et si ça persiste, la phrase est retirée. » | motif `delai` `lib/ai/antiFabrication.ts:88-93` ; régénération puis retrait `:185-208` ; branché sur les deux chemins de réponse `lib/ai.ts:451` et `:639`, plus `lib/ai/outils.ts:300` ; règle métier « ne pas promettre un délai de fabrication » `metiers.ts:53` |
| **Multiservices / Rénovation** | « Si vous vous inscrivez "Multiservices / Rénovation", mon logiciel vous parle en maçon — mur porteur, IPN, gravats — et ne vous donne aucun prix repère. Le seul truc juste : au chiffrage il découpe bien par lot. » | `detecterMetier` → `macon` (rejoué ; alias `renovation`, `metiers.ts:58`) ; vocabulaire `metiers.ts:59` ; zéro ligne à ce libellé (`0002_devis.sql:101-133` + `marche.ts:32`) ; `guideMetier` → mémo « décompose le chantier par LOT » `lib/ai.ts:770` (rejoué) |
| **Paysagiste** | « Vous êtes le seul métier que mon logiciel connaît vraiment sans avoir un seul de vos prix — et le seul dont j'ai écrit la règle de TVA à la main : 20 % en création, 10 % en entretien. » | profil complet `metiers.ts:89-96` ; sa TVA `metiers.ts:95` est la seule qui ne reprend pas la constante commune `metiers.ts:30` (les 7 autres l'utilisent) ; zéro ligne « Paysagiste » `0002_devis.sql:101-133` ; `guideMetier('Paysagiste')` → AUCUN (rejoué) ; bonus : son propre préréglage de site `lib/siteStyle.ts:68` |
| **Peintre** | « Dans ma table de prix la préparation a sa ligne à elle — 8 à 18 €/m², à côté de la peinture à 20-40 — et la consigne dit de ne pas la sous-estimer, "c'est le cœur du prix". » | `0002_devis.sql:115-116` ; citation exacte `metiers.ts:69`. ⚠️ Le **mémo** de chiffrage, lui, refond prépa et peinture en 25-45 €/m² (`lib/ai.ts:750`) : à savoir avant qu'il le voie sortir |
| **Photovoltaïque / borne de recharge (IRVE)** | « Ma liste d'inscription propose 28 métiers, jusqu'à Ramoneur et Pisciniste — et ni le photovoltaïque ni la borne de recharge n'y sont. Dans mon moteur non plus. » | `app/onboarding/page.tsx:11-15` (28 métiers + « Autre ») ; grep : « IRVE », « wallbox », « borne de recharge » **absents du code** ; « photovoltaique » n'apparaît que dans la liste anti-invention `lib/ai/antiFabrication.ts:48` ; `detecterMetier('Photovoltaïque')` → générique, bloc vide (rejoué) |
| **Pisciniste** | « Dans mon moteur, le mot "piscine" n'apparaît qu'une seule fois : la liste de ce que l'assistant s'interdit de vous attribuer. » | grep sur `lib/` : une occurrence, `lib/ai/antiFabrication.ts:51` ; `detecterMetier('Pisciniste')` → générique, bloc vide (rejoué) ; « devis pour la construction d'une piscine 8x4 » ne tombe dans **aucune** des 12 cases de tri (rejoué ; `lib/ai.ts:250-263`) |
| **Plaquiste / Plâtrier** | « Pour un plaquiste je n'ai aucun prix : ni cloison au m², ni bande. Et mon logiciel vous range avec les peintres. » | `detecterMetier('Plaquiste / Plâtrier')` → `peintre` (rejoué ; alias `plaqu`, `metiers.ts:66`) ; aucune ligne plaquiste/plâtrier dans toutes les migrations (grep) ; `guideMetier` → AUCUN (rejoué) ; le métier est pourtant proposé à l'inscription `app/onboarding/page.tsx:12` |
| **Plombier** | « J'ai cinq fourchettes en base pour le plombier — chauffe-eau, recherche de fuite, mitigeur, WC, tuyauterie au ml — et huit de plus dans le mémo de chiffrage, PAC comprise. Des moyennes France, pas vos prix. » | `0002_devis.sql:101-105` ; le mémo `lib/ai.ts:735` (MO, mitigeur, WC suspendu, ballon ECS, chaudière à condensation, PAC 9 000-15 000, radiateur, tuyauterie) ; `guideMetier('Plombier')` → mémo plomberie (rejoué) |
| **Plombier-chauffagiste** | « À l'inscription il faut trancher : "Plombier" ouvre cinq prix repères, "Chauffagiste" quatre dont la pompe à chaleur. Et le métier ne se change plus après. » | les deux libellés `app/onboarding/page.tsx:11` ; `0002_devis.sql:101-105` et `:126-129` ; égalité stricte `marche.ts:32` ; **irréversible** : champ en lecture seule `app/profil/page.tsx:329`, et aucune écriture de `metier` ailleurs que l'upsert d'inscription `app/onboarding/page.tsx:63` (vérifié : `SectionLegal.tsx:46-64` ne l'écrit pas) |
| **Poêlier / Fumiste** | « La seule chose que mon logiciel sait de vous : quand le client écrit "poêle à granulés", il pense tout de suite à la TVA 5,5. Le conduit, le tubage : rien. » | `lib/ai.ts:791` (« poele a granule », « poele a bois ») — c'est un **indice** au modèle, pas une règle (`lib/ai.ts:781`) ; grep : « conduit », « tubage » **absents du code** ; `detecterMetier` → générique, bloc vide (rejoué). ⚠️ En franchise en base tout sort à 0 % (`metiers.ts:152-156`) : ne promettre le 5,5 qu'à un assujetti |
| **Ramoneur** | « "Ramoneur" est dans ma liste d'inscription — et le mot "cheminée" n'est écrit nulle part dans mon logiciel. Une demande de ramonage ne tombe dans aucune de mes douze cases. » | `app/onboarding/page.tsx:15` ; grep : « cheminée » → **zéro occurrence** ; `qualifyLead('faire ramoner ma cheminée avant l'hiver', 'Ramoneur')` → `type_chantier: null` (rejoué) ; les 12 cases `lib/ai.ts:250-263` |
| **Serrurier / Métallier** | « "Serrurier" ne déclenche aucun profil chez moi — c'est même écrit noir sur blanc dans mes tests : "Serrurier → générique". » | `scripts/ia-unit-e2e.mjs:38` (`['Serrurier', 'generique']`) et `:42` (`blocMetierReponse(profilMetier('Serrurier')) === ''`) ; rejoué : générique, bloc vide. À enchaîner : « je suis enfermé dehors, la porte a claqué » ressort en **Menuiserie**, pas en Serrurerie (rejoué ; `porte` est un mot de `lib/ai.ts:255`, qui passe avant) |
| **Staffeur** | « Le staff n'est nulle part chez moi : ni dans les 28 métiers de l'inscription, ni dans le moteur. Vous passez par "Autre", et vous repartez avec un profil vide. » | grep repo-wide sur `staff` : **zéro occurrence** ; liste `app/onboarding/page.tsx:11-15` ; case Autre `:59` et `:95-96` ; `detecterMetier('Staffeur')` → générique, **bloc vide** (rejoué) |
| **Store & fermeture** | « "Store & fermeture" ne déclenche aucun profil chez moi — mais "mon volet roulant est bloqué, le moteur ne marche plus" ressort bien en urgence, rangé en menuiserie. Le tri marche, c'est le métier qui manque. » | `app/onboarding/page.tsx:15` ; `detecterMetier` → générique, bloc vide (rejoué) ; `qualifyLead` → **urgent / Menuiserie** (rejoué ; `ne marche plus` `lib/ai.ts:104`, `volet`/`store` `lib/ai.ts:255`) |
| **Terrassier / Maçon VRD** | « Dans ma liste, "Terrassier / Maçon VRD" vous colle le profil du paysagiste, à cause du mot "terrass". Le contournement, je l'ai testé : vous inscrire "Maçon terrassier". » | `app/onboarding/page.tsx:14` ; `detecterMetier('Terrassier / Maçon VRD')` → `paysagiste` (rejoué ; alias `terrass` `metiers.ts:90` + règle du premier mot `:119-120`) ; `guideMetier` → mémo **maçonnerie** malgré tout (rejoué) ; `detecterMetier('Maçon terrassier')` → `macon` + mémo maçonnerie (rejoué), via la case Autre `:95-96` |
| **Vitrier** | « Un carreau cassé, mon logiciel le range en carrelage — pour lui "carreau", c'est le sol, pas votre vitre. » | `qualifyLead('un carreau du double vitrage est brisé, je voudrais un devis')` → **Carrelage** (rejoué) ; `carreau` est un mot-clé de la ligne Carrelage `lib/ai.ts:258` ; aucune case vitrerie dans les 12 (`:250-263`) ; `detecterMetier('Vitrier')` → générique, bloc vide (rejoué) |
| **Zingueur** | « Le profil qu'il vous sert parle bien gouttière, noue et solin — mais la ligne de prix gouttière, 30 à 70 € le mètre, est réservée au mot "Couvreur". » | `detecterMetier('Zingueur')` et `('Ardoisier / Zingueur')` → `couvreur` (rejoué ; alias `zingu` `metiers.ts:82`) ; vocabulaire `metiers.ts:83` ; la ligne `0002_devis.sql:132` + égalité stricte `marche.ts:32` ; `guideMetier('Zingueur')` → AUCUN (rejoué) |

### Les neuf phrases interdites, quel que soit le métier

1. ❌ **« Rien ne part sans votre clic. »** L'accusé de réception « Bien reçu » part seul, **au nom de l'artisan**, si le client a laissé un email. → `app/api/leads/route.ts:200-210` (le commentaire dit « même en mode manuel ») et `app/api/leads/contact/route.ts:75-85`.
2. ❌ **« Les relances partent à 2, 5 et 10 jours. »** Elles ne sont planifiées que dans la branche où l'assistant a répondu **lui-même** ; le mode par défaut est « assistée ». → `app/api/leads/route.ts:287-307` ; `lib/plateformeConfig.ts:45`.
3. ⚠️ **Ne pas dire « les relances sont verrouillées à 59 € »** : la grille publique affiche « Relances automatiques ✅ » **dès 29 €** (`lib/plans.ts:131`, rendue telle quelle par la landing et `/abonnement`). Ce qui est verrouillé à 59 €, c'est le **mode où l'assistant répond seul** (`lib/plans.ts:44` et `:60`, verrou serveur `lib/plateformeConfig.ts:160`). Dire : « les relances ne partent que si l'assistant a répondu lui-même. »
4. ❌ **« Allez sur prestiapp.fr et tapez une demande. »** Il n'y a rien à taper. Mais **ce n'est pas non plus « un carrousel de captures »** : sur ordinateur c'est une **vidéo** (`lib/flags.ts:64` → `app/page.tsx:117` → `app/DemoVideo.tsx:49`) ; le carrousel n'apparaît qu'en dessous de 640 px ou en mouvement réduit (`DemoVideo.tsx:20` et `:37`). Dire : « une vidéo de cinq captures du produit, rien à taper. »
5. ❌ **« Une base de prix pour votre métier. »** Huit libellés exacts, 33 lignes, et rien d'autre. → `0002_devis.sql:101-133` + égalité stricte `lib/prix/marche.ts:32` et `:41`.
6. ❌ **« Ce sont vos prix » / « des prix du coin ».** Moyennes France, annoncées comme telles au moteur. → `lib/prix/marche.ts:5-9` ; `lib/ai.ts:894`. Ce qu'on **peut** promettre : les siens passent devant dès qu'il les saisit (`lib/prix/index.ts:38` ; `lib/ai.ts:890`).
7. ❌ **« La TVA à 5,5 % s'applique toute seule. »** Le régime par défaut d'un compte est la **franchise en base** — et alors tout sort à **0 %**, la franchise primant sur tout taux. → `0002_devis.sql:17` ; `lib/ai/metiers.ts:152-156`.
8. ❌ **« Le code lui interdit de… »** Non : les règles de métier sont des **consignes dans le prompt** (`metiers.ts:139-147`). Les deux seuls garde-fous vraiment exécutés : le filtre anti-invention (`lib/ai/antiFabrication.ts:88-125`, branché `lib/ai.ts:451`, `:639`, `lib/ai/outils.ts:300`) et les mentions obligatoires qui bloquent l'envoi d'un devis en HTTP 422 (`app/api/devis/[id]/envoyer/route.ts:46-52`).
9. ❌ **« Il repère l'urgence tout seul »** — devant un **vitrier** ou un **serrurier**, c'est faux : ni « vitre », ni « cassé », ni « brisé », ni « effraction », ni « porte claquée » dans la liste. « Ma vitre de salon est cassée » ressort en `normal` (rejoué ; `lib/ai.ts:99-105`).
10. ❌ **« Je réponds le soir. »** Les mentions légales annoncent jours ouvrés, 9 h – 18 h. → `app/mentions-legales/page.tsx:43`. Corriger la page, ou ne pas le promettre.

---

## 2. À qui écrire en premier

Trois portes éliminatoires, puis trois critères de classement. Dix secondes par fiche, dans cet ordre — on s'arrête à la première porte fermée.

### Les trois portes (si une seule est fermée, on n'écrit pas)

**Porte 1 — reçoit-il ses clients lui-même ?** Un salarié ne fait pas ses devis ; lui écrire ne sert à rien et abîme le taux d'acceptation LinkedIn.
- *LinkedIn* : lire les trois mots après « chez ». Pas de « chez » ? Ouvrir le profil, première ligne de l'onglet Expérience : un employeur = salarié ; « Indépendant », « Auto-entrepreneur » ou son propre nom = on continue.
- *Facebook* : dans À propos, chercher « nous / notre équipe » et le métier au pluriel. « Maçons, couvreurs, carreleurs » (La Rochelle Bati) = ce n'est pas un artisan seul.
- **Restent non tranchés** : les 12 profils de la section B du relevé LinkedIn (Logeais, Delacotte, Bejaoui, Audin, Mercier, Harrouet, Audineau, Trouvé, Bisserier, Pivert, Brelle, Bernard, Dunatte).

**Porte 2 — est-il vraiment dans le 17 ?** Trois pièges, tous présents dans le corpus. Écrire hors zone est le seul faux pas qui ne se rattrape pas : il voit tout de suite l'envoi en lot.
- *Facebook mélange les deux La Rochelle* : « Plomberie Larochelle » est à Saint-Prosper-de-Dorchester, au Québec. Lire la commune **avant** le nom de la page ; une adresse en QC ou ON, on jette. Le « 17 » attrape aussi Paris 17ᵉ et Casablanca.
- *Le 17 d'un pseudo Instagram n'est pas le département* : `couvreur35170` est en Ille-et-Vilaine. Chercher dans la bio une commune française écrite en toutes lettres. Un « 17 » nu ne prouve rien.
- *LinkedIn laisse passer « Nouvelle-Aquitaine » ou « France »* : Maël Gaufreteau, Jocelyn Harrouet et Simon Duluard n'ont **pas** de commune vérifiée.

**Porte 3 — est-il vivant ?** C'est le signal absent des deux fichiers, et c'est celui qui décide s'il faut écrire aujourd'hui. **1 abonné veut dire deux choses opposées** — page ouverte la semaine dernière (le meilleur prospect possible) ou page morte depuis deux ans (zéro chance) — et le compteur seul ne les distingue pas.
- *Facebook* : À propos → la ligne « Page créée le… », plus la date du post le plus haut.
- *Instagram* : la vignette en haut à gauche, sa date se lit en l'ouvrant.
- *LinkedIn* : onglet Activité. « N'a rien publié récemment » = invitation nue, jamais de note.

### Le classement, une fois les portes passées

1. **« Je me lance »** — le signal le plus fort du corpus, et le seul qui dise, avec ses mots à lui, qu'il n'a encore aucune façon de répondre à ses clients : rien à désapprendre. Chercher mot pour mot « je me lance », « auto-entrepreneur », « nouvellement installé », « depuis 2026 ». Forme discrète du même signal : celui qui plaide sa crédibilité (« Diplômé d'état », « Assurances et décennales à jour »).
2. **Un @ avant un 06** — c'est le critère qui décide si le logiciel lui sert à quelque chose. Il ne relève qu'**une** boîte extérieure, en IMAP, une fois par jour (`lib/releveCanal.ts:86` ; `vercel.json:7-9`, cron `0 7 * * *`). Messenger et les DM Instagram ne sont branchés nulle part. Un artisan qui ne publie qu'un 06 règle tout au téléphone : le dire franchement plutôt que d'insister. Comptent aussi comme écrit entrant : « devis sur demande », un formulaire, un site, des avis clients.
3. **Seul, pas une structure** — le nom de l'entreprise le dit gratuitement : *Delbach norman*, *vpcarreleur*, *M-H Peinture*, *les matières d'Alex*, *ECJ.17*. À l'inverse : EURL, SARL, « Groupement », un métier au pluriel, plus de ~150 abonnés, des avis en nombre. Ce n'est pas un « non » — c'est « pas en invitation froide » (SOS Plomberie, Roche Carrelage).

### Deux règles qui ne se lisent pas sur la fiche

- **La note personnalisée est la ressource rare** : il en reste **une** pour septembre, 200 caractères. Elle ne part que si on peut nommer un chantier précis en cinq mots — « le carrelage posé en chevrons », « la charpente montée à Nieul ». Cette matière n'existe de façon fiable que sur **Instagram**. Conséquence pratique : **lire Instagram, écrire ailleurs.**
- **Le prescripteur ne se compte pas dans le quota** : Jean Bourguignon (ancien mandataire FFB, ancien élu de la Chambre des métiers du 17, 3 posts dans le dernier mois) et Les Artisans du Pays Royannais. Avec eux, **l'avis reste la seule demande, y compris dans le message suivant** — le lien d'essai dément la phrase « je cherche des avis, pas des clients » (`presti/plans/demarchage-linkedin.md:270`).

### Où en est la liste, concrètement

| Rang | Qui | Pourquoi | Ce qui manque avant d'écrire |
|---|---|---|---|
| 1 | **Electricien Charente Maritime La Rochelle Rochefort** (FB) | Le seul du corpus qui écrit lui-même « après plusieurs années au service d'un patron, je me lance Auto-entrepreneur ». Plus « devis sur demande » et 1,1 K abonnés. Électricien = 5 postes de prix. | Rien. Réserve honnête : La-Gripperie-Saint-Symphorien est dans le bassin Rochefort, pas La Rochelle ; pas d'email publié → Messenger, que le logiciel ne relève pas. |
| 2 | **ATGB - Couvreur - La Rochelle** (FB) | Si la page a moins d'un mois : couvreur seul, 4 postes de prix, La Rochelle, aucune habitude installée. | **La ligne « Page créée le… »**, dix secondes. Si elle a deux ans, ne pas écrire du tout. Même vérification pour *Ets la rochelle peinture* (1 abonné) et *JFB rénovation* (2). |
| 3 | **Nicolas Logeais** (LinkedIn) | 500+ relations, 234 abonnés — le deuxième profil le plus vivant après Bourguignon, et son statut n'est pas tranché. | Dix secondes dans l'onglet Expérience. S'il est indépendant, il passe devant les dix candidats prévus pour les jours 2 et 3, dont aucun n'a d'activité vérifiée. |
| 4 | **Élec Viollet** (FB) | Le seul du corpus dont la page publie un **email** en plus du téléphone — la moitié qui compte. | « Artisan qualifié, plus de 15 ans » + six prestations listées = installé, routine déjà en place. Deuxième, pas premier. |

**Déjà invités le 09/09, ne pas repartir de zéro** : Norman Delbach (note 197/200), Julien Suire (note 194/200), Vincent Pavergne, David Auffret, Marcel Poilane. Aucune réponse à ce jour.
**À savoir pour le message d'après-acceptation** : Delbach est **staffeur** (le mot n'existe nulle part dans le code) et Suire **carreleur depuis 2014** (3 lignes de prix — quelqu'un qui pose depuis douze ans connaît ses prix mieux que ces trois lignes). Chez eux l'argument n'est pas le chiffrage, c'est la rédaction de la réponse.

---

## 3. Les métiers où il faut se taire sur les prix

Il y a **deux couches de prix**, et c'est là que la version précédente de ce document se trompait. Ne jamais dire « zéro repère » sans préciser laquelle.

- **La table** (`postes_types`, `0002_devis.sql:101-133`) : 33 lignes, **8 libellés exacts**, servie par égalité stricte sur le métier tapé à l'inscription (`lib/prix/marche.ts:32` et `:41`).
- **Le mémo de chiffrage** (`METIER_GUIDES`, `lib/ai.ts:731-772`) : 8 mémos, sélectionnés par **sous-chaîne** du libellé, injectés dans le même prompt de devis (`lib/ai.ts:897` + `:902`). Il porte ses propres fourchettes, et elles ne s'accordent pas toujours avec la table (dalle béton 40-90 vs 60-120 ; fenêtre PVC 300-800 vs 400-900 ; ragréage 20-45 vs 15-30 ; toiture 80-200 vs 100-250).

### Les huit qui ont des prix en base — et eux seuls

Plombier (5) · Électricien (5) · Maçon (4) · Peintre (4) · Menuisier (4) · Chauffagiste (4) · Couvreur (4) · Carreleur (3).

### Zéro prix en base, mais un mémo de chiffrage arrive quand même

**Terrassier / Maçon VRD** (mémo maçonnerie) · **Solier / Moquettiste** (mémo carrelage) · **Isolation (ITE/ITI)** (mémo carrelage) · **Panneaux solaires** (mémo carrelage) · **Multiservices / Rénovation** (mémo « découpe par lot ») · **Plombier-chauffagiste** (mémo plomberie). *Tous rejoués.*

> **La phrase à dire** : « Aucun prix de votre métier dans ma base — et au chiffrage il va vous servir les repères du [carrelage / de la maçonnerie]. C'est à savoir avant, pas après. »
> C'est plus inquiétant que « zéro », donc plus crédible — et ça évite de se faire reprendre au premier devis.

### Zéro prix **et** zéro mémo : le devis part entièrement à l'estime

Charpentier · Étancheur · Zingueur · Façadier / Ravaleur · Plaquiste / Plâtrier · Staffeur · Vitrier · Cuisiniste · Ébéniste / Agenceur · Store & fermeture · Serrurier / Métallier · Ferronnier · Pisciniste · Paysagiste · Ramoneur · Poêlier / Fumiste · Climaticien / Frigoriste · Domoticien · Photovoltaïque · Borne de recharge. *Tous rejoués.*

> **La phrase à dire** : « Pour votre métier je n'ai aucun prix tout fait : le devis part à l'estime tant que vous n'avez pas saisi vos postes. Dès que vous les saisissez, ce sont les vôtres qui passent devant. » → `lib/prix/index.ts:38` ; `lib/ai.ts:890`.
>
> **Et selon le métier, la moitié qui reste vraie :**
> - **Paysagiste** : profil complet, questions de qualification, règle de TVA écrite pour lui. « Le métier, oui. Les prix, non. »
> - **Plaquiste, plâtrier** : il reçoit bien un profil — mais celui du **peintre** (préparation des supports, humidité, toile de verre). Ne pas dire « les bonnes questions » : dire « les questions du peintre ».
> - **Charpentier, étancheur, zingueur** : profil **couvreur** (tuiles, liteaux, faîtage, gouttières, noue, solin).
> - **Chauffagiste, climaticien, frigoriste** : profil **plombier**.
> - **Vitrier, cuisiniste, ferronnier, pisciniste, serrurier, ramoneur, poêlier, staffeur, façadier, domoticien, store** : **bloc métier vide** (`metiers.ts:140`) — pas un profil allégé, rien du tout. Il reste les questions génériques (`lib/ai/playbooks.ts:63` et `:72`, la substitution par les questions métier étant réservée aux profils non génériques, `:85-86`).

---

## 4. Ce qu'il reste à ratisser

Requêtes prêtes à coller, par réseau, classées par rendement à l'intérieur de chaque réseau. **Commencer par Facebook** : LinkedIn est déjà sur-stocké (48 noms pour 5 invitations/jour), Facebook n'a pas de compteur et n'a couvert qu'un bassin sur quatre.

### Facebook — recherche de **Pages**

**① Les trois bassins jamais cherchés.** C'est le trou le plus large du relevé, et il ne demande aucune méthode nouvelle : la même requête, trois villes de plus.
```
https://www.facebook.com/search/pages/?q=renovation%20rochefort
https://www.facebook.com/search/pages/?q=renovation%20saintes
https://www.facebook.com/search/pages/?q=renovation%20royan
```
Puis remplacer « renovation » par : couvreur, electricien, plombier, menuisier, carreleur, peintre, macon — 21 requêtes de plus, ~30 s chacune.

**② « métier + 17 », jamais essayé sur Facebook.** Quatre des 17 pages déjà trouvées portent le 17 dans leur nom (SD Rénovation 17, MD Rénovation 17 Saujon, /17.renovation, SG 17) — remontées par hasard. Huit requêtes ratissent ce que trente requêtes de commune ne couvrent pas.
```
https://www.facebook.com/search/pages/?q=renovation%2017
https://www.facebook.com/search/pages/?q=carrelage%2017
https://www.facebook.com/search/pages/?q=couvreur%2017
https://www.facebook.com/search/pages/?q=electricite%2017
https://www.facebook.com/search/pages/?q=peinture%2017
https://www.facebook.com/search/pages/?q=menuiserie%2017
https://www.facebook.com/search/pages/?q=plomberie%2017
https://www.facebook.com/search/pages/?q=maconnerie%2017
```

**③ Les communes prouvées habitées par un artisan du relevé, jamais utilisées comme mot-clé.** Une page nommée « <métier> Lagord » ne remonte pas sur « <métier> la rochelle ».
```
https://www.facebook.com/search/pages/?q=artisan%20perigny
https://www.facebook.com/search/pages/?q=couvreur%20perigny
https://www.facebook.com/search/pages/?q=plombier%20perigny
https://www.facebook.com/search/pages/?q=artisan%20lagord
https://www.facebook.com/search/pages/?q=artisan%20puilboreau
https://www.facebook.com/search/pages/?q=artisan%20nieul%20sur%20mer
https://www.facebook.com/search/pages/?q=renovation%20marsilly
https://www.facebook.com/search/pages/?q=renovation%20charron
https://www.facebook.com/search/pages/?q=artisan%20salles%20sur%20mer
https://www.facebook.com/search/pages/?q=artisan%20ardillieres
https://www.facebook.com/search/pages/?q=carrelage%20ballon%2017
https://www.facebook.com/search/pages/?q=electricien%20anais%2017
```
Périgny d'abord : 6 des 48 profils LinkedIn y sont (Lafleur, Fournier, Bejaoui, Audin, Mercier, Bernard) — c'est la zone d'activité où les artisans posent leur dépôt. ⚠️ « ballon » seul ramène du sport : toujours le préfixer d'un métier.

**④ PAC, clim, photovoltaïque** — 2 prospects sur 87, zéro sur Facebook. « Pose pompe à chaleur », 8 000-15 000 € HT, est la ligne la plus chère de toute la base (`0002_devis.sql:129`), et le profil plombier absorbe déjà « climatic » et « frigorist ».
```
https://www.facebook.com/search/pages/?q=pompe%20a%20chaleur%20la%20rochelle
https://www.facebook.com/search/pages/?q=climatisation%20la%20rochelle
https://www.facebook.com/search/pages/?q=photovoltaique%2017
https://www.facebook.com/search/pages/?q=chauffagiste%2017
```

**⑤ Le reste, par ordre décroissant.**
```
Paysagiste / élagage / clôture (profil complet dans le logiciel, 0 prospect) :
https://www.facebook.com/search/pages/?q=paysagiste%20la%20rochelle
https://www.facebook.com/search/pages/?q=elagage%2017
https://www.facebook.com/search/pages/?q=terrassement%2017
https://www.facebook.com/search/pages/?q=cloture%20portail%2017
https://www.facebook.com/search/pages/?q=espaces%20verts%20rochefort

Île de Ré (le client à distance ÉCRIT, il n'appelle pas) :
https://www.facebook.com/search/pages/?q=artisan%20ile%20de%20re
https://www.facebook.com/search/pages/?q=renovation%20ile%20de%20re
https://www.facebook.com/search/pages/?q=couvreur%20ile%20de%20re
https://www.facebook.com/search/pages/?q=menuisier%20saint%20martin%20de%20re

Plaquiste / plâtrerie :
https://www.facebook.com/search/pages/?q=plaquiste%2017
https://www.facebook.com/search/pages/?q=platrerie%20la%20rochelle
https://www.facebook.com/search/pages/?q=cloison%20faux%20plafond%2017

Ravalement / ITE / isolation :
https://www.facebook.com/search/pages/?q=ravalement%20facade%2017
https://www.facebook.com/search/pages/?q=isolation%2017
https://www.facebook.com/search/pages/?q=isolation%20combles%20la%20rochelle
https://www.facebook.com/search/pages/?q=facade%20rochefort

Agencement / cuisine / salle de bain (le client envoie photos et mesures par écrit) :
https://www.facebook.com/search/pages/?q=agencement%2017
https://www.facebook.com/search/pages/?q=cuisiniste%20la%20rochelle
https://www.facebook.com/search/pages/?q=salle%20de%20bain%20la%20rochelle
https://www.facebook.com/search/pages/?q=dressing%20sur%20mesure%2017

Piscine · store/pergola/miroiterie · poêle/ramonage (saison) :
https://www.facebook.com/search/pages/?q=piscine%2017
https://www.facebook.com/search/pages/?q=pisciniste%20la%20rochelle
https://www.facebook.com/search/pages/?q=store%20volet%2017
https://www.facebook.com/search/pages/?q=pergola%20veranda%20la%20rochelle
https://www.facebook.com/search/pages/?q=miroiterie%20vitrerie%20la%20rochelle
https://www.facebook.com/search/pages/?q=menuiserie%20alu%2017
https://www.facebook.com/search/pages/?q=poele%20a%20granules%2017
https://www.facebook.com/search/pages/?q=cheminee%20poele%20la%20rochelle

Dernier, et je dis pourquoi — métallerie SEULEMENT, jamais le dépannage de serrure
(un serrurier de dépannage est appelé au téléphone ; le logiciel prépare de l'écrit) :
https://www.facebook.com/search/pages/?q=metallerie%20ferronnerie%2017
https://www.facebook.com/search/pages/?q=portail%20garde%20corps%20la%20rochelle
```

### Instagram — barre de recherche, onglet **Comptes**

**① Les deux métiers absents des 22 comptes, alors qu'ils ont des prix repères.**
```
peinture 17          maconnerie 17
peintre 17           macon 17
deco 17              gros oeuvre 17
                     extension 17
```
La peinture est le métier le plus photogénique du lot (avant/après d'une pièce) et un de ceux que le logiciel chiffre le mieux (4 lignes, `0002_devis.sql:115-118`). Le trou vient de la requête, pas du terrain : 5 peintres sur LinkedIn, 3 pages sur Facebook, 0 compte Instagram.

**② « métier + la rochelle » — déclarée inutile à tort.** La méthode dit « electricien la rochelle ne rend rien » : c'est vrai **pour l'électricien**, et ça a été généralisé à tout Instagram — alors que 6 des 22 comptes déjà trouvés portent la ville et pas le 17 (`bois_deco_lr`, `mtalarochelle`, `larochellemenuiseries`, `plombierlarochelle`, `plombier_la_rochelle`, `plombier_de_la_rochelle_`). Une règle tirée d'une seule requête ratée ferme la moitié du réseau.
```
peinture larochelle     lr renovation      macon larochelle
carrelage larochelle    lr carrelage       renovation larochelle
                        lr peinture        (essayer aussi collé : peinturelarochelle)
```

**③ Le reste.**
```
climatisation 17 · pompe a chaleur 17 · photovoltaique 17
paysagiste 17 · elagage 17 · jardin 17 · terrassement 17
plaquiste 17 · placo 17
agencement 17 · cuisine 17 · salledebain 17
facade 17 · isolation 17
piscine 17 · pisciniste 17
pergola 17 · volet 17
poele granules 17
ferronnerie 17 · metallerie 17
perigny renovation · renovation iledere · artisan iledere
```

### LinkedIn — le débit est la contrainte, chercher mieux et non plus

**① « à mon compte » / auto-entrepreneur** — la requête qui attrape le signal S4, le plus fort du corpus. Le relevé prouve que ces mots y sont : « Peintre intérieur extérieur chez À mon compte », « Menuisier chez chez moi », et la meilleure phrase de tout le relevé est celle d'une page Facebook (« Après plusieurs années au service d'un patron, je me lance Auto-entrepreneur »). Les 11 requêtes déjà faites n'ont utilisé que *artisan*, *artisan bâtiment*, *gérant bâtiment*, *rénovation*.
```
https://www.linkedin.com/search/results/people/?keywords=%22%C3%A0%20mon%20compte%22&origin=FACETED_SEARCH&geoUrn=%5B%22104669918%22%2C%2290009666%22%2C%22106346803%22%2C%22104073050%22%5D
https://www.linkedin.com/search/results/people/?keywords=auto-entrepreneur%20batiment&origin=FACETED_SEARCH&geoUrn=%5B%22104669918%22%2C%2290009666%22%2C%22106346803%22%2C%22104073050%22%5D
https://www.linkedin.com/search/results/people/?keywords=micro-entreprise%20renovation&origin=FACETED_SEARCH&geoUrn=%5B%22104669918%22%2C%2290009666%22%2C%22106346803%22%2C%22104073050%22%5D
```

**② Le bassin de Saintes : 0 profil sur 48.** Une minute pour trancher — soit l'identifiant de zone n'est pas celui de Saintes, soit les résultats se sont épuisés sur La Rochelle avant d'y arriver.
```
https://www.linkedin.com/search/results/people/?keywords=artisan&origin=FACETED_SEARCH&geoUrn=%5B%22106346803%22%5D
Royan seul : geoUrn=%5B%22104073050%22%5D
```
⚠️ `106346803` = Saintes **d'après l'ordre annoncé** dans `prospects-3-reseaux-2026-09-09.md` ligne 24. Vérifier l'étiquette que LinkedIn affiche après chargement.

---

## 5. Ce que je ne sais pas

**Ce que j'ai supprimé, et pourquoi** — six accroches de la version précédente ne sont plus dans ce document :
- *Plombier, « ni chaudière ni PAC »* : **faux**. Le mémo de chiffrage lui sert « chaudière gaz à condensation 2500-5000 € ; PAC air/eau 9000-15000 € » (`lib/ai.ts:735`, rejoué). Il l'aurait vu au premier devis.
- *Carreleur, « la dépose n'en fait pas partie »* : **faux**. `lib/ai.ts:760` porte « dépose 10-25 €/m² ; plinthes 8-15 €/ml ».
- *Menuisier, « il n'a que 4 prix »* : **faux**. Le mémo en ajoute cinq, dont deux qui contredisent la table.
- *Carreleur, « le métier le moins fourni du logiciel »* : **faux** — vingt métiers ont zéro ligne. Remplacé par la version exacte (« des huit qui en ont »).
- *Domoticien et Solier* : supprimées comme **interchangeables** (« mon code a le mot X mais pas Y »), et sans un seul destinataire dans les relevés.
- *« Une demande de borne n'est classée nulle part »* : **faux dans les deux sens**. Un compte déclaré « Électricien » voit toute demande non reconnue étiquetée « Électricité » (rejoué ; repli `lib/ai.ts:286` → `:271`).

**Ce que je n'ai pas vérifié, et que personne n'a vérifié :**
- **Je n'ai ouvert aucun profil, aucune page, aucun compte.** Tout vient des deux fichiers de relevé. Il manque la donnée qui décide : **22 comptes Instagram sur 22 sans date de dernière publication ni nombre d'abonnés**, et 42 profils LinkedIn sur 48 sans chiffre d'activité. Cinq minutes de passe corrigent les deux — deux colonnes à ajouter : « dernière trace » et « écrit entrant (@ publié / devis sur demande / avis — oui-non) ». **Ne rien écrire à une fiche dont ces deux cases sont vides.**
- **Les prix décrivent l'état du code, pas l'état de la prod.** Le seed est conditionnel (`0002_devis.sql:135`, `where not exists`) : il n'a rempli la table qu'une fois, à vide. Aucun autre écrit dans `postes_types` n'existe dans le dépôt. Vu l'habitude de coller du SQL à la main dans le SQL Editor, une ligne ajoutée là ne se verrait nulle part ici.
- **Je prouve ce que le logiciel SOUFFLE au modèle, pas ce que le modèle écrit.** Les profils métier sont des consignes de prompt. « Il ne connaît pas le désembouage » est vrai du bloc injecté — le modèle peut très bien sortir le mot tout seul. Formuler « mon logiciel ne le lui souffle pas », jamais « il ne connaît pas » : la nuance tient dans trois mots et elle sauve la phrase si l'artisan teste.
- **Le produit n'a pas été essayé de bout en bout** : aucun build, aucune migration, aucune suite e2e, aucun navigateur. Ce document est de la lecture de code plus la ré-exécution de deux modules purs.
- **Je ne sais pas si les 5 invitations du 09/09 ont été acceptées** : aucune réponse à cette date.
- **Je ne sais pas laquelle de ces phrases convertit.** Aucune n'a jamais été envoyée. Ce qu'on sait, c'est qu'aucune ne peut être démentie en dix minutes — c'était le cahier des charges, pas une promesse de rendement.
- **Trois vérifications à dix secondes valent plus que tout ce document** : la date de création de la page ATGB, le statut de Nicolas Logeais dans son onglet Expérience, et l'existence d'un vrai artisan derrière `plombierlarochelle` / `plombier_la_rochelle` / `plombier_de_la_rochelle_` — trois pseudos quasi identiques, et les seules lignes du tableau Instagram sans aucun nom affiché.