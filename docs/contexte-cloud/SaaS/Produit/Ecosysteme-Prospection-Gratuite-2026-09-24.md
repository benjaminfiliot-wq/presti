# Prospection gratuite : la chaîne retenue (24/09)

**Décision de Benj, 24/09 : gratuit, pas d'achat ; vérification Meta faite par Benj ; pas de juriste.**

Liens : [[Ecosysteme-Rectification-2026-09-24]] · [[Ecosysteme-Plan-2026-09-24]] · [[Journal-Decisions]]

*Écrit le 24/09/2026 au soir par Claude Code. Il répond à ton refus de l'outillage e-mail payant (90 à 150 $/mois) : trouver une alternative gratuite et puissante, sans négociation. Tu te charges de la vérification Meta, et il n'y aura pas de lecture juridique.*

**Statut.**
- Ce document **remplace le §3.5 et les décisions R1 à R3 du §5** de la rectification. Comme d'autres passages en dépendaient, il les corrige aussi (tableau ci-dessous). Le reste de la rectification tient.
- Il repose sur trois recherches du 24/09 (fournisseurs d'e-mail gratuits, canaux gratuits, séquenceur maison) et sur une contre-expertise. Elle a fait tomber 17 points de ma première version, dont l'option Outlook, le repli `message.reply()`, les preuves stockées dans Supabase, le pixel de Brevo et le bilan du 28/10. Ce qui suit est la version corrigée.
- Rien n'a été acheté, créé, envoyé ni modifié ailleurs. Les fiches 026 sont intactes : le §6 dit quoi y changer.
- Ce n'est pas un avis juridique. Sans juriste, chaque lecture de texte que rien ne confirme est marquée [interprétation], et un garde-fou plus strict que le minimum la couvre (§3).

**Étiquettes** : celles du plan ([prouvé], [mesuré], [déduit], [supposé], [à vérifier]), plus [interprétation].

### Ce que ce document remplace ou corrige dans la rectification

| Passage | Ce qu'il disait | Maintenant |
|---|---|---|
| **§3.5** | 3 domaines, 9 boîtes Mailforge, un séquenceur, 4 semaines de chauffe | §1 : le formulaire du site, puis Cloudflare et Brevo. Pas de chauffe |
| **§5 R1, R2, R3** | lemlist ou Instantly, Mailforge, 3 domaines : 90 à 150 $/mois | **Annulées** (§4) |
| §3.4 a | L'e-mail à froid, colonne vertébrale | Le formulaire de contact du site de l'artisan (§1) |
| §3.4 a, amende du L34-5 | Jusqu'à 75 000 € | Toujours vrai jusqu'au 31/10/2027. La QPC du 25/06/2026 censure les alinéas sur le contrôle et les amendes, mais les règles de fond tiennent [^cpce] |
| §3.4, canaux écartés : « formulaires de contact des sites » | Écartés : captchas, soumission automatisée | **Repris, seulement sans aucune protection.** Au moindre captcha, pot de miel ou clause contre les robots : abandon définitif (§3, règles 5 à 7) |
| §3.3, Facteur et Standard | Le Facteur pousse dans le séquenceur ; le Standard lit les boîtes | Le Facteur pilote des porteurs sur l'usine ; le Standard lit `bonjour@` par Cloudflare (§1) |
| §3.6 | Paliers par boîte dès le 23/10, jusqu'à 90 par jour | Paliers du formulaire dès le 12/10, 40 par jour au plus (§2) |
| §3.7, e-mail 1 | 90 mots, lien de désinscription | Le modèle de formulaire, sans aucun lien (§1.1) |
| §3.8, relances par e-mail | R1 à J+3, R2 à J+7 | Aucune relance à froid. Une seule relance, après un « oui », annoncée d'avance (§3, règles 8 et 9) |
| §3.10 | Clic de désinscription du séquenceur, en-tête List-Unsubscribe | « Écrivez STOP à bonjour@… ». Le traitement du STOP ne change pas |
| §3.11, disjoncteurs | Par boîte et par domaine | Par canal et par technologie de formulaire (§3.2) |
| §3.13 et R10 | Jalon le jeudi 05/11 | Bilan le lundi 02/11 (§2) |
| §3.14, « choisir et payer » | Des achats | Aucun achat ; tes gestes au §5 |
| §5 R4 | Oui aux adresses nominatives | **Non** : aucune adresse d'artisan relevée avant qu'il écrive |
| §5 R17 | En suspens | Bloquant avant le premier « oui » ; voie gratuite à construire (§1.3) |
| §5 R20 | Lecture juridique avant le 23/10 | **Annulée** ; les garde-fous du §3 la remplacent |
| §5 R22 | E-mail à froid, avec R1 à R3 | **Annulée** |
| La note « anthropic » de la rectification | « révéler l'IA pour tout agent tourné vers l'extérieur » | **Erratum** : la politique l'exige des chatbots grand public. Ce qui s'applique ici, c'est l'interdiction de se faire passer pour un humain [^anthropic] |

---

## 0. En bref

- **Aucun service d'e-mail gratuit n'accepte par écrit la prospection à froid.** Neuf l'interdisent en toutes lettres, deux sont en zone grise. Seuls des outils payants l'acceptent (Mailforge, Instantly, lemlist).
- **Le premier message sort donc par le formulaire de contact du site de l'artisan** : un par entreprise, à vie, sans jamais relever son adresse.
- **Tout ce qui suit sa réponse passe par des outils gratuits qui l'autorisent**, puisque c'est lui qui a écrit : Cloudflare pour recevoir, Brevo pour répondre.
- **Le socle de la rectification tient** : le Facteur, les trois juges, 0097, le Standard, le Répondeur et l'usine. Deux choses changent : le moyen d'envoi, et les webhooks, qui quittent Vercel.
- **Le prix à payer** : un plafond plus bas (40 par jour contre 90) et un stock à mesurer. En échange, pas de chauffe : premier envoi le 12/10 au lieu du 23/10, bilan le 02/11 au lieu du 05/11.

---

## 1. La chaîne retenue

| # | Étape | Qui, où | Comment | Coût |
|---|---|---|---|---|
| 1 | Trouver | Recenseur (A8) | API de l'ADEME, liste RGE : 37 819 SIRET avec un site, mise à jour chaque nuit, Licence Ouverte [mesuré le 24/09] [^ademe]. Croisée avec SIRENE : NAF du bâtiment, 0 à 9 salariés, statut de diffusion P exclu (c'est une opposition) [^sirene]. URL de plateforme exclues (facebook.com, instagram.com, pagesjaunes.fr, linkedin.com). Le Radar `ads_archive` s'y ajoute après ta vérification Meta | 0 € |
| 2 | Lire le site | Lecteur poli (026-020 étendu), sur l'usine | robots.txt respecté pour la page du formulaire **et** pour l'URL de soumission. 1 requête par seconde. User-Agent `PrestiRecenseur (+https://<domaine>/robot)`. Il relève les faits, le SIREN des mentions légales, le formulaire (champs, champs obligatoires, motifs, longueur maximale) et sa technologie. Il fait l'audit factuel : HTTPS, affichage mobile, année du copyright. **Abandon définitif** pour : un captcha (reCAPTCHA v2 ou v3, hCaptcha, Turnstile, Friendly Captcha), un pot de miel, une case « je ne suis pas un robot », une question anti-spam, un défi JS ou un pare-feu applicatif, une extension anti-spam connue (Akismet, CleanTalk, Antispam Bee, jeton WPForms), une mention « pas de démarchage » ou « sollicitations », une clause des CGU contre l'extraction ou les robots | 0 € |
| 3 | Vérifier | J1, puis le score | Le SIREN des mentions doit être celui de SIRENE, sinon abandon. J1 revérifie chaque fait | 0 € |
| 4 | Maquette | Atelier (A2), sur l'usine | Variante B d'abord (« je peux vous préparer… »). La variante A après le PASS de 025-02, 10 maquettes par jour au plus | 0 € |
| 5 | Écrire et juger | Plume, puis J1, J3 et le second juge | Le modèle de formulaire (§1.1), rempli par un fait lu et une douleur approuvée | Clé « agents » (R16, déjà décidée, hors outillage e-mail) |
| 6 | **Premier contact** | **Facteur**, porteur `formulaire_site`, sur l'usine | Playwright Chromium arm64, même User-Agent honnête. Nom : « Benjamin Filiot – Presti ». E-mail : `bonjour@<domaine>`. Téléphone laissé vide, jamais un faux numéro ; abandon s'il est obligatoire. Aucune case « m'envoyer une copie ». Motif « Autre » ; abandon s'il n'existe que « devis ». Abandon si le texte dépasse la longueur maximale. **Un seul envoi par entreprise, à vie, jamais relancé.** Preuves : captures JPEG avant et après, code HTTP de la soumission, texte, empreinte et horodatage, rangés **sur l'usine**. Supabase ne garde que l'empreinte et le chemin | 0 € |
| 7 | Recevoir | Cloudflare Email Routing, puis un Worker **minimal** | L'artisan écrit à `bonjour@<domaine>`. Le Worker fait `message.forward()` vers une adresse de secours vérifiée, puis envoie le message brut, signé HMAC, à l'Edge Function Supabase `courriel-entrant`. Aucune analyse dans le Worker : en gratuit, un traitement lourd provoque `EXCEEDED_CPU` [^cf-limits]. Le Standard classe : le STOP par du code d'abord, puis les « accusés automatiques du site », puis le reste | 0 € (entrant illimité) |
| 8 | Répondre et suivre | Répondeur, puis Facteur, porteur `brevo` | Brevo Free, 300 envois par jour [^brevo-free], depuis le domaine dédié (DKIM de Brevo). **Seulement en réponse à un message reçu de cette adresse** (son id en base) **ou à la case cochée de 026-126.** Suivi par contact activé, avec « consentement inconnu = pas de suivi » ; suivi des clics coupé. Au plus une relance, après un « oui », annoncée dans le message d'avant. prestiapp.fr seulement après le « oui », et une fois R17 tranché. L'offre gratuite ajoute « Sent with Brevo » en pied de chaque envoi | 0 € |
| 9 | Entrants Meta | Crieur, Standard, Répondeur | « Commente SITE », une réponse privée par commentaire, la fenêtre de 24 h, les amorces de conversation (rectification §3.4 b et c) | 0 € |
| 10 | Entrants par formulaire | 026-126 | La case non pré-cochée sert de preuve de demande pour Brevo | 0 € |

