# Fiches store — Presti (application, version 0.1.x)

**Ce que c'est.** Les textes et les réponses à copier-coller par Benj dans **App Store Connect** et dans la **Play Console**, le jour où M1 (Apple Developer) et M2 (Play Console) sont faits. Tout ce qui suit décrit ce que l'application **fait aujourd'hui**, lu dans le code du dépôt le 6 septembre 2026 (`lib/flags.ts`, `lib/natif.ts`, `app/VerrouNatif.tsx`, `app/NatifPont.tsx`, `app/parametres/*`, `mobile/`). Un drapeau baissé n'existe pas pour les stores : ni OCR de facture, ni WhatsApp, ni réseaux sociaux (`inventaireOcr`, `canauxWhatsapp`, `canauxReseaux` à `false`, `flags.ts:27,45,47`).

**Version visée.** Android : **0.1.2** (tag `mobile-v0.1.2`, `versionName` dérivé du tag, `.github/workflows/android.yml:157-160`). iOS : la fiche est **préparée, pas soumissible** — aucune build n'existe (Codemagic attend M1 + M5, `mobile/codemagic.yaml:4-10`), et `MARKETING_VERSION` vaut encore `1.0` (`mobile/ios/App/App.xcodeproj/project.pbxproj:310,332`) : à aligner sur 0.1.x avant la première build.

**Date.** 6 septembre 2026.

**Trois choses ont changé depuis les deux propositions de départ** (commits du 06/09) : le drapeau `pushNatif` est **levé** (`flags.ts:23`, M3 Firebase fait, `google-services.json` injecté par secret CI) — les notifications natives Android font donc partie de cette version ; l'écran « prochaine version » de Paramètres → Notifications ne s'affiche plus dans la coque (`SectionNotifications.tsx:51,205` : `natifSansPush` est faux) ; le parcours `mobile/TESTS.md` reste à jouer avec l'APK 0.1.3 (lignes 4, 5, 7, 8 vides). **Rien ne part vers un store tant que la colonne Android de TESTS.md n'est pas pleine** (`TESTS.md:3`), Les trois blocages du §4 **ont été corrigés dans le code le 07/09** (`7ab0ed5`, `1ef74c0` — voir la liste cochée en fin de fichier).

Les comptes de caractères sont indiqués entre crochets (points de code Unicode, apostrophes typographiques comprises — recomptés par script le 06/09).

---

## 1. App Store Connect — PRÉPARÉE, en attente de TestFlight

> Ne rien soumettre à Apple avant : M1 + M5, une build TestFlight, la colonne **iPhone** de `mobile/TESTS.md` pleine, et les trois corrections de code du §4. Les captures Apple doivent venir de l'app réelle : elles ne peuvent pas être produites aujourd'hui.

### Nom
**Presti** [6/30] — repli si le nom est pris (M8) : **Presti — Artisans** [17/30]

### Sous-titre (≤ 30)
**Répondez en moins d’une minute** [30/30] ← recommandé (la phrase de la landing et du manifeste, `app/manifest.ts:18`)

Variante si Apple juge la promesse trop forte : **La réponse prête en une minute** [30/30]

### Texte promotionnel (≤ 170)
Chaque demande de devis a sa réponse prête en moins d’une minute, dans votre ton : vous l’envoyez d’un geste. Le devis suit, la facture aussi. [142/170]

### Description (≤ 4000) — [3006/4000]

> Le point « Prévenu à la seconde » suppose les notifications natives **sur iPhone** : capacité *Push Notifications* dans Apple Developer, `GoogleService-Info.plist` dans `mobile/ios/App/App/` et clé APNs dans Firebase (aucun des trois n'existe aujourd'hui). S'ils ne sont pas en place à la build TestFlight, **retirer ce point** (la description passe à 2779 caractères) et retirer la ligne « Une notification… » des nouveautés.

Le premier qui répond décroche le chantier. Presti prépare la réponse à chaque demande de devis en moins d’une minute, dans votre ton, chiffre le devis sur vos prix et relance jusqu’à la réponse. Vous restez sur le chantier, Presti tient le standard.

CE QUE PRESTI FAIT POUR VOUS

• La réponse prête en moins d’une minute. Un client écrit sur votre page de conversation : l’assistant rédige la réponse dans votre ton, pose les bonnes questions et recueille ses coordonnées. Vous la validez d’un geste. À partir de l’offre Studio, il peut répondre seul, jour et nuit.

• Prévenu à la seconde. Un client écrit, un devis est accepté, l’assistant a besoin de vous : la notification arrive sur votre téléphone, et par email si vous le souhaitez. Jamais le contenu du message : il reste dans Presti.

• Vous reprenez la main quand vous voulez. Un bouton : « Je prends la main ». L’assistant se tait, le client le voit, et c’est vous qui répondez. Les demandes urgentes sont mises en avant.

• Le devis, prêt à relire. Depuis la conversation, Presti prépare un devis chiffré sur vos tarifs, avec les mentions obligatoires. Vous relisez, vous corrigez, vous envoyez. Le client l’accepte en ligne, et la facture se crée depuis le devis en un clic.

• Vos factures, numérotées et scellées, avec les mentions obligatoires. Avoirs et facture électronique inclus. Le PDF d’un devis ou d’une facture se partage en un geste, avec la feuille de partage de votre téléphone.

• Votre stock, sans clavier. Dans l’inventaire, un scan de code-barres retrouve ou crée l’article, la photo se prend depuis l’appareil photo, et l’assistant cherche le prix chez vos fournisseurs. L’inventaire est inclus à partir de l’offre Studio.

• Vos demandes par email, au même endroit. Branchez votre boîte professionnelle : les demandes reçues par email arrivent dans votre boîte de réception Presti. Une demande reçue ailleurs ? Collez-la, Presti rédige la réponse.

PENSÉ POUR LE TÉLÉPHONE

Si votre iPhone a Face ID ou une empreinte, Presti se rouvre avec, après cinq minutes d’absence : pas de mot de passe à retaper vingt fois par jour, et rien ne se lit derrière l’écran verrouillé. Sans réseau, l’application vous le dit clairement au lieu de faire semblant.

POUR QUI ?

Les artisans du bâtiment qui n’ont pas le temps de répondre entre deux chantiers : plombiers, électriciens, menuisiers, maçons, peintres, carreleurs, chauffagistes. Seul ou en petite équipe.

VOS DONNÉES

