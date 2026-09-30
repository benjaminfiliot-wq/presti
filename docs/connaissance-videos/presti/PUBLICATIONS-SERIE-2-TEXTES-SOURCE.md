# Publication n° 11 — « Le devis reste dans le fil du client »

## Le mécanisme réel qui la fonde

Le sujet initial demandait de présenter un compte client qui retrouverait tous ses échanges et devis grâce à un lien magique. Une partie seulement est livrée : le lien magique crée bien une session sans mot de passe, mais cette session ne recharge pas la liste des conversations. La liste visible reste lue dans le stockage local du navigateur. La publication porte donc sur le parcours réellement complet : chaque conversation possède un jeton secret non devinable ; avec ce lien, le client retrouve l’historique du fil et le dernier devis effectivement envoyé, jamais un brouillon. Il peut ensuite accepter le devis ou demander une modification dans la conversation.

## Variante A — Facebook

> Votre client n’a pas besoin de rechercher un PDF au fond de sa boîte mail pour reprendre son chantier.
>
> Son lien de conversation rouvre le fil dans l’ordre : sa demande, vos réponses et le dernier devis que vous lui avez réellement envoyé. Un brouillon reste invisible.
>
> Depuis la carte du devis, il peut relire les premières lignes, voir le total, accepter ou demander une modification. Son accord est daté et conservé avec l’échange.
>
> Vous gardez donc la demande, la discussion et la décision au même endroit, sans demander au client de recréer son besoin.
>
> Découvrez Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/serie-2/pub-11-instagram.jpg`

> Un lien, et votre client retrouve le fil de son chantier.
>
> La demande, vos réponses et le dernier devis envoyé restent réunis dans la conversation. Les brouillons ne sont jamais montrés.
>
> Le client ouvre la carte du devis, voit le total et les premières lignes, puis choisit : accepter ou demander une modification. L’accord accepté est daté dans le fil.
>
> C’est plus simple pour reprendre une discussion plusieurs jours après, sans recommencer depuis le début.
>
> Découvrez le parcours : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> Le lien de conversation est un secret porteur : il ouvre uniquement le fil auquel il appartient. Et côté devis, la route ne montre que les statuts envoyé, accepté ou refusé. Un document encore en brouillon reste dans l’espace de l’artisan.

## Trois réponses type

**« Mon client doit créer un compte ? »**
> Non pour rouvrir son fil : le lien secret suffit. Une connexion facultative par email existe aussi, mais elle ne remplace pas encore la liste conservée dans le navigateur du client.

**« Il peut voir un devis que je n’ai pas terminé ? »**
> Non. La recherche du devis visible exclut les brouillons et ne retient que les documents déjà envoyés, acceptés ou refusés.

**« Il peut répondre sur le devis ? »**
> Oui. Dans la conversation, il peut l’accepter ou demander une modification. L’acceptation est horodatée et le fil reste disponible depuis son lien.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Son lien de conversation rouvre le fil » | `app/api/conversation/route.ts:14` — le commentaire décrit le jeton secret qui rouvre le fil ; `app/api/conversation/route.ts:53` — le GET recharge la conversation depuis ce jeton |
| « la demande et vos réponses […] dans l’ordre » | `app/api/conversation/route.ts:42` — chargement de l’historique ; `app/api/conversation/route.ts:48` — tri croissant par date |
| « le dernier devis que vous lui avez réellement envoyé » | `app/api/conversation/route.ts:73` — seuls les devis réellement envoyés sont exposés ; `app/api/conversation/route.ts:79` — statuts admis : envoyé, accepté, refusé |
| « voir le total et les premières lignes » | `app/api/conversation/route.ts:77` — le total TTC est sélectionné ; `app/api/conversation/route.ts:86` — les trois premières lignes sont chargées |
| « accepter ou demander une modification » | `app/p/[slug]/PlatChat.tsx:498` — bouton d’acceptation ; `app/p/[slug]/PlatChat.tsx:499` — bouton de demande de modification |
| « Son accord est daté » | `app/p/[slug]/PlatChat.tsx:494` — l’acceptation et sa date sont affichées dans la carte |

## Ce qui n'est PAS dans cette publication, et pourquoi

La promesse initiale de « compte client qui retrouve tous ses échanges » a été remplacée. `app/p/[slug]/PlatChat.tsx:192-196` recharge la liste des demandes depuis `localStorage`, tandis que la session du lien magique ne fait que poser l’identité du compte aux lignes 200-217. Aucune route ne renvoie aujourd’hui toutes les conversations liées à `client_plateforme_id`. Dire qu’un client retrouve son historique sur n’importe quel appareil serait donc faux. Le visuel choisi montre le geste « relire, envoyer » de la série 1 : il est proche du devis, mais ne montre ni le fil client ni sa carte de devis.

---

# Publication n° 12 — « La facture possède aussi son fichier électronique »

## Le mécanisme réel qui la fonde

Pour chaque facture appartenant à l’artisan connecté, Presti peut produire un XML CII structuré selon EN 16931. Le fichier reprend le numéro, la date, le vendeur, l’acheteur, les lignes, les quantités, les unités, les taux de TVA et les totaux. Un contrôle préalable signale notamment un numéro, un SIRET, un nom ou une adresse client manquants et un total incohérent. Le fichier est téléchargeable en XML. Le code est explicite sur sa limite : il n’a pas encore passé le Schematron officiel ni été embarqué dans un PDF/A-3 validé ; la publication ne le présente donc pas comme certifié.

## Variante A — Facebook

> Une facture ne devrait pas finir enfermée dans un PDF.
>
> Dans Presti, chaque facture émise peut aussi produire son fichier XML : numéro, date, identité de votre entreprise, client, lignes, quantités, TVA et totaux.
>
> Avant le téléchargement, le logiciel contrôle les manques qui peuvent faire rejeter la pièce : SIRET absent, client sans adresse, facture sans ligne ou total qui ne correspond pas à la somme des postes.
>
> Vous gardez le PDF lisible pour le client et un fichier structuré pour la suite de la facture électronique. Presti ne le présente pas comme certifié tant que les validations officielles restantes ne sont pas passées.
>
> Voir Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/serie-2/pub-12-instagram.jpg`

