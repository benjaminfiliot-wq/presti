# Journal — Sprint v5 (J-1 démo) — 2026-09-03 → 2026-09-04

> Prompt : `plans/004-sprint-j1-demo.md`. Format : `[bloc] titre — début → fin (durée) — statut`, cumul en fin d'entrée.
> Trois niveaux : **DÉMO** (vu demain soir), **TIENT** (ne doit pas casser), **APRÈS** (`plans/apres-demo.md`).
> Règle d'or : une fonctionnalité non finie n'apparaît pas (`lib/flags.ts`).

## [H0] Reconnaissance et cadrage — 21:20 → 21:40 (20 min) — ✅

- **Lu** : `plans/003…` (v4), `plans/journal-v4.md` (B0→B12, tout livré), `plans/audit-v4.md` (§3 ouverts, §5 couverture vidéos), Annexe A du prompt.
- **Contrainte de session, dite tout de suite** : Claude Code est ouvert sur `Documents/ofm`, pas sur `Documents/presti`. Conséquence : les 53 skills et 13 agents `presti-*` du repo **ne sont pas enregistrés** dans cette session — le prompt les suppose chargés. Ce que je fais : je **lis** chaque skill/agent depuis le disque au moment de l'utiliser et j'en applique le contenu ; les sous-agents reçoivent le fichier de l'agent comme brief. Fonctionnellement équivalent, mais c'est une lecture manuelle, pas un chargement automatique. Alternative si Benj préfère : rouvrir la session dans `presti`.
- **Inventaire réel** : 13 agents ✅, **53** skills (le prompt dit 55 — `writing-*` en compte 3, pas 5). Pas de `lib/flags.ts` → **créé**. Pas de `docs/`. Husky : à vérifier.
- **Verrous d'offre en dur** hors `lib/plans.ts` : voir grep ci-dessous — c'est le périmètre du §3.
- **Cube 3D** : 2 références (`site/[slug]/page.tsx:11` et `:212`) + CSP `cdnjs` dans `next.config.mjs:44`. Suppression triviale.
- **`lib/email.ts`** a déjà `replyTo` → §15 J1 est un branchement, pas une construction.
- **Réglages Supabase** : 2/3 posés (900 s ✅, mot de passe ✅), reste détection de rejeu — vérifié par l'effet ce soir.
- **Décisions §13** posées à Benj en une fois (AskUserQuestion). Je continue sur ce qui n'en dépend pas : §3 matrice, §10 H1 cube, §11 correctifs rapides, §15 J1.
- suivant : [H0-b] §13 décisions · [A] §3 matrice des offres.

**Cumul : 0 h 20**

## [H0-b] Décisions §13 — 21:40 → 21:45 (5 min) — ✅
- Grille des offres : **telle quelle**. Vidéo HyperFrames + 2FA : **après**. Compte démo : **menuisier**. Photos : « trouve s'en » → je les sourcerai sur une banque libre de droits (vraies photos de menuiserie, licence vérifiée, jamais générées) ; c'est un compte de **démo**, pas un artisan réel, la règle anti-fabrication ne s'y oppose pas tant que c'est dit.
- **Nouvelle demande de Benj, hors prompt** : les URL de la plateforme et du site ne doivent pas contenir « presti », et l'artisan doit pouvoir les modifier. → bloc [U] ci-dessous, ajouté au niveau DÉMO (c'est la barre d'adresse du téléphone pendant la démo).
- Trois sous-agents lancés en parallèle : SA1 `lib/aide.ts`, SA2 correctifs audit + email entreprise, SA3 fournisseurs par `curl`.

