# PROMPT v4 — Presti : Plateforme autonome · Site sur-mesure · Inventaire · Comptes · Conformité

> **Mode d'emploi.** Ouvrir Claude Code dans `C:\Users\benja\Documents\presti` et coller ce document **en entier** comme premier message. Il remplace et absorbe `plans/002-refonte-site-plateforme-v3.md` (dont les chantiers non terminés sont repris ici). Ne pas le résumer avant de le coller.
>
> Ce document contient : le protocole d'exécution (§0), le contexte figé (§1), **13 chantiers** spécifiés (§3 à §15), la grille d'audit finale (§16), et les décisions à faire trancher (§18).

---

## §0. PROTOCOLE D'EXÉCUTION — travail continu, visible, sans temps mort

Benj veut te voir travailler **en continu**, sans pause, avec l'avancement affiché en permanence. Voici comment tu t'y prends concrètement.

**0.1 — Journal de bord obligatoire.** Tu tiens `plans/journal-v4.md`, mis à jour **à chaque étape**, jamais en fin de session :

```
## [J4-2] Sections data-driven — 21:14 → 21:52 (38 min) — ✅ terminé
- fait : migration 0023, 12 composants de section, rendu identique vérifié (captures 3 slugs)
- build : OK (0 erreur) · typecheck : OK · déployé : oui (commit a3f9c21)
- suivant : [J4-3] contrat de thème
```

Format d'une ligne : `[jalon] titre — heure début → heure fin (durée) — statut`. Tu affiches ce bloc dans la conversation **à chaque fois que tu termines une étape**, avec le temps de travail cumulé depuis le début de la session.

**0.2 — Zéro attente inutile.** Tu ne demandes **jamais** l'autorisation pour une action réversible (créer un fichier, écrire une migration non appliquée, refactorer, écrire un test, lancer un build). Tu agis, tu vérifies, tu logues. Tu enchaînes immédiatement sur l'étape suivante sans attendre de réponse.