> Derrière la facture lisible, il y a aussi les données structurées.
>
> Presti génère un XML avec le numéro, la date, les parties, les lignes, les quantités, les taux de TVA et les totaux. Avant de le produire, un contrôle remonte les informations absentes ou un total incohérent.
>
> Le fichier suit la structure CII / EN 16931. Il reste présenté honnêtement : pas de mention « certifié » avant le passage des validations officielles encore manquantes.
>
> Le format électronique est compris dans les formules Presti : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> Le XML n’invente pas une donnée absente : un identifiant vendeur ou acheteur manquant n’est pas fabriqué. Le contrôle le signale pour que la facture soit corrigée tant qu’elle peut encore l’être.

## Trois réponses type

**« C’est un PDF avec un autre nom ? »**
> Non. Le PDF est fait pour être lu. Le XML porte les champs structurés que peut lire un logiciel : parties, lignes, unités, TVA, dates et totaux.

**« Vous garantissez qu’il sera accepté partout ? »**
> Non. Le code suit la structure CII / EN 16931 et effectue des contrôles préalables, mais il indique aussi que le Schematron officiel et la validation PDF/A-3 restent à passer. Le mot « certifié » n’est donc pas utilisé.

**« N’importe qui peut télécharger ma facture ? »**
> Non. La route exige une session artisan, puis cherche la facture avec son identifiant et celui de l’artisan connecté.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « un XML CII structuré selon EN 16931 » | `lib/facturx.ts:1` — l’en-tête nomme XML CII et EN 16931 ; `lib/facturx.ts:179` — identifiant de profil EN 16931 écrit dans le document |
| « numéro, date […] lignes, quantités, unités, taux de TVA » | `lib/facturx.ts:183` — numéro ; `lib/facturx.ts:185` — date ; `lib/facturx.ts:87` — désignation ; `lib/facturx.ts:92` — quantité et unité ; `lib/facturx.ts:98` — taux de TVA |
| « les totaux » | `lib/facturx.ts:208` — total HT ; `lib/facturx.ts:210` — total TVA ; `lib/facturx.ts:211` — total TTC |
| « le contrôle signale les informations absentes » | `lib/facturx.ts:227` — numéro ; `lib/facturx.ts:230` — SIRET ; `lib/facturx.ts:235` — adresse client |
| « un total incohérent » | `lib/facturx.ts:238` — somme des lignes recalculée ; `lib/facturx.ts:240` — message si le total HT diffère |
| « téléchargeable en XML » | `app/api/factures/[id]/facturx/route.ts:70` — génération ; `app/api/factures/[id]/facturx/route.ts:73` — type XML ; `app/api/factures/[id]/facturx/route.ts:74` — nom du fichier téléchargé |
| « la facture appartient à l’artisan connecté » | `app/api/factures/[id]/facturx/route.ts:25` — refus sans authentification ; `app/api/factures/[id]/facturx/route.ts:27` — filtre simultané sur facture et artisan |

