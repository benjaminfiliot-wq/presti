# Service « pubs » de Presti : recherche avant l'automatisation (24/09/2026)

> Recherche faite par Claude Code le 24/09/2026. Toutes les pages ont été **lues ce jour-là**, sauf mention contraire.
> **Périmètre :** automatiser la méthode d'Hugo Matias (bibliothèque Meta → annonceur → site → vidéo UGC IA → échantillon gratuit en DM → pack à 1 300 €), puis l'adapter aux artisans du bâtiment.
> **Contexte interne :** la méthode, mot pour mot, est dans `Ecosysteme-Veille-2026-09-24.md` §1. Les packs C (pubs locales, 149 €) et D (studio e-commerce, 490 € supposé) sont dans `Ecosysteme-Plan-2026-09-24.md`.
> **Aucune inscription, aucun achat, aucun appel d'API, rien de modifié dans `presti`.** Ce document n'est pas un avis juridique.

**Étiquettes utilisées :**

| Étiquette | Sens |
|---|---|
| **[OFFICIEL]** | la plateforme ou l'autorité elle-même : Meta, Google, ElevenLabs, TikTok, Légifrance, CNIL, ARPP, texte de l'AI Act |
| **[TIERS]** | blog, cabinet ou média indépendant de l'outil dont il parle |
| **[VENDEUR]** | tiers qui vend l'outil, le service ou le format dont il parle : chiffres à lire comme de la publicité |
| **[INTERNE]** | mesuré par nous, dans les notes de mémoire de Benj |
| **[SUPPOSITION]** | mon raisonnement, pas encore vérifié par une source ou un essai |

---

## 0. Ce qu'il faut retenir (les 8 points qui changent le plan)

1. **L'API `ads_archive` rend bien les pubs commerciales diffusées en France**, avec la portée dans l'UE, l'âge, le genre et les lieux ciblés. Elle ne rend **ni la dépense, ni l'engagement, ni le fichier vidéo, ni l'URL de la page de destination** (§1).
2. **Le point faible de la méthode d'Hugo : la vidéo « envoyée en DM ».** Depuis 2023, Instagram limite une demande de message à un inconnu à **un seul message, texte uniquement**. Vidéos, images et vocaux ne passent qu'après acceptation. L'annonce date de 2023 et je n'ai pas trouvé de source officielle de 2026 qui la confirme : **à retester sur un vrai envoi.** Il faut donc envoyer un **message de permission** ou un **lien**, jamais la pièce jointe (§3.5).
3. **L'API officielle de messagerie Instagram interdit d'écrire en premier.** Automatiser le premier contact passe forcément par le navigateur, donc hors du cadre officiel (§3.5).
4. **Depuis le 2 août 2026, l'article 50 de l'AI Act s'applique.** Une vidéo réaliste où une personne générée tient un vrai produit correspond à la définition d'un hypertrucage (*deep fake*) : **celui qui la diffuse doit dire qu'elle est générée par IA**. L'ARPP a publié le 3 août 2026 une fiche pratique qui propose « Image générée par IA » et « Voix générée par IA » (§3.2).
5. **Un avatar qui dit « j'ai testé, ma peau a changé » est un faux avis de consommateur.** C'est une pratique commerciale trompeuse **réputée** telle par l'article L121-4 (21° et 28°) du Code de la consommation. Il n'y a rien à prouver de plus pour la sanctionner. Le format sûr : **démonstration du produit**, et présentateur annoncé comme virtuel (§3.3).
6. **ElevenLabs :** le plan payant donne le droit commercial. Mais ses conditions exigent **d'avoir les droits sur ce qu'on importe**, donc sur les photos du produit d'une autre marque. Sa politique d'usage interdit aussi de **collecter des contacts en masse pour des messages non sollicités** (§3.4).
7. **Marché :** l'UGC humain se vend en France entre 80 et 600 € la vidéo, souvent 150 à 350 €. L'UGC IA coûte 8 à 12 € en libre-service. Le pack d'Hugo (1 300 € les 10, soit 130 € la vidéo) se place au bas des prix humains. Les taux de réponse aux DM **annoncés** vont de 15 à 32 %. Les taux **mesurés** sont bien plus bas : **0 sur 12 chez nous sur Instagram** (§4).
8. **Artisans :** ce qui marche, c'est le vrai (avant/après, chantier filmé, patron face caméra, vrai client). Leurs pubs relèvent **probablement de la catégorie spéciale « Logement »** de Meta, qui inclut les « réparations de logement » et s'applique en Europe depuis le 7 décembre 2021. Le ciblage en est restreint (§5).

---

## 1. L'API de la bibliothèque publicitaire Meta (`ads_archive`)

### 1.1 Accès

| Étape | Détail | Source |
|---|---|---|
| Vérifier son identité et son pays | sur `facebook.com/ID`, compter 1 à 3 jours ouvrés. Sans cela, l'API renvoie l'erreur 1357045 | [TIERS] admapix.com, 06/04/2026 ; [TIERS] adsuploader.com, 29/07/2026 |
| Compte Meta for Developers et application | on accepte les conditions de la plateforme, puis on suit le parcours « Access the API » | [TIERS] swipekit.app, 17/09/2026 |
| Jeton d'accès | jeton utilisateur, échangé contre un jeton longue durée d'**environ 60 jours**, à renouveler | [TIERS] adlibrary.com, 12/06/2026 ; [TIERS] admapix.com |

Sources : https://www.admapix.com/blog/ad-intelligence/meta-ads-library-api-developers · https://adsuploader.com/blog/facebook-ad-library-api · https://swipekit.app/articles/meta-ad-library-api · https://adlibrary.com/posts/meta-ad-library-api-limitations

### 1.2 Paramètres de recherche (référence officielle, Graph API v26.0)

Source [OFFICIEL] : https://developers.facebook.com/docs/marketing-api/reference/ads_archive/

| Paramètre | Valeurs | Ce qu'il faut savoir |
|---|---|---|
| `ad_reached_countries` | `['FR']`, `ALL`… | **obligatoire** |
| `search_terms` | 100 caractères maximum | **un espace vaut « ET »** |
| `search_type` | `KEYWORD_UNORDERED` (par défaut), `KEYWORD_EXACT_PHRASE` | la phrase exacte évite le bruit |
| `ad_type` | `ALL` (par défaut), `POLITICAL_AND_ISSUE_ADS`, `HOUSING_ADS`, `EMPLOYMENT_ADS`, `FINANCIAL_PRODUCTS_AND_SERVICES_ADS` | `ALL` pour les pubs commerciales |
| `ad_active_status` | `ACTIVE` (par défaut), `INACTIVE`, `ALL` | |
| `ad_delivery_date_min` / `_max` | `AAAA-mm-jj` | |
| `search_page_ids` | **10 pages au plus** | pour surveiller un annonceur connu |
| `publisher_platforms` | `FACEBOOK`, `INSTAGRAM`, `MESSENGER`, `AUDIENCE_NETWORK`, `WHATSAPP`, `THREADS`… | |
| `languages` | codes ISO 639-1 (`fr`) | |
| `media_type` | `ALL`, `IMAGE`, `MEME`, `VIDEO`, `NONE` | `VIDEO` = annonceurs qui font déjà de la vidéo |
| `unmask_removed_content` | booléen | |

La même page officielle dit : « les pubs qui n'ont atteint **aucun** lieu de l'UE ne sont renvoyées que si elles portent sur un sujet social, électoral ou politique ». Autrement dit, **une pub commerciale diffusée en France est renvoyée.**