**0.3 — Les seuls arrêts autorisés.** Tu ne t'arrêtes que dans **quatre** cas, et tu le dis explicitement dans le journal :
1. une décision de la §18 non tranchée qui bloque **spécifiquement** l'étape en cours (les autres étapes continuent) ;
2. une action **irréversible** en production (suppression de données, migration destructive, changement de prix Stripe, envoi d'emails réels à des prospects) ;
3. un secret ou un accès externe que tu n'as pas (clé API, compte partenaire) ;
4. le build casse et tu as épuisé deux tentatives de correction — tu remontes le diagnostic, tu n'entres pas en boucle.

**0.4 — Paralléliser au lieu d'attendre.** Quand une étape est bloquée, tu passes à la suivante indépendante et tu y reviens. Tu utilises des **sous-agents en parallèle** pour tout ce qui est isolable : audit sécurité, écriture de tests, recherche documentaire, revue d'accessibilité. Tu ne restes jamais inactif en attendant un déploiement Vercel : pendant les ~50 s, tu prépares l'étape suivante.

**0.5 — Toujours un livrable en fin de bloc.** Aucun bloc de travail ne se termine sans que quelque chose soit **déployé et vérifié**. Pas de « j'ai commencé à réfléchir à ».

> ⚠️ Une limite honnête à poser : « ne jamais faire de pause » ne veut pas dire « ne jamais poser de question ». Un agent qui devine sur une décision irréversible coûte bien plus cher que 30 secondes d'attente. Le protocole ci-dessus supprime les pauses **inutiles** (permissions, confirmations, attentes passives) — pas le jugement.

---

## §1. Contexte figé

**Produit.** Presti — SaaS pour artisans français. Répond en < 1 min aux demandes de devis, relance, chiffre, facture, et fournit à l'artisan **un site vitrine + une plateforme de contact à sa marque**. Benj build, Alexandre vend. Objectif : acquisition des premiers artisans payants.

**Stack.** Next.js 15 (App Router, TS strict) · React 19 · Supabase (auth + Postgres + RLS) · Anthropic SDK · Stripe · Resend · `gsap` · `lenis` · `@react-pdf/renderer` · Playwright. Vercel, push `main` = déploie. CSS maison, pas de framework.

**URLs.** `prestiapp.fr` (landing) · `qg.prestiapp.fr` (console artisan) · `prestiapp.fr/site/[slug]` (site vitrine) · `prestiapp.fr/l/[slug]` (plateforme).

**Règles non négociables (vault `SaaS/CLAUDE.md`) :**
- **White-label absolu** : le site et la plateforme livrés n'affichent **jamais** « Presti », nulle part (DOM, metadata, OG, emails, PDF, `data-*`).
- **Anti-fabrication** : l'IA n'invente **jamais** un fait sur un artisan (années, certifications, labels, avis, chiffres, prix non sourcés).
- **Anti-vibecoding** : cycle `presti-verify` obligatoire — éditer → build 0 erreur → typecheck → déployer → **vérifier en direct** → nettoyer les données de test.
- **Corrections incrémentales** : on fixe l'existant, on ne rase jamais.
- **Zéro donnée de démo en base.**

**État après la v3.** Le prompt v3 a été exécuté : indexation, CSS scindé, `next/image`, motion corrigée, sections data-driven, thèmes, contenu IA v2. Cette v4 part de cet état et **change d'échelle** : la plateforme devient un produit à part entière, le site devient réellement sur-mesure, et trois briques métier apparaissent (prix réels, inventaire, facturation électronique).

---

## §2. Les 12 demandes de Benj, traduites

| # | Demande (verbatim de Benj) | Chantier |
|---|---|---|
| 1 | « pousser encore plus les détails, la personnalisation, les animations, la qualité des images très élevée » | §7 |
| 2 | « le profil, comme dans Claude : paramètres, abonnement, gestion, remodifier ton profil » | §5 |
| 3 | « la plateforme doit être quelque chose vraiment à part, une interface similaire à celle de Claude, déconnectée » | §3 |
| 4 | « un onglet Plateforme dans l'interface Presti, tu la personnalises de manière extrêmement poussée, ça te met le lien » | §3 |
| 5 | « c'est là que tu as l'IA : automatisation ou pas des réponses, son modèle, devis et factures automatisés ou non » | §3 |
| 6 | « côté client : depuis le site web, tu arrives sur l'interface de la plateforme, tu discutes, et le devis se crée » | §3 |
| 7 | « les messages dans Presti : tu enlèves l'automatique, c'est juste connecter ton mail ou tes réseaux, recevoir, répondre, puis créer un devis/facture » | §4 |
| 8 | « connecte les IA devis/factures/plateforme aux sites de grossistes les plus connus de France, pour ne pas dire n'importe quoi sur le chiffrage » | §8 ⚠️ |
| 9 | « nouvelle fonctionnalité : Inventaire — l'artisan cherche un matériau, l'IA trouve le meilleur qualité/prix chez le meilleur grossiste » | §9 |
| 10 | « système de connexion pour les clients sur la plateforme : créer, modifier, supprimer leur compte » | §6 |
| 11 | « l'artisan peut supprimer son site / sa plateforme sans supprimer son compte Presti ; tout modifiable, tout supprimable » | §5 |
| 12 | « factures électroniques » + « le système de messages : quand c'est l'artisan qui parle, ça ne s'envoie pas » | §10, §4.5 |
| 13 | « remets mon accès fondateur benjaminfiliot@gmail.com » | §17 — **à faire en premier** |

---

## §3. CHANTIER A — La Plateforme devient un produit autonome

C'est **le plus gros chantier de cette v4**, et le mal compris de la v3. La plateforme n'est pas une page de contact décorée : c'est **une application de conversation**, à l'ergonomie d'un client de chat moderne (type Claude/ChatGPT), vivant à son propre domaine, avec ses propres comptes, sa propre identité visuelle.

### A1. Architecture cible

```
Console Presti (qg.prestiapp.fr)          Plateforme (marque de l'artisan)
├── Tableau de bord                       ├── /p/[slug]            → l'app de conversation
├── Messages   (boîte unifiée, §4)        ├── /p/[slug]/login      → compte client
├── Devis · Factures                      ├── /p/[slug]/compte     → gestion du compte client
├── Inventaire (§9)                       └── /p/[slug]/d/[devis]  → devis reçu, consultable, signable
├── Mon site      → éditeur + lien
├── Ma plateforme → éditeur + lien   ─────┘
└── Profil ▾ (§5)
```

**Décision de nommage** : la route actuelle `/l/[slug]` est conservée en **redirection 301** vers `/p/[slug]` — aucun lien déjà distribué ne doit casser.

### A2. L'interface de conversation (le cœur)

Modèle mental : **une conversation, pas un formulaire**. Structure :

- **Colonne de gauche (repliable)** : les conversations du client (« Ma salle de bain », « Devis portail »), un bouton « Nouvelle demande », et en bas son compte. Sur mobile : tiroir.
- **Zone centrale** : le fil. Messages du client à droite, réponses à gauche avec l'avatar/logo de l'**artisan** (jamais Presti). Support : texte, **photos du chantier**, documents (PDF de plan), **cartes riches** (un devis, une facture, un créneau de RDV).
- **Composeur** : champ multiligne, `Entrée` envoie, `Maj+Entrée` retour à la ligne, bouton pièce jointe, indicateur de frappe, état d'envoi par message (`en cours` → `envoyé` → `lu`), **et retry visible en cas d'échec** (voir §4.5, c'est le bug signalé).
- **Suggestions d'ouverture** : 3-4 amorces personnalisées par métier et générées depuis les prestations réelles de l'artisan (« Je veux refaire ma salle de bain », « J'ai une fuite », « Demander un devis pour un portail »).
- **Streaming** : la réponse de l'IA s'affiche au fil de l'eau (SSE), avec un état « réfléchit » explicite. Pas de spinner opaque de 8 secondes.
- **États d'attente humains** : quand l'artisan reprend la main, le client voit « Marc vous répond directement » — la bascule IA→humain est **visible et honnête**, jamais masquée.

**Contrainte de transparence, non négociable** : le client doit pouvoir savoir qu'il parle à une IA. Un bandeau discret mais permanent (« Assistant de l'entreprise — un humain prend le relais à tout moment »). Ne jamais laisser croire qu'un artisan répond en personne à 3 h du matin. C'est une question de confiance produit **et** de conformité (pratiques commerciales trompeuses).

### A3. Les cartes riches dans le fil

Ce qui fait la différence avec un chat générique — l'IA ne dit pas « je vous enverrai un devis », elle **pose l'objet dans la conversation** :

- **Carte Devis** : montant TTC, 3 lignes principales, bouton « Voir le devis complet » → `/p/[slug]/d/[id]`, boutons **Accepter / Demander une modification**. L'acceptation est horodatée et journalisée (valeur probante).
- **Carte Facture** : montant, échéance, bouton payer (si Stripe branché côté artisan).
- **Carte RDV** : créneaux proposés, un clic pour confirmer.
- **Carte Photos** : galerie des photos envoyées par le client, avec l'analyse de l'IA en dessous.
- **Carte Récapitulatif de besoin** : ce que l'IA a compris, **éditable par le client** avant transmission — c'est ce qui évite les devis à côté de la plaque.

### A4. Le panneau de contrôle IA (côté artisan)

Dans la console : **Ma plateforme → Intelligence**. Tous ces réglages sont **par artisan**, stockés dans une table `plateforme_config` (migration `0025_plateforme_config.sql`) :

| Réglage | Options | Défaut |
|---|---|---|
| Mode de réponse | `auto` · `assistée` (l'IA propose, l'artisan valide en 1 clic) · `manuelle` | `assistée` |
| Modèle | Standard / Pro / Expert (gating par plan, `lib/models.ts`) | selon plan |
| Plages horaires d'auto-réponse | ex. auto 24/7, ou auto seulement hors 8h-18h | 24/7 |
| Devis automatique | `jamais` · `brouillon` (créé, non envoyé) · `envoi auto sous seuil` (< X €) | `brouillon` |
| Facture automatique | `jamais` · `à l'acceptation du devis` | `jamais` |
| Ton | sobre / chaleureux / direct | chaleureux |
| Périmètre | ce que l'IA **peut** dire (délais, zone, disponibilités) et ce qu'elle **ne doit jamais** dire (prix ferme, engagement de date, garantie) | conservateur |
| Escalade | mots-clés qui coupent l'IA et alertent l'artisan (« urgence », « fuite », « dégât des eaux », « assurance ») | liste métier |
| Limite | nb max de messages IA par conversation avant reprise humaine | 8 |

**Règle de sécurité produit** : l'IA ne s'engage **jamais** sur un prix ferme sans devis validé par l'artisan. Elle donne une **fourchette explicitement présentée comme indicative**, sourcée sur la base de prix (§8), avec la mention « à confirmer après visite ».

### A5. Personnalisation extrême de la plateforme

Au-delà du thème partagé avec le site (§7) : **logo et favicon**, **couleur d'accent**, **image ou dégradé de fond**, **avatar de l'assistant** (photo de l'artisan ou logo), **nom de l'assistant** (« Marc » ou « L'atelier »), **message d'accueil**, **amorces de conversation**, **CGU/politique de confidentialité de l'artisan** (générées et éditables), **langue** (FR par défaut, préparer EN), **mode clair/sombre suivant l'appareil du visiteur ou forcé**, **densité** (confortable/compacte), et un **sous-domaine ou domaine personnalisé** (`contact.entreprise-martin.fr`).

Tout est prévisualisé en direct dans l'éditeur, dans un cadre desktop/mobile commutable.

---

## §4. CHANTIER B — La messagerie de la console : dé-automatiser et connecter

Benj a été clair : dans la console Presti, **Messages n'est pas l'endroit de l'IA**. C'est la **boîte de réception unifiée** de l'artisan. L'IA vit dans la plateforme (§3).

**B1. Retirer l'automatique de `/messages`.** Les réglages de réponse auto et de modèle migrent vers **Ma plateforme → Intelligence**. `/messages` conserve : lire, répondre à la main, et une **aide à la rédaction explicitement déclenchée** (bouton « Proposer une réponse » — jamais d'envoi automatique).

**B2. Connecter ses canaux.** Nouvelle page **Messages → Canaux** :
- **Email** : OAuth Gmail (Google API, scope `gmail.readonly` + `gmail.send`) et Microsoft/Outlook (Graph). Repli universel : **IMAP/SMTP** (la dépendance `imapflow` est déjà installée). Les identifiants sont chiffrés au repos (`pgsodium` ou chiffrement applicatif AES-GCM avec clé en variable d'env — **jamais en clair en base**).
- **WhatsApp Business** (Cloud API Meta), **Facebook Messenger / Instagram** (Meta Graph), **SMS** (Twilio ou Brevo).
- **Formulaire de la plateforme** (déjà là) et **appels manqués** (plus tard).

Chaque canal alimente la même table `messages` avec `canal`, `externe_id`, `thread_externe_id`. Un **fil = un client**, tous canaux confondus.

**B3. Du message au document.** Dans n'importe quel fil : bouton **« Créer un devis »** → l'éditeur s'ouvre pré-rempli avec le contexte du fil (l'IA propose les lignes, l'artisan valide) → **« Envoyer »** répond dans le fil d'origine, sur le canal d'origine. Idem **« Créer la facture »** depuis un devis accepté.

**B4. Ce qui reste automatique (et doit le rester)** : les **relances** programmées (`api/cron/relances`), parce que ce sont des envois que l'artisan a explicitement armés, pas des réponses spontanées.

**B5. 🔴 BUG À CORRIGER — l'envoi de l'artisan ne part pas.** Symptôme rapporté : quand c'est l'artisan qui écrit, le message « ne s'en va pas ». Diagnostic à mener méthodiquement dans `app/api/messages/route.ts`, `app/messages/page.tsx` et `app/api/conversation/route.ts` :
- vérifier le champ `sens` (`in`/`out`) : est-il correctement positionné quand l'auteur est l'artisan et non le prospect ?
- vérifier que l'insertion passe la RLS (l'artisan écrit dans une conversation dont il est propriétaire) ;
- vérifier l'état optimiste côté client : le message s'affiche-t-il puis disparaît au refetch (signe d'un insert silencieusement rejeté) ?
- vérifier que la réponse est bien **routée vers le canal du prospect** (email/plateforme) et pas seulement stockée.
**Livrable** : un test end-to-end `scripts/messages-e2e.mjs` qui écrit dans les deux sens et vérifie la persistance **et** la remise. Le bug n'est pas « corrigé » tant que ce test n'est pas vert.

---

## §5. CHANTIER C — Profil, paramètres et comptes (modèle Claude)

**C1. Le menu de profil.** En bas de la sidebar (`app/AppShell.tsx`) : avatar + nom → menu déroulant, exactement dans l'esprit demandé :

```
┌──────────────────────────────┐
│ Benjamin Filiot              │
│ benjaminfiliot@gmail.com     │
│ Plan Signature · 412 crédits │
├──────────────────────────────┤
│ ⚙  Paramètres                │
│ 👤 Mon profil                 │
│ 💳 Abonnement & facturation   │
│ 🌐 Mon site                   │
│ 💬 Ma plateforme              │
│ 🎨 Apparence                  │
│ 🔒 Sécurité                   │
│ 📄 Mentions légales & assurance│
├──────────────────────────────┤
│ ↩  Se déconnecter            │
└──────────────────────────────┘
```

**C2. Une vraie page Paramètres** (`/parametres`, avec onglets, remplaçant le `profil/page.tsx` monolithique de 25 ko) :
`Profil` · `Entreprise & légal` (SIRET, assurance, TVA, IBAN) · `Abonnement` (plan, crédits consommés, historique, changer/annuler via portail Stripe) · `Site` · `Plateforme` · `Canaux` · `Apparence` · `Sécurité` (mot de passe, sessions actives, 2FA) · `Données & confidentialité` (export, suppressions).

**C3. 🔴 Suppression granulaire — la demande centrale de Benj.** Aujourd'hui `api/account/delete` est probablement tout-ou-rien. Cible : **chaque brique se désactive, se réinitialise ou se supprime indépendamment**, sans jamais toucher au compte Presti.

| Action | Effet | Réversible |
|---|---|---|
| Dépublier le site | `site_active = false` — le site répond 404, tout est conservé | oui, 1 clic |
| Réinitialiser le site | efface `site_contenu`, `site_layout`, thème → retour au défaut | non (mais versions gardées, §D3 v3) |
| Supprimer le site | efface contenu + images du bucket ; **le compte Presti reste** | non, confirmation par saisie du nom |
| Désactiver la plateforme | `plateforme_active = false` — le lien affiche un message poli | oui |
| Supprimer la plateforme | efface la config ; **conversations conservées** (obligation comptable/preuve) ou effacées au choix explicite | non |
| Déconnecter un canal | révoque le token OAuth, garde l'historique | oui |
| Supprimer un client / une conversation | anonymisation RGPD (droit à l'effacement) | non |
| Supprimer le compte Presti | tout, avec **délai de grâce de 30 jours** et export préalable proposé | pendant 30 j |

**Règles transverses** : toute suppression est précédée d'un **récapitulatif de ce qui va disparaître** et d'une **confirmation par saisie** ; toute suppression déclenche un **export ZIP** proposé (JSON + PDF) ; les documents à valeur légale (**devis envoyés, factures émises**) ne sont **jamais** supprimables — ils sont archivés (obligation de conservation, §10) et l'interface l'explique clairement au lieu de refuser sèchement.

**C4. Tout est modifiable.** Aucun champ du profil, du site ou de la plateforme ne doit être en lecture seule après création — y compris le `slug` (avec redirection 301 depuis l'ancien, et avertissement sur les liens déjà distribués).

---

## §6. CHANTIER D — Comptes clients sur la plateforme

Les clients des artisans (les particuliers) ont leur propre compte, **totalement séparé** des comptes artisans.

**D1. Modèle.** Nouvelle table `clients_plateforme` (migration `0026_clients_plateforme.sql`) : `id, artisan_id, email, nom, tel, adresse_chantier, created_at, derniere_connexion, supprime_le`. **Scopée par artisan** : le même particulier chez deux artisans = deux comptes distincts, aucune donnée croisée. RLS stricte.

**D2. Authentification sans friction.** Le bon choix pour ce public : **lien magique par email** (Supabase `signInWithOtp`) ou **code à 6 chiffres par SMS**. Pas de mot de passe à retenir. Option « continuer sans compte » conservée : une conversation anonyme reste possible et se rattache au compte si le client le crée ensuite (le token de conversation en `localStorage` existe déjà — le réutiliser proprement).

**D3. Espace client** (`/p/[slug]/compte`) : ses conversations, ses devis (avec statut), ses factures, ses documents, ses informations (**modifiables**), et **suppression de son compte** — anonymisation immédiate des données personnelles, conservation des seules données comptables obligatoires, message clair sur ce qui est conservé et pourquoi.

**D4. Sécurité (cf. vidéos §16).** Sessions courtes, rotation des refresh tokens, **invalidation réelle à la déconnexion** (le token doit être révoqué côté serveur, pas seulement effacé du navigateur), rate limiting sur l'envoi de liens magiques, jamais de token en `localStorage` pour un cookie de session (préférer un cookie `httpOnly` + `SameSite=Lax` + `Secure`), énumération d'emails impossible (réponse identique que le compte existe ou non).

---

## §7. CHANTIER E — Le site vitrine : personnalisation et qualité au niveau supérieur

### E1. Personnalisation « extrêmement poussée »

Le thème (v3) reste le point d'entrée simple. Au-dessus, un **mode avancé** dépliable, qui expose sans jargon :

- **Typographie** : 8 couples de polices proposés (affichage + texte), taille de base, échelle (compacte/normale/ample), interlettrage des titres.
- **Couleurs** : accent + **couleur secondaire** + fond, avec le garde-fou de contraste automatique (`lib/contrast.ts`) et un aperçu du résultat AA/AAA.
- **Formes** : rayon des angles (0 → 24 px), épaisseur des filets, style de boutons (plein / contour / souligné).
- **Rythme** : hauteur des sections, largeur maximale du contenu, densité.
- **Texture** : aucune / grain photo / papier / bruit fin, avec intensité.
- **Composition par section** : chaque section a **2 à 4 variantes** (hero centré / hero plein-cadre / hero côte à côte ; galerie mosaïque / plein écran / carrousel ; prestations en liste / cartes / accordéon…). C'est ce qui rend deux sites réellement différents.
- **Ordre et présence** : réordonnancement, activation/désactivation, duplication d'une section.
- **Intensité d'animation** : `aucune` / `sobre` / `cinématique` — un curseur unique qui pilote toute la motion.
- **Presets par métier** : 8 combinaisons préréglées (menuisier, plombier, électricien, maçon, peintre, carreleur, couvreur, paysagiste) que l'artisan applique en un clic puis ajuste. **C'est ça qui rend la personnalisation utilisable par quelqu'un qui n'a aucun goût déclaré.**

Le tout stocké dans `artisans.site_style` (jsonb versionné, migration `0027_site_style.sql`), avec **réinitialisation par section** et **retour à un preset**.

### E2. Animations — utiliser les skills disponibles

Le repo contient déjà `.claude/skills/animate`, `animate-expo`, `animation-vocabulary`, `improve-animations`, `review-animations`, `find-animation-opportunities`, `apple-design`, `emil-design-eng`. **Lis-les et applique-les** — ne réinvente pas un vocabulaire de motion.

Méthode : (1) `find-animation-opportunities` sur le site rendu pour repérer où le mouvement porte du sens ; (2) `animate` / `animation-vocabulary` pour choisir les courbes et les durées ; (3) `review-animations` en fin de chantier comme contrôle qualité. Principes à tenir : le mouvement **explique** (il montre une relation, une hiérarchie, une causalité), il ne décore pas ; durées 200-600 ms pour l'UI, jusqu'à 1,2 s pour les révélations éditoriales ; `prefers-reduced-motion` respecté partout ; aucune animation ne bloque la lecture du contenu.

Nouveaux gestes à livrer : **transition d'image partagée** entre galerie et lightbox (View Transitions API + repli), **révélation par masque** des titres de section, **compteurs** sur les chiffres réels (jamais inventés), **hover de matière** sur les cartes de prestation, **transition de page** douce entre site et plateforme (le passage doit être invisible).

### E3. Qualité d'image — « très élevée »

C'est autant un problème de **pipeline** que de **source**.

**Pipeline** (technique) : à l'upload, générer 5 tailles (400/800/1200/1600/2400 px) en **AVIF + WebP + JPEG de repli**, `sizes` exacts par emplacement, `priority` sur le seul LCP, `placeholder="blur"` avec blurDataURL généré, `object-position` réglable par image (recadrage intelligent — le visage/l'objet ne doit jamais être coupé), correction automatique douce (exposition/contraste/saturation via `sharp`), suppression des EXIF (dont la **géolocalisation** — un artisan qui publie la photo d'un chantier ne doit pas publier l'adresse du client).

**Source** (le vrai facteur) : la plupart des artisans envoient des photos de téléphone moyennes. Donc :
- **Guide de prise de vue intégré** : 6 conseils illustrés à l'upload (lumière du jour, cadrage, avant/après, plan large + détail, pas de fond encombré).
- **Contrôle qualité automatique** : détection de flou (variance du laplacien), de sous-exposition, de résolution insuffisante → l'interface prévient « cette photo sera floue en grand format, utilisez-la en vignette » **au lieu** de dégrader le site en silence.
- **Rôles d'image** : hero (paysage ≥ 2000 px), galerie, détail, portrait — l'éditeur affecte automatiquement selon les dimensions.
- **Repli digne** : si l'artisan n'a aucune photo exploitable, le thème bascule sur une composition **typographique** (pas d'image générique de banque d'images, jamais de fausse photo de chantier — cela relève de l'anti-fabrication).

⚠️ **Interdit** : générer par IA de fausses photos de réalisations. Un chantier montré doit être un chantier fait. Les images générées ne sont admises que pour des **fonds abstraits ou des textures** explicitement non figuratives.

### E4. Ce qui reste de la v3 à finir

Reprendre les jalons non terminés du prompt v3 : indexation conditionnelle + sitemap + JSON-LD complet, domaine personnalisé (API Vercel Domains), budgets de perf en CI, axe-core. Si la v3 les a livrés, les **vérifier** et passer.

---

## §8. CHANTIER F — Chiffrage sur des prix réels ⚠️ (lis attentivement, ta demande ne peut pas être exécutée telle quelle)

**Ce que Benj a demandé** : brancher les IA devis/factures/plateforme sur « les sites de grossistes les plus connus de France » pour que le chiffrage ne raconte pas n'importe quoi.

**Ce que la recherche établit** (vérifié, sources en fin de section) — et pourquoi il faut faire autrement :

1. **Aucun grand négoce français n'expose d'API publique de prix.** Ni Point.P/SGDB, ni Rexel, ni Sonepar, ni Legallais. Ce qui existe est fermé : PunchOut cXML/OCI (tunnel d'achat authentifié, compte par compte) et intégrations ERP bilatérales.
2. **Les prix ne sont pas publics.** Cedeo, Legallais, Sonepar : aucun prix sans connexion à un compte pro. Le négoce français fonctionne au **prix net négocié**, différent par client et par agence. Même un scraping parfait donnerait un prix tarif que **ne paie aucun de tes artisans** — donc un chiffrage faux, exactement le problème que tu veux éviter.
3. **Le scraping est juridiquement dangereux.** Droit sui generis du producteur de bases de données (art. L.342-1 CPI, dir. 96/9/CE). Jurisprudence directement transposable : CA Paris 2 février 2021 (leboncoin, 70 000 € de condamnation) et surtout **Cass. civ. 1re, 15 octobre 2025, n° 23-23.167** (La Centrale c/ leparking.fr) : l'extraction **répétée, systématique et substantielle** qui crée un service substitut est illicite. L'exception TDM ne sauve pas, car elle exige un **accès licite** (or les prix pro sont derrière un login) et tombe devant l'opt-out.

**Donc : on ne scrape pas les grossistes.** Voici l'architecture qui atteint ton objectif — un chiffrage crédible — légalement et avec de **meilleurs** prix.

### F1. Socle : une base de prix d'ouvrages sous licence

**Batiprix (groupe Le Moniteur)** est le seul acteur avec un **programme partenaire et une API REST documentée** (`batiprix.com/content/71-devenir-partenaire`, offre « Batiprix Data »). ~40 000 ouvrages, mise à jour mensuelle, déjà intégré par EBP, Sage Batigest, Graneet. Alternative : **BatiChiffrage** (Batiactu, 80 000+ ouvrages) — partenariats éditeurs existants mais pas d'API publiquement documentée.

Action : **demander le tarif de licence éditeur** aux deux (non public). En attendant, développer derrière une **interface d'abstraction** `lib/prix/` :

```ts
interface SourcePrix {
  id: 'batiprix' | 'artisan' | 'insee' | 'manuel'
  rechercher(q: string, metier: string): Promise<Poste[]>
  prix(ref: string, ctx: { departement?: string; date: Date }): Promise<Fourchette>
  fraicheur(): Date
}
```

Ainsi le jour où la licence arrive, on branche sans réécrire le moteur de devis.

### F2. Le vrai moat : les prix de l'artisan lui-même

Le prix pertinent n'est pas « le prix du marché », c'est **le prix négocié de cet artisan chez son fournisseur**. C'est ce qu'aucun concurrent ne peut deviner et ce que l'artisan possède déjà. Donc :

- **Import de ses tarifs fournisseurs**. Le format standard du secteur est **FAB-DIS** (fabdis.fr, 1 500+ fabricants et distributeurs, onglet `COMMERCE` = les tarifs ; kit de spécification 240 €/an). Voir aussi **Edoni** (quincaillerie/outillage) et **GS1 France**. Développer un import FAB-DIS + un import CSV générique tolérant.
- **Lecture de ses factures fournisseurs** : dépôt d'un PDF/photo → OCR + extraction structurée → alimente sa bibliothèque de prix. C'est l'usage le plus naturel pour un artisan (il reçoit ces factures de toute façon).
- **Apprentissage** : chaque prix validé dans un devis affine sa fourchette perso (le mécanisme existe déjà en germe dans `postes_types`).

### F3. Indexation officielle

**API BDM de l'INSEE** (`api.insee.fr/series/BDM/V1`, Licence Ouverte 2.0, gratuite, inscription sur `portail-api.insee.fr`, 30 appels/min) : index **BT01** (bâtiment tous corps d'état, série 001710986) et indices matériaux, pour **réactualiser** une base entre deux mises à jour. Ce sont des indices de révision, **pas** des prix — ne jamais les présenter comme tels.

### F4. Ce que l'IA a le droit de dire

Règle inscrite dans le prompt système du moteur de devis :
- tout prix affiché porte sa **source** (`Batiprix mars 2026`, `vos tarifs Rexel du 12/02`, `estimation`) et sa **date** ;
- en l'absence de source, l'IA affiche une **fourchette large explicitement estimative**, jamais un prix précis qui aurait l'air sourcé ;
- l'IA **ne cite jamais un nom de grossiste** pour un prix qu'elle n'a pas réellement obtenu de ce grossiste ;
- l'artisan reste maître : les prix proposés sont des **suggestions modifiables**, jamais imposées.

### F5. Plus tard (après traction)

Partenariats directs avec les négoces (PunchOut cXML/OCI — Foussier le documente publiquement), adhésion FAB-DIS, connecteurs ERP. C'est un chantier commercial autant que technique : à ouvrir quand Presti a des artisans à mettre dans la balance.

> **Sources** : [FAB-DIS](https://fabdis.fr/fr/kit/) · [Batiprix — devenir partenaire](https://www.batiprix.com/content/71-devenir-partenaire) · [Batiprix Data](https://www.batiprix.com/102-data) · [INSEE — catalogue des API](https://www.insee.fr/fr/information/8184146) · [INSEE — série BT01](https://www.insee.fr/fr/statistiques/serie/001710986) · [Foussier — PunchOut cXML/OCI](https://www.foussier.fr/punch-out-pour-synchroniser-votre-gestion-commande/pg1563) · [CMS — arrêt leboncoin (CA Paris 2 fév. 2021)](https://cms.law/fr/fra/news-information/arret-leboncoin-web-scraping-droit-sui-generis-sur-les-bases-de-donnees) · [Cass. 15 oct. 2025, La Centrale](https://www.deshoulieres-avocats.com/facebook-vs-fuckbook-condamnation-pour-contrefacon-et-concurrence-deloyale-5-2-2-2-2-2-2-2-2-3-2-2-3-2-6-2-4-2/) · [GS1 France / Edoni](https://www.gs1.fr/communique-presse/gs1-france-edoni-signent-accord-partenariat)

---

## §9. CHANTIER G — Inventaire & achats (nouvelle fonctionnalité)

Objectif de Benj : que l'artisan gère son stock **et** trouve le meilleur rapport qualité/prix pour ce qu'il doit acheter.

### G1. Modèle de données (migration `0028_inventaire.sql`)

```
materiaux        id, artisan_id, nom, marque, reference, categorie, unite,
                 code_barres, fournisseur_prefere, prix_dernier_ht, prix_moyen_ht,
                 photo_url, fiche_technique_url, notes
stock            materiau_id, lieu ('atelier'|'camion'|'chantier:<id>'), quantite,
                 seuil_alerte, maj_le
mouvements_stock id, materiau_id, type ('entree'|'sortie'|'inventaire'|'perte'),
                 quantite, chantier_id?, devis_id?, source ('manuel'|'facture'|'devis'),
                 cout_unitaire_ht, date, note
listes_achat     id, artisan_id, nom, statut, chantier_id?, cree_le
lignes_achat     liste_id, materiau_id?, designation_libre?, quantite, prix_cible_ht
fournisseurs     id, artisan_id, nom, type ('negoce'|'gsb'|'fabricant'), compte_client,
                 remise_moyenne_pct, delai_jours, notes
```

### G2. Fonctions

- **Saisie sans friction** : scan du **code-barres** avec l'appareil photo (`BarcodeDetector` natif + repli `zxing-js`), ou photo de la facture fournisseur → OCR → lignes proposées → validation. Un artisan ne saisira jamais son stock au clavier ; c'est la seule raison pour laquelle les logiciels d'inventaire échouent chez eux.
- **Décrément automatique** : quand un devis est accepté, les matériaux prévus sont réservés ; à la clôture du chantier, ils sortent du stock. Toujours **avec confirmation**, jamais en silence.
- **Alertes de seuil** : « il te reste 3 coudes cuivre 16, tu en as besoin de 12 sur le chantier Dupont jeudi ».
- **Liste d'achat intelligente** : agrège les besoins de tous les chantiers de la semaine, déduit le stock, propose une liste par fournisseur.
- **Comparaison qualité/prix** — cœur de la demande de Benj, **dans le cadre légal de §8** :
  - comparer d'abord **les prix réels de l'artisan** (ses tarifs importés, ses factures passées) entre ses propres fournisseurs. C'est la comparaison la plus utile et la seule parfaitement légitime : ce sont ses données.
  - compléter par la base de prix sous licence (Batiprix) pour les références qu'il n'a jamais achetées.
  - proposer des **équivalences** (même fonction, autre marque) avec les critères qui comptent pour un artisan : disponibilité, délai, garantie, compatibilité — pas seulement le prix le plus bas.
  - afficher pour chaque prix : **source, date, et niveau de confiance**. Jamais un prix sans provenance.
- **Historique et coût de revient** : par chantier, matériaux consommés vs devisés → marge réelle. C'est l'information que presque aucun artisan n'a et qui justifie à elle seule l'abonnement.

### G3. Positionnement commercial

L'Inventaire est une fonctionnalité **Studio et Signature**. Il consomme des crédits uniquement sur les actions IA (OCR de facture, recherche d'équivalence), jamais sur la consultation.

---

## §10. CHANTIER H — Facturation électronique (conformité 2026-2027)

⚠️ **La réforme a démarré le 1er septembre 2026.** État du droit vérifié (sources en fin de section) :

| Échéance | Obligation |
|---|---|
| **01/09/2026** (fait) | **Réception** obligatoire pour toutes les entreprises assujetties — **y compris micro-entreprises en franchise en base** |
| **01/09/2026** | Émission + e-reporting pour grandes entreprises et ETI |
| **01/09/2027** | **Émission + e-reporting pour PME, TPE et micro-entreprises** ← **la cible de Presti** |

**Architecture.** Le vocabulaire officiel est désormais **PA (plateforme agréée)**, et le **PPF ne propose plus de dépôt gratuit** : toute facture transite par une PA privée. Trois statuts : PA immatriculée · **OD / « solution compatible »** (le statut de Presti) · entreprise cliente.

**Décision structurante : Presti ne devient PAS une PA.** L'immatriculation exige ISO/IEC 27001, hébergement SecNumCloud, audit annuel indépendant, tests d'interopérabilité — plusieurs centaines de k€ sur 18-24 mois. Presti se positionne en **OD raccordé à une ou deux PA** par leur API (norme AFNOR **XP Z12-013**), et laisse l'artisan choisir sa PA (ou lui en revend une en marque blanche). Liste officielle des PA : `impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees`.

**À implémenter maintenant, par ordre de priorité :**

1. **Données** : SIREN du client (obligatoire, contrôle de clé), pays des deux parties, **catégorie d'opération** (biens / services / **mixte** — un artisan facture presque toujours du mixte), option TVA sur les débits, **adresse de chantier structurée** distincte de l'adresse de facturation, numérotation séquentielle continue documentée (déjà en place via `next_numero`), motif d'exonération **codifié** (codes VATEX de l'EN 16931), devise, bases HT par taux.
2. **Mention de franchise paramétrable, pas en dur.** L'ordonnance n° 2025-1247 du 17/12/2025 a recodifié la TVA du CGI vers le **CIBS** (franchise = art. L. 223-1 et s.), en vigueur au 01/09/2026, avec **tolérance BOFiP jusqu'au 31/12/2027** pour les anciennes références CGI. Donc : champ paramétrable avec bascule par date, jamais une chaîne codée en dur.
3. **Génération Factur-X profil EN 16931** : PDF/A-3 (validation VeraPDF) + XML CII attaché sous le nom réservé `factur-x.xml`, relationship `Alternative`, métadonnées XMP. Validation contre le schéma **et** les règles Schematron EN 16931 + CIUS France avant émission. Dernière version : **Factur-X 1.09.2 (04/08/2026)**.
4. **Cycle de vie** : machine à états persistée conforme à **XP Z12-012** (déposée, reçue, mise à disposition, refusée avec **motif codifié**, encaissée), statuts reçus par webhook de la PA et affichés à l'artisan.
5. **e-reporting B2C** — le cas majoritaire de l'artisan : transmettre le **CA par jour ventilé par taux de TVA**, sans aucune donnée personnelle du client. Périodicité **bimestrielle** pour la franchise en base. À produire pour le 01/09/2027, en production **au printemps 2027** pour laisser une saison de test.
6. **Archivage 10 ans.** ⚠️ La loi n° 2026-534 du 25/06/2026 (art. 36) a porté la conservation de l'art. L. 102 B du LPF de **6 à 10 ans** pour les documents dont le délai expire après le 01/01/2027 — factures, statuts, journaux, métadonnées. Stockage immuable, empreinte SHA-256 + horodatage, journal d'accès, restitution lisible sur 10 ans. **Ne pas compter sur la PA pour l'archivage probatoire** : vérifier son contrat.
7. **Piste d'audit fiable** : chaînage devis → acceptation horodatée → facture → encaissement, journal d'événements non modifiable, **interdiction de modifier ou supprimer une facture émise** (avoir obligatoire) — ce qui explique la règle §C3.

**Message à afficher aux artisans** (rassurant et exact) : *« Vos factures aux particuliers ne changent pas. Ce qui change, c'est ce que votre logiciel transmet à l'administration — et Presti s'en charge. »*

> **Sources** : [economie.gouv.fr — facturation électronique](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises) · [DGFiP — communiqué 01/09/2026](https://presse.economie.gouv.fr/la-facturation-demarre-aujourdhui-priorite-a-laccompagnement-des-entreprises/) · [fiche OD](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiches_reforme/fiche-od.pdf) · [spécifications externes B2B](https://www.impots.gouv.fr/specifications-externes-b2b) · [FNFE-MPE — Factur-X](https://fnfe-mpe.org/factur-x/) · [e-reporting transactions](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiches_reforme/fiche-e-reporting_transactions.pdf) · [ordonnance 2025-1247 (CIBS)](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053091491) · [BOFiP — dispositions transitoires](https://bofip.impots.gouv.fr/bofip/14901-PGP.html/identifiant=BOI-RES-TVA-000253-20260218) · [L. 102 B LPF](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041471233/)

---

## §11 à §15. CHANTIERS TRANSVERSES

### §11. Sécurité (dérivé des vidéos de référence, cf. §16)

- **Sessions** : cookies `httpOnly` + `Secure` + `SameSite`, durée courte, refresh rotatif, **révocation serveur réelle à la déconnexion** (tester : un token copié avant déconnexion doit être refusé après).
- **Secrets** : aucun secret côté client, aucun secret en dur dans le repo. Audit `git log` pour vérifier qu'aucune clé n'a été committée puis retirée (elle reste dans l'historique — rotation obligatoire si trouvée).
- **RLS** : revue table par table, y compris les nouvelles (`clients_plateforme`, `materiaux`, `stock`, `plateforme_config`). Test automatisé : un artisan A ne doit jamais lire une ligne de l'artisan B.
- **Rate limiting** : sur `/api/leads`, `/api/conversation`, l'envoi de liens magiques, la génération IA. Par IP **et** par ressource.
- **Validation d'entrée** : schéma (Zod ou équivalent) sur **chaque** route API. Aujourd'hui plusieurs routes font confiance au corps de requête.
- **Uploads** : type MIME vérifié côté serveur (pas seulement l'extension), taille plafonnée, EXIF strippé, noms aléatoires, bucket sans exécution.
- **Injection de prompt** : les messages des prospects arrivent dans un prompt IA. Isoler le contenu utilisateur, ne jamais lui donner autorité sur les instructions système, et interdire à l'IA d'exposer sa configuration ou les données d'autres clients.
- **Headers** : CSP stricte (un script de smoke CSP existe déjà : `scripts/csp-smoke.mjs`), HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
- **Journalisation** : tentatives d'authentification, accès aux documents, suppressions. Sans jamais logger de secret ni de donnée personnelle inutile.

### §12. Indexation et visibilité

Reprendre et vérifier : `index/follow` conditionnel, canonical, sitemap dynamique des sites publiés, `robots.txt`, JSON-LD `LocalBusiness` complet + `FAQPage` + `BreadcrumbList`, Open Graph avec image générée par site, 404 personnalisée par site, liens internes cohérents, **et surtout : rendu serveur** — le contenu doit être dans le HTML initial, pas injecté par JavaScript (c'est le sujet exact de la vidéo « ton site est invisible »). Vérification : `curl -s <url> | grep` sur le texte du hero.

### §13. Performance

Budgets (échec du build si dépassés) : JS+CSS de `/site/[slug]` < 180 Ko gzip · LCP mobile < 2,5 s · CLS < 0,05 · INP < 200 ms · 0 long task > 50 ms au scroll. Lighthouse mobile en CI sur un slug de démo.

### §14. Accessibilité

axe-core dans Playwright, 0 violation critique. Contraste AA garanti par calcul, navigation clavier complète (y compris le chat et l'éditeur), `aria-live` sur le fil de conversation, focus visible, cibles tactiles ≥ 44 px, formulaires étiquetés.

### §15. Tests

Étendre `scripts/smoke-test.mjs` et ajouter : `messages-e2e.mjs` (§B5), `plateforme-e2e.mjs` (conversation complète prospect → devis → acceptation), `comptes-e2e.mjs` (création/modification/suppression, artisan et client), `rls-e2e.mjs` (isolation entre artisans), `a11y.mjs`, `perf.mjs`. **Tous doivent nettoyer leurs données.**

---

## §16. L'AUDIT FINAL — grille complète

À exécuter **quand tous les chantiers sont livrés**, par des **sous-agents indépendants** (un par domaine, qui n'ont pas écrit le code audité), avec production d'un rapport `plans/audit-v4.md` : chaque point coché ✅/⚠️/❌, avec la preuve (URL, capture, sortie de commande) et, pour chaque ❌, un correctif chiffré.

### 16.1 — Checklist « 20 points avant lancement » (photo fournie par Benj)

À vérifier sur **chacune des trois surfaces** : landing Presti, site vitrine d'un artisan, plateforme.

| # | Point | Vérification attendue |
|---|---|---|
| 1 | Politique de confidentialité | présente, à jour, couvre les nouveaux traitements (photos, canaux, comptes clients) |
| 2 | CGU / mentions légales | présentes sur les 3 surfaces ; celles de l'artisan générées et éditables |
| 3 | CTA clair | un CTA principal évident par écran, au-dessus de la ligne de flottaison |
| 4 | FAQ | présente + `FAQPage` JSON-LD valide |
| 5 | robots.txt | correct, n'interdit pas ce qui doit être indexé |
| 6 | sitemap.xml | dynamique, à jour, soumis |
| 7 | 404 personnalisée | sur les 3 surfaces, aux couleurs de la marque concernée |
| 8 | alt text | sur **toutes** les images, généré par l'IA et éditable |
| 9 | analytics | en place, **avec consentement** |
| 10 | meta titles | uniques, < 60 car., par page et par site |
| 11 | meta descriptions | uniques, 150-160 car. |
| 12 | partage social | OG + Twitter card + image générée par site |
| 13 | favicon | par site (logo de l'artisan), toutes tailles |
| 14 | URLs canoniques | correctes, y compris avec domaine personnalisé |
| 15 | consentement cookies | bandeau conforme CNIL (refus aussi simple qu'accepter), pas de dépôt avant consentement |
| 16 | version mobile | testée sur 390 px et 360 px, pas de scroll horizontal |
| 17 | accessibilité | axe-core 0 critique, AA |
| 18 | formulaires testés | tous les parcours, y compris erreurs et double soumission |
| 19 | liens cassés | crawl complet, 0 lien mort |
| 20 | performance | budgets §13 respectés |

### 16.2 — Sécurité des sessions (vidéo 1 — « où est stocké le token, combien de temps valide, vraiment invalidé ? »)

- Où le token est-il stocké ? (cible : cookie `httpOnly`, pas `localStorage`)
- Quelle est sa durée de validité ? Est-elle courte ?
- **La déconnexion invalide-t-elle réellement le token côté serveur ?** Test à faire : copier le token, se déconnecter, rejouer une requête → doit être refusée.
- Les mots de passe sont-ils hachés avec un algorithme prévu pour (bcrypt/argon2 — c'est Supabase, à confirmer), jamais un hash générique ?
- Rotation des refresh tokens, révocation de toutes les sessions depuis le profil, alerte sur connexion inhabituelle.

### 16.3 — « Vibe-coded app hacked in 3 hours » (vidéo 2)

Les cinq classiques, à vérifier explicitement : (1) clés API exposées côté client ou dans le bundle ; (2) base de données publiquement accessible / RLS absente ou permissive ; (3) secrets en dur dans le code ou l'historique git ; (4) authentification faible (pas de rate limit, énumération d'emails, mots de passe faibles acceptés) ; (5) absence de limitation de débit sur les endpoints coûteux (IA, upload, email). Passer chaque route de `app/api/**` au crible et produire un tableau route par route.

### 16.4 — « Ton site est invisible » (vidéo 3)

Le contenu est-il dans le HTML rendu côté serveur ? Le bot Google voit-il les titres, le texte, les liens sans exécuter de JS ? Vérification par `curl` **et** par l'outil d'inspection d'URL de la Search Console. Pas de prerender tiers nécessaire si le SSR est correct — et il doit l'être, on est en App Router.

### 16.5 — Audit métier

Conformité devis/factures (mentions obligatoires, numérotation, assurance décennale), anti-fabrication (aucune donnée inventée sur un artisan), white-label (0 occurrence de « presti » dans le HTML servi des sites clients), RGPD (registre des traitements, durées de conservation, droit d'accès/effacement effectif, sous-traitants listés), et cohérence des offres (ce qui est vendu = ce qui est livré, gating serveur vérifié).

---

## §17. ⚡ À FAIRE EN TOUT PREMIER — restaurer l'accès fondateur

Benj a supprimé son compte. Procédure, dans cet ordre :

1. Vérifier dans Supabase (Auth + table `artisans`) si `benjaminfiliot@gmail.com` existe encore, et dans quel état (supprimé, orphelin, désactivé).
2. Écrire `scripts/restore-founder.mjs` (idempotent) qui, avec la `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` : crée l'utilisateur s'il n'existe pas (`auth.admin.createUser`, email confirmé), ou réinitialise son mot de passe s'il existe ; puis crée/met à jour la ligne `artisans` avec `is_founder = true`, `plan = 'business'`, le slug historique `benjamin-filiot`, et les crédits à leur valeur fondateur.
3. **Le mot de passe est passé en variable d'environnement au moment de l'exécution** (`FOUNDER_PW=... node scripts/restore-founder.mjs`). Il n'est **jamais** écrit dans le repo, ni dans un fichier, ni dans le journal, ni dans un commit, ni dans cette conversation.
4. Vérifier la connexion en direct sur `qg.prestiapp.fr`, confirmer l'accès fondateur (bypass crédits, `/controle` accessible), puis logguer « accès fondateur restauré » **sans le mot de passe**.
5. Faire de même pour `alexandremesroua@gmail.com` si son compte est également absent.

> Note pour Benj : je ne peux pas « te redonner » un mot de passe existant — un mot de passe correctement stocké est haché et irrécupérable par conception (c'est exactement le sujet de ta vidéo 1). Le script en définit un **nouveau**, que tu choisis. Change-le après la première connexion.

---

## §18. ⚠️ DÉCISIONS À FAIRE TRANCHER PAR BENJ

À poser **en une seule fois**, avec une recommandation par point, puis à continuer sur tout ce qui n'en dépend pas :

1. **Prix réels** : on part sur une **licence Batiprix Data + import des tarifs de l'artisan** (§8) au lieu du branchement direct aux grossistes, qui est illégal et donnerait de faux prix ? *(Reco : oui, et je demande les tarifs de licence dès cette semaine.)*
2. **Domaine de la plateforme** : sous-domaine Presti (`contact-martin.prestiapp.fr`), ou domaine de l'artisan (`contact.martin-plomberie.fr`) réservé à Signature ? *(Reco : les deux, le second en Signature.)*
3. **Comptes clients** : lien magique par email seul, ou email + SMS ? *(Reco : email d'abord, SMS en Signature.)*
4. **Facturation électronique** : quelle PA vise-t-on pour le raccordement ? Il faut en choisir une dans la liste officielle et lire son API. *(Reco : en shortlister 3 et comparer le coût par facture.)*
5. **Inventaire** : Studio+Signature, ou Signature seulement ? *(Reco : Studio+, c'est un argument d'upsell depuis Essentiel.)*
6. **Ordre** : plateforme (§3) d'abord, ou site (§7) d'abord ? *(Reco : plateforme — c'est elle qui convertit, et c'est la demande la plus mal servie aujourd'hui.)*

---

## §19. ORDRE D'EXÉCUTION

| Bloc | Contenu | Sortie attendue |
|---|---|---|
| **B0** | §17 accès fondateur + §B5 bug d'envoi de message | connexion OK, test e2e vert |
| **B1** | §3 A1-A2 : routes `/p/[slug]`, interface de conversation, streaming | une conversation complète fonctionne en prod |
| **B2** | §3 A3-A4 : cartes riches + panneau de contrôle IA | un devis naît d'une conversation |
| **B3** | §6 comptes clients + §5 C3 suppression granulaire | parcours création/modif/suppression testés |
| **B4** | §5 C1-C2 menu profil + page Paramètres | navigation complète, 0 régression |
| **B5** | §4 messagerie console + connexion email | un email reçu apparaît dans `/messages` et la réponse part |
| **B6** | §7 personnalisation site + animations + images | M6 (deux sites non superposables) vérifié |
| **B7** | §8 socle prix (abstraction + INSEE + import artisan) | un devis affiche des prix sourcés et datés |
| **B8** | §9 inventaire | scan, stock, liste d'achat, coût de revient |
| **B9** | §10 facturation électronique (données + Factur-X) | une facture Factur-X valide Schematron |
| **B10** | §11-§15 sécurité, SEO, perf, a11y, tests | budgets tenus, 0 violation critique |
| **B11** | §16 **AUDIT FINAL** par sous-agents indépendants | `plans/audit-v4.md` complet |

Chaque bloc : journal de bord tenu (§0.1), build vert, déployé, vérifié en direct, données de test nettoyées, et **enchaînement immédiat** sur le suivant.

---

## §20. Format de réponse attendu à chaque étape

1. **Vérifié** — ce que j'ai lu/mesuré, pas ce que je suppose.
2. **Changé** — quoi, pourquoi, quel risque.
3. **Diff** — par fichier, commentaires en français dans le style du repo.
4. **Preuve** — build, codes HTTP, captures, mesures chiffrées.
5. **Journal** — la ligne `[jalon] — début → fin (durée) — statut` et le temps cumulé.
6. **Suivant** — l'étape enchaînée immédiatement, ou la décision qui bloque (et ce que je fais en attendant).
