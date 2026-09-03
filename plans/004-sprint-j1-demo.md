# PROMPT v5 — SPRINT J-1 : Presti prêt pour demain soir

> **Mode d'emploi.** Coller ce document en entier dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`. Il s'appuie sur `plans/003-presti-v4-plateforme-site-inventaire.md`, `plans/journal-v4.md` et `plans/audit-v4.md` que tu **relis en premier** — tout ce qui y est déjà livré n'est pas à refaire, tout ce qui y est marqué ouvert est réévalué ici à l'aune d'une seule question : **est-ce visible ou nécessaire demain soir ?**

---

## §0. LE CADRE : 24 heures, une démo, trois niveaux de priorité

**Deadline : demain soir.** Le produit sera montré. Ça change la méthode :

- **Niveau 1 — DÉMO** : ce qui sera **vu** demain soir. Priorité absolue, fini et poli.
- **Niveau 2 — TIENT** : ce qui ne sera pas forcément vu mais qui ne doit pas casser si quelqu'un clique (sécurité, comptes, paiement, données).
- **Niveau 3 — APRÈS** : tout le reste. Tu le notes dans `plans/apres-demo.md`, tu n'y touches pas.

**Règle d'or du sprint : une fonctionnalité non finie n'apparaît pas.** Un bouton qui mène à un écran cassé coûte plus cher en démo qu'un bouton absent. Tout ce qui n'est pas prêt est **masqué derrière un drapeau** (`lib/flags.ts`), pas laissé à moitié. L'audit v4 a déjà relevé des « promesses de vente non tenues » — ce sprint ne doit pas en créer de nouvelles.

**Protocole de travail continu** (repris de la v4 §0, résumé) : journal `plans/journal-v5.md` tenu à chaque étape avec `[bloc] titre — début → fin (durée) — statut` et temps cumulé affiché ; aucune demande de permission pour une action réversible ; parallélisation par sous-agents sur tout ce qui est isolable ; jamais d'attente passive pendant un déploiement ; arrêt uniquement sur action irréversible en prod, secret manquant, ou build cassé après deux tentatives.

**Utilise TOUT ce qui est dans le repo.** Les 13 agents `.claude/agents/presti-*` et les 55 skills `.claude/skills/` sont **tous affectés** dans l'**Annexe A** en fin de document — chacun à un bloc précis, ou explicitement écarté avec la raison. Tu lis cette annexe **avant** de commencer, et tu la respectes : un bloc qui mobilise un agent le lance réellement (sous-agent), un bloc qui nomme un skill le charge réellement avant d'écrire. Un sous-agent par chantier parallèle, des auditeurs indépendants à la fin.

---

## §1. ÉTAT RÉEL (lu dans le journal — ne pas redécouvrir)