### 1.1 Le modèle de formulaire

Champ « Sujet », s'il existe : « Proposition commerciale : un site pour <entreprise> ».

> Message commercial de Presti, rédigé et envoyé par l'assistant IA de Presti. Ce n'est pas une demande de devis.
> Bonjour, <fait lu sur votre site, avec sa page : pas de HTTPS, illisible sur téléphone, « © 2016 »…>. <question tirée de la bibliothèque des douleurs>.
> Je peux vous préparer gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à bonjour@<domaine>.
> Benjamin Filiot, Presti.
> Votre site figure dans la liste publique des entreprises RGE de l'ADEME. Vos données : <domaine>/confidentialite
> Pour ne plus rien recevoir : écrivez STOP à bonjour@<domaine>.

- Aucun lien cliquable, aucun prix, jamais prestiapp.fr.
- **L'adresse est écrite en toutes lettres.** Si le formulaire ne pose pas de « Reply-To », « Répondre » partirait vers l'adresse du site lui-même.
- **Le fait parle de refonte.** La cible a déjà un site : « votre site n'a pas de formulaire », l'exemple de la rectification, devient impossible.
- J3 le vérifie mot pour mot. Tu l'approuves une fois.
- Variante A, quand la maquette existe déjà : même modèle, avec « J'ai préparé… », après le PASS de 025-02.

### 1.2 Le séquenceur maison

- **L'état et les règles vivent dans Supabase** : `ops.envois`, réservation par `FOR UPDATE SKIP LOCKED`, plafonds et oppositions tenus par 0097.
- **L'exécution tourne sur l'usine**, par une minuterie systemd. Elle lit la pause générale avant chaque envoi.
- **Les relances ne concernent que les conversations sollicitées.**
- **Chaque nuit**, la liste d'opposition et les preuves sont exportées vers l'usine : Supabase gratuit n'a pas de sauvegarde automatique [^supabase].
- Il n'y a plus de file externe à mettre en pause, ni d'API de séquenceur à surveiller.

### 1.3 Ce qui n'est pas tout à fait gratuit

