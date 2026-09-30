# Script d'appel : le site à 300 €, artisans autour de Marans

Appels du **samedi 26 septembre 2026**, en soirée. La liste est dans `liste.csv` (même dossier). Colonnes utiles : `priorite` (A, B, C), `metier`, `commune`, `constat_site`.

Tout ce qui est promis ici est écrit dans le produit : `lib/siteCommande.ts`, la page `/site/commander` et les CGU (article 3 bis). Rien de plus.

---

## 0. Avant de composer

- **Numéro non masqué.** Appelle depuis le 06 30 78 16 47, celui des mentions légales. Le prospect peut rappeler et vérifier qui tu es.
- **Ouvre sa ligne** : priorité, métier, commune, `constat_site`.
- **Pour un B** : ouvre son site sur ton téléphone, 20 secondes. Tu ne dis que ce que tu as vu toi-même.
- **Piège annuaire RGE.** Sur 49 des 70 B (7 sur 10), le champ `site` de `liste.csv` n'est pas le site de l'entreprise : c'est sa fiche sur `qualit-enr.org/entreprises/...`, l'annuaire du label RGE, et `constat_site` dit juste « répond avec HTTP 403 » (l'annuaire bloque les robots, ça ne dit rien du vrai site). Si le lien contient `qualit-enr.org` : tu n'as **aucune preuve** d'un vrai site. Traite l'appel comme un A (accroche « je n'ai pas trouvé le vôtre »— voir 2.1), et ne dis jamais avoir regardé « son » site.
- **Maquette.** Pour les 25 dossiers de `maquettes/`, il n'existe **pas de lien en ligne** : seulement deux images locales par dossier (`capture-bureau.jpg`, `capture-telephone.jpg`, dossiers marqués « Maquette privée » dans `maquettes/generation.log`). Aie les deux images sous la main (ex. dans les photos de ton téléphone) ; tu les enverras en pièce jointe, pas comme un lien. Le prospect n'a pas de maquette dans les 25 ? Ne dis pas qu'elle existe. Dis : « je vous la prépare et je vous l'envoie [jour] ».
- **Les C** (site correct, 5 lignes) : en dernier, et sans l'argument « site vieillot ».
- **Attention, lien de commande.** `prestiapp.fr/site/commander` **ne marche pas pour quelqu'un qui n'a pas de compte** : la page reste bloquée sur « Chargement… ». Constaté en ligne le 25/09 à 22 h 40, sans session. Donne toujours ce chemin : **prestiapp.fr/signup, puis « Commander mon site » dans le menu**.

---

## 1. Les règles (5 lignes)

1. **Tu te présentes d'abord** : ton nom, Presti, le but commercial de l'appel et l'origine du numéro (l'annuaire public des entreprises RGE de l'ADEME). Base : art. L. 221-16 c. conso, obligatoire envers un consommateur et appliqué ici à tout le monde ; art. 14 RGPD, qui impose de donner la source des données au plus tard au premier contact.
2. **Bloctel est fini.** Depuis le 11 août 2026, on ne peut plus appeler un *consommateur* sans son accord préalable (art. L. 223-1 c. conso, modifié par la loi n° 2025-594 du 30 juin 2025, art. 13 ; décret n° 2026-662). **L'exception :** un artisan appelé sur son numéro pro, pour son activité, n'est pas un consommateur (article liminaire du code). Pas besoin de son accord préalable, à condition que l'offre touche son métier (CNIL : intérêt légitime, art. 6.1.f RGPD). S'il dit « c'est mon numéro perso » : tu t'excuses et tu raccroches.
3. **Le droit d'opposition est absolu et gratuit** (art. 21 RGPD ; art. L. 221-16 : « met fin sans délai à l'appel »). S'il dit « ne m'appelez plus » : tu confirmes, tu raccroches, statut *opposition*. Plus jamais d'appel, de SMS ni d'e-mail.
4. **Les heures.** Les créneaux légaux visent les consommateurs (art. D. 223-9 c. conso : du lundi au vendredi, 10 h-13 h et 14 h-20 h, pas les jours fériés, 4 appels au plus en 30 jours). Samedi est hors de ces créneaux. C'est légal ici seulement parce que tu appelles des pros sur leur ligne pro. Donc : appels courts, **jamais après 20 h**, **4 essais au plus par numéro en 30 jours**, et tu proposes de rappeler en semaine.
5. **Rien par écrit sans son oui.** La maquette part par SMS ou par e-mail seulement après un « oui, envoyez-moi » (art. L. 34-5 CPCE). Le message porte ton identité et un moyen simple de dire stop.

Sources vérifiées le 25/09/2026 :
- [art. L. 223-1 c. conso, version du 11/08/2026](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051830285/2026-08-11)
- [loi n° 2025-594, art. 13](https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000051824325)
- [décret n° 2026-662](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054483939)
- [art. D. 223-9](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054491498/2026-08-11)
- [art. L. 221-16](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155918/)
- [CNIL, prospection par téléphone](https://www.cnil.fr/fr/prospection-commerciale-par-telephone-hors-automate-dappel-quelles-sont-les-regles)
- [CNIL, prospection par SMS et e-mail](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)

Cités de mémoire, non relus ce soir (ces textes n'ont pas bougé depuis des années) : l'article liminaire du c. conso, les art. 6, 14 et 21 RGPD, l'art. L. 34-5 CPCE et l'art. L. 221-3 c. conso.

---

## 2. Le script

### 2.1 L'accroche (15 secondes)

**A : pas de site connu**

> « Bonjour, Benjamin Filiot, de Presti, à Marans. C'est un appel commercial, je fais court. J'ai eu votre numéro dans l'annuaire RGE de l'ADEME. Je fais des sites pour les artisans du coin, et je n'ai pas trouvé le vôtre. Je me trompe ? »

*« Pas de site connu » veut dire : rien dans les fichiers de l'ADEME. Il en a peut-être un. D'où la question.*

**B : site vieillot**

> « Bonjour, Benjamin Filiot, de Presti, à Marans. C'est un appel commercial, je fais court. J'ai eu votre numéro dans l'annuaire RGE de l'ADEME. Je fais des sites pour les artisans du coin. J'ai regardé le vôtre sur mon téléphone : [constat]. Vous le saviez ? »

| `constat_site` contient | Tu dis (seulement si tu l'as vu toi-même) |
|---|---|
| ne répond pas | « il ne s'ouvre pas » |
| pas de HTTPS | « le navigateur affiche "non sécurisé" » |
| pas de balise viewport | « il s'affiche en tout petit, il faut zoomer » |
| copyright 20xx | « il n'a pas bougé depuis 20xx » |

Ce tableau ne couvre que ces quatre cas — il laisse dehors 55 des 70 B (HTTP 403, 404, 500, 503 : la majorité). Si `constat_site` dit autre chose, ou si le lien est une fiche `qualit-enr.org` (voir ci-dessus) : tu n'as rien de fiable à réciter. Ouvre le lien toi-même sur ton téléphone avant l'appel ; s'il ne s'ouvre pas ou que ce n'est pas le site de l'entreprise, utilise l'accroche A.

**Ensuite, dans les deux cas :**

> « Vous avez deux minutes, ou je vous rappelle à un meilleur moment ? »

- « Rappelez-moi » : « Quel jour, quelle heure ? » Statut *rappeler*.
- « Non merci » : sortie polie (2.6).

### 2.2 La maquette (le premier oui)

> « Je vous ai préparé une maquette de site, à votre nom. C'est gratuit, ça ne vous engage à rien. Je vous l'envoie par SMS ou par e-mail ? Vous regardez quand vous voulez. »

- **SMS** : « C'est bien ce numéro-là ? »
- **E-mail** : « Vous me l'épelez ? » Relis l'adresse lettre par lettre.
- **Maquette pas prête** : « Je vous la prépare et je vous l'envoie [jour]. Par SMS ou par e-mail ? »
- **Si la maquette contient des photos d'exemple** : « Les photos dedans sont des exemples. Le vrai site, ce sera avec vos photos à vous. »

### 2.3 L'offre exacte

> « Si la maquette vous plaît, le vrai site, c'est 300 €. Une fois. Pas d'abonnement. »

> « Je ne facture pas de TVA, je suis en franchise. 300 €, c'est ce que vous payez. Vous avez une facture. »

> « Dedans, il y a un site à votre nom, avec une page pour chaque commune où vous travaillez vraiment. C'est ça, le référencement local bien fait. »

> « Vos photos de chantier, votre métier, vos coordonnées, votre assurance décennale. Rien d'inventé. »

> « Il y a aussi un formulaire. Quand un client vous écrit, la demande arrive dans votre espace Presti, et vous êtes prévenu par e-mail. »

> « Pour le délai : vous remplissez le dossier, vous payez, et je fabrique le site. Je le relis moi-même avant qu'il parte. Il est en ligne sous 48 heures ouvrées après ma validation. »

> « Le nom de domaine, du genre dupont-plomberie.fr, est à votre nom, jamais au mien. Vous le réservez vous-même. Comptez environ 10 à 20 € par an, selon l'hébergeur. Si vous en avez déjà un, on garde le vôtre. »

**À savoir si on te pose la question (ne le récite pas) :**

- **Ce qu'il doit fournir.** Le dossier en ligne bloque le paiement tant qu'il manque quelque chose :
  - au moins 3 photos de chantier (40 au plus) ;
  - son métier, plus 4 métiers secondaires au plus ;
  - les communes qu'il sert vraiment (de 1 à 40) ;
  - son adresse pro, son SIREN et ses horaires ;
  - son assurance décennale : le nom de l'assureur et le numéro de contrat ;
  - son prénom, son nom et son année d'installation ;
  - son parcours en une ligne et une phrase à la première personne ;
  - 3 chiffres, ou la case « je préfère ne pas en donner ».

  Le logo et le lien vers ses avis Google sont facultatifs.
- **Paiement** : en ligne, par carte (Stripe), à la fin du dossier. Rien n'est fabriqué avant le paiement.
- **Sans nom de domaine** (« plus tard ») : en attendant, le site est en ligne sur une adresse Presti.
- **Avec un nom de domaine** : après la mise en ligne, il reste un réglage DNS à poser chez l'hébergeur de son nom de domaine (parfois deux, si Presti doit vérifier que le domaine est bien à lui). Tu les lui donnes, ou vous le faites ensemble au téléphone.
- **S'il ferme son compte Presti** : le site reste en ligne 12 mois, sans frais. Il reçoit ensuite tous les fichiers pour l'héberger ailleurs (CGU, art. 3 bis).
- **Google** : aucune place promise (CGU, art. 3 bis).
- **L'assistant Presti** est vendu en abonnement. Il n'est pas nécessaire pour le site. N'en parle pas ce soir, sauf s'il pose la question.

**Ne jamais dire :**
- « premier sur Google », « garanti », « vous aurez plus de clients » ;
- « livré demain », ou toute autre date. Le seul délai, c'est « 48 h ouvrées après ma validation » ;
- « c'est gratuit » à propos du site. Seule la maquette est gratuite ;
- « HT ». 300 €, c'est le prix final ;
- « le nom de domaine est compris » (c'est faux) ;
- « on s'occupe de votre fiche Google » (ce n'est pas dans le produit) ;
- « je suis artisan ». « Je suis à mon compte, comme vous » est vrai.

### 2.4 L'appel à l'action

**Il est chaud :**

> « Pour commander, allez sur prestiapp.fr/signup. Vous créez un compte gratuit, sans carte. Ensuite, dans le menu, cliquez sur "Commander mon site". Vous remplissez le dossier et vous payez à la fin. Je vous envoie le lien avec la maquette. »

> « Si vous voulez, on le remplit ensemble au téléphone. Je vous guide, écran par écran. »

**Il hésite (rendez-vous) :**

> « Je vous envoie la maquette ce soir. Je vous rappelle [jour] à [heure] pour avoir votre avis. Ça vous va ? »

> Ou bien : « Je suis à Marans. Je peux passer vous la montrer, [jour] en fin de journée ? »

*Si tu passes chez lui et qu'il commande pendant ta visite ou juste après, il peut avoir 14 jours pour se rétracter : c'est le cas d'une entreprise de 5 salariés au plus qui achète hors de son métier principal (art. L. 221-3 c. conso). Dis-le-lui plutôt qu'il le découvre après.*

### 2.5 Le répondeur

Pas de message au premier essai. Au deuxième :

> « Bonjour, Benjamin Filiot, de Presti, à Marans. Je fais des sites pour les artisans du coin, et je vous ai préparé une maquette gratuite. Je vous rappelle [jour]. Si vous ne voulez pas être rappelé, envoyez un SMS au 06 30 78 16 47 et c'est noté. Bonne soirée. »

*Ne parle de la maquette que si elle est prête.*

### 2.6 La sortie polie

- **« Non merci »**
  > « Pas de souci. Merci de m'avoir répondu. Bonne soirée. »

  Une seule relance douce, au plus : « Je vous envoie quand même la maquette, sans suite ? » S'il répond non, tu t'arrêtes. Statut *refus*.
- **« Ne m'appelez plus »**
  > « C'est noté. Je ne vous rappellerai plus et je ne vous écrirai pas. Bonne soirée. »

  Statut *opposition*.
- **« Pas le moment »**
  > « Je vous rappelle quand ? »

  Statut *rappeler*, avec le jour et l'heure qu'il a donnés.
- **Il s'énerve**
  > « Je comprends. Je vous laisse. Bonne soirée. »

  Statut *opposition* : dans le doute, c'est une opposition.

---

## 3. Les 10 objections et les réponses honnêtes

**1. « J'ai assez de boulot. Le bouche-à-oreille me suffit. »**
> « Tant mieux, c'est le meilleur signe. Quand on vous recommande, la personne cherche votre nom sur internet. Qu'est-ce qu'elle trouve aujourd'hui ? Le site ne remplace pas le bouche-à-oreille, il le confirme. Je vous envoie la maquette, et vous jugez ? »

**2. « 300 €, c'est trop cher. »**
> « C'est 300 € une fois, pas par mois. Pas d'abonnement, pas de TVA en plus, et une facture. Le seul frais à côté, c'est le nom de domaine si vous en voulez un, à votre nom. À vous de voir si un chantier de plus dans l'année le rembourse. »

**3. « Il y a un abonnement caché ? C'est quoi l'arnaque ? »**
> « Non. C'est 300 € une fois, payés en ligne par carte. Le site n'a pas d'abonnement. Le nom de domaine est à votre nom, pas au mien. Si un jour vous fermez votre compte, le site reste en ligne 12 mois, et je vous donne tous les fichiers pour le mettre ailleurs. C'est écrit dans les conditions, sur prestiapp.fr/cgu. »

**4. « Vous me garantissez d'être premier sur Google ? »**
> « Non. Et méfiez-vous de ceux qui le promettent. Je fais le référencement local proprement : une page par commune que vous servez vraiment. Le classement dépend du temps, de vos avis et de la concurrence. Personne ne le décide. »

**5. « J'ai déjà un site. »**
> « D'accord. Il vous amène des demandes ? » *(Tu écoutes.)* « Je vous envoie la maquette, vous comparez sur votre téléphone. Si le vôtre fait mieux, gardez-le. Si vous changez, on garde votre nom de domaine. »

**6. « Envoyez-moi un mail. » / « Je dois en parler à ma femme, à mon associé. »**
> « Avec plaisir. Je vous envoie la maquette, c'est plus parlant qu'une plaquette. Par SMS ou par e-mail ? » *(Il choisit.)* « Vous la regardez tranquillement, et je vous rappelle [jour] pour avoir votre avis. Ça vous va ? »

**7. « Je n'ai pas le temps. Et je ne suis pas doué avec internet. »**
> « Je comprends. De votre côté, il faut au moins trois photos de chantier, votre SIREN, votre assurance décennale, vos horaires, les communes où vous allez, et deux lignes sur vous. Ça se remplit en ligne, même avec votre téléphone. Si vous voulez, on le fait ensemble au téléphone, je vous guide. Le reste, je m'en occupe. »

**8. « C'est fait par une IA ? Vous êtes qui, en fait ? »**
> « Presti, c'est moi : Benjamin Filiot, à mon compte, à Marans. Oui, mes outils m'aident à fabriquer le site. Mais tout ce qui est écrit vient de vous : vos photos, votre métier, vos infos. Rien d'inventé. Et je relis moi-même chaque site avant qu'il parte. Mon SIREN est dans les mentions légales de prestiapp.fr. »

**9. « Et si ça ne me plaît pas ? Je pourrai changer après ? Je serai remboursé ? »**
> « La maquette est gratuite. Si elle ne vous plaît pas, on s'arrête là. Après la commande, je relis le site avant de le mettre en ligne, et je peux vous envoyer l'aperçu. Si quelque chose cloche, je corrige. Par contre, une fois fabriqué, le site n'est pas remboursé : c'est dans les conditions, et je préfère vous le dire maintenant. Pour une retouche après la mise en ligne, vous m'écrivez et on regarde. Je ne vais pas vous promettre des retouches illimitées au téléphone. »

**10. « Vous avez eu mon numéro où ? Je ne veux pas être démarché. »**
> « Dans l'annuaire public des entreprises RGE de l'ADEME. Vous ne voulez plus que je vous appelle ? C'est noté tout de suite. Je ne vous rappelle plus et je ne vous écris pas. Bonne soirée. »

Statut *opposition*.

---

## 4. Le SMS et l'e-mail de suivi

**Seulement après un « oui, envoyez-moi » au téléphone.** Envoie l'e-mail depuis la boîte Gmail publiée dans les mentions légales, celle qui reçoit les réponses. N'utilise pas contact@prestiapp.fr : cette adresse envoie mais ne reçoit rien.

### SMS 1 : la maquette (juste après l'appel)

**Joins la photo `capture-telephone.jpg` du dossier de l'entreprise (pas de lien : voir section 0).**

> Bonjour, c'est Benjamin Filiot (Presti, Marans), suite à notre appel. Voici un aperçu de votre future page (photo jointe), gratuit et sans engagement.
> Le vrai site : 300 € une fois, sans abonnement. Je vous rappelle {JOUR}. Pour ne plus recevoir de message : STOP.

### SMS 2 : pour commander (seulement s'il dit oui)

> Pour commander votre site : créez un compte gratuit, sans carte, sur prestiapp.fr/signup, puis cliquez sur « Commander mon site » dans le menu. Il faut au moins 3 photos de chantier, votre SIREN et votre assurance décennale. Un souci ? Appelez-moi au 06 30 78 16 47. Benjamin, Presti.

### E-mail

**Objet :** Votre maquette de site, {ENTREPRISE}

> Bonjour {Madame / Monsieur NOM},
>
> Merci pour votre temps au téléphone.
>
> Voici un aperçu de votre future page, comme promis (pièces jointes : vue bureau et vue téléphone). C'est gratuit et ça ne vous engage à rien.
>
> *[Joins `capture-bureau.jpg` et `capture-telephone.jpg` du dossier de l'entreprise — pas de lien, voir section 0.]*
>
> Les photos affichées dedans sont des exemples : votre site sera fait avec les vôtres.
>
> Si elle vous plaît, voici l'offre, sans petites lignes :
> - 300 € une fois, sans abonnement. TVA non applicable, art. 293 B du CGI : 300 €, c'est ce que vous payez, avec une facture.
> - Un site à votre nom, avec une page pour chaque commune que vous servez vraiment.
> - Vos photos, votre métier, vos coordonnées, votre assurance décennale. Rien d'inventé.
> - Un formulaire de demande : les messages de vos clients arrivent dans votre espace Presti, et vous êtes prévenu par e-mail.
> - Je relis moi-même votre site avant la mise en ligne. Il est en ligne sous 48 h ouvrées après ma validation.
> - Le nom de domaine reste à votre nom. Vous le réservez vous-même (environ 10 à 20 € par an selon l'hébergeur), ou vous gardez le vôtre.
> - Je ne promets aucune place sur Google : personne ne peut le faire honnêtement.
>
> Pour commander :
> 1. Créez un compte gratuit, sans carte : https://prestiapp.fr/signup
> 2. Dans le menu, ouvrez « Commander mon site ».
> 3. Remplissez le dossier, puis payez en ligne. Il faut au moins 3 photos de chantier, votre SIREN, votre assurance décennale (assureur et numéro de contrat), vos horaires et les communes que vous servez.
>
> Si vous préférez, on remplit le dossier ensemble au téléphone.
>
> Les conditions complètes sont ici : https://prestiapp.fr/cgu (article 3 bis).
>
> Je vous rappelle {JOUR} pour avoir votre avis. Si vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».
>
> Bien à vous,
>
> Benjamin Filiot, Presti
> 1 rue du Brouage, 17230 Marans · SIREN 109 411 348
> 06 30 78 16 47 · https://prestiapp.fr

---

## 5. Le suivi

Tiens un fichier `suivi.csv` **dans ce dossier seulement**, jamais dans un dépôt git. Tu remplis une ligne par appel, pas une par prospect : c'est ce qui permet de compter les essais.

### Les statuts

| Statut | Quand | Suite |
|---|---|---|
| **pas répondu** | personne, ou répondeur | Nouvel essai un autre jour, à une autre heure. Message vocal au 2e essai. **4 essais au plus en 30 jours**, puis tu arrêtes. |
| **rappeler** | « rappelez-moi » | Note le jour et l'heure qu'il a donnés. Rappelle à l'heure dite. |
| **intéressé** | il veut voir | Maquette envoyée dans l'heure (après son oui). Rappel fixé. |
| **maquette envoyée** | SMS ou e-mail parti | Rappel 2 jours ouvrés après. Une seule relance écrite, au plus. |
| **vendu** | il a payé en ligne | Vérifie dans /controle, onglet Sites : la commande est « Payée — en fabrication ». Relis le site. Préviens-le toi-même quand il est en ligne. |
| **refus** | « non merci » | Plus de relance pendant cette campagne. |
| **opposition** | « ne m'appelez plus » | Plus jamais d'appel, de SMS ni d'e-mail. **Garde la ligne**, sans commentaire : c'est ce qui t'empêche de le rappeler par erreur. |

### Le tableau

| date | heure | priorité | entreprise | métier | commune | téléphone | essai n° | statut | canal maquette | maquette envoyée le | rappel le | objection | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 26/09 | 18:05 | A | … | plomberie-chauffage | … | … | 1 | pas répondu | | | 29/09 12:30 | | |
| 26/09 | 18:12 | B | … | menuiserie | … | … | 1 | maquette envoyée | SMS | 26/09 | 30/09 18:00 | déjà un site | site non mobile, vu |

En-tête à coller dans `suivi.csv` :

```
date;heure;priorite;entreprise;metier;commune;telephone;essai;statut;canal_maquette;maquette_envoyee_le;rappel_le;objection;note
```

Valeurs permises dans `statut` : `pas répondu`, `rappeler`, `intéressé`, `maquette envoyée`, `vendu`, `refus`, `opposition`.

### À la fin de la soirée : 4 chiffres

- appels passés ;
- décrochés ;
- maquettes envoyées ;
- ventes.

Note aussi l'objection que tu as entendue le plus souvent. C'est elle qu'on retravaille pour la prochaine soirée.
