# PROMPT v12 — La vidéo de présentation et la première publication (Facebook + LinkedIn)

> À coller dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Objectif : produire **la vidéo qui présente Presti** et **les deux premières publications** (Facebook et LinkedIn), prêtes à publier. Protocole habituel : journal, preuves, 0 appel IA sur la réserve de Presti (le montage est local, la rédaction est faite par toi dans cette session).

---

## §0. Ce qui est faisable ici, et ce qui ne l'est pas

- **Aucun connecteur Facebook ni LinkedIn** n'est installé : tu ne peux pas créer de compte, ni publier. Tu produis les **fichiers et les textes**, Benj publie.
- **Les skills LinkedIn sont installées** (`.claude/skills/linkedin-*`, 11 skills + `_linkedin-shared`) : utilise-les pour la version LinkedIn — `linkedin-post-writer` pour l'accroche et la structure, puis **obligatoirement** `linkedin-humanizer --mode audit` avant de livrer le texte.
- **HyperFrames hébergé refuse les agents CLI** (constaté le 04/09 : « disabled for local CLI/IDE agents »). Deux voies : soit installer les skills locales (`npx skills add heygen-com/hyperframes`) qui produisent des compositions HTML montables en local, soit continuer avec la chaîne qui a déjà fonctionné — **Playwright + ffmpeg** (`scripts/shot-video.mjs`, `scripts/demo-captures.mjs`, `public/demo/hero.mp4` de 26 s existe déjà). Essaie les skills locales ; si elles ne s'installent pas proprement, reste sur ffmpeg et dis-le.