- **L'e-mail à froid depuis nos propres domaines.** Il est payant partout où il est accepté par écrit. Le formulaire le remplace : moins puissant en plafond, mais sans chauffe.
- **Le domaine dédié.**
  - Gratuit un an avec le GitHub Student Pack : un .me chez Namecheap, par nc.me [^gh-pack] [^nc]. Tu es éligible en tant que lycéen, sur justificatif [^gh-elig].
  - Ensuite, environ 15 $ par an à partir de 10/2027 (FAQ de nc.me) [^nc].
  - **Repli au 05/10** si le pack n'est pas accordé : une boîte Gmail dédiée, que tu crées, sert d'adresse de réponse, et la notice va sur `<projet>.pages.dev` (Cloudflare Pages, gratuit).
- **R17, Vercel.**
  - L'offre Hobby est réservée à un usage « non-commercial personal use », avec l'exemple de tout moyen de demander un paiement [^vercel].
  - Déplacer les agents de prospection ne règle rien : après le « oui », la chaîne mène à prestiapp.fr (maquette, paiement Stripe).
  - Ce qui change ici : les webhooks de la chaîne vont vers des Edge Functions Supabase, 500 000 appels gratuits par mois [^supabase].
  - R17 devient **bloquant avant le premier « oui »**. Sous ta décision, la voie est la migration gratuite : le site servi par l'usine derrière Cloudflare Tunnel (fiche `026-nouv-gratuit-11`) [à vérifier]. Vercel Pro, à 20 $/mois, serait un achat : exclu tant que tu ne changes pas d'avis.
- **Le stockage.** Supabase gratuit donne 1 Go [^supabase]. À 40 formulaires par jour, avec deux captures de 0,5 à 2 Mo, il serait plein en quelques semaines [déduit]. Les preuves vont donc sur l'usine : volume de bloc, ou Object Storage, 20 Go Always Free [^oracle-free].
- **L'usine elle-même.**
  - Le compte Oracle date du 24/09. L'essai de 30 jours finit vers le 24/10, en plein P1-P2 : toute ressource hors Always Free sera supprimée [^oracle-faq].
  - Ensuite, Oracle reprend une instance dont le p95 du CPU, du réseau et de la mémoire reste sous 20 % sur 7 jours [^oracle-faq]. L'épreuve « PC éteint 24 h » ne prouve pas ce critère.
  - D'où l'inventaire Always Free avant le 24/10 et l'alerte du Veilleur sur la mémoire (§3.2).
- **R16, la clé « agents »** : plafond de 30 $/mois, décidé avant ce choix. Elle ne fait pas partie de l'outillage e-mail.

---

## 2. Volumes et calendrier

Dates supposées, à partir de tes gestes du vendredi 25/09 [supposé].