## Ce qui n'est PAS dans cette publication, et pourquoi

Le fichier n’est jamais qualifié de « Factur-X certifié ». `lib/facturx.ts:13-16` dit qu’il suit la structure CII / EN 16931, mais qu’il n’a pas encore passé le Schematron officiel EN 16931 + CIUS France ni été embarqué dans un PDF/A-3 validé. La publication ne promet pas non plus une transmission directe à une plateforme agréée : la route fournit aujourd’hui un téléchargement XML. Le visuel vient de la publication consacrée aux factures et montre le sujet général, pas le contenu du XML.

---

# Publication n° 13 — « Le téléphone devient un outil de chantier »

> ⏸ **EN ATTENTE — relecture de Claude Code du 15/09.** Les fonctions natives existent, mais l'application n'est encore
> sur aucun store : Android s'installe par un APK téléchargé depuis les paramètres, le Play Store suivra le compte Google
> Play (M2), l'App Store le compte Apple (M1) (`app/parametres/SectionApplication.tsx:9` et `:11`). « Dans l'application
> Presti », dit à un public qui cherchera la fiche sur son store, promet ce qu'il ne trouvera pas. À publier quand
> l'application sera téléchargeable depuis au moins un store, ou à réécrire pour l'APK Android seul.

## Le mécanisme réel qui la fonde

Dans la coque mobile, Presti appelle la caméra native pour prendre une photo de chantier ou choisir une image, la réduit avant l’envoi et laisse le traitement média retirer les métadonnées EXIF. Le lecteur natif reconnaît sept formats courants de codes-barres, avec une demande explicite d’accès à la caméra. Après plus de cinq minutes en arrière-plan, l’application peut couvrir la console et demander l’empreinte, le visage ou le code de l’appareil si une biométrie est disponible. Cette biométrie rouvre une session déjà vérifiée ; elle ne remplace pas le second facteur.

## Variante A — Facebook