**Matière déjà disponible** : `public/demo/scene-1..5.webp` (captures du vrai produit), `public/demo/hero.mp4`, la marque dans `public/marque/` (l'aube, versions claire et sombre, icône, image de partage), les couleurs (`#0A0C11` nuit, `#D97757` corail, `#F3EEE6` crème) et les polices Bricolage Grotesque + Hanken Grotesk.

---

## §1. La vidéo — spécification

### 1.1 Trois formats, un seul montage source

| Format | Ratio | Durée | Usage |
|---|---|---|---|
| **Vertical** | 1080×1920 (9:16) | 25-30 s | Reels Facebook/Instagram, Stories |
| **Carré** | 1080×1350 (4:5) | 25-30 s | Fil Facebook (le 4:5 prend plus de hauteur qu'un 1:1) |
| **Paysage** | 1920×1080 (16:9) | 35-45 s | LinkedIn natif |

Le vertical est le montage de référence ; les deux autres en dérivent (recadrage + réagencement du texte, jamais un simple letterbox avec des bandes noires).

### 1.2 Règles non négociables

- **Le son est coupé par défaut.** La vidéo doit être entièrement compréhensible sans son : sous-titres **incrustés**, gros (≥ 54 px sur 1080 de large), fort contraste, jamais plus de 6 mots par écran. Pas de voix off obligatoire ; si musique, discrète et libre de droits.
- **Les 3 premières secondes décident de tout.** Elles montrent le **problème de l'artisan**, pas le produit, pas le logo. Le logo arrive à la fin.
- **Aucun chiffre inventé.** Pas de « +300 % de devis », pas de faux témoignage, pas de note d'étoiles fabriquée, pas de logo de client qu'on n'a pas. C'est la règle anti-fabrication du produit, et c'est aussi la loi (pratiques commerciales trompeuses). Si un chiffre apparaît, il porte sa source à l'écran.
- **Les captures sont celles du vrai produit** (`public/demo/*.webp`), pas des maquettes. Vérifie qu'aucune donnée réelle d'artisan ou de prospect n'y figure — le compte de démonstration seulement.
- **Zone sûre** : rien d'important dans les 14 % du haut ni les 20 % du bas en vertical (barres d'interface, légendes, boutons).

### 1.3 Le script (à respecter, à ajuster au montage)

Version verticale, 28 secondes :

| Temps | Image | Texte à l'écran |
|---|---|---|
| 0:00-0:03 | Noir, puis texte plein cadre, typo énorme | **« 18 h 47. Un client appelle. »** |
| 0:03-0:06 | Même traitement | **« Vous êtes sur un chantier. »** |
| 0:06-0:09 | Le texte se resserre | **« Vous rappelez à 20 h. Il a signé ailleurs. »** |
| 0:09-0:12 | Coupe franche → capture scène 1 (conversation), le message du client arrive | **« Presti répond pour vous. »** |
| 0:12-0:16 | Scène 2-3, la réponse s'écrit | **« En moins d'une minute. Jour et nuit. »** |
| 0:16-0:20 | Scène 4, le devis | **« Le devis part tout seul. »** |
| 0:20-0:24 | Scène 5, le site de l'artisan | **« Et votre site vous ressemble enfin. »** |
| 0:24-0:28 | Fond nuit, l'aube corail, le mot | **« Presti — prestiapp.fr »** puis **« Essai gratuit, sans carte »** |

Le rythme : coupes nettes, pas de fondus mous ; les captures bougent légèrement (translation lente, 2-3 %), jamais un zoom brutal. Une seule idée par écran.

**Variante LinkedIn (paysage, 40 s)** : même ossature, mais l'accroche parle au dirigeant plutôt qu'à l'artisan sur le toit — « Le premier qui répond décroche le chantier. » — et on ajoute 8 secondes montrant le poste de contrôle et la facturation, qui intéressent un public plus gestionnaire.

### 1.4 Production

1. `node scripts/demo-captures.mjs` pour rafraîchir les captures depuis la **production** (compte de démonstration), en 1080 de large minimum.
2. Composer les cartons de texte : soit avec les skills HyperFrames locales, soit en HTML rendu par Playwright (la chaîne existante), à la marque — fond `#0A0C11`, texte `#EDEFF4`, accent `#D97757`, Bricolage Grotesque 700.
3. Monter avec ffmpeg : `concat` des séquences, `scale`+`crop` pour chaque ratio, sous-titres **incrustés** (`drawtext` ou overlay PNG — pas de fichier `.srt` séparé), 30 fps, H.264, ≤ 8 Mo pour le vertical.
4. Écrire `scripts/promo-video.mjs` qui produit les **trois** formats d'une seule commande, pour pouvoir refaire la vidéo à chaque évolution du produit.
5. Sortie dans `public/promo/` : `presti-vertical.mp4`, `presti-carre.mp4`, `presti-paysage.mp4`, plus une **miniature** par format (première image lisible, avec le texte d'accroche).

**Vérification avant livraison** : regarde les trois fichiers (extraction d'images à 0, 3, 10, 20 s et lecture) — sous-titres lisibles, rien coupé par les zones sûres, aucune donnée réelle visible, poids correct. Si une seule image est illisible en petit, refais-la.

---

## §2. La première publication Facebook

### 2.1 Où elle est publiée

Sur une **Page Facebook « Presti »** (Page professionnelle), pas sur un profil personnel. C'est le format prévu pour une entreprise : il donne accès aux statistiques, à la publicité, au bouton d'action et à la messagerie professionnelle, et il n'expose pas un profil personnel au démarchage. Une Page est administrée depuis un profil personnel réel, qui reste privé.

À préparer, dans l'ordre : nom « Presti », catégorie « Logiciel », photo de profil = `public/marque/presti-icone-512.png`, couverture = une image dérivée de `presti-partage-1200x630.png` recadrée en 1640×856, bouton d'action « En savoir plus » → `prestiapp.fr`, section « À propos » reprenant les mentions légales du site (éditeur, contact, SIREN une fois disponible).

### 2.2 Le texte de la publication

Écris trois variantes complètes, prêtes à copier, dans `plans/publications-lancement.md`. Contraintes : **les 125 premiers caractères** sont visibles avant le « voir plus » — l'accroche tient dedans ; ton direct, phrases courtes, pas de jargon ; **pas d'emoji en rafale** ; un seul appel à l'action ; le lien en **fin** de texte.

Ossature attendue :

> **Accroche** (une phrase, le problème) · **trois lignes** qui déroulent la situation vécue · **ce que fait Presti**, en trois points concrets · **ce que ça change** · **l'appel à l'action** + le lien.

Le lien est un **lien tracké** : utilise le système d'apports déjà en place (`/a/<code>`) pour créer un code dédié à ce canal, afin que le Poste de contrôle attribue correctement les inscriptions venues de Facebook. Un code par canal (`facebook`, `linkedin`), pas un code par personne.

### 2.3 Ce qu'il ne faut pas faire

Pas de faux avis, pas de « ils nous font confiance » sans clients réels, pas de capture d'écran fabriquée, pas de promesse chiffrée non mesurée. Le produit tient debout tout seul : montrer une conversation réelle qui devient un devis suffit.

---

## §3. La version LinkedIn

Utilise `linkedin-post-writer` (choisis une formule adaptée à un public de dirigeants et d'artisans indépendants), puis **passe le texte à `linkedin-humanizer --mode audit`** et corrige ce qu'il signale. Différences avec Facebook :

- Texte plus long accepté (1 300 caractères utiles), mais l'accroche doit tenir dans les **200 premiers caractères** avant le « voir plus ».
- La vidéo se publie en **natif** (téléversée, pas un lien YouTube) : LinkedIn pénalise les liens sortants dans le corps du post. Le lien vers `prestiapp.fr` va **en premier commentaire**.
- Format paysage 16:9 ou carré ; sous-titres incrustés indispensables.
- Trois variantes également, dans le même fichier.

Prépare aussi **cinq commentaires** de réponse type (quelqu'un demande le prix, quelqu'un demande si ça marche pour son métier, quelqu'un est sceptique sur l'IA, quelqu'un demande s'il faut un site existant, quelqu'un demande si ses données sont protégées) — courts, honnêtes, sans promesse.

---

## §4. Mesure

- Un code d'apport par canal, posé dans les liens (`?a=facebook`, `?a=linkedin`).
- Le Poste de contrôle doit montrer, dans l'onglet Clients, la colonne « canal d'arrivée » alimentée par ces codes — vérifie que c'est le cas avant la publication, sinon la première campagne ne se mesure pas.
- Note dans le journal, au moment de publier : date, heure, format, variante utilisée. Sans ça, impossible de savoir ce qui marche.

---

## §5. Liste humaine (Benj)

| # | Action | Pourquoi |
|---|---|---|
| H1 | Créer la **Page Facebook « Presti »** depuis un profil personnel réel | seul un humain peut le faire ; une Page est le bon support pour une entreprise |
| H2 | Fournir le **SIREN** et l'adresse de contact pour la section « À propos » | obligation d'identification de l'éditeur |
| H3 | Valider la variante de texte retenue (Facebook et LinkedIn) | c'est ta voix, pas la mienne |
| H4 | Publier, puis noter l'heure exacte dans le journal | mesure |
| H5 | Décider si un budget publicitaire est engagé, et lequel | change entièrement la stratégie de format |

---

## §6. Livrables

`public/promo/presti-vertical.mp4`, `presti-carre.mp4`, `presti-paysage.mp4` + miniatures · `scripts/promo-video.mjs` (rejouable) · `plans/publications-lancement.md` (3 variantes Facebook, 3 variantes LinkedIn, 5 réponses type, la check-list de publication) · les codes d'apport `facebook` et `linkedin` créés et vérifiés dans le Poste de contrôle.

**Format à chaque étape** : Vérifié · Produit · Preuve (images extraites de la vidéo, poids, durée) · Journal · Suivant.