| Quand | Quoi |
|---|---|
| Ven. 25/09 | Tes gestes du §5 : pack GitHub, Cloudflare, Brevo |
| Du lun. 28 au mer. 30/09 | **Mesure à sec** sur 200 sites RGE, avec les filtres stricts du §1, sans rien envoyer |
| Du lun. 28/09 au ven. 09/10 | Construction en parallèle par Codex et Antigravity. En même temps : l'épreuve « PC éteint 24 h » (rectification §3.12), et le p95 de la mémoire de l'usine au-dessus de 20 % sur 7 jours |
| Lun. 05/10 | Pack GitHub accordé, sinon repli Gmail et pages.dev |
| **Lun. 12/10, au plus tôt** | **Premier formulaire** (P0) |
| Avant le sam. 24/10 | Inventaire Always Free (fin de l'essai Oracle) |
| Mar. 27/10 | 100e contact froid |
| **Lun. 02/11** | **Bilan sur 100 contacts** |

**La mesure à sec rend trois chiffres** : la part de formulaires éligibles, leur répartition par technologie, et la part où le téléphone est obligatoire. **Seuil de GO : au moins 5 % d'éligibles.**

**Conditions du premier envoi**, toutes à la fois :
1. la mesure à sec au vert ;
2. les juges en PASS ;
3. l'épreuve PC éteint réussie ;
4. les modèles approuvés par toi ;
5. le domaine, le routage, la notice et les mentions légales en ligne (sans eux, les réponses se perdent) ;
6. R17 tranché avant qu'un « oui » puisse payer.

**Les paliers**, en formulaires par jour ouvré :

| Palier | Dates | Par jour | Pour passer au suivant |
|---|---|---|---|
| P0 | du 12 au 16/10 | 5 | 5 jours au vert |
| P1 | du 19 au 23/10 | 10 | 5 jours au vert |
| P2 | dès le 26/10 | 20 | Le bilan du 02/11 ; P2 lui-même ne demande que la sécurité |
| P3 | après le bilan | 30 | 5 jours au vert |
| P4 | vers le 09/11 | **40, plafond** | Au-delà, ta décision |

Au rythme des paliers : 25 contacts en P0, 75 à la fin de P1, le 100e le 27/10 [déduit].

**« Au vert »**, en compteurs absolus :
- 0 plainte et 0 avis d'abus ;
- au plus 3 STOP sur 100 ;
- pas 3 échecs de soumission d'affilée (un échec répété peut cacher une protection, donc pause) ;
- aucun rejet de notre domaine dans les rapports DMARC ;
- au moins une réponse positive à partir de P3.

**Le bilan du 02/11.** Les seuils du plan (§1.2) ne changent pas, et seuls les contacts froids comptent :
- au moins 1 vente ou 4 « oui » : P3 ;
- de 1 à 3 « oui » : nouveau message, et P2 prolongé ;
- 0 « oui » : arrêt du froid, puis changement de segment ou d'offre.

**Autres plafonds** : Brevo, 250 envois par jour, sollicités seulement ; Atelier, 10 maquettes par jour.

**Le stock.**
- 37 819 SIRET avec un site dans la liste RGE [mesuré]. C'est avant les filtres SIRENE, et compté par établissement : il y a moins d'entreprises.
- À 5 % d'éligibles : au plus environ 1 890 cibles, soit environ 95 jours ouvrés à 20 par jour, ou 47 à 40 par jour [déduit]. **Au seuil bas, le stock tient de 2 à 4 mois, pas plus.**
- La mesure à sec donne le vrai chiffre. Si le stock est court, les annonceurs Meta qui ont un site (Radar) passent par le même formulaire.

**Ce qu'on peut attendre** [supposé, jamais mesuré pour des formulaires] :
- 1 à 3 % de réponses, peut-être moins à cause des pertes silencieuses : filtre anti-spam du site, `mail()` non authentifié, notification rangée dans les indésirables. On mesure par technologie ;
- soit 0,2 à 0,6 réponse par jour en P2, et 0,4 à 1,2 en P4. Le plan payant visait 1 à 4,5 en P4 ;
- sur 100 contacts, 1 à 3 réponses. Obtenir 4 « oui » demanderait que presque chaque réponse soit un oui : **l'issue la plus probable du bilan est « 1 à 3 oui », ou 0** [déduit] ;
- les artisans RGE sont très démarchés : la réponse peut être plus faible [supposé].

---

## 3. Les garde-fous automatiques (ils remplacent le juriste)

Chacun est tenu par du code, par J3 ou par la base (0097). Aucun agent ne peut le lever ; seul toi changes un plafond.

### 3.1 Les règles

| # | Règle | Tenue par | Textes |
|---|---|---|---|
| 1 | La première phrase annonce un message **commercial**, rédigé par une **IA**, qui **n'est pas une demande de devis**. Si le formulaire n'offre que le motif « devis » : abandon | J3, mot pour mot ; porteur | CPCE L34-5 (identité non dissimulée) [^cpce] ; C. conso L121-2 et L121-5 (pratique trompeuse, étendue aux professionnels) [^conso] ; LCEN, publicité identifiable [article non relu] ; AI Act art. 50 [^aiact] ; Anthropic : ne pas se faire passer pour un humain [^anthropic] |
| 2 | L'objet est lié au métier (un site pour un artisan). Jamais de faux « Re: » ni de « Votre demande » | J3 | L34-5 ; CNIL, prospection B2B [^cnil-b2b] |
| 3 | La source, la notice (en texte) et le moyen de refuser figurent dans le premier message, le refus dans une phrase à part : « écrivez STOP à bonjour@… » | J3 | RGPD art. 14(2)(f), 14(3)(b) et 21(4) [^rgpd] ; L34-5 |
| 4 | Le STOP est repéré par du code, avant tout modèle. En moins de 10 min, toutes les clés passent en opposition (SIREN, domaine, adresse, compte Instagram, Page), sur tous les canaux, et la base refuse tout envoi vers elles | Standard (code) ; 0097 | RGPD art. 21(2) et 21(3) |
| 5 | Au moindre signe de protection (liste du §1, étape 2) : abandon, sans nouvel essai. Jamais de contournement | Lecteur ; porteur | Anthropic : ne pas « circumvent the guardrails or terms of other platforms » [^anthropic] ; C. pén. 323-1, accès ou maintien frauduleux [interprétation] |
| 6 | Au moindre refus affiché (« pas de démarchage », « sollicitations »), à la moindre clause des CGU contre l'extraction ou les robots, ou sur une URL de plateforme : abandon | Lecteur | CNIL, 30/04/2020 : extraction « non autorisée » quand les CGU l'interdisent [^cnil-public] ; RGPD art. 21 |
| 7 | robots.txt pour la page **et** pour l'URL de soumission ; 1 requête par seconde ; un User-Agent honnête qui renvoie vers `/robot` | Lecteur ; porteur | RFC 9309 [^rfc9309] : une règle de bonne conduite, pas une loi |
| 8 | Un formulaire par entreprise, à vie. Au plus 3 messages par prospect, tous canaux confondus, avec 72 h d'écart. « Pas maintenant » bloque tout pendant 90 jours | 0097 | Règles maison |
| 9 | Brevo n'écrit qu'avec une **preuve de demande** : un message reçu de cette adresse, ou la case de 026-126. Au plus une relance, après un « oui », annoncée d'avance. Jamais une adresse tirée d'une liste | 0097 (`PreuveDemande` obligatoire) | Brevo, annexe 7 [^brevo-as] |
| 10 | Aucune adresse d'artisan relevée avant qu'il écrive (LS-8 : aucune adresse) | Lecteur ; juge de 026-020 | RGPD art. 5(1)(c), minimisation |
| 11 | Aucun lien prestiapp.fr ni sous-domaine avant un « oui ». Le domaine dédié est contrôlé chaque jour sur la DBL de Spamhaus. DMARC `p=none` avec rapports `rua`, SPF `~all` : certains formulaires envoient la notification avec l'adresse du visiteur comme expéditeur, et un DMARC strict ferait rejeter notre propre message [déduit, à mesurer en P0] | J3 ; Veilleur | Spamhaus DBL : classement au domaine principal, domaines du corps compris [^spamhaus] |
| 12 | Aucun pixel. Chez Brevo : suivi par contact, « consentement inconnu = pas de suivi », clics coupés. Chaque semaine, J3 contrôle une copie réelle reçue sur une adresse témoin | Réglage de Brevo ; J3 | CNIL, recommandation du 14/04/2026 [^pixel] ; Brevo pose un pixel par défaut, transactionnel compris [^brevo-pixel] ; loi Informatique et Libertés, art. 82 |
| 13 | La liste fermée des affirmations ; le second juge traque les promesses implicites | J3 ; second juge | C. conso L121-2 et L121-5 |
| 14 | Toute demande RGPD reçoit un accusé de réception automatique, puis une réponse dans le mois | Standard ; Répondeur | RGPD art. 12(3) |
| 15 | Conservation : 3 ans après le dernier contact émanant du prospect, preuves comprises. Au-delà, la liste d'opposition n'est gardée qu'en empreintes | Purge ; 0097 | RGPD art. 5(1)(e) ; référentiel CNIL [^cnil-ref] |
| 16 | Un registre des traitements et une analyse d'intérêt légitime, rédigés une fois par un agent, approuvés par toi et publiés avec la notice. Ils citent les sous-traitants (Supabase, Cloudflare, Brevo, Oracle, Anthropic) et les transferts hors UE | `026-nouv-gratuit-07` | RGPD art. 6(1)(f) et considérant 47, art. 28, 30 et 44 |
| 17 | Meta : une réponse privée par commentaire, dans les 7 jours ; la fenêtre de 24 h ; jamais le tag HUMAN_AGENT | Facteur, porteur `meta` | Politiques Messenger et Instagram Platform [^meta-pr] [^meta-policy] |
| 18 | Les disjoncteurs du Veilleur (§3.2) | Veilleur ; 0108 | Règles maison |
| 19 | La pause générale (026-044) : l'usine la lit avant chaque envoi | Porteurs ; 0097 | Règles maison |
| 20 | Le domaine dédié porte la notice, les mentions légales (Benjamin Filiot, EI, SIREN 109 411 348, adresse, hébergeur) et la page `/robot` | `026-nouv-gratuit-04` | LCEN, identification de l'éditeur [article non relu] |

**La base légale, la même pour tous.**
- L'intérêt légitime entre professionnels, quand l'objet est lié à la profession (CNIL, 10/06/2026) [^cnil-b2b], pour les sociétés comme pour les entrepreneurs individuels. S'y ajoutent les exigences de forme du L34-5 : l'identité, l'objet, le moyen de refuser.
- Le formulaire ne collecte **aucune adresse**. La condition de la CNIL sur les adresses « acquises auprès de tiers » ne joue donc pas, et la collecte déloyale jugée en 2006 est évitée [^cass].
- On n'écrit pas aux adresses de la liste RGE à cause des conditions des fournisseurs et de la minimisation, pas du L34-5.
- Ni la CNIL ni aucun juge ne s'est prononcé sur la prospection par formulaire : j'applique le régime de l'e-mail [interprétation].

### 3.2 Les disjoncteurs du Veilleur

- 1 avis d'abus (hébergeur d'un site, Oracle, Brevo, Cloudflare) : le canal s'arrête 48 h, avec une carte ;
- 2 plaintes en 7 jours : le canal reste arrêté jusqu'à ta décision ;
- 4 STOP sur 100 envois d'un modèle : le modèle est suspendu ;
- 3 échecs de soumission d'affilée sur une technologie : pause de cette technologie ;
- un rejet de notre domaine dans un rapport DMARC : pause de cette technologie ;
- 0 réponse sur 300 envois d'une technologie : alerte « changer de message » ;
- un avertissement de Brevo : Brevo s'arrête ;
- le domaine dédié sur la DBL : pause de tout ce qui le porte ;
- p95 de la mémoire de l'usine sous 25 % sur 5 jours : alerte, avant le seuil d'Oracle (20 % sur 7 jours) ;
- ceux de la rectification §3.11 qui ne visent pas les boîtes restent en place : erreurs Meta, plafond de coût par exécution, 150 € de coûts dans le mois sans recette.