Attention, les sources tierces se contredisent sur ce point. admapix.com (06/04/2026) écrit que l'API « ne renvoie pas les pubs commerciales ». adlibrary.com (12-13/06/2026) et swipekit.app (17/09/2026) écrivent qu'elle les renvoie pour l'UE et le Royaume-Uni avec `ad_type=ALL`. **La doc officielle et les deux sources les plus récentes vont dans le sens « oui ».** Le premier vrai appel tranchera.

### 1.3 Champs rendus (nœud `ArchivedAd`, v26.0)

Source [OFFICIEL] : https://developers.facebook.com/docs/graph-api/reference/archived-ad/

| Champ | Pour quelles pubs | Usage pour Presti |
|---|---|---|
| `id`, `page_id`, `page_name` | toutes | identifier l'annonceur |
| `ad_creation_time`, `ad_delivery_start_time`, `ad_delivery_stop_time` | toutes | ancienneté : une pub qui tourne depuis longtemps est un signal de pub rentable [SUPPOSITION] |
| `ad_creative_bodies`, `ad_creative_link_titles`, `ad_creative_link_descriptions`, `ad_creative_link_captions` | toutes | textes de la pub ; la légende du lien montre souvent le **domaine** du site [SUPPOSITION à vérifier au premier appel] |
| `ad_snapshot_url` | toutes | lien de rendu de la pub, **pas un fichier** |
| `publisher_platforms`, `languages` | toutes | |
| `total_reach_by_location` | toutes | |
| `eu_total_reach` | **pubs UE seulement** | portée estimée dans l'UE : le meilleur indicateur de budget disponible |
| `age_country_gender_reach_breakdown`, `target_ages`, `target_gender`, `target_locations` | **UE et Royaume-Uni** | cible choisie par l'annonceur |
| `beneficiary_payers` | **UE seulement** | qui paie, qui en profite |
| `spend`, `impressions`, `currency`, `demographic_distribution`, `bylines`, `estimated_audience_size` | **politiques seulement** | **pas de dépense pour une pub commerciale** |

### 1.4 Limites