Livré et vérifié en prod : plateforme `/p/[slug]` avec `PlatChat.tsx` (streaming, cartes, comptes clients par lien magique), config IA dans `/plateforme` (mode, modèle, ton, devis/facture auto, mots d'escalade, reprise humaine), `/parametres` (283 lignes), `/inventaire` (stock par lieu, scan code-barres, seuils — **pas** de recherche IA), chiffrage sur prix de l'artisan avec provenance (`0038`), facturation électronique (données, CIBS paramétrable, scellement, XML CII), sécurité (révocation réelle, RLS 26 tables, anti-injection), existence juridique des surfaces artisan (`0046`). Audit v4 : 15 défauts corrigés, une liste d'ouverts chiffrée.

Ce que Benj a vu et rejette : **le cube 3D** (`app/site/[slug]/SiteMatiere3D.tsx`) ; **la démo de la landing** (`FeatureShowcase.tsx`, 10 onglets, pas curatée, pas à jour) ; **l'interface artisan de la plateforme** (`/plateforme` n'est qu'un formulaire de réglages, pas un poste de pilotage) ; **l'inventaire** (un stock, pas l'assistant d'achat demandé) ; **les offres** (la plateforme n'apparaît nulle part dans « qui a quoi »).

---

## §2. LES DEMANDES DE BENJ → BLOCS

| # | Demande | Bloc | Niveau |
|---|---|---|---|
| 1 | Offres : 3 formules, **où va quoi**, la plateforme doit y figurer | §3 | DÉMO |
| 2 | Explication de **tous** les outils, extrêmement précise, système éducatif | §4 | DÉMO |
| 3 | Démo de la landing : pas évoluée, pas curatée → refaire | §5 | DÉMO |
| 4 | Paramètres/compte : plus réaliste, niveau Claude | §6 | DÉMO |
| 5 | IA : niveau et adaptabilité plus hauts | §7 | TIENT |
| 6 | Inventaire : tous les matériaux + **recherche IA sur les sites de grossistes que je désigne**, 3 modèles, liens + ce qu'elle a vu | §8 | DÉMO |
| 7 | Plateforme : personnalité plus haute, **interface artisan** (pilotage, lien devis/facture auto ↔ réponse auto) | §9 | DÉMO |
| 8 | Sites : virer le cube 3D, **slides 3D** de réalisations inspirées des vidéos FIND/DRIP, Signature = le meilleur, plus de personnalité et de lisibilité | §10 | DÉMO |
| 9 | Audit complet final (vidéos, skills, anti-hacking) | §11 | TIENT |
| 10 | **Email de l'entreprise** `contact@prestiapp.fr` : j'y ai accès et il est connecté à Presti | §15 | TIENT (J0 = Benj, 10 min) |

---

## §3. BLOC A — Les offres : « qui a quoi », une seule source de vérité

**Problème** : `lib/plans.ts` porte `creditsMois`, `tiers`, `siteMax` — mais pas la plateforme, l'inventaire, les canaux, le domaine, l'assistant. Résultat : `/abonnement`, `/tarifs`, la landing et les verrous serveur racontent quatre histoires différentes.

**Cible** : une **matrice unique** dans `lib/plans.ts`, typée, dont **tout** découle (pages tarifs/abonnement, badges 🔒 dans la console, verrous serveur, comparatif de la landing, textes d'aide).

```ts
type Capacite =
  | 'plateforme.conversation' | 'plateforme.ia.auto' | 'plateforme.ia.expert' | 'plateforme.comptes_clients'
  | 'plateforme.domaine_perso' | 'plateforme.personnalisation_avancee'
  | 'site.essentiel' | 'site.pro' | 'site.signature' | 'site.slides3d' | 'site.domaine_perso'
  | 'devis.ia' | 'devis.prix_artisan' | 'factures' | 'factures.electronique'
  | 'inventaire.stock' | 'inventaire.recherche_ia'
  | 'canaux.email' | 'canaux.whatsapp' | 'canaux.reseaux'
  | 'relances' | 'export' | 'support.prioritaire'

PLANS[plan].capacites: Capacite[]   // + creditsMois, tiers, siteMax, prixMois, label, accroche
```

**Grille à livrer** (à valider par Benj en §13, mais c'est la base) :

| | **Essentiel 29 €** | **Studio 59 €** | **Signature 99 €** |
|---|---|---|---|
| Plateforme de conversation | ✅ | ✅ | ✅ |
| Assistant IA sur la plateforme | Standard, mode assisté | Standard + Pro, auto ou assisté | + Expert, règles d'automatisation |
| Comptes clients sur la plateforme | ✅ | ✅ | ✅ |
| Personnalisation plateforme | thème + accent | + avancée (polices, fond, avatar, amorces) | + domaine personnalisé |
| Site vitrine | Essentiel | Pro (galerie) | Signature (cinématique, slides 3D) |
| Devis IA + prix de l'artisan | ✅ | ✅ | ✅ |
| Factures + facturation électronique | ✅ | ✅ | ✅ |
| Inventaire — stock | — | ✅ | ✅ |
| Inventaire — recherche IA fournisseurs | — | ✅ (Standard/Pro) | ✅ (+ Expert) |
| Canaux | email | + WhatsApp | + réseaux |
| Crédits / mois | 80 | 250 | 600 |

**Livrables** : (1) `lib/plans.ts` refondu + `peut(plan, capacite)` utilisé par **tous** les verrous serveur (grep de chaque `plan ===` en dur → remplacé) ; (2) page `/tarifs` et `/abonnement` régénérées depuis la matrice, avec **un comparatif clair par ligne**, la plateforme en **première** ligne ; (3) dans la console, chaque fonctionnalité verrouillée affiche 🔒 + « Disponible avec Studio » + lien, jamais un écran vide ; (4) test `scripts/offres-e2e.mjs` : pour chaque plan, chaque capacité, le serveur répond 200 ou 403 **exactement** comme la matrice le dit.

Skills : `to-spec` pour figer la matrice avant de coder ; `grill-me` sur les incohérences.

---

## §4. BLOC B — Le système d'explication : chaque outil expliqué, précisément

Benj veut qu'un artisan qui n'a jamais vu un logiciel comprenne **chaque** écran et **chaque** réglage. Quatre couches, alimentées par **un seul fichier de contenu** `lib/aide.ts` (sinon les explications divergent du produit) :

**B1. Panneau « C'est quoi ? » par page.** En haut à droite de chaque écran de la console, un bouton `?` ouvre un panneau latéral : *titre en une phrase · à quoi ça sert (3 phrases) · comment on s'en sert (3-5 étapes numérotées) · ce que ça change pour vos clients · ce que ça coûte en crédits · liens vers les réglages liés*. Sans jargon : on dit « votre page de conversation », pas « la plateforme » ; « le modèle », pas « Haiku ».

**B2. Info-bulles ⓘ sur chaque réglage.** Chaque `label` d'un formulaire de réglage porte un ⓘ qui, au survol ou au tap, dit **ce que ça change concrètement**, avec un exemple : *« Mode assisté : l'assistant prépare une réponse, vous la validez d'un clic avant qu'elle parte. Exemple : un client écrit à 22 h, vous voyez la réponse proposée le lendemain matin et l'envoyez. »*

**B3. Visite guidée à la première ouverture.** 5 à 7 étapes maximum par surface (console, plateforme côté artisan, éditeur de site, inventaire), avec projecteur sur l'élément et texte court ; **rejouable** depuis le menu `?` ; jamais bloquante (bouton « Plus tard » toujours visible). Marquage `aide_vues` en base (migration `0047_aide.sql`).

**B4. Centre d'aide `/aide`.** Recherche plein texte sur le contenu de `lib/aide.ts`, organisé par outil, avec pour chaque article : le texte du panneau B1 + une **animation courte** (10-15 s, enregistrée au vrai produit via Playwright → GIF/WebM) montrant le geste. Généré, pas rédigé à la main deux fois.

**B5. « Pourquoi ? » sur les décisions de l'IA.** Quand l'assistant propose une réponse, un devis, un prix : un lien « Pourquoi cette proposition ? » déplie ses sources (données du profil utilisées, prix et leur provenance, règle appliquée). C'est de l'explication **et** de l'anti-fabrication rendue visible.

**Règle d'exactitude** : chaque phrase d'aide décrit un comportement **réel**. Un sous-agent auditeur relit `lib/aide.ts` contre le code et rejette toute affirmation non vérifiée (même discipline que l'anti-fabrication des sites).

Skills : `writing-for-agents` et `writing-shape` pour le ton ; `apple-design` pour le panneau.

---

## §5. BLOC C — La démo de la landing, refaite et curatée

`FeatureShowcase.tsx` : 10 onglets, texte daté (« 3 thèmes »), aucune histoire. Une démo n'est pas un catalogue : c'est **un scénario**.

**Cible** : une seule séquence, **« Une demande arrive »**, en 5 scènes enchaînées automatiquement (et cliquables) :
1. **22 h 14** — un client écrit sur la page de conversation de l'artisan (vraie interface `/p/`, thème Atelier).
2. **22 h 14** — l'assistant répond, pose deux questions, reçoit une photo.
3. **7 h 50** — l'artisan ouvre sa console : la demande est qualifiée, un **devis brouillon** l'attend, prix sourcés.
4. **7 h 52** — il valide, le devis part dans la conversation ; le client accepte sur son téléphone.
5. **Le site** — coupe sur le site Signature de l'artisan, les slides 3D de ses réalisations (§10), « tout ça, à votre marque ».

Chaque scène est **le vrai produit** (captures Playwright du produit réel, rejouées et animées), pas une maquette : ce qui est montré existe. Sous la séquence, 5 cartes courtes (Plateforme · Site · Devis & factures · Inventaire · Relances) chacune avec un lien « voir en détail » vers `/aide`.

**Vidéo hero** : produire avec HyperFrames (MCP connecté) un clip de 25-30 s de cette même séquence, sans son, sous-titré, en remplacement du bloc statique du hero. Repli : la séquence animée en HTML si la vidéo n'est pas prête.

Skills : `find-animation-opportunities` puis `animate` ; `presti-design` pour rester dans la DNA nuit/corail de la landing ; `review-animations` en contrôle.

---

## §6. BLOC D — Paramètres et compte, niveau Claude

`/parametres` existe. Le porter au niveau demandé :

- **Structure** : panneau modal ou page avec navigation gauche — `Profil` · `Entreprise & légal` · `Abonnement & usage` · `Plateforme` · `Site` · `Canaux` · `Apparence` · `Sécurité` · `Données & confidentialité` · `Aide`. Menu de profil en bas de la sidebar (avatar → nom, email, plan, crédits, puis les entrées).
- **Abonnement & usage** : jauge de crédits du mois (consommés / inclus, par type : réponses, devis, recherches), historique des paiements (portail Stripe), changer d'offre avec **aperçu de ce qui se déverrouille** (depuis la matrice §3), annuler avec date de fin claire.
- **Sécurité** : liste des **sessions actives** (appareil, navigateur, ville approximative, dernière activité) avec révocation unitaire ; « fermer toutes les sessions » (existe, vérifié) ; changement de mot de passe avec la **politique renforcée** (12 caractères + déni-liste — la protection maison est déjà livrée, vérifier qu'elle s'applique aussi à l'inscription) ; **2FA TOTP** via Supabase MFA (niveau TIENT : si pas fini en 2 h, drapeau).
- **Données & confidentialité** : export ZIP (JSON + PDF), zone dangereuse avec les suppressions **granulaires** de la v4 §C3 (dépublier/réinitialiser/supprimer site · désactiver/supprimer plateforme · supprimer le compte avec 30 jours de grâce) — chacune avec récapitulatif et confirmation par saisie.
- **Profil** : avatar (upload + recadrage), nom, slug modifiable (301 depuis l'ancien), langue, notifications (email/push par type d'événement).
- Chaque réglage porte son ⓘ (§4 B2).

Skills : `apple-design`, `emil-design-eng` pour la finition ; `code-review` sur les routes de suppression.

---

## §7. BLOC E — L'IA : plus haute, plus adaptable

- **Prompts par métier** : 8 prompts système spécialisés (plombier, électricien, menuisier, maçon, peintre, carreleur, couvreur, paysagiste) avec vocabulaire, questions de qualification typiques, pièges à éviter, unités et TVA du métier. Sélection automatique depuis `artisans.metier`, repli générique.
- **Apprentissage de l'artisan** : l'assistant s'appuie sur **ses** devis passés, **ses** réponses manuelles (ton, formules, tarifs), **ses** prix (`0038`) — injectés comme exemples dans le contexte (few-shot), jamais comme faits inventés.
- **Playbooks de qualification par intention** (`analyzeLead` existe) : urgence → sécurité d'abord, puis créneau ; devis → surface, matériaux, photos, accès, délai ; RDV → créneaux ; réclamation → escalade humaine immédiate. Chaque playbook plafonne le nombre de questions (3 max avant de proposer une suite).
- **Outils de l'assistant** (tool use) : `consulter_prix(ref)`, `consulter_disponibilites()`, `creer_devis_brouillon(lignes)`, `demander_photo()`, `proposer_rdv(creneaux)`, `escalader(motif)`. C'est ce qui relie la réponse auto au devis auto (§9).
- **Routage de modèle** : Standard par défaut ; passage automatique à Pro sur complexité détectée (multi-postes, contraintes, réclamation) si le plan l'autorise ; Expert sur demande explicite ou règle d'automatisation. Toujours affiché à l'artisan (« répondu avec Pro »).
- **Filtre anti-fabrication étendu** (ouvert dans l'audit) : au-delà des chiffres et labels, détecter les affirmations de capacité non déclarées (« je me déplace », « en atelier », prestations non listées) par comparaison avec le profil ; régénérer une fois, puis dégrader.
- **Éval** : étendre `presti-ai-lab` / `scripts/ai-eval.mjs` — 8 métiers × 5 intentions × 3 modèles, scoring automatique + revue. À faire tourner avant et après.

---

## §8. BLOC F — L'inventaire tel que Benj le veut

**Ce qui est demandé, reformulé sans ambiguïté** : (1) un inventaire où l'artisan entre **absolument tous** ses matériaux ; (2) un **assistant de recherche** : l'artisan désigne ses grossistes (plusieurs sites, en référence), choisit un modèle (Standard/Pro/Expert), décrit ce qu'il cherche ; l'IA **va chercher sur ces sites**, ramène **les liens et ce qu'elle a vu** (produit, prix, disponibilité), et l'artisan **valide** pour l'entrer dans son inventaire.

**Ce que ça change par rapport à la v4** : ce n'est pas une base de prix scrapée en masse (illégale et fausse, cf. v4 §8), c'est une **recherche à la demande, par l'artisan, sur les sites qu'il nomme** — l'équivalent d'un employé qui ouvre trois onglets et note ce qu'il voit. Juridiquement : accès licite à des pages publiques, extraction ni répétée ni systématique, aucune base substitutive constituée. **C'est faisable, et c'est bien.**

### F1. Fiche matériau complète (`0040` à étendre → `0048_inventaire_v2.sql`)

`nom, marque, reference_fabricant, reference_fournisseur, categorie, sous_categorie, unite, conditionnement, code_barres, photo_url, fiche_technique_url, fournisseur_id, prix_achat_ht, prix_vu_ht, prix_vu_le, prix_vu_url, prix_vu_source, disponibilite_vue, notes, tags[], chantiers_lies[]` + stock par lieu (existe) + historique des prix vus (`prix_observations`).

Saisie : formulaire complet **et** rapide (nom + prix suffisent), scan (existe), **import CSV**, **photo de facture fournisseur → OCR → lignes proposées** (niveau TIENT : drapeau si pas fini).

### F2. « Mes fournisseurs » (`fournisseurs`, existe partiellement)

Fiche : nom, **URL du site**, type (négoce / GSB / fabricant / marketplace), n° de compte client, remise habituelle, délai, agence, contact. **Ordre de préférence** glissable. C'est cette liste qui borne la recherche.

### F3. L'assistant de recherche (`/inventaire/recherche`)

Interface : champ « Que cherchez-vous ? » (texte libre ou référence), sélecteur de modèle (avec 🔒 selon plan), cases à cocher **sur ses fournisseurs** (tous par défaut), quantité souhaitée. Bouton « Chercher ».

Moteur (`lib/recherche-fournisseurs.ts`) : l'assistant utilise **l'outil de recherche web côté serveur de l'API Anthropic** (`web_search` avec `allowed_domains` = les domaines des fournisseurs cochés, puis `web_fetch` sur les pages résultats). Pour chaque résultat retenu : *fournisseur · désignation exacte vue · référence · prix vu (HT/TTC, tel qu'affiché) · unité/conditionnement · disponibilité vue · **lien direct** · date et heure de l'observation · extrait textuel de 1-2 lignes* (ce qu'elle a vu, cité — pas reformulé). Résultats en tableau comparatif, tri par prix / dispo / préférence, et un encart « ce que je n'ai pas pu voir » (site qui exige une connexion, page bloquée, référence introuvable) — **dit franchement, jamais comblé par une estimation**.

Actions : « Ajouter à l'inventaire » (fiche pré-remplie avec lien, source, date — rien n'est enregistré sans validation) · « Ajouter à ma liste d'achat » · « Ouvrir le site » · « Rechercher une équivalence » (même fonction, autre marque).

Règles : respect de `robots.txt` (la recherche serveur d'Anthropic le fait ; si un fetch direct est ajouté, le vérifier explicitement) ; **aucun stockage mutualisé** entre artisans des prix observés (chaque observation appartient à l'artisan qui l'a demandée) ; les prix **derrière connexion pro ne sont pas accessibles** — l'interface le dit à la configuration du fournisseur (« ce site n'affiche ses prix qu'aux comptes connectés : vous verrez le catalogue, pas vos tarifs ») ; coût en crédits = celui du modèle (1 / 1 / 3) ; toute observation est horodatée et un prix vu il y a plus de 30 jours est marqué « à revérifier ».

Liste de départ proposée à l'artisan (à **vérifier une par une** par `curl` avant de la livrer : prix publics visibles sans connexion + `robots.txt` non bloquant) : Point.P, Leroy Merlin, Castorama, Brico Dépôt, ManoMano, Bricoman, Rexel, Würth, Gedimat, BigMat, Tout Faire, Chausson. Retirer de la liste ceux qui ne montrent rien sans compte (Cedeo, Legallais, Sonepar — vérifié en v4).

Niveau **DÉMO** : F1 + F2 + F3 avec au moins 3 fournisseurs vérifiés. La démo montre une recherche réelle, en direct, et l'ajout d'une fiche.

Skills : `presti-ai-lab` pour le prompt de recherche ; `code-review` sur le respect des règles.

---

## §9. BLOC G — La plateforme : le poste de pilotage de l'artisan, et plus de personnalité

### G1. L'interface artisan (ce qui manque)

`/plateforme` est un formulaire. La cible est un **poste de pilotage en trois volets** :

- **Conversations en direct** : la liste des conversations de sa plateforme avec état (IA en cours / attend validation / humain / clos), filtre par urgence ; en cliquant, **la même interface de chat que voit le client**, en miroir, avec en plus : les propositions de l'IA en attente (valider / modifier / rejeter), un bouton **« Je prends la main »** (l'IA se tait, le client le voit), le récapitulatif du besoin, les photos, et les actions **Créer un devis** / **Proposer un RDV** / **Escalader**.
- **Automatisations** : un constructeur de règles simple, en phrases :
  *« Quand l'assistant a qualifié le besoin **et** reçu au moins une photo → créer un devis brouillon avec le modèle **Pro** → me notifier → si je valide → l'envoyer dans la conversation → quand le client accepte → créer la facture d'acompte de **30 %** »*.
  Chaque maillon est un réglage (on/off, seuils, modèle, délai). 4 règles préconstruites (Prudent / Équilibré / Réactif / Tout auto) que l'artisan applique puis ajuste. C'est **le lien demandé entre réponse auto et devis/facture auto**, et il s'appuie sur les outils de l'assistant (§7).
- **Apparence** (existe partiellement) avec **aperçu live** desktop/mobile et bouton « Voir comme un client ».

### G2. Personnalité et personnalisation, plus haut

- **Persona de l'assistant** : nom, avatar, **style d'écriture par exemples** (l'artisan colle 3 messages qu'il a écrits → l'assistant en tire le ton), formules d'ouverture et de clôture, vouvoiement/tutoiement, émojis oui/non, longueur des réponses.
- **Apparence avancée** : logo, favicon, couleur d'accent + secondaire, fond (couleur/dégradé/image), police (8 couples), rayon, densité, position et style du composeur, écran d'accueil (titre, sous-titre, **amorces** éditables), clair/sombre/auto, page « Infos légales » (existe, `0046`), **domaine personnalisé** (Signature).
- **Cartes riches** (existent) : vérifier devis, facture, RDV, photos, récapitulatif ; ajouter **« Où en est ma demande »** (frise : reçue → qualifiée → devis → accepté → planifié → terminé).

Niveau **DÉMO** : G1 conversations + prise de main + création de devis depuis une conversation, **une** règle d'automatisation qui fonctionne de bout en bout, G2 persona + aperçu live.

Skills : `apple-design`, `animate` (transitions de prise de main), `presti-ai-lab`.

---

## §10. BLOC H — Les sites : slides 3D, personnalité, Signature au sommet

### H1. Supprimer le cube

`app/site/[slug]/SiteMatiere3D.tsx` : **supprimer** le composant, son import, la règle CSP `cdnjs` ajoutée pour lui, et toute référence. Vérifier qu'aucun site Signature n'a de trou à la place (le hero photo/typographique reprend).

### H2. Les slides 3D de réalisations (Signature)

Ce que les vidéos de référence montrent (FIND : mots géants + panneaux plein écran ; DRIP : **une chose par écran**, produit centré, gros chiffres, scroll qui morphe) — appliqué aux **réalisations de l'artisan** :

- **Un panneau par réalisation**, plein écran, épinglé au scroll. La photo occupe le cadre ; à gauche ou en bas : n° (01, 02…), titre, spécialité, et **une ligne de fait réel** (lieu, matériau, durée — uniquement si l'artisan l'a renseigné, sinon rien).
- **Mise en scène 3D par CSS** (`perspective` + `transform-style: preserve-3d` + GSAP ScrollTrigger avec `scrub`) : la photo entrante arrive du fond (scale 0,86 → 1, translateZ, léger tilt de 6-8° qui se redresse), la sortante glisse et s'estompe ; le titre se révèle par masque ; les numéros défilent comme un compteur. **Pas de WebGL** : c'est plus léger, plus fiable, et c'est exactement le rendu des références.
- **Transitions** : 3 styles au choix de l'artisan dans l'éditeur — *Profondeur* (empilement Z), *Feuilleté* (panneaux qui se recouvrent), *Cinéma* (fondu + travelling lent). Intensité liée au curseur d'animation existant.
- **Fin de séquence** : le dernier panneau se dépose sur les **mots géants** (existent) → puis contact.
- **Repli** : reduced-motion, mobile < 760 px, `saveData` → galerie Pro classique. Budgets M4/M5 tenus ; 0 long task au scroll (mesuré).
- **Éditeur** : dans « Mon site », l'artisan choisit quelles réalisations entrent dans les slides (3 à 8), leur ordre, le style. Aperçu live.

### H3. Personnalité et compréhensibilité (tous niveaux)

Test des 5 secondes sur chaque site : **qui** (nom + métier), **où** (zone), **quoi** (3 prestations), **preuve** (photos), **comment contacter** (un CTA) — visibles sans scroller, sur mobile. Sous-agent `presti-anim-marque` en revue : chaque site test est jugé sur ces cinq points, et sur le fait qu'on ne peut pas le confondre avec un autre thème.

Signature doit être **visiblement** supérieur à Pro sur les captures côte à côte — c'est l'argument de vente du palier à 99 €.

Skills : `prototype` (un prototype jetable des slides **avant** l'intégration, pour valider le feel), `animate` (courbes, durées), `animation-vocabulary`, `review-animations` ; agents `presti-animateur` (plan de motion) et `presti-anim-accessibilite` (reduced-motion, perf, contraste).

---

## §11. BLOC I — L'audit final, à nouveau

À la fin du sprint, **quatre auditeurs indépendants** (comme en v4, ils n'ont pas écrit le code), contre la production, comptes créés puis détruits, rapport `plans/audit-v5.md`. Ils reprennent **la grille v4 §16** (20 points, vidéo 1 sessions, vidéo 2 « hacked in 3 hours », vidéo 3 « site invisible », audit métier) **plus** :

- **Les ouverts de l'audit v4, un par un** : course sur les compteurs de limitation (→ comptage atomique en base, ~3 h, **à faire dans ce sprint**) · bombardement d'emails de réinitialisation (→ plafond par email, ~1 h, **à faire**) · mentions obligatoires non contrôlées avant émission (→ blocage de l'envoi si SIRET/assurance manquent, ~2 h, **à faire**) · image de partage + favicon par artisan (~6 h, **à faire** : c'est le premier partage WhatsApp de la démo) · 404 douces (~3 h, **à faire**) · jeton en `localStorage` → cookie `httpOnly` (**après**, 1,5 j) · DPA art. 28 (**après**, rédaction) · Factur-X PDF/A-3 + Schematron (**après**, échéance 2027) · purge/durées de conservation (**après**) · bandeau cookies (**à faire seulement si analytics activé**).
- **Les 3 réglages Supabase que Benj doit faire à la main** (aucun code) : rejeu des jetons de rafraîchissement, durée du jeton (fait, 900 s), politique de mot de passe. L'auditeur vérifie **par l'effet**, pas en lisant le tableau de bord.
- **Nouveau périmètre** : recherche fournisseurs (aucun stockage mutualisé, robots respecté, prix toujours sourcés et datés), règles d'automatisation (aucun envoi sans le maillon « validation » quand il est activé ; aucun prix ferme sans devis), aide (chaque phrase vérifiée contre le code), offres (matrice = verrous, testé 200/403), démo (rien de montré qui n'existe pas).
- **Anti-hacking** : rejouer les attaques d'injection de prompt sur le **nouvel** assistant à outils (un outil `creer_devis_brouillon` détourné par un prospect serait grave) ; IDOR sur les nouvelles routes (inventaire, recherche, règles, sessions) ; rate limit sur la recherche fournisseurs (elle coûte).

---

## §15. BLOC J — L'email de l'entreprise : `contact@prestiapp.fr` accessible et branché partout

**État vérifié le 03/09** (DNS publics + boîte Gmail de Benj) :
- **Envoi : OK.** Resend est validé — `send.prestiapp.fr` porte SPF + MX de retour, `resend._domainkey` porte le DKIM, et des emails `contact@prestiapp.fr` (leads, réinitialisation, test de délivrabilité du 31/08) arrivent bien dans Gmail.
- **Réception : MX de `prestiapp.fr` → serveurs mail OVH** (`mx1/2/3.mail.ovh.net`), SPF racine `include:mx.ovh.com`. Donc toute réponse d'un prospect à `contact@prestiapp.fr` atterrit chez OVH — **dans une boîte qui doit exister**. Aucune trace de sa création (aucun email OVH « adresse créée »). Sondage SMTP impossible depuis ici (port 25 fermé) : **à vérifier en premier**.
- **DMARC : absent** (`_dmarc.prestiapp.fr` → NXDOMAIN). Gmail et Yahoo le réclament ; sans lui, une partie des emails aux prospects finit en spam.
- **⚠️ Domaine menacé de suspension le 1er octobre 2026** : OVH demande la validation de l'email du titulaire (NIS2), 4 rappels envoyés (17/08 → 27/08), opération `ContactControlCorrect n° 597974738` en erreur. Ce n'est pas un blocage pour demain, mais c'est un blocage pour le mois prochain, et ça se règle en 30 secondes (§J0).

### J0. Ce que seul Benj peut faire (10 minutes, dans cet ordre)

1. **Valider l'email du titulaire chez OVH** — ouvrir `https://www.ovh.com/fr/cgi-bin/contactcontrol.cgi`, saisir `benjaminfiliot@gmail.com` et le code `1cd914e4-f7e2-4409-aadc-fa3a8b80853e` (email OVH du 27/08). Si le code est périmé : manager OVH → *Opérations en cours* → relancer l'opération 597974738, un nouvel email arrive. **Sans ça, prestiapp.fr est suspendu le 01/10.**
2. **Créer (ou vérifier) la boîte** — manager OVH → *Web Cloud → E-mails → prestiapp.fr* → *Créer une adresse* : `contact@prestiapp.fr`, mot de passe fort (gestionnaire de mots de passe). L'offre e-mail incluse avec le domaine suffit. Puis, sur cette adresse : *Redirection* → copie vers `benjaminfiliot@gmail.com` **et** `alexandremesroua@gmail.com` (les deux fondateurs voient tout ce qui arrive à l'entreprise).
3. **Y accéder depuis Gmail** — Gmail → Paramètres → *Comptes et importation* → *Envoyer des e-mails en tant que* : `contact@prestiapp.fr`, SMTP `ssl0.ovh.net`, port `465`, SSL, identifiant = l'adresse complète, mot de passe de la boîte. (La réception est déjà couverte par la redirection de l'étape 2 ; pour un vrai dossier séparé : *Consulter d'autres comptes*, POP `ssl0.ovh.net`, port `995`.) Webmail direct : `https://mail.ovh.net`.
4. **Donner les identifiants IMAP à Claude Code** par variable d'environnement Vercel (`PRESTI_MAIL_IMAP_USER`, `PRESTI_MAIL_IMAP_PASS`) — jamais dans le repo, jamais dans le chat.

### J1. Ce que Claude Code fait (niveau TIENT, H0–H2, en parallèle)

- **DMARC** : poser `_dmarc.prestiapp.fr TXT "v=DMARC1; p=quarantine; rua=mailto:contact@prestiapp.fr; adkim=r; aspf=r"` via `scripts/resend-domain.mjs` (API OVH) ou donner la ligne exacte à Benj si le script n'a pas les droits. Vérifier par résolution DNS publique, pas en lisant l'écran.
- **`Reply-To` sur tout envoi Resend** (`lib/email.ts`) : réponses auto aux prospects, notifications artisan, relances, devis → `Reply-To: contact@prestiapp.fr` **pour les emails de Presti**. ⚠️ Pour les emails envoyés **au nom d'un artisan** (white-label), le `Reply-To` est **l'adresse de l'artisan** ou son canal Presti, jamais `contact@prestiapp.fr`.
- **Brancher la boîte comme canal** : `imapflow` est déjà installé → `contact@prestiapp.fr` via IMAP `ssl0.ovh.net:993` devient le premier canal **fondateurs** dans la console (`/messages`, table `canaux`, migration `0036` existante) : ce qu'un prospect, un artisan ou un partenaire écrit à l'entreprise apparaît dans la boîte unifiée, et la réponse part en SMTP `ssl0.ovh.net:465` **depuis** `contact@prestiapp.fr`. Identifiants chiffrés au repos, lus depuis les variables d'environnement.
- **Notifications de l'entreprise** : nouvel artisan inscrit, paiement Stripe, erreur critique (`api/report-error`), rapport d'audit → envoyés à `contact@prestiapp.fr` (et donc redirigés aux deux fondateurs).
- **Agent `presti-mails-delivrabilite`** : après J0 + J1, test complet — envoi depuis Presti, réponse du prospect, arrivée dans `/messages`, réponse de l'artisan, DMARC/SPF/DKIM tous verts sur un rapport `mail-tester` ou équivalent. Preuve dans le journal.
- **Pages légales et pieds d'email** : `contact@prestiapp.fr` affiché comme adresse de contact de l'éditeur (mentions légales, CGU, confidentialité, DPA), à la place de toute adresse Gmail personnelle.

**Definition of done** : un email envoyé de l'extérieur à `contact@prestiapp.fr` arrive (1) dans la boîte OVH, (2) dans les deux Gmail fondateurs, (3) dans `/messages` de la console — et une réponse depuis la console part avec `contact@prestiapp.fr` en expéditeur, DMARC vert.

---

## §12. LE PLAN DES 24 HEURES

Parallélisé : **un agent principal** + **3 sous-agents** en continu. Heures indicatives, à ajuster dans le journal.

| Heures | Agent principal | Sous-agent 1 | Sous-agent 2 | Sous-agent 3 |
|---|---|---|---|---|
| **H0–H2** | §3 matrice des offres + verrous · §10 H1 supprimer le cube | §4 rédaction de `lib/aide.ts` (contenu) | §11 correctifs rapides : compteurs atomiques, plafond reset, contrôle mentions · **§15 J1 email entreprise (DMARC, Reply-To, canal IMAP)** | §8 vérification `curl` des 12 fournisseurs |
| **H2–H8** | §9 G1 poste de pilotage + 1 règle d'automatisation bout en bout | §4 B1-B2 panneaux et ⓘ branchés | §7 prompts métier + outils de l'assistant | §8 F1-F2 fiche matériau + fournisseurs |
| **H8–H13** | §10 H2 slides 3D + éditeur | §6 paramètres niveau Claude | §8 F3 assistant de recherche | §9 G2 persona + apparence + aperçu |
| **H13–H17** | §5 démo landing (scénario 5 scènes) | §4 B3-B4 visites guidées + `/aide` | §7 éval IA avant/après | §11 image de partage + favicon + 404 |
| **H17–H20** | §5 vidéo HyperFrames · §10 H3 revue personnalité | intégration + `tout-verifier.mjs` | drapeaux sur tout ce qui n'est pas fini | `plans/apres-demo.md` |
| **H20–H23** | **§11 audit final** — 4 auditeurs indépendants | | | |
| **H23–H24** | correctifs de l'audit · vérification finale en prod · **parcours de démo répété 3 fois de bout en bout** sur un compte propre | | | |

**Le parcours de démo** (à écrire dans `plans/demo-parcours.md` dès H0 et à rejouer à H24) : landing → démo → inscription → onboarding → console avec visite guidée → plateforme : une conversation réelle depuis un téléphone → prise de main → devis → acceptation → facture → inventaire : une recherche réelle → site Signature avec slides 3D → paramètres → offres. **Chaque écran de ce parcours est niveau DÉMO. Tout le reste est niveau TIENT ou APRÈS.**

---

## §13. ⚠️ DÉCISIONS POUR BENJ (à poser en une fois, puis continuer sans attendre sur le reste)

1. **La grille des offres §3** : valide telle quelle, ou ajuste des lignes ? *(Reco : telle quelle — cohérente avec les prix actuels et l'inventaire en Studio+.)*
2. **Fournisseurs de départ** : la liste §8 te va, ou tu en as d'autres en tête (ceux que tes premiers artisans utilisent vraiment) ?
3. **Vidéo hero** : HyperFrames dans ce sprint, ou séquence HTML seule et vidéo après ? *(Reco : séquence HTML garantie, vidéo si le temps le permet — elle n'est pas critique pour la démo.)*
4. **2FA** : dans le sprint (2 h) ou après ? *(Reco : après — invisible en démo, et l'audit v4 n'en fait pas une urgence.)*
5. **Compte de démo** : Claude Code prépare un **vrai** compte artisan de démonstration (métier, photos réelles fournies par toi, 3 réalisations, prix) — quel métier, et as-tu des photos ? Sans photos réelles, la démo Signature ne peut pas être bonne (pas de fausses photos, règle anti-fabrication).

---

## §14. FORMAT DE RÉPONSE À CHAQUE ÉTAPE

1. **Vérifié** · 2. **Changé** (quoi, pourquoi, risque) · 3. **Diff** · 4. **Preuve** (build, HTTP, captures, mesures) · 5. **Journal** (`[bloc] — début → fin (durée) — statut`, cumul) · 6. **Suivant** (enchaîné immédiatement, ou la décision qui bloque et ce que tu fais en attendant).

Commits en français, atomiques. Push `main` = prod : **rien** n'est poussé sans le cycle `presti-verify`. Demain soir, la seule chose qui compte est que le parcours de démo se déroule sans un accroc, trois fois de suite, sur un compte propre.

---

## ANNEXE A — Affectation de TOUS les agents et skills du repo

Règle : chaque ligne est un engagement. « Mobilisé » = tu le lances / le charges réellement à ce bloc. « Écarté » = tu ne le touches pas pendant le sprint, et tu sais pourquoi.

### A1. Les 13 agents (`.claude/agents/`)

| Agent | Bloc(s) | Rôle précis dans le sprint |
|---|---|---|
| `presti-ai-engineer` | §7, §8 F3, §9 G1 | Muscle `lib/ai.ts` : prompts par métier, outils de l'assistant (`creer_devis_brouillon`…), prompt de recherche fournisseurs. Diagnostique toute génération faible. |
| `presti-anim-marque` | §10 H3, §5, §9 G2 | Direction artistique : test des 5 secondes sur chaque site test, cohérence white-label de la plateforme, revue de la démo landing dans la DNA nuit/corail. |
| `presti-anim-accessibilite` | §10 H2, §9 G1, §4 | Reduced-motion et perf des slides 3D (transform/opacity only, 0 long task), contraste WCAG sur l'accent personnalisable, focus clavier du poste de pilotage et des panneaux d'aide. |
| `presti-animateur` | §10 H2, §5, §9 G1 | Plans de motion précis (easing, durées, stagger) pour les slides 3D, les 5 scènes de la démo, la transition « je prends la main ». Read-only : il propose, l'agent principal implémente. |
| `presti-audit-attaque` | §11 | Auditeur indépendant n° 1 : IDOR sur les nouvelles routes (inventaire, recherche, règles, sessions), injection de prompt contre l'assistant **à outils**, abus de la recherche fournisseurs, rejeu de jetons. |
| `presti-audit-conformite` | §11, §3, §8 | Auditeur indépendant n° 2 : mentions obligatoires bloquantes, offres = verrous, recherche fournisseurs (aucun stockage mutualisé, sources datées), infos légales des surfaces, RGPD des nouvelles tables (`0047`, `0048`). |
| `presti-auditeur` | §11 | Auditeur indépendant n° 3 : la checklist anti-hack 18 points + les 20 points de la photo + les 3 vidéos, sur la prod, comptes créés puis détruits. |
| `presti-gestion-donnees` | §12 H23, §5 | Prépare et vérifie le **compte de démo** (données réelles fournies par Benj, zéro donnée fictive), et mesure que le tunnel lien→lead→conversation→devis→facture fonctionne sur ce compte. Après le sprint : durées de conservation et purge. |
| `presti-gestion-fiabilite` | §11, §8 F3, §9 G1 | Coûts et garde-fous : la recherche fournisseurs et les règles d'automatisation peuvent brûler des crédits et des appels IA — vérifie compteurs atomiques, idempotence des règles (pas deux devis pour une conversation), timeouts Vercel sur la recherche (maxDuration). |
| `presti-gestion` | §12 H24 | Le « cockpit vivant » de fin de sprint : toutes les routes clés en 200, Stripe OK, déploiement OK, crédits du compte démo OK — juste avant la répétition du parcours de démo. |
| `presti-mails-cycle` | §7, §9 G1 | Copywriting FR artisan des réponses de l'assistant et des messages des cartes riches (devis envoyé, RDV proposé, accusé de réception) — ton humain, zéro prix ni délai inventé. |
| `presti-mails-delivrabilite` | §12 H0 | Vérifie **dès H0** que le domaine Resend est vert (SPF/DKIM/DMARC) : la démo envoie un devis par email et un lien magique à un compte client. Si le domaine est KO, c'est un blocage à remonter immédiatement. |
| `presti-mails` | §5, §6 | Relit les emails sortants du parcours de démo (devis envoyé, facture, lien magique, notifications de l'artisan) et les emails de la zone Paramètres (changement de mot de passe, suppression avec délai de grâce). |
| `knowledge/` (protocole + journaux) | §0 | Tu appliques `PROTOCOLE.md` et chaque agent écrit dans son `*.journal.md` ; en fin de sprint, `node scripts/coentreprise.mjs sync-down` remonte tout dans le vault Obsidian (`SaaS/Coentreprise/`). |

### A2. Les 55 skills (`.claude/skills/`)

**Mobilisés dans le sprint**

| Skill | Bloc(s) | Usage précis |
|---|---|---|
| `presti-verify` | tous | Le cycle obligatoire avant tout « fait ». Non négociable. |
| `presti-design` | §5, §6, §4 | Tokens et composants Presti pour la landing, les Paramètres et les panneaux d'aide (console = DNA nuit/corail ; **jamais** sur les surfaces artisan). |
| `presti-ai-lab` | §7, §8 F3 | Améliorer et **évaluer** l'IA : suite d'éval 8 métiers × 5 intentions × 3 modèles, avant/après. |
| `supabase` | §3, §4, §6, §8, §9 | À charger pour **toute** tâche Supabase : migrations, Auth (sessions, MFA), Storage (photos, fiches techniques), RLS des nouvelles tables. |
| `supabase-postgres-best-practices` | §3, §8, §9 | **Avant** d'écrire `0047_aide.sql`, `0048_inventaire_v2.sql`, la table des règles d'automatisation et `prix_observations` : index, contraintes, RLS, comptage atomique. |
| `domain-modeling` | §3, §8, §9 | Fixer le vocabulaire avant de coder : *capacité / offre / verrou*, *matériau / observation de prix / fournisseur*, *règle / maillon / déclencheur*. Un `CONTEXT.md` court par domaine. |
| `to-spec` | §3, §8, §9 | Synthétiser chaque bloc en spec courte avant l'implémentation (matrice des offres, assistant de recherche, règles d'automatisation). |
| `to-tickets` | §12 | Découper le plan des 24 h en tickets « tracer-bullet » avec leurs dépendances → c'est ce qui permet aux 3 sous-agents de travailler en parallèle sans se marcher dessus. |
| `implement-spec` / `implement` | §3 à §10 | L'exécution de chaque spec/ticket. |
| `tdd` | §3, §8, §9, §11 | Tests d'abord sur ce qui coûte cher en démo : `offres-e2e` (200/403 exact), `recherche-e2e`, `regles-e2e` (jamais deux devis pour une conversation), sessions. |
| `diagnosing-bugs` | tous | Boucle de diagnostic dès qu'un test rouge n'est pas évident — au lieu de patcher au feeling. |
| `code-review` | §6, §8, §9, §11 | Revue des changements depuis le commit de départ du sprint, deux axes : standards du repo + logique. Obligatoire avant l'audit final. |
| `grill-me` / `grilling` | §3, §9 G1 | Stress-test de la matrice des offres et du constructeur de règles **avant** de coder : « que se passe-t-il si l'artisan désactive le maillon validation et que le prospect envoie 40 messages ? » |
| `grill-with-docs` | §9 G1 | Idem pour les règles d'automatisation, en produisant l'ADR (pourquoi ce modèle de règles et pas un moteur générique). |
| `loop-me` | §9 G1 | Skill de conception de **workflows** : exactement ce que sont les règles d'automatisation. À utiliser pour spécifier les 4 règles préconstruites. |
| `animate` | §10 H2, §5, §9 G1 | Construire chaque animation dans le bon ordre de décisions (faut-il animer, quel but, quelle propriété, quelle courbe). |
| `animation-vocabulary` | §10, §5 | Nommer exactement l'effet visé (scrub, pin, parallax, reveal, stagger) pour que les sous-agents parlent le même langage. |
| `find-animation-opportunities` | §5, §4 | Repérer où la démo et les panneaux d'aide gagnent à bouger — et **rejeter** le reste. |
| `improve-animations` | §10 H3 | Audit priorisé de la motion existante des sites après l'ajout des slides. |
| `review-animations` | §10, §5, §9 | Contrôle qualité final de toute motion (barre Emil Kowalski) — défaut = signaler. |
| `apple-design` | §6, §9 G1, §4 | Finition des Paramètres, du poste de pilotage et des panneaux d'aide : physique du mouvement, hiérarchie, densité. |
| `emil-design-eng` | §6, §9 | Les détails invisibles qui font qu'un écran paraît fini (états, focus, transitions, textes d'erreur). |
| `prototype` | §10 H2 | Prototype jetable des slides 3D (3 photos, une page) pour valider le feel **avant** de l'intégrer au moteur de sections. |
| `pick-ui-library` | §6, §8, §9 | Choisir vite et bien : réordonnancement par glisser (fournisseurs, slides), saisie de code à 6 chiffres (lien magique), menus de commande, virtualisation de la liste de matériaux. |
| `ask-sonner` | §6, §8, §9 | Toasts de retour (enregistré, envoyé, erreur avec retry) — Sonner si on l'adopte, sinon le pattern équivalent maison. |
| `research` | §8 F3, §11 | Vérification sourcée et **écrite dans le repo** (`docs/fournisseurs.md`) des 12 sites : prix publics visibles ? `robots.txt` ? — et de la liste des plateformes agréées pour l'après-sprint. |
| `wizard` | §11 | Générer un **assistant bash interactif** pour les 3 réglages Supabase que seul Benj peut faire (rejeu des jetons, politique de mot de passe, vérification de la durée du jeton) : il le guide pas à pas, puis vérifie l'effet. |
| `to-questionnaire` | §13 | Transformer les 5 décisions de Benj en un questionnaire court qu'il remplit en 3 minutes — au lieu d'un échange qui bloque. |
| `writing-for-agents` | §4, §0 | Rédiger `lib/aide.ts` et les briefs des sous-agents dans une forme lisible par un agent (précis, sans ambiguïté). |
| `writing-fragments` → `writing-beats` → `writing-shape` | §4, §5 | La chaîne d'écriture : mine la matière brute (fragments) → le scénario de la démo en 5 temps (beats) → les textes d'aide paragraphe par paragraphe (shape). |
| `teach` | §4 | Vérifier que chaque article d'aide **enseigne** (un concept, un geste, un exemple) et ne se contente pas de décrire. |
| `handoff` / `claude-handoff` | §0, §12 | Quand un sous-agent termine ou qu'un contexte se remplit : document de passation compact, jamais un redémarrage à froid. Le journal v5 en est la version continue. |
| `triage` | §11 | Trier les trouvailles des 4 auditeurs : gravité, vérifié/non vérifié, correctif dans le sprint ou `apres-demo.md`. |
| `retro` | §12 H24 | Rétrospective de fin de sprint dans le journal : ce qui a tenu, ce qui a coûté, ce que l'audit a trouvé que les tests n'avaient pas vu. |
| `setup-pre-commit` | §0 H0 | Husky existe : vérifier que `typecheck` + tests rapides tournent bien au pre-commit pendant le sprint (un commit cassé en prod à H22 est fatal). |
| `wait-what` | à la demande | Si Benj dit qu'une explication n'a pas atterri, re-pitcher — pas répéter. |
| `ask-matt` | à la demande | Routeur : quand un sous-agent hésite sur le skill à charger. |

**Écartés pendant le sprint (avec la raison)**

| Skill | Raison |
|---|---|
| `animate-expo` | React Native / Expo — Presti est une app web. Ne pas charger. |
| `write-swift` | Swift — hors sujet. |
| `migrate-to-shoehorn`, `scaffold-exercises`, `setup-matt-pocock-skills`, `setup-ts-deep-modules` | Outillage de repo / pédagogie TypeScript — aucun rapport avec la démo. |
| `codebase-design`, `improve-codebase-architecture` | Refactoring d'architecture : précieux, mais **après** la démo (`apres-demo.md`). Un refactor à J-1 est le meilleur moyen de casser ce qui marche. |
| `wayfinder` | Planification de chantiers plus gros qu'une session : c'est la v6, pas ce sprint de 24 h dont le plan tient en un tableau. |
| `git-guardrails-claude-code` | Bloquerait `push` — or push sur `main` **est** le déploiement chez Presti. La garde, c'est `presti-verify`, pas un hook qui empêche de livrer. |
| `resolving-merge-conflicts` | Un seul dépôt, une seule branche : uniquement si un conflit survient réellement. |
| Vault `SaaS/.claude/skills/vault-organizer` | Après le sprint : ranger la note de session, le récap et le journal de décisions dans Obsidian. `saas-problem-finder` : archivé, phase terminée. |