> Sur un chantier, le bon écran est celui qui tient dans votre poche.
>
> Dans l’application Presti, vous pouvez prendre une photo avec la caméra du téléphone, choisir une image de la galerie ou lire un code-barres sans quitter la console.
>
> La photo est réduite sur l’appareil avant l’envoi. Pour le scan, l’application demande l’accès à la caméra puis lit les formats courants des cartons et références.
>
> Et si Presti est restée plus de cinq minutes en arrière-plan, la console peut se couvrir jusqu’à votre empreinte, votre visage ou le code du téléphone. Ce geste rouvre une session déjà vérifiée : il ne remplace pas votre double authentification.
>
> Découvrir Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/pub-06/vertical-miniature.jpg`

> Photo du chantier. Code-barres du carton. Déverrouillage du téléphone.
>
> Dans l’application Presti, ces trois gestes passent par les fonctions natives du mobile : caméra ou galerie pour la photo, lecteur plein écran pour la référence, empreinte ou visage pour reprendre une session après une longue mise en arrière-plan.
>
> La photo est réduite avant l’envoi. Si la biométrie échoue, la session est fermée au lieu de rester ouverte derrière l’écran.
>
> Le téléphone reste un outil de chantier, pas un petit bureau à transporter.
>
> Découvrir l’application : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> La caméra ne travaille que sur votre geste. La politique de confidentialité précise que seules les images ajoutées à une fiche sont envoyées à Presti et que les données biométriques restent dans le système du téléphone.

## Trois réponses type

**« La photo part directement dès que j’ouvre la caméra ? »**
> Non. Vous choisissez la caméra ou la galerie, puis seules les images que vous ajoutez à une fiche sont envoyées. Une annulation rend simplement la main à l’écran.

**« Le scan marche sur quels codes ? »**
> Le lecteur natif demande la caméra et accepte EAN-13, EAN-8, Code 128, Code 39, UPC-A, UPC-E et ITF.

**« Votre application reçoit mon empreinte ? »**
> Non. Le système du téléphone effectue la vérification. Presti reçoit uniquement le succès ou l’échec du déverrouillage ; en cas d’échec réel, la session est fermée.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « prendre une photo […] ou choisir une image » | `lib/natif.ts:94` — fonction de prise de photo ; `lib/natif.ts:100` — choix caméra, galerie ou invite |
| « La photo est réduite sur l’appareil avant l’envoi » | `lib/natif.ts:90` — réduction native annoncée avant l’envoi ; `lib/natif.ts:99` — largeur, hauteur et qualité demandées |
| « lire un code-barres » | `lib/natif.ts:121` — fonction de scan ; `lib/natif.ts:125` — demande de permission caméra ; `lib/natif.ts:131` — sept formats admis |
| « après plus de cinq minutes en arrière-plan » | `app/VerrouNatif.tsx:23` — délai de cinq minutes ; `app/VerrouNatif.tsx:94` — comparaison avec le temps d’arrière-plan |
| « empreinte, visage ou code du téléphone » | `app/VerrouNatif.tsx:67` — authentification native ; `app/VerrouNatif.tsx:68` — code de l’appareil autorisé ; `app/VerrouNatif.tsx:131` — texte empreinte ou visage |
| « une session déjà vérifiée, pas le second facteur » | `app/VerrouNatif.tsx:10` — le commentaire précise la réouverture ; `app/VerrouNatif.tsx:11` — jamais à la place du second facteur |
| « les données biométriques restent dans le téléphone » | `app/confidentialite/page.tsx:87` — Presti ne reçoit que le résultat ; `app/confidentialite/page.tsx:89` — session gardée dans Keychain ou Keystore |

## Ce qui n'est PAS dans cette publication, et pourquoi

La publication ne dit pas que la biométrie connecte l’artisan à elle seule : elle rouvre une session déjà authentifiée. Elle ne promet pas non plus le verrou sur tous les téléphones ; `app/VerrouNatif.tsx:18` indique qu’en l’absence de biométrie disponible, aucun faux verrou n’est affiché. Le visuel retenu montre l’inventaire, sujet le plus proche du scan, mais pas la caméra native ni l’écran biométrique.

---

# Publication n° 14 — « Chaque artisan reste dans son propre atelier numérique »

> **PROGRAMMATION BLOQUÉE : créneaux des 20 et 21/09 ratés (quota Publora Starter de 15 parutions par mois atteint), parution abandonnée par Benj le 24/09/2026**

## Le mécanisme réel qui la fonde

Les principales données métier sont protégées par des politiques RLS qui comparent l’utilisateur connecté à `artisan_id`, directement ou par la relation avec le devis ou le lead. Les devis, leurs lignes, les prospects et les messages ne sont donc pas ouverts à un autre artisan par une simple requête navigateur. Côté routes Presti, la garde centrale exige en plus le second facteur TOTP lorsqu’il a été activé ; sinon, une session doit avoir passé le code envoyé par email. Cette publication décrit ces mécanismes précis, pas une garantie abstraite d’inviolabilité.

## Variante A — Facebook

> Quand deux artisans utilisent Presti, leurs devis ne doivent jamais se croiser.
>
> Dans la base, les politiques de sécurité vérifient l’identifiant de l’artisan sur les clients, les devis et les prospects. Pour une ligne de devis ou un message, le contrôle remonte jusqu’au document ou à la conversation qui lui appartient.
>
> La connexion ajoute un deuxième verrou. Si vous avez activé une application d’authentification, une session limitée au mot de passe est refusée. Sans application TOTP, le code reçu par email doit avoir été validé pour ouvrir les routes Presti.
>
> Ce n’est pas une phrase « sécurisé » posée sur une page : ce sont des refus écrits dans la base et dans la garde serveur.
>
> Voir Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/serie-2/pub-14-instagram.jpg`