---

## 4. Écarté

| Option | Pourquoi |
|---|---|
| Mailforge, Instantly ou lemlist, 3 domaines (R1 à R3) | Payant, 90 à 150 $/mois : ta décision. Ce sont pourtant les seuls qui acceptent le froid par écrit |
| Gmail de Presti ou Gmail neuf, pour le froid | Règlement de Gmail : « unsolicited commercial mail » interdit. Le Gmail de Presti est aussi la boîte des entrants |
| Google Workspace | Payant ; sa politique d'usage interdit les sollicitations non désirées [^workspace] |
| Zoho Mail Free | Il faut une « express permission » ; ni IMAP ni POP |
| Proton Free | Ni SMTP ni IMAP ; ses conditions interdisent le spam |
| Brevo pour le froid | Annexe 7 : listes « scraped on the internet » interdites, « whether You send transactional or marketing » ; preuve d'opt-in exigée [^brevo-as]. Il reste permis pour les conversations sollicitées (§1, étape 8) |
| Mailjet, Mailgun | AUP de Sinch ; 500 $ pour réactiver un compte suspendu |
| Resend | Son AUP interdit le « cold outreach », et il porte les e-mails du produit [^resend] |
| Amazon SES | Sortir du bac à sable engage à n'écrire qu'aux personnes qui l'ont demandé ; payant après 6 mois |
| OCI Email Delivery, Postfix ou Postal sur l'usine | Contrat Oracle §1.3 (« unsolicited bulk e-mail ») [^oracle-csa] ; un seul compte gratuit, donc l'usine en jeu ; port 25 fermé par défaut |
| SMTP2GO | Interdit « unsolicited emails of any kind » |
| Cloudflare Email Sending | « Sending to arbitrary recipients requires the Workers Paid plan » [^cf-pricing] |
| OVH Zimbra | Payant ; art. 7 (version du 20/01/2025) : blocage du service, puis résiliation sans remboursement en cas de courriels non sollicités [^zimbra] |
| **Outlook.com piloté par Microsoft Graph** | Le contrat Microsoft réserve le service à un usage « personal, noncommercial » et définit le spam comme « unwanted or unsolicited bulk » email. Il faut en plus un annuaire Entra, donc un compte Azure [carte bancaire probable, à vérifier] [^msa] |
| **`message.reply()` du Worker, comme repli** | Il exige un DMARC valide chez l'expéditeur (beaucoup d'artisans n'en ont pas), une seule réponse, envoyée pendant l'événement, alors que les juges prennent du temps [^cf-reply] |
| Sous-domaine de prestiapp.fr | Spamhaus classe au niveau du domaine principal [^spamhaus] |
| Mautic, listmonk | Mautic crée une seconde source de vérité ; listmonk est à sens unique, sans détection des réponses |
| Écrire aux adresses de la liste RGE | Conditions des fournisseurs et minimisation (§3, règle 10) |
| WhatsApp à froid | Politique WhatsApp Business (23/09/2026) : il faut le numéro **et** l'accord de la personne |
| Instagram à froid | Conditions Meta art. 3.2.3 ; conditions Instagram art. 4.2 [^ig-cgu] ; l'API interdit d'écrire en premier (rectification §3.4, R5) |
| Automatisation LinkedIn | Contrat d'utilisation, art. 8.2 |
| Groupes Facebook | API supprimée le 22/04/2024 ; conditions Meta art. 3.2.3 |
| PagesJaunes | CGU art. 5 : robots et prospection interdits |
| Messagerie Google Business Profile | Supprimée le 31/07/2024 |
| SMS | Payant (0,06 € HT l'unité chez OVH) ; la passerelle Free Mobile est interdite (CGA art. 4.2) |
| Appels par IA | Payants ; l'offre gratuite d'ElevenLabs n'a pas de licence commerciale |
| Nextdoor, Leboncoin | Nextdoor : des particuliers. Leboncoin : robots interdits |
| Nom de domaine en eu.org | Gratuit pour toujours, mais délai de validation inconnu : inutile d'ici le 12/10 |
| Lecture juridique payante (R20) | Tu l'as refusée ; les garde-fous 1 à 20 la remplacent |

Les clauses sans note viennent des trois recherches du 24/09 ; leurs pages n'ont pas été relues pour ce document.

---

## 5. Ce que tu fais toi-même

**Une fois :**
1. **GitHub Education** : demander le pack avec ton justificatif de scolarité, puis réclamer le .me sur nc.me, parmi trois noms que je te proposerai. Environ 15 minutes, plus l'attente. Au 05/10 sans accord : créer une boîte Gmail dédiée, jamais ton Gmail.
2. **Cloudflare**, compte gratuit : ajouter le domaine, poser un jeton limité à cette zone (DNS, Email Routing, Workers), et vérifier d'un clic l'adresse de secours. Les agents font le reste : DNS, SPF `~all`, DMARC `p=none`, Worker, notice, mentions légales.
3. **Brevo**, compte gratuit : répondre honnêtement à son questionnaire (« des personnes qui nous écrivent »), attendre l'approbation, poser la clé d'API.
4. **Meta** : ta vérification, dont tu te charges.
5. **Approuver une fois** : le modèle de formulaire, les réponses Brevo, les réponses privées, les objets, les affirmations, les douleurs, la notice, les mentions légales, le registre et l'analyse d'intérêt légitime.
6. **Coller les migrations.**
7. **Trancher R17** avant le premier « oui ». Sous ta décision : la migration gratuite.
8. **Ouvrir l'interrupteur `envoi_froid`**, d'un appui, après la mesure à sec et l'épreuve PC éteint.
9. **Ne jamais cliquer « Upgrade » chez Oracle** : le compte passerait au paiement à l'usage.

**Ensuite :** prendre les appels réservés et trancher les cartes Attention.

---

## 6. Impact sur la série 026

**Le Facteur et le séquenceur.**
- **Le Facteur reste le seul qui envoie**, avec ses trois verdicts. Au lieu de pousser vers lemlist ou Instantly, il pilote trois porteurs : `formulaire_site` (usine), `brevo` (sollicité seulement) et `meta`. Il n'y a pas de porteur Outlook.
- **Le séquenceur externe disparaît.** L'interface `Sequenceur` devient `Porteur`, un par canal, et la file vit dans `ops.envois`.

**Décisions.**
- R1, R2, R3, R20 et R22 : annulées.
- R4 : non. LS-8 passe à « aucune adresse relevée », plus strict que sa variante « génériques seulement ».
- R10 : bilan le lundi 02/11.
- R17 : bloquant avant le premier « oui ».

Rien n'a été modifié : ce tableau dit quoi changer. Les brouillons sont dans `presti/.orchestre/brouillons-ecosysteme/026/`. Chaque fiche réécrite ou créée repasse par son juge, écrit d'abord par Claude Code.

| Fiche (id ou nom provisoire) | Action | Changement |
|---|---|---|
| 026-010 (0094) | Adapter | Graines de `ops.quotas_canaux` : `formulaire_site` (5, 10, 20, 30, 40 ; 1 par entreprise à vie), `email_sollicite` (250), `reponse_privee`, `messagerie`. Les lignes `boite_NN` disparaissent : `envoyeur` devient le porteur (`formulaire_site`, `brevo`, `repondeur`) |
| 026-015, 026-101 (0106) | Adapter | Compteurs par canal et par palier, et non plus par boîte |
| 026-016 | Réécrire le contrat | `Canal` gagne `formulaire_site` et `email_sollicite`. `Sequenceur` devient `Porteur`. Nouveau type `PreuveDemande` : id du message entrant, ou case de 026-126. `ReponseProspect.source` : `sequenceur` devient `courriel`. `marquerEnvoye` reçoit la preuve de soumission au lieu de `sequenceur_id` |
| 026-020 | Étendre | Détection du formulaire (champs, champs obligatoires, motifs, longueur maximale, technologie), des protections (liste du §1), des refus du démarchage et des clauses contre l'extraction ; robots.txt de l'URL de soumission ; audit factuel (HTTPS, mobile, copyright) ; verdict `eligible` ou abandon. LS-8 : aucune adresse relevée |
| 026-035 (0097) | Réécrire | Plafonds par canal ; 1 envoi à vie par entreprise (SIREN et domaine) sur `formulaire_site` ; `email_sollicite` refusé sans `PreuveDemande` ; au plus 1 relance, après un « oui » |
| 026-039 | Adapter | Notice et mentions légales publiées sur le domaine dédié ; refus par « STOP écrit à bonjour@ » au lieu du lien de désinscription ; page `/robot` du PrestiRecenseur |
| 026-044 | Adapter | Plus de file externe : l'usine lit la pause avant chaque envoi. Ce que la pause coupe : les porteurs, le Répondeur, les réponses privées |
| 026-047 | Adapter | Disjoncteurs du §3.2 : rapports DMARC, avertissements Brevo, DBL, échecs de soumission par technologie, inactivité de l'usine. Les boîtes sont retirées |
| 026-053 (0104) | Adapter | Sources `courriel` et `formulaire_site`. Les preuves restent sur l'usine ; seuls l'empreinte et le chemin vont dans Supabase. `acq_envoi_envoye` reçoit la preuve ; `id_externe` devient le Message-ID du courriel |
| 026-056, 026-063 | Réécrire | Le modèle de formulaire (§1.1) remplace les e-mails A et B ; ajout des réponses Brevo. J3 : première phrase commerciale et IA, « pas une demande de devis », adresse écrite en toutes lettres, STOP « écrivez à », aucun lien, longueur du champ ; preuve de demande pour Brevo. Pièges ajoutés au jeu du second juge. Contrôle hebdomadaire du pixel sur une adresse témoin |
| 026-064 | Adapter | Entrée par l'Edge Function `courriel-entrant`. Nouvelle classe « accusé automatique du site » : ni une réponse, ni une preuve de demande |
| 026-069 | Réécrire | `/api/webhooks/sequenceur` disparaît. À sa place, deux Edge Functions Supabase : `courriel-entrant` (depuis le Worker, signée HMAC) et `brevo-evenements` (rebonds, plaintes, désinscriptions). Les routes cron suivent R17 |
| 026-070, 026-072, 026-087 | Adapter | Ajouter le porteur de formulaire sur l'usine (Playwright arm64) ; les preuves y sont rangées |
| 026-126 | Garder | Sa case non pré-cochée devient la preuve de demande pour Brevo |
| 026-nouv-acquisition-01 | Adapter | Juges du Facteur sur des porteurs factices (formulaires d'essai avec et sans protections, Brevo factice) au lieu du séquenceur factice ; scénarios DMARC et DBL |
| 026-nouv-acquisition-02 (0108) | Réécrire | Paliers par canal (formulaire, de 5 à 40) ; disjoncteurs par canal et par technologie. Plus de boîtes |
| 026-nouv-acquisition-03 (Facteur) | Réécrire | Porteurs `formulaire_site`, `brevo` et `meta` ; `sequenceur.ts` devient `porteurs.ts` ; `scripts/agents/boites.mjs` supprimé ; le Facteur tourne sur l'usine, par minuterie systemd |
| 026-nouv-acquisition-04 (adaptateur du séquenceur) | Remplacer | Par le séquenceur maison, `026-nouv-gratuit-06` |
| 026-nouv-acquisition-05 (jauges) | Adapter | Jauges par canal : formulaires du jour, Brevo (300 par jour). Plus de jauge par boîte |
| `026-nouv-gratuit-01` | Créer, bloquante | **Mesure à sec** sur 200 sites RGE : part éligible, répartition par technologie, part où le téléphone est obligatoire. Dépend de `-02` et de 026-020 étendu. Elle ouvre ou ferme le canal |
| `026-nouv-gratuit-02` | Créer | Import RGE de l'ADEME, croisé avec SIRENE (NAF, 0 à 9 salariés, statut P exclu, URL de plateforme exclues) |
| `026-nouv-gratuit-03` | Créer | Porteur de formulaire : Playwright sur l'usine, règles de l'étape 6, preuves |
| `026-nouv-gratuit-04` | Créer | Domaine et DNS (SPF `~all`, DMARC `p=none` avec rapports, DKIM de Brevo), Email Routing, Worker minimal, Edge Function `courriel-entrant`, notice, mentions légales, page `/robot` |
| `026-nouv-gratuit-05` | Créer | Porteur Brevo : preuve de demande obligatoire, suivi par contact, clics coupés, Edge Function `brevo-evenements` |
| `026-nouv-gratuit-06` | Créer | Séquenceur maison (§1.2), avec l'export nocturne des oppositions et des preuves |
| `026-nouv-gratuit-07` | Créer | Registre des traitements et analyse d'intérêt légitime, soumis à ton approbation |
| `026-nouv-gratuit-08` | Créer | Veille DBL et DMARC : rapports `rua` lus chaque jour |
| `026-nouv-gratuit-09` | Créer | Stockage des preuves sur l'usine, inventaire Always Free avant le 24/10, alerte d'inactivité |
| `026-nouv-gratuit-10` | Créer, plus tard | WhatsApp en entrant (il faut d'abord un numéro) |
| `026-nouv-gratuit-11` | Créer, bloquante avant le premier paiement | R17 à 0 € : sortir prestiapp.fr de Vercel Hobby sans payer |

---

## Non vérifié

- **La part de formulaires éligibles, et la réponse réelle** : l'objet de la mesure à sec, puis de P0.
- **Le droit du formulaire** : ni la CNIL ni aucun juge ne s'est prononcé sur la prospection par formulaire. J'applique le régime de l'e-mail [interprétation].
- **Le pack GitHub** :
  - son délai d'accord ;
  - si le parcours nc.me marche pour un lycée français (la FAQ ne cite, pour la voie par adresse universitaire, que certaines universités des États-Unis, du Royaume-Uni, du Canada et d'Australie) ;
  - si les offres du pack admettent un usage commercial ;
  - si l'on peut confier les serveurs de noms à Cloudflare.
- **Le repli Gmail** : comment le Standard lit cette boîte, et comment le Répondeur y répond sans casser DMARC.
- **Brevo** : l'authentification d'un domaine sur l'offre gratuite, et le délai d'approbation du compte.
- **Le rejet de notre premier message par notre propre DMARC** : un raisonnement, à mesurer en P0.
- **La migration gratuite de R17** : faisabilité, charge de l'usine, conditions d'Oracle sur l'usage commercial non relues.
- **Playwright sur l'usine** : Ubuntu arm64 est annoncé [^playwright] ; reste à le lancer pour de vrai.
- **L'API Ad Library** : conditions d'usage introuvables.
- **La LCEN** : les numéros d'article des mentions légales et de la publicité identifiable.
- **Anthropic** : sa politique ne définit pas le « spam ». Nos parades (un envoi par entreprise à vie, un message personnalisé, la mention IA, un refus simple) relèvent de l'interprétation.
- **Oracle** : la portée de « unsolicited bulk e-mail ». Une soumission HTTP unique et personnalisée n'est pas un e-mail envoyé depuis l'usine [interprétation].

---

## Notes et sources

Relues le 24/09 par la contre-expertise, sauf mention contraire.

[^cnil-b2b]: CNIL, « La prospection commerciale par courrier électronique », page du 10/06/2026 : la prospection de professionnels peut reposer sur l'intérêt légitime quand l'objet est en rapport avec leur profession ; chaque sollicitation donne l'identité de l'émetteur et un moyen simple de refuser. https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique
[^cnil-public]: CNIL, « La réutilisation des données publiquement accessibles en ligne à des fins de démarchage commercial » (30/04/2020) : extraction « non autorisée » sur un site dont les CGU interdisent l'aspiration et la réutilisation commerciale. https://www.cnil.fr/fr/la-reutilisation-des-donnees-publiquement-accessibles-en-ligne-des-fins-de-demarchage-commercial
[^cpce]: CPCE, art. L34-5 (version du 26/07/2020). Décision n° 2026-1210 QPC du 25/06/2026 : censure des alinéas 6 et 8 et de l'avant-dernier (contrôle et amendes), abrogation reportée au 31/10/2027. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961/
[^conso]: Code de la consommation, art. L121-5 (L121-2 étendu aux pratiques visant des professionnels). Lu par un résultat de recherche, page non ouverte. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034072564
[^rgpd]: RGPD, chapitre 3 : art. 12(3), 14(2)(f), 14(3)(b), 21. https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3
[^cnil-ref]: CNIL, référentiel « gestion des activités commerciales » : 3 ans à compter du dernier contact émanant du prospect. https://www.cnil.fr/sites/cnil/files/atoms/files/referentiel_traitements-donnees-caractere-personnel_gestion-activites-commerciales.pdf
[^pixel]: CNIL, recommandation sur les pixels de suivi dans les courriels, 14/04/2026 (date confirmée par Brevo). https://www.cnil.fr/fr/recommandation-pixel-suivi-courriels
[^cass]: Cour de cassation, chambre criminelle, 14/03/2006, n° 05-83.423 (collecte déloyale d'adresses). https://www.legifrance.gouv.fr/affichJuriJudi.do?idTexte=JURITEXT000007069872
[^aiact]: AI Act, art. 50 : appliqué depuis le 02/08/2026 ; l'omnibus IA, en vigueur le 27/07/2026, ne l'a pas reporté. https://artificialintelligenceact.eu/article/50/
[^anthropic]: Anthropic, politique d'usage (15/09/2025) : interdit d'« Impersonate a human by presenting results as human-generated », de « circumvent the guardrails or terms of other platforms » et de « Promote or facilitate the generation or distribution of spam » (le mot n'y est pas défini). L'obligation de divulguer l'IA vise les « consumer-facing chatbots ». https://www.anthropic.com/legal/aup
[^brevo-as]: Brevo, conditions et annexe 7 (anti-spam) : consentement actif, « proof of opt-in » par contact, listes récoltées interdites ; seuls les e-mails « triggered directly by an action of the user » échappent à la logique marketing. https://www.brevo.com/legal/termsofuse/ · https://www.brevo.com/legal/antispampolicy/
[^brevo-pixel]: Brevo, pixels et CNIL : « By default, Brevo embeds a tracking pixel », y compris en transactionnel par SMTP ou API ; option « Per-contact pixel tracking consent ». https://help.brevo.com/hc/en-us/articles/37114679474706
[^brevo-free]: Brevo, limites de l'offre gratuite : 300 envois par jour, campagnes et transactionnel confondus. https://help.brevo.com/hc/en-us/articles/208580669
[^cf-reply]: Cloudflare, répondre depuis un Email Worker : DMARC valide exigé, une seule réponse, à l'expéditeur, depuis le même domaine, 100 références au plus. Lu par moi le 24/09. https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/
[^cf-limits]: Cloudflare, limites d'Email Routing. Lu par moi le 24/09. https://developers.cloudflare.com/email-routing/limits/
[^cf-pricing]: Cloudflare Email Service, tarifs : « Sending to arbitrary recipients requires the Workers Paid plan ». Lu par moi le 24/09. https://developers.cloudflare.com/email-service/platform/pricing/
[^supabase]: Supabase, tarifs de l'offre gratuite : 1 Go de stockage de fichiers, 500 000 appels d'Edge Functions ; pas de sauvegarde automatique (d'après la recherche sur le séquenceur maison). https://supabase.com/pricing
[^vercel]: Vercel, Fair Use Guidelines (14/09/2026) : « Hobby teams are restricted to non-commercial personal use only », avec l'exemple « Any method of requesting or processing payment from visitors of the site ». https://vercel.com/docs/limits/fair-use-guidelines
[^oracle-free]: Oracle, ressources Always Free (dont 20 Go d'Object Storage). https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
[^oracle-faq]: Oracle, FAQ Free Tier : essai de 30 jours ; reprise d'une instance inactive (p95 du CPU, du réseau et, pour A1, de la mémoire sous 20 % sur 7 jours). https://www.oracle.com/cloud/free/faq/
[^oracle-csa]: Oracle, contrat CSA, §1.3 (« unsolicited bulk e-mail »). Lu par un résultat de recherche. https://www.oracle.com/contracts/docs/corporate_cloud_csa_aa_eng_v040119.pdf
[^msa]: Microsoft Services Agreement (30/09/2025). https://www.microsoft.com/en-us/servicesagreement
[^zimbra]: OVHcloud, conditions particulières « Messagerie électronique Zimbra », version du 20/01/2025, art. 7. Copie locale relue par moi : `C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/z8.txt`
[^workspace]: Google Workspace, politique d'utilisation. https://workspace.google.com/terms/use_policy.html
[^resend]: Resend, politique d'usage acceptable. https://resend.com/legal/acceptable-use
[^spamhaus]: Spamhaus, Domain Blocklist : classement au domaine principal ; domaines des en-têtes et du corps. https://www.spamhaus.org/blocklists/domain-blocklist/
[^ig-cgu]: Conditions d'utilisation d'Instagram, art. 4.2. https://help.instagram.com/581066165581870
[^meta-pr]: Meta, Private Replies (Instagram) : un seul message, dans les 7 jours. https://developers.facebook.com/docs/messenger-platform/instagram/features/private-replies
[^meta-policy]: Meta, politique de la plateforme Messenger (tag HUMAN_AGENT). https://developers.facebook.com/docs/messenger-platform/policy/policy-overview
[^ademe]: ADEME, API de la liste des entreprises RGE, interrogée le 24/09 : 37 819 SIRET distincts avec un site non vide, sur 59 750 SIRET et 159 727 lignes ; mise à jour le 24/09 à 03:01 ; « Licence Ouverte / Open Licence », version non précisée dans les métadonnées. https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2
[^sirene]: INSEE, évolutions du statut de diffusion (lu par un résultat de recherche) ; C. com. R123-232-1 (le statut P est une opposition). https://www.sirene.fr/static-resources/documentation/Evolutions_Sirene-Statut_de_diffusion.pdf
[^playwright]: Playwright, prérequis : « Ubuntu 22.04 / 24.04 / 26.04 (x86-64 or arm64) ». https://playwright.dev/docs/intro
[^rfc9309]: RFC 9309, Robots Exclusion Protocol. https://www.rfc-editor.org/rfc/rfc9309
[^gh-pack]: GitHub Education, le Student Developer Pack (offres de domaine : Namecheap .me, .TECH, Name.com). https://education.github.com/pack
[^gh-elig]: GitHub Education, éligibilité : lycée accepté, dès 13 ans, sur justificatif. https://docs.github.com/en/education/about-github-education/github-education-for-students/apply-to-github-education-as-a-student
[^nc]: nc.me (Namecheap pour les étudiants), FAQ : « After the first year, you will pay $15 per year ». https://nc.me

**Sans note** : les clauses du §4 sur Gmail, Zoho, Proton, Sinch, SES, SMTP2GO, WhatsApp, Meta (art. 3.2.3), LinkedIn, PagesJaunes, Google Business Profile, les SMS d'OVH et de Free Mobile, ElevenLabs, Nextdoor et Leboncoin viennent des trois recherches du 24/09.