| Limite | Détail | Source |
|---|---|---|
| Débit | Meta ne publie pas de chiffre propre à cette API. La règle générale de la Graph API est de **200 appels par heure et par utilisateur**. Le dépassement renvoie l'erreur **613** | [OFFICIEL] https://developers.facebook.com/docs/graph-api/overview/rate-limiting/ ; [TIERS] adlibrary.com, admapix.com (« 200 appels/h ») ; [TIERS] adsuploader.com : « Meta n'en publie pas, le bridage est dynamique » |
| Pagination | quelques centaines de résultats par page au plus avant les délais d'attente ; 10 000 résultats à 25 par page coûtent environ 400 appels | [TIERS] adsuploader.com ; [TIERS] adlibrary.com |
| Pas de fichier | « jamais d'image ni de vidéo », seulement `ad_snapshot_url`. Meta tolère le téléchargement d'une créa **pour analyse**, sous réserve de ses conditions de stockage | [TIERS] adsuploader.com ; [TIERS] swipekit.app |
| Pas de performance | ni J'aime, ni commentaires, ni taux de clic. **La durée de diffusion est le seul indicateur** | [TIERS] adlibrary.com |
| Conservation | pubs UE : **pendant la diffusion, puis un an** (obligation de l'article 39 du DSA) ; pubs politiques : sept ans | [OFFICIEL] texte du DSA, art. 39, via https://www.cms-digitallaws.com/en/dsa/article-39/ (résumé du moteur de recherche, page non ouverte) ; [TIERS] adlibrary.com |
| Pas exhaustive | Mozilla (2019) : « aucune garantie d'exhaustivité », résultats non reproductibles d'un jour à l'autre, pagination qui boucle. Leur solution : **une requête par pays** | [TIERS] https://adtransparency.mozilla.org/eu/methods/ (méthode de 2019, sur les pubs politiques) |
| Moissonnage de l'interface | les conditions d'Instagram et de Meta interdisent la collecte automatisée sans permission expresse. **L'API seulement**, comme le prévoit déjà l'agent A7 du plan | [OFFICIEL] conditions d'utilisation d'Instagram, https://help.instagram.com/581066165581870/ (passage cité par le moteur de recherche, la page ne s'affiche pas sans JavaScript) |

### 1.5 Requêtes réelles documentées, et la nôtre

**Documentées par des tiers :**

- Pubs commerciales en Allemagne, publiée par [TIERS] swipekit.app (17/09/2026) :
  `search_terms=shoes`, `ad_type=ALL`, `ad_reached_countries=['DE']`.
- Pubs britanniques d'une page donnée, en Python, publiée par [TIERS] adsuploader.com (29/07/2026) :
  `ad_reached_countries='["GB"]'`, `search_page_ids='["123456789"]'`, `ad_active_status=ALL`,
  `fields=id,page_name,ad_creative_bodies,ad_delivery_start_time,ad_delivery_stop_time,publisher_platforms,ad_snapshot_url,eu_total_reach`, `limit=250`.
- Exemple officiel, mais politique : `search_terms='california'`, `ad_type=POLITICAL_AND_ISSUE_ADS`, `ad_reached_countries=['US']`.

**Requête France proposée pour la vigie** [SUPPOSITION : construite à partir des paramètres officiels, pas encore testée] :

```bash
curl -G "https://graph.facebook.com/v26.0/ads_archive" \
  --data-urlencode "access_token=$META_ADLIB_TOKEN" \
  --data-urlencode "ad_type=ALL" \
  --data-urlencode "ad_reached_countries=['FR']" \
  --data-urlencode "search_terms=sérum visage" \
  --data-urlencode "search_type=KEYWORD_EXACT_PHRASE" \
  --data-urlencode "ad_active_status=ACTIVE" \
  --data-urlencode "media_type=VIDEO" \
  --data-urlencode "publisher_platforms=['INSTAGRAM']" \
  --data-urlencode "languages=['fr']" \
  --data-urlencode "ad_delivery_date_min=2026-08-01" \
  --data-urlencode "fields=id,page_id,page_name,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_snapshot_url,publisher_platforms,eu_total_reach,target_ages,target_gender,target_locations,beneficiary_payers" \
  --data-urlencode "limit=100"
```

**Filtre « annonceur qui a un budget »** [SUPPOSITION] : regrouper par `page_id`, puis garder les pages qui ont **au moins trois pubs actives**, dont une lancée il y a **plus de 30 jours**, avec un `eu_total_reach` cumulé au-dessus d'un seuil à calibrer. Le **site** ne vient pas de l'API : on le déduit de `ad_creative_link_captions`, sinon on le cherche, puis scrapegraphai lit la page produit.

---

## 2. Les workflows UGC IA qui marchent en 2026

### 2.1 La chaîne qui ressort de toutes les sources

1. **Photos réelles du produit** : 3 à 5 angles, même lumière. On les prend sur le site de la marque (voir §3.4 pour les droits). [TIERS] segwise.ai, 12/06/2026
2. **Une image fixe d'abord**, avec Nano Banana Pro : la personne tient le produit, en 9:16. On la valide à l'œil **avant** toute vidéo. La raison : « un modèle vidéo à qui l'on demande d'inventer la composition l'invente à chaque image ; un modèle à qui l'on donne une image fixe n'a qu'à la prolonger ». [TIERS] résumé de recherche citant rasgo.ai et segwise.ai
3. **Image vers vidéo, plan par plan**, 4 à 8 s chacun. On donne la même référence produit à chaque plan (« carte de continuité »), et on répète les descriptions mot pour mot d'un plan à l'autre. [TIERS] segwise.ai ; [VENDEUR] ugcvids.ai, 09/08/2026
4. **Voix** : soit la voix native du modèle vidéo (Veo 3.1, Kling 3), soit ElevenLabs puis synchronisation des lèvres (HeyGen Avatar 4, Creatify Aurora, Sync 3, tous présents dans ElevenLabs Creative). [OFFICIEL] https://elevenlabs.io/docs/overview/capabilities/image-video
5. **Montage, sous-titres, carton « générée par IA »** : **dans HyperFrames, jamais par le modèle vidéo.** Les modèles ajoutent d'eux-mêmes de faux sous-titres ou un pseudo-filigrane, d'où la clause négative. [VENDEUR] ugcvids.ai
6. **Contrôle qualité image par image** avant envoi, sur 10 critères. [TIERS] segwise.ai

**Quel modèle pour quel plan** (tous disponibles dans ElevenLabs Creative, d'après [OFFICIEL] la doc ElevenLabs Image & Video) :

| Besoin | Modèle | Pourquoi (source) |
|---|---|---|
| Plan où le **texte de l'étiquette** doit rester lisible | **Gemini Omni Flash** (720p, 3-10 s, 8 images de référence) | décrit par ElevenLabs comme « le meilleur rendu de texte à l'écran des modèles vidéo disponibles » [OFFICIEL] |
| Plan réaliste avec son natif, produit tenu | **Veo 3.1** (4, 6 ou 8 s ; 1080p en 8 s seulement ; 3 images de référence ; première et dernière image imposables) | [OFFICIEL] https://ai.google.dev/gemini-api/docs/veo |
| Personne qui **parle longtemps** face caméra | **Kling 3.0** (3 à 15 s, 1080p, synchronisation labiale multilingue) | le meilleur en synchronisation labiale selon [VENDEUR] ugcvids.ai, 02/07/2026 |
| Tenir le produit identique sur beaucoup de références | **Seedance 2.0 / 2.5** (jusqu'à 9, puis 50 références) | [OFFICIEL] doc ElevenLabs ; [TIERS] segwise.ai |
| Avatar parlant à partir d'**une photo et d'un son** | **HeyGen Avatar 4**, **Creatify Aurora** (480-720p, mains et corps suivent la voix) | [OFFICIEL] doc ElevenLabs |

Chez HeyGen, le placement de produit est « optimisé pour les petits objets tenus à la main ». Un objet plus gros risque d'être **réduit** pour tenir dans la main. [OFFICIEL] https://help.heygen.com/en/articles/12704854-product-placement-combine-a-product-with-an-avatar-in-a-video

Dans l'UE, Veo n'accepte que `personGeneration=allow_adult` : pas de mineurs. Toutes ses vidéos portent un filigrane **SynthID**, et Google les efface de ses serveurs **au bout de 2 jours**. [OFFICIEL] https://ai.google.dev/gemini-api/docs/veo

### 2.2 Prompts types

**Squelette Veo 3.1 pour une démonstration de produit** [VENDEUR] ugcvids.ai, 09/08/2026, https://ugcvids.ai/blog/how-to-write-veo-3-1-prompts-for-product-ads. L'ordre compte : caméra, sujet, action, réplique, son, négatifs. Le texte est à rédiger en anglais, la réplique en français :

> 9:16 vertical phone-camera shot, [une personne, tranche d'âge] in [pièce], framed chest-up, [source de lumière], no studio lighting. Phone propped on a surface, frame locked, no pans, no zooms, no dolly. [Intention de jeu : enthousiaste, rythme rapide…]. They [UNE action avec le produit, tenu immobile], and say to camera: "[15 à 20 mots]". Audio: close conversational voice, quiet [pièce] ambience, no music. No on-screen text, no captions, no subtitles, no watermark, no stickers, no fake app interface.

Trois règles l'accompagnent :

- **15 à 20 mots pour 8 s.** Au-delà, le modèle « se presse, saute des morceaux ou invente sa propre fin ». [VENDEUR] ugcvids.ai
- **L'intention de jeu va avant la réplique entre guillemets**, pas après : Veo règle l'interprétation sur ce qui précède. [TIERS] résumé de recherche citant lumalabs.ai et ugcvids.ai
- **La réplique va entre guillemets**, et les bruitages se décrivent explicitement. [OFFICIEL] Google

**Image fixe « filmée à l'iPhone »** [TIERS] adlibrary.com, 26/04/2026 :

> Candid smartphone photo of a [âge] [genre] [profil] [action avec le produit] in their [lieu], shot on iPhone, natural [moment] lighting, [cadrage], casual and authentic feeling, slight grain, not a professional photo.

### 2.3 Défauts à éviter, et la parade de chacun

| Défaut | Ce qui se passe | Parade | Source |
|---|---|---|---|
| **Texte du produit déformé** | « les modèles génératifs sont notoirement mauvais sur le petit texte, la marque tourne au charabia » ; une liste d'ingrédients dense devient une texture | plan serré sur la **vraie photo** du produit (incrustée au montage, pas générée) ; étiquette grande et immobile ; Gemini Omni pour les plans avec texte | [TIERS] segwise.ai ; [TIERS] résumé citant rasgo.ai ; [VENDEUR] ugcvids.ai |
| **Mains** | doigts qui traversent l'emballage, produit qui flotte | geste simple, produit tenu immobile, pas de versement, de déballage ni de mouvement rapide ; vérifier les points de contact image par image | [TIERS] linocut.ai, 15/07/2026 ; [TIERS] adlibrary.com |
| **Produit qui change d'un plan à l'autre** | bouchon, couleur ou proportions qui dérivent ; produit qui se multiplie | même référence sur chaque plan ; plans courts ; contrôle en 10 points (catégorie, forme, couleur, matière, **lisibilité de l'étiquette**, **logo**, structure de l'emballage, taille par rapport à la main, **nombre d'unités**, identité d'un plan à l'autre) | [TIERS] segwise.ai |
| **Faux sous-titres ou filigrane** | ajoutés par le modèle | clause négative ; sous-titres posés dans HyperFrames | [VENDEUR] ugcvids.ai |
| **Voix : chiffres, prix, noms de marque** | chiffres et symboles lus dans la mauvaise langue avec les modèles multilingues ; accentuation française approximative (« entrepreneur », « région », « accueil ») | écrire les nombres en toutes lettres ; dictionnaire de prononciation (balises phonème avec `eleven_v3` et `eleven_flash_v2`) pour le nom de la marque ; transcrire la piste avant livraison (mémoire `voix-cache-par-texte`) | [OFFICIEL] https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices ; [TIERS] dismapoule.com, 29/07/2025 |
| **Aspect « pub IA »** | peau parfaite, pièce trop éclairée, phrases qui sonnent pub | imperfections contrôlées ; un seul détail utile, dit comme un créateur le dirait | [TIERS] linocut.ai |
| **Plusieurs personnes, caméra très mobile, clip long** | dérive rapide | une personne, cadre fixe, 5 à 15 s | [TIERS] adlibrary.com |

### 2.4 Coût réel et temps

| Poste | Chiffre | Source |
|---|---|---|
| Veo 3.1 via l'API Gemini | Standard : **0,40 $/s** (720p et 1080p) ; Fast : 0,10 $/s en 720p, **0,12 $/s en 1080p** ; Lite : 0,05 $/s en 720p, **0,08 $/s en 1080p** (son compris) | [OFFICIEL] https://ai.google.dev/gemini-api/docs/pricing |
| Nano Banana Pro | **0,134 $ par image 1K-2K**, 0,24 $ en 4K ; 0,067 $ en traitement par lots | [OFFICIEL] même page |
| ElevenLabs Creative (chiffre de Benj) | environ **0,61 $ le clip de 8 s**, soit à peu près le prix de Veo Lite en 1080p (8 × 0,08 = 0,64 $) | donnée de la mission, recoupée [SUPPOSITION] |
| Latence de Veo | **de 11 s à 6 min** par clip (6 min aux heures de pointe) | [OFFICIEL] Google |
| Image composée HeyGen | jusqu'à 60 s | [OFFICIEL] HeyGen |
| Temps annoncé par les tiers | « moins de 30 min par créa » (Nano Banana → Kling → ElevenLabs → montage) | [TIERS] adlibrary.com, sans mesure publiée |
| Coût annoncé par les tiers | UGC IA en libre-service : 8 à 12 € la vidéo, 80 à 120 € avec accompagnement ; 60 à 150 $ par mois pour une PME qui fait 10 à 15 vidéos | [TIERS] résumé citant obeevi.fr, agence vidéo, mai 2026 |

**Estimation pour une vidéo de 24 à 30 s** [SUPPOSITION, à mesurer sur le premier pack] : 3 ou 4 plans de 8 s, 2 à 3 essais par plan gardé, soit 8 à 12 générations × 0,61 $ ≈ **5 à 7 $**. S'y ajoutent 3 à 5 images fixes (≈ 0,5 $) et la voix. **Total : environ 6 à 9 $ la vidéo, 60 à 90 $ le pack de 10.** Compter **15 à 40 min** de temps réel par vidéo, contrôle compris. Les 3 accroches de la méthode d'Hugo ne changent qu'un plan d'ouverture chacune : environ + 2 $ par vidéo.

---

## 3. Le droit et les règles

### 3.1 Tableau de décision rapide

| Question | Réponse courte | Où |
|---|---|---|
| Faut-il écrire « généré par IA » sur une vidéo UGC IA publiée en pub ? | **Oui dans les faits** : AI Act art. 50(4) depuis le 2/08/2026 si la vidéo est réaliste, TikTok toujours, Meta l'étiquette souvent d'office, et la fiche ARPP va dans ce sens | §3.2 |
| Un avatar peut-il dire « j'ai testé ce produit » ? | **Non** : faux avis de consommateur, pratique trompeuse « réputée » | §3.3 |
| Peut-on montrer le produit d'une marque dans un échantillon privé ? | Risque faible **si** rien n'est publié et que l'échantillon ne va qu'à la marque ; mais c'est techniquement une reproduction sans autorisation | §3.4 |
| ElevenLabs permet-il l'usage publicitaire ? | Oui avec un plan payant, sous réserve de sa politique d'usage et des droits sur ce qu'on importe | §3.4 |
| Peut-on envoyer la vidéo en premier message Instagram ? | **Non** d'après la règle de 2023 (texte seul) : **à retester** | §3.5 |

### 3.2 La mention « contenu généré par IA »

**AI Act (règlement 2024/1689), article 50** [OFFICIEL, texte reproduit par https://artificialintelligenceact.eu/article/50/ et /article/3/] :

- **Définition du *deep fake* (art. 3, point 60) :** contenu image, audio ou vidéo généré ou manipulé par IA « qui ressemble à des personnes, **objets**, lieux, entités ou événements existants » et qui paraîtrait faussement authentique. Un vrai produit tenu par une fausse personne réaliste entre dans cette définition [SUPPOSITION d'interprétation, confortée par les lignes directrices ci-dessous].
- **Art. 50(4) :** le **déployeur**, c'est-à-dire celui qui utilise le système dans un cadre professionnel, doit indiquer que le contenu est généré ou manipulé. **La marque qui diffuse la pub est déployeur ; Presti, qui fabrique, l'est aussi** [SUPPOSITION].
- **Art. 50(5) :** l'information doit être donnée « de manière claire et reconnaissable, au plus tard lors de la première interaction ou exposition ».
- **Exception :** œuvre « manifestement artistique, créative, satirique ou fictionnelle », avec seulement une mention allégée. Une pub UGC réaliste n'en relève pas [SUPPOSITION].
- **Calendrier :** l'article 50 s'applique depuis le 2 août 2026. L'accord politique sur l'« omnibus IA » reporterait au **2 décembre 2026** l'obligation de **marquage technique** (art. 50(2), qui vise les fournisseurs d'outils), mais son adoption formelle est en attente. **L'obligation de mention du déployeur (art. 50(4)) n'est pas reportée.** Sources : [TIERS] Greenberg Traurig, 08/06/2026, https://www.gtlaw.com/en/insights/2026/6/deepfakes-chatbots-ai-generated-text-european-commission-details-transparency-obligations-under-the-ai-act ; [TIERS] résumé de recherche citant artificialintelligenceact.eu et stibbe.com.
- **Lignes directrices de la Commission** (d'après Greenberg Traurig) : un *deep fake* se lit largement, il suffit que le contenu « ressemble à quelqu'un ou quelque chose qui pourrait exister ». La mention doit être visible **à l'écran**, en clair ; une mention dans les métadonnées ou les conditions générales **ne suffit pas**. Sanction : jusqu'à **15 M€ ou 3 % du chiffre d'affaires mondial**.

**ARPP, fiche pratique du 3 août 2026** [OFFICIEL, autorégulation] : https://www.arpp.org/actualite/arpp-fiche-pratique-etiquetage-contenus-publicitaires-intelligence-artificielle/

- Trois critères : **niveau d'intervention** de l'IA (retouche mineure, manipulation substantielle ou génération complète), **degré de réalisme**, **effet sur la perception** d'authenticité.
- Mentions proposées : **« Image générée par IA »**, **« Voix générée par IA »**.
- Qualités exigées, d'après [TIERS] Hiro Avocats (https://hiro-avocats.com/la-fiche-pratique-de-larpp-sur-letiquetage-des-contenus-publicitaires-generes-ou-manipules-par-lintelligence-artificielle/) : mention visible ou audible, claire, distincte, lisible assez longtemps, adaptée au support. Cas où il faut étiqueter, toujours selon Hiro Avocats : avatars humains réalistes, voix de synthèse présentées comme un témoignage, produit rendu plus performant qu'en vrai.
- **Le PDF complet n'est remis qu'après un formulaire** (nom, e-mail, téléphone). **Je ne l'ai pas rempli** (aucune inscription). À faire par Benj : c'est la meilleure grille française.

**Meta** [OFFICIEL] https://www.meta.com/help/artificial-intelligence/355108217670024/ :

- l'auto-déclaration n'est **obligatoire que pour les pubs politiques ou sociales** ;
- Meta étiquette d'office (« Infos IA ») les pubs faites avec ses propres outils, ou quand il détecte des signaux comme les métadonnées C2PA ;
- pour une **image de personne humaine photoréaliste générée par IA**, la mention apparaît **à côté de « Sponsorisé »**, et non plus dans le menu à trois points.

**TikTok** [OFFICIEL] https://ads.tiktok.com/help/article/tiktok-ads-policy-misleading-and-false-content (mise à jour d'avril 2026) :

- le contenu généré par IA est permis **si** on applique l'étiquette AIGC **ou** une mention, un sous-titre, un filigrane ou un autocollant clair ;
- sont visés : les contenus « entièrement générés par IA » et la voix clonée qui fait dire à quelqu'un ce qu'il n'a pas dit ;
- un contenu non déclaré est **refusé ou restreint** ;
- les **avant/après** qui donnent une impression fausse du résultat sont interdits (voir §5).

**Loi « influenceurs » (loi 2023-451, art. 5 réécrit par l'ordonnance 2024-978)** [OFFICIEL] https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000050468897/2026-03-24 : un contenu d'influence commerciale qui montre un **visage ou une silhouette** produit par IA doit porter **« Images virtuelles »**. Sanction : un an d'emprisonnement et 4 500 € d'amende. Elle vise **les personnes qui exercent l'influence commerciale**. Pour une pub diffusée par la marque sur son propre compte, l'application est **incertaine** [SUPPOSITION]. Par prudence, « Images virtuelles » ou « Image générée par IA » couvre les deux textes.

**Recommandation pour Presti** [SUPPOSITION] : incruster dans HyperFrames un carton **« Vidéo générée par IA »** dès la première seconde et pendant toute la vidéo, en petit mais lisible. Si la voix est de synthèse, ajouter « Voix générée par IA ». Cocher la case IA dans TikTok Ads Manager. **Ne jamais retirer** les métadonnées C2PA ni le filigrane SynthID.

### 3.3 Faux témoignages : Code de la consommation, art. L121-4

Source [OFFICIEL] : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044224578/ (version du 28/05/2022). Ces pratiques sont **réputées trompeuses** : il n'y a pas à prouver qu'elles ont trompé quelqu'un.

- **21°** « De faussement affirmer ou donner l'impression que le professionnel n'agit pas à des fins qui entrent dans le cadre de son activité [...] **ou de se présenter faussement comme un consommateur** ».
- **27°** affirmer que des avis viennent de consommateurs qui ont réellement utilisé le produit sans avoir pris les mesures nécessaires pour le vérifier.
- **28°** « De diffuser ou faire diffuser par une autre personne morale ou physique **des faux avis ou de fausses recommandations de consommateurs** ».
- **11°** publireportage non signalé comme tel.

**Conséquence** [SUPPOSITION d'application] : le format « cliente ravie » (« j'ai testé, en deux semaines ma peau… ») joué par un avatar est un faux avis au sens du 28°, et la personne générée se présente comme consommatrice au sens du 21°. La mention « générée par IA » **ne rend pas vrai** un témoignage inventé.

**Formats sûrs :**

- (a) **démonstration** : « voici comment s'utilise ce sérum », des faits tirés du site de la marque et rien d'autre ;
- (b) **présentateur virtuel annoncé**, qui ne raconte aucune expérience vécue ;
- (c) **vrai avis client** repris mot pour mot, avec l'accord écrit de la marque et la preuve que l'avis existe.

Les allégations (« hydrate 24 h ») doivent venir **du site de la marque** : c'est elle qui doit pouvoir les prouver. On garde une copie datée de la page source dans le dossier du pack.

### 3.4 Produit et marque d'un tiers dans l'échantillon, et conditions d'ElevenLabs

**Droit d'auteur (photos du site de la marque)** [OFFICIEL] CPI art. L122-4, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278911 : « Toute représentation ou reproduction intégrale ou partielle faite sans le consentement de l'auteur [...] est illicite. Il en est de même pour la traduction, l'adaptation ou la transformation [...] ». **Importer les photos produit dans un générateur, c'est les reproduire et les adapter.**

**Marque** : l'art. L713-2 du CPI interdit l'usage « dans la vie des affaires » d'un signe identique sans autorisation. Il reste des exceptions : référence nécessaire, épuisement des droits, et l'usage qui ne crée **aucune confusion** sur un lien commercial. Sources : [TIERS] résumé de recherche citant acbm-avocats.com ; [TIERS] Village de la Justice, 01/08/2014, https://www.village-justice.com/articles/Peut-utiliser-dans-vie-des,17504.html.

**Lecture du risque pour l'échantillon privé** [SUPPOSITION, à faire valider par la consultation juridique prévue au plan (D12)] :

- **Envoyé à la seule marque** : le titulaire des droits est le destinataire, aucun public n'est trompé, et le préjudice est difficile à imaginer. Le risque est **faible, mais la reproduction reste techniquement non autorisée**.
- **Publié** (portfolio, Reel de démonstration, landing, compte Instagram du studio) sans accord écrit : risque **réel** de contrefaçon, sur la marque comme sur les photos, et de parasitisme.
- **Garde-fous :** filigrane « Échantillon, non diffusé, sans lien avec [marque] » sur l'échantillon ; **aucune publication** d'échantillon ; à la vente, une **cession de droits** écrite dans les deux sens (la marque autorise l'usage de ses visuels, Presti cède la vidéo) ; pas de réutilisation d'un échantillon refusé.

**ElevenLabs** [OFFICIEL] :

- **Conditions d'utilisation** (en vigueur au 31/03/2026, https://elevenlabs.io/terms-of-use) : plan gratuit = usage **non commercial** seulement ; plan payant = usage commercial permis, mais la **politique d'usage interdit** continue de s'appliquer. Et surtout : « Vous ne pouvez pas fournir d'Input ou créer d'Output pour lesquels vous n'avez pas tous les droits nécessaires ». Importer les photos d'une marque sans son accord **contrevient à cette garantie**, et l'utilisateur **garantit ElevenLabs** contre toute réclamation d'un tiers.
- **Politique d'usage** (en vigueur au 17/08/2026, https://elevenlabs.io/use-policy) : interdit de « porter atteinte aux droits de propriété intellectuelle d'autrui », de tromper de manière à causer un préjudice, et, règle **4(e)**, de « collecter en masse des adresses e-mail, numéros de téléphone ou autres coordonnées dans le but d'envoyer des communications non sollicitées ». La **vigie Meta, qui collecte des comptes Instagram de marques pour les démarcher, ne doit donc pas tourner avec les outils d'ElevenLabs** [SUPPOSITION d'interprétation]. Elle tourne à part, via l'API Meta, et c'est déjà le plan.
- **Mentions d'attribution :** le plan gratuit exige « elevenlabs.io » ou « 11.ai » dans le titre. [TIERS] résumé de recherche citant l'aide d'ElevenLabs (page d'aide en 403).
- **Point à vérifier :** plusieurs tiers écrivent que les **services en bêta** sont exclus de la licence commerciale, même sur plan payant. [TIERS] résumé citant bigvu.tv ; [TIERS] HackerNoon, 14/08/2026. Il faut vérifier si les modèles vidéo tiers d'ElevenLabs Creative sont étiquetés bêta.
- **Modèles tiers :** Kling interdit l'usage commercial aux non-payants (lève l'interdiction pour les payants) ; chez Google, la garantie juridique de Veo dépend du statut « disponibilité générale » (Veo 3.1 encore « Preview » selon la source). [TIERS] HackerNoon, 14/08/2026. Les modèles ByteDance (Seedance) sont **désactivés par défaut** chez ElevenLabs et demandent une approbation explicite. [OFFICIEL] doc ElevenLabs

### 3.5 Démarchage par DM

**Ce que dit la plateforme :**

- **Premier message à un inconnu :** « vous ne pourrez lui envoyer **qu'un seul message** [...] les invitations sont désormais **limitées au texte** : images, vidéos ou vocaux seulement après acceptation ». Source : [TIERS] TechCrunch, 03/08/2023, qui cite l'annonce de Meta, https://techcrunch.com/2023/08/03/instagrams-new-feature-protects-users-from-unwanted-images-and-videos-in-dms. Des guides de 2026 confirment que le message d'un non-abonné va dans le dossier **Invitations**. Aucun ne confirme ni n'infirme la règle « texte seul » pour 2026. [TIERS] view-ig-story.com, aigrow.me. **À retester sur un envoi réel.**
- **API officielle :** « c'est seulement **après** qu'un utilisateur Instagram a écrit au compte professionnel que votre application peut lui envoyer un message ». Ensuite, fenêtre de 24 h, prolongeable par l'étiquette « agent humain ». [OFFICIEL] https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/ **Aucun premier contact n'est automatisable par la voie officielle.**
- **Conditions d'Instagram :** interdisent de créer des comptes, d'accéder à des informations ou de les collecter « de manière automatisée [...] sans notre permission expresse ». [OFFICIEL] extrait cité par le moteur de recherche, https://help.instagram.com/581066165581870/
- **Volumes :** Instagram ne publie pas de plafond. Les tiers parlent de 20 à 50 messages par jour pour un compte neuf, 30 à 40 vers des non-abonnés ; au-delà, « action bloquée » pendant quelques heures ou quelques jours. [TIERS] résumé citant usecarly.com, dmpro.app, boostfluence.com. Côté interne, le « plafond de 6 messages » mesuré le 09/09 a été **requalifié en clic raté** le 10/09 : il n'est pas démontré. [INTERNE] mémoire `instagram-dm-automatisation`

**Ce que dit le droit** :

- **Art. L34-5 du CPCE** [OFFICIEL] https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961/ : la prospection directe par « courriers électroniques » vers une **personne physique** exige son consentement préalable. Est prospection directe « l'envoi de tout message destiné à promouvoir, directement ou indirectement, des biens, des services ». Un échantillon gratuit suivi d'une offre de pack **est** de la prospection directe.
- **Un DM Instagram est-il un « courrier électronique » ?** La directive 2002/58, art. 2 h), le définit comme « tout message sous forme de texte, de voix, de son ou d'image envoyé par un réseau public de communications qui peut être stocké dans le réseau ou dans l'équipement terminal du destinataire jusqu'à ce que ce dernier le récupère ». [OFFICIEL] EUR-Lex, définition citée par le moteur de recherche, https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=celex:32002L0058 La CNIL ne traite pas explicitement des réseaux sociaux sur sa page (lue le 24/09, datée du 10/06/2026). Un DM **correspond vraisemblablement** à cette définition [SUPPOSITION].
- **B2B** [OFFICIEL] CNIL, https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel : vers un professionnel, la prospection peut reposer sur l'**intérêt légitime** « lorsque l'objet de la sollicitation est en rapport avec la profession de la personne démarchée ». Chaque message doit permettre de connaître **l'identité de l'émetteur** et de **refuser simplement** les suivants. Un compte de marque dont l'objet est la pub est dans ce cas. L'**auto-entrepreneur** derrière une petite marque reste une personne physique : à traiter avec la même prudence [SUPPOSITION].
- **Sanctions** : jusqu'à 75 000 € (personne physique) ou 375 000 € (personne morale) par la DGCCRF sur L34-5. [TIERS] Kohen Avocats, 21/09/2026, https://kohenavocats.fr/2026/09/21/emails-commerciaux-non-sollicites-b2b-consentement-opposition-cnil-reparation-2026/

**Bonnes pratiques qui en découlent** [SUPPOSITION, sauf mention] :

1. **Message 1 = permission, texte seul.** Qui je suis, pourquoi cette marque (une pub précise vue dans la bibliothèque), ce que je propose (« j'ai fait un essai de vidéo pour [produit], je vous l'envoie ? »), et une phrase pour dire non (« si ce n'est pas le sujet, dites-le-moi et je ne vous écris plus »). C'est la « stratégie Loom » de la veille §2, conforme au premier message « texte seul ».
2. **Message 2, seulement après un oui** : la vidéo, ou un **lien privé** vers une page d'aperçu sans indexation, avec le filigrane « Échantillon ».
3. **Un compte Instagram distinct de @prestiapp**, qui a publié avant de démarcher, et peu d'envois par jour au début (déjà prévu au plan D).
4. **Registre des refus** : toute marque qui dit non n'est plus jamais recontactée.
5. **Premier contact tapé ou relu par Benj** : l'envoi part de son compte, et relire le champ avant d'envoyer a déjà évité deux messages en charabia [INTERNE].

---

## 4. Le marché en France

### 4.1 Prix constatés

| Produit | Prix | Source |
|---|---|---|
| **Vidéo UGC humaine**, freelance | 80 à 600 € ; **médiane de 150 à 350 €** pour un créateur confirmé ; débutant 75-100 €, expert 200-400 € | [TIERS] résumé citant cindysteenkeste.com, creatorschool.fr, collabscene.com |
| Vidéo UGC humaine, moyenne côté marques | **≈ 320 €** ; médiane créateur ≈ 212 € ; droits pub : **+30 à 50 %** ; licence de 12 mois : +50 à 100 % | [VENDEUR] Takema (agence UGC), 2026, https://www.takema-studio.com/marques/prix-video-ugc-en-france-le-guide-complet-pour-2026 |
| Pack de 10 vidéos humaines | **≈ 200 € la vidéo** (320 € à l'unité, 250 € par 5) ; remise de 15 à 25 % pour 10 vidéos | [TIERS] résumé citant obeevi.fr et formation-ugc.com |
| **UGC IA** | 8 à 12 € en libre-service ; **80 à 120 €** « avec assistance » | [VENDEUR] résumé citant obeevi.fr (agence vidéo), mai 2026 |
| **Pack d'Hugo** | **1 300 € les 10** = 130 € la vidéo, « 3 accroches par vidéo » | [INTERNE] veille §1, chiffre du créateur non vérifié |
| Pack D prévu par Presti | 490 € [supposé au plan] = 49 € la vidéo | [INTERNE] plan |
| **Gestion de pubs Meta pour une TPE** | entrée de gamme **300 à 500 € HT/mois** ; la plupart des TPE-PME entre 300 et 1 500 € HT/mois ; ou **10 à 20 % du budget pub** ; freelance « à partir de 500 €/mois » | [TIERS] résumés citant lafabriquedunet.fr (page en 403) et affairespower.fr |
| **Budget pub d'une TPE** | 200 à 800 €/mois sur Facebook ; clic entre 0,30 et 0,70 € | [VENDEUR] Effinity (agence), 09/12/2025, https://www.effinity.fr/blog/cout-publicite-facebook-2026-tarifs-budgets-strategies-optimisation/ |

**Lecture** [SUPPOSITION] : 130 € la vidéo IA se défend face à 200-320 € en humain **si** la marque accepte l'IA étiquetée. 49 € (pack D) laisse une marge énorme sur un coût de 6 à 9 $, et passe sous le prix « avec assistance » constaté (80-120 €). On pourrait tester **deux prix** plutôt qu'un.

### 4.2 Qui achète

- Les annonceurs **e-commerce en volume** et les PME qui produisent 10 à 15 vidéos par mois. [VENDEUR] obeevi.fr
- Les marques **qui paient déjà de la pub** : c'est tout l'intérêt de la bibliothèque Meta (veille §1). Les catégories où le produit **tient dans la main** (cosmétique, compléments, accessoires, petite maison) collent aux limites des outils (HeyGen « optimisé pour les petits objets ») [SUPPOSITION].
- **Qui se méfie :** les produits « traditionnels » et à forte implication. L'étiquette « IA » y fait baisser confiance et intention d'achat. Étude NIM (Nuremberg), 3 × 1 000 personnes aux États-Unis, au Royaume-Uni et en Allemagne : [TIERS] https://www.nim.org/en/publications/detail/transparency-without-trust
- **Face à l'humain :** Ipsos, mai 2026, 3 000 consommateurs américains, 20 pubs de marque. Les pubs humaines font **+14 % d'efficacité créative à court terme** et **+17 % sur l'image de marque à long terme** ; seulement 25 % des gens reconnaissent une pub IA ; **79 % attendent qu'on le dise**. [VENDEUR] Billo (vend de l'UGC humain), qui cite https://www.ipsos.com/sites/default/files/ct/publication/documents/2026-05/Ipsos_SU_POV-AI_Ads_Just_Good_Enough.pdf. À l'inverse, Lapis annonce **+12 à 23 % de taux de clic** pour les pubs IA sur Meta. [VENDEUR] résumé citant trylapis.com, vendeur d'IA. **Les deux camps vendent quelque chose.**

### 4.3 Taux de réponse : annoncés et mesurés

| Type | Chiffre | Source |
|---|---|---|
| **Annoncé** | DM Instagram à froid : **15 à 30 %**, « 31 % », « 32 % personnalisé » | [VENDEUR] postengage.ai, phantomleads.ai, influenceflow.io (outils de DM) |
| **Annoncé** | stratégie « je vous envoie une vidéo ? » : 20 à 30 % de conversion | [INTERNE] veille §2, chiffre du créateur |
| Mesuré par un tiers | une agence : 6 % de réponses le premier mois ; une autre : **moins de 1 % d'ouverture et 0 vente après 300 à 400 DM** | [TIERS] résumé de recherche ; knowledgehubmedia.com (anecdote d'un forum, non vérifiable) |
| Mesuré par un tiers | e-mail à froid : **≈ 3 % en moyenne**, 5 à 8 % = bon | [TIERS] résumé citant linkedgrow.ai et martal.ca |
| **Mesuré chez nous** | **Instagram : 0 réponse sur 12** (artisans) | [INTERNE] mémoire `facebook-demarchage-artisans` |
| **Mesuré chez nous** | **Facebook, profil perso : 1 réponse sur 9**, 2 lus sans suite, **6 jamais ouverts** (restés dans les Invitations) | [INTERNE] même note, envois du 10/09 |
| **Mesuré chez nous** | **LinkedIn InMail : 1 réponse sur 10**, un InMail marqué « rejeté » | [INTERNE] mémoire `presti-qui-tient-quel-reseau` |

**Conclusion** [SUPPOSITION] : prévoir **1 à 5 % de réponses** et moins de 1 % de ventes par message à froid. Les 15-30 % annoncés viennent de vendeurs d'outils. Notre mesure porte sur des artisans, pas sur des marques e-commerce : il faut **la refaire sur les marques** (20 messages de permission, puis compter).

---

## 5. Pour les artisans du bâtiment

### 5.1 Ce qui marche

| Format | Constat | Source |
|---|---|---|
| **Avant/après** | « le format qui marche le mieux » pour les services à domicile | [TIERS] leadsync.me, handoff.ai, builtrightdigital.com (États-Unis) ; [VENDEUR] Bouda Digital (agence FR), 29/05/2026 |
| **Vidéo courte de chantier réel**, 15-30 s | « les propriétaires font plus confiance aux vraies images qu'aux visuels léchés » | [TIERS] handoff.ai ; [TIERS] batichiffrage.fr, 15/09/2026 |
| **Le patron face caméra** | coût par contact **25 à 40 % plus bas** que la vidéo d'agence ; vidéo en général : -30 à -60 % | [VENDEUR] Elev8 Operations, 25/07/2026 : ses propres données (200 comptes), « non auditées » |
| **Vrai client qui témoigne** dans sa pièce rénovée | cité parmi les formats les plus performants | [TIERS] résumé citant fluxcoregroup.com et bouda.digital |
| Pub statique « devis gratuit » | le coût par contact le plus élevé | [VENDEUR] Elev8 |
| **Photos réelles plutôt que banque d'images** | « une photo de votre camion devant un chantier de la commune vaut bien plus » | [TIERS] résumé citant nerepix.fr et d'autres |

**Chiffres France** [VENDEUR] Bouda Digital, https://bouda.digital/blog/publicite-facebook-instagram-artisan-ca-marche.html : clic à 0,50-2 €, **contact à 10-30 €**, 300 à 500 €/mois pour un test. Dans leur cas d'un peintre, 400 € ont donné 8 demandes qualifiées et 2 chantiers pour 4 800 €. C'est un seul cas, publié par une agence. Autre source : **15 à 40 contacts pour 400 €/mois**. [TIERS] résumé de recherche, ordre de grandeur.

### 5.2 Les règles qui touchent les artisans

- **Catégorie spéciale « Logement » de Meta.** La définition reprise par plusieurs tiers inclut « **housing repairs** » (réparations de logement), à côté des annonces de vente, des prêts et de l'assurance habitation. [TIERS] jonloomer.com, data-axle.com (pages en 403, extraits cités par le moteur de recherche) La doc développeur de Meta indique que la déclaration est **obligatoire pour l'Europe depuis le 7 décembre 2021** (depuis le 4/12/2019 aux États-Unis, le 3/12/2020 au Canada). [OFFICIEL] https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/special-ad-category
  - **Conséquence probable** [SUPPOSITION, c'est la question 562 du plan] : une pub de couvreur ou de rénovation en France doit être déclarée « Logement ». Ciblage **par âge et par genre interdit, pas de code postal, pas d'audience similaire**, et un rayon minimal autour d'une ville (15 miles aux États-Unis ; le chiffre européen n'est pas trouvé). Des tiers écrivent aussi qu'en 2026 Meta **applique la catégorie d'office** s'il reconnaît des images immobilières. [TIERS] résumé citant walledgardenhq.com
  - **La fiche « lancer la pub en 10 min » du pack C doit donc dire de cocher « Logement »** et viser un rayon autour de la ville, pas une tranche d'âge. À confirmer dans le Gestionnaire de publicités sur un compte réel.
- **Avant/après :** chez Meta, l'interdiction vise la **santé personnelle** (minceur, anti-âge). La rénovation n'est pas concernée d'après les tiers. [TIERS] roaspig.com et d'autres ; [OFFICIEL] page Meta « santé personnelle », non ouverte. **TikTok** interdit les avant/après qui « donnent une impression fausse ou déformée du résultat » ; ils restent permis avec preuve ou mention. [OFFICIEL] TikTok. Un avant/après **du même chantier, photographié par l'artisan**, est la preuve même [SUPPOSITION].
- **Rénovation énergétique :** la DGCCRF y mène des enquêtes répétées sur les pratiques trompeuses (fausses qualités RGE, fausse affiliation à un organisme public, aides annoncées à tort). Pages [OFFICIEL] economie.gouv.fr trouvées, **mais en 403 à la lecture** : https://www.economie.gouv.fr/dgccrf/pratiques-commerciales-trompeuses-dans-secteur-renovation-energetique **Règle** : aucune mention « RGE », « MaPrimeRénov' » ou montant d'aide sans justificatif fourni par l'artisan.
- **Faux avis** : L121-4 27° et 28° s'appliquent aussi aux artisans (§3.3). Un avis Google repris dans une pub doit être **réel**, cité mot pour mot, avec l'accord de son auteur si son nom ou sa photo apparaît [SUPPOSITION].

### 5.3 Produire à partir de leurs photos, sans rien inventer

Principe : **l'IA met en forme, elle ne fabrique pas de réel.** Générer une vidéo « de leur chantier » à partir d'une photo produit une image qui ressemble à un **lieu et un objet existants** : c'est la définition du *deep fake* (AI Act, art. 3 point 60). Il faudrait alors une mention. Surtout, cela montrerait des gestes et des finitions que personne n'a vus, donc une pratique trompeuse possible [SUPPOSITION]. D'où ces règles, qui prolongent le pack C du plan (« aucune personne générée ») :

| Brique | Autorisé | Interdit |
|---|---|---|
| **Images** | leurs photos, recadrées ; mouvements de caméra lents dans HyperFrames (zoom, travelling) ; **curseur avant/après** entre deux vraies photos du même chantier ; balance des blancs et exposition | générer ou compléter une partie de la photo ; « nettoyer » un défaut réel ; animer la photo en vidéo générative ; mélanger les chantiers de plusieurs artisans |
| **Texte à l'écran** | faits **donnés par l'artisan** : ville, métier, durée des travaux, matériaux, garantie décennale (justificatif à l'appui) ; appel à l'action | chiffres inventés (« 500 chantiers », « -30 % sur la facture ») ; RGE ou aides sans preuve |
| **Voix** | **la voix de l'artisan**, enregistrée au téléphone (le format « patron face caméra » est celui qui marche) ; ou une voix de synthèse **annoncée** « Voix générée par IA » et qui ne parle pas au nom d'un client | voix clonée de l'artisan sans son accord écrit ; voix de synthèse qui joue un client |
| **Personnes** | l'artisan et son équipe, sur leurs photos, avec leur accord | toute personne générée : c'est déjà la règle du pack C |
| **Témoignage** | un avis réel (Google, e-mail), cité en entier ou coupé sans en changer le sens, avec l'accord du client | avis reformulé, inventé ou « amélioré » |
| **Contrôle** | manifeste des entrées (**seulement** les fichiers du client, avec leur empreinte), détection de visages, juge `video-qa`, copie datée de chaque fait cité | |

**Trame de 15 s en 9:16** [SUPPOSITION, à valider sur les 5 premiers packs] :

- 0-2 s : la photo « avant » plein cadre, avec l'accroche (« Toiture à Lestraque : avant ») ;
- 2-8 s : curseur jusqu'à la photo « après », puis 2 ou 3 photos de détail en mouvement lent ;
- 8-13 s : l'artisan face caméra (vidéo à lui) ou ses photos, avec 1 ou 2 faits qu'il a donnés ;
- 13-15 s : logo, ville, « Devis sous 48 h », appel à l'action.

Sous-titres posés par HyperFrames, son normalisé **avant** le carton final (mémoire `loudnorm-apres-un-carton-muet`).

---

## 6. Ce que ça change pour l'automatisation (proposition)

| Étape | Outil | Garde-fou tiré de cette recherche |
|---|---|---|
| 1. Vigie des annonceurs | API `ads_archive` (jeton de 60 j, ~150 appels/h pour garder de la marge sous les 200) | l'API seulement ; une requête par mot-clé et par pays ; filtre « ≥ 3 pubs actives dont une de plus de 30 j » |
| 2. Fiche marque | scrapegraphai sur la page produit | copie datée de la page ; **seules** les allégations du site sont réutilisables |
| 3. Création | ElevenLabs Creative : Nano Banana Pro → Veo 3.1, Kling 3 ou Gemini Omni → voix | plan payant ; démonstration, **pas de témoignage** ; présentateur annoncé virtuel ; clauses négatives |
| 4. Montage | HyperFrames en local | carton « Vidéo générée par IA » dès 0 s ; filigrane « Échantillon, non diffusé » ; sous-titres maison |
| 5. Contrôle | juge `pub-qa` : 10 points produit, étiquette lisible, mains, nombre d'unités, transcription de la voix | refus de tout fichier vide (mémoire `preuve-vide-est-un-mensonge`) |
| 6. Premier contact | **texte seul, message de permission**, depuis un compte distinct, relu par Benj | identité + phrase de refus ; registre des refus |
| 7. Envoi de l'échantillon | après un oui : vidéo ou lien privé | aucune publication d'échantillon |
| 8. Vente | devis et facture, cession de droits dans les deux sens | accord écrit avant toute diffusion (déjà au plan) |

**Ce qui reste bloqué avant le premier échantillon :**

1. La **consultation juridique** du plan, à qui soumettre les §3.3 à 3.5.
2. Le **PDF de l'ARPP**, derrière un formulaire, à récupérer par Benj.
3. **Tester la règle « texte seul »** sur un envoi réel.
4. Vérifier si les modèles vidéo d'ElevenLabs sont en **bêta**, donc hors licence commerciale.
5. Confirmer la catégorie **« Logement »** dans le Gestionnaire de publicités pour une pub d'artisan en France.
6. Faire le **premier vrai appel** `ads_archive` (FR, `ad_type=ALL`) pour trancher la contradiction du §1.2 et voir si `ad_creative_link_captions` donne bien le domaine.

---

## Annexe : sources lues le 24/09/2026

**Officielles**

- Meta, `ads_archive` v26.0 : https://developers.facebook.com/docs/marketing-api/reference/ads_archive/
- Meta, `ArchivedAd` v26.0 : https://developers.facebook.com/docs/graph-api/reference/archived-ad/
- Meta, limites de la Graph API : https://developers.facebook.com/docs/graph-api/overview/rate-limiting/
- Meta, API de messagerie Instagram : https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/
- Meta, politique Messenger et messagerie Instagram : https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy
- Meta, catégories spéciales : https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/special-ad-category
- Meta, étiquetage IA des pubs : https://www.meta.com/help/artificial-intelligence/355108217670024/
- Instagram, conditions (extrait via le moteur de recherche) : https://help.instagram.com/581066165581870/
- Google, tarifs de l'API Gemini : https://ai.google.dev/gemini-api/docs/pricing
- Google, Veo : https://ai.google.dev/gemini-api/docs/veo et https://ai.google.dev/gemini-api/docs/video
- ElevenLabs, Image & Video : https://elevenlabs.io/docs/overview/capabilities/image-video
- ElevenLabs, conditions d'utilisation (31/03/2026) : https://elevenlabs.io/terms-of-use
- ElevenLabs, politique d'usage (17/08/2026) : https://elevenlabs.io/use-policy
- ElevenLabs, bonnes pratiques de synthèse vocale : https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- HeyGen, placement de produit : https://help.heygen.com/en/articles/12704854-product-placement-combine-a-product-with-an-avatar-in-a-video
- TikTok, contenus trompeurs (avril 2026) : https://ads.tiktok.com/help/article/tiktok-ads-policy-misleading-and-false-content
- Légifrance, L121-4 C. conso : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044224578/
- Légifrance, L34-5 CPCE : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961/
- Légifrance, L122-4 CPI (texte via le moteur de recherche) : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278911
- Légifrance, loi 2023-451, art. 5 : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000050468897/2026-03-24
- CNIL, prospection (page datée du 10/06/2026) : https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel
- ARPP, fiche IA (03/08/2026) : https://www.arpp.org/actualite/arpp-fiche-pratique-etiquetage-contenus-publicitaires-intelligence-artificielle/
- AI Act, art. 50 et art. 3 (texte reproduit) : https://artificialintelligenceact.eu/article/50/ et https://artificialintelligenceact.eu/article/3/
- Directive 2002/58, art. 2 h) (via le moteur de recherche) : https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=celex:32002L0058

**Tiers et vendeurs** (date de publication entre parenthèses)

- adlibrary.com, limites de l'API (12/06/2026), dépôts DSA (13/06/2026), guide UGC IA (26/04/2026)
- admapix.com (06/04/2026) · adsuploader.com (29/07/2026) · swipekit.app (17/09/2026) · adtransparency.mozilla.org (méthode de 2019)
- ugcvids.ai [VENDEUR] (02/07 et 09/08/2026) · segwise.ai (12/06/2026) · linocut.ai (15/07/2026) · HackerNoon (14/08/2026) · dismapoule.com (29/07/2025)
- Greenberg Traurig (08/06/2026) · Hiro Avocats (ARPP) · Kohen Avocats (21/09/2026) · Village de la Justice (01/08/2014)
- TechCrunch (03/08/2023)
- Takema [VENDEUR] (2026) · obeevi.fr [VENDEUR] (05/2026) · Effinity [VENDEUR] (09/12/2025) · Bouda Digital [VENDEUR] (29/05/2026) · batichiffrage.fr (15/09/2026) · Elev8 Operations [VENDEUR] (25/07/2026)
- NIM (2024-2025) · Billo [VENDEUR], qui cite Ipsos (05/2026) · knowledgehubmedia.com

**Pages trouvées mais pas lisibles (403, contenu en JavaScript ou formulaire)** : lafabriquedunet.fr (tarifs des agences), jonloomer.com et data-axle.com (catégories spéciales), pages d'aide Meta Business sur le logement, aide ElevenLabs, DGCCRF rénovation énergétique, PDF de l'ARPP. Quand elles sont citées, c'est par l'extrait du moteur de recherche, et c'est signalé.