Chaque compte est cloisonné : un autre artisan ne voit jamais vos demandes, vos devis ni vos clients. Vous pouvez exporter l’ensemble de vos données et supprimer votre compte depuis les paramètres. Base de données hébergée dans l’Union européenne. Presti ne stocke jamais vos numéros de carte. Les prestataires qui traitent vos données pour faire fonctionner le service sont listés dans la politique de confidentialité.

CE QU’IL VOUS FAUT

Un compte Presti suffit. Presti est un outil d’assistance : vous relisez et validez ce qu’il propose avant l’envoi.

Ce que la description ne dit **plus**, et pourquoi : « une réponse en moins d’une minute, jour et nuit » (faux par défaut : mode `assistee`, proposition invisible du client, `lib/plateformeConfig.ts:45,136` ; « auto » réservé à Studio+, `lib/plans.ts:44`) ; « visibles que par vous » (contredit par la politique de confidentialité : Anthropic traite les textes, `app/confidentialite/page.tsx:53`, et le bucket des photos est public, `app/api/media/route.ts:43-44`) ; « abonnement mensuel », « créez-le sur prestiapp.fr », « un crédit = une réponse » (Apple 3.1.1 et 3.1.3 : aucun appel à acheter ailleurs, aucun prix ; et Expert = 3 crédits, `lib/plans.ts:67`) ; « conformes » (non prouvé) ; « WhatsApp, Mail, AirDrop » (feuille de partage générique, `lib/natif.ts:70`) ; « Touch ID » (jamais vu sur appareil, seule `NSFaceIDUsageDescription` existe, `Info.plist:75-76`).

### Mots-clés (≤ 100, virgules sans espaces)
artisan,devis,facture,bâtiment,plombier,électricien,menuisier,chantier,relance,assistant,client [95/100]

(« Presti » et « minute » sont dans le nom et le sous-titre : Apple les indexe déjà.)

### Catégories
- Principale : **Économie et entreprise** (Business)
- Secondaire : **Productivité** (Productivity)

(Les deux catégories du manifeste : `app/manifest.ts:29`.)

### Nouveautés (version 0.1.x) — [448]

Première version de Presti sur iPhone.

• Vos conversations, devis, factures et inventaire, dans votre poche.
• Une notification quand un client vous écrit ou accepte un devis.
• Déverrouillage par Face ID ou empreinte quand vous revenez dans l’application.
• Photo et scan de code-barres depuis l’appareil photo, dans l’inventaire.
• Partage du PDF d’un devis ou d’une facture avec la feuille de partage.
• Un bandeau clair quand le réseau manque.

### Captures d'écran (à produire depuis TestFlight, sur l'appareil)