> Vos devis d’un côté. Ceux des autres artisans de l’autre.
>
> Presti cloisonne les clients, devis, lignes, prospects et messages avec des politiques liées à l’identifiant du compte connecté.
>
> Puis la connexion vérifie son niveau : une application d’authentification activée impose le second facteur ; sinon, un code envoyé par email doit valider la session avant l’accès aux routes Presti.
>
> Le mot de passe seul ne suffit donc pas à ouvrir la console par les chemins protégés.
>
> Découvrir Presti : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> Exemple concret : une ligne de devis n’est lisible que si son devis appartient à l’utilisateur connecté. Pour un message, la politique vérifie que le prospect auquel il est rattaché porte le même artisan.

## Trois réponses type

**« Presti peut-il promettre qu’aucune attaque n’arrivera jamais ? »**
> Non. Aucun logiciel sérieux ne devrait le promettre. Ce que le code prouve ici, ce sont des politiques de cloisonnement et un second contrôle de connexion, pas une invulnérabilité absolue.

**« Si j’active une application d’authentification, elle sert vraiment ? »**
> Oui. Lorsqu’un facteur TOTP vérifié existe, un jeton qui n’a que le niveau mot de passe est refusé par la garde centrale des routes.

**« Et si je n’utilise pas d’application TOTP ? »**
> La session doit alors être inscrite comme vérifiée après le code reçu par email. Un jeton obtenu uniquement avec le mot de passe ne suffit pas pour les routes protégées.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « les clients […] liés à l’identifiant de l’artisan » | `supabase/migrations/0002_devis.sql:32` — politique des clients ; `supabase/migrations/0002_devis.sql:33` — lecture et écriture limitées à `artisan_id` |
| « les devis » | `supabase/migrations/0002_devis.sql:55` — politique des devis ; `supabase/migrations/0002_devis.sql:56` — comparaison à l’utilisateur connecté |
| « une ligne de devis […] si son devis appartient » | `supabase/migrations/0002_devis.sql:71` — politique des lignes ; `supabase/migrations/0002_devis.sql:72` — vérification du devis parent et de son artisan |
| « les prospects et les messages » | `supabase/migrations/0010_hardening.sql:16` — lecture des prospects propres ; `supabase/migrations/0010_hardening.sql:26` — politique des messages ; `supabase/migrations/0010_hardening.sql:27` — vérification par le prospect parent |
| « une application d’authentification activée impose le second facteur » | `lib/authArtisan.ts:44` — niveaux `aal1` et `aal2` ; `lib/authArtisan.ts:56` — facteur TOTP vérifié ; `lib/authArtisan.ts:75` — le niveau `aal2` satisfait le contrôle |
| « un code envoyé par email doit valider la session » | `lib/authArtisan.ts:81` — protection par code email ; `lib/authArtisan.ts:97` — lecture de l’identifiant de session ; `lib/authArtisan.ts:98` — refus si la session n’est pas vérifiée |
| « la garde centrale refuse l’accès » | `lib/authArtisan.ts:127` — erreur MFA si le facteur manque ; `lib/authArtisan.ts:128` — erreur si le code email manque |

## Ce qui n'est PAS dans cette publication, et pourquoi

La publication n’emploie pas « inviolable », « impossible à pirater » ni « chiffrement de bout en bout » : aucune des lignes citées ne prouve ces promesses. Elle ne dit pas non plus que tous les accès reposent uniquement sur la RLS ; certaines routes serveur utilisent un rôle de service et doivent donc appliquer leurs propres filtres d’identité. Le visuel disponible le plus proche est une capture de console issue de la publication sur les formules ; il ne montre pas les réglages de sécurité, et ce décalage doit être corrigé avant une campagne visuelle dédiée.

---

# Publication n° 15 — « À 23 h, le client sait que sa demande est arrivée »

