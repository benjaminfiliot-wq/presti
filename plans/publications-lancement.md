# Publications de lancement

> Fichier partagé entre plusieurs sections (Facebook, LinkedIn…). **Chaque section est autonome :
> on ajoute la sienne à la suite, on ne réécrit jamais celles des autres.**
>
> Règle qui vaut pour tout le fichier : rien n'est affirmé qui ne soit vérifiable dans le dépôt.
> Pas de chiffre inventé, pas de témoignage, pas de note, pas de logo client, pas de capture
> fabriquée. C'est la règle du produit et c'est aussi la loi (pratiques commerciales trompeuses).

---

# Facebook — première publication (v12 §2)

Rédigé le 08/09/2026. Zéro artisan signé à cette date : aucune preuve sociale n'est utilisable,
et aucune n'est utilisée.

## 0. Le socle vérifié (à relire avant toute retouche du texte)

Ce que le produit fait **vraiment**, avec l'endroit où c'est écrit dans le code. Toute modification
des trois variantes doit rester dans ce cadre.

| Ce qu'on a le droit de dire | Preuve |
|---|---|
| Par défaut, l'assistant **prépare** la réponse, l'artisan valide et envoie. Le client, lui, voit tout de suite que son message est bien reçu. | `lib/plateformeConfig.ts:45` (`mode_reponse: 'assistee'`) et `lib/aide.ts:486` |
| L'assistant qui **répond en direct**, sans attendre l'artisan, existe **à partir de Studio** | `lib/plateformeConfig.ts:160` (verrou `plateforme.ia.auto`), `lib/plans.ts:43` |
| Le devis est **chiffré tout seul** et posé **en brouillon** — il ne part pas tout seul | `lib/plateformeConfig.ts:50` (`devis_auto: 'brouillon'`), `lib/devisAuto.ts` |
| Le chiffrage utilise **les prix de l'artisan d'abord**, les ordres de grandeur du marché seulement pour ce qu'il n'a pas saisi | `lib/prix/index.ts:10-12` |
| Les **relances partent toutes seules** par email, tant que le client n'a pas répondu **sur la page Presti** | `app/api/cron/relances/route.ts:56` — la relance n'est annulée que si `lead.statut` a quitté `'repondu'`, ce que fait une réponse sur la page, **pas** une réponse par email (`lib/releveCanal.ts` ne touche pas au statut d'un lead existant) |
| ⚠️ …mais elles ne sont **planifiées** que quand l'assistant a répondu **lui-même**. Donc : pas en mode assisté, qui est le mode par défaut, et pas du tout en Essentiel, où l'automatique est verrouillé. **À ne jamais écrire sans cette réserve** (vérifié le 2026-09-10) | Deux seuls points d'insertion : `app/api/leads/route.ts:299` et `app/api/leads/contact/route.ts:92`, tous deux conditionnés à `statut === 'repondu'` — posé nulle part ailleurs que `app/api/leads/route.ts:289`, en branche auto. Le défaut est `assistee` (`lib/plateformeConfig.ts:45`), qui sort en `ok: false` (`:136`) ; Essentiel n'a pas `plateforme.ia.auto` (`lib/plans.ts:36-41`), donc verrou (`:160`) |
| Page de conversation à sa marque + **son propre nom de domaine**, dès l'essai | `lib/plans.ts:36-41` (`BASE`), et `BASE` est la liste de capacités du plan `gratuit` (`lib/plans.ts:58`) |
| Le site se commande à part (300 € une fois) | `lib/siteCommande.ts` |
| Factures + **facture électronique** | `lib/plans.ts:39`, `lib/facturx.ts` |
| Essai : **3 crédits, sans carte bancaire** | `lib/plans.ts:58` |
| Prix : Essentiel **29 €/mois** (80 crédits) · Studio **59 €/mois** (250) · Signature **99 €/mois** (600) | `lib/plans.ts:59-61` |
| Sans engagement · TVA non applicable, art. 293 B du CGI | `app/page.tsx:161` et `app/page.tsx:170` |

**Ce qu'on n'écrit JAMAIS**, sous aucune reformulation :

- « répond tout seul jour et nuit » / « répond à votre place » **sans préciser que c'est à partir de Studio** — c'est faux pour l'Essai et l'Essentiel ;
- « le devis part tout seul » — il est chiffré tout seul, il ne part pas tout seul ;
- **SMS, WhatsApp, Instagram, Messenger, réseaux sociaux** : rien de tout ça n'existe (`lib/flags.ts:68-70`, `canauxWhatsapp` et `canauxReseaux` à `false`). Les canaux réels : la page de conversation et l'email branché ;
- « répond au téléphone » : Presti ne décroche pas, ne rappelle pas, ne transcrit pas d'appel ;
- tout pourcentage, tout « +X % de devis signés », tout « ils nous font confiance », toute note en étoiles ;
- ⛔ **« zéro artisan abonné »** — c'était vrai, ça ne l'est plus. Compté le **2026-09-10** : **un abonné
  payant**, sur Essentiel (7 comptes non-test au total). L'accroche qui a le mieux marché sur LinkedIn
  est devenue une phrase fausse, et c'est précisément celle qu'on réutilise par réflexe. Ce qui reste
  vrai et qui dit la même chose : « je parle aux artisans un par un en ce moment ». Et on ne cite pas
  l'abonné : pas de témoignage, pas de nom, pas de logo — il n'a rien demandé.

---

## 1. Préparer la Page Facebook (§2.1)

> **⚠️ Ce que la Page a appris le 2026-09-09, en la créant pour de vrai.** Deux choses ne se
> devinent pas et coûtent cher :
>
> 1. **L'assistant de création (5 étapes) ne persiste pas ses champs de contact.** Site web,
>    téléphone et e-mail ont été saisis à l'étape 1, l'assistant est allé au bout — et ils
>    n'apparaissaient nulle part sur la Page ensuite. Il faut les reposer depuis les écrans de la
>    Page (Modifier → Coordonnées). **Vérifier après coup, ne jamais croire l'assistant.**
> 2. **La photo de profil se pose AU CENTRE de la couverture**, sur bureau comme sur mobile — sur
>    mobile le cercle couvre presque toute la couverture. Une couverture avec du texte centré est
>    donc illisible. C'est pour ça que `facebook-couverture-1640x856.png` ne porte **aucun texte**.
>    **Correction du 09/09 au soir** : c'était FAUX pour les coordonnées. Elles étaient bien
>    enregistrées — c'est **l'interface d'administration qui ne les affiche pas**. Seule la vue
>    VISITEUR dit la vérité. Ne jamais conclure « ce n'est pas enregistré » depuis l'écran d'admin :
>    ouvrir la Page en navigation privée (ou dans un navigateur sans session).
> 3. L'interface « profil » des nouvelles Pages charge ses sections en différé et reste parfois
>    bloquée sur des squelettes. Meta Business Suite (`/latest/settings/profiles`) rend un panneau
>    **entièrement vide** — les deux voies de secours habituelles sont donc inutilisables ici.
> 4. **Le piège du bouton d'action.** Dans Tableau de bord → Statut, cliquer sur la carte
>    « Ajouter un bouton d'action » ouvre une boîte « Effectuez cette tâche » avec **Terminé /
>    Ignorer**. Cliquer **Terminé** marque la tâche comme faite et **retire la ligne de la liste**
>    — sans rien configurer. Après ça, plus aucun point d'entrée vers l'éditeur du bouton n'est
>    accessible depuis la Page. C'est ce qui s'est passé ici.


Une **Page professionnelle**, pas un profil personnel : c'est ce qui donne les statistiques, le
bouton d'action et la messagerie pro, sans exposer le profil personnel qui l'administre (celui-ci
reste privé, il est seulement administrateur).

### 1.1 Identité

| Champ | Valeur exacte à saisir |
|---|---|
| **Nom de la Page** | `Presti` |
| **Nom d'utilisateur (@)** | `prestiapp` (à ajuster s'il est pris : `prestiapp.fr` n'est pas autorisé, essayer `presti.app` puis `prestiartisans`) |
| **Catégorie principale** | `Logiciel` |
| **Catégorie secondaire** (facultatif) | `Service informatique` |
| **Site web** | `https://prestiapp.fr/a/facebook` |
| **Email** | `benjaminfiliot+presti@gmail.com` |
| **Téléphone** | `06 30 78 16 47` |
| **Bouton d'action** | `En savoir plus` → `https://prestiapp.fr/a/facebook` |

Le bouton pointe sur le **lien tracké**, pas sur `prestiapp.fr` nu : c'est la même page d'arrivée
pour le visiteur, mais l'inscription qui en découle sera attribuée à Facebook dans le Poste de
contrôle. Ne pas mettre `?a=facebook` : le système d'apports est un **chemin** (`/a/<code>`), pas
un paramètre — voir `app/a/[code]/route.ts`.

### 1.2 Images

| Emplacement | Fichier | Traitement |
|---|---|---|
| **Photo de profil** | `public/marque/presti-icone-512.png` | tel quel, 512×512, aucun recadrage (l'icône est déjà centrée) |
| **Couverture** | `public/promo/facebook-couverture-1640x856.png` | **déjà prête, rien à recadrer.** Produite par `node scripts/promo-couverture.mjs`, aux bonnes dimensions et composée pour la bande centrale que le mobile conserve. `node scripts/promo-couverture.mjs --guide` rend la même image avec les zones de rognage tracées, pour vérifier d'un coup d'œil. |

> Pourquoi pas un recadrage de `presti-partage-1200x630.png`, comme le prompt le suggérait : cette
> image est calée **à gauche**, et une couverture est rognée par les côtés sur mobile — le logo et la
> phrase auraient disparu pour la moitié des visiteurs. 1640 > 1200, le recadrage aurait en plus été
> un agrandissement. La couverture est donc recomposée, centrée, rendue en natif.

Vérifier après mise en ligne, sur téléphone **et** sur ordinateur : la photo de profil ronde ne doit
pas rogner l'aube, et la couverture ne doit rien couper.

### 1.3 Section « À propos »

**Bio courte** (champ court, ~100 caractères) :

```
L'assistant qui prépare vos réponses et vos devis pendant que vous êtes sur le chantier.
```

**Description** (champ « Description », ~255 caractères) :

```
Presti est un assistant pour les artisans du bâtiment. Le client écrit sur votre page, l'assistant prépare la réponse dans votre ton et chiffre le devis sur vos prix. Vous relisez, vous envoyez. Devis, factures et relances au même endroit.
```

**Informations supplémentaires** — texte long, repris **mot pour mot** de `app/mentions-legales/page.tsx`
(aucun chiffre n'est ajouté ici, tout vient de la page légale du site) :

```
Presti — l'assistant des artisans du bâtiment.

Le client écrit sur votre page Presti, à votre nom et sur votre nom de domaine. L'assistant lui pose les bonnes questions et prépare la réponse dans votre façon d'écrire : vous la relisez et vous l'envoyez. Quand le besoin est clair, il chiffre le devis sur vos prix, en brouillon. Les relances partent toutes seules tant que le client n'a pas répondu sur votre page. Devis, factures, facture électronique et site vitrine au même endroit.

Essai gratuit : 3 crédits, sans carte bancaire. Formules à partir de 29 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.

Éditeur : Benjamin Filiot — entrepreneur individuel (micro-entreprise)
SIREN : 109 411 348 (RNE, immatriculée le 1er septembre 2026)
Code APE : 6201Z — Programmation informatique
Contact : benjaminfiliot+presti@gmail.com — 06 30 78 16 47 (jours ouvrés, 9 h – 18 h)
Directeur de la publication : Benjamin Filiot
Mentions légales complètes : https://prestiapp.fr/mentions-legales
```

> **L'adresse postale** (1 rue du Brouage, 17230 Marans) figure déjà en clair dans les mentions
> légales du site — l'obligation d'identification porte sur le site, pas sur la Page Facebook.
> Elle n'est donc **pas** reprise ci-dessus, et le lien vers `/mentions-legales` suffit. À ajouter
> seulement si Facebook la réclame pour valider la Page (vérification d'entreprise, publicité).

### 1.3 bis — Ce qui est FAIT sur la Page, et ce qui reste (état au 2026-09-09)

Page créée : **`facebook.com/profile.php?id=61594294558850`**, administrée par le profil
**Benjamin Filiot**.

| | État |
|---|---|
| Nom **Presti**, catégorie **Logiciels** | ✅ vu à l'écran |
| Bio (la ligne courte du §1.3) | ✅ vue à l'écran |
| Photo de profil (`presti-icone-512.png`) | ✅ |
| Couverture (`facebook-couverture-1640x856.png`) | ✅ |
| E-mails marketing de Meta | ✅ **coupés** |
| WhatsApp associé | volontairement **ignoré** |
| Invitations aux amis | volontairement **ignorées** |
| Site web `https://prestiapp.fr/a/facebook` | ✅ **confirmé en vue visiteur** |
| Téléphone `06 30 78 16 47` | ✅ **confirmé en vue visiteur** |
| E-mail `benjaminfiliot+presti@gmail.com` | ✅ **confirmé en vue visiteur** |
| **Mentions légales** (bloc éditeur complet : SIREN, APE, adresse, contact, TVA + les deux liens) | ✅ **enregistré et relu sur la Page** — À propos → Confidentialité et informations juridiques |
| **Lien Politique de confidentialité** → `prestiapp.fr/confidentialite` | ✅ **enregistré et relu** |
| Avis / recommandations ouverts (§1.4) | ✅ déjà activés par défaut |
| Bouton d'action « En savoir plus » | ❌ **absent** — confirmé en vue visiteur. À poser à la main (voir le piège n°4 ci-dessus) |
| Nom d'utilisateur `@prestiapp` | ❌ l'écran ne s'ouvre pas — **cosmétique**, ne bloque rien |
| Réponse automatique de messagerie | ❌ le dialogue de Business Suite ne s'ouvre pas |

**Les bons écrans, à garder** (ceux qui répondent, contrairement à « Modifier » et à Business Suite) :
- Coordonnées : `facebook.com/profile.php?id=61594294558850&sk=about_contact_and_basic_info`
- Légal : `…&sk=directory_privacy_and_legal_info`
- Automatisations : `business.facebook.com/latest/inbox/automated_responses?asset_id=1219476067925319`

> **Il n'y a pas de champ « Informations supplémentaires »** sur ce type de Page — le §1.3 le
> supposait. Le bloc légal a trouvé mieux : le champ **Mentions légales** dédié (2 000 caractères),
> à côté du champ **Politique de confidentialité**. L'adresse postale y figure, contrairement à ce
> que prévoyait le §1.3 : c'est le champ d'identification légale, et elle est déjà publique sur le
> site.
| Nom d'utilisateur `@prestiapp` | ❌ à faire |
| « Informations supplémentaires » (bloc légal du §1.3) | ❌ à faire |
| Réponse automatique de messagerie (§1.4) | ❌ à faire |

**Comment confirmer les deux ⚠️ en trente secondes** : ouvrir
`facebook.com/profile.php?id=61594294558850` **en navigation privée** (donc en visiteur, pas en
admin — l'interface d'administration masque le bouton d'action). Un bouton **« En savoir plus »**
doit apparaître sous la couverture, et le mener sur `prestiapp.fr`.

### 1.4 Réglages à ne pas oublier

- **Messagerie** : activer la réponse automatique d'absence (« Message bien reçu, je réponds dans la journée »). Une Page qui ne répond pas affiche publiquement un mauvais délai de réponse.
- **Rôles** : le profil personnel reste **administrateur** ; ne pas publier sous le profil personnel.
- **Avis / Recommandations** : les **laisser ouverts**, mais ne jamais en solliciter de complaisance. Zéro avis vaut mieux qu'un faux.
- **Ne pas** cocher les cases publicitaires ni accepter d'offre de boost tant que le budget n'est pas décidé (§5 H5 du plan).

---

## 2. Les trois variantes (§2.2)

Les trois visent des angles différents : **la scène vécue**, **la démonstration**, **la parole du
fondateur**. Ne pas les publier à la suite : en choisir une, laisser passer 5 à 7 jours avant
d'essayer la deuxième.

Le compte de caractères indiqué est celui de **la première ligne** — les ~125 premiers caractères (repère empirique Facebook, non vérifiable dans le dépôt — à recontrôler dans l'aperçu au moment de publier)
sont ce que Facebook montre avant le « voir plus » sur mobile. Chaque accroche tient dedans et se
lit seule.

---

### Variante A — la scène vécue

Visuel conseillé : `public/promo/presti-carre.mp4` (format 4:5, prend le plus de hauteur dans le fil).

```
18 h 47. Une demande de devis arrive. Vous êtes sur un toit, les mains prises. Vous répondrez ce soir.

Ce soir, vous rentrez à 20 h 30 et vous répondez.
Le client vous dit qu'il a déjà eu deux autres artisans dans la journée.
Le lendemain vous envoyez votre devis, et il a signé ailleurs.

Ce n'est ni votre prix ni votre travail. L'autre a juste répondu avant vous.

Presti fait trois choses pendant que vous travaillez :

Vos clients écrivent sur une page à votre nom, sur votre nom de domaine. L'assistant leur pose les questions qui manquent et prépare la réponse dans votre façon d'écrire.

Quand le besoin est clair, il chiffre le devis sur vos prix dès que vous les avez saisis, et sur les ordres de grandeur du marché pour le reste. Il le laisse en brouillon.

Si le client ne donne plus signe de vie, les relances partent toutes seules.

Vous, vous relisez et vous envoyez : aucune réponse ne part sans votre clic. Seuls l'accusé de réception et les trois relances partent tout seuls — c'est fait pour.

Ce que ça change : le soir, vous n'êtes plus devant une page blanche. Tout est déjà écrit, il reste à valider.

Essai gratuit : 3 crédits, sans carte bancaire.
https://prestiapp.fr/a/facebook
```

**Accroche : 102 caractères.** (limite de sécurité : 125)
Un seul appel à l'action, le lien en dernière ligne, aucun emoji.

---

### Variante B — la démonstration par le produit

Visuel conseillé : `public/promo/presti-carre.mp4`, ou à défaut les captures `public/demo/scene-1.webp`
à `scene-5.webp` en carrousel (ce sont des captures du vrai produit, compte de démonstration).

```
22 h 14, une demande arrive. 7 h 30, le devis est prêt sur vos prix. Voilà ce que Presti fait entre les deux.

22 h 14 — le client écrit sur votre page Presti. Il voit tout de suite que son message est bien reçu.

22 h 14 — l'assistant prépare la réponse : les questions qui manquent, la surface, l'accès, le délai. Dans votre façon d'écrire, pas dans la sienne.

22 h 17 — le besoin est assez clair. Il monte le devis — sur vos prix pour ce que vous avez saisi, sur les ordres de grandeur du marché pour le reste — et le laisse en brouillon.

7 h 30 — vous ouvrez votre téléphone. La réponse est écrite, le devis est chiffré. Vous corrigez une ligne, vous envoyez.

Ce qu'il y a dans la boîte :

Une page de conversation à votre marque, sur votre nom de domaine — et un site vitrine avec.

Devis, factures et facture électronique, depuis la même conversation.

Des relances qui partent toutes seules, et que vous coupez quand vous voulez.

Ce que ça change : plus une seule demande qui dort jusqu'au lendemain soir. Et si vous voulez que l'assistant réponde en direct sans vous attendre, ça existe aussi, à partir de la formule Studio.

Essai gratuit : 3 crédits, sans carte bancaire.
https://prestiapp.fr/a/facebook
```

**Accroche : 109 caractères.** (limite de sécurité : 125)
Un seul appel à l'action, le lien en dernière ligne, aucun emoji.

---

### Variante C — la parole du fondateur

Visuel conseillé : `public/promo/presti-vertical.mp4` en Reel, ou une photo simple. Cette variante
tient debout sans vidéo — c'est celle qui va le plus loin en franchise, elle n'a pas besoin de décor.

```
Je m'appelle Benjamin, j'ai créé Presti tout seul, et je n'ai encore aucun artisan client.

Je ne vais donc pas vous montrer de témoignages : je n'en ai pas.
Je ne vais pas vous sortir de pourcentages : je n'ai rien mesuré.
Je peux juste vous dire ce que le logiciel fait, et vous laisser juger.

Ce que Presti fait :

Vos clients vous écrivent sur une page à votre nom. L'assistant prépare la réponse dans votre façon de parler, vous la relisez, vous l'envoyez.

Il chiffre le devis, en brouillon. Aucune réponse ni aucun devis ne part sans votre clic ; l'accusé de réception et les relances, eux, partent seuls.

Il relance tout seul les clients qui ne répondent plus.

Ce qu'il ne fait pas, et je préfère le dire tout de suite : il ne décroche pas le téléphone, il n'envoie pas de SMS et il ne va pas sur WhatsApp. C'est de l'écrit — votre page, et votre boîte mail.

Ce que ça change pour vous : vous arrêtez de répondre aux demandes à 22 h, et vous arrêtez d'en perdre parce que vous étiez sous un évier.

Ce que je cherche : des artisans qui l'essaient pour de vrai et qui me disent ce qui cloche. L'essai fait 3 crédits, sans carte bancaire. Ensuite c'est 29 € par mois, sans engagement. Je réponds moi-même aux messages.

https://prestiapp.fr/a/facebook
```

**Accroche : 90 caractères.** (limite de sécurité : 125)
Un seul appel à l'action (« essayez et dites-moi ce qui cloche »), le lien en dernière ligne, aucun emoji.

---

## 3. Check-list de publication (§2.3)

### Avant de cliquer sur « Publier »

**Le lien, d'abord — c'est ce qui casse le plus silencieusement.**

1. Le code d'apport `facebook` existe, `actif = true`, **et `canal = true`** — ce dernier drapeau est créé par la migration `0086`. Sans lui, chaque inscription venue de Facebook ouvre **20 % de commission** au relevé du partenaire (`lib/direction/apports.ts` → `verdict()`). *Fait le 08/09 à 23:23 : les deux codes sont posés et marqués.*
   Dans `/controle` → **Clients**, la colonne « Arrivé par » doit afficher **`Facebook — canal d'acquisition`** avec une pastille **« canal »**, et surtout **pas** de pastille « prouvé ».
2. **Les quatre portes muettes de `/a/facebook`.** La route redirige vers l'accueil sans rien poser, et sans rien dire, dans quatre cas : code inconnu (l. 32), drapeau `apports` baissé (l. 24), IP bannie (l. 25), et **plus de 30 passages par heure depuis la même IP** (l. 27). Le dernier est le seul qui frappe *quand la publication marche* : derrière une IP partagée (4G, réseau d'entreprise), les visiteurs suivants ne sont plus attribués. **Le compte d'inscriptions venues de Facebook est donc un plancher, pas un total.**
3. Ouvrir `https://prestiapp.fr/a/facebook` **en navigation privée** : on doit arriver sur la page d'accueil de Presti (redirection 302), sans erreur, sans page intermédiaire.
4. **Passer le lien au Sharing Debugger de Facebook** (`developers.facebook.com/tools/debug/`) **une fois, avant la première publication**. `/a/facebook` ne rend aucun HTML — c'est un 302 — donc l'aperçu dépend de la façon dont le robot suit la redirection. Regarder quelle carte remonte plutôt que de la supposer.
3. Aller jusqu'au bout d'une inscription de test depuis cette même fenêtre privée, puis vérifier dans `/controle` → **Clients** que le canal d'arrivée affiche bien `facebook`. **Supprimer ensuite ce compte de test.** Sans cette vérification faite une fois, la première campagne ne se mesure pas.
4. Savoir ce qui est mesuré : le lien **ne compte pas les clics**. Il pose une empreinte signée valable 90 jours, relue **une seule fois, à l'inscription** (`lib/apports.ts:6-13`). L'indicateur réel est donc « **nombre d'inscriptions attribuées à `facebook`** », pas « nombre de clics ». Ne pas attendre du Poste de contrôle un chiffre de clics : il n'en produit pas.

**Le texte.**

5. Copier la variante depuis le bloc de code, la coller dans Facebook, puis **relire dans l'aperçu mobile** : la première ligne doit se lire **entière** avant le « voir plus ». Si Facebook coupe au milieu, raccourcir l'accroche, ne pas la déplacer.
6. Vérifier qu'il ne reste **qu'un seul lien** dans la publication, en dernière ligne. Si Facebook génère un aperçu de lien sous le texte, c'est bien — mais alors ne pas ajouter un deuxième lien ailleurs.
7. Relire à voix haute. Si une phrase ne se dit pas comme on parle sur un chantier, la couper.
8. Passer la liste noire du §0 : aucun pourcentage, aucun témoignage, aucun « ils nous font confiance », aucun SMS/WhatsApp/Instagram, aucun « répond tout seul » sans « à partir de Studio ».

**Le visuel.**

9. Regarder la vidéo **son coupé**, sur téléphone : les sous-titres doivent être lisibles seuls, rien de coupé en haut ni en bas.
10. Vérifier qu'**aucune donnée réelle** de client ou d'artisan n'apparaît dans la vidéo ni dans les captures — compte de démonstration uniquement.

**Le produit, enfin.**

11. Ouvrir `https://prestiapp.fr/signup` et vérifier que l'inscription fonctionne **le jour même**. Envoyer du monde sur un tunnel cassé coûte plus cher que ne pas publier.
12. Publier **depuis la Page**, pas depuis le profil personnel (vérifier le sélecteur « Publier en tant que »).
13. Bloquer une heure après la publication pour répondre aux commentaires. Un commentaire sans réponse dans l'heure est une demande perdue — c'est exactement ce qu'on reproche au reste du monde dans le texte.

### Après avoir publié

14. Noter **immédiatement** dans le journal du dépôt : **date, heure exacte, variante utilisée (A, B ou C), format du visuel, lien de la publication**. Sans l'heure exacte, aucune comparaison n'est possible entre deux publications.
15. À **24 h** puis à **7 jours**, relever et noter : inscriptions attribuées à `facebook` dans le Poste de contrôle, commentaires reçus, questions qui reviennent, partages. Les questions qui reviennent sont la matière de la publication suivante.
16. **Ne jamais supprimer un commentaire négatif** ni un sceptique sur l'IA : y répondre, calmement, avec ce que le produit fait vraiment. Supprimer, c'est ce qui se voit.
17. Ne pas publier la deuxième variante avant **5 à 7 jours**. Trois publications identiques en trois jours détruisent la portée de la Page.
18. Si une affirmation du texte devient fausse (une offre change, un drapeau bascule dans `lib/flags.ts`), **modifier ou supprimer la publication**. Une promesse publiée survit à un déploiement, pas à la loi.

# LinkedIn — le profil d'abord, puis les trois variantes

## 0. Le profil — état au 2026-09-09 après passage

| | |
|---|---|
| **Titre** → « Fondateur chez Presti » | ✅ **fait** (était « Sans-emploi chez Microsoft ») |
| **Expérience** → Fondateur · Presti · Indépendant · sept. 2026 · La Rochelle | ✅ **fait** |
| **Expérience « Sans-emploi chez Microsoft »** | ✅ **supprimée** (elle était fausse, et c'est elle qui fabriquait le titre) |
| Cookies non essentiels | ✅ refusés |
| **À propos** | ❌ **à coller à la main** — texte ci-dessous |
| **URL personnalisée** `benjaminfiliot` | ❌ à faire |
| **Photo de profil** | ❌ à faire (je n'en fabrique pas) |

> **Ce que LinkedIn ne laisse pas automatiser**, mesuré et pas supposé :
> - Les champs **contenteditable** (titre, À propos, corps du post) affichent le texte saisi mais
>   **n'enregistrent pas** : l'état interne de React n'est pas mis à jour par une saisie
>   programmatique. Le titre n'a été corrigé qu'en **changeant sa source** (l'expérience), pas en
>   écrivant dans le champ.
> - Le champ de fichier de la vidéo vit dans un **shadow DOM**
>   (`#media-editor-file-selector__file-input`) : inatteignable, et cliquer sur « Vidéo » ouvrirait
>   une boîte de dialogue système impilotable.
> - Le composeur ne s'ouvre pas de façon fiable depuis l'automatisation.
>
> ⇒ **Le post se publie à la main.** Tout le texte est prêt ci-dessous.

## 0 ter. Le texte à coller dans le profil

Le compte existe : **`linkedin.com/in/benjamin-filiot-5a94b7435`**, nom correct, localisation
« La Rochelle, Nouvelle-Aquitaine » correcte. Mais il porte le titre par défaut de l'inscription :

> ### ⛔ « Sans-emploi chez Microsoft »

Les trois variantes sont écrites **à la première personne, par le fondateur de Presti**. Publiées
sous ce titre-là, elles se contredisent d'elles-mêmes : le lecteur lit une position de fondateur
signée par un sans-emploi de Microsoft, et il passe. C'est **le seul vrai bloquant** de la partie
LinkedIn — le reste du profil peut rester vide au début, pas celui-là.

Aucune photo, aucun « À propos », aucune expérience non plus. Voici les quatre blocs à coller.

**① Titre** (220 caractères max) — dit ce qu'il fait et pour qui, sans promettre de mécanisme :

```
Je construis Presti — pour qu'un artisan ne perde plus un chantier parce qu'il était sur un toit.
```

**② À propos** — à la première personne, rien qui ne soit vrai :

```
Je développe Presti, un assistant pour les artisans du bâtiment.

Le problème est simple : une demande de devis arrive à 18 h, l'artisan est sur un chantier les mains prises, il rappelle le soir — et le client a déjà signé ailleurs. Ce n'est ni son prix ni son travail qui lui a coûté le chantier, c'est le délai.

Presti donne à l'artisan une page à son nom où ses clients écrivent. L'assistant pose les questions qui manquent, prépare la réponse dans sa façon d'écrire, et chiffre le devis. L'artisan relit et envoie : rien ne part sans lui tant qu'il n'a pas choisi le contraire. Devis, factures, relances et site vitrine au même endroit.

Je code le produit et je parle aux artisans. Si vous en êtes un, ou si vous en connaissez : écrivez-moi, les retours de terrain valent plus que mes suppositions.

prestiapp.fr
```

**③ Expérience** — la seule ligne à créer :

| Champ | Valeur |
|---|---|
| Intitulé du poste | `Fondateur` |
| Type d'emploi | `Indépendant` |
| Nom de l'entreprise | `Presti` |
| Lieu | `La Rochelle, Nouvelle-Aquitaine, France` |
| Date de début | **septembre 2026** (l'entreprise est immatriculée au RNE le **1er septembre 2026**) |
| Poste actuel | coché |

> ⚠️ Et **supprimer la ligne « Microsoft »** créée par l'inscription. Une expérience inventée sur un
> profil qui vend un produit fondé sur l'anti-fabrication, c'est le pire endroit possible pour ça.

**④ URL personnalisée** — Profil public et URL → Modifier :

```
benjaminfiliot
```

Soit `linkedin.com/in/benjaminfiliot` au lieu de `benjamin-filiot-5a94b7435`. C'est l'adresse que
tu colleras partout ensuite ; elle ne se change pas facilement une fois qu'elle circule.

**⑤ Photo de profil** — je n'en ai pas, et je n'en fabrique pas. Un portrait net, cadré au visage,
fond neutre. Sur LinkedIn, un profil sans photo est le premier motif de non-lecture d'un post.

---

## 0 bis. Ce que je recommande de publier

**La variante 1 (« Zéro artisan abonné »)**, pour trois raisons : c'est la seule qui n'a rien à
prouver — elle raconte un état de fait vérifiable ; elle donne au lecteur une raison de répondre
plutôt que de faire défiler ; et elle vieillit bien, tant qu'elle est publiée **avant** le premier
abonné. Vérifier le compteur dans le Poste de contrôle le matin même : sa première ligne devient
fausse le jour où quelqu'un souscrit.

La variante 3 (le chiffre HBR) est la plus solide sur le fond mais la plus froide, et elle demande
d'assumer un chiffre en commentaire. La variante 2 est la meilleure si tu veux parler produit.

**L'ordre de publication, une fois le profil corrigé :**

1. Téléverser `public/promo/presti-paysage.mp4` en **natif** (pas un lien).
2. Coller le texte de la variante retenue. **Aucun lien dans le corps.**
3. Publier.
4. **Dans la minute**, poster le premier commentaire (ci-dessous) — c'est lui qui porte le lien.
5. Noter l'heure exacte dans le journal.

---

## Les trois variantes, le premier commentaire, cinq réponses type

> Rédigé le 2026-09-08. Support : **vidéo téléversée en natif**, paysage 16:9 (`public/promo/presti-paysage.mp4`, 40,2 s, 1920×1080, 30 fps, 4,5 Mo — vérifié à l'`ffprobe`). Pas de lien YouTube, **aucun lien dans le corps du post** : LinkedIn dégrade la portée des liens sortants. Le lien part en **premier commentaire**, posté dans la minute qui suit la publication.
>
> Contraintes tenues sur les trois : accroche dans les **200 premiers caractères** (avant « voir plus »), **1 300 caractères** maximum, un seul appel à l'action, zéro emoji, zéro hashtag.
>
> **Toutes les affirmations produit sont vérifiables dans le dépôt** — le tableau de sourçage est en fin de section. Aucun chiffre d'usage, aucun témoignage, aucune note : il n'y a pas encore d'artisan abonné, et les textes le disent au lieu de le cacher.

## Variante 1 — « Zéro artisan abonné » (l'aveu du constructeur)

*Angle : le fondateur qui ouvre son compteur à zéro. Cible : dirigeants, et les artisans qui reconnaissent la scène de 18 h 47. Objectif : commentaires.*

```
Zéro artisan abonné à Presti aujourd'hui. Je commence par là, c'est la première chose qu'on ira vérifier.

Je m'appelle Benjamin Filiot. J'ai passé ces derniers mois à construire un outil pour les artisans du bâtiment qui perdent des chantiers parce qu'ils répondent trop tard.

Le problème n'est pas technique. Un client écrit à 18 h 47, l'artisan est sur un toit, il rappelle à 20 h 30. Le client a déjà reçu deux devis.

Ce qu'il fait, concrètement :

→ une page de demande à votre marque, sur votre nom de domaine
→ l'assistant rédige la réponse dans votre ton, vous la relisez, vous l'envoyez
→ le devis est chiffré sur vos prix, complétés par les ordres de grandeur du marché, et il reste en brouillon
→ trois relances par email, à 2, 5 et 10 jours, qui s'arrêtent dès que le client répond sur votre page ou dès que vous reprenez la main

Il n'y a ni SMS, ni WhatsApp, ni Instagram : ça n'existe pas dans le produit, je ne le vendrai pas avant de l'avoir construit.

29 € par mois pour la formule d'entrée, et 3 crédits offerts pour juger sur vos vraies demandes, sans carte.

Il me manque une chose : des artisans qui me disent où ça coince chez eux. Si vous en connaissez un qui râle sur ses devis en retard, sa remarque m'intéresse plus que sa signature.

Sur combien de demandes reçues cette semaine avez-vous répondu le jour même ?

P.S. Le lien est en premier commentaire.
```

**Compte : 1 295 caractères. Accroche avant le « voir plus » : 105 caractères.**

## Variante 2 — « Par défaut, mon IA n'envoie rien » (la position contrariante)

*Angle : à contre-courant du marché, la retenue comme argument. C'est le mode réellement livré, pas une posture. Cible : dirigeants qui déploient de l'IA au contact client. Objectif : commentaires.*

```
Par défaut, l'IA que j'ai construite n'envoie rien. Elle rédige, l'artisan relit, l'artisan envoie. Le mode « répond tout seul » existe, il n'est pas coché à l'installation.

Ce choix m'a coûté des arguments de vente — je le garde quand même.

Un artisan qui découvre l'IA ne demande jamais si le modèle est puissant. Il demande : « et si ça raconte n'importe quoi à mon client ? » C'est une question de réputation. Dans un métier qui vit du bouche-à-oreille, une réponse à côté de la plaque se paie pendant des années.

Il y a trois modes de réponse dans les réglages, et celui coché à la création du compte est le mode assisté : l'assistant prépare, vous validez depuis vos conversations.

Même logique pour le devis. Il est chiffré tout seul — sur vos prix pour ce que vous avez saisi, sur les ordres de grandeur du marché pour le reste — et il reste en brouillon. Il ne part pas sans votre geste.

L'automatique complet arrive avec la formule Studio, à 59 € par mois, et il s'active le jour où la confiance est là. Pas à l'inscription.

Presti ne remplace pas l'artisan pendant qu'il est en hauteur. Le texte est déjà écrit quand il redescend, et c'est lui qui garde le dernier mot sur ce qui part à son nom.

Aux dirigeants qui mettent de l'IA au contact direct de leurs clients : vous démarrez en supervision, ou en autonomie ?
```

**Compte : 1 258 caractères. Accroche avant le « voir plus » : 173 caractères.**

## Variante 3 — « 7 fois » (le chiffre, avec sa source)

*Angle : le délai de première réponse comme fait commercial mesuré, puis la mécanique qui le raccourcit. Cible : dirigeants, direction commerciale. Objectif : enregistrements et repartages.*

```
7 fois. C'est l'écart mesuré par la Harvard Business Review entre une entreprise qui recontacte un prospect dans l'heure et une qui attend une heure de plus. 2 241 entreprises étudiées.

7 fois plus de chances d'obtenir un vrai échange avec un décideur. L'étude date de 2011 ; le téléphone des clients n'a pas ralenti depuis.

Pour un artisan du bâtiment, ce chiffre est une condamnation. Il est en hauteur, les mains prises, le téléphone dans la veste au sol. Son devis se joue pendant qu'il travaille.

Un logiciel de facturation range ce qui est arrivé jusqu'au bureau. Le chantier perdu, lui, n'y est jamais entré : il est resté dans un message sans réponse.

C'est ce trou que Presti essaie de boucher. La demande arrive sur une page à la marque de l'artisan. L'assistant rédige la réponse dans son ton, et l'artisan la relit avant qu'elle parte. Le devis est chiffré sur ses prix dès qu'il les a saisis, et sur les ordres de grandeur du marché pour le reste. Puis trois relances par email partent à 2, 5 et 10 jours, et elles s'arrêtent dès que le client répond sur la page ou dès que l'artisan reprend la main.

Rien là-dedans ne remplace un bon artisan. Ça fait que la réponse part le jour même, pas le lendemain soir.

Quel est votre délai réel de première réponse à une demande entrante ? Pas l'objectif. Le réel.

P.S. La vidéo fait 40 secondes, tout est écrit à l'écran : elle se lit sans le son.
```

**Compte : 1 292 caractères. Accroche avant le « voir plus » : 185 caractères.**

> Source de la variante 3, à avoir sous la main si on la demande en commentaire : James Oldroyd, Kristina McElheran et David Elkington, « The Short Life of Online Sales Leads », *Harvard Business Review*, mars 2011 — 2 241 entreprises américaines. Le facteur ≈ 7 porte sur la **qualification** du contact (obtenir un échange avec un décideur), pas sur la signature. Ne jamais l'arrondir vers le haut ni le transformer en « 7× plus de chantiers ».

## Le premier commentaire (à poster dans la minute, sur les trois variantes)

```
Le lien, pour ceux qui veulent regarder de plus près : https://prestiapp.fr/a/linkedin

L'essai donne 3 crédits sans carte bancaire — un crédit par réponse rédigée ou par devis chiffré, de quoi mener une vraie demande de bout en bout et juger le texte sur votre métier à vous. Si le résultat ne vous convainc pas, dites-le moi ici — ça m'est plus utile qu'un abonnement pris à l'aveugle.
```

Le `/a/linkedin` est le code d'apport du canal : il fait remonter les inscriptions venues de LinkedIn dans le Poste de contrôle. **À vérifier avant la publication** : que le code `linkedin` existe bien et que la colonne « canal d'arrivée » se remplit. Sans ça, la campagne ne se mesure pas.

## Ce que le `linkedin-humanizer` a relevé, et ce que j'en ai fait

Les deux compétences LinkedIn sont installées en **plugin** (`linkedin-skills:linkedin-post-writer`, `linkedin-skills:linkedin-humanizer`) et se sont chargées correctement. Le profil de voix (`references/voice-profile.md`) est **vide** (`filled: no`) : les brouillons suivent donc les règles génériques, pas la voix apprise de Benj. Les deux compétences sont écrites pour l'anglais ; je m'en suis servi comme grille de lecture, jamais comme gabarit.

**Corrigé après l'audit :**

| Point relevé | Où | Ce que j'ai fait |
|---|---|---|
| Parallélisme négatif (« pas X, mais Y ») — banni en dur, mesuré à −4,9 % de portée | V2 : « Je ne promets pas de remplacer l'artisan… Je promets que… » | Cassé en deux phrases non parallèles : « Presti ne remplace pas l'artisan pendant qu'il est en hauteur. Le texte est déjà écrit quand il redescend… » |
| Règle de densité : un seul contraste par post | V3 en comptait trois (« pas de signer : d'avoir la conversation », « ne règle pas ça : il range… », la chute) | Gardé la chute seule. Les deux autres réécrits en phrases affirmatives |
| Deux triades dans le même post | V3 : « en hauteur, les mains prises, le téléphone au sol » + « rédige, relit, envoie » | Gardé la première (sensorielle) ; la seconde devient « l'assistant rédige… et l'artisan la relit avant qu'elle parte » |
| Idem sur V2 | « rédige, relit, envoie » + l'énumération des trois modes | Énumération remplacée par le nombre seul : « il y a trois modes de réponse dans les réglages » |
| Contrôle 11 : aucun nombre à référent nommé | V2 n'avait aucun chiffre | Ajouté « trois modes » et « la formule Studio, à 59 € par mois » (deux faits vérifiables) |
| Contrôle 16 : le produit nommé plus d'une fois | V1 disait « Presti » deux fois | Ramené à une occurrence (« Ce qu'il fait, concrètement : ») |
| Zéro tiret cadratin est devenu un tell en soi (V3 de la compétence) | les trois textes n'en avaient aucun | Un seul ajouté, dans V2, là où l'incise est naturelle en français. Pas de quota au-delà : en français le deux-points et le point-virgule font le même travail |
| Longueur > 1 300 | V1 à 1 313, V3 à 1 337 | Coupé jusqu'à 1 295 et 1 292 |

**Écarté, avec la raison :**

- **« Ouvrir sur un nombre plutôt que sur une question » et le seuil de 210 caractères** : gardés, ils valent dans les deux langues. Mais la compétence conseille aussi 1 000 caractères minimum pour le bonus de portée ; c'est compatible avec la limite de 1 300 du prompt, les trois textes tiennent entre les deux.
- **La liste de vocabulaire à proscrire est anglophone** (*leverage, delve, robust, seamless, streamline*…). Sans équivalent utile en français, et les faux amis (« notamment », « concrètement », « significatif ») ne portent pas la même charge de langue de bois. Je n'ai pas traduit la liste ; j'ai appliqué la règle de fond — pas plus d'un mot abstrait par paragraphe sans un fait qui le paie.
- **« Ajouter un détail sensoriel à la première personne »** : partiellement écarté. Benj n'est pas artisan, il n'a pas de souvenir de toit. Inventer la scène vécue serait exactement la fabrication qu'on s'interdit. Les scènes restent à la troisième personne (« il est en hauteur, les mains prises ») ; le vécu à la première personne porte sur ce qu'il connaît vraiment : le compteur d'abonnés à zéro, le choix de réglage qui lui coûte des arguments de vente.
- **« Une contradiction ou une auto-correction chiffrée » (passe 3)** : écarté faute de matière honnête. Aucun historique d'usage, aucun chiffre d'avant/après. Le poser serait l'inventer.
- **Le détecteur voit « Pas l'objectif. Le réel. » comme un début d'empilement de fragments.** Gardé : deux fragments, c'est exactement le plafond de la règle, et en français cette chute sonne juste. À ne pas rallonger d'un troisième.
- **Hashtags (0 à 2 tolérés)** : zéro. Le prompt interdit déjà le bruit, et sur un premier post d'un compte sans audience les hashtags n'apportent pas de portée.
- **Le « comment-gate »** (« commentez X et je vous envoie Y ») : jamais. C'est la cible déclarée de la mise à jour d'authenticité de LinkedIn, et ce n'est pas la manière dont on veut vendre.

**Blocages restants : aucun.** Les trois textes passent les sept contrôles bloquants (densité de tirets, lien dans le corps, longueur, ouverture interdite, clôture cliché, paragraphe saturé de marqueurs, LinkedIn dénigré sur LinkedIn).

## Cinq réponses type aux commentaires

Courtes, honnêtes, sans promesse. Chacune tient un fait vérifiable ; si la question sort de ces cinq cas et qu'on ne sait pas, la bonne réponse est « je ne sais pas encore », pas une improvisation.

**1. « C'est combien ? »**

```
Trois formules : Essentiel 29 € par mois (80 crédits), Studio 59 € (250 crédits), Signature 99 € (600 crédits). Un crédit = une réponse rédigée ou un devis chiffré ; le modèle Expert, réservé à Signature, en coûte trois. Sans engagement, et TVA non applicable (art. 293 B du CGI) : le prix affiché est le prix payé. L'essai donne 3 crédits sans carte.
```

**2. « Est-ce que ça marche pour mon métier ? »**

```
Huit métiers ont leur propre profil dans l'assistant : plombier, électricien, menuisier, maçon, peintre, carreleur, couvreur, paysagiste. Chacun avec son vocabulaire, les questions qui font avancer un chiffrage, les pièges à éviter et le taux de TVA courant. Les autres tournent sur un profil générique. Le plus honnête que je puisse dire : prenez les 3 crédits d'essai, donnez-lui une vraie demande de votre semaine. Si le devis est à côté, vous l'aurez vu en cinq minutes et ça ne vous aura rien coûté.
```

**3. « L'IA va raconter n'importe quoi à mes clients. »**

```
C'est pour ça qu'elle n'envoie rien par défaut. Le mode coché à la création du compte s'appelle « Assistée » : l'assistant prépare la réponse, elle attend dans vos conversations, rien ne part tant que vous n'avez pas cliqué. Le devis, pareil : il est chiffré sur vos prix complétés par le marché, et il reste en brouillon. L'envoi automatique existe à partir de la formule Studio (59 € par mois) : il s'active le jour où vous le décidez, et vous pouvez le rebasculer.
```

**4. « Il faut déjà avoir un site ? »**

```
Non. Un site vitrine est compris dès l'essai, et vous pouvez y brancher votre propre nom de domaine sans supplément chez nous (le nom de domaine reste celui que vous achetez chez votre registraire) — la page où vos clients écrivent aussi. Si vous avez déjà un site et que vous y tenez, gardez-le : il suffit d'y poser le lien de votre page de demande, le reste fonctionne pareil.
```

**5. « Mes données, elles vont où ? »**

```
La base est hébergée en Europe, à Francfort. Cloisonnement par compte appliqué par la base elle-même, mots de passe hachés, double authentification disponible. Personne chez nous ne lit vos conversations : pour qu'on regarde un devis pendant une panne, il faut votre clic, la fenêtre dure une heure et se referme seule, et chaque coup d'œil est écrit dans votre espace. Export et suppression du compte en libre-service. Le détail est sur la page Confidentialité du site.
```

## Sourçage — chaque affirmation, et où elle se vérifie

| Ce qui est écrit | Où c'est vrai dans le dépôt |
|---|---|
| L'assistant rédige, l'artisan envoie (mode assisté par défaut) | `lib/plateformeConfig.ts:45` (`mode_reponse: 'assistee'`) et `app/plateforme/Reglages.tsx:47` (« Rien ne part sans vous ») |
| Trois modes de réponse | `app/plateforme/Reglages.tsx:11` (`'auto' \| 'assistee' \| 'manuelle'`) |
| L'envoi automatique à partir de Studio | `lib/plans.ts:44` (`plateforme.ia.auto` dans `STUDIO`) |
| Le devis est chiffré et reste en brouillon | `lib/plateformeConfig.ts:50` (`devis_auto: 'brouillon'`) |
| Chiffré sur les prix de l'artisan | `lib/plans.ts:39` (`devis.prix_artisan` dans `BASE`) |
| Trois relances à 2, 5 et 10 jours, arrêtées dès la réponse | `app/api/leads/contact/route.ts:92` (`[2, 5, 10]`) et `app/api/cron/relances/route.ts` (annulation dès que `statut !== 'repondu'`) |
| Page de demande à la marque, sur le nom de domaine de l'artisan | `lib/plans.ts:37-38` (`plateforme.conversation`, `plateforme.domaine_perso`, `site.domaine_perso` dans `BASE`) |
| Site vitrine compris dès l'essai | `lib/plans.ts:38` (`site.essentiel` dans `BASE`, capacités du plan `gratuit`) |
| Ni SMS, ni WhatsApp, ni Instagram | `lib/flags.ts:68-70` (`canauxWhatsapp: false`, `canauxReseaux: false`) ; aucune capacité SMS n'existe |
| 29 / 59 / 99 € et 80 / 250 / 600 crédits | `lib/plans.ts:59-61` |
| Le modèle le plus puissant coûte 3 crédits | `lib/plans.ts:67` (`CREDIT_COST.expert = 3`) |
| 3 crédits d'essai, sans carte | `lib/plans.ts:58` (`gratuit`, `creditsMois: 3`, `prixMois: 0`) |
| TVA non applicable, art. 293 B | `app/page.tsx:161` |
| Huit métiers avec leur profil | `lib/ai/metiers.ts:12` (les huit identifiants + `generique`) et le bloc `PROFILS_METIER` (vocabulaire, questions, pièges, unités, TVA) |
| Base à Francfort, transferts encadrés | `app/confidentialite/page.tsx` §4 (Supabase, Francfort, UE) |
| Mots de passe hachés, 2FA, cloisonnement par compte | `app/confidentialite/page.tsx` §7 ; `lib/flags.ts:25` (`mfa: true`) |
| Export et suppression en libre-service, 30 jours de grâce | `app/confidentialite/page.tsx` §5 et §6 |
| Fenêtre de support d'une heure ouverte par l'artisan, chaque lecture tracée | `lib/flags.ts:48` (`supportArtisan: true`) et `app/page.tsx:132-134` |
| Vidéo paysage : 40,2 s, 1920×1080, 30 fps | `ffprobe public/promo/presti-paysage.mp4` |

## Avant de publier — la liste courte

1. Téléverser `public/promo/presti-paysage.mp4` en **natif** (ne pas coller un lien).
2. Relire le texte à l'écran sur téléphone, son coupé : c'est ainsi que la vidéo se lit dans le fil.
2 bis. **Publier depuis le profil personnel Benjamin Filiot, pas depuis une page entreprise** : les trois variantes sont écrites à la première personne. (C'est l'inverse de Facebook, où l'on publie depuis la Page.)
2 ter. Si la **variante 1** est retenue, revérifier le matin même le compteur d'abonnés dans le Poste de contrôle : sa première ligne (« zéro artisan abonné ») devient fausse le jour où le premier signe, et c'est le pivot de tout le post.
3. Choisir **une** variante. Ne pas publier les trois : garder les deux autres pour les semaines suivantes, en changeant l'angle à chaque fois.
4. Vérifier que le code d'apport `linkedin` existe dans le Poste de contrôle **avant** de publier.
5. Publier, puis poster le premier commentaire dans la minute.
6. Noter dans le journal : date, heure exacte, variante retenue, format. Sans ça, la deuxième publication ne saura rien de la première.
7. Rester une heure sur le post pour répondre : les réponses de l'auteur dans la première heure comptent plus que le texte lui-même.

---

# Instagram — le compte de l'agence converti en compte Presti (2026-09-09)

Benj a choisi la conversion assumée (option **B**) : `@prem_iumagence`, le compte de son agence,
**devient** le compte Presti. L'agence perd son compte Instagram — c'était le prix annoncé, et
il l'a accepté explicitement. Le compte n'avait **0 publication** : rien d'ancien à effacer, aucune
incohérence à assumer devant un visiteur.

## Ce qui est fait, et vérifié sans session

Vérifié dans le navigateur intégré de l'app, qui n'a aucune session Instagram — c'est-à-dire ce
que voit un artisan qui tombe sur le profil, pas ce que montre mon propre écran d'admin (la règle
apprise sur la Page Facebook, cf. `1.3 bis`).

| Champ | Valeur |
|---|---|
| Nom de profil | `prestiapp` — libre, et calé sur le domaine `prestiapp.fr` |
| Nom | `Presti · Assistant artisans` |
| Photo | `public/marque/presti-icone-512.png` |
| Bio (132/150) | *L'assistant des artisans du bâtiment. / La réponse et le devis prêts pendant que vous êtes sur le chantier. / Essai gratuit, sans carte.* |
| Catégorie | `Produit/service`, non affichée sur le profil |
| Publications | 0 |

⚠️ **Le nom ne se change que deux fois par 14 jours** (Instagram le dit dans la boîte). Une des deux
est consommée depuis le 09/09.

## Ce qui reste, et que je ne peux pas faire

**1. Le lien de la bio — pour Benj, sur son téléphone.** Le champ « Site Web » affiche encore
`premiumagence.netlify.app` et Instagram le grise sur le web : « *La modification des liens est
disponible uniquement sur mobile.* » Dans l'app Instagram → Modifier le profil → Liens :

```
https://prestiapp.fr/a/instagram
```

**À faire APRÈS le collage de `_A_COLLER_sql_editor_0087_NU.sql`**, pas avant. Le lien fonctionne
dans les deux cas — `app/a/[code]/route.ts` renvoie à l'accueil quoi qu'il arrive — mais tant que le
code `instagram` n'existe pas en base, il redirige **sans poser d'empreinte** : la colonne « Arrivé
par » du Poste de contrôle affichera « Organique » pour tout le monde, et on ne saura jamais ce
qu'Instagram a rapporté.

**2. L'adresse e-mail professionnelle — décision de Benj, pas de moi.** Le champ existe
(Paramètres → Compte professionnel) et ajoute un bouton « E-mail » sur le profil. Je ne l'ai pas
rempli, parce que les deux réponses possibles ont un défaut et que le choix lui appartient :

- `contact@prestiapp.fr` **ne reçoit rien** — le domaine signe les envois chez Resend, aucune boîte
  n'existe derrière, un message de test y rebondit. Un bouton « E-mail » vers cette adresse enverrait
  les prospects dans le vide ;
- `benjaminfiliot@gmail.com` est la boîte réellement relevée par le Poste de contrôle — mais c'est
  son adresse personnelle, et le bouton la rend publique.

La troisième voie, la bonne à terme : ouvrir une vraie boîte derrière `contact@prestiapp.fr`.

## Ce que ce compte n'est pas encore

Un compte à 0 publication avec 6 abonnés ne démarche personne. La conversion **rend le compte
utilisable** ; elle ne remplace pas un plan de contenu. Les trois vidéos (`presti-vertical.mp4` en
9:16 pour les Reels, `presti-carre.mp4` en 4:5 pour le fil) sont prêtes dans `public/promo/` et
se téléversent **depuis le téléphone** — l'automatisation ne passe pas, ni ici ni ailleurs
(cf. le journal du 09/09).