Règles : captures **réelles**, sur le **compte de relecture** (§1 « Compte de test ») ou le compte de démo rafraîchi par `node scripts/demo-captures.mjs --garder` (aucun client réel à l'écran) ; barre de statut réelle si la capture vient du téléphone, aucune barre dessinée ; **jamais la feuille de partage ouverte** (elle affiche les contacts et conversations récentes du téléphone : des personnes réelles).

| # | Page de la console | Ce qui doit être visible | Légende (≤ 6 mots) |
|---|---|---|---|
| 1 | `/dashboard` | Le lien de la page de conversation, les compteurs, la liste des demandes | Votre activité en un coup d’œil |
| 2 | `/plateforme`, une conversation ouverte | Le fil client ↔ assistant, la proposition de l’assistant, le bouton « Je prends la main » | L’assistant rédige, vous validez |
| 3 | `/messages` | La boîte de réception, un compteur « non lus » | Toutes vos demandes au même endroit |
| 4 | `/devis/[id]` | Les lignes chiffrées, le total TTC, le bouton Partager | Le devis, chiffré sur vos prix |
| 5 | `/factures` | Une facture scellée avec son numéro, le bouton Partager visible, feuille **fermée** | Vos factures, prêtes à partager |
| 6 | `/inventaire` → Scanner (lecteur ML Kit plein écran, **sur appareil**) | Le viseur sur un code-barres d’un produit de chantier | Scannez, l’article est retrouvé |
| 7 | Écran de verrou (`VerrouNatif`, **sur appareil**, après 5 min en arrière-plan) | « Presti est verrouillée » + bouton Déverrouiller | Rouvrez avec Face ID |
| 8 (option) | `/parametres?onglet=notifications` | « Cet appareil reçoit les notifications », la liste des appareils | Prévenu dès qu’un client écrit |

Formats : iPhone 6,9″ (1320 × 2868) et 6,5″ (1284 × 2778). **iPad 13″ obligatoire** tant que `TARGETED_DEVICE_FAMILY = "1,2"` (`project.pbxproj:316,337`) — reprendre la capture 1 en paysage — ou passer à `"1"` (iPhone seul) avant la première build, ce qui est plus simple pour une 0.1.

### URL (existent déjà)
| Champ | URL | Preuve |
|---|---|---|
| Politique de confidentialité | `https://prestiapp.fr/confidentialite` | `app/confidentialite/page.tsx` (mise à jour du 5 septembre 2026, l. 21) |
| Support | `https://prestiapp.fr/contact` | `app/contact/page.tsx` (« Nous écrire », réponse sous 24 h) |
| Marketing | `https://prestiapp.fr` | `app/page.tsx` |
| Contact support (email + téléphone, demandés par Apple) | ceux des mentions légales | `app/mentions-legales/page.tsx:42-43` |
| Conditions (facultatif) | `https://prestiapp.fr/cgu` | `app/cgu/page.tsx` |

### App Privacy (App Store Connect → Confidentialité de l'app)

**Questions générales.** Suivi (tracking) : **Non** — aucun SDK publicitaire, aucun identifiant publicitaire, aucune donnée croisée avec un tiers (CSP : Supabase, Stripe, Google Analytics seulement, `next.config.mjs:39`) ; pas de `NSUserTrackingUsageDescription`, c'est correct. Données liées à l'identité : **Oui** pour tout ce qui porte `artisan_id`. Finalité : **Fonctionnalité de l'app**, plus **Analyse** uniquement si `NEXT_PUBLIC_GA_ID` est posé en production (`app/GoogleAnalytics.tsx:6-7`).

| Type (taxonomie Apple) | Collectée ? | Liée à l'utilisateur ? | Suivi ? | Finalité | Preuve |
|---|---|---|---|---|---|
| Coordonnées → Nom | Oui | Oui | Non | Fonctionnalité | `app/onboarding/page.tsx` (nom ou nom d'entreprise) |
| Coordonnées → Adresse e-mail | Oui | Oui | Non | Fonctionnalité (compte, code de connexion, notifications) | `app/signup/page.tsx`, `lib/connexion.ts`, `lib/notifications.ts` |
| Coordonnées → Numéro de téléphone | Oui (facultatif) | Oui | Non | Fonctionnalité | colonnes `tel` / `tel_public` |
| Coordonnées → Adresse physique | Oui (facultatif, requise pour émettre) | Oui | Non | Fonctionnalité (mentions légales, devis, factures) | `app/parametres/SectionLegal.tsx`, `lib/legalArtisan.ts:88` |
| Coordonnées → Autres (SIRET, forme juridique, n° TVA, assurance décennale, médiateur) | Oui | Oui | Non | Fonctionnalité | `lib/legalArtisan.ts` |
| Santé et forme | Non | — | — | — | aucune table, aucun plugin |
| Informations financières → Informations de paiement | **Non** | — | — | — | Stripe Checkout hors app (`app/api/subscribe/route.ts`) ; « Presti ne stocke jamais vos numéros de carte » (`confidentialite:32`) |
| Informations financières → Autres (IBAN / BIC de l'artisan, imprimés sur ses factures) | Oui (facultatif) | Oui | Non | Fonctionnalité | `SectionLegal.tsx`, effacés à la purge (`lib/purgeComptes.ts:104`) |
| Localisation (précise ou approximative) | **Non** | — | — | — | aucun plugin (`mobile/package.json`), `Permissions-Policy: geolocation=()` (`next.config.mjs:55`), EXIF retiré des photos (`lib/media.ts:41-43,109-113`) |
| Informations sensibles | Non | — | — | — | — |
| Contacts | Non | — | — | — | aucun plugin Contacts |
| Contenu utilisateur → E-mails ou messages texte | Oui | Oui | Non | Fonctionnalité | messages des conversations (`app/api/donnees/export/route.ts:36-41`) ; emails relevés **si** l'artisan relie sa boîte (facultatif, `confidentialite:34`) |
| Contenu utilisateur → Photos ou vidéos | Oui (photos) | Oui | Non | Fonctionnalité | photos de chantier (`lib/natif.ts:94-109`), réalisations, logo, portrait via `/api/media` ; photos envoyées par les prospects via `/api/leads` (`supabase/migrations/0027_lead_media.sql`) |
| Contenu utilisateur → Données audio | Non | — | — | — | — |
| Contenu utilisateur → Assistance client | Oui | Oui (email saisi) | Non | Fonctionnalité | formulaire « Nous écrire » (`app/api/contact/route.ts`) |
| Contenu utilisateur → Autre contenu (devis, factures, tarifs, inventaire, fournisseurs, réglages de l'assistant, fiches clients) | Oui | Oui | Non | Fonctionnalité | `export/route.ts:22-47` |
| Historique de navigation | Non | — | — | — | — |
| Historique des recherches | Non | — | — | — | la recherche fournisseurs met la requête en cache **sans compte** (`0056_cache_prix_mutualise.sql`) |
| Identifiants → Identifiant utilisateur | Oui | Oui | Non | Fonctionnalité | `auth.users.id` = `artisans.id` (`export/route.ts:24`) |
| Identifiants → Identifiant de l'appareil (jeton de notification APNs) | **Oui, si les push natives iOS sont en place** ; sinon Non | Oui | Non | Fonctionnalité | `app/NatifPont.tsx:45-49`, `app/api/push/abonner/route.ts:56-77`, `0064_push.sql:20` |
| Achats → Historique des achats | Oui | Oui | Non | Fonctionnalité | offre, crédits, identifiants Stripe (`purgeComptes.ts:104,106`) — l'achat lui-même se fait chez Stripe, hors app |
| Données d'utilisation → Interaction avec le produit | **Non par défaut** ; Oui, non lié, Analyse si Google Analytics est activé | — | Non | Analyse | `app/GoogleAnalytics.tsx:6-7` |
| Données d'utilisation → Données publicitaires | Non | — | — | — | — |
| Diagnostic → Données de plantage | Oui | **Oui** | Non | Fonctionnalité | message, pile et **URL brute de la page** (`app/error.tsx:12`, `app/api/report-error/route.ts:31`) : l'URL contient des identifiants de devis ou de conversation, donc rattachable à un compte — déclarer « lié » (ou ne rapporter que `pathname` sans UUID, et repasser à « non lié ») |
| Diagnostic → Données de performances | Non | — | — | — | — |
| Autres données (adresse IP) | Oui | Oui (sessions) / Non (anti-abus) | Non | Fonctionnalité, prévention des abus | IP des sessions montrée à l'artisan (`app/api/securite/sessions/route.ts`, `SectionSecurite.tsx`) ; bannissements en clair côté serveur 12 mois (`lib/security.ts`, `legalArtisan.ts` durée `anti_abus`) ; sur les demandes des prospects, empreinte salée seulement (`security.ts` `ipPseudonyme`) |

À dire aussi (dans la politique de confidentialité, paragraphe « Application mobile » à ajouter, voir §4) : la biométrie ne quitte jamais l'appareil, l'app ne reçoit qu'un succès ou un refus (`VerrouNatif.tsx:49-52`) ; les identifiants de messagerie sont chiffrés AES-256-GCM (`lib/secretBox.ts`) ; le lecteur de code-barres rend une valeur, pas d'image (`lib/natif.ts:131-133`) ; l'assistant s'appuie sur un prestataire d'IA nommé dans la politique (`confidentialite:53`) — un sous-traitant, pas un partage.

### Note pour le relecteur (guideline 4.2 — valeur native) — à coller dans « Notes de révision »

Version française :

> Presti est l’outil de travail des artisans du bâtiment : ils y reçoivent les demandes de leurs clients, rédigent devis et factures et tiennent leur inventaire. L’application charge la console déjà utilisée sur le web et lui ajoute ce que seul un téléphone apporte :
>
> - Notifications : un client écrit, un devis est accepté, l’assistant a besoin de l’artisan — la notification arrive, sans le contenu du message. *(retirer cette ligne si les push iOS ne sont pas en place)*
> - Scan de code-barres natif dans l’inventaire (Inventaire → Scanner) : lecteur plein écran, formats EAN/UPC/Code 128 ; un code scanné retrouve ou crée l’article.
> - Photo de chantier par l’appareil photo depuis une fiche de matériau, réduite sur l’appareil avant envoi.
> - Partage natif des documents : le PDF d’un devis ou d’une facture, et l’archive complète des données, passent par la feuille de partage du système.
> - Verrou Face ID : après cinq minutes en arrière-plan, l’app se verrouille et se rouvre par biométrie (repli : code de l’appareil). Un refus ferme la session.
> - Session gardée dans le trousseau (Keychain), jamais dans le stockage de la vue web.
> - Retour haptique, écran de lancement, rafraîchissement au retour au premier plan, bandeau « hors ligne » et page de secours sans réseau.
>
> Les liens vers l’extérieur (site public de l’artisan, fournisseurs, portail de facturation) s’ouvrent dans le navigateur du système (fenêtre Safari intégrée). L’app ne contient pas les sites publics des artisans. Les offres ne se souscrivent pas dans l’application.

English version (App Review Notes) :

> Presti is a work tool for building tradespeople: they receive customer requests, write quotes and invoices, and manage their inventory. The app loads the same console they use on the web and adds what only a phone provides:
>
> - Notifications: a customer writes, a quote is accepted, the assistant needs the tradesperson — the notification arrives, never with the message content. *(remove this line if iOS push is not configured)*
> - Native barcode scanning in the inventory (Inventory → Scan): full-screen reader (EAN/UPC/Code 128); a scanned code finds or creates the item.
> - Job-site photos with the camera from a material sheet, resized on device before upload.
> - Native document sharing: quote and invoice PDFs, and the full data export, go through the system share sheet.
> - Face ID lock: after five minutes in the background the app locks and reopens with biometrics (fallback: device passcode). A refusal signs the user out.
> - Session stored in the Keychain, never in web-view storage.
> - Haptic feedback, launch screen, automatic refresh when returning to the foreground, offline banner and offline fallback page.
>
> External links (the tradesperson’s public website, suppliers, billing portal) open in the system browser (in-app Safari view). The app does not contain the tradespeople’s public websites. Subscriptions are not sold in the app.

Preuves (pour vous, pas pour le relecteur) : scan `app/inventaire/Scanner.tsx:31-40` + `lib/natif.ts:121-135` ; photo `app/inventaire/FicheMateriau.tsx:143` ; partage `lib/natif.ts:65-87`, `app/parametres/SectionDonnees.tsx:37-41` ; verrou `app/VerrouNatif.tsx:25,44-62` ; trousseau `lib/supabaseClient.ts:16-30` ; haptique `lib/natif.ts:154-161` ; premier plan / hors-ligne `app/NatifPont.tsx:71,91-101` ; liens externes `NatifPont.tsx:77-89` + `lib/natif.ts:164-168` (`@capacitor/browser`).

### Compte de test pour la relecture (« Sign-in required »)

**Le blocage, tel qu'il est dans le code aujourd'hui.** Aucun relecteur ne peut entrer : le code par email est obligatoire pour tout compte sans application d'authentification, fondateurs compris (`lib/authArtisan.ts:76-84`, `app/api/auth/code/route.ts:64-93`) ; le compte de démo est en `@presti-test.invalid`, adresse vers laquelle `lib/email.ts:43` n'envoie **jamais** rien ; l'appareil de confiance est un cookie `httpOnly` lié au User-Agent, intransmissible (`lib/connexion.ts:105-106,124-133`) ; et **aucun mécanisme de code fixe n'existe dans le dépôt** (vérifié : aucun `RELECTURE` dans `app/api/auth`, `lib/`, `scripts/`). Il faut le construire et le tester depuis un appareil vierge **avant** de remplir ce champ (§4, point 1).

**Ce qu'il faut construire.** Un compte de relecture désigné par variable d'environnement (`PRESTI_RELECTURE_EMAIL`) avec un code à 6 chiffres fixe (`PRESTI_RELECTURE_CODE`) : dans `app/api/auth/code/route.ts`, pour ce compte seulement, enregistrer `hacherCode(uid, codeFixe)` au lieu d'un code aléatoire et ne pas envoyer d'email ; `verifier/route.ts` ne change pas. Le compte : artisan **fictif** (nom d'atelier inventé), profil légal complet (sinon devis et factures refusent d'être émis, `lib/legalArtisan.ts:88-98`), offre Studio ou Signature avec crédits, **sans** `is_founder`, 2 ou 3 conversations fictives, un devis envoyé, une facture, un inventaire ; adresse `@presti-test.invalid` (aucun email ne part) et slug ajouté à `GARDES` de `scripts/purger-comptes-test.mjs:15`, sinon la purge l'emporte.

**Texte à coller dans les notes de relecture** (une fois le code fixe en place) :

> Compte de test — Email : *(adresse du compte de relecture, à renseigner par Benj)* · Mot de passe : *(dans le champ prévu d'App Store Connect — à renseigner par Benj, jamais dans un fichier du dépôt)*.
> Après le mot de passe, l'app demande un code à 6 chiffres « reçu par email ». Pour ce compte de test, le code est fixe : *(à renseigner par Benj)*. Cochez « Se souvenir de cet appareil 30 jours » pour ne plus le saisir.
> Ce compte contient des données fictives (artisan, clients, devis, factures, inventaire) ; rien n'est envoyé à une vraie personne.
>
> Pour tester les fonctions natives : Inventaire → un article → « Scanner » (n'importe quel code-barres EAN-13 de produit) ; Inventaire → un article → « Photo » ; Devis → un devis → « Partager » ; Paramètres → Données & confidentialité → « Télécharger mon archive » (feuille de partage) ; Paramètres → Notifications → « Activer sur cet appareil » puis « M'envoyer un test ». Mettez l'app en arrière-plan plus de cinq minutes puis revenez : Face ID est demandé.
>
> Suppression du compte : Paramètres → Données & confidentialité → « Supprimer mon compte » → tapez SUPPRIMER. La suppression est programmée sous 30 jours et annulable d'un clic ; les factures émises sont conservées dix ans (obligation légale française), le compte est alors anonymisé. Merci de ne pas la déclencher sur le compte de test.
>
> Abonnement : les offres se souscrivent sur le site ; l'app ne vend rien.

### Suppression de compte (Apple 5.1.1 (v))
**Dans l'app** : Paramètres → Données & confidentialité → « Zone dangereuse » → **« Supprimer mon compte »** (`app/parametres/SectionDonnees.tsx:19,112-125`). Parcours : récapitulatif de ce qui disparaît et de ce qui reste (`app/api/account/delete/route.ts:22-59`) → mot SUPPRIMER (`SectionDonnees.tsx:137-141`) → demande enregistrée (`account/delete:62-81`) → bandeau « Votre compte sera supprimé le … » avec « Annuler la suppression » (`SectionDonnees.tsx:96-102`) → purge automatique à 30 jours (`lib/purgeComptes.ts:28,119-145`) : effacement complet, ou anonymisation avec conservation des seules pièces comptables dix ans si des factures ont été émises (`purgeComptes.ts:12-26,66-117`). **Sans l'app** : même écran sur `https://qg.prestiapp.fr/parametres?onglet=donnees`, ou par email / formulaire (`confidentialite:61`).

### Classification (questionnaire Apple)
Tout à « Aucun » : ni violence, contenu sexuel, langage, jeux d'argent, concours, contenu médical, ni **accès web illimité** (WebView bornée aux domaines Presti : `Info.plist:77-82`, `capacitor.config.ts:23,26` ; tout autre lien part dans le navigateur du système, `NatifPont.tsx:77-89`). Pas « Conçue pour les enfants ». Résultat attendu : **4+**.

### `Info.plist` — à corriger avant la première build
- `ITSAppUsesNonExemptEncryption` absent → ajouter à `false` (HTTPS standard seulement), sinon la question revient à chaque build.
- `CFBundleDevelopmentRegion` = `en` (l. 7-8) → `fr`, et `CFBundleLocalizations` = `fr` : l'app et ses textes d'autorisation sont en français.
- `WKAppBoundDomains` : retirer `localhost` (l. 81) du build de release.
- `NSPhotoLibraryAddUsageDescription` (l. 73-74) est déclaré mais aucun code n'enregistre en galerie (`lib/natif.ts:98-102`, pas de `saveToGallery`) : inoffensif ; si Apple demande, dire « prévu, non utilisé », ou le retirer.
- Les textes d'autorisation existants sont justes : caméra (l. 69-70), photos (l. 71-72), Face ID (l. 75-76).

---

## 2. Play Console — Android 0.1.2

### Titre (≤ 30)
**Presti** [6/30] — repli : **Presti — Artisans** [17/30]

### Description courte (≤ 80)
**La réponse à chaque demande, prête en une minute. Devis et factures suivent.** [76/80] ← recommandée

Variante : Chaque demande a sa réponse prête en moins d’une minute. Devis, factures aussi. [79/80]

### Description longue (≤ 4000) — [3182/4000]

Le premier qui répond décroche le chantier. Presti prépare la réponse à chaque demande de devis en moins d’une minute, dans votre ton, chiffre le devis sur vos prix et relance jusqu’à la réponse. Vous restez sur le chantier, Presti tient le standard.

CE QUE PRESTI FAIT POUR VOUS

• La réponse prête en moins d’une minute. Un client écrit sur votre page de conversation : l’assistant rédige la réponse dans votre ton, pose les bonnes questions et recueille ses coordonnées. Vous la validez d’un geste. À partir de l’offre Studio, il peut répondre seul, jour et nuit.

• Prévenu à la seconde. Un client écrit, un devis est accepté, l’assistant a besoin de vous : la notification arrive sur votre téléphone, et par email si vous le souhaitez. Jamais le contenu du message : il reste dans Presti.

• Vous reprenez la main quand vous voulez. Un bouton : « Je prends la main ». L’assistant se tait, le client le voit, et c’est vous qui répondez. Les demandes urgentes sont mises en avant.

• Le devis, prêt à relire. Depuis la conversation, Presti prépare un devis chiffré sur vos tarifs, avec les mentions obligatoires. Vous relisez, vous corrigez, vous envoyez. Le client l’accepte en ligne, et la facture se crée depuis le devis en un clic.

• Vos factures, numérotées et scellées, avec les mentions obligatoires. Avoirs et facture électronique inclus. Le PDF d’un devis ou d’une facture se partage en un geste, avec la feuille de partage de votre téléphone.

• Votre stock, sans clavier. Dans l’inventaire, un scan de code-barres retrouve ou crée l’article, la photo se prend depuis l’appareil photo, et l’assistant cherche le prix chez vos fournisseurs. L’inventaire est inclus à partir de l’offre Studio.

• Vos demandes par email, au même endroit. Branchez votre boîte professionnelle : les demandes reçues par email arrivent dans votre boîte de réception Presti. Une demande reçue ailleurs ? Collez-la, Presti rédige la réponse.

PENSÉ POUR LE TÉLÉPHONE

Si votre téléphone a une empreinte ou la reconnaissance du visage, Presti se rouvre avec, après cinq minutes d’absence : pas de mot de passe à retaper vingt fois par jour, et rien ne se lit derrière l’écran verrouillé. Sans réseau, l’application vous le dit clairement au lieu de faire semblant.

L’appareil photo ne sert qu’à deux choses : une photo pour une fiche de l’inventaire, et la lecture d’un code-barres. Rien n’est pris sans votre geste.

POUR QUI ?

Les artisans du bâtiment qui n’ont pas le temps de répondre entre deux chantiers : plombiers, électriciens, menuisiers, maçons, peintres, carreleurs, chauffagistes. Seul ou en petite équipe.

VOS DONNÉES

Chaque compte est cloisonné : un autre artisan ne voit jamais vos demandes, vos devis ni vos clients. Vous pouvez exporter l’ensemble de vos données et supprimer votre compte depuis les paramètres. Base de données hébergée dans l’Union européenne. Presti ne stocke jamais vos numéros de carte. Les prestataires qui traitent vos données pour faire fonctionner le service sont listés dans la politique de confidentialité.

CE QU’IL VOUS FAUT

Un compte Presti suffit. Presti est un outil d’assistance : vous relisez et validez ce qu’il propose avant l’envoi.

> Le point « Prévenu à la seconde » est vrai dans le code (drapeau `pushNatif` levé, Firebase posé, `NatifPont.tsx:44-61`, `SectionNotifications.tsx:92-105`) mais **pas encore vu sur un téléphone** : lignes 4, 5, 7 et 8 de `mobile/TESTS.md` vides. Si elles échouent avec l'APK 0.1.2, retirer ce point (−227 caractères → 2955) et la ligne « Une notification… » des nouveautés, puis retirer `POST_NOTIFICATIONS` du manifeste.

### Catégorie
**Entreprise** (Business). Tags : productivité, gestion.

### Nouveautés (≤ 500) — [454/500]
Première version de Presti sur Android. • Vos conversations, devis, factures et inventaire, dans votre poche. • Une notification quand un client vous écrit ou accepte un devis. • Déverrouillage par empreinte ou visage quand vous revenez dans l’application. • Photo et scan de code-barres depuis l’appareil photo, dans l’inventaire. • Partage du PDF d’un devis ou d’une facture vers l’application de votre choix. • Un bandeau clair quand le réseau manque.

### Captures d'écran
Mêmes sujets que le tableau du §1 (captures 1 à 8), prises **sur l'appareil** avec l'APK 0.1.2 ; légende 7 : « Rouvrez avec votre empreinte ». Feuille de partage **fermée** sur la capture 5. Rapport longueur/largeur ≤ 2:1 : **pas** les 1080 × 2340 du manifeste PWA tels quels (2,17:1, `app/manifest.ts:37-38`) — recadrer en 1080 × 1920 ou poser la capture dans un cadre d'appareil. Play demande en plus une **image de présentation 1024 × 500** (fond nuit `#0A0C11`, marque corail, la phrase « Répondez en moins d’une minute ») : elle n'existe pas encore dans `mobile/resources/` (icône, icône adaptative, écran de lancement seulement).

### Sécurité des données (Data safety) — au format des questions

| Question de la Play Console | Réponse | Preuve |
|---|---|---|
| Votre appli collecte-t-elle ou partage-t-elle des données utilisateur ? | **Oui, collecte** | tableau ci-dessous |
| Toutes les données utilisateur collectées sont-elles chiffrées en transit ? | **Oui** | HTTPS seulement : `cleartext: false`, `allowMixedContent: false` (`capacitor.config.ts:22,27`), HSTS 2 ans + preload (`next.config.mjs:56`) |
| Proposez-vous un moyen de demander la suppression des données ? | **Oui** | dans l'app (Paramètres → Données & confidentialité → « Supprimer mon compte ») et par email / formulaire ; certaines données sont conservées pour obligation légale (factures émises, 10 ans, `lib/purgeComptes.ts:14-26`) |
| Votre appli a-t-elle fait l'objet d'un examen de sécurité indépendant (MASA) ? | Non | — |
| Données partagées avec des tiers ? | **Non** (au sens Google : les prestataires traitent pour le compte de Presti, sous contrat, sans usage propre) | `confidentialite:46-55`, annexe art. 28 (`app/cgu/page.tsx`) |

Types de données (chaque ligne : collectée / partagée / obligatoire ou facultative / finalités). Aucune n'est traitée « de façon éphémère ».

| Catégorie Google | Type | Collectée | Partagée | Obligatoire ? | Finalités | Preuve |
|---|---|---|---|---|---|---|
| Informations personnelles | Nom | Oui | Non | Obligatoire | Fonctionnalités de l'appli, gestion du compte | `app/onboarding/page.tsx` |
| Informations personnelles | Adresse e-mail | Oui | Non | Obligatoire | Fonctionnalités, gestion du compte | `app/signup/page.tsx` |
| Informations personnelles | ID utilisateur | Oui | Non | Obligatoire | Fonctionnalités, gestion du compte | Supabase Auth |
| Informations personnelles | Adresse | Oui | Non | Facultative | Fonctionnalités | `SectionLegal.tsx` |
| Informations personnelles | Numéro de téléphone | Oui | Non | Facultative | Fonctionnalités | `onboarding/page.tsx` |
| Informations personnelles | Autres infos (SIRET, TVA, assurance, médiateur) | Oui | Non | Facultative | Fonctionnalités | `lib/legalArtisan.ts` |
| Informations financières | Infos de paiement de l'utilisateur | **Non** | — | — | — | Stripe hors app |
| Informations financières | Historique des achats | Oui | Non | Obligatoire | Fonctionnalités, gestion du compte | offre / crédits / identifiants Stripe |
| Informations financières | Autres infos financières (IBAN / BIC) | Oui | Non | Facultative | Fonctionnalités | `SectionLegal.tsx` |
| Santé et remise en forme | — | Non | — | — | — | — |
| Messages | E-mails | Oui | Non | Facultative | Fonctionnalités | boîte reliée (`0036_canaux.sql`, `vercel.json`) |
| Messages | SMS ou MMS | Non | — | — | — | — |
| Messages | Autres messages in-app | Oui | Non | Obligatoire | Fonctionnalités | conversations avec les prospects |
| Photos et vidéos | Photos | Oui | Non | Facultative | Fonctionnalités | `lib/natif.ts:94-109`, `/api/media`, `/api/leads` |
| Photos et vidéos | Vidéos | Non | — | — | — | — |
| Fichiers audio | — | Non | — | — | — | — |
| Fichiers et documents | — | Non (les PDF sont générés côté serveur ; aucun fichier lu sur l'appareil) | — | — | — | `export/route.ts:82-95` |
| Agenda, Contacts | — | Non | — | — | — | aucun plugin |
| Activité dans l'application | Interactions dans l'application | **Non** (Oui, Analyse, si Google Analytics est activé) | Non | Facultative | Analyse | `GoogleAnalytics.tsx:6-7` |
| Activité dans l'application | Historique des recherches dans l'appli | Non | — | — | — | cache sans compte (`0056`) |
| Activité dans l'application | Applications installées | Non | — | — | — | — |
| Activité dans l'application | Autres contenus générés par l'utilisateur | Oui | Non | Obligatoire | Fonctionnalités | devis, factures, inventaire, tarifs, fiches clients |
| Navigation Web | — | Non | — | — | — | — |
| Infos et performances de l'appli | Journaux de plantage | Oui | Non | Obligatoire | Fonctionnalités (diagnostic) | `error.tsx:12`, `report-error/route.ts:27-34` |
| Infos et performances de l'appli | Diagnostics | Non | — | — | — | — |
| Appareil ou autres identifiants | Jeton de notification FCM | **Oui** (dès que l'artisan active les notifications) | Non | Facultative | Fonctionnalités | `NatifPont.tsx:45-49`, `push/abonner/route.ts:56-77` |

Adresse IP : pas une catégorie du formulaire Google ; décrite dans la politique de confidentialité (« traces techniques… 12 mois », `confidentialite:58`).

### Classification du contenu (questionnaire IARC)
Catégorie « Utilitaire, productivité, communication ou autre ». Aucune violence, sexualité, langage, drogue, jeu d'argent, ni contenu généré destiné à d'autres utilisateurs de l'appli. **Les utilisateurs interagissent : oui** (l'artisan échange des messages avec ses clients, qui ne sont pas des utilisateurs de l'appli) ; **partage d'informations personnelles : oui** (les clients laissent nom et coordonnées à l'artisan). Pas de localisation partagée ; pas d'achats numériques dans l'appli (vrai **après** la correction du §4, point 2). Résultat attendu : **PEGI 3 / Tous publics**, mentions « Les utilisateurs interagissent », « Partage d'infos ». Audience cible : **18 ans et plus** — un choix, cohérent avec l'usage professionnel (CGU §3 : « Le service s'adresse aux professionnels », `app/cgu/page.tsx:38`).

### Autres déclarations Play
- **Autorisations d'accès à l'appli** : identifiants de test obligatoires — mêmes règles que le compte de relecture Apple (§1) : mot de passe et code fixe **à renseigner par Benj dans le formulaire**, jamais dans le dépôt.
- **Annonces** : non. **Identifiant publicitaire** : non utilisé.
- **Photos et vidéos** : l'appli ne demande pas `READ_MEDIA_IMAGES` — rien à déclarer (la galerie passe par le sélecteur du système).
- **Fonctionnalités financières** : aucune (une facture est un document généré, pas un service financier).
- **Santé, Gouvernement, Actualités** : non.
- **Déclaration caméra** (à mettre dans la description, c'est fait, et en réponse au relecteur) : « L'accès à la caméra sert à deux choses : prendre une photo pour une fiche de l'inventaire, et lire un code-barres. Aucune image n'est conservée par le lecteur de code-barres. »

### Permissions déclarées (`mobile/android/app/src/main/AndroidManifest.xml`)

| Permission | Ligne | Phrase pour le formulaire | Quand elle est demandée |
|---|---|---|---|
| `INTERNET` | 54 | L’application charge la console de l’artisan. | — |
| `POST_NOTIFICATIONS` (Android 13+) | 56 | Notifications quand un client écrit, accepte un devis, ou quand l’assistant a besoin de l’artisan. Jamais le contenu du message. | **au clic** sur « Activer sur cet appareil » (`SectionNotifications.tsx:95`), jamais au lancement |
| `CAMERA` | 57 | Photo pour une fiche de l’inventaire et lecture de codes-barres, à la demande de l’artisan. | au premier scan (`lib/natif.ts:125-126`) ou à la première photo — jamais au lancement |
| `VIBRATE` | 58 | Retour haptique léger (scan réussi, devis envoyé). | — (permission normale) |
| `USE_BIOMETRIC` | 59 | Déverrouillage de l’application par empreinte ou visage après cinq minutes en arrière-plan. | boîte de dialogue du système au déverrouillage (`VerrouNatif.tsx:49-51`) |

Aucune permission « sensible » (SMS, journal d'appels, localisation en arrière-plan, accessibilité, tous les fichiers) : **aucun formulaire de déclaration de permission** n'est requis. Autres points utiles : `android:allowBackup="false"` (l. 4 — rien dans les sauvegardes cloud) ; `FileProvider` non exporté pour le partage (l. 37-43) ; le module ML Kit se télécharge par les services Google Play dès l'installation (l. 46 — un module Play services, pas du code chargé hors Play) ; canal et icône de notification Firebase (l. 47-49). Signature : keystore hors dépôt, par variables d'environnement (`build.gradle:20-36`).

### Politique de confidentialité
`https://prestiapp.fr/confidentialite` — à compléter d'un paragraphe « Application mobile » avant soumission (§4, point 5).

### Suppression de compte (URL demandée par Play)
`https://prestiapp.fr/confidentialite` (section 5, « Durée de conservation », qui décrit le parcours : délai de grâce de 30 jours, annulation, purge automatique, pièces comptables 10 ans). Le parcours lui-même : `https://qg.prestiapp.fr/parametres?onglet=donnees` (connexion requise), identique dans l'app.

Texte à donner si Play demande une description :

> Vous pouvez supprimer votre compte Presti depuis l’application ou le site : Paramètres → Données & confidentialité → « Supprimer mon compte ». Un récapitulatif vous montre ce qui sera effacé, vous tapez SUPPRIMER, puis vous disposez de 30 jours pour annuler d’un clic. Passé ce délai, le compte, les conversations, les devis, les images et l’accès sont effacés. Si vous avez émis des factures, la loi française nous oblige à les conserver dix ans : elles sont gardées avec les seuls devis et clients qu’elles citent et votre identité d’émetteur, et tout le reste est effacé — le compte est anonymisé, plus personne ne peut s’y connecter. Vous pouvez exporter l’ensemble de vos données avant (Paramètres → Données & confidentialité → « Télécharger mon archive ») ou nous écrire depuis prestiapp.fr/contact.

### App Links
`public/.well-known/assetlinks.json` existe avec une empreinte SHA-256 ; vérifier qu'elle est celle du keystore de release **et** celle de Play App Signing si activé (sinon les liens des emails n'ouvrent pas l'app). Retirer `/abonnement` des chemins acceptés (manifeste l. 33 et `NatifPont.tsx:30`) — voir §4, point 2.

---

## 3. Ce que Benj doit faire (cochable)

**Dans le code, avant toute soumission (les trois blocages) — à demander à Claude Code :**
- [x] **1. Compte de relecture** — fait le 07/09 : `RELECTURE_EMAIL` / `RELECTURE_CODE` (Vercel), `app/api/auth/code/verifier/route.ts` (code fixe pour ce seul compte, temps constant), compte « Atelier Relecture » créé par `scripts/compte-relecture.mjs` (Signature, 2 conversations, 1 devis, sans IA), identifiants dans `Documents/presti-secrets/relecture.txt` ; prouvé par `code-connexion-e2e` 61/61 (section 9).
- [x] **2. Plus d'achat dans la coque** — fait le 07/09 (`7ab0ed5`) : `/abonnement` et Paramètres → Abonnement n'affichent en natif ni prix, ni bouton, ni portail, ni renvoi (« votre formule se consulte ; sa gestion n'est pas disponible ici ») ; `/abonnement` retiré des App Links et du pont (`liens-profonds-e2e` 18/18).
- [x] **3. Plus de distribution hors store ni d'annonce** — fait le 07/09 (`7ab0ed5`) : en natif, Paramètres → Application ne rend que « vous êtes dans l'application » ; « prochaine version » retiré de Notifications.
- [x] 4. `Info.plist` : `ITSAppUsesNonExemptEncryption = false`, `CFBundleDevelopmentRegion = fr`, `localhost` retiré de `WKAppBoundDomains` (07/09) ; `MARKETING_VERSION` suit le tag dans Codemagic ; **reste à décider** `TARGETED_DEVICE_FAMILY` (reco : `"1"`, iPhone seul — pas de captures iPad à produire).
- [x] 5. Politique de confidentialité : section « 9. Application mobile » ajoutée le 07/09 (caméra, biométrie locale, jeton de notification, session au trousseau, rapports d'erreur sans identifiant, aucune mesure d'audience).
- [x] 6. Rapports d'erreur : `app/error.tsx` n'envoie plus que le chemin, identifiants masqués (`7ab0ed5`) — App Privacy « Données de plantage : non lié » tient.

**Par Benj (comptes, appareils, consoles) :**
- [ ] 7. Jouer **tout** `mobile/TESTS.md` sur un Android avec l'APK 0.1.3 (lignes 4, 5, 7, 8 = notifications natives : si elles ratent, retirer le point « Prévenu à la seconde » des deux fiches).
- [ ] 8. M2 — Play Console (25 $), vérification d'identité.
- [ ] 9. M6 — vérifier que l'empreinte de `assetlinks.json` est celle du keystore de release (et de Play App Signing).
- [ ] 10. Captures Android (8 sujets, §2), image de présentation 1024 × 500.
- [ ] 11. Remplir la Play Console avec le §2 : titre, courte, longue, nouveautés, Data safety, IARC, permissions, URL, identifiants de test (mot de passe + code fixe **dans le formulaire**, jamais dans le dépôt).
- [ ] 12. M1 — Apple Developer (organisation, D-U-N-S), M5 — Codemagic ; puis capacités *Push Notifications* et *Associated Domains*, `GoogleService-Info.plist`, clé APNs, `apple-app-site-association` — **ou** soumettre iOS sans push ni liens universels, en retirant le point correspondant (§1).
- [ ] 13. Colonne **iPhone** de `TESTS.md` pleine sur TestFlight, captures iPhone (et iPad si universelle), puis le §1 dans App Store Connect.

---

## 4. Ce qui n'est PAS promis dans cette version

- **OCR de facture fournisseur, WhatsApp, réseaux sociaux** : drapeaux baissés (`flags.ts:27,45,47`). Aucun mot dans les fiches.
- **iPhone, tant que M1 + M5 ne sont pas faits** : pas de build, pas de captures, pas de soumission. La fiche du §1 est un texte prêt, rien d'autre. `Touch ID` n'est cité nulle part (jamais vu sur appareil) : « Face ID ou empreinte ».
- **Notifications natives sur iPhone** : pas de capacité Push, pas de `GoogleService-Info.plist`, pas de clé APNs, aucun `.entitlements` dans `mobile/ios/`. Le point « Prévenu à la seconde » de la fiche iOS tombe si ces trois choses ne sont pas là à la build.
- **Liens universels iOS** : `apple-app-site-association` absent de `public/.well-known/` (seul `assetlinks.json` existe). Non cité ; les App Links Android, eux, existent.
- **Le verrou sur un téléphone sans biométrie** : il n'y en a pas (`VerrouNatif.tsx:20,75-76`), et la fiche dit « si votre téléphone a une empreinte… ».
- **Les prix, les offres, l'abonnement, les crédits** : absents des deux descriptions. L'app ne vend rien (après la correction du §3, point 2) ; « Un compte Presti suffit. »
- **Les sites et pages publiques des artisans** : jamais nommés comme « faits par Presti » ; l'app ne les contient pas, ils s'ouvrent dans le navigateur du téléphone (`NatifPont.tsx:77-89`).
- **Le nom du prestataire d'IA** : « l'assistant », pas plus. Le sous-traitant est nommé dans la politique de confidentialité, c'est là que les relecteurs le lisent.
- **« Conformes », « jour et nuit », « visibles que par vous »** : retirés (voir la note sous la description du §1).
- **Applications tierces de partage** (WhatsApp, Mail, AirDrop, Gmail, Drive) : la feuille de partage est générique, aucune marque citée.

---

## Constats du critique : ce qui a été appliqué, ce qui a été écarté

**Bloquants (3/3 appliqués).** (1) Compte de relecture : le mécanisme n'existe pas — dit tel quel, notes de relecture écrites avec « à renseigner par Benj », prérequis n° 1 du §3. (2) Achat dans la coque : phrases retirées des descriptions, correction de code n° 2 du §3, `/abonnement` retiré des App Links. (3) APK hors Play et annonces de version : correction de code n° 3 du §3 ; la phrase « prochaine version » de `SectionNotifications.tsx:206` ne s'affiche plus depuis que `pushNatif` est levé.

**Majeurs (3/3 appliqués).** Promo et premier point réécrits (proposition invisible du client, validation d'un geste, « auto » à partir de Studio) ; « visibles que par vous » → « cloisonné », avec renvoi à la politique de confidentialité ; tout l'App Store marqué « préparé, en attente de TestFlight », `MARKETING_VERSION` à aligner, « Face ID ou empreinte », captures iPad signalées.

**Mineurs appliqués.** Verrou conditionnel (« si votre téléphone a… ») ; marques tierces retirées ; phrase sur les crédits supprimée avec la section ; « conformes » → « numérotées et scellées, avec les mentions obligatoires » ; capture 5 sans feuille de partage ; diagnostics déclarés « lié » (ou correction de code n° 6) ; « navigateur du système (fenêtre Safari intégrée) » et audience 18+ présentée comme un choix ; citations corrigées (`pushWeb` est `flags.ts:20`, la version vient de `android.yml:157-160`, les photos des prospects passent par `/api/leads`).

**Mineur écarté, et pourquoi.** « Retirer `POST_NOTIFICATIONS` (et les meta-data Firebase) du manifeste tant que `pushNatif` est baissé » : caduc, le drapeau a été levé le 06/09 (`c48f487`) et la permission est demandée au clic, pour une fonction réelle — la fiche la justifie. Elle ne redevient à retirer que si les lignes 4-5-7-8 de `TESTS.md` échouent (dit au §2 et au §3, point 7).