> **PROGRAMMATION BLOQUÉE : variante A publiée le 22/09 ; variante B ratée le 23/09 (quota Publora Starter atteint), abandonnée par Benj le 24/09/2026**

## Le mécanisme réel qui la fonde

En Essentiel, la matrice publique dit que l’artisan valide chaque réponse. Le serveur verrouille aussi le mode autonome : même si un compte Essentiel demande le mode automatique, le mode effectif redevient assisté. Lorsqu’une demande avec email arrive et que la décision interdit la réponse autonome, Presti enregistre le message, notifie l’artisan puis envoie au prospect un accusé « Bien reçu » au nom de l’entreprise. La réponse de fond ne part pas : la route renvoie `reply: null`. Le client sait donc que son message est arrivé, tandis que l’artisan garde l’accord sur la vraie réponse.

## Variante A — Facebook

> 23 h. Votre client vient d’envoyer sa demande. Vous, vous dormez déjà.
>
> En formule Essentiel, Presti ne lui envoie pas une réponse de fond à votre place. Le serveur maintient le mode assisté : chaque réponse attend votre validation.
>
> Mais si le client a laissé son email, il reçoit tout de suite un message court au nom de votre entreprise : sa demande est bien arrivée, vous revenez vers lui. Pendant ce temps, la demande et son besoin sont enregistrés dans votre espace, et vous êtes prévenu.
>
> Le client ne reste pas devant un écran muet. Et le lendemain, la vraie réponse reste votre décision.
>
> Découvrir Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/serie-2/pub-15-instagram.jpg`

> Une demande à 23 h ne mérite ni le silence, ni une réponse engagée sans votre accord.
>
> En Essentiel, Presti tient cette ligne : un accusé court part au nom de votre entreprise si le client a laissé son email. Il sait que sa demande est arrivée.
>
> La réponse de fond, elle, reste en mode assisté et attend votre validation. Même si le réglage automatique était demandé, le serveur le ramène au mode compris dans la formule.
>
> Le lendemain, vous reprenez une demande déjà enregistrée, pas un client laissé dans le vide.
>
> Voir le fonctionnement : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> La nuance compte : l’accusé n’est envoyé que si le client a fourni une adresse email. Il reprend son prénom éventuel, le nom de l’entreprise et le besoin écrit, avec l’adresse de l’artisan en réponse.

## Trois réponses type

**« Donc le logiciel répond à ma place pendant la nuit ? »**
> Pas en Essentiel pour la réponse de fond. Il envoie seulement l’accusé de réception si une adresse email est disponible. La vraie réponse attend votre geste.

**« Et si je coche le mode automatique en Essentiel ? »**
> Le serveur vérifie la formule. Sans la capacité ouverte à partir de Studio, il applique le mode assisté et prépare le parcours pour votre validation.

**« Le message part sous quel nom ? »**
> L’objet et l’expéditeur reprennent le nom de votre entreprise, et l’adresse de réponse est la vôtre. Le client peut donc vous répondre directement.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « En formule Essentiel […] chaque réponse attend votre validation » | `lib/plans.ts:59` — formule Essentiel ; `lib/plans.ts:121` — « vous validez chaque réponse » |
| « le mode autonome […] redevient assisté » | `lib/plateformeConfig.ts:156` — verrou Essai et Essentiel ; `lib/plateformeConfig.ts:160` — retour effectif au mode assisté |
| « la demande et son besoin sont enregistrés » | `app/api/leads/route.ts:191` — branche sans réponse autonome ; `app/api/leads/route.ts:193` — insertion du message entrant |
| « vous êtes prévenu » | `app/api/leads/route.ts:195` — notification si l’email artisan existe ; `app/api/leads/route.ts:199` — besoin inclus dans la notification |
| « un accusé “Bien reçu” au nom de l’entreprise » | `app/api/leads/route.ts:203` — accusé même en manuel ; `app/api/leads/route.ts:208` — nom de l’artisan comme expéditeur ; `app/api/leads/route.ts:209` — objet « Bien reçu » |
| « si le client a laissé son email » | `app/api/leads/route.ts:204` — condition sur l’adresse email ; `app/api/leads/route.ts:207` — envoi à cette adresse |
| « la réponse de fond ne part pas » | `app/api/leads/route.ts:214` — réponse renvoyée à `null` dans cette branche ; `lib/aide.ts:484` — en Assistée, le logiciel prépare et l’artisan valide |

## Ce qui n'est PAS dans cette publication, et pourquoi

La publication ne promet pas une réponse de fond à toute heure en Essentiel : cette formule impose la validation de l’artisan. Elle ne dit pas non plus que l’accusé arrive à un prospect qui n’a laissé qu’un numéro de téléphone ; la condition du code exige une adresse email. Enfin, aucune cadence de relance n’est évoquée : ce sujet dépend d’un autre état du parcours et brouillerait la différence essentielle entre accusé de réception et réponse au chantier. Le visuel montre la validation d’un pouce, donc le mode assisté, mais pas l’email « Bien reçu » lui-même.

---

# Publication n° 16 — « Vos réalisations montrent le travail fini »

> **PROGRAMMATION BLOQUÉE : programmée hors Publora le 24/09/2026 (quota Starter atteint) ; variante A dans Meta Business Suite pour le jeudi 24/09 à 19 h 30 ; variante B programmée le 24/09 dans Meta Business Suite (Instagram relié par Benj) pour le vendredi 25/09 à 12 h 30, avec un TEXTE ADAPTÉ validé par Benj (« ok texte ») : depuis 025-05, l’artisan n’importe plus ses photos dans Presti, il en envoie de 3 à 40 à la commande du site ; texte publié dans publications/serie-2/pub-16-instagram-texte-publie.txt**

## Le mécanisme réel qui la fonde

L’artisan peut importer jusqu’à douze réalisations, chacune avec un titre et une spécialité. Les formats JPG, PNG et WebP sont acceptés jusqu’à 12 Mo ; les images sont analysées avant publication et une photo trop petite pour rester nette est bloquée. La première réalisation devient la photo principale. Sur une vitrine de niveau 2 ou 3, les réalisations alimentent une galerie. Au niveau 3, jusqu’à quatre paires complètes avant/après peuvent être enregistrées et apparaissent dans un comparateur à glisser.

## Variante A — Facebook

> Avant de vous appeler, un client regarde ce que vous avez déjà réalisé.
>
> Dans Presti, vous ajoutez vos photos de chantier avec un titre et une spécialité. Jusqu’à douze réalisations peuvent composer le portfolio ; la première devient la photo principale.
>
> Chaque image est contrôlée avant publication. Si elle est si petite qu’elle sera floue partout, elle est refusée. Les autres sont préparées pour la galerie de votre vitrine.
>
> En niveau Signature, vous pouvez aussi associer une photo avant et une photo après de la même pièce, jusqu’à quatre transformations. Sur la vitrine, le visiteur glisse pour révéler le résultat.
>
> Votre travail parle avec vos vraies images, pas avec une promesse générique.
>
> Découvrir Presti : prestiapp.fr/a/facebook

## Variante B — Instagram

Visuel : `publications/serie-2/pub-16-instagram.jpg`

> Une belle réalisation mérite mieux qu’une photo perdue dans le téléphone.
>
> Presti vous permet de construire un portfolio avec jusqu’à douze photos, chacune titrée et rangée par spécialité. La première devient l’image principale, les suivantes composent la galerie de la vitrine à partir du niveau 2.
>
> En niveau 3, vous pouvez ajouter jusqu’à quatre transformations avant/après. Deux images de la même pièce, puis un geste pour révéler le chantier fini.
>
> Vos photos restent les vôtres : le logiciel les organise et les montre.
>
> Découvrir Presti : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> Les fichiers acceptés sont JPG, PNG et WebP, avec une limite de 12 Mo. L’analyse prévient en cas de netteté, exposition ou résolution insuffisante ; seule une image trop petite pour être nette partout est bloquée.

## Trois réponses type

**« Je dois préparer mes photos dans un autre logiciel ? »**
> Non pour les importer. Presti prépare l’image après le contrôle. Vous ajoutez ensuite un titre et une spécialité pour que le portfolio reste lisible.

**« Combien de réalisations puis-je montrer ? »**
> Jusqu’à douze dans le portfolio. La première sert de photo principale et la galerie reprend les images renseignées.

**« Le avant/après est disponible partout ? »**
> Non. Le portfolio apparaît à partir du niveau 2 de la vitrine. Les paires avant/après sont réservées au niveau 3, avec au maximum quatre transformations complètes.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « jusqu’à douze réalisations » | `app/PortfolioUpload.tsx:9` — maximum fixé à 12 ; `app/profil/page.tsx:197` — enregistrement borné à douze images |
| « un titre et une spécialité » | `app/PortfolioUpload.tsx:7` — structure d’une réalisation ; `app/PortfolioUpload.tsx:76` — champ titre ; `app/PortfolioUpload.tsx:77` — champ spécialité |
| « la première devient la photo principale » | `app/PortfolioUpload.tsx:42` — première image préparée pour le héros ; `app/PortfolioUpload.tsx:73` — badge « Photo principale » |
| « l’image est contrôlée avant publication » | `app/PortfolioUpload.tsx:37` — analyse de l’image ; `app/PortfolioUpload.tsx:39` — seul défaut bloquant ; `app/PortfolioUpload.tsx:40` — image bloquante écartée |
| « la galerie […] à partir du niveau 2 » | `app/site/[slug]/page.tsx:177` — galerie visible si niveau au moins 2 ; `app/site/[slug]/page.tsx:331` — rendu de la galerie ; `app/site/[slug]/page.tsx:337` — affichage de chaque image |
| « jusqu’à quatre paires avant/après » | `app/AvantApresUpload.tsx:8` — maximum fixé à 4 ; `app/AvantApresUpload.tsx:36` — ajout borné par ce maximum |
| « réservées au niveau 3 » | `app/profil/page.tsx:593` — éditeur affiché au niveau 3 ; `app/site/[slug]/page.tsx:194` — rendu public au niveau 3 avec paire complète |
| « le visiteur glisse pour révéler » | `app/site/[slug]/page.tsx:348` — consigne affichée ; `app/site/[slug]/page.tsx:349` — composant de comparaison avant/après |

## Ce qui n'est PAS dans cette publication, et pourquoi

La publication distingue les niveaux : la galerie n’apparaît pas au niveau 1 et le comparateur avant/après n’apparaît qu’au niveau 3. Elle ne promet pas que l’analyse améliore une mauvaise photo ; le code avertit et bloque seulement le cas déclaré bloquant. Le visuel des deux variantes est la carte Presti sans photo (`publications/serie-2/pub-16-instagram.jpg`, 1080×1350) : décision de Benj le 16/09, la photo du portfolio de démonstration étant sous licence CC BY-SA. Il ne montre donc ni une réalisation ni une paire avant/après.

---

# Calendrier de la série 2 — Page Facebook Presti et Instagram, jamais deux le même jour sur le même canal

Fixé par Claude Code le 15/09. Semaine 1 = semaine du lundi 14/09 (`--ancre=2026-09-14`). La n° 13 n'y figure pas : elle
est en attente tant que l'application n'est sur aucun store. Facebook le soir (19 h 30), Instagram à la pause de midi
(12 h 30), comme la série 1. Publora (formule Starter) ne tient que trois parutions programmées à la fois, à sept jours :
le reste part au fil de l'eau.

| Semaine | Jour | Heure | N° | Canal |
|---|---|---|---|---|
| 1 | mercredi | 19 h 30 | 11 | Facebook |
| 1 | jeudi | 12 h 30 | 11 (variante B) | Instagram |
| 1 | vendredi | 19 h 30 | 12 | Facebook |
| 1 | samedi | 12 h 30 | 12 (variante B) | Instagram |
| 1 | dimanche | 19 h 30 | 14 | Facebook |
| 2 | lundi | 12 h 30 | 14 (variante B) | Instagram |
| 2 | mardi | 19 h 30 | 15 | Facebook |
| 2 | mercredi | 12 h 30 | 15 (variante B) | Instagram |
| 2 | jeudi | 19 h 30 | 16 | Facebook |
| 2 | vendredi | 12 h 30 | 16 (variante B) | Instagram |