## [A] §3 Matrice des offres — 21:45 → 22:40 (55 min) — ✅ code, ⏳ prod
- `lib/plans.ts` refondu : `Capacite` (24), `PLANS[x].capacites` empilées (Essentiel ⊂ Studio ⊂ Signature), `peut(plan, cap)`, `offreMinimale()`, `messageVerrou()`, et la **`GRILLE`** rendue par la landing et /abonnement. **Une ligne sous drapeau baissé n'apparaît pas** : WhatsApp, réseaux, recherche IA, slides 3D, persona — vendus dans la grille cible, pas construits → cachés jusqu'à livraison. C'est la protection structurelle contre les « promesses de vente non tenues » de l'audit v4.
- `lib/models.ts` : les niveaux de modèle viennent de `PLANS[x].tiers` (plus de liste parallèle). Conséquence de la grille validée : **Pro dès Studio, Expert dès Signature** (avant : Pro dès Essentiel).
- Verrous serveur réécrits sur `peut()` : `/api/inventaire` (`inventaire.stock`), `/api/domain` (`site.domaine_perso`). Message uniforme « Disponible avec l'offre X. ».
- `app/Comparatif.tsx` (composant serveur) + `/abonnement` régénéré + landing : les 3 cartes viennent de `OFFRES`/`pointsForts()`, le tableau « qui a quoi » en dessous. Au passage, la carte Signature vendait encore « plusieurs métiers gérés » (défaut n° 14 de l'audit, pas entièrement corrigé) — disparu, puisque le texte n'est plus écrit à la main.
- `scripts/offres-e2e.mjs` : lit la matrice lui-même et vérifie 200/403 formule par formule sur les points d'entrée verrouillés.

## [H1] §10 Suppression du cube 3D — 22:40 → 22:45 (5 min) — ✅ code
- `SiteMatiere3D.tsx` supprimé, import et usage retirés, CSP : `cdnjs` retiré de `script-src` (c'était son seul usage). Le hero photo/typographique reprend.

## [U] URL sans « presti » + adresse modifiable — 22:45 → 23:30 (45 min) — ✅ code, ⏳ domaine
- `lib/urls.ts` : LE constructeur d'adresses. Quatre modes : domaine perso (Signature) › sous-domaine `<slug>.<neutre>` › chemin `<neutre>/<slug>` › repli `prestiapp.fr/…`. La plateforme est à `/demande`, les mentions à `/infos-legales`. Piloté par `NEXT_PUBLIC_DOMAINE_NEUTRE` (+ `_SOUSDOMAINES=1` quand le DNS joker est posé). Sans variable : tout marche comme avant.
- `middleware.ts` réécrit : réécriture des trois hôtes vers `/site/<slug>`, `/p/<slug>`, `/site/<slug>/infos-legales` ; matcher exclut `api`, `_next` et tout chemin avec un point.
- Pages publiques : canoniques/OG via `lib/urls`, **liens internes selon l'hôte servi** (`modeDepuisHote`) — sur le domaine de l'artisan, le bouton contact mène à `/demande`, jamais à `/p/<slug>` (sinon « presti » réapparaît au premier clic). PlatChat reçoit `infosHref`.
- **Adresse modifiable** : migration `0051` (`slugs_anciens[]` + trigger d'historique + RPC `artisan_par_ancien_slug` + **slug figé côté navigateur** — un `update` direct contournait la validation), `/api/account/slug` (validation, mots réservés, unicité **y compris contre les anciens slugs des autres** — sinon B récupère les cartes de visite de A), `app/AdresseEditor.tsx` dans /profil. Les deux pages publiques font un **308** depuis l'ancienne adresse.
- Console : /profil, /plateforme, /dashboard affichent l'adresse depuis `lib/urls`.
- ⚠️ **Dépend d'un achat que seul Benj peut faire** : un domaine neutre. Deux candidats probablement libres (aucun NS) : `votreartisan.fr`, `artisan-page.fr`. Pris : monartisan.fr, mon-artisan.fr, artisanpage.fr, pagepro.fr, atelierpage.fr, contactartisan.fr.

## [SA1] `lib/aide.ts` — livré (sous-agent) — ✅
- 15 articles, 68 info-bulles, chaque phrase sourcée `// source: fichier:ligne`. Trois choses volontairement absentes parce qu'inexistantes dans le code : recherche IA fournisseurs, canaux WhatsApp/réseaux, info-bulles sur /inventaire et /tarifs (aucun `<label>`).
- **Défaut produit trouvé en chemin** : les informations légales (SIRET, assurance, IBAN…) sont saisissables à **deux endroits avec deux enregistrements séparés** (`/parametres?onglet=legal` et le panneau « Vos informations » de `/devis/[id]`). À consolider dans le bloc §6.

## [SA3] Fournisseurs vérifiés par `curl` — livré (sous-agent) — ✅ `docs/fournisseurs.md`
- **3 ✅** : Castorama, Brico Dépôt, Tout Faire (prix en clair dans le HTML servi). Le minimum pour la démo, sans marge.
- ❌ bloqués par DataDome/Cloudflare : Point.P, Leroy Merlin, ManoMano, Bricoman, Cedeo. ⚠️ catalogue sans prix (compte requis) : Rexel, Gedimat, BigMat, Würth, Chausson, Legallais, Sonepar.
- Conséquence pour §8 F3 : la liste de départ proposée à l'artisan = les 3 ✅ ; les ⚠️ sont proposés avec la phrase « vous verrez le catalogue, pas vos tarifs ».

## [SA2] §11 correctifs rapides + §15 J1 email entreprise — livré (sous-agent) — ✅ code, ⏳ prod
- **Resend : vert** (domaine verified, DKIM/SPF/MX résolus). **DMARC absent** — pas d'API OVH dans l'environnement → ligne exacte pour Benj : TXT `_dmarc` = `v=DMARC1; p=quarantine; rua=mailto:contact@prestiapp.fr; adkim=r; aspf=r`.
- **Compteurs atomiques** (migration `0049` : table `limites` + `consommer_limite()` en `insert … on conflict … returning`, style `consume_credit`) sur : leads (6/IP/10 min, 8/artisan), conversation (6 msg/5 min), lien magique (5/IP, 3/email), **réinitialisation (3/email/heure, réponse identique même pour un email inconnu)**, report-error (60/IP/5 min). Fail-open journalisé tant que la fonction n'existe pas → **migration AVANT déploiement**.
- **Mentions obligatoires bloquantes** : `mentionsManquantesEmission()` (dénomination, forme, SIRET, adresse, assurance) → **422** à l'envoi d'un devis et à la création d'une facture, **avant** toute consommation de numéro ; le brouillon reste ; message qui dit quoi remplir et où. Médiateur/contact signalés mais non bloquants (sinon plus personne ne facture).
- **Reply-To** : audit des 17 `sendEmail` — les envois au nom d'un artisan avaient déjà `replyTo: artisan.email` ; deux manques corrigés (reset → `contact@prestiapp.fr`, lien magique → l'artisan). `notifierEntreprise()` : inscription (nouvelle route `/api/account/inscription`, dédoublonnée 1/24 h), paiement Stripe, résiliation, erreurs critiques plafonnées.
- **Canal entreprise** : `canalEntreprise()` lit `PRESTI_MAIL_IMAP_USER/PASS`, null si absentes ; `scripts/canal-entreprise.mjs` prêt (test IMAP réel + chiffrement AES-GCM + upsert `canaux` fondateur). Silencieux tant que la boîte OVH n'existe pas.
- Tests écrits, **à lancer après migration + déploiement** : `limites-e2e` (12 appels parallèles → exactement 6), `reset-plafond-e2e` (6 demandes → exactement 3 jetons), `mentions-bloquantes-e2e`.
- Signalé hors périmètre : `limite_messages` (plateformeConfig) reste non atomique ; les réponses depuis la console partent par Resend, pas par le SMTP OVH — « répondre depuis contact@ » serait un chantier à part.

## [H0-c] Réponses de Benj (23:35) — ✅
- **Pas de domaine neutre** : « je paye rien, ce sera aux artisans de connecter leur nom de domaine ». Le code des adresses neutres reste (dormant, sans variable) ; l'adresse sans « presti » passe par le **domaine perso** — aujourd'hui réservé à Signature dans la grille validée. ⚠️ Question posée à Benj : si tout artisan doit pouvoir brancher son domaine, `site.domaine_perso` doit descendre sur les trois offres. En attendant, la grille validée s'applique.
- Boîte OVH + variables IMAP : après le sprint.
- **Mot de passe Postgres : toujours refusé.** `.env.local` n'a pas été modifié depuis 07:30 ; Benj a dit « c'est mis » mais le fichier ne le montre pas. Migrations 0049/0050/0051 **en attente**, déploiement bloqué.
- Vague 2 (SA4 aide, SA5 IA, SA6 inventaire) coupée par la limite d'usage de la session à ~23:20, **relancée avec leur contexte** dès la remise à zéro.

## [G] §9 Poste de pilotage de la plateforme — 23:20 → 00:40 (1 h 20) — ✅ code
- **Constat de départ** : le mode « assistée » de `/plateforme` faisait taire l'assistant mais **ne préparait rien** — « rien ne part sans vous » était vrai, « l'assistant prépare, vous validez » ne l'était pas. Et l'artisan ne pouvait ni voir ni reprendre une conversation depuis « Ma plateforme ».
- **Migration `0050_pilotage.sql`** : `leads.prise_en_main` (+ `_le`), `messages.etat` (`proposition` / `rejete` / null) + `messages.modele`, policy UPDATE restreinte à l'artisan avec **trigger qui fige le contenu** (seul `etat` est modifiable depuis le navigateur), table `regles_automatisation` (RLS), `devis.source` (`manuel`/`outil`/`regle`) + **index uniques partiels** = jamais deux devis automatiques pour une conversation, même en rafale.
- **`lib/devisAuto.ts`** : `creerDevisBrouillonPourLead()` — LA fonction, extraite de `/api/devis/auto` ; appelée par le bouton, par l'outil de l'assistant (SA5) et par les règles. Idempotente pour les origines automatiques.
- **`lib/factureDepuisDevis.ts`** : `creerFacture()` — extraite de `/api/factures` (mentions bloquantes → numéro → lignes → scellement), pour que la **facture d'acompte automatique** passe par le même chemin que la facture manuelle.
- **`lib/regles.ts`** (décision pure : 4 préréglages, `decider()`, `phraseRegle()`) + **`lib/reglesServeur.ts`** (`declencherRegles()` après chaque réponse de l'assistant ; `acompteApresAcceptation()`). « Tout auto » n'envoie jamais sans les mentions obligatoires.
- **Routes** : stream → prise de main (l'assistant se tait, `raison:'humain'`), mode assisté → **proposition** écrite avec `etat='proposition'` (invisible du client, crédit consommé, artisan notifié), déclenchement des règles après la réponse ; `/api/conversation` GET rend `prise_en_main`, l'historique client **exclut** propositions et rejets ; `/api/messages` : `valider` (le message devient réel à l'instant de la validation, texte retouchable, email si le prospect en a un), `rejeter`, `prise_en_main`, `escalader` ; `/api/conversation/devis` : à l'acceptation, facture d'acompte si la règle le dit.
- **Interface** : `/plateforme` = trois volets (Conversations · Automatisations · Réglages). `app/plateforme/Conversations.tsx` = la boîte extraite et enrichie (état par conversation : Assistant / Attend votre validation / Vous avez la main / Clos ; filtres ; carte de proposition Valider/Rejeter ; « Je prends la main » ; Créer un devis · Proposer un RDV (aucun créneau inventé) · Escalader). `/messages` rend le même composant. `Automatisations.tsx` : 4 préréglages, la **phrase qui se réécrit** sous les yeux de l'artisan, verrous d'offre sur Pro/Expert/auto. `Reglages.tsx` : l'ancien formulaire.
- PlatChat : « X vous répond directement » vient désormais du serveur (`prise_en_main`), plus seulement d'une heuristique.
- typecheck 0 · **build cassé par une compilation parallèle d'un sous-agent** (`.next` partagé) → `next build` interdit aux sous-agents, je rebâtis seul.

## [H2] §10 Slides 3D de réalisations — 01:05 → 01:45 (40 min) — ✅ code, ⏳ vérif visuelle
- Nouvelle section `slides` (Signature, `lib/siteLayout.ts`) placée **avant les mots géants** (le dernier panneau se dépose sur eux) ; dans la composition par défaut mais **ne rend rien sans sélection** → un site existant reste identique.
- `SiteSlides.tsx` : un panneau par réalisation, plein écran, **épinglé au scroll** (GSAP ScrollTrigger `scrub`, importé en différé), mise en scène **CSS 3D** (perspective + preserve-3d) — pas de WebGL. Trois styles : Profondeur (arrivée du fond, scale .86→1, tilt 7° qui se redresse), Feuilleté (recouvrement), Cinéma (fondu + travelling). Titre révélé par masque, compteur. **Repli sans JS / mobile / reduced-motion / saveData : panneaux empilés en flux normal**, rien de cassé.
- Éditeur dans « Ma page » : cases à cocher sur les réalisations (3 à 8), style, **ligne de fait par photo** (lieu, matériau, durée) — anti-fabrication : affichée seulement si saisie. Options conservées dans `site_layout.sections[].opts` (le composeur les perdait à la sauvegarde : corrigé).
- `scripts/slides-e2e.mjs` : inchangé sans sélection, 3 panneaux, armement, opacités aux 3 positions de scroll, compteur, contact atteignable après, replis reduced-motion + mobile (aucun scroll horizontal), captures à regarder.
- **Photos du compte de démo** (« trouve s'en ») : Wikimedia Commons passé au crible (plein texte puis catégories, 200 candidats libres) — **rien d'exploitable** pour un menuisier : bâtiments d'une vraie entreprise avec son nom (inutilisable), pièces de musée, cuisines quelconques. Je n'ai pas de clé Pexels/Unsplash et je ne crée pas de compte. → **Benj fournit 3 à 8 vraies photos** (les siennes, un artisan d'accord, ou Unsplash qu'il télécharge lui-même) ; le mécanisme est prêt pour n'importe lesquelles.

- **Vérification, et une découverte qui vaut pour tout le sprint** : en mode dev, la CSP bloquait `unsafe-eval` dont Next a besoin pour ses source maps → **aucun JavaScript client ne s'exécutait en local** (pages jamais hydratées — le test disait « la section ne s'arme pas », et SiteMotion non plus). Corrigé : `unsafe-eval` en développement seulement. Les vérifications locales passent désormais en **mode production sur un dossier de build isolé** (`PRESTI_DIST=.next-prod`, port 3006), ce qui règle aussi les collisions de `.next` avec les sous-agents.
- Deux défauts trouvés par les captures, pas par les assertions : le panneau suivant devenait visible dès la position 0 (`set` posé exactement à t → exécuté au chargement) ; le fond opaque du panneau entrant masquait le sortant pendant la transition. Corrigés. **`slides-e2e` 14/14** en production locale. Drapeau `siteSlides3d` levé → la ligne « Signature · cinématique, slides 3D » apparaît dans la grille.

## [C] §5 Démo de la landing — 02:10 → 02:50 (40 min) — ✅ composant, ⏳ captures 3-5
- `FeatureShowcase.tsx` (10 onglets, maquettes dessinées, texte daté) **supprimé**. `app/DemoSequence.tsx` : UN scénario, « Une demande arrive », 5 scènes (22 h 14 → 7 h 52 → le site), cadre téléphone/ordinateur, défilement auto 4,8 s avec barre de progression, pause au survol, points et flèches, clavier, reduced-motion = pas de défilement. Sous-titre : « Captures du produit réel — rien n'est dessiné. »
- `scripts/demo-captures.mjs` joue le parcours complet en Playwright (compte menuisier « Atelier du Chêne », Signature, règle Réactif) et écrit `public/demo/scene-N.png`. **Scènes 1 et 2 prises** (le client écrit, l'assistant répond — vraie réponse IA). **Scènes 3-5 impossibles tant que 0050 n'est pas en base** : la liste des conversations interroge `prise_en_main`/`messages.etat`, colonnes absentes → liste vide. Deux erreurs de mon script corrigées en chemin (mauvais champ email attrapé dans le tiroir « compte client » ; diagnostic à l'échec).
- Sous-agents rendus : **SA4 aide** (panneau `?`, ⓘ sur 6 pages, visite console, `/aide`, 44/44 en local, drapeaux `aideVisites`/`aideCentre` levés) ; **SA6 inventaire F1+F2** (fiche complète, `prix_observations`, fournisseurs + liste de départ, 10/10 sur ce qui ne dépend pas de 0048) ; **SA5 IA** (8 métiers, few-shot, playbooks, 6 outils + `repondreAvecOutils`, routage, anti-fabrication étendu, éval : vocabulaire métier 35 % → 58 % en Standard, 65 % en Pro, 0 fabrication, 94/94 unitaires, ~115 appels). **SA7 paramètres** relancé (coupé deux fois par la limite d'usage).

## [I-bis] §11 Image de partage + favicon par artisan, 404 douces — 04:45 → 05:10 (25 min) — ✅ code
- `app/site/[slug]/opengraph-image.tsx` + `icon.tsx` (et pareil sous `/p/[slug]`) : carte WhatsApp à la marque de l'artisan (nom, métier, zone, couleur, sa photo réelle s'il en a une — jamais une image de décoration), favicon = son logo ou ses initiales sur sa couleur. Avant : carte cassée (`summary_large_image` sans image) et favicon Presti dans l'onglet du client.
- `/site/<inexistant>` et `/p/<inexistant>` → **vrai 404** (`notFound()` + `not-found.tsx` sans marque). Un site existant non publié / une plateforme désactivée gardent un message poli.

## ⛔ BLOCAGE — mot de passe Postgres (depuis 23:00)
- `.env.local` inchangé depuis le 03/09 07:30 ; les trois routes (pooler 5432, pooler 6543, hôte direct) répondent `password authentication failed`. Le mot de passe a été changé côté Supabase et **n'est pas dans le fichier**. Benj a dit « c'est mis » à 23:35 : le fichier ne le montre pas.
- **Bloqué par ça** : migrations 0047 (aide_vues), 0048 (inventaire v2), 0049 (limites atomiques), 0050 (pilotage), 0051 (adresse modifiable), 0052 (paramètres, en cours) ; tout déploiement (les limites de débit seraient en fail-open sans 0049) ; scènes 3-5 de la démo ; tests `pilotage-e2e`, `offres-e2e`, `limites-e2e`, `reset-plafond-e2e`, `mentions-bloquantes-e2e`, `inventaire-v2-e2e` §3-8, `aide-e2e` (persistance), `slug` e2e.
- Ce qui a continué sans : tout le code (typecheck 0 hors l'édit en cours de SA7), les tests locaux qui ne touchent pas aux nouvelles colonnes, les slides (14/14), la démo (scènes 1-2).

## [D] §6 Paramètres niveau Claude — livré (SA7, relancé 2 fois) — ✅ code, 49/49 local (5 sautés faute de 0052)
- Navigation gauche 10 entrées (Plateforme/Site/Canaux = liens vers l'existant, pas des copies), anciens liens conservés. Profil : avatar recadré (canvas, WebP 512), adresse via `AdresseEditor`, **notifications réellement branchées** sur les 11 envois à l'artisan (`lib/notifications.ts`). Abonnement : jauge consommés/inclus (**sans ventilation inventée** : aucun journal par type n'existe), portail Stripe, « ce qui se déverrouille » calculé depuis `GRILLE`. Sécurité : changement de mot de passe (ancien vérifié, politique + fuites, autres sessions fermées), sessions ouvertes + révocation unitaire (RPC 0052). Données : export ZIP en flux **sans dépendance** (`lib/zip.ts`), suppressions avec récap + mot exact, **grâce 30 j** + cron de purge (`vercel.json`, 1 cron/jour Hobby : à vérifier qu'il n'entre pas en conflit avec l'existant).
- Retiré parce qu'inexistant (règle du sprint) : sélecteur de langue, notification « paiement » à l'artisan, ville des sessions, 2FA, annulation maison.
- **Consolidation** : le panneau « Vos informations » de l'éditeur de devis (double saisie des mentions légales, défaut signalé par SA1) est remplacé par un rappel + mentions manquantes en rouge + lien Paramètres.

## [I-ter] Incident : feuilles de style des surfaces écrasées — 05:40 → 06:20 (40 min) — ✅ réparé
- En posant des métadonnées neutres de 404, j'ai **écrit par-dessus** `app/site/[slug]/layout.tsx` et `app/p/[slug]/layout.tsx` sans les avoir lus : ils portaient l'import de `site.css` / `plat.css`. Résultat : plus aucun style sur le site et la plateforme (image du hero à 800 px, débordement mobile, slides « armées » sur téléphone parce que la fenêtre s'élargissait). Trouvé parce que `slides-e2e` est repassé au rouge sur mobile — puis remonté jusqu'à `regleHero: false` dans les feuilles chargées.
- **Règle que je me redonne** : jamais un `Write` sur un chemin sans l'avoir lu ; l'outil disait « updated », pas « created » — c'était le signal. Restauré avec l'import **et** les métadonnées. `slides-e2e` 14/14, 404 `/site` et `/p` avec titre « Page introuvable », zéro marque Presti hors l'hôte de l'URL de l'image OG.

## [H0-d] 06:40 — « ok et cherche les photos »
- Le « ok » n'a pas posé le mot de passe (`.env.local` toujours du 03/09 07:30, six migrations refusées). → `scripts/poser-mot-de-passe-db.mjs` : saisie masquée dans SON terminal, **test sur la base avant écriture**, rien ne transite par le chat. Commande donnée avec le bouton Run.
- Photos : Openverse (Flickr CC + Commons agrégés, sans clé) lancé en tâche de fond, 12 requêtes, licences CC0/BY/BY-SA, ≥ 1400 px.
- `parametres-e2e` ajouté au lanceur ; cron de purge fusionné dans celui des relances (Vercel Hobby = 2 crons max, le 3e aurait fait échouer le déploiement).

## [P] Photos du compte de démo — 06:50 → 08:10 (1 h 20) — ✅ 3 photos sous licence
- Openverse : joignable à la racine, mais **aucune recherche ne répond** (60 s puis coupure) — abandonné. Commons par **catégories réelles** (« Wooden stairs » + sous-catégories, « Stain-grade kitchen cabinets », « Joineries », « Carpenters workshops »…) : 716 candidats libres, planches-contact générées avec PIL pour trier d'un coup d'œil.
- Retenu : **l'escalier hélicoïdal en bois de Nebotičnik (Ljubljana), deux angles, CC BY-SA 4.0** — niveau Signature — et une cuisine en bois (CC BY-SA 4.0). Écarté : bâtiments d'entreprises réelles avec leur nom, musées, cuisines américaines quelconques (une gardée puis retirée : boîtes de céréales).
- `public/demo/portfolio/` : WebP 1800 px **ré-encodés (plus d'EXIF)**, `attributions.json` + `ATTRIBUTIONS.md` (« c'est une démonstration »). **L'attribution CC BY-SA est la ligne de fait de chaque slide** — exigée par la licence, et honnête. `demo-captures.mjs` branché dessus ; le compte conservé (`--garder`) écrit ses identifiants dans `.demo-compte.local` (ignoré par git).
- Vérifié en production locale : hero + slides avec les vraies photos (captures regardées). Piège rencontré : `next start` ne servait pas un fichier ajouté dans `public/` après son démarrage → redémarrage.

**Cumul : 8 h 15**
